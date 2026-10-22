/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';

/*
 * Tela cheia e versão do build (relato do dono, aparelho real: "a tela cheia não habilita nas Opções" e "nada mudou").
 *
 * O que o Chromium emulado PROVA: o liga/desliga no desktop e no toque (Pixel 7 emulado), o refazer-no-fim-do-toque quando o navegador recusa o
 * pedido feito no touchstart, o travamento em paisagem pedido, e o cartão de ajuda quando NÃO há Fullscreen API (iPhone: aqui simulado por
 * UA do Chrome do iOS + a API removida) com o texto cabendo no painel. O que NÃO prova: o comportamento do WebKit/iOS real, a regra de gesto do
 * Chrome do Android real (aqui reproduzida por um espião que recusa o pedido fora do touchend) e o "Adicionar à Tela de Início" do iOS.
 * SALVAR_CAPTURAS=<pasta> grava os quadros para conferência visual.
 */
test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const PASTA = process.env['SALVAR_CAPTURAS'];

const UA_IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1';

async function abrir(page: Page, antes?: () => Promise<void>): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await antes?.();
  await page.goto('/?seed=3&manual=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  return erros;
}

/** Espia todo fillText (texto, posição, largura medida) desde a página nascer. */
async function espiarTextos(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as any;
    w.__textos = [];
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: any[]) {
      if (w.__textos) w.__textos.push({ t: String(t), x, y, w: this.measureText(String(t)).width, al: this.textAlign });
      return (o as any).call(this, t, x, y, ...r);
    };
  });
}

interface Texto {
  t: string;
  x: number;
  y: number;
  w: number;
  al: string;
}

/** Desenha um quadro e devolve só o que ELE escreveu. */
const quadro = (page: Page): Promise<Texto[]> =>
  page.evaluate(() => {
    const w = window as any;
    w.__textos = [];
    w.__inno.desenhar();
    return w.__textos;
  });

const abrirOpcoes = (page: Page): Promise<void> => hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('options', { from: 'menu' }); h.avancar(2); h.desenhar(); }");

/** Centro (em px da página) da linha TELA CHEIA. */
async function centroDaLinha(page: Page): Promise<{ x: number; y: number; i: number }> {
  const r = await page.evaluate(() => {
    const s = (window as any).__inno.ui.scene;
    const i = s.m.items.findIndex((it: any) => typeof it.label === 'string' && it.label.startsWith('TELA CHEIA'));
    const cv = document.getElementById('jogo')!.getBoundingClientRect();
    const rc = s.m.rects[i];
    return { i, x: cv.x + ((rc.x + rc.w / 2) / 960) * cv.width, y: cv.y + ((rc.y + rc.h / 2) / 540) * cv.height };
  });
  return r;
}

async function toque(cdp: CDPSession, x: number, y: number, seguraMs = 40): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  if (seguraMs) await new Promise((r) => setTimeout(r, seguraMs));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const emTelaCheia = (page: Page): Promise<boolean> => page.evaluate(() => document.fullscreenElement !== null);

async function capturar(page: Page, nome: string): Promise<void> {
  if (!PASTA) return;
  mkdirSync(resolve(PASTA), { recursive: true });
  await page.locator('canvas#jogo').screenshot({ path: resolve(PASTA, `${nome}.png`) });
}

