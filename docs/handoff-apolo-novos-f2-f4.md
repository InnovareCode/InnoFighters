# Curadoria CENTELLA, CAMILLE e NILA: folhas 2 a 4 e NILA f1 v2 (Apolo, 2026-10-20)

## Execução das correções (lote 6)

Arquivos novos em `scratchpad/runway-lote6/`; os originais em `runway-lote5/` ficaram intactos. Nada foi copiado
para `arte-fonte/`. Conferido em cada um: **12 componentes**, nenhum pixel de figura na borda (só o pixel de ruído
do canto em y=1791, que já existia no original), nenhum pixel colado sobre figura vizinha, conferência a olho com zoom.

| Arquivo | O que foi feito | Script |
|---|---|---|
| `centella-f2-reacoes-v2.png` | L3 C3 espelhada pela máscara do componente (72851 px, caixa x 1177-1735, y 1234-1549), escala 100%, mesma base; halo do contorno antigo limpo | `corr.ps1 -Op espelho` + `corr2.ps1 -Op halo` |
| `camille-f2-reacoes-v2.png` | Linha de chão apagada (y 560-567, x 88-2313, só onde acima e abaixo é fundo) | `corr.ps1 -Op linha` |
| `camille-f4-especiais-v2.png` | Traços do arco apagados (caixa x 990-1050, y 128-184) | `corr.ps1 -Op caixa` |
| `nila-f2-reacoes-v2.png` | 3 traços de impacto apagados (L3 C1) + L3 C3 espelhada (74511 px, caixa x 1242-1748, y 1288-1709) + halo limpo | `apagar-pequenos.ps1` + `corr.ps1` + `corr2.ps1` |
| `nila-f1-base-v3.png` | Fileira 1 da v1 reescalada ×1.14 sobre as fileiras 2 e 3 da v2 | `montar-nila-v3.ps1` |
| `aminu-f3-golpes-v3.png` | v2 com a L2 C4 trocada pela L2 C4 da v1 (×1.065) | `trocar-celula.ps1` + `corr2.ps1 -Op halo` |

Todas as cores de preenchimento são o fundo amostrado em (30,10) da própria folha. A limpeza de halo deixa o fundo
perfeitamente chapado dentro da caixa da figura corrigida (o resto da folha mantém o ruído de ±5 do Runway): invisível
e indiferente para o chroma key.

### NILA f1 v3: reescalei aqui, não deixe para a Lyra/Vega

Uma folha com fileiras em escalas diferentes quebra qualquer normalização por folha. Por isso a v3 já sai coerente:
- Fator **1.14** = altura do topo à base do pé da frente na respiração da v2 (599 px) / a mesma medida na v1 (524 px).
- Âncora por coluna: o pé de trás da v1 (x inicial, base y=610) cai sobre o pé de trás da v2 (base y=658). A mesma
  transformação vale para os 4 quadros, então os pés ficam **idênticos** entre eles (medido: base 658 e 648 nos 4).
- Resultado: respiração com altura de 609-622 px (topo 50 → 46 → 37 → 50, a subida suave da v1 preservada), contra
  607 px da respiração original da v2. Andar intacto (fileiras 2 e 3 são os pixels da v2).
- A v1 ampliada 14% fica um pouco mais macia que a v2 nativa; conferido com zoom no rosto, sem halo nem serrilhado.
  Na escala do jogo, que reduz a figura, a diferença some.

### AMINU f3 v2: CORRIGIR (montagem), feito como v3

O que a regeração acertou: no jab (L1 C2) o punho da frente está **nu** e a corda fica na bochecha; o soco agachado
(L3 C1) está realmente agachado (439 px contra 563 px em pé, 78%); a corda está só na mão de trás nas 12 figuras.
**Defeito novo:** no chute alto (L2 C4) as **duas** canelas estão enfaixadas, a da perna que chuta e a da perna de
apoio. A mestra tem uma canela só. A L2 C4 da v1 está certa (curada antes: "linha 2 inteira correta"), então troquei
só essa célula:
- Fator 1.065 = altura da v2 / altura da v1 na mesma pose (588/550 na L2 C4, 622/582 na L2 C1); âncora no pé de
  apoio (x 1964, base 1203 na v1 → x 1951, base 1249 na v2).
- Resultado: 586 px de altura (a original da v2 tinha 588), base do pé em 1249, igual às vizinhas.
- O punho erguido do gancho (L3 C4) entra na caixa da L2 C4: por isso troquei pela máscara do componente, não pela
  caixa. Medido: 0 pixel colado sobre outra figura.

**Atenção:** `arte-fonte/lutadores/aminu/folhas/aminu-f3-golpes-v2.png` já existe e é idêntico (mesmo MD5) ao do
lote 5, ou seja, **com** as duas canelas enfaixadas. A folha canônica deve ser a v3.

