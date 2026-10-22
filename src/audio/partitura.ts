import { midi } from '../core/math';
import { lerAcorde, lerMelodia, lerPerc, padraoDoCompasso, semitonsDoGrau, type NotaEscrita } from '../data/musica/notacao';
import type { Camada, EventoDaTroca, Instrumento, TemaDef } from '../data/musica/tipos';
import type { ChamadaMusical, PistaMusical } from './receitas';

/*
 * Compilador PURO dos temas por lutador (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §3.2): `TemaDef` (dado) -> chamadas `T`/`R`/`V`
 * por passo. `partituraDoPasso(tema, passo, laco, fase)` é função do passo, do laço e da fase e de mais nada: nenhum sorteio, nenhum relógio, nenhum
 * AudioContext. O mesmo passo devolve SEMPRE as mesmas chamadas (mesmos objetos). A tabela é compilada uma vez por tema; tocar um passo é só ler.
 */

export type Fase = 1 | 2;
/** 0 = o 1º laço (abertura sem lead), 1 = laços ímpares (lead uma oitava acima ou outro instrumento), 2 = laços pares a partir do 2º. */
export type Variante = 0 | 1 | 2;

export interface TemaCompilado {
  readonly def: TemaDef;
  readonly passosPorCompasso: number;
  readonly compassos: number;
  readonly passosTotais: number;
  /** Duração de um passo em s, por fase. */
  readonly passo: readonly [number, number];
  /** [variante][fase - 1][passo do laço] */
  readonly tabela: readonly (readonly (readonly (readonly ChamadaMusical[])[])[])[];
  /** Trecho de troca de fase (tocado no 1º passo do compasso em que a fase 2 começa); `quando` em s a partir do início do compasso. */
  readonly troca: readonly ChamadaMusical[];
}

/** Duração de um passo, em s. */
export const duracaoDoPasso = (def: TemaDef, fase: Fase): number => 60 / (def.bpm * def.compasso.passosPorPulso * (fase === 2 ? def.fase2.andamento : 1));

export const varianteDoLaco = (laco: number): Variante => (laco === 0 ? 0 : laco % 2 === 1 ? 1 : 2);

const LIMITE_HZ = 12000;

function hzDe(nota: number): number {
  return midi(nota);
}

/** Uma camada vira uma chamada. `nota` (MIDI) só nas camadas de nota afinada; `durS` = duração escrita da nota em s. */
function chamadaDaCamada(c: Camada, nota: number | null, durS: number, quando: number, pista: PistaMusical, vol: number, marca: number | undefined): ChamadaMusical {
  const hz = nota === null ? 0 : hzDe(nota);
  const m = marca === undefined ? {} : { nota: marca };
  if (c.k === 'R') {
    return { k: 'R', tipo: c.tipo, f0: c.f0, ...(c.f1 === undefined ? {} : { f1: c.f1 }), Q: c.Q, t: c.t, vol: c.vol * vol, quando, ...(c.atq === undefined ? {} : { atq: c.atq }), pista, afinada: false };
  }
  if (c.k === 'V') {
    const f = c.contorno.map((x) => Math.min(LIMITE_HZ, x * hz)) as unknown as readonly [number, number, number];
    return {
      k: 'V',
      onda: c.onda,
      f,
      t: c.durNota * durS,
      vol: c.vol * vol,
      formantes: c.formantes,
      q: c.q,
      ganhoF3: c.ganhoF3,
      quando,
      ...(c.atq === undefined ? {} : { atq: c.atq }),
      ...(c.vib ? { vib: c.vib } : {}),
      ...(c.sopro === undefined ? {} : { sopro: c.sopro }),
      ...(c.coro ? { coro: c.coro } : {}),
      ...(c.extra ? { extra: c.extra } : {}),
      pista,
      afinada: true,
      ...m,
    };
  }
  const fixa = c.f0 !== undefined;
  const f = fixa ? (c.f0 as number) : hz * (c.rel ?? 1);
  const t = Math.max(0.03, Math.min(c.t ?? Infinity, c.durNota === undefined ? Infinity : c.durNota * durS));
  const f0 = !fixa && c.deslize ? f * Math.pow(2, -c.deslize / 12) : f;
  const f1 = fixa ? c.f1 : c.deslize ? f : undefined;
  const filtro = c.filtro ? { tipo: c.filtro.tipo, f: c.filtro.rel ? Math.min(LIMITE_HZ, c.filtro.f * hz) : c.filtro.f } : undefined;
  return {
    k: 'T',
    tipo: c.tipo,
    f0: Math.min(LIMITE_HZ, f0),
    ...(f1 === undefined ? {} : { f1: Math.min(LIMITE_HZ, f1) }),
    t,
    vol: c.vol * vol,
    quando,
    ...(filtro ? { filtro } : {}),
    ...(c.filtro?.Q === undefined ? {} : { Q: c.filtro.Q }),
    ...(c.atq === undefined ? {} : { atq: c.atq }),
    ...(c.desafina === undefined ? {} : { desafina: c.desafina }),
    pista,
    afinada: !fixa,
    ...m,
  };
}

