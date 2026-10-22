import type { Regras } from '../meta';

const NUMEROS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];

/** Número por extenso (0 a 9); acima disso, o próprio número. */
export const porExtenso = (n: number): string => NUMEROS[n] ?? String(n);

/**
 * Quantos rivais a escada tem antes do chefão: o tamanho da regra, limitado ao que existe (todos menos o jogador
 * e o chefão). Com os 4 lutadores de hoje e sem chefão são 3, como no protótipo. Com os chefões da fila (`chefesDaFila`) o chefão da vez
 * (um guardião, que não é o chefão final) também não é rival: desconta 2, o final e o guardião (10 lutadores = 7 candidatos; a escada segue com 5).
 */
export function rivaisDaEscada(regras: Regras): number {
  const candidatos = regras.roster.filter((id) => id !== regras.chefe).length - 1 - (regras.chefesDaFila ? 1 : 0);
  return Math.max(0, Math.min(regras.tamanhoEscada, candidatos));
}

/** O ARCADE termina num chefão? */
export const temChefe = (regras: Regras): boolean => regras.chefe !== null;

/** Descrição do ARCADE no menu principal (a escada, não um número fixo). */
export function descricaoArcade(regras: Regras): string {
  const n = rivaisDaEscada(regras);
  return temChefe(regras)
    ? `Um jogador: enfrente ${n} rivais em sequência, depois o chefão, e torne-se o campeão.`
    : `Um jogador: enfrente os ${n} rivais em sequência e torne-se o campeão.`;
}

/** Dica do painel de rivais na seleção (modo ARCADE). */
export function dicaArcadeSelecao(regras: Regras): string {
  const n = rivaisDaEscada(regras);
  return temChefe(regras)
    ? `Derrote ${porExtenso(n)} rivais em sequência e, por fim, o chefão. A ordem dos rivais é sorteada.`
    : `Derrote os outros ${porExtenso(n)} lutadores em sequência. A ordem é sorteada.`;
}

/** Texto do ARCADE na tela "Como jogar". */
export function textoComoJogarArcade(regras: Regras): string {
  const n = rivaisDaEscada(regras);
  return temChefe(regras)
    ? `Enfrente ${n} rivais em sequência e, no fim, o chefão. Se perder, use um CONTINUE (3 no total).`
    : `Enfrente os outros ${n} lutadores em sequência. Se perder, use um CONTINUE (3 no total).`;
}
