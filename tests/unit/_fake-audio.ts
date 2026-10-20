/* AudioContext falso que GRAVA tudo o que é feito nele (criação de nós, valores, rampas, conexões).
 * Serve para comparar o AudioSys do protótipo com o porte sem tocar som: mesmas chamadas == mesmo som. */
import type { Obj } from './_prototipo';

export type RegistroAudio = unknown[][];

export function criarContextoFalso(log: RegistroAudio, amostras = 4000, taxa = 8000): Obj {
  let contador = 0;
  const param = (nome: string): Obj => {
    const p: Obj = {
      setValueAtTime: (...a: unknown[]) => log.push([nome, 'setValueAtTime', ...a]),
      linearRampToValueAtTime: (...a: unknown[]) => log.push([nome, 'linearRamp', ...a]),
      exponentialRampToValueAtTime: (...a: unknown[]) => log.push([nome, 'expRamp', ...a]),
    };
    Object.defineProperty(p, 'value', { set: (v: unknown) => void log.push([nome, 'value', v]), get: () => 0 });
    return p;
  };
  const no = (tipo: string): Obj => {
    const id = `${tipo}#${contador++}`;
    const alvo: Obj = {
      gain: param(`${id}.gain`),
      frequency: param(`${id}.frequency`),
      detune: param(`${id}.detune`),
      Q: param(`${id}.Q`),
      connect: (para: Obj) => log.push(['connect', id, String(para['__id'] ?? 'destino')]),
      start: (...a: unknown[]) => log.push(['start', id, ...a]),
      stop: (...a: unknown[]) => log.push(['stop', id, ...a]),
      __id: id,
    };
    return new Proxy(alvo, {
      set: (t, p: string, v: unknown) => {
        t[p] = v;
        log.push(['set', id, p, v instanceof Object ? '[obj]' : v]);
        return true;
      },
    });
  };
  const buffers: Float32Array[] = [];
  const ctx: Obj = {
    currentTime: 10,
    sampleRate: taxa,
    state: 'running',
    destination: { __id: 'destination' },
    resume: () => undefined,
    createGain: () => no('gain'),
    createOscillator: () => no('osc'),
    createBiquadFilter: () => no('biquad'),
    createBufferSource: () => no('src'),
    createBuffer: (_c: number, len: number) => {
      const dados = new Float32Array(Math.min(len, amostras * 4));
      buffers.push(dados);
      return { getChannelData: () => dados, __id: 'buffer' };
    },
    __buffers: buffers,
  };
  return ctx;
}
