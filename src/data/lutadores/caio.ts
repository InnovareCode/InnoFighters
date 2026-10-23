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
  // ARTE NOVA (2026-10-23): o alcance de golpe nasce da ponta (tipX/tipY) do atlas, e as poses novas chegam mais longe. O `rm`
  // (e o `bh` do hk e da MEIA-LUA) abaixo devolve a caixa do CAIO ao tamanho de antes: largura a +-10% da original, medida em
  // tests/unit/caio-arte-calibrada.test.ts. Os números do protótipo seguem em tests/fixtures/dados-prototipo/originais.json.
  // Antes -> depois: lp 0.8 -> 0.65, lk 1.15 -> 0.87, hp 0.95 -> 0.72, hk 1.38 -> 1.22 (+ bh 168), jlp 1 -> 0.76 (novo),
  // jhp 1.05 -> 0.8, jlk 1.15 -> 0.74, jhk 1.25 -> 0.8; RABO-DE-ARRAIA rm 2 -> 2.8; MEIA-LUA rm 1.2 -> 0.76 e bh 92 -> 160.
  // clp, clk e chk já caem a menos de 10%: intactos. O hp ficou +9% (e não -1%): com a largura igual o CAIO perdia 5 pontos de
  // vitória no harness (49,2% -> 43,8%); com 0.72 volta a 47,8%. Altura da caixa (não corrigível por dados): ver o teste.
  mods: {
    lp: { rm: 0.65 },
    lk: { rm: 0.87 },
    hp: { S: 8, dmg: 8.5, rm: 0.72 },
    hk: { S: 10, dmg: 12.5, rm: 1.22, bh: 168 },
    clk: { rm: 1.1 },
    chk: { rm: 1.4 },
    jlp: { rm: 0.76 },
    jhp: { rm: 0.8 },
    jlk: { rm: 0.74 },
    jhk: { rm: 0.8 },
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
      dmg: 13, kb: 8, hs: 0, bs: 15, kd: 1, lvl: 'low', bh: 58, rm: 2.8, crouch: 1, heavy: 1, spin: 1,
    },
    sFwd: {
      name: 'MEIA-LUA', info: 'Salto de ginga com chute descendente. Golpe ALTO: só se defende em pé.', pose: 'jumpKick', pre: 'crouch',
      type: 'leap', kind: 'kick', snd: 'kick', S: 6, A: 80, R: 0, cost: 20, rank: 9,
      vy: -10.8, vx: 8.4, lag: 12, dmg: 14, kb: 8, hs: 26, bs: 13, lvl: 'over', air: 1, bh: 160, rm: 0.76, heavy: 1,
    },
  },
};
