# Curadoria técnica: folhas FILME do grupo A (CENTELLA, BAATAR, ZENON) v1

Apolo, 23/10/2026. Procedimento e ferramentas do piloto (`docs/curadoria-filme-hayato-v1.md`). O dono aprovou as três
folhas a olho. Nada foi gerado na Runway, nada foi commitado, nada mudou em `src/` nem em `public/`.

| Lutador | Folha curada | Fundo |
|---|---|---|
| CENTELLA | `arte-fonte/lutadores/centella/folhas/centella-filme-v2.png` (a aprovada; a v1 fica de lado) | magenta `253,20,250` |
| BAATAR | `arte-fonte/lutadores/baatar/folhas/baatar-filme-v1.png` | verde `2,251,3` |
| ZENON | `arte-fonte/lutadores/zenon/folhas/zenon-filme-v1.png` | verde `3,251,3` |

Marcação: **[medido]** = número tirado do arquivo ou do navegador; **[calculado]** = conta sobre números medidos;
**[a olho]** = julgamento visual.

## 0. Veredito

**As três APROVADAS para o jogo, sem regeração obrigatória e sem nenhuma -v2 de folha.** As três páginas estão montadas,
com o mapa dos quadros, e passaram na prova no jogo de verdade (página injetada como bloco `filme` do `atlas.json`).

| | CENTELLA | BAATAR | ZENON |
|---|---|---|---|
| Página [medido] | 1920 x 1280 | 2032 x 1248 | 1824 x 1280 |
| Memória decodificada [calculado] | 9,38 MiB | 9,67 MiB | 8,91 MiB |
| Download WebP q88 [medido] | 350 KB | 390 KB | 287 KB |
| Ampliação do close no painel [medido] | 1,019 a 1,061x | 1,053 a 1,061x | 1,019 a 1,021x |
| Ampliação do sprite do mundo no mesmo filme [medido] | 1,536x | 1,554x | 1,327x |
| Mexido por código | f4 espelhada (regra do §7) | f4: riscos tirados e corte reto refeito | nada |
| Ressalva aberta | – | f1: cordão nas mãos (folha v2 a gerar, §11) | ~~f3: aba do casaco cortada pela borda~~ resolvida na v2 (§10) |

O teto do critério do piloto (§6.3) é 1,1x. Todos os closes ficam abaixo e todos são melhores que o atlas ampliado: o
mundo desenha o lutador a 1,33-1,55x, o close a 1,02-1,06x, e a cabeça no close fica perto de 2x a do mundo [a olho, nas
capturas com e sem página].

As duas ressalvas abertas (§2) são opcionais. Para cada uma há prompt pronto de regeração de UMA célula (§7).

## 1. Medidas das folhas [medido, `filme-medir.mjs`]

Todas: 2400 x 1792, grade 3 x 2 separada (`separadas: true`), halo de 64-69% antes do despill e **0,00% depois**, magenta
ou verde interno = 0 a 16 px por figura (todos dentro da figura, nenhum visível na página: §4.3).

### 1.1 CENTELLA v2: 6 componentes, nenhum pequeno

| Célula | Pose | Caixa | Tamanho | Base |
|---|---|---|---|---|
| R1C1 → `f0` | PLANCHA, deitada no ar | 44,197 – 907,648 | 864 x 452 | natural (23 colunas) |
| R1C2 → `f1` | HURACANRANA, de cabeça para baixo | 905,55 – 1470,874 | 566 x 820 | natural (12) |
| R1C3 → `f2` | RESORTE, crossbody voando | 1469,235 – 2350,700 | 882 x 466 | natural (17) |
| R2C1 → `f3` | grito | 51,943 – 793,1681 | 743 x 739 | **corte reto, 316 colunas** |
| R2C2 → `f4` | rosto atingido | 832,980 – 1443,1681 | 612 x 702 | **corte reto, 423** |
| R2C3 → `f5` | lançada para trás | 1583,935 – 2348,1681 | 766 x 747 | **corte reto, 237** |

- A linha 1 é toda de corpo inteiro (o prompt pedia `full`): nenhuma base cortada, nada encosta na borda.
- "Bustos da R2 colados em baixo": **não colam** [medido]. As três cortam na MESMA linha, y = 1681, a 110 px da borda;
  são 3 componentes separados, com 39 px entre as caixas de R2C1 e R2C2. A linha é a base reta do quadro, como no HAYATO.
- As caixas de R1C1/R1C2/R1C3 se tocam (vão 0), mas as figuras são componentes separados: o recorte é por máscara.
- Máscara nas 6 [a olho].

### 1.2 BAATAR v1: 9 componentes = 6 figuras + 3 riscos

| Célula | Pose | Caixa | Tamanho | Base |
|---|---|---|---|---|
| R1C1 → `f0` | ARREMESSO, as mãos agarram | 73,67 – 888,825 | 816 x 759 | corte reto, 504 |
| R1C2 → `f1` | QUEBRA-BASE, gancho de bota | 883,92 – 1663,853 | 781 x 762 | natural (sola, 48) |
| R1C3 → `f2` | MERGULHO DA ÁGUIA | 1492,84 – 2347,791 | 856 x 708 | natural (13) |
| R2C1 → `f3` | grito | 32,919 – 861,1679 | 830 x 761 | corte reto, 478 |
| R2C2 → `f4` | rosto atingido | 884,941 – 1613,1678 | 730 x 738 | **ARCO**, só 66 colunas na base |
| R2C3 → `f5` | lançado para trás | 1604,881 – 2360,1767 | 757 x 887 | natural (veio de corpo inteiro; pedi três-quartos) |

- **R2C2, riscos de movimento:** 5 traços pretos atrás da cabeça (efeito proibido pelo prompt). 3 deles soltos (135 a
  272 px) e 2 colados no cabelo e na orelha.
