# 04 — AMINU

Gerado por script a partir de `docs/prompts-arte.md` (fonte). Cada prompt abaixo está **completo**: copie o bloco inteiro.
Gerador: **Runway, Nano Banana 2.1, paisagem 4:3, 2K** (a imagem-mestra é retrato 3:4). **Uma só imagem de referência**
por prompt, a indicada em "Anexar". Nunca peça "fundo transparente". Todo prompt de folha nova já traz o bloco IMPORTANT
SPACING (figura com cerca de 70% da fileira, faixa vazia de pelo menos 8%, pés nunca cortados) e a regra de pelo menos
um pé no chão no andar.

| Campo | Valor |
|---|---|
| id | `aminu` |
| País / estilo | Nigéria (Kano) / dambe |
| Cor de fundo | verde `#00FF00` — o índigo do calção tem componente azul-violeta, próximo do magenta; creme e cobre ficam longe do verde |
| Pasta das folhas | `arte-fonte/lutadores/aminu/folhas/` |
| Pasta dos efeitos | `arte-fonte/lutadores/aminu/fx/` |
| Versões corrigidas | troque `-v1` por `-v2`, `-v3`; não apague as anteriores |

Ficha completa (personalidade, cultura, mecânicas) em `docs/proposta-expansao.md` §2.3 e `docs/mecanicas-e3.md`. **Tudo liberado** (mecânicas ED-M1 a ED-M10 aprovadas pelo dono em 2026-10-20). Fundo **verde** `#00FF00` em toda imagem deste lutador.

## Prompts, na ordem de geração

### Prompt 1 — imagem-mestra

- **Anexar:** nada (é a primeira imagem deste lutador)
- **Salvar como:** `aminu-mestra-v1.png`
- **Checagem rápida:** um único desenho de corpo inteiro, virado para a direita, traje correto, fundo chapado. Mostre ao dono antes de seguir.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.
```

### Prompt 2 — folha 1 — base (respiração e andar)

- **Anexar:** `aminu-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas)
- **Salvar como:** `aminu-f1-base-v1.png`
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

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.

SHEET 1 — BASE.
Row 1: four frames of an idle breathing loop in the character's fighting stance: (1) neutral, (2) chest slightly raised, (3) chest fully raised, shoulders up a little, (4) chest coming down. Feet do not move between these four frames.
Row 2: walk cycle forward, frames 1 to 4: (1) front foot reaching forward, (2) weight passing over front foot, (3) back foot passing, (4) back foot planting. Guard stays up. At least one foot flat on the baseline in every frame: small walking steps, never jumping.
Row 3: walk cycle forward, frames 5 to 8: same motion with the other leg, ending one step before frame 1, so the 8 frames loop smoothly. At least one foot flat on the baseline in every frame.
```

### Prompt 3 — folha 2 — movimento e reações

- **Anexar:** `aminu-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `aminu-f1-base` aprovada, também sozinha)
- **Salvar como:** `aminu-f2-reacoes-v1.png`
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

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.

SHEET 2 — MOVEMENT AND REACTIONS.
Row 1: (1) deep crouch with guard up, (2) standing block: forearms raised in front of the face, body leaning slightly back, (3) crouching block: crouched, forearms up, (4) pre-jump squat: knees bent, about to jump.
Row 2: (1) jump rising: body going up, knees starting to tuck, (2) jump apex: knees fully tucked, guard up, (3) jump falling: legs extending down to land, (4) landing: knees bent absorbing impact.
Row 3: (1) hit in the face: head snapped back, eyes shut, body recoiling to the LEFT, (2) hit in the stomach: doubled over forward, (3) knocked into the air: body almost horizontal, flying backward to the LEFT, head on the left side, (4) knocked out: lying flat on the back on the baseline, head on the LEFT side of the cell, feet pointing to the RIGHT, eyes closed (the head is at the left end of the body, never at the right end).
```

### Prompt 4 — folha 3 — golpes normais

- **Anexar:** `aminu-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `aminu-f1-base` aprovada, também sozinha)
- **Salvar como:** `aminu-f3-golpes-v1.png`
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

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.

SHEET 3 — NORMAL ATTACKS.
Row 1: (1) light punch start, (2) light punch fully extended at face height, (3) heavy punch wind-up, (4) heavy punch fully extended, hips and shoulders rotated into it.
Row 2: (1) light kick chambered knee, (2) light kick extended at stomach height, (3) heavy kick chambered, (4) heavy kick fully extended at head height.
Row 3: (1) crouching light punch, (2) crouching low kick at shin height, (3) low sweep: crouched on one leg, other leg fully extended along the floor, (4) crouching uppercut rising toward the sky, anti-air.
```

### Prompt 5 — folha 4 — golpes especiais

- **Anexar:** `aminu-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `aminu-f1-base` aprovada, também sozinha)
- **Salvar como:** `aminu-f4-especiais-v1.png`
- **Checagem rápida:** linha 1: soco da mão com corda, recuado e depois estendido; linha 2: palma aberta da mão nua empurrando para a frente; a corda continua na mão de trás em todas as células.

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

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.

