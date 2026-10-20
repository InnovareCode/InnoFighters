/** Entrada com "estouro": a escala vai de 0,2 a 1 em 12 ticks, passando um pouco de 1. Porte de zoomIn. */
export const zoomIn = (t: number): number => {
  if (t >= 12) return 1;
  const k = t / 12;
  return 0.2 + 0.8 * (1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2));
};
