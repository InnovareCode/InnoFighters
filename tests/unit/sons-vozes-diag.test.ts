import { describe, it } from 'vitest';
import { DADOS_SONS } from '../../src/data/sons';
import type { Grito } from '../../src/data/sons';
import { ESCALAS_VOZ } from '../support/regua-sons';
import { descreverGrito, fmt, LUTADORES_COM_VOZ, maisProximo, paresDe, perfilDe } from '../support/vozes';

/* Diagnóstico das vozes (SONS_DIAG=1): imprime o par mais próximo e os 5 mais próximos de cada categoria. Não afirma nada. */
describe.runIf(process.env['SONS_DIAG'] === '1')('diagnóstico das vozes', () => {
  it('R1: pares mais próximos por categoria', () => {
    const cats: Record<string, (id: (typeof LUTADORES_COM_VOZ)[number]) => Grito> = {
      leve0: (id) => (DADOS_SONS.perfis[id]?.gritos?.leve[0] as Grito),
      pesado0: (id) => (DADOS_SONS.perfis[id]?.gritos?.pesado[0] as Grito),
      guarda: (id) => (DADOS_SONS.perfis[id]?.gritos?.guarda as Grito),
      ko: (id) => (DADOS_SONS.perfis[id]?.gritos?.ko as Grito),
      kiai: (id) => (DADOS_SONS.perfis[id]?.gritos?.kiai as Grito),
      vitoria: (id) => (DADOS_SONS.perfis[id]?.gritos?.vitoria as Grito),
    };
    for (const [nome, grito] of Object.entries(cats)) {
      const itens = LUTADORES_COM_VOZ.map((id) => ({ nome: id, d: descreverGrito(perfilDe(id), grito(id)) }));
      const pares = paresDe(itens, ESCALAS_VOZ).sort((a, b) => a.partes.S - b.partes.S);
      console.log(`R1 ${nome}: min ${maisProximo(pares).partes.S.toFixed(2)}\n   ${pares.slice(0, 6).map(fmt).join('\n   ')}`);
    }
  }, 300000);
});
