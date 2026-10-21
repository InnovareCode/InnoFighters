import type { IdLutador } from '../core/contratos';
import type { IdCenario } from './tipos';

export type CenarioDef = {
  id: IdCenario;
  /** Caminho sob public/ (servido em /assets/...). Hoje .jpg idêntico ao do protótipo; a F2 converte para .webp. */
  arquivo: string;
  nome: string;
  /** Lutador da casa (STAGE_OF do protótipo). */
  casa: IdLutador;
};

/**
 * Cenários do protótipo. Chaves antigas: bg_jp (inexistente em ASSETS; o protótipo cai em
 * IMG.bg = Japão), bg_cn, bg_kr, bg_br. A luta acontece na casa do RIVAL (Game.setup:
 * `stage = CHARS[c2].stage`).
 */
export const CENARIOS: Readonly<Record<IdCenario, CenarioDef>> = {
  jp: { id: 'jp', arquivo: 'assets/cenarios/jp.jpg', nome: 'Castelo das Cerejeiras, Japão', casa: 'hayato' },
  cn: { id: 'cn', arquivo: 'assets/cenarios/cn.jpg', nome: 'Templo da Montanha, China', casa: 'wei-long' },
  kr: { id: 'kr', arquivo: 'assets/cenarios/kr.jpg', nome: 'Palácio de Seul, Coreia do Sul', casa: 'min-ji' },
  br: { id: 'br', arquivo: 'assets/cenarios/br.jpg', nome: 'Copacabana, Rio de Janeiro', casa: 'caio' },
};

/** Sequência do fundo da tela de título (STAGE_CYCLE). */
export const CICLO_CENARIOS: readonly IdCenario[] = ['jp', 'cn', 'kr', 'br'];

/** Fundo dos menus e telas fora da luta (IMG.bg do protótipo = Japão). */
export const CENARIO_PADRAO: IdCenario = 'jp';
