import { ALTURA, LARGURA } from '../../core/constantes';
import type { Ctx } from '../tela';

/*
 * Grade de cor e transições do trailer (docs/direcao-arte-trailer.md §6 e §8). A "LUT barata": UM `fillRect` de tinta por ato (`source-over`) mais UMA vinheta radial. Nada
 * de blend por pixel (`soft-light`, `overlay`, filtros): no WebKit isso pode cair para software e o portão de desempenho é 1,15x a luta.
 */

export type Ato = 'frio' | 'luta' | 'arconte' | 'cartao';

/** Tinta por cima (ou null) e força da vinheta, por ato. */
export const ATOS: Readonly<Record<Ato, { readonly tinta: string | null; readonly vinheta: number }>> = {
  frio: { tinta: 'rgba(14,30,96,.34)', vinheta: 0.72 },
  luta: { tinta: null, vinheta: 0.5 },
  arconte: { tinta: 'rgba(34,8,34,.22)', vinheta: 0.62 },
  cartao: { tinta: null, vinheta: 0.8 },
};

/** Vinheta radial: centro (480, 281), raio 230 -> 640, de transparente a `rgba(4,2,10,forca)`. */
export function vinheta(ctx: Ctx, forca: number): void {
  const g = ctx.createRadialGradient(LARGURA / 2, ALTURA * 0.52, 230, LARGURA / 2, ALTURA * 0.52, 640);
  g.addColorStop(0, 'rgba(4,2,10,0)');
  g.addColorStop(1, `rgba(4,2,10,${forca})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}

export function gradeDeCor(ctx: Ctx, ato: Ato): void {
  const a = ATOS[ato];
  if (a.tinta) {
    ctx.fillStyle = a.tinta;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }
  vinheta(ctx, a.vinheta);
}

// ---------------------------------------------------------------------------------------------------------------- smear (whip)

/** Os 3 cortes com smear (luta -> luta dentro do ato dos desafiantes): o plano que sai, o que entra e a direção do giro (+1 = para a direita). */
export const CORTES_COM_SMEAR: readonly { readonly sai: string; readonly entra: string; readonly dir: 1 | -1 }[] = [
  { sai: 'P3', entra: 'P4', dir: 1 },
  { sai: 'P5', entra: 'P6', dir: -1 },
  { sai: 'P6', entra: 'P7', dir: 1 },
];
export const TICKS_DO_SMEAR = 2;
const DESLOCAMENTOS = [12, 24, 36] as const;
const ALFAS = [0.35, 0.2, 0.1] as const;

/**
 * Quanto smear tem o plano `id` no tick `tau` (de `total` ticks): `dir` do deslocamento das cópias (0 = nenhum). Nos 2 últimos ticks do plano que SAI as cópias vão na direção
 * do giro; nos 2 primeiros do que ENTRA, vêm do lado oposto.
 */
export function smearNoTick(id: string, tau: number, total: number): 1 | -1 | 0 {
  for (const c of CORTES_COM_SMEAR) {
    if (c.sai === id && tau >= total - TICKS_DO_SMEAR) return c.dir;
    if (c.entra === id && tau < TICKS_DO_SMEAR) return (c.dir === 1 ? -1 : 1) as 1 | -1;
  }
  return 0;
}

/** Desenha o próprio quadro (o canvas) 3 vezes por cima, deslocado 12/24/36 px. A luminância não muda: não é flash. Custo: 3 `drawImage` do canvas em 4 ticks por corte. */
export function desenharSmear(ctx: Ctx, dir: 1 | -1): void {
  const cv = ctx.canvas;
  ctx.save();
  DESLOCAMENTOS.forEach((d, i) => {
    ctx.globalAlpha = ALFAS[i] as number;
    ctx.drawImage(cv, 0, 0, cv.width, cv.height, dir * d, 0, LARGURA, ALTURA);
  });
  ctx.restore();
}
