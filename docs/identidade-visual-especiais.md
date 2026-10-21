# Identidade visual dos especiais (cinemática do especial)

Autor: Apolo (direção de arte), 2026-10-21. Status: **proposta**, nada implementado, `src/` intocado.
Par desta spec: `docs/spec-esquiva-e-cinematica-especial.md` (Nova) define o **contrato e o tempo** (B1 a B16). Este documento
dá o **conteúdo criativo** de cada especial: título, paleta, estilo de brilho, recorte da pose, ritmo dentro dos 48 ticks,
som e o que aparece no acerto e na defesa.

Base lida: `src/data/lutadores/*.ts` (todos os golpes, fichas `sarpa`, `chefe`, `chefe2`, `extras.sResp`),
`docs/proposta-expansao.md` (§2, blocos "Cuidar"), `docs/prompts/01..08`, `src/render/efeitos.ts`, `src/render/postura.ts`,
`src/render/texto.ts`, `src/audio/audio-sys.ts`, `src/fight/game.ts` (eventos `throw`, `parry`, `hit`), `atlas.json` dos 9
(nomes dos quadros) e as capturas de `arte-fonte/capturas/` (seleção com os 9, golpes, BAATAR fase 2, NILA SARPA).

---

## 0. Como este documento encaixa na spec da Nova

| Item da spec | O que a Nova fixou | O que este documento preenche |
|---|---|---|
| B1 gatilho | evento `special` (golpe com `cost > 0`) | lista dos **29 especiais pagos**; VADIVU (custo 0) e a Dança da Águia ficam fora, como a spec diz (identidade delas só para os efeitos que já existem, §3.8 e §3.9) |
| B3 tempos | COMPLETA 48 ticks, CURTA 20 ticks, janelas fixas | **ritmo** = curva e batida DENTRO das janelas (§1.4); a duração total não muda |
| B5 imagem | quadro de pose do golpe no atlas, parte de cima do corpo, halo da silhueta; `retrato.png` só de reserva | **qual quadro** e **qual recorte** por golpe (§1.2) |
| B6 texto | `mv.name` 44 px + `ch.name` 18 px | título = `mv.name` **exato**; selo opcional no idioma da cultura (§1.5) |
| B7 cores | gradiente `fire[2]→fire[0]→fire[2]`, borda `fire[1]`, contraste ≥ 3:1 | **paleta própria por golpe** (núcleo, brilho, sombra) com contraste **calculado** ≥ 3:1 nos 29 (§5) |
| B8 brilhos | 28 riscos + 6 estrelas, máx. 40 partículas, sem `shadowBlur`/`filter`/`getImageData` | **um estilo por lutador** (catálogo §2), dentro do mesmo orçamento de 40 primitivas por quadro |
| B9 som | `introWhoosh()` + `introHit(0)`; síntese nova só se o Apolo reprovar | **veredito**: a dupla serve de reserva, mas apaga a identidade. Proponho receitas por golpe usando só `tone()`/`noise()` que já existem (§1.6) |
| B10/B11 acertos | número de dano, estrela extra `fire[0]`, "N HITS"; na defesa nada conta | **assinatura do acerto** por estilo no lugar da estrela extra; "eco" discreto na defesa, sem número nem contador |
| B15 acessibilidade | 1 flash por especial, alfa ≤ 0,35, sem tremor na cinemática | todos os efeitos daqui respeitam: nenhum flash de tela cheia além do da spec, nenhum tremor adicionado |

**Onde guardar os dados (sugestão para a Lyra):** uma tabela de apresentação em `src/render/identidade-especiais.ts`, chave
`<id>.<ficha|base>.<golpe>` (ex.: `nila.sarpa.sFire`, `baatar.chefe2.sFwd`). Fica no render, **fora** do `LutadorDef`: não
mexe no snapshot nem no lock-step, e a ausência da chave cai no padrão da Nova (`fire`, pose do golpe, riscos + estrelas).

---

## 1. O molde da tarja (comum aos 9)

### 1.1 Geometria (tela lógica 960x540, RS=2)

- **Faixa**: 1000 x 132 lógicos (cache 2000 x 264 físicos, cerca de 2,1 MB). Os 40 px a mais na largura deixam inclinar até
  **±10°** sem mostrar as pontas (960/cos 10° + 132·tan 10° ≈ 998). Inclinação = rotação na hora do `drawImage` do cache.
  Ângulo positivo = a ponta do lado do RIVAL sobe. Para o P2, espelha o ângulo junto com o lado.
- **Altura da faixa na tela** (centro em y): `alta` 214, `media` 250 (padrão), `baixa` 330. As baixas são para golpes
  rasteiros; os lutadores estão congelados embaixo, então nada importante fica escondido.
- **Fundo da faixa** (estático, vai para o cache): degradê **vertical** sombra (0) → `mix(sombra, brilho, 35%)` (0,5) →
  sombra (1), alfa 0,94. Borda de 3 px em brilho, mais um fio de 1 px em núcleo a 5 px para dentro.
- **Estampa** (estática, no cache, no lugar das listras brancas de 12%): o motivo do estilo do lutador desenhado a 10% de
  alfa em brilho (ver coluna "estampa" no §2). É o que faz a faixa parada já dizer de quem é.
- **Pose**: no terço do lado do atacante (x = 24% da faixa). Escala para 172 px de altura (faixa × 1,3): a pose estoura a
  borda de cima em cerca de 40 px ("sai da moldura") e é cortada na borda de baixo. Halo: silhueta tingida de brilho
  (offscreen + `source-in`, uma vez por luta), em `lighter`, alfa 0,55, deslocada 3 px para trás e para cima.
- **Nome**: `textoArcade` 44 px no centro dos dois terços do outro lado, preenchimento em degradê
  `[núcleo, mix(núcleo, brilho, 40%)]`, contorno em `mix(sombra, #000, 45%)`. Nome do lutador 18 px em núcleo, alfa 0,85,
  logo abaixo (B6).

### 1.2 Recortes da pose (todos saem do atlas, nunca do `retrato.png`)

| Recorte | O que mostra | Escala na tarja | Quando usar |
|---|---|---|---|
| `BUSTO` | 58% de cima do quadro (padrão da spec, B5) | origem ~240 px → 172 lógicos (344 físicos): ampliação ≤ 1,45x | golpes de mão, de tronco, de olhar |
| `MEIO` | 75% de cima | origem ~310 px → 172: 1,1x | chutes e posturas em que o quadril conta |
| `CORPO` | quadro inteiro, pés cortados na borda | origem 410 px → 172: 0,84x (reduz, fica nítido) | saltos, voadoras, rasteiras, poses horizontais |
| `CORPO-H` | quadro inteiro deitado, encaixado pela **largura** (máx. 300 lógicos) | ≤ 1x | poses horizontais: voadora, deslize, mergulho |

O `ROSTO` (só cabeça) ficou de fora de propósito: a origem teria ~150 px e ampliaria 2,3x, o mesmo borrão que a Nova
apontou no `retrato.png`.

**Quadro sugerido**: indico o quadro da fase ativa por nome do atlas (`sa1`, `sb1`, `sc1`, `hp1`, `dive1`, `sarpaLeap1`,
`sarpaSlide1`...). Todos existem nos `atlas.json` conferidos. Quando o quadro sugerido for diferente do que
`getPD(mv.pose)` devolve, é uma troca (`quadro?` na tabela de apresentação). Sem a troca, vale a pose da spec.

### 1.3 Entrada

O padrão da spec é **lateral, do lado de quem atacou** (B3). Ele está em 24 dos 29 especiais. Proponho duas entradas a
mais, **opcionais** (a L2 pode adiar sem quebrar a unicidade, conferido no §4):

- `CIMA`: a faixa cai de y −80 até a altura final na mesma janela 4–13 (PLANCHA, MEIA-LUA, MERGULHO DA ÁGUIA, ZHEN DI).
- `BAIXO`: sobe de y 620 (RAIJIN-KEN, HURACANRANA, SALTO DA SERPENTE).

### 1.4 Ritmo (sempre dentro dos 48 ticks da COMPLETA)

| Ritmo | Entrada da faixa | "Pop" do nome | Brilhos | Saída |
|---|---|---|---|---|
| `RÁPIDO` | 4–9, ease-out quártico (chega seco) | 8–11, escala 1,4 → 1 | 3 rajadas (ticks 8, 16, 24), vida curta | 38–47, ease-in |
| `MÉDIO` | 4–13, ease-out cúbico (o padrão da spec) | 8–14, 1,3 → 1 | contínuos 8–38 | 36–47 |
| `PESADO` | 4–13, ease-out com passada de 6% | 10–16, 1,5 → 1; nos ticks 13–15 **só a faixa** desce 3 px e volta (assentar, sem tremer a tela) | 8–38, velocidades x0,6 e tamanhos x1,3 | 36–47 |

Na **CURTA** (20 ticks, sem faixa): halo do atacante em brilho, nome 20 px em núcleo com contorno sombra e **uma** rajada do
estilo com no máximo 12 primitivas. O ritmo só muda a rajada: rápido sai no tick 2, pesado no tick 6.

### 1.5 Títulos e selos

- **Título = `mv.name` exato.** Os nomes do jogo já carregam a cultura (japonês, pinyin, coreano romanizado, português da
  capoeira, hauçá, espanhol da lucha, francês da savate, português dos nomes da NILA e do BAATAR). A fonte é Impact com
  reserva Segoe UI: cobre Ç, Ã, Ê, É, Á e o apóstrofo de COUP D'ARRÊT.
- **Selo (opcional, 14 px, núcleo, alfa 0,8)** na ponta da faixa, do lado oposto à pose: a grafia nativa ou o termo da
  arte. Dois cuidados antes de ligar:
  1. **Fonte**: Impact não tem kanji, hangul, malaiala nem a letra hauçá Ɗ. O selo usa a fonte de corpo (`FB`) e depende de
     a plataforma ter a fonte do sistema. **Medir no celular** (perfil e7a) antes de ligar; sem a fonte, usar só o selo
     romanizado.
  2. **Revisão de falante nativo** em todos os termos fora do português (pendência já registrada na proposta de expansão).
     Os marcados com (rev.) são os de menor certeza.

### 1.6 Som: veredito sobre B9 e vocabulário

`introWhoosh()` + `introHit(0)` é o mesmo som para os 29: serve de **reserva**, mas tira a identidade que o resto da tarja
constrói. Proponho **receitas por golpe**, tocadas pela cinemática (não por `audio/eventos.ts`, então o lock-step não muda),
feitas só com as primitivas que já existem (D8 continua: 100% sintetizado). Basta um método que toque uma lista de chamadas.

