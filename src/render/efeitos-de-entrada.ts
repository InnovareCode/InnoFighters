import { ALTURA, GROUND, LARGURA } from '../core/constantes';
import { clamp } from '../core/math';
import { az, mistura } from './estilos-especiais';
import type { EfeitoDeEntrada } from './roteiros-de-entrada';
import type { Ctx } from './tela';

/*
 * EFEITOS DE CENA DA ENTRADA DRAMÁTICA dos guardiões (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §2.2 e §2.3). São desenho PURO do tick, em coordenadas da TELA
 * (960x540), por cima do mundo e por baixo das faixas e do cartão: vapor (AMINU), holofotes (CENTELLA), neblina (CAMILLE), luar (NILA), vento (BAATAR). O ZENON tem os
 * braseiros da arena `gr` (arena-gr.ts), que não passam por aqui.
 *
 * Orçamento (contado por teste): no máximo `LIMITE_DE_PRIMITIVAS` operações de desenho (fill, stroke, fillRect, ...) por quadro; sem `shadowBlur`, sem `filter` e sem
 * `getImageData`; NENHUM consumo do `rngVisual` (o sorteio é um hash do índice, `az`), então a sequência dos efeitos da luta é a mesma com ou sem a entrada.
 */

/** Teto de primitivas por quadro (o mesmo orçamento da arena `gr`). */
export const LIMITE_DE_PRIMITIVAS = 14;

export type VistaDoEfeito = {
  readonly efeito: EfeitoDeEntrada;
  /** Quanto o efeito já "acendeu" (0 a 1): sobe nos primeiros ticks da COMPLETA; a CURTA já nasce em 1. */
  readonly progresso: number;
  /** Tick da entrada (anima o movimento). */
  readonly tick: number;
  /** Opacidade geral (faixas entrando/saindo e o fade do fim). */
  readonly alfa: number;
  /** A cor do lutador (`accent`), que tinge o efeito. */
  readonly cor: string;
  /** Onde o chefão está NA TELA (x do centro e y do chão), já com a câmera, o zoom e o deslocamento da entrada. */
  readonly alvo: { readonly x: number; readonly chao: number };
};

const W = LARGURA;
const H = ALTURA;
/** A altura das faixas de cinema (px): o efeito não passa dela embaixo nem em cima. */
const FAIXA = 56;
const DOIS_PI = Math.PI * 2;

/** Uma elipse macia (gradiente radial escalado): `cx, cy`, semi-eixos `rx, ry`, cor `rgb` ("r,g,b") e alfa do centro. 1 primitiva. */
function mancha(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rgb: string, alfa: number): void {
  if (alfa <= 0.003) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${alfa.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, DOIS_PI);
  ctx.fill();
  ctx.restore();
}

const rgbDe = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/** AMINU: 3 colunas de vapor (índigo, ocre, índigo) subindo das cubas de tinta (3 baforadas macias por coluna, que crescem e somem), mais uma névoa baixa. 10 primitivas. */
function vapor(ctx: Ctx, v: VistaDoEfeito): void {
  const { tick, progresso: p, alfa } = v;
  const base = H - FAIXA - 8;
  // névoa baixa, tingida de índigo
  const n = ctx.createLinearGradient(0, base - 130, 0, base);
  n.addColorStop(0, 'rgba(40,52,140,0)');
  n.addColorStop(1, `rgba(40,52,140,${(0.42 * p * alfa).toFixed(3)})`);
  ctx.fillStyle = n;
  ctx.fillRect(0, base - 130, W, 130);
  const cores = ['86,106,226', '232,176,64', '86,106,226'];
  const xs = [92, 480, 868];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      // cada baforada sobe em laço de 120 ticks, defasada; cresce, balança e some no alto
      const fase = ((tick * 0.9 + j * 40 + i * 17) % 120) / 120;
      const x = (xs[i] as number) + Math.sin(tick / 21 + i * 2.1 + j) * (12 + fase * 22);
      const y = base - 20 - fase * 300 * Math.min(1, 0.4 + p);
      mancha(ctx, x, y, 38 + fase * 50, 34 + fase * 44, cores[i] as string, Math.sin(fase * Math.PI) * 0.6 * p * alfa);
    }
  }
}

