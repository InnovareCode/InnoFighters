# Desempenho no Android: medição em Chromium emulado (2026-10-24)

Pedido do dono: "jogo lento, com alguns lags, golpes com muitos delays". **Entrega PARCIAL** (1h40 de medição; o que falta está na seção 9). Nenhum arquivo do
repositório foi alterado; tudo abaixo vem de builds temporários e scripts no scratchpad da Íris (não versionados).

## 0. Veredito em 10 linhas

1. **Não há aparelho Android aqui.** Medi um Chromium 156 emulando Pixel 7 (viewport 863x360, DPR 2,625, toque real por CDP `Input.dispatchTouchEvent`, rede 4G de 9 Mbit/s e 100 ms),
   com `Emulation.setCPUThrottlingRate` 1x, 4x e 6x. O CPU da máquina (Xeon E5-2650 v4) tem desempenho de 1 thread parecido com o de um Pixel 7 (comparação **de memória, não medida**);
   logo 4x ~ Android médio/baixo e 6x ~ Android de entrada. O que a emulação NÃO reproduz: a GPU. Usei uma RTX 3050 (raster quase de graça) e, no outro extremo, canvas em CPU (raster caríssimo).
   O Android real está entre os dois (seção 1.2).
2. **Main thread com CPU 4x: a luta já consome ~93% do tempo da thread** (`Performance.TaskDuration`, 85 Hz, luta normal), com **11,9% dos quadros acima de 16,7 ms** e p99 de 52 ms. A 6x: **77% acima de 16,7 ms, mediana 30 ms (27 fps)**.
3. **A tela de SELEÇÃO é a pior tela de menu**: 28,5% (4x) e 100% (6x) dos quadros acima de 16,7 ms. Desenho 8,7 ms a 4x contra 5,3 ms na luta. Causa NÃO diagnosticada.
4. **O trailer (a primeira coisa que o jogador vê) engasga**: p99 de 320 ms a 4x e 1,66 s a 6x.
5. **Especial comum (faixa fina), filme de KO e tarja do SUPER** são as fases de luta mais caras: 30-45% dos quadros acima de 16,7 ms a 4x (luta normal: 12%) e p99 de 290-440 ms (picos de "primeira vez").
6. **Latência toque -> golpe**: motor responde no MESMO tick (0 ticks), mas o caminho do toque soma ~31-39 ms até o desenho (teclado: 7-12 ms) e o golpe só fica ativo 81 ms (soco leve) a 183 ms (chute forte) depois do toque. **Com a barra de especial cheia, soco forte e chute forte esperam 3 ticks a mais (+50 ms, medido).**
7. **Joystick virtual: confirmado no navegador**: com o polegar a 25 graus acima da horizontal o personagem PULA, a 22 graus abaixo AGACHA e para; soltar 35 ms e repetir vira DASH (10/10 vezes a 1x), e o dash engole o golpe (8/8 perdidos se apertado 40-100 ms depois).
8. **Resolução do canvas (`RS = 2`, 1920x1080) e `imageSmoothingQuality = 'high'` não pesam no JavaScript (5,3 ms vs 5,1 ms a 4x com GPU), pesam no raster**: com canvas em CPU, `RS = 1` leva o desenho de 14,0 ms para 4,0 ms (13 -> 50 fps) e `'low'` leva 13 -> 31 fps. Em GPU de celular é **estimativa**, não medida (seção 6).
9. **GC**: uma coleta MAIOR a cada ~3-4 s, inclusive nos menus, com pausa de 20-76 ms a 4x (4,5 quadros). Não é o áudio (testado sem `AudioContext`). Causa não identificada.
10. **As 3 correções de desenho com mais ganho de FPS** (seção 8): (1) canvas adaptativo `RS` 1-1,5 no celular; (2) `imageSmoothingQuality = 'low'` (e um passe só para cenário+vinheta); (3) tirar trabalho da main thread por quadro (cache offscreen do texto/HUD, menos `save/restore`, zero alocação em `Fluidez.vista`, pré-aquecer a textura da página FILME).

## 1. Método e limites

### 1.1 O que foi medido

- **Build medido: `d350d27`.** `vite build` do working tree limpo (quando medi nada em `src/` estava modificado) e, para conferir, `git archive d350d27` + `npm ci` real (sem junction): os bundles
  diferem em 4 bytes (a string da identidade do build: 421.312 contra 421.308 B). `vite preview` em portas próprias (5390 a 5394), SW bloqueado (e uma rodada com SW ligado, sem diferença: seção 3.4).
- **Dois bundles por commit**: o de produção puro (`dist-prod`, sem ganchos) e um de produção minificado com `import.meta.env.DEV = true` forçado pelo `define` de um config temporário no scratchpad
  (`dist-hooks`, só para ter `window.__inno` com o laço real de `main.ts`, NÃO `?manual=1`). Uma rodada do puro mostrou o mesmo comportamento (frame p50 de 0,5 ms de JS na tela de abertura).
- **Laço real**: `requestAnimationFrame` embrulhado por um init script (timestamp, início e fim do callback), `ui.update`/`ui.draw` embrulhados para somar ms e contar ticks por quadro,
  `PerformanceObserver` de `long-animation-frame`, `longtask` e `event`. Cada quadro é classificado pela cena (`ui.name`) e, na luta, pela fase (`luta:normal`, `hitstop`, `faixa-fina`, `tarja-super`, `filme`...).
