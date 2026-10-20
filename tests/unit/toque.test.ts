import { describe, expect, it } from 'vitest';
import { posicaoLogica } from '../../src/input/mouse';
import { direcoesDoKnob, limitarKnob } from '../../src/input/toque';

describe('joystick de toque (limiares do protótipo)', () => {
  const R = 100;
  it('no centro nada está ativo', () => {
    expect(direcoesDoKnob(0, 0, R)).toEqual({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false });
  });
  it('horizontal ativa a partir de 25% do raio', () => {
    expect(direcoesDoKnob(-24, 0, R).ArrowLeft).toBe(false);
    expect(direcoesDoKnob(-26, 0, R).ArrowLeft).toBe(true);
    expect(direcoesDoKnob(26, 0, R).ArrowRight).toBe(true);
  });
  it('vertical: cima a 35%, baixo a 30%', () => {
    expect(direcoesDoKnob(0, -34, R).ArrowUp).toBe(false);
    expect(direcoesDoKnob(0, -36, R).ArrowUp).toBe(true);
    expect(direcoesDoKnob(0, 29, R).ArrowDown).toBe(false);
    expect(direcoesDoKnob(0, 31, R).ArrowDown).toBe(true);
  });
  it('diagonal ativa as duas direções', () => {
    const d = direcoesDoKnob(40, 40, R);
    expect(d.ArrowRight && d.ArrowDown).toBe(true);
  });
  it('o knob nunca passa de 85% do raio e mantém a direção', () => {
    const p = limitarKnob(300, 400, R);
    expect(Math.hypot(p.dx, p.dy)).toBeCloseTo(85, 6);
    expect(p.dy / p.dx).toBeCloseTo(4 / 3, 6);
    expect(limitarKnob(10, -20, R)).toEqual({ dx: 10, dy: -20 });
  });
});

describe('posicaoLogica', () => {
  it('converte px da janela para o espaço 960x540', () => {
    const caixa = { left: 100, top: 50, width: 480, height: 270 };
    expect(posicaoLogica(caixa, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(posicaoLogica(caixa, 340, 185)).toEqual({ x: 480, y: 270 });
    expect(posicaoLogica(caixa, 580, 320)).toEqual({ x: 960, y: 540 });
  });
});
