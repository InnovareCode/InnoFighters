# Handoff do Apolo: NILA folha 5 (postura de serpente, SARPA)

Data: 2026-10-21. Arquivo curado: `arte-fonte/lutadores/nila/folhas/nila-f5-extras-v1.png` (2400x1792, 4x3, verde).
Referências: `nila-f1-base-v3.png` (escala), `nila-f4-especiais-v1.png` (serpente já desenhada em L2 C3/C4 = `sb2`/`sb3`).
Nenhuma imagem foi gerada nem copiada. Scripts de medição (descartáveis): `scratchpad/apolo/componentes.ps1`,
`n5/ondula.ps1`, `n5/iou.ps1`, `zoom.ps1`.

## Veredito: REGERAR a folha (v2), aproveitando 6 células da v1

A linha 1 (o idle da serpente, que é o quadro que a SARPA mais mostra) saiu na **postura do elefante**, e a defesa (L3 C4)
também. O resto é aproveitável. Não há conserto por código para postura errada: precisa de uma geração.

### Medições

| Item | Medida | Leitura |
|---|---|---|
| Componentes | 12, nenhum pequeno (< 3000 px) | sem linha de chão, sem traços soltos, nenhuma figura encostando |
| Borda | x 30..2382, y 66..1773 | nenhum pixel na borda (margem mínima 17 px) |
| Base da linha 1 | y = 581 nas 4 figuras | confere com o Atlas (580 + 1) |
| Vão entre linhas | L1/L2 108 px; L2/L3 23 px no geral, 30 px na mesma coluna (C2) | recortar por componente, nunca por grade |
| Linha 1, caixas | 467x509, 470x509, 466x516, 463x510 | **mais alta que larga**: é a GAJA. A serpente da f4 (`sb2`/`sb3`) é 561x311 e 549x330 |
| Linha 1, topo da cabeça | 73, 73, 66, 72 | só o quadro 3 sobe 7 px |
| Linha 1, nariz menos pé esquerdo | 263, 277, 273, 268 | balanço horizontal de 14 px (há ondulação, pequena) |
| Linha 1, silhueta (IoU com o quadro 1) | 0,896 / 0,927 / 0,943 | variação de respiração, não de serpente |
| Andar, L2 C1 x C2 (IoU) | 0,698 | os dois quadros são distintos (braços e mãos alternam; pernas quase iguais) |
| Deslize ativo L2 C4 | 714x388 | 76% da altura do idle desta folha: baixo, mas não "colado ao chão" |
| Defesa L3 C4 | 444x539 | 106% da altura do idle: de pé, base larga, palma erguida = GAJA |
| Cabeça (topo ao queixo, zoom grade 10) | f1 v3 = 112 px; f4 = 102 px; f5 = 101 px | **f5 está ~10% menor que a f1 v3** (igual à f4) |

### Fidelidade

Traje correto nas 12 células: blusa off-white de manga curta com debrum dourado, calça off-white com barra dourada,
faixa laterita larga na cintura, braçadeiras vermelho-terra nos dois braços, descalça, trança única visível em todas.
Rosto e pele batem com a mestra. Na L3 C2 a faixa desce até o meio da coxa (tecido em voo): aceitável.

### Causa raiz (vale para qualquer folha de postura alternativa)

O bloco `CHARACTER — NILA` que o gerador injeta em toda folha termina em **"Fighting stance (elephant posture): very low
wide stance ... one arm extended forward and low like an elephant's trunk"**. A imagem anexada (a mestra) também está
nessa postura. Nas células cujo texto é "postura/idle/defesa", o modelo seguiu a postura do personagem, não a da linha.
As células com ação concreta (rastejar, deslizar, saltar, chutar) saíram certas porque a ação vence a postura.

## Mapa célula -> pose (v1, o que entra já)

| Célula | Pose | Estado |
|---|---|---|
| L1 C1..C4 | (nenhuma) | **descartadas**: elefante. `sarpaIdle0..3` ficam para a v2 |
| L2 C1 | `sarpaWalk0` | aprovada |
| L2 C2 | `sarpaWalk1` | aprovada |
| L2 C3 | `sarpaSlide0` | aprovada (agachamento fechado = início do BOTE e o `crouchPunch` da SARPA) |
| L2 C4 | `sarpaSlide1` | aprovada com ressalva (76% da altura; ver PENDÊNCIAS) |
| L3 C1 | `sarpaLeap0` | aprovada (agachado sobre um joelho, punho armado: lê como decolagem) |
| L3 C2 | `sarpaLeap1` ou null | **sem equivalente**: a animação `leap` só usa `sc0`/`sc1` (`src/data/anim.ts`), e a `nila.ts` mapeia `sc0 -> sarpaLeap0`, `sc1 -> sarpaLeap2`. Pode entrar no atlas sem uso, ou ficar null |
| L3 C3 | `sarpaLeap2` | aprovada (chute descendente, perna estendida para baixo-frente) |
| L3 C4 | (nenhuma) | **descartada**: elefante de pé. `sarpaBlock` fica para a v2 |

