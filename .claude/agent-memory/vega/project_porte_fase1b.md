---
name: porte-fase1b-luta-audio
description: Fase 1b (src/fight, src/audio) — como foi provada a fidelidade ao protótipo e quirks do protótipo preservados de propósito
metadata:
  type: project
---

Fase 1b entregue em 2026-10-20 (fight/ + audio/). Detalhes de API estão no código e no handoff; aqui só o que não se deriva dele.

- **Prova lock-step**: `tests/unit/luta-fidelidade.test.ts` roda a lógica REAL do protótipo (`new Function` sobre as linhas 619-1255 via `_prototipo-luta.ts`) ao lado do porte, mesmas entradas roteirizadas, comparando estado + sons TODO tick (21 cenários, ~100k ticks). Para dar certo: Math.random do protótipo = RNG com semente, AudioSys = gravador, e `sparks/burst/dust/floatText` = no-op (no porte viram eventos e não consomem o RNG da CPU). `_fake-audio.ts` + `audio.test.ts` fazem o mesmo para o AudioSys (grafo Web Audio idêntico).
- **Mutação**: sempre mutar 1 constante e ver o teste falhar antes de confiar nele. Amostragem curta enganou 2x (música: só 40 passos cobriam 1/3 do LEAD; armadura: limiar `> 0` vs `> 1` sobrevive, borda rara).
- **Quirks do protótipo preservados (zero mudança)**: (1) projétil tem `lvl` sempre 'mid' porque `PROJ_BASE` vem depois no Object.assign — o tremor "rasteiro" de WEI LONG NÃO exige agachar; (2) em KO o `applyHit` sobrescreve `shake=14/hitstop=14` do `ko()` por 9/6; (3) `ch.idleRate` nunca existe (usa 9). Se alguém "consertar", é mudança de balanceamento, não de porte.
- **Eventos de setup**: `Game.setup()` roda fora de `update()`; eventos dele ficam em `pendentes` e entram no primeiro `update()` (senão o `roundStart` se perderia).
- **Entradas lazy**: `Game.update(fonte)` só chama `fonte.p1/p2` quando o protótipo chamava `readInput` (fase 'fight', lutador sem CPU) — a borda de descida (C2) não pode ser consumida em hitstop/intro.