- **Jogador por toque real**: um bot lê o estado do jogo e aperta joystick (id 10) e botões (`#touch .b`) por `Input.dispatchTouchEvent`, contra a CPU NORMAL (HAYATO, seed fixa); especial, SUPER (barra a 100) e KO foram provocados
  com o estado ajustado e o dedo real nos botões.
- **Duas bases de tempo**: (a) **sem limite de vsync** (`--disable-gpu-vsync --disable-frame-rate-limit`): é o ritmo em que o navegador entrega quadros; "% acima de 16,7 ms" = quadros que NÃO caberiam num celular de 60 Hz.
  É a tabela principal. (b) A 85 Hz de vídeo (o monitor desta máquina; `--limit-fps=60` não funcionou): usada em GC, latência e como conferência.

### 1.2 O que a emulação não é (leia antes de confiar nos números)

| Efeito | Como entra aqui | Consequência |
|---|---|---|
| CPU do aparelho | `setCPUThrottlingRate` 4x e 6x (só renderer) | razoável para JS e para o trabalho da main thread |
| GPU / raster | RTX 3050 (`2d_canvas: enabled`): quase gratuito. Contra-prova: canvas em CPU (headless shell, `2d_canvas: unavailable_software`): caro demais | o tempo de raster de um Mali/Adreno de entrada **não foi medido**; está entre as duas pontas |
| Tela do aparelho / compositor / digitalizador | não existe; o toque vai por CDP | latência de toque do aparelho real é MAIOR que a medida (somar o varrimento do digitalizador e 1-2 vsyncs de apresentação) |
| Memória do aparelho (matar a aba) | não reproduzida | só números de residência (seção 7) |
| Ruído | outros Chromes abertos na máquina; quadros esparsos de 80-200 ms com 0,5 ms de JS aparecem em 1x e 4x | por isso repeti o 4x duas vezes (tabelas 2a e 2b) e uso o p95/p99 com cautela |

Tentei também SwiftShader como "GPU lenta": 3 fps e 330 ms por quadro, inutilizável como modelo; descartado.

## 2. Tempo de quadro por fase (item 1)

Colunas: `n` quadros, `p50/p95/p99` do intervalo entre quadros (ms), `%>16,7` e `%>33` = parcela dos quadros com intervalo acima de 16,7+1,5 ms e 33,4+1,5 ms,
`JS` = custo do callback do jogo (`update`+`draw`) p50/p95, `t/q` = ticks de lógica por quadro. Sem limite de vsync. Dados brutos: `res/unc-gpu-{1,4,6}x.json`, `unc-gpu-4x-b.json` (scratchpad).

### 2a. CPU 1x (referência: um celular tão rápido quanto esta máquina)

| Fase | n | p50 | p95 | p99 | %>16,7 | %>33 | JS p50/p95 | t/q |
|---|--:|--:|--:|--:|--:|--:|--|--:|
| Título | 1532 | 3,3 | 4,9 | 7,4 | 0,4 | 0,3 | 0,5/2,1 | 0,20 |
| Menu | 1096 | 1,3 | 4,3 | 124 | 1,7 | 1,7 | 0,4/0,9 | 0,23 |
| Seleção | 1532 | 2,0 | 54 | 90 | 5,8 | 5,4 | 1,0/1,7 | 0,40 |
| VS | 769 | 3,5 | 6,0 | 9,7 | 0,4 | 0,3 | 0,3/0,5 | 0,23 |
| Luta normal | 22783 | 1,2 | 3,5 | 36 | 1,7 | 1,4 | 0,6/1,9 | 0,13 |
| Especial comum (faixa fina) | 1375 | 1,2 | 4,1 | 37 | 1,7 | 1,7 | 0,8/1,3 | 0,14 |
| SUPER (tarja grande) | 466 | 1,1 | 5,3 | 92 | 2,4 | 1,9 | 0,7/2,6 | 0,18 |
| SUPER (sequência inteira, 5 acertos) | 7506 | 1,2 | 3,1 | 36 | 1,6 | 1,4 | 0,6/2,0 | 0,12 |
| Filme de KO | 476 | 1,2 | 3,5 | 36 | 1,7 | 1,7 | 0,8/1,0 | 0,13 |
| Trailer | 19509 | 0,6 | 1,7 | 10,6 | 0,4 | 0,3 | 0,2/0,7 | 0,06 |

### 2b. CPU 4x (Android médio) — duas rodadas independentes (A e B)

| Fase | n (A/B) | p50 A/B | p95 A/B | p99 A/B | %>16,7 A/B | %>33 A/B | JS p50/p95 (A) | t/q (A) |
|---|--:|--|--|--|--|--|--|--:|
| Título | 724/671 | 7,7/7,1 | 10,5/15,5 | 15/35 | 1,0/2,4 | 0,6/0,9 | 3,3/4,1 | 0,51 |
| Menu | 549/633 | 9,2/7,7 | 13/11 | 26/16 | 1,3/0,9 | 0,5/0,2 | 3,9/5,1 | 0,59 |
| **Seleção** | 550/570 | 16,6/15,8 | 35/35 | 38/52 | **28,5/25,3** | 4,5/3,5 | 9,1/12,8 | 1,09 |
| VS | 392/332 | 6,9/6,7 | 12/16 | 51/92 | 4,6/4,2 | 2,6/3,6 | 2,1/3,0 | 0,52 |
| **Luta normal** | 3727/4318 | 10,7/9,3 | 29/30 | 52/46 | **11,9/12,4** | 2,2/1,9 | 5,9/9,2 | 0,79 |
| Hitstop (frames congelados) | 122/80 | 12,7/12,0 | 38/44 | 43/77 | 33,6/31,3 | 6,6/8,8 | 7,3/15,1 | 1,02 |
| **Especial comum (faixa fina)** | 210/195 | 13,6/14,5 | 58/63 | 294/370 | **29,5/44,6** | 11,9/19,5 | 7,2/14,7 | 1,23 |
| **SUPER (tarja grande)** | 117/80 | 10,0/8,8 | 33/29 | 38/378 | 11,1/13,8 | 4,3/1,3 | 6,2/10,4 | 0,78 |
| SUPER (sequência inteira) | 1368/1464 | 10,7/9,1 | 16/26 | 33/34 | 3,6/7,3 | 0,8/0,8 | 6,0/8,3 | 0,70 |
| **Filme de KO** | 78/56 | 12,1/11,6 | 52/46 | 444/390 | **34,6/30,4** | 10,3/14,3 | 7,2/16,1 | 1,18 |
| Provocação | 674/665 | 6,7/6,5 | 15/18 | 33/46 | 2,7/5,0 | 0,9/1,2 | 4,3/9,5 | 0,53 |
| **Trailer** | 1584/1852 | 4,4/3,9 | 23/13 | **321/202** | 5,6/3,9 | 3,5/2,8 | 1,9/5,4 | 0,48 |

