import { SH_IDLE } from '../core/constantes';
import { animFor } from './anim';
import { LADO_RETRATO } from './atlas';
import { BASE_MOVES, NOMES_GOLPES_BASE } from './base-moves';
import { getPD } from './poses';
import type { CaixaGolpe, GolpeMontado, LutadorDef, NomeEspecial, NomeGolpe, Poses, ProjetilDef } from './tipos';

/** Lutador pronto para a luta/render: dados estáticos + tudo o que deriva do atlas (setupChars + buildMoves). */
export type LutadorMontado = LutadorDef & {
  /** Poses do atlas (formato interno; ver manifestoParaPoses). */
  pd: Poses;
  /** Arte antiga de poucas poses? (sem walk7): liga os ajustes de transformação do poseT. */
  legacy: boolean;
  /** Fator atlas -> tela: scale * SH_IDLE / altura do idle0. */
  K: number;
  /** Retrato [x, y, w, h] no atlas. */
  head: readonly [number, number, number, number];
  /** Alias de poses dos especiais (sb1/sb2/sc1/sc0). */
  alias: Record<string, string>;
  moves: Record<NomeGolpe, GolpeMontado>;
  /** Caixas de ataque por golpe (só golpes com `box`: sem projétil nem lag). */
  boxes: Partial<Record<NomeGolpe, CaixaGolpe>>;
  sps: readonly [GolpeMontado, GolpeMontado, GolpeMontado];
  /** Projétil do especial principal + custo/velocidade (ch.proj). */
  proj: ProjetilDef & { cost: number; speed: number };
  /** Nome do especial principal (ch.special). */
  special: string;
  /** De onde o projétil nasce em relação aos pés (px lógicos, já na escala do lutador). */
  spawn: { x: number; y: number };
};

const ESPECIAIS: readonly NomeEspecial[] = ['sFire', 'sDown', 'sFwd'];

/**
 * Monta um lutador a partir dos dados estáticos e das poses do atlas. Função pura: porte
 * literal de setupChars() + buildMoves() do protótipo (linhas 387-395 e 597-615).
 */
export function montarLutador(def: LutadorDef, pd: Poses): LutadorMontado {
  const idle = pd['idle0'] ?? pd['guard'];
  if (!idle) throw new Error(`${def.id}: atlas sem idle0/guard`);
  const g = pd['guard'] ?? pd['idle0'];
  if (!g) throw new Error(`${def.id}: atlas sem guard/idle0`);

  const moves = {} as Record<NomeGolpe, GolpeMontado>;
  const semAnim = { s: [], a: [] };
  for (const n of NOMES_GOLPES_BASE) {
    moves[n] = { ...BASE_MOVES[n], ...(def.mods[n] ?? {}), id: n, anim: semAnim };
  }
  for (const n of ESPECIAIS) moves[n] = { ...def.especiais[n], id: n, anim: semAnim };

  const alias: Record<string, string> = {
    sb1: def.especiais.sDown.pose,
    sb2: def.especiais.sDown.pose,
    sc1: def.especiais.sFwd.pose,
    sc0: def.especiais.sFwd.pre || 'guard',
  };

  const parcial = { ...def, pd, alias };
  const R = def.reach || 1;
  const boxes: Partial<Record<NomeGolpe, CaixaGolpe>> = {};
  const nomes = Object.keys(moves) as NomeGolpe[];
  for (const n of nomes) {
    const mv = moves[n];
    mv.anim = animFor(n, mv, def.anim);
    if (mv.type === 'fire' || mv.kind === 'lag') continue;
    mv.box = n;
    const primeiro = mv.anim.a[0] ?? 'idle0';
    const t = getPD(parcial, primeiro);
    const rm = mv.rm ?? 1;
    const h = mv.bh ?? 0;
    if (mv.tall) {
      boxes[n] = { fx: 6, fy: h + 30, w: Math.max(100, ((t.tipX || 140) * def.scale * 0.6 + 40) * rm), h };
      continue;
    }
    const minReach = mv.crouch && /^(clp|clk|sweep|sb1)$/.test(primeiro) ? 150 : 0;
    const reach = Math.max(minReach, (t.tipX || 140) * def.scale * R + 28) * rm;
    boxes[n] = { fx: 20, fy: (t.tipY || 150) * def.scale + h / 2, w: Math.max(90, reach - 20), h };
  }

  const sFire = moves.sFire;
  const projDef = sFire.proj;
  if (!projDef) throw new Error(`${def.id}: sFire sem proj`);
  const ponta = pd['special'] ?? pd['sa1'] ?? g;

  return {
    ...def,
    pd,
    legacy: !pd['walk7'],
    K: (def.scale * SH_IDLE) / idle.h,
    head: [
      g.x + (g.rosto?.[0] ?? 0) - LADO_RETRATO / 2,
      g.y + (g.rosto?.[1] ?? 0) - LADO_RETRATO / 2,
      LADO_RETRATO,
      LADO_RETRATO,
    ],
    alias,
    moves,
    boxes,
    sps: [moves.sFire, moves.sDown, moves.sFwd],
    proj: { ...projDef, cost: sFire.cost ?? 0, speed: projDef.sp },
    special: sFire.name ?? '',
    spawn: { x: ((ponta.tipX ?? 150) - 30) * def.scale, y: (ponta.tipY ?? 150) * def.scale },
  };
}