test.describe('tela cheia: onde a plataforma permite, funciona', () => {
  test('desktop: o clique na linha liga e desliga, e o valor acompanha', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = await abrir(page);
    await abrirOpcoes(page);
    const { x, y, i } = await centroDaLinha(page);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('DESLIGADA');
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].label`)).toBe('TELA CHEIA (F)');
    await page.mouse.click(x, y);
    await expect.poll(() => emTelaCheia(page)).toBe(true);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('LIGADA');
    await page.mouse.click(x, y);
    await expect.poll(() => emTelaCheia(page)).toBe(false);
    expect(erros).toEqual([]);
  });

  test('celular (Pixel 7): o toque na linha entra em tela cheia, pede paisagem e a linha não diz "(F)"', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await page.addInitScript(() => {
      const w = window as any;
      w.__lock = [];
      Object.defineProperty(screen.orientation, 'lock', { value: (o: string) => (w.__lock.push(o), Promise.resolve()), configurable: true });
    });
    const erros = await abrir(page);
    await abrirOpcoes(page);
    const { x, y, i } = await centroDaLinha(page);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].label`)).toBe('TELA CHEIA');
    await toque(await page.context().newCDPSession(page), x, y);
    await expect.poll(() => emTelaCheia(page)).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__lock)).toEqual(['landscape']);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('LIGADA');
    expect(erros).toEqual([]);
  });

  test('celular com a regra de gesto do Chrome do Android (o pedido só vale no fim do toque): o toque ainda entra em tela cheia', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await page.addInitScript(() => {
      const w = window as any;
      w.__pedidos = [];
      w.__gesto = false;
      // como o Chrome documenta: `touchstart` não é gesto de ativação; `pointerup` (toque) e `touchend` são (o pointerup vem ANTES do touchend)
      for (const ev of ['pointerup', 'touchend']) {
        window.addEventListener(
          ev,
          () => {
            w.__gesto = true;
            setTimeout(() => (w.__gesto = false), 0);
          },
          true,
        );
      }
      const orig = Element.prototype.requestFullscreen;
      Element.prototype.requestFullscreen = function (this: Element, ...a: any[]) {
        if (!w.__gesto) {
          w.__pedidos.push('recusado');
          return Promise.reject(new TypeError('API can only be initiated by a user gesture.'));
        }
        w.__pedidos.push('aceito');
        return (orig as any).apply(this, a);
      };
    });
    const erros = await abrir(page);
    await abrirOpcoes(page);
    const { x, y } = await centroDaLinha(page);
    await toque(await page.context().newCDPSession(page), x, y);
    await expect.poll(() => emTelaCheia(page)).toBe(true);
    expect(await page.evaluate(() => (window as any).__pedidos)).toEqual(['recusado', 'aceito']);
    expect(erros).toEqual([]);
  });

  test('celular com a regra de gesto: o toque MUITO curto (touchend antes da recusa) também funciona', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await page.addInitScript(() => {
      const w = window as any;
      w.__gesto = false;
      for (const ev of ['pointerup', 'touchend']) window.addEventListener(ev, () => ((w.__gesto = true), setTimeout(() => (w.__gesto = false), 200)), true);
      const orig = Element.prototype.requestFullscreen;
      // a recusa chega DEPOIS do fim do toque (assíncrona), como numa máquina lenta
      Element.prototype.requestFullscreen = function (this: Element, ...a: any[]) {
        if (!w.__gesto) return new Promise((_, rej) => setTimeout(() => rej(new TypeError('gesto')), 60));
        return (orig as any).apply(this, a);
      };
    });
    await abrir(page);
    await abrirOpcoes(page);
    const { x, y } = await centroDaLinha(page);
    await toque(await page.context().newCDPSession(page), x, y, 0);
    await expect.poll(() => emTelaCheia(page)).toBe(true);
  });
});

