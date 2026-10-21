# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 19800 lutas (18000 regulares + 1800 contra o chefão), 72 s em 8 processo(s).
- Versão dos dados/motor: `d81622b9b8db` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-21.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `2c93922d5c48c8ea`.
Não havia rodada anterior com os mesmos parâmetros neste diretório: esta passa a ser a referência.

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | nunca-acerta | camille sFwd | usado 11347x e só 503 contato(s) (4.4%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1627 | **45.2%** | 44%-47% | 48.1% | 42.3% | 45.7% | 44.7% | 107 s | 0.0% | 205 | 0 |
| wei-long | 3600 | 1728 | **48.0%** | 46%-50% | 50.8% | 45.2% | 47.2% | 48.8% | 105 s | 0.0% | 208 | 1 |
| min-ji | 3600 | 1537 | **42.7%** | 41%-44% | 45.8% | 39.6% | 38.4% | 47.0% | 103 s | 0.0% | 208 | 0 |
| caio | 3600 | 1770 | **49.2%** | 48%-51% | 52.4% | 45.9% | 53.3% | 45.1% | 100 s | 0.0% | 210 | 1 |
| aminu | 3600 | 1955 | **54.3%** | 53%-56% | 57.3% | 51.3% | 47.7% | 60.9% | 107 s | 0.0% | 209 | 2 |
| centella | 3600 | 1608 | **44.7%** | 43%-46% | 49.2% | 40.2% | 45.7% | 43.7% | 104 s | 0.0% | 207 | 0 |
| camille | 3600 | 1940 | **53.9%** | 52%-56% | 57.3% | 50.4% | 49.4% | 58.4% | 106 s | 0.0% | 216 | 0 |
| nila | 3600 | 2058 | **57.2%** | 56%-59% | 60.2% | 54.1% | 59.1% | 55.3% | 117 s | 0.0% | 214 | 1 |
| baatar | 3600 | 1927 | **53.5%** | 52%-55% | 56.2% | 50.9% | 59.6% | 47.5% | 109 s | 0.0% | 216 | 0 |
| zenon | 3600 | 1850 | **51.4%** | 50%-53% | 54.4% | 48.4% | 54.0% | 48.8% | 108 s | 0.0% | 213 | 0 |

Vantagem de lado: o P1 vence 53.2% das lutas (n=18000). Duração média 107 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 14 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 45 | 58 | 49 | 38 | 59 | 40 | 37 | 41 | 40 |
| **wei-long** | 55 | · | 60 | 48 | 45 | 46 | 43 | 35 | 54 | 45 |
| **min-ji** | 42 | 40 | · | 43 | 41 | 52 | 43 | 43 | 36 | 46 |
| **caio** | 51 | 52 | 57 | · | 44 | 56 | 43 | 47 | 45 | 49 |
| **aminu** | 63 | 55 | 60 | 56 | · | 54 | 52 | 44 | 50 | 56 |
| **centella** | 41 | 54 | 49 | 44 | 46 | · | 48 | 43 | 40 | 39 |
| **camille** | 61 | 57 | 57 | 57 | 48 | 52 | · | 49 | 48 | 56 |
| **nila** | 63 | 65 | 57 | 53 | 56 | 57 | 51 | · | 53 | 59 |
| **baatar** | 59 | 46 | 64 | 55 | 50 | 60 | 52 | 47 | · | 49 |
| **zenon** | 60 | 55 | 54 | 51 | 45 | 61 | 44 | 41 | 52 | · |

## Chefão (CPU do nível indicado nos dois lados; sem chefão no jogo = não roda)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa. Round único; empate repete o round.

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO |
|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **30.0%** (30/100) | 22%-40% | 40 s | 1.0 | 83% | 83% | 100% |
| wei-long | NORMAL | **25.0%** (25/100) | 18%-34% | 39 s | 1.0 | 86% | 86% | 100% |
| min-ji | NORMAL | **24.0%** (24/100) | 17%-33% | 38 s | 1.0 | 80% | 80% | 100% |
| caio | NORMAL | **29.0%** (29/100) | 21%-39% | 38 s | 1.0 | 80% | 80% | 100% |
| aminu | NORMAL | **39.0%** (39/100) | 30%-49% | 40 s | 1.0 | 88% | 88% | 100% |
| centella | NORMAL | **27.0%** (27/100) | 19%-36% | 38 s | 1.0 | 73% | 73% | 100% |
| camille | NORMAL | **42.0%** (42/100) | 33%-52% | 39 s | 1.0 | 85% | 85% | 100% |
| nila | NORMAL | **40.0%** (40/100) | 31%-50% | 42 s | 1.0 | 88% | 88% | 100% |
| baatar | NORMAL | **31.0%** (31/100) | 23%-41% | 41 s | 1.0 | 89% | 89% | 100% |
| hayato | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 60 s | 1.0 | 86% | 86% | 100% |
| wei-long | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 58 s | 1.0 | 80% | 80% | 100% |
| min-ji | DIFÍCIL | **26.0%** (26/100) | 18%-35% | 59 s | 1.0 | 85% | 85% | 100% |
| caio | DIFÍCIL | **28.0%** (28/100) | 20%-37% | 55 s | 1.0 | 82% | 82% | 100% |
| aminu | DIFÍCIL | **38.0%** (38/100) | 29%-48% | 62 s | 1.0 | 90% | 90% | 100% |
| centella | DIFÍCIL | **27.0%** (27/100) | 19%-36% | 56 s | 1.0 | 74% | 74% | 100% |
| camille | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 63 s | 1.0 | 78% | 77% | 98% |
| nila | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 71 s | 1.0 | 78% | 78% | 98% |
| baatar | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 61 s | 1.0 | 72% | 72% | 100% |

Média contra os 9 desafiantes, NORMAL: o jogador vence **31.9%** (meta 20-40% no NORMAL).
Média contra os 9 desafiantes, DIFÍCIL: o jogador vence **23.0%** (meta 20-40% no NORMAL).

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 30721 seguradas em 42838 usos) | 54.3% / 8.3% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (5235 em 12041) | 43.5% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (8831 acertos; faixas <10/10-25/25-50/≥50%: 0/0/589/8242) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 21.38 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 4774 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 6.53 / 2.28 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 19887/6469/5369 · chp 12017/2541/906 · clk 9914/2221/2094 · clp 10080/4190/3956 · hk 23398/5937/4570 · hp 33264/9208/7582 · lk 35354/6869/5476 · lp 40456/8479/6640 · parado 0/0/477 · sDown 10744/3363/1192 · sFire 11349/5054/2966 · sFwd 39442/12805/13823 · throw 2438/2353/0

