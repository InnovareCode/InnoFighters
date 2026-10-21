import { CALIBRACAO_ASSINATURA } from './calibracao';
import { gr, sil } from './gritos';
import type { AssinaturaEspecial, Camada, Chamada, Grito, Silaba } from './tipos';

/*
 * As assinaturas dos 33 especiais (docs/spec-sons-por-lutador.md §4.2), chave `<id>.<ficha|base>.<golpe>` (a mesma de IDENTIDADES). Cada uma é a
 * conjuração (o golpe começando), o lançamento (só os 7 projéteis), a estampa (o impacto, ou a camada sobre punch/kick) e o grito do lutador.
 * Notação do Apolo: T(onda f0->f1, duração s, vol, +quando, filtro) = tone(); R(filtro f0->f1, Q, duração s, vol, +quando) = noise().
 * Cada chamada leva uma CAMADA (ataque/corpo/cauda/extra): ela decide a ordem de corte quando falta orçamento de fontes (src/audio/orcamento-sonoro.ts).
 * Palavras reais dos gritos: (rev.), ver gritos.ts. Cada especial usa instrumento próprio: é o desenho que defende o R2 (§7.2), junto do R2b.
 */

type Filtro = readonly [BiquadFilterType, number];
const T = (camada: Camada, tipo: OscillatorType, f0: number, f1: number | null, t: number, vol: number, quando = 0, filtro?: Filtro, desafina?: number): Chamada => ({
  k: 'T', tipo, f0, ...(f1 === null ? {} : { f1 }), t, vol, ...(quando ? { quando } : {}), ...(filtro ? { filtro: { tipo: filtro[0], f: filtro[1] } } : {}), ...(desafina === undefined ? {} : { desafina }), camada,
});
const R = (camada: Camada, tipo: BiquadFilterType, f0: number, f1: number | null, Q: number, t: number, vol: number, quando = 0, atq?: number): Chamada => ({
  k: 'R', tipo, f0, ...(f1 === null ? {} : { f1 }), Q, t, vol, ...(quando ? { quando } : {}), ...(atq === undefined ? {} : { atq }), camada,
});
/** O grito do especial usa o f0 x 1,25 do perfil, salvo indicação (`fatorF0`). */
const gs = (silabas: Silaba[], o: Omit<Grito, 'silabas' | 'fatorF0'> & { fatorF0?: number } = {}): Grito => gr(silabas, { fatorF0: 1.25, ...o });

// --- peças repetidas ---
/** Caxixi do CAIO: ruído 3 kHz curto. */
const CAXIXI = (quando = 0): Chamada => R('ataque', 'bandpass', 3000, null, 3, 0.05, 0.2, quando);
/** Batida do cravo e do bumbo do ZENON (`BATIDA_ZENON` da tarja). */
const BATIDA_ZENON: readonly Chamada[] = [T('ataque', 'triangle', 1175, 880, 0.12, 0.1), T('corpo', 'sine', 50, null, 0.4, 0.7)];
/** Moedas do ZENON: o dreno se ouve (3 x T(triângulo 2637, 0,05, 0,05) a +0/+40/+80 ms). */
const MOEDAS_ZENON: readonly Chamada[] = [0, 0.04, 0.08].map((q) => T('extra', 'triangle', 2637, null, 0.05, 0.05, q));
/** O zumbido do atordoamento da NILA: dois senos de 1760 Hz desafinados em 12 cents (o batimento). Está nas quatro assinaturas: é a mesma pessoa nas duas posturas. */
const ZUMBIDO: readonly Chamada[] = [T('cauda', 'sine', 1760, null, 0.6, 0.04), T('cauda', 'sine', 1760, null, 0.6, 0.04, 0, undefined, 12)];
const ORGAO_CURTO: readonly Chamada[] = [T('corpo', 'sawtooth', 147, null, 0.3, 0.08, 0, ['lowpass', 900]), T('corpo', 'sawtooth', 220, null, 0.3, 0.05, 0, ['lowpass', 900])];