SHEET 4 — SPECIAL MOVES.
Row 1 (charged spear punch): (1) starting the charge: rope-wrapped fist pulled back to the hip, open lead hand forward, weight shifting back, (2) full charge: body coiled tight, weight on the back foot, wrapped fist drawn far back, jaw clenched, (3) release: the rope-wrapped fist fully extended in a straight punch at face height, whole body behind it, lead hand pulled back, (4) follow-through, recovering to stance.
Row 2 (shield hand): (1) small step in, lead hand rising, (2) open lead palm thrust straight forward at chest height, fingers spread, like a shield, body behind it, (3) holding the shield palm firm, wrapped fist ready at the cheek, (4) returning to stance.
Row 3: (1) lion step start: low forward crouch, shield hand forward, (2) lion step rush: body lunging forward low, open shield hand pushing forward at chest height, wrapped fist cocked, (3) jumping kick: in the air, front foot striking diagonally downward, (4) victory: rope-wrapped fist raised high to the crowd, other hand on the chest, big smile.
```

### Prompt 6 — folha 5 — extras (opcional)

*Opcional: recomendada, mas não bloqueia a entrada do lutador no jogo.*

- **Anexar:** `aminu-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `aminu-f1-base` aprovada, também sozinha)
- **Salvar como:** `aminu-f5-extras-v1.png`
- **Checagem rápida:** linha 1 começa com o soco no ar; linha 2 com o agarrão sem adversário desenhado.

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

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. Fighting stance: low, wide, side-on stance, the open lead hand extended forward, the rope-wrapped fist cocked back beside the cheek. The rope wrap is always on the rear hand in every pose. Background color: solid flat pure green #00FF00.

SHEET 5 — EXTRAS.
Row 1: (1) jumping punch: in the air, knees tucked, fist striking diagonally downward, (2) getting up from the floor: on one knee pushing up, (3) hit while crouching, (4) time-over loss: exhausted, hands on knees.
Row 2: (1) throw start: both hands grabbing forward at chest height as if seizing an opponent's collar (no opponent drawn), (2) throw: body turning, arms pulling across to the left as if tossing someone behind, (3) victory taunt variant, (4) intro pose before the fight.
Row 3: (1) taunt: tapping his wrapped fist against his open palm, (2) to (4) three idle variants with small arm differences.
```

### Prompt 7 — efeito à parte (opcional; a Lyra decide se usa)

*Opcional: só gere se o Atlas pedir.*

- **Anexar:** nada
- **Salvar como:** `aminu-fx-v1.png` na pasta `fx/`
- **Checagem rápida:** fundo preto puro, 4 quadros em fila, nenhum personagem.

```
2D fighting game visual effect sprite, cel-shaded with a soft inner glow, side view moving to the RIGHT, pure black background #000000, no character, no ground, no text. 4 animation frames in one horizontal row, evenly spaced. Effect: deep indigo energy gathering around a fist, growing in 3 sizes, with a copper rim light.
```

## Prompts de correção (já com o traje e o fundo deste lutador)

No Runway, passe **só a imagem com defeito** como referência (uma imagem por prompt). **Um defeito por vez.** Onde aparecer
`[R]` e `[C]`, troque pelo número da linha e da coluna da figura com problema, contando de 1 a partir do canto superior esquerdo.

**Nocaute com a cabeça à direita, ou figura que só precisa ser espelhada ou movida: não use prompt.** A edição pontual no
Runway ignora a instrução e cria artefatos (cabeça fantasma na MIN-JI). O Atlas espelha a figura por código e salva como versão nova.

#### Correção 1 — Fundo com degradê, chão ou sombra

```
Edit this image: replace the entire background with one perfectly flat solid #00FF00 color. Remove any floor, ground shadow, cast shadow, gradient or vignette. Do not change the figures.
```

#### Correção 2 — Fundo xadrez ("transparente")

```
Edit this image: the background must be one flat solid #00FF00 color, not a transparency checkerboard. Do not change the figures.
```

#### Correção 3 — Efeitos desenhados (brilho, fogo, raio, rastro)

```
Edit this image: remove every visual effect (glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, dust, impact marks). Fill those areas with the flat #00FF00 background. Keep the poses and the character exactly the same.
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
Edit this image: in row [R], column [C], fix the costume to match the attached reference image exactly: rope wrap only on the REAR fist, bare open lead hand, cream waist sash with copper embroidery, indigo shorts. Do not change the pose.
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

#### Correção 13 — AMINU com a corda na mão errada

```
Edit this image: in row [R], column [C], the rope wrap must be on the REAR fist (the hand farther from the right side) and the lead hand must be bare and open.
```

Se uma edição mudar a imagem inteira (rosto novo, poses novas), descarte o resultado e volte à versão anterior.

## Checklist de aceite (confira antes de enviar cada folha)

- [ ] 12 figuras em 4 colunas × 3 linhas, bem espaçadas, nenhuma encostando em outra nem na borda.
- [ ] Faixa vazia entre as fileiras e nas bordas de cima e de baixo; nenhum pé, dedo ou punho cortado.
- [ ] No andar, pelo menos um pé no chão em cada quadro (passo, nunca pulo).
- [ ] Todas viradas para a **direita** (as quedas caem para a esquerda, como pedido).
- [ ] Nocaute com a cabeça à **esquerda**. Se vier à direita, não corrija pelo gerador: o Atlas espelha a figura por código.
- [ ] Todas do mesmo tamanho; os pés de cada linha na mesma altura.
- [ ] Fundo de **uma cor só** (verde `#00FF00`), chapada, sem degradê, sem chão, sem sombra, sem xadrez.
- [ ] Nenhum texto, número, linha de grade ou moldura.
- [ ] Nenhum efeito: brilho, fogo, raio, faísca, rastro, poeira.
- [ ] Mesmo rosto, cabelo e traje da imagem-mestra em **todas** as células: corda só na mão de TRÁS, mão da frente nua e aberta, faixa creme com bordado cobre, calção índigo.
- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.
- [ ] Arquivo original baixado do Runway (nunca print), salvo com o nome indicado no prompt, sem sobrescrever versão anterior.
