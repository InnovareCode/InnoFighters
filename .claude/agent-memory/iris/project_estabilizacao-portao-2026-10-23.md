---
name: estabilizacao-portao-2026-10-23
description: Causa raiz do fidelidade-prototipo vermelho (aquecimento ocioso do trailer + estado do proto + EPERM + originais Caio/WEI LONG), gate de relogio fora do npm test, timeouts, testes de platform
metadata:
  type: project
---

**fidelidade-prototipo NAO era Chromium nem regressao visivel; tres causas distintas (bisect em worktree limpo, 1 worker):**
1. `dcdfe0c` (trailer): o boot agenda `requestIdleCallback` -> `aquecerImagens` desenha cada cenario em 16x16; isso muda a amostragem do Chromium sobre a MESMA imagem quando o teste a desenha em tamanho real (colunas de 1 px, 3-9 niveis, cenarios JPEG do oraculo). Depende de o tempo ocioso chegar antes do teste -> "as vezes passa" (a 1a rodada limpa de f5b5fab passou 11/11, as seguintes nao). Pass ate 497cb33; falha 6/6 em dcdfe0c e f5b5fab (subset arremesso|nocaute). Correcao: `semAquecimentoOcioso(page)` (init script que anula requestIdleCallback) em `tests/e2e/_jp-prototipo.ts`.
2. Cena "especial em onda" tick 105 (faixa y 844-1018, max 6) falha em 1 worker desde F1c (e704d93) por estado acumulado da pagina do prototipo entre cenas; passa isolada. Correcao: pagina do prototipo POR TESTE (beforeEach/afterEach), ~3 s a mais por teste.
3. EPERM em `test-results/prototipo-fontes`: 4 workers fazem rename por cima do mesmo arquivo. Correcao: nome com hash do conteudo, sem sobrescrever.
4. Em bd14dbc (arte nova de CAIO/WEI LONG, 0e6cd26) o oraculo ficou vermelho em 9/11 (max 250): as fixtures `tests/fixtures/atlas-prototipo/{caio,wei-long}` foram commitadas mas `ORIGINAIS` so tinha hayato/min-ji. Ligar os 4 -> 11/11 (1 e 4 workers).
Nada de tolerancia nem oraculo regerado. Toda vez que uma arte de lutador mudar em producao: adicionar o id em `ORIGINAIS`.

**Gate de relogio:** `tests/support/perf.ts` (`itPerf`, `PERF`), `vitest.perf.config.ts` (serial, INNO_PERF=1), `npm run test:perf`. Fora do `npm test`: p99 de sons-integracao (2), musica-orcamento (so a parte p99), sons-amostras-plano (custo vs sintese). `vite.config.ts` testTimeout/hookTimeout 30 s; `trailer-ferramentas` 120 s. Prova: 3 vitest completos em paralelo no HEAD antigo = 7-8 falhas cada (chefe-adversarial, fontes, sons-volume, sprites-pipeline, balanco, sons-vozes, trailer-ferramentas); com as mudancas = 0 em 3/3.

**Armadilhas:** JS normaliza CRLF dentro de template literal, mas arquivos do repo sao CRLF: editar via node com normalizacao LF e regravar CRLF. Outra instancia pode editar o mesmo arquivo (_jp-prototipo.ts mudou durante a sessao): ler e gravar na mesma chamada. `scratchpad/mutar.mjs` pode ser de outra sessao: usar nomes proprios. Mutantes vivos em orientacao.ts (guardas de `lock`/`orientation` nulo) sao equivalentes: o try/catch ja absorve o TypeError.

**Why:** o portao (pages.yml roda `npm test`) nao pode ficar vermelho por acaso; o oraculo precisa falhar so por defeito de desenho.
**How to apply:** ver [[tecnicas-de-qa-do-projeto]] e [[saude-da-suite-2026-10-23]].
