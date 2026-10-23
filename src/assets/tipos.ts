/**
 * C1 — manifesto de atlas. O formato v1 (uma imagem) mora em data/atlas.ts (Vega); aqui ficam o C1 v2
 * (atlas em várias páginas + retrato separado, docs/plano-expansao.md 1.4) e o erro de carga.
 */
import type { QuadroAtlas as QuadroAtlasV1 } from '../data/atlas';

export type { ManifestoAtlas, QuadroAtlas } from '../data/atlas';

export type Par = readonly [number, number];
export type Quatro = readonly [number, number, number, number];

/** Quadro do C1 com a página do atlas em que está (v1: sempre 0). */
export type QuadroC1 = QuadroAtlasV1 & { /** índice em `imagens` */ p: number };

/** Retrato do lutador para a seleção/HUD: arquivo + recorte opcional (px da imagem do retrato). */
export interface RetratoDef {
  readonly arquivo: string;
  /** Região da imagem usada como rosto [x, y, w, h]; ausente = a imagem inteira. */
  readonly recorte?: Quatro;
}

/**
 * Folha FILME (painel do especial): UMA página própria, de tamanho próprio, FORA de `imagens`. Os quadros existem desde o boot
 * (todos de painel), mas a imagem só carrega no início da luta (`AtlasLutador.carregarFilme`); sem ela o mundo desenha a pose `Alt`.
 */
export interface FilmeDef {
  /** Arquivo da página, na pasta do manifesto (nome simples; nunca igual a uma página de `imagens`). */
  readonly imagem: string;
  /** Tamanho da página FILME (px), independente do `tamanho` do atlas. */
  readonly tamanho: Par;
  /** Só `f0..f5`, todos `painel: true`, `p` sempre 0. */
  readonly quadros: Readonly<Record<string, QuadroC1>>;
}

/**
 * Manifesto C1 já validado e normalizado: v1 e v2 chegam no mesmo formato (v1 vira `imagens` de 1 página,
 * todo quadro com p = 0).
 */
export interface ManifestoC1 {
  readonly versao: 1 | 2;
  readonly lutador: string;
  /** Arquivos das páginas do atlas, na pasta do manifesto. */
  readonly imagens: readonly string[];
  /** Tamanho de CADA página (px). */
  readonly tamanho: Par;
  readonly alturaRef: number;
  readonly quadros: Readonly<Record<string, QuadroC1>>;
  readonly retrato?: RetratoDef;
  /** Folha FILME opcional (só os lutadores com filme de especial). */
  readonly filme?: FilmeDef;
}

/** Falha de carga ou de validação de um recurso; a mensagem diz qual. */
export class ErroDeAsset extends Error {
  constructor(
    mensagem: string,
    readonly recurso: string,
    opcoes?: { cause?: unknown },
  ) {
    super(mensagem, opcoes);
    this.name = 'ErroDeAsset';
  }
}
