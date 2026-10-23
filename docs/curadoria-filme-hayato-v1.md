# Curadoria técnica: folha FILME do HAYATO (piloto) v1

Apolo, 23/10/2026. Folha: `arte-fonte/lutadores/hayato/folhas/hayato-filme-v1.png` (2400 x 1792, gerada com o prompt do
§7 de `docs/roteiros-filme-especiais.md`). O dono aprovou o piloto. Nada foi gerado na Runway e nada foi commitado.

Marcação: **[medido]** = número tirado do arquivo ou do navegador; **[calculado]** = conta sobre números medidos;
**[a olho]** = julgamento visual.

## 0. Veredito

**APROVADA, sem regeração e sem versão -v2 da folha.** As 6 células entram como estão. A página FILME foi montada por
código: **1920 x 1280, 9,38 MiB decodificada, 433 KB em WebP**. No jogo de verdade (página injetada por `page.route`), o
close sai **1,062x a 1,063x ampliado** nas 11 batidas medidas. O teto era 1,1x. O close é bem melhor que o quadro do atlas:
a cabeça fica cerca de 1,9x maior e o desenho fica cerca de 1,5x menos ampliado.

O que falta para dar "go" nas outras 9 folhas está nos itens 4 e 5 do §6.3:
- a Íris mede a memória no perfil de celular;
- o dono vê os filmes A x B lado a lado.

A página não pode entrar no `atlas.json` de hoje sem mudança no código. O motivo está no §5.

## 1. Medidas da folha [medido, `filme-medir.mjs`]

- Fundo `253,43,248` (magenta). Sem ruído na borda (0 px nas 2 linhas e colunas de fora).
- Halo: 61,0% antes do despill e 0,00% depois (pipeline `nucleo.mjs`).
- **13 componentes:** as 6 figuras e mais 7 pequenos, todos na R2C2:
  - 5 gotas de saliva, com 30 a 204 px;
  - 2 fiapos de cabelo, com 1 e 2 px.
- Grade 3 x 2 separada (`ordenarGrade` = `separadas: true`).

| Célula | Pose | Caixa (x0,y0 – x1,y1) | Tamanho | Corte reto (colunas na base) | Folga da borda |
|---|---|---|---|---|---|
| R1C1 → `f0` | RAIJIN-DAN: duas palmas, grito | 28,34 – 836,802 | 809 x 769 | sim, 402 colunas seguidas (quadril) | E 28 |
| R1C2 → `f1` | RAIJIN-KEN: gancho para cima | 918,42 – 1402,853 | 485 x 812 | sim, 346 (coxa) | T 42 |
| R1C3 → `f2` | KAMINARI-STEP: soco no avanço | 1486,94 – 2369,788 | 884 x 695 | sim, 347 (as duas pernas no joelho) | D 30 |
| R2C1 → `f3` | grito | 58,944 – 807,1687 | 750 x 744 | sim, 393 (cintura) | – |
| R2C2 → `f4` | rosto atingido | 834,975 – 1509,1687 | 676 x 713 | sim, 568 (peito) | – |
| R2C3 → `f5` | lançado para trás | 1563,948 – 2347,1687 | 785 x 740 | sim, 314 (coxa) | D 52 |

Sobre as bordas:
- Nada encosta na borda da imagem nem em outra figura.
- O menor vão é de 27 px, entre R2C1 e R2C2, e só nas caixas.
- A folga de 8% pedida no prompt não foi respeitada (28 a 52 px), mas isso não importa: o recorte é por componente.

Os únicos cortes são as linhas retas da base. Na linha de baixo, as três células cortam na **mesma** linha, y = 1687.

**Magenta interno:** 4 px (R2C2) e 22 px (R2C3) num total de 260 mil px, todos dentro da figura. Sobre fundo azul-escuro e
sobre cinza claro, não aparece magenta nem halo [a olho, `sobre-escuro.png`].

## 2. Veredito por célula

