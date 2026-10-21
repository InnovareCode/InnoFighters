# InnoFighters — prompts de arte para o gerador de imagens do Gemini

> **A versão para USO são os arquivos de `docs/prompts/`** (um por personagem, cada prompt já completo, a partir de
> `docs/prompts/00-indice.md`). Este documento é a **fonte**: os arquivos de `docs/prompts/` são gerados a partir dos blocos
> daqui por `ferramentas/prompts/montar-prompts.mjs` e conferidos por `ferramentas/prompts/verificar-prompts.mjs`.
> Ao mudar um prompt, mude aqui e rode os dois scripts (`node ferramentas/prompts/montar-prompts.mjs` e depois o de verificação).

> **Atualização de 2026-10-20 (Apolo): a arte agora é gerada pelo Atlas no Runway** (modelo Nano Banana 2.1, paisagem
> 4:3, 2K; a imagem-mestra em retrato 3:4). Onde este documento fala em "Gemini", leia "Runway". Regras novas, todas
> aprendidas nas folhas do WEI LONG, da MIN-JI e do HAYATO:
> 1. **Uma só imagem de referência por prompt** (a imagem-mestra aprovada). Com duas anexadas, o modelo devolve uma
>    delas em vez de gerar a folha nova.
> 2. **Bloco IMPORTANT SPACING** em todo prompt de folha: figura com cerca de 70% da altura da fileira, faixa vazia de
>    pelo menos 8% entre fileiras, pés nunca cortados. Pedir só "80% da célula" era ignorado (pés cortados na borda).
> 3. **No andar, pelo menos um pé no chão** em todo quadro (sem isso, quadros de andar viravam pulo).
> 4. **Nocaute com a cabeça à ESQUERDA.** Se vier à direita (aconteceu com a MIN-JI e com o HAYATO), não peça correção
>    ao gerador: o Atlas espelha a figura por código e salva como versão nova.
> 5. Fundo por lutador (seção 4): AMINU, CAMILLE, NILA e BAATAR verde; CENTELLA, HAYATO e WEI LONG magenta; MIN-JI verde.
> 6. As marcas "NÃO GERE AINDA" caíram: o dono aprovou as mecânicas (ED-M1 a ED-M10) em 2026-10-20.
> 7. HAYATO usa o traje **A2** (gi cinza-grafite com amarelo-elétrico), escolhido pelo dono; a versão A1 (gi branco) e a
>    B foram descartadas por lembrarem um personagem famoso de outra franquia.

Autor: Apolo (direção de arte) · 2026-10-20 · para o dono gerar as imagens e trazer aos poucos
Base: `docs/proposta-expansao.md` (elenco aprovado), `docs/proposta-wei-long.md` §4, `PLANO.md` §4.3 C1 (49 poses),
`docs/plano-expansao.md` §1.4 e §7, decisões D1, D2, D3 e ED11 do `PROGRESSO.md`.

**Como ler este documento:** as explicações estão em português. Os textos dentro das caixas cinzas (blocos de código)
estão em inglês e são para **copiar e colar** no Gemini, sem mudar nada.

---

## 0. Ordem de trabalho (o que gerar primeiro)

| # | O que | Quantas imagens | Por quê |
|---|---|---|---|
| 1 | WEI LONG: editar a folha de especiais 153054 | 2 edições em sequência (1A e 1B), uma imagem anexada por vez | é a única arte que ainda bloqueia o lançamento com os 4 atuais |
| 2 | MIN-JI: 4 folhas novas (D3) | 1 imagem-mestra + 4 folhas | as folhas atuais não têm grade regular e o rosa some no recorte |
| 3 | HAYATO: 4 folhas novas + cenário do Japão (D1) | 1 imagem-mestra + 4 folhas + 1 cenário | arte nova decidida para o lançamento |
| 4 | AMINU, CENTELLA, CAMILLE, NILA (nesta ordem, que é a ordem de desbloqueio) | por lutador: 1 imagem-mestra + 4 folhas (+1 opcional) | expansão em ondas |
| 5 | BAATAR (chefão) | 1 imagem-mestra + 9 folhas menores | precisa de resolução maior |
| 6 | 5 cenários novos | 5 imagens | podem ser gerados a qualquer momento, em paralelo |

Dentro de cada lutador, a ordem é sempre: **imagem-mestra → folha 1 → (você me envia e espera meu OK) → folhas 2, 3, 4 →
folha 5 opcional → efeitos opcionais.** A folha 1 serve para validar o traje: se o traje estiver errado ali, ele sai
errado em todas as outras.

---

## 1. Técnica de consistência (o mais importante)

A IA muda detalhes do traje de uma imagem para outra; às vezes muda até dentro da mesma folha. Isso já aconteceu com
o WEI LONG (túnica curta numa folha, painel longo em outra). Para reduzir esse problema:

1. **Uma conversa do Gemini por lutador.** Não misture lutadores na mesma conversa.
2. **Comece pela imagem-mestra** (seção 3): um único desenho do lutador de corpo inteiro. É a referência de rosto, corpo
   e traje para tudo o que vem depois. Me envie a imagem-mestra antes de seguir.
3. **Anexe UMA imagem de referência em todo pedido, nunca duas:**
   - nas folhas 1 a 5, anexe só a imagem-mestra aprovada (é a verdade do traje e não pode ser "devolvida" como folha);
   - se as folhas 2 a 5 começarem a variar de estilo ou escala, troque a referência pela folha 1 aprovada, ainda
     sozinha (com duas anexadas o modelo devolve uma delas, como aconteceu no WEI LONG);
   - para a imagem-mestra da MIN-JI, a referência é a arte antiga indicada na ficha; a do HAYATO já está gerada (A2).
4. **Monte o prompt colando 3 blocos, nesta ordem:**
   - **BLOCO A:** regras gerais (seção 2, é igual para todos);
   - **BLOCO B:** a descrição fixa do lutador (está na ficha dele; é sempre a mesma);
   - **BLOCO C:** o conteúdo das células da folha que você vai gerar.
   Deixe uma linha em branco entre os blocos. Na seção 2.3 há um exemplo montado por inteiro.
5. **Formato:** escolha imagem horizontal 4:3 (paisagem) e a maior resolução disponível (2K, ou 4K se houver). Se o
   Gemini não oferecer a opção de formato, o próprio BLOCO A já pede 4:3.
6. **Se a folha vier quase boa, corrija; não gere de novo.** Use os prompts de correção (seção 9), **um defeito por
   vez**. Gerar do zero traz um rosto novo.
7. **Nunca peça "fundo transparente".** O Gemini desenha um xadrez cinza no fundo, e esse xadrez não sai no recorte.
   Peça a cor chapada indicada para cada lutador.

---

## 2. BLOCO A — regras gerais (cole no início de TODO prompt de folha)

