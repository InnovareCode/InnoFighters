# Plano de arte das lacunas (23/10/2026)

Autor: Apolo (direção de arte). Base: `docs/revisao-completa-2026-10-23.md` (§ 2 F2/F3, § 5c, itens 5 e 12, R-1, R-2, R-6, A6) e
as decisões do dono de 23/10:
- CAIO e WEI LONG recebem arte nova;
- os 3 cenários de `arte-fonte/` substituem `cn`, `kr` e `br`;
- o filme do acerto dos 33 especiais precisa de arte, e a decisão de como fica comigo.

Nada foi gerado. O Atlas é quem pede à Runway, e os pedidos estão prontos nas seções 1.5 e 2.4.

Arquivos que criei, todos novos e sem sobrescrever nada:
- este documento;
- dois recortes de referência (seção 2.2).

Legenda do grau de prova:
- **[medido]**: rodei script ou olhei o pixel;
- **[lido]**: tirei do código ou de outro documento;
- **[proposta]**: é decisão minha.

---

## 0. Resumo das decisões

| Frente | Decisão | Custo Runway (2K, 6 créditos por imagem) |
|---|---|---|
| Filme do especial (33) | 3 camadas: **rajada** de 3 quadros do atlas, **close do impacto** em arte nova e **reação do rival** do atlas, com close de reação da folha FILME do rival. A v1 roda só com o atlas (0 crédito) e não espera arte. Cada lutador ganha **1 folha FILME de 6 closes**. Piloto no HAYATO antes de pedir as outras 9 | 60 base (10 folhas) + ~18 de reserva |
| CAIO novo | mestra + 4 folhas do C1 (+ f5 opcional), fundo magenta, referência `caio-ref-guarda-v1.png` | 30 base, 36 com a f5, ~48 com reserva |
| WEI LONG novo | mestra + 4 folhas do C1 (+ f5 opcional), fundo magenta, referência `wei-long-ref-guarda-v1.png`. A ombrada do TIE SHAN KAO finalmente sai certa | 30 base, 36 com a f5, ~48 com reserva |
| Cenários cn, kr e br | **São as mesmas imagens que já estão no jogo, em resolução maior** [medido]. Curadoria feita agora: aprovados sem retoque. Só falta conversão e troca no código (Vega) | 0 |
| **Total** | | **120 base; teto de ~160 com f5 e reservas** |

Ordem na Runway:
1. CAIO;
2. WEI LONG;
3. FILME do HAYATO (piloto);
4. FILME dos outros 9.

Os cenários vão em paralelo, sem Runway. Por que nesta ordem: seção 2.5.

---

## 1. Filme do especial que conecta

### 1.1 O que existe hoje, por lutador [medido nos `atlas.json`]

Todos os atlas têm as 48 poses canônicas:
- `idle0-3` e `walk0-7`;
- reações: `crouch`, `block`, `cblock`, `jsquat`, `jup`, `jtop`, `jfall`, `land`, `hitH`, `hitB`, `kdAir`, `koFloor`;
- golpes: `lp0/1`, `hp0/1`, `lk0/1`, `hk0/1`, `clp`, `clk`, `sweep`, `upper`;
- especiais: `sa0-3`, `sb0-3`, `sc0/1`, `jkick`, `win`.

Ou seja, **todo lutador já tem 9 a 11 quadros de golpe ativo e 4 de reação**, o suficiente para uma rajada de 3 a 5 quadros
sem arte nova. Na tabela abaixo, "idle" é a altura do `idle0` no atlas.

| Lutador | Atlas | Extras além das 48 | Problema para o filme |
|---|---|---|---|
| HAYATO | 2 páginas de 2048, idle 410 | nenhum | nenhum; é o candidato a piloto |
| MIN-JI | 2048, idle 410 | nenhum | nenhum |
| AMINU | 2048, idle 410 | nenhum | GARKUWA é palma-escudo: na rajada, o soco com a corda é que "bate" |
| CENTELLA | 2048, idle 410 | nenhum | HURACANRANA é agarrão de pernas desenhado **sem rival**. Em escala de jogo, a Lyra posiciona o rival; em close, a leitura não se sustenta |
| CAMILLE | 2048, idle 410 | nenhum | o filme da PARADE abre no FOUETTÉ (`sa2`) |
| NILA | 2048, idle 410 | 12 `sarpa*` | o VADIVU (troca de postura) não acerta e não tem filme. BOTE e SALTO usam `sarpaSlide`/`sarpaLeap` |
| BAATAR | 2048, idle 525 | `devekh0-2`, `dive0-1`, `jpunch` | o ARREMESSO é agarrão sem rival (B7), com o mesmo caso da CENTELLA |
| ZENON | 4 páginas, idle 558 | `sc2`, `grab0/1`, `decreto0-2`, `cena0-2`, `vitoria0/1`, `entrada0-2`, `jpunch` | DECRETO tem agarrão próprio (`grab`). Zoom máximo de 1,10, regra do trailer |
| **CAIO** | **1 página de 3600 x 2251**, 75 quadros | nomes legados (`guard`, `punch`, `special`, `hit`, `ko`...) e `x0-x11` (sem uso no código) | **(1)** FX verde **pintado** em boa parte dos quadros (vi a olho no atlas; não contei), inclusive no `idle0` (risco verde no pé, visível na colagem da seção 3.2). **(2)** As reações (`crouch`, `jump`, `hitH/B`, `kdAir`, `koFloor`) são do **protótipo, de frente para a câmera e com outro rosto**: como rival, o CAIO entra no filme dos outros 9 com o desenho errado |
| **WEI LONG** | **1 página de 3600 x 2296**, 63 quadros | nomes legados | **(1)** `sa`/`sb`/`sc` vêm da folha 153054 **original**, com o dragão lilás, a explosão e a aura pintados. A versão limpa (`wei-long-f4-especiais-v4.png`) nunca entrou. **(2)** TIE SHAN KAO desenhado como soco, não como ombrada (D4). **(3)** Os golpes normais (153710) têm braçadeira marrom e faixa, e o resto não |

