---
name: validacao-final-d48cf1e
description: Validacao FINAL do HEAD d48cf1e (T5/T6/T7/T10) - specs que o commit deixou velhos, SW x page.route, jogo ARCADE flaky sob carga, memoria por luta no estado final, JPGs removidos
metadata:
  type: project
---

**Resultado:** tsc 0; vitest 145 arquivos/3144 ok/17 skipped (gerador, diag, arte-fonte); e2e completo (4 workers, servidor vite novo na 5183, config temporario na raiz apagado depois) 386 ok / 0 falhas / 240 puladas; e2e:build 18/18.

**O commit d48cf1e deixou 3 specs velhos (nao regressao de produto):** `memoria-por-luta` (BAATAR/ZENON a 0,9: fixa 185,1/231,6/189,6; por-peso 61,0/64,6/111,0/116,1), `novos-lutadores` (BAATAR agora 3 paginas, nao 4), `e2e-build/manifesto-fallback` (5 vermelhos). Vulcano so rodou 3 specs do build: rodar SEMPRE o `test:e2e:build` inteiro.

**Armadilha SW x Playwright:** com o service worker registrado no build, `page.route` NAO enxerga os pedidos que o SW atende; os specs que fingem manifesto quebrado/mp3 preso nunca disparam. Correcao: `test.use({ serviceWorkers: 'block' })` no manifesto-fallback (so o service-worker.spec tem SW ligado). Provado A/B (5 vermelhos -> 6 verdes). Nao testado: manifesto de sons quebrado COM SW ativo (o SW cache-first provavelmente esconde).

**Flaky sob carga:** `jogo.spec` ARCADE (3 lutas, KO por teclado) falhou em 2 de 4 rodadas completas com 4 workers (timeout de 40 s esperando `vs`), passa isolado em ~35 s. Endureci (300 voltas, reaproxima p1 e mantem hp do rival a cada volta); rodada final passou, mas e teste de relogio: se voltar a piscar, tornar determinista com `h.avancar`.

**Memoria por luta (estado final, motor v2 padrao com filme, por-peso, analitico w*h*4 + 17,9 base; conferido por 2 metodos: arte.memoria() no jogo e sharp nos arquivos):** HAYATOxMIN-JI 93,6 | NILAxCENTELLA 109,1 | CAIOxAMINU 103,5 | CAMILLExWEI 93,2 | HAYATOxHAYATO 60,7 | BAATARxBAATAR 78,9 | ZENONxZENON 82,5 | NILAxZENON 128,9 | BAATARxZENON 134,0. Todos dentro de 115 (comum) e 150 (pesado). Adicionei guarda no spec (total <= 115 comum / <= 150 com BAATAR/ZENON). So analitico: working set real do navegador nao medido.

**JPG antigos de cenario (cn/kr/br.jpg):** nenhuma referencia viva (git grep); `orcamento.test` usa o nome so como dado sintetico; fixtures `tests/fixtures/*-prototipo.jpg` sao outras. Removidos do disco (sem commit); nada quebrou nas rodadas finais.

**Captura real (desktop 1280):** titulo, selecao de producao (4) e com 10 liberados (todos os 10 rostos), VS, luta, filme do especial com painel de close (HAYATO x WEI LONG, cenario cn.webp), trailer P1 ("DEZ NACOES", kr.webp) manual e em tempo real: 0 pageerror/console.error/resposta >=400. Som: com as 3 folhas mp3 presas, 6 golpes iniciaram 53 nos de som (sintese cobre).

**How to apply:** [[tecnicas-de-qa-do-projeto]], [[reqa-76957be-gate-push]].
