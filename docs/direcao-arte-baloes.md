# Direção de arte: balões de fala premium ("Tarja de Impacto")

Autor: Apolo (direção de arte). Data: 2026-10-22. Missão `cmviycnqk015x01p7umwcp0rd`. Situação: **proposta com protótipo medido no jogo real; nada do jogo foi alterado.**

Pedido do dono: "os balões de fala/provocações estão muito feios; sejam mais criativos e façam melhor, layout premium, use a fonte indicada para esse tipo de coisa em jogos".

Base: `src/render/balao.ts`, `src/render/provocacao.ts`, `docs/spec-provocacao-prerround-e-vitoria.md` §7.2, `docs/handoff-lyra-provocacao.md`.

---

## 0. Resumo para quem decide

| | Antes | Depois |
|---|---|---|
| Forma | Retângulo arredondado de tooltip, borda dourada fina | **Tarja angular**: 2 cantos cortados a 45° ("cantos de impacto"), aro claro sobre contorno escuro, rabicho em cunha embutido no mesmo contorno |
| Nome | Texto colorido dentro da caixa | **Plaquinha inclinada** na cor do lutador, saindo da quina, igual à linguagem do HUD |
| Fonte da fala | Barlow SemiBold 20 (fonte de interface) | **Bangers 24**, caixa alta, tracking +1 px: letreiro de quadrinho/arcade |
| Corpo da letra no celular 844x390 | 7,4 px CSS (altura-x da Barlow) | **12,6 px CSS** (caixa alta da Bangers), +70% |
| Ênfase | Nenhuma | Nome do rival e a **última palavra** (o "soco" da frase) em ouro, com pop ao aparecer |
| Situação | Um balão só para tudo | 7 variantes: abertura, revanche, decisivo, vitória, vitória perfeita, guardião, ZENON |
| Animação | Escala 0,85 para 1 | Pop com overshoot, tremor de impacto, linhas de velocidade, saída achatando para a ponta; versão de movimento reduzido |

Os previews lado a lado estão em `arte-fonte/capturas/baloes-premium-*.png` (§8). A melhor peça para mostrar ao dono é
`arte-fonte/capturas/baloes-premium-galeria-m844.png`: 11 cenas no celular 844x390, antes à esquerda e depois à direita.

---

## 1. O que estava errado (diagnóstico)

1. **Parecia uma dica de interface, não um balão de luta.** O retângulo arredondado com borda dourada de 2 px é o desenho de um
   tooltip. Nada nele conversa com o HUD, que é todo em paralelogramos, hexágono do KO e letreiros itálicos com contorno grosso.
2. **A fala estava na fonte de corpo (Barlow 600 a 20 px).** Ela é ótima para menus. Numa provocação, porém, a frase é a cena, e
   a letra miúda de minúsculas (7,4 px CSS de altura-x no celular) virou o elemento mais fraco da tela.
3. **Nada mudava com a situação.** Abrir a luta, pedir revanche, o round decisivo, a vitória perfeita e o chefão falando usavam
   o mesmo balão. Cada momento tem um peso dramático diferente.
4. **A identidade do lutador só aparecia na cor do nome.** A plaquinha agora leva a cor dele; a retícula, a faixa de baixo e as
   linhas de velocidade fazem eco dela.
5. **Sem ritmo.** O texto entrava letra a letra sem acento algum. A frase de provocação tem um "soco" no fim, e ele não aparecia.

---

## 2. Conceito: "Tarja de Impacto"

Uma tarja de tinta escura **opaca**, cortada em dois cantos opostos a 45°, com contorno duplo (fio escuro por fora e aro claro
por dentro), a plaquinha do nome saindo da quina e o rabicho em cunha no mesmo traço. É o vocabulário do HUD (paralelogramos,
itálico, contorno grosso) somado ao do quadrinho de luta (retícula Ben-Day, linhas de velocidade, letreiro em caixa alta).

### 2.1 Anatomia (de trás para a frente)

```
        [ PLAQUINHA ]                       ///   <- linhas de velocidade (cor do lutador), na faixa livre acima do painel
   ┌──[ NOME ]────────────────────────────╲      <- canto cortado (chanfro 10 px) do lado oposto à plaquinha
   │  TEXTO EM CAIXA ALTA, BANGERS 24       │
   │  SEGUNDA LINHA COM A ÚLTIMA PALAVRA ▶  │    <- ▶ só na vitória, na faixa reservada
   ╲____faixa de cor______________╱\________┘    <- canto cortado; rabicho em cunha no MESMO contorno
                                   V
```