### 2c. CPU 6x (Android de entrada)

| Fase | n | p50 | p95 | p99 | %>16,7 | %>33 | JS p50/p95 | t/q |
|---|--:|--:|--:|--:|--:|--:|--|--:|
| Título | 356 | 16,5 | 34 | 108 | 18,0 | 3,7 | 7,6/9,5 | 1,10 |
| Menu | 269 | 18,8 | 36 | 53 | 62,1 | 12,6 | 8,1/11,3 | 1,22 |
| **Seleção** | 279 | 33,7 | 52 | 110 | **100** | 42,3 | 18,9/25,6 | 2,19 |
| VS | 159 | 15,8 | 78 | 177 | 20,8 | 8,2 | 5,4/10,4 | 1,26 |
| **Luta normal** | 1300 | 30,2 | 85 | 154 | **77,3** | 38,7 | 15,0/41,7 | 2,12 |
| Hitstop | 38 | 43 | 100 | 109 | 94,7 | 65,8 | 29/102 | 2,92 |
| Especial comum | 66 | 51 | 157 | 953 | 95,5 | 75,8 | 24/65 | 3,55 |
| SUPER (tarja grande) | 25 | 48 | 271 | 1577 | 100 | 72,0 | 24/74 | 3,44 |
| SUPER (sequência inteira) | 470 | 28 | 85 | 136 | 75,1 | 34,5 | 13/43 | 2,04 |
| Filme de KO | 17 | 127 | 1611 | 1611 | 100 | 100 | 33/263 | 5,06 |
| Trailer | 290 | 10,3 | **253** | **1662** | 18,3 | 13,8 | 3,1/53 | 1,31 |

Leitura:
- **Quanto cada fase derruba o FPS (4x, luta normal = referência de 12% dos quadros lentos):** seleção +14 pontos percentuais acima da luta; especial comum +18 a +33; filme de KO +18 a +23; hitstop +20; trailer não é lento na mediana, mas tem engasgos de 200-320 ms (p99).
- **A 6x nada se salva**: a luta normal roda a 27 fps de entrega e 2,1 ticks por quadro; o jogo ainda mantém a velocidade (acumulador), mas cada toque só é lido a cada 30 ms.
- **O custo cresce mais que 4x** de 1x para 4x (desenho de luta: 0,6 -> 5,3 ms, 8x; seleção 1,0 -> 8,7, 9x): o throttle também pune o trabalho nativo do navegador, não só o JS.
- Em 1x (celular rápido) tudo está bem: 98% dos quadros dentro de 16,7 ms. O problema do dono é de aparelho médio para baixo.
- **Conferência a 85 Hz** (rodadas de memória e `fases-gpu-*x.json`): luta normal 4x = 35,8% dos quadros acima de 16,7 ms, p95 36 ms, p99 70 ms, 52,6 fps de entrega; 1x = 0,8%.

### 2d. Dois builds do mesmo commit: padrão contra `?ritmo=0`

O especial comum em `?ritmo=0` volta ao comportamento de antes de `f92bbcf`: a cinemática congela a luta. Medido (CPU 4x, `res/unc-gpu-4x-ritmo0.json`):

| | Padrão (`d350d27`) | `?ritmo=0` |
|---|---|---|
| Especial comum | faixa fina de 0,16-0,93 s **sem congelar** (`luta:faixa-fina`) | **congela 0,77-0,79 s** em 8 de 8 ocorrências (`luta:tarja-esp`, 48 ticks) |
| Quadros acima de 16,7 ms no especial | 29,5% / 44,6% | 24,8% |
| SUPER | tarja congela 0,41-0,86 s | sem super |
| Luta normal | 11,9% / 12,4% | 10,3% |

Se o dono jogou um build anterior a `f92bbcf` (ou com `?ritmo=0`), cada especial comum parou a tela por ~0,8 s: isso por si só é "golpe com delay". **Não consegui saber qual build ele jogou**: o site publicado não foi consultado nesta rodada (sem rede para o domínio) e `version.json` é do build local.

## 3. Latência toque -> golpe (item 2)

