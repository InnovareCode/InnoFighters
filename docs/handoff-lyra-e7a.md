# Handoff Lyra: E7a (celular) + controles compactos + decisão 17 (tecla H) + logo D1 "Cobalto Real"

Data: 2026-10-21. Sem commit. Não toquei em `src/fight`, `src/data`, `src/meta`, `src/core/storage.ts` (a Vega está na E6).
Quatro frentes na mesma sessão: (1) spSeg por toque e controle, (2) legibilidade do HUD no celular deitado, (3) portão de desempenho e memória,
(4) aviso "vire o aparelho"/retrato; mais o pedido do dono dos **controles de toque compactos**, a **decisão 17** (tecla H) e a **paleta D1 do logo**.

## RESULTADO

### 1. spSeg (especial segurado) por toque e por controle
O diagnóstico da Íris ("gamepad e toque não produzem spSeg") estava **desatualizado**: desde a pós-E3 o `teclas.ts` produz `spSeg = segurada.has(mapa.sp)` e o
toque e o controle escrevem na mesma `segurada`. O que faltava era PROVA e dois defeitos reais no controle:
- `src/input/gamepad.ts`: **R1 e R2 viram a mesma tecla (`b`)**. Soltar só um dos dois soltava o especial (e o MASHI, que carrega segurando). Agora a tecla fica segurada
  enquanto QUALQUER botão dela estiver apertado e o aviso de descida sai uma vez só.
- `gamepad.ts`: **controle desconectado com botão apertado** deixava a tecla "segurada para sempre" (MASHI carregando sem parar). Agora solta o que o slot segurava.
- Testes unitários: `tests/unit/gamepad.test.ts` (+5: R1 seguro por 90 ticks, R2 no controle 2, R1+R2 soltando um, outros botões e bordas intactos, desconexão) e
  `tests/unit/toque.test.ts` (+6, com DOM falso: segurar, toque curto = `sp` sem `spSeg`, outros botões não soltam o ESP e não produzem `spSeg`, `touchcancel`, joystick junto).
