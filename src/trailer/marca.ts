import type { Ctx } from '../render/tela';

/*
 * A MARCA do jogo, como o trailer a enxerga (spec §7.6). Quem a satisfaz hoje é `marca` de src/ui/logo.ts (a logo oficial, em imagem): o trailer da UI (src/ui/trailer)
 * chama `marca.desenharLogo` direto e não importa esta interface; ela fica como contrato do que o trailer usa da marca. Mesma assinatura de `desenharLogo` de logo.ts.
 */
export interface Marca {
  /** Desenha a logo completa centrada em (`x`, `y`) com `altura` em px lógicos; `shine` (0..1) é a varredura de luz e `alpha` a opacidade. Devolve false se a imagem ainda não está pronta (nada é desenhado). */
  desenharLogo(ctx: Ctx, x: number, y: number, altura: number, shine: number, alpha?: number): boolean;
}
