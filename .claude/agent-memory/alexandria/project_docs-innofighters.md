---
name: docs-innofighters
description: Onde ficam as docs do InnoFighters, convenções de escrita, o que é gerado (não editar à mão) e como conferir referências arquivo:linha contra o HEAD. Use ao documentar qualquer parte do projeto.
metadata:
  type: project
---

Mapa das docs (atualizado em 2026-10-21, HEAD `73f0074`): `README.md` (raiz, para jogador e dev), `CHANGELOG.md` (raiz, marcos por commit; bloco novo no topo para o que não está commitado), `docs/arquitetura.md` (camadas, contratos C1 a C4, chefões, provocação, sons e temas, esquiva, CSP), `docs/como-adicionar-um-lutador.md` (guia dos lutadores: dados, chefão, guardião, falas, voz, tema). Estado e decisões: `PROGRESSO.md` (bloco mais novo primeiro; seção "Decisões em aberto" e "DECISÕES DO ATLAS (a confirmar pelo dono)"). Specs: `docs/spec-provocacao-prerround-e-vitoria.md` (a seção "Decisões do dono" no topo prevalece), `docs/spec-chefoes-progressivos-temas-e-dificuldade.md`, `docs/spec-sons-por-lutador.md`. Textos que viram código: `docs/textos-provocacao.md` (registro; o fonte é `src/data/provocacoes.pt-BR.ts`), `docs/textos-chefoes.md` (o fonte é `src/render/textos-dos-chefoes.ts`). Balanço gerado: `docs/balanco/` (`resultados.md`, `frame-data.md`, `.json`; a pasta de produção é a COM esquiva). Handoffs da squad: `docs/handoff-<agente>-<fase>.md`; alguns handoffs citados em pedidos não existem (ex.: `handoff-vega-provocacao-p1`): a fonte é a memória do agente em `.claude/agent-memory/<agente>/`.

**Why:** a doc precisa refletir o código. Em 2026-10-21 o HEAD e a árvore de trabalho divergiram: `REGRAS_PADRAO.chefesDaFila` era `false` no HEAD e `true` na árvore (UI da Lyra não commitada). Handoff antigo dizia o oposto do código. Doc escrita a partir do handoff teria afirmado o que não está no `main`.

**How to apply:**
- Fonte de verdade: `git show HEAD:<arquivo>` e `git grep -n <padrão> HEAD -- <arquivo>` para `arquivo:linha`. Não confiar em linha de handoff nem de doc antiga: quase todas deslocaram.
- Conferir refs em lote: para cada `arquivo:linha` do doc, imprimir a linha do HEAD e olhar. Se a linha é comentário, `}` ou vazia, a ref está errada (aconteceu em `tipos.ts:233`, `fighter.ts:92`, `montar.ts:198`, `personagens.ts:26`).
- Ref de arquivo não commitado (ex.: `roteiros-de-entrada.ts`, `textos-dos-chefoes.ts`): escreva sem linha e marque **(não commitado)**. Não cite linha da árvore de trabalho sem avisar.
- Símbolo novo estável: prefira nome do símbolo a número de linha quando não conferiu a linha.
- `CHANGELOG.md`: marco commitado fica como está (histórico), inclusive o "(não commitado)" errado de um marco já commitado: corrigir só o título para o hash. Mudança não commitada entra num bloco novo no topo, com "(não commitado)" no título.
- Mudança de estado do jogo (ex.: chefão do Arcade) vai para `README` e `arquitetura.md` com o estado do HEAD e a ressalva da árvore de trabalho, lado a lado.
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs` a partir de `docs/prompts-arte.md`. Não edite à mão.
- Repositório público: nada de ID de conta, créditos (inclusive "saldo Runway") ou e-mail em docs.
- Português do Brasil, sem emoji nos arquivos de doc.
- Decisão do dono que muda número: a spec e a proposta NÃO são reescritas. Ganham uma nota "Valor final" no topo e o novo entre parênteses. O que vale é sempre o código.
- `docs/balanco/README.md` diz qual pasta é a produção (COM esquiva). Antes de citar balanço, leia o cabeçalho do `resultados.md`.
- Working copy com `core.autocrlf=true` e HEAD em LF: o aviso "LF will be replaced by CRLF" é esperado. Não converta à mão.
- Commit só com autorização do dono (regra do projeto; a Alexandria não commita por conta própria).
- `npm run balanco -- --completo` grava `docs/balanco/` SEM esquiva; `--completo --esquiva` grava a de produção. Rodadas parciais (`--chefes`, `--sem-regulares`) nunca gravam ali.

Ver também [[feedback-alexandria-verificar]].
