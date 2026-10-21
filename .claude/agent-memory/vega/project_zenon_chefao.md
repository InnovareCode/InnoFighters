---
name: project-zenon-chefao
description: Z1/Z4/Z5 do chefão ZENON: drenaEnergia, cena, valsa 3/4, pipeline s1..s10+zr, caixa alta de sprite 1,36, mods de ficha raso
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit). Contrato e números em `docs/handoff-vega-zenon.md`. Só o que não se deriva do código:

- **Sprite alto = caixa de acerto por cima da cabeça do rival.** `fy = tipY*scale + bh/2`, fundo = `tipY*scale - bh/2`. ZENON (1,36, mão no rosto) tinha fundo a 226-269 px contra topo de hurtbox 254: 7% de vitória, `hk` 3% de contato. Correção em dados (`bh` 200-250, `alturaDoProjetil 175`). **How to apply:** lutador de escala > 1,2: medir fundo da caixa e altura do spawn do projétil antes de balancear.
- **`FichaDef.mods` é raso por golpe**: `hp: { armor: 1 }` apagou o `bh` do base na fase 2 (alerta "não conecta em nenhuma distância"). Sempre `{ ...MODS_BASE.hp, armor: 1 }`.
- `ancora: 'tronco'` (spec §9.3) foi testada e revertida: piorou o desvio (idle 1,4 -> 2,5 px; andar 11,8 -> 13,5). O desvio do andar é inclinação real do corpo.
- Harness: `hpPorBarra` fecha com esquiva ligada (produção) — sem esquiva o DIFÍCIL cai < 20%. Medir os dois. `--ajustes` ganhou `alturaEmPe`.
- Oráculo de refatoração de áudio = cópia congelada do módulo antigo (`tests/fixtures/audio-sys-antes-do-chefe.ts`).
- Flip do id: `IdLutador` ganha 'zenon' => quebra testes de "9 lutadores" (e5-elenco, e4-ui, progresso, ui, z6...). e4-ui usa R9 injetado (roster.slice(0,9), chefe null) para manter a UI de 9 testada.
- Lyra removeu `src/ui/dev-chefe-teste.ts` e criou `src/render/apresentacao-lutadores.ts` (tabela APRESENTACAO) por conta própria; não duplicar em src/data.
- `ZENON_DEF` (sem id) em zenon.ts; testes de motor montam sobre atlas do WEI LONG (`tests/unit/_zenon.ts`), a arte real é `zenon-arte.test.ts`.
