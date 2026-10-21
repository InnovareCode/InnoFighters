import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { criarRng } from '../../src/core/rng';
import { AudioSys, TRILHAS, type OpcoesRuido, type OpcoesTom } from '../../src/audio/audio-sys';
import { AudioSys as AudioSysAntes } from '../fixtures/audio-sys-antes-do-chefe';
import { criarContextoFalso } from './_fake-audio';

/*
 * ZENON · Z4 (docs/spec-chefao-zenon.md §5): trilha do chefão em 3/4 (12 passos por compasso) atrás de uma tabela de trilhas. `fight` e
 * `menu` têm de continuar IDÊNTICAS: `tests/fixtures/audio-sys-antes-do-chefe.ts` é o AudioSys de antes da mudança (congelado), e
 * `audio.test.ts` compara com o do protótipo.
 */

type Chamada = { que: 'tone' | 'noise'; opcoes: Record<string, unknown> };

function criar<T extends AudioSys | AudioSysAntes>(Classe: new (dep: ConstructorParameters<typeof AudioSys>[0]) => T): { sys: T; ctx: Record<string, unknown>; chamadas: Chamada[]; roda: (ms: number) => void } {
  const log: unknown[][] = [];
  const ctx = criarContextoFalso(log);
  const relogio = { fns: [] as Array<() => void> };
  const sys = new Classe({
    criarContexto: () => ctx as unknown as AudioContext,
    rng: criarRng(5),
    setInterval: (fn) => {
      relogio.fns.push(fn);
      return 1;
    },
    clearInterval: () => undefined,
  });
  sys.init();
  const chamadas: Chamada[] = [];
  const marca = (v: unknown): unknown => (v === sys.music ? 'music' : v);
  const tone = sys.tone.bind(sys);
  const noise = sys.noise.bind(sys);
  sys.tone = (o: OpcoesTom = {}): void => {
    chamadas.push({ que: 'tone', opcoes: { ...o, dest: marca(o.dest) } });
    tone(o);
  };
  sys.noise = (o: OpcoesRuido = {}): void => {
    chamadas.push({ que: 'noise', opcoes: { ...o, dest: marca(o.dest) } });
    noise(o);
  };
  return {
    sys,
    ctx,
    chamadas,
    roda: (ms: number) => {
      ctx['currentTime'] = (ctx['currentTime'] as number) + ms / 1000;
      for (const f of relogio.fns.slice(-1)) f();
    },
  };
}

describe('Z4 · as trilhas de luta e de menu seguem idênticas ao AudioSys de antes da mudança', () => {
  it.each<'fight' | 'menu'>(['fight', 'menu'])('trilha %s: mesmas chamadas tone/noise (tipo, f0, f1, t, vol, at, filtro, dest) em 2 laços completos', (trilha) => {
    const novo = criar(AudioSys);
    const antes = criar(AudioSysAntes);
    novo.sys.startMusic(trilha);
    antes.sys.startMusic(trilha);
    for (let i = 0; i < 700; i++) {
      novo.roda(100);
      antes.roda(100);
    }
    expect(antes.chamadas.length).toBeGreaterThan(400);
    expect(novo.chamadas).toEqual(antes.chamadas);
    expect(novo.sys.loops).toBe(antes.sys.loops);
    expect(novo.sys.loops).toBeGreaterThanOrEqual(2);
  });

  it('`musicaDaFase(2)` em fight/menu não muda nada (sem andamento nem arranjo próprios)', () => {
    for (const trilha of ['fight', 'menu'] as const) {
      const a = criar(AudioSys);
      const b = criar(AudioSys);
      a.sys.startMusic(trilha);
      b.sys.startMusic(trilha);
      b.sys.musicaDaFase(2);
      for (let i = 0; i < 300; i++) {
        a.roda(100);
        b.roda(100);
      }
      expect(b.chamadas).toEqual(a.chamadas);
    }
  });

  it('a tabela: fight 150 bpm x 16 x 4, menu 92 bpm x 16 x 4, chefe 138 bpm x 12 x 8', () => {
    expect(TRILHAS.fight).toEqual({ bpm: 150, passosPorCompasso: 16, compassos: 4 });
    expect(TRILHAS.menu).toEqual({ bpm: 92, passosPorCompasso: 16, compassos: 4 });
    expect(TRILHAS.chefe).toEqual({ bpm: 138, passosPorCompasso: 12, compassos: 8, andamentoFase2: 1.12 });
  });
});

