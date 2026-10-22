import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * MIN-JI (Coreia do Sul): Lá, gyemyeonjo {Lá Dó Ré Mi Sol}, 12/8 jajinmori (4 x 3) a 120 bpm da semínima pontuada (a spec escrevia 108: a 120 o par WEI LONG x MIN-JI passa na régua), 12 passos por compasso,
 * 8 compassos = 16 s. Haegeum (arco), gayageum no laço ímpar, janggu (deok agudo e kung grave) e kkwaenggwari. Graus: 0 Lá, 1 Dó, 2 Ré, 3 Mi, 4 Sol.
 */
const HAEGEUM = [tom('square', 0.1, { durNota: 0.95, atq: 0.08, filtro: { tipo: 'lowpass', f: 3, rel: true } }), tom('sine', 0.08, { rel: 2, durNota: 0.95, atq: 0.08 })];
const GAYAGEUM = [tom('triangle', 0.13, { t: 0.45, filtro: { tipo: 'lowpass', f: 3000 } })];
const BAIXO = [tom('sawtooth', 0.2, { atq: 0.06, t: 0.7, filtro: { tipo: 'lowpass', f: 300 } })];
const KUNG = [tom('sine', 0.36, { f0: 170, f1: 70, t: 0.22 })];
const DEOK = [ruido('bandpass', 2200, 3, 0.05, 0.25)];
const KKWAENGGWARI = [ruido('bandpass', 3000, 8, 0.1, 0.12)];
const BUK = [tom('sine', 0.4, { f0: 140, f1: 60, t: 0.25 })];

export const MIN_JI: TemaDef = {
  nome: 'Jajinmori',
  origem: 'Coreia do Sul',
  tonica: 69,
  escala: [0, 3, 5, 7, 10],
  compasso: { passos: 12, passosPorPulso: 3, pulsos: [4] },
  bpm: 120,
  compassos: 8,
  volume: 1,
  mix: { lead: 1.00, baixo: 1.78, perc: 1.41 },
  harmonia: [0, 0, 2, 0, 0, 3, 2, 0],
  lead: {
    instrumento: HAEGEUM,
    impar: { instrumento: GAYAGEUM, oitava: 0 },
    compassos: {
      a: '3 . 3 | 2 1 2 | 3 . 4 | 5 - -',
      b: '5 . 5 | 4 3 4 | 3 . 2 | 3 - -',
      c: '4 . 3 | 2 . 1 | 2 . 3 | 2 - -',
      d: '3 . 4 | 5 . 6 | 7 - 6 | 5 - -',
      e: '5 - - | 4 3 4 | 3 . 2 | 1 - -',
      f: '2 . 2 | 1 . 0 | 1 . 2 | 3 - -',
      g: '1 . 0 | 2 1 2 | 3 . 2 | 1 . 0',
    },
    forma: ['a', 'b', 'a', 'c', 'd', 'e', 'f', 'g'],
  },
  baixo: { instrumento: BAIXO, oitava: -2, padroes: ['0 - - | - - - | 3 - - | - - -', '0 - - | 0 - - | 3 - - | 3 - -'] },
  perc: [
    { instrumento: KUNG, padroes: '3.....3.....' },
    { instrumento: DEOK, padroes: '..22.2..22..' },
    { instrumento: KKWAENGGWARI, padroes: '2..2..2..2..' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 0.89, baixo: 0.53, perc: 0.67 },
    perc: [{ instrumento: BUK, padroes: '3..3..3..3..' }],
    baixoOitava: -1,
    contracanto: { instrumento: GAYAGEUM, graus: -2, atraso: 3 },
    troca: [
      { ...tom('sine', 0.45, { f0: 100, f1: 50, t: 0.5 }), quando: 0 },
      { ...ruido('bandpass', 2200, 3, 0.05, 0.2), quando: 0.2 },
      { ...ruido('bandpass', 2200, 3, 0.05, 0.2), quando: 0.3 },
      { ...ruido('bandpass', 2200, 3, 0.05, 0.2), quando: 0.4 },
      { ...tom('square', 0.05, { f0: 2900, t: 0.12 }), quando: 0 },
    ],
  },
};
