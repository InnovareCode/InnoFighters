import type { Configuracoes, FluidezMotor, IdLutador, MotorV2 } from '../core/contratos';

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
   * Revisão do motor de luta v2 (docs/spec-revisao-motor-luta-v2.md §2), flag por mecânica. AUSENTE = o motor de antes, bit a bit (é o que os testes de
   * fidelidade ao protótipo e o oráculo CPU x CPU fixam). V2-6: `REGRAS_PADRAO` traz as três LIGADAS (`MOTOR_V2_PADRAO`), também em `?expansao=4`; o
   * kill switch é `?motorv2=0` (`regrasComMotorV2`). Vai à `ConfigPartida` das lutas montadas pela UI (`cfgMotorV2`) e à do trailer (`criarPartida`).
   */
  readonly motorV2?: MotorV2;
  /**
   * Redesenho de ritmo (docs/spec-redesenho-jogabilidade.md §4), flag por mecânica. AUSENTE ou `{}` = o jogo de hoje, bit a bit (é o
   * que os testes de fidelidade e os hashes do balanço fixam). `tarja`/`provocacao` são da Lyra (R-1/R-2, só UI); as demais (`intervalos`,
   * `filmeRestrito`, `super`, `cadeia`, `cpu`, `impacto`) são do motor (Vega, onda 2) e ainda não têm efeito. Kill switch/A-B: `?ritmo=`
   * (`ritmoDaUrl`), como `?motorv2=`. Cada onda vai para produção DESLIGADA: só o dono vira o padrão depois de jogar com `?ritmo=1`.
   */
  readonly ritmo?: Ritmo;
  /**
   * Fluidez do motor (docs/auditoria-fidelidade-motor-2026-10-24.md §4.2): as esperas escondidas (par do super, dash, fila de botões, agarrão por par, dados do BAATAR),
   * cada uma atrás da sua flag. AUSENTE ou `{}` = o motor de antes, bit a bit. `REGRAS_PADRAO` traz as flags LIGADAS (`FLUIDEZ_PADRAO`); o kill switch é `?fluidez=0`
   * (`regrasComFluidez`). Vai à `ConfigPartida` pelo mesmo `cfgMotorV2` das lutas montadas pela UI.
   */
  readonly fluidez?: FluidezMotor;
};

/**
 * As flags do redesenho de ritmo (docs/spec-redesenho-jogabilidade.md §4). Todas booleanas; ausente = desligada. SEM `readonly`
 * nos campos (como `MotorV2`): `ritmoDaUrl` monta o objeto campo a campo; a imutabilidade de fora (`Regras.ritmo`) já é `readonly`.
 */
export type Ritmo = {
  /** R-2: a tarja do especial comum para de congelar a luta (faixa no alto, 40/24 ticks, enquanto o motor anda). */
  tarja?: boolean;
  /** R-2: a provocação CURTA do round 1 some por cima da contagem (o motor anda); a COMPLETA (1º confronto do ARCADE/chefão) não muda. */
  provocacao?: boolean;
  /** R-6 (Vega): intervalos de KO/roundend/intro/matchend mais curtos. */
  intervalos?: boolean;
  /** R-6 (Vega): o filme só no super e no especial que dá KO. */
  filmeRestrito?: boolean;
  /** R-7 (Vega): o golpe super (barra cheia). */
  super?: boolean;
  /** R-8 (Vega): cadeia de combo por força, até 4 golpes. */
  cadeia?: boolean;
  /** R-10 (Vega): CPU que confirma, varia e pune. */
  cpu?: boolean;
  /** R-17 (opcional, Vega+Lyra): hitstop por força, faísca e empurrão. */
  impacto?: boolean;
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
