import { describe, it } from 'vitest';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { distancia, type Descritores, type Escalas } from '../support/descritores';
import { descreverSom } from '../support/render-som';

/*
 * S0 (spec-sons-por-lutador §7.1): DIAGNÓSTICO da régua com os sons de HOJE. A régua NÃO está congelada: com as escalas da spec
 * (C 1/3 de oitava, E 6 dB e meia oitava, P 2 st) nenhum `eT` faz `max(negativos) <= 0,4` e `min(positivos) >= 1,2`.
 * Roda só com `SONS_DIAG=1 npx vitest run tests/unit/sons-regua-s0.test.ts --silent=false` (imprime as matrizes; não afirma nada).
 * Os números e a análise estão em docs/handoff-vega-sons.md.
 */
const diag = process.env['SONS_DIAG'] === '1';

describe.runIf(diag)('S0: diagnóstico da régua (sons atuais)', () => {
  it('imprime controles negativos e positivos para varias escalas', () => {
    const pitches = IDS_LUTADORES.map((id) => LUTADORES[id].pitch);
    const familias: Record<string, Descritores[]> = {
      hurt: pitches.map((p) => descreverSom((a) => a.hurt(p))),
      special: pitches.map((p) => descreverSom((a) => a.special(p))),
      ko: pitches.map((p) => descreverSom((a) => a.ko(p))),
    };
    const positivos: Record<string, Descritores> = {
      punch: descreverSom((a) => a.punch()),
      kick: descreverSom((a) => a.kick()),
      fireballHit: descreverSom((a) => a.fireballHit()),
      block: descreverSom((a) => a.block()),
      fireballLaunch: descreverSom((a) => a.fireballLaunch()),
      uiPerfect: descreverSom((a) => a.uiPerfect()),
    };
    const nomes = Object.keys(positivos);
    const imprimir = (rotulo: string, esc: Escalas): void => {
      const linha: string[] = [];
      for (const [n, ds] of Object.entries(familias)) {
        let mx = 0;
        let pior = '';
        for (let i = 0; i < ds.length; i++)
          for (let j = i + 1; j < ds.length; j++) {
            const d = distancia(ds[i] as Descritores, ds[j] as Descritores, esc);
            if (d.S > mx) {
              mx = d.S;
              pior = `${pitches[i]}x${pitches[j]}: dT${d.dT.toFixed(2)} dC${d.dC.toFixed(2)} dE${d.dE.toFixed(2)} dP${d.dP.toFixed(2)}`;
            }
          }
        linha.push(`${n} max ${mx.toFixed(2)} [${pior}]`);
      }
      let mn = Infinity;
      let par = '';
      for (let i = 0; i < nomes.length; i++)
        for (let j = i + 1; j < nomes.length; j++) {
          const d = distancia(positivos[nomes[i] as string] as Descritores, positivos[nomes[j] as string] as Descritores, esc).S;
          if (d < mn) {
            mn = d;
            par = `${nomes[i]}x${nomes[j]}`;
          }
        }
      console.log(`${rotulo} eT=${esc.eT} | ${linha.join(' | ')} | min positivo ${mn.toFixed(2)} (${par})`);
    };
    for (const eT of [0.5, 1, 1.5, 3, 1e6]) imprimir('spec', { eT, eC: 1 / 3, eE: 6, eD: 0.5, eP: 2 });
    for (const eT of [1.5]) imprimir('spec sem P', { eT, eC: 1 / 3, eE: 6, eD: 0.5, eP: 1e9 });
    for (const m of [2, 3]) imprimir(`C,E,D x${m}, P x${m * 2}`, { eT: 1.5, eC: m / 3, eE: 6 * m, eD: 0.5 * m, eP: 2 * m * 2 });
  }, 120000);
});
