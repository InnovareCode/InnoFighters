# 05 — CENTELLA

Gerado por script a partir de `docs/prompts-arte.md` (fonte). Cada prompt abaixo está **completo**: copie o bloco inteiro.
Gerador: **Runway, Nano Banana 2.1, paisagem 4:3, 2K** (a imagem-mestra é retrato 3:4). **Uma só imagem de referência**
por prompt, a indicada em "Anexar". Nunca peça "fundo transparente". Todo prompt de folha nova já traz o bloco IMPORTANT
SPACING (figura com cerca de 70% da fileira, faixa vazia de pelo menos 8%, pés nunca cortados) e a regra de pelo menos
um pé no chão no andar.

| Campo | Valor |
|---|---|
| id | `centella` |
| País / estilo | México (Cidade do México) / lucha libre |
| Cor de fundo | magenta `#FF00FF` — o traje é **turquesa-jade (verde-água)**: no verde, o recorte apagaria a roupa e a máscara |
| Pasta das folhas | `arte-fonte/lutadores/centella/folhas/` |
| Pasta dos efeitos | `arte-fonte/lutadores/centella/fx/` |
| Versões corrigidas | troque `-v1` por `-v2`, `-v3`; não apague as anteriores |

Ficha completa (personalidade, cultura, mecânicas) em `docs/proposta-expansao.md` §2.3 e `docs/mecanicas-e3.md`. **Tudo liberado** (mecânicas ED-M1 a ED-M10 aprovadas pelo dono em 2026-10-20). Fundo **magenta** `#FF00FF` em toda imagem deste lutador.

## Prompts, na ordem de geração

### Prompt 1 — imagem-mestra

- **Anexar:** nada (é a primeira imagem deste lutador)
- **Salvar como:** `centella-mestra-v1.png`
- **Checagem rápida:** um único desenho de corpo inteiro, virado para a direita, traje correto, fundo chapado. Mostre ao dono antes de seguir.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.
```

### Prompt 2 — folha 1 — base (respiração e andar)

- **Anexar:** `centella-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas)
- **Salvar como:** `centella-f1-base-v1.png`
- **Checagem rápida:** linha 1 com os pés parados nas 4 figuras; linhas 2 e 3 formam um passo contínuo, sempre com um pé no chão (nenhum quadro de pulo); nenhum pé cortado na fileira de baixo. É a folha que valida o traje.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

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

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.

SHEET 1 — BASE.
Row 1: four frames of an idle breathing loop in the character's fighting stance: (1) neutral, (2) chest slightly raised, (3) chest fully raised, shoulders up a little, (4) chest coming down. Feet do not move between these four frames.
Row 2: walk cycle forward, frames 1 to 4: (1) front foot reaching forward, (2) weight passing over front foot, (3) back foot passing, (4) back foot planting. Guard stays up. At least one foot flat on the baseline in every frame: small walking steps, never jumping.
Row 3: walk cycle forward, frames 5 to 8: same motion with the other leg, ending one step before frame 1, so the 8 frames loop smoothly. At least one foot flat on the baseline in every frame.
```

### Prompt 3 — folha 2 — movimento e reações

- **Anexar:** `centella-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `centella-f1-base` aprovada, também sozinha)
- **Salvar como:** `centella-f2-reacoes-v1.png`
- **Checagem rápida:** linha 3: os golpes recebidos jogam o corpo para a ESQUERDA, e no nocaute a cabeça fica à ESQUERDA. Se o nocaute vier com a cabeça à direita, não gere de novo nem corrija pelo gerador: o Atlas espelha só essa figura por código e salva como `-v2`.

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

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.

SHEET 2 — MOVEMENT AND REACTIONS.
Row 1: (1) deep crouch with guard up, (2) standing block: forearms raised in front of the face, body leaning slightly back, (3) crouching block: crouched, forearms up, (4) pre-jump squat: knees bent, about to jump.
Row 2: (1) jump rising: body going up, knees starting to tuck, (2) jump apex: knees fully tucked, guard up, (3) jump falling: legs extending down to land, (4) landing: knees bent absorbing impact.
Row 3: (1) hit in the face: head snapped back, eyes shut, body recoiling to the LEFT, (2) hit in the stomach: doubled over forward, (3) knocked into the air: body almost horizontal, flying backward to the LEFT, head on the left side, (4) knocked out: lying flat on the back on the baseline, head on the LEFT side of the cell, feet pointing to the RIGHT, eyes closed (the head is at the left end of the body, never at the right end).
```

### Prompt 4 — folha 3 — golpes normais

- **Anexar:** `centella-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `centella-f1-base` aprovada, também sozinha)
- **Salvar como:** `centella-f3-golpes-v1.png`
- **Checagem rápida:** golpes bem estendidos sem encostar na figura vizinha; na linha 3, a rasteira com a perna esticada rente ao chão.

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

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.

