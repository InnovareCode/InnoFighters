# WEI LONG — curadoria das folhas de sprite (proposta de conjunto canônico)

Autor: Apolo (direção de arte) · 2026-10-20 · Fase 2 do `PLANO.md` (pipeline de sprites)
Escopo: as 7 folhas de `sprites/WEI LONG/` (o cenário do templo fica de fora). **Nenhuma imagem foi editada nem movida.**

## 0. Resumo da decisão

| Papel no lutador | Folha canônica | Status |
|---|---|---|
| Base (idle + andar) | `Kung_fu_master_sprite_sheet_2K_20261020153007.jpg` | usar como está |
| Movimento e reação (agachar, defesa, pulo, dano, queda, KO) | `Kung_fu_master_sprite_sheet_2K_20261020153112.jpg` | usar como está |
| Golpes normais (socos/palmas, chutes, golpes agachados) | `Kung_fu_master_sprite_sheet_2K_20261020153710.jpg` | usar no MVP; **editar** braçadeiras e faixa (seção 4) |
| Especiais + chute aéreo + vitória | `Kung_fu_master_sprite_sheet_2K_20261020153054.jpg` | **editar/regenerar** antes da integração (FX lilás e túnica curta) |
| Descartadas | `...153049.jpg`, `Gemini_..._rncovy....jfif`, `Gemini_..._8hwvqp....jfif` | ficam na pasta como reserva, fora do pipeline |

Isso bate com o layout de 4 folhas 4×3 que o protótipo já espera (os nomes do `ALIAS` em
`prototipo/inno-fighters-artefato.html`, linhas 375-379): `idle0-3 + walk0-7` / `crouch, block, cblock, jsquat, jup, jtop,
jfall, land, hitH, hitB, kdAir, koFloor` / `lp, hp, lk, hk, clp, clk, sweep, upper` / `sa0-3, sb0-3, sc0-1, jkick, win`.

## 1. Correção ao PLANO.md §2.4 (medido, não estimado)

- **As 7 folhas têm fundo magenta. Nenhuma tem fundo preto.** O que parece "preto" em `153049` e `153112` é a **borda externa
  e a grade escura**: os cantos dessas duas medem (15..75, 0, 14..75), mas 73-74% dos pixels amostrados são magenta.
- **3 folhas têm grade escura** (`153007`, `153049`, `153112`: 100% dos pixels nas colunas x=600/1200/1800 são escuros).
  As outras 4 (`153054`, `153710` e as duas `.jfif`) **não têm grade**, mas seguem um 4×3 regular.
- Todas medem 2400×1792. Faixa do magenta de fundo (pixels a distância < 120 de (255,0,255)): R ≥ 167, G ≤ 79, B ≥ 153
  — exceto `153054`, onde o halo dos FX empurra G até 119.
- **As duas `.jfif` são a mesma imagem.** Diferença média por pixel (soma RGB) entre elas: **14,3**; entre `rncovy` e uma folha
  diferente (`153007`) no mesmo método: **105,8**. A `8hwvqp` é uma recompressão/upscale da `rncovy` com nitidez exagerada
  (halo escuro em volta do contorno e 10× mais pixels de franja lilás: 74 contra 7).

Método: script PowerShell + C# (LockBits) em diretório temporário, lendo as folhas originais só para leitura; bbox por célula
de 600×597 com margem de 14 px; amostragem a cada 2 px.

## 2. Tabela das 7 folhas

Legenda de traje: **painel longo** = avental azul da túnica descendo até a canela; **túnica curta** = termina no quadril.
Altura = bbox do personagem na célula (px da folha). "≥" = encostou na margem de medição (figura a < 15 px da linha).

