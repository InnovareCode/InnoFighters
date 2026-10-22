import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * HAYATO (Japão): Mi, escala In {Mi Fá Lá Si Dó}, 4/4 a 144 bpm, 16 passos por compasso, 8 compassos = 13,3 s. Shamisen (quadrada curta com o
 * "sawari" de ruído), shinobue no laço ímpar, taiko, doko e hyoshigi. Graus: 0 Mi, 1 Fá, 2 Lá, 3 Si, 4 Dó, 5 Mi (oitava acima).
 */
const SHAMISEN = [tom('square', 0.1, { t: 0.16, atq: 0.002, filtro: { tipo: 'lowpass', f: 3500 } }), ruido('highpass', 5000, 1, 0.03, 0.05)];
const SHINOBUE = [tom('sine', 0.1, { durNota: 0.95, atq: 0.05 }), ruido('bandpass', 4200, 3, 0.18, 0.025, { atq: 0.04 })];
const KOTO = [tom('triangle', 0.07, { t: 0.28, filtro: { tipo: 'lowpass', f: 2800 } })];
const BAIXO = [tom('square', 0.2, { atq: 0.06, t: 0.35, filtro: { tipo: 'lowpass', f: 320 } })];
const DON = [tom('sine', 0.5, { f0: 190, f1: 70, t: 0.28 })];
const DOKO = [tom('sine', 0.3, { f0: 200, f1: 80, t: 0.14 })];
const HYOSHIGI = [ruido('bandpass', 2600, 6, 0.04, 0.2)];
const ODAIKO = [tom('sine', 0.45, { f0: 140, f1: 55, t: 0.3 })];

export const HAYATO: TemaDef = {
  nome: 'Lâmina e Cerejeira',
  origem: 'Japão',
  tonica: 64,
  escala: [0, 1, 5, 7, 8],
  compasso: { passos: 16, passosPorPulso: 4, pulsos: [4] },
  bpm: 144,
  compassos: 8,
  volume: 1,
  mix: { lead: 1.00, baixo: 1.00, perc: 0.89 },
  harmonia: [0, 0, 3, 0, 0, 2, 3, 0],
  lead: {
    instrumento: SHAMISEN,
    impar: { instrumento: SHINOBUE, oitava: 1 },
    compassos: {
      a: '3 . 2 3 | 4 . 3 2 | 1 . 0 . | 0 . . .',
      b: '3 . 2 3 | 4 . 3 4 | 5 . 4 3 | 2 . . .',
      c: '5 . 6 5 | 4 . 3 . | 2 . 1 . | 0 . . .',
      d: '0 . 1 . | 0 . 2 . | 3 . . 3 | 4 . . .',
      e: '4 . 3 2 | 3 . . 4 | 5 . . . | 3 . 2 .',
      f: '6 . 5 4 | 3 . 2 3 | 4 . 3 2 | 1 . 0 .',
      g: '0 . . . | 1 . 0 . | 2 . 1 . | 0 . . .',
    },
    forma: ['a', 'b', 'a', 'c', 'd', 'e', 'f', 'g'],
  },
  baixo: { instrumento: BAIXO, padroes: ['0 . . . | . . . . | 0 . . . | . . 3 .', '0 . . . | . . . . | 0 . . . | . . . .'] },
  perc: [
    { instrumento: DON, padroes: ['3.....2.3.......', '3.....2.3...2.2.'] },
    { instrumento: DOKO, padroes: '............21..' },
    { instrumento: HYOSHIGI, padroes: '....2.......2...' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.00, baixo: 0.75, perc: 0.89 },
    perc: [{ instrumento: ODAIKO, padroes: '2...2...2...2...' }],
    baixoOitava: -1,
    contracanto: { instrumento: KOTO, graus: -2, atraso: 4 },
    troca: [
      { ...ruido('lowpass', 6000, 1, 0.8, 0.14, { f1: 150, atq: 0.4 }), quando: 0 },
      { ...tom('sine', 0.5, { f0: 120, f1: 35, t: 0.6 }), quando: 0 },
      { ...tom('square', 0.1, { f0: 1800, t: 0.03, atq: 0.001 }), quando: 0.26 },
      { ...tom('square', 0.1, { f0: 1800, t: 0.03, atq: 0.001 }), quando: 0.39 },
    ],
  },
};
