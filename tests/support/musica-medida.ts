/*
 * A "partitura medida": o que a régua musical (regua-musica.ts) lê de uma música, venha ela de um TemaDef (T2) ou do AudioSys de hoje (as 3 trilhas
 * `fight`, `menu` e `chefe`, que são o legado e a base da calibração T0). Só para teste.
 *
 * O legado NÃO é transcrito à mão: é GRAVADO do `AudioSys` real (playStep/playMenu/playChefe com `tone`/`noise` espiados) e cada chamada gravada
 * é classificada em pista (lead, baixo, perc) por assinatura. Chamada sem classe lança: nenhuma chamada fica de fora da medição.
 */
import { AudioSys } from '../../src/audio/audio-sys';
import type { ChamadaMusical, PistaMusical } from '../../src/audio/receitas';

export interface PartituraMedida {
  readonly nome: string;
  /** BPM do pulso (a unidade em que o andamento está escrito: semínima, semínima pontuada ou colcheia). */
  readonly bpm: number;
  /** Pulsos por compasso, em ciclo (3/4 = [3]; sesquiáltera 6/8 + 3/4 = [2, 3]). */
  readonly pulsos: readonly number[];
  /** MIDI do grau 0: só a classe de altura conta. */
  readonly tonica: number;
  readonly passosPorCompasso: number;
  readonly compassos: number;
  /** Duração nominal de um passo, em s (sem swing). */
  readonly spb: number;
  /** Chamadas do passo; `quando` = segundos desde o INÍCIO DO LAÇO (já com o swing). Laço 0, fase 1. */
  readonly porPasso: readonly (readonly ChamadaMusical[])[];
}

export const midiDe = (f: number): number => 69 + 12 * Math.log2(f / 440);
export const hzDe = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

// --- legado: gravar e classificar ---

type Gravado = { tipo: 'T' | 'R'; opcoes: Record<string, unknown> };

const LEGADO = {
  fight: { bpm: 150, pulsos: [4], tonica: 45, passosPorCompasso: 16, compassos: 4 },
  menu: { bpm: 92, pulsos: [4], tonica: 45, passosPorCompasso: 16, compassos: 4 },
  chefe: { bpm: 138, pulsos: [3], tonica: 50, passosPorCompasso: 12, compassos: 8 },
} as const;
export type TrilhaLegado = keyof typeof LEGADO;

function classe(trilha: TrilhaLegado, g: Gravado): { pista: PistaMusical; afinada: boolean } {
  const o = g.opcoes;
  if (g.tipo === 'R') return { pista: 'perc', afinada: false };
  const tipo = o['type'] as string;
  const f = (o['filter'] as { type: string; f: number } | null | undefined)?.f;
  const f0 = o['f0'] as number;
  const perc = { pista: 'perc' as const, afinada: false };
  const baixo = { pista: 'baixo' as const, afinada: true };
  const lead = { pista: 'lead' as const, afinada: true };
  if (trilha === 'fight') {
    if (tipo === 'sine' && f0 === 160) return perc;
    if (tipo === 'triangle' && f0 === 230) return perc;
    if (tipo === 'square' && f === 700) return baixo;
    if ((tipo === 'square' || tipo === 'triangle') && f === 3200) return lead;
    if (tipo === 'sawtooth' && f === 1200) return baixo;
  } else if (trilha === 'menu') {
    if (tipo === 'sine' && f0 === 120) return perc;
    if (tipo === 'triangle' && f === 600) return baixo;
    if (tipo === 'sawtooth' && f === 900) return baixo;
    if (tipo === 'triangle' && f === 2600) return lead;
    if (tipo === 'sine' && f === undefined) return lead; // o parcial uma oitava acima do pluck
  } else {
    if (tipo === 'sine' && f0 === 150) return perc;
    if (tipo === 'sawtooth' && f === 900) return baixo;
    if (tipo === 'triangle' && f === 3000) return lead;
  }
  throw new Error(`chamada do legado '${trilha}' sem classe: ${JSON.stringify(o)}`);
}

