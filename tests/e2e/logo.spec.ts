/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/*
 * Logo OFICIAL do dono (docs/logo-oficial.md), integrada no jogo e MEDIDA no navegador (a D1 vetorial saiu): título (altura 330, centro x 480, topo y 4, CTA em y 352),
 * menu (horizontal, altura 86, centro 124,50), boot (splash em tela cheia, com a barra livre), abertura (mesmo retângulo x escala do impacto) e a varredura de luz.
 * Medido em 1280x720 (desktop) e em 915x412 e 844x390 (celular deitado, com a camada de toque): a logo não vaza da tela, não cobre botão nem HUD.
 * Os pixels do resto da tela continuam comparados com o protótipo em fidelidade-ui.spec.ts (que desliga a logo dos dois lados).
 * SALVAR_CAPTURAS=<pasta> grava os quadros.
 */
test.describe.configure({ timeout: 120_000 });

const PASTA = process.env['SALVAR_CAPTURAS'];
const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

interface Texto {
  t: string;
  x: number;
  y: number;
  w: number;
  al: string;
}

async function abrir(page: Page, vp: { width: number; height: number }): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    const w = window as any;
    w.__textos = [];
    w.__cones = 0;
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: any[]) {
      // x/y em px LÓGICOS (960x540): aplica a transformação atual (o texto arcade desenha com translate/scale) e tira o RS = 2
      const m = this.getTransform();
      w.__textos.push({ t: String(t), x: (m.a * x + m.c * y + m.e) / 2, y: (m.b * x + m.d * y + m.f) / 2, w: (this.measureText(String(t)).width * m.a) / 2, al: this.textAlign });
      return (o as any).call(this, t, x, y, ...r);
    };
    const cone = CanvasRenderingContext2D.prototype.createConicGradient;
    CanvasRenderingContext2D.prototype.createConicGradient = function (this: CanvasRenderingContext2D, ...a: [number, number, number]) {
      w.__cones++;
      return cone.apply(this, a);
    };
  });
  await page.setViewportSize(vp);
  await page.goto('/?seed=5&manual=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await page.waitForFunction(
    async () => {
      const m = await import(/* @vite-ignore */ '/src/ui/logo.ts' as string);
      return m.marcaPronta('principal') && m.marcaPronta('horizontal') && m.marcaPronta('splash');
    },
    undefined,
    { timeout: 30_000 },
  );
  return erros;
}

/** Põe a cena, anda `ticks` e devolve só o que o ÚLTIMO quadro escreveu. */
const quadro = (page: Page, js: string): Promise<Texto[]> =>
  page.evaluate(`(() => { const h = window.__inno; h.ui.fade = 0; h.ui.fadeDir = 0; ${js}; window.__textos = []; h.desenhar(); return window.__textos; })()`) as Promise<Texto[]>;

/** A logo desenhada SOZINHA num canvas 960x540 transparente (2x): caixa dos pixels visíveis (alfa > 8) e da massa opaca (alfa > 200), em px lógicos. */
const caixaDaLogo = (page: Page, peca: 'desenharLogo' | 'desenharLogoHorizontal', x: number, y: number, altura: number) =>
  page.evaluate(
    async ([peca, x, y, altura]) => {
      const L = await import(/* @vite-ignore */ '/src/ui/logo.ts' as string);
      const c = document.createElement('canvas');
      c.width = 1920;
      c.height = 1080;
      const g = c.getContext('2d')!;
      g.setTransform(2, 0, 0, 2, 0, 0);
      const ok = L[peca as string](g, x, y, altura, -1);
      const d = g.getImageData(0, 0, 1920, 1080).data;
      const bx = { v: [1e9, 1e9, -1, -1], o: [1e9, 1e9, -1, -1] };
      for (let i = 3; i < d.length; i += 4) {
        const a = d[i]!;
        if (a <= 8) continue;
        const p = (i - 3) / 4;
        const px = (p % 1920) / 2;
        const py = Math.floor(p / 1920) / 2;
        for (const [k, lim] of [['v', 8], ['o', 200]] as const) {
          if (a <= lim) continue;
          const b = bx[k];
          b[0] = Math.min(b[0]!, px);
          b[1] = Math.min(b[1]!, py);
          b[2] = Math.max(b[2]!, px + 0.5);
          b[3] = Math.max(b[3]!, py + 0.5);
        }
      }
      return { ok, visivel: bx.v, massa: bx.o };
    },
    [peca, x, y, altura] as const,
  );

