/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect, test, type Page } from '@playwright/test';
import { transformWithOxc } from 'vite';

/*
 * Balões premium, "Tarja de Impacto" (docs/direcao-arte-baloes.md), medidos no JOGO REAL nos 3 perfis: 1280x720 (desktop), 915x412 e 844x390 (celular deitado; o 844x390 com o
 * entalhe do iPhone simulado: 47 px de cada lado). Mede: os 7 estilos desenham sem erro nos 3 momentos (entrada, meio, saída); o balão mais largo (a CURTA dupla com o WEI LONG) fica
 * dentro de [12, 948] e da área segura da janela; nenhum balão encosta num botão de toque; o texto da fala tem >= 17 px CSS no celular; o custo por quadro (A/B contra o balão
 * antigo e contra o desenho sem a textura em cache). SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080.
 */
test.describe.configure({ timeout: 300_000 });

const PASTA = process.env['SALVAR_CAPTURAS'];
const PERFIS = [
  { nome: '1280x720', projeto: 'desktop', vp: { width: 1280, height: 720 }, seg: 0 },
  { nome: '915x412', projeto: 'celular', vp: { width: 915, height: 412 }, seg: 0 },
  { nome: '844x390', projeto: 'celular', vp: { width: 844, height: 390 }, seg: 47 },
] as const;

const VARIANTES = ['abertura', 'revanche', 'decisivo', 'vitoria', 'vitoriaPerfeita', 'guardiao', 'zenon'] as const;

async function abrir(page: Page, vp: { width: number; height: number }, seg: number): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(`console: ${m.text()}`));
  await page.setViewportSize(vp);
  await page.goto('/?seed=3&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await page.evaluate(async () => {
    await document.fonts.load('400 24px Bangers');
    await document.fonts.ready;
  });
  if (seg) {
    // o Chromium não emula env(safe-area-*): o iPhone deitado tem ~47 px de cada lado e a camada de toque os respeita
    await page.evaluate((v) => {
      const t = document.getElementById('touch')!;
      t.style.setProperty('--seg-esq', `${v}px`);
      t.style.setProperty('--seg-dir', `${v}px`);
    }, seg);
  }
  return erros;
}

interface Cena {
  nome: string;
  c1: string;
  c2: string;
  modo: 'completa' | 'curta';
  tipo: 'abertura' | 'rodada' | 'vitoria';
  falas: Array<{ falante: 0 | 1; texto: string; variante: string }>;
  /** Fração da duração da janela em que desenhar (a fala já escrita por inteiro com 0,7). */
  quando?: number;
}

const FALA = 'Você não aguenta nem um golpe, WEI LONG!\nEu venho de longe, vim buscar o título.';
const CENAS: Cena[] = [
  { nome: 'abertura-wei-long', c1: 'wei-long', c2: 'hayato', modo: 'completa', tipo: 'abertura', falas: [{ falante: 0, texto: FALA, variante: 'abertura' }] },
  { nome: 'curta-dupla', c1: 'wei-long', c2: 'centella', modo: 'curta', tipo: 'abertura', falas: [{ falante: 0, texto: FALA, variante: 'abertura' }, { falante: 1, texto: '¡Plateia, conheçam CENTELLA!\nAgora, se despeçam.', variante: 'abertura' }] },
  { nome: 'revanche', c1: 'hayato', c2: 'centella', modo: 'completa', tipo: 'rodada', falas: [{ falante: 1, texto: 'Ainda de pé, HAYATO?', variante: 'revanche' }] },
  { nome: 'decisivo', c1: 'hayato', c2: 'caio', modo: 'completa', tipo: 'rodada', falas: [{ falante: 0, texto: 'Um round só, CAIO. Escolhe o fim.', variante: 'decisivo' }] },
  { nome: 'vitoria', c1: 'aminu', c2: 'caio', modo: 'completa', tipo: 'vitoria', falas: [{ falante: 0, texto: 'Rápido demais pra você?\nVolta quando trovejar.', variante: 'vitoria' }] },
  { nome: 'vitoria-perfeita', c1: 'centella', c2: 'hayato', modo: 'completa', tipo: 'vitoria', falas: [{ falante: 0, texto: 'Nem me tocou, HAYATO.\nRápido demais, eu disse.', variante: 'vitoriaPerfeita' }] },
  { nome: 'guardiao', c1: 'hayato', c2: 'camille', modo: 'completa', tipo: 'vitoria', falas: [{ falante: 1, texto: 'A rua ensina o que o dojo esconde.', variante: 'guardiao' }] },
  { nome: 'zenon-abertura', c1: 'hayato', c2: 'zenon', modo: 'completa', tipo: 'abertura', falas: [{ falante: 1, texto: 'Cada cerejeira cai a seu tempo, HAYATO.', variante: 'zenon' }] },
  { nome: 'zenon-vitoria', c1: 'hayato', c2: 'zenon', modo: 'completa', tipo: 'vitoria', falas: [{ falante: 1, texto: 'Você lutou bem. Eu lutei melhor. Treine mais um pouco, rapaz.', variante: 'zenon' }] },
];