const SELO_LANCAMENTO: readonly Chamada[] = [
  T('ataque', 'triangle', 1175, 880, 0.12, 0.1),
  R('corpo', 'bandpass', 500, null, 3, 0.5, 0.1),
  T('cauda', 'sawtooth', 147, null, 0.5, 0.05, 0, ['lowpass', 900]),
  T('cauda', 'sawtooth', 220, null, 0.5, 0.05, 0, ['lowpass', 900]),
];
const SELO_ESTAMPA: readonly Chamada[] = [T('ataque', 'triangle', 1175, 880, 0.12, 0.1), T('corpo', 'sine', 50, null, 0.4, 0.6), R('cauda', 'lowpass', 1200, 100, 1, 0.3, 0.4)];

const BRUTAS: Readonly<Record<string, AssinaturaEspecial>> = {
  // ---- E1 RAIO, HAYATO: estalo elétrico em rajada + quadrada aguda (base Mi5 659 Hz)
  'hayato.base.sFire': {
    grito: gs([sil('a', 0.17, { c: 'r', v2: 'i', st: [-5, -4, -6] }), sil('a', 0.2, { c: 'd', st: [-6, -5, -9] })]), // RAI-DAN!
    conjuracao: [...[0, 0.04, 0.08].map((q) => R('ataque', 'highpass', 5000, null, 1, 0.04, 0.25, q)), T('cauda', 'square', 659, null, 0.12, 0.04)],
    estilo: 'orb',
    lancamento: [
      R('ataque', 'highpass', 6000, null, 1, 0.03, 0.35),
      T('corpo', 'square', 659, 1318, 0.18, 0.08),
      T('corpo', 'sawtooth', 110, null, 0.3, 0.12, 0, ['lowpass', 900]),
      R('cauda', 'bandpass', 3000, 800, 2, 0.25, 0.15),
    ],
    estampa: [
      R('ataque', 'highpass', 4000, null, 1, 0.05, 0.4),
      T('corpo', 'square', 1318, 330, 0.12, 0.1),
      T('corpo', 'sine', 90, 35, 0.25, 0.5),
      R('cauda', 'highpass', 5000, null, 1, 0.03, 0.2, 0.05),
      R('cauda', 'highpass', 5000, null, 1, 0.03, 0.2, 0.11),
    ],
  },
  'hayato.base.sDown': {
    grito: gs([sil('a', 0.15, { c: 'r', v2: 'i' }), sil('e', 0.2, { c: 'k', fim: 'n' })]), // RAI-KEN!
    conjuracao: [R('corpo', 'lowpass', 2000, 200, 1, 0.35, 0.4), T('corpo', 'square', 330, 990, 0.1, 0.08), T('cauda', 'square', 659, null, 0.12, 0.04)],
    estampa: [R('ataque', 'highpass', 5000, null, 1, 0.04, 0.35), T('corpo', 'square', 990, 1976, 0.08, 0.07), T('cauda', 'sine', 120, 40, 0.2, 0.5)],
  },
  'hayato.base.sFwd': {
    grito: gs([sil('a', 0.15, { c: 'k' }), sil('i', 0.18)]), // KA-MI!
    conjuracao: [R('corpo', 'bandpass', 1200, 5000, 2, 0.12, 0.3), R('extra', 'highpass', 7000, null, 1, 0.02, 0.2, 0.06), T('cauda', 'square', 659, null, 0.12, 0.04)],
    estampa: [R('ataque', 'highpass', 5000, null, 1, 0.04, 0.3), T('corpo', 'square', 659, null, 0.06, 0.08)],
  },
  // ---- E2 ESCAMA DE DRAGÃO, WEI LONG: bumbo grave longo + ronco (base Sol2 98 Hz; sem gongo)
  'wei-long.base.sFire': {
    grito: gs([sil('o', 0.25, { c: 'h' }), sil('a', 0.3, { c: 'h' })]), // HŌ-HA!
    conjuracao: [T('corpo', 'sine', 70, 45, 0.6, 0.5), R('corpo', 'lowpass', 400, 80, 1, 0.5, 0.3)],
    estilo: 'orb',
    lancamento: [
      T('ataque', 'sine', 140, 70, 0.08, 0.5),
      T('corpo', 'sine', 98, null, 0.9, 0.3),
      T('corpo', 'sawtooth', 70, 55, 0.6, 0.12, 0, ['lowpass', 400]),
      R('corpo', 'bandpass', 300, null, 1, 0.8, 0.25, 0, 0.15),
      T('cauda', 'sine', 49, null, 1.0, 0.25, 0.2),
    ],
    estampa: [T('ataque', 'sine', 98, 40, 0.5, 0.7), R('corpo', 'lowpass', 600, 80, 1, 0.45, 0.5), T('cauda', 'sawtooth', 55, null, 0.3, 0.1, 0, ['lowpass', 300])],
  },
  'wei-long.base.sDown': {
    grito: gs([sil('e', 0.25, { c: 'z', fim: 'n' })], { fatorF0: 1.0 }), // ZHEN!
    conjuracao: [T('corpo', 'sine', 60, 35, 0.4, 0.8), R('corpo', 'lowpass', 250, null, 1, 0.5, 0.5)],
    estilo: 'wave',
    lancamento: [...[0, 0.09, 0.18].map((q) => T('corpo', 'sine', 80, 40, 0.12, 0.4, q)), R('cauda', 'lowpass', 180, null, 1, 0.6, 0.35)],
    estampa: [R('ataque', 'highpass', 1500, null, 1, 0.03, 0.4), T('ataque', 'sine', 70, 30, 0.35, 0.7), R('corpo', 'lowpass', 300, 60, 1, 0.3, 0.45), R('cauda', 'bandpass', 180, null, 6, 0.55, 0.4), T('cauda', 'sawtooth', 45, null, 0.5, 0.15, 0, ['lowpass', 200])], // a rachadura e o tremor ressonante que continua
  },
  'wei-long.base.sFwd': {
    grito: gs([sil('a', 0.28, { c: 'k', v2: 'o' })]), // KAO!
    conjuracao: [T('corpo', 'triangle', 220, null, 0.5, 0.15), R('corpo', 'bandpass', 400, null, 2, 0.2, 0.3)],
    estampa: [T('ataque', 'triangle', 440, 220, 0.15, 0.15), T('corpo', 'sine', 55, null, 0.5, 0.7), R('cauda', 'lowpass', 800, 100, 1, 0.25, 0.4)],
  },
  // ---- E3 LÂMINA CRESCENTE, MIN-JI: sopro agudo subindo + sino pequeno (Dó#6 1109 Hz)
  'min-ji.base.sFire': {
    grito: gs([sil('u', 0.18, { c: 'b' }), sil('o', 0.2, { c: 'k', fim: 't' })]), // BUL-KOT!
    conjuracao: [T('cauda', 'triangle', 1109, null, 0.2, 0.05)], // o grito basta; o golpe solta 2 lâminas (o sino pequeno, só uma lembrança)
    estilo: 'blade',
    lancamento: [R('corpo', 'bandpass', 1800, 4200, 1.5, 0.1, 0.25), T('corpo', 'triangle', 1109, null, 0.15, 0.08), R('extra', 'highpass', 3000, null, 1, 0.08, 0.1)],
    estampa: [R('ataque', 'bandpass', 4200, 1500, 1.5, 0.08, 0.3), T('corpo', 'triangle', 1109, 1661, 0.1, 0.1), T('cauda', 'sine', 160, 60, 0.12, 0.35)],
  },
  'min-ji.base.sDown': {
    grito: gs([sil('i', 0.15, { c: 'h' }), sil('a', 0.25, { fim: 'p' })]), // HI-YAAP!
    conjuracao: [R('corpo', 'bandpass', 1500, null, 1.5, 0.08, 0.25), R('corpo', 'bandpass', 2200, null, 1.5, 0.08, 0.25, 0.06), R('corpo', 'bandpass', 3200, null, 1.5, 0.08, 0.25, 0.12), T('cauda', 'triangle', 1109, null, 0.2, 0.05)],
    estampa: [R('ataque', 'bandpass', 2500, 4500, 1.5, 0.06, 0.25), T('corpo', 'triangle', 1109, null, 0.08, 0.08)],
    porAcerto: [1, 1.26, 1.5], // o sino sobe a cada acerto
  },
  'min-ji.base.sFwd': {
    grito: gs([sil('u', 0.15, { c: 't', v2: 'i' }), sil('o', 0.2)]), // TWI-O!
    conjuracao: [R('corpo', 'bandpass', 900, 3000, 1.2, 0.25, 0.3), T('cauda', 'triangle', 1109, null, 0.2, 0.05)],
    estampa: [R('ataque', 'bandpass', 3000, 900, 1.2, 0.1, 0.3), T('corpo', 'sine', 120, 35, 0.22, 0.5), T('cauda', 'triangle', 1109, null, 0.2, 0.1)],
  },
  // ---- E4 ARCO DE GINGA, CAIO: berimbau (triângulo 196->220 Hz, o "dóin" que sobe) + caxixi
  'caio.base.sFire': {
    grito: gs([sil('i', 0.35, { v2: 'ê', st: [0, 2, 4] })]), // IÊ!
    conjuracao: [CAXIXI()],
    estilo: 'boomerang',
    lancamento: [T('corpo', 'triangle', 196, 220, 0.35, 0.3), CAXIXI(), CAXIXI(0.08), R('cauda', 'bandpass', 700, 1500, 1, 0.35, 0.12)],
    estampa: [T('corpo', 'triangle', 220, 196, 0.2, 0.3), CAXIXI(), T('cauda', 'sine', 140, 60, 0.15, 0.4)], // o dóin DESCENDO
  },
  'caio.base.sDown': {
    grito: gs([sil('o', 0.18), sil('a', 0.2)]), // Ô-A!
    conjuracao: [R('corpo', 'bandpass', 600, 1600, 1, 0.3, 0.3), T('corpo', 'triangle', 147, 165, 0.3, 0.25)],
    estampa: [T('corpo', 'triangle', 165, 147, 0.2, 0.25), CAXIXI()],
  },
  'caio.base.sFwd': {
    grito: gs([sil('ê', 0.15), sil('ê', 0.2, { c: 'h' })]), // Ê-HÊ!
    conjuracao: [T('corpo', 'triangle', 294, 330, 0.25, 0.25), CAXIXI(), CAXIXI(0.08)],
    estampa: [T('corpo', 'triangle', 330, 294, 0.15, 0.2), T('cauda', 'sine', 120, 35, 0.22, 0.5)],
  },
  // ---- E5 CORDA TRANÇADA, AMINU: kalangu (seno que DESCE 180->120 Hz) + estalo de pele 900 Hz
  'aminu.base.sFire': {
    grito: gs([sil('a', 0.2, { c: 'h', v2: 'u', st: [0, -3, -7] })]), // HAU!
    conjuracao: [T('corpo', 'sine', 180, 120, 0.22, 0.4), R('ataque', 'bandpass', 900, null, 2, 0.03, 0.3)],
    estampa: [T('corpo', 'sine', 180, 120, 0.15, 0.45)],
    porNivel: true, // nivelCarga batidas
    carga: [
      [T('corpo', 'sine', 180, 120, 0.15, 0.45)],
      [0, 0.07].map((q) => T('corpo', 'sine', 240, 150, 0.15, 0.45, q)),
      [0, 0.07, 0.14].map((q) => T('corpo', 'sine', 300, 180, 0.15, 0.45, q)),
    ],
  },
  'aminu.base.sDown': {
    grito: null, // GARKUWA: o rival não é avisado (D-S3)
    conjuracao: [T('corpo', 'sine', 260, 200, 0.12, 0.25)], // só a postura: pele esticada
    estampa: [],
    sucesso: {
      grito: gs([sil('a', 0.15, { c: 'h', fim: 'p' })]), // HAP!
      chamadas: [R('ataque', 'highpass', 2500, null, 1, 0.05, 0.2), T('corpo', 'sine', 90, 45, 0.25, 0.5), T('corpo', 'sine', 300, 200, 0.12, 0.4), T('corpo', 'sine', 240, 160, 0.12, 0.4, 0.07)],
    },
  },
  'aminu.base.sFwd': {
    grito: gs([sil('a', 0.15, { c: 'z' }), sil('i', 0.18, { c: 'k' })]), // ZA-KI! (rev.)
    conjuracao: [T('corpo', 'sine', 180, 120, 0.2, 0.45), T('corpo', 'sine', 160, 110, 0.2, 0.45, 0.09), R('cauda', 'bandpass', 400, null, 1, 0.25, 0.3)],
    estampa: [T('corpo', 'sine', 160, 110, 0.2, 0.45), R('ataque', 'bandpass', 900, null, 2, 0.03, 0.3), R('cauda', 'lowpass', 500, 100, 1, 0.2, 0.3)],
  },
  // ---- E6 ESTRELA DE LUCHA, CENTELLA: sino do ringue (triângulo 1568 + seno 2350 Hz) + torcida (ruído 700 Hz de ataque lento)
  'centella.base.sFire': {
    grito: gs([sil('o', 0.15), sil('a', 0.17, { c: 'r' }), sil('e', 0.17, { c: 'r' })]), // ¡Ó-RA-LE! (rev.)
    conjuracao: [T('corpo', 'triangle', 1568, null, 0.6, 0.2), T('corpo', 'sine', 2350, null, 0.4, 0.08), R('cauda', 'bandpass', 700, null, 0.8, 0.7, 0.2, 0, 0.2)],
    estampa: [T('corpo', 'sine', 120, 35, 0.22, 0.5), R('corpo', 'lowpass', 1500, 150, 1, 0.3, 0.45), R('cauda', 'bandpass', 900, null, 0.7, 0.6, 0.18, 0, 0.15)],
  },
  'centella.base.sDown': {
    grito: gs([sil('u', 0.15, { c: 'h' }), sil('a', 0.2, { c: 'r' })]), // ¡HU-RA!
    conjuracao: [R('corpo', 'bandpass', 800, 3000, 1.2, 0.2, 0.3)],
    estampa: [T('corpo', 'triangle', 1568, null, 0.3, 0.15), R('corpo', 'lowpass', 1200, 100, 1, 0.3, 0.5), R('cauda', 'bandpass', 600, null, 1, 0.5, 0.2, 0, 0.1)],
  },
  'centella.base.sFwd': {
    grito: gs([sil('a', 0.17, { st: [0, 4, 5] }), sil('u', 0.18, { c: 'ch' })]), // ¡YA-JÚ!
    conjuracao: [T('corpo', 'sawtooth', 98, 140, 0.3, 0.12, 0, ['lowpass', 800])],
    estampa: [T('corpo', 'sine', 220, 440, 0.15, 0.25), T('corpo', 'sine', 120, 40, 0.22, 0.5), T('cauda', 'triangle', 1568, null, 0.2, 0.1)],
    rebote: [T('corpo', 'sawtooth', 140, 98, 0.25, 0.15, 0, ['lowpass', 1200]), T('corpo', 'sine', 220, 440, 0.15, 0.3)],
  },
  // ---- E7 FIO DE FLORETE, CAMILLE: lâmina (triângulo 2637 Hz longo e baixo + chiado passa-alta 6 kHz)
  'camille.base.sFire': {
    grito: null, // PARADE: o grito vem no sucesso (D-S3)
    conjuracao: [T('corpo', 'triangle', 2637, null, 0.3, 0.04)], // a lâmina erguida, quase inaudível
    estampa: [],
    sucesso: {
      grito: gs([sil('é', 0.18, { c: 'h' })]), // HÉ!
      chamadas: [T('corpo', 'triangle', 3136, null, 0.08, 0.15), T('corpo', 'triangle', 3520, null, 0.08, 0.15, 0.05), R('ataque', 'highpass', 6000, null, 1, 0.1, 0.2)],
    },
    resposta: {
      golpe: 'sResp',
      grito: gs([sil('u', 0.15, { c: 't' }), sil('é', 0.2, { c: 'ch' })]), // TOU-CHÉ! (rev.)
      estampa: [T('corpo', 'triangle', 2637, 1760, 0.25, 0.12), R('ataque', 'highpass', 6000, null, 1, 0.08, 0.2)],
    },
  },
  'camille.base.sDown': {
    grito: gs([sil('a', 0.15), sil('ê', 0.2, { c: 'r', fim: 't' })]), // AR-RÊT!
    conjuracao: [R('corpo', 'highpass', 5000, 8000, 1, 0.08, 0.25)],
    estampa: [T('corpo', 'sine', 190, 50, 0.13, 0.5), T('corpo', 'triangle', 3520, null, 0.12, 0.1), R('ataque', 'highpass', 7000, null, 1, 0.04, 0.25)],
    contraEspecial: [T('extra', 'square', 880, null, 0.25, 0.06, 0.05, ['lowpass', 2000])], // o bip do placar elétrico da esgrima
  },
  'camille.base.sFwd': {
    grito: gs([sil('e', 0.15, { c: 'r' }), sil('é', 0.2, { c: 's' })]), // RE-VERS!
    conjuracao: [R('corpo', 'bandpass', 2000, 700, 1, 0.2, 0.25)],
    estampa: [T('corpo', 'triangle', 2637, null, 0.2, 0.12), R('ataque', 'bandpass', 1500, null, 2, 0.05, 0.2)],
  },
  // ---- E8 CHAMA DE LAMPARINA, NILA GAJA: chenda (seno 140->90 em rufo). E9 ESPIRAL DE SERPENTE, SARPA: chiado 5,2 kHz, Q 4
  'nila.base.sFire': {
    grito: gr([sil('m', 0.2)], { fatorF0: 1.25, vol: 0.6 }), // HM!
    conjuracao: [T('corpo', 'sine', 880, null, 0.5, 0.06), R('ataque', 'bandpass', 1200, null, 2, 0.02, 0.3)],
    estampa: [T('corpo', 'sine', 140, 90, 0.2, 0.4), ...ZUMBIDO], // o batimento é o zumbido do atordoamento
  },
  'nila.base.sFwd': {
    grito: gs([sil('a', 0.25, { c: 'd', fim: 'm' })], { fatorF0: 1.0 }), // DHAM!
    conjuracao: [0, 0.2].flatMap((q) => [T('corpo', 'sine', 110, 70, 0.25, 0.5, q), R('corpo', 'lowpass', 400, null, 1, 0.2, 0.3, q)]),
    estampa: [...[0, 1, 2, 3].map((i) => T('corpo', 'sine', 140, 90, 0.08, 0.3, i * 0.045)), T('cauda', 'sine', 60, 35, 0.3, 0.6), ...ZUMBIDO],
  },
  'nila.sarpa.sFire': {
    grito: gs([sil('a', 0.22, { c: 's' })]), // SSA!
    conjuracao: [R('corpo', 'bandpass', 5200, null, 4, 0.3, 0.2), T('corpo', 'sine', 160, null, 0.1, 0.3)],
    estampa: [R('ataque', 'bandpass', 5200, null, 4, 0.12, 0.25), T('corpo', 'sine', 200, 80, 0.1, 0.35), ...ZUMBIDO],
  },
  'nila.sarpa.sFwd': {
    grito: gs([sil('i', 0.15, { c: 'sh' }), sil('a', 0.2, { st: [0, 3, 5] })]), // SHI-YA!
    conjuracao: [R('corpo', 'bandpass', 2000, 6000, 3, 0.35, 0.2), T('corpo', 'sine', 330, 660, 0.3, 0.12)],
    estampa: [T('corpo', 'sine', 120, 35, 0.22, 0.5), R('cauda', 'bandpass', 6000, 2000, 3, 0.15, 0.2), ...ZUMBIDO],
  },
  // ---- E10 VENTO DA ESTEPE e E11 PENA DE ÁGUIA, BAATAR: bordão em quinta de morin khuur (serra 73 + 110 Hz, passa-baixa 500); águia: triângulo 2400->1500
  'baatar.base.sFire': {
    grito: gs([sil('ə', 0.2, { c: 'g' }), sil('a', 0.2, { c: 'h' })]), // UGH-HA!
    conjuracao: [T('corpo', 'sawtooth', 73, null, 0.5, 0.15, 0, ['lowpass', 500]), T('corpo', 'sawtooth', 110, null, 0.5, 0.08, 0, ['lowpass', 600])],
    estampa: [T('ataque', 'sine', 55, null, 0.4, 0.6), R('corpo', 'lowpass', 600, 60, 1, 0.5, 0.55), T('cauda', 'sawtooth', 73, 55, 0.6, 0.12, 0, ['lowpass', 400])],
  },
  'baatar.base.sDown': {
    grito: gs([sil('e', 0.15, { c: 'h' })]), // HEH!
    conjuracao: [R('corpo', 'bandpass', 300, 150, 1, 0.25, 0.4), T('corpo', 'sine', 90, 45, 0.3, 0.4)],
    estampa: [T('corpo', 'sine', 90, 45, 0.2, 0.45), T('cauda', 'sawtooth', 110, null, 0.15, 0.08, 0, ['lowpass', 500])],
  },
  'baatar.base.sFwd': {
    grito: gs([sil('a', 0.25, { c: 'h' }), sil('a', 0.3, { st: [0, 2, 4] })]), // HAA-AA!
    conjuracao: [T('corpo', 'triangle', 2400, 1500, 0.3, 0.12), T('corpo', 'triangle', 2400, 1500, 0.3, 0.12, 0, undefined, 20), R('cauda', 'bandpass', 900, null, 1, 0.6, 0.2)],
    estampa: [T('ataque', 'sine', 45, null, 0.6, 0.8), R('corpo', 'lowpass', 900, 80, 1, 0.4, 0.5), T('cauda', 'triangle', 2000, 1400, 0.15, 0.06)],
  },
  // ---- E12 MEANDRO E ANEL, ZENON: quinta de órgão Ré/Lá 147/220 Hz, cravo triângulo 1175->880, seno 50, moedas triângulo 2637
  'zenon.base.sFire': {
    grito: gs([sil('m', 0.2), sil('a', 0.23, { c: 'h' })]), // HMH... HA!
    conjuracao: [T('corpo', 'sawtooth', 147, null, 0.4, 0.08, 0, ['lowpass', 900]), T('corpo', 'sawtooth', 220, null, 0.4, 0.05, 0, ['lowpass', 900])],
    estilo: 'anel',
    lancamento: SELO_LANCAMENTO,
    estampa: SELO_ESTAMPA,
  },
  'zenon.base.sDown': {
    grito: gs([sil('a', 0.2, { c: 'h' })]), // HA! (desdém)
    conjuracao: [T('corpo', 'sawtooth', 147, 294, 0.25, 0.1, 0, ['lowpass', 1200]), R('corpo', 'lowpass', 800, 2400, 1, 0.25, 0.2)],
    estampa: [T('ataque', 'triangle', 1175, 880, 0.12, 0.1), T('corpo', 'sine', 50, null, 0.3, 0.6), T('cauda', 'triangle', 587, null, 0.15, 0.08)],
  },
  'zenon.base.sFwd': {
    grito: gs([sil('o', 0.2, { c: 'd' }), sil('e', 0.2, { c: 's' })]), // DÓ-SE! (rev.)
    conjuracao: ORGAO_CURTO,
    estampa: BATIDA_ZENON,
    comDreno: MOEDAS_ZENON,
  },
  'zenon.chefe2.sFire': {
    grito: gs([sil('a', 0.2, { c: 'h' }), sil('a', 0.2, { c: 'h' })], { subOitava: 0.5 }), // HA-HA!
    conjuracao: [T('corpo', 'sawtooth', 147, null, 0.4, 0.08, 0, ['lowpass', 900]), T('corpo', 'sawtooth', 220, null, 0.4, 0.05, 0, ['lowpass', 900]), T('corpo', 'sawtooth', 73.5, null, 0.7, 0.1, 0, ['lowpass', 500])],
    estilo: 'anel',
    lancamento: [...SELO_LANCAMENTO, T('cauda', 'sawtooth', 73.5, null, 0.7, 0.1, 0, ['lowpass', 500])],
    estampa: [...SELO_ESTAMPA, R('cauda', 'lowpass', 400, 60, 1, 0.5, 0.4)],
  },
  'zenon.chefe2.sFwd': {
    grito: gs([sil('o', 0.2, { c: 'b' }), sil('o', 0.22, { c: 's' })]), // NÓ-MOS! (rev.)
    conjuracao: [T('corpo', 'sawtooth', 147, null, 0.3, 0.1, 0, ['lowpass', 900]), R('corpo', 'bandpass', 1500, 400, 1, 0.3, 0.25)],
    estampa: [...BATIDA_ZENON, T('extra', 'triangle', 1760, 1175, 0.1, 0.1)],
    comDreno: MOEDAS_ZENON,
  },
};

/** As assinaturas como escritas acima, com o ganho de volume medido (calibracao.ts) por cima. */
export const ASSINATURAS: Readonly<Record<string, AssinaturaEspecial>> = Object.fromEntries(
  Object.entries(BRUTAS).map(([chave, a]) => [chave, CALIBRACAO_ASSINATURA[chave] ? { ...a, ganhoDb: CALIBRACAO_ASSINATURA[chave] } : a]),
);
