import { describe, expect, it, vi } from 'vitest';
import type { PedidoDeArte } from '../../src/assets/gerenciador';
import type { Mundo } from '../../src/ui/contexto';
import { Navegador, TETO_DO_PRETO } from '../../src/ui/navegador';
import type { Cena, NomeCena } from '../../src/ui/tipos';
import { mundoFalso, navegadorFalso } from './_ui';

/*
 * O Navegador aplica a tabela da residência (L3) e segura a troca no preto até o essencial do destino chegar (L4), com um gerenciador FALSO que grava as chamadas e deixa o
 * teste decidir quando a arte "chega". As cenas são stubs: o que se prova aqui é a ORDEM das chamadas e a CONTAGEM de ticks, não o desenho.
 */

const NOMES: NomeCena[] = ['boot', 'intro', 'trailer', 'title', 'menu', 'select', 'diff', 'vs', 'fight', 'how', 'options', 'result', 'continue', 'ending', 'chefe', 'desbloqueio'];

function montar(politica: 'fixa' | 'por-peso') {
  const log: string[] = [];
  const estado = { pronto: true, updates: 0 };
  const j = (p: PedidoDeArte | undefined): string => JSON.stringify(p ?? {});
  const arte = {
    politica,
    pedir: () => undefined,
    usar: (p: PedidoDeArte) => void log.push(`usar ${j(p)}`),
    entrarNaLuta: (p: PedidoDeArte) => void log.push(`entrarNaLuta ${j(p)}`),
    preferir: (p: PedidoDeArte) => void log.push(`preferir ${j(p)}`),
    garantir: (p: PedidoDeArte) => {
      log.push(`garantir ${j(p)}`);
      return Promise.resolve();
    },
    soltarFilme: () => void log.push('soltarFilme'),
    estaPronto: () => estado.pronto,
    prebuscar: () => undefined,
  };
  const { ui } = navegadorFalso();
  const mundo = mundoFalso();
  (mundo as { arte: unknown }).arte = arte;
  // cenas stub: gravam enter/exit/update na ordem
  const cenas = ui.cenas as Record<NomeCena, Cena>;
  for (const n of NOMES) {
    cenas[n] = {
      draw: () => undefined,
      enter: () => void log.push(`enter ${n}`),
      exit: () => void log.push(`exit ${n}`),
      update: () => void estado.updates++,
    } as unknown as Cena;
  }
  ui.pronto(mundo as Mundo);
  ui.fade = 0; // o navegador novo nasce no preto (fade 1); as trocas dos testes partem da tela visível
  ui.fadeDir = 0;
  return { ui, log, estado, arte };
}

const cfg = { mode: 'versus', c1: 'nila', c2: 'aminu', cpu: null, esquiva: false };
const DUPLA = JSON.stringify({ lutadores: ['nila', 'aminu'], cenarios: ['ng'] });

/** Avança até a cena `alvo` aparecer (o fade e a espera do preto incluídos) e devolve quantos ticks foram. */
function ateChegar(ui: Navegador, alvo: NomeCena, max = 300): number {
  let n = 0;
  while (ui.name !== alvo && n < max) {
    ui.update();
    n++;
  }
  expect(ui.name).toBe(alvo);
  return n;
}

