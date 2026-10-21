# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 16000 lutas (14400 regulares + 1600 contra o chefão), 36 s em 8 processo(s).
- Versão dos dados/motor: `bef899c30289` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-21.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `41def0eefa85f158`.
**IDÊNTICA** à rodada anterior com os mesmos parâmetros (hash `41def0eefa85f158`): mesma semente, mesmo código, mesmo resultado.

## Sinalizações (outliers)

Nenhuma.

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3200 | 1534 | **47.9%** | 46%-50% | 51.1% | 44.8% | 50.1% | 45.8% | 102 s | 0.0% | 207 | 1 |
| wei-long | 3200 | 1647 | **51.5%** | 50%-53% | 53.4% | 49.5% | 47.6% | 55.4% | 98 s | 0.0% | 211 | 0 |
| min-ji | 3200 | 1646 | **51.4%** | 50%-53% | 55.5% | 47.4% | 45.3% | 57.6% | 97 s | 0.0% | 214 | 0 |
| caio | 3200 | 1677 | **52.4%** | 51%-54% | 56.4% | 48.4% | 53.4% | 51.4% | 95 s | 0.0% | 212 | 0 |
| aminu | 3200 | 1436 | **44.9%** | 43%-47% | 49.9% | 39.8% | 40.3% | 49.4% | 102 s | 0.0% | 203 | 1 |
| centella | 3200 | 1403 | **43.8%** | 42%-46% | 45.2% | 42.5% | 45.9% | 41.8% | 99 s | 0.0% | 206 | 0 |
| camille | 3200 | 1804 | **56.4%** | 55%-58% | 58.9% | 53.9% | 51.1% | 61.6% | 97 s | 0.0% | 216 | 0 |
| nila | 3200 | 1557 | **48.7%** | 47%-50% | 51.8% | 45.5% | 55.6% | 41.7% | 109 s | 0.0% | 207 | 2 |
| baatar | 3200 | 1696 | **53.0%** | 51%-55% | 55.6% | 50.4% | 60.8% | 45.3% | 97 s | 0.0% | 210 | 1 |

Vantagem de lado: o P1 vence 53.1% das lutas (n=14400). Duração média 100 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 6 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar |
|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 42 | 52 | 50 | 45 | 67 | 40 | 52 | 37 |
| **wei-long** | 59 | · | 56 | 49 | 50 | 53 | 43 | 47 | 56 |
| **min-ji** | 48 | 44 | · | 44 | 63 | 63 | 49 | 63 | 38 |
| **caio** | 50 | 51 | 56 | · | 54 | 60 | 46 | 56 | 46 |
| **aminu** | 56 | 50 | 37 | 46 | · | 44 | 40 | 38 | 49 |
| **centella** | 33 | 48 | 37 | 41 | 56 | · | 49 | 46 | 42 |
| **camille** | 60 | 57 | 51 | 54 | 60 | 51 | · | 62 | 56 |
| **nila** | 48 | 53 | 38 | 44 | 62 | 54 | 39 | · | 52 |
| **baatar** | 63 | 45 | 62 | 54 | 51 | 58 | 44 | 48 | · |

## Chefão (BAATAR, CPU do nível indicado nos dois lados)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa. Round único; empate repete o round.

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Fez a Dança | Terminou por KO |
|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 35 s | 1.0 | 84% | 84% | 100% |
| wei-long | NORMAL | **21.0%** (21/100) | 14%-30% | 35 s | 1.0 | 83% | 83% | 100% |
| min-ji | NORMAL | **21.0%** (21/100) | 14%-30% | 33 s | 1.0 | 78% | 78% | 100% |
| caio | NORMAL | **24.0%** (24/100) | 17%-33% | 33 s | 1.0 | 86% | 86% | 100% |
| aminu | NORMAL | **31.0%** (31/100) | 23%-41% | 36 s | 1.0 | 88% | 88% | 100% |
| centella | NORMAL | **23.0%** (23/100) | 16%-32% | 35 s | 1.0 | 78% | 78% | 100% |
| camille | NORMAL | **22.0%** (22/100) | 15%-31% | 34 s | 1.0 | 83% | 83% | 100% |
| nila | NORMAL | **27.0%** (27/100) | 19%-36% | 39 s | 1.0 | 81% | 81% | 100% |
| hayato | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 51 s | 1.0 | 66% | 66% | 100% |
| wei-long | DIFÍCIL | **36.0%** (36/100) | 27%-46% | 48 s | 1.0 | 86% | 85% | 100% |
| min-ji | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 45 s | 1.0 | 74% | 74% | 100% |
| caio | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 45 s | 1.0 | 66% | 66% | 100% |
| aminu | DIFÍCIL | **49.0%** (49/100) | 39%-59% | 52 s | 1.0 | 90% | 90% | 100% |
| centella | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 47 s | 1.0 | 61% | 61% | 100% |
| camille | DIFÍCIL | **47.0%** (47/100) | 38%-57% | 48 s | 1.0 | 88% | 88% | 100% |
| nila | DIFÍCIL | **29.0%** (29/100) | 21%-39% | 57 s | 1.0 | 77% | 77% | 100% |

