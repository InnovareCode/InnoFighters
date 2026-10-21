import type { IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';

/**
 * A casa ALEATÓRIA ("RANDOM") da seleção: a lógica pura (sem canvas, sem cena), para provar sem navegador.
 *
 * REGRA DE OURO: o sorteio é decisão de INTERFACE. Ele usa um `Rng` próprio (`Contexto.sorteioDaSelecao`, semente + 4) e NUNCA o da lógica da
 * luta (lock-step/replay) nem o dos efeitos visuais: escolher "aleatório" não pode mudar nem uma carta da sequência da luta.
 */

/** Ticks que cada rosto fica à mostra enquanto a casa "embaralha" em repouso (o cursor fora dela, ou nela sem ter confirmado). */
export const TICKS_POR_ROSTO_EM_REPOUSO = 12;

/** A rolagem depois do Enter: quantos ticks cada rosto dura (cada vez mais devagar, como uma roleta). O último rosto É o sorteado. */
export const PASSOS_DA_ROLAGEM: readonly number[] = [3, 3, 3, 3, 4, 4, 5, 5, 6, 7];
/** Ticks da rolagem inteira (a soma dos passos): no fim dela o escolhido aparece na grade. */
export const TICKS_DA_ROLAGEM: number = PASSOS_DA_ROLAGEM.reduce((a, b) => a + b, 0);
/** Ticks em que o escolhido fica à mostra (cursor na casa dele, rosto e painel dele, brilho) antes de a escolha valer e a tela seguir. */
export const TICKS_DA_REVELACAO = 30;

/** Embaralha (Fisher-Yates) uma cópia da lista com o `rng` dado. */
export function embaralhar<T>(itens: readonly T[], rng: Rng): T[] {
  const r = [...itens];
  for (let i = r.length - 1; i > 0; i--) {
    const j = rng.inteiro(i + 1);
    [r[i], r[j]] = [r[j] as T, r[i] as T];
  }
  return r;
}

/** Sorteia um dos `elegiveis` (os liberados, na ordem da grade). Lista vazia = `null` (nunca acontece na prática: o 1º lutador vem liberado). */
export function sortear(elegiveis: readonly IdLutador[], rng: Rng): IdLutador | null {
  return elegiveis.length === 0 ? null : rng.escolher(elegiveis);
}

/** O rosto do repouso no tick `t`: anda pela ordem embaralhada, um a cada `TICKS_POR_ROSTO_EM_REPOUSO`. */
export function rostoEmRepouso(ordem: readonly IdLutador[], t: number): IdLutador | null {
  if (ordem.length === 0) return null;
  return ordem[Math.floor(Math.max(0, t) / TICKS_POR_ROSTO_EM_REPOUSO) % ordem.length] ?? null;
}

/**
 * Os rostos da rolagem, um por passo, o ÚLTIMO sendo o `escolhido`: percorre a ordem embaralhada (com volta) terminando nele. Com menos lutadores
 * que passos os rostos se repetem, e com um só a rolagem mostra sempre ele.
 */
export function rostosDaRolagem(ordem: readonly IdLutador[], escolhido: IdLutador): IdLutador[] {
  const pos = Math.max(0, ordem.indexOf(escolhido));
  const n = Math.max(1, ordem.length);
  return PASSOS_DA_ROLAGEM.map((_, k) => ordem[(((pos - (PASSOS_DA_ROLAGEM.length - 1 - k)) % n) + n) % n] ?? escolhido);
}

/** Índice do passo da rolagem no tick `t` (0 .. último); passa do fim = o último. */
export function passoDaRolagem(t: number): number {
  let acum = 0;
  for (let k = 0; k < PASSOS_DA_ROLAGEM.length; k++) {
    acum += PASSOS_DA_ROLAGEM[k] as number;
    if (t < acum) return k;
  }
  return PASSOS_DA_ROLAGEM.length - 1;
}
