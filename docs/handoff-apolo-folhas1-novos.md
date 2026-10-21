# Curadoria — folha 1 (base) dos 4 lutadores novos

Apolo, 2026-10-20. Folhas do lote Runway `runway-lote3/{id}-f1-base-v1.png` (2400×1792, 4×3), comparadas com
`arte-fonte/lutadores/<id>/folhas/<id>-mestra-v1.png` e com a ficha em `docs/prompts/04..07-*.md`.

**Como foi medido:** além da inspeção visual (folha inteira + recortes ampliados), três scripts
PowerShell + System.Drawing no scratchpad da sessão: caixa por célula de grade fixa, **componentes conexos**
(limiar de 90 na soma RGB contra a cor do fundo) e posição dos pés (faixa de 25 px acima da base de cada figura).

## Resumo

| Lutador  | 12 poses | Fidelidade à mestra | Andar | Extras | Pés | Veredito |
|----------|----------|---------------------|-------|--------|-----|----------|
| AMINU    | sim, 12 componentes separados | alta (corda na mão de trás, palma aberta na frente, canela da frente enfaixada, índigo nos antebraços) | shuffle de guarda, sempre 2 pés no chão | nenhum | inteiros, 30 px de margem | **APROVADO** |
| CENTELLA | sim, mas 11 componentes (2 fundidos) | alta (máscara sempre, trança, cotoveleiras/joelheiras, punhos enfaixados, botas) | bom, com quadro de passagem | nenhum | inteiros, 6 a 13 px do fundo | **CORRIGIR** (no recorte, sem Runway) |
| CAMILLE  | sim, 12 componentes separados | alta (bob ruivo, macacão marinho com faixa prata, luvas prata, botinha branca) | o melhor dos quatro: passadas com pé no ar | nenhum | inteiros, 3 px do fundo | **APROVADO** (com recorte por componente) |
| NILA     | sim, 12 componentes separados | alta (trança única, faixa vermelho-terra, barra dourada, faixas nos braços) | não é andar: fileira 2 é estocada que se alarga, fileira 3 é outra postura | nenhum | inteiros, 19 px do fundo | **REGERAR** (só o andar; fileira 1 aprovada) |

Nenhuma folha tem texto, número, grade, efeito, sombra ou segunda figura.

## Por lutador

### AMINU — APROVADO
- Componentes: 12, todos de 532 a 565 px de altura (~93% da fileira, acima dos 70% pedidos, mas sem colisão).
  Vão entre fileiras de 20 px (y 624-643 e 1197-1215); margem inferior de 30 px.
- **Atenção ao recorte:** os pés da fileira 1 descem até y=623, ou seja, **passam da linha da grade fixa (597)**. Fatiar
  4×3 em 600×597 corta os pés da fileira 1 e joga os dedos na célula de baixo. Recortar por componente conexo.
- Fidelidade: rosto, barba, cabelo e traje batem com a mestra em todas as 12. Única deriva: o bordado da faixa virou
  entrelaçado com medalhão central, em vez dos losangos/zigue-zague hausa da mestra. Igual nas 12, não "pisca" na
  animação; ilegível na escala do jogo. Aceito.
- Andar: os dois pés ficam no chão nos 8 quadros; o que muda é a largura da base (pé de trás a pé da frente:
  254 a 362 px). É um shuffle de guarda (pé da frente avança, base alarga, pé de trás acompanha), coerente com a base
  lateral do dambe. Não há quadro de passagem, e não precisa. **O motor deve casar o deslocamento com o ciclo**
  (avançar mais nos quadros em que a base alarga), senão o pé de trás "patina".

### CENTELLA — CORRIGIR (no pipeline, sem gastar crédito)
Defeitos exatos:
1. **r1c3 (respiração, quadro 3) quebra o ciclo:** o corpo sobe 26 px, o tronco gira para a frente e os braços
   trocam de papel (o braço de perto passa a ficar dobrado no peito). Na animação de respiração isso "pula".
   Correção: ciclo de respiração com 3 quadros, **r1c1 → r1c2 → r1c4 → r1c2** (descartar r1c3).
2. **r2c3 encosta em r3c3:** a sola da bota da frente do r2c3 (base y≈1200) toca o topo da máscara do r3c3
   (topo y=1194). Não existe nenhuma linha horizontal vazia entre os dois na faixa x 1290-1730, e o componente
   conexo sai fundido (1152 px de altura). Correção: separar esses dois à mão, com corte em y≈1196, dando prioridade
   ao topo da máscara (o rosto aparece mais que a sola). Perda de ~3 a 6 px de sola, invisível na escala do jogo.
3. Fileira 3 a 6-13 px do fundo e pés da fileira 1 abaixo de y=597 (até 602): **recortar por componente**, nunca por
   grade fixa, e acrescentar margem antes de normalizar.
