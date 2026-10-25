/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { ateOControle, eventos, espiarMotor, hook, irAteALuta, prepararDuelo, teclas } from './_menu-real';

/*
 * Flash de dano limitado (Atlas, 2026-10-25): no jogo REAL (menu, teclado, padrão sem ?ritmo=) o defensor de um SUPER multi-acerto e do FILME do KO tem o flash branco no máximo a 0,15 (era 0,5
 * preso por dezenas de ticks: parecia um fantasma lavado); um acerto COMUM continua com os 0,5 do protótipo, antes e depois do super. Mede o alfa REAL com que a silhueta branca é desenhada
 * (o `drawImage` de um canvas pequeno, o recorte da silhueta, que não é a tela nem a página do atlas) em cada quadro. `LYRA_FLASH=<pasta>` grava capturas do mesmo quadro de super para ver a olho.
 */
test.describe.configure({ timeout: 240_000 });
const SO_DESKTOP = ({}, info: { project: { name: string } }): void => test.skip(info.project.name !== 'desktop', 'desktop');

/**
 * Instala o espião: o alfa de toda SILHUETA do flash desenhada enquanto `__on`. As silhuetas são marcadas na fonte (`arte.silhuetaDe` de cada lutador devolve o canvas e o espião o anota),
 * então canvas de outra coisa (cenário, HUD, painéis do filme) não entram na conta.
 */
const espiarSilhuetas = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const w = window as any;
    const h = w.__inno;
    const ctx = h.ui.c.ctx;
    const marcadas = new WeakSet<object>();
    for (const r of Object.values<any>(h.ui.m.elenco)) {
      const orig = r.arte.silhuetaDe.bind(r.arte);
      r.arte.silhuetaDe = (pd: any) => {
        const c = orig(pd);
        if (c) marcadas.add(c);
        return c;
      };
    }
    w.__alfas = [];
    w.__on = false;
    const o = ctx.drawImage.bind(ctx);
    ctx.drawImage = (src: any, ...a: any[]) => {
      if (w.__on && marcadas.has(src)) w.__alfas.push(+ctx.globalAlpha.toFixed(4));
      return o(src, ...a);
    };
  });

/** Avança 1 tick, desenha e devolve o maior alfa de silhueta daquele quadro (0 se nenhuma) com o flash do P2. */
const passo = (page: Page): Promise<{ alfa: number; flash: number; filme: boolean; tick: number }> =>
  hook(
    page,
    `(h) => { const w = window; h.avancar(1); w.__alfas = []; w.__on = true; h.desenhar(); w.__on = false; const g = h.mundo().game;
       return { alfa: w.__alfas.length ? Math.max(...w.__alfas) : 0, flash: g.p2.flash, filme: h.ui.scene.filme.ativo, tick: g.tick }; }`,
  );

async function apertarSuper(page: Page): Promise<void> {
  await teclas(page, 'keydown', 'x', 'v');
  await hook(page, '(h) => h.avancar(1)');
  await teclas(page, 'keyup', 'x', 'v');
}

