# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + ENTRADA NO HITSTOP (motorV2.entradaNoHitstop) + FILMES ligados (motorV2.filmes) + COMBOS PRÓPRIOS ligados (motorV2.combos)**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 99 s em 8 processo(s).
- Versão dos dados/motor: `75764f4439da` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-24.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `d5fcc2263ad946ac`.
Hash só das lutas regulares: `83a6997ab15ef38e` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `86646c44100734e9`.
**DIFERENTE** da rodada anterior (antes `f10566d4c45c9263`, agora `d5fcc2263ad946ac`), e a versão dos dados/motor/harness mudou (`0b5ad77394bb` -> `75764f4439da`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|
| hayato | 49.3% | 49.6% |
| wei-long | 45.5% | 45.3% |
| min-ji | 44.8% | 45.3% |
| caio | 50.7% | 49.7% |
| aminu | 54.1% | 53.6% |
| centella | 48.4% | 48.1% |
| camille | 53.6% | 53.9% |
| nila | 50.3% | 50.4% |
| baatar | 56.2% | 56.8% |
| zenon | 47.0% | 47.2% |

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | nunca-acerta | camille sFwd | usado 8571x e só 330 contato(s) (3.9%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1787 | **49.6%** | 48%-51% | 51.5% | 47.8% | 52.6% | 46.7% | 96 s | 0.0% | 205 | 1 |
| wei-long | 3600 | 1630 | **45.3%** | 44%-47% | 47.4% | 43.1% | 45.7% | 44.9% | 94 s | 0.0% | 203 | 0 |
| min-ji | 3600 | 1632 | **45.3%** | 44%-47% | 49.1% | 41.6% | 47.3% | 43.3% | 92 s | 0.0% | 204 | 1 |
| caio | 3600 | 1790 | **49.7%** | 48%-51% | 52.1% | 47.4% | 51.4% | 48.0% | 89 s | 0.0% | 209 | 1 |
| aminu | 3600 | 1930 | **53.6%** | 52%-55% | 55.4% | 51.8% | 41.2% | 66.0% | 90 s | 0.0% | 206 | 3 |
| centella | 3600 | 1730 | **48.1%** | 46%-50% | 52.2% | 43.9% | 48.4% | 47.7% | 90 s | 0.0% | 205 | 2 |
| camille | 3600 | 1940 | **53.9%** | 52%-56% | 57.9% | 49.9% | 50.0% | 57.8% | 91 s | 0.0% | 210 | 3 |
| nila | 3600 | 1816 | **50.4%** | 49%-52% | 51.7% | 49.2% | 54.1% | 46.8% | 101 s | 0.0% | 208 | 1 |
| baatar | 3600 | 2045 | **56.8%** | 55%-58% | 58.1% | 55.5% | 61.1% | 52.6% | 92 s | 0.0% | 213 | 2 |
| zenon | 3600 | 1700 | **47.2%** | 46%-49% | 49.9% | 44.6% | 48.2% | 46.3% | 96 s | 0.0% | 205 | 1 |

Vantagem de lado: o P1 vence 52.5% das lutas (n=18000). Duração média 93 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 14 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 54 | 56 | 55 | 37 | 57 | 46 | 50 | 44 | 48 |
| **wei-long** | 46 | · | 60 | 47 | 43 | 50 | 39 | 41 | 37 | 45 |
| **min-ji** | 44 | 40 | · | 50 | 41 | 56 | 45 | 48 | 36 | 48 |
| **caio** | 45 | 53 | 50 | · | 53 | 53 | 45 | 53 | 43 | 53 |
| **aminu** | 63 | 57 | 59 | 47 | · | 50 | 52 | 52 | 42 | 60 |
| **centella** | 43 | 50 | 44 | 48 | 50 | · | 52 | 52 | 47 | 48 |
| **camille** | 54 | 61 | 55 | 55 | 48 | 49 | · | 55 | 50 | 59 |
| **nila** | 50 | 59 | 53 | 47 | 48 | 49 | 45 | · | 48 | 57 |
| **baatar** | 56 | 63 | 64 | 57 | 58 | 53 | 50 | 53 | · | 58 |
| **zenon** | 52 | 55 | 52 | 47 | 40 | 52 | 42 | 43 | 42 | · |

## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.

Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.

### Resumo

| Chefão | Desafiantes | Fator `danoRecebido` (do nível) | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **aminu** | 4 | 0.85 | NORMAL | **29.8%** (119/400) | 25%-34% | 26-30% | sim | 100% | 0% | 38 s | hayato 23% | min-ji 37% | 0 |
| **aminu** | 4 | 0.92 | DIFÍCIL | **15.0%** (60/400) | 12%-19% | 13-19% | sim | 100% | 0% | 47 s | min-ji 9% | caio 20% | 0 |
| **centella** | 5 | 0.86 | NORMAL | **26.0%** (130/500) | 22%-30% | 24-28% | sim | 100% | 0% | 38 s | min-ji 21% | hayato 32% | 0 |
| **centella** | 5 | 0.74 | DIFÍCIL | **16.0%** (80/500) | 13%-19% | 12-18% | sim | 100% | 0% | 55 s | caio 9% | aminu 26% | 0 |
| **camille** | 6 | 0.89 | NORMAL | **25.0%** (150/600) | 22%-29% | 22-26% | sim | 100% | 0% | 36 s | wei-long 17% | aminu 36% | 0 |
| **camille** | 6 | 0.82 | DIFÍCIL | **13.2%** (79/600) | 11%-16% | 11-17% | sim | 100% | 0% | 52 s | hayato 5% | aminu 30% | 0 |
| **nila** | 7 | 0.84 | NORMAL | **22.6%** (158/700) | 20%-26% | 19-23% | sim | 100% | 0% | 39 s | hayato 18% | caio 30% | 0 |
| **nila** | 7 | 0.72 | DIFÍCIL | **14.4%** (101/700) | 12%-17% | 9-15% | sim | 99% | 1% | 64 s | min-ji 6% | aminu 27% | 0 |
| **baatar** | 8 | 0.82 | NORMAL | **17.3%** (138/800) | 15%-20% | 17-21% | sim | 100% | 0% | 37 s | caio 13% | nila 25% | 0 |
| **baatar** | 8 | 0.75 | DIFÍCIL | **11.3%** (90/800) | 9%-14% | 8-14% | sim | 99% | 1% | 58 s | caio 5% | aminu 22% | 0 |
| **zenon** | 9 | 0.75 | NORMAL | **18.2%** (164/900) | 16%-21% | 15-19% | sim | 100% | 0% | 39 s | hayato 12% | aminu 25% | 0 |
| **zenon** | 9 | 0.73 | DIFÍCIL | **9.7%** (87/900) | 8%-12% | 7-13% | sim | 100% | 0% | 59 s | min-ji 2% | aminu 22% | 0 |

### Chefão aminu

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **23.0%** (23/100) | 16%-32% | 38 s | 1.0 | 74% | 74% | 100% | 0% |
| wei-long | NORMAL | **25.0%** (25/100) | 18%-34% | 39 s | 1.0 | 75% | 75% | 100% | 0% |
| min-ji | NORMAL | **37.0%** (37/100) | 28%-47% | 38 s | 1.0 | 82% | 82% | 100% | 0% |
| caio | NORMAL | **34.0%** (34/100) | 25%-44% | 37 s | 1.0 | 86% | 86% | 100% | 0% |
| hayato | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 47 s | 1.0 | 53% | 53% | 100% | 0% |
| wei-long | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 47 s | 1.0 | 60% | 60% | 100% | 0% |
| min-ji | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 46 s | 1.0 | 52% | 52% | 100% | 0% |
| caio | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 47 s | 1.0 | 68% | 68% | 100% | 0% |

### Chefão centella

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **32.0%** (32/100) | 24%-42% | 39 s | 1.0 | 81% | 81% | 100% | 0% |
| wei-long | NORMAL | **28.0%** (28/100) | 20%-37% | 38 s | 1.0 | 78% | 78% | 100% | 0% |
| min-ji | NORMAL | **21.0%** (21/100) | 14%-30% | 38 s | 1.0 | 79% | 78% | 100% | 0% |
| caio | NORMAL | **24.0%** (24/100) | 17%-33% | 35 s | 1.0 | 75% | 75% | 100% | 0% |
| aminu | NORMAL | **25.0%** (25/100) | 18%-34% | 38 s | 1.0 | 73% | 73% | 100% | 0% |
| hayato | DIFÍCIL | **25.0%** (25/100) | 18%-34% | 59 s | 1.0 | 72% | 72% | 100% | 0% |
| wei-long | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 53 s | 1.0 | 58% | 58% | 100% | 0% |
| min-ji | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 54 s | 1.0 | 65% | 64% | 100% | 0% |
| caio | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 52 s | 1.0 | 54% | 54% | 100% | 0% |
| aminu | DIFÍCIL | **26.0%** (26/100) | 18%-35% | 55 s | 1.0 | 71% | 71% | 100% | 0% |

### Chefão camille

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 39 s | 1.0 | 84% | 84% | 100% | 0% |
| wei-long | NORMAL | **17.0%** (17/100) | 11%-26% | 35 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | NORMAL | **24.0%** (24/100) | 17%-33% | 37 s | 1.0 | 74% | 74% | 100% | 0% |
| caio | NORMAL | **19.0%** (19/100) | 13%-28% | 35 s | 1.0 | 73% | 73% | 100% | 0% |
| aminu | NORMAL | **36.0%** (36/100) | 27%-46% | 37 s | 1.0 | 80% | 80% | 100% | 0% |
| centella | NORMAL | **29.0%** (29/100) | 21%-39% | 36 s | 1.0 | 87% | 87% | 100% | 0% |
| hayato | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 57 s | 1.0 | 51% | 51% | 100% | 0% |
| wei-long | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 53 s | 1.0 | 65% | 65% | 100% | 0% |
| min-ji | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 52 s | 1.0 | 63% | 63% | 100% | 0% |
| caio | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 45 s | 1.0 | 45% | 45% | 100% | 0% |
| aminu | DIFÍCIL | **30.0%** (30/100) | 22%-40% | 52 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 52 s | 1.0 | 60% | 60% | 100% | 0% |

### Chefão nila

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **18.0%** (18/100) | 12%-27% | 39 s | 1.0 | 76% | 76% | 100% | 0% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 41 s | 1.0 | 84% | 84% | 100% | 0% |
| min-ji | NORMAL | **20.0%** (20/100) | 13%-29% | 37 s | 1.0 | 67% | 67% | 100% | 0% |
| caio | NORMAL | **30.0%** (30/100) | 22%-40% | 39 s | 1.0 | 82% | 82% | 100% | 0% |
| aminu | NORMAL | **18.0%** (18/100) | 12%-27% | 39 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | NORMAL | **27.0%** (27/100) | 19%-36% | 41 s | 1.0 | 86% | 86% | 100% | 0% |
| camille | NORMAL | **26.0%** (26/100) | 18%-35% | 39 s | 1.0 | 77% | 77% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 68 s | 1.0 | 61% | 61% | 99% | 1% |
| wei-long | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 64 s | 1.0 | 60% | 59% | 97% | 3% |
| min-ji | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 62 s | 1.0 | 52% | 52% | 99% | 1% |
| caio | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 60 s | 1.0 | 59% | 58% | 100% | 0% |
| aminu | DIFÍCIL | **27.0%** (27/100) | 19%-36% | 67 s | 1.0 | 74% | 74% | 99% | 1% |
| centella | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 61 s | 1.0 | 64% | 64% | 99% | 1% |
| camille | DIFÍCIL | **19.0%** (19/100) | 13%-28% | 68 s | 1.0 | 71% | 71% | 99% | 1% |

### Chefão baatar

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **15.0%** (15/100) | 9%-23% | 38 s | 1.0 | 65% | 65% | 100% | 0% |
| wei-long | NORMAL | **18.0%** (18/100) | 12%-27% | 37 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | NORMAL | **14.0%** (14/100) | 9%-22% | 36 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **13.0%** (13/100) | 8%-21% | 35 s | 1.0 | 74% | 74% | 100% | 0% |
| aminu | NORMAL | **17.0%** (17/100) | 11%-26% | 37 s | 1.0 | 76% | 76% | 100% | 0% |
| centella | NORMAL | **19.0%** (19/100) | 13%-28% | 37 s | 1.0 | 66% | 66% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 35 s | 1.0 | 70% | 70% | 100% | 0% |
| nila | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 73% | 73% | 100% | 0% |
| hayato | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 59 s | 1.0 | 62% | 62% | 100% | 0% |
| wei-long | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 58 s | 1.0 | 51% | 51% | 100% | 0% |
| min-ji | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 53 s | 1.0 | 51% | 51% | 99% | 1% |
| caio | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 51 s | 1.0 | 52% | 52% | 100% | 0% |
| aminu | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 60 s | 1.0 | 75% | 75% | 100% | 0% |
| centella | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 53 s | 1.0 | 68% | 68% | 100% | 0% |
| camille | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 59 s | 1.0 | 68% | 68% | 100% | 0% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 73 s | 1.0 | 57% | 57% | 96% | 4% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **12.0%** (12/100) | 7%-20% | 40 s | 1.0 | 63% | 63% | 100% | 0% |
| wei-long | NORMAL | **22.0%** (22/100) | 15%-31% | 40 s | 1.0 | 69% | 69% | 100% | 0% |
| min-ji | NORMAL | **16.0%** (16/100) | 10%-24% | 39 s | 1.0 | 71% | 71% | 100% | 0% |
| caio | NORMAL | **19.0%** (19/100) | 13%-28% | 38 s | 1.0 | 64% | 64% | 100% | 0% |
| aminu | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 72% | 72% | 100% | 0% |
| centella | NORMAL | **12.0%** (12/100) | 7%-20% | 37 s | 1.0 | 62% | 62% | 100% | 0% |
| camille | NORMAL | **16.0%** (16/100) | 10%-24% | 38 s | 1.0 | 69% | 69% | 100% | 0% |
| nila | NORMAL | **21.0%** (21/100) | 14%-30% | 42 s | 1.0 | 74% | 74% | 100% | 0% |
| baatar | NORMAL | **21.0%** (21/100) | 14%-30% | 39 s | 1.0 | 76% | 76% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 63 s | 1.0 | 65% | 65% | 100% | 0% |
| wei-long | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 57 s | 1.0 | 47% | 47% | 99% | 1% |
| min-ji | DIFÍCIL | **2.0%** (2/100) | 1%-7% | 56 s | 1.0 | 52% | 52% | 100% | 0% |
| caio | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 54 s | 1.0 | 57% | 57% | 100% | 0% |
| aminu | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 58 s | 1.0 | 73% | 73% | 100% | 0% |
| centella | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 53 s | 1.0 | 59% | 59% | 100% | 0% |
| camille | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 62 s | 1.0 | 59% | 59% | 100% | 0% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 67 s | 1.0 | 58% | 58% | 99% | 1% |
| baatar | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 61 s | 1.0 | 55% | 55% | 100% | 0% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 25166 seguradas em 34990 usos) | 53.8% / 8.0% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (4280 em 10590) | 40.4% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (7040 acertos; faixas <10/10-25/25-50/≥50%: 2/0/710/6328) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 19.11 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 3927 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 6.09 / 2.00 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 17445/5843/4821 · chp 11055/2300/769 · clk 9273/2094/1901 · clp 11140/5463/3588 · hk 22390/6205/4241 · hp 31783/9047/6759 · lk 31905/6177/5182 · lp 36125/7633/6220 · parado 0/0/455 · sDown 9917/3087/949 · sFire 10004/4317/2591 · sFwd 33591/11021/11973 · throw 2164/2088/0

**wei-long**: chk 18300/6838/6364 · chp 12133/3107/689 · clk 8889/3542/4215 · clp 8969/3679/3187 · hk 24674/6044/5776 · hp 32264/9161/9376 · lk 34894/4753/2963 · lp 36699/9120/8420 · parado 0/0/627 · projétil 0/16/0 · sDown 18504/7987/590 · sFire 6625/3423/1478 · sFwd 13335/5184/4228 · throw 1447/1385/0

**min-ji**: chk 18865/6404/4741 · chp 11694/2365/903 · clk 9840/2076/1972 · clp 9715/3887/3706 · hk 26480/7155/6169 · hp 33928/12778/12457 · lk 35778/10946/8578 · lp 42102/6821/6398 · parado 0/0/486 · sDown 10386/4949/2427 · sFire 17352/7624/5412 · sFwd 28793/9288/11221 · throw 2359/2284/0

**caio**: chk 16959/7416/5550 · chp 10026/1944/765 · clk 9522/4596/3854 · clp 8473/3322/3016 · hk 20919/6757/5281 · hp 31458/6211/4070 · lk 28939/9597/12488 · lp 35393/5339/4521 · parado 0/0/507 · sDown 13560/4971/3918 · sFire 10203/4938/2569 · sFwd 31222/11970/10671 · throw 2071/2001/0

**aminu**: chk 16533/6819/5609 · chp 9588/2172/527 · clk 7410/2984/3381 · clp 7425/3017/3366 · hk 24326/8403/5995 · hp 31280/10387/8404 · lk 27591/6428/8244 · lp 30636/8549/9133 · parado 0/0/400 · sDown 11760/1882/1284 · sFire 34990/8102/3006 · sFwd 9925/3892/1529 · throw 1135/1096/0

**centella**: chk 14890/5558/4647 · chp 8649/1618/580 · clk 8444/2642/2020 · clp 7523/3044/2721 · hk 20966/6281/4292 · hp 27603/7059/7274 · lk 26229/7707/8057 · lp 33816/6579/4778 · parado 0/0/505 · sDown 430/283/0 · sFire 38285/15619/13565 · sFwd 12088/7056/499 · throw 1304/1254/0

**camille**: chk 18253/6846/5784 · chp 10730/2055/463 · clk 8606/3205/3789 · clp 8578/3178/3336 · hk 24471/6981/6061 · hp 33761/10086/9158 · lk 33349/8610/8596 · lp 33800/6511/5741 · sDown 51608/20817/15569 · sFire 10590/0/0 · sFwd 8571/254/76 · sResp 4280/4234/4 · throw 1154/1106/0

**nila**: chk 10897/4262/3982 · chp 7177/1251/408 · clk 6061/1949/2274 · clp 7493/3185/2688 · hk 13309/3216/3496 · hp 22108/5343/6710 · lk 20512/4627/6085 · lp 24460/5194/4599 · parado 0/0/515 · sDown 36124/0/0 · sFire 15984/3236/4246 · sFwd 14660/4293/2412 · sarpa/chk 6618/1502/1231 · sarpa/chp 4011/861/295 · sarpa/clk 3562/1157/1000 · sarpa/clp 3696/1510/1131 · sarpa/hk 8090/1969/1859 · sarpa/hp 11178/2977/2891 · sarpa/lk 11287/2050/2589 · sarpa/lp 12933/2716/2245 · sarpa/sDown 34443/0/0 · sarpa/sFire 37181/16055/14366 · sarpa/sFwd 5424/2027/1522 · sarpa/throw 579/560/0 · throw 892/853/0

**baatar**: chk 17587/6618/6152 · chp 10106/1719/457 · clk 8580/3406/3794 · clp 8335/2410/2592 · hk 23065/7178/6384 · hp 34069/11475/8728 · lk 30347/7113/8849 · lp 37472/11043/12726 · parado 0/0/453 · sDown 30392/9729/8679 · sFire 11016/2877/0 · sFwd 14517/6061/5958 · throw 1086/1049/0

**zenon**: chk 19029/8051/6954 · chp 10880/2157/632 · clk 8903/3543/4191 · clp 8747/3434/4213 · hk 25583/7609/8009 · hp 30961/8496/9044 · lk 33054/2800/1617 · lp 40067/12212/14708 · parado 0/0/332 · sDown 564/490/2 · sFire 14523/8036/2610 · sFwd 38823/11478/12170 · throw 1476/1409/0
