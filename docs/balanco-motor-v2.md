# V2-6: o motor v2 ligado por padrão (antes e depois)

Ordem do dono: entrada no hitstop, filme do especial e combos próprios **sempre ligados**, também em `?expansao=4` e no trailer. Kill switch só para rollback/A-B: `?motorv2=0` (tudo desligado) ou `?motorv2=filmes,combos` (só essas). `?dano-filme=hoje|v2|forte` (A/B do dano, D-V3) só em desenvolvimento. Números do harness: CPU x CPU, 100 sementes, NORMAL e DIFÍCIL, com esquiva; **aproximação, não a taxa de uma pessoa**. Reprodução: `npm run balanco -- --completo --esquiva` (produção, `docs/balanco/`) e `... --sem-motor-v2` (`docs/balanco/sem-motor-v2/`).

## 1. Taxa de vitória por lutador (os 18 000 duelos regulares)

| Lutador | Antes (motor de antes, dados antigos) | v2 ligado, dados antigos | Dados novos, motor de antes | **Depois (v2 + dados novos)** | NORMAL / DIFÍCIL depois |
|---|---:|---:|---:|---:|---:|
| HAYATO | 44,9% | 46,6% | 48,6% | **49,7%** | 52,7% / 46,7% |
| WEI LONG | 47,4% | 38,1% | 56,1% | **45,7%** | 46,3% / 45,1% |
| MIN-JI | 42,3% | 39,5% | 48,7% | **44,8%** | 47,2% / 42,5% |
| CAIO | 49,7% | 50,6% | 49,0% | **50,5%** | 51,8% / 49,2% |
| AMINU | 53,9% | 57,9% | 48,9% | **54,1%** | 41,3% / 67,0% |
| CENTELLA | 44,5% | 45,2% | 51,2% | **48,5%** | 48,9% / 48,1% |
| CAMILLE | 54,0% | 63,8% | 44,6% | **53,4%** | 49,8% / 57,1% |
| NILA | 55,8% | 56,9% | 47,9% | **50,4%** | 54,3% / 46,6% |
| BAATAR | 55,6% | 55,6% | 54,3% | **56,1%** | 59,5% / 52,7% |
| ZENON | 52,1% | 46,0% | 50,8% | **46,7%** | 48,2% / 45,2% |

- Ligar o v2 sem tocar nos dados puxou a CAMILLE a 63,8% e o WEI LONG a 38,1% (as duas que o dono viu) e deixou 26 dos 45 pares fora de 42-58%. A coluna "Dados novos, motor de antes" mostra que a recalibração é **para o motor novo**: com o motor de antes ela desequilibraria o outro lado (WEI 56,1%, CAMILLE 44,6%).
- Faixa dos 10 depois: **44,8% a 56,1%** (régua do jogo 42-58%). Pares fora de 42-58% (média dos dois lados): antes 15, v2 com dados antigos 26, **depois 10** (maior: BAATAR x MIN-JI 63,5%, AMINU x HAYATO 63,0%, BAATAR x WEI LONG 62,0%; menor: MIN-JI x WEI LONG 40,0%). O critério "todo par em 42-58%" **não fecha**, nem antes fechava (15 pares fora).
- AMINU: 41,3% no NORMAL e 67,0% no DIFÍCIL. O DIFÍCIL usa combo e MASHI muito mais; é o mesmo desenho de hoje (era 53,9% geral), só vale notar.

## 2. O que foi mexido nos dados (calibração, só números)

