import { ruido, tom } from '../ajudantes';
import type { CamadaVoz, TemaDef } from '../tipos';

/*
 * BAATAR (Mongólia): Mi♭, pentatônica suspensa {Mi♭ Fá Lá♭ Si♭ Ré♭}, 2/4 galope (longa-curta-curta) a 120 bpm, 8 passos por compasso, 16 compassos = 16 s.
 * Morin khuur (arco grave com o passa-banda de 900 Hz), khöömei (a única `V`: canto de garganta com o formante extra de 1400 Hz, 1 nota a cada 2 compassos),
 * tambor grave e o casco. Graus: 0 Mi♭, 1 Fá, 2 Lá♭, 3 Si♭, 4 Ré♭, 5 Mi♭ (oitava), 6 Fá.
 */
const MORIN = [
  tom('sawtooth', 0.09, { durNota: 0.95, atq: 0.05, filtro: { tipo: 'bandpass', f: 900, Q: 2 } }),
  tom('sawtooth', 0.05, { durNota: 0.95, atq: 0.05, desafina: 7, filtro: { tipo: 'bandpass', f: 900, Q: 2 } }),
];
const MORIN_2 = [tom('triangle', 0.08, { durNota: 0.5, atq: 0.03, filtro: { tipo: 'lowpass', f: 1500 } })];
const BAIXO = [tom('triangle', 0.3, { atq: 0.06, t: 0.3, filtro: { tipo: 'lowpass', f: 350 } })];
const KHOOMEI: CamadaVoz = {
  k: 'V',
  onda: 'sawtooth',
  contorno: [1, 1, 1],
  durNota: 1,
  vol: 0.09,
  formantes: [500, 1000, 2500],
  q: 5,
  ganhoF3: 0.3,
  atq: 0.25,
  extra: { f: 1400, q: 8, ganho: 1.6 },
};
const TAMBOR = [tom('sine', 0.5, { f0: 170, f1: 70, t: 0.25 })];
const TAMBOR_GRAVE = [tom('sine', 0.45, { f0: 180, f1: 80, t: 0.25 })];
const CASCO = [ruido('bandpass', 1500, 4, 0.03, 0.1)];

export const BAATAR: TemaDef = {
  nome: 'Galope na Estepe',
  origem: 'Mongólia',
  tonica: 63,
  escala: [0, 2, 5, 7, 10],
  compasso: { passos: 8, passosPorPulso: 4, pulsos: [2] },
  bpm: 120,
  compassos: 16,
  volume: 1,
  mix: { lead: 1.00, baixo: 0.75, perc: 0.84 },
  harmonia: [0, 0, 2, 0],
  lead: {
    instrumento: MORIN,
    compassos: {
      a1: '3 . 2 3 | 4 . 3 2',
      a2: '1 . 0 . | 0 - - -',
      a3: '1 . 0 . | 1 - 2 .',
      b1: '3 . 3 4 | 5 . 4 3',
      b2: '4 . 3 2 | 3 - - .',
      b3: '5 . 4 3 | 2 - 1 .',
      c1: '6 . 5 4 | 3 . 2 3',
      c2: '2 . 1 0 | 1 - - .',
      d1: '0 . 1 . | 2 . 3 .',
      d2: '3 - 2 1 | 0 - - -',
    },
    forma: ['a1', 'a2', 'a1', 'a3', 'b1', 'b2', 'b1', 'b3', 'c1', 'c2', 'c1', 'c2', 'd1', 'd2', 'a1', 'a2'],
  },
  baixo: { instrumento: BAIXO, padroes: ['0 . 0 0 | 0 . 0 0', '0 . 0 0 | 3 . 3 3'] },
  acorde: { instrumento: [KHOOMEI], voicing: [0], semitons: [0], oitava: -1, padroes: ['x - - - - - - -', '. . . . . . . .'] },
  perc: [
    { instrumento: TAMBOR, padroes: '3.21 3.21' },
    { instrumento: CASCO, padroes: '.2.. .2..' },
  ],
  fase2: {
    andamento: 1.08,
    mix: { lead: 1.00, baixo: 0.56, perc: 1.00 },
    perc: [{ instrumento: TAMBOR_GRAVE, padroes: '3... 3...' }],
    baixoOitava: -1,
    contracanto: { instrumento: MORIN_2, graus: -2, atraso: 2 },
    troca: [
      { ...tom('sine', 0.5, { f0: 110, f1: 50, t: 0.3 }), quando: 0.13 },
      { ...ruido('bandpass', 1500, 4, 0.3, 0.1, { f1: 4000, atq: 0.15 }), quando: 0.13 },
    ],
  },
};
