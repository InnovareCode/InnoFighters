import type { Consoante, Grito, PerfilVocal, Silaba, Vogal } from '../data/sons/tipos';
import type { ChamadaReceita } from './receitas';

/*
 * Grito + PerfilVocal -> lista de chamadas (docs/spec-sons-por-lutador.md §3.1). PURA: nada de Web Audio, nada de sorteio. O tom e o volume da
 * variação entram por parâmetro (`variacao` em identidade-sonora.ts). Cada vogal vira uma chamada 'V'; consoantes e finais viram 'R'.
 */

/** Formantes de referência (adulto, k = 1), em Hz. */
export const FORMANTES: Readonly<Record<Vogal, readonly [number, number, number]>> = {
  a: [730, 1090, 2440],
  e: [530, 1840, 2480],
  é: [530, 1840, 2480],
  ê: [400, 2000, 2550],
  i: [270, 2290, 3010],
  o: [570, 840, 2410],
  u: [300, 870, 2240],
  ə: [640, 1190, 2390],
  m: [250, 1000, 2200],
  n: [250, 1000, 2200],
};

/** Volume base de uma voz (a voz de hoje usa 0,9-1,4 com formantes de Q 5-6: aqui o ganho vem do pente de 3 filtros). Calibrado na S2 contra o som que substitui. */
export const VOL_VOZ = 1.2;

export interface OpcoesSintese {
  /** Multiplica o tom (variação ±3%). */
  readonly tom?: number;
  /** Multiplica o volume (variação 0,9-1,0) e o ganho do grito. */
  readonly vol?: number;
  /** Mesmo lutador dos dois lados e este é o P2: f0 −1 st e trato ×0,97 (D-S7). */
  readonly espelho?: boolean;
  /** Camada das chamadas devolvidas (a voz principal nunca é cortada, qualquer camada). */
  readonly quando?: number;
}

type Rr = Extract<ChamadaReceita, { k: 'R' }>;

const ST = (n: number): number => Math.pow(2, n / 12);

function consoanteAtaque(c: Consoante, vol: number, F2: number, vibrante: number | undefined): { chamadas: Rr[]; dur: number } {
  const R = (tipo: BiquadFilterType, f0: number, f1: number | undefined, Q: number, t: number, v: number, quando = 0): Rr => ({
    k: 'R', tipo, f0, ...(f1 === undefined ? {} : { f1 }), Q, t, vol: v * vol, ...(quando ? { quando } : {}), camada: 'ataque',
  });
  switch (c) {
    case 'p': return { chamadas: [R('highpass', 1800, undefined, 1, 0.02, 0.5)], dur: 0.02 };
    case 't': return { chamadas: [R('highpass', 4000, undefined, 1, 0.02, 0.5)], dur: 0.02 };
    case 'k': return { chamadas: [R('highpass', 2500, undefined, 1, 0.025, 0.5)], dur: 0.025 };
    case 'b': return { chamadas: [R('highpass', 800, undefined, 1, 0.02, 0.3)], dur: 0.02 };
    case 'd': return { chamadas: [R('highpass', 1500, undefined, 1, 0.02, 0.3)], dur: 0.02 };
    case 'g': return { chamadas: [R('highpass', 1000, undefined, 1, 0.025, 0.3)], dur: 0.025 };
    case 's': return { chamadas: [R('bandpass', 6500, undefined, 1.5, 0.07, 0.35)], dur: 0.05 };
    case 'sh': return { chamadas: [R('bandpass', 3500, undefined, 1.5, 0.08, 0.35)], dur: 0.06 };
    case 'ch': return { chamadas: [R('highpass', 3000, undefined, 1, 0.06, 0.4)], dur: 0.05 };
    case 'f': return { chamadas: [R('bandpass', 5000, undefined, 0.8, 0.07, 0.3)], dur: 0.05 };
    case 'z': return { chamadas: [R('bandpass', 6000, undefined, 1.5, 0.06, 0.25)], dur: 0.04 };
    case 'h': return { chamadas: [R('bandpass', F2, undefined, 0.8, 0.05, 0.25)], dur: 0.04 };
    case 'r': {
      // vibrante: 3 pulsos na taxa do perfil (24-28 Hz) nos primeiros ~80 ms
      const passo = 1 / (vibrante ?? 26);
      return { chamadas: [0, 1, 2].map((i) => R('bandpass', 1200, undefined, 2, 0.015, 0.4, i * passo)), dur: 0.08 };
    }
  }
}

