import { midi } from '../core/math';
import { criarRng, sementeAleatoria, type Rng } from '../core/rng';

/*
 * AudioSys do protótipo (seção 2 + extensões das linhas 257-317 e 1743-1756), porte fiel.
 * Todos os sons são sintetizados em tempo real com a Web Audio API (D8: áudio 100% sintetizado):
 *  - tone: oscilador com envelope e filtro opcional
 *  - noise: ruído branco filtrado (impactos, whoosh)
 *  - voice: sawtooth passando por filtros formantes (vozes: "HA!", grito de KO)
 *  - música: sequenciador de semicolcheias (baixo, lead e bateria), 3 trilhas (menu / luta / chefão). As duas primeiras têm 16 passos por
 *    compasso; a do chefão (ZENON) é uma valsa em 3/4, 12 passos por compasso (docs/spec-chefao-zenon.md §5)
 * A luta NÃO chama isto: ela emite eventos e audio/eventos.ts converte em chamadas.
 */

type FiltroDef = { type: BiquadFilterType; f: number };

export type OpcoesTom = {
  type?: OscillatorType;
  f0?: number;
  f1?: number | null;
  t?: number;
  vol?: number;
  attack?: number;
  dest?: AudioNode | null;
  when?: number;
  at?: number | null;
  filter?: FiltroDef | null;
  Q?: number;
  detune?: number;
};

export type OpcoesRuido = {
  t?: number;
  vol?: number;
  type?: BiquadFilterType;
  f0?: number;
  f1?: number | null;
  Q?: number;
  when?: number;
  at?: number | null;
  dest?: AudioNode | null;
  attack?: number;
};

export type OpcoesVoz = {
  f0?: number;
  f1?: number;
  t?: number;
  vol?: number;
  when?: number;
  formants?: readonly number[];
  vib?: boolean;
  Q?: number;
};

export type TrilhaMusica = 'fight' | 'menu' | 'chefe';

/** Forma de cada trilha: andamento, passos por compasso e compassos do laço. `fight` e `menu` são as do protótipo, bit a bit. */
type DefTrilha = { bpm: number; passosPorCompasso: number; compassos: number; andamentoFase2?: number };
export const TRILHAS: Readonly<Record<TrilhaMusica, DefTrilha>> = {
  fight: { bpm: 150, passosPorCompasso: 16, compassos: 4 },
  menu: { bpm: 92, passosPorCompasso: 16, compassos: 4 },
  // Valsa 3/4 em semicolcheias: 12 passos por compasso, 8 compassos (96 passos). Fase 2 do chefão: +12% de andamento.
  chefe: { bpm: 138, passosPorCompasso: 12, compassos: 8, andamentoFase2: 1.12 },
};

export type DependenciasAudio = {
  /** Cria o AudioContext (padrão: window.AudioContext / webkitAudioContext). null = sem áudio. */
  criarContexto?: () => AudioContext | null;
  /** RNG do buffer de ruído (padrão: semente aleatória). */
  rng?: Rng;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (id: unknown) => void;
};

const ROOTS = [45, 41, 43, 40]; // Am  F  G  E (notas MIDI do baixo)
const BASS = [0, null, 12, null, 0, null, 7, null, 0, null, 12, null, 7, null, 10, null] as const;
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
const LEAD = [
  69, 0, 72, 0, 74, 0, 76, 0, 74, 0, 72, 0, 69, 0, 67, 0, 65, 0, 69, 0, 72, 0, 69, 0, 65, 0, 64, 0, 65, 0, 67, 0, 67, 0, 71, 0, 74, 0, 71, 0, 67, 0,
  74, 0, 76, 0, 74, 0, 64, 0, 68, 0, 71, 0, 68, 0, 64, 0, 71, 0, 76, 0, 0, 0,
];
const MROOTS = [45, 41, 43, 40];
const MLEAD = [
  76, 0, 0, 0, 72, 0, 74, 0, 71, 0, 0, 0, 69, 0, 0, 0, 72, 0, 0, 0, 77, 0, 76, 0, 72, 0, 0, 0, 69, 0, 71, 0, 71, 0, 0, 0, 74, 0, 76, 0, 79, 0, 0, 0,
  76, 0, 74, 0, 76, 0, 0, 0, 71, 0, 0, 0, 68, 0, 71, 0, 76, 0, 0, 0,
];

