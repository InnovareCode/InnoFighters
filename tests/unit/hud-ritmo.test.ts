import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { LARGURA } from '../../src/core/constantes';
import type { IdLutador, LeituraLuta, LutadorLeitura } from '../../src/core/contratos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { desenharHUD } from '../../src/render/hud';
import { DURACAO_NOTA, HudRitmo, LIMIAR_PERIGO, NOTAS, PERIODO_PERIGO, TICKS_DO_TRANCO, patamarDoCombo } from '../../src/render/hud-ritmo';
import type { Ctx } from '../../src/render/tela';

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

/** Contexto que só grava chamadas e atribuições (a geometria real é medida no navegador: tests/e2e/hud-ritmo.spec.ts). */
function gravador() {
  const chamadas: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return (s: string) => ({ width: s.length * 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
      return (...a: unknown[]) => chamadas.push(`${nome}(${a.map((x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : String(x))).join(',')})`);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push(`=${nome}:${String(valor)}`);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas };
}

function lutador(id: IdLutador, indice: 0 | 1): LutadorLeitura {
  return {
    id, indice, x: indice === 0 ? 300 : 660, y: 470, facing: indice === 0 ? 1 : -1, state: 'idle',
    pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 }, move: null, mt: 0,
    hp: 100, maxHp: 100, hpShown: 100, en: 50, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
    combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0,
  };
}
function luta(): LeituraLuta {
  return {
    fighters: [lutador('hayato', 0), lutador('wei-long', 1)], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2,
    cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp', winner: null,
    matchWinner: null, matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [],
  };
}

/** O motor: enquanto o rival está preso, `combo` = {hits, dmg, t: 60}; solto, `t` cai de 60 a 0 e `hits` fica. */
const emCombo = (l: LeituraLuta, i: 0 | 1, hits: number, dmg = hits * 5): void => {
  l.fighters[i].combo = { hits, dmg, t: 60 };
};
const solta = (l: LeituraLuta, i: 0 | 1): void => {
  const c = l.fighters[i].combo;
  l.fighters[i].combo = { hits: c.hits, dmg: c.dmg, t: 59 };
};

describe('patamarDoCombo: a nota por acertos e dano', () => {
  it('2 acertos não tem nota; 3 = BOM, 5 = ÓTIMO, 7+ = INCRÍVEL', () => {
    expect(patamarDoCombo(2, 10, 100)).toBe(-1);
    expect(patamarDoCombo(3, 10, 100)).toBe(0);
    expect(patamarDoCombo(4, 10, 100)).toBe(0);
    expect(patamarDoCombo(5, 10, 100)).toBe(1);
    expect(patamarDoCombo(6, 10, 100)).toBe(1);
    expect(patamarDoCombo(7, 10, 100)).toBe(2);
    expect(patamarDoCombo(30, 10, 100)).toBe(2);
  });
  it('dano >= 30% da vida do rival promove um degrau (sem passar do topo e sem inventar nota para 2 acertos)', () => {
    expect(patamarDoCombo(3, 30, 100)).toBe(1);
    expect(patamarDoCombo(5, 45, 100)).toBe(2);
    expect(patamarDoCombo(8, 90, 100)).toBe(2);
    expect(patamarDoCombo(2, 60, 100)).toBe(-1);
    expect(patamarDoCombo(3, 30, 0)).toBe(0);
  });
  it('as palavras são curtas, em caixa alta e em ordem crescente de exigência', () => {
    expect(NOTAS.map((n) => n.palavra)).toEqual(['BOM!', 'ÓTIMO!', 'INCRÍVEL!']);
    expect(NOTAS.every((n, i) => i === 0 || n.minimo > NOTAS[i - 1]!.minimo)).toBe(true);
  });
});

