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

/**
 * Ordem das casas na grade. Com 9 lutadores (grade 3x3) o chefão fica NO CENTRO (índice 4); nos demais tamanhos
 * segue a ordem do ROSTER (hoje, 4 lutadores: a ordem do protótipo, sem mudança).
 */
export function ordemDaGrade(roster: readonly IdLutador[], chefe: IdLutador | null): IdLutador[] {
  const ordem = [...roster];
  if (chefe !== null && roster.length === 9 && roster.includes(chefe)) {
    const outros = roster.filter((id) => id !== chefe);
    outros.splice(4, 0, chefe);
    return outros;
  }
  return ordem;
}

/** 2 colunas até 4 lutadores (layout de hoje); 3 colunas (3x3) acima disso. */
export const colunasDaGrade = (n: number): 2 | 3 => (n > 4 ? 3 : 2);

export interface RetanguloCasa {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Retângulo (px lógicos) da casa `i`: 2 colunas = 120 px com passo 132 (como o protótipo); 3 colunas = 80 px com passo 88. */
export function retanguloDaCasa(i: number, colunas: 2 | 3): RetanguloCasa {
  const col = i % colunas;
  const lin = Math.floor(i / colunas);
  if (colunas === 2) return { x: 360 + col * 132, y: 92 + lin * 132, w: 120, h: 120 };
  return { x: 352 + col * 88, y: 92 + lin * 88, w: 80, h: 80 };
}

/** Move o cursor com volta nas bordas; última linha incompleta cai na última casa existente. */
export function moverNaGrade(i: number, direcao: 'up' | 'down' | 'left' | 'right', n: number, colunas: number): number {
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
