# Curadoria técnica: folhas FILME do grupo B (WEI LONG, CAIO, MIN-JI)

Apolo, 23/10/2026. Procedimento e régua do piloto: `docs/curadoria-filme-hayato-v1.md`. O dono aprovou as três folhas a olho.
Nada foi gerado na Runway, nada foi commitado, nada mudou em `src/` nem em `public/`.

Marcação: **[medido]** = número tirado do arquivo ou do navegador; **[calculado]** = conta sobre números medidos;
**[a olho]** = julgamento visual.

| Lutador | Folha curada | Fundo |
|---|---|---|
| WEI LONG | `arte-fonte/lutadores/wei-long/folhas/wei-long-filme-v1.png` (2400 x 1792) | magenta `252,3,250` |
| CAIO | `arte-fonte/lutadores/caio/folhas/caio-filme-v2.png` (2400 x 1792). A v1 é a genérica e foi ignorada | magenta `253,2,249` |
| MIN-JI | `arte-fonte/lutadores/min-ji/folhas/min-ji-filme-v1.png` (2400 x 1792) | **verde** `4,251,3` |

O fundo confere com o §7 de `docs/roteiros-filme-especiais.md`: WEI e CAIO magenta, MIN-JI verde. O `nucleo.mjs` detectou a
chave sozinho nas três.

## 0. Veredito

**As três estão APROVADAS. Nenhuma regeração.** Só o CAIO precisou de limpeza por código: os cortes da linha 2 vieram em
curva e foram endireitados (§3.2).

| | WEI LONG | CAIO | MIN-JI |
|---|---|---|---|
| Página | **1824 x 1280** | **1888 x 1280** | **1920 x 1216** |
| Memória decodificada | 8,91 MiB | 9,22 MiB | 8,91 MiB |
| WebP (q88, alfa 100) | 405 KB | 333 KB | 370 KB |
| Ampliação do close no jogo [medido] | 1,019 a 1,021x | 0,94 a 1,021x | 0,999 a 1,072x |
| Teto do zoom do mundo [medido] | **1,30** | 1,30 | 1,30 |

O teto do close é 1,1x, e as três passam. O WEI LONG já sai com zoom 1,30 no mundo, porque o atlas novo dele não é `legacy`
(`tetoDeZoom` em `src/render/filme.ts:255`). Medi isso no `drawImage` do atlas dele, nas batidas com câmera no atacante.

## 1. Medidas das folhas [medido, `filme-medir.mjs`]

Nas três folhas:
- saem **6 componentes**, sem nenhum pequeno (nem gota, nem fiapo);
- a grade 3 x 2 sai separada;
- o halo cai a 0,00% depois do despill (antes: WEI 78%, CAIO 84%, MIN-JI 71%);
- o ruído na borda é 0, exceto 1 px no CAIO, que cai no corte de 2 px da borda.

| Célula | WEI: caixa / corte reto / folga | CAIO: caixa / corte reto / folga | MIN-JI: caixa / corte reto / folga |
|---|---|---|---|
| R1C1 | 821x845, **busto**, 402 col / E25 T23 | 722x807, **busto**, 420 col / E74 | 706x792, corpo inteiro (pé) / T78 |
| R1C2 | 779x825, corpo inteiro (sapatos) | 861x754, corpo inteiro (mão e pé no chão) | 751x668, corpo inteiro no ar |
| R1C3 | 693x755, **três-quartos**, 589 col / D85 | 594x783, corpo inteiro (mão e pé no chão) | 816x592, corpo inteiro no ar / D42 |
| R2C1 | 792x844, **busto**, 418 col / **B33**, E22 | 676x827, busto **em curva** (69 col) / B62 | 745x745, **busto**, 330 col / **E22** |
| R2C2 | 757x780, **busto**, 688 col / B54 | 624x756, busto **em curva** (96 col) / B106 | 719x692, **busto**, 542 col / B118 |
| R2C3 | 810x848, corpo inteiro / **B14**, D23 | 814x694, três-quartos **em diagonal** (27 col) / D52 | 683x723, **três-quartos**, 300 col / D74 |

