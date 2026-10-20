import { describe, expect, it } from 'vitest';
import type { IdLutador, InputFrame } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { sonsDoEvento } from '../../src/audio/eventos';
import { Game, type DummyTreino, type FonteEntradas } from '../../src/fight/game';
import { TEM_PROTOTIPO, type Obj } from './_prototipo';
import { criarGabarito, type Gabarito } from './_prototipo-luta';
import { montarTodos } from './_lutadores';

/**
 * Prova de fidelidade da LUTA (nível: executado contra o protótipo real). O gabarito é o próprio
 * Fighter/Game/cpuInput do protótipo rodando no Node com RNG de semente e AudioSys gravador. Os dois
 * recebem as mesmas entradas e são comparados TODO tick: estado dos lutadores, partida, projéteis,
 * pose e a sequência de sons (o que o protótipo tocava == o que os eventos mandam tocar).
 */
const BOTOES = ['lp', 'hp', 'lk', 'hk', 'sp'] as const;

/** Entradas humanas roteirizadas: direções seguradas por trechos, botões como borda de 1 tick. */
function roteiro(semente: number): () => { p1: InputFrame; p2: InputFrame } {
  const rng = criarRng(semente);
  const estado = [0, 1].map(() => ({ ate: 0, esq: false, dir: false, cima: false, baixo: false }));
  const gerar = (i: number): InputFrame => {
    const e = estado[i] as (typeof estado)[number];
    if (e.ate <= 0) {
      e.ate = 4 + rng.inteiro(22);
      const r = rng.proximo();
      e.esq = r < 0.3;
      e.dir = r >= 0.3 && r < 0.65;
      e.cima = rng.proximo() < 0.08;
      e.baixo = rng.proximo() < 0.18;
    }
    e.ate--;
    const f: InputFrame = { left: e.esq, right: e.dir, up: e.cima, down: e.baixo, lp: false, hp: false, lk: false, hk: false, sp: false };
    if (rng.proximo() < 0.12) f[rng.escolher(BOTOES)] = true;
    // toque duplo ocasional para disparar dash
    if (rng.proximo() < 0.01) f.right = !f.right;
    return f;
  };
  return () => ({ p1: gerar(0), p2: gerar(1) });
}

const CAMPOS_LUTADOR = [
  'x', 'y', 'vx', 'vy', 'facing', 'hp', 'hpShown', 'en', 'state', 'st', 'age', 'move', 'mt', 'atkId', 'stun', 'hitDone',
  'connected', 'shots', 'airUsed', 'armor', 'rep', 'lagR', 'walkDist', 'dashDir', 'dashLen', 'jdir', 'hitCount', 'lastHitMt',
  'hitKind', 'crouching', 'holdBack', 'flash', 'invuln', 'phase', 'gotHits', 'dmgTaken', 'maxCombo', 'comboDmg', 'score', 'wins',
] as const;

function instantaneo(game: Obj, pose: (f: Obj) => unknown, eMeu: boolean): Obj {
  const lut = (f: Obj, combo: Obj): Obj => {
    const o: Obj = {};
    for (const c of CAMPOS_LUTADOR) o[c] = f[c];
    o['pose'] = pose(f);
    o['trail'] = (f['trail'] as Obj[]).map((t) => ({ x: t['x'], y: t['y'], name: t['name'], f: t['f'], life: t['life'] }));
    o['combo'] = { hits: combo['hits'], dmg: combo['dmg'], t: combo['t'] };
    o['buf'] = f['buf'];
    o['hist'] = f['hist'];
    o['lastTap'] = f['lastTap'];
    return o;
  };
  const idxVencedor = (w: Obj | number | null): number | null => (w === null ? null : typeof w === 'number' ? w : (w['side'] as number) - 1);
  const proj = (game['projectiles'] as Obj[]).map((p) => ({
    id: p['id'], x: p['x'], y: p['y'], vx: p['vx'], dir: p['dir'], life: p['life'], frame: p['frame'], sc: p['sc'], sy: p['sy'], style: p['style'], acc: p['acc'], kd: p['kd'],
  }));
  void eMeu;
  return {
    p1: lut(game['p1'] as Obj, (eMeu ? (game['p1'] as Obj)['combo'] : game['combo1']) as Obj),
    p2: lut(game['p2'] as Obj, (eMeu ? (game['p2'] as Obj)['combo'] : game['combo2']) as Obj),
    phase: game['phase'], t: game['t'], timeLeft: game['timeLeft'], round: game['round'], shake: game['shake'], hitstop: game['hitstop'],
    cam: { z: (game['cam'] as Obj)['z'], x: (game['cam'] as Obj)['x'] },
    winner: idxVencedor(game['winner'] as Obj | number | null), perfect: game['perfect'], matchDone: game['matchDone'],
    matchWinner: idxVencedor(game['matchWinner'] as Obj | number | null), trainInfo: game['trainInfo'], projectiles: proj,
  };
}

