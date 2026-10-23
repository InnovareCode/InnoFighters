import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { todosOsFilmes } from '../../src/data/filmes';
import { CHAVES_DE_ROTEIRO, POSE_DO_MOTOR, roteiroDaTabela, roteiroDoFilme, roteiroGenerico, type RoteiroFilme } from '../../src/data/roteiros-filme';
import { batidasEfetivas, danoDasBatidas } from '../../src/render/filme';

/*
 * V2-3d: a tabela de roteiros do Apolo (docs/roteiros-filme-especiais.md §4) virou dado. Aqui se prova a ESTRUTURA (soma dos pesos, durações, CURTA, marcos) e que
 * cada pose citada existe no atlas do lutador, contra os arquivos de verdade em public/assets.
 */
const somaPesos = (bs: readonly { peso: number }[]): number => bs.reduce((s, b) => s + b.peso, 0);
const chaveDe = (f: { id: string; ficha: string | null; golpe: string }): string => (f.ficha ? `${f.id}/${f.ficha}/${f.golpe}` : `${f.id}/${f.golpe}`);

/** As 33 linhas do motor que têm filme (31 + as 2 variantes do chefão ZENON) + a resposta da PARADE, que o motor chama `sResp`. */
const COM_FILME = todosOsFilmes();

describe('V2-3d: a tabela de roteiros cobre todo especial que tem filme no motor', () => {
  it('os 33 registros de `filmes.ts` têm roteiro PRÓPRIO (não caem no modelo genérico)', () => {
    expect(COM_FILME).toHaveLength(33);
    for (const f of COM_FILME) {
      expect(CHAVES_DE_ROTEIRO, chaveDe(f)).toContain(chaveDe(f));
      expect(roteiroDaTabela(chaveDe(f))).toBeDefined();
    }
  });

  it('a tabela não tem linha sobrando (cada chave é um golpe que o motor conhece)', () => {
    const conhecidas = new Set(COM_FILME.map(chaveDe));
    for (const k of CHAVES_DE_ROTEIRO) expect(conhecidas.has(k), k).toBe(true);
    expect(CHAVES_DE_ROTEIRO).toHaveLength(33);
  });

  it('a ficha do chefão `chefe` do ZENON cai na base e golpe sem linha cai no modelo do tipo', () => {
    expect(roteiroDoFilme('zenon', 'chefe', 'sFire', true)).toBe(roteiroDaTabela('zenon/sFire'));
    expect(roteiroDoFilme('zenon', 'chefe2', 'sFwd', false)).toBe(roteiroDaTabela('zenon/chefe2/sFwd'));
    expect(roteiroDoFilme('nila', 'sarpa', 'sFwd', false)).toBe(roteiroDaTabela('nila/sarpa/sFwd'));
    expect(roteiroDoFilme('hayato', null, 'golpeInventado', true).tipo).toBe('projetil');
    expect(roteiroDoFilme('hayato', null, 'golpeInventado', false).tipo).toBe('chao');
  });
});

