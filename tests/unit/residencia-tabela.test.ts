import { describe, expect, it } from 'vitest';
import { VITRINE } from '../../src/data/lutadores';
import { ROTEIRO } from '../../src/data/trailer/roteiro';
import { arteDoPlano } from '../../src/trailer/carga';
import type { Mundo } from '../../src/ui/contexto';
import { COR_DA_RESERVA_DO_FUNDO, FundoPadrao } from '../../src/ui/fundo-padrao';
import { ARTE_DE_ABERTURA_DO_TRAILER, arteDaCena, CENARIOS_DA_VITRINE } from '../../src/ui/residencia';
import type { NomeCena } from '../../src/ui/tipos';
import { mundoFalso } from './_ui';

/*
 * A tabela pura "o que cada cena precisa na memória" (docs/spec-residencia-de-memoria.md §2.3): todas as `NomeCena`, linha por linha, sem gerenciador nem navegador.
 */

const M: Pick<Mundo, 'elenco'> = mundoFalso();
// Record<NomeCena, true> não compila se uma cena nova faltar aqui: a lista não envelhece sozinha
const TODAS: Record<NomeCena, true> = {
  boot: true, intro: true, trailer: true, title: true, menu: true, select: true, diff: true, vs: true, fight: true,
  how: true, options: true, result: true, continue: true, ending: true, chefe: true, desbloqueio: true,
};
const NOMES = Object.keys(TODAS) as NomeCena[];

const cfg = { mode: 'versus', c1: 'nila', c2: 'aminu', cpu: null, esquiva: false };
const argsLuta = { cfg };

describe('arteDaCena: a tabela do §2.3', () => {
  it('cobre as 16 cenas e nunca lança, nem com argumentos vazios', () => {
    expect(NOMES).toHaveLength(16);
    for (const n of NOMES) expect(() => arteDaCena(n, {}, M), n).not.toThrow();
    for (const n of NOMES) expect(() => arteDaCena(n, undefined, M), n).not.toThrow();
  });

  it('os cenários da vitrine são jp, cn, kr, br, nessa ordem, e a vitrine é HAYATO, WEI LONG, MIN-JI, CAIO', () => {
    expect(CENARIOS_DA_VITRINE).toEqual(['jp', 'cn', 'kr', 'br']);
    expect(VITRINE).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
  });

  it('só a VS, a luta e o trailer são exclusivas; a VS e a luta com a dupla e o cenário da CASA DO RIVAL', () => {
    for (const n of NOMES) expect(arteDaCena(n, argsLuta, M).exclusiva === true, n).toBe(n === 'vs' || n === 'fight' || n === 'trailer');
    for (const n of ['vs', 'fight'] as const) {
      const t = arteDaCena(n, argsLuta, M);
      expect(t.essencial).toEqual({ lutadores: ['nila', 'aminu'], cenarios: [M.elenco.aminu.ch.stage] });
      expect(t.desejavel).toBeUndefined();
    }
  });

  it('o cenário explícito da configuração vence a casa do rival; HAYATO x HAYATO não duplica o lutador', () => {
    expect(arteDaCena('fight', { cfg: { ...cfg, stage: 'br' } }, M).essencial.cenarios).toEqual(['br']);
    expect(arteDaCena('vs', { cfg: { ...cfg, c1: 'hayato', c2: 'hayato' } }, M).essencial).toEqual({ lutadores: ['hayato'], cenarios: ['jp'] });
  });

  it('intro: a vitrine inteira e os 4 cenários em uso (a abertura de hoje supõe que estão lá)', () => {
    const t = arteDaCena('intro', {}, M);
    expect(t.essencial).toEqual({ lutadores: [...VITRINE], cenarios: ['jp', 'cn', 'kr', 'br'] });
    expect(t.desejavel).toBeUndefined();
    expect(t.exclusiva).toBeUndefined();
  });

  it('trailer (T12): EXCLUSIVO, e só a arte dos 2 primeiros planos (P0 e P1) fica ao entrar; o resto a carga dele pede e solta plano a plano', () => {
    const t = arteDaCena('trailer', { origem: 'atrair' }, M);
    expect(t.exclusiva).toBe(true);
    expect(t.essencial).toEqual({ lutadores: ['hayato', 'wei-long'], cenarios: ['jp', 'cn'] });
    expect(t.essencial).toEqual(ARTE_DE_ABERTURA_DO_TRAILER);
    expect(t.desejavel).toBeUndefined();
    // a constante da tabela é a arte de P0 + P1 do roteiro: o pico do trailer (tests/unit/trailer-memoria.test.ts) parte daqui
    const abertura = ROTEIRO.planos.slice(0, 2).map((p) => arteDoPlano(p));
    expect([...new Set(abertura.flatMap((a) => a.lutadores))]).toEqual([...(ARTE_DE_ABERTURA_DO_TRAILER.lutadores ?? [])]);
    expect([...new Set(abertura.flatMap((a) => a.cenarios))].sort()).toEqual([...(ARTE_DE_ABERTURA_DO_TRAILER.cenarios ?? [])].sort());
  });

  it('título: a vitrine + jp; desejável cn, kr, br (o ciclo só troca aos ~6 s)', () => {
    const t = arteDaCena('title', {}, M);
    expect(t.essencial).toEqual({ lutadores: [...VITRINE], cenarios: ['jp'] });
    expect(t.desejavel).toEqual({ cenarios: ['cn', 'kr', 'br'] });
  });

  it('menu: o 1º da vitrine + jp; desejável o resto da vitrine na ordem do ciclo', () => {
    const t = arteDaCena('menu', {}, M);
    expect(t.essencial).toEqual({ lutadores: ['hayato'], cenarios: ['jp'] });
    expect(t.desejavel).toEqual({ lutadores: ['wei-long', 'min-ji', 'caio'] });
  });

  it('seleção, como jogar e opções: só o jp', () => {
    for (const n of ['select', 'how', 'options'] as const) expect(arteDaCena(n, {}, M), n).toEqual({ essencial: { cenarios: ['jp'] } });
  });

  it('dificuldade: o lutador do jogador + jp', () => {
    expect(arteDaCena('diff', { mode: 'cpu', c1: 'nila', c2: 'aminu' }, M).essencial).toEqual({ lutadores: ['nila'], cenarios: ['jp'] });
  });

  it('chefe: só o retrato (nada além do que está sempre na memória)', () => {
    expect(arteDaCena('chefe', argsLuta, M)).toEqual({ essencial: {} });
  });

  it('resultado: a dupla + jp, e a vitrine como desejável; continue: a dupla + jp', () => {
    const r = arteDaCena('result', { a: argsLuta, winner: 1, st: {} }, M);
    expect(r.essencial).toEqual({ lutadores: ['nila', 'aminu'], cenarios: ['jp'] });
    expect(r.desejavel).toEqual({ lutadores: [...VITRINE] });
    const c = arteDaCena('continue', { run: { c1: 'nila' }, a: argsLuta }, M);
    expect(c.essencial).toEqual({ lutadores: ['nila', 'aminu'], cenarios: ['jp'] });
    expect(c.desejavel).toBeUndefined();
  });

  it('ending: o lutador da campanha + jp, vitrine desejável; desbloqueio: jp, vitrine desejável', () => {
    const e = arteDaCena('ending', { run: { c1: 'caio' } }, M);
    expect(e.essencial).toEqual({ lutadores: ['caio'], cenarios: ['jp'] });
    expect(e.desejavel).toEqual({ lutadores: [...VITRINE] });
    const d = arteDaCena('desbloqueio', { novos: ['nila'] }, M);
    expect(d.essencial).toEqual({ cenarios: ['jp'] });
    expect(d.desejavel).toEqual({ lutadores: [...VITRINE] });
  });

  it('é pura: devolve o mesmo para os mesmos argumentos e não muda a entrada', () => {
    const args = { cfg: { ...cfg } };
    const copia = JSON.stringify(args);
    expect(arteDaCena('fight', args, M)).toEqual(arteDaCena('fight', args, M));
    expect(JSON.stringify(args)).toBe(copia);
  });
});

