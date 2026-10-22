import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * WEI LONG (China): Fá, pentatônica gong {Fá Sol Lá Dó Ré}, 4/4 a 100 bpm, 16 passos por compasso, 8 compassos = 19,2 s. Esparso: calma e peso. Erhu
 * (dente-de-serra em passa-banda, com o deslize para a nota), guzheng no laço ímpar, dagu, bangu e prato pequeno. Graus: 0 Fá, 1 Sol, 2 Lá, 3 Dó, 4 Ré.
 */
const ERHU = [
  tom('sawtooth', 0.12, { durNota: 0.95, atq: 0.06, deslize: 1, filtro: { tipo: 'bandpass', f: 2.5, rel: true, Q: 1.5 } }),
  tom('sawtooth', 0.06, { durNota: 0.95, atq: 0.06, deslize: 1, desafina: 10, filtro: { tipo: 'bandpass', f: 2.5, rel: true, Q: 1.5 } }),
];
const GUZHENG = [tom('triangle', 0.12, { t: 0.5, filtro: { tipo: 'lowpass', f: 3500 } })];
const BAIXO = [tom('sine', 0.3, { atq: 0.06, durNota: 1 })];
const DAGU = [tom('sine', 0.5, { f0: 150, f1: 60, t: 0.35 })];
const BANGU = [tom('square', 0.1, { f0: 2400, t: 0.025, atq: 0.001 }), ruido('bandpass', 3000, 5, 0.03, 0.15)];
const PRATO = [ruido('highpass', 7500, 1, 0.25, 0.08), tom('triangle', 0.04, { f0: 5200, t: 0.2 })];
const TAIGU = [tom('sine', 0.45, { f0: 120, f1: 50, t: 0.3 })];

export const WEI_LONG: TemaDef = {
  nome: 'O Dragão Calmo',
  origem: 'China',
  tonica: 65,
  escala: [0, 2, 4, 7, 9],
  compasso: { passos: 16, passosPorPulso: 4, pulsos: [4] },
  bpm: 100,
  compassos: 8,
  volume: 1,
  mix: { lead: 1.00, baixo: 1.00, perc: 1.00 },
  harmonia: [0, 0, 3, 0, 0, 4, 3, 0],
  lead: {
    instrumento: ERHU,
    impar: { instrumento: GUZHENG, oitava: 0 },
    compassos: {
      a: '3 . 4 3 | 2 . 1 . | 0 1 2 . | 3 - - -',
      b: '3 . 4 3 | 2 . 1 2 | 3 . . 4 | 3 - - .',
      c: '5 - - 4 | 3 . 4 3 | 2 - 1 - | 0 - - -',
      d: '0 . 1 . | 2 . 3 . | 4 - 3 - | 2 . . .',
      e: '3 - 4 - | 5 - - 4 | 3 . 2 1 | 2 - - -',
      f: '7 - 5 - | 6 . 5 4 | 3 - 4 3 | 2 - - -',
      h: '0 - - - | 1 . 0 . | 2 . 1 . | 0 - - -',
    },
    forma: ['a', 'b', 'a', 'c', 'd', 'e', 'f', 'h'],
  },
  baixo: { instrumento: BAIXO, padroes: ['0 - - - | 0 - - - | 3 - - - | 3 - - -', '0 - - - | 0 - - - | 4 - - - | 3 - - -'] },
  perc: [
    { instrumento: DAGU, padroes: '3.......3.......' },
    { instrumento: BANGU, padroes: '2..1..2.2..1....' },
    { instrumento: PRATO, padroes: '....2.......2...' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.88, baixo: 0.79, perc: 0.45 },
    perc: [{ instrumento: TAIGU, padroes: '3...3...3...3...' }],
    baixoOitava: -1,
    contracanto: { instrumento: GUZHENG, graus: -2, atraso: 2 },
    troca: [
      { ...tom('sine', 0.4, { f0: 110, t: 1.2, atq: 0.01 }), quando: 0 },
      { ...ruido('bandpass', 600, 1, 0.5, 0.1, { f1: 1800, atq: 0.2 }), quando: 0 },
    ],
  },
};
