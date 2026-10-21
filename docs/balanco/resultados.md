# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 75 s em 8 processo(s).
- Versão dos dados/motor: `f6b9952cee5e` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-21.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `957b8416d75bf060`.
Hash só das lutas regulares: `f420ce928e06b304` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `c8d18e0edd93ebd0`.
**DIFERENTE** da rodada anterior (antes `b678f5ecb996d6a8`, agora `957b8416d75bf060`), e a versão dos dados/motor/harness mudou (`0842bb4ccf79` -> `f6b9952cee5e`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | chefao | chefão aminu DIFÍCIL | o jogador vence 10.0% (n=400), fora da meta 13-19% |
| ATENCAO | chefao | chefão centella DIFÍCIL | o jogador vence 25.8% (n=500), fora da meta 12-18% |
| ATENCAO | chefao | chefão nila DIFÍCIL | o jogador vence 16.3% (n=700), fora da meta 9-15% |
| ATENCAO | chefao | chefão baatar DIFÍCIL | o jogador vence 19.0% (n=800), fora da meta 8-14% |
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

## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.

Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.

### Resumo

| Chefão | Desafiantes | Fator `danoRecebido` | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **aminu** | 4 | 0.925 | NORMAL | **29.3%** (117/400) | 25%-34% | 26-30% | sim | 100% | 0% | 40 s | hayato 22% | caio 33% | 0 |
| **aminu** | 4 | 0.925 | DIFÍCIL | **10.0%** (40/400) | 7%-13% | 13-19% | **NÃO** | 100% | 0% | 57 s | caio 7% | min-ji 13% | 0 |
| **centella** | 5 | 0.875 | NORMAL | **26.8%** (134/500) | 23%-31% | 24-28% | sim | 100% | 0% | 41 s | wei-long 19% | hayato 32% | 0 |
| **centella** | 5 | 0.875 | DIFÍCIL | **25.8%** (129/500) | 22%-30% | 12-18% | **NÃO** | 100% | 0% | 59 s | wei-long 18% | aminu 37% | 0 |
| **camille** | 6 | 0.925 | NORMAL | **24.3%** (146/600) | 21%-28% | 22-26% | sim | 100% | 0% | 39 s | min-ji 19% | aminu 34% | 0 |
| **camille** | 6 | 0.925 | DIFÍCIL | **16.3%** (98/600) | 14%-20% | 11-17% | sim | 100% | 0% | 59 s | hayato 6% | aminu 32% | 0 |
| **nila** | 7 | 0.875 | NORMAL | **20.7%** (145/700) | 18%-24% | 19-23% | sim | 100% | 0% | 44 s | wei-long 16% | centella 26% | 0 |
| **nila** | 7 | 0.875 | DIFÍCIL | **16.3%** (114/700) | 14%-19% | 9-15% | **NÃO** | 96% | 4% | 72 s | hayato 12% | aminu 28% | 0 |
| **baatar** | 8 | 0.85 | NORMAL | **18.3%** (146/800) | 16%-21% | 17-21% | sim | 100% | 0% | 42 s | hayato 11% | nila 25% | 0 |
| **baatar** | 8 | 0.85 | DIFÍCIL | **19.0%** (152/800) | 16%-22% | 8-14% | **NÃO** | 98% | 2% | 65 s | min-ji 9% | wei-long 33% | 0 |
| **zenon** | 9 | 0.8 | NORMAL | **16.1%** (145/900) | 14%-19% | 15-19% | sim | 100% | 0% | 42 s | min-ji 12% | aminu 28% | 0 |
| **zenon** | 9 | 0.8 | DIFÍCIL | **11.4%** (103/900) | 10%-14% | 7-13% | sim | 99% | 1% | 64 s | wei-long 6% | aminu 17% | 0 |

### Chefão aminu

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **22.0%** (22/100) | 15%-31% | 40 s | 1.0 | 71% | 71% | 100% | 0% |
| wei-long | NORMAL | **33.0%** (33/100) | 25%-43% | 43 s | 1.0 | 82% | 82% | 100% | 0% |
| min-ji | NORMAL | **29.0%** (29/100) | 21%-39% | 40 s | 1.0 | 81% | 81% | 100% | 0% |
| caio | NORMAL | **33.0%** (33/100) | 25%-43% | 39 s | 1.0 | 78% | 78% | 100% | 0% |
| hayato | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 59 s | 1.0 | 63% | 63% | 100% | 0% |
| wei-long | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 59 s | 1.0 | 65% | 65% | 100% | 0% |
| min-ji | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 56 s | 1.0 | 69% | 69% | 100% | 0% |
| caio | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 54 s | 1.0 | 60% | 60% | 100% | 0% |

### Chefão centella

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **32.0%** (32/100) | 24%-42% | 42 s | 1.0 | 85% | 85% | 100% | 0% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 40 s | 1.0 | 74% | 74% | 100% | 0% |
| min-ji | NORMAL | **25.0%** (25/100) | 18%-34% | 41 s | 1.0 | 79% | 79% | 100% | 0% |
| caio | NORMAL | **28.0%** (28/100) | 20%-37% | 38 s | 1.0 | 79% | 79% | 100% | 0% |
| aminu | NORMAL | **30.0%** (30/100) | 22%-40% | 45 s | 1.0 | 86% | 86% | 100% | 0% |
| hayato | DIFÍCIL | **25.0%** (25/100) | 18%-34% | 60 s | 1.0 | 79% | 79% | 100% | 0% |
| wei-long | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 57 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 55 s | 1.0 | 71% | 71% | 100% | 0% |
| caio | DIFÍCIL | **29.0%** (29/100) | 21%-39% | 58 s | 1.0 | 81% | 81% | 100% | 0% |
| aminu | DIFÍCIL | **37.0%** (37/100) | 28%-47% | 63 s | 1.0 | 87% | 87% | 100% | 0% |

### Chefão camille

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **24.0%** (24/100) | 17%-33% | 39 s | 1.0 | 75% | 75% | 100% | 0% |
| wei-long | NORMAL | **20.0%** (20/100) | 13%-29% | 39 s | 1.0 | 78% | 78% | 100% | 0% |
| min-ji | NORMAL | **19.0%** (19/100) | 13%-28% | 38 s | 1.0 | 77% | 77% | 100% | 0% |
| caio | NORMAL | **25.0%** (25/100) | 18%-34% | 38 s | 1.0 | 77% | 77% | 100% | 0% |
| aminu | NORMAL | **34.0%** (34/100) | 25%-44% | 41 s | 1.0 | 84% | 84% | 100% | 0% |
| centella | NORMAL | **24.0%** (24/100) | 17%-33% | 39 s | 1.0 | 86% | 86% | 100% | 0% |
| hayato | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 60 s | 1.0 | 58% | 58% | 100% | 0% |
| wei-long | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 59 s | 1.0 | 72% | 72% | 100% | 0% |
| min-ji | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 57 s | 1.0 | 69% | 69% | 100% | 0% |
| caio | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 56 s | 1.0 | 65% | 65% | 100% | 0% |
| aminu | DIFÍCIL | **32.0%** (32/100) | 24%-42% | 66 s | 1.0 | 86% | 86% | 100% | 0% |
| centella | DIFÍCIL | **24.0%** (24/100) | 17%-33% | 56 s | 1.0 | 67% | 67% | 100% | 0% |

### Chefão nila

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **20.0%** (20/100) | 13%-29% | 44 s | 1.0 | 80% | 80% | 100% | 0% |
| wei-long | NORMAL | **16.0%** (16/100) | 10%-24% | 46 s | 1.0 | 79% | 79% | 100% | 0% |
| min-ji | NORMAL | **17.0%** (17/100) | 11%-26% | 41 s | 1.0 | 68% | 68% | 100% | 0% |
| caio | NORMAL | **20.0%** (20/100) | 13%-29% | 43 s | 1.0 | 78% | 78% | 100% | 0% |
| aminu | NORMAL | **23.0%** (23/100) | 16%-32% | 46 s | 1.0 | 87% | 87% | 100% | 0% |
| centella | NORMAL | **26.0%** (26/100) | 18%-35% | 44 s | 1.0 | 74% | 74% | 100% | 0% |
| camille | NORMAL | **23.0%** (23/100) | 16%-32% | 45 s | 1.0 | 80% | 80% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 72 s | 1.0 | 67% | 67% | 97% | 3% |
| wei-long | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 72 s | 1.0 | 73% | 73% | 99% | 1% |
| min-ji | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 66 s | 1.0 | 72% | 72% | 98% | 2% |
| caio | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 67 s | 1.0 | 75% | 75% | 98% | 2% |
| aminu | DIFÍCIL | **28.0%** (28/100) | 20%-37% | 81 s | 1.0 | 87% | 87% | 88% | 12% |
| centella | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 66 s | 1.0 | 64% | 64% | 99% | 1% |
| camille | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 78 s | 1.0 | 86% | 86% | 96% | 4% |

### Chefão baatar

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **11.0%** (11/100) | 6%-19% | 40 s | 1.0 | 76% | 76% | 100% | 0% |
| wei-long | NORMAL | **22.0%** (22/100) | 15%-31% | 41 s | 1.0 | 69% | 69% | 100% | 0% |
| min-ji | NORMAL | **12.0%** (12/100) | 7%-20% | 39 s | 1.0 | 72% | 72% | 100% | 0% |
| caio | NORMAL | **23.0%** (23/100) | 16%-32% | 38 s | 1.0 | 76% | 76% | 100% | 0% |
| aminu | NORMAL | **19.0%** (19/100) | 13%-28% | 45 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | NORMAL | **16.0%** (16/100) | 10%-24% | 42 s | 1.0 | 82% | 82% | 100% | 0% |
| camille | NORMAL | **18.0%** (18/100) | 12%-27% | 41 s | 1.0 | 75% | 75% | 100% | 0% |
| nila | NORMAL | **25.0%** (25/100) | 18%-34% | 47 s | 1.0 | 81% | 81% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 64 s | 1.0 | 60% | 60% | 100% | 0% |
| wei-long | DIFÍCIL | **33.0%** (33/100) | 25%-43% | 62 s | 1.0 | 78% | 78% | 99% | 1% |
| min-ji | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 58 s | 1.0 | 55% | 55% | 100% | 0% |
| caio | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 60 s | 1.0 | 80% | 80% | 99% | 1% |
| aminu | DIFÍCIL | **27.0%** (27/100) | 19%-36% | 71 s | 1.0 | 71% | 71% | 97% | 3% |
| centella | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 58 s | 1.0 | 60% | 60% | 100% | 0% |
| camille | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 67 s | 1.0 | 73% | 73% | 99% | 1% |
| nila | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 80 s | 1.0 | 78% | 78% | 90% | 10% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **15.0%** (15/100) | 9%-23% | 41 s | 1.0 | 68% | 68% | 100% | 0% |
| wei-long | NORMAL | **15.0%** (15/100) | 9%-23% | 43 s | 1.0 | 74% | 74% | 100% | 0% |
| min-ji | NORMAL | **12.0%** (12/100) | 7%-20% | 39 s | 1.0 | 69% | 69% | 100% | 0% |
| caio | NORMAL | **18.0%** (18/100) | 12%-27% | 39 s | 1.0 | 67% | 67% | 100% | 0% |
| aminu | NORMAL | **28.0%** (28/100) | 20%-37% | 43 s | 1.0 | 80% | 80% | 100% | 0% |
| centella | NORMAL | **12.0%** (12/100) | 7%-20% | 40 s | 1.0 | 63% | 63% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 41 s | 1.0 | 74% | 74% | 100% | 0% |
| nila | NORMAL | **14.0%** (14/100) | 9%-22% | 46 s | 1.0 | 80% | 80% | 100% | 0% |
| baatar | NORMAL | **14.0%** (14/100) | 9%-22% | 44 s | 1.0 | 81% | 81% | 100% | 0% |
| hayato | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 63 s | 1.0 | 70% | 70% | 100% | 0% |
| wei-long | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 60 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 64 s | 1.0 | 68% | 67% | 100% | 0% |
| caio | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 57 s | 1.0 | 70% | 70% | 100% | 0% |
| aminu | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 66 s | 1.0 | 82% | 82% | 100% | 0% |
| centella | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 59 s | 1.0 | 57% | 57% | 100% | 0% |
| camille | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 68 s | 1.0 | 68% | 67% | 98% | 2% |
| nila | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 75 s | 1.0 | 65% | 64% | 92% | 8% |
| baatar | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 64 s | 1.0 | 60% | 60% | 99% | 1% |

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