type Cx = { x: number; y: number; w: number; h: number };
const comoCaixa = (b: number[]): Cx => ({ x: b[0]!, y: b[1]!, w: b[2]! - b[0]!, h: b[3]! - b[1]! });
const cruza = (a: Cx, b: Cx): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Caixas (px CSS) de tudo o que é toque: joystick, botões e pausa. */
const controles = (page: Page): Promise<Array<Cx & { id: string }>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('#joy, #touch .b')]
      .map((e) => ({ id: e.id || e.className, r: e.getBoundingClientRect() }))
      .filter((q) => q.r.width > 0)
      .map((q) => ({ id: q.id, x: q.r.x, y: q.r.y, w: q.r.width, h: q.r.height })),
  );

const PERFIS = [
  { nome: '1280x720', projeto: 'desktop', vp: { width: 1280, height: 720 } },
  { nome: '915x412', projeto: 'celular', vp: { width: 915, height: 412 } },
  { nome: '844x390', projeto: 'celular', vp: { width: 844, height: 390 } },
] as const;

async function capturar(page: Page, nome: string): Promise<void> {
  if (!PASTA) return;
  mkdirSync(resolve(PASTA), { recursive: true });
  await page.screenshot({ path: resolve(PASTA, `${nome}.png`) });
}

for (const perfil of PERFIS) {
  test.describe(`logo oficial em ${perfil.nome}`, () => {
    test.beforeEach(({}, info) => test.skip(info.project.name !== perfil.projeto, `só no ${perfil.projeto}`));

    test('título: altura 330, topo em y 4, centro x 480, sem o subtítulo desenhado, CTA em y 352 e recorde em y 381; cabe na tela e não cobre botão', async ({ page }) => {
      const erros = await abrir(page, perfil.vp);
      await hook(page, '(h) => { h.persist.hi = 12345; }');
      const textos = await quadro(page, "h.ui.set('title', { fromIntro: false }); h.avancar(2)");
      // o retângulo: a logo é a imagem inteira, centrada em 480 (+ a flutuação de 3 px), altura 330
      const caixa = await caixaDaLogo(page, 'desenharLogo', 480, 169, 330);
      expect(caixa.ok).toBe(true);
      const v = comoCaixa(caixa.visivel);
      // dentro da tela de 960x540 (nada vaza, nem as faíscas) e centrada: o centro da massa opaca fica a <= 1% do centro
      expect(v.x).toBeGreaterThan(0);
      expect(v.x + v.w).toBeLessThan(960);
      expect(v.y).toBeGreaterThanOrEqual(4 - 0.6);
      expect(v.y + v.h).toBeLessThanOrEqual(4 + 330 + 0.6);
      const m = comoCaixa(caixa.massa);
      expect(Math.abs(m.x + m.w / 2 - 480), 'centro x da massa opaca').toBeLessThanOrEqual(9.6);
      // proporção da imagem: 1600 x 1127, altura 330 -> largura 468,5
      const rect = await page.evaluate(async () => (await import(/* @vite-ignore */ '/src/ui/logo.ts' as string)).retanguloDaMarca('principal', 480, 169, 330));
      expect(rect.h).toBe(330);
      expect(rect.w).toBeCloseTo(468.5, 0);
      expect(rect.y).toBe(4);
      // textos do título: sem o subtítulo desenhado (está na faixa da arte), CTA em y 352 (a faixa de luz 337..367), recorde em y 381
      expect(textos.some((t) => /TORNEIO MUNDIAL/.test(t.t))).toBe(false);
      const cta = textos.find((t) => /PRESSIONE ENTER|TOQUE PARA JOGAR/.test(t.t));
      expect(cta?.y).toBe(352);
      expect(Math.min(...textos.filter((t) => /^RECORDE/.test(t.t)).map((t) => t.y)), 'recorde (a 1a passada e a sombra de 1,5 px)').toBe(381);
      // a logo (com a flutuação de +-3 px) termina antes da faixa do CTA (337) e do texto
      expect(4 + 330 + 3).toBeLessThanOrEqual(337);
      // em px CSS: nenhum controle de toque encosta na logo (que fica no centro; os botões ficam nas laterais)
      const cv = (await page.locator('canvas#jogo').boundingBox())!;
      const k = cv.width / 960;
      const css: Cx = { x: cv.x + v.x * k, y: cv.y + v.y * k, w: v.w * k, h: v.h * k };
      for (const c of await controles(page)) expect(cruza(css, c), `logo x ${c.id}`).toBe(false);
      await capturar(page, `logo-titulo-${perfil.nome}`);
      expect(erros).toEqual([]);
    });

    test('menu: horizontal de altura 86 com centro (124, 50), acima das opções (que começam em y 100), longe do HUD e dos botões', async ({ page }) => {
      const erros = await abrir(page, perfil.vp);
      const textos = await quadro(page, "h.ui.set('menu'); h.avancar(3)");
      const caixa = await caixaDaLogo(page, 'desenharLogoHorizontal', 124, 50, 86);
      expect(caixa.ok).toBe(true);
      const v = comoCaixa(caixa.visivel);
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.y).toBeGreaterThanOrEqual(0);
      expect(v.y + v.h, 'termina antes da 1ª opção (y 100)').toBeLessThanOrEqual(100);
      expect(v.x + v.w).toBeLessThan(300);
      const rect = await page.evaluate(async () => (await import(/* @vite-ignore */ '/src/ui/logo.ts' as string)).retanguloDaMarca('horizontal', 124, 50, 86));
      expect([rect.y, rect.h]).toEqual([7, 86]);
      expect(rect.w).toBeCloseTo(153.6, 0);
      expect(rect.x + rect.w / 2).toBeCloseTo(124, 6);
      // a 1ª opção do menu está logo abaixo (a logo não a cobre) e nenhum texto do menu passa por dentro do retângulo
      const arcade = textos.find((t) => t.t === 'ARCADE')!;
      expect(arcade.y).toBeGreaterThan(100);
      for (const t of textos) {
        const e = t.al === 'center' ? t.x - t.w / 2 : t.al === 'right' ? t.x - t.w : t.x;
        const caixaTexto: Cx = { x: e, y: t.y - 8, w: t.w, h: 16 };
        expect(cruza(caixaTexto, { x: v.x, y: v.y, w: v.w, h: v.h }), `texto "${t.t}" sobre a logo`).toBe(false);
      }
      const cv = (await page.locator('canvas#jogo').boundingBox())!;
      const k = cv.width / 960;
      const css: Cx = { x: cv.x + v.x * k, y: cv.y + v.y * k, w: v.w * k, h: v.h * k };
      for (const c of await controles(page)) expect(cruza(css, c), `logo x ${c.id}`).toBe(false);
      await capturar(page, `logo-menu-${perfil.nome}`);
      expect(erros).toEqual([]);
    });
  });
}

