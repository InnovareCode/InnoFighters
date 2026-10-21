import type { IdLutador } from '../../src/core/contratos';
import { ZENON_DEF } from '../../src/data/lutadores/zenon';
import type { LutadorMontado } from '../../src/data/montar';
import type { LutadorDef } from '../../src/data/tipos';
import { elencoE3, montarFixtura } from './_kit-e3';

/*
 * O ZENON em teste de MOTOR: o def de produção (`ZENON_DEF`) montado sobre o atlas do WEI LONG (as poses próprias `cena0`, `decreto0`...
 * caem na cadeia de `getPD`), num elenco FORA da produção. O que depende da arte real (poses citadas existem no atlas, alturaEmPe medido)
 * é de `zenon-arte.test.ts`, que lê o disco.
 */

export const ID_ZENON = 'zenon' as string as IdLutador;

/** O def de produção com o id (o `id` entra no elenco pelo flip; aqui é sempre o mesmo valor). */
export const ZENON_TESTE: LutadorDef = { ...ZENON_DEF, id: ID_ZENON };

/** O elenco de teste (produção + E3) com o ZENON montado sobre o atlas do WEI LONG, ou uma versão alterada do def. */
export function elencoComZenon(def: LutadorDef = ZENON_TESTE, extra: Parameters<typeof elencoE3>[0] = {}): Record<IdLutador, LutadorMontado> {
  return { ...elencoE3(extra), [ID_ZENON]: montarFixtura(def) } as Record<IdLutador, LutadorMontado>;
}
