import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { BAATAR, HAYATO, MERGULHO_DA_AGUIA } from '../../src/data/lutadores';
import type { LutadorMontado } from '../../src/data/montar';
import type { GolpeMontado, LutadorDef, NomeGolpe } from '../../src/data/tipos';
import { ABRACO_DA_ESTEPE, BAATAR_COM_ABRACO } from './_baatar-chefe';
import { ID_BAATAR, ateALuta, criarLuta, elencoE3, montarFixtura, tipos, type Luta } from './_kit-e3';

/*
 * E3 · S1b — kit do BAATAR em dados + motor (docs/mecanicas-e3.md §2.5): armadura por rank, agarrão com alcance/janela,
 * salto com alvo (vxAlvo) e as dicas de CPU. O BAATAR é montado sobre o atlas do WEI LONG (arte própria nos testes de E5).
 * Ele agora é lutador NORMAL (→+ESP = MERGULHO); a mecânica do ABRAÇO DA ESTEPE (rush + agarrão em janela), que saiu do kit dele,
 * é testada sobre `BAATAR_COM_ABRACO` (tests/unit/_baatar-chefe.ts).
 */

const elenco = elencoE3();
const baatar = elenco[ID_BAATAR];
const elencoAbraco = elencoE3({ baatar: BAATAR_COM_ABRACO });
const { armadura: _armadura, ...semArmadura } = BAATAR_COM_ABRACO;
void _armadura;

function pronta(opts: { c1?: IdLutador; lut?: Record<IdLutador, LutadorMontado>; x1?: number; x2?: number } = {}): Luta {
  const l = criarLuta({ mode: 'versus', c1: opts.c1 ?? ID_BAATAR, c2: 'hayato' }, opts.lut ?? elenco);
  ateALuta(l);
  l.g.p1.x = opts.x1 ?? 400;
  l.g.p2.x = opts.x2 ?? 480;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  return l;
}

describe('S1b · armadura por rank (PESO DA MONTANHA)', () => {
  type Troca = { tipo: EventoLuta['tipo'] | null; estado: string; golpe: string | null; projetil?: boolean | undefined };

  /**
   * O BAATAR começa o `hp` no tick 0 (armadura nos 13 primeiros ticks). O P2 aperta `golpe` no tick `inicioP2`
   * (negativo = antes, para o golpe dele estar ativo enquanto o BAATAR ainda está na preparação). Devolve o primeiro
   * evento `armor`/`hit` contra o BAATAR e o estado dele no mesmo tick.
   */
  function trocar(golpe: 'lp' | 'hk' | 'chk' | 'proj', inicioP2: number, lut = elenco): Troca {
    const l = pronta({ lut });
    const aperta = (): void => {
      if (golpe === 'proj') l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
      else {
        if (golpe === 'chk') l.frame.p2.down = true;
        l.frame.p2[golpe === 'chk' ? 'hk' : golpe] = true;
      }
    };
    for (let t = Math.min(0, inicioP2); t < 40; t++) {
      l.frame.p1.hp = t === 0;
      l.frame.p2.lp = l.frame.p2.hk = l.frame.p2.down = false;
      if (t === inicioP2) aperta();
      const ev = l.passo();
      const e = ev.find((x) => (x.tipo === 'armor' || x.tipo === 'hit') && x.defensor === 0);
      if (e) return { tipo: e.tipo, estado: l.g.p1.state, golpe: l.g.p1.move, projetil: e.tipo === 'hit' ? e.projetil : undefined };
    }
    return { tipo: null, estado: l.g.p1.state, golpe: l.g.p1.move };
  }

  it('soco/chute fraco (rank <= 2) durante o hp: evento armor e o golpe segue', () => {
    const r = trocar('lp', 2);
    expect(r.tipo).toBe('armor');
    expect(r.estado).toBe('move');
    expect(r.golpe).toBe('hp');
  });

  it('chute forte, golpe baixo forte e projétil (rank > 2 ou sem rank) interrompem', () => {
    for (const g of ['hk', 'chk'] as const) {
      const r = trocar(g, -3);
      expect(r.tipo, g).toBe('hit');
      expect(r.estado, g).not.toBe('move');
    }
    const p = trocar('proj', 0);
    expect(p.tipo).toBe('hit');
    expect(p.projetil).toBe(true);
    expect(p.estado).not.toBe('move');
  });

  it('sem `armadura` no def, qualquer golpe é absorvido (a regra do WEI LONG não mudou)', () => {
    const lut = elencoE3({ baatar: semArmadura });
    expect(trocar('hk', -3, lut).tipo).toBe('armor');
    expect(trocar('chk', -3, lut).tipo).toBe('armor');
  });

  it('o WEI LONG (armor no TIE SHAN KAO, sem armadura no def) absorve também o golpe forte', () => {
    expect(elenco['wei-long'].armadura).toBeUndefined();
    const l = criarLuta({ mode: 'versus', c1: 'wei-long', c2: 'hayato' }, elenco);
    ateALuta(l);
    l.g.p1.x = 400;
    l.g.p2.x = 480;
    l.g.p1.en = 100;
    l.frame.p2.hk = true;
    l.passo();
    l.frame.p2.hk = false;
    l.frame.p1.right = true;
    l.frame.p1.sp = true; // TIE SHAN KAO: S 10, armadura 20 ticks
    const ev: EventoLuta[] = [];
    for (let i = 0; i < 20; i++) {
      ev.push(...l.passo());
      l.frame.p1.sp = false;
    }
    expect(tipos(ev, 'armor').length).toBeGreaterThan(0);
  });
});

