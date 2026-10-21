import { describe, expect, it } from 'vitest';
import type { ArteLutador, Elenco } from '../../src/assets/elenco';
import type { EventoLuta, LeituraLuta, LutadorLeitura, ProjetilLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { Efeitos, projetilParaVisual } from '../../src/render/efeitos';
import { desenharHUD, desenharOverlay } from '../../src/render/hud';
import { desenharPose } from '../../src/render/pose';
import { desenharRastroGolpe } from '../../src/render/rastro-golpe';
import type { Ctx } from '../../src/render/tela';

/** Contexto 2D falso que grava chamadas ([nome, ...args]) e atribuições (['=nome', valor]). */
function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return (...a: unknown[]) => {
          chamadas.push([nome, ...a]);
          return { addColorStop: () => undefined };
        };
      }
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, valor]);
      return true;
    },
  }) as unknown as Ctx;
  const textos = () => chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t));
  return { ctx, chamadas, textos, chamou: (n: string) => chamadas.filter(([c]) => c === n).length };
}

// ---- fixtures ----
const pose = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 } as const;
const combo0 = { hits: 0, dmg: 0, t: 0 };

function lutador(extra: Partial<LutadorLeitura> = {}): LutadorLeitura {
  return {
    id: 'hayato', indice: 0, x: 300, y: 470, facing: 1, state: 'idle', pose, move: null, mt: 0,
    hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0,
    dmgTaken: 0, combo: combo0, trail: [], cpu: null,
    barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  };
}

function luta(extra: Partial<LeituraLuta> = {}, a: Partial<LutadorLeitura> = {}, b: Partial<LutadorLeitura> = {}): LeituraLuta {
  return {
    fighters: [lutador(a), lutador({ id: 'wei-long', indice: 1, x: 660, facing: -1, ...b })],
    projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2, cam: { z: 1, x: 480 }, phase: 'fight', t: 100,
    tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp', winner: null, matchWinner: null,
    matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [], ...extra,
  };
}

const quadro = (x: number, y: number, w: number, h: number, ax: number, tip?: [number, number]) => ({
  x, y, w, h, ax, ...(tip ? { tipX: tip[0], tipY: tip[1] } : {}),
});
const poses: Poses = {
  guard: quadro(8, 8, 289, 410, 137),
  idle0: quadro(8, 8, 289, 410, 137),
  punch: quadro(300, 8, 380, 420, 168, [134, 187]),
  kick: quadro(700, 8, 400, 420, 160, [150, 150]),
  sweep: quadro(1100, 8, 400, 300, 160, [160, 40]),
  special: quadro(1500, 8, 400, 420, 160, [150, 177]),
  crouch: quadro(8, 500, 200, 300, 100),
};
const hayato = montarLutador(LUTADORES.hayato, poses);
const wei = montarLutador(LUTADORES['wei-long'], poses);
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const SIL = { tag: 'silhueta' } as unknown as CanvasImageSource;
const arteFalsa: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => SIL, retrato: () => null };
const elenco = {
  hayato: { ch: hayato, arte: arteFalsa },
  'wei-long': { ch: wei, arte: arteFalsa },
} as unknown as Elenco;

