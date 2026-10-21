import { easeOut } from '../core/math';
import { FB, FH, retanguloArredondado, texto } from './texto';
import type { Ctx } from './tela';

/*
 * BALÃO DE FALA das provocações (docs/spec-provocacao-prerround-e-vitoria.md §7.2). Irmão da legenda do chefão (`legenda.ts`): a mesma moldura dourada e a
 * mesma fonte do corpo (`texto()`), mas com o nome de quem fala, a quebra de linha MEDIDA e um rabicho apontando para a cabeça.
 *
 * Tudo aqui é APRESENTAÇÃO: a quebra é calculada UMA vez por fala (`medirBalao`), o lugar é uma função pura (`posicionarBalao`, testável sem canvas) e o
 * desenho só lê os dois. Nada toca o motor, o RNG da luta ou o lock-step.
 */

/** Medidas do balão, em px lógicos (tela 960x540). 1 linha = 60 px de altura e 2 linhas = 84 (nome + linhas + margens). */
/** Altura da faixa embaixo do texto que o balão de VITÓRIA reserva para o ▶ (o triângulo tem 10 px). */
export const RESERVA_DA_SETA = 14;

export const BALAO = {
  /** Largura máxima de UMA linha de texto (o balão tem até 400 com as margens). */
  linhaMax: 372,
  margemX: 14,
  margemTopo: 8,
  margemBase: 8,
  alturaDoNome: 20,
  alturaDaLinha: 24,
  corpo: 20,
  nome: 19,
  raio: 12,
  /** Comprimento do rabicho e meia-largura da base dele. */
  rabicho: 12,
  rabichoMeio: 9,
  /** Folga mínima das bordas da tela. */
  folga: 12,
} as const;