Método: laço real, p1 parado no chão (HAYATO), p2 sem IA longe, 14 repetições por célula, toque CDP (70 ms de contato) e, para comparar, teclado CDP (`Input.dispatchKeyEvent`, mesmo `teclado.ts`).
Instrumentos: `touchstart`/`keydown` em captura (`event.timeStamp` e hora do tratador), `ui.update` por tick (estado do P1 depois do tick), `ui.draw` por quadro. **A**: do evento ao tratador. **B**: do tratador ao tick que abriu o golpe.
**C**: do tick ao fim do `draw` que mostra a pose. Total = evento -> fim do desenho (a apresentação na tela, 1-2 vsyncs, **não** está incluída). p50 em ms (p95 entre parênteses nos casos relevantes).
Bruto: `res/latencia-gpu-{1,4,6}x.json`.

### 3.1 CPU 1x (barra de especial em 60, a menos que dito)

| Ação | via | A evento->tratador | B tratador->tick | C tick->desenho | **Total** (p95) | Ticks de espera no motor | Startup S (ticks) | Evento -> golpe ATIVO |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| Soco leve | toque | 19,6 | 10,6 | 0,9 | **35,4** (47,5) | 0 | 3 | 81 ms |
| Chute leve | toque | 19,0 | 10,4 | 0,8 | 31,9 (47,9) | 0 | 5 | 114 |
| Soco forte | toque | 21,8 | 21,2 | 0,9 | 39,1 (47,6) | 0 | 7 | 155 |
| Chute forte | toque | 18,7 | 10,3 | 0,8 | 35,0 (46,0) | 0 | 9 | 183 |
| Especial (ESPECIAL) | toque | 20,6 | 9,8 | 1,6 | 31,0 (46,3) | 0 | 14 | 264 |
| **Soco forte, barra CHEIA** | toque | 19,3 | **67,3** | 0,9 | **84,1** (93,1) | **3** | 7 | 200 |
| **Chute forte, barra CHEIA** | toque | 20,8 | **65,1** | 1,2 | **83,5** (93,6) | **3** | 9 | 233 |
| Soco leve, barra cheia | toque | 18,5 | 10,3 | 0,8 | 33,0 | 0 | 3 | 80 |
| Botão SUPER, barra cheia | toque | 18,8 | 9,7 | 1,7 | 32,5 (47,0) | 0 | 4 (+30 de tarja) | 598 |
| Soco leve | teclado | 0,3 | 9,8 | 0,9 | 11,9 | 0 | 3 | 60 |
| Soco forte | teclado | 0,3 | 5,0 | 0,8 | 6,6 | 0 | 7 | 121 |
| Soco forte, barra cheia | teclado | 0,3 | 54,6 | 0,7 | 55,6 | 3 | 7 | 172 |
| Chute forte, barra cheia | teclado | 0,3 | 51,8 | 0,8 | 52,9 | 3 | 9 | 204 |

### 3.2 Com CPU 4x e 6x (toque, barra em 60)

| Ação | 4x: A | 4x: C | 4x: **Total** (p95) | 6x: A | 6x: C | 6x: **Total** (p95) |
|---|--:|--:|--:|--:|--:|--:|
| Soco leve | 32,2 | 7,1 | 41,9 (56,9) | 34,1 | 14,5 | 56,8 (**176**) |
| Chute leve | 29,1 | 6,2 | 39,8 (54,4) | 27,9 | 10,0 | 46,7 (74,7) |
| Soco forte | 27,9 | 5,3 | 36,3 (73,1) | 44,1 | 13,2 | 60,3 (**165**) |
| Chute forte | 26,9 | 5,9 | 37,9 (66,2) | 35,5 | 10,3 | 50,1 (82) |
| Especial | 30,1 | 12,0 | 45,1 (**434**) | 54,5 | 32,4 | 106 (**921**) |
| Soco forte, barra cheia | 28,7 | 5,3 | **86,4** (93,8) | 36,2 | 12,5 | **103,5** (258) |
| Botão SUPER | 27,3 | 9,7 | 42,1 (62,4) | 49,1 | 17,6 | 69,8 (156) |

### 3.3 De onde vem cada pedaço (medido, com o que NÃO foi medido)

| Origem | Medido | Evidência |
|---|---|---|
| **Entrada de toque** (`toque.ts`: `touchstart` com `preventDefault`) | **~19 ms a mais que o teclado em 1x (p95 25), 27-32 ms em 4x, 28-54 ms em 6x**. O tratador em si custa microssegundos. Parte disso é do caminho de entrada do Chromium (compositor -> main thread) e **parte pode ser artefato do CDP**; o aparelho real soma ainda o varrimento do digitalizador. Teclado pelo mesmo CDP não paga isso (0,3 ms), então não é só o CDP. | EXECUTADO |
| **Laço de passo fixo** (`main.ts` `acc += min(dt,100)`) | 0 a 1 tick de espera: p50 5-10 ms, p95 ~22 ms (1x) e 17-27 ms (4x). É o previsto: o passo de 16,7 ms contra quadros de 11,7 ms. Com quadros longos (6x) o tratador roda no mesmo quadro mas o tick só roda quando `acc >= PASSO`. | EXECUTADO |
| **Motor** | **0 ticks** para leve/forte/especial/SUPER com barra < 100 (confirma a auditoria da Vega, A1). **3 ticks (50 ms) para soco forte/chute forte com a barra CHEIA** (`aguardandoParDoSuper`), por teclado e por toque; o botão SUPER e o soco/chute leve não esperam. | EXECUTADO |
| **Startup nos dados** | lp 3, lk 5, hp 7, hk 9, especial 14 ticks (HAYATO): o golpe só "bate" 50, 83, 117, 150 e 233 ms depois de começar. É a tabela base do protótipo; Vega a classifica dentro da faixa dos jogos de luta. | LIDO + EXECUTADO |
| **Interpolação de render** (fluidez v2) | A **pose** aparece no 1o desenho depois do tick (C = 0,8-1,7 ms em 1x; o nome da pose não é interpolado). O que a interpolação atrasa é a **posição**: o desenho mostra o estado entre o tick anterior e o atual, ou seja, até 1 tick (16,7 ms, média 8,3 ms) de atraso visual de movimento. | pose EXECUTADO; atraso de posição só LIDO em `fluidez.ts` |
| **Desenho** (C) | 0,9 ms em 1x, 5-7 ms em 4x, 10-15 ms em 6x (p95 até 790 ms em `lk` 6x por um quadro de pico). | EXECUTADO |
| **Apresentação na tela** | Não medido: +1 a 2 vsyncs (17-33 ms). | NÃO MEDIDO |

