import type { IdLutador } from '../../src/core/contratos';
import { manifestoParaPoses } from '../../src/data/atlas';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { LutadorDef } from '../../src/data/tipos';
import { ABRACO_DA_ESTEPE, BAATAR_CHEFE, BAATAR_COM_ABRACO } from '../../src/ui/dev-chefe-teste';
import { lerManifesto } from './_lutadores';

/*
 * O BAATAR ANTIGO (chefão da E3/E5), guardado como FIXTURA de teste. O BAATAR de produção virou lutador normal (sem `chefe`, sem
 * fichas `chefe`/`chefe2`, →+ESP = MERGULHO); a mecânica de chefe do motor (barras, troca, Dança, ficha da fase 2) e a do ABRAÇO
 * (rush + agarrão em janela + armadura) continuam no motor e continuam testadas, só que sobre este def de teste. Quando o Zenon
 * entrar, os testes de chefe podem migrar para o `LutadorDef` dele e este arquivo some.
 */

// Os defs vivem em src/ui/dev-chefe-teste.ts (fonte única, também usada pelo `?chefe=teste` do e2e); aqui só se reexportam.
export { ABRACO_DA_ESTEPE, BAATAR_CHEFE, BAATAR_COM_ABRACO };

/** O BAATAR chefão montado sobre o atlas de produção dele (poses `devekh0..2`, `dive0/1`). */
export function montarBaatarChefe(def: LutadorDef = BAATAR_CHEFE): LutadorMontado {
  return montarLutador(def, manifestoParaPoses(lerManifesto('baatar')));
}

/** O BAATAR com o ABRAÇO no →+ESP (sem fichas), montado sobre o atlas de produção dele. */
export function montarBaatarComAbraco(): LutadorMontado {
  return montarLutador(BAATAR_COM_ABRACO, manifestoParaPoses(lerManifesto('baatar')));
}

/** O elenco dado com o BAATAR trocado pelo chefão de teste (para luta `chefe: true` contra o 'baatar'). */
export function comBaatarChefe(elenco: Record<IdLutador, LutadorMontado>): Record<IdLutador, LutadorMontado> {
  return { ...elenco, baatar: montarBaatarChefe() };
}
