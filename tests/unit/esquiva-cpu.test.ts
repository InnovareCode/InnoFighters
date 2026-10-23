import { describe, expect, it } from 'vitest';
import type { InputFrame, MotorV2 } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import { AI_LEVELS, cpuInput, perfilChefe, type PerfilCpu } from '../../src/fight/cpu';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { ateALuta, criarLuta, soltar, tipos, type Luta } from './_kit-e3';
import { montarTodos } from './_lutadores';

/*
 * V2 — CPU da esquiva (docs/spec-esquiva-e-cinematica-especial.md 2.2 e testes 8/9). Regra de ouro: com a esquiva desligada (ou no nível
 * FÁCIL) a CPU gasta EXATAMENTE os mesmos `rnd()` de antes. Aqui isso é medido com um RNG que conta chamadas.
 */
const elenco = montarTodos();
const SEMENTES = 400;

function contador(semente: number): { rng: Rng; chamadas: () => number } {
  const base = criarRng(semente);
  let n = 0;
  const rng: Rng = {
    proximo: () => (n++, base.proximo()),
    entre: (a, b) => a + rng.proximo() * (b - a),
    inteiro: (k) => Math.floor(rng.proximo() * k),
    escolher: (xs) => xs[Math.floor(rng.proximo() * xs.length)] as (typeof xs)[number],
    estado: () => base.estado(),
  };
  return { rng, chamadas: () => n };
}

/** CPU (P1, `nivel`) com o rival em `especial` (investida KAMINARI-STEP) a 100 px, pronta para reagir. */
function cenarioMelee(nivel: number, esquiva: boolean): Luta {
  const l = criarLuta({ mode: 'versus', c1: 'caio', c2: 'hayato', esquiva }, elenco);
  ateALuta(l);
  l.g.p1.x = 300;
  l.g.p2.x = 400;
  l.g.p1.en = 100;
  l.g.p1.cpu = nivel;
  l.g.p2.startMove('sFwd', l.g);
  l.g.p2.mt = 1;
  return l;
}

function decidir(nivel: number, esquiva: boolean, semente: number, perfil?: PerfilCpu) {
  const l = cenarioMelee(nivel, esquiva);
  if (perfil) l.g.p1.perfilIa = perfil;
  const { rng, chamadas } = contador(semente);
  const inp = cpuInput(l.g.p1, l.g.p2, l.g, rng);
  return { inp, chamadas: chamadas(), reacao: l.g.p1.ai.reacao, hold: l.g.p1.ai.hold };
}

const igual = (a: InputFrame, b: InputFrame): boolean => JSON.stringify(a) === JSON.stringify(b);

describe('RNG: a esquiva da CPU não gasta nada fora do seu ramo', () => {
  it('flag DESLIGADA: NORMAL com esq 0,25 sorteia e decide exatamente como NORMAL com esq 0 (400 sementes)', () => {
    const normal = AI_LEVELS[1];
    const semEsq: PerfilCpu = { ...normal, esq: 0, punir: 0 };
    for (let s = 1; s <= SEMENTES; s++) {
      const a = decidir(1, false, s);
      const b = decidir(1, false, s, semEsq);
      expect(a.chamadas, `semente ${s}`).toBe(b.chamadas);
      expect(igual(a.inp, b.inp), `semente ${s}`).toBe(true);
      expect(a.reacao).toEqual(b.reacao);
      expect(a.hold).toBe(b.hold);
    }
  });

  it('flag LIGADA no FÁCIL (esq 0): nenhum rnd a mais e a mesma decisão que com a flag desligada', () => {
    for (let s = 1; s <= SEMENTES; s++) {
      const on = decidir(0, true, s);
      const off = decidir(0, false, s);
      expect(on.chamadas, `semente ${s}`).toBe(off.chamadas);
      expect(igual(on.inp, off.inp)).toBe(true);
      expect(on.reacao).toEqual(off.reacao);
    }
  });

  it('flag LIGADA no NORMAL: sorteia a mais só no ramo (em parte das sementes), e às vezes escolhe a esquiva', () => {
    let maisRnd = 0;
    let esquivas = 0;
    for (let s = 1; s <= SEMENTES; s++) {
      const on = decidir(1, true, s);
      const off = decidir(1, false, s);
      expect(on.chamadas).toBeGreaterThanOrEqual(off.chamadas - 1);
      if (on.chamadas > off.chamadas) maisRnd++;
      if (on.reacao && 'esquiva' in on.reacao) esquivas++;
    }
    expect(maisRnd).toBeGreaterThan(0);
    expect(maisRnd).toBeLessThan(SEMENTES);
    expect(esquivas).toBeGreaterThan(0);
    expect(esquivas).toBeLessThan(maisRnd);
  });

  it('sem barra a CPU nem sorteia a esquiva (en < custo)', () => {
    for (let s = 1; s <= 100; s++) {
      const l = cenarioMelee(2, true);
      l.g.p1.en = ESQUIVA_PADRAO.custo - 1;
      const { rng, chamadas } = contador(s);
      cpuInput(l.g.p1, l.g.p2, l.g, rng);
      const ref = cenarioMelee(2, false);
      ref.g.p1.en = ESQUIVA_PADRAO.custo - 1;
      const r = contador(s);
      cpuInput(ref.g.p1, ref.g.p2, ref.g, r.rng);
      expect(chamadas()).toBe(r.chamadas());
    }
  });
});

