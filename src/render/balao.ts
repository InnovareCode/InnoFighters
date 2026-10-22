import { criarCanvasPadrao } from '../assets/canvas';
import { easeOut } from '../core/math';
import { FH, FONTE_DA_FALA } from './texto';
import { RS, type Ctx } from './tela';

/*
 * BALÃO DE FALA das provocações: a "TARJA DE IMPACTO" (docs/direcao-arte-baloes.md; porte do protótipo do Apolo, arte-fonte/baloes/prototipo/premium-nucleo.js). Uma tarja de
 * tinta opaca com dois cantos cortados a 45°, aro claro sobre contorno escuro, a plaquinha do nome (na cor do lutador) saindo da quina e o rabicho em cunha no MESMO traço; a
 * fala em Bangers, caixa alta, com o nome do rival e a última palavra em ouro. 7 variantes por situação (abertura, revanche, decisivo, vitória, vitória perfeita, guardião, ZENON).
 *
 * Tudo aqui é APRESENTAÇÃO: a quebra é calculada UMA vez por fala (`medirBalao`), o lugar é uma função pura (`colocarBalao`, testável sem canvas) e o desenho só lê os dois.
 * Nada toca o motor, o RNG da luta ou o lock-step. O que não se mexe (sombra, tinta, retícula, vidro, aro, plaquinha) é pintado UMA vez em camadas fora da tela e reaproveitado a cada quadro.
 */

/** Altura da faixa embaixo do texto que o balão de VITÓRIA reserva para o ▶ (o triângulo tem 12 px). */
export const RESERVA_DA_SETA = 14;

/** Medidas do balão, em px lógicos (tela 960x540). 1 linha = 62 px de altura e 2 linhas = 90 (plaquinha + texto + margens); +14 na vitória (a faixa do ▶). */
export const BALAO = {
  /** Largura máxima de UMA linha de texto (o balão tem até 400 com as margens). */
  linhaMax: 372,
  /** Bangers 24 px, passo de linha 28: o acento das maiúsculas (1,15 em) não encosta na linha de cima nem na plaquinha. */
  corpo: 24,
  linha: 28,
  acento: 1.15,
  /** Altura da caixa alta da Bangers / tamanho (medida uma vez com o actualBoundingBoxAscent do "H"). */
  capa: 0.727,
  /** Fonte do nome na plaquinha: FH, a mesma do HUD. */
  nome: 19,
  placaAltura: 23,
  /** Quanto a plaquinha sobe acima do painel (o painel começa em y + 11). */
  placaSobra: 11,
  /** Da quina do painel até a plaquinha, a inclinação do paralelogramo e o respiro do nome. */
  placaRecuo: 12,
  placaInclina: 6,
  placaPadX: 9,
  margemX: 16,
  /** Da última linha de base até a borda de baixo (o Ç e a vírgula descem ~5 px). */
  margemBase: 7,
  /** A sombra dura MORA DENTRO da caixa: o painel termina 3 px antes de `y + h`, então nada além do rabicho sai do retângulo medido. */
  sombra: 3,
  /** Os "cantos de impacto" cortados a 45°. */
  chanfro: 10,
  /** Tracking (ctx.letterSpacing): a Bangers é apertada de fábrica. Sem suporte no navegador = ignorado (a medida e o desenho usam o mesmo contexto). */
  espaco: '1px',
  /** Comprimento do rabicho e meia-largura da base dele. */
  rabicho: 12,
  rabichoMeio: 9,
  /** Folga mínima das bordas da tela. */
  folga: 12,
} as const;

/** Letras reveladas por tick (COMPLETA): o pop das palavras de ênfase conta a partir daqui. */
export const LETRAS_POR_TICK = 1.5;

export type VarianteDoBalao = 'abertura' | 'revanche' | 'decisivo' | 'vitoria' | 'vitoriaPerfeita' | 'guardiao' | 'zenon';

interface EstiloDoBalao {
  /** Tinta do painel (opaca): topo, meio, base. */
  readonly tinta: readonly [string, string, string];
  /** Aro: nome de um padrão ('creme', 'ouro', 'brasa', 'bronze', 'prisma') ou uma cor. */
  readonly aro: string;
  /** Fio interno (cor) ou nenhum. */
  readonly duplo: string | null;
  /** Gradiente da palavra de ênfase (topo, base). */
  readonly enfase: readonly [string, string];
  /** Linhas de velocidade: 'cor' = a do lutador, uma cor, ou nenhuma. */
  readonly rajada: string | null;
  /** Faixa de baixo: 'cor', 'prisma', uma cor ou nenhuma. */
  readonly faixa: string | null;
  readonly brilhos: number;
  /** Amplitude (px) do tremor de impacto no assentamento do pop. */
  readonly tremor: number;
  readonly pulso?: boolean;
  readonly selo?: boolean;
  readonly onix?: boolean;
}

/**
 * A tabela de variantes (§3.1 da direção de arte). Precedência de quem calcula a variante da fala (`varianteDaFala`, em provocacao.ts): ZENON > guardião > decisivo >
 * revanche > vitória perfeita > vitória > abertura.
 */
export const ESTILOS: Readonly<Record<VarianteDoBalao, EstiloDoBalao>> = {
  abertura: { tinta: ['#261a4a', '#160e2e', '#0b0718'], aro: 'creme', duplo: null, enfase: ['#ffe48f', '#ffbb45'], rajada: 'cor', faixa: 'cor', brilhos: 0, tremor: 2 },
  revanche: { tinta: ['#33101e', '#1c0814', '#0e050b'], aro: 'brasa', duplo: null, enfase: ['#ffd8b0', '#ffa070'], rajada: '#ff6a3d', faixa: '#ff5a36', brilhos: 0, tremor: 3 },
  decisivo: { tinta: ['#3d1024', '#1f0815', '#0f040b'], aro: 'ouro', duplo: '#ffd36b', enfase: ['#fff2b8', '#ffc53d'], rajada: '#ffd36b', faixa: '#ffd36b', brilhos: 0, tremor: 3, pulso: true },
  vitoria: { tinta: ['#261a4a', '#160e2e', '#0b0718'], aro: 'ouro', duplo: null, enfase: ['#ffe48f', '#ffbb45'], rajada: 'cor', faixa: 'cor', brilhos: 2, tremor: 2 },
  vitoriaPerfeita: { tinta: ['#1d1d4e', '#121233', '#090a1c'], aro: 'prisma', duplo: null, enfase: ['#ffffff', '#9ff3ff'], rajada: 'cor', faixa: 'prisma', brilhos: 3, tremor: 2 },
  guardiao: { tinta: ['#2a1d2e', '#18101c', '#0c070f'], aro: 'bronze', duplo: '#e0a467', enfase: ['#ffe6c0', '#f5b46e'], rajada: '#e0a467', faixa: 'cor', brilhos: 0, tremor: 2, selo: true },
  zenon: { tinta: ['#1a1420', '#0c0a10', '#050407'], aro: '#e9c46a', duplo: '#e9c46a', enfase: ['#f8e2a4', '#d9a94a'], rajada: null, faixa: null, brilhos: 0, tremor: 0, onix: true },
};

