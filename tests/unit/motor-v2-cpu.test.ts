import { describe, expect, it } from 'vitest';
import type { IdLutador, MotorV2 } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { MOTOR_V2_PADRAO } from '../../src/meta';
import { MOTOR_V2_DESLIGADO } from './_motor-v2';
import { PROD } from './_filme';

/*
 * V2-6 (docs/spec-revisao-motor-luta-v2.md §10): o snapshot CPU x CPU do JOGO COMO ELE VAI AO AR, com o motor v2 inteiro ligado (`MOTOR_V2_PADRAO`: entrada no hitstop, filme do
 * especial e combos próprios) e a esquiva. É NOVO, em arquivo próprio: os snapshots antigos (fight.test.ts, esquiva-cpu.test.ts) seguem com as flags DESLIGADAS e nunca levam `-u`.
 * Usa os números de PRODUÇÃO (`montarTodos({ dadosDeProducao: true })`), os mesmos do jogo e do harness: recalibrar um lutador muda este snapshot de propósito, e quem
 * o regrava (uma vez, depois de conferir o `npm run balanco`) registra o motivo no commit.
 */
const SEM_ENTRADA: FonteEntradas = {
  p1: () => ({ left: false, right: false, up: false, down: false, lp: false, lk: false, hp: false, hk: false, sp: false }),
  p2: () => ({ left: false, right: false, up: false, down: false, lp: false, lk: false, hp: false, hk: false, sp: false }),
};

function resumo(c1: IdLutador, c2: IdLutador, semente: number, ticks: number, motorV2: MotorV2) {
  const g = new Game({ lutadores: PROD, rng: criarRng(semente) });
  g.setup({ mode: 'cpu', c1, c2, cpu: 2, p1cpu: 2, esquiva: true, motorV2 }, { rounds: 2, time: 99, shake: true });
  const contagem: Record<string, number> = {};
  for (let i = 0; i < ticks; i++) {
    g.update(SEM_ENTRADA);
    for (const e of g.events) contagem[e.tipo] = (contagem[e.tipo] ?? 0) + 1;
  }
  return {
    round: g.round,
    fase: g.phase,
    wins: [g.p1.wins, g.p2.wins],
    hp: [Math.round(g.p1.hp * 1000) / 1000, Math.round(g.p2.hp * 1000) / 1000],
    x: [Math.round(g.p1.x * 1000) / 1000, Math.round(g.p2.x * 1000) / 1000],
    tick: g.tick,
    combosProprios: [...g.combosPropriosFeitos],
    contagem,
  };
}

describe('CPU x CPU com o motor v2 ligado (snapshot do jogo de produção)', () => {
  it('reproduzível: a mesma semente dá a mesma luta; outra semente, outra', () => {
    expect(resumo('wei-long', 'min-ji', 42, 3000, MOTOR_V2_PADRAO)).toEqual(resumo('wei-long', 'min-ji', 42, 3000, MOTOR_V2_PADRAO));
    expect(resumo('wei-long', 'min-ji', 43, 3000, MOTOR_V2_PADRAO)).not.toEqual(resumo('wei-long', 'min-ji', 42, 3000, MOTOR_V2_PADRAO));
  });

  it('o v2 está de fato ativo: filmes e combos próprios acontecem, e a luta difere da de motor desligado', () => {
    const ligado = resumo('wei-long', 'min-ji', 42, 6000, MOTOR_V2_PADRAO);
    const desligado = resumo('wei-long', 'min-ji', 42, 6000, MOTOR_V2_DESLIGADO);
    expect(ligado.contagem['filme']).toBeGreaterThan(0);
    expect(desligado.contagem['filme']).toBeUndefined();
    expect(ligado).not.toEqual(desligado);
  });

  it('WEI LONG x MIN-JI, 6000 ticks, semente 42: resultado fixo (regressão)', () => {
    expect(resumo('wei-long', 'min-ji', 42, 6000, MOTOR_V2_PADRAO)).toMatchSnapshot();
  });

  it('CAMILLE x BAATAR, 6000 ticks, semente 7: resultado fixo (regressão; a PARADE, a armadura e o COUP D\'ARRÊT com filme)', () => {
    expect(resumo('camille', 'baatar', 7, 6000, MOTOR_V2_PADRAO)).toMatchSnapshot();
  });

  it('NILA x AMINU, 6000 ticks, semente 11: resultado fixo (regressão; GAJA/SARPA e a carga da MASHI com filme)', () => {
    expect(resumo('nila', 'aminu', 11, 6000, MOTOR_V2_PADRAO)).toMatchSnapshot();
  });
});
