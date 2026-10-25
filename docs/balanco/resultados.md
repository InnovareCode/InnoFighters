# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + ENTRADA NO HITSTOP (motorV2.entradaNoHitstop) + FILMES ligados (motorV2.filmes) + COMBOS PRÓPRIOS ligados (motorV2.combos) + RITMO: intervalos+filmeRestrito+super+cadeia+cpu**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 86 s em 8 processo(s).
- Versão dos dados/motor: `061ae4485912` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-25.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `a115e01939248c55`.
Hash só das lutas regulares: `995c01a8db8ac7db` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `9c5110a3630b6ae5`.
**DIFERENTE** da rodada anterior (antes `08ea169c177fd566`, agora `a115e01939248c55`), e a versão dos dados/motor/harness mudou (`85024846dd5d` -> `061ae4485912`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | chefao | chefão nila DIFÍCIL | só 88.4% das lutas terminam por KO (meta >= 90%) |
| INFO | chefao | baatar x chefão zenon DIFÍCIL | nunca vence o chefão |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1951 | **54.2%** | 53%-56% | 57.5% | 50.9% | 56.7% | 51.7% | 106 s | 0.1% | 218 | 0 |
| wei-long | 3600 | 1760 | **48.9%** | 47%-51% | 50.3% | 47.5% | 50.8% | 46.9% | 109 s | 0.2% | 216 | 0 |
| min-ji | 3600 | 1781 | **49.5%** | 48%-51% | 53.1% | 45.9% | 49.7% | 49.3% | 112 s | 0.1% | 217 | 0 |
| caio | 3600 | 1838 | **51.1%** | 49%-53% | 54.8% | 47.3% | 55.8% | 46.3% | 96 s | 0.0% | 217 | 3 |
| aminu | 3600 | 1788 | **49.7%** | 48%-51% | 53.9% | 45.4% | 37.9% | 61.4% | 93 s | 0.0% | 212 | 3 |
| centella | 3600 | 1860 | **51.7%** | 50%-53% | 54.4% | 48.9% | 46.3% | 57.0% | 96 s | 0.0% | 219 | 3 |
| camille | 3600 | 1760 | **48.9%** | 47%-51% | 51.3% | 46.5% | 49.1% | 48.7% | 100 s | 0.0% | 214 | 3 |
| nila | 3600 | 1861 | **51.7%** | 50%-53% | 54.9% | 48.5% | 50.0% | 53.4% | 107 s | 0.0% | 217 | 0 |
| baatar | 3600 | 1745 | **48.5%** | 47%-50% | 51.6% | 45.3% | 53.6% | 43.4% | 103 s | 0.0% | 220 | 3 |
| zenon | 3600 | 1656 | **46.0%** | 44%-48% | 48.2% | 43.8% | 50.1% | 41.9% | 97 s | 0.1% | 213 | 0 |

Vantagem de lado: o P1 vence 53.0% das lutas (n=18000). Duração média 102 s; 0.1% das lutas decididas por TEMPO (0.0% dos rounds); 9 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 50 | 61 | 56 | 43 | 55 | 64 | 52 | 52 | 55 |
| **wei-long** | 51 | · | 52 | 48 | 50 | 51 | 39 | 46 | 52 | 53 |
| **min-ji** | 39 | 49 | · | 52 | 46 | 50 | 44 | 56 | 55 | 56 |
| **caio** | 44 | 53 | 48 | · | 62 | 47 | 47 | 52 | 52 | 56 |
| **aminu** | 57 | 51 | 54 | 39 | · | 40 | 58 | 45 | 43 | 61 |
| **centella** | 45 | 49 | 50 | 53 | 61 | · | 52 | 50 | 54 | 53 |
| **camille** | 36 | 61 | 56 | 54 | 42 | 49 | · | 47 | 55 | 43 |
| **nila** | 48 | 54 | 44 | 48 | 56 | 51 | 54 | · | 48 | 64 |
| **baatar** | 48 | 49 | 45 | 48 | 57 | 46 | 46 | 53 | · | 46 |
| **zenon** | 45 | 47 | 44 | 44 | 39 | 47 | 57 | 36 | 55 | · |

## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)

"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.

Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.

### Resumo

| Chefão | Desafiantes | Fator `danoRecebido` (do nível) | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **aminu** | 4 | 0.82 | NORMAL | **27.3%** (109/400) | 23%-32% | 26-30% | sim | 100% | 0% | 43 s | min-ji 12% | wei-long 36% | 0 |
| **aminu** | 4 | 0.9 | DIFÍCIL | **18.8%** (75/400) | 15%-23% | 13-19% | sim | 100% | 0% | 54 s | min-ji 8% | wei-long 28% | 0 |
| **centella** | 5 | 0.92 | NORMAL | **27.0%** (135/500) | 23%-31% | 24-28% | sim | 100% | 0% | 41 s | aminu 17% | wei-long 34% | 0 |
| **centella** | 5 | 0.82 | DIFÍCIL | **16.8%** (84/500) | 14%-20% | 12-18% | sim | 99% | 1% | 62 s | caio 6% | wei-long 23% | 0 |
| **camille** | 6 | 0.81 | NORMAL | **24.8%** (149/600) | 22%-28% | 22-26% | sim | 100% | 0% | 40 s | min-ji 17% | wei-long 32% | 0 |
| **camille** | 6 | 0.69 | DIFÍCIL | **14.3%** (86/600) | 12%-17% | 11-17% | sim | 97% | 3% | 69 s | min-ji 3% | aminu 36% | 0 |
| **nila** | 7 | 0.84 | NORMAL | **21.0%** (147/700) | 18%-24% | 19-23% | sim | 100% | 0% | 44 s | aminu 9% | camille 27% | 0 |
| **nila** | 7 | 0.71 | DIFÍCIL | **12.0%** (84/700) | 10%-15% | 9-15% | sim (critério fora) | 88% | 12% | 76 s | min-ji 7% | aminu 20% | 0 |
| **baatar** | 8 | 0.88 | NORMAL | **17.9%** (143/800) | 15%-21% | 17-21% | sim | 100% | 0% | 40 s | min-ji 11% | wei-long 25% | 0 |
| **baatar** | 8 | 0.7 | DIFÍCIL | **11.0%** (88/800) | 9%-13% | 8-14% | sim | 97% | 3% | 68 s | min-ji 5% | wei-long 20% | 0 |
| **zenon** | 9 | 0.79 | NORMAL | **17.2%** (155/900) | 15%-20% | 15-19% | sim | 100% | 0% | 41 s | caio 11% | hayato 22% | 0 |
| **zenon** | 9 | 0.72 | DIFÍCIL | **10.4%** (94/900) | 9%-13% | 7-13% | sim | 97% | 3% | 65 s | baatar 0% | aminu 26% | 0 |

### Chefão aminu

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **28.0%** (28/100) | 20%-37% | 41 s | 1.0 | 80% | 80% | 100% | 0% |
| wei-long | NORMAL | **36.0%** (36/100) | 27%-46% | 46 s | 1.0 | 88% | 88% | 100% | 0% |
| min-ji | NORMAL | **12.0%** (12/100) | 7%-20% | 45 s | 1.0 | 80% | 80% | 100% | 0% |
| caio | NORMAL | **33.0%** (33/100) | 25%-43% | 39 s | 1.0 | 84% | 84% | 100% | 0% |
| hayato | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 54 s | 1.0 | 63% | 63% | 100% | 0% |
| wei-long | DIFÍCIL | **28.0%** (28/100) | 20%-37% | 57 s | 1.0 | 79% | 79% | 100% | 0% |
| min-ji | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 59 s | 1.0 | 59% | 59% | 99% | 1% |
| caio | DIFÍCIL | **19.0%** (19/100) | 13%-28% | 48 s | 1.0 | 64% | 64% | 100% | 0% |

### Chefão centella

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **27.0%** (27/100) | 19%-36% | 41 s | 1.0 | 80% | 80% | 100% | 0% |
| wei-long | NORMAL | **34.0%** (34/100) | 25%-44% | 44 s | 1.0 | 90% | 90% | 100% | 0% |
| min-ji | NORMAL | **31.0%** (31/100) | 23%-41% | 44 s | 1.0 | 85% | 85% | 100% | 0% |
| caio | NORMAL | **26.0%** (26/100) | 18%-35% | 39 s | 1.0 | 84% | 84% | 100% | 0% |
| aminu | NORMAL | **17.0%** (17/100) | 11%-26% | 38 s | 1.0 | 72% | 72% | 100% | 0% |
| hayato | DIFÍCIL | **19.0%** (19/100) | 13%-28% | 62 s | 1.0 | 71% | 71% | 100% | 0% |
| wei-long | DIFÍCIL | **23.0%** (23/100) | 16%-32% | 63 s | 1.0 | 73% | 73% | 100% | 0% |
| min-ji | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 69 s | 1.0 | 70% | 70% | 96% | 4% |
| caio | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 56 s | 1.0 | 71% | 71% | 99% | 1% |
| aminu | DIFÍCIL | **21.0%** (21/100) | 14%-30% | 57 s | 1.0 | 69% | 69% | 100% | 0% |

### Chefão camille

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 40 s | 1.0 | 81% | 81% | 100% | 0% |
| wei-long | NORMAL | **32.0%** (32/100) | 24%-42% | 43 s | 1.0 | 83% | 83% | 100% | 0% |
| min-ji | NORMAL | **17.0%** (17/100) | 11%-26% | 43 s | 1.0 | 80% | 80% | 100% | 0% |
| caio | NORMAL | **23.0%** (23/100) | 16%-32% | 37 s | 1.0 | 76% | 76% | 100% | 0% |
| aminu | NORMAL | **21.0%** (21/100) | 14%-30% | 39 s | 1.0 | 81% | 81% | 100% | 0% |
| centella | NORMAL | **31.0%** (31/100) | 23%-41% | 40 s | 1.0 | 88% | 88% | 100% | 0% |
| hayato | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 76 s | 1.0 | 65% | 65% | 95% | 5% |
| wei-long | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 72 s | 1.0 | 70% | 70% | 94% | 6% |
| min-ji | DIFÍCIL | **3.0%** (3/100) | 1%-8% | 75 s | 1.0 | 62% | 61% | 95% | 5% |
| caio | DIFÍCIL | **3.0%** (3/100) | 1%-8% | 62 s | 1.0 | 53% | 53% | 98% | 2% |
| aminu | DIFÍCIL | **36.0%** (36/100) | 27%-46% | 63 s | 1.0 | 89% | 89% | 100% | 0% |
| centella | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 65 s | 1.0 | 72% | 72% | 99% | 1% |

### Chefão nila

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **25.0%** (25/100) | 18%-34% | 43 s | 1.0 | 79% | 79% | 100% | 0% |
| wei-long | NORMAL | **24.0%** (24/100) | 17%-33% | 48 s | 1.0 | 79% | 79% | 100% | 0% |
| min-ji | NORMAL | **14.0%** (14/100) | 9%-22% | 45 s | 1.0 | 80% | 80% | 100% | 0% |
| caio | NORMAL | **21.0%** (21/100) | 14%-30% | 41 s | 1.0 | 79% | 79% | 100% | 0% |
| aminu | NORMAL | **9.0%** (9/100) | 5%-16% | 40 s | 1.0 | 66% | 66% | 100% | 0% |
| centella | NORMAL | **27.0%** (27/100) | 19%-36% | 43 s | 1.0 | 81% | 81% | 100% | 0% |
| camille | NORMAL | **27.0%** (27/100) | 19%-36% | 46 s | 1.0 | 84% | 84% | 100% | 0% |
| hayato | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 76 s | 1.0 | 69% | 69% | 89% | 11% |
| wei-long | DIFÍCIL | **18.0%** (18/100) | 12%-27% | 79 s | 1.0 | 65% | 65% | 85% | 15% |
| min-ji | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 79 s | 1.0 | 62% | 62% | 85% | 15% |
| caio | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 70 s | 1.0 | 62% | 62% | 94% | 6% |
| aminu | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 74 s | 1.0 | 76% | 76% | 92% | 8% |
| centella | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 68 s | 1.0 | 60% | 60% | 97% | 3% |
| camille | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 86 s | 1.0 | 69% | 69% | 77% | 23% |

### Chefão baatar

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **15.0%** (15/100) | 9%-23% | 39 s | 1.0 | 77% | 77% | 100% | 0% |
| wei-long | NORMAL | **25.0%** (25/100) | 18%-34% | 42 s | 1.0 | 88% | 88% | 100% | 0% |
| min-ji | NORMAL | **11.0%** (11/100) | 6%-19% | 40 s | 1.0 | 73% | 73% | 100% | 0% |
| caio | NORMAL | **15.0%** (15/100) | 9%-23% | 38 s | 1.0 | 76% | 76% | 100% | 0% |
| aminu | NORMAL | **18.0%** (18/100) | 12%-27% | 37 s | 1.0 | 65% | 65% | 100% | 0% |
| centella | NORMAL | **21.0%** (21/100) | 14%-30% | 38 s | 1.0 | 78% | 78% | 100% | 0% |
| camille | NORMAL | **18.0%** (18/100) | 12%-27% | 41 s | 1.0 | 71% | 71% | 100% | 0% |
| nila | NORMAL | **20.0%** (20/100) | 13%-29% | 42 s | 1.0 | 78% | 78% | 100% | 0% |
| hayato | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 70 s | 1.0 | 71% | 71% | 97% | 3% |
| wei-long | DIFÍCIL | **20.0%** (20/100) | 13%-29% | 72 s | 1.0 | 71% | 71% | 99% | 1% |
| min-ji | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 69 s | 1.0 | 45% | 45% | 94% | 6% |
| caio | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 58 s | 1.0 | 46% | 46% | 98% | 2% |
| aminu | DIFÍCIL | **17.0%** (17/100) | 11%-26% | 66 s | 1.0 | 77% | 77% | 100% | 0% |
| centella | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 61 s | 1.0 | 61% | 61% | 99% | 1% |
| camille | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 77 s | 1.0 | 68% | 68% | 95% | 5% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 76 s | 1.0 | 67% | 67% | 95% | 5% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **22.0%** (22/100) | 15%-31% | 41 s | 1.0 | 71% | 71% | 100% | 0% |
| wei-long | NORMAL | **16.0%** (16/100) | 10%-24% | 44 s | 1.0 | 78% | 78% | 100% | 0% |
| min-ji | NORMAL | **15.0%** (15/100) | 9%-23% | 45 s | 1.0 | 78% | 77% | 100% | 0% |
| caio | NORMAL | **11.0%** (11/100) | 6%-19% | 38 s | 1.0 | 70% | 70% | 100% | 0% |
| aminu | NORMAL | **18.0%** (18/100) | 12%-27% | 38 s | 1.0 | 77% | 77% | 100% | 0% |
| centella | NORMAL | **12.0%** (12/100) | 7%-20% | 38 s | 1.0 | 65% | 64% | 100% | 0% |
| camille | NORMAL | **21.0%** (21/100) | 14%-30% | 42 s | 1.0 | 77% | 77% | 100% | 0% |
| nila | NORMAL | **20.0%** (20/100) | 13%-29% | 43 s | 1.0 | 70% | 70% | 100% | 0% |
| baatar | NORMAL | **20.0%** (20/100) | 13%-29% | 39 s | 1.0 | 62% | 62% | 100% | 0% |
| hayato | DIFÍCIL | **7.0%** (7/100) | 3%-14% | 63 s | 1.0 | 66% | 66% | 99% | 1% |
| wei-long | DIFÍCIL | **16.0%** (16/100) | 10%-24% | 66 s | 1.0 | 72% | 72% | 99% | 1% |
| min-ji | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 69 s | 1.0 | 58% | 58% | 96% | 4% |
| caio | DIFÍCIL | **15.0%** (15/100) | 9%-23% | 57 s | 1.0 | 60% | 60% | 99% | 1% |
| aminu | DIFÍCIL | **26.0%** (26/100) | 18%-35% | 61 s | 1.0 | 82% | 82% | 100% | 0% |
| centella | DIFÍCIL | **10.0%** (10/100) | 6%-17% | 59 s | 1.0 | 62% | 62% | 100% | 0% |
| camille | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 77 s | 1.0 | 67% | 66% | 92% | 8% |
| nila | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 74 s | 1.0 | 65% | 65% | 93% | 7% |
| baatar | DIFÍCIL | **0.0%** (0/100) | 0%-4% | 60 s | 1.0 | 41% | 41% | 99% | 1% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 32294 seguradas em 40452 usos) | 55.6% / 8.6% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (13961 em 31025) | 45.0% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (11359 acertos; faixas <10/10-25/25-50/≥50%: 4/2/1004/10349) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 17.06 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 5089 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 9.24 / 3.04 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: _lag 0/2196/0 · chk 19804/6075/4532 · chp 13281/2723/581 · clk 10442/2230/2133 · clp 20862/12073/5927 · hk 21032/6374/2793 · hp 35254/11381/5784 · lk 41473/9030/7232 · lp 39918/8697/5821 · parado 0/0/1512 · sDown 11264/13426/749 · sFire 11459/5625/2815 · sFwd 16459/7474/3627 · throw 1213/1181/0

