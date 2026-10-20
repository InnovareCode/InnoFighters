import { ALTURA, LARGURA } from '../core/constantes';

export type Ctx = CanvasRenderingContext2D;

/** Fator de nitidez: o canvas real tem LARGURA*RS x ALTURA*RS e tudo é desenhado em px lógicos. */
export const RS = 2;

/** Dimensiona o canvas (1920x1080 reais) e liga a suavização de alta qualidade, como o protótipo. */
export function prepararCanvas(canvas: HTMLCanvasElement): Ctx {
  canvas.width = LARGURA * RS;
  canvas.height = ALTURA * RS;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('contexto 2D indisponivel');
  // mudar width/height reinicia o estado do contexto: configurar depois
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/** Passa a desenhar em coordenadas lógicas 960x540 (zera qualquer transformação anterior). */
export function usarEspacoLogico(ctx: Ctx): void {
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
}

/** Início de quadro: espaço lógico + limpa a tela. */
export function limparQuadro(ctx: Ctx): void {
  usarEspacoLogico(ctx);
  ctx.clearRect(0, 0, LARGURA, ALTURA);
}
