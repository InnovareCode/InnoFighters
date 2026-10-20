/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';

/** Gancho de teste exposto só no servidor de desenvolvimento (main.ts). */
const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function esperarCena(page: Page, nome: string, timeout = 15_000): Promise<void> {
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

/** Deixa as configurações num estado rápido de testar: 1 round, CPU fácil. */
async function salvarConfig(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((e) => {
    if (!window.localStorage.getItem('inno-fighters-v1') && !window.localStorage.getItem('sakura-fighters-v4')) {
      window.localStorage.setItem('inno-fighters-v1', JSON.stringify({ v: 1, s: { music: 0.45, sfx: 0.8, rounds: 1, time: 99, diff: 0, shake: true, ...e }, hi: 0 }));
    }
  }, extra);
}

test.describe('jogo de ponta a ponta (semente fixa, teclado real)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');

  test('título -> menu -> seleção -> dificuldade -> VS -> luta contra a CPU -> KO -> resultado', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'fluxo completo só no desktop');
    test.setTimeout(150_000);
    const erros = coletarErros(page);
    await salvarConfig(page);
    await page.goto('/?seed=7');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await esperarCena(page, 'boot');

    // o áudio só nasce depois do primeiro gesto
    expect(await hook(page, '(h) => h.ui.c.audio.ctx === null')).toBe(true);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'intro');
    expect(await hook(page, '(h) => h.ui.c.audio.ctx !== null')).toBe(true);

    // a abertura pula com qualquer tecla (depois de 10 ticks)
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'title');
    await page.keyboard.press('Enter');
    await esperarCena(page, 'menu');

    // LUTA vs CPU é o 3º item
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await hook(page, '(h) => h.ui.scene.selecionado')).toBe(2);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'select');

    await page.keyboard.press('Enter'); // HAYATO
    await page.keyboard.press('Enter'); // adversário sugerido: WEI LONG
    await esperarCena(page, 'diff');
    await page.keyboard.press('Enter'); // dificuldade padrão (FÁCIL)
    await esperarCena(page, 'vs');
    await page.waitForTimeout(700);
    await page.keyboard.press('Enter'); // pula o confronto
    await esperarCena(page, 'fight');

    const cfg = await hook(page, '(h) => { const g = h.mundo().game; return { c1: g.p1.id, c2: g.p2.id, cpu: g.p2.cpu, mode: g.mode, stage: g.stage }; }');
    expect(cfg).toEqual({ c1: 'hayato', c2: 'wei-long', cpu: 0, mode: 'cpu', stage: 'cn' });
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 15_000 });

    // andar de verdade: segurar a seta para a direita move o P1 (entrada real, sem atalho)
    const x0 = await hook(page, '(h) => h.mundo().game.p1.x');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    expect(await hook(page, '(h) => h.mundo().game.p1.x')).toBeGreaterThan(x0 + 5);

    // a CPU está fraca e o jogador colado nela (afordâncias de teste: não dependem da velocidade da máquina);
    // os golpes que a derrubam são teclas de verdade
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 4; g.p2.hpShown = 4; g.p1.x = g.p2.x - 80; }');
    const inicio = Date.now();
    while (Date.now() - inicio < 60_000) {
      const s = await hook(page, '(h) => ({ fase: h.mundo().game.phase, nome: h.ui.name })');
      if (s.nome !== 'fight' || s.fase !== 'fight') break;
      await page.keyboard.press('z');
      await page.waitForTimeout(60);
    }

    // K.O. -> fim da luta -> tela de resultado
    const fases = await hook(page, '(h) => h.mundo().game.phase');
    expect(['ko', 'matchend', 'roundend']).toContain(fases);
    await esperarCena(page, 'result', 30_000);
    const res = await hook(page, '(h) => { const g = h.mundo().game; return { vencedor: g.matchWinner, hp2: g.p2.hp, hp1: g.p1.hp, t: g.timeLeft, rounds: [g.p1.wins, g.p2.wins] }; }');
    expect(res, JSON.stringify(res)).toMatchObject({ vencedor: 0, hp2: 0 });

    // o resultado desenhou de verdade (o canvas não está vazio) e o menu responde
    const pintado = await page.locator('canvas#jogo').evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let cores = new Set<number>();
      for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
      return cores.size;
    });
    expect(pintado).toBeGreaterThan(200);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('z'); // MENU PRINCIPAL (Enter seria a revanche imediata)
    await esperarCena(page, 'menu');

    expect(erros).toEqual([]);
  });

  test('pausa: ESC pausa, congela a luta e o menu continua/sai', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    test.setTimeout(90_000);
    const erros = coletarErros(page);
    await salvarConfig(page);
    await page.goto('/?seed=3');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    // atalho: vai direto para a luta pelo gancho (o fluxo por teclas já é coberto acima)
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'caio', c2: 'min-ji', cpu: null } }); }");
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 15_000 });

    await page.keyboard.press('Escape');
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(true);
    const t1 = await hook(page, '(h) => h.mundo().game.tick');
    await page.waitForTimeout(400);
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBe(t1); // congelada

    await page.keyboard.press('Escape'); // continuar
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(false);
    await page.waitForTimeout(300);
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBeGreaterThan(t1);

    // perder o foco da janela também pausa
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(true);

    // MENU PRINCIPAL -> confirmação -> SIM, SAIR
    await page.keyboard.press('ArrowUp'); // volta ao último item (MENU PRINCIPAL)
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp'); // SIM, SAIR
    await page.keyboard.press('Enter');
    await esperarCena(page, 'menu');
    expect(erros).toEqual([]);
  });

  test('configurações: migra a chave antiga, grava a nova e o recorde aparece', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('inno-fighters-v1')) {
        window.localStorage.setItem('sakura-fighters-v4', JSON.stringify({ s: { rounds: 3, time: 60, diff: 2, shake: false, music: 0.2, sfx: 0.3 }, hi: 4321 }));
      }
    });
    await page.goto('/?seed=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const r = await page.evaluate(() => ({
      nova: JSON.parse(window.localStorage.getItem('inno-fighters-v1') ?? 'null'),
      antiga: window.localStorage.getItem('sakura-fighters-v4'),
      hi: (window as any).__inno.persist.hi,
      rounds: (window as any).__inno.persist.settings.rounds,
    }));
    expect(r.antiga).toBeNull();
    expect(r.nova).toMatchObject({ v: 1, hi: 4321, s: { rounds: 3, time: 60, diff: 2, shake: false } });
    expect(r.hi).toBe(4321);
    expect(r.rounds).toBe(3);
    expect(erros).toEqual([]);
  });

  test('ARCADE: vence as 3 lutas -> final com recorde gravado', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    test.setTimeout(180_000);
    const erros = coletarErros(page);
    await salvarConfig(page);
    await page.goto('/?seed=11');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('diff', { mode: 'arcade', c1: 'min-ji', c2: 'hayato' }); }");
    await page.keyboard.press('Enter'); // FÁCIL
    await esperarCena(page, 'vs');
    const ordem = await hook(page, '(h) => h.ui.run.order');
    expect([...ordem].sort()).toEqual(['caio', 'hayato', 'wei-long']);

    for (let luta = 0; luta < 3; luta++) {
      await page.waitForTimeout(700);
      await page.keyboard.press('Enter');
      await esperarCena(page, 'fight');
      await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 15_000 });
      // o rival já está no chão do ringue: coloca o jogador colado e derruba com golpes reais
      await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 3; g.p2.hpShown = 3; g.p1.x = g.p2.x - 80; }');
      for (let i = 0; i < 80; i++) {
        const fase = await hook(page, '(h) => h.mundo().game.phase');
        if (fase !== 'fight') break;
        await page.keyboard.press('z');
        await page.waitForTimeout(80);
      }
      await esperarCena(page, luta < 2 ? 'vs' : 'ending', 40_000);
    }
    const fim = await hook(page, '(h) => ({ score: h.ui.scene.run.score, hi: h.persist.hi, salvo: JSON.parse(localStorage.getItem("inno-fighters-v1")).hi })');
    expect(fim.score).toBeGreaterThan(0);
    expect(fim.hi).toBe(fim.score);
    expect(fim.salvo).toBe(fim.score);
    await page.waitForTimeout(1200); // o "ENTER — voltar ao título" só vale depois de 60 ticks
    await page.keyboard.press('Enter');
    await esperarCena(page, 'title');
    expect(erros).toEqual([]);
  });

  test('CONTINUE: créditos, GAME OVER e recorde', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    test.setTimeout(60_000);
    const erros = coletarErros(page);
    await salvarConfig(page);
    await page.goto('/?seed=5&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const r = await hook(
      page,
      `(h) => {
        h.ui.fade = 0; h.ui.fadeDir = 0;
        const run = { c1: 'caio', order: ['hayato', 'wei-long', 'min-ji'], idx: 1, score: 5000, continues: 1, diff: 0, cont: 0 };
        h.ui.set('continue', { run, a: { cfg: { mode: 'arcade', c1: 'caio', c2: 'wei-long', cpu: 0 }, run } });
        const c = h.ui.scene;
        h.avancar(120);
        const aposDoisSegundos = c.left;                 // 600 - 120
        h.ui.key('z');                                 // usa o único crédito
        const gasto = { continues: run.continues, cont: run.cont, indo: h.ui.fadeTo };
        h.ui.fadeTo = null; h.ui.fadeDir = 0;
        h.ui.set('continue', { run, a: { cfg: { mode: 'arcade', c1: 'caio', c2: 'wei-long', cpu: 0 }, run } });
        h.avancar(1);                                    // sem créditos -> GAME OVER
        return { aposDoisSegundos, gasto, over: c.over, hi: h.persist.hi, salvo: JSON.parse(localStorage.getItem('inno-fighters-v1')).hi };
      }`,
    );
    expect(r.aposDoisSegundos).toBe(480);
    expect(r.gasto).toEqual({ continues: 0, cont: 1, indo: 'vs' });
    expect(r.over).toBe(true);
    expect(r.hi).toBe(5000);
    expect(r.salvo).toBe(5000);
    expect(erros).toEqual([]);
  });

  test('celular: toques na tela avançam abertura, título e menu; o botão II pausa a luta', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    test.setTimeout(90_000);
    const erros = coletarErros(page);
    await salvarConfig(page);
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto('/?seed=9');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const cdp = await page.context().newCDPSession(page);
    const tocar = async (x: number, y: number): Promise<void> => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    // ponto lógico (960x540) -> pixel da janela
    const noCanvas = async (lx: number, ly: number): Promise<[number, number]> => {
      const b = (await page.locator('canvas#jogo').boundingBox())!;
      return [b.x + (lx / 960) * b.width, b.y + (ly / 540) * b.height];
    };
    await tocar(...(await noCanvas(480, 270)));
    await esperarCena(page, 'intro');
    expect(await hook(page, '(h) => document.body.classList.contains("touch")')).toBe(true);
    await page.waitForTimeout(400);
    await tocar(...(await noCanvas(480, 270)));
    await esperarCena(page, 'title');
    await tocar(...(await noCanvas(480, 270)));
    await esperarCena(page, 'menu');
    // os retângulos clicáveis só existem depois do 1º desenho do menu
    await page.waitForFunction(() => ((window as any).__inno.ui.scene.m?.rects?.length ?? 0) > 0);
    await tocar(...(await noCanvas(200, 100 + 54 * 3 + 20))); // 4º item: TREINAMENTO
    await esperarCena(page, 'select');
    expect(await hook(page, '(h) => h.ui.scene.mode')).toBe('training');

    // luta: o botão II da tela de toque pausa
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null } }); }");
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 15_000 });
    const bp = (await page.locator('#bp').boundingBox())!;
    await tocar(bp.x + bp.width / 2, bp.y + bp.height / 2);
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(true);
    expect(erros).toEqual([]);
  });

  test('a semente fixa reproduz a mesma luta (lógica determinística)', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    test.setTimeout(90_000);
    const rodar = async (): Promise<unknown> => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto('/?seed=42&manual=1');
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
      const r = await hook(
        page,
        `(h) => {
          h.ui.fade = 0; h.ui.fadeDir = 0;
          h.ui.set('fight', { cfg: { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2, p1cpu: 1 } });
          h.avancar(900);
          const g = h.mundo().game;
          return { fase: g.phase, hp: [g.p1.hp, g.p2.hp], x: [g.p1.x, g.p2.x], score: [g.p1.score, g.p2.score], tick: g.tick, round: g.round };
        }`,
      );
      await ctx.close();
      return r;
    };
    const a = await rodar();
    const b = await rodar();
    expect(a).toEqual(b);
    expect((a as any).tick).toBeGreaterThan(500);
  });
});
