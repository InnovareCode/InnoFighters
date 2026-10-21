/*
 * RÉGUA DE SONS, CONGELADA em 2026-10-21 (docs/spec-sons-por-lutador.md §7.1, revisão 2). Autoria dos números: S0 da Vega, com o AudioSys REAL
 * renderizado pelo motor offline de teste (tests/support/audio-offline.ts), 22 050 Hz, os 10 `pitch` de hoje (45 pares por família).
 *
 * Mudar QUALQUER valor daqui depois de existir som novo exige registro no PROGRESSO.md e um novo veredito da Íris: é isso que impede ajustar a
 * régua para o som passar. Os valores medidos abaixo são a regressão da própria régua (R5 em tests/unit/sons-regua.test.ts).
 *
 * Números medidos (eT = 1,5; sem P nos efeitos):
 *   hurt(p)    pior par 0,67   (1,55 x 1,18: dT 0,22 dC 0,54 dE 0,33)
 *   special(p) pior par 0,96   (0,82 x 1,55: dT 0,47 dC 0,68 dE 0,49)   <- o maior piso; define TAU
 *   ko(p)      pior par 0,83   (1,18 x 0,70: dT 0,28 dC 0,71 dE 0,33)
 *   menor par positivo         2,15 (punch x kick)                       <- teto da diferença óbvia
 *   (com P e escalas da revisão 1: hurt 1,28 / special 1,40 / ko 3,94; por isso o P só vale em voz pura com o tom igualado)
 */
import type { Escalas } from './descritores';

export const DATA_CONGELAMENTO = '2026-10-21';

/** Vozes: tom igualado (F0_REFERENCIA_VOZ) nos dois lados do par; `P` conta. */
export const ESCALAS_VOZ: Escalas = { eT: 1.5, eC: 1 / 3, eE: 6, eD: 0.5, eP: 2 };
/** Efeitos: tom real (escolha de instrumento); `P` desligado. */
export const ESCALAS_EFEITO: Escalas = { eT: 1.5, eC: 1 / 3, eE: 6, eD: 0.5, eP: Infinity };

/** Média geométrica dos 10 `f0` dos perfis (§3.2). */
export const F0_REFERENCIA_VOZ = 175;

/** Limiares. */
export const TAU = 1.5; // entre lutadores (R1, R2, R3)
export const TAU_INTRA = 1.0; // mesmo lutador (R2b), WEI LONG sFire x sDown (R3)
export const TAU_FAMILIA = 0.6; // "o mesmo selo, maior" (ZENON SELO x SELO MAIOR)
export const TAU_VARIACAO = 0.4; // R6: o som x as suas variações
export const ESPELHO: readonly [number, number] = [0.3, 1.0]; // R7
export const TAU_NILA = 1.0; // R4

/** Pisos do som de hoje (R5a: cada um recalculado tem de ficar <= TAU / 1,5 = 1,0) e o menor positivo (R5b >= 2,0). */
export const PISOS_HOJE = { hurt: 0.67, special: 0.96, ko: 0.83 } as const;
export const POSITIVO_MIN = 2.15;