describe("Navegador x tabela da residência: política 'por-peso'", () => {
  it('a luta exclusiva entra por `entrarNaLuta` ANTES do `enter`; `fight -> fight` (reiniciar) também', () => {
    const { ui, log } = montar('por-peso');
    ui.set('fight', { cfg });
    expect(log).toEqual([`entrarNaLuta ${DUPLA}`, 'preferir {}', 'enter fight']);
    log.length = 0;
    ui.set('fight', { cfg });
    expect(log).toEqual([`entrarNaLuta ${DUPLA}`, 'preferir {}', 'enter fight']); // sem `exit`: é a mesma cena, mas a tabela se aplica de novo
  });

  it('a VS também é exclusiva', () => {
    const { ui, log } = montar('por-peso');
    ui.set('vs', { cfg });
    expect(log.slice(0, 1)).toEqual([`entrarNaLuta ${DUPLA}`]);
  });

  it('cena não exclusiva marca o essencial em uso, troca a fila de fundo pelo desejável e só então entra', () => {
    const { ui, log } = montar('por-peso');
    ui.set('menu');
    expect(log).toEqual([`usar ${JSON.stringify({ lutadores: ['hayato'], cenarios: ['jp'] })}`, `preferir ${JSON.stringify({ lutadores: ['wei-long', 'min-ji', 'caio'] })}`, 'enter menu']);
  });

  it('cena sem desejável CANCELA a fila de fundo da anterior (preferir vazio)', () => {
    const { ui, log } = montar('por-peso');
    ui.set('select', { mode: 'versus' });
    expect(log).toEqual([`usar ${JSON.stringify({ cenarios: ['jp'] })}`, 'preferir {}', 'enter select']);
  });

  it('o `exit` da cena velha vem antes da tabela da nova', () => {
    const { ui, log } = montar('por-peso');
    ui.set('menu');
    log.length = 0;
    ui.set('select', { mode: 'versus' });
    expect(log[0]).toBe('exit menu');
  });

  it('`go` para uma cena NÃO exclusiva começa a garantir o essencial na hora (em paralelo com o fade); para a luta, não (a VS espera depois de soltar)', () => {
    const { ui, log } = montar('por-peso');
    ui.set('menu');
    log.length = 0;
    ui.go('select', { mode: 'versus' });
    expect(log).toEqual([`garantir ${JSON.stringify({ cenarios: ['jp'] })}`]);
    ateChegar(ui, 'select');
    log.length = 0;
    ui.go('vs', { cfg });
    expect(log).toEqual([]);
  });

  it('`go` saindo da luta solta a FILME antes de pedir o destino', () => {
    const { ui, log } = montar('por-peso');
    ui.set('fight', { cfg });
    log.length = 0;
    ui.go('result', { a: { cfg }, winner: 1, st: {} });
    expect(log.slice(0, 2)).toEqual(['soltarFilme', `garantir ${JSON.stringify({ lutadores: ['nila', 'aminu'], cenarios: ['jp'] })}`]);
  });

  it('erro na carga do essencial vira console e a troca segue', async () => {
    const { ui, arte } = montar('por-peso');
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    arte.garantir = () => Promise.reject(new Error('rede'));
    ui.set('menu');
    ui.go('select', { mode: 'versus' });
    await Promise.resolve();
    await Promise.resolve();
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
    ateChegar(ui, 'select');
  });
});

