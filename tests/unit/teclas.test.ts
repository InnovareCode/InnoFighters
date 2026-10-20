import { describe, expect, it } from 'vitest';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { CTRL_P1, CTRL_P2 } from '../../src/input/mapa';
import { normalizarTecla, TeclasVirtuais } from '../../src/input/teclas';

describe('TeclasVirtuais (C2 = readInput do protótipo)', () => {
  it('sem teclas, o InputFrame é vazio', () => {
    expect(new TeclasVirtuais().lerP1()).toEqual(INPUT_VAZIO);
  });

  it('direções são estado segurado; golpes são borda de descida', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowLeft', true);
    t.definir('z', true);
    expect(t.lerP1()).toEqual({ ...INPUT_VAZIO, left: true, lp: true });
    t.fimDoTick();
    // seguiu apertando: direção continua, golpe não repete
    expect(t.lerP1()).toEqual({ ...INPUT_VAZIO, left: true });
  });

  it('soltar e apertar de novo gera nova borda', () => {
    const t = new TeclasVirtuais();
    t.definir('x', true);
    t.fimDoTick();
    t.definir('x', false);
    t.definir('x', true);
    expect(t.lerP1().hp).toBe(true);
  });

  it('repetição de tecla já segurada não gera borda', () => {
    const t = new TeclasVirtuais();
    t.definir('c', true);
    t.fimDoTick();
    t.definir('c', true);
    expect(t.lerP1().lk).toBe(false);
  });

  it('apertar e soltar dentro do mesmo tick ainda conta o golpe', () => {
    const t = new TeclasVirtuais();
    t.definir('v', true);
    t.definir('v', false);
    expect(t.lerP1().hk).toBe(true);
    expect(t.estaSegurada('v')).toBe(false);
  });

  it('P1 e P2 leem teclas diferentes', () => {
    const t = new TeclasVirtuais();
    t.definir('a', true);
    t.definir('j', true);
    expect(t.lerP1()).toEqual(INPUT_VAZIO);
    expect(t.lerP2()).toEqual({ ...INPUT_VAZIO, left: true, lp: true });
  });

  it('lerMesclado faz o OR dos dois mapas', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowUp', true);
    t.definir('l', true);
    t.definir('d', true);
    expect(t.lerMesclado()).toEqual({ ...INPUT_VAZIO, up: true, right: true, sp: true });
  });

  it('soltarTodas (perda de foco) solta direções', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowRight', true);
    t.soltarTodas();
    expect(t.lerP1().right).toBe(false);
  });

  it('os mapas cobrem as nove ações sem repetir tecla', () => {
    const todas = [...Object.values(CTRL_P1), ...Object.values(CTRL_P2)];
    expect(todas).toHaveLength(18);
    expect(new Set(todas).size).toBe(18);
  });
});

describe('normalizarTecla', () => {
  it('letras viram minúsculas; nomes longos ficam como vêm', () => {
    expect(normalizarTecla('Z')).toBe('z');
    expect(normalizarTecla('ArrowLeft')).toBe('ArrowLeft');
    expect(normalizarTecla(' ')).toBe(' ');
    expect(normalizarTecla('Escape')).toBe('Escape');
  });
});
