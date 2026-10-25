import { compilarPartitura } from './partitura';
import type { TomadasDoTrailer } from './tipos';

/*
 * As TOMADAS, uma por plano de luta, COMPILADAS da partitura (partitura.ts, escrita à mão a partir de docs/partitura-trailer.md): as entradas dos dois lutadores por update,
 * a pré-rolagem, as batidas que o CI confere e a impressão final. Nada é achado por busca de semente e nada é gerado: para saber a impressão atual de um plano rode
 * `npm run trailer:escalar` (ele CONFERE e imprime). Se o balanço, o atlas ou a config do motor mudarem, o teste `trailer-diretor` diz qual plano reafinar.
 */
export const TOMADAS: TomadasDoTrailer = compilarPartitura();
