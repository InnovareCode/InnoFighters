import { describe, expect, it } from 'vitest';
import type { IdLutador, InputFrame, RitmoMotor } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { cpuInput, CPU_SUPER } from '../../src/fight/cpu';
import { Game, REGEN_DE_BARRA_RITMO, type FonteEntradas } from '../../src/fight/game';
import { cena, doTipo, PROD, type Cena } from './_filme';

/*
 * R-10 (CPU do super, spec G10: 1 a 4 supers por luta) + as correções do R-7b que a CPU expôs. Luta de verdade, números de PRODUÇÃO.
 * A medida de balanço (20 sementes x 90 pares x 2 níveis, 3 bases) está no handoff; aqui só a prova de comportamento e as guardas.
 */

const PARADO: InputFrame = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, sp: false };
const FONTE: FonteEntradas = { p1: () => PARADO, p2: () => PARADO };

/** Joga uma luta CPU x CPU inteira e devolve quantos supers saíram (os dois lados) e se o jogo terminou. */
function lutarCpu(a: IdLutador, b: IdLutador, nivel: number, semente: number, ritmo: RitmoMotor | undefined, chefe = false): { supers: number; fim: boolean; jogo: Game } {
  const g = new Game({ lutadores: PROD, rng: criarRng(semente) });
  g.setup(
    {
      mode: 'cpu',
      c1: a,
      c2: b,
      cpu: nivel,
      p1cpu: nivel,
      esquiva: true,
      ...(chefe ? { chefe: true } : {}),
      motorV2: { entradaNoHitstop: true, filmes: true, combos: true },
      ...(ritmo ? { ritmo } : {}),
    },
    { rounds: 2, time: 99, shake: false },
  );
  let supers = 0;
  for (let i = 0; i < 40_000 && !g.matchDone; i++) {
    g.update(FONTE);
    supers += doTipo(g.events, 'special').filter((e) => e.super === true).length;
  }
  return { supers, fim: g.matchDone, jogo: g };
}

const PARES: readonly [IdLutador, IdLutador][] = [
  ['hayato', 'wei-long'],
  ['caio', 'nila'],
  ['min-ji', 'centella'],
  ['camille', 'baatar'],
  ['zenon', 'aminu'],
  ['wei-long', 'caio'],
];

describe('R-10: a CPU junta a barra e usa o super (ritmo.super + ritmo.cpu)', () => {
  it('NORMAL: média de supers por luta dentro do alvo do G10 (1 a 4), e a maioria das lutas tem pelo menos 1', () => {
    const n = PARES.map(([a, b], i) => lutarCpu(a, b, 1, 100 + i, { super: true, cpu: true }).supers);
    const media = n.reduce((s, x) => s + x, 0) / n.length;
    expect(media).toBeGreaterThanOrEqual(1);
    expect(media).toBeLessThanOrEqual(4);
    expect(n.filter((x) => x >= 1).length).toBeGreaterThanOrEqual(Math.ceil(n.length / 2));
  });

  it('só `ritmo.super` (sem `cpu`): a CPU não junta barra, o super quase nunca sai (a falha que a Íris mediu: 0 em 6)', () => {
    const n = PARES.map(([a, b], i) => lutarCpu(a, b, 1, 100 + i, { super: true }).supers);
    expect(n.reduce((s, x) => s + x, 0) / n.length).toBeLessThan(0.5);
  });

  it('FÁCIL e DIFÍCIL também terminam a luta sem estourar (todas as combinações de nível)', () => {
    for (const nivel of [0, 2]) {
      const r = lutarCpu('hayato', 'wei-long', nivel, 7, { super: true, cpu: true });
      expect(r.fim).toBe(true);
    }
  });

  it('chefão fica de fora: nenhuma luta contra o chefe junta barra para o super (rampa do R1 intacta até o R-12)', () => {
    const n = (['hayato', 'caio', 'wei-long'] as const).map((a, i) => lutarCpu(a, 'aminu', 1, 300 + i, { super: true, cpu: true }, true).supers);
    expect(n.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(1);
  });

  it('é determinístico: mesma semente, mesma luta (nenhum `rnd()` fora da ordem)', () => {
    const a = lutarCpu('hayato', 'wei-long', 1, 55, { super: true, cpu: true });
    const b = lutarCpu('hayato', 'wei-long', 1, 55, { super: true, cpu: true });
    expect(a.supers).toBe(b.supers);
    expect(a.jogo.tick).toBe(b.jogo.tick);
    expect(a.jogo.p1.hp).toBeCloseTo(b.jogo.p1.hp, 9);
  });

  it('níveis: reserva e confirmação crescem de FÁCIL a DIFÍCIL', () => {
    expect(CPU_SUPER[0].reserva).toBeLessThan(CPU_SUPER[1].reserva);
    expect(CPU_SUPER[1].reserva).toBeLessThanOrEqual(CPU_SUPER[2].reserva);
    expect(CPU_SUPER[0].confirma).toBeLessThan(CPU_SUPER[1].confirma);
    expect(CPU_SUPER[1].confirma).toBeLessThan(CPU_SUPER[2].confirma);
  });
});

describe('R-10: a reserva em si (cpuInput direto)', () => {
  function umaCpu(): Cena {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true, cpu: true } });
    c.g.p1.cpu = 1;
    c.g.p1.x = 400;
    c.g.p2.x = 480; // 80 px: no alcance de qualquer golpe
    return c;
  }
  /** Quantos ticks, em `n`, a CPU apertou ESP (especial comum) com a barra em `en`. */
  function especiaisEm(reservando: boolean, en: number, n: number): number {
    const c = umaCpu();
    const rng = criarRng(9);
    let sp = 0;
    for (let i = 0; i < n; i++) {
      c.g.p1.ai = { ...c.g.p1.ai, plan: null, t: 0, hold: 0, reacao: null, reservaSuper: reservando, seen: -1 };
      c.g.p1.en = en;
      const inp = cpuInput(c.g.p1, c.g.p2, c.g, rng);
      if (inp.sp) sp++;
    }
    return sp;
  }

  it('reservando e barra incompleta: nunca aperta ESP (nenhum especial comum); sem reservar, aperta', () => {
    expect(especiaisEm(true, 70, 3000)).toBe(0);
    expect(especiaisEm(false, 70, 3000)).toBeGreaterThan(0);
  });

  it('barra cheia e reservando: o único especial permitido é o do super (nunca os outros 2)', () => {
    const c = umaCpu();
    const rng = criarRng(4);
    const golpes = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      c.g.p1.ai = { ...c.g.p1.ai, plan: null, t: 0, hold: 0, reacao: null, reservaSuper: true, seen: -1 };
      c.g.p1.en = 100;
      c.g.p1.state = 'idle';
      const inp = cpuInput(c.g.p1, c.g.p2, c.g, rng);
      if (inp.sp) golpes.add(inp.down ? 'sDown' : inp.right || inp.left ? 'sFwd' : 'sFire');
    }
    // o super do HAYATO é sDown (ESP + baixo); sFire/sFwd comuns não saem com a barra guardada
    expect([...golpes].filter((g) => g !== 'sDown')).toEqual([]);
  });

  it('flag `cpu` desligada: a reserva nunca liga (o estado fica null)', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    c.g.p1.cpu = 1;
    c.g.p1.en = 80;
    const rng = criarRng(1);
    for (let i = 0; i < 200; i++) cpuInput(c.g.p1, c.g.p2, c.g, rng);
    expect(c.g.p1.ai.reservaSuper).toBeNull();
  });
});

