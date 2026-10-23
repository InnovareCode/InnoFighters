import type { Golpe, LutadorDef } from '../tipos';

/*
 * NILA, "A Lua de Kerala" (E3 S5). No elenco desde a E5 (4ª da fila). Os testes de mecânica da E3 montam esta definição sobre o
 * atlas do WEI LONG (`tests/unit/_kit-e3.ts`).
 *
 * Duas fichas (docs/mecanicas-e3.md §2.4; ED-M1): a base é a GAJA (elefante, pesada) e `fichas.sarpa` é a SARPA
 * (serpente, rápida). O VADIVU (↓+ESP) troca de uma para a outra em `mt === S`, sem custo e sem mexer na vida; cada round
 * volta à GAJA. A ficha troca atributos, golpes fortes (`mods`) e os outros dois especiais.
 *
 * Números de PARTIDA (dano e tempos saem do harness da E6). `stage` 'in': Fort Kochi.
 * As poses `sarpa*` (folha 5, ED-M1, v2) JÁ estão no atlas gerado (docs/handoff-vega-nila-f5.md): a SARPA desenha idle, andar,
 * defesa, deslize e salto com a arte dela. `poseDaFicha` só vale com o quadro presente (sem ele, cai na GAJA, como antes).
 */

/** VADIVU: troca de postura. Os DOIS lados têm os mesmos tempos (S/A/R): o golpe segue de onde estava depois da troca. */
const vadivu = (para: string | null, info: string): Golpe => ({
  name: 'VADIVU', info,
  pose: 'crouch', type: 'troca', kind: 'punch', snd: 'punch',
  S: 6, A: 1, R: 8, cost: 0, rank: 9,
  troca: { ficha: para },
  // Longe a SARPA (rápida, rasteira), perto a GAJA (pesada). `limite` separa perto de longe.
  ia: { papel: 'troca', preferir: { distancia: 'sarpa', perto: null }, limite: 220 },
});

