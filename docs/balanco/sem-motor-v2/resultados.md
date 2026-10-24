# Resultados do balanceamento (CPU x CPU)

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

## Entradas desta rodada

- Modo **completo + ESQUIVA ligada + motor v2 DESLIGADO (o motor de antes)**: 100 sementes por combinação, níveis da CPU NORMAL e DIFÍCIL, semente-base 1.
- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.
- Total: 25800 lutas (18000 regulares + 7800 contra os chefões), 74 s em 8 processo(s).
- Versão dos dados/motor: `0a39396db39d` (hash de `src/data`, `src/fight`, `src/core` e dos `atlas.json`). Gerado em 2026-10-24.
- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.

## Determinismo (diferença entre rodadas)

Hash do resultado desta rodada: `88fe7e6d3689cb6b`.
Hash só das lutas regulares: `94bc91f1fdeb98e6` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: `689197be17326873`.
**DIFERENTE** da rodada anterior (antes `abb5dd0bdd4455bd`, agora `88fe7e6d3689cb6b`), e a versão dos dados/motor/harness mudou (`6c85cd3573e0` -> `0a39396db39d`): diferença esperada.

| Lutador | Taxa antes | Taxa agora |
|---|---|---|

## Sinalizações (outliers)

| Severidade | Categoria | Alvo | O quê |
|---|---|---|---|
| ATENCAO | chefao | chefão camille NORMAL | o jogador vence 27.7% (n=600), fora da meta 22-26% |
| ATENCAO | chefao | chefão nila DIFÍCIL | o jogador vence 8.9% (n=700), fora da meta 9-15% |
| ATENCAO | chefao | chefão baatar NORMAL | o jogador vence 14.1% (n=800), fora da meta 17-21% |
| ATENCAO | chefao | chefão zenon NORMAL | o jogador vence 13.8% (n=900), fora da meta 15-19% |
| ATENCAO | nunca-acerta | camille sFwd | usado 11307x e só 518 contato(s) (4.6%) |

## Taxa de vitória por lutador

Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.

| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hayato | 3600 | 1749 | **48.6%** | 47%-50% | 52.0% | 45.2% | 50.3% | 46.8% | 108 s | 0.0% | 208 | 0 |
| wei-long | 3600 | 2020 | **56.1%** | 54%-58% | 58.7% | 53.5% | 57.2% | 55.1% | 109 s | 0.0% | 214 | 0 |
| min-ji | 3600 | 1754 | **48.7%** | 47%-50% | 51.7% | 45.8% | 44.2% | 53.2% | 104 s | 0.0% | 212 | 0 |
| caio | 3600 | 1763 | **49.0%** | 47%-51% | 51.4% | 46.5% | 51.9% | 46.1% | 101 s | 0.0% | 212 | 0 |
| aminu | 3600 | 1759 | **48.9%** | 47%-50% | 51.9% | 45.8% | 41.4% | 56.3% | 108 s | 0.0% | 208 | 2 |
| centella | 3600 | 1843 | **51.2%** | 50%-53% | 55.8% | 46.6% | 52.3% | 50.1% | 105 s | 0.0% | 211 | 0 |
| camille | 3600 | 1604 | **44.6%** | 43%-46% | 48.3% | 40.8% | 40.2% | 48.9% | 105 s | 0.0% | 208 | 1 |
| nila | 3600 | 1724 | **47.9%** | 46%-50% | 50.8% | 45.0% | 49.2% | 46.6% | 117 s | 0.0% | 210 | 1 |
| baatar | 3600 | 1954 | **54.3%** | 53%-56% | 57.3% | 51.3% | 59.8% | 48.8% | 110 s | 0.0% | 218 | 0 |
| zenon | 3600 | 1830 | **50.8%** | 49%-52% | 54.2% | 47.5% | 53.5% | 48.2% | 109 s | 0.0% | 215 | 0 |

Vantagem de lado: o P1 vence 53.2% das lutas (n=18000). Duração média 108 s; 0.0% das lutas decididas por TEMPO (0.0% dos rounds); 20 round(s) empatado(s); 0 luta(s) travada(s).

