import { GROUND, LARGURA } from '../core/constantes';
import type { InputFrame } from '../core/contratos';
import type { Rng } from '../core/rng';
import type { NomeGolpe, PapelIa } from '../data/tipos';
import type { Fighter, PlanoIa } from './fighter';
import type { ProjetilLuta } from './projetil';

/** Níveis da CPU (AI_LEVELS do protótipo, linhas 925-929). `diff` das configurações = índice aqui. */
export const AI_LEVELS = [
  { name: 'FÁCIL', desc: 'Reage devagar e erra muito. Para aprender os golpes.', think: 24, react: 0.35, block: 0.3, aggr: 0.5, fire: 0.1, anti: 0.1, combo: 0.15 },
  { name: 'NORMAL', desc: 'Equilibrada. Bloqueia, usa especiais e encadeia golpes.', think: 14, react: 0.65, block: 0.6, aggr: 0.8, fire: 0.22, anti: 0.4, combo: 0.5 },
  { name: 'DIFÍCIL', desc: 'Rápida, agressiva e punitiva. Só para veteranos.', think: 8, react: 0.92, block: 0.88, aggr: 1, fire: 0.3, anti: 0.75, combo: 0.85 },
] as const;

/** Os números que a CPU usa para decidir (o que `AI_LEVELS[n]` tem, sem nome nem descrição). */
export type PerfilCpu = { think: number; react: number; block: number; aggr: number; fire: number; anti: number; combo: number };

/**
 * IA do CHEFE (docs/mecanicas-e3.md §3.5). Fica FORA de `AI_LEVELS` porque essa lista é o menu de dificuldade
 * (`ui/cenas/diff.ts`). É o nível escolhido pelo jogador com um acréscimo; na fase 2 fica no máximo de agressão.
 * Valores de partida: os finais saem do harness (E6) e da sessão do dono.
 */
export const IA_CHEFE = {
  /** Somado a `react` e `block` do nível escolhido (teto 1). */
  bonusReacao: 0.15,
  /** Fase 2: `aggr` fixo neste valor e `anti` somado de `antiExtra` (teto 1). */
  fase2: { aggr: 1, antiExtra: 0.2 },
} as const;

/** Perfil de CPU do chefe para o nível `nivel` (0..2) e a fase (2 = depois da Dança da Águia). */
export function perfilChefe(nivel: number, fase2: boolean): PerfilCpu {
  const base = AI_LEVELS[nivel] ?? AI_LEVELS[0];
  const p: PerfilCpu = {
    think: base.think,
    react: Math.min(1, base.react + IA_CHEFE.bonusReacao),
    block: Math.min(1, base.block + IA_CHEFE.bonusReacao),
    aggr: base.aggr,
    fire: base.fire,
    anti: base.anti,
    combo: base.combo,
  };
  if (fase2) {
    p.aggr = IA_CHEFE.fase2.aggr;
    p.anti = Math.min(1, base.anti + IA_CHEFE.fase2.antiExtra);
  }
  return p;
}

export const NO_INPUT = (): InputFrame => ({ left: false, right: false, up: false, down: false, lp: false, lk: false, hp: false, hk: false, sp: false });

/** O que a CPU precisa enxergar da partida. */
export interface VistaParaCpu {
  readonly projectiles: readonly ProjetilLuta[];
}

type TeclaIa = 'left' | 'right' | 'up' | 'down' | 'lp' | 'lk' | 'hp' | 'hk' | 'sp';

/** Entradas que produzem um golpe (dir = lado do oponente: +1 direita, -1 esquerda). */
export function moveInput(name: NomeGolpe, dir: number): PlanoIa {
  const o: PlanoIa = {};
  if (name === 'throw') {
    o.hp = true;
    if (dir > 0) o.right = true;
    else o.left = true;
    return o;
  }
  if (name[0] === 's') {
    o.sp = true;
    if (name === 'sDown') o.down = true;
    if (name === 'sFwd') {
      if (dir > 0) o.right = true;
      else o.left = true;
    }
    return o;
  }
  if (name[0] === 'c') o.down = true;
  o[name.replace(/^[cj]/, '') as TeclaIa] = true;
  return o;
}