/** CENTELLA: 2 holofotes que cruzam e travam nela (cone + poça de luz) e 12 confetes em 3 cores. 4 + 3 primitivas. */
function holofotes(ctx: Ctx, v: VistaDoEfeito): void {
  const { tick, progresso: p, alfa, alvo } = v;
  const trava = clamp((p - 0.15) / 0.7, 0, 1);
  const suave = trava * trava * (3 - 2 * trava);
  ctx.globalCompositeOperation = 'lighter';
  const luz = ['255,246,200', rgbDe(mistura(v.cor, '#ffffff', 0.5))];
  for (let i = 0; i < 2; i++) {
    const lado = i === 0 ? -1 : 1;
    const apiceX = i === 0 ? 130 : W - 130;
    // cada cone começa do lado oposto, cruza o palco e trava no alvo (balanço que morre ao travar)
    const mira = alvo.x + lado * 330 * (1 - suave) * Math.cos(suave * Math.PI * 2.4) + Math.sin(tick / 21 + i * 2) * 5 * suave;
    const topo = -20;
    const chao = alvo.chao + 6;
    const g = ctx.createLinearGradient(0, topo, 0, chao);
    g.addColorStop(0, `rgba(${luz[i]},${(0.34 * alfa * p).toFixed(3)})`);
    g.addColorStop(1, `rgba(${luz[i]},${(0.08 * alfa * p).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(apiceX - 14, topo);
    ctx.lineTo(apiceX + 14, topo);
    ctx.lineTo(mira + 74, chao);
    ctx.lineTo(mira - 74, chao);
    ctx.closePath();
    ctx.fill();
    mancha(ctx, mira, chao, 92, 15, luz[i] as string, 0.5 * alfa * p);
  }
  ctx.globalCompositeOperation = 'source-over';
  // confetes: 12 retângulos, 4 por cor, caindo em laço (posição por hash do índice)
  const confete = clamp((p - 0.5) / 0.5, 0, 1) * alfa;
  if (confete <= 0.01) return;
  const cores = ['#ffd23f', '#ff4f5e', '#3fa9ff'];
  ctx.globalAlpha = 0.9 * confete;
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    for (let j = 0; j < 4; j++) {
      const i = c * 4 + j;
      const x = az(0xc0f3, i) * W;
      const y = ((az(0xc0f4, i) * (H + 40) + tick * (1.5 + az(0xc0f5, i) * 1.3)) % (H + 40)) - 20;
      ctx.rect(x + Math.sin(tick / 9 + i) * 6, y, 6, 10);
    }
    ctx.fillStyle = cores[c] as string;
    ctx.fill();
  }
}

/** CAMILLE: 2 camadas de neblina deslizando (2 manchas cada) e um feixe de farol que varre o cais. 4 + 2 primitivas. */
function neblina(ctx: Ctx, v: VistaDoEfeito): void {
  const { tick, progresso: p, alfa, alvo } = v;
  const a = p * alfa;
  const camadas: readonly { y: number; ry: number; vel: number; a: number }[] = [
    { y: alvo.chao - 30, ry: 56, vel: 0.5, a: 0.5 },
    { y: alvo.chao - 150, ry: 76, vel: -0.32, a: 0.36 },
  ];
  camadas.forEach((c, i) => {
    for (let k = 0; k < 2; k++) {
      const x = ((tick * c.vel + k * 520 + i * 180) % (W + 520) + (W + 520)) % (W + 520) - 260;
      mancha(ctx, x, c.y, 330, c.ry, '226,232,240', c.a * a);
    }
  });
  // o feixe do farol: um leque a partir do canto alto da esquerda, varrendo devagar
  ctx.globalCompositeOperation = 'lighter';
  const ang = 0.18 + Math.sin(tick / 70) * 0.22;
  const px = 70;
  const py = 70;
  const len = 1100;
  const aberto = 0.085;
  const g = ctx.createLinearGradient(px, py, px + Math.cos(ang) * len, py + Math.sin(ang) * len);
  g.addColorStop(0, `rgba(255,250,222,${(0.3 * a).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,250,222,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(ang - aberto) * len, py + Math.sin(ang - aberto) * len);
  ctx.lineTo(px + Math.cos(ang + aberto) * len, py + Math.sin(ang + aberto) * len);
  ctx.closePath();
  ctx.fill();
  mancha(ctx, px, py, 40, 40, '255,250,222', 0.7 * a);
  ctx.globalCompositeOperation = 'source-over';
}

/** Onde pendem as 6 lamparinas da NILA: 3 de cada lado, no alto, acima das cabeças e fora do cartão do centro (acendem da esquerda para a direita). */
const LAMPARINAS_X: readonly number[] = [50, 140, 230, 730, 820, 910];
const LAMPARINAS_Y: readonly number[] = [150, 126, 150, 150, 126, 150];

/** NILA: um cone de luz do luar caindo sobre ela e 6 lamparinas acendendo da esquerda para a direita, como os braseiros. 2 + até 6 primitivas. */
function luar(ctx: Ctx, v: VistaDoEfeito): void {
  const { tick, progresso: p, alfa, alvo } = v;
  const a = p * alfa;
  ctx.globalCompositeOperation = 'lighter';
  const topo = FAIXA - 6;
  const chao = alvo.chao + 8;
  const g = ctx.createLinearGradient(0, topo, 0, chao);
  g.addColorStop(0, `rgba(196,214,255,${(0.34 * a).toFixed(3)})`);
  g.addColorStop(1, `rgba(196,214,255,${(0.07 * a).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(alvo.x - 38, topo);
  ctx.lineTo(alvo.x + 38, topo);
  ctx.lineTo(alvo.x + 150, chao);
  ctx.lineTo(alvo.x - 150, chao);
  ctx.closePath();
  ctx.fill();
  mancha(ctx, alvo.x, chao, 150, 20, '196,214,255', 0.42 * a);
  // 6 lamparinas: cada uma acende em sequência (p * 6) e tremula de leve
  const rgb = rgbDe(mistura(v.cor, '#ffffff', 0.15));
  for (let i = 0; i < 6; i++) {
    const acesa = clamp(p * 7 - i, 0, 1);
    if (acesa <= 0) continue;
    const tremula = 0.82 + 0.18 * Math.sin(tick / 5 + i * 1.7);
    mancha(ctx, LAMPARINAS_X[i] as number, LAMPARINAS_Y[i] as number, 42, 42, rgb, 0.75 * acesa * tremula * alfa);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** BAATAR: 10 traços de poeira atravessando a tela com o vento e uma névoa de poeira baixa. 2 primitivas. */
function vento(ctx: Ctx, v: VistaDoEfeito): void {
  const { tick, progresso: p, alfa } = v;
  const a = p * alfa;
  const poeira = ctx.createLinearGradient(0, H - FAIXA - 150, 0, H - FAIXA);
  poeira.addColorStop(0, 'rgba(214,190,150,0)');
  poeira.addColorStop(1, `rgba(214,190,150,${(0.24 * a).toFixed(3)})`);
  ctx.fillStyle = poeira;
  ctx.fillRect(0, H - FAIXA - 150, W, 150);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const y = FAIXA + 30 + az(0xb4a7, i) * (H - 2 * FAIXA - 90);
    const vel = 7 + az(0xb4a8, i) * 9;
    const comp = 70 + az(0xb4a9, i) * 120;
    const x = ((az(0xb4aa, i) * (W + 300) + tick * vel) % (W + 300)) - 150;
    ctx.moveTo(x - comp, y - comp * 0.04);
    ctx.lineTo(x, y);
  }
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f4e8d0';
  ctx.globalAlpha = 0.75 * a;
  ctx.stroke();
}

/** Desenha o efeito da entrada neste quadro. Nada para `braseiros-gr` (mora na arena `gr`) nem com alfa/progresso nulos. */
export function desenharEfeitoDeEntrada(ctx: Ctx, v: VistaDoEfeito): void {
  if (v.efeito === 'braseiros-gr' || v.alfa <= 0.001 || v.progresso <= 0.001) return;
  ctx.save();
  switch (v.efeito) {
    case 'vapor':
      vapor(ctx, v);
      break;
    case 'holofotes':
      holofotes(ctx, v);
      break;
    case 'neblina':
      neblina(ctx, v);
      break;
    case 'luar':
      luar(ctx, v);
      break;
    case 'vento':
      vento(ctx, v);
      break;
  }
  ctx.restore();
}

/** O alvo padrão (o centro da metade direita, no chão) quando quem desenha não sabe onde o chefão está. */
export const ALVO_PADRAO: VistaDoEfeito['alvo'] = { x: 710, chao: GROUND };
