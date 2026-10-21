import { describe, expect, it } from 'vitest';
import { sonsDoEvento } from '../../src/audio/eventos';
import type { EventoFaseChefe, EventoLuta } from '../../src/core/contratos';
import { poseDaCena, validarCena } from '../../src/data/cena';
import { WEI_LONG } from '../../src/data/lutadores';
import { DECRETO, SELO_DO_ARCONTE, TRIBUTO, TRIBUTO_DO_CHEFE, ZENON_DEF } from '../../src/data/lutadores/zenon';
import type { Golpe, LutadorDef } from '../../src/data/tipos';
import { ateALuta, criarLuta, montarFixtura, tipos, type Luta } from './_kit-e3';
import { ID_ZENON, ZENON_TESTE, elencoComZenon } from './_zenon';

/*
 * ZENON · Z1 (docs/spec-chefao-zenon.md §1, §2, §4): `drenaEnergia`, `cena { duracao, poses }` e as fichas do chefão no motor.
 * Def de produção sobre o atlas do WEI LONG (a arte real é de zenon-arte.test.ts).
 */

type Hit = Extract<EventoLuta, { tipo: 'hit' }>;
type Bloqueio = Extract<EventoLuta, { tipo: 'block' }>;
const elenco = elencoComZenon();

/** ZENON (P1, à esquerda) contra o HAYATO (P2) a `dist` px; energia dos dois fixada pelo teste a cada tick até o acerto. */
function lutaTributo(opts: { dist?: number; enZenon?: number; enRival?: number; lut?: typeof elenco; golpeDoZenon?: 'sFwd' } = {}): Luta {
  const l = criarLuta({ mode: 'versus', c1: ID_ZENON, c2: 'hayato' }, opts.lut ?? elenco);
  ateALuta(l);
  l.g.p1.x = 400;
  l.g.p2.x = 400 + (opts.dist ?? 90);
  l.g.p1.en = opts.enZenon ?? 60;
  l.g.p2.en = opts.enRival ?? 50;
  return l;
}

/** Dispara o TRIBUTO no tick 0 e anda até o primeiro evento `hit`/`block` do P2. `prepara` roda antes de cada tick (fixa energia, etc.). */
function ateOAcerto(l: Luta, prepara?: (t: number) => void): { ev: EventoLuta[]; alvo: Hit | Bloqueio | null; enZenonAntes: number; enRivalAntes: number } {
  const ev: EventoLuta[] = [];
  let enZenonAntes = l.g.p1.en;
  let enRivalAntes = l.g.p2.en;
  for (let t = 0; t < 60; t++) {
    l.frame.p1.sp = t === 0;
    l.frame.p1.right = t === 0;
    prepara?.(t);
    enZenonAntes = l.g.p1.en;
    enRivalAntes = l.g.p2.en;
    const e = l.passo();
    ev.push(...e);
    const alvo = e.find((x): x is Hit | Bloqueio => (x.tipo === 'hit' || x.tipo === 'block') && x.atacante === 0);
    if (alvo) return { ev, alvo, enZenonAntes, enRivalAntes };
  }
  return { ev, alvo: null, enZenonAntes, enRivalAntes };
}