```
2D fighting game character sprite sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 12 poses arranged in an invisible grid of 4 columns and 3 rows. Every cell has the same size. One full-body figure centered in each cell with clear empty space around it. No figure touches another figure or the image border. Nothing is cut off.
The character always faces RIGHT, unless a cell says otherwise.
Same character, same costume, same face, same proportions and same size in every cell. In each row, the feet of every grounded pose rest on the same invisible baseline near the bottom of the row.
IMPORTANT SPACING: each figure is only about 70% of the height of its row, never taller. Leave an empty band of plain background at least 8% of the image height between rows, above the top row and below the bottom row. Hair, fists, fingers, toes and feet NEVER touch the image border or the next row. Feet are never cut off: both feet and all toes are always fully visible.
In every standing and walking pose at least one foot is flat on the baseline: walking is a step, never a hop. Only jump, air and knockdown poses leave the ground.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no ground shadow, no cast shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders or frames.
NO visual effects of any kind: no glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, smears, dust, impact stars or blur.
Only this one character. No opponent, no other people, no props unless a cell says so.
```

**Por que o bloco IMPORTANT SPACING (medido no HAYATO, folha 1):** com "80% da altura da célula", a v1 saiu com os pés da
fileira de baixo cortados pela borda e sem vão entre fileiras; com o bloco de espaçamento e "um pé no chão", a v2 não
cortou nenhum pé e os quadros de andar viraram passos. O modelo ainda desenha figuras maiores que 70%, por isso o
recorte da F2 fatia por componentes conexos, não por grade fixa.

### 2.1 BLOCO C das folhas 1, 2 e 3 (iguais para todos os lutadores, menos o BAATAR)

As folhas 1 a 3 têm o mesmo conteúdo para todos. O jeito de lutar de cada um já vem da linha "Fighting stance" do
BLOCO B. A folha 4 (especiais) é própria de cada lutador e está na ficha dele.

**Folha 1 — base (respiração e andar)**
```
SHEET 1 — BASE.
Row 1: four frames of an idle breathing loop in the character's fighting stance: (1) neutral, (2) chest slightly raised, (3) chest fully raised, shoulders up a little, (4) chest coming down. Feet do not move between these four frames.
Row 2: walk cycle forward, frames 1 to 4: (1) front foot reaching forward, (2) weight passing over front foot, (3) back foot passing, (4) back foot planting. Guard stays up. At least one foot flat on the baseline in every frame: small walking steps, never jumping.
Row 3: walk cycle forward, frames 5 to 8: same motion with the other leg, ending one step before frame 1, so the 8 frames loop smoothly. At least one foot flat on the baseline in every frame.
```

**Folha 2 — reações e pulo**
```
SHEET 2 — MOVEMENT AND REACTIONS.
Row 1: (1) deep crouch with guard up, (2) standing block: forearms raised in front of the face, body leaning slightly back, (3) crouching block: crouched, forearms up, (4) pre-jump squat: knees bent, about to jump.
Row 2: (1) jump rising: body going up, knees starting to tuck, (2) jump apex: knees fully tucked, guard up, (3) jump falling: legs extending down to land, (4) landing: knees bent absorbing impact.
Row 3: (1) hit in the face: head snapped back, eyes shut, body recoiling to the LEFT, (2) hit in the stomach: doubled over forward, (3) knocked into the air: body almost horizontal, flying backward to the LEFT, head on the left side, (4) knocked out: lying flat on the back on the baseline, head on the LEFT side of the cell, feet pointing to the RIGHT, eyes closed (the head is at the left end of the body, never at the right end).
```

**Folha 3 — golpes normais**
```
SHEET 3 — NORMAL ATTACKS.
Row 1: (1) light punch start, (2) light punch fully extended at face height, (3) heavy punch wind-up, (4) heavy punch fully extended, hips and shoulders rotated into it.
Row 2: (1) light kick chambered knee, (2) light kick extended at stomach height, (3) heavy kick chambered, (4) heavy kick fully extended at head height.
Row 3: (1) crouching light punch, (2) crouching low kick at shin height, (3) low sweep: crouched on one leg, other leg fully extended along the floor, (4) crouching uppercut rising toward the sky, anti-air.
```

**Folha 5 — extras (opcional; recomendada, mas não bloqueia)**
```
SHEET 5 — EXTRAS.
Row 1: (1) jumping punch: in the air, knees tucked, fist striking diagonally downward, (2) getting up from the floor: on one knee pushing up, (3) hit while crouching, (4) time-over loss: exhausted, hands on knees.
Row 2: (1) throw start: both hands grabbing forward at chest height as if seizing an opponent's collar (no opponent drawn), (2) throw: body turning, arms pulling across to the left as if tossing someone behind, (3) victory taunt variant, (4) intro pose before the fight.
Row 3: [EXTRAS DO LUTADOR — ver a ficha; se a ficha não tiver, use: (1) to (4) four idle variants with small differences in arm position].
```

### 2.2 Mapa célula → pose do jogo (para a Vega no recorte)

| Folha | Linha 1 | Linha 2 | Linha 3 |
|---|---|---|---|
| 1 base | idle0 idle1 idle2 idle3 | walk0 walk1 walk2 walk3 | walk4 walk5 walk6 walk7 |
| 2 reações | crouch block cblock jsquat | jup jtop jfall land | hitH hitB kdAir koFloor |
| 3 golpes | lp0 lp1 hp0 hp1 | lk0 lk1 hk0 hk1 | clp clk sweep upper |
| 4 especiais | sa0 sa1 sa2 sa3 | sb0 sb1 sb2 sb3 | sc0 sc1 jkick win |
| 5 extras | jpunch getup crouchHit timeLose | throw0 throw1 win2 intro | extras do lutador |

As folhas 1 a 4 cobrem as 13 poses mínimas do C1 e 48 das 49 canônicas. A que falta, `jpunch`, está na folha 5 e,
enquanto ela não vier, o jogo usa o `FALLBACK`. É o mesmo layout que o protótipo já espera, então o pipeline da F2
corta as folhas novas sem nenhuma mudança.

### 2.3 Exemplo montado por inteiro (MIN-JI, folha 1)

Cole tudo isto de uma vez e anexe a imagem-mestra da MIN-JI:

```
2D fighting game character sprite sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 12 poses arranged in an invisible grid of 4 columns and 3 rows. Every cell has the same size. One full-body figure centered in each cell with clear empty space around it. No figure touches another figure or the image border. Nothing is cut off.
The character always faces RIGHT, unless a cell says otherwise.
Same character, same costume, same face, same proportions and same size in every cell. In each row, the feet of every grounded pose rest on the same invisible baseline near the bottom of the row.
IMPORTANT SPACING: each figure is only about 70% of the height of its row, never taller. Leave an empty band of plain background at least 8% of the image height between rows, above the top row and below the bottom row. Hair, fists, fingers, toes and feet NEVER touch the image border or the next row. Feet are never cut off: both feet and all toes are always fully visible.
In every standing and walking pose at least one foot is flat on the baseline: walking is a step, never a hop. Only jump, air and knockdown poses leave the ground.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no ground shadow, no cast shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders or frames.
NO visual effects of any kind: no glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, smears, dust, impact stars or blur.
Only this one character. No opponent, no other people, no props unless a cell says so.

CHARACTER — MIN-JI: young Korean woman, taekwondo champion, about 22 years old, athletic and slim. Long straight black hair in a high ponytail tied with a red ribbon bow. Determined bright dark eyes, friendly face. White V-neck taekwondo dobok with black collar trim, black belt tied at the front, red fingerless sparring gloves, barefoot. Fighting stance: side-on, light on the balls of her feet, hands in a loose guard, ready to kick. Match the attached reference image exactly. Background color: solid flat pure green #00FF00.

SHEET 1 — BASE.
Row 1: four frames of an idle breathing loop in the character's fighting stance: (1) neutral, (2) chest slightly raised, (3) chest fully raised, shoulders up a little, (4) chest coming down. Feet do not move between these four frames.
Row 2: walk cycle forward, frames 1 to 4: (1) front foot reaching forward, (2) weight passing over front foot, (3) back foot passing, (4) back foot planting. Guard stays up. At least one foot flat on the baseline in every frame: small walking steps, never jumping.
Row 3: walk cycle forward, frames 5 to 8: same motion with the other leg, ending one step before frame 1, so the 8 frames loop smoothly. At least one foot flat on the baseline in every frame.
```

