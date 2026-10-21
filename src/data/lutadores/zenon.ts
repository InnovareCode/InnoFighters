import type { Anim, EspeciaisLutador, FichaDef, Golpe, LutadorDef, ModsGolpes } from '../tipos';

/*
 * ZENON ARGYROS, "O Arconte" (Grécia, pancrácio): o chefão final e, depois de derrotado, jogável (docs/spec-chefao-zenon.md,
 * docs/proposta-novo-chefao.md §1). Sem primitiva nova de motor: reusa barras + cena + troca de ficha (E3), `rise` (a subida do
 * RAIJIN-KEN), `through` (o REVERS), `armadura.rankMax` e `armor:1` (o PESO DA MONTANHA) e um parâmetro novo, `drenaEnergia`.
 *
 * Números de PARTIDA (proposta §1.3), fechados no harness (`npm run balanco`, docs/handoff-vega-zenon.md): o def base é o lutador
 * JOGÁVEL (1 barra, sem armadura, TRIBUTO com dreno menor); a ficha `chefe` é a fase 1 do chefão e a `chefe2` a fase 2.
 */

/** ESP: o SELO DO ARCONTE. Projétil em anel a meia altura, lento e grande (estilo `anel`, só render). Sem dica de CPU: a lógica padrão de projétil. */
export const SELO_DO_ARCONTE: Golpe = {
  name: 'SELO DO ARCONTE', info: 'Anel de energia lento e enorme, a meia altura. Derruba.',
  pose: 'special', type: 'fire', kind: 'fire',
  S: 16, A: 3, R: 22, cost: 35, rank: 9,
  proj: { dmg: 14, sp: 7, kb: 10, hs: 26, kd: true, style: 'anel', sc: 1.5, life: 170 },
};

/** Fase 2: o mesmo selo, mais rápido e maior. */
export const SELO_MAIOR: Golpe = {
  ...SELO_DO_ARCONTE,
  name: 'SELO MAIOR', info: 'O selo da fase 2: mais rápido, maior e mais forte.',
  S: 14, cost: 40,
  proj: { dmg: 16, sp: 9.5, kb: 11, hs: 28, kd: true, style: 'anel', sc: 1.9, life: 140 },
};

/**
 * ↓+ESP: a COLUNA DE ÔNIX. Subida invulnerável (joelhada com a palma para cima), o anti-aéreo dele. Molde do RAIJIN-KEN; `vy` menor
 * que o dele porque a 1,36 (hoje 1,32) de escala o ápice de -14,5 levava a cabeça para fora da tela (spec §9.1: a subida fica abaixo de ~90 px).
 */
export const COLUNA_DE_ONIX: Golpe = {
  name: 'COLUNA DE ÔNIX', info: 'Joelhada subindo com a palma aberta: INVULNERÁVEL no início. Ótimo contra pulos.',
  pose: 'jumpPunch', pre: 'crouch', type: 'rise', kind: 'punch', snd: 'punch',
  S: 4, A: 80, R: 0, cost: 30, rank: 9,
  vy: -11, vx: 1.5, inv: 8, lag: 22, dmg: 15, kb: 6, hs: 0, bs: 14, kd: 1, lvl: 'mid', air: 1, bh: 180, tall: 1, rm: 0.9, heavy: 1,
  ia: { papel: 'antiaereo' },
};

/** →+ESP: o TRIBUTO. Deslize com a palma aberta; no acerto toma energia do rival (jogável: 12; defesa 6). O chefão usa 20/10. */
export const TRIBUTO: Golpe = {
  name: 'TRIBUTO', info: 'Deslize com a palma aberta. No acerto toma energia do rival; na defesa, uma parte.',
  pose: 'punch', pre: 'crouch', type: 'rush', kind: 'punch', snd: 'punch',
  S: 10, A: 12, R: 22, cost: 30, rank: 9,
  vx: 9, dmg: 10, kb: 6, hs: 26, bs: 12, lvl: 'mid', bh: 190, rm: 1, heavy: 1,
  drenaEnergia: { acerto: 12, defesa: 6 },
  ia: { papel: 'aproximar', alcance: [90, 220] },
};

/** O TRIBUTO do chefão: o dreno da proposta (20 no acerto, 10 na defesa). */
export const TRIBUTO_DO_CHEFE: Golpe = { ...TRIBUTO, drenaEnergia: { acerto: 20, defesa: 10 } };

/**
 * Fase 2, →+ESP: o DECRETO. Investida que CRUZA o rival (`through`, o molde do REVERS da CAMILLE) e acerta de costas de mão; também cobra o
 * tributo. A corrida anda `vx × A` = 275 px; a caixa só vale depois de cruzar, então a dica de CPU usa 120 a 230 px (acima disso cruza
 * no fim da janela e quase não sobra tick de acerto). Sem `armor`: a armadura da fase 2 é só dos golpes fortes dele (spec §4.1).
 */
export const DECRETO: Golpe = {
  name: 'DECRETO', info: 'Investida que cruza o rival e acerta de costas de mão: a defesa precisa inverter. Também cobra o tributo.',
  pose: 'punch', pre: 'crouch', type: 'rush', kind: 'punch', snd: 'punch',
  S: 8, A: 22, R: 22, cost: 30, rank: 9,
  vx: 12.5, through: 1, dmg: 14, kb: 8, hs: 24, bs: 14, lvl: 'mid', bh: 190, rm: 1, heavy: 1,
  drenaEnergia: { acerto: 20, defesa: 10 },
  ia: { papel: 'aproximar', alcance: [120, 230] },
};

