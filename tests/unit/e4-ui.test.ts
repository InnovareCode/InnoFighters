import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { type IdLutador, type LeituraLuta, type LutadorLeitura } from '../../src/core/contratos';
import { aplicarVitoriaArcade, liberados, progressoVazio, REGRAS_PADRAO, type Regras } from '../../src/meta';
import { desenharHUD } from '../../src/render/hud';
import type { CenaDesbloqueio } from '../../src/ui/cenas/desbloqueio';
import type { CenaDiff } from '../../src/ui/cenas/diff';
import type { CenaEnding } from '../../src/ui/cenas/fim';
import type { CenaHow } from '../../src/ui/cenas/how';
import type { CenaSelect } from '../../src/ui/cenas/select';
import { descricaoArcade, dicaArcadeSelecao, porExtenso, rivaisDaEscada, textoComoJogarArcade } from '../../src/ui/escada-texto';
import { colunasDaGrade, estadoDaCasa, moverNaGrade, ordemDaGrade, podeEscolher, proximaLiberada, retanguloDaCasa } from '../../src/ui/grade';
import { mundoFalso, mundoFalso9, navegadorFalso } from './_ui';

const id = (s: string): IdLutador => s as IdLutador;
// R9 = as regras de produção de ANTES do Zenon: 9 lutadores (o BAATAR é o 5º da fila) e SEM chefão. A mecânica da UI com 9 e a grade 3x3 seguem testadas
// com ela (injetada); a produção de hoje tem 10 lutadores e o ZENON como chefão (grade de 10 = casa de honra: Lyra, Z2).
const R9: Regras = { ...REGRAS_PADRAO, roster: REGRAS_PADRAO.roster.slice(0, 9), chefe: null };
// A mecânica de chefão da UI (centro da grade, etapa de chefe, aviso do chefão, desbloqueio do chefão) segue testada com estas regras
// injetadas, que reproduzem o desenho anterior (fila de 4 + um chefão fora da fila; o id é só um stand-in de 9 lutadores).
const R9C: Regras = { ...R9, fila: ['aminu', 'centella', 'camille', 'nila'], chefe: 'baatar' };
const [A, B, C, D]: [IdLutador, IdLutador, IdLutador, IdLutador] = ['aminu', 'centella', 'camille', 'nila'];
const CHEFE_FALSO: IdLutador = 'baatar';

