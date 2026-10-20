import type { InputFrame } from '../core/contratos';
import { Gamepads, type ObterPads } from './gamepad';
import { ligarMouse } from './mouse';
import { ligarTeclado } from './teclado';
import { TeclasVirtuais } from './teclas';
import { ligarToque } from './toque';

export interface OpcoesEntrada {
  readonly alvo: Window;
  readonly canvas: HTMLCanvasElement;
  /** Descida de qualquer tecla virtual (teclado, controle ou toque): menus e atalhos. */
  readonly aoTecla: (tecla: string) => void;
  readonly aoMouseMover?: (x: number, y: number) => void;
  readonly aoMouseBaixo?: (x: number, y: number) => void;
  readonly aoToqueCanvas?: (x: number, y: number) => void;
  /** Só para teste: substitui `navigator.getGamepads`. */
  readonly obterPads?: ObterPads;
}

export interface Entrada {
  readonly teclas: TeclasVirtuais;
  /** Se a camada de toque foi ligada (aparelho com tela de toque). */
  readonly temToque: boolean;
  lerP1(): InputFrame;
  lerP2(): InputFrame;
  lerMesclado(): InputFrame;
  /** Chamar uma vez por quadro de desenho, antes dos ticks de lógica. */
  consultarGamepads(): void;
  /** Chamar depois de cada tick de lógica: zera as bordas de descida (lp, hp, lk, hk, sp). */
  fimDoTick(): void;
  soltarTudo(): void;
  destruir(): void;
}

/** Junta teclado, gamepad, toque e mouse atrás de uma interface só. A luta só vê InputFrame (C2). */
export function criarEntrada(op: OpcoesEntrada): Entrada {
  const teclas = new TeclasVirtuais();
  const pads = op.obterPads ? new Gamepads(teclas, op.aoTecla, op.obterPads) : new Gamepads(teclas, op.aoTecla);

  const desfazer: Array<() => void> = [];
  desfazer.push(ligarTeclado(op.alvo, teclas, op.aoTecla));
  desfazer.push(
    ligarMouse(op.canvas, {
      ...(op.aoMouseMover ? { aoMover: op.aoMouseMover } : {}),
      ...(op.aoMouseBaixo ? { aoPressionar: op.aoMouseBaixo } : {}),
    }),
  );
  const toque = ligarToque({
    alvo: op.alvo,
    teclas,
    canvas: op.canvas,
    aoTecla: op.aoTecla,
    ...(op.aoToqueCanvas ? { aoToqueCanvas: op.aoToqueCanvas } : {}),
  });
  if (toque) desfazer.push(toque);

  return {
    teclas,
    temToque: toque !== null,
    lerP1: () => teclas.lerP1(),
    lerP2: () => teclas.lerP2(),
    lerMesclado: () => teclas.lerMesclado(),
    consultarGamepads: () => pads.consultar(),
    fimDoTick: () => teclas.fimDoTick(),
    soltarTudo: () => teclas.soltarTodas(),
    destruir: () => desfazer.forEach((f) => f()),
  };
}