describe('S1b · agarrão: alcance, dano e janela', () => {
  /** P2 encostado na parede direita (x ≈ 900) segurando "para trás": o alcance não muda por ele andar. */
  function arremesso(distancia: number, bloqueando = false): { l: Luta; ev: EventoLuta[]; ticksEmMove: number } {
    const l = pronta({ x1: 890 - distancia, x2: 890 });
    l.frame.p2.right = bloqueando;
    l.frame.p1.sp = true; // ESP = ARREMESSO DO AVARGA
    const ev: EventoLuta[] = [];
    let ticksEmMove = 0;
    for (let i = 0; i < 90; i++) {
      const antes = l.g.tick;
      ev.push(...l.passo());
      l.frame.p1.sp = false;
      const andou = l.g.tick !== antes; // o hitstop do acerto congela a luta: não conta como tempo de recuperação
      if (l.g.p1.state === 'move') {
        if (andou) ticksEmMove++;
      } else if (ticksEmMove > 0) break;
    }
    return { l, ev, ticksEmMove };
  }

  it('ARREMESSO: a 150 px agarra, derruba e tira agarrao.dmg × pow; a 170 px erra', () => {
    const acerta = arremesso(150);
    expect(tipos(acerta.ev, 'throw')).toHaveLength(1);
    expect(acerta.l.g.p2.hp).toBeCloseTo(100 - 22 * baatar.pow, 6);
    expect(acerta.l.g.p2.state).toBe('down');
    const erra = arremesso(170);
    expect(tipos(erra.ev, 'throw')).toHaveLength(0);
    expect(erra.l.g.p2.hp).toBe(100);
  });

  it('ARREMESSO errado: a recuperação mede S + A + R ticks sem poder agir (acertando, também)', () => {
    const mv = baatar.moves.sFire;
    const total = mv.S + mv.A + mv.R;
    expect(total).toBe(53);
    expect(arremesso(170).ticksEmMove).toBe(total);
    expect(arremesso(150).ticksEmMove).toBe(total);
  });

  it('o agarrão não se bloqueia: contra o rival segurando "para trás" agarra igual', () => {
    const r = arremesso(140, true);
    expect(tipos(r.ev, 'throw')).toHaveLength(1);
    expect(tipos(r.ev, 'block')).toHaveLength(0);
  });

  it('sem agarrao no golpe, o arremesso normal segue com alcance 108 e dano 12 × pow (nada mudou)', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'caio' }, elenco);
    ateALuta(l);
    l.g.p1.x = 400;
    l.g.p2.x = 400 + 100;
    const antes = l.g.p2.hp;
    l.frame.p1.right = true;
    l.frame.p1.hp = true; // → + soco forte colado = arremesso
    const ev = l.passo(12);
    expect(tipos(ev, 'throw')).toHaveLength(1);
    expect(antes - l.g.p2.hp).toBeCloseTo(12 * elenco.hayato.pow, 6);
    // e a 110 px (> 108) o mesmo comando não agarra
    const l2 = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'caio' }, elenco);
    ateALuta(l2);
    l2.g.p1.x = 400;
    l2.g.p2.x = 400 + 110;
    l2.frame.p1.right = true;
    l2.frame.p1.hp = true;
    expect(tipos(l2.passo(12), 'throw')).toHaveLength(0);
  });

  describe('ABRAÇO DA ESTEPE (rush + agarrão em janela + armadura; golpe fora do kit, def de teste)', () => {
    const abraco = elencoAbraco[ID_BAATAR].moves.sFwd;

    /** Distância (antes de cada tick) e eventos; o P1 (BAATAR) aperta →+ESP no tick 0. */
    function correr(distancia: number, p2?: (l: Luta, t: number) => void, lut = elencoAbraco) {
      const l = pronta({ x1: 300, x2: 300 + distancia, lut });
      const ev: EventoLuta[] = [];
      const antes: number[] = [];
      let grudou = -1;
      let vxNoGrab = NaN;
      for (let t = 0; t < 70; t++) {
        l.frame.p1.right = t === 0;
        l.frame.p1.sp = t === 0;
        p2?.(l, t);
        antes.push(Math.abs(l.g.p2.x - l.g.p1.x));
        const e = l.passo();
        ev.push(...e);
        if (grudou < 0 && tipos(e, 'throw').length) {
          grudou = t;
          vxNoGrab = l.g.p1.vx;
        }
      }
      return { l, ev, antes, grudou, vxNoGrab };
    }

    it('o →+ESP do def de teste é o ABRAÇO (a fixtura, não o BAATAR de produção)', () => {
      expect(abraco.name).toBe(ABRACO_DA_ESTEPE.name);
      expect(baatar.moves.sFwd.name).not.toBe(ABRACO_DA_ESTEPE.name);
    });

    it('agarra no primeiro tick em que o rival fica dentro de 96 px DEPOIS da preparação, e só uma vez', () => {
      const { ev, antes, grudou, vxNoGrab } = correr(220);
      expect(tipos(ev, 'throw')).toHaveLength(1);
      // agarrou: "já agarrou" (hitDone) freia a corrida de braços abertos (30% da velocidade) pelo resto da janela
      expect(vxNoGrab).toBeCloseTo((abraco.vx as number) * 0.3, 9);
      expect(grudou).toBeGreaterThanOrEqual(abraco.S);
      expect(antes[grudou]).toBeLessThan(96);
      for (let t = abraco.S; t < grudou; t++) expect(antes[t], `tick ${t}`).toBeGreaterThanOrEqual(96);
    });

    it('fora da janela (rival longe demais para o ABRAÇO chegar) não agarra', () => {
      const { ev } = correr(700);
      expect(tipos(ev, 'throw')).toHaveLength(0);
    });

    it('contra soco fraco repetido segue (armadura) e agarra; contra chute baixo forte (rank > 2) para', () => {
      const comLp = correr(160, (l, t) => {
        l.frame.p2.lp = t % 4 === 0;
      });
      expect(tipos(comLp.ev, 'armor').length).toBeGreaterThan(0);
      expect(tipos(comLp.ev, 'throw')).toHaveLength(1);
      const comChk = correr(160, (l, t) => {
        l.frame.p2.down = t === 0;
        l.frame.p2.hk = t === 0;
      });
      expect(tipos(comChk.ev, 'hit').some((e) => e.tipo === 'hit' && e.defensor === 0)).toBe(true);
      expect(tipos(comChk.ev, 'throw')).toHaveLength(0);
    });

    it('sem `armadura.rankMax` o chute baixo forte também seria absorvido (a regra do rank é o que o interrompe)', () => {
      const lut = elencoE3({ baatar: semArmadura });
      const r = correr(160, (l, t) => {
        l.frame.p2.down = t === 0;
        l.frame.p2.hk = t === 0;
      }, lut);
      expect(tipos(r.ev, 'armor').length).toBeGreaterThan(0);
      expect(tipos(r.ev, 'throw')).toHaveLength(1);
    });
  });
});

