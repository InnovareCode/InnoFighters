/*
 * Descritores e distância S(a, b) da régua de sons (spec-sons-por-lutador §7.1). Só para teste.
 *
 *   T timbre    média dos MFCC c1..c12 (40 bandas mel, 80-8000 Hz), sem c0           escala `eT` (calibrada na S0)
 *   C brilho    log2 do centroide espectral em 5 pontos da região ativa              1/3 de oitava
 *   E envelope  RMS em dB em 8 pontos (normalizado pelo pico do próprio som)        6 dB
 *               + log2 da duração da região ativa                                    meia oitava
 *   P contorno  tom por soma de subharmônicos em 5 pontos, em semitons relativos à média   2 st
 *               do PRÓPRIO som (só a forma)
 *   M tom médio absoluto: INFORMATIVO, fora da distância de propósito (dois sons iguais em tons diferentes são o defeito de hoje)
 *
 * Quadros de 1024 amostras, salto de 256, janela de Hann, só os quadros dentro de 40 dB do pico. Taxa de 22 050 Hz.
 *
 * Decisões que a spec deixou em aberto (valem para sempre depois do congelamento):
 *  - o envelope é normalizado pelo pico do som: a régua mede a FORMA do volume; o volume em si tem teste próprio (§6.3);
 *  - som sem tom (só ruído) tem contorno zero e `vozeado = false`; dP só conta quando OS DOIS sons são vozeados (a diferença entre
 *    vozeado e não vozeado já aparece em T, C e E; uma penalidade fixa dependia de um limiar de vozeamento frágil).
 */

export const TAXA = 22050;
const QUADRO = 1024;
const SALTO = 256;
const BANDAS = 40;
const MFCC_N = 12;
const FMIN = 80;
const FMAX = 8000;
const PISO_DB = -40;
export const PERIODICIDADE_MIN = 0.45;

export interface Descritores {
  readonly T: readonly number[];
  readonly C: readonly number[];
  readonly E: readonly number[];
  readonly durLog2: number;
  readonly P: readonly number[];
  readonly vozeado: boolean;
  /** Tom médio em Hz (0 se não vozeado). Informativo. */
  readonly M: number;
  readonly duracaoAtiva: number;
  readonly rmsAtivoDb: number;
  readonly picoAbs: number;
}

export interface Escalas {
  readonly eT: number;
  readonly eC: number;
  readonly eE: number;
  readonly eD: number;
  readonly eP: number;
}

// --- FFT radix-2 ---
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

const hz2mel = (f: number): number => 2595 * Math.log10(1 + f / 700);
const mel2hz = (m: number): number => 700 * (Math.pow(10, m / 2595) - 1);

function bancoMel(): { ini: number; pesos: number[] }[] {
  const mMin = hz2mel(FMIN);
  const mMax = hz2mel(FMAX);
  const pontos: number[] = [];
  for (let i = 0; i < BANDAS + 2; i++) pontos.push(mel2hz(mMin + ((mMax - mMin) * i) / (BANDAS + 1)));
  const binHz = TAXA / QUADRO;
  const banco: { ini: number; pesos: number[] }[] = [];
  for (let b = 0; b < BANDAS; b++) {
    const [f0, f1, f2] = [pontos[b] as number, pontos[b + 1] as number, pontos[b + 2] as number];
    const k0 = Math.floor(f0 / binHz);
    const k2 = Math.ceil(f2 / binHz);
    const pesos: number[] = [];
    for (let k = k0; k <= k2; k++) {
      const f = k * binHz;
      pesos.push(f <= f1 ? Math.max(0, (f - f0) / (f1 - f0)) : Math.max(0, (f2 - f) / (f2 - f1)));
    }
    banco.push({ ini: k0, pesos });
  }
  return banco;
}
const BANCO = bancoMel();
const HANN = Float64Array.from({ length: QUADRO }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (QUADRO - 1)));
const DCT = Array.from({ length: MFCC_N }, (_, c) => Array.from({ length: BANDAS }, (_, b) => Math.cos((Math.PI * (c + 1) * (b + 0.5)) / BANDAS)));

const FFT_TOM = 4096;

/**
 * Tom por soma de subharmônicos (SHS) sobre o espectro de magnitude comprimido (raiz): robusto a formantes fixos, que enganam a
 * autocorrelação (um formante estreito em 500 Hz parece um tom de 500 Hz). Devolve { f0 (0 = sem tom), saliencia }.
 */
