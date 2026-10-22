/*
 * Mini motor de Web Audio OFFLINE, só para teste (Node, sem navegador). Implementa o recorte do grafo que o AudioSys usa
 * (Oscillator, Gain, BiquadFilter, BufferSource, DynamicsCompressor, AudioParam com automação e ligação de áudio em parâmetro) e
 * RENDERIZA amostras. Serve de régua: o código REAL do AudioSys roda sobre este contexto, então a régua mede o som que o jogo
 * constrói, não uma cópia dele (spec-sons-por-lutador §7.1, nível N2).
 *
 * Fidelidade assumida (e que o nível N3, no Chromium, deve confrontar):
 *  - osciladores com PolyBLEP (serra/quadrada) e triângulo analítico, fase 0 no início;
 *  - biquads com as fórmulas do cookbook RBJ como a spec Web Audio as define (Q em dB para lowpass/highpass, linear para bandpass);
 *  - automação: setValueAtTime, linear/exponentialRampToValueAtTime, setTargetAtTime, cancelScheduledValues;
 *  - o compressor é um modelo simples (detector de pico, ataque/soltura): serve para o estresse, não é o do Chromium.
 */

type Evento =
  | { tipo: 'set'; v: number; t: number }
  | { tipo: 'lin'; v: number; t: number }
  | { tipo: 'exp'; v: number; t: number }
  | { tipo: 'alvo'; v: number; t: number; tc: number };

export class Param {
  private valorBase: number;
  private eventos: Evento[] = [];
  readonly entradas: No[] = [];
  constructor(padrao: number, private readonly ctx: Contexto) {
    this.valorBase = padrao;
  }
  get value(): number {
    return this.valorBase;
  }
  set value(v: number) {
    this.valorBase = v;
    this.eventos = [];
  }
  private inserir(e: Evento): this {
    this.eventos.push(e);
    this.eventos.sort((a, b) => a.t - b.t); // estável: empates mantêm a ordem de chegada
    return this;
  }
  setValueAtTime(v: number, t: number): this {
    return this.inserir({ tipo: 'set', v, t });
  }
  linearRampToValueAtTime(v: number, t: number): this {
    return this.inserir({ tipo: 'lin', v, t });
  }
  exponentialRampToValueAtTime(v: number, t: number): this {
    return this.inserir({ tipo: 'exp', v, t });
  }
  setTargetAtTime(v: number, t: number, tc: number): this {
    return this.inserir({ tipo: 'alvo', v, t, tc });
  }
  cancelScheduledValues(t: number): this {
    this.eventos = this.eventos.filter((e) => e.t < t);
    return this;
  }
  /** Valor da linha do tempo própria (sem entradas de áudio) na amostra de tempo `t`. */
  private valorEm(t: number): number {
    let v = this.valorBase;
    let tv = 0;
    let alvo: { v: number; t: number; tc: number; de: number } | null = null;
    for (const e of this.eventos) {
      if (e.t <= t) {
        if (e.tipo === 'alvo') {
          const antes: number = alvo ? alvo.v + (alvo.de - alvo.v) * Math.exp(-(e.t - alvo.t) / alvo.tc) : v;
          alvo = { v: e.v, t: e.t, tc: Math.max(e.tc, 1e-6), de: antes };
        } else {
          alvo = null;
          v = e.v;
          tv = e.t;
        }
        continue;
      }
      // próximo evento no futuro: se for rampa, interpola do ponto atual até ele
      if (e.tipo === 'lin' || e.tipo === 'exp') {
        const v0 = alvo ? alvo.v + (alvo.de - alvo.v) * Math.exp(-(t - alvo.t) / alvo.tc) : v;
        const t0 = alvo ? alvo.t : tv;
        if (e.t <= t0) return e.v;
        const x = (t - t0) / (e.t - t0);
        if (e.tipo === 'lin') return v0 + (e.v - v0) * x;
        if (v0 <= 0 || e.v <= 0) return v0;
        return v0 * Math.pow(e.v / v0, x);
      }
      break;
    }
    if (alvo) return alvo.v + (alvo.de - alvo.v) * Math.exp(-(t - alvo.t) / alvo.tc);
    return v;
  }
  /** Valores por amostra (linha do tempo + entradas de áudio somadas). */
  computar(n: number): Float32Array {
    const out = new Float32Array(n);
    const sr = this.ctx.sampleRate;
    if (this.eventos.length === 0) out.fill(this.valorBase);
    else for (let i = 0; i < n; i++) out[i] = this.valorEm(i / sr);
    for (const no of this.entradas) {
      const x = no.saida(n);
      for (let i = 0; i < n; i++) out[i] = (out[i] as number) + (x[i] as number);
    }
    return out;
  }
  get constante(): boolean {
    return this.eventos.length === 0 && this.entradas.length === 0;
  }
}

