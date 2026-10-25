import { describe, expect, it } from 'vitest';
import {
  AgregadorDeQuadros,
  CAPACIDADE,
  INTERVALO_MAXIMO_MS,
  JANELA_PICO_MS,
  JANELA_RELATORIO_MS,
  montarRelatorio,
  type AmbienteDoAparelho,
  type EstadoDoMedidor,
} from '../../src/ui/medidor-agregacao';
import { medidorLigado, rotuloDaCena } from '../../src/ui/medidor-fps';

/** Alimenta `n` quadros de `dt` ms a partir de `t0`; devolve o instante do último. */
function alimentar(ag: AgregadorDeQuadros, t0: number, n: number, dt: number, cena = 'luta', rs = 2): number {
  let t = t0;
  for (let i = 0; i < n; i++) {
    t += dt;
    ag.registrar(t, dt, cena, rs);
  }
  return t;
}

describe('AgregadorDeQuadros: janelas, p95 e pior quadro', () => {
  it('60 fps parados: fps 60, p95 e pior 16,7', () => {
    const ag = new AgregadorDeQuadros();
    const fim = alimentar(ag, 0, 600, 1000 / 60);
    const r = ag.resumo(fim, 1000);
    expect(r.fps).toBeCloseTo(60, 0);
    expect(r.p95).toBeCloseTo(16.7, 1);
    expect(r.pior).toBeCloseTo(16.7, 1);
    expect(r.quadros).toBeGreaterThanOrEqual(59);
    expect(r.quadros).toBeLessThanOrEqual(61);
  });

  it('a janela só enxerga o recente: 2 s lentos e depois 1 s rápido, a janela de 1 s mostra só o rápido', () => {
    const ag = new AgregadorDeQuadros();
    let t = alimentar(ag, 0, 60, 33.3); // ~2 s a 30 fps
    t = alimentar(ag, t, 60, 16.7);
    const r = ag.resumo(t, 1000);
    expect(r.pior).toBeCloseTo(16.7, 1);
    expect(r.fps).toBeCloseTo(60, 0);
    const maior = ag.resumo(t, 5000);
    expect(maior.pior).toBeCloseTo(33.3, 1);
  });

  it('p95: 100 quadros, 94 de 16 ms e 6 de 50 ms -> p95 = 50; 95 de 16 e 5 de 50 -> p95 = 16', () => {
    const a = new AgregadorDeQuadros();
    let t = alimentar(a, 0, 94, 16);
    t = alimentar(a, t, 6, 50);
    expect(a.resumo(t, 60_000).p95).toBe(50);
    const b = new AgregadorDeQuadros();
    let u = alimentar(b, 0, 95, 16);
    u = alimentar(b, u, 5, 50);
    expect(b.resumo(u, 60_000).p95).toBe(16);
  });

  it('o pior quadro aparece mesmo sozinho; quadros acima de 500 ms (aba em segundo plano) NÃO contam', () => {
    const ag = new AgregadorDeQuadros();
    let t = alimentar(ag, 0, 100, 16);
    t += 40;
    ag.registrar(t, 40, 'luta', 2);
    expect(ag.registrar(t + 3000, 3000, 'luta', 2)).toBe(false);
    expect(ag.registrar(t + 3001, INTERVALO_MAXIMO_MS + 1, 'luta', 2)).toBe(false);
    expect(ag.registrar(t + 3002, 0, 'luta', 2)).toBe(false);
    expect(ag.resumo(t + 10, 60_000).pior).toBe(40);
    expect(ag.quadros).toBe(101);
  });

  it('vazio: tudo zero, sem NaN', () => {
    const ag = new AgregadorDeQuadros();
    expect(ag.resumo(1000, 1000)).toEqual({ quadros: 0, fps: 0, p95: 0, pior: 0 });
    expect(ag.porCena(1000)).toEqual({});
  });

  it('o buffer é circular: passar da capacidade descarta os mais velhos sem quebrar a janela', () => {
    const ag = new AgregadorDeQuadros();
    const fim = alimentar(ag, 0, CAPACIDADE + 500, 4); // 250 Hz por 34 s
    expect(ag.quadros).toBe(CAPACIDADE);
    const r = ag.resumo(fim, 1000);
    expect(r.fps).toBeCloseTo(250, 0);
    expect(r.pior).toBe(4);
  });
});

describe('AgregadorDeQuadros: resumo por cena (30 s)', () => {
  it('separa menu e luta, com fps, p95, pior e o intervalo de RS de cada uma', () => {
    const ag = new AgregadorDeQuadros();
    let t = alimentar(ag, 0, 120, 16.7, 'menu', 2); // ~2 s
    t = alimentar(ag, t, 60, 33.3, 'luta', 1.5); // ~2 s a 30 fps
    t = alimentar(ag, t, 60, 33.3, 'luta', 1); // cai de degrau
    const por = ag.porCena(t);
    expect(Object.keys(por).sort()).toEqual(['luta', 'menu']);
    expect(por['menu']).toMatchObject({ quadros: 120, pior: 16.7, p95: 16.7, rsMin: 2, rsMax: 2 });
    expect(por['menu']?.fps).toBeCloseTo(59.9, 0);
    expect(por['luta']).toMatchObject({ quadros: 120, pior: 33.3, rsMin: 1, rsMax: 1.5 });
    expect(por['luta']?.fps).toBeCloseTo(30, 0);
    expect(por['luta']?.segundos).toBeCloseTo(4, 0);
  });

  it('só os últimos 30 s entram: uma cena que acabou há 40 s some do relatório', () => {
    const ag = new AgregadorDeQuadros();
    let t = alimentar(ag, 0, 100, 16, 'select');
    t += JANELA_RELATORIO_MS + 10_000;
    t = alimentar(ag, t, 100, 16, 'luta');
    expect(Object.keys(ag.porCena(t))).toEqual(['luta']);
  });
});