describe('Z4 · valsa do chefão: compasso de 12 passos', () => {
  /** Chama `playChefe` direto em cada passo de um compasso e devolve o que saiu. */
  function compasso(fase: 1 | 2, c = 0): { passo: number; chamadas: Chamada[] }[] {
    const { sys, chamadas } = criar(AudioSys);
    sys.fase = fase;
    const saida: { passo: number; chamadas: Chamada[] }[] = [];
    for (let p = 0; p < 12; p++) {
      chamadas.length = 0;
      sys.playChefe(c * 12 + p, 10, 0.1);
      saida.push({ passo: p, chamadas: [...chamadas] });
    }
    return saida;
  }
  const bumbo = (c: Chamada): boolean => c.que === 'tone' && c.opcoes['type'] === 'sine' && c.opcoes['f0'] === 150;
  const prato = (c: Chamada): boolean => c.que === 'noise' && c.opcoes['type'] === 'highpass' && c.opcoes['f0'] === 6000;
  const orgao = (c: Chamada): boolean => c.que === 'tone' && c.opcoes['type'] === 'sawtooth' && (c.opcoes['vol'] as number) === 0.05;
  const bordao = (c: Chamada): boolean => c.que === 'tone' && c.opcoes['type'] === 'sawtooth' && (c.opcoes['vol'] as number) === 0.2;

  it('fase 1: bumbo e bordão só no passo 0; órgão nos passos 4 e 8; prato só no passo 8', () => {
    const c = compasso(1);
    expect(c.filter((p) => p.chamadas.some(bumbo)).map((p) => p.passo)).toEqual([0]);
    expect(c.filter((p) => p.chamadas.some(bordao)).map((p) => p.passo)).toEqual([0]);
    expect(c.filter((p) => p.chamadas.some(orgao)).map((p) => p.passo)).toEqual([4, 8]);
    expect(c.filter((p) => p.chamadas.some(prato)).map((p) => p.passo)).toEqual([8]);
  });

  it('fase 2: bumbo nos passos 0, 4 e 8 e o órgão uma oitava abaixo; o prato continua só no passo 8', () => {
    const f1 = compasso(1);
    const f2 = compasso(2);
    expect(f2.filter((p) => p.chamadas.some(bumbo)).map((p) => p.passo)).toEqual([0, 4, 8]);
    expect(f2.filter((p) => p.chamadas.some(prato)).map((p) => p.passo)).toEqual([8]);
    const fOrgao = (c: { passo: number; chamadas: Chamada[] }[]): number[] =>
      c.find((p) => p.passo === 4)!.chamadas.filter(orgao).map((x) => x.opcoes['f0'] as number);
    expect(fOrgao(f1)).toHaveLength(3);
    expect(fOrgao(f2).map((f, i) => f * 2 - (fOrgao(f1)[i] as number))).toEqual([0, 0, 0]); // a fase 1 é o dobro (1 oitava acima)
  });

  it('o acorde de órgão é em quintas sobre a raiz do compasso (Ré, depois Mi♭ no 2º compasso)', () => {
    const f = (c: number): number[] => compasso(1, c).find((p) => p.passo === 4)!.chamadas.filter(orgao).map((x) => x.opcoes['f0'] as number);
    const hz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
    expect(f(0).map((x) => Math.round(x * 100) / 100)).toEqual([hz(62), hz(69), hz(74)].map((x) => Math.round(x * 100) / 100)); // Ré, Lá, Ré
    expect(f(1).map((x) => Math.round(x * 100) / 100)).toEqual([hz(63), hz(70), hz(75)].map((x) => Math.round(x * 100) / 100)); // Mi♭, Si♭, Mi♭
  });

  it('o laço tem 96 passos (8 compassos x 12) e a melodia do cravo tem uma nota em passos de compasso', () => {
    const { sys, chamadas, roda } = criar(AudioSys);
    sys.startMusic('chefe');
    let ultimo = -1;
    let laços = 0;
    for (let i = 0; i < 4000 && laços < 1; i++) {
      roda(100);
      if (sys.step < ultimo) laços++;
      ultimo = sys.step;
    }
    expect(laços).toBe(1);
    expect(sys.loops).toBe(1);
    const cravo = chamadas.filter((c) => c.que === 'tone' && c.opcoes['type'] === 'triangle' && c.opcoes['filter'] !== undefined);
    // melodia: 4+... notas por compasso, todas dentro do Ré frígio dominante (classes de altura 2, 3, 6, 7, 9, 10, 0)
    const escala = new Set([2, 3, 6, 7, 9, 10, 0]);
    expect(cravo.length).toBeGreaterThan(30);
    for (const c of cravo) {
      const m = Math.round(69 + 12 * Math.log2((c.opcoes['f0'] as number) / 440));
      expect(escala.has(((m % 12) + 12) % 12), `nota MIDI ${m}`).toBe(true);
    }
  });
});

