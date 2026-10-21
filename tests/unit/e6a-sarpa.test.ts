import { describe, expect, it } from 'vitest';
import { GROUND, SH } from '../../src/core/constantes';
import { INPUT_VAZIO, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { getPD } from '../../src/data/poses';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { hurtbox } from '../../src/fight/colisao';
import { montarElenco } from '../../ferramentas/balanco/elenco';

/*
 * E6a: duas correções objetivas da SARPA (ficha da NILA), apontadas pela Lyra na F3b (docs/handoff-lyra-f3b.md, defeitos 1 e 2).
 * Tudo roda sobre o atlas de PRODUÇÃO: a altura do sprite e o ápice do salto dependem da arte real.
 */
const elenco = montarElenco();
const SEM_ENTRADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };

/** Onde termina o HUD na tela lógica: o relógio (render/hud.ts: texto de 46 px centrado em y 74) vai até ~98. */
const BASE_DO_HUD = 98;
/** Zoom máximo da câmera (game.ts updateCamera: 1 + 0,075 com os dois colados). Zoom ancorado no chão: pior caso para o topo. */
const ZOOM_MAX = 1.075;

function luta(c1: IdLutador, c2: IdLutador): Game {
  const g = new Game({ lutadores: elenco, rng: criarRng(1) });
  g.setup({ mode: 'training', c1, c2 }, { rounds: 2, time: 99, shake: false });
  g.phase = 'fight';
  return g;
}

describe('SARPA: o salto não sobe por cima do HUD', () => {
  function voar() {
    const g = luta('nila', 'hayato');
    g.p1.trocarFicha('sarpa');
    g.p1.x = 300;
    g.p2.x = 900;
    g.p2.invuln = 1_000_000;
    g.p1.en = 100;
    g.p1.startMove('sFwd', g);
    let topoNaTela = Infinity;
    let voou = 0;
    let xDecolagem = 0;
    let xPouso = 0;
    for (let i = 0; i < 200 && g.p1.state === 'move'; i++) {
      g.update(SEM_ENTRADA);
      const p = g.p1;
      if (p.y < GROUND) {
        if (voou === 0) xDecolagem = p.x;
        voou++;
        xPouso = p.x;
        const pd = getPD(p.ch, p.pose.name);
        const topo = p.y + p.pose.dy - pd.h * p.ch.K * p.pose.sy; // o desenho põe a base do quadro em y e sobe h*K
        topoNaTela = Math.min(topoNaTela, GROUND - (GROUND - topo) * ZOOM_MAX);
      }
    }
    return { topoNaTela, voou, deslocamento: xPouso - xDecolagem };
  }

  it('em nenhum tick do voo o topo do sprite, com o zoom máximo, passa da base do HUD', () => {
    const v = voar();
    expect(v.voou).toBeGreaterThan(20); // voou de verdade (o teste não passa por ficar no chão)
    expect(v.topoNaTela).toBeGreaterThanOrEqual(BASE_DO_HUD);
  });

  it('o alcance horizontal do salto continua o de antes (~264 px, ±8%)', () => {
    const { deslocamento } = voar();
    expect(deslocamento).toBeGreaterThan(250 * 0.92);
    expect(deslocamento).toBeLessThan(270 * 1.08);
  });

  it('o salto ainda é "altíssimo": passa de 110 px de altura do chão (não virou um pulinho)', () => {
    const g = luta('nila', 'hayato');
    g.p1.trocarFicha('sarpa');
    g.p1.x = 300;
    g.p2.x = 900;
    g.p2.invuln = 1_000_000;
    g.p1.en = 100;
    g.p1.startMove('sFwd', g);
    let alto = 0;
    for (let i = 0; i < 200 && g.p1.state === 'move'; i++) {
      g.update(SEM_ENTRADA);
      alto = Math.max(alto, GROUND - g.p1.y);
    }
    expect(alto).toBeGreaterThan(110);
  });
});