test.describe('tela cheia sem a API (iPhone com Chrome): a linha explica, não fica morta', () => {
  test.use({ userAgent: UA_IPHONE_CHROME });

  test('valor "COMO ATIVAR", o toque abre o cartão com o passo a passo dentro do painel, e outro toque fecha', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await espiarTextos(page);
    const erros = await abrir(page, async () => {
      await page.addInitScript(() => {
        // o WebKit do iOS não tem a API em elementos que não sejam <video>
        delete (Element.prototype as any).requestFullscreen;
        delete (Element.prototype as any).webkitRequestFullscreen;
        delete (Document.prototype as any).exitFullscreen;
        delete (Document.prototype as any).fullscreenEnabled;
      });
    });
    expect(await page.evaluate(() => typeof document.documentElement.requestFullscreen)).toBe('undefined');
    await abrirOpcoes(page);
    const { x, y, i } = await centroDaLinha(page);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('COMO ATIVAR');
    let textos = await quadro(page);
    expect(textos.some((t) => t.t === 'COMO ATIVAR')).toBe(true);
    expect(textos.some((t) => t.t.includes('TELA CHEIA NO IPHONE'))).toBe(false);
    await capturar(page, 'tela-cheia-iphone-linha');

    await toque(await page.context().newCDPSession(page), x, y);
    textos = await quadro(page);
    const titulo = textos.find((t) => t.t === 'TELA CHEIA NO IPHONE / IPAD');
    expect(titulo, 'cartão com o título').toBeTruthy();
    // só o que o CARTÃO desenhou (depois do título, na ordem do desenho): as linhas do menu ficam por baixo, escurecidas
    const corpo = textos.slice(textos.indexOf(titulo!) + 1).filter((t) => !t.t.startsWith('Toque, Enter'));
    const todos = corpo.map((t) => t.t).join(' | ');
    expect(todos).toContain('Compartilhar');
    expect(todos).toContain('Adicionar à Tela de Início');
    expect(todos).toContain('ícone');
    // cada linha cabe DENTRO do painel (x 110..850, y 120..442) com folga, com a largura medida na fonte carregada
    // (o título é texto arcade, desenhado com escala própria: conferido na captura, não pela posição crua)
    for (const t of corpo) {
      const esq = t.al === 'center' ? t.x - t.w / 2 : t.x;
      expect(esq, `${t.t} (esquerda)`).toBeGreaterThanOrEqual(110 + 20);
      expect(esq + t.w, `${t.t} (direita)`).toBeLessThanOrEqual(850 - 20);
      expect(t.y, `${t.t} (y)`).toBeLessThanOrEqual(442 - 50); // folga para o rodapé
    }
    const rodape = textos.find((t) => t.t.startsWith('Toque, Enter'))!;
    expect(rodape.y).toBeLessThan(442);
    const ultima = Math.max(...corpo.map((t) => t.y));
    expect(rodape.y - ultima, "o rodapé não encosta na última linha").toBeGreaterThanOrEqual(30);
    await capturar(page, 'tela-cheia-iphone-cartao');

    // fecha com outro toque (em qualquer ponto) e volta à lista
    await toque(await page.context().newCDPSession(page), x, y);
    textos = await quadro(page);
    expect(textos.some((t) => t.t.includes('TELA CHEIA NO IPHONE'))).toBe(false);
    expect(await hook(page, '(h) => h.ui.scene.cartao')).toBeNull();
    expect(erros).toEqual([]);
  });

  test('pelo teclado (Enter na linha) o cartão abre e ESC fecha SEM sair da tela', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrir(page, async () => {
      await page.addInitScript(() => {
        delete (Element.prototype as any).requestFullscreen;
        delete (Element.prototype as any).webkitRequestFullscreen;
      });
    });
    await abrirOpcoes(page);
    const i = (await centroDaLinha(page)).i;
    await hook(page, `(h) => { h.ui.scene.m.sel = ${i}; }`);
    await page.keyboard.press('Enter');
    expect(await hook(page, '(h) => h.ui.scene.cartao?.titulo')).toBe('TELA CHEIA NO IPHONE / IPAD');
    await page.keyboard.press('Escape');
    expect(await hook(page, '(h) => h.ui.scene.cartao')).toBeNull();
    expect(await hook(page, '(h) => h.ui.scene.constructor.name')).toBe('CenaOptions');
  });
});