Pontos que o Atlas pediu para conferir:
- **WEI, células de baixo perto da borda inferior.** O busto R2C1 corta 33 px acima da borda, e o R2C2 54 px acima. O sapato
  da R2C3 fica a 14 px. Nada encosta, e o recorte é por componente, então a folga apertada não custa nada.
- **CAIO, bustos da linha 2 em curva.** Confirmado, e a R2C3 também veio torta: as duas pernas cortadas em diagonal e em
  alturas diferentes (1683 e 1622). Tratei no §3.2.
- **MIN-JI, rabo de cavalo da R2C1 perto da borda esquerda.** Fica a 22 px. Não encosta e não foi cortado.
- **MIN-JI, R1C1 é chute reto, não meia-lua.** Confirmado [a olho]: perna estendida para cima, sem o arco. Fica como close
  do BULKKOT. No painel lê como "chute alto" e combina com o `sa` do atlas.

**Magenta e verde internos:**
- WEI: 0 a 5 px por célula;
- CAIO: 0 a 27 px (R1C3: o verde do cordão é da roupa, não é fundo);
- MIN-JI: 1 a 16 px.
Nos painéis capturados no jogo (fundo verde, roxo e vermelho), não aparece halo nem franja de cor [a olho, capturas do §4].

## 2. Veredito por célula [a olho]

### WEI LONG
| Célula | Uso | Veredito |
|---|---|---|
| `f0` R1C1 | LONG ZHANG (`sFire`) | **ok.** Palmas juntas à frente, olhar duro, coque e barba para trás |
| `f1` R1C2 | ZHEN DI (`sDown`) | **ok.** Veio de corpo inteiro (o pedido era três-quartos): base de cavalo, palmas para baixo. Pela regra do §7, aceita |
| `f2` R1C3 | TIE SHAN KAO (`sFwd`) | **ok.** Ombrada com o tronco inclinado e os punhos recolhidos. É a primeira arte do WEI em que a ombrada lê como ombrada |
| `f3` R2C1 | grito | **ok.** Boca aberta, punhos no peito |
| `f4` R2C2 | rosto atingido | **ok, com ressalva.** O rosto fica de frente para a direita, mas os olhos estão fechados e o cabelo e a barba voam para a esquerda. Espelhado, voa para longe do atacante |
| `f5` R2C3 | lançado | **ok.** Corpo inteiro arqueado para a esquerda, braços abertos |

### CAIO (regra do gingado: memória `feedback-caio-capoeirista-gingado`)
| Célula | Uso | Gingado? | Veredito |
|---|---|---|---|
| `f0` R1C1 | ONDA VERDE (`sFire`) | **sim.** Tronco torcido, braços varrendo em arco, mãos abertas, sorriso de malícia | **ok** |
| `f1` R1C2 | RABO-DE-ARRAIA (`sDown`) | **sim.** Agachado na ginga baixa, mão no chão, perna varrendo rente com a sola na frente | **ok**: é a rasteira baixa do texto do golpe |
| `f2` R1C3 | MEIA-LUA (`sFwd`) | **sim.** Meia-lua de compasso: mão no chão, corpo invertido, perna passando em arco alto com o calcanhar descendo | **ok**: "chute descendente, golpe ALTO" |
| `f3` R2C1 | grito | **sim.** Não é grito, é a **chamada**: sorriso malandro, mão aberta guardando o rosto, a outra solta embaixo | **ok, e melhor que o pedido.** Grito de boxe descaracterizaria |
| `f4` R2C2 | rosto atingido | n/a (reação) | **ok, com ressalva**, a mesma do WEI: o rosto fica de frente, e os dreads voam para a esquerda |
| `f5` R2C3 | lançado | n/a, mas os braços estão abertos e as mãos soltas | **ok.** Corte endireitado (§3.2) |

**Nenhum punho fechado nas 6 células e nenhum rastro desenhado.** A v2 cumpre a regra do dono. Os punhos de boxe que
sobram estão no **atlas** (`idle`, `sa1`, `sa3`, `sb3`, `lk1`, `hk1`, `jup`, `land`), e o roteiro do §5 desvia deles onde
pode.

