import { describe, expect, it } from 'vitest';
import type { EventoLuta, IdLutador, MotorV2 } from '../../src/core/contratos';
import { filmeDoGolpe } from '../../src/data/filmes';
import type { NomeGolpe } from '../../src/data/tipos';
import { escalaCombo } from '../../src/fight/colisao';
import { TETO_COMBO, TETO_GOLPE } from '../../src/fight/game';
import { PROD, cena, contar, doTipo, soltar, type Cena } from './_filme';

/*
 * V2-3c (docs/spec-revisao-motor-luta-v2.md §3, §4 e §9): o FILME do especial no motor, atrás de `motorV2.filmes`. Um teste por linha da
 * tabela do §3.1, a fórmula do dano do §4.1, o estado final do §3.3 e o contrato do §3.4. Luta de verdade (versus, números de PRODUÇÃO),
 * nada de dublê. Os cenários de "contato" acham a distância varrendo (como o frame-data), para não depender de uma caixa de golpe.
 */

const hp = (c: Cena, i: 0 | 1): number => c.g.fighters[i].hp;

/** Procura a menor distância em que `golpe` do P1 conecta (acerto, bloqueio, esquiva ou armadura) e devolve a cena já jogada. */
function achar(c1: IdLutador, c2: IdLutador, golpe: NomeGolpe, preparar: (c: Cena) => void, agir?: (c: Cena, i: number) => void, ate = 460): Cena {
  for (let d = 80; d <= ate; d += 10) {
    const c = cena(c1, c2, { esquiva: true });
    soltar(c, golpe, d, { antes: preparar, ...(agir ? { cada: agir } : {}) });
    const tocou = ['hit', 'throw', 'block', 'armor', 'quebra-guarda', 'esquivou', 'parry', 'clash'].some((t) => contar(c.eventos, t as EventoLuta['tipo']) > 0);
    if (tocou) return c;
  }
  throw new Error(`${c1}/${golpe} contra ${c2}: não conectou em nenhuma distância`);
}

const comFicha = (ficha: string | null) => (c: Cena) => {
  if (ficha) c.g.p1.trocarFicha(ficha);
};

describe('V2-3c: a flag', () => {
  it('desligada (ausente, {} ou só entradaNoHitstop): nenhum evento `filme`, nenhum `hit.filme`, e o HOERI bate 3 vezes como sempre', () => {
    for (const motorV2 of [null, {}, { entradaNoHitstop: true }, { filmes: false }]) {
      const c = cena('min-ji', 'hayato', { motorV2 });
      soltar(c, 'sDown', 120, { antes: (cc) => (cc.g.p2.hp = cc.g.p2.maxHp) });
      expect(contar(c.eventos, 'filme'), JSON.stringify(motorV2)).toBe(0);
      expect(doTipo(c.eventos, 'hit').some((h) => h.filme !== undefined)).toBe(false);
      expect(doTipo(c.eventos, 'hit').length, `${JSON.stringify(motorV2)}: acertos do HOERI`).toBeGreaterThanOrEqual(2);
    }
  });

  it('ligada: o mesmo HOERI vira UM filme e UM acerto', () => {
    const c = cena('min-ji', 'hayato');
    soltar(c, 'sDown', 120);
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(doTipo(c.eventos, 'hit')).toHaveLength(1);
  });
});

