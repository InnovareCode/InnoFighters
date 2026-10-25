# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + ENTRADA NO HITSTOP (motorV2.entradaNoHitstop) + FILMES ligados (motorV2.filmes) + COMBOS PRÓPRIOS ligados (motorV2.combos) + RITMO: intervalos+filmeRestrito+super+cadeia+cpu**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 81 s em 8 processo(s).
- Versão dos dados/motor: `5ddb74decbdb` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-25.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `ba5a6ed485dd566a`.
Hash só das lutas regulares: `45e8054f7c5431c6` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `8545d5cae5fdb7ac`.
**DIFERENTE** da rodada anterior (antes `2e982120b752d9ca`, agora `ba5a6ed485dd566a`), e a versão dos dados/motor/harness mudou (`cf6c3f6f38cd` -> `5ddb74decbdb`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | chefao | chefão nila DIFÍCIL | só 89.4% das lutas terminam por KO (meta >= 90%) |
| INFO | chefao | baatar x chefão zenon DIFÍCIL | nunca vence o chefão |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1909 | **53.0%** | 51%-55% | 55.8% | 50.3% | 56.5% | 49.6% | 109 s | 0.1% | 214 | 1 |
| wei-long | 3600 | 1855 | **51.5%** | 50%-53% | 54.6% | 48.4% | 47.2% | 55.8% | 105 s | 0.0% | 214 | 1 |
| min-ji | 3600 | 1723 | **47.9%** | 46%-49% | 51.0% | 44.7% | 49.4% | 46.3% | 111 s | 0.1% | 211 | 0 |
| caio | 3600 | 1709 | **47.5%** | 46%-49% | 50.4% | 44.5% | 53.7% | 41.2% | 98 s | 0.0% | 211 | 1 |
| aminu | 3600 | 2018 | **56.1%** | 54%-58% | 59.4% | 52.7% | 44.1% | 68.0% | 97 s | 0.0% | 213 | 3 |
| centella | 3600 | 1761 | **48.9%** | 47%-51% | 52.4% | 45.4% | 45.0% | 52.8% | 98 s | 0.0% | 213 | 1 |
| camille | 3600 | 1840 | **51.1%** | 49%-53% | 55.0% | 47.2% | 50.9% | 51.3% | 106 s | 0.0% | 214 | 0 |
| nila | 3600 | 1803 | **50.1%** | 48%-52% | 53.5% | 46.7% | 50.6% | 49.6% | 111 s | 0.1% | 214 | 0 |
| baatar | 3600 | 1681 | **46.7%** | 45%-48% | 48.7% | 44.7% | 50.1% | 43.3% | 106 s | 0.1% | 214 | 0 |
| zenon | 3600 | 1701 | **47.3%** | 46%-49% | 50.8% | 43.7% | 52.4% | 42.1% | 98 s | 0.1% | 210 | 0 |

Vantagem de lado: o P1 vence 53.2% das lutas (n=18000). Duração média 104 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 4 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 41 | 56 | 61 | 37 | 57 | 59 | 57 | 55 | 55 |
| **wei-long** | 60 | · | 50 | 53 | 44 | 56 | 44 | 48 | 56 | 55 |
| **min-ji** | 45 | 50 | · | 51 | 36 | 56 | 49 | 51 | 48 | 45 |
| **caio** | 39 | 48 | 49 | · | 47 | 51 | 43 | 49 | 50 | 51 |
| **aminu** | 63 | 56 | 64 | 53 | · | 43 | 57 | 50 | 56 | 63 |
| **centella** | 43 | 44 | 45 | 49 | 57 | · | 53 | 51 | 49 | 51 |
| **camille** | 41 | 56 | 51 | 57 | 43 | 47 | · | 53 | 62 | 51 |
| **nila** | 43 | 52 | 49 | 51 | 50 | 49 | 48 | · | 52 | 58 |
| **baatar** | 45 | 45 | 52 | 50 | 44 | 52 | 38 | 48 | · | 47 |
| **zenon** | 46 | 45 | 55 | 49 | 38 | 50 | 49 | 42 | 53 | · |

## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.

Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.

### Resumo

| Chefão | Desafiantes | Fator `danoRecebido` (do nível) | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **aminu** | 4 | 0.83 | NORMAL | **26.8%** (107/400) | 23%-31% | 26-30% | sim | 100% | 0% | 42 s | min-ji 16% | caio 32% | 0 |
| **aminu** | 4 | 0.91 | DIFÍCIL | **17.5%** (70/400) | 14%-22% | 13-19% | sim | 100% | 0% | 53 s | min-ji 6% | wei-long 26% | 0 |
| **centella** | 5 | 0.93 | NORMAL | **26.0%** (130/500) | 22%-30% | 24-28% | sim | 100% | 0% | 41 s | aminu 18% | min-ji 30% | 0 |
| **centella** | 5 | 0.82 | DIFÍCIL | **15.8%** (79/500) | 13%-19% | 12-18% | sim | 99% | 1% | 61 s | caio 6% | aminu 23% | 0 |
| **camille** | 6 | 0.81 | NORMAL | **24.0%** (144/600) | 21%-28% | 22-26% | sim | 100% | 0% | 40 s | min-ji 15% | centella 31% | 0 |
| **camille** | 6 | 0.69 | DIFÍCIL | **14.8%** (89/600) | 12%-18% | 11-17% | sim | 97% | 3% | 68 s | min-ji 3% | aminu 40% | 0 |
| **nila** | 7 | 0.84 | NORMAL | **20.3%** (142/700) | 17%-23% | 19-23% | sim | 100% | 0% | 43 s | aminu 10% | centella 27% | 0 |
| **nila** | 7 | 0.71 | DIFÍCIL | **11.7%** (82/700) | 10%-14% | 9-15% | sim (critério fora) | 89% | 11% | 75 s | min-ji 5% | aminu 24% | 0 |
| **baatar** | 8 | 0.87 | NORMAL | **18.9%** (151/800) | 16%-22% | 17-21% | sim | 100% | 0% | 41 s | min-ji 11% | nila 23% | 0 |
| **baatar** | 8 | 0.7 | DIFÍCIL | **12.9%** (103/800) | 11%-15% | 8-14% | sim | 96% | 4% | 70 s | min-ji 5% | aminu 24% | 0 |
| **zenon** | 9 | 0.79 | NORMAL | **16.2%** (146/900) | 14%-19% | 15-19% | sim | 100% | 0% | 41 s | caio 11% | hayato 22% | 0 |
| **zenon** | 9 | 0.72 | DIFÍCIL | **10.7%** (96/900) | 9%-13% | 7-13% | sim | 97% | 3% | 64 s | baatar 0% | aminu 29% | 0 |

### Chefão aminu

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **29.0%** (29/100) | 21%-39% | 41 s | 1.0 | 81% | 81% | 100% | 0% |
| wei-long | NORMAL | **30.0%** (30/100) | 22%-40% | 43 s | 1.0 | 83% | 82% | 100% | 0% |
| min-ji | NORMAL | **16.0%** (16/100) | 10%-24% | 43 s | 1.0 | 77% | 77% | 100% | 0% |
| caio | NORMAL | **32.0%** (32/100) | 24%-42% | 39 s | 1.0 | 84% | 84% | 100% | 0% |
| hayato | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 54 s | 1.0 | 63% | 63% | 100% | 0% |
| wei-long | DIFÍCIL | **26.0%** (26/100) | 18%-35% | 54 s | 1.0 | 72% | 72% | 100% | 0% |
| min-ji | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 58 s | 1.0 | 58% | 58% | 99% | 1% |
| caio | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 48 s | 1.0 | 65% | 65% | 100% | 0% |

### Chefão centella

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **28.0%** (28/100) | 20%-37% | 41 s | 1.0 | 80% | 80% | 100% | 0% |
| wei-long | NORMAL | **28.0%** (28/100) | 20%-37% | 42 s | 1.0 | 84% | 84% | 100% | 0% |
| min-ji | NORMAL | **30.0%** (30/100) | 22%-40% | 43 s | 1.0 | 83% | 83% | 100% | 0% |
| caio | NORMAL | **26.0%** (26/100) | 18%-35% | 39 s | 1.0 | 85% | 85% | 100% | 0% |
| aminu | NORMAL | **18.0%** (18/100) | 12%-27% | 39 s | 1.0 | 74% | 74% | 100% | 0% |
| hayato | DIFÍCIL | **19.0%** (19/100) | 13%-28% | 62 s | 1.0 | 71% | 71% | 100% | 0% |
| wei-long | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 60 s | 1.0 | 70% | 70% | 100% | 0% |
| min-ji | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 68 s | 1.0 | 67% | 67% | 96% | 4% |
| caio | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 56 s | 1.0 | 71% | 71% | 99% | 1% |
| aminu | DIFÍCIL | **23.0%** (23/100) | 16%-32% | 59 s | 1.0 | 73% | 73% | 100% | 0% |

### Chefão camille

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 81% | 81% | 100% | 0% |
| wei-long | NORMAL | **27.0%** (27/100) | 19%-36% | 42 s | 1.0 | 82% | 82% | 100% | 0% |
| min-ji | NORMAL | **15.0%** (15/100) | 9%-23% | 43 s | 1.0 | 78% | 78% | 100% | 0% |
| caio | NORMAL | **23.0%** (23/100) | 16%-32% | 37 s | 1.0 | 76% | 76% | 100% | 0% |
| aminu | NORMAL | **23.0%** (23/100) | 16%-32% | 40 s | 1.0 | 83% | 83% | 100% | 0% |
| centella | NORMAL | **31.0%** (31/100) | 23%-41% | 40 s | 1.0 | 88% | 88% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 76 s | 1.0 | 65% | 65% | 95% | 5% |
| wei-long | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 70 s | 1.0 | 67% | 67% | 97% | 3% |
| min-ji | DIFÍCIL | **3.0%** (3/100) | 1%-8% | 72 s | 1.0 | 55% | 54% | 96% | 4% |
| caio | DIFÍCIL | **3.0%** (3/100) | 1%-8% | 62 s | 1.0 | 53% | 53% | 98% | 2% |
| aminu | DIFÍCIL | **40.0%** (40/100) | 31%-50% | 65 s | 1.0 | 91% | 91% | 99% | 1% |
| centella | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 65 s | 1.0 | 72% | 72% | 99% | 1% |

### Chefão nila

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 43 s | 1.0 | 79% | 79% | 100% | 0% |
| wei-long | NORMAL | **21.0%** (21/100) | 14%-30% | 46 s | 1.0 | 77% | 77% | 100% | 0% |
| min-ji | NORMAL | **12.0%** (12/100) | 7%-20% | 44 s | 1.0 | 79% | 79% | 100% | 0% |
| caio | NORMAL | **21.0%** (21/100) | 14%-30% | 41 s | 1.0 | 79% | 79% | 100% | 0% |
| aminu | NORMAL | **10.0%** (10/100) | 6%-17% | 42 s | 1.0 | 67% | 67% | 100% | 0% |
| centella | NORMAL | **27.0%** (27/100) | 19%-36% | 43 s | 1.0 | 81% | 81% | 100% | 0% |
| camille | NORMAL | **26.0%** (26/100) | 18%-35% | 45 s | 1.0 | 83% | 83% | 100% | 0% |
| hayato | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 76 s | 1.0 | 69% | 69% | 89% | 11% |
| wei-long | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 75 s | 1.0 | 63% | 63% | 89% | 11% |
| min-ji | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 77 s | 1.0 | 60% | 60% | 87% | 13% |
| caio | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 70 s | 1.0 | 62% | 62% | 94% | 6% |
| aminu | DIFÍCIL | **24.0%** (24/100) | 17%-33% | 76 s | 1.0 | 78% | 78% | 90% | 10% |
| centella | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 68 s | 1.0 | 60% | 60% | 97% | 3% |
| camille | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 84 s | 1.0 | 66% | 66% | 80% | 20% |

### Chefão baatar

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **17.0%** (17/100) | 11%-26% | 41 s | 1.0 | 79% | 79% | 100% | 0% |
| wei-long | NORMAL | **21.0%** (21/100) | 14%-30% | 42 s | 1.0 | 87% | 87% | 100% | 0% |
| min-ji | NORMAL | **11.0%** (11/100) | 6%-19% | 41 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **19.0%** (19/100) | 13%-28% | 39 s | 1.0 | 77% | 77% | 100% | 0% |
| aminu | NORMAL | **21.0%** (21/100) | 14%-30% | 40 s | 1.0 | 72% | 72% | 100% | 0% |
| centella | NORMAL | **22.0%** (22/100) | 15%-31% | 39 s | 1.0 | 78% | 78% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 41 s | 1.0 | 71% | 71% | 100% | 0% |
| nila | NORMAL | **23.0%** (23/100) | 16%-32% | 43 s | 1.0 | 80% | 80% | 100% | 0% |
| hayato | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 72 s | 1.0 | 75% | 75% | 96% | 4% |
| wei-long | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 70 s | 1.0 | 68% | 68% | 99% | 1% |
| min-ji | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 69 s | 1.0 | 48% | 48% | 94% | 6% |
| caio | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 60 s | 1.0 | 50% | 50% | 97% | 3% |
| aminu | DIFÍCIL | **24.0%** (24/100) | 17%-33% | 70 s | 1.0 | 80% | 80% | 100% | 0% |
| centella | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 64 s | 1.0 | 65% | 65% | 98% | 2% |
| camille | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 78 s | 1.0 | 68% | 68% | 93% | 7% |
| nila | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 79 s | 1.0 | 73% | 73% | 89% | 11% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **22.0%** (22/100) | 15%-31% | 41 s | 1.0 | 71% | 71% | 100% | 0% |
| wei-long | NORMAL | **12.0%** (12/100) | 7%-20% | 42 s | 1.0 | 75% | 75% | 100% | 0% |
| min-ji | NORMAL | **13.0%** (13/100) | 8%-21% | 44 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **11.0%** (11/100) | 6%-19% | 38 s | 1.0 | 70% | 70% | 100% | 0% |
| aminu | NORMAL | **20.0%** (20/100) | 13%-29% | 40 s | 1.0 | 80% | 80% | 100% | 0% |
| centella | NORMAL | **12.0%** (12/100) | 7%-20% | 38 s | 1.0 | 65% | 64% | 100% | 0% |
| camille | NORMAL | **19.0%** (19/100) | 13%-28% | 41 s | 1.0 | 76% | 76% | 100% | 0% |
| nila | NORMAL | **20.0%** (20/100) | 13%-29% | 43 s | 1.0 | 70% | 70% | 100% | 0% |
| baatar | NORMAL | **17.0%** (17/100) | 11%-26% | 39 s | 1.0 | 61% | 61% | 100% | 0% |
| hayato | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 63 s | 1.0 | 66% | 66% | 99% | 1% |
| wei-long | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 64 s | 1.0 | 67% | 67% | 99% | 1% |
| min-ji | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 67 s | 1.0 | 56% | 56% | 96% | 4% |
| caio | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 57 s | 1.0 | 60% | 60% | 99% | 1% |
| aminu | DIFÍCIL | **29.0%** (29/100) | 21%-39% | 62 s | 1.0 | 83% | 83% | 99% | 1% |
| centella | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 59 s | 1.0 | 62% | 62% | 100% | 0% |
| camille | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 75 s | 1.0 | 64% | 63% | 93% | 7% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 74 s | 1.0 | 65% | 65% | 93% | 7% |
| baatar | DIFÍCIL | **0.0%** (0/100) | 0%-4% | 60 s | 1.0 | 38% | 38% | 99% | 1% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 34997 seguradas em 40745 usos) | 56.1% / 8.8% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (8490 em 18689) | 45.4% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (10282 acertos; faixas <10/10-25/25-50/≥50%: 3/2/900/9377) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 18.70 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 4856 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 8.81 / 2.88 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: _lag 0/2292/0 · chk 20954/6422/4974 · chp 13782/2707/585 · clk 10963/2245/2206 · clp 21238/12201/6299 · hk 22183/6556/3255 · hp 36895/11468/6635 · lk 43530/9190/7329 · lp 41947/8684/6157 · parado 0/0/949 · sDown 11050/12659/744 · sFire 9373/4614/2346 · sFwd 16157/7288/3802 · throw 1081/1050/0

