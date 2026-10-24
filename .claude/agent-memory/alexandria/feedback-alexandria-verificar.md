---
name: feedback-alexandria-verificar
description: Como verificar afirmações de doc contra o código no InnoFighters (commit-alvo x árvore de trabalho, status "não commitado" e "desligado", comandos que funcionam, o que a suíte não cobre, refs arquivo:linha em lote, exemplos de código que envelhecem). Use antes de afirmar que um comando, teste, linha, flag ou comportamento está no código.
metadata:
  type: feedback
---

Regra: confira no commit-alvo antes de afirmar, e rode o comando que a doc cita antes de dizer que ele funciona. Leitura de handoff não basta, e leitura de doc antiga também não.

**Why:** (1) em 2026-10-21, `npm run sprites` estava quebrado e a suíte passava (o Vitest transforma o módulo e não acusa a duplicata); (2) o handoff do Cronos dizia `chefesDaFila: false` enquanto a árvore tinha `true`; (3) o §6.7 da arquitetura descrevia a fala do chefão em `roundend`; (4) em 2026-10-23, README e PROGRESSO diziam que sons, temas e chefões estavam desligados ou não commitados, quando o HEAD já tinha tudo ligado; (5) em 2026-10-24, a passada de docs achou que boa parte das refs de linha e alguns exemplos (AMINU `pow` e `hp`, `danoRecebido` dos chefões, `chefesDaFila`, H) estavam defasados em relação ao commit-alvo, e que o README dizia que zerar o Arcade libera o próximo lutador (falso com a flag ligada). Doc que confia em handoff, em linha antiga, em exemplo copiado ou em status antigo afirma coisa que não está no `main`.

**How to apply:**
- Antes de citar `arquivo:linha`: `git show <hash>:<arq> | sed -n Np` ou `git grep -n <padrão> <hash> -- <arq>`. Linha que cai em comentário, `}` ou linha vazia é ref errada.
- Lote de refs: script que extrai `arquivo:linha` do texto, resolve por nome com `git ls-tree -r --name-only <hash>`, imprime a linha do commit e termina com revisão à vista (ambíguo = caminho completo). Refaça depois de cada edição de doc: as refs antigas apodrecem.
- Antes de afirmar "desligado", "inerte", "não commitado" ou "pronto": confira a constante no commit-alvo e o histórico (`git log --oneline -S "<trecho>" -- <arq>`). Esse status mudou várias vezes em uma semana.
- Antes de afirmar comportamento de regra (ex.: "zerar o Arcade libera o próximo"), leia a função que decide (ex.: `aplicarVitoriaArcade` em `src/meta/progresso.ts`) e o ramo da flag. O texto de comentário costuma estar desatualizado.
- Exemplo de código na doc (valores como `pow`, `hp`, `scale`, `cena`) é afirmação: confira no arquivo do commit.
- Quando o pedido diz "o handoff X" e o arquivo não existe: procure em `.claude/agent-memory/<agente>/` e registre no PROGRESSO que o handoff não existe e qual fonte foi usada.
- Diferencie sempre "commitado (commit-alvo)" de "árvore de trabalho". `git status` mostra o que é de outro agente em curso (src/, public/, tests/ com mudanças não commitadas). Não documente código não commitado como se estivesse no `main`.
- `origin/main` pode avançar durante a passada (ocorreu em 2026-10-24: `41e1ffb` virou `78de1be`). Confirme o alvo no início e no fim e relate a mudança.
- Teste de unidade passar não prova que o script `node` roda. Para ferramenta em `ferramentas/`, rode o CLI com entrada inválida ou sem argumento, que mostra o erro de import ou o uso.
- Ajuda sem efeito colateral: `node ferramentas/balanco/cli.mjs --ajuda` lista as opções sem gravar nada.
- Não rode `npm run sprites -- <id>`, `npm run balanco -- --completo` nem `npm run build` só para testar a doc: eles gravam em `sprites-gerados/`, `arte-fonte/`, `docs/balanco/` (versionado) ou `dist/`. Também não rode `npm run trailer:escalar` nem `npm run sons:pacote-teste` para testar doc.
- Para o e2e, não rode `npm run test:e2e` por conta própria. A regra da equipe é que só a Lyra roda e2e (disputa a porta 5173).
- `npm test` é seguro de rodar (cerca de 60 s), mas numa árvore em edição pode mostrar falha de outro agente: registre como "não reconferido nesta passada" em vez de cravar número. Os números que aparecem em handoffs (contagem de testes) são de outra data e não valem como verificação.
- Não é seu: alterações de `src/` ou `public/` de outro agente no working tree. Não tente corrigi-las nem documentá-las como estáveis.
- Limite do que foi provado: sem rodar a suíte, a doc fala "a confirmar" para número de teste, e cita o handoff com a data dele. Comportamento que só se vê no navegador ou em aparelho: "não testado em aparelho real".
- Não conclua "não existe" por busca de literal. Em 2026-10-24 eu procurei só `jp` e concluí que a pré-recarga da L4 não existia; ela estava em `aoFimDaLuta` (`src/ui/cenas/fight.ts`). Busque pelo símbolo, pelo chamador e pelo nome do método antes de afirmar ausência.
- Pré-existente não é meu: ao reescrever um doc, marque como "a confirmar" o que copiou sem reconferir. Não passe o texto antigo como verificado.

Ver [[docs-innofighters]].
