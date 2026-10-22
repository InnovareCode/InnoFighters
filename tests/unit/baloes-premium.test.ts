import { afterEach, describe, expect, it, vi } from 'vitest';
import { LUTADORES } from '../../src/data/lutadores';
import {
  BALAO,
  colocarBalao,
  contornoDoPainel,
  corDoNomeNaPlaca,
  desenharBalao,
  emCaixaAlta,
  ESTILOS,
  escalaDoPop,
  escalaDoPopDoZenon,
  esquecerCamadas,
  camadasGuardadas,
  ladoDaPlaca,
  LIMITES_COM_HUD,
  medirBalao,
  normalizarCor,
  palavrasDeEnfase,
  tremorDeImpacto,
  type VarianteDoBalao,
} from '../../src/render/balao';
import { falaDaRodada, falaDaVitoria, falasDaAbertura, linhaDaProvocacao, montarRoteiro, varianteDaFala, type FalaDoRoteiro } from '../../src/render/provocacao';
import { gravador } from './_ui';

/*
 * Balões premium, "Tarja de Impacto" (docs/direcao-arte-baloes.md). Os números são LITERAIS da direção de arte (nunca importados do código sob teste). A medida com a fonte
 * Bangers carregada, a varredura das 232 falas e o rosto coberto são do navegador (tests/e2e/provocacao*.spec.ts).
 */
const TODAS: VarianteDoBalao[] = ['abertura', 'revanche', 'decisivo', 'vitoria', 'vitoriaPerfeita', 'guardiao', 'zenon'];

describe('ênfase: o nome do rival e a última palavra da fala (§5)', () => {
  const nomes = (fala: string): string[] => {
    const p = fala.split(/\s+/).filter(Boolean);
    return [...palavrasDeEnfase(fala)].sort((a, b) => a - b).map((i) => p[i]!);
  };
  it('palavra toda em maiúsculas com 2+ letras (o {rival} já trocado) + a última palavra', () => {
    expect(nomes('Você não aguenta nem um golpe, WEI LONG!')).toEqual(['WEI', 'LONG!']);
    expect(nomes('Acabou, CAIO. Chega de CORDA.')).toEqual(['CAIO.', 'CORDA.']);
  });
  it('a pontuação nas pontas não conta para achar a palavra; interjeição de 1 letra nunca é "o soco"', () => {
    expect(nomes('Prepare-se para o fim, ¡HAYATO!')).toEqual(['¡HAYATO!']);
    expect(nomes('Eu venho de longe, ó')).toEqual(['longe,']);
    expect(nomes('Só isso?')).toEqual(['isso?']);
  });
  it('a ênfase muda só a COR: a medida (largura e quebra) é a de sempre', () => {
    const ctx = gravador().ctx;
    const a = medirBalao(ctx, 'Você não aguenta nem um golpe, WEI LONG!', 'HAYATO');
    expect(a.linhas.join(' ')).toBe('VOCÊ NÃO AGUENTA NEM UM GOLPE, WEI LONG!');
    expect(a.enfase.size).toBe(2);
  });
});

describe('caixa alta (Bangers)', () => {
  it('maiúsculas em pt-BR, sem trocar o número de letras (o `letrasPorTick` continua certo)', () => {
    expect(emCaixaAlta('ação: não vá, ¡Órale!')).toBe('AÇÃO: NÃO VÁ, ¡ÓRALE!');
    for (const t of ['ação ç ã õ é ú', 'Calma, CAIO.', 'Ñ ¿qué?']) expect(emCaixaAlta(t).length).toBe(t.length);
  });
});

