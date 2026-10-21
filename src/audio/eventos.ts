import type { EventoLuta } from '../core/contratos';

/**
 * Ponte evento da luta -> som. Cada evento reproduz EXATAMENTE a chamada ao AudioSys que o protótipo
 * fazia de dentro da lógica (ver comentário de EventoLuta em core/contratos.ts). Pura: não toca no
 * Web Audio, então roda e é testada no Node.
 */
export type ChamadaSom = {
  /** Nome do método do AudioSys. */
  metodo: string;
  args: readonly number[];
  /** Atraso em ms (o protótipo usava setTimeout 700 ms para o "perfect"). */
  atrasoMs?: number;
};

export const ATRASO_PERFECT_MS = 700;

export function sonsDoEvento(ev: EventoLuta): ChamadaSom[] {
  switch (ev.tipo) {
    case 'swing':
      return [{ metodo: 'swing', args: [ev.golpe === 'punch' ? 0 : 1] }];
    case 'special':
      return [{ metodo: 'special', args: [ev.pitch] }];
    case 'deny':
      return [{ metodo: 'deny', args: [] }];
    case 'jump':
      return [{ metodo: 'jump', args: [] }];
    case 'land':
      return [{ metodo: 'land', args: [] }];
    case 'dust':
      return [];
    case 'projectile':
      return [{ metodo: 'fireballLaunch', args: [] }];
    case 'clash':
      return [{ metodo: 'fireballHit', args: [] }];
    case 'block':
      return [{ metodo: 'block', args: [] }];
    case 'armor':
      return [{ metodo: ev.snd, args: [] }];
    case 'hit':
      return [
        { metodo: ev.snd, args: [] },
        { metodo: 'hurt', args: [ev.pitch] },
      ];
    case 'throw':
      return [
        { metodo: 'kick', args: [] },
        { metodo: 'hurt', args: [ev.pitch] },
      ];
    case 'ko':
      return [{ metodo: 'ko', args: [ev.pitch] }];
    case 'round':
      switch (ev.fase) {
        case 'start':
          return [{ metodo: 'roundStart', args: [] }];
        case 'fight':
          return [{ metodo: 'fight', args: [] }];
        case 'timeover':
          return [{ metodo: 'timeOver', args: [] }];
        case 'end':
          return [{ metodo: 'victory', args: [] }];
      }
      return [];
    case 'perfect':
      return [{ metodo: 'uiPerfect', args: [], atrasoMs: ATRASO_PERFECT_MS }];
    // --- E3: só métodos que o AudioSys já tem (nenhum som novo sintetizado) ---
    case 'fase-chefe':
      if (ev.etapa === 'troca') return [{ metodo: 'fireballHit', args: [] }];
      if (ev.etapa === 'danca') return [{ metodo: 'introWhoosh', args: [] }];
      return [{ metodo: 'fight', args: [] }];
    case 'parry':
      return [{ metodo: 'block', args: [] }];
    case 'quebra-guarda':
      return [{ metodo: 'fireballHit', args: [] }];
    case 'carga':
      return [{ metodo: 'uiSelect', args: [1 + ev.nivel * 0.15] }];
    case 'rebote':
      return [{ metodo: 'land', args: [] }];
    case 'troca-ficha':
      return [{ metodo: 'jump', args: [] }];
  }
}

/** O que `reagirAosEventos` precisa de um AudioSys (qualquer método sonoro por nome). */
export type SomPorNome = { [metodo: string]: unknown };

/**
 * Toca os sons de uma lista de eventos, em ordem. `agendar` existe para teste; no jogo é setTimeout.
 * Método desconhecido é ignorado (nunca derruba o loop do jogo por causa de som).
 */
export function reagirAosEventos(
  audio: SomPorNome,
  eventos: readonly EventoLuta[],
  agendar: (fn: () => void, ms: number) => unknown = (fn, ms) => setTimeout(fn, ms),
): void {
  for (const ev of eventos) {
    for (const c of sonsDoEvento(ev)) {
      const f = audio[c.metodo];
      if (typeof f !== 'function') continue;
      const tocar = (): void => {
        (f as (...a: number[]) => void).apply(audio, c.args as number[]);
      };
      if (c.atrasoMs) agendar(tocar, c.atrasoMs);
      else tocar();
    }
  }
}
