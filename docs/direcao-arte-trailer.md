# Direção de arte: trailer de abertura

Autor: Apolo (direção de arte). Data: 2026-10-22. Missão `cmvjezzmo01hu01p72a4obr6z`. Base: HEAD `c3ad28f` + o trabalho da Vega
(`docs/handoff-vega-trailer.md`). Spec: `docs/spec-trailer-abertura.md` §1–§3. Este documento substitui o `docs/textos-trailer.md` e o
`docs/storyboard-trailer.md` previstos na T1 da spec.

Situação: **proposta com dados aplicados.** Os textos e os campos de arte do roteiro já estão em `src/data/trailer/textos.ts` e
`src/data/trailer/roteiro.ts` (testes do trailer verdes, tomadas conferidas). O desenho (tipografia, placa, montagem, grade de cor,
logo) é da Lyra: o protótipo de referência está em `arte-fonte/trailer/prototipo/arte-trailer.js` e as prévias em
`arte-fonte/capturas/trailer-arte-*.png`, renderizadas no jogo real com o `DiretorDoTrailer` de verdade.

---

## 0. Resumo para quem decide

1. **A frase do trailer**, lida cartão a cartão: **DEZ MESTRES. / DEZ NAÇÕES. / UM SÓ CINTURÃO. / CINCO SELOS. / QUEM SOBE AO TOPO…**
   e corte seco para o Arconte. É uma contagem (dez, dez, um, cinco) que termina numa pergunta, e a resposta é o ZENON.
2. **Duas vozes tipográficas.** Bangers continua sendo a voz dos lutadores (balões). O trailer fala com a voz do torneio: Barlow
   Condensed 800 itálico, a mesma do HUD e do "PRESSIONE ENTER". O texto tem duas cores tiradas da logo: **aço** (o INNO) nas
   palavras de base e **fogo** (o FIGHTERS) na última palavra, que é a mesma regra de ênfase dos balões.
3. **A câmera corrige três defeitos medidos.** O ZENON a 1,30 e o BAATAR a 1,25 tinham a cabeça cortada pela faixa do letterbox. Os
   empurrões dos P3, P5 e P6 chegavam ao pico até 90 ticks depois do golpe, porque usavam o `alvo` pedido e não o tick da tomada. Os
   "cortes secos" do P2 e do P4 não apareciam na tela (o quadro antes e o depois saíam iguais).
4. **P8 com 8 retratos e não 9.** O HAYATO sai da montagem. Assim ela respeita 2,5 cortes/s mudando só a lista `ordem`, sem mexer em
   tick nem em `curvas.ts`. E ganha sentido: ele é quem "sobe ao topo" e aparece no corte seguinte, diante do Arconte.
5. **Um único flash de tela cheia**, o do c24.1, em branco quente. Ele fica **atrás** da logo, que bate nítida e rompe o quadro de
   cinema. O raio do P0 foi medido e não conta como flash.

Decisões para o dono: §12.

---

## 1. A história em cinco cartões

| Onde | Texto | Por quê |
|---|---|---|
| P0, c2 (faixa de baixo) | **DEZ MESTRES.** | O HAYATO aparece em contraluz no raio. Abre pelo elenco. |
| C1, c5 (`kr`) | **DEZ NAÇÕES.** | O `kr` é o único dos 10 cenários que não tem luta no trailer. É nele que o "dez nações" fica literalmente verdadeiro. |
| C2, c8 (`cn`) | **UM SÓ CINTURÃO.** | Fecha o ritmo de três (dez, dez, um). "Cinturão" é a aposta concreta: só um sai com ele. "Torneio" já está escrito na faixa da logo, que entra 28 s depois. E o cinturão é lore: há trinta anos ele não sai da casa do Arconte (`docs/textos-chefoes.md`). |
| C3, c13 (preto) | **CINCO SELOS.** | É o nome do enredo ("Os Cinco Selos"), a palavra que o jogo já usa no aviso de chefe ("O PRIMEIRO SELO"). Ela prepara o E12 do ZENON (SELO DO ARCONTE) no P9. O cartão cai entre os guardiões (AMINU e CENTELLA antes, CAMILLE, NILA e BAATAR depois), e os 5 anéis acendem sob o texto (§4.2). |
| P8, c21 (faixa de baixo) | **QUEM SOBE AO TOPO…** | É a pergunta que o P9 responde. As reticências caem no tempo de silêncio do c22.1, antes do 1º braseiro. São um caractere só (U+2026), por isso cabem nos 18. |
| P10, c25 | PRESSIONE ENTER / TOQUE PARA JOGAR | São iguais ao título (`title.ts`), porque o último quadro do trailer É o 1º quadro do título. |