Notação: `T(onda f0→f1 Hz, duração s, vol)` = `tone()`; `R(filtro f0→f1 Hz, Q, duração s, vol)` = `noise()`;
`+80ms` = `when`. Cada receita tem três momentos: **abertura** (tick 0 da cinemática), **batida** (no pop do nome) e
**acerto** (na sessão, por `hit`). Na defesa: a batida do acerto com `filter lowpass 1200` e volume x0,4, ou nada.

Assinatura sonora de cada lutador (a nota-base varia por golpe):

| Lutador | Timbre de assinatura | Por quê |
|---|---|---|
| HAYATO | estalo elétrico (ruído agudo em rajada) + onda quadrada aguda, base Mi5 (659 Hz) | trovão |
| WEI LONG | bumbo grave longo (seno 70→45) + ronco de ruído grave, base Sol2 (98 Hz) | peso; **sem gongo** (clichê, e o `ko()` já usa gongo) |
| MIN-JI | sopro agudo rápido (ruído passa-banda subindo) + sino pequeno, base Dó#6 (1109 Hz) | velocidade dos chutes |
| CAIO | **berimbau**: triângulo 196→220 Hz (o "dóin" que sobe) + **caxixi** (ruído 3 kHz curto, 2 vezes) | a roda de capoeira |
| AMINU | **kalangu**, o tambor falante hauçá: seno que DESCE 180→120 Hz + estalo de pele (ruído 900 Hz, 30 ms) | música das lutas de dambe |
| CENTELLA | **sino do ringue** (triângulo 1568 Hz + seno 2350 Hz) + torcida (ruído passa-banda 700 Hz, ataque lento) | a arena |
| CAMILLE | **lâmina**: triângulo 2637 Hz longo e baixo ("tiiing") + chiado agudo (ruído passa-alta 6 kHz) | a esgrima de onde ela veio |
| NILA | GAJA: **chenda**, tambor de Kerala (seno 140→90 em rufo); SARPA: chiado (ruído passa-banda 5,2 kHz, Q 4) | Kerala; as duas posturas soam diferentes |
| BAATAR | bordão em quinta de **morin khuur** (dente-de-serra 73 + 110 Hz, passa-baixa 500 Hz); fase 2: grito de águia (triângulo 2400→1500 Hz) | a estepe; a águia do DEVEKH |

### 1.7 Momento dos acertos (sessão do especial, B10/B11)

Regras comuns, que as fichas do §3 só especializam:

- **Acertou** (`hit` com `especial: true`): número de dano em **brilho** com contorno **sombra** (no lugar de `fire[1]`/
  `fire[2]`); a **assinatura do estilo** (§2, coluna "acerto") no lugar da estrela extra `fire[0]`, com no máximo 16
  primitivas e vida ≤ 20 ticks; contador "N HITS" do especial em degradê `[núcleo, brilho]`. Nada de flash de tela cheia
  nem tremor extra: o tremor que existe é o do motor (`LeituraLuta.shake`).
- **Defendeu** (`block`, `parry` do rival, `quebra-guarda`): nenhum número, nenhum contador (B11). Fica o escudo azul
  `#9ad8ff` de sempre, que é a leitura universal de defesa. Opcional: o **eco** do estilo, 30% das primitivas da assinatura,
  na cor `mix(sombra, #fff, 25%)`, alfa máx. 0,5, sem anel. É a "animação premium que sai de qualquer forma", sem parecer
  acerto.
- **Errou** (agarrão que não pegou, PARADE sem golpe, HURACANRANA no chão): a assinatura **apaga** em cinza `#5a5f6e` e
  cai; som abafado. É a leitura da punição, que nesses golpes é o desenho da mecânica.
- **Armadura** (`armor`, BAATAR e WEI LONG absorvendo): número cinza menor sem contar (B11) e um pulso do estilo em
  sombra no corpo de quem absorveu.

---

## 2. Catálogo de estilos (canvas 2D, sem arte nova)

Um estilo **exclusivo por lutador** (NILA tem dois, um por postura; BAATAR tem dois, um por fase). É isso que garante que
dois especiais de lutadores diferentes nunca se confundam (§4). Todos: `globalCompositeOperation = 'lighter'` para o brilho,
sem `shadowBlur`, sem `filter`, sem `getImageData`; sorteio pelo `rngVisual`. Orçamento por quadro na COMPLETA: **≤ 24
primitivas do estilo + 16 riscos de velocidade (C2) = 40**, o teto da B8.

### E1 · RAIO (HAYATO)
1. Polilinha entre dois pontos por deslocamento do ponto médio (3 níveis; desvio inicial ±18% do comprimento, x0,55 a cada
   nível), com 0 a 2 galhos saindo de vértices sorteados (40–60% do comprimento, ±35°).
2. Dois traços: halo (`lineWidth` 7, brilho, alfa 0,35) e núcleo (`lineWidth` 2, núcleo); a forma é sorteada de novo a cada
   2 ticks (o raio "pisca" no lugar, sem piscar a tela).
- Parâmetros: 3–5 raios; 80–220 px; vida 6–10 ticks. Variantes: `esfera` (raios radiais de 50–90 px em volta de um centro
  que gira), `coluna` (um raio vertical da base ao topo da faixa + 3 galhos), `rastro` (6 segmentos horizontais de
  120–180 px atrás do corpo).
- Estampa: zigue-zague de 5 vértices repetido a cada 90 px. Acerto: um raio de 5 galhos e 140 px saindo do ponto de contato
  para cima e para baixo, vida 8 ticks.

### E2 · ESCAMA DE DRAGÃO (WEI LONG)
1. Corpo: N círculos ao longo de `y = A·sin(k·s − ω·t)` (s = distância desde a cabeça), raio de 22 px na cabeça a 4 px na
   cauda, preenchidos com radial núcleo → brilho; sobre cada um, um arco de 160° voltado para trás em sombra (escama).
2. Cabeça: círculo de 28 px e dois "bigodes" (`quadraticCurveTo` de 40 px) ondulando em fase oposta, `sin(ω·t)·10` px.
- Parâmetros: N 18–22; A 18–30 px; k 0,035 rad/px; ω 0,18 rad/tick; passo 12 px; avança 4–7 px/tick. Variantes:
  `inteiro`; `terra` (A 8 px, recorte abaixo da linha: só o dorso aparece, escamas para cima); `couraça` (sem cabeça: 9
  escamas grandes, r 26, em leque de 120° num ponto).
- Estampa: fileira de arcos de escama. Acerto: "mandíbula", dois arcos de 120° que fecham sobre o ponto (r 60 → 18 em 6
  ticks), e 8 escamas soltas que caem (gravidade 0,25).

### E3 · LÂMINA CRESCENTE e MUGUNGHWA (MIN-JI)
1. Crescente: contorno externo de raio r e interno de raio 0,8r com o centro deslocado 0,35r para o lado do voo,
   preenchido em brilho com borda núcleo de 2 px; gira 0,35 rad/tick enquanto voa.
2. Flor de mugunghwa (a flor nacional da Coreia): 5 elipses de 7 x 3,5 px em roda (72°) com miolo de 2,5 px em sombra; gira
   0,05 rad/tick e cai a 0,06 de gravidade, balançando `sin(t/12)·0,8` px.
- Parâmetros: 2–6 crescentes, r 18–34 (variante `gigante` r 90); 8–14 flores, vida 24–40. Variantes: `par` (dois
  crescentes em sequência), `redemoinho` (3 anéis de 3 crescentes subindo em espiral), `gigante`.
- Estampa: contorno de flor de 5 pétalas a cada 110 px. Acerto: o crescente se parte e vira 5 flores.
- Nota: BULKKOT (불꽃) quer dizer "faísca, chama", literalmente "fogo + flor". A flor é o fogo dela.

### E4 · ARCO DE GINGA (CAIO)
1. Arco largo em volta do centro do corpo, desenhado como 12 segmentos seguidos com `lineWidth` de 14 a 2 px e alfa de 0,55 a
   0 (cabeça grossa, cauda fina), varrendo 220° a 0,32 rad/tick: o borrão de um chute girando.
2. "Batidas": anéis finos (`lineWidth` 2) que nascem com r 10 e crescem 3 px/tick, disparados no compasso longo, curto, curto
   (ticks 0, 12, 18), o pulso do berimbau.
- Parâmetros: raio 60–140 px; varredura 220° (variante `rasteiro`: 300° numa elipse com ry = 0,3·rx, rente ao chão);
  3 anéis por compasso, vida 16. Variantes: `vaivém` (dois arcos em sentidos opostos), `rasteiro`, `descendente` (180°
  vertical, de cima para baixo).
- Estampa: arcos de 90° espaçados 120 px. Acerto: o arco fecha em 360° em volta do ponto em 6 ticks + 3 anéis no compasso.

### E5 · CORDA TRANÇADA e ÍNDIGO (AMINU)
1. Corda: duas senoides em contrafase `y = ±a·sin(k·x + φ)` (φ anda 0,4 rad/tick), desenhadas em segmentos de meio período
   alternando qual passa por cima (a de baixo em sombra, a de cima em brilho): lê-se como corda torcida, `lineWidth` 4.
2. Respingo de índigo: gota (círculo de 3–5 px + cauda triangular contra a velocidade) com gravidade 0,35; ao tocar o chão
   vira mancha achatada (elipse 8 x 2 px) em sombra que some em 20 ticks. É a tinta dos poços de Kofar Mata.
- Parâmetros: a 5–8 px; k 0,25 rad/px; corda 120–260 px; gotas 6–16, 3–7 px/tick. Variantes: `punho` (a corda enrola em
  espiral no antebraço), `escudo` (a corda fecha num anel de r 50), `varal` (3 fios horizontais com 4–6 tiras de tecido de
  10 x 36 px que ondulam para trás, `skewX = sin(t·0,3 + i)·0,3`).
- Estampa: corda trançada nas duas bordas da faixa. Acerto: respingo de índigo radial + manchas no chão.

### E6 · ESTRELA DE LUCHA e CORDAS (CENTELLA)
1. Estrela de 4 pontas (8 vértices alternando R e 0,3R): nasce em 0, cresce até R em 4 ticks e some girando 0,2 rad/tick;
   70% em brilho e 30% em prata `#dfe6ee` (a faísca prata da máscara).
