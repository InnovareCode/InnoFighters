/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { esperarVitrine } from './_arte';

/*
 * Boot em etapas (T4, docs/orcamentos-2026-10-23.md §2.2) e a escolha OR-2 (a): se o jogador toca ANTES de a vitrine chegar, a abertura entra mesmo assim e os painéis (ou o trailer)
 * aparecem quando a arte chega. O peso da etapa 0 (<= 1,5 MiB) é medido no BUILD (tests/e2e-build/boot-peso.spec.ts); aqui, no servidor de desenvolvimento, o que se prova é o COMPORTAMENTO:
 *  - o `data-pronto` vem sem nenhum atlas na memória, e a etapa 1 traz retratos e vitrine depois (`data-vitrine`);
 *  - com a rede dos atlas lenta, o gesto leva à abertura sem erro, sem travar, e a arte entra quando chega;
 *  - `?residencia=fixa` é o rollback: o boot de antes, vitrine e retratos antes do `data-pronto`.
 */

test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function esperarCena(page: Page, nome: string, timeout = 20_000): Promise<void> {
  await page.waitForFunction((n) => (window as any).__inno.ui.name === n && (window as any).__inno.ui.fadeTo === null, nome, { timeout });
}

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

const residentes = (page: Page): Promise<string[]> => hook(page, '(h) => h.mundo().arte.lutadoresResidentes().sort()');
const coresNoCanvas = (page: Page): Promise<number> =>
  page.locator('canvas#jogo').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const cores = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return cores.size;
  });

test.describe('boot em etapas', () => {
  test('o data-pronto vem só com a etapa 0 (nenhum atlas, nenhum retrato) e a etapa 1 traz a vitrine e os retratos depois (data-vitrine)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    const atlas: string[] = [];
    const retratos: string[] = [];
    // a rede dos atlas é lenta (600 ms cada): sobra tempo de observar a etapa 0 sem a vitrine
    await page.route('**/assets/lutadores/*/atlas-*.webp', async (r) => {
      atlas.push(new URL(r.request().url()).pathname);
      await new Promise((ok) => setTimeout(ok, 600));
      await r.continue();
    });
    page.on('request', (r) => {
      if (r.url().endsWith('/retrato.webp')) retratos.push(new URL(r.url()).pathname);
    });
    await page.goto('/?seed=1&trailer=0');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    // etapa 0: os elencos montados (os 10 manifestos) e o jogo já mostra "CLIQUE OU PRESSIONE UMA TECLA"
    expect(await hook(page, '(h) => Object.keys(h.mundo().elenco).length')).toBe(10);
    expect(await hook(page, '(h) => h.mundo().arte.cenarios.has("jp")')).toBe(true);
    expect(await residentes(page), 'nenhum atlas na memória no data-pronto').toEqual([]);
    expect(await page.locator('html').getAttribute('data-vitrine')).toBeNull();
    await esperarCena(page, 'boot');
    expect(await hook(page, '(h) => h.ui.ready')).toBe(true);
    expect(await coresNoCanvas(page)).toBeGreaterThan(8);
    // etapa 1: a vitrine (um atlas por vez, o do menu primeiro) e os retratos, em segundo plano
    await esperarVitrine(page);
    expect(await residentes(page)).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']);
    expect(retratos).toHaveLength(10);
    expect(atlas[0]).toContain('/hayato/'); // o do menu primeiro
    expect(await hook(page, '(h) => [...h.mundo().arte.cenarios.keys()].sort()')).toEqual(['br', 'cn', 'jp', 'kr']);
    expect(erros).toEqual([]);
  });

  test('OR-2 (a): o gesto ANTES de a vitrine chegar leva à abertura sem erro e sem travar; os painéis entram quando a arte chega', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    let liberar: () => void = () => undefined;
    const portao = new Promise<void>((ok) => {
      liberar = ok;
    });
    await page.route('**/assets/lutadores/*/atlas-*.webp', async (r) => {
      await portao; // a vitrine só chega quando o teste deixa
      await r.continue();
    });
    await page.goto('/?seed=1&trailer=0');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await residentes(page)).toEqual([]);
    await page.keyboard.press('Enter'); // o gesto, com a vitrine ainda a caminho
    // a troca segura no preto até o teto (45 ticks = 0,75 s) e entra na abertura mesmo sem a arte
    await esperarCena(page, 'intro', 10_000);
    expect(await hook(page, '(h) => h.mundo().arte.estaPronto({ lutadores: ["hayato"] })')).toBe(false);
    await page.waitForTimeout(500); // a abertura anda sem a arte: o desenho pula quem não está pronto
    expect(await hook(page, '(h) => h.ui.name')).toBe('intro');
    expect(erros, 'a abertura sem a vitrine não pode lançar').toEqual([]);
    // a rede libera: os painéis ganham os lutadores sem reiniciar nada
    liberar();
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.estaPronto({ lutadores: ['hayato', 'wei-long', 'min-ji', 'caio'], cenarios: ['jp', 'cn', 'kr', 'br'] }), undefined, { timeout: 60_000 });
    expect(await hook(page, '(h) => h.ui.name')).toBe('intro');
    // o pulo da abertura leva ao título, que tem a vitrine inteira
    await page.waitForFunction(() => (window as any).__inno.ui.scene.t > 12);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'title');
    expect(await residentes(page)).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']);
    expect(await coresNoCanvas(page)).toBeGreaterThan(30);
    expect(erros).toEqual([]);
  });

  test('o trailer, com o gesto antes da vitrine: abre sem erro, sem reserva falsa nos 2 primeiros planos que chegam, e toca (a arte vai por plano)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    test.setTimeout(150_000);
    const erros = coletarErros(page);
    await page.goto('/?seed=7&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.carregado === true, undefined, { timeout: 30_000 });
    // gesto imediato (a etapa 1 mal começou): a cena do trailer é exclusiva e pede ela mesma a arte dos primeiros planos
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });
    // a abertura não traz mais que o P0 + P1 (hayato, wei-long, jp, cn) enquanto os dois primeiros planos andam
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.diagnostico().artePronta === true, undefined, { timeout: 30_000 });
    await hook(page, '(h) => h.avancar(100)');
    const d = await hook(page, '(h) => h.ui.cenas.trailer.diagnostico()');
    expect(d.residentes.length, `atlas na memória: ${d.residentes.join(', ')}`).toBeLessThanOrEqual(4);
    expect(d.planosEmReserva).toEqual([]);
    expect(d.memoriaDecodificadaMB).toBeLessThanOrEqual(150);
    expect(erros).toEqual([]);
  });

  test("?residencia=fixa é o rollback: o boot de antes, com a vitrine e os retratos já na memória no data-pronto", async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await page.goto('/?seed=1&trailer=0&residencia=fixa');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await residentes(page)).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']);
    expect(await hook(page, '(h) => Object.values(h.mundo().elenco).filter((e) => e.arte.temRetrato).length')).toBe(10);
  });
});
