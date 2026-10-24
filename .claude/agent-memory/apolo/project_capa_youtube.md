---
name: project-capa-youtube
description: Capa (thumbnail) do YouTube v1 (24/10/2026) feita por código com a arte real, sem Runway; pipeline Playwright+canvas, regras de texto e margem, variante recomendada A
metadata:
  type: project
---

Entregue em 24/10/2026: `arte-fonte/marketing/capa-youtube-v1-{A,B,C}.png` + `-A-1920x1080.png`; pipeline `capa.js` + `render.cjs`
na mesma pasta (`node render.cjs <saida> A,B,C [escala]`). Recomendada: A (HAYATO f3 × CAIO f4 espelhado, "A IA FEZ / ESTE JOGO").

**Why:** dono pediu capa "chamativa + frase de efeito", sem crédito Runway: tudo composto com filme.webp/idle0/cenários/logo.

**How to apply:**
- Compor em canvas no Chromium do Playwright (file:// + `--allow-file-access-from-files`): sharp/librsvg não carrega woff2, e a
  Bangers/Barlow do jogo só existem em woff2. Captura pelo screenshot do `<canvas>` (toDataURL quebra: canvas manchado por file://).
- Logo na capa: cortar a fita do subtítulo (topo 77,5% da altura + fade) — senão soma 5 palavras ilegíveis.
- Teto de 5 palavras derruba 3 das 4 frases do dono; encurtar e declarar. O HUD do jogo escreve "N HITS" (plural, Barlow 800
  itálico, #fff6b0→#ff7a1a, contorno #2a0d00), não "HIT". Super = 5 acertos: "10 HITS" só como combo + super (verificar).
- Margem 40 px: medir logo (largura × 0,546 de altura sem fita) e texto (size/2 + sombra) — errei 2 vezes no rascunho.
- PNG 1920 passa de 2 MB sem paleta; o render cai para palette q95 (562 KB), banding leve. Ver [[project-logo-oficial]].
