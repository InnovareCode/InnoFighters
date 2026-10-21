import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { CAMILLE } from '../../src/data/lutadores';
import type { LutadorMontado } from '../../src/data/montar';
import type { GolpeMontado, LutadorDef } from '../../src/data/tipos';
import { cpuInput } from '../../src/fight/cpu';
import { ID_CAMILLE, ateALuta, criarLuta, elencoE3, montarFixtura, tipos, type Luta } from './_kit-e3';

/*
 * E3 · S4 — CAMILLE em dados + motor (docs/mecanicas-e3.md §2.3): PARADE (`aparar` + `sResp`), COUP D'ARRÊT (`contra`) e
 * REVERS (`through`, cruzando de verdade). A CAMILLE é só definição de teste sobre o atlas do WEI LONG (arte na E5).
 */

const elenco = elencoE3();
const camille = elenco[ID_CAMILLE];
const parade: GolpeMontado = camille.moves.sFire;
const coup: GolpeMontado = camille.moves.sDown;
const revers: GolpeMontado = camille.moves.sFwd;
const resp = camille.moves.sResp;
const POW = camille.pow;
const hayato = elenco.hayato;

function pronta(opts: { x1?: number; x2?: number; lut?: Record<IdLutador, LutadorMontado> } = {}): Luta {
  const l = criarLuta({ mode: 'versus', c1: ID_CAMILLE, c2: 'hayato' }, opts.lut ?? elenco);
  ateALuta(l);
  l.g.p1.x = opts.x1 ?? 400;
  l.g.p2.x = opts.x2 ?? 470;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  return l;
}

type Ataque = 'lp' | 'hp' | 'hk' | 'clk' | 'jhk' | 'throw';

/**
 * A CAMILLE aperta ESP (PARADE) no tick 0. O P2 aperta `ataque` no tick `t0` (o golpe dele fica ativo mais tarde):
 * jhk pula antes e bate no ar. Devolve os eventos de `ticks` ticks e a luta.
 */
function parar(ataque: Ataque, t0: number, ticks = 60): { l: Luta; ev: EventoLuta[]; hpCamille0: number; hpRival0: number } {
  const l = pronta();
  const ev: EventoLuta[] = [];
  const hpCamille0 = l.g.p1.hp;
  const hpRival0 = l.g.p2.hp;
  for (let t = Math.min(0, t0); t < ticks; t++) {
    l.frame.p1.sp = t === 0;
    l.frame.p2.lp = l.frame.p2.hp = l.frame.p2.hk = l.frame.p2.down = l.frame.p2.right = l.frame.p2.up = false;
    if (t === t0) {
      if (ataque === 'clk') {
        l.frame.p2.down = true;
        l.frame.p2.lk = true;
      } else if (ataque === 'throw') {
        l.frame.p2.hp = true;
        l.frame.p2.left = true; // o P2 está à direita: "para a frente" é a esquerda
      } else if (ataque === 'jhk') l.frame.p2.up = true;
      else l.frame.p2[ataque] = true;
    }
    if (ataque === 'jhk' && t === t0 + 6) l.frame.p2.hk = true;
    else if (ataque === 'jhk') l.frame.p2.hk = false;
    if (ataque === 'clk' && t !== t0) l.frame.p2.lk = false;
    if (t >= 0 || t0 < 0) ev.push(...l.passo());
    else ev.push(...l.passo());
  }
  return { l, ev, hpCamille0, hpRival0 };
}

