# Curadoria das 9 folhas do BAATAR (lote 7, v1)

Apolo, 2026-10-20. Fonte: `scratchpad/runway-lote7/baatar-b1-v1.png` ... `baatar-b9-v1.png` (2400x1792, grade 3x2,
fundo verde). Referência: `arte-fonte/lutadores/baatar/folhas/baatar-mestra-v1.png`. Nada foi gerado nem copiado
para `arte-fonte/`.

## Veredito por folha

| Folha | Veredito | Motivo / receita |
|---|---|---|
| B1 idle + andar 1-2 | **APROVADO** (instrução de montagem) | idle 4 (r2c1) é 38 px (4,6%) mais alto que os idles 1-3 com a mesma largura de cabeça: é postura mais ereta, não escala, e ele **sobe** em vez de "peito descendo". No laço use 2-1-3-1 (alturas 825/830/837/830) e descarte o idle 4. |
| B2 andar 3-8 | **CORRIGIR (limpeza)** | Linha de chão nas duas fileiras: y 854-857 (x 50-2329) e y 1726-1729 (x 36-2363); a contagem dava 2 componentes. Receita provada abaixo. Andar é step-and-drag com a mesma perna à frente, sempre com um pé no chão: serve ao lutador pesado. |
| B3 agachar, defesas, pulo | **REGERAR só r1c1** (folha de reposição) | O "deep crouch" saiu em pé: 818 px contra 830 do idle (98,6%). As outras 5 estão aprovadas (defesas de antebraço e pulo corretos; a base irregular da fileira 2 é o pulo, esperado). |
| B4 quedas e nocaute | **APROVADO** | Arremessado no ar (r2c2) e nocaute (r2c3) com a **cabeça à esquerda**: nada a espelhar. As caixas de r2c2 (x 755-1641) e r2c3 (x 1415-2363) se cruzam no retângulo x 1415-1641, y 1473-1572 sem pixel em comum: **recortar por componente**, nunca por retângulo de grade. |
| B5 tapa, antebraço, joelho | **APROVADO** com ressalva | r2c1 "forearm smash fully extended" saiu soco reto de punho. Funciona como golpe forte; troca opcional na folha de reposição. |
| B6 chutes e golpes baixos | **APROVADO** com ressalva | r2c1 "low kick at shin height" acerta na altura do joelho. Rasteira (r2c2) correta e rente ao chão. Troca opcional na reposição. |
| B7 agarrão e trava de perna | **APROVADO** com ressalva | Sem oponente desenhado. r1c3 (hip toss): as duas mãos agarram o próprio calção na virilha, parece que ele está ajeitando a roupa. Recomendo trocar pela reposição. |
| B8 trava, abraço, aéreos | **APROVADO** com ressalva | Sem oponente desenhado. r2c3 (soco aéreo) é o preparo, com o punho acima da cabeça, não o golpe descendo: como quadro ativo único lê "não acertou". Recomendo trocar pela reposição. |
| B9 dança da águia | **REGERAR** (ajuste curto) | Poses dignas e corretas (asas, joelho alto, mãos nas coxas com cabeça baixa, salto, mergulho, mão no peito com sorriso). Mas a **proporção mudou**: cabeça cerca de 18% menor que nas B1-B8 (topo-queixo de 123-127 px contra 147-157), botas do mesmo tamanho, figura ereta com a mesma altura do idle agachado. Dá cerca de 6,5 cabeças de altura contra 5,5-5,7 na mestra e na B1: fica mais magro, menos "gigante". Escala não conserta (aumentar pela cabeça incha o corpo em 22%). Plano B se o dono não quiser gastar: usar a v1 com escala ×1,10 na montagem e conferir a transição idle → dança no jogo. |

**Fidelidade (todas as 54 células):** jaqueta vermelha aberta com borda de ouro e cordão, calção azul-escuro, botas
gutal de bico virado, sem chapéu, grisalho nas têmporas, bigode. Nenhum traje trocado, nenhuma mão deformada nas
células ampliadas (defesas da B3, abraço da B8, agarrão da B7). Sem texto, efeito ou traço de movimento: a contagem não
achou componente intermediário (os pequenos têm menos de 20 px, o ruído normal do Runway) e a olho não há traço
encostado.

**Bordas:** a menor margem é 22 px (cabelo da B3 r1c2 no topo); nos lados, 36-38 px. Nada toca a borda nem a figura
vizinha. As figuras ocupam cerca de 93-97% da fileira; o "70%" do prompt foi ignorado, como nos outros lutadores.

## Escala entre folhas (medida)