describe('FundoPadrao: o fundo dos menus lê do gerenciador e tem reserva', () => {
  const IMG = { width: 1920, height: 1080 } as unknown as CanvasImageSource;
  const criarCanvas = (() => {
    const chamadas: Array<[number, number]> = [];
    const f = (w: number, h: number): HTMLCanvasElement => {
      chamadas.push([w, h]);
      const pintou: string[] = [];
      return { width: w, height: h, getContext: () => ({ fillRect: () => undefined, set fillStyle(v: string) { pintou.push(v); } }), pintou } as unknown as HTMLCanvasElement;
    };
    return Object.assign(f, { chamadas });
  })();

  it('com o jp na memória devolve o jp (a mesma imagem, sempre) e não conta falta', () => {
    const cen = new Map<string, CanvasImageSource>([['jp', IMG]]);
    const f = new FundoPadrao(cen, 'jp', criarCanvas);
    expect(f.imagem).toBe(IMG);
    expect(f.imagem).toBe(IMG);
    expect(f.vezesSemFundo).toBe(0);
    expect(criarCanvas.chamadas).toHaveLength(0);
  });

  it('sem o jp devolve um canvas 1 x 1 da cor do fundo, criado UMA vez, e conta cada pedido; quando o jp volta, volta a imagem', () => {
    const cen = new Map<string, CanvasImageSource>();
    const f = new FundoPadrao(cen, 'jp', criarCanvas);
    const a = f.imagem;
    const b = f.imagem;
    expect(a).toBe(b);
    expect(f.vezesSemFundo).toBe(2);
    expect(criarCanvas.chamadas).toEqual([[1, 1]]);
    expect((a as unknown as { pintou: string[] }).pintou).toEqual([COR_DA_RESERVA_DO_FUNDO]);
    cen.set('jp', IMG);
    expect(f.imagem).toBe(IMG);
    expect(f.vezesSemFundo).toBe(2);
  });

  it('o jp que sai do mapa (a luta) é visto na hora: nada guarda a imagem antiga', () => {
    const cen = new Map<string, CanvasImageSource>([['jp', IMG]]);
    const f = new FundoPadrao(cen, 'jp', criarCanvas);
    expect(f.imagem).toBe(IMG);
    cen.delete('jp');
    expect(f.imagem).not.toBe(IMG);
  });
});
