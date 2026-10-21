import { describe, expect, it } from 'vitest';
import type { IdLutador } from '../../src/core/contratos';
import { aplicarVitoriaArcade, progressoVazio, REGRAS_PADRAO } from '../../src/meta';
import type { CenaSelect } from '../../src/ui/cenas/select';
import type { Mundo } from '../../src/ui/contexto';
import { CASA_DE_HONRA, colunasDaGrade, estadoDaCasa, moverNaGrade, ordemDaGrade, podeEscolher, retanguloDaCasa, retanguloDeToque, temCasaDeHonra } from '../../src/ui/grade';
import type { Elenco } from '../../src/assets/elenco';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { ESCALA_MAXIMA_DE_VITRINE, escalaDeVitrine } from '../../src/ui/personagens';
import { mundoFalso, navegadorFalso } from './_ui';

// elenco de produção (com o ZENON real) e uma arte falsa: o desenho do painel do lutador precisa das poses de verdade
const prod = montarElenco();
const IMG0 = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte0 = { pronta: true, imagemDe: () => IMG0, silhuetaDe: () => IMG0, retrato: () => null };
const elencoReal = Object.fromEntries(Object.entries(prod).map(([k, ch]) => [k, { ch, arte: arte0 }])) as unknown as Elenco;

/*
 * Z2 (Lyra): a grade de seleção com 10 lutadores = 3x3 de regulares + a CASA DE HONRA do chefão (256x44) embaixo (docs/spec-chefao-zenon.md §7).
 * A geometria é em px lógicos: o canvas só escala; o que cabe aqui cabe no desktop 960x540 e no celular deitado (a medida no navegador está em
 * tests/e2e/zenon-z2z3.spec.ts).
 */
const id = (s: string): IdLutador => s as IdLutador;
const R10 = REGRAS_PADRAO;
const ZENON = id('zenon');
const REGULARES = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar'].map(id);

const cruza = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

describe('ordem da grade de 10', () => {
  it('a produção de hoje tem 10 lutadores e o ZENON é o chefão', () => {
    expect(R10.roster).toHaveLength(10);
    expect(R10.chefe).toBe(ZENON);
  });

  it('os 9 regulares na ordem do ROSTER (o BAATAR fecha a 3x3 na 9ª casa, o AMINU fica no centro) e o chefão por último = casa de honra', () => {
    const g = ordemDaGrade(R10.roster, R10.chefe);
    expect(g).toEqual([...REGULARES, ZENON]);
    expect(g[8]).toBe('baatar');
    expect(g[4]).toBe('aminu');
    expect(g[9]).toBe(ZENON);
  });

  it('não muda o que já existia: 9 com chefão = chefão no CENTRO; 9 sem chefão e 4 = ordem do roster', () => {
    const r9 = R10.roster.slice(0, 9);
    const g = ordemDaGrade(r9, 'baatar');
    expect(g[4]).toBe('baatar');
    expect(g.filter((x) => x !== 'baatar')).toEqual(r9.filter((x) => x !== 'baatar'));
    expect(ordemDaGrade(r9, null)).toEqual(r9);
    expect(ordemDaGrade(r9.slice(0, 4), null)).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
  });

  it('só há casa de honra com 10 casas', () => {
    expect([4, 8, 9, 10, 11].map(temCasaDeHonra)).toEqual([false, false, false, true, false]);
    expect(colunasDaGrade(10)).toBe(3);
  });
});

