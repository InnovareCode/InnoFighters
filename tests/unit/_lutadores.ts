import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IdLutador } from '../../src/core/contratos';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { LutadorDef, ModsGolpes } from '../../src/data/tipos';
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
export const ORIGINAIS_COM_ATLAS_DE_PROTOTIPO: readonly IdLutador[] = ['hayato', 'min-ji', 'caio', 'wei-long'];

/**
 * Dados ORIGINAIS dos 4 do protótipo (hp, pow, mods): `tests/fixtures/dados-prototipo/originais.json`. Desde a E6b a produção
 * (`src/data/lutadores`) foi afastada deles para equilibrar o jogo; o oráculo (dados.test, luta-fidelidade, snapshot CPU x CPU)
 * segue comparando o motor com o protótipo montando os 4 com ESTES números. Lutadores fora do arquivo (os 5 novos) não têm
 * oráculo: usam a definição de produção.
 */
export type DadosOriginais = Record<string, { hp: number; pow: number; mods: ModsGolpes; especiais?: LutadorDef['especiais'] }>;
export const DADOS_ORIGINAIS: DadosOriginais = JSON.parse(readFileSync(caminho('tests/fixtures/dados-prototipo/originais.json'), 'utf8')) as DadosOriginais;

/** A definição do lutador com os números do protótipo por cima (se ele tem oráculo); senão, a de produção. */
export function defDoOraculo(id: IdLutador): LutadorDef {
  const o = DADOS_ORIGINAIS[id];
  if (!o) return LUTADORES[id];
  // `especiais` só vem da fixture para quem teve o alcance recalibrado pela arte nova (CAIO: rm/bh de sDown e sFwd na produção).
  const def: LutadorDef = { ...LUTADORES[id], hp: o.hp, pow: o.pow, mods: o.mods, ...(o.especiais ? { especiais: o.especiais } : {}) };
  // `alturaDoProjetil` é um ajuste só de PRODUÇÃO (compensa a arte nova mudando o sentido da pose do spawn, ex.: CAIO sa1
  // virou chute). O oráculo monta sobre o atlas ORIGINAL do protótipo (`ORIGINAIS_COM_ATLAS_DE_PROTOTIPO`), cuja pose de
  // spawn nunca mudou de sentido: sem isso, o spawn.y do oráculo teria que bater com um número de produção que não existe
  // no protótipo. Removido aqui para o spawn.y voltar a vir da `ponta.tipY` do fixture, como o protótipo sempre fez.
  delete def.alturaDoProjetil;
  return def;
}

function manifestoParaMontar(id: IdLutador, arteReal: boolean): ManifestoAtlas {
  if (!arteReal && ORIGINAIS_COM_ATLAS_DE_PROTOTIPO.includes(id)) {
    const arquivo = caminho(`tests/fixtures/atlas-prototipo/${id}/atlas.json`);
    return paraManifestoV1(validarManifesto(JSON.parse(readFileSync(arquivo, 'utf8')), `fixtures/${id}/atlas.json`));
  }
  return lerManifesto(id);
}

/**
 * Os lutadores do ROSTER montados a partir dos atlas.json (mesmo caminho do jogo, v1 e v2). PADRÃO = o ORÁCLE: atlas original de
 * HAYATO/MIN-JI (`ORIGINAIS_COM_ATLAS_DE_PROTOTIPO`) e dados originais dos 4 (`defDoOraculo`). `arteReal: true` = atlas de produção;
 * `dadosDeProducao: true` = os números balanceados do jogo.
 */
export function montarTodos(opcoes: { arteReal?: boolean; dadosDeProducao?: boolean } = {}): Record<IdLutador, LutadorMontado> {
  const r = {} as Record<IdLutador, LutadorMontado>;
  for (const id of ROSTER) {
    const def = opcoes.dadosDeProducao === true ? LUTADORES[id] : defDoOraculo(id);
    r[id] = montarLutador(def, manifestoParaPoses(manifestoParaMontar(id, opcoes.arteReal === true)));
  }
  return r;
}
