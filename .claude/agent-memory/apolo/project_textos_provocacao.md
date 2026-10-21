---
name: textos-provocacao
description: Falas de provocação pré-round e vitória dos 10 lutadores (docs/textos-provocacao.md) — territórios de voz, limites e cuidados
metadata:
  type: project
---

Falas de provocação escritas em 2026-10-21 (missão cmvij55hc00a301p7blrd00lh): `docs/textos-provocacao.md`, 148 falas,
JSON no fim do doc (`{id:{abertura[3],rounds[4],vitoria[4],contraZenon{abertura,vitoria}}}` + `zenon.contraRival{id}`).
Contrato de exibição é da Nova (`docs/spec-provocacao-prerround-e-vitoria.md`, ainda não existia quando escrevi).

**Why:** pedido do dono: texto próprio e autoral por lutador, provocação de esporte, sem ofensa a origem/corpo.

**How to apply:**
- Limites: 38 car./linha, 2 linhas, ~64 total; `\n` escolhido por mim; "rounds" sempre 1 linha. Validar por script, não de olho.
- Territórios de voz exclusivos (não cruzar): HAYATO trovão; WEI montanha/ferro/chá, sem "!"; MIN-JI placar/nota;
  CAIO roda/ginga coloquial carioca; AMINU "Plateia,"/nível/carga; CENTELLA "público"/lona/¡!; CAMILLE esgrima, sem "!";
  NILA diagnóstico/repouso; BAATAR chão/céu, 3-6 palavras; ZENON casa/convidado/tributo.
- Fala genérica nunca tem gênero do rival. Máscara da CENTELLA nunca sai. Dança da Águia do BAATAR sem fala.
- Palavras estrangeiras marcadas † e pendentes de revisão de nativo (lista §3 do doc). Ver [[identidade-especiais]].
- Se mexer no texto: tabela e JSON do doc precisam continuar idênticos (foram gerados juntos por script).