- **R2C2, base em arco:** a IA fechou o busto numa curva (y = 1678 no meio, 1527 na ponta do ombro direito), não numa
  linha. No painel, que encosta a célula na base, sobrariam cantos de fundo embaixo.
- **R1C2, cordão nas mãos:** é o cordão do zodog (nas outras 5 células ele amarra o casaco no peito; aqui o peito está
  sem ele e o cordão está nas mãos), passando por dentro do punho de cima, por cima dos nós dos dedos da mão de baixo, e
  pendendo uns 40 px embaixo.
- R2C3 a 24 px da borda de baixo: não encosta.

### 1.3 ZENON v1: 6 componentes, nenhum pequeno; 2214 px de figura na borda

| Célula | Pose | Caixa | Tamanho | Base |
|---|---|---|---|---|
| R1C1 → `f0` | SELO, palmas juntas | 69,50 – 794,896 | 726 x 847 | corte reto em y = 895, 457 |
| R1C2 → `f1` | COLUNA DE ÔNIX, joelhada | 834,22 – 1477,896 | 644 x 875 | corte reto em y = 895 na canela, 99 (pedi `full`) |
| R1C3 → `f2` | TRIBUTO, palma no avanço | 1490,132 – 2367,896 | 878 x 765 | corte reto em y = 895, 218 |
| R2C1 → `f3` | DECRETO, costas da mão | 2,931 – 869,1789 | 868 x 859 | corte pela borda de baixo + **borda esquerda** |
| R2C2 → `f4` | rosto atingido | 816,948 – 1535,1789 | 720 x 842 | corte pela borda de baixo, 655 |
| R2C3 → `f5` | lançado para trás | 1526,932 – 2375,1789 | 850 x 858 | bota cortada pela borda de baixo, 72 |

- **R1, cortes perto da linha 2:** as três cortam na mesma linha y = 895 (anti-alias meio transparente, como no HAYATO);
  a linha 896 tem 5 px e a 897 está vazia; a R2 começa em y = 931. Vão de 36 px: componentes separados, nada se mistura.
- **R2C1 toca a borda esquerda:** colunas 0 a 2 opacas de y = 1536 a 1791 (256 px). É a aba do casaco que sai da imagem.
  Não há como completar por código. Ver §2.
- **R2C2, busto até a borda de baixo:** a borda da imagem funciona como linha de corte (sem anti-alias, 100% opaca). Igual a
  um busto cortado: ok.
- R2C3: a sola da bota da frente é cortada pela borda de baixo (72 colunas). No painel, encostada na base, lê como corte de
  quadro.

## 2. Veredito por célula

### CENTELLA

| Célula | Veredito | Notas |
|---|---|---|
| `f0` PLANCHA | **ok** | Deitada, braços e pernas abertos, máscara. Figura larga: a célula é limitada pela LARGURA do painel (§4.1) |
| `f1` HURACANRANA | **ok** | De cabeça para baixo, pernas em tesoura no alto. Lê como a chave de pescoço pedida |
| `f2` RESORTE | **ok** | Crossbody voando, braços à frente, trança para trás |
| `f3` grito | **ok** | Boca aberta, punhos no peito, diferente do idle (§3) |
| `f4` rosto atingido | **ok, ESPELHADA por código** | Veio com a cabeça para a DIREITA (rosto em três-quartos para a direita, cabeça deslocada para a frente; só a trança ia para a esquerda). Regra do §7 dos roteiros: espelhar por código. Na captura do P2 o rosto agora vira para LONGE do atacante, igual ao HAYATO [medido em `com-sFire-t43.png`] |
| `f5` lançada para trás | **ok** | Mesmo desenho do `f5` do HAYATO aprovado (cabeça no alto à direita, braços abertos) |

### BAATAR

| Célula | Veredito | Notas |
|---|---|---|
| `f0` ARREMESSO | **ok** | Mãos agarrando à frente, dentes à mostra |
| `f1` QUEBRA-BASE | **ok, com ressalva** | O cordão do zodog nas mãos. **Limpeza por código testada e reprovada** (3 tentativas, §6.2): sobra toco saindo do punho e remendo escuro na borda da mão, pior que o cordão. Fica como está: no painel o cordão tem ~7 px de largura e lê como "puxando o cordão do casaco" [a olho, `com-sDown-t33.png`]. Se o dono quiser sem o cordão: **REGERAR só esta célula** (prompt no §7.1) |
| `f2` MERGULHO | **ok** | Braços abertos como asas, mergulhando para a direita |
| `f3` grito | **ok** | Punhos no peito e boca aberta, contra a guarda de mãos abertas da mestra |
| `f4` rosto atingido | **ok, LIMPA por código** | Os 5 riscos saíram (abertura morfológica, §6.1). O arco da base virou corte reto em y = 1570. Sobram 2 tocos de 8 a 15 px colados no cabelo atrás da orelha, que leem como mecha [a olho] |
| `f5` lançado para trás | **ok** | Veio de corpo inteiro (pedi três-quartos): o §7 manda aceitar. Mesmo desenho do `f5` do HAYATO |

### ZENON

