---
name: sw-skipwaiting-pendente-e-boot-lento
description: Flake do spec SW "versão nova" (skipWaiting pendente no Chromium, nao e janela de 20 s), trailer em Fast 3G (estatico x reserva), numeros do boot - HEAD 5080310
metadata:
  type: project
---

**Flake do `service-worker.spec` "versão nova" (linha ~197, v3 não assumiu em 45 s):** NAO e raro: 4/8 no e2e:build/isolado e ~1/6..1/2 depois; sobe com carga (trace do Playwright piora: 37-58%; trace off 0/7; harness sem trace 4-20%).
Causa medida (instrumentando o sw.js do dist com prelude que registra eventos): v3 em espera recebe 'ativar' (~60 ms apos o boot), chama `skipWaiting()` e a promessa NUNCA resolve; v2 ativa sem nenhum evento pendente; v3 viva e `installed` por >80 s. NAO e a janela de 20 s (performance.now ~70 ms), nem a trava de 15 s, nem o tamanho do shell. Adiar o 'ativar' 1,5 s nao resolve; reenviar no mesmo documento nao resolve; o BOOT SEGUINTE assume (1/1 no harness, 5/5 no spec corrigido). Pular `register()` quando ja ha registro: 0/20 no harness mas no build real com o spec do Playwright ainda 7/12 (inconclusivo, nao adotado). Nao e causa interna do Chromium provada.
Correcao so no spec: 1 boot de tolerancia (12 s) e o 2o tem de assumir; 14/14 + 4/4 + e2e:build 22/22; retry usado 5x, sempre recuperou.
**Why:** a promessa do SW e "assume no boot seguinte". **How to apply:** se o spec voltar a piscar, olhar se o 2o boot tambem falha (ai e defeito real).

**Armadilhas desta rodada:** `tsc` dentro do `npm run build` falha se sobrar arquivo temporario em `tests/` (o webServer do e2e:build nao sobe: "Process from config.webServer was not able to start"). `node - <<EOF` com argv[1] vazio cria arquivo chamado `-` na raiz. CDP `ServiceWorker.enable` mascara o flake (mantem o worker vivo). Network.emulateNetworkConditions NAO estrangula o que o SW busca (target separado): para medir rede lenta no build, `serviceWorkers: 'block'` (o aviso "[sw] registro falhou ... reading 'waiting'" e artefato do block).

**Trailer em Fast 3G:** `economiaDeDados` (src/ui/trailer/ambiente.ts): effectiveType 3g/2g ou saveData => versao ESTATICA (cartoes, ~7-10 s). iPhone (WebKit) nao tem navigator.connection => trailer completo: no dev com hooks 8/14 planos viraram reserva (dois retratos + nomes, fundo azul-escuro); em producao nos primeiros segundos o cartao sai vazio (retratos so chegam na etapa 1). Toque antes do pedaco do trailer chegar => abertura antiga.
**Numeros confirmados:** boot ate data-pronto 0,913 MiB (28 arquivos, 5/5 iguais, metodo do boot-peso.spec); trailer memoria pico 145,3 MiB (P6), 146,9 com retratos e FILME, limite 150. Fast 3G: data-pronto em ~9 s, 1a visita total ~6,7 MiB.
