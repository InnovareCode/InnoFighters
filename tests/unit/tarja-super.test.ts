import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import type { IdLutador, LeituraLuta, LutadorLeitura } from '../../src/core/contratos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { ALTURA_TARJA_SUPER, DURACAO_TARJA_SUPER, TarjaDoSuper } from '../../src/render/tarja-super';
import type { Ctx } from '../../src/render/tela';

/*
 * TARJA DO SUPER (R-9, docs/spec-redesenho-jogabilidade.md §3.2/§3.4): congela 30 ticks fixos, com a faixa com rosto
 * (`desenharFaixaComRosto`, testada em faixa-rosto.test.ts) + linhas de velocidade no atacante. Aqui: só o relógio
 * (iniciar/avancar/zerarLuta) e que o desenho não lança nem fica em branco.
 */

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

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

function lutador(id: IdLutador, indice: 0 | 1): LutadorLeitura {
  return {
    id, indice, x: indice === 0 ? 300 : 660, y: 470, facing: indice === 0 ? 1 : -1, state: 'move',
    pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 }, move: 'sFire', mt: 3,
    hp: 100, maxHp: 100, hpShown: 100, en: 100, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
    combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0,
  };
}
function luta(a: IdLutador = 'hayato', b: IdLutador = 'wei-long'): LeituraLuta {
  return {
    fighters: [lutador(a, 0), lutador(b, 1)], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2,
    cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp', winner: null,
    matchWinner: null, matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [],
  };
}

describe('TarjaDoSuper (R-9, §3.2/§3.4): congela 30 ticks fixos', () => {
  it('nasce sem nada ativo', () => {
    const t = new TarjaDoSuper();
    expect(t.ativa).toBe(false);
    expect(t.estado).toBeNull();
    expect(t.duracao).toBe(0);
  });

  it('dura exatamente DURACAO_TARJA_SUPER (30) ticks, sem pular (não tem método pular)', () => {
    const t = new TarjaDoSuper();
    t.iniciar({ lutador: 0, golpe: 'sDown', ficha: null, nome: 'TENRAI-KEN' });
    expect(t.ativa).toBe(true);
    expect(t.duracao).toBe(DURACAO_TARJA_SUPER);
    expect(DURACAO_TARJA_SUPER).toBe(30);
    let n = 0;
    while (t.ativa && n < 60) {
      t.avancar();
      n++;
    }
    expect(n).toBe(30);
  });

  it('o nome é o do SUPER (não derivado do golpe)', () => {
    const t = new TarjaDoSuper();
    t.iniciar({ lutador: 1, golpe: 'sFire', ficha: null, nome: 'CORTESIA DA CASA' });
    expect(t.estado?.nome).toBe('CORTESIA DA CASA');
    expect(t.estado?.lutador).toBe(1);
  });

  it('zerarLuta interrompe imediatamente', () => {
    const t = new TarjaDoSuper();
    t.iniciar({ lutador: 0, golpe: 'sDown', ficha: null, nome: 'TENRAI-KEN' });
    t.zerarLuta();
    expect(t.ativa).toBe(false);
  });

  it('avancar() sem nada ativo não lança nem ativa nada', () => {
    const t = new TarjaDoSuper();
    expect(() => t.avancar()).not.toThrow();
    expect(t.ativa).toBe(false);
  });

  it('desenhar sem nada ativo não lança e não desenha', () => {
    const t = new TarjaDoSuper();
    const g = gravador();
    expect(() => t.desenhar(g.ctx, luta(), elenco)).not.toThrow();
    expect(g.chamadas.length).toBe(0);
  });

  it('desenhar com algo ativo: pinta a faixa (fillRect/fillText) e as linhas de velocidade (stroke), sem lançar', () => {
    const t = new TarjaDoSuper();
    t.iniciar({ lutador: 0, golpe: 'sDown', ficha: null, nome: 'TENRAI-KEN' });
    for (let i = 0; i < 10; i++) t.avancar();
    const g = gravador();
    expect(() => t.desenhar(g.ctx, luta(), elenco)).not.toThrow();
    expect(g.chamadas.some(([n]) => n === 'fillRect')).toBe(true);
    expect(g.chamadas.some(([n]) => n === 'fillText')).toBe(true);
    expect(g.chamadas.some(([n]) => n === 'stroke')).toBe(true);
    expect(g.chamadas.some(([n]) => n === 'moveTo' || n === 'lineTo')).toBe(true);
  });

  it('nunca usa shadowBlur/filter/getImageData', () => {
    const t = new TarjaDoSuper();
    t.iniciar({ lutador: 0, golpe: 'sFire', ficha: null, nome: 'TAIJI ZHANG' });
    const g = gravador();
    for (let i = 0; i < DURACAO_TARJA_SUPER && t.ativa; i++) {
      t.desenhar(g.ctx, luta('wei-long', 'hayato'), elenco);
      t.avancar();
    }
    const proibidas = g.chamadas.filter(([n]) => n === '=shadowBlur' || n === '=filter' || n === 'getImageData');
    expect(proibidas).toEqual([]);
  });
});

describe('geometria da tarja do super (a cena congela: pode ser a faixa GRANDE)', () => {
  it('a faixa do super é a de 170 px (y 86-256), maior que a do especial comum (105 px)', () => {
    expect(ALTURA_TARJA_SUPER).toBe(170);
    const t = new TarjaDoSuper();
    t.iniciar({ lutador: 0, golpe: 'sDown', ficha: null, nome: 'TENRAI-KEN' });
    for (let i = 0; i < 10; i++) t.avancar();
    const g = gravador();
    t.desenhar(g.ctx, luta(), elenco);
    const [, x, y, w, h] = g.chamadas.find(([n]) => n === 'rect') as [string, number, number, number, number];
    expect([x, y, w, h]).toEqual([0, 86, 960, 170]);
  });
});
