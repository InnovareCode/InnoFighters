import type { PoseDados, Poses } from './tipos';

/*
 * Cadeia de fallback de poses (FALLBACK / NEEDS_TILT / ALIAS do protótipo, linhas 371-385).
 * Poses que a arte de um lutador não tem usam outra no lugar.
 */
export const FALLBACK: Readonly<Record<string, string>> = {
  jumpPunch: 'punch', jumpKick: 'kick', block: 'guard', idleB: 'guard', walkC: 'walkA', win: 'guard',
  crouchPunch: 'punch', sweep: 'kick', crouch: 'guard',
};
export const NEEDS_TILT: Readonly<Record<string, 1>> = { jumpPunch: 1, jumpKick: 1 };
/** Quadros novos (folhas 4x3) -> pose antiga equivalente, enquanto a arte nova não chega. */
export const ALIAS: Readonly<Record<string, string>> = {
  idle0: 'guard', idle1: 'guard', idle2: 'idleB', idle3: 'idleB',
  walk0: 'walkA', walk1: 'walkC', walk2: 'walkB', walk3: 'walkC', walk4: 'walkA', walk5: 'walkC', walk6: 'walkB', walk7: 'walkC',
  cblock: 'crouch', jsquat: 'crouch', jup: 'jump', jtop: 'jump', jfall: 'jump', land: 'crouch',
  hitH: 'hit', hitB: 'hit', kdAir: 'hit', koFloor: 'ko',
  lp0: 'guard', lp1: 'punch', hp0: 'guard', hp1: 'punch', lk0: 'guard', lk1: 'kick', hk0: 'guard', hk1: 'kick',
  clp: 'crouchPunch', clk: 'sweep', upper: 'punch',
  sa0: 'guard', sa1: 'special', sa2: 'special', sa3: 'guard', sb0: 'crouch', sb3: 'jump', sc0: 'crouch',
  jkick: 'jumpKick', jpunch: 'jumpPunch',
};

/** O mínimo que getPD precisa de um lutador montado. */
export type ComPoses = { pd: Poses; alias?: Readonly<Record<string, string>> };

/**
 * Pose a desenhar para o nome pedido (getPD). Ordem: pose própria -> alias (do lutador, depois
 * global) -> fallback do alias -> fallback do nome -> `guard`. Acréscimo à prova de arte nova:
 * se nem `guard` existir (atlas novo só com nomes canônicos), cai em `idle0`. Com a arte
 * antiga o resultado é idêntico ao do protótipo.
 */
export function getPD(ch: ComPoses, name: string): PoseDados {
  const pd = ch.pd;
  const direta = pd[name];
  if (direta) return direta;
  const a = ch.alias?.[name] || ALIAS[name];
  const viaAlias = a ? pd[a] || pd[FALLBACK[a] ?? ''] : undefined;
  const r = viaAlias || pd[FALLBACK[name] ?? ''] || pd['guard'] || pd['idle0'];
  if (!r) throw new Error(`getPD: lutador sem guard/idle0 (pose pedida: ${name})`);
  return r;
}

export function hasPose(ch: ComPoses, name: string): boolean {
  return !!ch.pd[name];
}
