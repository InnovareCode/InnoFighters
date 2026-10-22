import { describe, it } from 'vitest';
import { duracaoDoLacoS, TEMAS } from '../../src/data/musica';
import type { TemaDef } from '../../src/data/musica/tipos';
import type { PistaMusical } from '../../src/audio/receitas';
import { medirMixagem } from '../support/espectro';
import { partituraDoLegado } from '../support/musica-medida';
import { chamadasDoLaco, partituraMedidaDoTema } from '../support/musica-tema';
import { renderizarChamadas } from '../support/render-musica';

/*
 * Ferramenta de autoria (desligada por padrão): `MUSICA_DIAG=1 npx vitest run tests/unit/musica-calibra-diag.test.ts --silent=false`.
 * Mede a energia por faixa de cada PISTA e procura os ganhos (lead, baixo, perc) que cumprem a mixagem da spec (RMS a ±1,5 dB da `fight`, faixa da voz
 * <= +1 dB, grave <= +2 dB) com o menor pico possível até um teto, o mais perto possível do equilíbrio escrito. Imprime:
 *   MUSICA  <id>: o `mix` do tema (fase 1), partindo do tema SEM `mix` e com `volume` 1;
 *   MUSICA2 <id>: o `fase2.mix` (fase 2), partindo do tema com o `mix` que já está nos dados.
 * Cole os números nos temas; tests/unit/musica-mix.test.ts confere o resultado no render real (a soma por pista é uma estimativa: ignora a fase entre pistas).
 */
const diag = process.env['MUSICA_DIAG'] === '1';
const PISTAS: PistaMusical[] = ['lead', 'baixo', 'perc'];
const lin = (db: number): number => Math.pow(10, db / 10);
/** Limites de cada fase (margens dentro dos da spec: RMS ±1,5, voz +1, grave +2). A fase 2 (só no chefão) pode ser mais forte: RMS até +2,5 dB, grave até +4 dB, pico até 0,8. */
const LIM = { 1: { rmsMin: -1.0, rmsMax: 1.0, voz: 0.7, grave: 1.7, pico: 0.62 }, 2: { rmsMin: -1.0, rmsMax: 2.2, voz: 0.7, grave: 3.7, pico: 0.8 } } as const;

type En = { rms: number; grave: number; voz: number };
const faixa = (de: number, ate: number): number[] => {
  const v: number[] = [];
  for (let g = de; g <= ate + 1e-9; g += 0.5) v.push(g);
  return v;
};

