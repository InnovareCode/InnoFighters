import { describe, it } from 'vitest';
import { ASSINATURAS } from '../../src/data/sons';
import { distancia } from '../support/descritores';
import { chavesDeAssinaturas, descreverReceita, lutadorDaChave, receitaSemVoz } from '../support/efeitos';
import { ESCALAS_EFEITO } from '../support/regua-sons';

/* Diagnóstico dos efeitos (SONS_DIAG=1): os pares mais próximos entre lutadores (R2) e dentro do lutador (R2b). Não afirma nada. */
describe.runIf(process.env['SONS_DIAG'] === '1')('diagnóstico dos efeitos', () => {
  it('R2 / R2b', () => {
    const chaves = chavesDeAssinaturas();
    const D = chaves.map((c) => descreverReceita(receitaSemVoz(ASSINATURAS[c] as never)));
    const inter: string[] = [];
    const intra: string[] = [];
    const todos: { s: string; v: number; inter: boolean }[] = [];
    for (let i = 0; i < chaves.length; i++)
      for (let j = i + 1; j < chaves.length; j++) {
        const d = distancia(D[i] as never, D[j] as never, ESCALAS_EFEITO);
        const mesmo = lutadorDaChave(chaves[i] as string) === lutadorDaChave(chaves[j] as string);
        todos.push({ s: `${chaves[i]} x ${chaves[j]}: S=${d.S.toFixed(2)} (dT ${d.dT.toFixed(2)} dC ${d.dC.toFixed(2)} dE ${d.dE.toFixed(2)})`, v: d.S, inter: !mesmo });
      }
    todos.filter((x) => x.inter).sort((a, b) => a.v - b.v).slice(0, 14).forEach((x) => inter.push(x.s));
    todos.filter((x) => !x.inter).sort((a, b) => a.v - b.v).slice(0, 8).forEach((x) => intra.push(x.s));
    console.log(`R2 mais próximos entre lutadores:\n   ${inter.join('\n   ')}\nR2b mais próximos dentro do lutador:\n   ${intra.join('\n   ')}`);
  }, 300000);
});