### 1.2 O limite de resolução (por que o close precisa de arte) [medido/lido]

- `SH_IDLE` = 255 px lógicos. Com RS = 2, o idle ocupa 510 px na tela de 1080 px, a partir de 410 px de atlas: o atlas já é
  **ampliado 1,24x com zoom 1,0**.
- Zoom 1,3 dá 1,6x e zoom 1,5 dá 1,9x. Daí a regra da revisão: até 1,3 está bem, e acima de 1,5 borra.
- Um close de busto que ocupe ~70% da altura da tela pede ~760 px de cabeça à cintura. No atlas essa parte tem ~205 px
  (**3,7x**): fica borrado.
- Numa folha 3x2 em 2K (2400 x 1792, células de 800 x 896), um busto a 70% da célula sai com ~620 px de cabeça à cintura:
  **1,2x**, nítido.

Conclusão: **a rajada e a reação vivem bem no atlas; o close não**. É exatamente o quadro que faz o filme parecer filme, e
não o golpe repetido.

### 1.3 Decisão: reutilizar ou folha nova, por lutador [proposta]

| Lutador | Rajada e reação (atlas) | Folha FILME (closes) | Créditos | Observação |
|---|---|---|---|---|
| HAYATO | reutilizar | **sim, piloto** | 6 | valida o conceito com a Lyra antes de gastar com os outros 9 |
| MIN-JI | reutilizar | sim | 6 | |
| AMINU | reutilizar | sim | 6 | |
| CENTELLA | reutilizar | sim | 6 | o close resolve a HURACANRANA, que sem rival não fecha em close |
| CAMILLE | reutilizar | sim | 6 | |
| NILA | reutilizar | sim (4 especiais) | 6 | |
| BAATAR | reutilizar | sim | 6 | o close resolve o ARREMESSO |
| ZENON | reutilizar | sim (5 especiais, sem preparo) | 6 | o preparo usa `cena0` |
| CAIO | **só depois da arte nova** | sim, na mesma sessão da mestra nova | 6 | antes disso, o filme dele e o dele como rival ficam **sem close** (A6) |
| WEI LONG | **só depois da arte nova** | sim, na mesma sessão da mestra nova | 6 | idem |
| **Total** | 0 | 10 folhas | **60 + ~18 de reserva** | |

**A arte não bloqueia o motor.** O filme v1 sai com o atlas (rajada + quadro do especial com zoom de no máximo 1,3 +
reação). Cada folha FILME que chega troca o quadro do impacto e o da reação por closes, lutador por lutador. Na falta do
close, vale o quadro do atlas, como já acontece com o `jpunch`.

### 1.4 Roteiro de quadros por especial (v1, só atlas) [proposta]

A rajada é a mesma para os 3 especiais do lutador e traduz o estilo dele. O golpe final é o quadro ativo do especial, e a
reação do rival segue sempre a mesma sequência:
- `hitH` (1º acerto);
- `hitB` (acertos do meio);
- `kdAir` (golpe final);
- `koFloor`, só no KO.

Duração e pulo seguem a revisão: 60 a 90 ticks, e qualquer ataque pula.

