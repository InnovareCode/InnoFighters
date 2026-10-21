import type { CenaDef } from './tipos';

/**
 * Cena de poses por tempo (spec-chefao-zenon §2). A pose do tick `t` (0 = primeiro quadro da cena) é
 * `poses[floor(t·n/duracao)]`; a última segura até o fim e depois dele. Função pura: serve ao motor (cena da fase 2 do chefe,
 * `Fighter.poseT`) e à render (entrada e vitória, tabela de apresentação), então os dois sempre concordam.
 */
export function poseDaCena(cena: CenaDef, t: number): string {
  const n = cena.poses.length;
  const i = Math.floor((Math.max(0, t) * n) / cena.duracao);
  return cena.poses[Math.min(n - 1, i)] as string;
}

/** Erro de dados da cena: `duracao` inteira de 1 a 600; 1 a 8 nomes de pose `^[\w-]+$`. Falha ALTO no boot. */
export function validarCena(onde: string, c: CenaDef): void {
  if (!Number.isInteger(c.duracao) || c.duracao < 1 || c.duracao > 600) throw new Error(`${onde}: cena.duracao deve ser inteiro de 1 a 600 (veio ${String(c.duracao)})`);
  if (c.poses.length < 1 || c.poses.length > 8) throw new Error(`${onde}: cena.poses deve ter de 1 a 8 nomes (veio ${c.poses.length})`);
  for (const p of c.poses) {
    if (typeof p !== 'string' || !/^[\w-]+$/.test(p)) throw new Error(`${onde}: cena.poses com nome inválido '${String(p)}'`);
  }
}
