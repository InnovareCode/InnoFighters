import { describe, expect, it } from 'vitest';
import { planoSonoro } from '../../src/audio/identidade-sonora';
import { ASSINATURAS, chavesDosEspeciais, type AssinaturaEspecial } from '../../src/data/sons';
import { distancia, type Descritores } from '../support/descritores';
import { chavesDeAssinaturas, descreverReceita, lutadorDaChave, receitaSemVoz } from '../support/efeitos';
import { ESCALAS_EFEITO, TAU, TAU_FAMILIA, TAU_INTRA } from '../support/regua-sons';
import type { ChamadaReceita } from '../../src/audio/receitas';

/*
 * Sons por lutador, S3: as 33 assinaturas (docs/spec-sons-por-lutador.md §7.2, revisão 2). `Se` = distância de EFEITO: tom real, sem P, limiar relativo.
 * A régua está congelada em tests/support/regua-sons.ts. Os pares mais próximos são impressos.
 */
const chaves = chavesDeAssinaturas();
const D = new Map<string, Descritores>(chaves.map((c) => [c, descreverReceita(receitaSemVoz(ASSINATURAS[c] as AssinaturaEspecial))]));
const S = (a: string, b: string): number => distancia(D.get(a) as Descritores, D.get(b) as Descritores, ESCALAS_EFEITO).S;
const pares = (filtro: (a: string, b: string) => boolean): { a: string; b: string; s: number }[] => {
  const saida: { a: string; b: string; s: number }[] = [];
  for (let i = 0; i < chaves.length; i++) for (let j = i + 1; j < chaves.length; j++) if (filtro(chaves[i] as string, chaves[j] as string)) saida.push({ a: chaves[i] as string, b: chaves[j] as string, s: S(chaves[i] as string, chaves[j] as string) });
  return saida;
};
const mais = (ps: { a: string; b: string; s: number }[]): { a: string; b: string; s: number } => ps.reduce((m, p) => (p.s < m.s ? p : m));
const outroLutador = (a: string, b: string): boolean => lutadorDaChave(a) !== lutadorDaChave(b);

describe('as 33 assinaturas', () => {
  it('as chaves são exatamente os 33 especiais dos dados (a mesma tabela da cinemática)', async () => {
    expect(chaves).toHaveLength(33);
    expect(chaves.slice().sort()).toEqual(chavesDosEspeciais().sort());
    const { CHAVES_IDENTIDADE } = await import('../../src/render/identidade-especiais');
    expect(chaves.slice().sort()).toEqual(CHAVES_IDENTIDADE.slice().sort());
  });

  it('R2: entre lutadores diferentes, Se >= 1,5 (conjuração + estampa, sem a voz)', () => {
    const ps = pares(outroLutador);
    expect(ps.length).toBe(33 * 32 / 2 - pares((a, b) => !outroLutador(a, b)).length);
    const p = mais(ps);
    console.log(`R2: ${ps.length} pares; mais próximo ${p.a} x ${p.b}: Se=${p.s.toFixed(2)}`);
    expect(p.s, `${p.a} x ${p.b}`).toBeGreaterThanOrEqual(TAU);
  });

  it('R2b: dentro do lutador, Se >= 1,0 (família, mas não o mesmo som transposto)', () => {
    const ps = pares((a, b) => !outroLutador(a, b));
    const p = mais(ps);
    console.log(`R2b: ${ps.length} pares; mais próximo ${p.a} x ${p.b}: Se=${p.s.toFixed(2)}`);
    expect(p.s, `${p.a} x ${p.b}`).toBeGreaterThanOrEqual(TAU_INTRA);
  });

  it('R2c: coerência: a distância média dentro do lutador é menor que a média para os outros', () => {
    const lutadores = [...new Set(chaves.map(lutadorDaChave))];
    const margens: string[] = [];
    for (const l of lutadores) {
      const meus = chaves.filter((c) => lutadorDaChave(c) === l);
      const intra = pares((a, b) => lutadorDaChave(a) === l && lutadorDaChave(b) === l);
      const mIntra = intra.reduce((s, p) => s + p.s, 0) / Math.max(1, intra.length);
      const inter = pares((a, b) => (lutadorDaChave(a) === l) !== (lutadorDaChave(b) === l));
      const mInter = inter.reduce((s, p) => s + p.s, 0) / inter.length;
      margens.push(`${l}: intra ${mIntra.toFixed(2)} (${meus.length} sons) x inter ${mInter.toFixed(2)}`);
      if (meus.length >= 2) expect(mIntra, `${l}: intra ${mIntra.toFixed(2)} inter ${mInter.toFixed(2)}`).toBeLessThan(mInter);
    }
    console.log(`R2c: ${margens.join(' | ')}`);
  });
});

