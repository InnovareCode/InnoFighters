import { describe, it } from 'vitest';
import type { Consoante, Grito, Vogal } from '../../src/data/sons';
import { criarRng } from '../../src/core/rng';
import { distancia, type Descritores, type Escalas } from '../support/descritores';
import { ESCALAS_VOZ } from '../support/regua-sons';
import { descreverGrito, LUTADORES_COM_VOZ, perfilDe } from '../support/vozes';

/*
 * Ferramenta de AUTORIA (SONS_BUSCA=1): para uma categoria curta (dano leve/pesado, guarda), procura a combinação de (vogal, duração, consoante, contorno)
 * por lutador que maximiza a MENOR distância entre pares. NÃO muda a régua (que está congelada em tests/support/regua-sons.ts); só ajuda a escrever os dados.
 */
const VOGAIS: Vogal[] = ['a', 'e', 'ê', 'é', 'i', 'o', 'u', 'ə'];
const CONS: (Consoante | undefined)[] = [undefined, 'h', 'k', 'g'];

function candidatas(cat: string): { desc: string; g: Grito }[] {
  const saida: { desc: string; g: Grito }[] = [];
  const durs = cat === 'leve' ? [0.1, 0.12, 0.14, 0.16, 0.18] : cat === 'pesado' ? [0.2, 0.22, 0.25, 0.28, 0.31] : [0.14, 0.16, 0.18, 0.2, 0.22];
  const sts: (readonly [number, number, number])[] = cat === 'leve' ? [[0, 0, -3]] : cat === 'pesado' ? [[2.4, 0, -5]] : [[0, 2, 4]];
  for (const v of VOGAIS)
    for (const v2 of cat === 'guarda' ? [undefined, 'a', 'i', 'u'] as (Vogal | undefined)[] : [undefined])
      for (const t of durs)
        for (const c of cat === 'guarda' ? CONS.slice(0, 3) : CONS)
          for (const st of sts) {
            if (v2 === v) continue;
            saida.push({ desc: `${c ?? ''}${v}${v2 ? '>' + v2 : ''} t${t} st${st.join(',')}`, g: { silabas: [{ ...(c ? { c } : {}), v, ...(v2 ? { v2 } : {}), t, st }], ...(cat === 'leve' ? { vol: 0.8 } : cat === 'pesado' ? { aspereza: 0.15 } : {}) } });
          }
  return saida;
}

describe.runIf(process.env['SONS_BUSCA'] === '1')('busca de gritos curtos', () => {
  for (const cat of ['leve', 'pesado', 'guarda']) {
    it(`categoria ${cat}`, () => {
      const cands = candidatas(cat);
      const SEM_P: Escalas = { ...ESCALAS_VOZ, eP: Infinity };
      // estabilidade por candidato (R6): tom x0,97 / x1,03 / vol x0,9 com o tom REAL, com e sem P
      const estavel = (id: (typeof LUTADORES_COM_VOZ)[number], g: Grito): boolean => {
        const b = descreverGrito(perfilDe(id), g, { f0: null });
        return [{ tom: 0.97 }, { tom: 1.03 }, { vol: 0.9 }].every((v) => {
          const x = descreverGrito(perfilDe(id), g, { f0: null, ...v });
          return distancia(b, x, ESCALAS_VOZ).S < 0.35 && distancia(b, x, SEM_P).S < 0.35;
        });
      };
      const ok: boolean[][] = LUTADORES_COM_VOZ.map((id) => cands.map((c) => estavel(id, c.g)));
      console.log(`BUSCA ${cat}: candidatos estáveis por lutador: ${ok.map((l) => l.filter(Boolean).length).join(' ')}`);
      const D: Descritores[][] = LUTADORES_COM_VOZ.map((id) => cands.map((c) => descreverGrito(perfilDe(id), c.g)));
      const n = LUTADORES_COM_VOZ.length;
      const S = (i: number, a: number, j: number, b: number): number => {
        const x = D[i]?.[a] as Descritores;
        const y = D[j]?.[b] as Descritores;
        return Math.min(distancia(x, y, ESCALAS_VOZ).S, distancia(x, y, SEM_P).S);
      };
      const rng = criarRng(3);
      let melhorGlobal = { min: 0, escolha: [] as number[] };
      for (let rep = 0; rep < 12; rep++) {
        const validos = ok.map((l) => l.map((v, c) => (v ? c : -1)).filter((c) => c >= 0));
        const escolha = validos.map((l) => (l.length ? (l[rng.inteiro(l.length)] as number) : 0));
        const minDe = (e: number[]): number => {
          let m = Infinity;
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) m = Math.min(m, S(i, e[i] as number, j, e[j] as number));
          return m;
        };
        let atual = minDe(escolha);
        for (let it2 = 0; it2 < 40; it2++) {
          let melhorou = false;
          for (let i = 0; i < n; i++) {
            let bi = escolha[i] as number;
            let bm = atual;
            for (const c of validos[i] ?? []) {
              const t = escolha.slice();
              t[i] = c;
              const m = minDe(t);
              if (m > bm + 1e-9) { bm = m; bi = c; }
            }
            if (bi !== escolha[i]) { escolha[i] = bi; atual = bm; melhorou = true; }
          }
          if (!melhorou) break;
        }
        if (atual > melhorGlobal.min) melhorGlobal = { min: atual, escolha: escolha.slice() };
      }
      console.log(`BUSCA ${cat}: min ${melhorGlobal.min.toFixed(2)}\n   ${LUTADORES_COM_VOZ.map((id, i) => `${id}: ${cands[melhorGlobal.escolha[i] as number]?.desc}`).join('\n   ')}`);
    }, 900000);
  }
});
