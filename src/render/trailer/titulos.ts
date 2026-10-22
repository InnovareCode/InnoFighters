import { ALTURA, LARGURA } from '../../core/constantes';
import { easeOut, lerp, clamp } from '../../core/math';
import { ALTURA_LETTERBOX } from '../../data/trailer/tipos';
import { FB, FH } from '../texto';
import { RS, type Ctx } from '../tela';
import { gradeDeCor } from './grade';

/*
 * Títulos do trailer: o desenho da direção de arte (docs/direcao-arte-trailer.md §4; referência numérica em arte-fonte/trailer/prototipo/arte-trailer.js).
 * Duas vozes de cor tiradas da logo: AÇO (o INNO) nas palavras de base e FOGO (o FIGHTERS) na ÚLTIMA palavra (a regra de ênfase dos balões). Barlow Condensed 800
 * itálico (`FH`), a mesma do HUD. Só desenho: o texto, a janela (`de`..`ate`, em ticks do plano) e o tick vêm do roteiro e do diretor.
 *
 * Custo: o título vai para uma camada fora da tela UMA vez por texto (`CacheDeTitulos`), recortada ao tamanho do texto (não à tela); por quadro sobra 1 `drawImage`
 * com escala. O reflexo (a faixa diagonal) é um `source-atop` numa cópia da camada, só nos 18 ticks dele. Nada de blend por pixel (WebKit).
 */

const TINTA = '#07040e';
const CREME = '#fff5e2';
const ACO: readonly (readonly [number, string])[] = [[0, '#ffffff'], [0.5, '#e6eeff'], [1, '#9fb4d8']];
const FOGO: readonly (readonly [number, string])[] = [[0, '#fff2b8'], [0.55, '#ffc53d'], [1, '#ff6a1a']];
const BRONZE: readonly (readonly [number, string])[] = [[0, '#ffd9a8'], [0.5, '#d08a4a'], [1, '#8c4f22']];

const grad = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, paradas: readonly (readonly [number, string])[]): CanvasGradient => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of paradas) g.addColorStop(o, c);
  return g;
};

/** Tamanhos (px lógicos): cartão no meio da tela e título na faixa de baixo; tracking de 4,5% do corpo. */
export const TAMANHO_DO_CARTAO = 64;
export const TAMANHO_NA_FAIXA = 40;
export const trackingDe = (tam: number): number => Math.round(tam * 0.045);
/** Centro vertical da faixa de baixo do letterbox (o título na faixa fica em 505,5). */
export const Y_DA_FAIXA = ALTURA - ALTURA_LETTERBOX / 2;

/** Separa a última palavra (a que vai em fogo): "DEZ NAÇÕES." -> ["DEZ ", "NAÇÕES."]. Uma palavra só vai inteira em fogo. */
export function partesDoCartao(texto: string): readonly [string, string] {
  const i = texto.lastIndexOf(' ');
  return i < 0 ? ['', texto] : [texto.slice(0, i + 1), texto.slice(i + 1)];
}