**wei-long**: chk 21157/8329/7357 · chp 11396/2554/664 · clk 8730/3469/3983 · clp 9023/3765/3409 · hk 29376/7115/7696 · hp 33180/11296/14351 · lk 34163/6542/5194 · lp 37390/10277/9142 · parado 0/0/812 · projétil 0/9976/0 · sDown 22891/20/1857 · sFire 7534/684/1013 · sFwd 15304/5625/4993 · throw 1593/1518/0

**min-ji**: chk 21295/7197/5016 · chp 12578/2807/987 · clk 10124/2254/1966 · clp 10231/4357/3964 · hk 27857/7172/6353 · hp 36579/14927/12967 · lk 35998/9876/9270 · lp 49032/9179/7300 · parado 0/0/607 · sDown 11678/14189/6730 · sFire 22697/16403/13277 · sFwd 34927/11345/12641 · throw 2858/2764/0

**caio**: chk 18266/7186/6015 · chp 10381/2209/819 · clk 8630/3663/4231 · clp 8826/2744/2292 · hk 21367/5506/5891 · hp 34527/7878/5444 · lk 30901/9981/13033 · lp 41425/6418/5192 · parado 0/0/588 · sDown 15397/5768/4734 · sFire 11941/6036/2736 · sFwd 35659/13984/12279 · throw 2360/2271/0

**aminu**: chk 19926/8165/7107 · chp 10911/2610/613 · clk 8087/3500/4011 · clp 8193/3620/4056 · hk 25743/7334/7399 · hp 33381/10095/10510 · lk 32127/7999/10089 · lp 35541/10956/11257 · parado 0/0/528 · sDown 14622/2579/1538 · sFire 42838/10078/3885 · sFwd 11022/3288/2025 · throw 1567/1526/0

**centella**: chk 17786/6309/5221 · chp 9473/2120/910 · clk 7904/2478/2411 · clp 7886/3343/3186 · hk 22695/5711/5145 · hp 31408/8285/8359 · lk 29486/8767/9340 · lp 47812/7583/5978 · parado 0/0/652 · sDown 521/343/0 · sFire 44297/16938/15736 · sFwd 15539/8847/631 · throw 2178/2090/0

**camille**: chk 21385/8401/7001 · chp 11572/2548/671 · clk 9177/3811/4465 · clp 8944/3748/4006 · hk 27164/7647/7309 · hp 35762/10385/10893 · lk 35241/8310/10559 · lp 36857/8468/6399 · sDown 60397/25132/19335 · sFire 12041/0/0 · sFwd 11347/375/128 · sResp 5234/5180/6 · throw 1608/1549/0

**nila**: chk 12128/4859/4467 · chp 7559/1417/452 · clk 6543/2196/2516 · clp 6328/2615/3028 · hk 15062/4008/3943 · hp 23351/6128/7459 · lk 21708/5315/6643 · lp 25942/6084/4927 · parado 0/0/635 · sDown 40376/0/0 · sFire 19004/4188/4923 · sFwd 15661/4055/2791 · sarpa/chk 8543/1898/1593 · sarpa/chp 4534/1089/393 · sarpa/clk 3322/1132/1150 · sarpa/clp 3397/1315/1389 · sarpa/hk 10748/2663/2377 · sarpa/hp 13103/4007/3665 · sarpa/lk 13355/2613/3192 · sarpa/lp 15414/3419/2857 · sarpa/sDown 38618/0/0 · sarpa/sFire 47550/19979/18056 · sarpa/sFwd 7257/2739/1934 · sarpa/throw 870/834/0 · throw 1116/1084/0

**baatar**: chk 21326/7975/7269 · chp 11109/2115/641 · clk 9142/3831/4346 · clp 9147/2893/3021 · hk 26036/7822/7298 · hp 34792/9775/10585 · lk 34646/8167/10129 · lp 44438/12802/14503 · parado 0/0/561 · sDown 35927/10997/10798 · sFire 12070/3233/0 · sFwd 18531/7838/7755 · throw 1592/1540/0

**zenon**: chk 21313/9157/7885 · chp 11892/2564/764 · clk 9182/3897/4546 · clp 9060/3858/4601 · hk 27628/7809/9132 · hp 32437/9302/9792 · lk 35624/2984/1875 · lp 41090/12794/16117 · parado 0/0/375 · sDown 835/681/20 · sFire 17994/10240/3253 · sFwd 42613/12860/13731 · throw 1901/1828/0
