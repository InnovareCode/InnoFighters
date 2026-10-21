import { describe, expect, it } from 'vitest';
import { WALK_SPEED } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { AMINU } from '../../src/data/lutadores';
import type { LutadorMontado } from '../../src/data/montar';
import type { GolpeMontado, LutadorDef } from '../../src/data/tipos';
import { ID_AMINU, ateALuta, criarLuta, elencoE3, montarFixtura, semIa, tipos, type Luta } from './_kit-e3';

/*
 * E3 · S2 — AMINU em dados + motor (docs/mecanicas-e3.md §2.1): carga com `spSeg` (3 níveis), quebra-guarda, absorção de
 * projétil (GARKUWA) e as dicas de CPU. A AMINU é só definição de teste sobre o atlas do WEI LONG (arte na E5).
 */

const elenco = elencoE3();
const aminu = elenco[ID_AMINU];
const mashi: GolpeMontado = aminu.moves.sFire;
const garkuwa: GolpeMontado = aminu.moves.sDown;
const carga = mashi.carga!;

function pronta(opts: { x1?: number; x2?: number; lut?: Record<IdLutador, LutadorMontado> } = {}): Luta {
  const l = criarLuta({ mode: 'versus', c1: ID_AMINU, c2: 'hayato' }, opts.lut ?? elenco);
  ateALuta(l);
  l.g.p1.x = opts.x1 ?? 300;
  l.g.p2.x = opts.x2 ?? 800;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  return l;
}

type Rastro = { mt: number[]; nivel: number[]; ev: EventoLuta[]; pAposSoltar: number; mtSoltou: number; glowAposSoltar: number };

/**
 * Aperta ESP no tick 0 e segura `spSeg` por exatamente `n` ticks DE CARGA (a partir de mt = S−1); n = 0 é um toque.
 * Anda até o golpe passar da preparação e devolve o mt e o nível de cada tick.
 */
function carregar(l: Luta, n: number, extra: (t: number) => void = () => {}): Rastro {
  const S = mashi.S;
  const r: Rastro = { mt: [], nivel: [], ev: [], pAposSoltar: -1, mtSoltou: -1, glowAposSoltar: -1 };
  for (let t = 0; t < S + n + 40; t++) {
    l.frame.p1.sp = t === 0;
    l.frame.p1.spSeg = n > 0 && t <= S - 2 + n;
    extra(t);
    r.ev.push(...l.passo());
    r.mt.push(l.g.p1.mt);
    r.nivel.push(l.g.p1.nivelCarga);
    if (r.mtSoltou < 0 && l.g.p1.mt >= S) {
      r.mtSoltou = t;
      r.pAposSoltar = l.g.p1.nivelCarga;
      r.glowAposSoltar = l.g.p1.pose.glow;
    }
    if (l.g.p1.state !== 'move') break;
  }
  return r;
}