| Folha | Conteúdo (linha a linha) | Grade | Quadros | Fundo | Escala | Traje / rosto | Sombra de chão | FX desenhados | Defeitos |
|---|---|---|---|---|---|---|---|---|---|
| **153007** | L1: idle em base de cavalo, palma à frente (4). L2-L3: andar de perfil, punhos baixos (8) | sim, escura | 12 | magenta + grade | idle 528; andar ≥ 536-568 | painel longo, dragão dourado grande, braçadeira preta | não | não | Andar com postura ereta e mãos baixas: salto de silhueta na transição idle→andar. Pés a ~5-15 px da linha inferior (não cortados) |
| **153049** | L1: agachado ajoelhado, defesa em pé, defesa alta braços cruzados, decolagem. L2: subida, ápice encolhido, queda, aterrissagem. L3: dano alto, dano no corpo, queda no ar, KO no chão | sim, escura | 12 | magenta + grade e borda escura | em pé 558-568 | **túnica curta**, dragão grande, braçadeira preta | não | traços pretos de impacto nos 2 quadros de dano | **Queda e KO com a cabeça para a direita** (lado para onde ele olha): lê como queda para a frente, não como ser arremessado para trás. Fio do cabelo do KO toca a borda da célula |
| **153054** | L1: carga de chi (orbe), Palma do Dragão (cabeça de dragão lilás), pós-disparo, em pé neutro. L2: joelho erguido, pisão com explosão + chão rachado, avanço baixo, retorno à guarda. L3: guarda, investida com aura lilás, chute voador, vitória (braços cruzados) | **não** (4×3 livre) | 12 | magenta | em pé 552-568 | **túnica curta**, dragão pequeno, braçadeira preta | **sim**: chão rachado/pedras no pisão | **sim, muitos**: dragão, orbe, explosão, aura — todos lilás/violeta | **FX lilás sobre magenta** (~26 mil pixels amostrados de FX; o halo dele cai dentro da tolerância do fundo) → o recorte por cor vai comer o brilho. Cabeça de dragão invade a coluna 3 (x 1000-1370), quase encostando no quadro vizinho. A investida desenhada é um **soco**, mas o especial (TIE SHAN KAO) é uma **ombrada** |
| **153112** | Mesma pauta da 153049: L1: guarda baixa, defesa em pé, guarda semi-agachada, decolagem. L2: subida, ápice, queda, aterrissagem agachada. L3: dano alto, dano no corpo, arremessado para trás, KO deitado | sim, escura | 12 | magenta + grade e borda escura | em pé 562-564 | painel longo, **dragão pequeno**, braçadeira preta | não | traços pretos de impacto no dano alto | KO ocupa a célula inteira na largura (pé direito a ~15 px da borda, não cortado). Falta um agachado "fundo" de verdade (a guarda baixa tem 486 px contra 564 em pé) |
| **153710** | L1: guarda, preparo da palma, guarda média, palma estendida em avanço. L2: joelho (preparo), chute médio, joelho, chute alto. L3: guarda baixa com braço varrendo, chute agachado, rasteira sentada, gancho com punho erguido | **não** (4×3 livre) | 12 | magenta | em pé 562-568 | painel longo, dragão grande **dos dois lados**, **braçadeiras de couro marrom** e **faixa preta na cintura**, barba visivelmente mais longa | não | não | Traje diverge do resto (braçadeira marrom, faixa, barba). Chute alto (L2C4) quase encosta na célula vizinha (x até 2312) |
| **Gemini rncovy (.jfif)** | L1: idle (4). L2: andar em guarda, túnica curta (4). L3: andar em guarda, **painel longo** (4) | não | 12 | magenta | idle ~548; andar 564-566 | **o traje muda dentro da própria folha** (L1-L2 curta, L3 longa); dragão pequeno | não | não | Inconsistência interna de traje; quadros de idle quase idênticos entre si (respiração quase imperceptível) |
| **Gemini 8hwvqp (.jfif)** | Idêntica à `rncovy` | não | 12 | magenta | idem | idem | não | não | Duplicata degradada: nitidez exagerada, halo escuro no contorno, mais franja lilás → pior para recorte |

