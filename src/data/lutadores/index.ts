import type { IdLutador } from '../../core/contratos';
import { INICIAIS as INICIAIS_LOCAL } from '../../meta/regras';
import type { LutadorDef } from '../tipos';
import { AMINU } from './aminu';
import { BAATAR, MERGULHO_DA_AGUIA } from './baatar';
import { CAIO } from './caio';
import { CAMILLE } from './camille';
import { CENTELLA } from './centella';
import { HAYATO } from './hayato';
import { MIN_JI } from './min-ji';
import { NILA } from './nila';
import { WEI_LONG } from './wei-long';

/*
 * Papéis dos lutadores (docs/plano-expansao.md 1.2). Antes o ROSTER acumulava todos; agora cada lista tem um dono:
 * - quem aparece na seleção (ROSTER),
 * - quem vem liberado de fábrica (INICIAIS) e em que ordem se desbloqueia o resto (FILA_DESBLOQUEIO),
 * - quem é o chefão (CHEFE) e quem aparece na vitrine do título/abertura (VITRINE).
 * Acrescentar um lutador = id em IDS_LUTADORES (core/contratos.ts) + entrada em LUTADORES + um destes papéis.
 */

/**
 * Ordem da tela de seleção (e do `Record` de lutadores montados): os 4 do protótipo, a fila de desbloqueio na ordem em que
 * se ganha (E5) e, por último, o chefão (jogável depois de derrotado). Igual a `IDS_LUTADORES`.
 */
export const ROSTER: readonly IdLutador[] = [
  'hayato', 'wei-long', 'min-ji', 'caio',
  'aminu', 'centella', 'camille', 'nila',
  'baatar',
];

/*
 * INICIAIS, FILA_DESBLOQUEIO e CHEFE têm UMA fonte só: `src/meta/regras.ts` (Cronos), porque são regras de
 * progresso. Aqui são reexportados para quem pensa em "elenco" (a vitrine, os testes de papéis).
 */
export { CHEFE, FILA_DESBLOQUEIO, INICIAIS } from '../../meta/regras';

/** Quem aparece no título e na abertura: só os liberados de fábrica (não estraga a surpresa dos outros). */
export const VITRINE: readonly IdLutador[] = INICIAIS_LOCAL;

export const LUTADORES: Readonly<Record<IdLutador, LutadorDef>> = {
  hayato: HAYATO,
  'wei-long': WEI_LONG,
  'min-ji': MIN_JI,
  caio: CAIO,
  aminu: AMINU,
  centella: CENTELLA,
  camille: CAMILLE,
  nila: NILA,
  baatar: BAATAR,
};

export { AMINU, BAATAR, CAIO, CAMILLE, CENTELLA, HAYATO, MERGULHO_DA_AGUIA, MIN_JI, NILA, WEI_LONG };
