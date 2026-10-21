import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IdLutador } from '../../src/core/contratos';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import { paraManifestoV1, validarManifesto } from '../../src/assets/manifesto';
import type { ManifestoC1 } from '../../src/assets/tipos';

const caminho = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

/** Caminho do atlas.json de um lutador como o jogo o serve (`public/assets/lutadores/<id>/atlas.json`). */
export function caminhoDoAtlas(id: string): string {
  const arquivo = caminho(`public/assets/lutadores/${id}/atlas.json`);
  if (!existsSync(arquivo)) throw new Error(`atlas de "${id}" ausente em public/assets/lutadores (a Lyra copia os gerados)`);
  return arquivo;
}

/** O manifesto C1 (v1 ou v2) já validado, como o carregador do jogo o lê. */
export function lerManifestoC1(id: string): ManifestoC1 {
  return validarManifesto(JSON.parse(readFileSync(caminhoDoAtlas(id), 'utf8')), `${id}/atlas.json`);
}

/** O manifesto no formato que `manifestoParaPoses` entende (v2 vira v1 de uma página, sem `p`). */
export function lerManifesto(id: string): ManifestoAtlas {
  return paraManifestoV1(lerManifestoC1(id));
}

/**
 * Lutadores cuja ARTE em `public/assets` foi trocada pela das folhas novas (pipeline de sprites) mas que existem no protótipo.
 * O oráculo (luta-fidelidade lock-step, snapshot da luta) compara o motor com o POSEDATA do protótipo, e as caixas de golpe saem
 * de `tipX/tipY` do atlas: com a arte nova as caixas mudam por desenho, não por regra. Por isso estes testes seguem montando
 * o HAYATO e a MIN-JI sobre o atlas ORIGINAL, guardado em `tests/fixtures/atlas-prototipo/<id>/` (só o `atlas.json` entra aqui;
 * o `atlas.webp` é para os e2e de fidelidade, que a Lyra aponta para ele). `arteReal: true` monta pelo atlas de produção.
 */
export const ORIGINAIS_COM_ATLAS_DE_PROTOTIPO: readonly IdLutador[] = ['hayato', 'min-ji'];

function manifestoParaMontar(id: IdLutador, arteReal: boolean): ManifestoAtlas {
  if (!arteReal && ORIGINAIS_COM_ATLAS_DE_PROTOTIPO.includes(id)) {
    const arquivo = caminho(`tests/fixtures/atlas-prototipo/${id}/atlas.json`);
    return paraManifestoV1(validarManifesto(JSON.parse(readFileSync(arquivo, 'utf8')), `fixtures/${id}/atlas.json`));
  }
  return lerManifesto(id);
}

/** Os lutadores do ROSTER montados a partir dos atlas.json (mesmo caminho do jogo, v1 e v2); ver `ORIGINAIS_COM_ATLAS_DE_PROTOTIPO`. */
export function montarTodos(opcoes: { arteReal?: boolean } = {}): Record<IdLutador, LutadorMontado> {
  const r = {} as Record<IdLutador, LutadorMontado>;
  for (const id of ROSTER) r[id] = montarLutador(LUTADORES[id], manifestoParaPoses(manifestoParaMontar(id, opcoes.arteReal === true)));
  return r;
}
