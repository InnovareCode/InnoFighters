import { expect, test, type CDPSession, type Page } from '@playwright/test';

// a página agora baixa ~6 MB de arte antes de ficar pronta; com vários navegadores em paralelo isso passa de 30 s
test.describe.configure({ timeout: 90_000 });

type Quadro = Record<'left' | 'right' | 'up' | 'down' | 'lp' | 'hp' | 'lk' | 'hk' | 'sp', boolean>;
type Hook = { entrada: { lerP1(): Quadro; lerP2(): Quadro; lerMesclado(): Quadro; fimDoTick(): void; temToque: boolean } };

async function abrir(page: Page, viewport?: { width: number; height: number }): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  if (viewport) await page.setViewportSize(viewport);
  await page.goto('/?manual=1'); // sem laço em tempo real: o teste controla os ticks
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  return erros;
}

const p1 = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.lerP1());
const p2 = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.lerP2());
const mesclado = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.lerMesclado());
const fimDoTick = (page: Page) => page.evaluate(() => (window as unknown as { __inno: Hook }).__inno.entrada.fimDoTick());

const VAZIO: Quadro = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, sp: false };

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

  // Medido no navegador (skill medir-antes-de-afirmar): previsão para u = min(15vh, 15vw).
  for (const tela of [
    { nome: 'Pixel 7 deitado', width: 915, height: 412 },
    { nome: 'celular pequeno deitado', width: 667, height: 375 },
    { nome: 'celular largo deitado', width: 844, height: 390 },
  ]) {
    test(`layout dos controles: ${tela.nome} (${tela.width}x${tela.height})`, async ({ page }, info) => {
      test.skip(info.project.name !== 'celular', 'só no celular');
      await abrir(page, { width: tela.width, height: tela.height });
      await expect(page.locator('#touch')).toBeVisible();
      await expect(page.locator('#rot')).toBeHidden();

      const u = Math.min(0.15 * tela.height, 0.15 * tela.width);
      const caixa = async (seletor: string) => {
        const b = await page.locator(seletor).boundingBox();
        if (!b) throw new Error(`${seletor} sem caixa`);
        return b;
      };
      const joy = await caixa('#joy');
      const knob = await caixa('#knob');
      const botoes = {
        hp: await caixa('#pad .hp'),
        lp: await caixa('#pad .lp'),
        hk: await caixa('#pad .hk'),
        lk: await caixa('#pad .lk'),
      };
      const r1 = await caixa('#r1');
      const pausa = await caixa('#bp');

      // tamanhos previstos: o CSS do protótipo é content-box com borda de 2px, então a caixa medida soma 4px
      const B = 4;
      expect(joy.width).toBeCloseTo(2.1 * u + B, 0);
      expect(joy.height).toBeCloseTo(2.1 * u + B, 0);
      expect(knob.width).toBeCloseTo(0.95 * u + B, 0);
      for (const b of Object.values(botoes)) {
        expect(b.width).toBeCloseTo(1.05 * u + B, 0);
        expect(b.height).toBeCloseTo(1.05 * u + B, 0);
        expect(b.width).toBeGreaterThanOrEqual(44); // alvo de toque mínimo
      }
      expect(r1.width).toBeCloseTo(2.4 * u + B, 0);
      expect(r1.height).toBeCloseTo(0.8 * u + B, 0);
      expect(pausa.width).toBeCloseTo(0.6 * u + B, 0);

      // tudo dentro da janela
      for (const [nome, b] of Object.entries({ joy, ...botoes, r1, pausa })) {
        expect(b.x, `${nome} x`).toBeGreaterThanOrEqual(0);
        expect(b.y, `${nome} y`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${nome} direita`).toBeLessThanOrEqual(tela.width);
        expect(b.y + b.height, `${nome} base`).toBeLessThanOrEqual(tela.height);
      }

      // joystick à esquerda, botões à direita; o knob começa centrado no joystick (a menos dos 2px
      // que a borda de 2px do protótipo desloca: a margem negativa centra a caixa de conteúdo)
      expect(joy.x + joy.width).toBeLessThan(botoes.lp.x);
      expect(Math.abs(knob.x + knob.width / 2 - (joy.x + joy.width / 2))).toBeLessThanOrEqual(2.5);
      expect(Math.abs(knob.y + knob.height / 2 - (joy.y + joy.height / 2))).toBeLessThanOrEqual(2.5);

      // losango dos quatro botões sem sobreposição: hp em cima, lk embaixo, lp esquerda, hk direita
      const sobrepoe = (a: typeof joy, b: typeof joy) =>
        a.x < b.x + b.width - 0.5 && a.x + a.width - 0.5 > b.x && a.y < b.y + b.height - 0.5 && a.y + a.height - 0.5 > b.y;
      const lista = Object.entries(botoes);
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          expect(sobrepoe(lista[i]![1], lista[j]![1]), `${lista[i]![0]} x ${lista[j]![0]}`).toBe(false);
        }
      }
      expect(botoes.hp.y).toBeLessThan(botoes.lp.y);
      expect(botoes.lk.y).toBeGreaterThan(botoes.lp.y);
      expect(botoes.lp.x).toBeLessThan(botoes.lk.x);
      expect(botoes.hk.x).toBeGreaterThan(botoes.lk.x);

      // R1 acima do losango, pausa no canto superior direito
      expect(r1.y + r1.height).toBeLessThan(botoes.hp.y);
      expect(sobrepoe(r1, botoes.hp)).toBe(false);
      expect(pausa.y).toBeLessThan(tela.height * 0.1);
      expect(pausa.x + pausa.width).toBeGreaterThan(tela.width * 0.9);

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
