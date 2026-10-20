import { describe, expect, it } from 'vitest';
import { ALTURA, GROUND, LARGURA } from '../../src/core/constantes';
import { criarRng } from '../../src/core/rng';
import { aplicarCamera } from '../../src/render/camera';
import { CampoDePetalas, Efeitos } from '../../src/render/efeitos';
import { zoomIn } from '../../src/render/animacao';

describe('Efeitos', () => {
  it('poeira nasce rente ao chão e some sozinha', () => {
    const e = new Efeitos(criarRng(1));
    e.poeira(300, 6, 1);
    expect(e.particulas).toHaveLength(6);
    for (const p of e.particulas) {
      expect(p.dust).toBe(true);
      expect(p.y).toBeGreaterThan(GROUND - 6.001);
      expect(p.y).toBeLessThanOrEqual(GROUND);
      expect(p.x).toBeGreaterThanOrEqual(270);
      expect(p.x).toBeLessThanOrEqual(330);
    }
    for (let i = 0; i < 40; i++) e.avancar();
    expect(e.particulas).toHaveLength(0);
  });

  it('faíscas saem em todas as direções, sobem (-2) e caem com a gravidade', () => {
    const e = new Efeitos(criarRng(7));
    e.faiscas(100, 100, '#f00', 30);
    expect(e.particulas).toHaveLength(30);
    expect(e.particulas.every((p) => !p.dust && p.size >= 2 && p.size <= 5)).toBe(true);
    expect(e.particulas.some((p) => p.col === '#fff')).toBe(true);
    expect(e.particulas.some((p) => p.col === '#f00')).toBe(true);
    const antes = e.particulas[0]!.vy;
    e.avancar();
    expect(e.particulas[0]!.vy).toBeCloseTo(antes + 0.3, 9);
  });

  it('mesma semente, mesmos efeitos (determinismo)', () => {
    const a = new Efeitos(criarRng(42));
    const b = new Efeitos(criarRng(42));
    a.faiscas(1, 2, '#0f0', 10);
    b.faiscas(1, 2, '#0f0', 10);
    a.poeira(5, 3);
    b.poeira(5, 3);
    expect(a.particulas).toEqual(b.particulas);
  });

  it('estrela dura 10 ticks (14 se grande); escudo dura 9', () => {
    const e = new Efeitos(criarRng(3));
    e.estrela(0, 0, '#fff', false);
    e.estrela(0, 0, '#fff', true);
    e.escudo(0, 0, -1);
    expect(e.impactos.map((i) => i.max)).toEqual([10, 14, 9]);
    expect(e.impactos[2]).toMatchObject({ blk: true, dir: -1, col: '#9ad8ff' });
    for (let i = 0; i < 9; i++) e.avancar();
    expect(e.impactos.map((i) => i.max)).toEqual([10, 14]);
    for (let i = 0; i < 5; i++) e.avancar();
    expect(e.impactos).toHaveLength(0);
  });

  it('texto flutuante sobe 0,6 por tick e dura 50', () => {
    const e = new Efeitos(criarRng(3));
    e.textoFlutuante(10, 100, 'PERFECT', '#fff');
    e.avancar();
    expect(e.textos[0]?.y).toBeCloseTo(99.4, 9);
    for (let i = 0; i < 49; i++) e.avancar();
    expect(e.textos).toHaveLength(0);
  });

  it('limpar zera tudo', () => {
    const e = new Efeitos(criarRng(3));
    e.poeira(0, 3);
    e.textoFlutuante(0, 0, 'x', '#fff');
    e.limpar();
    expect(e.particulas).toHaveLength(0);
    expect(e.textos).toHaveLength(0);
  });
});

describe('CampoDePetalas', () => {
  it('luta tem 34 pétalas, menu tem 30', () => {
    expect(new CampoDePetalas(criarRng(1), 'luta').lista).toHaveLength(34);
    expect(new CampoDePetalas(criarRng(1), 'menu').lista).toHaveLength(30);
  });

  it('depois de muito tempo todas continuam dentro da área de reaproveitamento', () => {
    for (const v of ['luta', 'menu'] as const) {
      const c = new CampoDePetalas(criarRng(9), v);
      for (let t = 0; t < 3000; t++) c.avancar(t);
      for (const p of c.lista) {
        expect(p.y).toBeLessThanOrEqual(ALTURA + 10 + 1.3);
        expect(p.x).toBeLessThanOrEqual(LARGURA + 30 + 2.2);
        expect(Number.isFinite(p.rot)).toBe(true);
      }
    }
  });
});

describe('aplicarCamera', () => {
  function ctxGravador() {
    const chamadas: Array<[string, ...number[]]> = [];
    const ctx = {
      translate: (x: number, y: number) => chamadas.push(['translate', x, y]),
      scale: (x: number, y: number) => chamadas.push(['scale', x, y]),
    } as unknown as CanvasRenderingContext2D;
    return { ctx, chamadas };
  }

  it('zoom em torno de (cam.x, chão), sem tremor', () => {
    const { ctx, chamadas } = ctxGravador();
    aplicarCamera(ctx, { x: 400, z: 1.2 }, 0, criarRng(1));
    expect(chamadas).toEqual([
      ['translate', 400, GROUND],
      ['scale', 1.2, 1.2],
      ['translate', -400, -GROUND],
    ]);
  });

  it('tremor desloca no máximo a amplitude', () => {
    const { ctx, chamadas } = ctxGravador();
    aplicarCamera(ctx, { x: 480, z: 1 }, 8, criarRng(5));
    expect(chamadas).toHaveLength(4);
    const [, dx, dy] = chamadas[3]!;
    expect(Math.abs(dx!)).toBeLessThanOrEqual(8);
    expect(Math.abs(dy!)).toBeLessThanOrEqual(8);
  });
});

describe('zoomIn', () => {
  it('começa em 0,2, passa de 1 no meio e termina em 1', () => {
    expect(zoomIn(0)).toBeCloseTo(0.2, 9);
    expect(zoomIn(12)).toBe(1);
    expect(zoomIn(20)).toBe(1);
    expect(Math.max(...Array.from({ length: 12 }, (_, t) => zoomIn(t)))).toBeGreaterThan(1);
  });
});
