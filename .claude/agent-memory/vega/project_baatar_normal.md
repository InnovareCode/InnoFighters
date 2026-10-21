---
name: baatar-normal
description: BAATAR deixou de ser chefão (2026-10-21) — CHEFE null temporário, fixtura de teste do chefe antigo, dano do MERGULHO, armadilhas de teste
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit; contrato em `docs/handoff-vega-baatar-normal.md`). Só o que não se deriva do código:

- **`CHEFE = null` é TEMPORÁRIO até o Zenon.** Escada = 5 etapas; o BAATAR passa a ser candidato a rival (`montarEscada` só o exclui por ser `regras.chefe`). **Why:** o dono trocou o chefão; **How to apply:** ao entrar o Zenon, `CHEFE` vira o id dele e os testes marcados `R9C` (e4-ui) e `_baatar-chefe.ts` migram para o def dele.
- **Def antigo do BAATAR guardado como FIXTURA** em `tests/unit/_baatar-chefe.ts` (`BAATAR_CHEFE`, `BAATAR_COM_ABRACO`, `comBaatarChefe(elenco)`). A mecânica de chefe/rush do motor continua provada com a arte real; não apagar esses testes.
- **Dano de chefão não vale para o jogável:** MERGULHO `dmg 20, cost 30` => BAATAR 65%; `dmg 10, cost 35` => 52,1% (esquiva 54,2%). Subir só o `cost` não derruba a taxa; `dmg` é a alavanca. CENTELLA ficou em 42,5% (já era a mais fraca).
- **Teste de dica de CPU**: o cancelamento de golpe que acabou de acertar ignora `ia` (combo); filtrar `anterior === null` ao medir "dentro do alcance da dica", senão o RNG novo acusa falso positivo.
- Harness: `montarTarefas(ids, chefe | null, ...)` não gera tarefa de chefe com `null`; a estatística de agarrões usa `'baatar'` literal.
- Concorrência: Lyra (render/ui/e2e), Apolo (identidade-visual doc) e Cronos (`src/meta`, `core/storage`, `z6-chefoes-derrotados`) mexem no mesmo tree; `typecheck` e `npm test` podem acusar arquivo alheio. Conferir por arquivo.
