import { expect, test } from '@playwright/test';

test('a pagina sobe, o canvas e 960x540 e escala sem distorcer', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await page.goto('/');
  await expect(page).toHaveTitle('InnoFighters');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true');

  const canvas = page.locator('canvas#jogo');
  await expect(canvas).toHaveAttribute('width', '960');
  await expect(canvas).toHaveAttribute('height', '540');

  // medido no navegador: proporcao 16:9 e dentro da janela
  const caixa = await canvas.boundingBox();
  const janela = page.viewportSize();
  expect(caixa).not.toBeNull();
  expect(janela).not.toBeNull();
  if (!caixa || !janela) return;
  expect(Math.abs(caixa.width / caixa.height - 16 / 9)).toBeLessThan(0.02);
  expect(caixa.width).toBeLessThanOrEqual(janela.width);
  expect(caixa.height).toBeLessThanOrEqual(janela.height);

  // o placeholder foi realmente desenhado (pixel central nao e o fundo #111 do CSS)
  const desenhou = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const px = c.getContext('2d')?.getImageData(5, 5, 1, 1).data;
    return px ? px[0] === 0x1a && px[1] === 0x1a && px[2] === 0x2e : false;
  });
  expect(desenhou).toBe(true);

  expect(erros).toEqual([]);
});
