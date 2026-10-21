---
name: project-progresso-v2
description: Decisoes de modelagem do storage C4 v2 (inno-fighters-v2) e src/meta/; rollback de onda (desconhecidos) e hi=max
metadata:
  type: project
---

E2 entregue (2026-10-20): `inno-fighters-v2` = `{v:2,s,hi,prog}`, chave nova para rollback seguro; v1 mantida por uma release; legada so apagada apos gravar a v2. `src/meta/` e puro e recebe `Regras` injetavel (testes usam ids falsos).

**Why:** `CHAVE_STORAGE` continua = v1 ate a E4 trocar a UI (main.ts ainda usa carregarDados/salvarDados v1); `FILA_DESBLOQUEIO` vazia e `CHEFE` null em `src/meta/regras.ts` ate os ids novos entrarem em `IDS_LUTADORES`.

**How to apply:** ao mexer em storage, nao renomear `CHAVE_STORAGE` antes da E4.

Rollback (2026-10-20, docs/handoff-cronos-rollback.md): `Progresso.desconhecidos?: string[]` guarda ids fora do roster (forma `/^[a-z0-9][a-z0-9-]{0,31}$/`, max 32, ausente quando vazio), promovidos a `desbloqueados` quando o id passa a existir; nunca afetam UI. `carregarDadosV2` com v2 valida usa `hi = max(v2.hi, v1.hi)` e regrava a v2. **Why:** saneamento antigo apagava ganho de onda futura. **How to apply:** novo campo em `Progresso` deve ser opcional/preservado em `aplicarVitoriaArcade`; ids novos de lutador devem seguir a regex; protecao so vale em builds com este codigo.