2. Cordas do ringue: 3 linhas horizontais a 18 px uma da outra, vibrando como corda tocada:
   `y = A0·e^(−t/12)·sin(0,9·t)·sin(π·x/L)`.
- Parâmetros: 8–16 estrelas, R 6–18, vida 14–24; A0 10 px. Variantes: `chuva` (caem de cima a 3–5 px/tick, com um cone de
  holofote branco a 12% vindo do topo da faixa), `órbita` (8 estrelas num anel de r 60 girando 0,3 rad/tick), `cordas`.
- Estampa: estrelas de 4 pontas em grade solta. Acerto: 12 estrelas em explosão radial (3–8 px/tick) + as 3 cordas vibram.

### E7 · FIO DE FLORETE (CAMILLE)
1. Linha reta fina (`lineWidth` 1,5, de sombra para brilho) com um reflexo que corre por ela: degradê linear de 30 px
   (transparente → núcleo → transparente) andando 40 px/tick ao longo da linha.
2. "Touche": ponto de luz de r 3 com 4 raios finos de 24 px em cruz, girando 45° em 6 ticks.
- Parâmetros: 1–5 fios; 140–420 px; ângulo ±12°; vida 10–16 ticks. Variantes: `guarda` (1 fio vertical), `estocada`
  (horizontal, rente), `x` (dois fios a 35° e 145°), `arco` (fio curvo de 180°, r 60).
- Estampa: linhas paralelas finas, como as marcas de uma pista de esgrima. Acerto: X de dois fios de 160 px + touche no ponto.

### E8 · CHAMA DE LAMPARINA (NILA, GAJA)
1. Gota de chama: duas bézier da base redonda até a ponta (altura h, largura 0,45h), degradê vertical núcleo (base) → brilho
   → transparente (ponta); a ponta oscila ±2 px com `sin(0,3·t + i)`.
2. Sobe 0,4 px/tick e encolhe 1% por tick; chamas em arranjo, como os pavios de uma lamparina de latão.
- Parâmetros: h 14–26 px; 4–12 chamas. Variantes: `anel` (8 em círculo de r 40), `palmas` (duas fileiras de 4 à frente das
  mãos), `pavio` (uma só, h 10, na ponta dos dedos).
- Estampa: fileira de chamas pequenas na borda de baixo. Acerto: leque de 8 chamas que se abrem do ponto.

### E9 · ESPIRAL DE SERPENTE (NILA, SARPA)
1. Hélice vista de lado: cada ponto = eixo(s) + normal·r·sin(θ), com θ = 0,35·s − 0,25·t; espessura `1 + 3·(cos θ + 1)/2`
   (a volta da frente grossa, a de trás fina) e cor alternando brilho (frente) e sombra (trás).
2. Escamas: pontos claros de r 1,5 em núcleo a cada 0,6 rad da hélice.
- Parâmetros: r 6 a 26 px; 160–300 px de comprimento; 3 voltas; vida 18–28. Variantes: `rasteira` (eixo horizontal no
  chão), `parafuso` (eixo vertical subindo 8 px/tick).
- Estampa: linha sinuosa fina ao longo da faixa. Acerto: a ponta da hélice ergue em "S" e fecha num anel de r 18 no ponto
  (o bote).
- Por que não se confunde com o E2 (WEI): dragão = círculos cheios e grossos com escamas em arco, ondulando no ar; serpente =
  traço fino em hélice, colado ao chão ou em parafuso. Cores de famílias opostas (lilás x menta com âmbar).

### E10 · VENTO DA ESTEPE (BAATAR, fase 1 e jogável)
1. Riscos longos e levemente curvos (`quadraticCurveTo` com flecha de 6–12 px), 60–200 px, `lineWidth` 2–4, em brilho com
   alfa 0,6 → 0, andando 10–16 px/tick: o vento no capim.
2. Anel de terra: elipse achatada (rx = 3·ry) no chão, crescendo 6 px/tick, `lineWidth` 6 → 0, em sombra, com a poeira que
   já existe (`Efeitos.poeira`) nas pontas.
- Parâmetros: 14–24 riscos. Variantes: `redemoinho` (riscos em espiral em volta de um ponto, r 50–120, 0,2 rad/tick),
  `rasante` (riscos a no máximo 20 px do chão), `frente` (parede de 20 riscos que avança junto e no fim curva em dois arcos,
  os braços).
- Estampa: riscos de vento horizontais. Acerto: anel de terra (rx 30 → 180 em 14 ticks) + 24 grãos de poeira.

### E11 · PENA DE ÁGUIA (BAATAR, fase 2)
1. Pena: elipse de 22 x 6 px em brilho com raque (linha central de 1 px em núcleo) e 5 cortes finos por lado em sombra; cai
   girando 0,04 rad/tick a 0,8–1,4 px/tick, balançando `sin(t/10)·1,5` px.
2. Asas: dois leques de 7 penas (40 → 70 px de comprimento) atrás do corpo, abrindo de 0 a 70° em 8 ticks.
- Parâmetros: 10–16 penas soltas, vida 40–60; asas 2 x 7. Estampa: penas deitadas espaçadas 100 px. Acerto: as asas fecham
  sobre o ponto e 12 penas se soltam (2–6 px/tick).

### E12 · MEANDRO E ANEL (ZENON, chefão; acrescentado em 2026-10-21 pela Nova, a partir de `docs/proposta-novo-chefao.md` §1.4)
1. Anéis concêntricos achatados (elipses com ry = 0,45·rx, rx de 40 a 160 px) que se abrem em brilho a partir de um **núcleo
   ônix** (`#0c0710`). O núcleo é desenhado com `source-over` e alfa ≤ 0,85; só o brilho usa `lighter`. Com `lighter`, um
   núcleo quase preto não soma nada e a regra da "energia em negativo" some.
2. Linha de meandro grego: uma polilinha em ângulos retos (módulo de 24 px) que corre pela faixa como moldura, de 6 a 10 px
   por tick.
- Parâmetros: de 3 a 5 anéis, 1 meandro em cima e 1 embaixo, até 6 "moedas" (losangos dourados `#d9b25a` de 10 x 6 px).
  Variantes: `selo` (anéis saindo da mão à frente), `selo-maior` (2 grupos de anéis defasados em 4 ticks), `coluna` (anéis
  empilhados subindo, rx diminuindo), `tributo` (anel que se fecha sobre o ponto do acerto e solta as moedas na direção do
  ZENON), `decreto` (meio anel que gira 180° junto com o `flip` da pose).
- Estampa: meandro a 10%. Acerto: o anel se fecha sobre o rival (rx de 160 a 30 em 10 ticks) e solta 6 moedas. Defesa: o
  anel bate e se desfaz em 4 segmentos retos, sem moedas.
- Orçamento: ≤ 24 primitivas por quadro, sem `shadowBlur`, sem `filter` e sem `getImageData` (como os outros 11).
- Por que é único: é o **único estilo geométrico em ângulo reto** e o **único de núcleo escuro**. Nenhum E1–E11 tem os dois.

### Camadas comuns (não são identidade, servem a todos)
- **C1 Anel de choque**: anel de r 20 → 90 (pesado: 30 → 150) em 10 ticks, `lineWidth` 8 → 0, em núcleo. Só no acerto.
- **C2 Riscos de velocidade**: 16 riscos paralelos à faixa (no lugar dos 28 da spec, para caber o estilo), 80–240 px, em
  `mix(sombra, #fff, 30%)` a alfa 0,3, andando 24 px/tick no sentido da entrada.
- **C3 Brilho local**: degradê radial de r ≤ 120 px em brilho, alfa 0,4 → 0 em 5 ticks. Substitui qualquer flash de tela
  cheia nos acertos (B15 permite um só flash, o da abertura).
- **C4 Halo da silhueta**: o da spec (B5), tingido de brilho.

---

## 3. Fichas por lutador

Formato de cada especial: **título** (selo) · **paleta** núcleo / brilho / sombra · **estilo** · **enquadramento**
(quadro, recorte, altura da faixa, ângulo, entrada) · **ritmo** · **som** · **acerto** / **defesa**.

### 3.1 HAYATO, "O Punho do Trovão" · Japão · E1 RAIO
`fire` hoje: `#6fe0ff #ffffff #1e6fe8`. O amarelo-elétrico da mecha do cabelo e da gola (traje A2) entra no RAIJIN-KEN.

**RAIJIN-DAN** (`hayato.base.sFire`, projétil)
- Selo: 雷神弾 · "bala do deus do trovão". Paleta `#eaffff` / `#6fe0ff` / `#0b3a8c`.
- Estilo: E1 `esfera`, 4 raios curtos girando em volta de um núcleo de 40 px que atravessa a faixa no sentido do rival.
- Enquadramento: `sa1` (palmas à frente), `CORPO`, faixa `media`, −8°, entrada lateral.
- Ritmo: MÉDIO. Som: abertura R(passa-alta 5000, Q 1, 0,04 s, 0,3) x3 a cada 40 ms; batida T(quadrada 659→1318, 0,18, 0,08) +
  T(dente-de-serra 110, 0,3, 0,1, passa-baixa 900).
- Acerto: raio de 5 galhos no ponto + C1 em núcleo. Defesa: eco de 2 raios curtos (40 px) que se desfazem na guarda.

**RAIJIN-KEN** (`hayato.base.sDown`, subida invulnerável)
- Selo: 雷神拳 · "punho do deus do trovão". Paleta `#ffffff` / `#ffe94a` / `#1450b8` (raio amarelo sobre azul: a mecha).
- Estilo: E1 `coluna`, um raio vertical grosso da base ao topo da faixa com 3 galhos.
- Enquadramento: `sb1` (soco subindo), `MEIO`, faixa `media`, +10°, entrada `BAIXO` (opcional; reserva lateral).
- Ritmo: RÁPIDO (é golpe de reversão, a tarja não pode parecer lenta). Som: abertura R(passa-baixa 2000→200, 1, 0,35, 0,5);
  batida T(quadrada 330→990, 0,1, 0,1).
- Acerto: um raio desce do topo da tela até o rival (descarga) + C3. Defesa: a coluna para no meio e se apaga em sombra.

**KAMINARI-STEP** (`hayato.base.sFwd`, investida)
- Selo: 雷ステップ · "passo do trovão". Paleta `#c8f6ff` / `#3fa9ff` / `#102a66`.
- Estilo: E1 `rastro`, 6 segmentos horizontais de raio arrastando atrás da pose; C2 dobrado (24 riscos, sem estrelas).
- Enquadramento: `sc1`, `BUSTO`, faixa `alta` e fina (altura 100 em vez de 132), 0°, entrada lateral.
- Ritmo: RÁPIDO. Som: abertura R(passa-banda 1200→5000, 2, 0,12, 0,3) ("zip"); batida um estalo R(passa-alta 5000, 0,04).
- Acerto: um raio horizontal de 220 px atravessa o rival na altura do soco. Defesa: o raio se quebra em 6 fagulhas na guarda.

