# 01 — WEI LONG

## Veredito da curadoria

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

---

Gerado por script a partir de `docs/prompts-arte.md` (fonte). Cada prompt abaixo está **completo**: copie o bloco inteiro.
Gerador: **Runway, Nano Banana 2.1, paisagem 4:3, 2K** (a imagem-mestra é retrato 3:4). **Uma só imagem de referência**
por prompt, a indicada em "Anexar". Nunca peça "fundo transparente". Todo prompt de folha nova já traz o bloco IMPORTANT
SPACING (figura com cerca de 70% da fileira, faixa vazia de pelo menos 8%, pés nunca cortados) e a regra de pelo menos
um pé no chão no andar.

| Campo | Valor |
|---|---|
| id | `wei-long` |
| País / estilo | China / kung fu |
| Cor de fundo | magenta `#FF00FF` — as outras 3 folhas canônicas já são magenta; a edição tem que bater com elas. O traje é azul, preto e branco |
| Pasta das folhas | `arte-fonte/lutadores/wei-long/folhas/` |
| Pasta dos efeitos | `arte-fonte/lutadores/wei-long/fx/` |
| Versões corrigidas | troque `-v1` por `-v2`, `-v3`; não apague as anteriores |

WEI LONG está **completo**: a edição da folha de especiais terminou em `wei-long-f4-especiais-v4.png` e as outras 3 folhas canônicas já estavam aprovadas (`docs/proposta-wei-long.md`). Os prompts 1A e 1B ficam como registro. São edições de uma folha existente, por isso não levam o bloco IMPORTANT SPACING (pediriam para mover as figuras). A troca do quadro L3C2 por ombrada e os extras (soco no ar etc.) foram adiados pelo dono e não estão aqui.

## Prompts, na ordem de geração

### Prompt 1A — edição da folha de especiais, etapa A: só remover os efeitos

**CONCLUÍDO** (Runway, 2026-10-20): aprovado pelo dono e salvo como `wei-long-f4-especiais-v2.png`. Não gere de novo.

- **Anexar:** **UMA imagem só**: `arte-fonte/lutadores/wei-long/folhas/Kung_fu_master_sprite_sheet_2K_20261020153054.jpg` (a folha de especiais, com a bola lilás e a cabeça de dragão). Não anexe nenhuma outra.
- **Salvar como:** `wei-long-f4-especiais-v2.png`
- **Checagem rápida:** as 12 figuras continuam as mesmas (bola de energia nas mãos, palmas empurrando, pisão, ombrada, chute, braços cruzados), sem brilho lilás, sem cabeça de dragão, sem aura e sem chão rachado; as mãos que estavam cobertas pelo efeito aparecem normais. A túnica ainda curta é esperada nesta etapa. Se vier a folha de andar (4 parados + 8 andando), a imagem anexada foi a errada: confira o nome do arquivo.

**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**

```
Edit this sprite sheet. Change ONLY what is listed here. Remove ALL visual effects: the purple and lilac energy ball between the hands, the purple dragon head, the purple energy wave, the purple aura around the body, the purple explosion, and the cracked ground with debris under the feet. Where an effect covered the background, fill it with the same flat solid magenta #FF00FF. Where an effect covered part of the character (hands, arms, legs, feet), redraw that part normally, without any glow. Keep the 12 figures, their poses, positions, sizes, faces, hair, beards and costumes exactly as they are. Do not add anything new. Flat solid magenta #FF00FF background everywhere, no shadows, no gradients, no text.
```

### Prompt 1B — edição da folha de especiais, etapa B: só alongar a túnica

**CONCLUÍDO** (Runway, 2026-10-20): a 1B saiu como `-v3` e uma etapa extra 1C (cor do painel mais escura) como `-v4`, a versão final. Ressalva registrada no `PROGRESSO.md`: a figura toda escureceu e a calça ficou levemente marrom-arroxeada. Não gere de novo.

- **Anexar:** **UMA imagem só**: a imagem aprovada da etapa 1A (`wei-long-f4-especiais-v2.png`). Não anexe a folha de andar como referência.
- **Salvar como:** `wei-long-f4-especiais-v3.png`
- **Checagem rápida:** em TODAS as 12 figuras, o colete azul continua abaixo da cintura num painel da frente até o meio da canela, com borda dourada, por cima da calça preta; nada mais mudou (rostos, poses, braçadeiras pretas, sapatos, fundo magenta). Se mudar rosto ou pose, descarte e repita a 1B.

```
Edit this sprite sheet. Change ONLY the tunic. In every one of the 12 figures, the royal-blue vest must continue below the waist as one long front panel that hangs down to the middle of the shins, with gold trim along its edges, open at the sides over the black trousers, like a long apron in front of the legs. The panel follows the pose: it swings and folds in kicks, steps and jumps. Keep everything else exactly as it is: poses, positions, sizes, faces, hair, beards, black wrist bracers, black trousers, shoes and the flat solid magenta #FF00FF background. No visual effects, no shadows, no text.
```

### Prompt 2 — efeito à parte (opcional; a Lyra decide se usa)

**JÁ GERADO E APROVADO** (imagem `1bcee91a`). Não gere de novo: só salve o arquivo original do Gemini com o nome abaixo.

- **Anexar:** nada
- **Salvar como:** `wei-long-fx-v1.png` na pasta `fx/`
- **Checagem rápida:** fundo preto puro, 4 quadros em fila, nenhum personagem.

```
2D fighting game visual effect sprite, cel-shaded with a soft inner glow, side view moving to the RIGHT, pure black background #000000, no character, no ground, no text. 4 animation frames in one horizontal row, evenly spaced. Effect: a glowing violet chi dragon head projectile with open jaws and a flame-like mane trailing left.
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
Edit this image: in row [R], column [C], fix the costume to match the attached reference image exactly: long front panel reaching the shins, plain black cloth wrist bracers, white hair tied in a topknot bun. Do not change the pose.
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
- [ ] Mesmo rosto, cabelo e traje da folha de referência 153007 em **todas** as células: painel longo até a canela, braçadeiras pretas, coque branco.
- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.
- [ ] Arquivo original baixado do Runway (nunca print), salvo com o nome indicado no prompt, sem sobrescrever versão anterior.
