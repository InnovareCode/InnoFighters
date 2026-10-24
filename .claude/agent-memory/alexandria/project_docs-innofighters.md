---
name: docs-innofighters
description: Onde ficam as docs do InnoFighters, convenções de escrita, o que é gerado (não editar à mão), o que é status de código vs. doc e como conferir referências arquivo:linha contra o commit-alvo. Use ao documentar qualquer parte do projeto.
metadata:
  type: project
---

Mapa das docs (atualizado em 2026-10-24, passada sobre o commit-alvo `c058ac9`, origin/main): `README.md` (raiz, para jogador e dev), `CHANGELOG.md` (raiz, marcos por commit; bloco novo no topo), `docs/arquitetura.md` (camadas, contratos C1 a C4, chefões, provocação, sons e temas, amostras, trailer, logo, toque, tela cheia, versão, esquiva, CSP, seção 20 = motor v2, seção 21 = residência da arte), `docs/como-adicionar-um-lutador.md` (guia dos lutadores: filme, combos, orçamentos), `docs/combos-proprios.md` (20 combos: nomes do Apolo e campo `efeito`). Estado e decisões: `PROGRESSO.md` (bloco mais novo primeiro; "Decisões em aberto"). Pendências com nome e número: `docs/orcamentos-2026-10-23.md` §5 (T1 a T13). Specs: `docs/spec-revisao-motor-luta-v2.md` (motor v2 implementado), `docs/spec-residencia-de-memoria.md` (fatias L1 a L7), `docs/spec-provocacao-prerround-e-vitoria.md`, `docs/spec-chefoes-progressivos-temas-e-dificuldade.md`, `docs/spec-sons-por-lutador.md`, `docs/plano-sons-realistas.md`, `docs/spec-trailer-abertura.md`, `docs/spec-revisao-motor-luta.md` (proposta superada). Textos que viram código: `docs/textos-provocacao.md` (registro; o fonte é `src/data/provocacoes.pt-BR.ts`), `docs/textos-chefoes.md`. Balanço gerado: `docs/balanco/` (a pasta de produção é a COM esquiva e com motor v2). Handoffs da squad: `docs/handoff-<agente>-<fase>.md`; alguns citados em pedidos não existem: a fonte é a memória do agente em `.claude/agent-memory/<agente>/`.

**Why:** a doc precisa refletir o código do commit pedido. Em 2026-10-21 a doc dizia `chefesDaFila: false` enquanto o código tinha `true`. Em 2026-10-23 dizia "não commitado" para coisas já no HEAD. Em 2026-10-24 o README dizia que zerar o Arcade libera o próximo (falso com `chefesDaFila` ligado), que H não desenhava caixas (desenha em DEV e treino), que voz/temas estavam desligados (ligados), e o exemplo do AMINU tinha `pow` e `hp` antigos. Doc copiada de passada anterior afirma coisa que não é mais verdade.