/** Ferramentas comuns às pistas de uma (tema, fase): escreve as chamadas de uma nota ou batida no passo `passoAbs` de `saida`. */
function mesa(def: TemaDef, fase: Fase) {
  const P = def.compasso.passos;
  const C = def.compassos;
  const spb = duracaoDoPasso(def, fase);
  const saida: ChamadaMusical[][] = Array.from({ length: P * C }, () => []);
  const swingDe = (passoNoCompasso: number): number => (def.swing !== undefined && passoNoCompasso % 2 === 1 ? (2 * def.swing - 1) * spb : 0);
  const ganho = (pista: PistaMusical): number => def.volume * (def.mix?.[pista] ?? 1) * (fase === 2 ? (def.fase2.mix?.[pista] ?? 1) : 1);
  const nota = (grau: number, oitavas: number): number => def.tonica + 12 * oitavas + semitonsDoGrau(def.escala, grau);
  const tocar = (inst: Instrumento, passoAbs: number, passoNoC: number, midiNota: number | null, durPassos: number, pista: PistaMusical, v: number, marca?: number): void => {
    const quando = swingDe(passoNoC);
    const durS = durPassos * spb;
    for (const c of inst) (saida[passoAbs] as ChamadaMusical[]).push(chamadaDaCamada(c, midiNota, durS, quando, pista, v, marca));
  };
  return { P, C, n: def.escala.length, total: P * C, saida, ganho, nota, tocar };
}

/** Baixo, acorde/bordão e percussão: iguais em todos os laços; compilados uma vez por fase e compartilhados pelas variantes. */
function montarFixos(def: TemaDef, fase: Fase): ChamadaMusical[][] {
  const { P, C, n, saida, ganho, nota, tocar } = mesa(def, fase);
  // --- baixo ---
  const oitBaixo = (def.baixo.oitava ?? -1) + (fase === 2 ? def.fase2.baixoOitava : 0);
  for (let c = 0; c < C; c++) {
    const raiz = def.harmonia[c % def.harmonia.length] as number;
    for (const nt of lerMelodia(padraoDoCompasso(def.baixo.padroes, c), P, n)) tocar(def.baixo.instrumento, c * P + nt.passo, nt.passo, nota(raiz + nt.grau, oitBaixo), nt.passos, 'baixo', ganho('baixo'));
  }
  // --- acorde / bordão ---
  if (def.acorde) {
    const a = def.acorde;
    const oit = a.oitava ?? -1;
    for (let c = 0; c < C; c++) {
      const raiz = def.harmonia[c % def.harmonia.length] as number;
      for (const nt of lerAcorde(padraoDoCompasso(a.padroes, c), P)) {
        const notas = a.semitons?.length ? a.semitons.map((s) => nota(raiz, oit) + s) : a.voicing.map((d) => nota(raiz + d, oit));
        for (const m of notas) tocar(a.instrumento, c * P + nt.passo, nt.passo, m, nt.passos, 'baixo', ganho('baixo'));
      }
    }
  }
  // --- percussão ---
  const perc = fase === 2 ? [...def.perc, ...def.fase2.perc] : def.perc;
  for (const p of perc) {
    for (let c = 0; c < C; c++) {
      lerPerc(padraoDoCompasso(p.padroes, c), P).forEach((peso, i) => {
        if (peso > 0) tocar(p.instrumento, c * P + i, i, null, 1, 'perc', ganho('perc') * peso);
      });
    }
  }
  return saida;
}

