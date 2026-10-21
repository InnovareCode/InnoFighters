import type { IdLutador } from '../../core/contratos';
import type { Consoante, Grito, GritosDoLutador, Silaba, Vogal } from './tipos';

/*
 * Os gritos de cada lutador (docs/spec-sons-por-lutador.md §3.3 e §3.4): kiai, vitória, KO, dano leve (3 variantes), dano pesado (2), guarda quebrada
 * e esforço. Palavras reais vêm MARCADAS (rev.): precisam de revisão de falante nativo (a mesma pendência dos nomes dos golpes). Cada uma tem a
 * versão NÃO-LEXICAL pronta em `NAO_LEXICAL` (D-S1): trocar é só apontar `GRITOS_ATIVOS` para ela, sem código.
 * Síntese por formantes dá gritos com a FORMA da vogal, não palavras inteligíveis: o desenho (vogais, consoante de ataque, contorno) é o que conta.
 */

const s = (v: Vogal, t: number, o: { c?: Consoante; v2?: Vogal; st?: readonly [number, number, number]; fim?: NonNullable<Silaba['fim']> } = {}): Silaba => ({ v, t, ...o });
const g = (silabas: Silaba[], o: Omit<Grito, 'silabas'> = {}): Grito => ({ silabas, ...o });
/** Dano leve: uma sílaba curta que cai 3 st (vol 0,8). */
const leve = (v: Vogal, t: number, c?: Consoante): Grito => g([s(v, t, { st: [0, 0, -3], ...(c ? { c } : {}) })], { vol: 0.8 });
/** Dano pesado: 0,22-0,28 s, o tom cai de x1,15 para x0,8 (+2,4 st -> -5 st), aspereza +0,15. */
const pesado = (v: Vogal, t: number, c?: Consoante): Grito => g([s(v, t, { st: [2.4, 0, -5], ...(c ? { c } : {}) })], { aspereza: 0.15 });

export { s as sil, g as gr };

/** SARPA (NILA na outra postura): sibilante. Só o kiai e o dano leve mudam; KO, vitória e o resto são os da GAJA, na garganta da SARPA. */
export const GRITOS_SARPA = (base: GritosDoLutador): GritosDoLutador => ({
  ...base,
  kiai: g([s('a', 0.22, { c: 's' })]), // SSA!
  leve: [leve('i', 0.12, 's'), leve('e', 0.13, 'sh'), leve('a', 0.12, 's')],
});

