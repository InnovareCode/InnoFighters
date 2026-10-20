import { describe, expect, it } from 'vitest';
import { Gamepads, lerEstadoPad, type PadLike } from '../../src/input/gamepad';
import { TeclasVirtuais } from '../../src/input/teclas';

function pad(apertados: number[] = [], axes: number[] = [0, 0], connected = true): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: apertados.includes(i) }));
  return { connected, buttons, axes };
}

describe('lerEstadoPad', () => {
  it('direcional por botão ou por analógico (zona morta de 0,5)', () => {
    expect(lerEstadoPad(pad([14])).left).toBe(true);
    expect(lerEstadoPad(pad([], [-0.6, 0])).left).toBe(true);
    expect(lerEstadoPad(pad([], [0.5, 0])).right).toBe(false);
    expect(lerEstadoPad(pad([], [0, 0.51])).down).toBe(true);
    expect(lerEstadoPad(pad([], [0, -0.9])).up).toBe(true);
  });
  it('mapeia os botões de ação', () => {
    const s = lerEstadoPad(pad([0, 1, 2, 3, 5, 7, 9]));
    expect(s).toMatchObject({ a: true, b: true, x: true, y: true, r1: true, r2: true, start: true });
  });
  it('pad sem botões/eixos não explode', () => {
    expect(lerEstadoPad({ connected: true, buttons: [], axes: [] }).left).toBe(false);
  });
});

describe('Gamepads', () => {
  it('controle 0 age como P1 e gera borda só na descida', () => {
    const t = new TeclasVirtuais();
    const abaixo: string[] = [];
    let atual: PadLike = pad([2]); // X -> z (soco fraco)
    const g = new Gamepads(t, (k) => abaixo.push(k), () => [atual]);
    g.consultar();
    expect(t.lerP1().lp).toBe(true);
    expect(abaixo).toEqual(['z']);
    t.fimDoTick();
    g.consultar(); // segurando: nada novo
    expect(t.lerP1().lp).toBe(false);
    expect(abaixo).toEqual(['z']);
    atual = pad([]);
    g.consultar();
    expect(t.estaSegurada('z')).toBe(false);
  });

  it('só conta controles conectados; o segundo conectado vira jogador 2; o terceiro é ignorado', () => {
    const t = new TeclasVirtuais();
    const g = new Gamepads(t, () => undefined, () => [pad([], [0, 0], false), pad([15]), pad([14]), pad([13])]);
    g.consultar();
    expect(t.lerP1().right).toBe(true);
    expect(t.lerP2().left).toBe(true);
    expect(t.lerP1().down).toBe(false);
    expect(t.lerP2().down).toBe(false);
  });

  it('um erro na leitura desliga o gamepad em silêncio (como o protótipo)', () => {
    const t = new TeclasVirtuais();
    let chamadas = 0;
    const g = new Gamepads(t, () => undefined, () => {
      chamadas++;
      throw new Error('navegador sem suporte');
    });
    expect(() => g.consultar()).not.toThrow();
    g.consultar();
    expect(chamadas).toBe(1);
  });

  it('sem getGamepads não faz nada', () => {
    const g = new Gamepads(new TeclasVirtuais(), () => undefined, () => null);
    expect(() => g.consultar()).not.toThrow();
  });
});