"CINCO GUARDIÕES." (o rascunho) foi trocado por **CINCO SELOS.**: é mais curto (12 contra 16), é o vocabulário do jogo e não
fala de gênero. O "QUEM CHEGA AO TOPO" (18, sem reticências) virou **QUEM SOBE AO TOPO…** (18, com reticências): "sobe" ocupa uma
letra a menos que "chega" e libera o espaço do "…".

## 2. Textos (`src/data/trailer/textos.ts`)

| Chave (do Vega, não mudou) | Texto | Caract. | Estilo |
|---|---|---|---|
| `dez-mestres` | DEZ MESTRES. | 12 | faixa (P0) |
| `dez-nacoes` | DEZ NAÇÕES. | 11 | cartão (C1) |
| `um-torneio` | UM SÓ CINTURÃO. | 15 | cartão (C2) |
| `cinco-guardioes` | CINCO SELOS. | 12 | cartão (C3) |
| `quem-chega-ao-topo` | QUEM SOBE AO TOPO… | 18 | faixa (P8) |
| `pressione-enter` / `toque-para-jogar` | PRESSIONE ENTER / TOQUE PARA JOGAR | 15 / 16 | prompt (P10), igual ao título |

- As chaves `um-torneio`, `cinco-guardioes` e `quem-chega-ao-topo` ficaram com o nome antigo. Renomear exige `tipos.ts`, que é da
  Vega (pendência cosmética, §11).
- **Placas** (`PLACAS`): mudei só o comentário. O texto da placa é `NOME · PAÍS`, e o epíteto é **igual ao `title`** de
  `src/data/lutadores/*.ts`, a mesma frase da seleção (consistência: o jogador reconhece). `NOME_OCULTO` continua `???`.
- **Verificado por script** (`arte-fonte/trailer/prototipo/glifos.py`, com fontTools): 0 falhas. O script confere ≤ 18 caracteres e
  caixa alta nos cartões, o conjunto Latin-1 + `— … “ ” ‘ ’` e cada caractere no cmap das 3 fontes do jogo
  (`public/assets/fontes/*.woff2`): Barlow Condensed 800 itálico, Barlow 600 e Bangers. O `…`, o `·` e todos os acentos usados
  existem nas três. `validarRoteiro` também passa (teste "o roteiro e as tomadas do repositório passam").

## 3. Veredito dos palpites da Vega

