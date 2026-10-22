import { ruido, tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * CAMILLE (França): Si, menor harmônica {Si Dó♯ Ré Mi Fá♯ Sol Lá♯}, 4/4 swing manouche a 192 bpm, 8 colcheias por compasso (swing 0,62), 16 compassos = 20 s.
 * Acordeão musette (duas quadradas desafinadas ±12 cents), guitarra no laço ímpar, contrabaixo andando, guitarra em "la pompe" (acorde nos tempos 2 e 4)
 * e vassourinha. Sem bumbo. Graus: 0 Si, 1 Dó♯, 2 Ré, 3 Mi, 4 Fá♯, 5 Sol, 6 Lá♯, 7 Si (oitava).
 */
const ACORDEAO = [
  tom('square', 0.06, { durNota: 0.9, atq: 0.02, desafina: 12, filtro: { tipo: 'lowpass', f: 6, rel: true } }),
  tom('square', 0.06, { durNota: 0.9, atq: 0.02, desafina: -12, filtro: { tipo: 'lowpass', f: 6, rel: true } }),
];
const GUITARRA = [tom('triangle', 0.12, { t: 0.3, filtro: { tipo: 'lowpass', f: 4000 } })];
const CONTRABAIXO = [tom('triangle', 0.35, { atq: 0.06, t: 0.3, filtro: { tipo: 'lowpass', f: 380 } })];
const POMPE = [tom('triangle', 0.05, { t: 0.07, filtro: { tipo: 'lowpass', f: 8, rel: true } })];
const VASSOURINHA = [ruido('lowpass', 3500, 0.7, 0.05, 0.06)];
const TAMBOR = [tom('sine', 0.3, { f0: 100, f1: 60, t: 0.15 })];

export const CAMILLE: TemaDef = {
  nome: 'Musette de Meia-Noite',
  origem: 'França',
  tonica: 71,
  escala: [0, 2, 3, 5, 7, 8, 11],
  compasso: { passos: 8, passosPorPulso: 2, pulsos: [4] },
  bpm: 192,
  swing: 0.62,
  compassos: 16,
  volume: 1,
  mix: { lead: 1.00, baixo: 1.00, perc: 1.00 },
  harmonia: [0, 3, 4, 0, 5, 3, 4, 0],
  lead: {
    instrumento: ACORDEAO,
    impar: { instrumento: GUITARRA, oitava: 0 },
    compassos: {
      a: '4 . 5 4 | 6 7 . 4',
      b: "2 . 1 0 | 6, . . .",
      c: '7 . 6 5 | 4 . 5 4',
      d: '2 . 3 4 | 5 6 7 .',
      e: '7 . 8 7 | 6 . 5 4',
      f: '5 . 4 3 | 2 . 1 0',
      g: '0 . 2 4 | 6 . 7 .',
      h: '7 - - 6 | 5 . 6 7',
      i: '4 . 3 2 | 0 - - .',
    },
    forma: ['a', 'b', 'a', 'c', 'a', 'b', 'd', 'f', 'e', 'c', 'g', 'h', 'e', 'f', 'd', 'i'],
  },
  baixo: { instrumento: CONTRABAIXO, oitava: -2, padroes: ['0 . 2 . 4 . 2 .', '0 . 4 . 2 . 6, .'] },
  acorde: { instrumento: POMPE, voicing: [0, 4], padroes: '. . x . . . x .' },
  perc: [{ instrumento: VASSOURINHA, padroes: '21212121' }],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.00, baixo: 0.94, perc: 0.84 },
    perc: [{ instrumento: TAMBOR, padroes: '3.3.3.3.' }],
    baixoOitava: 0,
    contracanto: { instrumento: GUITARRA, graus: -2, atraso: 1 },
    troca: [
      { ...tom('square', 0.06, { t: 0.5, atq: 0.05, desafina: 12, filtro: { tipo: 'lowpass', f: 3000 } }), quando: 0, semi: 0 },
      { ...tom('square', 0.06, { t: 0.5, atq: 0.05, desafina: -12, filtro: { tipo: 'lowpass', f: 3000 } }), quando: 0, semi: 7 },
      { ...ruido('lowpass', 3500, 0.7, 0.4, 0.1, { atq: 0.2 }), quando: 0 },
    ],
  },
};
