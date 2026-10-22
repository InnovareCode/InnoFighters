---
name: bloco2-trailer-amostras-qa
description: QA 2026-10-22 do bloco 2 (T trailer da Lyra + S amostras reais da Vega) sobre HEAD c3ad28f: 1a rodada REPROVADO (3 defeitos), revalidacao FINAL APROVADO; numeros, flaky e armadilhas
metadata:
  type: project
---

Separacao: T (36 arquivos) e S (47, com o novo e2e-build) NAO dividem arquivo (main.ts e package.json so S; boot/title/index/tipos/regras/marca so T). Sem patch. Ordem de commit: S, T, docs2.

**1a rodada (REPROVADO), 3 defeitos, todos consertados na revalidacao:** (1) `tests/e2e/entrada.spec.ts` celular quebrava SO com o T (1o toque = gesto do boot -> trailer -> `body.em-trailer` poe `#touch` pointer-events:none); conserto `&trailer=0` na `goto`. Padrao: todo e2e que toca no boot precisa `&trailer=0`. (2) S: manifesto 200 mas invalido (`{}`, JSON de erro de proxy) = TELA PRETA em producao; conserto: `falharAlto` (so DEV/CI lanca) em `carregarCamadasSonoras`. (3) escuta: 1o "A/B" antes da base decodificar tocava sintese nas duas metades; conserto: avisa "Carregando as amostras...".

**Revalidacao FINAL (APROVADO):** S, T e uniao: tsc 0, vitest (S 2404; uniao 2437), build, e2e:build; suite e2e inteira na uniao 0 falha (um spec por vez). Teste permanente novo `tests/e2e-build/manifesto-fallback.spec.ts` (6 casos: `{}`/Bad Gateway = 1 console.error do jogo; HTML/404 = 0; CONTROLE com manifesto real pede base.mp3; escuta com folhas presas por `route` ate o teste soltar). Mutacao provou sensibilidade: `falharAlto ?? true` derruba 2 casos (tela preta, data-pronto nunca); retirar a guarda `emEspera` da escuta derruba o de escuta. 404 gera um console.error do Chromium ("Failed to load resource") que NAO e do jogo: filtrar por prefixo.

**Flaky pre-existente (falha igual no HEAD puro):** `fidelidade-prototipo.spec` (pixel a pixel; no HEAD 2-3 falhas por rodada, na uniao 2-5; max 3-9 de diferenca, testes diferentes a cada rodada); `tests/unit/sons-integracao.test.ts` "evento inteiro ... 10 x um tick da fight" (relativo, Node) falha ~50% das rodadas do vitest COMPLETO tanto no HEAD (3/6) quanto na uniao (2/5); isolado passa sempre. Nao e regressao; sugerir relaxar o limite ou isolar (pool). EPERM em `test-results/prototipo-fontes` com 4 workers ja visto.

Numeros N3 (Chromium, CPU 4x, flags `--enable-gpu-rasterization --use-angle=swiftshader` OBRIGATORIAS): custo por quadro luta uniao igual ao HEAD (8,5-10,6 ms). Trailer por-plano 4x, p95 geral: 17,3 (Lyra), 19,8/20,7/20,6 (Iris, revalidacao; limite 24,15 = 1,15 x p95 da luta 4x); P1 sempre acima (32-49 ms, risco ACEITO pelo Atlas: espera do rasterizador SwiftShader); P4 teve um 50 ms numa rodada (ruido). Cada rodada de `trailer:medir --modo por-plano --taxas 4` leva ~9 min.

Provado antes: fluxo de 40 s completo (14 planos, memoria 240 MB <= 270) em desktop/Pixel 7/iPhone; sons: base decodificada no 1o gesto, folhas dos 2 lutadores no 1o tick.

Armadilhas: (1) `echo ===S->T` no git-bash cria arquivo `T` na raiz; (2) spy de `decodeAudioData` com `.then` sem catch gera pageerror falso; (3) em `?escuta=1` o main retorna antes do `data-pronto`: esperar `#escuta`; (4) `setInterval` do AudioSys nao roda em laco manual; (5) `npm ci --prefer-offline` num worktree leva 4 s (zero risco ao node_modules real); (6) Lyra mantem vite na 5173 e 5199: e2e no worktree usa porta propria (sed 5173->5183 em playwright.config e tipografia.spec); (7) NUNCA lancar o loop de specs com `nohup ... &` dentro de `run_in_background`: o shell "completa" na hora, o loop segue orfao e uma 2a execucao concorrente clobera `test-results` (ENOENT falso); rodar `bash script > log` direto com run_in_background; (8) `taskkill` por `CommandLine -match` pode casar o proprio powershell: nao usar padrao que apareca no comando; (9) `.gitignore` apareceu modificado por outra frente no meio da QA (CONTEXTO-SESSAO.md): fora dos 3 commits.

**How to apply:** [[tecnicas-de-qa-do-projeto]]; repetir benchmarks com as flags e comparar MEDIANAS.
