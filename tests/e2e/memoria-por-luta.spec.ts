/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * Memória de ARTE por luta, pela API pública `arte.memoria()` (docs/spec-residencia-de-memoria.md §6; substitui o `mem-luta.mjs` da Íris, que lia campos privados).
 * Mede o ANALÍTICO: bytes decodificados (w x h x 4) das imagens que o gerenciador segura (atlas + FILME + cenários + retratos). A memória real do navegador
 * (working set) é a C4 da L6; aqui se prova o que o jogo SEGURA. Total da luta = `imagens` + BASE_FORA_DAS_IMAGENS (canvas principal 7,9 + teto das silhuetas 6 +
 * caches de UI 4, estimados na spec §0.1 e só anotados).
 *
 * Dois braços, nos dois perfis (desktop e celular):
 *  - política 'fixa' (o padrão de hoje): reproduz os 7 números da Íris (sem FILME) com a vitrine e os 4 cenários do título presentes na luta: o excesso é exatamente isso.
 *  - política 'por-peso' (`?residencia=peso`): a VS/luta é exclusiva: só os dois atlas, o cenário da luta e as FILME dos dois (com a flag do filme), e a conta bate com a da spec §6 C1.
 */
test.describe.configure({ timeout: 180_000 });

const MIB = 1024 * 1024;
const BASE_FORA_DAS_IMAGENS = 17.9;
const VITRINE = ['hayato', 'wei-long', 'min-ji', 'caio'];

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

interface Medida {
  readonly atlas: string[];
  readonly cenarios: string[];
  readonly filmes: string[];
  readonly stage: string;
  readonly imagens: number; // MiB
  readonly retratos: number; // MiB
  readonly silhuetas: number; // MiB
  readonly politica: string;
}

