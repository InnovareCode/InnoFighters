---
name: e6a-harness-balanco
description: E6a — harness npm run balanco (frame data no motor + CPU x CPU), --ajustes "e se", correção SARPA e bug do npm run sprites; o que move a taxa de vitória e armadilhas
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit), contrato em `docs/handoff-vega-e6a.md`. Só o que não se deriva do código:

- **O que move a taxa de vitória da CPU é `hp` x `pow` x dano dos golpes comuns**, não armadura nem projétil nem tempo de preparação (WEI LONG ficou em 78-85% em todo teste isolado). Medir com `npm run balanco -- --ajustes '{...}'` antes de propor número. **How to apply:** nunca propor ajuste de balanceamento sem rodar o "e se".
- **WEI LONG e HAYATO são originais**: `dados.test`/`luta-fidelidade`/snapshot comparam hp/pow/mods com o protótipo. Ajustar os 4 originais exige decisão do Atlas (fixture dos dados do protótipo). Os 5 novos e o chefão não têm esse conflito.
- Harness = CLI Node (`ferramentas/balanco/cli.mjs`) que carrega os `.ts` pelo Vite SSR e divide a simulação em processos `fork`; semente = hash do TEXTO da tarefa (não da posição). `--completo` (16 000 lutas) leva ~40 s; resultado de referência em `docs/balanco/`.
- Ensaio de frame data: boneco de treino que bloqueia ANDA para trás (reposicionar antes do `startMove` e prender até ser atingido); golpe que erra o agachado é "alto", não "não bloqueável"; golpe sem `activeMove()` (projétil, agarrão, PARADE, VADIVU) tem regra própria de início/ativos.
- `LutadorDef.alturaEmPe` (opcional, SARPA 0,79) escala a hurtbox em pé só em idle/walk/block; ausente = conta antiga bit a bit. SARPA `sFwd`: `vy -14.5, vx 7.8` mantém o alcance (264 px) com o topo do sprite abaixo do relógio (y ~99).
- `npm run sprites` quebrou por import duplicado em `executar.mjs` que o Vitest tolera e o Node recusa: `tests/unit/ferramentas-node-puro.test.ts` roda `node --check` + `import()` + `--ajuda` por processo real.
- Ambiente: heredoc Bash com `$`/aspas + `python - <<'EOF'` quebrou ("unexpected EOF"); usar `Write` para arquivo grande. `.missao-atual` pode sumir no meio da sessão (o evento do painel então falha sem derrubar o trabalho).
