import { lerAcorde, lerMelodia, lerPerc, padraoDoCompasso, semitonsDoGrau } from '../data/musica/notacao';
import type { Camada, Instrumento, PistaDoTema } from '../data/musica/tipos';
import { chamadaDaCamada, fontesDaChamadaMusical, FOLGA_STOP, linhaDoTempo, type EventoAtivo } from './partitura';
import type { ChamadaMusical, PistaMusical } from './receitas';

/*
 * ARRANJO LINEAR da abertura do jogo (o trailer, docs/spec-trailer-abertura.md §7.5). Diferente dos temas (laços de 8 a 16 compassos que repetem), o arranjo é UMA
 * linha de 25 compassos a 150 BPM, sem laço: cada SEÇÃO é um trecho do trailer (frio, os quatro, os desafiantes, a montagem, o arconte, a logo) com as pistas dela.
 * Mesmo vocabulário dos temas (a notação de `data/musica/notacao`, os instrumentos de `data/musica/tipos`) e mesmo compilador de camadas (`chamadaDaCamada`), então
 * a régua musical, o orçamento de fontes e o sequenciador falam a mesma língua. PURO: o mesmo arranjo compila sempre nas mesmas chamadas (nenhum sorteio, nenhum relógio).
 *
 * Este módulo é LEVE e não importa os temas: a citação do tema de cada lutador (os 8 primeiros passos do lead) é montada fora (src/trailer/musica.ts), que entrega
 * `extras` (chamadas por passo absoluto) a `compilarArranjo`.
 */

export type PapelDaPista = 'lead' | 'baixo' | 'acorde' | 'perc';

export interface PistaDaSecao {
  readonly papel: PapelDaPista;
  readonly instrumento: Instrumento;
  /** Oitavas em relação ao registro da tônica (lead: 0; baixo e acorde: -1 se omitido). */
  readonly oitava?: number;
  /** Um padrão por compasso DA SEÇÃO, em ciclo (lead e baixo: melodia; acorde: `x - .`; perc: `. 1 2 3`). 16 passos por compasso. */
  readonly padroes: string | readonly string[];
  /** Acorde: graus acima da raiz do compasso (padrão [0, 2, 4]), ou semitons acima da raiz (vence). */
  readonly voicing?: readonly number[];
  readonly semitons?: readonly number[];
  /** Ganho da pista nesta seção (a mesa de som da seção). Ausente = 1. */
  readonly mix?: number;
  /**
   * A pista CALA dentro das janelas de citação (os 8 passos em que o tema de um lutador fala por cima): é como a citação cabe no orçamento de fontes e como o tema
   * aparece sozinho, sem o lead do arranjo brigando com ele. Padrão: lead e acorde calam; baixo e percussão seguem.
   */
  readonly calaNaCitacao?: boolean;
}

export interface SecaoDoArranjo {
  readonly nome: string;
  readonly compassos: number;
  /** Grau da raiz de cada compasso da seção, em ciclo (afeta baixo e acorde). */
  readonly harmonia: readonly number[];
  readonly pistas: readonly PistaDaSecao[];
  /** O compasso (0-based, dentro da seção) que a régua musical mede: um compasso inteiro (com lead, baixo e percussão) e SEM citação de tema. Padrão: o de índice 2, ou o último. */
  readonly medido?: number;
}

/** Um golpe isolado numa posição do arranjo (impacto da logo, subida de ruído): uma camada com `compasso` e `passo` absolutos. */
export type ImpactoDoArranjo = Camada & {
  /** Compasso (0-based, absoluto) e passo do compasso. */
  readonly compasso: number;
  readonly passo: number;
  /** Atraso em s depois do início do passo. */
  readonly quando?: number;
  /** Semitons acima da tônica (só em camada afinada sem `f0`). */
  readonly semi?: number;
};

export interface ArranjoDef {
  readonly nome: string;
  readonly bpm: number;
  /** MIDI do grau 0 no registro do lead. */
  readonly tonica: number;
  /** Semitons acima da tônica, crescentes, de 0 a 11. */
  readonly escala: readonly number[];
  /** Ganho do arranjo inteiro, calibrado para o RMS ficar perto do da `fight` (o mesmo critério dos temas). */
  readonly volume: number;
  /** Ganho de cada pista (a mesa de som). */
  readonly mix?: Readonly<Partial<Record<PistaDoTema, number>>>;
  readonly secoes: readonly SecaoDoArranjo[];
  readonly impactos?: readonly ImpactoDoArranjo[];
}

export const PASSOS_POR_COMPASSO_DA_ABERTURA = 16;

