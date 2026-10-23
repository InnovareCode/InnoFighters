import { describe, expect, it } from 'vitest';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import type { ComboProprio, Golpe } from '../../src/data/tipos';
import { teclasDoGolpe } from '../../src/ui/combos-tela';

/*
 * Nomes DEFINITIVOS dos combos próprios (Apolo, docs/combos-proprios.md). Este teste NÃO fixa o texto de nenhum nome: trocar um nome continua
 * livre, desde que ele siga as regras abaixo. A prova de que o nome cabe na caixa, com a fonte de verdade, é a de tests/e2e/combos-tela.spec.ts
 * (o nome não encosta nas teclas); aqui fica a rede barata que pega o nome comprido antes do navegador.
 */

const todos: Array<{ lutador: string; ficha: string | null; c: ComboProprio }> = ROSTER.flatMap((id) => {
  const def = LUTADORES[id];
  const base = def.combosProprios ?? [];
  const dasFichas = Object.entries(def.fichas ?? {}).flatMap(([ficha, f]) =>
    f.combosProprios && f.combosProprios !== base ? f.combosProprios.map((c) => ({ lutador: id, ficha: ficha as string | null, c })) : [],
  );
  return [...base.map((c) => ({ lutador: id, ficha: null as string | null, c })), ...dasFichas];
});

/** Limite absoluto de caracteres: a folga mínima medida com os nomes provisórios (34 px, no maior deles) dava só ~3 caracteres a mais. */
const MAX_CARACTERES = 24;

/*
 * Largura da faixa de teclas do teclado, na mesma conta de `desenharCombos` (src/ui/combos-tela.ts: tecla de 26 px, "+" de 10 px entre teclas
 * de um golpe, "›" de 14 px entre golpes) e a coluna MAIS ESTREITA (a pausa do TREINO: (960 - 120 - 8) / 2 = 416 px, com 10 px de margem de
 * cada lado). Se o desenho mudar, mude aqui também. 9 px por caractere é a média medida da Barlow 600 a 15 px em caixa alta (8,4 a 8,8 px nos
 * 20 nomes) com sobra; 4 px é o vão mínimo entre o nome e a 1ª tecla que o e2e exige.
 */
const COLUNA_DO_TREINO = 416;
const PX_POR_CARACTERE = 9;
const VAO_ATE_AS_TECLAS = 4;
function larguraDasTeclas(c: ComboProprio): number {
  const porGolpe = c.sequencia.map((g) => teclasDoGolpe(g).length);
  return porGolpe.reduce((s, n) => s + n * 26 + Math.max(0, n - 1) * 10, 0) + Math.max(0, porGolpe.length - 1) * 14;
}
const limiteDe = (c: ComboProprio): number =>
  Math.min(MAX_CARACTERES, Math.floor((COLUNA_DO_TREINO - 20 - larguraDasTeclas(c) - VAO_ATE_AS_TECLAS) / PX_POR_CARACTERE));

const normalizar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

describe('nomes dos combos próprios: regras de texto (sem fixar o texto)', () => {
  it('são os 20 combos da 1ª leva', () => {
    expect(todos).toHaveLength(20);
  });

  it('caixa alta, sem espaço sobrando nas pontas nem duplo', () => {
    for (const { c } of todos) {
      expect(c.nome, c.id).toBe(c.nome.trim());
      expect(c.nome, c.id).not.toMatch(/\s{2,}/);
      expect(c.nome, c.id).toBe(c.nome.toLocaleUpperCase('pt-BR'));
      expect(/[A-ZÀ-Ý]/.test(c.nome), `${c.id}: tem ao menos uma letra`).toBe(true);
    }
  });

  it('únicos no jogo todo (ignorando acento, pontuação e espaço)', () => {
    const vistos = new Map<string, string>();
    for (const { c } of todos) {
      const chave = normalizar(c.nome);
      expect(vistos.get(chave), `${c.id} repete o nome de ${vistos.get(chave) ?? ''}`).toBeUndefined();
      vistos.set(chave, c.id);
    }
  });

  it('não repetem o nome de um especial do próprio lutador (o combo não se confunde com o golpe que o fecha)', () => {
    for (const { lutador, c } of todos) {
      const def = LUTADORES[lutador as (typeof ROSTER)[number]];
      const golpes: Golpe[] = [def.especiais, ...Object.values(def.fichas ?? {}).map((f) => f.especiais ?? {})].flatMap((e) => Object.values(e) as Golpe[]);
      const especiais = new Set(golpes.map((g) => g.name).filter((n): n is string => typeof n === 'string').map(normalizar));
      expect(especiais.has(normalizar(c.nome)), `${c.id}: "${c.nome}" é nome de especial`).toBe(false);
    }
  });

  it(`cabem: no máximo ${MAX_CARACTERES} caracteres, e menos quando a faixa de teclas do combo é mais larga`, () => {
    for (const { c } of todos) {
      const n = [...c.nome].length;
      expect(n, `${c.id}: "${c.nome}" tem ${n} caracteres; o limite dele é ${limiteDe(c)}`).toBeLessThanOrEqual(limiteDe(c));
    }
  });

  it('a conta do limite morde: um nome de 24 caracteres não cabe no combo de 4 golpes da SARPA', () => {
    const sarpa = todos.find((t) => t.ficha === 'sarpa');
    expect(sarpa).toBeDefined();
    expect(limiteDe(sarpa!.c)).toBeLessThan(MAX_CARACTERES);
  });
});
