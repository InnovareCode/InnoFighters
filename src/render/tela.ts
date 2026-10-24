import { ALTURA, LARGURA } from '../core/constantes';

export type Ctx = CanvasRenderingContext2D;

/*
 * RESOLUÇÃO DO CANVAS (docs/desempenho-android-2026-10-24.md §6, D1/D2): o canvas real tem LARGURA*RS x ALTURA*RS e tudo é desenhado em px
 * lógicos (960x540). Até aqui RS era 2 em toda parte (1920x1080, ~3,3 telas pintadas por quadro) e `imageSmoothingQuality = 'high'`; num
 * celular com 640x360 px CSS isso pinta ~4x mais pixels do que a tela mostra. Agora:
 *  - DESKTOP (ponteiro fino): RS 2 e 'high', exatamente como sempre — o oráculo de pixel (fidelidade-*) só vale assim.
 *  - TOQUE (celular/tablet): começa em 1,5/'medium' e um GOVERNADOR (`resolucao-adaptativa.ts`, chamado de `main.ts`) mede o intervalo entre quadros e
 *    desce um degrau (1/'medium', sem o reflexo no piso) se o p95 passar de 20 ms por alguns segundos E a descida adiantar (senão volta: o gargalo não é pixel), ou sobe (2/'medium') se sobrar folga, sem piscar (a troca é feita no início
 *    do callback, antes de desenhar). Só o canvas PRINCIPAL muda; os canvases fora da tela (balão, trailer) ficam no `RS` de partida.
 *  - `?rs=2`, `?rs=1.5` ou `?rs=1` força o degrau (sem governador, em qualquer aparelho); `?rs=auto` liga o governador também no desktop (teste).
 */

/** Os degraus de qualidade do canvas principal, do mais nítido ao mais leve. */
export interface Degrau {
  readonly rs: number;
  readonly suavizacao: ImageSmoothingQuality;
}
export const DEGRAUS_DE_TOQUE: readonly Degrau[] = Object.freeze([
  { rs: 2, suavizacao: 'medium' },
  { rs: 1.5, suavizacao: 'medium' },
  // 'low' (bilinear sem mipmap) faria os sprites (atlas de 2048 px reduzidos ~9x) tremerem de serrilhado; 'medium' usa mipmaps e é bem mais barato que 'high'
  { rs: 1, suavizacao: 'medium' },
]);
/** O desktop: o único degrau do oráculo de pixel. */
export const DEGRAU_DE_DESKTOP: Degrau = Object.freeze({ rs: 2, suavizacao: 'high' });
/** Em toque o jogo COMEÇA neste degrau do `DEGRAUS_DE_TOQUE` (1,5). */
export const DEGRAU_INICIAL_DE_TOQUE = 1;

/** Aparelho cujo ponteiro principal é o dedo (mesmo teste do protótipo/`toque.ts`, mais `pointer: coarse`). */
export function aparelhoDeToque(alvo: { readonly navigator?: { readonly maxTouchPoints?: number }; readonly ontouchstart?: unknown; readonly matchMedia?: (consulta: string) => { readonly matches: boolean } }): boolean {
  if ('ontouchstart' in alvo || (alvo.navigator?.maxTouchPoints ?? 0) > 0) return true;
  return typeof alvo.matchMedia === 'function' && alvo.matchMedia('(pointer: coarse)').matches;
}

export interface PoliticaDeResolucao {
  /** Degraus disponíveis (de um só = fixo). */
  readonly degraus: readonly Degrau[];
  /** Índice do degrau de partida. */
  readonly inicial: number;
  /** O governador mede e troca de degrau? */
  readonly adaptativa: boolean;
}