describe('S4 · PARADE: anula golpe corpo a corpo mid/over na janela ativa e responde', () => {
  it.each<[Ataque, number]>([
    ['lp', 5],
    ['hp', 3],
    ['hk', 1],
  ])('contra %s dentro da janela: a vida dela não muda, sai 1 parry e o atacante apanha do fouetté', (ataque, t0) => {
    const { l, ev, hpCamille0, hpRival0 } = parar(ataque, t0);
    expect(tipos(ev, 'parry')).toHaveLength(1);
    expect(l.g.p1.hp).toBe(hpCamille0);
    expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 0)).toHaveLength(0);
    // o fouetté acerta o atacante em <= 20 ticks do parry e tira dmg × pow (atacante em `hit`: sem contragolpe, sem combo)
    const hits = ev.filter((e): e is Extract<EventoLuta, { tipo: 'hit' }> => e.tipo === 'hit' && e.defensor === 1);
    expect(hits).toHaveLength(1);
    expect(l.g.p2.hp).toBeCloseTo(hpRival0 - resp.dmg! * POW, 4);
  });

  it('o parry põe o atacante em hit (atordoaAtacante), anula o golpe dele e a CAMILLE entra no sResp', () => {
    const l = pronta();
    let tParry = -1;
    for (let t = 0; t < 40 && tParry < 0; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p2.lp = t === 3;
      if (tipos(l.passo(), 'parry').length) tParry = t;
    }
    expect(tParry).toBeGreaterThan(0);
    expect(l.g.p1.move).toBe('sResp');
    expect(l.g.p2.state).toBe('hit');
    expect(l.g.p2.move).toBeNull();
    expect(l.g.p2.stun).toBeGreaterThan(parade.parry!.atordoaAtacante - 3);
    expect(l.g.hitstop).toBeGreaterThan(0);
  });

  it('o sResp acerta em até 20 ticks do parry', () => {
    const l = pronta();
    let tParry = -1;
    let tResp = -1;
    for (let t = 0; t < 60 && tResp < 0; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p2.hp = t === 3;
      const ev = l.passo();
      if (tParry < 0 && tipos(ev, 'parry').length) tParry = t;
      if (tParry >= 0 && ev.some((e) => e.tipo === 'hit' && e.defensor === 1)) tResp = t;
    }
    expect(tResp).toBeGreaterThan(tParry);
    expect(tResp - tParry).toBeLessThanOrEqual(20);
  });

  it('golpe BAIXO (clk), agarrão e projétil NÃO são parados: ela leva o golpe e não há parry', () => {
    const baixo = parar('clk', 1);
    expect(tipos(baixo.ev, 'parry')).toHaveLength(0);
    expect(baixo.l.g.p1.hp).toBeLessThan(baixo.hpCamille0);

    const agarrao = parar('throw', 2);
    expect(tipos(agarrao.ev, 'parry')).toHaveLength(0);
    expect(tipos(agarrao.ev, 'throw').length).toBeGreaterThan(0);
    expect(agarrao.l.g.p1.hp).toBeLessThan(agarrao.hpCamille0);

    const l = pronta({ x2: 800 });
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 30; t++) {
      l.frame.p1.sp = t === 0;
      if (t === 4) {
        l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
        const pr = l.g.projectiles[0]!;
        pr.x = l.g.p1.x + 30; // na cara dela, em plena janela
        pr.y = l.g.p1.y - 120;
      }
      ev.push(...l.passo());
    }
    expect(tipos(ev, 'parry')).toHaveLength(0);
    const hp = ev.filter((e) => e.tipo === 'hit' && e.defensor === 0);
    expect(hp).toHaveLength(1);
    expect(l.g.p1.hp).toBeLessThan(l.g.p1.maxHp);
  });

  it('golpe FORA da janela (antes de S ou depois de S + A): ela leva o golpe', () => {
    // antes de S: o lp do P2 fica ativo no tick 1 (ele começou 2 ticks antes); a PARADE ainda está na preparação (S = 3)
    const antes = parar('lp', -2);
    expect(tipos(antes.ev, 'parry')).toHaveLength(0);
    expect(antes.l.g.p1.hp).toBeLessThan(antes.hpCamille0);
    // depois de S + A: lp começado no tick 20 fica ativo no tick 23 (> S + A = 21)
    const depois = parar('lp', 20);
    expect(tipos(depois.ev, 'parry')).toHaveLength(0);
    expect(depois.l.g.p1.hp).toBeLessThan(depois.hpCamille0);
  });

  it('a janela é exatamente [S, S + A): o parry vale no último tick dentro e não vale no primeiro tick fora', () => {
    const { S, A } = parade;
    const tenta = (tickDoAcerto: number): number => {
      // lp do P2 tem S = 3: apertado em tickDoAcerto − 3 fica ativo (mt = S) em tickDoAcerto
      const r = parar('lp', tickDoAcerto - hayato.moves.lp.S);
      return tipos(r.ev, 'parry').length;
    };
    expect(tenta(S)).toBe(1);
    expect(tenta(S + A - 1)).toBe(1);
    expect(tenta(S + A)).toBe(0); // [S, S + A): o tick S + A já está fora
    expect(tenta(S + A + 1)).toBe(0);
  });

  it('jhk (golpe no ar, over): também é parado', () => {
    const { ev, l, hpCamille0 } = parar('jhk', 0, 80);
    // o chute no ar (over) chega à janela dela (medido: parry ~ 5 ticks depois do aperto do chute) e é anulado
    expect(tipos(ev, 'parry')).toHaveLength(1);
    expect(l.g.p1.hp).toBe(hpCamille0);
    expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 0)).toHaveLength(0);
  });

  it('dado: niveis [mid] (sem over) deixa de parar golpe over; sem sResp a montagem falha alto', () => {
    const so_mid: LutadorDef = {
      ...CAMILLE,
      especiais: { ...CAMILLE.especiais, sFire: { ...CAMILLE.especiais.sFire, parry: { niveis: ['low'], atordoaAtacante: 30 } } },
    };
    const r = parar('lp', 5);
    expect(tipos(r.ev, 'parry')).toHaveLength(1);
    const lut = elencoE3({ camille: so_mid });
    const l = criarLuta({ mode: 'versus', c1: ID_CAMILLE, c2: 'hayato' }, lut);
    ateALuta(l);
    l.g.p1.x = 400;
    l.g.p2.x = 470;
    l.g.p1.en = 100;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 40; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p2.lp = t === 5;
      ev.push(...l.passo());
    }
    expect(tipos(ev, 'parry')).toHaveLength(0);
    const { extras: _e, ...semResp } = CAMILLE;
    void _e;
    expect(() => montarFixtura(semResp)).toThrow(/sResp/);
  });
});

