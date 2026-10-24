import { describe, expect, it } from 'vitest';
import { posicaoLogica } from '../../src/input/mouse';
import { TeclasVirtuais } from '../../src/input/teclas';
import { direcoesDoKnob, limitarKnob, ligarToque } from '../../src/input/toque';

describe('joystick de toque (U1: zonas angulares + histerese; já não são os limiares do protótipo)', () => {
  const R = 100;
  /** O ponto a `r` (fração do raio) e `graus` acima do eixo horizontal, para a direita (dy negativo = para cima). */
  const polar = (r: number, graus: number, sinalY: 1 | -1 = -1): [number, number] => [R * r * Math.cos((graus * Math.PI) / 180), sinalY * R * r * Math.sin((graus * Math.PI) / 180)];
  const so = (d: Record<string, boolean>): string[] => Object.entries(d).filter(([, v]) => v).map(([k]) => k);

  it('no centro nada está ativo', () => {
    expect(direcoesDoKnob(0, 0, R)).toEqual({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false });
  });

  it('horizontal LIGA a 25% do raio (como o protótipo) e DESLIGA só abaixo de 15% (histerese)', () => {
    expect(direcoesDoKnob(-24, 0, R).ArrowLeft).toBe(false);
    expect(direcoesDoKnob(-26, 0, R).ArrowLeft).toBe(true);
    expect(direcoesDoKnob(26, 0, R).ArrowRight).toBe(true);
    const ligada = { ArrowLeft: false, ArrowRight: true, ArrowUp: false, ArrowDown: false };
    expect(direcoesDoKnob(20, 0, R).ArrowRight, 'sem histórico, 20% não liga').toBe(false);
    expect(direcoesDoKnob(20, 0, R, ligada).ArrowRight, 'já ligada, 20% segura').toBe(true);
    expect(direcoesDoKnob(16, 0, R, ligada).ArrowRight).toBe(true);
    expect(direcoesDoKnob(14, 0, R, ligada).ArrowRight).toBe(false);
  });

  it('vertical: cima liga a 35% (desliga a 25%), baixo a 30% (desliga a 20%)', () => {
    expect(direcoesDoKnob(0, -34, R).ArrowUp).toBe(false);
    expect(direcoesDoKnob(0, -36, R).ArrowUp).toBe(true);
    expect(direcoesDoKnob(0, 29, R).ArrowDown).toBe(false);
    expect(direcoesDoKnob(0, 31, R).ArrowDown).toBe(true);
    expect(direcoesDoKnob(0, -28, R, { ArrowLeft: false, ArrowRight: false, ArrowUp: true, ArrowDown: false }).ArrowUp).toBe(true);
    expect(direcoesDoKnob(0, 22, R, { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: true }).ArrowDown).toBe(true);
    expect(direcoesDoKnob(0, 18, R, { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: true }).ArrowDown).toBe(false);
  });

  it('EMPURRAR PARA A DIREITA com deriva de até 34° (para cima ou para baixo) é só andar: nada de pular nem agachar', () => {
    for (let g = 0; g <= 34; g += 2) {
      for (const sinal of [-1, 1] as const) {
        const [dx, dy] = polar(0.85, g, sinal);
        expect(so(direcoesDoKnob(dx, dy, R)), `${g}° ${sinal < 0 ? 'p/ cima' : 'p/ baixo'}`).toEqual(['ArrowRight']);
      }
    }
  });

  it('só vertical acima de 55°: pular/agachar exigem o dedo claramente para cima/baixo, sem andar junto', () => {
    for (const g of [56, 65, 80, 90]) {
      expect(so(direcoesDoKnob(...polar(0.85, g, -1), R)), `${g}° cima`).toEqual(['ArrowUp']);
      expect(so(direcoesDoKnob(...polar(0.85, g, 1), R)), `${g}° baixo`).toEqual(['ArrowDown']);
    }
  });

  it('a DIAGONAL só com ângulo claro (36° a 54°): as duas direções', () => {
    for (const g of [38, 45, 52]) {
      expect(so(direcoesDoKnob(...polar(0.85, g, -1), R)), `${g}° cima`).toEqual(['ArrowRight', 'ArrowUp']);
      expect(so(direcoesDoKnob(...polar(0.85, g, 1), R)), `${g}° baixo`).toEqual(['ArrowRight', 'ArrowDown']);
    }
    // o oposto também (esquerda)
    expect(so(direcoesDoKnob(-40, 40, R))).toEqual(['ArrowLeft', 'ArrowDown']);
  });

  it('histerese ANGULAR: quem já anda (só horizontal) segue andando até ~41°; quem parte do centro vira diagonal a partir de 35°', () => {
    const andando = { ArrowLeft: false, ArrowRight: true, ArrowUp: false, ArrowDown: false };
    expect(so(direcoesDoKnob(...polar(0.85, 40, -1), R, andando))).toEqual(['ArrowRight']);
    expect(so(direcoesDoKnob(...polar(0.85, 40, -1), R))).toEqual(['ArrowRight', 'ArrowUp']);
    expect(so(direcoesDoKnob(...polar(0.85, 43, -1), R, andando))).toEqual(['ArrowRight', 'ArrowUp']);
    // e o vertical: quem já está pulando só volta a andar abaixo de ~49°
    const pulando = { ArrowLeft: false, ArrowRight: false, ArrowUp: true, ArrowDown: false };
    expect(so(direcoesDoKnob(...polar(0.85, 52, -1), R, pulando))).toEqual(['ArrowUp']);
    expect(so(direcoesDoKnob(...polar(0.85, 52, -1), R))).toEqual(['ArrowRight', 'ArrowUp']);
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
    private readonly dataNivel: string | null = null,
  ) {
    super();
  }
  getAttribute(nome: string): string | null {
    return nome === 'data-k' ? this.dataK : nome === 'data-nivel' ? this.dataNivel : null;
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return this.caixa;
  }
}

function celular(opcoes: { nivelDoEspecial?: string } = {}) {
  const botoes = new Map<string, ElFalso>();
  for (const [id, k] of [['lp', 'z'], ['hp', 'x'], ['lk', 'c'], ['hk', 'v'], ['r1', 'b']] as const) {
    botoes.set(id, id === 'r1' && opcoes.nivelDoEspecial ? new ElFalso(id, k, undefined, opcoes.nivelDoEspecial) : new ElFalso(id, k));
  }
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
  /** Dedo `id` no joystick (caixa 100x100: centro em 50,50; raio 50) na posição (x, y) relativa ao CENTRO, em fração do raio. */
  const joyDedo = (tipo: 'touchstart' | 'touchmove' | 'touchend', id: number, x: number, y: number): void => {
    const dedos = [{ identifier: id, clientX: 50 + x * 50, clientY: 50 + y * 50 }];
    const lista = Object.assign(dedos, { item: (n: number) => dedos[n] ?? null });
    const nenhum = Object.assign([], { item: () => null });
    joy.dispatchEvent(Object.assign(new Event(tipo, { cancelable: true }), { changedTouches: lista, touches: tipo === 'touchend' ? nenhum : lista }));
  };
  return { botoes, joy, teclas, avisos, desligar, sobre, corpo, joyDedo };
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

describe('camada do joystick (U1 soltura mínima + U2 trava de 1 tick), com toques sobre o elemento', () => {
  const dir = (c: ReturnType<typeof celular>) => {
    const f = c.teclas.lerP1();
    return [f.left && 'left', f.right && 'right', f.up && 'up', f.down && 'down'].filter(Boolean);
  };

  it('empurrar para a direita com 30° de deriva para cima: só anda (antes: andar + pular)', () => {
    const c = celular();
    c.joyDedo('touchstart', 1, 0.85 * Math.cos(0.52), -0.85 * Math.sin(0.52));
    expect(dir(c)).toEqual(['right']);
  });

  it('sair da zona NÃO solta na hora: a direção segura mais 2 ticks (e só então solta)', () => {
    const c = celular();
    c.joyDedo('touchstart', 1, 0.8, 0);
    c.teclas.fimDoTick();
    c.joyDedo('touchmove', 1, 0, 0); // centro: saiu da zona
    expect(dir(c), 'tick 1 depois de sair').toEqual(['right']);
    c.teclas.fimDoTick();
    expect(dir(c), 'tick 2').toEqual(['right']);
    c.teclas.fimDoTick();
    expect(dir(c), 'tick 3: soltou').toEqual([]);
  });

  it('tremer no limiar (sair e voltar em até 2 ticks) NUNCA vira "soltou e apertou": sem nova borda de direção e sem novo aviso (dash)', () => {
    const c = celular();
    c.joyDedo('touchstart', 1, 0.8, 0);
    expect(c.avisos).toEqual(['ArrowRight']);
    c.teclas.fimDoTick();
    c.joyDedo('touchmove', 1, 0.05, 0); // fora
    c.teclas.fimDoTick();
    c.joyDedo('touchmove', 1, 0.8, 0); // dentro de novo, dentro do prazo
    for (let i = 0; i < 6; i++) {
      expect(dir(c), `tick ${i}`).toEqual(['right']);
      c.teclas.fimDoTick();
    }
    expect(c.avisos, 'um único aviso de descida: não houve segunda').toEqual(['ArrowRight']);
  });

  it('trocar de lado solta a oposta NA HORA (nunca esquerda+direita juntas)', () => {
    const c = celular();
    c.joyDedo('touchstart', 1, 0.8, 0);
    c.joyDedo('touchmove', 1, -0.8, 0);
    expect(dir(c)).toEqual(['left']);
  });

  it('levantar o dedo para na hora (intenção explícita), sem o prazo de 2 ticks', () => {
    const c = celular();
    c.joyDedo('touchstart', 1, 0.8, 0);
    c.teclas.fimDoTick();
    c.joyDedo('touchend', 1, 0.8, 0);
    expect(dir(c)).toEqual([]);
  });

  it('U2: encostar o dedo na direção e levantar dentro do MESMO tick ainda vale 1 tick (como a borda do botão)', () => {
    const c = celular();
    c.joyDedo('touchstart', 1, 0.8, 0);
    c.joyDedo('touchend', 1, 0.8, 0);
    expect(dir(c), 'o tick lê a direção').toEqual(['right']);
    c.teclas.fimDoTick();
    expect(dir(c), 'e só por 1 tick').toEqual([]);
  });

  it('levantar o dedo do joystick não solta a seta que o TECLADO está segurando', () => {
    const c = celular();
    c.teclas.definir('ArrowLeft', true); // teclado
    c.joyDedo('touchstart', 1, 0.8, 0);
    c.joyDedo('touchend', 1, 0.8, 0);
    expect(c.teclas.lerP1().left).toBe(true);
  });
});

describe('U4: dedo no ESPECIAL com `data-nivel` — spSeg só depois de N ticks (a borda `sp` sai na hora)', () => {
  it('sem o atributo (o HTML de hoje): spSeg na hora, como antes', () => {
    const c = celular();
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    expect(c.teclas.lerP1()).toMatchObject({ sp: true, spSeg: true });
  });

  it('com data-nivel=12: sp na hora; spSeg falso por 12 ticks e verdadeiro a partir do 13º', () => {
    const c = celular({ nivelDoEspecial: '12' });
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    expect(c.teclas.lerP1()).toMatchObject({ sp: true, spSeg: false });
    for (let t = 1; t <= 12; t++) {
      c.teclas.fimDoTick();
      expect(c.teclas.lerP1().spSeg, `tick ${t}`).toBe(t >= 12);
    }
  });

  it('soltar antes dos 12 ticks: o toque (sp) existiu, o spSeg nunca apareceu', () => {
    const c = celular({ nivelDoEspecial: '12' });
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchstart', [1]);
    for (let t = 0; t < 8; t++) {
      expect(c.teclas.lerP1().spSeg).toBe(false);
      c.teclas.fimDoTick();
    }
    c.sobre(c.botoes.get('r1') as ElFalso, 'touchend', [1]);
    c.teclas.fimDoTick();
    c.teclas.fimDoTick();
    expect(c.teclas.lerP1()).toMatchObject({ sp: false, spSeg: false });
  });
});
