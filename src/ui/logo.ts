import { criarCanvasPadrao, type CriarCanvas } from '../assets/canvas';
import { ARQUIVOS_DA_MARCA, PASTA_DA_MARCA } from '../assets/etapa0.mjs';
import { ALTURA, LARGURA } from '../core/constantes';
import type { IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';
import { LUTADORES, VITRINE } from '../data/lutadores';
import { desenharVinheta } from '../render/cenario';
import { desenharPose } from '../render/pose';
import { RS, type Ctx } from '../render/tela';
import type { ChegadaDeArte } from './chegada-de-arte';
import type { Ferramentas } from './ferramentas';
import type { Mundo } from './contexto';

export const GAME_NAME = 'INNO FIGHTERS';
/** Quem aparece no título (e a ordem do ciclo de cenários): a VITRINE, não o elenco inteiro. */
export const STAGE_OF: readonly IdLutador[] = VITRINE;

/** Cenário da casa de cada lutador da vitrine, na ordem da vitrine: é o ciclo de fundos do título. */
export const CICLO_VITRINE: readonly string[] = VITRINE.map((id) => LUTADORES[id].stage);

// ---------- a logo oficial do dono (docs/logo-oficial.md): imagem, não desenho ----------

/** Altura (px lógicos, em 960x540) da logo completa no título e na abertura. A largura sai da proporção da imagem (1,42). */
export const LOGO_ALTURA = 330;

/**
 * Centro vertical da logo completa no título e na abertura (topo y 4 + metade da altura). Também é de onde saem os raios de luz do título e a onda de choque
 * e as faíscas do impacto. É um OBJETO só porque o oráculo de fidelidade com o protótipo (cuja logo ficava em y 142) o reajusta no navegador: no jogo ninguém o muda.
 */
export const LAYOUT_DA_MARCA = { y: 169 };

/** Altura (px lógicos) da logo horizontal (sem a faixa do subtítulo) no menu; centro em (124, 50). */
export const LOGO_MENU = { altura: 86, x: 124, y: 50 } as const;

/**
 * Cores da marca que o JOGO ainda usa (a logo em si é imagem). As brasas do título e as faíscas do impacto ficam na família brasa (o fogo de FIGHTERS), sem relação com os
 * lutadores; `brilho` é a cor da varredura de luz que atravessa a logo.
 */
export const PALETA_MARCA = {
  brilho: [236, 244, 255] as const,
  brasas: ['#ffd27a', '#ff9a3d', '#ff5a12'] as readonly string[],
} as const;

export type VarianteDaMarca = 'principal' | 'horizontal' | 'splash';
type Fonte = CanvasImageSource & { readonly width: number; readonly height: number };

/**
 * Arquivos de `public/assets/ui/logo` (versão no nome: uma logo nova do dono vira `-v2`, e isso também quebra o cache do navegador). `larguraPre` é a largura em
 * pixels de CANVAS (= px lógicos x RS) em que a imagem é desenhada no tamanho normal: a imagem é reduzida UMA vez para essa largura, e não a cada quadro.
 */
const VARIANTES: Readonly<Record<VarianteDaMarca, { readonly arquivo: string; readonly larguraPre: number }>> = {
  principal: { arquivo: ARQUIVOS_DA_MARCA.principal, larguraPre: Math.round(LOGO_ALTURA * (1600 / 1127) * RS) },
  horizontal: { arquivo: ARQUIVOS_DA_MARCA.horizontal, larguraPre: Math.round(LOGO_MENU.altura * (600 / 336) * RS) },
  splash: { arquivo: ARQUIVOS_DA_MARCA.splash, larguraPre: 0 },
};

interface ImagemDaMarca {
  readonly fonte: Fonte;
  /** A mesma imagem já reduzida ao tamanho normal de desenho (null = a fonte já é pequena, ou é o splash). */
  readonly pre: HTMLCanvasElement | null;
}

/** Reduz a fonte UMA vez para `larguraPre` (alta qualidade). Sem necessidade de reduzir (fonte menor ou igual, ou `larguraPre` 0): sem pré-redimensionada. */
export function prepararImagemDaMarca(fonte: Fonte, larguraPre: number, criar: CriarCanvas = criarCanvasPadrao): ImagemDaMarca {
  if (larguraPre <= 0 || fonte.width <= larguraPre) return { fonte, pre: null };
  const altura = Math.round((fonte.height * larguraPre) / fonte.width);
  const c = criar(larguraPre, altura);
  const g = c.getContext('2d');
  if (!g) return { fonte, pre: null };
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(fonte, 0, 0, larguraPre, altura);
  return { fonte, pre: c };
}

export type CarregadorDeImagem = (url: string) => Promise<Fonte>;

/** Carrega e DECODIFICA uma imagem do próprio site (a CSP libera `img-src 'self'`). Fora do navegador (Node) falha: a marca só não aparece. */
const carregadorDeRede: CarregadorDeImagem = (url) =>
  new Promise((ok, falhou) => {
    if (typeof Image === 'undefined') {
      falhou(new Error('sem Image'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const pronta = typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve();
      void pronta.then(() => ok(img));
    };
    img.onerror = () => falhou(new Error(`não carregou ${url}`));
    img.src = url;
  });

let carregador: CarregadorDeImagem = carregadorDeRede;
let criarCanvas: CriarCanvas = criarCanvasPadrao;
let baseDaMarca = '/';
const estado = new Map<VarianteDaMarca, ImagemDaMarca | 'carregando' | 'falhou'>();
const camadasDeBrilho = new Map<VarianteDaMarca, HTMLCanvasElement>();

/** Só para teste: troca o carregamento por um falso e esquece o que já carregou. */
export function reiniciarMarcaParaTeste(c: CarregadorDeImagem = carregadorDeRede, base = '/', canvas: CriarCanvas = criarCanvasPadrao): void {
  carregador = c;
  criarCanvas = canvas;
  baseDaMarca = base;
  estado.clear();
  camadasDeBrilho.clear();
}

function carregarVariante(v: VarianteDaMarca): void {
  if (estado.has(v)) return;
  estado.set(v, 'carregando');
  const { arquivo, larguraPre } = VARIANTES[v];
  carregador(`${baseDaMarca}${PASTA_DA_MARCA}${arquivo}`).then(
    (fonte) => {
      try {
        estado.set(v, prepararImagemDaMarca(fonte, larguraPre, criarCanvas));
      } catch {
        estado.set(v, 'falhou');
      }
    },
    () => estado.set(v, 'falhou'),
  );
}

/**
 * Começa a baixar a marca (splash, logo completa e logo horizontal), sem esperar ninguém: chamada cedo no boot, em paralelo com as fontes e a arte. Idempotente.
 * Até ficarem prontas, as `desenhar*` devolvem false e a cena cai no que desenhava antes (o fundo liso do boot).
 */
export function iniciarMarca(base: string = import.meta.env.BASE_URL): void {
  baseDaMarca = base.endsWith('/') ? base : `${base}/`;
  for (const v of Object.keys(VARIANTES) as VarianteDaMarca[]) carregarVariante(v);
}

/** A imagem pronta da variante (ou null: ainda carregando, falhou ou nunca pedida; pedir aqui já inicia o carregamento). */
function imagemPronta(v: VarianteDaMarca): ImagemDaMarca | null {
  if (!estado.has(v)) carregarVariante(v);
  const e = estado.get(v);
  return typeof e === 'object' ? e : null;
}

/** A variante já está pronta para desenhar? (testes e o aviso de carregamento) */
export function marcaPronta(v: VarianteDaMarca): boolean {
  return imagemPronta(v) !== null;
}

/** Retângulo (px lógicos) que `desenharLogo`/`desenharLogoHorizontal` ocupam, centrado em (x, y) com essa altura; null se a imagem ainda não chegou. */
export function retanguloDaMarca(v: VarianteDaMarca, x: number, y: number, altura: number): { x: number; y: number; w: number; h: number } | null {
  const im = imagemPronta(v);
  if (!im) return null;
  const w = (altura * im.fonte.width) / im.fonte.height;
  return { x: x - w / 2, y: y - altura / 2, w, h: altura };
}

/** Varredura de luz: só onde há logo (`source-in` sobre a própria imagem), somada com `lighter`. Só roda enquanto `shine` está em [0, 1]. */
function varredura(ctx: Ctx, v: VarianteDaMarca, fonte: Fonte, x: number, y: number, w: number, h: number, shine: number): void {
  let tmp = camadasDeBrilho.get(v);
  if (!tmp || tmp.width !== fonte.width || tmp.height !== fonte.height) {
    tmp = criarCanvas(fonte.width, fonte.height);
    camadasDeBrilho.set(v, tmp);
  }
  const g = tmp.getContext('2d');
  if (!g) return;
  const Wt = tmp.width;
  const Ht = tmp.height;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, Wt, Ht);
  g.drawImage(fonte, 0, 0);
  g.globalCompositeOperation = 'source-in';
  const meia = Wt * 0.1;
  const cx = -Wt * 0.3 + shine * Wt * 1.6;
  const gr = g.createLinearGradient(cx - meia, 0, cx + meia, Ht * 0.4);
  const [br, bg, bb] = PALETA_MARCA.brilho;
  gr.addColorStop(0, `rgba(${br},${bg},${bb},0)`);
  gr.addColorStop(0.5, `rgba(${br},${bg},${bb},0.55)`);
  gr.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, Wt, Ht);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(tmp, x, y, w, h);
}

function desenharVariante(ctx: Ctx, v: VarianteDaMarca, x: number, y: number, altura: number, shine: number, alpha: number): boolean {
  const im = imagemPronta(v);
  if (!im || altura <= 0) return false;
  const w = (altura * im.fonte.width) / im.fonte.height;
  // no tamanho normal (ou menor) usa a versão já reduzida; ampliada (o impacto da abertura chega a 3,2x) usa a original
  const fonte: Fonte = im.pre && w * RS <= im.pre.width * 1.02 ? im.pre : im.fonte;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, x - w / 2, y - altura / 2, w, altura);
  if (shine >= 0 && shine <= 1) varredura(ctx, v, fonte, x - w / 2, y - altura / 2, w, altura, shine);
  ctx.restore();
  return true;
}

