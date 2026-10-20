import type { Golpe, NomeGolpe } from './tipos';

/*
 * Tabela base de golpes (BASE_MOVES do protótipo, linhas 497-512). Cada lutador parte
 * daqui e aplica os ajustes de `LutadorDef.mods`.
 * S = preparação, A = ativos, R = recuperação. dmg = dano base, kb = empurrão, hs/bs =
 * atordoamento ao acertar/ser bloqueado. lvl: 'mid' (bloqueia em pé ou agachado), 'low'
 * (só agachado), 'over' (só em pé). rank: golpes só encadeiam em golpes de rank MAIOR
 * (soco fraco 1 → chute fraco 2 → soco forte 3 → chute forte 4 → especial 9).
 * rep = pode repetir o mesmo golpe (até 3x). bh = altura da caixa de acerto, rm =
 * multiplicador de alcance, adv = avanço (px) ao golpear, heavy = golpe pesado.
 * Botões: lp/lk = soco/chute fraco, hp/hk = soco/chute forte. Nomes: lp lk hp hk (em pé),
 * clp clk chp chk (agachado ↓), jlp jlk jhp jhk (no ar).
 */
export const NOMES_GOLPES_BASE = [
  'lp', 'lk', 'hp', 'hk', 'clp', 'clk', 'chp', 'chk', 'jlp', 'jhp', 'jlk', 'jhk', '_lag', 'throw',
] as const satisfies readonly NomeGolpe[];

export type NomeGolpeBase = (typeof NOMES_GOLPES_BASE)[number];

export const BASE_MOVES: Readonly<Record<NomeGolpeBase, Golpe>> = {
  lp: { pose: 'punch', S: 3, A: 3, R: 7, dmg: 4, kb: 3, hs: 14, bs: 8, lvl: 'mid', kind: 'punch', snd: 'punch', rank: 1, rep: 1, bh: 54, rm: 0.9 },
  lk: { pose: 'kick', S: 5, A: 4, R: 9, dmg: 5, kb: 4, hs: 16, bs: 9, lvl: 'mid', kind: 'kick', snd: 'kick', rank: 2, bh: 70, rm: 0.85 },
  hp: { pose: 'punch', S: 7, A: 4, R: 14, dmg: 9, kb: 8, hs: 24, bs: 12, lvl: 'mid', kind: 'punch', snd: 'punch', rank: 3, bh: 64, rm: 1.05, adv: 14, heavy: 1 },
  hk: { pose: 'kick', S: 9, A: 5, R: 18, dmg: 13, kb: 11, hs: 30, bs: 14, lvl: 'mid', kind: 'kick', snd: 'kick', rank: 4, bh: 84, rm: 1.1, adv: 18, heavy: 1, kd: 1 },
  clp: { pose: 'crouchPunch', S: 4, A: 3, R: 8, dmg: 4, kb: 3, hs: 15, bs: 8, lvl: 'mid', kind: 'punch', snd: 'punch', rank: 1, rep: 1, bh: 50, rm: 1, crouch: 1 },
  clk: { pose: 'sweep', S: 6, A: 3, R: 10, dmg: 5, kb: 3, hs: 15, bs: 9, lvl: 'low', kind: 'kick', snd: 'kick', rank: 2, bh: 44, rm: 0.8, crouch: 1 },
  chp: { pose: 'punch', S: 6, A: 4, R: 17, dmg: 10, kb: 5, hs: 0, bs: 12, lvl: 'mid', kind: 'punch', snd: 'punch', rank: 3, bh: 125, rm: 0.8, crouch: 1, kd: 1, heavy: 1, tilt: -0.28, lift: 8, tall: 1 },
  chk: { pose: 'sweep', S: 8, A: 6, R: 20, dmg: 9, kb: 6, hs: 0, bs: 14, lvl: 'low', kind: 'sweep', snd: 'kick', rank: 4, bh: 56, rm: 1, crouch: 1, kd: 1, heavy: 1 },
  jlp: { pose: 'jumpPunch', S: 2, A: 80, R: 0, dmg: 5, kb: 4, hs: 15, bs: 10, lvl: 'over', kind: 'punch', snd: 'punch', rank: 1, bh: 66, rm: 1, air: 1 },
  jhp: { pose: 'jumpPunch', S: 4, A: 80, R: 0, dmg: 8, kb: 6, hs: 20, bs: 12, lvl: 'over', kind: 'punch', snd: 'punch', rank: 3, bh: 74, rm: 1.05, air: 1, heavy: 1 },
  jlk: { pose: 'jumpKick', S: 3, A: 80, R: 0, dmg: 6, kb: 5, hs: 17, bs: 11, lvl: 'over', kind: 'kick', snd: 'kick', rank: 2, bh: 76, rm: 1, air: 1 },
  jhk: { pose: 'jumpKick', S: 5, A: 80, R: 0, dmg: 10, kb: 7, hs: 22, bs: 13, lvl: 'over', kind: 'kick', snd: 'kick', rank: 4, bh: 86, rm: 1.1, air: 1, heavy: 1 },
  _lag: { pose: 'crouch', S: 0, A: 0, R: 14, kind: 'lag', crouch: 1, rank: 0 },
  throw: { pose: 'punch', S: 3, A: 3, R: 22, dmg: 12, kb: 6, hs: 0, bs: 0, lvl: 'throw', kind: 'punch', snd: 'kick', rank: 9, throw: 1, bh: 60, rm: 0.6 },
};

/** O que falta no `mv` passado a applyHit quando o golpe é um projétil (PROJ_BASE, linha 1023). */
export const PROJ_BASE = { bs: 13, lvl: 'mid', snd: 'fireballHit', proj: true } as const;
