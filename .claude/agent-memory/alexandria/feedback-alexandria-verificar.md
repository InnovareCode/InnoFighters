---
name: feedback-alexandria-verificar
description: Como verificar afirmações de doc contra o código no InnoFighters (HEAD x árvore de trabalho, comandos que funcionam, o que a suíte não cobre, refs arquivo:linha). Use antes de afirmar que um comando, teste, linha ou comportamento está no código.
metadata:
  type: feedback
---

Regra: confira no código do HEAD antes de afirmar, e rode o comando que a doc cita antes de dizer que ele funciona. Leitura de handoff não basta.

**Why:** em 2026-10-21 (1) `npm run sprites` estava quebrado e a suíte passava, porque o Vitest transforma o módulo e não acusa a duplicata; (2) o handoff do Cronos dizia `chefesDaFila: false` enquanto a árvore tinha `true` (virada pela L1 da Lyra, não commitada); (3) o §6.7 da arquitetura descrevia a fala do chefão em `roundend`, mas o `falaDoChefe` do HEAD já seguia a decisão 6 (KO final); (4) a referência `MAX_PAGINAS` e outras linhas estavam erradas porque tinham deslocado. Doc que confia em handoff ou em linha antiga afirma coisa que não está no `main`.

**How to apply:**
- Antes de citar `arquivo:linha`: `git show HEAD:<arq> | sed -n Np` ou `git grep -n <padrão> HEAD -- <arq>`. Linha que cai em comentário, `}` ou linha vazia é ref errada.
- Quando o pedido diz "o handoff X" e o arquivo não existe: procure em `.claude/agent-memory/<agente>/` e registre no PROGRESSO que o handoff não existe e qual fonte foi usada.
- Diferencie sempre "commitado (HEAD)" de "árvore de trabalho". `git status` e `git diff --stat` mostram o que é de outro agente em curso. Não documente código não commitado como se estivesse no `main`.
- Teste de unidade passar não prova que o script `node` roda. Para ferramenta em `ferramentas/`, rode o CLI com entrada inválida ou sem argumento, que mostra o erro de import ou o uso.
- Ajuda sem efeito colateral: `node ferramentas/balanco/cli.mjs --ajuda` lista as opções sem gravar nada.
- Não rode `npm run sprites -- <id>` nem `npm run balanco -- --completo` só para testar a doc: eles gravam em `sprites-gerados/`, `arte-fonte/` ou `docs/balanco/` (versionado).
- Para o e2e, não rode `npm run test:e2e` por conta própria. A regra da equipe é que só a Lyra roda e2e (disputa a porta 5173).
- `npm test` é seguro de rodar (cerca de 60 s), mas numa árvore em edição pode mostrar falha de outro agente: registre como "não reconferido nesta passada" em vez de cravar número. `npm run typecheck` não escreve nada e checa o estado da árvore naquele momento.
- Evite `npm run build` (escreve `dist/`).
- Refs de uma passada antiga apodrecem: confira cada uma. Um script em scratchpad que imprime a linha do HEAD para cada `arquivo:linha` do doc resolve o lote em uma execução.
- Não é seu: alterações de `src/` de outro agente no working tree. Não tente corrigi-las nem documentá-las como estáveis.

Ver [[docs-innofighters]].