- e2e `tests/e2e/celular-e7a.spec.ts` (celular 915x412, toque por CDP): luta de treino AMINU x HAYATO; o mesmo "segurar o ESP por N ticks" por **teclado, toque (#r1) e controle falso**
  (`navigator.getGamepads` sobreposto) e compara **tick a tick** `[estado, mt, carga, nivelCarga]`: os três são idênticos, para 100 ticks (nível 3, auto-solta em 90) e 40 ticks (nível 2).
  Controle negativo: toque curto não carrega. Misto: com o ESP seguro, um 2º dedo no golpe e um 3º no joystick (o quadro mostra `lp` e `right` junto de `spSeg`), e a carga chega ao mesmo máximo.
  **Mutantes mortos:** toque que solta o `b` ao descer (3 testes caem); controle que não solta (cai). Buffer e bordas (`sp` só no 1º tick) estão nos testes unitários.

### 2. Legibilidade no celular deitado (medida em CSS px)
Medido com um gancho em `fillText` (corpo × transformação × `canvas.clientWidth/canvas.width`). O canvas 960x540 vira 732x412 em 915x412 (×0,7625) e 693x390 em 844x390 (×0,722).
| Texto | antes (915 / 844) | depois |
|---|---|---|
| etiqueta GAJA/SARPA (14 lógicos) | 10,7 / 10,1 px | **18 lógicos = 13,7 / 13,0 px** (`ETIQUETA_POSTURA` 88x24 -> 112x30) |
| "000000  CHEFÃO" (14 lógicos) | 10,7 / 10,1 px | **18 = 13,7 / 13,0 px** (só quando `chefe === true`; `FONTE_ROTULO_CHEFE`) |
| contador "×2", nome do chefão | 16,8 / 15,9 | sem mudança |
| "1P 000000" / "CPU" dos lutadores comuns | 10,7 / 10,1 | **sem mudança de propósito** (fidelidade pixel a pixel com o protótipo) |
A etiqueta cabe antes das bolinhas de round (236+112 < 377). Capturas: ver `arte-fonte/capturas/` (HUD com NILA/SARPA x BAATAR). Testes: `f3a-render.test.ts` (+2) e e2e `celular-e7a.spec.ts` (mede nas duas telas).
**Decisão que fica para o dono:** a linha "1P 000000"/"CPU" dos 4 originais segue com ~10 px CSS no celular; aumentar muda o pixel contra o protótipo (a fidelidade passaria a ter uma 3ª exceção).

### 3. Controles de toque compactos (pedido do dono)
`src/input/toque.css` reescrito e `index.html` (ids e `data-k` mantidos: `#joy`, `#knob`, `#pad .hp/.lp/.hk/.lk`, `#r1`, `#bp`). Unidade `--m` = menor lado da janela.
- **Esquerda:** joystick analógico de base fixa, 0,235·m (97 px em 412), knob 44%; zona morta = 25/35/30% do raio (limiares do protótipo, inalterados; 12 px horizontal no 915x412).
- **Direita:** aglomerado 2 colunas x 3 linhas: `[ESQUIVA reservada] [ESP]` / `[soco forte] [chute forte]` / `[soco fraco] [chute fraco]`. Área de toque = max(44 px, 0,115·m) (47 px), **desenho visível 18% menor**
  (38 px; antes 65 px) e semitransparente (alfa .30). Rótulos de texto saíram (símbolos △○□✕ e "ESP"; `aria-label` mantido).
- **Casa da ESQUIVA:** `#esq` (47x47, `visibility:hidden`, sem toque) no canto superior esquerdo do aglomerado, ao lado do ESP. **Não implementei o botão** (Nova está desenhando).
- Pausa `#bp`: área de toque 44 px (antes 41). Base de baixo a 10vh (acima da faixa SUPER do HUD).
- **Base fixa x flutuante:** fixa. Medido: a base fixa fica quase toda na margem preta (0,5 a 0,8% da arena); uma flutuante exigiria uma zona de toque sobre a arena e disputaria com o toque no canvas
  (`aoToqueCanvas`: confirma menus). Se o dono quiser flutuante, é uma mudança de lógica em `toque.ts` (origem do vetor no 1º toque) + teste; não feita.
**Antes (calculado do CSS antigo, conferido com as medidas do e2e antigo) x depois (medido no navegador):**
| Janela | joystick | botão (toque) | aglomerado | controles sobre a arena |
|---|---|---|---|---|
| 915x412 antes | 134 px (14,6% da largura) | 69 (7,5%) | 211x274 (23,1% x **66,4% da altura**), topo em y=101 (o HUD vai até 76) | 9,4% |
| 915x412 depois | **97 (10,6%)** | **47 (5,2%)** | **97x146 (10,6% x 35,5%)** | **1,2%** |
| 844x390 antes | 127 (15,0%) | 65 (7,8%) | 200x260 (23,7% x 66,6%) | 10,4% |
| 844x390 depois | **92 (10,9%)** | **45 (5,3%)** | **92x139 (10,9% x 35,5%)** | **2,2%** |
| 667x375 antes | 122 (18,3%) | 63 (9,5%) | 192x250 (28,9%) | 15,1% |
| 667x375 depois | 88 (13,2%) | 44 (6,6%) | 90x136 (13,5%) | 8,0% (a tela é 16:9: sem margem preta, os controles ficam sobre a arena) |
Testes (`tests/e2e/entrada.spec.ts`, o de layout foi **reescrito**, não mascarado): tamanhos previstos pela fórmula, área de toque >= 44 px, desenho visível menor que a área e semitransparente,
ordem do aglomerado, nenhuma sobreposição, dentro da janela, a casa da ESQUIVA livre, e **limites**: nenhum controle passa de 12% da largura (deitado com margem preta), botão <= 6%, aglomerado <= 40% da altura,
**controles <= 6% da área da arena e fora das faixas do HUD** (cima: até 100 lógicos; baixo: a partir de 490). Mutante (`--hit` 0,115 -> 0,2) derruba. Os testes de toque (joystick, 2 dedos, ESP segurado) passam no layout novo.
Capturas: `arte-fonte/capturas/mobile-controles-{antes,depois}-{915x412,844x390,667x375,412x915,390x844}.png`.

### 4. Aviso "vire o aparelho" e retrato
Medido em 412x915 e 390x844: `#rot` visível ("Vire o aparelho para o modo paisagem"), canvas na largura (412x231), controles dentro da janela e **fora** do aviso, `pointer-events:none`, e girar a janela esconde o aviso.
Teste novo `celular-e7a.spec.ts` (2). Retrato continua jogável (controles abaixo do canvas).

### 5. Decisão 17 (tecla H)
`src/ui/cenas/how.ts:152`: a linha agora é só "ESC ou P — pausar     M — mudo     F — tela cheia" (a tecla H segue valendo em `fight.ts`; só saiu do texto). O texto é alinhado à esquerda: nada mais se move.
Oráculo: `tests/e2e/fidelidade-ui.spec.ts` troca só essa frase no protótipo (initScript) e declara a **segunda exceção intencional** no cabeçalho; o resto da tela segue pixel a pixel (a aba do "Como jogar" passa).

### 6. Logo D1 "Cobalto Real" (escolha do dono)
`src/ui/logo.ts`: `PALETA_MARCA` e o `fill` de INNO com os valores da seção 2 de `docs/proposta-logo-paleta-d.md` (só valores; geometria e API intactas; brasas e FIGHTERS iguais).
- `tests/unit/logo.test.ts` reescrito: valores D1, aro claro (luminância > 0,7 e 15,6:1 contra o contorno externo), `PALAVRAS` com o degradê azul e o de brasa, brasas ainda quentes. (Os degradês são desenhados em canvas do DOM: o Node confere o texto; a cor desenhada é do e2e.)
- `tests/e2e/logo.spec.ts` reescrito conforme a seção 4: INNO **68%** dos pixels claros azuis (195-250 graus; limite > 50%), FIGHTERS **0/33 988** claros azuis, horizonte com saturação > 0,6 e matiz 215-235 (229 px da linha),
  **borda por palavra: 0 pixels abaixo de 3:1 em todos os 6 fundos** (pior 3,95:1, bate com a proposta), mediana > 4, aro 15,6:1, emblema com matizes **215..229** (limite 210-235). Mutante (horizonte e anel de volta ao ouro) derruba.
- Capturas: `arte-fonte/capturas/logo-d1-titulo-{1-jp,2-cn,3-kr,4-br}.png`, `logo-d1-boot.png`, `logo-d1-abertura-{impacto,fim}.png`, `logo-d1-menu.png` e a comparação lado a lado com a linha D1 do Apolo
  (`logo-d1-comparacao-apolo.png`: em cima o preview do Apolo, embaixo o jogo real; o logo é igual). As capturas do título fora do brilho que atravessa (o preview também o exclui).

### 7. Portão de desempenho e memória (E7a-3)
**Tudo isto é EMULAÇÃO no Chromium headless do Windows de desenvolvimento, uma máquina compartilhada com outros agentes (tsc, vitest) e o Chrome do dono. Não é aparelho real.**
Método: celular emulado (915x412, DPR 2,625, toque), `Emulation.setCPUThrottlingRate` 1 e 4, laço de tempo real, robô que anda e golpeia (hp reposto), 450 quadros após 120 de aquecimento, mede o tempo que o
`ui.update()+ui.draw()` ocupam a thread principal (`trabalho`) e o intervalo entre `requestAnimationFrame`. Dois modelos de canvas, porque é o que mais pesa:
- **canvas acelerado** (flags `--enable-gpu-rasterization --use-angle=swiftshader`): a thread principal só grava os comandos, como no Chrome de um celular com GPU. É o modelo realista.
- **canvas por CPU** (o padrão do headless): a thread principal rasteriza 1920x1080 inline. É o PIOR CASO (aparelho sem canvas acelerado).
**Canvas acelerado (ms de thread principal por quadro; limite do plano: 16 ms médio em 4x):**
| Cena | 1x médio | **4x médio** | 4x mediana | 4x p95 | 4x pior |
|---|---|---|---|---|---|
| seleção (9 retratos) | 1,5 | **10,2** | 9,7 | 14,0 | 37,3 |
| luta dos originais (CAIO x WEI LONG, atlas v1) | 1,2 | **8,2** | 6,4 | 21,5 | 52,6 |
| luta normal (HAYATO x CAIO) | 0,9 | **6,7** | 6,3 | 9,5 | 58,1 |
| **BAATAR fase 1** (1,28x, 4 páginas, alturaRef 525) | 0,9 | **6,8** | 6,6 | 9,2 | 32,0 |
| **BAATAR fase 2** (depois da Dança) | 1,1 | **6,5** | 6,3 | 8,9 | 20,3 |
O intervalo entre quadros tem **mediana 16,7 ms (60 fps) em todas** a 4x. **Veredito: passa** (médio 6,5 a 10,2 ms < 16). O BAATAR custa o mesmo que uma luta comum (6,5-6,8 contra 6,3-6,7).
**Ressalva honesta:** houve travadas isoladas de 5 a 20 s (e 20 a 40 quadros > 33 ms em 450) que aparecem inclusive nas lutas dos 4 originais: são do ambiente (máquina compartilhada, SwiftShader), não da cena; por isso reporto mediana e p95, não a média do intervalo.
**Canvas por CPU (pior caso):** 1x: seleção 78 ms, originais 55 ms (mediana 65), normal 15,5, BAATAR 15,6 / 15,6; **4x: seleção 451 ms, originais 312, normal 104, BAATAR 95 / 87**. Nenhuma passa de 16 ms: só interessa se o aparelho não acelerar o canvas (a verificar em aparelho real).
**Onde está o custo (ablação, canvas por CPU, seleção):** desligar TODOS os `drawImage` leva a 0,9 ms; desligar só as imagens > 2500 px de largura (os atlas v1 **3600x2296 do WEI LONG** e 3600x2251 do CAIO) leva a 1,4 ms:
**quase todo o custo é desenhar sprites desses dois atlas originais**, não os 9 retratos (sem retratos: 77,1 ms contra 78,7; ~1,6 ms) nem o BAATAR. As luta com atlas v2 (2048 px) custam ~1/4.
**Hipóteses testadas e descartadas:** (a) cache de decodificação: trocar as páginas por canvas já rasterizados não melhorou (piorou 10 ms); (b) cache de retratos: não há o que ganhar (9 retratos = 1,4 MB, ~1,6 ms em CPU).
`imageSmoothingQuality = 'low'` cortou a seleção pela metade (78 -> 40 ms) mas **muda pixels** (a fidelidade com o protótipo usa 'high'): **não aplicado**.
**Memória** (estimativa w·h·4 das imagens decodificadas + heap JS; `performance.memory`/CDP):
| Momento | heap JS | atlas residentes | imagens decodificadas |
|---|---|---|---|
| boot e seleção com 9 retratos (igual a 4: os 9 retratos carregam no boot) | 3,2 MB | 4 (vitrine: 6 páginas) | 19, ~136 MB (atlas 111 + cenários 24 + **retratos 1,4**) |
| luta HAYATO x BAATAR | 3,5 MB | 5 (10 páginas) | 25, ~208 MB |
| depois de AMINU x CENTELLA (o BAATAR ainda residente por LRU) | 3,5 MB | 7 (14 páginas) | 31, **~287 MB (pico)** |
| depois de mais lutas | 3,6-3,7 MB | 7 (13 a 15 páginas) | 30 a 32, 258 a 284 MB |
O heap JS é **plano** (3,2 a 3,7 MB): o peso é imagem. Cada arquivo de arte baixa **uma vez**; só as 4 páginas do BAATAR baixaram duas vezes (soltas pela LRU e pedidas de novo na 5ª luta). A poda LRU funciona (limite de 3 atlas não-vitrine, nunca solta quem está em luta).
**Propostas (nenhuma aplicada: nada passou de 16 ms no modelo realista, e não há limite de memória definido):**
1. **Podar cenários** (hoje nunca soltos): 7 cenários = 48 MB no fim da sequência; manter vitrine + os 2 mais recentes poupa até ~40 MB. Seguro, ~15 linhas em `gerenciador.ts` (+ `usar` com cenários em uso). Quebra o `arte-sob-demanda.spec` se contar cargas: reescrever junto.
2. **Limite de residentes por peso, não por contagem:** o BAATAR (52 MB) fica retido por contar como "1 atlas". Orçamento de ~100 MB para os não-fixos.
3. **Reexportar CAIO e WEI LONG em páginas v2 de 2048 px** (hoje 31 e 32 MB decodificados cada): corta o custo de CPU da seleção e ~13 MB cada. É trabalho de arte/dados (Apolo/Vega) e muda o oráculo de fidelidade (que usa os atlas v1).
4. Vitrine fixa (111 MB sempre residente): só segurar a que está na tela exige decisão de produto (recarregar ao voltar ao título).
**Exigiria aparelho real:** o tempo de quadro em GPU móvel de verdade, o raster fora da thread principal (o SwiftShader não é GPU de celular), o limite de memória do navegador no aparelho (varia por modelo e por navegador), o estrangulamento térmico e o decode do WebP em CPU de celular.

## PORTÕES (uma rodada, servidor vite fixo sem HMR, `curl /src/main.ts` conferido)
`npm run typecheck` ok · `npm test` **45 arquivos / 970 verdes** (inclui o trabalho da Vega V1/V2 que entrou durante a sessão) · `npm run build` ok (179 kB JS) ·
`npm run test:e2e` **103 passaram, 65 puladas** (projeto celular só-desktop), 0 falhas · `npm run test:e2e:build` **5 de 5** (CSP).
Duas falhas da primeira rodada eram **testes meus com HP absoluto** contra os dados da E6 da Vega (HAYATO `hp` 106, BAATAR `hpPorBarra` 40): `fidelidade-ui` ("luta: cpu") e `expansao` (HUD de 2 barras).
Passei para HP relativo (`maxHp * 0,6`, `maxHp / 2`): sobrevive a rebalanceamento. Não é regressão da E7a.

## PROVADO EM NAVEGADOR E NÃO PROVADO
Medido no Chromium emulando celular (viewport 915x412, 844x390, 667x375, 412x915, 390x844; toque por CDP): layout dos controles, tamanhos, spSeg por toque/controle/teclado, legibilidade, aviso, logo (pixels).
**Olhei** as capturas de controles (915x412, 844x390, retrato 412x915), o HUD e os 4 títulos do logo.
**NÃO provado:** aparelho real (ergonomia do polegar, tamanho dos alvos na mão, joystick de 97 px, o ESP em cima à direita), controle físico (só `getGamepads` falso), canvas acelerado de GPU real, `prefers-reduced-motion`,
retrato "bonito" (só correto: o aviso pede para virar), o logo com o brilho em movimento e a abertura animada (só quadros), contraste de matiz (só luminância).

## PARA O PRÓXIMO
**Íris:** em aparelho real (ou DevTools com toque): jogar uma luta com o joystick à esquerda e o aglomerado à direita; segurar o ESP com o AMINU (MASHI) enquanto anda e golpeia; ver se o ESP (cima-direita) alcança sem tirar o polegar dos golpes;
conferir que nada do HUD fica coberto em 915x412 e 844x390; ver o logo D1 nas 4 telas de título; abrir "Como jogar" > Teclas e ver a linha sem a tecla H. Tentar quebrar: R1+R2 no controle, desconectar o controle com o ESP apertado, `touchcancel`.
**Atlas:** commitar `tests/e2e/celular-e7a.spec.ts` (novo) e os arquivos alterados (lista abaixo). As capturas ficam em `arte-fonte/` (fora do git). A L1+L2 (esquiva e cinemática) usa a casa `#esq` e o `data-k` do botão novo: `index.html` + `toque.css`.
**Vega:** (a) os testes não podem mais fixar HP absoluto (ver acima); (b) item 3 das propostas (v2 para CAIO/WEI LONG) se o dono quiser tirar o custo da seleção em aparelho sem GPU.
**Apolo:** o logo D1 está aplicado; as capturas de comparação estão em `arte-fonte/capturas/logo-d1-*`.

## PENDÊNCIAS
- Medição em aparelho real (desempenho e ergonomia) não feita; a ablação do WEI LONG sugere reexportar os dois atlas v1.
- A decisão sobre a linha "1P 000000" dos 4 originais (10 px CSS) é do dono.
- Propostas de memória 1 a 4 acima, não aplicadas.

## Arquivos
Código: `src/input/gamepad.ts`, `src/input/toque.css`, `index.html`, `src/render/postura.ts`, `src/render/hud.ts`, `src/ui/cenas/how.ts`, `src/ui/logo.ts`.
Testes: `tests/unit/{gamepad,toque,f3a-render,logo}.test.ts`, `tests/e2e/{celular-e7a (novo),entrada,fidelidade-ui,expansao,logo}.spec.ts`.
Capturas: `arte-fonte/capturas/mobile-controles-*`, `logo-d1-*`.

## APRENDIZADO
1. Antes de implementar "X não funciona em Y", **provar** que não funciona: o spSeg de toque/controle já existia (única fonte `segurada`); o valor foi a prova tick a tick por três entradas e os dois defeitos reais (R1/R2 e desconexão).
2. Desempenho em celular: separar canvas acelerado (thread principal grava comandos) de canvas por CPU (rasteriza inline). Misturar os dois dá conclusões opostas. Uma ablação por família de operação (desligar `drawImage` por tamanho de fonte) achou o culpado em 3 execuções; o perfil por método do canvas só mostra `restore`/`fill` porque o raster é adiado.
3. Máquina compartilhada produz travadas de segundos: reportar mediana, p95 e contagem de quadros > 33 ms, nunca só a média do intervalo; repetir cenas "do outro lado" (os originais) como controle.
4. Testes que setam HP absoluto quebram a cada rebalanceamento: usar fração de `maxHp`.
5. Bash: crase e `$(...)` dentro de `node -e "..."` quebram a escrita de testes com template literal; usar Write para o texto e o node só para emendar arquivos. `powershell -Command` com o nome do script na própria linha de comando se mata (usar `-File`).
6. CSS com `::before` posicionado cobre texto estático do pai: `z-index:-1` no pseudo-elemento. Seletor `.b` (1,1,0) vence `#r1` (1,0,0): usar `#touch #r1`.