### MIN-JI
| Célula | Uso | Veredito |
|---|---|---|
| `f0` R1C1 | BULKKOT (`sFire`) | **ok.** É chute reto alto, não meia-lua; aceito como close |
| `f1` R1C2 | HOERI CHAGI (`sDown`) | **ok.** No ar, meio de costas, perna estendida, rabo de cavalo voando |
| `f2` R1C3 | TWIO YEOP CHAGI (`sFwd`) | **ok.** Voadora lateral quase horizontal. Célula larga, limitada pela LARGURA no painel (§3.3) |
| `f3` R2C1 | grito | **ok, com ressalva de eco parcial.** A silhueta é a guarda da mestra (XOR 12,3% contra 9,2% de respiração, §4), mas o rosto grita de boca aberta, e no close de busto o rosto é o que se vê. Não regerar |
| `f4` R2C2 | rosto atingido | **ok.** Olhos fechados, dentes cerrados, rabo de cavalo para a esquerda |
| `f5` R2C3 | lançado | **ok.** Três-quartos, arqueada para a esquerda, braços abertos |

## 3. Página FILME

### 3.1 Como foi montada

Usei as ferramentas do piloto, com três acréscimos. Todos são retrocompatíveis com o HAYATO.

1. `filme-montar-pagina.mjs <folha> <dir> <Hc> [cortes] [WC]`:
   - **4º argumento, `cortes` (meu):** só as células de busto ou três-quartos recebem a réplica da linha de corte. Nas células
     de corpo inteiro, a réplica apagaria o contorno de baixo do pé (são 4 linhas copiadas de 5 px acima).
   - **5º argumento, `WC` (do grupo A):** largura máxima da célula.
2. `filme-empacotar.mjs <dirMontador> <saida>` (novo): escolhe as duas linhas de 3 células que dão a página mais estreita,
   **sem reamostrar**. A ordem fixa f0-f2 / f3-f5 punha os três chutes de corpo inteiro da MIN-JI na mesma linha: 2160 px de
   largura e 10,55 MiB.
3. `filme-endireitar-corte.py` (novo): o corte em curva do CAIO (§3.2).

| Lutador | Comando (Hc / cortes / WC) | Linhas na página |
|---|---|---|
| WEI | `630` / `f0,f2,f3,f4` / – | f0 f1 f2 / f3 f4 f5 (sem reempacotar) |
| CAIO | `630` / `f0,f3,f4,f5` / –, sobre a cópia de corte reto | f0 f1 f4 / f2 f3 f5 |
| MIN-JI | `600` / `f3,f4,f5` / `778` | f0 f2 f5 / f1 f3 f4 |

**A conta do painel mudou desde o piloto** [lido em `src/render/filme.ts:678-713`]:
- a célula agora ocupa 96% da altura: 335 × 0,96 = 321,6 lógicos = **643,2 px** de canvas;
- a largura útil desconta a inclinação: 460 − tan 12° × 335 = **777,6 px** de canvas.

Por isso:
- célula de altura 630 → 1,021x;
- altura 600 → 1,072x;
- toda célula com largura/altura > 1,209 fica limitada pela LARGURA.

Na MIN-JI, o `f2` (voadora) foi limitado a 778 px de largura: sai a 0,999x, e guardar mais que isso seria memória que não
aparece na tela. Com Hc 600 e o reempacotamento, a página cabe em 1920 de largura. Com Hc 630, a melhor página seria 2048 x
1280, com 10 MiB.

### 3.2 CAIO: corte em curva → reto (limpeza por código, sem tocar na folha)

A IA cortou os dois bustos num arco em forma de tigela, com o meio mais baixo e as pontas subindo. Também cortou as pernas
da R2C3 em diagonal, em alturas diferentes. Encostado na base do painel, isso deixaria cunhas transparentes dos dois lados.

Como corrigi:
- li o perfil da base, coluna por coluna;
- escolhi a linha em que o contorno lateral do corpo termina e a curva começa (a ponta mais ALTA da tigela);
- pintei com a cor exata do fundo tudo o que estava abaixo dela, dentro da caixa da célula.