describe('a tabela de variantes (§3.1)', () => {
  it('as 7 existem, com as tintas e as ênfases literais da direção de arte', () => {
    expect(Object.keys(ESTILOS).sort()).toEqual([...TODAS].sort());
    expect(ESTILOS.abertura.tinta).toEqual(['#261a4a', '#160e2e', '#0b0718']);
    expect(ESTILOS.revanche.tinta).toEqual(['#33101e', '#1c0814', '#0e050b']);
    expect(ESTILOS.decisivo.tinta).toEqual(['#3d1024', '#1f0815', '#0f040b']);
    expect(ESTILOS.vitoriaPerfeita.tinta).toEqual(['#1d1d4e', '#121233', '#090a1c']);
    expect(ESTILOS.guardiao.tinta).toEqual(['#2a1d2e', '#18101c', '#0c070f']);
    expect(ESTILOS.zenon.tinta).toEqual(['#1a1420', '#0c0a10', '#050407']);
    expect(ESTILOS.abertura.enfase).toEqual(['#ffe48f', '#ffbb45']);
    expect(ESTILOS.zenon.enfase).toEqual(['#f8e2a4', '#d9a94a']);
    expect(ESTILOS.revanche.aro).toBe('brasa');
    expect(ESTILOS.decisivo.aro).toBe('ouro');
    expect(ESTILOS.vitoriaPerfeita.aro).toBe('prisma');
    expect(ESTILOS.guardiao.aro).toBe('bronze');
    expect(ESTILOS.zenon.aro).toBe('#e9c46a');
  });
  it('detalhes por variante: brilhos só na vitória (2 e 3), pulso só no decisivo, selo só no guardião, ônix, sem rajada e sem tremor só no ZENON', () => {
    expect(TODAS.map((v) => ESTILOS[v].brilhos)).toEqual([0, 0, 0, 2, 3, 0, 0]);
    expect(TODAS.filter((v) => ESTILOS[v].pulso)).toEqual(['decisivo']);
    expect(TODAS.filter((v) => ESTILOS[v].selo)).toEqual(['guardiao']);
    expect(TODAS.filter((v) => ESTILOS[v].onix)).toEqual(['zenon']);
    expect(ESTILOS.zenon.rajada).toBeNull();
    expect(ESTILOS.zenon.tremor).toBe(0);
    expect(TODAS.filter((v) => v !== 'zenon').every((v) => ESTILOS[v].rajada !== null)).toBe(true);
    expect([ESTILOS.abertura.tremor, ESTILOS.revanche.tremor, ESTILOS.decisivo.tremor, ESTILOS.vitoria.tremor]).toEqual([2, 3, 3, 2]);
  });
});

describe('qual variante cada fala leva (§3.1, §7 passo 7)', () => {
  const dados = { ids: ['hayato', 'caio'] as const, nomes: ['HAYATO', 'CAIO'] as const };
  it('as falas saem com a variante da situação: abertura, revanche, decisivo, vitória, vitória perfeita', () => {
    expect(falasDaAbertura(dados, {}).map((f) => f.variante)).toEqual(['abertura', 'abertura']);
    expect(falaDaRodada(dados, { round: 2, vencedorAnterior: 1, vitorias: [0, 1], vitoriasParaVencer: 2 }, {})[0]?.variante).toBe('revanche');
    expect(falaDaRodada(dados, { round: 3, vencedorAnterior: 1, vitorias: [1, 1], vitoriasParaVencer: 2 }, {})[0]?.variante).toBe('decisivo');
    expect(falaDaVitoria(dados, 0, {}, {})[0]?.variante).toBe('vitoria');
    expect(falaDaVitoria(dados, 0, { porTempo: true }, {})[0]?.variante).toBe('vitoria');
    expect(falaDaVitoria(dados, 0, { perfeita: true }, {})[0]?.variante).toBe('vitoriaPerfeita');
  });
  it('precedência: ZENON > guardião > as da situação (quem fala com id zenon vira ZENON em qualquer momento, o chefe da luta vira guardião)', () => {
    for (const base of ['abertura', 'revanche', 'decisivo', 'vitoria', 'vitoriaPerfeita'] as const) {
      expect(varianteDaFala(base, 'zenon', false), base).toBe('zenon');
      expect(varianteDaFala(base, 'zenon', true), base).toBe('zenon');
      expect(varianteDaFala(base, 'nila', true), base).toBe('guardiao');
      expect(varianteDaFala(base, 'nila', false), base).toBe(base);
    }
    expect(varianteDaFala(undefined, 'hayato', false)).toBe('abertura');
  });
  it('a variante da fala vai até o balão do quadro (a linha do tempo a repassa ao desenho)', () => {
    const f: FalaDoRoteiro = { falante: 0, texto: 'x'.repeat(40), n: 40, variante: 'decisivo' };
    const r = montarRoteiro('rodada', 'completa', false, [f]);
    expect(linhaDaProvocacao(r, 20).baloes[0]?.variante).toBe('decisivo');
    expect(linhaDaProvocacao(montarRoteiro('rodada', 'completa', false, [{ falante: 0, texto: 'x', n: 1 }]), 20).baloes[0]?.variante).toBe('abertura');
  });
});

