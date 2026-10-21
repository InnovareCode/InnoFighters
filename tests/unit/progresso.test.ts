import { describe, expect, it } from 'vitest';
import type { IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import {
  REGRAS_PADRAO,
  aplicarVitoriaArcade,
  liberados,
  marcarVistos,
  montarEscada,
  naoVistos,
  proximoDaFila,
  progressoVazio,
  sanearProgresso,
  type Progresso,
  type Regras,
} from '../../src/meta';

// Ids falsos para os lutadores que ainda nao existem em IDS_LUTADORES (E5). O cast e so de tipo.
const id = (s: string): IdLutador => s as IdLutador;
const [H, W, M, C] = [id('hayato'), id('wei-long'), id('min-ji'), id('caio')];
const [A, B, CC, D] = [id('novo-a'), id('novo-b'), id('novo-c'), id('novo-d')];
const BOSS = id('chefe-x');

const REGRAS: Regras = {
  roster: [H, W, M, C, A, B, CC, D, BOSS],
  iniciais: [H, W, M, C],
  fila: [A, B, CC, D],
  chefe: BOSS,
  tamanhoEscada: 5,
  travadosNaEscada: true,
};

const prog = (p: Partial<Progresso> = {}): Progresso => ({ ...progressoVazio(), ...p });

describe('meta/progresso: liberados', () => {
  it('sem progresso so os 4 iniciais estao liberados', () => {
    expect([...liberados(progressoVazio(), REGRAS)].sort()).toEqual([C, H, M, W].sort());
  });

  it('iniciais ∪ desbloqueados', () => {
    const l = liberados(prog({ desbloqueados: [A, BOSS] }), REGRAS);
    expect(l.size).toBe(6);
    expect(l.has(A) && l.has(BOSS)).toBe(true);
    expect(l.has(B)).toBe(false);
  });

  it('regras padrao de hoje: so os 4 atuais, nada travado, sem chefao', () => {
    expect([...liberados(progressoVazio())].sort()).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']);
    expect(REGRAS_PADRAO.chefe).toBeNull();
    expect(REGRAS_PADRAO.fila).toEqual([]);
  });
});

describe('meta/progresso: aplicarVitoriaArcade', () => {
  it('1a zerada libera FILA[0] E o chefao (ED3a), nessa ordem', () => {
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, REGRAS);
    expect(r.novos).toEqual([A, BOSS]);
    expect(r.prog).toEqual({ desbloqueados: [A, BOSS], zeradas: 1, chefeDerrotado: true, vistos: [] });
  });

  it('2a zerada libera FILA[1]; o chefao ja liberado nao repete', () => {
    const p1 = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, REGRAS).prog;
    const r = aplicarVitoriaArcade(p1, { derrotouChefe: true }, REGRAS);
    expect(r.novos).toEqual([B]);
    expect(r.prog.desbloqueados).toEqual([A, BOSS, B]);
    expect(r.prog.zeradas).toBe(2);
  });

  it('fila esgotada nao libera nada, mas a zerada ainda conta', () => {
    let p = progressoVazio();
    for (let i = 0; i < 4; i++) p = aplicarVitoriaArcade(p, { derrotouChefe: true }, REGRAS).prog;
    expect(p.desbloqueados).toHaveLength(5); // 4 da fila + chefao
    const r = aplicarVitoriaArcade(p, { derrotouChefe: true }, REGRAS);
    expect(r.novos).toEqual([]);
    expect(r.prog.desbloqueados).toEqual(p.desbloqueados);
    expect(r.prog.zeradas).toBe(5);
  });

  it('jogando COM o chefao (sem luta de chefe): so avanca a fila e nao marca chefeDerrotado', () => {
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: false }, REGRAS);
    expect(r.novos).toEqual([A]);
    expect(r.prog.chefeDerrotado).toBe(false);
    expect(r.prog.zeradas).toBe(1);
  });

  it('sem chefao no jogo (lancamento em ondas) derrotouChefe nao inventa ninguem', () => {
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, { ...REGRAS, chefe: null });
    expect(r.novos).toEqual([A]);
    expect(r.prog.chefeDerrotado).toBe(false);
  });

  it('fila vazia + chefao: a 1a zerada libera so o chefao', () => {
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, { ...REGRAS, fila: [] });
    expect(r.novos).toEqual([BOSS]);
  });

  it('e pura: nao muta a entrada e devolve arrays novos', () => {
    const entrada = prog({ desbloqueados: [A], vistos: [A], zeradas: 1 });
    const copia = structuredClone(entrada);
    const r = aplicarVitoriaArcade(entrada, { derrotouChefe: true }, REGRAS);
    expect(entrada).toEqual(copia);
    expect(r.prog.desbloqueados).not.toBe(entrada.desbloqueados);
    expect(r.prog.vistos).not.toBe(entrada.vistos);
    expect(r.prog.vistos).toEqual([A]);
  });

  it('chefao ja liberado por outra via nao duplica nem aparece em novos', () => {
    const r = aplicarVitoriaArcade(prog({ desbloqueados: [BOSS] }), { derrotouChefe: true }, REGRAS);
    expect(r.novos).toEqual([A]);
    expect(r.prog.desbloqueados).toEqual([BOSS, A]);
  });
});

