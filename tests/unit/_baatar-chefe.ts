import type { IdLutador } from '../../src/core/contratos';
import { manifestoParaPoses } from '../../src/data/atlas';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { Golpe, LutadorDef } from '../../src/data/tipos';
import { BAATAR, MERGULHO_DA_AGUIA } from '../../src/data/lutadores';
import { lerManifesto } from './_lutadores';

/*
 * O BAATAR ANTIGO (chefão da E3/E5), guardado como FIXTURA de teste. O BAATAR de produção virou lutador normal (sem `chefe`, sem
 * fichas `chefe`/`chefe2`, →+ESP = MERGULHO); a mecânica de chefe do motor (barras, troca, Dança, ficha da fase 2) e a do ABRAÇO
 * (rush + agarrão em janela + armadura) continuam no motor e continuam testadas, só que sobre este def de teste. Quando o Zenon
 * entrar, os testes de chefe podem migrar para o `LutadorDef` dele e este arquivo some.
 */

/** O →+ESP antigo do BAATAR (fase 1): corrida de braços abertos que vira agarrão ao tocar. Fora do jogo; só a mecânica `rush` + `agarrao.janela`. */
export const ABRACO_DA_ESTEPE: Golpe = {
  name: 'ABRAÇO DA ESTEPE', info: 'Corre de braços abertos e agarra quem tocar. Ignora golpes leves, perde para golpe forte.',
  pose: 'punch', pre: 'crouch', type: 'rush', kind: 'punch', snd: 'kick',
  S: 12, A: 16, R: 30, cost: 35, rank: 9,
  vx: 9, throw: 1, lvl: 'throw', dmg: 20, kb: 8, hs: 0, bs: 0, bh: 100, rm: 0.9, armor: 1,
  agarrao: { alcance: 96, dmg: 20, janela: 16 },
  ia: { papel: 'aproximar', alcance: [110, 260] },
};

const { poseDaFicha: _poseDaFicha, ...BAATAR_SEM_POSE_DA_FICHA } = BAATAR;
void _poseDaFicha;

/** O BAATAR de produção, só que com o ABRAÇO no →+ESP (sem fichas e sem chefe). */
export const BAATAR_COM_ABRACO: LutadorDef = {
  ...BAATAR_SEM_POSE_DA_FICHA,
  especiais: { ...BAATAR.especiais, sFwd: ABRACO_DA_ESTEPE },
};

/** O BAATAR chefão da E6b, como era: ABRAÇO na fase 1, MERGULHO na fase 2, 2 barras de 40, Dança de 90 ticks, bônus 5000. */
export const BAATAR_CHEFE: LutadorDef = {
  ...BAATAR_COM_ABRACO,
  fichas: {
    chefe: { pow: 1.0, spd: 0.82 },
    chefe2: {
      pow: 1.0,
      spd: 0.82,
      fire: ['#ff2a10', '#ffe08a', '#c4120a'],
      especiais: { ...BAATAR_COM_ABRACO.especiais, sFwd: MERGULHO_DA_AGUIA },
      poseDaFicha: { sc0: 'dive0', sc1: 'dive1' },
    },
  },
  chefe: {
    barras: 2,
    hpPorBarra: 40,
    fichaFase1: 'chefe',
    fichaFase2: 'chefe2',
    cena: { duracao: 90, poses: ['devekh0', 'devekh1', 'devekh2'] }, // a Dança da Águia (spec ZENON §2: `danca` virou `cena`)
    bonusVitoria: 5000,
  },
};

/** O BAATAR chefão montado sobre o atlas de produção dele (poses `devekh0..2`, `dive0/1`). */
export function montarBaatarChefe(def: LutadorDef = BAATAR_CHEFE): LutadorMontado {
  return montarLutador(def, manifestoParaPoses(lerManifesto('baatar')));
}

/** O BAATAR com o ABRAÇO no →+ESP (sem fichas), montado sobre o atlas de produção dele. */
export function montarBaatarComAbraco(): LutadorMontado {
  return montarLutador(BAATAR_COM_ABRACO, manifestoParaPoses(lerManifesto('baatar')));
}

/** O elenco dado com o BAATAR trocado pelo chefão de teste (para luta `chefe: true` contra o 'baatar'). */
export function comBaatarChefe(elenco: Record<IdLutador, LutadorMontado>): Record<IdLutador, LutadorMontado> {
  return { ...elenco, baatar: montarBaatarChefe() };
}