describe('HudRitmo: a nota no fim da cadeia', () => {
  it('combo de 5 que acaba (t cai de 60) vira ÓTIMO por ~1 s e some', () => {
    const h = new HudRitmo();
    const l = luta();
    emCombo(l, 0, 5);
    h.avancar(l);
    expect(h.nota(0).patamar, 'ainda rolando: sem nota').toBe(-1);
    solta(l, 0);
    h.avancar(l);
    expect(h.nota(0)).toEqual({ patamar: 1, hits: 5, ticks: DURACAO_NOTA - 1 });
    expect(h.nota(1).patamar, 'o outro lado não ganha nota').toBe(-1);
    for (let i = 0; i < DURACAO_NOTA; i++) h.avancar(l);
    expect(h.nota(0).patamar).toBe(-1);
    expect(DURACAO_NOTA).toBeGreaterThanOrEqual(50);
    expect(DURACAO_NOTA).toBeLessThanOrEqual(75);
  });
  it('a nota de P2 fica do lado de P2 (o combo é de quem bate)', () => {
    const h = new HudRitmo();
    const l = luta();
    emCombo(l, 1, 8);
    h.avancar(l);
    solta(l, 1);
    h.avancar(l);
    expect(h.nota(1).patamar).toBe(2);
    expect(h.nota(0).patamar).toBe(-1);
  });
  it('combo de 2 acertos, ou o zero do round novo (intro), não dão nota', () => {
    const h = new HudRitmo();
    const l = luta();
    emCombo(l, 0, 2);
    h.avancar(l);
    solta(l, 0);
    h.avancar(l);
    expect(h.nota(0).patamar).toBe(-1);
    const h2 = new HudRitmo();
    const l2 = luta();
    emCombo(l2, 0, 6);
    h2.avancar(l2);
    (l2 as { phase: string }).phase = 'intro';
    l2.fighters[0].combo = { hits: 0, dmg: 0, t: 0 };
    h2.avancar(l2);
    expect(h2.nota(0).patamar).toBe(-1);
  });
  it('o round termina no meio do combo (KO): a nota sai na hora, uma vez só, mesmo com o motor mantendo t = 60', () => {
    const h = new HudRitmo();
    const l = luta();
    emCombo(l, 0, 7);
    h.avancar(l);
    (l as { phase: string }).phase = 'ko';
    h.avancar(l);
    expect(h.nota(0)).toMatchObject({ patamar: 2, hits: 7 });
    const antes = h.nota(0).ticks;
    h.avancar(l);
    expect(h.nota(0).ticks, 'não reavalia: o relógio só anda').toBe(antes - 1);
  });
  it('uma cadeia nova dentro do segundo da nota troca a nota (a mais recente vence)', () => {
    const h = new HudRitmo();
    const l = luta();
    emCombo(l, 0, 3);
    h.avancar(l);
    solta(l, 0);
    h.avancar(l);
    expect(h.nota(0).patamar).toBe(0);
    for (let i = 0; i < 10; i++) h.avancar(l);
    emCombo(l, 0, 9);
    h.avancar(l);
    solta(l, 0);
    h.avancar(l);
    expect(h.nota(0)).toMatchObject({ patamar: 2, hits: 9, ticks: DURACAO_NOTA - 1 });
  });
});

describe('HudRitmo: o DANGER', () => {
  it('aparece com a vida da barra <= 25%, do lado de quem está com a vida baixa, e sobe com rampa', () => {
    const h = new HudRitmo();
    const l = luta();
    l.fighters[1].hp = 100 * LIMIAR_PERIGO;
    h.avancar(l);
    expect(h.perigo(1)).toBeGreaterThan(0);
    expect(h.perigo(1)).toBeLessThan(1);
    expect(h.perigo(0)).toBe(0);
    for (let i = 0; i < 10; i++) h.avancar(l);
    expect(h.perigo(1)).toBe(1);
  });
  it('26% não dispara', () => {
    const h = new HudRitmo();
    const l = luta();
    l.fighters[0].hp = 26;
    for (let i = 0; i < 20; i++) h.avancar(l);
    expect(h.perigo(0)).toBe(0);
  });
  it('some ao curar, no fim do round (KO), com hp 0 e no treino', () => {
    const h = new HudRitmo();
    const l = luta();
    l.fighters[0].hp = 10;
    for (let i = 0; i < 10; i++) h.avancar(l);
    expect(h.perigo(0)).toBe(1);
    l.fighters[0].hp = 80;
    for (let i = 0; i < 10; i++) h.avancar(l);
    expect(h.perigo(0), 'curou').toBe(0);
    l.fighters[0].hp = 10;
    for (let i = 0; i < 10; i++) h.avancar(l);
    (l as { phase: string }).phase = 'ko';
    for (let i = 0; i < 10; i++) h.avancar(l);
    expect(h.perigo(0), 'fim do round').toBe(0);
    const h2 = new HudRitmo();
    const l2 = luta();
    l2.fighters[0].hp = 0;
    for (let i = 0; i < 10; i++) h2.avancar(l2);
    expect(h2.perigo(0), 'morto não avisa').toBe(0);
    const h3 = new HudRitmo();
    const l3 = luta();
    (l3 as { training: boolean }).training = true;
    l3.fighters[1].hp = 5;
    for (let i = 0; i < 10; i++) h3.avancar(l3);
    expect(h3.perigo(1), 'treino não avisa').toBe(0);
  });
  it('chefão: vale a barra ATUAL (hp/maxHp da barra), não a vida total', () => {
    const h = new HudRitmo();
    const l = luta();
    Object.assign(l.fighters[1], { barras: 2, barrasMax: 3, hp: 90, maxHp: 100 });
    for (let i = 0; i < 10; i++) h.avancar(l);
    expect(h.perigo(1)).toBe(0);
    l.fighters[1].hp = 20;
    for (let i = 0; i < 10; i++) h.avancar(l);
    expect(h.perigo(1)).toBe(1);
  });
});