### 3.2 WEI LONG, "O Dragão de Ferro" · China · E2 ESCAMA DE DRAGÃO
`fire`: `#d58bff #fff3ff #7a2de0`. Selos em pinyin com tons e caracteres simplificados (China continental).

**LONG ZHANG** (`wei-long.base.sFire`, onda de chi enorme e lenta)
- Selo: 龙掌 · Lóng Zhǎng · "palma do dragão". Paleta `#fff3ff` / `#d58bff` / `#4a1690`.
- Estilo: E2 `inteiro`, o dragão de 22 círculos atravessa a faixa da pose até o nome e se enrola em volta dele.
- Enquadramento: `special` (quadro próprio do atlas do WEI; reserva `sa1`), `CORPO`, faixa `media` e alta (132 + 24), 0°
  (plana, pesada), entrada lateral.
- Ritmo: PESADO. Som: abertura T(seno 70→45, 0,6, 0,8) + R(passa-baixa 400→80, 1, 0,5, 0,4); batida T(seno 98, 0,9, 0,4) +
  T(dente-de-serra 70→55, 0,4, 0,12, passa-baixa 400) (ronco).
- Acerto: mandíbula fechando + 8 escamas caindo + C1 grande. Defesa: o dragão se enrola na guarda e se desfaz em escamas
  que caem, em sombra clara.

**ZHEN DI** (`wei-long.base.sDown`, tremor rente ao chão, golpe baixo)
- Selo: 震地 · Zhèn Dì · "a terra treme". Paleta `#f0d8ff` / `#b46bff` / `#2e1050`.
- Estilo: E2 `terra`, só o dorso do dragão aparece, emergindo da borda de baixo da faixa, com a poeira de sempre.
- Enquadramento: `sb1` (pisão; reserva `crouchPunch`), `CORPO`, faixa `baixa`, −3°, entrada `CIMA` (o pisão cai).
- Ritmo: PESADO. Som: abertura T(seno 60→35, 0,4, 0,8) + R(passa-baixa 250, 1, 0,5, 0,5); batida 3 baques T(seno 80→40,
  0,12, 0,4) a +0, +90 e +180 ms.
- Acerto: 3 rachaduras curtas (polilinha de 4 pontos) sob o rival + o dorso salta. Defesa (agachado): o dorso passa e solta
  2 escamas na canela, sem rachadura.

**TIE SHAN KAO** (`wei-long.base.sFwd`, ombrada com armadura)
- Selo: 铁山靠 · Tiě Shān Kào · "a montanha de ferro se apoia" (técnica real do bajiquan). Paleta `#f4ecff` / `#8f5bff` /
  `#241046`.
- Estilo: E2 `couraça`, 9 escamas grandes em leque no ombro, sem cabeça.
- Enquadramento: `sc1`, `BUSTO`, faixa `media`, −10°, entrada lateral com parada seca no tick 9 (nada de deslizar até o 13).
- Ritmo: PESADO. Som: abertura T(triângulo 220, 0,5, 0,15) + R(passa-banda 400, 2, 0,2, 0,3); batida T(seno 55, 0,5, 0,7)
  ("bum" de ferro).
- Acerto: as 9 escamas explodem em leque + C1 duplo. Armadura absorvendo: uma escama acende no ombro a cada golpe absorvido.
  Defesa: as escamas batem na guarda e caem.

### 3.3 MIN-JI, "A Tempestade de Seul" · Coreia do Sul · E3 LÂMINA CRESCENTE e MUGUNGHWA
`fire`: `#ff6a9a #fff0f5 #d4144f`.

**BULKKOT** (`min-ji.base.sFire`, dois chutes que soltam lâminas)
- Selo: 불꽃 · "faísca de fogo". Paleta `#fff0f5` / `#ff6a9a` / `#8a0b33`.
- Estilo: E3 `par`, dois crescentes cruzam a faixa nos ticks 8 e 18 (os dois disparos), com 6 flores no rastro.
- Enquadramento: `sa1` (chute em meia-lua), `MEIO`, faixa `media`, +8°, entrada lateral.
- Ritmo: RÁPIDO. Som: abertura 2x R(passa-banda 1800→4200, 1,5, 0,1, 0,25) a +0 e +166 ms; batida T(triângulo 1109, 0,15, 0,1).
- Acerto (por lâmina, então pode dar 2 HITS): o crescente se parte em 5 flores. Defesa: o crescente parte em duas metades
  que caem, sem flores.

**HOERI CHAGI** (`min-ji.base.sDown`, chute tornado subindo, 3 acertos)
- Selo: 회오리 차기 · "chute redemoinho" (rev.: "hoeri" parece vir de 회오리, "redemoinho"; o termo de academia para o
  chute tornado também pode ser 돌개차기, *dolgae chagi*; confirmar com falante nativo).
- Paleta `#ffe3ee` / `#ff4f86` / `#5c0a2a`.
- Estilo: E3 `redemoinho`, 3 anéis de 3 crescentes subindo em espiral a 0,5 rad/tick.
- Enquadramento: `sb1` (giro), `MEIO`, faixa `media`, ângulo oscilando entre −8° e +8° durante a sustentação (a faixa
  "gira"), entrada lateral.
- Ritmo: RÁPIDO. Som: abertura 3 sopros R(passa-banda 1500 / 2200 / 3200, 1,5, 0,08, 0,25) a +0, +60, +120 ms; batida
  T(triângulo 1109→1480, 0,2, 0,1).
- Acerto: cada um dos 3 acertos solta um anel de crescentes e uma flor; no 3º, uma flor grande (r 40) abre em 6 ticks e
  cai. O contador sobe 1-2-3. Defesa: 3 "tins" e os crescentes ricocheteiam para fora em sombra clara, sem contador.

**TWIO YEOP CHAGI** (`min-ji.base.sFwd`, voadora lateral)
- Selo: 뛰어 옆차기 · "chute lateral voando". Paleta `#ffffff` / `#ffa0bf` / `#a50f3e`.
- Estilo: E3 `gigante`, um crescente de r 90 rasga a faixa na horizontal atrás do pé.
- Enquadramento: `sc1`, `CORPO-H` (a pose deitada encaixa pela largura), faixa `media` e baixa de altura (110), −4°,
  entrada lateral.
- Ritmo: RÁPIDO. Som: abertura R(passa-banda 900→3000, 1,2, 0,25, 0,3); batida T(seno 120→35, 0,22, 0,5) (o `kick`).
- Acerto: o crescente gigante corta e se desfaz em 8 flores. Defesa: o crescente bate na guarda, escorrega para cima e some.

### 3.4 CAIO, "Mestre da Ginga" · Brasil · E4 ARCO DE GINGA
`fire`: `#c8ff3a #fffde0 #2fb52f`. Sem verde-e-amarelo de bandeira nem clichê de carnaval: a identidade é a roda.

**ONDA VERDE** (`caio.base.sFire`, meia-lua de energia que vai e volta)
- Selo: "vai e volta". Paleta `#fffde0` / `#c8ff3a` / `#0f5a18`.
- Estilo: E4 `vaivém`, dois arcos que varrem em sentidos opostos; os riscos C2 invertem de sentido no tick 24 (ida e volta).
- Enquadramento: `special` (quadro próprio do atlas do CAIO; reserva `sa1`), `CORPO`, faixa `media`, +5°, entrada lateral.
- Ritmo: MÉDIO. Som: abertura T(triângulo 196→220, 0,35, 0,3) + R(passa-banda 3000, 3, 0,05, 0,2) a +0 e +80 ms (berimbau
  e caxixi); batida T(triângulo 196→220, 0,25, 0,2).
- Acerto (ida e volta contam separado): o arco fecha em anel no rival + 3 batidas. Defesa: o arco ricocheteia e some, sem
  batidas.

**RABO-DE-ARRAIA** (`caio.base.sDown`, rasteira giratória, golpe baixo)
- Selo: "rasteira da roda". Paleta `#eaff9a` / `#7ddc3a` / `#0f4d17`.
- Estilo: E4 `rasteiro`, arco de 300° achatado no nível do chão + poeira.
- Enquadramento: `sb1`, `CORPO`, faixa `baixa`, +6°, entrada lateral.
- Ritmo: MÉDIO. Som: abertura R(passa-banda 600→1600, 1, 0,3, 0,3); batida T(triângulo 147→165, 0,3, 0,3) (berimbau grave).
- Acerto: o arco fecha + 3 batidas no chão. Defesa (agachado): o arco solta 3 faíscas na canela e para.

**MEIA-LUA** (`caio.base.sFwd`, salto de ginga com chute descendente, golpe alto)
- Selo: "de cima, na roda". Paleta `#ffffff` / `#e4ff7a` / `#145a17`.
- Estilo: E4 `descendente`, arco vertical de 180° que desce acompanhando o pé.
- Enquadramento: `sc1`, `CORPO`, faixa `alta`, −8°, entrada `CIMA` (opcional; reserva lateral).
- Ritmo: RÁPIDO. Som: abertura T(triângulo 294→330, 0,25, 0,25) + caxixi; batida T(seno 120→35, 0,22, 0,5).
- Acerto: o arco termina num anel achatado sobre a cabeça do rival. Defesa (em pé): o arco se parte em dois.

### 3.5 AMINU, "A Lança de Kano" · Nigéria · E5 CORDA TRANÇADA e ÍNDIGO
`fire`: `#6f7dff #eef0ff #2b2fa6`, `accent` cobre `#d9822b`. A corda é a atadura da mão-lança; o índigo, o ofício da família.

**MASHI** (`aminu.base.sFire`, soco de carga em 3 níveis)
- Selo: mashi · "a lança" (rev.). Paleta `#eef0ff` / `#6f7dff` / `#1a1d6e`; a corda em cobre `#d9822b`.
- Estilo: E5 `punho`, a corda enrola em espiral no antebraço da pose.
- Enquadramento: `hp1` (o direto com a mão enfaixada), `BUSTO`, faixa `media`, +6°, entrada lateral.
- Ritmo: MÉDIO. Som: abertura T(seno 180→120, 0,22, 0,5) + R(passa-banda 900, 2, 0,03, 0,3) (kalangu); batida a mesma, um
  tom acima (240→150).
