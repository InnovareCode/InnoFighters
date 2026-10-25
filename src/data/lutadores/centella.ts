import type { LutadorDef } from '../tipos';

/*
 * CENTELLA, "A Faísca da Arena" (E3 S3). No elenco desde a E5 (2º da fila). Os testes de mecânica da E3 montam esta definição sobre o
 * atlas do WEI LONG (`tests/unit/_kit-e3.ts`) para os números não dependerem da arte.
 *
 * Números de PARTIDA (docs/mecanicas-e3.md §2.2; proposta §2.3). Dano, tempos e velocidades saem do harness da E6.
 * `stage` 'mx': Arena de Lucha Libre. Sem salto na parede (ED-M2): a mecânica é o RESORTE.
 */
export const CENTELLA: LutadorDef = {
  id: 'centella',
  country: 'MÉXICO',
  stage: 'mx',
  stageName: 'Arena de Lucha Libre, México',
  name: 'CENTELLA',
  title: 'A Faísca da Arena',
  pitch: 1.18,
  desc: 'Luchadora técnica. A arena é a arma dela: quanto mais longe a corda, mais forte a volta.',
  fire: ['#22e3b0', '#eafff8', '#0b9a7a'],
  accent: '#19d9a8',
  // V2-6 (motor v2 ligado, docs/balanco-motor-v2.md): pow 0,94 -> 0,95 e hp 96 -> 99.
  pow: 0.95,
  spd: 1.12,
  // R-12: hp 99 -> 93 (62% -> 52% com o ritmo completo). O chefão não usa este hp (a vida dele é chefe.hpPorBarra).
  hp: 93,
  jump: 1.18,
  scale: 0.95,
  stride: 12,
  bars: [3, 5, 2, 2],
  // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
  combosProprios: [
    { id: 'centella-plancha-na-corda', nome: 'DO ALTO DAS CORDAS', sequencia: ['lk', 'hk', 'sFire'], semQueda: [1], efeito: 'segura em pé e fecha na PLANCHA' },
    { id: 'centella-chave-aerea', nome: '¡ARRIBA!', sequencia: ['clp', 'clk', 'hp'], final: 'lanca' },
  ],
  mods: {},
  especiais: {
    // ESP: salto alto e queda de corpo inteiro. Golpe ALTO (`over`): só se defende em pé; agachado, o rival leva.
    sFire: {
      name: 'PLANCHA', info: 'Salto alto e queda de corpo inteiro. Golpe ALTO: só se defende em pé.',
      pose: 'jumpKick', pre: 'crouch', type: 'leap', kind: 'kick', snd: 'kick',
      S: 8, A: 80, R: 0, cost: 25, rank: 9,
      vy: -17, vx: 9, lag: 24, dmg: 14, kb: 8, hs: 0, bs: 14, kd: 1, lvl: 'over', air: 1, tall: 1, bh: 120, rm: 1, heavy: 1,
    },
    // ↓+ESP: sobe e agarra SÓ rival no ar (`agarrao.alvo: 'ar'`, janela de 18 ticks). No chão erra e fica exposta
    // S + A + R ticks. Sem `air`: o golpe dura S + A + R mesmo que ela pouse antes (é a punição de errar).
    sDown: {
      name: 'HURACANRANA', info: 'Anti-aéreo: sobe e agarra com as pernas quem está no ar. No chão, erra e fica exposta.',
      pose: 'jumpKick', pre: 'crouch', type: 'rise', kind: 'kick', snd: 'kick',
      S: 6, A: 18, R: 24, cost: 25, rank: 9,
      vy: -14, vx: 2, throw: 1, lvl: 'throw', dmg: 18, kb: 6, hs: 0, bs: 0, bh: 90, rm: 1,
      agarrao: { alvo: 'ar', alcance: 130, dmg: 18, janela: 18 },
      ia: { papel: 'antiaereo', alcance: [30, 190] },
    },
    // →+ESP: corre de COSTAS até a corda de trás, quica e volta numa voadora. A ida mede o `momento` (px); a volta voa a
    // `vxBase + momento × vxPorPx` e o dano soma `momento × dmgPorPx`. A ida não acerta ninguém; a CPU só usa com espaço
    // atrás dela. Ida = pose a[0] espelhada, volta = pose a[1] (arte própria na E5 via `anim.sFwd`).
    sFwd: {
      name: 'RESORTE', info: 'Corre até a corda de trás, quica e volta numa voadora: quanto mais longe a corda, mais rápida e mais forte.',
      pose: 'jumpKick', pre: 'crouch', type: 'rebote', kind: 'kick', snd: 'kick',
      S: 8, A: 0, R: 0, cost: 30, rank: 9,
      lag: 22, dmg: 8, kb: 9, hs: 22, bs: 14, kd: 1, lvl: 'mid', bh: 90, rm: 1.1, heavy: 1,
      rebote: { vel: 7.5, maxTicks: 70, vy: -9.5, vxBase: 8, vxPorPx: 0.018, dmgPorPx: 0.02, maxDist: 440 },
      ia: { papel: 'aproximar', alcance: [180, 700], espacoAtras: 200 },
    },
  },
  // Guardiã (spec chefões §4.2): ver AMINU. A cena da fase 2 é a pose de braços para o público (`win`).
  chefe: {
    barras: 2,
    hpPorBarra: 50,
    cena: { duracao: 60, poses: ['win'] },
    bonusVitoria: 3000,
    danoRecebido: 0.92, // R-12: era 0.86 (ritmo completo + cadeia por força)
    danoRecebidoDificil: 0.82, // era 0.74
  },
};
