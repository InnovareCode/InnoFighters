---
name: docs-innofighters
description: Onde ficam as docs do InnoFighters, convenções de escrita, o que é gerado (não editar à mão), o que é status de código vs. doc e como conferir referências arquivo:linha contra o HEAD. Use ao documentar qualquer parte do projeto.
metadata:
  type: project
---

Mapa das docs (atualizado em 2026-10-23, HEAD `f5b5fab`): `README.md` (raiz, para jogador e dev), `CHANGELOG.md` (raiz, marcos por commit; bloco novo no topo), `docs/arquitetura.md` (camadas, contratos C1 a C4, chefões, provocação, sons e temas, amostras, trailer, logo, toque, tela cheia, versão, esquiva, CSP), `docs/como-adicionar-um-lutador.md` (guia dos lutadores). Estado e decisões: `PROGRESSO.md` (bloco mais novo primeiro; "Decisões em aberto" e "DECISÕES DO ATLAS"). Specs: `docs/spec-provocacao-prerround-e-vitoria.md`, `docs/spec-chefoes-progressivos-temas-e-dificuldade.md`, `docs/spec-sons-por-lutador.md`, `docs/plano-sons-realistas.md`, `docs/spec-trailer-abertura.md`, `docs/spec-revisao-motor-luta.md` (proposta da Nova, nada implementado). Textos que viram código: `docs/textos-provocacao.md` (registro; o fonte é `src/data/provocacoes.pt-BR.ts`), `docs/textos-chefoes.md`. Balanço gerado: `docs/balanco/` (a pasta de produção é a COM esquiva). Handoffs da squad: `docs/handoff-<agente>-<fase>.md`; alguns citados em pedidos não existem: a fonte é a memória do agente em `.claude/agent-memory/<agente>/`.

**Why:** a doc precisa refletir o código. Em 2026-10-21, handoff antigo dizia `chefesDaFila: false` enquanto a árvore tinha `true`. Em 2026-10-23 a situação inverteu: a doc dizia "não commitado" para chefões, sons e temas que já estavam no HEAD (commits `bb8dae2`, `1aa7cac`, `497cb33`), e a Opção CINEMÁTICA constava das Opções que o código já não mostrava. Doc escrita a partir de status antigo afirma coisa que não é mais verdade.

**How to apply:**
- Fonte de verdade: `git show HEAD:<arquivo>` e `git grep -n <padrão> HEAD -- <arquivo>` para `arquivo:linha`. Linha de handoff e de doc antiga quase sempre deslocou.
- Status "não commitado" só vale se `git status -- <arquivo>` mostrar a alteração. Antes de escrever "não commitado" ou "desligado", confira o valor no HEAD (ex.: `git grep -n "IDENTIDADE_SONORA =" HEAD -- src`). Commit de código pode ter entrado antes do commit de doc: procure com `git log --oneline -S "<trecho>" -- <arquivo>`.
- Preferência de usuário "aposentada" (ex.: CINEMÁTICA, PROVOCAÇÕES) não aparece no menu, mas pode ainda estar no código: leia `persistencia.ts` e `options.ts` antes de descrever o comportamento.
- Ref de linha em lote: script em scratchpad que resolve nome curto por `grep -E "(^|/)<nome>$"` na lista `git ls-tree -r --name-only HEAD` e imprime `git show HEAD:<arq> | sed -n Np`. Armadilha: a saída do grep traz espaço no fim do nome e o `git show` falha com "fatal: path 'x ' exists on disk" (corrigir com `cand=$(echo $cand)`).
- Linha que cai em comentário, `}`, linha vazia ou símbolo diferente é ref errada. Refaça com `git grep -n` do símbolo.
- Ref de arquivo não commitado: escreva sem linha e marque **(não commitado)**. Hoje a árvore de `src/` está limpa, então quase tudo tem linha.
- `CHANGELOG.md`: marco commitado fica como está (histórico), inclusive um "(não commitado)" errado: corrigir só o título para o hash do commit. Mudança não commitada entra num bloco novo no topo.
- Valor de flag, número de linha e texto de doc mudam juntos: depois de mudar a flag (`chaves.ts`, `regras.ts`) atualize o trecho que a descreve em `README`, `arquitetura.md`, `PROGRESSO.md` e `CHANGELOG.md`.
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs` a partir de `docs/prompts-arte.md`. Não edite à mão.
- Repositório público: nada de ID de conta, valor de saldo (inclusive de geração de imagem), e-mail ou chave em docs. Texto de processo ("informe o saldo") sem valor é tolerado.
- Português do Brasil, sem emoji nos arquivos de doc.
- Decisão do dono que muda número: a spec e a proposta NÃO são reescritas. Ganham uma nota "Valor final" no topo. O que vale é sempre o código.
- `docs/balanco/README.md` diz qual pasta é a produção (COM esquiva). Antes de citar balanço, leia o cabeçalho do `resultados.md` (versão de dados, hash das regulares).
- Working copy com `core.autocrlf=true` e HEAD em LF: o aviso "LF will be replaced by CRLF" é esperado. Não converta à mão.
- Commit só com autorização do dono (a Alexandria não commita por conta própria).
- `npm run balanco -- --completo` grava `docs/balanco/` SEM esquiva; `--completo --esquiva` grava a de produção.
- Sons e temas estão LIGADOS desde `1aa7cac` (chaves em `src/audio/chaves.ts`). Trailer LIGADO (`Regras.trailer`). `?trailer=0` e `?trailer=P5` só em DEV; `?escuta=1` vale em produção.

Ver também [[feedback-alexandria-verificar]].
