import type { IdLutador } from '../../core/contratos';
import type { ChaveDeTexto, PlacaDeTexto } from './tipos';

/*
 * Textos do trailer (pt-BR). RASCUNHO do Vega: o Apolo revisa depois (docs/textos-trailer.md). Regras que a validação confere: título de cartão com no
 * máximo 18 caracteres e em caixa alta; placa com nome e país em caixa alta. O epíteto vem do `title` do lutador (src/data/lutadores).
 */
export const TEXTOS: Readonly<Record<ChaveDeTexto, string>> = {
  'dez-mestres': 'DEZ MESTRES.',
  'dez-nacoes': 'DEZ NAÇÕES.',
  'um-torneio': 'UM SÓ TORNEIO.',
  'cinco-guardioes': 'CINCO GUARDIÕES.',
  'quem-chega-ao-topo': 'QUEM CHEGA AO TOPO',
  'pressione-enter': 'PRESSIONE ENTER',
  'toque-para-jogar': 'TOQUE PARA JOGAR',
};

/** Placa do lutador (terço inferior, até 1,5 s): "NOME · PAÍS" e, se couber, o epíteto. */
export const PLACAS: Readonly<Record<IdLutador, PlacaDeTexto>> = {
  hayato: { nome: 'HAYATO', pais: 'JAPÃO', epiteto: 'O Punho do Trovão' },
  'wei-long': { nome: 'WEI LONG', pais: 'CHINA', epiteto: 'O Dragão de Ferro' },
  'min-ji': { nome: 'MIN-JI', pais: 'COREIA DO SUL', epiteto: 'A Tempestade de Seul' },
  caio: { nome: 'CAIO', pais: 'BRASIL', epiteto: 'Mestre da Ginga' },
  aminu: { nome: 'AMINU', pais: 'NIGÉRIA', epiteto: 'A Lança de Kano' },
  centella: { nome: 'CENTELLA', pais: 'MÉXICO', epiteto: 'A Faísca da Arena' },
  camille: { nome: 'CAMILLE', pais: 'FRANÇA', epiteto: 'A Riposte de Marselha' },
  nila: { nome: 'NILA', pais: 'ÍNDIA', epiteto: 'A Lua de Kerala' },
  baatar: { nome: 'BAATAR', pais: 'MONGÓLIA', epiteto: 'O Avarga das Estepes' },
  zenon: { nome: 'ZENON', pais: 'GRÉCIA', epiteto: 'O Arconte' },
};

/** D-T2: enquanto o ZENON não foi liberado, a placa dele (se houver) mostra isto no lugar do nome. */
export const NOME_OCULTO = '???';