---

## 3. Imagem-mestra (a primeira imagem de cada lutador)

Cole o BLOCO B do lutador logo depois deste texto. Formato: retrato (vertical, 3:4).

```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.
```

---

## 4. Cor de fundo por lutador (escolhida para não colidir com o traje)

O recorte apaga a cor do fundo. Se essa cor aparece no traje, no cabelo ou no reflexo da pele, o recorte "come" um
pedaço do lutador. Por isso a regra é escolher a cor que fica **mais longe** de tudo o que o lutador veste. Azul
nunca é usado como fundo: aparece em trajes demais.

| Lutador | Fundo | Por quê |
|---|---|---|
| WEI LONG | magenta `#FF00FF` | as outras 3 folhas canônicas já são magenta; a edição tem que bater com elas. O traje é azul, preto e branco |
| MIN-JI | verde `#00FF00` | D3: luvas vermelhas e laço vermelho; no magenta o rosa do cabelo e das luvas era apagado pelo recorte |
| HAYATO | magenta `#FF00FF` | traje A2: a faixa da cabeça é **verde** (fundo verde apagaria a faixa); gi cinza-grafite e amarelo ficam longe do magenta. A mestra saiu ≈ `#FD2BFA`, uniforme: o recorte mede o fundo por pixel |
| AMINU | verde `#00FF00` | o índigo do calção tem componente azul-violeta, próximo do magenta; creme e cobre ficam longe do verde |
| CENTELLA | magenta `#FF00FF` | o traje é **turquesa-jade (verde-água)**: no verde, o recorte apagaria a roupa e a máscara |
| CAMILLE | verde `#00FF00` | macacão azul-marinho (o magenta tem azul); luvas prata e sapato branco são neutros |
| NILA | verde `#00FF00` | faixa vermelho-terra e barra dourada: o magenta tinge de rosa as bordas vermelhas |
| BAATAR | verde `#00FF00` | casaco vermelho com calção azul-escuro: o magenta colide com os dois |

---

## 5. Lutadores atuais

### 5.1 WEI LONG — editar a folha 153054 (prioridade 1)

<!-- veredito-wei:inicio -->
**Veredito da 1ª entrega (2026-10-20, curadoria do Apolo):**

| Imagem enviada | Veredito | O que fazer |
|---|---|---|
| `8b788295` (tentativa do Prompt 1: editar a folha de especiais) | **REPROVADA.** Não é a edição. É a folha 153007 (base: 4 quadros parados na base de cavalo + 8 de andar, com a grade escura), devolvida quase igual. Não há nenhuma pose de especial. O Atlas mediu diferença média de 8,6 contra a 153007 e de 40 a 45 contra as outras folhas; conferi a olho e confirmo. | Não salve esta imagem. Refaça pelos Prompts **1A** e **1B** abaixo, com **uma imagem anexada por vez**. |
| `1bcee91a` (Prompt 2: efeito da cabeça de dragão) | **APROVADA.** Medido na imagem enviada: fundo preto (fora da faixa dos dragões, o pixel mais claro tem brilho 2 de 255, mesmo com a compressão); 4 quadros separados, sem encostar (larguras de 230 a 272 px, espaços de 33 a 43 px numa imagem de 1200 px); nenhum personagem; cor média dos pixels brilhantes RGB(177,124,216), lilás da família do WEI LONG (`#d58bff` / `#7a2de0`); bocas viradas para a direita. | Não precisa gerar de novo. Só falta salvar o **arquivo original baixado do Gemini** (a imagem do chat veio comprimida, em 1200 × 896) como `arte-fonte/lutadores/wei-long/fx/wei-long-fx-v1.png`. Observação para a Lyra: o 3º quadro é maior e mais brilhante e o 4º se desfaz em fumaça, ou seja, quadros 1 a 3 = voo e 4 = dissipação. |

**Por que o Prompt 1 agora tem duas etapas:** quando duas imagens são anexadas, o Gemini às vezes devolve a segunda (a de
referência) em vez de editar a primeira. Foi o que aconteceu: voltou a folha de andar, não a de especiais. Com **uma
única imagem anexada** não existe "a outra" para ele confundir. Por isso o trabalho foi dividido: a etapa 1A só apaga
os efeitos; a 1B só alonga a túnica, descrevendo o painel em palavras em vez de mostrar a referência. E cada etapa
pede uma mudança só, o que também ajuda a não mudar rostos e poses.
<!-- veredito-wei:fim -->

**O que fazer:** abrir uma conversa nova no Gemini e seguir as duas etapas, nesta ordem. Os textos **não usam** o
BLOCO A, porque são edições e não gerações novas. A troca do quadro L3C2 por uma ombrada foi adiada pelo dono, então
ficou fora.

**Etapa 1A: só remover os efeitos.** Anexe **apenas** `arte-fonte/lutadores/wei-long/folhas/Kung_fu_master_sprite_sheet_2K_20261020153054.jpg`.
Salve como `wei-long-f4-especiais-v2.png`. Checagem: as 12 figuras continuam as mesmas (bola de energia nas mãos,
palmas empurrando, pisão, ombrada, chute, braços cruzados), sem nenhum brilho lilás, sem a cabeça de dragão, sem aura em
volta do corpo e sem o chão rachado; onde havia efeito sobre as mãos, as mãos aparecem normais. A túnica ainda curta é
esperada nesta etapa.

```
Edit this sprite sheet. Change ONLY what is listed here. Remove ALL visual effects: the purple and lilac energy ball between the hands, the purple dragon head, the purple energy wave, the purple aura around the body, the purple explosion, and the cracked ground with debris under the feet. Where an effect covered the background, fill it with the same flat solid magenta #FF00FF. Where an effect covered part of the character (hands, arms, legs, feet), redraw that part normally, without any glow. Keep the 12 figures, their poses, positions, sizes, faces, hair, beards and costumes exactly as they are. Do not add anything new. Flat solid magenta #FF00FF background everywhere, no shadows, no gradients, no text.
```

**Etapa 1B: só alongar a túnica.** Na mesma conversa, anexe **apenas** a imagem aprovada da etapa 1A
(`wei-long-f4-especiais-v2.png`). Salve como `wei-long-f4-especiais-v3.png`. Checagem: em **todas as 12 figuras**, o
colete azul continua abaixo da cintura num painel da frente até o meio da canela, com borda dourada, por cima da calça
preta, como nas outras folhas do WEI LONG; nada mais mudou (rostos, poses, braçadeiras pretas, sapatos, fundo magenta).