## Matriz (linha vence coluna)

% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).

| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | zenon |
|---|---|---|---|---|---|---|---|---|---|---|
| **hayato** | · | 37 | 55 | 52 | 47 | 59 | 47 | 49 | 46 | 46 |
| **wei-long** | 63 | · | 67 | 59 | 55 | 53 | 54 | 60 | 48 | 47 |
| **min-ji** | 46 | 33 | · | 56 | 50 | 52 | 57 | 54 | 40 | 53 |
| **caio** | 48 | 41 | 45 | · | 50 | 50 | 57 | 57 | 42 | 51 |
| **aminu** | 53 | 45 | 51 | 50 | · | 39 | 59 | 45 | 46 | 52 |
| **centella** | 42 | 47 | 48 | 50 | 61 | · | 60 | 58 | 48 | 48 |
| **camille** | 53 | 46 | 43 | 43 | 41 | 40 | · | 47 | 42 | 45 |
| **nila** | 51 | 40 | 46 | 43 | 55 | 42 | 53 | · | 50 | 52 |
| **baatar** | 54 | 53 | 61 | 58 | 55 | 52 | 58 | 51 | · | 49 |
| **zenon** | 54 | 53 | 47 | 49 | 48 | 53 | 55 | 48 | 52 | · |

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
| **baatar** | 8 | 0.75 | DIFÍCIL | **10.4%** (83/800) | 8%-13% | 8-14% | sim | 98% | 2% | 66 s | camille 4% | aminu 23% | 0 |
| **zenon** | 9 | 0.75 | NORMAL | **13.8%** (124/900) | 12%-16% | 15-19% | **NÃO** | 100% | 0% | 42 s | camille 9% | aminu 23% | 0 |
| **zenon** | 9 | 0.73 | DIFÍCIL | **7.3%** (66/900) | 6%-9% | 7-13% | sim | 99% | 1% | 65 s | baatar 2% | aminu 13% | 0 |

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
| hayato | NORMAL | **9.0%** (9/100) | 5%-16% | 42 s | 1.0 | 77% | 77% | 100% | 0% |
| wei-long | NORMAL | **19.0%** (19/100) | 13%-28% | 43 s | 1.0 | 76% | 76% | 100% | 0% |
| min-ji | NORMAL | **13.0%** (13/100) | 8%-21% | 40 s | 1.0 | 72% | 72% | 100% | 0% |
| caio | NORMAL | **14.0%** (14/100) | 9%-22% | 39 s | 1.0 | 80% | 80% | 100% | 0% |
| aminu | NORMAL | **17.0%** (17/100) | 11%-26% | 44 s | 1.0 | 72% | 72% | 100% | 0% |
| centella | NORMAL | **15.0%** (15/100) | 9%-23% | 43 s | 1.0 | 84% | 84% | 100% | 0% |
| camille | NORMAL | **12.0%** (12/100) | 7%-20% | 41 s | 1.0 | 68% | 68% | 100% | 0% |
| nila | NORMAL | **14.0%** (14/100) | 9%-22% | 46 s | 1.0 | 75% | 75% | 100% | 0% |
| hayato | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 68 s | 1.0 | 52% | 52% | 99% | 1% |
| wei-long | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 66 s | 1.0 | 52% | 51% | 99% | 1% |
| min-ji | DIFÍCIL | **12.0%** (12/100) | 7%-20% | 61 s | 1.0 | 51% | 51% | 100% | 0% |
| caio | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 60 s | 1.0 | 65% | 65% | 100% | 0% |
| aminu | DIFÍCIL | **23.0%** (23/100) | 16%-32% | 71 s | 1.0 | 65% | 65% | 96% | 4% |
| centella | DIFÍCIL | **11.0%** (11/100) | 6%-19% | 61 s | 1.0 | 59% | 59% | 100% | 0% |
| camille | DIFÍCIL | **4.0%** (4/100) | 2%-10% | 66 s | 1.0 | 61% | 61% | 100% | 0% |
| nila | DIFÍCIL | **14.0%** (14/100) | 9%-22% | 79 s | 1.0 | 72% | 72% | 92% | 8% |