/** Monta a cena no jogo, anda a provocação até `quando` da 1ª janela, desenha e devolve os retângulos finais (px lógicos) e a janela. */
async function montar(page: Page, c: Cena, quando = 0.7): Promise<Array<{ i: number; x0: number; y0: number; x1: number; y1: number; variante: string }>> {
  return page.evaluate(
    async ([c, quando]) => {
      const P: any = await import(/* @vite-ignore */ '/src/render/provocacao.ts' as string);
      const h = (window as any).__inno;
      const elenco = h.mundo().elenco;
      h.ui.fade = 0;
      h.ui.fadeDir = 0;
      h.ui.set('fight', { cfg: { esquiva: true, mode: 'versus', c1: c.c1, c2: c.c2, cpu: null } });
      while (!h.ui.scene.espera.pronta) await new Promise((r) => setTimeout(r, 20));
      h.avancar(1);
      const s = h.ui.scene;
      const nomes = [elenco[c.c1].ch.name, elenco[c.c2].ch.name];
      const fala = (f: any) => ({ falante: f.falante, texto: f.texto, n: f.texto.length, variante: f.variante });
      const rot = P.montarRoteiro(c.tipo, c.modo, false, c.falas.map(fala));
      s.provocacao.zerar();
      s.provocacao.iniciar(rot, { pitch: [1, 1], nomes, cores: [elenco[c.c1].ch.fire[0], elenco[c.c2].ch.fire[0]] });
      const alvos: number[] = rot.janelas.map((j: any) => j.abre + Math.floor((j.fecha - j.abre) * quando));
      for (const a of alvos) {
        while (s.provocacao.tick < a) s.provocacao.avancar();
        h.desenhar();
      }
      return [...(s.provocacao.finais as Map<number, any>)].map(([i, r]) => ({ i, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, variante: rot.janelas[i].variante }));
    },
    [c, quando] as const,
  );
}

const controles = (page: Page): Promise<Array<{ id: string; x: number; y: number; w: number; h: number }>> =>
  page.evaluate(() =>
    [...document.querySelectorAll('#joy, #touch .b')]
      .map((e) => ({ id: e.id || e.className, r: e.getBoundingClientRect() }))
      .filter((q) => q.r.width > 0)
      .map((q) => ({ id: q.id, x: q.r.x, y: q.r.y, w: q.r.width, h: q.r.height })),
  );

async function salvar(page: Page, nome: string): Promise<void> {
  if (!PASTA) return;
  mkdirSync(resolve(PASTA), { recursive: true });
  const png: string = await page.evaluate(() => (document.getElementById('jogo') as HTMLCanvasElement).toDataURL('image/png'));
  writeFileSync(resolve(PASTA, `${nome}.png`), Buffer.from(png.split(',')[1]!, 'base64'));
}

