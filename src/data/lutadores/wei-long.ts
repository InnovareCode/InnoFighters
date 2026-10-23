import type { LutadorDef } from '../tipos';

/** WEI LONG (f2 no protótipo): kung fu, lento e pesado. Força bruta. */
export const WEI_LONG: LutadorDef = {
  id: 'wei-long',
  idPrototipo: 'f2',
  country: 'CHINA',
  stage: 'cn',
  stageName: 'Templo da Montanha, China',
  name: 'WEI LONG',
  title: 'O Dragão de Ferro',
  pitch: 0.82,
  desc: 'Mestre de kung fu. Lento, porém devastador: cada palma pesa.',
  fire: ['#d58bff', '#fff3ff', '#7a2de0'],
  accent: '#b46bff',
  // E6b (balanceamento, docs/handoff-vega-e6b.md): pow 1.14 -> 0.93 e hp 108 -> 96, e o dano dos golpes comuns abaixo. Os números do
  // PROTÓTIPO ficam em tests/fixtures/dados-prototipo/originais.json (oráculo de fidelidade); tempos, alcance e armadura não mudaram.
  pow: 0.93,
  spd: 0.9,
  hp: 96,
  jump: 0.94,
  scale: 1.04,
  stride: 15,
  bars: [5, 2, 4, 3],
  // ARTE NOVA (2026-10-23): o alcance de golpe nasce da ponta (tipX/tipY) do atlas, e as poses novas chegam menos longe (hp, hk, soco aéreo,
  // ombrada) ou mais (lk). O `rm` abaixo devolve a largura da caixa ao tamanho de antes, a -2,5% (medido em
  // tests/unit/wei-arte-calibrada.test.ts). Os -2,5% são de propósito: com a largura IGUAL o WEI subia 3 pontos de vitória no harness
  // (48,0% -> 50,8%); a largura é a alavanca mais sensível (8% a menos derrubava ~9 pontos). Números do protótipo: tests/fixtures/dados-prototipo.
  // Antes -> depois (rm): lp 0.9 -> 0.96, lk 0.85 -> 0.73, hp 1.05 -> 1.17, hk 1.1 -> 1.2, chk 1 -> 1.05, jlp 1 -> 1.22, jhp 1.05 -> 1.28,
  // jlk 1 -> 1.03, jhk 1.1 -> 1.12; TIE SHAN KAO rm 0.95 -> 2.02 (a ombrada tem a ponta no ombro, 85 px à frente da âncora; o punho do
  // protótipo chegava a 152 px de caixa). clp, clk, chp e throw já caem a menos de 10%: intactos.
  mods: {
    lp: { S: 4, dmg: 4.5, rm: 0.96 },
    lk: { S: 6, dmg: 6, rm: 0.73 },
    hp: { S: 9, A: 5, R: 17, dmg: 10, kb: 10, adv: 18, rm: 1.17 },
    hk: { S: 12, A: 5, R: 22, dmg: 14, kb: 13, adv: 20, rm: 1.2 },
    clp: { dmg: 5 },
    chp: { S: 7, dmg: 10 },
    chk: { S: 9, dmg: 9, rm: 1.05 },
    jlp: { rm: 1.22 },
    jhp: { dmg: 11, rm: 1.28 },
    jlk: { rm: 1.03 },
    jhk: { dmg: 13, rm: 1.12 },
  },
  especiais: {
    sFire: {
      name: 'LONG ZHANG', info: 'Palma do Dragão: onda de chi ENORME e lenta. Muito dano, derruba.', pose: 'special', type: 'fire', kind: 'fire',
      S: 20, A: 3, R: 22, cost: 45, rank: 9,
      proj: { dmg: 20, sp: 6.2, kb: 12, hs: 30, kd: true, style: 'orb', sc: 1.7, life: 210 },
    },
    sDown: {
      name: 'ZHEN DI', info: 'Pisão que lança um tremor rente ao chão. Golpe BAIXO: só se defende agachado ou pulando.', pose: 'crouchPunch', type: 'fire', kind: 'fire',
      S: 14, A: 3, R: 26, cost: 28, rank: 9,
      proj: { dmg: 13, sp: 8.6, kb: 8, hs: 24, kd: true, style: 'wave', sc: 1.25, sy: 0.55, low: true, life: 60 },
    },
    sFwd: {
      name: 'TIE SHAN KAO', info: 'Ombrada da Montanha de Ferro, com ARMADURA: não para ao ser atingido. Derruba.', pose: 'punch', pre: 'crouch',
      type: 'rush', kind: 'punch', snd: 'kick', S: 10, A: 10, R: 24, cost: 35, rank: 9,
      vx: 8.2, armor: 1, dmg: 19, kb: 12, hs: 0, bs: 15, kd: 1, lvl: 'mid', bh: 120, rm: 2.02, heavy: 1, tilt: 0.14,
    },
  },
};
