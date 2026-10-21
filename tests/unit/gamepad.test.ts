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

  describe('especial segurado (spSeg: o MASHI do AMINU carrega segurando)', () => {
    it('R1 seguro = spSeg em todos os ticks; o toque do especial (sp) é só a borda do primeiro', () => {
      const t = new TeclasVirtuais();
      let atual: PadLike = pad([]);
      const g = new Gamepads(t, () => undefined, () => [atual]);
      g.consultar();
      expect(t.lerP1()).toMatchObject({ sp: false, spSeg: false });
      atual = pad([5]); // R1
      g.consultar();
      expect(t.lerP1()).toMatchObject({ sp: true, spSeg: true });
      for (let tick = 0; tick < 90; tick++) {
        t.fimDoTick();
        g.consultar(); // o jogo consulta uma vez por quadro, com o botão ainda apertado
        expect(t.lerP1(), 'tick ' + tick).toMatchObject({ sp: false, spSeg: true });
      }
      atual = pad([]);
      g.consultar();
      expect(t.lerP1()).toMatchObject({ sp: false, spSeg: false });
    });

    it('R2 também segura, e o controle 2 segura a tecla do jogador 2 sem mexer no jogador 1', () => {
      const t = new TeclasVirtuais();
      const g = new Gamepads(t, () => undefined, () => [pad([]), pad([7])]);
      g.consultar();
      // só 1 controle conectado e ele é o 0 -> P1; aqui o primeiro está conectado e sem botão, o segundo é P2
      expect(t.lerP2().spSeg).toBe(true);
      expect(t.lerP1().spSeg).toBe(false);
      expect(t.lerMesclado().spSeg).toBe(true);
    });

    it('R1 e R2 juntos, soltando um: o especial continua segurado até soltar os dois', () => {
      const t = new TeclasVirtuais();
      const avisos: string[] = [];
      let atual: PadLike = pad([5, 7]);
      const g = new Gamepads(t, (k) => avisos.push(k), () => [atual]);
      g.consultar();
      expect(avisos).toEqual(['b']); // um aviso só, não dois
      t.fimDoTick();
      atual = pad([7]); // soltou R1, R2 ainda apertado
      g.consultar();
      expect(t.lerP1().spSeg).toBe(true);
      atual = pad([5, 7]); // R1 apertou de novo com R2 ainda seguro: não é um novo toque
      g.consultar();
      expect(t.lerP1()).toMatchObject({ sp: false, spSeg: true });
      expect(avisos).toEqual(['b']);
      atual = pad([]);
      g.consultar();
      expect(t.lerP1().spSeg).toBe(false);
    });

    it('apertar o especial não atrapalha os outros botões nem o buffer de bordas', () => {
      const t = new TeclasVirtuais();
      let atual: PadLike = pad([5]);
      const g = new Gamepads(t, () => undefined, () => [atual]);
      g.consultar();
      t.fimDoTick();
      atual = pad([5, 2, 15]); // segura R1, aperta X (soco fraco) e direita
      g.consultar();
      expect(t.lerP1()).toEqual({ left: false, right: true, up: false, down: false, lp: true, hp: false, lk: false, hk: false, sp: false, spSeg: true });
      t.fimDoTick();
      g.consultar();
      expect(t.lerP1()).toMatchObject({ lp: false, right: true, spSeg: true });
    });

    it('desconectar o controle com o especial apertado solta o especial (não fica carregando para sempre)', () => {
      const t = new TeclasVirtuais();
      let lista: PadLike[] = [pad([5, 15])];
      const g = new Gamepads(t, () => undefined, () => lista);
      g.consultar();
      expect(t.lerP1()).toMatchObject({ right: true, spSeg: true });
      lista = [];
      g.consultar();
      expect(t.lerP1()).toMatchObject({ right: false, spSeg: false });
    });
  });
});