describe('V2-3c §3.1: acerto limpo abre o filme (corpo a corpo, projétil e agarrão)', () => {
  it('corpo a corpo (KAMINARI-STEP do HAYATO): hit{filme} e filme, nesta ordem, no MESMO tick; a vida cai o valor do filme', () => {
    const c = achar('hayato', 'wei-long', 'sFwd', () => undefined);
    const idx = c.porTick.findIndex((t) => t.some((e) => e.tipo === 'filme'));
    const tick = c.porTick[idx] as EventoLuta[];
    expect(tick.map((e) => e.tipo).filter((t) => t === 'hit' || t === 'filme')).toEqual(['hit', 'filme']);
    const hit = doTipo(tick, 'hit')[0];
    expect(hit?.filme).toBe(true);
    const f = doTipo(tick, 'filme')[0];
    expect(f).toMatchObject({ atacante: 0, defensor: 1, golpe: 'sFwd', ficha: null, projetil: false, contragolpe: false, ko: false, trocaDeBarra: false, final: 'derruba' });
    const esperado = (filmeDoGolpe('hayato', null, 'sFwd')?.dano ?? 0) * PROD.hayato.pow;
    expect(f?.dano).toBeCloseTo(esperado, 9);
    expect(PROD['wei-long'].hp - hp(c, 1)).toBeCloseTo(esperado, 9);
    expect(hit?.dano).toBeCloseTo(esperado, 9);
  });

  it('projétil (RAIJIN-DAN): dano = filme.dano SEM pow; o atacante não é tocado (segue no golpe)', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 300;
    c.g.p2.x = 560;
    c.g.p1.startMove('sFire', c.g);
    let antesDoFilme: { move: string | null; x: number } | null = null;
    for (let i = 0; i < 120 && contar(c.eventos, 'filme') === 0; i++) {
      antesDoFilme = { move: c.g.p1.move, x: c.g.p1.x };
      c.tick();
    }
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.projetil).toBe(true);
    expect(f?.dano).toBeCloseTo(filmeDoGolpe('hayato', null, 'sFire')?.dano ?? 0, 9);
    expect(PROD['wei-long'].hp - hp(c, 1)).toBeCloseTo(filmeDoGolpe('hayato', null, 'sFire')?.dano ?? 0, 9);
    expect(f?.depois.atacante).toEqual(f?.antes.atacante); // o filme de projétil só mexe no defensor
    expect(antesDoFilme).not.toBeNull();
  });

  it('agarrão de especial (ARREMESSO DO AVARGA): throw{filme} + filme, sem `hit`; HURACANRANA (rival no ar) idem', () => {
    const c = achar('baatar', 'hayato', 'sFire', () => undefined);
    expect(doTipo(c.eventos, 'throw')[0]?.filme).toBe(true);
    expect(contar(c.eventos, 'hit')).toBe(0);
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(doTipo(c.eventos, 'filme')[0]?.golpe).toBe('sFire');
    expect(PROD.hayato.hp - hp(c, 1)).toBeCloseTo((filmeDoGolpe('baatar', null, 'sFire')?.dano ?? 0) * PROD.baatar.pow, 9);

    const h = achar('centella', 'hayato', 'sDown', (cc) => {
      cc.g.p2.setState('jump');
      cc.g.p2.y = 400;
      cc.g.p2.vy = -3;
    }, undefined, 200);
    expect(doTipo(h.eventos, 'throw')[0]?.filme).toBe(true);
    expect(contar(h.eventos, 'filme')).toBe(1);
    expect(h.g.p2.state).toBe('down');
  });

  it('o golpe comum (não especial) nunca abre filme, e o agarrão comum (→+HP) também não', () => {
    const c = cena('hayato', 'wei-long');
    soltar(c, 'hp', 70);
    expect(contar(c.eventos, 'hit')).toBeGreaterThan(0);
    expect(contar(c.eventos, 'filme')).toBe(0);
    expect(doTipo(c.eventos, 'hit').every((h) => h.filme === undefined)).toBe(true);
    const t = cena('hayato', 'wei-long');
    soltar(t, 'throw', 70);
    expect(contar(t.eventos, 'throw')).toBe(1);
    expect(contar(t.eventos, 'filme')).toBe(0);
  });
});

