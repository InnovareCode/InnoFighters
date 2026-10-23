import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import type { LeituraLuta, LutadorLeitura, PoseAtual, ProjetilLeitura } from '../../src/core/contratos';
import type { GolpeMontado } from '../../src/data/tipos';
import { Fluidez, SALTO_MAXIMO } from '../../src/render/fluidez';
import { forcaDoGolpe, mola, pesoDe, tremorDoDefensor, type EntradaDaMola } from '../../src/render/mola';

/*
 * V2-2: a mola (render/mola.ts) e a leitura desenhável (render/fluidez.ts). Os números esperados são LITERAIS da tabela do Apolo
 * (docs/roteiros-filme-especiais.md §8.2), nunca lidos do código: comparar com a constante importada seria tautologia.
 */

const POSE: PoseAtual = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 };
const entrada = (o: Partial<EntradaDaMola>): EntradaDaMola => ({ state: 'idle', move: null, mt: 0, age: 0, pose: POSE, ...o });
const golpe = (o: Partial<GolpeMontado>): GolpeMontado => ({ S: 10, A: 4, R: 12, type: 'hit', kind: 'punch', ...o }) as GolpeMontado;

describe('mola: a tabela do Apolo (§8.2)', () => {
  it('antecipação de golpe comum: dx = -x·p (leve 5, médio 7, pesado 9)', () => {
    const mv = golpe({});
    // mt 5 de S 10 -> p = 0,5
    expect(mola(entrada({ state: 'move', move: 'lp', mt: 5 }), mv, 'leve').dx).toBeCloseTo(-2.5, 6);
    expect(mola(entrada({ state: 'move', move: 'lp', mt: 5 }), mv, 'medio').dx).toBeCloseTo(-3.5, 6);
    expect(mola(entrada({ state: 'move', move: 'lp', mt: 5 }), mv, 'pesado').dx).toBeCloseTo(-4.5, 6);
  });

  it('antecipação de golpe pesado: dx e sx por peso', () => {
    const mv = golpe({ heavy: 1 });
    const e = entrada({ state: 'move', move: 'hp', mt: 5 }); // p = 0,5
    expect(mola(e, mv, 'leve')).toMatchObject({ dx: -4.5, sx: 1.01 });
    expect(mola(e, mv, 'medio')).toMatchObject({ dx: -6, sx: 1.015 });
    expect(mola(e, mv, 'pesado')).toMatchObject({ dx: -7.5, sx: 1.02 });
  });

  it('preparo de projétil: sy, sx e dx no fim da preparação (p = 0,9 no último tick)', () => {
    const mv = golpe({ type: 'fire', kind: 'fire' });
    const e = entrada({ state: 'move', move: 'sFire', mt: 9 });
    const leve = mola(e, mv, 'leve');
    expect(leve.sy).toBeCloseTo(1 - 0.05 * 0.9, 6);
    expect(leve.sx).toBeCloseTo(1 + 0.03 * 0.9, 6);
    expect(leve.dx).toBeCloseTo(-8 * 0.9, 6);
    const pesado = mola(e, mv, 'pesado');
    expect(pesado.sy).toBeCloseTo(1 - 0.08 * 0.9, 6);
    expect(pesado.dx).toBeCloseTo(-12 * 0.9, 6);
  });

  it('o teto de deformação: |1 - sx| e |1 - sy| nunca passam de 8%, e a inclinação de 0,15 rad (a queda no ar tem teto de 0,5)', () => {
    const mv = golpe({ type: 'fire', kind: 'fire' });
    for (const peso of ['leve', 'medio', 'pesado'] as const) {
      const m = mola(entrada({ state: 'move', move: 'sFire', mt: 9 }), mv, peso);
      expect(Math.abs(1 - m.sx)).toBeLessThanOrEqual(0.08 + 1e-9);
      expect(Math.abs(1 - m.sy)).toBeLessThanOrEqual(0.08 + 1e-9);
    }
    expect(mola(entrada({ state: 'move', move: 'x', mt: 20 }), golpe({ tilt: 0.9 }), 'medio').rot).toBe(0.15);
    expect(mola(entrada({ state: 'down', pose: { ...POSE, name: 'kdAir' } }), null, 'leve', 0, -400).rot).toBeCloseTo(0.5, 6); // vy -400: clamp em 0,5 e sinal invertido
  });

  it('golpe pesado na fase ativa: avanço dx e sx (até A+4), depois nada', () => {
    const mv = golpe({ heavy: 1 });
    expect(mola(entrada({ state: 'move', move: 'hp', mt: 12 }), mv, 'medio')).toMatchObject({ dx: 7, sx: 1.04 });
    expect(mola(entrada({ state: 'move', move: 'hp', mt: 12 }), mv, 'pesado')).toMatchObject({ dx: 9, sx: 1.05 });
    expect(mola(entrada({ state: 'move', move: 'hp', mt: 10 + 4 + 4 }), mv, 'medio')).toMatchObject({ dx: 0, sx: 1 }); // into 8 = A + 4
  });

  it('investida (rush) inclina 0,12 / 0,10 / 0,06; `tilt` do golpe manda sobre ela', () => {
    const mv = golpe({ type: 'rush' });
    const e = entrada({ state: 'move', move: 'sFwd', mt: 11 });
    expect(mola(e, mv, 'leve').rot).toBeCloseTo(0.12, 6);
    expect(mola(e, mv, 'medio').rot).toBeCloseTo(0.1, 6);
    expect(mola(e, mv, 'pesado').rot).toBeCloseTo(0.06, 6);
    expect(mola(e, golpe({ type: 'rush', tilt: 0.05 }), 'leve').rot).toBeCloseTo(0.05, 6);
  });

  it('pouso e pré-pulo: sy por peso', () => {
    expect(mola(entrada({ state: 'land' }), null, 'leve').sy).toBeCloseTo(0.97, 6);
    expect(mola(entrada({ state: 'land' }), null, 'medio').sy).toBeCloseTo(0.96, 6);
    expect(mola(entrada({ state: 'land' }), null, 'pesado').sy).toBeCloseTo(0.94, 6);
    expect(mola(entrada({ state: 'prejump' }), null, 'leve').sy).toBeCloseTo(0.96, 6);
    expect(mola(entrada({ state: 'prejump' }), null, 'pesado').sy).toBeCloseTo(0.93, 6);
  });

  it('respiração do idle: amplitude e período por peso (médio: ±0,005 em t/16)', () => {
    // age = 8π: sin(age/16) = sin(π/2) = 1
    expect(mola(entrada({ age: 8 * Math.PI }), null, 'medio').sy).toBeCloseTo(1.005, 6);
    expect(mola(entrada({ age: 6 * Math.PI }), null, 'leve').sy).toBeCloseTo(1.005, 6); // t/12: 6π/12 = π/2
    expect(mola(entrada({ age: 10 * Math.PI }), null, 'pesado').sy).toBeCloseTo(1.004, 6); // t/20
  });

  it('vitória: o quique cai com o peso (8 / 5 / 2 px) e o andar não ganha balanço', () => {
    const st = Math.PI * 11 * 0.5; // sin(st/11) = 1
    expect(mola(entrada({ state: 'win' }), null, 'leve', st).dy).toBeCloseTo(-8, 6);
    expect(mola(entrada({ state: 'win' }), null, 'medio', st).dy).toBeCloseTo(-5, 6);
    expect(mola(entrada({ state: 'win' }), null, 'pesado', st).dy).toBeCloseTo(-2, 6);
    expect(mola(entrada({ state: 'walk', pose: { ...POSE, name: 'walk3' } }), null, 'leve')).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 });
  });

  it('queda no ar (kdAir): rot = -clamp(vy/40) x 1,2 / 1,0 / 0,7; só na pose kdAir', () => {
    const e = entrada({ state: 'down', pose: { ...POSE, name: 'kdAir' } });
    expect(mola(e, null, 'leve', 0, 14).rot).toBeCloseTo(-0.35 * 1.2, 6);
    expect(mola(e, null, 'medio', 0, 14).rot).toBeCloseTo(-0.35, 6);
    expect(mola(e, null, 'pesado', 0, 14).rot).toBeCloseTo(-0.35 * 0.7, 6);
    expect(mola(entrada({ state: 'down', pose: { ...POSE, name: 'koFloor' } }), null, 'medio', 0, 14).rot).toBe(0);
  });

  it('golpe de rebote e golpe desconhecido: sem mola', () => {
    expect(mola(entrada({ state: 'move', move: 'x', mt: 3 }), golpe({ rebote: true } as unknown as Partial<GolpeMontado>), 'medio')).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 });
    expect(mola(entrada({ state: 'move', move: 'x', mt: 3 }), null, 'medio')).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 });
  });

  it('pesos do Apolo: leve = MIN-JI, CENTELLA, CAMILLE, CAIO; médio = HAYATO, NILA; pesado = WEI LONG, AMINU, BAATAR, ZENON', () => {
    for (const id of ['min-ji', 'centella', 'camille', 'caio'] as const) expect(pesoDe(id)).toBe('leve');
    for (const id of ['hayato', 'nila'] as const) expect(pesoDe(id)).toBe('medio');
    for (const id of ['wei-long', 'aminu', 'baatar', 'zenon'] as const) expect(pesoDe(id)).toBe('pesado');
  });

  it('tremor do rival: 2 px (fraco), 3 (forte), 4 (especial) vezes o peso do DEFENSOR (1 / 0,9 / 0,75)', () => {
    expect(forcaDoGolpe('lp')).toBe(2);
    expect(forcaDoGolpe('clk')).toBe(2);
    expect(forcaDoGolpe('jlp')).toBe(2);
    expect(forcaDoGolpe('hp')).toBe(3);
    expect(forcaDoGolpe('chk')).toBe(3);
    expect(forcaDoGolpe('sFire')).toBe(4);
    expect(forcaDoGolpe(null)).toBe(4);
    expect(tremorDoDefensor(3, 'leve')).toBeCloseTo(3, 6);
    expect(tremorDoDefensor(3, 'medio')).toBeCloseTo(2.7, 6);
    expect(tremorDoDefensor(4, 'pesado')).toBeCloseTo(3, 6);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------

function lutador(i: 0 | 1, o: Partial<LutadorLeitura> = {}): LutadorLeitura {
  return {
    id: i === 0 ? 'hayato' : 'baatar',
    indice: i,
    x: i === 0 ? 300 : 600,
    y: 470,
    facing: i === 0 ? 1 : -1,
    state: 'idle',
    pose: { ...POSE },
    move: null,
    mt: 0,
    hp: 100,
    maxHp: 100,
    hpShown: 100,
    en: 0,
    flash: 0,
    invuln: 0,
    age: 0,
    score: 0,
    wins: 0,
    maxCombo: 0,
    dmgTaken: 0,
    combo: { hits: 0, dmg: 0, t: 0 },
    trail: [],
    cpu: null,
    barras: 1,
    barrasMax: 1,
    chefe: false,
    ficha: null,
    nivelCarga: 0,
    esquiva: 0,
    ...o,
  };
}

const ELENCO = {
  hayato: { ch: { legacy: false, moves: { lp: golpe({}), hp: golpe({ heavy: 1 }) }, fichas: {} } },
  baatar: { ch: { legacy: false, moves: {}, fichas: {} } },
} as unknown as Elenco;

function luta(a: LutadorLeitura, b: LutadorLeitura, o: Record<string, unknown> = {}): LeituraLuta {
  const base = { fighters: [a, b], projectiles: [] as ProjetilLeitura[], cam: { x: 480, z: 1 }, hitstop: 0, t: 0, tick: 10, ...o };
  // um getter no protótipo, como o `timer` do Game real: a vista tem de continuar vendo
  return Object.create({ get timer() { return 99; } }, Object.getOwnPropertyDescriptors(base)) as LeituraLuta;
}

const projetil = (id: number, x: number): ProjetilLeitura => ({ id, x, y: 300, vx: 9, dir: 1, dono: 0, style: 'orb', sc: 1, sy: 1, frame: 3 });

describe('Fluidez: a leitura desenhável', () => {
  it('alfa 0 = antes do tick, 1 = atual, 0,5 = no meio (lutador, projétil e câmera)', () => {
    const fl = new Fluidez();
    const antes = luta(lutador(0, { x: 300 }), lutador(1), { projectiles: [projetil(1, 400)], cam: { x: 480, z: 1 } });
    fl.gravar(antes, ELENCO);
    const depois = luta(lutador(0, { x: 310 }), lutador(1), { projectiles: [projetil(1, 410)], cam: { x: 490, z: 1.02 } });
    const v0 = fl.vista(depois, 0, ELENCO);
    const v5 = fl.vista(depois, 0.5, ELENCO);
    const v1 = fl.vista(depois, 1, ELENCO);
    expect([v0.fighters[0].x, v5.fighters[0].x, v1.fighters[0].x]).toEqual([300, 305, 310]);
    expect([v0.projectiles[0]?.x, v5.projectiles[0]?.x, v1.projectiles[0]?.x]).toEqual([400, 405, 410]);
    expect(v5.cam.x).toBe(485);
    expect(v5.cam.z).toBeCloseTo(1.01, 9);
  });

  it('a vista herda da luta (getters como `timer`) e o lutador ainda tem `id` e os campos', () => {
    const fl = new Fluidez();
    const l = luta(lutador(0), lutador(1));
    fl.gravar(l, ELENCO);
    const v = fl.vista(l, 0.5, ELENCO);
    expect(v.timer).toBe(99);
    expect(v.fighters[1].id).toBe('baatar');
    expect(v.fighters[0].facing).toBe(1);
    expect(v.fighters[0].pose.name).toBe('idle0');
  });

  it(`salto acima de ${SALTO_MAXIMO} px NÃO desliza (troca de lado, reinício de round)`, () => {
    const fl = new Fluidez();
    fl.gravar(luta(lutador(0, { x: 200 }), lutador(1)), ELENCO);
    const v = fl.vista(luta(lutador(0, { x: 200 + SALTO_MAXIMO + 1 }), lutador(1)), 0.5, ELENCO);
    expect(v.fighters[0].x).toBe(200 + SALTO_MAXIMO + 1);
    fl.gravar(luta(lutador(0, { x: 200 }), lutador(1)), ELENCO);
    expect(fl.vista(luta(lutador(0, { x: 200 + SALTO_MAXIMO }), lutador(1)), 0.5, ELENCO).fighters[0].x).toBe(200 + SALTO_MAXIMO / 2);
  });

  it('sem `gravar` (1º quadro da luta) desenha o estado atual; `zerar` esquece o passado', () => {
    const fl = new Fluidez();
    const l = luta(lutador(0, { x: 310 }), lutador(1));
    expect(fl.vista(l, 0.3, ELENCO).fighters[0].x).toBe(310);
    fl.gravar(luta(lutador(0, { x: 300 }), lutador(1)), ELENCO);
    expect(fl.vista(l, 0.5, ELENCO).fighters[0].x).toBe(305);
    fl.zerar();
    expect(fl.vista(l, 0.5, ELENCO).fighters[0].x).toBe(310);
  });

  it('alfa fora de [0,1] é preso', () => {
    const fl = new Fluidez();
    fl.gravar(luta(lutador(0, { x: 300 }), lutador(1)), ELENCO);
    const l = luta(lutador(0, { x: 310 }), lutador(1));
    expect(fl.vista(l, 3, ELENCO).fighters[0].x).toBe(310);
    expect(fl.vista(l, -1, ELENCO).fighters[0].x).toBe(300);
  });

  it('a mola entra na pose e se interpola; nome da pose e facing não', () => {
    const fl = new Fluidez();
    const ataque = (mt: number): LutadorLeitura => lutador(0, { state: 'move', move: 'lp', mt, pose: { ...POSE, name: 'lp0' } });
    fl.gravar(luta(ataque(4), lutador(1)), ELENCO); // p = 0,4 -> dx = -7·0,4 = -2,8 (peso médio do HAYATO)
    const v = fl.vista(luta(ataque(5), lutador(1)), 0.5, ELENCO); // p = 0,5 -> -3,5; no meio: -3,15
    expect(v.fighters[0].pose.dx).toBeCloseTo(-3.15, 6);
    expect(v.fighters[0].pose.name).toBe('lp0');
    expect(v.fighters[0].facing).toBe(1);
  });

  it('com `mola: false` a pose é a do motor', () => {
    const fl = new Fluidez();
    const l = luta(lutador(0, { state: 'move', move: 'lp', mt: 5 }), lutador(1));
    fl.gravar(l, ELENCO, { mola: false });
    expect(fl.vista(l, 1, ELENCO, { mola: false }).fighters[0].pose.dx).toBe(0);
  });

  it('arte `legacy` não ganha mola (o poseT já tem a dela)', () => {
    const legado = { hayato: { ch: { legacy: true, moves: { lp: golpe({}) }, fichas: {} } }, baatar: ELENCO['baatar'] } as unknown as Elenco;
    const fl = new Fluidez();
    const l = luta(lutador(0, { state: 'move', move: 'lp', mt: 5 }), lutador(1));
    fl.gravar(l, legado);
    expect(fl.vista(l, 1, legado).fighters[0].pose.dx).toBe(0);
  });

  describe('tremor do rival no congelamento', () => {
    const acerto = (t: number, hitstop = 6, opcoes = {}) => {
      const fl = new Fluidez();
      const a = lutador(0, { state: 'move', move: 'hp', mt: 12 }); // forte: 3 px
      const b = lutador(1, { state: 'hit', flash: 8 }); // BAATAR (pesado): x 0,75, olhando para a esquerda
      const l = luta(a, b, { hitstop, t });
      fl.gravar(l, ELENCO, opcoes);
      return fl.vista(l, 1, ELENCO, opcoes);
    };

    it('só o defensor treme, alternando a cada `Game.t`, em px de tela (facing x amplitude 3 x 0,75)', () => {
      const par = acerto(0);
      const impar = acerto(1);
      // BAATAR olha para a esquerda (facing -1): `dx` no sentido do olhar, então o px de tela é o contrário
      expect(par.fighters[1].pose.dx).toBeCloseTo(-2.25, 6);
      expect(impar.fighters[1].pose.dx).toBeCloseTo(2.25, 6);
      expect(par.fighters[0].pose.dx).toBeCloseTo(7, 6); // o atacante avança (golpe pesado ativo), sem tremor
    });

    it('sem congelamento (hitstop 0), sem tremor', () => {
      expect(acerto(0, 0).fighters[1].pose.dx).toBe(0);
    });

    it('a opção de tremor desligada também apaga o do rival', () => {
      expect(acerto(0, 6, { tremor: false }).fighters[1].pose.dx).toBe(0);
    });

    it('lutador em pé (idle) não treme mesmo no congelamento', () => {
      const fl = new Fluidez();
      const l = luta(lutador(0, { state: 'move', move: 'hp', mt: 12 }), lutador(1, { state: 'idle' }), { hitstop: 6, t: 0 });
      fl.gravar(l, ELENCO);
      expect(fl.vista(l, 1, ELENCO).fighters[1].pose.dx).toBe(0);
    });
  });
});