export abstract class No {
  readonly saidas: No[] = [];
  readonly entradasAudio: No[] = [];
  private cache: Float32Array | null = null;
  constructor(protected readonly ctx: Contexto) {
    ctx.nos.push(this);
  }
  connect<T extends No | Param>(destino: T): T {
    if (destino instanceof Param) destino.entradas.push(this);
    else destino.entradasAudio.push(this);
    return destino;
  }
  disconnect(): void {
    /* o AudioSys não desconecta */
  }
  protected abstract calcular(n: number): Float32Array;
  protected entrada(n: number): Float32Array {
    const soma = new Float32Array(n);
    for (const no of this.entradasAudio) {
      const x = no.saida(n);
      for (let i = 0; i < n; i++) soma[i] = (soma[i] as number) + (x[i] as number);
    }
    return soma;
  }
  saida(n: number): Float32Array {
    if (!this.cache || this.cache.length !== n) this.cache = this.calcular(n);
    return this.cache;
  }
  limpar(): void {
    this.cache = null;
  }
}

export class Gain extends No {
  readonly gain: Param;
  constructor(ctx: Contexto) {
    super(ctx);
    this.gain = new Param(1, ctx);
  }
  protected calcular(n: number): Float32Array {
    const x = this.entrada(n);
    const g = this.gain.computar(n);
    for (let i = 0; i < n; i++) x[i] = (x[i] as number) * (g[i] as number);
    return x;
  }
}

export class Destino extends No {
  protected calcular(n: number): Float32Array {
    return this.entrada(n);
  }
}

export class Oscilador extends No {
  type: OscillatorType = 'sine';
  readonly frequency: Param;
  readonly detune: Param;
  inicio = -1;
  fim = Infinity;
  constructor(ctx: Contexto) {
    super(ctx);
    this.frequency = new Param(440, ctx);
    this.detune = new Param(0, ctx);
  }
  start(t = 0): void {
    this.inicio = t;
  }
  stop(t = 0): void {
    this.fim = t;
    this.ctx.registrarFim(t);
  }
  protected calcular(n: number): Float32Array {
    const sr = this.ctx.sampleRate;
    const out = new Float32Array(n);
    if (this.inicio < 0) return out;
    const f = this.frequency.computar(n);
    const d = this.detune.constante && this.detune.value === 0 ? null : this.detune.computar(n);
    const i0 = Math.max(0, Math.ceil(this.inicio * sr - 1e-6)); // primeiro quadro >= o início (como o Web Audio): floor deixava 1 amostra com o ganho ainda no valor padrão (estalo)
    const i1 = Math.min(n, Number.isFinite(this.fim) ? Math.ceil(this.fim * sr) : n);
    let fase = 0;
    for (let i = i0; i < i1; i++) {
      let fr = f[i] as number;
      if (d) fr *= Math.pow(2, (d[i] as number) / 1200);
      const dt = Math.min(0.49, Math.abs(fr) / sr);
      out[i] = forma(this.type, fase, dt);
      fase += dt;
      if (fase >= 1) fase -= 1;
    }
    return out;
  }
}

function polyBlep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

function forma(tipo: OscillatorType, fase: number, dt: number): number {
  switch (tipo) {
    case 'sine':
      return Math.sin(2 * Math.PI * fase);
    case 'square': {
      let y = fase < 0.5 ? 1 : -1;
      y += polyBlep(fase, dt);
      y -= polyBlep((fase + 0.5) % 1, dt);
      return y;
    }
    case 'sawtooth': {
      let y = 2 * fase - 1;
      y -= polyBlep(fase, dt);
      return y;
    }
    case 'triangle':
      return 1 - 4 * Math.abs(fase - 0.5);
    default:
      return 0;
  }
}

