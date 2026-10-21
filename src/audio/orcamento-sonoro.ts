import { fontesDaVoz, FONTES_POR_PLANO } from './audio-sys';
import type { ChamadaReceita } from './receitas';

/*
 * Orçamento de fontes dos sons por lutador (docs/spec-sons-por-lutador.md §6.2). Puro: conta e corta ANTES de tocar. "Fonte" = OscillatorNode ou
 * AudioBufferSourceNode iniciado (os GainNode/BiquadFilterNode não entram na conta; a nota de CPU do celular é a das fontes).
 */

/** Fontes que a chamada cria ao tocar. */
export function fontesDaChamada(c: ChamadaReceita): number {
  return c.k === 'V' ? fontesDaVoz(c) : 1;
}

export function fontesDaReceita(r: readonly ChamadaReceita[]): number {
  return r.reduce((n, c) => n + fontesDaChamada(c), 0);
}

/** Quanto tempo (s) a receita dura, do início do plano ao fim da última chamada. */
export function duracaoDaReceita(r: readonly ChamadaReceita[]): number {
  return r.reduce((m, c) => Math.max(m, (c.quando ?? 0) + c.t), 0);
}

type Voz = Extract<ChamadaReceita, { k: 'V' }>;
/** Tira da voz UMA camada opcional. */
function semOpcional(v: Voz, campo: 'sopro' | 'coro' | 'asp' | 'vib'): Voz {
  const { [campo]: _fora, ...resto } = v;
  return resto as Voz;
}

/**
 * Corta a receita até caber em `limite` fontes, SEMPRE na mesma ordem (o corte é determinístico para o mesmo plano):
 *   1. camada `extra`; 2. camada `cauda`; 3. `sopro` das vozes; 4. `coro`/sub-oitava; 5. aspereza; 6. vibrato; 7. `corpo` secundário.
 * NUNCA corta o `ataque`, a voz (V) nem o primeiro `corpo`. Sem camada = `corpo`. Pode devolver mais que `limite` (quem chama decide se toca).
 */
export function cortarParaOrcamento(receita: readonly ChamadaReceita[], limite: number = FONTES_POR_PLANO): ChamadaReceita[] {
  let atual = [...receita];
  const cabe = (): boolean => fontesDaReceita(atual) <= limite;
  if (cabe()) return atual;
  atual = atual.filter((c) => c.camada !== 'extra');
  if (cabe()) return atual;
  atual = atual.filter((c) => c.camada !== 'cauda');
  if (cabe()) return atual;
  for (const campo of ['sopro', 'coro', 'asp', 'vib'] as const) {
    atual = atual.map((c) => (c.k === 'V' && c[campo] !== undefined ? semOpcional(c, campo) : c));
    if (cabe()) return atual;
  }
  let primeiroCorpo = false;
  atual = atual.filter((c) => {
    if (c.k === 'V' || c.camada === 'ataque') return true;
    if (!primeiroCorpo) {
      primeiroCorpo = true;
      return true;
    }
    return false;
  });
  return atual;
}