describe('S1b · MERGULHO DA ÁGUIA (vxAlvo; →+ESP do BAATAR normal)', () => {
  /** BAATAR em x = 100; rival invulnerável (não empurra nem é acertado) a `distancia` px. */
  function mergulhar(distancia: number, x1 = 100) {
    const l = pronta({ x1, x2: x1 + distancia });
    l.g.p2.invuln = 99999;
    const alvoX = l.g.p2.x;
    l.frame.p1.right = true;
    l.frame.p1.sp = true;
    let noAr = 0;
    let pousou = -1;
    let xPouso = NaN;
    let decolou = false;
    for (let t = 0; t < 120 && pousou < 0; t++) {
      l.passo();
      l.frame.p1.sp = false;
      l.frame.p1.right = false;
      if (l.g.p1.y < GROUND) {
        decolou = true;
        noAr++;
      } else if (decolou) {
        pousou = t;
        xPouso = l.g.p1.x;
      }
    }
    return { l, alvoX, noAr, xPouso, pousou };
  }

  it('o →+ESP do BAATAR é o MERGULHO (golpe alto, derruba, sem agarrão) e ele não tem fichas', () => {
    expect(baatar.moves.sFwd.name).toBe(MERGULHO_DA_AGUIA.name);
    expect(baatar.moves.sFwd.lvl).toBe('over');
    expect(baatar.moves.sFwd.kd).toBe(1);
    expect(baatar.moves.sFwd.agarrao).toBeUndefined();
    expect(Object.keys(baatar.fichas)).toEqual([]);
  });

  it('o dado vxAlvo bate com o tempo de voo medido (vy e gravidade do motor)', () => {
    const r = mergulhar(300);
    // ticks no ar observados + o tick do pouso = ticks de física do voo
    expect(Math.abs(r.noAr + 1 - (MERGULHO_DA_AGUIA.vxAlvo as number))).toBeLessThanOrEqual(1);
  });

  it.each([100, 300, 600])('rival a %i px: pousa a +-20 px do x que ele tinha na decolagem', (d) => {
    const r = mergulhar(d);
    expect(r.pousou).toBeGreaterThan(0);
    expect(Math.abs(r.xPouso - r.alvoX)).toBeLessThanOrEqual(20);
  });

  it('a velocidade tem teto (|vx|): rival a 840 px não é alcançado, o pouso fica em 60 + vx × vxAlvo', () => {
    const r = mergulhar(840, 60);
    const teto = (MERGULHO_DA_AGUIA.vx as number) * (MERGULHO_DA_AGUIA.vxAlvo as number);
    expect(840 / (MERGULHO_DA_AGUIA.vxAlvo as number)).toBeGreaterThan(MERGULHO_DA_AGUIA.vx as number); // o teto precisa morder
    expect(r.xPouso).toBeLessThanOrEqual(60 + teto + 1);
    expect(r.alvoX - r.xPouso).toBeGreaterThan(20);
  });

  it('sem vxAlvo o mesmo salto vai sempre com a velocidade fixa (mutação do dado: não mira)', () => {
    const { vxAlvo: _v, ...fixo } = MERGULHO_DA_AGUIA;
    void _v;
    const def: LutadorDef = { ...BAATAR, especiais: { ...BAATAR.especiais, sFwd: fixo } };
    const lut = elencoE3({ baatar: def });
    const l = pronta({ lut, x1: 100, x2: 400 });
    l.g.p2.invuln = 99999;
    l.frame.p1.right = true;
    l.frame.p1.sp = true;
    let xPouso = NaN;
    let voou = false;
    for (let t = 0; t < 120; t++) {
      l.passo();
      l.frame.p1.sp = false;
      l.frame.p1.right = false;
      if (l.g.p1.y < GROUND) voou = true;
      else if (voou) {
        xPouso = l.g.p1.x;
        break;
      }
    }
    expect(Math.abs(xPouso - 400)).toBeGreaterThan(20);
  });
});

