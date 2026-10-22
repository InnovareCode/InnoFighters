---
name: chefoes-ui-l1e1-qa
description: QA do conjunto E (Lyra L1/E1, chefoes progressivos + entradas por roteiro) em 2026-10-21: numeros de referencia, o que foi jogado de verdade, armadilhas de medicao em tempo real
metadata:
  type: project
---

Conjunto E = 31 arquivos (`docs/commit-chefoes-ui-arquivos.txt`), sobre HEAD 73f0074. Veredito APROVADO. Isolado em worktree: tsc limpo, vitest 92 arquivos / 2113 testes (HEAD puro: 91 / 2057; +56 = l1e1 47 + 9 reescritos), snapshots identicos ao HEAD (sha256 `fight` 3cb3b231…0356), bundle 339,53 kB (HEAD 324,28), e2e todos verdes. `fidelidade-prototipo` falhou 1x ("abertura: ROUND 1") e passou 3x seguidas: flaky de carga, nao do E.

Jogado em tempo real (teclado real, so o KO dos rivais e a vida do chefao sao atalho): os 5 guardioes, ZENON 1a vez + revanche, save antigo, ZENON solo, continue (entrada CURTA 59 ticks, 1,04 s), pulo (tick 10), modos sem chefao, selecao. Specs em `scratchpad/qa-iris-e/`.

**Armadilhas:**
- A entrada do guardiao so dispara quando o chefao esta de pe: a CENA da fase 2 (`cena-chefe`) comeca DEPOIS de ele levantar; um teste que bate de novo logo apos a troca de barra mata o chefao antes da cena e "prova" que ela nao existe. Esperar `phase === 'cena-chefe'` (ate ~8 s) sem bater.
- Medir entrada em tempo real: armar o observador DENTRO da pagina (rAF) antes do Enter do VS; `waitForFunction` + `evaluate` perde ~50 ticks. "Motor parado" = max(game.tick - g0) enquanto `entrada.ativa`, nao o delta no fim (o rAF do fim ja anda ticks).
- `fillText` espia so o que vira texto: o NOME do cartao (AMINU grande) nao passa por ele; conferir por captura. HUD do chefao e "000000  CHEFAO · TITULO" (usar includes).
- Legado: `chefeDerrotado: true` sem lista vira `chefesDerrotados:['baatar']` (CHEFE_LEGADO, comportamento de HEAD, nao do E). Save antigo realista leva `chefesDerrotados:['zenon']`.
- `cmd & ` em segundo plano sobrevive ao fim da tool: dois laços de playwright no mesmo `test-results` geram ENOENT em cascata. Rodar UM laco com `run_in_background` e esperar `FIM`. Nunca `python3 /c/...` no git-bash (caminho nao resolve): usar `node -`.

**Numeros de licencas de arte (Lyra):** CAMILLE dx 300->0 ate o tick 96, pico 4,69 px/tick (caminhada real 3,74), media 3,1: leve patinacao, so cosmetico. NILA `sarpaIdle0-3` desenha (4 quadros, sem erro).

**Rollback `chefesDaFila:false`:** com os testes de HEAD, e4-ui/e5/progresso/p1/ui/z6 passam; so 4 falham (premissas do BAATAR/HUD que a Lyra declarou). `expansao.spec` de HEAD (ARCADE ate o ZENON, 2 cartoes) passa 7/7.