| Célula | Última linha mantida (px da folha) | Linhas tiradas | Corte reto depois [medido] |
|---|---|---|---|
| R2C1 (`f3`) | 1690 | 39 de 827 | 295 colunas (antes, 69). As pontas dos dedos da mão de baixo encostam na linha |
| R2C2 (`f4`) | 1600 | 85 de 756 | 607 colunas (antes, 96). Fica busto até o peito |
| R2C3 (`f5`) | 1610 | 73 de 694 | 239 colunas nas duas pernas (antes, 27). A borla amarela fica inteira, a ~1 px da base |

A cópia fica em `arte-fonte/lutadores/caio/filme/caio-filme-v2-corte-reto-v1.png`. É um intermediário, fora de `folhas/`. A
folha `caio-filme-v2.png` não foi tocada, e não existe -v3 dela.

### 3.3 Mapas (`arte-fonte/lutadores/<id>/filme/<id>-filme-pagina-v1.json`)

Todos os quadros vão com `painel: true`. O `p: 0` existe só por formato: no bloco `filme` do `atlas.json`, ele sai (é o que o
HAYATO tem em `public/`).

| Quadro | WEI x,y,w,h | CAIO x,y,w,h | MIN-JI x,y,w,h |
|---|---|---|---|
| `f0` | 4,5,612,630 | 4,5,564,630 | 4,5,535,600 |
| `f1` | 620,5,595,630 | 572,4,721,631 | 4,610,675,600 |
| `f2` | 1219,4,579,631 | 4,639,479,630 | 543,40,778,565 |
| `f3` | 4,640,591,630 | 487,639,541,630 | 683,610,601,600 |
| `f4` | 599,640,612,630 | 1297,4,583,631 | 1288,609,623,601 |
| `f5` | 1215,639,604,631 | 1032,639,827,630 | 1325,4,568,601 |

## 4. Prova no jogo [medido, `filme-prova-bloco.mjs`]

**Ferramenta nova.** O `filme-prova-painel.mjs` completava a página até o tamanho do atlas, um paliativo de antes do bloco
`filme`, e só servia para o HAYATO. O `filme-prova-bloco.mjs <lutador> <webp> <json> <saida> [com|sem] [p1|p2]`:
- injeta o **bloco `filme`** no `atlas.json`, que é o caminho de produção desde o bf99492, por `page.route`, sem nada em
  `public/`;
- toca os 3 filmes X x X pelo gancho `?filme=`;
- mede cada close no `drawImage` real e o maior zoom do mundo no atlas do lutador.

Resultado:
- **36 batidas com close** (3 lutadores × 3 especiais × 4 batidas). Em todas aparece a célula certa, na batida certa;
- **0 erros de página** e nenhum aviso `[filme]`.

| | WEI | CAIO | MIN-JI |
|---|---|---|---|
| Grito `f3` @0 | 1,021 | 1,021 | 1,072 |
| Especial `f0`/`f1`/`f2` | 1,021 / 1,021 / 1,019 | 1,021 / 1,019 / 1,021 | 1,072 / 1,072 / **0,999** (limitado pela largura) |
| Rival `f4` | 1,021 | 1,019 | 1,070 |
| Rival `f5` | 1,019 | **0,94** (827 px, limitado pela largura) | 1,070 |
| Zoom do mundo (máximo) | 1,30 / 1,25 / 1,15 conforme a batida | idem | idem |

**Lado direito (`p2`), HAYATO x CAIO e HAYATO x MIN-JI:** as células largas (CAIO `f1` com 721 px e MIN-JI `f2` com 778 px)
cabem dentro da borda inclinada quando o atacante está à direita.

Capturas na pasta temporária da sessão. Os mosaicos `caio/mosaico.png`, `wei-long/mosaico.png` e `min-ji/mosaico.png`
mostram os 6 closes no jogo [a olho]:
- cortes retos encostados na base do painel;
- pés com contorno inteiro;
- reações espelhadas, com a cabeça indo para longe do atacante;
- nenhum fio claro na base.

## 5. CAIO: revisão do roteiro do filme (proposta para a Lyra; `src/data/roteiros-filme.ts` NÃO foi editado)