### Chefão zenon

| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |
|---|---|---|---|---|---|---|---|---|---|
| hayato | NORMAL | **13.0%** (13/100) | 8%-21% | 43 s | 1.0 | 68% | 68% | 100% | 0% |
| wei-long | NORMAL | **12.0%** (12/100) | 7%-20% | 43 s | 1.0 | 65% | 65% | 100% | 0% |
| min-ji | NORMAL | **11.0%** (11/100) | 6%-19% | 39 s | 1.0 | 66% | 66% | 100% | 0% |
| caio | NORMAL | **16.0%** (16/100) | 10%-24% | 41 s | 1.0 | 69% | 69% | 100% | 0% |
| aminu | NORMAL | **23.0%** (23/100) | 16%-32% | 43 s | 1.0 | 75% | 75% | 100% | 0% |
| centella | NORMAL | **16.0%** (16/100) | 10%-24% | 41 s | 1.0 | 62% | 62% | 100% | 0% |
| camille | NORMAL | **9.0%** (9/100) | 5%-16% | 40 s | 1.0 | 60% | 60% | 100% | 0% |
| nila | NORMAL | **14.0%** (14/100) | 9%-22% | 44 s | 1.0 | 65% | 65% | 100% | 0% |
| baatar | NORMAL | **10.0%** (10/100) | 6%-17% | 45 s | 1.0 | 80% | 80% | 100% | 0% |
| hayato | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 66 s | 1.0 | 64% | 64% | 100% | 0% |
| wei-long | DIFÍCIL | **8.0%** (8/100) | 4%-15% | 64 s | 1.0 | 58% | 57% | 99% | 1% |
| min-ji | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 63 s | 1.0 | 66% | 64% | 99% | 1% |
| caio | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 59 s | 1.0 | 69% | 68% | 100% | 0% |
| aminu | DIFÍCIL | **13.0%** (13/100) | 8%-21% | 66 s | 1.0 | 74% | 74% | 100% | 0% |
| centella | DIFÍCIL | **9.0%** (9/100) | 5%-16% | 61 s | 1.0 | 57% | 57% | 100% | 0% |
| camille | DIFÍCIL | **5.0%** (5/100) | 2%-11% | 66 s | 1.0 | 51% | 50% | 98% | 2% |
| nila | DIFÍCIL | **6.0%** (6/100) | 3%-12% | 73 s | 1.0 | 57% | 56% | 95% | 5% |
| baatar | DIFÍCIL | **2.0%** (2/100) | 1%-7% | 64 s | 1.0 | 54% | 54% | 100% | 0% |

## Uso das mecânicas pela CPU

| Mecânica | Medida | Valor | Meta |
|---|---|---|---|
| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de 30415 seguradas em 42647 usos) | 54.5% / 8.2% | ≥ 30% |
| CAMILLE PARADE | usos que aparam algo (5254 em 11931) | 44.0% | ≥ 25% |
| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (8894 acertos; faixas <10/10-25/25-50/≥50%: 0/0/601/8293) | 100.0% | ≥ 50% |
| NILA troca de postura | trocas por luta | 21.40 | – |
| BAATAR agarrões | agarrões em 3600 lutas | 4864 | – |
| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | 6.64 / 2.33 | – |

## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)

Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.

**hayato**: chk 20206/6594/5469 · chp 12383/2664/950 · clk 10063/2334/2135 · clp 10151/4211/4052 · hk 23773/6019/4591 · hp 33891/9336/7693 · lk 35784/6853/5555 · lp 41104/8489/6833 · parado 0/0/539 · sDown 10929/3426/1207 · sFire 11478/5047/3009 · sFwd 39918/13100/13912 · throw 2462/2370/0

**wei-long**: chk 21448/8111/7281 · chp 13138/3568/795 · clk 9496/3945/4642 · clp 9427/3923/3617 · hk 28400/6739/6431 · hp 34623/9669/10673 · lk 35432/4581/2933 · lp 39055/10148/9111 · parado 0/0/775 · projétil 0/4252/0 · sDown 21773/5670/731 · sFire 7948/3506/1761 · sFwd 15533/5556/4968 · throw 1769/1712/0

