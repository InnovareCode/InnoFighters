---
name: feedback-alexandria-verificar
description: Como verificar afirmações de doc contra o código no InnoFighters (HEAD x árvore de trabalho, status "não commitado" e "desligado", comandos que funcionam, o que a suíte não cobre, refs arquivo:linha em lote). Use antes de afirmar que um comando, teste, linha, flag ou comportamento está no código.
metadata:
  type: feedback
---

Regra: confira no código do HEAD antes de afirmar, e rode o comando que a doc cita antes de dizer que ele funciona. Leitura de handoff não basta, e leitura de doc antiga também não.

**Why:** (1) em 2026-10-21, `npm run sprites` estava quebrado e a suíte passava (o Vitest transforma o módulo e não acusa a duplicata); (2) o handoff do Cronos dizia `chefesDaFila: false` enquanto a árvore tinha `true`; (3) o §6.7 da arquitetura descrevia a fala do chefão em `roundend`; (4) em 2026-10-23, README e PROGRESSO diziam que sons, temas e chefões estavam desligados ou não commitados, quando o HEAD já tinha tudo ligado (`1aa7cac`, `bb8dae2`); (5) a arquitetura listava opções do menu que não existem mais. Doc que confia em handoff, em linha antiga ou em status antigo afirma coisa que não está no `main`.

**How to apply:**
- Antes de citar `arquivo:linha`: `git show HEAD:<arq> | sed -n Np` ou `git grep -n <padrão> HEAD -- <arq>`. Linha que cai em comentário, `}` ou linha vazia é ref errada.
- Antes de afirmar "desligado", "inerte", "não commitado" ou "pronto": confira a constante no HEAD e o histórico (`git log --oneline -S "<trecho>" -- <arq>`). Esse status mudou várias vezes em uma semana.
- Quando o pedido diz "o handoff X" e o arquivo não existe: procure em `.claude/agent-memory/<agente>/` e registre no PROGRESSO que o handoff não existe e qual fonte foi usada.
- Diferencie sempre "commitado (HEAD)" de "árvore de trabalho". `git status` e `git diff --stat` mostram o que é de outro agente em curso. Não documente código não commitado como se estivesse no `main`.
- Teste de unidade passar não prova que o script `node` roda. Para ferramenta em `ferramentas/`, rode o CLI com entrada inválida ou sem argumento, que mostra o erro de import ou o uso.
- Ajuda sem efeito colateral: `node ferramentas/balanco/cli.mjs --ajuda` lista as opções sem gravar nada.
- Não rode `npm run sprites -- <id>` nem `npm run balanco -- --completo` só para testar a doc: eles gravam em `sprites-gerados/`, `arte-fonte/` ou `docs/balanco/` (versionado). Também não rode `npm run trailer:escalar` nem `npm run sons:pacote-teste` para testar doc.
- Para o e2e, não rode `npm run test:e2e` por conta própria. A regra da equipe é que só a Lyra roda e2e (disputa a porta 5173).
- `npm test` é seguro de rodar (cerca de 60 s), mas numa árvore em edição pode mostrar falha de outro agente: registre como "não reconferido nesta passada" em vez de cravar número. Os números que aparecem em handoffs (contagem de testes) são de outra data e não valem como verificação.
- Evite `npm run build` (escreve `dist/`).
- Refs de uma passada antiga apodrecem: confira cada uma. Script em scratchpad que imprime a linha do HEAD para cada `arquivo:linha` do doc resolve o lote. Armadilha conhecida: nome curto resolvido por `grep` vem com espaço no fim e o `git show` falha; use `cand=$(echo $cand)` antes.
- Ao trocar uma ref por outra: confirme que a linha nova contém o símbolo que o texto descreve (não só "uma linha de código").
- Não é seu: alterações de `src/` de outro agente no working tree. Não tente corrigi-las nem documentá-las como estáveis.
- Limite do que foi provado: sem rodar a suíte, a doc fala "a confirmar" para número de teste, e cita o handoff com a data dele.

Ver [[docs-innofighters]].
