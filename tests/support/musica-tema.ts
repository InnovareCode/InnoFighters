/*
 * Ponte entre os temas (src/data/musica + src/audio/partitura) e a régua musical (tests/support/regua-musica.ts). Só para teste.
 */
import { compilarTema, type Fase, type TemaCompilado } from '../../src/audio/partitura';
import type { ChamadaMusical } from '../../src/audio/receitas';
import type { TemaDef } from '../../src/data/musica/tipos';
import type { PartituraMedida } from './musica-medida';

/** A partitura do laço `laco` na fase `fase`, com `quando` = segundos desde o início do laço (o swing já está nas chamadas). */
export function partituraMedidaDoTema(def: TemaDef, nome: string, laco = 0, fase: Fase = 1): PartituraMedida {
  const t: TemaCompilado = compilarTema(def);
  const spb = t.passo[fase - 1] as number;
  const variante = laco === 0 ? 0 : laco % 2 === 1 ? 1 : 2;
  const porPasso = (t.tabela[variante]?.[fase - 1] ?? []).map((cs, i) => cs.map((c) => ({ ...c, quando: i * spb + (c.quando ?? 0) }) as ChamadaMusical));
  return { nome, bpm: def.bpm * (fase === 2 ? def.fase2.andamento : 1), pulsos: def.compasso.pulsos, tonica: def.tonica, passosPorCompasso: t.passosPorCompasso, compassos: t.compassos, spb, porPasso };
}

/** Todas as chamadas do laço, em tempo absoluto desde o início do laço. */
export const chamadasDoLaco = (p: PartituraMedida): ChamadaMusical[] => p.porPasso.flat();
