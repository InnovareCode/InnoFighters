/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type CDPSession, type Page } from '@playwright/test';

/*
 * U1/U2 (docs/auditoria-fidelidade-motor-2026-10-24.md §4.1): o joystick virtual com TOQUES REAIS (CDP `Input.dispatchTouchEvent`, os mesmos eventos de um
 * aparelho) em 844×390 e 915×412, medindo o que o MOTOR recebe (`entrada.lerP1()`) e o que o lutador faz (`game.p1.state`) — não só a função pura
 * (essa está em tests/unit/toque.test.ts e toque-fluidez.test.ts). `?manual=1`: os ticks só andam quando o teste manda (`avancar`/`fimDoTick`).
 */
test.describe.configure({ timeout: 120_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'toque real: só no perfil de celular (hasTouch)'));

const TELAS = [
  { nome: '844x390', width: 844, height: 390 },
  { nome: '915x412', width: 915, height: 412 },
] as const;

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const p1 = (page: Page): Promise<{ left: boolean; right: boolean; up: boolean; down: boolean }> => hook(page, '(h) => h.entrada.lerP1()');
const tick = (page: Page): Promise<void> => hook(page, '(h) => h.entrada.fimDoTick()');

async function abrir(page: Page, tela: (typeof TELAS)[number]): Promise<{ cdp: CDPSession; erros: string[] }> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.setViewportSize({ width: tela.width, height: tela.height });
  await page.goto('/?manual=1&trailer=0&seed=7&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const cdp = await page.context().newCDPSession(page);
  return { cdp, erros };
}

async function entrarNaLuta(page: Page): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: false, motorV2: { filmes: true } } }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  for (let i = 0; i < 300; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
}

/** Centro e raio do `#joy` na página (px CSS), na tela atual. */
async function joystick(page: Page): Promise<{ x: number; y: number; R: number }> {
  const b = await page.locator('#joy').boundingBox();
  if (!b) throw new Error('#joy sem caixa');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, R: b.width / 2 };
}

const dedo = (cdp: CDPSession, tipo: 'touchStart' | 'touchMove', x: number, y: number) =>
  cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: [{ x, y, id: 1 }] });
const levantar = (cdp: CDPSession) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const grau = (j: { x: number; y: number; R: number }, r: number, graus: number) => ({
  x: j.x + j.R * r * Math.cos((graus * Math.PI) / 180),
  y: j.y - j.R * r * Math.sin((graus * Math.PI) / 180),
});

for (const tela of TELAS) {
  test.describe(`joystick com toques reais em ${tela.nome}`, () => {
    test('empurrar para a direita com 30° de deriva para cima: o lutador só ANDA (nunca pula) durante 90 ticks reais', async ({ page }) => {
      const { cdp, erros } = await abrir(page, tela);
      await entrarNaLuta(page);
      const j = await joystick(page);
      const p = grau(j, 0.8, 30);
      await dedo(cdp, 'touchStart', p.x, p.y);
      expect(await p1(page)).toMatchObject({ right: true, up: false, down: false });
      const estados = new Set<string>();
      let subiu = false;
      for (let i = 0; i < 90; i++) {
        // o polegar treme de verdade: ±3° e ±6% de pressão a cada tick, sempre dentro da zona horizontal
        const t = grau(j, 0.75 + 0.06 * Math.sin(i), 30 + 3 * Math.sin(i * 1.7));
        await dedo(cdp, 'touchMove', t.x, t.y);
        await hook(page, '(h) => h.avancar(1)');
        estados.add(await hook(page, '(h) => h.mundo().game.p1.state'));
        if ((await p1(page)).up) subiu = true;
      }
      console.log(`[${tela.nome}] 30° de deriva, 90 ticks: estados do lutador = ${[...estados].join(',')}; \`up\` chegou ao motor: ${subiu}`);
      expect(subiu).toBe(false);
      for (const proibido of ['jump', 'prejump', 'crouch', 'dash']) expect(estados.has(proibido), proibido).toBe(false);
      await levantar(cdp);
      expect(erros).toEqual([]);
    });

    test('cima claro (75°) PULA e baixo claro (-75°) AGACHA: a intenção de verdade continua valendo', async ({ page }) => {
      const { cdp, erros } = await abrir(page, tela);
      await entrarNaLuta(page);
      const j = await joystick(page);
      const cima = grau(j, 0.8, 75);
      await dedo(cdp, 'touchStart', cima.x, cima.y);
      expect(await p1(page)).toMatchObject({ up: true, right: false, left: false });
      await levantar(cdp);
      await tick(page);
      const baixo = grau(j, 0.8, -75);
      await dedo(cdp, 'touchStart', baixo.x, baixo.y);
      expect(await p1(page)).toMatchObject({ down: true, up: false });
      await levantar(cdp);
      const diag = grau(j, 0.8, 45);
      await tick(page);
      await dedo(cdp, 'touchStart', diag.x, diag.y);
      expect(await p1(page)).toMatchObject({ up: true, right: true });
      await levantar(cdp);
      expect(erros).toEqual([]);
    });

    test('tremer na borda da zona (sair e voltar em 1 tick) não solta a direção: nenhum "soltou e apertou" chega ao motor', async ({ page }) => {
      const { cdp, erros } = await abrir(page, tela);
      await entrarNaLuta(page);
      const j = await joystick(page);
      const dentro = grau(j, 0.6, 0);
      const fora = grau(j, 0.05, 0); // quase no centro (abaixo dos 15% de saída)
      await dedo(cdp, 'touchStart', dentro.x, dentro.y);
      const lido: boolean[] = [];
      for (let i = 0; i < 20; i++) {
        const t = i % 3 === 1 ? fora : dentro; // treme: fora por 1 tick a cada 3
        await dedo(cdp, 'touchMove', t.x, t.y);
        lido.push((await p1(page)).right);
        await tick(page);
      }
      console.log(`[${tela.nome}] \`right\` por tick com tremor de 1 tick: ${lido.map((b) => (b ? '1' : '0')).join('')}`);
      expect(lido.every(Boolean)).toBe(true);
      await levantar(cdp);
      expect((await p1(page)).right, 'dedo levantado para na hora').toBe(false);
      expect(erros).toEqual([]);
    });

    test('U2: encostar e levantar o dedo na direção ANTES do tick ainda vale 1 tick', async ({ page }) => {
      const { cdp, erros } = await abrir(page, tela);
      await entrarNaLuta(page);
      const j = await joystick(page);
      const p = grau(j, 0.8, 0);
      await dedo(cdp, 'touchStart', p.x, p.y);
      await levantar(cdp); // dois eventos, nenhum tick entre eles (o jogo é `?manual=1`)
      expect((await p1(page)).right, 'o tick lê a direção').toBe(true);
      await tick(page);
      expect((await p1(page)).right, 'e some no seguinte').toBe(false);
      expect(erros).toEqual([]);
    });
  });
}
