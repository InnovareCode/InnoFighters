import { describe, expect, it } from 'vitest';
import { GROUND, LARGURA } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { cpuInput } from '../../src/fight/cpu';
import { CENTELLA } from '../../src/data/lutadores';
import type { LutadorMontado } from '../../src/data/montar';
import type { GolpeMontado, LutadorDef } from '../../src/data/tipos';
import { ID_CENTELLA, ateALuta, criarLuta, elencoE3, montarFixtura, tipos, type Luta } from './_kit-e3';

/*
 * E3 · S3 — CENTELLA em dados + motor (docs/mecanicas-e3.md §2.2): RESORTE (`rebote`, momento por distância), HURACANRANA
 * (`agarrao.alvo: 'ar'`), PLANCHA (leap alto) e as dicas de CPU (`antiaereo`, `espacoAtras`). A CENTELLA é só definição de
 * teste sobre o atlas do WEI LONG (arte na E5).
 */

const elenco = elencoE3();
const centella = elenco[ID_CENTELLA];
const resorte: GolpeMontado = centella.moves.sFwd;
const huracanrana: GolpeMontado = centella.moves.sDown;
const rb = resorte.rebote!;
const POW = centella.pow;

function pronta(opts: { x1?: number; x2?: number; lut?: Record<IdLutador, LutadorMontado>; c2?: IdLutador } = {}): Luta {
  const l = criarLuta({ mode: 'versus', c1: ID_CENTELLA, c2: opts.c2 ?? 'hayato' }, opts.lut ?? elenco);
  ateALuta(l);
  l.g.p1.x = opts.x1 ?? 400;
  l.g.p2.x = opts.x2 ?? 900;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  return l;
}

type Voo = { xQuique: number; vxQuique: number; ev: EventoLuta[]; fases: number[]; flips: number[]; hpPerdido: number; l: Luta };

/**
 * Aperta →+ESP no tick 0 e anda até a CENTELLA pousar. Se `teleporte`, coloca o rival 110 px à frente dela no tick do
 * quique (para o dano ser medido sem depender de onde a voadora cai).
 */
function resortear(opts: { x1: number; x2?: number; teleporte?: boolean; lut?: Record<IdLutador, LutadorMontado> }): Voo {
  const l = pronta({ x1: opts.x1, x2: opts.x2 ?? 900, ...(opts.lut ? { lut: opts.lut } : {}) });
  const voo: Voo = { xQuique: NaN, vxQuique: NaN, ev: [], fases: [], flips: [], hpPerdido: 0, l };
  const dir = l.g.p1.facing;
  const hp0 = l.g.p2.hp;
  for (let t = 0; t < 200; t++) {
    l.frame.p1.sp = t === 0;
    if (dir > 0) l.frame.p1.right = t === 0;
    else l.frame.p1.left = t === 0;
    const ev = l.passo();
    l.frame.p1.right = l.frame.p1.left = false;
    voo.ev.push(...ev);
    voo.fases.push(l.g.p1.reboteFase);
    voo.flips.push(l.g.p1.pose.flip);
    const q = ev.find((e) => e.tipo === 'rebote');
    if (q && q.tipo === 'rebote' && Number.isNaN(voo.xQuique)) {
      voo.xQuique = q.x;
      voo.vxQuique = l.g.p1.vx;
      if (opts.teleporte) l.g.p2.x = l.g.p1.x + dir * 110;
    }
    if (!Number.isNaN(voo.xQuique) && l.g.p1.move === '_lag') break;
  }
  voo.hpPerdido = hp0 - l.g.p2.hp;
  return voo;
}

/** Índice do tick (0 = o do aperto) em que sai o evento `rebote` partindo de x1. */
function tickDoEvento(x1: number): number {
  const l = pronta({ x1 });
  for (let t = 0; t < 200; t++) {
    l.frame.p1.sp = t === 0;
    l.frame.p1.right = t === 0;
    const ev = l.passo();
    l.frame.p1.right = false;
    if (tipos(ev, 'rebote').length) return t;
  }
  return -1;
}

