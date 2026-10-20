import type { InputFrame } from '../core/contratos';

/**
 * Comandos clássicos (porte de MOTIONS / dirNum / motion do protótipo, linhas 619-626 e 670-674).
 * Direções em notação numérica: 1 ↙ 2 ↓ 3 ↘ 4 ← 5 neutro 6 → 7 ↖ 8 ↑ 9 ↗, sempre relativas a
 * quem olha para a direita.
 */
export const MOTIONS = {
  dp: [6, 2, 3],
  qcf: [2, 3, 6],
  qcb: [2, 1, 4],
} as const satisfies Record<string, readonly number[]>;

export type Comando = keyof typeof MOTIONS;

/** Direção numérica de um quadro de entrada para quem olha para `facing` (+1 direita, -1 esquerda). */
export function dirNum(inp: Pick<InputFrame, 'left' | 'right' | 'up' | 'down'>, facing: number): number {
  const f = facing > 0 ? inp.right : inp.left;
  const b = facing > 0 ? inp.left : inp.right;
  const h = f ? 2 : b ? 0 : 1;
  const linha = inp.down ? [1, 2, 3] : inp.up ? [7, 8, 9] : [4, 5, 6];
  return linha[h] as number;
}

/**
 * O histórico `hist` (uma direção numérica por tick, mais recente por último) contém a sequência
 * `seq` em ordem, dentro dos últimos `win` ticks? (não precisa ser contígua).
 */
export function motion(hist: readonly number[], seq: readonly number[], win = 18): boolean {
  let j = seq.length - 1;
  for (let i = hist.length - 1; i >= 0 && i >= hist.length - win && j >= 0; i--) if (hist[i] === seq[j]) j--;
  return j < 0;
}
