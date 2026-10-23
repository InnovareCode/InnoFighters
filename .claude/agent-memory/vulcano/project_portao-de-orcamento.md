---
name: project-portao-de-orcamento
description: T8 - portao de orcamento na CI do InnoFighters (npm run orcamento), modo aviso por padrao, como promover por item; armadilhas de medicao
metadata:
  type: project
---

2026-10-23 (T8 de docs/orcamentos-2026-10-23.md, OR-1 aprovada): `ferramentas/orcamento/{orcamento.mjs,cli.mjs,orcamento.json,README.md}`, script `npm run orcamento`, etapa depois do `npm run build` no job `build-e-testes` do ci.yml. Teste: `tests/unit/orcamento.test.ts` (dist falso).

- Entra em AVISO (exit 0): `bloqueantes: []` no orcamento.json. Promocao por item: grupo (`atlas-px`), chave (`atlas-px:wei-long`) ou `"*"`; `ORCAMENTO_MODO=bloqueante` forca tudo. Exit 2 = dist ausente (falha mesmo em aviso).
- Px do atlas vem do CABECALHO do WebP (VP8/VP8L/VP8X), nao do atlas.json; o json e so reserva.
- JS inicial = script module + modulepreload do index.html; total exclui `escuta-*` e ignora `.map`. gzip nivel 9, kB = 1000 bytes; nao comparei com o numero que o Vite imprime (so com a medicao da Iris: 119,9 kB vs 122,3 hoje).
- O `dist/` local pode estar velho em relacao a arvore de trabalho (WEI/CAIO mudaram entre duas rodadas no mesmo dia); a CI mede o commit, nao a arvore suja.

**Why:** orcamentos sem portao viram desejo; mas varios itens estouram de verdade, entao travar a CI agora pararia o trabalho.
**How to apply:** ao fechar T9/T10/cenarios br e kr, promover os grupos no JSON e rodar o comando antes. pages.yml NAO roda o portao (nao foi tocado).