| Lutador | Rajada (3 quadros) | Especial e golpe final | Close da folha FILME (v2) |
|---|---|---|---|
| HAYATO | `lp1` → `hp1` → `hk1` | RAIJIN-DAN: `sa2` e corte para o rival atingido pela esfera · RAIJIN-KEN: `sb1` → `sb2` · KAMINARI-STEP: `sc0` → `sc1` | F1, F2, F3 |
| WEI LONG | `hp1` → `lk1` → `hk1` | LONG ZHANG: `sa1` → `sa2` e corte para o dragão · ZHEN DI: `sb1` → `sb2`, tremor rente ao chão · TIE SHAN KAO: `sc0` → `sc1` (ombrada, na arte nova) | F1, F2, F3 |
| MIN-JI | `lk1` → `hk1` → `jkick` | BULKKOT: `sa1` → `sa2` · HOERI CHAGI: `sb1` → `sb2` → `sb3` · TWIO YEOP CHAGI: `sc0` → `sc1` | F1, F2, F3 |
| CAIO | `lk1` → `hk1` → `sweep` | ONDA VERDE: `sa2` e corte para o rival na ida/volta · RABO-DE-ARRAIA: `sb1` → `sb2` · MEIA-LUA: `sc0` → `sc1` | F1, F2, F3 |
| AMINU | `lp1` → `hp1` → `lp1` (jab de lança) | MASHI: `sa1` → `sa2` · GARKUWA: `sb1` → `sb2` · PASSO DO LEÃO: `sc0` → `sc1` | F1, F2, F3 |
| CENTELLA | `lp1` → `lk1` → `hk1` | PLANCHA: `sa1` → `sa2` → `sa3` · HURACANRANA: `sb1` → `sb2` → `sb3`, rival em `kdAir` sincronizado · RESORTE: `sc0` → `sc1` | F1, F2, F3 |
| CAMILLE | `lk1` → `hk1` → `lp1` | PARADE/FOUETTÉ: `sa1` → `sa2` · COUP D'ARRÊT: `sb1` → `sb2` · REVERS: `sc0` → `sc1` | F1, F2, F3 |
| NILA | `lp1` → `lk1` → `hk1` (em SARPA: `sarpaSlide0` → `sarpaLeap1` → `sarpaLeap2`) | GOLPE MARMA: `sa1` → `sa2` · PASSO DO ELEFANTE: `sc0` → `sc1` · BOTE: `sarpaSlide0` → `sarpaSlide1` · SALTO DA SERPENTE: `sarpaLeap1` → `sarpaLeap2` | F1 a F4 |
| BAATAR | `lp1` → `hp1` → `hk1` (zoom até 1,25: na escala dele, a cabeça encosta no letterbox) | MERGULHO DA ÁGUIA: `dive0` → `dive1` · ARREMESSO: `sa1` → `sa2` → `sa3` · QUEBRA-BASE: `sb1` → `sb2` | F1, F2, F3 |
| ZENON | `lp1` → `hp1` → `hk1` (zoom até 1,10) | SELO e SELO MAIOR: `sa1` → `sa2` · COLUNA DE ÔNIX: `sb1` → `sb2` · TRIBUTO: `sc1` → `sc2` · DECRETO: `grab0` → `grab1` → `decreto1` | F1 a F4 |

Total: 3 x 8 + NILA 4 + ZENON 5 = **33** (os dois VADIVU não acertam e não têm filme).

### 1.5 Folha FILME: prompts prontos [proposta]

**Montagem do pedido:**
- BLOCO A-FILME;
- linha em branco;
- BLOCO B do lutador, copiado de `docs/prompts/0X-<id>.md`; o do ZENON está em `docs/handoff-apolo-zenon-folhas.md`, e o
  do CAIO e o do WEI LONG estão na seção 2.4 deste documento;
- linha em branco;
- BLOCO C-FILME do lutador.

**Como pedir:**
- **Anexar UMA imagem:** a mestra aprovada do lutador. O ZENON usa a mestra dele.
- Formato: paisagem 4:3, 2K.
- Salvar como `arte-fonte/lutadores/<id>/folhas/<id>-filme-v1.png`.

**BLOCO A-FILME**
```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 panels arranged in an invisible grid of 3 columns and 2 rows. Every cell has the same size. One image of the same character in each cell, framed as the cell says: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees. Close framings end at a straight invisible horizontal line; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of the close framings.
Strong dramatic expressions, dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, smears, dust, impact stars or blur.
Only this one character. No opponent, no other people, no props.
```