| Lutador | Antes | Depois | Por quê |
|---|---|---|---|
| CAMILLE | hp 98, pow 0,98 | hp 94, pow 0,94 | 63,8% com o filme (PARADE e COUP D'ARRÊT) |
| WEI LONG (original) | hp 96, pow 0,93 | hp 101, pow 0,95 | 38,1% |
| MIN-JI (original) | hp 94, pow 0,90 | hp 97, pow 0,92 | 39,5% |
| HAYATO (original) | hp 106 | hp 109 | 46,6% |
| AMINU | hp 112 | hp 108 | 57,9% |
| NILA GAJA | hp 108, pow 1,18 | hp 104, pow 1,15 | 56,9% |
| CENTELLA | hp 96, pow 0,94 | hp 99, pow 0,95 | 45,2% |
| CAIO, BAATAR, ZENON | – | sem mudança | já na faixa |

- `hpPorBarra` dos guardiões acompanha o `hp` (`ceil(hp/2)`, regra do `chefoes-r1.test.ts`): AMINU 56 para 54, CENTELLA 48 para 50, CAMILLE 49 para 47, NILA 54 para 52.
- **A tabela do filme (D-V3) não mudou em valor efetivo.** O `pow` mudou em 5 lutadores, então as bases dos especiais que não são projétil foram refeitas (efetivo da tabela ÷ pow novo). Duas exceções por regra, não por escolha: **COUP D'ARRÊT 14,5 para 13,5** (o piso 1,10 x hk da CAMILLE caiu de 14,0 para 13,4) e **GOLPE MARMA e PASSO DO ELEFANTE 19,5 para 19,0** (piso da NILA 18,97). O dono pode pedir de volta os valores antigos mexendo no `pow` em vez da base.
- Fixtures do protótipo (`tests/fixtures/dados-prototipo`) intactas; `dados-balanceados.test.ts` e os testes de dados seguiram os números novos.

## 3. Chefões (`danoRecebido` e `danoRecebidoDificil`, V2-6 e V2-6b)

A V2-6 deixou 5 de 12 células fora da rampa, porque um fator só não serve aos dois níveis: o desafiante DIFÍCIL (combo + filme) abriu a distância entre NORMAL e DIFÍCIL, e ela é diferente em cada chefão (razão DIFÍCIL/NORMAL de 0,37 no AMINU a 0,94 na NILA; a meta é 0,575). Os parâmetros da CPU (`IA_CHEFE`, `AI_LEVELS[2]`: `anti`, `punir`, `esq`, `combo`, `proprio`, `think`, `fire`) mexem a DIFÍCIL do chefão em no máximo 2 a 3 pontos, no ruído, e igual para todos; nenhum separa a CENTELLA do AMINU. `hpPorBarra` e `danoRecebido` são do chefão inteiro e `hpPorBarra` é preso a `ceil(hp/2)` pelo `chefoes-r1.test.ts`. A alavanca que fecha é **um fator por nível**: `ConfigChefe.danoRecebidoDificil` (novo, opcional, mesma faixa 0,60 a 1, validado no boot; vale só com a CPU do chefão no nível 2; ausente = `danoRecebido`). `hp`/`pow` dos 10 regulares, tabela do filme, `AI_LEVELS` e `hpPorBarra` **não mudaram** nesta rodada.

| Chefão | Fatores antes (N / D) | Fatores depois (N / D) | NORMAL antes → depois (meta) | DIFÍCIL antes → depois (meta) |
|---|---|---|---|---|
| AMINU | 0,85 / 0,85 | 0,85 / **0,92** | 29,8% → 29,8% (26-30) | 11,0% → **15,8%** (13-19) |
| CENTELLA | 0,86 / 0,86 | 0,86 / **0,74** | 25,8% → 25,8% (24-28) | 23,2% → **16,8%** (12-18) |
| CAMILLE | 0,875 / 0,875 | **0,89** / **0,82** | 24,5% → 25,2% (22-26) | 16,2% → 12,8% (11-17) |
| NILA | 0,775 / 0,775 | **0,84** / **0,72** | 17,7% → **22,1%** (19-23) | 16,6% → **13,7%** (9-15) |
| BAATAR | 0,80 / 0,80 | **0,82** / **0,75** | 16,9% → 18,1% (17-21) | 12,9% → 11,5% (8-14) |
| ZENON | 0,75 / 0,75 | 0,75 / **0,73** | 18,2% → 18,2% (15-19) | 11,1% → 9,7% (7-13) |

- **12 de 12 células na meta** na rodada oficial (100 sementes, `docs/balanco`). Como cada célula tem 400 a 900 lutas (erro-padrão de 1,5 a 2,3 pontos) e uma única rodada pode acertar por sorte, conferi com **3 bases de semente independentes (300 sementes por célula, 1200 a 2700 lutas)**: todas as 12 ficam na meta, a de menor folga é AMINU NORMAL 26,8% (meta 26-30) e CENTELLA DIFÍCIL 14,2% (12-18); erro-padrão de 0,6 a 1,3 ponto.
- `hashRegulares` **inalterado: `05bf1b64b46008a0`** (quatro rodadas, antes e depois dos dois ajustes de chefão). `hashChefes edb33ac1bc92fe9c`. Sem motor v2: `hashRegulares 94bc91f1fdeb98e6`, `hashChefes 689197be17326873` (a pasta `sem-motor-v2/` foi regravada porque as linhas de chefão dela usam os fatores novos). Taxa dos 10 regulares: **44,8% a 56,1%**, igual à da seção 1.
- Cuidado ao regravar: `--varrer-dano` aplica o MESMO valor aos dois fatores (serve para achar o `danoRecebido`); o fator do DIFÍCIL se acha com `--niveis 2 --ajustes '{"aminu":{"chefe":{"danoRecebidoDificil":0.9}}}'`.

## 4. Portões do §4.5 (`portoes-v2.md`)

| | NORMAL | DIFÍCIL | Limite | Veredito |
|---|---:|---:|---|---|
| Ticks por round (variação sobre o motor de antes) | 1883 (−12,0%) | 2601 (−14,2%) | queda ≤ 20% | passa |
| Fatia do dano que vem de especial | 43,7% (+5,6 pt) | 42,6% (+4,8 pt) | ≤ +10 pt **e** 25-40% | **reprova o absoluto** (o motor de antes já estava em 38,1% e 37,8%) |
| Tempo parado estimado | 43,7% | 38,1% | ≤ 15% | **reprova** (o motor de antes já estava em 28,4% e 27,6% pela mesma conta) |
| Especiais por luta / filmes por luta | 27,2 / 11,4 | 35,9 / 11,3 | – | – |
| Luta travada, pares 42-58%, 0 KO em um golpe | 0 travadas; 10 pares fora (acima) | | | travadas passa; pares não fecham |

A estimativa de tempo parado é **pessimista de propósito** (a fórmula da spec): 48 ticks de tarja em todo especial e o roteiro COMPLETO em todo filme, sem a versão CURTA na repetição (D-V4), sem o pulo, e sem o jogador desligar a cinemática. O número real depende da política da UI. Os dois portões absolutos que reprovam **já reprovavam sem o v2**; o relativo (+5 pt, −12% de duração) está dentro. Decisão do dono: relaxar os limites absolutos ou reduzir a frequência de especial (custo de energia, não o dano da tabela decidida).

## 5. CPU x CPU e combos

- Snapshot novo `tests/unit/motor-v2-cpu.test.ts` (3 duelos, motor v2 inteiro, números de produção). Os snapshots antigos (`fight.test.ts`, `esquiva-cpu.test.ts`) e o oráculo contra o protótipo fixam as flags **desligadas** (`tests/unit/_motor-v2.ts`) e ficaram **sem `-u`**.
- Combos próprios: verificador **20 de 20** passam; a CPU DIFÍCIL faz 1,76 combo completo por luta (81% das lutas com ao menos um); no NORMAL ~0 (por desenho).

## 6. Trailer (`npm run trailer:escalar`, 8 planos, 54 s)

`criarPartida` passa a usar as mesmas flags do jogo (`MOTOR_V2_PADRAO`). **Os 8 planos de luta mudaram** (impressão, e 6 de 8 trocaram de semente/CPU/pré-rolagem); P0 (frio), P8 (retratos) e a abertura não têm motor e não mudam. O dono reaprova.

| Plano | Duelo e golpe pedido | Antes (semente, CPU, início, impressão) | Depois (semente, CPU, início, impressão) |
|---|---|---|---|
| P1 | HAYATO x WEI LONG, especial do HAYATO (tarja curta, câmera lenta) | 471, [2,1], 236, `093c3f19` | 95, [2,2], 159, `b12ecf77` |
| P2 | MIN-JI x CAIO, 2 batidas | 33, [2,2], 374, `11a817d7` | 205, [2,1], 211, `3517b343` |
| P3 | AMINU x HAYATO, MASHI nível 3 (câmera lenta) | 263, [2,2], 763, `2afd4018` | 36, [1,2], 1183, `ee09772b` |
| P4 | CENTELLA x CAIO, RESORTE | 373, [2,2], 420, `aa46d868` | 234, [2,2], 438, `317d9bdb` |
| P5 | CAMILLE x MIN-JI, COUP D'ARRÊT em contragolpe | 221, [2,2], 240, `fd04baf3` | 105, [2,1], 318, `15d64956` |
| P6 | NILA x WEI LONG, especial da NILA | 112, [2,1], 100, `2b19e9fe` | 112, [2,1], 115, `4569de9c` |
| P7 | BAATAR x HAYATO, MERGULHO DA ÁGUIA | 313, [2,1], 497, `d6fa0bae` | 152, [2,1], 329, `5897011a` |
| P9 | HAYATO x ZENON (chefão), especial do ZENON | 162, [2,1], 239, `36638572` | 162, [2,1], 239, `fa3ffdbd` |

- P6 manteve a semente (só o início andou 15 ticks); **P9 manteve semente, CPU, início e batida** e só a impressão mudou (o chefão e o filme). Os outros 6 trocaram de luta.
- **Todo especial dessas tomadas agora abre filme no motor** (`hit.filme`, evento `filme`). A cena do trailer (`src/ui/cenas/trailer.ts`) ainda **não toca o filme**: sem isso, o golpe aparece como um corte seco para as posições finais (D-V6 pede um filme no trailer). Isso é tarefa da Lyra (reproduzir o `RoteiroFilme` no plano P1 ou P5 e congelar o motor pela duração, como a tarja faz). Depois disso, `trailer:escalar --plano Px` ajusta a janela do ritmo.
- `trailer:medir` (Chromium, desempenho) não rodei: fora do meu escopo (navegador).

## 7. R-12 (25/10/2026): o ritmo completo vira a produção (cadeia por força + CPU nova + super)

`RITMO_PADRAO` passou a ter `cadeia` (tarja, provocação, intervalos, filmeRestrito, super, **cadeia**, cpu); `?ritmo=0` segue como rollback total. O harness também liga as 5 flags de motor por padrão (`--sem-ritmo` ou `--ritmo a,b` = A/B em `relatorios/`). Rodada `--completo --esquiva` em `docs/balanco`: dados `5ddb74decbdb`, hash total `ba5a6ed485dd566a` (regulares `45e8054f7c5431c6`, chefes `8545d5cae5fdb7ac`).

O que mudou nos dados (só números; os chefões não mudam de vida):

| Alvo | Antes | Depois | Por quê |
|---|---:|---:|---|
| MIN-JI `hp` | 97 | 111 | 32-37% com o ritmo completo; o `pow` fica em 0,92 (a tabela do filme é calibrada com ele) |
| CAMILLE `hp` | 94 | 106 | perdeu a FLECHA e o COUP D'ARRÊT na revisão dos 17 combos: 34% |
| CENTELLA `hp` | 99 | 93 | 62% |
| `REGEN_DE_BARRA_RITMO` | 0,07 | 0,044 | supers por luta 3,2 (22% das lutas com 5+) |
| `danoRecebido` / `Dificil` AMINU | 0,85 / 0,92 | 0,83 / 0,91 | chefões de volta à rampa (a cadeia por força muda o dano que o chefão toma) |
| CENTELLA | 0,86 / 0,74 | 0,93 / 0,82 | |
| CAMILLE | 0,89 / 0,82 | 0,81 / 0,69 | |
| NILA | 0,84 / 0,72 | 0,84 / 0,71 | |
| BAATAR | 0,82 / 0,75 | 0,87 / 0,70 | |
| ZENON | 0,75 / 0,73 | 0,79 / 0,72 | |

CENTELLA e CAMILLE mudaram de `hp` mas a vida do chefão (`hpPorBarra` 50 e 47) ficou onde estava (`tests/unit/chefoes-r1.test.ts` guarda isso).

Resultado (100 sementes, 3 600 lutas por lutador): HAYATO 53,0 · WEI LONG 51,5 · MIN-JI 47,9 · CAIO 47,5 · AMINU 56,1 · CENTELLA 48,9 · CAMILLE 51,1 · NILA 50,1 · BAATAR 46,7 · ZENON 47,3 (todos em 44-57; 3 bases de 20 sementes deram os mesmos valores com erro de ±2). Chefões na rampa nos 12 pontos (NILA DIFÍCIL segue com 89% de KO, o "critério fora" que já existia). Supers por luta: NORMAL 2,29 (9,3% das lutas com 5+, 12% com 0), DIFÍCIL 1,63 (5,7% com 5+, 28% com 0). Combos de 3+ golpes em 58% (NORMAL) e 95% (DIFÍCIL) das lutas; supers que conectam 68% / 60% (fechando cadeia 83-85%). Os portões antigos de "tempo parado" (§4.5) seguem FORA por serem anteriores à tarja do ritmo.

Trailer: com a cadeia no padrão, o bloqueio não encadeia mais; a P2 (HANA-DUL-SET defendido) e a P9 (clp bloqueado e sDown) foram reescritas na partitura (o 2º golpe sai depois do 1º acabar) e o alvo da batida 2 da P9 foi de 16 para 22 (`roteiro.ts`). As 8 impressões foram regravadas.

### 7b. Correção do R-12 (reprovação da Íris no G10): teto e espera de supers da CPU

A Íris provou no jogo real uma luta MIN-JI x CAIO com 7 supers e lutas DIFÍCIL sem nenhum. Causas: (1) o par hp+hk da CPU em ticks vizinhos virava super por acidente (o motor aceita a borda de hp e a de hk a até 2 ticks); (2) o especial que coincide com o golpe do super virava super no neutro (errava 55%); (3) nada limitava a conta; (4) a CPU DIFÍCIL reserva a barra e podia não enchê-la. Correção (só a CPU do ritmo fora do chefão; humano e chefão nunca são bloqueados):

- Teto: 2 supers por CPU na luta, 1 por round, 1 800 ticks (30 s) entre dois (`SUPER_TETO_LUTA`, `SUPER_TETO_ROUND`, `SUPER_ESPERA` em `src/fight/cpu.ts`). Dois lados dão no máximo 4. `Game.superBloqueadoPara` vale também para o par acidental (`Fighter.superNaBorda`).
- Fora do finalizador de combo e da janela de punição, o especial igual ao golpe do super sai como especial comum; com a barra cheia e reservada, a CPU só gasta a barra no super.
- Quem chega a 900 ticks de luta sem nenhum super ganha +0,08 de regen por tick (só CPU x CPU fora do chefão) e espera menos pela janela (360 ticks).
- Dados: WEI LONG hp 101 -> 108, AMINU hp 108 -> 103 (a vida do chefão fica em 54), MIN-JI hp 111 -> 115, CAMILLE hp 106 -> 110, BAATAR dano de lp 4 -> 4,8, lk 5 -> 5,8, hp 11 -> 12, chp 12 -> 13, chk 11 -> 12 (o hk fica em 15: os filmes exigem >= 1,10 x hk). Chefões: AMINU 0,82 / 0,90, CENTELLA 0,92 / 0,82, BAATAR 0,88 / 0,70 (os outros como na seção 7).

Rodada final (100 sementes; dados `061ae4485912`): hash total `a115e01939248c55`, regulares `995c01a8db8ac7db`, chefes `9c5110a3630b6ae5`. Taxas: HAYATO 54,2 · WEI LONG 48,9 · MIN-JI 49,5 · CAIO 51,1 · AMINU 49,7 · CENTELLA 51,7 · CAMILLE 48,9 · NILA 51,7 · BAATAR 48,5 · ZENON 46,0. Supers por luta: NORMAL 2,25 (1,1% com 0, nenhuma com 5+, lado máximo 2), DIFÍCIL 2,14 (1,4% com 0, nenhuma com 5+). Combos de 3+ golpes em 59% (NORMAL) e 93% (DIFÍCIL) das lutas; supers que conectam 69% / 64% (fechando cadeia 79-82%). Os 12 pontos de chefão na rampa. Os números da seção 7 (hashes, taxas, supers) ficam como histórico.
