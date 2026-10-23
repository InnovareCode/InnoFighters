import { defineConfig } from 'vitest/config';

/**
 * Suite SERIAL de testes que medem relogio (p99, custo relativo). Fora do `npm test` (portao de deploy): rode a mao ou num job nao bloqueante, com a maquina quieta.
 * `fileParallelism: false` = um arquivo por vez, para um arquivo nao roubar CPU do outro e falsear o p99. Ver tests/support/perf.ts.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/sons-integracao.test.ts', 'tests/unit/musica-orcamento.test.ts', 'tests/unit/sons-amostras-plano.test.ts'],
    environment: 'node',
    env: { INNO_PERF: '1' },
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