describe('animação (§6)', () => {
  const r = (v: VarianteDoBalao, reduz = false) => montarRoteiro('rodada', reduz ? 'curta' : 'completa', reduz, [{ falante: 0, texto: 'x'.repeat(40), n: 40, variante: v }]);
  it('ZENON: pop de 12 ticks sem overshoot (0,94 -> 1) e alfa em 8', () => {
    const b = (t: number) => linhaDaProvocacao(r('zenon'), t).baloes[0];
    expect(b(0)?.escala).toBeCloseTo(0.94, 6);
    expect(Math.max(...Array.from({ length: 14 }, (_, t) => b(t)?.escala ?? 0))).toBe(1);
    expect(b(12)?.escala).toBe(1);
    expect(b(4)?.alfa).toBeCloseTo(0.5, 6);
    expect(b(8)?.alfa).toBe(1);
    expect(escalaDoPopDoZenon(0)).toBeCloseTo(0.94, 9);
  });
  it('fora do ZENON: alfa 0 -> 1 em 4 ticks; movimento reduzido (CURTA): sem escala, fade de 6 (reduz) ou 8 (CURTA), balão marcado `reduz`', () => {
    const b = (t: number) => linhaDaProvocacao(r('abertura'), t).baloes[0];
    expect(b(2)?.alfa).toBeCloseTo(0.5, 6);
    expect(b(4)?.alfa).toBe(1);
    const rr = montarRoteiro('rodada', 'completa', true, [{ falante: 0, texto: 'x'.repeat(40), n: 40 }]);
    const q = linhaDaProvocacao(rr, 3).baloes[0];
    expect(q?.escala).toBe(1);
    expect(q?.reduz).toBe(true);
    expect(q?.alfa).toBeCloseTo(0.5, 6);
    expect(linhaDaProvocacao(r('abertura', true), 3).baloes[0]?.alfa).toBeCloseTo(0.5, 6);
  });
  it('tremor de impacto: A·sin((t−5)·2,6)·(1 − (t−5)/8) nos ticks 5..12; zero antes, depois, no movimento reduzido e sem amplitude (ZENON)', () => {
    expect(tremorDeImpacto(2, 4, false)).toBe(0);
    expect(tremorDeImpacto(2, 5, false)).toBeCloseTo(0, 9);
    expect(tremorDeImpacto(2, 6, false)).toBeCloseTo(2 * Math.sin(2.6) * (1 - 1 / 8), 9);
    expect(tremorDeImpacto(3, 7, false)).toBeCloseTo(3 * Math.sin(5.2) * (1 - 2 / 8), 9);
    expect(tremorDeImpacto(2, 13, false)).toBe(0);
    expect(tremorDeImpacto(2, 8, true)).toBe(0);
    expect(tremorDeImpacto(0, 8, false)).toBe(0);
    expect(escalaDoPop(0.6) > 1 && escalaDoPop(0.6) < 1.08).toBe(true);
  });
});

