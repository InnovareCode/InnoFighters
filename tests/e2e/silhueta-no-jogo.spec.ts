/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * V2-3e: a silhueta branca POR QUADRO (src/assets/silhuetas.ts, com 1 px de margem) no jogo de verdade: o flash de dano, o rastro de imagens da corrida e o rastro da esquiva.
 * O que só o navegador prova: a silhueta cai EXATAMENTE em cima do corpo (mesmo retângulo de destino, mesma transformação), nada lança, e o flash acende a imagem.
 * Os espiões ficam no `drawImage` do canvas do jogo; as fontes que são <canvas> são silhuetas (o corpo vem do atlas, que é imagem).
 */
test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function abrirLuta(page: Page, cfg: Record<string, unknown>): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(`console: ${m.text()}`));
  await page.goto('/?seed=7&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${JSON.stringify({ cfg: { mode: 'versus', cpu: null, esquiva: false, ...cfg } })}); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  for (let i = 0; i < 300; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
  // espião do drawImage (só o canvas do jogo): fonte (canvas ou imagem), argumentos, transformação e alfa
  await hook(
    page,
    `(h) => {
      const ctx = h.ui.c.ctx; const di = ctx.drawImage.bind(ctx); window.__di = []; window.__grava = false;
      ctx.drawImage = (img, ...a) => {
        if (window.__grava) { const t = ctx.getTransform(); window.__di.push({ canvas: img instanceof HTMLCanvasElement, w: img.width, h: img.height, a: a.slice(), t: [t.a, t.b, t.c, t.d, t.e, t.f], alfa: ctx.globalAlpha }); }
        return di(img, ...a);
      };
    }`,
  );
  return erros;
}

/** Desenha um quadro e devolve os `drawImage` gravados. */
const DESENHAR = `(h) => { window.__di.length = 0; window.__grava = true; h.desenhar(1); window.__grava = false; return window.__di.slice(); }`;

type Desenho = { canvas: boolean; w: number; h: number; a: number[]; t: number[]; alfa: number };
const mesmoDestino = (x: Desenho, y: Desenho): boolean => x.a.length === 8 && y.a.length === 8 && x.a.slice(4).every((v, i) => Math.abs(v - y.a[4 + i]!) < 1e-6) && x.t.every((v, i) => Math.abs(v - y.t[i]!) < 1e-6);

test('FLASH de dano: a silhueta (quadro + 1 px de margem) cai em cima do corpo do rival, com o alfa do flash, e acende a imagem', async ({ page }) => {
  const erros = await abrirLuta(page, { c1: 'hayato', c2: 'wei-long' });
  await hook(page, `(h) => { const g = h.mundo().game; g.p1.x = 450; g.p2.x = 510; g.p1.facing = 1; g.p2.facing = -1; g.p2.hp = g.p2.maxHp; g.p1.startMove('hp', g); }`);
  let flash = 0;
  for (let i = 0; i < 40 && flash <= 0; i++) flash = await hook(page, '(h) => { h.avancar(1); return h.mundo().game.p2.flash; }');
  expect(flash, 'o golpe acertou e o rival piscou').toBeGreaterThan(0);
  const quadro: Desenho[] = await hook(page, DESENHAR);
  // o par corpo (imagem do atlas) + silhueta (canvas) do rival: mesmo destino, mesma transformação, a silhueta logo depois do corpo
  const pares = quadro.map((d, i) => [d, quadro[i + 1]] as const).filter(([corpo, sil]) => sil && !corpo.canvas && sil.canvas && mesmoDestino(corpo, sil) && corpo.a.length === 8);
  expect(pares.length, 'há um par corpo + silhueta com o mesmo destino').toBeGreaterThanOrEqual(1);
  const [corpo, sil] = pares[0]!;
  expect(sil!.a[0], 'a silhueta lê a partir da margem de 1 px').toBe(1);
  expect(sil!.a[1]).toBe(1);
  expect(sil!.a[2], 'a largura do quadro').toBe(corpo.a[2]);
  expect(sil!.a[3], 'a altura do quadro').toBe(corpo.a[3]);
  expect(sil!.w, 'o canvas da silhueta é o quadro + 2 px').toBe(corpo.a[2]! + 2);
  expect(sil!.h).toBe(corpo.a[3]! + 2);
  expect(sil!.alfa, 'alfa do flash = flash/8 x 0,5').toBeGreaterThan(0);
  expect(sil!.alfa).toBeLessThanOrEqual(0.5 + 1e-9);
  // o pixel acende: a soma de RGB sob o corpo com o flash > sem o flash (mesmo quadro, flash = 0)
  const soma = (): Promise<number> =>
    hook(page, `(h) => { h.desenhar(1); const c = document.getElementById('jogo'); const g = c.getContext('2d'); const k = c.width / 960; const f = h.mundo().game.p2; const x = Math.round((f.x - 70) * k), y = Math.round((f.y - 190) * k); const d = g.getImageData(x, y, Math.round(140 * k), Math.round(190 * k)).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; }`);
  const comFlash = await soma();
  await hook(page, '(h) => { h.mundo().game.p2.flash = 0; }');
  const semFlash = await soma();
  test.info().annotations.push({ type: 'brilho sob o corpo (soma RGB)', description: `com flash ${comFlash} | sem ${semFlash}` });
  expect(comFlash).toBeGreaterThan(semFlash);
  expect(erros).toEqual([]);
});