describe('grade de seleção (plano 5)', () => {
  it('9 lutadores: o chefão (quando há) vai para o CENTRO; sem chefão (produção hoje) e com 4: ordem do roster', () => {
    const g = ordemDaGrade(R9C.roster, R9C.chefe);
    expect(g).toHaveLength(9);
    expect(g[4]).toBe(CHEFE_FALSO);
    expect(g.filter((x) => x !== CHEFE_FALSO)).toEqual(R9C.roster.filter((x) => x !== CHEFE_FALSO));
    expect(R9.chefe).toBeNull();
    expect(ordemDaGrade(R9.roster, R9.chefe)).toEqual(R9.roster); // produção sem chefão: o BAATAR é a última casa comum
    expect(ordemDaGrade(R9.roster.slice(0, 4), null)).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
    expect(ordemDaGrade(R9.roster, null)).toEqual(R9.roster);
  });

  it('2 colunas até 4 lutadores (layout de hoje), 3 colunas acima', () => {
    expect([1, 2, 3, 4].map(colunasDaGrade)).toEqual([2, 2, 2, 2]);
    expect([5, 8, 9].map(colunasDaGrade)).toEqual([3, 3, 3]);
  });

  it('geometria: 2x2 = casas de 120 px e passo 132 (iguais ao protótipo); 3x3 cabe no mesmo espaço, sem sobrepor', () => {
    expect(retanguloDaCasa(0, 2)).toEqual({ x: 360, y: 92, w: 120, h: 120 });
    expect(retanguloDaCasa(3, 2)).toEqual({ x: 492, y: 224, w: 120, h: 120 });
    const r = Array.from({ length: 9 }, (_, i) => retanguloDaCasa(i, 3));
    for (const c of r) {
      expect(c.w).toBe(80);
      expect(c.x).toBeGreaterThanOrEqual(352);
      expect(c.x + c.w).toBeLessThanOrEqual(608);
      expect(c.y + c.h).toBeLessThanOrEqual(348);
    }
    for (let i = 0; i < 9; i++) {
      for (let j = i + 1; j < 9; j++) {
        const a = r[i]!;
        const b = r[j]!;
        expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y, `${i} x ${j}`).toBe(false);
      }
    }
    expect(r[4]!.x + r[4]!.w / 2).toBe(480); // o centro da grade fica no centro da tela
  });

  it('cursor: 2x2 inverte coluna/linha como antes; 3x3 dá a volta nas bordas; última linha incompleta cai na última casa', () => {
    expect(moverNaGrade(0, 'right', 4, 2)).toBe(1);
    expect(moverNaGrade(1, 'right', 4, 2)).toBe(0);
    expect(moverNaGrade(0, 'down', 4, 2)).toBe(2);
    expect(moverNaGrade(2, 'down', 4, 2)).toBe(0);
    expect(moverNaGrade(0, 'left', 9, 3)).toBe(2);
    expect(moverNaGrade(2, 'right', 9, 3)).toBe(0);
    expect(moverNaGrade(1, 'up', 9, 3)).toBe(7);
    expect(moverNaGrade(7, 'down', 9, 3)).toBe(1);
    expect(moverNaGrade(2, 'down', 5, 3)).toBe(4);
  });

  it('proximaLiberada pula travados, dá a volta e devolve -1 se não há nenhum', () => {
    const grade = ['a', 'b', 'c', 'd'].map(id);
    const libs = new Set([id('a'), id('c')]);
    expect(proximaLiberada(grade, libs, 1)).toBe(2);
    expect(proximaLiberada(grade, libs, 3)).toBe(0);
    expect(proximaLiberada(grade, libs, 3, -1)).toBe(2);
    expect(proximaLiberada(grade, new Set(), 0)).toBe(-1);
  });

  it('estados: liberado, NOVO!, travado, chefão oculto; só os dois primeiros confirmam', () => {
    const prog = { ...progressoVazio(), desbloqueados: [A, B], vistos: [B] };
    const c = { prog, regras: R9C, novos: new Set([A]) };
    expect(estadoDaCasa(id('hayato'), c)).toBe('liberado');
    expect(estadoDaCasa(A, c)).toBe('novo');
    expect(estadoDaCasa(B, c)).toBe('liberado');
    expect(estadoDaCasa(C, c)).toBe('travado');
    expect(estadoDaCasa(CHEFE_FALSO, c)).toBe('chefe-oculto');
    expect(estadoDaCasa(CHEFE_FALSO, { ...c, prog: { ...prog, desbloqueados: [CHEFE_FALSO] }, novos: new Set() })).toBe('liberado');
    expect((['liberado', 'novo', 'travado', 'chefe-oculto'] as const).map(podeEscolher)).toEqual([true, true, false, false]);
  });
});

describe('textos do ARCADE vêm da escada', () => {
  it('onda 1 (4 lutadores, sem chefão): os textos de antes da expansão, palavra por palavra', () => {
    const onda1: Regras = { ...R9, roster: R9.roster.slice(0, 4), fila: [], chefe: null };
    expect(rivaisDaEscada(onda1)).toBe(3);
    expect(descricaoArcade(onda1)).toBe('Um jogador: enfrente os 3 rivais em sequência e torne-se o campeão.');
    expect(dicaArcadeSelecao(onda1)).toBe('Derrote os outros três lutadores em sequência. A ordem é sorteada.');
    expect(textoComoJogarArcade(onda1)).toBe('Enfrente os outros 3 lutadores em sequência. Se perder, use um CONTINUE (3 no total).');
  });

  it('com chefão e 9 lutadores: 5 rivais e o chefão no fim', () => {
    expect(rivaisDaEscada(R9C)).toBe(5);
    expect(descricaoArcade(R9C)).toBe('Um jogador: enfrente 5 rivais em sequência, depois o chefão, e torne-se o campeão.');
    expect(dicaArcadeSelecao(R9C)).toContain('cinco rivais');
    expect(dicaArcadeSelecao(R9C)).toContain('o chefão');
    expect(textoComoJogarArcade(R9C)).toContain('5 rivais');
  });

  it('produção hoje (9 lutadores, SEM chefão até o Zenon entrar): 5 rivais e nenhuma menção ao chefão', () => {
    expect(rivaisDaEscada(R9)).toBe(5);
    expect(descricaoArcade(R9)).toBe('Um jogador: enfrente os 5 rivais em sequência e torne-se o campeão.');
    expect(dicaArcadeSelecao(R9)).not.toContain('chefão');
    expect(textoComoJogarArcade(R9)).not.toContain('chefão');
  });

  it('a escada nunca promete mais rivais do que existem', () => {
    const pouco: Regras = { ...R9, roster: R9.roster.slice(0, 3), iniciais: R9.roster.slice(0, 3), fila: [], chefe: null };
    expect(rivaisDaEscada(pouco)).toBe(2);
    expect(porExtenso(3)).toBe('três');
    expect(porExtenso(12)).toBe('12');
  });
});

