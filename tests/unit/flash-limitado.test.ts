import { describe, expect, it } from 'vitest';
import type { ArteLutador } from '../../src/assets/elenco';
import type { EventoLuta, LutadorLeitura } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { alfaDoFlash, LimiteDoFlash, TETO_DO_FLASH_LIMITADO } from '../../src/render/flash-limitado';
import { desenharLutador } from '../../src/render/lutador';
import type { Ctx } from '../../src/render/tela';

/*
 * Flash de dano limitado nas situações novas (super multi-acerto e filme do KO): o protótipo (0,5) fica intacto em qualquer outro acerto. A prova de pixel do protótipo é o oráculo
 * (tests/e2e/fidelidade-*.spec.ts); a de pixel da cena nova é tests/e2e/flash-limitado.spec.ts. Aqui: a regra, o rastreador e o alfa realmente usado no desenho do corpo.
 */

function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas };
}

const quadro = (x: number, y: number, w: number, h: number, ax: number) => ({ x, y, w, h, ax });
const poses: Poses = { idle0: quadro(8, 8, 289, 410, 137), guard: quadro(8, 8, 289, 410, 137) };
const hayato = montarLutador(LUTADORES.hayato, poses);
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const SIL = { tag: 'silhueta' } as unknown as CanvasImageSource;
const arte: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => SIL, retrato: () => null };
const pose = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 } as const;
const lutador = (extra: Partial<LutadorLeitura> = {}): LutadorLeitura =>
  ({
    id: 'hayato', indice: 0, x: 300, y: 470, facing: 1, state: 'hit', pose, move: null, mt: 0, hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 8, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0,
    dmgTaken: 0, combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  }) as LutadorLeitura;

/** Os alfas com que a SILHUETA (o flash) foi desenhada: o `drawImage` cuja fonte é `SIL` e que não é o rastro (a pose não tem rastro aqui). */
function alfasDoFlash(g: ReturnType<typeof gravador>): number[] {
  const r: number[] = [];
  let alfa = 1;
  for (const [n, v, ...resto] of g.chamadas) {
    if (n === '=globalAlpha') alfa = v as number;
    else if (n === 'drawImage' && v === SIL && resto.length >= 0) r.push(alfa);
  }
  return r;
}

describe('alfaDoFlash', () => {
  it('sem limite é o do protótipo (flash/8*0,5) em todos os valores; com limite, no máximo 0,15 e decai junto com o contador', () => {
    for (let flash = 0; flash <= 8; flash++) expect(alfaDoFlash(flash, false)).toBe((flash / 8) * 0.5);
    expect(alfaDoFlash(8, true)).toBe(TETO_DO_FLASH_LIMITADO);
    expect(alfaDoFlash(5, true)).toBe(TETO_DO_FLASH_LIMITADO);
    expect(alfaDoFlash(4, true)).toBe(0.15);
    expect(alfaDoFlash(3, true)).toBe(0.15);
    expect(alfaDoFlash(2, true)).toBe(0.125);
    expect(alfaDoFlash(0, true)).toBe(0);
    expect(TETO_DO_FLASH_LIMITADO).toBe(0.15);
  });
});

describe('desenharLutador: o alfa do flash que vai para o canvas', () => {
  it('padrão: 0,5 com flash 8 (o protótipo); limitado: 0,15; a escala do corpo e o resto do desenho não mudam', () => {
    const a = gravador();
    desenharLutador(a.ctx, lutador(), hayato, arte);
    expect(alfasDoFlash(a)).toContain(0.5);
    const b = gravador();
    desenharLutador(b.ctx, lutador(), hayato, arte, 0, true);
    expect(alfasDoFlash(b)).toContain(0.15);
    expect(alfasDoFlash(b)).not.toContain(0.5);
    // mesmo número de desenhos: só o alfa muda
    expect(b.chamadas.filter(([n]) => n === 'drawImage')).toHaveLength(a.chamadas.filter(([n]) => n === 'drawImage').length);
  });

  it('limitado com flash já abaixo do teto (decaindo): igual ao padrão', () => {
    const a = gravador();
    desenharLutador(a.ctx, lutador({ flash: 2 }), hayato, arte);
    const b = gravador();
    desenharLutador(b.ctx, lutador({ flash: 2 }), hayato, arte, 0, true);
    expect(alfasDoFlash(b)).toEqual(alfasDoFlash(a));
  });
});

describe('LimiteDoFlash: só o defensor do super e do filme com motivo', () => {
  const hit = (extra: Record<string, unknown> = {}): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, ...extra }) as unknown as EventoLuta;
  const filme = (extra: Record<string, unknown> = {}): EventoLuta => ({ tipo: 'filme', atacante: 1, defensor: 0, ...extra }) as unknown as EventoLuta;
  const luta = (f0: number, f1: number) => ({ fighters: [{ flash: f0 }, { flash: f1 }] }) as never;

  it('acerto comum e filme sem motivo (sem `ritmo.filmeRestrito`) não limitam nada', () => {
    const l = new LimiteDoFlash();
    l.reagir([hit(), hit({ especial: true }), filme()]);
    expect(l.limitado).toEqual({ 0: false, 1: false });
  });

  it('acerto do super limita o DEFENSOR (o outro não); filme com motivo também', () => {
    const l = new LimiteDoFlash();
    l.reagir([hit({ super: true })]);
    expect(l.limitado).toEqual({ 0: false, 1: true });
    const m = new LimiteDoFlash();
    m.reagir([filme({ motivo: 'ko' })]);
    expect(m.limitado).toEqual({ 0: true, 1: false });
  });

  it('o limite dura enquanto o flash existe ou o filme toca, e some quando zera: o acerto comum seguinte volta a 0,5', () => {
    const l = new LimiteDoFlash();
    l.reagir([hit({ super: true })]);
    l.avancar(luta(0, 8), false);
    expect(l.limitado[1]).toBe(true);
    l.avancar(luta(0, 0), true); // zerou mas o filme ainda toca
    expect(l.limitado[1]).toBe(true);
    l.avancar(luta(0, 0), false);
    expect(l.limitado[1]).toBe(false);
  });

  it('zerar (nova luta / novo plano) desliga tudo', () => {
    const l = new LimiteDoFlash();
    l.reagir([hit({ super: true }), filme({ motivo: 'super' })]);
    l.zerar();
    expect(l.limitado).toEqual({ 0: false, 1: false });
  });
});
