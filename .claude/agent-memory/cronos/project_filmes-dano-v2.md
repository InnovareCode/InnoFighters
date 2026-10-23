---
name: filmes-dano-v2
description: V2-3a - src/data/filmes.ts (dano base + recuperacao dos 33 filmes) e tests/unit/filmes-regra.test.ts; armadilhas da regra 1,10 x hk
metadata:
  type: project
---

`src/data/filmes.ts` segue o molde de `apresentacao-especiais.ts` (chave `golpe` ou `ficha/golpe`, `filmeDoGolpe`, `todosOsFilmes`). Dano guardado = BASE (efetivo / pow, 2 casas; projetil = o efetivo). 33 registros = 31 golpes + 2 variantes `chefe2`; 33 linhas da tabela (MASHI conta 3) + 2 variantes = 35 linhas. Mediana v2/hoje: 1,267 (33) e 1,263 (35).

**Why:** a tabela aprovada do spec §4.3 tinha COUP D'ARRET em 14,0, mas 1,10 x hk (12,74) = 14,014: reprova a regra por 0,014. Subi para 14,5 (proximo passo de 0,5). Qualquer rebalanceamento de hk/pow de uma ficha pode reabrir isso: o teste mostra a linha.

**How to apply:**
- "hoje" no teste: RESORTE usa (dmg + dmgPorPx x 375) x pow (a referencia do frame-data), BULKKOT soma escala dos 2 tiros, HOERI dos 3 hits; sem isso o RESORTE parece subir 2,46x.
- `hk` da regra e o chute forte, nao o maior normal (o throw da MIN-JI, 10,8, passa do hk dela, 9,45, e a tabela usa o hk).
- `recuperacao` = 48 - clamp(vantagem, 16, 40), nao-derruba = 16. MASHI usa o nivel 2 (8); o nivel 1 daria 32 (pendencia para Vega/Nova). Teste so confere contra frame-data.json se `versaoDados` == FRAME_DATA_VERSAO (f6b9952cee5e); senao avisa e nao reprova.
- Temp de analise: nao usar python com heredoc no Bash daqui (trava); vitest nao imprime console.log, escrever em arquivo.
