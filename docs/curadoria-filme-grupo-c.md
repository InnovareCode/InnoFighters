# Curadoria técnica: folhas FILME do grupo C (CAMILLE, AMINU, NILA) v1

Apolo, 23/10/2026. Folhas: `arte-fonte/lutadores/<id>/folhas/<id>-filme-v1.png` (2400 x 1792, fundo verde nas três). O dono
aprovou as folhas a olho. Procedimento e ferramentas do piloto (`docs/curadoria-filme-hayato-v1.md`). Nada foi gerado na
Runway, nada foi commitado, nada em `src/` ou `public/`.

Marcação: **[medido]** = número do arquivo ou do navegador; **[calculado]** = conta sobre medidas; **[a olho]** = julgamento visual.

## 0. Veredito

| Lutador | Veredito | Página | Memória | WebP | Ampliação no painel [medido] |
|---|---|---|---|---|---|
| CAMILLE | **APROVADA**, com limpeza por código (a linha preta da R2) | 1616 x 1280 | 7,89 MiB | 241 KB | 1,019 a 1,021x |
| AMINU | **APROVADA COM 1 CÉLULA FORA E 1 PALIATIVO**: `f2` ecoa a mestra e sai da página; `f4` com o braço cortado na vertical, esmaecido | 1712 x 1280 | 8,36 MiB | 274 KB | 1,021x |
| NILA | **APROVADA**, sem limpeza | 1920 x 1216 | 8,91 MiB | 329 KB | 1,070 a 1,080x |

Teto do piloto: 1,1x. Todos os closes foram medidos no `drawImage` real do jogo, com a página injetada como bloco `filme` do
`atlas.json` (contrato do loader de hoje), sem gravar nada em `public/`. Zero erro de página.

Nenhuma `-v2` da folha original foi criada em `folhas/` (armadilha do maior `vN`). As folhas limpas são arquivos novos em
`filme/` com outro nome (`<id>-filme-limpa-v1.png`).

## 1. Medidas das folhas [medido, `filme-medir.mjs`]

| | CAMILLE (bruta → limpa) | AMINU (bruta → limpa) | NILA |
|---|---|---|---|
| Fundo | 3,252,4 | 5,251,4 | 4,253,3 |
| Halo antes → depois do despill | 64,5% → 0,00% | 64,6% → 0,00% | 66,8% → 0,00% |
| Componentes | 6 → 6 | 7 → 6 (o 7º era um risco de 62 px) | 6 |
| Grade 3 x 2 separada | sim | sim | sim |
| Ruído na borda | 4 px | 2338 px = a R2 encosta na borda de baixo (é o corte) | 0 |

**Cortes por célula** (base reta = corte de busto/três-quartos; o resto tem de ser contorno natural):

| Célula | CAMILLE | AMINU | NILA |
|---|---|---|---|
| R1C1 `f0` | corpo inteiro, sem corte | busto, corte em y 896 (450 col) | busto, corte em y 781 (370 col) |
| R1C2 `f1` | corpo inteiro | busto, corte 896 (449 col) | três-quartos, corte 766 (2 pernas) |
| R1C3 `f2` | corpo inteiro | três-quartos, corte 896 (2 pernas) | corpo inteiro (rente ao chão) |
| R2C1 `f3` | busto, corte 1735 (depois da limpeza) | busto, corte na borda da imagem | corpo inteiro (salto) |
| R2C2 `f4` | busto, corte 1735 | busto, corte na borda **e corte VERTICAL em x 881** (braço de trás, 178 linhas) | busto, corte 1685 |
| R2C3 `f5` | três-quartos, corte 1735 | três-quartos, corte na borda | três-quartos, corte 1678 |

Corte vertical procurado por script (corridas de borda opaco/fundo com 40+ px na mesma coluna): **só a AMINU R2C2** tem um.
As outras corridas de 40 a 57 px são contorno natural (palma, perna) [a olho].

**Bordas:** nada encosta na borda, fora a base da R2 da AMINU (que é o corte). Menores folgas: AMINU R2C3 24 px (mão), NILA
R1C3 24 px (pé), NILA R1C1 32 px (punho). As caixas da AMINU R1 e da NILA R1C1/R1C2 se sobrepõem, mas as figuras são
componentes separados: o recorte é por máscara e não pega o vizinho.