export const GRITOS: Readonly<Record<IdLutador, GritosDoLutador>> = {
  hayato: {
    kiai: g([s('e', 0.14, { c: 's', v2: 'i' }), s('a', 0.16)]), // SEI-YA!
    vitoria: g([s('o', 0.2), s('u', 0.25, { c: 's' })]), // O-SU! (rev.)
    ko: g([s('u', 1.0, { v2: 'a' })]), // U-AAAH
    leve: [leve('ê', 0.1, 'h'), leve('u', 0.13), leve('a', 0.14)],
    pesado: [pesado('o', 0.2, 'h'), pesado('o', 0.25)],
    guarda: g([s('i', 0.14, { st: [0, 2, 4] })]),
  },
  'wei-long': {
    kiai: g([s('o', 0.25, { c: 'h' }), s('a', 0.3, { c: 'h' })]), // HŌ-HA!
    vitoria: g([s('a', 0.45, { c: 'h', v2: 'o' })]), // HAO! (rev.)
    ko: g([s('o', 1.1, { v2: 'u' })]), // HOOO
    leve: [leve('i', 0.1), leve('u', 0.15), leve('ə', 0.14)],
    pesado: [pesado('i', 0.28, 'g'), pesado('u', 0.26)],
    guarda: g([s('i', 0.22, { st: [0, 2, 4] })]),
    esforco: g([s('m', 0.1)], { vol: 0.6 }),
  },
  'min-ji': {
    kiai: g([s('i', 0.18, { c: 'h', v2: 'a', fim: 'p' })]), // HYAP!
    vitoria: g([s('a', 0.15), s('a', 0.3, { c: 's' })]), // A-SSA! (rev.)
    ko: g([s('i', 0.9, { c: 'k', v2: 'a' })]), // KYAA-A
    leve: [leve('i', 0.18), leve('e', 0.13), leve('a', 0.12)],
    pesado: [pesado('i', 0.31, 'g'), pesado('e', 0.24)],
    guarda: g([s('e', 0.14, { v2: 'i', st: [0, 2, 4] })]),
  },
  caio: {
    kiai: g([s('i', 0.12), s('ê', 0.24, { st: [1, 3, 4] })]), // IÊ! (dois golpes de voz: assim o brilho não pula com 3% de tom)
    vitoria: g([s('i', 0.3, { v2: 'ê' }), s('ê', 0.35)]), // IÊ-Ê!
    ko: g([s('a', 0.6, { v2: 'i' }), s('o', 0.4)]), // AAI-Ô
    leve: [leve('ê', 0.18, 'k'), leve('ê', 0.13), leve('a', 0.15)],
    pesado: [pesado('i', 0.22), pesado('é', 0.26)],
    guarda: g([s('i', 0.16, { v2: 'a', st: [0, 2, 4] })]),
  },
  aminu: {
    kiai: g([s('a', 0.3, { c: 'h', v2: 'u' })]), // HAU!
    vitoria: g([s('a', 0.25), s('i', 0.3, { c: 'ch' })]), // NA CI! (rev.)
    ko: g([s('o', 0.5, { c: 'h', st: [0, -3, -7] }), s('o', 0.5, { st: [-7, -9, -12] })], { pausa: 0 }), // HOO-OH
    leve: [leve('i', 0.14), leve('a', 0.13), leve('u', 0.15)],
    pesado: [pesado('i', 0.28), pesado('o', 0.24)],
    guarda: g([s('a', 0.14, { v2: 'u', st: [0, 2, 4] })]),
  },
  centella: {
    kiai: g([s('a', 0.17, { st: [0, 4, 5] }), s('u', 0.18, { c: 'ch' })]), // ¡YA-JÚ!
    vitoria: g([s('e', 0.2, { c: 'r' }), s('o', 0.3, { c: 's' })]), // ¡E-SO! (rev.)
    ko: g([s('a', 0.5, { v2: 'i' }), s('i', 0.4, { st: [0, -4, -9] })]), // ¡AAY!
    leve: [leve('o', 0.1), leve('a', 0.12), leve('i', 0.14)],
    pesado: [pesado('a', 0.2), pesado('i', 0.25)],
    guarda: g([s('a', 0.14, { c: 'k', st: [0, 2, 4] })]),
  },
  camille: {
    kiai: g([s('é', 0.18, { c: 'h' })]), // HÉ!
    vitoria: g([s('o', 0.25, { c: 'f', v2: 'a' }), s('a', 0.3)]), // VOI-LÀ! (rev.)
    ko: g([s('a', 0.4), s('o', 0.4, { fim: 'n' })]), // AH-NON
    leve: [leve('a', 0.18), leve('i', 0.13), leve('e', 0.12)],
    pesado: [pesado('u', 0.2, 'h'), pesado('é', 0.24)],
    guarda: g([s('a', 0.22, { c: 'k', v2: 'u', st: [0, 2, 4] })]),
  },
  nila: {
    kiai: g([s('a', 0.3, { c: 'd', fim: 'm' })]), // DHAM!
    vitoria: g([s('a', 0.2, { c: 's' }), s('i', 0.3, { c: 'r' })]), // SA-RI! (rev.)
    ko: g([s('a', 0.35, { c: 'h', v2: 'ə' }), s('m', 0.55)]), // HAA-M
    leve: [leve('a', 0.1, 'h'), leve('ə', 0.13), leve('o', 0.15)],
    pesado: [pesado('e', 0.31), pesado('ə', 0.24)],
    guarda: g([s('a', 0.22, { st: [0, 2, 4] })]),
  },
  baatar: {
    kiai: g([s('ə', 0.2, { c: 'g', st: [0, 2, 3] }), s('a', 0.2, { c: 'k', st: [3, 4, 5] })]), // UGH-KA! (crescendo; a variante UGH-HA! da spec ficava a 1,3 do WEI LONG)
    vitoria: g([s('u', 0.2, { c: 'h' }), s('a', 0.2, { c: 'r', v2: 'i' }), s('u', 0.2, { c: 'h' }), s('a', 0.2, { c: 'r', v2: 'i' })]), // HUU-RAI! HUU-RAI! (rev.)
    ko: g([s('u', 1.2, { v2: 'ə' })]), // UUURGH
    leve: [leve('u', 0.18), leve('u', 0.15), leve('o', 0.16)],
    pesado: [pesado('u', 0.2, 'k'), pesado('u', 0.27)],
    guarda: g([s('u', 0.18, { c: 'k', v2: 'a', st: [0, 2, 4] })]),
    esforco: g([s('m', 0.1)], { vol: 0.6 }),
  },
  zenon: {
    kiai: g([s('m', 0.2), s('a', 0.23, { c: 'h' })]), // HMH... HA!
    vitoria: g([s('a', 0.22, { c: 'h', st: [0, 0, -1] }), s('a', 0.22, { c: 'h', st: [-2, -2, -3] }), s('a', 0.28, { c: 'h', st: [-4, -4, -6] })], { subOitava: 0.35 }), // HA-HA-HA
    ko: g([s('o', 0.55), s('i', 0.5, { c: 'ch' })]), // Ó-CHI! (rev.)
    leve: [leve('i', 0.1, 'h'), leve('ə', 0.14), leve('u', 0.16)],
    pesado: [pesado('e', 0.31), pesado('ə', 0.25)],
    guarda: g([s('o', 0.2, { c: 'h', v2: 'u', st: [0, 2, 4] })]),
  },
};