describe('seleção com 9 lutadores (regras de produção, E5)', () => {
  function select(prog = progressoVazio(), modo: 'versus' | 'cpu' | 'arcade' | 'training' = 'cpu') {
    const t = navegadorFalso({}, R9C);
    t.persist.prog = prog;
    t.ui.pronto(mundoFalso9());
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: modo });
    const ir: string[] = [];
    t.ui.go = ((n: string, a: unknown) => ir.push(`${n} ${JSON.stringify(a)}`)) as never;
    return { ...t, s, ir };
  }

  it('abre com a grade 3x3 (chefão no centro, regras com chefão) e o cursor no 1º liberado; P2 no seguinte liberado', () => {
    const { s } = select();
    expect(s.grade).toHaveLength(9);
    expect(s.grade[4]).toBe(CHEFE_FALSO);
    expect(s.cur).toEqual([0, 1]);
    const { s: s2 } = select({ ...progressoVazio(), desbloqueados: [A] });
    expect(s2.cur[1]).toBe(1);
  });

  it('travado não confirma (som de negação) em nenhum modo, inclusive Versus e Treino', () => {
    for (const modo of ['cpu', 'versus', 'training', 'arcade'] as const) {
      const { s, audio, ir } = select(progressoVazio(), modo);
      s.cur[0] = s.grade.indexOf(A);
      s.key('Enter');
      expect(s.lock[0], modo).toBe(false);
      expect(audio.nomes(), modo).toContain('deny');
      expect(audio.nomes(), modo).not.toContain('uiSelect');
      expect(ir, modo).toEqual([]);
    }
    const { s, audio } = select(progressoVazio(), 'versus');
    s.cur[1] = s.grade.indexOf(CHEFE_FALSO);
    s.key('j');
    expect(s.lock[1]).toBe(false);
    expect(audio.nomes()).toContain('deny');
  });

  it('o cursor anda por cima das casas travadas (para ver o que falta), só não confirma', () => {
    const { s } = select();
    s.key('ArrowRight');
    s.key('ArrowRight');
    s.key('ArrowDown');
    expect(s.cur[0]).toBe(5);
    s.key('ArrowLeft');
    expect(s.grade[s.cur[0]]).toBe(CHEFE_FALSO);
  });

  it('liberado confirma normal; na etapa 2 do modo CPU o adversário sugerido nunca é travado', () => {
    const { s, ir } = select({ ...progressoVazio(), desbloqueados: [A, B] }, 'cpu');
    s.cur[0] = s.grade.indexOf(id('caio'));
    s.key('Enter');
    expect(s.step).toBe(2);
    expect(R9.iniciais.concat([A, B])).toContain(s.grade[s.cur[1]]);
    s.key('Enter');
    for (let i = 0; i < 60; i++) s.update();
    expect(ir[0]).toMatch(/^diff \{"mode":"cpu","c1":"caio","c2":"/);
  });

  it('selo NOVO!: só nesta visita; ao abrir já conta como visto e é gravado', () => {
    const t = navegadorFalso({}, R9);
    t.persist.prog = { ...progressoVazio(), desbloqueados: [A, B], vistos: [B] };
    t.ui.pronto(mundoFalso9());
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: 'cpu' });
    expect([...s.novos]).toEqual([A]);
    expect([...t.persist.prog.vistos].sort()).toEqual([A, B].sort());
    expect(t.salvou.n).toBe(1);
    s.enter({ mode: 'cpu' });
    expect(s.novos.size).toBe(0);
    expect(t.salvou.n).toBe(1);
  });

  it('onda 1 (4 lutadores, regras injetadas): 4 casas em 2 colunas, nada travado, nenhuma gravação ao abrir', () => {
    const t = navegadorFalso({}, { ...R9, roster: R9.roster.slice(0, 4), fila: [], chefe: null });
    t.ui.pronto(mundoFalso());
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: 'versus' });
    expect(s.grade).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
    expect(s.cur).toEqual([0, 1]);
    expect(s.novos.size).toBe(0);
    expect(t.salvou.n).toBe(0);
  });

  it('produção, save novo: os 4 iniciais liberados e os 5 da fila (BAATAR é o último) travados, na ordem do roster, sem casa de chefão', () => {
    const t = navegadorFalso({}, R9);
    t.ui.pronto(mundoFalso());
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: 'versus' });
    expect(s.grade).toEqual(['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar']);
    expect(['aminu', 'centella', 'camille', 'nila', 'baatar'].map((x) => estadoDaCasa(id(x), { prog: progressoVazio(), regras: R9, novos: new Set() }))).toEqual(Array(5).fill('travado'));
    expect(s.cur).toEqual([0, 1]);
    expect(s.novos.size).toBe(0);
    expect(t.salvou.n).toBe(0);
  });
});

