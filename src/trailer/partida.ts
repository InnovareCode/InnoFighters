import type { IdLutador, InputFrame } from '../core/contratos';
import type { Rng } from '../core/rng';
import type { LutadorMontado } from '../data/montar';
import { AJUSTES_DO_TRAILER, type PlanoComMotor, type Tomada } from '../data/trailer/tipos';
import { Game, type FonteEntradas } from '../fight/game';
import { MOTOR_V2_PADRAO } from '../meta/regras';

/*
 * Como o trailer monta o `Game` de um plano de luta: UM lugar só, usado pelo diretor (em jogo) e pela escalação (offline). Se os dois montassem a partida cada um
 * por si, a tomada que a ferramenta escolhe deixaria de ser a que o jogo toca. Nada aqui lê estado da sessão: a semente vem da tomada (constante).
 */

const ZERO: InputFrame = Object.freeze({ left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, sp: false });
/** CPU x CPU: a fonte de entradas nunca é consultada (só o é para lutador sem CPU), mas o contrato do `Game.update` a exige. */
export const FONTE_VAZIA: FonteEntradas = { p1: () => ZERO, p2: () => ZERO };

/** O `Game` do plano, já em `setup` (fase `intro`), com a semente e os níveis de CPU da tomada. */
export function criarPartida(
  plano: PlanoComMotor,
  tomada: Pick<Tomada, 'semente' | 'cpu'>,
  lutadores: Readonly<Record<IdLutador, LutadorMontado>>,
  criarRng: (semente: number) => Rng,
): Game {
  const game = new Game({ lutadores, rng: criarRng(tomada.semente) });
  game.setup(
    // ESQUIVA ligada como no jogo; o P9 é luta de chefe (round único, a ficha e a IA do ZENON como no ARCADE).
    // `motorV2` com as MESMAS flags do jogo (V2-6, ordem do dono: sempre ligado; D-V6: o trailer mostra filme). As tomadas (semente, `tickMotor`, impressão) foram
    // reescaladas com elas (`npm run trailer:escalar`); trocar uma flag aqui invalida todas. A chave `?motorv2=0` NÃO chega ao trailer de propósito.
    { mode: 'cpu', c1: plano.c1, c2: plano.c2, cpu: tomada.cpu[1], p1cpu: tomada.cpu[0], stage: plano.stage, esquiva: true, motorV2: MOTOR_V2_PADRAO, ...(plano.tipo === 'arconte' ? { chefe: true } : {}) },
    { ...AJUSTES_DO_TRAILER },
  );
  return game;
}