describe("S4 · COUP D'ARRÊT: contragolpe reforçado na PREPARAÇÃO do rival", () => {
  /**
   * A CAMILLE aperta ↓+ESP no tick 0 (ativa em mt = S). O rival (HAYATO) aperta o hk no tick `t0` (mt dele = tick − t0).
   * Devolve o dano medido (vida perdida no primeiro `hit` dela), o evento e o atordoamento logo depois.
   */
  function coupContra(t0: number | null) {
    const l = pronta({ x1: 400, x2: 478 });
    l.g.p1.invuln = 500; // o hk do rival não pode acertá-la antes: o que se mede é o chassé dela
    const hp0 = l.g.p2.hp;
    let ev: Extract<EventoLuta, { tipo: 'hit' }> | null = null;
    let dano = NaN;
    let stun = NaN;
    for (let t = Math.min(0, t0 ?? 0); t < 30 && !ev; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.down = t === 0;
      l.frame.p2.hk = t === t0;
      const e = l.passo().find((x): x is Extract<EventoLuta, { tipo: 'hit' }> => x.tipo === 'hit' && x.atacante === 0);
      if (e) {
        ev = e;
        dano = hp0 - l.g.p2.hp;
        stun = l.g.p2.stun;
      }
    }
    return { ev, dano, stun };
  }

  it('na preparação do rival: dano = dmg × pow × 1,5, contraEspecial e atordoamento + contra.hs', () => {
    const r = coupContra(0); // o hk do rival está em mt = 6 (< S = 9) quando o chassé fica ativo
    expect(r.ev).not.toBeNull();
    expect(r.ev!.contragolpe).toBe(true);
    expect(r.ev!.contraEspecial).toBe(true);
    expect(r.ev!.texto?.s).toContain('ARR');
    expect(r.dano).toBeCloseTo(coup.dmg! * POW * coup.contra!.mult, 4);
    expect(r.stun).toBe(coup.hs! + coup.contra!.hs);
  });

  it('na recuperação do rival: contragolpe normal (× 1,15), sem contraEspecial e atordoamento normal', () => {
    const r = coupContra(-14); // hk do rival em mt = 14 no tick 0 e 20 quando o chassé fica ativo (S + A = 14 < 20 < S + A + R)
    expect(r.ev).not.toBeNull();
    expect(r.ev!.contragolpe).toBe(true);
    expect(r.ev!.contraEspecial).toBeUndefined();
    expect(r.dano).toBeCloseTo(coup.dmg! * POW * 1.15, 4);
    expect(r.stun).toBe(coup.hs);
  });

  it('com o rival parado: dano × 1 e sem contragolpe', () => {
    const r = coupContra(null);
    expect(r.ev).not.toBeNull();
    expect(r.ev!.contragolpe).toBe(false);
    expect(r.ev!.contraEspecial).toBeUndefined();
    expect(r.dano).toBeCloseTo(coup.dmg! * POW, 4);
    expect(r.stun).toBe(coup.hs);
  });

  it('um golpe SEM `contra` na preparação do rival continua dando só o × 1,15 de sempre (o reforço é do golpe, não do rival)', () => {
    const l = pronta({ x1: 400, x2: 478 });
    const hp0 = l.g.p2.hp;
    let dano = NaN;
    let contraEspecial: boolean | undefined = true;
    let texto = '';
    for (let t = 0; t < 30 && Number.isNaN(dano); t++) {
      l.frame.p1.lk = t === 0;
      l.frame.p2.hk = t === 0;
      const e = l.passo().find((x): x is Extract<EventoLuta, { tipo: 'hit' }> => x.tipo === 'hit' && x.atacante === 0);
      if (e) {
        dano = hp0 - l.g.p2.hp;
        contraEspecial = e.contraEspecial;
        texto = e.texto?.s ?? '';
      }
    }
    expect(texto).toBe('COUNTER!');
    expect(dano).toBeCloseTo(camille.moves.lk.dmg! * POW * 1.15, 4);
    expect(contraEspecial).toBeUndefined(); // sem `contra` no golpe, nada de texto/efeito de COUP D'ARRÊT
  });
});

