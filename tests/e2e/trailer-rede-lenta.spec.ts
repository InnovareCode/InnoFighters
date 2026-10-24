/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/*
 * Rede lenta no trailer, no servidor de desenvolvimento (a medida real da vazão com Fast 3G está em tests/e2e-build/trailer-rede.spec.ts; aqui `?vazao=<bytes/s>` fixa a que o boot mediu):
 *  - sem `navigator.connection` (o iPhone) a vazão baixa leva ao trailer ESTÁTICO, sem pedir os atlas, e a vazão boa ou desconhecida ao COMPLETO;
 *  - o cartão de reserva NUNCA sai vazio (retratos que ainda não chegaram viram a placa com as iniciais);
 *  - se a arte de um plano não chega, o 1º cartão de reserva é tolerado e o 2º faz a cena seguir pelo estático, sem reserva em série.
 */

test.describe.configure({ timeout: 120_000 });
test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const diag = (page: Page): Promise<any> => hook(page, '(h) => h.ui.cenas.trailer.diagnostico()');

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page, query: string): Promise<void> {
  await page.goto(`/?seed=7${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.carregado === true, undefined, { timeout: 30_000 });
}

const abrirOTrailer = async (page: Page): Promise<void> => {
  await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
  await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });
};

/** Pixels CLAROS (as iniciais da placa) numa caixa do canvas 1920x1080: o degradê azul escuro do retrato fica abaixo de 120 em todo canal. */
const brancosNaCaixa = (page: Page, x: number, y: number, w: number, h: number): Promise<number> =>
  page.locator('canvas#jogo').evaluate(
    (el, caixa) => {
      const c = el as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(caixa.x, caixa.y, caixa.w, caixa.h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.max(d[i]!, d[i + 1]!, d[i + 2]!) > 200) n++;
      return n;
    },
    { x, y, w, h },
  );

test.describe('trailer em rede lenta', () => {
  test('sem a API de conexão, vazão BAIXA no boot: trailer ESTÁTICO por "vazao", sem pedir nenhum atlas, e termina no título', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    const erros = coletarErros(page);
    const atlas: string[] = [];
    page.on('request', (r) => {
      if (/\/atlas-?\d*\.webp$/.test(new URL(r.url()).pathname)) atlas.push(new URL(r.url()).pathname);
    });
    await abrir(page, '&manual=1&vazao=120000');
    // o Chromium TEM navigator.connection (4g aqui); o iPhone não tem: a decisão abaixo vem só da vazão
    expect(await hook(page, '(h) => (navigator.connection ? navigator.connection.effectiveType : "sem-api")')).not.toMatch(/2g|3g/);
    await page.waitForTimeout(300);
    atlas.length = 0; // o que a etapa 1 já pediu não conta: o que não pode é o TRAILER pedir
    await abrirOTrailer(page);
    const d = await diag(page);
    expect(d.estatico).toBe(true);
    expect(d.motivoEstatico).toBe('vazao');
    expect(await hook(page, '(h) => document.body.dataset.trailer')).toBe('estatico');
    await hook(page, '(h) => h.avancar(60)');
    await page.waitForTimeout(500);
    expect(atlas, 'o estático por rede lenta não pede os 4,7 MiB da vitrine (só cenários e retratos)').toEqual([]);
    // anda o estático inteiro (6 quadros de 96 ticks) e chega ao título
    for (let i = 0; i < 60 && (await hook(page, '(h) => h.ui.name')) === 'trailer'; i++) {
      await hook(page, '(h) => h.avancar(20)');
      await page.waitForTimeout(30);
    }
    await hook(page, '(h) => h.avancar(60)');
    expect(await hook(page, '(h) => h.ui.name')).toBe('title');
    expect(await hook(page, '(h) => document.body.dataset.trailer')).toBeUndefined();
    expect(erros).toEqual([]);
  });

  test('vazão ALTA ou desconhecida: trailer COMPLETO (a medida só manda para o estático quando é baixa)', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    for (const [vazao, esperado] of [['5000000', 'completo'], ['nenhuma', 'completo'], ['419999', 'estatico'], ['420000', 'completo']] as const) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await abrir(page, `&manual=1&vazao=${vazao}`);
      await abrirOTrailer(page);
      const d = await diag(page);
      expect(d.estatico, `vazao=${vazao}`).toBe(esperado === 'estatico');
      expect(await hook(page, '(h) => document.body.dataset.trailer'), `vazao=${vazao}`).toBe(esperado);
      await ctx.close();
    }
  });

  test('estático por rede lenta com retratos E atlas que não chegam: nenhum dos 5 quadros com gente sai vazio (rosto, placa ou nome no meio da tela)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    const erros = coletarErros(page);
    await page.route(/\/assets\/lutadores\/[^/]+\/(retrato|atlas-\d)\.webp/, () => undefined);
    await abrir(page, '&manual=1&vazao=120000');
    await abrirOTrailer(page);
    expect((await diag(page)).motivoEstatico).toBe('vazao');
    let anterior = 0;
    // quadros do estático (96 ticks cada) com GENTE: 0 (HAYATO), 1 (HAYATO e WEI LONG) e 3 (3 retratos de guardiões). Cada rosto/placa é um quadrado em px lógicos (lado, x, y);
    // dentro dele, SEM a borda e a faixa da cor do lutador (que são claras e não provam nada), tem de haver as iniciais (pixels claros) e não só o degradê azul escuro
    const quadrados: Record<number, Array<[number, number, number]>> = {
      40: [[190, 385, 170]],
      140: [[190, 215, 170], [190, 555, 170]],
      340: [[150, 175, 200], [150, 405, 200], [150, 635, 200]],
    };
    for (const tick of [40, 140, 340]) {
      await hook(page, `(h) => h.avancar(${tick - anterior})`);
      anterior = tick;
      await hook(page, '(h) => h.desenhar()');
      for (const [lado, x, y] of quadrados[tick]!) {
        const inset = 24; // px do canvas
        expect(await brancosNaCaixa(page, 2 * x + inset, 2 * y + inset, 2 * lado - 2 * inset, Math.round(2 * lado * 0.8) - inset), `quadro no tick ${tick}, rosto em x ${x}`).toBeGreaterThan(80);
      }
    }
    expect(erros.filter((e) => !/Failed to load resource|net::/.test(e))).toEqual([]);
  });

  test('movimento reduzido continua estático por "movimento", e pede a vitrine (a rede é boa)', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await abrir(page, '&manual=1&vazao=5000000');
    await abrirOTrailer(page);
    const d = await diag(page);
    expect(d.estatico).toBe(true);
    expect(d.motivoEstatico).toBe('movimento');
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.lutadoresResidentes().length === 4, undefined, { timeout: 30_000 });
    await ctx.close();
  });

  test('o cartão de reserva com os retratos que NÃO chegaram mostra a placa com as iniciais dos dois (nunca vazio); o 2º cartão faz a cena seguir pelo estático', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    test.setTimeout(150_000);
    const erros = coletarErros(page);
    // a rede deixa os retratos e os atlas da MIN-JI, do CAIO e da AMINU pendurados para sempre (P2 e P3 sem arte); o resto chega
    await page.route(/\/assets\/lutadores\/[^/]+\/retrato\.webp/, () => undefined);
    await page.route(/\/assets\/lutadores\/(min-ji|caio|aminu)\/atlas-\d\.webp/, () => undefined);
    await abrir(page, '&manual=1&vazao=5000000');
    await abrirOTrailer(page);
    expect((await diag(page)).estatico).toBe(false);
    let viuReserva = false;
    let brancosNaReserva = 0;
    let degradou = false;
    let maxReservas = 0;
    for (let i = 0; i < 400 && !degradou; i++) {
      const d = await diag(page);
      maxReservas = Math.max(maxReservas, d.planosEmReserva.length);
      if (d.reserva && d.plano === 'P2' && !viuReserva) {
        viuReserva = true;
        await hook(page, '(h) => h.desenhar()');
        if (process.env['LYRA_QUADRO']) writeFileSync(process.env['LYRA_QUADRO'], Buffer.from((await hook(page, "(h) => document.getElementById('jogo').toDataURL('image/png')")).split(',')[1], 'base64'));
        // os dois retratos de reserva: x 150..360 (HAYATO nao, MIN-JI) e a direita, y 120..330 em px lógicos x2 = 1920x1080
        // dentro do quadrado, sem a borda nem a faixa da cor do lutador (claras, não provam nada): só as iniciais
        const inset = 24;
        brancosNaReserva = (await brancosNaCaixa(page, 2 * 150 + inset, 2 * 120 + inset, 2 * 210 - 2 * inset, 2 * 170 - inset)) + (await brancosNaCaixa(page, 2 * (960 - 150 - 210) + inset, 2 * 120 + inset, 2 * 210 - 2 * inset, 2 * 170 - inset));
      }
      degradou = d.degradou === true;
      if (degradou) break;
      const prox = d.proximoPlano;
      // só o P1 (que tem arte) espera a rede; P2 e P3 estão sem arte de propósito e o trailer não espera por eles
      if (prox && prox.id === 'P1' && prox.emTicks <= 1 && !prox.artePronta) {
        await page.waitForTimeout(100);
        continue;
      }
      await hook(page, `(h) => h.avancar(${prox && prox.emTicks <= 8 ? 1 : 8})`);
      if (i % 10 === 0) await page.waitForTimeout(60);
    }
    expect(viuReserva, 'o 1º plano sem arte (P2) virou cartão de reserva (tolerado)').toBe(true);
    expect(brancosNaReserva, 'as iniciais da placa (MJ e CA) estão desenhadas nos dois retratos').toBeGreaterThan(150);
    expect(degradou, 'o 2º plano sem arte (P3) NÃO vira reserva em série: a cena segue pelo estático').toBe(true);
    expect(maxReservas).toBeLessThanOrEqual(1);
    const d = await diag(page);
    expect(d.estatico).toBe(true);
    expect(d.motivoEstatico).toBe('vazao');
    expect(await hook(page, '(h) => document.body.dataset.trailer')).toBe('estatico');
    // termina: o estático anda até o título
    for (let i = 0; i < 40 && (await hook(page, '(h) => h.ui.name')) === 'trailer'; i++) {
      await hook(page, '(h) => h.avancar(30)');
      await page.waitForTimeout(50);
    }
    await hook(page, '(h) => h.avancar(60)');
    expect(await hook(page, '(h) => h.ui.name')).toBe('title');
    expect(erros.filter((e) => !/Failed to load resource|net::/.test(e))).toEqual([]);
  });
});