1. **Sombra dura**: o painel sem o rabicho, deslocado 3 px para baixo, preto a 42%. **Ela fica dentro da caixa medida** (o
   painel termina 3 px antes de `y + h`), então nada além do rabicho sai do retângulo que `colocarBalao` conhece.
2. **Tinta**: gradiente vertical de 3 paradas (tabela §3), **opaca**. Com o painel opaco o contraste não depende do cenário.
3. **Dentro do painel (com clip)**:
   - retícula: pontos a cada 6 px, em quincôncio, na cor do lutador a 10%, raio de 0,35 a 1,85 px, crescendo para o canto
     **oposto** à plaquinha (começa em 45% do caminho; antes disso não há ponto);
   - vidro: gradiente branco de 8% a 0% na metade de cima;
   - fio do bisel: linha branca de 1,2 px a 30%, 2,5 px abaixo da borda de cima;
   - sombra interna: 3,5 px pretos a 35% na base;
   - faixa de cor: 3 px a 6,5 px da base, na cor da variante, do lado da plaquinha até 70% da largura, sumindo em gradiente.
4. **Aro**: o caminho inteiro (painel + rabicho), `lineJoin = 'miter'`, `miterLimit = 3`. Primeiro o contorno escuro
   `#07040e` de 5 px e por cima o aro de 2,25 px na cor da variante. As variantes com `duplo` têm um fio interno de 1 px a 60%,
   recuado 4 px.
5. **Linhas de velocidade**: 3 traços inclinados como o itálico (dx = 0,5 da altura), comprimentos 100/75/50% da faixa de
   7 px acima do painel, larguras 3 / 2,5 / 2 px, contorno escuro de +2,5 px por baixo. Ficam do lado oposto à plaquinha, a partir
   de 6 px do chanfro, a cada 8 px. ZENON não tem.
6. **Plaquinha**: paralelogramo de 22 px de altura (de `y + 1` a `y + 23`) com inclinação de 6 px. Fica 12 px para dentro da
   quina, do lado do rabicho (P1 ou P2: o lado de quem fala). Gradiente: cor clareada 35% → cor (55%) → cor escurecida 10%.
   Contorno de 2 px `#07040e`, brilho de 2 px a 28% em cima e 3 px a 18% de sombra embaixo, sombra dura (2, 3) a 45%.
   Nome em `FH(19)` (Barlow Condensed 800 itálico, a mesma do HUD), cor `#120a22`. A regra está em §3.2.
7. **Brilhos** (só vitória e vitória perfeita): estrela de 4 pontas, raio 8, branco-creme com halo ouro. Ficam nos cantos e
   cintilam (seno, período de cerca de 70 ticks).
8. **Texto** em Bangers 24, caixa alta (`toLocaleUpperCase('pt-BR')`), `letterSpacing = '1px'`. Sombra dura `rgba(4,2,10,.9)`
   em (+1, +2). Cor `#fff5e2` (ZENON: `#f6eedf`). Palavras de ênfase com gradiente vertical da variante.
9. **▶** (só vitória): triângulo de 11x12 com contorno escuro de 3 px, ouro `#ffd36b` (ZENON `#e9c46a`). Fica no centro da
   faixa reservada, à direita, e balança 2 px na horizontal (parado no movimento reduzido).

### 2.2 O lado da plaquinha e os cantos

- `lado === 'direita'` (balão à direita da cabeça, rabicho na borda esquerda): plaquinha à **esquerda**.
- `lado === 'esquerda'`: plaquinha à **direita**.
- `lado === 'cima'`: plaquinha do lado em que está a ponta do rabicho (`ponta.x <= x + w/2` é esquerda).
- Plaquinha à esquerda: os cantos cortados são **cima-direita e baixo-esquerda**. À direita, o espelho: cima-esquerda e
  baixo-direita.
- O rabicho é uma cunha assimétrica (base de 17 px: 12 + 5, pendendo para o lado da plaquinha). A ponta recua **3 px** para
  dentro, porque o contorno em esquadria de 5 px cresce além da ponta calculada e encostaria no cabelo. Nos rabichos laterais, a
  base fica presa em `[topoDoPainel + chanfro + 8, baseDoPainel − chanfro − 12]` para não cair no canto cortado.

