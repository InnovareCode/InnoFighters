import type { Navegador } from '../navegador';
import { TrailerEmCena, type ControladorDoTrailer } from './trailer';

/*
 * O pedaço LAZY do trailer (spec §5.2 e R10): a casca `CenaTrailer` (src/ui/cenas/trailer.ts) o importa com `import()` quando `ui.ready` fica true. Importar este módulo
 * traz o diretor, o roteiro (e valida: roteiro inválido LANÇA aqui, e a casca cai na abertura de hoje), os desenhos do trailer e o arranjo da música.
 */
export type { ControladorDoTrailer };
export function criarControlador(ui: Navegador): ControladorDoTrailer {
  return new TrailerEmCena(ui);
}