describe('escada do ARCADE pela UI', () => {
  it('5 rivais sorteados + chefão; o jogador nunca é rival; travado pode ser rival', () => {
    const t = navegadorFalso({}, R9C);
    t.ui.pronto(mundoFalso9());
    const d = t.ui.cenas.diff as CenaDiff;
    const ir: Array<[string, unknown]> = [];
    t.ui.go = ((n: string, a: unknown) => ir.push([n, a])) as never;
    d.enter({ mode: 'arcade', c1: id('hayato'), c2: id('caio') });
    d.nav('ok');
    const run = t.ui.run!;
    expect(run.etapas).toHaveLength(6);
    expect(run.etapas.at(-1)).toEqual({ id: CHEFE_FALSO, chefe: true });
    expect(run.etapas.slice(0, 5).every((e) => !e.chefe && e.id !== 'hayato' && e.id !== CHEFE_FALSO)).toBe(true);
    expect(new Set(run.etapas.map((e) => e.id)).size).toBe(6);
    expect(run.etapas.slice(0, 5).some((e) => !R9.iniciais.includes(e.id))).toBe(true);
    expect((ir[0]?.[1] as { cfg: { chefe?: boolean } }).cfg.chefe).toBeUndefined();
  });

  it('produção hoje (sem chefão): 5 rivais sorteados, sem etapa de chefe, o BAATAR pode ser rival', () => {
    const vistos = new Set<IdLutador>();
    for (let i = 0; i < 12; i++) {
      const t = navegadorFalso({}, R9);
      t.ui.pronto(mundoFalso9());
      const d = t.ui.cenas.diff as CenaDiff;
      t.ui.go = (() => undefined) as never;
      d.enter({ mode: 'arcade', c1: id('hayato'), c2: id('caio') });
      d.nav('ok');
      const run = t.ui.run!;
      expect(run.etapas).toHaveLength(5);
      expect(run.etapas.some((e) => e.chefe || e.id === 'hayato')).toBe(false);
      expect(new Set(run.etapas.map((e) => e.id)).size).toBe(5);
      for (const e of run.etapas) vistos.add(e.id);
    }
    expect(vistos.has('baatar')).toBe(true);
  });

  it('jogando COM o chefão: escada só de rivais, sem etapa de chefe', () => {
    const t = navegadorFalso({}, R9C);
    t.ui.pronto(mundoFalso9());
    const d = t.ui.cenas.diff as CenaDiff;
    t.ui.go = (() => undefined) as never;
    d.enter({ mode: 'arcade', c1: CHEFE_FALSO, c2: id('caio') });
    d.nav('ok');
    expect(t.ui.run!.etapas).toHaveLength(5);
    expect(t.ui.run!.etapas.some((e) => e.chefe)).toBe(false);
  });
});