describe('V2-3c §3.1: sem filme (bloqueio, esquiva, armadura, PARADE, escudo) e a execução é consumida', () => {
  // P2 olha para a esquerda: "trás" é a direita. Em pé segura mid e over (o MASHI é alto: o agachado o deixa passar).
  const guarda = (c: Cena): void => {
    c.mao.p2 = { right: true };
  };

  it('bloqueio (KAMINARI-STEP): 0 filme, 1 block, raspão do 1º acerto, o rival continua em pé', () => {
    const c = achar('hayato', 'wei-long', 'sFwd', guarda);
    expect(contar(c.eventos, 'filme')).toBe(0);
    expect(contar(c.eventos, 'block')).toBe(1);
    expect(contar(c.eventos, 'hit')).toBe(0);
    expect(c.g.p2.state).not.toBe('down');
    const mv = PROD.hayato.moves.sFwd;
    const raspao = Math.max(0.4, (mv.dmg ?? 0) * PROD.hayato.pow * 0.12);
    expect(PROD['wei-long'].hp - hp(c, 1)).toBeCloseTo(raspao, 9);
  });

  it('bloqueio de um golpe de VÁRIOS ACERTOS (HOERI, 3): 1 block só, a execução não bate mais', () => {
    const c = achar('min-ji', 'hayato', 'sDown', guarda);
    expect(contar(c.eventos, 'filme')).toBe(0);
    expect(contar(c.eventos, 'block')).toBe(1);
    expect(contar(c.eventos, 'hit')).toBe(0);
  });

  it('bloqueio de projétil de 2 tiros (BULKKOT): 1 block, o 2º tiro não existe (0 eventos extras)', () => {
    const c = cena('min-ji', 'hayato');
    c.g.p1.x = 300;
    c.g.p2.x = 520;
    c.g.p1.startMove('sFire', c.g);
    for (let i = 0; i < 160; i++) {
      c.mao.p2 = { right: true };
      c.g.p2.x = 520; // o rival que bloqueia não anda para trás durante o ensaio
      c.tick();
    }
    expect(contar(c.eventos, 'block')).toBe(1);
    expect(contar(c.eventos, 'filme') + contar(c.eventos, 'hit') + contar(c.eventos, 'esquivou') + contar(c.eventos, 'clash')).toBe(0);
    expect(contar(c.eventos, 'projectile')).toBeLessThanOrEqual(2);
  });

  it('quebra-guarda (MASHI nível 3): atravessa a guarda, MAS é bloqueio: 0 filme, 1 quebra-guarda', () => {
    let x0 = 0;
    const c = achar(
      'aminu',
      'hayato',
      'sFire',
      guarda,
      (cc, i) => {
        if (i === 0) x0 = cc.g.p2.x;
        cc.g.p2.x = x0; // o rival que segura "trás" não anda durante os 80 ticks de carga
        cc.mao.p1 = { spSeg: i < 80 };
      },
      200,
    );
    expect(contar(c.eventos, 'quebra-guarda')).toBe(1);
    expect(contar(c.eventos, 'filme')).toBe(0);
    expect(contar(c.eventos, 'hit')).toBe(0);
    expect(contar(c.eventos, 'carga')).toBeGreaterThanOrEqual(3);
  });

  it('esquiva invulnerável: 0 filme, 0 hit, 1 esquivou (corpo a corpo e projétil), e o resto da execução não existe', () => {
    for (const [lutador, golpe] of [['hayato', 'sFwd'], ['hayato', 'sFire'], ['min-ji', 'sFire'], ['min-ji', 'sDown']] as const) {
      let ok = false;
      for (let aperta = 0; aperta < 40 && !ok; aperta++) {
        const c = cena(lutador, 'wei-long', { esquiva: true });
        const d = golpe === 'sFwd' ? 90 : golpe === 'sDown' ? 120 : 220;
        soltar(c, golpe, d, {
          cada: (cc, i) => {
            cc.mao.p2 = i === aperta ? { esq: true } : {};
          },
          limite: 200,
        });
        if (contar(c.eventos, 'esquivou') === 0) continue;
        ok = true;
        expect(contar(c.eventos, 'filme'), `${lutador}/${golpe}`).toBe(0);
        expect(contar(c.eventos, 'hit'), `${lutador}/${golpe}`).toBe(0);
        expect(contar(c.eventos, 'esquivou'), `${lutador}/${golpe}: 1 esquivou só`).toBe(1);
      }
      expect(ok, `${lutador}/${golpe}: a esquiva nunca pegou o golpe`).toBe(true);
    }
  });

  it('armadura absorve (TIE SHAN KAO do WEI LONG em curso): o atacante recebe 1 armor e 0 filme; a execução dele acabou', () => {
    for (const d of [80, 120, 160]) {
      const c = cena('hayato', 'wei-long');
      soltar(c, 'sFwd', d, { antes: (cc) => cc.g.p2.startMove('sFwd', cc.g) });
      const armor = doTipo(c.eventos, 'armor').filter((e) => e.atacante === 0);
      expect(armor, `d=${d}`).toHaveLength(1);
      // o filme que sobra na cena é o do WEI LONG (atacante 1), que a armadura dele não impede de bater
      expect(doTipo(c.eventos, 'filme').filter((f) => f.atacante === 0), `d=${d}`).toHaveLength(0);
      expect(doTipo(c.eventos, 'hit').filter((h) => h.atacante === 0), `d=${d}`).toHaveLength(0);
    }
  });

  it('PARADE da CAMILLE: o atacante NÃO leva filme; o FOUETTÉ que responde abre o filme DELA (golpe sResp)', () => {
    let achou: Cena | null = null;
    for (let atraso = 0; atraso < 12 && !achou; atraso++) {
      const c = cena('hayato', 'camille');
      c.g.p2.startMove('sFire', c.g); // PARADE
      for (let i = 0; i < atraso; i++) c.tick();
      c.g.p1.x = 480 - 45;
      c.g.p2.x = 480 + 45;
      c.g.p1.startMove('sFwd', c.g);
      for (let i = 0; i < 100; i++) c.tick();
      if (contar(c.eventos, 'parry') === 1) achou = c;
    }
    expect(achou, 'a PARADE nunca pegou o especial do rival').not.toBeNull();
    const c = achou as Cena;
    const filmes = doTipo(c.eventos, 'filme');
    expect(filmes.filter((f) => f.atacante === 0)).toHaveLength(0); // o atacante parado não ganha filme
    expect(filmes).toHaveLength(1);
    expect(filmes[0]).toMatchObject({ atacante: 1, defensor: 0, golpe: 'sResp' });
    expect(filmes[0]?.dano).toBeCloseTo((filmeDoGolpe('camille', null, 'sResp')?.dano ?? 0) * PROD.camille.pow, 9);
  });

  it('escudo da GARKUWA absorve o projétil: clash, 0 filme, 0 hit', () => {
    const c = cena('hayato', 'aminu');
    c.g.p1.x = 300;
    c.g.p2.x = 520;
    c.g.p1.startMove('sFire', c.g);
    for (let i = 0; i < 6; i++) c.tick();
    c.g.p2.startMove('sDown', c.g); // GARKUWA: escudo de 20 ticks ativos
    for (let i = 0; i < 80; i++) c.tick();
    const clash = doTipo(c.eventos, 'clash').find((e) => e.golpe === 'sDown');
    expect(clash).toBeDefined();
    expect(contar(c.eventos, 'filme')).toBe(0);
    expect(contar(c.eventos, 'hit')).toBe(0);
  });

  it('VADIVU (troca de postura da NILA): nunca abre filme, nem na GAJA nem na SARPA', () => {
    expect(filmeDoGolpe('nila', null, 'sDown')).toBeUndefined();
    expect(filmeDoGolpe('nila', 'sarpa', 'sDown')).toBeUndefined();
    for (const ficha of [null, 'sarpa']) {
      const c = cena('nila', 'hayato');
      soltar(c, 'sDown', 80, { antes: comFicha(ficha) });
      expect(contar(c.eventos, 'filme')).toBe(0);
      expect(contar(c.eventos, 'hit')).toBe(0);
      expect(contar(c.eventos, 'troca-ficha')).toBe(1);
    }
  });

  it('a PARADE em si (a postura, sFire da CAMILLE) não tem filme', () => {
    expect(filmeDoGolpe('camille', null, 'sFire')).toBeUndefined();
  });
});

