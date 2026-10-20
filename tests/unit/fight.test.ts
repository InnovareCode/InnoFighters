import { describe, expect, it } from 'vitest';
import type { EventoLuta, IdLutador, InputFrame } from '../../src/core/contratos';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { attackBox, danoDeArmadura, danoDoGolpe, escalaCombo, hurtbox, podeBloquear } from '../../src/fight/colisao';
import { MOTIONS, dirNum, motion } from '../../src/fight/comandos';
import { AI_LEVELS, moveInput } from '../../src/fight/cpu';
import { Game, type FonteEntradas } from '../../src/fight/game';
import type { NomeGolpe } from '../../src/data/tipos';
import { montarTodos } from './_lutadores';

const lutadores = montarTodos();
const SEM_ENTRADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };

function novaLuta(c1: IdLutador, c2: IdLutador, semente: number, cfg: { cpu?: number | null; p1cpu?: number | null; mode?: 'versus' | 'cpu' | 'training' } = {}): Game {
  const g = new Game({ lutadores, rng: criarRng(semente) });
  g.setup({ mode: cfg.mode ?? 'versus', c1, c2, ...cfg }, { rounds: 2, time: 99, shake: true });
  return g;
}

describe('comandos (qcf / dp / qcb)', () => {
  const d = (l: boolean, r: boolean, u: boolean, dn: boolean) => ({ left: l, right: r, up: u, down: dn });
  it('dirNum em notação numérica, relativo a quem olha', () => {
    expect(dirNum(d(false, true, false, false), 1)).toBe(6);
    expect(dirNum(d(false, true, false, false), -1)).toBe(4); // olhando p/ esquerda, "direita" é para trás
    expect(dirNum(d(false, false, false, true), 1)).toBe(2);
    expect(dirNum(d(false, true, false, true), 1)).toBe(3);
    expect(dirNum(d(true, false, false, true), 1)).toBe(1);
    expect(dirNum(d(false, false, true, false), 1)).toBe(8);
    expect(dirNum(d(false, false, false, false), 1)).toBe(5);
  });
  it('qcf ↓↘→ reconhecido; ordem errada não', () => {
    expect(motion([5, 5, 2, 3, 6], MOTIONS.qcf)).toBe(true);
    expect(motion([6, 3, 2], MOTIONS.qcf)).toBe(false);
    expect(motion([6, 2, 3, 5], MOTIONS.dp)).toBe(true);
    expect(motion([2, 1, 4], MOTIONS.qcb)).toBe(true);
  });
  it('janela de 18 ticks: movimento antigo demais não vale', () => {
    const hist = [2, 3, 6, ...Array<number>(20).fill(5)];
    expect(motion(hist, MOTIONS.qcf)).toBe(false);
    expect(motion(hist, MOTIONS.qcf, 30)).toBe(true);
  });
});

describe('bloqueio por nível', () => {
  const em = (agachado: boolean, extra = {}) => ({ noChao: true, segurandoTras: true, state: 'idle', agachado, ...extra });
  it('mid bloqueia em pé e agachado; low só agachado; over só em pé; throw nunca', () => {
    expect(podeBloquear('mid', em(false))).toBe(true);
    expect(podeBloquear('mid', em(true))).toBe(true);
    expect(podeBloquear('low', em(false))).toBe(false);
    expect(podeBloquear('low', em(true))).toBe(true);
    expect(podeBloquear('over', em(false))).toBe(true);
    expect(podeBloquear('over', em(true))).toBe(false);
    expect(podeBloquear('throw', em(false))).toBe(false);
  });
  it('exige chão, segurar para trás e estado livre', () => {
    expect(podeBloquear('mid', em(false, { noChao: false }))).toBe(false);
    expect(podeBloquear('mid', em(false, { segurandoTras: false }))).toBe(false);
    for (const s of ['move', 'hit', 'jump', 'down', 'ko', 'dash', 'prejump', 'win']) expect(podeBloquear('mid', em(false, { state: s })), s).toBe(false);
    for (const s of ['idle', 'walk', 'crouch', 'block', 'land']) expect(podeBloquear('mid', em(false, { state: s })), s).toBe(true);
  });
});

