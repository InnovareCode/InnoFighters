---
name: jogar-de-verdade-contra-cpu
description: Como gerar evidência de jogo real (teclado + CPU) via Playwright sem sofrer throttling de rAF nem HMR de outros agentes; achados do diagnóstico 2026-10-24 (209ecd8)
metadata:
  type: reference
---

**rAF estrangulado em Chromium headless:** em `?manual=0` (laço real de `main.ts`), o `requestAnimationFrame`
roda só ~1-2 Hz headless; como `acc += Math.min(agora-ultimo, 100)` (main.ts:245) tem teto de 100 ms por
quadro, a luta inteira roda em câmera lenta em relação ao relógio de parede (medido: 81 ticks de jogo em 6 s
de parede). Sempre usar `?manual=1` + `h.avancar(6)` (6 ticks = 100 ms a 60 Hz, exato) + `h.desenhar()` por
passo — é o MESMO `ui.update()` do jogo real, só quem chama muda. "Jogador por teclado" via
`window.dispatchEvent(new KeyboardEvent('keydown'/'keyup', {key}))` passa pelos mesmos listeners de
`src/input/teclado.ts`/`CTRL_P1`; não precisa do CDP `page.keyboard` (mais lento, ida-e-volta por tecla).

**Boot espera 1 gesto antes do trailer/intro:** depois de `ui.ready===true`, o trailer lazy ainda está
baixando (`import('../trailer')` assíncrono); esperar `ui.cenas.trailer.carregado===true` ANTES de disparar o
gesto (`keydown Enter`), senão o boot cai na `CenaIntro` de hoje em vez do trailer.

**Servidor dev no working tree compartilhado sofre HMR de outros agentes:** luta real dura dezenas de
segundos; se alguém editar `src/` nesse meio tempo, o Vite recarrega a página inteira e `page.evaluate`
quebra com "Execution context was destroyed" (ou simplesmente perde o estado do jogo). Antes de qualquer
sessão de jogo real/longa: `git worktree add --detach <pasta> <commit>`, junction do `node_modules`
(`powershell New-Item -ItemType Junction`), servidor Vite dedicado numa porta própria. Ver
[[tecnicas-de-qa-do-projeto]] para a técnica de worktree (já usada para commit parcial; aqui é para isolar de
edições concorrentes, não só para selecionar arquivos).

**Ganchos úteis em DEV:** `window.__inno` (`entrada, ui, semente, persist, avancar, desenhar, mundo()`) só
existe com `import.meta.env.DEV`. `h.ui.set('fight', {cfg})` entra direto na luta (bypassa menu), mas exige
`h.ui.ready===true` antes (senão `Navegador: a arte ainda nao carregou`). Monkey-patch de `game.emitir` logo
depois do `set('fight')` captura TODO evento do motor com o tick exato — melhor fonte de verdade que
screenshot. `h.ui.scene.cine.estado` dá `{modo,tick,lutador,golpe}` da cinemática do especial;
`h.ui.scene.diagnostico()` (CenaTrailer) dá `{estatico, motivoEstatico, plano, tick, filmeAtivo}`.

**Achados do diagnóstico 2026-10-24 (HEAD 209ecd8, ver `docs/diagnostico-sensacao-2026-10-24.md`):**
- Tempo parado médio por luta (1 round, 3 lutas reais via bot): **44,6%** (provocação ~20%, tarja ~9%,
  hitstop amostrado ~4%, resto KO/contagem/vitória). Não muda sistematicamente com `?motorv2=0`.
- Tarja do especial (`Regras.cinematica`, INDEPENDENTE do motorV2) apareceu em 100% das ativações testadas em
  `cpu`/`training`/`versus`/`arcade` (~30 especiais, 0 falhas). Só falha por desenho com
  `prefers-reduced-motion: reduce` (emulado via Playwright `page.emulateMedia`): cai para modo `'curta'`, que
  não tem tarja nenhuma (só flash + nome pequeno). Hipótese forte para "não vi a tarja" do dono.
- `filmeAtivo`/`hit.filme` NUNCA apareceu em 4 lutas reais (46 acertos, incluindo specials limpos). Mecânica
  existe (motorV2.filmes=true, e2e dedicado) mas não se manifestou em jogo real nesta amostra.
- CPU combo real existe (até 3 hits, `hit.acertos`) mas é raro; padrão comum é repetir o MESMO especial
  várias vezes na mesma luta (MIN-JI DIFÍCIL: `sFwd` x4 em 28,6 s).

**How to apply:** próxima vez que pedirem "jogo real"/sensação, reusar esta técnica (worktree isolado +
`?manual=1` + `h.avancar` + eventos de `game.emitir`) em vez de reinventar; é ~10x mais rápido e mais robusto
que tempo real headless.