**Conclusão da latência:** o golpe sai no tick certo, mas o jogador só vê o soco leve iniciar ~35-45 ms depois do dedo (celular médio, mais a apresentação) e o golpe só "acerta" 80-180 ms depois.
Os itens evitáveis por código são: a espera de 3 ticks do soco/chute forte com a barra cheia (+50 ms, que é exatamente quando o jogador mais quer o golpe) e o atraso do toque (verificar se `touchstart` passivo sem `preventDefault` reduz; não testei).

### 3.4 SW ligado

Uma rodada a 4x com o service worker liberado (`res/unc-gpu-4x-sw.json`): luta normal 9,6% acima de 16,7 ms (contra 11,9% e 12,4% sem SW), p95 27 ms. Sem diferença fora do ruído.

## 4. Hipóteses da Vega sobre entrada (confirmar ou derrubar)

Joystick medido no DOM real: `#joy` tem **92,4 px de largura (raio 46,2 px)** no Pixel 7 em paisagem; o polegar foi levado a 0,85 do raio com desvio angular `a` (graus acima da horizontal, empurrando para a direita), 450 ms de contato. Bruto: `res/entrada-gpu-{1,4,6}x.json`.

| # | Hipótese | Veredito | Prova |
|---|---|---|---|
| 1 | Joystick sem histerese/zona angular: pulo/agachar/dash por deriva | **CONFIRMADA** | 1x, 4x e 6x idênticos: de 0 a 22 graus acima = anda; **25, 30, 35 graus = `prejump` -> `jump` -> `land`** (o personagem PULA); de -10 a -19 = anda; **-22, -25, -30 graus = `crouch` e para**. Oscilação: direita 85 ms / soltar 35 ms / direita = **DASH 10/10 (1x), 8/10 (4x), 4/10 (6x)**; 60/35: 10/10, 10/10, 7/10; 85/70 e 100/100: 0-2/10. |
| 2 | Direção tocada por menos de 1 quadro some em quadro baixo | **NÃO REPRODUZIDA AINDA** | toques de baixo com 8 a 100 ms (mais a ida e volta do CDP) apareceram **20/20** em todos os níveis; o teste de verdade (down+up empilhados sem espera, CPU 16x) está escrito (`toque-curto.mjs`) e **não rodou** |
| 3 | Par do SUPER espera 3 ticks com a barra cheia | **CONFIRMADA** | seção 3.1: 3 ticks (+50 ms) em soco forte e chute forte, toque e teclado, 14/14 em cada |
| 4 | Dash bloqueia o ataque e o buffer de 9 ticks expira | **CONFIRMADA** | duplo toque (45 ms, 70 ms de intervalo) e soco leve N ms depois do 2o toque: 40 ms e 100 ms depois = **perdido 8/8** (1x); 200 ms = sai 17 ticks depois do início do dash (283 ms); 300 ms = 20 ticks; 400 ms = 25 ticks. A 4x/6x o dash nem sempre dispara ("nodash"), o que também é variável por quadro baixo |
| 5 | Custo de desenho: `RS=2`, smoothing 'high', alocações | **PARCIAL** | `RS` e smoothing: seção 6 (pesam no raster, não no JS). Alocações: `Fluidez.vista` espalha `{...f}` 2x por quadro; GC menor medido (seção 7), efeito direto não isolado |

## 5. Custos de renderização por quadro (item 3)

### 5.1 Perfil de CPU do Chromium (CDP `Profiler`, build não minificado `dist-prof`, CPU 4x, luta normal)

O profiler distorce (a luta caiu a ~43 fps durante a amostra; "ativo" = 20,6 ms por quadro contra 2,25 ms a 1x); use só a **proporção**. ms por quadro, `res/perfil-gpu-4x.json`:

| # | Item | ms/quadro | Observação |
|---|---|--:|---|
| 1 | `(program)` — trabalho nativo da main thread fora do JS (gravação do canvas, estilo/paint/commit, composição do DOM de toque) | **12,24** | ~60% do ativo; não dá para abrir mais com o profiler |
| 2 | `textoArcade` (JS: texto com contorno) | 0,97 | |
| 3 | `restore` | 0,96 | 60 pares `save/restore` por quadro |
| 4 | `drawImage` | 0,63 | só 8 por quadro, mas 5,6 Mpix |
| 5 | `strokeText` | 0,55 | |
| 6 | `fill` | 0,48 | 53 por quadro |
| 7 | `save` | 0,46 | |
| 8 | `desenharLado` (HUD, JS) | 0,40 | |
| 9 | `fillText` | 0,35 | |
| 10 | `fillRect` | 0,33 | 76 por quadro |
| — | GC | 0,21 | |
| — | `ellipse` (sombras, 36 por quadro) | 0,20 | |