```
Edit this sprite sheet. Change ONLY the tunic. In every one of the 12 figures, the royal-blue vest must continue below the waist as one long front panel that hangs down to the middle of the shins, with gold trim along its edges, open at the sides over the black trousers, like a long apron in front of the legs. The panel follows the pose: it swings and folds in kicks, steps and jumps. Keep everything else exactly as it is: poses, positions, sizes, faces, hair, beards, black wrist bracers, black trousers, shoes and the flat solid magenta #FF00FF background. No visual effects, no shadows, no text.
```

Se a etapa 1B mudar rostos ou poses, descarte e repita a 1B. Se o problema se repetir, me avise: dá para fazer a túnica
em duas metades (linhas 1 e 2 primeiro, depois a linha 3).

**BLOCO B do WEI LONG** (para extras futuros, como `jpunch`):
```
CHARACTER — WEI LONG: elderly Chinese kung fu master, about 65 years old, tall and powerful, broad chest, thick forearms. Long white hair tied in a topknot bun, long white eyebrows, white beard reaching the chin, calm stern face. Sleeveless royal-blue changshan-style vest with gold trim and a gold dragon embroidered on the front, with a long front panel reaching the shins. Wide black kung fu trousers, black cloth shoes with white soles, plain black cloth wrist bracers. Fighting stance: low wide horse stance, open palms forward. Match the attached reference images exactly. Background color: solid flat magenta #FF00FF.
```

### 5.2 MIN-JI — 4 folhas novas (prioridade 2)

**Referência a anexar:** `arte-fonte/lutadores/min-ji/folhas/Woman_doing_taekwondo_stances_2K_20261020154418.jpg`,
para manter o rosto e o traje. Primeiro gere a imagem-mestra e depois as folhas.

**BLOCO B**
```
CHARACTER — MIN-JI: young Korean woman, taekwondo champion, about 22 years old, athletic and slim. Long straight black hair in a high ponytail tied with a red ribbon bow. Determined bright dark eyes, friendly face. White V-neck taekwondo dobok with black collar trim, black belt tied at the front, red fingerless sparring gloves, barefoot. Fighting stance: side-on, light on the balls of her feet, hands in a loose guard, ready to kick. Match the attached reference image exactly. Background color: solid flat pure green #00FF00.
```

**BLOCO C, folha 4 (especiais).** Os especiais são BULKKOT (dois chutes em meia-lua), HOERI CHAGI (chute tornado
subindo, 3 acertos) e TWIO YEOP CHAGI (voadora lateral).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (double crescent kick): (1) chambering the right leg, arms in guard, (2) right leg sweeping in a high outward crescent arc at head height, (3) left leg now sweeping a second high crescent kick, body rotated, (4) recovering to stance.
Row 2 (rising tornado kick): (1) deep crouch, arms pulled in, about to spring up, (2) airborne, spinning, one leg extended outward at head height, (3) airborne higher, mid-spin with her back partly turned, other leg extended, (4) descending from the spin, legs coming together.
Row 3: (1) flying side kick start: low running crouch about to leap forward, (2) flying side kick: body horizontal in the air, right leg fully extended forward with the foot blade, arms tucked, (3) jumping kick: in the air, knees bent, one foot striking diagonally downward, (4) victory: one fist raised high, big smile, ponytail swinging.
```

### 5.3 HAYATO — 4 folhas novas + cenário do Japão (prioridade 3)

**Traje decidido: A2 (escolha do dono em 2026-10-20).** O dono pediu a versão A com a exigência de **não lembrar o
Ryu**. A primeira versão A (gi branco, faixa preta, luvas azul-marinho) ainda lembrava; a variante reforçada **A2** foi
a escolhida e as versões A1 e B saíram deste documento. Referência única: a imagem-mestra aprovada
`arte-fonte/lutadores/hayato/folhas/hayato-mestra-v1.png` (já gerada; não gere outra).

**O que está nas imagens aprovadas** (mestra e folhas f1 a f4, conferidas célula por célula):
- cabelo preto espetado para cima e para trás, com **uma mecha amarelo-elétrico em forma de raio** na frente;
- **faixa verde** na testa, com duas pontas longas esvoaçando para trás;
- **gi cinza-grafite** (nunca branco): mangas curtas dobradas acima do cotovelo, gola em V aberta mostrando o peito,
  **debrum amarelo-elétrico** em toda a gola e na barra do casaco, que tem fendas laterais;
- **raio amarelo pequeno no peito esquerdo**; quando ele vira as costas (soco forte), aparece um raio amarelo maior na
  parte de cima das costas;
- **faixa preta com bordas amarelas**, nó na frente e duas pontas longas;
- calça cinza-grafite larga, sem debrum;
- **mãos e antebraços enfaixados de branco**, dos nós dos dedos até o meio do antebraço (sem luvas);
- descalço, pele clara, olhos escuros, sorriso confiante;
- guarda: base larga de karatê, um punho erguido à frente na altura do queixo, o outro protegendo o peito.

**BLOCO B (traje A2)**
```
CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.
```

**BLOCO C, folha 4 (especiais).** Os especiais são RAIJIN-DAN (esfera de trovão), RAIJIN-KEN (soco ascendente) e
KAMINARI-STEP (investida com soco).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (thunder sphere push): (1) both hands cupped together at the right hip, knees bent, gathering power, (2) beginning to thrust both open palms forward, (3) both palms fully extended forward at chest height, wrists together, fingers open, front knee bent, (4) recovering, hands returning.
Row 2 (rising uppercut): (1) crouched low, right fist drawn down by the knee, (2) springing upward, right fist rising past the face, (3) airborne at the peak, right fist straight up above the head, body vertical, knees tucked, (4) descending, arm coming down.
Row 3: (1) dash punch start: deep forward lunge, fist pulled back at the hip, (2) dash punch: body low and stretched forward, right fist fully extended, back leg straight behind, (3) jumping kick: in the air, one foot striking diagonally downward, (4) victory: one fist raised high, eyes closed, grinning.
```

O cenário do Japão está na seção 7.

---

## 6. Lutadores novos

As fichas completas (personalidade, cultura, mecânicas) estão em `docs/proposta-expansao.md` §2.3. Aqui ficam só o
visual e as poses. Os nomes dos golpes aparecem nas explicações em português; nos prompts só vai a descrição do
movimento.

### 6.1 AMINU — Nigéria, dambe (fundo verde)

**BLOCO B**
```
CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.
```