describe('S1b · montagem recusa dado que o motor não executa', () => {
  const comGolpe = (nome: 'sFire' | 'sFwd', extra: Partial<GolpeMontado>): LutadorDef => ({
    ...BAATAR,
    especiais: { ...BAATAR.especiais, [nome]: { ...BAATAR.especiais[nome], ...extra } },
  });

  it('agarrao.alvo: chao/ar/ambos montam (S3); valor desconhecido falha alto no boot', () => {
    for (const alvo of ['chao', 'ar', 'ambos'] as const) {
      expect(() => montarFixtura(comGolpe('sFire', { agarrao: { alcance: 100, alvo } }))).not.toThrow();
    }
    const ruim = { alcance: 100, alvo: 'lua' } as unknown as NonNullable<GolpeMontado['agarrao']>;
    expect(() => montarFixtura(comGolpe('sFire', { agarrao: ruim }))).toThrow(/alvo/);
  });

  it('agarrao sem throw:1 e vxAlvo fora de salto são erro de dados', () => {
    const { throw: _t, ...semThrow } = BAATAR.especiais.sFire;
    void _t;
    expect(() => montarFixtura({ ...BAATAR, especiais: { ...BAATAR.especiais, sFire: semThrow } })).toThrow(/throw: 1/);
    expect(() => montarFixtura(comGolpe('sFire', { vxAlvo: 30 }))).toThrow(/vxAlvo/);
  });

  it('o ESP que não é projétil monta (proj neutro); o type fire sem proj continua erro', () => {
    expect(baatar.proj.cost).toBe(baatar.moves.sFire.cost);
    expect(baatar.proj.dmg).toBe(0);
    const { proj: _p, ...semProj } = HAYATO.especiais.sFire;
    void _p;
    expect(() => montarFixtura({ ...HAYATO, especiais: { ...HAYATO.especiais, sFire: semProj } })).toThrow(/sFire sem proj/);
  });
});

