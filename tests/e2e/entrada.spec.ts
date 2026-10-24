import { expect, test, type CDPSession, type Page } from '@playwright/test';

// a página agora baixa ~6 MB de arte antes de ficar pronta; com vários navegadores em paralelo isso passa de 30 s
test.describe.configure({ timeout: 90_000 });

type Quadro = Record<'left' | 'right' | 'up' | 'down' | 'lp' | 'hp' | 'lk' | 'hk' | 'sp' | 'spSeg' | 'esq', boolean>;
type Hook = { entrada: { lerP1(): Quadro; lerP2(): Quadro; lerMesclado(): Quadro; fimDoTick(): void; temToque: boolean } };

async function abrir(page: Page, viewport?: { width: number; height: number }): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  if (viewport) await page.setViewportSize(viewport);
  // sem laço em tempo real: o teste controla os ticks. `trailer=0`: o 1º toque/tecla é o gesto do boot e abriria o trailer,
  // cujo `body.em-trailer` esconde o `#touch` (pointer-events:none) e quebraria os toques nos botões
  await page.goto('/?manual=1&trailer=0');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  return erros;
}

const p1 = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.lerP1());
const p2 = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.lerP2());
const mesclado = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.lerMesclado());
const fimDoTick = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.fimDoTick());

const VAZIO: Quadro = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, sp: false, spSeg: false, esq: false };

test.describe('teclado (InputFrame = readInput do protótipo)', () => {
  test('direção é segurada, golpe é borda de descida', async ({ page }) => {
    const erros = await abrir(page);
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('z');
    expect(await p1(page)).toEqual({ ...VAZIO, left: true, lp: true });
    await fimDoTick(page);
    expect(await p1(page)).toEqual({ ...VAZIO, left: true });
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('z');
    expect(await p1(page)).toEqual(VAZIO);
    expect(erros).toEqual([]);
  });

  test('jogador 2 tem teclas próprias e o merge junta os dois', async ({ page }) => {
    await abrir(page);
    await page.keyboard.down('d');
    await page.keyboard.down('k');
    expect(await p1(page)).toEqual(VAZIO);
    expect(await p2(page)).toEqual({ ...VAZIO, right: true, hp: true });
    await page.keyboard.down('ArrowUp');
    expect(await mesclado(page)).toEqual({ ...VAZIO, up: true, right: true, hp: true });
  });

  test('letra maiúscula (Shift/CapsLock) vale como minúscula', async ({ page }) => {
    await abrir(page);
    await page.keyboard.down('Shift');
    await page.keyboard.down('Z');
    expect((await p1(page)).lp).toBe(true);
  });

  test('tecla repetida pelo sistema não gera novo golpe', async ({ page }) => {
    await abrir(page);
    await page.keyboard.down('x');
    await fimDoTick(page);
    await page.keyboard.down('x'); // autorepeat: o navegador marca repeat=true
    expect((await p1(page)).hp).toBe(false);
  });

  test('Ctrl+tecla é ignorado (atalhos do navegador)', async ({ page }) => {
    await abrir(page);
    await page.keyboard.down('Control');
    await page.keyboard.down('z');
    expect((await p1(page)).lp).toBe(false);
  });

  test('perder o foco da janela solta as direções', async ({ page }) => {
    await abrir(page);
    await page.keyboard.down('ArrowRight');
    expect((await p1(page)).right).toBe(true);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    expect((await p1(page)).right).toBe(false);
  });

  test('setas não rolam a página (preventDefault)', async ({ page }) => {
    await abrir(page);
    const impediu = await page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(impediu).toBe(true);
  });
});

