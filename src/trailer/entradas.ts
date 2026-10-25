import type { InputFrame } from '../core/contratos';
import { BIT, PRIMEIRO_UPDATE_DE_LUTA } from '../data/trailer/partitura';
import type { InputsDaTomada } from '../data/trailer/tipos';
import type { FonteEntradas, Game } from '../fight/game';

/*
 * A FonteEntradas do trailer: lê a partitura compilada (`Tomada.inputs`) e a entrega ao `Game` como `InputFrame`. FRENTE e TRÁS da partitura viram esquerda/direita pelo `facing` que o
 * lutador tem NESTE tick (o estado é o do próprio `Game`, então a tradução é determinística), porque dois planos trocam o lado dos lutadores no meio.
 *
 * O número do update vem de uma contagem PRÓPRIA (`atualizar` conta antes de rodar o `Game.update`): a fonte é consultada durante o hitstop também (V2-1) e não é consultada na intro,
 * então contar as consultas não dá o update. Quem anda o motor do trailer SEMPRE passa por `atualizar` (diretor, pré-rolagem, ferramenta e testes).
 */

/** Quadro de entrada de uma máscara da partitura, para um lutador que olha para `facing` (+1 = direita). */
export function inputFrameDeMascara(mascara: number, facing: number): InputFrame {
  const frente = (mascara & BIT.F) !== 0;
  const tras = (mascara & BIT.T) !== 0;
  const f: InputFrame = {
    left: facing > 0 ? tras : frente,
    right: facing > 0 ? frente : tras,
    up: (mascara & BIT.U) !== 0,
    down: (mascara & BIT.D) !== 0,
    lp: (mascara & BIT.lp) !== 0,
    hp: (mascara & BIT.hp) !== 0,
    lk: (mascara & BIT.lk) !== 0,
    hk: (mascara & BIT.hk) !== 0,
    sp: (mascara & BIT.sp) !== 0,
  };
  if ((mascara & BIT.spSeg) !== 0) f.spSeg = true;
  if ((mascara & BIT.esq) !== 0) f.esq = true;
  return f;
}

export class FonteDaPartitura implements FonteEntradas {
  /** Updates já feitos (e, durante um `update`, o número dele). */
  private n = 0;

  constructor(
    private readonly game: Game,
    private readonly inputs: InputsDaTomada,
  ) {}

  /** Chamadas a `update` até agora. */
  get updates(): number {
    return this.n;
  }

  /** UM update do motor, com as entradas da partitura para ele. */
  atualizar(): void {
    this.n++;
    this.game.update(this);
  }

  p1(): InputFrame {
    return this.quadro(0, this.inputs.p1);
  }
  p2(): InputFrame {
    return this.quadro(1, this.inputs.p2);
  }

  private quadro(i: 0 | 1, lado: readonly number[]): InputFrame {
    const mascara = lado[this.n - PRIMEIRO_UPDATE_DE_LUTA] ?? 0;
    return inputFrameDeMascara(mascara, this.game.fighters[i].facing);
  }
}
