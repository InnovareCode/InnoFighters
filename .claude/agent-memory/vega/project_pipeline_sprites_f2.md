---
name: pipeline-sprites-f2
description: F2 (ferramentas/sprites) — decisões e armadilhas do pipeline folhas 4x3 -> atlas C1 v2: fundo medido, figuras coladas, ponta por modo, escala única
metadata:
  type: project
---

F2 entregue em 2026-10-20 (sem commit): `npm run sprites -- <id>` -> `sprites-gerados/<id>/` (gitignored), contact-sheet em `arte-fonte/lutadores/<id>/`. Ferramenta em `.mjs` (precedente do repo) + testes que importam via `tests/unit/_ferramenta.ts`. Detalhes: `docs/handoff-vega-f2.md`.

- **Fundo da Runway não é a cor pedida** (magenta ≈ 253,40,246; verde ≈ 7,252,4; deriva ~15 unidades). **Why:** chave com cor fixa deixa halo. **How to apply:** medir o fundo (mediana da borda) e usar tolerância + rampa + despill só na borda.
- **Figuras coladas** (HAYATO f3: pé do `lk1` no cabelo do `clk`) quebram a contagem de 12 componentes. Corte reto no pescoço mais fino FALHA (corta a perna e deixa pé flutuando); funciona **erosão + BFS** ao miolo mais perto. **How to apply:** nunca separar com linha reta.
- **Ponta do golpe = "ponto mais à direita" erra** em base larga (pé da frente empata com a mão): modos `mao` (ignora 22% de baixo), `direita` (chutes), `cima` (antiaéreo), por pose em `poses.mjs` + exceções em `lutadores.json`. Média de y na faixa precisa ser só do grupo contíguo (senão cai no vazio entre mão e pé).
- **Escala única por lutador** (a do idle0 -> 410 px = alturaRef legado, K do jogo não muda); iterar a calibração e gravar `alturaRef` = altura real do idle0 (uma passada deu 409).
- **Teste que prova corte de borda** precisa de lixo a < 24 px da figura, senão é descartado de qualquer jeito e o mutante sobrevive. Sempre mutar 1 coisa e ver o teste cair.
- **Armadilhas de ambiente:** `python3 -` com heredoc quebrado no Bash trava esperando stdin (taskkill); no Windows `sharp.cache(false)` evita EPERM ao apagar tmp do teste; `import` de `.mjs` em teste TS sem `.d.ts` -> TS7016, usar o helper de URL dinâmica.
- Pendente/ideia: ancorar `ax` pelos pés em vez do centro de massa se a F3 achar que o corpo "empurra" nos golpes longos (função `centroDeMassaX`).
- **.gitignore sem âncora** (`sprites/`) ignorava `ferramentas/sprites/`; virou `/sprites/`. Ao criar pasta nova, `git check-ignore -v <arquivo>` antes de dar por entregue.