/** Chance (antes de multiplicar por `aggr`) de a CPU usar um golpe com dica quando ele está ao alcance. Valor de partida (E6). */
const CHANCE_DICA = 0.4;
/** Chance (antes de multiplicar por `aggr`) de trocar de ficha quando a atual não serve para a distância. Valor de partida (E6). */
const CHANCE_TROCA = 0.3;
/** Margem da parede em que os lutadores travam (a mesma de `Fighter.physics`). */
const MARGEM_PAREDE = 60;

/**
 * Dicas de CPU (docs/mecanicas-e3.md §2). Devolve um plano pronto ou null (= segue o fluxo normal). CONTRATO: só é
 * chamada para quem tem `dicasIa` (a guarda está em `cpuInput`) e chama `rnd` APENAS depois de decidir que a dica se
 * aplica (golpe pagável, rival dentro do `alcance`): dica fora do alcance também não altera a sequência do RNG.
 *
 * Papéis daqui: `pressao` e `aproximar` (usar o golpe quando o rival está no `alcance`, e, com `espacoAtras`, só se há
 * espaço até a parede de trás; com `segurar`, mantém ESP apertado por N ticks sorteados, o único `rnd` extra) e `troca`
 * (muda de ficha quando a atual não é a preferida para a distância: um `rnd`, só se há o que trocar).
 * `defesa-projetil`, `defesa` e `antiaereo` agem nas reações e no ramo anti-aéreo (`cpuInput`), não aqui.
 */
function planoPorDica(
  me: Fighter,
  distancia: number,
  dir: number,
  L: PerfilCpu,
  rnd: () => number,
): { plano: PlanoIa; segurar: number } | null {
  for (const { golpe, dica } of me.ch.dicasIa) {
    if (dica.papel === 'troca') {
      const pref = dica.preferir;
      if (!pref || !me.canAfford(golpe)) continue;
      const desejada = distancia >= (dica.limite ?? 200) ? pref.distancia : pref.perto;
      if (desejada === me.ficha) continue; // já está na ficha certa para esta distância: nenhum rnd
      if (rnd() >= CHANCE_TROCA * L.aggr) continue;
      return { plano: moveInput(golpe, dir), segurar: 0 };
    }
    if (dica.papel !== 'pressao' && dica.papel !== 'aproximar') continue;
    const [min, max] = dica.alcance ?? [0, Infinity];
    if (distancia < min || distancia > max || !me.canAfford(golpe)) continue;
    // RESORTE: só vale se há corda (parede) suficiente ATRÁS dela para pegar embalo.
    if (dica.espacoAtras !== undefined && espacoAtras(me, dir) < dica.espacoAtras) continue;
    if (rnd() >= CHANCE_DICA * L.aggr) continue;
    const mv = me.ch.moves[golpe];
    let segurar = 0;
    if (dica.segurar && mv.carga) {
      const [a, b] = dica.segurar;
      const n = a + Math.floor(rnd() * (b - a + 1));
      segurar = Math.max(1, mv.S - 2 + n); // o 1º tick já vai no plano; mt = S−1 é o 1º tick de carga
    }
    return { plano: moveInput(golpe, dir), segurar };
  }
  return null;
}

/** Distância (px) de `me` até a margem da parede ATRÁS dela (o lado oposto ao rival, que está na direção `dir`). */
function espacoAtras(me: Fighter, dir: number): number {
  return dir > 0 ? me.x - MARGEM_PAREDE : LARGURA - MARGEM_PAREDE - me.x;
}

/**
 * Um golpe com dica serve para ENCADEAR depois de um acerto? Os de `antiaereo` (erram no chão), `defesa` (PARADE) e `troca`
 * (VADIVU) não; o que exige `espacoAtras` (RESORTE) só com a corda atrás. Sem dica, qualquer golpe serve (nada muda).
 */
function serveParaCombo(me: Fighter, golpe: NomeGolpe, dir: number): boolean {
  const dica = me.ch.moves[golpe].ia;
  if (!dica) return true;
  if (dica.papel === 'antiaereo' || dica.papel === 'defesa' || dica.papel === 'troca') return false;
  return dica.espacoAtras === undefined || espacoAtras(me, dir) >= dica.espacoAtras;
}

/**
 * Golpe com a dica de `papel` que a CPU pode usar agora (pagável e, se a dica tem `alcance` e `distancia` foi dada, com o
 * rival dentro dele), ou null. Só olhado por quem tem `dicasIa`; nunca sorteia.
 */
