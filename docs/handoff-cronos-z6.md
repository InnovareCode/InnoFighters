# Handoff Cronos — Z6 (chefoes derrotados, migracao e rollback)

RESULTADO:
- Verificado: `npm test` completo 58/59 arquivos; o 1 que falhou (`sprites-pipeline`, sharp/timeout sob carga) passou isolado, 24/24. `tsc --noEmit`: unico erro e `tests/unit/e5-elenco.test.ts(191,30) 'm.name' possibly undefined`, que NAO e meu (arquivo que nao toquei). E2E nao rodado (combinado). Nada visto em navegador: nada daqui e lido pela UI.
- Mutacao: 19 mutantes aplicados a mao em `progresso.ts`/`storage.ts` (script no scratchpad, fontes restauradas): 19 mortos, 0 sobreviventes.
- `src/meta/tipos.ts`: `Progresso.chefesDerrotados?: string[]` (opcional, ausente quando vazio — o disco de quem nunca derrotou chefao fica identico). `string[]` e nao `IdLutador[]` porque `'zenon'` ainda nao esta em `IDS_LUTADORES`. `chefeDerrotado` fica como LEGADO, agora DERIVADO (`true` sse a lista nao esta vazia) e ainda gravado, para um build antigo ler o ganho apos rollback.
- `src/meta/progresso.ts`:
  - `sanearProgresso`: lista so com forma de id (`/^[a-z0-9][a-z0-9-]{0,31}$/`), sem repetir, teto `MAX_CHEFES_DERROTADOS = 8`, NAO exige o id no roster. Booleano `true` estrito sem lista -> `['baatar']` (`CHEFE_LEGADO`). A lista manda sobre o booleano. `CHEFOES_SO_POR_DERROTA = ['zenon']`: Zenon em `desbloqueados` ou `desconhecidos` entra na lista (recompõe o que um build antigo apagou). `baatar` fica FORA da tabela (tambem sai da fila, ter o id nao prova derrota).
  - `aplicarVitoriaArcade`: soma `regras.chefe` (sem repetir) a lista quando `derrotouChefe`; aceita prog montado a mao so com o booleano (conta como `['baatar']`). Jogando COM o chefao/sem chefao nas regras: nada muda.
  - Novos exports em `src/meta/index.ts`: `CHEFE_LEGADO`, `CHEFOES_SO_POR_DERROTA`, `MAX_CHEFES_DERROTADOS`, `chefesDerrotadosDe`, `derrotouOChefe`.
- `src/core/storage.ts`: so comentario. `carregarDadosV2`/`salvarDadosV2` ja saneavam via `sanearProgresso`, entao a v2 estendida (sem bump) e saneada na leitura e na gravacao. Carregar NAO regrava a migracao (idempotente, byte a byte); o disco muda no proximo save. `v > 2` segue intocada (testado com `chefesDerrotados` dentro).
- Desbloqueio/fila: `aplicarVitoriaArcade`/`proximoDaFila` ja faziam o certo (pular quem esta liberado; chefe liberado so uma vez); agora ha teste dos casos de §11.2 com o roster de 10 montado so na fixtura (`[...IDS_LUTADORES, 'zenon']`, `chefe: 'zenon'`). `contratos.ts`, `regras.ts` e `IDS_LUTADORES` NAO tocados.
- Testes: novo `tests/unit/z6-chefoes-derrotados.test.ts` (51 testes: 5 casos de §11.2, saneamento da lista, ida e volta com rollback (a) build com Z6 sem Zenon no roster e (b) build anterior a Z6 emulado por copia fiel do saneamento antigo, v2 futura intacta, estabilidade salvar->carregar->salvar, teste de arquitetura). 3 asserts antigos atualizados porque o formato mudou de proposito (`legado true` agora tambem traz `chefesDerrotados:['baatar']`): `progresso.test.ts` (2) e `storage-v2.test.ts` (1).
- Teste de arquitetura: nenhum arquivo de `src/` fora de `meta/tipos.ts` e `meta/progresso.ts` pode citar `chefeDerrotado` (varre `src/ui` e todo o resto; checa que a varredura nao esta vazia e que o detector pega um leitor falso).

PARA O PROXIMO:
- Vega/Z5 (flip): ao por `'zenon'` em `IDS_LUTADORES` e `CHEFE = 'zenon'` em `regras.ts`, nada mais a migrar: quem tem `'zenon'` em `desconhecidos` o recebe em `desbloqueados` no load. Atualizar `papeis-lutadores.test.ts` (uniao INICIAIS+FILA+CHEFE = ROSTER) e os asserts de `REGRAS_PADRAO.chefe`/roster de 9 em `progresso.test.ts` (mencionam `toHaveLength(9)`). Meu teste novo usa roster por fixtura e nao quebra com o flip, EXCETO o item "REGRAS_PADRAO.chefe e null" (caso 'sem chefao nas regras'): apos o flip troque para `{ ...REGRAS_PADRAO, chefe: null }`.
- Lyra/UI: para saber se o Zenon esta jogavel use `liberados()`/`desbloqueados`, nunca `chefeDerrotado` (o teste de arquitetura reprova). `derrotouOChefe(prog, 'zenon')` existe se algum dia quiser mostrar "derrotou o chefao". Ao gravar, passe o `prog` inteiro (reconstruir so com 4 campos perde a lista).
- Se alguem montar `Progresso` com literal, `chefesDerrotados` e opcional.

PENDENCIAS:
1. Divergencia com a spec: §11.1 propunha NAO criar campo; a decisao do dono/Atlas foi criar `chefesDerrotados`. Convem a Nova/Alexandria alinharem o texto de §11.1.
2. A lista e so informativa (nada decide nada a partir dela). Se for virar regra de produto, isso precisa de decisao.
3. Rollback para build SEM esta mudanca descarta a lista mas guarda o desbloqueio do Zenon como `desconhecidos`; o reavanco recompoe `['baatar','zenon']` (baatar vem do booleano legado, que pode ser falso-positivo para quem so derrotou o Zenon e ganhou o BAATAR pela fila; sem consumidor hoje).
4. `tests/unit/e5-elenco.test.ts:191` quebra o `tsc` (nao e meu): `m.name` possivelmente undefined; `npm run build` depende de `tsc --noEmit`, entao isso precisa ser resolvido por quem e dono do arquivo antes do build.
5. Os e2e (`tests/e2e/expansao.spec.ts`, `jogo.spec.ts`) tem asserts `toMatchObject` com `chefeDerrotado` e continuam validos (campo preservado); nao rodados.

APRENDIZADO:
- Padrao de campo novo em `Progresso`: opcional, ausente quando vazio, ids opacos validados so por FORMA (nao por roster) para sobreviver a onda futura; e se o build antigo vai apagar o campo, manter um campo legado DERIVADO (e invariante recomposta no saneamento a partir do que o build antigo preserva: aqui, `desconhecidos`) em vez de confiar na lista.
- Booleano que vira lista: derivar o booleano da lista no saneamento (nunca dois campos independentes) e fazer a lista mandar; legado `true` so entra quando a lista esta vazia.
- Teste de rollback de build antigo: emular o saneamento antigo por copia fiel dentro do teste e dirigir o save com ele — e o que prova o "build antigo apaga, build novo recupera".