Fontes: `scratchpad/runway-lote5/*.png` (2400x1792), comparadas com `arte-fonte/lutadores/<id>/folhas/<id>-mestra-v1.png`,
`<id>-f1-base-v1.png` e os prompts 3, 4 e 5 de `docs/prompts/05..07-*.md`.
Scripts de medição: `scratchpad/apolo/` (`componentes.ps1`, `pequenos.ps1`, `apagar-pequenos.ps1`, `limpar.ps1`,
`base-pes.ps1`, `rosto.ps1`, `zoom.ps1`, `linha.ps1`).

## Vereditos

| Folha | Veredito | Motivo em uma linha |
|---|---|---|
| centella-f2 reações | **CORRIGIR (espelho)** | Arremessado no ar (L3 C3) com a cabeça à DIREITA; nocaute certo |
| centella-f3 golpes | **APROVADO** | 12 poses certas, máscara em todas |
| centella-f4 especiais | **APROVADO** | 12 poses certas, máscara em todas, sem adversário |
| camille-f2 reações | **CORRIGIR (recorte)** | Linha preta de chão na fileira 1 (funde as 4 figuras num componente só) |
| camille-f3 golpes | **APROVADO** (1 ressalva) | Na rasteira (L3 C3) a mão no chão sai com luva aberta, dedos à mostra |
| camille-f4 especiais | **CORRIGIR (recorte)** | 2 traços de movimento ao lado da luva (L1 C2); pés da fileira 3 inteiros |
| nila-f2 reações | **CORRIGIR (recorte + espelho)** | 3 traços de impacto no rosto (L3 C1) e arremessado no ar com cabeça à DIREITA (L3 C3) |
| nila-f3 golpes | **APROVADO** (1 ressalva) | Preparação do soco forte (L1 C3) já vem com o soco da frente estendido |
| nila-f4 especiais | **APROVADO** (2 ressalvas) | Empurrão L3 C1 com uma palma só recolhida; chute em salto sai como joelhada |
| nila-f1 base v2 | **COMBINAR** | Fileira 1 da **v1** + fileiras 2 e 3 (andar) da **v2** |

Nenhuma folha precisa ir de novo ao Runway.

## Medições comuns

- Componentes conexos (limiar 90): **12 em nove folhas**. camille-f2 dá 9 porque a linha de chão une a fileira 1;
  depois de apagar a linha (teste em cópia), dá 12.
- Componentes pequenos (≥20 px, fora das figuras): só os 3 traços de impacto da nila-f2. Os traços da camille-f4
  encostam na luva e por isso não aparecem como componente separado: foram achados a olho e confirmados com zoom.
- Nocaute (L3 C4) com a cabeça à **ESQUERDA** nas três folhas 2. Nenhum nocaute para espelhar.
- Agachado menor que em pé em todas (altura do agachado / altura em pé na mesma folha): CAMILLE 76-77%,
  NILA 75-84%, CENTELLA 80-86%. A CENTELLA tem a menor diferença porque a guarda dela já é agachada (ficha).
  Ressalva para a Lyra: na centella-f2, o "deep crouch" (L1 C1, 462 px) quase não difere da guarda; a caixa de dano
  do agachado deve vir da regra do motor, não da altura do sprite.
- Recorte sempre **por componente**: as caixas das fileiras se sobrepõem na vertical em todas as folhas.

## CENTELLA

**f2.** L3 C3 (arremessado no ar) saiu com a cabeça à direita e a trança voando para a esquerda: lê como mergulho
PARA a direita, rumo ao adversário. O prompt pede cabeça à esquerda. Espelhar só essa figura:
retângulo **x 1177-1736, y 1233-1549** (componente de 72963 px). Nenhuma vizinha entra no retângulo (o nocaute
começa em y=1576, a L2 C3 termina em y=1164). Depois de espelhada, ela fica de frente para a esquerda: lê como
corpo jogado para trás, que é o que a reação pede. Salvar como `-v2`.
Resto: defesas, pulo em 4 tempos, soco no rosto e no estômago corretos. Máscara em todas as 12.

**f3.** Socos, chutes, rasteira com a perna esticada no chão e gancho antiaéreo corretos. Máscara em todas.

**f4.** Body splash (salto de braços abertos, corpo horizontal de barriga para baixo, aterrissa com a mão no chão),
tesoura no ar (pernas juntas, sem adversário), mortal de costas com a máscara visível de cabeça para baixo,
cotovelada voadora horizontal, dropkick com os dois pés e vitória com o dedo erguido e a mão no quadril. Correto.

## CAMILLE

**f2.** Linha preta de chão (4 px, **y 562-565, x 88-2313**) atravessa a fileira 1 e passa por baixo dos sapatos.
Receita testada em cópia (`scratchpad/apolo/limpar.ps1 -Modo linha`): para cada x de 88 a 2313, se os pixels em
y=559 e y=568 forem fundo, pintar y 560-567 com o fundo. Onde há sapato, a linha coincide com o contorno da sola e
fica. Resultado: 12 componentes; a linha some entre as figuras e sobra só 1-2 px encostado nas solas, que se
confundem com o contorno. Usar a cor de fundo amostrada em (30,10), não `#00FF00` puro.
Poses todas certas; sapatos brancos em todas as 12.

