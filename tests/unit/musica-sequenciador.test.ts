import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AudioSys, fontesDaVoz } from '../../src/audio/audio-sys';
import { compilarTema, duracaoDoPasso, fontesDaChamadaMusical, partituraDaTroca, partituraDoPasso, varianteDoLaco } from '../../src/audio/partitura';
import { tocarReceita, type ChamadaMusical, type ChamadaReceita } from '../../src/audio/receitas';
import { temaDaTrilha, temaDoLutador, trilhaDaLuta } from '../../src/audio/temas';
import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { lerAcorde, lerMelodia, lerPerc, semitonsDoGrau, TEMAS, type IdTema, type TemaDef } from '../../src/data/musica';
import { Contexto, comoAudioContext } from '../support/audio-offline';

/*
 * T1 (N0): o sequenciador dos temas por lutador, sem navegador. A partitura é PURA (o mesmo passo, laço e fase dão sempre as mesmas chamadas), a fase 2
 * só vira no início do compasso seguinte e o AudioSys das trilhas fixas não foi tocado (audio.test e audio-chefe.test continuam o oráculo).
 */
const TEMAS_LISTA = Object.entries(TEMAS).filter((e): e is [IdTema, TemaDef] => e[1] !== 'chefe');

describe('notação das pistas', () => {
  it('melodia: graus absolutos, pausas, prolongamentos e oitavas', () => {
    expect(lerMelodia('3 . 2 3 | 4 . 3 2', 8, 5)).toEqual([
      { passo: 0, grau: 3, passos: 1 },
      { passo: 2, grau: 2, passos: 1 },
      { passo: 3, grau: 3, passos: 1 },
      { passo: 4, grau: 4, passos: 1 },
      { passo: 6, grau: 3, passos: 1 },
      { passo: 7, grau: 2, passos: 1 },
    ]);
    expect(lerMelodia("0 - - 2' | 1, - . .", 8, 5)).toEqual([
      { passo: 0, grau: 0, passos: 3 },
      { passo: 3, grau: 7, passos: 1 },
      { passo: 4, grau: -4, passos: 2 },
    ]);
  });
  it('rejeita compasso com o número errado de tokens, prolongamento sem nota e token inválido', () => {
    expect(() => lerMelodia('3 . 2', 8, 5)).toThrow(/esperava 8/);
    expect(() => lerMelodia('- 3 . . . . . .', 8, 5)).toThrow(/prolongar/);
    expect(() => lerMelodia('3 . x . . . . .', 8, 5)).toThrow(/token/);
    expect(() => lerMelodia('. 3 -', 3, 5)).not.toThrow();
    expect(() => lerAcorde('x . y .', 4)).toThrow(/token/);
    expect(lerAcorde('x - . x', 4)).toEqual([
      { passo: 0, grau: 0, passos: 2 },
      { passo: 3, grau: 0, passos: 1 },
    ]);
    expect(lerPerc('3.21 .2..', 8)).toEqual([1, 0, 0.75, 0.45, 0, 0.75, 0, 0]);
    expect(() => lerPerc('3.4', 3)).toThrow(/caractere/);
    expect(() => lerPerc('3.', 3)).toThrow(/esperava 3/);
  });
  it('semitonsDoGrau: a oitava vem do quociente, também para graus negativos', () => {
    const e = [0, 2, 4, 7, 9];
    expect(semitonsDoGrau(e, 0)).toBe(0);
    expect(semitonsDoGrau(e, 4)).toBe(9);
    expect(semitonsDoGrau(e, 5)).toBe(12);
    expect(semitonsDoGrau(e, 7)).toBe(16);
    expect(semitonsDoGrau(e, -1)).toBe(-3);
    expect(semitonsDoGrau(e, -5)).toBe(-12);
  });
});

