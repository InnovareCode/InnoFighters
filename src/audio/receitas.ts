import type { OpcoesRuido, OpcoesTom } from './audio-sys';

/*
 * Toca uma lista de chamadas de síntese (as "receitas" por golpe do Apolo, docs/identidade-visual-especiais.md 1.6) usando só `tone()` e
 * `noise()` que o AudioSys já tem: D8 continua valendo (áudio 100% sintetizado, nenhum método novo). A cinemática chama isto; os sons do
 * evento `special` (audio/eventos.ts) NÃO mudam, porque o lock-step com o protótipo compara sons.
 */

/** O que a cinemática precisa do áudio (o `AudioSys` real satisfaz; um dublê de teste também). */
export interface SintetizadorLike {
  tone?(o: OpcoesTom): void;
  noise?(o: OpcoesRuido): void;
}

/** Uma chamada da receita (a mesma forma de `Som` em render/identidade-especiais.ts, sem depender dela). */
export type ChamadaReceita =
  | { readonly k: 'T'; readonly tipo: OscillatorType; readonly f0: number; readonly f1?: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly filtro?: { readonly tipo: BiquadFilterType; readonly f: number }; readonly atq?: number; readonly desafina?: number }
  | { readonly k: 'R'; readonly tipo: BiquadFilterType; readonly f0: number; readonly f1?: number; readonly Q: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly atq?: number };

export interface OpcoesReceita {
  /** Multiplica o volume de cada chamada. */
  readonly vol?: number;
  /** Defesa: batida com passa-baixa em 1200 Hz e volume x0,4 (o "eco" de quem bloqueou). */
  readonly abafado?: boolean;
}

/** Toca a receita. Sem áudio (o AudioSys nasce depois do primeiro gesto) ou sem `tone`/`noise`, não faz nada. Devolve quantas chamadas fez. */
export function tocarReceita(audio: SintetizadorLike | null | undefined, receita: readonly ChamadaReceita[], o: OpcoesReceita = {}): number {
  if (!audio) return 0;
  const k = (o.vol ?? 1) * (o.abafado ? 0.4 : 1);
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
        when: c.quando ?? 0,
        ...(filtro ? { filter: filtro } : {}),
        ...(c.atq === undefined ? {} : { attack: c.atq }),
        ...(c.desafina === undefined ? {} : { detune: c.desafina }),
      });
    } else {
      if (typeof audio.noise !== 'function') continue;
      audio.noise({
        type: o.abafado ? 'lowpass' : c.tipo,
        f0: o.abafado ? Math.min(c.f0, 1200) : c.f0,
        f1: o.abafado ? null : (c.f1 ?? null),
        Q: c.Q,
        t: c.t,
        vol: c.vol * k,
        when: c.quando ?? 0,
        ...(c.atq === undefined ? {} : { attack: c.atq }),
      });
    }
    n++;
  }
  return n;
}