/**
 * Desenha a logo completa, centrada em (x, y), com `altura` em px lógicos (título e abertura: `LOGO_ALTURA`); `shine` (0..1) é a posição da varredura de luz.
 * Devolve false se a imagem ainda não está pronta (nada é desenhado).
 */
export function desenharLogo(ctx: Ctx, x: number, y: number, altura: number, shine: number, alpha = 1): boolean {
  return desenharVariante(ctx, 'principal', x, y, altura, shine, alpha);
}

/** A logo horizontal (sem a faixa do subtítulo): o menu. Mesmo contrato de `desenharLogo`. */
export function desenharLogoHorizontal(ctx: Ctx, x: number, y: number, altura: number, shine: number, alpha = 1): boolean {
  return desenharVariante(ctx, 'horizontal', x, y, altura, shine, alpha);
}

/** O splash do carregamento, em tela cheia (960x540 lógicos). Devolve false se ainda não chegou (a cena pinta o fundo liso de antes). */
export function desenharSplash(ctx: Ctx, alpha = 1): boolean {
  const im = imagemPronta('splash');
  if (!im) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im.fonte, 0, 0, LARGURA, ALTURA);
  ctx.restore();
  return true;
}

/** As peças da marca. As cenas chamam por aqui, então um teste pode trocá-las (ex.: medir o resto da tela sem a logo). */
export const marca = { desenharLogo, desenharLogoHorizontal, desenharSplash };

