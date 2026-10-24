import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { LARGURA } from '../../src/core/constantes';
import type { IdLutador, LeituraLuta, LutadorLeitura } from '../../src/core/contratos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { ALTURA_FAIXA_RITMO, DURACAO_FAIXA_1A_VEZ, DURACAO_FAIXA_REPETIDA, FaixaRitmo, Y_TOPO_FAIXA_RITMO } from '../../src/render/faixa-ritmo';
import type { Ctx } from '../../src/render/tela';

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const SIL = { tag: 'silhueta' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => SIL, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

/** Contexto que só grava chamadas (não precisa validar pixel: isso é medido no navegador, skill `medir-antes-de-afirmar`). */
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
    hp: 100, maxHp: 100, hpShown: 100, en: 50, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
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

describe('FaixaRitmo (R-2, §3.2): o aviso do especial SEM congelar a luta', () => {
  it('nasce sem nada ativo', () => {
    const f = new FaixaRitmo();
    expect(f.ativa).toBe(false);
    expect(f.estado).toBeNull();
  });

  it('1ª vez de um golpe: 40 ticks; a 2ª vez do MESMO golpe/lutador/ficha nesta luta: 24 ticks', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    expect(f.estado?.repetida).toBe(false);
    for (let i = 0; i < DURACAO_FAIXA_1A_VEZ; i++) f.avancar();
    expect(f.ativa).toBe(false); // os 40 ticks da 1ª vez já passaram

    f.iniciar({ lutador: 0, golpe: 'sFire' });
    expect(f.estado?.repetida).toBe(true);
    for (let i = 0; i < DURACAO_FAIXA_REPETIDA - 1; i++) f.avancar();
    expect(f.ativa).toBe(true); // ainda não chegou aos 24
    f.avancar();
    expect(f.ativa).toBe(false); // agora sim
  });

  it('golpes diferentes (ou o MESMO golpe de outro lutador/ficha) são "1ª vez" cada um', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    for (let i = 0; i < DURACAO_FAIXA_1A_VEZ; i++) f.avancar();
    f.iniciar({ lutador: 0, golpe: 'sDown' });
    expect(f.estado?.repetida).toBe(false);
    f.iniciar({ lutador: 1, golpe: 'sFire' });
    // enfileirado (o golpe do lutador 0 ainda está rodando): a 2ª entrada espera, mas já nasce marcada "não repetida" dela mesma
    expect(f.ativa).toBe(true);
  });

  it('dois especiais quase juntos: o 2º fica na fila e só entra quando o 1º termina — nunca os dois ao mesmo tempo', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    f.iniciar({ lutador: 1, golpe: 'sDown' });
    expect(f.estado?.lutador).toBe(0);
    for (let i = 0; i < DURACAO_FAIXA_1A_VEZ; i++) f.avancar();
    expect(f.estado?.lutador).toBe(1); // o 2º só assume depois do 1º acabar
  });

  it('zerarLuta: esquece o que foi visto (a próxima luta recomeça do zero) e limpa a fila', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    for (let i = 0; i < DURACAO_FAIXA_1A_VEZ; i++) f.avancar();
    f.zerarLuta();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    expect(f.estado?.repetida).toBe(false);
  });

  it('desenhar sem nada ativo não lança e não desenha nada', () => {
    const f = new FaixaRitmo();
    const g = gravador();
    expect(() => f.desenhar(g.ctx, luta(), elenco)).not.toThrow();
    expect(g.chamadas.length).toBe(0);
  });

  it('a faixa (clip) cobre a LARGURA inteira, logo abaixo do HUD — a mesma área, entrando ou saindo', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    const g = gravador();
    f.desenhar(g.ctx, luta(), elenco);
    const [, x, y, w, h] = g.chamadas.find(([n]) => n === 'rect') as [string, number, number, number, number];
    expect(x).toBe(0);
    expect(y).toBe(Y_TOPO_FAIXA_RITMO);
    expect(w).toBe(LARGURA);
    expect(h).toBe(ALTURA_FAIXA_RITMO);
  });

  it('no 1º tick (t=0) a faixa ainda está ENTRANDO pela esquerda: o fundo nasce fora da tela (x bem negativo)', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    const g = gravador();
    f.desenhar(g.ctx, luta(), elenco);
    const fundo = g.chamadas.find(([n, , y]) => n === 'fillRect' && y === Y_TOPO_FAIXA_RITMO) as [string, number, number, number, number];
    expect(fundo[1]).toBeLessThan(-LARGURA * 0.5); // bem fora da tela à esquerda
  });

  it('depois da entrada (passado o 6º tick), a faixa está no lugar (x = 0, sem deslize)', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    for (let i = 0; i < 10; i++) f.avancar(); // passa da janela de entrada (6 ticks)
    const g = gravador();
    f.desenhar(g.ctx, luta(), elenco);
    const fundo = g.chamadas.find(([n, , y]) => n === 'fillRect' && y === Y_TOPO_FAIXA_RITMO) as [string, number, number, number, number];
    expect(fundo[1]).toBe(0);
  });

  it('nos últimos ticks (saindo), volta a deslizar para a esquerda', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sFire' });
    for (let i = 0; i < DURACAO_FAIXA_1A_VEZ - 1; i++) f.avancar(); // o último tick antes de fechar
    const g = gravador();
    f.desenhar(g.ctx, luta(), elenco);
    const fundo = g.chamadas.find(([n, , y]) => n === 'fillRect' && y === Y_TOPO_FAIXA_RITMO) as [string, number, number, number, number];
    expect(fundo[1]).toBeLessThan(0);
  });

  it('sempre desenha o nome do golpe (com ou sem rosto disponível)', () => {
    const f = new FaixaRitmo();
    f.iniciar({ lutador: 0, golpe: 'sDown' });
    for (let i = 0; i < 10; i++) f.avancar();
    const g = gravador();
    f.desenhar(g.ctx, luta(), elenco);
    expect(g.chamadas.some(([n]) => n === 'fillText')).toBe(true);
  });

  it('geometria: a faixa é alta o bastante para caber o rosto (§3.2, terço de cima) e começa logo abaixo do HUD', () => {
    expect(ALTURA_FAIXA_RITMO).toBeGreaterThanOrEqual(120);
    expect(Y_TOPO_FAIXA_RITMO).toBeGreaterThanOrEqual(80);
  });
});
