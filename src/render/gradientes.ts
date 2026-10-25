import type { Ctx } from './tela';

/*
 * D3a (docs/desempenho-android-2026-10-24.md §5.2): o HUD criava ~11 gradientes lineares NOVOS por quadro (barras de vida/energia, painel do KO), todos
 * com as mesmas cores e a mesma geometria quadro a quadro. Um `CanvasGradient` é só descrição (as coordenadas valem no espaço do desenho na hora do
 * `fill`), então pode ser reaproveitado: o pixel é o mesmo. Chave = `id` (quem chama garante que o id determina as cores) + a geometria, conferida a
 * cada uso (mudou a geometria, recria).
 */
export type Parada = readonly [posicao: number, cor: string];

interface Guardado {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  g: CanvasGradient;
}

const porContexto = new WeakMap<object, Map<string, Guardado>>();

export function gradienteLinear(ctx: Ctx, id: string, x0: number, y0: number, x1: number, y1: number, paradas: readonly Parada[]): CanvasGradient {
  let m = porContexto.get(ctx);
  if (!m) {
    m = new Map();
    porContexto.set(ctx, m);
  }
  const e = m.get(id);
  if (e && e.x0 === x0 && e.y0 === y0 && e.x1 === x1 && e.y1 === y1) return e.g;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of paradas) g.addColorStop(o, c);
  m.set(id, { x0, y0, x1, y1, g });
  return g;
}

/** Degradê vertical de duas cores (o preenchimento do `textoArcade`): chave pelas cores e pela altura, criado só na primeira vez. */
export function gradienteVertical(ctx: Ctx, topo: string, base: string, y0: number, y1: number): CanvasGradient {
  let m = porContexto.get(ctx);
  if (!m) {
    m = new Map();
    porContexto.set(ctx, m);
  }
  const id = `v|${topo}|${base}|${y0}|${y1}`;
  const e = m.get(id);
  if (e) return e.g;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, topo);
  g.addColorStop(1, base);
  m.set(id, { x0: 0, y0, x1: 0, y1, g });
  return g;
}
