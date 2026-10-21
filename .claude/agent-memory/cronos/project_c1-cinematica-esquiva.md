---
name: project-c1-cinematica-esquiva
description: C1 (2026-10-21): Regras.esquiva/cinematica e Configuracoes.cinematica? ficam AUSENTES por padrao; UI resolve (B15 reduced-motion)
metadata:
  type: project
---

`Configuracoes.cinematica?` ('completa'|'curta'|'desligada') nao esta em `CONFIGURACOES_PADRAO` nem e injetada pelo `sanearConfiguracoes`: invalido/ausente = ausente; a UI aplica `CINEMATICA_PADRAO='completa'` (ou 'curta' com reduced-motion).

**Why:** o B15 da spec precisa distinguir "escolheu completa" de "nunca escolheu"; injetar o padrao no saneamento mataria isso.

**How to apply:** preferencia nova com padrao dependente de contexto segue o mesmo molde. `options.ts` "restaurar padroes" usa `Object.assign(S, CONFIGURACOES_PADRAO)` e NAO limpa campo ausente do padrao (precisa `delete S.cinematica`). `Regras.esquiva/cinematica`: true em REGRAS_PADRAO e `?expansao=1`, false em `regrasDeQuatro()` (`src/ui/dev-expansao.ts`). Detalhe em docs/handoff-cronos-c1.md.
