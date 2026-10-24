---
name: r4-onda1-ritmo-prova
description: R-4 (2026-10-24, HEAD f92bbcf) - prova independente da onda 1 (R-1+R-2) do redesenho de jogabilidade; números G1/G2, veredito, e o fix da fixture de memória do CAIO
metadata:
  type: project
---

Prova independente de `docs/spec-redesenho-jogabilidade.md` R-4, commit f92bbcf (Lyra, R-1 contador `__ritmo` +
R-2 faixa sem congelar/provocação sobreposta). Método: [[jogar-de-verdade-contra-cpu]] (worktree isolado +
`vite dev` em porta própria, `?manual=1`, bot por teclado real via `window.dispatchEvent`).

**Matriz própria (11 confrontos: 1 FÁCIL/3 NORMAL/4 DIFÍCIL cobrindo os 10 lutadores + 2 bot×bot + 1 chefão
ZENON), melhor de 3, cfg REAL com `cfgMotorV2` — não é o número do commit (67,0%→32,2%, 1 cenário da Lyra), é uma
medição independente e mais ampla:**
- Sem controle médio (G2-like, luta inteira): **45,0% → 31,9%** com a flag. TODAS as 11 partidas melhoraram, 0
  regressão. Por faixa: FÁCIL 53,7%→42,0%; NORMAL 45,6%→30,7%; DIFÍCIL 38,2%→22,7%; VERSUS 50,8%→42,2%;
  chefão 50,3%→41,8%.
- Bucket `tarja` (congelante) caiu para **0 em 100% das 11 partidas** com a flag — exatamente a promessa do R-2.
- `entrada-chefe` ficou em 270 ticks nos dois estados da flag (igual): confirma que onda 1 não mexe na entrada
  do chefão, como a spec declara.
- G3 (pré-luta ≤150 ticks) e a geometria da faixa (não cobre HUD/cabeça) já tinham e2e dedicado
  (`tests/e2e/ritmo-r1-r2.spec.ts`, 10 testes) — rodei de novo isolado e todos passaram.
- **G1≤10%/G2≤20% completos NÃO foram batidos** — e não deveriam: a própria spec (§9 "inferido, sem medir") diz
  que só a onda 2 (cadeia/cpu/intervalos/filmeRestrito) chega lá. Julgar onda 1 pelos números completos do
  portão seria errado; o critério certo de R-4 é "sem regressão + G1 direcionalmente melhor", que bateu.

**Escopo do "1 ARCADE até um chefão":** não subi as 5 etapas da escada (fluxo de vitória/continue entre etapas é
UI não tocada pela onda 1); testei a luta de chefe direto (`cfg: {mode:'cpu', c2:'zenon', chefe:true}`). Decisão
de escopo, não lacuna de prova da onda 1 (a entrada do chefão é testada igual).

**R-3 (achado, não corrigido por mim):** ver [[jogar-de-verdade-contra-cpu]] — o "filme nunca dispara" do
diagnóstico anterior era o atalho de teste (`cfg.motorV2` ausente), não o jogo. Com o caminho real, 100% dos
especiais limpos abrem filme, em 11 confrontos × 2 flags × DOM real.

**Fixture corrigida:** `tests/e2e/memoria-por-luta.spec.ts` tinha 16 testes vermelhos (8 casos × 2 projetos)
porque o atlas do CAIO encolheu ~2,0-2,1 MiB (commit 5bd8e7a, capoeira f3 v2). Como o CAIO está sempre na
vitrine da política 'fixa', TODA luta 'fixa' caiu (não só as do CAIO). Remedi e atualizei os 8 números (FIXA:
135.3→133.2, 206.7→204.6, 185.1→183.1, 231.6→229.6, 189.6→187.6, 173.2→171.1, 165.3→163.2; PESO CAIO×AMINU:
85.7→83.6) — orçamento §6a (≤115/≤150 MiB) continua intacto, só a referência mudou. 34/34 verde depois.
Não achei um 17º (procurei "memoria-filme" como spec separado: não existe; é o describe 'por-peso' com
`filmes:true` dentro do mesmo arquivo) — 16 é o número real, a missão dizia "17" de cabeça.

**How to apply:** a próxima vez que uma arte/atlas mudar de tamanho (Apolo entrega folha nova), rodar
`memoria-por-luta.spec.ts` cedo — ele pega qualquer lutador na vitrine (hayato/wei-long/min-ji/caio) e propaga
pra TODOS os casos 'fixa', não só o lutador que mudou.
