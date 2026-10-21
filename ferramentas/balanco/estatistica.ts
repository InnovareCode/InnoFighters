import { createHash } from 'node:crypto';

/** Intervalo de confiança de Wilson (95%) para `k` sucessos em `n` tentativas. Devolve [inferior, superior] em 0..1. */
export function wilson(k: number, n: number, z = 1.96): readonly [number, number] {
  if (n <= 0) return [0, 1];
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centro = (p + z2 / (2 * n)) / denom;
  const margem = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, centro - margem), Math.min(1, centro + margem)];
}

/** FNV-1a de 32 bits sobre o texto: semente estável e independente da ordem em que as lutas são executadas. */
export function semente32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** JSON com as chaves ordenadas: a mesma estrutura gera sempre o mesmo texto (base do hash de determinismo). */
export function jsonCanonico(valor: unknown): string {
  return JSON.stringify(valor, (_chave, v: unknown) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    }
    return v;
  });
}

export function hashDe(valor: unknown): string {
  return createHash('sha256').update(jsonCanonico(valor)).digest('hex').slice(0, 16);
}

export const pct = (x: number, casas = 1): string => `${(x * 100).toFixed(casas)}%`;
export const media = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