**NILA, os cortes à direita das R1C1 e R1C3 (pedido do Atlas):** conferidos com zoom. Na R1C1 o dedo estendido termina inteiro
(unha e contorno) e o corte do quadril acaba em x 525, com a trança passando à direita SEM ser cortada. A R1C3 é corpo inteiro:
o pé da frente termina inteiro, a 24 px da borda. **Nada cortado** [a olho, zoom 4x].

**AMINU, vão entre as linhas:** 54 px (3% da altura; o prompt pedia 8%). Não importa: o recorte é por componente e a grade
saiu separada.

**Verde interno:** de 0 a 16 px por célula depois do despill (CAMILLE 57, NILA 57 px no total, AMINU 0), pixels isolados na
ponta do cabelo. Zerados na página final (`g = max(r, b)` só nesses pixels).

## 2. Limpezas por código (`arte-fonte/ferramentas-curadoria/filme-limpar-grupo-c.py`)

### 2.1 CAMILLE: a linha preta da R2 [medido]

A IA desenhou uma linha preta horizontal de 4 px (linhas 1736 a 1738, com anti-alias até 1740) por baixo dos 3 bustos. Ela
passa além das figuras (R2C1 de x 50 a 743) e fazia parte do componente de cada busto.

- A faixa 1736-1740 vira fundo em toda a largura (o script confere que não há figura abaixo dela).
- O anti-alias de cima (linhas 1734-1735) vira fundo só onde a linha de cima já é fundo, ou seja, fora das figuras.
- A base das 3 figuras passa a ser a linha 1735, com a cor do corpo até o corte, igual ao HAYATO. O montador replica a linha
  opaca: base opaca de 226, 383 e 158 px.

### 2.2 AMINU: os riscos de movimento no cabelo da R2C2 [medido]

- **Riscos sobre o verde:** o contorno natural do cabelo foi medido na grade de 10 px (8 pontos, de y 966 a 1044). Tudo à
  esquerda dele vira fundo, com 1 px de meio-tom na emenda. Foram tirados 2438 px, entre eles o componente solto de 62 px.
- **2 riscos que cruzam a orelha** (linhas 1073-1083): cada coluna de x 1196 a 1224 é interpolada na vertical entre as linhas
  limpas 1071 e 1085. Isso preserva o contorno vertical da orelha.
- Resultado: a cabeça lê como cabeça raspada, sem fiapos [a olho, zoom 4x e captura no painel].

### 2.3 AMINU: o braço cortado na vertical (R2C2) → paliativo na página

O braço de trás termina numa reta vertical em x 881, por 178 linhas. A IA cortou na borda da célula dela, e isso não se
redesenha. **Paliativo:** o alfa das 30 primeiras colunas da célula `f4` na página cai em rampa até 0 (`filme-celulas.mjs
"f4:e30"`). O braço some no fundo do painel em vez de terminar numa reta.

**Armadilha medida:** a primeira tentativa esmaeceu na FOLHA, misturando a pele com o verde. O despill não desfaz a mistura:
os pixels ficaram cor de oliva e apareceu um **fio verde-amarelo** no painel (captura `aminu-com-sFire-t38`). Esmaecer só no
alfa, na página, resolve. A correção de verdade é regerar a célula (§6).

## 3. Veredito por célula [a olho, salvo indicação]

### CAMILLE (fundo verde; ordem da tabela §3.2: f0 FOUETTÉ, f1 COUP D'ARRÊT, f2 REVERS)

| Célula | Veredito | Notas |
|---|---|---|
| `f0` | ok | Chute alto com a ponta do sapato, perna de apoio reta, tronco ereto. Corpo inteiro, como pedido |
| `f1` | ok | Chute baixo com a sola, luvas altas |
| `f2` | ok | Chute giratório, de costas para o espectador, calcanhar à frente |
| `f3` | ok | Grito com os punhos no peito. Eco de 23,2%, acima da respiração (até 19,6%), mas é o mais perto do idle |
| `f4` | ok | Cabelo voando para a esquerda, olhos fechados, dentes cerrados |
| `f5` | ok | Corpo arqueando para a esquerda, braços abertos |