describe('S4 · REVERS: cruza para o outro lado (through) e acerta pelas costas', () => {
  const { S, A } = revers;

  /** CAMILLE a 100 px à esquerda do rival; →+ESP no tick 0. `trás` = tecla que o rival segura o tempo todo (ou nenhuma). */
  function reverter(tras: 'left' | 'right' | null, lut = elenco) {
    const l = pronta({ x1: 400, x2: 500, lut });
    l.frame.p2.down = tras !== null; // agachado e segurando: o rival fica no lugar (em pé ele andaria para o lado que segura)
    const sinais: number[] = [];
    const facing: number[] = [];
    const ev: EventoLuta[] = [];
    const porTick: EventoLuta[][] = [];
    for (let t = 0; t < 70; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      if (tras) l.frame.p2[tras] = true;
      const e = l.passo();
      porTick.push(e);
      ev.push(...e);
      sinais.push(Math.sign(l.g.p1.x - l.g.p2.x));
      facing.push(l.g.p1.facing);
    }
    return { l, sinais, facing, ev, porTick };
  }

  it('o sinal de (x_camille − x_rival) inverte até S + A + 4 e o facing dela acompanha', () => {
    const r = reverter(null);
    expect(r.sinais[0]).toBe(-1);
    const tCruza = r.sinais.findIndex((s) => s > 0);
    expect(tCruza).toBeGreaterThan(S);
    expect(tCruza).toBeLessThanOrEqual(S + A + 4);
    expect(r.facing[tCruza - 1]).toBe(1);
    expect(r.facing[tCruza + 1]).toBe(-1); // o facing vira no tick seguinte ao do sinal (a checagem vem antes do movimento)
  });

  it('não acerta ANTES de cruzar: o primeiro hit vem depois do tick do cruzamento', () => {
    const r = reverter(null);
    const tCruza = r.sinais.findIndex((s) => s > 0);
    const tHit = r.porTick.findIndex((e) => e.some((x) => x.tipo === 'hit'));
    expect(tHit).toBeGreaterThan(tCruza);
    expect(r.l.g.p2.hp).toBeLessThan(r.l.g.p2.maxHp);
  });

  it('o defensor que segura o "trás" do lado ANTIGO (direita) leva o golpe; o que segura o "trás" NOVO (esquerda) bloqueia', () => {
    const antigo = reverter('right');
    expect(tipos(antigo.ev, 'hit').filter((e) => e.tipo === 'hit' && e.atacante === 0).length).toBeGreaterThan(0);
    expect(tipos(antigo.ev, 'block')).toHaveLength(0);

    const novo = reverter('left');
    expect(tipos(novo.ev, 'block').length).toBeGreaterThan(0);
    expect(tipos(novo.ev, 'hit').filter((e) => e.tipo === 'hit' && e.atacante === 0)).toHaveLength(0);
  });

  it('sem `through` (mutação de dados) ela é empurrada pelo rival e não cruza', () => {
    const { through: _t, ...semThrough } = CAMILLE.especiais.sFwd;
    void _t;
    const lut = elencoE3({ camille: { ...CAMILLE, especiais: { ...CAMILLE.especiais, sFwd: semThrough } } });
    const r = reverter(null, lut);
    expect(r.sinais.every((s) => s <= 0)).toBe(true);
  });

  it('o REVERS acertado (rival cruzado) depois de bater não prende ninguém: ao fim do golpe ela volta a ficar livre', () => {
    const r = reverter(null);
    expect(r.l.g.p1.state).not.toBe('move');
    expect(r.l.g.p1.y).toBe(GROUND);
  });
});