| Medida | B1 | B2 | B3 | B4 | B5 | B6 | B7 | B8 | B9 |
|---|---|---|---|---|---|---|---|---|---|
| topo do cabelo ao queixo (px, ±5) | 152 | 151 | 157 | 148 | 147 | 140 | 157 | 148 | 123-127 |

As folhas B1-B8 ficam dentro de ±5%, e a B6 dentro de 8%: normalize cada folha pela própria altura de cabeça se a
Lyra notar troca de tamanho. Na mestra, a cabeça mede cerca de 383 px para uma figura de 2175 px (5,7 cabeças); o idle
da B1 dá 5,5. A proporção confere.

## Receita B2 (provada em cópia no scratchpad)

`scratchpad/apolo/tirar-linha.ps1 -In baatar-b2-v1.png -Out <saida> -Bandas "854-857,1726-1729"`: em cada coluna em
que a linha acima (y0-2) e a abaixo (y1+2) são fundo, pinta de y0-1 a y1+1 com `#00FF00`. Foram 20.166 pixels
trocados. Depois da limpeza: **6 componentes**, 0 linhas longas, e nenhum toco visível nas botas no zoom. Resultado
pronto em `scratchpad/apolo/bt/b2-sem-linha.png`, que pode ser salvo como `baatar-b2-v2.png`.

## Prompts

**Reposição (1 geração, 6 créditos).** Anexe só `baatar-b1-v1.png`, a aprovada. Use o bloco comum do Prompt 2 de
`docs/prompts/08-baatar.md`, idêntico, trocando apenas a última linha (SHEET) por esta:

```
SHEET BR (replacement poses). Row 1: (1) deep crouch: squatting very low, knees deeply bent and wide apart, hips down at knee height, the top of the head at about two thirds of the standing height, arms open low, both boots flat on the baseline, (2) heavy forearm smash fully extended: the right forearm swung horizontally forward at chest height, elbow bent, forearm leading, body twisted into it, (3) hip toss: hips turned, both fists clenched at shoulder height pulling an invisible jacket across his chest toward the LEFT, hands never touching his own clothes. Row 2: (1) crouching low kick: crouched low on the back leg, front leg extended with the boot at shin height close to the floor, (2) jumping punch: in the air, knees tucked, the right forearm and fist smashing diagonally DOWNWARD in front of him, arm extended down-forward, (3) deep crouch breathing: same as row 1 cell 1 with the chest slightly lower.
```

Obrigatória só por causa do agachamento. As outras quatro poses substituem as ressalvas: B5 r2c1, B7 r1c3, B6 r2c1 e
B8 r2c3.

**B9 v2 (6 créditos).** Anexe só `baatar-b1-v1.png`, não a mestra. Use o Prompt 10 inteiro e acrescente esta frase
logo depois do parágrafo CHARACTER:

```
BODY PROPORTIONS: exactly the same proportions and size as the reference image: a big head and a very thick, heavy body about 5.5 heads tall. Standing upright does NOT make him slimmer or smaller: same head size, same huge belly, same thick arms and legs in every cell.
```

## Lote 8: reposição BR e B9 v2 (2026-10-20)

Fonte: `scratchpad/runway-lote8/baatar-br-v1.png` e `baatar-b9-v2.png`. Nas duas: 6 componentes, nenhuma linha de chão,
1 componente pequeno de ruído e fidelidade de traje completa.

### B9 v2: APROVADO, substitui a v1 inteira

- **Proporção corrigida.** Do topo do cabelo ao queixo dá 151, 151 e 155 px (r1c1, r1c2, r2c1), contra 152 na B1 e 123-127
  na v1. A cabeça tem a mesma largura da B1 (119 px em +60). A vitória (r2c3) mede 869 px, cerca de 5,7 cabeças, igual à
  mestra. O abre-asas (r1c1) tem 830 px, a altura exata do idle.
- **Borda.** As pontas dos dedos da mão esquerda de r1c1 (y 277-312) e de r2c1 (y 990-1040) **tangenciam** x=0: são 6 px
  na coluna 0 e 22 px na coluna 1. No zoom ×4 o contorno das unhas está fechado, então é o traço tocando a borda, sem dedo
  cortado; perde no máximo 1 a 2 px de contorno. Não precisa regerar. No recorte, **acrescente margem de fundo verde** à
  esquerda dessas duas células (o recorte por componente começa em x=0). Os "x até 2398" medidos pelo Atlas não são
  figura: a maior x de figura é 2281, e o resto é o ruído do Runway na última linha e coluna.