---

## 3. Variantes

### 3.1 Por situação

| Variante | Quando | Tinta (topo / meio / base) | Aro | Ênfase (topo → base) | Rajada / faixa | Extra | Tremor |
|---|---|---|---|---|---|---|---|
| `abertura` | round 1 | `#261a4a` `#160e2e` `#0b0718` | creme `#fff1d0` | `#ffe48f` → `#ffbb45` | cor do lutador | — | 2 px |
| `revanche` | round 2+, quem perdeu | `#33101e` `#1c0814` `#0e050b` | **brasa** (`#fff0d8` → `#ffa060` → `#e8462a`) | `#ffd8b0` → `#ffa070` | `#ff6a3d` / `#ff5a36` | — | 3 px |
| `decisivo` | round decisivo (1x1) | `#3d1024` `#1f0815` `#0f040b` | **ouro** (`#fff6cf` → `#f3c65f` → `#c98a2b`) + fio interno `#ffd36b` | `#fff2b8` → `#ffc53d` | ouro | brilho de brasa por DENTRO do aro, pulsando (período ~40 ticks) | 3 px |
| `vitoria` | vencedor (inclui `vitoriaPorTempo`) | igual à abertura | ouro | `#ffe48f` → `#ffbb45` | cor do lutador | 2 brilhos, ▶ | 2 px |
| `vitoriaPerfeita` | `perfect` do último round | `#1d1d4e` `#121233` `#090a1c` | **prisma** horizontal (`#8ef3ff` → `#fff` → `#ff8fe0` → `#ffd36b`) | `#ffffff` → `#9ff3ff` | cor / faixa prisma | 3 brilhos, ▶ | 2 px |
| `guardiao` | o guardião da luta de chefão fala (não ZENON) | `#2a1d2e` `#18101c` `#0c070f` | **bronze** (`#ffd9a8` → `#d08a4a` → `#8c4f22`) + fio `#e0a467` | `#ffe6c0` → `#f5b46e` | bronze / cor | **selo** (anel com entalhe, Os Cinco Selos) antes do nome | 2 px |
| `zenon` | ZENON fala (qualquer momento) | ônix `#1a1420` `#0c0a10` `#050407` | ouro `#e9c46a` + fio interno | `#f8e2a4` → `#d9a94a` | **nenhuma** | veios de ônix (magenta 20%, ouro 14%) no lugar da retícula; losangos de ouro nos 2 chanfros; plaquinha ônix `#140f19` com aro e nome em ouro `#f3d68f` | 0 |

Regra de precedência (a Lyra calcula ao montar a fala, ver §7): **ZENON > guardião > decisivo > revanche > vitória perfeita >
vitória > abertura.** O núcleo ônix é exclusivo do chefão final (decisão anterior da direção de arte), por isso o ZENON jogável
também fala em ônix.

### 3.2 Por lutador

- A **cor** é a que a cena já passa: `chDaFicha(ch, ficha).fire[0]` (`corDoNome`). Por isso a ficha alternativa troca a cor sozinha.
- A cor vai na plaquinha, na retícula, na faixa de baixo e nas linhas de velocidade. O texto fica sempre creme e a ênfase
  sempre na paleta da variante: a leitura não muda de lutador para lutador.
- **Nome na plaquinha**: `#120a22` quando o contraste dele com a cor escurecida 10% passa de 4,5:1. Senão vai branco com
  contorno `#07040e` de 3 px (só uma ficha muito escura cai aqui; nenhuma das 10 cores atuais cai). Medido no pior ponto do
  gradiente, na faixa do glifo: HAYATO 11,3; WEI LONG 7,3; MIN-JI 6,4; CAIO 14,5; AMINU 5,0; CENTELLA 10,3; CAMILLE 14,3;
  NILA 9,4; BAATAR 5,2. ZENON usa a plaquinha ônix com ouro.
- **Retrato pequeno: NÃO na v1.** O HUD já mostra os retratos e o rabicho aponta para o rosto, que fica visível logo abaixo.
  No celular 844x390, um retrato de 23 px é ruído e custaria largura numa fala de 2 linhas. Se o dono pedir, o lugar é dentro
  da plaquinha, quadrado de 19 px antes do nome, recortado do retrato do HUD (largura da plaquinha + 22).

---

