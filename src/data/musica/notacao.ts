/*
 * Leitor da notação das pistas (ver tipos.ts). Puro: o mesmo texto dá sempre a mesma lista. Lança `Error` com o texto do compasso quando algo
 * não bate (a validação do carregamento e o sequenciador usam o mesmo leitor, então um tema inválido nunca chega a tocar).
 */

export interface NotaEscrita {
  /** Passo do compasso em que a nota começa. */
  readonly passo: number;
  /** Grau da escala (absoluto no lead; relativo à raiz no baixo e no acorde), já com as oitavas somadas (n graus por oitava). */
  readonly grau: number;
  /** Duração escrita, em passos (1 + os `-` que seguem). */
  readonly passos: number;
}

/** Fraco, médio e forte da percussão. */
export const PESO_PERC: readonly number[] = [0, 0.45, 0.75, 1];

const tokens = (texto: string): string[] => texto.split(/\s+/).filter((t) => t !== '' && t !== '|');

function erro(msg: string, texto: string): never {
  throw new Error(`notação inválida: ${msg} em "${texto}"`);
}

/** Lê uma melodia (lead e baixo). `nGraus` = graus da escala (o tamanho da oitava em graus). */
export function lerMelodia(texto: string, passos: number, nGraus: number): NotaEscrita[] {
  const ts = tokens(texto);
  if (ts.length !== passos) erro(`${ts.length} tokens, esperava ${passos}`, texto);
  const notas: { passo: number; grau: number; passos: number }[] = [];
  let ultima: { passo: number; grau: number; passos: number } | null = null;
  ts.forEach((t, i) => {
    if (t === '.') {
      ultima = null;
    } else if (t === '-') {
      if (!ultima) erro(`'-' sem nota para prolongar (passo ${i})`, texto);
      (ultima as { passos: number }).passos++;
    } else {
      const m = /^(\d)([',]*)$/.exec(t);
      if (!m) return erro(`token '${t}' (passo ${i})`, texto);
      const oit = (m[2] as string).split('').reduce((s, c) => s + (c === "'" ? 1 : -1), 0);
      ultima = { passo: i, grau: Number(m[1]) + oit * nGraus, passos: 1 };
      notas.push(ultima);
    }
  });
  return notas;
}

/** Lê um padrão de acorde: `x` toca, `-` prolonga, `.` pausa. O `grau` devolvido é sempre 0. */
export function lerAcorde(texto: string, passos: number): NotaEscrita[] {
  const ts = tokens(texto);
  if (ts.length !== passos) erro(`${ts.length} tokens, esperava ${passos}`, texto);
  const notas: { passo: number; grau: number; passos: number }[] = [];
  let ultima: { passo: number; grau: number; passos: number } | null = null;
  ts.forEach((t, i) => {
    if (t === '.') ultima = null;
    else if (t === '-') {
      if (!ultima) erro(`'-' sem acorde para prolongar (passo ${i})`, texto);
      (ultima as { passos: number }).passos++;
    } else if (t === 'x') {
      ultima = { passo: i, grau: 0, passos: 1 };
      notas.push(ultima);
    } else erro(`token '${t}' (passo ${i})`, texto);
  });
  return notas;
}

/** Lê um padrão de percussão: um caractere por passo (`.`, `1`, `2` ou `3`); devolve o peso de cada passo (0 = silêncio). */
export function lerPerc(texto: string, passos: number): number[] {
  const cs = texto.replace(/[\s|]/g, '').split('');
  if (cs.length !== passos) erro(`${cs.length} passos, esperava ${passos}`, texto);
  return cs.map((c, i) => {
    if (c === '.') return 0;
    if (c === '1' || c === '2' || c === '3') return PESO_PERC[Number(c)] as number;
    return erro(`caractere '${c}' (passo ${i})`, texto);
  });
}

/** Semitons acima da tônica de um grau (qualquer inteiro, positivo ou negativo): a oitava vem do quociente. */
export function semitonsDoGrau(escala: readonly number[], grau: number): number {
  const n = escala.length;
  const oit = Math.floor(grau / n);
  return (escala[grau - oit * n] as number) + 12 * oit;
}

/** Um padrão por compasso, em ciclo: aceita uma string só (vale para todos) ou uma lista. */
export const padroesEmLista = (p: string | readonly string[]): readonly string[] => (typeof p === 'string' ? [p] : p);

/** Padrão do compasso `c` (ciclo). */
export const padraoDoCompasso = (p: string | readonly string[], c: number): string => {
  const l = padroesEmLista(p);
  return l[c % l.length] as string;
};