describe('meta/progresso: reordenar a fila nunca tira lutador ganho', () => {
  const ganho = prog({ desbloqueados: [A, B], zeradas: 2 });

  it('fila embaralhada: quem foi ganho continua liberado', () => {
    const reord: Regras = { ...REGRAS, fila: [D, B, CC, A] };
    const l = liberados(ganho, reord);
    expect(l.has(A) && l.has(B)).toBe(true);
  });

  it('o proximo e o primeiro da fila nova ainda nao liberado (nao FILA[zeradas])', () => {
    expect(proximoDaFila(ganho, { ...REGRAS, fila: [D, B, CC, A] })).toBe(D);
    expect(proximoDaFila(ganho, { ...REGRAS, fila: [A, B, CC, D] })).toBe(CC);
    expect(proximoDaFila(ganho, { ...REGRAS, fila: [B, A] })).toBeUndefined();
  });

  it('aplicar a vitoria na fila nova so acrescenta, nunca remove', () => {
    const r = aplicarVitoriaArcade(ganho, { derrotouChefe: false }, { ...REGRAS, fila: [D, B, CC, A] });
    expect(r.novos).toEqual([D]);
    expect(r.prog.desbloqueados).toEqual([A, B, D]);
  });

  it('lutador removido da fila numa atualizacao continua liberado se estava em desbloqueados', () => {
    const l = liberados(ganho, { ...REGRAS, fila: [CC, D] });
    expect(l.has(A) && l.has(B)).toBe(true);
  });
});

describe('meta/progresso: marcarVistos / naoVistos', () => {
  it('marca so quem esta desbloqueado; travado e duplicado sao ignorados', () => {
    const p = marcarVistos(prog({ desbloqueados: [A, B] }), [A, A, CC, H]);
    expect(p.vistos).toEqual([A]);
    expect(naoVistos(p)).toEqual([B]);
  });

  it('nao muta a entrada', () => {
    const e = prog({ desbloqueados: [A] });
    marcarVistos(e, [A]);
    expect(e.vistos).toEqual([]);
  });
});

describe('meta/progresso: sanearProgresso (localStorage e dado externo)', () => {
  it('progresso valido passa intacto', () => {
    const ok = { desbloqueados: [A, BOSS], zeradas: 3, chefeDerrotado: true, vistos: [A] };
    expect(sanearProgresso(ok, REGRAS)).toEqual(ok);
  });

  it('descarta ids desconhecidos, de tipo errado e duplicados (mantem a ordem)', () => {
    const r = sanearProgresso(
      { desbloqueados: [B, 'fantasma', 42, null, {}, B, A, A, '__proto__', 'constructor'], vistos: [] },
      REGRAS,
    );
    expect(r.desbloqueados).toEqual([B, A]); // so os conhecidos afetam a UI
    // 'fantasma' e 'constructor' tem forma de id e ficam so como desconhecidos opacos; '__proto__' e lixo.
    expect(r.desconhecidos).toEqual(['fantasma', 'constructor']);
  });

  it('desconhecido que passou a existir no roster e promovido a desbloqueado (reavanco de onda)', () => {
    const r = sanearProgresso({ desbloqueados: [A], desconhecidos: [B, 'ainda-nao'] }, REGRAS);
    expect(r.desbloqueados).toEqual([A, B]);
    expect(r.desconhecidos).toEqual(['ainda-nao']);
  });

  it('desconhecidos nao interferem em liberados nem na fila', () => {
    const p = sanearProgresso({ desbloqueados: ['futuro'] }, REGRAS);
    expect([...liberados(p, REGRAS)].sort()).toEqual([C, H, M, W].sort());
    expect(proximoDaFila(p, REGRAS)).toBe(A);
  });

  it('iniciais nunca sao guardados (sao implicitos)', () => {
    expect(sanearProgresso({ desbloqueados: [H, A, W], vistos: [H] }, REGRAS)).toMatchObject({
      desbloqueados: [A],
      vistos: [],
    });
  });

  it('vistos so podem conter quem esta desbloqueado', () => {
    expect(sanearProgresso({ desbloqueados: [A], vistos: [A, B, 'x'] }, REGRAS).vistos).toEqual([A]);
  });

  it.each([
    ['NaN', Number.NaN, 0],
    ['negativo', -4, 0],
    ['Infinity', Number.POSITIVE_INFINITY, 0],
    ['string', '7', 0],
    ['null', null, 0],
    ['objeto', {}, 0],
    ['fracionario', 2.9, 2],
    ['zero', 0, 0],
    ['valido', 12, 12],
  ])('zeradas %s', (_nome, entrada, esperado) => {
    expect(sanearProgresso({ zeradas: entrada }, REGRAS).zeradas).toBe(esperado);
  });

  it.each([['true'], [1], ['sim'], [null], [{}]])('chefeDerrotado so aceita booleano true estrito (%j)', (v) => {
    expect(sanearProgresso({ chefeDerrotado: v }, REGRAS).chefeDerrotado).toBe(false);
  });

  it.each([[undefined], [null], ['texto'], [42], [[]], [[1, 2]], [true]])('entrada nao-objeto (%j) vira progresso vazio', (v) => {
    expect(sanearProgresso(v, REGRAS)).toEqual(progressoVazio());
  });

  it('campos de lista que nao sao lista viram vazio', () => {
    expect(sanearProgresso({ desbloqueados: 'novo-a', vistos: { 0: 'novo-a' } }, REGRAS)).toEqual(progressoVazio());
  });

  it('campos extras desconhecidos sao ignorados', () => {
    const r = sanearProgresso({ desbloqueados: [A], hack: true, __proto__: { x: 1 } }, REGRAS);
    expect(Object.keys(r).sort()).toEqual(['chefeDerrotado', 'desbloqueados', 'vistos', 'zeradas']);
  });

  it('e idempotente', () => {
    const sujo = { desbloqueados: [A, A, 'x', H], vistos: [B], zeradas: 2.5, chefeDerrotado: 'true' };
    const uma = sanearProgresso(sujo, REGRAS);
    expect(sanearProgresso(uma, REGRAS)).toEqual(uma);
  });
});

