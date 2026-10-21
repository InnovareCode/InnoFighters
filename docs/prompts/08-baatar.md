# 08 — BAATAR (chefão)

Gerado por script a partir de `docs/prompts-arte.md` (fonte). Cada prompt abaixo está **completo**: copie o bloco inteiro.
Gerador: **Runway, Nano Banana 2.1, paisagem 4:3, 2K** (a imagem-mestra é retrato 3:4). **Uma só imagem de referência**
por prompt, a indicada em "Anexar". Nunca peça "fundo transparente". Todo prompt de folha nova já traz o bloco IMPORTANT
SPACING (figura com cerca de 70% da fileira, faixa vazia de pelo menos 8%, pés nunca cortados) e a regra de pelo menos
um pé no chão no andar.

| Campo | Valor |
|---|---|
| id | `baatar` |
| País / estilo | Mongólia / bökh |
| Cor de fundo | verde `#00FF00` — casaco vermelho com calção azul-escuro: o magenta colide com os dois |
| Pasta das folhas | `arte-fonte/lutadores/baatar/folhas/` |
| Pasta dos efeitos | `arte-fonte/lutadores/baatar/fx/` |
| Versões corrigidas | troque `-v1` por `-v2`, `-v3`; não apague as anteriores |

BAATAR aparece no jogo 1,28 vez maior que os outros. Por isso as folhas dele têm **6 poses (3 colunas × 2 linhas)** em vez de 12, e cada pose sai cerca de 1,5 vez maior: são 9 folhas. No Runway, 4K custa 12 créditos por imagem (2K custa 6): 4K no BAATAR só com o OK do dono, por causa do saldo. Fundo **verde** `#00FF00`. A divisão em páginas de atlas é trabalho da equipe (`docs/prompts-arte.md` §7); você não precisa fazer nada.

## Prompts, na ordem de geração

### Prompt 1 — imagem-mestra

- **Anexar:** nada (é a primeira imagem deste lutador)
- **Salvar como:** `baatar-mestra-v1.png`
- **Checagem rápida:** um único desenho de corpo inteiro, enorme e pesado, virado para a direita, sem chapéu, fundo verde chapado. Mostre ao dono antes de seguir.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.
```

### Prompt 2 — folha B1

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas)
- **Salvar como:** `baatar-b1-v1.png`
- **Checagem rápida:** idle com os pés parados; 2 primeiros quadros do andar.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B1. Row 1: idle breathing loop frames 1, 2, 3. Row 2: idle frame 4 (chest coming down), walk frame 1 (front foot reaching forward), walk frame 2 (weight passing over front foot). Heavy, slow, grounded steps.
```

### Prompt 3 — folha B2

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b2-v1.png`
- **Checagem rápida:** andar pesado e lento, 6 quadros em sequência.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B2. Walk cycle frames 3 to 8, heavy and slow: Row 1: (3) back foot passing, (4) back foot planting, (5) other front foot reaching. Row 2: (6) weight passing, (7) back foot passing, (8) back foot planting, ending one step before frame 1.
```

### Prompt 4 — folha B3

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b3-v1.png`
- **Checagem rápida:** agachar, defesas e início do pulo.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B3. Row 1: (1) deep crouch, arms open low, (2) standing block, thick forearms raised in front of the face, (3) crouching block. Row 2: (1) pre-jump squat, (2) jump rising, knees tucking, (3) jump apex, knees tucked.
```

### Prompt 5 — folha B4

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b4-v1.png`
- **Checagem rápida:** quedas para a ESQUERDA, nocaute com a cabeça à ESQUERDA (se vier à direita, o Atlas espelha só essa figura por código).

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B4. Row 1: (1) jump falling, legs extending down, (2) heavy landing, knees bent, (3) hit in the face, head snapped back, recoiling to the LEFT. Row 2: (1) hit in the stomach, doubled over, (2) knocked into the air, body almost horizontal flying backward to the LEFT, head on the left, (3) knocked out, lying flat on the back, head on the LEFT side of the cell, feet pointing to the RIGHT (the head is at the left end of the body, never at the right end).
```

### Prompt 6 — folha B5

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b5-v1.png`
- **Checagem rápida:** tapa, cotovelada/antebraço e joelhada.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B5. Row 1: (1) light open-hand slap start, (2) light slap extended at face height, (3) heavy forearm smash wind-up. Row 2: (1) heavy forearm smash fully extended, (2) light knee strike chambered, (3) light front kick with the boot at stomach height.
```

### Prompt 7 — folha B6

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b6-v1.png`
- **Checagem rápida:** chute pisando, golpes agachados e rasteira rente ao chão.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B6. Row 1: (1) heavy kick chambered, (2) heavy stomping front kick extended at chest height, (3) crouching palm strike. Row 2: (1) crouching low kick with the boot at shin height, (2) low sweep, one leg extended along the floor, (3) crouching rising shoulder lift upward, anti-air.
```