**Linha 2, comum a quase todos (as células 5 e 6 são a reação; quando o lutador apanha, o jogo espelha):**
```
Row 2: (1) bust: battle cry before the finishing blow, mouth open shouting, eyes blazing, fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, hair flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

**BLOCO C-FILME por lutador.** A linha 1 é o close do impacto de cada especial. Descrevo só o corpo: palavras como
"energia", "lançar" ou "onda" fazem o modelo desenhar o efeito.

| Lutador | Texto (cole como está) |
|---|---|
| HAYATO | `SHEET FILM. Row 1: (1) bust: both open palms thrust straight toward the viewer's right at chest height, wrists together, fingers spread, fierce shout, (2) three-quarter: rising uppercut, right fist driving straight up past his face, body stretched upward, eyes on the fist, (3) three-quarter: lunging dash punch, body low and stretched forward, right fist fully extended to the right, hair and headband tails streaming back.` + linha 2 comum |
| WEI LONG | `SHEET FILM. Row 1: (1) bust: both palms pushed forward together at chest height, heels of the hands touching, fingers open like a dragon's jaws, stern fierce eyes, beard and hair swept back, (2) three-quarter: deep horse stance, both palms pressing down hard toward the floor line, head bowed, shoulders tense, (3) three-quarter: shoulder charge, body leaning hard to the right, lead shoulder and upper back driving forward, arms tucked close, face set in iron determination.` + linha 2 comum |
| MIN-JI | `SHEET FILM. Row 1: (1) three-quarter: high crescent kick, her leg sweeping across at head height in front of her, ponytail whipping, (2) three-quarter: airborne spinning kick, body turned with her back partly to the viewer, leg extended outward at head height, (3) three-quarter: flying side kick, body almost horizontal, the foot blade thrust toward the right, arms tucked.` + linha 2 comum |
| CAIO | `SHEET FILM. Row 1: (1) bust: torso twisting, both arms sweeping forward in a wide horizontal crescent, open palms ending toward the right, dreadlocks swinging, (2) three-quarter: low spinning sweep, both hands on the floor line, back turned to the right, one leg swinging around low with the heel leading, (3) three-quarter: in the air, body turning, one leg swinging over in a high crescent arc with the heel coming down toward the right.` + linha 2 comum |
| AMINU | `SHEET FILM. Row 1: (1) bust: the rope-wrapped rear fist driving straight toward the right at face height, whole body behind it, jaw clenched, open lead hand pulled back, (2) bust: the bare open lead palm thrust forward like a shield, fingers spread, rope-wrapped fist cocked at the cheek, (3) three-quarter: lunging low forward, open shield hand pushing to the right, wrapped fist cocked, fierce grin.` + linha 2 comum |
| CENTELLA | `SHEET FILM. Row 1: (1) three-quarter: in the air, body flat and horizontal, belly down, arms and legs spread wide, mask on, (2) three-quarter: in the air, legs scissored together at head height as if locked around a neck, upper body arching back, mask on, (3) three-quarter: flying crossbody, body horizontal, arms stretched forward to the right, braid streaming back, mask on.` + linha 2 comum, com "mask on" ao final de cada célula |
| CAMILLE | `SHEET FILM. Row 1: (1) three-quarter: high roundhouse kick at head height striking with the toe of the shoe, supporting leg straight, upright torso, sharp eyes, (2) three-quarter: low side kick at shin height, sole of the shoe forward, torso upright, gloves high, (3) three-quarter: spinning heel kick, back partly to the viewer, leg swinging around at head height with the heel leading.` + linha 2 comum |
| NILA | `SHEET FILM. Row 1: (1) bust: two-finger strike fully extended to the right at chest height, eyes intensely focused, braid swinging, (2) bust: both open palms thrust forward together at chest height, heavy and grounded, (3) three-quarter: body flat and low along the floor line, front leg sweeping forward. Row 2: (1) three-quarter: corkscrew leap, body twisting in the air, one leg extended diagonally downward to the right, braid flying, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, braid flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out.` (sem a linha 2 comum) |
| BAATAR | `SHEET FILM. Row 1: (1) three-quarter: diving down from above, arms spread like eagle wings reaching forward to grab, (2) bust: both hands clamped forward at chest height gripping as if seizing an opponent's jacket, body twisting to throw, (3) three-quarter: leaning in, one boot hooking low at ankle height to the right, arms pulling.` + linha 2 comum |
| ZENON | `SHEET FILM. Row 1: (1) bust: the arm nearest the viewer extended forward, palm open, two fingers raised as if sealing a pact, cold commanding stare, (2) three-quarter: rising strike, the fist nearest the viewer driving straight up, coat flaring, (3) three-quarter: lunging forward, the arm nearest the viewer extended to the right, coat streaming back. Row 2: (1) three-quarter: one hand clamped forward at chest height as if gripping a collar, the other raised to strike, contemptuous smile, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut, (3) three-quarter: knocked backward, body arching back toward the LEFT, coat flying.` (sem a linha 2 comum) |

**Mapa das células para a Vega/Lyra:**
- células 1 a 3: `filmeA`, `filmeB` e `filmeC`, na ordem sFire, sDown e sFwd. Na NILA e no ZENON, as 4 primeiras seguem a
  ordem da tabela 1.4;
- 4: `filmeGrito` (ou o 4º especial);
- 5: `filmeHitH`;
- 6: `filmeKd`.

**Checagem de aceite (além da seção 10 de `prompts-arte.md`):**
- 6 figuras;
- busto cortado em linha reta, sem esfumar;
- o close do impacto é **diferente do idle** (rodar `difcruz.ps1` contra a mestra; o eco da referência já apareceu no SELO);
- nenhum FX;
- o rosto bate com a mestra.

**O que falha e como reagir:**
- se o modelo desenhar corpo inteiro onde pedi busto, **aceite**: o pipeline recorta, e o ganho de resolução continua;
- se ecoar a mestra numa célula, essa célula volta ao quadro do atlas. **Não regerar mais de 1 vez** (lição do ZR do ZENON).

