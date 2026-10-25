import type { LutadorDef } from '../tipos';

/*
 * AMINU, "A Lança de Kano" (E3 S2). No elenco desde a E5 (1º da fila de desbloqueio). Os testes de mecânica da E3 montam esta
 * definição sobre o atlas do WEI LONG (`tests/unit/_kit-e3.ts`) para os números não dependerem da arte.
 *
 * Números de PARTIDA (docs/mecanicas-e3.md §2.1; proposta §2.3). Dano, tempos e níveis saem do harness da E6.
 * `stage` 'ng': Tinturaria de Kano (src/data/cenarios.ts).
 */
export const AMINU: LutadorDef = {
  id: 'aminu',
  country: 'NIGÉRIA',
  stage: 'ng',
  stageName: 'Tinturaria de Kano, Nigéria',
  name: 'AMINU',
  title: 'A Lança de Kano',
  pitch: 1.0,
  desc: 'Dambe hauçá. Quanto mais paciência, mais pesado o soco.',
  fire: ['#6f7dff', '#eef0ff', '#2b2fa6'],
  accent: '#d9822b',
  // E6b: hp 102 -> 112 e pow 1,06 -> 1,18 (harness: 20,7% de vitória antes). V2-6: hp 112 -> 108 (motor v2 ligado, docs/balanco-motor-v2.md).
  pow: 1.18,
  spd: 0.98,
  hp: 103, // R-12b: 108 -> 103 (58% com o teto de supers); a vida do chefão não acompanha (54)
  jump: 0.92,
  scale: 1.06,
  stride: 12,
  bars: [4, 3, 3, 4],
  // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
  combosProprios: [
    { id: 'aminu-dambe-encadeado', nome: 'NO COLO DA PLATEIA', sequencia: ['lk', 'hp', 'hp'], final: 'parede' },
    { id: 'aminu-leao-no-canto', nome: 'RUGIDO DE KANO', sequencia: ['lp', 'hk', 'sFwd'], semQueda: [1], efeito: 'segura em pé e fecha no PASSO DO LEÃO' },
  ],
  reach: 1.08,
  mods: {},
  especiais: {
    // ESP: segure para carregar (3 níveis), solte para o direto. Nível 2 derruba; nível 3 quebra a guarda.
    sFire: {
      name: 'MASHI', info: 'Segure ESP para carregar o soco (3 níveis) e solte. Nível 2 derruba; nível 3 QUEBRA A GUARDA.',
      pose: 'punch', type: 'carga', kind: 'punch', snd: 'punch',
      S: 10, A: 5, R: 20, cost: 25, rank: 9,
      dmg: 8, kb: 9, hs: 22, bs: 12, lvl: 'mid', bh: 70, rm: 1.1, heavy: 1,
      carga: {
        max: 90,
        niveis: [0, 30, 70],
        andar: 0.35,
        porNivel: [{ dmg: 8 }, { dmg: 15, kd: 1 }, { dmg: 22, kd: 1, quebraGuarda: 40 }],
      },
      ia: { papel: 'pressao', alcance: [0, 220], segurar: [10, 85] },
    },
    // ↓+ESP: palma-escudo. Na janela ativa, projétil que vem de frente some (evento `clash`). Não para golpe corpo a corpo.
    sDown: {
      name: 'GARKUWA', info: 'Palma-escudo: anula o projétil que vem de frente. Não para golpe corpo a corpo.',
      pose: 'punch', type: 'melee', kind: 'punch', snd: 'punch',
      S: 5, A: 20, R: 18, cost: 22, rank: 9,
      dmg: 5, kb: 6, hs: 18, bs: 10, lvl: 'mid', bh: 90, rm: 0.9, absorveProj: 1,
      ia: { papel: 'defesa-projetil' },
    },
    // →+ESP: investida com o escudo, empurrão forte.
    sFwd: {
      name: 'PASSO DO LEÃO', info: 'Investida com o escudo que empurra o rival para o canto.',
      pose: 'punch', pre: 'crouch', type: 'rush', kind: 'punch', snd: 'punch',
      S: 7, A: 9, R: 20, cost: 30, rank: 9,
      vx: 9, dmg: 10, kb: 14, hs: 26, bs: 16, lvl: 'mid', bh: 90, rm: 1, heavy: 1,
    },
  },
  // Pose de preparação/golpe da MASHI: a arte própria entrou na E5 (atlas de produção); estas são as poses canônicas que todo atlas resolve.
  anim: { sFire: { s: ['hp0'], a: ['hp1'], r: ['hp1', 'hp0'] } },
  // Guardião (spec chefões §4.2): luta com a ficha do jogável (sem fichaFase1/2), 2 barras de metade da vida cada. A cena da fase 2 usa só
  // poses que o atlas já tem: carrega o MASHI (sa1) e solta (sa3). `danoRecebido` é a alavanca de dureza, calibrada em docs/balanco.
  chefe: {
    barras: 2,
    hpPorBarra: 54,
    cena: { duracao: 60, poses: ['sa1', 'sa3'] },
    bonusVitoria: 3000,
    danoRecebido: 0.82, // R-12: era 0.85 (ritmo completo + cadeia por força)
    danoRecebidoDificil: 0.9, // era 0.92
  },
};
