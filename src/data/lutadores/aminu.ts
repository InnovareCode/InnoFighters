import type { IdLutador } from '../../core/contratos';
import type { LutadorDef } from '../tipos';

/*
 * AMINU, "A Lança de Kano" (E3 S2). DEFINIÇÃO DE DADOS, FORA do elenco: não está em `LUTADORES` nem em `ROSTER`, e o id
 * 'aminu' ainda não existe em `IDS_LUTADORES` (entra na E5, com a arte). Por isso o id é um cast: é a definição
 * testável/fixture, montada nos testes sobre o atlas de um lutador atual.
 *
 * Números de PARTIDA (docs/mecanicas-e3.md §2.1; proposta §2.3). Dano, tempos e níveis saem do harness da E6.
 * `stage` é provisório (os "Poços de Índigo de Kano" são um cenário novo da E5).
 */
export const AMINU: LutadorDef = {
  id: 'aminu' as IdLutador,
  country: 'NIGÉRIA',
  stage: 'br',
  stageName: 'Poços de Índigo de Kano, Nigéria',
  name: 'AMINU',
  title: 'A Lança de Kano',
  pitch: 1.0,
  desc: 'Dambe hauçá. Quanto mais paciência, mais pesado o soco.',
  fire: ['#6f7dff', '#eef0ff', '#2b2fa6'],
  accent: '#d9822b',
  pow: 1.06,
  spd: 0.98,
  hp: 102,
  jump: 0.92,
  scale: 1.06,
  stride: 12,
  bars: [4, 3, 3, 4],
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
  // Pose de preparação/golpe da MASHI: a arte própria vem na E5; aqui as que qualquer atlas resolve.
  anim: { sFire: { s: ['hp0'], a: ['hp1'], r: ['hp1', 'hp0'] } },
};