**wei-long**: chk 20821/7867/5995 · chp 13185/2770/552 · clk 10240/4081/5240 · clp 14949/6787/5427 · hk 20910/5872/3860 · hp 41062/15050/9689 · lk 37130/4727/2750 · lp 43182/11504/9733 · parado 0/0/2183 · projétil 0/9031/0 · sDown 6471/2449/206 · sFire 11411/5957/2017 · sFwd 9227/4732/2155 · throw 977/919/0

**min-ji**: _lag 0/5106/0 · chk 20534/6103/4300 · chp 14583/2847/821 · clk 12287/2541/2363 · clp 12028/5351/4697 · hk 25863/9166/2990 · hp 37709/16421/10371 · lk 59548/21295/15242 · lp 44805/6535/4180 · parado 0/0/1785 · sDown 14206/26429/1387 · sFire 18367/9424/5581 · sFwd 17937/8156/4985 · throw 1501/1439/0

**caio**: _lag 0/4258/0 · chk 18996/8673/4950 · chp 11010/2173/553 · clk 18749/10423/6557 · clp 9225/3610/3382 · hk 22164/8905/4999 · hp 28414/6709/2912 · lk 38339/13548/15469 · lp 34931/4567/2895 · parado 0/0/1644 · sDown 5837/3152/1364 · sFire 12043/6621/2470 · sFwd 20980/22791/4271 · throw 1211/1168/0