describe('Z1 · drenaEnergia: acerto', () => {
  it('TRIBUTO do chefe acerta: o rival perde 20 (depois do +5 do ramo), o atacante ganha +8 e +20, e o evento diz dreno 20', () => {
    const lut = elencoComZenon({ ...ZENON_TESTE, especiais: { ...ZENON_TESTE.especiais, sFwd: TRIBUTO_DO_CHEFE } });
    const l = lutaTributo({ lut });
    const r = ateOAcerto(l, (t) => {
      if (t > 0) {
        l.g.p1.en = 60;
        l.g.p2.en = 50;
      }
    });
    expect(r.alvo?.tipo).toBe('hit');
    expect((r.alvo as Hit).dreno).toBe(20);
    // o rival: 50 + 5 (acerto) - 20 (dreno); o atacante: 60 + 8 (acerto) + 20 (dreno). +-0,5 cobre a regeneração de 0,04 do tick
    expect(l.g.p2.en).toBeCloseTo(35, 0);
    expect(l.g.p1.en).toBeCloseTo(88, 0);
  });

  it('o jogável usa o dreno menor (12 no acerto)', () => {
    const l = lutaTributo();
    const r = ateOAcerto(l, (t) => {
      if (t > 0) {
        l.g.p1.en = 60;
        l.g.p2.en = 50;
      }
    });
    expect((r.alvo as Hit).dreno).toBe(TRIBUTO.drenaEnergia!.acerto);
    expect(l.g.p2.en).toBeCloseTo(50 + 5 - 12, 0);
    expect(l.g.p1.en).toBeCloseTo(60 + 8 + 12, 0);
  });

  it('rival com pouca energia: transfere só o que ele tem (depois do +5 do ramo), o rival fica em 0 e o evento diz quanto passou', () => {
    const lut = elencoComZenon({ ...ZENON_TESTE, especiais: { ...ZENON_TESTE.especiais, sFwd: TRIBUTO_DO_CHEFE } });
    const l = lutaTributo({ lut, enRival: 0 });
    const r = ateOAcerto(l, (t) => {
      if (t > 0) {
        l.g.p1.en = 60;
        l.g.p2.en = 0;
      }
    });
    expect((r.alvo as Hit).dreno).toBeCloseTo(5, 0); // 0 + 5 do acerto, e é só isso que existe para tirar
    expect(l.g.p2.en).toBeCloseTo(0, 0);
    expect(l.g.p1.en).toBeCloseTo(60 + 8 + 5, 0);
  });

  it('o atacante cheio não passa de 100 (o rival perde o que foi tirado, o teto fica com o atacante)', () => {
    const lut = elencoComZenon({ ...ZENON_TESTE, especiais: { ...ZENON_TESTE.especiais, sFwd: TRIBUTO_DO_CHEFE } });
    const l = lutaTributo({ lut });
    const r = ateOAcerto(l, (t) => {
      if (t > 0) {
        l.g.p1.en = 98;
        l.g.p2.en = 50;
      }
    });
    expect((r.alvo as Hit).dreno).toBe(20);
    expect(l.g.p1.en).toBe(100);
    expect(l.g.p2.en).toBeCloseTo(35, 0);
  });

  it('rival sem energia nenhuma na hora de apanhar já fica com +5 e perde tudo: dreno positivo, nunca negativo', () => {
    const l = lutaTributo({ enRival: 0 });
    const r = ateOAcerto(l, (t) => {
      if (t > 0) l.g.p2.en = 0;
    });
    expect((r.alvo as Hit).dreno).toBeGreaterThan(0);
    expect(l.g.p2.en).toBeGreaterThanOrEqual(0);
  });
});