**wei-long**: chk 19447/7139/6032 · chp 12504/2652/527 · clk 9851/3934/5037 · clp 13869/6236/5180 · hk 20465/5796/3998 · hp 40086/15421/9726 · lk 35676/4344/2640 · lp 41189/10776/9654 · parado 0/0/1201 · projétil 0/11390/0 · sDown 7012/2771/188 · sFire 11433/6003/2127 · sFwd 9128/4729/2256 · throw 880/845/0

**min-ji**: _lag 0/5090/0 · chk 21086/6251/4497 · chp 14999/2806/806 · clk 12265/2433/2269 · clp 12304/5146/5090 · hk 26440/9349/3274 · hp 38079/16229/11352 · lk 59585/20941/15181 · lp 45426/6284/4303 · parado 0/0/1147 · sDown 13801/26973/1419 · sFire 15271/7477/4918 · sFwd 16002/7342/4651 · throw 1356/1295/0

**caio**: _lag 0/4194/0 · chk 20153/9045/5546 · chp 11589/2158/632 · clk 19129/10273/7110 · clp 9963/3791/3825 · hk 23150/8973/5409 · hp 30367/6983/3188 · lk 39675/13773/16752 · lp 36428/4497/3029 · parado 0/0/1057 · sDown 5156/2818/1232 · sFire 9698/5263/2173 · sFwd 20451/21461/4491 · throw 1057/1015/0