**aminu**: chk 14868/5958/4389 · chp 9316/2132/393 · clk 7038/3024/3502 · clp 7066/3118/3431 · hk 19158/7602/3861 · hp 29320/13360/5441 · lk 30358/7917/8552 · lp 30075/10229/8782 · parado 0/0/1148 · sDown 3129/1173/74 · sFire 40452/17264/2717 · sFwd 10422/4752/1202 · throw 646/613/0

**centella**: _lag 0/154/0 · chk 14053/4873/3874 · chp 9804/2080/620 · clk 12044/5181/2520 · clp 14895/6468/5295 · hk 18626/6826/2615 · hp 26680/8474/5523 · lk 34157/11014/10919 · lp 31033/6932/4681 · parado 0/0/1682 · sDown 1147/687/0 · sFire 25797/28134/6450 · sFwd 20495/11372/915 · throw 1025/974/0

**camille**: chk 18605/6955/4995 · chp 10907/2330/426 · clk 16631/7692/6661 · clp 8275/3670/3368 · hk 20155/7170/3563 · hp 27943/9247/6504 · lk 32051/7570/8468 · lp 31887/7434/4884 · sDown 43902/19991/13689 · sFire 31025/9/0 · sFwd 13166/2694/182 · sResp 13961/13882/13 · throw 840/797/0

