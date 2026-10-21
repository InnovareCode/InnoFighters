import { describe, expect, it } from 'vitest';
import type { ArteLutador } from '../../src/assets/elenco';
import type { LutadorLeitura } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { chDaFicha, desenharLutador } from '../../src/render/lutador';
import type { Ctx } from '../../src/render/tela';

/*
 * A render lê `elenco[id].ch.fichas[ficha]` (C3 `LutadorLeitura.ficha`) em getPD e nas cores `fire`.
 * Produção: ficha sempre null, então o lutador base é o que se desenha (o resto do render é coberto por
 * render-luta.test.ts e pelas fidelidades de pixel).
 */

const quadro = (x: number, y: number, w: number, h: number, ax: number) => ({ x, y, w, h, ax });
const poses: Poses = {
  guard: quadro(8, 8, 289, 410, 137),
  idle0: quadro(8, 8, 289, 410, 137),
  punch: quadro(300, 8, 380, 420, 168),
  kick: quadro(700, 8, 400, 420, 160),
  sweep: quadro(1100, 8, 400, 300, 160),
  special: quadro(1500, 8, 400, 420, 160),
  crouch: quadro(8, 500, 200, 300, 100),
};
const FOGO_F2: readonly [string, string, string] = ['#00ff00', '#ffffff', '#003300'];
const base = montarLutador(
  { ...LUTADORES.hayato, fichas: { fase2: { fire: FOGO_F2, scale: LUTADORES.hayato.scale * 1.5 } } },
  poses,
);
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };

function lutador(extra: Partial<LutadorLeitura> = {}): LutadorLeitura {
  return {
    id: 'hayato', indice: 0, x: 300, y: 470, facing: 1, state: 'idle',
    pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 1, flip: 1 },
    move: null, mt: 0, hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0,
    maxCombo: 0, dmgTaken: 0, combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null,
    barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  };
}

/** Contexto falso que grava as cores de gradiente e os drawImage. */
function gravador() {
  const cores: string[] = [];
  const imagens: unknown[][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return () => ({ addColorStop: (_o: number, c: string) => cores.push(c) });
      }
      if (nome === 'drawImage') return (...a: unknown[]) => imagens.push(a);
      return () => undefined;
    },
    set: () => true,
  }) as unknown as Ctx;
  return { ctx, cores, imagens };
}

describe('render por ficha', () => {
  it('chDaFicha: null = base; ficha existente = a ficha; desconhecida cai no base sem quebrar', () => {
    expect(chDaFicha(base, null)).toBe(base);
    expect(chDaFicha(base, 'fase2')).toBe(base.fichas['fase2']);
    expect(chDaFicha(base, 'nao-existe')).toBe(base);
  });

  it('ficha null: brilho com as cores fire do lutador base e escala K base', () => {
    const g = gravador();
    desenharLutador(g.ctx, lutador({ ficha: null }), base, arte);
    expect(g.cores).toContain(base.fire[0]);
    expect(g.cores).not.toContain(FOGO_F2[0]);
    const corpo = g.imagens.at(-1)!;
    expect(corpo[5]).toBeCloseTo(-137 * base.K); // destino x = -ax * K
  });

  it('ficha ativa: usa as cores fire e o K da ficha (getPD/escala vêm da ficha)', () => {
    const g = gravador();
    desenharLutador(g.ctx, lutador({ ficha: 'fase2' }), base, arte);
    expect(g.cores).toContain(FOGO_F2[0]);
    expect(g.cores).not.toContain(base.fire[0]);
    const kf = base.fichas['fase2']!.K;
    expect(kf).toBeCloseTo(base.K * 1.5);
    expect(g.imagens.at(-1)![5]).toBeCloseTo(-137 * kf);
  });
});
