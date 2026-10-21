/**
 * Mapeamentos de controle (porte de CTRL_P1, CTRL_P2 e PAD_MAP do protótipo).
 * Todo dispositivo vira "tecla virtual" do jogador correspondente.
 */

/** Ações de um jogador, na mesma ordem das chaves de InputFrame (C2). */
export type Acao = 'left' | 'right' | 'up' | 'down' | 'lp' | 'hp' | 'lk' | 'hk' | 'sp' | 'esq';

/** Ação -> nome da tecla (formato de `normalizarTecla`). */
export type MapaTeclas = Readonly<Record<Acao, string>>;

export const CTRL_P1: MapaTeclas = Object.freeze({
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  lp: 'z',
  hp: 'x',
  lk: 'c',
  hk: 'v',
  sp: 'b',
  esq: 'n',
});

export const CTRL_P2: MapaTeclas = Object.freeze({
  left: 'a',
  right: 'd',
  up: 'w',
  down: 's',
  lp: 'j',
  hp: 'k',
  lk: 'u',
  hk: 'i',
  sp: 'l',
  esq: 'o',
});

/** Botões físicos do gamepad que o jogo usa. */
export type BotaoPad = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'r1' | 'r2' | 'l1' | 'l2' | 'start';

export type MapaPad = Readonly<Record<BotaoPad, string>>;

/** O controle 0 age como jogador 1, o controle 1 como jogador 2. */
export const PAD_MAP: readonly [MapaPad, MapaPad] = Object.freeze([
  Object.freeze({
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    a: 'c',
    b: 'v',
    x: 'z',
    y: 'x',
    r1: 'b',
    r2: 'b',
    l1: 'n',
    l2: 'n',
    start: 'Escape',
  }),
  Object.freeze({
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd',
    a: 'u',
    b: 'i',
    x: 'j',
    y: 'k',
    r1: 'l',
    r2: 'l',
    l1: 'o',
    l2: 'o',
    start: 'Escape',
  }),
]);

/** Teclas cujo comportamento padrão do navegador (rolagem etc.) é suprimido. */
export const TECLAS_SEM_PADRAO: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Backspace'];