describe('S3 · RESORTE: corre de costas até a corda, quica e volta (momento por distância)', () => {
  it.each([480, 380, 280, 180, 100])('saindo de x = %i olhando para a direita: a ida termina na margem (60 ± 1) com 1 evento rebote', (x1) => {
    const v = resortear({ x1 });
    expect(Math.abs(v.xQuique - 60)).toBeLessThanOrEqual(1);
    expect(tipos(v.ev, 'rebote')).toHaveLength(1);
  });

  it('o dano cresce de forma ESTRITAMENTE monotônica com a distância percorrida e vale (dmg + percurso × dmgPorPx) × pow', () => {
    const danos = [480, 380, 280, 180, 100].map((x1) => resortear({ x1, teleporte: true }).hpPerdido);
    for (let i = 1; i < danos.length; i++) expect(danos[i - 1]).toBeGreaterThan(danos[i] as number);
    [480, 380, 280, 180, 100].forEach((x1, i) => {
      const esperado = (resorte.dmg! + Math.min(x1 - 60, rb.maxDist) * rb.dmgPorPx) * POW;
      expect(danos[i]).toBeCloseTo(esperado, 4);
    });
  });

  it('a velocidade da volta é vxBase + momento × vxPorPx (± 0,01) e o momento é limitado por maxDist', () => {
    for (const x1 of [480, 280, 100]) {
      const v = resortear({ x1 });
      expect(v.vxQuique).toBeCloseTo(rb.vxBase + (x1 - 60) * rb.vxPorPx, 2);
    }
    const curto: LutadorDef = { ...CENTELLA, especiais: { ...CENTELLA.especiais, sFwd: { ...CENTELLA.especiais.sFwd, rebote: { ...rb, maxDist: 100 } } } };
    const v = resortear({ x1: 480, lut: elencoE3({ centella: curto }) });
    expect(v.vxQuique).toBeCloseTo(rb.vxBase + 100 * rb.vxPorPx, 2);
  });

  it('a ida anda a `vel` por tick e NÃO acerta ninguém (rival colado na frente, intacto até o quique)', () => {
    const l = pronta({ x1: 400, x2: 480 });
    const hp0 = l.g.p2.hp;
    let quicou = false;
    let xAnt = l.g.p1.x;
    const passos: number[] = [];
    for (let t = 0; t < 40 && !quicou; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      const ev = l.passo();
      l.frame.p1.right = false;
      if (l.g.p1.reboteFase === 1 && l.g.p1.mt > resorte.S) passos.push(xAnt - l.g.p1.x);
      xAnt = l.g.p1.x;
      expect(tipos(ev, 'hit'), `tick ${t}`).toHaveLength(0);
      expect(l.g.p2.hp).toBe(hp0);
      quicou = tipos(ev, 'rebote').length > 0;
    }
    expect(passos.length).toBeGreaterThan(5);
    for (const p of passos) expect(p).toBeCloseTo(rb.vel, 6);
  });

  it('quica NO tick em que chega à parede (S + ceil(percurso / vel)), não espera o maxTicks', () => {
    for (const x1 of [180, 300, 470]) {
      const tQuique = tickDoEvento(x1);
      expect(tQuique).toBe(resorte.S + Math.ceil((x1 - 60) / rb.vel));
    }
  });

  it('espelhado: olhando para a esquerda a corda é a da direita (LARGURA − 60) e a ida anda para a direita', () => {
    const l = pronta({ x1: 500, x2: 100 });
    l.passo(); // o `facing` acompanha o rival no tick livre seguinte
    expect(l.g.p1.facing).toBe(-1);
    let xQ = NaN;
    for (let t = 0; t < 120 && Number.isNaN(xQ); t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.left = t === 0;
      const e = tipos(l.passo(), 'rebote')[0];
      l.frame.p1.left = false;
      if (e && e.tipo === 'rebote') xQ = e.x;
    }
    expect(Math.abs(xQ - (LARGURA - 60))).toBeLessThanOrEqual(1);
  });

  it('encostada na corda: quica no 1º tick da ida, com momento 0 (dano base e velocidade base)', () => {
    const l = pronta({ x1: 60 });
    let ev: EventoLuta[] = [];
    for (let t = 0; t < 30 && !tipos(ev, 'rebote').length; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      ev = l.passo();
      l.frame.p1.right = false;
    }
    expect(tipos(ev, 'rebote')).toHaveLength(1);
    expect(l.g.p1.momento).toBe(0);
    expect(l.g.p1.vx).toBeCloseTo(rb.vxBase, 6);
  });

  it('maxTicks encerra a ida antes da parede (dado: 10 ticks → 75 px)', () => {
    const curto: LutadorDef = { ...CENTELLA, especiais: { ...CENTELLA.especiais, sFwd: { ...CENTELLA.especiais.sFwd, rebote: { ...rb, maxTicks: 10 } } } };
    const v = resortear({ x1: 480, lut: elencoE3({ centella: curto }) });
    expect(v.xQuique).toBeCloseTo(480 - 10 * rb.vel, 4);
  });

  it('fases: preparação (0), ida (1), volta (2); a ida corre com a pose espelhada (flip −1) e a volta não', () => {
    const v = resortear({ x1: 300 });
    const fasesUnicas = v.fases.filter((f, i) => i === 0 || f !== v.fases[i - 1]);
    expect(fasesUnicas.slice(0, 3)).toEqual([0, 1, 2]);
    v.fases.forEach((f, i) => {
      if (f === 1) expect(v.flips[i]).toBe(-1);
      if (f === 2) expect(v.flips[i]).toBe(1);
    });
  });

  it('a volta tem caixa de acerto e depois do pouso entra em _lag (lag do golpe), voltando a ficar livre', () => {
    const v = resortear({ x1: 300, teleporte: true });
    expect(tipos(v.ev, 'hit').length).toBeGreaterThan(0);
    expect(v.l.g.p1.move).toBe('_lag');
    for (let i = 0; i < resorte.lag! + 4; i++) v.l.passo();
    expect(v.l.g.p1.state).not.toBe('move');
    expect(v.l.g.p1.reboteFase).toBe(0);
  });

  it('acertada na ida, a fase zera (nada de voadora fantasma depois)', () => {
    const l = pronta({ x1: 400, x2: 480 });
    for (let t = 0; t < 40; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      l.passo();
      l.frame.p1.right = false;
      if (l.g.p1.reboteFase === 1) break;
    }
    expect(l.g.p1.reboteFase).toBe(1);
    l.g.p1.knockdown(1, 6);
    l.passo(2);
    expect(l.g.p1.reboteFase).toBe(0);
    expect(l.g.p1.state).toBe('down');
  });
});

