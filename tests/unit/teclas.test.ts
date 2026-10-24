import { describe, expect, it } from 'vitest';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { CTRL_P1, CTRL_P2 } from '../../src/input/mapa';
import { normalizarTecla, TeclasVirtuais } from '../../src/input/teclas';

/** Quadro lido sem teclas: ler() sempre traz spSeg (segurado do especial) e esq (ESQUIVA), mesmo falsos. */
const VAZIO = { ...INPUT_VAZIO, spSeg: false, esq: false };

describe('TeclasVirtuais (C2 = readInput do protótipo)', () => {
  it('sem teclas, o InputFrame é vazio', () => {
    expect(new TeclasVirtuais().lerP1()).toEqual(VAZIO);
  });

  it('direções são estado segurado; golpes são borda de descida', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowLeft', true);
    t.definir('z', true);
    expect(t.lerP1()).toEqual({ ...VAZIO, left: true, lp: true });
    t.fimDoTick();
    // seguiu apertando: direção continua, golpe não repete
    expect(t.lerP1()).toEqual({ ...VAZIO, left: true });
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

  it('U2: direção apertada e solta dentro do MESMO tick vale 1 tick (como a borda do botão); depois some', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowDown', true);
    t.definir('ArrowDown', false);
    expect(t.lerP1().down).toBe(true);
    expect(t.estaSegurada('ArrowDown')).toBe(false);
    t.fimDoTick();
    expect(t.lerP1().down).toBe(false);
  });

  it('U2 não inventa direção: soltar uma tecla apertada em tick ANTERIOR solta na hora', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowLeft', true);
    t.fimDoTick();
    t.definir('ArrowLeft', false);
    expect(t.lerP1().left).toBe(false);
  });

  it('U1: soltarDepois segura a tecla por N ticks; apertar de novo antes cancela (sem nova borda)', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowRight', true);
    t.fimDoTick();
    t.soltarDepois('ArrowRight', 2);
    expect(t.lerP1().right).toBe(true);
    t.fimDoTick();
    expect(t.lerP1().right).toBe(true);
    t.fimDoTick();
    expect(t.lerP1().right).toBe(false);
    t.definir('ArrowRight', true);
    t.fimDoTick();
    t.soltarDepois('ArrowRight', 2);
    t.fimDoTick();
    t.definir('ArrowRight', true); // de volta no prazo
    for (let i = 0; i < 5; i++) {
      expect(t.lerP1().right, `tick ${i}`).toBe(true);
      t.fimDoTick();
    }
  });

  it('soltarDepois numa tecla solta não faz nada; um definir(false) de verdade solta na hora e cancela o prazo', () => {
    const t = new TeclasVirtuais();
    t.soltarDepois('ArrowUp', 3);
    t.fimDoTick();
    expect(t.lerP1().up).toBe(false);
    t.definir('ArrowUp', true);
    t.fimDoTick();
    t.soltarDepois('ArrowUp', 3);
    t.definir('ArrowUp', false);
    expect(t.lerP1().up).toBe(false);
  });

  it('cancelar (touchcancel, controle desconectado) solta na hora e NÃO deixa o tick de trava da direção; soltarTodas também', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowRight', true);
    t.cancelar('ArrowRight');
    expect(t.lerP1().right).toBe(false);
    t.definir('ArrowLeft', true);
    t.definir('ArrowLeft', false); // toque curto de verdade: vale 1 tick
    expect(t.lerP1().left).toBe(true);
    t.soltarTodas(); // perda de foco: nem esse tick sobra
    expect(t.lerP1().left).toBe(false);
  });

  it('U4: atrasoDeNivel esconde só o spSeg (sp, a borda, sai na hora); soltar cancela; soltarTodas limpa', () => {
    const t = new TeclasVirtuais();
    t.definir('b', true, 3);
    expect(t.lerP1()).toMatchObject({ sp: true, spSeg: false });
    t.fimDoTick();
    t.fimDoTick();
    expect(t.lerP1().spSeg).toBe(false);
    t.fimDoTick();
    expect(t.lerP1().spSeg).toBe(true);
    t.definir('b', false);
    t.definir('b', true); // sem atraso: o atraso é do dedo no botão, não da tecla
    expect(t.lerP1().spSeg).toBe(true);
    t.definir('b', false);
    t.definir('b', true, 5);
    t.soltarTodas();
    t.definir('b', true);
    expect(t.lerP1().spSeg).toBe(true);
  });

  it('P1 e P2 leem teclas diferentes', () => {
    const t = new TeclasVirtuais();
    t.definir('a', true);
    t.definir('j', true);
    expect(t.lerP1()).toEqual(VAZIO);
    expect(t.lerP2()).toEqual({ ...VAZIO, left: true, lp: true });
  });

  it('spSeg é nível (segurado), sp é borda: segue true com o botão pressionado depois do tick', () => {
    const t = new TeclasVirtuais();
    t.definir('b', true);
    expect(t.lerP1()).toMatchObject({ sp: true, spSeg: true });
    t.fimDoTick();
    expect(t.lerP1()).toMatchObject({ sp: false, spSeg: true });
    t.definir('b', false);
    expect(t.lerP1()).toMatchObject({ sp: false, spSeg: false });
    // P2 usa o próprio botão (l), e o mesclado enxerga qualquer um dos dois
    t.definir('l', true);
    t.fimDoTick();
    expect(t.lerP1().spSeg).toBe(false);
    expect(t.lerP2().spSeg).toBe(true);
    expect(t.lerMesclado()).toMatchObject({ sp: false, spSeg: true });
  });

  it('lerMesclado faz o OR dos dois mapas', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowUp', true);
    t.definir('l', true);
    t.definir('d', true);
    expect(t.lerMesclado()).toEqual({ ...VAZIO, up: true, right: true, sp: true, spSeg: true });
  });

  it('soltarTodas (perda de foco) solta direções', () => {
    const t = new TeclasVirtuais();
    t.definir('ArrowRight', true);
    t.soltarTodas();
    expect(t.lerP1().right).toBe(false);
  });

  it('os mapas cobrem as dez ações sem repetir tecla', () => {
    const todas = [...Object.values(CTRL_P1), ...Object.values(CTRL_P2)];
    expect(todas).toHaveLength(20);
    expect(new Set(todas).size).toBe(20);
  });

  describe('ESQUIVA (esq): P1 = n, P2 = o', () => {
    it('é borda de descida (como os golpes), por jogador', () => {
      const t = new TeclasVirtuais();
      t.definir('n', true);
      expect(t.lerP1().esq).toBe(true);
      expect(t.lerP2().esq).toBe(false);
      t.fimDoTick();
      expect(t.lerP1().esq).toBe(false); // segurada não repete
      t.definir('o', true);
      expect(t.lerP2().esq).toBe(true);
      expect(t.lerP1().esq).toBe(false);
    });

    it('o mesclado (treino, 1 jogador) enxerga as duas teclas', () => {
      const a = new TeclasVirtuais();
      a.definir('n', true);
      expect(a.lerMesclado().esq).toBe(true);
      const b = new TeclasVirtuais();
      b.definir('o', true);
      expect(b.lerMesclado().esq).toBe(true);
      expect(new TeclasVirtuais().lerMesclado().esq).toBe(false);
    });

    it('n e o não colidem com nenhuma outra ação', () => {
      const outras = [...Object.entries(CTRL_P1), ...Object.entries(CTRL_P2)].filter(([acao]) => acao !== 'esq').map(([, tecla]) => tecla);
      expect(outras).not.toContain('n');
      expect(outras).not.toContain('o');
      expect(CTRL_P1.esq).toBe('n');
      expect(CTRL_P2.esq).toBe('o');
    });
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
