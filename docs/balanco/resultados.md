# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 14400 lutas (14400 regulares + 0 contra o chefão), 49 s em 8 processo(s).
- Versão dos dados/motor: `7bd98ebdaa66` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-21.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `94a7ca18d38aaee9`.
**IDÊNTICA** à rodada anterior com os mesmos parâmetros (hash `94a7ca18d38aaee9`): mesma semente, mesmo código, mesmo resultado.

## Sinalizações (outliers)

Nenhuma.

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3200 | 1554 | **48.6%** | 47%-50% | 51.9% | 45.3% | 50.1% | 47.0% | 103 s | 0.0% | 209 | 1 |
| wei-long | 3200 | 1667 | **52.1%** | 50%-54% | 53.6% | 50.6% | 48.9% | 55.3% | 99 s | 0.0% | 211 | 0 |
| min-ji | 3200 | 1650 | **51.6%** | 50%-53% | 55.8% | 47.4% | 44.4% | 58.8% | 97 s | 0.0% | 215 | 0 |
| caio | 3200 | 1687 | **52.7%** | 51%-54% | 56.8% | 48.6% | 53.8% | 51.7% | 95 s | 0.0% | 213 | 0 |
| aminu | 3200 | 1437 | **44.9%** | 43%-47% | 49.4% | 40.4% | 39.9% | 49.9% | 103 s | 0.0% | 203 | 1 |
| centella | 3200 | 1361 | **42.5%** | 41%-44% | 44.3% | 40.8% | 44.6% | 40.4% | 99 s | 0.0% | 205 | 0 |
| camille | 3200 | 1831 | **57.2%** | 55%-59% | 60.1% | 54.3% | 51.9% | 62.6% | 98 s | 0.0% | 216 | 0 |
| nila | 3200 | 1545 | **48.3%** | 47%-50% | 51.1% | 45.4% | 55.5% | 41.1% | 110 s | 0.0% | 208 | 2 |
| baatar | 3200 | 1668 | **52.1%** | 50%-54% | 54.7% | 49.6% | 61.0% | 43.3% | 102 s | 0.0% | 214 | 3 |

Vantagem de lado: o P1 vence 53.1% das lutas (n=14400). Duração média 101 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 7 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar |
|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 42 | 52 | 50 | 45 | 67 | 40 | 52 | 42 |
| **wei-long** | 59 | · | 56 | 49 | 50 | 53 | 43 | 47 | 61 |
| **min-ji** | 48 | 44 | · | 44 | 63 | 63 | 49 | 63 | 39 |
| **caio** | 50 | 51 | 56 | · | 54 | 60 | 46 | 56 | 49 |
| **aminu** | 56 | 50 | 37 | 46 | · | 44 | 40 | 38 | 49 |
| **centella** | 33 | 48 | 37 | 41 | 56 | · | 49 | 46 | 32 |
| **camille** | 60 | 57 | 51 | 54 | 60 | 51 | · | 62 | 63 |
| **nila** | 48 | 53 | 38 | 44 | 62 | 54 | 39 | · | 49 |
| **baatar** | 58 | 40 | 61 | 51 | 51 | 69 | 37 | 51 | · |

## Chefão (CPU do nível indicado nos dois lados; sem chefão no jogo = não roda)

Não rodado nesta rodada.

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 30730 seguradas em 42150 usos) | 54.7% / 7.0% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (6355 em 13484) | 47.1% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (9059 acertos; faixas <10/10-25/25-50/≥50%: 3/1/665/8390) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 17.63 | – |
| BAATAR agarrões | agarrões em 3200 lutas | 5375 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 16110/5456/5197 · chp 10228/2471/988 · clk 8079/1930/1730 · clp 8253/3455/3237 · hk 19349/4855/4278 · hp 27867/8128/7095 · lk 28505/5830/4668 · lp 32921/7195/5281 · parado 0/0/676 · sDown 11560/3769/1637 · sFire 14450/5832/4904 · sFwd 35079/9568/14090 · throw 2204/2120/0