| Palpite | Veredito | O que mudou (campo exato) |
|---|---|---|
| C1 sobre `kr` | **Aprovado.** É o único cenário sem luta no trailer, então o "dez nações" mostra a 10ª nação. | nada |
| C2 sobre `cn` | **Aprovado.** O pátio cerimonial com lanternas lê como "palco do torneio". O `gr` (arena do Arconte) seria ainda melhor, mas não é residente: só carrega no P8. E o `jp` repete o P0. | nada |
| C3 preto | **Aprovado**, com acréscimo de arte: fundo radial `#1a0f26` → `#04020a` e os 5 selos (§4.2). | nada no dado (o desenho é da Lyra) |
| P0 câmera 1,00→1,12 linear | **Aprovado.** | nada |
| P1 pico 1,25 em t 110 | Ajustado: o pico agora cai no acerto (tick 96 da tomada) e solta com curva `saida`. | `P1.camera` |
| P2 corte por troca de foco com zoom igual (1,18→1,18) | **Reprovado: o corte não existia.** Medido: o quadro 95 e o 96 saíam iguais, porque os dois lutadores estão perto e a âncora quase não muda. Agora é **fechado na MIN-JI (1,22) → aberto no CAIO (1,0)**, e o enquadramento muda 22%. Os picos caem nos acertos da tomada (61 e 140). | `P2.camera` |
| P3/P5/P6/P7 `empurrar(pico, alvo)` | **Reprovado: o pico vinha antes ou depois do golpe.** A câmera usava o `alvo` pedido (96/100), mas a tomada gravou o acerto em 50 (P3), 141 (P5), 91 (P6) e 129 (P7). E segurar o pico 50 ticks depois do golpe enquadrava o rebote: o AMINU e o BAATAR iam ao topo da tela. O `empurrar` novo empurra em 34 ticks, segura 18 e solta em 30, ancorado no tick DA TOMADA. | função `empurrar` + `P3/P5/P6/P7.camera` |
| P4 troca de foco meio→p1 no tick 72 | **Reprovado como corte** (invisível, medido: 71 = 72). O foco fica na CENTELLA desde o tick 0, que era a intenção ("acompanha o percurso"). | `P4.camera[0].foco` |
| P7 pico 1,25 | Baixado para **1,15**, segurando só 4 ticks (§5). | `P7.camera` |
| P9 1,0→1,2→1,30 no ZENON | **Reprovado: a cabeça entrava na faixa.** Medido: topo do ZENON em y 45 a 1,21, com a faixa em 69. Teto agora **1,10** no acerto do E12 (tick 172). O peso do chefão vem da contraluz, dos braseiros e do silêncio, não do zoom. | `P9.camera` |
| P8: 9 retratos em 2 compassos | **Contradição resolvida sem tocar em tick:** 8 retratos, 1 por tempo (24 ticks = 2,5/s, exatamente o teto). O HAYATO sai (§4.4). | `P8.ordem` (9 → 8 ids) |
| Estática: quadros 3 e 4 sobre `mx` e `gr` | **Reprovado:** a versão estática "usa só arte residente" (spec §6.3), e `mx`/`gr` não são residentes (os fixos são padrão, `jp`, `cn`, `kr`, `br`). Agora `kr` e `cn`. | `estatica.quadros[3].stage`, `estatica.quadros[4].stage` |

**Ticks:** não mexi em nenhum tick do motor, `pede`, `alvo`, `folga`, lutador, cenário de luta nem janela de título. Os `t` dos
quadros-chave de câmera mudaram (são ticks do PLANO, só de câmera). As trocas de foco continuam em múltiplos de 24 (só sobrou a do P2,
no 96). `npx vitest run tests/unit/trailer-*.test.ts`: 95/95. `npm run trailer:escalar -- --verificar`: as 8 tomadas conferem.
`npx tsc --noEmit`: 0 erros.

## 4. Tipografia e sistema visual

Coordenadas lógicas 960×540. Fontes que o jogo já carrega: `FH` = Barlow Condensed 800 itálico; `FB` = Barlow 600. A Bangers fica
**só** nos balões: ela é a voz dos lutadores, e o trailer é a voz do torneio.

### 4.1 Título de cartão (C1, C2, C3)

- **`FH(64)`**, tracking **+3 px** (`letterSpacing`), centrado em (480, 270). No C3 fica em y 256, para caber a fileira de selos.
- **Duas cores**: as palavras de base em **aço** (gradiente vertical `#ffffff` → `#e6eeff` 50% → `#9fb4d8`) e a **última palavra**
  em **fogo** (`#fff2b8` → `#ffc53d` 55% → `#ff6a1a`). O corte é no último espaço, então "QUEM SOBE AO | TOPO…" e "UM SÓ | CINTURÃO.".
  É a regra dos balões (ênfase na última palavra) com as cores da logo (INNO aço, FIGHTERS fogo).
- **Contorno** `#07040e` de 0,12 em (7,7 px), `lineJoin = 'round'`. **Sombra dura** preta a 55% em (+2, +4). **Brilho de brasa**
  só na palavra de fogo: `shadowBlur` 0,5 em (32 px), `rgba(255,110,30,.6)`. **Fio do bisel**: faixa branca de 0,08 em a 35% no
  alto das letras (`source-atop`), que é o "metal" da logo.
- **Fio de brasa** sob o título: 2 px, gradiente horizontal transparente → `#ffd36b` → transparente, com glow de 8 px
  `rgba(255,120,40,.8)`. Largura = texto + 70, a 0,58 em abaixo do centro. Abre do centro entre os ticks `de+4` e `de+14`.
- **Animação** (tick do plano):
  - `de` .. `de+6`: **batida**: escala 1,30 → 1,00 (`easeOut` cúbico), alfa 0 → 1 em 3 ticks. Entra no tempo forte, junto do corte.
  - `de+8` .. `de+26`: **reflexo**: faixa diagonal (inclinação −0,35) de 80 px, branco a 75%, correndo da esquerda para a direita
    **só sobre as letras**.
  - até `ate`: sustentação 1,00 → 1,025 (empurrão lento). A saída é o alfa de 6 ticks (`alfaDoTitulo`), e o corte cai no tempo.
