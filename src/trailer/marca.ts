import type { Ctx } from '../render/tela';

/*
 * A MARCA do jogo, como o trailer a enxerga (spec §7.6). O trailer só conhece esta interface: hoje quem a satisfaz é `marca` de src/ui/logo.ts (logo procedural);
 * quando a logo oficial entrar, a `marca` troca por dentro e o trailer herda a logo nova sem mudar uma linha. Mesma assinatura de `desenharLogo` e `desenharEmblema`.
 */
export interface Marca {
  /** Desenha o logotipo centrado em (`x`, `y`) na escala `sc`; `shine` (0..1) é a varredura de luz e `alpha` a opacidade. */
  desenharLogo(ctx: Ctx, x: number, y: number, sc: number, shine: number, alpha?: number): void;
  /** Desenha o emblema (o globo) de raio `r` no tempo `t`. */
  desenharEmblema(ctx: Ctx, x: number, y: number, r: number, t: number, alpha?: number): void;
}
