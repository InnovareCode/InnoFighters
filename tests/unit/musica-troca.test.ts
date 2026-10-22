import { describe, expect, it, vi } from 'vitest';

/*
 * O trecho de troca de fase: tocado UMA vez, no 1º passo do compasso em que a fase 2 começa (nunca no meio do compasso, nunca na fase 1, nunca de novo).
 * Espia `tocarReceita` (passa a chamada adiante) para ver o que o AudioSys manda tocar e quando.
 */
const chamadas: { receita: readonly { quando?: number }[]; inicio: number | undefined; destino: string | undefined }[] = [];
vi.mock('../../src/audio/receitas', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/audio/receitas')>();
  return {
    ...orig,
    tocarReceita: (audio: unknown, receita: readonly { quando?: number }[], o: { inicio?: number; destino?: string } = {}) => {
      chamadas.push({ receita, inicio: o.inicio, destino: o.destino });
      return (orig.tocarReceita as (a: unknown, r: unknown, o: unknown) => number)(audio, receita, o);
    },
  };
});

const { AudioSys } = await import('../../src/audio/audio-sys');
await import('../../src/audio/temas'); // registra o sequenciador dos temas no AudioSys (que não os importa)
const { duracaoDoPasso, partituraDaTroca, partituraDoPasso } = await import('../../src/audio/partitura');
const { TEMAS } = await import('../../src/data/musica');
const { criarRng } = await import('../../src/core/rng');
const { Contexto, comoAudioContext } = await import('../support/audio-offline');

describe('trecho de troca de fase', () => {
  it('toca uma vez, no início do 1º compasso da fase 2, no barramento da música; e a fase 2 nunca toca a troca de novo', () => {
    const def = TEMAS.hayato;
    if (def === 'chefe') throw new Error('hayato tem tema');
    chamadas.length = 0;
    const ctx = new Contexto(22050);
    let tick: (() => void) | null = null;
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(ctx), rng: criarRng(5), setInterval: (fn) => ((tick = fn), 1), clearInterval: () => undefined });
    audio.init();
    audio.startMusic('tema:hayato');
    // o 1º passo é agendado já no startMusic (folga de 0,12 s) e o `nextTime` já andou: o instante do passo 0 é o da 1ª chamada
    const t0 = chamadas[0]?.inicio as number;
    const barra = 16 * duracaoDoPasso(def, 1);
    const avanca = (ate: number): void => {
      for (let x = ctx.currentTime; x <= ate + 1e-9; x += 0.025) {
        ctx.currentTime = x;
        (tick as (() => void) | null)?.();
      }
    };
    avanca(1.2 * barra); // fase 1: só passos
    expect(chamadas.every((c) => c.receita !== partituraDaTroca(def))).toBe(true);
    audio.musicaDaFase(2);
    avanca(4.5 * barra);
    const trocas = chamadas.filter((c) => c.receita === partituraDaTroca(def));
    expect(trocas).toHaveLength(1);
    expect(trocas[0]?.destino).toBe('musica');
    expect(trocas[0]?.inicio).toBeCloseTo(t0 + 2 * barra, 9); // pedida no compasso 1, vale no início do compasso 2
    // todo passo da música também vai pelo barramento da música
    expect(chamadas.every((c) => c.destino === 'musica')).toBe(true);
    // e a fase 2 já está tocando as chamadas da fase 2 (percussão extra) depois da troca
    const passosF2 = chamadas.filter((c) => c.inicio !== undefined && c.inicio >= t0 + 2 * barra - 1e-9 && c.receita !== partituraDaTroca(def));
    expect(passosF2.length).toBeGreaterThan(16);
    expect(passosF2[0]?.receita).toBe(partituraDoPasso(def, 32, 0, 2));
  });
});
