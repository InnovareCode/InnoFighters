---
name: qa-paginas-filme-v2-aminu-zenon-baatar
description: Prova no jogo real das paginas FILME v2 (AMINU f2, ZENON f3, BAATAR f1) 2026-10-23 sobre c864d0c + arvore de trabalho; APROVADO; como medir ampliacao, memoria-filme vermelho por ruido
metadata:
  type: project
---

**Resultado:** APROVADO. No jogo real (`motorV2.filmes`, servidor fresco na 5211, desktop e celular): AMINU sFwd mostra f2 (nao o Alt) no tick 28, ZENON chefe2/sFwd (DECRETO) mostra f3, BAATAR sDown mostra f1, todos na batida t=28. Ampliacao medida no drawImage = `|t.a| x dw/sw` = 1,0193 / 1,0193 / 1,0544 (canvas k=2 em desktop E celular; dw/sw cru e 0,51/0,51/0,527: "ampliacao" do Apolo e na resolucao 1920). Pesos decodificados na luta real: 8,906 / 8,594 / 9,521 MiB; rede 338362 / 286908 / 393844 bytes.

**Specs:** filme, filme-jogo, silhueta-no-jogo, arte-sob-demanda (desktop; celular pula) + memoria-filme: 41 ok / 6 puladas / 1 falha. Nenhum spec assumia "AMINU sem f2" (so `filme-paginas.test.ts`, que a Vega ja ajustou); unitarios de filme/roteiros/sprites 312/312, tsc limpo.

**memoria-filme "memoria dos processos" VERMELHO 3/3 hoje, sem relacao com as paginas:** HAYATO x HAYATO nao carrega nenhuma das 3 paginas e `git diff 76957be HEAD -- src public tests` e vazio (verde em 76957be). Rodada quieta (CPU 17%): folha custa +4,6 WS / +5,0 priv (carregada com x sem, OK), mas `aposPriv - semAposPriv` deu +0,44, -2,66 e -3,4 contra o limite > 3: o controle (filme tocado sem folha) varia +-8 MiB e a asserção subtrai dois valores ruidosos. Ajuste proposto: assertar o par "carregada" (com - sem em 3..20 MiB), que e estavel.

**Correcao aplicada (so memoria-filme.spec.ts, sem commit):** o ajuste que eu propus (par "carregada" em memoria PRIVADA > 3) NAO era estavel (+1,8/+3,7/+2,8). Causa: folha carregada e nao desenhada quase nao ocupa memoria; privada move +2..5 (ruido). Solucao: forcar a decodificacao (drawImage 1x1 da folha) na amostra "com" e assertar WORKING SET com - sem em (7, 30): +15/+13/+13 em 3 rodadas (+14/+12 antes), CPU max ate 91%. Controle negativo por mutacao (folha nunca carrega, copia temporaria): delta +1/-1/0 e falha 3/3 na nova asserção. Lição: metrica de memoria de processo so discrimina com sinal >> ruido (+-5); medir em working set depois de decodificar.

**Higiene das celulas (medida):** alfa>=32 verde = 0 nas 3 paginas (os "verdes" sao RGB de alfa 1-4, iguais nas celulas antigas); celulas preservadas = media pre-multiplicada <= 2,2/255 vs HEAD (reencode lossy, px com dif>=32: 0 a 2). Toque na borda da celula: AMINU f2 14 linhas no x final (ponta do mindinho, 1 px) e BAATAR f1 12 linhas (bico da bota); pe cortado na base e o desenho de todas as celulas (anel0 baixo 340-404 nas antigas). BAATAR f4 (antiga) tem 2 px verdes opacos (pre-existente).

**Tecnica:** espiao de `drawImage` com 8 args + `folhas().includes(img)` (copiado de `ESPIAR_PAINEL` do filme-jogo), celula identificada por casar x,y,w,h com o atlas; `sharp` esta em node_modules para recortar/ampliar PNG e comparar celulas HEAD x arvore (`git show HEAD:...webp`). Spec temporario em `tests/e2e/zz-*.spec.ts` + config `playwright.iris.config.ts` na raiz (apagados depois), porta propria com `--strictPort`, matar so o PID da porta propria (a 5173 e da Lyra).

**How to apply:** ver [[qa-v2-3e-filme]], [[reqa-76957be-gate-push]], [[tecnicas-de-qa-do-projeto]].