describe('partituraDoPasso é função pura do passo, do laço e da fase', () => {
  it.each(TEMAS_LISTA)('%s: mesma chamada duas vezes (mesmo objeto) e, compilando de novo uma cópia do dado, mesmo conteúdo', (_id, def) => {
    const a = compilarTema(def);
    const copia = compilarTema(structuredClone(def)); // outro objeto = outro cache
    expect(copia).not.toBe(a);
    for (const laco of [0, 1, 2, 3]) {
      for (const fase of [1, 2] as const) {
        for (let p = 0; p < a.passosTotais; p++) {
          const x = partituraDoPasso(a, p, laco, fase);
          expect(partituraDoPasso(a, p, laco, fase)).toBe(x);
          expect(JSON.stringify(partituraDoPasso(copia, p, laco, fase))).toBe(JSON.stringify(x));
        }
      }
    }
    expect(JSON.stringify(partituraDaTroca(copia))).toBe(JSON.stringify(partituraDaTroca(a)));
    // o passo e o laço são cíclicos: o passo do laço seguinte é o mesmo laço
    expect(partituraDoPasso(a, a.passosTotais + 3, 2, 1)).toBe(partituraDoPasso(a, 3, 2, 1));
    expect(varianteDoLaco(0)).toBe(0);
    expect(varianteDoLaco(1)).toBe(1);
    expect(varianteDoLaco(2)).toBe(2);
    expect(varianteDoLaco(7)).toBe(1);
    expect(varianteDoLaco(8)).toBe(2);
  });

  it.each(TEMAS_LISTA)('%s: 2 compassos de abertura sem lead só no 1º laço', (_id, def) => {
    const t = compilarTema(def);
    const abertura = def.abertura ?? 2;
    const temLead = (laco: number, compasso: number): boolean => {
      for (let p = 0; p < t.passosPorCompasso; p++) if (partituraDoPasso(t, compasso * t.passosPorCompasso + p, laco, 1).some((c) => c.pista === 'lead')) return true;
      return false;
    };
    for (let c = 0; c < abertura; c++) expect(temLead(0, c), `laço 0, compasso ${c}`).toBe(false);
    expect(temLead(0, abertura)).toBe(true);
    expect(temLead(2, 0)).toBe(true); // do 2º laço (par) em diante o lead entra no compasso 0
    expect(temLead(1, 0)).toBe(true);
  });

  it.each(TEMAS_LISTA)('%s: no laço ímpar o lead troca de oitava ou de instrumento', (_id, def) => {
    const t = compilarTema(def);
    const notas = (laco: number): number[] => {
      const n: number[] = [];
      for (let p = 0; p < t.passosTotais; p++) {
        const doPasso = partituraDoPasso(t, p, laco, 1).filter((c) => c.nota !== undefined).map((c) => c.nota as number);
        if (doPasso.length) n.push(Math.min(...doPasso));
      }
      return n;
    };
    const par = notas(2);
    const impar = notas(1);
    expect(impar).toHaveLength(par.length);
    const esperado = 12 * (def.lead.impar?.oitava ?? (def.lead.impar?.instrumento ? 0 : 1));
    impar.forEach((n, i) => expect(n - (par[i] as number)).toBe(esperado));
    if (def.lead.impar?.instrumento) {
      const assinatura = (variante: 1 | 2): string => {
        const c = (t.tabela[variante]?.[0] ?? []).flat().filter((x) => x.nota !== undefined);
        return JSON.stringify(c.map((x) => ({ ...x, f0: 0, f1: 0, f: 0, t: 0, quando: 0, nota: 0, filtro: x.k === 'T' ? { tipo: x.filtro?.tipo, rel: x.filtro ? x.filtro.f > 100 : null } : null })).slice(0, 3));
      };
      expect(assinatura(1)).not.toBe(assinatura(2)); // o instrumento é outro
    }
  });

  it.each(TEMAS_LISTA)('%s: fase 2 = andamento +8%%, percussão extra, baixo mais grave (baixoOitava) e contracanto', (_id, def) => {
    const t = compilarTema(def);
    expect(duracaoDoPasso(def, 2)).toBeCloseTo(duracaoDoPasso(def, 1) / 1.08, 12);
    expect(def.fase2.andamento).toBeCloseTo(1.08, 12);
    const todas = (fase: 1 | 2): ChamadaMusical[] => Array.from({ length: t.passosTotais }, (_, p) => partituraDoPasso(t, p, 2, fase)).flat();
    const f1 = todas(1);
    const f2 = todas(2);
    expect(f2.filter((c) => c.pista === 'perc').length).toBeGreaterThan(f1.filter((c) => c.pista === 'perc').length);
    expect(f2.filter((c) => c.pista === 'lead').length).toBeGreaterThan(f1.filter((c) => c.pista === 'lead').length); // o contracanto
    const grave = (cs: ChamadaMusical[]): number => Math.min(...cs.filter((c) => c.pista === 'baixo' && c.k === 'T').map((c) => (c.k === 'T' ? c.f0 : Infinity)));
    expect(grave(f2) / grave(f1)).toBeCloseTo(Math.pow(2, def.fase2.baixoOitava), 6);
  });

  it.each(TEMAS_LISTA)('%s: o trecho de troca de fase tem de 1 a 6 eventos dentro de 1,5 s', (_id, def) => {
    const troca = partituraDaTroca(def);
    expect(troca.length).toBeGreaterThanOrEqual(1);
    expect(troca.length).toBeLessThanOrEqual(6);
    for (const c of troca) {
      expect(c.k).not.toBe('V');
      expect(c.quando ?? 0).toBeGreaterThanOrEqual(0);
      expect(c.quando ?? 0).toBeLessThanOrEqual(1.5);
    }
  });
});

