---
name: textos-provocacao
description: Falas de provocação pré-round/round≥2/vitória dos 10 lutadores (docs/textos-provocacao.md) — formato da spec §7.3, limites 34/64, territórios de voz, ZENON chefão com balão
metadata:
  type: project
---

`docs/textos-provocacao.md`: v1 (148 falas, missão cmvij55hc00a301p7blrd00lh) reformatada e completada em 2026-10-21
(missão cmvijlhqf00bk01p7w7dbyz8m) para 232 balões no formato da spec da Nova (`docs/spec-provocacao-prerround-e-vitoria.md`
§7.1-7.3): blocos `## NOME (\`id\`)` + `### abertura|revanche|decisivo|vitoria|vitoriaPerfeita|vitoriaPorTempo|contra: <id>`,
JSON `Record<IdLutador, FalasDeProvocacao>` no fim. Depois da transcrição da Vega (P3), a fonte passa a ser
`src/data/provocacoes.pt-BR.ts`; o .md vira histórico.

**Why:** pedido do dono: voz autoral por lutador, provocação de esporte, sem ofensa a origem/corpo. Dono decidiu que o ZENON
chefão, ao vencer, usa o balão novo (contra a D-P3 padrão da spec) — por isso `zenon.contra[id].vitoria` tem 2 variantes.

**How to apply:**
- Limites (spec §7.2): abertura/vitória*/contra ≤2 linhas, ≤34/linha, ≤64 total; revanche/decisivo 1 linha ≤34. `{rival}` conta 8.
  Mínimos: abertura 3, revanche 2, vitória 3. Validar por script (limites, glifos pelo cmap do woff2, repetição, gênero, voz).
- Semântica: revanche = fala de QUEM PERDEU o round; decisivo não supõe quem lidera; vitoriaPerfeita = `perfect` do último
  round (não afirmar "a luta inteira sem dano"); vitoriaPorTempo = venceu no relógio.
- Convenções do .md: ` / ` = `\n`; ` †` final = revisão de nativo, NÃO é texto (não é Latin-1). Transcrever do JSON.
- Blocos e JSON foram gerados juntos por script em scratchpad (não persistido): editar um exige editar o outro igual.
- Territórios de voz exclusivos: HAYATO trovão; WEI montanha/ferro/chá, sem "!"; MIN-JI placar/nota; CAIO roda/ginga
  coloquial; AMINU "Plateia,"; CENTELLA "público"/lona/caídas/¡!; CAMILLE esgrima/assalto, sem "!"; NILA diagnóstico/consulta;
  BAATAR chão/céu 3-6 palavras; ZENON casa/convidado/jantar/tributo, sem "!". Fala genérica sem gênero. Ver [[identidade-especiais]].