**aminu**: chk 15625/6103/4936 · chp 10212/2333/427 · clk 7614/3176/3901 · clp 7501/3283/3754 · hk 20020/8046/4113 · hp 31302/14097/6316 · lk 31694/8155/9069 · lp 31589/10339/9364 · parado 0/0/704 · sDown 3219/1380/117 · sFire 40745/13415/2432 · sFwd 10173/4852/1162 · throw 630/605/0

**centella**: _lag 0/817/0 · chk 14916/5179/4344 · chp 10270/2034/677 · clk 12591/5316/2578 · clp 15099/6634/5628 · hk 19489/7096/2723 · hp 28671/9044/6205 · lk 35462/11371/11757 · lp 33348/7021/5190 · parado 0/0/1020 · sDown 1074/645/0 · sFire 24587/22793/6885 · sFwd 17509/10302/817 · throw 964/920/0

**camille**: chk 19531/7084/5739 · chp 12338/2576/476 · clk 17262/7767/7691 · clp 9480/3907/4273 · hk 22293/7825/4144 · hp 31385/10272/7790 · lk 35397/8129/10140 · lp 36026/8100/5879 · sDown 51619/23907/16669 · sFire 18689/1/0 · sFwd 10622/1395/93 · sResp 8490/8436/2 · throw 817/770/0

