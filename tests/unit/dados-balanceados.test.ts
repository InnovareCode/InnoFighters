import { describe, expect, it } from 'vitest';
import { LUTADORES } from '../../src/data/lutadores';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { DADOS_ORIGINAIS, defDoOraculo, montarTodos } from './_lutadores';

/*
 * E6b: a produção (`src/data/lutadores`) foi afastada dos 4 originais do protótipo para equilibrar o jogo; o ORÁCULO de fidelidade
 * (dados.test, luta-fidelidade, snapshot CPU x CPU) usa `tests/fixtures/dados-prototipo/originais.json`. Este arquivo prova as duas
 * metades: (1) o oráculo é mesmo o protótipo e a produção é a balanceada; (2) a produção só se afasta do protótipo no que o
 * balanceamento pode mexer (hp, pow e o DANO dos golpes comuns): tempos, alcance, empurrão, avanço e armadura ficam iguais.
 */
const ORIGINAIS = ['hayato', 'wei-long', 'min-ji', 'caio'] as const;

/** Números de produção da E6b (antes -> depois no docs/handoff-vega-e6b.md). Quem reverter um deles sem querer cai aqui. */
const BALANCEADO = {
  hayato: { hp: 106, pow: 1.07 },
  'wei-long': { hp: 96, pow: 0.93 },
  'min-ji': { hp: 94, pow: 0.9 },
  caio: { hp: 98, pow: 0.97 },
} as const;

describe('E6b: oráculo (protótipo) x produção (balanceada)', () => {
  it('a fixture tem os números do PROTÓTIPO dos 4 e o oráculo os usa', () => {
    expect(DADOS_ORIGINAIS['wei-long']).toMatchObject({ hp: 108, pow: 1.14 });
    expect(DADOS_ORIGINAIS['hayato']).toMatchObject({ hp: 100, pow: 1 });
    expect(DADOS_ORIGINAIS['wei-long']?.mods.hk).toEqual({ S: 12, A: 5, R: 22, dmg: 17, kb: 13, adv: 20 });
    const oraculo = montarTodos();
    expect(oraculo['wei-long'].hp).toBe(108);
    expect(oraculo['wei-long'].pow).toBe(1.14);
    expect(oraculo['hayato'].hp).toBe(100);
    expect(defDoOraculo('wei-long').mods).toEqual(DADOS_ORIGINAIS['wei-long']?.mods);
  });

  it('a produção usa os números balanceados (LUTADORES, o elenco do jogo e do harness)', () => {
    const jogo = montarElenco();
    for (const id of ORIGINAIS) {
      expect(LUTADORES[id].hp, id).toBe(BALANCEADO[id].hp);
      expect(LUTADORES[id].pow, id).toBe(BALANCEADO[id].pow);
      expect(jogo[id].hp, id).toBe(BALANCEADO[id].hp);
    }
    expect(montarTodos({ dadosDeProducao: true })['wei-long'].hp).toBe(96);
    expect(montarTodos({ dadosDeProducao: true })['wei-long'].moves.hk.dmg).toBe(14);
  });

  it('o afastamento do protótipo é só hp, pow e dano dos golpes comuns', () => {
    for (const id of ORIGINAIS) {
      const orig = DADOS_ORIGINAIS[id];
      const prod = LUTADORES[id];
      expect(orig, id).toBeDefined();
      if (!orig) continue;
      expect(Object.keys(prod.mods).sort(), `${id}: mesmos golpes ajustados`).toEqual(Object.keys(orig.mods).sort());
      for (const [golpe, origMod] of Object.entries(orig.mods)) {
        const { dmg: _d1, ...origResto } = origMod as Record<string, unknown>;
        const { dmg: _d2, ...prodResto } = (prod.mods as Record<string, Record<string, unknown>>)[golpe] ?? {};
        void _d1;
        void _d2;
        expect(prodResto, `${id}.${golpe}`).toEqual(origResto);
      }
    }
  });

  it('o dano mudou nos golpes comuns do WEI LONG e só neles (o resto dos originais segue o protótipo)', () => {
    const mods = LUTADORES['wei-long'].mods;
    expect([mods.lp?.dmg, mods.lk?.dmg, mods.hp?.dmg, mods.hk?.dmg, mods.chp?.dmg, mods.chk?.dmg]).toEqual([4.5, 6, 10, 14, 10, 9]);
    expect([mods.clp?.dmg, mods.jhp?.dmg, mods.jhk?.dmg]).toEqual([5, 11, 13]);
    expect(LUTADORES['min-ji'].mods).toEqual(DADOS_ORIGINAIS['min-ji']?.mods);
    expect(LUTADORES['caio'].mods).toEqual(DADOS_ORIGINAIS['caio']?.mods);
  });
});