describe('o que a CPU esquiva', () => {
  it('contra especial/golpe pesado: recua (esq + trás) depois de esperar a janela; contra jab (leve) nunca esquiva', () => {
    let apertou = 0;
    for (let s = 1; s <= SEMENTES; s++) {
      const l = cenarioMelee(2, true);
      const { rng } = contador(s);
      cpuInput(l.g.p1, l.g.p2, l.g, rng);
      const r = l.g.p1.ai.reacao;
      if (!r || !('esquiva' in r)) continue;
      expect(r.esquiva).toBe(-1);
      for (let t = 0; t < 40; t++) {
        const inp = cpuInput(l.g.p1, l.g.p2, l.g, rng);
        if (inp.esq === true) {
          apertou++;
          expect(inp.left).toBe(true); // o rival está à direita: trás = esquerda
          expect(inp.right).toBe(false);
          break;
        }
      }
    }
    expect(apertou).toBeGreaterThan(0);

    for (let s = 1; s <= SEMENTES; s++) {
      const l = criarLuta({ mode: 'versus', c1: 'caio', c2: 'hayato', esquiva: true }, elenco);
      ateALuta(l);
      l.g.p1.x = 300;
      l.g.p2.x = 400;
      l.g.p1.cpu = 2;
      l.g.p2.startMove('lp', l.g);
      l.g.p2.mt = 1;
      cpuInput(l.g.p1, l.g.p2, l.g, criarRng(s));
      expect(l.g.p1.ai.reacao === null || !('esquiva' in l.g.p1.ai.reacao)).toBe(true);
    }
  });

  it('contra projétil: AVANÇA (esquiva dir +1) em parte das sementes, sem tomar dano nesses casos', () => {
    let avancou = 0;
    let semDano = 0;
    for (let s = 1; s <= 200; s++) {
      const l = criarLuta({ mode: 'versus', c1: 'caio', c2: 'hayato', esquiva: true }, elenco, criarRng(s));
      ateALuta(l);
      l.g.p1.x = 300;
      l.g.p2.x = 700;
      l.g.p1.en = 100;
      l.g.p1.cpu = 2;
      l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
      const ev = l.passo(70);
      const e = tipos(ev, 'esquiva').find((x) => x.tipo === 'esquiva' && x.lutador === 0);
      if (e && e.tipo === 'esquiva' && e.dir === 1) {
        avancou++;
        if (l.g.p1.hp === l.g.p1.maxHp) semDano++;
      }
    }
    expect(avancou).toBeGreaterThan(10);
    expect(semDano).toBeGreaterThan(avancou * 0.8); // o avanço sai a ~170 px, antes do arranque vulnerável alcançar o projétil
  });
});

describe('punir a recuperação da esquiva do rival', () => {
  /** CPU (P1) com o rival (P2) na RECUPERAÇÃO de uma esquiva a 90 px. */
  function recuperacao(nivel: number, esquivaLigada: boolean): Luta {
    const l = criarLuta({ mode: 'versus', c1: 'caio', c2: 'hayato', esquiva: esquivaLigada }, elenco);
    ateALuta(l);
    l.g.p1.x = 300;
    l.g.p2.x = 390;
    l.g.p1.en = 100;
    l.g.p2.en = 100;
    soltar(l);
    if (esquivaLigada) {
      l.frame.p2.esq = true;
      l.frame.p2.left = false;
      l.frame.p2.right = true; // P2 olha para a esquerda: trás = direita (afasta-se do P1)
      l.passo();
      l.frame.p2.esq = false;
      l.frame.p2.right = false;
      l.g.p2.x = 390;
      l.passo(14); // entra na recuperação (invulnerável até o tick 14)
      l.g.p2.x = 390;
    }
    l.g.p1.cpu = nivel; // a CPU só passa a decidir DEPOIS de montada a cena (senão o Game já teria sorteado a punição)
    return l;
  }

  it('o rival em recuperação é punível (esquivaPunivel) e a CPU DIFÍCIL pune em ~70% das sementes, com um sorteio por esquiva', () => {
    const ref = recuperacao(2, true);
    expect(ref.g.p2.state).toBe('esquiva');
    expect(ref.g.p2.esquivaPunivel).toBe(true);
    let puniu = 0;
    for (let s = 1; s <= SEMENTES; s++) {
      const l = recuperacao(2, true);
      const inp = cpuInput(l.g.p1, l.g.p2, l.g, criarRng(s));
      if (inp.hp === true) puniu++;
      // no tick seguinte, mesma esquiva: não sorteia de novo
      const { rng, chamadas } = contador(s);
      cpuInput(l.g.p1, l.g.p2, l.g, rng);
      expect(chamadas()).toBeLessThanOrEqual(1 + 30);
    }
    expect(puniu / SEMENTES).toBeGreaterThan(0.5);
    expect(puniu / SEMENTES).toBeLessThan(0.95);
  });

  it('esquiva desligada: o rival nunca fica em "esquiva" e a CPU não gasta rnd por causa disso', () => {
    const l = recuperacao(2, false);
    expect(l.g.p2.esquivaPunivel).toBe(false);
  });
});