| Célula | Veredito | Notas |
|---|---|---|
| `f0` R1C1 | **ok** | É a pose pedida: palmas juntas à frente, boca aberta, fitas para trás. Rosto e traje batem com a mestra [a olho] |
| `f1` R1C2 | **ok, com ressalva menor** | O gancho sobe com o braço de TRÁS (o prompt pedia "nearest the viewer"), e o corte ficou na coxa, não no joelho. Lê como gancho para cima, e no painel isso não pesa. Não regerar |
| `f2` R1C3 | **ok, com ressalva menor** | Vista de três-quartos de costas. O raio grande das costas **não aparece**: é o único item de traje que falta. Com o painel a 1,06x, ninguém procura emblema |
| `f3` R2C1 | **ok** | Grito diferente do idle: XOR de 23,5% contra a mestra, mais que a respiração (até 16%). A boca aberta troca o sorriso da mestra |
| `f4` R2C2 | **ok, mantidas as gotas** | Cabeça para a ESQUERDA, como pedido. Ver a decisão sobre as gotas logo abaixo |
| `f5` R2C3 | **ok** | O corpo arqueia para a ESQUERDA e os braços se abrem. Espelhado no painel do rival, o corpo vai para longe do atacante e o rosto olha para ele [medido na captura] |

**Decisão sobre as gotas da R2C2: não são lixo.** São saliva desenhada com contorno, saindo da boca no sentido do golpe.
- Viram 5 elipses de 27 a 7 px de largura, legíveis no painel [medido na captura `com-sFire-t34.png`].
- Saliva e suor não estão na lista de efeitos proibidos do prompt. É o vocabulário de "rosto atingido" do gênero.
- Espelhadas no painel do rival, voam para longe do atacante.
- Por isso **não criei `hayato-filme-v2.png`**.
- Os 2 fiapos de cabelo (1 e 2 px) são tirados pelo montador da página (`AREA_MIN = 10`), sem mexer na folha.

Também não criei a -v2 por um segundo motivo. O pipeline pega o MAIOR `vN` da pasta, e uma -v2 sem uso viraria armadilha.

## 3. Cabeça e escala

### 3.1 Altura da cabeça (cabelo → queixo) [medido a olho na grade de 20 px; ±5 px]

| | Mestra | f0 | f1 | f2 | f3 | f4 | f5 | atlas `idle0` | atlas `sa2` |
|---|---|---|---|---|---|---|---|---|---|
| Na folha (px) | 442 | 291 | 237 | 206 | 330 | ~298 | ~223 | 86 | 80 |
| Na tela, no painel (px do canvas 1920 x 1080) [calculado: × 670 / altura da célula] | – | 254 | 196 | 199 | 297 | 280 | 202 | – | – |

Sobre a precisão:
- A medida de cabelo → queixo varia com a pose: boca aberta (f0, f3) aumenta e cabeça inclinada (f2, f4, f5) diminui.
- A faixa da testa, que não muda de tamanho, dá 32 px na f0 contra 43 px na mestra: 0,74.
- Isso bate com o encaixe por XOR, que deu escala de 0,58 a 0,74 contra a mestra.

**Escala relativa entre as células:** o painel encaixa cada célula pela própria altura. Todas ficam limitadas pela altura e
saem com 670 px de canvas. Por isso o tamanho da cabeça na tela varia de 196 a 297 px, cerca de 1,5x:
- busto (f0, f3, f4) = plano fechado;
- três-quartos (f1, f2, f5) = plano médio.

Isso é troca de plano de cinema, não erro de escala. Dentro de um mesmo filme a sequência é sempre grito (busto) → golpe
(qualquer plano) → reação (busto → plano médio), o que dá ritmo. **Não normalizar.**

### 3.2 O close contra o atlas ampliado (critério do piloto §6.3, item 3) [medido no navegador]

Capturas de HAYATO x HAYATO pelo gancho `?filme=hayato:<golpe>`, com e sem a página. Um espião no `drawImage` real do jogo
gravou origem e destino de cada close com a transformação do canvas (`filme-prova-painel.mjs`).