| Célula | Veredito | Notas |
|---|---|---|
| `f0` SELO (e SELO MAIOR) | **ok** | Palmas juntas no peito, olhar frio. Nada da palma estendida da guarda (o risco de eco do §5 dos roteiros não aconteceu) |
| `f1` COLUNA DE ÔNIX | **ok** | Joelho no peito, palma aberta no alto. Pedi `full` e veio cortado na canela pela linha y = 895: lê como três-quartos, corte de quadro |
| `f2` TRIBUTO | **ok** | Avanço baixo, palma aberta à direita, casaco para trás |
| `f3` DECRETO | **ok, com ressalva** | Costas da mão, sorriso de desprezo. A aba do casaco sai pela borda esquerda: no painel vira uma borda vertical reta de ~190 px de canvas, preto sobre o fundo escuro do painel (pouco contraste) [calculado: 256 px x 0,732 da montagem x 1,021 do painel]. Só aparece no DECRETO da fase 2. Opcional: **REGERAR só esta célula** (§7.2). **Resolvida: a `f3` da folha v2 entrou na `-pagina-v2` (§10)** |
| `f4` rosto atingido | **ok** | A cabeça vai para trás (topo para a esquerda, queixo para cima), o rosto em três-quartos para a direita. No painel do P2, o rosto fica virado para o atacante, mas a cabeça é jogada para longe: lê como golpe no rosto [a olho, `com-sFwd-t43.png`]. Não espelhar |
| `f5` lançado para trás | **ok** | É o pedido literal ("arching back toward the LEFT"): cabeça no alto à esquerda, pernas à direita, o contrário do `f5` do HAYATO. No painel, o corpo vai para longe do atacante. Não espelhar |

## 3. Eco da mestra (XOR contra a mestra reescalada) [medido, `filme-eco.py`]

Mesmo método do piloto: a mestra é recortada na figura, reescalada de 0,50 a 0,90, cortada na linha da célula e deslocada
±60 px. Vale o MENOR XOR (piso a favor do eco). A régua é a respiração do idle do atlas de cada um.

| | f0 | f1 | f2 | f3 | f4 | f5 | Respiração (teto) |
|---|---|---|---|---|---|---|---|
| CENTELLA | 50,0% | 61,3% | 61,9% | 34,6% | 35,4% | 47,5% | 17,9% |
| BAATAR | 22,5% | 47,8% | 60,1% | 15,1% | 28,1% | 42,8% | 6,0% |
| ZENON | 29,6% | 36,7% | 51,2% | 27,5% | 32,9% | 54,9% | 10,0% |

**Nenhum eco.** A mais perto da régua é o grito do BAATAR (15,1% contra 6,0% de respiração, 2,5x acima): é o único corpo
de frente com os braços na altura do peito, mas os punhos fechados e a boca aberta trocam a guarda de mãos abertas da
mestra [a olho, lado a lado].

Limite do método: em 9 das 18 células o melhor encaixe caiu na borda da busca (escala 0,50 ou 0,90, ou dx ±60), então o
mínimo verdadeiro pode estar fora dela. Todas essas 9 têm XOR de 29,6% ou mais, 1,7x acima da maior régua (17,9%). As
duas mais perto da régua (BAATAR `f3` 15,1% e `f0` 22,5%) caíram no meio da busca, então o número delas é o mínimo de fato.

## 4. Páginas FILME

### 4.1 Como foram montadas

Mesmo montador do piloto (`filme-montar-pagina.mjs`): `nucleo.mjs`, franja de 3 px, corte reto como última linha e as 4
últimas linhas copiadas da linha 5 px acima. Três ajustes:

1. **Réplica só nas células com corte reto** (4º argumento, o mesmo que o grupo B usa). Numa base natural (pé, sola,
   corpo no ar), copiar a linha de cima apagaria o contorno de baixo.
   - CENTELLA: `f3,f4,f5`;
   - BAATAR: `f0,f3,f4`;
   - ZENON: as 6.
2. **Largura máxima da célula, WC = 732** (5º argumento, novo). O painel do jogo de hoje limita a célula pela altura
   (335 x 0,96 = 321,6 lógicos = 643,2 px de canvas) **ou** pela largura útil (460 - tan 12° x 335 = 388,8 lógicos =
   777,6 px de canvas) [lido em `src/render/filme.ts:707-713`]. A PLANCHA e o RESORTE da CENTELLA são figuras deitadas.
   Só pela altura, sairiam com 1200 px de largura, a página teria 2864 px (14 MiB) e o painel as mostraria a 0,64x.
   Com WC = 732 elas saem a 777,6 / 732 = **1,06x**, a ampliação do piloto.
3. **Altura da célula, Hc:** 630 na CENTELLA e no ZENON. No BAATAR é **610**: as 6 células dele são largas (soma de
   4043 px a 630 de altura), e a página não cabe em 1920 em nenhuma arrumação de duas linhas sem passar do teto de 1,1x.
   A 610, a linha de cima tem 2032 px e a ampliação fica em 1,054x.

"Células iguais" passa a ser a mesma AMPLIAÇÃO NO PAINEL, não a mesma altura em pixel. As células de pé ficam com 630
(ou 610) de altura; as deitadas ficam com 732 de largura.

### 4.2 Mapas (`arte-fonte/lutadores/<id>/filme/<id>-filme-pagina-v1.json`)

Coordenadas em px da página. `ax` = metade da largura. `painel: true` em cada quadro.

| Quadro | CENTELLA x,y,w,h | BAATAR x,y,w,h | ZENON x,y,w,h |
|---|---|---|---|
| `f0` | 4,250,734,384 | 4,4,657,610 | 4,5,540,630 |
| `f1` | 742,4,435,630 | 665,4,626,610 | 548,4,465,631 |
| `f2` | 1181,247,733,387 | 1295,8,733,606 | 1017,4,724,631 |
| `f3` | 4,638,635,631 | 4,620,666,609 | 4,639,638,630 |
| `f4` | 643,639,550,630 | 674,619,706,610 | 646,639,538,630 |
| `f5` | 1197,638,648,631 | 1384,618,522,611 | 1188,639,624,630 |

