import type { IdLutador } from '../core/contratos';
import type { EstiloId, Paleta } from './estilos-especiais';

/*
 * Tabela de apresentação dos 28 especiais (docs/identidade-visual-especiais.md, seção 3 e a tabela de unicidade da seção 4): título, paleta,
 * estilo + variante, recorte da pose, altura/ângulo da faixa, ritmo e receitas de som. Chave `<id>.<ficha|base>.<golpe>`
 * (ex.: `nila.sarpa.sFire`, `baatar.base.sFwd`). Fica no render, FORA do `LutadorDef`: não mexe no snapshot nem no lock-step; a ausência da
 * chave cai no padrão (cores `fire` do lutador, estilo de estrelas, o mesmo som de abertura do jogo).
 *
 * O quadro do atlas e a entrada da tarja vêm do EVENTO (`special.quadro/entrada`, de `src/data/apresentacao-especiais.ts`): esta tabela
 * não os repete. Os selos no idioma da cultura (雷神弾, മർമ്മം...) NÃO foram ligados: pedem fonte do sistema e revisão de falante nativo,
 * que são decisões do dono (docs/identidade-visual-especiais.md, seção 7).
 */

/** O recorte da pose na tarja (§1.2): `BUSTO` 58% de cima, `MEIO` 75%, `CORPO` inteiro, `CORPO-H` inteiro encaixado pela largura. */
export type Recorte = 'BUSTO' | 'MEIO' | 'CORPO' | 'CORPO-H';
export type Ritmo = 'RAPIDO' | 'MEDIO' | 'PESADO';
export type PosicaoFaixa = 'alta' | 'media' | 'baixa';

/** Uma chamada de síntese (só `tone()` e `noise()` do AudioSys; D8: o áudio continua 100% sintetizado). `quando` em segundos. */
export type Som =
  | { readonly k: 'T'; readonly tipo: OscillatorType; readonly f0: number; readonly f1?: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly filtro?: { readonly tipo: BiquadFilterType; readonly f: number }; readonly atq?: number; readonly desafina?: number }
  | { readonly k: 'R'; readonly tipo: BiquadFilterType; readonly f0: number; readonly f1?: number; readonly Q: number; readonly t: number; readonly vol: number; readonly quando?: number; readonly atq?: number };

/** `T(onda f0->f1 Hz, duração s, vol)` da notação do Apolo. */
const T = (tipo: OscillatorType, f0: number, f1: number | null, t: number, vol: number, quando = 0, filtro?: [BiquadFilterType, number], extra: { atq?: number; desafina?: number } = {}): Som => ({
  k: 'T', tipo, f0, ...(f1 === null ? {} : { f1 }), t, vol, ...(quando ? { quando } : {}), ...(filtro ? { filtro: { tipo: filtro[0], f: filtro[1] } } : {}), ...extra,
});
/** `R(filtro f0->f1 Hz, Q, duração s, vol)`. */
const R = (tipo: BiquadFilterType, f0: number, f1: number | null, Q: number, t: number, vol: number, quando = 0, atq?: number): Som => ({
  k: 'R', tipo, f0, ...(f1 === null ? {} : { f1 }), Q, t, vol, ...(quando ? { quando } : {}), ...(atq === undefined ? {} : { atq }),
});

export interface Identidade {
  /** = `mv.name` exato (conferido por teste contra os dados). */
  readonly titulo: string;
  readonly paleta: Paleta;
  readonly estilo: EstiloId;
  readonly variante: string;
  readonly recorte: Recorte;
  readonly faixa: { readonly posicao: PosicaoFaixa; /** altura da faixa em px lógicos (132 é o padrão; fina 90-110; alta 156-164) */ readonly h: number; /** graus; positivo = a ponta do lado do RIVAL sobe */ readonly angulo: number; /** HOERI CHAGI: o ângulo oscila entre -8 e +8 */ readonly oscila?: boolean };
  readonly ritmo: Ritmo;
  /** A pose entra num medalhão circular (GARKUWA, o único do elenco). */
  readonly medalhao?: boolean;
  readonly abertura: readonly Som[];
  readonly batida: readonly Som[];
}

type Cores = readonly [nucleo: string, brilho: string, sombra: string];
const pal = (c: Cores): Paleta => ({ nucleo: c[0], brilho: c[1], sombra: c[2] });
const faixa = (posicao: PosicaoFaixa, angulo: number, h = 132, oscila = false): Identidade['faixa'] => ({ posicao, h, angulo, ...(oscila ? { oscila } : {}) });