function resolver(id: string, def: TemaDef, fase: 1 | 2, ref: ReturnType<typeof medirMixagem>, lacos: number[], faixas: [number[], number[], number[]], rotulo: string): void {
  const E: Record<number, Record<PistaMusical, En>> = {};
  const X: Record<number, Record<PistaMusical, Float32Array>> = {};
  const IDX: Record<number, number[]> = {};
  const dur = duracaoDoLacoS(def) / (fase === 2 ? def.fase2.andamento : 1) + 0.6;
  for (const laco of lacos) {
    const todas = chamadasDoLaco(partituraMedidaDoTema(def, id, laco, fase));
    E[laco] = {} as Record<PistaMusical, En>;
    X[laco] = {} as Record<PistaMusical, Float32Array>;
    for (const pista of PISTAS) {
      const x = renderizarChamadas(todas.filter((c) => c.pista === pista), dur);
      (X[laco] as Record<PistaMusical, Float32Array>)[pista] = x;
      const m = medirMixagem(x);
      (E[laco] as Record<PistaMusical, En>)[pista] = { rms: lin(m.rmsDb), grave: lin(m.graveDb), voz: lin(m.vozDb) };
    }
    const xs = X[laco] as Record<PistaMusical, Float32Array>;
    const n = (xs.lead as Float32Array).length;
    const soma = Float32Array.from({ length: n }, (_, i) => PISTAS.reduce((a, p) => a + Math.abs((xs[p] as Float32Array)[i] as number), 0));
    IDX[laco] = Array.from(soma.keys()).sort((a, b) => (soma[b] as number) - (soma[a] as number)).slice(0, 20000);
  }
  const picoDe = (k: number[], laco: number): number => {
    const xs = X[laco] as Record<PistaMusical, Float32Array>;
    let m = 0;
    for (const i of IDX[laco] as number[]) {
      const v = Math.abs((k[0] as number) * (xs.lead as Float32Array)[i]! + (k[1] as number) * (xs.baixo as Float32Array)[i]! + (k[2] as number) * (xs.perc as Float32Array)[i]!);
      if (v > m) m = v;
    }
    return m / 0.405;
  };
  const lim = LIM[fase];
  let quase: { g: [number, number, number]; pior: number } | null = null;
  let melhor: { g: [number, number, number]; custo: number; folga: number; pico: number } | null = null;
  for (const gl of faixas[0]) for (const gb of faixas[1]) for (const gp of faixas[2]) {
    const k = [Math.sqrt(lin(gl)), Math.sqrt(lin(gb)), Math.sqrt(lin(gp))];
    let pior = Infinity;
    for (const laco of lacos) {
      const e = E[laco] as Record<PistaMusical, En>;
      const rms = 10 * Math.log10(PISTAS.reduce((s, p, i) => s + (k[i] as number) ** 2 * e[p].rms, 0)) - ref.rmsDb;
      const grave = 10 * Math.log10(PISTAS.reduce((s, p, i) => s + (k[i] as number) ** 2 * e[p].grave, 0)) - ref.graveDb;
      const voz = 10 * Math.log10(PISTAS.reduce((s, p, i) => s + (k[i] as number) ** 2 * e[p].voz, 0)) - ref.vozDb;
      pior = Math.min(pior, rms - lim.rmsMin, lim.rmsMax - rms, lim.voz - voz, lim.grave - grave);
    }
    if (pior < 0) {
      if (!quase || pior > quase.pior) quase = { g: [gl, gb, gp], pior };
      continue;
    }
    const pico = Math.max(...lacos.map((l) => picoDe(k, l)));
    const custo = gl * gl + gb * gb + gp * gp;
    const ok = pico <= lim.pico;
    const melhorOk = melhor !== null && melhor.pico <= lim.pico;
    if (!melhor || (ok && !melhorOk) || (ok && melhorOk && custo < melhor.custo) || (!ok && !melhorOk && pico < melhor.pico)) melhor = { g: [gl, gb, gp], custo, folga: pior, pico };
  }
  if (!melhor) {
    console.log(`${rotulo} ${id}: SEM COMBINAÇÃO que cumpra RMS, voz e grave (a menos violada: dB ${quase?.g.join('/')}, folga ${quase?.pior.toFixed(2)})`);
    return;
  }
  const [gl, gb, gp] = melhor.g;
  const f = (db: number): string => Math.pow(10, db / 20).toFixed(2);
  console.log(`${rotulo} ${id}: mix { lead: ${f(gl)}, baixo: ${f(gb)}, perc: ${f(gp)} } (dB ${gl}/${gb}/${gp}) folga ${melhor.folga.toFixed(2)} dB pico ${melhor.pico.toFixed(2)}`);
}

describe.runIf(diag)('calibração da mixagem dos temas', () => {
  it('imprime os ganhos', () => {
    const fight = partituraDoLegado('fight');
    const ref = medirMixagem(renderizarChamadas(chamadasDoLaco(fight), 6.4 + 0.6));
    for (const [id, t] of Object.entries(TEMAS)) {
      if (t === 'chefe') continue;
      // fase 1: o tema sem `mix`, `volume` 1 e sem `fase2.mix`
      const { mix: _m, ...semMix } = { ...t, volume: 1 };
      const { mix: _m2, ...fase2Sem } = t.fase2;
      resolver(id, { ...semMix, fase2: fase2Sem }, 1, ref, [1, 2], [faixa(-4, 6), faixa(-6, 10), faixa(-9, 6)], 'MUSICA');
      // fase 2: o tema com o `mix` que já está nos dados, sem o `fase2.mix`
      resolver(id, { ...t, fase2: fase2Sem }, 2, ref, [2], [faixa(-8, 6), faixa(-14, 3), faixa(-12, 3)], 'MUSICA2');
    }
  }, 900000);
});