**BLOCO C, folha 4.** Os especiais são MASHI (soco carregado: segurar e soltar), GARKUWA (mão-escudo que anula
projéteis) e PASSO DO LEÃO (investida com o escudo).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (charged spear punch): (1) starting the charge: rope-wrapped fist pulled back to the hip, open lead hand forward, weight shifting back, (2) full charge: body coiled tight, weight on the back foot, wrapped fist drawn far back, jaw clenched, (3) release: the rope-wrapped fist fully extended in a straight punch at face height, whole body behind it, lead hand pulled back, (4) follow-through, recovering to stance.
Row 2 (shield hand): (1) small step in, lead hand rising, (2) open lead palm thrust straight forward at chest height, fingers spread, like a shield, body behind it, (3) holding the shield palm firm, wrapped fist ready at the cheek, (4) returning to stance.
Row 3: (1) lion step start: low forward crouch, shield hand forward, (2) lion step rush: body lunging forward low, open shield hand pushing forward at chest height, wrapped fist cocked, (3) jumping kick: in the air, front foot striking diagonally downward, (4) victory: rope-wrapped fist raised high to the crowd, other hand on the chest, big smile.
```

**Linha 3 da folha 5 (extras):** `(1) taunt: tapping his wrapped fist against his open palm, (2) to (4) three idle variants with small arm differences.`

### 6.2 CENTELLA — México, lucha libre (fundo magenta)

**BLOCO B**
```
CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.
```

**BLOCO C, folha 4.** Os especiais são PLANCHA (salto e queda de corpo), HURACANRANA (agarrão aéreo com as pernas) e
RESORTE (rebote nas cordas com voadora). A mecânica dela é usar as bordas da tela.
```
SHEET 4 — SPECIAL MOVES.
Row 1 (body splash): (1) deep crouch, arms back, about to leap, (2) leaping high, arms spread wide, rising, (3) in the air, body flat and horizontal, belly down, arms and legs spread, falling forward, (4) landing in a low crouch, one hand touching the ground.
Row 2 (aerial leg-scissor takedown, no opponent drawn): (1) jumping straight up, arms reaching forward and up, (2) in the air at head height, legs scissored together as if locked around an opponent's neck, upper body arching back, (3) upside down in a backflip rotation, legs whipping over, (4) landing on one knee, arms open to the crowd.
Row 3: (1) rope rebound: running fast, leaning forward, arms pumping, (2) flying crossbody: body horizontal in the air, arms stretched forward, (3) jumping dropkick: in the air, both feet together striking forward, body tilted back, (4) victory: standing on her toes, one arm raised with index finger up, other hand on hip, mask on.
```

**Linha 3 da folha 5 (extras):**
`(1) and (2) two idle variants with small arm differences, mask on, (3) taunt: arms crossed in front of her mask, (4) bowing to the crowd with one hand on her chest.`

O salto na parede foi cortado (ED-M2 aprovada: fica o RESORTE, que reusa a corrida da folha 4 espelhada), por isso as
células 1 e 2 voltaram a ser variações de guarda.

### 6.3 CAMILLE — França, savate (fundo verde)

**BLOCO B**
```
CHARACTER — CAMILLE: French savate fighter (boxe francaise) from Marseille, about 29 years old, tall and lean, modest athletic sports outfit. Light olive skin, short dark auburn bob haircut, sharp focused eyes, a faint confident smile. Navy-blue sleeveless one-piece savate suit with thin silver stripes down the sides, fitted athletic cut. Silver boxing gloves. White low-top savate boxing shoes with dark soles and laces. She always wears the shoes. Very upright posture. Fighting stance: tall upright stance, gloves held high, lead foot light and pointed, ready to kick with the toe of the shoe. Background color: solid flat pure green #00FF00.
```

**BLOCO C, folha 4.** Os especiais são PARADE (aparar e responder: a mecânica dela), COUP D'ARRÊT (chute baixo de
parada) e REVERS (chute de calcanhar girando que cruza para o outro lado).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (parry and riposte): (1) parry stance: lead glove high and angled forward, rear glove tight at the chin, weight shifted back, eyes sharp, (2) parry: lead forearm sweeping outward to deflect an incoming strike, (3) riposte: high roundhouse kick to head height, striking with the toe of the shoe, supporting leg straight, upright torso, (4) recovering to stance.
Row 2 (low stop-kick): (1) chambering the lead knee low, (2) low side kick: lead leg fully extended at shin height, sole of the shoe forward, torso upright, (3) holding the extended low kick, (4) retracting the leg to stance.
Row 3: (1) spinning heel kick start: turning, back partly to the right, crossing step, (2) spinning heel kick: rear leg swinging around fully extended at head height, heel leading, (3) jumping kick: in the air, side kick diagonally downward with the shoe, (4) victory: one glove raised in a fencing-style salute, chin up, calm smile.
```

**Linha 3 da folha 5 (extras):** `(1) taunt: adjusting her glove, (2) to (4) three idle variants.`

### 6.4 NILA — Índia (Kerala), kalaripayattu (fundo verde)

**BLOCO B**
```
CHARACTER — NILA: Indian kalaripayattu practitioner from Kerala, about 31 years old, lean, flexible and athletic, modest traditional training clothes. Warm brown skin, long thick black hair in a single braid reaching her waist, calm focused face. Fitted off-white cotton short-sleeved training top and fitted off-white cotton trousers, both with a thin gold border, a wide laterite red-brown cloth waist wrap tied tightly, red-brown cloth bands on both upper arms, barefoot. Fighting stance (elephant posture): very low wide stance with knees bent deep, one arm extended forward and low like an elephant's trunk, the other arm guarding the chest. Background color: solid flat pure green #00FF00.
```