describe('S4 · montagem recusa dados inválidos', () => {
  const comParade = (parry: Partial<NonNullable<GolpeMontado['parry']>> | null): LutadorDef => {
    const { parry: _p, ...resto } = CAMILLE.especiais.sFire;
    void _p;
    return {
      ...CAMILLE,
      especiais: { ...CAMILLE.especiais, sFire: parry === null ? resto : { ...resto, parry: { ...CAMILLE.especiais.sFire.parry!, ...parry } } },
    };
  };

  it('type aparar sem parry, niveis vazio, atordoaAtacante 0 e contra < 1 falham alto', () => {
    expect(() => montarFixtura(comParade(null))).toThrow(/aparar/);
    expect(() => montarFixtura(comParade({ niveis: [] }))).toThrow(/parry inválido/);
    expect(() => montarFixtura(comParade({ atordoaAtacante: 0 }))).toThrow(/parry inválido/);
    const contraRuim: LutadorDef = {
      ...CAMILLE,
      especiais: { ...CAMILLE.especiais, sDown: { ...CAMILLE.especiais.sDown, contra: { mult: 0.5, hs: 0 } } },
    };
    expect(() => montarFixtura(contraRuim)).toThrow(/contra inválido/);
    expect(() => montarFixtura(comParade({}))).not.toThrow();
  });
});

