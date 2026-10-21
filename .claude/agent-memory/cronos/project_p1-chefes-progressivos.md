---
name: project-p1-chefes-progressivos
description: P1 (2026-10-21): chefeDoArcade derivado de desbloqueados, Regras.chefesDaFila padrao false ate a L1, aplicarVitoriaArcade com uniao de formatos
metadata:
  type: project
---

`src/meta/chefes.ts` (`chefeDoArcade`, `ehChefeFinal`, `desafiantesDoChefe`) deriva o chefao do ARCADE de `desbloqueados`: sem campo novo, sem migracao, v2 intacto. `aplicarVitoriaArcade` aceita `{chefe}` (regra nova, so com `Regras.chefesDaFila`) ou `{derrotouChefe}` (regra antiga SEMPRE, igual ao HEAD ac57a80). `MAX_CHEFES_DERROTADOS` 16; `CHEFOES_SO_POR_DERROTA` segue so `['zenon']` (guardioes nao provam derrota).

**Why:** `REGRAS_PADRAO.chefesDaFila` ficou `false` (a spec dizia `true`): com `true` a escada ja teria AMINU de chefao enquanto o `fim.ts` ainda libera o ZENON; 7 testes antigos (e4-ui x3, e5-elenco x2, progresso.test, z6 caso 5) fixam a regra antiga.

**How to apply:** a L1 (Lyra) vira a chave em `src/meta/regras.ts` junto com `fim.ts` passando `a.run.etapas.find(e=>e.chefe)?.id ?? null`, e reescreve esses testes. Oraculos de rollback/diferencial vivem em `tests/fixtures/{progresso,escada}-ac57a80.ts` (copias do HEAD; nao editar). Detalhe em docs/handoff-cronos-chefes.md.

Armadilha de ferramenta: `src/meta` esta em CRLF e `Edit` falha em trecho multilinha; usar script Python/Node com `newline=''`. O scratchpad da sessao e compartilhado com outros agentes: nomear arquivos com prefixo proprio (ja sobrescrevi um `base.txt`).