describe('S2 · carga: segurar ESP (spSeg) sobe o nível por tempo', () => {
  it.each([
    [0, 1],
    [29, 1],
    [30, 2],
    [69, 2],
    [70, 3],
    [200, 3],
  ])('segurar %i ticks de carga dá nível %i', (n, nivel) => {
    const l = pronta();
    const r = carregar(l, n);
    expect(r.pAposSoltar).toBe(nivel);
  });

  it('com 200 ticks apertados a soltura sai sozinha no tick 90 (carga.max); mt fica parado em S−1 enquanto carrega', () => {
    const l = pronta();
    const S = mashi.S;
    const r = carregar(l, 200);
    // o mt chega a S−1 no tick S−1, fica ali 90 ticks e só então anda
    expect(r.mt[S - 2]).toBe(S - 2);
    for (let t = S - 1; t < S - 1 + carga.max; t++) expect(r.mt[t], `tick ${t}`).toBe(S - 1);
    expect(r.mt[S - 1 + carga.max]).toBe(S);
  });

  it('o nível some quando o golpe acaba (e começa de novo em 0)', () => {
    const l = pronta();
    carregar(l, 70);
    l.frame.p1.spSeg = false;
    l.passo(60);
    expect(l.g.p1.state).not.toBe('move');
    expect(l.g.fighters[0].nivelCarga).toBe(0);
  });

  it('eventos `carga`: 1 ao começar a segurar e um a cada nível novo; um toque não emite nada', () => {
    const niveis = (n: number): number[] =>
      tipos(carregar(pronta(), n).ev, 'carga').map((e) => (e.tipo === 'carga' ? e.nivel : -1));
    expect(niveis(0)).toEqual([]);
    expect(niveis(29)).toEqual([1]);
    expect(niveis(30)).toEqual([1, 2]);
    expect(niveis(70)).toEqual([1, 2, 3]);
    expect(niveis(200)).toEqual([1, 2, 3]);
  });

  it('o brilho da pose cresce com a carga (P.glow = carga / max) e zera no fim', () => {
    const l = pronta();
    const S = mashi.S;
    let glowMeio = 0;
    carregar(l, 45, (t) => {
      if (t === S - 1 + 44) glowMeio = l.g.p1.pose.glow; // lido antes do último tick de carga
    });
    expect(glowMeio).toBeGreaterThan(0.3);
    expect(glowMeio).toBeLessThan(0.6);
    // e continua brilhando no golpe depois de soltar (mesmo valor, até o fim do golpe)
    const l2 = pronta();
    expect(carregar(l2, 45).glowAposSoltar).toBeCloseTo(45 / carga.max, 6);
    l.passo(60);
    expect(l.g.p1.pose.glow).toBe(0);
  });

  it('andando enquanto carrega: no máximo 60 × WALK_SPEED × spd × andar (+1 px) e de fato anda', () => {
    const l = pronta();
    const x0 = l.g.p1.x;
    const S = mashi.S;
    let xInicio = NaN;
    let xSoltou = NaN;
    carregar(l, 60, (t) => {
      l.frame.p1.right = t >= S - 1;
      if (t === S - 1) xInicio = l.g.p1.x;
      if (t === S - 1 + 60) xSoltou = l.g.p1.x; // antes do tick em que solta: 60 ticks de carga andados
    });
    const andou = xSoltou - xInicio;
    const teto = 60 * WALK_SPEED * aminu.spd * carga.andar;
    expect(andou).toBeLessThanOrEqual(teto + 1);
    expect(andou).toBeGreaterThan(teto * 0.8);
    expect(x0).toBe(300);
  });

  it('ser acertado carregando zera a carga: a MASHI seguinte começa do nível 1', () => {
    const l = pronta({ x2: 380 });
    l.frame.p1.sp = true;
    l.frame.p1.spSeg = true;
    l.passo();
    l.frame.p1.sp = false;
    l.passo(mashi.S + 20); // carregando (nível 1 ou 2)
    expect(l.g.p1.nivelCarga).toBeGreaterThan(0);
    l.frame.p2.hp = true; // o HAYATO bate nela
    l.passo(14);
    l.frame.p2.hp = false;
    expect(l.g.p1.state).not.toBe('move');
    l.frame.p1.spSeg = false;
    l.passo(40);
    expect(l.g.fighters[0].nivelCarga).toBe(0);
    // toque novo: nível 1 (não herdou a carga de antes)
    l.g.p2.x = 800;
    l.g.p1.en = 100;
    const r = carregar(l, 0);
    expect(r.pAposSoltar).toBe(1);
  });
});

