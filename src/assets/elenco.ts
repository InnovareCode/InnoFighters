import type { IdLutador } from '../core/contratos';
import { CENARIOS } from '../data/cenarios';
import { LUTADORES, ROSTER } from '../data/lutadores';
import { montarLutador, type LutadorMontado } from '../data/montar';
import type { PlanoDeCarga, Recursos } from './carregador';

/** O que o desenho precisa da imagem de um lutador: o atlas e a silhueta branca (criada sob demanda). */
export interface ArteLutador {
  readonly imagem: CanvasImageSource;
  silhueta(): CanvasImageSource;
}

/** Um lutador pronto para desenhar: dados montados (poses, K, cores) + arte. */
export interface LutadorRender {
  readonly ch: LutadorMontado;
  readonly arte: ArteLutador;
}

export type Elenco = Readonly<Record<IdLutador, LutadorRender>>;

/** Plano de carga do jogo: os quatro atlas (ROSTER) e os quatro cenários (data/cenarios.ts). */
export function planoPadrao(baseUrl: string): PlanoDeCarga {
  return {
    baseUrl,
    lutadores: ROSTER,
    cenarios: Object.values(CENARIOS).map((c) => ({ id: c.id, arquivo: c.arquivo })),
  };
}

/** Monta cada lutador (`montarLutador`, em data/) a partir dos atlas carregados. */
export function montarElenco(recursos: Recursos): Elenco {
  const saida = {} as Record<IdLutador, LutadorRender>;
  for (const id of ROSTER) {
    const atlas = recursos.lutadores.get(id);
    if (!atlas) throw new Error(`montarElenco: atlas de "${id}" nao foi carregado`);
    saida[id] = { ch: montarLutador(LUTADORES[id], atlas.poses()), arte: atlas };
  }
  return saida;
}
