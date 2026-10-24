---
name: project-supers-partitura
description: R-5 e R-13 do redesenho de jogabilidade (24/10/2026) — 12 supers escolhidos e nomeados, 20→17 combos, partitura do trailer com 1 super (ZENON P9); régua da tarja e armadilhas de contrato
metadata:
  type: project
---

Entregue em 24/10/2026: `docs/supers-e-combos-v2.md` (R-5) e `docs/partitura-trailer.md` (R-13). Dono aprovou D-R1..D-R8 da
spec (1 super/lutador, SFT+CFT, dano 1,35x filme teto 32). Nada aplicado no código ainda (Vega R-7/R-8/R-14).

- **Supers:** HAYATO TENRAI-KEN (sDown), WEI TAIJI ZHANG (sFire), MIN-JI TAEPUNG CHAGI (sDown), CAIO MEIA-LUA DE COMPASSO (sFwd),
  AMINU VALEU A ESPERA (MASHI nível 3 sem segurar), CENTELLA ESTRELLA FUGAZ (sFire), CAMILLE BOTTE SECRÈTE (sFwd), NILA PONTO
  VITAL (MARMA) / SARPA PICADA (SALTO; BOTE daria 13,5 de dano), BAATAR PESO DA ESTEPE (agarrão), ZENON CORTESIA DA CASA (selo) /
  chefe2 FIM DO BANQUETE (DECRETO).
- **Régua da tarja:** Bangers 48 px, livre = 1000 × 0,62 = 620 px; maior super 380 px. Teto 20 caracteres.
- **Combos 20→17:** descartados FLECHA (hp1 da CAMILLE é direto de savate em fente, não passa) e SEU LUGAR À MESA (hp1 do ZENON é
  palma reta) por V5, e CAVALGADA (V4 + bökh). HANA-DUL-SET ganhou id novo `min-ji-hana-dul-set`.
- **Armadilha:** o semQueda só vale em combo reconhecido; o motor TEM de aceitar o super como 3º passo do BÁSICO, senão o forte
  derruba e o super passa no vazio.
- **Trailer:** as guardas (idle0) dos 10 JÁ são distintas; o "robotizado" vinha de os dois ficarem parados. Regra: ninguém
  parado > 30 ticks, os dois juntos ≤ 12. Super só no P9 (filme CURTO, senão a logo corta). Precisa `Tomada.energia`.

**Why:** a próxima rodada (afinar ticks com a Vega, nomes no TREINO) parte daqui.
**How to apply:** ao afinar a partitura, mexa nas entradas e mantenha as batidas nos tempos; a recortar quadros de atlas, use o
script de folha via sharp no scratchpad (createRequire na raiz). Ver [[project-nomes-combos]], [[project-caio-capoeira]],
[[project-trailer-arte]].
