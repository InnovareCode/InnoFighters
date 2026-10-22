import { compilarArranjo, PASSOS_POR_COMPASSO_DA_ABERTURA, type ArranjoCompilado, type ArranjoDef } from '../audio/abertura';
import { chamadaDaCamada, compilarTema, partituraDoPasso } from '../audio/partitura';
import type { ChamadaMusical } from '../audio/receitas';
import type { IdLutador } from '../core/contratos';
import { TEMAS } from '../data/musica';
import { tom } from '../data/musica/ajudantes';
import type { IdTema, TemaDef } from '../data/musica/tipos';
import { ABERTURA } from '../data/trailer/abertura';
import { DESTAQUE, ROTEIRO } from '../data/trailer/roteiro';
import { temMotor, type RoteiroDoTrailer } from '../data/trailer/tipos';

/*
 * A música do trailer, montada: o arranjo (src/data/trailer/abertura.ts) mais a CITAÇÃO do tema de cada lutador no plano em que ele é o destaque (spec §7.5).
 * A citação é DERIVADA do dado: os 8 primeiros passos do lead do tema (`TEMAS[id]`), transpostos para a tônica da abertura e encaixados na grade de 0,1 s dela.
 * Se o tema muda, a citação muda junto, sem retrabalho. Tudo PURO: nenhum sorteio, nenhum relógio.
 */

export const PASSOS_DA_CITACAO = 8;
/** O lead do tema que a citação lê: o laço PAR (variante 2), com o instrumento de base do lead (o ímpar troca de instrumento ou de oitava). */
const LACO_DA_CITACAO = 2;
/** Faixa em que a citação soa (MIDI da nota mais aguda): em cima dos metais do arranjo, abaixo do que fura o ouvido. */
const REGISTRO_ALTO: readonly [number, number] = [74, 86];

/** A valsa do ZENON (a trilha `chefe`): as 3 primeiras notas do cravo, em passos de 0,1 s e MIDI de origem. O teste confere com a trilha de hoje. */
export const VALSA_DO_CHEFE: readonly { readonly passo: number; readonly nota: number; readonly passos: number }[] = [
  { passo: 0, nota: 74, passos: 4 },
  { passo: 4, nota: 70, passos: 2 },
  { passo: 6, nota: 69, passos: 4 },
];
/** A tônica da valsa (Ré, MIDI 50 em `CHEFE_RAIZ` do audio-sys). */
const TONICA_DA_VALSA = 50;
const CRAVO = [tom('triangle', 0.16, { durNota: 1.6, atq: 0.003, filtro: { tipo: 'lowpass', f: 3000 } }), tom('triangle', 0.09, { durNota: 1.6, atq: 0.003, desafina: 7, filtro: { tipo: 'lowpass', f: 3000 } })];

const mod12 = (x: number): number => ((x % 12) + 12) % 12;

/** Quantos semitons subir (0 a 11) para a tônica do tema cair na tônica da abertura. */
export const deslocamentoDaCitacao = (tonicaDoTema: number, tonicaDaAbertura: number): number => mod12(tonicaDaAbertura - tonicaDoTema);

function transpor(c: ChamadaMusical, semitons: number, escalaDeTempo: number): ChamadaMusical {
  const k = Math.pow(2, semitons / 12);
  const base = { ...c, t: c.t * escalaDeTempo, quando: (c.quando ?? 0) * escalaDeTempo };
  if (c.k === 'T') return { ...base, f0: c.f0 * k, ...(c.f1 === undefined ? {} : { f1: c.f1 * k }), ...(c.nota === undefined ? {} : { nota: c.nota + semitons }) } as ChamadaMusical;
  if (c.k === 'V') return { ...base, f: [c.f[0] * k, c.f[1] * k, c.f[2] * k] as const, ...(c.nota === undefined ? {} : { nota: c.nota + semitons }) } as ChamadaMusical;
  return base as ChamadaMusical;
}

/**
 * Os primeiros 8 passos do lead do tema de `id`, prontos para tocar: transpostos para a tônica de `abertura`, na oitava que cai no registro alto, e com o tempo
 * reescalado para a grade da abertura (1 passo do tema = 1 passo de `passoDaAberturaS`). Devolve um array de 8 posições (passo 0..7) com as chamadas de lead de cada um.
 */
export function citacaoDoTema(id: IdTema, abertura: Pick<ArranjoDef, 'tonica'> = ABERTURA, passoDaAberturaS = 60 / (150 * 4)): readonly (readonly ChamadaMusical[])[] {
  const def = TEMAS[id];
  if (def === 'chefe') throw new Error('o ZENON não tem TemaDef: use a valsa (`VALSA_DO_CHEFE`)');
  return citacaoDaDef(def, abertura, passoDaAberturaS);
}

/** O mesmo de `citacaoDoTema`, a partir de uma definição (os testes passam um tema alterado para provar que a citação acompanha o dado). */
export function citacaoDaDef(def: TemaDef, abertura: Pick<ArranjoDef, 'tonica'> = ABERTURA, passoDaAberturaS = 60 / (150 * 4)): readonly (readonly ChamadaMusical[])[] {
  const t = compilarTema(def);
  const escala = passoDaAberturaS / (t.passo[0] as number);
  const brutas = Array.from({ length: PASSOS_DA_CITACAO }, (_, p) => partituraDoPasso(t, p, LACO_DA_CITACAO, 1).filter((c) => c.pista === 'lead'));
  const notas = brutas.flat().flatMap((c) => (c.nota === undefined ? [] : [c.nota]));
  let semi = deslocamentoDaCitacao(def.tonica, abertura.tonica);
  // a oitava: a nota mais aguda da citação cai em REGISTRO_ALTO
  const maisAguda = notas.length ? Math.max(...notas) : def.tonica;
  while (maisAguda + semi > REGISTRO_ALTO[1]) semi -= 12;
  while (maisAguda + semi < REGISTRO_ALTO[0]) semi += 12;
  return brutas.map((cs) => cs.map((c) => transpor(c, semi, escala)));
}