/** Lead, voz paralela e (fase 2) contracanto: o que muda de um laço para o outro. */
function montarLead(def: TemaDef, variante: Variante, fase: Fase): ChamadaMusical[][] {
  const { P, C, n, total, saida, ganho, nota, tocar } = mesa(def, fase);
  const abertura = def.abertura ?? 2;
  const lido = new Map<string, NotaEscrita[]>();
  const comp = (nome: string): NotaEscrita[] => {
    let l = lido.get(nome);
    if (!l) {
      l = lerMelodia(def.lead.compassos[nome] as string, P, n);
      lido.set(nome, l);
    }
    return l;
  };
  const impar = variante === 1;
  const instLead = impar && def.lead.impar?.instrumento ? def.lead.impar.instrumento : def.lead.instrumento;
  const oitLead = (def.lead.oitava ?? 0) + (impar ? (def.lead.impar?.oitava ?? (def.lead.impar?.instrumento ? 0 : 1)) : 0);
  for (let c = 0; c < C; c++) {
    if (variante === 0 && c < abertura) continue;
    for (const nt of comp(def.lead.forma[c] as string)) {
      const abs = c * P + nt.passo;
      const m = nota(nt.grau, oitLead);
      tocar(instLead, abs, nt.passo, m, nt.passos, 'lead', ganho('lead'), m);
      if (def.lead.paralela) tocar(def.lead.paralela.instrumento, abs, nt.passo, nota(nt.grau + def.lead.paralela.graus, oitLead + (def.lead.paralela.oitava ?? 0)), nt.passos, 'lead', ganho('lead'));
      if (fase === 2) {
        const k = def.fase2.contracanto;
        const absC = (abs + k.atraso) % total;
        tocar(k.instrumento, absC, (nt.passo + k.atraso) % P, nota(nt.grau + k.graus, oitLead + (k.oitava ?? 0)), nt.passos, 'lead', ganho('lead'));
      }
    }
  }
  return saida;
}

/** Junta lead e o resto passo a passo. Passo sem lead devolve o MESMO array do resto (as variantes compartilham os objetos). */
function montar(def: TemaDef, variante: Variante, fase: Fase, fixos: readonly (readonly ChamadaMusical[])[]): ChamadaMusical[][] {
  const lead = montarLead(def, variante, fase);
  return lead.map((l, p) => (l.length === 0 ? (fixos[p] as ChamadaMusical[]) : [...l, ...(fixos[p] as ChamadaMusical[])]));
}

function montarTroca(def: TemaDef): ChamadaMusical[] {
  return def.fase2.troca.map((e: EventoDaTroca) => {
    const afinada = e.k === 'T' && e.f0 === undefined;
    const m = afinada ? def.tonica + (e.semi ?? 0) : null;
    const pista = afinada ? 'baixo' : 'perc';
    return chamadaDaCamada(e, m, 0.5, e.quando, pista, def.volume * (def.mix?.[pista] ?? 1), undefined);
  });
}

const CACHE = new WeakMap<TemaDef, TemaCompilado>();

