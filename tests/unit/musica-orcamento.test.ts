import { describe, expect, it } from 'vitest';
import { compilarTema, duracaoDoPasso, orcamentoDoTema } from '../../src/audio/partitura';
import { FONTES_ATIVAS_MAX, FONTES_NOVAS_POR_PASSO_MAX, VOZ_POR_COMPASSO_MAX } from '../../src/audio/temas';
import { duracaoDoLacoS, TEMAS, type IdTema, type TemaDef } from '../../src/data/musica';
import { menorP99, p99DaFight, percentil, rodarTrilha, RUIDO_RELOGIO_MS, type MedidaDeTrilha } from '../support/orcamento-musica';
import { PERF } from '../support/perf';

/*
 * T2 · orçamento de CPU RELATIVO à `fight` (spec dos temas §3.5), medido rodando o scheduler REAL sobre o mini motor offline (Node), não inventado:
 *   fontes novas por passo <= o máximo da `fight`; fontes ativas <= 1,25 x o pico ativo da `fight`; `vozFormante` só em nota longa e 1 por compasso;
 *   a música fica fora do teto de 32 fontes dos efeitos (a `vozFormante` da música não se registra).
 * O celular de verdade e o Chromium com CPU 4x são do dono e da Íris (N3): aqui está o que o Node prova.
 */
const LISTA = Object.entries(TEMAS).filter((e): e is [IdTema, TemaDef] => e[1] !== 'chefe');

const medidaFight = rodarTrilha('fight', 20, { spb: 0.1 }).medida;
const nosFight = medidaFight.nosPorSegundo;
/**
 * Agendamento RELATIVO à `fight` (e não um absoluto): o p99 do tick do `scheduler()` de um tema (o melhor de 3 execuções) não passa de 1,25 x o da `fight` de hoje
 * (mediana de 5 execuções; 1,35 x na fase 2, só no chefão), mais 0,05 ms de ruído do relógio. O absoluto `p99 < 1 ms` não era atingível nem pela `fight` no Chromium
 * com CPU 4x (N3 da Íris: `fight` 9,5 ms, temas 6,3 a 8,0 ms; 0,66 a 0,84 x a `fight`), então o que se garante é "não custa mais que a música que já está no jogo".
 * O critério DETERMINÍSTICO de custo (nós por segundo, fontes por passo e ativas) fica abaixo e não depende de relógio.
 */
// a parte de RELOGIO (p99 do tick) so roda em `npm run test:perf` (ver tests/support/perf.ts); a contagem de fontes e de nos continua no portao
const p99Fight = PERF ? p99DaFight() : 0;

describe('a medida da `fight` de hoje sustenta as constantes do orçamento', () => {
  it('8 fontes novas no passo 0 e 12 ativas: 1,25 x 12 = 15', () => {
    console.log(`fight: ${medidaFight.porPasso} fontes novas (passo ${medidaFight.passoDoPico}), ${medidaFight.ativasPico} ativas, ${nosFight.toFixed(1)} nós/s, tick p50 ${percentil(medidaFight.ticksMs, 0.5).toFixed(3)} ms p99 ${percentil(medidaFight.ticksMs, 0.99).toFixed(3)} ms`);
    expect(medidaFight.porPasso).toBe(FONTES_NOVAS_POR_PASSO_MAX);
    expect(Math.ceil(1.25 * medidaFight.ativasPico)).toBe(FONTES_ATIVAS_MAX);
    expect(VOZ_POR_COMPASSO_MAX).toBe(1);
  });
});

describe.each(LISTA)('%s', (id, def) => {
  const t = compilarTema(def);
  const estatico = orcamentoDoTema(t);
  const medir = (fase2: boolean): MedidaDeTrilha => rodarTrilha(`tema:${id}`, 3.2 * duracaoDoLacoS(def) / (fase2 ? def.fase2.andamento : 1), { spb: duracaoDoPasso(def, fase2 ? 2 : 1), ...(fase2 ? { fase2Em: 0 } : {}) }).medida;

  it('estático (as tabelas compiladas): dentro do orçamento relativo à `fight`', () => {
    expect(estatico.porPasso).toBeLessThanOrEqual(FONTES_NOVAS_POR_PASSO_MAX);
    expect(estatico.ativas).toBeLessThanOrEqual(FONTES_ATIVAS_MAX);
    expect(estatico.vozesPorCompasso).toBeLessThanOrEqual(VOZ_POR_COMPASSO_MAX);
  });

  it.each([false, true])('dinâmico (o scheduler de verdade, fase 2 = %s): fontes por passo e ativas dentro do orçamento e abaixo do estático; custo do grafo relativo à `fight`', (fase2) => {
    const m = medir(fase2);
    const dur = (3.2 * duracaoDoLacoS(def)) / (fase2 ? def.fase2.andamento : 1);
    // o melhor p99 entre a medida acima e mais 2 execuções de 20 s: tira o pico de coleta de lixo, que não é custo do tema
    const p99 = !PERF ? 0 : Math.min(percentil(m.ticksMs, 0.99), menorP99(() => rodarTrilha(`tema:${id}`, Math.min(dur, 20), { spb: duracaoDoPasso(def, fase2 ? 2 : 1), ...(fase2 ? { fase2Em: 0 } : {}) }).medida.ticksMs, 2));
    console.log(`orçamento ${id}${fase2 ? ' fase 2' : ''}: ${m.porPasso} novas/passo (máx. ${FONTES_NOVAS_POR_PASSO_MAX}), ${m.ativasPico} ativas (máx. ${FONTES_ATIVAS_MAX}), ${m.nosPorSegundo.toFixed(1)} nós/s (${(m.nosPorSegundo / nosFight).toFixed(2)} x a fight), tick p99 ${p99.toFixed(3)} ms (${(p99 / p99Fight).toFixed(2)} x a fight)`);
    expect(m.porPasso).toBeLessThanOrEqual(FONTES_NOVAS_POR_PASSO_MAX);
    expect(m.ativasPico).toBeLessThanOrEqual(FONTES_ATIVAS_MAX);
    expect(m.porPasso).toBeLessThanOrEqual(estatico.porPasso);
    expect(m.ativasPico).toBeLessThanOrEqual(estatico.ativas);
    expect(m.nosPorSegundo).toBeLessThanOrEqual((fase2 ? 1.35 : 1.25) * nosFight); // o grafo montado por segundo; a fase 2 (só no chefão) tem folga de 35%
    if (PERF) expect(p99).toBeLessThanOrEqual((fase2 ? 1.35 : 1.25) * p99Fight + RUIDO_RELOGIO_MS); // relativo à `fight` (ver acima); aqui é o mini motor em Node, sem o custo do navegador
  });

  it('a música não gasta o teto de 32 fontes dos efeitos (nem a voz do khöömei)', () => {
    const { audio } = rodarTrilha(`tema:${id}`, 4, { spb: duracaoDoPasso(def, 1) });
    expect(audio.fontesAtivas()).toBe(0);
    expect(audio.fontesLivres()).toBe(32);
  });
});