export class Biquad extends No {
  type: BiquadFilterType = 'lowpass';
  readonly frequency: Param;
  readonly Q: Param;
  readonly detune: Param;
  readonly gain: Param;
  constructor(ctx: Contexto) {
    super(ctx);
    this.frequency = new Param(350, ctx);
    this.Q = new Param(1, ctx);
    this.detune = new Param(0, ctx);
    this.gain = new Param(0, ctx);
  }
  private coef(f: number, q: number): [number, number, number, number, number] {
    const sr = this.ctx.sampleRate;
    const fc = Math.min(Math.max(f, 1), sr / 2 - 1);
    const w0 = (2 * Math.PI * fc) / sr;
    const cs = Math.cos(w0);
    const sn = Math.sin(w0);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
    switch (this.type) {
      case 'lowpass': {
        const alfa = sn / (2 * Math.pow(10, q / 20));
        b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + alfa; a1 = -2 * cs; a2 = 1 - alfa;
        break;
      }
      case 'highpass': {
        const alfa = sn / (2 * Math.pow(10, q / 20));
        b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + alfa; a1 = -2 * cs; a2 = 1 - alfa;
        break;
      }
      case 'bandpass': {
        const alfa = sn / (2 * Math.max(q, 1e-4));
        b0 = alfa; b1 = 0; b2 = -alfa; a0 = 1 + alfa; a1 = -2 * cs; a2 = 1 - alfa;
        break;
      }
      default:
        throw new Error(`biquad '${this.type}' não modelado`);
    }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  protected calcular(n: number): Float32Array {
    const x = this.entrada(n);
    const f = this.frequency.computar(n);
    const q = this.Q.computar(n);
    const out = new Float32Array(n);
    let [b0, b1, b2, a1, a2] = this.coef(f[0] as number, q[0] as number);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const variavel = !(this.frequency.constante && this.Q.constante);
    for (let i = 0; i < n; i++) {
      if (variavel && i % 8 === 0) [b0, b1, b2, a1, a2] = this.coef(f[i] as number, q[i] as number);
      const xi = x[i] as number;
      const y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      out[i] = y;
      x2 = x1; x1 = xi; y2 = y1; y1 = y;
    }
    return out;
  }
}

export class Buffer {
  private readonly dados: Float32Array;
  constructor(readonly canais: number, readonly length: number, readonly sampleRate: number, dados?: Float32Array) {
    this.dados = dados ?? new Float32Array(length);
  }
  get duration(): number {
    return this.length / this.sampleRate;
  }
  getChannelData(_c: number): Float32Array {
    return this.dados;
  }
}

export class FonteBuffer extends No {
  buffer: Buffer | null = null;
  inicio = -1;
  fim = Infinity;
  /** Amostras reais: `playbackRate` e o recorte `start(quando, deslocamento, duração)` (duração em tempo do BUFFER, como a spec). Sem eles, o caminho é o de sempre. */
  readonly playbackRate: Param;
  private deslocamento = 0;
  private duracao: number | undefined;
  constructor(ctx: Contexto) {
    super(ctx);
    this.playbackRate = new Param(1, ctx);
  }
  start(t = 0, deslocamento = 0, duracao?: number): void {
    this.inicio = t;
    this.deslocamento = deslocamento;
    this.duracao = duracao;
    if (duracao !== undefined) this.ctx.registrarFim(t + duracao / this.playbackRate.value); // o recorte tem fim próprio: o render para onde ele acaba
  }
  stop(t = 0): void {
    this.fim = t;
    this.ctx.registrarFim(t);
  }
  protected calcular(n: number): Float32Array {
    const sr = this.ctx.sampleRate;
    const out = new Float32Array(n);
    if (this.inicio < 0 || !this.buffer) return out;
    const d = this.buffer.getChannelData(0);
    const i0 = Math.max(0, Math.ceil(this.inicio * sr - 1e-6)); // primeiro quadro >= o início (como o Web Audio): floor deixava 1 amostra com o ganho ainda no valor padrão (estalo)
    const i1 = Math.min(n, Number.isFinite(this.fim) ? Math.ceil(this.fim * sr) : n);
    if (this.deslocamento === 0 && this.duracao === undefined && this.playbackRate.value === 1) {
      for (let i = i0; i < i1; i++) {
        const k = i - i0;
        if (k >= d.length) break;
        out[i] = d[k] as number;
      }
      return out;
    }
    // recorte + taxa: lê o buffer em tempo de buffer, com interpolação linear
    const taxa = this.playbackRate.value;
    const sb = this.buffer.sampleRate;
    for (let i = i0; i < i1; i++) {
      const tBuffer = this.deslocamento + (i / sr - this.inicio) * taxa;
      if (this.duracao !== undefined && tBuffer - this.deslocamento >= this.duracao) break;
      const pos = tBuffer * sb;
      const k = Math.floor(pos);
      if (k + 1 >= d.length) break;
      const f = pos - k;
      out[i] = (d[k] as number) * (1 - f) + (d[k + 1] as number) * f;
    }
    return out;
  }
}

export class Compressor extends No {
  readonly threshold: Param;
  readonly knee: Param;
  readonly ratio: Param;
  readonly attack: Param;
  readonly release: Param;
  constructor(ctx: Contexto) {
    super(ctx);
    this.threshold = new Param(-24, ctx);
    this.knee = new Param(30, ctx);
    this.ratio = new Param(12, ctx);
    this.attack = new Param(0.003, ctx);
    this.release = new Param(0.25, ctx);
  }
  protected calcular(n: number): Float32Array {
    const x = this.entrada(n);
    const sr = this.ctx.sampleRate;
    const lim = Math.pow(10, this.threshold.value / 20);
    const r = this.ratio.value;
    const ka = Math.exp(-1 / (Math.max(this.attack.value, 1e-4) * sr));
    const kr = Math.exp(-1 / (Math.max(this.release.value, 1e-3) * sr));
    const out = new Float32Array(n);
    let env = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(x[i] as number);
      env = a > env ? ka * env + (1 - ka) * a : kr * env + (1 - kr) * a;
      const pico = Math.max(env, a); // modelo simples: nunca deixa o pico instantâneo passar do que o detector viu
      const g = pico > lim ? Math.pow(pico / lim, 1 / r - 1) : 1;
      out[i] = (x[i] as number) * g;
    }
    return out;
  }
}