export function compilarTema(def: TemaDef): TemaCompilado {
  const hit = CACHE.get(def);
  if (hit) return hit;
  const variantes: Variante[] = [0, 1, 2];
  const fases: Fase[] = [1, 2];
  const fixos = fases.map((f) => montarFixos(def, f));
  const t: TemaCompilado = {
    def,
    passosPorCompasso: def.compasso.passos,
    compassos: def.compassos,
    passosTotais: def.compasso.passos * def.compassos,
    passo: [duracaoDoPasso(def, 1), duracaoDoPasso(def, 2)],
    tabela: variantes.map((v) => fases.map((f) => montar(def, v, f, fixos[f - 1] as ChamadaMusical[][]))),
    troca: montarTroca(def),
  };
  CACHE.set(def, t);
  return t;
}

/** O que toca no `passo` (0 a passosTotais - 1) do laço `laco`, na fase `fase`. Puro: o mesmo trio devolve sempre o mesmo array. */
export function partituraDoPasso(tema: TemaCompilado | TemaDef, passo: number, laco: number, fase: Fase): readonly ChamadaMusical[] {
  const t = 'tabela' in tema ? tema : compilarTema(tema);
  return (t.tabela[varianteDoLaco(laco)]?.[fase - 1]?.[((passo % t.passosTotais) + t.passosTotais) % t.passosTotais] ?? []) as readonly ChamadaMusical[];
}

/** O trecho de troca para a fase 2 (a tocar no 1º passo do compasso em que a fase 2 começa). */
export const partituraDaTroca = (tema: TemaCompilado | TemaDef): readonly ChamadaMusical[] => ('tabela' in tema ? tema : compilarTema(tema)).troca;

// --- orçamento estático (spec §3.5) ---

/** Fontes (OscillatorNode/AudioBufferSourceNode iniciados) que a chamada cria: a mesma conta de `fontesDaVoz` (conferida em teste). */
export function fontesDaChamadaMusical(c: ChamadaMusical): number {
  if (c.k !== 'V') return 1;
  return 1 + (c.vib ? 1 : 0) + (c.asp ? 1 : 0) + (c.sopro ? 1 : 0) + (c.coro ? (c.coro.sub > 0 ? 2 : 1) : 0);
}

export interface OrcamentoDoTema {
  /** Maior número de fontes NOVAS num passo. */
  readonly porPasso: number;
  /** Maior número de fontes soando ao mesmo tempo (3 laços encadeados, para pegar a emenda e a troca de laço), em qualquer fase. */
  readonly ativas: number;
  /** O mesmo, por fase (1 e 2). */
  readonly ativasPorFase: readonly [number, number];
  /** Maior número de chamadas `V` num compasso. */
  readonly vozesPorCompasso: number;
  /** Menor duração (em passos) de uma `V`. */
  readonly vozMaisCurta: number;
}

/** Folga do `stop()` do AudioSys depois do fim da nota (tone: t + 0,05; vozFormante: fim + 0,05). */
const FOLGA_STOP = 0.05;

interface EventoAtivo {
  readonly ini: number;
  readonly fim: number;
  readonly n: number;
}

/** Fontes ativas depois de cada instante em que alguma começa ou termina (o fim vem antes do início no empate). */
function linhaDoTempo(evs: readonly EventoAtivo[]): { t: number[]; ativas: number[]; pico: number } {
  const marcas = evs.flatMap((e) => [
    { t: e.ini, d: e.n },
    { t: e.fim, d: -e.n },
  ]);
  marcas.sort((a, b) => a.t - b.t || a.d - b.d);
  const t: number[] = [];
  const ativas: number[] = [];
  let atual = 0;
  let pico = 0;
  for (const m of marcas) {
    atual += m.d;
    pico = Math.max(pico, atual);
    if (t.length && t[t.length - 1] === m.t) ativas[ativas.length - 1] = atual;
    else {
      t.push(m.t);
      ativas.push(atual);
    }
  }
  return { t, ativas, pico };
}