for (const perfil of PERFIS) {
  test.describe(`balões premium em ${perfil.nome}`, () => {
    test.beforeEach(({}, info) => test.skip(info.project.name !== perfil.projeto, `só no ${perfil.projeto}`));

    test('as 9 cenas: dentro de [12, 948] e da área segura, sem encostar em botão de toque; a fala tem >= 17 px CSS no celular; a CURTA dupla (WEI LONG) não vaza', async ({ page }) => {
      const erros = await abrir(page, perfil.vp, perfil.seg);
      const cv = (await page.locator('canvas#jogo').boundingBox())!;
      const k = cv.width / 960;
      const ctl = await controles(page);
      const relato: string[] = [];
      for (const c of CENAS) {
        const rects = await montar(page, c);
        expect(rects.length, `${c.nome}: balões abertos`).toBe(c.falas.length);
        await salvar(page, `baloes-premium-${c.nome}-${perfil.nome}`);
        for (const r of rects) {
          expect(r.x0, `${c.nome} esquerda`).toBeGreaterThanOrEqual(12 - 0.01);
          expect(r.x1, `${c.nome} direita`).toBeLessThanOrEqual(948 + 0.01);
          expect(r.y0, `${c.nome} topo`).toBeGreaterThanOrEqual(62 - 0.01);
          // em px CSS: dentro da janela e da área segura (47 px de cada lado no iPhone deitado)
          const css = { x0: cv.x + r.x0 * k, x1: cv.x + r.x1 * k, y0: cv.y + r.y0 * k, y1: cv.y + r.y1 * k };
          expect(css.x0, `${c.nome} esquerda (CSS)`).toBeGreaterThanOrEqual(perfil.seg);
          expect(css.x1, `${c.nome} direita (CSS)`).toBeLessThanOrEqual(perfil.vp.width - perfil.seg);
          for (const b of ctl) {
            const cruza = css.x0 < b.x + b.w && css.x1 > b.x && css.y0 < b.y + b.h && css.y1 > b.y;
            expect(cruza, `${c.nome}: balão sobre o controle ${b.id}`).toBe(false);
          }
          relato.push(`${perfil.nome} ${c.nome} [${r.i}] ${r.variante}: x ${r.x0.toFixed(0)}..${r.x1.toFixed(0)} (CSS ${css.x0.toFixed(0)}..${css.x1.toFixed(0)}) y ${r.y0.toFixed(0)}..${r.y1.toFixed(0)}`);
        }
        expect(rects.map((r) => r.variante), `${c.nome}: a variante vem do roteiro`).toEqual(c.falas.map((f) => f.variante));
      }
      // o corpo da fala em px CSS: Bangers 24 lógicos x (largura CSS / 960); caixa alta de 0,727 em
      const fonteCss = 24 * k;
      if (perfil.projeto === 'celular') {
        expect(fonteCss, 'fonte da fala em px CSS').toBeGreaterThanOrEqual(17);
        expect(fonteCss * 0.727, 'caixa alta da Bangers em px CSS (a direção de arte: 12,6 em 844x390)').toBeGreaterThanOrEqual(12.5);
        expect(19 * k, 'nome na plaquinha em px CSS').toBeGreaterThanOrEqual(13);
      }
      console.log(relato.join('\n'));
      expect(erros).toEqual([]);
    });
  });
}