- **Atenção ao gatilho**: o `special` sai no começo da carga, então a tarja não sabe o nível. O nível aparece no acerto:
  - Acerto nível 1: respingo de 6 gotas + selo "DAYA" (um). Nível 2: 10 gotas + selo "BIYU" (dois), o rival cai. Nível 3:
    16 gotas, a corda **arrebenta** (dois pedaços voam girando) + selo "UKU" (três). Selos em hauçá (rev.; a grafia certa
    de "um" é ɗaya, com a letra Ɗ que a Impact não tem).
  - Defesa nos níveis 1 e 2: gotas pingam da guarda em sombra, sem número. Nível 3 é `quebra-guarda`: corda arrebentando,
    o texto que já existe, sem número (B11).
  - Som do acerto: 1, 2 ou 3 batidas de kalangu (180→120, 240→150, 300→180) a cada 70 ms; no nível 3 mais T(seno 55, 0,5, 0,8).

**GARKUWA** (`aminu.base.sDown`, palma-escudo que anula projétil)
- Selo: garkuwa · "o escudo" (rev.). Paleta `#ffe2bf` / `#d9822b` / `#2b2fa6` (escudo índigo com aro de cobre).
- Estilo: E5 `escudo`, a corda fecha num anel de r 50 em volta da palma aberta.
- Enquadramento: `sb1`, `BUSTO` **dentro de um medalhão** (máscara circular de r 80 na pose; é o único recorte circular do
  elenco), faixa `media`, 0°, entrada lateral.
- Ritmo: RÁPIDO. Som: abertura T(seno 260→200, 0,12, 0,4) (pele esticada) + R(passa-alta 2500, 1, 0,05, 0,2).
- Momento: projétil anulado (`clash`): o projétil vira gotas de índigo que escorrem pelo anel. Acerto corpo a corpo (dano 5):
  respingo pequeno. Defesa: o anel bate na guarda, sem gotas.
- **Risco de desenho** (ver §7): a tarja avisa o escudo antes de o projétil chegar.

**PASSO DO LEÃO** (`aminu.base.sFwd`, investida com o escudo)
- Selo: zaki · "o leão" (rev.). Paleta `#dfe3ff` / `#4a56e0` / `#0c0e40`.
- Estilo: E5 `varal`, 3 fios com tiras de tecido índigo que ondulam para trás com o avanço (os varais do cenário de Kano).
- Enquadramento: `sc1`, `CORPO`, faixa `media`, +3°, entrada lateral com passada de 20 px antes de parar (o empurrão).
- Ritmo: MÉDIO. Som: abertura 2 batidas de kalangu (180→120 e 160→110, +90 ms) + R(passa-banda 400, 1, 0,25, 0,3).
- Acerto: as tiras de tecido envolvem o ponto e os fios se esticam na direção do canto. Defesa: só o empurrão, os fios
  vibram e as tiras caem.

### 3.6 CENTELLA, "A Faísca da Arena" · México · E6 ESTRELA DE LUCHA e CORDAS
`fire`: `#22e3b0 #eafff8 #0b9a7a`. A máscara é identidade: a pose nunca é cortada de forma que a máscara fique fora do quadro.

**PLANCHA** (`centella.base.sFire`, salto alto e queda de corpo, golpe alto)
- Selo: ¡desde lo alto! Paleta `#eafff8` / `#22e3b0` / `#064f40`.
- Estilo: E6 `chuva`, 16 estrelas caindo com o cone de holofote.
- Enquadramento: `sa1` (o quadro da captura `centella-2-sFire-sa1`), `CORPO`, faixa `alta`, −10°, entrada `CIMA` (opcional).
- Ritmo: MÉDIO. Som: abertura T(triângulo 1568, 0,6, 0,25) + T(seno 2350, 0,4, 0,1) (um "ding") + R(passa-banda 700, 0,8,
  0,7, 0,2, ataque 0,2) (a torcida); batida T(seno 120→35, 0,22, 0,5).
- Acerto: anel de choque no chão + 12 estrelas + as 3 cordas vibram. Defesa (em pé): as estrelas batem e caem como confete
  prata, sem anel.

**HURACANRANA** (`centella.base.sDown`, agarrão no ar)
- Selo: ¡huracán! (a técnica leva o nome do luchador Huracán Ramírez). Paleta `#d9fff4` / `#3df5c8` / `#0b3b5c`.
- Estilo: E6 `órbita`, 8 estrelas girando em anel em volta da pose.
- Enquadramento: `sb2` (o quadro da captura `centella-2-sDown-sb2`, de cabeça para baixo com a máscara visível), `CORPO`,
  faixa `media`, +10°, entrada `BAIXO` (opcional).
- Ritmo: RÁPIDO. Som: abertura R(passa-banda 800→3000, 1,2, 0,2, 0,3).
- Agarrou (`throw`): o anel de estrelas fecha sobre o rival e gira uma volta + **3 "dings" do sino** (1568 Hz a +0, +120,
  +240 ms). Errou no chão: as estrelas apagam em cinza `#5a5f6e` e caem, sem sino. Não há defesa (é agarrão).

**RESORTE** (`centella.base.sFwd`, corre até a corda, quica e volta)
- Selo: ¡a las cuerdas! Paleta `#fffbe6` / `#19d9a8` / `#0a2e40` (luz de palco quente sobre a arena à noite).
- Estilo: E6 `cordas`, as 3 cordas se esticam para trás na primeira metade e soltam vibrando na segunda.
- Enquadramento: `sc0` (captura `centella-2-sFwd-sc0`), `CORPO`, faixa `media`, −6°. Entrada: a faixa entra pelo lado do
  RIVAL (ela corre de costas para a corda) e, no tick 24, os riscos C2 invertem (o quique).
- Ritmo: MÉDIO. Som: abertura T(dente-de-serra 98→140, 0,3, 0,15, passa-baixa 800) (corda tensionando); batida
  T(seno 220→440, 0,15, 0,3) (o quique).
- Acerto: estrelas em número proporcional ao momento (4 + momento/40, até 16) e cordas vibrando com A0 = 4 + momento/20
  (até 22 px) + "ding". Defesa: as cordas vibram pouco, sem estrelas.

### 3.7 CAMILLE, "A Riposte de Marselha" · França · E7 FIO DE FLORETE
`fire`: `#e6ebf7 #ffffff #8a94b0`. Prata sem matiz: a sombra navy do traje é o que separa a CAMILLE de qualquer branco.

**PARADE** (`camille.base.sFire`, postura de aparar) e a resposta **FOUETTÉ** (`camille.extras.sResp`)
- Selo: parade — riposte. Paleta `#ffffff` / `#e6ebf7` / `#3b4566`.
- Estilo: E7 `guarda`, um fio vertical único brilhando à frente dela, com o reflexo correndo de baixo para cima.
- Enquadramento: `sa1` (postura de guarda), `BUSTO`, faixa `media` e fina (100), 0°, entrada lateral.
- Ritmo: RÁPIDO. Som: abertura T(triângulo 2637, 0,3, 0,08) ("tiiing" leve).
- Aparou (`parry`): o fio vira um X (variante `x`) e o touche acende no rosto de quem atacou; som 2 "tins" T(triângulo
  3136 / 3520, 0,08, 0,15) a +0 e +50 ms + R(passa-alta 6000, 1, 0,1, 0,2). Fouetté acertou: touche + C1 + número.
  Fouetté defendido: o X se apaga. PARADE no vazio: o fio escurece para `#5b627a` e cai.
- **Pendência de contrato** (§7): o FOUETTÉ é outro golpe (`sResp`) e a sessão fecha quando o golpe deixa de ser `sFire`.

**COUP D'ARRÊT** (`camille.base.sDown`, chassé baixo que vira contragolpe)
- Selo: coup d'arrêt · "golpe de parada"; no contragolpe, selo extra **CONTRE-ATTAQUE** no acerto. Paleta `#ffffff` /
  `#c7d3ff` / `#4a5170`.
- Estilo: E7 `estocada`, um fio horizontal rente à base da faixa.
- Enquadramento: `sb1` (chassé), `CORPO`, faixa `baixa`, +4°. Entrada: pelo lado do RIVAL, parando no meio (a faixa é
  "parada" como o golpe).
- Ritmo: RÁPIDO. Som: abertura R(passa-alta 5000→8000, 1, 0,08, 0,25); batida T(seno 190→50, 0,13, 0,5) (o `punch`).
- Acerto: touche pequeno. Contragolpe (`contraEspecial`): touche grande + X + selo CONTRE-ATTAQUE. Hoje esse caso pinta um
  anel `#7fe3ff`, que é ciano da família do HAYATO: sugiro trocar por `#c7d3ff`. Defesa (agachado): o fio bate e verga, sem
  touche.

**REVERS** (`camille.base.sFwd`, giro de calcanhar que cruza o rival)
- Selo: le revers. Paleta `#f4f6ff` / `#a9b8e6` / `#1b2140`.
- Estilo: E7 `arco`, um fio curvo de 180° que contorna a pose, com o reflexo correndo.
- Enquadramento: `sc1`, `MEIO`, faixa `media`, −8°. A pose **vira** no tick 20 (escala x de 1 a −1 em 6 ticks), porque ela
  troca de lado. Entrada lateral.
- Ritmo: MÉDIO. Som: abertura R(passa-banda 2000→700, 1, 0,2, 0,25); batida T(triângulo 2637, 0,2, 0,12) no tick da virada.
- Acerto (pelas costas): o arco fecha num anel + touche. Defesa (o rival inverteu): o arco solta faíscas do lado de trás,
  sem touche.

### 3.8 NILA, "A Lua de Kerala" · Índia · E8 CHAMA DE LAMPARINA (GAJA) e E9 ESPIRAL DE SERPENTE (SARPA)
`fire`: `#ffb02e #fff6dc #d9720b`. HUD: GAJA `#ffb02e`, SARPA `#7dffb0` (`render/postura.ts`). As paletas seguem o HUD: GAJA
em âmbar, SARPA em menta, sempre com um âmbar no núcleo para a NILA continuar sendo a NILA. Âmbar de lamparina, **nunca
açafrão**.