/** Grava as chamadas do laço 0 (fase 1) da trilha de hoje, chamando o `playX` real passo a passo. */
export function partituraDoLegado(trilha: TrilhaLegado): PartituraMedida {
  const d = LEGADO[trilha];
  const spb = 60 / d.bpm / 4;
  const total = d.passosPorCompasso * d.compassos;
  const sys = new AudioSys();
  let atual: Gravado[] = [];
  sys.tone = (o = {}) => void atual.push({ tipo: 'T', opcoes: { ...o } });
  sys.noise = (o = {}) => void atual.push({ tipo: 'R', opcoes: { ...o } });
  const porPasso: ChamadaMusical[][] = [];
  for (let s = 0; s < total; s++) {
    atual = [];
    const t = s * spb;
    if (trilha === 'fight') sys.playStep(s, t, spb);
    else if (trilha === 'menu') sys.playMenu(s, t, spb);
    else sys.playChefe(s, t, spb);
    const cs: ChamadaMusical[] = atual.map((g) => {
      const o = g.opcoes;
      const k = classe(trilha, g);
      if (g.tipo === 'R') {
        return {
          k: 'R' as const,
          tipo: (o['type'] ?? 'lowpass') as BiquadFilterType,
          f0: (o['f0'] ?? 1000) as number,
          ...(o['f1'] == null ? {} : { f1: o['f1'] as number }),
          Q: (o['Q'] ?? 1) as number,
          t: (o['t'] ?? 0.1) as number,
          vol: (o['vol'] ?? 0.3) as number,
          quando: t,
          ...k,
        };
      }
      const filtro = o['filter'] as { type: BiquadFilterType; f: number } | null | undefined;
      return {
        k: 'T' as const,
        tipo: (o['type'] ?? 'square') as OscillatorType,
        f0: (o['f0'] ?? 440) as number,
        ...(o['f1'] == null ? {} : { f1: o['f1'] as number }),
        t: (o['t'] ?? 0.1) as number,
        vol: (o['vol'] ?? 0.3) as number,
        quando: t,
        ...(filtro ? { filtro: { tipo: filtro.type, f: filtro.f } } : {}),
        ...(o['attack'] === undefined ? {} : { atq: o['attack'] as number }),
        ...(o['detune'] === undefined || o['detune'] === 0 ? {} : { desafina: o['detune'] as number }),
        ...k,
      };
    });
    // a nota do lead no passo = a mais grave entre as chamadas de lead (o pluck do menu tem um parcial uma oitava acima)
    const leads = cs.filter((c) => c.pista === 'lead' && c.k === 'T');
    if (leads.length) {
      const nota = Math.round(Math.min(...leads.map((c) => midiDe(c.k === 'T' ? (c.f1 ?? c.f0) : 440))));
      porPasso.push(cs.map((c) => (c.pista === 'lead' ? { ...c, nota } : c)));
    } else porPasso.push(cs);
  }
  return { nome: trilha, bpm: d.bpm, pulsos: d.pulsos, tonica: d.tonica, passosPorCompasso: d.passosPorCompasso, compassos: d.compassos, spb, porPasso };
}

// --- transformações dos controles negativos ---

const mapear = (p: PartituraMedida, f: (c: ChamadaMusical, passo: number) => ChamadaMusical, extra: Partial<PartituraMedida> = {}): PartituraMedida => ({
  ...p,
  ...extra,
  porPasso: p.porPasso.map((cs, i) => cs.map((c) => f(c, i))),
});

const deslocaAltura = (c: ChamadaMusical, st: number): ChamadaMusical => {
  if (!c.afinada || c.k === 'R') return c;
  const m = Math.pow(2, st / 12);
  if (c.k === 'T') return { ...c, f0: c.f0 * m, ...(c.f1 === undefined ? {} : { f1: c.f1 * m }), ...(c.nota === undefined ? {} : { nota: c.nota + st }) };
  return c;
};

/** O mesmo tema `st` semitons acima (a tônica sobe junto). */
export const transpor = (p: PartituraMedida, st: number): PartituraMedida => mapear(p, (c) => deslocaAltura(c, st), { tonica: p.tonica + st });

/** O mesmo tema com o andamento multiplicado por `fator`. */
export function maisRapido(p: PartituraMedida, fator: number): PartituraMedida {
  return mapear(p, (c) => ({ ...c, quando: (c.quando ?? 0) / fator, ...(c.afinada ? { t: c.t / fator } : {}) }) as ChamadaMusical, { bpm: p.bpm * fator, spb: p.spb / fator });
}

/** O lead uma oitava acima. */
export const leadOitavaAcima = (p: PartituraMedida): PartituraMedida => mapear(p, (c) => (c.pista === 'lead' ? deslocaAltura(c, 12) : c));

/** Troca UMA nota do lead (a `indice`-ésima, em ordem de tempo) por outra `st` semitons acima. */
export function trocarUmaNota(p: PartituraMedida, indice: number, st: number): PartituraMedida {
  const passos = p.porPasso.map((cs, i) => (cs.some((c) => c.nota !== undefined) ? i : -1)).filter((i) => i >= 0);
  const alvo = passos[indice];
  if (alvo === undefined) throw new Error('nota inexistente');
  return mapear(p, (c, i) => (i === alvo && c.pista === 'lead' ? deslocaAltura(c, st) : c));
}

// --- utilidades de leitura ---

export const duracaoDoLaco = (p: PartituraMedida): number => p.passosPorCompasso * p.compassos * p.spb;
export const duracaoDoCompasso = (p: PartituraMedida): number => p.passosPorCompasso * p.spb;
