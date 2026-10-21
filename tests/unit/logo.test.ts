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

describe('marca do torneio (paleta D1, Cobalto Real)', () => {
  it('usa os valores da proposta D1 (docs/proposta-logo-paleta-d.md, seção 2)', () => {
    expect(PALETA_MARCA.contornoInterno).toBe('#ffe08a');
    expect(PALETA_MARCA.contornoExterno).toBe('#07060f');
    expect(PALETA_MARCA.volumeLonge).toBe('#04040c');
    expect(PALETA_MARCA.volumePerto).toBe('#1b1650');
    expect(PALETA_MARCA.fioDeLuz).toBe('#f2f6ff');
    expect([...PALETA_MARCA.brilho]).toEqual([236, 244, 255]);
    expect([...PALETA_MARCA.anel]).toEqual(['#a8c8ff', '#2f63ff', '#a8c8ff']);
    expect(PALETA_MARCA.anelInterno).toBe('rgba(205,225,255,.55)');
    expect(PALETA_MARCA.halo).toBe('rgba(60,110,255,.30)');
    expect([...PALETA_MARCA.brasas]).toEqual(['#ffd27a', '#ff9a3d', '#ff5a12']); // as brasas continuam quentes (fogo de FIGHTERS)
  });

  it('o aro interno é claro (é o piso do contraste da borda: com um aro azul médio o 3:1 cairia para ~2,6:1)', () => {
    const lum = (hex: string): number => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const razao = (lum(PALETA_MARCA.contornoInterno) + 0.05) / (lum(PALETA_MARCA.contornoExterno) + 0.05);
    expect(lum(PALETA_MARCA.contornoInterno)).toBeGreaterThan(0.7);
    expect(razao).toBeGreaterThan(15); // proposta: 15,6:1
  });

  it('INNO é degradê azul-royal e FIGHTERS é o degradê brasa da paleta A, ambos com o contorno interno único (os pixels: logo.spec.ts)', () => {
    // o logo é desenhado em canvases do DOM (não existem no Node): aqui se confere o texto de PALAVRAS; a cor desenhada é medida no navegador
    const fonte = readFileSync('src/ui/logo.ts', 'utf8');
    const palavras = fonte.slice(fonte.indexOf('const PALAVRAS'), fonte.indexOf('];', fonte.indexOf('const PALAVRAS')));
    expect(palavras).toContain("fill: [[0, '#e8f0ff'], [0.4, '#93b4ff'], [0.5, '#0c2068'], [0.55, '#4f80ff'], [0.82, '#2452e2'], [1, '#aac6ff']]");
    expect(palavras).toContain("fill: [[0, '#fff3c4'], [0.42, '#ffbe33'], [0.56, '#ff5a12'], [1, '#b0101c']]");
    expect(palavras.match(/edge: PALETA_MARCA.contornoInterno/g)).toHaveLength(2);
    expect(palavras).not.toMatch(/9a5a12|ffe7a3|fffdf2/); // nada do ouro antigo do INNO
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