test.describe('camada de toque', () => {
  test('em desktop a camada de toque não aparece', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrir(page);
    expect(await page.evaluate(() => document.body.classList.contains('touch'))).toBe(false);
    expect(await page.locator('#touch').evaluate((el) => getComputedStyle(el).display)).toBe('none');
    expect(await page.locator('#rot').evaluate((el) => getComputedStyle(el).display)).toBe('none');
  });

  test('em retrato mostra o aviso para virar o aparelho', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await abrir(page); // Pixel 7: 412x915 em pé
    await expect(page.locator('#rot')).toBeVisible();
    await expect(page.locator('#rot')).toHaveText('Vire o aparelho para o modo paisagem');
  });

  // E7a: controle virtual compacto. Medido no navegador (skill medir-antes-de-afirmar). --m = menor lado da janela;
  // área de toque do botão = max(44, 0,115 m); joystick = 0,235 m; botão ESQ (L1) na casa de cima à esquerda, ao lado do ESP.
  // Limites de tamanho: nenhum controle passa de 12% da LARGURA da janela (deitado) e os controles juntos cobrem pouco da arena.
  const LIMITE_LARGURA = 0.12;
  for (const tela of [
    { nome: 'Pixel 7 deitado', width: 915, height: 412 },
    { nome: 'celular largo deitado', width: 844, height: 390 },
    { nome: 'celular pequeno deitado', width: 667, height: 375 },
  ]) {
    test(`layout dos controles: ${tela.nome} (${tela.width}x${tela.height})`, async ({ page }, info) => {
      test.skip(info.project.name !== 'celular', 'só no celular');
      await abrir(page, { width: tela.width, height: tela.height });
      await expect(page.locator('#touch')).toBeVisible();
      await expect(page.locator('#rot')).toBeHidden();

      type Caixa = { x: number; y: number; w: number; h: number };
      const caixa = (seletor: string): Promise<Caixa> =>
        page.evaluate((s) => {
          const r = document.querySelector(s)!.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }, seletor);
      const m = Math.min(tela.width, tela.height);
      // direção de arte do Apolo (docs/direcao-arte-controles-toque.md §6): D = clamp(44, 0,118 m, 56) é o lado do botão de ataque; joystick 2,1 D;
      // ESQUIVA max(44, 0,92 D); ESPECIAL 1,12 D. O #pad virou só uma âncora (cobre a janela): o "aglomerado" é a união das caixas dos botões.
      const D = Math.min(56, Math.max(44, 0.118 * m));
      const joy = await caixa('#joy');
      const knob = await caixa('#knob');
      const botoes = { hp: await caixa('#pad .hp'), lp: await caixa('#pad .lp'), hk: await caixa('#pad .hk'), lk: await caixa('#pad .lk') };
      const r1 = await caixa('#r1');
      const esq = await caixa('#esq');
      const pausa = await caixa('#bp');
      const cv = await caixa('canvas#jogo');
      const uniao = (bs: Caixa[]): Caixa => {
        const x0 = Math.min(...bs.map((b) => b.x));
        const y0 = Math.min(...bs.map((b) => b.y));
        return { x: x0, y: y0, w: Math.max(...bs.map((b) => b.x + b.w)) - x0, h: Math.max(...bs.map((b) => b.y + b.h)) - y0 };
      };
      const pad = uniao([...Object.values(botoes), r1, esq]);

      // tamanhos previstos (border-box: a caixa medida é o tamanho calculado)
      expect(joy.w).toBeCloseTo(2.1 * D, 0);
      expect(knob.w).toBeCloseTo(0.44 * 2.1 * D, 0);
      for (const [nome, b] of Object.entries(botoes)) {
        expect(b.w, nome).toBeCloseTo(D, 0);
        expect(b.h, nome).toBeCloseTo(D, 0);
      }
      expect(r1.w).toBeCloseTo(1.12 * D, 0);
      expect(esq.w).toBeCloseTo(Math.max(44, 0.92 * D), 0);
      for (const [nome, b] of Object.entries({ ...botoes, r1, esq, pausa })) expect(b.w, `${nome}: área de toque mínima`).toBeGreaterThanOrEqual(43.95);
      // o desenho é um SVG por estado (disco de vidro com bisel), a 90% de opacidade em repouso: confere no ::before
      const visual = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#pad .hk')!, '::before');
        return { imagem: s.backgroundImage, opacidade: +s.opacity };
      });
      expect(visual.imagem).toContain('chute-forte.svg');
      expect(visual.opacidade).toBeCloseTo(0.9, 2);

      // tudo dentro da janela
      for (const [nome, b] of Object.entries({ joy, pad, pausa })) {
        expect(b.x, `${nome} x`).toBeGreaterThanOrEqual(0);
        expect(b.y, `${nome} y`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w, `${nome} direita`).toBeLessThanOrEqual(tela.width);
        expect(b.y + b.h, `${nome} base`).toBeLessThanOrEqual(tela.height);
      }

      // o knob começa centrado no joystick
      expect(Math.abs(knob.x + knob.w / 2 - (joy.x + joy.w / 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(knob.y + knob.h / 2 - (joy.y + joy.h / 2))).toBeLessThanOrEqual(1);

      // ordem do aglomerado: ESQUIVA e ESPECIAL em cima; soco (coluna de dentro) e chute (coluna de fora, 0,28 D mais alta); leve embaixo, forte no meio
      expect(joy.x + joy.w).toBeLessThan(pad.x);
      expect(esq.x + esq.w / 2, 'ESQUIVA na coluna do soco').toBeCloseTo(botoes.hp.x + botoes.hp.w / 2, 0);
      expect(r1.x + r1.w / 2, 'ESPECIAL na coluna do chute').toBeCloseTo(botoes.hk.x + botoes.hk.w / 2, 0);
      expect(esq.y + esq.h).toBeLessThanOrEqual(botoes.hp.y + 0.5);
      expect(r1.y + r1.h).toBeLessThanOrEqual(botoes.hk.y + 0.5);
      expect(botoes.hp.y + botoes.hp.h).toBeLessThanOrEqual(botoes.lp.y + 0.5);
      expect(botoes.hk.y + botoes.hk.h).toBeLessThanOrEqual(botoes.lk.y + 0.5);
      expect(botoes.lp.x).toBeLessThan(botoes.lk.x);
      expect(botoes.lk.y, 'a coluna do chute é mais alta (arco do polegar)').toBeLessThan(botoes.lp.y);
      const sobrepoe = (a: Caixa, b: Caixa) => a.x < b.x + b.w - 0.5 && a.x + a.w - 0.5 > b.x && a.y < b.y + b.h - 0.5 && a.y + a.h - 0.5 > b.y;
      const todos = { ...botoes, r1, esq };
      const lista = Object.entries(todos);
      for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) expect(sobrepoe(lista[i]![1], lista[j]![1]), `${lista[i]![0]} x ${lista[j]![0]}`).toBe(false);
      // cada botão recebe o toque no próprio centro (a casa da ESQUIVA tem o botão ESQ, e não os vizinhos)
      expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id ?? '', [esq.x + esq.w / 2, esq.y + esq.h / 2])).toBe('esq');
      expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id ?? '', [r1.x + r1.w / 2, r1.y + r1.h / 2])).toBe('r1');

      // TAMANHO: % da LARGURA da janela e % da área do jogo (canvas), medidos e limitados
      const pct = (v: number, total: number) => +((100 * v) / total).toFixed(1);
      const areaCanvas = cv.w * cv.h;
      const sobreCanvas = (b: Caixa): number => {
        const w = Math.max(0, Math.min(b.x + b.w, cv.x + cv.w) - Math.max(b.x, cv.x));
        const h = Math.max(0, Math.min(b.y + b.h, cv.y + cv.h) - Math.max(b.y, cv.y));
        return w * h;
      };
      const medidas = {
        janela: `${tela.width}x${tela.height}`,
        canvas: `${Math.round(cv.w)}x${Math.round(cv.h)} em x=${Math.round(cv.x)}`,
        joystickCss: Math.round(joy.w),
        joystickPctLargura: pct(joy.w, tela.width),
        botaoToqueCss: Math.round(D),
        botaoPctLargura: pct(D, tela.width),
        aglomeradoCss: `${Math.round(pad.w)}x${Math.round(pad.h)}`,
        aglomeradoPctLargura: pct(pad.w, tela.width),
        aglomeradoPctAltura: pct(pad.h, tela.height),
        joystickSobreArenaPct: pct(sobreCanvas(joy), areaCanvas),
        aglomeradoSobreArenaPct: pct(sobreCanvas(pad), areaCanvas),
        controlesSobreArenaPct: pct(sobreCanvas(joy) + sobreCanvas(pad), areaCanvas),
      };
      info.annotations.push({ type: 'medido', description: JSON.stringify(medidas) });
      if (tela.width > tela.height * 1.8) {
        // telas com margem preta dos lados (16:9 não preenche a janela): é onde o limite vale com folga
        expect(joy.w / tela.width, 'joystick').toBeLessThanOrEqual(LIMITE_LARGURA);
        expect(pad.w / tela.width, 'aglomerado').toBeLessThanOrEqual(LIMITE_LARGURA + 0.005); // a coluna do chute encosta no canto: 12,1% medido em 844x390
        expect(D / tela.width, 'botão').toBeLessThanOrEqual(0.06);
        // a arte nova tem 4 fileiras (ESQUIVA/ESPECIAL, forte, leve, mais o rótulo): até 46% da altura (era 40% no desenho antigo, de 3 fileiras)
        expect(pad.h / tela.height, 'altura do aglomerado').toBeLessThanOrEqual(0.46);
        // não cobre o HUD: faixa de cima (retratos/barras, até 100 lógicos) e faixa de baixo (SUPER, a partir de 490 lógicos)
        const k = cv.w / 960;
        for (const [nome, b] of Object.entries({ joy, pad, pausa })) {
          if (sobreCanvas(b) === 0) continue;
          expect(b.y, `${nome} sobre o HUD de cima`).toBeGreaterThanOrEqual(cv.y + 100 * k);
          expect(b.y + b.h, `${nome} sobre o HUD de baixo`).toBeLessThanOrEqual(cv.y + 490 * k + 0.5);
        }
        // e cobre pouco da arena: junto, no máximo 8% da área do jogo (6% no desenho antigo, ver o handoff da E7a; o novo tem o 4º botão e o rótulo)
        expect((sobreCanvas(joy) + sobreCanvas(pad)) / areaCanvas, 'controles sobre a arena').toBeLessThanOrEqual(0.08);
      }

      await page.screenshot({ path: info.outputPath(`toque-${tela.width}x${tela.height}.png`) });
    });
  }

  test('botões e joystick produzem o InputFrame do jogador 1', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    const erros = await abrir(page, { width: 915, height: 412 });
    expect(await page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.temToque)).toBe(true);
    const cdp: CDPSession = await page.context().newCDPSession(page);
    const centro = async (seletor: string) => {
      const b = await page.locator(seletor).boundingBox();
      if (!b) throw new Error(`${seletor} sem caixa`);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
    };
    const tocar = (id: number, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id }] });
    const mover = (id: number, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id }] });
    const soltar = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    // soco fraco (quadrado = z)
    const lp = await centro('#pad .lp');
    await tocar(1, lp.x, lp.y);
    expect(await p1(page)).toEqual({ ...VAZIO, lp: true });
    await expect(page.locator('#pad .lp')).toHaveClass(/\bon\b/);
    await fimDoTick(page);
    expect(await p1(page)).toEqual(VAZIO); // segurado, mas golpe é borda
    await soltar();
    await expect(page.locator('#pad .lp')).not.toHaveClass(/\bon\b/);

    // R1 = especial (b), chute forte (círculo = v)
    const r1 = await centro('#r1');
    await tocar(1, r1.x, r1.y);
    expect((await p1(page)).sp).toBe(true);
    await soltar();
    await fimDoTick(page);
    const hk = await centro('#pad .hk');
    await tocar(1, hk.x, hk.y);
    expect((await p1(page)).hk).toBe(true);
    await soltar();
    await fimDoTick(page);

    // ESQ (L1) = esquiva (n): borda de descida como os golpes; não aperta o especial nem nenhum outro botão
    const esq = await centro('#esq');
    await tocar(1, esq.x, esq.y);
    expect(await p1(page)).toEqual({ ...VAZIO, esq: true });
    await expect(page.locator('#esq')).toHaveClass(/\bon\b/);
    await fimDoTick(page);
    expect(await p1(page)).toEqual(VAZIO); // segurado, mas é borda
    await soltar();
    await expect(page.locator('#esq')).not.toHaveClass(/\bon\b/);
    await fimDoTick(page);

    // joystick: puxa para a esquerda -> left; para cima e direita -> up+right; solta -> nada
    const joy = await centro('#joy');
    const R = joy.b.width / 2;
    await tocar(2, joy.x, joy.y);
    expect(await p1(page)).toEqual(VAZIO);
    await mover(2, joy.x - R * 0.6, joy.y);
    expect(await p1(page)).toEqual({ ...VAZIO, left: true });
    await mover(2, joy.x + R * 0.6, joy.y - R * 0.6);
    expect(await p1(page)).toEqual({ ...VAZIO, right: true, up: true });
    // o knob acompanha o dedo, limitado a 85% do raio
    const deslocamento = await page.locator('#knob').evaluate((el) => (el as HTMLElement).style.transform);
    expect(deslocamento).toMatch(/^translate\(/);
    await mover(2, joy.x, joy.y + R * 2);
    // U1 (soltura mínima): a oposta (cima) sai na hora, mas a direita, que só saiu da zona, segura mais 2 ticks (contra o tremor do dedo)
    expect(await p1(page)).toEqual({ ...VAZIO, right: true, down: true });
    await fimDoTick(page);
    await fimDoTick(page);
    const baixo = await p1(page);
    expect(baixo).toEqual({ ...VAZIO, down: true });
    const knob = await page.locator('#knob').boundingBox();
    expect(knob).not.toBeNull();
    if (knob) {
      const dy = knob.y + knob.height / 2 - (joy.y);
      expect(dy).toBeLessThanOrEqual(R * 0.85 + 3);
      expect(dy).toBeGreaterThan(R * 0.8);
    }
    await soltar();
    expect(await p1(page)).toEqual(VAZIO);
    expect(await page.locator('#knob').evaluate((el) => (el as HTMLElement).style.transform)).toBe('');

    // dois dedos ao mesmo tempo: joystick + botão
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: joy.x, y: joy.y, id: 3 },
        { x: lp.x, y: lp.y, id: 4 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: joy.x + R * 0.7, y: joy.y, id: 3 },
        { x: lp.x, y: lp.y, id: 4 },
      ],
    });
    expect(await p1(page)).toEqual({ ...VAZIO, right: true, lp: true });
    await soltar();
    expect(erros).toEqual([]);
  });
});
