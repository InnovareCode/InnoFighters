import { it } from 'vitest';

/*
 * Testes que medem RELOGIO (p99 de tick, custo por evento comparado a outro custo) dependem de a maquina estar quieta: sob carga (CI compartilhada, outra suite rodando
 * ao lado) falham sem defeito nenhum, e como o `npm test` e portao de deploy (pages.yml) um vermelho por acaso derrubaria o site. Por isso ficam FORA do `npm test` e rodam na
 * suite serial `npm run test:perf` (vitest.perf.config.ts liga INNO_PERF=1, 1 arquivo por vez). O que e DETERMINISTICO (contagem de fontes, nos por segundo, ordem) continua no portao.
 */
export const PERF = process.env['INNO_PERF'] === '1';

/** `it` que so roda na suite `test:perf`; no `npm test` aparece como pulado (e e contado, nao some). */
export const itPerf = it.skipIf(!PERF);