**BLOCO C, folha 4.** Os especiais são GOLPE MARMA (toque num ponto vital), VADIVU (troca de postura) e PASSO DO
ELEFANTE (avanço com as duas palmas).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (pressure-point strike): (1) gathering: rear hand drawn back with two fingers extended, front hand guarding, (2) quick lunge: two-finger strike fully extended forward at chest height, body low and long, (3) holding the strike, eyes focused, (4) recovering to the low stance.
Row 2 (posture change, elephant to serpent): (1) elephant posture: very low wide stance, front arm extended low like a trunk, (2) transition: sinking lower, rotating the hips, (3) serpent posture: almost lying low, chest close to the floor, weight on bent legs, both hands forward like a snake's head, (4) serpent posture variant, head raised, ready to strike.
Row 3: (1) elephant step start: low stance, both open palms drawn back at the waist, (2) elephant step: stepping forward heavily, both open palms thrust forward together at chest height, (3) jumping kick: high in the air, one leg extended diagonally downward, braid flying, (4) victory: standing upright, palms pressed together in front of the chest, calm smile.
```

**Folha 5 da NILA (obrigatória: ED-M1 aprovada, a NILA tem as posturas GAJA e SARPA).** A postura de serpente precisa
de poses próprias. Esta folha **substitui** a folha 5 genérica no caso dela.
```
SHEET 5 — SERPENT POSTURE.
Row 1: (1) to (4) serpent posture idle loop: very low, chest near the floor, hands forward like a snake's head, slight sway left and right.
Row 2: (1) and (2) serpent posture moving forward, low crawling step, (3) serpent slide start: dropping low, (4) serpent slide: body flat and low along the floor, front leg sweeping forward, passing under everything.
Row 3: (1) serpent leap start: coiled crouch, (2) corkscrew leap rising high, body twisting, (3) descending kick from the leap, leg extended diagonally down, (4) serpent posture crouching block.
```

---

## 7. BAATAR — chefão (fundo verde)

**Por que é diferente:** BAATAR aparece no jogo 1,28 vez maior que os outros. Se as poses dele saírem do mesmo
tamanho das dos outros, ficam borradas quando o jogo aumenta. Por isso as folhas dele têm **6 poses (3 colunas × 2
linhas)** em vez de 12: cada pose sai cerca de 1,5 vez maior. São 9 folhas. Para ele, use o BLOCO A próprio, abaixo,
no lugar do BLOCO A geral.

**BLOCO A do BAATAR (substitui o BLOCO A geral):**
```
2D fighting game character sprite sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 poses arranged in an invisible grid of 3 columns and 2 rows. Every cell has the same size. One full-body figure centered in each cell with clear empty space around it. No figure touches another figure or the image border. Nothing is cut off.
The character always faces RIGHT, unless a cell says otherwise.
Same character, same costume, same face, same proportions and same size in every cell. In each row, the feet of every grounded pose rest on the same invisible baseline near the bottom of the row.
IMPORTANT SPACING: each figure is only about 70% of the height of its row, never taller. Leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row. Hair, fists, fingers, boots and feet NEVER touch the image border or the next row. Feet are never cut off: both boots are always fully visible.
In every standing and walking pose at least one foot is flat on the baseline: walking is a step, never a hop. Only jump, air and knockdown poses leave the ground.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no ground shadow, no cast shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders or frames.
NO visual effects of any kind: no glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, smears, dust, impact stars or blur.
Only this one character. No opponent, no other people, no props unless a cell says so.
```
Formato: 4:3, maior resolução disponível (4K se houver).

**BLOCO B**
```
CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.
```

**BLOCO C das 9 folhas** (cada linha abaixo é uma folha; cole só a da folha que estiver gerando):

| Folha | Conteúdo para colar |
|---|---|
| B1 | `SHEET B1. Row 1: idle breathing loop frames 1, 2, 3. Row 2: idle frame 4 (chest coming down), walk frame 1 (front foot reaching forward), walk frame 2 (weight passing over front foot). Heavy, slow, grounded steps.` |
| B2 | `SHEET B2. Walk cycle frames 3 to 8, heavy and slow: Row 1: (3) back foot passing, (4) back foot planting, (5) other front foot reaching. Row 2: (6) weight passing, (7) back foot passing, (8) back foot planting, ending one step before frame 1.` |
| B3 | `SHEET B3. Row 1: (1) deep crouch, arms open low, (2) standing block, thick forearms raised in front of the face, (3) crouching block. Row 2: (1) pre-jump squat, (2) jump rising, knees tucking, (3) jump apex, knees tucked.` |
| B4 | `SHEET B4. Row 1: (1) jump falling, legs extending down, (2) heavy landing, knees bent, (3) hit in the face, head snapped back, recoiling to the LEFT. Row 2: (1) hit in the stomach, doubled over, (2) knocked into the air, body almost horizontal flying backward to the LEFT, head on the left, (3) knocked out, lying flat on the back, head on the LEFT side of the cell, feet pointing to the RIGHT (the head is at the left end of the body, never at the right end).` |
| B5 | `SHEET B5. Row 1: (1) light open-hand slap start, (2) light slap extended at face height, (3) heavy forearm smash wind-up. Row 2: (1) heavy forearm smash fully extended, (2) light knee strike chambered, (3) light front kick with the boot at stomach height.` |
| B6 | `SHEET B6. Row 1: (1) heavy kick chambered, (2) heavy stomping front kick extended at chest height, (3) crouching palm strike. Row 2: (1) crouching low kick with the boot at shin height, (2) low sweep, one leg extended along the floor, (3) crouching rising shoulder lift upward, anti-air.` |
| B7 | `SHEET B7. Command throw, no opponent drawn: Row 1: (1) reaching forward, arms wide and low, (2) gripping: both hands clamped forward at chest height as if grabbing an opponent's jacket, (3) hip toss: body rotating, arms pulling across to the LEFT. Row 2: (1) throw follow-through, kneeling on one knee, arms down to the left. Leg-hook trip: (2) leaning in, weight forward, (3) hooking his right boot low at ankle height as if hooking an opponent's leg.` |
| B8 | `SHEET B8. Row 1: (1) leg-hook trip: pulling the hooked leg back, (2) recovering to stance. Running bear hug: (3) charging run, arms open wide. Row 2: (1) bear hug: arms clamped forward in a hug at chest height, no opponent drawn, (2) jumping kick: in the air, heavy boot striking diagonally downward, (3) jumping punch: in the air, forearm smashing diagonally downward.` |
| B9 | `SHEET B9. Eagle dance (devekh), a ritual of honor, dignified and slow: Row 1: (1) arms spread wide like eagle wings, standing tall, (2) one knee raised high, arms still spread like wings, (3) hands lowering to slap his thighs, head bowed respectfully. Eagle dive: Row 2: (1) leaping high, arms spread like wings, (2) diving down from above, arms forward ready to grab, (3) victory: standing tall, right hand on his heart, slight respectful bow, kind smile.` |

Mapa para a Vega: B1–B2 → `idle0-3, walk0-7`; B3–B4 → `crouch block cblock jsquat jup jtop jfall land hitH hitB kdAir
koFloor`; B5–B6 → `lp0 lp1 hp0 hp1 lk0 lk1 hk0 hk1 clp clk sweep upper`; B7–B8 → `sa0-3` (agarrão de comando),
`sb0-3` (gancho de perna), `sc0 sc1` (abraço), `jkick`, `jpunch`; B9 → `devekh0-2`, `dive0-1`, `win`.

**Atlas paginado (para a Vega e a Lyra; o dono não precisa fazer nada).** Hoje o `idle0` tem cerca de 410 px de altura no
atlas. Para o BAATAR não borrar na escala 1,28, a altura de referência (`alturaRef`) dele deve ficar perto de 525 px.
Conta de ordem de grandeza, ainda não medida: 54 quadros × cerca de 220 mil px² dá uns 12 milhões de px²; com
aproveitamento de ~80% no empacotamento, são **3 a 4 páginas de 2048²** (C1 v2, `plano-expansao.md` §1.4). Sugestão de
agrupamento por uso, para facilitar a depuração:

| Página | Conteúdo |
|---|---|
| 0 | movimento: idle, andar, agachar, defesa, pulo, aterrissagem |
| 1 | reações e golpes normais |
| 2 | especiais (sa, sb, sc), `jkick`, `jpunch` |
| 3 | fase 2 (`devekh`, `dive`) e `win`; só é usada na luta de chefe e no final |

O empacotador real da F2 confirma o número de páginas. Se o total couber em 3, juntar as páginas 2 e 3.

---

## 8. Cenários (6 imagens: Japão + 5 novos)

**Formato medido nos cenários que já existem em `arte-fonte/cenarios/`:** 2752 × 1536 px (paisagem, quase 16:9). Peça
16:9 na maior resolução disponível. O pipeline corta para 1920×1080.

**Linha do chão:** no jogo, os pés ficam em `GROUND = 470` de 540, ou seja, **a 87% da altura a partir do topo**. No
cenário atual do Japão, o piso de madeira começa a uns 70% da altura (base do parapeito) e vai até embaixo. Esse é o
modelo: chão plano e livre do meio para baixo, o "palco" visual acima disso.

**BLOCO CENÁRIO (cole antes da descrição de cada cenário):**
```
Wide 2D fighting game stage background, hand-painted anime style matching a modern hand-drawn arcade fighting game, rich detail, cinematic lighting. Landscape image, aspect ratio 16:9. Straight side-on view at eye level, like a camera facing the scene; horizon roughly in the middle of the image.
The floor where the fighters stand is a flat, open, walkable surface. The back edge of this floor is at about 70% of the image height, and the floor continues to the bottom edge. The horizontal line at 87% of the image height (from the top) must be on clear flat floor across the full width. Nothing stands on the floor between 70% and 100% of the height except at the far left and far right edges.
Keep the central area behind the fighters (from 35% to 87% of the height, middle half of the width) readable and not too busy; put the landmarks in the upper part and at the sides.
NO people, NO characters in the foreground, NO text, NO logos, NO signs with readable words, NO UI.
```

**6 descrições (uma por imagem):**

1. **Japão — HAYATO** (`jp`, substitui o atual)
```
STAGE: Cherry Blossom Castle, Japan, at sunset. Floor: polished dark wooden plank deck, slightly wet and reflective, a few fallen petals. Behind the deck, a low wooden railing. A white-walled Japanese castle keep with dark curved roofs on stone foundations in the background left, cherry blossom trees framing the left and right edges, paper lanterns glowing on ropes, a red arched wooden bridge at the right edge, a distant snow-capped volcano, dramatic orange and violet clouds.
```

2. **Nigéria — AMINU** (`ng`)
```
STAGE: The ancient indigo dye pits of Kano, northern Nigeria, late afternoon. Floor: flat compacted reddish earth. Behind the fighting area (not on it), several round dye pits rimmed with hardened earth, lengths of deep indigo-dyed cloth drying on wooden lines and laid at the sides, clay pots. In the background, the tall red-earth city wall and traditional Hausa mud buildings with decorative pointed pinnacles on the rooftops. Golden dusty light, warm sky with a few clouds.
```

3. **México — CENTELLA** (`mx`)
```
STAGE: Inside a lucha libre arena in Mexico City at night, seen from inside the ring. Floor: the ring's flat light-gray canvas mat. Three red ropes run horizontally behind the fighters at the back of the ring; padded ring posts at the far left and far right edges. Beyond the ropes, a packed dark arena with bleachers in soft focus, the crowd only as distant blurred silhouettes with no detailed faces. Colorful papel picado banners hanging above, neon lights (no readable text), bright spotlights from above lighting the ring.
```

4. **França — CAMILLE** (`fr`)
```
STAGE: The Old Port of Marseille, France, at dawn. Floor: flat light-stone quay pavement. Iron mooring bollards only at the far left and right edges. Behind, the harbor water with small colorful wooden fishing boats and white sailboat masts, pastel old buildings around the harbor, and on a distant hill a Romanesque-Byzantine basilica with a golden statue on its bell tower. Pink-gold dawn sky, light wind making small pennant flags flutter.
```

5. **Índia — NILA** (`in`)
```
STAGE: Fort Kochi waterfront, Kerala, India, at sunset during the monsoon season. Floor: flat weathered stone and laterite embankment walkway, wet and reflective from recent rain. Behind it, the water with several giant cantilevered wooden Chinese fishing nets silhouetted against a dramatic orange and violet sky with heavy monsoon clouds, small wooden fishing boats, coconut palms only at the far left and right edges.
```

6. **Mongólia — BAATAR** (`mn`, arena do chefão)
```
STAGE: Open Mongolian steppe during the Naadam festival, late afternoon. Floor: short green-gold grass on flat ground. NO walls, NO fences, NO ring: the plain stretches open to the horizon on both sides. Far in the background, a few white gers (yurts), a line of small horses galloping across the plain raising dust, gentle rolling hills on the horizon. A vast deep-blue sky with a dark storm front approaching from one side, golden sunlight on the grass, a single eagle soaring high.
```

Nota de respeito cultural nos cenários: o da Índia não usa altar nem templo (o kalari é espaço sagrado), e o da Mongólia
não usa os montes de pedra rituais nem os estandartes sagrados.

---

## 9. Prompts de correção (quando a folha vier quase boa)

Envie na mesma conversa, anexando a imagem com defeito e escrevendo "Edit this image:" antes. **Um defeito por vez.**
Troque `[COR]` pelo fundo do lutador (`#00FF00` ou `#FF00FF`), `[R]` pela linha e `[C]` pela coluna (contando de 1, a
partir do canto superior esquerdo).