export const NILA: LutadorDef = {
  id: 'nila',
  country: 'ÍNDIA',
  stage: 'in',
  stageName: 'Fort Kochi, Kerala, Índia',
  name: 'NILA',
  title: 'A Lua de Kerala',
  pitch: 1.12,
  desc: 'Kalaripayattu. Duas lutadoras numa só: elefante pesado, serpente veloz.',
  fire: ['#ffb02e', '#fff6dc', '#d9720b'],
  accent: '#ffa21f',
  // GAJA (ficha base)
  // E6b: GAJA hp 98 -> 108 e pow 1,10 -> 1,18 (harness: 29,7% de vitória antes). A SARPA mantém o pow 0,9.
  pow: 1.18,
  spd: 0.92,
  hp: 108,
  jump: 1.06,
  scale: 0.98,
  stride: 12,
  bars: [3, 4, 3, 3],
  // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
  combosProprios: [
    { id: 'nila-gaja-elefante-pesado', nome: 'SEM ANESTESIA', sequencia: ['hp', 'clp', 'sFwd'], efeito: 'do soco forte ao PASSO DO ELEFANTE' },
  ],
  mods: {
    hp: { S: 8, dmg: 11, kb: 9 },
    hk: { S: 10, dmg: 15, kb: 12 },
  },
  especiais: {
    // ESP (GAJA): toque de dedos num ponto vital. Atordoamento LONGO (`hs` alto), sem derrubar. Era o estado MARMA da
    // proposta, cortado (ED-M1): aqui só o atordoamento.
    sFire: {
      name: 'GOLPE MARMA', info: 'Toque de dedos num ponto vital: o rival fica atordoado por muito tempo, sem cair.',
      pose: 'punch', type: 'melee', kind: 'punch', snd: 'punch',
      S: 8, A: 4, R: 20, cost: 20, rank: 9,
      dmg: 6, kb: 4, hs: 46, bs: 12, lvl: 'mid', bh: 60, rm: 1.1,
      ia: { papel: 'pressao', alcance: [0, 140] },
    },
    sDown: vadivu('sarpa', 'Troca de postura: elefante (GAJA) vira serpente (SARPA). Sem custo.'),
    // →+ESP (GAJA): avanço lento com as duas palmas, empurrão forte (pressão de canto).
    sFwd: {
      name: 'PASSO DO ELEFANTE', info: 'Avanço pesado com as duas palmas que empurra muito.',
      pose: 'punch', pre: 'crouch', type: 'rush', kind: 'punch', snd: 'punch',
      S: 10, A: 10, R: 24, cost: 25, rank: 9,
      vx: 6, dmg: 12, kb: 16, hs: 22, bs: 14, lvl: 'mid', bh: 90, rm: 1, heavy: 1,
    },
  },
  fichas: {
    sarpa: {
      pow: 0.9,
      spd: 1.15,
      // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
      combosProprios: [
        { id: 'nila-sarpa-bote-veloz', nome: 'DIAGNÓSTICO', sequencia: ['lk', 'clp', 'clk', 'sFire'], efeito: 'três toques e o BOTE' },
      ],
      // Hurtbox em pé a 79% (E6a): os quadros `sarpaIdle*`/`sarpaWalk*`/`sarpaBlock` medem 76-81% dos da GAJA (tests/unit/e6a-sarpa.test.ts mede de novo contra o atlas).
      alturaEmPe: 0.79,
      mods: {
        hp: { S: 5, dmg: 7, kb: 6 },
        hk: { S: 8, dmg: 10, kb: 8 },
      },
      especiais: {
        // ESP (SARPA): deslize rasteiro com o corpo colado ao chão. `rente`: a hurtbox desce a ~80 px, então o projétil
        // comum (caixa a ~120 px do chão ou mais) passa por cima. Golpe BAIXO: só se defende agachado.
        sFire: {
          name: 'BOTE', info: 'Deslize rasteiro que passa por baixo de projéteis e acerta baixo.',
          pose: 'sweep', type: 'rush', kind: 'sweep', snd: 'kick',
          S: 7, A: 14, R: 18, cost: 20, rank: 9,
          vx: 9.5, dmg: 8, kb: 5, hs: 0, bs: 12, kd: 1, lvl: 'low', crouch: 1, rente: 1, bh: 44, rm: 1.2,
          ia: { papel: 'pressao', alcance: [150, 360] },
        },
        sDown: vadivu(null, 'Troca de postura: serpente (SARPA) volta a elefante (GAJA). Sem custo.'),
        // →+ESP (SARPA): salto alto em parafuso com chute descendente (golpe ALTO).
        // E6a: o ápice ficava acima do HUD por ~12 ticks (vy -19: a cabeça chegava a y ~6 na tela com o zoom máximo, cobrindo o relógio).
        // vy -14.5 deixa o topo do sprite em y ~99 (abaixo do relógio, que termina em ~98); vx 7,8 mantém o alcance horizontal (~264 px
        // de decolagem a pouso, como antes). tests/unit/e6a-sarpa.test.ts mede o voo tick a tick.
        sFwd: {
          name: 'SALTO DA SERPENTE', info: 'Salto altíssimo em parafuso com chute descendente. Golpe ALTO: só se defende em pé.',
          pose: 'jumpKick', pre: 'crouch', type: 'leap', kind: 'kick', snd: 'kick',
          S: 10, A: 80, R: 0, cost: 25, rank: 9,
          vy: -14.5, vx: 7.8, lag: 20, dmg: 14, kb: 8, hs: 0, bs: 16, kd: 1, lvl: 'over', air: 1, spin: 1, bh: 96, rm: 1, heavy: 1,
        },
      },
      // O BOTE desliza baixo: pose de preparação `crouchPunch` (sarpaSlide0, engatinhando) e ativa `sweep` (sarpaSlide1, chapado no
      // chão). A caixa de acerto sai da pose ativa: a `ponta` de sarpaSlide1 (o pé, `pe:0.75` em lutadores.json) mantém a caixa rente ao chão.
      anim: { sFire: { s: ['crouchPunch'], a: ['sweep'], r: ['sweep', 'crouchPunch'] } },
      // Poses da folha 5 (serpente). `poseDaFicha` vence a pose própria SE o atlas tiver o quadro. Nomes = células de
      // ferramentas/sprites/lutadores.json (`folhasExtras.f5`): idle 0-3 (ondulação), andar em 2 quadros alternados
      // (o motor pede walk0..7), defesa (em pé e agachada: a serpente já é baixa), deslize, e o salto (sc0 = agachamento
      // enrolado, sc1 = chute descendo). `sarpaLeap1` (parafuso subindo) está no atlas SEM uso: a animação `leap` só usa sc0/sc1 e a
      // caixa do golpe sai de `a[0]`; ligá-lo exigiria `anim.sFwd` próprio (ver handoff).
      poseDaFicha: {
        idle0: 'sarpaIdle0', idle1: 'sarpaIdle1', idle2: 'sarpaIdle2', idle3: 'sarpaIdle3',
        walk0: 'sarpaWalk0', walk1: 'sarpaWalk1', walk2: 'sarpaWalk0', walk3: 'sarpaWalk1',
        walk4: 'sarpaWalk0', walk5: 'sarpaWalk1', walk6: 'sarpaWalk0', walk7: 'sarpaWalk1',
        block: 'sarpaBlock', cblock: 'sarpaBlock',
        crouchPunch: 'sarpaSlide0', sweep: 'sarpaSlide1',
        sc0: 'sarpaLeap0', sc1: 'sarpaLeap2',
      },
    },
  },
  // Guardiã (spec chefões §4.2): ver AMINU. SEM `fichaFase1`/`fichaFase2`: o VADIVU troca de ficha sozinho e a retomada não pode
  // desfazer a postura em que ela estava. Por isso o reforço (`danoRecebido`) mora aqui, no bloco do chefe, e não numa ficha.
  // A cena da fase 2 é o `crouch` (não usa `sarpa*`, porque a postura continua a que estava).
  chefe: {
    barras: 2,
    hpPorBarra: 54,
    cena: { duracao: 60, poses: ['crouch'] },
    bonusVitoria: 3000,
    danoRecebido: 0.875,
  },
};
