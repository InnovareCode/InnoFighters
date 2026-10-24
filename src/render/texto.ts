import { gradienteVertical } from './gradientes';
import type { Ctx } from './tela';

/**
 * Famílias do jogo, AUTO-HOSPEDADAS (public/assets/fontes, licença OFL; declaradas em src/fontes.css e carregadas antes do 1º quadro por
 * platform/fontes.ts): Barlow Condensed ExtraBold Itálico nos títulos (clima de arcade de luta, combina com a caixa alta) e Barlow SemiBold no
 * corpo (sans legível em minúsculas). Os fallbacks só valem se o arquivo não chegar; o arcade antigo (Impact / Segoe UI) fica no fim da lista.
 */
export const FAMILIA_TITULO = '"Barlow Condensed", "Arial Narrow", Impact, sans-serif';
export const FAMILIA_CORPO = 'Barlow, "Segoe UI", "Trebuchet MS", Arial, sans-serif';
/** Fonte de títulos (arcade, itálico condensado) e de corpo. Porte de FH/FB (famílias novas desde a tipografia do dono, 2026-10-21). */
export const FH = (tamanho: number): string => `italic 800 ${tamanho}px ${FAMILIA_TITULO}`;
export const FB = (tamanho: number): string => `600 ${tamanho}px ${FAMILIA_CORPO}`;
/**
 * Fonte das FALAS dos balões (letreiro de quadrinho, só caixa alta; direção de arte "Tarja de Impacto", docs/direcao-arte-baloes.md): Bangers auto-hospedada, com a
 * Barlow Condensed e a Impact como reserva (a Bangers só tem caixa alta: o texto vai em maiúsculas, `toLocaleUpperCase('pt-BR')`).
 */
export const FONTE_DA_FALA = (tamanho: number): string => `400 ${tamanho}px Bangers, "Barlow Condensed", Impact, sans-serif`;
/**
 * Fonte de impacto marcante para a tarja e nome do golpe especial:
 * Bangers com Barlow Condensed e Impact como reserva imediata.
 */
export const FONTE_DO_ESPECIAL = (tamanho: number): string => `400 ${tamanho}px Bangers, "Barlow Condensed", Impact, sans-serif`;

export type Alinhamento = 'left' | 'center' | 'right';
/** Cor sólida ou gradiente vertical [topo, base]. */
export type Preenchimento = string | readonly [string, string];

/** Texto de título: contorno grosso, preenchimento sólido ou degradê vertical. Porte de arcadeText. */
export function textoArcade(
  ctx: Ctx,
  texto: string,
  x: number,
  y: number,
  tamanho: number,
  preenchimento: Preenchimento,
  contorno = '#000',
  alinhamento: Alinhamento = 'center',
  escala = 1,
  alfa = 1,
  fonte?: string,
): void {
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  ctx.font = fonte ?? FH(tamanho);
  ctx.textAlign = alinhamento;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(4, tamanho / 6);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = contorno;
  ctx.strokeText(texto, 0, 0);
  let tinta: string | CanvasGradient;
  if (typeof preenchimento === 'string') {
    tinta = preenchimento;
  } else {
    tinta = gradienteVertical(ctx, preenchimento[0], preenchimento[1], -tamanho * 0.5, tamanho * 0.5); // D3a: um degradê por (cores, tamanho), não um por chamada
  }
  ctx.fillStyle = tinta;
  ctx.fillText(texto, 0, 0);
  ctx.restore();
}

export interface OpcoesTexto {
  font?: string;
  base?: CanvasTextBaseline;
  alpha?: number;
  /** Sombra leve deslocada (padrão: ligada). */
  shadow?: boolean;
}

/** Texto de corpo com sombra leve. Porte de T(). */
export function texto(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  tamanho: number,
  cor = '#fff',
  alinhamento: Alinhamento = 'left',
  o: OpcoesTexto = {},
): void {
  ctx.save();
  ctx.font = o.font ?? FB(tamanho);
  ctx.textAlign = alinhamento;
  ctx.textBaseline = o.base ?? 'middle';
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.fillText(str, x + 1.5, y + 1.5);
  }
  ctx.fillStyle = cor;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Quebra o texto em linhas de no máximo `larguraMax` px; devolve quantas linhas desenhou. Porte de wrapText. */
export function textoQuebrado(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  larguraMax: number,
  alturaLinha: number,
  tamanho: number,
  cor: string,
  alinhamento: Alinhamento = 'left',
): number {
  ctx.save();
  ctx.font = FB(tamanho);
  const palavras = String(str).split(' ');
  let linha = '';
  let yy = y;
  let n = 0;
  for (const p of palavras) {
    const tentativa = linha ? `${linha} ${p}` : p;
    if (ctx.measureText(tentativa).width > larguraMax && linha) {
      texto(ctx, linha, x, yy, tamanho, cor, alinhamento);
      linha = p;
      yy += alturaLinha;
      n++;
    } else {
      linha = tentativa;
    }
  }
  if (linha) {
    texto(ctx, linha, x, yy, tamanho, cor, alinhamento);
    n++;
  }
  ctx.restore();
  return n;
}

/** Caminho de retângulo com cantos arredondados (não preenche). Porte de rr. */
export function retanguloArredondado(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface OpcoesPainel {
  r?: number;
  c0?: string;
  c1?: string;
  lw?: number;
  stroke?: string;
}

/** Painel translúcido de menu. Porte de panel(). */
export function painel(ctx: Ctx, x: number, y: number, w: number, h: number, o: OpcoesPainel = {}): void {
  ctx.save();
  retanguloArredondado(ctx, x, y, w, h, o.r ?? 10);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, o.c0 ?? 'rgba(26,18,52,.88)');
  g.addColorStop(1, o.c1 ?? 'rgba(8,6,22,.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = o.lw ?? 2;
  ctx.strokeStyle = o.stroke ?? 'rgba(255,255,255,.28)';
  ctx.stroke();
  ctx.restore();
}

/** Tecla de teclado desenhada (tela "como jogar"). Porte de keycap(). */
export function tecla(ctx: Ctx, rotulo: string, x: number, y: number, w = 34, h = 34, destaque = false): void {
  ctx.save();
  retanguloArredondado(ctx, x, y, w, h, 6);
  ctx.fillStyle = destaque ? '#ffd23f' : '#e9edf7';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1b1f33';
  ctx.stroke();
  retanguloArredondado(ctx, x + 2, y + h - 7, w - 4, 5, 3);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fill();
  ctx.font = FB(rotulo.length > 2 ? 12 : 17);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1b1f33';
  ctx.fillText(rotulo, x + w / 2, y + h / 2 - 2);
  ctx.restore();
}

/** Paralelogramo das barras do HUD; `lado` 1 inclina para um lado, 2 para o outro. Porte de slantPath. */
export function caminhoInclinado(ctx: Ctx, x: number, y: number, w: number, h: number, inclinacao: number, lado: 1 | 2): void {
  ctx.beginPath();
  if (lado === 1) {
    ctx.moveTo(x + inclinacao, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - inclinacao, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - inclinacao, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + inclinacao, y + h);
  }
  ctx.closePath();
}