// --- o sequenciador dentro do AudioSys, sobre o mini motor offline ---

interface Passo {
  readonly step: number;
  readonly t: number;
  readonly fase: 1 | 2;
  readonly laco: number;
}

function criarSeq(): { ctx: Contexto; audio: AudioSys; passos: Passo[]; ate: (t: number) => void; tick: () => void } {
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
  const passos: Passo[] = [];
  const orig = audio.playTema.bind(audio);
  audio.playTema = (tema, step, t) => {
    passos.push({ step, t, fase: audio.fase, laco: audio.loops });
    orig(tema, step, t);
  };
  return {
    ctx,
    audio,
    passos,
    tick: () => (tick as (() => void) | null)?.(),
    ate: (t) => {
      for (let x = ctx.currentTime; x <= t + 1e-9; x += 0.025) {
        ctx.currentTime = x;
        (tick as (() => void) | null)?.();
      }
    },
  };
}

describe('AudioSys.startMusic("tema:<id>") e o scheduler', () => {
  const hayato = TEMAS.hayato as TemaDef;
  const spb = duracaoDoPasso(hayato, 1);
  const spb2 = duracaoDoPasso(hayato, 2);
  const barra = 16 * spb;

  it('os passos são contíguos, o laço volta ao passo 0 sem emenda (todos os intervalos iguais) e conta os laços', () => {
    const s = criarSeq();
    s.audio.startMusic('tema:hayato');
    s.ate(2.2 * 128 * spb);
    expect(s.passos.length).toBeGreaterThan(256);
    s.passos.forEach((p, i) => {
      expect(p.step).toBe(i % 128);
      expect(p.laco).toBe(Math.floor(i / 128));
      expect(p.fase).toBe(1);
      if (i > 0) expect(p.t - (s.passos[i - 1] as Passo).t).toBeCloseTo(spb, 9);
    });
  });

  it('chamar o mesmo tema de novo não reinicia a música (o continue da luta)', () => {
    const s = criarSeq();
    s.audio.startMusic('tema:hayato');
    s.ate(0.5);
    const passo = s.audio.step;
    const n = s.passos.length;
    s.audio.startMusic('tema:hayato');
    expect(s.audio.step).toBe(passo);
    expect(s.passos.length).toBe(n);
    s.audio.startMusic('fight'); // outra trilha reinicia e solta o tema
    expect(s.audio.step).toBe(0);
    s.ate(1.5);
    expect(s.audio.kind).toBe('fight');
  });

  it('a fase 2 pedida no meio do compasso só vale no início do compasso seguinte; o andamento muda ali', () => {
    const s = criarSeq();
    s.audio.startMusic('tema:hayato');
    const t0 = s.audio.nextTime;
    s.ate(0.4 * barra);
    s.audio.musicaDaFase(2); // no meio do compasso 0
    s.ate(2.6 * barra);
    const antes = s.passos.filter((p) => p.t < t0 + barra - 1e-9);
    const depois = s.passos.filter((p) => p.t >= t0 + barra - 1e-9);
    expect(antes.length).toBe(16);
    expect(antes.every((p) => p.fase === 1)).toBe(true);
    expect(depois.every((p) => p.fase === 2)).toBe(true);
    expect((depois[0] as Passo).step).toBe(16); // o 1º passo da fase 2 é o início do compasso 1
    expect((depois[0] as Passo).t).toBeCloseTo(t0 + barra, 9);
    depois.slice(1).forEach((p, i) => expect(p.t - (depois[i] as Passo).t).toBeCloseTo(spb2, 9));
  });

  it('uma luta nova (startMusic do mesmo tema) volta para a fase 1 no compasso seguinte', () => {
    const s = criarSeq();
    s.audio.startMusic('tema:hayato');
    s.audio.musicaDaFase(2);
    s.ate(3 * barra);
    expect(s.audio.fase).toBe(2);
    s.audio.startMusic('tema:hayato'); // continue: mesma trilha, não reinicia, mas a fase pedida volta a 1
    s.ate(3 * barra + 2.2 * barra / 1.08);
    expect(s.audio.fase).toBe(1);
  });

  it('as trilhas fixas continuam sem tema: o scheduler antigo, os mesmos passos', () => {
    const s = criarSeq();
    s.audio.startMusic('fight');
    s.ate(1);
    expect(s.passos).toHaveLength(0); // playTema nunca foi chamado
    expect(temaDaTrilha('fight')).toBeNull();
    expect(temaDaTrilha('menu')).toBeNull();
    expect(temaDaTrilha('chefe')).toBeNull();
    expect(temaDaTrilha('tema:hayato')).not.toBeNull();
  });
});