## 4. Tipografia

### 4.1 Escolha: **Bangers** (OFL 1.1), 24 px lógicos, caixa alta, tracking +1 px, passo de linha 28

**Por que Bangers.** O dono pediu "a fonte indicada para esse tipo de coisa em jogos". Balão de luta é letreiro de quadrinho:
caixa alta, itálico, peso de impacto. É a convenção das falas de vitória de Street Fighter e KOF e dos quadrinhos de super-herói.
Bangers foi desenhada exatamente nesse idioma (letreiro dos quadrinhos de meados do século XX), tem licença OFL e cobre o
português inteiro. A fonte padrão da indústria para fala em quadrinhos (Wild Words, Anime Ace) não é livre, e a Bangers é a
alternativa livre consagrada. Nenhuma das 10 candidatas transforma a tarja num "balão de luta" como ela.

**O ajuste que a fez ganhar também na leitura.** Na regra justa (§4.2) ela ficou atrás porque o acento das maiúsculas sobe
1,15 em e limita o tamanho. Por isso, no balão final:

- **24 px** com passo de linha de **28**, e a 1ª linha de base fica 1 px + 1,15 em abaixo da plaquinha. Assim nenhum acento
  (Á Ã Ê Í Ó Ú) encosta na plaquinha nem na linha de cima.
- **Tracking +1 px** (`ctx.letterSpacing = '1px'`): a Bangers vem apertada de fábrica e, no celular, o miolo das letras fechava.
  Com +1 px fica tão legível quanto a Saira Condensed 800 (ver `baloes-premium-fontes-comparativo.png`, linhas 2 e 3). Onde o
  navegador não tem `letterSpacing` no canvas, a propriedade é ignorada, e como a medida e o desenho usam o mesmo contexto, nada
  desalinha (só fica mais apertado).
- Corpo no celular 844x390: fonte de 17,3 px CSS, caixa alta de **12,6 px CSS** (antes: altura-x de 7,4 px CSS). No 915x412,
  13,3 px; no desktop 1280x720, 23,2 px.

### 4.2 Comparativo (falas reais de `src/data/provocacoes.pt-BR.ts`, 232 falas, rival mais largo)

Regra igual para todas: o mesmo balão (passo de linha 27, linha ≤ 372 px), cada fonte no **maior** tamanho em que (a) as 232
falas cabem (2 linhas; 1 em revanche/decisivo) e (b) o acento mais alto das maiúsculas sobe no máximo 25 px. As medidas saem do
canvas (`measureText`) e o "px CSS" é para o celular 844x390 (1 px lógico = 0,722 px CSS).

| Fonte | Tamanho | Fonte em px CSS | Corpo da letra* em px CSS | Linha mais larga /372 | Arquivo latin | Nota de direção de arte |
|---|---|---|---|---|---|---|
| Barlow 600 (atual) | 25,5 | 18,4 | 9,4 | 368,2 | 22,2 KB | interface; zero personalidade de balão |
| **Bangers 400** (regra) | 22 | 15,9 | 11,6 | 260,1 | **23,0 KB** | o balão de luta; apertada sem tracking |
| **Bangers 24 + 1 px, passo 28 (ESCOLHIDA)** | **24** | **17,3** | **12,6** | 312,8 | 23,0 KB | personalidade **e** leitura |
| Anton 400 | 22 | 15,9 | 11,6 | 291,2 | 18,2 KB | pôster, letras empastam no celular |
| Oswald 600 | 23,5 | 17,0 | 10,1 | 306,2 | 12,4 KB | limpa, mas genérica (cara de site) |
| Saira Condensed 800 | 27,5 | 19,9 | 10,1 | 323,9 | 17,6 KB | **plano B**: esportiva, muito legível, minúsculas |
| Teko 600 | 31 | 22,4 | 11,6 | 359,1 | 7,7 KB | quadrada/tech; parece placar, não fala |
| Russo One 400 | 22 | 15,9 | 8,7 | 366,5 | 7,2 KB | larga demais; pouca letra por linha |
| Barlow Condensed 800 it. | 27 | 19,5 | 10,1 | 318,3 | 23,2 KB | coerente com o HUD, mas repete o título |
| Kanit 700 it. | 24 | 17,3 | 8,7 | 369,3 | 20,2 KB | pequena no celular |
| Chakra Petch 700 it. | 23,5 | 17,0 | 8,7 | 368,5 | 10,4 KB | sci-fi; não combina com a arte |

