/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * Controles de toque com a direção de arte do Apolo (docs/direcao-arte-controles-toque.md, §10): desenho SVG por estado, rótulos (LEVE/FORTE/ESQUIVA/ESPECIAL)
 * no lugar dos glifos, ESPECIAL apagado sem barra e com estalo (.acendeu, 220 ms) ao ficar pronto, joystick com estado ativo, e a geometria medida (§8) no
 * celular deitado (915x412 e 844x390 com o entalhe simulado). Só no projeto "celular" (toque emulado no Chromium).
 */
test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function abrirLuta(page: Page, vp = { width: 915, height: 412 }, query = '&expansao=1'): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.setViewportSize(vp);
  await page.goto(`/?seed=3&manual=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await hook(page, `(h) => { h.persist.settings.cinematica = 'desligada'; h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ mode: 'arcade', c1: 'hayato', c2: 'caio', cpu: 0 })} }); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 300; i++) if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  await hook(page, '(h) => h.avancar(5)');
  return erros;
}

const cls = (page: Page, id: string): Promise<string[]> => page.evaluate((i) => [...document.getElementById(i)!.classList], id);
const fundo = (page: Page, sel: string): Promise<string> => page.evaluate((s) => getComputedStyle(document.querySelector(s)!, '::before').backgroundImage, sel);
const setEn = (page: Page, en: number) => hook(page, `(h) => { h.mundo().game.p1.en = ${en}; h.avancar(1); }`);

