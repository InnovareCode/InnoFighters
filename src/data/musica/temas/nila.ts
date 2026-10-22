import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * NILA (Índia): Fá♯, raga Hindolam {Fá♯ Lá Si Ré Mi}, 5/8 khanda chapu (2 + 3) a 300 bpm da colcheia, 10 passos por compasso (semicolcheias),
 * 16 compassos = 16 s. Venu (flauta com o deslize do gamaka), veena no laço ímpar, bordão sa-pa (entrada lenta), chenda e elathalam.
 * Graus: 0 Fá♯, 1 Lá, 2 Si, 3 Ré, 4 Mi, 5 Fá♯ (oitava). A postura da NILA não muda a música (dívida b da spec).
 */
const VENU = [tom('sine', 0.14, { durNota: 0.65, atq: 0.04, deslize: 1 })];
const VEENA = [tom('triangle', 0.13, { t: 0.2, filtro: { tipo: 'lowpass', f: 3000 } })];
const BAIXO = [tom('sine', 0.35, { atq: 0.06, t: 0.22 })];
const BORDAO = [tom('sawtooth', 0.035, { durNota: 0.85, atq: 0.3, filtro: { tipo: 'lowpass', f: 500 } })];
const CHENDA_AGUDO = [ruido('bandpass', 2500, 3, 0.05, 0.25)];
const CHENDA_GRAVE = [tom('sine', 0.45, { f0: 170, f1: 70, t: 0.18 })];
const ELATHALAM = [ruido('highpass', 6500, 1, 0.04, 0.07)];
const CONTRA = [tom('triangle', 0.1, { t: 0.12, filtro: { tipo: 'lowpass', f: 3000 } })];
const DHOLAK = [tom('sine', 0.4, { f0: 140, f1: 60, t: 0.2 })];

export const NILA: TemaDef = {
  nome: 'Hindolam',
  origem: 'Índia',
  tonica: 66,
  escala: [0, 3, 5, 8, 10],
  compasso: { passos: 10, passosPorPulso: 2, pulsos: [5] },
  bpm: 300,
  compassos: 16,
  volume: 1,
  mix: { lead: 1.00, baixo: 1.06, perc: 1.00 },
  harmonia: [0, 0, 2, 0],
  lead: {
    instrumento: VENU,
    impar: { instrumento: VEENA, oitava: 0 },
    compassos: {
      a: '2 . 1 0 | 1 . . 2 3 4',
      b: '4 3 2 . | 1 . 0 . . .',
      c: '0 . 1 . | 2 . 3 . 4 .',
      d: '4 - 3 2 | 3 . 4 . 5 .',
      e: '5 . 4 3 | 2 . 1 . 0 .',
      f: '2 . 3 . | 4 3 2 . 1 0',
      g: '1 . 0 . | 1 2 . 2 . .',
      h: '3 . 2 1 | 0 - - - . .',
    },
    forma: ['a', 'b', 'a', 'c', 'a', 'b', 'd', 'e', 'f', 'g', 'a', 'b', 'f', 'g', 'e', 'h'],
  },
  baixo: { instrumento: BAIXO, padroes: ['0 . . . | 0 . . . . .', '0 . . . | 2 . . . . .'] },
  acorde: { instrumento: BORDAO, voicing: [0], semitons: [0, 7], oitava: -1, padroes: 'x - - - - - - - - -' },
  perc: [
    { instrumento: CHENDA_AGUDO, padroes: '3...2.2.2.' },
    { instrumento: CHENDA_GRAVE, padroes: '3...2.....' },
    { instrumento: ELATHALAM, padroes: '..1.1.1.1.' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.41, baixo: 0.47, perc: 0.84 },
    perc: [{ instrumento: DHOLAK, padroes: '..2.2.2.2.' }],
    baixoOitava: -1,
    contracanto: { instrumento: CONTRA, graus: -2, atraso: 4 },
    troca: [
      { ...tom('sine', 0.45, { f0: 110, f1: 55, t: 0.3 }), quando: 0.1 },
      { ...ruido('highpass', 6500, 1, 0.3, 0.08, { atq: 0.15 }), quando: 0.1 },
    ],
  },
};