**GOLPE MARMA** (`nila.base.sFire`, toque num ponto vital, atordoamento longo)
- Selo: marmam · "o ponto vital" (rev.; malaiala മർമ്മം). Paleta `#fff6dc` / `#ffb02e` / `#6b3200`.
- Estilo: E8 `pavio`, uma única chama pequena na ponta dos dedos; a faixa é a mais calma do jogo.
- Enquadramento: `sa1` (captura `nila-2-sFire-sa1`), `BUSTO`, faixa `media` e fina (110), 0°, entrada lateral.
- Ritmo: MÉDIO. Som: abertura T(seno 880, 0,5, 0,1) (um tom puro, sem sino de templo) + R(passa-banda 1200, 2, 0,02, 0,3)
  (o toque do dedo); batida 1 golpe de chenda T(seno 140→90, 0,2, 0,4).
- Acerto: 3 chamas mínimas (h 6) acendem no corpo do rival ligadas por um fio de 1 px e **pulsam** (alfa 0,4–1 a cada 10
  ticks) enquanto durar o atordoamento (`hs` 46). Defesa: a chama do dedo apaga em fumaça (`Efeitos.fumaca`, 4 nuvens).

**PASSO DO ELEFANTE** (`nila.base.sFwd`, avanço pesado com as duas palmas)
- Selo: gajam · "o elefante" (rev.; ഗജം). Paleta `#ffe7b0` / `#d9720b` / `#4a1f00`.
- Estilo: E8 `palmas`, duas fileiras de 4 chamas à frente das mãos; a cada passo, um anel achatado no chão com poeira.
- Enquadramento: `sc1`, `CORPO` (base baixa e larga), faixa `baixa`, 0°, entrada lateral lenta.
- Ritmo: PESADO. Som: abertura 2 golpes de chenda T(seno 110→70, 0,25, 0,5) + R(passa-baixa 400, 1, 0,2, 0,3) a +0 e
  +200 ms; batida rufo T(seno 140→90, 0,08, 0,3) x4 a cada 45 ms.
- Acerto: as 8 chamas se abrem em leque + o empurrão. Defesa: as chamas se achatam contra a guarda.

**BOTE** (`nila.sarpa.sFire`, deslize rasteiro que passa sob projéteis)
- Selo: sarpam · "a serpente" (rev.; സർപ്പം). Paleta `#ffe9b8` / `#7dffb0` / `#04301b`.
- Estilo: E9 `rasteira`, a hélice de r 6 colada à base da faixa, à frente da pose.
- Enquadramento: `sarpaSlide1` (chapada no chão), `CORPO-H`, faixa `baixa` e fina (90), 0°, entrada lateral rente.
- Ritmo: RÁPIDO. Som: abertura R(passa-banda 5200, 4, 0,3, 0,2) (chiado) + T(seno 160, 0,1, 0,3).
- Acerto: a ponta da hélice ergue em "S" e fecha no ponto (o bote). Defesa (agachado): a hélice se enrola e recua.
  Opcional: quando passa por baixo de um projétil, 3 escamas acendem no ponto de cruzamento (é a mecânica dela, merece ser
  vista).

**SALTO DA SERPENTE** (`nila.sarpa.sFwd`, salto em parafuso com chute descendente)
- Selo: chaattam · "o salto" (rev.; ചാട്ടം). Paleta `#fff1cc` / `#9cffc8` / `#0a4a2e`.
- Estilo: E9 `parafuso`, hélice vertical de r 26 subindo em volta da pose.
- Enquadramento: `sarpaLeap1` (o parafuso subindo, que está no atlas **sem uso** até hoje), `CORPO`, faixa `media`, +10°,
  entrada `BAIXO` (opcional).
- Ritmo: MÉDIO. Som: abertura R(passa-banda 2000→6000, 3, 0,35, 0,2) + T(seno 330→660, 0,3, 0,15); batida
  T(seno 120→35, 0,22, 0,5).
- Acerto: a hélice se comprime num anel no ponto do chute. Defesa (em pé): a hélice se desfaz em escamas que caem.

**VADIVU** (`nila.*.sDown`, troca de postura, custo 0): **fora da cinemática** (B1). A identidade dela fica no efeito
`troca-ficha` que já existe (estrela `#9cffc8` / `#ffd27a` + fumaça). Se um dia ganhar algo, a ideia é: o anel de 8 chamas
da GAJA se desenrola na hélice da SARPA (e o contrário), com chenda indo para GAJA e chiado indo para SARPA.

### 3.9 BAATAR, "O Avarga das Estepes" · Mongólia · E10 VENTO DA ESTEPE (fase 1 e jogável) e E11 PENA DE ÁGUIA (fase 2)
`fire` base `#ff4a2e #fff0d6 #9c140f`; `chefe2` `#ff2a10 #ffe08a #c4120a`. Ele é um campeão gentil, não um bárbaro: nada de
fogo de destruição, as cores são as do zodog (vermelho e ouro) e a energia é vento e terra. É o único com faixa mais alta
(132 + 32) nos agarrões: o tamanho é a mecânica dele.

**ARREMESSO DO AVARGA** (`baatar.base.sFire`, agarrão de comando)
- Selo: avarga · "o titã" (rev.; аварга). Paleta `#fff0d6` / `#ff4a2e` / `#5c0a06`.
- Estilo: E10 `redemoinho`, riscos de vento girando em volta da pose.
- Enquadramento: `sa1`, `BUSTO`, faixa `media` e alta (164), 0°, entrada lateral.
- Ritmo: PESADO. Som: abertura T(dente-de-serra 73, 0,8, 0,2, passa-baixa 500) + T(dente-de-serra 110, 0,8, 0,1,
  passa-baixa 600) (o bordão em quinta); batida T(seno 55, 0,4, 0,6).
- Agarrou (`throw`): anel de terra enorme (rx até 220) + poeira + T(seno 55→30, 0,5, 0,9) + R(passa-baixa 300, 1, 0,6, 0,5).
  Errou: o vento para de girar, os riscos caem como capim e a recuperação longa fica à vista (é a lição do chefe). Não há
  defesa (inbloqueável).

**QUEBRA-BASE** (`baatar.base.sDown`, gancho de perna baixo)
- Selo: bökh (rev.; бөх, o nome da luta). Paleta `#ffd9a0` / `#e0402a` / `#3b1a0a` (vermelho sobre terra).
- Estilo: E10 `rasante`, riscos rentes ao chão varrendo no sentido do puxão.
- Enquadramento: `sb1` (captura `baatar-2-sDown-sb1`), `CORPO`, faixa `baixa`, +4°, entrada pelo lado do RIVAL (o gancho
  puxa a perna para ele).
- Ritmo: MÉDIO. Som: abertura R(passa-banda 300→150, 1, 0,25, 0,4) + T(seno 90→45, 0,3, 0,5).
- Acerto: uma rachadura curta sob o pé do rival + poeira + tombo. Defesa (agachado): só poeira.

**ABRAÇO DA ESTEPE** (`baatar.base.sFwd` e `baatar.chefe.sFwd`, corrida de braços abertos que agarra)
- Selo: tal · "a estepe" (rev.; тал). Paleta `#ffe6b0` / `#ff6a3a` / `#7a1a0c` (sol de estepe).
- Estilo: E10 `frente`, uma parede de riscos vem junto com a pose e no fim curva em dois arcos (os braços).
- Enquadramento: `sc1`, `CORPO`, faixa `media` e alta (164), −4°, entrada lateral.
- Ritmo: PESADO. Som: abertura 3 passos T(seno 60, 0,15, 0,5) a +0, +150, +300 ms + R(passa-baixa 600, 1, 0,6, 0,2,
  ataque 0,3) (vento subindo).
- Agarrou: os dois arcos fecham + anel de terra + T(seno 50, 0,5, 0,8). Armadura absorvendo golpe leve: um pulso de terra
  no peito, o vento não para. Perdeu para golpe forte: os riscos se dispersam para os lados.

**MERGULHO DA ÁGUIA** (`baatar.chefe2.sFwd`, salto que rastreia o rival, golpe alto; só na fase 2)
- Selo: bürged · "a águia" (rev.; бүргэд). Paleta `#ffe08a` / `#ff2a10` / `#3a0603` (a energia saturada da `chefe2`).
- Estilo: E11, as duas asas de 7 penas abrem atrás da pose, com penas soltas caindo.
- Enquadramento: `dive1` (o mergulho de braços à frente), `CORPO-H`, faixa `media` e alta (164), −10°, entrada `CIMA`
  (opcional).
- Ritmo: PESADO. Som: abertura T(triângulo 2400→1500, 0,3, 0,12) com uma segunda voz a +20 cents (o grito da águia) +
  R(passa-banda 900, 1, 0,6, 0,2) (vento); batida T(seno 45, 0,6, 0,8).
- Acerto: as asas fecham sobre o rival e 12 penas se soltam + anel de terra. Defesa (em pé): as asas batem e as penas caem
  devagar, sem anel.

**DANÇA DA ÁGUIA (DEVEKH)**: fora da cinemática (B1, B13). Se a etapa `fase-chefe` 'danca' um dia ganhar acabamento, este é o
material: quadros `devekh0..2`, E11 com as asas abrindo e fechando no compasso da dança, bordão de morin khuur. É um gesto
de honra (ele reconhece o jogador como digno), nunca ameaça.

**Atualização de 2026-10-21 (decisão do dono, `docs/spec-chefao-zenon.md` §0):** o BAATAR deixa de ser chefão. O MERGULHO DA
ÁGUIA passa a ser o →+ESP **da ficha base** (chave `baatar.base.sFwd`, mesma paleta, E11, `dive1`, entrada `CIMA`). O
ABRAÇO DA ESTEPE sai do kit e o registro 28 da §4 fica sem uso. O BAATAR passa a ser o único lutador com **dois** estilos na
ficha base (E10 nos dois primeiros e E11 no →+ESP), e a unicidade continua valendo porque os dois são só dele. A Dança da
Águia vira **pose de entrada e de vitória** (render), ainda fora da cinemática.

### 3.10 ZENON ARGYROS, "O Arconte" · Grécia · E12 MEANDRO E ANEL (chefão; acrescentado pela Nova em 2026-10-21)
`fire` (proposta) base `#d6339a #0c0710 #2a0418`, `chefe2` `#e0249a #0c0710 #12040c`. É o dono do torneio. Ele é o **único
com núcleo ônix**, uma regra exclusiva do chefão: ninguém mais tem energia mais escura que o cenário. As chaves seguem o padrão
`<id>.<ficha|base>.<golpe>`. A ficha `chefe` não precisa de registro próprio porque cai na `base` (`identidadeDe`). A
`chefe2` precisa de registro só no ESP e no →+ESP, que trocam de golpe.