describe('desbloqueio ao zerar o ARCADE', () => {
  function final(regras: Regras, etapas: Array<{ id: IdLutador; chefe: boolean }>, prog = progressoVazio()) {
    const t = navegadorFalso({}, regras);
    t.persist.prog = prog;
    t.persist.hi = 0;
    t.ui.pronto(mundoFalso9());
    const e = t.ui.cenas.ending as CenaEnding;
    const ir: Array<[string, unknown]> = [];
    t.ui.go = ((n: string, a: unknown) => ir.push([n, a])) as never;
    const run = { c1: id('hayato'), etapas, idx: etapas.length, score: 5000, continues: 3, diff: 1, cont: 0 };
    e.enter({ run });
    return { ...t, e, ir };
  }
  const ladder = [A, B, C, D, id('wei-long')].map((x) => ({ id: x, chefe: false })).concat([{ id: CHEFE_FALSO, chefe: true }]);

  it('1ª zerada derrotando o chefão: libera o 1º da fila E o chefão, nessa ordem; grava e conta a zerada', () => {
    const { e, ui, persist, salvou, ir } = final(R9C, ladder);
    expect(e.novos).toEqual([A, CHEFE_FALSO]);
    expect(persist.prog).toMatchObject({ desbloqueados: [A, CHEFE_FALSO], zeradas: 1, chefeDerrotado: true });
    expect(salvou.n).toBeGreaterThanOrEqual(1);
    ui.t = 61;
    e.key('Enter');
    expect(ir).toEqual([['desbloqueio', { novos: [A, CHEFE_FALSO] }]]);
  });

  it('jogando com o chefão (sem etapa de chefe): só a fila avança', () => {
    const { e, persist } = final(R9C, ladder.slice(0, 5));
    expect(e.novos).toEqual([A]);
    expect(persist.prog.chefeDerrotado).toBe(false);
  });

  it('2ª zerada: o próximo da fila; fila esgotada: nada novo e vai direto ao título', () => {
    const p1 = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, R9C).prog;
    const seg = final(R9C, ladder, p1);
    expect(seg.e.novos).toEqual([B]);
    const cheio = { ...progressoVazio(), desbloqueados: [A, B, C, D, CHEFE_FALSO], zeradas: 5, chefeDerrotado: true };
    const fim = final(R9C, ladder, cheio);
    expect(fim.e.novos).toEqual([]);
    fim.ui.t = 61;
    fim.e.key('Enter');
    expect(fim.ir).toEqual([['title', undefined]]);
  });

  it('produção hoje (sem chefão): zerar o Arcade de 5 etapas libera só o 1º da fila (AMINU); quem já liberou o BAATAR como chefe segue a fila sem perder nada', () => {
    const cinco = ladder.slice(0, 5);
    const novo = final(R9, cinco);
    expect(novo.e.novos).toEqual([A]);
    expect(novo.persist.prog).toMatchObject({ desbloqueados: [A], zeradas: 1, chefeDerrotado: false });
    const antigo = { ...progressoVazio(), desbloqueados: [A, CHEFE_FALSO], zeradas: 1, chefeDerrotado: true, vistos: [A, CHEFE_FALSO] };
    const seg = final(R9, cinco, antigo);
    expect(seg.e.novos).toEqual([B]);
    expect(seg.persist.prog.desbloqueados).toEqual([A, CHEFE_FALSO, B]);
    expect(seg.persist.prog.chefeDerrotado).toBe(true);
  });

  it('onda 1 (fila vazia e chefe null, regras injetadas): zerar não mostra aviso nenhum', () => {
    const onda1: Regras = { ...R9, roster: R9.roster.slice(0, 4), fila: [], chefe: null };
    const { e, ui, ir } = final(onda1, ['wei-long', 'min-ji', 'caio'].map((x) => ({ id: id(x), chefe: false })));
    expect(e.novos).toEqual([]);
    ui.t = 61;
    e.key('Enter');
    expect(ir).toEqual([['title', undefined]]);
  });

  it('tela de aviso: um por id, na ordem; no último volta ao título', () => {
    const t = navegadorFalso({}, R9);
    t.ui.pronto(mundoFalso9());
    const d = t.ui.cenas.desbloqueio as CenaDesbloqueio;
    const ir: Array<[string, unknown]> = [];
    t.ui.go = ((n: string, a: unknown) => ir.push([n, a])) as never;
    d.enter({ novos: [A, CHEFE_FALSO] });
    expect(d.indice).toBe(0);
    t.ui.t = 41;
    d.key('Enter');
    expect(ir[0]).toEqual(['desbloqueio', { novos: [A, CHEFE_FALSO], indice: 1 }]);
    d.enter({ novos: [A, CHEFE_FALSO], indice: 1 });
    d.key('Enter');
    expect(ir[1]).toEqual(['title', undefined]);
    expect(t.audio.nomes().filter((n) => n === 'uiPerfect')).toHaveLength(2);
  });
});