describe('Z1 · drenaEnergia: defesa, armadura, esquiva e projétil', () => {
  it('rival bloqueando: -10 no rival (depois do +4 do bloqueio), o atacante ganha +3 e +10, e o block diz dreno 10', () => {
    const lut = elencoComZenon({ ...ZENON_TESTE, especiais: { ...ZENON_TESTE.especiais, sFwd: TRIBUTO_DO_CHEFE } });
    const l = lutaTributo({ lut });
    const r = ateOAcerto(l, (t) => {
      l.frame.p2.right = true; // o P2 olha para a esquerda: "para trás" é a direita
      if (t > 0) {
        l.g.p1.en = 60;
        l.g.p2.en = 50;
      }
    });
    expect(r.alvo?.tipo).toBe('block');
    expect((r.alvo as Bloqueio).dreno).toBe(10);
    expect(l.g.p2.en).toBeCloseTo(50 + 4 - 10, 0);
    expect(l.g.p1.en).toBeCloseTo(60 + 3 + 10, 0);
  });

  it('golpe SEM drenaEnergia (soco do HAYATO) não drena nem põe `dreno` no evento', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: ID_ZENON }, elenco);
    ateALuta(l);
    l.g.p1.x = 400;
    l.g.p2.x = 470;
    l.g.p2.en = 50;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 30; t++) {
      l.frame.p1.hp = t === 0;
      ev.push(...l.passo());
    }
    const hit = ev.find((e): e is Hit => e.tipo === 'hit' && e.atacante === 0);
    expect(hit).toBeDefined();
    expect('dreno' in (hit as Hit)).toBe(false);
  });

  it('o SELO (projétil) acerta sem drenar: ganhos normais (+4 no atacante, +5 no rival) e sem `dreno`', () => {
    const l = lutaTributo({ dist: 300 });
    l.g.p2.invuln = 0;
    const ev: EventoLuta[] = [];
    let acertou = false;
    for (let t = 0; t < 140 && !acertou; t++) {
      l.frame.p1.sp = t === 0;
      if (t > 0) {
        l.g.p1.en = 60;
        l.g.p2.en = 50;
      }
      const e = l.passo();
      ev.push(...e);
      acertou = e.some((x) => x.tipo === 'hit' && x.projetil);
    }
    const hit = ev.find((e): e is Hit => e.tipo === 'hit' && e.projetil);
    expect(hit).toBeDefined();
    expect('dreno' in (hit as Hit)).toBe(false);
    expect(l.g.p2.en).toBeCloseTo(55, 0);
    expect(l.g.p1.en).toBeCloseTo(64, 0);
  });

  it('rival invulnerável (esquiva/untouchable): o golpe não chega aos ramos e nada é drenado', () => {
    const l = lutaTributo();
    l.g.p2.invuln = 999;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 40; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      if (t > 0) l.g.p1.en = 60;
      ev.push(...l.passo());
    }
    expect(tipos(ev, 'hit')).toHaveLength(0);
    expect(tipos(ev, 'block')).toHaveLength(0);
    expect(l.g.p2.en).toBeLessThan(52); // só a regeneração de 0,04/tick: nada foi tirado
    expect(l.g.p2.en).toBeGreaterThan(50 - 0.01);
  });

  it('armadura que ABSORVE o golpe: sem dreno (o ramo da armadura retorna antes de mexer na energia)', () => {
    // o rival é o WEI LONG no meio do TIE SHAN KAO (armor:1, sem rankMax: absorve qualquer rank), em plena janela
    const l2 = criarLuta({ mode: 'versus', c1: ID_ZENON, c2: 'wei-long' }, elenco);
    ateALuta(l2);
    l2.g.p1.x = 400;
    l2.g.p2.x = 520;
    l2.g.p1.invuln = 9999;
    l2.g.p2.en = 80;
    l2.g.p1.en = 60;
    const ev2: EventoLuta[] = [];
    for (let t = 0; t < 40; t++) {
      l2.frame.p1.sp = t === 0;
      l2.frame.p1.right = t === 0;
      if (t === 6) {
        l2.g.p2.startMove('sFwd', l2.g); // TIE SHAN KAO: armor 1, janela S + A = 20 ticks (o custo de 35 sai agora)
        l2.g.p2.en = 80;
      }
      ev2.push(...l2.passo());
      if (ev2.some((e) => e.tipo === 'armor' && e.atacante === 0)) break;
    }
    expect(ev2.some((e) => e.tipo === 'armor' && e.atacante === 0)).toBe(true);
    expect(tipos(ev2, 'hit').filter((e) => e.tipo === 'hit' && e.atacante === 0)).toHaveLength(0);
    const armadura = ev2.find((e) => e.tipo === 'armor' && e.atacante === 0)!;
    expect('dreno' in armadura).toBe(false);
    expect(l2.g.p2.en).toBeGreaterThan(79); // nada tirado do rival (só a regeneração)
  });
});

describe('Z1 · drenaEnergia: o dado inválido falha alto no boot', () => {
  const comSFwd = (extra: Partial<Golpe>): LutadorDef => ({ ...ZENON_TESTE, especiais: { ...ZENON_TESTE.especiais, sFwd: { ...TRIBUTO, ...extra } } });

  it('o def de produção monta', () => {
    expect(() => montarFixtura(ZENON_TESTE)).not.toThrow();
  });

  it('projétil: o SELO com drenaEnergia é recusado', () => {
    const def: LutadorDef = { ...ZENON_TESTE, especiais: { ...ZENON_TESTE.especiais, sFire: { ...SELO_DO_ARCONTE, drenaEnergia: { acerto: 5, defesa: 2 } } } };
    expect(() => montarFixtura(def)).toThrow(/drenaEnergia.*projétil/);
  });

  it('golpe de vários acertos é recusado', () => {
    expect(() => montarFixtura(comSFwd({ hits: 3, every: 6 }))).toThrow(/drenaEnergia.*vários acertos/);
  });

  it('um acerto só (hits: 1) monta', () => {
    expect(() => montarFixtura(comSFwd({ hits: 1 }))).not.toThrow();
  });

  it('agarrão é recusado (ele não passa pelo ramo de acerto/bloqueio)', () => {
    expect(() => montarFixtura(comSFwd({ throw: 1, lvl: 'throw', agarrao: { alcance: 96 } }))).toThrow(/drenaEnergia.*agarrão/);
  });

  it.each<[string, { acerto: number; defesa: number }]>([
    ['defesa maior que acerto', { acerto: 10, defesa: 11 }],
    ['acerto acima de MAX_EN', { acerto: 101, defesa: 5 }],
    ['negativo', { acerto: -1, defesa: -2 }],
    ['NaN', { acerto: Number.NaN, defesa: 0 }],
    ['Infinity', { acerto: Number.POSITIVE_INFINITY, defesa: 0 }],
  ])('números inválidos (%s)', (_nome, drenaEnergia) => {
    expect(() => montarFixtura(comSFwd({ drenaEnergia }))).toThrow(/drenaEnergia inválida/);
  });

  it('limites válidos montam: 0/0 e 100/100', () => {
    expect(() => montarFixtura(comSFwd({ drenaEnergia: { acerto: 0, defesa: 0 } }))).not.toThrow();
    expect(() => montarFixtura(comSFwd({ drenaEnergia: { acerto: 100, defesa: 100 } }))).not.toThrow();
  });
});

