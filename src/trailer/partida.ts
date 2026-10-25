import type { IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';
import type { LutadorMontado } from '../data/montar';
import { AJUSTES_DO_TRAILER, SEMENTE_DO_MOTOR, type PlanoComMotor, type Tomada } from '../data/trailer/tipos';
import { Game } from '../fight/game';
import { cfgMotorV2, cfgRitmo, REGRAS_PADRAO } from '../meta/regras';
import { FonteDaPartitura } from './entradas';

/*
 * Como o trailer monta o `Game` de um plano de luta: UM lugar só, usado pelo diretor (em jogo), pela ferramenta de conferência e pelos testes. Os DOIS lutadores são HUMANOS (sem CPU, sem RNG):
 * o que eles fazem vem da partitura (`Tomada.inputs`) pela `FonteDaPartitura`. Nada aqui lê estado da sessão.
 */

/**
 * A config de motor do JOGO (as mesmas flags que o jogador tem por padrão: motor v2, fluidez e ritmo, de `REGRAS_PADRAO`): o trailer mostra o jogo como ele joga, e o super (`ritmo.super`) só existe com ela.
 * As tomadas são afinadas SOBRE esta config: mudar uma flag do jogo muda os golpes e exige reafinar a partitura (o teste de impressão diz qual plano). A chave `?motorv2=0` NÃO chega ao trailer de propósito.
 */
const CFG_DO_JOGO = { ...cfgMotorV2(REGRAS_PADRAO), ...cfgRitmo(REGRAS_PADRAO) };

export interface PartidaDoTrailer {
  readonly game: Game;
  /** A fonte da partitura, para quem precisa saber quantos updates já andaram. */
  readonly fonte: FonteDaPartitura;
  /** Anda o motor UM update com as entradas da partitura. Único jeito de andar o `Game` do trailer. */
  atualizar(): void;
}

/** O `Game` do plano, já em `setup` (fase `intro`), com a energia e a vida iniciais da tomada. */
export function criarPartida(
  plano: PlanoComMotor,
  tomada: Pick<Tomada, 'inputs' | 'energia' | 'vida'>,
  lutadores: Readonly<Record<IdLutador, LutadorMontado>>,
  criarRng: (semente: number) => Rng,
): PartidaDoTrailer {
  const game = new Game({ lutadores, rng: criarRng(SEMENTE_DO_MOTOR) });
  game.setup(
    // `versus` com `cpu`/`p1cpu` ausentes: os dois são humanos e o `Game` pede as entradas à fonte. ESQUIVA ligada como no jogo; o P9 é luta de chefe (round único, a ficha do ZENON como no ARCADE).
    { mode: 'versus', c1: plano.c1, c2: plano.c2, stage: plano.stage, esquiva: true, ...CFG_DO_JOGO, ...(plano.tipo === 'arconte' ? { chefe: true } : {}) },
    { ...AJUSTES_DO_TRAILER },
  );
  game.fighters.forEach((f, i) => {
    const en = tomada.energia?.[i];
    if (en !== undefined) f.en = en;
    const vida = tomada.vida?.[i];
    if (vida !== undefined) {
      f.hp = f.maxHp * vida;
      f.hpShown = f.hp;
    }
  });
  const fonte = new FonteDaPartitura(game, tomada.inputs);
  return { game, fonte, atualizar: () => fonte.atualizar() };
}
