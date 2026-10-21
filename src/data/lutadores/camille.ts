import type { LutadorDef } from '../tipos';

/*
 * CAMILLE, "A Riposte de Marselha" (E3 S4). No elenco desde a E5 (3ª da fila). Os testes de mecânica da E3 montam esta definição sobre o
 * atlas do WEI LONG (`tests/unit/_kit-e3.ts`).
 *
 * Números de PARTIDA (docs/mecanicas-e3.md §2.3; proposta §2.3). `stage` 'fr': Velho Porto de
 * Marselha. A PARADE perde para golpe baixo, agarrão e projétil: é o ponto fraco, por desenho.
 */
export const CAMILLE: LutadorDef = {
  id: 'camille',
  country: 'FRANÇA',
  stage: 'fr',
  stageName: 'Velho Porto de Marselha, França',
  name: 'CAMILLE',
  title: 'A Riposte de Marselha',
  pitch: 1.08,
  desc: 'Savate e esgrima. Quem ataca no momento errado apanha com o próprio golpe.',
  fire: ['#e6ebf7', '#ffffff', '#8a94b0'],
  accent: '#a9b8e6',
  pow: 0.98,
  spd: 1.04,
  hp: 98,
  jump: 1.0,
  scale: 1.03,
  stride: 12,
  bars: [3, 3, 4, 4],
  reach: 1.1,
  mods: {},
  especiais: {
    // ESP: postura de aparar. Na janela ativa (mt em [S, S + A)), golpe corpo a corpo `mid`/`over` que a toca é anulado,
    // o atacante fica atordoado e ela responde com o fouetté (`extras.sResp`). Baixo, agarrão e projétil passam.
    sFire: {
      name: 'PARADE', info: 'Postura de aparar: anula golpe médio ou alto e responde com um chute. Perde para golpe baixo, agarrão e projétil.',
      pose: 'special', type: 'aparar', kind: 'punch', snd: 'punch',
      S: 3, A: 18, R: 22, cost: 25, rank: 9,
      parry: { niveis: ['mid', 'over'], atordoaAtacante: 30 },
      ia: { papel: 'defesa' },
    },
    // ↓+ESP: chassé baixo. Se acerta o rival na PREPARAÇÃO do golpe dele, vira contragolpe reforçado (dano × 1,5 no lugar do
    // × 1,15 de sempre e + 12 ticks de atordoamento).
    sDown: {
      name: "COUP D'ARRÊT", info: 'Chassé baixo: se pega o rival na preparação do golpe dele, causa muito mais dano e atordoamento.',
      pose: 'sweep', type: 'melee', kind: 'sweep', snd: 'kick',
      S: 6, A: 4, R: 16, cost: 20, rank: 9,
      dmg: 9, kb: 5, hs: 20, bs: 12, lvl: 'low', crouch: 1, bh: 50, rm: 1.3,
      contra: { mult: 1.5, hs: 12 },
      ia: { papel: 'pressao', alcance: [60, 200] },
    },
    // →+ESP: giro de calcanhar que CRUZA para o outro lado do rival (`through`). Só acerta depois de cruzar, pelas costas
    // dele (a defesa precisa inverter o "trás").
    sFwd: {
      name: 'REVERS', info: 'Giro de calcanhar que cruza para o outro lado do rival: a defesa precisa inverter.',
      pose: 'kick', pre: 'crouch', type: 'rush', kind: 'kick', snd: 'kick',
      S: 8, A: 14, R: 22, cost: 30, rank: 9,
      vx: 12, through: 1, dmg: 13, kb: 8, hs: 24, bs: 14, lvl: 'mid', bh: 100, rm: 1, heavy: 1,
    },
  },
  // O fouetté da PARADE: golpe oculto (nenhuma entrada o alcança; só a PARADE o inicia). Alcance longo e caixa alta para
  // alcançar o atacante onde ele ficou. A pose própria (sa2) vem na E5 via `anim.sResp`.
  extras: {
    sResp: {
      name: 'FOUETTÉ', info: 'Resposta da PARADE.',
      pose: 'kick', kind: 'kick', snd: 'kick',
      S: 4, A: 5, R: 16, rank: 9,
      dmg: 12, kb: 9, hs: 0, bs: 14, kd: 1, lvl: 'mid', bh: 120, rm: 1.5, heavy: 1, tall: 1,
    },
  },
};