test.describe('flash de dano: 0,5 do protótipo no acerto comum, no máximo 0,15 no super e no filme do KO', () => {
  test.beforeEach(SO_DESKTOP);

  test('acerto comum (0,5) -> super de 5 acertos (<= 0,15 enquanto preso) -> acerto comum de novo (0,5)', async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await irAteALuta(page);
    await ateOControle(page);
    await espiarMotor(page);
    await espiarSilhuetas(page);

    // 1) controle: um soco comum no P2 (o SOCO FORTE, `x`), flash em 8
    await prepararDuelo(page, { en: 0, dist: 60 });
    await teclas(page, 'keydown', 'x');
    await hook(page, '(h) => h.avancar(1)');
    await teclas(page, 'keyup', 'x');
    let picoComum = 0;
    for (let i = 0; i < 30; i++) {
      const p = await passo(page);
      if (p.flash >= 7) picoComum = Math.max(picoComum, p.alfa);
    }
    expect(picoComum, 'acerto comum: o flash do protótipo, 0,5').toBeCloseTo(0.5, 3);

    // 2) o super (barra cheia): todos os quadros com flash >= 7 no P2 saem com no máximo 0,15
    await hook(page, '(h) => { for (let i = 0; i < 90; i++) h.avancar(1); }'); // o combo do controle acaba
    await prepararDuelo(page, { en: 100, dist: 60 });
    await apertarSuper(page);
    const quadros: Array<{ alfa: number; flash: number }> = [];
    let capturado = false;
    for (let i = 0; i < 120; i++) {
      quadros.push(await passo(page));
      // conferência a olho: o 3º acerto do super (o defensor ainda em flash)
      if (process.env['LYRA_FLASH'] && !capturado && (await eventos(page, 'hit')).filter((e) => e.super).length >= 3) {
        capturado = true;
        const url: string = await hook(page, "(h) => { h.desenhar(); return document.getElementById('jogo').toDataURL('image/png'); }");
        mkdirSync(process.env['LYRA_FLASH'], { recursive: true });
        writeFileSync(`${process.env['LYRA_FLASH']}/super-3o-acerto.png`, Buffer.from(url.split(',')[1] as string, 'base64'));
      }
    }
    const supers = (await eventos(page, 'hit')).filter((e) => e.super);
    expect(supers.map((e) => e.acertos), 'o super de 5 acertos aconteceu').toEqual([1, 2, 3, 4, 5]);
    const comFlash = quadros.filter((q) => q.flash > 0);
    expect(comFlash.length, 'houve quadros com flash durante o super').toBeGreaterThan(20);
    expect(Math.max(...comFlash.map((q) => q.alfa)), 'super: o flash nunca passa de 0,15').toBeLessThanOrEqual(0.15 + 1e-6);
    expect(Math.max(...comFlash.map((q) => q.alfa)), 'e ainda aparece (não foi suprimido)').toBeGreaterThan(0.1);

    // 3) depois do super o limite acaba: um soco comum volta aos 0,5
    await prepararDuelo(page, { en: 0, dist: 60 });
    await hook(page, '(h) => { for (let i = 0; i < 80; i++) h.avancar(1); }'); // o P2 se levanta e o flash zera
    await prepararDuelo(page, { en: 0, dist: 60 });
    await teclas(page, 'keydown', 'x');
    await hook(page, '(h) => h.avancar(1)');
    await teclas(page, 'keyup', 'x');
    let picoDepois = 0;
    for (let i = 0; i < 30; i++) {
      const p = await passo(page);
      if (p.flash >= 7) picoDepois = Math.max(picoDepois, p.alfa);
    }
    expect(picoDepois, 'acerto comum depois do super: 0,5 de novo').toBeCloseTo(0.5, 3);
    expect(erros).toEqual([]);
  });

  test('super que MATA: enquanto o filme do KO toca, o flash do defensor fica em no máximo 0,15', async ({ page }) => {
    await irAteALuta(page);
    await ateOControle(page);
    await espiarMotor(page);
    await espiarSilhuetas(page);
    await prepararDuelo(page, { hp2: 6, en: 100, dist: 60 });
    await apertarSuper(page);
    const doFilme: Array<{ alfa: number; flash: number }> = [];
    for (let i = 0; i < 400; i++) {
      const p = await passo(page);
      if (p.filme && p.flash > 0) doFilme.push(p);
    }
    expect((await eventos(page, 'filme')).length, 'o filme de KO abriu').toBe(1);
    expect(doFilme.length, 'quadros do filme com flash').toBeGreaterThan(10);
    expect(Math.max(...doFilme.map((q) => q.alfa)), 'filme do KO: flash <= 0,15').toBeLessThanOrEqual(0.15 + 1e-6);
  });
});
