# Handoff Vega — E6b · balanceamento aplicado (originais afastados do protótipo, oráculo na fixture)

Data: 2026-10-21. Sem commit. Autorizado pelo dono (afastar WEI LONG e HAYATO do protótipo). Base: `docs/handoff-vega-e6a.md` (propostas 1 e 2), `docs/balanco/`.
Só números (hp, pow, dano dos golpes comuns). Nada de alcance, tempos, armadura ou comportamento: a proposta da E6a também tirava a armadura do BAATAR em `hp`/`chp`; **não apliquei isso**, refinei com `--ajustes` só nos números e a meta fechou sem a mudança de comportamento.

## RESULTADO

### Mudanças de dados, linha a linha (`src/data/lutadores/`)

| Arquivo | Campo | Antes | Depois |
|---|---|---|---|
| `wei-long.ts` | `pow` | 1.14 | **0.93** |
| `wei-long.ts` | `hp` | 108 | **96** |
| `wei-long.ts` | `mods.lp.dmg` | 5 | **4.5** |
| `wei-long.ts` | `mods.lk.dmg` | 6.5 | **6** |
| `wei-long.ts` | `mods.hp.dmg` | 13 | **10** |
| `wei-long.ts` | `mods.hk.dmg` | 17 | **14** |
| `wei-long.ts` | `mods.chp.dmg` | 13 | **10** |
| `wei-long.ts` | `mods.chk.dmg` | 12 | **9** |
| `hayato.ts` | `pow` | 1 | **1.07** |
| `hayato.ts` | `hp` | 100 | **106** |
| `aminu.ts` | `pow` | 1.06 | **1.18** |
| `aminu.ts` | `hp` | 102 | **112** |
| `nila.ts` (GAJA, ficha base) | `pow` | 1.1 | **1.18** |
| `nila.ts` (GAJA) | `hp` | 98 | **108** |
| `baatar.ts` (jogável) | `pow` | 1.18 | **0.90** |
| `baatar.ts` (jogável) | `hp` | 118 | **92** |
| `baatar.ts` `fichas.chefe` | `pow` | 1.3 | **1.0** |
| `baatar.ts` `fichas.chefe2` | `pow` | 1.3 | **1.0** |
| `baatar.ts` `chefe` | `hpPorBarra` | 75 | **40** |

Não mudaram: MIN-JI, CAIO, CENTELLA, CAMILLE, a SARPA (pow 0,9), `spd`, `jump`, tempos S/A/R, `kb`, `adv`, armadura e alcance de todos. Os mesmos números, em forma de proposta, estão em `docs/handoff-vega-e6a.md`; a diferença para lá: **BAATAR sem remover a armadura** e valores refinados (WEI LONG `pow 0,93`/`hp 96`, AMINU `112`/`1,18`, NILA `108`/`1,18`, HAYATO `106`/`1,07`, BAATAR `0,90`/`92`).

### Taxas CPU x CPU antes -> depois (`--completo`, 100 sementes, NORMAL + DIFÍCIL, 16 000 lutas, 0 travadas)

| Lutador | Antes | Depois |
|---|---|---|
| hayato | 32,6% | **47,9%** |
| wei-long | 85,3% | **51,5%** |
| min-ji | 49,3% | **51,4%** |
| caio | 49,2% | **52,4%** |
| aminu | 20,7% | **44,9%** |
| centella | 40,3% | **43,8%** |
| camille | 52,8% | **56,4%** |
| nila | 29,7% | **48,7%** |
| baatar | 90,3% | **53,0%** |
| Chefão, jogador vence NORMAL | 1,0% | **24,3%** (194/800) |
| Chefão, jogador vence DIFÍCIL | 3,5% | **29,4%** (235/800) |

Todos entre 43,8% e 56,4% (meta 42-58% atendida em todos); chefão dentro de 20-40% nos dois níveis; sinalizações do harness: **0 alerta, 0 atenção, 0 info**. P1 vence 53,1%; 0% de lutas por tempo; MASHI nível 2+ em 54,8%, PARADE apara em 47,2%. Por desafiante o chefão varia de 15% a 49% (AMINU DIFÍCIL 49%, CAMILLE DIFÍCIL 47%, CENTELLA DIFÍCIL 15%): a média é o que a meta cobra; a sessão do dono fecha. Referência regravada em `docs/balanco/` (`resultados.md/.json`, `frame-data.md/.json`); duas rodadas `--completo` seguidas: **IDÊNTICA** (hash `75662642f653f0e6`), e a primeira apontou "diferente, versão mudou (5bd99d2615a6 -> aca3c6f2260d), 9 lutadores mudaram de taxa", como deve.

