---
name: project-curadoria-sprites
description: Curadoria das folhas de sprite IA do InnoFighters — critérios usados, armadilhas de leitura (.jfif) e estado da proposta do WEI LONG
metadata:
  type: project
---

Proposta de folhas canônicas do WEI LONG entregue em 2026-10-20 em `docs/proposta-wei-long.md` (aguarda aprovação do dono).
Escolha: 153007 base, 153112 reação, 153710 normais, 153054 especiais (a editar: FX lilás e túnica curta).

**Why:** a arte é gerada por IA e cada folha muda detalhes de traje (túnica curta x painel longo, braçadeira preta x marrom,
dragão grande x pequeno). O critério que decidiu: traje majoritário + facilidade de chroma key; FX assado sai porque o motor
já desenha os projéteis.

**How to apply:**
- Ao curar folhas de outros lutadores (CAIO, MIN-JI), comparar traje célula a célula — a IA troca o traje até DENTRO da mesma folha.
- Medir fundo/grade por pixel (script C# via PowerShell no scratchpad) antes de afirmar cor de fundo: a avaliação visual
  anterior dizia "2 folhas com fundo preto" e era a grade/borda escura; todas eram magenta.
- `Read` não abre `.jfif` como imagem: copiar para o scratchpad como `.jpg` e ler a cópia.
- FX deve ser pedido como asset separado em fundo preto (mistura aditiva), nunca assado na folha magenta.
- Gemini com 2 imagens anexadas ECOOU a referência (devolveu a 153007 em vez de editar a 153054, 2026-10-20).
  Edições: UMA imagem anexada por vez, traje descrito em palavras. Ao curar, comparar o resultado com TODAS as folhas de origem.
- Medição de imagem sem `sharp`: PowerShell + System.Drawing (`scratchpad/fx-medir.ps1`): brilho do fundo, segmentos por coluna, cor média.
- Folhas 1 dos novos (2026-10-20, `docs/handoff-apolo-folhas1-novos.md`): AMINU/CAMILLE aprovadas, CENTELLA corrigir no
  recorte, NILA regerar o andar. Runway não respeita a grade 600x597: figuras a ~93% da fileira, pés passam de y=597,
  colunas com passo de 450 px. **Contar componentes conexos** (deve dar 12) acha figura encostando que o olho não vê.
- Andar de base larga/lateral (elefante, dambe): pedir "step-and-drag com quadril na mesma altura", não "back foot
  passing" — a IA estica a perna de trás ou levanta a figura e o ciclo pula de postura entre as fileiras.
- Runway deixa 2 px de ruído na última linha da imagem: recortar a borda antes de medir "pixel na borda".
- `docs/prompts/0X-*.md` podem estar defasados de `docs/prompts-arte.md` (faltava IMPORTANT SPACING): conferir antes de curar.
- AMINU f2-f4 (2026-10-20, `docs/handoff-apolo-aminu-f2-f4.md`): f2 espelhar nocaute, f3 regerar, f4 aprovada.
  Em golpe com a mão da FRENTE (jab), a IA enfaixa os dois punhos: o prompt precisa dizer "the BARE lead fist".
  "Crouching X" pode sair em pé em base larga: comparar a altura com a de pé. Caixas das fileiras se sobrepõem
  na vertical no Runway: recortar por componente, nunca por grade.
- Lote 5 (2026-10-20, `docs/handoff-apolo-novos-f2-f4.md`): nenhuma folha precisou de Runway; tudo por código.
  Defeitos novos que a IA mete mesmo com "NO effects": **linha de chão** (une a fileira num componente só: contagem
  < 12 é o sinal), **traços de movimento/impacto** (soltos = componente pequeno; encostados na figura = só a olho).
  "Knocked into the air ... head on the left" sai com a cabeça à DIREITA em 2 de 3 lutadores: conferir como o nocaute.
  Quadros quase idênticos (respiração/andar) se acham comparando o topo da cabeça e a base de cada pé por figura.
  Folhas de versões diferentes vêm em escalas diferentes (~12%): normalizar cada fonte pela própria referência.
- Lote 6 (2026-10-20): correções executadas por código em `scratchpad/runway-lote6/` (espelho, linha, traços,
  NILA f1 v3 = respiração v1 ×1.14 + andar v2, AMINU f3 v3 = v2 com L2 C4 da v1). Trocar célula entre versões
  funciona: máscara do componente + escala pela mesma pose + âncora no pé de apoio; depois limpar halo.
  AMINU: corrigir as mãos no prompt fez a IA enfaixar as DUAS canelas no chute alto. Cada correção de traje
  pode criar outro defeito de traje: recurar a folha inteira, não só as células pedidas.
- BAATAR lote 7 (2026-10-20, `docs/handoff-apolo-baatar-folhas.md`): B2 linha de chão (limpa por `tirar-linha.ps1`),
  B3 "deep crouch" saiu em pé (98% do idle), B9 mudou a PROPORÇÃO (cabeça 18% menor, botas iguais): escala não conserta,
  regerar anexando a b1 aprovada. Altura total engana em poses diferentes: **medir topo-cabeça→queixo** (zoom grade 10)
  e conferir com objeto rígido (bota). Sem oponente, "hip toss" vira mão no próprio calção: dizer "hands never touching
  his own clothes". Aéreo de soco sai como preparo (punho acima da cabeça): pedir "arm extended down-forward".
  Defeitos de várias folhas: juntar numa folha de reposição de 6 poses (1 geração).
  Lote 8: anexar a b1 aprovada + frase BODY PROPORTIONS consertou a B9 (cabeça voltou a 151-155 px). Na reposição,
  só 2 de 6 entraram: o modelo insiste em soco reto (antebraço) e punho acima da cabeça (soco aéreo) mesmo pedindo outra
  coisa. Depois de 2 falhas, aceite e ajuste a caixa de acerto. "Igual à célula 1, só mais baixa" NÃO dá par de respiração.
  Dedos tangenciando x=0 com contorno fechado = margem no recorte, não regerar.
- NILA f5 serpente (2026-10-21, `docs/handoff-apolo-nila-f5.md`): REGERAR. Idle e defesa saíram na postura do ELEFANTE
  porque o bloco CHARACTER (injetado em toda folha) termina com a postura de luta e a mestra anexada está nela; células
  de ação concreta saíram certas. **Folha de postura alternativa: trocar a frase de postura do CHARACTER, não só a linha.**
  Teste rápido de postura: razão largura/altura da caixa (serpente é mais larga que alta). f4/f5 da NILA ~10% menores
  que a f1 v3 (cabeça 101-102 x 112 px): `fatorFolha` ~1,11.
- ZENON S1-S10 (2026-10-21, `docs/handoff-apolo-zenon-folhas.md`): nenhuma regeração obrigatória; mapa v1 fecha as 60 poses
  com apelidos (cblock=crouch, sweep=clk); ZR opcional (6 créditos). Defeitos: idle duplicado (achar com `difmask.ps1`: <3% =
  mesmo desenho), cblock alta (88% do idle) porque o CHARACTER diz "tall and upright", rasteira com a perna de TRÁS, SELO com o
  braço errado ("right arm" é ambíguo: diga "the arm nearest the viewer"), pose "tirando a poeira" desenhou poeira (verbo que
  implica partícula vira efeito). Régua de escala: cano da bota a 16 px da sola (~72 px) + cabeça (`queixo.ps1`, falha na
  mestra: lá medir a olho). Cabeça inclinada infla topo→queixo ~8%: confira com a bota antes de pedir `fatorFolha`.
- ZENON ZR (2026-10-21, §8 do mesmo doc): 3 de 6 entraram (`sweep` r1c2, `jpunch` r2c3; r2c2 reserva). A `cblock` falhou em
  3 células de 2 gerações: este modelo não desenha defesa agachada baixa para personagem alto; fica o apelido do `crouch`.
  **Eco da referência também no Runway:** pose parecida com a anexada (SELO = mão estendida, igual à guarda do idle) volta
  como a própria referência (6,1% de máscara, menos que idle x idle). Sempre rodar `difcruz.ps1` da célula contra a anexada;
  diferença menor que a da respiração = eco, reprova mesmo cumprindo o critério escrito.
- CAIO v1 (2026-10-23, `docs/relatorio-curadoria-caio-v1.md`): nenhuma regeração; f2-v2/f4-v2 limpas por código, f1 por mapa
  (idle ping-pong, walk6 = apelido do walk5). Scripts em `arte-fonte/ferramentas-curadoria/` (local: `arte-fonte/` é
  gitignored). **`MODO_PONTA` padrão põe sb1/sb2/sc1 em `mao`**: se o especial é chute/rasteira, pedir exceção `direita`.
  Rasteira que não "gira": espelhar o quadro do meio (`--espelhar f4:sb2`) vende a meia-volta, 0 crédito. Descalço: a régua
  é o pé de perfil (faixa de 22 px da base), não a cabeça. Risco colado no pé: fora = regra de cor (B alto) + polígono;
  véu sobre a pele = repintar por difusão; contorno encoberto = reta com antisserrilhado (desenhar 4x e reduzir).
- CAIO f1 v2 GINGA (2026-10-23, §7 do relatório do CAIO): 12 de 12 ok, sem regerar. **Linha de chão com contorno da
  sola da MESMA cor:** regra de cor pura comeu a sola (51 componentes). O que funciona: a figura fica POR CIMA da linha;
  varrer a faixa por coluna a partir do lado que é fundo e PARAR no 1º pixel que não bate com a mediana da linha;
  depois fechar a base da sola (janela 9) devolvendo os pixels originais (`caio-f1-tirar-linha.py`). Andar de ginga:
  quadros caem em 2 grupos (de costas x de frente); reordenar pelo mapa (minimax do laço) baixou o pior passo de 56 para
  45%. **Idle agachado aumenta o lutador inteiro** (a escala vem da altura do idle0): a régua é `alturaRef`, não
  `fatorFolha`. Corpo balançando sobre pés plantados + âncora no centro de massa = pés patinando (proposta `ancora: pes`).
- Dragão FX do WEI aprovado (1bcee91a); falta o original em `arte-fonte/lutadores/wei-long/fx/wei-long-fx-v1.png`.
- WEI LONG novo v1 (2026-10-23, `docs/relatorio-curadoria-wei-long-v1.md`): f1 v2 (C2 = C1 esticada x1,012 = quadro
  intermediário da respiração; C1/C2/C4 eram o mesmo desenho), f2 v2 (respingos de saliva do hitH, fundidos pelo raioFusao 24),
  f3 ok, f4: `sc1` saiu SOCO (punho = ponta) e `jkick` joelhada -> folha WR 4x3 (não 3x2: mantém a escala sem fatorFolha).
  **Armadilha:** o pipeline pega o MAIOR vN da pasta; `wei-long-f4-especiais-v2..v4` antigas ganham da f4 nova. Antes de criar
  "-v2", listar a pasta. Ferramentas Python (PIL+numpy, `python -P`, sem scipy) no scratchpad; o pipeline real
  (`node ferramentas/sprites/cli.mjs <id> --folha fN=arq --saida <scratch> --sem-contato`) é a prova mais barata.
  Andar step-and-drag se prova com pés relativos ao centro de massa (âncora `ax`): pé plantado recua, o outro avança.
- WEI WR v1 (2026-10-23, §7 do mesmo relatório): 4 de 12 (sc0 L1C1, sc1 L1C3 back slam, jkick L2C3, jpunch L2C4); sb1/clp
  falharam 2x (cavalo baixo do WEI sai a 88-95% ou com mãos nos joelhos) -> ficam os v1. **Ponta em pose de corpo inteiro:**
  num golpe de ombro/costas o JOELHO da frente fica 1 px acima da faixa dos pés e vira a ponta `mao` (caixa na canela):
  medir a ponta no atlas.json, não só "não é punho"; proposta `mao:F` (análogo ao `pe:F`) para a Vega. XOR contra a mestra
  só vale com a mestra REESCALADA para a altura da célula (sem isso dá 98%). `acharFolha` não lê subpastas: `_arquivo/`
  esconde versão velha, mas só depois de tirar o original da raiz (fiz só a cópia; tirar depende do dono).
