---
name: qa-v2-3e-filme
description: QA do filme do especial no jogo real (motorV2.filmes), silhuetas por quadro, combos na tela; achados, specs novos, números de memória e armadilhas
metadata:
  type: project
---

Specs novos em `tests/e2e/`: `filme-jogo` (KO e troca de barra DENTRO do filme, pular com hash do motor igual, 32 especiais pelo motor, 2º contato no mesmo tick, painel do HAYATO P1/P2, rede/404/soltar pela pausa), `silhueta-no-jogo` (flash, rastro de corrida e de esquiva), `memoria-filme` (celular). Ajustados: `arte-sob-demanda` (CAIO/WEI sem atlas v1), `fluidez` (aquecer o desenho antes de comparar), `combos-tela` (texto com sombra desenha em y+1,5 ANTES: pegar o MENOR y).

**Achado aberto:** `fidelidade-prototipo` > `desenharPose` vermelho desde bf99492 (silhueta por quadro com margem de 1 px): so a coluna do flash branco (alfa 0,6), 5509 px de borda nos 4 lutadores, max 25 niveis (73% <= 8). Nao e deslocamento visivel; e amostragem da borda da silhueta (margem transparente x vizinhos do atlas). Decisao do dono: aceitar com tolerancia so nessa celula, ou corrigir a silhueta.

**Numeros (celular, HAYATO x HAYATO, maquina com 30-60% de CPU, NAO quieta):** folha decodificada 1920x1280x4 = 9,375 MiB (analitico, certo); nos processos do Chromium a folha custa so ~3-4 MiB (privada +4,2 / WS +3,3 contra o controle que tambem toca um filme); a folha so entra na memoria depois de desenhada. Tocar o 1o filme custa ~+40 MiB de WS (+14 priv) com ou sem folha. p95 de quadro filme x normal: 25,2 x 26,9 ms (celular), 29,2 x 27,3 (desktop): iguais dentro do ruido.

**Armadilhas:**
- A cinematica da tarja congela a cena no comeco de cada especial: em teste que conta ticks do roteiro, `h.persist.settings.cinematica = 'desligada'` (o filme vira CURTO, 30).
- Espioes sobre `efeitos.reagir`/`scene.comecarFilme` empilham a cada `ui.set('fight')` (mesmos objetos): instalar uma vez (flag em window).
- A busca de "2 contatos no mesmo tick" muda com a ARTE (geometria): par corpo a corpo + projetil de unit nao coincide com a arte nova; coincide HAYATO sFire x WEI sFire (d 60-85, atraso -6).
- HURACANRANA (centella sDown) so agarra rival NO AR; sem isso "nenhum filme abre" e normal.
- Painel deslizando: o clip corta o close; medir margem/fantasma so com a borda parada.
- Duracao COMPLETA do filme varia por roteiro: 66 (maioria), 62 (projeteis), 58 (BAATAR sFire).

**How to apply:** ao reabrir o filme/silhuetas, rodar esses specs no worktree limpo; ver [[estabilizacao-portao-2026-10-23]] e [[tecnicas-de-qa-do-projeto]].
