/**
 * RNG com semente (mulberry32). Substitui Math.random na logica e nos efeitos
 * (PLANO.md 4.1): mesma semente => mesma sequencia, em qualquer navegador/Node.
 *
 * Use DOIS geradores na luta: um para a logica (CPU) e outro para os efeitos
 * visuais (faiscas, poeira, petalas), para o replay da logica nao depender de
 * quantas particulas foram criadas.
 */
export interface Rng {
  /** Proximo float em [0, 1) — equivale a Math.random(). */
  proximo(): number;
  /** Float em [a, b) — equivale ao `rand(a, b)` do protótipo. */
  entre(a: number, b: number): number;
  /** Inteiro em [0, n) — equivale a Math.floor(Math.random() * n). */
  inteiro(n: number): number;
  /** Elemento aleatorio de uma lista nao vazia. */
  escolher<T>(itens: readonly T[]): T;
  /** Estado interno (uint32); permite salvar/retomar a sequencia. */
  estado(): number;
}

export function criarRng(semente: number): Rng {
  let a = semente | 0;
  const proximo = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    proximo,
    entre: (x, y) => x + proximo() * (y - x),
    inteiro: (n) => Math.floor(proximo() * n),
    escolher: <T>(itens: readonly T[]): T => {
      if (itens.length === 0) throw new Error('escolher: lista vazia');
      return itens[Math.floor(proximo() * itens.length)] as T;
    },
    estado: () => a >>> 0,
  };
}

/** Semente nova para partidas normais; testes e o e2e passam uma semente fixa. */
export function sementeAleatoria(): number {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') return c.getRandomValues(new Uint32Array(1))[0] as number;
  return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
}
