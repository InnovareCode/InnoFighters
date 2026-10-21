---
name: provocacao-areas-frageis
description: QA da provocação pré-round/vitória (P4, 2026-10-21): o que foi provado, o bug do ▶ sobre o texto, observações e onde olhar primeiro se mexerem em balão/roteiro/textos
metadata:
  type: project
---

P4 da provocação (balão antes do round e na vitória, `src/render/{provocacao,balao}.ts`, 3º controlador fora do motor). Veredito 2026-10-21: **REPROVADO por 1 defeito visual, corrigido pela Lyra e REAPROVADO no mesmo dia (RESERVA_DA_SETA 14 px; checado por pixel)**.

**Bug pego (com `test.fail` em `tests/e2e/provocacao-p4-varredura.spec.ts`; ao corrigir, vira `test`):** o ▶ da vitória (`balao.ts` ~338-349, `sx = c.x + c.w - margemX - 8`) cai em cima das últimas letras quando a última linha é a mais larga do balão: 47 de 108 falas de vitória (~44%). O `w` da caixa é medido só pelo texto/nome, sem reservar espaço para o ▶. Causa raiz: indicador desenhado DENTRO da área do texto sem entrar na medida.

**Provado (working tree e worktree limpo):** motor intocado (foto tick a tick idêntica com/sem provocação, COMPLETA e CURTA, mesmo RNG final; nenhum `provoca` em `src/fight`, nenhum `rng` em `provocacao.ts`); round 1 COMPLETA/CURTA/DESLIGADA; round 2+ nas 3 cinemáticas (1 balão, 78-98 ticks, HUD visível, motor parado em intro t 0, fala quem perdeu); vitória (push-in 1,08, ENTER só após o tick 24, ENTER fecha em 6 ticks); movimento reduzido real (`emulateMedia`); VERSUS 2P; ZENON jogável e chefão vencendo; opção PROVOCAÇÕES; treino/CPU×CPU/?expansao=4; tempo real por rAF (pulo ~0,1 s). Varredura: 5260 balões (todos os pares x todas as falas de abertura x COMPLETA/CURTA), 0 sobre cabeça, 0 fora de [12, 948], 0 acima do topo (86 HUD / 62 faixas). 4 mutantes meus mortos.

**Observações (não reprovam):** com os textos finais (28-35 car.) o round 1 COMPLETA dura ~4,8 s, abaixo dos 5,5-6,8 s que a spec estimou para 40-56 car.; em CURTA, AMINU x NILA e CAMILLE x BAATAR têm cantos de balão se tocando (10-44 px²); `Game.tick` é contador de vida do objeto (nunca zera), então "game.tick fica em 0" só vale para `Game` novo; ENTER no matchend entre t 41 e 55 fecha a luta antes da provocação (comportamento antigo do ENTER).

**Áreas frágeis (priorizar):** geometria do balão com elemento extra (▶, rabicho) fora da medida; pares ZENON x BAATAR (altos, balão ao lado); `{rival}` com CENTELLA/WEI LONG; estado stale entre duas lutas na mesma página (testes de tempo real: recarregar a página entre lutas); qualquer texto novo do Apolo (rodar a varredura).

**Why:** a lógica foi toda provada em unit e e2e manual (`?manual=1`), mas o laço em tempo real e a leitura visual quadro a quadro só aparecem olhando o canvas desenhado.
**How to apply:** ao mudar balão/textos, rodar `provocacao-p4-varredura` e `provocacao-p4`; ver a captura da vitória com o ▶ aceso.