**min-ji**: chk 21291/7194/5046 · chp 12653/2884/998 · clk 10169/2334/2018 · clp 10223/4292/3981 · hk 28015/7152/6491 · hp 36875/14981/13095 · lk 36236/9905/9432 · lp 49157/9247/7343 · parado 0/0/648 · sDown 11715/14391/6576 · sFire 22827/16475/13257 · sFwd 34976/11352/12705 · throw 2881/2780/0

**caio**: chk 18556/7514/6245 · chp 10658/2323/905 · clk 8657/3758/4143 · clp 8728/3690/4136 · hk 21029/5688/6014 · hp 34920/7376/4473 · lk 31490/10449/13451 · lp 41669/6892/5615 · parado 0/0/595 · sDown 15820/5898/4846 · sFire 12135/6156/2995 · sFwd 35981/13569/12482 · throw 2272/2178/0

**aminu**: chk 20012/8246/7103 · chp 11110/2672/604 · clk 8127/3509/4045 · clp 8200/3595/4086 · hk 25799/7313/7427 · hp 33503/10030/10572 · lk 32204/8037/10094 · lp 35567/10847/11353 · parado 0/0/533 · sDown 14762/2563/1614 · sFire 42647/9895/3906 · sFwd 10984/3240/2065 · throw 1549/1505/0

**centella**: chk 18002/6523/5287 · chp 9364/2081/882 · clk 8090/2560/2475 · clp 7978/3378/3233 · hk 22931/5794/5160 · hp 31880/8425/8540 · lk 29957/8985/9488 · lp 48410/7756/6095 · parado 0/0/622 · projétil 0/0/1 · sDown 537/352/0 · sFire 44990/16990/15989 · sFwd 15586/8918/638 · throw 2243/2150/0

**camille**: chk 21470/8491/7014 · chp 11812/2691/669 · clk 8994/3837/4332 · clp 8959/3768/4000 · hk 27234/7577/7276 · hp 35459/10180/10854 · lk 34801/8120/10398 · lp 36602/8397/6579 · sDown 59960/25024/19105 · sFire 11931/0/0 · sFwd 11307/408/110 · sResp 5254/5210/6 · throw 1641/1587/0

**nila**: chk 11945/4784/4393 · chp 7599/1460/503 · clk 6525/2231/2465 · clp 6376/2670/2984 · hk 14999/3928/3942 · hp 23277/6056/7390 · lk 21680/5276/6550 · lp 25904/6001/5026 · parado 0/0/624 · sDown 40382/0/0 · sFire 19044/4118/4930 · sFwd 15572/4096/2714 · sarpa/chk 8443/1900/1547 · sarpa/chp 4528/1082/378 · sarpa/clk 3390/1145/1174 · sarpa/clp 3373/1327/1394 · sarpa/hk 10610/2625/2355 · sarpa/hp 13118/4002/3633 · sarpa/lk 13406/2587/3291 · sarpa/lp 15296/3430/2844 · sarpa/sDown 38685/0/0 · sarpa/sFire 47286/19850/18042 · sarpa/sFwd 7216/2653/1983 · sarpa/throw 862/828/0 · throw 1109/1075/0

**baatar**: chk 21447/8038/7318 · chp 11299/2224/680 · clk 9257/3861/4455 · clp 9408/2963/3126 · hk 26271/7790/7392 · hp 35017/9744/10641 · lk 35172/8312/10216 · lp 44979/13053/14688 · parado 0/0/578 · sDown 36344/11266/10988 · sFire 12239/3253/0 · sFwd 18554/7743/7807 · throw 1665/1611/0

**zenon**: chk 21540/9243/8021 · chp 11945/2647/791 · clk 9289/3896/4651 · clp 9242/3942/4755 · hk 27838/7945/9193 · hp 32764/9332/9933 · lk 36266/2965/1961 · lp 41710/13008/16346 · parado 0/0/340 · sDown 847/689/23 · sFire 18138/10300/3268 · sFwd 43006/12871/13837 · throw 1899/1840/0