describe('desenharPose', () => {
  it('desenha o quadro escolhido pelo getPD (alias/fallback) com K e âncora', () => {
    const g = gravador();
    desenharPose(g.ctx, hayato, arteFalsa, 'lp1', 100, 470, 1, -1);
    // lp1 -> alias punch no atlas de teste
    const draw = g.chamadas.find(([n]) => n === 'drawImage')!;
    const K = hayato.K;
    expect(draw.slice(2)).toEqual([300, 8, 380, 420, -168 * K, -420 * K, 380 * K, 420 * K]);
    expect(g.chamadas.some(([n, ...a]) => n === 'translate' && a[0] === 100 && a[1] === 470)).toBe(true);
    expect(g.chamadas.some(([n, ...a]) => n === 'scale' && a[0] === -1 && a[1] === 1)).toBe(true);
  });

  it('a silhueta branca só entra com branco > 0 (flash sob demanda)', () => {
    let pedidas = 0;
    const arte: ArteLutador = { ...arteFalsa, silhuetaDe: () => (pedidas++, SIL) };
    const g = gravador();
    desenharPose(g.ctx, hayato, arte, 'idle0', 0, 0, 1);
    expect(pedidas).toBe(0);
    expect(g.chamou('drawImage')).toBe(1);
    desenharPose(g.ctx, hayato, arte, 'idle0', 0, 0, 1, 1, 1, 0.5);
    expect(pedidas).toBe(1);
  });

  it('atlas ainda não carregado (arte nula): não desenha nem quebra', () => {
    const g = gravador();
    const sem: ArteLutador = { pronta: false, imagemDe: () => null, silhuetaDe: () => null, retrato: () => null };
    expect(() => desenharPose(g.ctx, hayato, sem, 'idle0', 0, 0, 1, 1, 1, 0.5)).not.toThrow();
    expect(g.chamadas).toEqual([]);
  });

  it('pose inexistente cai na cadeia de fallback em vez de quebrar', () => {
    const g = gravador();
    expect(() => desenharPose(g.ctx, hayato, arteFalsa, 'pose-que-nao-existe', 0, 0, 1)).not.toThrow();
  });
});

describe('desenharRastroGolpe (D2: único rastro de golpe)', () => {
  const emGolpe = (move: string, mt: number) => lutador({ state: 'move', move, mt });

  it('nada fora de um golpe, na preparação, ou em magia (projétil/lag)', () => {
    for (const f of [lutador(), emGolpe('hp', 3), emGolpe('sFire', 20), emGolpe('_lag', 5), emGolpe('inexistente', 9), lutador({ state: 'move', move: null })]) {
      const g = gravador();
      desenharRastroGolpe(g.ctx, f, hayato);
      expect(g.chamadas, `${f.move}`).toEqual([]);
    }
  });

  it('soco: 5 faixas na fase ativa; rasteira: 3 faixas; chute: 3 arcos', () => {
    const soco = gravador();
    desenharRastroGolpe(soco.ctx, emGolpe('hp', hayato.moves.hp.S + 1), hayato);
    expect(soco.chamou('stroke')).toBe(5);
    const rasteira = gravador();
    desenharRastroGolpe(rasteira.ctx, emGolpe('chk', hayato.moves.chk.S + 1), hayato);
    expect(rasteira.chamou('stroke')).toBe(3);
    const chute = gravador();
    desenharRastroGolpe(chute.ctx, emGolpe('hk', hayato.moves.hk.S + 1), hayato);
    expect(chute.chamou('arc')).toBe(3);
  });

  it('some na recuperação: 0,55 - (into - A)/12 chega a zero', () => {
    const mv = hayato.moves.hp;
    const fim = gravador();
    desenharRastroGolpe(fim.ctx, emGolpe('hp', mv.S + mv.A + 7), hayato);
    expect(fim.chamadas).toEqual([]);
  });

  it('chute para a esquerda espelha o arco', () => {
    const dir = gravador();
    const esq = gravador();
    desenharRastroGolpe(dir.ctx, { ...emGolpe('hk', hayato.moves.hk.S + 1), facing: 1 }, hayato);
    desenharRastroGolpe(esq.ctx, { ...emGolpe('hk', hayato.moves.hk.S + 1), facing: -1 }, hayato);
    const a1 = dir.chamadas.find(([n]) => n === 'arc')!;
    const a2 = esq.chamadas.find(([n]) => n === 'arc')!;
    expect(a1[1]).toBe(300);
    expect(a2[4]).toBeCloseTo(Math.PI - (a1[5] as number), 9); // inicio = PI - fim original
  });
});