/** Abre a luta pelo gancho (como o `memoria-filme.spec`), espera a arte, avança até `phase === 'fight'` + 60 ticks e lê `arte.memoria()`. */
async function medir(page: Page, c1: string, c2: string, opcoes: { peso: boolean; filmes: boolean }): Promise<Medida> {
  await page.goto(`/?seed=7&manual=1&expansao=1${opcoes.peso ? '&residencia=peso' : '&residencia=fixa'}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const cfg = { mode: 'versus', c1, c2, cpu: null, esquiva: false, ...(opcoes.filmes ? { motorV2: { filmes: true } } : {}) };
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${JSON.stringify({ cfg })}); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
  for (let i = 0; i < 400; i++) if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  await hook(page, '(h) => h.avancar(60)');
  if (opcoes.filmes) {
    // os que têm folha FILME no manifesto (arte.atlas é privado, mas é o mesmo gancho do memoria-filme.spec)
    await page.waitForFunction(
      (ids) => {
        const a = (window as any).__inno.mundo().arte;
        return ids.filter((id: string) => a.atlas.get(id).temFilme).every((id: string) => a.filmesResidentes().includes(id));
      },
      [...new Set([c1, c2])],
      { timeout: 60_000 },
    );
  }
  return hook(
    page,
    `(h) => { const a = h.mundo().arte; const m = a.memoria(); const MIB = ${MIB};
      return { atlas: Object.keys(m.atlas).sort(), cenarios: Object.keys(m.cenarios).sort(), filmes: Object.keys(m.filmes).sort(), stage: h.mundo().elenco['${c2}'].ch.stage,
        imagens: m.imagens / MIB, retratos: m.retratos / MIB, silhuetas: m.silhuetas / MIB, politica: a.politica }; }`,
  );
}

const nota = (info: { annotations: Array<{ type: string; description?: string }> }, par: string, m: Medida): void => {
  info.annotations.push({
    type: `${par} (${m.politica})`,
    description: `imagens ${m.imagens.toFixed(1)} MiB + base ${BASE_FORA_DAS_IMAGENS} = total ${(m.imagens + BASE_FORA_DAS_IMAGENS).toFixed(1)} | atlas ${m.atlas.join(',')} | cenários ${m.cenarios.join(',')} | filmes ${m.filmes.join(',') || '-'} | silhuetas ${m.silhuetas.toFixed(2)}`,
  });
};

// Íris (`mem-luta.mjs`, só imagens, sem FILME): vitrine 102 + cenários do título 31,6 + dupla fora da vitrine + cenário da casa do rival (se fora do título) + retratos 1,65.
const FIXA: Array<[string, string, number]> = [
  ['hayato', 'min-ji', 135.3],
  ['nila', 'centella', 206.7],
  ['baatar', 'baatar', 195.2],
  ['baatar', 'zenon', 255.2],
  ['zenon', 'zenon', 203.2],
  ['caio', 'aminu', 173.2],
  ['aminu', 'caio', 165.3],
];

test.describe("política 'fixa' (o padrão de hoje): a vitrine e os 4 cenários ficam na luta", () => {
  for (const [c1, c2, esperado] of FIXA) {
    test(`${c1.toUpperCase()} x ${c2.toUpperCase()}: ${esperado} MiB de imagens (±0,5)`, async ({ page }, info) => {
      const m = await medir(page, c1, c2, { peso: false, filmes: false });
      nota(info, `${c1} x ${c2}`, m);
      expect(m.politica).toBe('fixa');
      expect(m.imagens).toBeGreaterThan(esperado - 0.5);
      expect(m.imagens).toBeLessThan(esperado + 0.5);
      // o excesso É a vitrine e os cenários: o que o 'por-peso' tira
      for (const id of VITRINE) expect(m.atlas, `vitrine ${id} residente na luta`).toContain(id);
      expect(m.cenarios).toEqual(expect.arrayContaining(['jp', 'cn', 'kr', 'br']));
      expect(m.silhuetas).toBeLessThanOrEqual(6);
    });
  }
});

// Spec §6 C1: imagens esperadas com as FILME dos dois (±0,5), na luta exclusiva.
const PESO: Array<[string, string, number]> = [
  ['hayato', 'min-ji', 75.8],
  ['nila', 'centella', 91.3],
  ['nila', 'aminu', 94.9],
  ['caio', 'aminu', 85.7],
  ['hayato', 'hayato', 42.9],
  ['baatar', 'baatar', 71.1],
  ['zenon', 'zenon', 78.2],
  ['nila', 'zenon', 124.6],
  ['baatar', 'zenon', 139.7],
];

test.describe("política 'por-peso' (?residencia=peso): a vitrine é solta na luta", () => {
  for (const [c1, c2, esperado] of PESO) {
    test(`${c1.toUpperCase()} x ${c2.toUpperCase()}: só a dupla, o cenário da luta e as FILME (${esperado} MiB ±0,5)`, async ({ page }, info) => {
      const m = await medir(page, c1, c2, { peso: true, filmes: true });
      nota(info, `${c1} x ${c2}`, m);
      expect(m.politica).toBe('por-peso');
      expect(m.atlas).toEqual([...new Set([c1, c2])].sort());
      expect(m.cenarios).toEqual([m.stage]);
      for (const id of m.filmes) expect([c1, c2]).toContain(id);
      expect(m.imagens).toBeGreaterThan(esperado - 0.5);
      expect(m.imagens).toBeLessThan(esperado + 0.5);
      expect(m.silhuetas).toBeLessThanOrEqual(6);
    });
  }

  test('sem a flag do filme a conta é a da dupla + o cenário + os retratos (HAYATO x MIN-JI = 57,6 MiB)', async ({ page }) => {
    const m = await medir(page, 'hayato', 'min-ji', { peso: true, filmes: false });
    expect(m.filmes).toEqual([]);
    expect(m.atlas).toEqual(['hayato', 'min-ji']);
    expect(m.cenarios).toEqual(['kr']);
    expect(m.imagens).toBeCloseTo(48 + 1920 * 1080 * 4 / MIB + m.retratos, 3);
    expect(m.retratos).toBeGreaterThan(1.5);
    expect(m.retratos).toBeLessThan(1.8);
  });
});