SHEET 3 — NORMAL ATTACKS.
Row 1: (1) light punch start, (2) light punch fully extended at face height, (3) heavy punch wind-up, (4) heavy punch fully extended, hips and shoulders rotated into it.
Row 2: (1) light kick chambered knee, (2) light kick extended at stomach height, (3) heavy kick chambered, (4) heavy kick fully extended at head height.
Row 3: (1) crouching light punch, (2) crouching low kick at shin height, (3) low sweep: crouched on one leg, other leg fully extended along the floor, (4) crouching uppercut rising toward the sky, anti-air.
```

### Prompt 5 — folha 4 — golpes especiais

- **Anexar:** `centella-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `centella-f1-base` aprovada, também sozinha)
- **Salvar como:** `centella-f4-especiais-v1.png`
- **Checagem rápida:** linha 1: salto e corpo horizontal de barriga para baixo; linha 2: pernas cruzadas como numa tesoura, sem adversário desenhado; máscara em todas as células.

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

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.

SHEET 4 — SPECIAL MOVES.
Row 1 (body splash): (1) deep crouch, arms back, about to leap, (2) leaping high, arms spread wide, rising, (3) in the air, body flat and horizontal, belly down, arms and legs spread, falling forward, (4) landing in a low crouch, one hand touching the ground.
Row 2 (aerial leg-scissor takedown, no opponent drawn): (1) jumping straight up, arms reaching forward and up, (2) in the air at head height, legs scissored together as if locked around an opponent's neck, upper body arching back, (3) upside down in a backflip rotation, legs whipping over, (4) landing on one knee, arms open to the crowd.
Row 3: (1) rope rebound: running fast, leaning forward, arms pumping, (2) flying crossbody: body horizontal in the air, arms stretched forward, (3) jumping dropkick: in the air, both feet together striking forward, body tilted back, (4) victory: standing on her toes, one arm raised with index finger up, other hand on hip, mask on.
```

### Prompt 6 — folha 5 — extras (opcional)

*Opcional: recomendada, mas não bloqueia a entrada do lutador no jogo.*

- **Anexar:** `centella-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `centella-f1-base` aprovada, também sozinha)
- **Salvar como:** `centella-f5-extras-v1.png`
- **Checagem rápida:** linha 3: duas variações de guarda, provocação de braços cruzados e reverência; máscara em todas as células. (O salto na parede foi cortado pela ED-M2.)

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

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Fighting stance: crouched wrestling stance, hands open forward ready to grapple, bouncing on her toes. Background color: solid flat magenta #FF00FF.

