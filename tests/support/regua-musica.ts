/*
 * RÉGUA MUSICAL (T0 da spec docs/spec-chefoes-progressivos-temas-e-dificuldade.md §3.7). Só para teste.
 *
 * Três dimensões, cada uma dividida pelo seu limiar `τ`:
 *   dM melódica  0,5 x (1 - Jaccard dos trigramas de INTERVALOS do lead) + 0,5 x (1 - Jaccard do conjunto de notas relativo à tônica)
 *   dR rítmica   média de (a) 1 - cosseno dos vetores de ataque do compasso numa grade de 240 posições (peso = volume da chamada, suavizado σ = 2),
 *                (b) min(1, |log2(bpm_a / bpm_b)| / log2(1,15)), (c) 1 se os pulsos por compasso diferem
 *   dT timbral   média, nas 3 pistas (lead, baixo, perc), da distância S da régua de sons (ESCALAS_EFEITO, congelada na S0) entre o
 *                compasso 2 de cada pista renderizado pelo renderizador de referência
 *
 * DECISÕES DE DESENHO tomadas ANTES de medir qualquer coisa (valem para sempre; mudar exige PROGRESSO.md e novo veredito da Íris):
 *  1. O trigrama é de 3 intervalos consecutivos (4 notas) do lead, em ordem de tempo, ignorando pausas. A nota do lead de um passo é a mais grave
 *     das chamadas de lead desse passo (o pluck do menu tem parcial uma oitava acima). Só o laço 0.
 *  2. dT NORMALIZA A ALTURA: antes de renderizar, cada chamada afinada é dobrada para a MESMA oitava de referência da sua pista (lead: A4 = 69, baixo:
 *     A2 = 45) mantendo a classe de altura relativa à tônica. Sem isso dois controles negativos do spec (transpor +5 st; lead uma oitava acima)
 *     custariam dT >> 0,4, porque o MFCC e o brilho de S dependem do registro. O que dT mede é, portanto, QUEM toca (instrumento, filtro, envelope,
 *     densidade do compasso), não em que tom nem em que oitava. Percussão de altura fixa não é transposta.
 *  3. O compasso medido é o de índice 2 do laço 0 (os temas novos têm 2 compassos de abertura sem lead; o 2 é o primeiro com todas as pistas).
 *  4. dR: o vetor do compasso é a MÉDIA dos compassos do laço (cobre compassos alternados, como a sesquiáltera); a grade é circular.
 *  5. Controles negativos (nas 3 trilhas de hoje): transposto +5 st; andamento x1,05; uma nota do lead trocada (a 10ª, +2 st); lead uma oitava
 *     acima. Positivos: fight x menu, fight x chefe, menu x chefe.
 *  6. Regra do limiar. 1ª tentativa (por dimensão: `τ = MARGEM x máx. dos negativos / NEG_MAX`, MARGEM 1,25): deixou D = 0,45 nos controles de andamento
 *     (dR e dT sobem juntos), contra o "< 0,4" da spec. Trocada, ainda ANTES de existir tema novo, pela regra que fica: `escolherTau` varre uma grade
 *     de (τM, τR, τT) e fica com o de MAIOR MARGEM MÍNIMA, onde a margem é o menor entre
 *       folga dos negativos  = NEG_MAX / (maior D entre os 12 controles negativos)         (cada dimensão <= D, então já cobre as três)
 *       folga dos positivos  = menor, nos 3 positivos, entre D / POS_MIN e (2ª maior dimensão) / DIM_MIN
 *     Ambas precisam ser >= 1; se o melhor ficar < 1, os limiares NÃO se mexem para passar: a régua está errada (volta à Nova).
 */
import { descrever, distancia, type Descritores } from './descritores';
import { renderizarChamadas } from './render-musica';
import { ESCALAS_EFEITO } from './regua-sons';
import { duracaoDoCompasso, midiDe, type PartituraMedida } from './musica-medida';
import type { ChamadaMusical, PistaMusical } from '../../src/audio/receitas';

export const DATA_CONGELAMENTO_MUSICA = '2026-10-21';

