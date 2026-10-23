import type { IdLutador, LutadorLeitura } from '../core/contratos';
import type { GolpeMontado } from '../data/tipos';

/*
 * A "MOLA" (V2-2, spec-revisao-motor-luta-v2 §7.2): as transformações procedurais do protótipo (antecipação, squash, inclinação, avanço do
 * golpe pesado, respiração, quique da vitória, pouso) que só rodavam com `legacy` e sumiram nos 10 atlas novos. Aqui é RENDER PURO: função do
 * que a leitura (C3) já traz, somada à `f.pose` por `Fluidez`. O motor, o `poseT` e o `montar.ts` não mudam.
 *
 * Valores: docs/roteiros-filme-especiais.md §8 (Apolo). Teto de deformação 8% em sx/sy e 0,15 rad de inclinação (fora a queda no ar);
 * `sx`/`sy` em torno da sola e `rot` em torno do quadril (é a cadeia de transformações de `desenharLutador`, que não muda).
 */

export type Peso = 'leve' | 'medio' | 'pesado';

/** Quanto cada transformação soma à pose: `dx`/`dy`/`rot` somam, `sx`/`sy` multiplicam. */
export type Mola = { readonly dx: number; readonly dy: number; readonly sx: number; readonly sy: number; readonly rot: number };

export const MOLA_ZERO: Mola = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 };

/**
 * Peso por lutador (Apolo, §8.1). Mora aqui, em `render`, porque o campo `LutadorDef.peso` é contrato da Vega (spec §8) e ainda não existe:
 * quando existir, `pesoDe` passa a lê-lo e esta tabela some. NILA é `medio` (GAJA = pesado e SARPA = leve ficam para quando houver `peso` na ficha).
 */
export const PESO_DO_LUTADOR: Readonly<Record<IdLutador, Peso>> = {
  'min-ji': 'leve',
  centella: 'leve',
  camille: 'leve',
  caio: 'leve',
  hayato: 'medio',
  nila: 'medio',
  'wei-long': 'pesado',
  aminu: 'pesado',
  baatar: 'pesado',
  zenon: 'pesado',
};

export function pesoDe(id: IdLutador): Peso {
  return PESO_DO_LUTADOR[id] ?? 'medio';
}

type Amplitudes = {
  /** Antecipação de golpe comum: `dx` = −x·p. */
  antComum: number;
  /** Antecipação de golpe pesado: `dx` = −x·p e `sx` = 1 + y·p. */
  antPesado: readonly [number, number];
  /** Avanço do golpe pesado na fase ativa (até A+4): `dx` somado e `sx`. */
  avanco: readonly [number, number];
  /** Preparo de projétil: `sy` e `sx` finais e `dx` = −x·p. */
  projetil: readonly [number, number, number];
  /** Preparo de golpe com `pre` (agacha): `sy` final. */
  pre: number;
  /** Investida (`rush`): inclinação. */
  rush: number;
  pouso: number;
  prePulo: number;
  /** Respiração do idle: amplitude de `sy` e período (ticks por radiano). */
  respira: readonly [number, number];
  /** Vitória: amplitude do `dy` do quique. */
  quique: number;
  /** Multiplicador da inclinação da queda no ar (`kdAir`). */
  queda: number;
  /** Quanto o corpo de quem APANHA treme no congelamento (leve 1, médio 0,9, pesado 0,75). */
  tremor: number;
};

const AMPLITUDES: Readonly<Record<Peso, Amplitudes>> = {
  leve: { antComum: 5, antPesado: [9, 0.02], avanco: [5, 1.03], projetil: [0.95, 1.03, 8], pre: 0.96, rush: 0.12, pouso: 0.97, prePulo: 0.96, respira: [0.005, 12], quique: 8, queda: 1.2, tremor: 1 },
  medio: { antComum: 7, antPesado: [12, 0.03], avanco: [7, 1.04], projetil: [0.94, 1.04, 10], pre: 0.95, rush: 0.1, pouso: 0.96, prePulo: 0.95, respira: [0.005, 16], quique: 5, queda: 1, tremor: 0.9 },
  pesado: { antComum: 9, antPesado: [15, 0.04], avanco: [9, 1.05], projetil: [0.92, 1.05, 12], pre: 0.94, rush: 0.06, pouso: 0.94, prePulo: 0.93, respira: [0.004, 20], quique: 2, queda: 0.7, tremor: 0.75 },
};

