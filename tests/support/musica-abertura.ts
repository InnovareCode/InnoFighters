/*
 * Ponte entre o arranjo da abertura (src/data/trailer/abertura + src/audio/abertura) e a régua musical (tests/support/regua-musica.ts). Só para teste.
 *
 * A régua mede UM compasso (o de índice 2 do laço) de uma partitura em laço. O arranjo é linear, então cada SEÇÃO vira uma partitura medida: os compassos da seção,
 * sem as citações (a régua vale FORA das janelas de citação, spec §7.5), girados de modo que o compasso `medido` da seção caia no índice 2, e com pelo menos 4 compassos
 * (seção curta se repete). Os critérios são os mesmos dos temas e os limiares são os CONGELADOS na T0 (`TAU_MUSICA`); nada foi ajustado para a abertura passar.
 */
import { compilarArranjo, type ArranjoCompilado, type ArranjoDef } from '../../src/audio/abertura';
import type { ChamadaMusical } from '../../src/audio/receitas';
import type { PartituraMedida } from './musica-medida';

export function partituraDaSecao(def: ArranjoDef, indiceDaSecao: number, sem: ArranjoCompilado = compilarArranjo(def)): PartituraMedida {
  const sec = def.secoes[indiceDaSecao];
  if (!sec) throw new Error(`seção ${indiceDaSecao} não existe`);
  const P = sem.passosPorCompasso;
  const barra0 = def.secoes.slice(0, indiceDaSecao).reduce((s, x) => s + x.compassos, 0);
  const medido = sec.medido ?? Math.min(2, sec.compassos - 1);
  const L = Math.max(sec.compassos, 4);
  const porPasso: ChamadaMusical[][] = [];
  for (let j = 0; j < L; j++) {
    const b = barra0 + ((((medido - 2 + j) % sec.compassos) + sec.compassos) % sec.compassos);
    for (let p = 0; p < P; p++) {
      const i = j * P + p;
      porPasso.push((sem.tabela[b * P + p] ?? []).map((c) => ({ ...c, quando: i * sem.passo + (c.quando ?? 0) }) as ChamadaMusical));
    }
  }
  return { nome: `abertura/${sec.nome}`, bpm: def.bpm, pulsos: [4], tonica: def.tonica, passosPorCompasso: P, compassos: L, spb: sem.passo, porPasso };
}
