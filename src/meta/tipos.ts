import type { Configuracoes, IdLutador, MotorV2 } from '../core/contratos';

/**
 * Progresso de desbloqueio (C4 v2, plano 3.1). So tipos: este arquivo nao tem codigo de execucao,
 * entao `core/storage` pode importa-lo sem criar ciclo.
 */
export type Progresso = {
  /** ALEM dos iniciais; lista explicita (nunca derivada de `zeradas`) e que so cresce. */
  desbloqueados: IdLutador[];
  /** Quantas vezes o Arcade foi zerado (qualquer dificuldade, com continues). */
  zeradas: number;
  /**
   * LEGADO (Z6): "derrotou algum chefao". Continua gravado (= `chefesDerrotados` nao vazio) so para um build ANTIGO,
   * que ignora campos que nao conhece, ainda ler o ganho depois de um rollback. NADA decide nada a partir dele:
   * liberar/travar e `desbloqueados` (via `liberados`), e QUAL chefao caiu e `chefesDerrotados`. Um teste de arquitetura
   * garante que o codigo de jogo/UI nao o le.
   */
  chefeDerrotado: boolean;
  /**
   * Ids dos chefoes ja derrotados no Arcade (ex.: `['baatar', 'zenon']`). `string[]` e nao `IdLutador[]` de proposito:
   * o id de um chefao de onda futura ainda nao existe no tipo/roster, mas tem de sobreviver ao save (mesma razao de
   * `desconhecidos`). So informativo — o desbloqueio mora em `desbloqueados`. Ausente quando vazio (formato em disco
   * identico ao anterior para quem nunca derrotou um chefao). Um save antigo com `chefeDerrotado: true` e sem esta lista
   * vira `['baatar']` (o unico chefao que existia).
   */
  chefesDerrotados?: string[];
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
  /** Esquiva (N / O / L1 / botao ESQ). `false` = o jogo sem ela (4 originais / fidelidade): sem botao, selo nem evento. */
  readonly esquiva: boolean;
  /** Cinematica do especial. `false` = nunca roda, nem com a preferencia do jogador em 'completa'. */
  readonly cinematica: boolean;
  /**
   * Chefoes progressivos (docs/spec-chefoes-progressivos-temas-e-dificuldade.md, 1). `true` = o chefao do ARCADE e o primeiro da
   * `fila` ainda bloqueado (`chefeDoArcade`), e so com a fila esgotada e `chefe` (o Anfitriao); derrota-lo o libera
   * (`aplicarVitoriaArcade` com `{ chefe }`), e a zerada deixa de avancar a fila sozinha. `false` = a regra de antes (o
   * `chefe` fixo e toda zerada libera o proximo da fila): o rollback, o `?expansao=4` e os testes antigos.
   */
  readonly chefesDaFila: boolean;
  /** Tema musical por lutador (spec 3). `false` = so `fight`/`menu`/`chefe` de antes (`?expansao=4`). Separado de `cinematica`. */
  readonly temasMusicais: boolean;
  /**
   * Trailer de abertura (docs/spec-trailer-abertura.md). `true` = depois do boot toca o trailer (e, parado 30 s no título, o modo atrair); `false` = só a abertura de hoje
   * (`CenaIntro`, oráculo de pixel da fidelidade com o protótipo): o `?expansao=4`.
   */
  readonly trailer: boolean;
  /**
   * Revisão do motor de luta v2 (docs/spec-revisao-motor-luta-v2.md §2), flag por mecânica. AUSENTE = o motor de antes, bit a bit: é o que o
   * oráculo, o harness de balanço, o `?expansao=4` e `REGRAS_PADRAO` rodam hoje. Só vai à `ConfigPartida` das lutas montadas pela UI (`cfgMotorV2`);
   * o trailer monta a sua e nunca a recebe. Liga-se na V2-6, quando o dono mandar.
   */
  readonly motorV2?: MotorV2;
};

/**
 * O que a UI informa ao zerar o ARCADE. `{ chefe }` e o formato novo: QUEM caiu (o id vem da etapa da campanha, gravado no
 * comeco do ARCADE; `null` = nao houve luta de chefe). `{ derrotouChefe }` e o formato ANTIGO: vale sempre a regra de antes
 * (chefe fixo = `regras.chefe`, a zerada libera o proximo da fila), qualquer que seja `chefesDaFila`.
 */
export type VitoriaArcade = { chefe: IdLutador | null } | { derrotouChefe: boolean };

/** Uma luta da escada do Arcade. */
export type Etapa = { id: IdLutador; chefe: boolean };

/** Resultado de zerar o Arcade: o novo progresso (a entrada nao e mutada) e quem acabou de ser liberado. */
export type ResultadoVitoria = { prog: Progresso; novos: IdLutador[] };