test.describe('versão do build: o dono prova qual versão está vendo', () => {
  test('o rótulo (commit curto + data) aparece nas Opções, fora da dica, e bate com a identidade do build', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await espiarTextos(page);
    const erros = await abrir(page);
    const identidade = await page.evaluate(async () => {
      const m = await import(/* @vite-ignore */ '/src/versao.ts' as string);
      return { v: m.VERSAO, rotulo: m.rotuloDaVersao() };
    });
    expect(identidade.v.commit).toMatch(/^([0-9a-f]{7,}|dev)$/);
    expect(identidade.rotulo).toMatch(/^([0-9a-f]{7,}|dev)\+? · \d{2}\/\d{2} \d{2}:\d{2}$/);
    await abrirOpcoes(page);
    const textos = await quadro(page);
    const r = textos.find((t) => t.t === `versão ${identidade.rotulo}`);
    expect(r, 'rótulo desenhado').toBeTruthy();
    const dica = textos.find((t) => t.t.includes('escolher'))!;
    // canto direito da barra de baixo: dentro da tela e sem tocar a dica (centralizada)
    expect(r!.x).toBeLessThanOrEqual(960 - 10);
    expect(r!.x - r!.w).toBeGreaterThan(dica.x + dica.w / 2 + 10);
    expect(r!.y).toBeGreaterThan(540 - 30);
    await capturar(page, 'versao-opcoes');
    expect(erros).toEqual([]);
  });

  test('há versão mais nova no ar: avisa na tela e o toque recarrega furando o cache (?v=<commit>)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await espiarTextos(page);
    await page.route('**/version.json*', (rota) =>
      rota.fulfill({ contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ commit: 'abc1234', data: '2030-01-01T12:00:00.000Z', sujo: false }) }),
    );
    await abrir(page);
    await abrirOpcoes(page);
    await expect.poll(async () => (await quadro(page)).some((t) => t.t.includes('NOVA VERSÃO NO AR'))).toBe(true);
    const textos = await quadro(page);
    const aviso = textos.find((t) => t.t.includes('NOVA VERSÃO NO AR'))!;
    expect(aviso.x - aviso.w).toBeGreaterThan(540); // não encosta na dica
    expect(textos.some((t) => t.t.startsWith('versão '))).toBe(false);
    await capturar(page, 'versao-nova');
    const cv = await page.locator('canvas#jogo').boundingBox();
    await page.mouse.click(cv!.x + (aviso.x - aviso.w / 2) * (cv!.width / 960), cv!.y + (aviso.y / 540) * cv!.height);
    await page.waitForURL(/[?&]v=abc1234/);
  });

  test('sem version.json (servidor de desenvolvimento) ou com a mesma versão: sem aviso de versão nova', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await espiarTextos(page);
    const erros = await abrir(page);
    await abrirOpcoes(page);
    await page.waitForTimeout(300);
    expect((await quadro(page)).some((t) => t.t.includes('NOVA VERSÃO'))).toBe(false);
    const v = await page.evaluate(async () => (await import(/* @vite-ignore */ '/src/versao.ts' as string)).VERSAO);
    await page.route('**/version.json*', (rota) => rota.fulfill({ contentType: 'application/json', body: JSON.stringify(v) }));
    await hook(page, "(h) => { h.ui.set('menu'); h.avancar(2); h.ui.set('options', { from: 'menu' }); h.avancar(2); }");
    await page.waitForTimeout(300);
    expect((await quadro(page)).some((t) => t.t.includes('NOVA VERSÃO'))).toBe(false);
    expect(erros).toEqual([]);
  });
});

test.describe('app na tela de início (iOS/Android): metas e manifest', () => {
  test('index.html liga o manifest, o ícone de 180 px e as metas do iOS; o manifest e os ícones existem', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrir(page);
    const metas = await page.evaluate(() => ({
      capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
      android: document.querySelector('meta[name="mobile-web-app-capable"]')?.getAttribute('content'),
      manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
      icone: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
    }));
    expect(metas.capable).toBe('yes');
    expect(metas.android).toBe('yes');
    const m = await (await request.get(metas.manifest!)).json();
    expect(m).toMatchObject({ display: 'standalone', orientation: 'landscape', start_url: './' });
    expect(m.display_override).toEqual(['fullscreen', 'standalone']);
    for (const ic of m.icons as Array<{ src: string; sizes: string }>) {
      const r = await request.get(`/${ic.src}`);
      expect(r.status(), ic.src).toBe(200);
      expect(r.headers()['content-type']).toContain('image/png');
    }
    const apple = await request.get(metas.icone!);
    expect(apple.status()).toBe(200);
  });
});
