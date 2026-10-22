import { describe, expect, it } from 'vitest';
import {
  conjuntoRelativo,
  dMelodica,
  distanciasBrutas,
  distinto,
  dTimbralBruto,
  escolherTau,
  folgas,
  NEG_MAX,
  normalizar,
  notasDoLead,
  TAU_MUSICA,
  type Distancias,
} from '../support/regua-musica';
import { duracaoDoLaco, leadOitavaAcima, maisRapido, partituraDoLegado, transpor, trocarUmaNota, type PartituraMedida, type TrilhaLegado } from '../support/musica-medida';

/*
 * T0: régua musical CALIBRADA e CONGELADA com as 3 trilhas de hoje (fight, menu, chefe), antes de existir qualquer tema novo. Os números e a
 * regra de escolha dos limiares estão no cabeçalho de tests/support/regua-musica.ts. Aqui: a extração do legado, os 12 controles negativos
 * (4 por trilha), os 3 positivos e a regressão da própria régua. Mudar `TAU_MUSICA` exige PROGRESSO.md e novo veredito da Íris.
 */
const TRILHAS: readonly TrilhaLegado[] = ['fight', 'menu', 'chefe'];
const leg = Object.fromEntries(TRILHAS.map((t) => [t, partituraDoLegado(t)])) as Record<TrilhaLegado, PartituraMedida>;
const fmt = (d: Distancias): string => `dM ${d.dM.toFixed(3)} dR ${d.dR.toFixed(3)} dT ${d.dT.toFixed(3)}`;

function controles(p: PartituraMedida): Record<string, PartituraMedida> {
  return { 'transposto +5 st': transpor(p, 5), 'andamento x1,05': maisRapido(p, 1.05), 'uma nota trocada (a 10a, +2 st)': trocarUmaNota(p, 9, 2), 'lead uma oitava acima': leadOitavaAcima(p) };
}

describe('T0 · extração do legado (gravada do AudioSys real)', () => {
  it('cada trilha tem o laço inteiro e as 3 pistas; nenhuma chamada ficou sem classe (a gravação lança nesse caso)', () => {
    for (const t of TRILHAS) {
      const p = leg[t];
      expect(p.porPasso).toHaveLength(p.passosPorCompasso * p.compassos);
      const pistas = new Set(p.porPasso.flat().map((c) => c.pista));
      expect([...pistas].sort()).toEqual(['baixo', 'lead', 'perc']);
    }
    expect(duracaoDoLaco(leg.fight)).toBeCloseTo(6.4, 6);
    expect(duracaoDoLaco(leg.chefe)).toBeCloseTo(96 * (60 / 138 / 4), 6);
  });
  it('o lead gravado é o LEAD/MLEAD/CHEFE_MELODIA de hoje (primeiras notas, em MIDI)', () => {
    expect(notasDoLead(leg.fight).slice(0, 8)).toEqual([69, 72, 74, 76, 74, 72, 69, 67]);
    expect(notasDoLead(leg.menu).slice(0, 6)).toEqual([76, 72, 74, 71, 69, 72]);
    expect(notasDoLead(leg.chefe).slice(0, 6)).toEqual([74, 70, 69, 66, 75, 72]);
    expect([...conjuntoRelativo(notasDoLead(leg.chefe), leg.chefe.tonica)].sort((a, b) => a - b)).toEqual([0, 1, 4, 5, 7, 8, 10]); // Ré frígio dominante
  });
});

describe('T0 · controles negativos (12) e positivos (3) com os limiares congelados', () => {
  const negativos: { rotulo: string; d: Distancias }[] = [];
  for (const t of TRILHAS) for (const [nome, q] of Object.entries(controles(leg[t]))) negativos.push({ rotulo: `${t} · ${nome}`, d: distanciasBrutas(leg[t], q) });
  const pares: [TrilhaLegado, TrilhaLegado][] = [['fight', 'menu'], ['fight', 'chefe'], ['menu', 'chefe']];
  const positivos = pares.map(([a, b]) => ({ rotulo: `${a} x ${b}`, d: distanciasBrutas(leg[a], leg[b]) }));

  it('negativos: cada dimensão e D < 0,4 depois de normalizados', () => {
    for (const { rotulo, d } of negativos) {
      const n = normalizar(d, TAU_MUSICA);
      console.log(`T0 NEG ${rotulo}: bruto ${fmt(d)} | norm dM ${n.dM.toFixed(2)} dR ${n.dR.toFixed(2)} dT ${n.dT.toFixed(2)} D ${n.D.toFixed(2)}`);
      expect(Math.max(n.dM, n.dR, n.dT), rotulo).toBeLessThan(NEG_MAX);
      expect(n.D, rotulo).toBeLessThan(NEG_MAX);
    }
  });
  it('a transposição e a oitava do lead dão dM = 0 exato', () => {
    for (const t of TRILHAS) {
      expect(dMelodica(leg[t], transpor(leg[t], 5))).toBe(0);
      expect(dMelodica(leg[t], leadOitavaAcima(leg[t]))).toBe(0);
    }
  });
  it('positivos: as 3 trilhas de hoje se distinguem (D >= 1,2 e 2 de 3 dimensões >= 1,0)', () => {
    for (const { rotulo, d } of positivos) {
      const n = normalizar(d, TAU_MUSICA);
      console.log(`T0 POS ${rotulo}: bruto ${fmt(d)} | norm dM ${n.dM.toFixed(2)} dR ${n.dR.toFixed(2)} dT ${n.dT.toFixed(2)} D ${n.D.toFixed(2)}`);
      expect(distinto(n), rotulo).toBe(true);
    }
  });
  it('regressão da régua: refazer a escolha dos limiares reproduz os congelados (±3%) e as duas folgas são >= 1', () => {
    const { tau, folgas: f } = escolherTau(negativos.map((x) => x.d), positivos.map((x) => x.d));
    for (const k of ['dM', 'dR', 'dT'] as const) expect(Math.abs(tau[k] / TAU_MUSICA[k] - 1), k).toBeLessThan(0.03);
    const congelada = folgas(TAU_MUSICA, negativos.map((x) => x.d), positivos.map((x) => x.d));
    console.log(`T0 TAU recalculado ${JSON.stringify(tau)} folgas ${JSON.stringify(f)} | congelado ${JSON.stringify(TAU_MUSICA)} folgas ${JSON.stringify(congelada)}`);
    expect(congelada.negativos).toBeGreaterThanOrEqual(1);
    expect(congelada.positivos).toBeGreaterThanOrEqual(1);
  }, 120000);
  it('informativo: SEM dobrar a altura, a transposição de +5 st e a oitava do lead pesariam em dT (é por isso que a régua dobra)', () => {
    const d1 = dTimbralBruto(leg.chefe, transpor(leg.chefe, 5));
    const d2 = dTimbralBruto(leg.chefe, leadOitavaAcima(leg.chefe));
    console.log(`T0 dT sem dobrar (chefe): transposto +5 = ${d1.toFixed(2)} (${(d1 / TAU_MUSICA.dT).toFixed(2)} normalizado), lead 8a acima = ${d2.toFixed(2)} (${(d2 / TAU_MUSICA.dT).toFixed(2)})`);
    expect(d1).toBeGreaterThan(0);
  });
});
