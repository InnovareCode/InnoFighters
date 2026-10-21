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
- Dragão FX do WEI aprovado (1bcee91a); falta o original em `arte-fonte/lutadores/wei-long/fx/wei-long-fx-v1.png`.