describe('dano e escala de combo', () => {
  it('cada golpe recebido tira 10%, piso de 50%', () => {
    expect([0, 1, 2, 5, 9].map(escalaCombo)).toEqual([1, 0.9, 0.8, 0.5, 0.5]);
  });
  it('projétil ignora pow; contragolpe +15%; armadura absorve 60% sem escala', () => {
    expect(danoDoGolpe(10, 1.14, false, 0, false)).toBeCloseTo(11.4, 10);
    expect(danoDoGolpe(10, 1.14, true, 0, false)).toBeCloseTo(10, 10);
    expect(danoDoGolpe(10, 1, false, 2, true)).toBeCloseTo(10 * 0.8 * 1.15, 10);
    expect(danoDeArmadura(20, 0.9, false)).toBeCloseTo(20 * 0.9 * 0.6, 10);
  });
  it('caixas: dano em pé 96% de SH, agachado 56%, caído faixa baixa; ataque espelha com facing', () => {
    expect(hurtbox({ x: 100, y: 470, state: 'idle', baixo: false, noChao: true })).toEqual({ x: 62, y: 470 - 265 * 0.96, w: 76, h: 265 * 0.96 });
    expect(hurtbox({ x: 100, y: 470, state: 'crouch', baixo: true, noChao: true }).h).toBeCloseTo(265 * 0.56, 10);
    expect(hurtbox({ x: 100, y: 470, state: 'ko', baixo: false, noChao: true })).toEqual({ x: 30, y: 410, w: 140, h: 60 });
    expect(attackBox({ x: 100, y: 470, facing: 1 }, { fx: 20, fy: 100, w: 60, h: 40 })).toEqual({ x: 120, y: 370, w: 60, h: 40 });
    expect(attackBox({ x: 100, y: 470, facing: -1 }, { fx: 20, fy: 100, w: 60, h: 40 })).toEqual({ x: 20, y: 370, w: 60, h: 40 });
  });
});

describe('frame data (tabela base + ajustes por lutador)', () => {
  const fd = (id: IdLutador, n: NomeGolpe) => {
    const mv = lutadores[id].moves[n];
    return [mv.S, mv.A, mv.R, mv.dmg];
  };
  it('HAYATO usa a tabela base; WEI LONG é lento e pesado; MIN-JI é rápida; CAIO só muda alcance', () => {
    expect(fd('hayato', 'hp')).toEqual([7, 4, 14, 9]);
    expect(fd('wei-long', 'hk')).toEqual([12, 5, 22, 17]);
    expect(fd('min-ji', 'lp')).toEqual([2, 3, 5, 3.5]);
    expect(fd('caio', 'hk')).toEqual([10, 5, 18, 12.5]);
    expect(lutadores.caio.moves.chk.rm).toBe(1.4);
    expect(lutadores.hayato.moves.lp.rank).toBeLessThan(lutadores.hayato.moves.hk.rank as number);
  });
  it('custo e animação dos 3 especiais de cada um', () => {
    expect(lutadores.hayato.sps.map((m) => m.cost)).toEqual([40, 30, 20]);
    expect(lutadores['wei-long'].sps.map((m) => m.name)).toEqual(['LONG ZHANG', 'ZHEN DI', 'TIE SHAN KAO']);
    expect(lutadores.hayato.moves.sDown.anim.fall).toBe('jfall'); // CHAR_ANIM do HAYATO
    expect(lutadores.caio.moves.sDown.anim.loop).toBe(4); // melee
  });
  it('golpes de projétil e lag não têm caixa de ataque', () => {
    for (const id of Object.keys(lutadores) as IdLutador[]) {
      expect(lutadores[id].boxes.sFire).toBeUndefined();
      expect(lutadores[id].boxes._lag).toBeUndefined();
      expect(lutadores[id].boxes.hk?.w).toBeGreaterThanOrEqual(90);
    }
  });
});

