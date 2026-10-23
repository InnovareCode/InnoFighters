import type { ComboProprio, FinalDoCombo, GolpeMontado, NomeGolpe } from './tipos';

/*
 * COMBOS PRÓPRIOS (docs/spec-revisao-motor-luta-v2.md §6, fatia V2-4): funções PURAS sobre a lista `combosProprios` de um lutador/ficha.
 * O motor (`fight/`) e a CPU só chamam estas funções; a UI pode listar os combos do mesmo dado. Nada aqui lê estado de partida.
 */

/** Golpes comuns que uma sequência pode ter (chão; nada de aéreo, agarrão, `_lag` nem `sResp`). */
export const NORMAIS_DE_COMBO: readonly NomeGolpe[] = ['lp', 'lk', 'hp', 'hk', 'clp', 'clk', 'chp', 'chk'];
/** Especiais que podem fechar uma sequência. */
export const ESPECIAIS_DE_COMBO: readonly NomeGolpe[] = ['sFire', 'sDown', 'sFwd'];

export const COMBO_MIN_GOLPES = 2;
export const COMBO_MAX_GOLPES = 4;
/** Teto da linha de efeito (`ComboProprio.efeito`): a maior hoje tem 34 caracteres; a folga mínima medida com a fonte real foi 20,6 px. */
export const EFEITO_MAX_CARACTERES = 40;
export const FINAIS_DE_COMBO: readonly FinalDoCombo[] = ['derruba', 'lanca', 'parede', 'cruza'];

/**
 * Falha ALTO no boot (como `validarParametrosE3`) se a lista de combos de `id` não faz sentido para os golpes montados `moves`:
 * dado errado vira erro na montagem, não um combo que silenciosamente nunca sai.
 */
export function validarCombosProprios(id: string, combos: readonly ComboProprio[] | undefined, moves: Readonly<Partial<Record<NomeGolpe, GolpeMontado>>>): void {
  if (combos === undefined) return;
  const ids = new Set<string>();
  const sequencias = new Set<string>();
  for (const c of combos) {
    const onde = `${id}.combosProprios[${c.id}]`;
    if (!c.id || ids.has(c.id)) throw new Error(`${onde}: id vazio ou repetido`);
    ids.add(c.id);
    if (!c.nome.trim()) throw new Error(`${onde}: nome vazio`);
    if (c.efeito !== undefined) {
      if (typeof c.efeito !== 'string' || !c.efeito.trim()) throw new Error(`${onde}: efeito vazio (omita o campo para a tela usar o texto padrão)`);
      if (/[\r\n\t]/.test(c.efeito) || c.efeito !== c.efeito.trim()) throw new Error(`${onde}: efeito com quebra de linha, tabulação ou espaço sobrando`);
      if (c.efeito.length > EFEITO_MAX_CARACTERES) throw new Error(`${onde}: efeito com ${c.efeito.length} caracteres (máximo ${EFEITO_MAX_CARACTERES}: a linha divide a altura com o nome)`);
    }
    const n = c.sequencia.length;
    if (n < COMBO_MIN_GOLPES || n > COMBO_MAX_GOLPES) throw new Error(`${onde}: a sequência tem ${COMBO_MIN_GOLPES} a ${COMBO_MAX_GOLPES} golpes (veio ${n})`);
    const chave = c.sequencia.join('>');
    if (sequencias.has(chave)) throw new Error(`${onde}: sequência ${chave} repetida (dois combos iguais deixam o reconhecimento ambíguo)`);
    sequencias.add(chave);
    c.sequencia.forEach((g, i) => {
      if (!moves[g]) throw new Error(`${onde}: golpe '${g}' não existe neste lutador/ficha`);
      const ultimo = i === n - 1;
      const normal = NORMAIS_DE_COMBO.includes(g);
      const especial = ESPECIAIS_DE_COMBO.includes(g);
      if (!normal && !(especial && ultimo)) throw new Error(`${onde}: golpe '${g}' no passo ${i}: só normais de chão, e um especial apenas no ÚLTIMO lugar`);
    });
    const ultimoGolpe = c.sequencia[n - 1] as NomeGolpe;
    const fechaComEspecial = ESPECIAIS_DE_COMBO.includes(ultimoGolpe);
    for (const i of c.semQueda ?? []) {
      if (!Number.isInteger(i) || i < 0 || i > n - 2) throw new Error(`${onde}: semQueda ${String(i)} fora de 0..${n - 2} (o último golpe é regido por 'final')`);
      const mv = moves[c.sequencia[i] as NomeGolpe] as GolpeMontado;
      if (!mv.kd) throw new Error(`${onde}: semQueda no passo ${i} ('${mv.id}') que já não derruba`);
      if (!(mv.hs !== undefined && mv.hs > 0)) throw new Error(`${onde}: semQueda no passo ${i} ('${mv.id}') sem atordoamento (hs) para segurar o rival`);
    }
    if ((c.semQueda?.length ?? 0) !== new Set(c.semQueda ?? []).size) throw new Error(`${onde}: semQueda com índice repetido`);
    if (c.final !== undefined) {
      if (!FINAIS_DE_COMBO.includes(c.final)) throw new Error(`${onde}: final '${String(c.final)}' desconhecido`);
      if (fechaComEspecial) throw new Error(`${onde}: final só vale quando o último golpe é comum (o especial tem o filme)`);
    }
  }
}

/** O histórico (golpes que acertaram, na ordem) é prefixo de `sequencia`? Histórico vazio casa com tudo; maior que a sequência, com nada. */
export function ehPrefixo(historico: readonly NomeGolpe[], sequencia: readonly NomeGolpe[]): boolean {
  if (historico.length > sequencia.length) return false;
  for (let i = 0; i < historico.length; i++) if (historico[i] !== sequencia[i]) return false;
  return true;
}

/** O primeiro combo (na ordem do dado) cuja sequência começa com `historico`, e o passo que o último golpe do histórico ocupa. */
export function comboReconhecido(combos: readonly ComboProprio[] | undefined, historico: readonly NomeGolpe[]): { combo: ComboProprio; passo: number } | null {
  if (!combos || historico.length === 0) return null;
  for (const combo of combos) if (ehPrefixo(historico, combo.sequencia)) return { combo, passo: historico.length - 1 };
  return null;
}

/** `histórico + proximo` é prefixo de algum combo? É o que decide se o cancelamento vale fora da regra de rank. */
export function comboAbreCancelamento(combos: readonly ComboProprio[] | undefined, historico: readonly NomeGolpe[], proximo: NomeGolpe): boolean {
  if (!combos || historico.length === 0) return false;
  return combos.some((c) => ehPrefixo([...historico, proximo], c.sequencia));
}

/** Golpes que continuam algum combo a partir de `historico` (sem repetir, na ordem do dado). A CPU escolhe entre eles. */
export function golpesQueContinuam(combos: readonly ComboProprio[] | undefined, historico: readonly NomeGolpe[]): NomeGolpe[] {
  const saida: NomeGolpe[] = [];
  if (!combos || historico.length === 0) return saida;
  for (const c of combos) {
    if (c.sequencia.length <= historico.length || !ehPrefixo(historico, c.sequencia)) continue;
    const g = c.sequencia[historico.length] as NomeGolpe;
    if (!saida.includes(g)) saida.push(g);
  }
  return saida;
}