// --- Trilha do chefão (ZENON): valsa sinistra em Ré frígio dominante (Ré Mi♭ Fá♯ Sol Lá Si♭ Dó), raiz MIDI 50 ---
const CHEFE_RAIZ = 50;
/** Grau da raiz de cada um dos 8 compassos, em semitons acima de Ré: Ré, Mi♭, Ré, Mi♭, Dó, Mi♭, Ré, Ré. */
const CHEFE_GRAUS = [0, 1, 0, 1, -2, 1, 0, 0] as const;
/** Melodia do cravo: 96 passos (8 compassos x 12), 0 = pausa. A nota cai nos tempos (passos 0, 4 e 8) e nos floreios (6 e 10). */
const CHEFE_MELODIA = [
  74, 0, 0, 0, 70, 0, 69, 0, 66, 0, 0, 0, // Ré: Ré Si♭ Lá Fá♯
  75, 0, 0, 0, 72, 0, 70, 0, 67, 0, 0, 0, // Mi♭: Mi♭ Dó Si♭ Sol
  74, 0, 0, 0, 70, 0, 69, 0, 66, 0, 69, 0, // Ré, com a volta para o Lá
  75, 0, 0, 0, 74, 0, 72, 0, 70, 0, 0, 0, // Mi♭ descendo
  72, 0, 0, 0, 69, 0, 67, 0, 66, 0, 0, 0, // Dó
  70, 0, 0, 0, 72, 0, 75, 0, 74, 0, 0, 0, // Mi♭ subindo
  74, 0, 72, 0, 70, 0, 69, 0, 66, 0, 67, 0, // Ré, descida cromática
  69, 0, 0, 0, 66, 0, 0, 0, 62, 0, 0, 0, // cadência no Ré
] as const;

const contextoDoNavegador = (): AudioContext | null => {
  const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AC = w.AudioContext ?? w.webkitAudioContext;
  return AC ? new AC() : null;
};

export class AudioSys {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  noiseBuf: AudioBuffer | null = null;
  musicVol = 0.45;
  sfxVol = 0.8;
  muted = false;
  musicOn = false;
  step = 0;
  nextTime = 0;
  timer: unknown = null;
  loops = 0;
  kind: TrilhaMusica | null = null;
  /** Fase da trilha do chefão em uso (1 ou 2) e a pedida por `musicaDaFase`: a troca só vale no início do compasso seguinte. */
  fase: 1 | 2 = 1;
  private faseAlvo: 1 | 2 = 1;

  private readonly dep: Required<DependenciasAudio>;

  constructor(dep: DependenciasAudio = {}) {
    this.dep = {
      criarContexto: dep.criarContexto ?? contextoDoNavegador,
      rng: dep.rng ?? criarRng(sementeAleatoria()),
      setInterval: dep.setInterval ?? ((fn, ms) => setInterval(fn, ms)),
      clearInterval: dep.clearInterval ?? ((id) => clearInterval(id as ReturnType<typeof setInterval>)),
    };
  }