**Texto somado** (`textoArcade` + `strokeText` + `fillText` + `set font`) = ~2,1 ms de ~20 (10%) por quadro: é o maior custo NOMEADO. Na faixa/tarja/super o `set font` sobe (0,42-0,46).
No especial e no super o perfil é parecido (13,7 e 12,8 ms ativos; `(program)` 6-7 ms).

### 5.2 Contagem de chamadas por quadro (`CanvasRenderingContext2D` embrulhado, 1x, luta normal; `res/opscount-gpu-1x.json`)

| Chamada | luta normal | faixa fina | tarja SUPER | filme | provocação |
|---|--:|--:|--:|--:|--:|
| `drawImage` | 8,1 | 9,7 | 9,0 | 9,8 | 14,9 |
| `fillRect` | 76 | 84 | 83 | 89 | 62 |
| `fill` (paths) | 53 | 62 | 48 | 70 | 73 |
| `fillText` + `strokeText` | 19 | 22 | 20 | 25 | 62 |
| `createLinearGradient` | 11,3 | 12,4 | 12,0 | 12,6 | 13,0 |
| `createRadialGradient` | 0,4 | 4,5 | 1,0 | 3,2 | 1,9 |
| `addColorStop` | 25,5 | 39,7 | 31,0 | 37,2 | 31,0 |
| `save` / `restore` | 60 / 60 | 67 / 67 | 63 / 63 | 68 / 68 | 121 / 121 |
| `ellipse` | 36 | 36 | 36 | 36 | 57 |
| `shadowBlur` ligado | 1,2 | 3,4 | 2,0 | 2,7 | 1,4 |
| `fillStyle` atribuído | 76 | 85 | 72 | 94 | 153 |
| **Área pintada** (device px, `drawImage`+`fillRect`) | **6,8 Mpix** | 8,9 | 8,1 | 9,5 | **18,6** |

O canvas tem 2,07 Mpix: **a luta pinta ~3,3 telas por quadro; a provocação, 9**. Onze gradientes lineares novos por quadro (HUD e barras) e ~400 chamadas de contexto. `shadowBlur` quase não é usado (1 a 3 por quadro).
Comparação com a alegação da auditoria ("alocação por quadro"): o `createLinearGradient` por quadro existe, mas pesa pouco no JS.

### 5.3 Custo de raster com canvas em CPU (1x, `res/ops-soft-1x.json`)

No canvas em software o tempo aparece quase todo em `restore` (13,8 ms/quadro) — é onde o Skia descarrega a fila, não dá para atribuir por chamada. Por isso o ranking por componente deve vir de ABLAÇÃO (suprimir o componente e medir). Está escrita (`ablacao.mjs`) e **não rodou**: ver seção 9.
O que a comparação entre builds já dá: seção 6.

### 5.4 Picos de "primeira vez"

`tarja-super`, `faixa-fina` e `filme` têm p99 de 290-440 ms a 4x (e 1,6 s a 6x) com JS de ~1 ms no quadro lento: o atraso não está no `update`/`draw` do jogo. Hipótese forte (NÃO provada): a primeira
`drawImage` de um recorte da página FILME (rosto da faixa, `faixa-rosto.ts`) obriga o upload da textura inteira. O `aquecer` de `fight.ts` pré-pinta tarjas na abertura, mas não toca na textura da página FILME.
Apoio: a 1x o p99 dessas fases já é 37-92 ms contra 36 ms da luta normal.

## 6. `RS = 2` e `imageSmoothingQuality = 'high'` (conclusão do item 4 da Atlas)

Builds temporários do mesmo commit com uma linha trocada em `src/render/tela.ts` (`RS = 1`; `imageSmoothingQuality = 'low'`), medidos com **CPU 1x e canvas em software** (onde o raster é a conta) e com GPU real a 4x:

| Variante | Canvas em CPU (1x): desenho p50 | entrega | % quadros >16,7 | GPU RTX 4x: JS de desenho p50 | GPU 4x: % >16,7 (luta) |
|---|--:|--:|--:|--:|--:|
| Atual (`RS=2`, 'high') | **14,0 ms** | **13,3 fps** (p50 67 ms) | 100% | 5,3 | 11,9 / 12,4 |
| `RS = 1` (canvas 960x540) | **4,0 ms** | **50 fps** (p50 16,7) | 19,9% | 5,1 | 15,6* |
| smoothing 'low' | 13,8 ms | **30,6 fps** (p50 33) | 89,3% | 5,2 | 20,4* |

\* a GPU RTX absorve o raster; a variação de 12% a 20% entre rodadas não indica ganho nem perda (o JS de desenho não muda: 5,3/5,1/5,2 ms) e mostra o tamanho do ruído desta máquina.

- **Em CPU, a resolução pesa 3,5x no desenho e `'high'` custa ~34 ms por quadro FORA do callback** (o desenho em si não muda: 14,0 contra 13,8; o que cai é o intervalo entre quadros, 67 -> 33 ms).
  Seleção: 80 ms por quadro de desenho a 1x no software com RS=2 (p95) contra 21,7 com RS=1; tarja e filme: 20 contra 5-7 ms.
- **Em GPU de celular não medi.** O que a medição diz é: o custo de resolução/qualidade NÃO está no JavaScript; está no raster. Ele só aparece se o aparelho for limitado por preenchimento de pixels
  (Mali-G52, Adreno 610 e semelhantes). A conta de pixels é objetiva: 6,8 Mpix pintados por quadro de luta com `RS=2` (3,3x o canvas) e 18,6 Mpix na provocação; com `RS=1` seriam 1,7 e 4,7. **Estimativa (modelo, não medição):**
  um aparelho de entrada com ~1-3 Gpix/s efetivos gasta 2-7 ms só nessa pintura com `RS=2`, e 0,6-1,7 ms com `RS=1`.
