---
name: nila-f5-hayato-minji
description: Folha 5 da NILA (folhasExtras, pe:fração, fatorFolha medido) e troca de arte de HAYATO/MIN-JI com atlas original como fixture do oráculo
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit). Detalhes em `docs/handoff-vega-nila-f5.md` e `docs/handoff-vega-hayato-min-ji.md`. Só o que não se deriva do código:

- **`folhasExtras` em `lutadores.json`** acrescenta folha fora do layout (NILA f5 = `sarpa*`); `executar.mjs` põe nomes fora de `ORDEM_COMPLETA` no fim do manifesto. `ponta` aceita `pe:0.75`. **Why:** `pe` fixo (55%) pegava a ponta dos dedos no deslize. **How to apply:** ponta por golpe se confere a olho.
- **`fatorFolha` mede-se na versão que ENTRA**, cabeça topo-queixo com régua 4x (scratchpad `cabeca.cjs`/`montagem.cjs`, descartáveis). A medida do Apolo (f5 101 px) era da v1; a v2 mede 117 (casa com f1 v3, 115). NILA: f2 (~95) x1,2, f3 (~100) x1,15, f4 x1,1 aplicados por decisão do Atlas (atlas passou a 3 páginas; e2e `novos-lutadores` tem `paginas: 2` da NILA, da Lyra). HAYATO e MIN-JI: sem fator (cabeças iguais entre folhas).
- **A caixa do golpe da ficha sai de `getPD(parcial, a[0])`** (montar.ts), então `poseDaFicha` + `ponta` do quadro ditam o alcance; `sarpaLeap1` ficou sem uso porque ligar exige `anim.sFwd` próprio e a caixa viria de `a[0]`.
- **Troca de arte de lutador do protótipo (HAYATO, MIN-JI) quebra o oráculo por 3 caminhos:** `dados.test`/`atlas.test` (leem o atlas), `montarTodos()` (caixas -> lock-step + snapshot) e e2e de pixel (Lyra). Atlas original guardado em `tests/fixtures/atlas-prototipo/<id>/`; `montarTodos({arteReal:true})` monta pela produção. Mutar a lista `ORIGINAIS_COM_ATLAS_DE_PROTOTIPO` derruba snapshot + 18 testes.
- Atlas copiado para `public/` SEM `relatorio.json`; retrato via `node ferramentas/gerar-retratos.mjs --so <id>` (+ `--verificar`) e `atlas.json.retrato` igualado ao `retrato.json`.
- **Ambiente:** `python - <<'PYEOF'` no Bash come `\\`/`\/` em regex JS (SyntaxWarning, texto errado): para regex use a ferramenta Edit.