Base opaca depois da réplica [medido]: CENTELLA f3/f4/f5 = 265/375/193 px; BAATAR f0/f3/f4 = 399/377/634; ZENON
f0-f5 = 335/68/174/269/482/49.

### 4.3 Limpeza da página [medido]

Pixel visível (alfa > 32) com cor da chave: **0** nas três. Pixel semitransparente com cor da chave: **0** nas três.

## 5. Prova no jogo de verdade [medido, `filme-prova-lutador.mjs`]

O bloco `filme` foi injetado no `atlas.json` por `page.route`, como a Vega instalaria (`validarFilme` + `carregarFilme`), e a
página foi servida como `filme.webp`. Lutas X x X pelo gancho `?filme=<id>:<golpe>`, com o filme andando tick a tick e um
espião no `drawImage` real. Sem erro de página, sem aviso de carga.

| Lutador / golpe (modelo) | Células desenhadas (tick de entrada) | Ampliação | Tela (px do canvas) |
|---|---|---|---|
| CENTELLA sFire PLANCHA (aereo) | f3 @0, f0 @27, f4 @37, f5 @47 | 1,019 / 1,059 / 1,021 / 1,019 | f0 777,6 x 406,8 |
| CENTELLA sDown HURACANRANA (agarrao) | f3 @0, f1 @15, f4 @37 | 1,019 / 1,021 / 1,021 | f1 444 x 643 |
| CENTELLA sFwd RESORTE (chao) | f3, f2 @27, f4, f5 | f2 1,061 | f2 777,6 x 410,5 |
| BAATAR sFire ARREMESSO (agarrao) | f3 @0, f0 @15, f4 @37 | 1,056 / 1,054 / 1,054 | f4 744 x 643 |
| BAATAR sDown QUEBRA-BASE (chao) | f3, f1 @27, f4, f5 @47 | 1,053 a 1,056 | f1 660 x 643 |
| BAATAR sFwd MERGULHO (aereo) | f3, f2 @27, f4, f5 | f2 1,061 | f2 777,6 x 642,9 |
| ZENON sFire SELO (projetil) | f0 @11, f4 @33, f5 @43 | 1,021 | f0 551 x 643 |
| ZENON sDown COLUNA (aereo) | f1 @27, f4 @37, f5 @47 | 1,019 / 1,021 | f1 474 x 643 |
| ZENON sFwd TRIBUTO (chao) | f2 @27, f4 @37, f5 @47 | 1,019 / 1,021 | f2 738 x 643 |

- O `f3` do ZENON (DECRETO) só entra no `chefe2/sFwd`, que o gancho não toca. Ele tem 638 x 630 e é limitado pela altura
  como os outros: **1,021x [calculado]**.
- O ZENON não usa o grito `f3` (o grito dele é a pose `cena1` do atlas): confere nas capturas.
- Os tetos de zoom do mundo (ZENON 1,10, BAATAR 1,25) não valem para o painel: o close sai igual ao dos outros. O sprite
  do mundo do ZENON vai a 1,33x e o close a 1,02x.
- Capturas com e sem página, nos mesmos ticks:
  `<scratchpad da sessão>/prova/<id>/{com,sem}-<golpe>-t<tick>.png`
  (pasta temporária da sessão).

## 6. O que foi mexido por código (a folha original nunca foi tocada)

### 6.1 BAATAR `f4`: riscos e corte reto (`filme-limpar-baatar.py` → `baatar/filme/baatar-filme-limpa-v1.png`)

- **Riscos:** abertura morfológica 15 x 15 calculada numa janela folgada (x 1100-1400, y 930-1140) e aplicada só à
  direita da cabeça (x 1186-1345, y 966-1102). O traço fino sai; o cabelo, a orelha e o pescoço ficam, porque são
  grossos. 2 px de franja devolvidos ao corpo. Saíram 1637 px; o `filme-medir` da folha limpa dá 6 componentes e
  nenhum pequeno.
- **Corte reto em y = 1570:** apaga a R2C2 abaixo dessa linha (faixa x 870-1600, que não toca R2C1, x1 = 861, nem
  R2C3, x0 = 1604).
  - A linha cobre x 886-1537: o corpo inteiro menos a ponta do ombro direito, que sobe 43 px em 76 px.
  - A figura fica com 630 px de altura e não é ampliada na montagem (escala 0,968).
- O nome fica em `filme/` de propósito: o pipeline procura o maior `-vN` só em `folhas/`.

### 6.2 BAATAR `f1`: cordão (REPROVADO por código)

Três tentativas, todas olhadas a 4x:
1. corredor fixo pintado de fundo;
2. abertura 13 no corredor do cordão;
3. abertura 21 mais o contorno refeito na borda nova.

Em todas sobrou um toco de cordão saindo do punho de cima e um remendo escuro e quadrado na borda da mão de baixo.
O cordão passa POR CIMA dos nós dos dedos e por dentro do punho, e por baixo dele não há desenho para recuperar. Ficou
fora da limpeza. O script registra o motivo.

### 6.3 CENTELLA `f4`: espelhada (`filme-espelhar-celula.mjs`)

Só o retângulo do quadro é espelhado, na página já montada; x, y, w, h e ax não mudam. O espelho é um arquivo novo, sem
retocar a arte (a regra do §7 diz que editar cria artefato). A máscara é simétrica e a trança sai da nuca: nada fica do
lado errado [a olho].

## 7. Prompts de regeração de UMA célula (opcionais; 1 referência = a mestra)

Use só se o dono pedir. Cada um sai como imagem avulsa, de uma figura. **Salvar em `filme/`, NUNCA em `folhas/`**: um
`<id>-filme-...-vN.png` em `folhas/` entraria na busca do maior `vN`. Para entrar na página, o montador precisa aceitar
uma célula avulsa no lugar de uma da grade. Hoje ele só lê a grade 3 x 2, então isso é um ajuste a fazer, não pronto.

