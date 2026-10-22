import { describe, expect, it, vi } from 'vitest';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
import type { CenaBoot } from '../../src/ui/cenas/boot';
import type { CenaTitle } from '../../src/ui/cenas/title';
import { TICKS_PARA_ATRAIR } from '../../src/ui/cenas/title';
import type { CenaTrailer } from '../../src/ui/cenas/trailer';
import type { Mundo } from '../../src/ui/contexto';
import { navegadorFalso } from './_ui';

/*
 * Trailer de abertura, T4 (a navegação): o boot abre o trailer só com o pedaço lazy carregado (senão a abertura de hoje, sem esperar), o título parado por 30 s o
 * reabre (modo atrair), qualquer gesto zera o contador, `Regras.trailer = false` (?expansao=4) desliga tudo, e `Navegador.set` avisa a cena que sai.
 */

const SEM_TRAILER: Regras = { ...REGRAS_PADRAO, trailer: false };

function montar(regras: Regras = REGRAS_PADRAO, carregado = true) {
  const n = navegadorFalso({}, regras);
  const casca = n.ui.cenas.trailer as CenaTrailer;
  // o pedaço lazy de verdade não é importado aqui (o e2e prova o import): a casca só diz se está disponível
  casca.precarregar = () => undefined;
  casca.disponivel = () => regras.trailer && carregado;
  n.ui.pronto({} as unknown as Mundo);
  const idas: Array<[string, unknown]> = [];
  const go = vi.spyOn(n.ui, 'go').mockImplementation((nome, args) => void idas.push([nome, args]));
  const set = vi.spyOn(n.ui, 'set');
  return { ...n, casca, idas, go, set };
}

describe('boot -> trailer', () => {
  it('com o pedaço carregado, o gesto abre o trailer (origem boot); sem ele, a abertura de hoje (nunca espera)', () => {
    for (const [carregado, destino] of [[true, 'trailer'], [false, 'intro']] as const) {
      const t = montar(REGRAS_PADRAO, carregado);
      const abertos: string[] = [];
      t.set.mockImplementation((nome: string) => void abertos.push(nome));
      (t.ui.cenas.boot as CenaBoot).click();
      expect(abertos, `carregado=${carregado}`).toEqual([destino]);
    }
  });

  it('o boot guarda a marca do gesto para medir o tempo até o 1º quadro (trailer:gesto)', () => {
    const t = montar();
    const marca = vi.spyOn(performance, 'mark');
    t.set.mockImplementation(() => undefined);
    (t.ui.cenas.boot as CenaBoot).click();
    expect(marca).toHaveBeenCalledWith('trailer:gesto');
  });

  it('com Regras.trailer falso (?expansao=4) a abertura de hoje segue como sempre', () => {
    const t = montar(SEM_TRAILER);
    expect(t.casca.ligado()).toBe(false);
    const abertos: string[] = [];
    t.set.mockImplementation((nome: string) => void abertos.push(nome));
    (t.ui.cenas.boot as CenaBoot).click();
    expect(abertos).toEqual(['intro']);
  });
});

describe('modo atrair (título parado)', () => {
  function titulo(regras: Regras = REGRAS_PADRAO, carregado = true) {
    const t = montar(regras, carregado);
    const cena = t.ui.cenas.title as CenaTitle;
    cena.enter({ fromTrailer: true });
    return { ...t, cena };
  }

  it('fromTrailer nasce em t = 120 (como o fromIntro)', () => {
    const t = titulo();
    expect(t.cena.t).toBe(120);
    t.cena.enter({ fromIntro: true });
    expect(t.cena.t).toBe(120);
    t.cena.enter(undefined);
    expect(t.cena.t).toBe(0);
  });

  it('30 s (1800 ticks) sem gesto abrem o trailer com origem atrair, uma vez, e o contador zera', () => {
    const t = titulo();
    expect(TICKS_PARA_ATRAIR).toBe(1800);
    for (let i = 0; i < TICKS_PARA_ATRAIR - 1; i++) t.cena.update();
    expect(t.idas).toEqual([]);
    t.cena.update();
    expect(t.idas).toEqual([['trailer', { origem: 'atrair' }]]);
    expect(t.cena.ocioso).toBe(0);
  });

  it('tecla, clique e mouse zeram o contador (e tecla e clique zeram as repetições mudas do atrair)', () => {
    const t = titulo();
    t.casca.repeticoesDoAtrair = 3;
    for (let i = 0; i < 1700; i++) t.cena.update();
    t.cena.hover();
    expect(t.cena.ocioso).toBe(0);
    expect(t.casca.repeticoesDoAtrair).toBe(3);
    for (let i = 0; i < 1700; i++) t.cena.update();
    t.cena.key('x');
    expect(t.cena.ocioso).toBe(0);
    expect(t.casca.repeticoesDoAtrair).toBe(0);
    t.casca.repeticoesDoAtrair = 2;
    t.cena.click();
    expect(t.casca.repeticoesDoAtrair).toBe(0);
    t.idas.length = 0;
    for (let i = 0; i < 3000; i++) t.cena.update();
    // 1 abertura em 3000 ticks (a de 1800); depois de abrir o contador recomeça
    expect(t.idas.length).toBe(1);
  });

  it('sem o pedaço carregado, ou com o trailer desligado, o título nunca o abre (e segue contando)', () => {
    for (const [regras, carregado] of [[REGRAS_PADRAO, false], [SEM_TRAILER, true]] as const) {
      const t = titulo(regras, carregado);
      for (let i = 0; i < 4000; i++) t.cena.update();
      expect(t.idas, `carregado=${carregado}`).toEqual([]);
    }
  });

  it('F e M não contam como gesto do título (o main trata antes)', () => {
    const t = titulo();
    for (let i = 0; i < 100; i++) t.cena.update();
    expect(t.cena.key('f')).toBe(false);
    expect(t.cena.key('m')).toBe(false);
    expect(t.cena.ocioso).toBe(100);
  });
});

describe('Navegador.set avisa a cena que sai', () => {
  it('chama exit() da cena anterior, e só quando a cena muda de verdade', () => {
    const n = navegadorFalso();
    n.ui.set('title');
    const sair = vi.fn();
    (n.ui.scene as unknown as { exit: () => void }).exit = sair;
    n.ui.set('title');
    expect(sair).not.toHaveBeenCalled();
    n.ui.set('options');
    expect(sair).toHaveBeenCalledTimes(1);
  });
});

describe('a casca CenaTrailer', () => {
  it('desenha preto enquanto o pedaço não chegou, engole a tecla e não derruba nada', () => {
    const t = montar(REGRAS_PADRAO, false);
    const cena = t.casca;
    expect(cena.pronta).toBe(false);
    expect(cena.key('x')).toBe(true);
    expect(cena.key('f')).toBe(false);
    expect(cena.key('m')).toBe(false);
    cena.click();
    cena.update();
    cena.blur();
    cena.exit();
    t.g.chamadas.length = 0;
    cena.draw();
    expect(t.g.chamadas.some(([nome]) => nome === 'fillRect')).toBe(true);
    expect(cena.diagnostico()).toBeNull();
  });
});
