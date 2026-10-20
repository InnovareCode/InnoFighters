import { describe, expect, it } from 'vitest';
import type { EventoLuta } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { AudioSys } from '../../src/audio/audio-sys';
import { ATRASO_PERFECT_MS, reagirAosEventos, sonsDoEvento } from '../../src/audio/eventos';
import { TEM_PROTOTIPO, trecho, type Obj } from './_prototipo';
import { criarContextoFalso, type RegistroAudio } from './_fake-audio';

describe('audio/eventos: evento -> som', () => {
  const ev = (e: EventoLuta): string => JSON.stringify(sonsDoEvento(e));
  it('mapeia cada evento para a chamada que o protótipo fazia', () => {
    expect(ev({ tipo: 'swing', lutador: 0, golpe: 'punch' })).toBe('[{"metodo":"swing","args":[0]}]');
    expect(ev({ tipo: 'swing', lutador: 1, golpe: 'kick' })).toBe('[{"metodo":"swing","args":[1]}]');
    expect(ev({ tipo: 'special', lutador: 0, pitch: 1.05 })).toBe('[{"metodo":"special","args":[1.05]}]');
    expect(ev({ tipo: 'dust', x: 1, n: 2, power: 1 })).toBe('[]');
    expect(ev({ tipo: 'clash', x: 1, y: 2 })).toBe('[{"metodo":"fireballHit","args":[]}]');
    expect(sonsDoEvento({ tipo: 'throw', atacante: 0, defensor: 1, pitch: 0.8, texto: { x: 0, y: 0, s: '', col: '', size: 1 } }).map((s) => s.metodo)).toEqual(['kick', 'hurt']);
    expect(sonsDoEvento({ tipo: 'round', fase: 'end', round: 1, vencedor: 0, fimDaLuta: false }).map((s) => s.metodo)).toEqual(['victory']);
    expect(sonsDoEvento({ tipo: 'perfect', vencedor: 0 })).toEqual([{ metodo: 'uiPerfect', args: [], atrasoMs: ATRASO_PERFECT_MS }]);
  });

  it('reagirAosEventos toca na ordem, agenda o perfect em 700 ms e ignora método inexistente', () => {
    const tocados: string[] = [];
    const audio = { hit: 0, punch: () => tocados.push('punch'), hurt: (p: number) => tocados.push('hurt' + p), uiPerfect: () => tocados.push('perfect') };
    const agendados: number[] = [];
    reagirAosEventos(
      audio,
      [
        { tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 2, contragolpe: false, projetil: false, acertos: 1, texto: null },
        { tipo: 'swing', lutador: 0, golpe: 'punch' }, // swing não existe no objeto: ignorado
        { tipo: 'perfect', vencedor: 0 },
      ],
      (fn, ms) => {
        agendados.push(ms);
        fn();
      },
    );
    expect(tocados).toEqual(['punch', 'hurt2', 'perfect']);
    expect(agendados).toEqual([700]);
  });
});

/** Roda o AudioSys do protótipo (seção 2 + extensões) com um AudioContext gravador. */
function audioDoPrototipo(semente: number, log: RegistroAudio, ctx: Obj, relogio: { id: number; fns: Array<() => void> }): Obj {
  const rng = criarRng(semente);
  const M = Object.create(Math) as Obj;
  M['random'] = (): number => rng.proximo();
  const corpo =
    trecho('const AudioSys = {', '/* ---- ARTE EMBUTIDA') + '\n' + trecho('// sons da abertura', '// ---------- logotipo') + '\nreturn AudioSys;';
  const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
  const janela = { AudioContext: function () { return ctx; } };
  void log;
  return new Function('Math', 'window', 'midi', 'setInterval', 'clearInterval', corpo)(
    M,
    janela,
    midi,
    (fn: () => void) => {
      relogio.fns.push(fn);
      return ++relogio.id;
    },
    () => undefined,
  ) as Obj;
}

describe.skipIf(!TEM_PROTOTIPO)('audio/audio-sys == AudioSys do protótipo (mesmas chamadas ao Web Audio)', () => {
  const chamadas: Array<[string, ...unknown[]]> = [
    ['swing', 0], ['swing', 1], ['punch'], ['kick'], ['hurt', 1.3], ['block'], ['jump'], ['deny'], ['special', 1.2], ['fireballLaunch'], ['fireballHit'],
    ['ko', 0.8], ['land'], ['roundStart'], ['fight'], ['timeOver'], ['victory'], ['uiMove'], ['uiOk'], ['uiBack'], ['uiPause'], ['uiTick'],
    ['uiSelect', 1.55], ['uiVs'], ['uiPerfect'], ['introWhoosh'], ['introHit', 3], ['logoSlam'],
  ];

  function rodar(proto: boolean): RegistroAudio {
    const log: RegistroAudio = [];
    const ctx = criarContextoFalso(log);
    const relogio = { id: 0, fns: [] as Array<() => void> };
    const sys: Obj = proto
      ? audioDoPrototipo(77, log, ctx, relogio)
      : new AudioSys({
          criarContexto: () => ctx as unknown as AudioContext,
          rng: criarRng(77),
          setInterval: (fn) => {
            relogio.fns.push(fn);
            return ++relogio.id;
          },
          clearInterval: () => undefined,
        });
    sys['init']();
    sys['resume']();
    sys['setMusicVol'](0.3);
    sys['setSfxVol'](0.6);
    for (const [nome, ...args] of chamadas) {
      log.push(['>>', nome]);
      sys[nome](...args);
    }
    sys['toggleMute']();
    sys['toggleMute']();
    for (const trilha of ['fight', 'menu', 'fight']) {
      log.push(['>> musica', trilha]);
      sys['startMusic'](trilha);
      for (let i = 0; i < 220; i++) {
        ctx['currentTime'] = (ctx['currentTime'] as number) + 0.1;
        for (const f of relogio.fns.slice(-1)) f();
      }
    }
    sys['stopMusic']();
    // buffer de ruído (preenchido pelo RNG com semente)
    log.push(['ruido', Array.from((ctx['__buffers'] as Float32Array[])[0] ?? []).slice(0, 50)]);
    return log;
  }

  it('todas as vozes, efeitos, sons de UI/abertura e as duas trilhas geram o mesmo grafo de áudio', () => {
    const esperado = rodar(true);
    const obtido = rodar(false);
    expect(esperado.length).toBeGreaterThan(2000);
    const i = esperado.findIndex((l, k) => JSON.stringify(l) !== JSON.stringify(obtido[k]));
    expect(i < 0 ? 'igual' : `diverge na linha ${i}: ${JSON.stringify(esperado[i])} != ${JSON.stringify(obtido[i])}`).toBe('igual');
    expect(obtido.length).toBe(esperado.length);
  });

  it('sem AudioContext (navegador sem suporte) nada quebra', () => {
    const sys = new AudioSys({ criarContexto: () => null });
    sys.init();
    expect(() => {
      sys.punch();
      sys.startMusic('menu');
      sys.stopMusic();
      sys.toggleMute();
    }).not.toThrow();
  });
});