- **Poses.** Abre-asas (agora em base larga, menos "ereto" que a v1, mas digno), joelho alto, mãos nas coxas com a cabeça
  baixa e sorriso, salto de asas, mergulho no ar (pés fora do chão, base em 1657) e mão no peito sorrindo. Todas servem.

Caixas B9 v2: r1 [0-782, 54-883] [794-1605, 55-885] [1700-2281, 100-883]; r2 [0-783, 923-1773] [826-1654, 1026-1657]
[1828-2210, 914-1782].

### BR v1: só 2 das 6 células entram

| Célula BR | Entra no atlas? | Medida / motivo |
|---|---|---|
| r1c1 agachamento | **SIM, substitui B3 r1c1** | 701 px (84% do idle; o pedido era cerca de 67%). Quadril baixo, lê como agachado e fica abaixo da defesa agachada da B3 (730 px). Cabeça de 155 px, na escala da B1. |
| r1c2 antebraço | não: fica B5 r2c1 | Saiu de novo como soco reto de punho, igual à B5. Não ganha nada. |
| r1c3 hip toss | **SIM, substitui B7 r1c3** | Melhor que a v1: não agarra o calção. Mas o punho de baixo ainda segura a barra da própria jaqueta. Se na animação ler "ajeitando a roupa", corte o quadro e use agarra (B7 r1c2) → finalização ajoelhado (B7 r2c1). |
| r2c1 chute baixo | não: fica B6 r2c1 | Mede 869 px, ou seja, ele está em pé. Sair do agachamento (701) para esse chute daria um salto de 24%. A B6 r2c1 (702 px) continua agachada. |
| r2c2 soco aéreo | não: fica B8 r2c3 | Mais uma vez o punho sobe acima da cabeça, como preparo. É a 2ª tentativa que falha: aceite a B8 r2c3 como "martelo" e ponha a caixa de acerto à frente, na altura da cabeça. |
| r2c3 respiração agachada | não | Mede 783 px, contra 701 do agachamento: alternar os dois faria a figura subir e descer 82 px. Use o agachamento como quadro único. |

Caixas BR usadas: r1c1 [102-682, 182-882]; r1c3 [1700-2281, 86-882].

**Mapa final para o atlas do BAATAR:** B1 (laço 2-1-3-1), B2 v2 limpa, B3 com r1c1 trocado por BR r1c1, B4, B5, B6,
B7 com r1c3 trocado por BR r1c3, B8 e B9 v2. Todas na escala da B1 (cabeça de 147-157 px); só a B6 (140) pode pedir ×1,05.

## Caixas por componente (v1, para o recorte do atlas)

- B1: r1 [102-697, 54-883] [904-1491, 55-879] [1699-2295, 46-882]; r2 [86-688, 903-1770] [891-1515, 914-1775] [1700-2257, 917-1775]
- B2 (após limpeza): r1 [108-692, 41-885] [893-1505, 41-884] [1700-2303, 41-882]; r2 [140-699, 905-1768] [942-1508, 906-1776] [1742-2337, 903-1768]
- B3: r1 [97-751, 62-879] [938-1563, 22-878] [1788-2303, 150-879]; r2 [88-751, 1028-1779] [945-1555, 914-1705] [1813-2270, 906-1607]
- B4: r1 [128-692, 25-833] [834-1578, 153-874] [1717-2329, 76-875]; r2 [94-663, 1004-1769] [755-1641, 967-1572] [1415-2363, 1473-1746]
- B5: r1 [122-697, 61-879] [861-1623, 58-879] [1672-2301, 42-880]; r2 [79-860, 947-1768] [986-1459, 914-1772] [1614-2353, 934-1773]
- B6: r1 [90-713, 38-887] [814-1596, 52-887] [1618-2331, 136-875]; r2 [47-823, 1006-1707] [885-1670, 1159-1721] [1708-2309, 924-1737]
- B7: r1 [67-871, 70-888] [888-1553, 54-888] [1647-2321, 94-888]; r2 [38-759, 1011-1755] [819-1704, 984-1766] [1670-2347, 942-1771]
- B8: r1 [36-877, 200-853] [929-1530, 79-879] [1602-2362, 70-862]; r2 [132-744, 941-1773] [869-1617, 943-1651] [1698-2318, 928-1699]
- B9: r1 [38-791, 64-879] [840-1564, 70-879] [1794-2184, 149-879]; r2 [57-827, 945-1723] [849-1771, 1032-1443] [1892-2231, 945-1767]

Formato: [x0-x1, y0-y1]. B4 r2c2/r2c3 e B7 r2c2/r2c3 têm retângulos que se cruzam: recorte pela máscara do componente.
