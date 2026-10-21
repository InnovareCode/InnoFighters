---
name: feedback-alexandria-verificar
description: Como verificar afirmações de doc contra o código no InnoFighters (comandos que funcionam, o que a suíte não cobre). Use antes de afirmar que um comando ou teste funciona.
metadata:
  type: feedback
---

Regra: rode o comando que a doc cita antes de afirmar que ele funciona. Leitura do código não basta quando há ferramenta envolvida.

**Why:** em 2026-10-21 `npm run sprites` estava quebrado (`SyntaxError: Identifier 'separarFundidas' has already been declared`, `ferramentas/sprites/executar.mjs`), e a suíte `npm test` passava, porque o Vitest transforma o módulo e não acusa a duplicata. Uma doc que dissesse "o pipeline funciona, testado" estaria errada. Depois da correção no HEAD, o mesmo comando voltou a responder (`node ferramentas/sprites/cli.mjs` sem argumento imprime o uso).

**How to apply:**
- Teste de unidade passar não prova que o script `node` roda. Para ferramenta em `ferramentas/`, rode o CLI com `node ...` (ou `npm run ...`) pelo menos com entrada inválida ou sem argumento, que mostra o erro de import ou o uso.
- Ajuda sem efeito colateral: `node ferramentas/balanco/cli.mjs --ajuda` lista as opções sem gravar nada.
- Não rode `npm run sprites -- <id>` nem `npm run balanco -- --completo` só para testar a doc: eles gravam em `sprites-gerados/`, `arte-fonte/` ou `docs/balanco/` (versionado).
- Para o e2e, não rode `npm run test:e2e` por conta própria. A regra da equipe é que só a Lyra roda e2e (disputa a porta 5173).
- `npm test` é seguro de rodar (cerca de 60 s; em 2026-10-21: 66 arquivos, 1475 testes). `npm run typecheck` também é seguro (não escreve nada). Evite `npm run build` (escreve `dist/`).
- Working tree sujo de outros agentes: `git status` pode mostrar arquivos de src em alteração não commitada. Não é seu. Documente o HEAD e marque o resto como "alteração não commitada".
- Refs `arquivo:linha` de uma passada antiga deslocam: antes de reaproveitar, confira cada uma (grep ou um `node` que imprime a linha citada).

Ver [[docs-innofighters]].