\* Altura-x nas fontes de minúsculas; altura da caixa alta na Bangers (que é só caixa alta).

Cobertura de glifos: lida do `cmap` de cada woff2 contra todos os caracteres usados nas falas, nos nomes e em `¡ ¿ Ã Õ Ç Á É Í Ó Ú
Â Ê Ô À` (e minúsculas). **Nenhuma candidata tem lacuna**, Bangers incluída (`¡` U+00A1 presente).

**Plano B (se o dono preferir minúsculas):** Saira Condensed 800 a 27 px, sem caixa alta, sem tracking, `capa` 0,691, 17,6 KB
OFL. O resto do balão não muda.

### 4.3 O arquivo

- `arte-fonte/baloes/fonte-para-public/bangers-latin-400-normal.woff2`: **23 528 bytes** (23,0 KB), assinatura `wOF2`, subset
  "latin" do `@fontsource/bangers` 5.3.0 (o mesmo canal da Barlow), português completo.
- `arte-fonte/baloes/fonte-para-public/OFL-bangers.txt`: licença (Copyright 2010 The Bangers Project Authors, SIL Open Font
  License 1.1).
- **Por que ainda não está em `public/assets/fontes`:** `tests/unit/fontes.test.ts` (linha 71) confere a lista EXATA da pasta.
  Pôr o arquivo lá agora deixaria a suíte vermelha antes da Lyra atualizar o teste. Ela move o arquivo no mesmo commit (§7, passo 1).
- CSP: auto-hospedada no mesmo origin, então `font-src 'self'` já cobre. Nada de CDN.

---

## 5. Ênfase (palavras-chave)

Regra determinística, sem marcação nos dados:
1. o **nome do rival** (no texto original, palavra toda em maiúsculas com 2+ letras: é o `{rival}` já trocado);
2. a **última palavra com 2+ letras** da fala (o soco: "GOLPE", "INCÊNDIO", "CORDA", "RAIO", "FUNDOS").

Pontuação nas pontas (`¡ ¿ " “ ( . , ! ? ; : … " ” )`) não conta para identificar a palavra, mas é desenhada com ela (em ouro).
A ênfase muda **só a cor** (e o pop): a largura não muda, então a quebra de linha e a caixa ficam idênticas. Uma marcação manual
(`*palavra*` no texto) fica como evolução futura e não é necessária agora.

---

## 6. Animação (60 ticks = 1 s)

| Tick (desde abrir) | COMPLETA | ZENON | Movimento reduzido |
|---|---|---|---|
| 0 → 4 | alfa 0 → 1 | alfa 0 → 1 em 8 | alfa 0 → 1 em 6 |
| 0 → 8 | escala `0,6 + 0,4·easeOutBack(k, s = 1,9)`, ancorada na ponta do rabicho: pico de ~1,05 perto do tick 5 e assenta em 1 | escala 0,94 → 1 em **12** ticks, `easeOut`, **sem** overshoot | escala 1 |
| 2 → 8 | as 3 linhas de velocidade crescem de 0 ao comprimento total | — | já cheias |
| 5 → 13 | **tremor de impacto** horizontal: `A·sin((t−5)·2,6)·(1 − (t−5)/8)`, A = 2 px (3 px na revanche e no decisivo) | sem tremor | sem tremor |
| 8 → | letra a letra, 1,5 letra/tick (o `letrasPorTick` de hoje) | **palavra a palavra**: a palavra inteira aparece quando o contador passa da metade dela | como hoje |
| ao completar uma palavra de ênfase | pop de 7 ticks: escala `1 + 0,18·(1 − idade/7)²`, ancorada no **canto esquerdo da linha de base** da palavra (cresce para a direita e para cima, nunca cobre a palavra anterior) | igual | sem pop |
| texto completo (vitória) | ▶ aparece e balança ±2 px (`sin(tick·0,22)`) | ▶ ouro | ▶ parado |
| saída (6 ticks, `fechando` 0 → 1) | achata para a ponta: `escalaX = 1 + 0,05·f`, `escalaY = 1 − 0,8·f`, alfa `1 − f` | igual | só alfa |
| sempre | brilhos cintilam; o decisivo pulsa | — | brilhos e pulso fixos |