export const NEG_MAX = 0.4;
export const POS_MIN = 1.2;
export const DIM_MIN = 1.0;
export const PISO_TAU = { dM: 0.15, dR: 0.1, dT: 0.5 } as const;
/** Oitava de referência de cada pista afinada (MIDI da classe "tônica"). */
export const BASE_DA_PISTA: Readonly<Record<'lead' | 'baixo', number>> = { lead: 69, baixo: 45 };
export const COMPASSO_MEDIDO = 2;
export const GRADE = 240;
export const SIGMA = 2;
export const RAZAO_BPM = 1.15;

/*
 * NÚMEROS CONGELADOS (T0, 2026-10-21; as 3 trilhas de hoje gravadas do AudioSys real, 22 050 Hz):
 *   brutos dos 12 controles negativos (dM / dR / dT):
 *     transposto +5 st            0 / 0 / 0            (dobra a altura: dT idêntico por construção)
 *     andamento x1,05             0 / 0,116 / 0,347 (fight), 0,472 (menu), 0,472 (chefe)
 *     uma nota (a 10a, +2 st)     0,111 / 0 / 0 (fight), 0,174 / 0 / 0 (menu), 0,103 / 0 / 0,137 (chefe)
 *     lead uma oitava acima       0 / 0 / 0
 *   brutos dos 3 positivos: fight x menu 0,500 / 0,387 / 3,823; fight x chefe 0,750 / 0,721 / 4,740; menu x chefe 0,740 / 0,779 / 5,356
 *   escolherTau (maior margem mínima): τM 0,4825, τR 0,3482, τT 3,413; folga dos negativos 1,106 e dos positivos 1,111
 *   normalizados: negativos D <= 0,36 (cada dimensão <= 0,36); positivos fight x menu (1,04 / 1,11 / 1,12; D 1,89), fight x chefe (1,55 / 2,07 / 1,39;
 *   D 2,94), menu x chefe (1,53 / 2,24 / 1,57; D 3,13): as três dimensões >= 1,0 nos três.
 */
export const TAU_MUSICA: Tau = { dM: 0.4825, dR: 0.3482, dT: 3.413 };

export interface Tau {
  readonly dM: number;
  readonly dR: number;
  readonly dT: number;
}

export interface Distancias {
  readonly dM: number;
  readonly dR: number;
  readonly dT: number;
}

// --- dM ---

export function notasDoLead(p: PartituraMedida): number[] {
  const notas: number[] = [];
  for (const cs of p.porPasso) {
    const n = cs.filter((c) => c.nota !== undefined).map((c) => c.nota as number);
    if (n.length) notas.push(Math.min(...n));
  }
  return notas;
}

const jaccard = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

export function trigramasDeIntervalos(notas: readonly number[]): Set<string> {
  const iv = notas.slice(1).map((n, i) => n - (notas[i] as number));
  const s = new Set<string>();
  for (let i = 0; i + 3 <= iv.length; i++) s.add(iv.slice(i, i + 3).join(','));
  if (s.size === 0 && iv.length) s.add(iv.join(','));
  return s;
}

export const conjuntoRelativo = (notas: readonly number[], tonica: number): Set<number> => new Set(notas.map((n) => (((n - tonica) % 12) + 12) % 12));

export function dMelodica(a: PartituraMedida, b: PartituraMedida): number {
  const na = notasDoLead(a);
  const nb = notasDoLead(b);
  const tri = 1 - jaccard(trigramasDeIntervalos(na), trigramasDeIntervalos(nb));
  const conj = 1 - jaccard(conjuntoRelativo(na, a.tonica), conjuntoRelativo(nb, b.tonica));
  return 0.5 * tri + 0.5 * conj;
}

// --- dR ---