describe('S2 · o nível escolhe dano, derrubada e quebra-guarda (`carga.porNivel`)', () => {
  /** P2 parado a 85 px, sem bloquear. Devolve a vida perdida e o estado dele logo após o acerto. */
  function acertar(n: number) {
    const l = pronta({ x2: 385 });
    const antes = l.g.p2.hp;
    const r = carregar(l, n);
    const hit = r.ev.find((e) => e.tipo === 'hit' && e.defensor === 1);
    // estado do rival no tick do acerto: recomeça a luta idêntica e para nele
    const l2 = pronta({ x2: 385 });
    let estado = '';
    for (let t = 0; t < mashi.S + n + 40; t++) {
      l2.frame.p1.sp = t === 0;
      l2.frame.p1.spSeg = n > 0 && t <= mashi.S - 2 + n;
      const ev = l2.passo();
      if (ev.some((e) => e.tipo === 'hit')) {
        estado = l2.g.p2.state;
        break;
      }
    }
    return { perdeu: antes - l.g.p2.hp, hit, estado };
  }

  it('nível 1: dano de porNivel[0], rival atordoado; nível 2: dano maior e derruba; nível 3: o maior e derruba', () => {
    const [d1, d2, d3] = carga.porNivel.map((p) => p.dmg as number);
    const n1 = acertar(0);
    const n2 = acertar(30);
    const n3 = acertar(70);
    expect(n1.hit).toBeDefined();
    expect(n1.perdeu).toBeCloseTo(d1! * aminu.pow, 6);
    expect(n1.estado).toBe('hit');
    expect(n2.perdeu).toBeCloseTo(d2! * aminu.pow, 6);
    expect(n2.estado).toBe('down');
    expect(n3.perdeu).toBeCloseTo(d3! * aminu.pow, 6);
    expect(n3.estado).toBe('down');
    expect(d1! < d2! && d2! < d3!).toBe(true);
  });
});

describe('S2 · quebra-guarda (nível 3 atravessa o bloqueio)', () => {
  /** P2 na parede, segurando "para trás" (bloqueando). */
  function contraBloqueio(n: number) {
    const l = pronta({ x1: 805, x2: 890 });
    l.frame.p2.right = true;
    const antes = l.g.p2.hp;
    const ev: EventoLuta[] = [];
    let estado = '';
    let stun = -1;
    for (let t = 0; t < mashi.S + n + 40; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.spSeg = n > 0 && t <= mashi.S - 2 + n;
      const e = l.passo();
      ev.push(...e);
      if (e.some((x) => x.tipo === 'block' || x.tipo === 'quebra-guarda' || x.tipo === 'hit')) {
        estado = l.g.p2.state;
        stun = l.g.p2.stun;
        break;
      }
    }
    return { l, ev, estado, stun, perdeu: antes - l.g.p2.hp };
  }

  it('nível 3: o rival que bloqueia fica em `hit` com stun = quebraGuarda, 1 evento quebra-guarda, raspão <= 12% do dano', () => {
    const q = carga.porNivel[2]!.quebraGuarda!;
    const r = contraBloqueio(70);
    expect(tipos(r.ev, 'quebra-guarda')).toHaveLength(1);
    expect(tipos(r.ev, 'block')).toHaveLength(0);
    expect(r.estado).toBe('hit');
    expect(r.stun).toBe(q);
    expect(r.perdeu).toBeGreaterThan(0);
    expect(r.perdeu).toBeLessThanOrEqual(carga.porNivel[2]!.dmg! * aminu.pow * 0.12 + 1e-9);
  });

  it.each([0, 29, 30, 69])('nível menor (segurou %i): continua bloqueado', (n) => {
    const r = contraBloqueio(n);
    expect(r.estado).toBe('block');
    expect(tipos(r.ev, 'quebra-guarda')).toHaveLength(0);
    expect(tipos(r.ev, 'block')).toHaveLength(1);
  });

  it('golpe sem quebraGuarda nenhum (HAYATO) segue bloqueado: o ramo do bloqueio não mudou', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'caio' }, elenco);
    ateALuta(l);
    l.g.p1.x = 805;
    l.g.p2.x = 890;
    l.frame.p2.right = true;
    l.frame.p1.hp = true;
    const ev = l.passo(20);
    expect(tipos(ev, 'block').length).toBeGreaterThan(0);
    expect(tipos(ev, 'quebra-guarda')).toHaveLength(0);
  });
});

