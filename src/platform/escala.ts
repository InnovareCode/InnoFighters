import { ALTURA, LARGURA } from '../core/constantes';

export interface TamanhoCss {
  readonly largura: number;
  readonly altura: number;
}

/** Maior retangulo LARGURA:ALTURA que cabe na janela (letterbox), sem distorcer. */
export function calcularTamanhoCss(janelaLargura: number, janelaAltura: number): TamanhoCss {
  if (janelaLargura <= 0 || janelaAltura <= 0) return { largura: 0, altura: 0 };
  const fator = Math.min(janelaLargura / LARGURA, janelaAltura / ALTURA);
  return { largura: Math.floor(LARGURA * fator), altura: Math.floor(ALTURA * fator) };
}

export function ajustarEscala(canvas: HTMLCanvasElement): void {
  const { largura, altura } = calcularTamanhoCss(window.innerWidth, window.innerHeight);
  canvas.style.width = `${largura}px`;
  canvas.style.height = `${altura}px`;
}