/** Vetor de ataque do compasso médio na grade de 240 posições, suavizado (σ = 2, circular). */
export function vetorDeAtaque(p: PartituraMedida): Float64Array {
  const grade = new Float64Array(GRADE);
  for (let c = 0; c < p.compassos; c++) {
    for (let s = 0; s < p.passosPorCompasso; s++) {
      const cs = p.porPasso[c * p.passosPorCompasso + s] ?? [];
      const peso = cs.reduce((m, x) => m + x.vol, 0);
      const pos = Math.round((s * GRADE) / p.passosPorCompasso) % GRADE;
      grade[pos] = (grade[pos] as number) + peso / p.compassos;
    }
  }
  const raio = Math.ceil(SIGMA * 4);
  const nucleo = Array.from({ length: 2 * raio + 1 }, (_, i) => Math.exp(-((i - raio) ** 2) / (2 * SIGMA * SIGMA)));
  const suave = new Float64Array(GRADE);
  for (let i = 0; i < GRADE; i++) {
    let v = 0;
    for (let k = -raio; k <= raio; k++) v += (grade[(((i + k) % GRADE) + GRADE) % GRADE] as number) * (nucleo[k + raio] as number);
    suave[i] = v;
  }
  return suave;
}

const cosseno = (a: Float64Array, b: Float64Array): number => {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    ab += (a[i] as number) * (b[i] as number);
    aa += (a[i] as number) ** 2;
    bb += (b[i] as number) ** 2;
  }
  return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0;
};

const mediaPulsos = (p: PartituraMedida): number => p.pulsos.reduce((s, v) => s + v, 0) / p.pulsos.length;

export function dRitmica(a: PartituraMedida, b: PartituraMedida): number {
  const ca = 1 - cosseno(vetorDeAtaque(a), vetorDeAtaque(b));
  const cb = Math.min(1, Math.abs(Math.log2(a.bpm / b.bpm)) / Math.log2(RAZAO_BPM));
  const cc = Math.abs(mediaPulsos(a) - mediaPulsos(b)) > 1e-9 ? 1 : 0;
  return (ca + cb + cc) / 3;
}

// --- dT ---

/** Dobra a chamada afinada para a oitava de referência da pista, mantendo a classe de altura relativa à tônica. */
export function dobrar(c: ChamadaMusical, tonica: number): ChamadaMusical {
  if (!c.afinada || c.pista === 'perc') return c;
  const base = BASE_DA_PISTA[c.pista];
  const ref = c.k === 'T' ? (c.f1 ?? c.f0) : c.k === 'V' ? c.f[1] : c.f0;
  const m = midiDe(ref);
  const rel = ((((m - tonica + 1e-6) % 12) + 12) % 12) - 1e-6;
  const k = Math.pow(2, (base + rel - m) / 12);
  if (c.k === 'T') return { ...c, f0: c.f0 * k, ...(c.f1 === undefined ? {} : { f1: c.f1 * k }) };
  if (c.k === 'V') return { ...c, f: [c.f[0] * k, c.f[1] * k, c.f[2] * k] as const };
  return c;
}

/** As chamadas da pista no compasso medido, dobradas e com o tempo contado do início do compasso. */
export function compassoDaPista(p: PartituraMedida, pista: PistaMusical, indice = COMPASSO_MEDIDO, dobra = true): ChamadaMusical[] {
  const i0 = indice * p.passosPorCompasso;
  const t0 = i0 * p.spb;
  const dur = duracaoDoCompasso(p);
  const cs: ChamadaMusical[] = [];
  for (let s = 0; s < p.passosPorCompasso; s++) {
    for (const c of p.porPasso[i0 + s] ?? []) {
      if (c.pista !== pista) continue;
      const d = dobra ? dobrar(c, p.tonica) : c;
      cs.push({ ...d, quando: (c.quando ?? 0) - t0 } as ChamadaMusical);
    }
  }
  // chamadas do compasso que cruzam para depois não contam além de 0,4 s de cauda
  return cs.filter((c) => (c.quando ?? 0) < dur);
}

const CACHE_PISTAS = new WeakMap<PartituraMedida, Record<PistaMusical, Descritores>>();

export function descritoresDePistas(p: PartituraMedida): Record<PistaMusical, Descritores> {
  const hit = CACHE_PISTAS.get(p);
  if (hit) return hit;
  const dur = duracaoDoCompasso(p) + 0.4;
  const um = (pista: PistaMusical): Descritores => {
    const cs = compassoDaPista(p, pista);
    if (cs.length === 0) throw new Error(`${p.nome}: a pista '${pista}' está vazia no compasso ${COMPASSO_MEDIDO}`);
    return descrever(renderizarChamadas(cs, dur));
  };
  const r = { lead: um('lead'), baixo: um('baixo'), perc: um('perc') };
  CACHE_PISTAS.set(p, r);
  return r;
}

