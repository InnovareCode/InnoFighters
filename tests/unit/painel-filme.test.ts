import { describe, expect, it } from 'vitest';
import { CHAVES_DE_ROTEIRO, roteiroDaTabela, roteiroGenerico } from '../../src/data/roteiros-filme';
import {
  ALFA_DO_FUNDO_DO_PAINEL, ALTURA_DO_PAINEL, FRACAO_DA_ALTURA_DA_CELULA, LARGURA_DO_PAINEL, desenharPainelDeClose, encaixeDaCelula, geometriaDoPainel,
} from '../../src/render/filme';
import { LARGURA } from '../../src/core/constantes';
import { lerManifestoC1 } from './_lutadores';
import type { Ctx } from '../../src/render/tela';

/** Contexto 2D falso que grava chamadas ([nome, ...args]) e atribuições (['=nome', valor]). */
function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_, nome: string) => (...a: unknown[]) => chamadas.push([nome, ...a]),
    set: (_, nome: string, valor: unknown) => (chamadas.push([`=${nome}`, valor]), true),
  }) as unknown as Ctx;
  return { ctx, chamadas };
}

/*
 * Os 4 ajustes do painel do filme que a curadoria do Apolo pediu (docs/curadoria-filme-hayato-v1.md 6.2), medidos nas células REAIS do HAYATO
 * (public/assets/lutadores/hayato/atlas.json, bloco `filme`).
 */
const CELULAS = Object.entries(lerManifestoC1('hayato').filme!.quadros);

describe('1. o grito do projétil dura de t0 a t12 (sem a batida de t6)', () => {
  const projeteis = CHAVES_DE_ROTEIRO.filter((k) => roteiroDaTabela(k)?.tipo === 'projetil');

  it('em todos os projéteis da tabela e no modelo genérico: a 2ª batida é a do disparo, em t12, e não existe batida em t6', () => {
    expect(projeteis.length).toBeGreaterThanOrEqual(6);
    for (const nome of [...projeteis, 'modelo']) {
      const r = nome === 'modelo' ? roteiroGenerico('projetil', 'sFire') : roteiroDaTabela(nome)!;
      expect(r.batidas[0]?.t, nome).toBe(0);
      expect(r.batidas[0]?.retrato, nome).toBe(true);
      expect(r.batidas[1]?.t, nome).toBe(12);
      expect(r.batidas[1]?.tc, nome).toBe(0);
      expect(r.batidas.some((b) => b.t === 6), nome).toBe(false);
    }
  });

  it('os marcos (impacto, reação, lançamento, queda) seguem apontando as batidas certas depois da remoção', () => {
    for (const nome of projeteis) {
      const r = roteiroDaTabela(nome)!;
      expect(r.batidas[r.marcos.impacto]?.t, `${nome} impacto`).toBe(22);
      expect(r.batidas[r.marcos.reacao]?.t, `${nome} reação`).toBe(34);
      expect(r.batidas[r.marcos.lancamento]?.t, `${nome} lançamento`).toBe(44);
      expect(r.batidas[r.marcos.queda]?.rival, `${nome} queda`).toBe('koFloor');
    }
  });

  it('o desvio por índice que marca o projétil visual continua na batida do disparo (a de t22 ou a que o dado escolheu)', () => {
    // o modelo marca o disparo em t22; wei-long/sDown troca o rival ali, min-ji e caio movem o projétil para uma batida seguinte
    expect(roteiroDaTabela('wei-long/sDown')!.batidas.find((b) => b.t === 22)?.rival).toBe('hitB');
    expect(roteiroDaTabela('min-ji/sFire')!.batidas.find((b) => b.t === 28)?.projetil).toBe(true);
    expect(roteiroDaTabela('caio/sFire')!.batidas.find((b) => b.t === 34)?.projetil).toBe(true);
  });
});

describe('2. o fundo do painel esconde o lutador do mundo', () => {
  it('fundo a 0,94 (a 0,85 o sprite do mundo e os números de dano apareciam como fantasma)', () => {
    expect(ALFA_DO_FUNDO_DO_PAINEL).toBe(0.94);
    const g = gravador();
    const id = { paleta: { nucleo: '#fff', brilho: '#0ff', sombra: '#003' } } as Parameters<typeof desenharPainelDeClose>[3];
    desenharPainelDeClose(g.ctx, { tag: 'folha' } as unknown as CanvasImageSource, { x: 0, y: 0, w: 300, h: 600, ax: 150 }, id, { atacando: true, deQuemEstaEsquerda: true, facing: 1, idade: 10 });
    const iFundo = g.chamadas.findIndex(([n]) => n === 'fillRect');
    const alfaDoFundo = g.chamadas.slice(0, iFundo).filter(([n]) => n === '=globalAlpha').pop();
    expect(alfaDoFundo?.[1]).toBe(0.94); // o último alfa antes do fillRect do fundo
  });
});

