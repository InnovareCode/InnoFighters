/*
 * Renderizador de MÚSICA da régua musical (T0). Reusa o renderizador de referência da S0 (AudioSys REAL sobre o mini motor offline): cada chamada
 * é renderizada SOZINHA (a mesma `tocarReceita` do jogo, com `destino: 'musica'`) e somada na linha do tempo (overlap-add). O grafo é linear
 * (osciladores, ganhos e biquads, sem o compressor), então somar as chamadas renderizadas uma a uma dá o mesmo som que renderizar tudo junto, e é
 * ordens de grandeza mais barato: o mini motor aloca um buffer do tamanho da cena inteira por nó. `musica-render.test.ts` confere a equivalência.
 */
import { tocarReceita, type ChamadaMusical } from '../../src/audio/receitas';
import { TAXA } from './descritores';
import { renderizar } from './render-som';

/** Renderiza uma chamada isolada (começando em 0). Cache por conteúdo: o mesmo instrumento nunca é renderizado duas vezes. */
const CACHE = new Map<string, Float32Array>();
function chamadaIsolada(c: ChamadaMusical): Float32Array {
  const { quando: _q, passoRel: _p, nota: _n, pista: _pi, afinada: _a, camada: _c, ...resto } = c as ChamadaMusical & { camada?: unknown };
  const chave = JSON.stringify(resto);
  const hit = CACHE.get(chave);
  if (hit) return hit;
  const s = renderizar((a) => void tocarReceita(a, [{ ...(resto as ChamadaMusical), quando: 0 }], { destino: 'musica' })).amostras;
  CACHE.set(chave, s);
  return s;
}

/** Soma as chamadas (tempos em s, relativos a `t0`) numa linha do tempo de `duracao` s. */
export function renderizarChamadas(chamadas: readonly ChamadaMusical[], duracao: number, t0 = 0): Float32Array {
  const n = Math.ceil(duracao * TAXA);
  const out = new Float32Array(n);
  for (const c of chamadas) {
    const inicio = Math.ceil(((c.quando ?? 0) - t0) * TAXA - 1e-6); // o mesmo primeiro quadro >= início do mini motor
    if (inicio >= n) continue;
    const y = chamadaIsolada(c);
    for (let i = Math.max(0, -inicio); i < y.length; i++) {
      const j = inicio + i;
      if (j >= n) break;
      out[j] = (out[j] as number) + (y[i] as number);
    }
  }
  return out;
}
