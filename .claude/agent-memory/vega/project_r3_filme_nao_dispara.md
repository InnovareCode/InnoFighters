---
name: r3-filme-nao-dispara
description: R-3 (2026-10-24) investigação do "filme nunca disparou em jogo real" (diagnostico-sensacao) - cfgMotorV2/engine/CenaFight provados corretos, causa NÃO encontrada nessa camada
metadata:
  type: project
---

Investigado em 2026-10-24, a pedido do Atlas (spec-redesenho-jogabilidade.md §3.3, evidência em
docs/diagnostico-sensacao-2026-10-24.md §3: 0 filmes em 46 acertos reais, 3 specials "limpos" citados). Sem commit.

- **O que foi DESCARTADO como causa, com prova (teste permanente `tests/unit/filme-caminho-real-ui.test.ts`)**: a ligação
  `cfgMotorV2(REGRAS_PADRAO)` (select.ts/diff.ts/campanha.ts) → `ConfigPartida.motorV2` → `Game.filmesLigados` →
  `filmeDaExecucao`/`consumirExecucao` está CORRETA. Provado em 3 camadas crescentes: (1) `Game` puro com cfg via
  `cfgMotorV2`; (2) a cena REAL (`CenaFight`, via `n.ui.set('fight', {...})`, igual a `filme-cena.test.ts` mas com
  `cfgMotorV2(regras)` em vez de `motorV2:{filmes:true}` na mão — TODOS os testes existentes de filme (filmes-motor,
  filme-cena, filme-jogo.spec, filme-ui) constroem `motorV2` manualmente, NENHUM passa pelo `cfgMotorV2` real: essa era
  a lacuna real, não um bug); (3) os 3 confrontos EXATOS do diagnóstico (hayato×caio NORMAL, caio×min-ji DIFÍCIL,
  nila×baatar NORMAL), `rounds:1`, bot reativo jogando como P1 (campos REAIS do InputFrame: `left/right/lp/hp/lk/hk/
  down/sp`, não invente campos — ver armadilha abaixo) contra CPU real em `mode:'cpu'`. Resultado: **100% dos especiais
  que conectam limpo viram filme**, em mais de 1000 specials somados (ambos os lados, inclusive os do "jogador"/P1).
  Isso inclui a cena com a TARJA/`Cinematica` ativa (congela `game.update` por ~48-66 ticks antes do acerto — suspeita
  óbvia de interação, também descartada).
- **Armadilha própria**: a 1ª rodada de testes usou campos inventados (`dirs`, `b`, `f`) no `InputFrame` em vez dos reais
  (`left`, `right`, `lp`/`hp`/`lk`/`hk`, `down`, `sp`) — `vitest`/esbuild NÃO falha em tempo de execução com campos
  extras/errados (só `tsc --noEmit` pega), então os primeiros testes "passaram" sem o P1 (bot) nunca ter de fato agido
  (só a CPU P2 lutava). Rodar `tsc --noEmit` ANTES de confiar num teste de reprodução que usa objetos construídos à mão.
- **O que NÃO foi testado (fora do alcance de um teste de unidade/vitest; precisa de Íris/browser real)**: timing real de
  `requestAnimationFrame`/DOM/canvas; `persist.settings` vindo de localStorage REAL (não só o padrão); a técnica exata de
  captura de eventos do diagnóstico (hook em `game.emitir`, fora deste repo) — se o hook tinha um bug (ex.: resetava o
  array de captura dentro do laço de amostragem de 100ms), explicaria 0/46 sem ser bug do jogo. **How to apply**: antes
  de aceitar "o filme não dispara" como bug de novo, rodar o teste permanente primeiro (`npx vitest run
  tests/unit/filme-caminho-real-ui.test.ts`) — se continuar verde, o próximo passo é Íris medir em navegador real
  (Playwright, hook em `game.emitir` plantado UMA vez, nunca resetado) antes de caçar mais no motor/cfg.
- Doc da investigação completa (achados, hipóteses descartadas uma a uma): ver o handoff desta sessão para o Atlas
  (não hesitado aqui para não duplicar; `docs/diagnostico-sensacao-2026-10-24.md` é da Íris, não editado).