/** A política para o aparelho/URL: `?rs=` (número ou `auto`) vence; senão toque = adaptativo a partir de 1,5; desktop = fixo em 2/'high'. Pura. */
export function politicaDeResolucao(busca: string, toque: boolean): PoliticaDeResolucao {
  const bruto = new URLSearchParams(busca).get('rs');
  if (bruto !== null) {
    if (bruto.trim().toLowerCase() === 'auto') return { degraus: DEGRAUS_DE_TOQUE, inicial: DEGRAU_INICIAL_DE_TOQUE, adaptativa: true };
    const n = Number(bruto);
    if (Number.isFinite(n) && n >= 0.5 && n <= 4) {
      // forçado: a suavização acompanha (2 = 'high' no desktop e 'medium' no toque; menos que 2 = 'medium'/'low')
      const suavizacao: ImageSmoothingQuality = n >= 2 && !toque ? 'high' : 'medium';
      return { degraus: [{ rs: n, suavizacao }], inicial: 0, adaptativa: false };
    }
  }
  if (toque) return { degraus: DEGRAUS_DE_TOQUE, inicial: DEGRAU_INICIAL_DE_TOQUE, adaptativa: true };
  return { degraus: [DEGRAU_DE_DESKTOP], inicial: 0, adaptativa: false };
}

const politica: PoliticaDeResolucao =
  typeof window === 'undefined' ? { degraus: [DEGRAU_DE_DESKTOP], inicial: 0, adaptativa: false } : politicaDeResolucao(window.location.search, aparelhoDeToque(window));

/** A política em vigor nesta página (leitura, para `main.ts` ligar o governador). */
export const POLITICA_DE_RESOLUCAO: PoliticaDeResolucao = politica;

/**
 * Fator de partida: vale para os canvases FORA DA TELA (cache do balão, camadas do trailer, logo pré-reduzida), que são criados uma vez
 * e não acompanham a troca de degrau do canvas principal (eles são desenhados nele em px lógicos, em qualquer fator).
 */
export const RS: number = politica.degraus[politica.inicial]!.rs;

let nivel = politica.inicial;

/** O degrau em vigor no canvas principal. */
export function degrauAtual(): Degrau {
  return politica.degraus[nivel] as Degrau;
}

/** O fator do canvas principal AGORA (muda com o governador); `RS` é o de partida. */
export function rsDaTela(): number {
  return degrauAtual().rs;
}

/** Dimensiona o canvas (LARGURA*rs x ALTURA*rs reais) e liga a suavização do degrau em vigor. Mudar width/height reinicia o contexto: configurar depois. */
export function prepararCanvas(canvas: HTMLCanvasElement): Ctx {
  const d = degrauAtual();
  canvas.width = Math.round(LARGURA * d.rs);
  canvas.height = Math.round(ALTURA * d.rs);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('contexto 2D indisponivel');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = d.suavizacao;
  return ctx;
}

/**
 * Troca o degrau do canvas principal (governador). Devolve se mudou. O contexto é o MESMO objeto (só o estado reinicia): `usarEspacoLogico` do
 * quadro seguinte (e `limparQuadro`) já reaplica a escala nova, então chamar isto no INÍCIO do callback de quadro não deixa nenhum quadro em branco.
 */
export function trocarDegrau(canvas: HTMLCanvasElement, indice: number): boolean {
  const i = Math.max(0, Math.min(politica.degraus.length - 1, indice));
  if (i === nivel) return false;
  nivel = i;
  prepararCanvas(canvas);
  return true;
}

/**
 * D2: no degrau MAIS LEVE (rs < 1,25) o desenho dispensa o que custa pixel e quase não se vê (o reflexo do lutador no piso, 0,15 de alfa, redesenha o sprite
 * inteiro: ~0,5 Mpix por lutador a RS 2). Desktop (RS 2) e os degraus 2/1,5 desenham tudo, como sempre.
 */
export function qualidadeReduzida(): boolean {
  return degrauAtual().rs < 1.25;
}

/** O índice do degrau atual (para o governador). */
export function indiceDoDegrau(): number {
  return nivel;
}

/** Só testes: volta ao degrau de partida sem mexer em canvas nenhum. */
export function reiniciarDegrauParaTeste(): void {
  nivel = politica.inicial;
}

/** Passa a desenhar em coordenadas lógicas 960x540 (zera qualquer transformação anterior). `escala` = o fator do canvas de `ctx` (padrão: o do principal). */
export function usarEspacoLogico(ctx: Ctx, escala: number = degrauAtual().rs): void {
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
}

/** Início de quadro: espaço lógico + limpa a tela. */
export function limparQuadro(ctx: Ctx): void {
  usarEspacoLogico(ctx);
  ctx.clearRect(0, 0, LARGURA, ALTURA);
}