/** O balão já medido: as linhas quebradas (em CAIXA ALTA) e a caixa. Calculado uma vez por fala. */
export interface CaixaDoBalao {
  readonly nome: string;
  readonly linhas: readonly string[];
  readonly w: number;
  readonly h: number;
  /** Letras de todas as linhas somadas (o que o letreiro revela). */
  readonly letras: number;
  /** Faixa livre embaixo do texto (px) onde mora o ▶ da vitória: o indicador nunca cai sobre as letras. 0 nos demais balões. */
  readonly reserva: number;
  /** Largura da plaquinha do nome (px). */
  readonly larguraPlaca: number;
  /** Índices das palavras de ênfase (nome do rival e a última palavra), contados sobre as palavras do texto, na ordem. */
  readonly enfase: ReadonlySet<number>;
}

/**
 * Quebra por MEDIDA (a regra do `textoQuebrado`, mas só calcula): palavras guloso até `max` px; "\n" força a quebra. Uma palavra maior que `max` fica sozinha
 * numa linha (o autor das falas é avisado pelo teste de limites). `medir` mede uma linha na fonte do corpo.
 */
export function quebrarPorMedida(fala: string, max: number, medir: (s: string) => number): string[] {
  const linhas: string[] = [];
  for (const segmento of fala.split('\n')) {
    let linha = '';
    for (const palavra of segmento.split(' ')) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (linha && medir(tentativa) > max) {
        linhas.push(linha);
        linha = palavra;
      } else linha = tentativa;
    }
    linhas.push(linha);
  }
  return linhas;
}

/** Bangers só tem caixa alta: a fala é medida e desenhada em maiúsculas (pt-BR). O número de letras não muda. */
export const emCaixaAlta = (s: string): string => s.toLocaleUpperCase('pt-BR');

/**
 * Palavras de ênfase (regra determinística, sem marcação nos dados): o NOME DO RIVAL (palavra toda em maiúsculas com 2+ letras no texto original: é o `{rival}` já trocado) e a
 * ÚLTIMA palavra com 2+ letras (o "soco" da frase). Pontuação nas pontas não conta para identificar a palavra, mas é desenhada com ela. Muda só a COR: a largura é a mesma.
 */
export function palavrasDeEnfase(fala: string): Set<number> {
  const limpa = (p: string): string => p.replace(/^[¡¿"“(]+|[.,!?;:…"”)]+$/g, '');
  const palavras = fala.split(/\s+/).filter(Boolean);
  const alvo = new Set<number>();
  palavras.forEach((p, i) => {
    const l = limpa(p);
    if (l.length >= 2 && l === l.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]/.test(l)) alvo.add(i);
  });
  for (let i = palavras.length - 1; i >= 0; i--) {
    if (/[A-Za-zÀ-ÿ]{2,}/.test(limpa(palavras[i] ?? ''))) {
      alvo.add(i);
      break;
    }
  }
  return alvo;
}

/** `ctx.letterSpacing` onde o navegador tem (Chrome, Firefox, Safari recente); onde não tem, nada acontece. */
function espacoDasLetras(ctx: Ctx, valor: string): void {
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = valor;
}

/**
 * Mede o balão na fonte da fala (`FONTE_DA_FALA(24)` + tracking de 1 px, em CAIXA ALTA) e a plaquinha do nome em `FH(19)`, com linhas de até `linhaMax` px. Chamar com a fonte
 * JÁ carregada (ver `fontesProntas`). `h = ceil(placa + 1 + 1,15·corpo + 28·(linhas − 1) + reserva + margemBase + sombra)`: 1 linha = 62, 2 linhas = 90, mais a reserva.
 */
export function medirBalao(ctx: Ctx, fala: string, nome: string, linhaMax: number = BALAO.linhaMax, reserva = 0): CaixaDoBalao {
  ctx.save();
  ctx.font = FONTE_DA_FALA(BALAO.corpo);
  espacoDasLetras(ctx, BALAO.espaco);
  const linhas = quebrarPorMedida(emCaixaAlta(fala), linhaMax, (s) => ctx.measureText(s).width);
  const larguraTexto = Math.max(...linhas.map((l) => ctx.measureText(l).width));
  espacoDasLetras(ctx, '0px');
  ctx.font = FH(BALAO.nome);
  const larguraNome = ctx.measureText(nome).width;
  ctx.restore();
  const larguraPlaca = Math.ceil(larguraNome) + BALAO.placaPadX * 2 + BALAO.placaInclina;
  const w = Math.ceil(Math.max(larguraTexto + BALAO.margemX * 2, larguraPlaca + BALAO.placaRecuo * 2 + 8));
  const h = Math.ceil(BALAO.placaAltura + 1 + BALAO.acento * BALAO.corpo + BALAO.linha * (linhas.length - 1) + reserva + BALAO.margemBase + BALAO.sombra);
  return { nome, linhas, w, h, letras: linhas.reduce((n, l) => n + l.length, 0), reserva, larguraPlaca, enfase: palavrasDeEnfase(fala) };
}

/** As larguras de linha tentadas, da mais larga (a de sempre) à mais estreita (3 a 4 linhas): a estreita cabe no vão entre dois lutadores altos. */
export const LARGURAS_DA_LINHA: readonly number[] = [BALAO.linhaMax, 300, 240];

/** O mesmo balão em cada largura de linha, SEM repetir uma quebra que já saiu mais larga. A primeira é sempre a de 372 px. */
export function variantesDoBalao(ctx: Ctx, fala: string, nome: string, reserva = 0): CaixaDoBalao[] {
  const saida: CaixaDoBalao[] = [];
  for (const max of LARGURAS_DA_LINHA) {
    const c = medirBalao(ctx, fala, nome, max, reserva);
    if (!saida.some((v) => v.linhas.length === c.linhas.length && v.linhas.every((l, i) => l === c.linhas[i]))) saida.push(c);
  }
  return saida;
}

