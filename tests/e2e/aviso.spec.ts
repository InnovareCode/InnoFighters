/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

const salvar = (page: Page): Promise<boolean> => page.evaluate(() => (window as any).__inno.persist.salvar() as boolean);
const caixa = (page: Page, seletor: string) => page.locator(seletor).evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, vis: getComputedStyle(el).display !== 'none' };
});

test.describe('aviso "progresso não salvo" (persist.salvar() devolve false)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');

  test('gravação ok: salvar() devolve true e nenhum aviso aparece', async ({ page }) => {
    await page.goto('/?seed=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await salvar(page)).toBe(true);
    await expect(page.locator('#aviso')).toBeHidden();
  });

  test('gravação falha: aviso discreto, sem mexer no layout, sem pegar ponteiro, e some sozinho', async ({ page }, info) => {
    // celular em paisagem (é como se joga): os botões de toque estão na tela e o aviso não pode cobri-los
    if (info.project.name === 'celular') await page.setViewportSize({ width: 915, height: 412 });
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('cheio', 'QuotaExceededError');
      };
    });
    await page.goto('/?seed=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const aviso = page.locator('#aviso');
    await expect(aviso).toBeHidden();
    const canvasAntes = await caixa(page, 'canvas#jogo');

    expect(await salvar(page)).toBe(false);
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText('Progresso não salvo neste aparelho');
    await expect(aviso).toHaveAttribute('aria-live', 'polite');

    // layout: o canvas não se mexeu, o aviso cabe na janela e fica no centro-base (não cobre o HUD de cima)
    expect(await caixa(page, 'canvas#jogo')).toEqual(canvasAntes);
    const vp = page.viewportSize()!;
    const a = await caixa(page, '#aviso');
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x + a.w).toBeLessThanOrEqual(vp.width);
    expect(a.y + a.h).toBeLessThanOrEqual(vp.height);
    expect(a.y).toBeGreaterThan(vp.height / 2);
    expect(a.h).toBeLessThan(40);
    // não captura ponteiro
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id, [a.x + a.w / 2, a.y + a.h / 2])).not.toBe('aviso');
    // não cobre nenhum controle de toque visível
    // (desde a arte nova o #pad é só uma âncora que cobre a tela: o que conta são os botões)
    for (const sel of ['#joy', '#esq', '#r1', '#pad .hp', '#pad .hk', '#pad .lp', '#pad .lk', '#bp']) {
      const b = await caixa(page, sel);
      if (!b.vis) continue;
      const cruza = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      expect(cruza, `aviso cobre ${sel}`).toBe(false);
    }

    // repetir enquanto visível não o empilha nem o faz piscar: segue um único elemento visível
    expect(await salvar(page)).toBe(false);
    await expect(aviso).toBeVisible();
    await expect(page.locator('#aviso')).toHaveCount(1);

    // some sozinho (6 s) e o jogo segue
    await expect(aviso).toBeHidden({ timeout: 10_000 });
    expect(await caixa(page, 'canvas#jogo')).toEqual(canvasAntes);
  });
});