describe('projetilParaVisual (adaptador ProjetilLeitura -> ProjetilVisual)', () => {
  const p: ProjetilLeitura = { id: 1, x: 10, y: 20, vx: -5, dir: -1, dono: 1, style: 'boomerang', sc: 1.05, sy: 0.5, frame: 7 };
  it('copia posição, escala, estilo e quadro; cores vêm do dono', () => {
    const cores = LUTADORES.caio.fire;
    expect(projetilParaVisual(p, cores)).toEqual({ x: 10, y: 20, sc: 1.05, sy: 0.5, frame: 7, estilo: 'boomerang', vx: -5, dir: -1, cores });
    expect(cores).toEqual(['#c8ff3a', '#fffde0', '#2fb52f']);
  });
});

describe('Efeitos.reagir (receitas dos eventos C3)', () => {
  const texto = { x: 5, y: 6, s: 'BLOQUEOU', col: '#9ad8ff', size: 18 };
  it('hit: 18 faíscas na cor do golpe, rajada (grande se pedido) e texto COUNTER', () => {
    const e = new Efeitos(criarRng(1));
    const ev: EventoLuta = {
      tipo: 'hit', atacante: 0, defensor: 1, x: 100, y: 200, cor: '#ffd84a', grande: true, snd: 'punch', pitch: 1,
      contragolpe: true, projetil: false, acertos: 1, texto: { x: 100, y: 160, s: 'COUNTER!', col: '#ff9a3a', size: 24 },
    };
    e.reagir(ev);
    expect(e.particulas).toHaveLength(18);
    expect(e.particulas.every((p) => p.col === '#ffd84a' || p.col === '#fff')).toBe(true);
    expect(e.impactos).toHaveLength(1);
    expect(e.impactos[0]).toMatchObject({ big: true, max: 14, col: '#ffd84a' });
    expect(e.textos).toHaveLength(1);
    expect(e.textos[0]).toMatchObject({ s: 'COUNTER!', size: 24, life: 50 });
  });

  it('block: 8 faíscas azuis + escudo (blk, dir) + texto opcional', () => {
    const e = new Efeitos(criarRng(1));
    e.reagir({ tipo: 'block', atacante: 0, defensor: 1, x: 1, y: 2, dir: -1, texto });
    expect(e.particulas).toHaveLength(8);
    expect(e.impactos[0]).toMatchObject({ blk: true, dir: -1, max: 9 });
    expect(e.textos).toHaveLength(1);
    const sem = new Efeitos(criarRng(1));
    sem.reagir({ tipo: 'block', atacante: 0, defensor: 1, x: 1, y: 2, dir: 1, texto: null });
    expect(sem.textos).toHaveLength(0);
  });

  it('clash: 22 faíscas brancas + rajada grande; armor: 10 + rajada pequena; throw: só texto', () => {
    const e = new Efeitos(criarRng(1));
    e.reagir({ tipo: 'clash', x: 5, y: 5 });
    expect(e.particulas).toHaveLength(22);
    expect(e.impactos[0]).toMatchObject({ big: true });
    const a = new Efeitos(criarRng(1));
    a.reagir({ tipo: 'armor', atacante: 0, defensor: 1, x: 1, y: 1, snd: 'kick', texto });
    expect(a.particulas).toHaveLength(10);
    expect(a.impactos[0]).toMatchObject({ big: false, max: 10 });
    const t = new Efeitos(criarRng(1));
    t.reagir({ tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto });
    expect(t.particulas).toHaveLength(0);
    expect(t.textos).toHaveLength(1);
  });

  it('dust vira poeira; eventos sem efeito visual não fazem nada', () => {
    const e = new Efeitos(criarRng(1));
    e.reagir({ tipo: 'dust', x: 300, n: 4, power: 1.4 });
    expect(e.particulas).toHaveLength(4);
    for (const ev of [{ tipo: 'jump', lutador: 0 }, { tipo: 'ko', defensor: 1, pitch: 1 }, { tipo: 'perfect', vencedor: 0 }] as EventoLuta[]) e.reagir(ev);
    expect(e.particulas).toHaveLength(4);
    expect(e.impactos).toHaveLength(0);
  });
});