const TETO_ESCALA = 0.08;
const TETO_ROT = 0.15;
const TETO_ROT_QUEDA = 0.5;

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

/** O que `mola` lê da leitura do lutador (C3). */
export type EntradaDaMola = Pick<LutadorLeitura, 'state' | 'move' | 'mt' | 'age' | 'pose'>;

/**
 * A mola de UM lutador neste tick. `golpe` = o `GolpeMontado` em curso (`ch.moves[f.move]`) ou null; `st` = ticks no estado atual (só a vitória usa);
 * `vy` = velocidade vertical em px/tick, positiva para baixo (só a queda no ar usa; a leitura não a traz, quem chama deriva do `y`).
 * Função pura: mesma entrada, mesma saída, sem estado.
 */
export function mola(f: EntradaDaMola, golpe: GolpeMontado | null, peso: Peso, st = 0, vy = 0): Mola {
  const k = AMPLITUDES[peso];
  let dx = 0;
  let dy = 0;
  let sx = 1;
  let sy = 1;
  let rot = 0;
  switch (f.state) {
    case 'idle': {
      const s = Math.sin(f.age / k.respira[1]);
      sy = 1 + k.respira[0] * s;
      sx = 1 - (k.respira[0] / 2) * s;
      break;
    }
    case 'prejump':
      sy = k.prePulo;
      break;
    case 'land':
      sy = k.pouso;
      break;
    case 'win':
      dy = -Math.abs(Math.sin(st / 11)) * k.quique;
      sy = 1 + 0.015 * (k.quique / 10) * Math.sin(st / 5);
      break;
    case 'down':
    case 'ko':
      if (f.pose.name === 'kdAir') rot = -clamp(vy / 40, -0.5, 0.5) * k.queda;
      break;
    case 'move': {
      const mv = golpe;
      if (!mv || mv.rebote) break;
      const into = f.mt - mv.S;
      if (into < 0) {
        const p = clamp(f.mt / Math.max(1, mv.S), 0, 0.999);
        if (mv.type === 'fire') {
          sy = lerp(1, k.projetil[0], p);
          sx = lerp(1, k.projetil[1], p);
          dx = -k.projetil[2] * p;
        } else if (mv.pre) sy = lerp(1, k.pre, p);
        else if (!mv.crouch && !mv.air) {
          if (mv.heavy) {
            dx = -k.antPesado[0] * p;
            sx = 1 + k.antPesado[1] * p;
          } else dx = -k.antComum * p;
        }
        break;
      }
      if (mv.lift) dy -= mv.lift * Math.min(1, into / 3);
      if (mv.tilt) rot = mv.tilt;
      if (mv.heavy && !mv.air && into < mv.A + 4) {
        dx += k.avanco[0];
        sx = k.avanco[1];
      }
      if (mv.type === 'rush' && !mv.tilt) rot = k.rush;
      break;
    }
    default:
      break;
  }
  const queda = f.state !== 'move' && f.pose.name === 'kdAir';
  return {
    dx,
    dy,
    sx: clamp(sx, 1 - TETO_ESCALA, 1 + TETO_ESCALA),
    sy: clamp(sy, 1 - TETO_ESCALA, 1 + TETO_ESCALA),
    rot: clamp(rot, queda ? -TETO_ROT_QUEDA : -TETO_ROT, queda ? TETO_ROT_QUEDA : TETO_ROT),
  };
}

/** Força do golpe que causou o congelamento, em px de tremor do rival (Apolo §8.2): fraco 2, forte 3, especial 4. */
export function forcaDoGolpe(nome: string | null): 2 | 3 | 4 {
  if (nome === null) return 4; // sem golpe em curso no atacante: o acerto veio de um projétil (especial)
  if (nome.startsWith('s')) return 4;
  if (/^[cj]?l[pk]$/.test(nome)) return 2;
  return 3;
}

/** Tremor do corpo de quem apanha (px): a força do golpe vezes o peso do DEFENSOR (corpo pesado treme menos). */
export function tremorDoDefensor(forca: number, pesoDoDefensor: Peso): number {
  return forca * AMPLITUDES[pesoDoDefensor].tremor;
}
