import { describe, expect, it } from 'vitest';
import type { IdLutador } from '../../src/core/contratos';
import { ROSTER } from '../../src/data/lutadores';
import { REGRAS_PADRAO } from '../../src/meta/regras';
import { agregar, hashChefes, hashDosRegistros, hashRegulares } from '../../ferramentas/balanco/agregado';
import { CRITERIOS_CHEFAO, desafiantesDoChefe, metaDoChefe } from '../../ferramentas/balanco/chefoes';
import { acharOutliers } from '../../ferramentas/balanco/outliers';
import { montarTarefas, type ParametrosSim, type Registro } from '../../ferramentas/balanco/simulacao';

/*
 * R2 (spec chefões §4.4): o harness mede os 6 chefões, cada um contra o elenco que EXISTE no ponto dele da progressão (39 pares),
 * com a parte regular intacta (mesmos idx e sementes de antes; hash separado) e a meta da RAMPA aprovada pelo dono.
 */

const PARAMS: ParametrosSim = { sementes: 2, niveis: [1, 2], base: 1, filtro: null, incluirChefe: true };
const chefoes = desafiantesDoChefe(REGRAS_PADRAO);

describe('R2 · desafiantesDoChefe: o elenco de cada ponto da progressão', () => {
  it('6 chefões na ordem da progressão (a fila e depois o ZENON)', () => {
    expect(chefoes.map((c) => c.chefe)).toEqual(['aminu', 'centella', 'camille', 'nila', 'baatar', 'zenon']);
  });

  it('4, 5, 6, 7, 8 e 9 desafiantes: 39 pares', () => {
    expect(chefoes.map((c) => c.desafiantes.length)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(chefoes.reduce((s, c) => s + c.desafiantes.length, 0)).toBe(39);
  });

  it('AMINU: só os 4 iniciais; cada guardião seguinte: iniciais + os guardiões anteriores; ZENON: todos menos ele', () => {
    const ini = ['hayato', 'wei-long', 'min-ji', 'caio'];
    expect([...(chefoes[0]?.desafiantes ?? [])].sort()).toEqual([...ini].sort());
    expect([...(chefoes[1]?.desafiantes ?? [])].sort()).toEqual([...ini, 'aminu'].sort());
    expect([...(chefoes[3]?.desafiantes ?? [])].sort()).toEqual([...ini, 'aminu', 'centella', 'camille'].sort());
    expect([...(chefoes[5]?.desafiantes ?? [])].sort()).toEqual(ROSTER.filter((id) => id !== 'zenon').sort());
  });

  it('o chefão nunca é desafiante de si mesmo, e um guardião nunca enfrenta quem só vem depois dele', () => {
    chefoes.forEach((c, k) => {
      expect(c.desafiantes).not.toContain(c.chefe);
      for (const posterior of REGRAS_PADRAO.fila.slice(k)) expect(c.desafiantes).not.toContain(posterior);
    });
    expect(chefoes[0]?.desafiantes).not.toContain('zenon');
  });
});

describe('R2 · montarTarefas com os 6 chefões', () => {
  const todas = montarTarefas(ROSTER, chefoes, PARAMS);
  const regulares = todas.filter((t) => t.tipo === 'regular');
  const doChefe = todas.filter((t) => t.tipo === 'chefe');

  it('39 pares x 2 níveis x sementes lutas de chefe, e 90 pares regulares', () => {
    expect(doChefe).toHaveLength(39 * 2 * PARAMS.sementes);
    expect(regulares).toHaveLength(90 * 2 * PARAMS.sementes);
  });

  it('a parte regular é IDÊNTICA à de antes (mesmos idx, pares e sementes) com 0, 1 ou 6 chefões', () => {
    const semChefe = montarTarefas(ROSTER, null, PARAMS);
    const umSo = montarTarefas(ROSTER, 'zenon', PARAMS).filter((t) => t.tipo === 'regular');
    expect(regulares).toEqual(semChefe);
    expect(regulares).toEqual(umSo);
  });

  it('as lutas do ZENON têm as MESMAS sementes e idx relativos do chefão único de antes (a linha de base não se mexe)', () => {
    const antes = montarTarefas(ROSTER, 'zenon', PARAMS).filter((t) => t.tipo === 'chefe');
    const agora = doChefe.filter((t) => t.b === 'zenon');
    expect(agora.map((t) => [t.a, t.nivel, t.semente])).toEqual(antes.map((t) => [t.a, t.nivel, t.semente]));
  });

  it('cada tarefa de chefe só põe contra o chefão quem existe naquele ponto', () => {
    for (const t of doChefe) {
      const c = chefoes.find((x) => x.chefe === t.b);
      expect(c?.desafiantes, `${t.a} x ${t.b}`).toContain(t.a);
    }
  });

  it('--chefes limita aos chefões pedidos e --sem-regulares tira os 90 pares (a semente não muda)', () => {
    const so = montarTarefas(ROSTER, chefoes, { ...PARAMS, chefes: ['aminu', 'zenon'], semRegulares: true });
    expect(new Set(so.map((t) => t.b))).toEqual(new Set(['aminu', 'zenon']));
    expect(so.every((t) => t.tipo === 'chefe')).toBe(true);
    expect(so).toHaveLength((4 + 9) * 2 * PARAMS.sementes);
    for (const t of so) expect(t.semente).toBe(doChefe.find((x) => x.a === t.a && x.b === t.b && x.nivel === t.nivel && x.semente === t.semente)?.semente);
  });

  it('sem chefões (lista vazia ou null) ou com incluirChefe falso: nenhuma tarefa de chefe', () => {
    expect(montarTarefas(ROSTER, [], PARAMS).filter((t) => t.tipo === 'chefe')).toHaveLength(0);
    expect(montarTarefas(ROSTER, chefoes, { ...PARAMS, incluirChefe: false }).filter((t) => t.tipo === 'chefe')).toHaveLength(0);
  });
});

const reg = (idx: number, tipo: 'regular' | 'chefe', a: string, b: string, venc: 0 | 1, extra: Partial<Registro> = {}): Registro => ({
  idx, tipo, a: a as IdLutador, b: b as IdLutador, nivel: 1, semente: idx, venc, travou: false, updates: 3000, ticks: 3000, rounds: 1, fim: ['ko'],
  empates: 0, perfeitos: [0, 0], dano: [100, 80], golpes: [{}, {}], chefe: [1, 1, 1], trocaFicha: [0, 0], parry: [0, 0], quebra: [0, 0],
  agarroes: [0, 0], clash: 0, carga: [[0, 0, 0], [0, 0, 0]], rebote: [0, 0], esquivas: [0, 0], esquivou: [0, 0],
  reboteFaixas: [[0, 0, 0, 0], [0, 0, 0, 0]], ...extra,
});

describe('R2 · hashes separados', () => {
  const regulares = [reg(0, 'regular', 'hayato', 'caio', 0), reg(1, 'regular', 'caio', 'hayato', 1)];
  const chefe = [reg(2, 'chefe', 'hayato', 'aminu', 1)];

  it('hashRegulares ignora as lutas de chefe: mudar o chefão não muda o hash do jogável', () => {
    const outroChefe = [reg(2, 'chefe', 'hayato', 'aminu', 0, { ticks: 9999 })];
    expect(hashRegulares([...regulares, ...chefe])).toBe(hashRegulares([...regulares, ...outroChefe]));
    expect(hashRegulares([...regulares, ...chefe])).toBe(hashDosRegistros(regulares));
    expect(hashChefes([...regulares, ...chefe])).not.toBe(hashChefes([...regulares, ...outroChefe]));
  });

  it('mexer num regular muda o hashRegulares', () => {
    const outro = [reg(0, 'regular', 'hayato', 'caio', 1), regulares[1] as Registro];
    expect(hashRegulares(outro)).not.toBe(hashRegulares(regulares));
  });
});

describe('R3 · a rampa de metas', () => {
  it('AMINU 26-30% e ZENON 15-19% no NORMAL (as pontas aprovadas pelo dono), descendo no meio', () => {
    expect(metaDoChefe(0, 6).normal).toEqual([0.26, 0.3]);
    expect(metaDoChefe(5, 6).normal).toEqual([0.15, 0.19]);
    const centros = [0, 1, 2, 3, 4, 5].map((k) => (metaDoChefe(k, 6).normal[0] + metaDoChefe(k, 6).normal[1]) / 2);
    for (let k = 1; k < 6; k++) expect(centros[k] as number).toBeLessThan(centros[k - 1] as number);
  });

  it('o DIFÍCIL é proporcionalmente menor que o NORMAL em todo chefão (centro e teto)', () => {
    for (let k = 0; k < 6; k++) {
      const m = metaDoChefe(k, 6);
      expect(m.dificil[1]).toBeLessThan(m.normal[1]);
      expect(m.dificil[0]).toBeLessThan(m.normal[0]);
    }
  });

  it('critérios do spec §4.3: KO >= 90%, 75/90 s, pior >= 5%, melhor <= 40%, fator >= 0,60', () => {
    expect(CRITERIOS_CHEFAO.koMinimo).toBe(0.9);
    expect(CRITERIOS_CHEFAO.duracaoMax[1]).toBe(75);
    expect(CRITERIOS_CHEFAO.duracaoMax[2]).toBe(90);
    expect(CRITERIOS_CHEFAO.piorMinimo).toBe(0.05);
    expect(CRITERIOS_CHEFAO.melhorMaximo).toBe(0.4);
    expect(CRITERIOS_CHEFAO.danoRecebidoMin).toBe(0.6);
  });
});

describe('R3 · agregar: uma linha por chefão e nível, contra a meta', () => {
  /** n lutas de `a` contra `b`, `k` vencidas pelo jogador (P1). */
  const lutas = (ini: number, a: string, b: string, n: number, k: number, extra: Partial<Registro> = {}): Registro[] =>
    Array.from({ length: n }, (_, i) => reg(ini + i, 'chefe', a, b, i < k ? 0 : 1, extra));

  it('taxa média ponderada, pior/melhor desafiante e o "na meta" por chefão', () => {
    const regs = [...lutas(0, 'hayato', 'aminu', 100, 28), ...lutas(100, 'caio', 'aminu', 100, 32), ...lutas(200, 'hayato', 'zenon', 100, 17)];
    const agr = agregar(regs, ['hayato', 'caio'], chefoes, { ...PARAMS, niveis: [1] });
    const aminu = agr.resumoChefes.find((s) => s.chefe === 'aminu');
    const zenon = agr.resumoChefes.find((s) => s.chefe === 'zenon');
    expect(aminu?.jogador).toMatchObject({ k: 60, n: 200 });
    expect(aminu?.posicao).toBe(0);
    expect(aminu?.total).toBe(6);
    expect(aminu?.meta).toEqual([0.26, 0.3]);
    expect(aminu?.ok.taxa).toBe(true); // 60/200 = 30% exato: a borda de cima da faixa 26-30% ainda está dentro
    expect(aminu?.pior).toEqual({ desafiante: 'hayato', taxa: 0.28 });
    expect(aminu?.melhor).toEqual({ desafiante: 'caio', taxa: 0.32 });
    expect(zenon?.posicao).toBe(5);
    expect(zenon?.ok.taxa).toBe(true);
    expect(zenon?.ok.melhor).toBe(true);
  });

  it('critérios de acompanhamento: tempo no lugar de KO, duração acima do limite e luta travada reprovam', () => {
    const ruins = lutas(0, 'hayato', 'aminu', 10, 3, { fim: ['tempo'], ticks: 60 * 100 });
    const agr = agregar(ruins, ['hayato'], chefoes, { ...PARAMS, niveis: [1] });
    const s = agr.resumoChefes[0];
    expect(s?.ok.ko).toBe(false);
    expect(s?.ok.duracao).toBe(false);
    expect(s?.porTempo).toBe(1);
    const achados = acharOutliers(agr, []);
    expect(achados.some((a) => a.categoria === 'chefao' && /KO/.test(a.texto))).toBe(true);
    expect(achados.some((a) => a.categoria === 'chefao' && /duração/.test(a.texto))).toBe(true);
  });

  it('o piso do NORMAL: um desafiante que nunca vence reprova o "pior >= 5%"; no DIFÍCIL o critério não vale', () => {
    const regs = [...lutas(0, 'hayato', 'aminu', 20, 0), ...lutas(20, 'caio', 'aminu', 20, 10)];
    const normal = agregar(regs, ['hayato', 'caio'], chefoes, { ...PARAMS, niveis: [1] }).resumoChefes[0];
    const dificil = agregar(regs.map((r) => ({ ...r, nivel: 2 })), ['hayato', 'caio'], chefoes, { ...PARAMS, niveis: [2] }).resumoChefes[0];
    expect(normal?.ok.pior).toBe(false);
    expect(dificil?.ok.pior).toBe(true);
  });

  it('o id único (chamada antiga) segue funcionando: a ordem vem dos registros', () => {
    const agr = agregar(lutas(0, 'hayato', 'baatar', 4, 1), ['hayato'], 'baatar', { ...PARAMS, niveis: [1] });
    expect(agr.resumoChefes).toHaveLength(1);
    expect(agr.chefe[0]).toMatchObject({ chefe: 'baatar', desafiante: 'hayato' });
  });
});
