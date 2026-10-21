import { describe, expect, it } from 'vitest';
import type { EventoLuta, IdLutador, InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { ROSTER } from '../../src/data/lutadores';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { montarBaatarChefe } from './_baatar-chefe';
import { montarTodos } from './_lutadores';

/*
 * QA adversarial do BALANÇO da E6b (Íris): procura o que o balanço novo possa ter tornado trivial ou quebrado. Usa os números de PRODUÇÃO
 * (`dadosDeProducao`), não os do oráculo. As taxas de vitória são do harness (`npm run balanco`); aqui só tripwires baratos.
 */
const prod = montarTodos({ dadosDeProducao: true });
/** O elenco de produção com o BAATAR ANTIGO (chefão) de fixtura: a mecânica de chefe do motor segue vigiada até o Zenon entrar. */
const prodComChefe = { ...prod, baatar: montarBaatarChefe() };
const PARADO: InputFrame = { left: false, right: false, up: false, down: false, lp: false, lk: false, hp: false, hk: false, sp: false };
const SEM: FonteEntradas = { p1: () => ({ ...PARADO }), p2: () => ({ ...PARADO }) };

describe('dados de produção: nada trivial nem degenerado', () => {
  const variantes = ROSTER.flatMap((id) => {
    const ch = prod[id];
    return [{ rot: id, v: ch }, ...Object.entries(ch.fichas ?? {}).map(([n, v]) => ({ rot: `${id}/${n}`, v }))];
  });
  const menorBarra = Math.min(...ROSTER.map((id) => prod[id].chefe?.hpPorBarra ?? prod[id].hp), ...ROSTER.map((id) => prod[id].hp));

  it('hp, pow e spd finitos e dentro de uma faixa sã em todas as fichas; 10 lutadores', () => {
    expect(ROSTER).toHaveLength(10);
    for (const { rot, v } of variantes) {
      expect(Number.isFinite(v.hp) && v.hp >= 60 && v.hp <= 160, `${rot} hp ${v.hp}`).toBe(true);
      expect(Number.isFinite(v.pow) && v.pow >= 0.6 && v.pow <= 1.6, `${rot} pow ${v.pow}`).toBe(true);
      expect(Number.isFinite(v.spd) && v.spd > 0.5 && v.spd < 1.6, `${rot} spd ${v.spd}`).toBe(true);
    }
  });

  it('nenhum golpe tira mais de 60% da MENOR barra de vida (hoje a menor vida dos 9) de uma vez, e todo golpe que machuca tem dano > 0', () => {
    let maior = 0;
    for (const { rot, v } of variantes) {
      for (const [nome, mv] of Object.entries(v.moves)) {
        const base = mv.proj ? mv.proj.dmg : mv.agarrao ? mv.agarrao.dmg : mv.dmg;
        if (base === undefined || Number.isNaN(base)) continue; // PARADE, VADIVU e o golpe de recuperação não machucam
        const efetivo = mv.proj ? base : base * v.pow;
        expect(efetivo, `${rot} ${nome} sem dano`).toBeGreaterThan(0);
        maior = Math.max(maior, efetivo);
        expect(efetivo, `${rot} ${nome} dano ${efetivo.toFixed(1)}`).toBeLessThan(menorBarra * 0.6);
      }
    }
    expect(maior).toBeGreaterThan(15); // o teste enxerga os golpes fortes de verdade
  });

  it('o BAATAR é lutador normal (sem chefe nem fichas), com 92 de vida e pow 0,9 (os números da E6b)', () => {
    expect(prod.baatar.chefe).toBeUndefined();
    expect(Object.keys(prod.baatar.fichas)).toEqual([]);
    expect([prod.baatar.hp, prod.baatar.pow]).toEqual([92, 0.9]);
  });
});

describe('lutas CPU x CPU com os dados de produção: sempre terminam, sem KO em 1 golpe e sem acerto de dano zero', () => {
  type Resumo = { fim: boolean; ticks: number; koEmUmGolpe: number; danoZero: number; maiorDano: number; esquivas: number; hits: number };

  function lutar(cfg: ConfigPartida, semente: number, cap = 6000, lutadores = prod): Resumo {
    const g = new Game({ lutadores, rng: criarRng(semente) });
    g.setup(cfg, { rounds: 1, time: 20, shake: true });
    const r: Resumo = { fim: false, ticks: 0, koEmUmGolpe: 0, danoZero: 0, maiorDano: 0, esquivas: 0, hits: 0 };
    for (let t = 0; t < cap && !g.matchDone; t++) {
      const antes = g.fighters.map((f) => ({ hp: f.hp, max: f.maxHp, barras: f.barras }));
      g.update(SEM);
      r.ticks++;
      const ev: EventoLuta[] = g.events;
      for (const e of ev) {
        if (e.tipo === 'esquiva') r.esquivas++;
        if (e.tipo === 'hit' || e.tipo === 'throw') {
          const dano = e.dano ?? 0;
          r.hits++;
          if (!(dano > 0)) r.danoZero++;
          r.maiorDano = Math.max(r.maiorDano, dano);
          const a = antes[e.defensor];
          const nHits = ev.filter((x) => (x.tipo === 'hit' || x.tipo === 'throw') && x.defensor === e.defensor).length;
          if (a && nHits === 1 && a.hp >= a.max - 1e-9 && dano >= a.max - 1e-9) r.koEmUmGolpe++;
        }
      }
    }
    r.fim = g.matchDone;
    return r;
  }

  const ids = [...ROSTER] as IdLutador[];

  it('45 combinações (36 pares + 9 espelhos), DIFÍCIL x DIFÍCIL, esquiva ligada: toda luta chega ao fim, nenhuma por loop', () => {
    let esquivas = 0;
    let hits = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i; j < ids.length; j++) {
        const c1 = ids[i] as IdLutador;
        const c2 = ids[j] as IdLutador;
        const r = lutar({ mode: 'cpu', c1, c2, cpu: 2, p1cpu: 2, esquiva: true }, 100 + i * 10 + j);
        expect(r.fim, `${c1} x ${c2} não terminou em ${r.ticks} ticks`).toBe(true);
        expect(r.koEmUmGolpe, `${c1} x ${c2} KO em 1 golpe`).toBe(0);
        expect(r.danoZero, `${c1} x ${c2} acerto sem dano`).toBe(0);
        expect(r.hits, `${c1} x ${c2} ninguém acertou ninguém`).toBeGreaterThan(0);
        esquivas += r.esquivas;
        hits += r.hits;
      }
    }
    expect(esquivas).toBeGreaterThan(20);
    expect(hits).toBeGreaterThan(200);
  }, 120_000);

  it('os 8 desafiantes contra o CHEFÃO de fixtura (BAATAR antigo; esquiva ligada e desligada): terminam, e o chefão não cai de um golpe nem do nada', () => {
    for (const esquiva of [true, false]) {
      for (const c1 of ids.filter((x) => x !== 'baatar')) {
        const r = lutar({ mode: 'cpu', c1, c2: 'baatar', chefe: true, cpu: 2, p1cpu: 2, esquiva }, 7, 9000, prodComChefe);
        expect(r.fim, `${c1} x chefão (${esquiva}) não terminou em ${r.ticks} ticks`).toBe(true);
        expect(r.koEmUmGolpe).toBe(0);
        expect(r.danoZero).toBe(0);
      }
    }
  }, 120_000);

  it('NORMAL x NORMAL e FÁCIL x FÁCIL também terminam (a CPU que não sorteia esquiva nem pune não trava a luta)', () => {
    for (const nivel of [0, 1]) {
      for (const [c1, c2] of [['hayato', 'wei-long'], ['camille', 'nila'], ['aminu', 'centella']] as const) {
        const r = lutar({ mode: 'cpu', c1, c2, cpu: nivel, p1cpu: nivel, esquiva: true }, 55);
        expect(r.fim, `${c1} x ${c2} nível ${nivel}`).toBe(true);
        expect(r.danoZero).toBe(0);
      }
    }
  });
});