**SELO DO ARCONTE** (`zenon.base.sFire`, projétil em anel a meia altura)
- Paleta `#fff0f8` / `#d6339a` / `#2a0418`. Estilo E12 `selo`. Enquadramento `sa1`, `BUSTO`, faixa `media`, 0°, lateral.
  Ritmo MÉDIO.
- Projétil (render, estilo novo `anel`): 3 elipses concêntricas com núcleo ônix e borda em brilho, girando um arco de
  destaque. Acerto: o anel se fecha e solta 6 moedas. Defesa: 4 segmentos retos.

**COLUNA DE ÔNIX** (`zenon.base.sDown`, subida invulnerável, anti-aéreo)
- Paleta `#ffe6a8` / `#b02a7e` / `#1a0612`. Estilo E12 `coluna`. `sb1`, `CORPO`, faixa `media`, +10°, entrada `BAIXO`.
  Ritmo RÁPIDO.

**TRIBUTO** (`zenon.base.sFwd`, deslize com a palma; no acerto, toma energia do rival)
- Paleta `#ffffff` / `#ff5fb8` / `#3d0626`. Estilo E12 `tributo`. `sc1`, `CORPO`, faixa `media`, −4°, lateral. Ritmo
  PESADO.
- Acerto: o anel se fecha e as moedas voam **na direção da barra de energia do ZENON** (é o dreno visível; o número vem do
  campo `dreno` do evento). Defesa: metade das moedas.

**SELO MAIOR** (`zenon.chefe2.sFire`, fase 2)
- Paleta `#ffffff` / `#e0249a` / `#2a0418`. Estilo E12 `selo-maior`. `sa1`, `BUSTO`, faixa `media` e alta (164), 0°,
  lateral. Ritmo PESADO.

**DECRETO** (`zenon.chefe2.sFwd`, fase 2, investida que cruza o rival e acerta de costas de mão)
- Paleta `#ffe08a` / `#e0249a` / `#12040c`. Estilo E12 `decreto`. `sc1` (`decreto1` na arte), `MEIO`, vira com o `flip`,
  faixa `media`, −8°, lateral. Ritmo PESADO. Acerto e defesa: como o TRIBUTO (o DECRETO também drena).

Som (vocabulário da §1.6, só `tone`/`noise`): abertura T(dente-de-serra 147, 0,6, 0,12, passa-baixa 900) + T(dente-de-serra
220, 0,6, 0,08, passa-baixa 900), a quinta de órgão da trilha da valsa; batida T(triângulo 1175→880, 0,12, 0,1) (o cravo) +
T(seno 50, 0,4, 0,7). Moedas: 3 × T(triângulo 2637, 0,05, 0,05) a +0, +40 e +80 ms.

---

## 4. Tabela-resumo de unicidade

Leitura: o **estilo é exclusivo do lutador** (nenhum E aparece em dois lutadores), então dois especiais de lutadores
diferentes já diferem no estilo. As colunas de cor e enquadramento mostram que, além disso, nenhum par vizinho repete a cor
**e** o enquadramento ao mesmo tempo. Matiz = matiz do brilho (HSV), calculado.

| # | Lutador | Especial | Estilo (variante) | Brilho | Matiz | Quadro / recorte | Faixa / ângulo / entrada | Ritmo |
|---|---|---|---|---|---|---|---|---|
| 1 | HAYATO | RAIJIN-DAN | E1 esfera | `#6fe0ff` | 193° | sa1 / CORPO | media / −8° / lateral | médio |
| 2 | HAYATO | RAIJIN-KEN | E1 coluna | `#ffe94a` | 53° | sb1 / MEIO | media / +10° / baixo | rápido |
| 3 | HAYATO | KAMINARI-STEP | E1 rastro | `#3fa9ff` | 207° | sc1 / BUSTO | alta fina / 0° / lateral | rápido |
| 4 | WEI LONG | LONG ZHANG | E2 inteiro | `#d58bff` | 278° | special / CORPO | media alta / 0° / lateral | pesado |
| 5 | WEI LONG | ZHEN DI | E2 terra | `#b46bff` | 270° | sb1 / CORPO | baixa / −3° / cima | pesado |
| 6 | WEI LONG | TIE SHAN KAO | E2 couraça | `#8f5bff` | 259° | sc1 / BUSTO | media / −10° / lateral seca | pesado |
| 7 | MIN-JI | BULKKOT | E3 par | `#ff6a9a` | 341° | sa1 / MEIO | media / +8° / lateral | rápido |
| 8 | MIN-JI | HOERI CHAGI | E3 redemoinho | `#ff4f86` | 341° | sb1 / MEIO | media / ±8° oscilando / lateral | rápido |
| 9 | MIN-JI | TWIO YEOP CHAGI | E3 gigante | `#ffa0bf` | 340° | sc1 / CORPO-H | media fina / −4° / lateral | rápido |
| 10 | CAIO | ONDA VERDE | E4 vaivém | `#c8ff3a` | 77° | special / CORPO | media / +5° / lateral, riscos invertem | médio |
| 11 | CAIO | RABO-DE-ARRAIA | E4 rasteiro | `#7ddc3a` | 95° | sb1 / CORPO | baixa / +6° / lateral | médio |
| 12 | CAIO | MEIA-LUA | E4 descendente | `#e4ff7a` | 72° | sc1 / CORPO | alta / −8° / cima | rápido |
| 13 | AMINU | MASHI | E5 punho | `#6f7dff` | 234° | hp1 / BUSTO | media / +6° / lateral | médio |
| 14 | AMINU | GARKUWA | E5 escudo | `#d9822b` | 30° | sb1 / BUSTO em medalhão | media / 0° / lateral | rápido |
| 15 | AMINU | PASSO DO LEÃO | E5 varal | `#4a56e0` | 235° | sc1 / CORPO | media / +3° / lateral com passada | médio |
| 16 | CENTELLA | PLANCHA | E6 chuva | `#22e3b0` | 164° | sa1 / CORPO | alta / −10° / cima | médio |
| 17 | CENTELLA | HURACANRANA | E6 órbita | `#3df5c8` | 165° | sb2 / CORPO | media / +10° / baixo | rápido |
| 18 | CENTELLA | RESORTE | E6 cordas | `#19d9a8` | 165° | sc0 / CORPO | media / −6° / pelo rival, riscos invertem | médio |
| 19 | CAMILLE | PARADE (+FOUETTÉ) | E7 guarda → x | `#e6ebf7` | neutro | sa1 / BUSTO | media fina / 0° / lateral | rápido |
| 20 | CAMILLE | COUP D'ARRÊT | E7 estocada | `#c7d3ff` | neutro frio | sb1 / CORPO | baixa / +4° / pelo rival, para no meio | rápido |
| 21 | CAMILLE | REVERS | E7 arco | `#a9b8e6` | neutro frio | sc1 / MEIO, vira | media / −8° / lateral | médio |
| 22 | NILA (GAJA) | GOLPE MARMA | E8 pavio | `#ffb02e` | 37° | sa1 / BUSTO | media fina / 0° / lateral | médio |
| 23 | NILA (GAJA) | PASSO DO ELEFANTE | E8 palmas | `#d9720b` | 30° | sc1 / CORPO | baixa / 0° / lateral lenta | pesado |
| 24 | NILA (SARPA) | BOTE | E9 rasteira | `#7dffb0` | 144° | sarpaSlide1 / CORPO-H | baixa fina / 0° / lateral | rápido |
| 25 | NILA (SARPA) | SALTO DA SERPENTE | E9 parafuso | `#9cffc8` | 147° | sarpaLeap1 / CORPO | media / +10° / baixo | médio |
| 26 | BAATAR | ARREMESSO DO AVARGA | E10 redemoinho | `#ff4a2e` | 8° | sa1 / BUSTO | media alta / 0° / lateral | pesado |
| 27 | BAATAR | QUEBRA-BASE | E10 rasante | `#e0402a` | 7° | sb1 / CORPO | baixa / +4° / pelo rival | médio |
| 28 | BAATAR | ABRAÇO DA ESTEPE | E10 frente | `#ff6a3a` | 15° | sc1 / CORPO | media alta / −4° / lateral | pesado |
| 29 | BAATAR (fase 2 até 2026-10-21; agora ficha base, `baatar.base.sFwd`) | MERGULHO DA ÁGUIA | E11 asas | `#ff2a10` | 7° | dive1 / CORPO-H | media alta / −10° / cima | pesado |
| 30 | ZENON | SELO DO ARCONTE | E12 selo | `#d6339a` | 322° | sa1 / BUSTO | media / 0° / lateral | médio |
| 31 | ZENON | COLUNA DE ÔNIX | E12 coluna | `#b02a7e` | 322° | sb1 / CORPO | media / +10° / baixo | rápido |
| 32 | ZENON | TRIBUTO | E12 tributo | `#ff5fb8` | 327° | sc1 / CORPO | media / −4° / lateral | pesado |
| 33 | ZENON (fase 2) | SELO MAIOR | E12 selo-maior | `#e0249a` | 322° | sa1 / BUSTO | media alta / 0° / lateral | pesado |
| 34 | ZENON (fase 2) | DECRETO | E12 decreto | `#e0249a` | 322° | decreto1 / MEIO, vira | media / −8° / lateral | pesado |

O registro 28 (ABRAÇO DA ESTEPE) fica sem uso depois do BAATAR normal. Pode ser apagado da tabela de código, mas a
unicidade não depende dele.

**Os pares de lutadores diferentes mais próximos, e por que não se confundem:**

