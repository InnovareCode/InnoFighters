---
name: project-provocacao
description: Spec da provocação pré-round e de vitória (docs/spec-provocacao-prerround-e-vitoria.md, 2026-10-21): 3º controlador fora do motor, 3 pontos de congelamento, contrato de falas, D-P1..D-P6
metadata:
  type: project
---

Em 2026-10-21 entreguei `docs/spec-provocacao-prerround-e-vitoria.md` (proposta, nada implementado). Os textos ficam com o Apolo em `docs/textos-provocacao.md`.
- Mesmo padrão da entrada do ZENON: a `CenaFight` não chama `game.update`. São 3 pontos de congelamento: antes do 1º update (round 1),
  `round start` com round ≥ 2 (motor em intro t 0) e matchend t ≥ 56 com o vencedor em `win`. A ÚNICA escrita no Game é `matchDone = true`
  no fim da vitória, igual ao ENTER que já existe. `src/fight/**` não muda.
- Roda no ARCADE e na LUTA vs CPU. Fica desligada no treino, no versus (D-P1), no CPU×CPU e em `?expansao=4` (gate = `Regras.cinematica`, sem campo
  novo). No chefão: sem pré-round (a entrada dramática é o round 1 dele).
- A preferência reusa `settings.cinematica`: desligada = nada; curta = round 1 com os balões simultâneos, sem round ≥ 2. Confronto repetido
  (c1|c2|stage) = CURTA. Movimento reduzido zera andada, zoom e pop, mas não muda as durações.
- Falas em `src/data/provocacoes.pt-BR.ts`, `Record<IdLutador, FalasDeProvocacao>`: lutador novo sem falas não compila. RNG próprio
  `sorteioDeFalas` (semente + 5). Limites: FB(20), linha ≤ 372 px / 34 car., 2 linhas / 64 (revanche: 1 linha). `{rival}` conta 8.
- Pose `provoca0/1` via ALIAS → `win`. A arte nova entra depois sem código (D-P4).

**Why:** a duração depende de preferência/pulo; no motor, o estado da luta dependeria do gosto do jogador (a mesma razão da cinemática).
**How to apply:** na revisão, conferir `git diff src/fight` vazio, snapshot sem -u e e2e antigos usando `SEM_PROVOCACAO` (risco R1), não timeout.
Relacionado: [[project-chefao-zenon]], [[project-esquiva-cinematica]].