describe('R-10 (D-R4): regen da barra', () => {
  const regen = (ritmo: RitmoMotor | undefined, chefe = false): number => {
    const g = new Game({ lutadores: PROD, rng: criarRng(1) });
    g.setup({ mode: 'cpu', c1: 'hayato', c2: 'aminu', cpu: 1, ...(chefe ? { chefe: true } : {}), ...(ritmo ? { ritmo } : {}) }, { rounds: 2, time: 99, shake: false });
    return g.regenDeBarra;
  };
  it('0,04 de sempre; só `super` + `cpu` juntos, fora do chefão, sobem', () => {
    expect(regen(undefined)).toBe(0.04);
    expect(regen({ super: true })).toBe(0.04);
    expect(regen({ cpu: true })).toBe(0.04);
    expect(regen({ super: true, cpu: true })).toBe(REGEN_DE_BARRA_RITMO);
    expect(regen({ super: true, cpu: true }, true)).toBe(0.04);
    expect(REGEN_DE_BARRA_RITMO).toBeGreaterThan(0.04);
  });
});

describe('R-7b (corrigido pela CPU): o rival fica PRESO desde o 1º contato do super', () => {
  const invariante = (c: Cena): void => {
    for (const f of c.g.fighters) {
      if (f.state === 'move') expect(f.move).not.toBeNull(); // `move:null` em `state:'move'` estoura `activeMove` no tick seguinte
    }
  };

  it('golpes trocados no mesmo tick (o rival é o próximo `a` do laço): nenhum estado inválido, para vários atrasos do golpe dele', () => {
    for (let atraso = 0; atraso <= 10; atraso++) {
      const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
      c.g.p2.hp = 1000;
      c.g.p1.x = 440;
      c.g.p2.x = 520;
      c.g.p1.facing = 1;
      c.g.p2.facing = -1;
      c.mao.p1 = { hp: true, hk: true };
      c.tick();
      c.mao.p1 = {};
      for (let i = 0; i < 70; i++) {
        if (i === atraso) c.g.p2.startMove('lp', c.g);
        c.tick();
        invariante(c);
      }
    }
  });

  it('BAATAR (agarrão-super): entre o 1º acerto e o 2º o rival está em `hit` (preso), não solto no estado que tinha', () => {
    const c = cena('baatar', 'hayato', { ritmo: { super: true } });
    c.g.p2.hp = 1000;
    c.g.p1.x = 430;
    c.g.p2.x = 530;
    c.g.p1.facing = 1;
    c.g.p2.facing = -1;
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
    let preso = 0;
    for (let i = 0; i < 90; i++) {
      c.tick();
      const throwEmCurso = c.eventos.some((e) => e.tipo === 'throw');
      const hitsDoSuper = c.eventos.filter((e) => e.tipo === 'hit' && e.super === true).length;
      if (throwEmCurso && hitsDoSuper < 4 && c.g.hitstop === 0) {
        expect(c.g.p2.state).toBe('hit');
        preso++;
      }
    }
    expect(preso).toBeGreaterThan(5);
  });
});
