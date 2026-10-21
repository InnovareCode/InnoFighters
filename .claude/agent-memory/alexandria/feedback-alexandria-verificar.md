---
name: feedback-alexandria-verificar
description: Como verificar afirmações de doc contra o código no InnoFighters (comandos que funcionam, o que a suíte não cobre). Use antes de afirmar que um comando ou teste funciona.
metadata:
  type: feedback
---

Regra: rode o comando que a doc cita antes de afirmar que ele funciona. Leitura do código não basta quando há ferramenta envolvida.

**Why:** em 2026-10-21 `npm run sprites` estava quebrado (`SyntaxError: Identifier 'separarFundidas' has already been declared`, `ferramentas/sprites/executar.mjs:15`), e a suíte `npm test` passava, porque o Vitest transforma o módulo e não acusa a duplicata. Uma doc que dissesse "o pipeline funciona, testado" estaria errada.

**How to apply:**
- Teste de unidade passar não prova que o script `node` roda. Para ferramenta em `ferramentas/`, rode o CLI com `node ...` (ou `npm run ...`) pelo menos com entrada inválida, que mostra o erro de import.
- Para o e2e, não rode `npm run test:e2e` por conta própria. A regra da equipe é que só a Lyra roda e2e (disputa a porta 5173).
- `npm test` é seguro de rodar (cerca de 60 s). `npm run typecheck` também é seguro (não escreve nada). Evite `npm run build` (escreve `dist/`).
- Working tree sujo de outros agentes: `git status` pode mostrar arquivos de src em alteração não commitada. Não é seu. Documente o HEAD e marque o resto como "alteração não commitada".

Ver [[docs-innofighters]].