const ESPECIAIS_BASE: EspeciaisLutador = { sFire: SELO_DO_ARCONTE, sDown: COLUNA_DE_ONIX, sFwd: TRIBUTO };
const ESPECIAIS_DO_CHEFE: EspeciaisLutador = { ...ESPECIAIS_BASE, sFwd: TRIBUTO_DO_CHEFE };

/**
 * Golpes comuns do jogável. O sprite de 1,32 (era 1,36) tem a mão na altura do ROSTO (a ponta do `hp1` fica a ~290 px do chão): com a caixa de altura
 * padrão (54 a 84 px, centrada na mão) o fundo dela ficava a 226-269 px, acima do topo da hurtbox de quem tem escala 1,0 (254 px), e os golpes
 * em pé quase nunca acertavam (harness: `hk` 2,9% de contato, 7% de vitória). `bh` maior (a caixa cresce para cima e para baixo da mão) leva o
 * fundo a ~170-180 px: pega o peito e a cabeça de quem é menor. tests/unit/zenon-arte.test.ts trava o fundo contra o atlas real.
 */
const MODS_BASE: ModsGolpes = {
  lp: { bh: 200 },
  lk: { bh: 190 },
  hp: { bh: 250 },
  hk: { bh: 250 },
  clp: { bh: 240 },
};

/**
 * Animações próprias. TRIBUTO: `sc2` (ereto "cobrando", fora do contrato de poses da spec §12) é a recuperação. Agarrão comum: `grab0`
 * (as duas mãos prendendo) na preparação e `grab1` (o arremesso em giro) no golpe e na recuperação.
 */
const ANIM_BASE: NonNullable<LutadorDef['anim']> = {
  sFwd: { s: ['sc0'], a: ['sc1'], r: ['sc2', 'idle0'] },
  throw: { s: ['grab0'], a: ['grab1'], r: ['grab1', 'grab0'] },
};

/** DECRETO: `sc0/sc1` viram `decreto0/1` pela `poseDaFicha`; a recuperação é o `decreto2`. */
const ANIM_FASE_2: NonNullable<LutadorDef['anim']> = {
  ...ANIM_BASE,
  sFwd: { s: ['sc0'], a: ['sc1'], r: ['decreto2', 'idle0'] } satisfies Anim,
};

const FICHA_FASE_1: FichaDef = {
  pow: 1.0,
  spd: 0.92,
  especiais: ESPECIAIS_DO_CHEFE,
};

const FICHA_FASE_2: FichaDef = {
  pow: 1.0,
  spd: 0.98,
  fire: ['#e0249a', '#0c0710', '#12040c'],
  // "Chega de cortesia": a armadura não recua para golpe fraco (rank <= 2). Só vale nos golpes com `armor:1` (spec §4.1, dívida consciente).
  armadura: { rankMax: 2 },
  // `mods` da ficha SUBSTITUI o do def (raso, por golpe): `...MODS_BASE.hp` mantem o `bh` (a fase 2 perdeu a caixa alta e `hp`/`hk` nao conectavam em nenhuma distancia).
  mods: { ...MODS_BASE, hp: { ...MODS_BASE.hp, armor: 1 }, hk: { ...MODS_BASE.hk, armor: 1 }, chp: { ...MODS_BASE.chp, armor: 1 } },
  especiais: { ...ESPECIAIS_DO_CHEFE, sFire: SELO_MAIOR, sFwd: DECRETO },
  poseDaFicha: { sc0: 'decreto0', sc1: 'decreto1' },
  anim: ANIM_FASE_2,
};

/** O lutador sem o `id` (o `id: 'zenon'` entra em `ZENON`, em `index.ts`; os testes de motor o montam sobre o atlas do WEI LONG). */
export const ZENON_DEF: Omit<LutadorDef, 'id'> = {
  country: 'GRÉCIA',
  stage: 'gr',
  stageName: 'Anfiteatro do Arconte, Grécia',
  name: 'ZENON',
  title: 'O Arconte',
  pitch: 0.76,
  desc: 'Dono do torneio e mestre do pancrácio. Cobra de cada rival o que ele tem de mais caro: a energia.',
  fire: ['#d6339a', '#0c0710', '#2a0418'],
  accent: '#d6339a',
  pow: 1.0,
  spd: 0.92,
  hp: 100,
  jump: 0.72,
  scale: 1.32,
  stride: 15,
  bars: [4, 3, 5, 2],
  reach: 1.12,
  // Hurtbox em pe: a caixa fixa (254 px) deixava ~93 px da cabeca e dos ombros de fora (spec §9.2). 0,92 x idle0 (336,6 px logicos = 1,32 x 255) / 254,4 = 1,22 (era 1,25 a 1,36).
  // tests/unit/zenon-arte.test.ts mede de novo contra o atlas real.
  alturaEmPe: 1.22,
  // O SELO nasce a meia altura (a ponta do `sa1` fica a ~280 px, acima de qualquer cabeca de escala 1,0): ver `alturaDoProjetil` em tipos.ts.
  alturaDoProjetil: 175,
  mods: MODS_BASE,
  especiais: ESPECIAIS_BASE,
  anim: ANIM_BASE,
  fichas: { chefe: FICHA_FASE_1, chefe2: FICHA_FASE_2 },
  chefe: {
    barras: 2,
    hpPorBarra: 50,
    fichaFase1: 'chefe',
    fichaFase2: 'chefe2',
    // S10, linha 2: estala os dedos, abre os braços, guarda de dois punhos.
    cena: { duracao: 90, poses: ['cena0', 'cena1', 'cena2'] },
    bonusVitoria: 5000,
    trilha: 'chefe',
  },
};
