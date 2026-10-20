import { ALTURA, LARGURA } from '../core/constantes';

export interface PontoLogico {
  readonly x: number;
  readonly y: number;
}

export interface CaixaCss {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Converte coordenadas da janela (clientX/Y) para o espaço lógico 960x540 do canvas. */
export function posicaoLogica(caixa: CaixaCss, clientX: number, clientY: number): PontoLogico {
  return {
    x: ((clientX - caixa.left) / caixa.width) * LARGURA,
    y: ((clientY - caixa.top) / caixa.height) * ALTURA,
  };
}

export interface CallbacksMouse {
  aoMover?: (x: number, y: number) => void;
  aoPressionar?: (x: number, y: number) => void;
}

/** Mouse sobre o canvas (hover e clique de menus). Devolve a função que desfaz a ligação. */
export function ligarMouse(canvas: HTMLCanvasElement, cb: CallbacksMouse): () => void {
  const ponto = (e: MouseEvent): PontoLogico => posicaoLogica(canvas.getBoundingClientRect(), e.clientX, e.clientY);
  const mover = (e: MouseEvent): void => {
    const p = ponto(e);
    cb.aoMover?.(p.x, p.y);
  };
  const baixo = (e: MouseEvent): void => {
    canvas.focus();
    const p = ponto(e);
    cb.aoPressionar?.(p.x, p.y);
  };
  const menu = (e: Event): void => e.preventDefault();
  canvas.addEventListener('mousemove', mover);
  canvas.addEventListener('mousedown', baixo);
  canvas.addEventListener('contextmenu', menu);
  return () => {
    canvas.removeEventListener('mousemove', mover);
    canvas.removeEventListener('mousedown', baixo);
    canvas.removeEventListener('contextmenu', menu);
  };
}