function consoanteFinal(fim: 'p' | 't' | 'k', vol: number, quando: number): Rr {
  const f = fim === 'p' ? 1800 : fim === 't' ? 4000 : 2500;
  return { k: 'R', tipo: 'highpass', f0: f, Q: 1, t: 0.02, vol: 0.4 * vol, quando, camada: 'corpo' };
}

/** Duração total do grito, em s (da primeira consoante ao fim da última sílaba). */
export function duracaoDoGrito(g: Grito): number {
  const pausa = g.pausa ?? 0.02;
  return g.silabas.reduce((s, sil) => s + sil.t + (sil.fim === 'm' || sil.fim === 'n' ? 0.08 : 0), 0) + pausa * Math.max(0, g.silabas.length - 1);
}

export function sintetizarGrito(perfil: PerfilVocal, grito: Grito, o: OpcoesSintese = {}): ChamadaReceita[] {
  const tom = (o.tom ?? 1) * (grito.fatorF0 ?? 1) * (o.espelho ? ST(-1) : 1);
  const k = perfil.k * (o.espelho ? 0.97 : 1);
  const volGrito = (grito.vol ?? 1) * (o.vol ?? 1);
  const pausa = grito.pausa ?? 0.02;
  const saida: ChamadaReceita[] = [];
  let q = o.quando ?? 0;
  for (const sil of grito.silabas) {
    const sa: Silaba = sil;
    const cons = sa.c ? consoanteAtaque(sa.c, volGrito, FORMANTES[sa.v][1] * k, perfil.vibrante) : null;
    if (cons) for (const c of cons.chamadas) saida.push({ ...c, quando: (c.quando ?? 0) + q });
    const atraso = cons ? cons.dur * 0.6 : 0;
    const st = sa.st ?? perfil.contorno;
    const f = [perfil.f0 * tom * ST(st[0]), perfil.f0 * tom * ST(st[1]), perfil.f0 * tom * ST(st[2])] as const;
    const escala = (v: Vogal): [number, number, number] => {
      const b = FORMANTES[v];
      return [b[0] * k, b[1] * k, b[2] * k];
    };
    const asp = perfil.aspereza.hz > 0 || (grito.aspereza ?? 0) > 0 ? { hz: perfil.aspereza.hz > 0 ? perfil.aspereza.hz : 40, prof: Math.min(0.9, perfil.aspereza.prof + (grito.aspereza ?? 0)) } : undefined;
    const coro = perfil.coro ? { cents: perfil.coro.cents, sub: grito.subOitava ?? perfil.coro.sub } : grito.subOitava ? { cents: 0, sub: grito.subOitava } : undefined;
    saida.push({
      k: 'V',
      onda: perfil.onda,
      f,
      t: sa.t - atraso,
      vol: VOL_VOZ * volGrito,
      quando: q + atraso,
      formantes: escala(sa.v),
      ...(sa.v2 ? { formantes2: escala(sa.v2) } : {}),
      q: perfil.q,
      ganhoF3: perfil.ganhoF3,
      atq: perfil.atq,
      ...(perfil.vib.hz > 0 ? { vib: perfil.vib } : {}),
      ...(asp ? { asp } : {}),
      ...(perfil.sopro > 0 ? { sopro: perfil.sopro } : {}),
      ...(coro ? { coro } : {}),
      ...(perfil.formanteExtra ? { extra: perfil.formanteExtra } : {}),
      camada: 'corpo',
    });
    q += sa.t;
    if (sa.fim === 'm' || sa.fim === 'n') {
      saida.push({
        k: 'V', onda: perfil.onda, f: [f[2], f[2], f[2] * 0.95], t: 0.08, vol: VOL_VOZ * volGrito * 0.4, quando: q,
        formantes: escala(sa.fim), q: perfil.q, ganhoF3: perfil.ganhoF3, camada: 'corpo',
      });
      q += 0.08;
    } else if (sa.fim) saida.push(consoanteFinal(sa.fim, volGrito, q - 0.02));
    q += pausa;
  }
  return saida;
}
