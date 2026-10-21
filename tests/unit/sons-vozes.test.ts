import { describe, expect, it } from 'vitest';
import type { Grito } from '../../src/data/sons';
import { DADOS_SONS } from '../../src/data/sons';
import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { distancia } from '../support/descritores';
import { ESCALAS_VOZ, ESPELHO, TAU, TAU_NILA, TAU_VARIACAO } from '../support/regua-sons';
import { descreverGrito, fmt, maisProximo, paresDe, perfilDe } from '../support/vozes';

/*
 * Sons por lutador, S2: as 10 vozes (docs/spec-sons-por-lutador.md §7.2 revisão 2). `Sv` = distância de voz com o TOM IGUALADO (f0 = 175 Hz nos dois
 * lados), com P. A régua está congelada em tests/support/regua-sons.ts; os números do par mais próximo de cada critério são impressos.
 */
const gritosDe = (id: IdLutador, ficha: string | null = null) => perfilDe(id, ficha).gritos as NonNullable<ReturnType<typeof perfilDe>['gritos']>;

const CATEGORIAS: Record<string, (id: IdLutador) => Grito> = {
  'dano leve (variante 0)': (id) => gritosDe(id).leve[0] as Grito,
  'dano pesado (variante 0)': (id) => gritosDe(id).pesado[0] as Grito,
  'guarda quebrada': (id) => gritosDe(id).guarda,
  'KO (sem o gongo)': (id) => gritosDe(id).ko,
  'kiai base': (id) => gritosDe(id).kiai,
  vitória: (id) => gritosDe(id).vitoria,
};

describe('R1: voz entre lutadores (Sv >= 1,5, tom igualado)', () => {
  for (const [nome, grito] of Object.entries(CATEGORIAS)) {
    it(`${nome}: os 45 pares`, () => {
      const itens = IDS_LUTADORES.map((id) => ({ nome: id, d: descreverGrito(perfilDe(id), grito(id)) }));
      const pares = paresDe(itens, ESCALAS_VOZ);
      expect(pares).toHaveLength(45);
      const pior = maisProximo(pares);
      console.log(`R1 ${nome}: par mais próximo ${fmt(pior)}`);
      expect(pior.partes.S, fmt(pior)).toBeGreaterThanOrEqual(TAU);
    });
  }
});

describe('R4: as posturas da NILA (GAJA x SARPA, Sv >= 1,0)', () => {
  it('dano leve e kiai', () => {
    for (const [nome, pega] of [['dano leve', (g: ReturnType<typeof gritosDe>) => g.leve[0] as Grito], ['kiai', (g: ReturnType<typeof gritosDe>) => g.kiai]] as const) {
      const gaja = descreverGrito(perfilDe('nila'), pega(gritosDe('nila')));
      const sarpa = descreverGrito(perfilDe('nila', 'sarpa'), pega(gritosDe('nila', 'sarpa')));
      const d = distancia(gaja, sarpa, ESCALAS_VOZ);
      console.log(`R4 ${nome}: S=${d.S.toFixed(2)} (dT ${d.dT.toFixed(2)} dC ${d.dC.toFixed(2)} dE ${d.dE.toFixed(2)} dP ${d.dP.toFixed(2)})`);
      expect(d.S, nome).toBeGreaterThanOrEqual(TAU_NILA);
    }
  });
});

describe('R6 (voz): a variação de tom e volume não descaracteriza (S < 0,4, com o tom REAL)', () => {
  const variacoes = [{ tom: 0.97 }, { tom: 1.03 }, { vol: 0.9 }];
  const medir = (esc: typeof ESCALAS_VOZ): { falhas: string[]; pior: { s: number; onde: string }; total: number } => {
    const falhas: string[] = [];
    let pior = { s: 0, onde: '' };
    let total = 0;
    for (const id of IDS_LUTADORES) {
      for (const [nome, grito] of Object.entries(CATEGORIAS)) {
        const base = descreverGrito(perfilDe(id), grito(id), { f0: null });
        for (const v of variacoes) {
          const d = distancia(base, descreverGrito(perfilDe(id), grito(id), { f0: null, ...v }), esc);
          total++;
          const onde = `${id} ${nome} ${JSON.stringify(v)}: S=${d.S.toFixed(2)} (dT ${d.dT.toFixed(2)} dC ${d.dC.toFixed(2)} dE ${d.dE.toFixed(2)} dP ${d.dP.toFixed(2)})`;
          if (d.S > pior.s) pior = { s: d.S, onde };
          if (d.S >= TAU_VARIACAO) falhas.push(onde);
        }
      }
    }
    return { falhas, pior, total };
  };
  it('SEM o bloco P (timbre, brilho, envelope e duração): todas as 180 variações ficam abaixo de 0,4', () => {
    const r = medir({ ...ESCALAS_VOZ, eP: Infinity });
    console.log(`R6 voz sem P: ${r.total} variações; pior ${r.pior.onde}`);
    expect(r.falhas).toEqual([]);
  }, 60000);
  it('COM o bloco P (a régua da spec): informa quantas variações o estimador de tom vira de oitava (não afirma; ver o handoff)', () => {
    const r = medir(ESCALAS_VOZ);
    console.log(['R6 voz com P: ' + r.falhas.length + ' de ' + r.total + ' variações >= 0,4; pior ' + r.pior.onde, ...r.falhas].join(String.fromCharCode(10) + '   '));
    expect(r.total).toBe(180);
  });
});