A régua é a memória do dono: **ginga, golpes baixos e acrobáticos, mãos soltas; nada de punho de boxe**. Os 6 closes da v2
já cumprem isso. O que destoa é o atlas na rajada e em duas batidas do mundo.

**Mapa dos closes: mantido.** Considerei trocar `f1` e `f2`: na Angola, "rabo-de-arraia" também nomeia o chute invertido com
as mãos no chão, que é a `f2`. Não troquei por causa do texto dos golpes em `src/data/lutadores/caio.ts`:
- RABO-DE-ARRAIA é "rasteira giratória, golpe BAIXO" = `f1`, rente ao chão;
- MEIA-LUA é "chute descendente, golpe ALTO" = `f2`, o calcanhar descendo do alto.

| Especial | Hoje (`roteiros-filme.ts`) | Proposta | Por quê |
|---|---|---|---|
| **Rajada do CAIO** (linha 192; vale para RABO-DE-ARRAIA e MEIA-LUA) | `['lk1', 'hk1', 'sweep']` | **`['lk1', 'sweep', 'sb0']`** | O `hk1` é chute alto reto com os dois punhos de guarda: lê como taekwondo. A nova ordem é benção (`lk1`) → rasteira (`sweep`) → a ginga descendo ao chão (`sb0`) e cai direto no `sb1` (mão no chão) do close. "A ginga vai ao chão" deixa de ser só o nome da coluna |
| **ONDA VERDE** (`sFire`, projetil) | GRITO `f3` (alt `sa0`), `f0` @12 (alt `sa2`), `sa2` até o fim | **sem mudança** | `f3` = a chamada (malícia). `f0` = o arco dos braços que solta a onda. O `sa1` (soco fechado) já não aparece, porque a b1 saiu do modelo do projétil. O `sa0` (braços cruzados, enrolando) é ginga |
| **RABO-DE-ARRAIA** (`sDown`, chão) | PREP `sb0`, IMPACTO `sb1`, IMP2 `sb2`, fK `f1` | **sem mudança no especial**; só a rajada acima | `f1` e o Alt `sb1` são a mesma pose (mão no chão, perna varrendo). O `sb2` mantém o CAIO baixo, em negativa, enquanto o rival reage |
| **MEIA-LUA** (`sFwd`, aéreo) | PREP `sc0`, SUBIDA `jup`, IMPACTO `sc1`, QUEDA `land`, fK `f2` | **SUBIDA `sc0`** e **QUEDA `sb2`** (PREP, IMPACTO e fK ficam iguais) | O `jup` e o `land` são os quadros genéricos de pulo, com os punhos fechados em guarda. O `sc0` é o impulso da ginga com as mãos soltas. O `sb2` é a aterrissagem em negativa, com as mãos no chão, como o capoeirista sai de uma meia-lua. O `f2` (compasso com a mão no chão) fecha o arco: o mundo mostra o salto e o close mostra o calcanhar descendo |

Em código, para a Lyra:
- `caio: ['lk1', 'sweep', 'sb0']` em `RAJADA`;
- `'caio/sFwd': L({ ..., enc: { prep: 'sc0', subida: 'sc0', impacto: 'sc1', queda: 'sb2' } })`.

Nenhum quadro novo: todos já estão no atlas do CAIO.

**Risco:**
- o `sb0` aparece em b0 (Alt do grito) e em b3 do RABO-DE-ARRAIA. O `sc0` também aparece em b0 e em b3 da MEIA-LUA;
- com a página FILME, o b0 fica atrás do painel e só se vê o b3;
- sem a página, o quadro se repete com 20 ticks de distância. Aceitável.

**O que fica fora do filme e eu recomendo como próxima arte:** o `idle` e o `walk` do CAIO estão em guarda de boxe, punhos
fechados à frente do rosto. É o quadro mais visto do jogo e o que mais contraria a regra do gingado. Fica como pendência de
arte (folha f1 do CAIO), não do filme.

## 6. Eco da mestra [medido, `filme-eco.py`]