function id(
  titulo: string,
  cores: Cores,
  estilo: EstiloId,
  variante: string,
  recorte: Recorte,
  f: Identidade['faixa'],
  ritmo: Ritmo,
  abertura: readonly Som[],
  batida: readonly Som[],
  extra: { medalhao?: boolean } = {},
): Identidade {
  return { titulo, paleta: pal(cores), estilo, variante, recorte, faixa: f, ritmo, abertura, batida, ...extra };
}

export const IDENTIDADES: Readonly<Record<string, Identidade>> = {
  // ---- HAYATO · E1 RAIO
  'hayato.base.sFire': id('RAIJIN-DAN', ['#eaffff', '#6fe0ff', '#0b3a8c'], 'E1', 'esfera', 'CORPO', faixa('media', -8), 'MEDIO',
    [R('highpass', 5000, null, 1, 0.04, 0.3), R('highpass', 5000, null, 1, 0.04, 0.3, 0.04), R('highpass', 5000, null, 1, 0.04, 0.3, 0.08)],
    [T('square', 659, 1318, 0.18, 0.08), T('sawtooth', 110, null, 0.3, 0.1, 0, ['lowpass', 900])]),
  'hayato.base.sDown': id('RAIJIN-KEN', ['#ffffff', '#ffe94a', '#1450b8'], 'E1', 'coluna', 'MEIO', faixa('media', 10), 'RAPIDO',
    [R('lowpass', 2000, 200, 1, 0.35, 0.5)], [T('square', 330, 990, 0.1, 0.1)]),
  'hayato.base.sFwd': id('KAMINARI-STEP', ['#c8f6ff', '#3fa9ff', '#102a66'], 'E1', 'rastro', 'BUSTO', faixa('alta', 0, 100), 'RAPIDO',
    [R('bandpass', 1200, 5000, 2, 0.12, 0.3)], [R('highpass', 5000, null, 1, 0.04, 0.3)]),
  // ---- WEI LONG · E2 ESCAMA DE DRAGÃO
  'wei-long.base.sFire': id('LONG ZHANG', ['#fff3ff', '#d58bff', '#4a1690'], 'E2', 'inteiro', 'CORPO', faixa('media', 0, 156), 'PESADO',
    [T('sine', 70, 45, 0.6, 0.8), R('lowpass', 400, 80, 1, 0.5, 0.4)],
    [T('sine', 98, null, 0.9, 0.4), T('sawtooth', 70, 55, 0.4, 0.12, 0, ['lowpass', 400])]),
  'wei-long.base.sDown': id('ZHEN DI', ['#f0d8ff', '#b46bff', '#2e1050'], 'E2', 'terra', 'CORPO', faixa('baixa', -3), 'PESADO',
    [T('sine', 60, 35, 0.4, 0.8), R('lowpass', 250, null, 1, 0.5, 0.5)],
    [T('sine', 80, 40, 0.12, 0.4), T('sine', 80, 40, 0.12, 0.4, 0.09), T('sine', 80, 40, 0.12, 0.4, 0.18)]),
  'wei-long.base.sFwd': id('TIE SHAN KAO', ['#f4ecff', '#8f5bff', '#241046'], 'E2', 'couraça', 'BUSTO', faixa('media', -10), 'PESADO',
    [T('triangle', 220, null, 0.5, 0.15), R('bandpass', 400, null, 2, 0.2, 0.3)], [T('sine', 55, null, 0.5, 0.7)]),
  // ---- MIN-JI · E3 LÂMINA CRESCENTE e MUGUNGHWA
  'min-ji.base.sFire': id('BULKKOT', ['#fff0f5', '#ff6a9a', '#8a0b33'], 'E3', 'par', 'MEIO', faixa('media', 8), 'RAPIDO',
    [R('bandpass', 1800, 4200, 1.5, 0.1, 0.25), R('bandpass', 1800, 4200, 1.5, 0.1, 0.25, 0.166)], [T('triangle', 1109, null, 0.15, 0.1)]),
  'min-ji.base.sDown': id('HOERI CHAGI', ['#ffe3ee', '#ff4f86', '#5c0a2a'], 'E3', 'redemoinho', 'MEIO', faixa('media', 8, 132, true), 'RAPIDO',
    [R('bandpass', 1500, null, 1.5, 0.08, 0.25), R('bandpass', 2200, null, 1.5, 0.08, 0.25, 0.06), R('bandpass', 3200, null, 1.5, 0.08, 0.25, 0.12)],
    [T('triangle', 1109, 1480, 0.2, 0.1)]),
  'min-ji.base.sFwd': id('TWIO YEOP CHAGI', ['#ffffff', '#ffa0bf', '#a50f3e'], 'E3', 'gigante', 'CORPO-H', faixa('media', -4, 110), 'RAPIDO',
    [R('bandpass', 900, 3000, 1.2, 0.25, 0.3)], [T('sine', 120, 35, 0.22, 0.5)]),
  // ---- CAIO · E4 ARCO DE GINGA
  'caio.base.sFire': id('ONDA VERDE', ['#fffde0', '#c8ff3a', '#0f5a18'], 'E4', 'vaivem', 'CORPO', faixa('media', 5), 'MEDIO',
    [T('triangle', 196, 220, 0.35, 0.3), R('bandpass', 3000, null, 3, 0.05, 0.2), R('bandpass', 3000, null, 3, 0.05, 0.2, 0.08)], [T('triangle', 196, 220, 0.25, 0.2)]),
  'caio.base.sDown': id('RABO-DE-ARRAIA', ['#eaff9a', '#7ddc3a', '#0f4d17'], 'E4', 'rasteiro', 'CORPO', faixa('baixa', 6), 'MEDIO',
    [R('bandpass', 600, 1600, 1, 0.3, 0.3)], [T('triangle', 147, 165, 0.3, 0.3)]),
  'caio.base.sFwd': id('MEIA-LUA', ['#ffffff', '#e4ff7a', '#145a17'], 'E4', 'descendente', 'CORPO', faixa('alta', -8), 'RAPIDO',
    [T('triangle', 294, 330, 0.25, 0.25), R('bandpass', 3000, null, 3, 0.05, 0.2), R('bandpass', 3000, null, 3, 0.05, 0.2, 0.08)], [T('sine', 120, 35, 0.22, 0.5)]),
  // ---- AMINU · E5 CORDA TRANÇADA e ÍNDIGO
  'aminu.base.sFire': id('MASHI', ['#eef0ff', '#6f7dff', '#1a1d6e'], 'E5', 'punho', 'BUSTO', faixa('media', 6), 'MEDIO',
    [T('sine', 180, 120, 0.22, 0.5), R('bandpass', 900, null, 2, 0.03, 0.3)], [T('sine', 240, 150, 0.22, 0.5), R('bandpass', 900, null, 2, 0.03, 0.3)]),
  'aminu.base.sDown': id('GARKUWA', ['#ffe2bf', '#d9822b', '#2b2fa6'], 'E5', 'escudo', 'BUSTO', faixa('media', 0), 'RAPIDO',
    [T('sine', 260, 200, 0.12, 0.4), R('highpass', 2500, null, 1, 0.05, 0.2)], [T('sine', 260, 200, 0.12, 0.3)], { medalhao: true }),
  'aminu.base.sFwd': id('PASSO DO LEÃO', ['#dfe3ff', '#4a56e0', '#0c0e40'], 'E5', 'varal', 'CORPO', faixa('media', 3), 'MEDIO',
    [T('sine', 180, 120, 0.2, 0.5), T('sine', 160, 110, 0.2, 0.5, 0.09), R('bandpass', 400, null, 1, 0.25, 0.3)], [T('sine', 160, 110, 0.2, 0.4)]),
  // ---- CENTELLA · E6 ESTRELA DE LUCHA e CORDAS
  'centella.base.sFire': id('PLANCHA', ['#eafff8', '#22e3b0', '#064f40'], 'E6', 'chuva', 'CORPO', faixa('alta', -10), 'MEDIO',
    [T('triangle', 1568, null, 0.6, 0.25), T('sine', 2350, null, 0.4, 0.1), R('bandpass', 700, null, 0.8, 0.7, 0.2, 0, 0.2)], [T('sine', 120, 35, 0.22, 0.5)]),
  'centella.base.sDown': id('HURACANRANA', ['#d9fff4', '#3df5c8', '#0b3b5c'], 'E6', 'orbita', 'CORPO', faixa('media', 10), 'RAPIDO',
    [R('bandpass', 800, 3000, 1.2, 0.2, 0.3)], [T('triangle', 1568, null, 0.3, 0.2)]),
  'centella.base.sFwd': id('RESORTE', ['#fffbe6', '#19d9a8', '#0a2e40'], 'E6', 'cordas', 'CORPO', faixa('media', -6), 'MEDIO',
    [T('sawtooth', 98, 140, 0.3, 0.15, 0, ['lowpass', 800])], [T('sine', 220, 440, 0.15, 0.3)]),
  // ---- CAMILLE · E7 FIO DE FLORETE
  'camille.base.sFire': id('PARADE', ['#ffffff', '#e6ebf7', '#3b4566'], 'E7', 'guarda', 'BUSTO', faixa('media', 0, 100), 'RAPIDO',
    [T('triangle', 2637, null, 0.3, 0.08)], [T('triangle', 3136, null, 0.08, 0.15), T('triangle', 3520, null, 0.08, 0.15, 0.05)]),
  'camille.base.sDown': id("COUP D'ARRÊT", ['#ffffff', '#c7d3ff', '#4a5170'], 'E7', 'estocada', 'CORPO', faixa('baixa', 4), 'RAPIDO',
    [R('highpass', 5000, 8000, 1, 0.08, 0.25)], [T('sine', 190, 50, 0.13, 0.5)]),
  'camille.base.sFwd': id('REVERS', ['#f4f6ff', '#a9b8e6', '#1b2140'], 'E7', 'arco', 'MEIO', faixa('media', -8), 'MEDIO',
    [R('bandpass', 2000, 700, 1, 0.2, 0.25)], [T('triangle', 2637, null, 0.2, 0.12)]),
  // ---- NILA · E8 CHAMA DE LAMPARINA (GAJA, a base) e E9 ESPIRAL DE SERPENTE (SARPA)
  'nila.base.sFire': id('GOLPE MARMA', ['#fff6dc', '#ffb02e', '#6b3200'], 'E8', 'pavio', 'BUSTO', faixa('media', 0, 110), 'MEDIO',
    [T('sine', 880, null, 0.5, 0.1), R('bandpass', 1200, null, 2, 0.02, 0.3)], [T('sine', 140, 90, 0.2, 0.4)]),
  'nila.base.sFwd': id('PASSO DO ELEFANTE', ['#ffe7b0', '#d9720b', '#4a1f00'], 'E8', 'palmas', 'CORPO', faixa('baixa', 0), 'PESADO',
    [T('sine', 110, 70, 0.25, 0.5), R('lowpass', 400, null, 1, 0.2, 0.3), T('sine', 110, 70, 0.25, 0.5, 0.2), R('lowpass', 400, null, 1, 0.2, 0.3, 0.2)],
    [0, 1, 2, 3].map((i) => T('sine', 140, 90, 0.08, 0.3, i * 0.045))),
  'nila.sarpa.sFire': id('BOTE', ['#ffe9b8', '#7dffb0', '#04301b'], 'E9', 'rasteira', 'CORPO-H', faixa('baixa', 0, 90), 'RAPIDO',
    [R('bandpass', 5200, null, 4, 0.3, 0.2), T('sine', 160, null, 0.1, 0.3)], [R('bandpass', 5200, null, 4, 0.12, 0.2)]),
  'nila.sarpa.sFwd': id('SALTO DA SERPENTE', ['#fff1cc', '#9cffc8', '#0a4a2e'], 'E9', 'parafuso', 'CORPO', faixa('media', 10), 'MEDIO',
    [R('bandpass', 2000, 6000, 3, 0.35, 0.2), T('sine', 330, 660, 0.3, 0.15)], [T('sine', 120, 35, 0.22, 0.5)]),
  // ---- BAATAR · E10 VENTO DA ESTEPE (fase 1 e jogável) e E11 PENA DE ÁGUIA (fase 2)
  'baatar.base.sFire': id('ARREMESSO DO AVARGA', ['#fff0d6', '#ff4a2e', '#5c0a06'], 'E10', 'redemoinho', 'BUSTO', faixa('media', 0, 164), 'PESADO',
    [T('sawtooth', 73, null, 0.8, 0.2, 0, ['lowpass', 500]), T('sawtooth', 110, null, 0.8, 0.1, 0, ['lowpass', 600])], [T('sine', 55, null, 0.4, 0.6)]),
  'baatar.base.sDown': id('QUEBRA-BASE', ['#ffd9a0', '#e0402a', '#3b1a0a'], 'E10', 'rasante', 'CORPO', faixa('baixa', 4), 'MEDIO',
    [R('bandpass', 300, 150, 1, 0.25, 0.4), T('sine', 90, 45, 0.3, 0.5)], [T('sine', 90, 45, 0.2, 0.4)]),
  'baatar.base.sFwd': id('MERGULHO DA ÁGUIA', ['#ffe08a', '#ff2a10', '#3a0603'], 'E11', 'asas', 'CORPO-H', faixa('media', -10, 164), 'PESADO',
    [T('triangle', 2400, 1500, 0.3, 0.12), T('triangle', 2400, 1500, 0.3, 0.12, 0, undefined, { desafina: 20 }), R('bandpass', 900, null, 1, 0.6, 0.2)], [T('sine', 45, null, 0.6, 0.8)]),
};

