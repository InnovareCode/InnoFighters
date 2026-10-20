---
name: armadilhas-ui-innofighters
description: Armadilhas de UI/entrada do porte InnoFighters (CSS do toque do protótipo, canvas RS=2, ferramentas de shell) já resolvidas na Fase 1a
metadata:
  type: project
---

- Protótipo: no CSS do toque, `@media (orientation: portrait){#rot{display:block}}` vinha ANTES de `#rot{display:none}` e era anulado (aviso nunca aparecia). No porte (`src/input/toque.css`) a ordem foi invertida de propósito; único desvio visual da 1a. **How to apply:** se o dono estranhar o aviso em retrato, é isso; reverter = mover a media query de volta para cima.
- O CSS do toque é content-box com borda de 2px: a caixa medida de joystick/botões = tamanho calculado + 4px; o knob fica ~2px fora do centro em repouso (fiel ao protótipo). Testes e2e medem com essa folga — não "consertar" sem decidir mudar o visual.
- Canvas real é 1920x1080 (RS=2, `render/tela.ts`), desenho em coordenadas lógicas 960x540 via `usarEspacoLogico`. Mudar width/height do canvas reinicia o contexto (suavização é configurada depois).
- e2e importa módulos do src direto no navegador com `import(/* @vite-ignore */ '/src/x.ts' as string)` (só no dev server); o `as string` evita erro do tsc. Hook `window.__inno.entrada` existe só em `import.meta.env.DEV`.
- Ferramenta Bash: heredoc com apóstrofo em texto PT (ex.: "protótipo's") quebra o parse; usar Write para criar arquivos com texto. `python3` no Windows trava (stub) — usar node.
- Toque simulado no e2e: CDP `Input.dispatchTouchEvent` (projeto "celular" tem hasTouch); viewport paisagem via `page.setViewportSize` antes do `goto`.
- Fidelidade visual: `tests/e2e/fidelidade-prototipo.spec.ts` roda o protótipo original (file://, globais acessíveis por nome em evaluate: game, setKey, renderWorld, drawPose, CHARS, canvas, ctx) numa página, extrai a LeituraLuta + efeitos e compara o PNG 1920x1080 pixel a pixel com `desenharMundo`. Cada cena declara `exige` (o que o quadro precisa mostrar) porque a 1ª versão passou em quadros vazios (lutadores longe, sem golpe conectar). Mutação de 1 ponto de alfa no código quebra o teste. `SALVAR_QUADROS=<pasta>` grava os PNGs de referência.
- Protótipo: o piscar de invulnerabilidade (`globalAlpha=0.6` antes de `pose(im,1)`) é código morto (pose() sobrescreve o alfa); o render novo não o desenha de propósito.
- C3 não tem `dummy` (alvo do treino); o HUD recebe `alvoTreino` por opção até a Vega acrescentar.