describe('meta/escada: montarEscada', () => {
  const escada = (semente: number, extra: Partial<Parameters<typeof montarEscada>[0]> = {}) =>
    montarEscada({ c1: H, prog: progressoVazio(), rng: criarRng(semente), regras: REGRAS, ...extra });

  it('5 rivais sorteados + chefao por ultimo, e so ele com chefe:true', () => {
    const e = escada(1);
    expect(e).toHaveLength(6);
    expect(e.at(-1)).toEqual({ id: BOSS, chefe: true });
    expect(e.slice(0, 5).every((x) => !x.chefe)).toBe(true);
  });

  it('nunca inclui o jogador nem repete lutador; chefao so na ultima etapa', () => {
    for (let s = 0; s < 200; s++) {
      const ids = escada(s, { c1: W }).map((x) => x.id);
      expect(ids).not.toContain(W);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.indexOf(BOSS)).toBe(ids.length - 1);
    }
  });

  it('mesma semente => mesma escada; sementes diferentes variam', () => {
    expect(escada(42)).toEqual(escada(42));
    const distintas = new Set(Array.from({ length: 30 }, (_, s) => JSON.stringify(escada(s))));
    expect(distintas.size).toBeGreaterThan(5);
  });

  it('o sorteio e uniforme o bastante: todo candidato aparece como rival', () => {
    const vistos = new Set<string>();
    for (let s = 0; s < 100; s++) for (const e of escada(s)) vistos.add(e.id);
    expect([...vistos].sort()).toEqual([W, M, C, A, B, CC, D, BOSS].sort());
  });

  it('o prefixo da escada nao depende do tamanho pedido', () => {
    const grande = escada(7, { tamanho: 7 }).slice(0, 3).map((x) => x.id);
    const pequeno = escada(7, { tamanho: 3 }).slice(0, 3).map((x) => x.id);
    expect(pequeno).toEqual(grande);
  });

  it('tamanho maior que os candidatos e limitado (sem repetir nem inventar)', () => {
    const e = escada(3, { tamanho: 99 });
    expect(e).toHaveLength(8); // 7 rivais possiveis (roster 9 - c1 - chefao) + chefao
  });

  it('tamanho 0 = so o chefao', () => {
    expect(escada(3, { tamanho: 0 })).toEqual([{ id: BOSS, chefe: true }]);
  });

  it('jogando COM o chefao: so rivais, nenhuma etapa de chefe (ED7)', () => {
    const e = escada(5, { c1: BOSS });
    expect(e).toHaveLength(5);
    expect(e.some((x) => x.chefe || x.id === BOSS)).toBe(false);
  });

  it('sem chefao no jogo (ondas): nenhuma etapa de chefe', () => {
    const e = escada(5, { regras: { ...REGRAS, chefe: null, roster: [H, W, M, C, A] } });
    expect(e.some((x) => x.chefe)).toBe(false);
    expect(e).toHaveLength(4);
  });

  it('travados fora da escada (ED5=nao): so entram rivais liberados', () => {
    const regras = { ...REGRAS, travadosNaEscada: false };
    const e = montarEscada({ c1: H, prog: prog({ desbloqueados: [A] }), rng: criarRng(9), regras });
    expect(e.filter((x) => !x.chefe).map((x) => x.id).sort()).toEqual([A, C, M, W].sort());
  });

  it('com as regras padrao de hoje (4 lutadores, sem chefao): 3 rivais e nada de chefe', () => {
    const e = montarEscada({ c1: H, prog: progressoVazio(), rng: criarRng(1) });
    expect(e).toHaveLength(3);
    expect(e.some((x) => x.chefe || x.id === H)).toBe(false);
  });

  it('nao muta o roster das regras', () => {
    const antes = [...REGRAS.roster];
    escada(11);
    expect([...REGRAS.roster]).toEqual(antes);
  });
});
