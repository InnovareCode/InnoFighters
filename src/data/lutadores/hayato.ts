import type { LutadorDef } from '../tipos';

/** HAYATO (f1 no protótipo): equilibrado, usa a tabela base. Trovão. */
export const HAYATO: LutadorDef = {
  id: 'hayato',
  idPrototipo: 'f1',
  country: 'JAPÃO',
  stage: 'jp',
  stageName: 'Castelo das Cerejeiras, Japão',
  name: 'HAYATO',
  title: 'O Punho do Trovão',
  pitch: 1.05,
  desc: 'Equilibrado e confiável. Ótimo para quem está começando.',
  fire: ['#6fe0ff', '#ffffff', '#1e6fe8'],
  accent: '#3fa9ff',
  pow: 1,
  spd: 1,
  hp: 100,
  jump: 1,
  scale: 1,
  stride: 9,
  bars: [3, 3, 3, 3],
  mods: {},
  especiais: {
    sFire: {
      name: 'RAIJIN-DAN', info: 'Esfera de trovão em linha reta. O clássico projétil.', pose: 'special', type: 'fire', kind: 'fire',
      S: 14, A: 3, R: 18, cost: 40, rank: 9,
      proj: { dmg: 15, sp: 9.5, kb: 10, hs: 26, kd: true, style: 'orb', sc: 1, life: 150 },
    },
    sDown: {
      name: 'RAIJIN-KEN', info: 'Soco ascendente com INVULNERABILIDADE no início. Ótimo contra pulos e ataques.', pose: 'jumpPunch', pre: 'crouch',
      type: 'rise', kind: 'punch', snd: 'punch', S: 4, A: 80, R: 0, cost: 30, rank: 9,
      vy: -14.5, vx: 1.5, inv: 8, lag: 22, dmg: 16, kb: 6, hs: 0, bs: 14, kd: 1, lvl: 'mid', air: 1, bh: 170, tall: 1, rm: 0.9, heavy: 1,
    },
    sFwd: {
      name: 'KAMINARI-STEP', info: 'Investida relâmpago com soco. Fecha a distância e encadeia em combos.', pose: 'punch', type: 'rush', kind: 'punch', snd: 'punch',
      S: 6, A: 8, R: 16, cost: 20, rank: 9,
      vx: 12.5, dmg: 11, kb: 7, hs: 26, bs: 12, lvl: 'mid', bh: 70, rm: 1.0, heavy: 1,
    },
  },
  anim: { sDown: { s: ['sb0'], a: ['sb1', 'sb2'], fall: 'jfall' } },
};