- A canvas é então desproporcional ao tamanho em que aparece: na emulação de Pixel 7 o canvas fica em 640x360 px CSS (= 1680x945 px de dispositivo), e o backing store é 1920x1080: `RS=1.5` (1440x810) já seria nítido.
- Recomendação: `RS` adaptativo (2 em desktop, 1,5 ou 1 em toque) decidido pelo p95 do quadro nos primeiros segundos (a Vega/Lyra já propõem em U3). O oráculo de pixel depende de `RS = 2`: manter no desktop.

## 7. GC e memória (item 4)

Rodadas completas (boot -> trailer -> título -> menu -> seleção -> luta 30 s -> especial/SUPER -> KO -> resultado -> volta ao menu -> menu -> seleção), 85 Hz, com `Tracing` (`v8`, `devtools.timeline`) e `Performance.getMetrics`. Bruto: `res/memoria2-gpu-4x.json` (relógios alinhados), `res/memoria-gpu-{1,4}x.json`.

| Fase (CPU 4x) | duração | Coletas MAIORES (n, soma, máx) | Coletas menores (n, soma, máx) | Main thread ocupada | Script |
|---|--:|--|--|--:|--:|
| Luta normal | 30 s | 7, 213 ms, **45 ms** | 18, 77 ms, 6,2 ms | **93%** | 43% |
| Especial + SUPER | 16 s | 6, 199 ms, **57 ms** | 6, 26 ms | 92% | 51% |
| KO / filme | 7 s | 2, 60 ms, 38 ms | 6, 23 ms | 82% | 36% |
| Resultado | 4 s | 1, 16 ms | 0 | 55% | 27% |
| **Volta ao menu (após a luta)** | 20 s | 6, 188 ms, **76 ms** | 15, 55 ms | 87% | 44% |
| Menu | 6 s | 1, 35 ms | 4, 14 ms | 97% | 45% |
| Seleção | 9 s | 3, 58 ms, 20 ms | 9, 30 ms | 87% | 43% |

- **A 1x (`memoria-gpu-1x.json`)**: 46 coletas maiores em ~160 s (uma a cada ~3,5 s), mediana 5,8 ms, máx 13,5 ms; 37 menores de 0,9 ms. Heap de JS entre 8 e 13 MiB. **A 4x**: 26 maiores, mediana 29 ms, **máx 76 ms** (= 4,5 quadros sem desenho); menores 3,9 ms de mediana.
- **O heap de JS é minúsculo (9-13 MiB), mas há uma coleta maior a cada 3-4 s, também nos menus, onde quase nada é alocado.** Testei se é o áudio: com `window.AudioContext` indefinido (`res/memoria3-mudo-gpu-4x.json`) as coletas maiores continuam (11 em 30 s na luta, máx 53 ms). **Não é o áudio.** Causa não identificada;
  suspeita (não provada): pressão de memória externa (imagens/canvas decodificados) acionando coleta (`V8.GCHandleGCRequest` apareceu 21 vezes, 764 ms no total, na rodada de 4x).
- **Residência por peso**: a arte contabilizada (`arte.memoria().imagens`) vai de 59-78 MiB nas lutas a **117 MiB** na tela de resultado, volta a 78 MiB; ficou dentro do orçamento (115/150 MiB; o pico de 117 provavelmente é o resultado somado ao FILME ainda residente (não verifiquei a composição)).
  Na volta ao menu, a 4x, **24% dos quadros ficam acima de 16,7 ms e p99 de 57 ms** (menu logo depois da luta: 29% e 92 ms) contra 0,2% a 1x: a decodificação em segundo plano disputa a main thread no aparelho lento.
- Tarefas longas (>= 50 ms): 4x = 79-98 ao longo de ~130 s (luta normal: 31 em 30 s); 1x = 17 no total (4 na luta normal). Em 4x são 13% do tempo.

## 8. Causa provável de cada lag/delay e correções priorizadas

### 8.1 Causas

| Sintoma | Causa provável | Nível |
|---|---|---|
| "Jogo lento" em aparelho médio | main thread a 93% com 4x (desenho 5,3 ms JS + ~12 ms nativo por quadro com profiler), coleta maior a cada 3-4 s (20-76 ms), 11-12% dos quadros lentos na luta, 25-28% na seleção | EXECUTADO (a proporção do raster em GPU de celular é estimativa) |
| "Lags" | (a) coletas maiores periódicas; (b) picos de 290-440 ms na primeira tarja/filme/faixa; (c) trailer com p99 de 200-320 ms; (d) decodificação em segundo plano ao voltar ao menu | (a),(c),(d) EXECUTADO; (b) causa HIPÓTESE |
| "Golpes com delay" | toque +20-30 ms sobre o teclado; soco/chute forte com barra cheia +50 ms; startup 7-9 ticks nos fortes (117-150 ms); dash que engole o golpe (até 283 ms); em 6x o toque só é lido a cada 30 ms; em builds anteriores a `f92bbcf`, 0,8 s de congelamento por especial | EXECUTADO, menos o build do dono (NÃO verificado) |
| "Faz o que eu não pedi" | joystick sem zona angular: pula a 25 graus, agacha a 22 graus, dash por oscilação de 35 ms | EXECUTADO |

### 8.2 Correções, em ordem de ganho esperado (nenhuma foi feita)

