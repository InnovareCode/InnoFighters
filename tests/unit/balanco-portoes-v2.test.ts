import { describe, expect, it } from 'vitest';
import { ROSTER } from '../../src/data/lutadores';
import { hashDosRegistros } from '../../ferramentas/balanco/agregado';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { medirPortoes, portoesV2Md, veredictoDosPortoes } from '../../ferramentas/balanco/portoes-v2';
import { montarTarefas, rodarTarefas, type ParametrosSim, type Registro } from '../../ferramentas/balanco/simulacao';

/*
 * Portões do §4.5 da spec do motor v2 (V2-6). Provas: (1) `medidas` NÃO entra no hash (ligar a medida não muda a referência sem motor v2);
 * (2) com o filme ligado o harness conta filmes e atribui dano ao especial; sem ele, filmes = 0; (3) a conta e o veredito, sobre registros montados à mão.
 */
const elenco = montarElenco();
const PARAMS: ParametrosSim = { sementes: 2, niveis: [2], base: 1, filtro: 'hayato:caio,aminu:nila,wei-long:min-ji', incluirChefe: false, esquiva: true };

describe('medidas do harness', () => {
  const sem = rodarTarefas(elenco, montarTarefas(ROSTER, null, PARAMS));
  const com = rodarTarefas(elenco, montarTarefas(ROSTER, null, { ...PARAMS, filmes: true }));

  it('o hash ignora `medidas`', () => {
    const semMedidas = sem.map(({ medidas: _m, ...r }) => r as Registro);
    expect(sem.every((r) => r.medidas !== undefined)).toBe(true);
    expect(hashDosRegistros(sem)).toBe(hashDosRegistros(semMedidas));
  });

  it('sem filmes: nenhum filme contado, mas há especiais iniciados e tempo parado de tarja', () => {
    for (const r of sem) {
      const m = r.medidas as NonNullable<Registro['medidas']>;
      expect(m.filmes).toEqual([0, 0]);
      expect(m.paradoTicks).toBe((m.especiais[0] + m.especiais[1]) * 48);
    }
    expect(sem.some((r) => (r.medidas as NonNullable<Registro['medidas']>).especiais[0] + (r.medidas as NonNullable<Registro['medidas']>).especiais[1] > 0)).toBe(true);
  });

  it('com filmes: há filmes, o tempo parado passa o da tarja e o dano de especial existe', () => {
    const filmes = com.reduce((s, r) => s + (r.medidas as NonNullable<Registro['medidas']>).filmes[0] + (r.medidas as NonNullable<Registro['medidas']>).filmes[1], 0);
    expect(filmes).toBeGreaterThan(0);
    for (const r of com) {
      const m = r.medidas as NonNullable<Registro['medidas']>;
      expect(m.paradoTicks).toBeGreaterThanOrEqual((m.especiais[0] + m.especiais[1]) * 48);
      expect(m.danoEspecial[0] + m.danoEspecial[1]).toBeLessThanOrEqual(r.dano[0] + r.dano[1] + 1e-9);
    }
    expect(com.some((r) => (r.medidas as NonNullable<Registro['medidas']>).danoEspecial[0] + (r.medidas as NonNullable<Registro['medidas']>).danoEspecial[1] > 0)).toBe(true);
  });
});

function reg(nivel: number, ticks: number, rounds: number, dano: number, danoEsp: number, parado: number): Registro {
  return {
    idx: 0, tipo: 'regular', a: 'hayato', b: 'caio', nivel, semente: 1, venc: 0, travou: false, updates: ticks, ticks, rounds, fim: [], empates: 0,
    perfeitos: [0, 0], dano: [dano, 0], golpes: [{}, {}], chefe: [0, 0, 0], trocaFicha: [0, 0], parry: [0, 0], quebra: [0, 0], agarroes: [0, 0], clash: 0,
    carga: [[0, 0, 0], [0, 0, 0]], rebote: [0, 0], esquivas: [0, 0], esquivou: [0, 0], reboteFaixas: [[0, 0, 0, 0], [0, 0, 0, 0]],
    medidas: { especiais: [2, 0], filmes: [1, 0], danoEspecial: [danoEsp, 0], paradoTicks: parado },
  };
}

describe('conta e veredito', () => {
  it('ticks por round, fatia do dano e fração parada saem das somas (por nível, só regulares)', () => {
    const p = medirPortoes([reg(1, 4000, 2, 100, 30, 400), reg(1, 2000, 2, 100, 40, 200), { ...reg(1, 9999, 1, 50, 50, 9999), tipo: 'chefe' }]);
    expect(p.medidas).toHaveLength(1);
    const m = p.medidas[0] as (typeof p.medidas)[number];
    expect(m.ticksPorRound).toBeCloseTo(6000 / 4);
    expect(m.fatiaEspecial).toBeCloseTo(70 / 200);
    expect(m.paradoFracao).toBeCloseTo(600 / 6000);
  });

  it('veredito: queda de duração > 20%, fatia fora de 25-40% ou +10 pontos e parado > 15% reprovam; o resto passa', () => {
    const antes = medirPortoes([reg(2, 4000, 2, 100, 25, 300)]); // fatia 25%
    const bom = veredictoDosPortoes(medirPortoes([reg(2, 3600, 2, 100, 33, 450)]), antes)[0]!; // -10%, +8 pt, 12,5%
    expect(bom.duracao.ok && bom.fatia.ok && bom.parado.ok).toBe(true);
    const ruim = veredictoDosPortoes(medirPortoes([reg(2, 2800, 2, 100, 38, 600)]), antes)[0]!; // -30%, +13 pt, 21%
    expect(ruim.duracao.ok).toBe(false);
    expect(ruim.fatia.ok).toBe(false);
    expect(ruim.parado.ok).toBe(false);
    const foraDaFaixa = veredictoDosPortoes(medirPortoes([reg(2, 4000, 2, 100, 45, 0)]), null)[0]!;
    expect(foraDaFaixa.fatia.absolutoOk).toBe(false);
    expect(foraDaFaixa.duracao.ok).toBe(true); // sem referência só valem os limites absolutos
  });

  it('o relatório diz o nível e marca ✓ / ✗', () => {
    const md = portoesV2Md(veredictoDosPortoes(medirPortoes([reg(1, 4000, 2, 100, 30, 400)]), null), { geradoEm: '2026-10-23', versaoDados: 'abc' });
    expect(md).toContain('NORMAL');
    expect(md).toMatch(/✓|✗/);
  });
});
