import { AMINU } from './temas/aminu';
import { BAATAR } from './temas/baatar';
import { CAIO } from './temas/caio';
import { CAMILLE } from './temas/camille';
import { CENTELLA } from './temas/centella';
import { HAYATO } from './temas/hayato';
import { MIN_JI } from './temas/min-ji';
import { NILA } from './temas/nila';
import { WEI_LONG } from './temas/wei-long';
import type { TabelaDeTemas } from './tipos';

/**
 * O tema de cada lutador. `Record<IdLutador, ...>`: lutador sem tema não compila. O ZENON mantém a valsa 3/4 que já existe (`playChefe`,
 * trilha `'chefe'`), com o `andamentoFase2` e a fase 2 de hoje: é a fixture do oráculo e não é reescrita.
 */
export const TEMAS: TabelaDeTemas = {
  hayato: HAYATO,
  'wei-long': WEI_LONG,
  'min-ji': MIN_JI,
  caio: CAIO,
  aminu: AMINU,
  centella: CENTELLA,
  camille: CAMILLE,
  nila: NILA,
  baatar: BAATAR,
  zenon: 'chefe',
};