describe('geometria do painel: cantos cortados, rabicho no mesmo traço, base presa longe dos chanfros (§2.2)', () => {
  const caixa = { w: 300, h: 90 };
  const f = { x: 270, topo: 215, meiaLargura: 43, altura: 92 };
  const colocar = (lado: 'cima' | 'direita' | 'esquerda', topo = 215) => colocarBalao(caixa, { lado, nivel: lado === 'cima' ? 'topo' : 'cabeca' }, { ...f, topo }, [], [], LIMITES_COM_HUD);

  it('a plaquinha fica do lado do rabicho (P1 ou P2: o lado de quem fala)', () => {
    expect(ladoDaPlaca(colocar('direita'))).toBe('esq');
    expect(ladoDaPlaca(colocar('esquerda'))).toBe('dir');
    expect(ladoDaPlaca(colocarBalao(caixa, { lado: 'cima', nivel: 'topo' }, { ...f, x: 100 }, [], [], LIMITES_COM_HUD))).toBe('esq');
    expect(ladoDaPlaca(colocarBalao(caixa, { lado: 'cima', nivel: 'topo' }, { ...f, x: 800 }, [], [], LIMITES_COM_HUD))).toBe('dir');
  });

  it('plaquinha à esquerda: cantos cortados em cima-direita e baixo-esquerda (10 px a 45°); à direita, o espelho', () => {
    const c = colocar('cima');
    const esq = contornoDoPainel(c, 'esq', 0, true);
    const x0 = c.x;
    const x1 = c.x + c.w;
    const y0 = c.y + 11;
    const y1 = c.y + c.h - 3;
    expect(esq).toEqual([[x0, y0], [x1 - 10, y0], [x1, y0 + 10], [x1, y1], [x0 + 10, y1], [x0, y1 - 10]]);
    const dir = contornoDoPainel(c, 'dir', 0, true);
    expect(dir).toEqual([[x0, y0 + 10], [x0 + 10, y0], [x1, y0], [x1, y1 - 10], [x1 - 10, y1], [x0, y1]]);
  });

  it('a sombra dura MORA dentro da caixa: o painel termina 3 px antes de y + h e começa 11 px abaixo do topo (a plaquinha sobe nesse vão)', () => {
    const c = colocar('direita');
    const pts = contornoDoPainel(c, 'esq', 0, true);
    expect(Math.max(...pts.map((p) => p[1]))).toBe(c.y + c.h - BALAO.sombra);
    expect(Math.min(...pts.map((p) => p[1]))).toBe(c.y + BALAO.placaSobra);
  });

  it('rabicho no MESMO contorno: balão em cima = cunha assimétrica (12 + 5) na borda de baixo, com a ponta recuada 3 px; laterais: 3 pontos na borda do lado da cabeça', () => {
    const c = colocar('cima');
    const com = contornoDoPainel(c, 'esq', 0);
    const sem = contornoDoPainel(c, 'esq', 0, true);
    expect(com.length).toBe(sem.length + 3);
    const bx = Math.max(c.x + 10 + 14, Math.min(c.x + c.w - 10 - 14, c.base.x));
    const y1 = c.y + c.h - 3;
    const i = com.findIndex((p) => p[0] === bx + 12 && p[1] === y1);
    expect(i).toBeGreaterThan(-1);
    expect(com[i + 2]).toEqual([bx - 5, y1]);
    const [px, py] = com[i + 1]!;
    expect(Math.hypot(px - c.ponta.x, py - c.ponta.y)).toBeCloseTo(3, 6); // 3 px para dentro da ponta calculada
    expect(contornoDoPainel(colocar('direita'), 'esq', 0).length).toBe(sem.length + 3);
    expect(contornoDoPainel(colocar('esquerda'), 'dir', 0).length).toBe(sem.length + 3);
    // o contorno interno do duplo não tem rabicho
    expect(contornoDoPainel(c, 'esq', 4).length).toBe(sem.length);
  });

  it('rabicho lateral: a base fica em [topo do painel + chanfro + 8, base do painel − chanfro − 12], mesmo com a cabeça muito alta ou muito baixa', () => {
    for (const topo of [-100, 0, 90, 215, 300, 600]) {
      for (const lado of ['direita', 'esquerda'] as const) {
        const c = colocar(lado, topo);
        expect(c.base.y, `${lado} topo ${topo}`).toBeGreaterThanOrEqual(c.y + BALAO.placaSobra + BALAO.chanfro + 8);
        expect(c.base.y, `${lado} topo ${topo}`).toBeLessThanOrEqual(c.y + c.h - BALAO.sombra - BALAO.chanfro - 12);
      }
    }
  });

  it('rabicho em cima: a base não cai no canto cortado (>= chanfro + 14 das bordas) e a ponta recua para dentro da cabeça só até 3 px antes do topo', () => {
    for (const x of [-100, 20, 270, 480, 940, 1100]) {
      const c = colocarBalao(caixa, { lado: 'cima', nivel: 'topo' }, { ...f, x }, [], [], LIMITES_COM_HUD);
      expect(c.base.x).toBeGreaterThanOrEqual(c.x + 10 + 14);
      expect(c.base.x).toBeLessThanOrEqual(c.x + c.w - 10 - 14);
      expect(c.ponta.y).toBeLessThanOrEqual(215 - 3 + 0.0001);
    }
  });
});