| Golpe @ tick da batida | Célula | Origem (px da página) | Destino na tela (px do canvas) | Ampliação |
|---|---|---|---|---|
| sFire @12 | f0 | 631 | 705 x 670 | **1,062** |
| sFire @34 / sFwd @38 / sDown @38 | f4 (rival) | 630 | 635 x 670 | **1,063** |
| sFire @44 / sFwd @48 / sDown @48 | f5 (rival) | 631 | 711 x 670 | **1,062** |
| sFwd @0 / sDown @0 | f3 | 630 | 676 x 670 | **1,063** |
| sFwd @28 | f2 | 630 | 853 x 670 | **1,063** |
| sDown @28 | f1 | 630 | 401 x 670 | **1,063** |

Sem erro de página. O mesmo instante sem a página (A), em `sem-sFire-t12.png`:
- o HAYATO do mundo tem ~635 px de altura de tela para um quadro de 399 px, o que dá **~1,6x de ampliação**;
- a cabeça fica com ~145 px.

No close (B), a cabeça tem ~270 px a 1,06x [medido a olho nas duas capturas]. **Go técnico.**

## 4. Eco da mestra (XOR contra a mestra reescalada) [medido, `filme-eco.py`]

Como foi medido:
- A mestra foi recortada na figura (1545 x 2151) e reescalada de 0,50 a 0,90.
- Foi cortada na mesma linha da célula, alinhada pelo topo e pelo centro de massa.
- O deslocamento x variou ±60 px.
- Vale o **menor** XOR encontrado, então o número é um piso, a favor do eco.

Régua da respiração do idle no atlas: idle0 x idle1 = 9,8%; x idle2 = 16,0%; x idle3 = 1,7%.

| f0 | f1 | f2 | f3 | f4 | f5 |
|---|---|---|---|---|---|
| 28,2% | 48,1% | 50,2% | 23,5% | 42,1% | 50,4% |

Todas passam do teto da respiração (16%). **Nenhum eco.**
- A mais próxima é a `f3` (punhos fechados no peito, perto da guarda), mas o rosto é outro.
- O piloto ainda não precisou da 1 regeração permitida.

## 5. Página FILME

### 5.1 Como foi montada (`arte-fonte/ferramentas-curadoria/filme-montar-pagina.mjs`)

1. Fundo, alfa, despill e componentes pelo `nucleo.mjs` do pipeline. Ordem 3 x 2 = `f0..f5`.
2. Cada célula é recortada pela máscara dela, com franja de 3 px. Componentes com menos de 10 px saem (os 2 fiapos).
3. **A linha de corte é a última linha do quadro**, sem margem embaixo. O painel encosta a célula na base pela altura
   (`pd.h`), e qualquer margem transparente embaixo viraria um vão.
4. **A linha de corte da IA vem com anti-alias, meio transparente.** Medi 0 px opacos na base das 3 células de cima. Por
   isso, onde a coluna está opaca 5 px acima, as 4 últimas linhas viram cópia dela. Depois disso, de 262 a 497 px opacos
   por base. Sem esse passo, o painel mostraria um fio claro na base do close.
5. Todas as células são reamostradas (lanczos3) para a mesma altura: 630 px.
   - O painel tem 670 px de altura no canvas: `round(540 × 0,62) = 335` lógicos × RS 2.
   - Como todas as células ficam limitadas pela altura, a ampliação é igual nas 6: 670 / 630 = 1,063.
6. As células são empacotadas em 2 linhas de 3 (ordem f0..f5), com vão de 4 px. A altura é arredondada para múltiplo de 16.

### 5.2 Dimensão final [medido]

| | Valor |
|---|---|
| Página | **1920 x 1280** (área usada: 1919 x 1274) |
| Memória decodificada | 1920 × 1280 × 4 = **9,38 MiB**. Na luta HAYATO x HAYATO é uma página só. Com 2 lutadores diferentes, 18,75 MiB |
| Download | **433 KB** em WebP q88 com alfa 100 (estimativa do laudo: 0,6 a 0,8 MB) |
| Ampliação no painel | **1,063x** (teto 1,1x) |