describe('Z4 · fase 2 da trilha: só vira no início do compasso seguinte', () => {
  /** Roda o scheduler com um `playChefe` instrumentado e devolve (passo, spb, fase) de cada passo tocado. */
  function rodarComPedido(passoDoPedido: number): { passo: number; spb: number; fase: number }[] {
    const { sys, roda } = criar(AudioSys);
    const visto: { passo: number; spb: number; fase: number }[] = [];
    const original = sys.playChefe.bind(sys);
    sys.playChefe = (step: number, t: number, spb: number): void => {
      visto.push({ passo: step, spb, fase: sys.fase });
      original(step, t, spb);
    };
    sys.startMusic('chefe');
    let pediu = false;
    for (let i = 0; i < 400 && visto.length < 40; i++) {
      roda(40);
      const ultimo = visto[visto.length - 1];
      if (!pediu && ultimo && ultimo.passo >= passoDoPedido) {
        sys.musicaDaFase(2);
        pediu = true;
      }
    }
    return visto;
  }

  it('pedida no meio do compasso (passo 5): os passos 6 a 11 seguem na fase 1 e o spb só muda no passo 12', () => {
    const v = rodarComPedido(5);
    const spb1 = 60 / 138 / 4;
    const spb2 = 60 / (138 * 1.12) / 4;
    // o pedido chega entre dois lotes do scheduler (ele agenda ~0,15 s à frente), então comparamos pelo limite do compasso:
    const doCompasso0 = v.filter((p) => p.passo < 12);
    expect(doCompasso0.every((p) => p.fase === 1 && Math.abs(p.spb - spb1) < 1e-12)).toBe(true);
    const doCompasso1 = v.filter((p) => p.passo >= 12 && p.passo < 24);
    expect(doCompasso1.length).toBe(12);
    // um compasso inteiro na mesma fase: nunca metade 1, metade 2
    expect(new Set(doCompasso1.map((p) => p.fase)).size).toBe(1);
    const noInicio = v.find((p) => p.passo === 12);
    const depois = v.filter((p) => p.passo >= 12);
    expect(depois.every((p) => p.fase === noInicio!.fase)).toBe(true);
    expect(noInicio!.fase).toBe(2);
    expect(depois.every((p) => Math.abs(p.spb - spb2) < 1e-12)).toBe(true);
  });

  it('o andamento da fase 2 é 12% mais rápido', () => {
    const v = rodarComPedido(0);
    const f2 = v.find((p) => p.fase === 2)!;
    const f1 = v.find((p) => p.fase === 1)!;
    expect(f1.spb / f2.spb).toBeCloseTo(1.12, 10);
  });

  it('startMusic de novo com a trilha já tocando devolve a fase 1 (luta nova), também só no compasso seguinte', () => {
    const { sys, roda } = criar(AudioSys);
    sys.startMusic('chefe');
    sys.musicaDaFase(2);
    for (let i = 0; i < 100; i++) roda(100);
    expect(sys.fase).toBe(2);
    sys.startMusic('chefe');
    for (let i = 0; i < 100; i++) roda(100);
    expect(sys.fase).toBe(1);
  });

  it('trocar de trilha também zera a fase', () => {
    const { sys, roda } = criar(AudioSys);
    sys.startMusic('chefe');
    sys.musicaDaFase(2);
    for (let i = 0; i < 50; i++) roda(100);
    expect(sys.fase).toBe(2);
    sys.startMusic('fight');
    expect(sys.fase).toBe(1);
  });
});

describe('Z4 · nenhum sorteio do jogo no áudio', () => {
  it('src/audio não usa Math.random (a trilha é determinística em `step`; o buffer de ruído usa o RNG próprio)', () => {
    const dir = fileURLToPath(new URL('../../src/audio/', import.meta.url));
    const achados: string[] = [];
    for (const arq of readdirSync(dir)) {
      if (!arq.endsWith('.ts')) continue;
      const texto = readFileSync(dir + arq, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (/Math\.random/.test(texto)) achados.push(arq);
    }
    expect(achados).toEqual([]);
  });

  it('a mesma trilha com o mesmo RNG gera chamadas idênticas (nada de acaso na partitura)', () => {
    const a = criar(AudioSys);
    const b = criar(AudioSys);
    a.sys.startMusic('chefe');
    b.sys.startMusic('chefe');
    for (let i = 0; i < 300; i++) {
      a.roda(100);
      b.roda(100);
    }
    expect(a.chamadas.length).toBeGreaterThan(100);
    expect(b.chamadas).toEqual(a.chamadas);
  });
});
