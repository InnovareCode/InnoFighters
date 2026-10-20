import type { IdLutador } from '../core/contratos';
import type { ConfigPartida } from '../fight/game';

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
  | 'boot' | 'intro' | 'title' | 'menu' | 'select' | 'diff' | 'vs' | 'fight'
  | 'how' | 'options' | 'result' | 'continue' | 'ending';

export type ModoMenu = 'arcade' | 'versus' | 'cpu' | 'training';

/** Estado da campanha ARCADE (UI.run do protótipo). */
export type CampanhaArcade = {
  c1: IdLutador;
  order: IdLutador[];
  idx: number;
  score: number;
  continues: number;
  diff: number;
  cont: number;
};

/** Argumentos de entrada das cenas (o que `UI.go(nome, args)` leva). */
export type ArgsSelect = { mode: ModoMenu };
export type ArgsDiff = { mode: 'arcade' | 'cpu'; c1: IdLutador; c2: IdLutador };
export type ArgsVs = { cfg: ConfigPartida; run?: CampanhaArcade };
export type ArgsFight = ArgsVs;
export type ArgsResult = {
  a: ArgsFight;
  winner: 1 | 2;
  st: { r1: number; r2: number; c1: number; c2: number; s1: number; s2: number };
};
export type ArgsContinue = { run: CampanhaArcade; a: ArgsFight };
export type ArgsEnding = { run: CampanhaArcade };
export type ArgsTitle = { fromIntro?: boolean } | undefined;
export type ArgsComo = { from: string };

/** Uma cena do jogo: o que o protótipo punha em SCENES[nome]. */
export interface Cena {
  enter?(args: never): void;
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
}