Alternativas [calculado]:
- **2048 x 1280**, como no laudo: 10 MiB, sem ganho. A largura útil é 1919.
- **1,0x exato** (células de 670 px): 2048 x 1352, 10,56 MiB. Gasta +1,2 MiB por página por 6% de nitidez que ninguém vê.
- **Plano B, se o iPhone estourar:** células de 480 px numa página 1472 x 976, 5,5 MiB, a 1,40x. Ainda fica melhor que o
  atlas, que está a 1,6x.

### 5.3 Mapa (`arte-fonte/lutadores/hayato/filme/hayato-filme-pagina-v1.json`)

Coordenadas em px da página. `ax` = metade da largura. O painel não usa âncora, mas o validador exige o campo.

| Quadro | x | y | w | h | `painel` | Batidas que o usam (`src/data/roteiros-filme.ts`) |
|---|---|---|---|---|---|---|
| `f0` | 4 | 4 | 664 | 631 | true | `hayato/sFire` b2 (fK, `peso: 0`, o disparo) |
| `f1` | 672 | 5 | 377 | 630 | true | `hayato/sDown` b4 (fK, peso 0,35) |
| `f2` | 1053 | 5 | 802 | 630 | true | `hayato/sFwd` b4 (fK, peso 0,35) |
| `f3` | 4 | 640 | 636 | 630 | true | b0 dos 3 filmes (grito, `peso: 0`) |
| `f4` | 644 | 640 | 597 | 630 | true | rival em b5 (`chao` e `aereo`, peso 0,25) e em b5 do projétil (0,50) |
| `f5` | 1245 | 639 | 670 | 631 | true | rival em b6 (`peso: 0`) |

**`painel: true` vai em cada QUADRO do JSON, não na batida.** É o contrato da Lyra: `filme.ts:299-305` decide painel ou
mundo pelo `pd.painel` da pose. A batida só cita `f0..f5` e o `Alt`, e o roteiro já está certo para o HAYATO. Os `peso: 0`
das batidas de grito, disparo e queda já estão no `roteiros-filme.ts`. Nada a mudar nos roteiros.

## 6. O que a Vega e a Lyra precisam fazer para entrar no jogo

### 6.1 Vega (loader): a página não cabe no `atlas.json` de hoje [lido em `src/assets/carregador.ts:173-193` e `gerenciador.ts`]

O campo `painel` já existe no loader (commit bd14dbc). O problema é a página:

1. `carregarImagens` exige que **toda** página tenha o `tamanho` do manifesto, que é 2048 x 1536 no HAYATO. Uma página de
   1920 x 1280 é recusada com `ErroDeAsset`.
2. Todas as `imagens` do atlas carregam juntas sempre que o lutador carrega, e `pedir(id)` também dispara isso na tela de
   seleção. Se a FILME entrasse na lista, os ~10 MiB iriam junto em toda carga do lutador. Isso vai contra o laudo §6.1
   ("sob demanda, nunca no pré-carregamento").

**Proposta:** um bloco separado no `atlas.json`:

```json
"filme": { "imagem": "filme.webp", "tamanho": [1920, 1280], "quadros": { "f0": { "x": 4, "y": 4, "w": 664, "h": 631, "ax": 332, "painel": true } } }
```

- Os quadros `f0..f5` entram no `pd` desde o começo. Sem a imagem, `imagemDe(pd)` devolve null: o mundo desenha o `Alt` e o
  painel não aparece. É a queda que o laudo pede, e `filme.ts:305` + `:672` já fazem isso.
- A imagem carrega só no `garantir` da luta, para os 2 lutadores, e é solta no fim da luta. Não carrega em `pedir`, nem em
  `prebuscar`, nem no LRU da seleção.
- O validador do bloco aceita só quadros `f0..f5`, todos com `painel: true`.

**Paliativo sem mudar o código (só para a revisão do dono, não para produção):**
- completar a página com transparente até 2048 x 1536;
- pôr a página como `p: 2` em `imagens`.