describe('trilhaDaLuta (spec §3.3)', () => {
  const regras = { temasMusicais: true };
  const sem = { temasMusicais: false };
  it('chave desligada ou regras.temasMusicais = false: a música de hoje', () => {
    for (const id of IDS_LUTADORES) {
      expect(trilhaDaLuta({ c2: id }, regras, false)).toBe('fight');
      expect(trilhaDaLuta({ c2: id, chefe: false }, regras, false)).toBe('fight');
      expect(trilhaDaLuta({ c2: id, chefe: true }, regras, false)).toBe('fight'); // chefão sem `trilha`
      expect(trilhaDaLuta({ c2: id, chefe: true }, regras, false, 'chefe')).toBe('chefe');
      expect(trilhaDaLuta({ c2: id }, sem, true)).toBe('fight');
      expect(trilhaDaLuta({ c2: id, chefe: true }, sem, true, 'chefe')).toBe('chefe');
      expect(trilhaDaLuta({ c2: id, chefe: true }, sem, true)).toBe('fight');
    }
  });
  it('ligada: o tema do c2 em todos os modos (rival, chefão guardião, VERSUS, treino, demo); o ZENON toca a valsa', () => {
    for (const id of IDS_LUTADORES) {
      const esperado = id === 'zenon' ? 'chefe' : `tema:${id}`;
      expect(trilhaDaLuta({ c2: id }, regras, true)).toBe(esperado);
      expect(trilhaDaLuta({ c2: id, chefe: true }, regras, true)).toBe(esperado);
      expect(trilhaDaLuta({ c2: id, chefe: true }, regras, true, 'chefe')).toBe(esperado);
    }
  });
  it('o espelho (c1 === c2) toca o tema do lutador; cada id de tema existe', () => {
    const espelho: IdLutador = 'caio';
    expect(trilhaDaLuta({ c2: espelho }, regras, true)).toBe('tema:caio');
    for (const id of IDS_LUTADORES) expect(temaDoLutador(id) === null).toBe(id === 'zenon');
  });
  it('o padrão da chave é desligado (o jogo toca a música de hoje até a escuta do dono)', () => {
    expect(trilhaDaLuta({ c2: 'hayato' }, regras)).toBe('fight');
    expect(trilhaDaLuta({ c2: 'hayato', chefe: true }, regras, undefined, 'chefe')).toBe('chefe');
  });
});