### 7.1 BAATAR `f1` (QUEBRA-BASE sem o cordão)

- **Anexar (UMA imagem):** `baatar-mestra-v1.png`
- **Formato:** quadrado 1:1, 2K
- **Salvar como:** `arte-fonte/lutadores/baatar/filme/baatar-filme-celula-f1-v1.png`

```
2D fighting game cinematic close-up, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Square image, aspect ratio 1:1.
Exactly ONE figure of the character, "full" framing: the whole body from head to feet, as large as the image allows. The character faces RIGHT.
IMPORTANT SPACING: leave an empty band of plain background of at least 8% of the image size on all four sides. Hair, hands, fingers and boots NEVER touch the image border. Nothing is cut off.
Strong dramatic expression and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props. BOTH HANDS ARE EMPTY: no rope, no cord, no string, no belt, nothing held in the hands.

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold, with its thin gold cord tied across the chest exactly as in the reference; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Same costume, face, hair, proportions and colors as the attached reference image; the pose is ONLY the one described below, never the pose of the reference image. Background color: solid flat pure green #00FF00.

POSE: full: leaning in low, one boot hooking low at ankle height to the right, both arms pulling back with EMPTY clenched fists, as if yanking an opponent off balance, teeth gritted.
```

### 7.2 ZENON `f3` (DECRETO com o casaco inteiro dentro da imagem)

- **Anexar (UMA imagem):** `zenon-mestra-v1.png`
- **Formato:** quadrado 1:1, 2K
- **Salvar como:** `arte-fonte/lutadores/zenon/filme/zenon-filme-celula-f3-v1.png`

```
2D fighting game cinematic close-up, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Square image, aspect ratio 1:1.
Exactly ONE figure of the character, "three-quarter" framing: from the top of the head down to the knees, ending at a straight invisible horizontal line at the knees; below that line there is only the plain background. The character faces RIGHT.
IMPORTANT SPACING: leave an empty band of plain background of at least 8% of the image size at the top, the left and the right. The WHOLE long coat, including its flying tail, stays INSIDE the image, surrounded by plain background; hair, hands and coat NEVER touch the left, right or top border. Nothing is cut off except at the knee line.
Strong dramatic expression and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — ZENON ARGYROS: Greek pankration master, about 61 years old, very tall, long legs, broad straight shoulders, lean powerful build. Shaved head, short neatly trimmed silver beard, sharp nose, pale gray eyes, a thin old scar through the left eyebrow. A long black tailored coat reaching below the knees, worn open, long sleeves, tall stiff stand-up collar, deep tyrian purple inner lining, one thin plain gold trim along the edges and cuffs; a fitted sleeveless black tunic closed at the chest by one round gold clasp; dark charcoal trousers; black leather boots. Both hands and wrists wrapped in long brown leather thongs, and a heavy gold signet ring on the RIGHT hand. The coat always has its sleeves on his arms: it is never a cape. Same costume, face, hair, proportions and colors as the attached reference image; the pose is ONLY the one described below, never the pose of the reference image. Background color: solid flat pure green #00FF00.

POSE: three-quarter: back-hand strike, body twisted, the arm nearest the viewer swung out to the right with the back of the hand leading, contemptuous smile, the coat tail swinging behind him but fully inside the image.
```

## 8. Para entrar no jogo

### 8.1 Vega (instalação: só dados, nenhum código)

Para cada lutador, os dois passos abaixo. Nenhuma linha de `src/` muda (`project_folha_filme_loader`).

1. Copiar `arte-fonte/lutadores/<id>/filme/<id>-filme-pagina-v1.webp` para `public/assets/lutadores/<id>/filme.webp`.
2. Acrescentar ao `public/assets/lutadores/<id>/atlas.json` o bloco `filme`. É o `.json` ao lado, sem o campo `p` dos
   quadros (o validador usa 1 página). Os blocos prontos:

```json
"filme": {"imagem": "filme.webp", "tamanho": [1920, 1280], "quadros": {"f0": {"x": 4, "y": 250, "w": 734, "h": 384, "ax": 367, "painel": true}, "f1": {"x": 742, "y": 4, "w": 435, "h": 630, "ax": 218, "painel": true}, "f2": {"x": 1181, "y": 247, "w": 733, "h": 387, "ax": 367, "painel": true}, "f3": {"x": 4, "y": 638, "w": 635, "h": 631, "ax": 318, "painel": true}, "f4": {"x": 643, "y": 639, "w": 550, "h": 630, "ax": 275, "painel": true}, "f5": {"x": 1197, "y": 638, "w": 648, "h": 631, "ax": 324, "painel": true}}}
```
(CENTELLA)

```json
"filme": {"imagem": "filme.webp", "tamanho": [2032, 1248], "quadros": {"f0": {"x": 4, "y": 4, "w": 657, "h": 610, "ax": 329, "painel": true}, "f1": {"x": 665, "y": 4, "w": 626, "h": 610, "ax": 313, "painel": true}, "f2": {"x": 1295, "y": 8, "w": 733, "h": 606, "ax": 367, "painel": true}, "f3": {"x": 4, "y": 620, "w": 666, "h": 609, "ax": 333, "painel": true}, "f4": {"x": 674, "y": 619, "w": 706, "h": 610, "ax": 353, "painel": true}, "f5": {"x": 1384, "y": 618, "w": 522, "h": 611, "ax": 261, "painel": true}}}
```
(BAATAR, v1: **superado**. Instalar a `baatar-filme-pagina-v2.*` com o bloco do §12.4)