describe('a cor do lutador na plaquinha (§3.2)', () => {
  it('as 10 cores atuais usam o nome em tinta escura (#120a22), sem contorno: contraste > 4,5:1 no pior ponto do gradiente', () => {
    for (const [id, l] of Object.entries(LUTADORES)) {
      const cor = (l as { fire?: readonly string[] }).fire?.[0];
      if (!cor || id === 'zenon') continue; // o ZENON usa a plaquinha ônix (ouro), não a cor da ficha
      expect(corDoNomeNaPlaca(cor), id).toEqual({ cor: '#120a22', contorno: false });
    }
  });
  it('uma ficha muito escura cai no nome BRANCO com contorno de 3 px', () => {
    expect(corDoNomeNaPlaca('#1a1030')).toEqual({ cor: '#ffffff', contorno: true });
  });
  it('cores fora do formato #rrggbb não quebram o desenho: 3 dígitos expandem, o resto vira creme', () => {
    expect(normalizarCor('#abc')).toBe('#aabbcc');
    expect(normalizarCor('#6FE0FF')).toBe('#6fe0ff');
    expect(normalizarCor('rgb(1,2,3)')).toBe('#ffd9a6');
    expect(normalizarCor('')).toBe('#ffd9a6');
  });
});

describe('desenho das 7 variantes (contexto falso)', () => {
  const ctx0 = gravador().ctx;
  const caixa = medirBalao(ctx0, 'Ninguém segura o meu golpe, CAIO!\nNem você, ninguém.', 'ZENON', 372, 14);
  const col = colocarBalao(caixa, { lado: 'direita', nivel: 'cabeca' }, { x: 270, topo: 215, meiaLargura: 43, altura: 92 }, [], [], LIMITES_COM_HUD);
  const q = { letras: Infinity, escala: 1, alfa: 1, seta: true, tick: 30, corDoNome: '#6fe0ff', desde: 20 };

  it('cada variante desenha sem lançar, com o aro (2 traços: contorno escuro de 5 px e aro de 2,25), a plaquinha e o texto todo', () => {
    for (const v of TODAS) {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, variante: v });
      expect(g.chamadas.filter(([n]) => n === 'stroke').length, v).toBeGreaterThanOrEqual(2);
      expect(g.textos().filter((t) => t === 'ZENON').length, `${v}: a plaquinha`).toBe(1);
      expect(g.textos().filter((t) => t === 'CAIO!').length, `${v}: o nome do rival na fala (sombra + letra)`).toBe(2);
    }
  });

  it('brilhos: 2 estrelas na vitória, 3 na perfeita, nenhuma nas outras (cada estrela é um fill com halo)', () => {
    const estrelas = (v: VarianteDoBalao): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, variante: v });
      return g.chamadas.filter(([n]) => n === 'rotate').length;
    };
    expect(TODAS.map(estrelas)).toEqual([0, 0, 0, 2, 3, 0, 0]);
  });

  it('o selo do guardião (anel + entalhe) só existe nele; o losango de ouro só no ZENON', () => {
    const arcos = (v: VarianteDoBalao): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, seta: false, variante: v });
      return g.chamadas.filter(([n]) => n === 'arc').length;
    };
    expect(arcos('guardiao') - arcos('abertura')).toBe(3);
  });

  it('movimento reduzido: sem tremor (nenhum translate horizontal), sem achatar na saída e sem pop de palavra', () => {
    const horizontais = (reduz: boolean): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, variante: 'abertura', desde: 6, reduz });
      return g.chamadas.filter(([n, x, y]) => n === 'translate' && typeof x === 'number' && x !== 0 && y === 0).length;
    };
    expect(horizontais(false)).toBe(1);
    expect(horizontais(true)).toBe(0);
    const achata = (reduz: boolean): boolean => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, variante: 'abertura', fechando: 1, reduz });
      return g.chamadas.some(([n, x, y]) => n === 'scale' && typeof x === 'number' && typeof y === 'number' && Math.abs((y as number) - 0.2) < 1e-9);
    };
    expect(achata(false)).toBe(true);
    expect(achata(true)).toBe(false);
  });

  it('a fala é escrita com tracking de 1 px (quando o contexto tem letterSpacing) e o tracking é desfeito depois (o resto do jogo não herda)', () => {
    const vistos: string[] = [];
    const g = gravador();
    const alvo = { letterSpacing: '0px' } as Record<string, unknown>;
    const ctx = new Proxy(alvo, {
      get: (t, n: string) => (n in t ? t[n] : (g.ctx as unknown as Record<string, unknown>)[n]),
      has: (t, n: string) => n in t,
      set: (t, n: string, v) => {
        if (n === 'letterSpacing') vistos.push(String(v));
        t[n] = v;
        return true;
      },
    }) as unknown as typeof g.ctx;
    desenharBalao(ctx, caixa, col, { ...q, variante: 'abertura' });
    expect(vistos).toEqual(['1px', '0px']);
    expect(alvo['letterSpacing']).toBe('0px');
  });
});