type Cenario = {
  nome: string;
  seed: number;
  c1: IdLutador;
  c2: IdLutador;
  modo: 'versus' | 'cpu' | 'cpucpu' | 'training';
  niveis: [number, number];
  ticks: number;
  ajustes: { rounds: number; time: number; shake: boolean };
};

const IDS_PROTO: Record<IdLutador, string> = { hayato: 'f1', 'wei-long': 'f2', 'min-ji': 'f3', caio: 'f4' };
const todos = TEM_PROTOTIPO ? montarTodos() : null;

const cenarios: Cenario[] = [];
const ROSTER_IDS: IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];
for (let i = 0; i < 12; i++) {
  const modo = (['versus', 'versus', 'cpu', 'cpucpu', 'training', 'cpucpu'] as const)[i % 6] as Cenario['modo'];
  cenarios.push({
    nome: `${modo} #${i}`,
    seed: 1000 + i * 17,
    c1: ROSTER_IDS[i % 4] as IdLutador,
    c2: ROSTER_IDS[(i + 1 + Math.floor(i / 4)) % 4] as IdLutador,
    modo,
    niveis: [i % 3, (i + 1) % 3],
    ticks: modo === 'training' ? 3000 : 5200,
    ajustes: { rounds: 2 + (i % 2), time: i % 2 ? 12 : 20, shake: i % 4 !== 3 },
  });
}

// Lutas longas e agressivas (CPU difícil, tempo cheio): chegam a KO, armadura e fim de luta.
for (let i = 0; i < 8; i++) {
  cenarios.push({
    nome: `longa #${i}`,
    seed: 5000 + i * 31,
    c1: ROSTER_IDS[i % 4] as IdLutador,
    c2: ROSTER_IDS[(i + 2 + (i >> 2)) % 4] as IdLutador,
    modo: 'cpucpu',
    niveis: [2, i % 2 ? 2 : 1],
    ticks: 9000,
    ajustes: { rounds: 2, time: 99, shake: true },
  });
}

