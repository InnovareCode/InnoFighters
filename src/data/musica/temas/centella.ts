import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * CENTELLA (México): Dó maior, cadência I-IV-V-I, sesquiáltera: compassos pares em 6/8 e ímpares em 3/4 (12 passos nos dois, acentos em 0 e 6 / 0, 4 e 8)
 * a 92 bpm da semínima pontuada, 16 compassos = 20,9 s. Trompetes em terças (a 2ª voz é a `paralela`), violinos no laço ímpar, guitarrón, vihuela e palmas.
 * Graus: 0 Dó, 1 Ré, 2 Mi, 3 Fá, 4 Sol, 5 Lá, 6 Si, 7 Dó (oitava).
 */
const TROMPETE = [tom('sawtooth', 0.08, { durNota: 0.85, atq: 0.015, filtro: { tipo: 'lowpass', f: 3200 } })];
const TROMPETE_2 = [tom('sawtooth', 0.065, { durNota: 0.85, atq: 0.02, filtro: { tipo: 'lowpass', f: 2800 } })];
const VIOLINES = [tom('sawtooth', 0.08, { durNota: 0.9, atq: 0.06, filtro: { tipo: 'lowpass', f: 2500 } })];
const GUITARRON = [tom('triangle', 0.3, { atq: 0.06, t: 0.4, filtro: { tipo: 'lowpass', f: 350 } })];
const VIHUELA = [tom('triangle', 0.045, { t: 0.12, filtro: { tipo: 'lowpass', f: 3500 } })];
const PALMAS = [ruido('bandpass', 1500, 1.5, 0.06, 0.12)];
const MARACAS = [ruido('highpass', 5000, 1, 0.03, 0.06)];
const BOMBO = [tom('sine', 0.45, { f0: 90, f1: 50, t: 0.3 })];

export const CENTELLA: TemaDef = {
  nome: 'Sesquiáltera',
  origem: 'México',
  tonica: 72,
  escala: [0, 2, 4, 5, 7, 9, 11],
  compasso: { passos: 12, passosPorPulso: 6, pulsos: [2, 3] },
  bpm: 92,
  compassos: 16,
  volume: 1,
  mix: { lead: 1.00, baixo: 1.41, perc: 1.00 },
  harmonia: [0, 3, 4, 0],
  lead: {
    instrumento: TROMPETE,
    impar: { instrumento: VIOLINES, oitava: 0 },
    paralela: { graus: -2, instrumento: TROMPETE_2 },
    compassos: {
      p1: '4 . 4 5 4 . | 2 . 0 . . .',
      i1: '1 . 1 2 | 3 . 2 3 | 4 - - -',
      p2: '4 . 4 5 6 . | 7 . 5 . . .',
      i2: '5 . 5 4 | 3 . 2 1 | 2 - - -',
      p3: '2 . 2 3 4 . | 5 . 4 . 2 .',
      i3: '3 . 3 4 | 5 . 4 3 | 2 - 1 -',
      p4: '4 . 4 2 4 . | 6 . 4 . . .',
      i4: '4 . 3 2 | 1 . 0 1 | 0 - - -',
    },
    forma: ['p1', 'i1', 'p2', 'i2', 'p1', 'i1', 'p4', 'i4', 'p3', 'i3', 'p2', 'i2', 'p3', 'i3', 'p4', 'i4'],
  },
  baixo: { instrumento: GUITARRON, oitava: -2, padroes: ['0 . . . . . | 4 . . . . .', '0 . . . | 4 . . . | 0 . . .'] },
  acorde: { instrumento: VIHUELA, voicing: [0, 4], padroes: ['. . x . . x . . x . . x', '. . . . x . . . x . . .'] },
  perc: [
    { instrumento: PALMAS, padroes: ['3.....2.....', '3...2...2...'] },
    { instrumento: MARACAS, padroes: '..1...1...1.' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.00, baixo: 0.89, perc: 0.71 },
    perc: [{ instrumento: BOMBO, padroes: ['3.....2.....', '3...2...2...'] }],
    baixoOitava: 0,
    contracanto: { instrumento: VIHUELA, graus: 2, atraso: 2 },
    troca: [
      { ...tom('sawtooth', 0.1, { t: 0.3, atq: 0.01, filtro: { tipo: 'lowpass', f: 3200 } }), quando: 0, semi: 0 },
      { ...tom('sawtooth', 0.1, { t: 0.3, atq: 0.01, filtro: { tipo: 'lowpass', f: 3200 } }), quando: 0.2, semi: 4 },
      { ...tom('sawtooth', 0.1, { t: 0.5, atq: 0.01, filtro: { tipo: 'lowpass', f: 3200 } }), quando: 0.4, semi: 7 },
      { ...ruido('highpass', 6000, 1, 0.6, 0.1, { atq: 0.3 }), quando: 0 },
    ],
  },
};