describe('R3: os 7 projéteis (lançamento e impacto)', () => {
  const projeteis = chaves.filter((c) => (ASSINATURAS[c] as AssinaturaEspecial).lancamento);
  const desloca = (cs: readonly ChamadaReceita[]): ChamadaReceita[] => [...cs];
  const lanc = new Map(projeteis.map((c) => [c, descreverReceita(desloca((ASSINATURAS[c] as AssinaturaEspecial).lancamento as unknown as ChamadaReceita[]))]));
  const imp = new Map(projeteis.map((c) => [c, descreverReceita(desloca((ASSINATURAS[c] as AssinaturaEspecial).estampa as unknown as ChamadaReceita[]))]));
  const dist = (m: Map<string, Descritores>, a: string, b: string): number => distancia(m.get(a) as Descritores, m.get(b) as Descritores, ESCALAS_EFEITO).S;

  it('são 7', () => {
    expect(projeteis.sort()).toEqual(['caio.base.sFire', 'hayato.base.sFire', 'min-ji.base.sFire', 'wei-long.base.sDown', 'wei-long.base.sFire', 'zenon.base.sFire', 'zenon.chefe2.sFire']);
  });
  for (const [nome, m] of [['lançamento', lanc], ['impacto', imp]] as const) {
    it(`${nome}: lutadores diferentes Se >= 1,5; WEI LONG sFire x sDown >= 1,0; ZENON SELO x SELO MAIOR >= 0,6`, () => {
      let pior = { a: '', b: '', s: Infinity };
      for (let i = 0; i < projeteis.length; i++)
        for (let j = i + 1; j < projeteis.length; j++) {
          const [a, b] = [projeteis[i] as string, projeteis[j] as string];
          const s = dist(m, a, b);
          if (outroLutador(a, b)) {
            if (s < pior.s) pior = { a, b, s };
          }
        }
      console.log(`R3 ${nome}: mais próximo entre lutadores ${pior.a} x ${pior.b}: Se=${pior.s.toFixed(2)}`);
      expect(pior.s, `${pior.a} x ${pior.b}`).toBeGreaterThanOrEqual(TAU);
      const wei = dist(m, 'wei-long.base.sFire', 'wei-long.base.sDown');
      const selo = dist(m, 'zenon.base.sFire', 'zenon.chefe2.sFire');
      console.log(`R3 ${nome}: WEI LONG sFire x sDown Se=${wei.toFixed(2)}; ZENON SELO x SELO MAIOR Se=${selo.toFixed(2)}`);
      expect(wei).toBeGreaterThanOrEqual(TAU_INTRA);
      expect(selo).toBeGreaterThanOrEqual(TAU_FAMILIA);
    });
  }
});

describe('R6 (efeito): sem variação de tom nos efeitos; o plano é o mesmo em qualquer semente', () => {
  it('a estampa do especial é idêntica com sementes e ticks diferentes (só a voz varia)', () => {
    const ev = { tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, especial: true, golpe: 'sDown', dano: 5 } as const;
    const efeito = (semente: number, tick: number): string => JSON.stringify(planoSonoro(ev, { ids: ['camille', 'caio'], fichas: [null, null], semente, tick }).tocar.filter((i) => i.garganta === undefined));
    expect(efeito(1, 1)).toBe(efeito(99, 4000));
  });
});