/** Escreve o título centrado na origem do contexto (a linha de base põe as caixas-altas centradas em y 0). Devolve a largura sem escala. */
function escreverTitulo(ctx: Ctx, texto: string, tam: number): number {
  const tracking = trackingDe(tam);
  const [a, b] = partesDoCartao(texto);
  ctx.save();
  ctx.font = FH(tam);
  (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${tracking}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const wa = ctx.measureText(a).width;
  const wb = ctx.measureText(b).width;
  const w = wa + wb - tracking;
  const x0 = -w / 2;
  const base = tam * 0.36;
  const yT = base - tam * 0.72;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillText(a, x0 + 2, base + 4);
  ctx.fillText(b, x0 + wa + 2, base + 4);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(5, tam * 0.12);
  ctx.strokeStyle = TINTA;
  ctx.strokeText(a, x0, base);
  ctx.strokeText(b, x0 + wa, base);
  ctx.save();
  ctx.shadowColor = 'rgba(255,110,30,.6)';
  ctx.shadowBlur = tam * 0.5;
  ctx.fillStyle = grad(ctx, 0, yT, 0, base, FOGO);
  ctx.fillText(b, x0 + wa, base);
  ctx.restore();
  ctx.fillStyle = grad(ctx, 0, yT, 0, base, ACO);
  ctx.fillText(a, x0, base);
  ctx.fillStyle = grad(ctx, 0, yT, 0, base, FOGO);
  ctx.fillText(b, x0 + wa, base);
  // fio do bisel: luz fina no alto das letras (o "metal" da logo)
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(x0 - 10, yT - 2, w + 20, tam * 0.08);
  ctx.restore();
  return w;
}

export interface CamadaDoTitulo {
  readonly canvas: HTMLCanvasElement;
  /** Cópia onde o reflexo corre (criada na 1ª vez que é preciso). */
  tmp: HTMLCanvasElement | null;
  /** Largura do texto (sem escala) e tamanho lógico da camada. */
  readonly w: number;
  readonly lw: number;
  readonly lh: number;
}

/** As camadas pré-renderizadas dos títulos (uma por texto e tamanho). Em Node (sem `document`) devolve null e quem chama pula o desenho. */
export class CacheDeTitulos {
  private readonly mapa = new Map<string, CamadaDoTitulo>();

  chave(texto: string, tam: number): string {
    return `${tam}|${texto}`;
  }

  tem(texto: string, tam: number): boolean {
    return this.mapa.has(this.chave(texto, tam));
  }

  get tamanho(): number {
    return this.mapa.size;
  }

  camada(texto: string, tam: number): CamadaDoTitulo | null {
    const k = this.chave(texto, tam);
    const guardada = this.mapa.get(k);
    if (guardada) return guardada;
    if (typeof document === 'undefined') return null;
    // largura medida num canvas de 1 px; a camada leva folga para o brilho de brasa (0,5 do corpo) e o contorno
    const m = document.createElement('canvas').getContext('2d');
    if (!m) return null;
    m.font = FH(tam);
    (m as Ctx & { letterSpacing: string }).letterSpacing = `${trackingDe(tam)}px`;
    const wTexto = m.measureText(texto).width;
    const pad = Math.ceil(tam * 0.5) + 12;
    const lw = Math.ceil(wTexto) + 2 * pad;
    const lh = Math.ceil(tam * 1.5) + 2 * pad;
    const c = document.createElement('canvas');
    c.width = lw * RS;
    c.height = lh * RS;
    const g = c.getContext('2d');
    if (!g) return null;
    g.setTransform(RS, 0, 0, RS, 0, 0);
    g.translate(lw / 2, lh / 2);
    const w = escreverTitulo(g, texto, tam);
    const camada: CamadaDoTitulo = { canvas: c, tmp: null, w, lw, lh };
    this.mapa.set(k, camada);
    return camada;
  }

  soltar(): void {
    this.mapa.clear();
  }
}

export interface OpcoesDoTitulo {
  readonly alfa?: number;
  readonly escala?: number;
  /** 0..1 = posição do reflexo (a faixa diagonal); fora disso = sem reflexo. */
  readonly reflexo?: number;
}

/** Desenha o título centrado em (cx, cy). Devolve a largura (sem escala), ou 0 se não há camada (Node). */
export function desenharTitulo(ctx: Ctx, cache: CacheDeTitulos, texto: string, cx: number, cy: number, tam: number, o: OpcoesDoTitulo = {}): number {
  const cam = cache.camada(texto, tam);
  if (!cam) return 0;
  const alfa = o.alfa ?? 1;
  if (alfa <= 0) return cam.w;
  let fonte = cam.canvas;
  const r = o.reflexo ?? -1;
  if (r >= 0 && r <= 1) {
    if (!cam.tmp) {
      cam.tmp = document.createElement('canvas');
      cam.tmp.width = cam.canvas.width;
      cam.tmp.height = cam.canvas.height;
    }
    const g = cam.tmp.getContext('2d');
    if (g) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, cam.tmp.width, cam.tmp.height);
      g.drawImage(cam.canvas, 0, 0);
      g.setTransform(RS, 0, 0, RS, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      const px = lerp(cam.lw / 2 - cam.w / 2 - 80, cam.lw / 2 + cam.w / 2 + 80, r);
      const gr = g.createLinearGradient(px - 40, 0, px + 40, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, 'rgba(255,255,255,.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.save();
      g.translate(px, cam.lh / 2);
      g.transform(1, 0, -0.35, 1, 0, 0);
      g.translate(-px, -cam.lh / 2);
      g.fillRect(px - 40, cam.lh / 2 - tam, 80, tam * 2);
      g.restore();
      g.globalCompositeOperation = 'source-over';
      fonte = cam.tmp;
    }
  }
  const esc = o.escala ?? 1;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.translate(cx, cy);
  ctx.scale(esc, esc);
  ctx.drawImage(fonte, -cam.lw / 2, -cam.lh / 2, cam.lw, cam.lh);
  ctx.restore();
  return cam.w;
}

// ---------------------------------------------------------------------------------------------------------------- cartões C1..C3

export const CENTRO_DO_CARTAO_Y = ALTURA / 2;
/** Com os selos (C3) o título sobe 14 px para caber a fileira de anéis. */
export const CENTRO_DO_CARTAO_COM_SELOS_Y = ALTURA / 2 - 14;

/** Fundo do cartão: o cenário em tela cheia com empurrão de 1,00 -> 1,04 no compasso e véu escuro, ou o radial roxo-preto; mais a luz quente atrás do texto e a grade de cor. */
export function desenharFundoDoCartao(ctx: Ctx, fundo: CanvasImageSource | null, tau: number, comSelos: boolean): void {
  if (fundo) {
    const s = 1 + 0.04 * (tau / 96);
    ctx.save();
    ctx.translate(LARGURA / 2, ALTURA / 2);
    ctx.scale(s, s);
    ctx.drawImage(fundo, -LARGURA / 2, -ALTURA / 2, LARGURA, ALTURA);
    ctx.restore();
    ctx.fillStyle = 'rgba(6,3,14,.62)';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  } else {
    const g = ctx.createRadialGradient(LARGURA / 2, ALTURA / 2, 20, LARGURA / 2, ALTURA / 2, 560);
    g.addColorStop(0, '#1a0f26');
    g.addColorStop(1, '#04020a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }
  // a luz quente atrás do texto (o "palco" do título): elipse achatada
  const cy = comSelos ? CENTRO_DO_CARTAO_COM_SELOS_Y : CENTRO_DO_CARTAO_Y;
  const e = ctx.createRadialGradient(LARGURA / 2, cy, 10, LARGURA / 2, cy, 360);
  e.addColorStop(0, 'rgba(255,130,50,.20)');
  e.addColorStop(1, 'rgba(255,130,50,0)');
  ctx.save();
  ctx.translate(LARGURA / 2, cy);
  ctx.scale(1, 0.32);
  ctx.translate(-LARGURA / 2, -cy);
  ctx.fillStyle = e;
  ctx.fillRect(0, cy - 400, LARGURA, 800);
  ctx.restore();
  gradeDeCor(ctx, 'cartao');
}

/** Alfa do título: acende em 3 ticks e apaga nos 6 últimos. */
export const alfaDoCartao = (tau: number, de: number, ate: number): number => clamp(Math.min((tau - de + 1) / 3, (ate - tau) / 6), 0, 1);
/** Escala: bate de 1,30 a 1,00 em 6 ticks e depois empurra devagar até 1,025. */
export function escalaDoCartao(tau: number, de: number, ate: number): number {
  const u = tau - de;
  return u < 6 ? lerp(1.3, 1, easeOut(u / 6)) : 1 + 0.025 * ((u - 6) / Math.max(1, ate - de - 6));
}
/** Reflexo: a faixa diagonal corre do tick 8 ao 26; -1 fora disso. */
export const reflexoDoCartao = (tau: number, de: number): number => {
  const u = tau - de;
  return u >= 8 && u <= 26 ? (u - 8) / 18 : -1;
};

export interface EntradaDoCartao {
  readonly ctx: Ctx;
  readonly cache: CacheDeTitulos;
  readonly texto: string;
  /** Tick no plano e a janela do título (roteiro). */
  readonly tau: number;
  readonly de: number;
  readonly ate: number;
  /** As 5 cores dos selos (só no C3): acendem um por colcheia. */
  readonly selos?: readonly string[];
  readonly reduzMovimento?: boolean;
}

/** O título do cartão (batida, reflexo, fio de brasa e, no C3, os selos). */
export function desenharCartao(e: EntradaDoCartao): void {
  const { ctx, tau, de, ate } = e;
  const u = tau - de;
  if (u < 0 || tau >= ate) return;
  const alfa = alfaDoCartao(tau, de, ate);
  const cy = e.selos ? CENTRO_DO_CARTAO_COM_SELOS_Y : CENTRO_DO_CARTAO_Y;
  const w = desenharTitulo(ctx, e.cache, e.texto, LARGURA / 2, cy, TAMANHO_DO_CARTAO, {
    alfa,
    escala: e.reduzMovimento ? 1 : escalaDoCartao(tau, de, ate),
    ...(e.reduzMovimento ? {} : { reflexo: reflexoDoCartao(tau, de) }),
  });
  // fio de brasa sob o título: abre do centro (ticks 4..14)
  const k = easeOut((u - 4) / 10);
  if (k > 0) {
    const fw = (w + 70) * k;
    const fy = cy + TAMANHO_DO_CARTAO * 0.58;
    ctx.save();
    ctx.globalAlpha = alfa;
    const g = ctx.createLinearGradient(LARGURA / 2 - fw / 2, 0, LARGURA / 2 + fw / 2, 0);
    g.addColorStop(0, 'rgba(255,211,107,0)');
    g.addColorStop(0.5, '#ffd36b');
    g.addColorStop(1, 'rgba(255,211,107,0)');
    ctx.shadowColor = 'rgba(255,120,40,.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = g;
    ctx.fillRect(LARGURA / 2 - fw / 2, fy, fw, 2);
    ctx.restore();
  }
  if (e.selos) desenharSelos(ctx, e.selos, tau, cy + TAMANHO_DO_CARTAO * 0.58 + 44, alfa);
}

/** Os 5 selos (anel com entalhe, o mesmo do balão do guardião): acendem um por colcheia a partir do tick 12. Luz local, não conta como flash. */
export function desenharSelos(ctx: Ctx, cores: readonly string[], tau: number, y: number, alfa: number): void {
  const passo = 46;
  const x0 = LARGURA / 2 - passo * 2;
  cores.forEach((cor, i) => {
    const acende = clamp((tau - (12 + i * 12)) / 6, 0, 1);
    const x = x0 + i * passo;
    const r = 13;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.lineWidth = 6;
    ctx.strokeStyle = TINTA;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = acende > 0 ? grad(ctx, 0, y - r, 0, y + r, BRONZE) : 'rgba(208,138,74,.28)';
    if (acende > 0) {
      ctx.shadowColor = cor;
      ctx.shadowBlur = 12 * acende;
    }
    ctx.globalAlpha = alfa * (0.35 + 0.65 * acende);
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2 + 0.32, Math.PI * 1.5 - 0.32);
    ctx.stroke();
    // o entalhe (o lacre): traço no topo
    ctx.beginPath();
    ctx.moveTo(x, y - r - 4);
    ctx.lineTo(x, y - r + 5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = acende > 0 ? cor : 'rgba(255,255,255,.08)';
    ctx.globalAlpha = alfa * (0.25 + 0.75 * acende);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ---------------------------------------------------------------------------------------------------------------- título na faixa (P0 e P8)

export const alfaDoTituloNaFaixa = (tau: number, de: number, ate: number): number => clamp(Math.min((tau - de + 1) / 4, (ate - tau) / 6), 0, 1);

/** Título sobre ação: na faixa preta de baixo, como legenda de cinema. Alfa em 4 ticks e deslize de 18 px vindo da direita em 8. */
export function desenharTituloNaFaixa(ctx: Ctx, cache: CacheDeTitulos, texto: string, tau: number, de: number, ate: number): void {
  const u = tau - de;
  if (u < 0 || tau >= ate) return;
  const dx = (1 - easeOut(u / 8)) * 18;
  desenharTitulo(ctx, cache, texto, LARGURA / 2 + dx, Y_DA_FAIXA, TAMANHO_NA_FAIXA, { alfa: alfaDoTituloNaFaixa(tau, de, ate) });
}

// ---------------------------------------------------------------------------------------------------------------- placa do lutador (P3..P7)

/** Geometria da placa na faixa de baixo (px lógicos): 36 de altura, centrada na faixa (y 487..523), x 34. */
export const PLACA = { x: 34, altura: 36, inclinacao: 9, y: ALTURA - ALTURA_LETTERBOX + Math.floor((ALTURA_LETTERBOX - 36) / 2) } as const;

export interface EntradaDaPlaca {
  readonly ctx: Ctx;
  readonly nome: string;
  readonly pais: string;
  readonly epiteto: string | undefined;
  /** Cor do lutador (`fire[0]`). */
  readonly cor: string;
  readonly tau: number;
  readonly de: number;
  readonly ate: number;
}

export const alfaDaPlaca = (tau: number, de: number, ate: number): number => clamp(Math.min(easeOut((tau - de) / 8) * 1.4, (ate - tau) / 6), 0, 1);

/** A placa: tarja em paralelogramo (tinta violeta, faixa e aro na cor do lutador), linhas de velocidade e o epíteto à direita, tudo dentro da faixa de baixo. */
export function desenharPlaca(e: EntradaDaPlaca): void {
  const { ctx, nome, pais, epiteto, cor, tau, de, ate } = e;
  const u = tau - de;
  if (u < 0 || tau >= ate) return;
  const k = easeOut(u / 8);
  const alfa = alfaDaPlaca(tau, de, ate);
  const h = PLACA.altura;
  const sk = PLACA.inclinacao;
  const x = PLACA.x - (1 - k) * 40;
  const y = PLACA.y;
  ctx.save();
  ctx.globalAlpha = alfa;
  const tracking = (ctx as Ctx & { letterSpacing: string });
  ctx.font = FH(28);
  tracking.letterSpacing = '1px';
  const wn = ctx.measureText(nome).width;
  ctx.font = FH(17);
  const sep = '  ·  ';
  const wp = ctx.measureText(sep + pais).width;
  const w = 20 + wn + wp + 18;
  const caminho = (): void => {
    ctx.beginPath();
    ctx.moveTo(x + sk, y);
    ctx.lineTo(x + w + sk, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  caminho();
  ctx.fillStyle = grad(ctx, 0, y, 0, y + h, [[0, '#261a4a'], [0.5, '#160e2e'], [1, '#0b0718']]);
  ctx.fill();
  ctx.save();
  caminho();
  ctx.clip();
  ctx.fillStyle = cor;
  ctx.fillRect(x - 2, y, 8 + sk, h);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(x, y, w + sk, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,.30)';
  ctx.fillRect(x, y + 2, w + sk, 1.2);
  ctx.restore();
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 3;
  caminho();
  ctx.lineWidth = 2;
  ctx.strokeStyle = cor;
  ctx.stroke();
  // linhas de velocidade (cor do lutador), à direita
  const lx = x + w + sk + 10;
  for (let i = 0; i < 3; i++) {
    const comp = [24, 18, 12][i] as number;
    const ly = y + 9 + i * 9;
    ctx.lineWidth = 3 - i * 0.5;
    ctx.strokeStyle = cor;
    ctx.beginPath();
    ctx.moveTo(lx - i * 3, ly);
    ctx.lineTo(lx - i * 3 + comp, ly);
    ctx.stroke();
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = FH(28);
  tracking.letterSpacing = '1px';
  ctx.fillStyle = 'rgba(4,2,10,.9)';
  ctx.fillText(nome, x + 20 + 1, y + 28 + 2);
  ctx.fillStyle = CREME;
  ctx.fillText(nome, x + 20, y + 28);
  ctx.font = FH(17);
  ctx.fillStyle = 'rgba(255,241,208,.82)';
  ctx.fillText(sep + pais, x + 20 + wn, y + 27);
  // epíteto à direita, na mesma faixa: legenda de cinema
  if (epiteto) {
    ctx.font = FB(16);
    tracking.letterSpacing = '0.5px';
    ctx.fillStyle = 'rgba(255,241,208,.78)';
    ctx.fillText(epiteto, lx + 36, y + 24);
  }
  tracking.letterSpacing = '0px';
  ctx.restore();
}
