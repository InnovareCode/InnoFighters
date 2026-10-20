import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IdLutador } from '../../src/core/contratos';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';

/** Os 4 lutadores montados a partir dos atlas.json extraídos (mesmo caminho do jogo). */
export function montarTodos(): Record<IdLutador, LutadorMontado> {
  const r = {} as Record<IdLutador, LutadorMontado>;
  for (const id of ROSTER) {
    const url = new URL(`../../public/assets/lutadores/${id}/atlas.json`, import.meta.url);
    const m = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as ManifestoAtlas;
    r[id] = montarLutador(LUTADORES[id], manifestoParaPoses(m));
  }
  return r;
}