/** As fontes do canvas já chegaram? Sem elas a medida sai na fonte de reserva: a cena remede no quadro seguinte (risco R5 da spec). */
export function fontesProntas(): boolean {
  return typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded';
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Lugar do balão (funções puras)
// ---------------------------------------------------------------------------------------------------------------------------------

export interface Retangulo {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** A cabeça de quem fala (ou escuta) NA TELA: x do centro, y do topo e o tamanho da região da cabeça/rosto que o balão não deve cobrir. */
export interface CabecaNaTela {
  readonly x: number;
  readonly topo: number;
  readonly meiaLargura: number;
  readonly altura: number;
}

export const retanguloDaCabeca = (c: CabecaNaTela): Retangulo => ({ x0: c.x - c.meiaLargura, y0: c.topo, x1: c.x + c.meiaLargura, y1: c.topo + c.altura });

export function areaDeEncontro(a: Retangulo, b: Retangulo): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

export interface LimitesDoBalao {
  /** O balão nunca sobe acima disto: 86 com o HUD visível, 62 sob as faixas de cinema. */
  readonly topoMin: number;
  readonly esquerda: number;
  readonly direita: number;
  readonly base: number;
}

export const LIMITES_COM_HUD: LimitesDoBalao = { topoMin: 86, esquerda: BALAO.folga, direita: 960 - BALAO.folga, base: 540 - 70 };
export const LIMITES_COM_FAIXAS: LimitesDoBalao = { topoMin: 62, esquerda: BALAO.folga, direita: 960 - BALAO.folga, base: 540 - 62 };

export type LadoDoBalao = 'cima' | 'direita' | 'esquerda';
/** Altura do balão ao lado da cabeça: no topo permitido, na altura da cabeça, ou logo ABAIXO de outro balão (dois balões empilhados no vão entre os lutadores). */
export type NivelDoBalao = 'topo' | 'cabeca' | 'abaixo';

/** O que a cena escolhe UMA vez por balão (com a geometria FINAL) e mantém: nada pula de lugar enquanto o zoom ou a andada se movem. */
export interface PlanoDoBalao {
  /** Índice na lista de variantes (largura da linha). */
  readonly variante: number;
  readonly lado: LadoDoBalao;
  readonly nivel: NivelDoBalao;
}

export interface ColocacaoDoBalao {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly lado: LadoDoBalao;
  /** Onde o rabicho encosta na caixa e para onde aponta (a ponta fica a poucos px da cabeça). Sem rabicho (a caixa já encosta na cabeça): `ponta` = `base`. */
  readonly base: { readonly x: number; readonly y: number };
  readonly ponta: { readonly x: number; readonly y: number };
  /** Área (px²) em que a caixa cobre a cabeça de quem fala, a de quem escuta e outros balões (o que a escolha minimizou). */
  readonly cobreFalante: number;
  readonly cobreOutros: number;
  readonly cobreBaloes: number;
}

const prender = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const retanguloDaColocacao = (c: Pick<ColocacaoDoBalao, 'x' | 'y' | 'w' | 'h'>): Retangulo => ({ x0: c.x, y0: c.y, x1: c.x + c.w, y1: c.y + c.h });

/**
 * Onde fica `caixa` segundo o `plano` (função pura da geometria de AGORA). `falante` = a cabeça de quem fala; `outros` = as cabeças de quem escuta (só para contar o
 * quanto cobre); `ocupados` = os balões já postos neste quadro (o nível `abaixo` se apoia neles). Sempre dentro de `limites`.
 */
export function colocarBalao(
  caixa: Pick<CaixaDoBalao, 'w' | 'h'>,
  plano: Pick<PlanoDoBalao, 'lado' | 'nivel'>,
  falante: CabecaNaTela,
  outros: readonly Retangulo[],
  ocupados: readonly Retangulo[],
  limites: LimitesDoBalao,
): ColocacaoDoBalao {
  const { w, h } = caixa;
  const T = BALAO.rabicho;
  const cabeca = retanguloDaCabeca(falante);
  const lado = plano.lado;
  // ao lado, a ponta do rabicho para 4 px antes da cabeça (a cabeça é um modelo: a ponta não pode entrar no rosto)
  const x0 = lado === 'cima' ? falante.x - w / 2 : lado === 'direita' ? cabeca.x1 + T + 4 : cabeca.x0 - T - 4 - w;
  const x = prender(x0, limites.esquerda, limites.direita - w);
  let y0: number;
  if (lado === 'cima') y0 = falante.topo - T - h;
  else if (plano.nivel === 'topo') y0 = limites.topoMin;
  else if (plano.nivel === 'cabeca') y0 = falante.topo - 6;
  else {
    // logo abaixo do balão mais baixo que ocupa as mesmas colunas
    const baixo = ocupados.filter((o) => Math.min(o.x1, x + w) - Math.max(o.x0, x) > 0).reduce((m, o) => Math.max(m, o.y1), limites.topoMin - 8);
    y0 = baixo + 8;
  }
  const y = prender(y0, limites.topoMin, Math.max(limites.topoMin, limites.base - h));
  const rect: Retangulo = { x0: x, y0: y, x1: x + w, y1: y + h };
  let base: { x: number; y: number };
  let ponta: { x: number; y: number };
  if (lado === 'cima') {
    // a base do rabicho fica presa longe dos cantos cortados (o desenho a usa igual: `contornoDoPainel`)
    const bx = prender(falante.x, x + BALAO.chanfro + 14, x + w - BALAO.chanfro - 14);
    base = { x: bx, y: y + h };
    const py = Math.max(base.y, Math.min(falante.topo - 3, base.y + T));
    ponta = { x: prender(falante.x, bx - BALAO.rabichoMeio * 2, bx + BALAO.rabichoMeio * 2), y: py };
  } else {
    // nos rabichos laterais a base fica presa em [topo do painel + chanfro + 8, base do painel − chanfro − 12]: nunca cai no canto cortado
    const by = prender(falante.topo + falante.altura * 0.35, y + BALAO.placaSobra + BALAO.chanfro + 8, y + h - BALAO.sombra - BALAO.chanfro - 12);
    base = { x: lado === 'direita' ? x : x + w, y: by };
    ponta = { x: base.x + (lado === 'direita' ? -T : T), y: by };
  }
  return {
    x,
    y,
    w,
    h,
    lado,
    base,
    ponta,
    cobreFalante: areaDeEncontro(rect, cabeca),
    cobreOutros: outros.reduce((s, o) => s + areaDeEncontro(rect, o), 0),
    cobreBaloes: ocupados.reduce((s, o) => s + areaDeEncontro(rect, o), 0),
  };
}

/**
 * Escolhe o plano do balão (a variante de largura, o lado e o nível) que cobre MENOS o rosto de quem fala (peso 4), o de quem escuta (3) e outros balões (6), com a
 * geometria dada (a cena passa a FINAL). Prefere o de sempre: EM CIMA da cabeça, na linha mais larga; cada desvio custa um pouco, então só vale quando evita cobrir
 * alguma coisa. Lutador baixo: o balão cabe acima da cabeça e a conta dá zero.
 */
export function escolherPlano(
  variantes: readonly Pick<CaixaDoBalao, 'w' | 'h'>[],
  falante: CabecaNaTela,
  outros: readonly Retangulo[],
  ocupados: readonly Retangulo[],
  limites: LimitesDoBalao,
): { plano: PlanoDoBalao; colocacao: ColocacaoDoBalao } {
  const nota = (c: ColocacaoDoBalao, p: PlanoDoBalao): number =>
    c.cobreFalante * 4 + c.cobreOutros * 3 + c.cobreBaloes * 6 + (c.lado === 'cima' ? 0 : 400) + p.variante * 250 + (p.nivel === 'abaixo' ? 100 : 0);
  let melhor: { plano: PlanoDoBalao; colocacao: ColocacaoDoBalao; nota: number } | null = null;
  const lados: ReadonlyArray<readonly [LadoDoBalao, readonly NivelDoBalao[]]> = [
    ['cima', ['topo']],
    ['direita', ['topo', 'cabeca', 'abaixo']],
    ['esquerda', ['topo', 'cabeca', 'abaixo']],
  ];
  for (let v = 0; v < variantes.length; v++) {
    for (const [lado, niveis] of lados) {
      for (const nivel of niveis) {
        const plano: PlanoDoBalao = { variante: v, lado, nivel };
        const colocacao = colocarBalao(variantes[v] as Pick<CaixaDoBalao, 'w' | 'h'>, plano, falante, outros, ocupados, limites);
        // o de sempre, sem nada coberto: não há o que melhorar
        if (v === 0 && lado === 'cima' && colocacao.cobreFalante === 0 && colocacao.cobreOutros === 0 && colocacao.cobreBaloes === 0) return { plano, colocacao };
        const n = nota(colocacao, plano);
        if (!melhor || n < melhor.nota) melhor = { plano, colocacao, nota: n };
      }
    }
  }
  const m = melhor as { plano: PlanoDoBalao; colocacao: ColocacaoDoBalao };
  return { plano: m.plano, colocacao: m.colocacao };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------------------------------------------------------------

export interface QuadroDoBalao {
  /** Letras reveladas (Infinity = o texto inteiro). */
  readonly letras: number;
  /** Escala do "pop" em torno da ponta do rabicho (1 = sem pop) e opacidade (0 a 1). */
  readonly escala: number;
  readonly alfa: number;
  /** Mostra o indicador ▶ (o "pressione para seguir") na faixa reservada? Balança 2 px (parado no movimento reduzido). */
  readonly seta: boolean;
  readonly tick: number;
  /** Cor da plaquinha do nome (a cor do lutador). */
  readonly corDoNome: string;
  /** A variante da situação (padrão: ZENON pelo nome; com ▶ = vitória; senão abertura). */
  readonly variante?: VarianteDoBalao;
  /** Ticks desde que o balão abriu (o tremor de impacto e as linhas de velocidade crescendo). Padrão: já passou da entrada. */
  readonly desde?: number;
  /** Saída: 0 (aberto) a 1 (sumiu), achatando para a ponta do rabicho. */
  readonly fechando?: number;
  /** Movimento reduzido (ou a CURTA): sem escala, sem tremor, sem pop de palavra, ▶ e brilhos parados, linhas de velocidade cheias. */
  readonly reduz?: boolean;
}

const TINTA = '#07040e';

// ---------- cor ----------
const hexParaRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbParaHex = ([r, g, b]: readonly number[]): string => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v ?? 0))).toString(16).padStart(2, '0')).join('')}`;
const misturar = (a: string, b: string, t: number): string => {
  const A = hexParaRgb(a);
  const B = hexParaRgb(b);
  return rgbParaHex(A.map((v, i) => v + ((B[i] ?? 0) - v) * t));
};
const luminancia = (h: string): number => {
  const c = hexParaRgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
};
export const contrasteEntre = (a: string, b: string): number => {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const comAlfa = (h: string, a: number): string => {
  const [r, g, b] = hexParaRgb(h);
  return `rgba(${r},${g},${b},${a})`;
};
/** A cor do lutador sempre como #rrggbb (3 dígitos expandem; qualquer outra coisa cai no creme). */
export function normalizarCor(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toLowerCase();
  return '#ffd9a6';
}

/** Cor do NOME na plaquinha: tinta escura se ela passa de 4,5:1 no pior ponto do gradiente (a cor escurecida 10%); senão branco com contorno (ficha muito escura). */
export function corDoNomeNaPlaca(cor: string): { readonly cor: string; readonly contorno: boolean } {
  const escura = contrasteEntre('#120a22', misturar(normalizarCor(cor), '#000000', 0.1)) >= 4.5;
  return { cor: escura ? '#120a22' : '#ffffff', contorno: !escura };
}

// ---------- geometria ----------
type LadoDaPlaca = 'esq' | 'dir';

/** Lado da plaquinha: do lado do rabicho (perto de quem fala). */
export function ladoDaPlaca(c: Pick<ColocacaoDoBalao, 'lado' | 'ponta' | 'x' | 'w'>): LadoDaPlaca {
  if (c.lado === 'direita') return 'esq';
  if (c.lado === 'esquerda') return 'dir';
  return c.ponta.x <= c.x + c.w / 2 ? 'esq' : 'dir';
}

type Ponto = readonly [number, number];

/**
 * O contorno do painel, com o rabicho embutido no MESMO caminho (o aro é contínuo, sem emenda). `inset` > 0 = o contorno interno (sem rabicho); `semRabicho` = a sombra dura.
 * Os cantos cortados são cima-direita e baixo-esquerda com a plaquinha à esquerda (o espelho à direita). A ponta recua 3 px para dentro: o contorno em esquadria cresce além
 * da ponta calculada e encostaria no cabelo. Nos rabichos laterais a base fica presa longe dos cantos cortados.
 */
export function contornoDoPainel(c: Pick<ColocacaoDoBalao, 'x' | 'y' | 'w' | 'h' | 'lado' | 'base' | 'ponta'>, placa: LadoDaPlaca, inset: number, semRabicho = false): Ponto[] {
  const C = BALAO.chanfro;
  const x0 = c.x + inset;
  const x1 = c.x + c.w - inset;
  const y0 = c.y + BALAO.placaSobra + inset;
  const y1 = c.y + c.h - BALAO.sombra - inset;
  const temRabicho = !semRabicho && inset === 0 && (c.ponta.x !== c.base.x || c.ponta.y !== c.base.y);
  const recuo = (bx: number, by: number): Ponto => {
    const dx = bx - c.ponta.x;
    const dy = by - c.ponta.y;
    const d = Math.hypot(dx, dy) || 1;
    return [c.ponta.x + (dx / d) * 3, c.ponta.y + (dy / d) * 3];
  };
  const p: Ponto[] = [];
  const ladoEsq = placa === 'esq';
  if (!ladoEsq) p.push([x0, y0 + C], [x0 + C, y0]);
  else p.push([x0, y0]);
  if (ladoEsq) p.push([x1 - C, y0], [x1, y0 + C]);
  else p.push([x1, y0]);
  if (temRabicho && c.lado === 'esquerda') {
    const by = Math.max(y0 + C + 8, Math.min(y1 - C - 12, c.base.y));
    p.push([x1, by - 6], recuo(x1, by), [x1, by + 10]);
  }
  if (!ladoEsq) p.push([x1, y1 - C], [x1 - C, y1]);
  else p.push([x1, y1]);
  if (temRabicho && c.lado === 'cima') {
    const bx = Math.max(x0 + C + 14, Math.min(x1 - C - 14, c.base.x));
    // a cunha "pende" para o lado da plaquinha: a base é assimétrica (12 + 5)
    const [a, b] = ladoEsq ? [12, 5] : [5, 12];
    p.push([bx + a, y1], recuo(bx, y1), [bx - b, y1]);
  }
  if (ladoEsq) p.push([x0 + C, y1], [x0, y1 - C]);
  else p.push([x0, y1]);
  if (temRabicho && c.lado === 'direita') {
    const by = Math.max(y0 + C + 8, Math.min(y1 - C - 12, c.base.y));
    p.push([x0, by + 10], recuo(x0, by), [x0, by - 6]);
  }
  return p;
}

function caminho(ctx: Ctx, pts: readonly Ponto[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function corDoAro(ctx: Ctx, aro: string, c: Pick<ColocacaoDoBalao, 'x' | 'y' | 'w' | 'h'>): string | CanvasGradient {
  const y0 = c.y + BALAO.placaSobra;
  const y1 = c.y + c.h;
  const vertical = (...paradas: Array<[number, string]>): CanvasGradient => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [o, cor] of paradas) g.addColorStop(o, cor);
    return g;
  };
  if (aro === 'creme') return '#fff1d0';
  if (aro === 'ouro') return vertical([0, '#fff6cf'], [0.45, '#f3c65f'], [1, '#c98a2b']);
  if (aro === 'brasa') return vertical([0, '#fff0d8'], [0.5, '#ffa060'], [1, '#e8462a']);
  if (aro === 'bronze') return vertical([0, '#ffd9a8'], [0.5, '#d08a4a'], [1, '#8c4f22']);
  if (aro === 'prisma') {
    const g = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
    g.addColorStop(0, '#8ef3ff');
    g.addColorStop(0.35, '#ffffff');
    g.addColorStop(0.65, '#ff8fe0');
    g.addColorStop(1, '#ffd36b');
    return g;
  }
  return aro;
}

// ---------- texturas do miolo (pintadas dentro das camadas em cache) ----------
/** Retícula Ben-Day: pontos a cada 6 px, em quincôncio, crescendo para o canto OPOSTO à plaquinha (começa em 45% do caminho). Coordenadas locais: (0, 0) = canto da região. */
function reticula(g: Ctx, w: number, h: number, placa: LadoDaPlaca, cor: string, alfa: number): void {
  const passo = 6;
  g.fillStyle = comAlfa(cor, alfa);
  for (let y = 3; y < h; y += passo) {
    for (let x = 3 + ((Math.round(y / passo) % 2) * passo) / 2; x < w; x += passo) {
      const u = placa === 'esq' ? (x / w) * 0.75 + (y / h) * 0.25 : ((w - x) / w) * 0.75 + (y / h) * 0.25;
      const t = Math.max(0, (u - 0.45) / 0.55);
      if (t <= 0) continue;
      g.beginPath();
      g.arc(x, y, 0.35 + 1.5 * t, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** Veios de ônix (o ZENON): magenta 20%, ouro 14% e um véu branco, no lugar da retícula. */
function veiosDeOnix(g: Ctx, w: number, h: number): void {
  const veio = (cor: string, lw: number, a: number, b: number, d: number): void => {
    g.strokeStyle = cor;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(w * a, -2);
    g.bezierCurveTo(w * (a + 0.12), h * 0.4, w * (b - 0.1), h * 0.6, w * b, h + 2);
    g.stroke();
    g.beginPath();
    g.moveTo(w * (a + 0.08), h * 0.3);
    g.quadraticCurveTo(w * d, h * 0.55, w + 2, h * 0.85);
    g.stroke();
  };
  veio('rgba(214,51,154,.20)', 1.2, 0.18, 0.46, 0.7);
  veio('rgba(233,196,106,.14)', 0.8, 0.52, 0.86, 0.95);
  veio('rgba(255,255,255,.05)', 2.5, 0.05, 0.3, 0.5);
}

// ---------- plaquinha, adornos ----------
function desenharPlaca(ctx: Ctx, caixa: CaixaDoBalao, c: ColocacaoDoBalao, placa: LadoDaPlaca, v: EstiloDoBalao, cor: string): void {
  const H = BALAO.placaAltura - 1;
  const I = BALAO.placaInclina;
  const W = caixa.larguraPlaca + (v.selo ? 14 : 0);
  const xa = placa === 'esq' ? c.x + BALAO.placaRecuo : c.x + c.w - BALAO.placaRecuo - W;
  const ya = c.y + 1;
  const pts: Ponto[] = [[xa + I, ya], [xa + W, ya], [xa + W - I, ya + H], [xa, ya + H]];
  let fundo: string | CanvasGradient;
  let aroPlaca: string;
  let corNome: string;
  let contornoNome = false;
  if (v.onix) {
    fundo = '#140f19';
    aroPlaca = '#e9c46a';
    corNome = '#f3d68f';
  } else {
    const g = ctx.createLinearGradient(0, ya, 0, ya + H);
    g.addColorStop(0, misturar(cor, '#ffffff', 0.35));
    g.addColorStop(0.55, cor);
    g.addColorStop(1, misturar(cor, '#000000', 0.1));
    fundo = g;
    aroPlaca = TINTA;
    const n = corDoNomeNaPlaca(cor);
    corNome = n.cor;
    contornoNome = n.contorno;
  }
  // sombra dura da plaquinha
  ctx.save();
  ctx.translate(2, 3);
  caminho(ctx, pts);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fill();
  ctx.restore();
  caminho(ctx, pts);
  ctx.fillStyle = fundo;
  ctx.fill();
  // brilho de cima (bisel) e sombra de baixo
  ctx.save();
  caminho(ctx, pts);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(xa, ya, W, 2);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(xa, ya + H - 3, W, 3);
  ctx.restore();
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 2;
  ctx.strokeStyle = aroPlaca;
  caminho(ctx, pts);
  ctx.stroke();
  let tx = xa + I / 2 + BALAO.placaPadX;
  if (v.selo) {
    // o selo dos guardiões (Os Cinco Selos): um anel com um entalhe
    const cx = tx + 5;
    const cy = ya + H / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = TINTA;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0.35, Math.PI * 2 - 0.35);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#ffe0b0';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe0b0';
    ctx.fill();
    tx += 14;
  }
  ctx.font = FH(BALAO.nome);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (contornoNome) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = TINTA;
    ctx.strokeText(caixa.nome, tx, ya + H / 2 + 1);
  }
  ctx.fillStyle = corNome;
  ctx.fillText(caixa.nome, tx, ya + H / 2 + 1);
}

/** 3 linhas de velocidade inclinadas (como o itálico), na faixa livre acima do painel, no lado OPOSTO à plaquinha; contorno escuro por baixo para ler em qualquer céu. */
function rajadas(ctx: Ctx, c: ColocacaoDoBalao, placa: LadoDaPlaca, cor: string, k: number): void {
  if (k <= 0) return;
  const y1 = c.y + BALAO.placaSobra - 2;
  const y0 = c.y + 3.5;
  ctx.save();
  ctx.lineCap = 'round';
  const comps = [1, 0.75, 0.5];
  for (const passada of [0, 1]) {
    comps.forEach((f, i) => {
      const xb = placa === 'esq' ? c.x + c.w - BALAO.chanfro - 6 - i * 8 : c.x + BALAO.chanfro + 6 + i * 8;
      const alt = (y1 - y0) * f * k;
      ctx.lineWidth = 3 - i * 0.5 + (passada === 0 ? 2.5 : 0);
      ctx.strokeStyle = passada === 0 ? TINTA : cor;
      ctx.beginPath();
      ctx.moveTo(xb, y1);
      ctx.lineTo(xb + alt * 0.5, y1 - alt);
      ctx.stroke();
    });
  }
  ctx.restore();
}

/** Estrela de 4 pontas, branco-creme com halo ouro (os brilhos da vitória). */
function estrela(ctx: Ctx, x: number, y: number, r: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.28;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffbe8';
  ctx.shadowColor = 'rgba(255,211,107,.9)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();
}

/** A variante de um balão sem `variante` explícita (testes e chamadas antigas): ZENON pelo nome, vitória pelo ▶, senão abertura. */
export const varianteImplicita = (nome: string, seta: boolean): VarianteDoBalao => (nome === 'ZENON' ? 'zenon' : seta ? 'vitoria' : 'abertura');

/** Tremor de impacto horizontal quando o pop assenta (ticks 5 a 13): `A·sin((t−5)·2,6)·(1 − (t−5)/8)`. 0 fora da janela e no movimento reduzido. */
export function tremorDeImpacto(amplitude: number, desde: number, reduz: boolean): number {
  if (reduz || amplitude <= 0 || desde < 5 || desde >= 13) return 0;
  return amplitude * Math.sin((desde - 5) * 2.6) * (1 - (desde - 5) / 8);
}

// ---------- camadas em cache ----------
/**
 * Tudo o que NÃO se mexe num balão aberto (sombra, tinta, retícula, vidro, bisel, faixa, aro, plaquinha, linhas de velocidade) é pintado UMA vez fora da tela e reaproveitado quadro a quadro:
 * o balão vira 1 `drawImage` + o texto (+ as estrelas da vitória, que são vivas). O DECISIVO é o único com o brilho de brasa pulsando ENTRE a tinta e o acabamento (por dentro do aro): ele
 * guarda duas camadas (base e detalhe) com o brilho vivo no meio. Num canvas sem GPU o custo é o da área mesclada, por isso uma camada só sempre que dá. A chave é a geometria RELATIVA ao
 * balão (tamanho, variante, cor, lado da plaquinha, base e ponta do rabicho arredondadas ao pixel): enquanto o balão não muda, nada é repintado; no push-in da vitória a ponta do
 * rabicho anda e a camada é refeita (~40 ticks). Sem `document` (testes em Node) ou sem contexto 2D: desenha direto no contexto do jogo, com o mesmo código.
 */
interface CamadasDoBalao {
  /** Tudo (uma camada só) ou só a base (sombra, tinta, retícula), quando há `detalhe` por cima (o decisivo). */
  readonly base: CanvasImageSource;
  readonly detalhe: CanvasImageSource | null;
  /** Onde as camadas começam em relação ao canto (x, y) do balão, e o tamanho delas, em px lógicos. */
  readonly ox: number;
  readonly oy: number;
  readonly w: number;
  readonly h: number;
}

const camadas = new Map<string, CamadasDoBalao | null>();
const TETO_DE_CAMADAS = 24;

/** Só para teste: quantas camadas há guardadas e esvaziar. */
export const camadasGuardadas = (): number => camadas.size;
export const esquecerCamadas = (): void => camadas.clear();

/** Sombra dura, tinta opaca e a retícula (ou os veios de ônix): a base do painel. */
function pintarBase(g: Ctx, c: ColocacaoDoBalao, placa: LadoDaPlaca, v: EstiloDoBalao, cor: string): void {
  const painel = contornoDoPainel(c, placa, 0);
  const y0 = c.y + BALAO.placaSobra;
  const y1 = c.y + c.h - BALAO.sombra;
  // 1) sombra dura (o painel sem o rabicho, 3 px mais baixo)
  g.save();
  g.translate(0, BALAO.sombra);
  caminho(g, contornoDoPainel(c, placa, 0, true));
  g.fillStyle = 'rgba(0,0,0,.42)';
  g.fill();
  g.restore();
  // 2) tinta: gradiente vertical OPACO (o contraste não depende do cenário)
  const t = g.createLinearGradient(0, y0, 0, y1);
  t.addColorStop(0, v.tinta[0]);
  t.addColorStop(0.5, v.tinta[1]);
  t.addColorStop(1, v.tinta[2]);
  caminho(g, painel);
  g.fillStyle = t;
  g.fill();
  // 3) retícula Ben-Day / veios de ônix, só dentro do painel
  g.save();
  caminho(g, painel);
  g.clip();
  g.translate(c.x, y0);
  const hRegiao = c.h - BALAO.placaSobra;
  if (v.onix) veiosDeOnix(g, c.w, hRegiao);
  else reticula(g, c.w, hRegiao, placa, cor, 0.1);
  g.restore();
}

/** Vidro, fio do bisel, sombra interna, faixa de cor, aro, fio duplo, losangos do ônix, linhas de velocidade (`kRajada` 0..1) e a plaquinha: o acabamento do painel. */
function pintarDetalhe(g: Ctx, caixa: CaixaDoBalao, c: ColocacaoDoBalao, placa: LadoDaPlaca, v: EstiloDoBalao, cor: string, kRajada: number): void {
  const painel = contornoDoPainel(c, placa, 0);
  const y0 = c.y + BALAO.placaSobra;
  const y1 = c.y + c.h - BALAO.sombra;
  g.save();
  caminho(g, painel);
  g.clip();
  const vidro = g.createLinearGradient(0, y0, 0, y0 + (y1 - y0) * 0.5);
  vidro.addColorStop(0, 'rgba(255,255,255,.08)');
  vidro.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = vidro;
  g.fillRect(c.x, y0, c.w, (y1 - y0) * 0.5);
  g.fillStyle = 'rgba(255,255,255,.30)';
  g.fillRect(c.x, y0 + 2.5, c.w, 1.2);
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillRect(c.x, y1 - 3.5, c.w, 3.5);
  if (v.faixa) {
    const fx0 = placa === 'esq' ? c.x : c.x + c.w;
    const fx1 = placa === 'esq' ? c.x + c.w * 0.7 : c.x + c.w * 0.3;
    const fg = g.createLinearGradient(fx0, 0, fx1, 0);
    if (v.faixa === 'prisma') {
      fg.addColorStop(0, '#8ef3ff');
      fg.addColorStop(0.5, '#ff8fe0');
      fg.addColorStop(1, 'rgba(255,211,107,0)');
    } else {
      const fc = v.faixa === 'cor' ? cor : v.faixa;
      fg.addColorStop(0, fc);
      fg.addColorStop(1, comAlfa(fc, 0));
    }
    g.fillStyle = fg;
    g.fillRect(c.x, y1 - 6.5, c.w, 3);
  }
  g.restore();
  // aro: contorno escuro largo + aro claro/metal por cima (um caminho só, rabicho incluído)
  g.lineJoin = 'miter';
  g.miterLimit = 3;
  caminho(g, painel);
  g.lineWidth = 5;
  g.strokeStyle = TINTA;
  g.stroke();
  caminho(g, painel);
  g.lineWidth = 2.25;
  g.strokeStyle = corDoAro(g, v.aro, c);
  g.stroke();
  if (v.duplo) {
    caminho(g, contornoDoPainel(c, placa, 4));
    g.lineWidth = 1;
    g.strokeStyle = comAlfa(v.duplo, 0.6);
    g.stroke();
  }
  if (v.onix) {
    // losangos de ouro nos dois chanfros (o ZENON não corre: não tem rajada)
    const C = BALAO.chanfro;
    const cantos: Ponto[] = placa === 'esq' ? [[c.x + c.w - C / 2, y0 + C / 2], [c.x + C / 2, y1 - C / 2]] : [[c.x + C / 2, y0 + C / 2], [c.x + c.w - C / 2, y1 - C / 2]];
    for (const [cx, cy] of cantos) {
      g.beginPath();
      g.moveTo(cx, cy - 4);
      g.lineTo(cx + 4, cy);
      g.lineTo(cx, cy + 4);
      g.lineTo(cx - 4, cy);
      g.closePath();
      g.fillStyle = '#e9c46a';
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = TINTA;
      g.stroke();
    }
  }
  // linhas de velocidade (crescem do tick 2 ao 8) e a plaquinha
  if (v.rajada) rajadas(g, c, placa, v.rajada === 'cor' ? cor : v.rajada, kRajada);
  desenharPlaca(g, caixa, c, placa, v, cor);
}

/** Constrói as duas camadas para a geometria RELATIVA de `c` (canto do balão em (0, 0), base e ponta arredondadas ao pixel). Null sem `document`/contexto. */
function construirCamadas(caixa: CaixaDoBalao, c: ColocacaoDoBalao, placa: LadoDaPlaca, v: EstiloDoBalao, cor: string, cheia: boolean): CamadasDoBalao | null {
  if (typeof document === 'undefined') return null;
  const rel: ColocacaoDoBalao = {
    ...c,
    x: 0,
    y: 0,
    base: { x: Math.round(c.base.x - c.x), y: Math.round(c.base.y - c.y) },
    ponta: { x: Math.round(c.ponta.x - c.x), y: Math.round(c.ponta.y - c.y) },
  };
  const pts = contornoDoPainel(rel, placa, 0);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.floor(Math.min(0, ...xs) - 7);
  const y0 = Math.floor(Math.min(0, ...ys) - 7);
  const x1 = Math.ceil(Math.max(c.w, ...xs) + 7);
  const y1 = Math.ceil(Math.max(c.h, ...ys) + 7);
  const w = x1 - x0;
  const h = y1 - y0;
  try {
    const nova = (pintar: (g: Ctx) => void): HTMLCanvasElement => {
      const cv = criarCanvasPadrao(w * RS, h * RS);
      const g = cv.getContext('2d');
      if (!g) throw new Error('sem contexto 2D');
      g.scale(RS, RS);
      g.translate(-x0, -y0);
      pintar(g);
      return cv;
    };
    const base = nova((g) => {
      pintarBase(g, rel, placa, v, cor);
      if (!v.pulso) pintarDetalhe(g, caixa, rel, placa, v, cor, cheia ? 1 : 0);
    });
    const detalhe = v.pulso ? nova((g) => pintarDetalhe(g, caixa, rel, placa, v, cor, cheia ? 1 : 0)) : null;
    return { base, detalhe, ox: x0, oy: y0, w, h };
  } catch {
    return null;
  }
}

function camadasDoBalao(caixa: CaixaDoBalao, c: ColocacaoDoBalao, placa: LadoDaPlaca, nomeVar: VarianteDoBalao, cor: string, cheia: boolean): CamadasDoBalao | null {
  if (typeof document === 'undefined') return null; // sem canvas fora da tela: nada a guardar (e nada de null no cache)
  const r = (n: number): number => Math.round(n);
  const chave = `${nomeVar}|${cor}|${placa}|${caixa.nome}|${caixa.w}x${caixa.h}|${caixa.larguraPlaca}|${c.lado}|${r(c.base.x - c.x)},${r(c.base.y - c.y)}|${r(c.ponta.x - c.x)},${r(c.ponta.y - c.y)}|${cheia ? 1 : 0}`;
  const guardada = camadas.get(chave);
  if (guardada !== undefined) return guardada;
  if (camadas.size >= TETO_DE_CAMADAS) camadas.clear();
  const feita = construirCamadas(caixa, c, placa, ESTILOS[nomeVar], cor, cheia);
  camadas.set(chave, feita);
  return feita;
}

/** Desenha o balão na `colocacao` (feita por `colocarBalao`). O tamanho da caixa não muda com as letras reveladas: nada pula enquanto o texto aparece. */
export function desenharBalao(ctx: Ctx, caixa: CaixaDoBalao, c: ColocacaoDoBalao, q: QuadroDoBalao): void {
  if (q.alfa <= 0) return;
  const nomeVar = q.variante ?? varianteImplicita(caixa.nome, q.seta);
  const v = ESTILOS[nomeVar];
  const cor = normalizarCor(q.corDoNome);
  const placa = ladoDaPlaca(c);
  const desde = q.desde ?? 999;
  const reduz = q.reduz === true;
  const fechando = q.fechando ?? 0;
  ctx.save();
  ctx.globalAlpha = Math.min(1, q.alfa);
  ctx.translate(tremorDeImpacto(v.tremor, desde, reduz), 0);
  // pop (escala em torno da ponta do rabicho) e saída achatando para a ponta (só alfa no movimento reduzido)
  const ex = q.escala * (reduz ? 1 : 1 + 0.05 * fechando);
  const ey = q.escala * (reduz ? 1 : 1 - 0.8 * fechando);
  if (ex !== 1 || ey !== 1) {
    ctx.translate(c.ponta.x, c.ponta.y);
    ctx.scale(ex, ey);
    ctx.translate(-c.ponta.x, -c.ponta.y);
  }
  const y0 = c.y + BALAO.placaSobra;
  const y1 = c.y + c.h - BALAO.sombra;
  // as linhas de velocidade crescem do tick 2 ao 8; depois são fixas e entram na camada
  const kRajada = reduz ? 1 : Math.min(1, Math.max(0, (desde - 2) / 6));
  const cheia = kRajada >= 1;
  const cam = camadasDoBalao(caixa, c, placa, nomeVar, cor, cheia);
  if (cam) ctx.drawImage(cam.base, c.x + cam.ox, c.y + cam.oy, cam.w, cam.h);
  else {
    pintarBase(ctx, c, placa, v, cor);
  }
  if (v.pulso) {
    // DECISIVO: brilho de brasa por DENTRO do aro, pulsando (fixo no movimento reduzido); por dentro para não vazar da caixa medida
    const a = reduz ? 0.4 : 0.28 + 0.2 * (0.5 + 0.5 * Math.sin(q.tick * 0.16));
    ctx.save();
    caminho(ctx, contornoDoPainel(c, placa, 0));
    ctx.clip();
    caminho(ctx, contornoDoPainel(c, placa, 0));
    ctx.lineWidth = 10;
    ctx.strokeStyle = `rgba(255,190,60,${a})`;
    ctx.stroke(); // sem shadowBlur: o desfoque custa ~2x o quadro num canvas sem GPU e o traço largo e translúcido já faz o brilho
    ctx.restore();
  }
  if (cam) {
    if (cam.detalhe) ctx.drawImage(cam.detalhe, c.x + cam.ox, c.y + cam.oy, cam.w, cam.h);
    if (!cheia && v.rajada) rajadas(ctx, c, placa, v.rajada === 'cor' ? cor : v.rajada, kRajada);
  } else pintarDetalhe(ctx, caixa, c, placa, v, cor, kRajada);
  // brilhos (vitória): cintilam; parados no movimento reduzido
  for (let i = 0; i < v.brilhos; i++) {
    const pos: Ponto[] = [
      [placa === 'esq' ? c.x + c.w - 24 : c.x + 24, y0 + 1],
      [placa === 'esq' ? c.x + c.w - 10 : c.x + 10, y0 + 18],
      [placa === 'esq' ? c.x + 44 : c.x + c.w - 44, y1 - 7],
    ];
    const p = pos[i];
    if (!p) continue;
    const s = reduz ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(q.tick * 0.09 + i * 1.7));
    estrela(ctx, p[0], p[1], 8 * s, reduz ? 0 : q.tick * 0.02 + i);
  }
  // texto (Bangers, caixa alta), letra a letra; sombra dura impressa; palavras de ênfase em ouro com pop de 7 ticks
  ctx.font = FONTE_DA_FALA(BALAO.corpo);
  espacoDasLetras(ctx, BALAO.espaco);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const esq = c.x + BALAO.margemX;
  const primeiraBase = c.y + BALAO.placaAltura + 1 + BALAO.acento * BALAO.corpo;
  const capa = BALAO.corpo * BALAO.capa;
  let restantes = q.letras;
  let indice = 0;
  let letraGlobal = 0;
  const corTexto = v.onix ? '#f6eedf' : '#fff5e2';
  caixa.linhas.forEach((linha, i) => {
    const base = primeiraBase + BALAO.linha * i;
    let pos = 0;
    for (const t of linha.split(' ')) {
      const ini = pos;
      const fimLetra = letraGlobal + ini + t.length;
      const visiveis = Math.max(0, Math.min(t.length, Math.floor(restantes - ini)));
      const enfase = caixa.enfase.has(indice);
      if (visiveis > 0 && t.length) {
        const x = esq + ctx.measureText(linha.slice(0, ini)).width;
        const parte = t.slice(0, visiveis);
        ctx.save();
        if (enfase && !reduz && Number.isFinite(q.letras)) {
          const idade = (q.letras - fimLetra) / LETRAS_POR_TICK;
          // pop de 7 ticks ancorado no CANTO ESQUERDO da linha de base da palavra: cresce para a direita e para cima, nunca cobre a palavra de antes
          if (idade >= 0 && idade < 7) {
            const s = 1 + 0.18 * (1 - idade / 7) ** 2;
            ctx.translate(x, base);
            ctx.scale(s, s);
            ctx.translate(-x, -base);
          }
        }
        ctx.fillStyle = 'rgba(4,2,10,.9)';
        ctx.fillText(parte, x + 1, base + 2);
        if (enfase) {
          const eg = ctx.createLinearGradient(0, base - capa, 0, base);
          eg.addColorStop(0, v.enfase[0]);
          eg.addColorStop(1, v.enfase[1]);
          ctx.fillStyle = eg;
        } else ctx.fillStyle = corTexto;
        ctx.fillText(parte, x, base);
        ctx.restore();
      }
      pos += t.length + 1;
      indice++;
    }
    restantes -= linha.length;
    letraGlobal += linha.length;
  });
  espacoDasLetras(ctx, '0px');
  // ▶ na faixa reservada (vitória), abaixo da última linha de base; balança 2 px (parado no movimento reduzido)
  if (q.seta) {
    const sx = c.x + c.w - 11 + (reduz ? 0 : 2 * Math.sin(q.tick * 0.22)); // junto da borda direita, fora da coluna onde as letras terminam (margem de 16)
    const sy = c.y + c.h - BALAO.sombra - BALAO.margemBase - (caixa.reserva || 16) / 2 + 4; // 4 px abaixo do centro da faixa: o contorno de 3 px do triângulo não encosta na sombra impressa das letras
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 6);
    ctx.lineTo(sx + 6, sy);
    ctx.lineTo(sx - 5, sy + 6);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.fillStyle = v.onix ? '#e9c46a' : '#ffd36b';
    ctx.fill();
  }
  ctx.restore();
}

/** Pop com leve overshoot (easeOutBack, s = 1,9): 0,6 -> ~1,05 perto do tick 5 -> 1 em `k` de 0 a 1. */
export function escalaDoPop(k: number): number {
  const t = Math.min(1, Math.max(0, k));
  const s = 1.9;
  const e = 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
  return 0.6 + 0.4 * e;
}

/** O pop do ZENON: sem overshoot, de 0,94 a 1 (easeOut) em `k` de 0 a 1. */
export const escalaDoPopDoZenon = (k: number): number => 0.94 + 0.06 * easeOut(Math.min(1, Math.max(0, k)));
