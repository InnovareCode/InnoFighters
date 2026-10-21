---
name: project-chefoes-progressivos
description: Spec chefões progressivos + temas por lutador + chefão mais duro (docs/spec-chefoes-progressivos-temas-e-dificuldade.md, 2026-10-21): chefão derivado do progresso, danoRecebido no ConfigChefe, tema como dado, D-A1..D-D5
metadata:
  type: project
---

Em 2026-10-21 entreguei `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` (proposta, nada implementado).
Pedido do dono: o chefão do ARCADE = próximo bloqueado da FILA ("guardiões"); ZENON só com os 9 liberados; entradas próprias;
tema musical para os 10; chefão leva menos dano (hipótese 20% NORMAL / 8-15% DIFÍCIL).
- Progressão = `chefeDoArcade(c1, prog, regras)` PURA, derivada de `desbloqueados` → **zero migração, zero campo novo no save**.
  `Regras.chefesDaFila` (rollback) e `Regras.temasMusicais`. A vitória recebe o id do chefão vindo da ETAPA (não recalcula no fim).
  Guardiões NÃO entram em `CHEFOES_SO_POR_DERROTA` (saves antigos liberaram-nos por zerada).
- Achado: reforço de chefão por FICHA quebra a NILA (o VADIVU troca a ficha). Por isso `danoRecebido` fica no `ConfigChefe`
  (no Fighter), as fichas de fase ficam opcionais e `rampaDaFase2` deixa de depender de `fichaFase2`.
- Multiplicador > vida maior: o desempate por tempo compara `vidaTotal` ABSOLUTA (game.ts:941).
- Temas: dados + `partituraDoPasso` pura + `playTema` novo, TrilhaMusica `tema:<id>`; fixture fight/menu/chefe intacta.
  Régua musical (dM intervalos/escala, dR grade 240, dT = régua S dos sons) calibrada com as 3 trilhas atuais ANTES de compor.
- Harness: `desafiantesDoChefe` = elenco realista (fila[k] contra iniciais + fila[0..k-1]), 39 pares; hashRegulares tem de ficar igual.
- Errei e corrigi: excluir os guardiões futuros da escada deixaria o 1º ARCADE com só 3 rivais → recomendo manter a ED5.

**Why:** a lista explícita de desbloqueados (decisão de 2026-10-20) é o que torna a progressão nova grátis em storage.
**How to apply:** na revisão, conferir `git diff src/fight` só nos 4 pontos de dano + virarChefe/andarCena, z3/z2 sem -u,
e se o dono respondeu D-D1 (plana x rampa) antes da R3. Relacionado: [[project-chefao-zenon]], [[project-sons-por-lutador]],
[[project-plano-expansao]], [[project-provocacao]].