describe('geometria da casa de honra (interseção = 0 px²)', () => {
  const casas = Array.from({ length: 10 }, (_, i) => retanguloDaCasa(i, 3, 10));
  const regulares = casas.slice(0, 9);
  /** O painel de descrição desce para y 408 (92 px) com a casa de honra, e a faixa de dica fica em y 510 a 540. */
  const painel = { x: 352, y: 408, w: 256, h: 92 };
  const dica = { x: 0, y: 510, w: 960, h: 30 };
  /** Os painéis dos lados (lutador à esquerda, rival/lutador à direita). */
  const ladoEsq = { x: 20, y: 374, w: 284, h: 132 };
  const ladoDir = { x: 656, y: 374, w: 284, h: 132 };
  const rivais = { x: 656, y: 100, w: 284, h: 250 };

  it('a casa 9 é a faixa de 256x44 logo abaixo da 3x3; as outras 9 casas seguem iguais a antes', () => {
    expect(casas[9]).toEqual(CASA_DE_HONRA);
    expect(CASA_DE_HONRA).toEqual({ x: 352, y: 356, w: 256, h: 44 });
    for (let i = 0; i < 9; i++) expect(casas[i]).toEqual(retanguloDaCasa(i, 3));
    expect(retanguloDaCasa(9, 3)).toEqual({ x: 352, y: 356, w: 80, h: 80 }); // sem `n` o resultado é o de sempre (o bug A5 era esta 10ª casa em cima do painel)
  });

  it('nenhuma casa cruza outra', () => {
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) expect(cruza(casas[i]!, casas[j]!), `${i} x ${j}`).toBe(0);
  });

  it('a casa de honra (com a moldura de 4 px de cada lado que a casa desenha) não toca a 3ª linha, o painel nem a faixa de dica', () => {
    const h = casas[9]!;
    const comMoldura = { x: h.x - 4, y: h.y - 4, w: h.w + 8, h: h.h + 8 };
    const molduraDaTerceira = regulares.slice(6).map((c) => ({ x: c.x - 4, y: c.y - 4, w: c.w + 8, h: c.h + 8 }));
    for (const c of molduraDaTerceira) expect(cruza(comMoldura, c)).toBe(0);
    expect(cruza(comMoldura, painel)).toBe(0);
    expect(cruza(comMoldura, dica)).toBe(0);
    expect(cruza(painel, dica)).toBe(0);
    for (const r of regulares) expect(cruza(painel, r)).toBe(0);
  });

  it('nada do centro cruza os painéis dos lados', () => {
    for (const lado of [ladoEsq, ladoDir, rivais]) {
      for (const r of [...casas, painel]) expect(cruza(r, lado)).toBe(0);
    }
  });

  it('o painel e a casa cabem na tela de 960x540 e a faixa de dica sobra', () => {
    for (const r of [casas[9]!, painel]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(960);
      expect(r.y + r.h).toBeLessThanOrEqual(510);
    }
  });
});

describe('área de toque da casa de honra', () => {
  it('a honra ganha 4 px de folga em cima e 8 embaixo (56 px lógicos); as outras casas seguem iguais; sem honra nada muda', () => {
    expect(retanguloDeToque(9, 3, 10)).toEqual({ x: 352, y: 352, w: 256, h: 56 });
    for (let i = 0; i < 9; i++) expect(retanguloDeToque(i, 3, 10)).toEqual(retanguloDaCasa(i, 3, 10));
    expect(retanguloDeToque(8, 3, 9)).toEqual(retanguloDaCasa(8, 3));
    expect(retanguloDeToque(3, 2, 4)).toEqual(retanguloDaCasa(3, 2));
  });

  it('a folga não invade nenhuma outra casa nem o painel de descrição', () => {
    const t = retanguloDeToque(9, 3, 10);
    for (let i = 0; i < 9; i++) expect(cruza(t, retanguloDaCasa(i, 3, 10)), `casa ${i}`).toBe(0);
    expect(cruza(t, { x: 352, y: 408, w: 256, h: 92 })).toBe(0);
  });
});

