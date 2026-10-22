import { tom } from '../ajudantes';
import type { TemaDef } from '../tipos';

/*
 * AMINU (Nigéria): Si♭, hexatônica {Si♭ Dó Ré♭ Mi♭ Fá Lá♭}, 6/8 (2 x 6) a 116 bpm da semínima pontuada, 12 passos por compasso, 16 compassos = 16,6 s.
 * Chamada e resposta: a algaita chama, o kalangu (tambor falante, o tom cai uma quinta em 120 ms) responde. Sino-guia, ganga. Graus: 0 Si♭, 1 Dó, 2 Ré♭,
 * 3 Mi♭, 4 Fá, 5 Lá♭, 6 Si♭ (oitava).
 */
const ALGAITA = [tom('sawtooth', 0.13, { durNota: 0.85, atq: 0.02, filtro: { tipo: 'bandpass', f: 1200, Q: 4 } })];
const KORA = [tom('triangle', 0.08, { t: 0.25, filtro: { tipo: 'lowpass', f: 3000 } })];
const BAIXO = [tom('triangle', 0.38, { atq: 0.06, t: 0.4, filtro: { tipo: 'lowpass', f: 350 } })];
const SINO = [tom('triangle', 0.09, { f0: 2300, f1: 2200, t: 0.12 })];
const KALANGU = [tom('sine', 0.34, { f0: 220, f1: 146.8, t: 0.12 })];
const GANGA = [tom('sine', 0.4, { f0: 150, f1: 60, t: 0.25 })];
const DUNDUN = [tom('sine', 0.45, { f0: 180, f1: 80, t: 0.22 })];

export const AMINU: TemaDef = {
  nome: 'A Algaita Chama',
  origem: 'Nigéria',
  tonica: 70,
  escala: [0, 2, 3, 5, 7, 10],
  compasso: { passos: 12, passosPorPulso: 6, pulsos: [2] },
  bpm: 116,
  compassos: 16,
  volume: 1,
  mix: { lead: 0.79, baixo: 0.63, perc: 1.06 },
  harmonia: [0, 3, 4, 0],
  lead: {
    instrumento: ALGAITA,
    compassos: {
      a: '4 . 3 4 5 . | 4 3 2 1 0 .',
      b: '4 . 3 4 5 . | . . . . . .',
      c: '5 . 4 3 4 . | . . . . . .',
      d: '3 . 2 3 4 . | 3 2 1 0 . .',
      e: '7 . 6 5 4 . | . . . . . .',
      f: '5 . 4 3 2 . | 1 . 0 . . .',
      g: '0 . 1 2 3 . | 4 . 3 . . .',
      h: '4 . 3 2 1 . | 0 . . . . .',
    },
    forma: ['a', 'b', 'a', 'c', 'a', 'b', 'd', 'f', 'e', 'b', 'g', 'b', 'a', 'b', 'd', 'h'],
  },
  baixo: { instrumento: BAIXO, oitava: -2, padroes: '0 . . . . . | 4 . . 0 . .' },
  perc: [
    { instrumento: SINO, padroes: '3.2.22.2.2.2' },
    { instrumento: KALANGU, padroes: '3..2..3.22..' },
    { instrumento: GANGA, padroes: '3.....2.....' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.00, baixo: 1.00, perc: 0.89 },
    perc: [{ instrumento: DUNDUN, padroes: '3..2..3..2..' }],
    baixoOitava: 0,
    contracanto: { instrumento: KORA, graus: -2, atraso: 6 },
    troca: [
      { ...tom('sine', 0.5, { f0: 80, f1: 45, t: 0.5 }), quando: 0 },
      { ...tom('sine', 0.4, { f0: 220, f1: 146.8, t: 0.12 }), quando: 0.25 },
    ],
  },
};
