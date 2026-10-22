---
name: temas-n3-chromium
description: QA do conjunto D (temas musicais T0-T2) em 2026-10-21: N3 no Chromium (fidelidade do mini motor, CPU 4x), causas raiz achadas, tecnica de rodar TS no navegador, hashes da regua congelada
metadata:
  type: project
---

Conjunto D (HEAD a6227d5, `TEMAS_POR_LUTADOR=false`, 35 arquivos, lista em `docs/commit-temas-arquivos.txt`) sozinho: tsc limpo, vitest 91+7 skip / 2057 passam (HEAD puro 84+6 / 1878), build 324,28 kB vs 292,64 kB do HEAD (+31,6 kB: `audio-sys` importa os temas), e2e:build 5/5. `tocarReceita` sem os campos novos = HEAD (400 receitas aleatorias + as reais x 6 opcoes, chaves e valores iguais; o teste temporario falha ao passar `inicio`, entao discrimina).

Achados do N3 (Chromium 156, AudioSys real no OfflineAudioContext 22050 x mini motor):
- Causa raiz do S > 0,3: o mini motor (`tests/support/audio-offline.ts`) gera sawtooth/square ~1,1 a 1,4 dB MAIS ALTO que o Chromium e o triangle NAO e band-limited (S sobe com f0: triangle 440 Hz 0,21; 1760 Hz 1,97; square 1760 Hz 1,99). Senoide e ruido filtrado batem (S ~0). Pistas que reprovam: AMINU perc (triangle 2300 Hz, 0,62), NILA baixo (serra passa-baixa, 0,67); compasso inteiro 0,35 / 0,36 / 0,46.
- O renderizador por chamada da regua (overlap-add) reusa a MESMA janela de ruido em chamadas iguais (cada uma em AudioSys novo com rng 5): NILA perc diverge 0,83 do render direto do proprio mini motor; contra o Chromium o render direto da 0,02.
- Conclusao da distincao nao muda: dT por par no Chromium 3,79 / 3,79 / 4,86 vs mini 3,83 / 3,75 / 4,83, todos > tau_T 3,413.
- Em tempo real, CPU 4x: p99 do `scheduler()` 6,3 a 8,0 ms nos temas e 9,5 ms na `fight` de hoje (a 1x: 0,9 a 1,1 e 1,4 ms): o criterio absoluto `< 1 ms` nao e atingivel nem pela `fight`; temas custam 0,66 a 0,84 x a `fight`. Passo 0 atrasado na partida (35 a 121 ms) em 38 de 40 partidas frias a 4x, `fight` inclusive (10/10): vem do `nextTime = currentTime + 0.05` de `startMusic`; depois da partida 0 atraso. Fontes ativas: 8 a 11 (fase 1), 14 (fase 2), `fight` 12.
- Bug pequeno: a `vozFormante` da musica (BAATAR) usa `when` relativo (`inicio + quando - agora`) e relê `currentTime`: atrasa ate 18,7 ms a 4x (0 a 1x). Correcao: `vozFormante` aceitar tempo absoluto.
- Estalo de 1 amostra do mini motor NAO reproduzido via `tone()` (seno e quadrada em 1,2000000000000002 s): o que aparece e o mini comecar 1 quadro antes do Chromium (pico 0,0037 vs 0,0036). So o desvio de 1 quadro foi observado.

Regua congelada (nenhuma alteracao depois do 1o tema): arquivos da cadeia da regua com mtime 20:13-20:22, 1o tema criado 20:44:22; `escolherTau` recalculado hoje = 0,48250 / 0,34819 / 3,41340 (congelado 0,4825 / 0,3482 / 3,413). sha256 (16 hex) hoje: regua-musica fedc53aff11962cd, musica-medida 700780636c428457, render-musica 10b5fced88540d45, regua-sons d86bdcf90868b055, descritores 4688f17b982848cd, audio-offline 8f5d54a4d21d490c, render-som cf6114c7f0155b15. Se mudarem, a regua foi tocada.

**How to apply:** TS no navegador sem bundler: dev server do worktree em porta propria (`npx vite --port 5193 --strictPort`), uma `index.html` com `<script type="module" src="./qa.ts">` que importa os modulos de `src/` e `tests/support/` e pendura funcoes em `window.QA`; Playwright `page.evaluate`. CPU 4x: `ctx.newCDPSession(page)` + `Emulation.setCPUThrottlingRate`; recarregar a pagina a cada rodada (ganchos em `OscillatorNode.prototype.start/stop` acumulam). Fontes ativas = sobreposicao maxima de (start, stop) no relogio do audio. NUNCA `python3 -` em heredoc no bash daqui (trava, o stub do Windows espera stdin) e heredoc com aspas simples dentro quebra: usar Write. Backgrounds de espera em loop `until` seguram a pasta do worktree ocupada (matar os bash antes de remover). Harness copiado para o scratchpad da sessao (some): refazer pelo roteiro acima.
