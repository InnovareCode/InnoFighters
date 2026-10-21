# Handoff do Cronos: P1, chefões progressivos (regra e dados)

Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §1 e a fase P1. Missão `cmvilwe0h00il01p78ic518n1`. Nada commitado.

## RESULTADO

- **`src/meta/chefes.ts` (novo, puro):** `chefeDoArcade(c1, prog, regras?)`, `ehChefeFinal(id, regras?)`, `desafiantesDoChefe(regras?)`.
  Regra de `chefeDoArcade`: chave desligada = o `regras.chefe` fixo (ou `null` jogando com ele); ligada = primeiro da `fila` bloqueado e diferente do `c1`;
  fila esgotada = ZENON; jogando de ZENON com a fila esgotada = `null` (sem chefão, D-A2 recomendada, ED7 mantida).
- **`Regras.chefesDaFila` e `Regras.temasMusicais`** (`src/meta/tipos.ts`, obrigatórios). `temasMusicais` não tem consumidor ainda (é da fase de música); veio junto porque a linha P1 da spec o pede.
- **`aplicarVitoriaArcade(prog, vitoria, regras?)`** aceita `VitoriaArcade = { chefe: IdLutador | null } | { derrotouChefe: boolean }`.
  `{ chefe }` + `chefesDaFila`: libera só o chefão derrotado (se ainda bloqueado), soma em `chefesDerrotados` sem repetir, **não avança a fila sozinha**, id fora do roster = sem chefe.
  O formato antigo `{ derrotouChefe }` (e `{ chefe }` com a chave desligada) é **idêntico ao HEAD ac57a80** (provado por diferencial, ver provas).
- **`montarEscada`** usa `chefeDoArcade`; rivais = `roster − {c1, regras.chefe, chefe da vez}`. `Etapa` não mudou. Com a chave desligada, saída idêntica à do HEAD.
- **`MAX_CHEFES_DERROTADOS` 8 -> 16.** `CHEFOES_SO_POR_DERROTA` continua `['zenon']` (os guardiões **não** entram: a regra antiga os liberou sem enfrentá-los; teste e mutante prendem isto).
- **Nenhuma migração, formato v2 intacto:** mesmo `{v:2,s,hi,prog}`, mesma chave, nenhum campo novo em `Progresso`. O chefão da vez é derivado de `desbloqueados`.
- **`src/ui/dev-expansao.ts`:** os dois campos novos em `false` (`?expansao=1` e `?expansao=4`), única linha de UI tocada (necessária para o `tsc`; a spec P1 a lista).
- **Arquivos:** `src/meta/{chefes,escada,progresso,regras,tipos,index}.ts`, `src/ui/dev-expansao.ts`, `tests/unit/p1-chefes-progressivos.test.ts` (69 testes), fixtures `tests/fixtures/{progresso,escada}-ac57a80.ts` (cópias fiéis do HEAD, só com imports reapontados), `tests/unit/progresso.test.ts` (1 literal de `Regras` ganhou os 2 campos; nenhuma asserção alterada).

### Decisão que diverge da spec, para o Atlas confirmar

**`REGRAS_PADRAO.chefesDaFila` está `false` nesta fase** (a spec §1.3 diz `true`). Motivo: com `true` a escada de produção passa a ter AMINU de chefão, mas o `fim.ts` ainda informa `{ derrotouChefe }` e libera o ZENON na 1ª zerada: o jogo ficaria incoerente até a L1; e 7 testes antigos que fixam "ZENON no fim com save vazio" quebrariam (a spec exige `progresso.test`/`z6`/`storage-v2` verdes sem mudar asserção). **A L1 vira a chave na mesma entrega do `fim.ts`** (uma linha em `src/meta/regras.ts`). Medi o que quebra ao virar (sem commitar o flip):
`e4-ui.test.ts` (3 testes de escada), `e5-elenco.test.ts` (2 de escada), `progresso.test.ts` ("com as regras padrao ... chefao ZENON no fim"), `z6-chefoes-derrotados.test.ts` ("caso 5") e os 2 testes-guarda do P1 (`REGRAS_PADRAO nesta fase` e o mutante M20). São asserções sobre a regra antiga com `progressoVazio()`: a L1 as reescreve para a regra nova (ou as fixa em `chefesDaFila:false`). Os dois testes do BAATAR em `e5-elenco` que falham hoje são da R1 da Vega, não desta fase.

## PARA O PRÓXIMO

**Lyra (L1):**
- `fim.ts:211`: `aplicarVitoriaArcade(persist.prog, { chefe: idDoChefeDaCampanha }, regras)`, com `idDoChefeDaCampanha = a.run.etapas.find((e) => e.chefe)?.id ?? null` (o id da **etapa**, gravado no começo do ARCADE; não recalcular no fim: outra aba pode ter liberado alguém).
- `diff.ts:38` já chama `montarEscada`: nada a mudar na montagem.
- "O guardião da vez" na seleção (casa "?" vs "???"): `proximoDaFila(prog, regras)`; é independente do `c1`. Rótulo do VS/HUD: `ehChefeFinal(c2, regras)` ("O ANFITRIÃO") vs guardião.
- Quem escolhe o ZENON com a fila esgotada não tem etapa de chefe (`chefeDoArcade` = `null`, escada de 5): o fim do ARCADE deve tratar `{ chefe: null }`.
- Revanche do ZENON (todos liberados): `novos = []`, só conta a zerada; não gerar cartão de desbloqueio.
- Virar `REGRAS_PADRAO.chefesDaFila = true` (ver acima) e atualizar os testes listados.
- Em `rivaisDaEscada` (`escada-texto.ts`) descontar 2 (final + guardião), como a spec §1.6.