Média contra os 8 desafiantes, NORMAL: o jogador vence **24.3%** (meta 20-40% no NORMAL).
Média contra os 8 desafiantes, DIFÍCIL: o jogador vence **29.4%** (meta 20-40% no NORMAL).

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 30483 seguradas em 41803 usos) | 54.8% / 7.1% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (6302 em 13344) | 47.2% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (9223 acertos; faixas <10/10-25/25-50/≥50%: 0/1/681/8541) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 17.54 | – |
| BAATAR agarrões | agarrões em 3200 lutas | 10967 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 15951/5442/5117 · chp 10024/2318/977 · clk 8168/1999/1708 · clp 8150/3450/3173 · hk 19127/4936/4176 · hp 27526/8036/7080 · lk 28377/5893/4617 · lp 32766/7303/5250 · parado 0/0/676 · sDown 11328/3663/1611 · sFire 14279/5802/4844 · sFwd 34735/9589/13950 · throw 2174/2092/0

**wei-long**: chk 16677/6665/6975 · chp 9317/2177/729 · clk 7191/2968/3264 · clp 7324/3215/2681 · hk 23897/6108/6750 · hp 26610/9630/12819 · lk 27038/5688/4215 · lp 29465/8545/6969 · parado 0/0/888 · projétil 0/10092/0 · sDown 21195/24/1555 · sFire 8702/754/1307 · sFwd 15727/4917/6117 · throw 1554/1486/0

**min-ji**: chk 17013/6026/4916 · chp 10219/2462/1075 · clk 7995/1960/1605 · clp 8165/3649/2970 · hk 22744/6093/5835 · hp 29637/12513/11841 · lk 28365/8353/7279 · lp 41276/8746/6489 · parado 0/0/951 · sDown 12525/15616/8648 · sFire 23896/15684/16731 · sFwd 31764/10284/13371 · throw 2426/2316/0

**caio**: chk 14835/5997/5814 · chp 8671/2042/888 · clk 7017/3051/3328 · clp 7071/2281/1782 · hk 17632/4734/5336 · hp 27829/6853/5354 · lk 25130/8612/9990 · lp 34084/5853/4749 · parado 0/0/758 · sDown 14978/5528/5482 · sFire 14037/6606/3915 · sFwd 31714/11377/12534 · throw 2120/2047/0

**aminu**: chk 15640/6752/6384 · chp 8857/2168/678 · clk 6536/2937/3058 · clp 6710/3035/3208 · hk 20513/5950/6531 · hp 26530/8205/9138 · lk 25318/6678/7612 · lp 27854/9150/8433 · parado 0/0/661 · sDown 13308/2298/1520 · sFire 41803/9961/3993 · sFwd 11012/2766/2550 · throw 1445/1409/0

**centella**: chk 13905/5168/4726 · chp 7551/1770/891 · clk 6217/2026/1838 · clp 6416/2776/2502 · hk 17836/4767/4353 · hp 24692/6927/7265 · lk 23510/7603/7132 · lp 40098/6573/4826 · parado 0/0/813 · sDown 469/277/0 · sFire 42536/14334/17574 · sFwd 15902/9253/717 · throw 1965/1878/0

**camille**: chk 17062/6851/6638 · chp 9208/2152/671 · clk 7358/3289/3370 · clp 7093/3153/3011 · hk 21736/6160/6592 · hp 28271/8618/9664 · lk 27374/6985/7826 · lp 29038/7107/4988 · sDown 53340/22688/21231 · sFire 13344/0/0 · sFwd 10751/404/147 · sResp 6302/6218/3 · throw 1380/1322/0

**nila**: chk 9759/4131/4226 · chp 6577/1332/524 · clk 5140/1850/1998 · clp 5356/2329/2453 · hk 12684/3581/3500 · hp 19582/5372/6885 · lk 18018/4738/5426 · lp 21366/5521/4073 · parado 0/0/914 · sDown 29672/0/0 · sFire 18643/4134/5249 · sFwd 15842/3336/3132 · sarpa/chk 6344/1596/1390 · sarpa/chp 3528/900/351 · sarpa/clk 2631/1030/901 · sarpa/clp 2598/1092/1000 · sarpa/hk 8169/2304/1909 · sarpa/hp 10157/3407/3050 · sarpa/lk 10262/2190/2439 · sarpa/lp 11967/2896/2239 · sarpa/sDown 28086/0/0 · sarpa/sFire 41243/14438/18405 · sarpa/sFwd 7193/2522/2192 · sarpa/throw 733/712/0 · throw 1025/979/0

**baatar**: chk 16244/6066/6424 · chp 8615/1717/630 · clk 6994/2893/3183 · clp 6950/2170/2164 · hk 20024/6040/6154 · hp 26031/7704/8628 · lk 26420/6350/7294 · lp 29636/9426/10064 · parado 0/0/641 · sDown 28252/8898/9756 · sFire 11030/3546/0 · sFwd 19902/6197/0 · throw 1271/1223/0