export function tomDoQuadro(x: Float64Array): { f0: number; sal: number } {
  const re = new Float64Array(FFT_TOM);
  const im = new Float64Array(FFT_TOM);
  for (let i = 0; i < x.length; i++) re[i] = (x[i] as number) * (HANN[i] as number);
  fft(re, im);
  const binHz = TAXA / FFT_TOM;
  const mag = new Float64Array(FFT_TOM / 2);
  let total = 0;
  const kMax = Math.floor(4000 / binHz);
  for (let k = 0; k < kMax; k++) {
    mag[k] = Math.sqrt(Math.hypot(re[k] as number, im[k] as number));
    total += mag[k] as number;
  }
  if (total < 1e-9) return { f0: 0, sal: 0 };
  const interp = (f: number): number => {
    const p = f / binHz;
    const k = Math.floor(p);
    if (k + 1 >= kMax) return 0;
    const fr = p - k;
    return (mag[k] as number) * (1 - fr) + (mag[k + 1] as number) * fr;
  };
  // máximo global do pente de harmônicos (pesos decrescentes: o f0 verdadeiro pesa mais que a sua metade). A versão da S0 preferia a subharmônica
  // mais baixa e rastreava 40-120 Hz para uma voz de 175 Hz: o P era ruído. Corrigido ANTES de qualquer som novo ser medido (ver o handoff).
  const H = 5;
  let melhor = 0;
  let escolhido = 0;
  const cand: { f: number; s: number }[] = [];
  for (let f = 70; f <= 650; f *= 1.01) {
    let s = 0;
    for (let h = 1; h <= H; h++) s += interp(h * f) * Math.pow(0.85, h - 1);
    cand.push({ f, s });
    if (s > melhor) {
      melhor = s;
      escolhido = f;
    }
  }
  const media = cand.reduce((a, c) => a + c.s, 0) / cand.length;
  return { f0: escolhido, sal: melhor / (media + 1e-12) };
}

/** Periodicidade: maior pico da autocorrelação normalizada depois do primeiro cruzamento por zero (0 = ruído, 1 = periódico). */
function periodicidade(x: Float64Array): number {
  let e0 = 0;
  for (let i = 0; i < x.length; i++) e0 += (x[i] as number) ** 2;
  if (e0 < 1e-14) return 0;
  const lagMin = Math.floor(TAXA / 650);
  const lagMax = Math.floor(TAXA / 55);
  let cruzou = false;
  let melhor = 0;
  for (let lag = 1; lag <= lagMax; lag++) {
    let soma = 0;
    for (let i = 0; i + lag < x.length; i++) soma += (x[i] as number) * (x[i + lag] as number);
    const r = soma / e0;
    if (r < 0) cruzou = true;
    if (cruzou && lag >= lagMin) melhor = Math.max(melhor, r);
  }
  return melhor;
}

/** Divide a lista em `n` trechos contíguos e devolve a média de cada um (suaviza a oscilação quadro a quadro dos harmônicos). */
function mediasPorTrecho(v: readonly number[], n: number): number[] {
  const saida: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * v.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * v.length) / n));
    const fatia = v.slice(a, Math.min(b, v.length));
    const lista = fatia.length ? fatia : [v[Math.min(a, v.length - 1)] as number];
    saida.push(lista.reduce((x, y) => x + y, 0) / lista.length);
  }
  return saida;
}

function amostrar<T>(v: readonly T[], n: number): T[] {
  const saida: T[] = [];
  for (let i = 0; i < n; i++) saida.push(v[Math.min(v.length - 1, Math.round((i * (v.length - 1)) / Math.max(1, n - 1)))] as T);
  return saida;
}

