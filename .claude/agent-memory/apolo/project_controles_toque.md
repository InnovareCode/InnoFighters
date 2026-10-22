---
name: project-controles-toque
description: Controles de toque redesenhados (2026-10-21) — "painel arcade de vidro", cor = função, fio claro + contorno, opacidade padrão .9; gerador/validador/capturas em arte-fonte/toque
metadata:
  type: project
---

2026-10-21: dono reprovou os botões de toque ("mal desenhados, feio demais"; antes já pedira menores, estilo joystick).
Entregue `docs/direcao-arte-controles-toque.md` + 33 SVGs gerados por `arte-fonte/toque/gerar-toque.mjs` (fonte única),
CSS de referência `arte-fonte/toque/toque-referencia.css` (não importado pelo jogo; Lyra porta para src/input/toque.css).
Aguardando aprovação do dono e porte da Lyra.

**Why:** símbolos PS (△○□✕) e bolhas translúcidas sem material não diziam nada; a gramática certa já estava no HUD
(miolo #05060f, filete claro, ouro = SUPER, ciano = ESQ).

**How to apply:**
- Cor = função: soco brasa, chute cobalto (famílias do logo), especial ouro, esquiva gelo, joystick/pausa aço neutro.
- Translucidez mata contraste: a borda é PAR fio claro (cor clara da função) + contorno escuro; mesmo assim só >= 3:1
  contra qualquer fundo com opacidade >= .9 (padrão). Medir sobre os pixels reais dos cenários, não só cores teóricas.
- Para mostrar CSS proposto no jogo real sem tocar código: Playwright remove o `<style data-vite-dev-id*=toque.css>`
  e injeta o arquivo de referência (`arte-fonte/toque/capturar-toque.mjs`, porta 5195).
- Pausa não pode ficar no canto do topo: no 844x390 com entalhe (47 px) colide com o retrato do P2.
- Relacionado: [[project-logo-paleta-d]].
