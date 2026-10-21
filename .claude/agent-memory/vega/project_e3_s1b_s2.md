---
name: e3-s1b-s2-baatar-aminu
description: E3 S1b (kit BAATAR) e S2 (AMINU) no motor — armadilhas que não se leem no código (alcance de agarrão vs corpo, carga segura o mt, dica fora do fluxo genérico, RNG)
metadata:
  type: project
---

Entregue em 2026-10-21 (contrato em docs/handoff-vega-e3-s1b-s2.md). Só o que não se deriva do código:

- **`agarrao.alcance` é distância entre os x e o rival nunca fica a menos de 78 px (`corpo+corpo`)**: o 70 do plano nunca agarraria (usei 96). **How to apply:** todo agarrão corpo a corpo novo (CENTELLA/NILA) com alcance < 78 é bug de dado; o teste que expõe é o de contato, não o de "campo lido".
- **A carga segura o `mt` em S−1**: tudo que anda por `mt` (`adv`, `rush`, brilho) precisou de guarda. Golpe novo que segura o `mt` = revisar `updateMove` inteiro.
- **Dica de CPU tira o golpe dos ramos genéricos** (`livre = canAfford && !ia`): muda comportamento só de quem declara `ia`; o snapshot não vê. A prova de "não gasta RNG" é o Proxy contando sorteios com dica FORA do alcance, em golpe que o genérico não filtra (normal). Implementar um papel novo quebra o teste da S0 de propósito (reescrevi).
- **`defesa-projetil` não sorteia a mais**: troca o bloqueio pelo escudo dentro do `rnd() < L.block` que já existia.
- **`trocaDeBarraNoTick` vazava entre rounds/lutas** (chamada direta de `resolverVidaZerada`): `clearFx` zera. A Íris provou com `it.fails`; o teste passou a passar e precisa virar `it`.
- **Working tree está em CRLF (`core.autocrlf`)**: Edit/Write às vezes devolvem LF; scripts de mutação precisam normalizar CRLF↔LF (padrão "não achado" enganoso). Converti `cpu.ts` e `lutadores/index.ts` de volta.
- **Dois agentes no mesmo tree**: `npm run typecheck`/`build` ficaram vermelhos por arquivo de teste alheio (`chefe-adversarial`, `zz-tmp-*`). Provar o meu filtrando o `tsc` por caminho + `vite build` direto, e dizer isso no handoff.
- BAATAR/AMINU são `LutadorDef` fora do elenco (id cast `as IdLutador`); entram em `IDS_LUTADORES` só na E5.
