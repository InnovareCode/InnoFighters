import { describe, expect, it } from 'vitest';
import { GROUND, SH, WALK_SPEED } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { NILA } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import { getPD } from '../../src/data/poses';
import type { GolpeMontado, LutadorDef, Poses } from '../../src/data/tipos';
import { hurtbox } from '../../src/fight/colisao';
import { cpuInput } from '../../src/fight/cpu';
import { ID_NILA, ateALuta, criarLuta, elencoE3, montarFixtura, posesWei, tipos, type Luta } from './_kit-e3';

/*
 * E3 · S5 — NILA em dados + motor (docs/mecanicas-e3.md §2.4): fichas GAJA (base) e SARPA (troca de ficha da S1a, golpe
 * `troca` = VADIVU), BOTE `rente` (hurtbox no 3º nível), GOLPE MARMA (atordoamento longo), `poseDaFicha` e a dica de troca.
 * A NILA é só definição de teste sobre o atlas do WEI LONG (arte na E5).
 */

const elenco = elencoE3();
const nila = elenco[ID_NILA];
const sarpa = nila.fichas['sarpa'] as LutadorMontado;

function pronta(opts: { x1?: number; x2?: number; lut?: Record<IdLutador, LutadorMontado> } = {}): Luta {
  const l = criarLuta({ mode: 'versus', c1: ID_NILA, c2: 'hayato' }, opts.lut ?? elenco);
  ateALuta(l);
  l.g.p1.x = opts.x1 ?? 300;
  l.g.p2.x = opts.x2 ?? 900;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  return l;
}

/** Aperta ↓+ESP (VADIVU) e anda até a NILA ficar livre de novo. Devolve os eventos. */
function vadivu(l: Luta): EventoLuta[] {
  const ev: EventoLuta[] = [];
  for (let t = 0; t < 60; t++) {
    l.frame.p1.sp = t === 0;
    l.frame.p1.down = t === 0;
    ev.push(...l.passo());
    if (t > 2 && l.g.p1.state !== 'move') break;
  }
  l.frame.p1.sp = l.frame.p1.down = false;
  return ev;
}

