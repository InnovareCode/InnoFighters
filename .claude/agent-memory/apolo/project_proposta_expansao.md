---
name: project-proposta-expansao
description: Proposta de logo (3 paletas) e de 4 lutadores + chefão do InnoFighters, entregue em 2026-10-20 em docs/proposta-expansao.md; aguarda escolha do dono
metadata:
  type: project
---

Entregue em 2026-10-20: `docs/proposta-expansao.md`. Recomendado: logo "Ouro Forjado" (INNO ouro, FIGHTERS brasa,
contorno único #ffe08a, emblema de cor única). Elenco novo: AMINU (Nigéria, dambe, carga), CENTELLA (México, lucha libre,
borda da tela), CAMILLE (França/Marselha, savate, contra-postura), NILA (Índia/Kerala, kalaripayattu, troca de postura
+ estado marma). Chefão BAATAR (Mongólia, bökh, agarrão de comando + 2ª fase Devekh). Fila: AMINU, CENTELLA, CAMILLE,
NILA, BAATAR.

**Why:** dono achou o logo "estranho" (3 paletas brigando: INNO frio, FIGHTERS quente, anel com as 4 cores dos lutadores).
Elenco precisava de mecânica nova por lutador, não skin; roda de cores já ocupa ciano, lilás, rosa, limão.

**How to apply:**
- Antes de propor cor nova para lutador, conferir a roda de matizes da seção 2.1 do documento.
- Nomes de golpe em hauçá/malaiala estão pendentes de revisão nativa; não gravar em tela sem isso.
- Para ver a tela de título com Playwright: a abertura só mostra o logo no escuro; clicar avança para o painel dos 4 e
  Enter para o título completo. Mockup de paleta: replicar `obterLogo()` num HTML no scratchpad sobre `public/assets/cenarios/*.jpg`.
- 2026-10-20: dono aprovou tudo (paleta A já aplicada; máx. 1 mecânica nova por lutador). Prompts para o Gemini em
  `docs/prompts-arte.md`: montagem BLOCO A (regras) + B (traje fixo) + C (células); fundos magenta = WEI, HAYATO
  (faixa verde), CENTELLA (verde-água); verde = MIN-JI, AMINU, CAMILLE, NILA, BAATAR; nunca azul nem "transparente".
  BAATAR em folhas 3x2 (9 folhas). Pendente do dono: HAYATO versão A (afasta semelhança com Ryu) ou B (fiel).
- Dono quer prompt COMPLETO por personagem (não montar blocos): versão de uso em `docs/prompts/` (00-indice + 01..09),
  gerada por `ferramentas/prompts/montar-prompts.mjs` a partir de `docs/prompts-arte.md` (fonte) e conferida por
  `verificar-prompts.mjs`. Mudou prompt? Editar a fonte e rodar os dois. Folha 4 dos novos, B7-B9 e folha 5 de
  NILA/CENTELLA marcadas NÃO GERE AINDA até `docs/mecanicas-e3.md` (Nova) existir.
- Relacionado: [[project-curadoria-sprites]] (FX como asset separado vale para os novos também).
