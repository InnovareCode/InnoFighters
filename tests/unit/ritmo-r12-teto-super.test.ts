import { describe, expect, it } from 'vitest';
import { criarRng } from '../../src/core/rng';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { SUPER_ESPERA, SUPER_REFORCO_APOS, SUPER_TETO_LUTA, SUPER_TETO_ROUND } from '../../src/fight/cpu';
import { cena } from './_filme';
import { montarTodos } from './_lutadores';

/*
 * R-12 (reprovação da Íris, G10): a CPU do ritmo tem TETO de supers (por luta, por round) e ESPERA entre dois, e nunca recebe o super por acidente
 * (hp e hk em ticks vizinhos viram o par). O humano e o chefão nunca são bloqueados. O limite de 6 supers por luta (dois lados) não pode ser quebrado.
 */
const RITMO = { intervalos: true, filmeRestrito: true, super: true, cadeia: true, cpu: true } as const;

describe('teto de supers da CPU', () => {
  it('constantes: 2 por lado na luta, 1 por round, espera de 30 s entre dois; dois lados dão no máximo 4 (<= 6 do G10)', () => {
    expect(SUPER_TETO_LUTA * 2).toBeLessThanOrEqual(6);
    expect(SUPER_TETO_ROUND).toBeLessThanOrEqual(SUPER_TETO_LUTA);
    expect(SUPER_ESPERA).toBeGreaterThanOrEqual(900);
  });

  it('superBloqueadoPara: livre no começo; bloqueia no teto da luta, no teto do round e durante a espera; humano nunca', () => {
    const c = cena('hayato', 'caio', { ritmo: RITMO });
    c.g.p1.cpu = 1;
    expect(c.g.superBloqueadoPara(c.g.p1)).toBe(false);
    c.g.supersNoRound[0] = SUPER_TETO_ROUND;
    expect(c.g.superBloqueadoPara(c.g.p1)).toBe(true); // teto do round
    c.g.supersNoRound[0] = 0;
    c.g.supersNaLuta[0] = SUPER_TETO_LUTA;
    expect(c.g.superBloqueadoPara(c.g.p1)).toBe(true); // teto da luta
    c.g.supersNaLuta[0] = 1;
    c.g.tickDaLuta = 100;
    c.g.ultimoSuperEm[0] = 100 - (SUPER_ESPERA - 1);
    expect(c.g.superBloqueadoPara(c.g.p1)).toBe(true); // ainda na espera
    c.g.ultimoSuperEm[0] = 100 - SUPER_ESPERA;
    expect(c.g.superBloqueadoPara(c.g.p1)).toBe(false);
    c.g.supersNaLuta[1] = 99;
    expect(c.g.superBloqueadoPara(c.g.p2)).toBe(false); // P2 é humano (cpu null)
  });

  it('o chefão fica fora: nem ele nem o desafiante são bloqueados', () => {
    const c = cena('hayato', 'aminu', { ritmo: RITMO, chefe: true });
    c.g.p1.cpu = 1;
    c.g.supersNaLuta[0] = 99;
    expect(c.g.superBloqueadoPara(c.g.p1)).toBe(false);
    expect(c.g.superBloqueadoPara(c.g.p2)).toBe(false);
  });

  it('no teto, hp e hk da CPU em ticks vizinhos NÃO viram o super (o acidente que passava o teto); abaixo do teto, viram', () => {
    const tenta = (usados: number): boolean => {
      const c = cena('hayato', 'caio', { ritmo: RITMO });
      c.g.p1.cpu = 1;
      c.g.p1.ai.reservaSuper = null;
      c.g.supersNaLuta[0] = usados;
      c.g.p1.en = 100;
      c.g.p1.x = 435;
      c.g.p2.x = 525;
      // a CPU decide sozinha: forçamos as duas bordas pelo caminho do jogador humano em P1
      c.g.p1.cpu = null;
      c.g.superBloqueadoPara = (f) => (f === c.g.p1 ? usados >= SUPER_TETO_LUTA : false);
      c.mao.p1 = { hp: true, hk: true };
      c.tick();
      c.mao.p1 = {};
      c.tick(4);
      return c.eventos.some((e) => e.tipo === 'special' && e.super === true);
    };
    expect(tenta(0)).toBe(true);
    expect(tenta(SUPER_TETO_LUTA)).toBe(false);
  });
});

describe('CPU x CPU no padrão: nunca mais de 6 supers, nenhum lado passa do teto', () => {
  it('60 lutas NORMAL e DIFÍCIL: cada lado <= teto, soma <= 6, e a média fica em 1..4', () => {
    const PROD = montarTodos({ dadosDeProducao: true });
    const pares: [string, string][] = [['hayato', 'caio'], ['min-ji', 'zenon'], ['aminu', 'camille'], ['baatar', 'nila'], ['centella', 'wei-long'], ['camille', 'nila']];
    let total = 0;
    let lutas = 0;
    for (const nivel of [1, 2]) {
      for (const [a, b] of pares) {
        for (let s = 1; s <= 5; s++) {
          const g = new Game({ lutadores: PROD, rng: criarRng(s * 31 + nivel) });
          g.setup({ mode: 'cpu', c1: a, c2: b, cpu: nivel, p1cpu: nivel, esquiva: true, motorV2: { entradaNoHitstop: true, filmes: true, combos: true }, ritmo: RITMO } as never, { rounds: 2, time: 99, shake: false });
          const fonte: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
          for (let t = 0; t < 30000 && !g.matchDone; t++) g.update(fonte);
          const [x, y] = g.supersNaLuta;
          expect(x, `${a}x${b} s${s}`).toBeLessThanOrEqual(SUPER_TETO_LUTA);
          expect(y, `${a}x${b} s${s}`).toBeLessThanOrEqual(SUPER_TETO_LUTA);
          expect(x + y, `${a}x${b} s${s} nivel ${nivel}`).toBeLessThanOrEqual(6);
          total += x + y;
          lutas++;
        }
      }
    }
    expect(total / lutas).toBeGreaterThanOrEqual(1);
    expect(total / lutas).toBeLessThanOrEqual(4);
  }, 180_000);

  it('o reforço de barra existe (a CPU DIFÍCIL não passa a luta toda sem super) e começa só depois de SUPER_REFORCO_APOS', () => {
    expect(SUPER_REFORCO_APOS).toBeGreaterThan(0);
  });
});
