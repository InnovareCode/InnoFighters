# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 19800 lutas (18000 regulares + 1800 contra o chefão), 53 s em 8 processo(s).
- Versão dos dados/motor: `d81622b9b8db` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-21.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `2c88c4e935021822`.
**DIFERENTE** da rodada anterior (antes `08a116c08e22a075`, agora `2c88c4e935021822`), e a versão dos dados/motor/harness mudou (`267890b2233a` -> `d81622b9b8db`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|
| hayato | 47.9% | 47.7% |
| wei-long | 52.0% | 52.3% |
| min-ji | 50.7% | 50.9% |
| caio | 51.3% | 51.3% |
| aminu | 46.3% | 46.1% |
| centella | 41.3% | 41.4% |
| camille | 56.7% | 57.0% |
| nila | 49.0% | 49.1% |
| baatar | 51.9% | 51.6% |
| zenon | 52.9% | 52.6% |

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | taxa-geral | centella | taxa de vitória 41.4%, fora da meta 42-58% |
| ATENCAO | chefao | chefão DIFÍCIL | o jogador vence 14.9% (n=900), fora da meta 20-40% (só vale para NORMAL) |
| ATENCAO | nunca-acerta | camille sFwd | usado 12215x e só 582 contato(s) (4.8%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1717 | **47.7%** | 46%-49% | 50.9% | 44.4% | 48.5% | 46.9% | 103 s | 0.0% | 208 | 1 |
| wei-long | 3600 | 1884 | **52.3%** | 51%-54% | 53.8% | 50.8% | 48.4% | 56.2% | 99 s | 0.0% | 211 | 0 |
| min-ji | 3600 | 1831 | **50.9%** | 49%-52% | 54.9% | 46.8% | 43.6% | 58.2% | 97 s | 0.0% | 214 | 0 |
| caio | 3600 | 1848 | **51.3%** | 50%-53% | 55.4% | 47.2% | 52.1% | 50.6% | 96 s | 0.0% | 213 | 0 |
| aminu | 3600 | 1660 | **46.1%** | 44%-48% | 49.9% | 42.3% | 40.9% | 51.3% | 103 s | 0.0% | 205 | 1 |
| centella | 3600 | 1492 | **41.4%** | 40%-43% | 43.6% | 39.3% | 43.7% | 39.2% | 100 s | 0.0% | 204 | 0 |
| camille | 3600 | 2051 | **57.0%** | 55%-59% | 59.8% | 54.2% | 51.2% | 62.7% | 98 s | 0.0% | 216 | 0 |
| nila | 3600 | 1766 | **49.1%** | 47%-51% | 51.5% | 46.6% | 55.9% | 42.2% | 110 s | 0.0% | 209 | 2 |
| baatar | 3600 | 1859 | **51.6%** | 50%-53% | 54.2% | 49.1% | 60.0% | 43.3% | 102 s | 0.0% | 213 | 3 |
| zenon | 3600 | 1892 | **52.6%** | 51%-54% | 54.5% | 50.6% | 55.7% | 49.4% | 105 s | 0.0% | 213 | 0 |

Vantagem de lado: o P1 vence 52.9% das lutas (n=18000). Duração média 101 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 13 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 42 | 52 | 50 | 45 | 67 | 40 | 52 | 42 | 41 |
| **wei-long** | 59 | · | 56 | 49 | 50 | 53 | 43 | 47 | 61 | 54 |
| **min-ji** | 48 | 44 | · | 44 | 63 | 63 | 49 | 63 | 39 | 45 |
| **caio** | 50 | 51 | 56 | · | 54 | 60 | 46 | 56 | 49 | 40 |
| **aminu** | 56 | 50 | 37 | 46 | · | 44 | 40 | 38 | 49 | 56 |
| **centella** | 33 | 48 | 37 | 41 | 56 | · | 49 | 46 | 32 | 33 |
| **camille** | 60 | 57 | 51 | 54 | 60 | 51 | · | 62 | 63 | 55 |
| **nila** | 48 | 53 | 38 | 44 | 62 | 54 | 39 | · | 49 | 55 |
| **baatar** | 58 | 40 | 61 | 51 | 51 | 69 | 37 | 51 | · | 48 |
| **zenon** | 59 | 46 | 55 | 60 | 44 | 67 | 45 | 45 | 52 | · |

## Chefão (CPU do nível indicado nos dois lados; sem chefão no jogo = não roda)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa. Round único; empate repete o round.

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO |
|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **24.0%** (24/100) | 17%-33% | 39 s | 1.0 | 83% | 83% | 100% |
| wei-long | NORMAL | **24.0%** (24/100) | 17%-33% | 39 s | 1.0 | 83% | 83% | 100% |
| min-ji | NORMAL | **28.0%** (28/100) | 20%-37% | 36 s | 1.0 | 77% | 77% | 100% |
| caio | NORMAL | **24.0%** (24/100) | 17%-33% | 36 s | 1.0 | 80% | 80% | 100% |
| aminu | NORMAL | **40.0%** (40/100) | 31%-50% | 40 s | 1.0 | 90% | 90% | 100% |
| centella | NORMAL | **17.0%** (17/100) | 11%-26% | 37 s | 1.0 | 71% | 71% | 100% |
| camille | NORMAL | **38.0%** (38/100) | 29%-48% | 39 s | 1.0 | 88% | 88% | 100% |
| nila | NORMAL | **28.0%** (28/100) | 20%-37% | 41 s | 1.0 | 82% | 82% | 100% |
| baatar | NORMAL | **29.0%** (29/100) | 21%-39% | 39 s | 1.0 | 89% | 89% | 100% |
| hayato | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 56 s | 1.0 | 71% | 71% | 100% |
| wei-long | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 52 s | 1.0 | 85% | 85% | 100% |
| min-ji | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 50 s | 1.0 | 73% | 73% | 100% |
| caio | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 52 s | 1.0 | 75% | 74% | 100% |
| aminu | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 55 s | 1.0 | 89% | 89% | 100% |
| centella | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 49 s | 1.0 | 55% | 54% | 100% |
| camille | DIFÍCIL | **31.0%** (31/100) | 23%-41% | 52 s | 1.0 | 85% | 85% | 100% |
| nila | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 59 s | 1.0 | 71% | 71% | 100% |
| baatar | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 52 s | 1.0 | 77% | 77% | 100% |

Média contra os 9 desafiantes, NORMAL: o jogador vence **28.0%** (meta 20-40% no NORMAL).
Média contra os 9 desafiantes, DIFÍCIL: o jogador vence **14.9%** (meta 20-40% no NORMAL).

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 34053 seguradas em 46972 usos) | 54.8% / 7.0% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (6826 em 14764) | 46.2% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (9990 acertos; faixas <10/10-25/25-50/≥50%: 3/1/732/9254) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 17.79 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 5839 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 18383/6266/5969 · chp 11451/2694/1109 · clk 9214/2202/1966 · clp 9379/3933/3688 · hk 22028/5548/4956 · hp 31453/9067/8219 · lk 32409/6582/5301 · lp 37384/8202/5982 · parado 0/0/676 · sDown 12848/4096/1776 · sFire 15928/6391/5457 · sFwd 39702/10802/16094 · throw 2452/2358/0

**wei-long**: chk 18985/7597/7967 · chp 10464/2538/799 · clk 8125/3381/3664 · clp 8197/3536/3043 · hk 27246/6807/7847 · hp 30104/10872/14729 · lk 30676/6269/4732 · lp 33428/9626/7966 · parado 0/0/888 · projétil 0/11509/0 · sDown 24156/24/1818 · sFire 9690/838/1489 · sFwd 17665/5492/6886 · throw 1655/1583/0

**min-ji**: chk 19171/6725/5573 · chp 11489/2824/1207 · clk 9086/2199/1842 · clp 9143/4015/3377 · hk 25751/6808/6688 · hp 33337/14076/13418 · lk 31980/9292/8311 · lp 46503/9536/7419 · parado 0/0/951 · sDown 13885/17380/9486 · sFire 26919/17455/19067 · sFwd 35814/11524/15181 · throw 2774/2662/0

**caio**: chk 16940/6766/6737 · chp 9956/2369/1001 · clk 7961/3507/3750 · clp 8032/2565/2065 · hk 20229/5374/6155 · hp 31538/7719/6108 · lk 28586/9634/11558 · lp 38600/6526/5402 · parado 0/0/758 · sDown 16986/6351/6217 · sFire 15741/7266/4483 · sFwd 36226/12744/14520 · throw 2353/2271/0

**aminu**: chk 17917/7653/7405 · chp 10142/2604/757 · clk 7454/3320/3545 · clp 7626/3441/3681 · hk 23525/6709/7566 · hp 30197/9403/10512 · lk 28753/7477/8739 · lp 31584/10293/9620 · parado 0/0/661 · sDown 15036/2532/1674 · sFire 46972/11128/4550 · sFwd 12481/3130/2885 · throw 1561/1523/0

**centella**: chk 15669/5800/5369 · chp 8381/1988/961 · clk 7063/2315/2078 · clp 7177/3140/2785 · hk 20142/5343/4966 · hp 27869/7799/8248 · lk 26532/8455/8148 · lp 44946/7237/5386 · parado 0/0/813 · sDown 582/377/0 · sFire 47856/15866/19945 · sFwd 17544/10020/808 · throw 2202/2108/0

**camille**: chk 19391/7802/7517 · chp 10490/2609/736 · clk 8234/3682/3813 · clp 7960/3502/3397 · hk 24813/6962/7559 · hp 32195/9957/10939 · lk 30992/7744/8985 · lp 32775/7834/5687 · sDown 60062/25305/24042 · sFire 14764/0/0 · sFwd 12215/432/150 · sResp 6826/6740/4 · throw 1530/1472/0

**nila**: chk 11116/4674/4849 · chp 7590/1652/570 · clk 5854/2113/2249 · clp 6030/2603/2805 · hk 14462/3946/4053 · hp 22254/6134/7803 · lk 20482/5351/6203 · lp 24153/6192/4616 · parado 0/0/914 · sDown 33916/0/0 · sFire 20762/4509/5867 · sFwd 17934/3659/3590 · sarpa/chk 7357/1885/1595 · sarpa/chp 3997/1052/393 · sarpa/clk 3032/1159/1054 · sarpa/clp 3016/1293/1153 · sarpa/hk 9283/2551/2183 · sarpa/hp 11626/3900/3520 · sarpa/lk 11767/2510/2804 · sarpa/lp 13674/3297/2522 · sarpa/sDown 32070/0/0 · sarpa/sFire 47146/16421/21168 · sarpa/sFwd 8141/2828/2516 · sarpa/throw 841/819/0 · throw 1138/1091/0

**baatar**: chk 18883/7305/7484 · chp 9909/2008/736 · clk 8153/3516/3716 · clp 8219/2604/2641 · hk 23523/6978/7305 · hp 31233/9084/10562 · lk 30832/7649/8545 · lp 40561/12140/12601 · parado 0/0/694 · sDown 34737/10955/11968 · sFire 13985/4382/0 · sFwd 21984/7780/11197 · throw 1493/1454/0

**zenon**: chk 19858/8689/8599 · chp 10898/2637/937 · clk 8632/3741/4159 · clp 8473/3667/4207 · hk 26416/7691/9764 · hp 30441/9073/10531 · lk 32990/3042/1879 · lp 37659/12066/14184 · parado 0/0/471 · sDown 1053/903/21 · sFire 20952/11909/4236 · sFwd 47269/10187/18465 · throw 1931/1856/0
