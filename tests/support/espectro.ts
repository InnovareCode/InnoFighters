/*
 * Medidas de mixagem de um laço renderizado (spec dos temas §3.5): RMS e energia por faixa de frequência (Welch, Hann). Só para teste.
 */
import { TAXA } from './descritores';

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] as number, re[i] as number];
      [im[i], im[j]] = [im[j] as number, im[i] as number];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = (re[b] as number) * cr - (im[b] as number) * ci;
        const ti = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - tr;
        im[b] = (im[a] as number) - ti;
        re[a] = (re[a] as number) + tr;
        im[a] = (im[a] as number) + ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const QUADRO = 2048;

export interface MixagemDoLaco {
  readonly rmsDb: number;
  readonly pico: number;
  /** Energia (dB, escala arbitrária comum a todos os laços) nas faixas abaixo de 120 Hz e de 300 a 3000 Hz. */
  readonly graveDb: number;
  readonly vozDb: number;
  /** Energia em dB nas faixas intermediárias (informativo para compor): 120-300 Hz e acima de 3000 Hz. */
  readonly baixoMedioDb: number;
  readonly agudoDb: number;
}

export function medirMixagem(x: Float32Array): MixagemDoLaco {
  let soma = 0;
  let pico = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] as number;
    soma += v * v;
    pico = Math.max(pico, Math.abs(v));
  }
  const rmsDb = 10 * Math.log10(soma / x.length + 1e-20);
  const re = new Float64Array(QUADRO);
  const im = new Float64Array(QUADRO);
  const psd = new Float64Array(QUADRO / 2 + 1);
  const hann = Float64Array.from({ length: QUADRO }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (QUADRO - 1)));
  let quadros = 0;
  for (let ini = 0; ini + QUADRO <= x.length; ini += QUADRO / 2) {
    quadros++;
    for (let i = 0; i < QUADRO; i++) {
      re[i] = (x[ini + i] as number) * (hann[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= QUADRO / 2; k++) psd[k] = (psd[k] as number) + (re[k] as number) ** 2 + (im[k] as number) ** 2;
  }
  const bin = TAXA / QUADRO;
  const faixa = (f0: number, f1: number): number => {
    let e = 0;
    for (let k = Math.ceil(f0 / bin); k <= Math.floor(f1 / bin); k++) e += psd[k] as number;
    return 10 * Math.log10(e / Math.max(1, quadros) + 1e-20); // média por quadro (Welch): laços de durações diferentes ficam comparáveis
  };
  return { rmsDb, pico, graveDb: faixa(20, 120), vozDb: faixa(300, 3000), baixoMedioDb: faixa(120, 300), agudoDb: faixa(3000, TAXA / 2) };
}
