import { describe, expect, it } from 'vitest';
import { criarRng } from '../../src/core/rng';
import { BIT, compilarLado, compilarPlano, PARTITURA, PRIMEIRO_UPDATE_DE_LUTA } from '../../src/data/trailer/partitura';
import { temMotor, type IdPlano, type PlanoComMotor } from '../../src/data/trailer/tipos';
import { inputFrameDeMascara } from '../../src/trailer/entradas';
import { criarPartida } from '../../src/trailer/partida';
import { medirBatidas, medirRegras, percorrer } from '../../ferramentas/trailer/escalar';
import { ELENCO, ROTEIRO, TOMADAS } from './_trailer';

/*
 * A PARTITURA do trailer (R-14, docs/partitura-trailer.md): a notação compila nas máscaras certas, a direção é RELATIVA ao `facing` do tick, e a luta que ela produz cumpre as regras do
 * Apolo (ninguém parado mais de 30 ticks, os dois nunca parados juntos mais de 12, nenhum congelamento além da tarja do super, nenhum plano termina em nocaute imóvel, 1 super) e as
 * batidas caem no tick declarado e no tick do plano que o roteiro pede.
 */

const PLANOS = ROTEIRO.planos.filter(temMotor);
const tomadaDe = (p: PlanoComMotor): NonNullable<(typeof TOMADAS)[IdPlano]> => {
  const t = TOMADAS[p.id];
  if (!t) throw new Error(`${p.id} sem tomada`);
  return t;
};
const reafinar = (id: string): string => `rode \`npm run trailer:escalar -- --plano ${id} --rastro\` e reafine a partitura`;

describe('notação da partitura', () => {
  it('compila direções, botões, bordas, carga e super nos ticks certos (índice = pré-rolagem + tick)', () => {
    const m = compilarLado('F[0,3) T[3,5) D+sp@10 UF@20 lp@30 sp~[40,44) hp+hk@50', 2, 60);
    const em = (t: number): number => m[2 + t] as number;
    expect([em(0), em(2)]).toEqual([BIT.F, BIT.F]);
    expect([em(3), em(4), em(5)]).toEqual([BIT.T, BIT.T, 0]);
    // D+sp: a direção de t-2 a t+1 e a borda só em t
    expect([em(7), em(8), em(9), em(10), em(11), em(12)]).toEqual([0, BIT.D, BIT.D, BIT.D | BIT.sp, BIT.D, 0]);
    expect([em(20), em(23), em(24)]).toEqual([BIT.U | BIT.F, BIT.U | BIT.F, 0]);
    expect(em(30)).toBe(BIT.lp);
    expect([em(40), em(41), em(43), em(44)]).toEqual([BIT.sp | BIT.spSeg, BIT.spSeg, BIT.spSeg, 0]);
    expect([em(49), em(50), em(51)]).toEqual([0, BIT.hp | BIT.hk, 0]);
  });

  it('aceita ticks negativos (a pré-rolagem) e recusa token inválido', () => {
    expect(compilarLado('F[-4,0)', 4, 10).slice(0, 5)).toEqual([BIT.F, BIT.F, BIT.F, BIT.F, 0]);
    expect(() => compilarLado('F[0,3) xyz@4', 0)).toThrow(/token inválido "xyz@4"/);
  });

  it('frente e trás viram esquerda/direita pelo `facing` do tick: o mesmo golpe vale dos dois lados', () => {
    const f = BIT.F | BIT.D | BIT.sp;
    expect(inputFrameDeMascara(f, 1)).toMatchObject({ right: true, left: false, down: true, sp: true });
    expect(inputFrameDeMascara(f, -1)).toMatchObject({ right: false, left: true, down: true, sp: true });
    expect(inputFrameDeMascara(BIT.T, 1)).toMatchObject({ left: true, right: false });
    expect(inputFrameDeMascara(BIT.T, -1)).toMatchObject({ left: false, right: true });
    expect(inputFrameDeMascara(BIT.spSeg, 1).spSeg).toBe(true);
    expect(inputFrameDeMascara(0, 1).spSeg).toBeUndefined();
  });

  it('a tomada compilada traz `inicio` = intro + pré-rolagem, as batidas deslocadas por ele e as entradas dos dois lados', () => {
    for (const [id, p] of Object.entries(PARTITURA) as [IdPlano, NonNullable<(typeof PARTITURA)[IdPlano]>][]) {
      const t = compilarPlano(p);
      expect(t.inicio, id).toBe(PRIMEIRO_UPDATE_DE_LUTA - 1 + p.pr);
      expect(t.inputs.p1.length, id).toBe(t.inputs.p2.length);
      p.batidas.forEach(([m, m0], i) => {
        expect(t.batidas[i]?.tickMotor, `${id}.${i}`).toBe(t.inicio + 1 + m);
        expect(t.batidas[i]?.tickInicio, `${id}.${i}`).toBe(t.inicio + 1 + (m0 ?? m));
      });
    }
  });

  it('todo plano de luta tem partitura, e o P9 é o único com energia cheia (o único super do trailer)', () => {
    expect(Object.keys(PARTITURA).sort()).toEqual(PLANOS.map((p) => p.id).sort());
    expect(PLANOS.filter((p) => p.pede.some((b) => b.tipo === 'super')).map((p) => p.id)).toEqual(['P9']);
    expect(TOMADAS['P9']?.energia).toEqual([40, 100]);
    expect(PLANOS.filter((p) => TOMADAS[p.id]?.energia?.some((e) => e >= 100)).map((p) => p.id)).toEqual(['P9']);
  });

  it('os dois lutadores são humanos em todo plano (sem CPU) e o `Game` nasce com a energia e a vida da tomada', () => {
    for (const p of PLANOS) {
      const partida = criarPartida(p, tomadaDe(p), ELENCO, criarRng);
      expect(partida.game.fighters.map((f) => f.cpu), p.id).toEqual([null, null]);
    }
    const p9 = PLANOS.find((p) => p.id === 'P9') as PlanoComMotor;
    const g = criarPartida(p9, tomadaDe(p9), ELENCO, criarRng).game;
    expect(g.fighters[1].en).toBe(100);
    expect(g.fighters[0].hp).toBeCloseTo(g.fighters[0].maxHp * 0.18, 5);
  });
});