Cursor: não há cursor piscando durante a revelação. A letra nova já é o cursor, e outro elemento piscando ao lado do texto
cansa em 232 falas. O ▶ continua só na vitória, na faixa reservada de 14 px (`RESERVA_DA_SETA`), com o topo abaixo da última
linha de base.

Tira de quadros: `arte-fonte/capturas/baloes-premium-animacao-tira.png` (COMPLETA, movimento reduzido e ZENON, tick a tick, com
a saída).

Som: sem mudança (o blip a cada 3 letras e o arpejo da vitória continuam). Sugestão para depois: um "tum" grave curto no tick 5
(o assentamento do pop), junto com o tremor.

---

## 7. Passo a passo para a Lyra

O protótipo de referência está em **`arte-fonte/baloes/prototipo/premium-nucleo.js`**: o desenho inteiro em JS puro, com as
mesmas assinaturas de `medirBalao`/`desenharBalao`. Ele roda injetado no jogo real e é a fonte de todas as medidas deste
documento. Porte para TS em `src/render/balao.ts` mantendo os nomes. **Não copie as cores de cabeça: copie a tabela `VARIANTES`.**

1. **Fonte**
   - mover `arte-fonte/baloes/fonte-para-public/bangers-latin-400-normal.woff2` e `OFL-bangers.txt` para `public/assets/fontes/`;
   - `src/fontes.css`: `@font-face { font-family: "Bangers"; font-style: normal; font-weight: 400; font-display: block; src: url("/assets/fontes/bangers-latin-400-normal.woff2") format("woff2"); }`;
   - `src/platform/fontes.ts`: acrescentar `'400 24px "Bangers"'` a `FACES_DO_JOGO` (a amostra já tem os acentos; acrescente `¡`);
   - `index.html`: `<link rel="preload" href="/assets/fontes/bangers-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />`;
   - `public/assets/fontes/LEIA-ME.txt`: a linha da Bangers (falas dos balões) e a origem (`@fontsource/bangers` 5.3.0, subset latin);
   - `src/render/texto.ts`: `export const FONTE_DA_FALA = (s: number) => \`400 ${s}px Bangers, "Barlow Condensed", Impact, sans-serif\``;
   - `tests/unit/fontes.test.ts`: lista da pasta, 3 faces, licença com "The Bangers Project Authors", CSS e preload.
2. **Medidas (`BALAO`)**: `corpo 24`, `linha 28`, `acento 1.15`, `nome 19`, `placaAltura 23`, `placaSobra 11`, `placaRecuo 12`,
   `placaInclina 6`, `placaPadX 9`, `margemX 16`, `margemBase 7`, `sombra 3`, `chanfro 10`, `espaco '1px'`. `linhaMax 372`, o
   `rabicho 12`, o `rabichoMeio 9` e a `folga 12` **não mudam**.
   - `h = ceil(placaAltura + 1 + acento·corpo + linha·(n − 1) + reserva + margemBase + sombra)`, ou seja, 1 linha = **62**,
     2 linhas = **90**, 3 = 118, 4 = 146, mais 14 na vitória (hoje: 60 / 84 / 108 / 132).
   - `w = ceil(max(larguraTexto + 2·margemX, larguraPlaca + 2·placaRecuo + 8))`, com `larguraPlaca = nome em FH(19) + 2·9 + 6`.
   - a 1ª linha de base fica em `y + placaAltura + 1 + acento·corpo` e as seguintes a cada `linha`.
3. **`medirBalao`**: medir e quebrar o texto **em caixa alta** (`toLocaleUpperCase('pt-BR')`) com `FONTE_DA_FALA(24)` e
   `letterSpacing` (o número de letras não muda: o `letrasPorTick` continua certo). `CaixaDoBalao` ganha `larguraPlaca` e
   `enfase: ReadonlySet<number>` (índices de palavra, calculados pela regra da §5 no texto ORIGINAL).
4. **`colocarBalao`**: nos rabichos laterais, a base fica presa em
   `[y + placaSobra + chanfro + 8, y + h − sombra − chanfro − 12]`. No `cima`, a base continua em `y + h`, mas o desenho usa
   `y + h − sombra` (o rabicho atravessa a faixa da sombra). Hoje o protótipo prende isto só no desenho; o certo é prender aqui,
   para a ponta e a base virem coerentes.