describe('V2-3c §3.1: dois contatos de especial no MESMO tick = 1 filme', () => {
  it('o golpe do P1 e o projétil do P2 no mesmo tick: o P1 (1º na ordem) leva o filme; o projétil do P2 vale como acerto comum, com o dano de hoje', () => {
    let achou: Cena | null = null;
    for (let d = 100; d <= 200 && !achou; d += 5) {
      for (let atraso = -14; atraso <= 14 && !achou; atraso++) {
        const c = cena('hayato', 'wei-long');
        c.g.p1.x = 480 - d / 2;
        c.g.p2.x = 480 + d / 2;
        const p1Primeiro = atraso >= 0;
        if (p1Primeiro) {
          c.g.p1.startMove('sFwd', c.g);
          for (let i = 0; i < atraso; i++) c.tick();
          c.g.p2.startMove('sFire', c.g);
        } else {
          c.g.p2.startMove('sFire', c.g);
          for (let i = 0; i < -atraso; i++) c.tick();
          c.g.p1.startMove('sFwd', c.g);
        }
        for (let i = 0; i < 80; i++) c.tick();
        if (c.porTick.some((t) => t.filter((e) => e.tipo === 'hit' || e.tipo === 'filme').length >= 3)) achou = c;
      }
    }
    expect(achou, 'não achei dois contatos de especial no mesmo tick').not.toBeNull();
    const c = achou as Cena;
    const tick = c.porTick.find((t) => t.filter((e) => e.tipo === 'hit').length === 2) as EventoLuta[];
    expect(tick.filter((e) => e.tipo === 'filme')).toHaveLength(1);
    const hits = doTipo(tick, 'hit');
    expect(hits.filter((h) => h.filme === true)).toHaveLength(1);
    const comum = hits.find((h) => h.filme === undefined);
    expect(comum?.projetil).toBe(true);
    expect(comum?.defensor).toBe(0);
    const proj = PROD['wei-long'].moves.sFire.proj;
    // o dano de hoje: proj.dmg (sem pow), +15% se o P1 já estava em `_lag` (state 'move' = contragolpe)
    expect(comum?.dano).toBeCloseTo((proj?.dmg ?? 0) * (comum?.contragolpe ? 1.15 : 1), 9);
    expect(contar(c.eventos, 'filme')).toBe(1);
  });
});