- **Custo**: o título vai para uma camada fora da tela **uma vez por cartão** (recorte do tamanho do texto, ~1 400×200 px de canvas,
  e não a tela inteira). O reflexo é um `source-atop` nessa camada. Por quadro sobra 1 `drawImage` com escala.
- **Fundo do cartão**: o cenário em tela cheia com empurrão de 1,00 → 1,04 no compasso, `rgba(6,3,14,.62)` por cima, uma elipse de luz
  quente atrás do texto (`rgba(255,130,50,.20)`, achatada 0,32 na vertical) e vinheta 0,8 (§6).
- **Contraste medido** (prévias, luminância p95 do fundo na faixa do texto): C1 0,033, C2 0,035, C3 0,010. Aço contra o fundo dá ≥ 11,2:1
  e o tom médio do fogo ≥ 7,9:1. O pé do gradiente de fogo (`#ff6a1a`) dá 4,3:1 contra o fundo do C2, mas a borda de todo glifo é o
  contorno escuro (7,1:1 contra ele).

### 4.2 Os cinco selos (só no C3)

Anel com entalhe, o mesmo símbolo do balão `guardiao` (Tarja de Impacto). 5 anéis de raio 13 a cada 46 px, centrados em x 480, a
0,58 em + 44 px abaixo do título. Desenho: contorno `#07040e` de 6 px, aro de 3,5 px em **bronze** (`#ffd9a8` → `#d08a4a` →
`#8c4f22`) e o entalhe = traço vertical no topo. O miolo é um ponto de 4,5 px na **cor do guardião** (`fire[0]`, ordem AMINU,
CENTELLA, CAMILLE, NILA, BAATAR). Apagado: aro a 28% e miolo a 8%. **Acendem um por colcheia** a partir do tick 12 (12, 24, 36, 48, 60),
cada um em 6 ticks de alfa, com glow de 12 px na cor do guardião. É luz local (cada anel tem ~0,2% da tela), então não é flash.

### 4.3 Placa do lutador (P3 a P7): **dentro** da faixa de baixo do letterbox

Medido na 1ª prévia: acima da faixa, a placa cobria os pés do lutador da esquerda. Dentro da faixa ela nunca cobre nada.

- Tarja em paralelogramo (inclinação 9 px), 36 px de altura, centrada na faixa (y 487..523), x 34. Tinta `#261a4a` → `#160e2e` →
  `#0b0718` (a mesma do balão `abertura`), faixa de 8 px na **cor do lutador** do lado de entrada, vidro (branco 8% na metade de
  cima), fio do bisel (branco 30%, 1,2 px) e aro de 2 px na cor do lutador. A sombra fica dentro da faixa.
- `NOME` em `FH(28)` creme `#fff5e2` com sombra (+1, +2). `  ·  PAÍS` em `FH(17)` creme a 82%.
- 3 linhas de velocidade na cor do lutador (24/18/12 px, 3/2,5/2 px de espessura) à direita da tarja, como nos balões.
- **Epíteto** à direita, na mesma faixa: `FB(16)`, creme a 78%, tracking 0,5 px. É a legenda de cinema.
- Entrada: desliza 40 px da esquerda em 8 ticks (`easeOut`), alfa ×1,4. Saída: alfa em 6 ticks. Janela do roteiro: 12..96 (84 ticks,
  dentro do teto de 90).
- O ZENON não tem placa no roteiro (o P9 usa a `EntradaDoChefe`). Se um dia tiver, vale `NOME_OCULTO` enquanto ele está bloqueado.

### 4.4 Montagem P8: grade 4×2

- Fundo `#04020a`. 8 painéis em paralelogramo 240×190, inclinação 36, intervalo 8 px. Fileira 1 com topo em y 76, fileira 2 em y 274
  (dentro das faixas de 69). Coluna `i % 4`, linha `floor(i / 4)`.
- Ordem: **fileira 1 = c20**: WEI LONG, MIN-JI, CAIO, AMINU. **Fileira 2 = c21**: CENTELLA, CAMILLE, NILA, BAATAR. O BAATAR, o último
  selo, entra no último tempo antes do silêncio do P9.
