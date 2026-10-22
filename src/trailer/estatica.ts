import { alfaDoTitulo } from '../data/trailer/curvas';
import { TEXTOS } from '../data/trailer/textos';
import type { QuadroEstatico, RoteiroDoTrailer } from '../data/trailer/tipos';
import type { TituloVisivel } from './diretor';

/*
 * A versão ESTÁTICA do trailer (movimento reduzido, spec §6.3): quadros parados que trocam por dissolução, no máximo 10 s. PURA, como o diretor: função do tick.
 * Zero aproximação, tremor, câmera lenta, flash, onda de choque ou faísca; o letterbox já entra fechado; só arte residente (a vitrine e os retratos).
 */

export interface QuadroEstaticoNoTick {
  readonly tick: number;
  readonly indice: number;
  readonly quadro: QuadroEstatico;
  /** O quadro seguinte enquanto dissolve (null fora da dissolução e no último quadro). */
  readonly proximo: QuadroEstatico | null;
  /** 0..1: quanto do quadro seguinte já apareceu. */
  readonly dissolucao: number;
  readonly titulos: readonly TituloVisivel[];
  /** Sempre 1, sempre 0 e zoom 1: nada se mexe. */
  readonly letterbox: 1;
  readonly flash: 0;
  readonly zoom: { readonly fator: 1; readonly x: number };
  /** O último quadro: a logo parada e o prompt "PRESSIONE ENTER / TOQUE PARA JOGAR". */
  readonly prompt: boolean;
  readonly fim: boolean;
}

export const duracaoDaEstatica = (r: RoteiroDoTrailer): number => r.estatica.quadros.length * r.estatica.ticksPorQuadro;

export function quadroEstaticoNoTick(r: RoteiroDoTrailer, tick: number): QuadroEstaticoNoTick {
  const e = r.estatica;
  const total = duracaoDaEstatica(r);
  const t = Math.min(Math.max(0, Math.floor(tick)), total - 1);
  const indice = Math.floor(t / e.ticksPorQuadro);
  const tau = t - indice * e.ticksPorQuadro;
  const quadro = e.quadros[indice] as QuadroEstatico;
  const ultimo = indice === e.quadros.length - 1;
  const dissolvendo = !ultimo && tau >= e.ticksPorQuadro - e.dissolucao;
  const titulos: TituloVisivel[] = [];
  if (quadro.titulo !== undefined) {
    const alfa = alfaDoTitulo(tau, 6, e.ticksPorQuadro - 6);
    if (alfa > 0) titulos.push({ estilo: 'cartao', texto: TEXTOS[quadro.titulo], alfa });
  }
  return {
    tick: t,
    indice,
    quadro,
    proximo: dissolvendo ? (e.quadros[indice + 1] as QuadroEstatico) : null,
    dissolucao: dissolvendo ? (tau - (e.ticksPorQuadro - e.dissolucao) + 1) / e.dissolucao : 0,
    titulos,
    letterbox: 1,
    flash: 0,
    zoom: { fator: 1, x: 480 },
    prompt: ultimo && tau >= 24,
    fim: tick >= total - 1,
  };
}