describe('HUD e faixas (texto por fase)', () => {
  it('overlay: ROUND no início, FIGHT! logo depois, K.O., tempo esgotado', () => {
    const textos = (l: LeituraLuta) => {
      const g = gravador();
      desenharOverlay(g.ctx, l, elenco);
      return g.textos();
    };
    expect(textos(luta({ phase: 'intro', t: 10, round: 2 }))).toEqual(['ROUND 2']);
    expect(textos(luta({ phase: 'intro', t: 76 }))).toEqual([]);
    expect(textos(luta({ phase: 'fight', t: 10 }))).toEqual(['FIGHT!']);
    expect(textos(luta({ phase: 'fight', t: 45 }))).toEqual([]);
    expect(textos(luta({ phase: 'ko', t: 5 }))).toEqual(['K.O.']);
    expect(textos(luta({ phase: 'timeover', t: 5 }))).toEqual(['TEMPO ESGOTADO']);
  });

  it('overlay: vencedor, empate, PERFECT depois de 8 ticks e VITÓRIA FINAL depois de 50', () => {
    const textos = (l: LeituraLuta) => {
      const g = gravador();
      desenharOverlay(g.ctx, l, elenco);
      return g.textos();
    };
    expect(textos(luta({ phase: 'roundend', t: 5, winner: 1 }))).toEqual(['WEI LONG VENCE!']);
    expect(textos(luta({ phase: 'roundend', t: 5, winner: null }))).toEqual(['EMPATE!']);
    expect(textos(luta({ phase: 'roundend', t: 9, winner: 0, perfect: true }))).toEqual(['HAYATO VENCE!', 'PERFECT!']);
    expect(textos(luta({ phase: 'matchend', t: 51, winner: 0 }))).toEqual(['HAYATO VENCE!', 'VITÓRIA FINAL']);
    expect(textos(luta({ phase: 'matchend', t: 20, winner: 0 }))).toEqual(['HAYATO VENCE!']);
  });

  it('overlay de treino: só TREINO na abertura', () => {
    const g = gravador();
    desenharOverlay(g.ctx, luta({ training: true, phase: 'intro', t: 3 }), elenco);
    expect(g.textos()).toEqual(['TREINO']);
    const h = gravador();
    desenharOverlay(h.ctx, luta({ training: true, phase: 'ko', t: 3 }), elenco);
    expect(h.textos()).toEqual([]);
  });

  it('HUD: nomes, 1P/CPU com placar, cronômetro (∞ no treino), combo e painel de treino', () => {
    const g = gravador();
    desenharHUD(g.ctx, luta({ timer: 7 }, { score: 1234, combo: { hits: 3, dmg: 24.6, t: 30 } }, { cpu: 0 }), elenco);
    const t = g.textos();
    expect(t).toEqual(expect.arrayContaining(['HAYATO', 'WEI LONG', '1P  001234', '000000  CPU', '07', 'KO', 'SUPER', '3 HITS', 'DANO 25']));
    expect(t.filter((x) => x === 'SUPER')).toHaveLength(2);
    expect(t).not.toContain('MODO TREINO');

    const tr = gravador();
    desenharHUD(tr.ctx, luta({ training: true, timerMax: 0, timer: 0, trainInfo: { hits: 1, dmg: 8.4 } }), elenco, { alvoTreino: 'block' });
    const tt = tr.textos();
    expect(tt).toEqual(expect.arrayContaining(['∞', 'MODO TREINO', 'Último combo: 1 golpe — 8 de dano', 'Alvo: BLOQUEANDO (EM PÉ)']));
  });

  it('HUD: bolinhas de round só fora do treino, uma por round necessário', () => {
    const conta = (l: LeituraLuta) => {
      const g = gravador();
      desenharHUD(g.ctx, l, elenco);
      return g.chamadas.filter(([n, , , r]) => n === 'arc' && r === 7).length;
    };
    expect(conta(luta({ winsNeeded: 2 }))).toBe(4);
    expect(conta(luta({ winsNeeded: 3 }))).toBe(6);
    expect(conta(luta({ training: true }))).toBe(0);
  });

});