- Painel: gradiente vertical tinta `#0b0718` → cor do lutador. O **rosto** do retrato (`arte.retrato(ch.head)`) entra em "cover",
  quadrado de 276 px, centrado a 46% da altura. Embaixo, gradiente para a tinta a 90%. Nome em `FH(24)` creme no canto de baixo e
  barra de 34×3 na cor. Contorno de 5 px em tinta e fio creme `#fff1d0` de 2,5 px na aresta inclinada da direita (o fio da abertura de
  hoje).
- Entrada: 1 por tempo (`entradaDoRetrato(i)`, i < 8). Desliza 36 px na vertical (alternando a direção) mais alfa em 8 ticks. **Risco
  de luz**: faixa branca a 60% que varre SÓ o painel novo em 10 ticks (`q.retratos.risco`). É local, ~9% da tela.
- Título `QUEM SOBE AO TOPO…` na faixa de baixo (§4.5), ticks 96..180.

### 4.5 Título na faixa (P0 e P8)

Títulos sobre AÇÃO ficam na faixa preta de baixo, como legenda de cinema. Títulos de CARTÃO ficam no centro, grandes. `FH(40)`, as
mesmas duas cores, o contorno e a sombra de §4.1, centrado em (480, 505.5). Entrada: alfa em 4 ticks e deslize de 18 px vindo da
direita em 8. Saída: 6 ticks.

## 5. Câmera

Regras (valem para qualquer plano novo):

1. **O pico mora no acerto.** O quadro-chave do zoom máximo é o tick do acerto **gravado na tomada** (`tickMotor − inicio`, que
   coincide com o tick do plano quando não há câmera lenta antes), e não o `alvo` pedido.
2. **Segura pouco e solta.** Depois do acerto o rival voa e quem acertou salta. Segure 18 ticks no máximo (4 se o golpe é aéreo) e
   volte a 1,0 em 20 a 30 ticks com curva `saida`.
3. **Corte só se o enquadramento muda ≥ 15%.** Trocar o foco com o mesmo zoom não aparece na tela.
4. **Teto por lutador** (cabeça fora da faixa de 69 px com 6 px de folga): ZENON ≤ 1,10; aéreos (BAATAR no MERGULHO) ≤ 1,15 e só
   no acerto; os outros ≤ 1,25.

**Medido** (prévia no jogo real, cada lutador desenhado sozinho sob o zoom e a câmera do roteiro, a cada 4 ticks; topo em px
lógicos; a faixa vai até 69):

| Plano | Zoom máx. | Topo mín. antes | Topo mín. agora | Amostras com topo < 75 (faixa + 6 de folga), de 48, antes → agora |
|---|---|---|---|---|
| P1 | 1,25 | 86 | 102 | 0 → 0 |
| P2 | 1,22 | 99 | 72 | 0 → 1 (o CAIO no tick 160, a 3 px da faixa: entra na folga de 6, não na faixa) |
| P3 | 1,20 | 0 (AMINU) | 71 | 7 → 1 |
| P4 | 1,20 | 118 | 118 | 0 → 0 |
| P5 | 1,20 | 120 | 102 | 0 → 0 |
| P6 | 1,15 | 40 (NILA, tick 4, zoom 1,0) | 40 | 3 → 3 |
| P7 | 1,15 | 0 (BAATAR) | 38 | 19 → 8 |
| P9 | 1,10 | 45 (ZENON) | 91 | 33 → 0 |

O que sobra **não é câmera**: a NILA salta no tick 4 do P6 e o BAATAR salta de novo no tick ~152 do P7. Os dois ficam sob a faixa
**a zoom 1,0**, no ápice do salto, por 12 a 30 ticks. Aceito como saída de quadro em movimento (o quadro do acerto fica inteiro). Se
o dono não gostar, a correção é na escalação (§11, Vega).

## 6. Paleta e grade de cor

| Papel | Valor |
|---|---|
| Tinta (contornos) | `#07040e` |
| Fundo preto do trailer | `#04020a` (o da abertura de hoje) |
| Letterbox | `#000` puro, sem fio nem brilho |
| Aço / Fogo / Ouro (fio) / Creme | §4.1 / `#ffd36b` / `#fff5e2` |
| Bronze dos selos | `#ffd9a8` → `#d08a4a` → `#8c4f22` |
| Flash do c24.1 | branco **quente** `#fff4e0` (o creme da marca), alfa = curva do diretor |