```json
"filme": {"imagem": "filme.webp", "tamanho": [1824, 1280], "quadros": {"f0": {"x": 4, "y": 5, "w": 540, "h": 630, "ax": 270, "painel": true}, "f1": {"x": 548, "y": 4, "w": 465, "h": 631, "ax": 233, "painel": true}, "f2": {"x": 1017, "y": 4, "w": 724, "h": 631, "ax": 362, "painel": true}, "f3": {"x": 4, "y": 639, "w": 638, "h": 630, "ax": 319, "painel": true}, "f4": {"x": 646, "y": 639, "w": 538, "h": 630, "ax": 269, "painel": true}, "f5": {"x": 1188, "y": 639, "w": 624, "h": 630, "ax": 312, "painel": true}}}
```
(ZENON, v1: **superado**. Instalar a `zenon-filme-pagina-v2.*` com o bloco do §10.4)

Memória por luta [calculado]: 2 páginas de 8,9 a 9,7 MiB (máximo 19,3 MiB, BAATAR x BAATAR). A largura do BAATAR é 2032,
não 1920. Fica dentro do limite de 2048 de textura.

### 8.2 Lyra (painel): 1 sugestão nova, não bloqueia

**Célula deitada encostada na base.** A PLANCHA e o RESORTE da CENTELLA têm 384-387 px de altura num painel de 643: a
figura fica no terço de baixo e o terço de cima mostra o fundo com o fantasma do mundo [a olho, `com-sFire-t33.png`].
Proposta: célula com `h * k` menor que 70% da altura do painel se centra na vertical em vez de encostar na base. A
célula com corte reto continua encostada (o corte tem que tocar a base). Dá para decidir pela proporção, sem campo novo
no JSON: toda célula com corte reto é limitada pela altura.

## 9. Ferramentas (`arte-fonte/ferramentas-curadoria/`, gitignored)

| Arquivo | O que mudou |
|---|---|
| `filme-medir.mjs` | Nada |
| `filme-eco.py` | Parametrizado: `python filme-eco.py <dirMedidas> [lutador] [folha]`. Detecta o fundo da mestra e lê o idle em qualquer página do atlas (o ZENON tem o `idle0` na página 1). O HAYATO roda igual |
| `filme-montar-pagina.mjs` | 5º argumento opcional `WC` (largura máxima da célula); `-` aceito no 4º. Sem eles, o HAYATO sai igual. O 4º argumento (réplica só nas células cortadas) foi posto pelo grupo B ao mesmo tempo |
| `filme-limpar-baatar.py` | Novo: §6.1 |
| `filme-espelhar-celula.mjs` | Novo: espelha células na página montada, no lugar (`node … <dirPagina> f4[,f5]`) |
| `filme-prova-lutador.mjs` | Novo: a prova do piloto generalizada. Usa o bloco `filme` real (sem o `p: 2` de antes), anda tick a tick, resume por célula e captura nos mesmos ticks com e sem página (`node … <id> <dirPagina> <dirSaida> com|sem`) |

## 10. ZENON v2: a `f3` (DECRETO) com o casaco inteiro

Apolo, 23/10/2026. O dono aprovou `arte-fonte/lutadores/zenon/folhas/zenon-filme-v2.png` (2400 x 1792, verde `2,250,3`),
gerada com a v1 como única referência e só a R2C1 nomeada como WRONG (a aba do casaco cortada pela borda esquerda). Entra
**só a `f3`**; as outras 5 continuam as da v1. Nada em `src/` ou `public/`; nada instalado.

### 10.1 Medidas da folha v2 [medido, `filme-medir.mjs`]

- 6 componentes, 6 figuras separadas, verde interno 0 nas 6, halo 69,2% → 0% depois do despill.
- **R2C1 (`f3`)**: caixa `[78,930-869,1789]`, 792 x 860. **Folga esquerda 78 px** (era 2: as colunas 0 a 2 opacas por 256 px
  na v1). Embaixo a borda da imagem continua sendo a linha de corte, como na v1 e na R2C2/R2C3 (264 colunas na base, em
  dois trechos: as duas pernas). A caixa invade a da R2C2 (x 818), mas os pixels não se tocam.
- As outras 5 células da v2 são as da v1 a ±2 px de caixa.

### 10.2 Veredito da `f3` nova [a olho, salvo indicação]

| Item | Resultado |
|---|---|
| Pose | Costas três-quartos para o observador, tronco torcido para a direita, braço da frente esticado na altura do ombro com o punho fechado e o anel de sinete à mostra, a outra mão atrás do quadril, queixo erguido, meio sorriso de desprezo. Lê mais como soco reto que como "costas da mão": aceito, o dono aprovou a folha |
| Casaco | Inteiro dentro da imagem, a barra dourada fecha a aba embaixo à esquerda; nenhuma borda reta vertical [medido: 10 px opacos na 1ª coluna da célula da página, contra 256 px de borda reta na v1] |
| Identidade | Mesmo rosto, cicatriz, barba, gola alta com forro púrpura, faixas de couro, anel na mão direita |
| Limpeza | Sem efeito, sem risco, sem linha desenhada na base, verde interno 0 [medido] |
| Eco da mestra | XOR **31,1%** [medido, `filme-eco.py`] contra respiração de 10,0%: **não ecoa** (o encaixe caiu na borda da busca, dx −60; o mínimo de fato pode ser menor, mas está 3x acima da régua) |
| Veredito | **ok** |

### 10.3 Como foi montada

O ZENON não tinha folha limpa (a v1 foi montada direto da folha), então a base é a própria `folhas/zenon-filme-v1.png`.

1. `filme-trocar-celula.mjs folhas/zenon-filme-v1.png folhas/zenon-filme-v2.png filme/zenon-filme-limpa-v1.png f3` (arquivo
   novo): apagados 356.930 px da figura antiga, colados 322.894 da nova, **0 pixel em conflito** com outra figura [medido].
   Remedida: R2C1 igual à da v2; as outras 5 com as mesmas caixas e áreas da v1.