describe('V2-3c §4.1: a vida cai EXATAMENTE o valor da fórmula', () => {
  const dano = (id: IdLutador, ficha: string | null, golpe: string, nivel = 0): number => {
    const f = filmeDoGolpe(id, ficha, golpe);
    return f?.danoPorNivel && nivel ? (f.danoPorNivel[nivel - 1] as number) : (f?.dano ?? 0);
  };

  it('limpo: dano × pow; projétil sem pow', () => {
    const c = achar('wei-long', 'hayato', 'sFwd', () => undefined);
    expect(PROD.hayato.hp - hp(c, 1)).toBeCloseTo(dano('wei-long', null, 'sFwd') * PROD['wei-long'].pow, 9);
  });

  it('escala de combo: o filme é UM golpe, leva a escala de quem já apanhou (gotHits)', () => {
    for (const gotHits of [1, 3, 8]) {
      const c = achar('hayato', 'wei-long', 'sFwd', (cc) => {
        cc.g.p2.gotHits = gotHits;
        cc.g.p2.comboDmg = 0.001;
      });
      const esperado = dano('hayato', null, 'sFwd') * PROD.hayato.pow * escalaCombo(gotHits);
      expect(PROD['wei-long'].hp - hp(c, 1), `gotHits ${gotHits}`).toBeCloseTo(esperado, 9);
    }
  });

  it('contragolpe (rival em golpe): ×1,15', () => {
    const c = cena('hayato', 'wei-long');
    soltar(c, 'sFwd', 90, { antes: (cc) => cc.g.p2.startMove('hk', cc.g) });
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.contragolpe).toBe(true);
    expect(f?.dano).toBeCloseTo(dano('hayato', null, 'sFwd') * PROD.hayato.pow * 1.15, 9);
  });

  it("COUP D'ARRÊT (rival na PREPARAÇÃO do golpe dele): usa o multiplicador do golpe (contra.mult), não 1,15", () => {
    const mult = PROD.camille.moves.sDown.contra?.mult;
    expect(mult).toBeGreaterThan(1.15);
    let achou = false;
    for (let d = 80; d <= 200 && !achou; d += 10) {
      const c = cena('camille', 'wei-long');
      soltar(c, 'sDown', d, { antes: (cc) => cc.g.p2.startMove('hk', cc.g) });
      const f = doTipo(c.eventos, 'filme')[0];
      if (!f || !doTipo(c.eventos, 'hit')[0]?.contraEspecial) continue;
      achou = true;
      expect(f.dano).toBeCloseTo(Math.min(TETO_GOLPE, dano('camille', null, 'sDown') * PROD.camille.pow * (mult as number)), 9);
    }
    expect(achou).toBe(true);
  });

  it('teto de golpe 26: LONG ZHANG (23) com contragolpe dá 23 × 1,15 = 26,45 e cai 26', () => {
    const c = cena('wei-long', 'hayato');
    c.g.p1.x = 400;
    c.g.p2.x = 560;
    c.g.p1.startMove('sFire', c.g); // S = 20: o projétil nasce no tick 20 e chega ao rival em poucos ticks
    for (let i = 0; i < 100 && contar(c.eventos, 'filme') === 0; i++) {
      if (i === 15) c.g.p2.startMove('hk', c.g); // o rival está "em golpe" (contragolpe) quando o projétil chega
      c.tick();
    }
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.contragolpe).toBe(true);
    expect(23 * 1.15).toBeGreaterThan(TETO_GOLPE);
    expect(f?.dano).toBeCloseTo(TETO_GOLPE, 9);
    expect(PROD.hayato.hp - hp(c, 1)).toBeCloseTo(TETO_GOLPE, 9);
  });

  it('MASHI: o dano segue o NÍVEL da carga (1, 2 e 3 do danoPorNivel × pow)', () => {
    for (const [nivel, segura] of [[1, 0], [2, 45], [3, 80]] as const) {
      const c = cena('aminu', 'hayato');
      soltar(c, 'sFire', 100, {
        cada: (cc, i) => {
          cc.mao.p1 = { spSeg: i < segura };
        },
      });
      const f = doTipo(c.eventos, 'filme')[0];
      expect(f?.nivelCarga, `nível ${nivel}`).toBe(nivel);
      expect(f?.dano, `nível ${nivel}`).toBeCloseTo(Math.min(TETO_GOLPE, dano('aminu', null, 'sFire', nivel) * PROD.aminu.pow), 9);
      expect(doTipo(c.eventos, 'hit')[0]?.nivelCarga).toBe(nivel);
    }
  });

  it('danoRecebido do chefão: a VIDA cai golpe × fator, e `dano` do evento é o que saiu da barra', () => {
    const fator = PROD.baatar.chefe?.danoRecebido;
    expect(fator).toBeLessThan(1);
    const c = cena('hayato', 'baatar', { chefe: true });
    soltar(c, 'sFwd', 90);
    const golpe = dano('hayato', null, 'sFwd') * PROD.hayato.pow;
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.dano).toBeCloseTo(golpe * (fator as number), 9);
    expect(c.g.p2.maxHp - c.g.p2.hp).toBeCloseTo(golpe * (fator as number), 9);
  });

  it('teto de combo: um combo tira no máximo 40% da vida TOTAL; o filme leva só o que falta', () => {
    const total = PROD['wei-long'].hp;
    expect(TETO_COMBO).toBe(0.4);
    const c = achar('hayato', 'wei-long', 'sFwd', (cc) => {
      cc.g.p2.gotHits = 2;
      cc.g.p2.comboDmg = TETO_COMBO * total - 3;
    });
    expect(doTipo(c.eventos, 'filme')[0]?.dano).toBeCloseTo(3, 9);
    expect(total - hp(c, 1)).toBeCloseTo(3, 9);
  });

  it('teto de combo já estourado: o acerto passa com o piso de 0,5 (nunca dano zero)', () => {
    const total = PROD['wei-long'].hp;
    const c = achar('hayato', 'wei-long', 'sFwd', (cc) => {
      cc.g.p2.gotHits = 4;
      cc.g.p2.comboDmg = TETO_COMBO * total + 5;
    });
    expect(doTipo(c.eventos, 'filme')[0]?.dano).toBeCloseTo(0.5, 9);
  });

  it('o teto de combo vale para golpe COMUM com a flag ligada, e não vale com ela desligada', () => {
    const total = PROD['wei-long'].hp;
    for (const [motorV2, esperado] of [[{ filmes: true }, 2], [null, null]] as const) {
      const c = cena('hayato', 'wei-long', { motorV2 });
      c.g.p2.gotHits = 1;
      c.g.p2.comboDmg = TETO_COMBO * total - 2;
      soltar(c, 'hp', 70, { antes: (cc) => void cc });
      const h = doTipo(c.eventos, 'hit')[0];
      expect(h).toBeDefined();
      if (esperado !== null) expect(h?.dano).toBeCloseTo(esperado, 9);
      else expect(h?.dano ?? 0).toBeGreaterThan(2.5);
    }
  });

  it('treino nunca mata: a vida do boneco fica em 1 e o filme sai igual', () => {
    const c = cena('hayato', 'wei-long', { modo: 'training' });
    soltar(c, 'sFwd', 90, { antes: (cc) => (cc.g.p2.hp = 5) });
    expect(hp(c, 1)).toBe(1);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.ko).toBe(false);
    expect(c.g.p2.state).toBe('down');
  });
});

