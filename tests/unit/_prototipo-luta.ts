/* Executa no Node a lógica de luta REAL do protótipo (Fighter, cpuInput, Game: linhas 619-1255) como gabarito.
 * Só entra o que é lógica pura: AudioSys vira um gravador, Math.random vira o RNG com semente, e os
 * efeitos visuais (faíscas, poeira, rajadas, textos) viram no-op — no porte eles saem da lógica e
 * viajam como eventos, por isso não podem consumir o mesmo RNG que a CPU. */
import { criarRng } from '../../src/core/rng';
import { posedataOriginal, trecho, type Obj } from './_prototipo';

export type ChamadaGravada = [metodo: string, ...args: unknown[]];

export type Gabarito = {
  game: Obj;
  CHARS: Obj;
  /** Chamadas ao AudioSys desde a última leitura (esvazia ao ler). */
  sons: () => ChamadaGravada[];
  /** Entradas dos dois jogadores no tick (o que readInput devolve). */
  entradas: { p1: Obj; p2: Obj };
};

export function criarGabarito(semente: number, ajustes = { rounds: 2, time: 99, shake: true, music: 0.45, sfx: 0.8, diff: 1 }): Gabarito {
  const rng = criarRng(semente);
  const M = Object.create(Math) as Obj;
  M['random'] = (): number => rng.proximo();
  const gravados: ChamadaGravada[] = [];
  const AudioSys = new Proxy({}, { get: (_o, nome: string) => (...a: unknown[]) => void gravados.push([nome, ...a]) });
  const entradas = { p1: {} as Obj, p2: {} as Obj };
  const env = {
    Math: M,
    AudioSys,
    SETTINGS: ajustes,
    W: 960,
    H: 540,
    GROUND: 470,
    SH: 265,
    GRAVITY: 0.85,
    WALK_SPEED: 3.6,
    JUMP_FORCE: -16.5,
    MAX_HP: 100,
    MAX_EN: 100,
    SPECIAL_COST: 40,
    clamp: (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)),
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    rand: () => 0,
    overlap: (a: Obj, b: Obj) => a['x'] < b['x'] + b['w'] && a['x'] + a['w'] > b['x'] && a['y'] < b['y'] + b['h'] && a['y'] + a['h'] > b['y'],
    CTRL_P1: 'p1',
    CTRL_P2: 'p2',
    readInput: (m: string) => ({ ...entradas[m as 'p1' | 'p2'] }),
    readInputMerged: () => ({ ...entradas.p1 }),
    setTimeout: (fn: () => void) => fn(),
    drawSwing: () => undefined,
    IMG: {},
  };
  const corpo =
    trecho('const SH_IDLE = 255', 'function drawPose') +
    '\n' +
    trecho('const BASE_MOVES = {', '// ===================== 5. LUTADOR') +
    '\n' +
    trecho('const ATK_KEYS', '// ===================== 7. INTERFACE') +
    '\nsetupChars();\n' +
    'Game.prototype.sparks = Game.prototype.burst = Game.prototype.dust = Game.prototype.floatText = function () {};\n' +
    'return { Game, CHARS };';
  const nomes = Object.keys(env);
  const fabrica = new Function('POSEDATA', 'ROSTER', ...nomes, corpo) as (...a: unknown[]) => { Game: new () => Obj; CHARS: Obj };
  const { Game, CHARS } = fabrica(posedataOriginal(), ['f1', 'f2', 'f3', 'f4'], ...nomes.map((n) => (env as Obj)[n]));
  const game = new Game();
  return {
    game,
    CHARS,
    entradas,
    sons: () => gravados.splice(0, gravados.length),
  };
}
