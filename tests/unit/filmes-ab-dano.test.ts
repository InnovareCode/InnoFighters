import { describe, expect, it } from 'vitest';
import type { MotorV2 } from '../../src/core/contratos';
import { danoBaseDaVariante, filmeDoGolpe, todosOsFilmes, VARIANTES_DO_DANO } from '../../src/data/filmes';
import { danoFilmeDaUrl, regrasComMotorV2, REGRAS_PADRAO } from '../../src/meta';
import { PROD, cena, doTipo, soltar } from './_filme';

/*
 * A/B do dano do filme (D-V3, spec §4.5): `hoje | v2 | forte`. É ferramenta de desenvolvimento (URL `?dano-filme=` só com `dev`; `--dano-filme` no harness):
 * o jogo roda `v2` (a tabela decidida). Aqui se prova a conta pura, a leitura da URL e o efeito no motor (a vida que sai do mesmo golpe nas 3 variantes).
 */

describe('danoBaseDaVariante (pura)', () => {
  const tudo = todosOsFilmes();

  it('v2 devolve a tabela decidida; hoje <= v2 em toda linha (o filme só sobe o dano); forte >= 1,2 x hoje', () => {
    for (const { id, ficha, golpe, filme } of tudo) {
      const pow = PROD[id].pow;
      const hk = PROD[id].moves.hk?.dmg ?? 0;
      const nivel = filme.danoPorNivel ? 2 : 0;
      const nome = `${id}${ficha ? '/' + ficha : ''}/${golpe}`;
      const projetil = (golpe as string) !== 'sResp' && PROD[id].moves[golpe as 'sFire']?.type === 'fire';
      const v2 = danoBaseDaVariante(filme, 'v2', nivel, projetil, pow, hk);
      const hoje = danoBaseDaVariante(filme, 'hoje', nivel, projetil, pow, hk);
      const forte = danoBaseDaVariante(filme, 'forte', nivel, projetil, pow, hk);
      expect(v2, nome).toBe(filme.danoPorNivel ? filme.danoPorNivel[1] : filme.dano);
      expect(hoje, nome).toBeLessThanOrEqual(v2 + 1e-9);
      expect(forte, nome).toBeGreaterThanOrEqual(hoje * (projetil ? 1.2 : 1.4) - 1e-9);
    }
  });

  it('toda linha traz `hoje` (a tabela do A/B não pode ficar para trás quando entra um especial novo)', () => {
    for (const { id, ficha, golpe, filme } of tudo) expect(filme.hoje, `${id}/${ficha ?? '-'}/${golpe}`).toBeGreaterThan(0);
  });

  it('MASHI: cada nível de carga tem o seu `hoje` (9,4 / 17,7 / 26,0 efetivos) e o seu v2 (17 / 22 / 26)', () => {
    const f = filmeDoGolpe('aminu', null, 'sFire');
    expect(f).toBeDefined();
    if (!f) return;
    const pow = PROD.aminu.pow;
    const hoje = [1, 2, 3].map((n) => danoBaseDaVariante(f, 'hoje', n, false, pow, 0) * pow);
    expect(hoje[0]).toBeCloseTo(9.4, 1);
    expect(hoje[1]).toBeCloseTo(17.7, 1);
    expect(hoje[2]).toBeCloseTo(26, 1);
    const v2 = [1, 2, 3].map((n) => danoBaseDaVariante(f, 'v2', n, false, pow, 0) * pow);
    expect(v2.map((x) => Math.round(x))).toEqual([17, 22, 26]);
  });

  it('forte: o piso é 1,2 x hk (MARMA: hoje 7 x 1,4 = 9,8 não passa de 1,2 x hk da NILA)', () => {
    const f = filmeDoGolpe('nila', null, 'sFire');
    if (!f) throw new Error('sem filme');
    const nila = PROD.nila;
    const hk = nila.moves.hk?.dmg ?? 0;
    const ef = danoBaseDaVariante(f, 'forte', 0, false, nila.pow, hk) * nila.pow;
    expect(ef).toBeCloseTo(1.2 * hk * nila.pow, 6);
    expect(ef).toBeGreaterThan((f.hoje ?? 0) * nila.pow * 1.4);
  });

  it('projétil não usa pow: o efetivo do projétil é a própria base', () => {
    const f = filmeDoGolpe('hayato', null, 'sFire');
    if (!f) throw new Error('sem filme');
    expect(danoBaseDaVariante(f, 'hoje', 0, true, 1.07, 13)).toBeCloseTo(15, 6);
    expect(danoBaseDaVariante(f, 'forte', 0, true, 1.07, 13)).toBeCloseTo(Math.max(15 * 1.2, 1.2 * 13 * 1.07), 6);
  });
});