- Fidelidade: excelente; máscara presente nas 12.
- Andar: r2c3 tem a perna de trás no ar (quadro de passagem) e o outro pé apoiado; os demais têm os dois pés no chão.
  Funciona.
- Se o Atlas preferir fonte limpa a corte manual, o ajuste de prompt para REGERAR está no fim deste documento.

### CAMILLE — APROVADO (com recorte por componente)
- A suspeita de "colunas faltando" não se confirma: são **4 colunas e 12 figuras**, só que estreitas e agrupadas no
  meio (colunas ocupadas x 358-693, 852-1133, 1295-1587, 1711-2089; passo de ~450 px em vez de 600). Por isso a grade
  fixa de 600 px atravessa as figuras das colunas 1 e 4 (os 133 px "na borda" da medição do Atlas são essas linhas
  de grade cortando figura, mais a faixa de artefato abaixo).
- **Artefato:** as 2 últimas linhas da imagem (y 1790-1791) têm pixels fora da cor do fundo a partir de x≈1080. É
  ruído de borda da exportação, não figura (y 1789 está limpa). Recortar 2 px de cada borda antes da chave de cor.
- Pés: a sola mais baixa (r3c3) termina em y=1788, com contorno completo. Não estão cortados, mas estão a 3 px da
  borda: dar margem no recorte.
- Andar: o melhor dos quatro. Em r3c2 e r3c3 só um pé toca a base (o outro está no ar, passando). Ritmo de passo real.
  O quadro r2c4 (andar 4) é 5% mais baixo (526 px contra 546-562), o que lê como abaixamento natural do passo; **não**
  normalizar a altura quadro a quadro.
- Fidelidade: igual à mestra. Duas divergências **da mestra em relação à ficha**, que a folha herda: a botinha é de
  cano alto (a ficha diz low-top) e a expressão está séria (a ficha diz sorriso leve). Mestra aprovada manda; só
  registro.

### NILA — REGERAR (só o andar; guardar a fileira 1 da v1)
- Fileira 1 (respiração): perfeita, pés parados, postura do elefante idêntica à mestra.
- **Defeito do andar:**
  - Fileira 2: o pé da frente e o tronco ficam no lugar; só a perna de trás desliza para trás e estica
    (base de 348 → 386 → 428 → 387 px). É uma estocada se abrindo, não um passo. Nenhum pé sai do chão.
  - Fileira 3: outra postura. A figura **levanta** (565-582 px de altura contra 544-551 na fileira 2) e sai da base
    baixa do elefante para uma passada em pé.
  - Resultado: o ciclo dá um salto de postura entre o quadro 4 e o 5, e de novo do 8 para o 1. Também perde a
    identidade da lutadora (a ficha pede base muito baixa).
- Fidelidade: alta em todas as 12.

## Ajustes de prompt

### NILA — regeração da folha 1 (substituir as linhas Row 2 e Row 3 do bloco SHEET 1)
Anexar a mestra. Manter o resto do prompt e acrescentar o bloco IMPORTANT SPACING de `docs/prompts-arte.md` (linha 83).
```
Row 2: walk cycle forward in the same very low elephant posture as row 1. The hips stay at the SAME low height in all 8 walk frames; she never stands up and the back leg is never stretched straight behind. Step-and-drag: (1) front foot lifts slightly and reaches forward, back foot flat, (2) front foot lands flat, stance at its widest, (3) back foot lifts off the ground and slides forward, (4) back foot lands flat, stance back to the row 1 width.
Row 3: the same four frames again for a second step, so the 8 frames loop smoothly. At least one foot flat on the baseline in every frame.
```
Se a fileira 1 da v2 sair diferente da v1, usar a fileira 1 da **v1** e o andar da v2 (o recorte é por componente e a
normalização é por altura, então dá para combinar quadros de folhas diferentes do mesmo lutador).

### CENTELLA — só se optar por regerar em vez de corrigir
```
Row 1: the four breathing frames are the SAME pose with the same arm positions; only the chest and shoulders rise and fall slightly. Do not turn the torso or swap the arms.
```
Mais o bloco IMPORTANT SPACING (vão de fundo entre fileiras e abaixo da última).

## Achado de processo (vale para todos)

Os prompts por lutador `docs/prompts/02..07-*.md` estão **desatualizados** em relação à fonte `docs/prompts-arte.md`:
nenhum deles tem o bloco **IMPORTANT SPACING** nem a regra de "um pé no chão", e todos ainda dizem "about 80% of the
cell height". Foi exatamente isso que deixou as figuras em ~93% da fileira e os pés colados no fundo neste lote.
Regerar os arquivos com `ferramentas/prompts/montar-prompts.mjs` antes das folhas 2 e 3.
