import { ALTURA, LARGURA } from '../../core/constantes';
import { alturaDoLetterbox } from '../../data/trailer/curvas';
import type { Ctx } from '../tela';

/*
 * Letterbox 2,39:1 e flash de tela cheia do trailer. As faixas têm 69 px lógicos (`ALTURA_LETTERBOX`) em cima e embaixo; o valor 0..1 vem do diretor (fecha no c1,
 * abre no c24). O flash é o ÚNICO de tela cheia do trailer (c24.1): a validação do roteiro confere.
 */

/** As duas faixas pretas. `valor` 0 = sem faixas, 1 = cheias. */
export function desenharLetterbox(ctx: Ctx, valor: number): void {
  const h = alturaDoLetterbox(valor);
  if (h <= 0) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LARGURA, h);
  ctx.fillRect(0, ALTURA - h, LARGURA, h);
}

/** O flash de tela cheia (branco quente). `flash` 0..1. */
export function desenharFlash(ctx: Ctx, flash: number): void {
  if (flash <= 0) return;
  ctx.fillStyle = `rgba(255,248,232,${Math.min(1, flash).toFixed(3)})`;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}