export function descrever(amostras: Float32Array): Descritores {
  const n = amostras.length;
  let picoAbs = 0;
  for (let i = 0; i < n; i++) picoAbs = Math.max(picoAbs, Math.abs(amostras[i] as number));
  const quadros = Math.max(1, Math.floor((n - QUADRO) / SALTO) + 1);
  const bloco = new Float64Array(QUADRO);
  const re = new Float64Array(QUADRO);
  const im = new Float64Array(QUADRO);
  const mfcc: number[][] = [];
  const centroide: number[] = [];
  const dbDosQuadros: number[] = [];
  for (let q = 0; q < quadros; q++) {
    let e = 0;
    for (let i = 0; i < QUADRO; i++) {
      const v = (amostras[q * SALTO + i] ?? 0) as number;
      bloco[i] = v;
      e += v * v;
    }
    dbDosQuadros.push(10 * Math.log10(e / QUADRO + 1e-20));
  }
  const pico = Math.max(...dbDosQuadros);
  const ativos: number[] = [];
  for (let q = 0; q < quadros; q++) if ((dbDosQuadros[q] as number) >= pico + PISO_DB) ativos.push(q);
  for (const q of ativos) {
    for (let i = 0; i < QUADRO; i++) {
      const v = (amostras[q * SALTO + i] ?? 0) as number;
      bloco[i] = v;
      re[i] = v * (HANN[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    const pot = new Float64Array(QUADRO / 2 + 1);
    for (let k = 0; k <= QUADRO / 2; k++) pot[k] = (re[k] as number) ** 2 + (im[k] as number) ** 2;
    const logMel: number[] = [];
    for (const { ini, pesos } of BANCO) {
      let s = 0;
      for (let j = 0; j < pesos.length; j++) s += (pesos[j] as number) * (pot[ini + j] ?? 0);
      logMel.push(Math.log(s + 1e-10));
    }
    mfcc.push(DCT.map((linha) => linha.reduce((a, c, b) => a + c * (logMel[b] as number), 0) / BANDAS));
    let num = 0;
    let den = 0;
    const binHz = TAXA / QUADRO;
    for (let k = Math.ceil(FMIN / binHz); k <= Math.floor(FMAX / binHz); k++) {
      num += k * binHz * (pot[k] as number);
      den += pot[k] as number;
    }
    centroide.push(Math.log2(Math.max(den > 0 ? num / den : FMIN, FMIN)));
  }
  const T = Array.from({ length: MFCC_N }, (_, c) => mfcc.reduce((a, m) => a + (m[c] as number), 0) / Math.max(1, mfcc.length));
  const C = mediasPorTrecho(centroide.length ? centroide : [Math.log2(FMIN)], 5);
  const dbAtivos = ativos.map((q) => (dbDosQuadros[q] as number) - pico);
  const E = mediasPorTrecho(dbAtivos.length ? dbAtivos : [0], 8);
  const duracaoAtiva = Math.max((ativos.length * SALTO + QUADRO - SALTO) / TAXA, SALTO / TAXA);
  // tom: só nos 5 quadros amostrados da região ativa; vale se a saliência do pente de harmônicos passa de SALIENCIA_MIN
  const pontosTom = amostrar(ativos.length ? ativos : [0], 5).map((q) => {
    for (let i = 0; i < QUADRO; i++) bloco[i] = (amostras[q * SALTO + i] ?? 0) as number;
    const t = tomDoQuadro(bloco);
    return periodicidade(bloco) >= PERIODICIDADE_MIN ? t.f0 : 0;
  });
  const vozeadosN = pontosTom.filter((f) => f > 0).length;
  const vozeado = vozeadosN >= 3;
  let M = 0;
  let P: number[] = [0, 0, 0, 0, 0];
  if (vozeado) {
    const logs = pontosTom.map((f) => (f > 0 ? 12 * Math.log2(f) : NaN));
    const validos = logs.filter((v) => !Number.isNaN(v));
    const media = validos.reduce((a, v) => a + v, 0) / validos.length;
    M = 440 * Math.pow(2, (media - 12 * Math.log2(440)) / 12);
    P = logs.map((v) => (Number.isNaN(v) ? 0 : v - media));
  }
  // RMS da região ativa
  let soma = 0;
  let cnt = 0;
  for (const q of ativos) {
    for (let i = 0; i < SALTO; i++) {
      const v = (amostras[q * SALTO + i] ?? 0) as number;
      soma += v * v;
      cnt++;
    }
  }
  const rmsAtivoDb = 10 * Math.log10(soma / Math.max(1, cnt) + 1e-20);
  return { T, C, E, durLog2: Math.log2(duracaoAtiva), P, vozeado, M, duracaoAtiva, rmsAtivoDb, picoAbs };
}

const dist2 = (a: readonly number[], b: readonly number[]): number => Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] as number)) ** 2, 0));
const rmsDiff = (a: readonly number[], b: readonly number[]): number => Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] as number)) ** 2, 0) / a.length);

export interface Partes {
  readonly dT: number;
  readonly dC: number;
  readonly dE: number;
  readonly dP: number;
  readonly S: number;
}

export function distancia(a: Descritores, b: Descritores, esc: Escalas): Partes {
  const dT = dist2(a.T, b.T) / esc.eT;
  const dC = rmsDiff(a.C, b.C) / esc.eC;
  const dE = Math.sqrt((rmsDiff(a.E, b.E) / esc.eE) ** 2 + ((a.durLog2 - b.durLog2) / esc.eD) ** 2);
  const dP = a.vozeado && b.vozeado ? rmsDiff(a.P, b.P) / esc.eP : 0;
  return { dT, dC, dE, dP, S: Math.sqrt(dT * dT + dC * dC + dE * dE + dP * dP) };
}