describe('V2-3c §3.2: energia de UM acerto, KO e troca de barra dentro do filme', () => {
  it('HOERI (3 acertos): +8 ao atacante e +5 ao defensor UMA vez (hoje seriam 3)', () => {
    const c = cena('min-ji', 'hayato');
    c.g.p1.x = 400;
    c.g.p2.x = 520;
    c.g.p2.en = 20;
    c.g.p1.startMove('sDown', c.g);
    let enA = c.g.p1.en;
    let enD = c.g.p2.en;
    for (let i = 0; i < 80 && contar(c.eventos, 'filme') === 0; i++) {
      enA = c.g.p1.en;
      enD = c.g.p2.en;
      c.tick();
    }
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(c.g.p1.en - enA).toBeGreaterThan(7.9);
    expect(c.g.p1.en - enA).toBeLessThan(8.2);
    expect(c.g.p2.en - enD).toBeGreaterThan(4.9);
    expect(c.g.p2.en - enD).toBeLessThan(5.2);
  });

  it('KO dentro do filme: ordem hit -> filme -> ko, ko:true, o rival termina em `ko` no chão e a fase vira ko', () => {
    const c = cena('hayato', 'wei-long');
    soltar(c, 'sFwd', 90, { antes: (cc) => (cc.g.p2.hp = 3) });
    const idx = c.porTick.findIndex((t) => t.some((e) => e.tipo === 'filme'));
    const ordem = (c.porTick[idx] as EventoLuta[]).map((e) => e.tipo).filter((t) => t === 'hit' || t === 'filme' || t === 'ko');
    expect(ordem).toEqual(['hit', 'filme', 'ko']);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.ko).toBe(true);
    expect(f?.dano).toBeCloseTo(3, 9); // só o que havia de vida
    expect(hp(c, 1)).toBe(0);
    expect(c.g.p2.state).toBe('ko');
    expect(c.g.p2.y).toBe(470);
    expect(c.g.phase).toBe('ko');
    expect(contar(c.eventos, 'ko')).toBe(1);
  });

  it('KO por agarrão de especial: throw -> filme -> ko', () => {
    const c = cena('baatar', 'hayato');
    soltar(c, 'sFire', 80, { antes: (cc) => (cc.g.p2.hp = 2) });
    const idx = c.porTick.findIndex((t) => t.some((e) => e.tipo === 'filme'));
    const ordem = (c.porTick[idx] as EventoLuta[]).map((e) => e.tipo).filter((t) => t === 'throw' || t === 'filme' || t === 'ko');
    expect(ordem).toEqual(['throw', 'filme', 'ko']);
  });

  it('troca de barra dentro do filme: fase-chefe -> hit -> filme; a barra enche, o rival cai e a CENA vem DEPOIS, com ele livre no chão', () => {
    const c = cena('hayato', 'baatar', { chefe: true });
    const chefe = c.g.p2;
    expect(chefe.barras).toBe(2);
    soltar(c, 'sFwd', 90, { antes: (cc) => (cc.g.p2.hp = 4), limite: 12 });
    const idx = c.porTick.findIndex((t) => t.some((e) => e.tipo === 'filme'));
    const ordem = (c.porTick[idx] as EventoLuta[]).map((e) => e.tipo).filter((t) => t === 'fase-chefe' || t === 'hit' || t === 'filme' || t === 'ko');
    expect(ordem).toEqual(['fase-chefe', 'hit', 'filme']);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f).toMatchObject({ ko: false, trocaDeBarra: true });
    expect(f?.dano).toBeCloseTo(4, 9); // o que saiu da barra que acabou
    expect(chefe.barras).toBe(1);
    expect(chefe.hp).toBe(chefe.maxHp);
    expect(chefe.state).toBe('down');
    expect(chefe.phase).toBe('lie');
    expect(chefe.invuln).toBeGreaterThan(0);
    expect(c.g.phase).toBe('fight');
    expect(contar(c.eventos, 'fase-chefe')).toBe(1); // a cena ainda não começou
    for (let i = 0; i < 160 && c.g.phase === 'fight'; i++) c.tick();
    expect(c.g.phase).toBe('cena-chefe');
    const etapas = doTipo(c.eventos, 'fase-chefe').map((e) => e.etapa);
    expect(etapas).toEqual(['troca', 'cena']);
    expect(chefe.state).toBe('cena');
  });
});

