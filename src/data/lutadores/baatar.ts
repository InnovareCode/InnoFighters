import type { EspeciaisLutador, Golpe, LutadorDef } from '../tipos';

/*
 * BAATAR, "O Avarga das Estepes" (chefão, E3 S1b). No elenco desde a E5 como CHEFE (`src/meta/regras.ts`): última luta do Arcade; jogável depois
 * de derrotado (1 barra, ficha base). Os testes de mecânica da E3 montam esta definição sobre o atlas do WEI LONG
 * (`tests/unit/_kit-e3.ts`).
 *
 * Números de PARTIDA (docs/mecanicas-e3.md §2.5 e §3; proposta §2.4). Os de dano/tempo saem do harness da E6. `stage`
 * 'mn' (Estepe do Naadam). As poses citadas são as que qualquer atlas tem; a arte própria (devekh, dive) entra por
 * nome onde o atlas a tem (a Dança usa `devekh0..2` em `Fighter.poseT`).
 */

/**
 * →+ESP na fase 2: MERGULHO DA ÁGUIA. Salto alto que mira o x do rival na decolagem (`vxAlvo` = ticks de voo: vy −17 com
 * a gravidade de 0,85 dá 40 ticks, medido no teste) e cai com golpe de corpo (`over`, derruba). Sem agarrão na queda
 * (decisão do dono, §3.4). `vx` aqui é só o TETO da velocidade horizontal.
 */
export const MERGULHO_DA_AGUIA: Golpe = {
  name: 'MERGULHO DA ÁGUIA', info: 'Salto alto que rastreia o rival e cai de cima. Só na 2ª fase. Golpe ALTO: bloqueia-se em pé.',
  pose: 'jumpKick', pre: 'crouch', type: 'leap', kind: 'kick', snd: 'kick',
  S: 12, A: 80, R: 0, cost: 30, rank: 9,
  vy: -17, vx: 20, vxAlvo: 40, lag: 26, dmg: 20, kb: 9, hs: 0, bs: 16, kd: 1, lvl: 'over', air: 1, bh: 96, rm: 1, heavy: 1,
  ia: { papel: 'aproximar', alcance: [200, 700] },
};

const ESPECIAIS_BAATAR: EspeciaisLutador = {
  // ESP: agarrão de comando (inbloqueável, alcance 162 = 1,5x o normal). Errou: fica exposto a S + A + R.
  sFire: {
    name: 'ARREMESSO DO AVARGA', info: 'Agarrão de comando: não se bloqueia e alcança longe. Se errar, demora para se recuperar.',
    pose: 'special', type: 'melee', kind: 'punch', snd: 'kick',
    S: 14, A: 3, R: 36, cost: 30, rank: 9,
    throw: 1, lvl: 'throw', dmg: 22, kb: 6, hs: 0, bs: 0, bh: 60, rm: 0.6, armor: 1,
    agarrao: { alcance: 162, dmg: 22 },
    ia: { papel: 'pressao', alcance: [0, 150] },
  },
  // ↓+ESP: rasteira de perna. Golpe BAIXO: só se defende agachado.
  sDown: {
    name: 'QUEBRA-BASE', info: 'Gancho de perna baixo. Golpe BAIXO: só se defende agachado.',
    pose: 'sweep', type: 'melee', kind: 'sweep', snd: 'kick',
    S: 10, A: 5, R: 22, cost: 20, rank: 9,
    dmg: 14, kb: 7, hs: 0, bs: 14, kd: 1, lvl: 'low', crouch: 1, bh: 50, rm: 1.15, armor: 1,
  },
  // →+ESP: corrida de braços abertos que vira agarrão ao tocar (janela = A). Armadura contra golpes leves. `alcance` 96
  // porque o rival nunca fica a menos de 78 px (corpo 39 + 39): o 70 da primeira versão do plano jamais agarrava.
  sFwd: {
    name: 'ABRAÇO DA ESTEPE', info: 'Corre de braços abertos e agarra quem tocar. Ignora golpes leves, perde para golpe forte.',
    pose: 'punch', pre: 'crouch', type: 'rush', kind: 'punch', snd: 'kick',
    S: 12, A: 16, R: 30, cost: 35, rank: 9,
    vx: 9, throw: 1, lvl: 'throw', dmg: 20, kb: 8, hs: 0, bs: 0, bh: 100, rm: 0.9, armor: 1,
    agarrao: { alcance: 96, dmg: 20, janela: 16 },
    ia: { papel: 'aproximar', alcance: [110, 260] },
  },
};

