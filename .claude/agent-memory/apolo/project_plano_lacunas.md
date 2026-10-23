---
name: project-plano-lacunas
description: Plano de arte de 23/10/2026 (CAIO/WEI novos, filme do especial, cenários cn/kr/br) — decisões e achados não óbvios
metadata:
  type: project
---

Plano entregue em `docs/plano-arte-lacunas-2026-10-23.md` (2026-10-23). Nada gerado; o Atlas pede à Runway.

- **Filme do especial (decisão minha, delegada pelo dono):** 3 camadas. Rajada de 3 quadros do atlas + close do impacto
  (folha FILME 3x2, 6 closes por lutador, 6 créditos) + reação do rival do atlas. A v1 roda sem arte; o piloto da folha
  FILME é o HAYATO, só depois de o `filme.ts` da Lyra rodar.
  **Why:** o atlas tem 410 px e já é ampliado 1,24x com zoom 1,0. Um busto em close daria 3,7x (borra); uma célula 2K 3x2
  dá 1,2x.
- **Cenários cn/kr/br "novos" = os mesmos JPG do jogo em 2752x1536.** Diferença de 2,8 a 3,5 contra o JPG esticado. A troca
  é só de resolução e WebP (cn q80, kr/br q70 para ≤ 250 KB).
- **O atlas v1 do CAIO mistura** folhas Runway com FX verde pintado e reações do protótipo (de frente, outro rosto). O
  atlas v1 do WEI usa a 153054 com FX, não a v4.
- **Armadilha:** `apresentacao-especiais.ts` aponta a tarja de `sFire` do CAIO e do WEI para `quadro: 'special'`. Com
  atlas novo, `getPD` cai no `idle0`: trocar para `sa2`.
- Referências de 1 figura criadas: `arte-fonte/lutadores/{caio,wei-long}/referencia/*-ref-guarda-v1.png` (L1C1 recortada).
  WEI f1: linhas de andar em step-and-drag (base larga).

**How to apply:** ao curar CAIO, WEI ou FILME, partir deste plano. Se o dono rejeitar o rosto do WEI 2x, há o plano B: o
conjunto D4 + v4 pelo pipeline, por 0 crédito. Ver [[project-curadoria-sprites]] e [[project-curadoria-cenarios]].
