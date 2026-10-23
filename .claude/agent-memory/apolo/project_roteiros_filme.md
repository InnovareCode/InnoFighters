---
name: project-roteiros-filme
description: Roteiros do filme dos especiais (V2-3b, 2026-10-23) — 4 modelos, folha FILME f0..f5, laudo A x B, pesos de mola; armadilhas dos prompts
metadata:
  type: project
---

Entregue `docs/roteiros-filme-especiais.md` (2026-10-23). Dono aprovou 3 camadas + piloto HAYATO; nada gerado.

- 4 modelos (chao/aereo 66, projetil 62, agarrao 58; CURTA 30) + tabela dos 31 por encaixes (PREP, R1-R3, IMPACTO,
  IMP2, SUBIDA/QUEDA, PEGA/GIRO/SLAM). Rajada do projétil = os 3 quadros do disparo (atacante pode estar a 600 px).
- Pedi à Lyra 4 adições ao §3.6: `tc` por batida (CURTA), pose `'$motor'` na última batida, página FILME com
  `painel: true` (close = painel, Alt = mundo), `peso: 0` válido.
- f0/f1/f2 = sFire/sDown/sFwd para todos (BAATAR reordenado); NILA f0-f3 = MARMA/ELEFANTE/BOTE/SALTO; ZENON f3 = DECRETO
  (costas de mão, não agarrão); grito do ZENON = `cena1`.
- **Conta corrigida:** 6 closes não cabem em 2048x1024 (2x620 > 1024). Página 2048x1280 = 10 MiB; 20 MiB por luta.
  Plano B 1536x960.

**Why:** prompts FILME mudam o BLOCO B (tira guarda e "Match ... exactly") porque idle com palma estendida (AMINU,
ZENON) ecoa a mestra; "dragon" desenha dragão; chute em three-quarter corta o pé (usar `full`).
**How to apply:** ao curar a folha FILME ou rever o filme na tela, partir desse doc e do critério go/no-go §6.3.
Mola: teto |1-s| ≤ 0,08 em arte desenhada, pivô na sola. Ver [[project-plano-lacunas]], [[project-prompts-runway]].