// ponto dentro do polígono convexo (qualquer orientação)
function dentro(p: readonly [number, number], poli: readonly (readonly [number, number])[]): boolean {
  let sinal = 0;
  for (let i = 0; i < poli.length; i++) {
    const a = poli[i]!;
    const b = poli[(i + 1) % poli.length]!;
    const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (c === 0) continue;
    if (sinal === 0) sinal = Math.sign(c);
    else if (Math.sign(c) !== sinal) return false;
  }
  return true;
}

describe('3 e 4. a célula cabe no painel inclinado, com folga em cima', () => {
  const caixa = (e: ReturnType<typeof encaixeDaCelula>, base: number): [number, number][] => [
    [e.cx - e.w / 2, base - e.h], [e.cx + e.w / 2, base - e.h], [e.cx + e.w / 2, base], [e.cx - e.w / 2, base],
  ];

  it('as 6 células do HAYATO, nos dois lados da tela: a caixa inteira fica DENTRO do painel (inclusive a célula larga, do gancho)', () => {
    expect(CELULAS).toHaveLength(6);
    for (const esquerda of [true, false]) {
      const poli = geometriaDoPainel(esquerda, 1).pontos;
      const base = geometriaDoPainel(esquerda, 1).base;
      for (const [nome, pd] of CELULAS) {
        const e = encaixeDaCelula(pd, esquerda);
        for (const [x, y] of caixa(e, base)) expect(dentro([x, y], poli), `${nome} ${esquerda ? 'esquerda' : 'direita'} (${Math.round(x)}, ${Math.round(y)})`).toBe(true);
      }
    }
  });

  it('CONTROLE NEGATIVO: o encaixe de antes (largura cheia do painel, centro em 200) deixava a célula larga FORA da borda inclinada com o atacante à direita', () => {
    const [, pd] = CELULAS.find(([n]) => n === 'f2')!;
    const k = Math.min(LARGURA_DO_PAINEL / pd.w, ALTURA_DO_PAINEL / pd.h);
    const antigo = { k, w: pd.w * k, h: pd.h * k, cx: LARGURA - (LARGURA_DO_PAINEL - 60) / 2 };
    const g = geometriaDoPainel(false, 1);
    expect(caixa(antigo, g.base).every((p) => dentro(p, g.pontos))).toBe(false);
    expect(caixa(encaixeDaCelula(pd, false), g.base).every((p) => dentro(p, g.pontos))).toBe(true);
  });

  it('a célula alta usa 96% da altura do painel (o cabelo não encosta no topo): ampliação ~1,02x sobre os 670 px da página', () => {
    expect(FRACAO_DA_ALTURA_DA_CELULA).toBe(0.96);
    for (const [nome, pd] of CELULAS) {
      const e = encaixeDaCelula(pd, true);
      expect(e.h, nome).toBeLessThanOrEqual(ALTURA_DO_PAINEL * 0.96 + 1e-9);
    }
    // f3 (grito, 750 de largura) é de altura limitada: ocupa exatamente os 96%
    const f1 = CELULAS.find(([n]) => n === 'f1')![1];
    expect(encaixeDaCelula(f1, true).h).toBeCloseTo(ALTURA_DO_PAINEL * 0.96, 6);
    const folga = ALTURA_DO_PAINEL - encaixeDaCelula(f1, true).h;
    expect(folga).toBeGreaterThanOrEqual(0.04 * ALTURA_DO_PAINEL - 1e-9);
  });

  it('o desenho usa o encaixe: o drawImage sai com a largura e a altura do encaixe, encostado na base', () => {
    const id = { paleta: { nucleo: '#fff', brilho: '#0ff', sombra: '#003' } } as Parameters<typeof desenharPainelDeClose>[3];
    const [, pd] = CELULAS.find(([n]) => n === 'f2')!;
    const g = gravador();
    desenharPainelDeClose(g.ctx, { tag: 'folha' } as unknown as CanvasImageSource, pd, id, { atacando: true, deQuemEstaEsquerda: false, facing: -1, idade: 10 });
    const d = g.chamadas.find(([n]) => n === 'drawImage')!;
    const e = encaixeDaCelula(pd, false);
    expect([d[8], d[9]]).toEqual([e.w, e.h]);
    expect(Number(d[7]) + Number(d[9])).toBe(0);
    const t = g.chamadas.find(([n]) => n === 'translate')!;
    expect(t[1]).toBeCloseTo(e.cx, 6);
  });
});
