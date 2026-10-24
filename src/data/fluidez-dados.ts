import type { IdLutador } from '../core/contratos';
import type { LutadorMontado } from './montar';
import type { GolpeMontado, NomeGolpe } from './tipos';

/*
 * D1 da auditoria do motor (docs/auditoria-fidelidade-motor-2026-10-24.md §4.3): ajustes de DADOS atrás da flag `ConfigPartida.fluidez.dados`.
 * Ficam FORA de `LutadorDef` de propósito (como `supers.ts`/`apresentacao-especiais.ts`): com a flag desligada o dado original segue intacto, bit a bit
 * (hashes do balanço, oráculo e snapshots). Só lutadores que NÃO são os 4 originais do protótipo entram aqui; WEI LONG, HAYATO, MIN-JI e CAIO ficam de fora
 * porque o oráculo de fidelidade compara os golpes deles campo a campo.
 *
 * BAATAR, ARREMESSO DO AVARGA (sFire): recuperação 36 -> 28. Agarrão de comando inbloqueável, de alcance 162 e com armadura; errar custa caro por desenho,
 * mas 36 ticks (0,6 s) além dos 14 de início passavam de 1 s trancado e era o único R > 30 do elenco.
 */
export const AJUSTES_DE_FLUIDEZ: Readonly<Partial<Record<IdLutador, Partial<Record<NomeGolpe, Partial<GolpeMontado>>>>>> = Object.freeze({
  baatar: { sFire: { R: 28 } },
});

const cache = new WeakMap<LutadorMontado, LutadorMontado>();

/**
 * O lutador com os ajustes de dados de fluidez aplicados (cópia rasa; o original não muda). Sem ajuste para este lutador devolve o PRÓPRIO objeto.
 * Memoizado por objeto: duas lutas com o mesmo `LutadorMontado` recebem a mesma cópia.
 */
export function comDadosDeFluidez(ch: LutadorMontado): LutadorMontado {
  const ajustes = AJUSTES_DE_FLUIDEZ[ch.id];
  if (!ajustes) return ch;
  const pronto = cache.get(ch);
  if (pronto) return pronto;
  const moves = { ...ch.moves };
  const trocados = new Map<GolpeMontado, GolpeMontado>();
  for (const [nome, patch] of Object.entries(ajustes) as [NomeGolpe, Partial<GolpeMontado>][]) {
    const original = ch.moves[nome];
    const novo = { ...original, ...patch } as GolpeMontado;
    moves[nome] = novo;
    trocados.set(original, novo);
  }
  const sps = ch.sps.map((s) => trocados.get(s) ?? s) as unknown as LutadorMontado['sps'];
  const copia: LutadorMontado = { ...ch, moves, sps };
  cache.set(ch, copia);
  return copia;
}
