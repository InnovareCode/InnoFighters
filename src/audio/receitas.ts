import type { OpcoesRuido, OpcoesTom, OpcoesVozFormante } from './audio-sys';

/*
 * Toca uma lista de chamadas de síntese (as "receitas" por golpe do Apolo, docs/identidade-visual-especiais.md 1.6) usando só `tone()`,
 * `noise()` e, desde os sons por lutador, `vozFormante()`: D8 continua valendo (áudio 100% sintetizado). A cinemática chama isto; os sons do
 * evento `special` (audio/eventos.ts) NÃO mudam, porque o lock-step com o protótipo compara sons.
 */

/** O que a cinemática precisa do áudio (o `AudioSys` real satisfaz; um dublê de teste também). */
export interface SintetizadorLike {
  tone?(o: OpcoesTom): void;
  noise?(o: OpcoesRuido): void;
  vozFormante?(o: OpcoesVozFormante): void;
  /** Barramento da música: só `destino: 'musica'` precisa dele (temas por lutador). */
  music?: AudioNode | null;
}

/** Camada de uma chamada, para o corte por orçamento (spec §6.2): `ataque` e a voz nunca saem; `extra` sai primeiro. */
export type CamadaSom = 'ataque' | 'corpo' | 'cauda' | 'extra';

/** Uma chamada da receita (a mesma forma de `Som` em render/identidade-especiais.ts, sem depender dela; `camada` é opcional). */
export type ChamadaReceita =
  | { readonly k: 'T'; readonly tipo: OscillatorType; readonly f0: number; readonly f1?: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly filtro?: { readonly tipo: BiquadFilterType; readonly f: number }; readonly Q?: number; readonly atq?: number; readonly desafina?: number; readonly camada?: CamadaSom }
  | { readonly k: 'R'; readonly tipo: BiquadFilterType; readonly f0: number; readonly f1?: number; readonly Q: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly atq?: number; readonly camada?: CamadaSom }
  | ({ readonly k: 'V'; readonly quando?: number; readonly camada?: CamadaSom } & Omit<OpcoesVozFormante, 'when' | 'inicioAbs' | 'dest'>);

/** Pista de uma chamada musical: harmonia entra em `baixo`. A régua de timbre mede uma pista por vez. */
export type PistaMusical = 'lead' | 'baixo' | 'perc';

/**
 * Uma chamada de um tema por lutador (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §3.2): a mesma forma da receita mais a pista,
 * `afinada` (false = percussão de altura fixa; a régua não transpõe) e, nas chamadas da nota principal do lead, `nota` (MIDI). `quando` é em
 * segundos a partir do início do passo (o swing entra aqui); `passoRel` só é preenchido pela partitura de um compasso inteiro.
 */
export type ChamadaMusical = ChamadaReceita & {
  readonly pista: PistaMusical;
  readonly afinada: boolean;
  readonly nota?: number;
  readonly passoRel?: number;
};

export interface OpcoesReceita {
  /** Multiplica o volume de cada chamada. */
  readonly vol?: number;
  /** Defesa: batida com passa-baixa em 1200 Hz e volume x0,4 (o "eco" de quem bloqueou). */
  readonly abafado?: boolean;
  /** Onde ligar as chamadas (o barramento de identidade ou a garganta do lutador). Ausente = o `sfx`, como sempre. */
  readonly dest?: AudioNode | null;
  /** `'musica'` liga no barramento `music` do AudioSys (padrão: o `sfx`, como sempre). Um `dest` explícito vence. */
  readonly destino?: 'sfx' | 'musica';
  /** Instante ABSOLUTO (relógio do contexto) do início da receita: cada chamada toca em `inicio + quando`. Ausente = agora + `quando`, como sempre. */
  readonly inicio?: number;
  /** Relógio do contexto agora. Já não é usado pela voz (ela recebe o instante ABSOLUTO em `inicioAbs`); fica por compatibilidade com quem o passa. */
  readonly agora?: number;
}

/** Toca a receita. Sem áudio (o AudioSys nasce depois do primeiro gesto) ou sem `tone`/`noise`, não faz nada. Devolve quantas chamadas fez. */
export function tocarReceita(audio: SintetizadorLike | null | undefined, receita: readonly ChamadaReceita[], o: OpcoesReceita = {}): number {
  if (!audio) return 0;
  const k = (o.vol ?? 1) * (o.abafado ? 0.4 : 1);
  const destino = o.dest ?? (o.destino === 'musica' ? audio.music : null);
  const dest = destino ? { dest: destino } : {};
  const inicio = o.inicio;
  const musica = o.destino === 'musica';
  let n = 0;
  for (const c of receita) {
    if (c.k === 'T') {
      if (typeof audio.tone !== 'function') continue;
      const filtro = o.abafado ? { type: 'lowpass' as BiquadFilterType, f: 1200 } : c.filtro ? { type: c.filtro.tipo, f: c.filtro.f } : null;
      audio.tone({
        type: c.tipo,
        f0: c.f0,
        f1: c.f1 ?? null,
        t: c.t,
        vol: c.vol * k,
        ...(inicio === undefined ? { when: c.quando ?? 0 } : { at: inicio + (c.quando ?? 0) }),
        ...(filtro ? { filter: filtro } : {}),
        ...(c.Q === undefined ? {} : { Q: c.Q }),
        ...(c.atq === undefined ? {} : { attack: c.atq }),
        ...(c.desafina === undefined ? {} : { detune: c.desafina }),
        ...dest,
      });
    } else if (c.k === 'R') {
      if (typeof audio.noise !== 'function') continue;
      audio.noise({
        type: o.abafado ? 'lowpass' : c.tipo,
        f0: o.abafado ? Math.min(c.f0, 1200) : c.f0,
        f1: o.abafado ? null : (c.f1 ?? null),
        Q: c.Q,
        t: c.t,
        vol: c.vol * k,
        ...(inicio === undefined ? { when: c.quando ?? 0 } : { at: inicio + (c.quando ?? 0) }),
        ...(c.atq === undefined ? {} : { attack: c.atq }),
        ...dest,
      });
    } else {
      if (typeof audio.vozFormante !== 'function') continue;
      const { k: _k, quando, camada: _camada, ...voz } = c;
      // com `inicio` absoluto a voz agenda no instante exato (`inicioAbs`), sem reler o relógio; a música não entra na conta das 32 fontes dos efeitos
      audio.vozFormante({ ...voz, vol: c.vol * k, ...(inicio === undefined ? { when: quando ?? 0 } : { inicioAbs: inicio + (quando ?? 0) }), ...(musica ? { registrar: false } : {}), ...dest });
    }
    n++;
  }
  return n;
}
