import type { LutadorDef } from '../tipos';

/** MIN-JI (f3 no protótipo): taekwondo, muito rápida, golpes leves. */
export const MIN_JI: LutadorDef = {
  id: 'min-ji',
  idPrototipo: 'f3',
  country: 'COREIA DO SUL',
  stage: 'kr',
  stageName: 'Palácio de Seul, Coreia do Sul',
  name: 'MIN-JI',
  title: 'A Tempestade de Seul',
  pitch: 1.55,
  desc: 'Campeã de taekwondo. Rápida, chutes em sequência, mas frágil.',
  fire: ['#ff6a9a', '#fff0f5', '#d4144f'],
  accent: '#ff4f86',
  // V2-6 (motor v2 ligado, docs/balanco-motor-v2.md): pow 0.9 -> 0.92 e hp 94 -> 97 (original do protótipo em tests/fixtures/dados-prototipo/originais.json).
  pow: 0.92,
  spd: 1.17,
  // R-12 (ritmo completo: cadeia por força, CPU nova, super): hp 97 -> 111 (a taxa estava em 32-37% com tudo ligado; 48% depois). O pow fica em 0.92: a tabela do filme (filmes.ts) é calibrada com ele.
  hp: 111,
  jump: 1.08,
  scale: 0.97,
  stride: 12,
  bars: [2, 5, 2, 4],
  // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
  combosProprios: [
    { id: 'min-ji-hana-dul-set', nome: 'HANA-DUL-SET', sequencia: ['lk', 'lk', 'hk'], final: 'lanca' },
    { id: 'min-ji-tornado-de-seul', nome: 'NOTA MÁXIMA', sequencia: ['lk', 'hk', 'sDown'], semQueda: [1], efeito: 'segura em pé e sobe no HOERI CHAGI' },
  ],
  mods: {
    lp: { S: 2, A: 3, R: 5, dmg: 3.5 },
    lk: { S: 4, R: 7, dmg: 4.5 },
    hp: { S: 5, R: 11, dmg: 7.5, adv: 24 },
    hk: { S: 7, A: 5, R: 14, dmg: 10.5, adv: 28 },
    clp: { S: 3, R: 6 },
    chp: { S: 5, dmg: 8.5 },
    chk: { S: 6, A: 5, R: 16, dmg: 8 },
    jlp: { dmg: 4.5 },
    jhk: { dmg: 8.5 },
  },
  especiais: {
    sFire: {
      name: 'BULKKOT', info: 'Dois chutes em meia-lua que soltam lâminas de fogo. Baratos e ótimos para pressionar.', pose: 'special', type: 'fire', kind: 'fire',
      S: 9, A: 3, R: 15, shots: [9, 19], cost: 30, rank: 9,
      proj: { dmg: 8, sp: 12.8, kb: 6, hs: 20, kd: false, kdLast: true, style: 'blade', sc: 0.8, life: 120 },
    },
    sDown: {
      name: 'HOERI CHAGI', info: 'Chute tornado subindo que acerta 3 VEZES, com invulnerabilidade curta. Acerta quem pula.', pose: 'jumpKick', pre: 'crouch',
      type: 'rise', kind: 'kick', snd: 'kick', S: 4, A: 80, R: 0, cost: 28, rank: 9,
      vy: -12.4, vx: 2.6, inv: 6, lag: 18, dmg: 6, hits: 3, every: 7, kb: 4, hs: 18, bs: 10, kd: 1, lvl: 'mid', air: 1, bh: 150, tall: 1, rm: 1.15, heavy: 1, spin: 1,
    },
    sFwd: {
      name: 'TWIO YEOP CHAGI', info: 'Voadora lateral: atravessa a tela num salto rasante e acerta forte.', pose: 'kick', type: 'leap', kind: 'kick', snd: 'kick',
      S: 5, A: 80, R: 0, cost: 22, rank: 9,
      vy: -6.8, vx: 13.5, lag: 10, dmg: 12, kb: 8, hs: 24, bs: 12, lvl: 'mid', air: 1, bh: 96, rm: 1.05, heavy: 1,
    },
  },
};
