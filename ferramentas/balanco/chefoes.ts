import type { IdLutador } from '../../src/core/contratos';
import type { Regras } from '../../src/meta/tipos';

/*
 * Os 6 chefões do harness e as METAS de balanço de cada um (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §4.3 e §4.4).
 * Puro: sem motor, sem disco. O harness mede cada chefão contra o elenco que EXISTE no ponto da progressão em que ele aparece,
 * e não contra o elenco inteiro: o AMINU é o 1º chefão de quem só tem os 4 iniciais.
 */

/** Um chefão possível e quem pode enfrentá-lo DE VERDADE (o elenco liberado naquele ponto). */
export type ChefeDoHarness = { chefe: IdLutador; desafiantes: readonly IdLutador[] };

type RegrasDoHarness = Pick<Regras, 'roster' | 'iniciais' | 'fila' | 'chefe'>;

/**
 * `fila[k]` -> `iniciais ∪ fila[0..k-1]`; o chefão final -> `roster − {final}`. É a mesma regra de `desafiantesDoChefe` do
 * spec §1.3 (Cronos, `src/meta/chefes.ts`, ainda não existe): quando ela entrar, esta função vira só uma chamada a ela.
 * A ordem do resultado é a da progressão (guardiões na ordem da fila, o final por último) e é ela que define o `idx` das tarefas.
 */
export function desafiantesDoChefe(regras: RegrasDoHarness): ChefeDoHarness[] {
  const r: ChefeDoHarness[] = [];
  regras.fila.forEach((chefe, k) => {
    const liberados = new Set<IdLutador>([...regras.iniciais, ...regras.fila.slice(0, k)]);
    r.push({ chefe, desafiantes: regras.roster.filter((id) => liberados.has(id) && id !== chefe) });
  });
  if (regras.chefe !== null && !r.some((x) => x.chefe === regras.chefe)) {
    r.push({ chefe: regras.chefe, desafiantes: regras.roster.filter((id) => id !== regras.chefe) });
  }
  return r;
}

/** Faixa de vitória do jogador [mín, máx] em fração (0,26 = 26%). */
export type Faixa = readonly [number, number];
export type MetaChefe = { normal: Faixa; dificil: Faixa };

/*
 * RAMPA aprovada pelo dono (D-D1): AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%. Os pontos de dentro interpolam linearmente
 * entre o centro do primeiro (28%) e o do último (17%), com ±2 pontos. O DIFÍCIL é "proporcionalmente menor": o centro do NORMAL
 * vezes 0,575 (a razão 11,5/20 da hipótese plana do spec: 8-15% contra 17-23%), com ±3 pontos (a faixa plana do spec também é mais larga).
 */
const CENTRO_PRIMEIRO = 0.28;
const CENTRO_ULTIMO = 0.17;
const RAZAO_DIFICIL = 0.575;
const arredonda = (x: number): number => Math.round(x * 100) / 100;

/** A meta do chefão que está na posição `k` de `total` chefões (0 = o primeiro guardião, `total - 1` = o final). */
export function metaDoChefe(k: number, total: number): MetaChefe {
  const centro = total <= 1 ? CENTRO_PRIMEIRO : CENTRO_PRIMEIRO + ((CENTRO_ULTIMO - CENTRO_PRIMEIRO) * k) / (total - 1);
  const dif = centro * RAZAO_DIFICIL;
  return {
    normal: [arredonda(centro - 0.02), arredonda(centro + 0.02)],
    dificil: [arredonda(dif - 0.03), arredonda(dif + 0.03)],
  };
}

/** Critérios que acompanham a taxa, por chefão e por nível (spec §4.3). */
export const CRITERIOS_CHEFAO = {
  /** Fração mínima das lutas que terminam por KO (menos que isso e o relógio de 99 s decide). */
  koMinimo: 0.9,
  /** Duração média máxima, em segundos de jogo. */
  duracaoMax: { 1: 75, 2: 90 } as Readonly<Record<number, number>>,
  /** Nenhum desafiante pode ficar impossível / trivial no NORMAL. */
  piorMinimo: 0.05,
  melhorMaximo: 0.4,
  /** Piso do `danoRecebido` (R5). */
  danoRecebidoMin: 0.6,
} as const;