test.describe('controles de toque: painel arcade de vidro', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'só no celular'));

  test('rótulos no lugar dos glifos: texto vazio, rótulo em Barlow Condensed (HUD) e aria-label mantido', async ({ page }) => {
    const erros = await abrirLuta(page);
    const r = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#touch .b')].map((el) => ({
        id: el.id || el.className.replace('b ', ''),
        texto: (el.textContent ?? '').trim(),
        rotulo: getComputedStyle(el, '::after').content,
        escondido: getComputedStyle(el, '::after').display === 'none',
        fonte: getComputedStyle(el, '::after').fontFamily,
        aria: el.getAttribute('aria-label'),
        k: el.getAttribute('data-k'),
      })),
    );
    expect(r.every((b) => b.texto === '')).toBe(true);
    const por = Object.fromEntries(r.map((b) => [b.id, b]));
    expect(por['esq']?.rotulo).toBe('"ESQUIVA"');
    expect(por['r1']?.rotulo).toBe('"ESPECIAL"');
    expect([por['hp']?.rotulo, por['hk']?.rotulo]).toEqual(['"FORTE"', '"FORTE"']);
    expect([por['lp']?.rotulo, por['lk']?.rotulo]).toEqual(['"LEVE"', '"LEVE"']);
    expect(por['bp']?.escondido).toBe(true); // a pausa não tem rótulo
    for (const b of r.filter((x) => x.id !== 'bp')) expect(b.fonte).toContain('Barlow Condensed');
    // ids, teclas e nomes acessíveis de antes
    expect(r.map((b) => [b.id, b.k, b.aria])).toEqual(
      expect.arrayContaining([['esq', 'n', 'Esquiva'], ['r1', 'b', 'Especial'], ['hp', 'x', 'Soco forte'], ['hk', 'v', 'Chute forte'], ['lp', 'z', 'Soco fraco'], ['lk', 'c', 'Chute fraco'], ['bp', 'Escape', 'Pausar']]),
    );
    expect(erros).toEqual([]);
  });

  test('ESPECIAL e ESQUIVA apagam sem barra, acendem com ela e o ESPECIAL dá o estalo .acendeu por 220 ms (a mesma regra do HUD)', async ({ page }) => {
    await abrirLuta(page);
    await setEn(page, 0);
    expect(await cls(page, 'r1')).toContain('sem');
    expect(await cls(page, 'esq')).toContain('sem');
    expect(await fundo(page, '#r1')).toContain('especial-desabilitado.svg');
    // custo do especial do HAYATO (o mesmo que o HUD usa) e da esquiva
    const custo = await hook(page, '(h) => { const g = h.mundo().game; return h.ui.m.elenco[g.p1.id].ch.proj.cost; }');
    await setEn(page, custo - 1);
    expect(await cls(page, 'r1')).toContain('sem');
    await setEn(page, custo);
    expect(await cls(page, 'r1')).not.toContain('sem');
    expect(await cls(page, 'r1')).toContain('acendeu');
    expect(await fundo(page, '#r1')).toContain('especial.svg');
    await expect.poll(() => cls(page, 'r1'), { timeout: 1500 }).not.toContain('acendeu');
    expect(await cls(page, 'r1')).not.toContain('sem'); // continua pronto, sem o estalo
    // gastar a barra apaga de novo e NÃO dá estalo
    await setEn(page, 0);
    expect(await cls(page, 'r1')).toContain('sem');
    expect(await cls(page, 'r1')).not.toContain('acendeu');
    // a esquiva acende na barra dela
    await setEn(page, 100);
    expect(await cls(page, 'esq')).not.toContain('sem');
  });

  test('o estalo reinicia: ficar pronto de novo dentro dos 220 ms mantém UMA classe e um único fim', async ({ page }) => {
    await abrirLuta(page);
    const custo = await hook(page, '(h) => h.ui.m.elenco[h.mundo().game.p1.id].ch.proj.cost');
    for (let i = 0; i < 3; i++) {
      await setEn(page, 0);
      await setEn(page, custo);
    }
    expect(await cls(page, 'r1')).toContain('acendeu');
    await expect.poll(() => cls(page, 'r1'), { timeout: 1500 }).not.toContain('acendeu');
  });

  test('apertar troca para o desenho aceso e escala 0,94; o ESPECIAL apagado apertado não acende', async ({ page }) => {
    await abrirLuta(page);
    await setEn(page, 100);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.cancel()));
    await page.evaluate(() => document.querySelector('#pad .lp')!.classList.add('on'));
    expect(await fundo(page, '#pad .lp')).toContain('soco-leve-pressionado.svg');
    const m = await page.evaluate(() => getComputedStyle(document.querySelector('#pad .lp')!, '::before').transform);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#pad .lp')!, '::before').transform)).toMatch(/matrix\(0\.94/);
    expect(m).toBeTruthy();
    await setEn(page, 0);
    await page.evaluate(() => document.getElementById('r1')!.classList.add('on'));
    expect(await fundo(page, '#r1')).toContain('especial-desabilitado.svg');
  });

  test('joystick: .ativo enquanto o polegar está nele (aro e bolinha acesos) e sai ao soltar; toque cancelado também', async ({ page }) => {
    await abrirLuta(page);
    const c = await page.evaluate(() => {
      const b = document.getElementById('joy')!.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] });
    expect(await page.evaluate(() => document.getElementById('joy')!.classList.contains('ativo'))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('joy')!).backgroundImage)).toContain('joystick-aro-ativo.svg');
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('knob')!).backgroundImage)).toContain('joystick-bolinha-pressionada.svg');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById('joy')!).opacity)).toBe('1'); // a opacidade leva .12 s para chegar
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await page.evaluate(() => document.getElementById('joy')!.classList.contains('ativo'))).toBe(false);
    await expect.poll(async () => Number(await page.evaluate(() => getComputedStyle(document.getElementById('joy')!).opacity))).toBeCloseTo(0.9, 2);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    expect(await page.evaluate(() => document.getElementById('joy')!.classList.contains('ativo'))).toBe(false);
  });

  test('os SVGs de estado são pedidos ao ligar o toque (antes do 1º aperto) e nenhum desenho dá 404', async ({ page }) => {
    const respostas = new Map<string, number>();
    page.on('response', (r) => {
      if (r.url().includes('/assets/ui/toque/')) respostas.set(new URL(r.url()).pathname.split('/').pop()!, r.status());
    });
    await abrirLuta(page);
    await setEn(page, 100);
    await page.evaluate(() => document.querySelectorAll('#touch .b, #joy').forEach((e) => e.classList.add('on', 'ativo')));
    await page.waitForTimeout(400);
    for (const n of ['soco-leve', 'soco-forte', 'chute-leve', 'chute-forte', 'esquiva', 'especial', 'pausa']) expect(respostas.get(`${n}-pressionado.svg`), `${n}-pressionado`).toBe(200);
    for (const n of ['esquiva-desabilitado', 'especial-desabilitado', 'joystick-aro-ativo', 'joystick-bolinha-pressionada', 'joystick-aro', 'joystick-base', 'joystick-bolinha', 'soco-leve', 'especial']) {
      expect(respostas.get(`${n}.svg`), n).toBe(200);
    }
    expect([...respostas.values()].every((s) => s === 200)).toBe(true);
  });

  for (const [vp, esperado] of [
    [{ width: 915, height: 412 }, { lp: [820.5, 347.7, 48.6], lk: [876.9, 334.1, 48.6], hp: [820.5, 291.3, 48.6], hk: [876.9, 277.7, 48.6], esq: [820.5, 235.8, 44.7], r1: [876.9, 217.4, 54.4], bp: [883, 98, 44], joy: [64.8, 311.3, 102.1] }],
    [{ width: 844, height: 390 }, { lp: [715.1, 313.8, 46], lk: [768.5, 300.9, 46], hp: [715.1, 260.4, 46], hk: [768.5, 247.5, 46], esq: [715.1, 207.9, 44], r1: [768.5, 190.4, 51.5], bp: [773, 94.3, 44], joy: [100.8, 279.3, 96.6] }],
  ] as const) {
    test(`geometria do desenho (§8) em ${vp.width}x${vp.height}: centros e lados medidos, alvo >= 44, sem sobreposição, o centro de cada controle acerta ele mesmo`, async ({ page }) => {
      await abrirLuta(page, vp);
      // o 844x390 simula o iPhone deitado (laterais 47 px, base 21 px): o Chromium não emula env(safe-area-*)
      if (vp.width === 844) {
        await page.evaluate(() => {
          const t = document.getElementById('touch')!;
          t.style.setProperty('--seg-esq', '47px');
          t.style.setProperty('--seg-dir', '47px');
          t.style.setProperty('--seg-base', '21px');
        });
      }
      const ids: Record<string, string> = { joy: '#joy', esq: '#esq', r1: '#r1', hp: '#pad .hp', hk: '#pad .hk', lp: '#pad .lp', lk: '#pad .lk', bp: '#bp' };
      const m = await page.evaluate((i) => {
        const o: Record<string, any> = {};
        for (const [n, s] of Object.entries(i)) {
          const el = document.querySelector(s)!;
          const b = el.getBoundingClientRect();
          const alvo = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
          o[n] = { x: b.x + b.width / 2, y: b.y + b.height / 2, lado: Math.min(b.width, b.height), w: b.width, h: b.height, bx: b.x, by: b.y, acerta: alvo === el || el.contains(alvo) || (n === 'joy' && alvo?.id === 'knob') };
        }
        return o;
      }, ids);
      for (const [n, [x, y, lado]] of Object.entries(esperado) as Array<[string, readonly number[]]>) {
        const b = m[n];
        expect(b.x, `${n} x`).toBeCloseTo(x!, 0);
        expect(b.y, `${n} y`).toBeCloseTo(y!, 0);
        expect(b.lado, `${n} lado`).toBeCloseTo(lado!, 0);
        expect(b.acerta, `${n} acerta o próprio centro`).toBe(true);
        if (n !== 'joy') expect(b.lado, `${n} >= 44`).toBeGreaterThanOrEqual(43.95);
      }
      const nomes = Object.keys(m);
      for (let i = 0; i < nomes.length; i++) {
        for (let j = i + 1; j < nomes.length; j++) {
          const a = m[nomes[i]!];
          const b = m[nomes[j]!];
          const w = Math.min(a.bx + a.w, b.bx + b.w) - Math.max(a.bx, b.bx);
          const h = Math.min(a.by + a.h, b.by + b.h) - Math.max(a.by, b.by);
          expect(w > 0 && h > 0, `${nomes[i]} x ${nomes[j]} sobrepostos`).toBe(false);
        }
      }
      // tudo dentro da janela
      for (const [n, b] of Object.entries(m) as Array<[string, any]>) {
        expect(b.bx, `${n} esquerda`).toBeGreaterThanOrEqual(0);
        expect(b.by, `${n} topo`).toBeGreaterThanOrEqual(0);
        expect(b.bx + b.w, `${n} direita`).toBeLessThanOrEqual(vp.width);
        expect(b.by + b.h, `${n} base`).toBeLessThanOrEqual(vp.height);
      }
    });
  }

  test('prefers-reduced-motion: o ESPECIAL pronto não anima (brilho fixo); sem ele, respira em ouro', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrirLuta(page);
    await setEn(page, 100);
    const anim = () => page.evaluate(() => getComputedStyle(document.querySelector('#r1')!, '::before').animationName);
    expect(await anim()).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#r1')!, '::before').filter)).toContain('drop-shadow');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(await anim()).toContain('toque-pronto');
  });

  test('?expansao=4 (sem a mecânica da esquiva): o ESQ some e a casa fica; opacidade padrão 0,9 nos botões em repouso', async ({ page }) => {
    await abrirLuta(page, { width: 915, height: 412 }, '&expansao=4');
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('esq')!).visibility)).toBe('hidden');
    expect(Number(await page.evaluate(() => getComputedStyle(document.querySelector('#pad .lp')!, '::before').opacity))).toBeCloseTo(0.9, 2);
  });

  test('aviso "vire o aparelho" em retrato continua valendo e os controles não tapam a tela de aviso', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/?seed=3&manual=1&expansao=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await page.evaluate(() => getComputedStyle(document.getElementById('rot')!).display)).toBe('flex'); // tela cheia com a logo oficial + o texto
  });
});
