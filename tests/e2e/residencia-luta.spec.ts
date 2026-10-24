/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * L3 da residência de memória (docs/spec-residencia-de-memoria.md §6): a LUTA EXCLUSIVA com `?residencia=peso`, pelo Navegador (tabela `arteDaCena`).
 *  - C2: na VS pronta só há a dupla + o cenário + os retratos (sem vitrine, sem `jp`, sem FILME).
 *  - C3: sem acúmulo. título -> menu -> seleção -> treino NILA x AMINU -> pausa -> TROCAR -> seleção -> treino HAYATO x HAYATO, tudo pela UI: a 2ª luta mede o mesmo que isolada e
 *    durante as duas os atlas vivos são só os da dupla.
 *  - C5: sem referência escondida. WeakRef de uma página da CAIO, do `cn` e do `jp`: depois de uma luta que não os usa e de um GC pelo CDP, `deref()` é `undefined`.
 * Os números da luta por par (C1) estão em `memoria-por-luta.spec.ts`.
 */
test.describe.configure({ timeout: 240_000 });

const MIB = 1024 * 1024;
const BYTES_DE_CENARIO = (1920 * 1080 * 4) / MIB;

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

const URL = '/?seed=7&expansao=1&residencia=peso&trailer=0';

async function abrir(page: Page, url = URL): Promise<void> {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('inno-fighters-v1')) {
      window.localStorage.setItem('inno-fighters-v1', JSON.stringify({ v: 1, s: { music: 0, sfx: 0, rounds: 1, time: 99, diff: 0, shake: true }, hi: 0 }));
    }
  });
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

const naCena = (page: Page, nome: string, timeout = 30_000): Promise<unknown> =>
  page.waitForFunction((n) => (window as any).__inno.ui.name === n && (window as any).__inno.ui.fadeTo === null, nome, { timeout });

const medida = (page: Page): Promise<{ atlas: string[]; cenarios: string[]; filmes: string[]; filmesMiB: number; imagens: number; retratos: number; residentes: string[]; politica: string }> =>
  hook(
    page,
    `(h) => { const a = h.mundo().arte; const m = a.memoria();
      return { atlas: Object.keys(m.atlas).sort(), cenarios: Object.keys(m.cenarios).sort(), filmes: Object.keys(m.filmes), filmesMiB: Object.values(m.filmes).reduce((s, b) => s + b, 0) / ${MIB}, imagens: m.imagens / ${MIB}, retratos: m.retratos / ${MIB},
        residentes: a.lutadoresResidentes().sort(), politica: a.politica }; }`,
  );

/** Peso decodificado do atlas (w x h x 4 x páginas) pelo manifesto, em MiB. */
const pesoDoAtlas = (page: Page, id: string): Promise<number> => hook(page, `(h) => h.mundo().arte.atlas.get('${id}').peso / ${MIB}`);

const cfg = (c1: string, c2: string, mode = 'versus'): string => JSON.stringify({ cfg: { mode, c1, c2, cpu: null, esquiva: false } });

