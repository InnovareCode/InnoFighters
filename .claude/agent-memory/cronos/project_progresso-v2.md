---
name: project-progresso-v2
description: Decisoes de modelagem do storage C4 v2 (inno-fighters-v2) e src/meta/; rollback de onda, hi=max, v>2/corrompida, saneamento
metadata:
  type: project
---

E2 entregue (2026-10-20): `inno-fighters-v2` = `{v:2,s,hi,prog}`, chave nova para rollback seguro; v1 mantida por uma release; legada so apagada apos gravar a v2. `src/meta/` e puro e recebe `Regras` injetavel (testes usam ids falsos).

**Why:** `CHAVE_STORAGE` continua = v1 ate a E4 trocar a UI (main.ts ainda usa carregarDados/salvarDados v1); `FILA_DESBLOQUEIO` vazia e `CHEFE` null em `src/meta/regras.ts` ate os ids novos entrarem em `IDS_LUTADORES`.

**How to apply:** ao mexer em storage, nao renomear `CHAVE_STORAGE` antes da E4.

Rollback (2026-10-20, docs/handoff-cronos-rollback.md): `Progresso.desconhecidos?: string[]` guarda ids fora do roster (forma `/^[a-z0-9][a-z0-9-]{0,31}$/`, max 32, ausente quando vazio), promovidos a `desbloqueados` quando o id passa a existir; nunca afetam UI. `carregarDadosV2` com v2 valida usa `hi = max(v2.hi, v1.hi)` e regrava a v2. **Why:** saneamento antigo apagava ganho de onda futura. **How to apply:** novo campo em `Progresso` deve ser opcional/preservado em `aplicarVitoriaArcade`; ids novos de lutador devem seguir a regex; protecao so vale em builds com este codigo.

Z6 (2026-10-21, docs/handoff-cronos-z6.md): `Progresso.chefesDerrotados?: string[]` (ids por forma, nao por roster, max 8, ausente quando vazio); `chefeDerrotado` virou legado DERIVADO da lista (e ainda gravado para build antigo). Legado `true` sem lista => `['baatar']`; `CHEFOES_SO_POR_DERROTA=['zenon']` recompoe a lista a partir de desbloqueados/desconhecidos apos rollback. **Why:** build pre-Z6 apaga a lista mas guarda o desbloqueio. **How to apply:** `src/` fora de meta/tipos+progresso nao pode citar `chefeDerrotado` (teste de arquitetura); apos o flip da Z5, ajustar o teste "REGRAS_PADRAO.chefe e null" em z6-chefoes-derrotados.test.ts.

Achados do Orion (2026-10-20, docs/handoff-cronos-orion.md): `inspecionarV2` distingue ausente/ok/futura(`v>2`)/corrompida. `salvarDadosV2` devolve `false` e NAO grava sobre `v>2`; v2 corrompida e copiada (sem sobrescrever copia anterior) para `inno-fighters-v2-quebrada` antes de ser substituida. `sanearConfiguracoes`: rounds 1..3, time 0/30/60/99, diff 0..2 (inteiros), `controles` <=32 entradas e chave/valor <=32 chars. `sanearHi` exportada: inteiro 0..99_999_999, acima do teto vira 0; `salvarDadosV2` sanea `s`/`hi`/`prog`. **Why:** `v:3` ou JSON ruim apagava a v2 (causa: um `undefined` unico para ausente/futuro/corrompido); rounds 1e9 travava o HUD. **How to apply:** opcao nova na UI de rounds/tempo/dificuldade exige atualizar `ROUNDS_VALIDOS`/`TEMPO_VALIDO`/`DIFF_VALIDA` em storage.ts; `false` de `salvarDadosV2` agora tambem significa "v2 de build mais novo" (a UI deve avisar).