describe.skipIf(!TEM_PROTOTIPO)('src/fight == protótipo (lock-step, tick a tick)', () => {
  const cobertura = new Map<string, number>();

  it.each(cenarios)('$nome: $c1 x $c2 ($ticks ticks, seed $seed)', (c) => {
    const ajustesProto = { ...c.ajustes, music: 0.45, sfx: 0.8, diff: 1 };
    const g: Gabarito = criarGabarito(c.seed, ajustesProto);
    const rngLogica: Rng = criarRng(c.seed);
    const game = new Game({ lutadores: todos as NonNullable<typeof todos>, rng: rngLogica });
    const gerar = roteiro(c.seed + 7);
    let atual = gerar();
    const fonte: FonteEntradas = { p1: () => atual.p1, p2: () => atual.p2 };

    const cfgProto: Obj = { mode: c.modo === 'cpucpu' ? 'cpu' : c.modo, c1: IDS_PROTO[c.c1], c2: IDS_PROTO[c.c2] };
    const cfgMeu: Obj = { mode: c.modo === 'cpucpu' ? 'cpu' : c.modo, c1: c.c1, c2: c.c2 };
    if (c.modo === 'cpu') {
      cfgProto['cpu'] = cfgMeu['cpu'] = c.niveis[0];
    } else if (c.modo === 'cpucpu') {
      cfgProto['cpu'] = cfgMeu['cpu'] = c.niveis[0];
      cfgProto['p1cpu'] = cfgMeu['p1cpu'] = c.niveis[1];
    }
    // o protótipo guarda a CPU como {level}
    const protoCfg = { ...cfgProto, cpu: cfgProto['cpu'] != null ? cfgProto['cpu'] : undefined, p1cpu: cfgProto['p1cpu'] };
    g.game['setup'](protoCfg);
    const protoSetup = ((): void => {})();
    void protoSetup;
    game.setup(cfgMeu as Parameters<Game['setup']>[0], { ...c.ajustes });

    const dummies: DummyTreino[] = ['stand', 'crouch', 'block', 'crouchblock', 'jump', 'cpu'];
    const protoPose = (f: Obj): unknown => f['poseT']();
    const meuPose = (f: Obj): unknown => f['pose'];
    for (let tick = 0; tick < c.ticks; tick++) {
      atual = gerar();
      Object.assign(g.entradas.p1, atual.p1);
      Object.assign(g.entradas.p2, atual.p2);
      if (c.modo === 'training' && tick % 450 === 300) {
        const d = dummies[(tick / 450) % dummies.length | 0] as DummyTreino;
        g.game['dummy'] = d;
        (g.game['p2'] as Obj)['cpu'] = d === 'cpu' ? { level: 1 } : null;
        game.trocarAlvoDoTreino(d);
      }
      g.game['update']();
      game.update(fonte);

      const esperado = instantaneo(g.game, protoPose, false);
      const obtido = instantaneo(game as unknown as Obj, meuPose, true);
      const a = JSON.stringify(esperado);
      const b = JSON.stringify(obtido);
      if (a !== b) {
        const ka = Object.keys(esperado).find((k) => JSON.stringify(esperado[k]) !== JSON.stringify(obtido[k]));
        const sub = ka === 'p1' || ka === 'p2'
          ? Object.keys(esperado[ka]).find((k) => JSON.stringify(esperado[ka][k]) !== JSON.stringify(obtido[ka][k]))
          : undefined;
        throw new Error(`divergiu no tick ${tick}: ${ka}${sub ? '.' + sub : ''}: esperado ${JSON.stringify(sub ? esperado[ka as string][sub] : esperado[ka as string])} obtido ${JSON.stringify(sub ? obtido[ka as string][sub] : obtido[ka as string])}`);
      }
      const somProto = g.sons().map((s) => JSON.stringify(s));
      const somMeu = game.events.flatMap((e) => sonsDoEvento(e)).map((s) => JSON.stringify([s.metodo, ...s.args]));
      if (JSON.stringify(somProto) !== JSON.stringify(somMeu)) {
        throw new Error(`sons divergiram no tick ${tick}: esperado ${somProto.join(' ')} obtido ${somMeu.join(' ')}`);
      }
      for (const e of game.events) cobertura.set(e.tipo, (cobertura.get(e.tipo) ?? 0) + 1);
      for (const e of game.events) if (e.tipo === 'round') cobertura.set('round:' + e.fase, (cobertura.get('round:' + e.fase) ?? 0) + 1);
      for (const e of game.events) if (e.tipo === 'hit' && e.projetil) cobertura.set('hit:projetil', (cobertura.get('hit:projetil') ?? 0) + 1);
      for (const e of game.events) if (e.tipo === 'hit' && e.contragolpe) cobertura.set('hit:contragolpe', (cobertura.get('hit:contragolpe') ?? 0) + 1);
    }
    expect(game.tick).toBeGreaterThan(0);
  });

  it('a bateria cobre os caminhos que importam (não é um teste vazio)', () => {
    console.log(JSON.stringify([...cobertura]));
    for (const k of ['swing', 'special', 'jump', 'land', 'dust', 'projectile', 'block', 'hit', 'ko', 'round:start', 'round:fight', 'round:end', 'hit:projetil', 'throw', 'clash', 'armor', 'perfect', 'round:timeover', 'hit:contragolpe']) {
      expect(cobertura.get(k) ?? 0, `cobertura de ${k}`).toBeGreaterThan(0);
    }
  });
});