**Ressalva de enquadramento (não reprova):** as 3 células de golpe são de CORPO INTEIRO, porque o prompt pede "full" (o golpe é
a perna). No painel, a cabeça sai com ~104 px contra ~90 px do sprite do mundo [a olho, `camille-sem/com-sResp-t28`]: o ganho
é de nitidez (1,02x contra ~1,6x do atlas), não de tamanho. Os bustos (`f3`, `f4`, `f5`) têm o ganho cheio.

### AMINU (f0 MASHI, f1 GARKUWA, f2 PASSO DO LEÃO)

| Célula | Veredito | Notas |
|---|---|---|
| `f0` | ok, ressalva menor | O punho de corda (mão de trás) vai reto à direita. A mão da frente está **fechada** perto do peito; o prompt pedia aberta. No painel não pesa |
| `f1` | ok | A palma aberta da mão da frente enche o primeiro plano, e o punho de corda fica baixo, no quadril. É a leitura de escudo que faltava no mundo (D-roteiro: "fraco: a palma parada lê como defesa") |
| `f2` | **REPROVADA: eco da mestra** | XOR de **4,9%** contra a mestra (a respiração vai até 15,6%). É a pose da mestra: punho de corda no rosto, palma à frente, sorriso, cortada no joelho. **Sai da página**: o `sFwd` cai no `Alt` do mundo (`resolverPoseDoFilme`) [medido: `sFwd@28` sem close] |
| `f3` | ok | Grito com o punho de corda no peito |
| `f4` | ok com paliativo | Riscos limpos (§2.2). O braço cortado na vertical foi esmaecido (§2.3) |
| `f5` | ok | Arqueando para a esquerda. A corda está na mão do lado esquerdo da imagem, a de trás |

**Mão de corda (pedido do Atlas):** a corda está SÓ na mão de trás nas 5 células em que a mão aparece (`f0`, `f1`, `f2`, `f3`,
`f5`). A canela enfaixada é a da frente em `f2` e em `f5`. Na `f4` as mãos não aparecem.

### NILA (f0 GOLPE MARMA, f1 PASSO DO ELEFANTE, f2 BOTE, f3 SALTO DA SERPENTE)

| Célula | Veredito | Notas |
|---|---|---|
| `f0` | ok | Golpe de dois dedos estendido, a outra mão no ombro, trança balançando |
| `f1` | ok | Duas palmas juntas à frente, joelhos dobrados |
| `f2` | ok | Rente ao chão, perna da frente deslizando, mão no chão. Corpo inteiro |
| `f3` | ok | Salto em parafuso, perna em diagonal para baixo. Corpo inteiro. A NILA não tem grito: a `f3` dela é o SALTO |
| `f4` | ok | Trança voando para a esquerda |
| `f5` | ok | Arqueando para a esquerda, braços abertos |

## 4. Eco da mestra [medido, `filme-eco.py`]

XOR mínimo (escala 0,50 a 0,90, dx ±60) contra a mestra recortada na linha da célula. É um piso, a favor do eco. Régua: a
respiração do idle no atlas do próprio lutador.

| | f0 | f1 | f2 | f3 | f4 | f5 | Respiração (idle0 x idle1/2/3) |
|---|---|---|---|---|---|---|---|
| CAMILLE | 65,7 | 62,5 | 63,0 | 23,2 | 47,5 | 62,8 | 8,9 / 19,6 / 15,0 |
| AMINU | 42,7 | 44,1 | **4,9** | 32,1 | 35,1 | 64,0 | 3,4 / 15,6 / 2,6 |
| NILA | 43,5 | 40,3 | 44,7 | 54,5 | 48,2 | 56,2 | 5,4 / 14,4 / 3,0 |

Só a AMINU `f2` ecoa, e a comparação lado a lado com a mestra confirma: mesma pose, mesmo sorriso [a olho,
`ami-mestra-vs-r1c3.png`]. A CAMILLE `f3` passa raspando (23,2 contra 19,6), com o rosto diferente (grito contra sorriso).

## 5. Páginas FILME

### 5.1 Como foram montadas

