import { expect, test, type Page } from '@playwright/test';

/*
 * Medidor de FPS no aparelho (`?fps=1`, docs/medicao-em-aparelho.md): desligado não cria NADA; ligado mostra FPS/p95/pior, RS, cena, arte e longtasks num canto livre
 * (fora dos botões de toque, dentro da margem segura) e o botão COPIAR põe um JSON válido na área de transferência. Desktop e celular.
 */
test.describe.configure({ timeout: 90_000 });

async function pronto(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

test('desligado (sem ?fps, ?fps=0 e ?fps=2): nenhum elemento, nenhum módulo do medidor baixado', async ({ page }) => {
  const baixados: string[] = [];
  page.on('request', (r) => {
    if (/medidor-fps|medidor-agregacao/.test(r.url())) baixados.push(r.url());
  });
  for (const busca of ['/', '/?fps=0', '/?fps=2']) {
    await page.goto(busca);
    await pronto(page);
    await page.waitForTimeout(1200);
    expect(await page.locator('#fps').count(), busca).toBe(0);
    expect(await page.locator('body button').count(), busca).toBe(0);
  }
  expect(baixados).toEqual([]);
});

test('ligado: o texto aparece, anda e traz RS, cena, arte e longtasks', async ({ page }, info) => {
  await page.goto('/?fps=1');
  await pronto(page);
  const caixa = page.locator('#fps');
  await expect(caixa).toBeVisible({ timeout: 10_000 });
  await expect(caixa).toContainText(/\d+ fps\s+p95 [\d.]+\s+pior \d+ ms \(5s\)/, { timeout: 10_000 });
  const texto = (await caixa.innerText()).replace(/\s+/g, ' ');
  expect(texto).toMatch(/RS [\d.]+ (auto|fixo|forcado) \| \S+ \| arte (-|[\d.]+) MiB \| lt (\d+|n\/d)/);
  expect(texto).toContain(info.project.name === 'celular' ? 'auto' : 'fixo');
  await expect(caixa.getByRole('button', { name: /copiar/i })).toBeVisible();
});

test('?rs= aparece como "forcado" e o RS mostrado é o do canvas', async ({ page }) => {
  await page.goto('/?fps=1&rs=1');
  await pronto(page);
  await expect(page.locator('#fps')).toContainText('RS 1 forcado', { timeout: 10_000 });
  await expect(page.locator('canvas#jogo')).toHaveAttribute('width', '960');
});

test('geometria: dentro da tela, na base, sem tocar em botão de toque nem no joystick (luta, aparelho deitado)', async ({ page }, info) => {
  await page.setViewportSize(info.project.name === 'celular' ? { width: 915, height: 412 } : { width: 1280, height: 720 });
  await page.goto('/?fps=1&seed=3');
  await pronto(page);
  await page.evaluate(() => {
    const h = (window as any).__inno;
    h.ui.fade = 0;
    h.ui.fadeDir = 0;
    h.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: true } });
  });
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const caixa = document.getElementById('fps')!.getBoundingClientRect();
    const vis = (e: Element): boolean => {
      const c = getComputedStyle(e);
      const b = e.getBoundingClientRect();
      return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0;
    };
    const alvos = [...document.querySelectorAll('#touch .b, #joy, #pad, #bp')].filter(vis).map((e) => {
      const b = e.getBoundingClientRect();
      return { id: e.id || e.getAttribute('data-k') || e.className, x: b.x, y: b.y, w: b.width, h: b.height };
    });
    return { caixa: { x: caixa.x, y: caixa.y, w: caixa.width, h: caixa.height }, alvos, vw: window.innerWidth, vh: window.innerHeight };
  });
  expect(r.caixa.x).toBeGreaterThanOrEqual(0);
  expect(r.caixa.x + r.caixa.w).toBeLessThanOrEqual(r.vw);
  expect(r.caixa.y).toBeGreaterThanOrEqual(0);
  expect(r.vh - (r.caixa.y + r.caixa.h), 'folga da base >= 6 px').toBeGreaterThanOrEqual(5.5);
  expect(r.caixa.y, 'na metade de baixo').toBeGreaterThan(r.vh / 2);
  if (info.project.name === 'celular') expect(r.alvos.length, 'a camada de toque está visível na luta').toBeGreaterThan(3);
  for (const a of r.alvos) {
    const dentro = r.caixa.x < a.x + a.w && r.caixa.x + r.caixa.w > a.x && r.caixa.y < a.y + a.h && r.caixa.y + r.caixa.h > a.y;
    // #pad e #touch são contêineres amplos: só os botões e o joystick contam
    if (a.id === 'pad') continue;
    expect(dentro, `o medidor cobre "${a.id}" (${JSON.stringify(a)}) com ${JSON.stringify(r.caixa)}`).toBe(false);
  }
});

test('COPIAR: põe na área de transferência um JSON com aparelho, últimos 5 s e resumo por cena', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?fps=1');
  await pronto(page);
  await expect(page.locator('#fps')).toContainText(/\d+ fps/, { timeout: 10_000 });
  await page.waitForTimeout(1500);
  await page.locator('#fps').getByRole('button', { name: /copiar/i }).click();
  await expect(page.locator('#fps button')).toHaveText('COPIADO');
  const bruto = await page.evaluate(() => navigator.clipboard.readText());
  const rel = JSON.parse(bruto) as Record<string, any>;
  expect(rel['formato']).toBe('inno-fps-1');
  expect(rel['userAgent']).toEqual(expect.stringContaining('Mozilla'));
  expect(rel['dpr']).toBeGreaterThan(0);
  expect(rel['canvas']).toMatch(/^\d+x\d+$/);
  expect(rel['ultimos5s'].quadros).toBeGreaterThan(5);
  const cenas = Object.keys(rel['porCena']);
  expect(cenas.length).toBeGreaterThanOrEqual(1);
  const c = rel['porCena'][cenas[0]!];
  expect(c).toEqual(expect.objectContaining({ quadros: expect.any(Number), fps: expect.any(Number), p95: expect.any(Number), pior: expect.any(Number), rsMin: expect.any(Number), rsMax: expect.any(Number) }));
  expect(c.fps).toBeGreaterThan(0);
  await expect(page.locator('#fps button')).toHaveText('COPIAR', { timeout: 5000 });
});

test('o clique no COPIAR não vira entrada do jogo', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?fps=1&seed=3');
  await pronto(page);
  await expect(page.locator('#fps')).toContainText(/\d+ fps/, { timeout: 10_000 });
  const antes = await page.evaluate(() => (window as any).__inno.ui.name);
  await page.locator('#fps button').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__inno.ui.name)).toBe(antes);
});
