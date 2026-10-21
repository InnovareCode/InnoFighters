# Handoff Cronos — E2 (progresso de desbloqueio, storage C4 v2)

RESULTADO:
- Verificado (typecheck limpo; `npm test` 20 arquivos / 307 testes verdes; `npm run build` ok). E2E NAO rodado (combinado). Nada testado em navegador: nada daqui e consumido pela UI ainda.
- `src/core/contratos.ts` (so acrescimo): `CHAVE_STORAGE_V1` (= `CHAVE_STORAGE`, 'inno-fighters-v1') e `CHAVE_STORAGE_V2` ('inno-fighters-v2'). `CHAVE_STORAGE` continua apontando para a v1 de proposito (main.ts usa as funcoes v1); a E4 troca.
- `src/core/storage.ts`: `carregarDados`/`salvarDados` INTACTAS (testes v1 antigos passam sem mexer). Novas: `carregarDadosV2(arm, regras?)`, `salvarDadosV2(arm, dados, regras?)`, tipo `DadosSalvosV2 = { s, hi, prog }`. Cadeia: v2 valida -> usa e apaga legada (v1 fica); senao v1 -> v2 com progresso vazio (v1 NAO apagada); senao legada -> v2 e so entao apaga a legada; v2 corrompida cai em v1/legada; tudo ruim -> padroes sem gravar. Falha de `setItem` -> `false`, nada apagado, dados voltam em memoria. `salvarDadosV2` sanea o `prog` antes de gravar.
- `src/meta/` (puro, sem DOM/storage): `tipos.ts` (Progresso, ArmazenamentoV2, Regras, Etapa, ResultadoVitoria), `regras.ts` (INICIAIS, FILA_DESBLOQUEIO, CHEFE, TAMANHO_ESCADA, REGRAS_PADRAO), `progresso.ts`, `escada.ts`, `index.ts` (barrel).
- Regras de negocio implementadas: a cada zerada, libera o primeiro da fila ainda nao liberado (nao `fila[zeradas]`, entao reordenar nunca revoga); com `derrotouChefe: true` libera tambem o chefao (na 1a vez; depois ja esta liberado); jogando COM o chefao o chamador passa `derrotouChefe: false` e so a fila avanca; fila esgotada -> `novos: []` mas `zeradas` sobe; dificuldade/continues nao entram na funcao (qualquer um conta).
- Testes novos: `tests/unit/progresso.test.ts` (meta: liberados, vitoria, reordenar fila, vistos, saneamento, escada) e `tests/unit/storage-v2.test.ts` (migracao, rollback, corrupcao, ids desconhecidos, falha de escrita, idempotencia, ida e volta). Cobrem toda a lista da secao 3.5 exceto os E2E (ficam para a E4/Iris). Usam ids falsos (`novo-a`, `chefe-x`...). Arquivo separado do `storage.test.ts` para nao mexer na suite v1.

PARA O PROXIMO:
- Lyra (E4): `import { ... } from '../meta'` (ou `../meta/progresso`).
  - `carregarDadosV2(armazenamento)` -> `{ s, hi, prog }`; `salvarDadosV2(armazenamento, { s, hi, prog })` -> boolean. Trocar `CHAVE_STORAGE` por `CHAVE_STORAGE_V2` e apagar as funcoes v1 so quando nada mais as usar.
  - `liberados(prog): ReadonlySet<IdLutador>` para a grade; `naoVistos(prog)` para o selo NOVO!; `marcarVistos(prog, ids)` ao abrir a selecao.
  - Fim do Arcade: `aplicarVitoriaArcade(prog, { derrotouChefe: !jogandoComChefe })` -> `{ prog, novos }`; mostrar "NOVO LUTADOR LIBERADO!" para cada id de `novos` (ordem: fila, depois chefao) e gravar `prog`. So chamar em vitoria (game over nao chama).
  - Escada: `montarEscada({ c1, prog, rng: rngUI, tamanho? })` -> `Etapa[]` (`{ id, chefe }`); ultima etapa tem `chefe: true` quando ha chefao e o jogador nao e o chefao.
- Vega/Nova (conteudo, E3/E5): quando os novos ids entrarem em `IDS_LUTADORES`, preencher `FILA_DESBLOQUEIO` (aminu, centella, camille, nila) e `CHEFE` (baatar) em `src/meta/regras.ts`, e `REGRAS_PADRAO.roster` ja acompanha `IDS_LUTADORES`. Hoje: fila vazia e chefe `null`, entao em producao nada libera e a escada tem 3 rivais sem chefe (comportamento de hoje preservado).
- Nao existe (ainda) a pagina em `data/` com `TAMANHO_ESCADA`/`INICIAIS` do plano 1.2; ficaram em `src/meta/regras.ts`. Se Vega criar la, `regras.ts` passa a reexportar de la.

PENDENCIAS:
1. Desbloqueio perdido em rollback de onda (ED8, lancamento em ondas): o plano manda descartar ids fora de `IDS_LUTADORES`. Se um jogador ganhar `nila` na onda 2 e o build voltar para a onda 1, o load descarta `nila` e o proximo save a apaga do disco. Os 4 iniciais nunca somem, mas o ganho some. Correcao possivel: `salvarDadosV2` preservar do disco ids string desconhecidos (com limite de quantidade/tamanho). Nao implementei por contrariar o saneamento do plano; decisao do dono/Nova. Se o plano de ondas for real, vale fazer.
2. Rollback para build v1 e reavanco: recorde/config alterados no build antigo ficam so na v1 e a v2 vence ao reavancar (recorde menor pode "voltar"). Mitigavel com `hi = max(v2.hi, v1.hi)` na migracao. Nao fiz; baixa gravidade.
3. ED5 (rival travado na escada) assumido SIM (recomendacao do plano) via `travadosNaEscada: true`; o caminho "nao" ja existe e e testado. Confirmar.
4. Camada: `core/storage.ts` agora importa `meta/progresso` e `meta/regras` (meta so importa `core/contratos` e `core/rng`, sem ciclo em runtime). Se preferir core sem dependencia de meta, da para injetar o saneador; hoje e so um import.
5. Divida registrada: apagar `inno-fighters-v1` numa release futura estavel.

APRENDIZADO:
- Mantive `CHAVE_STORAGE` como v1 e acrescentei `_V1`/`_V2`: o plano renomeia `CHAVE_STORAGE` para v2, mas fazer isso agora quebraria `carregarDados`/`salvarDados` (que o main.ts usa) e a suite v1. Renomear na E4, junto com a troca da UI.
- Rollback seguro depende de a v1 e a v2 nunca serem gravadas pela mesma funcao: o teste "build antigo salva a v1, v2 fica byte a byte igual" e a prova.
- `progresso.vistos` ⊆ `desbloqueados` e iniciais fora de ambos sao invariantes impostos no saneamento (nao estavam explicitos no plano).
- Ids novos ainda nao cabem no tipo `IdLutador`; testes usam cast `as IdLutador` (so tipo). Quando entrarem em `IDS_LUTADORES` os casts viram inofensivos.