**nila**: _lag 0/4/0 · chk 10791/4068/3317 · chp 8142/1528/293 · clk 6508/2151/2480 · clp 11900/5590/4791 · hk 9626/2175/1856 · hp 23454/7963/5212 · lk 21986/5334/6135 · lp 25292/6041/4359 · parado 0/0/1669 · sDown 32526/0/0 · sFire 11879/12212/2079 · sFwd 9978/4388/1413 · sarpa/_lag 0/87/0 · sarpa/chk 6411/1372/998 · sarpa/chp 4137/973/249 · sarpa/clk 4375/1835/1129 · sarpa/clp 5236/3012/1282 · sarpa/hk 6149/1337/873 · sarpa/hp 10739/3624/2048 · sarpa/lk 17582/3763/3957 · sarpa/lp 12276/2979/2087 · sarpa/sDown 30367/0/0 · sarpa/sFire 43270/20168/13649 · sarpa/sFwd 6423/7156/1521 · sarpa/throw 558/544/0 · throw 503/480/0

**baatar**: _lag 0/12/0 · chk 18856/6905/5516 · chp 11157/1970/474 · clk 19338/8094/7736 · clp 9274/2721/2987 · hk 20514/6978/4697 · hp 29670/9052/7124 · lk 33820/7886/9165 · lp 36437/12242/11697 · parado 0/0/1458 · projétil 0/0/1 · sDown 13287/7213/3410 · sFire 12013/6041/0 · sFwd 25392/12613/10264 · throw 778/742/0

**zenon**: chk 17861/7846/5565 · chp 10477/2092/410 · clk 8232/3516/4086 · clp 15701/7677/6764 · hk 19072/7064/4856 · hp 26282/8236/6282 · lk 30978/2660/1189 · lp 32365/11705/11018 · parado 0/0/880 · sDown 1827/1563/46 · sFire 17152/18586/2946 · sFwd 34561/15048/10175 · throw 737/717/0
