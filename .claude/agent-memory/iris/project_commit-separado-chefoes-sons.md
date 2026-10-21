---
name: commit-separado-chefoes-sons
description: QA do commit separado do conjunto B (chefoes R1+P1) e C (sons S1-S3) em 2026-10-21: o que foi provado, numeros de referencia e armadilhas da verificacao
metadata:
  type: project
---

Conjuntos B (chefoes) e C (sons) do WIP pos-HEAD bfa3347 nao se sobrepoem em NENHUM arquivo (listas em `docs/commit-chefoes-arquivos.txt` e `docs/commit-sons-arquivos.txt`); cada um passa sozinho e a uniao tambem, entao a ordem do commit e indiferente.

Numeros de referencia (HEAD puro): 75 arquivos / 1672 testes (13 skipped), bundle JS 287,60 kB. B sozinho: 78 / 1800, 288,97 kB. C sozinho: 81 + 6 skipped (diagnosticos `SONS_DIAG`/`SONS_BUSCA`), 1750 + 21 skipped, 291,27 kB. Uniao: 90 arquivos, 1878 passam.

- `hashRegulares` f420ce928e06b304 = 18000 lutas jogaveis IDENTICAS no HEAD puro e com B (prova que R1 nao muda o jogavel). Referencia de producao reproduzida do zero: hash 957b8416d75bf060 em ~70 s (`--completo --esquiva --saida <tmp>`).
- Os 4 pontos de `danoNoDefensor` em game.ts + fighter.ts (+6 -5 / +18 -6) batem com o declarado pela Vega.
- Regua dos sons: reverter o inicio do oscilador (ceil->floor) e trocar o estimador de tom por um degenerado NAO mexe em R5 (hurt 0,6701 / special 0,9576 / ko 0,8288 / positivo 2,1474). So o S0b muda (3,19 com o estimador novo, 2,29 com o ruim): P e `vozeado` so alimentam `dP`, que e 0 com `eP: Infinity` (ESCALAS_EFEITO).
- Com `IDENTIDADE_SONORA=false` nada em src/ui nem main.ts chama a camada nova; unico efeito no jogo e `tocarReceita` (equivalencia byte a byte com a versao do HEAD provada com sink falso) e +3,7 kB no pacote (metodos novos do AudioSys).

**Why:** o dono quer commits por frente sem misturar; a Atlas precisa saber que cada conjunto sobrevive sozinho.

**How to apply:** ao repetir, reaproveite o roteiro de [[tecnicas-de-qa-do-projeto]]. Armadilhas desta rodada: (1) `docs/balanco` traz `versaoDados` = hash de `src/data` INCLUINDO `src/data/sons` (C), entao a etiqueta muda conforme o conjunto presente (B sozinho 2552ade14d20; com sons 78bd68d9f01e; docs gravados com f6b9952cee5e) — so a etiqueta, o conteudo numerico e identico; (2) `sons-integracao.test.ts` tem `p99 < 1 ms` por tempo de parede (medido 0,02 ms; risco baixo, mas e o unico teste dependente de timing); (3) vitest deixa os `.snap` com status M no worktree mas o conteudo e identico ao HEAD (comparar `git hash-object`).
