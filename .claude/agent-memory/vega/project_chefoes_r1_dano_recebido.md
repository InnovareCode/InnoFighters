---
name: chefoes-r1-dano-recebido
description: R1/R2/R3 dos chefões progressivos — ConfigChefe.danoRecebido no motor, 5 guardiões em dados, harness com 39 pares e rampa de metas; fatores calibrados e armadilhas
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit), contrato e números em `docs/handoff-vega-chefoes.md`. Só o que não se deriva do código:

- **Fatores finais:** AMINU 0,925, CENTELLA 0,875, CAMILLE 0,925, NILA 0,875, BAATAR 0,85, ZENON 0,80 (NORMAL na rampa 26-30 → 15-19 nos 6). DIFÍCIL fora da faixa em 4 de 6 (AMINU, CENTELLA, NILA, BAATAR): um fator por chefão não controla a razão DIFÍCIL/NORMAL (de 0,34 a 1,04). **Why:** o jogador CPU nível 2 cresce junto com o chefão. **How to apply:** se o dono quiser DIFÍCIL na faixa, a saída é fator por nível (D-D2) ou afrouxar a faixa; não tem como com um número só.
- **Só o ZENON mudou em produção** enquanto a P1 do Cronos (`Regras.chefesDaFila`) não entra: os guardiões só viram chefe quando a escada os pedir (`cfg.chefe`).
- **A aura da fase 2 (`render/aura-chefe.ts` `rampaDaFase2`) lê `f.ficha === cfg.fichaFase2`** e nunca acende para guardião (fichaFase2 undefined): é parte da Lyra (E1), avisada no handoff.
- **Provar "regulares idênticos" exige congelar o hash ANTES**: o `hashRegistros` antigo misturava chefe e regular. Baseline medido com o harness velho (`--sem-chefe --so sim --esquiva`): `hashRegulares` `f420ce928e06b304`. Hoje `hashRegulares`/`hashChefes` saem separados no `resultados.md`.
- **100 sementes não bastam para o AMINU** (4 desafiantes = 400 lutas/nível, erro ~2 pontos, do tamanho da faixa): escolher o centro da faixa e confirmar com `--base 3 --sementes 300`. Cada fator da varredura leva ~25 s com `--sem-regulares`.
- `desafiantesDoChefe` do harness é cópia local (`ferramentas/balanco/chefoes.ts`) até o Cronos criar `src/meta/chefes.ts`.
- Teste de dano chamando `applyHit` (privado) direto: eventos ficam em `pendentes`, não em `g.events`; defensor em `state 'move'` precisa de `move` real (hurtbox chama `golpeAtual()`).
