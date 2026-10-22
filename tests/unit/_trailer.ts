import { montarElenco } from '../../ferramentas/balanco/elenco';
import { criarRng, type Rng } from '../../src/core/rng';
import { DESTAQUE, ROTEIRO } from '../../src/data/trailer/roteiro';
import { TOMADAS } from '../../src/data/trailer/tomadas';
import type { IdPlano, RoteiroDoTrailer, TomadasDoTrailer } from '../../src/data/trailer/tipos';
import { DiretorDoTrailer, type QuadroDoTrailer } from '../../src/trailer/diretor';
import { impressaoDoQuadro } from '../../src/trailer/impressao';

/*
 * Apoio dos testes do trailer. O elenco é o MESMO da ferramenta de escalação (atlas de produção + dados de produção): é o que decide as tomadas.
 */
export const ELENCO = montarElenco();
export { DESTAQUE, ROTEIRO, TOMADAS };

export interface Corrida {
  readonly hashes: string[];
  readonly impressoes: ReadonlyMap<IdPlano, string>;
  readonly reservas: readonly IdPlano[];
  readonly quadros: QuadroDoTrailer[];
  /** O maior número de `Game` vivos visto em qualquer tick. */
  readonly maxVivos: number;
  readonly sementesPedidas: number[];
}

/**
 * Roda o trailer inteiro. `fatia`: updates de pré-rolagem por chamada (a cena faz uma por quadro; aqui insiste até acabar, em fatias deste tamanho,
 * ANTES de cada tick, para provar que o resultado não depende da fatia). `guardar`: guarda os quadros (pesado).
 */
export function correr(o: { fatia?: number; roteiro?: RoteiroDoTrailer; tomadas?: TomadasDoTrailer; guardar?: boolean; reservaForcada?: readonly IdPlano[]; criarRng?: (s: number) => Rng } = {}): Corrida {
  const sementesPedidas: number[] = [];
  const criar = o.criarRng ?? criarRng;
  const d = new DiretorDoTrailer(o.roteiro ?? ROTEIRO, o.tomadas ?? TOMADAS, {
    lutadores: ELENCO,
    criarRng: (s) => {
      sementesPedidas.push(s);
      return criar(s);
    },
  });
  for (const id of o.reservaForcada ?? []) d.reservaForcada(id);
  const hashes: string[] = [];
  const quadros: QuadroDoTrailer[] = [];
  let maxVivos = 0;
  const fatia = o.fatia ?? 10_000;
  while (!d.fim) {
    d.prerolar(0);
    while (d.preRolagemPendente() > 0) d.prerolar(fatia);
    maxVivos = Math.max(maxVivos, d.jogosVivos);
    const q = d.avancar();
    maxVivos = Math.max(maxVivos, d.jogosVivos);
    hashes.push(impressaoDoQuadro(q));
    if (o.guardar) quadros.push(q);
  }
  return { hashes, impressoes: new Map(d.impressoes()), reservas: d.planosEmReserva(), quadros, maxVivos, sementesPedidas };
}