const imagemDoCenario = (m: Mundo, id: string): CanvasImageSource => m.rec.cenarios.get(id) ?? m.rec.cenarioPadrao;
export const cenarioDoCiclo = imagemDoCenario;

/** Fundo do título: os 4 cenários em sequência, com movimento lento de câmera. Devolve o índice em destaque. */
export function desenharCicloDeCenarios(ctx: Ctx, m: Mundo, t: number): number {
  const per = 420;
  const n = CICLO_VITRINE.length;
  const i = Math.floor(t / per) % n;
  const k = (t % per) / per;
  const nxt = (i + 1) % n;
  const kb = (img: CanvasImageSource, p: number, a: number): void => {
    const z = 1.08 + p * 0.1;
    const ox = Math.sin(p * Math.PI) * 18 - p * 30;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(LARGURA / 2 + ox, ALTURA / 2);
    ctx.scale(z, z);
    ctx.drawImage(img, -LARGURA / 2 - 20, -ALTURA / 2 - 12, LARGURA + 40, ALTURA + 24);
    ctx.restore();
  };
  kb(imagemDoCenario(m, CICLO_VITRINE[i] ?? 'jp'), k, 1);
  if (k > 0.86) kb(imagemDoCenario(m, CICLO_VITRINE[nxt] ?? 'jp'), (k - 0.86) * 0.7, (k - 0.86) / 0.14);
  return k > 0.86 ? ((k - 0.86) / 0.14 > 0.5 ? nxt : i) : i;
}