### 1.6 Para a Lyra: montagem e memória [proposta]

- O close entra como **painel** (o recorte reto de cintura e joelho encosta na borda de baixo do painel). Não é pose de luta:
  não precisa de âncora, caixa nem `ponta`.
- Peso: 6 closes de ~560 x 620 cabem numa página de 2048 x 1024, com ~8 MB de memória decodificada. Carregar **só os 2
  lutadores da partida**, sob demanda, e soltar no fim. Isso conversa com o item 11 da revisão (287 MB estimados contra a meta
  de 120 MB): não pré-carregar.
- Câmera: até 1,3 nos quadros do atlas (BAATAR 1,25, ZENON 1,10). Closes a 1,0.

---

## 2. CAIO e WEI LONG com arte nova

### 2.1 Estado medido

- **CAIO:**
  - `arte-fonte/lutadores/caio/folhas/` tem 4 folhas da Runway de 20/10, todas em 2400 x 1792, magenta, com grade escura e
    sombra roxa no chão [medido];
  - essas folhas trazem **FX verde pintado em 3 das 4**, cobrem idle, andar, golpes e especiais, mas **não têm reações**
    (agachar, defesa, pulo, dano, nocaute);
  - por isso o atlas v1 completou as reações com o protótipo. Não há folha a aproveitar sem retrabalho.
- **WEI LONG:**
  - conjunto D4 aprovado em 20/10: 153007 base, 153112 reações, 153710 golpes e a `f4-especiais-v4` limpa [lido];
  - o atlas v1 usa a 153054 **com FX**, não a v4 [medido];
  - os problemas que sobram do conjunto: grade escura, figuras a ~93% da célula, braçadeira marrom na 153710, ombrada
    desenhada como soco, sem `jpunch`.

**Plano B do WEI LONG (0 crédito), registrado mas não recomendado:** passar o conjunto D4 com a v4 pelo pipeline. Isso tira o
FX e o 3600 px, mas mantém a braçadeira trocada e o soco no lugar da ombrada. Só vale se a mestra nova trouxer um rosto que o
dono rejeite duas vezes.

### 2.2 Referência (uma imagem só por pedido)

Criados agora, por recorte de código da célula L1C1 (recuo de 12 px para tirar a grade; fundo magenta medido nos 4 cantos):

| Lutador | Arquivo | De onde | Mostra |
|---|---|---|---|
| CAIO | `arte-fonte/lutadores/caio/referencia/caio-ref-guarda-v1.png` (576 x 573) | `Capoeira_master_sprite_sheet_kicks_..._155005.jpg`, L1C1 | guarda da ginga, sem FX |
| WEI LONG | `arte-fonte/lutadores/wei-long/referencia/wei-long-ref-guarda-v1.png` (576 x 573) | `..._153007.jpg`, L1C1 | base de cavalo, painel longo, braçadeiras pretas |

Por que um recorte e não a folha inteira: com a folha anexada, o modelo tende a devolver a própria folha (eco). Uma figura só
diz o traje sem oferecer um layout para copiar.

- Na **mestra**, anexe o recorte.
- Da **f1 em diante**, anexe **só a mestra aprovada**.

### 2.3 Folhas necessárias e poses do pipeline [lido em `ferramentas/sprites/poses.mjs`]

- `MINIMAS` (13): `idle0`, `walk0`, `crouch`, `block`, `jtop`, `hitH`, `koFloor`, `lp1`, `hp1`, `lk1`, `hk1`, `sa1`, `win`.
- As folhas f1 a f4 cobrem as 13 e 48 das 49 canônicas, no layout padrão do `lutadores.json`, sem exceção de células.
- A f5 traz `jpunch` e extras.

| Folha | Poses | Obrigatória |
|---|---|---|
| mestra (3:4) | referência de traje | sim |
| f1 base | `idle0-3`, `walk0-7` | sim (**parar e esperar o OK do dono**) |
| f2 reações | `crouch` ... `koFloor` | sim |
| f3 golpes | `lp0` ... `upper` | sim |
| f4 especiais | `sa0-3`, `sb0-3`, `sc0/1`, `jkick`, `win` | sim |
| f5 extras | `jpunch` ... | opcional (recomendo, pelo `jpunch`) |
| FILME | 6 closes (seção 1.5) | sim, na mesma sessão |

### 2.4 Prompts prontos

**BLOCO A:** é o de `docs/prompts-arte.md` §2, sem mudar uma vírgula. Ele já tem IMPORTANT SPACING, "um pé no chão" e "NO
visual effects".

**Texto da mestra** (antes do BLOCO B; formato retrato 3:4):
```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.
```

