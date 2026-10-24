import type { EspeciaisLutador, Golpe, LutadorDef } from '../tipos';

/*
 * BAATAR, "O Avarga das Estepes": lutador NORMAL, 5º da fila de desbloqueio (`src/meta/regras.ts`: AMINU, CENTELLA, CAMILLE, NILA, BAATAR).
 * Já foi o chefão (E3 S1b, E5); o dono trocou o chefe final por outro e ele virou jogável comum: 1 barra, sem fichas `chefe`/`chefe2` e
 * sem `chefe` (a luta de chefe e a Dança da Águia como `cena-chefe` saíram daqui; a Dança volta só como entrada pré-luta e pose de
 * vitória, que dependem da spec da cena `{ duracao, poses }`, ver docs/handoff-vega-baatar-normal.md).
 *
 * Números de PARTIDA (docs/mecanicas-e3.md §2.5): os de dano/tempo saem do harness da E6 (`npm run balanco`). `stage` 'mn'
 * (Estepe do Naadam, a casa dele). Os testes de mecânica da E3 montam esta definição sobre o atlas do WEI LONG (`tests/unit/_kit-e3.ts`).
 */

/**
 * →+ESP: MERGULHO DA ÁGUIA. Salto alto que mira o x do rival na decolagem (`vxAlvo` = ticks de voo: vy −17 com a gravidade de 0,85
 * dá 40 ticks, medido no teste) e cai com golpe de corpo (`over`, derruba). Sem agarrão na queda (decisão do dono, §3.4). `vx` aqui é só
 * o TETO da velocidade horizontal. Fecha o trio ↓+ESP baixo (QUEBRA-BASE) / →+ESP alto (este) / ESP agarrão inbloqueável (ARREMESSO).
 */
export const MERGULHO_DA_AGUIA: Golpe = {
  name: 'MERGULHO DA ÁGUIA', info: 'Salto alto que rastreia o rival e cai de cima. Golpe ALTO: bloqueia-se em pé.',
  pose: 'jumpKick', pre: 'crouch', type: 'leap', kind: 'kick', snd: 'kick',
  S: 12, A: 80, R: 0, cost: 35, rank: 9,
  vy: -17, vx: 20, vxAlvo: 40, lag: 26, dmg: 10, kb: 9, hs: 0, bs: 16, kd: 1, lvl: 'over', air: 1, bh: 96, rm: 1, heavy: 1,
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
  // →+ESP: o MERGULHO (golpe ALTO, a ordem alto/baixo/agarrão que o dono escolheu).
  sFwd: MERGULHO_DA_AGUIA,
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
  // E6b: hp 118 -> 92 e pow 1,18 -> 0,90 (harness). Valem para o lutador normal.
  pow: 0.9,
  spd: 0.9,
  hp: 92,
  jump: 0.8,
  scale: 1.28,
  stride: 16,
  bars: [5, 1, 5, 3],
  // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
  combosProprios: [
    { id: 'baatar-quebra-base-encadeado', nome: 'O CHÃO DECIDE', sequencia: ['clk', 'hk', 'sDown'], semQueda: [1], efeito: 'segura em pé e fecha no QUEBRA-BASE' },
    { id: 'baatar-esmagamento', nome: 'CAVALGADA', sequencia: ['lk', 'hp', 'hp'], final: 'parede' },
  ],
  // PESO DA MONTANHA: armadura nos golpes fortes e nos especiais; `armadura.rankMax` limita a quem ela absorve.
  armadura: { rankMax: 2 },
  mods: {
    hp: { S: 9, dmg: 11, armor: 1 },
    hk: { S: 12, dmg: 15, armor: 1 },
    chp: { dmg: 12, armor: 1 },
    chk: { S: 10, dmg: 11, armor: 1 },
  },
  especiais: ESPECIAIS_BAATAR,
  // MERGULHO: o golpe usa a animação `leap` (sc0 decolagem, sc1 queda). O atlas real tem a arte própria (`dive0` agachado/impulso,
  // `dive1` o mergulho de braços à frente); a caixa de acerto sai de `dive1`. Sem o quadro (atlas provisório dos testes de motor)
  // vale o sc0/sc1 de sempre. (Era da ficha `chefe2`; agora é do def base.)
  poseDaFicha: { sc0: 'dive0', sc1: 'dive1' },
  // Guardião (spec chefões §4.2): ver AMINU. A cena da fase 2 fecha a Dança da Águia (`devekh2`) e sobe em `win`.
  chefe: {
    barras: 2,
    hpPorBarra: 46,
    cena: { duracao: 60, poses: ['devekh2', 'win'] },
    bonusVitoria: 3000,
    danoRecebido: 0.82,
    danoRecebidoDificil: 0.75,
  },
};