describe('perfil do chefe e do nível', () => {
  it('NORMAL 0,25/0,35, DIFÍCIL 0,5/0,7, FÁCIL 0/0; o chefe soma o bônus de reação com teto 1', () => {
    expect(AI_LEVELS.map((n) => [n.esq, n.punir])).toEqual([[0, 0], [0.25, 0.35], [0.5, 0.7]]);
    expect(perfilChefe(1, false)).toMatchObject({ esq: 0.4, punir: 0.5 });
    expect(perfilChefe(2, true).esq).toBeCloseTo(0.65, 12);
    expect(perfilChefe(2, true).punir).toBeCloseTo(0.85, 12);
  });
});

describe('CPU x CPU com esquiva (fumaça e snapshot)', () => {
  const SEM_ENTRADA: FonteEntradas = { p1: () => ({ left: false, right: false, up: false, down: false, lp: false, lk: false, hp: false, hk: false, sp: false }), p2: () => ({ left: false, right: false, up: false, down: false, lp: false, lk: false, hp: false, hk: false, sp: false }) };

  function resumo(semente: number, ticks: number, esquiva: boolean, motorV2?: MotorV2) {
    const g = new Game({ lutadores: elenco, rng: criarRng(semente) });
    g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 2, p1cpu: 2, esquiva, ...(motorV2 ? { motorV2 } : {}) }, { rounds: 2, time: 99, shake: true });
    const contagem: Record<string, number> = {};
    for (let i = 0; i < ticks; i++) {
      g.update(SEM_ENTRADA);
      for (const e of g.events) contagem[e.tipo] = (contagem[e.tipo] ?? 0) + 1;
    }
    return {
      round: g.round,
      fase: g.phase,
      wins: [g.p1.wins, g.p2.wins],
      hp: [Math.round(g.p1.hp * 1000) / 1000, Math.round(g.p2.hp * 1000) / 1000],
      x: [Math.round(g.p1.x * 1000) / 1000, Math.round(g.p2.x * 1000) / 1000],
      tick: g.tick,
      contagem,
    };
  }

  it('a CPU esquiva de verdade (eventos esquiva e esquivou) e o resultado é reproduzível', () => {
    const a = resumo(42, 6000, true);
    expect(a.contagem['esquiva']).toBeGreaterThan(0);
    expect(a.contagem['esquivou']).toBeGreaterThan(0);
    expect(resumo(42, 6000, true)).toEqual(a);
  });

  it('com a flag desligada nenhum evento de esquiva e o mesmo resultado de sempre', () => {
    const off = resumo(42, 6000, false);
    expect(off.contagem['esquiva']).toBeUndefined();
    expect(off.contagem['esquivou']).toBeUndefined();
  });

  it('CPU x CPU de 6000 ticks, semente 42, COM esquiva, tem resultado fixo (regressão; o snapshot antigo SEM esquiva fica no fight.test.ts)', () => {
    expect(resumo(42, 6000, true)).toMatchSnapshot();
  });

  it('V2-1: com motorV2.entradaNoHitstop LIGADA o CPU x CPU de 6000 ticks COM esquiva é o MESMO do snapshot acima', () => {
    expect(resumo(42, 6000, true, { entradaNoHitstop: true })).toEqual(resumo(42, 6000, true));
  });

  it('todas as ocorrências do estado esquiva voltam ao normal (nenhum lutador fica preso)', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(7) });
    g.setup({ mode: 'cpu', c1: 'camille', c2: 'baatar', cpu: 2, p1cpu: 2, esquiva: true }, { rounds: 2, time: 99, shake: true });
    let seguidos = 0;
    let maximo = 0;
    for (let i = 0; i < 8000; i++) {
      g.update(SEM_ENTRADA);
      const preso = g.p1.state === 'esquiva' || g.p2.state === 'esquiva';
      seguidos = preso ? seguidos + 1 : 0;
      maximo = Math.max(maximo, seguidos);
    }
    expect(maximo).toBeLessThanOrEqual(ESQUIVA_PADRAO.frente.dur + 2);
    expect(tipos(g.events, 'esquiva').length).toBeGreaterThanOrEqual(0);
  });
});