export interface ArranjoCompilado {
  readonly def: ArranjoDef;
  readonly bpm: number;
  readonly passosPorCompasso: number;
  readonly compassos: number;
  readonly passosTotais: number;
  /** Duração de um passo (s). */
  readonly passo: number;
  /** Duração de um compasso (s). */
  readonly compasso: number;
  /** [passo absoluto] = o que toca nele. */
  readonly tabela: readonly (readonly ChamadaMusical[])[];
}

/** Como o `AudioSys.tocarAbertura` recebe a música. */
export interface OpcoesDaAbertura {
  /** O compasso (0-based) do arranjo que começa a tocar agora (a música entra no PRÓXIMO compasso da imagem). */
  readonly aPartirDoCompasso: number;
  readonly arranjo: ArranjoCompilado;
  /** Segundos até o começo desse compasso, no relógio do contexto (padrão: a folga de um tema, 0,12 s). */
  readonly emSegundos?: number;
}

const pistaDe = (papel: PapelDaPista): PistaMusical => (papel === 'lead' ? 'lead' : papel === 'perc' ? 'perc' : 'baixo');

/** Compassos de todas as seções somados. */
export const compassosDoArranjo = (def: ArranjoDef): number => def.secoes.reduce((s, x) => s + x.compassos, 0);

/** Opções da compilação: as citações (chamadas por passo absoluto), as janelas em que lead e acorde calam e a seleção de compassos da versão estática. */
export interface OpcoesDaCompilacao {
  readonly extras?: ReadonlyMap<number, readonly ChamadaMusical[]>;
  /** Passos absolutos `[de, ate)` onde as pistas que calam na citação não tocam. */
  readonly janelas?: readonly (readonly [number, number])[];
  /** Os compassos (0-based) do arranjo que formam a versão cortada, em ordem. */
  readonly selecao?: readonly number[];
}

export function compilarArranjo(def: ArranjoDef, op: OpcoesDaCompilacao = {}): ArranjoCompilado {
  const { extras, selecao, janelas = [] } = op;
  const emJanela = (passoAbs: number): boolean => janelas.some(([de, ate]) => passoAbs >= de && passoAbs < ate);
  const P = PASSOS_POR_COMPASSO_DA_ABERTURA;
  const spb = 60 / (def.bpm * 4);
  const barras = compassosDoArranjo(def);
  const cheia: ChamadaMusical[][] = Array.from({ length: barras * P }, () => []);
  const n = def.escala.length;
  const ganho = (pista: PistaMusical, extra = 1): number => def.volume * (def.mix?.[pista] ?? 1) * extra;
  const nota = (grau: number, oitavas: number): number => def.tonica + 12 * oitavas + semitonsDoGrau(def.escala, grau);
  const tocar = (inst: Instrumento, passoAbs: number, midiNota: number | null, durPassos: number, pista: PistaMusical, v: number, marca?: number): void => {
    for (const c of inst) (cheia[passoAbs] as ChamadaMusical[]).push(chamadaDaCamada(c, midiNota, durPassos * spb, 0, pista, v, marca));
  };
  let barra0 = 0;
  for (const sec of def.secoes) {
    for (const p of sec.pistas) {
      const pista = pistaDe(p.papel);
      const k = p.mix ?? 1;
      const cala = p.calaNaCitacao ?? (p.papel === 'lead' || p.papel === 'acorde');
      for (let b = 0; b < sec.compassos; b++) {
        const abs = barra0 + b;
        const raiz = sec.harmonia[b % sec.harmonia.length] as number;
        const pat = padraoDoCompasso(p.padroes, b);
        if (p.papel === 'lead') {
          for (const nt of lerMelodia(pat, P, n)) {
            if (cala && emJanela(abs * P + nt.passo)) continue;
            const m = nota(nt.grau, p.oitava ?? 0);
            tocar(p.instrumento, abs * P + nt.passo, m, nt.passos, pista, ganho(pista, k), m);
          }
        } else if (p.papel === 'baixo') {
          for (const nt of lerMelodia(pat, P, n)) tocar(p.instrumento, abs * P + nt.passo, nota(raiz + nt.grau, p.oitava ?? -1), nt.passos, pista, ganho(pista, k));
        } else if (p.papel === 'acorde') {
          for (const nt of lerAcorde(pat, P)) {
            if (cala && emJanela(abs * P + nt.passo)) continue;
            const base = nota(raiz, p.oitava ?? -1);
            const notas = p.semitons?.length ? p.semitons.map((s) => base + s) : (p.voicing ?? [0, 2, 4]).map((d) => nota(raiz + d, p.oitava ?? -1));
            for (const m of notas) tocar(p.instrumento, abs * P + nt.passo, m, nt.passos, pista, ganho(pista, k));
          }
        } else {
          lerPerc(pat, P).forEach((peso, i) => {
            if (peso > 0) tocar(p.instrumento, abs * P + i, null, 1, pista, ganho(pista, k * peso));
          });
        }
      }
    }
    barra0 += sec.compassos;
  }
  for (const e of def.impactos ?? []) {
    const afinada = e.k === 'T' && e.f0 === undefined;
    const pista: PistaMusical = afinada ? 'baixo' : 'perc';
    const passoAbs = e.compasso * P + e.passo;
    (cheia[passoAbs] as ChamadaMusical[]).push(chamadaDaCamada(e, afinada ? def.tonica + (e.semi ?? 0) : null, 0.5, e.quando ?? 0, pista, ganho(pista), undefined));
  }
  if (extras) for (const [passo, cs] of extras) (cheia[passo] as ChamadaMusical[]).push(...cs);

  // a versão cortada (a estática): só os compassos escolhidos, na ordem em que vêm
  const tabela = selecao ? selecao.flatMap((bar) => cheia.slice(bar * P, (bar + 1) * P)) : cheia;
  const compassos = selecao ? selecao.length : barras;
  return { def, bpm: def.bpm, passosPorCompasso: P, compassos, passosTotais: compassos * P, passo: spb, compasso: P * spb, tabela };
}

