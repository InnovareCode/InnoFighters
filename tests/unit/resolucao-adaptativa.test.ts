import { describe, expect, it } from 'vitest';
import {
  BLOQUEIO_BASE_S,
  BLOQUEIO_INEFICAZ_S,
  GANHO_MINIMO,
  GovernadorDeResolucao,
  IGNORAR_ACIMA_DE,
  JANELA,
  JANELAS_PARA_DESCER,
  JANELAS_PARA_SUBIR,
  QUADROS_DE_ASSENTO,
  type Troca,
} from '../../src/render/resolucao-adaptativa';
import { DEGRAU_DE_DESKTOP, DEGRAU_INICIAL_DE_TOQUE, DEGRAUS_DE_TOQUE, aparelhoDeToque, politicaDeResolucao } from '../../src/render/tela';

/*
 * D1 (docs/desempenho-android-2026-10-24.md §8.2): o governador de resolução do canvas principal e a política de `tela.ts`. O desktop continua em 2/'high'
 * (o oráculo de pixel), o toque começa em 1,5 e se adapta pelo intervalo entre quadros medido, sem piscar.
 */

/** Alimenta `n` quadros com o mesmo intervalo/trabalho; devolve as trocas que o governador pediu. */
function rodar(g: GovernadorDeResolucao, n: number, intervalo: number, trabalho = 3): Troca[] {
  const trocas: Troca[] = [];
  for (let i = 0; i < n; i++) {
    const t = g.registrar(intervalo, trabalho);
    if (t) trocas.push(t);
  }
  return trocas;
}

const JANELA_E_ASSENTO = JANELA + QUADROS_DE_ASSENTO;
/** Depois de uma descida: o assento e uma janela inteira em 18 ms (adiantou: abaixo do limite de descida, sem chegar à folga). */
/** Alimenta com `intervalo` até o governador pedir a primeira troca (no máximo 40 mil quadros) e devolve só ela; vazio se não pediu. */
const ATE_TROCAR = (g: GovernadorDeResolucao, intervalo: number): Troca[] => {
  for (let i = 0; i < 40000; i++) {
    const t = g.registrar(intervalo, 3);
    if (t) return [t];
  }
  return [];
};
const ADIANTOU = (g: GovernadorDeResolucao): Troca[] => rodar(g, QUADROS_DE_ASSENTO + JANELA, 18);

describe('politicaDeResolucao: o desktop não muda (oráculo de pixel), o toque começa em 1,5', () => {
  it('desktop (ponteiro fino), sem ?rs=: UM degrau, 2 e high, sem governador', () => {
    const p = politicaDeResolucao('', false);
    expect(p.degraus).toEqual([DEGRAU_DE_DESKTOP]);
    expect(DEGRAU_DE_DESKTOP).toEqual({ rs: 2, suavizacao: 'high' });
    expect(p.adaptativa).toBe(false);
    expect(p.inicial).toBe(0);
  });

  it('toque, sem ?rs=: começa em 1,5/medium e é adaptativo', () => {
    const p = politicaDeResolucao('', true);
    expect(p.adaptativa).toBe(true);
    expect(p.degraus).toBe(DEGRAUS_DE_TOQUE);
    expect(p.degraus[p.inicial]).toEqual({ rs: 1.5, suavizacao: 'medium' });
    expect(DEGRAU_INICIAL_DE_TOQUE).toBe(p.inicial);
    expect(DEGRAUS_DE_TOQUE.map((d) => d.rs)).toEqual([2, 1.5, 1]);
  });

  it('?rs=<n> força o degrau, em qualquer aparelho, sem governador', () => {
    for (const toque of [false, true]) {
      expect(politicaDeResolucao('?rs=1', toque)).toMatchObject({ adaptativa: false, degraus: [{ rs: 1, suavizacao: 'medium' }] });
      expect(politicaDeResolucao('?rs=1.5', toque)).toMatchObject({ adaptativa: false, degraus: [{ rs: 1.5, suavizacao: 'medium' }] });
    }
    expect(politicaDeResolucao('?rs=2', false).degraus[0]).toEqual({ rs: 2, suavizacao: 'high' });
    expect(politicaDeResolucao('?rs=2', true).degraus[0]).toEqual({ rs: 2, suavizacao: 'medium' });
  });

  it('?rs=auto liga o governador também no desktop (para teste)', () => {
    expect(politicaDeResolucao('?rs=auto', false)).toMatchObject({ adaptativa: true, degraus: DEGRAUS_DE_TOQUE, inicial: DEGRAU_INICIAL_DE_TOQUE });
  });

  it('valor inválido de ?rs= cai na política do aparelho', () => {
    for (const busca of ['?rs=abc', '?rs=0', '?rs=99', '?rs=']) {
      expect(politicaDeResolucao(busca, false).degraus).toEqual([DEGRAU_DE_DESKTOP]);
      expect(politicaDeResolucao(busca, true).adaptativa).toBe(true);
    }
  });

  it('aparelhoDeToque: ontouchstart, maxTouchPoints ou pointer: coarse', () => {
    const sem = { navigator: { maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }) as MediaQueryList };
    expect(aparelhoDeToque(sem)).toBe(false);
    expect(aparelhoDeToque({ ...sem, ontouchstart: null })).toBe(true);
    expect(aparelhoDeToque({ ...sem, navigator: { maxTouchPoints: 5 } })).toBe(true);
    expect(aparelhoDeToque({ ...sem, matchMedia: () => ({ matches: true }) as MediaQueryList })).toBe(true);
  });
});