**Vega (R2, harness):** `desafiantesDoChefe(regras)` devolve `[{chefe, desafiantes}]` em 6 entradas (5 guardiões na ordem da fila, ZENON por último): guardião k enfrentado por `iniciais ∪ fila[0..k-1]` (na ordem do roster, ex.: AMINU por 4, BAATAR por 8), ZENON pelos outros 9. Chamar com `{ ...REGRAS_PADRAO, chefesDaFila: true }` enquanto o padrão estiver `false`. Com a chave desligada devolve só o ZENON contra os 9.

## PROVAS (nível, conforme `quem-valida-o-que`)

- **Exaustivo, rodado:** 64 estados (2^5 subconjuntos da fila x ZENON liberado) x 10 lutadores (640 pares) por propriedades que determinam o chefão de forma única (nunca o `c1`; guardião só se bloqueado e primeiro da fila; ZENON só com a fila esgotada; `null` só jogando de ZENON com a fila esgotada); vitória em todos os estados x lutadores liberados (zeradas+1, nada sai, `novos`, `chefesDerrotados` sem repetir, entrada não mutada); escada em todos (última etapa = chefão da vez, 5 rivais distintos sem `c1` nem ZENON).
- **Campanha de meta puro, rodada:** 4 estratégias de escolha de lutador, sempre vencendo: exatamente 6 zeradas, desbloqueio na ordem da fila e depois o ZENON; a 7ª zerada (revanche) não libera nada; jogando sempre de ZENON a partir de save antigo, os 5 guardiões ainda vêm.
- **Tabela S1-S11** como testes (S3 e S1 em vários `c1`). **Roundtrip** `salvarDadosV2`/`carregarDadosV2` nos 64 estados: mesmo progresso, só as chaves `v,s,hi,prog`.
- **Chave desligada = HEAD:** diferencial contra a cópia do HEAD (`montarEscada` em 64 x 10 x 3 sementes x 3 variantes de regras; `aplicarVitoriaArcade` nos 64 estados).
- **Rollback:** o `sanearProgresso` do HEAD (cópia em fixture) lê o save do build novo e preserva `desbloqueados`, `zeradas`, `chefesDerrotados`; o build novo relê o regravado igual; os 6 chefões cabem no teto 8 do build antigo; o build antigo jogando por cima não faz o novo perder nada.
- **Mutação:** 11 regras de escolha erradas e 8 de vitória, injetadas no mesmo verificador: todas reprovadas. Mais 21 mutações textuais no código real (`chefes.ts`, `escada.ts`, `progresso.ts`, `regras.ts`) rodando o arquivo de teste: **21 de 21 mortas**. Dois mutantes equivalentes (indistinguíveis por comportamento) foram descartados e estão comentados no teste.
- **Não provado aqui:** nada de navegador/UI (fora do escopo); o e2e dos saves S1/S3/S7 é da L1.
- **tsc:** nenhum erro em `src/meta` nem nos meus testes. Há 4 erros de outros trabalhos em andamento (`tests/unit/chefoes-r1.test.ts` x3 da Vega, `tests/e2e/novos-lutadores.spec.ts` x1), então `npm run build` (que roda `tsc` antes) hoje falha por eles; `vite build` isolado passa. `vitest` completo: as falhas restantes são dos trabalhos em andamento (R1 em `e5-elenco` BAATAR, sons-vozes, `sprites-pipeline` por timeout). Snapshot (`fight.test`, `esquiva-cpu`) e lock-step (`luta-fidelidade`) verdes sem `-u`.

## PENDÊNCIAS

- Confirmar a divergência acima (`chefesDaFila` padrão `false` até a L1).
- `temasMusicais` está `true` no padrão e sem leitor; quem fizer `trilhaDaLuta` o consome (e `TEMAS_POR_LUTADOR` continua a chave de rollback).
- D-A4 (guardião futuro pode aparecer como rival comum) segue como a spec recomenda: manter ED5. A escada exclui só o chefão **da vez**, não os outros guardiões.

## APRENDIZADO

- Mudar o **formato de entrada** de uma função pública usada por UI em andamento (`{derrotouChefe}` -> `{chefe}`) sem quebrar quem ainda chama: união discriminada com o formato antigo valendo sempre a regra antiga; assim a P1 entra sem esperar a L1 e os testes antigos não mudam.
- Mudar o **padrão** de uma regra de jogo é uma decisão separada de entregar o mecanismo: o flip junto com a UI evita um estado intermediário incoerente (escada de um mundo, desbloqueio de outro).
- Teste de mutação com mutantes equivalentes dá falso "sobreviveu": descartar com justificativa em vez de torcer o teste (aqui, "considera só `desbloqueados`" e "libera o próximo quando não houve chefe").
- Edição de arquivos do repo: `src/meta` está em CRLF; a ferramenta `Edit` falha em trechos de várias linhas. Use script que lê/escreve com `newline=''`.
