import type { ArteLutador } from '../assets/elenco';
import { getPD, type ComPoses } from '../data/poses';
import type { Ctx } from './tela';

/** O que o desenho de pose precisa de um lutador montado: poses (com alias) e o fator K atlas -> tela. */
export type ComPosesEK = ComPoses & { readonly K: number };

/**
 * Desenha uma pose do atlas com os pés em (x, y); `escala` multiplica o K do lutador, `facing` -1
 * espelha, `branco` (0..1) sobrepõe a silhueta branca (flash). Porte de drawPose do protótipo;
 * a pose é escolhida por `getPD` (cadeia de alias/fallback de data/poses.ts).
 */
export function desenharPose(
  ctx: Ctx,
  ch: ComPosesEK,
  arte: ArteLutador,
  nome: string,
  x: number,
  y: number,
  escala: number,
  facing = 1,
  alfa = 1,
  branco = 0,
): void {
  const pd = getPD(ch, nome);
  const K = ch.K * escala;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.globalAlpha = alfa;
  ctx.drawImage(arte.imagem, pd.x, pd.y, pd.w, pd.h, -pd.ax * K, -pd.h * K, pd.w * K, pd.h * K);
  if (branco > 0) {
    ctx.globalAlpha = branco;
    ctx.drawImage(arte.silhueta(), pd.x, pd.y, pd.w, pd.h, -pd.ax * K, -pd.h * K, pd.w * K, pd.h * K);
  }
  ctx.restore();
}