describe('S3 · a caixa de acerto do RESORTE é a da voadora da volta (a[1]), não a da corrida da ida (a[0])', () => {
  const comAnim = (a: readonly string[]) =>
    montarFixtura({ ...CENTELLA, anim: { sFwd: { s: ['sc0'], a, r: ['idle0'] } } }).boxes.sFwd;

  it('a caixa vem da pose da volta', () => {
    const volta = comAnim(['sc0', 'sc1']);
    const ida = comAnim(['sc0', 'sc0']);
    expect(volta).toBeDefined();
    expect(volta).not.toEqual(ida); // as duas poses medem diferente, então a escolha de a[1] aparece na caixa
    expect(centella.boxes.sFwd).toEqual(volta);
  });
});

describe('S3 · HURACANRANA: agarrão aéreo (agarrao.alvo: ar)', () => {
  const S = huracanrana.S;
  const A = huracanrana.A;
  const R = huracanrana.R;

  /** O rival (P2) pula no tick 0; a CENTELLA aperta ↓+ESP no tick `quando`. */
  function contraSaltador(quando: number, x2 = 470) {
    const l = pronta({ x1: 400, x2 });
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 90; t++) {
      l.frame.p2.up = t === 0;
      l.frame.p1.sp = t === quando;
      l.frame.p1.down = t === quando;
      ev.push(...l.passo());
    }
    return { l, ev };
  }

  it('rival no ar dentro do alcance: 1 evento throw, o rival cai (down) e perde agarrao.dmg × pow', () => {
    const hp0 = pronta().g.p2.hp;
    let agarrou = 0;
    for (const quando of [3, 5, 7, 9, 11]) {
      const { l, ev } = contraSaltador(quando);
      const n = tipos(ev, 'throw').length;
      if (n === 0) continue;
      agarrou++;
      expect(n).toBe(1);
      expect(l.g.p2.hp).toBeCloseTo(hp0 - huracanrana.agarrao!.dmg! * POW, 4);
    }
    expect(agarrou).toBeGreaterThanOrEqual(2); // a janela de 18 ticks pega o salto em vários momentos
  });

  it('o rival agarrado no ar é jogado PARA BAIXO (chega ao chão em poucos ticks) e fica em down', () => {
    const l = pronta({ x1: 400, x2: 470 });
    let tAgarrou = -1;
    for (let t = 0; t < 90 && tAgarrou < 0; t++) {
      l.frame.p2.up = t === 0;
      l.frame.p1.sp = t === 6;
      l.frame.p1.down = t === 6;
      if (tipos(l.passo(), 'throw').length) tAgarrou = t;
    }
    expect(tAgarrou).toBeGreaterThan(0);
    expect(l.g.p2.state).toBe('down');
    expect(l.g.p2.vy).toBeGreaterThan(0);
    for (let i = 0; i < 30 && l.g.p2.y < GROUND; i++) l.passo();
    expect(l.g.p2.y).toBe(GROUND);
  });

  it('contra o rival parado no chão: nenhum throw, e a recuperação mede S + A + R ticks sem poder agir', () => {
    const l = pronta({ x1: 400, x2: 470 });
    let ticksEmGolpe = 0;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 120; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.down = t === 0;
      ev.push(...l.passo());
      if (t >= 0 && l.g.p1.state === 'move' && ticksEmGolpe === t) ticksEmGolpe = t + 1;
    }
    expect(tipos(ev, 'throw')).toHaveLength(0);
    expect(ticksEmGolpe).toBe(S + A + R);
  });

  it('canThrow: alvo ar exige rival FORA do chão, a < 120 px de altura e dentro do alcance; ground não vale', () => {
    const l = pronta({ x1: 400, x2: 470 });
    const { p1, p2 } = l.g;
    p1.opp = p2;
    p2.state = 'jump';
    p2.y = GROUND - 60;
    expect(p1.canThrow(huracanrana)).toBe(true);
    p2.y = GROUND - 119;
    expect(p1.canThrow(huracanrana)).toBe(true);
    p2.y = GROUND - 125;
    expect(p1.canThrow(huracanrana)).toBe(false);
    p2.y = GROUND - 60;
    p2.x = p1.x + huracanrana.agarrao!.alcance! - 1;
    expect(p1.canThrow(huracanrana)).toBe(true);
    p2.x = p1.x + huracanrana.agarrao!.alcance! + 1;
    expect(p1.canThrow(huracanrana)).toBe(false);
    p2.x = 470;
    p2.y = GROUND;
    p2.state = 'idle';
    expect(p1.canThrow(huracanrana)).toBe(false); // no chão: o alvo 'ar' não pega
    expect(p1.canThrow()).toBe(true); // o arremesso de sempre (alvo chão, alcance 108) continua pegando
  });

  it('alvo ambos pega o rival no chão e no ar; alvo chao (padrão) não pega o rival no ar', () => {
    const ambos = (alvo: 'chao' | 'ambos'): GolpeMontado => {
      const def: LutadorDef = {
        ...CENTELLA,
        especiais: { ...CENTELLA.especiais, sDown: { ...CENTELLA.especiais.sDown, agarrao: { ...CENTELLA.especiais.sDown.agarrao!, alvo } } },
      };
      return montarFixtura(def).moves.sDown;
    };
    const l = pronta({ x1: 400, x2: 470 });
    const { p1, p2 } = l.g;
    p1.opp = p2;
    expect(p1.canThrow(ambos('ambos'))).toBe(true); // no chão
    p2.state = 'jump';
    p2.y = GROUND - 60;
    expect(p1.canThrow(ambos('ambos'))).toBe(true); // no ar
    expect(p1.canThrow(ambos('chao'))).toBe(false);
  });
});

