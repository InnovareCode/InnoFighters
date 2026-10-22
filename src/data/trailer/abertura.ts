import type { ArranjoDef } from '../../audio/abertura';
import { ruido, tom } from '../musica/ajudantes';

/*
 * A MÚSICA da abertura (o trailer): 25 compassos a 150 BPM, 16 passos por compasso (1 passo = 6 ticks), c# eólio: C# D# E F# G# A B. Cada seção é um ato do
 * trailer (docs/spec-trailer-abertura.md §3 e §7.5). O arranjo é só DADO; a citação do tema de cada lutador (os 8 primeiros passos do lead, transpostos para esta
 * tônica) entra por cima, montada em src/trailer/musica.ts a partir dos próprios temas, então não aparece aqui. Nos 8 passos de uma citação o lead e o acorde do
 * arranjo CALAM (é como a citação cabe no orçamento de fontes e quem fala é o tema do lutador); baixo e percussão seguem.
 *
 * Motivo da abertura (a assinatura que volta no final): quinta para cima, quarta para cima e queda de segunda, graus 0, 4, 7, 6: +7, +5, -2 semitons. Saltos largos de
 * propósito: os leads dos 9 temas andam por graus conjuntos, então os trigramas de intervalos desta linha não coincidem com os deles (régua musical, dM).
 * Graus: 0 C#, 1 D#, 2 E, 3 F#, 4 G#, 5 A, 6 B; 7 = C# uma oitava acima (`4'` = grau 11, G# acima).
 *
 * TIMBRE: o que separa a abertura dos temas na régua (dT) é o timbre, então os instrumentos fogem do que os temas fazem. Lead de palheta (dente-de-serra por um
 * passa-faixa RELATIVO à nota, sempre com a mesma cor) ou de marimba (parciais inarmônicos, curtos): nenhum tema tem isso. Percussão de bigorna (quadrada curta e parcial
 * inarmônico) e de taiko de dente-de-serra, não de seno com queda de tom como a `fight` e os temas. ORÇAMENTO: no máximo 8 fontes novas por passo e 15 ativas; por isso
 * os acordes são de duas notas (quinta) e as camadas se revezam em passos diferentes.
 */

// --- instrumentos ---
const PALHETA = [tom('sawtooth', 0.12, { durNota: 0.7, atq: 0.03, filtro: { tipo: 'bandpass', f: 3, rel: true, Q: 4 } })];
const MARIMBA = [tom('sine', 0.12, { t: 0.4, atq: 0.002 }), tom('sine', 0.06, { rel: 2.76, t: 0.2, atq: 0.001 }), tom('sine', 0.03, { rel: 5.4, t: 0.08, atq: 0.001 })];
const SINO = [tom('sine', 0.12, { t: 0.9, atq: 0.002 }), tom('sine', 0.05, { rel: 2.76, t: 0.45, atq: 0.001 })];
/** O sino curto do braseiro: uma nota que acende e apaga, para não empilhar fontes quando soa a cada colcheia. */
const SINO_CURTO = [tom('sine', 0.13, { t: 0.4, atq: 0.002 })];
const SUB = [tom('sine', 0.3, { durNota: 0.95, atq: 0.015 })];
const BAIXO = [
  tom('sawtooth', 0.22, { t: 0.3, atq: 0.08, filtro: { tipo: 'bandpass', f: 2, rel: true, Q: 3 } }),
  tom('sine', 0.2, { rel: 1, t: 0.3, atq: 0.07 }),
];
const PAD = [tom('sawtooth', 0.045, { durNota: 1, atq: 0.3, filtro: { tipo: 'lowpass', f: 520 } })];
const STAB = [tom('square', 0.05, { t: 0.14, atq: 0.002, filtro: { tipo: 'lowpass', f: 1500 } })];
const TAIKO = [tom('sawtooth', 0.3, { f0: 190, f1: 85, t: 0.3, filtro: { tipo: 'lowpass', f: 520 } }), ruido('lowpass', 900, 1, 0.09, 0.08)];
const BIGORNA = [tom('square', 0.16, { f0: 620, f1: 470, t: 0.07 }), tom('sine', 0.1, { f0: 1630, t: 0.12 })];
const PALMA = [ruido('highpass', 3500, 2.5, 0.05, 0.15)];
const PRATO = [ruido('highpass', 9000, 1, 0.035, 0.06)];
const CAIXA = [ruido('bandpass', 2400, 1.4, 0.07, 0.15), tom('triangle', 0.09, { f0: 260, f1: 140, t: 0.06 })];

