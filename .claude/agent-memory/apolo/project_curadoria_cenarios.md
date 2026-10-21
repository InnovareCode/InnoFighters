---
name: project-curadoria-cenarios
description: Curadoria dos cenários do InnoFighters — linha real dos pés (84,5% da imagem), como provar contraste e como limpar canto de chão por código
metadata:
  type: project
---

Curadoria dos 6 cenários v1 entregue em 2026-10-20 (`docs/handoff-apolo-cenarios.md`): JP, MX, IN, MN aprovados;
NG e FR corrigir por código (objetos nos cantos de baixo).

**Why:** o documento de prompts diz "pés a 87%" (GROUND 470/540), mas `src/render/cenario.ts` desenha o fundo em
y=-20 com 580 de altura → os pés ficam a **84,5% da imagem**. Lutador ocupa de ~40% a 84,5% da altura; centro do
lutador vai de 8,8% a 91,2% da largura (clamp 60..900 de 960, fundo com 1020 de largura).

**How to apply:**
- Antes de curar cenário, confira `cenario.ts` (offset/altura do drawImage) e recalcule a linha dos pés.
- Contraste se prova colando o idle recortado (folha 1, maior componente sem a cor-chave) em escala de jogo
  (675 px; BAATAR 864) com os pés na linha real — vermelho=BAATAR, azul=CAMILLE, cinza=HAYATO.
- Limpar canto de chão pintado: translação de terra limpa da mesma linha (espelho cria mancha simétrica), rampa
  lateral larga (120) e rampa de topo curta (30) — topo longo traz o objeto de volta como fantasma. Em piso de lajes
  com perspectiva simétrica, espelho do canto oposto funciona; ponha a costura numa junta.
- Lutador escuro em piso escuro (ZENON no `gr`, 2026-10-21): mediana de luminância bota 0,012 x piso 0,0115 = 1,01:1.
  Conserto sem crédito: `scratchpad/apolo/piso2.ps1` (levanta o preto com tinta fria A=50/48/66 só abaixo da borda do piso)
  → 1,85:1 sem perder a noite; cinza neutro fica "leitoso". `chamas.ps1` acha os braseiros (o `gr` tem 6, a spec previa 8).
- Ver também [[project-curadoria-sprites]] para os scripts System.Drawing via PowerShell.