test.describe('balões premium: variantes, animação e custo (desktop)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'só no desktop'));

  test('as 7 variantes desenham sem erro na entrada (tremor, pop), no meio e na saída (achata para a ponta), em COMPLETA e na versão sem animação', async ({ page }) => {
    const erros = await abrir(page, { width: 1280, height: 720 }, 0);
    for (const v of VARIANTES) {
      for (const [modo, quandos] of [['completa', [0.05, 0.4, 0.97, 1.05]], ['curta', [0.5]]] as const) {
        for (const q of quandos) {
          const c: Cena = { nome: `v-${v}`, c1: 'hayato', c2: 'caio', modo, tipo: 'rodada', falas: [{ falante: 0, texto: 'Ninguém segura o meu golpe, CAIO.', variante: v }] };
          const r = await montar(page, c, q);
          if (q <= 1) expect(r.length, `${v} ${modo} ${q}`).toBe(1);
        }
      }
      await salvar(page, `baloes-premium-variante-${v}`);
    }
    expect(erros).toEqual([]);
  });

  const GPU = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-accelerated-2d-canvas'];
  for (const modo of [{ nome: 'canvas por CPU (sem GPU)', args: [] as string[], teto: 4, lote: 200 }, { nome: 'canvas acelerado (SwiftShader)', args: GPU, teto: 5, lote: 25 }]) {
    test.describe(modo.nome, () => {
      test(`custo por quadro (A/B), ${modo.nome}: contra o balão de antes e contra o desenho sem as camadas em cache`, async ({ baseURL }) => {
        // cada modo abre o SEU navegador (as flags de GPU não podem mudar por describe)
        const navegador = await chromium.launch({ args: modo.args });
        const page = await navegador.newPage({ ...(baseURL ? { baseURL } : {}) });
        // o balão ANTIGO (HEAD) servido por rede como um módulo à parte: a comparação é contra o código que o dono viu, não contra uma lembrança
        const antigo = execSync('git show HEAD:src/render/balao.ts', { cwd: process.cwd(), maxBuffer: 10_000_000 }).toString();
        const js = (await transformWithOxc(antigo, 'balao-antigo.ts', {})).code.replace(/from '(\.\.?\/[^']+)'/g, (_m, p: string) => `from '${p}.ts'`);
        await page.route('**/src/render/balao-antigo.ts', (rota) => rota.fulfill({ contentType: 'application/javascript', body: js }));
        const erros = await abrir(page, { width: 1280, height: 720 }, 0);
        const r = await page.evaluate(async (lote) => {
          const N: any = await import(/* @vite-ignore */ '/src/render/balao.ts' as string);
          const A: any = await import(/* @vite-ignore */ '/src/render/balao-antigo.ts' as string);
          const h = (window as any).__inno;
          const ctx = h.ui.c.ctx as CanvasRenderingContext2D;
          const fala = 'Rápido demais pra você?\nVolta quando trovejar, CAIO.';
          const cabeca = { x: 270, topo: 215, meiaLargura: 43, altura: 92 };
          const cN = N.medirBalao(ctx, fala, 'HAYATO');
          const pN = N.colocarBalao(cN, { lado: 'direita', nivel: 'cabeca' }, cabeca, [], [], N.LIMITES_COM_HUD);
          const cA = A.medirBalao(ctx, fala, 'HAYATO');
          const pA = A.colocarBalao(cA, { lado: 'direita', nivel: 'cabeca' }, cabeca, [], [], A.LIMITES_COM_HUD);
          const medir = (fn: () => void, n: number): number => {
            for (let i = 0; i < 40; i++) fn(); // aquecimento
            const amostras: number[] = [];
            for (let b = 0; b < 7; b++) {
              const t0 = performance.now();
              for (let i = 0; i < n; i++) fn();
              ctx.getImageData(0, 0, 1, 1); // força o canvas a terminar o que enfileirou
              amostras.push((performance.now() - t0) / n);
            }
            amostras.sort((a, b) => a - b);
            return amostras[3]!;
          };
          const quadro = (tick: number, variante: string) => ({ letras: Infinity, escala: 1, alfa: 1, seta: false, tick, corDoNome: '#6fe0ff', variante, desde: 99, reduz: false });
          let t = 0;
          const premium = medir(() => N.desenharBalao(ctx, cN, pN, quadro(t++, 'abertura')), lote);
          const semCache = medir(() => {
            N.esquecerCamadas();
            N.desenharBalao(ctx, cN, pN, quadro(t++, 'abertura'));
          }, lote);
          const decisivo = medir(() => N.desenharBalao(ctx, cN, pN, quadro(t++, 'decisivo')), lote);
          const zenon = medir(() => N.desenharBalao(ctx, cN, pN, quadro(t++, 'zenon')), lote);
          const antigoMs = medir(() => A.desenharBalao(ctx, cA, pA, { letras: Infinity, escala: 1, alfa: 1, seta: false, tick: t++, piscar: false, corDoNome: '#6fe0ff' }), lote);
          return { premium, semCache, decisivo, zenon, antigoMs, camadas: N.camadasGuardadas() };
        }, modo.lote);
        console.log(`custo por balão, ${modo.nome} (ms/quadro, mediana de 7 lotes de ${modo.lote}, canvas 1920x1080): antigo ${r.antigoMs.toFixed(3)} | premium com camadas em cache ${r.premium.toFixed(3)} | decisivo ${r.decisivo.toFixed(3)} | zenon ${r.zenon.toFixed(3)} | sem cache (repinta tudo todo quadro) ${r.semCache.toFixed(3)}`);
        // o cache vale a pena: repintar a retícula e o aro ponto a ponto todo quadro custa claramente mais
        expect(r.semCache, 'sem cache').toBeGreaterThan(r.premium * 1.25);
        // orçamento: um balão por quadro (dois na CURTA) a 60 fps deixa 16,7 ms
        expect(r.premium, 'premium em cache').toBeLessThan(modo.teto);
        expect(r.decisivo, 'decisivo (2 camadas e o brilho vivo)').toBeLessThan(modo.teto * 1.8);
        expect(r.zenon, 'zenon').toBeLessThan(modo.teto);
        expect(erros).toEqual([]);
        await navegador.close();
      });
    });
  }
});