/**
 * Versão NÃO-LEXICAL das palavras reais (D-S1): só vogais e consoantes de ataque, sem palavra de língua nenhuma. Troca-se mudando
 * `GRITOS_LEXICAIS` para `false`; nenhum código muda. Vale para a vitória (as palavras marcadas (rev.)) e para o KO do ZENON ("Ó-CHI!").
 */
export const NAO_LEXICAL: Readonly<Record<IdLutador, { readonly vitoria: Grito; readonly ko?: Grito }>> = {
  hayato: { vitoria: g([s('a', 0.2, { c: 'h' })]) }, // HA!
  'wei-long': { vitoria: g([s('o', 0.5, { c: 'h' })]) }, // HŌ...
  'min-ji': { vitoria: g([s('i', 0.2, { c: 'h', v2: 'a' })]) }, // HYA!
  caio: { vitoria: g([s('ê', 0.25), s('ê', 0.3)]) }, // Ê-Ê!
  aminu: { vitoria: g([s('a', 0.3, { c: 'h', v2: 'u' })]) }, // HAU!
  centella: { vitoria: g([s('a', 0.2), s('a', 0.3, { c: 'h' })]) }, // ¡YA-HA!
  camille: { vitoria: g([s('é', 0.2, { c: 'h' }), s('a', 0.3, { c: 'h' })]) }, // HÉ-HA
  nila: { vitoria: g([s('m', 0.2), s('a', 0.3, { c: 'h' })]) }, // HM-HA
  baatar: { vitoria: g([s('a', 0.4, { c: 'h' }), s('ə', 0.3, { c: 'g' })]) }, // HAA-UGH
  zenon: { vitoria: g([s('a', 0.8, { c: 'h' })], { subOitava: 0.5 }), ko: g([s('a', 1.0, { c: 'h' })]) }, // HAAAH
};

/** `true` = as palavras reais (rev.) da spec; `false` = a versão não-lexical. Decisão D-S1: lexicais marcadas, com a alternativa pronta. */
export const GRITOS_LEXICAIS = true;

/** Os gritos em uso, conforme `GRITOS_LEXICAIS`. */
export function gritosAtivos(): Readonly<Record<IdLutador, GritosDoLutador>> {
  if (GRITOS_LEXICAIS) return GRITOS;
  const saida = {} as Record<IdLutador, GritosDoLutador>;
  for (const id of Object.keys(GRITOS) as IdLutador[]) {
    const alt = NAO_LEXICAL[id];
    saida[id] = { ...GRITOS[id], vitoria: alt.vitoria, ...(alt.ko ? { ko: alt.ko } : {}) };
  }
  return saida;
}