describe('V2-3d: estrutura de cada roteiro (os 33 + os 4 modelos genéricos)', () => {
  const todos: [string, RoteiroFilme][] = [
    ...CHAVES_DE_ROTEIRO.map((k) => [k, roteiroDaTabela(k) as RoteiroFilme] as [string, RoteiroFilme]),
    ...(['chao', 'aereo', 'projetil', 'agarrao'] as const).map((t) => [`modelo ${t}`, roteiroGenerico(t, 'sFire')] as [string, RoteiroFilme]),
  ];

  it('COMPLETA: pesos somam 1, duração entre 45 e 75, batidas em ordem crescente e dentro da duração', () => {
    for (const [nome, r] of todos) {
      expect(somaPesos(r.batidas), nome).toBeCloseTo(1, 9);
      expect(r.duracao, nome).toBeGreaterThanOrEqual(45);
      expect(r.duracao, nome).toBeLessThanOrEqual(75);
      expect(r.batidas[0]?.t, nome).toBe(0);
      r.batidas.forEach((b, i) => {
        expect(b.t, `${nome} b${i}`).toBeLessThan(r.duracao);
        if (i > 0) expect(b.t, `${nome} b${i}`).toBeGreaterThan((r.batidas[i - 1] as { t: number }).t);
      });
    }
  });

  it('CURTA: dura 30, os pesos continuam somando 1 (os das batidas cortadas vão para a 1ª que toca) e os `tc` crescem', () => {
    for (const [nome, r] of todos) {
      expect(r.curta, nome).toBe(30);
      const eff = batidasEfetivas(r, 'curta');
      expect(somaPesos(eff), nome).toBeCloseTo(1, 9);
      eff.forEach((b, i) => {
        expect(b.ini, `${nome} ${i}`).toBeLessThan(r.curta);
        if (i > 0) expect(b.ini, `${nome} ${i}`).toBeGreaterThan((eff[i - 1] as { ini: number }).ini);
      });
      expect(eff[0]?.ini, nome).toBe(0);
    }
  });

  it('o exemplo do Apolo: no modelo `chao` a 1ª batida da CURTA (o impacto) leva 0,75 e a seguinte 0,25', () => {
    const eff = batidasEfetivas(roteiroDaTabela('hayato/sFwd') as RoteiroFilme, 'curta');
    expect(eff[0]?.peso).toBeCloseTo(0.75, 9);
    expect(eff[1]?.peso).toBeCloseTo(0.25, 9);
    const ag = batidasEfetivas(roteiroDaTabela('baatar/sFire') as RoteiroFilme, 'curta');
    expect(ag.map((b) => b.peso)).toEqual([0.15, 0.25, 0.6, 0, 0]);
  });

  it('os marcos apontam batidas que existem, tocam na CURTA e estão em ordem', () => {
    for (const [nome, r] of todos) {
      const m = r.marcos;
      for (const [k, i] of Object.entries(m)) {
        const b = r.batidas[i as number];
        expect(b, `${nome} ${k}`).toBeDefined();
        expect(b?.tc, `${nome} ${k} precisa de tc`).toBeDefined();
      }
      expect(m.impacto, nome).toBeLessThanOrEqual(m.reacao);
      expect(m.reacao, nome).toBeLessThanOrEqual(m.lancamento);
      expect(m.lancamento, nome).toBeLessThanOrEqual(m.queda);
      expect(m.pouso ?? m.queda, nome).toBeLessThanOrEqual(m.queda);
    }
  });

  it('o último quadro é sempre a pose do motor para o atacante e `koFloor` para o rival (o filme volta exatamente para a luta)', () => {
    for (const [nome, r] of todos) {
      const ultima = r.batidas[r.batidas.length - 1];
      expect(ultima?.atacante, nome).toBe(POSE_DO_MOTOR);
      expect(ultima?.peso, nome).toBe(0);
      expect(ultima?.camera?.zoom, nome).toBe(1);
    }
    // e há batidas sem número (peso 0): grito, disparo e queda
    for (const [nome, r] of todos) expect(r.batidas.some((b) => b.peso === 0), nome).toBe(true);
  });

  it('a soma dos números mostrados é o dano arredondado, em qualquer dano e nos dois modos', () => {
    for (const [nome, r] of todos) {
      for (const modo of ['completa', 'curta'] as const) {
        const eff = batidasEfetivas(r, modo);
        for (const dano of [0.4, 7, 13.3, 17.5, 21.5, 26, 26.45]) {
          const d = danoDasBatidas(eff, dano);
          expect(
            d.numeros.reduce((s, n) => s + n, 0),
            `${nome} ${modo} ${dano}`,
          ).toBe(Math.round(dano));
          expect(d.acumulado[d.ultima], `${nome} ${modo} ${dano}`).toBe(dano);
          expect(Math.min(...d.numeros), `${nome} ${modo} ${dano}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('V2-3d: as poses citadas existem no atlas do lutador (public/assets)', () => {
  const quadrosDe = (id: string): Set<string> => {
    const j = JSON.parse(readFileSync(`public/assets/lutadores/${id}/atlas.json`, 'utf8')) as { quadros: Record<string, unknown> };
    return new Set(Object.keys(j.quadros));
  };
  const COMUNS_DO_RIVAL = ['hitH', 'hitB', 'kdAir', 'koFloor'];

  it('atacante (e reserva `Alt`) de cada batida, fora `fN` (folha FILME, ainda não gerada) e `$motor`', () => {
    const faltando: string[] = [];
    for (const f of COM_FILME) {
      const quadros = quadrosDe(f.id);
      const r = roteiroDaTabela(chaveDe(f)) as RoteiroFilme;
      r.batidas.forEach((b, i) => {
        for (const p of [b.atacante, b.atacanteAlt]) {
          if (!p || p === POSE_DO_MOTOR || /^f[0-5]$/.test(p)) continue;
          if (!quadros.has(p)) faltando.push(`${chaveDe(f)} b${i}: ${p}`);
        }
      });
    }
    expect(faltando).toEqual([]);
  });

  it('rival: as poses comuns existem em todos os atlas', () => {
    for (const id of ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar', 'zenon']) {
      const q = quadrosDe(id);
      for (const p of COMUNS_DO_RIVAL) expect(q.has(p), `${id} ${p}`).toBe(true);
    }
    for (const f of COM_FILME) {
      for (const [i, b] of (roteiroDaTabela(chaveDe(f)) as RoteiroFilme).batidas.entries()) {
        for (const p of [b.rival, b.rivalAlt]) {
          if (p && !/^f[0-5]$/.test(p)) expect(COMUNS_DO_RIVAL, `${chaveDe(f)} b${i}`).toContain(p);
        }
      }
    }
  });
});