**BLOCO B do CAIO (novo).** O fundo é magenta: o verde do cordão e das borlas sumiria num fundo verde.
```
CHARACTER — CAIO: Afro-Brazilian capoeira master from Rio de Janeiro, about 27 years old, lean and muscular, long limbs, agile. Dark brown skin, determined eyes, short beard shadow. Shoulder-length dreadlocks tied back in a high ponytail with a lime-green hair tie. Bare-chested, with a black tribal tattoo on his right shoulder and upper arm (the shoulder nearest the viewer when he faces right). White loose capoeira abada trousers with a white waistband. A braided green-and-yellow capoeira cord tied at the waist, its two long ends hanging at the left hip with one green tassel and one yellow tassel. Barefoot. No shirt, no shoes, no jewelry. Fighting stance: ginga, a low swaying side-to-side stance, knees bent, one fist guarding the face, the other arm low across the body. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.
```

**BLOCO B do WEI LONG.** É o de `prompts-arte.md` §5.1, com 2 correções:
- "reference image" no singular (pedido com uma imagem só);
- a postura do andar, explicada na nota abaixo do bloco.
```
CHARACTER — WEI LONG: elderly Chinese kung fu master, about 65 years old, tall and powerful, broad chest, thick forearms. Long white hair tied in a topknot bun, long white eyebrows, white beard reaching the chin, calm stern face. Sleeveless royal-blue changshan-style vest with gold trim and a gold dragon embroidered on the front, with a long front panel reaching the shins. Wide black kung fu trousers, black cloth shoes with white soles, plain black cloth wrist bracers. No waist sash, no brown leather. Fighting stance: low wide horse stance, open palms forward. Match the attached reference image exactly. Background color: solid flat magenta #FF00FF.
```

**BLOCO C das folhas 1, 2 e 3:** os de `prompts-arte.md` §2.1, iguais para os dois, com **uma troca só na f1 do WEI LONG**.
A troca vem da lição do andar de base larga (AMINU e NILA): com "back foot passing", a IA estica a perna ou levanta a figura.
Na f1 do WEI LONG, use estas linhas 2 e 3 no lugar das linhas genéricas:
```
Row 2: walk cycle forward, frames 1 to 4, keeping the low wide horse stance: small step-and-drag steps, the front foot slides forward and the back foot drags after it, hips at the same height in every frame, palms forward. At least one foot flat on the baseline in every frame: never jumping.
Row 3: walk cycle forward, frames 5 to 8: the same step-and-drag motion repeated, ending one step before frame 1, so the 8 frames loop smoothly. Hips at the same height in every frame. At least one foot flat on the baseline in every frame.
```