describe('S1b · dicas de CPU do BAATAR (só quem a tem gasta RNG, só dentro do alcance)', () => {
  const nomesDicas = baatar.dicasIa.map((d) => `${d.golpe}:${d.dica.papel}`);

  it('as dicas montadas: ARREMESSO pressão (0-150) e MERGULHO aproximar (200-700)', () => {
    expect(nomesDicas).toEqual(['sFire:pressao', 'sFwd:aproximar']);
    const faixas = baatar.dicasIa.map((d) => `${d.golpe}:${d.dica.papel}:${d.dica.alcance?.join('-')}`);
    expect(faixas).toEqual(['sFire:pressao:0-150', 'sFwd:aproximar:200-700']);
  });

  /** CPU nível 2 de BAATAR (P2) contra o HAYATO parado: início de cada sFire/sFwd e a distância nesse tick. */
  function cpuBaatar(lut: Record<IdLutador, LutadorMontado>, ticks = 4000, rng: Rng = criarRng(21)) {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: ID_BAATAR, cpu: 2 }, lut, rng);
    ateALuta(l);
    const usos: { golpe: NomeGolpe; dist: number }[] = [];
    let anterior: NomeGolpe | null = null;
    let anteriorMt = -1;
    for (let i = 0; i < ticks; i++) {
      l.g.p2.en = 100;
      l.g.p1.hp = 100;
      l.g.p2.hp = Math.max(l.g.p2.hp, 60);
      const dist = Math.abs(l.g.p1.x - l.g.p2.x);
      l.passo();
      const p = l.g.p2;
      // Só o que sai do repouso (plano por dica). Cancelamento de um golpe que acabou de acertar (combo) segue o fluxo antigo
      // da CPU, que ignora a dica (e o rival já foi empurrado pelo golpe anterior): não é o que este teste mede.
      if (p.state === 'move' && p.move && (p.move === 'sFire' || p.move === 'sFwd') && (anterior !== p.move || p.mt < anteriorMt) && anterior === null) {
        usos.push({ golpe: p.move, dist });
      }
      anterior = p.state === 'move' ? p.move : null;
      anteriorMt = p.mt;
      if (l.g.phase !== 'fight') ateALuta(l);
    }
    return usos;
  }

  it('a CPU usa o ARREMESSO só perto e o MERGULHO na faixa de aproximação (dentro do alcance da dica)', () => {
    const usos = cpuBaatar(elenco);
    const arremessos = usos.filter((u) => u.golpe === 'sFire');
    const mergulhos = usos.filter((u) => u.golpe === 'sFwd');
    expect(arremessos.length).toBeGreaterThan(0);
    expect(mergulhos.length).toBeGreaterThan(0);
    for (const u of arremessos) expect(u.dist, 'ARREMESSO fora do alcance da dica').toBeLessThanOrEqual(150 + 8);
    for (const u of mergulhos) expect(u.dist, 'MERGULHO fora da faixa da dica').toBeGreaterThanOrEqual(200 - 8);
    for (const u of mergulhos) expect(u.dist).toBeLessThanOrEqual(700 + 8);
  });

  it('sem a dica no def (mutação de dados) a CPU deixa de escolher o ARREMESSO só no alcance certo: o fluxo genérico o usa de longe', () => {
    const semIa = (g: LutadorDef['especiais']['sFire']): LutadorDef['especiais']['sFire'] => {
      const { ia: _ia, ...resto } = g;
      void _ia;
      return resto;
    };
    const def: LutadorDef = { ...BAATAR, especiais: { sFire: semIa(BAATAR.especiais.sFire), sDown: BAATAR.especiais.sDown, sFwd: semIa(BAATAR.especiais.sFwd) } };
    const lut = elencoE3({ baatar: def });
    expect(lut[ID_BAATAR].dicasIa).toEqual([]);
    const usos = cpuBaatar(lut);
    expect(usos.filter((u) => u.golpe === 'sFire' && u.dist > 150 + 8).length).toBeGreaterThan(0);
  });
});
