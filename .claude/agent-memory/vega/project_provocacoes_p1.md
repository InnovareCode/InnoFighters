---
name: provocacoes-p1
description: P1 das provocações - dados/lógica pura em src/data/provocacoes*.ts, validação no import, sorteioDeFalas semente+5, pref provocacoes no storage v2; decisões do dono e armadilhas
metadata:
  type: project
---

P1 entregue (sem commit): `src/data/provocacoes.ts` (tipos, `sortearFala`, `quemFalaNaRodada`, validação), `provocacoes.pt-BR.ts` (textos PROVISÓRIOS + `TEXTOS_PROVISORIOS`), `Contexto.sorteioDeFalas` (main.ts, semente+5), `Configuracoes.provocacoes` ('ligadas'|'desligadas', ausente=ligadas) saneada em `sanearConfiguracoes`.

**Decisões do dono** (no topo da spec): provocação também no VERSUS 2P; opção própria PROVOCAÇÕES (independente da cinemática); poses atuais; ZENON vencendo usa o balão; todo round >=2 (curto); P1 fala primeiro no round 1.

**Armadilhas / decisões de desenho**
- Validação roda no IMPORT de `provocacoes.ts`; como nada da P1 o consome, `main.ts` tem `import './data/provocacoes'` só pelo efeito (senão o boot não falha de verdade e o tree-shaking tira o módulo).
- `trocarRival` usa split/join, não `replace(string)`: nome com `$&` viraria substituição especial.
- `escolherFala` consome SEMPRE 1 número do rng (mesmo lista de 1), para a sequência ser previsível; a memória guarda o MODELO com `{rival}`, não o texto trocado.
- Limites validados por aproximação em caracteres (quebra gulosa a 34); o portão real é a medida em px no navegador (P4/§10 item 11). `{rival}` conta 8.
- Tipo `Record<IdLutador,...>` + `@ts-expect-error` no teste = prova de que lutador sem falas não compila.
- RESTAURAR PADRÕES nas Opções precisa `delete S.provocacoes` (Object.assign não apaga campo opcional; mesma armadilha da cinemática).
- A opção na tela de Opções NÃO foi feita (P2, Lyra): `options.ts` tem teste que conta itens (10/9).

**Why:** apresentação fora do motor; nenhum arquivo de `src/fight` pode mencionar provoca (teste varre).
**How to apply:** P3 (transcrição do Apolo) troca o `.pt-BR.ts`, apaga os `// PROVISÓRIO` e vira `TEXTOS_PROVISORIOS=false` (teste cobra coerência).

**P3 feita (2026-10-21, sem commit):** `.pt-BR.ts` agora é a fonte (232 balões, `TEXTOS_PROVISORIOS=false`), gerado do JSON do §5 do md por script; o md ganhou a nota "editar o .ts".
- O validador ACEITA espelho (`zenon.contra.zenon`): a regra "não provoca a si mesmo" foi removida (o Apolo escreveu a fala de espelho).
- `contra.abertura` do ZENON tem 1 variante por rival: repete entre lutas (sem como evitar); `contra.vitoria` tem 2 (1 no espelho). Teste "não repete" só vale para listas > 1.
- Armadilhas do script: typescript 7 não tem API JS (sem `transpileModule`) -> provar a volta avaliando o literal do .ts; NUNCA escrever `a/b*/c` em comentário de bloco (o `*/` fecha o comentário); heredoc do Bash comeu as barras invertidas -> gerar scripts com Write.
- Termos estrangeiros (md §3) seguem sem revisão de nativo: pendência de publicação.