describe('navegação com a casa de honra', () => {
  const mover = (i: number, ...d: Array<'up' | 'down' | 'left' | 'right'>): number => d.reduce((c, x) => moverNaGrade(c, x, 10, 3), i);

  it('↓↓↓↑ a partir da casa 1 termina na 7 (o centro de baixo)', () => {
    expect(mover(1, 'down', 'down', 'down', 'up')).toBe(7);
    expect(mover(1, 'down', 'down', 'down')).toBe(9);
  });

  it('para baixo, de qualquer casa da 3ª linha vai para a honra; para cima, da honra vai para a 7', () => {
    for (const i of [6, 7, 8]) expect(mover(i, 'down'), `de ${i}`).toBe(9);
    expect(mover(9, 'up')).toBe(7);
  });

  it('esquerda e direita na honra não mudam de casa; para baixo, da honra volta ao centro de cima; para cima da 1ª linha vai à honra (a volta)', () => {
    expect(mover(9, 'left')).toBe(9);
    expect(mover(9, 'right')).toBe(9);
    expect(mover(9, 'down')).toBe(1);
    for (const i of [0, 1, 2]) expect(mover(i, 'up'), `de ${i}`).toBe(9);
  });

  it('nas 9 casas regulares anda como a 3x3 de sempre (com volta nas bordas da linha)', () => {
    expect(mover(0, 'right')).toBe(1);
    expect(mover(2, 'right')).toBe(0);
    expect(mover(0, 'left')).toBe(2);
    expect(mover(4, 'down')).toBe(7);
    expect(mover(4, 'up')).toBe(1);
    expect(mover(3, 'down')).toBe(6);
  });

  it('sem a casa de honra (9, 8 e 4 casas) nada mudou: volta nas bordas e última linha incompleta', () => {
    expect(moverNaGrade(8, 'down', 9, 3)).toBe(2);
    expect(moverNaGrade(0, 'up', 9, 3)).toBe(6);
    expect(moverNaGrade(7, 'down', 8, 3)).toBe(1);
    expect(moverNaGrade(0, 'down', 4, 2)).toBe(2);
  });
});