test.describe('logo oficial: boot, abertura, varredura e carregamento', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'só no desktop'));

  test('as três imagens vêm do próprio site (200, WebP), pesam o orçado e a proporção é a da arte', async ({ page }) => {
    const respostas = new Map<string, { status: number; tipo: string; bytes: number }>();
    page.on('response', async (r) => {
      if (!r.url().includes('/assets/ui/logo/')) return;
      respostas.set(new URL(r.url()).pathname.split('/').pop()!, { status: r.status(), tipo: r.headers()['content-type'] ?? '', bytes: (await r.body().catch(() => Buffer.alloc(0))).length });
    });
    await abrir(page, { width: 1280, height: 720 });
    await page.waitForTimeout(300);
    const esperados = ['logo-v1-1600.webp', 'logo-horizontal-v1-600.webp', 'splash-v1-1920x1080.webp'];
    for (const a of esperados) {
      expect(respostas.get(a)?.status, a).toBe(200);
      expect(respostas.get(a)?.tipo, a).toContain('image/webp');
    }
    const total = esperados.reduce((s, a) => s + (respostas.get(a)?.bytes ?? 0), 0);
    expect(total, 'o que o jogo baixa de logo: splash + principal + horizontal (orçado 441 KB)').toBeLessThanOrEqual(460 * 1024);
    const dims = await page.evaluate(async () => {
      const L = await import(/* @vite-ignore */ '/src/ui/logo.ts' as string);
      const r = (v: string) => L.retanguloDaMarca(v, 0, 0, 100);
      return { principal: r('principal').w, horizontal: r('horizontal').w, splash: r('splash').w };
    });
    expect(dims.principal).toBeCloseTo(100 * (1600 / 1127), 1);
    expect(dims.horizontal).toBeCloseTo(100 * (600 / 336), 1);
    expect(dims.splash).toBeCloseTo(100 * (1920 / 1080), 1);
  });

  test('boot: o splash em tela cheia (0,0,960,540), com a faixa da barra de progresso livre; antes da imagem, o fundo liso escuro', async ({ page }) => {
    const erros = await abrir(page, { width: 1280, height: 720 });
    // o splash sozinho: a arte (pixels claros ou saturados) termina antes da barra (y 350..364 lógicos, x 320..640)
    const r = await page.evaluate(async () => {
      const L = await import(/* @vite-ignore */ '/src/ui/logo.ts' as string);
      const c = document.createElement('canvas');
      c.width = 1920;
      c.height = 1080;
      const g = c.getContext('2d')!;
      g.setTransform(2, 0, 0, 2, 0, 0);
      const ok = L.desenharSplash(g);
      const d = g.getImageData(0, 0, 1920, 1080).data;
      let arte = 0;
      let total = 0;
      let ultimaLinha = 0;
      for (let y = 0; y < 1080; y++) {
        for (let x = 0; x < 1920; x++) {
          const i = (y * 1920 + x) * 4;
          const mx = Math.max(d[i]!, d[i + 1]!, d[i + 2]!);
          const mn = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
          const eArte = mx > 110 || mx - mn > 55;
          if (eArte) ultimaLinha = Math.max(ultimaLinha, y);
          if (y >= 700 && y < 728 && x >= 640 && x < 1280) {
            total++;
            if (eArte) arte++;
          }
        }
      }
      return { ok, arte, total, ultimaLinha: ultimaLinha / 2, canto: [...d.slice(0, 4)] };
    });
    expect(r.ok).toBe(true);
    expect(r.ultimaLinha, 'última linha da arte (px lógicos)').toBeLessThan(350);
    expect(r.arte / r.total, 'arte dentro da faixa da barra').toBeLessThan(0.02);
    // o boot desenha o splash por inteiro e o texto/barra por cima
    const textos = await quadro(page, "h.ui.set('boot'); h.avancar(3)");
    expect(textos.some((t) => /CLIQUE OU PRESSIONE|Carregando arte/.test(t.t))).toBe(true);
    await capturar(page, 'logo-boot-1280x720');
    // antes de a imagem chegar: fundo liso escuro e nenhum erro
    const antes = await page.evaluate(async () => {
      const L = await import(/* @vite-ignore */ '/src/ui/logo.ts' as string);
      const h = (window as any).__inno;
      L.reiniciarMarcaParaTeste(() => new Promise(() => undefined)); // nunca chega
      h.ui.fade = 0;
      h.ui.fadeDir = 0;
      h.ui.set('boot');
      h.desenhar();
      const c = document.getElementById('jogo') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(40, 40, 1, 1).data;
      return { pronta: L.marcaPronta('splash'), rgb: [d[0]!, d[1]!, d[2]!] };
    });
    expect(antes.pronta).toBe(false);
    expect(Math.max(...antes.rgb), 'fundo escuro').toBeLessThan(60);
    expect(erros).toEqual([]);
  });

  test('abertura: o impacto usa o mesmo retângulo do título multiplicado pela escala (3,2x -> 1x), sem emblema e sem anel; chega ao tamanho final do título', async ({ page }) => {
    const erros = await abrir(page, { width: 1280, height: 720 });
    const alturas = await page.evaluate(() => {
      const h = (window as any).__inno;
      const g = h.ui.c.ctx as CanvasRenderingContext2D;
      const orig = g.drawImage.bind(g);
      const registro: Array<[number, number]> = [];
      let tick = 0;
      (g as any).drawImage = (...a: any[]) => {
        // a logo é o desenho de ~1,42:1 de largura/altura com altura >= 300 (o resto da abertura é arte de lutador, cenário e texto)
        if (a.length === 5 && a[4] > 300 && Math.abs(a[3] / a[4] - 1600 / 1127) < 0.01) registro.push([tick, a[4]]);
        return (orig as any)(...a);
      };
      h.ui.fade = 0;
      h.ui.fadeDir = 0;
      h.ui.set('intro');
      for (const t of [118, 121, 124, 129, 135, 160]) {
        h.avancar(t - tick);
        tick = t;
        h.desenhar();
      }
      (g as any).drawImage = orig;
      return registro;
    });
    const porTick = Object.fromEntries(alturas.map(([t, a]) => [t, a]));
    expect(porTick[118], 'antes do impacto não há logo').toBeUndefined();
    expect(porTick[121], 't 121 (k 0,1): 3,2x -> 2,9x').toBeGreaterThan(330 * 2.5);
    expect(porTick[129], 'no impacto já quase no tamanho final').toBeLessThan(330 * 1.4);
    expect(porTick[160], 'depois do impacto: exatamente o tamanho do título').toBeCloseTo(330, 1);
    expect(await page.evaluate(() => (window as any).__cones), 'sem emblema/anel (createConicGradient)').toBe(0);
    await hook(page, "(h) => { h.ui.set('intro'); h.avancar(137); h.desenhar(); }");
    await capturar(page, 'logo-abertura-impacto-1280x720');
    expect(erros).toEqual([]);
  });

  test('varredura de luz: só acende onde há logo (A/B de pixels com controle negativo) e o menu a repete na horizontal', async ({ page }) => {
    await abrir(page, { width: 1280, height: 720 });
    const r = await page.evaluate(async () => {
      const L = await import(/* @vite-ignore */ '/src/ui/logo.ts' as string);
      const desenhar = (peca: string, x: number, y: number, h: number, shine: number) => {
        const c = document.createElement('canvas');
        c.width = 1920;
        c.height = 1080;
        const g = c.getContext('2d')!;
        g.setTransform(2, 0, 0, 2, 0, 0);
        L[peca](g, x, y, h, shine);
        return g.getImageData(0, 0, 1920, 1080).data;
      };
      const comparar = (peca: string, x: number, y: number, h: number) => {
        const base = desenhar(peca, x, y, h, -1);
        const base2 = desenhar(peca, x, y, h, -1);
        const luz = desenhar(peca, x, y, h, 0.5);
        let controle = 0;
        let fora = 0;
        let mudou = 0;
        for (let i = 0; i < base.length; i += 4) {
          if (base[i]! !== base2[i]! || base[i + 3]! !== base2[i + 3]!) controle++;
          if (base[i + 3]! === 0 && luz[i + 3]! > 0) fora++;
          if (Math.abs(base[i]! - luz[i]!) + Math.abs(base[i + 1]! - luz[i + 1]!) + Math.abs(base[i + 2]! - luz[i + 2]!) > 12) mudou++;
        }
        return { controle, fora, mudou };
      };
      return { titulo: comparar('desenharLogo', 480, 169, 330), menu: comparar('desenharLogoHorizontal', 124, 50, 86) };
    });
    expect(r.titulo.controle, 'dois desenhos iguais = 0 (controle negativo)').toBe(0);
    expect(r.titulo.fora, 'pixels acesos fora da logo').toBe(0);
    expect(r.titulo.mudou, 'a varredura muda pixels do título').toBeGreaterThan(2000);
    expect(r.menu.controle).toBe(0);
    expect(r.menu.fora).toBe(0);
    expect(r.menu.mudou).toBeGreaterThan(150);
  });

  test('título e menu no fluxo real: nenhuma chamada ao desenho antigo e a logo aparece quando a imagem chega (sem erro de console)', async ({ page }) => {
    const erros = await abrir(page, { width: 1280, height: 720 });
    for (const js of ["h.ui.set('boot'); h.avancar(3)", "h.ui.set('intro'); h.avancar(140)", "h.ui.set('title', { fromIntro: true }); h.avancar(3)", "h.ui.set('menu'); h.avancar(3)"]) await quadro(page, js);
    expect(await page.evaluate(() => (window as any).__cones)).toBe(0);
    expect(erros).toEqual([]);
  });
});