describe('SARPA: hurtbox em pé proporcional ao sprite', () => {
  const cheia = hurtbox({ x: 500, y: GROUND, state: 'idle', baixo: false, noChao: true });

  function caixaDe(id: IdLutador, ficha: string | null, estado: 'idle' | 'walk' | 'block' | 'crouch' | 'jump', extra: { agachado?: boolean } = {}) {
    const g = luta(id, 'hayato');
    g.p1.trocarFicha(ficha);
    g.p1.x = 500;
    g.p1.state = estado;
    if (estado === 'jump') g.p1.y = GROUND - 120;
    g.p1.crouching = extra.agachado === true;
    return g.p1.hurtbox();
  }

  it('SARPA em idle, andar e defesa em pé: 79% da altura de pé (a base fica no chão)', () => {
    for (const e of ['idle', 'walk', 'block'] as const) {
      const c = caixaDe('nila', 'sarpa', e);
      expect(c.h, e).toBeCloseTo(cheia.h * 0.79, 9);
      expect(c.y + c.h, e).toBeCloseTo(GROUND, 9);
      expect(c.w, e).toBe(cheia.w);
    }
  });

  it('a GAJA (ficha base) e os outros 8 lutadores (o ZENON tem a dele: 1,22) têm a caixa de sempre, bit a bit', () => {
    expect(caixaDe('nila', null, 'idle')).toEqual(cheia);
    expect(cheia.h).toBe(SH * 0.96);
    expect(elenco['zenon' as IdLutador].alturaEmPe).toBe(1.22);
    for (const id of (Object.keys(elenco) as IdLutador[]).filter((x) => x !== ('zenon' as IdLutador))) {
      expect(elenco[id].alturaEmPe, id).toBeUndefined();
      for (const e of ['idle', 'walk', 'block'] as const) expect(caixaDe(id, null, e), `${id} ${e}`).toEqual(cheia);
    }
  });

  it('agachada e no ar a SARPA usa a caixa dos outros (essas poses não encolhem)', () => {
    const agachada = caixaDe('nila', 'sarpa', 'crouch');
    expect(agachada.h).toBeCloseTo(SH * 0.56, 9);
    const defendendoAgachada = caixaDe('nila', 'sarpa', 'block', { agachado: true });
    expect(defendendoAgachada.h).toBeCloseTo(SH * 0.56, 9);
    const noAr = caixaDe('nila', 'sarpa', 'jump');
    expect(noAr.h).toBeCloseTo(SH * 0.96 - 50, 9);
  });

  it('um golpe alto (acima da cabeça dela) erra a SARPA em pé e acerta a GAJA', () => {
    const sarpa = caixaDe('nila', 'sarpa', 'idle');
    const gaja = caixaDe('nila', null, 'idle');
    const topoSarpa = GROUND - sarpa.h;
    const faixaAlta = { x: 480, y: topoSarpa - 30, w: 60, h: 20 }; // 30 a 10 px ACIMA do topo dela, ainda dentro da altura da GAJA
    const toca = (a: typeof faixaAlta, b: typeof gaja): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    expect(toca(faixaAlta, sarpa)).toBe(false);
    expect(toca(faixaAlta, gaja)).toBe(true);
  });

  it('o 0,79 do dado bate com a ARTE: idle, andar e defesa da SARPA medem 76-81% dos da GAJA no atlas de produção', () => {
    const nila = elenco.nila;
    const sarpa = nila.fichas['sarpa'];
    expect(sarpa).toBeDefined();
    const alt = (nome: string, ch: typeof nila): number => getPD(ch, nome).h;
    const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const idle = media([0, 1, 2, 3].map((i) => alt(`idle${i}`, sarpa as typeof nila))) / media([0, 1, 2, 3].map((i) => alt(`idle${i}`, nila)));
    const andar = media([0, 1, 2, 3, 4, 5, 6, 7].map((i) => alt(`walk${i}`, sarpa as typeof nila))) / media([0, 1, 2, 3, 4, 5, 6, 7].map((i) => alt(`walk${i}`, nila)));
    const defesa = alt('block', sarpa as typeof nila) / alt('block', nila);
    for (const [nome, r] of [['idle', idle], ['andar', andar], ['defesa', defesa]] as const) {
      expect(Math.abs(r - (sarpa?.alturaEmPe ?? 0)), `${nome} ${r.toFixed(3)}`).toBeLessThanOrEqual(0.045);
    }
  });
});