| Par | O que se parece | O que separa |
|---|---|---|
| GARKUWA (14) x PASSO DO ELEFANTE (23) | brilho cobre e âmbar no mesmo matiz (30°) | sombra índigo x marrom; corda em anel x 8 chamas; BUSTO em medalhão x CORPO baixo; rápido x pesado |
| MASHI (13) / PASSO DO LEÃO (15) x RAIJIN-DAN (1) / KAMINARI-STEP (3) | azuis com núcleo quase branco | índigo 234° x ciano 193–207°; corda torcida e gotas x raio que pisca; recortes diferentes em cada dupla |
| HURACANRANA / RESORTE (17, 18) x BOTE / SALTO (24, 25) | verde-água x menta (20° de distância) | estrelas de 4 pontas e prata x hélice fina; núcleo âmbar só na NILA; faixa baixa fina (BOTE) não existe na CENTELLA |
| PLANCHA (16) x MEIA-LUA (12) | os dois caem de CIMA, ângulos negativos | jade 164° x limão 72°; chuva de estrelas x arco descendente |
| RAIJIN-KEN (2) x SALTO DA SERPENTE (25) | os dois sobem de BAIXO a +10° | amarelo sobre azul x menta com núcleo âmbar; coluna de raio x parafuso em hélice; MEIO x CORPO |
| PARADE / COUP D'ARRÊT (19, 20) x RAIJIN-DAN (1) | núcleo branco | prata sem matiz e sombra navy x ciano saturado; um fio fino x vários raios |
| BAATAR (26–29) x MIN-JI (7–9) | quentes, vermelho e rosa | 7–15° x 340°; vento, terra e penas x crescentes e flores; pesado x rápido |
| BAATAR (26–29) x NILA GAJA (22, 23) | quentes | vermelho-brasa x âmbar de lamparina (≥ 15° e sombra diferente); vento x chama em gota |
| ZENON (30–34) x MIN-JI (7–9) | rosas e magentas: 322–327° x 340–341°, **13° no par mais próximo** (TRIBUTO 327° x TWIO 340°; a proposta dizia 14–19°) | núcleo ônix e sombra quase preta x núcleo claro; anéis e meandro em ângulo reto x crescentes e flores; MIN-JI é toda rápida, ZENON é médio, rápido e pesado; TRIBUTO é `sc1`/CORPO e o TWIO é `sc1`/CORPO-H |
| ZENON (30–34) x WEI LONG (4–6) | roxos frios de energia | 322° x 259–278° (≥ 44°); núcleo ônix x núcleo claro; anéis geométricos x escamas |

Mesmo que a L2 deixe todas as entradas laterais (sem `CIMA`/`BAIXO`), a tabela continua sem par igual: o estilo exclusivo
sozinho já separa os lutadores, e entre os do mesmo lutador muda a variante e o recorte.

---

## 5. Contraste do nome sobre a faixa (≥ 3:1, texto grande)

**Calculado, não medido no navegador** (fórmula de luminância relativa da WCAG 2.x, com um script descartável fora do
repositório; refazer é trocar as 3 cores e aplicar as mesmas misturas). Fundo = centro da faixa `mix(sombra, brilho, 35%)`, o ponto mais claro do degradê.
O nome tem degradê: topo = núcleo, base = `mix(núcleo, brilho, 40%)`. O contorno `mix(sombra, #000, 45%)` dá de 12,4:1 a
17,2:1 contra o núcleo nos 29.

| Especial | Centro da faixa | Topo do nome | Base do nome |
|---|---|---|---|
| RAIJIN-DAN | `#2e74b4` | 4,74 | 4,05 |
| **RAIJIN-KEN** (o amarelo do HAYATO) | `#668692` | 3,90 | 3,55 |
| KAMINARI-STEP | `#20569c` | 6,29 | 4,65 |
| LONG ZHANG / ZHEN DI / TIE SHAN KAO | `#7b3fb7` / `#5d308d` / `#492a87` | 6,03 / 7,03 / 9,31 | 4,46 / 4,96 / 5,79 |
| BULKKOT / HOERI / TWIO | `#b32c57` / `#95224a` / `#c5426b` | 5,57 / 6,71 / 4,81 | 3,86 / 4,47 / 3,74 |
| ONDA VERDE / RABO / MEIA-LUA | `#509424` / `#367f23` / `#5d943a` | 3,64 / 4,57 / 3,64 | 3,42 / 3,80 / 3,47 |
| MASHI / GARKUWA / LEÃO | `#383fa1` / `#684c7b` / `#222778` | 7,75 / 5,80 / 10,17 | 5,13 / 4,21 / 5,94 |
| PLANCHA / HURACANRANA / RESORTE | `#108367` / `#1d7c82` / `#0f6a64` | 4,52 / 4,59 / 6,18 | 3,66 / 4,06 / 4,76 |
| PARADE / COUP D'ARRÊT / REVERS | `#777f99` / `#767fa2` / `#4d567a` | 3,98 / 3,94 / 6,65 | 3,71 / **3,38** / 5,30 |
| MARMA / ELEFANTE / BOTE / SALTO | `#9f5e10` / `#7c3c04` / `#2e784f` / `#3d8964` | 4,77 / 6,91 / 4,49 / 3,77 | 3,85 / 4,70 / 4,32 / 3,64 |
| ARREMESSO / QUEBRA-BASE / ABRAÇO / MERGULHO | `#952014` / `#752715` / `#a9361c` / `#7f1308` | 7,49 / 7,62 / 5,32 / 8,14 | 4,70 / 4,77 / 3,74 / 4,91 |
| SELO / COLUNA / TRIBUTO / SELO MAIOR / DECRETO (ZENON) | `#661446` / `#4e1338` / `#812559` / `#6a0f46` / `#5a0f3e` | 10,85 / 11,61 / 8,96 / 11,89 / 10,34 | 6,22 / 6,29 / 5,89 / 6,42 / 6,03 |

ZENON: a Nova recalculou com a mesma fórmula em 2026-10-21. Os números do Apolo batem com diferença de ±0,05, e o SELO MAIOR
é novo. O par mais fraco do ZENON (5,89) fica bem acima do mínimo do elenco (3,38).

Mínimo: 3,38:1 (base do nome do COUP D'ARRÊT). **Decisão sobre o amarelo do HAYATO:** o amarelo fica no **raio** (brilho),
não no nome; com a sombra escurecida para `#1450b8` o nome passa com 3,55:1. Para chegar nesses números ajustei três
sombras durante o cálculo: ONDA VERDE `#146b1e` → `#0f5a18`, MEIA-LUA `#1f7a22` → `#145a17`, e o núcleo do SALTO DA
SERPENTE `#ffd27a` → `#fff1cc` (com o âmbar forte ele caía para 2,61:1). A prova de verdade é a captura dos 9 no navegador
(fatia A1 da spec), com a estampa (10%) e o halo por cima.

---

## 6. Cultura sem estereótipo (o que cada ficha evita)

- **HAYATO**: trovão e kanji de técnica, sem torii, sem samurai, sem "sol nascente".
- **WEI LONG**: dragão como força da palma, técnica real do bajiquan; sem gongo, sem lanterna vermelha, sem caractere
  decorativo aleatório.
- **MIN-JI**: hangul e a flor nacional (mugunghwa); sem K-pop, sem bandeira.
- **CAIO**: berimbau, caxixi, a roda; sem bandeira, sem carnaval, sem futebol.
- **AMINU**: o tambor falante hauçá e o índigo de Kano (cultura urbana e artesanal); sem "magia africana", sem amuletos,
  sem savana, sem símbolos iorubás (adire) no contexto hauçá.
- **CENTELLA**: estrelas da máscara, cordas e sino do ringue; sem caveira de Día de Muertos, sem sombreiro, sem cacto. A
  máscara nunca sai do quadro.
- **CAMILLE**: esgrima e savate; sem Torre Eiffel, sem boina, sem listra de marinheiro.
- **NILA**: chama de lamparina (âmbar, **nunca açafrão**), chenda, termos do kalari; sem encantador de serpentes, sem
  sino de templo, sem "Índia mística". A serpente é postura de arte marcial, não animal ameaçador.
- **BAATAR**: vento, terra e a águia do DEVEKH (gesto de honra); sem horda, sem arco e flecha, sem crânios, sem tug nem ovoo.
- **ZENON**: pancrácio, meandro e o anel do torneio. Sem toga, sem louros, sem deuses, sem Partenon, sem "300" e sem piada de
  crise. O selo opcional em grego (Άρχων, παγκράτιον) só vai para a tela depois de revisão nativa.

---

## 7. Pendências e perguntas

**Para a Nova (contrato da sessão, B10/B11):**
1. **Agarrões não emitem `hit`.** ARREMESSO DO AVARGA, ABRAÇO DA ESTEPE e HURACANRANA terminam em `arremessar()`, que emite
   `throw` (`src/fight/game.ts:279`), não `hit`. Com o C3 de hoje (só `hit` ganha `dano` e `especial`), esses três especiais
   nunca mostram número nem contador. Sugestão: `throw` ganha `dano` e `especial?: true`, e a `SessaoEspecial` conta `throw`
   como acerto.
2. **FOUETTÉ fora da sessão.** A PARADE abre a sessão com `golpe: 'sFire'`; ao aparar, a CAMILLE começa `sResp`
   (`game.ts:610`) e a sessão fecha porque `move !== golpe`. O acerto do FOUETTÉ (`hit.especial` é true, o nome começa com
   's') não aparece. Sugestão: a sessão aceita `extras.sResp` como continuação da PARADE.
3. **MASHI e o nível da carga.** O `special` sai no começo da carga, então a tarja não sabe o nível; por isso o nível ficou
   no acerto (selos DAYA/BIYU/UKU). Se quiserem o nível na tarja, o gatilho da MASHI teria de ser a soltura.
4. **Golpes de reação anunciados.** PARADE e GARKUWA dependem de o rival não saber que estão ativos. A tarja de 0,8 s avisa
   (o R1 da spec, aqui com efeito maior): na 1ª vez de cada luta o rival simplesmente não ataca. Sugestão para o dono
   decidir: nesses dois, a cinemática sai no **sucesso** (`parry` / `clash`), e não no começo.
5. **Troca de quadro e entradas opcionais.** O `quadro?` sugerido (§1.2) e as entradas `CIMA`/`BAIXO` (§1.3) pedem um campo
   na tabela de apresentação; sem eles, vale o padrão da spec.

**Para a Lyra (L2):** tabela `render/identidade-especiais.ts` com os 29 registros (paleta, estilo + variante, quadro,
recorte, altura e ângulo da faixa, entrada, ritmo, receita de som, selo). Os 11 estilos são funções puras
`(ctx, t, paleta, caixa, rng, params)`, cada uma com no máximo 24 primitivas por quadro.

**Para o dono:** (a) ligar ou não os selos no idioma da cultura (pedem fonte do sistema e revisão nativa); (b) item 4
acima; (c) aprovar as receitas de som no lugar de `introWhoosh` + `introHit` (o veredito do Apolo é trocar).

**Revisão de falante nativo** (antes de qualquer selo ir para a tela): hauçá (mashi, garkuwa, zaki, ɗaya/biyu/uku),
malaiala (marmam, gajam, sarpam, chaattam), mongol (avarga, bökh, tal, bürged), coreano (HOERI CHAGI). Japonês, chinês e
francês têm menor risco, mas valem a mesma conferência.

**Para o Apolo (fatia A1):** aprovar as capturas dos 9 no perfil de celular; conferir halo, estampa e contraste na tela
real; medir o selo em kanji, hangul, malaiala e cirílico no celular.
