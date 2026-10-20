import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criarRng } from '../../src/core/rng';
import type { Ctx } from '../../src/render/tela';
import { Brasas, marca, PALETA_MARCA } from '../../src/ui/logo';

/** Contexto falso que grava toda atribuição de propriedade ([nome, valor]). */
function espiao() {
  const sets: Array<[string, unknown]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: () => () => undefined,
    set(_, nome: string, valor: unknown) {
      sets.push([nome, valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, sets };
}

describe('marca do torneio (paleta A, Ouro Forjado)', () => {
  it('usa os valores da proposta 1.3', () => {
    expect(PALETA_MARCA.contornoInterno).toBe('#ffe08a');
    expect(PALETA_MARCA.contornoExterno).toBe('#0b0306');
    expect(PALETA_MARCA.volumeLonge).toBe('#0a0204');
    expect(PALETA_MARCA.volumePerto).toBe('#4a0e0c');
    expect(PALETA_MARCA.fioDeLuz).toBe('#fff6dc');
    expect([...PALETA_MARCA.brilho]).toEqual([255, 246, 214]);
    expect([...PALETA_MARCA.anel]).toEqual(['#ffe08a', '#ff8a1e', '#ffe08a']);
    expect(PALETA_MARCA.halo).toBe('rgba(255,150,60,.30)');
  });

  it('as brasas só têm cores da família brasa, qualquer que seja a semente', () => {
    for (const semente of [1, 2, 99, 12345]) {
      const b = new Brasas(criarRng(semente));
      expect(b.lista).toHaveLength(70);
      expect(b.lista.every((e) => Number.isInteger(e.c) && e.c >= 0 && e.c < PALETA_MARCA.brasas.length)).toBe(true);
      const { ctx, sets } = espiao();
      b.desenhar(ctx, 30);
      const cores = new Set(sets.filter(([n]) => n === 'fillStyle').map(([, v]) => v as string));
      expect([...cores].every((c) => PALETA_MARCA.brasas.includes(c))).toBe(true);
      expect(cores.size).toBeGreaterThan(1); // usa a paleta toda, não uma cor só
    }
  });

  it('o emblema e as brasas não dependem dos lutadores (funcionam com qualquer tamanho de elenco)', () => {
    const fonte = readFileSync('src/ui/logo.ts', 'utf8');
    const emblema = fonte.slice(fonte.indexOf('export function desenharEmblema'), fonte.indexOf('export const marca'));
    const brasas = fonte.slice(fonte.indexOf('export class Brasas'), fonte.indexOf('/** Escurece em cima'));
    for (const trecho of [emblema, brasas]) {
      expect(trecho).not.toMatch(/LUTADORES|ROSTER|\.fire\b/);
    }
    expect(PALETA_MARCA.brasas.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
  });

  it('as cenas chamam o logo pelo objeto `marca` (um teste pode trocar as duas peças)', () => {
    expect(typeof marca.desenharLogo).toBe('function');
    expect(typeof marca.desenharEmblema).toBe('function');
    for (const f of ['boot', 'title', 'intro', 'menu']) {
      const src = readFileSync(`src/ui/cenas/${f}.ts`, 'utf8');
      expect(src, f).toMatch(/marca\.desenhar(Logo|Emblema)/);
      expect(src, f).not.toMatch(/(^|[^.\w])desenhar(Logo|Emblema)\(/m);
    }
  });
});