| Defeito | Prompt |
|---|---|
| Fundo com degradê, chão ou sombra | `Edit this image: replace the entire background with one perfectly flat solid [COR] color. Remove any floor, ground shadow, cast shadow, gradient or vignette. Do not change the figures.` |
| Fundo xadrez ("transparente") | `Edit this image: the background must be one flat solid [COR] color, not a transparency checkerboard. Do not change the figures.` |
| Efeitos desenhados (brilho, fogo, raio, rastro) | `Edit this image: remove every visual effect (glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, dust, impact marks). Fill those areas with the flat [COR] background. Keep the poses and the character exactly the same.` |
| Texto, números, linhas de grade, molduras | `Edit this image: remove all text, numbers, labels, grid lines, borders and frames. Keep everything else exactly the same.` |
| Uma figura virada para a esquerda | `Edit this image: redraw only the figure in row [R], column [C] so it faces RIGHT, same pose, same size, same position. Do not change the other figures.` |
| Tamanhos diferentes entre as figuras | `Edit this image: make every standing figure the same height as the figure in row 1, column 1, and put the feet of every grounded pose on the same baseline in each row. Do not change the poses.` |
| Traje mudou numa célula | `Edit this image: in row [R], column [C], fix the costume to match the attached reference image exactly: [descreva o detalhe, ex.: "long front panel reaching the shins"]. Do not change the pose.` |
| Figuras encostando ou cortadas na borda | `Generate again with more spacing. IMPORTANT SPACING: each figure is only about 70% of the height of its row, with an empty band of plain background at least 8% of the image height between rows and along the top and bottom edges. Feet and toes are never cut off and never touch the image border; no figure touches another.` |
| Desenhou um adversário (em agarrões) | `Edit this image: remove the second person. Show only the main character performing the move against empty space, same pose.` |
| Número errado de figuras | `Generate again: exactly 12 figures in 4 columns and 3 rows (6 figures in 3 columns and 2 rows for BAATAR), one per cell.` |
| Estilo virou 3D ou foto | `Keep exactly the same 2D hand-drawn cel-shaded anime style as the attached reference image. Not 3D, not a photo, not painterly.` |
| Mãos ou membros deformados | `Edit this image: fix the hands in row [R], column [C]: five fingers, natural anatomy, same pose.` |
| AMINU com a corda na mão errada | `Edit this image: in row [R], column [C], the rope wrap must be on the REAR fist (the hand farther from the right side) and the lead hand must be bare and open.` |
| CENTELLA sem máscara | `Edit this image: in row [R], column [C], she must wear her full turquoise-jade mask with the silver spark design, exactly like the reference.` |

Se uma edição mudar a imagem inteira (rosto novo, poses novas), descarte o resultado e volte à versão anterior.

**Nocaute com a cabeça à direita, ou figura que só precisa ser espelhada ou movida: NÃO use prompt de correção.** No
Runway a edição pontual ignorou a instrução e criou uma cabeça fantasma (MIN-JI, folha 2). O Atlas espelha a figura por
código (componente conexo sobre o fundo chapado, alinhada pela base) e salva como versão nova; as outras figuras ficam
idênticas. Foi assim que saiu `min-ji-f2-reacoes-v2.png`; a `hayato-f2-reacoes-v1.png` repetiu o defeito e a v2 traz o
nocaute com a cabeça à esquerda.

---

## 10. Checklist de aceite (confira antes de me enviar cada folha)