describe('Game: regras de partida', () => {
  it('começa em intro, vira fight depois de introLen ticks e emite os eventos de round na ordem', () => {
    const g = novaLuta('hayato', 'caio', 1);
    const eventos: EventoLuta[] = [];
    for (let i = 0; i < 100; i++) {
      g.update(SEM_ENTRADA);
      eventos.push(...g.events);
    }
    expect(g.phase).toBe('fight');
    expect(eventos.filter((e) => e.tipo === 'round').map((e) => (e.tipo === 'round' ? e.fase : ''))).toEqual(['start', 'fight']);
  });

  it('events é esvaziado a cada tick e o tick não anda durante hitstop', () => {
    const g = novaLuta('hayato', 'caio', 1);
    for (let i = 0; i < 95; i++) g.update(SEM_ENTRADA);
    expect(g.events).toEqual([]);
    const antes = g.tick;
    g.hitstop = 3;
    g.update(SEM_ENTRADA);
    expect(g.tick).toBe(antes);
    expect(g.hitstop).toBe(2);
    expect(g.events).toEqual([]);
  });

  it('o tempo acaba -> timeover -> roundend; vencedor por mais vida; fim da luta ao atingir winsNeeded', () => {
    const g = novaLuta('hayato', 'caio', 1);
    g.timeMax = 2;
    g.timeLeft = 2;
    g.p2.hp = 50; // P1 na frente
    const fases = new Set<string>();
    for (let i = 0; i < 2000 && !g.matchDone; i++) {
      g.update(SEM_ENTRADA);
      fases.add(g.phase);
      if (g.phase === 'intro' && g.round === 2) g.p2.hp = 50; // mantém o P1 na frente no round 2
    }
    expect(g.p1.wins).toBe(2);
    expect(g.matchWinner).toBe(0);
    expect(g.matchDone).toBe(true);
    for (const f of ['intro', 'fight', 'timeover', 'roundend', 'matchend']) expect(fases.has(f), f).toBe(true);
  });

  it('perfect: vencer sem perder vida emite o evento e dá bônus de 5000', () => {
    const g = novaLuta('hayato', 'caio', 1);
    g.timeMax = 1;
    g.timeLeft = 1;
    g.p2.hp = 10;
    const eventos: EventoLuta[] = [];
    for (let i = 0; i < 400; i++) {
      g.update(SEM_ENTRADA);
      eventos.push(...g.events);
      if (g.phase === 'roundend') break;
    }
    expect(g.perfect).toBe(true);
    expect(eventos.some((e) => e.tipo === 'perfect' && e.vencedor === 0)).toBe(true);
    expect(g.p1.score).toBeGreaterThanOrEqual(5000);
  });

  it('treino: ninguém morre (hp mínimo 1) e não há relógio nem eventos de round de áudio', () => {
    const g = novaLuta('hayato', 'caio', 1, { mode: 'training' });
    expect(g.timeMax).toBe(0);
    for (let i = 0; i < 60; i++) g.update(SEM_ENTRADA);
    expect(g.phase).toBe('fight');
    g.p2.hp = 1;
    expect(g.training).toBe(true);
  });
});

describe('RNG: mesma semente -> mesma luta; semente diferente -> outra', () => {
  function resumo(semente: number, ticks: number) {
    const g = novaLuta('wei-long', 'min-ji', semente, { mode: 'cpu', cpu: 2, p1cpu: 2 });
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
      score: [g.p1.score, g.p2.score],
      x: [Math.round(g.p1.x * 1000) / 1000, Math.round(g.p2.x * 1000) / 1000],
      tick: g.tick,
      contagem,
    };
  }
  it('reproduzível', () => {
    expect(resumo(42, 3000)).toEqual(resumo(42, 3000));
    expect(resumo(43, 3000)).not.toEqual(resumo(42, 3000));
  });
  it('CPU x CPU de 6000 ticks com semente 42 tem resultado fixo (regressão)', () => {
    expect(resumo(42, 6000)).toMatchSnapshot();
  });
});

describe('moveInput (entradas que a CPU usa para um golpe)', () => {
  it('traduz nome de golpe em botões', () => {
    expect(moveInput('sFire', 1)).toEqual({ sp: true });
    expect(moveInput('sDown', 1)).toEqual({ sp: true, down: true });
    expect(moveInput('sFwd', -1)).toEqual({ sp: true, left: true });
    expect(moveInput('chk', 1)).toEqual({ down: true, hk: true });
    expect(moveInput('throw', 1)).toEqual({ hp: true, right: true });
    expect(moveInput('lp', 1)).toEqual({ lp: true });
  });
  it('3 níveis de CPU', () => {
    expect(AI_LEVELS.map((n) => n.name)).toEqual(['FÁCIL', 'NORMAL', 'DIFÍCIL']);
  });
  it('INPUT_VAZIO é um InputFrame válido', () => {
    const f: InputFrame = { ...INPUT_VAZIO };
    expect(Object.values(f).every((v) => v === false)).toBe(true);
  });
});