describe('a luta da partitura cumpre as regras do Apolo e as batidas do roteiro', () => {
  const corrida = percorrer(ROTEIRO, TOMADAS, ELENCO);

  it('nenhum plano virou reserva e a impressão de cada plano é a gravada na partitura', () => {
    expect(corrida.reservas).toEqual([]);
    for (const p of PLANOS) expect(corrida.impressoes.get(p.id), `${p.id}: a luta mudou. ${reafinar(p.id)} e copie a impressão nova`).toBe(PARTITURA[p.id]?.impressao);
  });

  it.each(PLANOS.map((p) => [p.id, p] as const))('%s: cada batida cai no tick do motor declarado e no tick do plano pedido', (id, plano) => {
    const am = corrida.amostras.get(id) ?? [];
    for (const b of medirBatidas(plano, tomadaDe(plano), am)) {
      expect(b.ok, `${id}: a batida ${b.i} (${b.tipo}) caiu no tick do plano ${b.tau} (alvo ${b.alvo} ± ${b.folga}), motor ${b.real} (declarado ${b.declarado}). ${reafinar(id)}`).toBe(true);
    }
  });

  it.each(PLANOS.map((p) => [p.id, p] as const))('%s: ninguém parado mais de 30 ticks, os dois nunca parados juntos mais de 12, nada congela além da tarja do super, o último quadro tem movimento', (id, plano) => {
    const r = medirRegras(corrida.amostras.get(id) ?? []);
    expect(Math.max(...r.paradoMax), `${id}: parado ${r.paradoMax}. ${reafinar(id)}`).toBeLessThanOrEqual(30);
    expect(r.paradosJuntosMax, `${id}: os dois parados juntos por ${r.paradosJuntosMax} ticks. ${reafinar(id)}`).toBeLessThanOrEqual(12);
    expect(r.congeladoMax, `${id}: motor congelado por ${r.congeladoMax} ticks`).toBeLessThanOrEqual(plano.pede.some((b) => b.tipo === 'super') ? 30 : 0);
    expect(r.ultimoEmMovimento, `${id}: o último quadro é ${r.ultimo} (nocaute imóvel). ${reafinar(id)}`).toBe(true);
  });

  it('cada plano de luta tem 192 quadros e a pré-rolagem de cada tomada cabe no limite do roteiro', () => {
    for (const p of PLANOS) {
      expect(corrida.amostras.get(p.id)?.length, p.id).toBe(192);
      expect(TOMADAS[p.id]?.inicio, p.id).toBeLessThanOrEqual(2400);
    }
  });
});
