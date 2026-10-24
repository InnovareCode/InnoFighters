/*
 * O pacote de amostras (public/assets/sons/) é OPCIONAL: contra o BUILD de produção, manifesto quebrado NUNCA derruba o jogo. Cai na síntese de hoje.
 * Cenário real que motivou: o GitHub Pages guarda o JS por 10 min; um deploy que muda o manifesto, com o JS antigo em cache, dá "id fora da tabela"; e proxies
 * devolvem 200 com um JSON de erro. Antes da correção (src/audio/camadas.ts, `falharAlto` só em DEV/CI) isso era TELA PRETA.
 * Roda com `npm run test:e2e:build` (build + preview na 4173). Os ganchos `window.__inno` não existem aqui: o jogo é dirigido pelo teclado.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });
// O service worker (T7) atende estes pedidos por dentro e o `page.route` do Playwright NÃO os vê: o spec testa o fallback de ÁUDIO, não o SW (esse é o service-worker.spec). Sem o bloqueio as rotas falsas nunca disparam.
test.use({ serviceWorkers: 'block' });

const URL_MANIFESTO = '**/assets/sons/manifesto.json*';

interface Variante {
  readonly nome: string;
  readonly status: number;
  readonly tipo: string;
  readonly corpo: string;
  /** console.error do próprio jogo (o "Failed to load resource" do Chromium para o 404 não conta). */
  readonly errosDoJogo: number;
}

const VARIANTES: readonly Variante[] = [
  // parseia, mas não passa na validação: o jogo avisa UMA vez (console.error) e segue na síntese
  { nome: 'JSON vazio {}', status: 200, tipo: 'application/json', corpo: '{}', errosDoJogo: 1 },
  { nome: 'JSON de erro de proxy (Bad Gateway)', status: 200, tipo: 'application/json', corpo: '{"error":"Bad Gateway","status":502}', errosDoJogo: 1 },
  // ausente/ilegível: síntese em silêncio (console.info), sem erro
  { nome: 'HTML no lugar do JSON (fallback de SPA)', status: 200, tipo: 'text/html', corpo: '<!doctype html><html><body>Not JSON</body></html>', errosDoJogo: 0 },
  { nome: '404', status: 404, tipo: 'text/plain', corpo: 'not found', errosDoJogo: 0 },
];

interface Coleta {
  readonly errosConsole: string[];
  readonly errosPagina: string[];
  readonly mp3: string[];
  manifesto: number;
}

function coletar(page: Page): Coleta {
  const c: Coleta = { errosConsole: [], errosPagina: [], mp3: [], manifesto: 0 };
  page.on('pageerror', (e) => c.errosPagina.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') c.errosConsole.push(m.text());
  });
  page.on('request', (r) => {
    const caminho = new URL(r.url()).pathname;
    if (caminho.endsWith('.mp3')) c.mp3.push(caminho);
    if (caminho.endsWith('/manifesto.json')) c.manifesto++;
  });
  return c;
}

const coresNoCanvas = (page: Page): Promise<number> =>
  page.locator('canvas#jogo').evaluate((el) => {
    const cv = el as HTMLCanvasElement;
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const cores = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return cores.size;
  });

/** Do boot até a luta (CPU x CPU de sempre), pelo teclado, como o jogador. `trailer=0`: o 1º gesto não abre o trailer. */
async function entrarNaLuta(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __audio: number };
    w.__audio = 0;
    const Orig = window.AudioContext;
    window.AudioContext = class extends Orig {
      constructor(...a: ConstructorParameters<typeof Orig>) {
        super(...a);
        w.__audio++;
      }
    } as typeof AudioContext;
  });
  await page.goto('/?seed=7&trailer=0');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await page.keyboard.press('Enter'); // boot -> intro (nasce o AudioContext)
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter'); // pula a abertura
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter'); // título -> menu
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // LUTA vs CPU
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter'); // jogador
  await page.keyboard.press('Enter'); // adversário
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter'); // dificuldade
  await page.waitForTimeout(1200); // VS
  await page.keyboard.press('Enter'); // pula o confronto
  await page.waitForTimeout(4500); // abertura da luta
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('z');
    await page.waitForTimeout(120);
  }
  await page.keyboard.up('ArrowRight');
}

test.describe('manifesto de amostras quebrado no BUILD: o jogo abre e luta com a síntese', () => {
  for (const v of VARIANTES) {
    test(`${v.nome}: abre, luta, ${v.errosDoJogo} console.error e nenhum .mp3 pedido`, async ({ page }) => {
      const c = coletar(page);
      await page.route(URL_MANIFESTO, (r: Route) => r.fulfill({ status: v.status, contentType: v.tipo, body: v.corpo }));
      await entrarNaLuta(page);

      expect(c.manifesto, 'o manifesto interceptado foi mesmo pedido').toBeGreaterThan(0);
      expect(await page.evaluate(() => (window as unknown as { __audio: number }).__audio), 'o AudioContext nasceu (a síntese tem onde tocar)').toBeGreaterThan(0);
      expect(await coresNoCanvas(page), 'o canvas da luta está vazio (tela preta)').toBeGreaterThan(200);
      expect(c.errosPagina).toEqual([]);
      const doJogo = c.errosConsole.filter((t) => !t.startsWith('Failed to load resource'));
      expect(doJogo, 'console.error do jogo').toHaveLength(v.errosDoJogo);
      if (v.errosDoJogo === 1) expect(doJogo[0]).toMatch(/amostras|pacote/i);
      expect(c.mp3, 'nenhuma folha pedida sem manifesto válido').toEqual([]);
    });
  }

  test('CONTROLE (prova que a asserção de .mp3 pode falhar): manifesto verdadeiro, sem erro, e a `base.mp3` é pedida', async ({ page }) => {
    const c = coletar(page);
    await entrarNaLuta(page);
    expect(c.errosPagina).toEqual([]);
    expect(c.errosConsole).toEqual([]);
    expect(c.mp3).toContain('/assets/sons/base.mp3');
    expect(await coresNoCanvas(page)).toBeGreaterThan(200);
  });
});

test.describe('painel de escuta (?escuta=1) com rede lenta', () => {
  test('o 1º A/B, com as amostras ainda baixando, avisa "Carregando as amostras..." e não toca; depois de chegarem, toca', async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    // rede lenta DETERMINÍSTICA: as folhas ficam presas até o teste soltá-las (nada de setTimeout adivinhando a velocidade)
    const presas: Route[] = [];
    let soltas = false;
    await page.route('**/assets/sons/*.mp3*', (r: Route) => {
      if (soltas) void r.continue();
      else presas.push(r);
    });
    await page.goto('/?escuta=1');
    await expect(page.locator('#escuta')).toBeVisible({ timeout: 60_000 });
    const estado = page.locator('#escuta .estado');
    const botaoAB = page.getByRole('button', { name: /Soco leve · A\/B/ });

    await botaoAB.click();
    await expect(estado).toContainText('Carregando as amostras');
    await expect(estado).not.toContainText('1º a AMOSTRA');
    expect(presas.length, 'a base (e as folhas dos lutadores) foram pedidas e estão presas').toBeGreaterThan(0);

    soltas = true;
    for (const r of presas.splice(0)) void r.continue();
    // ao chegarem e decodificarem, o mesmo clique passa a tocar o A/B (poll no estado, não em tempo fixo)
    await expect
      .poll(
        async () => {
          await botaoAB.click();
          return (await estado.textContent()) ?? '';
        },
        { timeout: 30_000, intervals: [500] },
      )
      .toMatch(/A\/B soco leve/);
    expect(erros).toEqual([]);
  });
});