describe('V2-3c §3.3: estado final', () => {
  it('corpo a corpo: defensor em down/lie a 150 px, no chão, parado; atacante em `_lag` com `recuperacao`, sem cancelamento', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 400;
    c.g.p2.x = 480;
    c.g.p1.startMove('sFwd', c.g);
    for (let i = 0; i < 40 && contar(c.eventos, 'filme') === 0; i++) c.tick();
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f).toBeDefined();
    const a = c.g.p1;
    const d = c.g.p2;
    expect(d.state).toBe('down');
    expect(d.phase).toBe('lie');
    expect(d.st).toBe(0);
    expect([d.y, d.vx, d.vy]).toEqual([470, 0, 0]);
    expect(d.move).toBeNull();
    expect(a.state).toBe('move');
    expect(a.move).toBe('_lag');
    expect(a.lagR).toBe(filmeDoGolpe('hayato', null, 'sFwd')?.recuperacao);
    expect([a.y, a.vx, a.vy]).toEqual([470, 0, 0]);
    expect(a.connected).toBe(false);
    expect(Math.abs(d.x - a.x)).toBeCloseTo(150, 9);
    expect(Math.sign(d.x - a.x)).toBe(a.facing);
    expect(f?.antes.defensor.y).toBe(470);
    expect(f?.antes.defensor.x).toBeGreaterThan(470);
    expect(f?.antes.defensor.x).toBeLessThan(500);
    expect(f?.depois).toEqual({ atacante: { x: a.x, y: a.y, facing: a.facing }, defensor: { x: d.x, y: d.y, facing: d.facing } });
  });

  it('o atacante em `_lag` fica livre depois de `recuperacao` ticks; o rival levanta em 48 (34 deitado + 14); a vantagem é 48 - recuperacao (±1)', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 400;
    c.g.p2.x = 480;
    c.g.p1.startMove('sFwd', c.g);
    for (let i = 0; i < 40 && contar(c.eventos, 'filme') === 0; i++) c.tick();
    const rec = filmeDoGolpe('hayato', null, 'sFwd')?.recuperacao ?? 0;
    const livre = (s: string): boolean => ['idle', 'walk', 'crouch', 'land'].includes(s);
    let livreA = -1;
    let livreD = -1;
    const t0 = c.g.tick; // ticks de JOGO (o hitstop do acerto não conta, como no frame-data)
    for (let n = 1; n <= 160; n++) {
      c.tick();
      const jogo = c.g.tick - t0;
      if (livreA < 0 && livre(c.g.p1.state)) livreA = jogo;
      if (livreD < 0 && livre(c.g.p2.state)) livreD = jogo;
    }
    expect(livreA).toBeGreaterThan(0);
    expect(Math.abs(livreA - rec)).toBeLessThanOrEqual(1);
    expect(Math.abs(livreD - 48)).toBeLessThanOrEqual(2);
    expect(Math.abs(livreD - livreA - (48 - rec))).toBeLessThanOrEqual(2);
  });

  it('o rival encostado na parede: o atacante RECUA para manter a distância (nunca menos que a soma dos corpos)', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 790;
    c.g.p2.x = 868;
    c.g.p1.startMove('sFwd', c.g);
    for (let i = 0; i < 40 && contar(c.eventos, 'filme') === 0; i++) c.tick();
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(c.g.p2.x).toBe(810); // 960 - 150
    expect(c.g.p2.x - c.g.p1.x).toBeCloseTo(150, 9);
    expect(c.g.p1.x).toBeLessThan(790);
  });

  it('o atacante no ar (voadora) pousa no tick do filme; o projétil não toca no atacante (ele segue no golpe que estava)', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 400;
    c.g.p2.x = 480;
    c.g.p1.startMove('sDown', c.g); // RAIJIN-KEN, aéreo
    for (let i = 0; i < 60 && contar(c.eventos, 'filme') === 0; i++) c.tick();
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(c.g.p1.y).toBe(470);
    expect(c.g.p1.move).toBe('_lag');
  });

  it('queda encerra o combo: depois do filme o defensor é intocável até levantar (nenhum acerto novo)', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 400;
    c.g.p2.x = 480;
    c.g.p1.startMove('sFwd', c.g);
    for (let i = 0; i < 40 && contar(c.eventos, 'filme') === 0; i++) c.tick();
    expect(c.g.p2.untouchable).toBe(true);
    const antes = hp(c, 1);
    c.g.p1.startMove('hk', c.g); // bate no caído
    for (let i = 0; i < 40; i++) c.tick();
    expect(hp(c, 1)).toBe(antes);
    expect(contar(c.eventos, 'filme')).toBe(1);
  });

  it('invariante (spec §3.1, "filme depois de filme é impossível"): especial e projétil novos contra o caído não acertam nem abrem outro filme', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.x = 400;
    c.g.p2.x = 480;
    c.g.p1.startMove('sFwd', c.g);
    for (let i = 0; i < 40 && contar(c.eventos, 'filme') === 0; i++) c.tick();
    const antes = hp(c, 1);
    expect(c.g.p2.state).toBe('down');
    c.g.p1.move = null;
    c.g.p1.setState('idle');
    c.g.p1.en = 100;
    c.g.p1.startMove('sFire', c.g); // RAIJIN-DAN contra o caído
    for (let i = 0; i < 20; i++) c.tick(); // (o caído levanta em 48 ticks: a janela é curta de propósito)
    expect(c.g.p2.state === 'down' || c.g.p2.invuln > 0).toBe(true);
    expect(hp(c, 1)).toBe(antes);
    expect(contar(c.eventos, 'filme')).toBe(1);
  });
});

describe('V2-3c §3.1: BULKKOT e HOERI = 1 filme e 0 eventos extras', () => {
  it.each([
    ['min-ji', 'sFire', 260],
    ['min-ji', 'sDown', 120],
  ] as const)('%s %s', (id, golpe, d) => {
    const c = cena(id, 'hayato');
    soltar(c, golpe, d, { limite: 220 });
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(doTipo(c.eventos, 'hit')).toHaveLength(1);
    const extras = c.eventos.filter((e) => ['block', 'armor', 'esquivou', 'quebra-guarda', 'parry', 'throw'].includes(e.tipo));
    expect(extras).toHaveLength(0);
    // nenhum projétil ou golpe da execução sobrou para bater de novo
    expect(c.g.projectiles).toHaveLength(0);
  });
});

describe('V2-3c: determinismo e flag desligada', () => {
  function rodar(motorV2: MotorV2 | null) {
    const c = cena('wei-long', 'min-ji', { semente: 42, esquiva: true, motorV2 });
    c.g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 3, p1cpu: 3, esquiva: true, ...(motorV2 ? { motorV2 } : {}) }, { rounds: 2, time: 99, shake: true });
    for (let i = 0; i < 3000; i++) c.tick();
    return { eventos: c.eventos.map((e) => JSON.stringify(e)), hp: [c.g.p1.hp, c.g.p2.hp], x: [c.g.p1.x, c.g.p2.x], tick: c.g.tick };
  }

  it('CPU x CPU de 3000 ticks: a MESMA semente com a flag ligada dá EXATAMENTE o mesmo resultado duas vezes', () => {
    expect(rodar({ filmes: true })).toEqual(rodar({ filmes: true }));
  });

  it('flag ausente, `{}` e `{filmes:false}` são o MESMO motor de antes (e a ligada é outro: tem filme)', () => {
    const base = rodar(null);
    expect(rodar({})).toEqual(base);
    expect(rodar({ filmes: false })).toEqual(base);
    expect(rodar({ filmes: true }).eventos.some((e) => e.includes('"tipo":"filme"'))).toBe(true);
    expect(base.eventos.some((e) => e.includes('"tipo":"filme"'))).toBe(false);
  });
});

