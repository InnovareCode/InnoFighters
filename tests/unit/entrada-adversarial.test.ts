import { describe, expect, it } from 'vitest';
import { Gamepads, lerEstadoPad, type PadLike } from '../../src/input/gamepad';
import { TeclasVirtuais } from '../../src/input/teclas';
import { ligarToque } from '../../src/input/toque';

/*
 * QA adversarial da ENTRADA (Íris): gamepad (R1+R2, L1+L2, desconexão com botão apertado, renumeração de controles), borda de teclas e
 * toque (touchcancel, dedos extras). Complementa gamepad.test.ts e toque.test.ts. Convenção `it.fails` = bug real conhecido.
 */
function pad(apertados: number[] = [], axes: number[] = [0, 0], connected = true): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: apertados.includes(i) }));
  return { connected, buttons, axes };
}
const R1 = 5;
const R2 = 7;
const L1 = 4;
const L2 = 6;

describe('gamepad: L1 e L2 = ESQUIVA (tecla n do P1, o do P2), como R1/R2 são o especial', () => {
  it('L1 e L2 geram a borda da esquiva SÓ no 1º tick (segurar não repete) e não mexem no especial', () => {
    for (const botao of [L1, L2]) {
      const t = new TeclasVirtuais();
      let atual = pad([]);
      const g = new Gamepads(t, () => undefined, () => [atual]);
      g.consultar();
      atual = pad([botao]);
      g.consultar();
      expect(t.lerP1(), 'botão ' + botao).toMatchObject({ esq: true, sp: false, spSeg: false });
      for (let k = 0; k < 30; k++) {
        t.fimDoTick();
        g.consultar();
        expect(t.lerP1().esq, `botão ${botao} tick ${k}`).toBe(false);
      }
      atual = pad([]);
      g.consultar();
      t.fimDoTick();
      atual = pad([botao]);
      g.consultar();
      expect(t.lerP1().esq).toBe(true); // soltou e apertou de novo: nova borda
    }
  });

  it('L1+L2 juntos: um aviso só; soltar um dos dois não gera nova borda nem solta a tecla; reapertar o solto com o outro seguro também não', () => {
    const t = new TeclasVirtuais();
    const avisos: string[] = [];
    let atual = pad([L1, L2]);
    const g = new Gamepads(t, (k) => avisos.push(k), () => [atual]);
    g.consultar();
    expect(avisos).toEqual(['n']);
    t.fimDoTick();
    atual = pad([L2]);
    g.consultar();
    expect(t.estaSegurada('n')).toBe(true);
    expect(t.lerP1().esq).toBe(false);
    atual = pad([L1, L2]);
    g.consultar();
    expect(t.lerP1().esq).toBe(false);
    expect(avisos).toEqual(['n']);
    atual = pad([]);
    g.consultar();
    expect(t.estaSegurada('n')).toBe(false);
  });

  it('o controle 2 usa a tecla do P2 (o) sem acender a esquiva do P1', () => {
    const t = new TeclasVirtuais();
    const g = new Gamepads(t, () => undefined, () => [pad([]), pad([L1])]);
    g.consultar();
    expect(t.lerP2().esq).toBe(true);
    expect(t.lerP1().esq).toBe(false);
    expect(t.lerMesclado().esq).toBe(true);
  });

  it('ESQUIVA e ESPECIAL no mesmo instante (L1 + R1): as duas bordas chegam no mesmo quadro', () => {
    const t = new TeclasVirtuais();
    const g = new Gamepads(t, () => undefined, () => [pad([L1, R1])]);
    g.consultar();
    expect(t.lerP1()).toMatchObject({ esq: true, sp: true, spSeg: true });
  });
});