/** A citação da valsa do ZENON (3 notas do cravo), transposta para a tônica da abertura. */
export function citacaoDaValsa(abertura: Pick<ArranjoDef, 'tonica'> = ABERTURA, passoDaAberturaS = 60 / (150 * 4)): readonly (readonly ChamadaMusical[])[] {
  // a valsa está em Ré (MIDI 50): a tônica dela vai para a tônica da abertura, e Ré, Si bemol, Lá viram C#, A, G#
  const semi = deslocamentoDaCitacao(TONICA_DA_VALSA, abertura.tonica);
  const saida: ChamadaMusical[][] = Array.from({ length: PASSOS_DA_CITACAO }, () => []);
  for (const n of VALSA_DO_CHEFE) {
    let m = n.nota + semi;
    while (m > REGISTRO_ALTO[1]) m -= 12;
    while (m < REGISTRO_ALTO[0] - 6) m += 12;
    // o passo e a duração em passos da valsa viram passos da abertura (a valsa anda a 138 bpm em semicolcheias: 0,1087 s; a grade da abertura tem 0,1 s)
    for (const c of CRAVO) (saida[n.passo] as ChamadaMusical[]).push(chamadaDaCamada(c, m, n.passos * passoDaAberturaS, 0, 'lead', 1, m));
  }
  return saida;
}

export interface CitacaoNoRoteiro {
  /** Compasso (0-based) e passo do arranjo em que a citação começa. */
  readonly compasso: number;
  readonly passo: number;
  readonly lutador: IdLutador;
}

/**
 * Onde cada lutador é citado: no primeiro compasso do plano em que ele é o DESTAQUE (um compasso por destaque, na ordem c1, c2), no passo 0; o ZENON, no
 * 2º compasso do P9, no passo 8 (a entrada do chefão está acabando e o motor anda daí a pouco). Pura: sai do roteiro e do `DESTAQUE`.
 */
export function citacoesDoRoteiro(roteiro: RoteiroDoTrailer = ROTEIRO, destaque: Readonly<Record<IdLutador, string>> = DESTAQUE): readonly CitacaoNoRoteiro[] {
  const r: CitacaoNoRoteiro[] = [];
  let barra = 0;
  for (const p of roteiro.planos) {
    if (temMotor(p)) {
      let k = 0;
      for (const id of [p.c1, p.c2]) {
        if (destaque[id] !== p.id) continue;
        if (id === 'zenon') r.push({ compasso: barra + 1, passo: 8, lutador: id });
        else r.push({ compasso: barra + k++, passo: 0, lutador: id });
      }
    }
    barra += p.compassos;
  }
  return r;
}

/** Os passos absolutos `[de, ate)` em que cada citação fala: ali o lead e o acorde do arranjo calam. */
export function janelasDeCitacao(roteiro: RoteiroDoTrailer = ROTEIRO, destaque: Readonly<Record<IdLutador, string>> = DESTAQUE): readonly (readonly [number, number])[] {
  return citacoesDoRoteiro(roteiro, destaque).map((c) => {
    const de = c.compasso * PASSOS_POR_COMPASSO_DA_ABERTURA + c.passo;
    return [de, de + PASSOS_DA_CITACAO] as const;
  });
}

/** As chamadas de citação por passo ABSOLUTO do arranjo. */
export function extrasDeCitacao(roteiro: RoteiroDoTrailer = ROTEIRO, destaque: Readonly<Record<IdLutador, string>> = DESTAQUE, abertura: ArranjoDef = ABERTURA): ReadonlyMap<number, readonly ChamadaMusical[]> {
  const passoS = 60 / (abertura.bpm * 4);
  const mapa = new Map<number, ChamadaMusical[]>();
  for (const c of citacoesDoRoteiro(roteiro, destaque)) {
    const passos = c.lutador === 'zenon' ? citacaoDaValsa(abertura, passoS) : citacaoDoTema(c.lutador as IdTema, abertura, passoS);
    passos.forEach((cs, i) => {
      if (cs.length === 0) return;
      const abs = c.compasso * PASSOS_POR_COMPASSO_DA_ABERTURA + c.passo + i;
      mapa.set(abs, [...(mapa.get(abs) ?? []), ...cs]);
    });
  }
  return mapa;
}

let completo: ArranjoCompilado | null = null;
let estatica: ArranjoCompilado | null = null;

/** A música da abertura inteira: 25 compassos, 2400 ticks, com as citações. Compilada uma vez. */
export function arranjoDaAbertura(): ArranjoCompilado {
  completo ??= compilarArranjo(ABERTURA, { extras: extrasDeCitacao(), janelas: janelasDeCitacao() });
  return completo;
}

/** A música da versão estática (movimento reduzido): os 6 compassos do roteiro (c1, c2, c8, c13, c21, c24), do mesmo arranjo. */
export function arranjoDaEstatica(): ArranjoCompilado {
  estatica ??= compilarArranjo(ABERTURA, { extras: extrasDeCitacao(), janelas: janelasDeCitacao(), selecao: ROTEIRO.estatica.compassosDaMusica });
  return estatica;
}

