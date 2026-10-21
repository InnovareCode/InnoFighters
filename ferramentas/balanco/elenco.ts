import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { paraManifestoV1, validarManifesto } from '../../src/assets/manifesto';
import type { IdLutador } from '../../src/core/contratos';
import { manifestoParaPoses } from '../../src/data/atlas';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';

/*
 * Elenco do harness de balanço (E6a): os 9 lutadores montados PELO CAMINHO DE PRODUÇÃO, ou seja, os `atlas.json` que o
 * jogo serve (`public/assets/lutadores/<id>/atlas.json`), com a arte real. O alcance dos golpes sai da `ponta` desses
 * quadros: medir sobre outro atlas (o do WEI LONG que os testes de mecânica usam, ou o original do protótipo que o oráculo
 * de fidelidade usa para HAYATO e MIN-JI) mediria o lutador errado (risco M-R7 do docs/mecanicas-e3.md).
 */

const raiz = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

export type Elenco = Record<IdLutador, LutadorMontado>;

/** O caminho do `atlas.json` de produção de um lutador; falha alto se a arte não foi copiada para `public/`. */
export function atlasDeProducao(id: string): string {
  const arquivo = raiz(`public/assets/lutadores/${id}/atlas.json`);
  if (!existsSync(arquivo)) throw new Error(`balanco: atlas de "${id}" ausente em public/assets/lutadores`);
  return arquivo;
}

/** Os 9 lutadores do ROSTER montados com a arte de produção (v1 e v2 pelo mesmo validador do jogo). */
export function montarElenco(): Elenco {
  const r = {} as Elenco;
  for (const id of ROSTER) {
    const manifesto = paraManifestoV1(validarManifesto(JSON.parse(readFileSync(atlasDeProducao(id), 'utf8')), `${id}/atlas.json`));
    r[id] = montarLutador(LUTADORES[id], manifestoParaPoses(manifesto));
  }
  return r;
}

export { ROSTER };

/*
 * "E se...": ajustes em MEMÓRIA sobre o elenco montado, para medir uma proposta de balanceamento sem tocar nos dados do jogo
 * (`npm run balanco -- --ajustes '{"wei-long":{"hp":100}}'`). Nada é gravado; os relatórios saem em `relatorios/` e levam o
 * ajuste nos parâmetros, então nunca se confundem com a rodada de referência.
 *
 * Chave = `<id>` (ficha base) ou `<id>/<ficha>`. Campos: números do lutador (`hp`, `pow`, `spd`, `jump`), `moves`
 * (`{ "sFire": { "dmg": 12, "S": 8, "proj": { "dmg": 9 } } }`) e `chefe` (`{ "hpPorBarra": 60 }`, só na ficha base).
 */
export type AjustesElenco = Record<string, { hp?: number; pow?: number; spd?: number; jump?: number; moves?: Record<string, Record<string, unknown>>; chefe?: Record<string, number> }>;

const CAMPOS_NUMERICOS = ['hp', 'pow', 'spd', 'jump'] as const;

export function aplicarAjustes(elenco: Elenco, ajustes: AjustesElenco): void {
  for (const [alvo, patch] of Object.entries(ajustes)) {
    const [id, ficha] = alvo.split('/') as [IdLutador, string | undefined];
    const base = elenco[id];
    if (!base) throw new Error(`ajustes: lutador "${id}" desconhecido`);
    const ch = ficha === undefined ? base : base.fichas[ficha];
    if (!ch) throw new Error(`ajustes: ficha "${ficha}" de "${id}" desconhecida`);
    for (const [campo, valor] of Object.entries(patch)) {
      if ((CAMPOS_NUMERICOS as readonly string[]).includes(campo)) {
        if (typeof valor !== 'number' || !(valor > 0)) throw new Error(`ajustes: ${alvo}.${campo} precisa ser um número > 0`);
        (ch as Record<string, unknown>)[campo] = valor;
      } else if (campo === 'moves') {
        for (const [nome, mp] of Object.entries(valor as Record<string, Record<string, unknown>>)) {
          const mv = (ch.moves as Record<string, Record<string, unknown> | undefined>)[nome];
          if (!mv) throw new Error(`ajustes: ${alvo} não tem o golpe "${nome}"`);
          for (const [k, v] of Object.entries(mp)) {
            // `proj` é um objeto compartilhado com a definição estática: troca por uma cópia, nunca altera no lugar
            mv[k] = k === 'proj' ? { ...(mv['proj'] as object), ...(v as object) } : v;
          }
        }
      } else if (campo === 'chefe') {
        if (!base.chefe || ficha !== undefined) throw new Error(`ajustes: ${alvo}.chefe só vale na ficha base de quem é chefe`);
        base.chefe = { ...base.chefe, ...(valor as object) };
      } else throw new Error(`ajustes: campo "${campo}" desconhecido em ${alvo}`);
    }
  }
}
