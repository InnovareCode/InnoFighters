import type { IdLutador } from '../core/contratos';
import { liberados, type Progresso, type Regras } from '../meta';

/** Estado de uma casa da grade de seleção (plano 5). */
export type EstadoCasa =
  /** Pode escolher. */
  | 'liberado'
  /** Pode escolher e acabou de ser liberado: selo "NOVO!" até ser visto. */
  | 'novo'
  /** Existe, mas ainda não foi liberado: silhueta escura + cadeado, não confirma. */
  | 'travado'
  /** É o chefão e ainda não foi derrotado: "???", sem silhueta, não confirma. */
  | 'chefe-oculto';

/** Quantos lutadores regulares cabem na grade 3x3 (o 10º, o chefão, ganha a casa de honra embaixo dela). */
export const REGULARES_DA_GRADE = 9;

/** A grade tem a CASA DE HONRA do chefão (uma faixa larga embaixo da 3x3)? Só com 10 casas: 9 regulares + o chefão. */
export const temCasaDeHonra = (n: number): boolean => n === REGULARES_DA_GRADE + 1;

/**
 * Ordem das casas na grade.
 * - 10 lutadores (9 regulares + o chefão, o ZENON): os regulares na ordem do ROSTER (4 de fábrica + a fila na ordem em que se ganha, então o
 *   BAATAR fecha a 3x3 na 9ª casa) e o chefão por último, índice 9 = CASA DE HONRA (uma faixa de 256x44 embaixo da 3x3).
 * - 9 lutadores com o chefão dentro (o chefe de teste, BAATAR): o chefão NO CENTRO (índice 4).
 * - Os demais tamanhos seguem a ordem do ROSTER (hoje, 4 lutadores: a ordem do protótipo, sem mudança).
 */
export function ordemDaGrade(roster: readonly IdLutador[], chefe: IdLutador | null): IdLutador[] {
  if (chefe !== null && roster.includes(chefe)) {
    const outros = roster.filter((id) => id !== chefe);
    if (roster.length === REGULARES_DA_GRADE + 1) return [...outros, chefe];
    if (roster.length === 9) {
      outros.splice(4, 0, chefe);
      return outros;
    }
  }
  return [...roster];
}

/** 2 colunas até 4 lutadores (layout de hoje); 3 colunas (3x3) acima disso. */
export const colunasDaGrade = (n: number): 2 | 3 => (n > 4 ? 3 : 2);

export interface RetanguloCasa {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A casa de honra do chefão: logo abaixo da 3x3 (que termina em y 348), com os mesmos x e largura do painel de descrição. */
export const CASA_DE_HONRA: RetanguloCasa = { x: 352, y: 356, w: 256, h: 44 };

/**
 * Retângulo (px lógicos) da casa `i`: 2 colunas = 120 px com passo 132 (como o protótipo); 3 colunas = 80 px com passo 88. Com `n` = 10 a casa 9
 * é a CASA DE HONRA (`CASA_DE_HONRA`); sem `n` o resultado é o de sempre.
 */
export function retanguloDaCasa(i: number, colunas: 2 | 3, n?: number): RetanguloCasa {
  if (n !== undefined && temCasaDeHonra(n) && i === n - 1) return CASA_DE_HONRA;
  const col = i % colunas;
  const lin = Math.floor(i / colunas);
  if (colunas === 2) return { x: 360 + col * 132, y: 92 + lin * 132, w: 120, h: 120 };
  return { x: 352 + col * 88, y: 92 + lin * 88, w: 80, h: 80 };
}

/**
 * A área de toque/mouse da casa `i`: a mesma do desenho, e a casa de honra ganha 4 px de folga em cima (a moldura) e 8 embaixo (a moldura e o vão até o painel de
 * descrição, que começa em y 408): 256x56 lógicos = ~43 px CSS de altura no celular deitado de 915x412 (a faixa de 44 px lógicos daria ~34).
 */
export function retanguloDeToque(i: number, colunas: 2 | 3, n?: number): RetanguloCasa {
  const r = retanguloDaCasa(i, colunas, n);
  return n !== undefined && temCasaDeHonra(n) && i === n - 1 ? { x: r.x, y: r.y - 4, w: r.w, h: r.h + 12 } : r;
}

/**
 * Move o cursor com volta nas bordas; última linha incompleta cai na última casa existente. Com a CASA DE HONRA (n = 10): para baixo, de qualquer
 * casa da 3ª linha vai para a honra; para cima, da honra vai para a casa do centro de baixo (7); da 1ª linha para cima também vai à honra (a volta);
 * para baixo, da honra volta ao centro de cima (1); esquerda e direita na honra não mudam de casa.
 */
export function moverNaGrade(i: number, direcao: 'up' | 'down' | 'left' | 'right', n: number, colunas: number): number {
  if (temCasaDeHonra(n) && colunas === 3) {
    const honra = n - 1;
    if (i === honra) return direcao === 'up' ? 7 : direcao === 'down' ? 1 : honra;
    const lin3 = Math.floor(i / 3);
    if (direcao === 'down' && lin3 === 2) return honra;
    if (direcao === 'up' && lin3 === 0) return honra;
    if (direcao === 'left' || direcao === 'right') return lin3 * 3 + (((i % 3) + (direcao === 'right' ? 1 : 2)) % 3);
    return i + (direcao === 'down' ? 3 : -3);
  }
  const linhas = Math.ceil(n / colunas);
  let col = i % colunas;
  let lin = Math.floor(i / colunas);
  if (direcao === 'left' || direcao === 'right') col = (col + (direcao === 'right' ? 1 : colunas - 1)) % colunas;
  else lin = (lin + (direcao === 'down' ? 1 : linhas - 1)) % linhas;
  return Math.min(lin * colunas + col, n - 1);
}

/** Primeira casa liberada a partir de `de` (inclusive), andando `passo` casas com volta; -1 se não há nenhuma. */
export function proximaLiberada(grade: readonly IdLutador[], libs: ReadonlySet<IdLutador>, de: number, passo: 1 | -1 = 1): number {
  const n = grade.length;
  for (let k = 0; k < n; k++) {
    const i = (((de + k * passo) % n) + n) % n;
    if (libs.has(grade[i] as IdLutador)) return i;
  }
  return -1;
}

export interface ContextoDaGrade {
  readonly prog: Progresso;
  readonly regras: Regras;
  /** Liberados que o jogador ainda não tinha visto ao abrir a tela (recebem o selo "NOVO!"). */
  readonly novos: ReadonlySet<IdLutador>;
}

export function estadoDaCasa(id: IdLutador, c: ContextoDaGrade): EstadoCasa {
  if (liberados(c.prog, c.regras).has(id)) return c.novos.has(id) ? 'novo' : 'liberado';
  return id === c.regras.chefe ? 'chefe-oculto' : 'travado';
}

/** Pode confirmar esta casa? (travado e chefão oculto nunca, em nenhum modo, inclusive Versus e Treino) */
export const podeEscolher = (e: EstadoCasa): boolean => e === 'liberado' || e === 'novo';