// --- orçamento (o mesmo critério dos temas: spec dos temas §3.5) ---

export interface OrcamentoDoArranjo {
  /** Maior número de fontes NOVAS num passo. */
  readonly porPasso: number;
  readonly passoDoPico: number;
  /** Maior número de fontes soando ao mesmo tempo, na linha inteira. */
  readonly ativas: number;
  readonly vozesPorCompasso: number;
  readonly vozMaisCurta: number;
}

export function orcamentoDoArranjo(a: ArranjoCompilado): OrcamentoDoArranjo {
  const eventos: EventoAtivo[] = [];
  let porPasso = 0;
  let passoDoPico = 0;
  let vozesPorCompasso = 0;
  let vozMaisCurta = Infinity;
  for (let c = 0; c < a.compassos; c++) {
    let v = 0;
    for (let p = 0; p < a.passosPorCompasso; p++) {
      const abs = c * a.passosPorCompasso + p;
      const t0 = abs * a.passo;
      let nPasso = 0;
      for (const ch of a.tabela[abs] ?? []) {
        const nf = fontesDaChamadaMusical(ch);
        nPasso += nf;
        eventos.push({ ini: t0 + (ch.quando ?? 0), fim: t0 + (ch.quando ?? 0) + ch.t + FOLGA_STOP, n: nf });
        if (ch.k === 'V') {
          v++;
          vozMaisCurta = Math.min(vozMaisCurta, ch.t / a.passo);
        }
      }
      if (nPasso > porPasso) {
        porPasso = nPasso;
        passoDoPico = abs;
      }
    }
    vozesPorCompasso = Math.max(vozesPorCompasso, v);
  }
  return { porPasso, passoDoPico, ativas: linhaDoTempo(eventos).pico, vozesPorCompasso, vozMaisCurta };
}

/** Erros do arranjo (notação, compassos); vazio = válido. */
export function validarArranjo(def: ArranjoDef, compassosEsperados = 25): string[] {
  const erros: string[] = [];
  if (def.bpm !== 150) erros.push(`bpm ${def.bpm} (a abertura é a 150 BPM)`);
  if (compassosDoArranjo(def) !== compassosEsperados) erros.push(`${compassosDoArranjo(def)} compassos (esperado ${compassosEsperados})`);
  if (def.escala.length < 5 || def.escala.some((s, i) => !Number.isInteger(s) || s < 0 || s > 11 || (i > 0 && s <= (def.escala[i - 1] as number)))) erros.push('escala inválida');
  const P = PASSOS_POR_COMPASSO_DA_ABERTURA;
  const n = def.escala.length;
  for (const sec of def.secoes) {
    if (sec.harmonia.length === 0) erros.push(`${sec.nome}: sem harmonia`);
    for (const g of sec.harmonia) if (!Number.isInteger(g) || g < 0 || g >= n) erros.push(`${sec.nome}: raiz ${g} fora da escala`);
    sec.pistas.forEach((p, i) => {
      const lista = typeof p.padroes === 'string' ? [p.padroes] : p.padroes;
      lista.forEach((pat, j) => {
        try {
          if (p.papel === 'perc') lerPerc(pat, P);
          else if (p.papel === 'acorde') lerAcorde(pat, P);
          else lerMelodia(pat, P, n);
        } catch (e) {
          erros.push(`${sec.nome}.pistas[${i}].padroes[${j}]: ${(e as Error).message}`);
        }
      });
    });
  }
  for (const e of def.impactos ?? []) {
    if (!(e.compasso >= 0 && e.compasso < compassosDoArranjo(def)) || !(e.passo >= 0 && e.passo < P)) erros.push(`impacto fora do arranjo (compasso ${e.compasso}, passo ${e.passo})`);
  }
  return erros;
}