test.describe("C2: VS pronta na política 'por-peso'", () => {
  for (const [c1, c2, stage] of [
    ['nila', 'aminu', 'ng'],
    ['hayato', 'hayato', 'jp'],
    ['baatar', 'zenon', 'gr'],
  ] as const) {
    test(`${c1.toUpperCase()} x ${c2.toUpperCase()}: só a dupla, o cenário (${stage}) e os retratos`, async ({ page }) => {
      await abrir(page);
      // a vitrine e o jp estão na memória no título; a VS (vinda do menu, com o fade de verdade) solta tudo isso
      await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('menu'); }`);
      expect((await medida(page)).atlas).toEqual(expect.arrayContaining(['hayato', 'wei-long', 'min-ji', 'caio']));
      await hook(page, `(h) => h.ui.go('vs', ${cfg(c1, c2)})`);
      await naCena(page, 'vs');
      await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
      const m = await medida(page);
      expect(m.politica).toBe('por-peso');
      expect(m.atlas).toEqual([...new Set([c1, c2])].sort());
      expect(m.cenarios).toEqual([stage]);
      expect(m.filmes).toEqual([]);
      const pesos = await Promise.all([...new Set([c1, c2])].map((id) => pesoDoAtlas(page, id)));
      expect(m.imagens).toBeCloseTo(pesos.reduce((s, p) => s + p, 0) + BYTES_DE_CENARIO + m.retratos, 3);
    });
  }
});

test.describe('C3: sem acúmulo, pela UI', () => {
  test('título -> menu -> seleção -> treino NILA x AMINU -> pausa -> TROCAR -> seleção -> treino HAYATO x HAYATO mede o mesmo que isolada', async ({ page, browser, baseURL }, info) => {
    await abrir(page);
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('title'); }`);
    const tecla = (k: string): Promise<unknown> => hook(page, `(h) => { h.ui.key('${k}'); }`);
    await tecla('Enter');
    await naCena(page, 'menu');
    for (let i = 0; i < 3; i++) await tecla('ArrowDown'); // TREINAMENTO
    expect(await hook(page, '(h) => h.ui.scene.selecionado')).toBe(3);
    await tecla('Enter');
    await naCena(page, 'select');
    const escolher = async (id: string): Promise<void> => {
      await hook(page, `(h) => { const s = h.ui.scene; const i = s.grade.indexOf('${id}'); s.cur[s.step === 1 ? 0 : 1] = i; }`);
      await tecla('Enter');
    };
    await escolher('nila');
    await escolher('aminu');
    await naCena(page, 'fight');
    await hook(page, SEM_PROVOCACAO);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 60_000 });
    const viva1 = await medida(page);
    expect(viva1.atlas, 'durante a 1ª luta os atlas vivos são só os da dupla').toEqual(['aminu', 'nila']);
    expect(viva1.residentes).toEqual(['aminu', 'nila']);
    expect(viva1.cenarios).toEqual(['ng']);
    for (const id of viva1.filmes) expect(['aminu', 'nila'], 'a FILME, se já chegou, é só da dupla').toContain(id); // o motor v2 (padrão do jogo) liga o filme na seleção
    info.annotations.push({ type: '1ª luta (NILA x AMINU)', description: `${viva1.imagens.toFixed(2)} MiB de imagens` });

    // pausa -> TROCAR PERSONAGENS (o 6º item do menu de treino)
    await tecla('Escape');
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(true);
    for (let i = 0; i < 5; i++) await tecla('ArrowDown');
    await tecla('Enter');
    await naCena(page, 'select');
    // a seleção está fora da luta: o jp (fundo dos menus) volta; os atlas da dupla seguem enquanto nada os solta
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.cenarios.has('jp'), undefined, { timeout: 30_000 });
    await escolher('hayato');
    await escolher('hayato');
    await naCena(page, 'fight');
    await hook(page, SEM_PROVOCACAO);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 60_000 });
    const viva2 = await medida(page);
    expect(viva2.atlas, 'durante a 2ª luta só o HAYATO').toEqual(['hayato']);
    expect(viva2.residentes).toEqual(['hayato']);
    expect(viva2.cenarios).toEqual(['jp']);
    const hayato = await pesoDoAtlas(page, 'hayato');
    for (const id of viva2.filmes) expect(id).toBe('hayato');
    const semFilme2 = viva2.imagens - viva2.filmesMiB; // a FILME (padrão do motor v2) chega depois da luta começar: a conta de "acúmulo" é a das imagens fixas
    expect(semFilme2).toBeCloseTo(hayato + BYTES_DE_CENARIO + viva2.retratos, 3);
    expect(semFilme2).toBeGreaterThan(33.1);
    expect(semFilme2).toBeLessThan(34.1); // atlas 24 + jp 7,9 + retratos 1,65 = 33,6 ± 0,5

    // a mesma luta isolada (página nova, direto na luta) mede o mesmo
    const outra = await (await browser.newContext({ ...(info.project.use as object), ...(baseURL ? { baseURL } : {}) })).newPage();
    try {
      await abrir(outra, '/?seed=7&manual=1&expansao=1&residencia=peso');
      await hook(outra, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg('hayato', 'hayato', 'training')}); (${SEM_PROVOCACAO})(h); }`);
      await outra.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
      const isolada = await medida(outra);
      info.annotations.push({ type: '2ª luta (HAYATO x HAYATO)', description: `na sequência ${semFilme2.toFixed(2)} MiB (sem a FILME) | isolada ${isolada.imagens.toFixed(2)} MiB` });
      expect(Math.abs(semFilme2 - isolada.imagens)).toBeLessThan(0.01);
    } finally {
      await outra.context().close();
    }
  });
});

test.describe('C5: sem referência escondida', () => {
  test("controle negativo: com a política 'fixa' as três referências SEGUEM vivas depois do mesmo GC (o teste enxerga)", async ({ page }) => {
    await abrir(page, '/?seed=7&manual=1&expansao=1&residencia=fixa');
    await hook(
      page,
      `(h) => { const a = h.mundo().arte; window.__fracos = { caio: new WeakRef(a.atlas.get('caio').paginas[0]), cn: new WeakRef(a.cenarios.get('cn')), jp: new WeakRef(a.cenarios.get('jp')) }; }`,
    );
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg('nila', 'centella')}); (${SEM_PROVOCACAO})(h); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    await hook(page, '(h) => h.avancar(120)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(300);
    await cdp.send('HeapProfiler.collectGarbage');
    const vivos = await hook(page, `(h) => ({ caio: window.__fracos.caio.deref() !== undefined, cn: window.__fracos.cn.deref() !== undefined, jp: window.__fracos.jp.deref() !== undefined })`);
    expect(vivos).toEqual({ caio: true, cn: true, jp: true });
  });

  test('WeakRef de uma página da CAIO, do cn e do jp: depois de NILA x CENTELLA e de um GC pelo CDP, todos foram coletados', async ({ page }, info) => {
    await abrir(page, '/?seed=7&manual=1&expansao=1&residencia=peso');
    // antes da luta: tudo isso está na memória (vitrine + cenários do título)
    const antes = await hook(
      page,
      `(h) => { const a = h.mundo().arte; const pg = a.atlas.get('caio').paginas;
        window.__fracos = { caio: new WeakRef(pg[0]), cn: new WeakRef(a.cenarios.get('cn')), jp: new WeakRef(a.cenarios.get('jp')) };
        return { caio: !!window.__fracos.caio.deref(), cn: !!window.__fracos.cn.deref(), jp: !!window.__fracos.jp.deref() }; }`,
    );
    expect(antes).toEqual({ caio: true, cn: true, jp: true });
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg('nila', 'centella')}); (${SEM_PROVOCACAO})(h); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    await hook(page, '(h) => h.avancar(120)');
    const na = await medida(page);
    expect(na.atlas).toEqual(['centella', 'nila']);
    expect(na.cenarios).toEqual(['mx']);
    const cdp = await page.context().newCDPSession(page);
    let vivos = { caio: true, cn: true, jp: true };
    for (let i = 0; i < 5 && (vivos.caio || vivos.cn || vivos.jp); i++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.waitForTimeout(300);
      vivos = await hook(page, `(h) => ({ caio: window.__fracos.caio.deref() !== undefined, cn: window.__fracos.cn.deref() !== undefined, jp: window.__fracos.jp.deref() !== undefined })`);
    }
    info.annotations.push({ type: 'WeakRef depois do GC', description: JSON.stringify(vivos) });
    expect(vivos.caio, 'página da CAIO coletada (nenhum cache guarda cópia)').toBe(false);
    expect(vivos.cn, 'cenário cn coletado').toBe(false);
    expect(vivos.jp, 'cenário jp coletado (o fundo dos menus é um getter, não uma referência)').toBe(false);
  });
});