**Grade de cor ("LUT" barata).** É 1 `fillRect` de tinta por ato (`source-over`) mais 1 vinheta radial (centro (480, 281), raio
230 → 640, `rgba(4,2,10,0)` → `rgba(4,2,10,v)`). **Nada de blend por pixel** (`soft-light`, `overlay`, filtros): no WebKit isso pode
cair para software, e o portão de desempenho é 1,15× a luta.

| Ato | Tinta por cima | Vinheta v |
|---|---|---|
| P0 frio | escurece `rgba(4,6,22, .55 × (1 − .6 × raio))` + `rgba(14,30,96,.34)` | 0,72 |
| Lutas (P1–P7) | nenhuma | 0,50 |
| P9 arconte | `rgba(34,8,34,.22)` (o tom ônix-magenta, exclusivo do ZENON) | 0,62 |
| Cartões | `rgba(6,3,14,.62)` sobre o cenário | 0,80 |

**Grão: não.** A arte é anime de traço limpo, e o grão a suja. Ele também custaria uma passada de tela inteira por quadro. Fica fora da
v1.

## 7. Luz e fotossensibilidade

- **Um único flash de tela cheia**, no c24.1 (`flashNoTick`), em branco quente. **Ordem de camadas no P10**: fundo → letterbox →
  **flash** → logo, onda de choque e faíscas. A logo bate nítida sobre o branco, em vez de lavada por ele (prévia
  `p10-impacto`).
- **Raio do P0** (`frio.raio`, 1 → 0 em 60 ticks): luz **aditiva** azul `rgba(120,160,255,.22 × raio)` mais o escurecimento
  diminuindo. Não é branco. **Medido** (luminância relativa média, tela reduzida a 96×54): 0,017 antes, 0,079 no pico, 0,062 doze ticks
  depois. Δ = 0,062, abaixo do limiar de flash geral (0,1 da WCAG 2.3.1), e é um pulso só. Se a Lyra desenhar o traço do raio com
  tremulação, que seja no máximo 2 subidas em 60 ticks, só no traço (local).
- **Risco de luz** dos retratos (P8) e **selos** (C3): locais, abaixo de 10% da tela, então não contam.
- **Flash de acerto do motor** (silhueta branca): local, não conta (spec §3.2). Nas prévias ele aparece como o lutador "lavado" de
  branco nos quadros de acerto. É esse efeito, não a esquiva (medido: 0 ticks com esquiva na janela invulnerável em todos os planos).

## 8. Transições

| Corte | Transição |
|---|---|
| Padrão (todo corte, sempre no tempo) | **Corte seco.** |
| Para dentro e para fora de cartão (C1, C2, C3) | Corte seco no tempo forte, e o título **bate** no mesmo tick (§4.1). |
| Luta → luta dentro do ato dos desafiantes: P3→P4, P5→P6, P6→P7 | **Smear de 2 quadros (whip)**: nos 2 últimos ticks do plano que sai, desenhe o quadro e por cima 3 cópias dele mesmo deslocadas 12/24/36 px na direção do giro (alfa .35/.20/.10). Nos 2 primeiros ticks do plano que entra, o mesmo, vindo do lado oposto. A direção alterna (→, ←, →). A luminância não muda, então não é flash. Custo: 3 `drawImage` do próprio canvas em 4 ticks por corte. |
| P7 → P8 | Corte seco (a montagem entra no tempo forte com o 1º painel). |
| P8 → P9 | **Corte para o silêncio**: o c22.1 é escuro e mudo, e o 1º braseiro acende no tempo 2. Sem smear. |
| P9 → P10 | O flash único (c24.1). **Embaixo do branco**, o fundo troca do `gr` para o fundo do título (o "flash cut"). |
| Movimento reduzido | Sem smear, sem batida de escala, sem reflexo (a estática já é dissolução de 18 ticks). |

Teto: o smear só em 3 cortes, a 1 compasso ou mais um do outro, bem abaixo de 3 eventos/s.

## 9. Planos especiais

- **P0, contraluz barata.** O HAYATO sai em 2 desenhos da pose: (1) uma cópia pintada de `#bfe0ff` (`source-atop` numa camada),
  deslocada (−2,5, −1,5) px, que forma o **aro de luz** do lado do raio (alfa 0,55 + 0,45 × raio); (2) por cima, no lugar, a silhueta
  pintada de `#080a16`. O `jp` é pôr do sol, e o escurecimento do ato frio o transforma em noite de tempestade (prévias `p0-*`).