1. `filme-montar-pagina.mjs <folha> <dir> <Hc> <células com corte>`: o 4º argumento (do grupo B) limita a réplica da linha de
   corte às células de busto/três-quartos. Em célula de corpo inteiro, a réplica apagaria o contorno do pé.
   - CAMILLE: `630 f3,f4,f5`
   - AMINU: `630 f0,f1,f2,f3,f4,f5`
   - NILA: `600 f0,f1,f4,f5`
2. `filme-celulas.mjs` (novo, grupo C):
   - AMINU: `"f2:-,f4:e30"` (tira a `f2` e esmaece o braço da `f4`);
   - NILA: `"f0:720,f2:720"` (ver 5.2).
3. `filme-empacotar.mjs` (do grupo B): escolhe as 2 linhas que dão a página mais estreita, sem reamostrar.
4. Despill final dos pixels esverdeados isolados e WebP q88, alfa 100.

### 5.2 Por que a NILA tem Hc 600 e duas células reduzidas [calculado sobre `src/render/filme.ts`]

O painel mudou desde o piloto (`encaixeDaCelula`). A célula encaixa por `min(largura útil / w, 0,96 × altura / h)`, com:
- largura útil = 460 − tan 12° × 335 = 388,8 lógicos = **777,6 px de canvas**;
- altura = 0,96 × 335 = 321,6 lógicos = **643,2 px de canvas**.

Uma célula com w/h acima de **1,209** fica limitada pela LARGURA. A `f0` (golpe com o braço estendido, 1,42) e a `f2` (rente
ao chão, 1,38) da NILA saem com 777,6 px de largura na tela de qualquer jeito. Guardar 850 px na página é memória que não
aparece.

Em Hc 630 sem redução, a NILA dava **2288 x 1216, 10,6 MiB**. Com Hc 600 e as duas largas em 720 px, dá **1920 x 1216, 8,91 MiB**:
- as altas saem a 643,2 / 600 = 1,07x;
- as largas, a 777,6 / 720 = 1,08x.

As duas ficam dentro do teto de 1,1x. Nenhuma célula da NILA foi ampliada em relação à folha (a `f2`, a menor figura, sai a
0,95x da folha).

### 5.3 Mapas (`arte-fonte/lutadores/<id>/filme/<id>-filme-pagina-v1.json`, todos com `painel: true`)

| Quadro | CAMILLE x,y,w,h | AMINU x,y,w,h | NILA x,y,w,h |
|---|---|---|---|
| `f0` | 4,4,432,631 | 4,4,602,630 | 4,97,720,508 |
| `f1` | 4,639,483,631 | 4,638,592,630 | 4,610,584,600 |
| `f2` | 491,640,462,630 | **ausente (eco)** | 592,689,720,521 |
| `f3` | 440,4,550,631 | 610,4,561,630 | 728,5,552,600 |
| `f4` | 994,5,612,630 | 1175,4,524,630 | 1284,4,625,601 |
| `f5` | 957,639,621,631 | 600,638,664,630 | 1316,609,564,601 |

O `.json` traz `p: 0` em cada quadro, como o do HAYATO. No bloco `filme` do `atlas.json` o `p` sai (a prova injeta sem ele, e o
validador aceita).

### 5.4 Prova no painel [medido, `filme-prova-painel-lutador.mjs`, luta espelho, ticks 0/28/38/48]

| Lutador | Golpe | Quadros desenhados no painel | Ampliação |
|---|---|---|---|
| CAMILLE | sResp, sDown, sFwd | f3 → f0/f1/f2 → f4 → f5 | 1,019-1,021 |
| AMINU | sFire, sDown | f3 → f0/f1 → f4 → f5 | 1,021 |
| AMINU | sFwd | f3 → **(sem painel no golpe: Alt)** → f4 → f5 | 1,021 |
| NILA | GAJA sFire, sFwd | (t0 sem painel: o grito é a PREP) → f0/f1 → f4 → f5 | 1,070-1,080 |
| NILA | SARPA sFire, sFwd (`ficha = 'sarpa'`) | → f2/f3 → f4 → f5 | 1,072-1,080 |

**Close contra o atlas ampliado** (capturas A sem página x B com página no mesmo tick) [a olho]:
- NILA `f0`: cabeça ~156 px contra ~100 px no mundo;
- AMINU `f4`: ~220 contra ~100;
- CAMILLE `f0`: ~104 contra ~90 (corpo inteiro, §3).