describe('segurar no preto (L4)', () => {
  it('com a arte pronta segura ZERO ticks: o tempo da troca é o da política `fixa`', () => {
    const peso = montar('por-peso');
    const fixa = montar('fixa');
    peso.ui.set('menu');
    fixa.ui.set('menu');
    peso.ui.go('select', { mode: 'versus' });
    fixa.ui.go('select', { mode: 'versus' });
    expect(ateChegar(peso.ui, 'select')).toBe(ateChegar(fixa.ui, 'select'));
    expect(peso.ui.esperandoArte).toBe(false);
  });

  it('sem a arte segura no máximo TETO_DO_PRETO ticks, congelando t, pétalas e a cena velha, e entra mesmo assim', () => {
    const { ui, estado, log } = montar('por-peso');
    ui.set('menu');
    const prontoNaFixa = (() => {
      const f = montar('fixa');
      f.ui.set('menu');
      f.ui.go('select', { mode: 'versus' });
      return ateChegar(f.ui, 'select');
    })();
    estado.pronto = false;
    const avancar = vi.spyOn(ui.petalas, 'avancar');
    ui.go('select', { mode: 'versus' });
    // anda até a espera começar (o fade chega ao preto)
    let n = 0;
    while ((!ui.esperandoArte || ui.fade < 1) && n < 40) {
      ui.update();
      n++;
    }
    expect(n).toBeLessThan(40);
    expect(ui.fade).toBe(1);
    expect(ui.esperandoArte).toBe(true);
    const t0 = ui.t;
    const upd0 = estado.updates;
    const pet0 = avancar.mock.calls.length;
    // a espera: 45 ticks parados (o 1º já foi dado ao chegar ao preto)
    let seguros = 0;
    while (ui.name === 'menu' && seguros < 100) {
      const antes = { t: ui.t, upd: estado.updates, pet: avancar.mock.calls.length };
      ui.update();
      if (ui.name !== 'menu') break;
      expect(ui.t, 'o tempo da cena congela').toBe(antes.t);
      expect(estado.updates, 'a cena velha congela').toBe(antes.upd);
      expect(avancar.mock.calls.length, 'as pétalas congelam').toBe(antes.pet);
      seguros++;
    }
    expect(ui.name).toBe('select');
    // o 1º tick da espera (que levou o fade ao preto) + os `seguros` de agora = TETO_DO_PRETO
    expect(seguros + 1).toBe(TETO_DO_PRETO);
    expect(ui.t).toBe(0); // a cena nova entrou
    expect(t0).toBeGreaterThan(0);
    expect(upd0).toBeGreaterThan(0);
    expect(pet0).toBeGreaterThan(0);
    expect(log.at(-1)).toBe('enter select');
    expect(prontoNaFixa).toBeGreaterThan(5);
  });

  it('a arte que chega no meio da espera libera a troca na hora', () => {
    const { ui, estado } = montar('por-peso');
    ui.set('menu');
    estado.pronto = false;
    ui.go('select', { mode: 'versus' });
    for (let n = 0; n < 40 && (!ui.esperandoArte || ui.fade < 1); n++) ui.update();
    for (let i = 0; i < 10; i++) ui.update();
    expect(ui.name).toBe('menu');
    expect(ui.esperandoArte).toBe(true);
    estado.pronto = true;
    expect(ui.esperandoArte).toBe(false);
    ui.update();
    expect(ui.name).toBe('select');
  });

  it('para uma cena exclusiva (VS, luta) nunca segura: quem espera é a própria cena', () => {
    const { ui, estado } = montar('por-peso');
    ui.set('menu');
    estado.pronto = false;
    ui.go('vs', { cfg });
    expect(ui.esperandoArte).toBe(false);
    const fixa = montar('fixa');
    fixa.ui.set('menu');
    fixa.ui.go('vs', { cfg });
    expect(ateChegar(ui, 'vs')).toBe(ateChegar(fixa.ui, 'vs'));
  });

  it('o contador de espera zera a cada troca: duas esperas seguidas valem 45 ticks cada', () => {
    const { ui, estado } = montar('por-peso');
    ui.set('menu');
    estado.pronto = false;
    const espera = (alvo: NomeCena, args?: unknown): number => {
      ui.go(alvo, args);
      let n = 0;
      let parados = 0;
      while (ui.name !== alvo && n < 300) {
        const t = ui.t;
        ui.update();
        if (ui.name !== alvo && ui.t === t && ui.fade === 1) parados++;
        n++;
      }
      return parados;
    };
    const a = espera('select', { mode: 'versus' });
    const b = espera('options');
    expect(a).toBeGreaterThanOrEqual(TETO_DO_PRETO - 2);
    expect(b).toBeGreaterThanOrEqual(TETO_DO_PRETO - 2);
    expect(a).toBeLessThanOrEqual(TETO_DO_PRETO);
    expect(b).toBeLessThanOrEqual(TETO_DO_PRETO);
  });
});

describe("Navegador x tabela da residência: política 'fixa' (igual a hoje)", () => {
  it('só a VS e a luta marcam a dupla em uso; nenhuma outra cena chama o gerenciador, nada de `preferir`, `garantir` ou `soltarFilme`', () => {
    const { ui, log, estado } = montar('fixa');
    estado.pronto = false; // mesmo sem arte, a troca não espera
    for (const n of ['menu', 'select', 'title', 'options', 'how'] as const) ui.set(n, { mode: 'versus' });
    expect(log.filter((l) => !l.startsWith('enter') && !l.startsWith('exit'))).toEqual([]);
    ui.set('fight', { cfg });
    expect(log.filter((l) => !l.startsWith('enter') && !l.startsWith('exit'))).toEqual([`entrarNaLuta ${DUPLA}`]);
    log.length = 0;
    ui.go('result', { a: { cfg }, winner: 1, st: {} });
    expect(log).toEqual([]);
    expect(ui.esperandoArte).toBe(false);
    ateChegar(ui, 'result');
  });
});

describe('Navegador sem arte carregada', () => {
  it('antes do `pronto` (boot) a tabela não toca em nada', () => {
    const { ui } = navegadorFalso();
    expect(() => ui.set('boot')).not.toThrow();
    expect(ui.esperandoArte).toBe(false);
  });
});
