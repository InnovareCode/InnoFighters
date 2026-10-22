---
name: project-logo-oficial
description: Logo oficial raster do dono (2026-10-22) substitui a vetorial; como o recorte sem halo foi feito, armadilhas de tamanho/geometria, onde estão pipeline e doc
metadata:
  type: project
---

2026-10-22: dono enviou `arte-fonte/logo/logo-oficial-dono-v1.jpg` (dragões, globo, INNO metal azul, FIGHTERS em
chamas, faixa do subtítulo). Substitui a logo vetorial de `src/ui/logo.ts` (paleta D1 fica obsoleta, ver
[[project-logo-paleta-d]]). Entregue: `public/assets/ui/logo/` + `docs/logo-oficial.md` + pipeline em
`arte-fonte/logo/pipeline/`. Lyra integra; Íris reescreve logo.spec/logo.test.

**Why:** a arte tem fundo em gradiente com névoa e brilho aditivo; chave de cor come contorno escuro e chama.

**How to apply:**
- Recorte que funcionou: fundo LOCAL por convolução normalizada + núcleo opaco (sementes claro/escuro, fecha 6 px,
  preenche buracos internos, raio azul saturado NÃO é semente) + color-to-alpha desmultiplicado fora do núcleo,
  cortando névoa alfa < 0,06; borda larga só na zona das chamas (dourado do dragão tem a cor da chama).
- Rotulagem de componentes em Python puro (floodfill PIL por buraco) travou > 10 min em 3,7 Mpx: usar Node.
- WebP 1600 dessa arte: q80 = 424 KB; teto 250 só com q54/a55 (PSNR 33,6). Textura escovada custa caro.
- Canvas do jogo é fixo 1920x1080 (RS=2, lógico 960x540): logo de título desenha ~937 px; 1600 é folga.
- No preview, `drawScene` direto exige `ctx.setTransform(2,0,0,2,0,0)` antes, senão desenha em 1/4 da tela.
- Splash com a arte original em caixa retangular deixa "caixa" visível: usar a placa (vinheta elíptica).
- `#rot` (aviso de orientação) fica ABAIXO dos botões de toque (z-index 4).
