import { ALTURA, LARGURA } from '../core/constantes';
import { retanguloArredondado } from '../render/texto';
import type { Alinhamento, OpcoesPainel, OpcoesTexto, Preenchimento } from '../render/texto';
import { painel, tecla, texto, textoArcade, textoQuebrado } from '../render/texto';
import type { Ctx } from '../render/tela';

/**
 * Ferramentas de desenho de interface ligadas a um contexto 2D (versões "fechadas" de T, arcadeText,
 * panel, wrapText, keycap, rr, hint, spotlight e floorShadow do protótipo, seção 7/8).
 */
export interface Ferramentas {
  readonly ctx: Ctx;
  /** Texto de corpo com sombra leve (T). */
  T(str: string, x: number, y: number, size: number, color?: string, align?: Alinhamento, o?: OpcoesTexto): void;
  /** Texto de título arcade (arcadeText). */
  A(text: string, x: number, y: number, size: number, fill: Preenchimento, stroke?: string, align?: Alinhamento, scale?: number, alpha?: number): void;
  panel(x: number, y: number, w: number, h: number, o?: OpcoesPainel): void;
  wrap(str: string, x: number, y: number, maxW: number, lh: number, size: number, color: string, align?: Alinhamento): number;
  keycap(label: string, x: number, y: number, w?: number, h?: number, hot?: boolean): void;
  rr(x: number, y: number, w: number, h: number, r: number): void;
  /** Faixa de dica no rodapé. */
  hint(s: string): void;
  spotlight(x: number, y: number, r: number, col: string): void;
  floorShadow(x: number, y: number, w: number): void;
}

export function criarFerramentas(ctx: Ctx): Ferramentas {
  const T: Ferramentas['T'] = (str, x, y, size, color, align, o) => texto(ctx, str, x, y, size, color, align, o);
  return {
    ctx,
    T,
    A: (t, x, y, size, fill, stroke, align, scale, alpha) => textoArcade(ctx, t, x, y, size, fill, stroke, align, scale, alpha),
    panel: (x, y, w, h, o) => painel(ctx, x, y, w, h, o),
    wrap: (str, x, y, maxW, lh, size, color, align) => textoQuebrado(ctx, str, x, y, maxW, lh, size, color, align),
    keycap: (label, x, y, w, h, hot) => tecla(ctx, label, x, y, w, h, hot),
    rr: (x, y, w, h, r) => retanguloArredondado(ctx, x, y, w, h, r),
    hint(s) {
      painel(ctx, 0, ALTURA - 30, LARGURA, 30, { r: 0, c0: 'rgba(8,4,20,.8)', c1: 'rgba(8,4,20,.8)', stroke: 'rgba(255,255,255,.1)', lw: 1 });
      T(s, LARGURA / 2, ALTURA - 15, 14, '#cfd6f5', 'center');
    },
    spotlight(x, y, r, col) {
      const g = ctx.createRadialGradient(x, y, 10, x, y, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    },
    floorShadow(x, y, w) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + 3, w, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}