2. `filme-montar-pagina.mjs filme/zenon-filme-limpa-v1.png <dir> 630 f0,f1,f2,f3,f4,f5` (réplica nas 6, como na v1):
   `f3` 581 x 631, escala 0,731, base opaca 185 px; as outras 5 saem com o mesmo tamanho da v1.
3. `filme-empacotar.mjs`: linhas `f0,f1,f2 / f3,f4,f5` → **1760 x 1280** (era 1824: a `f3` nova é 57 px mais estreita).
4. Despill final: dispensado [medido: 0 pixel com cor da chave, visível ou semitransparente, na página inteira].

### 10.4 Orçamento e mapa [medido]

| | Valor | Teto |
|---|---|---|
| Página | 1760 x 1280 | 2048 x 1280 |
| Memória decodificada | 8,59 MiB | ~10 MiB |
| WebP (q88, alfa 100) | 286.908 bytes = 0,27 MiB | 0,8 MiB |
| `f3` no painel | w/h 0,921 < 1,209 → limitada pela altura: 643,2 / 631 = **1,019x** [calculado] | 1,1x |

Mapa (`zenon-filme-pagina-v2.json`, `painel: true` em todos, `p: 0` a tirar no `atlas.json`). Só `f3`, `f4` e `f5` mudaram
de x/y; `f0`, `f1` e `f2` são os da v1.

| Quadro | x,y,w,h | ax |
|---|---|---|
| `f0` | 4,5,540,630 | 270 |
| `f1` | 548,4,465,631 | 233 |
| `f2` | 1017,4,724,631 | 362 |
| `f3` | 4,639,581,631 | 291 |
| `f4` | 589,640,538,630 | 269 |
| `f5` | 1131,640,624,630 | 312 |

```json
"filme": {"imagem": "filme.webp", "tamanho": [1760, 1280], "quadros": {"f0": {"x": 4, "y": 5, "w": 540, "h": 630, "ax": 270, "painel": true}, "f1": {"x": 548, "y": 4, "w": 465, "h": 631, "ax": 233, "painel": true}, "f2": {"x": 1017, "y": 4, "w": 724, "h": 631, "ax": 362, "painel": true}, "f3": {"x": 4, "y": 639, "w": 581, "h": 631, "ax": 291, "painel": true}, "f4": {"x": 589, "y": 640, "w": 538, "h": 630, "ax": 269, "painel": true}, "f5": {"x": 1131, "y": 640, "w": 624, "h": 630, "ax": 312, "painel": true}}}
```

**Falta** a prova no painel: a `f3` só entra no `chefe2/sFwd` (fase 2), que o gancho `?filme=` não toca, e outra equipe está
com o e2e no ar. As outras 5 células são as da v1 [medido, página v1 x v2 por célula: mesmo
tamanho, 21 a 47 bytes diferentes em 1 a 1,4 milhão, franja de alfa pela estimativa do fundo]; só `f4` e `f5` mudaram de
posição na página.

**Armadilha do maior `vN`:** agora existe `folhas/zenon-filme-v2.png`. Quem instalar parte da `filme/zenon-filme-pagina-v2.*`;
nunca remontar da folha v2 sozinha (as outras 5 dela não foram curadas).

| Arquivo novo | O que é |
|---|---|
| `arte-fonte/lutadores/zenon/filme/zenon-filme-limpa-v1.png` | Folha v1 + `f3` da folha v2 |
| `arte-fonte/lutadores/zenon/filme/zenon-filme-pagina-v2.{png,webp,json}` | Página FILME com 6 células e mapa |

## 11. BAATAR `f1` sem o cordão: folha v2 a gerar

Mesmo molde da AMINU v2 e da ZENON v2: regerar a FOLHA inteira com `baatar-filme-v1.png` como única referência e a R1C2
nomeada WRONG (o cordão desamarrado nas mãos). O prompt substitui o de célula avulsa do §7.1. Salvar como
`folhas/baatar-filme-v2.png`. Depois de aprovada: `filme-trocar-celula.mjs filme/baatar-filme-limpa-v1.png
folhas/baatar-filme-v2.png filme/baatar-filme-limpa-v2.png f1` (a base é a LIMPA, que já tem a `f4` sem os riscos), montar
com os argumentos da v1 (Hc 610, réplica `f0,f3,f4`, conferir o WC da `f2`) e gravar `baatar-filme-pagina-v2.*`.

## 12. BAATAR v2: a `f1` (QUEBRA-BASE) com o cordão amarrado

Apolo, 23/10/2026. O dono aprovou `arte-fonte/lutadores/baatar/folhas/baatar-filme-v2.png` (2400 x 1792, verde `3,251,4`),
gerada pelo §11. Entra **só a `f1`**; as outras 5 continuam as da limpa v1 (com a `f4` sem os riscos do §6.1). Nada em
`src/` ou `public/`; nada instalado.

### 12.1 Medidas da folha v2 [medido, `filme-medir.mjs`]

- 6 componentes, 6 figuras separadas, halo 74,1% → 0% depois do despill. A v2 não tem os 3 riscos soltos da v1 (9 → 6
  componentes), mas só a `f1` é aproveitada.
- **R1C2 (`f1`)**: caixa `[921,88-1665,854]`, 745 x 767, área 287.283, verde interno 0. Era `[883,92-1663,853]`, 781 x 762:
  os 38 px a menos à esquerda são o cordão que pendia do punho. Corpo inteiro, base natural (botas), sem corte reto.

### 12.2 Veredito da `f1` nova

