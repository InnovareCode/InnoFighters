---
name: e3-chefe-s0-s1a
description: E3 S0/S1a (C3 aditivo + chefão no motor) — armadilhas do resolverVidaZerada, reuso de Game/Fighter entre lutas, estado da dica de CPU
metadata:
  type: project
---

Entregue em 2026-10-20 (docs/handoff-vega-e3-s0-s1a.md tem o contrato). Só o que não se deriva do código:

- **Efeito dentro de `resolverVidaZerada` é sobrescrito**: `applyHit`/`arremessar` gravam `hitstop/shake` depois dele. A troca de barra usa a flag `trocaDeBarraNoTick` + `reforcarTrocaDeBarra()` no fim dos dois chamadores. NÃO trocar por `hitstop = max(...)` geral: muda o lock-step quando dois golpes acertam no mesmo tick. **How to apply:** próximo gancho nesse ponto (S2 `quebraGuarda`, S4 `parry`) sofre do mesmo problema.
- **`Game`/`Fighter` são reaproveitados entre lutas**: todo estado de chefe/ficha é desfeito em `Fighter.setChar` (há teste). Estado novo por lutador (carga, postura) tem que entrar aí e no `reset`.
- **`cfg.chefe` sem `LutadorDef.chefe` é ignorado** de propósito (a fixture `?expansao=1` da Lyra tem 9 ids e CHEFE; lançar erro quebraria a luta de dev).
- **Dica de CPU é só esqueleto**: `planoPorDica` (cpu.ts) devolve null sem sortear; nenhum papel implementado. A guarda é `me.ch.dicasIa.length > 0`. Prova da regra de RNG = teste com Proxy contando sorteios + snapshot semente 42.
- **`fase-chefe` sai em 3 etapas** (troca/danca/retomada); o handler da Lyra em `ui/cenas/fight.ts` precisava filtrar `etapa === 'troca'` (avisado no handoff).
- Teste de "mesmo tick" só vale se montar o tick (zerar hitstop, `tick60 = 59`). Mutar sempre (6 mutantes mataram os testes certos).
