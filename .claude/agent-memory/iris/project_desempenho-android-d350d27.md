---
name: desempenho-android-d350d27
description: Medicao de desempenho Android emulado (d350d27, 2026-10-24) - metodo (GPU real x canvas em CPU, throttle 4x/6x, toque CDP), numeros-chave e armadilhas de harness
metadata:
  type: project
---

Entrega parcial em `docs/desempenho-android-2026-10-24.md` (pendencias na secao 9: ablacao, toque curto, selecao, boot, GC 6x).

**Metodo que funcionou:** build `vite build -c <config no scratchpad>` com `define: {'import.meta.env.DEV': 'true'}` da `window.__inno` num bundle MINIFICADO de producao com laco real (nao `?manual=1`); `git archive` + `npm ci` real confere (bundle difere 4 B). `channel:'chromium'` (headless novo) usa a RTX (2d_canvas enabled, 85 Hz de video, `--limit-fps` nao funciona); headless shell usa canvas em CPU (13 fps a 1x, so serve de proxy de raster). SwiftShader como GPU = 3 fps, inutil. Sem vsync: `--disable-gpu-vsync --disable-frame-rate-limit` da o ritmo real de entrega (tabela principal).
**Armadilhas:** o relogio do Tracing (`ts`) != `performance.now()`; alinhar com `Performance.getMetrics.Timestamp*1000 - performance.now()` (guardar a cada amostra). O timer da luta (99 s) vira o round e o bot perde o controle: setar `g.timeLeft = g.timeMax`. A pasta scratchpad ja tinha arquivos de sessoes antigas com os mesmos nomes (`fases.mjs`, `lib.mjs`): usar subpasta. `vite preview` pode morrer sozinho: checar porta antes de cada rodada.
**Numeros-chave (4x, GPU RTX):** luta normal 12% dos quadros >16,7 ms, main thread 93% ocupada, selecao 28%, faixa fina/filme 30-45%, trailer p99 200-320 ms; 6x: luta 77% e 27 fps. JS de desenho NAO muda com RS=1 nem smoothing low; em canvas CPU RS=1 da 14->4 ms e 'low' 13->31 fps. Latencia toque->desenho ~35 ms (teclado ~10), hp/hk com barra cheia +3 ticks. Joystick: 25 graus acima = pula, 22 abaixo = agacha, solta 35 ms = dash. Coleta maior de GC a cada 3-4 s (20-76 ms a 4x), nao e audio.
**How to apply:** ao repetir, comecar de `ablacao.mjs`/`toque-curto.mjs` (nao rodados) e medir a SELECAO; se pedirem "FPS no celular", lembrar que GPU de celular NAO foi medida.