describe('HudRitmo: desenho', () => {
  it('sem combo, nota nem perigo não pinta NADA', () => {
    const h = new HudRitmo();
    const l = luta();
    h.avancar(l);
    const { ctx, chamadas } = gravador();
    h.desenharCombos(ctx, l);
    h.desenharPerigo(ctx);
    expect(chamadas).toEqual([]);
  });
  it('o HUD inteiro, sem nada novo na tela, é idêntico com e sem o HudRitmo (a flag ligada não mexe no HUD de sempre)', () => {
    const l = luta();
    const a = gravador();
    desenharHUD(a.ctx, l, elenco, {});
    const h = new HudRitmo();
    h.avancar(l);
    const b = gravador();
    desenharHUD(b.ctx, l, elenco, { ritmo: h });
    expect(b.chamadas).toEqual(a.chamadas);
    expect(a.chamadas.length).toBeGreaterThan(50);
  });
  it('com combo de 2 acertos e o tranco já passado, o contador é o de sempre', () => {
    const l = luta();
    emCombo(l, 0, 2, 7);
    const h = new HudRitmo();
    for (let i = 0; i < TICKS_DO_TRANCO + 2; i++) h.avancar(l);
    const com = gravador();
    h.desenharCombos(com.ctx, l);
    expect(com.chamadas.join('|')).toContain('fillText(2 HITS');
    expect(com.chamadas.join('|')).toContain('fillText(DANO 7');
  });
  it('o contador cresce com o tranco de cada acerto e a cor muda de patamar', () => {
    const l = luta();
    const h = new HudRitmo();
    emCombo(l, 0, 2);
    for (let i = 0; i < 20; i++) h.avancar(l);
    const base = gravador();
    h.desenharCombos(base.ctx, l);
    emCombo(l, 0, 3);
    h.avancar(l);
    const pop = gravador();
    h.desenharCombos(pop.ctx, l);
    const escala = (c: string[]): number => Number(/scale\(([\d.]+),/.exec(c.find((x) => x.startsWith('scale('))!)![1]);
    expect(escala(pop.chamadas), 'acerto novo: maior que o de repouso').toBeGreaterThan(escala(base.chamadas) + 0.1);
    for (let i = 0; i < TICKS_DO_TRANCO; i++) h.avancar(l);
    const repouso = gravador();
    h.desenharCombos(repouso.ctx, l);
    expect(escala(repouso.chamadas)).toBeLessThan(escala(pop.chamadas));
    expect(repouso.chamadas.join('|')).not.toEqual(base.chamadas.join('|'));
  });
  it('a nota aparece ao lado do contador, espelhada para P2, e o DANGER fica do lado certo', () => {
    const l = luta();
    const h = new HudRitmo();
    emCombo(l, 0, 6, 10);
    h.avancar(l);
    solta(l, 0);
    h.avancar(l);
    for (let i = 0; i < 12; i++) h.avancar(l);
    const g = gravador();
    h.desenharCombos(g.ctx, l);
    const txt = g.chamadas.filter((c) => c.startsWith('translate(') || c.startsWith('fillText('));
    expect(g.chamadas.join('|')).toContain('fillText(ÓTIMO!');
    const xs = g.chamadas.filter((c) => c.startsWith('translate(')).map((c) => Number(/translate\(([\d.]+),/.exec(c)![1]));
    expect(xs[0], 'contador na margem esquerda').toBe(24);
    expect(xs[2], 'a nota vem depois do contador, ainda no lado esquerdo').toBeGreaterThan(24 + 60);
    expect(xs[2]).toBeLessThan(LARGURA / 2);
    expect(txt.length).toBeGreaterThan(0);

    const l2 = luta();
    l2.fighters[1].hp = 10;
    const h2 = new HudRitmo();
    for (let i = 0; i < 12; i++) h2.avancar(l2);
    const d = gravador();
    h2.desenharPerigo(d.ctx);
    expect(d.chamadas.join('|')).toContain('fillText(DANGER');
    expect(d.chamadas).toContain(`translate(${LARGURA - 24},146)`);
    expect(d.chamadas).toContain('=textAlign:right');
  });
  it('o DANGER pulsa devagar (o período é de pelo menos meio segundo) e desce quando há contador do mesmo lado', () => {
    expect(PERIODO_PERIGO).toBeGreaterThanOrEqual(30);
    const l = luta();
    l.fighters[0].hp = 10;
    const h = new HudRitmo();
    for (let i = 0; i < 12; i++) h.avancar(l);
    const sozinho = gravador();
    h.desenharPerigo(sozinho.ctx);
    expect(sozinho.chamadas).toContain('translate(24,146)');
    emCombo(l, 0, 4);
    for (let i = 0; i < 10; i++) h.avancar(l);
    const ao_lado = gravador();
    h.desenharPerigo(ao_lado.ctx);
    expect(ao_lado.chamadas).toContain('translate(24,218)');
  });
  it('zerar() apaga tudo (nova luta)', () => {
    const l = luta();
    l.fighters[0].hp = 10;
    emCombo(l, 0, 5);
    const h = new HudRitmo();
    for (let i = 0; i < 8; i++) h.avancar(l);
    solta(l, 0);
    h.avancar(l);
    expect(h.algoVisivel).toBe(true);
    h.zerar();
    expect(h.algoVisivel).toBe(false);
  });
});
