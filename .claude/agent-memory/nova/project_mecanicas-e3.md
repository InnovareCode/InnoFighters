---
name: project-mecanicas-e3
description: Mapa de mecânicas da E3 do InnoFighters (docs/mecanicas-e3.md, 2026-10-20) — definição de primitiva x parâmetro, o que foi cortado da proposta do Apolo e por quê
metadata:
  type: project
---

Em 2026-10-20 entreguei `docs/mecanicas-e3.md`. Regra "máx 1 mecânica nova": **primitiva** = fluxo/estado novo
(type novo em updateMove, estado que dura além do golpe, gancho que intercepta applyHit, campo novo no C2);
**parâmetro** = campo com default neutro num ramo existente que só escolhe resultado que o motor já produz.
Primitivas: AMINU `carga` (pede C2 `spSeg?`, porque `sp` é só borda), CENTELLA `rebote`, CAMILLE `aparar`,
chefão `barras+cena+troca de ficha`; NILA reusa a troca de ficha (postura). Cortes propostos: CORDAS, MARMA, conversão
da GARKUWA, DEVEKH no jogável. Decisões ED-M1..ED-M10 pendentes do dono.

**Why:** contragolpe, armadura, agarrão e `through` já existem no motor — muita coisa da proposta virou parâmetro;
a CPU não pode gastar `rnd()` extra para quem não tem dica, senão o snapshot com semente 42 muda.
**How to apply:** ao revisar a E3 da Vega, checar fatias S0→S5 e se o snapshot ficou intocado; conferir no
PROGRESSO.md quais ED-M o dono respondeu. Relacionado: [[project-plano-expansao]].
