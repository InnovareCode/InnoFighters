import { describe, expect, it } from 'vitest';
import { posicaoLogica } from '../../src/input/mouse';
import { TeclasVirtuais } from '../../src/input/teclas';
import { direcoesDoKnob, limitarKnob, ligarToque } from '../../src/input/toque';

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

// ---- camada de toque sem navegador: elementos falsos que recebem os mesmos eventos do celular ----
class ElFalso extends EventTarget {
  readonly classes = new Set<string>();
  readonly style = { transform: '' };
  readonly classList = { add: (c: string) => this.classes.add(c), remove: (c: string) => this.classes.delete(c) };
  constructor(
    readonly id: string,
    private readonly dataK: string | null = null,
    private readonly caixa = { left: 0, top: 0, width: 100, height: 100 },
  ) {
    super();
  }
  getAttribute(nome: string): string | null {
    return nome === 'data-k' ? this.dataK : null;
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return this.caixa;
  }
}

function celular() {
  const botoes = new Map<string, ElFalso>();
  for (const [id, k] of [['lp', 'z'], ['hp', 'x'], ['lk', 'c'], ['hk', 'v'], ['r1', 'b']] as const) botoes.set(id, new ElFalso(id, k));
  const joy = new ElFalso('joy');
  const knob = new ElFalso('knob');
  const canvas = new ElFalso('jogo');
  const corpo = new ElFalso('body');
  const alvo = {
    ontouchstart: null,
    navigator: { maxTouchPoints: 5 },
    document: {
      body: corpo,
      querySelectorAll: () => [...botoes.values()],
      getElementById: (id: string) => (id === 'joy' ? joy : id === 'knob' ? knob : null),
    },
  } as unknown as Window;
  const teclas = new TeclasVirtuais();
  const avisos: string[] = [];
  const desligar = ligarToque({ alvo, teclas, canvas: canvas as unknown as HTMLCanvasElement, aoTecla: (k) => avisos.push(k) });
  /** Dispara um evento de toque no elemento, com os dedos de `ids` (todos no centro do elemento). */
  const sobre = (el: ElFalso, tipo: string, ids: number[]): void => {
    const dedos = ids.map((identifier) => ({ identifier, clientX: 50, clientY: 50 }));
    const lista = Object.assign(dedos, { item: (n: number) => dedos[n] ?? null });
    el.dispatchEvent(Object.assign(new Event(tipo, { cancelable: true }), { changedTouches: lista, touches: lista }));
  };
  return { botoes, joy, teclas, avisos, desligar, sobre, corpo };
}

describe('botão ESPECIAL do toque (R1 · ESPECIAL): segurar = spSeg, como o teclado', () => {
  it('o aparelho com toque liga a camada e marca o corpo', () => {
    const c = celular();
    expect(c.desligar).not.toBeNull();
    expect(c.corpo.classes.has('touch')).toBe(true);
  });

  it('dedo no ESPECIAL: sp só no 1º tick, spSeg em todos enquanto segura; soltar limpa', () => {
    const c = celular();
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    expect(c.teclas.lerP1()).toMatchObject({ sp: true, spSeg: true });
    expect(c.avisos).toEqual(['b']);
    for (let tick = 0; tick < 90; tick++) {
      c.teclas.fimDoTick();
      expect(c.teclas.lerP1(), 'tick ' + tick).toMatchObject({ sp: false, spSeg: true });
    }
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchend', [1]);
    expect(c.teclas.lerP1()).toMatchObject({ sp: false, spSeg: false });
    expect([...c.botoes.get('r1')!.classes]).toEqual([]);
  });

  it('toque curto (descer e subir antes do tick): o golpe ainda dispara (sp) e não sobra spSeg', () => {
    const c = celular();
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchend', [1]);
    expect(c.teclas.lerP1()).toMatchObject({ sp: true, spSeg: false });
    c.teclas.fimDoTick();
    expect(c.teclas.lerP1()).toMatchObject({ sp: false, spSeg: false });
  });

  it('segurar o ESPECIAL e apertar os outros botões: cada um segue o seu, o ESPECIAL não solta', () => {
    const c = celular();
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    c.teclas.fimDoTick();
    c.sobre(c.botoes.get('lp') as ElFalso, 'touchstart', [2]);
    expect(c.teclas.lerP1()).toMatchObject({ lp: true, hp: false, sp: false, spSeg: true });
    c.teclas.fimDoTick();
    c.sobre(c.botoes.get('lp') as ElFalso, 'touchend', [2]);
    expect(c.teclas.lerP1()).toMatchObject({ lp: false, spSeg: true });
    // e o contrário: os outros botões, sozinhos, nunca produzem spSeg
    for (const id of ['lp', 'hp', 'lk', 'hk']) {
      c.sobre(c.botoes.get(id) as ElFalso, 'touchstart', [3]);
      expect(c.teclas.lerP1().spSeg, id).toBe(true); // o ESPECIAL continua apertado
      c.sobre(c.botoes.get(id) as ElFalso, 'touchend', [3]);
    }
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchend', [1]);
    for (const id of ['lp', 'hp', 'lk', 'hk']) {
      c.sobre(c.botoes.get(id) as ElFalso, 'touchstart', [4]);
      expect(c.teclas.lerP1().spSeg, id).toBe(false);
      c.sobre(c.botoes.get(id) as ElFalso, 'touchend', [4]);
    }
  });

  it('touchcancel (ligação, gesto do sistema) solta o ESPECIAL', () => {
    const c = celular();
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchcancel', [1]);
    expect(c.teclas.lerP1().spSeg).toBe(false);
  });

  it('segurar o ESPECIAL e mexer o joystick: setas e spSeg juntos', () => {
    const c = celular();
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    c.sobre(c.joy, 'touchstart', [2]); // dedo em (50,50) = centro da caixa 100x100: sem direção
    expect(c.teclas.lerP1()).toMatchObject({ left: false, right: false, spSeg: true });
    c.sobre(c.joy, 'touchend', [2]);
    expect(c.teclas.lerP1().spSeg).toBe(true);
  });
});