describe('S2 · GARKUWA absorve projétil frontal na janela ativa', () => {
  /**
   * AMINU aperta ↓+ESP no tick 0. O HAYATO (P2) lança uma bola de trovão que chega em `chegaEm` ticks depois (a posição
   * é ajustada à mão para o tempo de chegada ser exato). `deCostas`: o P2 troca de lado antes e a bola vem por trás.
   */
  function bola(chegaEm: number, deCostas = false) {
    const l = pronta({ x1: 400, x2: 650 });
    l.frame.p1.down = true;
    l.frame.p1.sp = true;
    const ev: EventoLuta[] = [];
    ev.push(...l.passo()); // tick 0: começa o golpe (mt = 0)
    l.frame.p1.sp = false;
    l.frame.p1.down = false;
    if (deCostas) {
      l.g.p2.x = l.g.p1.x - 250;
      ev.push(...l.passo());
    }
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const pr = l.g.projectiles[0]!;
    const v = Math.abs(pr.vx);
    const off = 72 + v * chegaEm - v / 2; // 72 = meia hurtbox (38) + meia caixa do projétil (34)
    pr.x = l.g.p1.x + (deCostas ? -off : off);
    const hp0 = l.g.p1.hp;
    for (let i = 0; i < 60; i++) ev.push(...l.passo());
    return { l, ev, hp0 };
  }
  const janelaIni = garkuwa.S;
  const janelaFim = garkuwa.S + garkuwa.A;

  it('de frente, dentro da janela [S, S+A): a bola some, a vida não muda e sai 1 clash', () => {
    for (const chegaEm of [janelaIni + 3, Math.floor((janelaIni + janelaFim) / 2), janelaFim - 4]) {
      const r = bola(chegaEm);
      expect(tipos(r.ev, 'clash'), `chegada ${chegaEm}`).toHaveLength(1);
      expect(tipos(r.ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 0), `chegada ${chegaEm}`).toHaveLength(0);
      expect(r.l.g.p1.hp).toBe(r.hp0);
      expect(r.l.g.projectiles).toHaveLength(0);
    }
  });

  it('antes da janela, depois da janela ou pelas costas: há dano e nenhum clash', () => {
    const antes = bola(1);
    const depois = bola(janelaFim + 6);
    const costas = bola(janelaIni + 8, true);
    for (const [nome, r] of [['antes', antes], ['depois', depois], ['costas', costas]] as const) {
      expect(tipos(r.ev, 'clash'), nome).toHaveLength(0);
      expect(r.l.g.p1.hp, nome).toBeLessThan(r.hp0);
    }
  });

  it('sem `absorveProj` no golpe a mesma bola acerta (a regra é o campo, não o golpe)', () => {
    const { absorveProj: _a, ...semAbsorver } = AMINU.especiais.sDown;
    void _a;
    const def: LutadorDef = { ...AMINU, especiais: { ...AMINU.especiais, sDown: semAbsorver } };
    const l = pronta({ x1: 400, x2: 650, lut: elencoE3({ aminu: def }) });
    l.frame.p1.down = true;
    l.frame.p1.sp = true;
    l.passo();
    l.frame.p1.sp = false;
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const pr = l.g.projectiles[0]!;
    pr.x = l.g.p1.x + 72 + 9.5 * 12;
    const hp0 = l.g.p1.hp;
    const ev = l.passo(40);
    expect(tipos(ev, 'clash')).toHaveLength(0);
    expect(l.g.p1.hp).toBeLessThan(hp0);
  });
});

describe('S2 · montagem recusa carga inválida', () => {
  const comMashi = (extra: Partial<GolpeMontado>): LutadorDef => ({ ...AMINU, especiais: { ...AMINU.especiais, sFire: { ...AMINU.especiais.sFire, ...extra } } });

  it('porNivel de tamanho diferente, niveis[0] != 0, S < 2 e type carga sem carga falham alto', () => {
    expect(() => montarFixtura(comMashi({ carga: { ...carga, porNivel: [{ dmg: 1 }] } }))).toThrow(/carga inválida/);
    expect(() => montarFixtura(comMashi({ carga: { ...carga, niveis: [5, 30, 70] } }))).toThrow(/carga inválida/);
    expect(() => montarFixtura(comMashi({ S: 1 }))).toThrow(/S >= 2/);
    const { carga: _c, ...sem } = AMINU.especiais.sFire;
    void _c;
    expect(() => montarFixtura({ ...AMINU, especiais: { ...AMINU.especiais, sFire: sem } })).toThrow(/sem carga/);
    expect(() => montarFixtura(AMINU)).not.toThrow();
  });
});

