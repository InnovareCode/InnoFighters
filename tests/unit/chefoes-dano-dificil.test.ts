import { describe, expect, it } from 'vitest';
import { INPUT_VAZIO, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { manifestoParaPoses } from '../../src/data/atlas';
import { LUTADORES } from '../../src/data/lutadores';
import { DANO_RECEBIDO_MIN, montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { ConfigChefe, LutadorDef } from '../../src/data/tipos';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { lerManifesto, montarTodos } from './_lutadores';

/*
 * V2-6b: `ConfigChefe.danoRecebidoDificil`. Um fator só não serve aos dois níveis (o desafiante DIFÍCIL com combo e filme abriu a distância entre NORMAL e
 * DIFÍCIL, diferente em cada chefão), então o chefão que joga no DIFÍCIL (CPU nível 2) usa este; nos outros níveis (e ausente) vale `danoRecebido`.
 */
const AJUSTES = { rounds: 2, time: 99, shake: true };
const NADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
const base = montarTodos({ arteReal: true, dadosDeProducao: true });
const CHEFOES = ['aminu', 'centella', 'camille', 'nila', 'baatar', 'zenon'] as const satisfies readonly IdLutador[];

/** O def com o bloco `chefe` alterado; `undefined` APAGA a chave (é como se prova "campo ausente"). */
function defComChefe(id: IdLutador, mudanca: { [K in keyof ConfigChefe]?: ConfigChefe[K] | undefined }): LutadorDef {
  const def = LUTADORES[id];
  if (!def.chefe) throw new Error(`${id} sem bloco chefe`);
  const chefe: Record<string, unknown> = { ...def.chefe };
  for (const [k, v] of Object.entries(mudanca)) {
    if (v === undefined) delete chefe[k];
    else chefe[k] = v;
  }
  return { ...def, chefe: chefe as ConfigChefe };
}

const montar = (id: IdLutador, mudanca: { [K in keyof ConfigChefe]?: ConfigChefe[K] | undefined }): LutadorMontado => montarLutador(defComChefe(id, mudanca), manifestoParaPoses(lerManifesto(id)));

type Privado = { applyHit(a: unknown, d: unknown, mv: unknown, box: { x: number; y: number; w: number; h: number }): void };
const ATAQUE = {
  dmg: 10, kb: 6, hs: 18, bs: 12, lvl: 'mid', snd: 'punch', kind: 'punch', heavy: false, kd: false, hits: undefined, proj: false,
  quebraGuarda: undefined, rank: 1, contra: undefined, golpe: undefined, especial: false, nivelCarga: 0, drenaEnergia: undefined,
};

/** O dano que a vida do chefão (P2, CPU de nível `nivel`) sofre de um golpe de 10 do HAYATO. */
function danoNoChefao(chefe: LutadorMontado, id: IdLutador, nivel: number | null): number {
  const g = new Game({ lutadores: { ...base, [id]: chefe }, rng: criarRng(7) });
  g.setup({ mode: 'versus', c1: 'hayato', c2: id, chefe: true }, { ...AJUSTES });
  for (let i = 0; i < 400 && g.phase !== 'fight'; i++) g.update(NADA);
  g.p1.x = 420;
  g.p2.x = 480;
  g.p2.cpu = nivel;
  const hp = g.p2.hp;
  const hb = g.p2.hurtbox();
  (g as unknown as Privado).applyHit(g.p1, g.p2, ATAQUE, { x: hb.x, y: hb.y, w: hb.w, h: hb.h });
  return hp - g.p2.hp;
}

describe('V2-6b · danoRecebidoDificil no motor', () => {
  const chefe = montar('aminu', { danoRecebido: 0.9, danoRecebidoDificil: 0.7 });

  it('só o nível DIFÍCIL (2) usa o fator do DIFÍCIL; FÁCIL, NORMAL e sem CPU usam o `danoRecebido`', () => {
    const cheio = danoNoChefao(montar('aminu', { danoRecebido: 1 }), 'aminu', 1);
    expect(danoNoChefao(chefe, 'aminu', 2)).toBeCloseTo(cheio * 0.7, 9);
    for (const nivel of [0, 1, null]) expect(danoNoChefao(chefe, 'aminu', nivel), String(nivel)).toBeCloseTo(cheio * 0.9, 9);
  });

  it('ausente: o DIFÍCIL cai no `danoRecebido` (o motor de antes, bit a bit)', () => {
    const so = montar('aminu', { danoRecebido: 0.9, danoRecebidoDificil: undefined });
    expect(danoNoChefao(so, 'aminu', 2)).toBe(danoNoChefao(so, 'aminu', 1));
  });
});

describe('V2-6b · o montador valida (falha alto, no boot)', () => {
  it('aceita de 0,60 a 1', () => {
    for (const x of [0.6, 0.72, 1]) expect(() => montar('aminu', { danoRecebidoDificil: x }), String(x)).not.toThrow();
  });

  it.each([0.59, 0, -1, 1.01, Number.NaN, Number.POSITIVE_INFINITY])('recusa %s', (x) => {
    expect(() => montar('aminu', { danoRecebidoDificil: x })).toThrow(/DIFÍCIL\): danoRecebido deve estar entre 0.6 e 1/);
  });
});

describe('V2-6b · os 6 chefões em dados', () => {
  it.each(CHEFOES)('%s: os dois fatores existem e estão entre 0,60 e 1', (id) => {
    const c = LUTADORES[id].chefe as ConfigChefe;
    for (const x of [c.danoRecebido, c.danoRecebidoDificil]) {
      expect(x, id).toBeDefined();
      expect(x as number).toBeGreaterThanOrEqual(DANO_RECEBIDO_MIN);
      expect(x as number).toBeLessThanOrEqual(1);
    }
  });
});
