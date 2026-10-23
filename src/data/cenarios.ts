import { PES_NO_CENARIO } from '../core/constantes';
import type { IdLutador } from '../core/contratos';
import type { IdCenario } from './tipos';

export type CenarioDef = {
  id: IdCenario;
  /** Caminho sob public/ (servido em /assets/...). */
  arquivo: string;
  nome: string;
  /** Lutador da casa (STAGE_OF do protótipo). */
  casa: IdLutador;
  /** Fração da altura da imagem em que ficam os pés (84,5%, ver `PES_NO_CENARIO`): a arte tem de estar limpa dali para baixo. */
  pes: number;
};

/**
 * Cenários. Todos os dez são arte nova em WebP 1920x1080 (os cn, kr e br do protótipo, .jpg 1600x900, foram trocados na T1 do
 * orçamento de 23/10/2026; as chaves antigas bg_cn, bg_kr, bg_br ficaram só no protótipo). Arquivos `cenario-<sigla>.webp`
 * (docs/handoff-apolo-cenarios.md; fontes e qualidade em ferramentas/converter-cenarios.mjs).
 * A luta acontece na casa do RIVAL (Game.setup: `stage = CHARS[c2].stage`).
 *
 * E5: os nomes `cenario-<sigla>.webp` são os que a Lyra entrega em public/assets/cenarios/ (a conferir pela pasta: se ela
 * usar outro nome ou .jpg, é só trocar `arquivo` aqui; o teste de cenários lê o disco e acusa).
 */
export const CENARIOS: Readonly<Record<IdCenario, CenarioDef>> = {
  jp: { id: 'jp', arquivo: 'assets/cenarios/cenario-jp.webp', nome: 'Castelo das Cerejeiras, Japão', casa: 'hayato', pes: PES_NO_CENARIO },
  cn: { id: 'cn', arquivo: 'assets/cenarios/cenario-cn.webp', nome: 'Templo da Montanha, China', casa: 'wei-long', pes: PES_NO_CENARIO },
  kr: { id: 'kr', arquivo: 'assets/cenarios/cenario-kr.webp', nome: 'Palácio de Seul, Coreia do Sul', casa: 'min-ji', pes: PES_NO_CENARIO },
  br: { id: 'br', arquivo: 'assets/cenarios/cenario-br.webp', nome: 'Copacabana, Rio de Janeiro', casa: 'caio', pes: PES_NO_CENARIO },
  ng: { id: 'ng', arquivo: 'assets/cenarios/cenario-ng.webp', nome: 'Tinturaria de Kano, Nigéria', casa: 'aminu', pes: PES_NO_CENARIO },
  mx: { id: 'mx', arquivo: 'assets/cenarios/cenario-mx.webp', nome: 'Arena de Lucha Libre, México', casa: 'centella', pes: PES_NO_CENARIO },
  fr: { id: 'fr', arquivo: 'assets/cenarios/cenario-fr.webp', nome: 'Velho Porto de Marselha, França', casa: 'camille', pes: PES_NO_CENARIO },
  in: { id: 'in', arquivo: 'assets/cenarios/cenario-in.webp', nome: 'Fort Kochi, Kerala, Índia', casa: 'nila', pes: PES_NO_CENARIO },
  mn: { id: 'mn', arquivo: 'assets/cenarios/cenario-mn.webp', nome: 'Estepe do Naadam, Mongólia', casa: 'baatar', pes: PES_NO_CENARIO },
  // Anfiteatro do Arconte: a casa do chefão (ZENON). Fora do `CICLO_CENARIOS` e do padrão (sem spoiler); a fase 2 é só sobreposição de render.
  gr: { id: 'gr', arquivo: 'assets/cenarios/cenario-gr.webp', nome: 'Anfiteatro do Arconte, Grécia', casa: 'zenon', pes: PES_NO_CENARIO },
};

/** Sequência do fundo da tela de título (STAGE_CYCLE): só os cenários dos lutadores liberados de fábrica (sem estragar a surpresa). */
export const CICLO_CENARIOS: readonly IdCenario[] = ['jp', 'cn', 'kr', 'br'];

/** Fundo dos menus e telas fora da luta (IMG.bg do protótipo = Japão). */
export const CENARIO_PADRAO: IdCenario = 'jp';