| Item | Resultado |
|---|---|
| Pose | Base baixa e larga, bota da direita enganchando na altura do tornozelo, um punho fechado à frente na altura do ombro e o outro puxado para baixo, dentes cerrados [a olho]. Mesma leitura de "puxar para desequilibrar" |
| Cordão | Fino, dourado, amarrado de um lado a outro do peito, como na mestra [a olho, ampliado 2x]. Não toca as mãos |
| Mãos | Os dois punhos vazios: nada de corda, fio ou toco saindo do punho [a olho, ampliado 2x] |
| Identidade | Mesmo rosto, bigode, têmporas grisalhas, zodog vermelho com barra dourada, shuudag azul, gutal com ornamento |
| Limpeza | 0 px com verde dominante (G − máx(R,B) > 40, alfa > 8) na célula, no PNG e no WebP [medido] |
| Eco da mestra | XOR **49,8%** [medido, `filme-eco.py`] contra a respiração de 6,0%: **não ecoa** (a v1 dava 47,8%; o encaixe caiu na borda da busca, dx −60, então o mínimo de fato pode ser menor, mas está 8x acima da régua) |
| Veredito | **ok** |

### 12.3 Como foi montada

1. `filme-trocar-celula.mjs filme/baatar-filme-limpa-v1.png folhas/baatar-filme-v2.png filme/baatar-filme-limpa-v2.png f1`
   (arquivo novo): apagados 283.592 px da figura antiga, colados 308.424 da nova, **0 pixel em conflito** com outra figura
   [medido]. Remedida: 6 componentes separados, R1C2 igual à da v2, as outras 5 com as mesmas caixas e áreas da limpa v1.
2. **WC conferido:** a v1 foi montada com `610 f0,f3,f4 732`. Remontar a limpa v1 com esses argumentos reproduz o mapa da v1
   inteiro; sem o WC, a `f2` sai com 737 x 611 e o mapa não bate [medido].
3. `filme-montar-pagina.mjs filme/baatar-filme-limpa-v2.png <dir> 610 f0,f3,f4 732`: `f1` 593 x 610, escala 0,795, base
   natural (0 réplicas). As outras 5 saem com o mesmo tamanho da v1.
4. Ordem das linhas: a do montador (`f0,f1,f2 / f3,f4,f5`), **2000 x 1248**. O `filme-empacotar.mjs` acha 1984 x 1248
   (`f0,f1,f4 / f2,f3,f5`), mas para ganhar 16 px ele mexeria em 5 quadros do mapa. Mantida a ordem da v1: no mapa, só
   mudam o `w`/`ax` da `f1` e o `x` da `f2`.
5. Despill final: dispensado (ver o item Limpeza acima).

As 5 células que não foram trocadas estão **idênticas byte a byte** às da página v1 (0 byte diferente em cada uma) [medido].
Neste caso dá para dizer "pixel a pixel", porque a base da troca foi a mesma limpa v1 que montou a página v1.

### 12.4 Orçamento e mapa [medido]

| | Valor | Teto |
|---|---|---|
| Página | 2000 x 1248 (era 2032) | 2048 x 1280 |
| Memória decodificada | 9,52 MiB | ~10 MiB |
| WebP (q88, alfa 100) | 393.844 bytes = 0,38 MiB | 0,8 MiB |
| `f1` no painel | w/h 0,972 < 1,209 → limitada pela altura: 643,2 / 610 = **1,054x** [calculado] | 1,1x |
| `f2` no painel | w/h 1,210 > 1,209 → limitada pela largura: 777,6 / 733 = **1,061x** [calculado, igual à v1] | 1,1x |

Mapa (`baatar-filme-pagina-v2.json`, `painel: true` em todos, `p: 0` a tirar no `atlas.json`):

| Quadro | x,y,w,h | ax |
|---|---|---|
| `f0` | 4,4,657,610 | 329 |
| `f1` | 665,4,593,610 | 297 |
| `f2` | 1262,8,733,606 | 367 |
| `f3` | 4,620,666,609 | 333 |
| `f4` | 674,619,706,610 | 353 |
| `f5` | 1384,618,522,611 | 261 |

```json
"filme": {"imagem": "filme.webp", "tamanho": [2000, 1248], "quadros": {"f0": {"x": 4, "y": 4, "w": 657, "h": 610, "ax": 329, "painel": true}, "f1": {"x": 665, "y": 4, "w": 593, "h": 610, "ax": 297, "painel": true}, "f2": {"x": 1262, "y": 8, "w": 733, "h": 606, "ax": 367, "painel": true}, "f3": {"x": 4, "y": 620, "w": 666, "h": 609, "ax": 333, "painel": true}, "f4": {"x": 674, "y": 619, "w": 706, "h": 610, "ax": 353, "painel": true}, "f5": {"x": 1384, "y": 618, "w": 522, "h": 611, "ax": 261, "painel": true}}}
```

**Falta** a prova no painel (`filme-prova-lutador.mjs baatar`, golpe `sDown`, onde a `f1` entra no tick 27): outra equipe está
com o e2e no ar, então nada foi servido.

**Armadilha do maior `vN`:** agora existe `folhas/baatar-filme-v2.png`. Quem instalar parte da `filme/baatar-filme-pagina-v2.*`.
Nunca remontar só da folha v2: a `f4` dela não tem o corte reto em y = 1570 do §6.1, e as outras 4 não foram curadas.

| Arquivo novo | O que é |
|---|---|
| `arte-fonte/lutadores/baatar/filme/baatar-filme-limpa-v2.png` | Limpa v1 + a `f1` da folha v2 |
| `arte-fonte/lutadores/baatar/filme/baatar-filme-pagina-v2.{png,webp,json}` | Página FILME com 6 células e mapa |
