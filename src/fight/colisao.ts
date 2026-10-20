import { SH } from '../core/constantes';
import type { Retangulo } from '../core/math';
import type { CaixaGolpe, NivelGolpe } from '../data/tipos';

/*
 * Geometria e regras puras de acerto (hurtbox, attackBox, bloqueio por nível, escala de combo).
 * Porte de Fighter.hurtbox/attackBox/canBlock (linhas 646-653, 812-817) e de applyHit (1213, 1220).
 */

export type PartesDaCaixaDeDano = {
  x: number;
  y: number;
  state: string;
  /** Agachado ou golpe agachado (Fighter.isLow()). */
  baixo: boolean;
  noChao: boolean;
};

/** Caixa de dano. Caído/KO: faixa larga rente ao chão; senão 76 px de largura, 96% de SH em pé, 56% agachado. */
export function hurtbox(f: PartesDaCaixaDeDano): Retangulo {
  const top = f.baixo ? SH * 0.56 : SH * 0.96;
  if (f.state === 'down' || f.state === 'ko') return { x: f.x - 70, y: f.y - 60, w: 140, h: 60 };
  return { x: f.x - 38, y: f.y - top, w: 76, h: top - (f.noChao ? 0 : 50) };
}

/** Caixa de ataque no mundo a partir da caixa relativa do golpe (ch.boxes) e de quem olha para `facing`. */
export function attackBox(f: { x: number; y: number; facing: number }, b: CaixaGolpe): Retangulo {
  return { x: f.facing > 0 ? f.x + b.fx : f.x - b.fx - b.w, y: f.y - b.fy, w: b.w, h: b.h };
}

const ESTADOS_QUE_BLOQUEIAM: ReadonlySet<string> = new Set(['idle', 'walk', 'crouch', 'block', 'land']);

/**
 * Bloqueio por nível: precisa estar no chão, segurando "para trás", em estado livre.
 * mid bloqueia em pé ou agachado; low só agachado; over só em pé; throw nunca.
 */
export function podeBloquear(
  lvl: NivelGolpe | undefined,
  d: { noChao: boolean; segurandoTras: boolean; state: string; agachado: boolean },
): boolean {
  if (!d.noChao || !d.segurandoTras) return false;
  if (!ESTADOS_QUE_BLOQUEIAM.has(d.state)) return false;
  if (lvl === 'throw') return false;
  if (lvl === 'low') return d.agachado;
  if (lvl === 'over') return !d.agachado;
  return true;
}

/** Escala de dano do combo: cada golpe já recebido tira 10%, piso de 50%. */
export function escalaCombo(gotHits: number): number {
  return Math.max(0.5, 1 - 0.1 * gotHits);
}

/** Dano de um golpe: projétil não usa `pow`; contragolpe +15%. */
export function danoDoGolpe(dmg: number, pow: number, projetil: boolean, gotHits: number, contragolpe: boolean): number {
  return (projetil ? dmg : dmg * pow) * escalaCombo(gotHits) * (contragolpe ? 1.15 : 1);
}

/** Dano reduzido absorvido pela armadura (60% do dano cheio, sem escala de combo). */
export function danoDeArmadura(dmg: number, pow: number, projetil: boolean): number {
  return (projetil ? dmg : dmg * pow) * 0.6;
}