describe('gamepad: desconexão e renumeração', () => {
  it('controle desconectado com R1+R2 e L1+L2 apertados solta o especial e a esquiva', () => {
    const t = new TeclasVirtuais();
    let lista: PadLike[] = [pad([R1, R2, L1, L2, 15])];
    const g = new Gamepads(t, () => undefined, () => lista);
    g.consultar();
    expect(t.estaSegurada('b') && t.estaSegurada('n') && t.estaSegurada('ArrowRight')).toBe(true);
    lista = [];
    g.consultar();
    expect(t.estaSegurada('b') || t.estaSegurada('n') || t.estaSegurada('ArrowRight')).toBe(false);
    expect(t.lerP1()).toMatchObject({ spSeg: false, right: false });
  });

  it('entrada do controle que fica na lista com connected:false e botão "apertado" também solta tudo', () => {
    const t = new TeclasVirtuais();
    let lista: PadLike[] = [pad([R1, L1])];
    const g = new Gamepads(t, () => undefined, () => lista);
    g.consultar();
    lista = [pad([R1, L1], [0, 0], false)];
    g.consultar();
    expect(t.lerP1().spSeg).toBe(false);
    expect(t.estaSegurada('n')).toBe(false);
  });

  it('reconectar com o botão ainda apertado gera UMA borda nova (não fica sem resposta nem repete)', () => {
    const t = new TeclasVirtuais();
    let lista: PadLike[] = [pad([R1])];
    const avisos: string[] = [];
    const g = new Gamepads(t, (k) => avisos.push(k), () => lista);
    g.consultar();
    lista = [];
    g.consultar();
    t.fimDoTick();
    lista = [pad([R1])];
    g.consultar();
    expect(avisos).toEqual(['b', 'b']);
    expect(t.lerP1()).toMatchObject({ sp: true, spSeg: true });
    t.fimDoTick();
    g.consultar();
    expect(t.lerP1().sp).toBe(false);
  });

  it('quando o controle do P1 cai, o botão que o P2 já segurava NÃO vira um golpe novo do P1 (o controle 2 continua sendo o slot 1)', () => {
    // Causa provável: Gamepads.consultar (gamepad.ts:56-72) filtra os `connected` e numera pela POSIÇÃO na lista filtrada. Sem o controle 1,
    // o controle 2 passa a ser o slot 0, cujo `anterior` era o estado do controle 1 (vazio): o botão que o P2 já segurava aparece como
    // "descida nova" nas teclas do P1 (borda fantasma, ex.: um soco do P1 ou o ESP do MASHI) e o slot 1 solta as teclas do P2.
    const t = new TeclasVirtuais();
    let lista: Array<PadLike | null> = [pad([]), pad([2])]; // o controle 2 segura X (soco fraco do P2) há muito tempo
    const g = new Gamepads(t, () => undefined, () => lista);
    g.consultar();
    t.fimDoTick();
    expect(t.lerP2().lp).toBe(false); // só a borda inicial, já consumida
    lista = [null, pad([2])]; // o controle 1 desconecta (a lista do navegador mantém o índice do segundo)
    g.consultar();
    expect(t.lerP1().lp).toBe(false); // nada novo foi apertado por ninguém
  });

  it('analógico com NaN, ±0,5 exato e botões ausentes não geram direção nem erro', () => {
    expect(lerEstadoPad({ connected: true, buttons: [], axes: [Number.NaN, Number.NaN] })).toMatchObject({ left: false, right: false, up: false, down: false, l1: false, l2: false });
    expect(lerEstadoPad(pad([], [-0.5, 0.5])).left).toBe(false);
    expect(lerEstadoPad(pad([], [-0.5, 0.5])).down).toBe(false);
  });
});

// ---- toque com DOM falso -------------------------------------------------------------------------------------------
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
  for (const [id, k] of [['lp', 'z'], ['hp', 'x'], ['lk', 'c'], ['hk', 'v'], ['r1', 'b'], ['esq', 'n']] as const) botoes.set(id, new ElFalso(id, k));
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
  /** Dispara um evento de toque com dedos `ids` na posição (x, y) do elemento. */
  const sobre = (el: ElFalso, tipo: string, ids: number[], x = 50, y = 50): void => {
    const dedos = ids.map((identifier) => ({ identifier, clientX: x, clientY: y }));
    const lista = Object.assign(dedos, { item: (n: number) => dedos[n] ?? null });
    el.dispatchEvent(Object.assign(new Event(tipo, { cancelable: true }), { changedTouches: lista, touches: lista }));
  };
  return { botoes, joy, teclas, avisos, desligar, sobre, corpo, esq: botoes.get('esq') as ElFalso, r1: botoes.get('r1') as ElFalso, lp: botoes.get('lp') as ElFalso };
}

