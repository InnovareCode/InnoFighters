/** Funcoes puras do nucleo do protótipo (secao 1). Sem aleatoriedade: ver rng.ts. */

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export type Retangulo = { x: number; y: number; w: number; h: number };

export const overlap = (a: Retangulo, b: Retangulo): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Frequencia (Hz) de uma nota MIDI. */
export const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