describe('S5 · VADIVU: troca de ficha GAJA <-> SARPA', () => {
  it('a base é a GAJA; depois do VADIVU a ficha é sarpa e o ESP sai como BOTE; um 2º VADIVU devolve à GAJA (ficha null)', () => {
    const l = pronta();
    expect(l.g.p1.ficha).toBeNull();
    expect(l.g.p1.ch.moves.sFire.name).toBe('GOLPE MARMA');
    const ev1 = vadivu(l);
    expect(l.g.p1.ficha).toBe('sarpa');
    expect(l.g.p1.ch).toBe(sarpa);
    expect(l.g.p1.ch.moves.sFire.name).toBe('BOTE');
    expect(l.g.p1.ch.moves.sFwd.name).toBe('SALTO DA SERPENTE');
    expect(ev1.filter((e) => e.tipo === 'troca-ficha')).toEqual([{ tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' }]);
    // o ESP desta ficha é o BOTE: o golpe em curso depois do ESP é a rasteira
    l.frame.p1.sp = true;
    l.passo();
    l.frame.p1.sp = false;
    expect(l.g.p1.move).toBe('sFire');
    expect(l.g.p1.golpeAtual().name).toBe('BOTE');
    l.passo(60);
    const ev2 = vadivu(l);
    expect(l.g.p1.ficha).toBeNull();
    expect(l.g.p1.ch).toBe(nila);
    expect(ev2.filter((e) => e.tipo === 'troca-ficha')).toEqual([{ tipo: 'troca-ficha', lutador: 0, ficha: null }]);
  });

  it('a troca acontece em mt === S (nem antes nem depois) e o VADIVU dura S + A + R com custo 0', () => {
    const l = pronta();
    const g = nila.moves.sDown;
    const en0 = l.g.p1.en;
    let tTroca = -1;
    let ticksEmGolpe = 0;
    for (let t = 0; t < 40; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.down = t === 0;
      const ev = l.passo();
      if (tTroca < 0 && ev.some((e) => e.tipo === 'troca-ficha')) tTroca = t;
      if (l.g.p1.state === 'move' && ticksEmGolpe === t) ticksEmGolpe = t + 1;
    }
    expect(tTroca).toBe(g.S);
    expect(ticksEmGolpe).toBe(g.S + g.A + g.R);
    expect(l.g.p1.en).toBeGreaterThanOrEqual(en0); // custo 0 (a energia só regenera)
  });

  it('nome de ficha herdado de Object.prototype não é ficha: trocarFicha lança em vez de entregar uma função', () => {
    const l = pronta();
    for (const nome of ['constructor', 'toString', 'nao-existe']) {
      expect(() => l.g.p1.trocarFicha(nome), nome).toThrow(/ficha desconhecida/);
    }
    expect(l.g.p1.ficha).toBeNull();
    expect(l.g.p1.ch).toBe(nila);
  });

  it('hp e maxHp não mudam na troca; o VADIVU não acerta ninguém (sem caixa de acerto)', () => {
    const l = pronta({ x2: 380 });
    l.g.p1.hp = 70.5;
    const hpRival = l.g.p2.hp;
    const max = l.g.p1.maxHp;
    const ev = vadivu(l);
    expect([l.g.p1.hp, l.g.p1.maxHp, l.g.p1.ficha]).toEqual([70.5, max, 'sarpa']);
    expect(tipos(ev, 'hit')).toHaveLength(0);
    expect(l.g.p2.hp).toBe(hpRival);
  });

  it('cada round recomeça na GAJA (reset volta para a base)', () => {
    const l = pronta();
    vadivu(l);
    expect(l.g.p1.ficha).toBe('sarpa');
    l.g.p2.hp = 0;
    l.g.resolverVidaZerada(l.g.p2, l.g.p1);
    for (let i = 0; i < 600 && l.g.round === 1; i++) l.passo();
    expect(l.g.round).toBe(2);
    expect(l.g.p1.ficha).toBeNull();
    expect(l.g.p1.ch).toBe(nila);
  });

  it('andando 60 ticks, a razão das distâncias é spd(SARPA) / spd(GAJA) = 1,15 / 0,92 (± 1%)', () => {
    const andar = (sarpaAtiva: boolean): number => {
      const l = pronta();
      if (sarpaAtiva) {
        vadivu(l);
        l.passo(10);
      }
      const x0 = l.g.p1.x;
      l.frame.p1.right = true;
      l.passo(60);
      return l.g.p1.x - x0;
    };
    const dG = andar(false);
    const dS = andar(true);
    expect(dG).toBeCloseTo(60 * WALK_SPEED * nila.spd, 0);
    expect(dS / dG).toBeCloseTo(1.15 / 0.92, 1);
    expect(Math.abs(dS / dG / (1.15 / 0.92) - 1)).toBeLessThan(0.01);
  });

  it('SARPA tem os golpes fortes e o pow dela (mods por ficha)', () => {
    expect(nila.moves.hp.dmg).toBe(11);
    expect(sarpa.moves.hp.dmg).toBe(7);
    expect([nila.pow, sarpa.pow]).toEqual([1.18, 0.9]);
    expect(sarpa.id).toBe(nila.id);
  });
});

describe('S5 · BOTE: golpe BAIXO `rente` (hurtbox no 3º nível de altura)', () => {
  const bote: GolpeMontado = sarpa.moves.sFire;

  /** A NILA (já em SARPA) dá o BOTE (ou fica como `postura`) enquanto o orbe do HAYATO cruza. Devolve eventos e a vida dela. */
  function contraOrbe(postura: 'bote' | 'agachada' | 'em-pe') {
    const l = pronta({ x1: 300, x2: 640 });
    l.g.p1.trocarFicha('sarpa');
    const ev: EventoLuta[] = [];
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    for (let t = 0; t < 70; t++) {
      l.frame.p1.sp = postura === 'bote' && t === 0;
      l.frame.p1.down = postura === 'agachada';
      ev.push(...l.passo());
    }
    return { ev, hp: l.g.p1.hp, max: l.g.p1.maxHp };
  }

  it('o BOTE passa por baixo do orbe (nenhum dano); agachada comum ou em pé leva', () => {
    const b = contraOrbe('bote');
    expect(b.hp).toBe(b.max);
    expect(tipos(b.ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 0)).toHaveLength(0);
    for (const postura of ['agachada', 'em-pe'] as const) {
      const r = contraOrbe(postura);
      expect(r.hp, postura).toBeLessThan(r.max);
    }
  });

  it('sem a flag `rente` (mutação de dados) o BOTE leva o orbe', () => {
    const { rente: _r, ...semRente } = NILA.fichas!['sarpa']!.especiais!.sFire;
    void _r;
    const def: LutadorDef = {
      ...NILA,
      fichas: { sarpa: { ...NILA.fichas!['sarpa']!, especiais: { ...NILA.fichas!['sarpa']!.especiais!, sFire: semRente } } },
    };
    const lut = elencoE3({ nila: def });
    const l = pronta({ x1: 300, x2: 640, lut });
    l.g.p1.trocarFicha('sarpa');
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    for (let t = 0; t < 70; t++) {
      l.frame.p1.sp = t === 0;
      l.passo();
    }
    expect(l.g.p1.hp).toBeLessThan(l.g.p1.maxHp);
  });

  it('a hurtbox `rente` tem topo em SH × 0,3 (abaixo do agachado, SH × 0,56) e vale só durante o golpe', () => {
    const base = { x: 300, y: GROUND, state: 'move', baixo: true, noChao: true };
    expect(hurtbox({ ...base, rente: true }).h).toBeCloseTo(SH * 0.3, 6);
    expect(hurtbox({ ...base, rente: false }).h).toBeCloseTo(SH * 0.56, 6);
    const l = pronta();
    l.g.p1.trocarFicha('sarpa');
    // E6a: em pé a SARPA tem a caixa proporcional ao sprite (`alturaEmPe`, 79%), não a de pé da GAJA (e6a-sarpa.test.ts mede a arte).
    const emPe = SH * 0.96 * (sarpa.alturaEmPe as number);
    expect(sarpa.alturaEmPe).toBe(0.79);
    expect(l.g.p1.hurtbox().h).toBeCloseTo(emPe, 6);
    l.frame.p1.sp = true;
    l.passo();
    l.frame.p1.sp = false;
    expect(l.g.p1.hurtbox().h).toBeCloseTo(SH * 0.3, 6);
    l.passo(bote.S + bote.A + bote.R + 5);
    expect(l.g.p1.hurtbox().h).toBeCloseTo(emPe, 6);
  });

  it('é golpe baixo: contra o rival em pé defendendo (block) acerta; contra o agachado defendendo (crouchblock) é bloqueado', () => {
    const lutar = (agachado: boolean): EventoLuta[] => {
      const l = pronta({ x1: 300, x2: 420 });
      l.g.p1.trocarFicha('sarpa');
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 50; t++) {
        l.frame.p1.sp = t === 0;
        l.frame.p2.right = true; // o "trás" do P2 (a NILA está à esquerda)
        l.frame.p2.down = agachado;
        ev.push(...l.passo());
      }
      return ev;
    };
    const emPe = lutar(false);
    expect(tipos(emPe, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 1).length).toBeGreaterThan(0);
    expect(tipos(emPe, 'block')).toHaveLength(0);
    const agachado = lutar(true);
    expect(tipos(agachado, 'block').length).toBeGreaterThan(0);
  });
});

describe('S5 · GOLPE MARMA: atordoamento longo, sem derrubar', () => {
  it('o atordoamento medido no acerto é exatamente `hs`, o rival não cai e o dano é o do golpe', () => {
    const marma = nila.moves.sFire;
    const l = pronta({ x1: 400, x2: 478 });
    const hp0 = l.g.p2.hp;
    let stun = NaN;
    let estado = '';
    for (let t = 0; t < 30 && Number.isNaN(stun); t++) {
      l.frame.p1.sp = t === 0;
      const ev = l.passo();
      if (ev.some((e) => e.tipo === 'hit')) {
        stun = l.g.p2.stun;
        estado = l.g.p2.state;
      }
    }
    expect(stun).toBe(marma.hs);
    expect(marma.hs).toBeGreaterThan(40);
    expect(estado).toBe('hit');
    expect(hp0 - l.g.p2.hp).toBeCloseTo(marma.dmg! * nila.pow, 4);
  });
});

describe('S5 · poseDaFicha: a ficha troca a pose pelo quadro dela, se a arte existe', () => {
  const quadro = (x: number) => ({ x, y: 0, w: 100, h: 200, ax: 50 });
  const comArte: Poses = { ...posesWei(), sarpaIdle0: quadro(7777), sarpaSlide1: quadro(8888) };

  it('com o quadro no atlas: a SARPA devolve sarpaIdle0 para idle0 (mesmo existindo idle0) e a GAJA continua com o idle0', () => {
    const m = montarLutador(NILA, comArte);
    expect(getPD(m.fichas['sarpa']!, 'idle0').x).toBe(7777);
    expect(getPD(m, 'idle0').x).toBe(comArte['idle0']!.x);
    expect(getPD(m.fichas['sarpa']!, 'sweep').x).toBe(8888); // o BOTE (quadro ativo do ESP)
  });

  it('sem o quadro (atlas provisório): a SARPA cai na cadeia de sempre e não lança', () => {
    const m = montarLutador(NILA, posesWei());
    expect(getPD(m.fichas['sarpa']!, 'idle0')).toBe(getPD(m, 'idle0'));
    expect(getPD(m.fichas['sarpa']!, 'sweep')).toBe(getPD(m, 'sweep'));
  });
});

describe('S5 · montagem recusa troca de ficha sem destino', () => {
  const comVadivu = (troca: GolpeMontado['troca'] | undefined, tipo: GolpeMontado['type'] = 'troca'): LutadorDef => {
    const { troca: _t, ...resto } = NILA.especiais.sDown;
    void _t;
    return { ...NILA, especiais: { ...NILA.especiais, sDown: { ...resto, type: tipo, ...(troca ? { troca } : {}) } } };
  };

  it('para ficha que não existe, type troca sem troca e troca em type errado falham alto no boot; para null e para a ficha real, não', () => {
    expect(() => montarFixtura(comVadivu({ ficha: 'nao-existe' }))).toThrow(/ficha desconhecida 'nao-existe'/);
    expect(() => montarFixtura(comVadivu(undefined))).toThrow(/sem troca/);
    expect(() => montarFixtura(comVadivu({ ficha: 'sarpa' }, 'melee'))).toThrow(/troca só vale/);
    expect(() => montarFixtura(comVadivu({ ficha: null }))).not.toThrow();
    expect(() => montarFixtura(comVadivu({ ficha: 'sarpa' }))).not.toThrow();
  });

  it('o VADIVU da SARPA também é conferido (aponta para a base ou para uma ficha existente)', () => {
    const sarpaRuim: LutadorDef = {
      ...NILA,
      fichas: {
        sarpa: {
          ...NILA.fichas!['sarpa']!,
          especiais: { ...NILA.fichas!['sarpa']!.especiais!, sDown: { ...NILA.fichas!['sarpa']!.especiais!.sDown, troca: { ficha: 'fantasma' } } },
        },
      },
    };
    expect(() => montarFixtura(sarpaRuim)).toThrow(/fantasma/);
    // e as fichas do lutador valem também dentro da ficha: a SARPA pode apontar para 'sarpa' (ficha que existe)
    const sarpaValida: LutadorDef = {
      ...sarpaRuim,
      fichas: {
        sarpa: {
          ...sarpaRuim.fichas!['sarpa']!,
          especiais: { ...sarpaRuim.fichas!['sarpa']!.especiais!, sDown: { ...sarpaRuim.fichas!['sarpa']!.especiais!.sDown, troca: { ficha: 'sarpa' } } },
        },
      },
    };
    expect(() => montarFixtura(sarpaValida)).not.toThrow();
  });
});

describe('S5 · dica de troca da CPU', () => {
  it('as dicas montadas: GAJA = MARMA pressão + VADIVU troca; SARPA = BOTE pressão + VADIVU troca', () => {
    expect(nila.dicasIa.map((d) => `${d.golpe}:${d.dica.papel}`)).toEqual(['sFire:pressao', 'sDown:troca']);
    expect(sarpa.dicasIa.map((d) => `${d.golpe}:${d.dica.papel}`)).toEqual(['sFire:pressao', 'sDown:troca']);
  });

  /** De 600 decisões da CPU nível 2 (NILA, P1) com o rival a `dist` px, quantas apertam ↓+ESP (o VADIVU). */
  function decisoesDeTroca(ficha: string | null, dist: number, lut = elenco): number {
    let n = 0;
    for (let semente = 1; semente <= 600; semente++) {
      const l = pronta({ x1: 300, x2: 300 + dist, lut });
      l.g.p1.cpu = 2;
      l.g.p1.trocarFicha(ficha);
      const inp = cpuInput(l.g.p1, l.g.p2, l.g, criarRng(semente));
      if (inp.sp && inp.down) n++;
    }
    return n;
  }

  it('troca só quando a ficha atual não é a preferida para a distância (≈ aggr × 0,3 das decisões); na ficha certa não gasta RNG', () => {
    const longeNaGaja = decisoesDeTroca(null, 400); // longe → SARPA preferida
    expect(longeNaGaja).toBeGreaterThan(100);
    expect(longeNaGaja).toBeLessThan(260);
    const pertoNaSarpa = decisoesDeTroca('sarpa', 100); // perto → GAJA preferida
    expect(pertoNaSarpa).toBeGreaterThan(100);
    expect(decisoesDeTroca(null, 100)).toBe(0); // perto na GAJA: certa
    expect(decisoesDeTroca('sarpa', 400)).toBe(0); // longe na SARPA: certa
  });

  it('sem a dica no def (mutação de dados) a CPU nunca troca de ficha', () => {
    const { ia: _a, ...semIaGaja } = NILA.especiais.sDown;
    const sf = NILA.fichas!['sarpa']!;
    const { ia: _b, ...semIaSarpa } = sf.especiais!.sDown;
    void _a;
    void _b;
    const def: LutadorDef = {
      ...NILA,
      especiais: { ...NILA.especiais, sDown: semIaGaja },
      fichas: { sarpa: { ...sf, especiais: { ...sf.especiais!, sDown: semIaSarpa } } },
    };
    const lut = elencoE3({ nila: def });
    expect(decisoesDeTroca(null, 400, lut)).toBe(0);
  });

  it('CPU x CPU: a NILA troca de ficha nas duas direções, sem nunca ficar em ficha inválida', () => {
    const l = criarLuta({ mode: 'versus', c1: ID_NILA, c2: 'hayato', p1cpu: 2, cpu: 2 }, elenco, criarRng(4));
    ateALuta(l);
    const fichas = new Set<string | null>();
    let trocas = 0;
    for (let i = 0; i < 6000; i++) {
      l.g.p1.en = 100;
      l.g.p1.hp = Math.max(l.g.p1.hp, 60);
      l.g.p2.hp = Math.max(l.g.p2.hp, 60);
      trocas += tipos(l.passo(), 'troca-ficha').length;
      fichas.add(l.g.p1.ficha);
      if (l.g.phase !== 'fight') ateALuta(l);
    }
    expect(trocas).toBeGreaterThan(2);
    expect([...fichas].sort()).toEqual([null, 'sarpa']);
  });
});