function golpeComPapel(me: Fighter, papel: PapelIa, distancia?: number): NomeGolpe | null {
  for (const { golpe, dica } of me.ch.dicasIa) {
    if (dica.papel !== papel || !me.canAfford(golpe)) continue;
    if (distancia !== undefined && dica.alcance && (distancia < dica.alcance[0] || distancia > dica.alcance[1])) continue;
    return golpe;
  }
  return null;
}

/**
 * Decide as entradas da CPU neste tick (cpuInput do protótipo, linhas 939-1020). Toda a
 * aleatoriedade vem de `rng` (o RNG da LÓGICA): mesma semente + mesmas entradas = mesma luta.
 * A ordem e a quantidade das chamadas ao RNG são as do protótipo (Math.random).
 */
export function cpuInput(me: Fighter, opp: Fighter, game: VistaParaCpu, rng: Rng): InputFrame {
  const nivel = me.cpu ?? 0;
  // `perfilIa` só existe no chefe (Game.setup); qualquer outro lutador usa a tabela de sempre, sem nenhuma conta nova.
  const L: PerfilCpu = me.perfilIa ?? AI_LEVELS[nivel] ?? AI_LEVELS[0];
  const ai = me.ai;
  const inp = NO_INPUT();
  const M = me.ch.moves;
  const rnd = (): number => rng.proximo();
  const dist = opp.x - me.x;
  const ad = Math.abs(dist);
  const dir = dist >= 0 ? 1 : -1;
  const toward = (p: PlanoIa): void => {
    if (dir > 0) p.right = true;
    else p.left = true;
  };
  const away = (p: PlanoIa): void => {
    if (dir > 0) p.left = true;
    else p.right = true;
  };
  if (me.state !== 'idle' && me.state !== 'walk' && me.state !== 'crouch' && me.state !== 'jump' && me.state !== 'move' && me.state !== 'block' && me.state !== 'hit') return inp;
  // 1) reação a ataques do oponente (uma decisão por golpe)
  const oppMv = opp.state === 'move' ? opp.golpeAtual() : null;
  if (oppMv && oppMv.type !== 'fire' && oppMv.kind !== 'lag' && opp.atkId !== ai.seen && ad < 330) {
    ai.seen = opp.atkId;
    if (rnd() < L.react) {
      if (rnd() < L.block) {
        // Quem tem PARADE (`defesa`) a usa no lugar do bloqueio contra golpe de nível aparável, com a MESMA chance de
        // defender (nenhum rnd a mais; quem a CPU poupa é o `rnd() < 0.3` do agachar, que só o bloqueio sorteia).
        const parada = me.ch.dicasIa.length > 0 && ad < 190 ? golpeComPapel(me, 'defesa') : null;
        const nivelAparavel = parada !== null && !!M[parada].parry?.niveis.includes(oppMv.lvl ?? 'mid');
        if (parada !== null && nivelAparavel) {
          const g = M[parada];
          // espera até a janela ativa da PARADE cobrir o impacto: S do golpe dele (+ o tempo da investida) menos o que já passou
          const viagem = oppMv.type === 'rush' ? Math.max(0, (ad - 70) / Math.max(1, oppMv.vx ?? 1)) : 0;
          const chega = Math.max(0, oppMv.S - opp.mt + Math.floor(viagem));
          ai.reacao = { golpe: parada, espera: Math.max(0, chega - g.S - Math.floor(g.A / 3)) };
        } else {
          ai.hold = oppMv.S + Math.min(oppMv.A, 12) + 8;
          ai.holdInp = { back: true, down: oppMv.lvl === 'low' || (oppMv.lvl === 'mid' && rnd() < 0.3) };
        }
      } else if (rnd() < 0.5 && ad < 190) ai.hold = 0;
    }
  }
  for (const pr of game.projectiles) {
    if (pr.owner === me || ai.seen === 'p' + pr.id) continue;
    if (Math.sign(me.x - pr.x) === Math.sign(pr.vx) && Math.abs(me.x - pr.x) < 320) {
      ai.seen = 'p' + pr.id;
      if (rnd() < L.react) {
        if (pr.spec.low) {
          ai.plan = { up: true, dur: 10 };
          toward(ai.plan);
          ai.t = 10; // tremor baixo: pula por cima
        } else if (rnd() < L.block) {
          // Quem tem escudo (`defesa-projetil`) usa o escudo no lugar do bloqueio, sem sortear nada a mais: a decisão de
          // defender já saiu dos rnd() acima. Espera o projétil chegar para a janela ativa cobrir o impacto.
          const escudo = me.ch.dicasIa.length > 0 ? golpeComPapel(me, 'defesa-projetil') : null;
          if (escudo) {
            const g = M[escudo];
            const chega = (Math.abs(me.x - pr.x) - 60) / Math.max(1, Math.abs(pr.vx));
            ai.reacao = { golpe: escudo, espera: Math.max(0, Math.floor(chega - g.S - g.A / 2)) };
          } else {
            ai.hold = 26;
            ai.holdInp = { back: true, down: false };
          }
        } else {
          ai.plan = { up: true, dur: 10 };
          toward(ai.plan);
          ai.t = 10;
        }
      }
    }
  }
  if (ai.hold > 0 && me.state !== 'move') {
    ai.hold--;
    if (ai.holdInp?.back) away(inp);
    if (ai.holdInp?.down) inp.down = true;
    return inp;
  }
  if (ai.reacao && me.state !== 'move') {
    if (ai.reacao.espera > 0) {
      ai.reacao.espera--;
      return inp;
    }
    Object.assign(inp, moveInput(ai.reacao.golpe, dir));
    ai.reacao = null;
    ai.plan = null;
    ai.t = 0;
    return inp;
  }
  // 2) encadear combos: soco fraco → chute fraco → soco forte → chute forte → especial
  if (me.state === 'move' && me.connected && !me.buf) {
    const cur = me.golpeAtual();
    if (!cur.air && cur.rank < 9 && rnd() < L.combo * 0.09) {
      const candidatos: readonly NomeGolpe[] = ['lp', 'lk', 'hp', 'hk', 'chk', 'sFire', 'sFwd', 'sDown'];
      const pool = candidatos.filter(
        (n) => (M[n].rank > cur.rank || (!!cur.rep && n === me.move && me.rep < 2)) && me.canAfford(n) && serveParaCombo(me, n, dir),
      );
      const specials = pool.filter((n) => n[0] === 's');
      const normals = pool.filter((n) => n[0] !== 's');
      let nm: NomeGolpe | null = null;
      if (specials.length && (!normals.length || rnd() < 0.3 + L.combo * 0.2)) nm = specials[Math.floor(rnd() * specials.length)] ?? null;
      else if (normals.length) {
        normals.sort((a, b) => M[a].rank - M[b].rank);
        nm = rnd() < 0.65 ? (normals[0] ?? null) : (normals[Math.floor(rnd() * normals.length)] ?? null);
      }
      if (nm) {
        Object.assign(inp, moveInput(nm, dir));
        return inp;
      }
    }
  }
  if (me.state === 'move') {
    if (me.crouching || me.golpeAtual().crouch) inp.down = true;
    if (ai.segurar > 0) {
      ai.segurar--;
      inp.spSeg = true; // MASHI: mantém ESP apertado (dica `segurar`)
    }
    return inp;
  }
  ai.segurar = 0;
  // Golpe com dica (`ia`) só entra pelo plug de dicas; os ramos de sempre o tratam como "sem energia". Sem dica, `livre`
  // é exatamente `canAfford` (nenhuma conta nova, nenhum rnd).
  const livre = (n: NomeGolpe): boolean => me.canAfford(n) && !M[n].ia;
  // 3) anti-aéreo
  if (opp.y < GROUND - 50 && ad < 190 && ad > 30 && me.grounded && rnd() < L.anti * 0.25) {
    // Quem tem golpe `antiaereo` (HURACANRANA) usa o dele no lugar do ↓+ESP genérico, sorteando o mesmo `rnd() < 0.5`.
    const aereo = me.ch.dicasIa.length > 0 ? golpeComPapel(me, 'antiaereo', ad) : null;
    if (aereo !== null && rnd() < 0.5) {
      Object.assign(inp, moveInput(aereo, dir));
    } else if (aereo === null && livre('sDown') && rnd() < 0.5) {
      inp.down = true;
      inp.sp = true;
    } else if (rnd() < 0.5) {
      inp.down = true;
      inp.hp = true;
    } else inp.hp = true;
    return inp;
  }
  // 4) continua o plano atual
  if (ai.t > 0 && ai.plan) {
    ai.t--;
    const p = ai.plan;
    inp.left = !!p.left;
    inp.right = !!p.right;
    inp.down = !!p.down;
    inp.up = !!p.up && ai.t > (ai.plan.dur ?? 0) - 2;
    return inp;
  }
  // 5) novo plano
  const plan: PlanoIa = {};
  let dur: number = L.think;
  const r = rnd();
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)] as T;
  const doMove = (n: NomeGolpe): void => {
    Object.assign(plan, moveInput(n, dir));
  };
  if (!me.grounded) return inp;
  // Dicas de CPU (E3): REGRA — só quem declara `ia` num golpe entra aqui; lutador sem dica não chama nada e não gasta
  // RNG. Hoje nenhum papel está implementado (entram em S1b..S5), então isto é só o ponto de plug.
  if (me.ch.dicasIa.length > 0) {
    const porDica = planoPorDica(me, ad, dir, L, rnd);
    if (porDica) {
      // Um tick só: o golpe começa agora, o resto é do estado `move` (e do `segurar`); depois disso, plano novo.
      ai.plan = null;
      ai.t = 0;
      ai.segurar = porDica.segurar;
      for (const k of ['left', 'right', 'up', 'down', 'lp', 'lk', 'hp', 'hk', 'sp'] as const) inp[k] = !!porDica.plano[k];
      if (porDica.segurar > 0) inp.spSeg = true;
      return inp;
    }
  }
  if (ad > 320) {
    if (livre('sFire') && r < L.fire) {
      doMove('sFire');
      dur = 38;
    } else if (r < 0.5) {
      toward(plan);
      dur = 14;
    } else if (r < 0.58 && livre('sFwd')) {
      doMove('sFwd');
      dur = 30;
    } else if (r < 0.7) {
      plan.up = true;
      toward(plan);
      dur = 24;
    } else {
      toward(plan);
      dur = 8;
    }
  } else if (ad > 190) {
    if (r < 0.5 * L.aggr + 0.2) {
      toward(plan);
      dur = 8;
    } else if (r < 0.62) {
      plan.up = true;
      toward(plan);
      dur = 24;
    } else if (r < 0.74) {
      doMove(pick<NomeGolpe>(['hk', 'lk', 'chk']));
      dur = 24;
    } else if (r < 0.8 && livre('sFwd')) {
      doMove('sFwd');
      dur = 30;
    } else if (livre('sFire') && r < 0.8 + L.fire * 0.5) {
      doMove('sFire');
      dur = 36;
    } else {
      away(plan);
      dur = 10;
    }
  } else {
    if (ad < 100 && me.canThrow() && r < 0.12 * L.aggr) {
      doMove('throw');
      dur = 20;
    } else if (r < 0.3 * L.aggr + 0.1) {
      doMove(pick<NomeGolpe>(['lp', 'lp', 'lk', 'hp']));
      dur = 14;
    } else if (r < 0.5) {
      doMove(pick<NomeGolpe>(['lk', 'hk', 'hp']));
      dur = 20;
    } else if (r < 0.6) {
      doMove(pick<NomeGolpe>(['clp', 'chp']));
      dur = 14;
    } else if (r < 0.7) {
      doMove(pick<NomeGolpe>(['clk', 'chk']));
      dur = 26;
    } else if (r < 0.77 && livre('sFwd')) {
      doMove('sFwd');
      dur = 28;
    } else if (r < 0.81 && livre('sDown')) {
      doMove('sDown');
      dur = 34;
    } else if (r < 0.85 && livre('sFire')) {
      doMove('sFire');
      dur = 34;
    } else if (r < 0.92) {
      away(plan);
      dur = 12;
    } else {
      plan.down = true;
      dur = 10;
    }
    dur += Math.floor(rnd() * L.think * 0.5);
  }
  ai.plan = plan;
  ai.t = dur;
  plan.dur = dur;
  for (const k of ['left', 'right', 'up', 'down', 'lp', 'lk', 'hp', 'hk', 'sp'] as const) inp[k] = !!plan[k];
  return inp;
}