describe('GovernadorDeResolucao', () => {
  it('aparelho rápido (intervalos de 16,7 ms, trabalho 3 ms) NUNCA desce', () => {
    const g = new GovernadorDeResolucao(1, 2);
    expect(rodar(g, 3000, 16.7).filter((t) => t.motivo === 'lento')).toEqual([]);
  });

  it('aparelho lento (p95 de 30 ms) desce UM degrau depois de ~2 janelas (o assento do início não conta)', () => {
    const g = new GovernadorDeResolucao(1, 2);
    const trocas = rodar(g, QUADROS_DE_ASSENTO + JANELA * JANELAS_PARA_DESCER + 5, 30);
    expect(trocas).toEqual([{ de: 1, para: 2, motivo: 'lento' }]);
    expect(g.degrau).toBe(2);
  });

  it('já no último degrau não desce mais (nunca sai do vetor)', () => {
    const g = new GovernadorDeResolucao(2, 2);
    expect(rodar(g, 2000, 60)).toEqual([]);
    expect(g.degrau).toBe(2);
  });

  it('quadros acima de 100 ms (aba em segundo plano, carregamento) NÃO contam como lentidão do desenho', () => {
    const g = new GovernadorDeResolucao(1, 2);
    expect(rodar(g, 2000, IGNORAR_ACIMA_DE + 1)).toEqual([]);
    expect(g.degrau).toBe(1);
  });

  it('uma janela ruim isolada (um engasgo) não desce: precisa de janelas SEGUIDAS', () => {
    const g = new GovernadorDeResolucao(1, 2);
    rodar(g, QUADROS_DE_ASSENTO, 16.7);
    const trocas = [...rodar(g, JANELA, 30), ...rodar(g, JANELA * 3, 16.7)];
    expect(trocas).toEqual([]);
  });

  it('com folga de verdade (p95 <= 17,5 ms e trabalho <= 5 ms) por ~6 janelas, SOBE um degrau', () => {
    const g = new GovernadorDeResolucao(1, 2);
    const trocas = rodar(g, QUADROS_DE_ASSENTO + JANELA * JANELAS_PARA_SUBIR + 5, 16.7, 3);
    expect(trocas).toEqual([{ de: 1, para: 0, motivo: 'folga' }]);
  });

  it('trabalho alto (8 ms) mesmo com 60 fps NÃO sobe (sem folga)', () => {
    const g = new GovernadorDeResolucao(1, 2);
    expect(rodar(g, 4000, 16.7, 8)).toEqual([]);
  });

  it('SEM PISCAR: quem desceu do degrau 0 fica bloqueado de voltar a ele por BLOQUEIO_BASE_S, e o bloqueio dobra na reincidência', () => {
    const g = new GovernadorDeResolucao(0, 2);
    // desce 0 -> 1 por lentidão
    expect(rodar(g, JANELA_E_ASSENTO + JANELA, 30)).toEqual([{ de: 0, para: 1, motivo: 'lento' }]);
    expect(ADIANTOU(g)).toEqual([]); // a descida adiantou (p95 de 30 para 18): fica
    // 60 fps folgado por (menos de) BLOQUEIO_BASE_S: NÃO sobe
    const quadrosDoBloqueio = Math.floor((BLOQUEIO_BASE_S * 1000) / 16.7) - 2000;
    expect(rodar(g, quadrosDoBloqueio, 16.7, 3)).toEqual([]);
    expect(g.degrau).toBe(1);
    // passado o bloqueio, sobe
    const sobe = rodar(g, Math.floor((BLOQUEIO_BASE_S * 1000) / 16.7), 16.7, 3);
    expect(sobe).toEqual([{ de: 1, para: 0, motivo: 'folga' }]);
    // desce de novo (reincidência): o bloqueio agora é o DOBRO
    expect(ATE_TROCAR(g, 30)).toEqual([{ de: 0, para: 1, motivo: 'lento' }]);
    expect(ADIANTOU(g)).toEqual([]);
    expect(rodar(g, Math.floor((BLOQUEIO_BASE_S * 1000 * 1.5) / 16.7), 16.7, 3)).toEqual([]);
    expect(g.degrau).toBe(1);
  });

  it('depois de trocar, os primeiros quadros (recriar o canvas) não contam', () => {
    const g = new GovernadorDeResolucao(0, 2);
    rodar(g, JANELA_E_ASSENTO + JANELA, 30); // desceu
    // o assento inteiro com intervalos péssimos (mas < 100 ms, que contariam) não soma janela ruim...
    expect(rodar(g, QUADROS_DE_ASSENTO, 60)).toEqual([]);
    // ...e a primeira janela depois dele já é a de verdade (boa): nada acontece
    expect(rodar(g, JANELA, 16.7)).toEqual([]);
  });

  it('descer TEM que adiantar: se o p95 não caiu 10%, o gargalo não é pixel; volta ao degrau anterior e não insiste por BLOQUEIO_INEFICAZ_S', () => {
    const g = new GovernadorDeResolucao(1, 2);
    // desce 1 -> 2 (p95 30) e continua em 30 depois dela: a descida não adiantou
    expect(rodar(g, JANELA_E_ASSENTO + JANELA, 30)).toEqual([{ de: 1, para: 2, motivo: 'lento' }]);
    expect(rodar(g, QUADROS_DE_ASSENTO + JANELA, 30)).toEqual([{ de: 2, para: 1, motivo: 'ineficaz' }]);
    expect(g.degrau).toBe(1);
    // segue lento por muito tempo (mas menos que o bloqueio): NÃO desce de novo
    const quadrosDoBloqueio = Math.floor((BLOQUEIO_INEFICAZ_S * 1000) / 30) - 3000;
    expect(rodar(g, quadrosDoBloqueio, 30)).toEqual([]);
    expect(g.degrau).toBe(1);
    // passado o bloqueio, volta a tentar
    expect(ATE_TROCAR(g, 30).map((t) => t.motivo)).toEqual(['lento']);
  });

  it('o ganho mínimo é de 10%: p95 de 30 para 26 (13%) adiantou e fica; para 28 (7%) não adiantou e volta', () => {
    expect(GANHO_MINIMO).toBe(0.1);
    const fica = new GovernadorDeResolucao(1, 2);
    rodar(fica, JANELA_E_ASSENTO + JANELA, 30);
    expect(rodar(fica, QUADROS_DE_ASSENTO + JANELA, 26)).toEqual([]);
    expect(fica.degrau).toBe(2);
    const volta = new GovernadorDeResolucao(1, 2);
    rodar(volta, JANELA_E_ASSENTO + JANELA, 30);
    expect(rodar(volta, QUADROS_DE_ASSENTO + JANELA, 28)).toEqual([{ de: 2, para: 1, motivo: 'ineficaz' }]);
  });
});
