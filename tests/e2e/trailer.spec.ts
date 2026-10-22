/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';

/*
 * Trailer de abertura (docs/spec-trailer-abertura.md §8, critérios 11 a 19): o fluxo boot -> trailer -> título, pular sem vazar a tecla, ENTER no c25, modo atrair,
 * versão estática (movimento reduzido), toque, tempo até o 1º quadro, determinismo de pixel, isolamento dos sorteios da sessão e a memória. O oráculo de pixel da
 * abertura de hoje (critério 18) é o `fidelidade-ui.spec.ts` (`?expansao=4`, que não tem trailer).
 */

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const diag = (page: Page): Promise<any> => hook(page, '(h) => h.ui.cenas.trailer.diagnostico()');

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

async function abrir(page: Page, query = ''): Promise<void> {
  await page.goto(`/?seed=7${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await esperarCena(page, 'boot');
}

/** O pedaço lazy do trailer já chegou? (o boot só abre o trailer com ele; senão vai à abertura de hoje) */
async function esperarOPedaco(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.carregado === true, undefined, { timeout: 30_000 });
}

/**
 * Anda o trailer em modo manual (`?manual=1`) até o tick `alvo`, esperando a arte no limite de cada plano (em manual os ticks correm mais rápido que a rede: sem a espera,
 * os planos de luta viram cartão de reserva). Devolve o diagnóstico final.
 */
async function irAteTick(page: Page, alvo: number): Promise<any> {
  for (let guarda = 0; guarda < 4000; guarda++) {
    const d = await diag(page);
    if (d.tick >= alvo) return d;
    const prox = d.proximoPlano;
    if (prox && prox.emTicks <= 1 && !prox.artePronta) {
      await page.waitForTimeout(100);
      continue;
    }
    const passo = Math.max(1, Math.min(alvo - d.tick, prox ? Math.max(1, prox.emTicks - (prox.artePronta ? 0 : 1)) : alvo - d.tick, 48));
    await hook(page, `(h) => h.avancar(${passo})`);
  }
  throw new Error(`o trailer não chegou ao tick ${alvo}`);
}

test.describe('trailer de abertura', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');

  test('o fluxo inteiro: boot -> gesto -> trailer (40 s, música, sem reserva, memória <= 270 MB, <= 2 atlas não fixos) -> título com fromTrailer', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'o fluxo de 40 s roda só no desktop');
    test.setTimeout(120_000);
    const erros = coletarErros(page);
    await abrir(page);
    await esperarOPedaco(page);
    expect(await hook(page, '(h) => h.ui.c.audio.ctx === null')).toBe(true); // o áudio só nasce depois do gesto
    await page.keyboard.press('Enter');
    await esperarCena(page, 'trailer');
    expect(await hook(page, '(h) => document.body.classList.contains("em-trailer")')).toBe(true);
    const planos = new Set<string>();
    let maxMB = 0;
    let maxNaoFixos = 0;
    let tocou = false;
    let reserva = false;
    let ultimoTick = 0;
    const t0 = Date.now();
    for (let i = 0; i < 110; i++) {
      const d = await diag(page);
      if (!d) break;
      planos.add(d.plano);
      maxMB = Math.max(maxMB, d.memoriaDecodificadaMB);
      maxNaoFixos = Math.max(maxNaoFixos, d.residentes.length);
      expect(d.residentes.includes('baatar') && d.residentes.includes('zenon'), `BAATAR e ZENON juntos no tick ${d.tick}`).toBe(false);
      tocou ||= d.musica === 'tocando';
      reserva ||= d.planosEmReserva.length > 0;
      ultimoTick = Math.max(ultimoTick, d.tick);
      if ((await hook(page, '(h) => h.ui.name')) !== 'trailer') break;
      await page.waitForTimeout(350);
    }
    await esperarCena(page, 'title', 15_000);
    const duracao = (Date.now() - t0) / 1000;
    expect(duracao, 'duração em tempo real (40 s)').toBeGreaterThan(38);
    expect(duracao).toBeLessThan(46);
    expect([...planos]).toEqual(expect.arrayContaining(['P0', 'P1', 'C1', 'P2', 'C2', 'P3', 'P4', 'C3', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10']));
    expect(ultimoTick).toBeGreaterThan(2300);
    expect(reserva, 'nenhum plano virou cartão de reserva').toBe(false);
    expect(tocou, 'a música tocou').toBe(true);
    expect(maxNaoFixos).toBeLessThanOrEqual(2);
    expect(maxMB, 'memória decodificada (aprox.) dos atlas e cenários').toBeLessThanOrEqual(270);
    // o título nasce em t = 120 (fromTrailer) e o trailer soltou tudo o que carregou
    expect(await hook(page, '(h) => h.ui.scene.t')).toBeGreaterThanOrEqual(120);
    expect(await hook(page, '(h) => document.body.classList.contains("em-trailer")')).toBe(false);
    const residentes = await hook(page, '(h) => h.mundo().arte.lutadoresResidentes()');
    expect([...residentes].sort()).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']);
    expect(await hook(page, '(h) => h.ui.c.audio.posicaoDaAbertura()')).toBeNull(); // a música da abertura parou
    expect(erros).toEqual([]);
  });

  test('pular: qualquer tecla (menos F e M) a partir do tick 10 vai ao título com fade e a tecla NÃO vaza para o menu', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    test.setTimeout(60_000);
    const erros = coletarErros(page);
    await abrir(page);
    await esperarOPedaco(page);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'trailer');
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.diagnostico().tCena > 40);
    // F e M não pulam (o main trata antes: tela cheia e mudo)
    await page.keyboard.press('m');
    expect(await hook(page, '(h) => h.ui.name')).toBe('trailer');
    await page.keyboard.press('x');
    const antes = Date.now();
    await esperarCena(page, 'title', 3_000);
    expect(Date.now() - antes, 'até o título com o fade de sempre').toBeLessThan(1_500);
    expect(await hook(page, '(h) => h.ui.scene.t')).toBeGreaterThanOrEqual(120);
    // a mesma tecla não abriu o menu
    await page.waitForTimeout(1_200);
    expect(await hook(page, '(h) => h.ui.name')).toBe('title');
    expect(await hook(page, '(h) => h.ui.c.audio.posicaoDaAbertura()')).toBeNull();
    expect(await hook(page, '(h) => document.body.classList.contains("em-trailer")')).toBe(false);
    expect(erros).toEqual([]);
  });

  test('antes do tick 10 a tecla é engolida (a que abriu o trailer e a repetição dela não o pulam) e não vaza para ninguém', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    await abrir(page, '&manual=1');
    await esperarOPedaco(page);
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true);
    await hook(page, '(h) => h.avancar(5)');
    await page.keyboard.press('x');
    await page.keyboard.press('Enter');
    await hook(page, '(h) => h.avancar(30)');
    expect(await hook(page, '(h) => [h.ui.name, h.ui.fadeTo]')).toEqual(['trailer', null]);
    // depois do tick 10 a mesma tecla pula
    await page.keyboard.press('x');
    await hook(page, '(h) => h.avancar(30)');
    expect(await hook(page, '(h) => h.ui.name')).toBe('title');
    expect(await hook(page, '(h) => h.ui.scene.t')).toBeGreaterThanOrEqual(120);
  });

  test('?trailer=0 (desenvolvimento) liga a abertura de hoje: boot -> intro', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    await abrir(page, '&trailer=0');
    await page.waitForTimeout(800);
    expect(await hook(page, '(h) => h.ui.cenas.trailer.carregado')).toBe(false);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'intro');
  });

  test('no c25 ("PRESSIONE ENTER" já na tela) a tecla age como no título: vai direto ao menu', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    test.setTimeout(90_000);
    // a prévia de desenvolvimento (?trailer=P10) abre no começo do plano da logo
    await abrir(page, '&manual=1&trailer=P10');
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });
    await hook(page, '(h) => h.avancar(40)');
    expect((await diag(page)).tick).toBe(2208 + 40);
    // antes do c25 não há prompt: a tecla pula para o título (testado no teste de pular); aqui anda até o c25.1 (tick 2304)
    await hook(page, '(h) => h.avancar(70)');
    expect((await diag(page)).tick).toBeGreaterThan(2304);
    expect(await hook(page, '(h) => h.ui.name')).toBe('trailer');
    await page.keyboard.press('Enter');
    await hook(page, '(h) => h.avancar(30)'); // o fade de saída anda por ticks (manual)
    expect(await hook(page, '(h) => h.ui.name')).toBe('menu');
  });

  test('modo atrair: 30 s parado no título abrem o trailer (origem atrair); tecla e mouse zeram o contador', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    test.setTimeout(60_000);
    await abrir(page, '&manual=1');
    await esperarOPedaco(page);
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('title'); }");
    await hook(page, '(h) => h.avancar(1700)');
    await page.mouse.move(100, 100); // o mouse zera
    await page.mouse.move(300, 300);
    await hook(page, '(h) => h.avancar(1700)');
    expect(await hook(page, '(h) => h.ui.fadeTo')).toBeNull();
    await hook(page, '(h) => h.avancar(120)');
    await esperarCena(page, 'trailer', 5_000);
    const d = await diag(page);
    expect(d.origem).toBe('atrair');
    expect(d.estatico).toBe(false);
    // sem gesto o áudio nunca nasceu: o atrair roda mudo e sem erro
    expect(d.musica).toBe('pendente');
  });

  test('movimento reduzido: versão estática de <= 10 s, sem aproximação, tremor nem flash, e termina no título', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    test.setTimeout(60_000);
    const erros = coletarErros(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page);
    await esperarOPedaco(page);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'trailer');
    const d0 = await diag(page);
    expect(d0.estatico).toBe(true);
    expect(await hook(page, '(h) => h.ui.cenas.trailer.diagnostico().jogosVivos')).toBe(0);
    const t0 = Date.now();
    let maxTick = 0;
    let salto = 0;
    let anterior = -1;
    for (let i = 0; i < 40; i++) {
      // luminância média do quadro (o canvas reduzido a 96x54): nenhum salto > 10% entre amostras de 100 ms, exceto a dissolução
      const lum = await page.evaluate(() => {
        const c = document.getElementById('jogo') as HTMLCanvasElement;
        const p = document.createElement('canvas');
        p.width = 96;
        p.height = 54;
        const x = p.getContext('2d')!;
        x.drawImage(c, 0, 0, 96, 54);
        const d = x.getImageData(0, 0, 96, 54).data;
        let s = 0;
        for (let k = 0; k < d.length; k += 4) s += 0.2126 * d[k]! + 0.7152 * d[k + 1]! + 0.0722 * d[k + 2]!;
        return s / (96 * 54) / 255;
      });
      if (anterior >= 0) salto = Math.max(salto, Math.abs(lum - anterior));
      anterior = lum;
      const d = await diag(page);
      if (d) maxTick = Math.max(maxTick, d.tick);
      if ((await hook(page, '(h) => h.ui.name')) !== 'trailer') break;
      await page.waitForTimeout(100);
    }
    await esperarCena(page, 'title', 10_000);
    expect((Date.now() - t0) / 1000).toBeLessThanOrEqual(11);
    expect(maxTick).toBeLessThanOrEqual(576);
    expect(salto, 'maior salto de luminância entre quadros vizinhos').toBeLessThan(0.1 + 0.25); // a dissolução de 18 ticks cabe em passos de 100 ms
    expect(erros).toEqual([]);
  });

  test('celular: o toque na tela pula o trailer e os controles de toque ficam escondidos durante ele', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    test.setTimeout(60_000);
    const erros = coletarErros(page);
    await page.setViewportSize({ width: 915, height: 412 });
    await abrir(page);
    await esperarOPedaco(page);
    const cdp = await page.context().newCDPSession(page);
    const tocar = async (x: number, y: number): Promise<void> => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const noCanvas = async (lx: number, ly: number): Promise<[number, number]> => {
      const b = (await page.locator('canvas#jogo').boundingBox())!;
      return [b.x + (lx / 960) * b.width, b.y + (ly / 540) * b.height];
    };
    await tocar(...(await noCanvas(480, 270)));
    await esperarCena(page, 'trailer');
    expect(await hook(page, '(h) => document.body.classList.contains("touch")')).toBe(true);
    for (const seletor of ['#joy', '#r1', '#bp']) {
      expect(await page.locator(seletor).evaluate((el) => getComputedStyle(el).visibility), seletor).toBe('hidden');
    }
    await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.diagnostico().tCena > 40);
    await tocar(...(await noCanvas(480, 270)));
    await esperarCena(page, 'title', 5_000);
    await page.waitForTimeout(800);
    expect(await hook(page, '(h) => h.ui.name')).toBe('title');
    for (const seletor of ['#joy', '#r1']) expect(await page.locator(seletor).evaluate((el) => getComputedStyle(el).visibility), seletor).toBe('visible');
    expect(erros).toEqual([]);
  });

  test('tempo do gesto até o 1º quadro do trailer: <= 50 ms no desktop e <= 150 ms com CPU 4x', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    test.setTimeout(90_000);
    const medir = async (taxa: number): Promise<number> => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await abrir(page);
      await esperarOPedaco(page);
      if (taxa > 1) {
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: taxa });
      }
      await page.keyboard.press('Enter');
      await esperarCena(page, 'trailer');
      await page.waitForFunction(() => performance.getEntriesByName('trailer:quadro1').length > 0, undefined, { timeout: 10_000 });
      const ms = await page.evaluate(() => performance.getEntriesByName('trailer:1o-quadro')[0]?.duration ?? -1);
      await ctx.close();
      return ms;
    };
    const desktop = await medir(1);
    const lento = await medir(4);
    console.log(`1º quadro: desktop ${desktop.toFixed(1)} ms, CPU 4x ${lento.toFixed(1)} ms`);
    expect(desktop).toBeGreaterThan(0);
    expect(desktop).toBeLessThanOrEqual(50);
    expect(lento).toBeLessThanOrEqual(150);
  });

  test('determinismo: o mesmo tick desenhado em duas visitas dá 0 pixel de diferença (ticks 300, 1200 e 2300)', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    test.setTimeout(150_000);
    const rodar = async (): Promise<Record<number, string>> => {
      const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
      const page = await ctx.newPage();
      await page.goto('/?seed=5&manual=1');
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
      await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
      await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });
      const quadros: Record<number, string> = {};
      for (const alvo of [300, 1200, 2300]) {
        const d = await irAteTick(page, alvo);
        expect(d.planosEmReserva, `reservas até o tick ${alvo}`).toEqual([]);
        quadros[alvo] = await hook(page, "(h) => { h.desenhar(); return document.getElementById('jogo').toDataURL('image/png'); }");
      }
      await ctx.close();
      return quadros;
    };
    const a = await rodar();
    const b = await rodar();
    for (const t of [300, 1200, 2300]) expect(a[t] === b[t], `tick ${t}: os pixels diferem entre as visitas`).toBe(true);
    expect(a[300]).not.toBe(a[1200]);
  });

  test('isolamento: o trailer não consome nenhum sorteio da sessão (rngVisual, rngUI, sorteios +4/+5) nem mexe no mundo.game', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop');
    test.setTimeout(90_000);
    const estados = async (cena: 'title' | 'trailer'): Promise<unknown> => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto('/?seed=9&manual=1');
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
      await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('title'); }");
      const antes = await hook(page, '(h) => JSON.stringify(h.mundo().game.fighters.map((f) => [f.x, f.y, f.hp]))');
      await hook(page, `(h) => { h.ui.set('${cena}', { origem: 'atrair' }); }`);
      if (cena === 'trailer') {
        await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });
        await irAteTick(page, 500);
      } else await hook(page, '(h) => h.avancar(500)');
      const r = await hook(
        page,
        `(h) => ({ visual: h.ui.c.rngVisual.estado(), ui: h.ui.c.rngUI.estado(), selecao: h.ui.c.sorteioDaSelecao.estado(), falas: h.ui.c.sorteioDeFalas.estado(), mundo: JSON.stringify(h.mundo().game.fighters.map((f) => [f.x, f.y, f.hp])), tickMundo: h.mundo().game.tick })`,
      );
      await ctx.close();
      return { ...r, antes };
    };
    // controle: a mesma quantidade de updates numa cena que não sorteia (o Navegador anda as pétalas dos menus no mesmo ritmo em qualquer cena)
    const controle: any = await estados('title');
    const trailer: any = await estados('trailer');
    expect(trailer.visual).toBe(controle.visual);
    expect(trailer.ui).toBe(controle.ui);
    expect(trailer.selecao).toBe(controle.selecao);
    expect(trailer.falas).toBe(controle.falas);
    expect(trailer.mundo).toBe(trailer.antes);
    expect(trailer.tickMundo).toBe(controle.tickMundo);
  });
});