describe('"Como jogar" só mostra quem está liberado', () => {
  it('a lista e as páginas da aba LUTADORES saem dos liberados', () => {
    const t = navegadorFalso({}, R9);
    t.persist.prog = { ...progressoVazio(), desbloqueados: [A, B, C] };
    t.ui.pronto(mundoFalso9());
    const h = t.ui.cenas.how as CenaHow;
    h.enter({ from: 'menu' });
    const lista = (h as unknown as { lista(): IdLutador[] }).lista();
    expect(lista).toEqual(['hayato', 'wei-long', 'min-ji', 'caio', A, B, C]);
    expect([...liberados(t.persist.prog, R9)].sort()).toEqual([...lista].sort());
    h.tab = 4;
    h.key('ArrowDown');
    expect(h.pagina).toBe(1);
    h.key('ArrowDown');
    expect(h.pagina).toBe(0);
    h.tab = 2;
    for (let i = 0; i < 7; i++) h.key('ArrowDown');
    expect(h.cid).toBe(0);
  });
});

describe('HUD de barras do chefão (C3 aditivo, stub)', () => {
  const lutador = (extra: Record<string, unknown> = {}): LutadorLeitura =>
    ({
      id: 'hayato', indice: 0, x: 300, y: 470, facing: 1, state: 'idle', pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 },
      move: null, mt: 0, hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
      combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, ...extra,
    }) as unknown as LutadorLeitura;
  const luta = (b: LutadorLeitura): LeituraLuta =>
    ({
      fighters: [lutador(), b], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 1, cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100,
      shake: 0, hitstop: 0, mode: 'arcade', training: false, stage: 'jp', winner: null, matchWinner: null, matchDone: false, perfect: false,
      trainInfo: { hits: 0, dmg: 0 }, events: [],
    }) as unknown as LeituraLuta;
  const elenco = {
    hayato: { ch: { name: 'HAYATO', proj: { cost: 40 }, head: [0, 0, 190, 190], fichas: {} }, arte: { retrato: () => null } },
    'wei-long': { ch: { name: 'WEI LONG', proj: { cost: 45 }, head: [0, 0, 190, 190], fichas: {} }, arte: { retrato: () => null } },
  } as unknown as Elenco;

  function desenhar(b: LutadorLeitura) {
    const textos: string[] = [];
    const preenchimentos: unknown[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(_, n: string) {
        if (n === 'measureText') return () => ({ width: 10 });
        if (n === 'createLinearGradient' || n === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
        if (n === 'fillText') return (t: string) => textos.push(t);
        return () => undefined;
      },
      set(_, n: string, v: unknown) {
        if (n === 'fillStyle') preenchimentos.push(v);
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    desenharHUD(ctx, luta(b), elenco);
    return { textos, preenchimentos };
  }

  it('sem campos de chefe (o jogo de hoje): desenha como sempre, sem contador nem faixa', () => {
    const { textos, preenchimentos } = desenhar(lutador({ id: 'wei-long', indice: 1 }));
    expect(textos.some((t) => t.startsWith('×') || t === 'CHEFÃO')).toBe(false);
    expect(preenchimentos).toContain('#4a0d12');
  });

  it('chefão com 2 barras: contador ×2, faixa CHEFÃO e a barra de baixo por trás (o fundo vermelho some da vida)', () => {
    const { textos, preenchimentos } = desenhar(lutador({ id: 'wei-long', indice: 1, barras: 2, barrasMax: 2, chefe: true, cpu: 1 }));
    expect(textos).toContain('×2');
    expect(textos.some((t) => t.includes('CHEFÃO'))).toBe(true);
    expect(textos.some((t) => t.includes('CPU'))).toBe(false);
    expect(preenchimentos.filter((p) => p === '#4a0d12')).toHaveLength(1); // só a barra do P1; a do chefão mostra a 2ª barra por trás
  });

  it('na última barra: ×1 e a barra volta ao fundo simples', () => {
    const { textos, preenchimentos } = desenhar(lutador({ id: 'wei-long', indice: 1, barras: 1, barrasMax: 2, chefe: true }));
    expect(textos).toContain('×1');
    expect(textos.some((t) => t.includes('CHEFÃO'))).toBe(true);
    expect(preenchimentos).toContain('#4a0d12');
  });
});

describe('regras de produção (E5)', () => {
  it('são coerentes (INICIAIS + FILA + CHEFE = roster, sem repetição) e os iniciais são os 4 do protótipo', () => {
    const uniao = [...R9.iniciais, ...R9.fila, ...(R9.chefe ? [R9.chefe] : [])];
    expect(new Set(uniao).size).toBe(uniao.length);
    expect([...uniao].sort()).toEqual([...R9.roster].sort());
    expect(R9.iniciais).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
  });
});