| # | Correção | Onde | Ganho esperado | Prova do ganho | Risco |
|---|---|---|---|---|---|
| **D1** | **`RS` adaptativo** (2 desktop; 1,5 ou 1 em toque/quando p95 > 20 ms) | `src/render/tela.ts` | CPU-raster: desenho **-71%** (14 -> 4 ms), 13 -> 50 fps. GPU de entrada: proporcional aos pixels (6,8 -> 1,7 Mpix com `RS=1`), **estimado 2-5 ms por quadro** | MEDIDO em software; ESTIMADO em GPU móvel | médio: oráculo de pixel (manter `RS=2` no desktop) |
| **D2** | **`imageSmoothingQuality = 'low'`** (ou `'medium'`) no celular; fundir cenário+vinheta em um passe (cenário 1020x580 + vinheta 960x540 = 2 telas cheias por quadro) | `tela.ts`, `cenario.ts` | CPU-raster: **13 -> 31 fps** só trocando o parâmetro; GPU de celular: **estimado** menos ALU por pixel | MEDIDO em software; ESTIMADO em GPU | baixo (nitidez do sprite ampliado) |
| **D3** | **Menos trabalho na main thread por quadro**: (a) cache offscreen do texto/HUD estático (texto = ~10% do ativo, 19 chamadas por quadro, 62 na provocação); (b) menos `save/restore` (60 pares) e `fillStyle` (76); (c) reaproveitar objetos em `Fluidez.vista`/`get fonte`; (d) pré-aquecer a textura da página FILME na abertura | `render/texto.ts`, `hud.ts`, `fluidez.ts`, `fight.ts` | ~15-25% do JS de desenho (~1-1,5 ms a 4x), menos lixo (menores 3,9 ms/mediana) e fim dos picos de primeira vez (hipótese) | JS: MEDIDO; ganho de (d): HIPÓTESE | baixo |
| D4 | Entender e cortar a coleta maior a cada 3-4 s e o custo da SELEÇÃO (8,7 ms de desenho vs 5,3 da luta) | investigar | tira picos de 20-76 ms e 25% de quadros lentos nesse menu | ainda sem causa | — |
| D5 | Trailer: reduzir o p99 (200-320 ms) ou cair para o estático também em CPU lenta (hoje só decide por rede) | `ambiente.ts` | primeira impressão | MEDIDO o problema | baixo |
| I1 | Entrada: SOCO/CHUTE FORTE sem a espera de 3 ticks (M1 da Vega) | `fighter.ts` | -50 ms no forte com barra cheia | MEDIDO | médio (motor) |
| I2 | Joystick: zona angular + histerese (U1 da Lyra) | `toque.ts` | fim de pulos/agachadas/dashes involuntários | MEDIDO o problema | decisão do dono (sai do protótipo) |
| I3 | Dash que não engole o golpe (M2) ou `dash=false` no toque (M5) | `fighter.ts` | -até 283 ms em golpe após dash | MEDIDO o problema | médio |
| I4 | Congelamento do especial: garantir que o build público seja o atual (sem `?ritmo=0`) | publicação | -0,8 s por especial se o dono estava no build antigo | MEDIDO em `?ritmo=0` | — |

**As 3 correções de DESENHO com mais ganho de FPS no Android, em ordem: D1 (resolução adaptativa), D2 (smoothing 'low' + um passe de fundo), D3 (trabalho da main thread: texto/HUD em cache, menos save/restore, menos alocação, pré-aquecimento da FILME).**
D1 e D2 só aparecem como ganho se a GPU do aparelho for limitada por preenchimento; D3 é o que melhora o JS e é o único dos três que a emulação pode medir com precisão. Antes de gastar tempo, **peça ao dono o modelo do aparelho e uma
gravação de 1 minuto com o contador de FPS do Chrome (chrome://inspect, ou a sobreposição de FPS das ferramentas do desenvolvedor)**: se o aparelho fecha 55-60 fps com a luta normal, o problema dele é D1/D2 inexistente e sobra entrada (I1-I3) e build antigo (I4).

## 9. O que falta medir (segunda entrega)

1. **Ablação do raster** (`ablacao.mjs` pronta): custo em ms de cenário, vinheta, sprites, texto, gradientes, `lighter`, sombras, por fase, com canvas em CPU 1x. Dá o "top 10 em ms" do raster.
2. **Toque curto de verdade** (`toque-curto.mjs` pronta): hipótese 2 da Vega, com CPU 1x, 4x, 6x e 16x.
3. **A SELEÇÃO**: por que desenha 8x mais caro que a luta a 4x (contagem de chamadas só rodou na luta).
4. **Boot em 4G com SW frio/quente** (`boot.mjs` pronto) e o tempo até o título; o trailer em rede lenta.
5. **GC a 6x** e a causa da coleta maior a cada 3-4 s (`--trace-gc`/amostragem de heap).
6. **Atraso visual da posição por interpolação** (só lido no código).
7. **Aparelho real** (qualquer Android de entrada) e **o build que o dono jogou**.

## 10. Reprodução e limpeza

- Scripts e dados brutos em `<scratchpad da sessão>/` (`lib.mjs`, `bot.mjs`, `fases.mjs`, `latencia.mjs`, `entrada.mjs`, `custo.mjs`, `memoria.mjs`, `res/*.json`). Nada disso é versionado.
- Servidores `vite preview` (portas 5390-5394) e Chromium encerrados por PID ao final; nenhum `taskkill /IM`; nenhuma junction de `node_modules`; nenhum arquivo de `src/`, `tests/` ou `docs/` alterado além deste.