Todos ficam a 1,02-1,08x, contra ~1,6x do sprite do mundo (régua do piloto, não remedida por lutador). **Go técnico** nas 3.

## 6. AMINU: regerar `f2` e `f4` numa geração só (opcional para a `f4`, necessária para a `f2`)

Uma imagem com **2 figuras** custa 1 geração (6 créditos) e cobre as duas células. Depois:
1. medir (2 componentes);
2. recortar cada figura pela chave;
3. colar no lugar da R1C3 e da R2C2 de uma cópia da `aminu-filme-limpa-v1.png`, salva como `filme/aminu-filme-limpa-v2.png`
   (nunca em `folhas/`);
4. remontar com `630 f0,f1,f2,f3,f4,f5`, sem `f2:-` e sem `f4:e30`, e gerar `aminu-filme-pagina-v2.*`.

- **Anexar (UMA imagem):** `aminu-mestra-v1.png`
- **Formato:** paisagem 16:9, 2K
- **Salvar como:** `arte-fonte/lutadores/aminu/folhas/aminu-filme-celulas-v1.png` (nome fora do padrão `-filme-vN`, para não
  virar o "maior vN")

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 16:9.
Exactly 2 separate figures of the same character, side by side in an invisible grid of 2 columns and 1 row; each cell holds exactly one figure. "Bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless the cell says otherwise. Same character, same costume, same face, same proportions in both cells.
IMPORTANT SPACING: leave an empty band of plain background at least 10% of the image width between the two figures and at least 8% of the image height above them. Hair, shoulders, arms, hands and fingers NEVER touch the image border or the other figure; the whole width of the body, both arms included, stays inside the image. Nothing is cut off except at the waist or knee line.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, sparks, speed lines, motion lines in the hair, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. The rope wrap is always on the rear hand in every pose. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, NEVER the guard pose of the reference image: the rope-wrapped fist is never raised near the face. Background color: solid flat pure green #00FF00.

SHEET CELLS. (1) three-quarter: a deep forward lunge toward the right, the front knee bent far forward, the torso leaning forward over the front knee, the bare lead arm fully extended straight to the right at chest height with the heel of the open palm driving forward, fingers up, the rope-wrapped rear fist pulled down to the hip, mouth open in a fierce shout, no smile. (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, both shoulders and both upper arms fully inside the image.
```

Se a célula (1) vier de novo com a pose da mestra: ela fica no `Alt` (regra do §7 dos roteiros). Não se regera uma segunda vez.

## 7. Arquivos

| Arquivo | O que é |
|---|---|
| `arte-fonte/lutadores/camille/filme/camille-filme-limpa-v1.png` | Folha sem a linha preta da R2 |
| `arte-fonte/lutadores/aminu/filme/aminu-filme-limpa-v1.png` | Folha sem os riscos do cabelo da R2C2 |
| `arte-fonte/lutadores/<id>/filme/<id>-filme-pagina-v1.{png,webp,json}` | Página FILME e mapa dos quadros (os 3 lutadores) |
| `arte-fonte/ferramentas-curadoria/filme-limpar-grupo-c.py` | Limpeza da CAMILLE (linha) e da AMINU (riscos e orelha) |
| `arte-fonte/ferramentas-curadoria/filme-celulas.mjs` | Ajuste de célula na página: reduzir (`fN:W`), tirar (`fN:-`), esmaecer o alfa (`fN:eK`) |
| `arte-fonte/ferramentas-curadoria/filme-prova-painel-lutador.mjs` | Prova no painel para qualquer lutador, injetando o bloco `filme` (aceita `golpe@ficha`) |

`filme-eco.py`, `filme-montar-pagina.mjs` e `filme-empacotar.mjs` foram generalizados pelo grupo B **durante** esta curadoria.
Usei as versões dele e não editei esses três arquivos.

**Para o `public/` (Vega/Lyra):** `<id>-filme-pagina-v1.webp` → `public/assets/lutadores/<id>/filme.webp`, e o bloco `filme`
no `atlas.json` com `tamanho` e os quadros do `.json` (sem `p`).
