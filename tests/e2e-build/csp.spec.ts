/* Valida a CSP (<meta http-equiv>) contra o BUILD: playwright.build.config.ts, `npm run test:e2e:build`. */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

type Violacao = { diretiva: string; bloqueado: string };

/** Instala, antes de qualquer script da página: coletor de violações de CSP e espião de AudioContext. */
async function instrumentar(page: Page): Promise<{ erros: string[]; falhas: string[]; recursos: Map<string, number> }> {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: Violacao[]; __audio: number[] };
    w.__csp = [];
    w.__audio = [];
    document.addEventListener('securitypolicyviolation', (e) => w.__csp.push({ diretiva: e.effectiveDirective, bloqueado: e.blockedURI }));
    const Orig = window.AudioContext;
    window.AudioContext = class extends Orig {
      constructor(...a: ConstructorParameters<typeof Orig>) {
        super(...a);
        w.__audio.push(1);
      }
    } as typeof AudioContext;
  });
  const erros: string[] = [];
  const falhas: string[] = [];
  const recursos = new Map<string, number>();
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => falhas.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => recursos.set(new URL(r.url()).pathname, r.status()));
  return { erros, falhas, recursos };
}

const violacoes = (page: Page): Promise<Violacao[]> => page.evaluate(() => (window as unknown as { __csp: Violacao[] }).__csp);

const coresNoCanvas = (page: Page): Promise<number> =>
  page.locator('canvas#jogo').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const cores = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return cores.size;
  });

test.describe('CSP no build de produção', () => {
  test('a meta está no HTML servido, vem antes de qualquer script e bate com a política do vite.config', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/);
    expect(meta, 'meta CSP ausente no HTML do build').not.toBeNull();
    const politica = (meta?.[1] ?? '').replaceAll('&#39;', "'");
    expect(politica).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:",
    );
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script'));
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<link'));
    // sem script inline no HTML do build (senão 'script-src self' o quebraria)
    expect(html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? []).toEqual([]);
  });

  test('o dev server NÃO leva a meta (HMR injeta script inline)', () => {
    // o build de teste não serve o dev; confere a fonte: a meta só nasce no plugin `apply: build`
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toMatch(/apply:\s*'build'/);
    expect(readFileSync('index.html', 'utf8')).not.toContain('Content-Security-Policy');
  });

  test('a política está ATIVA: script inline, script de outra origem e fetch externo são bloqueados', async ({ page }) => {
    await instrumentar(page);
    await page.goto('/?seed=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const antes = (await violacoes(page)).length;
    const r = await page.evaluate(async () => {
      const w = window as unknown as { __rodou?: boolean };
      w.__rodou = false;
      const inline = document.createElement('script');
      inline.textContent = 'window.__rodou = true';
      document.head.append(inline);
      const externo = document.createElement('script');
      externo.src = 'https://example.invalid/x.js';
      document.head.append(externo);
      const fetchExterno = await fetch('https://example.invalid/').then(() => 'rodou', () => 'bloqueado');
      return { rodou: w.__rodou, fetchExterno };
    });
    expect(r).toEqual({ rodou: false, fetchExterno: 'bloqueado' });
    await page.waitForTimeout(200);
    const novas = (await violacoes(page)).slice(antes).map((v) => v.diretiva);
    expect(novas).toContain('script-src-elem');
    expect(novas).toContain('connect-src');
  });

  test('o jogo roda inteiro sob a CSP: carga da arte, áudio, menu, seleção, luta — zero violações', async ({ page }) => {
    const { erros, falhas, recursos } = await instrumentar(page);
    await page.goto('/?seed=7');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });

    // imagens WebP/JPG/PNG e JSON da arte vieram do próprio site, todos com 200
    const arte = [...recursos].filter(([p]) => /\.(webp|png|jpg|json)$/.test(p) && p.includes('/assets/'));
    expect(arte.length).toBeGreaterThan(5);
    expect(arte.filter(([p]) => p.endsWith('.webp')).length).toBeGreaterThan(0);
    expect(arte.filter(([, s]) => s !== 200)).toEqual([]);

    // as fontes do canvas (woff2 auto-hospedados) vieram do próprio site com 200, carregaram antes do 1º quadro e nenhuma violação de font-src
    const fontes = [...recursos].filter(([p]) => p.endsWith('.woff2'));
    expect(fontes.map(([p]) => p.split('/').pop()).sort()).toEqual(['bangers-latin-400-normal.woff2', 'barlow-600-latin.woff2', 'barlow-condensed-800-italic-latin.woff2']);
    expect(fontes.filter(([, s]) => s !== 200)).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('data-fontes', 'ok');
    expect(await page.evaluate(() => document.fonts.check('italic 800 20px "Barlow Condensed"') && document.fonts.check('600 20px Barlow'))).toBe(true);

    // o áudio só nasce depois do primeiro gesto; o AudioContext não pode ser barrado por CSP
    await page.keyboard.press('Enter'); // boot -> intro (cria o AudioContext)
    expect(await page.evaluate(() => (window as unknown as { __audio: unknown[] }).__audio.length)).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter'); // pula a abertura
    await page.waitForTimeout(600);
    await page.keyboard.press('Enter'); // título -> menu
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // LUTA vs CPU
    await page.waitForTimeout(900); // seleção: retratos e atlas sob demanda
    expect(await coresNoCanvas(page)).toBeGreaterThan(200);
    await page.keyboard.press('Enter'); // jogador
    await page.keyboard.press('Enter'); // adversário
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter'); // dificuldade
    await page.waitForTimeout(1200); // VS
    await page.keyboard.press('Enter'); // pula o confronto
    await page.waitForTimeout(4500); // abertura da luta: cenário JPG, sprites, HUD
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('z');
      await page.waitForTimeout(120);
    }
    await page.keyboard.up('ArrowRight');
    expect(await coresNoCanvas(page), 'o canvas da luta está vazio').toBeGreaterThan(200);

    expect(await violacoes(page)).toEqual([]);
    expect(erros).toEqual([]);
    expect(falhas).toEqual([]);
  });

  test('aviso "progresso não salvo" sob a CSP: aparece, não captura ponteiro, some sozinho', async ({ page }) => {
    const { erros } = await instrumentar(page);
    // simula cota cheia/modo privado só na gravação (a leitura segue funcionando)
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('cheio', 'QuotaExceededError');
      };
    });
    await page.goto('/?seed=7');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const aviso = page.locator('#aviso');
    await expect(aviso).toBeHidden();
    // OPÇÕES do menu: mexer num valor chama persist.salvar()
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown'); // OPÇÕES é o 6º item (ver cenas/menu.ts)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText('Progresso não salvo neste aparelho');
    await expect(aviso).toHaveAttribute('role', 'status');
    // não captura ponteiro: o ponto central do aviso pertence a outro elemento (o canvas)
    const caixa = (await aviso.boundingBox())!;
    const dono = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id, [caixa.x + caixa.width / 2, caixa.y + caixa.height / 2]);
    expect(dono).not.toBe('aviso');
    await expect(aviso).toBeHidden({ timeout: 9_000 });
    expect(await violacoes(page)).toEqual([]);
    expect(erros.filter((e) => !/QuotaExceeded|cheio/.test(e))).toEqual([]);
  });
});