const SILENCIO = '. . . . | . . . . | . . . . | . . . .';

export const ABERTURA: ArranjoDef = {
  nome: 'Dez Mestres',
  bpm: 150,
  tonica: 61, // C#4
  escala: [0, 2, 3, 5, 7, 8, 10], // eólio
  volume: 1,
  mix: { lead: 0.9, baixo: 1.4, perc: 0.95 },
  secoes: [
    {
      // c1-c2 (P0): contraluz. Pad e sub graves, o sino anuncia o motivo; o raio cai no tempo 3 do c1 (passo 8) e o taiko marca as mínimas no c2
      nome: 'frio',
      compassos: 2,
      harmonia: [0, 0],
      medido: 1,
      pistas: [
        { papel: 'lead', instrumento: SINO, oitava: 1, padroes: ['0 - - - | - - - - | 4 - - - | - - - -', '7 - - - | - - - - | 6 - - - | - - - -'] },
        { papel: 'baixo', instrumento: SUB, oitava: -1, padroes: '0 - - - | - - - - | - - - - | - - - -' },
        { papel: 'acorde', instrumento: PAD, oitava: -1, semitons: [0, 7], padroes: 'x - - - | - - - - | - - - - | - - - -' },
        { papel: 'perc', instrumento: TAIKO, padroes: ['. . . . | . . . . | 3 . . . | . . . .', '3 . . . | . . . . | 3 . . . | . . . .'] },
        { papel: 'perc', instrumento: BIGORNA, padroes: ['. . . . | . . . . | . . . . | . . . .', '. . . . | 2 . . . | . . . . | 2 . . .'] },
      ],
    },
    {
      // c3-c8 (P1, C1, P2, C2): os quatro. Groove completo, o motivo na marimba. Nos compassos de plano de luta (c3, c4, c6, c7) o lead cala nos 8 primeiros passos para o tema do lutador falar
      nome: 'quatro',
      compassos: 6,
      harmonia: [0, 5, 2, 0, 5, 6],
      medido: 2,
      pistas: [
        {
          papel: 'lead',
          instrumento: MARIMBA,
          mix: 0.75,
          padroes: [
            '0 . . 4 | . . 7 . | 6 . 4 . | 2 . . .',
            '7 . 6 . | 4 . . 2 | 0 . 2 . | 4 . . .',
            '0 . . 4 | . . 7 . | . 6 . 9 | . . 7 .',
            "4 . . 7 | . 9 . 4' | 4' . 9 . | 7 . 6 4",
            "4' . 9 . | 7 . 6 4 | 2 . 4 . | 7 . . .",
            '0 . . 4 | . . 7 . | 6 . 4 . | 2 . 0 .',
          ],
        },
        { papel: 'baixo', instrumento: BAIXO, padroes: '0 . . 0 | . . 0 . | . . . 0 | . . 4 .' },
        { papel: 'acorde', instrumento: STAB, oitava: 0, semitons: [0, 7], padroes: '. . . . | . . . x | . . . . | . . . x' },
        { papel: 'perc', instrumento: BIGORNA, padroes: '. . 3 . | . 2 . . | 3 . . 2 | . . 2 .' },
        { papel: 'perc', instrumento: TAIKO, padroes: '3 . . . | . . . . | 2 . . . | . . . .' },
        { papel: 'perc', instrumento: PALMA, padroes: '. . . . | 3 . . . | . . . . | 3 . . 1' },
        { papel: 'perc', instrumento: PRATO, padroes: '. 1 . 1 | . 1 . 1 | . 1 . 1 | . 1 . 2' },
      ],
    },
    {
      // c9-c19 (P3-P7 e o cartão C3): os desafiantes. Percussão dobrada: bigorna e prato em colcheias; o lead (palheta) cala nos 8 primeiros passos de c9, c11, c14, c16 e c18
      nome: 'desafiantes',
      compassos: 11,
      harmonia: [0, 0, 5, 5, 2, 6, 6, 3, 3, 0, 6],
      medido: 4,
      pistas: [
        {
          papel: 'lead',
          instrumento: PALHETA,
          padroes: [
            '0 . 4 . | 7 . 6 . | 4 . 7 . | 6 . 4 .',
            '0 . 4 . | 7 . . 6 | . 4 . 2 | . 4 . 7',
            '2 . 6 . | 9 . 7 . | 7 . 6 . | 4 . 9 .',
            "4 . . 7 | . 9 . . | 4' . 9 . | 7 . 6 4",
            "0 . . 4 | . . 7 . | . 9 . 7 | . 4' . 7",
            '4 . 6 . | 9 . 7 . | 6 . 4 . | 2 . 4 7',
            '2 . 6 . | 9 . . 7 | . 6 . 4 | . 2 . 0',
            '0 . 2 . | 6 . 4 . | 2 . 6 . | 4 . 7 .',
            "4 . 7 . | 9 . . 7 | . 9 . 4' | . . 9 .",
            "4' . 9 . | 7 . 6 . | 0 . . 4 | . 7 . 9",
            "4' . . 9 | . 7 . . | 6 . 4 . | 7 . . .",
          ],
        },
        { papel: 'baixo', instrumento: BAIXO, padroes: ['0 . 0 . | . . 0 . | . 0 . . | 0 . . 4', '0 . . 0 | . 0 . . | 0 . 0 . | . 4 . .'] },
        { papel: 'acorde', instrumento: STAB, oitava: 0, semitons: [0, 7], padroes: ['. . . . | . . . x | . . . . | . x . .', '. . . . | . . . x | . . . . | . . x .'] },
        { papel: 'perc', instrumento: BIGORNA, padroes: '. 3 . 2 | . 2 . 3 | . 2 . 2 | . 3 . 2' },
        { papel: 'perc', instrumento: TAIKO, padroes: '3 . . . | . . 2 . | . . . . | 2 . . 2' },
        { papel: 'perc', instrumento: PALMA, padroes: '. . . . | 3 . . . | . . . . | 3 . 2 .' },
        { papel: 'perc', instrumento: PRATO, padroes: '1 . 1 . | 1 . 1 . | 1 . 1 . | 1 . 2 2' },
      ],
    },
    {
      // c20-c21 (P8, montagem): sobe. Caixa em colcheias, subida de ruído filtrado (impacto abaixo) e o lead em arpejo ascendente
      nome: 'montagem',
      compassos: 2,
      harmonia: [5, 6],
      medido: 1,
      pistas: [
        { papel: 'lead', instrumento: PALHETA, padroes: ["0 . 2 . | 4 . 6 . | 7 . 9 . | 4' . 6' .", "4 . 7 . | 4' . 7' . | 6' . 4' . | 7' - - -"] },
        { papel: 'baixo', instrumento: BAIXO, padroes: '0 . . . | 0 . . . | 0 . . . | 0 . . .' },
        { papel: 'acorde', instrumento: PAD, oitava: -1, semitons: [0, 7], padroes: 'x - - - | - - - - | - - - - | - - - -' },
        { papel: 'perc', instrumento: CAIXA, mix: 1.3, padroes: ['. . 2 . | 2 . 2 . | 2 . 2 . | 2 . 2 .', '2 . 2 . | 2 . 2 2 | 3 . 3 . | 3 3 3 3'] },
        { papel: 'perc', instrumento: TAIKO, padroes: '. . . . | 2 . . . | 3 . . . | 2 . . .' },
      ],
    },
    {
      // c22-c23 (P9, arconte): c22.1 um tempo de silêncio; depois o grave, o sino e a bigorna a cada braseiro (colcheias, passos 4 a 14); c23 a entrada do chefão, grave e sombria
      nome: 'arconte',
      compassos: 2,
      harmonia: [1, 0],
      medido: 0,
      pistas: [
        { papel: 'lead', instrumento: SINO_CURTO, oitava: 1, padroes: ['. . . . | 0 . 2 . | 3 . 4 . | 5 . 6 .', SILENCIO] },
        { papel: 'baixo', instrumento: BAIXO, padroes: ['. . . . | 0 . 0 . | 0 . 0 . | 0 . 0 .', SILENCIO] },
        { papel: 'baixo', instrumento: SUB, oitava: -1, padroes: [SILENCIO, '0 - - - | - - - - | - - - - | - - - -'] },
        { papel: 'acorde', instrumento: PAD, oitava: -1, semitons: [0, 7], padroes: [SILENCIO, 'x - - - | - - - - | - - - - | - - - -'] },
        { papel: 'perc', instrumento: TAIKO, padroes: ['. . . . | 2 . 2 . | 2 . 2 . | 3 . 3 .', '2 . . . | . . . . | . . . . | . . . .'] },
        { papel: 'perc', instrumento: BIGORNA, padroes: ['. . . . | . 3 . 3 | . 3 . 3 | . 3 . 3', SILENCIO] },
        { papel: 'perc', instrumento: PALMA, padroes: ['. . . . | 2 . . . | . . . . | 3 . . .', SILENCIO] },
      ],
    },
    {
      // c24-c25 (P10, logo): o impacto do logoSlam (ver `impactos`) no c24.1, o motivo da abertura de volta e o acorde final com cauda
      nome: 'logo',
      compassos: 2,
      harmonia: [0, 0],
      medido: 0,
      pistas: [
        { papel: 'lead', instrumento: PALHETA, padroes: ['. . . . | 0 . . 4 | . . 7 . | . 6 . 4', '7 - - - | - - - - | - - - - | - - - -'] },
        { papel: 'baixo', instrumento: SUB, oitava: -1, padroes: '0 - - - | - - - - | - - - - | - - - -' },
        { papel: 'acorde', instrumento: PAD, oitava: -1, semitons: [0, 7], padroes: ['. . . . | x - - - | - - - - | - - - -', 'x - - - | - - - - | - - - - | - - - -'] },
        { papel: 'perc', instrumento: BIGORNA, padroes: ['. . . . | 3 . . . | 3 . . . | 3 . 3 .', '2 . . . | . . . . | . . . . | . . . .'] },
        { papel: 'perc', instrumento: PALMA, padroes: ['. . . . | . . 3 . | . . 3 . | . . 3 3', '. . . . | . . . . | . . . . | . . . .'] },
      ],
    },
  ],
  // o logoSlam (src/audio/audio-sys.ts) escrito como música: o impacto no c24.1 (compasso 23, passo 0). O ruído e o grave no passo 0, o acorde logo depois, os brilhos nos passos 2 e 3
  impactos: [
    { ...ruido('lowpass', 5000, 1, 1.2, 0.2, { f1: 150 }), compasso: 23, passo: 0 },
    { ...tom('sine', 0.24, { f0: 150, f1: 70, t: 1.2 }), compasso: 23, passo: 0 },
    { ...tom('sawtooth', 0.05, { rel: 1, t: 1.6, filtro: { tipo: 'lowpass', f: 2600 } }), compasso: 23, passo: 0, quando: 0.05, semi: 0 },
    { ...tom('sawtooth', 0.05, { rel: 1, t: 1.6, filtro: { tipo: 'lowpass', f: 2600 } }), compasso: 23, passo: 0, quando: 0.08, semi: 7 },
    { ...tom('triangle', 0.05, { rel: 1, t: 0.5 }), compasso: 23, passo: 2, quando: 0.05, semi: 12 },
    { ...tom('triangle', 0.05, { rel: 1, t: 0.5 }), compasso: 23, passo: 3, quando: 0.03, semi: 15 },
    { ...tom('triangle', 0.05, { rel: 1, t: 0.5 }), compasso: 23, passo: 3, quando: 0.08, semi: 19 },
    // c20.1: a subida de ruído filtrado que abre a montagem (dura os dois compassos)
    { ...ruido('bandpass', 300, 1.2, 3.0, 0.14, { f1: 7000, atq: 2.0 }), compasso: 19, passo: 0 },
  ],
};
