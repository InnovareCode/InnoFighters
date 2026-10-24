# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + ENTRADA NO HITSTOP (motorV2.entradaNoHitstop) + FILMES ligados (motorV2.filmes) + COMBOS PRÓPRIOS ligados (motorV2.combos)**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 68 s em 8 processo(s).
- Versão dos dados/motor: `0a39396db39d` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-24.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `79a6e9e3af0c7847`.
Hash só das lutas regulares: `05bf1b64b46008a0` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `edb33ac1bc92fe9c`.
**DIFERENTE** da rodada anterior (antes `e6d4e6b0e58275b4`, agora `79a6e9e3af0c7847`), e a versão dos dados/motor/harness mudou (`6c85cd3573e0` -> `0a39396db39d`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | nunca-acerta | camille sFwd | usado 8646x e só 340 contato(s) (3.9%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1788 | **49.7%** | 48%-51% | 51.3% | 48.0% | 52.7% | 46.7% | 95 s | 0.0% | 205 | 1 |
| wei-long | 3600 | 1645 | **45.7%** | 44%-47% | 48.3% | 43.1% | 46.3% | 45.1% | 94 s | 0.0% | 202 | 0 |
| min-ji | 3600 | 1614 | **44.8%** | 43%-46% | 48.3% | 41.4% | 47.2% | 42.5% | 92 s | 0.0% | 203 | 1 |
| caio | 3600 | 1818 | **50.5%** | 49%-52% | 52.7% | 48.3% | 51.8% | 49.2% | 88 s | 0.0% | 208 | 4 |
| aminu | 3600 | 1949 | **54.1%** | 53%-56% | 55.8% | 52.5% | 41.3% | 67.0% | 90 s | 0.0% | 207 | 4 |
| centella | 3600 | 1746 | **48.5%** | 47%-50% | 51.6% | 45.4% | 48.9% | 48.1% | 90 s | 0.0% | 205 | 3 |
| camille | 3600 | 1923 | **53.4%** | 52%-55% | 57.7% | 49.1% | 49.8% | 57.1% | 92 s | 0.0% | 211 | 3 |
| nila | 3600 | 1816 | **50.4%** | 49%-52% | 51.8% | 49.1% | 54.3% | 46.6% | 100 s | 0.0% | 207 | 1 |
| baatar | 3600 | 2019 | **56.1%** | 54%-58% | 55.9% | 56.2% | 59.5% | 52.7% | 92 s | 0.0% | 213 | 2 |
| zenon | 3600 | 1682 | **46.7%** | 45%-48% | 49.6% | 43.9% | 48.2% | 45.2% | 96 s | 0.0% | 205 | 1 |

Vantagem de lado: o P1 vence 52.3% das lutas (n=18000). Duração média 93 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 13 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 54 | 56 | 52 | 37 | 57 | 46 | 50 | 45 | 50 |
| **wei-long** | 46 | · | 60 | 49 | 43 | 50 | 39 | 41 | 38 | 46 |
| **min-ji** | 44 | 40 | · | 46 | 41 | 56 | 45 | 48 | 37 | 48 |
| **caio** | 48 | 51 | 54 | · | 49 | 49 | 48 | 54 | 47 | 55 |
| **aminu** | 63 | 57 | 59 | 51 | · | 50 | 52 | 52 | 44 | 59 |
| **centella** | 43 | 50 | 44 | 51 | 50 | · | 52 | 52 | 48 | 47 |
| **camille** | 54 | 61 | 55 | 52 | 48 | 49 | · | 55 | 49 | 58 |
| **nila** | 50 | 59 | 53 | 46 | 48 | 49 | 45 | · | 48 | 58 |
| **baatar** | 55 | 62 | 64 | 53 | 56 | 52 | 51 | 52 | · | 60 |
| **zenon** | 50 | 55 | 53 | 46 | 41 | 53 | 42 | 42 | 41 | · |

## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.

Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.

### Resumo

| Chefão | Desafiantes | Fator `danoRecebido` (do nível) | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **aminu** | 4 | 0.85 | NORMAL | **29.8%** (119/400) | 25%-34% | 26-30% | sim | 100% | 0% | 38 s | hayato 23% | min-ji 37% | 0 |
| **aminu** | 4 | 0.92 | DIFÍCIL | **15.8%** (63/400) | 13%-20% | 13-19% | sim | 100% | 0% | 46 s | min-ji 9% | caio 23% | 0 |
| **centella** | 5 | 0.86 | NORMAL | **25.8%** (129/500) | 22%-30% | 24-28% | sim | 100% | 0% | 38 s | min-ji 21% | hayato 32% | 0 |
| **centella** | 5 | 0.74 | DIFÍCIL | **16.8%** (84/500) | 14%-20% | 12-18% | sim | 100% | 0% | 54 s | wei-long 10% | aminu 26% | 0 |
| **camille** | 6 | 0.89 | NORMAL | **25.2%** (151/600) | 22%-29% | 22-26% | sim | 100% | 0% | 36 s | wei-long 17% | aminu 36% | 0 |
| **camille** | 6 | 0.82 | DIFÍCIL | **12.8%** (77/600) | 10%-16% | 11-17% | sim | 100% | 0% | 52 s | hayato 5% | aminu 30% | 0 |
| **nila** | 7 | 0.84 | NORMAL | **22.1%** (155/700) | 19%-25% | 19-23% | sim | 100% | 0% | 39 s | hayato 18% | centella 27% | 0 |
| **nila** | 7 | 0.72 | DIFÍCIL | **13.7%** (96/700) | 11%-16% | 9-15% | sim | 99% | 1% | 64 s | min-ji 6% | aminu 27% | 0 |
| **baatar** | 8 | 0.82 | NORMAL | **18.1%** (145/800) | 16%-21% | 17-21% | sim | 100% | 0% | 37 s | hayato 14% | nila 25% | 0 |
| **baatar** | 8 | 0.75 | DIFÍCIL | **11.5%** (92/800) | 9%-14% | 8-14% | sim | 99% | 1% | 58 s | nila 7% | aminu 24% | 0 |
| **zenon** | 9 | 0.75 | NORMAL | **18.2%** (164/900) | 16%-21% | 15-19% | sim | 100% | 0% | 39 s | hayato 12% | aminu 26% | 0 |
| **zenon** | 9 | 0.73 | DIFÍCIL | **9.7%** (87/900) | 8%-12% | 7-13% | sim | 100% | 0% | 59 s | min-ji 2% | aminu 23% | 0 |

### Chefão aminu

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **23.0%** (23/100) | 16%-32% | 38 s | 1.0 | 74% | 74% | 100% | 0% |
| wei-long | NORMAL | **25.0%** (25/100) | 18%-34% | 39 s | 1.0 | 75% | 75% | 100% | 0% |
| min-ji | NORMAL | **37.0%** (37/100) | 28%-47% | 38 s | 1.0 | 82% | 82% | 100% | 0% |
| caio | NORMAL | **34.0%** (34/100) | 25%-44% | 37 s | 1.0 | 84% | 84% | 100% | 0% |
| hayato | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 47 s | 1.0 | 53% | 53% | 100% | 0% |
| wei-long | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 47 s | 1.0 | 60% | 60% | 100% | 0% |
| min-ji | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 46 s | 1.0 | 52% | 52% | 100% | 0% |
| caio | DIFÍCIL | **23.0%** (23/100) | 16%-32% | 46 s | 1.0 | 65% | 65% | 100% | 0% |

### Chefão centella

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **32.0%** (32/100) | 24%-42% | 39 s | 1.0 | 81% | 81% | 100% | 0% |
| wei-long | NORMAL | **28.0%** (28/100) | 20%-37% | 38 s | 1.0 | 78% | 78% | 100% | 0% |
| min-ji | NORMAL | **21.0%** (21/100) | 14%-30% | 38 s | 1.0 | 79% | 78% | 100% | 0% |
| caio | NORMAL | **23.0%** (23/100) | 16%-32% | 36 s | 1.0 | 74% | 74% | 100% | 0% |
| aminu | NORMAL | **25.0%** (25/100) | 18%-34% | 38 s | 1.0 | 73% | 73% | 100% | 0% |
| hayato | DIFÍCIL | **25.0%** (25/100) | 18%-34% | 59 s | 1.0 | 72% | 72% | 100% | 0% |
| wei-long | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 53 s | 1.0 | 58% | 58% | 100% | 0% |
| min-ji | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 54 s | 1.0 | 65% | 64% | 100% | 0% |
| caio | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 51 s | 1.0 | 47% | 47% | 100% | 0% |
| aminu | DIFÍCIL | **26.0%** (26/100) | 18%-35% | 55 s | 1.0 | 71% | 71% | 100% | 0% |

### Chefão camille

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 39 s | 1.0 | 84% | 84% | 100% | 0% |
| wei-long | NORMAL | **17.0%** (17/100) | 11%-26% | 35 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | NORMAL | **24.0%** (24/100) | 17%-33% | 37 s | 1.0 | 74% | 74% | 100% | 0% |
| caio | NORMAL | **20.0%** (20/100) | 13%-29% | 36 s | 1.0 | 75% | 75% | 100% | 0% |
| aminu | NORMAL | **36.0%** (36/100) | 27%-46% | 37 s | 1.0 | 80% | 80% | 100% | 0% |
| centella | NORMAL | **29.0%** (29/100) | 21%-39% | 36 s | 1.0 | 87% | 87% | 100% | 0% |
| hayato | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 57 s | 1.0 | 51% | 51% | 100% | 0% |
| wei-long | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 53 s | 1.0 | 65% | 65% | 100% | 0% |
| min-ji | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 52 s | 1.0 | 63% | 63% | 100% | 0% |
| caio | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 47 s | 1.0 | 46% | 46% | 100% | 0% |
| aminu | DIFÍCIL | **30.0%** (30/100) | 22%-40% | 52 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 52 s | 1.0 | 60% | 60% | 100% | 0% |

### Chefão nila

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **18.0%** (18/100) | 12%-27% | 39 s | 1.0 | 76% | 76% | 100% | 0% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 41 s | 1.0 | 84% | 84% | 100% | 0% |
| min-ji | NORMAL | **20.0%** (20/100) | 13%-29% | 37 s | 1.0 | 67% | 67% | 100% | 0% |
| caio | NORMAL | **27.0%** (27/100) | 19%-36% | 38 s | 1.0 | 79% | 79% | 100% | 0% |
| aminu | NORMAL | **18.0%** (18/100) | 12%-27% | 39 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | NORMAL | **27.0%** (27/100) | 19%-36% | 41 s | 1.0 | 86% | 86% | 100% | 0% |
| camille | NORMAL | **26.0%** (26/100) | 18%-35% | 39 s | 1.0 | 77% | 77% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 68 s | 1.0 | 61% | 61% | 99% | 1% |
| wei-long | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 64 s | 1.0 | 60% | 59% | 97% | 3% |
| min-ji | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 62 s | 1.0 | 52% | 52% | 99% | 1% |
| caio | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 60 s | 1.0 | 58% | 58% | 100% | 0% |
| aminu | DIFÍCIL | **27.0%** (27/100) | 19%-36% | 67 s | 1.0 | 74% | 74% | 99% | 1% |
| centella | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 61 s | 1.0 | 64% | 64% | 99% | 1% |
| camille | DIFÍCIL | **19.0%** (19/100) | 13%-28% | 68 s | 1.0 | 71% | 71% | 99% | 1% |

### Chefão baatar

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **14.0%** (14/100) | 9%-22% | 38 s | 1.0 | 65% | 65% | 100% | 0% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 37 s | 1.0 | 72% | 72% | 100% | 0% |
| min-ji | NORMAL | **15.0%** (15/100) | 9%-23% | 36 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **19.0%** (19/100) | 13%-28% | 35 s | 1.0 | 70% | 70% | 100% | 0% |
| aminu | NORMAL | **18.0%** (18/100) | 12%-27% | 37 s | 1.0 | 75% | 75% | 100% | 0% |
| centella | NORMAL | **18.0%** (18/100) | 12%-27% | 36 s | 1.0 | 65% | 65% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 35 s | 1.0 | 69% | 69% | 100% | 0% |
| nila | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 73% | 73% | 100% | 0% |
| hayato | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 59 s | 1.0 | 60% | 60% | 100% | 0% |
| wei-long | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 58 s | 1.0 | 51% | 51% | 100% | 0% |
| min-ji | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 53 s | 1.0 | 53% | 53% | 99% | 1% |
| caio | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 52 s | 1.0 | 53% | 53% | 100% | 0% |
| aminu | DIFÍCIL | **24.0%** (24/100) | 17%-33% | 59 s | 1.0 | 76% | 76% | 100% | 0% |
| centella | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 53 s | 1.0 | 69% | 69% | 100% | 0% |
| camille | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 58 s | 1.0 | 68% | 68% | 100% | 0% |
| nila | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 73 s | 1.0 | 57% | 57% | 95% | 5% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **12.0%** (12/100) | 7%-20% | 39 s | 1.0 | 63% | 63% | 100% | 0% |
| wei-long | NORMAL | **21.0%** (21/100) | 14%-30% | 40 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | NORMAL | **16.0%** (16/100) | 10%-24% | 39 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **18.0%** (18/100) | 12%-27% | 37 s | 1.0 | 59% | 59% | 100% | 0% |
| aminu | NORMAL | **26.0%** (26/100) | 18%-35% | 40 s | 1.0 | 72% | 72% | 100% | 0% |
| centella | NORMAL | **12.0%** (12/100) | 7%-20% | 37 s | 1.0 | 63% | 63% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 38 s | 1.0 | 69% | 69% | 100% | 0% |
| nila | NORMAL | **21.0%** (21/100) | 14%-30% | 42 s | 1.0 | 74% | 74% | 100% | 0% |
| baatar | NORMAL | **21.0%** (21/100) | 14%-30% | 39 s | 1.0 | 74% | 74% | 100% | 0% |
| hayato | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 62 s | 1.0 | 64% | 64% | 100% | 0% |
| wei-long | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 57 s | 1.0 | 48% | 48% | 99% | 1% |
| min-ji | DIFÍCIL | **2.0%** (2/100) | 1%-7% | 56 s | 1.0 | 52% | 52% | 100% | 0% |
| caio | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 52 s | 1.0 | 63% | 63% | 100% | 0% |
| aminu | DIFÍCIL | **23.0%** (23/100) | 16%-32% | 58 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 53 s | 1.0 | 59% | 59% | 100% | 0% |
| camille | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 63 s | 1.0 | 61% | 61% | 100% | 0% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 68 s | 1.0 | 58% | 58% | 98% | 2% |
| baatar | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 60 s | 1.0 | 54% | 54% | 100% | 0% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 25024 seguradas em 34891 usos) | 53.9% / 8.0% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (4333 em 10723) | 40.4% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (7046 acertos; faixas <10/10-25/25-50/≥50%: 1/0/712/6333) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 19.07 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 3924 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 6.08 / 1.99 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 17392/5782/4845 · chp 11011/2295/751 · clk 9250/2105/1897 · clp 11094/5446/3564 · hk 22250/6145/4238 · hp 31609/9094/6746 · lk 31790/6141/5220 · lp 36004/7548/6209 · parado 0/0/455 · sDown 9903/3093/952 · sFire 9942/4266/2591 · sFwd 33522/10996/11960 · throw 2114/2044/0

**wei-long**: chk 18305/6852/6328 · chp 12064/3042/687 · clk 8842/3511/4191 · clp 8898/3648/3184 · hk 24667/6041/5779 · hp 32261/9174/9408 · lk 34964/4765/2998 · lp 36663/9184/8403 · parado 0/0/627 · projétil 0/13/0 · sDown 18456/7963/591 · sFire 6642/3443/1489 · sFwd 13350/5193/4263 · throw 1424/1367/0

**min-ji**: chk 18718/6358/4678 · chp 11625/2318/898 · clk 9811/2054/1946 · clp 9692/3892/3684 · hk 26353/7102/6154 · hp 33720/12670/12390 · lk 35695/10957/8534 · lp 42021/6825/6429 · parado 0/0/486 · sDown 10325/4952/2408 · sFire 17338/7613/5452 · sFwd 28627/9197/11163 · throw 2376/2304/0

**caio**: chk 17059/7340/5524 · chp 9784/1996/741 · clk 9629/4587/3914 · clp 8403/3403/3732 · hk 20709/6521/5197 · hp 30934/6222/4027 · lk 29024/9425/12429 · lp 35304/4953/4170 · parado 0/0/564 · sDown 13524/4822/4100 · sFire 10185/5032/2521 · sFwd 30873/12338/10540 · throw 1902/1837/0

**aminu**: chk 16515/6825/5597 · chp 9587/2157/524 · clk 7392/2988/3368 · clp 7451/3045/3352 · hk 24345/8406/6003 · hp 31230/10428/8422 · lk 27545/6474/8231 · lp 30550/8514/9127 · parado 0/0/400 · sDown 11786/1892/1284 · sFire 34891/8100/2984 · sFwd 9976/3935/1549 · throw 1131/1092/0

**centella**: chk 14895/5571/4642 · chp 8644/1582/600 · clk 8500/2654/2016 · clp 7625/3074/2747 · hk 20920/6212/4321 · hp 27481/7013/7304 · lk 26188/7724/8031 · lp 33783/6624/4778 · parado 0/0/505 · projétil 0/0/1 · sDown 429/288/0 · sFire 38353/15675/13565 · sFwd 12045/7062/500 · throw 1312/1256/0

**camille**: chk 18268/6868/5800 · chp 10742/2049/468 · clk 8699/3207/3852 · clp 8592/3184/3360 · hk 24504/6987/6061 · hp 34048/10229/9151 · lk 33440/8675/8555 · lp 33965/6531/5792 · sDown 51791/20819/15639 · sFire 10723/0/0 · sFwd 8646/266/74 · sResp 4333/4286/5 · throw 1171/1124/0

**nila**: chk 10889/4250/4005 · chp 7161/1239/387 · clk 6029/1959/2235 · clp 7464/3174/2678 · hk 13218/3209/3472 · hp 21963/5302/6684 · lk 20411/4639/6011 · lp 24248/5177/4481 · parado 0/0/515 · projétil 0/0/1 · sDown 36049/0/0 · sFire 15842/3192/4171 · sFwd 14566/4252/2408 · sarpa/chk 6630/1498/1225 · sarpa/chp 3966/830/295 · sarpa/clk 3557/1169/1004 · sarpa/clp 3722/1534/1144 · sarpa/hk 8106/1970/1868 · sarpa/hp 11198/2982/2926 · sarpa/lk 11301/2046/2591 · sarpa/lp 12937/2670/2299 · sarpa/sDown 34342/0/0 · sarpa/sFire 37158/16073/14384 · sarpa/sFwd 5398/2027/1512 · sarpa/throw 584/566/0 · throw 882/842/0

**baatar**: chk 17579/6632/6148 · chp 10107/1698/468 · clk 8532/3387/3780 · clp 8368/2401/2634 · hk 23131/7166/6434 · hp 34103/11483/8799 · lk 30359/7131/8882 · lp 37446/11012/12718 · parado 0/0/453 · sDown 30484/9727/8805 · sFire 10969/2873/0 · sFwd 14522/6048/5959 · throw 1081/1051/0

**zenon**: chk 19008/7953/6964 · chp 10926/2179/639 · clk 8891/3512/4183 · clp 8740/3452/4205 · hk 25690/7689/8009 · hp 30983/8477/9055 · lk 33062/2811/1606 · lp 40240/12182/14877 · parado 0/0/328 · sDown 562/484/1 · sFire 14574/8056/2654 · sFwd 39000/11526/12279 · throw 1488/1422/0