describe('S3 · PLANCHA: golpe ALTO (over)', () => {
  function plancha(defesa: 'block' | 'crouchblock'): EventoLuta[] {
    const l = pronta({ x1: 300, x2: 550 });
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 60; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p2.right = true; // o "trás" do P2 (o P1 está à esquerda)
      l.frame.p2.down = defesa === 'crouchblock';
      ev.push(...l.passo());
    }
    return ev;
  }

  it('contra o rival agachado defendendo (crouchblock): acerta', () => {
    const ev = plancha('crouchblock');
    expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 1).length).toBeGreaterThan(0);
    expect(tipos(ev, 'block')).toHaveLength(0);
  });

  it('contra o rival em pé defendendo (block): é bloqueada', () => {
    const ev = plancha('block');
    expect(tipos(ev, 'block').length).toBeGreaterThan(0);
    expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 1)).toHaveLength(0);
  });
});

describe('S3 · montagem recusa RESORTE sem números válidos', () => {
  const comResorte = (extra: Partial<GolpeMontado>): LutadorDef => ({
    ...CENTELLA,
    especiais: { ...CENTELLA.especiais, sFwd: { ...CENTELLA.especiais.sFwd, ...extra } },
  });

  it('type rebote sem rebote, ou com vel/maxTicks/vy/maxDist inválidos, falha alto no boot', () => {
    const { rebote: _r, ...semRebote } = CENTELLA.especiais.sFwd;
    void _r;
    expect(() => montarFixtura({ ...CENTELLA, especiais: { ...CENTELLA.especiais, sFwd: semRebote } })).toThrow(/rebote/);
    expect(() => montarFixtura(comResorte({ rebote: { ...rb, vel: 0 } }))).toThrow(/rebote inválido/);
    expect(() => montarFixtura(comResorte({ rebote: { ...rb, maxTicks: 0 } }))).toThrow(/rebote inválido/);
    expect(() => montarFixtura(comResorte({ rebote: { ...rb, vy: 3 } }))).toThrow(/rebote inválido/);
    expect(() => montarFixtura(comResorte({ rebote: { ...rb, maxDist: 0 } }))).toThrow(/rebote inválido/);
    expect(() => montarFixtura(comResorte({}))).not.toThrow();
  });

  it('rebote num golpe que não é type rebote também é erro de dados', () => {
    expect(() => montarFixtura(comResorte({ type: 'rush' }))).toThrow(/rebote inválido/);
  });
});

