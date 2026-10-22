/* Manifest, ícones, metas do iOS e version.json no BUILD de produção, sob a CSP: playwright.build.config.ts, `npm run test:e2e:build`. */
import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

test.describe('app na tela de início e versão, no build', () => {
  test('o HTML do build liga manifest, ícone de 180 px e as metas do iOS; manifest e ícones respondem 200', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes"');
    const manifestHref = html.match(/<link rel="manifest" href="([^"]+)"/)?.[1];
    const iconeHref = html.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)?.[1];
    expect(manifestHref, 'link do manifest no HTML').toBeTruthy();
    expect(iconeHref, 'apple-touch-icon no HTML').toBeTruthy();
    const m = await request.get(manifestHref!);
    expect(m.status()).toBe(200);
    const manifest = await m.json();
    expect(manifest).toMatchObject({ display: 'standalone', orientation: 'landscape', start_url: './', scope: './' });
    for (const ic of manifest.icons as Array<{ src: string }>) {
      const r = await request.get(new URL(ic.src, new URL(manifestHref!, 'http://127.0.0.1:4173/')).toString());
      expect(r.status(), ic.src).toBe(200);
    }
    expect((await request.get(iconeHref!)).status()).toBe(200);
  });

  test('version.json está no ar, bate com a identidade embutida no código e a CSP deixa o jogo consultá-lo (connect-src self)', async ({ page, request }) => {
    const violacoes: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') violacoes.push(m.text());
    });
    await page.addInitScript(() => {
      const w = window as unknown as { __csp: string[] };
      w.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.effectiveDirective} ${e.blockedURI}`));
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const doServidor = await (await request.get('/version.json')).json();
    expect(doServidor.commit).toMatch(/^[0-9a-f]{7,}$|^dev$/);
    expect(Date.parse(doServidor.data)).toBeGreaterThan(Date.parse('2026-01-01'));
    // o mesmo que o jogo faz (sem cache), a partir da página, sob a CSP
    const daPagina = await page.evaluate(async () => (await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })).json());
    expect(daPagina).toEqual(doServidor);
    // a identidade do build está embutida no JS que a página carregou (é o que o rótulo das Opções mostra)
    const scripts = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.endsWith('.js')));
    let achou = false;
    for (const s of scripts) {
      const js = await (await request.get(s)).text();
      if (js.includes(doServidor.commit) && js.includes(doServidor.data)) achou = true;
    }
    expect(achou, 'commit e data do version.json dentro do bundle').toBe(true);
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
    expect(violacoes.filter((m) => /Content Security Policy|Refused/i.test(m))).toEqual([]);
  });
});