  /** Chamar após um gesto do usuário (política de autoplay). Idempotente. */
  init(): void {
    if (this.ctx) return;
    const c = this.dep.criarContexto();
    if (!c) return;
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(c.destination);
    this.sfx = c.createGain();
    this.sfx.gain.value = this.sfxVol;
    this.sfx.connect(this.master);
    this.music = c.createGain();
    this.music.gain.value = this.muted ? 0 : this.musicVol;
    this.music.connect(this.master);
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = this.dep.rng.proximo() * 2 - 1;
  }
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setMusicVol(v: number): void {
    this.musicVol = v;
    if (this.music && !this.muted) this.music.gain.value = v;
  }
  setSfxVol(v: number): void {
    this.sfxVol = v;
    if (this.sfx) this.sfx.gain.value = v;
  }
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.music) this.music.gain.value = this.muted ? 0 : this.musicVol;
    return this.muted;
  }

  // --- primitivas de síntese ---
  tone(o: OpcoesTom): void {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    const { type = 'square', f0 = 440, f1 = null, t = 0.1, vol = 0.3, attack = 0.005, dest = null, when = 0, at = null, filter = null, Q = 1, detune = 0 } = o;
    const now = at !== null ? at : c.currentTime + when;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), now + t);
    osc.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    let node: AudioNode = osc;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = filter.type;
      f.frequency.value = filter.f;
      f.Q.value = Q;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest || this.sfx);
    osc.start(now);
    osc.stop(now + t + 0.05);
  }

  noise(o: OpcoesRuido): void {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    const { t = 0.1, vol = 0.3, type = 'lowpass', f0 = 1000, f1 = null, Q = 1, when = 0, at = null, dest = null, attack = 0.003 } = o;
    const now = at !== null ? at : c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = Q;
    f.frequency.setValueAtTime(f0, now);
    if (f1 !== null) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), now + t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    src.connect(f);
    f.connect(g);
    g.connect(dest || this.sfx);
    src.start(now);
    src.stop(now + t + 0.05);
  }

  voice(o: OpcoesVoz): void {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    const { f0 = 200, f1 = 150, t = 0.3, vol = 1.2, when = 0, formants = [650, 1100], vib = true, Q = 6 } = o;
    const now = c.currentTime + when;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), now + t);
    if (vib) {
      const lfo = c.createOscillator();
      lfo.frequency.value = 6.5;
      const lg = c.createGain();
      lg.gain.value = f0 * 0.05;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + t + 0.1);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.03);
    g.gain.setValueAtTime(vol, now + t * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    for (const fr of formants) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fr;
      bp.Q.value = Q;
      osc.connect(bp);
      bp.connect(g);
    }
    g.connect(this.sfx);
    osc.start(now);
    osc.stop(now + t + 0.1);
  }

  // --- efeitos sonoros ---
  /** Whoosh ao desferir um golpe: 0 = soco, 1 = chute. */
  swing(kind: number): void {
    if (kind === 0) this.noise({ t: 0.09, vol: 0.18, type: 'bandpass', f0: 900, f1: 2600, Q: 1.5 });
    else this.noise({ t: 0.14, vol: 0.22, type: 'bandpass', f0: 500, f1: 1600, Q: 1.2 });
  }
  punch(): void {
    this.tone({ type: 'sine', f0: 190, f1: 50, t: 0.13, vol: 0.55 });
    this.noise({ t: 0.06, vol: 0.3, type: 'bandpass', f0: 1800, Q: 1 });
  }
  kick(): void {
    this.tone({ type: 'sine', f0: 120, f1: 35, t: 0.22, vol: 0.7 });
    this.tone({ type: 'triangle', f0: 420, f1: 90, t: 0.06, vol: 0.2 });
    this.noise({ t: 0.13, vol: 0.38, type: 'lowpass', f0: 800 });
  }
  /** Grunhido de quem leva dano; `p` = tom da voz do lutador. */
  hurt(p = 1): void {
    this.voice({ f0: 190 * p, f1: 95 * p, t: 0.16, vol: 0.9, formants: [500, 1400], vib: false });
  }
  block(): void {
    this.tone({ type: 'triangle', f0: 1300, f1: 300, t: 0.08, vol: 0.3 });
    this.noise({ t: 0.04, vol: 0.15, type: 'highpass', f0: 3000 });
  }
  jump(): void {
    this.tone({ type: 'square', f0: 280, f1: 640, t: 0.09, vol: 0.1 });
  }
  deny(): void {
    this.tone({ type: 'square', f0: 160, f1: 110, t: 0.1, vol: 0.12 });
  }
  /** "HA-DOU!" + carga de energia. */
  special(p = 1): void {
    this.voice({ f0: 210 * p, f1: 190 * p, t: 0.16, vol: 1.3, formants: [700, 1250] });
    this.voice({ f0: 170 * p, f1: 125 * p, t: 0.3, vol: 1.2, formants: [380, 850], when: 0.14 });
    this.tone({ type: 'sawtooth', f0: 180, f1: 900, t: 0.35, vol: 0.18, filter: { type: 'lowpass', f: 1500 } });
  }
  fireballLaunch(): void {
    this.noise({ t: 0.35, vol: 0.3, type: 'bandpass', f0: 600, f1: 2800, Q: 2 });
    this.tone({ type: 'sine', f0: 300, f1: 90, t: 0.3, vol: 0.25 });
  }
  fireballHit(): void {
    this.noise({ t: 0.38, vol: 0.6, type: 'lowpass', f0: 1200, f1: 120 });
    this.tone({ type: 'sine', f0: 110, f1: 30, t: 0.35, vol: 0.5 });
  }
  /** Grito de KO + gongo. */
  ko(p = 1): void {
    this.voice({ f0: 340 * p, f1: 110 * p, t: 1.0, vol: 1.4, formants: [720, 1150], Q: 5 });
    this.noise({ t: 0.3, vol: 0.4, type: 'lowpass', f0: 500, f1: 80 });
    this.tone({ type: 'sine', f0: 110, t: 1.4, vol: 0.5, when: 0.1 });
    this.tone({ type: 'sine', f0: 221, t: 1.0, vol: 0.2, when: 0.1 });
  }
  land(): void {
    this.noise({ t: 0.08, vol: 0.14, type: 'lowpass', f0: 400 });
  }
  roundStart(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone({ type: 'square', f0: f, t: 0.14, vol: 0.22, when: i * 0.11 }));
    this.tone({ type: 'triangle', f0: 131, t: 0.5, vol: 0.3 });
  }
  /** "FIGHT!" — dois acordes secos. */
  fight(): void {
    [
      [220, 277, 330],
      [294, 370, 440],
    ].forEach((acorde, i) =>
      acorde.forEach((f) => this.tone({ type: 'sawtooth', f0: f, t: i ? 0.5 : 0.22, vol: 0.14, when: i * 0.17, filter: { type: 'lowpass', f: 2500 } })),
    );
    this.noise({ t: 0.18, vol: 0.35, type: 'lowpass', f0: 900 });
    this.voice({ f0: 240, f1: 160, t: 0.3, vol: 1.1, formants: [600, 1300], when: 0.17 });
  }
  timeOver(): void {
    [440, 349, 262].forEach((f, i) => this.tone({ type: 'square', f0: f, t: 0.3, vol: 0.2, when: i * 0.3 }));
  }
  victory(): void {
    const seq: readonly (readonly [number, number, number])[] = [
      [523, 0, 0.1],
      [523, 0.12, 0.1],
      [523, 0.24, 0.1],
      [659, 0.36, 0.2],
      [784, 0.62, 0.22],
      [1047, 0.92, 0.9],
    ];
    seq.forEach(([f, w, t]) => {
      this.tone({ type: 'square', f0: f, t, vol: 0.22, when: w });
      this.tone({ type: 'triangle', f0: f / 2, t, vol: 0.22, when: w });
    });
    [262, 330, 392].forEach((f) => this.tone({ type: 'sawtooth', f0: f, t: 1.2, vol: 0.08, when: 0.92, filter: { type: 'lowpass', f: 1800 } }));
  }

  // --- interface ---
  uiMove(): void {
    this.tone({ type: 'square', f0: 660, f1: 760, t: 0.05, vol: 0.09 });
  }
  uiOk(): void {
    this.tone({ type: 'square', f0: 523, t: 0.07, vol: 0.12 });
    this.tone({ type: 'square', f0: 784, t: 0.12, vol: 0.12, when: 0.06 });
  }
  uiBack(): void {
    this.tone({ type: 'square', f0: 440, f1: 300, t: 0.1, vol: 0.1 });
  }
  uiPause(): void {
    this.tone({ type: 'triangle', f0: 880, f1: 440, t: 0.14, vol: 0.2 });
  }
  uiTick(): void {
    this.tone({ type: 'square', f0: 990, t: 0.05, vol: 0.1 });
  }
  uiSelect(p = 1): void {
    this.voice({ f0: 220 * p, f1: 180 * p, t: 0.2, vol: 1.1, formants: [650, 1150] });
    this.tone({ type: 'sawtooth', f0: 220, f1: 660, t: 0.25, vol: 0.12, filter: { type: 'lowpass', f: 2200 } });
  }
  uiVs(): void {
    this.noise({ t: 0.5, vol: 0.4, type: 'lowpass', f0: 2500, f1: 100 });
    this.tone({ type: 'sine', f0: 90, f1: 40, t: 0.6, vol: 0.7 });
  }
  uiPerfect(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone({ type: 'triangle', f0: f, t: 0.18, vol: 0.2, when: i * 0.07 }));
  }

  // --- sons da abertura ---
  introWhoosh(): void {
    this.noise({ t: 0.7, vol: 0.35, type: 'bandpass', f0: 300, f1: 4200, Q: 0.9 });
    this.tone({ type: 'sine', f0: 60, f1: 120, t: 0.7, vol: 0.25 });
  }
  introHit(i = 0): void {
    this.noise({ t: 0.22, vol: 0.5, type: 'lowpass', f0: 3000, f1: 120 });
    this.tone({ type: 'sine', f0: 110 - i * 8, f1: 45, t: 0.35, vol: 0.75 });
    this.tone({ type: 'sawtooth', f0: 220 + i * 55, t: 0.12, vol: 0.08, filter: { type: 'lowpass', f: 1800 } });
  }
  logoSlam(): void {
    this.noise({ t: 1.2, vol: 0.6, type: 'lowpass', f0: 5000, f1: 60 });
    this.tone({ type: 'sine', f0: 70, f1: 32, t: 1.4, vol: 0.9 });
    [261.6, 329.6, 392, 523.3].forEach((f, i) => this.tone({ type: 'sawtooth', f0: f, t: 1.6, vol: 0.06, when: 0.05 + i * 0.03, filter: { type: 'lowpass', f: 2600 } }));
    [1568, 2093, 2637].forEach((f, i) => this.tone({ type: 'triangle', f0: f, t: 0.5, vol: 0.06, when: 0.25 + i * 0.08 }));
  }

  // --- música de fundo (sequenciador) ---
  startMusic(kind: TrilhaMusica = 'fight'): void {
    if (!this.ctx) return;
    this.faseAlvo = 1; // uma luta nova começa na fase 1, mesmo com a trilha já tocando (a troca vale no início do compasso)
    if (this.musicOn && this.kind === kind) return;
    this.stopMusic();
    this.kind = kind;
    this.fase = 1;
    this.musicOn = true;
    this.step = 0;
    this.loops = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = this.dep.setInterval(() => this.scheduler(), 25);
  }
  stopMusic(): void {
    if (this.timer) this.dep.clearInterval(this.timer);
    this.timer = null;
    this.musicOn = false;
  }
  /**
   * Fase 2 da luta de chefe (a cena do ZENON): andamento +12%, bumbo nos 3 tempos e órgão uma oitava abaixo. NÃO corta o compasso em
   * andamento: só vira no início do próximo (passo % passosPorCompasso === 0). Sem efeito nas trilhas `fight` e `menu`.
   */
  musicaDaFase(fase: 1 | 2): void {
    this.faseAlvo = fase;
  }
  scheduler(): void {
    const c = this.ctx;
    if (!c) return;
    const def = TRILHAS[this.kind === 'menu' ? 'menu' : this.kind === 'chefe' ? 'chefe' : 'fight'];
    const len = def.passosPorCompasso * def.compassos;
    while (this.nextTime < c.currentTime + 0.15) {
      if (this.step % def.passosPorCompasso === 0) this.fase = this.faseAlvo;
      const spb = 60 / (def.bpm * (this.fase === 2 && def.andamentoFase2 ? def.andamentoFase2 : 1)) / 4;
      if (this.kind === 'menu') this.playMenu(this.step, this.nextTime, spb);
      else if (this.kind === 'chefe') this.playChefe(this.step, this.nextTime, spb);
      else this.playStep(this.step, this.nextTime, spb);
      this.nextTime += spb;
      this.step++;
      if (this.step >= len) {
        this.step = 0;
        this.loops++;
      }
    }
  }
  playStep(step: number, t: number, spb: number): void {
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const root = ROOTS[bar] ?? 45;
    const m = this.music;
    // bateria
    if (KICK[s16]) this.tone({ type: 'sine', f0: 160, f1: 40, t: 0.22, vol: 0.55, at: t, dest: m });
    if (SNARE[s16]) {
      this.noise({ t: 0.12, vol: 0.28, type: 'bandpass', f0: 1800, Q: 0.8, at: t, dest: m });
      this.tone({ type: 'triangle', f0: 230, f1: 110, t: 0.07, vol: 0.2, at: t, dest: m });
    }
    if (s16 % 2 === 0) this.noise({ t: s16 % 4 === 2 ? 0.07 : 0.03, vol: 0.09, type: 'highpass', f0: 7000, at: t, dest: m });
    // baixo
    const b = BASS[s16];
    if (b !== null && b !== undefined) this.tone({ type: 'square', f0: midi(root + b), t: spb * 0.9, vol: 0.16, at: t, dest: m, filter: { type: 'lowpass', f: 700 } });
    // lead (a cada loop ímpar, uma oitava acima e mais suave)
    const n = LEAD[step];
    if (n) {
      const up = this.loops % 2 === 1;
      const f = midi(n + (up ? 12 : 0));
      const vol = up ? 0.07 : 0.11;
      const ty: OscillatorType = up ? 'triangle' : 'square';
      this.tone({ type: ty, f0: f, t: spb * 1.8, vol, at: t, dest: m, filter: { type: 'lowpass', f: 3200 } });
      this.tone({ type: ty, f0: f, t: spb * 1.8, vol: vol * 0.6, at: t, dest: m, detune: 9, filter: { type: 'lowpass', f: 3200 } });
    }
    // acorde de apoio no início de cada compasso
    if (s16 === 0) {
      [0, 3 + (bar === 3 ? 1 : 0), 7].forEach((iv) => this.tone({ type: 'sawtooth', f0: midi(root + 12 + iv), t: spb * 6, vol: 0.045, at: t, dest: m, filter: { type: 'lowpass', f: 1200 } }));
    }
  }
  /**
   * Valsa do chefão (3/4, 12 passos por compasso). Tempo 1 = passo 0: bordão (dente-de-serra, passa-baixa de 900 Hz) e bumbo. Tempos 2 e
   * 3 = passos 4 e 8: acorde de órgão em quintas. Prato de braseiro no passo 8 (ruído passa-alta de 6 kHz) e cravo na melodia (triângulo
   * curto). Fase 2: bumbo também nos passos 4 e 8 e o órgão uma oitava abaixo. Tudo determinístico em `step`: nenhum sorteio.
   */
  playChefe(step: number, t: number, spb: number): void {
    const passo = step % 12;
    const compasso = Math.floor(step / 12) % CHEFE_GRAUS.length;
    const raiz = CHEFE_RAIZ + (CHEFE_GRAUS[compasso] ?? 0);
    const m = this.music;
    const f2 = this.fase === 2;
    if (passo === 0 || (f2 && (passo === 4 || passo === 8))) this.tone({ type: 'sine', f0: 150, f1: 40, t: 0.24, vol: 0.5, at: t, dest: m });
    if (passo === 0) {
      this.tone({ type: 'sawtooth', f0: midi(raiz - 12), t: spb * 10, vol: 0.2, at: t, dest: m, filter: { type: 'lowpass', f: 900 } });
    }
    if (passo === 4 || passo === 8) {
      const oit = f2 ? 0 : 12;
      [0, 7, 12].forEach((iv) => this.tone({ type: 'sawtooth', f0: midi(raiz + oit + iv), t: spb * 3.4, vol: 0.05, at: t, dest: m, filter: { type: 'lowpass', f: 900 } }));
    }
    if (passo === 8) this.noise({ t: 0.16, vol: 0.1, type: 'highpass', f0: 6000, at: t, dest: m });
    const n = CHEFE_MELODIA[step % CHEFE_MELODIA.length];
    if (n) {
      this.tone({ type: 'triangle', f0: midi(n), t: spb * 1.6, vol: 0.16, attack: 0.003, at: t, dest: m, filter: { type: 'lowpass', f: 3000 } });
      this.tone({ type: 'triangle', f0: midi(n), t: spb * 1.6, vol: 0.09, attack: 0.003, at: t, dest: m, detune: 7, filter: { type: 'lowpass', f: 3000 } });
    }
  }
  playMenu(step: number, t: number, spb: number): void {
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const root = MROOTS[bar] ?? 45;
    const m = this.music;
    if (s16 === 0 || s16 === 8) this.tone({ type: 'sine', f0: 120, f1: 42, t: 0.3, vol: 0.4, at: t, dest: m });
    if (s16 % 4 === 2) this.noise({ t: 0.04, vol: 0.05, type: 'highpass', f0: 8000, at: t, dest: m });
    if (s16 === 4 || s16 === 12) this.noise({ t: 0.1, vol: 0.12, type: 'bandpass', f0: 1500, Q: 0.7, at: t, dest: m });
    if (s16 % 8 === 0) this.tone({ type: 'triangle', f0: midi(root), t: spb * 7, vol: 0.2, at: t, dest: m, filter: { type: 'lowpass', f: 600 } });
    if (s16 === 0) {
      [0, 7, 12, 15].forEach((iv) => this.tone({ type: 'sawtooth', f0: midi(root + 12 + iv), t: spb * 15, vol: 0.03, at: t, dest: m, filter: { type: 'lowpass', f: 900 }, attack: 0.4 }));
    }
    const n = MLEAD[step];
    if (n) {
      // pluck estilo koto
      this.tone({ type: 'triangle', f0: midi(n) * 1.01, f1: midi(n), t: spb * 5, vol: 0.2, at: t, dest: m, filter: { type: 'lowpass', f: 2600 } });
      this.tone({ type: 'sine', f0: midi(n + 12), t: spb * 2.5, vol: 0.05, at: t, dest: m });
    }
  }
}

/** Instância única usada pelo jogo (o protótipo tinha um objeto global `AudioSys`). */
export const audioSys = new AudioSys();