### Prompt 8 — folha B7

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b7-v1.png`
- **Checagem rápida:** agarrão sem adversário desenhado; mãos fechadas à frente na altura do peito.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B7. Command throw, no opponent drawn: Row 1: (1) reaching forward, arms wide and low, (2) gripping: both hands clamped forward at chest height as if grabbing an opponent's jacket, (3) hip toss: body rotating, arms pulling across to the LEFT. Row 2: (1) throw follow-through, kneeling on one knee, arms down to the left. Leg-hook trip: (2) leaning in, weight forward, (3) hooking his right boot low at ankle height as if hooking an opponent's leg.
```

### Prompt 9 — folha B8

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b8-v1.png`
- **Checagem rápida:** abraço de urso sem adversário; golpes aéreos.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B8. Row 1: (1) leg-hook trip: pulling the hooked leg back, (2) recovering to stance. Running bear hug: (3) charging run, arms open wide. Row 2: (1) bear hug: arms clamped forward in a hug at chest height, no opponent drawn, (2) jumping kick: in the air, heavy boot striking diagonally downward, (3) jumping punch: in the air, forearm smashing diagonally downward.
```

### Prompt 10 — folha B9

*Usada só na luta de chefe (fase 2) e no final; o BAATAR jogável não usa a B9 (ED-M4).*

- **Anexar:** `baatar-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `baatar-b1` aprovada, também sozinha)
- **Salvar como:** `baatar-b9-v1.png`
- **Checagem rápida:** dança da águia digna e lenta (braços como asas), mergulho e vitória com a mão no peito.

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

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Fighting stance: wide wrestler's stance, slightly hunched forward, arms open and low, ready to grip. Background color: solid flat pure green #00FF00.

SHEET B9. Eagle dance (devekh), a ritual of honor, dignified and slow: Row 1: (1) arms spread wide like eagle wings, standing tall, (2) one knee raised high, arms still spread like wings, (3) hands lowering to slap his thighs, head bowed respectfully. Eagle dive: Row 2: (1) leaping high, arms spread like wings, (2) diving down from above, arms forward ready to grab, (3) victory: standing tall, right hand on his heart, slight respectful bow, kind smile.
```

### Prompt 11 — efeito à parte (opcional; a Lyra decide se usa)

*Opcional: só gere se o Atlas pedir.*

- **Anexar:** nada
- **Salvar como:** `baatar-fx-v1.png` na pasta `fx/`
- **Checagem rápida:** fundo preto puro, 4 quadros em fila, nenhum personagem.

```
2D fighting game visual effect sprite, cel-shaded with a soft inner glow, side view moving to the RIGHT, pure black background #000000, no character, no ground, no text. 4 animation frames in one horizontal row, evenly spaced. Effect: ember-red and gold wind swirling like eagle wings.
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
Edit this image: in row [R], column [C], fix the costume to match the attached reference image exactly: deep red zodog jacket open on the chest, dark blue shuudag briefs, upturned gutal boots, no hat. Do not change the pose.
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
Generate again: exactly 6 figures in 3 columns and 2 rows, one per cell.
```

#### Correção 11 — Estilo virou 3D ou foto

```
Keep exactly the same 2D hand-drawn cel-shaded anime style as the attached reference image. Not 3D, not a photo, not painterly.
```

#### Correção 12 — Mãos ou membros deformados

```
Edit this image: fix the hands in row [R], column [C]: five fingers, natural anatomy, same pose.
```

Se uma edição mudar a imagem inteira (rosto novo, poses novas), descarte o resultado e volte à versão anterior.

## Checklist de aceite (confira antes de enviar cada folha)

- [ ] 6 figuras em 3 colunas × 2 linhas, bem espaçadas, nenhuma encostando em outra nem na borda.
- [ ] Faixa vazia entre as fileiras e nas bordas de cima e de baixo; nenhum pé, dedo ou punho cortado.
- [ ] No andar, pelo menos um pé no chão em cada quadro (passo, nunca pulo).
- [ ] Todas viradas para a **direita** (as quedas caem para a esquerda, como pedido).
- [ ] Nocaute com a cabeça à **esquerda**. Se vier à direita, não corrija pelo gerador: o Atlas espelha a figura por código.
- [ ] Todas do mesmo tamanho; os pés de cada linha na mesma altura.
- [ ] Fundo de **uma cor só** (verde `#00FF00`), chapada, sem degradê, sem chão, sem sombra, sem xadrez.
- [ ] Nenhum texto, número, linha de grade ou moldura.
- [ ] Nenhum efeito: brilho, fogo, raio, faísca, rastro, poeira.
- [ ] Mesmo rosto, cabelo e traje da imagem-mestra em **todas** as células: casaco vermelho aberto no peito, calção azul-escuro, botas de bico virado, SEM chapéu.
- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.
- [ ] Arquivo original baixado do Runway (nunca print), salvo com o nome indicado no prompt, sem sobrescrever versão anterior.
