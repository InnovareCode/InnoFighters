# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 19800 lutas (18000 regulares + 1800 contra o chefão), 58 s em 8 processo(s).
- Versão dos dados/motor: `267890b2233a` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-21.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `08a116c08e22a075`.
**IDÊNTICA** à rodada anterior com os mesmos parâmetros (hash `08a116c08e22a075`): mesma semente, mesmo código, mesmo resultado.

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | taxa-geral | centella | taxa de vitória 41.3%, fora da meta 42-58% |
| ATENCAO | chefao | chefão DIFÍCIL | o jogador vence 19.1% (n=900), fora da meta 20-40% (só vale para NORMAL) |
| ATENCAO | nunca-acerta | camille sFwd | usado 12243x e só 584 contato(s) (4.8%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1726 | **47.9%** | 46%-50% | 51.3% | 44.6% | 48.9% | 46.9% | 103 s | 0.0% | 208 | 1 |
| wei-long | 3600 | 1872 | **52.0%** | 50%-54% | 53.7% | 50.3% | 48.2% | 55.8% | 99 s | 0.0% | 211 | 0 |
| min-ji | 3600 | 1825 | **50.7%** | 49%-52% | 54.9% | 46.5% | 43.1% | 58.3% | 97 s | 0.0% | 213 | 0 |
| caio | 3600 | 1847 | **51.3%** | 50%-53% | 55.4% | 47.2% | 51.8% | 50.8% | 96 s | 0.0% | 213 | 0 |
| aminu | 3600 | 1666 | **46.3%** | 45%-48% | 50.2% | 42.3% | 41.3% | 51.3% | 103 s | 0.0% | 205 | 1 |
| centella | 3600 | 1485 | **41.3%** | 40%-43% | 43.3% | 39.2% | 43.4% | 39.1% | 100 s | 0.0% | 204 | 0 |
| camille | 3600 | 2041 | **56.7%** | 55%-58% | 59.6% | 53.8% | 51.2% | 62.2% | 98 s | 0.0% | 216 | 0 |
| nila | 3600 | 1765 | **49.0%** | 47%-51% | 51.5% | 46.6% | 55.7% | 42.4% | 110 s | 0.0% | 208 | 2 |
| baatar | 3600 | 1868 | **51.9%** | 50%-54% | 54.7% | 49.1% | 60.2% | 43.6% | 102 s | 0.0% | 214 | 3 |
| zenon | 3600 | 1905 | **52.9%** | 51%-55% | 55.8% | 50.1% | 56.3% | 49.6% | 104 s | 0.0% | 212 | 0 |

Vantagem de lado: o P1 vence 53.0% das lutas (n=18000). Duração média 101 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 11 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 42 | 52 | 50 | 45 | 67 | 40 | 52 | 42 | 43 |
| **wei-long** | 59 | · | 56 | 49 | 50 | 53 | 43 | 47 | 61 | 51 |
| **min-ji** | 48 | 44 | · | 44 | 63 | 63 | 49 | 63 | 39 | 44 |
| **caio** | 50 | 51 | 56 | · | 54 | 60 | 46 | 56 | 49 | 40 |
| **aminu** | 56 | 50 | 37 | 46 | · | 44 | 40 | 38 | 49 | 57 |
| **centella** | 33 | 48 | 37 | 41 | 56 | · | 49 | 46 | 32 | 31 |
| **camille** | 60 | 57 | 51 | 54 | 60 | 51 | · | 62 | 63 | 53 |
| **nila** | 48 | 53 | 38 | 44 | 62 | 54 | 39 | · | 49 | 55 |
| **baatar** | 58 | 40 | 61 | 51 | 51 | 69 | 37 | 51 | · | 50 |
| **zenon** | 57 | 49 | 56 | 60 | 43 | 69 | 48 | 45 | 50 | · |

## Chefão (CPU do nível indicado nos dois lados; sem chefão no jogo = não roda)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa. Round único; empate repete o round.

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO |
|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **30.0%** (30/100) | 22%-40% | 39 s | 1.0 | 81% | 81% | 100% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 39 s | 1.0 | 77% | 77% | 100% |
| min-ji | NORMAL | **32.0%** (32/100) | 24%-42% | 37 s | 1.0 | 81% | 81% | 100% |
| caio | NORMAL | **30.0%** (30/100) | 22%-40% | 37 s | 1.0 | 81% | 81% | 100% |
| aminu | NORMAL | **42.0%** (42/100) | 33%-52% | 40 s | 1.0 | 88% | 88% | 100% |
| centella | NORMAL | **19.0%** (19/100) | 13%-28% | 37 s | 1.0 | 74% | 74% | 100% |
| camille | NORMAL | **44.0%** (44/100) | 35%-54% | 40 s | 1.0 | 87% | 87% | 100% |
| nila | NORMAL | **36.0%** (36/100) | 27%-46% | 42 s | 1.0 | 81% | 81% | 100% |
| baatar | NORMAL | **31.0%** (31/100) | 23%-41% | 40 s | 1.0 | 88% | 88% | 100% |
| hayato | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 57 s | 1.0 | 71% | 71% | 100% |
| wei-long | DIFÍCIL | **24.0%** (24/100) | 17%-33% | 53 s | 1.0 | 88% | 88% | 100% |
| min-ji | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 51 s | 1.0 | 75% | 75% | 100% |
| caio | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 51 s | 1.0 | 75% | 75% | 100% |
| aminu | DIFÍCIL | **28.0%** (28/100) | 20%-37% | 56 s | 1.0 | 92% | 92% | 100% |
| centella | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 49 s | 1.0 | 56% | 55% | 100% |
| camille | DIFÍCIL | **31.0%** (31/100) | 23%-41% | 53 s | 1.0 | 85% | 85% | 100% |
| nila | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 60 s | 1.0 | 70% | 70% | 100% |
| baatar | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 54 s | 1.0 | 75% | 75% | 100% |

Média contra os 9 desafiantes, NORMAL: o jogador vence **31.4%** (meta 20-40% no NORMAL).
Média contra os 9 desafiantes, DIFÍCIL: o jogador vence **19.1%** (meta 20-40% no NORMAL).

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 34106 seguradas em 46974 usos) | 54.7% / 7.0% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (6841 em 14769) | 46.3% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (9986 acertos; faixas <10/10-25/25-50/≥50%: 3/1/732/9250) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 17.80 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 5825 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 18385/6243/5966 · chp 11441/2693/1107 · clk 9187/2203/1959 · clp 9346/3938/3672 · hk 21957/5554/4952 · hp 31367/9072/8177 · lk 32358/6573/5302 · lp 37381/8229/5997 · parado 0/0/676 · sDown 12860/4099/1788 · sFire 15880/6396/5441 · sFwd 39787/10830/16134 · throw 2466/2372/0

