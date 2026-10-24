/*
 * Boot em etapas no BUILD de produção (T4, docs/orcamentos-2026-10-23.md §2.2 e meta 4): `npm run test:e2e:build` (build + preview na 4173).
 *  - ETAPA 0 (bloqueia o `data-pronto`, a tela de "CLIQUE OU PRESSIONE UMA TECLA"): <= 1,5 MiB pela rede, sem nenhum atlas, retrato, FILME ou som;
 *  - tudo o que a etapa 0 baixa está no shell do service worker (boot e SW não divergem: contrato T4/T7, src/assets/etapa0.mjs);
 *  - ETAPA 1 (`data-vitrine`): a vitrine (4 atlas, os cenários do título) e os 10 retratos chegam DEPOIS, em segundo plano.
 * O método é o da Íris (docs/saude-da-suite-2026-10-23.md §3): bytes de rede até o instante em que o `data-pronto` aparece. Aqui pelo Resource Timing (`transferSize`, com
 * cabeçalhos) lido no mesmo instante em que um MutationObserver vê o atributo; contexto novo = sem cache; service worker bloqueado (o SW baixaria o shell por fora da conta).
 */
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });
test.use({ serviceWorkers: 'block' });

/** Meta 4: 1,5 MiB até o `data-pronto`. */
const META_MIB = 1.5;
const MIB = 1024 * 1024;

interface Visto {
  readonly nome: string;
  readonly bytes: number;
}
interface Captura {
  readonly bytes: number;
  readonly arquivos: Visto[];
  readonly tPronto: number;
}

/** Instala, antes da página, o observador que congela a lista de recursos NO INSTANTE em que o `data-pronto` aparece. */
async function observarOPronto(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __captura?: { bytes: number; arquivos: Array<{ nome: string; bytes: number }>; tPronto: number } };
    new MutationObserver(() => {
      if (w.__captura || document.documentElement.dataset['pronto'] !== 'true') return;
      const tPronto = performance.now();
      const recursos = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const arquivos = recursos.filter((r) => r.responseEnd <= tPronto).map((r) => ({ nome: new URL(r.name).pathname, bytes: r.transferSize }));
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      arquivos.push({ nome: '(documento)', bytes: nav?.transferSize ?? 0 });
      w.__captura = { bytes: arquivos.reduce((s, a) => s + a.bytes, 0), arquivos, tPronto };
    }).observe(document, { attributes: true, subtree: true });
  });
}

const capturaDoPronto = (page: Page): Promise<Captura> => page.evaluate(() => (window as unknown as { __captura: Captura }).__captura);

test.describe('boot em etapas (build de produção)', () => {
  test('etapa 0: até o data-pronto são <= 1,5 MiB, só dados leves, a marca, o cenário padrão, as fontes e o JS; nenhuma arte de lutador', async ({ page }) => {
    await observarOPronto(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const c = await capturaDoPronto(page);
    const nomes = c.arquivos.map((a) => a.nome);
    const lista = c.arquivos
      .map((a) => `${String(a.bytes).padStart(8)} ${a.nome}`)
      .sort()
      .join('\n');
    expect(c.bytes, `etapa 0 pesou ${(c.bytes / MIB).toFixed(3)} MiB:\n${lista}`).toBeLessThanOrEqual(META_MIB * MIB);
    expect(c.bytes).toBeGreaterThan(0.3 * MIB); // o medidor enxergou o boot de verdade (o splash e o JS sozinhos passam disto)
    // o que NÃO pode estar na etapa 0
    expect(nomes.filter((n) => /\/atlas(-\d+)?\.webp$/.test(n)), 'atlas').toEqual([]);
    expect(nomes.filter((n) => /\/retrato\.webp$/.test(n)), 'retratos').toEqual([]);
    expect(nomes.filter((n) => /\/filme\.webp$/.test(n)), 'folhas FILME').toEqual([]);
    expect(nomes.filter((n) => n.endsWith('.mp3')), 'sons').toEqual([]);
    expect(nomes.filter((n) => /\/cenario-(?!jp)[a-z]+\.webp$/.test(n)), 'cenários do ciclo do título').toEqual([]);
    expect(nomes.filter((n) => /\/trailer-[^/]+\.js$/.test(n)), 'pedaço do trailer').toEqual([]);
    // o que TEM de estar
    expect(nomes.filter((n) => /\/lutadores\/[^/]+\/atlas\.json$/.test(n))).toHaveLength(10);
    expect(nomes).toContain('/assets/cenarios/cenario-jp.webp');
    expect(nomes.some((n) => n.includes('/assets/ui/logo/splash-'))).toBe(true);
    // e o jogo desenha de verdade (não é só o atributo): o canvas do boot tem mais de uma cor
    const cores = await page.locator('canvas#jogo').evaluate((el) => {
      const cv = el as HTMLCanvasElement;
      const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      const s = new Set<number>();
      for (let i = 0; i < d.length; i += 4 * 997) s.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
      return s.size;
    });
    expect(cores).toBeGreaterThan(8);
  });

  test('tudo o que a etapa 0 baixou está no shell do service worker (boot e SW não divergem)', async ({ page, request }) => {
    await observarOPronto(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const c = await capturaDoPronto(page);
    const texto = await (await request.get('/sw-manifesto.js')).text();
    const m = JSON.parse(texto.replace(/^self\.__INNO_MANIFESTO__=/, '').replace(/;\s*$/, '')) as { shell: string[] };
    const noShell = new Set(m.shell.map((s) => `/${s}`));
    // fora da conta: o documento, a consulta de versão (nunca interceptada pelo SW)
    const faltam = c.arquivos.map((a) => a.nome).filter((n) => n !== '(documento)' && n !== '/version.json' && !noShell.has(n));
    expect(faltam, 'baixado no boot e ausente do shell do SW').toEqual([]);
    // e o shell não puxa arte pesada: nenhuma página de atlas, retrato, FILME nem som
    expect(m.shell.filter((s) => /\/atlas(-\d+)?\.webp$|\/retrato\.webp$|\/filme\.webp$|\.mp3$/.test(s))).toEqual([]);
  });

  test('etapa 1: a vitrine e os retratos chegam depois do data-pronto, em segundo plano', async ({ page }) => {
    await observarOPronto(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const c = await capturaDoPronto(page);
    await expect(page.locator('html')).toHaveAttribute('data-vitrine', 'true', { timeout: 120_000 });
    const nomes = await page.evaluate(() => (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map((r) => new URL(r.name).pathname));
    for (const id of ['hayato', 'wei-long', 'min-ji', 'caio']) expect(nomes.some((n) => n.startsWith(`/assets/lutadores/${id}/atlas-`)), `atlas ${id}`).toBe(true);
    for (const cen of ['cn', 'kr', 'br']) expect(nomes, `cenário ${cen}`).toContain(`/assets/cenarios/cenario-${cen}.webp`);
    expect(nomes.filter((n) => /\/retrato\.webp$/.test(n))).toHaveLength(10);
    // a etapa 1 NÃO entrou na conta do data-pronto
    expect(c.arquivos.map((a) => a.nome).filter((n) => /\/atlas-\d+\.webp$/.test(n))).toEqual([]);
    // fora a vitrine, o resto do elenco segue sob demanda: ninguém baixou o ZENON nem o BAATAR
    expect(nomes.filter((n) => /\/(zenon|baatar)\/atlas-/.test(n))).toEqual([]);
  });
});