SHEET 5 — EXTRAS.
Row 1: (1) jumping punch: in the air, knees tucked, fist striking diagonally downward, (2) getting up from the floor: on one knee pushing up, (3) hit while crouching, (4) time-over loss: exhausted, hands on knees.
Row 2: (1) throw start: both hands grabbing forward at chest height as if seizing an opponent's collar (no opponent drawn), (2) throw: body turning, arms pulling across to the left as if tossing someone behind, (3) victory taunt variant, (4) intro pose before the fight.
Row 3: (1) and (2) two idle variants with small arm differences, mask on, (3) taunt: arms crossed in front of her mask, (4) bowing to the crowd with one hand on her chest.
```

### Prompt 7 — efeito à parte (opcional; a Lyra decide se usa)

*Opcional: só gere se o Atlas pedir.*

- **Anexar:** nada
- **Salvar como:** `centella-fx-v1.png` na pasta `fx/`
- **Checagem rápida:** fundo preto puro, 4 quadros em fila, nenhum personagem.

```
2D fighting game visual effect sprite, cel-shaded with a soft inner glow, side view moving to the RIGHT, pure black background #000000, no character, no ground, no text. 4 animation frames in one horizontal row, evenly spaced. Effect: turquoise-jade sparks bursting outward in a star shape.
```

## Prompts de correção (já com o traje e o fundo deste lutador)

No Runway, passe **só a imagem com defeito** como referência (uma imagem por prompt). **Um defeito por vez.** Onde aparecer
`[R]` e `[C]`, troque pelo número da linha e da coluna da figura com problema, contando de 1 a partir do canto superior esquerdo.

**Nocaute com a cabeça à direita, ou figura que só precisa ser espelhada ou movida: não use prompt.** A edição pontual no
Runway ignora a instrução e cria artefatos (cabeça fantasma na MIN-JI). O Atlas espelha a figura por código e salva como versão nova.

#### Correção 1 — Fundo com degradê, chão ou sombra

```
Edit this image: replace the entire background with one perfectly flat solid #FF00FF color. Remove any floor, ground shadow, cast shadow, gradient or vignette. Do not change the figures.
```

#### Correção 2 — Fundo xadrez ("transparente")

```
Edit this image: the background must be one flat solid #FF00FF color, not a transparency checkerboard. Do not change the figures.
```

#### Correção 3 — Efeitos desenhados (brilho, fogo, raio, rastro)

```
Edit this image: remove every visual effect (glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, dust, impact marks). Fill those areas with the flat #FF00FF background. Keep the poses and the character exactly the same.
```

#### Correção 4 — Texto, números, linhas de grade, molduras

```
Edit this image: remove all text, numbers, labels, grid lines, borders and frames. Keep everything else exactly the same.
```

#### Correção 5 — Uma figura virada para a esquerda

```
Edit this image: redraw only the figure in row [R], column [C] so it faces RIGHT, same pose, same size, same position. Do not change the other figures.
```

#### Correção 6 — Tamanhos diferentes entre as figuras

```
Edit this image: make every standing figure the same height as the figure in row 1, column 1, and put the feet of every grounded pose on the same baseline in each row. Do not change the poses.
```

#### Correção 7 — Traje mudou numa célula

```
Edit this image: in row [R], column [C], fix the costume to match the attached reference image exactly: full turquoise-jade mask with the silver spark design always on, high turquoise-and-silver boots, black knee pads. Do not change the pose.
```

#### Correção 8 — Figuras encostando ou cortadas na borda

```
Generate again with more spacing. IMPORTANT SPACING: each figure is only about 70% of the height of its row, with an empty band of plain background at least 8% of the image height between rows and along the top and bottom edges. Feet and toes are never cut off and never touch the image border; no figure touches another.
```

#### Correção 9 — Desenhou um adversário (em agarrões)

```
Edit this image: remove the second person. Show only the main character performing the move against empty space, same pose.
```

#### Correção 10 — Número errado de figuras

```
Generate again: exactly 12 figures in 4 columns and 3 rows, one per cell.
```

#### Correção 11 — Estilo virou 3D ou foto

```
Keep exactly the same 2D hand-drawn cel-shaded anime style as the attached reference image. Not 3D, not a photo, not painterly.
```

#### Correção 12 — Mãos ou membros deformados

```
Edit this image: fix the hands in row [R], column [C]: five fingers, natural anatomy, same pose.
```

#### Correção 13 — CENTELLA sem máscara

```
Edit this image: in row [R], column [C], she must wear her full turquoise-jade mask with the silver spark design, exactly like the reference.
```

Se uma edição mudar a imagem inteira (rosto novo, poses novas), descarte o resultado e volte à versão anterior.

## Checklist de aceite (confira antes de enviar cada folha)

- [ ] 12 figuras em 4 colunas × 3 linhas, bem espaçadas, nenhuma encostando em outra nem na borda.
- [ ] Faixa vazia entre as fileiras e nas bordas de cima e de baixo; nenhum pé, dedo ou punho cortado.
- [ ] No andar, pelo menos um pé no chão em cada quadro (passo, nunca pulo).
- [ ] Todas viradas para a **direita** (as quedas caem para a esquerda, como pedido).
- [ ] Nocaute com a cabeça à **esquerda**. Se vier à direita, não corrija pelo gerador: o Atlas espelha a figura por código.
- [ ] Todas do mesmo tamanho; os pés de cada linha na mesma altura.
- [ ] Fundo de **uma cor só** (magenta `#FF00FF`), chapada, sem degradê, sem chão, sem sombra, sem xadrez.
- [ ] Nenhum texto, número, linha de grade ou moldura.
- [ ] Nenhum efeito: brilho, fogo, raio, faísca, rastro, poeira.
- [ ] Mesmo rosto, cabelo e traje da imagem-mestra em **todas** as células: máscara turquesa SEMPRE, botas altas turquesa e prata, joelheiras pretas.
- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.
- [ ] Arquivo original baixado do Runway (nunca print), salvo com o nome indicado no prompt, sem sobrescrever versão anterior.
