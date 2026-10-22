/*
 * Mede o custo de uma trilha rodando o AudioSys REAL (o `scheduler` de verdade) sobre o mini motor offline: fontes (osciladores e buffers iniciados) por
 * passo e ativas ao mesmo tempo, nós criados e o tempo de cada tick do agendador. Serve às trilhas de hoje e aos temas pelo mesmo caminho, então o
 * orçamento do tema é RELATIVO ao da `fight` (spec §3.5), e não um número inventado.
 */
import { AudioSys, type TrilhaMusica } from '../../src/audio/audio-sys';
import '../../src/audio/temas'; // registra o sequenciador dos temas no AudioSys (que não os importa)
import { criarRng } from '../../src/core/rng';
import { Contexto, FonteBuffer, Oscilador, comoAudioContext } from './audio-offline';

export interface MedidaDeTrilha {
  /** Maior número de fontes novas num passo, e o passo. */
  readonly porPasso: number;
  readonly passoDoPico: number;
  /** Maior número de fontes soando ao mesmo tempo. */
  readonly ativasPico: number;
  /** Nós de áudio (osc + ganho + biquad + buffer) criados por segundo de música: o custo de montar o grafo. */
  readonly nosPorSegundo: number;
  /** Tempo de cada tick do agendador que tocou algo, em ms (graph building no mini motor). */
  readonly ticksMs: readonly number[];
  readonly t0: number;
}

export function rodarTrilha(kind: TrilhaMusica, segundos: number, opcoes: { spb: number; fase2Em?: number }): { ctx: Contexto; audio: AudioSys; medida: MedidaDeTrilha } {
  const ctx = new Contexto(22050);
  let tick: (() => void) | null = null;
  const audio = new AudioSys({
    criarContexto: () => comoAudioContext(ctx),
    rng: criarRng(5),
    setInterval: (fn) => {
      tick = fn;
      return 1;
    },
    clearInterval: () => undefined,
  });
  audio.init();
  const nosDoInit = ctx.nos.length;
  // os instantes reais dos passos (a fase 2 muda a duração do passo no meio da medida, e num tema o 1º passo já nasce no startMusic, com folga maior)
  const passosT: number[] = [];
  for (const nome of ['playStep', 'playMenu', 'playChefe'] as const) {
    const orig = audio[nome].bind(audio);
    audio[nome] = (step, t, spb) => {
      passosT.push(t);
      orig(step, t, spb);
    };
  }
  const origTema = audio.playTema.bind(audio);
  audio.playTema = (tema, step, t) => {
    passosT.push(t);
    origTema(tema, step, t);
  };
  audio.startMusic(kind);
  const t0 = passosT[0] ?? audio.nextTime;
  const ticksMs: number[] = [];
  let pediu2 = false;
  for (let t = 0; t < segundos; t += 0.025) {
    ctx.currentTime = t;
    if (opcoes.fase2Em !== undefined && !pediu2 && t >= opcoes.fase2Em) {
      audio.musicaDaFase(2);
      pediu2 = true;
    }
    const a = performance.now();
    (tick as (() => void) | null)?.();
    const dt = performance.now() - a;
    if (dt > 0) ticksMs.push(dt);
  }
  const fontes = ctx.nos.filter((n): n is Oscilador | FonteBuffer => (n instanceof Oscilador || n instanceof FonteBuffer) && n.inicio >= 0);
  const porPasso = new Map<number, number>();
  for (const f of fontes) {
    // o passo a que a fonte pertence: o último que começou até 0,3 passo depois do início dela (deslocamentos de swing/quando)
    let lo = 0;
    let hi = passosT.length - 1;
    const x = f.inicio + 0.3 * opcoes.spb;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((passosT[mid] as number) <= x) lo = mid;
      else hi = mid - 1;
    }
    const p = lo;
    porPasso.set(p, (porPasso.get(p) ?? 0) + 1);
  }
  let pico = 0;
  let passoDoPico = 0;
  for (const [p, n] of porPasso) if (n > pico || (n === pico && p < passoDoPico)) [pico, passoDoPico] = [n, p];
  const marcas = fontes.flatMap((f) => [
    { t: f.inicio, d: 1 },
    { t: Number.isFinite(f.fim) ? f.fim : f.inicio, d: -1 },
  ]);
  marcas.sort((a, b) => a.t - b.t || a.d - b.d);
  let atual = 0;
  let ativasPico = 0;
  for (const m of marcas) {
    atual += m.d;
    ativasPico = Math.max(ativasPico, atual);
  }
  const nosPorSegundo = (ctx.nos.length - nosDoInit) / Math.max(0.001, segundos - (t0 - 0));
  return { ctx, audio, medida: { porPasso: pico, passoDoPico, ativasPico, nosPorSegundo, ticksMs, t0 } };
}

export const percentil = (v: readonly number[], p: number): number => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};

/**
 * Referência de tempo do agendamento: o p99 do tick do `scheduler()` da trilha `fight` de hoje, como MEDIANA de 5 execuções (o tempo de um tick em Node varia
 * 5x de uma execução para outra por JIT e coleta de lixo: uma só medida faria o critério relativo tremer). Os critérios de tempo comparam com isto, e não
 * com um absoluto: nem a `fight` cumpre `p99 < 1 ms` no Chromium com CPU 4x (N3 da Íris: 9,5 ms).
 */
let _p99Fight: number | null = null;
export function p99DaFight(): number {
  if (_p99Fight === null) {
    const todos = Array.from({ length: 5 }, () => percentil(rodarTrilha('fight', 20, { spb: 0.1 }).medida.ticksMs, 0.99));
    todos.sort((a, b) => a - b);
    _p99Fight = todos[2] as number;
  }
  return _p99Fight;
}
/** Ruído do relógio (ms) somado aos limites relativos de tempo. */
export const RUIDO_RELOGIO_MS = 0.05;
/** O menor p99 de `reps` execuções (o melhor caso do mesmo código: tira o pico de coleta de lixo, que não é custo do tema). */
export function menorP99(rodar: () => readonly number[], reps: number): number {
  let m = Infinity;
  for (let i = 0; i < reps; i++) m = Math.min(m, percentil(rodar(), 0.99));
  return m;
}
