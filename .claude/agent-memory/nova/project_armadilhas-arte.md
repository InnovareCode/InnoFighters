---
name: project-armadilhas-arte
description: Armadilhas do protótipo e da arte nova do InnoFighters — linha 320 de 9 MB, tipX já escalado, chave magenta, FX rosa da MIN-JI
metadata:
  type: project
---

- `prototipo/inno-fighters-artefato.html` linha 320 = `const ASSETS` (~9 MB de Base64). Nunca dar Read sem pular;
  usar awk/grep -o com substr. Linha 321 = `POSEDATA` (legível, ~30 KB).
- No protótipo, `tipX/tipY` do POSEDATA já estão em px LÓGICOS relativos à âncora (multiplicados por K), enquanto
  `x,y,w,h,ax` estão em px do atlas. As caixas de acerto derivam de tipX/tipY (`buildMoves`) — ponta errada = alcance errado.
- Arte nova em `sprites/`: JPG com fundo magenta irregular (~(212,55,206) a (255,0,250)), 2 folhas de WEI LONG com fundo
  preto, MIN-JI sem grade e com FX rosa (conflita com a chave), sombras roxas de chão assadas, sem arte do HAYATO nem cenário do Japão.
- Flash de dano do protótipo duplica o atlas inteiro em branco (~260 MB decodificados) — risco de iPhone.

**Why:** cada item custou investigação para descobrir; repetir é desperdício.
**How to apply:** ao planejar pipeline de sprites, integração de arte ou memória em celular, partir daqui.
Relacionado: [[project-arquitetura-mvp]].