**How to apply:**
- Anote o hash-alvo que o pedido nomeia e verifique tudo com `git show <hash>:<arq>` e `git grep -n <padrão> <hash> -- <arq>`. Não use a árvore de trabalho: ela tem edições de outros agentes em curso (src/, public/, tests/ com mudanças não commitadas).
- `origin/main` pode andar durante a passada. Em 2026-10-24, um `git fetch` no início trouxe `41e1ffb`, e minutos depois outro agente publicou `78de1be` (residência L5+L6, `por-peso` como padrão). Confira `git log origin/main -1` no fim, e diga no relatório se o alvo mudou.
- Status "não commitado" só vale se `git status -- <arquivo>` mostrar a alteração. Antes de escrever "desligado", confira a constante no commit-alvo (`git grep -n "IDENTIDADE_SONORA =" <hash> -- src`).
- Preferência de usuário "aposentada" (CINEMÁTICA, PROVOCAÇÕES) não aparece no menu, mas o valor salvo é retido e o padrão vale: leia `src/ui/persistencia.ts` e `src/core/contratos.ts` (`CINEMATICA_PADRAO`).
- Ref de linha em lote: resolva `arquivo:linha` por nome com `git ls-tree -r --name-only <hash>`, imprima a linha do commit e revise à vista. Ambíguo (ex.: `tipos.ts`, `grade.ts`, `validar.ts`, `elenco.ts`) = escreva o caminho completo. Linha que cai em comentário, `}` ou símbolo diferente é ref errada.
- Valor de exemplo de código (pow, hp, scale, cena) também envelhece: confira no arquivo, não copie do doc anterior.
- Pendência com número: T-numbers de `docs/orcamentos-2026-10-23.md` §5. Quando o pedido usar um nome que não bate com o doc (ex.: "T12 closes"), use a definição do doc e diga a divergência no relatório.
- Cronograma de estado: nunca escreva "não commitado" para algo que está no commit-alvo. Mudança do Atlas ou de outro agente não commitada entra como "fora deste commit" e não como estado.
- `CHANGELOG.md`: marco commitado fica como está (histórico). Mudança do marco novo entra num bloco novo no topo.
- Valor de flag, número de linha e texto de doc mudam juntos: depois de mudar a flag (`regras.ts`, `elenco.ts`, `chaves.ts`), atualize o trecho que a descreve em `README`, `arquitetura.md`, `PROGRESSO.md` e `CHANGELOG.md`.
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs` a partir de `docs/prompts-arte.md`. Não edite à mão.
- Boot (T4, c058ac9): etapa 0 = `src/assets/etapa0.mjs` (única lista, usada pelo boot e pelo shell do SW); etapa 1 = `etapa1()` depois de `data-pronto` (só por-peso); `data-vitrine` marca a vitrine inteira. Trailer (T12): carga por plano, 2 compassos antes (`src/trailer/carga.ts`); pico 145,3 MiB relatado.
- Status de tarefa do orçamento: coluna Status em `docs/orcamentos-2026-10-23.md` §5 (só a coluna; a análise não é reescrita). `—` = sem status informado.
- Repositório público: nada de ID de conta, valor de saldo (inclusive de geração de imagem), e-mail, IP, caminho local, nem menção a outro projeto (nem genérica). Caminho relativo ao repositório (`.claude/agent-memory/...`) é tolerado.
- Português do Brasil, sem emoji nos arquivos de doc.
- Decisão do dono que muda número: a spec e a proposta NÃO são reescritas. Ganham uma nota "Valor final" no topo. O que vale é sempre o código.
- Working copy com `core.autocrlf=true` e HEAD em LF: o aviso "LF will be replaced by CRLF" é esperado. Não converta à mão.
- Commit só com autorização do dono (a Alexandria não commita por conta própria).
- `npm run balanco -- --completo` grava `docs/balanco/` SEM esquiva; `--completo --esquiva` grava a de produção.
- Sons, temas, identidade sonora, amostras, trailer e chefesDaFila estão LIGADOS no commit 41e1ffb (chaves em `src/audio/chaves.ts`; `regras.ts`). Motor v2 ligado (`MOTOR_V2_PADRAO`, `src/meta/regras.ts:11`). Residência: `'por-peso'` é o padrão desde 78de1be (`src/assets/elenco.ts:87`); `?residencia=fixa` é o rollback em produção. `decode()` antecipado NÃO foi feito (medido: muda o pixel, spec §3 item 5). L1 a L6 concluídas; L7 opcional. Em 9dce4da: sons fora do boot (T5, `src/audio/camadas.ts`), retratos WebP (T6), service worker (T7, `docs/service-worker.md`, seção 22 de arquitetura), BAATAR e ZENON a 0,9 (T10, atlas alturaRef 472/502), JPG de cenário removidos (T1). Balanço: regulares `e5db8a2586c836b5`, versão `0b5ad77394bb`.

Ver também [[feedback-alexandria-verificar]].