/** Chaves das 29 entradas, para teste. */
export const CHAVES_IDENTIDADE: readonly string[] = Object.keys(IDENTIDADES);

/** `<id>.<ficha|base>.<golpe>`. */
export const chaveDaIdentidade = (lutador: IdLutador, ficha: string | null, golpe: string): string => `${lutador}.${ficha ?? 'base'}.${golpe}`;

/** A identidade do especial: a da ficha ativa, senão a da base (o BAATAR deixou de ter fichas: virou lutador comum, o →+ESP dele é o MERGULHO DA ÁGUIA). undefined = padrão. */
export function identidadeDe(lutador: IdLutador, ficha: string | null, golpe: string): Identidade | undefined {
  return IDENTIDADES[chaveDaIdentidade(lutador, ficha, golpe)] ?? IDENTIDADES[chaveDaIdentidade(lutador, null, golpe)];
}

/** O padrão quando a tabela não tem a chave: as cores `fire` do lutador, o estilo de estrelas e o mesmo som de abertura/impacto do jogo. */
export function identidadePadrao(titulo: string, fire: readonly [string, string, string]): Identidade {
  return {
    titulo,
    paleta: { nucleo: fire[1], brilho: fire[0], sombra: fire[2] },
    estilo: 'E6',
    variante: 'chuva',
    recorte: 'BUSTO',
    faixa: faixa('media', 0),
    ritmo: 'MEDIO',
    abertura: [R('bandpass', 300, 4200, 0.9, 0.7, 0.35), T('sine', 60, 120, 0.7, 0.25)],
    batida: [R('lowpass', 3000, 120, 1, 0.22, 0.5), T('sine', 110, 45, 0.35, 0.75)],
  };
}

