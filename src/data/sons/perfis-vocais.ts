import type { IdLutador } from '../../core/contratos';
import { CALIBRACAO_PERFIL } from './calibracao';
import { GRITOS_SARPA, gritosAtivos } from './gritos';
import type { PerfilVocal } from './tipos';

/*
 * A garganta de cada lutador (docs/spec-sons-por-lutador.md §3.2): tom, trato vocal e timbre. Os gritos (kiai, vitória, KO, dano) entram na S2 em
 * `PerfilVocal.gritos`. `Record<IdLutador, ...>` faz lutador novo sem voz NÃO COMPILAR (o mesmo mecanismo das falas da provocação).
 * O `pitch` de `LutadorDef` NÃO muda: o motor o copia nos eventos e o lock-step compara.
 */
const SEM = { hz: 0, prof: 0 } as const;
const SEM_VIB = { hz: 0, prof: 0, atraso: 0 } as const;

const GRITOS = gritosAtivos();
const com = (id: IdLutador, p: Omit<PerfilVocal, 'gritos'>): PerfilVocal => ({ ...p, gritos: GRITOS[id], ganhoDb: CALIBRACAO_PERFIL[id] });

export const PERFIS_VOCAIS: Readonly<Record<IdLutador, PerfilVocal>> = {
  hayato: com('hayato', { f0: 165, k: 1.0, onda: 'sawtooth', q: 5, ganhoF3: 0.35, atq: 0.006, vib: SEM_VIB, aspereza: SEM, sopro: 0.1, coro: { cents: 10, sub: 0 }, contorno: [0, 1, -5] }),
  'wei-long': com('wei-long', { f0: 118, k: 0.88, onda: 'sawtooth', q: 4, ganhoF3: 0.3, atq: 0.02, vib: { hz: 4.5, prof: 0.015, atraso: 0.12 }, aspereza: { hz: 32, prof: 0.08 }, sopro: 0.25, coro: { cents: 12, sub: 0 }, contorno: [0, 0, -3] }),
  'min-ji': com('min-ji', { f0: 300, k: 1.2, onda: 'sawtooth', q: 5, ganhoF3: 0.45, atq: 0.004, vib: SEM_VIB, aspereza: SEM, sopro: 0.05, coro: { cents: 8, sub: 0 }, contorno: [0, 3, 2] }),
  caio: com('caio', { f0: 170, k: 1.02, onda: 'sawtooth', q: 4, ganhoF3: 0.4, atq: 0.012, vib: { hz: 5.5, prof: 0.015, atraso: 0.06 }, aspereza: SEM, sopro: 0.15, coro: { cents: 14, sub: 0 }, contorno: [0, 2, 4] }),
  aminu: com('aminu', { f0: 135, k: 0.94, onda: 'square', q: 5, ganhoF3: 0.3, atq: 0.008, vib: SEM_VIB, aspereza: { hz: 50, prof: 0.1 }, sopro: 0.1, coro: { cents: 10, sub: 0 }, contorno: [0, -3, -7] }),
  centella: com('centella', { f0: 290, k: 1.15, onda: 'sawtooth', q: 4, ganhoF3: 0.6, atq: 0.006, vib: { hz: 6.5, prof: 0.04, atraso: 0.15 }, aspereza: SEM, sopro: 0.1, vibrante: 26, coro: { cents: 9, sub: 0 }, contorno: [0, 5, -4] }),
  camille: com('camille', { f0: 255, k: 1.12, onda: 'sawtooth', q: 6, ganhoF3: 0.2, atq: 0.015, vib: { hz: 5, prof: 0.01, atraso: 0.08 }, aspereza: SEM, sopro: 0.2, coro: { cents: 7, sub: 0 }, contorno: [0, 0, -2] }),
  // GAJA (a base). A SARPA sobrepõe tom, Q, F3, ataque, sopro e contorno em PERFIS_POR_FICHA.
  nila: com('nila', {
    f0: 230, k: 1.14, onda: 'sawtooth', q: 5, ganhoF3: 0.3, atq: 0.01, vib: SEM_VIB, aspereza: SEM, sopro: 0.15, coro: { cents: 11, sub: 0 }, contorno: [0, 0, -1],
    // VADIVU (evento `troca-ficha`, mantém `jump`): para a SARPA o chiado sobe; de volta para a GAJA, duas batidas de chenda.
    troca: {
      sarpa: [{ k: 'R', tipo: 'bandpass', f0: 2000, f1: 5200, Q: 4, t: 0.25, vol: 0.2, camada: 'corpo' }],
      base: [0, 0.09].map((quando) => ({ k: 'T' as const, tipo: 'sine' as const, f0: 140, f1: 90, t: 0.2, vol: 0.4, quando, camada: 'corpo' as const })),
    },
  }),
  baatar: com('baatar', { f0: 100, k: 0.84, onda: 'sawtooth', q: 4, ganhoF3: 0.25, atq: 0.025, vib: { hz: 3, prof: 0.01, atraso: 0.15 }, aspereza: { hz: 42, prof: 0.2 }, sopro: 0.2, formanteExtra: { f: 1400, q: 25, ganho: 0.5 }, coro: { cents: 13, sub: 0 }, contorno: [0, 1, 3] }),
  zenon: com('zenon', { f0: 112, k: 0.92, onda: 'sawtooth', q: 5, ganhoF3: 0.35, atq: 0.025, vib: { hz: 5, prof: 0.02, atraso: 0.1 }, aspereza: SEM, sopro: 0.05, coro: { cents: 8, sub: 0.3 }, contorno: [0, 2, -3] }),
};

/** Sobreposição por ficha (chave `<id>.<ficha>`): a SARPA é sibilante (o mesmo chiado do E9).
 * Coro curto (6-14 cents, sem sub-oitava) em todas as vozes: suaviza o pente de harmônicos (sem ele, 3% de tom já muda o brilho 0,15 oitava). */
export const PERFIS_POR_FICHA: Readonly<Record<string, Partial<PerfilVocal>>> = {
  'nila.sarpa': { f0: 258, q: 6, ganhoF3: 0.4, atq: 0.005, sopro: 0.45, contorno: [0, 4, 4], gritos: GRITOS_SARPA(GRITOS.nila),
    // o dano leve da SARPA (sibilante, com ataque fricativo) rende ~2 dB e o kiai ~1 dB menos que os da GAJA no mesmo ganho: compensado (medido em sons-volume.test.ts)
    ganhoDb: { ...CALIBRACAO_PERFIL.nila, leve: (CALIBRACAO_PERFIL.nila.leve ?? 0) + 2.2, kiai: (CALIBRACAO_PERFIL.nila.kiai ?? 0) + 1 } },
};
