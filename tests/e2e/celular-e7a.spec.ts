/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { CHEFE } from './_chefe';

/*
 * E7a (celular): (1) o especial SEGURADO (spSeg) vem do toque e do controle, não só do teclado: o MASHI do AMINU carrega do
 * mesmo jeito nas três entradas; (2) legibilidade do HUD no celular deitado (tamanho real em px CSS); (4) aviso "vire o aparelho" e
 * layout em retrato. Só no projeto "celular" (toque + viewport de telefone emulados no Chromium).
 */

test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page, viewport: { width: number; height: number }, query = ''): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(`/?seed=3&manual=1&expansao=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  // L2: o especial abriria a cinemática (48 ticks de cena parada) no meio da contagem tick a tick do MASHI; aqui ela fica desligada.
  // A comparação teclado x toque x controle continua exatamente a mesma (níveis e ticks da carga).
  await page.evaluate(() => {
    (window as any).__inno.persist.settings.cinematica = 'desligada';
  });
}

async function abrirLuta(page: Page, cfg: Record<string, unknown>): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify(cfg)} }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 200; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
}

const centro = async (page: Page, seletor: string) => {
  const b = await page.locator(seletor).boundingBox();
  if (!b) throw new Error(`${seletor} sem caixa`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** Controle falso: `navigator.getGamepads` devolve o que `window.__pad` manda (botões apertados por índice). */
async function instalarControle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__pad = { ligado: false, botoes: [] as number[] };
    navigator.getGamepads = () =>
      [
        (window as any).__pad.ligado
          ? { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (window as any).__pad.botoes.includes(i) })) }
          : null,
      ] as unknown as (Gamepad | null)[];
  });
}

type Entrada = 'teclado' | 'toque' | 'controle';
const TICKS_SEGURANDO = 100; // passa dos 90 do `carga.max`: o MASHI auto-solta no máximo
const TICKS_DEPOIS = 40;

/**
 * Luta de treino AMINU x HAYATO (o HAYATO parado, longe): aperta o ESPECIAL pela `entrada` no 1º tick, segura `segura` ticks e solta.
 * Devolve, tick a tick, o que o motor fez: [estado, mt, carga, nivelCarga].
 */
async function tracaDoMashi(page: Page, cdp: CDPSession, entrada: Entrada, segura: number, extra?: (tick: number) => Promise<void>): Promise<number[][]> {
  await abrirLuta(page, { mode: 'training', c1: 'aminu', c2: 'hayato', cpu: null });
  await hook(page, '(h) => { const g = h.mundo().game; g.p1.x = 200; g.p2.x = 800; g.p1.en = g.p1.maxEn ?? 100; }');
  const r1 = await centro(page, '#r1');
  const apertar = async (): Promise<void> => {
    if (entrada === 'teclado') await page.keyboard.down('b');
    else if (entrada === 'toque') await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r1.x, y: r1.y, id: 1 }] });
    else await page.evaluate(() => Object.assign((window as any).__pad, { ligado: true, botoes: [5] }));
  };
  const soltar = async (): Promise<void> => {
    if (entrada === 'teclado') await page.keyboard.up('b');
    else if (entrada === 'toque') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.evaluate(() => Object.assign((window as any).__pad, { botoes: [] }));
  };
  const um = (): Promise<number[]> =>
    hook(
      page,
      `(h) => { h.entrada.consultarGamepads(); h.avancar(1); const f = h.mundo().game.p1; return [f.state === 'move' ? 1 : 0, f.mt, f.carga, f.nivelCarga]; }`,
    );
  const traco: number[][] = [];
  await apertar();
  for (let t = 0; t < segura; t++) {
    if (extra) await extra(t);
    traco.push(await um());
  }
  await soltar();
  for (let t = 0; t < TICKS_DEPOIS; t++) traco.push(await um());
  return traco;
}

test.describe('especial segurado (spSeg) fora do teclado: o MASHI do AMINU carrega por toque e por controle', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'só no celular (toque emulado)'));

  for (const segura of [TICKS_SEGURANDO, 40]) {
    test(`ESP segurado por ${segura} ticks: toque e controle produzem o mesmo MASHI do teclado, tick a tick`, async ({ page }) => {
      const erros = coletarErros(page);
      await instalarControle(page);
      await abrir(page, { width: 915, height: 412 });
      const cdp = await page.context().newCDPSession(page);
      const teclado = await tracaDoMashi(page, cdp, 'teclado', segura);
      // o teclado de fato carrega (senão a comparação seria vazia): chega ao nível 3 quando passa de 70 ticks, ao 2 quando passa de 30
      const nivelMax = Math.max(...teclado.map((l) => l[3] as number));
      expect(nivelMax).toBe(segura >= 90 ? 3 : 2);
      expect(Math.max(...teclado.map((l) => l[2] as number))).toBeGreaterThanOrEqual(segura >= 90 ? 70 : 30);
      const toque = await tracaDoMashi(page, cdp, 'toque', segura);
      const controle = await tracaDoMashi(page, cdp, 'controle', segura);
      expect(toque).toEqual(teclado);
      expect(controle).toEqual(teclado);
      expect(erros).toEqual([]);
    });
  }

  test('controle negativo: um toque curto no ESP não carrega (a carga é do segurar, não de apertar)', async ({ page }) => {
    await abrir(page, { width: 915, height: 412 });
    const cdp = await page.context().newCDPSession(page);
    const curto = await tracaDoMashi(page, cdp, 'toque', 1);
    expect(Math.max(...curto.map((l) => l[2] as number))).toBeLessThanOrEqual(2); // 1 tick de aperto = no máximo 1 a 2 ticks de carga
    expect(Math.max(...curto.map((l) => l[3] as number))).toBeLessThanOrEqual(1);
  });

  test('segurando o ESP, os outros botões e o joystick continuam funcionando e a carga não para', async ({ page }) => {
    await abrir(page, { width: 915, height: 412 });
    const cdp = await page.context().newCDPSession(page);
    const lp = await centro(page, '#pad .lp');
    const joy = await centro(page, '#joy');
    const R = (await page.locator('#joy').boundingBox())!.width / 2;
    let lpVisto = false;
    let direitaVista = false;
    const base = await tracaDoMashi(page, cdp, 'toque', TICKS_SEGURANDO);
    const r1 = await centro(page, '#r1');
    const misto = await tracaDoMashi(page, cdp, 'toque', TICKS_SEGURANDO, async (t) => {
      if (t === 15) {
        // 2º e 3º dedos entram sem tirar o do ESP: LP (golpe, só borda) e o joystick para a direita
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [
            { x: r1.x, y: r1.y, id: 1 },
            { x: lp.x, y: lp.y, id: 2 },
            { x: joy.x, y: joy.y, id: 3 },
          ],
        });
        const q = await hook(page, '(h) => h.entrada.lerP1()');
        lpVisto = q.lp === true && q.spSeg === true;
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: r1.x, y: r1.y, id: 1 },
            { x: lp.x, y: lp.y, id: 2 },
            { x: joy.x + R * 0.7, y: joy.y, id: 3 },
          ],
        });
        const d = await hook(page, '(h) => h.entrada.lerP1()');
        direitaVista = d.right === true && d.spSeg === true;
      }
    });
    expect(lpVisto).toBe(true);
    expect(direitaVista).toBe(true);
    // a carga chegou ao nível 3 e ao máximo mesmo com os outros dedos (andar devagar é regra do MASHI: só o x muda, não a carga)
    expect(Math.max(...misto.map((l) => l[3] as number))).toBe(3);
    expect(Math.max(...misto.map((l) => l[2] as number))).toBe(Math.max(...base.map((l) => l[2] as number)));
  });
});

/** Instala o espião de `fillText` do canvas: com `window.__textos` em lista, cada texto desenhado entra com o tamanho em px CSS. */
async function instalarEspiaDeTextos(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__textos = null;
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: [number?]) {
      const lista = (window as any).__textos as Array<{ t: string; css: number }> | null;
      if (lista) {
        const px = parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '0');
        lista.push({ t: String(t), css: px * this.getTransform().a * (this.canvas.clientWidth / this.canvas.width) });
      }
      return o.call(this, t, x, y, ...(r as []));
    };
  });
}

/** Abre a luta `cfg` e mede os textos do HUD (px CSS), com `ficha` forçada no P1 se vier. */
async function medirTextos(page: Page, cfg: Record<string, unknown>, ficha?: string): Promise<Record<string, number>> {
  await abrirLuta(page, cfg);
  const lista: Array<{ t: string; css: number }> = await page.evaluate((f) => {
    const h = (window as any).__inno;
    if (f) h.mundo().game.p1.ficha = f;
    (window as any).__textos = [];
    h.desenhar();
    const r = (window as any).__textos;
    (window as any).__textos = null;
    return r;
  }, ficha);
  return Object.fromEntries(lista.map((x) => [x.t, +x.css.toFixed(2)]));
}

test.describe('legibilidade do HUD no celular deitado (tamanho real em px CSS)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'só no celular'));

  for (const tela of [
    { width: 915, height: 412 },
    { width: 844, height: 390 },
  ]) {
    test(`${tela.width}x${tela.height}: COM chefão de teste: etiqueta GAJA/SARPA, CHEFÃO e contador de barras com ~12 px CSS ou mais`, async ({ page }, info) => {
      const erros = coletarErros(page);
      await abrir(page, tela, `&${CHEFE.query}`);
      await instalarEspiaDeTextos(page);
      const cv = await page.locator('canvas#jogo').boundingBox();
      // o canvas 960x540 cabe na janela sem distorcer: escala CSS por px lógico
      const escala = cv!.width / 960;
      expect(escala).toBeCloseTo(Math.min(tela.width / 960, tela.height / 540), 1);

      const gaja = await medirTextos(page, { mode: 'arcade', c1: 'nila', c2: CHEFE.id, cpu: 0, chefe: true });
      const sarpa = await medirTextos(page, { mode: 'arcade', c1: 'nila', c2: CHEFE.id, cpu: 0, chefe: true }, 'sarpa');
      const comum = await medirTextos(page, { mode: 'arcade', c1: 'hayato', c2: 'caio', cpu: 0 });
      info.annotations.push({ type: 'medido', description: `${tela.width}x${tela.height} canvas ${cv!.width}x${cv!.height}: ${JSON.stringify({ gaja, sarpa, comum })}` });
      expect(gaja['GAJA']).toBeGreaterThanOrEqual(12);
      expect(sarpa['SARPA']).toBeGreaterThanOrEqual(12);
      expect(gaja['000000  CHEFÃO']).toBeGreaterThanOrEqual(12);
      expect(gaja['×2']).toBeGreaterThanOrEqual(12);
      expect(gaja[CHEFE.nome]).toBeGreaterThanOrEqual(12);
      // as linhas dos lutadores comuns seguem as do protótipo (14 lógicos): ficam abaixo de 12 de propósito (fidelidade pixel a pixel)
      expect(comum['1P  000000']).toBeCloseTo(14 * escala, 1);
      expect(erros).toEqual([]);
    });

    test(`${tela.width}x${tela.height}: PRODUÇÃO (BAATAR normal): etiqueta GAJA/SARPA legível e SEM a faixa CHEFÃO nem o contador ×2`, async ({ page }, info) => {
      const erros = coletarErros(page);
      await abrir(page, tela);
      await instalarEspiaDeTextos(page);
      const cv = await page.locator('canvas#jogo').boundingBox();
      const escala = cv!.width / 960;
      expect(escala).toBeCloseTo(Math.min(tela.width / 960, tela.height / 540), 1);

      // luta de produção: o BAATAR é lutador comum (1 barra), então não há faixa CHEFÃO nem contador de barras
      const gaja = await medirTextos(page, { mode: 'arcade', c1: 'nila', c2: 'baatar', cpu: 0 });
      const sarpa = await medirTextos(page, { mode: 'arcade', c1: 'nila', c2: 'baatar', cpu: 0 }, 'sarpa');
      const comum = await medirTextos(page, { mode: 'arcade', c1: 'hayato', c2: 'caio', cpu: 0 });
      info.annotations.push({ type: 'medido', description: `${tela.width}x${tela.height} canvas ${cv!.width}x${cv!.height}: ${JSON.stringify({ gaja, sarpa, comum })}` });
      expect(gaja['GAJA']).toBeGreaterThanOrEqual(12);
      expect(sarpa['SARPA']).toBeGreaterThanOrEqual(12);
      expect(gaja['BAATAR']).toBeGreaterThanOrEqual(12);
      expect(gaja['000000  CHEFÃO']).toBeUndefined();
      expect(gaja['×2']).toBeUndefined();
      expect(comum['1P  000000']).toBeCloseTo(14 * escala, 1);
      expect(erros).toEqual([]);
    });
  }
});

test.describe('aviso "vire o aparelho" e layout em retrato', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'só no celular'));

  for (const tela of [
    { width: 412, height: 915 },
    { width: 390, height: 844 },
  ]) {
    test(`retrato ${tela.width}x${tela.height}: aviso visível, canvas na largura, controles dentro da janela e fora do aviso; girar esconde o aviso`, async ({ page }) => {
      await abrir(page, tela);
      const caixa = async (s: string) => {
        const b = await page.locator(s).boundingBox();
        if (!b) throw new Error(`${s} sem caixa`);
        return b;
      };
      await expect(page.locator('#rot')).toBeVisible();
      await expect(page.locator('#rot')).toHaveText('Vire o aparelho para o modo paisagem');
      const rot = await caixa('#rot');
      const cv = await caixa('canvas#jogo');
      expect(cv.width).toBeLessThanOrEqual(tela.width);
      expect(cv.height / cv.width).toBeCloseTo(540 / 960, 1);
      for (const s of ['#joy', '#r1', '#pad .hp', '#pad .lp', '#pad .hk', '#pad .lk', '#bp']) {
        const b = await caixa(s);
        expect(b.x, s).toBeGreaterThanOrEqual(0);
        expect(b.y, s).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, s).toBeLessThanOrEqual(tela.width);
        expect(b.y + b.height, s).toBeLessThanOrEqual(tela.height);
        const sobrepoe = b.x < rot.x + rot.width && b.x + b.width > rot.x && b.y < rot.y + rot.height && b.y + b.height > rot.y;
        expect(sobrepoe, `${s} sobre o aviso`).toBe(false);
      }
      // o aviso não rouba toque (pointer-events: none): o mesmo ponto no centro do aviso cai no que está embaixo
      expect(await page.locator('#rot').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
      // girar o aparelho (viewport paisagem): o aviso some sem recarregar
      await page.setViewportSize({ width: tela.height, height: tela.width });
      await expect(page.locator('#rot')).toBeHidden();
      await expect(page.locator('#touch')).toBeVisible();
    });
  }
});