/** O som do acerto de especial por lutador (a assinatura sonora do §1.6; a nota varia por golpe só na abertura/batida). */
export const SOM_DO_ACERTO: Readonly<Record<string, readonly Som[]>> = {
  hayato: [R('highpass', 5000, null, 1, 0.05, 0.3), T('square', 659, null, 0.12, 0.08)],
  'wei-long': [T('sine', 70, 45, 0.3, 0.6), R('lowpass', 300, null, 1, 0.2, 0.3)],
  'min-ji': [R('bandpass', 2200, 4200, 1.5, 0.08, 0.25), T('triangle', 1109, null, 0.12, 0.1)],
  caio: [T('triangle', 196, 220, 0.2, 0.25), R('bandpass', 3000, null, 3, 0.04, 0.2)],
  aminu: [T('sine', 180, 120, 0.15, 0.5), R('bandpass', 900, null, 2, 0.03, 0.3)],
  centella: [T('triangle', 1568, null, 0.3, 0.2), T('sine', 2350, null, 0.2, 0.08)],
  camille: [T('triangle', 2637, null, 0.2, 0.1), R('highpass', 6000, null, 1, 0.1, 0.2)],
  nila: [T('sine', 140, 90, 0.2, 0.4)],
  'nila.sarpa': [R('bandpass', 5200, null, 4, 0.15, 0.2)],
  baatar: [T('sawtooth', 73, null, 0.3, 0.2, 0, ['lowpass', 500]), T('sine', 55, null, 0.35, 0.6), T('triangle', 2400, 1500, 0.2, 0.08)],
};

export function somDoAcerto(lutador: IdLutador, ficha: string | null): readonly Som[] {
  return SOM_DO_ACERTO[`${lutador}.${ficha ?? 'base'}`] ?? SOM_DO_ACERTO[lutador] ?? [];
}