- **P9, o Arconte.** Zoom ≤ 1,10 (§5) e tinta ônix-magenta. Silêncio no c22.1, braseiros em colcheias, a `EntradaDoChefe` CURTA. O
  D-T2 (contraluz enquanto bloqueado) reusa a técnica do P0, com olhos e anel do E12 por cima.
- **P10, a logo rompe o quadro.** A logo é desenhada **por cima** do letterbox, que só abre do tick 24 ao 48: no impacto os dragões
  passam sobre a faixa preta (prévia `p10-onda`). A escala vai de **1,6 → 1,0 em 8 ticks**, menos que o 3,2 da abertura de hoje,
  porque sob o flash 3,2 é só borrão. Onda de choque e faíscas como na `CenaIntro` (t 128–170). O fundo é a tela de título com
  `t_titulo = 120 − (192 − tickNoPlano)`, em alfa `tick/30` no c24, e no c25 é o `drawScene(t, true)` inteiro. Assim o último quadro É
  o 1º quadro do título com `fromTrailer`. A Lyra trata o `t` negativo do começo (na prévia usei `max(0, …)`).

## 10. Prévias e como regenerar

`arte-fonte/capturas/trailer-arte-*.png` (29 quadros, 1280×720). Saem do jogo real (Vite dev), com o `DiretorDoTrailer` da Vega
andando tick a tick, `desenharMundo` com `hud: false`, `overlay: false` e o zoom do roteiro, e o desenho proposto injetado por cima.
Nenhum arquivo do jogo foi tocado para isso.

| Plano | Quadros |
|---|---|
| P0 | `p0-antes-do-raio` (47), `p0-raio-pico` (48), `p0-raio` (60), `p0-titulo` (150) |
| P1 | `p1-acerto` (98, zoom 1,25) |
| C1, C2, C3 | `c1-reflexo` (16, o reflexo no meio), `c1` (40), `c2` (40), `c3` (72, os 5 selos acesos) |
| P2 | `p2-antes-do-corte` (95, 1,22 na MIN-JI) e `p2-depois-do-corte` (96, 1,0 no CAIO) |
| P3–P7 | `p3-placa`, `p3-acerto` (52), `p4-antes/depois-do-corte`, `p5-placa`, `p5-acerto` (143), `p6-placa`, `p7-acerto` (131), `p7-apice` (152) |
| P8 | `p8-meio` (60, fileira 1 entrando), `p8-titulo` (150) |
| P9 | `p9-braseiros` (60), `p9-acerto` (176, E12), `p9-fim` (191) |
| P10 | `p10-impacto` (2), `p10-onda` (10), `p10-abrindo` (40), `p10-prompt` (150) |

Regenerar: `node arte-fonte/trailer/prototipo/capturar.mjs <url-do-vite> <pasta-png> <relatorio.json> [prefixo] [filtro]`. O
relatório traz, por plano, o enquadramento (§5) e os ticks de acerto. **Armadilha**: com outro agente editando `src/` ao mesmo tempo,
o Vite do projeto pode devolver 500 (import ainda inexistente). Rode sobre um retrato do HEAD
(`git archive HEAD src index.html vite.config.ts package.json tsconfig.json`, com junções para `node_modules` e `public`) e copie para
lá só `src/data/trailer`. Os efeitos de golpe (`Efeitos` com os eventos do plano) e a tarja da cinemática NÃO estão nas prévias. É só
o mundo, a câmera e o desenho proposto.

## 11. Passo a passo

**Lyra (render do trailer):**
1. `src/render/trailer/titulos.ts`: título de cartão (§4.1), título na faixa (§4.5) e placa (§4.3). O protótipo
   (`arte-trailer.js`: `titulo`, `cartao`, `tituloNaFaixa`, `placa`) é a referência numérica. Camada pré-renderizada por cartão, recortada
   ao texto.
