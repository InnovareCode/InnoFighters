import { ALTURA, LARGURA } from '../core/constantes';
import type { Ctx } from './tela';
import { texto } from './texto';

/**
 * Legenda de fala do chefão (fase 2, vitória e derrota; spec do ZENON §3.2): uma pílula escura sobre a linha dos pés, centrada, acima das barras de
 * energia (y 506). Letreiro com `texto()` (a fonte de sempre), sem voz. `alfa` 0 a 1 (o chamador faz o fade pela fase).
 */
export const LEGENDA = { w: 480, h: 28, y: ALTURA - 66 } as const;

export function desenharLegenda(ctx: Ctx, fala: string, alfa = 1): void {
  if (alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alfa);
  ctx.fillStyle = 'rgba(8,4,16,.78)';
  ctx.beginPath();
  ctx.roundRect(LARGURA / 2 - LEGENDA.w / 2, LEGENDA.y, LEGENDA.w, LEGENDA.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#d9b25a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  texto(ctx, fala, LARGURA / 2, LEGENDA.y + LEGENDA.h / 2 + 1, 16, '#fff6e0', 'center', { shadow: false });
  ctx.restore();
}
