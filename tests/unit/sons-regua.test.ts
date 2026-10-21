import { describe, expect, it } from 'vitest';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { distancia, type Descritores } from '../support/descritores';
import { descreverSom } from '../support/render-som';
import { ESCALAS_EFEITO, ESCALAS_VOZ, PISOS_HOJE, POSITIVO_MIN, TAU } from '../support/regua-sons';

/*
 * S0b (portão de sensibilidade, spec §7.1) e R5 (regressão da própria régua). Roda ANTES de existir som novo e fica como regressão: se (a) ou (b)
 * falharem, quem mudou foi a régua (descritores, motor offline ou AudioSys antigo), não o som.
 */
const pitches = IDS_LUTADORES.map((id) => LUTADORES[id].pitch);
const pior = (ds: readonly Descritores[], esc = ESCALAS_EFEITO): number => {
  let mx = 0;
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) mx = Math.max(mx, distancia(ds[i] as Descritores, ds[j] as Descritores, esc).S);
  return mx;
};

describe('S0b: a régua enxerga timbre com o tom igual', () => {
  const voz = (formantes: number[]): Descritores => descreverSom((a) => a.voice({ f0: 175, f1: 175 * 0.5, t: 0.3, vol: 1.2, formants: formantes, vib: false }));
  it('vogal fechada [380, 850] x vogal "a" [720, 1150]: S >= 1,5', () => {
    const d = distancia(voz([380, 850]), voz([720, 1150]), ESCALAS_VOZ);
    console.log(`S0b [380,850]x[720,1150]: S=${d.S.toFixed(2)} dT=${d.dT.toFixed(2)} dC=${d.dC.toFixed(2)} dE=${d.dE.toFixed(2)} dP=${d.dP.toFixed(2)}`);
    expect(d.S).toBeGreaterThanOrEqual(TAU);
  });
  it('informação: [700, 1250] x [720, 1150] (as duas são "a")', () => {
    const d = distancia(voz([700, 1250]), voz([720, 1150]), ESCALAS_VOZ);
    console.log(`S0b info [700,1250]x[720,1150]: S=${d.S.toFixed(2)} dT=${d.dT.toFixed(2)} dC=${d.dC.toFixed(2)} dE=${d.dE.toFixed(2)} dP=${d.dP.toFixed(2)}`);
    expect(Number.isFinite(d.S)).toBe(true);
  });
});

describe('R5: regressão da régua (sons de hoje)', () => {
  it('(a) os três pisos recalculados ficam <= 1,0 e perto do medido; (b) o menor positivo >= 2,0', () => {
    const hurt = pior(pitches.map((p) => descreverSom((a) => a.hurt(p))));
    const special = pior(pitches.map((p) => descreverSom((a) => a.special(p))));
    const ko = pior(pitches.map((p) => descreverSom((a) => a.ko(p))));
    console.log(`R5a pisos: hurt ${hurt.toFixed(2)} special ${special.toFixed(2)} ko ${ko.toFixed(2)}`);
    for (const [v, ref] of [[hurt, PISOS_HOJE.hurt], [special, PISOS_HOJE.special], [ko, PISOS_HOJE.ko]] as const) {
      expect(v).toBeLessThanOrEqual(1.0);
      expect(Math.abs(v - ref)).toBeLessThan(0.12);
    }
    const pos = [descreverSom((a) => a.punch()), descreverSom((a) => a.kick()), descreverSom((a) => a.fireballHit()), descreverSom((a) => a.block()), descreverSom((a) => a.fireballLaunch()), descreverSom((a) => a.uiPerfect())];
    let mn = Infinity;
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) mn = Math.min(mn, distancia(pos[i] as Descritores, pos[j] as Descritores, ESCALAS_EFEITO).S);
    console.log(`R5b menor positivo ${mn.toFixed(2)} (congelado ${POSITIVO_MIN})`);
    expect(mn).toBeGreaterThanOrEqual(2.0);
  }, 120000);
  it('(c) hurt(p) de hoje com o tom igualado: Sv = 0 (mesma voz)', () => {
    const ds = pitches.map(() => descreverSom((a) => a.hurt(1)));
    expect(pior(ds, ESCALAS_VOZ)).toBeLessThan(0.05);
  });
});