export const PISTAS: readonly PistaMusical[] = ['lead', 'baixo', 'perc'];

/** Informativo: o dT SEM dobrar a altura (mostra quanto o registro pesaria; não é a régua). */
export function dTimbralBruto(a: PartituraMedida, b: PartituraMedida): number {
  const um = (p: PartituraMedida, pista: PistaMusical): Descritores => descrever(renderizarChamadas(compassoDaPista(p, pista, COMPASSO_MEDIDO, false), duracaoDoCompasso(p) + 0.4));
  return PISTAS.reduce((s, k) => s + distancia(um(a, k), um(b, k), ESCALAS_EFEITO).S, 0) / PISTAS.length;
}

export function dTimbral(a: PartituraMedida, b: PartituraMedida): number {
  const da = descritoresDePistas(a);
  const db = descritoresDePistas(b);
  return PISTAS.reduce((s, k) => s + distancia(da[k], db[k], ESCALAS_EFEITO).S, 0) / PISTAS.length;
}

export const distanciasBrutas = (a: PartituraMedida, b: PartituraMedida): Distancias => ({ dM: dMelodica(a, b), dR: dRitmica(a, b), dT: dTimbral(a, b) });

// --- normalização e critério ---

export interface Normalizadas extends Distancias {
  readonly D: number;
  readonly dimensoesAcima: number;
}

export function normalizar(d: Distancias, tau: Tau): Normalizadas {
  const m = d.dM / tau.dM;
  const r = d.dR / tau.dR;
  const t = d.dT / tau.dT;
  return { dM: m, dR: r, dT: t, D: Math.sqrt(m * m + r * r + t * t), dimensoesAcima: [m, r, t].filter((x) => x >= DIM_MIN).length };
}

/** O critério de distinção da spec: pelo menos 2 das 3 dimensões >= 1,0 e D >= 1,2. */
export const distinto = (n: Normalizadas): boolean => n.dimensoesAcima >= 2 && n.D >= POS_MIN;

export interface Folgas {
  readonly negativos: number;
  readonly positivos: number;
  readonly minima: number;
}

/** As duas folgas da decisão 6 para um conjunto de limiares. >= 1 nas duas = separa. */
export function folgas(tau: Tau, negativos: readonly Distancias[], positivos: readonly Distancias[]): Folgas {
  const maiorD = Math.max(...negativos.map((n) => normalizar(n, tau).D));
  const fn = maiorD > 0 ? NEG_MAX / maiorD : Infinity;
  const fp = Math.min(
    ...positivos.map((p) => {
      const n = normalizar(p, tau);
      const segunda = [n.dM, n.dR, n.dT].sort((a, b) => b - a)[1] as number;
      return Math.min(n.D / POS_MIN, segunda / DIM_MIN);
    }),
  );
  return { negativos: fn, positivos: fp, minima: Math.min(fn, fp) };
}

/** Regra do limiar (decisão 6): o (τM, τR, τT) de maior margem mínima numa grade geométrica (passo de 2%). */
export function escolherTau(negativos: readonly Distancias[], positivos: readonly Distancias[]): { tau: Tau; folgas: Folgas } {
  const grade = (min: number, max: number): number[] => {
    const v: number[] = [];
    for (let x = min; x <= max; x *= 1.02) v.push(x);
    return v;
  };
  let melhor: { tau: Tau; folgas: Folgas; objetivo: number } | null = null;
  for (const dM of grade(PISO_TAU.dM, 3))
    for (const dR of grade(PISO_TAU.dR, 3))
      for (const dT of grade(PISO_TAU.dT, 12)) {
        const tau = { dM, dR, dT };
        const f = folgas(tau, negativos, positivos);
        const objetivo = f.minima + 1e-3 * (Math.min(f.negativos, 10) + Math.min(f.positivos, 10));
        if (!melhor || objetivo > melhor.objetivo) melhor = { tau, folgas: f, objetivo };
      }
  if (!melhor) throw new Error('grade vazia');
  return { tau: melhor.tau, folgas: melhor.folgas };
}
