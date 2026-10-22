import type { Ctx } from './tela';

/*
 * VÉU DE CHEFÃO da fase 2 dos GUARDIÕES (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §1.7): sem imagem nova, a arena do guardião escurece 25% e ganha um tom da cor
 * (`accent`) dele quando ele entra na fase 2. Procedural e puro do estado (`rampa` 0 a 1, a mesma da aura): no máximo 2 primitivas, sem shadowBlur, filter nem getImageData, sem
 * consumir o `rngVisual`. Só vale para arenas SEM sobreposição própria (a `gr` do ZENON tem a dela, em arena-gr.ts). É o mesmo princípio do `arena-gr.ts`, sem âncora na arte.
 */

/** Escurecimento máximo da arena na fase 2 e a força do tom da cor do guardião. */
export const ESCURECER_NA_FASE2 = 0.25;
export const TOM_DA_FASE2 = 0.16;

/** Cobre a arena inteira (a câmera e o zoom de apresentação já estão aplicados no contexto; a folga cobre os dois). */
const COBERTURA = { x: -2400, y: -1400, w: 5760, h: 3380 } as const;

/** Desenha o véu da fase 2 com a rampa `rampa` e a cor `accent` (#rrggbb). Nada com rampa 0. */
export function desenharVeuDeFase2(ctx: Ctx, rampa: number, accent: string): void {
  if (rampa <= 0.001) return;
  ctx.save();
  ctx.fillStyle = `rgba(4,2,12,${(ESCURECER_NA_FASE2 * rampa).toFixed(3)})`;
  ctx.fillRect(COBERTURA.x, COBERTURA.y, COBERTURA.w, COBERTURA.h);
  const n = Number.parseInt(accent.slice(1), 16);
  ctx.fillStyle = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(TOM_DA_FASE2 * rampa).toFixed(3)})`;
  ctx.fillRect(COBERTURA.x, COBERTURA.y, COBERTURA.w, COBERTURA.h);
  ctx.restore();
}
