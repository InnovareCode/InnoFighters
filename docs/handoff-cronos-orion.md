# Handoff Cronos — achados do Órion no storage (M1, M3, B1, B2, B3)

RESULTADO:
- Verificado: `tests/unit/storage-v2.test.ts` + `tests/unit/storage.test.ts` 99/99 verdes; typecheck sem erro em `src/core`/`src/meta`/storage. Mutação: 15 mutantes aplicados em `storage.ts` (um por correção), todos mortos pelos testes (o 16º, remover o ramo `futura` do carregar, era equivalente e o ramo foi removido). E2E e navegador NÃO rodados (combinado).
- NÃO verde no repo todo: `npm test`/`typecheck`/`build` falham hoje SÓ por `tests/unit/chefe-adversarial.test.ts` (7 testes + 2 erros TS `Type '3' is not assignable to type '2'` em barras) e, no momento do typecheck, `zz-tmp-explorar.test.ts` — arquivos do Vega em andamento, fora do meu escopo. Nenhum erro/falha aponta para storage.
- `src/core/storage.ts` (único arquivo de código alterado; `src/meta` intacto):
  - M1: `rounds` ∈ {1,2,3}, `time` ∈ {0,30,60,99}, `diff` ∈ {0,1,2}, só inteiros; fora disso, o padrão do campo (1e9, 0, -1, 2.5, 99, string... caem no padrão). Vale em v1, v2 e legada (mesmo `sanearConfiguracoes`).
  - M3: nova `inspecionarV2` classifica a chave como ausente / ok / `futura` (`v` numérico > 2) / `corrompida` (JSON inválido ou forma que não é v2).
    - `futura`: `carregarDadosV2` joga em memória com v1/legada/padrões e não escreve nada (nem remove a legada); `salvarDadosV2` **recusa e devolve `false`** enquanto a v2 em disco for `v>2`. Byte a byte intacta.
    - `corrompida`: o cru é copiado para `inno-fighters-v2-quebrada` (exportada como `CHAVE_STORAGE_V2_QUEBRADA`) antes de a v2 ser substituída, tanto no carregar quanto no salvar. Best-effort (cota cheia não derruba) e NÃO sobrescreve cópia existente (a primeira evidência fica).
  - B1: `controles` ≤ 32 entradas (`MAX_CONTROLES`), chave e valor ≤ 32 chars (`MAX_TAMANHO_CONTROLE`), `__proto__` descartado.
  - B2/B3: `salvarDadosV2` agora sanea `s` (`sanearConfiguracoes`) e `hi` (`sanearHi`, agora exportada). `sanearHi`: inteiro (fração cai por `floor`), `0..TETO_RECORDE` (99_999_999); acima do teto/NaN/Infinity/negativo/não-número → 0. Como a v1 também passa por `sanearHi`, o `hi = max(v1, v2)` usa valores saneados (v1 com `1e308` não contamina mais).
- Testes novos em `tests/unit/storage-v2.test.ts` (blocos M1, M3, B1, B2/B3); o teste "tudo corrompido" mudou de `size 3` para 4 (a cópia quebrada) e agora confere que nada original foi tocado. Inclui o pedido: `v:3` com progresso rico sobrevive a carregar + salvar (também v:4, 2.5 e 1e308).

PARA O PRÓXIMO:
- Lyra, `src/render/hud.ts:91`: `for (let i = 0; i < luta.winsNeeded; i++)` → usar `Math.min(luta.winsNeeded, 5)` (defesa em profundidade; o storage já limita a 3, mas `winsNeeded` pode vir de outro caminho).
- Lyra, `src/main.ts:72`: `salvar()` ignora o retorno de `salvarDadosV2`. Agora `false` significa duas coisas: cota/modo privado **ou** v2 em disco de build mais novo (`v>2`, recusa de propósito). Tratar o `false` (aviso discreto "progresso não salvo") e, de preferência, devolver o boolean de `salvar()` para a UI. Nenhuma mudança de API além disso; `carregarDadosV2` mantém a assinatura.
- Vega/quem mexer em `Configuracoes`: se uma opção nova de rounds/tempo/dificuldade for criada na UI, incluir o valor nas listas `ROUNDS_VALIDOS`/`TEMPO_VALIDO`/`DIFF_VALIDA` de `storage.ts`, senão o valor novo não persiste (volta ao padrão no load).

PENDÊNCIAS:
1. Decisão do dono (UX): com `v>2` o jogador de build antigo joga sem salvar nada (opções, recorde). O aviso depende da Lyra tratar o `false`. Alternativa mais branda (não implementada): gravar numa chave paralela; deixei sem para não criar um terceiro lugar de verdade.
2. `inno-fighters-v2-quebrada` não tem limpeza automática nem teto de tamanho (copia o que já estava no disco). Aceito; apagar manualmente ou numa release futura.
3. `salvarDados` (v1 antiga) segue sem sanear `s`/`hi` na gravação; a leitura sanea. Código obsoleto até a E4 — deixei como está.
4. Não coberto: B1 `main.ts:72` (Lyra), B4–B12/S1/S2/M2 (não são de storage).

APRENDIZADO:
- Causa raiz do M3: `lerV2` devolvia `undefined` tanto para "inexistente" quanto para "ilegível" e "de versão futura"; o fluxo tratava os três como "vazio" e sobrescrevia. Padrão: ao ler dado persistido, distinguir ausente / ok / futuro / corrompido em vez de um `undefined` único; só o ausente e o corrompido (com cópia) podem ser substituídos.
- Guarda de gravação (`salvarDadosV2` recusa sobre `v>2`) é o que impede a perda; o ramo "futura" extra no carregar era redundante (mutante equivalente) e foi removido — mutação serve para achar código morto também.
- Saneamento de gravação precisa espelhar o de leitura (B2/B3): `max(v1,v2)` só é seguro se os dois lados passam pelo mesmo `sanearHi`. Rejeitar acima do teto (→0) em vez de clampar evita que valor adulterado vire um recorde falso permanente.