describe('tocarReceita com destino "musica" e início absoluto', () => {
  type Tom = Record<string, unknown>;
  const fake = (): { audio: Parameters<typeof tocarReceita>[0]; tons: Tom[]; ruidos: Tom[]; vozes: Tom[] } => {
    const tons: Tom[] = [];
    const ruidos: Tom[] = [];
    const vozes: Tom[] = [];
    const audio = { music: { id: 'music' } as unknown as AudioNode, tone: (o: Tom) => void tons.push(o), noise: (o: Tom) => void ruidos.push(o), vozFormante: (o: Tom) => void vozes.push(o) };
    return { audio: audio as unknown as Parameters<typeof tocarReceita>[0], tons, ruidos, vozes };
  };
  const receita: ChamadaReceita[] = [
    { k: 'T', tipo: 'sine', f0: 100, t: 0.2, vol: 0.3, quando: 0.01 },
    { k: 'R', tipo: 'lowpass', f0: 1000, Q: 1, t: 0.1, vol: 0.2, quando: 0.02 },
    { k: 'V', onda: 'sawtooth', f: [100, 100, 100], t: 1, vol: 0.1, formantes: [500, 1000, 2500], q: 5, ganhoF3: 0.3, quando: 0.03 },
  ];
  it('com `inicio`, toca em `at` absoluto no barramento da música, sem `when`; a voz converte para `when` e não entra no teto de 32 fontes', () => {
    const f = fake();
    expect(tocarReceita(f.audio, receita, { destino: 'musica', inicio: 5, agora: 4.9 })).toBe(3);
    expect(f.tons[0]).toMatchObject({ at: 5.01, dest: (f.audio as unknown as { music: unknown }).music });
    expect(f.tons[0]).not.toHaveProperty('when');
    expect(f.ruidos[0]).toMatchObject({ at: 5.02 });
    expect(f.vozes[0]?.['when'] as number).toBeCloseTo(5.03 - 4.9, 9);
    expect(f.vozes[0]).toMatchObject({ registrar: false });
  });
  it('sem `destino`/`inicio` nada muda: `when` relativo, sem `dest`, e a voz continua se registrando', () => {
    const f = fake();
    tocarReceita(f.audio, receita);
    expect(f.tons[0]).toMatchObject({ when: 0.01 });
    expect(f.tons[0]).not.toHaveProperty('dest');
    expect(f.tons[0]).not.toHaveProperty('at');
    expect(f.vozes[0]).not.toHaveProperty('registrar');
  });
  it('vozFormante com registrar:false não gasta fonte do teto dos efeitos', () => {
    const ctx = new Contexto(22050);
    const a = new AudioSys({ criarContexto: () => comoAudioContext(ctx), rng: criarRng(5) });
    a.init();
    const v = { onda: 'sawtooth' as const, f: [100, 100, 100] as const, t: 1, vol: 0.1, formantes: [500, 1000, 2500] as const, q: 5, ganhoF3: 0.3, coro: { cents: 7, sub: 0.2 } };
    a.vozFormante({ ...v, registrar: false });
    expect(a.fontesAtivas()).toBe(0);
    a.vozFormante(v);
    expect(a.fontesAtivas()).toBe(fontesDaVoz(v));
  });
});

describe('contagem de fontes e determinismo', () => {
  it('fontesDaChamadaMusical bate com fontesDaVoz nas combinações de voz', () => {
    for (const vib of [false, true]) for (const asp of [false, true]) for (const sopro of [false, true]) for (const coro of [undefined, { cents: 7, sub: 0 }, { cents: 7, sub: 0.3 }]) {
      const o = { ...(vib ? { vib: { hz: 5, prof: 0.01, atraso: 0.1 } } : {}), ...(asp ? { asp: { hz: 30, prof: 0.2 } } : {}), ...(sopro ? { sopro: 0.1 } : {}), ...(coro ? { coro } : {}) };
      const c = { k: 'V', onda: 'sawtooth', f: [100, 100, 100], t: 1, vol: 0.1, formantes: [500, 1000, 2500], q: 5, ganhoF3: 0.3, pista: 'baixo', afinada: true, ...o } as ChamadaMusical;
      expect(fontesDaChamadaMusical(c)).toBe(fontesDaVoz(o));
    }
    expect(fontesDaChamadaMusical({ k: 'T', tipo: 'sine', f0: 1, t: 1, vol: 1, pista: 'perc', afinada: false })).toBe(1);
  });

  it('nenhum Math.random (nem Date, nem performance) em src/audio e src/data/musica', () => {
    const lista = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? lista(join(dir, n)) : [join(dir, n)]));
    for (const f of [...lista('src/audio'), ...lista('src/data/musica')].filter((x) => x.endsWith('.ts'))) {
      const texto = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(texto, f).not.toMatch(/Math\.random/);
      if (f.includes('musica') || f.endsWith('partitura.ts') || f.endsWith('temas.ts')) {
        expect(texto, f).not.toMatch(/Date\.now|new Date|performance\.now/);
      }
    }
  });
});