describe('S3 · dicas de CPU da CENTELLA (antiaereo, espacoAtras)', () => {
  /** CPU nível 2 de CENTELLA (P1) contra o HAYATO (P2). `saltador`: o rival pula a cada 70 ticks. */
  function cpuCentella(opts: { saltador: boolean; lut?: Record<IdLutador, LutadorMontado>; ticks?: number; semente?: number }) {
    const l = criarLuta({ mode: 'versus', c1: ID_CENTELLA, c2: 'hayato', p1cpu: 2 }, opts.lut ?? elenco, criarRng(opts.semente ?? 11));
    ateALuta(l);
    const usos: { golpe: string; espacoAtras: number; rivalNoAr: boolean }[] = [];
    let anterior: string | null = null;
    let anteriorMt = -1;
    for (let i = 0; i < (opts.ticks ?? 5000); i++) {
      l.g.p1.en = 100;
      l.g.p1.hp = Math.max(l.g.p1.hp, 60);
      l.g.p2.hp = 100;
      l.frame.p2.up = opts.saltador && l.g.p2.grounded && l.g.p2.state !== 'hit' && l.g.p2.age % 70 === 0;
      const x = l.g.p1.x;
      const dir = l.g.p1.facing;
      const noAr = l.g.p2.y < GROUND - 50;
      l.passo();
      const p = l.g.p1;
      if (p.state === 'move' && p.move && (p.move === 'sFwd' || p.move === 'sDown') && (anterior !== p.move || p.mt < anteriorMt)) {
        usos.push({ golpe: p.move, espacoAtras: dir > 0 ? x - 60 : LARGURA - 60 - x, rivalNoAr: noAr });
      }
      anterior = p.state === 'move' ? p.move : null;
      anteriorMt = p.mt;
      if (l.g.phase !== 'fight') ateALuta(l);
    }
    return usos;
  }

  it('as dicas montadas: HURACANRANA antiaereo, RESORTE aproximar com espacoAtras', () => {
    expect(centella.dicasIa.map((d) => `${d.golpe}:${d.dica.papel}`)).toEqual(['sDown:antiaereo', 'sFwd:aproximar']);
    expect(resorte.ia?.espacoAtras).toBe(200);
  });

  /** Quantas de 600 decisões de CPU (sementes diferentes) apertam ↓+ESP, com o rival a `dist` px e a `altura` px do chão. */
  function decisoesDeHuracanrana(altura: number, dist: number, lut = elenco): number {
    let n = 0;
    for (let semente = 1; semente <= 600; semente++) {
      const l = pronta({ x1: 400, x2: 400 + dist, lut });
      l.g.p1.cpu = 2;
      l.g.p2.y = GROUND - altura;
      l.g.p2.state = altura > 0 ? 'jump' : 'idle';
      const inp = cpuInput(l.g.p1, l.g.p2, l.g, criarRng(semente));
      if (inp.sp && inp.down) n++;
    }
    return n;
  }

  it('contra rival NO AR dentro de 30..190 px a CPU usa o HURACANRANA (≈ anti × 0,25 × 0,5 das decisões); fora disso, nunca', () => {
    const noAr = decisoesDeHuracanrana(100, 120);
    expect(noAr).toBeGreaterThan(30);
    expect(noAr).toBeLessThan(120);
    expect(decisoesDeHuracanrana(100, 260)).toBe(0); // longe demais (ramo anti-aéreo é < 190)
    expect(decisoesDeHuracanrana(100, 20)).toBe(0); // colado demais (> 30)
    expect(decisoesDeHuracanrana(0, 120)).toBe(0); // rival no chão
  });

  it('o HURACANRANA sai dos ramos de corpo a corpo e do encadeamento: a CPU nunca o usa contra rival no chão', () => {
    expect(cpuCentella({ saltador: false }).filter((u) => u.golpe === 'sDown')).toHaveLength(0);
  });

  it('a CPU só usa o RESORTE com ao menos 200 px de corda atrás dela (e o usa)', () => {
    const usos = cpuCentella({ saltador: false }).filter((u) => u.golpe === 'sFwd');
    expect(usos.length).toBeGreaterThan(0);
    for (const u of usos) expect(u.espacoAtras, 'RESORTE sem espaço atrás').toBeGreaterThanOrEqual(200 - 8);
  });

  it('sem a dica no def (mutação de dados) o HURACANRANA deixa de ser exclusivo do anti-aéreo: a CPU o usa no chão', () => {
    const { ia: _ia, ...semIa } = CENTELLA.especiais.sDown;
    void _ia;
    const lut = elencoE3({ centella: { ...CENTELLA, especiais: { ...CENTELLA.especiais, sDown: semIa } } });
    const parado = cpuCentella({ saltador: false, lut }).filter((u) => u.golpe === 'sDown');
    expect(parado.length).toBeGreaterThan(0);
  });
});
