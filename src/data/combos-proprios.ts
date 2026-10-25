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
/** R-8 (§3.5.2): cada lutador (cada postura da NILA) tem no máximo 2 combos: o BÁSICO (fraco > forte > especial) e uma ASSINATURA. */
export const COMBOS_MAX_POR_LUTADOR = 2;
/** R-8 (V3): no máximo 3 golpes fracos numa sequência (só uma assinatura passa de 2). */
export const COMBO_MAX_FRACOS = 3;

/**
 * Falha ALTO no boot (como `validarParametrosE3`) se a lista de combos de `id` não faz sentido para os golpes montados `moves`:
 * dado errado vira erro na montagem, não um combo que silenciosamente nunca sai.
 */
export function validarCombosProprios(id: string, combos: readonly ComboProprio[] | undefined, moves: Readonly<Partial<Record<NomeGolpe, GolpeMontado>>>): void {
  if (combos === undefined) return;
  const ids = new Set<string>();
  const sequencias = new Set<string>();
  if (combos.length > COMBOS_MAX_POR_LUTADOR) throw new Error(`${id}.combosProprios: no máximo ${COMBOS_MAX_POR_LUTADOR} combos por lutador/ficha (veio ${combos.length})`);
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
    validarForcaDoCombo(onde, c, moves);
  }
}

/** Ordem de força para a regra V1 (a força não desce). */
const ORDEM_DA_FORCA: Readonly<Record<ForcaDoGolpe, number>> = { fraco: 1, forte: 2, especial: 3 };

/** R-8, regras V1, V2, V3 e V6 (docs/spec-redesenho-jogabilidade.md §3.5.2). V4 e V5 comparam combos entre si/olham a arte: ficam nos testes do dado. */
function validarForcaDoCombo(onde: string, c: ComboProprio, moves: Readonly<Partial<Record<NomeGolpe, GolpeMontado>>>): void {
  const forcas = c.sequencia.map((g) => forcaDoRank((moves[g] as GolpeMontado).rank));
  forcas.forEach((f, i) => {
    if (f === null) throw new Error(`${onde}: golpe '${c.sequencia[i]}' sem força definida (rank fora de 1-4 e 9)`);
  });
  for (let i = 1; i < forcas.length; i++) {
    if (ORDEM_DA_FORCA[forcas[i] as ForcaDoGolpe] < ORDEM_DA_FORCA[forcas[i - 1] as ForcaDoGolpe]) {
      throw new Error(`${onde}: V1 a força desce no passo ${i} ('${c.sequencia[i - 1]}' ${forcas[i - 1]} > '${c.sequencia[i]}' ${forcas[i]})`);
    }
  }
  const fracos = forcas.filter((f) => f === 'fraco').length;
  if (fracos > COMBO_MAX_FRACOS) throw new Error(`${onde}: V3 ${fracos} golpes fracos (máximo ${COMBO_MAX_FRACOS})`);
  const ultimo = c.sequencia[c.sequencia.length - 1] as NomeGolpe;
  if (c.final !== undefined && forcas[forcas.length - 1] !== 'forte') throw new Error(`${onde}: V2 final '${c.final}' só vale em golpe forte (o último é '${ultimo}')`);
  const mv = moves[ultimo] as GolpeMontado;
  if (ESPECIAIS_DE_COMBO.includes(ultimo) && (mv.contra !== undefined || mv.parry !== undefined || mv.ia?.papel === 'defesa')) {
    throw new Error(`${onde}: V6 o especial '${ultimo}' é de contragolpe/defesa e não fecha combo`);
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

// ----- R-8 (`ritmo.cadeia`): cadeia universal por FORÇA (docs/spec-redesenho-jogabilidade.md §3.5.1) -----

/** Força de um golpe, derivada do `rank` de sempre (nenhum dado muda): fraco = rank 1-2, forte = rank 3-4, especial = rank 9. */
export type ForcaDoGolpe = 'fraco' | 'forte' | 'especial';

export function forcaDoRank(rank: number): ForcaDoGolpe | null {
  if (rank >= 1 && rank <= 2) return 'fraco';
  if (rank >= 3 && rank <= 4) return 'forte';
  if (rank === 9) return 'especial';
  return null;
}

/** A cadeia inteira (golpes encadeados por cancelamento, contando o golpe em curso e o que vem a seguir, super incluído) tem no máximo 4 golpes. */
export const CADEIA_MAX_GOLPES = 4;
/** No máximo 2 golpes fracos na cadeia universal (3 só numa assinatura: V3). */
export const CADEIA_MAX_FRACOS = 2;

/**
 * Regra da cadeia universal: o cancelamento de `ranks` (a cadeia até agora; o último é o golpe em curso) para um golpe de rank `proximo`.
 * fraco > forte > especial; fraco > fraco só em ordem de rank crescente (ou na repetição `rep` do soco fraco) e com no máximo 2 fracos;
 * forte > forte e qualquer descida NÃO cancelam (só um combo de assinatura abre isso); especial não cancela. `repete` = o golpe tem `rep` e
 * ainda cabe uma repetição. O combo próprio e o super são decididos fora (o chamador consulta `comboAbreCancelamento` e `cadeiaCabeMais`).
 */
export function cadeiaPermite(ranks: readonly number[], proximo: number, repete = false): boolean {
  if (!cadeiaCabeMais(ranks.length)) return false;
  const atual = ranks[ranks.length - 1];
  if (atual === undefined) return false;
  const fa = forcaDoRank(atual);
  const fp = forcaDoRank(proximo);
  if (fa === null || fp === null || fa === 'especial') return false;
  if (fp === 'especial') return true;
  if (fa === 'fraco' && fp === 'forte') return true;
  if (fa === 'fraco' && fp === 'fraco') {
    const fracos = ranks.filter((r) => forcaDoRank(r) === 'fraco').length;
    return (proximo > atual || repete) && fracos < CADEIA_MAX_FRACOS;
  }
  return false;
}

/** Cabe mais um golpe numa cadeia que já tem `tamanho` golpes? */
export function cadeiaCabeMais(tamanho: number): boolean {
  return tamanho < CADEIA_MAX_GOLPES;
}