/** O balão já medido: as linhas quebradas e a caixa. Calculado uma vez por fala. */
export interface CaixaDoBalao {
  readonly nome: string;
  readonly linhas: readonly string[];
  readonly w: number;
  readonly h: number;
  /** Letras de todas as linhas somadas (o que o letreiro revela). */
  readonly letras: number;
  /** Faixa livre embaixo do texto (px) onde mora o ▶ da vitória: o indicador nunca cai sobre as letras. 0 nos demais balões. */
  readonly reserva: number;
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

/**
 * Mede o balão na fonte do corpo (`FB(20)`) e a etiqueta do nome em `FH(18)`, com linhas de até `linhaMax` px. Chamar com a fonte JÁ carregada (ver
 * `fontesProntas`).
 */
export function medirBalao(ctx: Ctx, fala: string, nome: string, linhaMax: number = BALAO.linhaMax, reserva = 0): CaixaDoBalao {
  ctx.save();
  ctx.font = FB(BALAO.corpo);
  const linhas = quebrarPorMedida(fala, linhaMax, (s) => ctx.measureText(s).width);
  const larguraTexto = Math.max(...linhas.map((l) => ctx.measureText(l).width));
  ctx.font = FH(BALAO.nome);
  const larguraNome = ctx.measureText(nome).width;
  ctx.restore();
  const w = Math.ceil(Math.max(larguraTexto, larguraNome)) + BALAO.margemX * 2;
  const h = BALAO.margemTopo + BALAO.alturaDoNome + BALAO.alturaDaLinha * linhas.length + reserva + BALAO.margemBase;
  return { nome, linhas, w, h, letras: linhas.reduce((n, l) => n + l.length, 0), reserva };
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
    const bx = prender(falante.x, x + BALAO.raio + BALAO.rabichoMeio, x + w - BALAO.raio - BALAO.rabichoMeio);
    base = { x: bx, y: y + h };
    const py = Math.max(base.y, Math.min(falante.topo - 3, base.y + T));
    ponta = { x: prender(falante.x, bx - BALAO.rabichoMeio * 2, bx + BALAO.rabichoMeio * 2), y: py };
  } else {
    const by = prender(falante.topo + falante.altura * 0.35, y + BALAO.raio + BALAO.rabichoMeio, y + h - BALAO.raio - BALAO.rabichoMeio);
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
  /** Mostra o indicador ▶ (o "pressione para seguir") no canto de baixo? `piscaEm` = período do pisca em ticks, 0 = fixo. */
  readonly seta: boolean;
  readonly tick: number;
  readonly piscar: boolean;
  /** Cor da etiqueta do nome (a cor do lutador). */
  readonly corDoNome: string;
}

const COR_DO_TEXTO = '#fff6e0';
const COR_DO_FUNDO = 'rgba(14,9,30,.92)';
const COR_DA_BORDA = '#d9b25a';

/** Desenha o balão na `colocacao` (feita por `posicionarBalao`). O tamanho da caixa não muda com as letras reveladas: nada pula enquanto o texto aparece. */
export function desenharBalao(ctx: Ctx, caixa: CaixaDoBalao, c: ColocacaoDoBalao, q: QuadroDoBalao): void {
  if (q.alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, q.alfa);
  if (q.escala !== 1) {
    ctx.translate(c.ponta.x, c.ponta.y);
    ctx.scale(q.escala, q.escala);
    ctx.translate(-c.ponta.x, -c.ponta.y);
  }
  // corpo + rabicho no mesmo caminho: o preenchimento e a borda dourada saem de uma peça só
  retanguloArredondado(ctx, c.x, c.y, c.w, c.h, BALAO.raio);
  ctx.fillStyle = COR_DO_FUNDO;
  ctx.fill();
  if (c.ponta.x !== c.base.x || c.ponta.y !== c.base.y) {
    const m = BALAO.rabichoMeio;
    ctx.beginPath();
    if (c.lado === 'cima') {
      ctx.moveTo(c.base.x - m, c.base.y - 1);
      ctx.lineTo(c.ponta.x, c.ponta.y);
      ctx.lineTo(c.base.x + m, c.base.y - 1);
    } else {
      const bx = c.base.x + (c.lado === 'direita' ? 1 : -1);
      ctx.moveTo(bx, c.base.y - m);
      ctx.lineTo(c.ponta.x, c.ponta.y);
      ctx.lineTo(bx, c.base.y + m);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = COR_DA_BORDA;
  retanguloArredondado(ctx, c.x, c.y, c.w, c.h, BALAO.raio);
  ctx.stroke();
  if (c.ponta.x !== c.base.x || c.ponta.y !== c.base.y) {
    const m = BALAO.rabichoMeio;
    ctx.beginPath();
    if (c.lado === 'cima') {
      ctx.moveTo(c.base.x - m, c.base.y);
      ctx.lineTo(c.ponta.x, c.ponta.y);
      ctx.lineTo(c.base.x + m, c.base.y);
    } else {
      ctx.moveTo(c.base.x, c.base.y - m);
      ctx.lineTo(c.ponta.x, c.ponta.y);
      ctx.lineTo(c.base.x, c.base.y + m);
    }
    ctx.stroke();
  }
  // nome de quem fala (etiqueta) e o texto, letra a letra
  const esq = c.x + BALAO.margemX;
  texto(ctx, caixa.nome, esq, c.y + BALAO.margemTopo + BALAO.alturaDoNome / 2, BALAO.nome, q.corDoNome, 'left', { font: FH(BALAO.nome), shadow: false });
  let restantes = q.letras;
  caixa.linhas.forEach((linha, i) => {
    if (restantes <= 0) return;
    const visivel = restantes >= linha.length ? linha : linha.slice(0, Math.floor(restantes));
    restantes -= linha.length;
    if (visivel === '') return;
    texto(ctx, visivel, esq, c.y + BALAO.margemTopo + BALAO.alturaDoNome + BALAO.alturaDaLinha * (i + 0.5) + 1, BALAO.corpo, COR_DO_TEXTO, 'left', { shadow: false });
  });
  if (q.seta && (!q.piscar || Math.floor(q.tick / 20) % 2 === 0)) {
    // triângulo desenhado (a fonte do canvas não tem ▶ e o fallback pode virar emoji)
    const sx = c.x + c.w - BALAO.margemX - 8;
    // na faixa reservada embaixo do texto (centro dela), nunca sobre as letras
    const sy = c.y + c.h - BALAO.margemBase - (caixa.reserva || 16) / 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy - 5);
    ctx.lineTo(sx + 5, sy);
    ctx.lineTo(sx - 4, sy + 5);
    ctx.closePath();
    ctx.fillStyle = COR_DA_BORDA;
    ctx.fill();
  }
  ctx.restore();
}

/** O pop de abertura (0,85 -> 1 em `k` de 0 a 1, com easeOut). */
export const escalaDoPop = (k: number): number => 0.85 + 0.15 * easeOut(Math.min(1, Math.max(0, k)));