2. `letterbox.ts`: `#000`, desenhado **antes** da placa e do título na faixa.
3. Grade de cor por ato (§6), logo depois do `desenharMundo` e antes do letterbox.
4. `retratos.ts`: grade 4×2 (§4.4), `n = plano.ordem.length` (agora 8).
5. C3: os 5 selos (§4.2), com cores de `fire[0]` (de `chDaFicha(ch, null)`).
6. P0: contraluz e aro (§9), com escurecimento do ato frio.
7. P10: ordem de camadas e escala 1,6→1,0 (§7, §9).
8. Smear nos 3 cortes da tabela de §8. No movimento reduzido: sem smear, sem batida e sem reflexo.
9. Medir no navegador (skill `medir-antes-de-afirmar`): a placa dentro da faixa (y 487..523), o título da faixa sem passar de 540, o
   texto do cartão sem cortar a 844×390.

**Vega:**
1. Chaves com nome antigo (`um-torneio` → `um-cinturao`, `cinco-guardioes` → `cinco-selos`, `quem-chega-ao-topo` →
   `quem-sobe-ao-topo`), se quiser alinhar. É cosmético, pede `tipos.ts`, `roteiro.ts` e testes no mesmo passo.
2. `curvas.ts`: o ramo "9º retrato na última colcheia" de `entradaDoRetrato` ficou sem uso com 8 retratos. O comentário de
   `QuadroDoTrailer.retratos` ("0 a 9") passou a ser "0 a 8".
3. **Câmera ancorada na batida** (melhoria recomendada): hoje o `empurrar` recebe o tick do acerto à mão. Se a escalação mudar a
   tomada, a câmera desalinha em silêncio, e foi exatamente o que aconteceu com o `alvo` 96 contra o acerto 50 do P3. Proposta: um
   `QuadroChave` com `t` relativo à batida `i` (`{ batida: 0, dt: +4, zoom }`), que o diretor resolve com `tomada.batidas[i]`.
4. Critério opcional de escalação: recusar tomada com um lutador sob a faixa de cima (topo < 75 px a zoom 1) por mais de 12 ticks
   seguidos, perto da batida (o P6 e o P7 têm isso no ápice dos saltos, §5).

## 12. Decisões para o dono (com recomendação)

| # | Decisão | Opções | Recomendo |
|---|---|---|---|
| A1 | Cartão C2 | **UM SÓ CINTURÃO.** (aposta concreta, lore) ou UM SÓ TORNEIO. (o rascunho) | **CINTURÃO** ("torneio" já está na faixa da logo) |
| A2 | Cartão C3 | **CINCO SELOS.** (enredo, prepara o E12) ou CINCO GUARDIÕES. (mais explícito) | **SELOS** |
| A3 | Título da montagem | **QUEM SOBE AO TOPO…** (pergunta, o P9 responde) ou E NO TOPO… (10 caracteres, mais seco) | **QUEM SOBE AO TOPO…** |
| A4 | P8 | **8 retratos sem o HAYATO** (só muda a lista) ou 9 com 2 entrando juntos num tempo (a Vega muda `curvas.ts`) | **8 sem o HAYATO** |
| A5 | Placa | **Dentro da faixa do letterbox** (não cobre a luta) ou logo acima dela (maior, cobre os pés) | **Dentro da faixa** |
| A6 | Saltos que saem pelo topo (NILA no P6, BAATAR no P7) | Aceitar (movimento) ou reescalar com critério novo (§11 Vega 4) | **Aceitar** na v1 e olhar no corte final |
| A7 | Grão de filme | Sem grão ou grão a 4% | **Sem grão** |

## 13. O que NÃO foi medido

- Nada foi desenhado pelo código da Lyra: as prévias são o protótipo injetado. A medida final de layout é dela, no navegador.
- Os efeitos de golpe, a tarja da cinemática, a `EntradaDoChefe` e o smear não aparecem nas prévias. O smear não foi prototipado.
- Desempenho do desenho proposto (camada do título, vinheta, contraluz com 2 camadas no P0): não medido. Ele entra no portão de 1,15×
  da Íris (`npm run trailer:medir -- --cena trailer`). A contraluz do P0 usa 2 canvas de tela cheia na prévia. Na cena, devem ser
  criados uma vez e reaproveitados, ou recortados à pose.
- Celular 844×390: não renderizei o trailer nessa resolução. Os tamanhos seguem a escala do canvas fixo 1920×1080, e a leitura do
  epíteto (`FB(16)` lógicos) no celular precisa de conferência.
- A música não foi ouvida junto da imagem. O sincronismo "título bate no tempo forte" é do roteiro, não foi visto em movimento.
