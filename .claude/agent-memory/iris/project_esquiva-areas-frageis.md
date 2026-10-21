---
name: esquiva-areas-frageis
description: Áreas frágeis da ESQUIVA (pós-1cb1ccd) e os 3 bugs pegos na QA adversarial de 2026-10-21; consultar antes de testar qualquer mecânica nova com botão guardado, avanço/colisão na parede ou mapeamento de controles
metadata:
  type: project
---

QA adversarial da esquiva: 6 arquivos `tests/unit/esquiva-*.test.ts`, `balanco-adversarial`, `entrada-adversarial` + auxiliar `_esquiva-qa.ts` (92 testes, 3 `it.fails`). Handoff `docs/handoff-iris-esquiva.md`. Veredito APROVADO com 3 correções baixas.

**Bugs pegos (cada um com `it.fails`; ao corrigir, trocar por `it`):**
1. `bufEsq` (botão guardado, 6 ticks) vaza para a Dança do chefão: `game.ts` zera `buf` ao abrir a cena mas não o `bufEsq` (private). Mesma classe do bug #1 do E3.
2. `Game.separate` com `dx === 0` na parede (ambos em x=60/900) desempata por índice P1/P2: o avanço contra rival encurralado atravessa para o P1 e não para o P2.
3. `Gamepads.consultar` numera os controles pela posição na lista filtrada de `connected`: se o controle 1 cai, o 2 vira slot 0 e o botão que ele segurava vira borda fantasma do P1.

**Áreas frágeis (priorizar):** estado escondido que atravessa fronteira de fase (todo buffer novo: conferir cena do chefão, fim de round, timeover); desempate por índice em colisão com `dx === 0` na parede; renumeração de dispositivos de entrada; o arranque de 3 ticks do avanço é VULNERÁVEL (um acerto no mesmo tick tira o lutador de `esquiva` logo após o evento, então invariantes "evento esquiva => estado esquiva" precisam admitir acerto); golpes de fase ativa longa (`sDown` rise, `sFwd` rush, RESORTE) geram "ESQUIVOU!" e acertam depois da janela de 14 ticks.

**Why:** o motor passou nos 17+13+20 testes e nos 18 mutantes da Vega e ainda tinha esses cantos; todos em interação entre sistemas (fase do chefe, colisão, entrada), não na regra da esquiva em si.
**How to apply:** ao testar mecânica nova, rodar o fuzz de `esquiva-invariantes.test.ts` (acumula violações em lista em vez de `expect` por tick: 10x mais rápido), a "assinatura" sem a flag (hash tick a tick + contagem de `rnd` com `rngContador`), e checar `Fighter.reset` para cada campo privado novo. O snapshot antigo `fight.test.ts.snap` mantém sha256 `3cb3b23137cc…bdd50356`; para provar "sem a flag nada muda" basta o snapshot não conter `esquiv`.