test('RASTRO da corrida: uma silhueta por imagem fantasma, esmaecendo (alfa <= 0,28) e lida a partir da margem de 1 px', async ({ page }) => {
  const erros = await abrirLuta(page, { c1: 'hayato', c2: 'wei-long' });
  await hook(page, `(h) => { const g = h.mundo().game; g.p1.x = 200; g.p2.x = 800; }`);
  // duplo toque para a frente (ArrowRight) = corrida
  for (let i = 0; i < 2; i++) {
    await page.keyboard.down('ArrowRight');
    await hook(page, '(h) => h.avancar(2)');
    await page.keyboard.up('ArrowRight');
    await hook(page, '(h) => h.avancar(2)');
  }
  let rastro = 0;
  for (let i = 0; i < 30 && rastro < 2; i++) rastro = await hook(page, '(h) => { h.avancar(1); const f = h.mundo().game.p1; return f.state === "dash" ? f.trail.length : 0; }');
  expect(rastro, 'o P1 está em corrida com rastro').toBeGreaterThanOrEqual(2);
  const n: number = await hook(page, '(h) => h.mundo().game.p1.trail.length');
  const quadro: Desenho[] = await hook(page, DESENHAR);
  const fantasmas = quadro.filter((d) => d.canvas && d.a.length === 8 && d.alfa <= 0.28 + 1e-9 && d.alfa > 0);
  test.info().annotations.push({ type: 'rastro da corrida', description: `trail ${n}, silhuetas desenhadas ${fantasmas.length}` });
  expect(fantasmas.length, 'uma silhueta por entrada do rastro (o do rival, se houver, soma)').toBeGreaterThanOrEqual(n);
  for (const s of fantasmas) {
    expect(s.a[0], 'lê a partir da margem').toBe(1);
    expect(s.a[1]).toBe(1);
    expect(s.w).toBe(s.a[2]! + 2);
    expect(s.h).toBe(s.a[3]! + 2);
  }
  expect(erros).toEqual([]);
});

test('RASTRO da esquiva: silhueta TINGIDA (sem margem) na janela invulnerável, e some quando a esquiva acaba', async ({ page }) => {
  const erros = await abrirLuta(page, { c1: 'hayato', c2: 'wei-long', esquiva: true });
  await hook(page, `(h) => { const g = h.mundo().game; g.p1.x = 300; g.p2.x = 760; g.p1.en = 60; g.p2.en = 60; }`);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('n');
  await hook(page, '(h) => h.avancar(1)');
  await page.keyboard.up('n');
  await page.keyboard.up('ArrowRight');
  let naJanela: Desenho[] | null = null;
  let trailNaJanela = 0;
  for (let i = 0; i < 40 && !naJanela; i++) {
    const r = await hook(page, '(h) => { h.avancar(1); const f = h.mundo().game.p1; return { s: f.state, inv: f.invuln, tr: f.trail.length }; }');
    if (r.s === 'esquiva' && r.inv > 0 && r.tr >= 1) {
      trailNaJanela = r.tr;
      naJanela = await hook(page, DESENHAR);
    }
  }
  expect(naJanela, 'o P1 esquivou, invulnerável e com rastro').not.toBeNull();
  const tingidas = naJanela!.filter((d) => d.canvas && d.a.length === 8 && d.alfa <= 0.45 + 1e-9 && d.alfa > 0 && d.a[0] === 0 && d.a[1] === 0);
  test.info().annotations.push({ type: 'rastro da esquiva', description: `trail ${trailNaJanela}, silhuetas tingidas ${tingidas.length}` });
  expect(tingidas.length, 'uma silhueta tingida por entrada do rastro').toBeGreaterThanOrEqual(trailNaJanela);
  for (const s of tingidas) {
    expect(s.w, 'o recorte tingido é do tamanho do quadro, sem margem').toBe(s.a[2]);
    expect(s.h).toBe(s.a[3]);
  }
  // depois da esquiva: sem silhueta tingida
  await hook(page, '(h) => h.avancar(60)');
  const depois: Desenho[] = await hook(page, DESENHAR);
  expect(depois.filter((d) => d.canvas && d.a.length === 8 && d.alfa <= 0.45 && d.alfa > 0.29).length, 'sem rastro tingido depois da janela').toBe(0);
  expect(erros).toEqual([]);
});