Foi assim que provei no navegador (`filme-prova-painel.mjs`, via `page.route`, nada gravado em `public/`). Custa 12 MiB e
carrega em toda carga do HAYATO.

**Arquivo para o `public/`:** `arte-fonte/lutadores/hayato/filme/hayato-filme-pagina-v1.webp` →
`public/assets/lutadores/hayato/filme.webp`. Os quadros estão no `.json` ao lado.

### 6.2 Lyra (painel): 4 ajustes que as capturas mostraram

1. **Grito do projétil invisível** [medido]. No `modeloProjetil`, a batida do `f3` dura 6 ticks (t0 → t6), e 4 deles são a
   entrada deslizando. Em sFire @6 o close já não estava mais na tela.
   - Proposta: tirar a b1 (`sa1`, `peso: 0`) e deixar o grito de t0 a t12.
   - O `atacanteAlt` do grito continua `sa0`. O mundo atrás do painel já mostra a preparação.
   - Vale para os 6 projéteis.
2. **Painel deixa ver o lutador do mundo** [a olho, `com-sFire-t12.png`, `com-sFwd-t28.png`]. Com fundo a 85%, o sprite do
   mundo, que está na pose `Alt` atrás do painel, aparece como um fantasma e dobra a figura. Os números de dano também
   aparecem por trás.
   - Proposta: fundo a 0,94, ou não desenhar no mundo o lutador que está no painel.
3. **Célula larga na borda inclinada** [calculado, não capturado]. Isso acontece quando o atacante está à DIREITA da tela.
   - O `f2` (853 px de canvas) é centrado em x = 1520. Espelhado, o punho fica a ~6 px da borda inclinada, perto do topo.
   - Proposta: centrar considerando a inclinação (deslocar o centro ~20 lógicos para fora), ou encaixar a largura em
     `LARGURA_DO_PAINEL - tan(12°) × ALTURA_DO_PAINEL`.
   - Prova: rodar o gancho com o HAYATO como P2.
4. **Cabelo no topo do painel.** Como a célula ocupa 100% da altura, a ponta do cabelo encosta no topo do painel. Fica
   melhor com 3% a 4% de folga: encaixar em `ALTURA_DO_PAINEL × 0,96`. A ampliação passa a 1,02x.

## 7. Arquivos

| Arquivo | O que é |
|---|---|
| `arte-fonte/lutadores/hayato/filme/hayato-filme-pagina-v1.webp` / `.png` / `.json` | Página FILME e o mapa dos quadros |
| `arte-fonte/ferramentas-curadoria/filme-medir.mjs` | Componentes, corte reto, bordas, halo e magenta interno da folha 3 x 2 |
| `arte-fonte/ferramentas-curadoria/filme-eco.py` | XOR das 6 células contra a mestra reescalada e a régua da respiração. Lê o `medidas-v1.json` gerado pelo medir |
| `arte-fonte/ferramentas-curadoria/filme-montar-pagina.mjs` | Monta a página: `node … <folha> <saida> <Hc=630>` |
| `arte-fonte/ferramentas-curadoria/filme-prova-painel.mjs` | Injeta a página e mede o close no `drawImage` real. Precisa do servidor de desenvolvimento em 5173. Modos `com` e `sem` |

`arte-fonte/` é gitignored: as ferramentas e a página não vão para o git até alguém copiar a página para `public/`.

## 8. Para as outras 9 folhas (quando o dono der o go)

Basta trocar o lutador nos scripts:
1. `filme-medir` (deve dar 6 figuras + só pequenos);
2. `filme-eco` (todas acima da respiração);
3. `filme-montar-pagina` com Hc 630;
4. `filme-prova-painel`.

Cuidados:
- Lutadores com fundo **verde** usam o mesmo `nucleo` (`detectarChave`).
- O ZENON tem teto de zoom 1,10 no mundo, mas o painel não usa zoom: o close dele sai igual ao dos outros. É o maior ganho
  da lista.