**BLOCO C, folha 4 do CAIO.** Os especiais são ONDA VERDE (meia-lua de energia em bumerangue: o jogo desenha o projétil),
RABO-DE-ARRAIA (rasteira giratória baixa) e MEIA-LUA (salto de ginga com chute descendente).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (crescent throw): (1) both hands drawn back together at the rear hip, knees bent low, torso coiled, (2) torso twisting forward, the arm nearest the viewer sweeping forward in a wide horizontal crescent arc at chest height, (3) both arms fully extended forward at chest height, open palms, fingers spread, front knee bent, (4) recovering to the ginga stance.
Row 2 (spinning low sweep): (1) dropping low and turning, back partly to the right, both hands reaching down, (2) both hands planted on the baseline, body low, one leg swinging around in a wide circle at ankle height with the heel leading, (3) completing the spin, the leg still extended low along the baseline, (4) rising back to the ginga stance.
Row 3: (1) leap start: low crouch, arms swinging back, about to leap forward, (2) in the air leaping forward, body turning, one leg swinging over in a high crescent arc with the heel coming down diagonally, (3) jumping kick: in the air, knees bent, one foot striking diagonally downward with the sole, (4) victory: relaxed ginga sway with a big smile, one arm raised high, the other low.
```

**BLOCO C, folha 4 do WEI LONG.** Os especiais são LONG ZHANG (palma do dragão: o jogo desenha o dragão), ZHEN DI (pisão que
lança um tremor rente ao chão) e TIE SHAN KAO (**ombrada** com armadura).
```
SHEET 4 — SPECIAL MOVES.
Row 1 (dragon palm): (1) both palms cupped together at the rear hip, low horse stance, eyes forward, (2) beginning to push both palms forward, front knee bending, (3) both palms fully extended forward at chest height, heels of the hands touching, fingers open, front knee bent deep, (4) recovering, hands returning to the guard.
Row 2 (stamp): (1) front knee lifted high, both arms raised, (2) the front foot stamping down hard, body sinking into a very low horse stance, both palms pressing down toward the baseline, (3) crouched very low, one palm pressed flat on the baseline, head bowed, (4) rising back to the horse stance. No floor and no cracks are drawn.
Row 3: (1) shoulder charge start: low forward crouch, lead shoulder turned toward the right, arms tucked close to the body, (2) shoulder charge: body leaning hard forward, the lead shoulder and upper back driving forward at chest height, arms tucked close to the body, back foot pushing off, (3) jumping kick: in the air, one foot striking diagonally downward, (4) victory: standing tall with arms crossed on the chest, calm stern face.
```

**BLOCO C, folha 5 (opcional).** É a de `prompts-arte.md` §2.1, com a linha 3 de cada um:
- CAIO: `Row 3: (1) and (2) two ginga sway variants (weight on the left leg, then on the right leg), (3) cartwheel: upside down on both hands, legs spread wide, (4) taunt: clapping his hands above his head with a grin.`
- WEI LONG: `Row 3: (1) taunt: stroking his beard calmly, (2) to (4) three horse-stance idle variants with small arm differences.`

**Pedidos, na ordem.** Todos são A + B + C, salvo a mestra; formato 4:3 2K, salvo a mestra (3:4).

| # | Pedido | Anexar (UMA imagem) | Salvar em `arte-fonte/lutadores/<id>/folhas/` | Checagem específica |
|---|---|---|---|---|
| C0 | CAIO mestra (texto da mestra + B do CAIO) | `caio-ref-guarda-v1.png` | `caio-mestra-v1.png` | tatuagem no ombro do lado de quem olha; cordão verde e amarelo com 2 borlas; nada de FX verde; sem sombra roxa |
| C1 | CAIO f1 | `caio-mestra-v1.png` | `caio-f1-base-v1.png` | **parar e esperar o OK do dono**. Respiração com par diferente (não "igual à célula 1") |
| C2 | CAIO f2 | mestra | `caio-f2-reacoes-v1.png` | nocaute com a cabeça à esquerda (se vier à direita, espelhar por código); "deep crouch" mais baixo que o idle (medir) |
| C3 | CAIO f3 | mestra | `caio-f3-golpes-v1.png` | 12 componentes conexos; nenhum risco de chute pintado |
| C4 | CAIO f4 | mestra | `caio-f4-especiais-v1.png` | L1C3 diferente do idle (`difcruz.ps1`); rasteira com as **duas mãos** no chão; `sc1` diferente de `jkick` |
| C5 | CAIO f5 (opc.) | mestra | `caio-f5-extras-v1.png` | |
| C6 | CAIO FILME | mestra | `caio-filme-v1.png` | seção 1.5 |
| W0 | WEI mestra (texto da mestra + B do WEI) | `wei-long-ref-guarda-v1.png` | `wei-long-mestra-v1.png` | painel até a canela, braçadeira **preta**, sem faixa na cintura, barba até o queixo |
| W1 | WEI f1 (com as linhas 2 e 3 trocadas) | `wei-long-mestra-v1.png` | `wei-long-f1-base-v1.png` | **parar e esperar o OK do dono**. Quadril na mesma altura nos 8 passos |
| W2 a W6 | WEI f2, f3, f4, f5 (opc.), FILME | mestra | `wei-long-f2-reacoes-v1.png` ... `wei-long-filme-v1.png` | f4: ombrada, **não** soco; nenhuma palma com dragão |

Os nomes `-v1` não colidem com nada que existe hoje nessas pastas [medido: as pastas só têm os JPG/JFIF antigos e as
`wei-long-f4-especiais-v2..v4`].

### 2.5 Ordem e custo

| Etapa | Imagens | Créditos | Por quê nesta posição |
|---|---|---|---|
| 1. CAIO: mestra, f1, (OK), f2-f4, FILME | 6 | 36 | está pior: reações do protótipo e FX pintado no idle. Aparece nos 4 de fábrica, no ciclo da tela de título e no trailer |
| 2. WEI LONG: mestra, f1, (OK), f2-f4, FILME | 6 | 36 | o atlas atual pelo menos é todo do mesmo desenho |
| 3. FILME do HAYATO (piloto) | 1 | 6 | **só depois** de a Lyra ter o `filme.ts` v1 rodando com o atlas, para julgar o close na tela |
| 4. FILME dos 7 restantes | 7 | 42 | depois do OK do piloto |
| f5 dos dois (opcional) | 2 | 12 | quando o dono quiser `jpunch` |
| Reserva (~25%) | ~5 | ~30 | regerações de célula (estimativa minha pelos lotes de 20 e 21/10, não é conta) |

### 2.6 Para a Vega e a Lyra quando as folhas chegarem [lido]

- **Pipeline:** layout `padrao`, `alturaRef` 410. Medir a cabeça (topo→queixo) nas 4 folhas e propor `fatorFolha` se variar
  mais de 5%, como na NILA. O atlas tem de sair com no máximo 2048 px, paginado, como os outros 8.
- **Apelidos que somem:** o atlas novo não tem `special`, `guard`, `punch`, `hit`, `ko` nem `x0-x11`. Em
  `src/data/apresentacao-especiais.ts`, CAIO e WEI LONG apontam a tarja de `sFire` para `quadro: 'special'`. Sem a pose,
  `getPD` cai no `idle0` e a tarja mostra o lutador parado. Trocar para `sa2`, o quadro do disparo nas duas folhas novas.
- **Pegada:** conferir `scale` e `reach` do CAIO e do WEI LONG no harness. As poses novas mudam o alcance (R3).
- **Trailer:** o CAIO tem tomada própria (c7.1). Com arte nova, o dono reaprova o trailer.
- **Atlas v1:** não apagar até a Íris aprovar o v2. Depois sai de `public/`; a fonte fica em `arte-fonte/`.

---

## 3. Os 3 cenários (cn, kr, br)

### 3.1 Achado: não são cenários "novos" [medido]

Os 3 arquivos `Cenario_*_2K_20261020*.jpg` (2752 x 1536) **são a fonte dos JPG que já estão no jogo**. Os `cn/kr/br.jpg`
(1600 x 900) são essas mesmas imagens reduzidas com esticamento (fit fill, ~0,8% de achatamento horizontal).

Diferença média por canal contra o JPG do jogo:

| Cenário | Esticado | Recorte central 16:9 |
|---|---|---|
| cn | **2,77** | 8,24 |
| kr | **3,49** | 12,24 |
| br | **3,16** | 10,88 |

As diferenças do esticado são ruído de JPG. A troca é **só ganho de resolução** (1600 → 1920) e de formato (WebP), com a
mesma composição que o dono já vê.

### 3.2 Curadoria: feita agora, os 3 aprovados sem retoque [medido]

Método da curadoria de cenários:
- recorte 16:9 centrado, 1920 x 1080;
- o `idle0` de WEI LONG, CAIO, ZENON (x1,10) e MIN-JI colado com os pés a 84,5% e altura de jogo de 675 px;
- colagens em
  `<scratchpad da sessão>/apolo-lacunas/colagem-{cn,kr,br}.jpg`.

| Cenário | Linha dos pés (84,5%) | Cantos de baixo | Contraste | Veredito |
|---|---|---|---|---|
| cn (templo) | piso de lajes limpo de ponta a ponta | limpos (as bases das colunas ficam acima da linha dos pés, a olho na colagem) | luminância mediana na faixa das pernas (65-84,5%): 0,042. Calça preta do WEI e bota do ZENON legíveis pelo contorno e pelo piso mais claro sob os pés (0,105) | **aprovado** |
| kr (palácio) | lajes cinza limpas | limpos | faixa das pernas 0,155: é o melhor dos 3 para lutador escuro | **aprovado** |
| br (Copacabana) | calçadão de ondas pretas e brancas | limpos | faixa das pernas 0,356 (areia e mar). **Ressalva:** sapato preto (WEI, ZENON) sobre a faixa preta da onda perde a borda em alguns x | **aprovado com ressalva** (não corrigir agora) |

Sobre a ressalva do br:
- a imagem é a mesma que roda desde o protótipo;
- corrigir exigiria repintar o padrão das pedras, e o calçadão é a identidade do cenário.

Se o dono reclamar, o conserto sem crédito é o `piso2.ps1`, adaptado para clarear só as pedras pretas abaixo de 74% (de 0 para
~0,04).

### 3.3 O que falta para integrar (Vega, 0 crédito)

1. **Fonte com nome limpo.** Os nomes atuais têm "…" (U+2026) e quebram scripts. Copiar, sem apagar os originais, para:
   - `arte-fonte/cenarios/cenario-cn-v1.jpg`;
   - `arte-fonte/cenarios/cenario-kr-v1.jpg`;
   - `arte-fonte/cenarios/cenario-br-v1.jpg`.

   `arte-fonte/` está no `.gitignore`, então não pesa no repositório.
2. **`ferramentas/converter-cenarios.mjs`:**
   - aceitar extensão por fonte (hoje fixa em `.png`);
   - acrescentar `cn: 'cn-v1'`, `kr: 'kr-v1'` e `br: 'br-v1'` em `FONTES`.

   O recorte central de 21 px não mexe na linha dos pés.
3. **Qualidade por cenário**, para caber em 250 KB [medido com sharp, lanczos3, effort 5]:

   | Cenário | Qualidade | Tamanho | Observação |
   |---|---|---|---|
   | cn | q80 | 192 KB | |
   | kr | **q70** | 235 KB | q80 dá 302 KB |
   | br | **q70** | 202 KB | q80 dá 259 KB |

   Rodar com `--so` em duas passadas.
4. **`src/data/cenarios.ts`:**
   - `arquivo` dos 3 vira `assets/cenarios/cenario-{cn,kr,br}.webp`;
   - atualizar o comentário "mantêm o .jpg idêntico ao dele".
5. **Testes que citam os JPG:**
   - `tests/e2e/arte-sob-demanda.spec.ts:45` e `:89`: lista de cenários pré-buscados;
   - `tests/unit/assets-demanda.test.ts` e `carregador.test.ts` usam `br.jpg` como fixture de URL. São dados de teste, não
     precisam mudar;
   - conferir com a Íris.
6. **Os 3 JPG antigos:** sair de `public/` só depois do e2e verde.
7. **Lyra:** nada a fazer na arte. Conferir só a tela de título, porque `CICLO_CENARIOS` passa por `cn`, `kr` e `br`.