describe('URL ?dano-filme= (só em desenvolvimento)', () => {
  it('lê hoje/forte; v2, vazio e lixo viram "sem A/B"', () => {
    expect(danoFilmeDaUrl('?dano-filme=hoje')).toBe('hoje');
    expect(danoFilmeDaUrl('?dano-filme=FORTE')).toBe('forte');
    for (const b of ['', '?dano-filme=v2', '?dano-filme=', '?dano-filme=enorme', '?dano-filme=__proto__']) expect(danoFilmeDaUrl(b)).toBeUndefined();
  });

  it('regrasComMotorV2: sem `dev` a opção é ignorada (produção); com `dev` entra no motorV2', () => {
    expect(regrasComMotorV2(REGRAS_PADRAO, '?dano-filme=forte').motorV2?.danoFilme).toBeUndefined();
    const dev = regrasComMotorV2(REGRAS_PADRAO, '?dano-filme=forte', true).motorV2;
    expect(dev).toMatchObject({ entradaNoHitstop: true, filmes: true, combos: true, danoFilme: 'forte' });
    expect(regrasComMotorV2(REGRAS_PADRAO, '?motorv2=0&dano-filme=forte', true).motorV2).toMatchObject({ danoFilme: 'forte' });
  });
});

describe('no motor: a vida que sai do MESMO golpe nas 3 variantes', () => {
  function vidaPerdida(motorV2: MotorV2, c1: 'hayato' | 'camille', golpe: 'sFwd' | 'sDown' | 'sFire'): number {
    // varre a distância como o frame-data: a menor em que o golpe abre filme
    for (let d = 80; d <= 460; d += 10) {
      const c = cena(c1, 'caio', { motorV2, esquiva: false });
      c.g.p2.hp = c.g.p2.maxHp;
      soltar(c, golpe, d, { antes: (cc) => (cc.g.p2.hp = cc.g.p2.maxHp) });
      const f = doTipo(c.eventos, 'filme')[0];
      if (f) return f.dano;
    }
    throw new Error('não abriu filme');
  }

  it('hoje < v2 < forte para o KAMINARI-STEP do HAYATO (11,8 -> 15,5 -> 16,5)', () => {
    const base = { entradaNoHitstop: false, filmes: true } as const;
    const hoje = vidaPerdida({ ...base, danoFilme: 'hoje' }, 'hayato', 'sFwd');
    const v2 = vidaPerdida(base, 'hayato', 'sFwd');
    const v2Explicito = vidaPerdida({ ...base, danoFilme: 'v2' }, 'hayato', 'sFwd');
    const forte = vidaPerdida({ ...base, danoFilme: 'forte' }, 'hayato', 'sFwd');
    expect(v2Explicito).toBe(v2);
    expect(hoje).toBeCloseTo(11.8, 1);
    expect(v2).toBeCloseTo(15.5, 1);
    expect(forte).toBeGreaterThan(v2);
    expect(forte).toBeLessThanOrEqual(26);
  });

  it('sem filmes ligada a opção não faz nada (nenhum evento filme)', () => {
    const c = cena('hayato', 'caio', { motorV2: { danoFilme: 'forte' } });
    soltar(c, 'sFwd', 120);
    expect(doTipo(c.eventos, 'filme')).toHaveLength(0);
  });

  it('as 3 variantes existem e estão na ordem do A/B', () => {
    expect(VARIANTES_DO_DANO).toEqual(['hoje', 'v2', 'forte']);
  });
});