5. **`desenharBalao`**: seguir a ordem da §2.1. `QuadroDoBalao` ganha `variante: VarianteDoBalao`, `desde: number` (ticks
   desde abrir), `fechando: number` (0 a 1) e `reduz: boolean`. `linhaDaProvocacao` já calcula `abriu` e a saída: é só expor.
   A retícula e os veios devem ser desenhados **uma vez por (w, h, cor, variante)** num canvas fora da tela e reaproveitados
   (`drawImage`), não ponto a ponto a cada quadro.
6. **`escalaDoPop`**: trocar por `0,6 + 0,4·easeOutBack(k)` (s = 1,9). O ZENON usa `0,94 + 0,06·easeOut(k)` com pop de 12 ticks.
7. **Variante da fala**: `FalaDoRoteiro` ganha `variante?`. `falaDaRodada` põe `'decisivo'` ou `'revanche'`, `falaDaVitoria` põe
   `'vitoriaPerfeita'` ou `'vitoria'`, `falasDaAbertura` põe `'abertura'`. Depois, em `fight.ts`, quem fala com id `zenon` vira
   `'zenon'` e o chefe da luta (`cfg.chefe`, se não for ZENON) vira `'guardiao'`. Precedência na §3.1.
8. **Testes que mudam de número** (não de regra): `p2-balao.test.ts` (alturas 62/90 e a reserva), `provocacao.spec.ts`
   (`cssCorpo` passa a ser `24·css`, ≥ 17 px no celular; o teto de altura `146 + rabicho + 2` continua valendo: a maior caixa
   das 232 falas, em qualquer variante, mede 146; a largura não muda) e `provocacao-p4-varredura.spec.ts` (o ▶ abaixo da
   última linha de base).
9. **Movimento reduzido**: sem escala, sem tremor, sem pop de palavra, ▶ e brilhos parados, linhas de velocidade já cheias,
   entrada com fade de 6 ticks.

**Critério de aceite** (o que eu medi no protótipo, e a Íris mede no jogo):
- os 13 cenários do `provocacao.spec.ts` × 2 perfis passam sem afrouxar a regra do rosto (0 px² nos lutadores normais, ≤ 16 px
  nos altos), dentro de [12, 948], topo ≥ 86 com HUD e ≥ 62 sob as faixas;
- o texto da fala ≥ 17 px CSS no celular 844x390 e o nome ≥ 13 px;
- as 232 falas com o rival mais largo: 1 ou 2 linhas como hoje, largura ≤ 400;
- os previews do jogo real batem com `baloes-premium-*.png`.

---

## 8. Medido (protótipo injetado no jogo real, sem alterar código)

**Método.** Vite dev numa porta separada. No DEPOIS, o `page.route` troca `src/render/balao.ts` **na rede** pelo original mais o
núcleo premium e serve a Bangers do disco no mesmo origin. O A/B de pixels é o mesmo do `provocacao.spec.ts` (quadro com e sem
balão, máscara entre as faixas, rosto = caixa da cabeça). Scripts em `arte-fonte/baloes/prototipo/` (`capturar.mjs`,
`varredura.mjs`, `contraste.mjs`, `comparar.html`, `anim.html`); o resultado bruto está em `relatorio-capturas.json`.

### 8.1 Geometria e rosto (11 cenas × 3 perfis: desktop 1280x720, 915x412 e 844x390; os números são iguais nos três)

| Cena | Antes (x, y, w × h) | Depois | Rosto coberto, depois |
|---|---|---|---|
| abertura WEI LONG (larga) | 138,79 263×96 | 123,74 294×100 | 0 / 0 |
| abertura CENTELLA P2 (larga, `¡`) | 580,82 220×96 | 566,77 249×100 | 0 / 0 |
| revanche CENTELLA | 136,106 268×72 | 118,105 304×72 | 0 / 0 |
| decisivo HAYATO | 143,145 254×72 | 126,144 289×72 | 0 / 0 |
| vitória AMINU | 336,61 272×100 | 337,62 305×104 | AMINU 3 px² / 2 px (**antes: 3 px² / 2 px**, igual) |
| vitória perfeita CENTELLA | 377,61 258×100 | 353,62 281×104 | 0 / 0 |
| guardiã CAMILLE (vitória) | 580,61 220×107 | 566,62 248×104 | 0 / 0 |
| ZENON abertura | 330,61 233×86 | 330,62 256×90 | 0 / 0 |
| ZENON vitória | 338,61 284×100 | 307,62 314×104 | ZENON 7 px de profundidade (≤ 16, alto) |
| CURTA dupla | 2 balões, sem encostar | 2 balões, sem encostar | 0 / 0 |
| revanche BAATAR (HUD visível) | 144,89 252×72 | 134,88 273×72 | 0 / 0 |