describe('Z1 · cena { duracao, poses } do chefe', () => {
  function lutaDeChefe(): Luta {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: ID_ZENON, chefe: true }, elenco);
    ateALuta(l);
    l.g.p1.x = 420;
    l.g.p2.x = 480;
    return l;
  }

  it('dados do ZENON: 2 barras de 50, cena de 90 ticks com cena0..2, trilha chefe, fichas chefe/chefe2, fator 0,8', () => {
    expect(ZENON_DEF.chefe).toEqual({
      barras: 2,
      hpPorBarra: 50,
      fichaFase1: 'chefe',
      fichaFase2: 'chefe2',
      cena: { duracao: 90, poses: ['cena0', 'cena1', 'cena2'] },
      bonusVitoria: 5000,
      trilha: 'chefe',
      danoRecebido: 0.8, // R3: o fator da rampa de balanço (docs/balanco)
    });
  });

  it('a troca de barra abre a cena (etapa `cena`), dura 90 ticks e devolve a luta na ficha chefe2; as etapas saem troca, cena, retomada', () => {
    const l = lutaDeChefe();
    const c = l.g.p2;
    expect(c.ficha).toBe('chefe');
    c.hp = 0.5;
    const etapas: string[] = [];
    const registra = (ev: EventoLuta[]): void => {
      for (const e of ev) if (e.tipo === 'fase-chefe') etapas.push((e as EventoFaseChefe).etapa);
    };
    l.frame.p1.hp = true;
    registra(l.passo());
    l.frame.p1.hp = false;
    for (let i = 0; i < 40 && !etapas.includes('troca'); i++) registra(l.passo());
    expect(etapas).toContain('troca');
    let ticksDeCena = 0;
    for (let i = 0; i < 400 && l.g.phase !== 'cena-chefe'; i++) registra(l.passo());
    expect(l.g.phase).toBe('cena-chefe');
    while (l.g.phase === 'cena-chefe' && ticksDeCena < 500) {
      registra(l.passo());
      ticksDeCena++;
    }
    expect(ticksDeCena).toBe(90);
    expect(etapas).toEqual(['troca', 'cena', 'retomada']);
    expect(c.ficha).toBe('chefe2');
    expect(c.state).toBe('idle');
  });

  it('as poses da cena saem em partes iguais da duração (cena0, cena1, cena2) e a última segura', () => {
    const l = lutaDeChefe();
    const c = l.g.p2;
    c.setState('cena');
    const nomes: string[] = [];
    for (const st of [0, 29, 30, 59, 60, 89, 200]) {
      c.st = st;
      nomes.push(c.poseT().name);
    }
    expect(nomes).toEqual(['cena0', 'cena0', 'cena1', 'cena1', 'cena2', 'cena2', 'cena2']);
  });

  it('poseDaCena: uma pose segura a duração toda; n poses dividem a duração por floor(i·duracao/n)', () => {
    expect(poseDaCena({ duracao: 60, poses: ['a'] }, 59)).toBe('a');
    const c = { duracao: 80, poses: ['a', 'b'] } as const;
    expect([0, 39, 40, 79, 500, -3].map((t) => poseDaCena(c, t))).toEqual(['a', 'a', 'b', 'b', 'b', 'a']);
  });

  it.each<[string, { duracao: number; poses: string[] }]>([
    ['duração zero', { duracao: 0, poses: ['a'] }],
    ['duração acima de 600', { duracao: 601, poses: ['a'] }],
    ['duração fracionária', { duracao: 10.5, poses: ['a'] }],
    ['sem poses', { duracao: 10, poses: [] }],
    ['mais de 8 poses', { duracao: 10, poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }],
    ['nome com espaço', { duracao: 10, poses: ['a b'] }],
    ['nome vazio', { duracao: 10, poses: [''] }],
  ])('cena inválida (%s) falha alto em montarLutador', (_nome, cena) => {
    expect(() => validarCena('t', cena)).toThrow(/cena/);
    const def: LutadorDef = { ...ZENON_TESTE, chefe: { ...ZENON_DEF.chefe!, cena } };
    expect(() => montarFixtura(def)).toThrow(/cena/);
  });

  it('cena com 1 e com 8 poses e duração 1 e 600 monta', () => {
    expect(() => validarCena('t', { duracao: 1, poses: ['a'] })).not.toThrow();
    expect(() => validarCena('t', { duracao: 600, poses: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h-1'] })).not.toThrow();
  });

  it('o som: a etapa `cena` toca o whoosh e a troca o impacto (o contrato de áudio acompanha o rename)', () => {
    const base = { tipo: 'fase-chefe', lutador: 1, barrasRestantes: 1 } as const;
    expect(sonsDoEvento({ ...base, etapa: 'cena' }).map((s) => s.metodo)).toEqual(['introWhoosh', 'musicaDaFase']);
    expect(sonsDoEvento({ ...base, etapa: 'troca' }).map((s) => s.metodo)).toEqual(['fireballHit']);
  });
});

describe('Z1 · fases do chefão: armadura da fase 2 e DECRETO', () => {
  /** O ZENON (P2, chefe) começa o `hp` dele e o jogador bate com o `lp` no mesmo instante: quem é interrompido? */
  function golpeFracoNoHp(ficha: 'chefe' | 'chefe2'): { ev: EventoLuta[]; luta: Luta } {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: ID_ZENON, chefe: true }, elenco);
    ateALuta(l);
    l.g.p1.x = 400;
    l.g.p2.x = 470;
    l.g.p2.trocarFicha(ficha);
    l.g.p2.startMove('hp', l.g);
    l.g.p1.invuln = 0;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 8; t++) {
      l.frame.p1.lp = t === 0;
      ev.push(...l.passo());
    }
    return { ev, luta: l };
  }

  it('fase 2: o lp do rival durante o hp do ZENON vira ARMADURA e o golpe dele continua', () => {
    const { ev, luta } = golpeFracoNoHp('chefe2');
    expect(ev.some((e) => e.tipo === 'armor' && e.defensor === 1)).toBe(true);
    expect(ev.some((e) => e.tipo === 'hit' && e.defensor === 1)).toBe(false);
    expect(luta.g.p2.move).toBe('hp');
  });

  it('fase 1: o mesmo lp interrompe (sem armadura)', () => {
    const { ev, luta } = golpeFracoNoHp('chefe');
    expect(ev.some((e) => e.tipo === 'armor' && e.defensor === 1)).toBe(false);
    expect(ev.some((e) => e.tipo === 'hit' && e.defensor === 1)).toBe(true);
    expect(luta.g.p2.move).not.toBe('hp');
  });

  it('fase 2: golpe forte do rival (hk, rank 4 > rankMax 2) interrompe a armadura', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: ID_ZENON, chefe: true }, elenco);
    ateALuta(l);
    l.g.p1.x = 400;
    l.g.p2.x = 470;
    l.g.p2.trocarFicha('chefe2');
    l.g.p2.startMove('hp', l.g);
    l.g.p1.invuln = 999; // o hp do ZENON não pode interromper o hk do rival antes
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 14; t++) {
      l.frame.p1.hk = t === 0;
      ev.push(...l.passo());
    }
    expect(ev.some((e) => e.tipo === 'armor' && e.defensor === 1)).toBe(false);
    expect(ev.some((e) => e.tipo === 'hit' && e.defensor === 1)).toBe(true);
  });

  it('o DECRETO do chefe (ficha chefe2) cruza o rival: termina do outro lado, virado, e o acerto sai com dreno', () => {
    const l = criarLuta({ mode: 'versus', c1: ID_ZENON, c2: 'hayato' }, elenco);
    ateALuta(l);
    l.g.p1.trocarFicha('chefe2');
    l.g.p1.x = 300;
    l.g.p2.x = 420; // 120 px
    l.g.p1.en = 80;
    l.g.p2.en = 60;
    expect(l.g.p1.ch.moves.sFwd.name).toBe(DECRETO.name);
    const antes = Math.sign(l.g.p1.x - l.g.p2.x);
    expect(antes).toBe(-1);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 60; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      if (t > 0 && t < 30) l.g.p2.en = 60;
      ev.push(...l.passo());
    }
    const hit = ev.find((e): e is Hit => e.tipo === 'hit' && e.atacante === 0);
    expect(hit, 'o DECRETO deveria acertar depois de cruzar').toBeDefined();
    expect(hit!.dreno).toBe(DECRETO.drenaEnergia!.acerto);
    expect(Math.sign(l.g.p1.x - l.g.p2.x)).toBe(1); // do outro lado do rival
    expect(l.g.p1.facing).toBe(-1); // e virado para ele
  });

  it('o DECRETO só acerta depois de cruzar: sem cruzar (rival longe demais para a corrida) não há acerto', () => {
    const l = criarLuta({ mode: 'versus', c1: ID_ZENON, c2: 'hayato' }, elenco);
    ateALuta(l);
    l.g.p1.trocarFicha('chefe2');
    l.g.p1.x = 100;
    l.g.p2.x = 800; // 700 px: a corrida (vx 12,5 × 22) anda 275
    l.g.p1.en = 80;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 60; t++) {
      l.frame.p1.sp = t === 0;
      l.frame.p1.right = t === 0;
      ev.push(...l.passo());
    }
    expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.atacante === 0)).toHaveLength(0);
  });

  it('fase 2 tem SELO MAIOR no ESP (mais rápido, maior e mais forte que o SELO) e o jogável não tem fichas de fase 2', () => {
    const base = elenco[ID_ZENON];
    expect(base.moves.sFire.name).toBe('SELO DO ARCONTE');
    const f2 = base.fichas['chefe2']!;
    expect(f2.moves.sFire.name).toBe('SELO MAIOR');
    expect(f2.moves.sFire.proj!.sp).toBeGreaterThan(base.moves.sFire.proj!.sp);
    expect(f2.moves.sFire.proj!.sc).toBeGreaterThan(base.moves.sFire.proj!.sc);
    expect(f2.moves.sFire.proj!.dmg).toBeGreaterThan(base.moves.sFire.proj!.dmg);
    expect(f2.moves.sFire.proj!.style).toBe('anel');
    expect(base.armadura).toBeUndefined();
    expect(f2.armadura).toEqual({ rankMax: 2 });
    // golpes fortes com armadura só na fase 2
    for (const g of ['hp', 'hk', 'chp'] as const) {
      expect(f2.moves[g].armor).toBe(1);
      expect(base.moves[g].armor).toBeUndefined();
    }
  });

  it('o jogável (ficha base) não tem armadura, dreno de chefão nem cena: é um lutador comum de 1 barra', () => {
    const l = criarLuta({ mode: 'versus', c1: ID_ZENON, c2: 'hayato' }, elenco);
    ateALuta(l);
    expect([l.g.p1.barras, l.g.p1.barrasMax, l.g.p1.chefe, l.g.p1.ficha]).toEqual([1, 1, false, null]);
    expect(l.g.p1.ch.moves.sFwd.drenaEnergia).toEqual({ acerto: 12, defesa: 6 });
    // jogar COMO o chefe com `chefe: true` no c1 não vira chefe (só o P2)
    const c = criarLuta({ mode: 'versus', c1: ID_ZENON, c2: 'hayato', chefe: true }, elenco);
    expect(c.g.p1.chefe).toBe(false);
  });

  it('o ZENON não é um clone do WEI LONG: o def montado sobre o atlas do WEI mantém os golpes e os números do ZENON', () => {
    const z = elenco[ID_ZENON];
    expect(z.name).toBe('ZENON');
    expect(z.scale).toBe(1.32);
    expect(z.jump).toBe(0.72);
    expect(z.moves.sDown.type).toBe('rise');
    expect(z.moves.sDown.ia).toEqual({ papel: 'antiaereo' });
    expect(z.moves.sFwd.ia).toEqual({ papel: 'aproximar', alcance: [90, 220] });
    expect(z.moves.sFire.ia).toBeUndefined(); // SELO: lógica padrão de projétil (achado A2)
    expect(WEI_LONG.name).not.toBe(z.name);
  });
});