**f3.** Correta. Ressalva: na rasteira (L3 C3) a mão da frente apoiada no chão está com uma luva aberta de MMA,
dedos à mostra. Na escala do jogo é um detalhe de ~8 px; não bloqueia. Sapatos brancos em todas.

**f4.** Dois traços curvos de movimento ao lado da luva na L1 C2 (o "desvio"). Receita testada em cópia: pintar o
retângulo **x 990-1050, y 128-184** inteiro com o fundo. Nada da figura entra nele (a luva de trás termina em
x≈987, o topo da luva da frente começa em y≈186). Sobram 2 risquinhos de 2 px dentro da luva, que leem como vinco.
**Pés da fileira 3:** inteiros. A sola da L3 C4 fecha o contorno em y=1788; as linhas 1789-1791 são halo e ruído do
Runway (a L3 C1 tem 9 px soltos só em y=1791). Ao recortar, descartar a última linha da imagem e, na L3 C4, parar
em y=1788. Sem pé cortado, então não há o que regerar.
Poses: aparar, desvio, chute alto com a ponta do sapato, chute baixo em 4 tempos, giro de costas, chute em salto e
saudação de esgrima. A L3 C2 (chute de calcanhar girando) lê mais como chute lateral; aceito.

## NILA

**f2.** Duas correções:
1. **Traços de impacto** ao lado da boca na L3 C1 (3 componentes soltos, ~212 px, em x 253-278, y 1255-1298).
   Receita testada: `scratchpad/apolo/apagar-pequenos.ps1 -X0 245 -Y0 1245 -X1 290 -Y1 1305 -Lim 40` apaga
   todo componente com menos de 3000 px nessa caixa e pinta com o fundo amostrado. O rosto fica intacto.
2. **Arremessado no ar (L3 C3) com a cabeça à direita.** Espelhar o retângulo **x 1242-1748, y 1288-1709**
   (componente de 74582 px; o nocaute começa em x=1817, a fileira 2 termina em y=1201). Salvar como `-v2`.
Faixa laterita, trança e faixas nos braços em todas as 12.

**f3.** Correta. Ressalva: L1 C3 (preparação do soco forte) mostra o soco da frente estendido com o punho de trás
armado no alto; serve como preparação, só não é um recuo limpo. Trança e faixa em todas.

**f4.** Toque de dois dedos em 4 tempos, transição elefante → serpente e vitória de palmas juntas corretos.
Ressalvas (como na AMINU f4, nenhuma bloqueia): L3 C1 tem uma palma à frente e outra na cintura (o prompt pedia as
duas recolhidas); L3 C3 é uma joelhada voadora pouco acima do chão (base 46 px acima da fileira), não o chute
diagonal. A caixa de ataque vai no joelho.

## NILA f1 v2: respiração e andar

Medição: topo da cabeça e base de cada pé por figura (`base-pes.ps1`, `rosto.ps1`).

**Andar (fileiras 2 e 3) da v2: serve.** O defeito da v1 sumiu:
- Quadril constante: o topo da cabeça é **idêntico** nas 4 figuras de cada fileira (y=633 na 2, y=1185 na 3).
  Nada de levantar nem de mudar de postura entre a fileira 2 e a 3; continua a base baixa do elefante.
- Pé no chão: a base do pé da frente fica em 1214-1225 (fileira 2) e 1760-1766 (fileira 3). O quadro 3 de cada
  fileira tem o pé da frente 6-11 px mais alto, o que vira um leve afundar no passo.
- Limite: é um arrastar curto. Seis dos oito quadros são a base larga quase igual e só os quadros 3 e 7 trazem o pé
  de trás arrastado. O pé da frente nunca sai visivelmente do chão. Para uma lutadora de kalari, que avança
  arrastando o pé baixo, isso lê certo. Se no jogo parecer patinação, rodar o ciclo com menos quadros por segundo.

**Respiração (fileira 1): usar a da v1.** Na v2 os quadros 1, 2 e 4 são idênticos (topo em y=52) e só o 3 sobe
9 px: o loop dá um soluço. Na v1 o topo vai 77 → 73 → 66 → 77, uma subida e descida suave. A pose é a mesma nas
duas (braço de tromba baixo, mão de guarda no peito, pés no mesmo lugar).

**Escala ao combinar:** a v2 está desenhada ~12% maior (respiração: 599 px na v2 contra 534 px na v1, do topo à
base do pé da frente). Normalizar cada fonte pela própria altura de referência: a respiração da v1 por 534 px; o
andar da v2 pela figura de base larga da própria fileira (C4: 592 px na fileira 2, 581 px na fileira 3). Com isso a
cabeça não pula ao passar da respiração para o andar.