describe('S2 · dicas de CPU da AMINU', () => {
  /** CPU nível 2 de AMINU (P2) contra o HAYATO. Mantém energia cheia e devolve o que a CPU fez. */
  function cpuAminu(opts: { ticks: number; bolas?: boolean; lut?: Record<IdLutador, LutadorMontado>; rng?: Rng }) {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: ID_AMINU, cpu: 2 }, opts.lut ?? elenco, opts.rng ?? criarRng(33));
    ateALuta(l);
    const ev: EventoLuta[] = [];
    let casts = 0;
    let emMashi = false;
    for (let i = 0; i < opts.ticks; i++) {
      l.g.p2.en = 100;
      l.g.p1.en = 100;
      l.g.p1.hp = 100;
      l.g.p2.hp = Math.max(l.g.p2.hp, 60);
      l.frame.p1.sp = !!opts.bolas && i % 45 === 0;
      ev.push(...l.passo());
      const agora = l.g.p2.state === 'move' && l.g.p2.move === 'sFire';
      if (agora && !emMashi) casts++;
      emMashi = agora;
      if (l.g.phase !== 'fight') ateALuta(l);
    }
    return { l, ev, casts };
  }

  it('a CPU segura a MASHI: a maioria dos golpes sai com nível >= 2 (critério da E6 era 30%)', () => {
    const r = cpuAminu({ ticks: 5000 });
    const subiu2 = tipos(r.ev, 'carga').filter((e) => e.tipo === 'carga' && e.lutador === 1 && e.nivel >= 2).length;
    expect(r.casts).toBeGreaterThanOrEqual(8);
    expect(subiu2 / r.casts).toBeGreaterThanOrEqual(0.3);
  });

  it('sem a dica no def (mutação de dados) a CPU nunca segura: nenhum evento carga', () => {
    const { ia: _a, ...mashiSemIa } = AMINU.especiais.sFire;
    void _a;
    const def: LutadorDef = { ...AMINU, especiais: { ...AMINU.especiais, sFire: mashiSemIa } };
    const r = cpuAminu({ ticks: 4000, lut: elencoE3({ aminu: def }) });
    expect(tipos(r.ev, 'carga').filter((e) => e.tipo === 'carga' && e.lutador === 1)).toHaveLength(0);
  });

  it('a CPU levanta a GARKUWA contra a bola de trovão no lugar de bloquear (clash por escudo)', () => {
    const r = cpuAminu({ ticks: 6000, bolas: true });
    expect(tipos(r.ev, 'clash').length).toBeGreaterThanOrEqual(2);
  });

  it('sem a dica defesa-projetil a CPU não usa o escudo: nenhum clash', () => {
    const { ia: _a, ...gSemIa } = AMINU.especiais.sDown;
    void _a;
    const def: LutadorDef = { ...AMINU, especiais: { ...AMINU.especiais, sDown: gSemIa } };
    const r = cpuAminu({ ticks: 6000, bolas: true, lut: elencoE3({ aminu: def }) });
    expect(tipos(r.ev, 'clash')).toHaveLength(0);
  });

  it('RNG: com a dica viva a CPU da AMINU sorteia a mais do que sem ela (a prova de "fora do alcance não sorteia" está em chefe-e3.test.ts)', () => {
    const contar = (def: LutadorDef): number => {
      const rng = criarRng(42);
      let chamadas = 0;
      const contador: Rng = new Proxy(rng, {
        get(alvo, prop, recv) {
          const v = Reflect.get(alvo, prop, recv) as unknown;
          if (typeof v !== 'function') return v;
          return (...a: unknown[]) => {
            chamadas++;
            return (v as (...x: unknown[]) => unknown).apply(alvo, a);
          };
        },
      });
      cpuAminu({ ticks: 3000, lut: elencoE3({ aminu: def }), rng: contador });
      return chamadas;
    };
    const comDicas = contar(AMINU);
    const semDicas = contar({
      ...AMINU,
      especiais: {
        sFire: semIa(AMINU.especiais.sFire),
        sDown: semIa(AMINU.especiais.sDown),
        sFwd: AMINU.especiais.sFwd,
      },
    });
    expect(comDicas).not.toBe(semDicas); // a dica está viva
  });
});