**Folha de lutador**
- [ ] 12 figuras em 4 colunas × 3 linhas (BAATAR: 6 figuras em 3 × 2), bem espaçadas, nenhuma encostando em outra nem na borda.
- [ ] Faixa vazia entre as fileiras e nas bordas de cima e de baixo; nenhum pé, dedo ou punho cortado.
- [ ] No andar, pelo menos um pé no chão em cada quadro; no nocaute, a cabeça à **esquerda** (se vier à direita, o Atlas espelha por código).
- [ ] Todas viradas para a **direita** (exceto as quedas, que caem para a esquerda, como pedido).
- [ ] Todas do mesmo tamanho; os pés de cada linha na mesma altura.
- [ ] Fundo de **uma cor só**, chapada, sem degradê, sem chão, sem sombra, sem xadrez.
- [ ] Nenhum texto, número, linha de grade ou moldura.
- [ ] Nenhum efeito: brilho, fogo, raio, faísca, rastro, poeira.
- [ ] Mesmo rosto, cabelo e traje da imagem-mestra em **todas** as células. Conferir os pontos de cada um:
  - WEI LONG: painel longo até a canela, braçadeiras pretas, coque branco;
  - MIN-JI: laço vermelho no rabo de cavalo, gola preta, luvas vermelhas;
  - HAYATO (A2): gi cinza-grafite (nunca branco) com gola e barra amarelas, mecha de raio amarela, faixa verde com duas pontas, faixa preta de bordas amarelas, mãos enfaixadas de branco;
  - AMINU: corda na mão de **trás**, mão da frente aberta e nua, faixa creme com bordado cobre;
  - CENTELLA: **máscara sempre**, botas altas, joelheiras pretas;
  - CAMILLE: **sapatos sempre**, macacão azul-marinho com faixas prata, luvas prata;
  - NILA: trança longa, faixa vermelho-terra, barra dourada;
  - BAATAR: casaco vermelho aberto no peito, calção azul-escuro, botas de bico virado, **sem chapéu**.
- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.

**Cenário**
- [ ] 16:9, sem pessoas em primeiro plano, sem texto legível.
- [ ] Chão plano e livre da faixa de 70% da altura até embaixo; a linha a 87% cai em chão limpo de ponta a ponta.
- [ ] Área central atrás dos lutadores sem poluição visual.

---

## 11. Nomes dos arquivos, pastas e o que me enviar

**Pastas** (já existem para os 4 atuais; crie as dos novos com o mesmo padrão):
- folhas e imagem-mestra: `arte-fonte/lutadores/<id>/folhas/`
- efeitos: `arte-fonte/lutadores/<id>/fx/`
- cenários: `arte-fonte/cenarios/`

**ids:** `wei-long`, `min-ji`, `hayato`, `aminu`, `centella`, `camille`, `nila`, `baatar`.

**Nomes:**
- imagem-mestra: `<id>-mestra-v1.png`
- folhas: `<id>-f1-base-v1.png`, `<id>-f2-reacoes-v1.png`, `<id>-f3-golpes-v1.png`, `<id>-f4-especiais-v1.png`,
  `<id>-f5-extras-v1.png` (BAATAR: `baatar-b1-v1.png` … `baatar-b9-v1.png`)
- versões corrigidas: troque o final para `-v2`, `-v3`. **Não apague** as versões anteriores.
- cenários: `cenario-<sigla>-v1.png` com as siglas `jp`, `ng`, `mx`, `fr`, `in`, `mn`.

**Como enviar:**
- Sempre o **arquivo original baixado do Gemini**, na resolução máxima. Nunca um print da tela (perde resolução e
  muda as cores do fundo).
- Coloque o arquivo na pasta certa e avise o Atlas na conversa com uma linha, por exemplo: "folha 1 da MIN-JI na
  pasta, v1".
- Ordem de envio:
  1. WEI LONG f4 editada;
  2. MIN-JI: mestra, depois f1 (**espere meu OK**), depois f2, f3 e f4;
  3. HAYATO (traje A2, mestra já aprovada): f1 (**espere meu OK**), f2 a f4 e o cenário `jp`;
  4. AMINU, CENTELLA, CAMILLE, NILA, um de cada vez, no mesmo ritmo;
  5. BAATAR: mestra, B1 (**espere meu OK**), B2 a B9;
  6. cenários novos quando quiser; eles não dependem dos lutadores.
- Eu reviso cada folha (traje célula por célula, fundo, espaçamento) e respondo com "aprovada" ou com o prompt de
  correção exato.

---

## 12. Efeitos à parte (opcional; a Lyra decide se usa)

Os golpes especiais já têm efeitos desenhados pelo próprio jogo (D2). Se a Lyra quiser uma arte de efeito pintada,
gere **separada**, em fundo **preto puro**: o jogo soma a luz por cima e o preto some sozinho. Não use o BLOCO A aqui.

```
2D fighting game visual effect sprite, cel-shaded with a soft inner glow, side view moving to the RIGHT, pure black background #000000, no character, no ground, no text. 4 animation frames in one horizontal row, evenly spaced. Effect: [EFFECT].
```

| Lutador | `[EFFECT]` |
|---|---|
| WEI LONG | `a glowing violet chi dragon head projectile with open jaws and a flame-like mane trailing left` |
| HAYATO | `a crackling electric-yellow and white thunder sphere with small lightning arcs` |
| MIN-JI | `a curved pink-crimson crescent blade of fire` |
| AMINU | `deep indigo energy gathering around a fist, growing in 3 sizes, with a copper rim light` |
| CENTELLA | `turquoise-jade sparks bursting outward in a star shape` |
| CAMILLE | `a thin silver-white slash arc like the trail of a fencing blade` |
| NILA | `a small amber lamp-flame ripple spreading from a single pressure point` |
| BAATAR | `ember-red and gold wind swirling like eagle wings` |

---

## 13. Rascunho dos finais do Arcade dos 4 atuais (decisão 14, para aprovação)

Contexto: o arco "A Volta ao Mundo" (`proposta-expansao.md` §2.7). Depois da derrota, o BAATAR entrega o Cinturão do
Torneio ao vencedor. Cada final tem 2 ou 3 frases, para caber na tela de encerramento.

- **HAYATO:** De volta ao Castelo das Cerejeiras, HAYATO pendura o cinturão no velho dojo do avô e, pela primeira vez, não
  sai para treinar sozinho. Abre as portas para as crianças do bairro: "O trovão não mora no punho. Mora em quem volta
  todo dia."
- **WEI LONG:** No Templo da Montanha, WEI LONG coloca o cinturão nas mãos do discípulo mais jovem, que tenta devolvê-lo.
  "O ferro esfria, menino. O dragão continua." Na manhã seguinte, o campeão mais velho da história do torneio já está
  treinando de novo, antes do sol.
- **MIN-JI:** Diante do Palácio de Seul, MIN-JI faz uma demonstração para a academia onde começou, aos sete anos. A
  menina da primeira fila não pede autógrafo: pede para ser chutada mais alto. MIN-JI ri. Encontrou a próxima rival.
- **CAIO:** Ao pôr do sol em Copacabana, CAIO põe o cinturão no meio da roda e chama o berimbau. Quem entra para jogar é
  o próprio BAATAR, enorme e desajeitado, aprendendo a ginga sob os aplausos da praia. "No ano que vem, ele volta mais
  perigoso."