describe('S4 · dicas de CPU da CAMILLE', () => {
  it('as dicas montadas: PARADE defesa, COUP D\'ARRÊT pressão', () => {
    expect(camille.dicasIa.map((d) => `${d.golpe}:${d.dica.papel}`)).toEqual(['sFire:defesa', 'sDown:pressao']);
  });

  /**
   * Quantas de 600 decisões da CPU nível 2 (CAMILLE) diante de um golpe do rival recém-começado apertam a PARADE (só ESP,
   * sem ↓ nem direção: a reação sai no mesmo tick quando o golpe dele ainda demora) em vez de segurar o bloqueio (`ai.hold`).
   */
  function reacoes(golpeDoRival: 'hk' | 'clk' | 'throw', dist: number, lut = elenco): { parada: number; bloqueio: number } {
    let parada = 0;
    let bloqueio = 0;
    for (let semente = 1; semente <= 600; semente++) {
      const l = pronta({ x1: 400, x2: 400 + dist, lut });
      const { p1, p2 } = l.g;
      p1.cpu = 2;
      p2.startMove(golpeDoRival, l.g);
      p2.mt = 1;
      const inp = cpuInput(p1, p2, l.g, criarRng(semente));
      if (inp.sp && !inp.down && !inp.left && !inp.right) parada++;
      else if (p1.ai.hold > 0) bloqueio++;
    }
    return { parada, bloqueio };
  }

  it('contra golpe mid/over a CPU usa a PARADE no lugar do bloqueio (mesma chance de defender)', () => {
    const r = reacoes('hk', 100);
    expect(r.parada).toBeGreaterThan(300);
    expect(r.bloqueio).toBe(0);
  });

  it('contra golpe baixo, agarrão ou de longe (>= 190 px) a CPU bloqueia como sempre', () => {
    for (const [golpe, dist] of [['clk', 100], ['throw', 100], ['hk', 250]] as const) {
      const r = reacoes(golpe, dist);
      expect(r.parada, `${golpe}@${dist}`).toBe(0);
      expect(r.bloqueio, `${golpe}@${dist}`).toBeGreaterThan(200);
    }
  });

  it('sem a dica no def (mutação de dados) a CPU não usa a PARADE', () => {
    const { ia: _ia, ...semIa } = CAMILLE.especiais.sFire;
    void _ia;
    const lut = elencoE3({ camille: { ...CAMILLE, especiais: { ...CAMILLE.especiais, sFire: semIa } } });
    // sobra só o ESP do fluxo genérico (≈ 1% das decisões), longe das > 300 com a dica
    expect(reacoes('hk', 100, lut).parada).toBeLessThan(40);
  });

  it('CPU x CPU: a CAMILLE aparou golpes de verdade (parry) e o COUP D\'ARRÊT saiu só por dentro do alcance da dica', () => {
    const l = criarLuta({ mode: 'versus', c1: ID_CAMILLE, c2: 'hayato', p1cpu: 2, cpu: 2 }, elenco, criarRng(9));
    ateALuta(l);
    let parries = 0;
    const coupDist: number[] = [];
    let anterior: string | null = null;
    for (let i = 0; i < 6000; i++) {
      l.g.p1.en = 100;
      l.g.p2.en = 100;
      l.g.p1.hp = Math.max(l.g.p1.hp, 60);
      l.g.p2.hp = Math.max(l.g.p2.hp, 60);
      const dist = Math.abs(l.g.p1.x - l.g.p2.x);
      parries += tipos(l.passo(), 'parry').length;
      const p = l.g.p1;
      if (p.state === 'move' && p.move === 'sDown' && anterior !== 'sDown') coupDist.push(dist);
      anterior = p.state === 'move' ? p.move : null;
      if (l.g.phase !== 'fight') ateALuta(l);
    }
    expect(parries).toBeGreaterThan(0);
    for (const d of coupDist) expect(d).toBeGreaterThanOrEqual(60 - 8);
  });
});