**wei-long**: chk 18968/7590/7956 · chp 10502/2545/794 · clk 8125/3362/3688 · clp 8169/3559/3001 · hk 27135/6802/7764 · hp 30101/10865/14737 · lk 30651/6227/4733 · lp 33367/9602/7954 · parado 0/0/888 · projétil 0/11488/0 · sDown 24171/24/1870 · sFire 9692/833/1482 · sFwd 17651/5508/6854 · throw 1638/1567/0

**min-ji**: chk 19159/6710/5568 · chp 11456/2818/1205 · clk 9041/2187/1818 · clp 9123/4019/3359 · hk 25687/6811/6663 · hp 33323/14080/13391 · lk 32055/9332/8304 · lp 46411/9534/7408 · parado 0/0/951 · sDown 13885/17357/9458 · sFire 26846/17380/18983 · sFwd 35720/11494/15134 · throw 2787/2673/0

**caio**: chk 16919/6767/6700 · chp 9931/2362/1002 · clk 7975/3495/3768 · clp 8000/2555/2048 · hk 20178/5346/6147 · hp 31547/7740/6102 · lk 28521/9610/11507 · lp 38530/6516/5376 · parado 0/0/758 · sDown 16968/6354/6200 · sFire 15764/7277/4492 · sFwd 36127/12749/14470 · throw 2366/2286/0

**aminu**: chk 17826/7610/7385 · chp 10137/2615/751 · clk 7474/3325/3559 · clp 7618/3429/3688 · hk 23534/6731/7587 · hp 30227/9389/10524 · lk 28772/7485/8744 · lp 31687/10321/9662 · parado 0/0/661 · sDown 15045/2535/1671 · sFire 46974/11144/4563 · sFwd 12473/3118/2888 · throw 1566/1529/0

**centella**: chk 15667/5793/5362 · chp 8374/1988/950 · clk 7092/2331/2083 · clp 7181/3151/2781 · hk 20146/5331/4991 · hp 27917/7789/8263 · lk 26460/8436/8111 · lp 44916/7264/5382 · parado 0/0/813 · sDown 578/378/0 · sFire 47820/15854/19924 · sFwd 17564/10016/800 · throw 2205/2112/0

**camille**: chk 19444/7817/7537 · chp 10499/2615/744 · clk 8231/3683/3800 · clp 7979/3511/3406 · hk 24811/6951/7573 · hp 32217/9952/10964 · lk 30908/7715/8967 · lp 32823/7835/5696 · sDown 60063/25281/24058 · sFire 14769/0/0 · sFwd 12243/437/147 · sResp 6841/6755/4 · throw 1544/1485/0

**nila**: chk 11121/4681/4838 · chp 7555/1661/572 · clk 5853/2104/2262 · clp 6023/2600/2792 · hk 14445/3937/4055 · hp 22299/6165/7802 · lk 20401/5311/6188 · lp 24167/6153/4627 · parado 0/0/914 · sDown 33925/0/0 · sFire 20764/4501/5862 · sFwd 17904/3663/3564 · sarpa/chk 7344/1871/1594 · sarpa/chp 3997/1043/394 · sarpa/clk 3019/1139/1052 · sarpa/clp 3008/1289/1148 · sarpa/hk 9346/2568/2206 · sarpa/hp 11612/3898/3528 · sarpa/lk 11741/2509/2798 · sarpa/lp 13576/3250/2519 · sarpa/sDown 32101/0/0 · sarpa/sFire 47138/16414/21161 · sarpa/sFwd 8112/2823/2489 · sarpa/throw 841/820/0 · throw 1130/1082/0

**baatar**: chk 18976/7357/7524 · chp 9883/2002/734 · clk 8194/3533/3722 · clp 8252/2627/2667 · hk 23567/6987/7328 · hp 31314/9131/10626 · lk 30939/7706/8579 · lp 40610/12158/12597 · parado 0/0/694 · sDown 34880/10994/12015 · sFire 14030/4379/0 · sFwd 22007/7815/11199 · throw 1481/1443/0

**zenon**: chk 19748/8603/8734 · chp 10808/2578/932 · clk 8628/3764/4157 · clp 8453/3687/4173 · hk 26418/7617/9913 · hp 30525/9105/10553 · lk 32807/3175/2030 · lp 37689/12021/14408 · parado 0/0/486 · sDown 1046/897/20 · sFire 20926/11853/4158 · sFwd 47213/10164/18556 · throw 1901/1830/0
