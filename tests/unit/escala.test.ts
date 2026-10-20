import { describe, expect, it } from 'vitest';
import { calcularTamanhoCss } from '../../src/platform/escala';

describe('calcularTamanhoCss', () => {
  it('janela 16:9 ocupa tudo', () => {
    expect(calcularTamanhoCss(1920, 1080)).toEqual({ largura: 1920, altura: 1080 });
  });
  it('janela larga demais limita pela altura (barras laterais)', () => {
    expect(calcularTamanhoCss(2000, 540)).toEqual({ largura: 960, altura: 540 });
  });
  it('janela estreita limita pela largura (barras em cima/baixo)', () => {
    expect(calcularTamanhoCss(480, 1000)).toEqual({ largura: 480, altura: 270 });
  });
  it('janela degenerada nao explode', () => {
    expect(calcularTamanhoCss(0, 100)).toEqual({ largura: 0, altura: 0 });
  });
});
