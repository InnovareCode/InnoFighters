/* O trailer de abertura no BUILD: o pedaço lazy (chunk `trailer-*.js`) carrega sob a CSP (script-src 'self'), o 1º gesto o abre e nada é bloqueado. */
import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

test('o pedaço lazy do trailer carrega sob a CSP e o gesto do boot abre o trailer, sem violação nem erro', async ({ page }) => {
  const erros: string[] = [];
  const recursos = new Map<string, number>();
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  page.on('response', (r) => recursos.set(new URL(r.url()).pathname, r.status()));
  await page.goto('/?seed=7');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  // o pedaço baixa quando a arte termina (ui.ready), enquanto o boot espera o gesto
  await expect.poll(() => [...recursos.keys()].filter((p) => /\/assets\/trailer-[^/]+\.js$/.test(p)).length, { timeout: 15_000 }).toBe(1);
  const chunk = [...recursos].find(([p]) => /\/assets\/trailer-[^/]+\.js$/.test(p));
  expect(chunk?.[1]).toBe(200);
  await page.waitForTimeout(1_500); // o import resolve e a música compila no tempo ocioso
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/em-trailer/, { timeout: 5_000 });
  await page.waitForTimeout(2_500);
  // o trailer está desenhando (P0: o cenário sai do preto e o raio cai no tempo 3 do c1) e os controles de toque não existem aqui (desktop)
  const cores = await page.locator('canvas#jogo').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const s = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) s.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return s.size;
  });
  expect(cores).toBeGreaterThan(50);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
  expect(erros).toEqual([]);
  // qualquer tecla depois do tick 10 o pula para o título (e some a classe do body)
  await page.keyboard.press('x');
  await expect(page.locator('body')).not.toHaveClass(/em-trailer/, { timeout: 5_000 });
});
