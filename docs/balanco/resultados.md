# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + ENTRADA NO HITSTOP (motorV2.entradaNoHitstop) + FILMES ligados (motorV2.filmes) + COMBOS PRÓPRIOS ligados (motorV2.combos)**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 70 s em 8 processo(s).
- Versão dos dados/motor: `0b5ad77394bb` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-24.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `f10566d4c45c9263`.
Hash só das lutas regulares: `e5db8a2586c836b5` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `fc84e3a24a9cd6c7`.
**DIFERENTE** da rodada anterior (antes `79a6e9e3af0c7847`, agora `f10566d4c45c9263`), e a versão dos dados/motor/harness mudou (`0a39396db39d` -> `0b5ad77394bb`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|
| hayato | 49.7% | 49.3% |
| wei-long | 45.7% | 45.5% |
| caio | 50.5% | 50.7% |
| aminu | 54.1% | 54.1% |
| centella | 48.5% | 48.4% |
| camille | 53.4% | 53.6% |
| nila | 50.4% | 50.3% |
| baatar | 56.1% | 56.2% |
| zenon | 46.7% | 47.0% |

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | nunca-acerta | camille sFwd | usado 8639x e só 340 contato(s) (3.9%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1775 | **49.3%** | 48%-51% | 51.2% | 47.4% | 52.6% | 46.1% | 95 s | 0.0% | 204 | 1 |
| wei-long | 3600 | 1639 | **45.5%** | 44%-47% | 48.2% | 42.9% | 46.1% | 44.9% | 94 s | 0.0% | 202 | 0 |
| min-ji | 3600 | 1614 | **44.8%** | 43%-46% | 48.5% | 41.2% | 47.1% | 42.6% | 92 s | 0.0% | 203 | 1 |
| caio | 3600 | 1825 | **50.7%** | 49%-52% | 53.1% | 48.3% | 51.9% | 49.5% | 88 s | 0.0% | 208 | 4 |
| aminu | 3600 | 1946 | **54.1%** | 52%-56% | 55.7% | 52.4% | 41.1% | 67.0% | 90 s | 0.0% | 207 | 4 |
| centella | 3600 | 1744 | **48.4%** | 47%-50% | 52.0% | 44.9% | 48.8% | 48.1% | 90 s | 0.0% | 205 | 3 |
| camille | 3600 | 1928 | **53.6%** | 52%-55% | 57.9% | 49.2% | 50.2% | 56.9% | 91 s | 0.0% | 211 | 3 |
| nila | 3600 | 1812 | **50.3%** | 49%-52% | 51.8% | 48.8% | 54.2% | 46.4% | 101 s | 0.0% | 208 | 1 |
| baatar | 3600 | 2024 | **56.2%** | 55%-58% | 57.2% | 55.3% | 60.1% | 52.4% | 92 s | 0.0% | 213 | 2 |
| zenon | 3600 | 1693 | **47.0%** | 45%-49% | 49.8% | 44.3% | 48.1% | 46.0% | 96 s | 0.0% | 206 | 1 |

Vantagem de lado: o P1 vence 52.5% das lutas (n=18000). Duração média 93 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 14 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 54 | 56 | 52 | 37 | 57 | 46 | 50 | 44 | 48 |
| **wei-long** | 46 | · | 60 | 49 | 43 | 50 | 39 | 41 | 37 | 45 |
| **min-ji** | 44 | 40 | · | 46 | 41 | 56 | 45 | 48 | 36 | 48 |
| **caio** | 48 | 51 | 54 | · | 49 | 49 | 48 | 54 | 48 | 55 |
| **aminu** | 63 | 57 | 59 | 51 | · | 50 | 52 | 52 | 42 | 60 |
| **centella** | 43 | 50 | 44 | 51 | 50 | · | 52 | 52 | 47 | 48 |
| **camille** | 54 | 61 | 55 | 52 | 48 | 49 | · | 55 | 50 | 59 |
| **nila** | 50 | 59 | 53 | 46 | 48 | 49 | 45 | · | 48 | 57 |
| **baatar** | 56 | 63 | 64 | 52 | 58 | 53 | 50 | 53 | · | 58 |
| **zenon** | 52 | 55 | 52 | 45 | 40 | 52 | 42 | 43 | 42 | · |

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
| **baatar** | 8 | 0.82 | NORMAL | **17.8%** (142/800) | 15%-21% | 17-21% | sim | 100% | 0% | 37 s | min-ji 14% | nila 25% | 0 |
| **baatar** | 8 | 0.75 | DIFÍCIL | **11.5%** (92/800) | 9%-14% | 8-14% | sim | 99% | 1% | 58 s | min-ji 7% | aminu 22% | 0 |
| **zenon** | 9 | 0.75 | NORMAL | **18.1%** (163/900) | 16%-21% | 15-19% | sim | 100% | 0% | 39 s | hayato 12% | aminu 25% | 0 |
| **zenon** | 9 | 0.73 | DIFÍCIL | **9.4%** (85/900) | 8%-12% | 7-13% | sim | 100% | 0% | 59 s | min-ji 2% | aminu 22% | 0 |

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
| hayato | NORMAL | **15.0%** (15/100) | 9%-23% | 38 s | 1.0 | 65% | 65% | 100% | 0% |
| wei-long | NORMAL | **18.0%** (18/100) | 12%-27% | 37 s | 1.0 | 71% | 71% | 100% | 0% |
| min-ji | NORMAL | **14.0%** (14/100) | 9%-22% | 36 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **17.0%** (17/100) | 11%-26% | 35 s | 1.0 | 71% | 71% | 100% | 0% |
| aminu | NORMAL | **17.0%** (17/100) | 11%-26% | 37 s | 1.0 | 76% | 76% | 100% | 0% |
| centella | NORMAL | **19.0%** (19/100) | 13%-28% | 37 s | 1.0 | 66% | 66% | 100% | 0% |
| camille | NORMAL | **17.0%** (17/100) | 11%-26% | 35 s | 1.0 | 70% | 70% | 100% | 0% |
| nila | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 73% | 73% | 100% | 0% |
| hayato | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 59 s | 1.0 | 62% | 62% | 100% | 0% |
| wei-long | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 58 s | 1.0 | 51% | 51% | 100% | 0% |
| min-ji | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 53 s | 1.0 | 51% | 51% | 99% | 1% |
| caio | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 53 s | 1.0 | 54% | 54% | 100% | 0% |
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
| caio | NORMAL | **18.0%** (18/100) | 12%-27% | 37 s | 1.0 | 59% | 59% | 100% | 0% |
| aminu | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 72% | 72% | 100% | 0% |
| centella | NORMAL | **12.0%** (12/100) | 7%-20% | 37 s | 1.0 | 62% | 62% | 100% | 0% |
| camille | NORMAL | **16.0%** (16/100) | 10%-24% | 38 s | 1.0 | 69% | 69% | 100% | 0% |
| nila | NORMAL | **21.0%** (21/100) | 14%-30% | 42 s | 1.0 | 74% | 74% | 100% | 0% |
| baatar | NORMAL | **21.0%** (21/100) | 14%-30% | 39 s | 1.0 | 76% | 76% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 63 s | 1.0 | 65% | 65% | 100% | 0% |
| wei-long | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 57 s | 1.0 | 47% | 47% | 99% | 1% |
| min-ji | DIFÍCIL | **2.0%** (2/100) | 1%-7% | 56 s | 1.0 | 52% | 52% | 100% | 0% |
| caio | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 52 s | 1.0 | 62% | 62% | 100% | 0% |
| aminu | DIFÍCIL | **22.0%** (22/100) | 15%-31% | 58 s | 1.0 | 73% | 73% | 100% | 0% |
| centella | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 53 s | 1.0 | 59% | 59% | 100% | 0% |
| camille | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 62 s | 1.0 | 59% | 59% | 100% | 0% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 67 s | 1.0 | 58% | 58% | 99% | 1% |
| baatar | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 61 s | 1.0 | 55% | 55% | 100% | 0% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 25043 seguradas em 34882 usos) | 53.9% / 8.0% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (4337 em 10710) | 40.5% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (7028 acertos; faixas <10/10-25/25-50/≥50%: 2/0/714/6312) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 19.08 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 3975 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 6.08 / 1.99 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 17372/5788/4828 · chp 11020/2289/757 · clk 9250/2108/1889 · clp 11078/5429/3563 · hk 22217/6140/4213 · hp 31572/9074/6742 · lk 31798/6156/5231 · lp 36047/7564/6229 · parado 0/0/455 · sDown 9885/3090/955 · sFire 9939/4262/2584 · sFwd 33548/11011/11957 · throw 2111/2041/0

**wei-long**: chk 18301/6846/6335 · chp 12058/3048/684 · clk 8862/3533/4192 · clp 8905/3646/3192 · hk 24671/6049/5783 · hp 32208/9157/9390 · lk 34902/4757/2979 · lp 36667/9189/8397 · parado 0/0/627 · projétil 0/15/0 · sDown 18430/7955/590 · sFire 6635/3433/1478 · sFwd 13357/5192/4258 · throw 1430/1370/0

**min-ji**: chk 18737/6357/4678 · chp 11596/2314/890 · clk 9789/2061/1948 · clp 9677/3886/3681 · hk 26321/7095/6151 · hp 33738/12678/12412 · lk 35659/10927/8527 · lp 42011/6818/6402 · parado 0/0/486 · sDown 10335/4951/2411 · sFire 17316/7604/5437 · sFwd 28611/9202/11148 · throw 2374/2302/0

**caio**: chk 17026/7327/5517 · chp 9814/2004/750 · clk 9613/4569/3919 · clp 8397/3415/3717 · hk 20696/6514/5202 · hp 30946/6218/4029 · lk 28990/9429/12383 · lp 35309/4947/4186 · parado 0/0/564 · sDown 13530/4815/4104 · sFire 10167/5023/2514 · sFwd 30862/12370/10535 · throw 1901/1836/0

**aminu**: chk 16504/6821/5596 · chp 9589/2157/525 · clk 7390/2983/3371 · clp 7448/3052/3344 · hk 24309/8396/5991 · hp 31169/10423/8389 · lk 27579/6493/8224 · lp 30528/8505/9082 · parado 0/0/400 · sDown 11768/1885/1287 · sFire 34882/8106/2987 · sFwd 9981/3931/1549 · throw 1135/1096/0

**centella**: chk 14875/5565/4631 · chp 8635/1586/596 · clk 8493/2660/2019 · clp 7614/3072/2738 · hk 20898/6218/4306 · hp 27532/7020/7313 · lk 26172/7721/8026 · lp 33727/6603/4772 · parado 0/0/505 · projétil 0/0/1 · sDown 434/293/0 · sFire 38347/15689/13527 · sFwd 12016/7044/499 · throw 1311/1256/0

**camille**: chk 18282/6863/5815 · chp 10751/2057/464 · clk 8679/3217/3828 · clp 8600/3183/3358 · hk 24516/6988/6064 · hp 33979/10197/9162 · lk 33450/8678/8548 · lp 33958/6536/5799 · sDown 51805/20832/15657 · sFire 10710/0/0 · sFwd 8639/266/74 · sResp 4337/4290/5 · throw 1171/1125/0

**nila**: chk 10909/4256/4018 · chp 7149/1243/389 · clk 6018/1953/2233 · clp 7452/3163/2669 · hk 13205/3201/3456 · hp 21995/5302/6693 · lk 20381/4627/6008 · lp 24268/5170/4498 · parado 0/0/515 · projétil 0/0/1 · sDown 36066/0/0 · sFire 15814/3205/4174 · sFwd 14595/4252/2415 · sarpa/chk 6662/1506/1240 · sarpa/chp 3966/832/295 · sarpa/clk 3565/1171/1002 · sarpa/clp 3732/1532/1147 · sarpa/hk 8096/1968/1861 · sarpa/hp 11196/2988/2913 · sarpa/lk 11320/2051/2588 · sarpa/lp 12955/2680/2288 · sarpa/sDown 34362/0/0 · sarpa/sFire 37186/16066/14400 · sarpa/sFwd 5396/2025/1513 · sarpa/throw 588/570/0 · throw 881/842/0

**baatar**: chk 17564/6604/6157 · chp 10093/1712/461 · clk 8589/3390/3821 · clp 8357/2406/2602 · hk 23037/7180/6370 · hp 34091/11463/8710 · lk 30363/7144/8859 · lp 37261/10949/12618 · parado 0/0/453 · sDown 30311/9623/8712 · sFire 11021/2903/0 · sFwd 14499/6038/5954 · throw 1105/1071/0

**zenon**: chk 19047/8000/6975 · chp 10896/2168/641 · clk 8881/3512/4176 · clp 8744/3449/4196 · hk 25677/7656/8027 · hp 30987/8476/9078 · lk 33014/2823/1638 · lp 40147/12245/14768 · parado 0/0/332 · sDown 558/485/2 · sFire 14550/8072/2605 · sFwd 38926/11513/12234 · throw 1498/1434/0