describe('camadas em cache (fora da tela): o painel é pintado UMA vez e o quadro vira 1 drawImage + texto (2 no decisivo, que tem o brilho vivo no meio)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    esquecerCamadas();
  });
  function falsoDocumento() {
    const criados: Array<{ w: number; h: number; chamadas: string[] }> = [];
    vi.stubGlobal('document', {
      createElement: () => {
        const reg = { w: 0, h: 0, chamadas: [] as string[] };
        criados.push(reg);
        const g = new Proxy({}, { get: (_, n: string) => (n === 'createLinearGradient' ? () => ({ addColorStop: () => undefined }) : () => void reg.chamadas.push(n)), set: () => true });
        return {
          set width(v: number) { reg.w = v; },
          get width() { return reg.w; },
          set height(v: number) { reg.h = v; },
          get height() { return reg.h; },
          getContext: () => g,
        };
      },
    });
    return criados;
  }
  const ctx0 = gravador().ctx;
  const caixa = medirBalao(ctx0, 'Uma fala curta, CAIO!', 'HAYATO');
  const cab = { x: 270, topo: 215, meiaLargura: 43, altura: 92 };
  const col = colocarBalao(caixa, { lado: 'cima', nivel: 'topo' }, cab, [], [], LIMITES_COM_HUD);
  const q = { letras: Infinity, escala: 1, alfa: 1, seta: false, tick: 0, corDoNome: '#6fe0ff', variante: 'abertura' as const, desde: 99 };
  const imagens = (g: ReturnType<typeof gravador>): number => g.chamadas.filter(([n]) => n === 'drawImage').length;

  it('pinta a camada UMA vez (em RS = 2: retícula, aro e plaquinha juntos) e todo quadro seguinte só faz 1 drawImage, sem nenhum ponto/aro no contexto do jogo', () => {
    const criados = falsoDocumento();
    const g1 = gravador();
    desenharBalao(g1.ctx, caixa, col, q);
    expect(criados).toHaveLength(1);
    expect(criados[0]!.w % 2).toBe(0); // inteiros em RS = 2
    expect(criados[0]!.chamadas.filter((n) => n === 'arc').length, 'retícula').toBeGreaterThan(20);
    expect(criados[0]!.chamadas.filter((n) => n === 'stroke').length, 'aro e plaquinha').toBeGreaterThanOrEqual(3);
    expect(imagens(g1)).toBe(1);
    expect(g1.chamadas.filter(([n]) => n === 'arc' || n === 'stroke')).toHaveLength(0);
    for (let i = 0; i < 20; i++) {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, tick: i });
      expect(imagens(g)).toBe(1);
    }
    expect(criados).toHaveLength(1);
    expect(camadasGuardadas()).toBe(1);
  });

  it('as camadas cobrem o rabicho e o aro (com 7 px de respiro para o contorno) e o desenho as põe no canto certo: o canto do balão + a origem relativa', () => {
    const criados = falsoDocumento();
    const lado = colocarBalao(caixa, { lado: 'direita', nivel: 'cabeca' }, cab, [], [], LIMITES_COM_HUD);
    const g = gravador();
    desenharBalao(g.ctx, caixa, lado, q);
    const [base] = g.chamadas.filter(([n]) => n === 'drawImage') as Array<[string, unknown, number, number, number, number]>;
    // x, y, largura, altura em px lógicos: começa antes da caixa (rabicho à esquerda + 8 de respiro) e cobre a caixa inteira
    expect(base![2]).toBeLessThanOrEqual(lado.x - 7);
    expect(base![3]).toBeLessThanOrEqual(lado.y - 7);
    expect(base![2] + base![4]).toBeGreaterThanOrEqual(lado.x + lado.w + 7);
    expect(base![3] + base![5]).toBeGreaterThanOrEqual(lado.y + lado.h + 7);
    expect(criados[0]!.w).toBe(base![4] * 2);
    expect(criados[0]!.h).toBe(base![5] * 2);
  });

  it('outra cor, outro lado da plaquinha, outra variante ou outro tamanho = outras camadas; a posição absoluta NÃO entra na chave (o balão pode andar sem repintar)', () => {
    const criados = falsoDocumento();
    desenharBalao(gravador().ctx, caixa, col, q);
    expect(criados).toHaveLength(1);
    desenharBalao(gravador().ctx, caixa, { ...col, x: col.x + 50, y: col.y + 20, base: { x: col.base.x + 50, y: col.base.y + 20 }, ponta: { x: col.ponta.x + 50, y: col.ponta.y + 20 } }, q);
    expect(criados).toHaveLength(1);
    desenharBalao(gravador().ctx, caixa, col, { ...q, corDoNome: '#ff6a1f' });
    expect(criados).toHaveLength(2);
    desenharBalao(gravador().ctx, caixa, colocarBalao(caixa, { lado: 'esquerda', nivel: 'cabeca' }, cab, [], [], LIMITES_COM_HUD), q);
    expect(criados).toHaveLength(3);
    desenharBalao(gravador().ctx, caixa, col, { ...q, variante: 'decisivo' });
    expect(criados).toHaveLength(5); // base + detalhe
    desenharBalao(gravador().ctx, caixa, col, { ...q, variante: 'zenon' });
    expect(criados).toHaveLength(6);
    expect(criados[5]!.chamadas.includes('arc')).toBe(false); // os veios de ônix, sem retícula de pontos
    expect(criados[5]!.chamadas.includes('bezierCurveTo')).toBe(true);
  });

  it('a ponta do rabicho andando (o push-in da vitória): meio pixel não repinta, 1 px ou mais repinta', () => {
    const criados = falsoDocumento();
    // geometria alinhada ao pixel, para o arredondamento ser previsível
    const alinhada = { ...col, x: 100, y: 60, base: { x: 150, y: 60 + col.h }, ponta: { x: 150, y: 60 + col.h + 8 } };
    desenharBalao(gravador().ctx, caixa, alinhada, q);
    expect(criados).toHaveLength(1);
    desenharBalao(gravador().ctx, caixa, { ...alinhada, ponta: { x: 150.4, y: alinhada.ponta.y } }, q);
    expect(criados).toHaveLength(1);
    desenharBalao(gravador().ctx, caixa, { ...alinhada, ponta: { x: 153, y: alinhada.ponta.y } }, q);
    expect(criados).toHaveLength(2);
  });

  it('as linhas de velocidade crescem nos primeiros 8 ticks (desenhadas ao vivo por cima) e depois entram na camada (uma 2ª camada, "cheia")', () => {
    const criados = falsoDocumento();
    const riscos = (desde: number): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, desde });
      return g.chamadas.filter(([n]) => n === 'stroke').length;
    };
    expect(riscos(4)).toBe(6); // 3 linhas x 2 passadas (contorno e cor), ao vivo
    expect(criados).toHaveLength(1);
    expect(riscos(99)).toBe(0); // cheia: tudo na camada
    expect(criados).toHaveLength(2);
    expect(riscos(100)).toBe(0);
    expect(criados).toHaveLength(2);
    // no movimento reduzido já nascem cheias
    const g = gravador();
    desenharBalao(g.ctx, caixa, col, { ...q, desde: 1, reduz: true });
    expect(g.chamadas.filter(([n]) => n === 'stroke')).toHaveLength(0);
  });

  it('o brilho do DECISIVO pulsa ao vivo (clip + traço por dentro do aro), sem repintar camadas; as estrelas da vitória também são vivas', () => {
    const criados = falsoDocumento();
    const pulso = (tick: number): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, variante: 'decisivo', tick });
      return g.chamadas.filter(([n]) => n === 'stroke').length;
    };
    expect(pulso(0)).toBe(1);
    expect(pulso(25)).toBe(1);
    expect(criados).toHaveLength(2); // base + detalhe, com o brilho vivo entre as duas
    const estrelas = (tick: number): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...q, variante: 'vitoria', tick });
      return g.chamadas.filter(([n]) => n === 'rotate').length;
    };
    expect(estrelas(3)).toBe(2);
    expect(criados).toHaveLength(3);
  });

  it('o teto: a memória das camadas não cresce sem fim', () => {
    falsoDocumento();
    for (let i = 0; i < 80; i++) desenharBalao(gravador().ctx, caixa, col, { ...q, corDoNome: `#${(0x100000 + i * 1234).toString(16)}` });
    expect(camadasGuardadas()).toBeLessThanOrEqual(24);
  });

  it('sem document (testes em Node) ou sem contexto 2D: desenha direto no contexto do jogo, com o mesmo resultado visual (o aro e a retícula vão no próprio contexto)', () => {
    const g = gravador();
    desenharBalao(g.ctx, caixa, col, q);
    expect(imagens(g)).toBe(0);
    expect(g.chamadas.filter(([n]) => n === 'arc').length).toBeGreaterThan(20);
    expect(g.chamadas.filter(([n]) => n === 'stroke').length).toBeGreaterThanOrEqual(3);
    expect(camadasGuardadas()).toBe(0);
  });
});