export function orcamentoDoTema(tema: TemaCompilado): OrcamentoDoTema {
  let porPasso = 0;
  let ativas = 0;
  const ativasPorFase: [number, number] = [0, 0];
  let vozesPorCompasso = 0;
  let vozMaisCurta = Infinity;
  for (const fase of [1, 2] as const) {
    const eventos: EventoAtivo[] = [];
    const sequencia: Variante[] = [0, 1, 2, 1];
    const spb = tema.passo[fase - 1] as number;
    // o trecho de troca toca a partir do 1º passo do compasso em que a fase 2 começa; qualquer compasso pode ser esse (conta no pior caso, só na fase 2)
    const nasTrocas = (p: number): ChamadaMusical[] => (fase === 2 ? tema.troca.filter((c) => Math.floor((c.quando ?? 0) / spb + 1e-9) === p % tema.passosPorCompasso) : []);
    sequencia.forEach((v, l) => {
      const passos = tema.tabela[v]?.[fase - 1] ?? [];
      passos.forEach((cs, p) => {
        const t0 = (l * tema.passosTotais + p) * spb;
        let nPasso = 0;
        for (const c of cs) {
          const n = fontesDaChamadaMusical(c);
          nPasso += n;
          eventos.push({ ini: t0 + (c.quando ?? 0), fim: t0 + (c.quando ?? 0) + c.t + FOLGA_STOP, n });
        }
        // o evento da troca cai no passo em que `quando` cai, contado a partir do início do compasso
        for (const c of nasTrocas(p)) nPasso += fontesDaChamadaMusical(c);
        if (l === 1) porPasso = Math.max(porPasso, nPasso);
      });
    });
    const base = linhaDoTempo(eventos);
    let pico = base.pico;
    if (fase === 2) {
      // o trecho de troca acontece num compasso só, mas qualquer um pode ser: o pior caso é o maior entre os compassos do laço do meio.
      // Em cada instante em que algo começa dentro da janela da troca, ativas = (as da base) + (as da troca soando nesse instante).
      const ativasEm = (t: number): number => {
        let a = 0;
        let b = base.t.length - 1;
        let k = -1;
        while (a <= b) {
          const m = (a + b) >> 1;
          if ((base.t[m] as number) <= t + 1e-12) {
            k = m;
            a = m + 1;
          } else b = m - 1;
        }
        return k < 0 ? 0 : (base.ativas[k] as number);
      };
      const janela = Math.max(...tema.troca.map((c) => (c.quando ?? 0) + c.t + FOLGA_STOP));
      for (let b = 0; b < tema.compassos; b++) {
        const tb = (tema.passosTotais + b * tema.passosPorCompasso) * spb;
        const extra = tema.troca.map((c) => ({ ini: tb + (c.quando ?? 0), fim: tb + (c.quando ?? 0) + c.t + FOLGA_STOP, n: fontesDaChamadaMusical(c) }));
        const candidatos = [...base.t.filter((t) => t >= tb && t <= tb + janela), ...extra.map((e) => e.ini)];
        for (const t of candidatos) pico = Math.max(pico, ativasEm(t) + extra.reduce((s, e) => s + (e.ini <= t + 1e-12 && t < e.fim ? e.n : 0), 0));
      }
    }
    ativas = Math.max(ativas, pico);
    ativasPorFase[fase - 1] = pico;
    const passos = tema.tabela[1]?.[fase - 1] ?? [];
    for (let c = 0; c < tema.compassos; c++) {
      let v = 0;
      for (let p = 0; p < tema.passosPorCompasso; p++) {
        for (const ch of passos[c * tema.passosPorCompasso + p] ?? []) {
          if (ch.k === 'V') {
            v++;
            vozMaisCurta = Math.min(vozMaisCurta, ch.t / spb);
          }
        }
      }
      vozesPorCompasso = Math.max(vozesPorCompasso, v);
    }
  }
  return { porPasso, ativas, ativasPorFase, vozesPorCompasso, vozMaisCurta };
}