describe('a cena de seleção com 10 casas', () => {
  function select(prog = progressoVazio(), modo: 'versus' | 'cpu' | 'arcade' | 'training' = 'arcade', real = false) {
    const t = navegadorFalso({}, R10);
    t.persist.prog = prog;
    const IMG = { tag: 'img' } as unknown as CanvasImageSource;
    t.ui.pronto({ ...mundoFalso(), ...(real ? { elenco: elencoReal } : {}), rec: { cenarioPadrao: IMG, vinheta: IMG } } as unknown as Mundo);
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: modo });
    const ir: string[] = [];
    t.ui.go = ((n: string, a: unknown) => ir.push(`${n} ${JSON.stringify(a)}`)) as never;
    return { ...t, s, ir };
  }

  it('abre com 10 casas, o chefão é a última e fica "???" (chefe-oculto) até ser derrotado', () => {
    const { s, persist } = select();
    expect(s.grade).toHaveLength(10);
    expect(s.grade[9]).toBe(ZENON);
    expect(estadoDaCasa(ZENON, { prog: persist.prog, regras: R10, novos: new Set() })).toBe('chefe-oculto');
    expect(podeEscolher('chefe-oculto')).toBe(false);
  });

  it('↓↓↓↑ pelo teclado da cena: da casa 1 vai a 4, 7, 9 e volta à 7', () => {
    const { s } = select();
    s.cur[0] = 1;
    const vistas: number[] = [];
    for (let i = 0; i < 3; i++) {
      s.key('ArrowDown');
      vistas.push(s.cur[0]);
    }
    s.key('ArrowUp');
    vistas.push(s.cur[0]);
    expect(vistas).toEqual([4, 7, 9, 7]);
  });

  it('o cursor anda por cima da casa de honra travada, mas Enter não confirma (som de negação) em nenhum modo', () => {
    for (const modo of ['arcade', 'versus', 'cpu', 'training'] as const) {
      const { s, audio, ir } = select(progressoVazio(), modo);
      s.cur[0] = 9;
      s.key('Enter');
      expect(s.lock[0], modo).toBe(false);
      expect(audio.nomes(), modo).toContain('deny');
      expect(ir, modo).toEqual([]);
    }
  });

  it('o clique no retângulo da casa de honra põe o cursor nela e (travada) não confirma; clicar no painel de descrição não faz nada', () => {
    const { s, audio } = select();
    s.cur[0] = 0;
    s.click(480, 378); // meio da casa de honra (352..608 x 356..400)
    expect(s.cur[0]).toBe(9);
    expect(s.lock[0]).toBe(false);
    expect(audio.nomes()).toContain('deny');
    s.cur[0] = 0;
    s.click(480, 450); // painel de descrição
    expect(s.cur[0]).toBe(0);
  });

  it('o mouse por cima da casa de honra move o cursor para ela', () => {
    const { s } = select();
    s.cur[0] = 0;
    s.hover(480, 378);
    expect(s.cur[0]).toBe(9);
    s.cur[0] = 0;
    s.hover(480, 405); // no vão entre a casa e o painel: ainda é a área de toque da honra (folga até y 408)
    expect(s.cur[0]).toBe(9);
    s.cur[0] = 0;
    s.hover(480, 409); // já no painel de descrição: nenhuma casa
    expect(s.cur[0]).toBe(0);
    s.hover(480, 351); // acima da folga, entre a 3ª linha e a honra: nenhuma casa
    expect(s.cur[0]).toBe(0);
  });

  it('derrotado o ZENON, a casa de honra vira NOVO! e confirma; nas visitas seguintes fica liberada', () => {
    const prog = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, R10).prog;
    expect(prog.desbloqueados).toContain(ZENON);
    const { s, ir } = select(prog, 'arcade');
    expect(s.novos.has(ZENON)).toBe(true);
    s.cur[0] = 9;
    s.key('Enter');
    expect(s.lock[0]).toBe(true);
    for (let i = 0; i < 60; i++) s.update();
    expect(ir[0]).toMatch(/^diff \{"mode":"arcade","c1":"zenon"/);
  });

  it('o desenho da casa de honra: "???" e "O ANFITRIÃO" oculta; nome, título e "CHEFÃO" liberada; sem erro em nenhum dos dois', () => {
    const oculto = select();
    oculto.s.cur[0] = 9;
    oculto.s.draw();
    const textosO = oculto.g.textos();
    expect(textosO).toContain('O ANFITRIÃO');
    expect(textosO.filter((x) => x === '???').length).toBeGreaterThan(0);
    expect(textosO).not.toContain('ZENON');

    const prog = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, R10).prog;
    const livre = select(prog, 'arcade', true);
    livre.s.cur[0] = 9;
    livre.s.draw();
    const textosL = livre.g.textos();
    expect(textosL).toContain('ZENON');
    expect(textosL).toContain('O ARCONTE');
    expect(textosL).toContain('CHEFÃO');
  });
});

describe('escala da vitrine: nenhum lutador sai da tela na seleção, no VS e no final', () => {
  const ids = Object.keys(prod) as IdLutador[];

  it('os 8 de até 1,06 (os 4 originais inclusive) ficam EXATAMENTE como estavam; só o BAATAR e o ZENON encolhem na vitrine', () => {
    const fatores = Object.fromEntries(ids.map((i) => [i, escalaDeVitrine(prod[i]!)]));
    for (const i of ids.filter((x) => prod[x]!.scale <= 1.1)) expect(fatores[i], i).toBe(1);
    expect(fatores['baatar']).toBeCloseTo(1.1 / 1.28, 5);
    expect(fatores['zenon']).toBeCloseTo(1.1 / 1.32, 5);
    expect(ESCALA_MAXIMA_DE_VITRINE).toBe(1.1);
  });

  it('o topo do lutador (idle0 = 255 px x escala) fica dentro da tela: seleção (pés em y 362, 1,18), VS (pés em 470, 1,55) e final (pés em 500, 1,6)', () => {
    for (const i of ids) {
      const h = 255 * prod[i]!.scale * escalaDeVitrine(prod[i]!);
      expect(362 - h * 1.18, `${i} seleção`).toBeGreaterThanOrEqual(25);
      expect(470 - h * 1.55, `${i} VS`).toBeGreaterThanOrEqual(0);
      expect(500 - h * 1.6, `${i} final`).toBeGreaterThanOrEqual(30);
    }
  });
});
