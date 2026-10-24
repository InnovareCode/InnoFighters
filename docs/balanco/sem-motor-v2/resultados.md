# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + motor v2 DESLIGADO (o motor de antes)**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 75 s em 8 processo(s).
- Versão dos dados/motor: `0b5ad77394bb` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-24.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `9ba64a5dd6addf85`.
Hash só das lutas regulares: `eff8e1cec9892313` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `d2250c9efc13c0f6`.
**DIFERENTE** da rodada anterior (antes `88fe7e6d3689cb6b`, agora `9ba64a5dd6addf85`), e a versão dos dados/motor/harness mudou (`0a39396db39d` -> `0b5ad77394bb`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|
| hayato | 48.6% | 48.4% |
| wei-long | 56.1% | 56.2% |
| min-ji | 48.7% | 48.5% |
| caio | 49.0% | 49.0% |
| aminu | 48.9% | 48.8% |
| centella | 51.2% | 51.2% |
| camille | 44.6% | 44.6% |
| nila | 47.9% | 47.8% |
| baatar | 54.3% | 54.0% |
| zenon | 50.8% | 51.5% |

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | chefao | chefão camille NORMAL | o jogador vence 27.7% (n=600), fora da meta 22-26% |
| ATENCAO | chefao | chefão nila DIFÍCIL | o jogador vence 8.9% (n=700), fora da meta 9-15% |
| ATENCAO | chefao | chefão baatar NORMAL | o jogador vence 14.1% (n=800), fora da meta 17-21% |
| ATENCAO | chefao | chefão zenon NORMAL | o jogador vence 14.1% (n=900), fora da meta 15-19% |
| ATENCAO | nunca-acerta | camille sFwd | usado 11315x e só 521 contato(s) (4.6%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1741 | **48.4%** | 47%-50% | 51.8% | 44.9% | 50.5% | 46.2% | 108 s | 0.0% | 208 | 0 |
| wei-long | 3600 | 2022 | **56.2%** | 55%-58% | 58.7% | 53.6% | 57.0% | 55.3% | 109 s | 0.0% | 214 | 0 |
| min-ji | 3600 | 1746 | **48.5%** | 47%-50% | 51.6% | 45.4% | 44.0% | 53.0% | 104 s | 0.0% | 212 | 0 |
| caio | 3600 | 1765 | **49.0%** | 47%-51% | 51.2% | 46.8% | 51.6% | 46.5% | 101 s | 0.0% | 212 | 0 |
| aminu | 3600 | 1757 | **48.8%** | 47%-50% | 51.8% | 45.8% | 41.6% | 56.0% | 108 s | 0.0% | 208 | 2 |
| centella | 3600 | 1845 | **51.2%** | 50%-53% | 56.0% | 46.5% | 52.3% | 50.2% | 105 s | 0.0% | 211 | 0 |
| camille | 3600 | 1605 | **44.6%** | 43%-46% | 48.4% | 40.7% | 40.2% | 49.0% | 105 s | 0.0% | 208 | 1 |
| nila | 3600 | 1721 | **47.8%** | 46%-49% | 50.7% | 44.9% | 49.2% | 46.4% | 117 s | 0.0% | 210 | 1 |
| baatar | 3600 | 1944 | **54.0%** | 52%-56% | 57.3% | 50.7% | 59.7% | 48.3% | 109 s | 0.0% | 217 | 0 |
| zenon | 3600 | 1854 | **51.5%** | 50%-53% | 55.2% | 47.8% | 54.0% | 49.0% | 109 s | 0.0% | 214 | 0 |

Vantagem de lado: o P1 vence 53.3% das lutas (n=18000). Duração média 107 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 17 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 37 | 55 | 52 | 47 | 59 | 47 | 49 | 46 | 45 |
| **wei-long** | 63 | · | 67 | 59 | 55 | 53 | 54 | 60 | 49 | 46 |
| **min-ji** | 46 | 33 | · | 56 | 50 | 52 | 57 | 54 | 39 | 52 |
| **caio** | 48 | 41 | 45 | · | 50 | 50 | 57 | 57 | 43 | 51 |
| **aminu** | 53 | 45 | 51 | 50 | · | 39 | 59 | 45 | 45 | 53 |
| **centella** | 42 | 47 | 48 | 50 | 61 | · | 60 | 58 | 48 | 48 |
| **camille** | 53 | 46 | 43 | 43 | 41 | 40 | · | 47 | 43 | 45 |
| **nila** | 51 | 40 | 46 | 43 | 55 | 42 | 53 | · | 49 | 52 |
| **baatar** | 55 | 51 | 61 | 57 | 56 | 52 | 57 | 51 | · | 46 |
| **zenon** | 55 | 54 | 48 | 49 | 47 | 52 | 55 | 48 | 54 | · |

## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.

Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.

### Resumo

| Chefão | Desafiantes | Fator `danoRecebido` (do nível) | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **aminu** | 4 | 0.85 | NORMAL | **29.5%** (118/400) | 25%-34% | 26-30% | sim | 100% | 0% | 41 s | hayato 17% | wei-long 36% | 0 |
| **aminu** | 4 | 0.92 | DIFÍCIL | **18.0%** (72/400) | 15%-22% | 13-19% | sim | 100% | 0% | 59 s | min-ji 13% | wei-long 22% | 0 |
| **centella** | 5 | 0.86 | NORMAL | **26.0%** (130/500) | 22%-30% | 24-28% | sim | 100% | 0% | 43 s | caio 22% | hayato 30% | 0 |
| **centella** | 5 | 0.74 | DIFÍCIL | **14.8%** (74/500) | 12%-18% | 12-18% | sim | 100% | 0% | 60 s | caio 13% | hayato 17% | 0 |
| **camille** | 6 | 0.89 | NORMAL | **27.7%** (166/600) | 24%-31% | 22-26% | **NÃO** | 100% | 0% | 40 s | wei-long 24% | aminu 33% | 0 |
| **camille** | 6 | 0.82 | DIFÍCIL | **15.3%** (92/600) | 13%-18% | 11-17% | sim | 100% | 0% | 62 s | hayato 5% | aminu 25% | 0 |
| **nila** | 7 | 0.84 | NORMAL | **22.1%** (155/700) | 19%-25% | 19-23% | sim | 100% | 0% | 45 s | camille 17% | centella 28% | 0 |
| **nila** | 7 | 0.72 | DIFÍCIL | **8.9%** (62/700) | 7%-11% | 9-15% | **NÃO** | 95% | 5% | 73 s | centella 3% | aminu 15% | 0 |
| **baatar** | 8 | 0.82 | NORMAL | **14.1%** (113/800) | 12%-17% | 17-21% | **NÃO** | 100% | 0% | 42 s | hayato 9% | wei-long 19% | 0 |
| **baatar** | 8 | 0.75 | DIFÍCIL | **10.0%** (80/800) | 8%-12% | 8-14% | sim | 98% | 2% | 66 s | caio 5% | aminu 22% | 0 |
| **zenon** | 9 | 0.75 | NORMAL | **14.1%** (127/900) | 12%-17% | 15-19% | **NÃO** | 100% | 0% | 42 s | baatar 10% | aminu 23% | 0 |
| **zenon** | 9 | 0.73 | DIFÍCIL | **7.2%** (65/900) | 6%-9% | 7-13% | sim | 99% | 1% | 65 s | baatar 2% | aminu 12% | 0 |

### Chefão aminu

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **17.0%** (17/100) | 11%-26% | 41 s | 1.0 | 67% | 67% | 100% | 0% |
| wei-long | NORMAL | **36.0%** (36/100) | 27%-46% | 43 s | 1.0 | 77% | 77% | 100% | 0% |
| min-ji | NORMAL | **30.0%** (30/100) | 22%-40% | 41 s | 1.0 | 78% | 78% | 100% | 0% |
| caio | NORMAL | **35.0%** (35/100) | 26%-45% | 39 s | 1.0 | 80% | 80% | 100% | 0% |
| hayato | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 61 s | 1.0 | 66% | 66% | 100% | 0% |
| wei-long | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 62 s | 1.0 | 78% | 78% | 100% | 0% |
| min-ji | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 57 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | DIFÍCIL | **21.0%** (21/100) | 14%-30% | 57 s | 1.0 | 74% | 74% | 100% | 0% |

### Chefão centella

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **30.0%** (30/100) | 22%-40% | 43 s | 1.0 | 83% | 83% | 100% | 0% |
| wei-long | NORMAL | **29.0%** (29/100) | 21%-39% | 45 s | 1.0 | 90% | 90% | 100% | 0% |
| min-ji | NORMAL | **25.0%** (25/100) | 18%-34% | 42 s | 1.0 | 79% | 79% | 100% | 0% |
| caio | NORMAL | **22.0%** (22/100) | 15%-31% | 40 s | 1.0 | 76% | 76% | 100% | 0% |
| aminu | NORMAL | **24.0%** (24/100) | 17%-33% | 44 s | 1.0 | 82% | 82% | 100% | 0% |
| hayato | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 63 s | 1.0 | 66% | 66% | 100% | 0% |
| wei-long | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 60 s | 1.0 | 62% | 62% | 100% | 0% |
| min-ji | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 57 s | 1.0 | 63% | 63% | 100% | 0% |
| caio | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 58 s | 1.0 | 57% | 57% | 99% | 1% |
| aminu | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 64 s | 1.0 | 67% | 67% | 99% | 1% |

### Chefão camille

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **27.0%** (27/100) | 19%-36% | 41 s | 1.0 | 83% | 83% | 100% | 0% |
| wei-long | NORMAL | **24.0%** (24/100) | 17%-33% | 41 s | 1.0 | 81% | 81% | 100% | 0% |
| min-ji | NORMAL | **26.0%** (26/100) | 18%-35% | 39 s | 1.0 | 85% | 85% | 100% | 0% |
| caio | NORMAL | **29.0%** (29/100) | 21%-39% | 39 s | 1.0 | 88% | 88% | 100% | 0% |
| aminu | NORMAL | **33.0%** (33/100) | 25%-43% | 41 s | 1.0 | 84% | 84% | 100% | 0% |
| centella | NORMAL | **27.0%** (27/100) | 19%-36% | 41 s | 1.0 | 89% | 89% | 100% | 0% |
| hayato | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 64 s | 1.0 | 58% | 58% | 99% | 1% |
| wei-long | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 64 s | 1.0 | 73% | 73% | 100% | 0% |
| min-ji | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 61 s | 1.0 | 72% | 72% | 100% | 0% |
| caio | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 58 s | 1.0 | 64% | 64% | 100% | 0% |
| aminu | DIFÍCIL | **25.0%** (25/100) | 18%-34% | 67 s | 1.0 | 81% | 81% | 100% | 0% |
| centella | DIFÍCIL | **21.0%** (21/100) | 14%-30% | 59 s | 1.0 | 68% | 68% | 100% | 0% |

### Chefão nila

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **22.0%** (22/100) | 15%-31% | 45 s | 1.0 | 82% | 82% | 100% | 0% |
| wei-long | NORMAL | **23.0%** (23/100) | 16%-32% | 47 s | 1.0 | 81% | 81% | 100% | 0% |
| min-ji | NORMAL | **19.0%** (19/100) | 13%-28% | 42 s | 1.0 | 72% | 72% | 100% | 0% |
| caio | NORMAL | **25.0%** (25/100) | 18%-34% | 43 s | 1.0 | 85% | 85% | 100% | 0% |
| aminu | NORMAL | **21.0%** (21/100) | 14%-30% | 46 s | 1.0 | 86% | 86% | 100% | 0% |
| centella | NORMAL | **28.0%** (28/100) | 20%-37% | 46 s | 1.0 | 80% | 80% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 44 s | 1.0 | 74% | 74% | 100% | 0% |
| hayato | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 76 s | 1.0 | 63% | 63% | 95% | 5% |
| wei-long | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 75 s | 1.0 | 75% | 75% | 93% | 7% |
| min-ji | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 69 s | 1.0 | 65% | 65% | 99% | 1% |
| caio | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 66 s | 1.0 | 61% | 61% | 97% | 3% |
| aminu | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 82 s | 1.0 | 78% | 78% | 92% | 8% |
| centella | DIFÍCIL | **3.0%** (3/100) | 1%-8% | 70 s | 1.0 | 59% | 59% | 98% | 2% |
| camille | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 76 s | 1.0 | 67% | 67% | 94% | 6% |

### Chefão baatar

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **9.0%** (9/100) | 5%-16% | 41 s | 1.0 | 77% | 77% | 100% | 0% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 43 s | 1.0 | 77% | 77% | 100% | 0% |
| min-ji | NORMAL | **14.0%** (14/100) | 9%-22% | 40 s | 1.0 | 71% | 71% | 100% | 0% |
| caio | NORMAL | **14.0%** (14/100) | 9%-22% | 39 s | 1.0 | 80% | 80% | 100% | 0% |
| aminu | NORMAL | **14.0%** (14/100) | 9%-22% | 44 s | 1.0 | 72% | 72% | 100% | 0% |
| centella | NORMAL | **15.0%** (15/100) | 9%-23% | 43 s | 1.0 | 84% | 84% | 100% | 0% |
| camille | NORMAL | **13.0%** (13/100) | 8%-21% | 41 s | 1.0 | 70% | 70% | 100% | 0% |
| nila | NORMAL | **15.0%** (15/100) | 9%-23% | 46 s | 1.0 | 75% | 75% | 100% | 0% |
| hayato | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 67 s | 1.0 | 52% | 52% | 99% | 1% |
| wei-long | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 67 s | 1.0 | 51% | 50% | 99% | 1% |
| min-ji | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 61 s | 1.0 | 51% | 51% | 100% | 0% |
| caio | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 60 s | 1.0 | 65% | 65% | 100% | 0% |
| aminu | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 70 s | 1.0 | 66% | 66% | 98% | 2% |
| centella | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 61 s | 1.0 | 61% | 61% | 100% | 0% |
| camille | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 67 s | 1.0 | 63% | 63% | 100% | 0% |
| nila | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 78 s | 1.0 | 69% | 69% | 91% | 9% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **14.0%** (14/100) | 9%-22% | 43 s | 1.0 | 67% | 67% | 100% | 0% |
| wei-long | NORMAL | **13.0%** (13/100) | 8%-21% | 43 s | 1.0 | 66% | 66% | 100% | 0% |
| min-ji | NORMAL | **11.0%** (11/100) | 6%-19% | 39 s | 1.0 | 66% | 66% | 100% | 0% |
| caio | NORMAL | **16.0%** (16/100) | 10%-24% | 41 s | 1.0 | 68% | 68% | 100% | 0% |
| aminu | NORMAL | **23.0%** (23/100) | 16%-32% | 43 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | NORMAL | **15.0%** (15/100) | 9%-23% | 41 s | 1.0 | 62% | 62% | 100% | 0% |
| camille | NORMAL | **11.0%** (11/100) | 6%-19% | 40 s | 1.0 | 59% | 59% | 100% | 0% |
| nila | NORMAL | **14.0%** (14/100) | 9%-22% | 44 s | 1.0 | 64% | 64% | 100% | 0% |
| baatar | NORMAL | **10.0%** (10/100) | 6%-17% | 45 s | 1.0 | 78% | 78% | 100% | 0% |
| hayato | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 66 s | 1.0 | 62% | 62% | 100% | 0% |
| wei-long | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 65 s | 1.0 | 57% | 56% | 100% | 0% |
| min-ji | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 64 s | 1.0 | 67% | 65% | 99% | 1% |
| caio | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 59 s | 1.0 | 68% | 67% | 100% | 0% |
| aminu | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 65 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 60 s | 1.0 | 56% | 56% | 100% | 0% |
| camille | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 66 s | 1.0 | 49% | 48% | 98% | 2% |
| nila | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 73 s | 1.0 | 59% | 59% | 97% | 3% |
| baatar | DIFÍCIL | **2.0%** (2/100) | 1%-7% | 64 s | 1.0 | 54% | 54% | 100% | 0% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 30432 seguradas em 42627 usos) | 54.6% / 8.1% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (5246 em 11912) | 44.0% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (8889 acertos; faixas <10/10-25/25-50/≥50%: 0/0/605/8284) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 21.38 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 4864 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 6.63 / 2.32 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 20154/6571/5474 · chp 12378/2667/945 · clk 10068/2333/2122 · clp 10123/4194/4046 · hk 23807/6008/4591 · hp 33911/9329/7709 · lk 35758/6850/5535 · lp 41131/8484/6844 · parado 0/0/539 · sDown 10884/3416/1212 · sFire 11457/5026/3006 · sFwd 39921/13091/13954 · throw 2464/2373/0

**wei-long**: chk 21384/8112/7240 · chp 13149/3576/797 · clk 9490/3944/4640 · clp 9397/3904/3613 · hk 28363/6723/6433 · hp 34575/9647/10676 · lk 35382/4568/2915 · lp 39030/10137/9083 · parado 0/0/775 · projétil 0/4260/0 · sDown 21733/5662/738 · sFire 7943/3503/1748 · sFwd 15530/5567/4973 · throw 1774/1718/0

**min-ji**: chk 21243/7175/5040 · chp 12634/2873/996 · clk 10143/2326/2017 · clp 10194/4275/3973 · hk 27994/7158/6479 · hp 36794/14969/13067 · lk 36211/9901/9416 · lp 49040/9220/7332 · parado 0/0/648 · sDown 11680/14347/6574 · sFire 22788/16452/13252 · sFwd 34976/11353/12720 · throw 2869/2770/0

**caio**: chk 18552/7497/6257 · chp 10658/2326/904 · clk 8635/3739/4138 · clp 8753/3693/4161 · hk 21042/5710/6004 · hp 34897/7360/4490 · lk 31453/10429/13459 · lp 41725/6905/5622 · parado 0/0/595 · sDown 15802/5890/4843 · sFire 12119/6136/2990 · sFwd 36029/13618/12487 · throw 2271/2177/0

**aminu**: chk 20015/8267/7101 · chp 11137/2676/605 · clk 8122/3503/4051 · clp 8210/3598/4089 · hk 25807/7299/7457 · hp 33510/10006/10585 · lk 32241/8049/10098 · lp 35526/10844/11336 · parado 0/0/533 · sDown 14746/2558/1616 · sFire 42627/9905/3880 · sFwd 11003/3228/2075 · throw 1538/1494/0

**centella**: chk 17991/6522/5283 · chp 9339/2072/877 · clk 8083/2556/2480 · clp 7975/3381/3230 · hk 22889/5795/5139 · hp 31864/8404/8546 · lk 29946/8993/9482 · lp 48332/7756/6074 · parado 0/0/622 · projétil 0/0/1 · sDown 534/348/0 · sFire 44925/16932/15985 · sFwd 15570/8913/639 · throw 2250/2158/0

**camille**: chk 21480/8500/7030 · chp 11796/2681/668 · clk 9027/3855/4347 · clp 8969/3767/4009 · hk 27224/7599/7263 · hp 35479/10180/10879 · lk 34803/8102/10395 · lp 36608/8388/6595 · sDown 60010/25058/19094 · sFire 11912/0/0 · sFwd 11315/411/110 · sResp 5246/5202/6 · throw 1654/1600/0

**nila**: chk 11940/4789/4393 · chp 7620/1461/505 · clk 6547/2239/2468 · clp 6378/2679/2975 · hk 15001/3924/3949 · hp 23266/6062/7384 · lk 21656/5293/6539 · lp 25887/5984/5026 · parado 0/0/624 · sDown 40341/0/0 · sFire 19017/4112/4922 · sFwd 15571/4083/2712 · sarpa/chk 8419/1894/1555 · sarpa/chp 4522/1076/378 · sarpa/clk 3389/1152/1173 · sarpa/clp 3373/1333/1394 · sarpa/hk 10592/2620/2348 · sarpa/hp 13105/3989/3640 · sarpa/lk 13404/2589/3296 · sarpa/lp 15258/3404/2853 · sarpa/sDown 38654/0/0 · sarpa/sFire 47223/19800/18033 · sarpa/sFwd 7233/2665/1991 · sarpa/throw 865/830/0 · throw 1110/1076/0

**baatar**: chk 21445/8104/7244 · chp 11229/2246/643 · clk 9301/3861/4495 · clp 9376/2969/3067 · hk 26242/7768/7389 · hp 34954/9694/10564 · lk 34932/8253/10115 · lp 44710/12919/14617 · parado 0/0/566 · sDown 36106/11204/10828 · sFire 12325/3248/0 · sFwd 18420/7722/7733 · throw 1673/1615/0

**zenon**: chk 21425/9153/8024 · chp 11878/2655/776 · clk 9280/3913/4629 · clp 9261/3963/4755 · hk 27812/7934/9197 · hp 32707/9352/9862 · lk 36044/3001/1972 · lp 41525/12884/16326 · parado 0/0/344 · sDown 845/678/25 · sFire 18142/10302/3274 · sFwd 42857/12852/13834 · throw 1893/1834/0
