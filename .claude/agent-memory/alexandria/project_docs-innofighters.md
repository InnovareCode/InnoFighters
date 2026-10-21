---
name: docs-innofighters
description: Onde ficam as docs do InnoFighters, convenções de escrita e o que é gerado (não editar à mão). Use ao documentar qualquer parte do projeto.
metadata:
  type: project
---

Mapa das docs (atualizado em 2026-10-21, HEAD `3f72613`; o `0684548` é o marco do Zenon): `README.md` (raiz, para jogador e dev), `CHANGELOG.md` (raiz, marcos por commit), `docs/arquitetura.md` (camadas, contratos C1 a C4, chefão, esquiva, carga, determinismo, CSP), `docs/como-adicionar-um-lutador.md` (guia dos lutadores, com as armadilhas do chefão no passo 6b). Estado e decisões: `PROGRESSO.md` (bloco mais novo primeiro; seção "Decisões em aberto"). Balanço gerado: `docs/balanco/` (`resultados.md`, `frame-data.md`, `.json`). Planos e specs: `PLANO.md`, `docs/plano-expansao.md`, `docs/spec-chefao-zenon.md`, `docs/mecanicas-e3.md`. Handoffs da squad: `docs/handoff-<agente>-<fase>.md`.

**Why:** a doc precisa refletir o código. Em 2026-10-21 a `arquitetura.md` e o `como-adicionar` citavam linhas do commit `c7437c1`: quase todas as referências `arquivo:linha` tinham deslocado. O `PROGRESSO.md` também estava defasado (dizia que `npm run sprites` estava quebrado e que `npm test` tinha 2 falhas, ambos já resolvidos no HEAD).

**How to apply:**
- Fonte de verdade para estado: `git log`, `git status` e o código. O `PROGRESSO.md` é só pista.
- Antes de escrever `arquivo:linha`, confira com grep. Refs de uma passada antiga apodrecem rápido; uma checagem de ~80 refs em lote com `node` pega quase tudo.
- Cite `arquivo:linha` nas afirmações sobre código. O que não confirmou vai como **a confirmar**.
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs` a partir de `docs/prompts-arte.md`. Não edite à mão.
- Repositório público: nada de ID de conta, créditos (inclusive "saldo Runway") ou e-mail em docs. O `PROGRESSO.md` tinha saldos de créditos do Runway e o nome da equipe da conta; foram removidos em 2026-10-21.
- Português do Brasil, sem emoji nos arquivos de doc.
- Decisão do dono que muda número: a spec e a proposta NÃO são reescritas. Ganham uma nota "Valor final" no topo e, nas linhas que citavam o valor antigo, o novo entre parênteses. O que vale é sempre o código (`zenon.ts`, `entrada-chefe.ts`).
- `CHANGELOG.md`: marco commitado fica como está (é histórico); mudança ainda não commitada entra num bloco novo no topo, com "(não commitado)" no título.
- `docs/balanco/README.md` diz qual pasta é a produção (COM esquiva). Antes de citar balanço, leia o cabeçalho do `resultados.md` ("Modo completo + ESQUIVA ligada" ou "Modo completo").
- Working copy com `core.autocrlf=true` e HEAD em LF: o aviso "LF will be replaced by CRLF" é esperado. Não converta à mão.
- Commit só com autorização do dono (regra do projeto; a Alexandria não commita por conta própria).
- `npm run sprites` executa (sem argumento imprime o uso). `npm run balanco -- --completo` grava `docs/balanco/` SEM esquiva; `--esquiva` grava em `relatorios/` (não versionado). A produção tem `Regras.esquiva` ligada, então a referência versionada não é a do jogo de hoje.

Ver também [[feedback-alexandria-verificar]].
