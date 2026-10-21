# 03 — HAYATO

Gerado por script a partir de `docs/prompts-arte.md` (fonte). Cada prompt abaixo está **completo**: copie o bloco inteiro.
Gerador: **Runway, Nano Banana 2.1, paisagem 4:3, 2K** (a imagem-mestra é retrato 3:4). **Uma só imagem de referência**
por prompt, a indicada em "Anexar". Nunca peça "fundo transparente". Todo prompt de folha nova já traz o bloco IMPORTANT
SPACING (figura com cerca de 70% da fileira, faixa vazia de pelo menos 8%, pés nunca cortados) e a regra de pelo menos
um pé no chão no andar.

| Campo | Valor |
|---|---|
| id | `hayato` |
| País / estilo | Japão / karatê |
| Cor de fundo | magenta `#FF00FF` — traje A2: a faixa da cabeça é **verde** (fundo verde apagaria a faixa); gi cinza-grafite e amarelo ficam longe do magenta. A mestra saiu ≈ `#FD2BFA`, uniforme: o recorte mede o fundo por pixel |
| Pasta das folhas | `arte-fonte/lutadores/hayato/folhas/` |
| Pasta dos efeitos | `arte-fonte/lutadores/hayato/fx/` |
| Versões corrigidas | troque `-v1` por `-v2`, `-v3`; não apague as anteriores |

**Traje A2, escolhido pelo dono.** O pedido foi a versão A sem nenhuma semelhança com um personagem famoso de outra franquia de luta; a A1 (gi branco) ainda lembrava, e a A2 foi a escolhida. A A1 e a B saíram deste arquivo.

O que está nas imagens aprovadas, e que tem de se repetir em toda célula:
- cabelo preto espetado para cima e para trás, com uma **mecha amarelo-elétrico em forma de raio** na frente;
- **faixa verde** na testa com duas pontas longas esvoaçando para trás;
- **gi cinza-grafite, nunca branco**: mangas curtas dobradas acima do cotovelo, gola em V aberta, **debrum amarelo-elétrico** na gola e na barra do casaco (com fendas laterais);
- **raio amarelo pequeno no peito esquerdo** e um raio amarelo maior no alto das costas (aparece quando ele vira o tronco);
- **faixa preta com bordas amarelas**, nó na frente e duas pontas longas; calça cinza-grafite larga, sem debrum;
- **mãos e antebraços enfaixados de branco** dos nós dos dedos ao meio do antebraço (sem luvas); descalço;
- guarda: base larga de karatê, um punho erguido à frente na altura do queixo, o outro protegendo o peito.

O cenário do Japão está em `09-cenarios.md`.

## Prompts, na ordem de geração

### Prompt 1 — imagem-mestra

**JÁ GERADA E APROVADA PELO DONO** (Runway, 2026-10-20): `hayato-mestra-v1.png`, traje A2, fundo ≈ `#FD2BFA` uniforme. Não gere de novo: ela é a referência única das folhas. O texto abaixo fica só como registro.

- **Anexar:** nada (é a primeira imagem deste lutador)
- **Salvar como:** `hayato-mestra-v1.png`
- **Checagem rápida:** um único desenho de corpo inteiro, virado para a direita, traje correto, fundo chapado. Mostre ao dono antes de seguir.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.
```

### Prompt 2 — folha 1 — base (respiração e andar)

**JÁ GERADA** (Runway, 2026-10-20): `hayato-f1-base-v1.png` (pés da fileira de baixo cortados, andar virando pulo) e `-v2` (com o bloco de espaçamento: nenhum pé cortado, passos de verdade) em `arte-fonte/`. Não gere de novo; o estado de aprovação está no `PROGRESSO.md`.

- **Anexar:** `hayato-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas)
- **Salvar como:** `hayato-f1-base-v1.png`
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

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.

SHEET 1 — BASE.
Row 1: four frames of an idle breathing loop in the character's fighting stance: (1) neutral, (2) chest slightly raised, (3) chest fully raised, shoulders up a little, (4) chest coming down. Feet do not move between these four frames.
Row 2: walk cycle forward, frames 1 to 4: (1) front foot reaching forward, (2) weight passing over front foot, (3) back foot passing, (4) back foot planting. Guard stays up. At least one foot flat on the baseline in every frame: small walking steps, never jumping.
Row 3: walk cycle forward, frames 5 to 8: same motion with the other leg, ending one step before frame 1, so the 8 frames loop smoothly. At least one foot flat on the baseline in every frame.
```

### Prompt 3 — folha 2 — movimento e reações

**JÁ GERADA** (Runway, 2026-10-20): `hayato-f2-reacoes-v1.png` (nocaute com a cabeça à direita) e `-v2` (nocaute com a cabeça à esquerda) em `arte-fonte/`. Não gere de novo; o estado de aprovação está no `PROGRESSO.md`.

- **Anexar:** `hayato-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `hayato-f1-base` aprovada, também sozinha)
- **Salvar como:** `hayato-f2-reacoes-v1.png`
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

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.

