---
name: project-caio-capoeira
description: Auditoria de capoeira do CAIO (24/10/2026, docs/caio-capoeira-auditoria.md) — causa raiz do boxe, moveset proposto, 2 folhas a regerar e a referência que substitui a mestra
metadata:
  type: project
---

Dono reprovou o CAIO em 24/10/2026 ("nada a ver com capoeira"). Auditoria entregue em `docs/caio-capoeira-auditoria.md`; nada gerado.

- **Causa raiz (3, todas de prompt):** a mestra e a `caio-ref-guarda-v1` estão em guarda de BOXE (2 punhos); o BLOCO B diz
  "one fist guarding the face"; o BLOCO C da f3 é genérico (jab, direto, chute armado, uppercut). Só sai capoeira onde o pedido
  descreve capoeira (f1 v2, FILME v2, linhas 2-3 da f4).
- **Correção:** BLOCO B-capoeira ("hands ALWAYS OPEN, never a fist", "pose only from the cell") e anexar o `idle0` da f1 v2
  recortado (`referencia/caio-ref-ginga-v1.png`), nunca a mestra.
- **Moveset (frame data intacto):** lp galopante, hp cabeçada, lk bênção, hk armada, clp cotovelada, clk chapa baixa, chp queixada,
  chk rasteira, jkick voo do morcego; sFire = meia-lua de frente solta a ONDA VERDE; sDown rabo-de-arraia rente; sFwd = meia-lua
  de compasso solta (= close FILME f2). block = esquiva lateral; cblock = apelido do crouch (cocorinha).
- **Folhas:** G1 f3 inteira + G2 CR2 (sa0-2, win, sc1, jkick, block, jup, jtop) = 12 créditos; sa3/sb3 por cópia do idle.
- **Armadilhas para a Vega:** sa1 vira chute -> ponta `direita` e fixar `alturaDoProjetil` (spawn vem do tipY, montar.ts:215);
  recalibrar `caio-arte-calibrada.test.ts`.

**Why:** a mesma mestra/BLOCO B contaminaria qualquer folha futura do CAIO (f5, vitória, provocação).
**How to apply:** ao curar a f3 v2/CR2, reprovar qualquer punho fechado; jogo tem 4 botões (sem mp/mk). Ver
[[project-curadoria-sprites]], [[project-curadoria-filme]], [[project-nomes-combos]].