Até a v2 existir: sem `sarpaIdle*` e `sarpaBlock` no atlas, o `poseDaFicha` cai na GAJA (comportamento previsto).
**Opção provisória melhor** (custo zero de arte, decisão da Vega/Lyra): apontar `idle0..3` da SARPA para o `sb3` da f4
(serpente parada, cabeça erguida), que já está no atlas. Idle estático, mas na postura certa: a troca de postura fica
legível imediatamente. O `block`/`cblock` continuam na GAJA (f2) até a v2.

**Escala:** a f5 precisa de `fatorFolha` ~**1,11** em `ferramentas/sprites/lutadores.json` para casar a cabeça com a
f1 v3. A f4 (102 px) tem o mesmo descompasso, hoje sem fator: conferir na mesma passada.

## Prompt da v2 (pronto para colar no Runway)

- **Anexar:** `nila-mestra-v1.png` (só ela). Se a linha 1 sair de novo de pé, a 2ª tentativa anexa `nila-f4-especiais-v1.png`
  sozinha (tem a serpente desenhada) e acrescenta "use the serpent posture of row 2, cells 3 and 4 of the reference".
- **Salvar como:** `nila-f5-extras-v2.png`
- **Diferenças para a v1:** a última frase do bloco CHARACTER troca a postura do elefante pela da serpente; linha 1, L2 C4
  e L3 C4 ganham critério de forma ("wider than tall").

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

CHARACTER — NILA: Indian kalaripayattu practitioner from Kerala, about 31 years old, lean, flexible and athletic, modest traditional training clothes. Warm brown skin, long thick black hair in a single braid reaching her waist, calm focused face. Fitted off-white cotton short-sleeved training top and fitted off-white cotton trousers, both with a thin gold border, a wide laterite red-brown cloth waist wrap tied tightly, red-brown cloth bands on both upper arms, barefoot. IN THIS SHEET SHE IS IN THE SERPENT POSTURE, NEVER THE ELEPHANT POSTURE: torso tilted forward almost horizontal, chest close to the floor, weight on deeply bent legs, both hands held forward together at head height like a snake's head. She is never upright, never in a wide squat with one arm hanging like a trunk. Background color: solid flat pure green #00FF00.

SHEET 5 — SERPENT POSTURE.
Row 1: (1) to (4) serpent posture idle loop. Each figure is WIDER THAN IT IS TALL: torso almost horizontal, chest about one hand above the floor, head low and forward, both hands together forward like a snake's head, feet planted and not moving. The head and hands sway like a snake: (1) centered, (2) head and hands shifted slightly forward and up, (3) centered and slightly lower, (4) head and hands shifted slightly back.
Row 2: (1) and (2) serpent posture moving forward, low crawling step, (3) serpent slide start: dropping low, (4) serpent slide: body stretched flat along the floor like a sliding snake, hips and chest almost touching the floor, front leg extended forward along the floor, the figure at least twice as wide as it is tall.
Row 3: (1) serpent leap start: coiled crouch, (2) corkscrew leap rising high, body twisting, (3) descending kick from the leap, leg extended diagonally down, (4) serpent posture crouching block: same low serpent body, torso almost horizontal, both forearms raised crossed in front of the face, the figure wider than it is tall.
```

### Critério de aceite da v2 (medir, não olhar)

1. 12 componentes, nenhum pequeno, nenhum pixel na borda.
2. Linha 1: as 4 caixas com **largura >= altura** e altura <= ~65% da altura do idle da GAJA na mesma escala; base igual
   nas 4; topo da cabeça e nariz variando entre quadros (5 a 20 px), sem dois quadros com IoU > 0,95.
3. L3 C4: largura >= altura.
4. Cabeça topo-queixo medida em 2 figuras para fixar o `fatorFolha`.
5. Montagem final: v2 para `sarpaIdle0..3` e `sarpaBlock`; para as outras 7 poses, vale a melhor entre v1 e v2
   (troca de célula por máscara de componente, escala pela cabeça, âncora no pé de apoio).
