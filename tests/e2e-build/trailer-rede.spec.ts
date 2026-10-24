/*
 * Trailer estático x completo pela vazão MEDIDA do boot, no BUILD de produção, com a rede estrangulada de verdade (CDP `Network.emulateNetworkConditions`, service worker bloqueado para
 * a conta ser só da rede). O achado da Íris: o iPhone (WebKit) não tem `navigator.connection`, então só a vazão que o próprio boot mede pode mandar a rede lenta para o estático.
 * O Chromium tem a API, mas ela reporta "4g" mesmo estrangulada pelo CDP, então estes testes também exercitam o caminho SEM a API de fato.
 * Calibragem do limiar (3 rodadas iguais): 9 Mbps = 551 kB/s (completo), 4 Mbps = 315 kB/s e Fast 3G = 120 kB/s (estáticos); limiar 420 kB/s. `npm run test:e2e:build`.
 * O comportamento fino (cartão de reserva, desistência do completo) está em tests/e2e/trailer-rede-lenta.spec.ts.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });
test.use({ serviceWorkers: 'block' });

interface Rede {
  readonly nome: string;
  readonly cond: { latency: number; downloadThroughput: number; uploadThroughput: number } | null;
}
const MBPS = (n: number): number => (n * 1024 * 1024) / 8;
const REDES = {
  semLimite: { nome: 'sem limite', cond: null },
  quatroG: { nome: '4G 9 Mbps / 170 ms', cond: { latency: 170, downloadThroughput: MBPS(9), uploadThroughput: MBPS(9) } },
  quatroMbps: { nome: '4 Mbps / 170 ms', cond: { latency: 170, downloadThroughput: MBPS(4), uploadThroughput: MBPS(3) } },
  fast3g: { nome: 'Fast 3G 1,6 Mbps / 562 ms', cond: { latency: 562.5, downloadThroughput: MBPS(1.6), uploadThroughput: (750 * 1024) / 8 } },
} satisfies Record<string, Rede>;

async function paginaComRede(ctx: BrowserContext, rede: Rede): Promise<Page> {
  const page = await ctx.newPage();
  if (rede.cond) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...rede.cond });
  }
  return page;
}

const coresNoCanvas = (page: Page): Promise<number> =>
  page.locator('canvas#jogo').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const cores = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return cores.size;
  });

/** Abre o jogo na rede dada, espera o `data-pronto` e o pedaço do trailer (senão o gesto vai para a abertura de hoje), aperta Enter e devolve o trailer escolhido. */
async function abrirOTrailerNaRede(browser: import('@playwright/test').Browser, rede: Rede): Promise<{ page: Page; ctx: BrowserContext; escolhido: string | null; erros: string[] }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await paginaComRede(ctx, rede);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 120_000 });
  // o pedaço lazy do trailer (24 kB) baixa depois do data-pronto: o boot só abre o trailer com ele
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((r) => /\/trailer-[^/]+\.js/.test(r.name) && (r as PerformanceResourceTiming).responseEnd > 0)), { timeout: 60_000 })
    .toBe(true);
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.body.dataset['trailer'] ?? null), { timeout: 30_000 }).not.toBeNull();
  const escolhido = await page.evaluate(() => document.body.dataset['trailer'] ?? null);
  return { page, ctx, escolhido, erros };
}

test.describe('trailer pela vazão medida do boot (build, rede estrangulada)', () => {
  test('rede RÁPIDA (sem limite e 4G de 9 Mbps) segue no trailer COMPLETO', async ({ browser }) => {
    for (const rede of [REDES.semLimite, REDES.quatroG]) {
      const t = await abrirOTrailerNaRede(browser, rede);
      expect(t.escolhido, rede.nome).toBe('completo');
      await t.page.waitForTimeout(1500);
      expect(await coresNoCanvas(t.page), rede.nome).toBeGreaterThan(5);
      expect(t.erros, rede.nome).toEqual([]);
      await t.ctx.close();
    }
  });

  test('rede LENTA (Fast 3G e 4 Mbps), sem a API que o iPhone não tem, cai no ESTÁTICO e nenhum quadro sai vazio; termina no título', async ({ browser }) => {
    test.setTimeout(240_000);
    for (const rede of [REDES.fast3g, REDES.quatroMbps]) {
      const t = await abrirOTrailerNaRede(browser, rede);
      expect(t.escolhido, rede.nome).toBe('estatico');
      // a vitrine (4,7 MiB) NÃO é pedida para o estático por rede lenta
      const atlasDoTrailer: string[] = [];
      t.page.on('request', (r) => {
        if (/\/atlas-\d\.webp$/.test(new URL(r.url()).pathname)) atlasDoTrailer.push(new URL(r.url()).pathname);
      });
      // o estático dura ~9,6 s: amostra o canvas ao longo dele; nenhum quadro pode ser um vazio (a placa/rosto/pose/nome sempre desenham alguma coisa)
      let atlasAteAqui = [...atlasDoTrailer];
      for (let i = 0; i < 6; i++) {
        await t.page.waitForTimeout(1300);
        if ((await t.page.evaluate(() => document.body.dataset['trailer'] ?? null)) === null) break;
        atlasAteAqui = [...atlasDoTrailer]; // só o que foi pedido com o trailer ainda em cena (depois dele o título pede a vitrine dele)
        expect(await coresNoCanvas(t.page), `${rede.nome}, amostra ${i}`).toBeGreaterThan(8);
      }
      // chega ao título (o body sai do modo trailer)
      await expect.poll(() => t.page.evaluate(() => document.body.classList.contains('em-trailer')), { timeout: 40_000 }).toBe(false);
      expect(atlasAteAqui, `${rede.nome}: nenhum atlas novo durante o estático`).toEqual([]);
      expect(t.erros, rede.nome).toEqual([]);
      await t.ctx.close();
    }
  });
});