type Brasa = { x: number; y: number; vy: number; vx: number; s: number; ph: number; /** índice em PALETA_MARCA.brasas */ c: number };

/** Brasas coloridas subindo no título. */
export class Brasas {
  readonly lista: Brasa[];
  constructor(private readonly rng: Rng) {
    this.lista = Array.from({ length: 70 }, () => ({
      x: rng.entre(0, LARGURA), y: rng.entre(0, ALTURA), vy: rng.entre(0.3, 1.2), vx: rng.entre(-0.3, 0.3),
      s: rng.entre(1, 3.2), ph: rng.entre(0, 6.3), c: Math.floor(rng.entre(0, PALETA_MARCA.brasas.length)),
    }));
  }
  desenhar(ctx: Ctx, t: number, a = 1): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.lista) {
      e.y -= e.vy;
      e.x += e.vx + Math.sin(t / 50 + e.ph) * 0.3;
      if (e.y < -10) {
        e.y = ALTURA + 10;
        e.x = this.rng.entre(0, LARGURA);
      }
      const col = PALETA_MARCA.brasas[e.c] ?? PALETA_MARCA.brasas[0] ?? '#ff9a3d';
      ctx.globalAlpha = a * (0.35 + 0.35 * Math.sin(t / 12 + e.ph));
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Escurece em cima/embaixo + vinheta. */
export function gradacaoCinema(ctx: Ctx, m: Mundo): void {
  const g = ctx.createLinearGradient(0, 0, 0, ALTURA);
  g.addColorStop(0, 'rgba(6,2,16,.78)');
  g.addColorStop(0.42, 'rgba(6,2,16,.25)');
  g.addColorStop(0.75, 'rgba(6,2,16,.35)');
  g.addColorStop(1, 'rgba(6,2,16,.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  desenharVinheta(ctx, m.rec.vinheta);
}

/** Quadro da respiração parada do lutador (idle0..3 em vai-e-volta). */
export function quadroIdle(t: number, taxa = 10): string {
  const seq = [0, 1, 2, 3, 2, 1];
  return `idle${seq[Math.floor(t / taxa) % 6]}`;
}

/** Posições x da fileira: metade à esquerda, metade à direita, passo de 192 px a partir das bordas (4 heróis = 104, 296 | 664, 856). */
export function posicoesDaFileira(n: number): number[] {
  const esq = Math.ceil(n / 2);
  const dir = n - esq;
  return Array.from({ length: n }, (_, i) => (i < esq ? 104 + 192 * i : 856 - 192 * (dir - 1 - (i - esq))));
}

/** Os lutadores da vitrine enfileirados no título; `featured` brilha. */
export function fileiraDeHerois(f: Ferramentas, m: Mundo, t: number, featured: IdLutador, alpha = 1, chegada?: ChegadaDeArte): void {
  const { ctx } = f;
  const xs = posicoesDaFileira(VITRINE.length);
  const lado = Math.ceil(VITRINE.length / 2);
  VITRINE.forEach((id, i) => {
    const r = m.elenco[id];
    // chegada suave: o herói cuja arte chega com o título já aberto sobe de 0 a 1 em 12 ticks (com a arte pronta desde o início, `a` = `alpha` e o desenho é o de sempre)
    const chega = chegada ? chegada.alfa(id, r.arte.pronta !== false, t) : 1;
    if (chega <= 0) return;
    const a = chega < 1 ? alpha * chega : alpha;
    const on = id === featured;
    const sc = on ? 0.94 : 0.84;
    const fac = i < lado ? 1 : -1;
    const x = xs[i] ?? 0;
    const y = 528;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(x, y - 120, 10, x, y - 120, 170);
    gl.addColorStop(0, r.ch.fire[0] + (on ? '66' : '22'));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - 170, y - 290, 340, 340);
    ctx.globalCompositeOperation = 'source-over';
    f.floorShadow(x, y, 70 * sc);
    desenharPose(ctx, r.ch, r.arte, quadroIdle(t + i * 13), x, y, sc, fac, on ? 1 : 0.82);
    if (on) desenharPose(ctx, r.ch, r.arte, quadroIdle(t + i * 13), x, y, sc, fac, 0, 0.08 + 0.06 * Math.sin(t / 10));
    ctx.restore();
  });
}
