import type { IdLutador } from '../core/contratos';
import type { ConfigPartida } from '../fight/game';
import type { Etapa } from '../meta';

/** Ação de navegação de menu (NAV do protótipo). */
export type AcaoNav = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back';

/** Tecla (formato de input/teclas.ts: letras minúsculas, "ArrowUp", "Enter", " "...) -> ação. */
export const NAV: Readonly<Record<string, AcaoNav>> = {
  ArrowUp: 'up', w: 'up',
  ArrowDown: 'down', s: 'down',
  ArrowLeft: 'left', a: 'left',
  ArrowRight: 'right', d: 'right',
  Enter: 'ok', ' ': 'ok', z: 'ok', c: 'ok', j: 'ok',
  Escape: 'back', x: 'back', v: 'back', k: 'back', Backspace: 'back',
};

export type NomeCena =
  | 'boot' | 'intro' | 'trailer' | 'title' | 'menu' | 'select' | 'diff' | 'vs' | 'fight'
  | 'how' | 'options' | 'result' | 'continue' | 'ending' | 'chefe' | 'desbloqueio';

export type ModoMenu = 'arcade' | 'versus' | 'cpu' | 'training';

/**
 * Configuração de partida + marca de luta de chefe. `chefe` ainda não existe em `ConfigPartida` (a Vega o entrega na
 * E3, plano 2.3): hoje a luta ignora o campo e a UI o usa só para o aviso, o VS e o HUD do chefão.
 */
export type ConfigPartidaUI = ConfigPartida & { chefe?: boolean };

/** Estado da campanha ARCADE (UI.run do protótipo): a escada de etapas vem de `montarEscada` (src/meta). */
export type CampanhaArcade = {
  c1: IdLutador;
  etapas: Etapa[];
  idx: number;
  score: number;
  continues: number;
  diff: number;
  cont: number;
  /** A ENTRADA DRAMÁTICA do chefão já foi mostrada nesta campanha? Depois de um continue ela é curta (spec do ZENON §3.2). */
  entradaDoChefeVista?: boolean;
};

/** Argumentos de entrada das cenas (o que `UI.go(nome, args)` leva). */
export type ArgsSelect = { mode: ModoMenu };
export type ArgsDiff = { mode: 'arcade' | 'cpu'; c1: IdLutador; c2: IdLutador };
export type ArgsVs = { cfg: ConfigPartidaUI; run?: CampanhaArcade };
export type ArgsFight = ArgsVs;
export type ArgsResult = {
  a: ArgsFight;
  winner: 1 | 2;
  st: { r1: number; r2: number; c1: number; c2: number; s1: number; s2: number };
};
export type ArgsContinue = { run: CampanhaArcade; a: ArgsFight };
export type ArgsEnding = { run: CampanhaArcade };
export type ArgsAvisoChefe = { cfg: ConfigPartidaUI; run: CampanhaArcade };
export type ArgsDesbloqueio = { novos: readonly IdLutador[]; indice?: number };
export type ArgsTitle = { fromIntro?: boolean; fromTrailer?: boolean } | undefined;
/** O trailer de abertura: `boot` = depois do gesto do boot; `atrair` = o título parado por 30 s. */
export type ArgsTrailer = { origem: 'boot' | 'atrair' };
export type ArgsComo = { from: string };

/** Uma cena do jogo: o que o protótipo punha em SCENES[nome]. */
export interface Cena {
  enter?(args: never): void;
  /** Chamado por `Navegador.set` quando a cena é trocada por outra (soltar o que a cena segurou: arte, música, classes do `body`). */
  exit?(): void;
  update?(): void;
  draw(): void;
  /** Devolve true se tratou a tecla (então o `nav` genérico não roda). */
  key?(tecla: string): boolean;
  nav?(acao: AcaoNav): void;
  hover?(x: number, y: number): void;
  click?(x: number, y: number): void;
  /** Janela perdeu o foco / aba oculta (a luta pausa). */
  blur?(): void;
  /** Só a cena de luta: está pausada? (o mouse só age na pausa) */
  readonly paused?: boolean;
  /** Só a cena de luta: aceita clique/toque agora, mesmo sem pausa? (a provocação pula por toque) */
  aceitaToqueNaLuta?(): boolean;
}
