---
name: e5-ligacao-dados
description: E5 — 5 lutadores novos ligados ao jogo (IDS 9, fila, chefe, escada, cenários); armadilhas de atlas novo e de "produção = 4"
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit), contrato em `docs/handoff-vega-e5.md`. Só o que não se deriva do código:

- **Atlas novo tem só as 48 poses canônicas** (BAATAR 54). O FALLBACK/ALIAS global do protótipo termina em `punch`/`jumpPunch`/`crouchPunch`, que não existem nele: pose faltante cai no `idle0` SEM erro. **How to apply:** ponte por lutador em `montarLutador` (só quando falta o quadro); nunca mexer em `ALIAS`/`FALLBACK`/`BASE_ANIM`/`TYPE_ANIM` (fidelidade compara chave a chave). Teste "toda pose citada pelos golpes resolve a quadro real" roda contra o atlas de verdade.
- **`poseDaFicha` dá arte própria a uma ficha** sem tocar o golpe nem a fixture do WEI LONG (BAATAR `chefe2`: `sc0/sc1 → dive0/dive1`). Sem o quadro o mapa não entra.
- **NILA: as `sarpa*` JÁ existem no atlas (folha 5 v2, 2026-10-21; ver project_nila_f5_hayato_minji).**
- **Mudar `IDS_LUTADORES` 4→9 quebrou 24 testes**: `Record<IdLutador,…>` (compilador avisa) e tudo que assumia "produção = 4" (grade 2x2, escada de 3, fila vazia — sem aviso). Fixture `src/ui/dev-expansao.ts` (Lyra) ficou obsoleta: `[...IDS_LUTADORES]` como iniciais dá 14.
- Helper de teste que lê atlas: v2 (`imagens`, `p`, `retrato`) passa por `validarManifesto` + `paraManifestoV1` (src/assets/manifesto.ts), não por `JSON.parse` cru.
- Cenário: pés a 84,5% da altura da imagem = `(GROUND − CENARIO_Y)/CENARIO_ALTURA` (fundo desenhado em y −20, altura 580), não 87%.
- ConfigChefe do BAATAR e `IA_CHEFE` são valores de partida do doc: provisórios até a E6.
- Ambiente: `python - <<EOF` no Bash lê em cp1252 (acentos viram `?` e o `assert` falha): usar Edit/Write ou `.py` salvo em UTF-8.
