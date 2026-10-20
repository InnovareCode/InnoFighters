import type { IdLutador } from '../../core/contratos';
import type { LutadorDef } from '../tipos';
import { CAIO } from './caio';
import { HAYATO } from './hayato';
import { MIN_JI } from './min-ji';
import { WEI_LONG } from './wei-long';

/** Ordem do ROSTER do protótipo (f1..f4): é a ordem da tela de seleção e do ciclo de cenários. */
export const ROSTER: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];

export const LUTADORES: Readonly<Record<IdLutador, LutadorDef>> = {
  hayato: HAYATO,
  'wei-long': WEI_LONG,
  'min-ji': MIN_JI,
  caio: CAIO,
};

export { CAIO, HAYATO, MIN_JI, WEI_LONG };
