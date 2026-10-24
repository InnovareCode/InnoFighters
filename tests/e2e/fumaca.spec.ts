import { expect, test } from '@playwright/test';

// a página agora baixa ~6 MB de arte antes de ficar pronta; com vários navegadores em paralelo isso passa de 30 s
test.describe.configure({ timeout: 90_000 });

test('a pagina sobe, o canvas tem resolucao 1920x1080 (960x540 logicos x RS 2) e escala sem distorcer', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });

  await page.goto('/?rs=2'); // `?rs=2` fixa o degrau 2 em qualquer aparelho (o celular nasce em 1,5: teste abaixo)
  await expect(page).toHaveTitle('InnoFighters');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });

  const canvas = page.locator('canvas#jogo');
  await expect(canvas).toHaveAttribute('width', '1920');
  await expect(canvas).toHaveAttribute('height', '1080');

  // medido no navegador: proporcao 16:9 e dentro da janela
  const caixa = await canvas.boundingBox();
  const janela = page.viewportSize();
  expect(caixa).not.toBeNull();
  expect(janela).not.toBeNull();
  if (!caixa || !janela) return;
  expect(Math.abs(caixa.width / caixa.height - 16 / 9)).toBeLessThan(0.02);
  expect(caixa.width).toBeLessThanOrEqual(janela.width);
  expect(caixa.height).toBeLessThanOrEqual(janela.height);

  // a abertura (tela de carregamento / "clique ou pressione") foi realmente desenhada: o canto superior
  // esquerdo foi pintado pelo boot (o splash da logo oficial, azul-marinho escuro, ou o degradê roxo de antes enquanto a imagem não chega), não é o fundo #000 do CSS, e há muitas cores
  const desenhou = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const px = g.getImageData(5, 5, 1, 1).data;
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const cores = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return { topo: [px[0], px[1], px[2]], cores: cores.size };
  });
  expect(Math.max(...desenhou.topo.map((v) => v ?? 0)), 'canto do boot pintado (não #000)').toBeGreaterThan(0x0c);
  expect(Math.max(...desenhou.topo.map((v) => v ?? 0)), 'e escuro (splash ou degradê)').toBeLessThan(0x60);
  expect(desenhou.cores).toBeGreaterThan(20);

  expect(erros).toEqual([]);
});

// D1 (docs/desempenho-android-2026-10-24.md): o desktop continua em RS 2 (oráculo de pixel); o toque nasce em 1,5 e se adapta (`?rs=` força)
test('resolução padrão: desktop 1920x1080 (RS 2); celular de toque 1440x810 (RS 1,5); ?rs=1 força 960x540', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const canvas = page.locator('canvas#jogo');
  const esperado = info.project.name === 'celular' ? { w: '1440', h: '810' } : { w: '1920', h: '1080' };
  await expect(canvas).toHaveAttribute('width', esperado.w);
  await expect(canvas).toHaveAttribute('height', esperado.h);
  await page.goto('/?rs=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await expect(canvas).toHaveAttribute('width', '960');
  await expect(canvas).toHaveAttribute('height', '540');
});