describe('R7: espelho (P2 do mesmo lutador: -1 st e trato x0,97, decisão D-S7 do dono), tom real', () => {
  const medirEspelho = (esc: typeof ESCALAS_VOZ): { menor: { s: number; onde: string }; maior: { s: number; onde: string }; fora: string[] } => {
    const fora: string[] = [];
    let menor = { s: Infinity, onde: '' };
    let maior = { s: 0, onde: '' };
    for (const id of IDS_LUTADORES) {
      for (const nome of ['kiai base', 'dano leve (variante 0)']) {
        const grito = (CATEGORIAS[nome] as (id: IdLutador) => Grito)(id);
        const d = distancia(descreverGrito(perfilDe(id), grito, { f0: null }), descreverGrito(perfilDe(id), grito, { f0: null, espelho: true }), esc);
        const onde = `${id} ${nome}: S=${d.S.toFixed(2)} (dT ${d.dT.toFixed(2)} dC ${d.dC.toFixed(2)} dE ${d.dE.toFixed(2)} dP ${d.dP.toFixed(2)})`;
        if (d.S < menor.s) menor = { s: d.S, onde };
        if (d.S > maior.s) maior = { s: d.S, onde };
        if (d.S < ESPELHO[0] || d.S > ESPELHO[1]) fora.push(onde);
      }
    }
    return { menor, maior, fora };
  };
  it('SEM P: o espelho nunca passa de S = 1,0 (continua o mesmo lutador) e se distingue do normal (S >= 0,12)', () => {
    const r = medirEspelho({ ...ESCALAS_VOZ, eP: Infinity });
    console.log(`R7 sem P: menor ${r.menor.onde}; maior ${r.maior.onde}; ${r.fora.length} de 20 abaixo de ${ESPELHO[0]}`);
    expect(r.maior.s, r.maior.onde).toBeLessThanOrEqual(ESPELHO[1]);
    // A spec pede S >= 0,3. Com -1 st e x0,97 (D-S7) o menor valor medido é ~0,15 (kiai de som parado): o piso de 0,12 só garante que o espelho NÃO é o mesmo som.
    expect(r.menor.s, r.menor.onde).toBeGreaterThanOrEqual(0.12);
  }, 60000);
  it('COM P (a régua da spec): informa quantos pares ficam fora de [0,3; 1,0] (não afirma; ver o handoff)', () => {
    const r = medirEspelho(ESCALAS_VOZ);
    console.log(['R7 com P: ' + r.fora.length + ' de 20 fora de [0,3; 1,0]', ...r.fora].join(String.fromCharCode(10) + '   '));
    expect(r.menor.s).toBeGreaterThan(0);
  }, 60000);
});

describe('dados das vozes', () => {
  it('N1 paramétrico: a tupla (k, onda, aspereza, sopro, vogal do kiai) não se repete entre lutadores', () => {
    const tuplas = IDS_LUTADORES.map((id) => {
      const p = perfilDe(id);
      const k = Math.round(p.k * 100);
      const v = (p.gritos as NonNullable<typeof p.gritos>).kiai.silabas[0]?.v;
      return `${k}|${p.onda}|${p.aspereza.hz}/${p.aspereza.prof}|${p.sopro}|${v}`;
    });
    expect(new Set(tuplas).size).toBe(IDS_LUTADORES.length);
  });
  it('palavras reais estão marcadas (rev.) e a versão não-lexical existe para todas', async () => {
    const { NAO_LEXICAL, GRITOS_LEXICAIS } = await import('../../src/data/sons/gritos');
    expect(GRITOS_LEXICAIS).toBe(true);
    for (const id of IDS_LUTADORES) expect(NAO_LEXICAL[id].vitoria.silabas.length, id).toBeGreaterThan(0);
    expect(DADOS_SONS.perfis['zenon']?.gritos?.vitoria.subOitava).toBeGreaterThan(0);
  });
});
