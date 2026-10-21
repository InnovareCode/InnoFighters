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

/**
 * A faixa de baixo da grade de 10 (logo abaixo da 3x3, que termina em y 348) tem DUAS casas, com os mesmos x e largura do painel de descrição (352 a 608):
 * a ALEATÓRIA (um quadrado de 44 px sob a 1ª coluna) e a casa de honra do chefão (o resto da faixa, sob as colunas 2 e 3).
 */
export const CASA_ALEATORIA: RetanguloCasa = { x: 352, y: 356, w: 44, h: 44 };
/** A casa de honra do chefão: 204x44, à direita da casa aleatória (vão de 8 px). */
export const CASA_DE_HONRA: RetanguloCasa = { x: 404, y: 356, w: 204, h: 44 };

/**
 * A casa ALEATÓRIA ("RANDOM"): confirmar nela sorteia um lutador liberado. Só existe na grade de 10 (a de produção: 3x3 + honra); nas de 4 e 9
 * casas (fixtures de teste e fidelidade com o protótipo) o layout é o de sempre. Não é um lutador: o índice dela é `n` (o 1º depois do último
 * lutador), então `grade[i]` não vale para ela. Os testes e a cena perguntam por aqui, nunca por `i === 10`.
 */
export const temCasaAleatoria = (n: number): boolean => temCasaDeHonra(n);
/** Índice da casa aleatória (só vale se `temCasaAleatoria(n)`). */
export const indiceDaAleatoria = (n: number): number => n;

/**
 * Retângulo (px lógicos) da casa `i`: 2 colunas = 120 px com passo 132 (como o protótipo); 3 colunas = 80 px com passo 88. Com `n` = 10 a casa 9
 * é a CASA DE HONRA (`CASA_DE_HONRA`); sem `n` o resultado é o de sempre.
 */
export function retanguloDaCasa(i: number, colunas: 2 | 3, n?: number): RetanguloCasa {
  if (n !== undefined && temCasaDeHonra(n)) {
    if (i === n - 1) return CASA_DE_HONRA;
    if (i === indiceDaAleatoria(n)) return CASA_ALEATORIA;
  }
  const col = i % colunas;
  const lin = Math.floor(i / colunas);
  if (colunas === 2) return { x: 360 + col * 132, y: 92 + lin * 132, w: 120, h: 120 };
  return { x: 352 + col * 88, y: 92 + lin * 88, w: 80, h: 80 };
}

/**
 * A área de toque/mouse da casa `i`: a mesma do desenho, e as duas casas da faixa de baixo ganham 4 px de folga em cima (a moldura) e 8 embaixo (a moldura e o
 * vão até o painel de descrição, que começa em y 408): 56 px lógicos de altura = ~43 px CSS no celular deitado de 915x412 (a faixa de 44 px lógicos daria ~34).
 * A casa aleatória (quadrada, 44 px) também ganha 4 px de folga à esquerda e 4 à direita (o vão de 8 px até a honra é dividido entre as duas): 52 px lógicos
 * de largura = ~39 px CSS.
 */
export function retanguloDeToque(i: number, colunas: 2 | 3, n?: number): RetanguloCasa {
  const r = retanguloDaCasa(i, colunas, n);
  if (n === undefined || !temCasaDeHonra(n)) return r;
  if (i === n - 1) return { x: r.x, y: r.y - 4, w: r.w, h: r.h + 12 };
  if (i === indiceDaAleatoria(n)) return { x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 12 };
  return r;
}

/**
 * Move o cursor com volta nas bordas; última linha incompleta cai na última casa existente. Com a CASA DE HONRA (n = 10) a faixa de baixo tem duas casas,
 * a ALEATÓRIA (índice `n`, sob a coluna 1) e a honra (`n - 1`, sob as colunas 2 e 3):
 * - para baixo, da 3ª linha: coluna 1 vai à aleatória, colunas 2 e 3 vão à honra; para cima, da 1ª linha, o mesmo (a volta);
 * - para cima, da aleatória vai à casa 6 (a coluna 1 de baixo) e da honra à 7 (o centro de baixo); para baixo, a aleatória volta à 0 e a honra à 1;
 * - esquerda e direita na faixa de baixo alternam entre a aleatória e a honra (volta nas bordas).
 */
export function moverNaGrade(i: number, direcao: 'up' | 'down' | 'left' | 'right', n: number, colunas: number): number {
  if (temCasaDeHonra(n) && colunas === 3) {
    const honra = n - 1;
    const aleatoria = indiceDaAleatoria(n);
    if (i === honra) return direcao === 'up' ? 7 : direcao === 'down' ? 1 : aleatoria;
    if (i === aleatoria) return direcao === 'up' ? 6 : direcao === 'down' ? 0 : honra;
    const lin3 = Math.floor(i / 3);
    if ((direcao === 'down' && lin3 === 2) || (direcao === 'up' && lin3 === 0)) return i % 3 === 0 ? aleatoria : honra;
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
