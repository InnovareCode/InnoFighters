import { describe, expect, it } from 'vitest';
import { LUTADORES } from '../../src/data/lutadores';
import { DADOS_ORIGINAIS, montarTodos } from './_lutadores';

/*
 * WEI LONG, arte nova (2026-10-23): a identidade de luta de hoje fica; só a arte muda. O alcance de cada golpe nasce da ponta
 * (tipX/tipY) do atlas, e as poses novas chegam menos longe (hp, hk, soco aéreo, ombrada) ou mais (lk). Os `rm` de
 * src/data/lutadores/wei-long.ts devolvem a caixa ao tamanho de antes, a -2,5% de propósito (largura igual deixava o WEI 3 pontos
 * mais forte no harness). Referência = ORÁCULO (atlas original + dados do protótipo); medida = produção (atlas novo + LUTADORES).
 */
const antes = montarTodos()['wei-long'];
const depois = montarTodos({ arteReal: true, dadosDeProducao: true })['wei-long'];
type Caixa = { fx: number; fy: number; w: number; h: number };
const caixa = (c: typeof antes, n: string): Caixa => (c.boxes as unknown as Record<string, Caixa>)[n]!;
const faixa = (c: Caixa): [number, number] => [c.fy - c.h, c.fy]; // [pé da caixa, topo da caixa] em px acima do chão
const EM_PE: [number, number] = [50, 244.8];
const AGACHADO: [number, number] = [50, 142.8];
const encosta = (a: [number, number], b: [number, number]): boolean => a[0] < b[1] && b[0] < a[1];

describe('WEI LONG: alcance (largura da caixa) a +-10% do original', () => {
  const GOLPES = ['lp', 'lk', 'hp', 'hk', 'clp', 'clk', 'chp', 'chk', 'jlp', 'jhp', 'jlk', 'jhk', 'throw', 'sFwd'];
  it.each(GOLPES)('%s', (n) => {
    const a = caixa(antes, n).w;
    const d = caixa(depois, n).w;
    expect(d, `${n}: ${a.toFixed(0)} -> ${d.toFixed(0)}`).toBeGreaterThanOrEqual(a * 0.9);
    expect(d, `${n}: ${a.toFixed(0)} -> ${d.toFixed(0)}`).toBeLessThanOrEqual(a * 1.1);
  });
});

describe('WEI LONG: a ombrada (TIE SHAN KAO, sc1) e o soco aéreo (jpunch)', () => {
  it('a ponta do sc1 é o ombro (modo mao:0.5), não o joelho: a caixa nasce na altura do tronco', () => {
    const sc1 = depois.pd['sc1']!;
    expect(sc1.tipY!).toBeGreaterThan(120); // o joelho dava ~63
    expect(depois.moves['sFwd']!.anim.a[0]).toBe('sc1');
    expect(encosta(faixa(caixa(depois, 'sFwd')), EM_PE)).toBe(true);
    expect(encosta(faixa(caixa(depois, 'sFwd')), AGACHADO)).toBe(true);
  });

  it('o motor usa o jpunch do atlas (pose própria), não a ponte para o jkick', () => {
    expect(depois.alias['jpunch']).toBeUndefined();
    expect(depois.pd['jpunch']?.tipX).toBeTypeOf('number');
    expect(depois.moves['jlp']!.anim.a[0]).toBe('jpunch');
    expect(depois.moves['jhp']!.anim.a[0]).toBe('jpunch');
    // o oráculo (atlas original) também já tinha o jpunch; a caixa da produção sai de pd.jpunch (não do jkick)
    expect(depois.pd['jpunch']!.tipX).not.toBe(depois.pd['jkick']!.tipX);
  });
});

describe('WEI LONG: altura da caixa (desvios que os dados não corrigem: o ponto de contato mudou com a arte)', () => {
  it('ficam registrados', () => {
    const topo = (c: typeof antes, n: string): number => faixa(caixa(c, n))[1];
    const desvio = (n: string): number => topo(depois, n) - topo(antes, n);
    expect(desvio('clp')).toBeGreaterThan(50); // soco agachado sobe
    expect(desvio('jlp')).toBeLessThan(-100); // palmada aérea: a palma está embaixo
    expect(desvio('jhp')).toBeLessThan(-100);
    expect(desvio('lk')).toBeGreaterThan(30);
    expect(Math.abs(desvio('hk'))).toBeLessThan(10);
  });
});

describe('WEI LONG: dados de produção x oráculo', () => {
  it('os especiais só diferem do protótipo no rm da ombrada', () => {
    const orig = DADOS_ORIGINAIS['wei-long']!.especiais as unknown as Record<string, Record<string, unknown>>;
    const prod = LUTADORES['wei-long'].especiais as unknown as Record<string, Record<string, unknown>>;
    const sem = (m: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'rm' && k !== 'bh'));
    for (const g of ['sFire', 'sDown', 'sFwd']) expect(sem(prod[g]!), g).toEqual(sem(orig[g]!));
    expect(prod['sFwd']!['rm']).toBe(2.02);
    expect(orig['sFwd']!['rm']).toBe(0.95);
  });
});