**nila**: _lag 0/6/0 · chk 11659/4452/3741 · chp 8519/1492/318 · clk 6831/2213/2613 · clp 12356/5671/5238 · hk 10316/2292/2171 · hp 24907/8145/5936 · lk 23169/5418/6695 · lp 26579/6086/4712 · parado 0/0/1005 · sDown 35385/0/0 · sFire 10867/9897/2180 · sFwd 9855/4265/1461 · sarpa/_lag 0/234/0 · sarpa/chk 6743/1399/1107 · sarpa/chp 4348/984/285 · sarpa/clk 4427/1810/1133 · sarpa/clp 5328/2920/1422 · sarpa/hk 6201/1335/932 · sarpa/hp 11076/3762/2390 · sarpa/lk 17660/3777/4148 · sarpa/lp 12506/2845/2280 · sarpa/sDown 33465/0/0 · sarpa/sFire 43566/19858/15220 · sarpa/sFwd 5491/5118/1426 · sarpa/throw 509/489/0 · throw 518/496/0

**baatar**: _lag 0/28/0 · chk 19432/6956/5905 · chp 11740/1999/477 · clk 19780/8204/7987 · clp 9860/2907/3282 · hk 21935/7575/5038 · hp 31457/9564/7991 · lk 35595/8240/10116 · lp 38171/12040/12809 · parado 0/0/899 · sDown 15039/8258/4017 · sFire 10128/6031/0 · sFwd 22991/11048/9651 · throw 786/752/0

**zenon**: chk 17623/7393/6025 · chp 10911/2294/488 · clk 8399/3626/4235 · clp 16101/7855/7197 · hk 20039/7576/5345 · hp 27743/8790/7088 · lk 31650/2678/1256 · lp 33502/11464/11899 · parado 0/0/508 · sDown 1235/1028/29 · sFire 15177/14227/2623 · sFwd 37472/16003/11397 · throw 740/716/0