Como refinei (só `--ajustes`, N = 30): partindo do pacote da E6a sem tirar a armadura, o BAATAR ficou em 68%; baixei `pow`/`hp` dele e subi AMINU/NILA/HAYATO até todos caírem em 44-57%. O chefão (N = 60) deu 25,2% e 29,4% com o pacote final.

### Oráculo de fidelidade (os 4 originais deixam de ser idênticos ao protótipo)

- **Fixture** `tests/fixtures/dados-prototipo/originais.json` (+ `LEIA-ME.md`): `hp`, `pow` e `mods` de HAYATO, WEI LONG, MIN-JI e CAIO **como no protótipo**.
- `tests/unit/_lutadores.ts`: `DADOS_ORIGINAIS`, `defDoOraculo(id)` e `montarTodos({ arteReal?, dadosDeProducao? })`. **O padrão de `montarTodos()` continua sendo o oráculo** (atlas original de HAYATO/MIN-JI + dados originais dos 4); `dadosDeProducao: true` monta com os números balanceados.
- `dados.test.ts` usa `defDoOraculo` (compara com o protótipo real); `luta-fidelidade.test.ts` e o snapshot CPU x CPU (semente 42) usam `montarTodos()` e **seguem verdes sem `-u`** (o `.snap` não foi tocado).
- Novo `tests/unit/dados-balanceados.test.ts` (4): a fixture tem os números do protótipo; a produção tem os balanceados (`LUTADORES`, o elenco do harness, `montarTodos({dadosDeProducao})`); o afastamento é **só** hp, pow e `dmg` dos golpes comuns (mesmos golpes ajustados, S/A/R/kb/adv iguais); MIN-JI e CAIO seguem iguais ao protótipo.
- O jogo real usa `src/data/lutadores` (balanceado).
- Ajustei 7 testes que citavam valores de produção: `e5-elenco.test.ts` (BAATAR 2 x 40, jogável hp 92), `nila-s5.test.ts` (pow GAJA 1,18), `balanco.test.ts` (WEI LONG hk dano 14, hp 96, chefe 40).

## PROVADO

- `npm run typecheck` 0 erros; `npm test` **42 arquivos, 920 testes verdes**; `npm run build` verde. Snapshot e fidelidade dos 4 originais verdes, sem `-u`. `test:e2e` não rodado.
- **Mutação do oráculo** (mutante aplicado, testes reprovam, restaurado; rodei dados + luta-fidelidade + fight + dados-balanceados):
  - `defDoOraculo` devolvendo a produção: **24 testes** caem (dados.test, a tabela de frame data do fight.test, o snapshot, o lock-step...). Prova que o oráculo é o que segura os originais.
  - fixture com `hp` do WEI LONG 108 -> 107: 14 caem (dados, lock-step, snapshot).
  - fixture com `dmg` do `hk` 17 -> 16: 15 caem.
  - produção com `hk.S` 12 -> 13: cai o teste "só hp, pow e dano" (e só ele): o balanceamento não pode mexer em tempo sem avisar.
  - produção HAYATO `hp` 106 -> 100: cai o teste da tabela de produção.
  - motor: `escalaCombo` 0,1 -> 0,09: 23 caem (o oráculo continua sensível ao motor).

## NÃO provado

- A CPU como "jogador" do chefão é um piso; o veredito é a sessão de jogo do dono. Nada visto em navegador; e2e não rodado (os e2e que citam hp/dano do chefão ou dos 4 originais podem precisar de ajuste da Lyra/Íris).
- Taxas com a CPU nos dois lados; PARADE e postura da NILA nas mãos de uma pessoa tendem a render mais.

## PARA O PRÓXIMO

- Íris: atacar o chefão (2 barras de 40 com pow 1,0: a Dança chega mais cedo, a barra é curta) e as luta WEI LONG x BAATAR; checar telas que mostram `bars` (as barras de atributo da seleção são estáticas e não acompanharam hp/pow).
- Lyra: se algum e2e usa o hp do chefão (75) ou o dano do WEI LONG, atualizar.
- Atlas: se o dono quiser mexer de novo, `npm run balanco -- --ajustes '{...}'` mede antes de gravar.

## PENDÊNCIAS

- Sessão de jogo do dono para o chefão e os originais. Sem commit.

## APRENDIZADO

- Para afastar dados de produção do protótipo sem perder o oráculo, o padrão do helper de teste tem que ser o oráculo (`montarTodos()` = dados e atlas originais) e a produção ser opção explícita: os ~15 testes que montam o elenco por esse helper (snapshot incluído) não precisaram mudar.
- A proposta "tirar a armadura do BAATAR" não era necessária: subir/baixar `hp`/`pow` com `--ajustes` fechou a meta só com números. Medir antes de mexer em comportamento.
