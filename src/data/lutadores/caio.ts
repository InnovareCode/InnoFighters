import type { LutadorDef } from '../tipos';

/** CAIO (f4 no protótipo): capoeira, chutes de longo alcance. */
export const CAIO: LutadorDef = {
  id: 'caio',
  idPrototipo: 'f4',
  country: 'BRASIL',
  stage: 'br',
  stageName: 'Copacabana, Rio de Janeiro',
  name: 'CAIO',
  title: 'Mestre da Ginga',
  pitch: 0.98,
  desc: 'Chutes longos e mobilidade. Controla o espaço.',
  fire: ['#c8ff3a', '#fffde0', '#2fb52f'],
  accent: '#7ddc3a',
  pow: 0.97,
  spd: 1.07,
  hp: 98,
  jump: 1.12,
  scale: 1.02,
  stride: 13,
  bars: [3, 4, 3, 5],
  reach: 1.12,
  mods: {
    lp: { rm: 0.8 },
    lk: { rm: 1.15 },
    hp: { S: 8, dmg: 8.5, rm: 0.95 },
    hk: { S: 10, dmg: 12.5, rm: 1.38 },
    clk: { rm: 1.1 },
    chk: { rm: 1.4 },
    jlk: { rm: 1.15 },
    jhk: { rm: 1.25 },
  },
  especiais: {
    sFire: {
      name: 'ONDA VERDE', info: 'Meia-lua de energia que VAI e VOLTA como bumerangue. Pode acertar na volta.', pose: 'special', type: 'fire', kind: 'fire',
      S: 12, A: 3, R: 17, cost: 38, rank: 9,
      proj: { dmg: 14, sp: 11.5, kb: 9, hs: 25, kd: true, style: 'boomerang', sc: 1.05, acc: 0.3, life: 150 },
    },
    sDown: {
      name: 'RABO-DE-ARRAIA', info: 'Rasteira giratória de alcance enorme. Golpe BAIXO que derruba.', pose: 'sweep', type: 'melee', kind: 'sweep', snd: 'kick',
      S: 9, A: 7, R: 22, cost: 24, rank: 9,
      dmg: 13, kb: 8, hs: 0, bs: 15, kd: 1, lvl: 'low', bh: 58, rm: 2.0, crouch: 1, heavy: 1, spin: 1,
    },
    sFwd: {
      name: 'MEIA-LUA', info: 'Salto de ginga com chute descendente. Golpe ALTO: só se defende em pé.', pose: 'jumpKick', pre: 'crouch',
      type: 'leap', kind: 'kick', snd: 'kick', S: 6, A: 80, R: 0, cost: 20, rank: 9,
      vy: -10.8, vx: 8.4, lag: 12, dmg: 14, kb: 8, hs: 26, bs: 13, lvl: 'over', air: 1, bh: 92, rm: 1.2, heavy: 1,
    },
  },
};