| | f0 | f1 | f2 | f3 | f4 | f5 | Respiração do idle (teto) |
|---|---|---|---|---|---|---|---|
| WEI | 30,3 | 49,5 | 40,5 | 28,8 | 34,0 | 56,2 | 9,7 |
| CAIO | 31,2 | 49,3 | 56,8 | 32,8 | 31,5 | 49,2 | 22,6 |
| MIN-JI | 60,9 | 57,9 | 50,0 | **12,3** | 40,6 | 43,4 | 9,2 |

Valores em % de XOR. Nas células cujo mínimo caiu na ponta da busca, refiz com a busca larga (escala de 0,40 a 1,04 e dx de
±160).

**Todas passam do teto da respiração.** A única perto é a `f3` da MIN-JI (1,3x o teto). Ela foi aceita pelo rosto (§2). A
regeração está pronta no §7, para o caso de o dono preferir trocar.

## 7. Prompt pronto (opcional, só se o dono quiser trocar a `f3` da MIN-JI)

Gerar uma célula sozinha, anexando **uma** imagem (`min-ji-mestra-v1.png`), em retrato 3:4, 2K. Salvar como
`arte-fonte/lutadores/min-ji/folhas/min-ji-filme-grito-v1.png`. Não é -v2 da folha: entra na página pelo montador, como
`f3`.

```
2D fighting game cinematic close-up, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors. Portrait image, aspect ratio 3:4. Exactly ONE figure, centered, bust framing: from the top of the head down to the waist, ending at a straight invisible horizontal line at the waist; below that line only the plain background. Leave plain background of at least 8% of the image around the figure; hair and hands never touch the border.
CHARACTER — MIN-JI: young Korean woman, taekwondo champion, about 22 years old, athletic and slim. Long straight black hair in a high ponytail tied with a red ribbon bow. White V-neck taekwondo dobok with black collar trim, black belt tied at the front, red fingerless sparring gloves. Same costume, face, hair, proportions and colors as the attached reference image; the pose is ONLY the one described here, never the pose of the reference image. Background color: solid flat pure green #00FF00.
POSE: battle cry before the finishing blow, body turned toward the viewer, head thrown slightly back, mouth wide open shouting, eyes blazing, one fist pulled back beside the hip and the other arm thrust down and back, ponytail whipping up behind her. NOT a fighting guard: no fists raised in front of the chest.
NO text, NO effects, NO glow, NO speed lines, no other people.
```

## 8. Arquivos

| Arquivo | O que é |
|---|---|
| `arte-fonte/lutadores/wei-long/filme/wei-long-filme-pagina-v1.{webp,png,json}` | Página FILME do WEI e o mapa |
| `arte-fonte/lutadores/caio/filme/caio-filme-pagina-v1.{webp,png,json}` | Página FILME do CAIO e o mapa |
| `arte-fonte/lutadores/caio/filme/caio-filme-v2-corte-reto-v1.png` | Intermediário: folha v2 com os cortes da linha 2 endireitados |
| `arte-fonte/lutadores/min-ji/filme/min-ji-filme-pagina-v1.{webp,png,json}` | Página FILME da MIN-JI e o mapa |
| `arte-fonte/ferramentas-curadoria/filme-endireitar-corte.py` | Novo: endireita o corte em curva ou diagonal |
| `arte-fonte/ferramentas-curadoria/filme-empacotar.mjs` | Novo: reempacota a página sem reamostrar (os grupos A e C também usam) |
| `arte-fonte/ferramentas-curadoria/filme-prova-bloco.mjs` | Novo: prova no jogo pelo bloco `filme`, para qualquer lutador, lados P1 e P2 |
| `arte-fonte/ferramentas-curadoria/filme-montar-pagina.mjs` | Ganhou o 4º argumento (`cortes`). Os grupos A e C mexeram no mesmo arquivo em paralelo (5º argumento `WC`) |

`arte-fonte/` é gitignored. Para entrar no jogo:
- copiar cada `<id>-filme-pagina-v1.webp` para `public/assets/lutadores/<id>/filme.webp`;
- acrescentar o bloco `filme` no `atlas.json` do lutador, com o `tamanho` e os quadros do `.json` sem o campo `p`, igual ao
  do HAYATO.
