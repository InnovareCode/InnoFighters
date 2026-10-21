import type { Configuracoes, IdLutador } from '../core/contratos';

/**
 * Progresso de desbloqueio (C4 v2, plano 3.1). So tipos: este arquivo nao tem codigo de execucao,
 * entao `core/storage` pode importa-lo sem criar ciclo.
 */
export type Progresso = {
  /** ALEM dos iniciais; lista explicita (nunca derivada de `zeradas`) e que so cresce. */
  desbloqueados: IdLutador[];
  /** Quantas vezes o Arcade foi zerado (qualquer dificuldade, com continues). */
  zeradas: number;
  chefeDerrotado: boolean;
  /** Ja apareceram como liberados na selecao (o selo "NOVO!" some). Sempre subconjunto de `desbloqueados`. */
  vistos: IdLutador[];
  /**
   * Ids de desbloqueio que ESTE build nao conhece (ex.: lutador de uma onda futura, depois de um rollback).
   * So existe para nao perder o ganho no disco: opaco, nunca entra em `liberados`/UI, so e regravado.
   * Ausente quando vazio. Se o id passar a existir (build novo), o saneamento o promove a `desbloqueados`.
   */
  desconhecidos?: string[];
};

/** Formato gravado em `inno-fighters-v2`. */
export type ArmazenamentoV2 = { v: 2; s: Configuracoes; hi: number; prog: Progresso };

/**
 * Regras do desbloqueio como DADO injetavel. Os padroes (`REGRAS_PADRAO`) vivem em `regras.ts`;
 * os testes passam regras proprias com ids falsos.
 */
export type Regras = {
  /** Todos os lutadores existentes (= ROSTER). Ids fora daqui sao lixo ao sanear o storage. */
  readonly roster: readonly IdLutador[];
  /** Liberados de fabrica. Implicitos: nunca entram em `desbloqueados`. */
  readonly iniciais: readonly IdLutador[];
  /** Ordem em que a zerada libera lutadores. Reordenar nunca revoga quem ja foi ganho. */
  readonly fila: readonly IdLutador[];
  /** O chefao; `null` enquanto ele nao existe (lancamento em ondas: o sistema funciona sem chefao). */
  readonly chefe: IdLutador | null;
  /** Quantos rivais sorteados antes do chefao. */
  readonly tamanhoEscada: number;
  /** ED5: lutador ainda travado pode aparecer como rival no Arcade? */
  readonly travadosNaEscada: boolean;
};

/** Uma luta da escada do Arcade. */
export type Etapa = { id: IdLutador; chefe: boolean };

/** Resultado de zerar o Arcade: o novo progresso (a entrada nao e mutada) e quem acabou de ser liberado. */
export type ResultadoVitoria = { prog: Progresso; novos: IdLutador[] };
