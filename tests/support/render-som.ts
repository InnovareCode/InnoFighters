/*
 * Renderiza o AudioSys REAL (src/audio) sobre o mini motor offline e devolve amostras. Só para teste.
 * Cada chamada cria um AudioSys novo com a mesma semente de ruído: o mesmo som sempre rende as mesmas amostras.
 */
import { AudioSys, type DependenciasAudio } from '../../src/audio/audio-sys';
import { criarRng } from '../../src/core/rng';
import { Contexto, comoAudioContext } from './audio-offline';
import { TAXA, descrever, type Descritores } from './descritores';

export interface Rendido {
  readonly amostras: Float32Array;
  readonly ctx: Contexto;
  readonly audio: AudioSys;
}

export function renderizar(tocar: (a: AudioSys) => void, extra: Partial<DependenciasAudio> = {}, segundos?: number): Rendido {
  const ctx = new Contexto(TAXA);
  const audio = new AudioSys({ criarContexto: () => comoAudioContext(ctx), rng: criarRng(5), ...extra });
  audio.init();
  tocar(audio);
  return { amostras: ctx.renderizar(segundos), ctx, audio };
}

export const descreverSom = (tocar: (a: AudioSys) => void, extra: Partial<DependenciasAudio> = {}): Descritores => descrever(renderizar(tocar, extra).amostras);
