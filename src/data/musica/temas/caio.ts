import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * CAIO (Brasil): Sol, mixolídio {Sol Lá Si Dó Ré Mi Fá} (o Fá natural, a 7ª menor, é a cor), 2/4 a 132 bpm, 8 passos por compasso, 16 compassos = 14,5 s.
 * Berimbau (o dong; o chiado da cabaça é a percussão `tch`), violão, atabaque, pandeiro e agogô de dois tons. Graus: 0 Sol, 1 Lá, 2 Si, 3 Dó, 4 Ré, 5 Mi, 6 Fá, 7 Sol (oitava).
 */
const BERIMBAU = [tom('sine', 0.15, { t: 0.24, atq: 0.003 })];
const BAIXO = [tom('triangle', 0.36, { atq: 0.06, t: 0.22, filtro: { tipo: 'lowpass', f: 400 } })];
const VIOLAO = [tom('sawtooth', 0.035, { t: 0.14, filtro: { tipo: 'lowpass', f: 6, rel: true } })];
const ATABAQUE = [tom('sine', 0.36, { f0: 150, f1: 70, t: 0.16 })];
const ATABAQUE_GRAVE = [tom('sine', 0.4, { f0: 170, f1: 80, t: 0.18 })];
const PANDEIRO = [ruido('bandpass', 6000, 2, 0.04, 0.1)];
const CABACA = [ruido('highpass', 3000, 1, 0.03, 0.08)];
const AGOGO = [tom('triangle', 0.08, { f0: 2000, t: 0.12 }), tom('triangle', 0.08, { f0: 1500, t: 0.12 })];
const CAVAQUINHO = [tom('triangle', 0.07, { t: 0.1, filtro: { tipo: 'lowpass', f: 3000 } })];

export const CAIO: TemaDef = {
  nome: 'São Bento Grande',
  origem: 'Brasil',
  tonica: 67,
  escala: [0, 2, 4, 5, 7, 9, 10],
  compasso: { passos: 8, passosPorPulso: 4, pulsos: [2] },
  bpm: 132,
  compassos: 16,
  volume: 1,
  mix: { lead: 1.41, baixo: 0.56, perc: 1.26 },
  harmonia: [0, 6, 3, 0],
  lead: {
    instrumento: BERIMBAU,
    compassos: {
      a1: '4 . 4 5 | 6 . 5 4',
      a2: '2 . 3 4 | 0 - - -',
      a3: '2 . 3 4 | 2 - 0 .',
      b1: '5 . 5 6 | 7 . 6 5',
      b2: '4 . 5 6 | 4 - - -',
      b3: '4 . 5 6 | 8 - 7 .',
      c1: '6 . 6 7 | 8 . 7 6',
      c2: '5 . 4 5 | 4 - - .',
      c3: '5 . 4 2 | 0 . 2 .',
      d1: '4 . 5 4 | 2 . 3 2',
      d2: '0 . 2 4 | 0 - - -',
    },
    forma: ['a1', 'a2', 'a1', 'a3', 'b1', 'b2', 'b1', 'b3', 'c1', 'c2', 'c1', 'c3', 'a1', 'a2', 'd1', 'd2'],
  },
  baixo: { instrumento: BAIXO, oitava: -2, padroes: ['0 . . 0 | 4 . . .', '0 . . 0 | 4 . . 0'] },
  acorde: { instrumento: VIOLAO, voicing: [0, 4], padroes: ['. . x . | . . x .', '. . x . | . . x x'] },
  perc: [
    { instrumento: ATABAQUE, padroes: ['3...2...', '3..2.2..'] },
    { instrumento: PANDEIRO, padroes: '1.2.1.3.' },
    { instrumento: CABACA, padroes: ['.2......', '.2.....2'] },
    { instrumento: AGOGO, padroes: '..2...2.' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 0.84, baixo: 1.00, perc: 0.67 },
    perc: [{ instrumento: ATABAQUE_GRAVE, padroes: '3...3...' }],
    baixoOitava: 0,
    contracanto: { instrumento: CAVAQUINHO, graus: -2, atraso: 2 },
    troca: [
      { ...tom('sine', 0.45, { f0: 80, f1: 50, t: 0.3 }), quando: 0.12 },
      { ...ruido('highpass', 3000, 1, 0.3, 0.1, { atq: 0.15 }), quando: 0.15 },
    ],
  },
};