describe('toque: botão ESQ (data-k n)', () => {
  it('toque curto (desce e sobe antes do tick) ainda esquiva; segurar não repete a borda; soltar apaga o estado "ligado"', () => {
    const c = celular();
    c.sobre(c.esq, 'touchstart', [1]);
    c.sobre(c.esq, 'touchend', [1]);
    expect(c.teclas.lerP1().esq).toBe(true);
    c.teclas.fimDoTick();
    expect(c.teclas.lerP1().esq).toBe(false);

    c.sobre(c.esq, 'touchstart', [2]);
    expect(c.esq.classes.has('on')).toBe(true);
    for (let k = 0; k < 30; k++) {
      c.teclas.fimDoTick();
      expect(c.teclas.lerP1().esq, 'tick ' + k).toBe(false);
    }
    c.sobre(c.esq, 'touchend', [2]);
    expect(c.esq.classes.has('on')).toBe(false);
    expect(c.avisos.filter((k) => k === 'n')).toHaveLength(2);
  });

  it('touchcancel solta o botão (nada fica segurado) e um 2º touchstart no mesmo botão seguro é ignorado', () => {
    const c = celular();
    c.sobre(c.esq, 'touchstart', [1]);
    c.sobre(c.esq, 'touchstart', [2]); // 2º dedo no mesmo botão: sem 2ª borda
    expect(c.avisos.filter((k) => k === 'n')).toHaveLength(1);
    c.sobre(c.esq, 'touchcancel', [1]);
    expect(c.teclas.estaSegurada('n')).toBe(false);
    expect(c.esq.classes.has('on')).toBe(false);
  });

  it('esquiva com o joystick segurado para a frente: as duas coisas chegam no mesmo quadro (direção lida no tick da esquiva)', () => {
    const c = celular();
    c.sobre(c.joy, 'touchstart', [1], 95, 50); // extrema direita da base 100x100
    expect(c.teclas.lerP1().right).toBe(true);
    c.sobre(c.esq, 'touchstart', [2]);
    expect(c.teclas.lerP1()).toMatchObject({ esq: true, right: true, left: false });
  });

  it('ESP segurado + ESQ: o especial continua segurado quando a esquiva sobe e cancela', () => {
    const c = celular();
    c.sobre(c.r1, 'touchstart', [1]);
    c.sobre(c.esq, 'touchstart', [2]);
    c.sobre(c.esq, 'touchcancel', [2]);
    expect(c.teclas.lerP1().spSeg).toBe(true);
    c.sobre(c.r1, 'touchcancel', [1]);
    expect(c.teclas.lerP1().spSeg).toBe(false);
  });
});

describe('toque: joystick', () => {
  it('touchcancel do dedo do joystick solta TODAS as setas e ignora o touchmove que chegar depois', () => {
    const c = celular();
    c.sobre(c.joy, 'touchstart', [1], 95, 50);
    c.sobre(c.joy, 'touchmove', [1], 95, 5);
    expect(c.teclas.lerP1()).toMatchObject({ right: true, up: true });
    c.sobre(c.joy, 'touchcancel', [1]);
    expect(c.teclas.lerP1()).toMatchObject({ right: false, up: false, left: false, down: false });
    expect(c.joy.style.transform).toBe('');
    c.sobre(c.joy, 'touchmove', [1], 5, 50); // dedo cancelado: ignorado
    expect(c.teclas.lerP1().left).toBe(false);
  });

  it('um 2º dedo no joystick é ignorado e o touchend DELE não solta o 1º; o do 1º solta', () => {
    const c = celular();
    c.sobre(c.joy, 'touchstart', [1], 95, 50);
    c.sobre(c.joy, 'touchstart', [2], 5, 50);
    expect(c.teclas.lerP1()).toMatchObject({ right: true, left: false });
    c.sobre(c.joy, 'touchend', [2]);
    expect(c.teclas.lerP1().right).toBe(true);
    // o 1º dedo segura de verdade (1 tick de jogo passou): sem isto o aperto e a soltura no MESMO tick vira o toque curto de 1 tick da U2
    c.teclas.fimDoTick();
    c.sobre(c.joy, 'touchend', [1]);
    expect(c.teclas.lerP1().right).toBe(false);
  });

  it('desligar a camada de toque tira a classe do corpo e para de produzir teclas', () => {
    const c = celular();
    expect(c.desligar).not.toBeNull();
    c.desligar?.();
    expect(c.corpo.classes.has('touch')).toBe(false);
    c.sobre(c.esq, 'touchstart', [1]);
    expect(c.teclas.lerP1().esq).toBe(false);
  });
});

describe('teclas virtuais: bordas', () => {
  it('apertar duas vezes sem soltar gera UMA borda; soltar e apertar antes do tick também (o Set junta); fimDoTick limpa', () => {
    const t = new TeclasVirtuais();
    t.definir('n', true);
    t.definir('n', true);
    expect(t.lerP1().esq).toBe(true);
    t.fimDoTick();
    expect(t.lerP1().esq).toBe(false);
    t.definir('n', false);
    t.definir('n', true);
    t.definir('n', false);
    t.definir('n', true);
    expect(t.lerP1().esq).toBe(true);
  });

  it('soltarTodas (perda de foco) não apaga a borda pendente nem deixa tecla segurada; P2 usa a tecla o', () => {
    const t = new TeclasVirtuais();
    t.definir('o', true);
    t.definir('ArrowLeft', true);
    t.soltarTodas();
    expect(t.lerP2().esq).toBe(true);
    expect(t.lerP1().left).toBe(false);
    expect(t.lerP2().spSeg).toBe(false);
  });
});