export const BAATAR: LutadorDef = {
  id: 'baatar',
  country: 'MONGÓLIA',
  stage: 'mn',
  stageName: 'Estepe do Naadam, Mongólia',
  name: 'BAATAR',
  title: 'O Avarga das Estepes',
  pitch: 0.7,
  desc: 'Campeão invicto do bökh. Agarra, esmaga e não se abala com golpes leves.',
  fire: ['#ff4a2e', '#fff0d6', '#9c140f'],
  accent: '#e0402a',
  // jogável (após ser derrotado): hp 118 · pow 1.18. O modo chefão usa as fichas abaixo e `chefe.hpPorBarra`.
  pow: 1.18,
  spd: 0.9,
  hp: 118,
  jump: 0.8,
  scale: 1.28,
  stride: 16,
  bars: [5, 1, 5, 3],
  // PESO DA MONTANHA: armadura nos golpes fortes e nos especiais; `armadura.rankMax` limita a quem ela absorve.
  armadura: { rankMax: 2 },
  mods: {
    hp: { S: 9, dmg: 11, armor: 1 },
    hk: { S: 12, dmg: 15, armor: 1 },
    chp: { dmg: 12, armor: 1 },
    chk: { S: 10, dmg: 11, armor: 1 },
  },
  especiais: ESPECIAIS_BAATAR,
  fichas: {
    // Atributos do modo chefão (§3.1). `hp` não vale aqui: o chefe usa `chefe.hpPorBarra`.
    chefe: { pow: 1.3, spd: 0.82 },
    // Fase 2: energia mais saturada e o MERGULHO no lugar do ABRAÇO (ED-M5).
    chefe2: {
      pow: 1.3,
      spd: 0.82,
      fire: ['#ff2a10', '#ffe08a', '#c4120a'],
      especiais: { ...ESPECIAIS_BAATAR, sFwd: MERGULHO_DA_AGUIA },
      // MERGULHO: o golpe usa a animação `leap` (sc0 decolagem, sc1 queda). Na fase 2 o atlas real tem a arte própria
      // (`dive0` agachado/impulso, `dive1` o mergulho de braços à frente); a caixa de acerto sai de `dive1`. Sem o quadro
      // (atlas provisório dos testes de motor) vale o sc0/sc1 de sempre.
      poseDaFicha: { sc0: 'dive0', sc1: 'dive1' },
    },
  },
  // Só vale com `ConfigPartida.chefe`. PROVISÓRIOS (E6 fecha com o harness e o dono): `hpPorBarra` 75 (150 no total, os
  // "50%" do Apolo caem na troca de barra), `danca.duracao` 90 ticks (~1,5 s), `bonusVitoria` 5000 e o perfil de CPU
  // (`IA_CHEFE` em src/fight/cpu.ts: +0,15 em react/block; fase 2 com aggr 1 e anti +0,2), que são os valores do doc.
  // O cenário é o `stage` 'mn' (luta-se na casa do rival: contra o chefe, a Estepe do Naadam).
  chefe: {
    barras: 2,
    hpPorBarra: 75,
    fichaFase1: 'chefe',
    fichaFase2: 'chefe2',
    danca: { duracao: 90 },
    bonusVitoria: 5000,
  },
};
