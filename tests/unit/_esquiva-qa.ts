import { criarRng, type Rng } from '../../src/core/rng';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { ateALuta, criarLuta, soltar, type Luta } from './_kit-e3';
import { montarTodos } from './_lutadores';

/** Utilidades dos testes adversariais da ESQUIVA (Íris). Elenco do oráculo: números independentes do balanceamento. */
export const elenco = montarTodos();

export type Lado = 1 | 2;
export const fighter = (l: Luta, q: Lado) => (q === 1 ? l.g.p1 : l.g.p2);
export const quadro = (l: Luta, q: Lado) => (q === 1 ? l.frame.p1 : l.frame.p2);

/** Luta de versus na fase 'fight', os dois com energia cheia, entradas soltas. */
export function nova(
  esquiva = true,
  c1: IdLutador = 'hayato',
  c2: IdLutador = 'caio',
  x1 = 300,
  x2 = 700,
  lut = elenco,
  semente = 5,
): Luta {
  const l = criarLuta({ mode: 'versus', c1, c2, esquiva }, lut, criarRng(semente));
  ateALuta(l);
  l.g.p1.x = x1;
  l.g.p2.x = x2;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  soltar(l);
  return l;
}

/** Aperta ESQUIVA por 1 tick (borda) do lado `q`. `dir` em termos de TECLA: 'frente' = na direção do rival. */
export function esquivar(l: Luta, dir: 'tras' | 'frente' | 'neutro' = 'tras', q: Lado = 1): EventoLuta[] {
  const f = quadro(l, q);
  const olhaDireita = fighter(l, q).facing > 0;
  f.esq = true;
  f.left = dir === 'neutro' ? false : (dir === 'frente') !== olhaDireita;
  f.right = dir === 'neutro' ? false : !f.left;
  const ev = l.passo();
  f.esq = false;
  f.left = false;
  f.right = false;
  return ev;
}

/** RNG que conta as chamadas (a lógica da luta usa só `proximo`). */
export function rngContador(semente: number): { rng: Rng; chamadas: () => number } {
  const base = criarRng(semente);
  let n = 0;
  const rng: Rng = {
    proximo: () => (n++, base.proximo()),
    entre: (a, b) => a + rng.proximo() * (b - a),
    inteiro: (k) => Math.floor(rng.proximo() * k),
    escolher: (xs) => xs[Math.floor(rng.proximo() * xs.length)] as (typeof xs)[number],
    estado: () => base.estado(),
  };
  return { rng, chamadas: () => n };
}
