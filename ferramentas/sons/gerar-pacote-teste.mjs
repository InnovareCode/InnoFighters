#!/usr/bin/env node
/*
 * Gera o PACOTE DE TESTE das amostras reais em tests/fixtures/sons-pacote/ (MP3 + manifesto.json): ondas sinteticas deterministicas com o MESMO manifesto que o
 * pacote real tera. Existe para a camada de amostras ser desenvolvida e testada sem arte-fonte/ (a CI e limpa) e para o navegador decodificar MP3 de verdade.
 * O gerador das ondas mora em tests/support/pacote-teste.ts (o mesmo dos testes em memoria); aqui so se chama o vitest com a variavel de ambiente que liga o gerador.
 * Precisa do ffmpeg no PATH. Uso: npm run sons:pacote-teste
 */
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['vitest', 'run', 'tests/unit/sons-amostras-fixture.test.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, GERAR_PACOTE_TESTE: '1' } });
process.exit(r.status ?? 1);