**wei-long**: chk 16730/6636/6987 · chp 9491/2376/736 · clk 7196/2960/3274 · clp 7226/3124/2657 · hk 24055/6035/6761 · hp 26910/9842/12935 · lk 26983/5592/4218 · lp 29269/8273/6954 · parado 0/0/888 · projétil 0/10099/0 · sDown 21468/23/1566 · sFire 8777/767/1339 · sFwd 15791/4940/6126 · throw 1512/1443/0

**min-ji**: chk 17031/5944/4940 · chp 10395/2605/1077 · clk 7988/1927/1626 · clp 8104/3562/2981 · hk 22743/5985/5828 · hp 29748/12653/11780 · lk 28290/8272/7313 · lp 41065/8426/6499 · parado 0/0/951 · sDown 12598/15898/8528 · sFire 24123/15694/16792 · sFwd 31795/10233/13358 · throw 2436/2332/0

**caio**: chk 14926/5960/5870 · chp 8964/2184/894 · clk 7014/3055/3312 · clp 7077/2258/1796 · hk 17880/4728/5382 · hp 28063/6982/5376 · lk 25157/8478/10087 · lp 34042/5752/4747 · parado 0/0/758 · sDown 15185/5677/5503 · sFire 14265/6663/4015 · sFwd 31994/11343/12694 · throw 2115/2040/0

**aminu**: chk 15616/6620/6437 · chp 9140/2424/691 · clk 6571/2898/3122 · clp 6678/3003/3197 · hk 20663/5826/6503 · hp 26857/8409/9169 · lk 25253/6475/7668 · lp 27641/8849/8480 · parado 0/0/661 · sDown 13245/2242/1498 · sFire 42150/9986/4032 · sFwd 11227/2787/2596 · throw 1433/1398/0

**centella**: chk 13864/5085/4751 · chp 7557/1820/862 · clk 6281/2024/1855 · clp 6406/2773/2498 · hk 17838/4705/4389 · hp 24860/6955/7292 · lk 23446/7476/7188 · lp 39914/6379/4809 · parado 0/0/813 · sDown 562/368/0 · sFire 42699/14262/17657 · sFwd 15863/9089/733 · throw 1941/1854/0

**camille**: chk 17141/6869/6616 · chp 9503/2439/687 · clk 7285/3221/3369 · clp 7041/3091/3013 · hk 21908/6076/6593 · hp 28705/8900/9643 · lk 27275/6758/7894 · lp 28902/6804/5036 · sDown 53455/22450/21387 · sFire 13484/0/0 · sFwd 10980/412/142 · sResp 6355/6269/4 · throw 1394/1338/0

**nila**: chk 9739/4054/4223 · chp 6829/1545/527 · clk 5144/1834/1996 · clp 5323/2288/2455 · hk 12742/3482/3527 · hp 19817/5505/6845 · lk 18072/4660/5478 · lp 21319/5388/4058 · parado 0/0/914 · sDown 29861/0/0 · sFire 18643/4015/5275 · sFwd 15992/3263/3178 · sarpa/chk 6442/1626/1410 · sarpa/chp 3637/965/356 · sarpa/clk 2657/1001/929 · sarpa/clp 2656/1119/1012 · sarpa/hk 8250/2267/1924 · sarpa/hp 10334/3466/3098 · sarpa/lk 10358/2180/2479 · sarpa/lp 12121/2861/2269 · sarpa/sDown 28244/0/0 · sarpa/sFire 41801/14449/18680 · sarpa/sFwd 7347/2558/2238 · sarpa/throw 755/734/0 · throw 1029/983/0

**baatar**: chk 16727/6422/6614 · chp 8937/1862/664 · clk 7224/3093/3274 · clp 7332/2293/2353 · hk 20739/6151/6314 · hp 27767/8157/9162 · lk 27314/6716/7573 · lp 35935/10706/10973 · parado 0/0/694 · sDown 30795/9725/10597 · sFire 12683/4057/0 · sFwd 19760/7063/10001 · throw 1351/1316/0