Topo ≥ 62 sob as faixas e ≥ 86 com o HUD em todas. Altura medida: +4 px no balão de 2 linhas e 0 no de 1 linha. A largura cresce até 35 px (máx. 345 nas
232 falas), sempre ≤ 400. **O único rosto tocado (AMINU, 3 px²) já era tocado igual pelo balão de hoje**: não é regressão do
desenho novo, é o caso do `escolherPlano` com lutador médio na vitória (fora dos 13 cenários do spec). Vale a Íris olhar.

### 8.2 Varredura das 232 falas (rival mais largo: WEI LONG)

0 estouros. Variante de 372: 76 falas de 1 linha e 156 de 2. Largura máx. **345**, mediana 258. Altura máx. 104 (vitória de 2
linhas). Variante de 300: até 4 linhas (só 1 fala), altura máx. 146. Variante de 240: 1 fala, 90.

### 8.3 Contraste

- **Pixels reais** (no jogo, na faixa das linhas de texto: mediana do texto contra o percentil 95 mais claro do fundo do
  painel, que inclui retícula, vidro e brilho): **7,7 a 12,3 : 1** nas 33 capturas (antes: 15,5 a 17,2, num painel chapado).
  Tudo acima de AAA (7:1).
- **Pior caso teórico sobre os 10 cenários** (o pixel MAIS claro da faixa do balão, y 62..330, de cada cenário; painel opaco +
  vidro 8% + ponto de retícula da cor mais clara, CAMILLE `#e6ebf7`, a 10%):

  | Variante | Texto creme | Ênfase (pior parada do gradiente) |
  |---|---|---|
  | abertura / vitória | 8,81 | 5,65 |
  | revanche | 9,68 | 5,24 |
  | decisivo | 9,25 | 6,34 |
  | vitória perfeita | 8,75 | 7,54 |
  | guardião | 8,81 | 5,28 |
  | ZENON | 12,63 | 6,74 |

  Tudo ≥ 4,5 (AA para texto normal). O painel é **opaco** de propósito: com ele o contraste não depende do cenário (os pixels
  mais claros dos cenários chegam a luminância 0,99 em `kr` e `gr`).
- **Não-texto** (WCAG 1.4.11): o aro claro (`#fff1d0`) sobre o contorno escuro (`#07040e`) tem 18:1 entre si, então qualquer
  fundo tem ≥ 3:1 com pelo menos um dos dois. A plaquinha: §3.2.

### 8.4 Previews (`arte-fonte/capturas/`)

- `baloes-premium-<cena>-<perfil>.png`: 33 arquivos, ANTES | DEPOIS na tela inteira (desktop a DPR 1; celulares a DPR 2, com
  os controles de toque reais);
- `baloes-premium-galeria-desktop.png`, `-m915.png`, `-m844.png`: só o recorte do balão, 11 cenas, antes x depois;
- `baloes-premium-fontes-comparativo.png`: as 11 opções de fonte DENTRO do balão novo, no tamanho do celular 844x390;
- `baloes-premium-animacao-tira.png`: a tira de quadros da §6.

---

## 9. Pendências e riscos

- **Decisão do dono**: Bangers em caixa alta (recomendada) ou Saira Condensed 800 em minúsculas (plano B). O resto não muda.
- `ctx.letterSpacing` no Safari antigo: sem suporte, o texto fica 1 px mais apertado por letra (medida e desenho continuam
  coerentes). Conferir num iPhone real.
- O desenho é mais caro que o retângulo (retícula, gradientes, 2 contornos). Com o cache fora da tela da §7 passo 5, o custo
  por quadro fica em 1 `drawImage` + texto. Medir o quadro no celular depois do porte.
- AMINU na vitória toca 3 px² do cabelo, igual ao balão de hoje (§8.1): caso do `escolherPlano` com lutador médio, não do desenho.
- Termos estrangeiros em caixa alta ("ÓRALE", "LÁI BA", "KALÓS ÍRTHES") seguem com a revisão de nativo já pendente nas falas.