Pontos comuns às 7: todas olham para a **direita**, cabelo branco com coque, rosto e proporções coerentes; escala dos quadros
em pé fica entre 548 e 568 px (variação de ~4%), então a normalização pela altura do idle resolve sem ajuste pesado.

## 3. Conjunto canônico mínimo e cobertura

### 3.1 Por que estas quatro
- **Traje:** o painel longo é maioria (153007, 153112, 153710) e é a silhueta mais forte do personagem — o avental lê
  "mestre" de longe e balança bem no pulo e na queda. Com ele como padrão, só a folha de especiais destoa.
- **Recorte:** as duas folhas com mais quadros "de corpo inteiro rente à linha" (base e reação) são exatamente as que têm
  grade → fatiamento por grade, com recuo de ~8 px para tirar a linha escura. As sem grade (normais e especiais) têm
  espaçamento folgado, exceto onde há FX.
- **153112 em vez de 153049:** mesmo traje das outras (painel longo), queda e KO na direção correta (arremessado para trás,
  cabeça para a esquerda) e sem o fio de cabelo encostando na borda.
- **153007 em vez das `.jfif`:** traje único na folha toda, grade para recorte, e entrega exatamente os 12 quadros
  `idle0-3 + walk0-7` do layout. A `rncovy` troca de traje no meio da folha.

### 3.2 Mapa quadro → pose do jogo

| Pose (`ALIAS`) | Folha · célula (linha, coluna) | Observação |
|---|---|---|
| idle0-3 | 153007 · L1 C1-C4 | loop de respiração |
| walk0-7 | 153007 · L2 C1-C4, L3 C1-C4 | o andar para trás pode tocar a sequência ao contrário |
| crouch | 153112 · L2 C4 (aterrissagem) | melhor que a L1 C1, que é guarda de pé aberta |
| block | 153112 · L1 C2 | |
| cblock | 153112 · L1 C3 | semi-agachado; aceitável |
| jsquat | 153112 · L2 C4 (reaproveita a aterrissagem) | não existe quadro próprio |
| jup / jtop / jfall / land | 153112 · L1 C4 ou L2 C1 / L2 C2 / L2 C3 / L2 C4 | |
| hitH / hitB | 153112 · L3 C1 / L3 C2 | traço preto de impacto colado na cabeça (pode ficar ou ser apagado) |
| kdAir / koFloor | 153112 · L3 C3 / L3 C4 | |
| lp0 / lp1 | 153710 · L1 C1 / L1 C2 | |
| hp0 / hp1 (e throw) | 153710 · L1 C3 / L1 C4 | |
| lk0 / lk1 | 153710 · L2 C1 / L2 C2 | |
| hk0 / hk1 | 153710 · L2 C3 / L2 C4 | |
| clp | 153710 · L3 C1 | |
| clk | 153710 · L3 C2 | |
| sweep | 153710 · L3 C3 | |
| upper | 153710 · L3 C4 | |
| sa0-3 (LONG ZHANG) | 153054 · L1 C1-C4 | ver seção 4 (FX) |
| sb0-3 (ZHEN DI) | 153054 · L2 C1-C4 | idem (explosão + chão rachado) |
| sc0 / sc1 (TIE SHAN KAO) | 153054 · L3 C1 / L3 C2 | arte é soco com aura; o golpe é ombrada |
| jkick | 153054 · L3 C3 | |
| win | 153054 · L3 C4 | |

### 3.3 Poses sem cobertura
- **jpunch (soco no ar):** nenhuma folha tem. Hoje cai no `FALLBACK` para `punch` com inclinação (`NEEDS_TILT`) — funciona,
  mas é o quadro mais "falso" do lutador.
- **jsquat próprio** e **agachado fundo:** cobertos só por reaproveitamento da aterrissagem.
- **Ombrada de verdade** para o TIE SHAN KAO.
- Fora do `ALIAS`, mas que um jogo de luta costuma ter: **levantar do chão**, **dano agachado**, **agarrão** (hoje usa hp0/hp1),
  **retrato/rosto de seleção** (sai do idle via `headX`), **derrota por tempo**. Nada disso bloqueia o MVP.

