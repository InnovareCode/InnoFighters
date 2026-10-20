import { describe, expect, it } from 'vitest';
import { criarRng } from '../../src/core/rng';
import { clamp, easeOut, lerp, overlap } from '../../src/core/math';

describe('rng (mulberry32)', () => {
  it('mesma semente => mesma sequencia; sementes diferentes divergem', () => {
    const a = criarRng(123), b = criarRng(123), c = criarRng(124);
    const sa = Array.from({ length: 8 }, () => a.proximo());
    expect(Array.from({ length: 8 }, () => b.proximo())).toEqual(sa);
    expect(Array.from({ length: 8 }, () => c.proximo())).not.toEqual(sa);
  });
  it('valores de referencia (trava a implementacao do mulberry32)', () => {
    const r = criarRng(1);
    expect([r.proximo(), r.proximo(), r.proximo()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });
  it('fica em [0,1) e entre/inteiro respeitam os limites', () => {
    const r = criarRng(7);
    for (let i = 0; i < 2000; i++) {
      const v = r.proximo();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const e = r.entre(-5, 5);
      expect(e).toBeGreaterThanOrEqual(-5);
      expect(e).toBeLessThan(5);
      const n = r.inteiro(3);
      expect([0, 1, 2]).toContain(n);
    }
  });
  it('estado() permite retomar a sequencia', () => {
    const a = criarRng(99);
    a.proximo();
    const b = criarRng(a.estado());
    expect(b.proximo()).toBe(a.proximo());
  });
  it('escolher em lista vazia lanca', () => {
    expect(() => criarRng(1).escolher([])).toThrow();
  });
});

describe('math', () => {
  it('clamp, lerp, easeOut', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(2)).toBe(1);
  });
  it('overlap: encostar na borda nao conta', () => {
    expect(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 })).toBe(true);
    expect(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
  });
});
