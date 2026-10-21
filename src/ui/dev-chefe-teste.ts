import { AtlasLutador } from '../assets/carregador';
import type { Elenco } from '../assets/elenco';
import type { IdLutador } from '../core/contratos';
import { BAATAR, MERGULHO_DA_AGUIA } from '../data/lutadores';
import { montarLutador } from '../data/montar';
import type { Golpe, LutadorDef } from '../data/tipos';
import type { Regras } from '../meta';

/**
 * CHEFE DE TESTE (nunca em produção). `?chefe=teste` (só em desenvolvimento; o `main.ts` importa este arquivo por import
 * dinâmico atrás de `import.meta.env.DEV`, então ele NÃO entra no bundle de produção) põe um chefão na ordem do ARCADE para
 * os e2e exercitarem a mecânica de chefão da UI (HUD de barras, ×2/×1, FASE 2!, cena de Dança, aviso e VS de chefe,
 * desbloqueio de chefe, casa central da grade) enquanto o jogo de produção não tem chefão (`REGRAS_PADRAO.chefe === null`).
 *
 * O chefe de teste é o BAATAR ANTIGO (chefão da E3/E5): ABRAÇO DA ESTEPE na fase 1, MERGULHO na fase 2, 2 barras de 40, Dança
 * de 90 ticks, bônus 5000. Este arquivo é a FONTE ÚNICA desse def: a fixtura de testes unitários (`tests/unit/_baatar-chefe.ts`)
 * o reexporta. Quando o Zenon entrar, os e2e passam a apontar para ele (UM lugar: `tests/e2e/_chefe.ts`) e este arquivo some.
 *
 * Combina com `?expansao=1` (os 9 liberados) e com `?expansao=4`; sozinho usa as regras de produção.
 */

/** O lutador que faz de chefão (o mesmo id do roster, com o def de chefão no lugar do normal). */
export const ID_CHEFE_DE_TESTE: IdLutador = 'baatar';

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
    danca: { duracao: 90 },
    bonusVitoria: 5000,
  },
};

/** As regras dadas com o chefão de teste no fim do ARCADE (e fora da fila de desbloqueio, como o BAATAR chefão de antes). */
export function comChefeDeTeste(regras: Regras): Regras {
  return {
    ...regras,
    chefe: ID_CHEFE_DE_TESTE,
    fila: regras.fila.filter((id) => id !== ID_CHEFE_DE_TESTE),
  };
}

/** O elenco dado com o lutador do chefão de teste trocado pelo def de chefão (mesma arte, mesmo atlas). */
export function elencoComChefeDeTeste(elenco: Elenco): Elenco {
  const atual = elenco[ID_CHEFE_DE_TESTE];
  if (!(atual.arte instanceof AtlasLutador)) throw new Error('chefe de teste: a arte do elenco não é um AtlasLutador');
  return { ...elenco, [ID_CHEFE_DE_TESTE]: { ch: montarLutador(BAATAR_CHEFE, atual.arte.poses()), arte: atual.arte } };
}