export class Contexto {
  readonly nos: No[] = [];
  currentTime = 0;
  state = 'running';
  readonly destination: Destino;
  /** Contadores, para os testes de orçamento. */
  criados = { osc: 0, fonte: 0, ganho: 0, biquad: 0, compressor: 0 };
  /** Maior instante de `stop()` pedido (limita a duração renderizada). */
  fimMax = 0;
  constructor(readonly sampleRate = 22050) {
    this.destination = new Destino(this);
  }
  registrarFim(t: number): void {
    if (t > this.fimMax) this.fimMax = t;
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createGain(): Gain {
    this.criados.ganho++;
    return new Gain(this);
  }
  createOscillator(): Oscilador {
    this.criados.osc++;
    return new Oscilador(this);
  }
  createBiquadFilter(): Biquad {
    this.criados.biquad++;
    return new Biquad(this);
  }
  createBufferSource(): FonteBuffer {
    this.criados.fonte++;
    return new FonteBuffer(this);
  }
  createDynamicsCompressor(): Compressor {
    this.criados.compressor++;
    return new Compressor(this);
  }
  createBuffer(canais: number, length: number, sampleRate: number): Buffer {
    return new Buffer(canais, length, sampleRate);
  }
  /** Renderiza o destino até `segundos` (padrão: o maior `stop()` pedido + 50 ms). */
  renderizar(segundos?: number): Float32Array {
    const dur = segundos ?? this.fimMax + 0.05;
    const n = Math.max(1, Math.ceil(dur * this.sampleRate));
    for (const no of this.nos) no.limpar();
    return this.destination.saida(n).slice();
  }
}

/** Tipo estrutural que o AudioSys aceita como `AudioContext`. */
export function comoAudioContext(c: Contexto): AudioContext {
  return c as unknown as AudioContext;
}
