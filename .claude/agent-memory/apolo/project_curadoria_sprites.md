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
