import type { IdLutador } from '../core/contratos';
import { liberados } from './progresso';
import { REGRAS_PADRAO } from './regras';
import type { Progresso, Regras } from './tipos';

/**
 * Chefoes progressivos (docs/spec-chefoes-progressivos-temas-e-dificuldade.md, 1). Funcoes PURAS: sem DOM, sem storage, sem
 * relogio. O chefao da vez e DERIVADO de `prog.desbloqueados` (a lista explicita que todo save ja tem): nao ha campo novo,
 * nem migracao, nem segunda fonte da verdade.
 */

/**
 * O chefao do ARCADE de quem joga com `c1`, ou `null` (nao ha luta de chefe). Regras, nesta ordem:
 *  1. `chefesDaFila === false`: a regra de antes — `regras.chefe`, ou `null` se `c1` e o proprio chefao.
 *  2. O primeiro `id` de `regras.fila` ainda bloqueado e que nao e o `c1` (a UI nao deixa escolher casa bloqueada, entao pular
 *     o `c1` e defesa em profundidade).
 *  3. Senao `regras.chefe` (o Anfitriao), se existe e nao e o `c1`.
 *  4. Senao `null`: jogando com o ZENON com a fila esgotada nao ha luta de chefe (ED7, D-A2).
 * O ZENON ja liberado NAO o tira de cena quando a fila ainda tem bloqueados (save feito com a regra antiga): a fila vem antes.
 */
export function chefeDoArcade(c1: IdLutador, prog: Progresso, regras: Regras = REGRAS_PADRAO): IdLutador | null {
  if (!regras.chefesDaFila) return regras.chefe !== null && c1 !== regras.chefe ? regras.chefe : null;
  const ja = liberados(prog, regras);
  const guardiao = regras.fila.find((id) => !ja.has(id) && id !== c1);
  if (guardiao !== undefined) return guardiao;
  return regras.chefe !== null && c1 !== regras.chefe ? regras.chefe : null;
}

/** O chefao e o FINAL (o Anfitriao, `regras.chefe`) e nao um guardiao da fila? */
export function ehChefeFinal(id: IdLutador, regras: Regras = REGRAS_PADRAO): boolean {
  return regras.chefe !== null && id === regras.chefe;
}

/**
 * Para o harness e os testes: cada chefao possivel e quem pode enfrenta-lo DE VERDADE (o elenco liberado naquele ponto da
 * progressao), na ordem do roster. `fila[k]` -> iniciais + fila[0..k-1]; o final -> `roster - {final}`. Sem `chefesDaFila` so
 * existe o chefao fixo, e qualquer outro lutador pode enfrenta-lo. Sem chefao nas regras (e sem `chefesDaFila`): lista vazia.
 */
export function desafiantesDoChefe(
  regras: Regras = REGRAS_PADRAO,
): readonly { chefe: IdLutador; desafiantes: readonly IdLutador[] }[] {
  const saida: { chefe: IdLutador; desafiantes: readonly IdLutador[] }[] = [];
  const final = regras.chefe;

  if (regras.chefesDaFila) {
    const liberadosAteAqui = new Set<IdLutador>(regras.iniciais);
    for (const guardiao of regras.fila) {
      if (guardiao === final || !regras.roster.includes(guardiao)) continue;
      saida.push({ chefe: guardiao, desafiantes: regras.roster.filter((id) => liberadosAteAqui.has(id)) });
      liberadosAteAqui.add(guardiao);
    }
  }
  if (final !== null) saida.push({ chefe: final, desafiantes: regras.roster.filter((id) => id !== final) });
  return saida;
}
