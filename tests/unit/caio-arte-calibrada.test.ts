import { describe, expect, it } from 'vitest';
import { LUTADORES } from '../../src/data/lutadores';
import { DADOS_ORIGINAIS, montarTodos } from './_lutadores';

/*
 * CAIO, arte nova (2026-10-23): a identidade de luta de hoje fica; só a arte muda. O alcance de cada golpe nasce da ponta
 * (tipX/tipY) do atlas, e as poses novas chegam mais longe ou mais perto. Os `rm`/`bh` de src/data/lutadores/caio.ts devolvem a
 * caixa ao tamanho de antes. A referência é o ORÁCULO (atlas original + dados do protótipo, `montarTodos()`); a medida é a
 * produção (atlas novo + `LUTADORES.caio`). Se a arte do CAIO mudar de novo, este teste diz quanto o alcance andou.
 */
const antes = montarTodos().caio;
const depois = montarTodos({ arteReal: true, dadosDeProducao: true }).caio;
type Caixa = { fx: number; fy: number; w: number; h: number };
const caixa = (c: typeof antes, n: string): Caixa => (c.boxes as unknown as Record<string, Caixa>)[n]!;
const base = (c: Caixa): [number, number] => [c.fy - c.h, c.fy]; // [pé da caixa, topo da caixa] em px acima do chão

// Hurtbox de quem está em pé (96% de SH = 255) ou agachado (56%): src/fight/colisao.ts; o fundo é a 50 px do chão.
const EM_PE: [number, number] = [50, 244.8];
const AGACHADO: [number, number] = [50, 142.8];
const encosta = (a: [number, number], b: [number, number]): boolean => a[0] < b[1] && b[0] < a[1];

describe('CAIO: alcance (largura da caixa) volta a +-10% do original', () => {
  const GOLPES = ['lp', 'lk', 'hp', 'hk', 'clp', 'clk', 'chp', 'chk', 'jlp', 'jhp', 'jlk', 'jhk', 'throw', 'sDown', 'sFwd'];
  it.each(GOLPES)('%s', (n) => {
    const a = caixa(antes, n).w;
    const d = caixa(depois, n).w;
    expect(d, `${n}: ${a.toFixed(0)} -> ${d.toFixed(0)}`).toBeGreaterThanOrEqual(a * 0.9);
    expect(d, `${n}: ${a.toFixed(0)} -> ${d.toFixed(0)}`).toBeLessThanOrEqual(a * 1.1);
  });

  it('a rasteira continua o maior alcance do CAIO (400) e o hk o maior dos golpes de pé', () => {
    expect(caixa(depois, 'sDown').w).toBeGreaterThanOrEqual(360);
    const mais = (['lp', 'lk', 'hp', 'hk', 'clk', 'chk'] as const).map((n) => caixa(depois, n).w);
    expect(Math.max(...mais)).toBe(caixa(depois, 'hk').w);
  });
});

describe('CAIO: altura da caixa', () => {
  it('o hk mantém o pé da caixa de antes (158): a caixa nova só sobe acima da cabeça', () => {
    expect(base(caixa(depois, 'hk'))[0]).toBeCloseTo(base(caixa(antes, 'hk'))[0], 0);
  });

  it('a meia-lua (sFwd, "over") acerta quem está em pé E quem está agachado, como a de antes', () => {
    for (const c of [antes, depois]) {
      expect(encosta(base(caixa(c, 'sFwd')), EM_PE)).toBe(true);
      expect(encosta(base(caixa(c, 'sFwd')), AGACHADO)).toBe(true);
    }
  });

  it('a rasteira (sDown) segue rente ao chão e acerta as pernas de quem está em pé', () => {
    const [pe, topo] = base(caixa(depois, 'sDown'));
    expect(topo).toBeLessThan(120);
    expect(pe).toBeLessThan(60);
    expect(encosta([pe, topo], EM_PE)).toBe(true);
  });

  it('desvios de altura que os dados NÃO corrigem (a arte é que mudou o ponto de contato): ficam registrados', () => {
    const desvio = (n: string): number => base(caixa(depois, n))[1] - base(caixa(antes, n))[1];
    expect(desvio('clp')).toBeLessThan(-50); // soco agachado: agora ao nível do peito, a caixa desce
    expect(desvio('jlp')).toBeLessThan(-50); // soco aéreo = ponte do jkick
    expect(desvio('jhp')).toBeLessThan(-50);
    expect(desvio('chk')).toBeGreaterThan(30);
    expect(Math.abs(desvio('lk'))).toBeLessThan(20);
    expect(Math.abs(desvio('sDown'))).toBeLessThan(20);
  });
});

describe('CAIO: sb2 sem ponta (a perna estendida aponta para trás; sem ponta não há rastro)', () => {
  it('o quadro sb2 não tem tipX/tipY e a caixa da rasteira vem do sb1, o primeiro ativo', () => {
    expect(depois.pd['sb2']?.tipX).toBeUndefined();
    expect(depois.pd['sb2']?.tipY).toBeUndefined();
    expect(depois.moves['sDown']!.anim.a[0]).toBe('sb1');
    expect(depois.pd['sb1']?.tipX).toBeTypeOf('number');
    expect(depois.pd['sc1']?.tipX).toBeTypeOf('number');
  });
});

describe('CAIO: dados de produção x oráculo', () => {
  it('os especiais de produção só diferem do protótipo em rm e bh (o resto é o mesmo golpe)', () => {
    const orig = DADOS_ORIGINAIS['caio']!.especiais as unknown as Record<string, Record<string, unknown>>;
    const prod = LUTADORES.caio.especiais as unknown as Record<string, Record<string, unknown>>;
    const sem = (m: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'rm' && k !== 'bh'));
    for (const g of ['sFire', 'sDown', 'sFwd']) expect(sem(prod[g]!), g).toEqual(sem(orig[g]!));
    expect(prod['sDown']!['rm']).toBe(2.8);
    expect(prod['sFwd']!['rm']).toBe(0.76);
    expect(prod['sFwd']!['bh']).toBe(160);
  });
});