describe('montarRelatorio: o JSON do botão COPIAR', () => {
  const ambiente: AmbienteDoAparelho = {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/130',
    dpr: 2.625,
    tela: '915x412',
    canvas: '1440x810',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    versao: 'abc1234 · 24/10 20:00',
  };
  const estado: EstadoDoMedidor = { rs: 1.5, rsModo: 'auto', cena: 'luta', arteMiB: 77.7, longtasks: { suportado: true, ultimos5s: 2, piorMs: 80, totalDesdeLigar: 9 } };

  it('traz aparelho, cena, RS, últimos 5 s e por cena, e faz ida e volta pelo JSON', () => {
    const ag = new AgregadorDeQuadros();
    const t = alimentar(ag, 0, 300, 16.7);
    const rel = JSON.parse(JSON.stringify(montarRelatorio(ag, t, ambiente, estado))) as Record<string, unknown>;
    expect(rel['formato']).toBe('inno-fps-1');
    expect(rel['janelaS']).toBe(30);
    expect(rel['userAgent']).toContain('Pixel 7');
    expect(rel).toMatchObject({ dpr: 2.625, hardwareConcurrency: 8, deviceMemoryGB: 8, canvas: '1440x810', tela: '915x412' });
    expect(rel['agora']).toEqual({ cena: 'luta', rs: 1.5, rsModo: 'auto', arteMiB: 77.7 });
    expect((rel['ultimos5s'] as { fps: number }).fps).toBeCloseTo(60, 0);
    expect((rel['porCena'] as Record<string, { quadros: number }>)['luta']?.quadros).toBe(300);
    expect(rel['longtasks']).toEqual({ suportado: true, ultimos5s: 2, piorMs: 80, totalDesdeLigar: 9 });
  });

  it('sem dado pessoal: só chaves de aparelho/medida conhecidas (nada de URL, cookie, storage, nome)', () => {
    const ag = new AgregadorDeQuadros();
    const rel = montarRelatorio(ag, 1000, ambiente, estado);
    expect(Object.keys(rel).sort()).toEqual(['agora', 'canvas', 'deviceMemoryGB', 'dpr', 'formato', 'hardwareConcurrency', 'janelaS', 'longtasks', 'porCena', 'tela', 'ultimos5s', 'userAgent', 'versao'].sort());
    expect(JANELA_PICO_MS).toBe(5000);
  });
});

describe('medidorLigado e rotuloDaCena', () => {
  it('só `?fps=1` (ou true) liga', () => {
    expect(medidorLigado('?fps=1')).toBe(true);
    expect(medidorLigado('?seed=3&fps=true')).toBe(true);
    for (const b of ['', '?fps=0', '?fps=', '?fps=2', '?fpss=1', '?x=1']) expect(medidorLigado(b), b).toBe(false);
  });

  it('cenas simples usam o nome; a luta distingue pausa, provocação, filme, tarja do super, faixa e hitstop', () => {
    expect(rotuloDaCena({ name: 'menu' })).toBe('menu');
    expect(rotuloDaCena({ name: 'select' })).toBe('select');
    expect(rotuloDaCena({ name: '' })).toBe('boot');
    const luta = (scene: object, game: object): { name: string; scene: object; m: object } => ({ name: 'fight', scene, m: { game } });
    const base = { espera: { pronta: true }, paused: false, entrada: { ativa: false }, provocacao: { ativa: false }, filme: { ativo: false }, tarjaDoSuper: { ativa: false }, cine: { ativa: false }, faixaRitmo: { ativa: false } };
    const jogo = { phase: 'fight', hitstop: 0 };
    expect(rotuloDaCena(luta(base, jogo))).toBe('luta');
    expect(rotuloDaCena(luta(base, { phase: 'fight', hitstop: 3 }))).toBe('luta/hitstop');
    expect(rotuloDaCena(luta({ ...base, paused: true }, jogo))).toBe('luta/pausa');
    expect(rotuloDaCena(luta({ ...base, provocacao: { ativa: true } }, jogo))).toBe('luta/provocacao');
    expect(rotuloDaCena(luta({ ...base, filme: { ativo: true } }, jogo))).toBe('luta/filme');
    expect(rotuloDaCena(luta({ ...base, tarjaDoSuper: { ativa: true } }, jogo))).toBe('luta/tarja-super');
    expect(rotuloDaCena(luta({ ...base, faixaRitmo: { ativa: true } }, jogo))).toBe('luta/faixa-especial');
    expect(rotuloDaCena(luta({ ...base, espera: { pronta: false } }, jogo))).toBe('luta/carregando');
    expect(rotuloDaCena(luta(base, { phase: 'ko' }))).toBe('luta/ko');
  });
});