## 4. O que editar ou regenerar

Prioridade pela regra "coerência visual + recorte fácil por cor". Recomendo **edição com a folha como referência**
(mesma ferramenta que gerou as `.jfif`: Gemini, modo edição de imagem), não geração do zero — a pose e o enquadramento
já estão bons, e regenerar do zero traz um rosto novo.

1. **153054 (especiais) — obrigatório antes da Fase 3.**
   - Remover **todos** os FX (orbe, dragão, explosão, aura) e o chão rachado. O motor já desenha os projéteis
     (`proj.style: 'orb'`/`'wave'`); FX assado aqui duplica o efeito na tela e o recorte por magenta come o brilho lilás.
   - Trocar a túnica curta pelo **painel longo** (casar com 153007/153112).
   - Trocar o quadro L3 C2 por uma **ombrada** (ombro à frente, corpo inclinado, pés arrastando).
   - Prompt de edição (EN):
     > Edit this sprite sheet. Keep every pose, the 4x3 layout, the character's face, hair and proportions exactly. Remove
     > all energy effects, glows, dragon spirit, purple aura, ground cracks and debris. Change the tunic so it has a long
     > front panel reaching the shins, identical to the reference sheet. Black wrist bracers. In row 3, column 2, replace
     > the punch with a shoulder charge: lead shoulder forward, torso leaning, back foot dragging. Flat solid magenta
     > background #FF00FF, no shadows, no gradients, no text.
   - **FX como asset à parte:** a cabeça de dragão é boa demais para jogar fora. Gerar o dragão, a onda de chão e o orbe
     **separados, sobre fundo preto puro**, para desenhar com mistura aditiva (`globalCompositeOperation = 'lighter'`) —
     preto some sozinho nesse modo, sem chroma key. Prompt:
     > Glowing violet chi dragon head projectile, side view facing right, open jaws, flame-like mane trailing left,
     > 2D fighting game VFX sprite, cel-shaded with soft inner glow, pure black background #000000, no character,
     > no ground, centered, 4 animation frames in a horizontal row.

2. **153710 (normais) — recomendado; aceitável no MVP sem edição.**
   - Braçadeiras de couro marrom → **pretas**; remover a faixa preta da cintura; barba no comprimento da 153007.
   - É a folha mais vista em luta (todo golpe sai daqui); o "pisca" de traje idle→soco aparece na hora.
   - Prompt de edição (EN):
     > Edit this sprite sheet. Keep every pose, layout, face and proportions exactly. Change the brown leather wrist
     > bracers to plain black cloth bracers, remove the black waist sash, shorten the beard to chin length like the
     > reference. Flat solid magenta background #FF00FF, no shadows.

3. **Quadro novo: jpunch** — 1 a 2 quadros (soco descendente no ar, joelhos encolhidos), mesmo traje, magenta liso.
   Pode entrar numa folha de "extras" junto com levantar do chão e dano agachado, se o dono quiser essas poses.

Não precisa regenerar: 153007 e 153112.

## 5. Notas para o recorte (Vega, Fase 2)

- Folhas com grade (153007, 153112): fatiar em 4×3 (600×597) e recuar ~8 px de cada lado antes da chave de cor; a linha da
  grade é escura e vira "contorno fantasma" se ficar.
- Folhas sem grade (153710; 153054 depois da edição): também cabem em 4×3, mas use componentes conexos dentro de cada célula —
  o chute alto da 153710 L2 C4 e a palma da L1 C4 chegam perto da célula vizinha.
- Traços pretos de impacto em 153112 L3 C1 são componentes soltos perto da cabeça: decidir se entram no quadro ou são
  descartados (o jogo já tem faísca de impacto própria?).
- Nenhuma folha canônica tem sombra de chão pintada (só a 153054 tem chão rachado, que sai na edição).