SHEET 2 — MOVEMENT AND REACTIONS.
Row 1: (1) deep crouch with guard up, (2) standing block: forearms raised in front of the face, body leaning slightly back, (3) crouching block: crouched, forearms up, (4) pre-jump squat: knees bent, about to jump.
Row 2: (1) jump rising: body going up, knees starting to tuck, (2) jump apex: knees fully tucked, guard up, (3) jump falling: legs extending down to land, (4) landing: knees bent absorbing impact.
Row 3: (1) hit in the face: head snapped back, eyes shut, body recoiling to the LEFT, (2) hit in the stomach: doubled over forward, (3) knocked into the air: body almost horizontal, flying backward to the LEFT, head on the left side, (4) knocked out: lying flat on the back on the baseline, head on the LEFT side of the cell, feet pointing to the RIGHT, eyes closed (the head is at the left end of the body, never at the right end).
```

### Prompt 4 — folha 3 — golpes normais

**JÁ GERADA** (Runway, 2026-10-20): `hayato-f3-golpes-v1.png` em `arte-fonte/`. Não gere de novo; o estado de aprovação está no `PROGRESSO.md`.

- **Anexar:** `hayato-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `hayato-f1-base` aprovada, também sozinha)
- **Salvar como:** `hayato-f3-golpes-v1.png`
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

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.

SHEET 3 — NORMAL ATTACKS.
Row 1: (1) light punch start, (2) light punch fully extended at face height, (3) heavy punch wind-up, (4) heavy punch fully extended, hips and shoulders rotated into it.
Row 2: (1) light kick chambered knee, (2) light kick extended at stomach height, (3) heavy kick chambered, (4) heavy kick fully extended at head height.
Row 3: (1) crouching light punch, (2) crouching low kick at shin height, (3) low sweep: crouched on one leg, other leg fully extended along the floor, (4) crouching uppercut rising toward the sky, anti-air.
```

### Prompt 5 — folha 4 — golpes especiais

**JÁ GERADA** (Runway, 2026-10-20): `hayato-f4-especiais-v1.png` em `arte-fonte/`. Não gere de novo; o estado de aprovação está no `PROGRESSO.md`.

- **Anexar:** `hayato-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `hayato-f1-base` aprovada, também sozinha)
- **Salvar como:** `hayato-f4-especiais-v1.png`
- **Checagem rápida:** linha 1: palmas juntas empurrando para a frente (sem esfera desenhada); linha 2: soco ascendente subindo, com o punho acima da cabeça no ar; linha 3: investida com soco, chute aéreo e vitória.

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

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.

SHEET 4 — SPECIAL MOVES.
Row 1 (thunder sphere push): (1) both hands cupped together at the right hip, knees bent, gathering power, (2) beginning to thrust both open palms forward, (3) both palms fully extended forward at chest height, wrists together, fingers open, front knee bent, (4) recovering, hands returning.
Row 2 (rising uppercut): (1) crouched low, right fist drawn down by the knee, (2) springing upward, right fist rising past the face, (3) airborne at the peak, right fist straight up above the head, body vertical, knees tucked, (4) descending, arm coming down.
Row 3: (1) dash punch start: deep forward lunge, fist pulled back at the hip, (2) dash punch: body low and stretched forward, right fist fully extended, back leg straight behind, (3) jumping kick: in the air, one foot striking diagonally downward, (4) victory: one fist raised high, eyes closed, grinning.
```

### Prompt 6 — folha 5 — extras (opcional)

*Opcional: recomendada, mas não bloqueia a entrada do lutador no jogo.*

- **Anexar:** `hayato-mestra-v1.png` (a aprovada; só esta imagem, nunca duas: com duas, o modelo devolve uma delas. Se o estilo ou a escala variarem, troque pela `hayato-f1-base` aprovada, também sozinha)
- **Salvar como:** `hayato-f5-extras-v1.png`
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

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Fighting stance: wide karate front stance, one fist raised forward at chin height, the other fist guarding the chest, weight forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.

SHEET 5 — EXTRAS.
Row 1: (1) jumping punch: in the air, knees tucked, fist striking diagonally downward, (2) getting up from the floor: on one knee pushing up, (3) hit while crouching, (4) time-over loss: exhausted, hands on knees.
Row 2: (1) throw start: both hands grabbing forward at chest height as if seizing an opponent's collar (no opponent drawn), (2) throw: body turning, arms pulling across to the left as if tossing someone behind, (3) victory taunt variant, (4) intro pose before the fight.
Row 3: (1) to (4) four idle variants with small differences in arm position.
```

### Prompt 7 — efeito à parte (opcional; a Lyra decide se usa)

*Opcional: só gere se o Atlas pedir.*

- **Anexar:** nada
- **Salvar como:** `hayato-fx-v1.png` na pasta `fx/`
- **Checagem rápida:** fundo preto puro, 4 quadros em fila, nenhum personagem.

```
2D fighting game visual effect sprite, cel-shaded with a soft inner glow, side view moving to the RIGHT, pure black background #000000, no character, no ground, no text. 4 animation frames in one horizontal row, evenly spaced. Effect: a crackling electric-yellow and white thunder sphere with small lightning arcs.
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
Edit this image: in row [R], column [C], fix the costume to match the attached reference image exactly: charcoal-graphite gi (never white) with electric-yellow trim on the collar and jacket hem, small yellow lightning-bolt emblem on the left chest, yellow lightning streak in the hair, green headband with two tails, black belt with yellow edges, white cloth hand wraps. Do not change the pose.
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
- [ ] Mesmo rosto, cabelo e traje da imagem-mestra em **todas** as células: gi cinza-grafite (nunca branco) com gola e barra amarelo-elétrico, raio amarelo no peito esquerdo, mecha de raio amarela no cabelo, faixa verde com duas pontas, faixa preta de bordas amarelas, mãos enfaixadas de branco, descalço.
- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.
- [ ] Arquivo original baixado do Runway (nunca print), salvo com o nome indicado no prompt, sem sobrescrever versão anterior.
