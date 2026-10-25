import type { EventoLuta } from '../core/contratos';
import { roteiroDoFilme } from '../data/roteiros-filme';
import type { ModoDoFilmeNoTrailer } from '../data/trailer/tipos';

/*
 * O FILME do especial no trailer (D-V6: o trailer mostra o filme). O motor emite o evento `filme` no tick do contato e NÃO congela por si: quem congela é a cena. No jogo é a
 * cena da luta; no trailer é o ritmo do plano (`RitmoDoPlano`), que segura o motor pelos ticks do filme, igual à tarja da cinemática. PURO (só dados): o diretor e a
 * escalação offline contam os mesmos ticks.
 *
 * Modo CURTA (30 ticks, o padrão): o trailer é uma montagem em compassos; o filme completo (58 a 66 ticks) comeria um terço de um plano de luta. É a mesma versão que a luta toca na
 * repetição do mesmo especial (D-V4). A partitura pode pedir o modo (`BatidaPedida.filme`): o trailer não segue a regra do jogo (1ª vez = COMPLETO).
 */
export type EventoFilmeLuta = Extract<EventoLuta, { tipo: 'filme' }>;

export const MODO_DO_FILME_NO_TRAILER: ModoDoFilmeNoTrailer = 'curta';

/** O rival no tick ANTERIOR ao contato (a barra do filme parte daqui). */
export interface RivalAntes {
  readonly hp: number;
  readonly hpShown: number;
  readonly barras: number;
}

/** O filme que COMEÇA neste tick do trailer (o motor andou o update do contato; os ticks seguintes ficam congelados). */
export interface FilmeNoTrailer {
  readonly ev: EventoFilmeLuta;
  readonly modo: ModoDoFilmeNoTrailer;
  readonly rivalAntes: RivalAntes;
}

/** Quantos ticks do trailer o motor fica parado por este filme. `atacante` = o id do lutador que lançou o golpe. */
export function ticksDoFilmeNoTrailer(atacante: string, ev: EventoFilmeLuta, modo: ModoDoFilmeNoTrailer = MODO_DO_FILME_NO_TRAILER): number {
  const r = roteiroDoFilme(atacante, ev.ficha, ev.golpe, ev.projetil);
  return modo === 'completa' ? r.duracao : r.curta;
}