describe('V2-3c: ficha e chefão', () => {
  it('o CHEFÃO (P2) é o atacante: ZENON na ficha `chefe2` lê as linhas de fase 2 (SELO MAIOR 18,5; DECRETO 17,5), e o rival cai na frente do P2 (facing dele)', () => {
    for (const [golpe, esperado] of [['sFire', 18.5], ['sFwd', 17.5]] as const) {
      const c = cena('hayato', 'zenon', { chefe: true });
      c.g.p2.trocarFicha('chefe2');
      c.g.p1.x = 380;
      c.g.p2.x = golpe === 'sFire' ? 640 : 460;
      c.g.p2.en = 100;
      c.g.p2.startMove(golpe, c.g);
      for (let i = 0; i < 160 && contar(c.eventos, 'filme') === 0; i++) c.tick();
      const f = doTipo(c.eventos, 'filme')[0];
      expect(f, golpe).toBeDefined();
      expect(f).toMatchObject({ atacante: 1, defensor: 0, ficha: 'chefe2', golpe });
      const pow = golpe === 'sFire' ? 1 : c.g.p2.ch.pow; // projétil não usa pow
      expect(f?.dano).toBeCloseTo(esperado * pow, 6);
      expect(c.g.p1.state).toBe('down');
      expect(Math.sign(c.g.p1.x - c.g.p2.x)).toBe(c.g.p2.facing); // o rival cai NA FRENTE de quem bateu (o REVERS/DECRETO cruza e vira o facing)
    }
  });

  it('ZENON TRIBUTO: o dreno de energia é cobrado UMA vez (e vai no hit)', () => {
    const c = cena('zenon', 'hayato');
    c.g.p2.en = 60;
    soltar(c, 'sFwd', 90);
    expect(contar(c.eventos, 'filme')).toBe(1);
    const hit = doTipo(c.eventos, 'hit')[0];
    expect(hit?.dreno).toBeGreaterThan(0);
  });

  it('NILA na SARPA lê a linha `sarpa/` (BOTE 11,11 × pow 0,9 = 10,0)', () => {
    const c = cena('nila', 'hayato');
    soltar(c, 'sFire', 80, { antes: comFicha('sarpa') });
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.ficha).toBe('sarpa');
    expect(f?.dano).toBeCloseTo(10, 1);
  });

  it('as 2 fichas da NILA dão filmes diferentes para o MESMO slot (GAJA: MARMA; SARPA: BOTE)', () => {
    const gaja = cena('nila', 'hayato');
    soltar(gaja, 'sFire', 80);
    const sarpa = cena('nila', 'hayato');
    soltar(sarpa, 'sFire', 80, { antes: comFicha('sarpa') });
    expect(doTipo(gaja.eventos, 'filme')[0]?.dano).toBeGreaterThan((doTipo(sarpa.eventos, 'filme')[0]?.dano ?? 0) + 5);
  });
});

describe('V2-3c: invariantes em lutas CPU x CPU com a flag ligada', () => {
  it('cada `filme` vem logo depois do seu hit/throw, deixa o rival caído, e a luta termina; nenhum acerto de dano zero', () => {
    const pares: [IdLutador, IdLutador][] = [['hayato', 'wei-long'], ['min-ji', 'nila'], ['baatar', 'centella'], ['aminu', 'camille'], ['zenon', 'caio']];
    let filmes = 0;
    for (const [a, b] of pares) {
      for (const nivel of [1, 2]) {
        const c = cena(a, b, { semente: 11 + nivel });
        c.g.setup({ mode: 'cpu', c1: a, c2: b, cpu: nivel, p1cpu: nivel, motorV2: { filmes: true } }, { rounds: 1, time: 20, shake: true });
        for (let i = 0; i < 6000 && !c.g.matchDone; i++) {
          c.tick();
          const ev = c.porTick[c.porTick.length - 1] as EventoLuta[];
          for (const e of ev) {
            if (e.tipo === 'hit' || e.tipo === 'throw') expect((e.dano ?? 1) > 0, `${a}x${b}: acerto de dano zero`).toBe(true);
            if (e.tipo !== 'filme') continue;
            filmes++;
            const i1 = ev.indexOf(e);
            const anterior = ev[i1 - 1];
            expect(anterior && (anterior.tipo === 'hit' || anterior.tipo === 'throw') && anterior.filme === true).toBe(true);
            expect(e.dano).toBeLessThanOrEqual(TETO_GOLPE + 1e-9);
            const d = c.g.fighters[e.defensor];
            expect(['down', 'ko'], `${a}x${b}`).toContain(d.state);
            expect(contar(ev, 'filme'), 'um filme por tick').toBe(1);
          }
        }
        expect(c.g.matchDone, `${a}x${b} nível ${nivel} travou`).toBe(true);
      }
    }
    expect(filmes).toBeGreaterThan(5); // o laço de fato exercita o filme
  });
});
