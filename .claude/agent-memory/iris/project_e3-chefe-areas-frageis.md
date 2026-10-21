---
name: e3-chefe-areas-frageis
description: Áreas frágeis do chefão E3 (troca de barra, Dança, fichas) e os 5 bugs pegos na QA da S0+S1a (2026-10-21); consultar antes de testar qualquer fatia nova do chefe/lutador especial
metadata:
  type: project
---

QA adversarial da S0+S1a: `tests/unit/chefe-adversarial.test.ts` (41 testes, 5 `it.fails`). Handoff em `docs/handoff-iris-e3-s0-s1a.md`. Veredito APROVADO com 3 correções recomendadas.

**Áreas frágeis (priorizar nas próximas fatias S1b..S5):**
- Tudo que regrava `hitstop`/`shake` depois de `resolverVidaZerada` (`applyHit`, `arremessar`, e um SEGUNDO `applyHit` no mesmo tick, ex. projétil do chefe no jogador: apaga o 20/14 da troca).
- Buffers do Fighter (`buf`, 9 ticks) atravessando fronteiras de fase do Game: o jogador ataca durante a Dança porque o `buf` é consumido com `NO_INPUT`. Vale para qualquer fase nova que "congele" entradas.
- Validação de dados só em tempo de uso: `fichaFase2` inexistente só estoura ao fim da dança (90 ticks depois), com o jogo preso em `cena-chefe`. Procurar o mesmo padrão em `fichas`, `alias` por ficha (S5), `troca` (NILA).
- Flag privada do Game (`trocaDeBarraNoTick`) consumida por quem não a produziu: chamada direta do resolver contamina o próximo golpe.
- Lookup em objeto simples (`fichas[nome]`) acha membros de `Object.prototype`.

**Why:** a S1a passou em 32 testes + mutação da Vega e ainda tinha 5 defeitos; os cantos estavam todos em interações de MESMO tick ou de estado escondido, não em caminho feliz.
**How to apply:** ao testar chefe/lutador novo, montar o tick de verdade (zerar `hitstop`, esperar `cenaPendente`/hitstop acabarem antes de injetar o golpe, senão a cena zera o hitstop), rodar o fuzz de invariantes de `chefe-adversarial.test.ts` com o lutador novo, e conferir o snapshot CPU x CPU (semente 42, sha256 do `.snap` = `3cb3b231…0356` em 2026-10-21).

Quando Vega corrigir um defeito, o `it.fails` correspondente passa a falhar de propósito: trocar por `it`.
