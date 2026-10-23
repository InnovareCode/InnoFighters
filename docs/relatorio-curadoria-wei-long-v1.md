# Curadoria técnica do WEI LONG, folhas v1 (23/10/2026)

Autor: Apolo. Fonte: `arte-fonte/lutadores/wei-long/folhas/` (mestra e f1 a f4 v1, aprovadas a olho pelo dono).
Plano de origem: `docs/plano-arte-lacunas-2026-10-23.md` §2. Nada foi commitado. Nenhum arquivo v1 foi alterado.

Marcadores: **[medido]** = número tirado do pixel por script; **[visto]** = julgamento a olho sobre recorte ampliado;
**[proposta]** = decisão a confirmar no harness ou pelo dono.

---

## 0. Resumo

| Folha | Veredito | O que fazer |
|---|---|---|
| mestra | **APROVADA** | nada |
| f1 base | **APROVADA com reparo por código** | usar `wei-long-f1-base-v2.png` (respiração com quadro intermediário) + mapa de células §3.1 |
| f2 reações | **APROVADA com limpeza** | usar `wei-long-f2-reacoes-v2.png` (2 respingos de saliva apagados) |
| f3 golpes | **APROVADA** | usar a v1 como está |
| f4 especiais | **APROVADA com 2 células reprovadas** | `sc1` (saiu SOCO, não ombrada) e `jkick` (saiu joelhada com soco): **REGERAR só esses quadros** na folha de reposição WR (§5). `sb1` fraco, troca opcional na mesma geração |
| WR reposição | **APROVADA em 4 de 12 células** (§7) | entram `sc0` (L1C1), `sc1` (L1C3, back slam), `jkick` (L2C3) e `jpunch` (L2C4, bônus). `sb1` e `clp` falharam pela 2ª vez: ficam os v1 |

**Armadilha do pipeline [lido em `executar.mjs#acharFolha` + medido]:** o pipeline escolhe, por folha, o arquivo com **maior vN**. Na
pasta existem `wei-long-f4-especiais-v2/v3/v4.png` **antigas** (edições Gemini de 20/10, traje do conjunto D4). Rodar
`npm run sprites -- wei-long` sem `--folha f4=...` pega a **v4 antiga**, não a f4 nova. Por isso **não** gerei `f4-v2` (o nome
colidia) e a f4 nova continua `v1`. A Vega precisa de `--folha f4=wei-long-f4-especiais-v1.png` ou mover as v2-v4 antigas para
uma subpasta de arquivo (decisão do Atlas/dono; não movi nada).

---

## 1. Como foi medido

- Scripts Python (PIL + numpy) no scratchpad da sessão: `medir.py` (componentes conexos 8-vizinhança, mesma tolerância 48 do
  pipeline, 2 px de borda cortados), `poses.py`/`difcruz.py` (XOR de silhueta alinhada pela sola, com busca de deslocamento ±24 px),
  `com.py` (pés relativos ao centro de massa, que é a âncora `ax` do pipeline), `quadril.py` (topo da calça preta = quadril),
  `barba.py` (topo do coque até a ponta da barba = régua da cabeça), `vaos.py`/`dist.py` (menor distância entre figuras vizinhas).
- **Prova real:** rodei o pipeline (`ferramentas/sprites/cli.mjs`) com saída no scratchpad, nas v1 e depois nas v2. Resultado nas
  duas rodadas: atlas 2048x1856, 2 páginas, 48 quadros, escala 0,7101 (alturaRef 410), **0 avisos**.

---

## 2. Resultado por folha

### 2.0 Comum às 4 folhas [medido]

| | f1 | f2 | f3 | f4 |
|---|---|---|---|---|
| Fundo (mediana dos cantos) | 252,2,250 | 252,3,251 | 252,2,251 | 252,3,251 |
| Componentes conexos | 12 | **14** (v2: 12) | 12 | 12 |
| Maior figura / altura da linha (597) | 99% | 96% | **103%** | 97% |
| Menor distância entre figuras | 65 px | 34 px | **18 px** | 40 px |
| Menor margem até a borda | 13 px (base) | **4 px** (base, `hitH`) | 13 px | 34 px |
| Pixels de primeiro plano na 1ª/última linha e coluna | 0 / 2 / 0 / 2 | idem | idem | idem |

- **A meta "figura ≤ ~70% da linha" não foi cumprida em nenhuma folha** (96-103%). As caixas das fileiras se sobrepõem na vertical
  (f3: a linha 2 desce até y=1245 e a linha 3 começa em y=1196; f4: `sb0` começa em y=608 e `sa0` termina em y=609). **Não
  impede nada:** o recorte é por componente, e nenhum par de figuras se toca (menor vão 18 px, f3 `lk0` x `clp`). Recorte por
  grade quebraria; o pipeline não usa grade.
- **Pés, sapatos e cabelo:** nenhum toca a borda. Os 2 px de borda direita/inferior são o ruído conhecido do Runway (cortado pelo
  pipeline). Suspeito do nocaute na f2: o sapato do `koFloor` termina em x=2387, **12 px antes da borda**, contorno da sola
  fechado [visto em 2x]. O pé mais perto da borda é o do `hitH` (base em y=1787, 4 px), também com contorno fechado [visto]. Nenhum
  dos dois precisa de `acolchoar`.
- **Magenta residual / despill:** nas folhas há 3.400 a 3.950 px de franja roxa (mistura do contorno com o fundo), normal. Depois do
  pipeline: halo 69-71% → 0,0% nas 4 folhas; no atlas sobram **41 px** com vazamento > 40 em 48 quadros, 17 deles na boca aberta do
  `hitH` (é a cor da boca desenhada, não fundo) e os outros 1 a 5 por quadro, em buracos minúsculos. Invisível na escala do jogo
  [medido + visto no atlas sobre cinza].
- **Escala entre folhas (cabeça, coque → ponta da barba):** f1 117-122, f2 112-121, f3 116-121, f4 113-116 px nas poses de cabeça
  reta [medido]. Diferença ≤ 5%: **não precisa de `fatorFolha`**.

### 2.1 Mestra (`wei-long-mestra-v1.png`, 1792 x 2400) — APROVADA

1 componente, margens 67/38/192/84 px (esq./dir./topo/base), fundo 253,3,252 [medido]. Painel até a canela, braçadeiras pretas,
sem faixa na cintura, barba até o queixo, coque [visto]. Bate com a checagem W0 do plano.

### 2.2 f1 base — APROVADA com reparo por código (v2 feita)

**Respiração (idle) [medido]:** C1, C2 e C4 são o **mesmo desenho** (XOR 1,3% a 2,1%; o limite de "mesmo desenho" é 3%). Só a C3
é diferente: topo 14 px mais alto (592 x 578 px), quadril 9 px mais alto, tórax maior (XOR 6,0%). Com o mapa padrão
(idle0..3 = C1..C4) o ciclo fica parado, parado, **salta 14 px num quadro só**, parado: um soluço, não uma respiração.

Reparo feito em `wei-long-f1-base-v2.png`: a C2 (duplicata) virou o quadro **intermediário**, a C1 esticada só na vertical
×1,0121, ancorada na sola (578 → 583 px). Medido: C2 nova x C1 = 2,6%, x C3 = 4,1%. No atlas: idle0 410 px, idle1 415, idle2 420
[medido no `atlas.json` da 2ª rodada]. Sem emenda visível [visto em 2x]. O resto da folha é byte a byte o da v1 fora da caixa
x 600-1205, y 0-615.

**Andar (walk0-7 = L2C1..L3C4) [medido]:**

| Quadro | pé de trás* | pé da frente* | largura dos pés | topo da calça (quadril) | barra do painel |
|---|---|---|---|---|---|
| walk0 L2C1 | -231 | +192 | 506 | 340 | 81 |
| walk1 L2C2 | -245 | +205 | 531 | 336 | 76 |
| walk2 L2C3 | -237 | +194 | 512 | 343 | 78 |
| walk3 L2C4 | -231 | +155 | 468 | 342 | 77 |
| walk4 L3C1 | -206 | +183 | 469 | 344 | 97 |
| walk5 L3C2 | -209 | +183 | 473 | 344 | 96 |
| walk6 L3C3 | -222 | +186 | 489 | 344 | 97 |
| walk7 L3C4 | -229 | +187 | 497 | 340 | 91 |

\* px relativos ao centro de massa (a âncora horizontal do jogo).

- **Lê como passo? Sim, como "step-and-drag".** O pé que está plantado recua em relação ao corpo enquanto o outro desliza:
  walk0→1 a frente desliza (largura 506→531); walk1→3 a frente fica plantada (205→155) e o pé de trás é arrastado (-245→-206 até
  walk4); walk4→7 o pé de trás fica plantado (-206→-229) e a frente desliza de novo. É o ciclo pedido.
- **Quadril na mesma altura: SIM.** Topo da calça entre 336 e 344 px nos 8 quadros (8 px = 6 px no jogo).
- **Ressalvas:** (1) walk4 e walk5 são quase o mesmo desenho (XOR 1,5%): vira uma pausa de 2 quadros; (2) a **emenda walk3→walk4**
  (troca de fileira) é o maior salto do ciclo, XOR 17,9% contra 1,5-9,7% dentro das fileiras: a barra do painel sobe 20 px (o painel
  é desenhado mais comprido na linha 2) e os dois pés pulam ~25 px para a frente em relação ao corpo. É o defeito conhecido de
  "ciclo pula entre fileiras", aqui mais brando porque o quadril não muda.
- **Proposta:** manter os 8 quadros e julgar no harness. Se a emenda incomodar, a alternativa de 0 crédito é usar só a linha 2
  (`walk0-3`) e repeti-la como `walk4-7` por apelido (a emenda walk3→walk0 é 11,0%, menor que 17,9%). Ver §3.1.

### 2.3 f2 reações — APROVADA com limpeza (v2 feita)

- 14 componentes: os 2 a mais são **respingos de saliva** soltos na frente da boca do `hitH` (L3C1), 40 e 16 px de área em
  x 253-260, y 1273-1282 [medido]. Ficam a menos de 24 px da barba, então o pipeline os **funde** no quadro do `hitH` (confirmado:
  aparecem no quadro do atlas da 1ª rodada [visto]). Apagados em `wei-long-f2-reacoes-v2.png` (86 px trocados pela cor do fundo
  local, só ilhas que não tocam a borda da janela, então a barba não foi tocada). v2: 12 componentes [medido].
- Poses [visto + medido]: `crouch` 85% da altura do idle, `cblock` 82%, `jsquat` 87%, `land` 83%: todas mais baixas que o idle. Defesa
  em pé com antebraços cruzados. `kdAir` e `koFloor` com a **cabeça à esquerda** (correto, sem espelhar). Pares distintos entre si
  (XOR 34-45%).

### 2.4 f3 golpes — APROVADA, usar a v1

12 componentes, nada a limpar. Todos os pares leem como o golpe pedido [visto]: `hp0` = preparo com o punho de trás engatilhado
(palma da frente estendida), `hp1` = direto com quadril girado, `lk1` na altura do estômago, `hk1` na cabeça, `sweep` rente ao chão
com a mão apoiada, `upper` com o punho acima da cabeça. Ressalva leve: `clp` sai a 89% da altura do idle (agachamento raso), mas
é distinto do `lp1` (XOR 33%) e do `crouch` (27%).

### 2.5 f4 especiais — APROVADA com 2 células reprovadas

| Célula | Pose | Veredito | Por quê |
|---|---|---|---|
| L1C1 `sa0` | palmas juntas no quadril | OK | |
| L1C2 `sa1` | palmas empurrando | OK | |
| L1C3 `sa2` | as duas palmas estendidas | OK | x idle: XOR 23,8% [medido], **não** é eco do idle |
| L1C4 `sa3` | volta à guarda | OK | |
| L2C1 `sb0` | joelho alto, braços erguidos | OK | o quadro mais legível do pisão |
| L2C2 `sb1` | base muito baixa, **mãos nos joelhos** | **fraco** (confirmado) | 79% do idle, mas não tem o pé batendo nem as palmas empurrando: lê "agachou e descansou". Troca opcional na WR |
| L2C3 `sb2` | ajoelhado, palma no chão | OK | lê como golpe no chão |
| L2C4 `sb3` | volta à guarda | OK | |
| L3C1 `sc0` | guarda baixa de punhos fechados | OK com ressalva | 88% do idle, XOR 36,5% x idle. Não tem o ombro virado; serve de preparo |
| L3C2 `sc1` | **SOCO, não ombrada** | **REPROVADA → REGERAR** | ver abaixo |
| L3C3 `jkick` | **joelhada com soco** (confirmado) | **REPROVADA → REGERAR** | joelho dobrado, os dois punhos socando à frente; o pé só ganha da mão por poucos px |
| L3C4 `win` | braços cruzados | OK | |

**A ombrada L3C2 NÃO lê como ombrada.** O pedido do Atlas foi "confirme que não é soco", e a medida diz o contrário: o braço da
frente está estendido à frente do ombro, com o punho fechado, e o **punho é o ponto mais à direita da figura** (a ponta do pipeline
caiu nele: `sc1` ponta [365, 72] num quadro de 366 de largura) [medido]. O tronco girado de costas é o mesmo do `hp1` da f3 (os dois
lado a lado leem como dois socos de trás) [visto]. O prompt pedia "arms tucked close to the body". Com isso o TIE SHAN KAO
continua sendo um soco, o mesmo problema do atlas antigo (D4).

**Distinção pedida:** `sc1` x `jkick` = 59,9%; `sc1` x `hp1` = 41,0%; `sa2` x idle = 23,8%; `sc0` x idle = 36,5% [medido]. Nenhuma
célula é duplicata; as reprovações são de **leitura**, não de eco.

**Reparo por recorte ou espelho? Não.** Nenhuma outra célula das 4 folhas tem ombro à frente com braços recolhidos, nem chute aéreo
de perna estendida. O `lk1` (chute lateral no estômago) em pé não serve de `jkick`: o pé de apoio está no chão. **Precisa regerar
só os quadros** (§5).

**Tarja do `sFire` (hoje `quadro: 'special'`, que não existe no atlas novo) [lido em `src/data/apresentacao-especiais.ts`]:**

| Ordem | Pose | Por quê |
|---|---|---|
| 1ª | **`sa2`** (L1C3) | as duas palmas estendidas com os calcanhares das mãos juntos: é o instante do disparo do LONG ZHANG; o dragão sai dali |
| 2ª | `sa1` (L1C2) | mesmo gesto a meio caminho, um pouco menos aberto (XOR 17,2% x `sa2`) |

Achado lateral na mesma tabela: o **`sDown` do WEI aponta para `sb1`**, que é justamente o quadro fraco ("mãos nos joelhos"). Proposta:
`sDown → sb0` (joelho alto, braços erguidos), que combina com a `entrada: 'cima'`. E o `sFwd → sc1` vai mostrar um soco até a WR
entrar.

---

## 3. Reparos sem crédito (configuração do pipeline, para a Vega) [proposta]

### 3.1 Mapa da f1 (com a v2)

`lutadores.json`, `wei-long.celulas.f1`:
`["idle0", ["idle1", "idle3"], "idle2", null, "walk0", "walk1", "walk2", "walk3", "walk4", "walk5", "walk6", "walk7"]`

Respiração: 410 → 415 → 420 → 415 px (ida e volta pelo intermediário). A C4 sai (duplicata da C1). Sem este mapa a v2 já melhora,
mas o idle3 (C4) desce direto de 420 para 410.

Alternativa do andar, só se a emenda incomodar no harness: `"walk0".."walk3"` nas L2C1..C4 com apelidos `["walk0","walk4"]`,
`["walk1","walk5"]`, `["walk2","walk6"]`, `["walk3","walk7"]` e a linha 3 em `null`.

### 3.2 Folhas a usar

`--folha f1=wei-long-f1-base-v2.png --folha f2=wei-long-f2-reacoes-v2.png --folha f3=wei-long-f3-golpes-v1.png --folha f4=wei-long-f4-especiais-v1.png`
(ou mover as `f4-especiais-v2..v4` antigas; ver o resumo).

### 3.3 Ponta [medido no `atlas.json`]

`sb2` com o modo padrão `mao` mede a ponta na cabeça (y 125 de 253), porque a palma está no chão, dentro da faixa dos pés que o modo
ignora. Se o motor usa a ponta do `sb2` para algo, use `"sb2": "direita"`. `jkick` já cai no sapato (y 259 de 365).

---

## 4. Limpezas por código (feitas)

| Arquivo novo | De | O que mudou | Prova |
|---|---|---|---|
| `wei-long-f1-base-v2.png` | f1 v1 | C2 = C1 esticada ×1,0121 na vertical, sola fixa em y≈606, x da antiga C2 | 12 comp.; idle 410/415/420 no atlas |
| `wei-long-f2-reacoes-v2.png` | f2 v1 | 2 respingos do `hitH` apagados (86 px) | 12 comp. |

Pipeline completo nas v2 (scratchpad, `pipe2/`): 4 folhas com 12 componentes cada, halo → 0,0%, 48 quadros, 0 avisos.

---

## 5. Folha de reposição WR (6 créditos): prompt pronto

- **Anexar:** só `wei-long-mestra-v1.png`. **Salvar como:** `arte-fonte/lutadores/wei-long/folhas/wei-long-wr-v1.png`.
- Grade **4x3 padrão** (não 3x2): assim as figuras saem na **mesma escala** das f1-f4 e não pedem `fatorFolha`. São 12 células para
  4 poses-alvo, com 2 ou 3 variantes cada (lição do BAATAR e do ZENON: numa reposição entram 2 a 3 de 6).
- O bloco CHARACTER vai **sem a frase de postura** ("Fighting stance: low wide horse stance, open palms forward"). Lição da NILA f5:
  a frase de postura puxa as células para a guarda, e aqui o problema é justamente o braço estendido à frente.

```
2D fighting game character sprite sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 12 poses arranged in an invisible grid of 4 columns and 3 rows. Every cell has the same size. One full-body figure centered in each cell with clear empty space around it. No figure touches another figure or the image border. Nothing is cut off.
The character always faces RIGHT, unless a cell says otherwise.
Same character, same costume, same face, same proportions and same size in every cell. In each row, the feet of every grounded pose rest on the same invisible baseline near the bottom of the row.
IMPORTANT SPACING: each figure is only about 70% of the height of its row, never taller. Leave an empty band of plain background at least 8% of the image height between rows, above the top row and below the bottom row. Hair, fists, fingers, toes and feet NEVER touch the image border or the next row. Feet are never cut off: both feet and all toes are always fully visible.
In every standing and walking pose at least one foot is flat on the baseline: walking is a step, never a hop. Only jump, air and knockdown poses leave the ground.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no ground shadow, no cast shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders or frames.
NO visual effects of any kind: no glow, aura, energy, fire, lightning, sparks, speed lines, motion trails, smears, dust, impact stars or blur.
Only this one character. No opponent, no other people, no props unless a cell says so.

CHARACTER — WEI LONG: elderly Chinese kung fu master, about 65 years old, tall and powerful, broad chest, thick forearms. Long white hair tied in a topknot bun, long white eyebrows, white beard reaching the chin, calm stern face. Sleeveless royal-blue changshan-style vest with gold trim and a gold dragon embroidered on the front, with a long front panel reaching the shins. Wide black kung fu trousers, black cloth shoes with white soles, plain black cloth wrist bracers. No waist sash, no brown leather. BODY PROPORTIONS and head size exactly as in the attached reference image. Background color: solid flat magenta #FF00FF.

SHEET WR — REPLACEMENT POSES.
Row 1 (shoulder charge, NO punches in this row: in every cell of this row both elbows stay bent and tight against his ribs, no arm is extended, the fists never pass in front of his shoulder): (1) charge start: body turned sideways, the shoulder nearest the viewer pointing to the right, deep low lunge, both forearms folded tight across his chest, chin tucked behind that shoulder. (2) shoulder charge: torso leaning hard forward to the right, the outer side of his shoulder and upper arm is the frontmost point of his whole body, both fists pressed together in front of his chest, front knee deeply bent, back leg straight pushing off, back foot flat on the baseline. (3) back slam: body turned so his upper back and shoulder blade face the right side and drive into the right, head turned to look over the shoulder to the right, both forearms crossed tight over his belly, wide low horse stance. (4) shoulder charge, second version: lunging forward to the right with the shoulder leading, the arm nearest the viewer folded with the elbow down and the fist at his own chin, the other fist at his belly.
Row 2 (in the air, both feet clearly above the baseline): (1) flying side kick: body leaning back, the front leg fully extended STRAIGHT and pointing diagonally DOWN to the right, the sole of the shoe leading, the other knee tucked high under his chest, both arms spread back behind him with open hands for balance, no punch. (2) diving heel stomp: falling diagonally down to the right, the front leg straight with the heel as the lowest and rightmost point of his body, the other leg folded, both hands open and low behind his hips. (3) flying kick, third version: the leg straight and horizontal at hip height pointing right, the shoe as the rightmost point of the figure by a wide margin, both hands open near his own chest. (4) diving palm strike in the air: knees tucked, the arm nearest the viewer extended DOWN and forward to the right with an open palm, the palm is the lowest and rightmost point of his arms, the hand is never above his head.
Row 3 (stamp, no floor and no cracks are drawn): (1) stamp impact: the front foot has just landed flat on the baseline from a high lift, front knee deeply bent, very low wide horse stance, both palms pushing straight DOWN beside his hips with straight arms, fingers pointing forward. (2) stamp impact, second version: the same very low horse stance with both palms pressing down in front of his knees, arms straight, head lowered, hair and front panel swinging down. (3) crouching palm strike: very low horse stance, the whole figure about 75% as tall as a standing pose, the arm nearest the viewer extended straight forward at stomach height with an open palm. (4) stamp impact, third version: the front foot flat on the baseline, the back heel lifted, both palms pushing down toward the front foot.
```

**Aceite da WR (curadoria, medido):**

- 12 componentes; cabeça coque → barba 112-124 px (escala das f1-f4); nenhuma figura na borda.
- **Ombrada (L1C2, L1C3, L1C4; L1C1 é `sc0`):** no recorte, o ponto mais à direita **acima da faixa dos pés** tem de ser
  **ombro/braço dobrado**, não um punho; nenhum antebraço estendido; XOR > 35% contra o `hp1` da f3 e contra o `sc1` atual. Rodar
  `difcruz.py` contra a mestra também: diferença menor que a da respiração (< 3%) = eco, reprova.
- **`jkick` (L2C1-C3):** a base da figura acima da linha de base da fileira; o ponto mais à direita é o sapato e fica **≥ 40 px** à
  frente de qualquer mão; perna de chute reta [visto].
- **`jpunch` (L2C4, bônus):** é a única pose da f5 que o motor usa; se passar, a f5 deixa de ser necessária para ela. Ponta `mao`.
- **`sb1` (L3C1, L3C2, L3C4):** altura ≤ 80% do idle, palmas abaixo da linha do quadril, mãos **fora** dos joelhos.
- **`clp` (L3C3, opcional):** ≤ 80% do idle; só entra se ficar claramente mais baixa que o `clp` da f3 (89%).
- Regra de parada: o que passar entra; o que falhar 2 vezes (contando esta) fica com o v1 e ajusta-se a caixa de acerto. Não gerar
  uma terceira.

**Como entra no pipeline [proposta, Vega]:** `folhasExtras.wr` com grade [4,3], só as células aprovadas nomeadas (o resto `null`), e
as mesmas poses viram `null` em `celulas.f4` (o pipeline recusa nome repetido entre células).

---

## 6. Arquivos

- Relatório: `docs/relatorio-curadoria-wei-long-v1.md` (este).
- Novos: `arte-fonte/lutadores/wei-long/folhas/wei-long-f1-base-v2.png`, `.../wei-long-f2-reacoes-v2.png`.
- Intactos: mestra, f1-f4 v1, f4 v2-v4 antigas, JPG/JFIF antigos.
- WR (§7): `wei-long-wr-v1.png` aprovada pelo dono a olho, curada abaixo. Cópias de segurança das f4 antigas em
  `folhas/_arquivo/` (§7.5).
- Scripts e provas (temporários, fora do repositório): scratchpad da sessão (`medir.py`, `poses.py`, `difcruz.py`, `com.py`,
  `quadril.py`, `barba.py`, `dist.py`, `limpar_f2.py`, `sint_f1.py`, `pipe1/`, `pipe2/`).

---

## 7. Folha de reposição WR (`wei-long-wr-v1.png`, 2400 x 1792): curadoria técnica (23/10/2026)

Gerada com o prompt do §5 (sem a frase de postura no CHARACTER), aprovada a olho pelo dono. É a **2ª tentativa** de `sc1`,
`jkick` e `sb1` (a 1ª foi a f4 v1). Vale a regra de parada do §5: o que falhou aqui fica com o v1, sem 3ª geração.

### 7.1 Comum [medido]

| Item | Valor | Aceite |
|---|---|---|
| Fundo (mediana dos cantos) | 252,2,251 | ok |
| Componentes conexos | **12** | ok |
| Menor margem até a borda | 11 px (base, L3C1); esq. 35 (L2C1), topo 48, dir. 59 | ok, nada na borda (os 2 px de ruído do Runway na última linha e coluna são cortados pelo pipeline) |
| Cabeça coque → barba (`barba.py`) | 116, 119, **108**, 119 / 115, 120, 112, 124 / 120, **131**, 119, 120 | 10 de 12 em 112-124. L1C3 (108): cabeça virada por cima do ombro, a ponta da barba some atrás do ombro; a orelha tem o mesmo tamanho e a mesma altura da L1C1 [visto na grade de 10 px]. L3C2 (131): cabeça baixa (o "cabeça inclinada infla" já conhecido). **Sem `fatorFolha`** |
| Franja magenta na folha | 3.786 px (f1-f4: 3.400 a 3.950) | normal |
| Pipeline real (scratchpad `wr/pipe3/`) | WR 12 comp., halo 71,4% → **0,0%**; atlas 49 quadros (48 + `jpunch`), escala 0,7101, **0 avisos**; nos 4 quadros novos, **0 px** com vazamento magenta > 40 | ok |
| Eco da mestra (`difcruz` com a mestra reescalada para a altura da célula) | 29,9% a 66,9% nas 12 (idle0 x mestra = 17,0%) | **nenhum eco** (limite 3%) |

### 7.2 Veredito por célula

Altura em % do `idle0` da f1 v1 (578 px). "Ponta `mao`" = ponto mais à direita acima da faixa dos pés (22% de 578 = 127 px),
como o pipeline mede. XOR = `poses.xor_min` (silhueta alinhada pela sola). Linha de base da fileira 2 (sem pose no chão) =
base da fileira 1 + passo de 597 px ≈ y 1182.

| Célula | Pose pedida | Medido | Veredito |
|---|---|---|---|
| L1C1 | início da carga (`sc0`) | 92%; antebraços cruzados no peito, nenhuma mão à frente (pele mais à frente x=395; ponta acima dos pés = joelho, x=459); XOR x `sc0` f4 33,8%, x L1C3 27,8% | **ENTRA como `sc0`** (substitui a guarda de punhos da f4 L3C1, que não tinha o ombro virado) |
| L1C2 | ombrada | ponto mais à direita do tronco = **os dois punhos** na altura do queixo (x=467, 36% pele); XOR x `sc1` f4 **27,7%** | **REPROVADA** (punho é a ponta; lê como guarda de boxe) |
| L1C3 | back slam | costas para a direita, cabeça olhando por cima do ombro, antebraços cruzados; o mais à frente do tronco é **ombro/braço dobrado** (x=361 em y 160-240); XOR x `hp1` **39,2%**, x `sc1` **46,6%**, x mestra 35,0% | **ENTRA como `sc1`** (é literalmente o TIE SHAN KAO). Ressalva da ponta no §7.3 |
| L1C4 | ombrada v2 | punho no queixo é o ponto mais à frente do tronco; XOR x `hp1` 38,3%, x `sc1` **32,9%**; x L1C2 17,2% | **REPROVADA** (XOR < 35% contra o `sc1` antigo) |
| L2C1 | voadora lateral | base 96 px acima da linha; sapato x=546, mão mais à frente x=461: **85 px**; perna reta, mas apontando para CIMA (pedido: para baixo) | **PASSA**, fica de **reserva** (`null`) |
| L2C2 | pisão em mergulho | base em y=1183, **na linha** da fileira; sapato 87 px à frente da mão | **REPROVADA** (a base não fica acima da linha: lê como pouso) |
| L2C3 | voadora horizontal | base 96 px acima da linha; sapato x=515, mão mais à frente x=319: **196 px**; perna reta na altura do quadril [visto] | **ENTRA como `jkick`** |
| L2C4 | palmada aérea (bônus) | base 60 px acima da linha; ponta `mao` = **a palma** (x=446; pele até x=442, o resto é contorno), abaixo da cabeça, joelhos recolhidos | **ENTRA como `jpunch`** (dispensa a f5 para essa pose) |
| L3C1 | pisão, palmas para baixo | **95,5%** do idle; palmas abaixo do quadril e fora dos joelhos [visto] | **REPROVADA** (altura: cavalo raso) |
| L3C2 | pisão v2 | **88,4%**; **mãos nos joelhos** (o mesmo defeito do `sb1` v1) | **REPROVADA** |
| L3C3 | `clp` agachado (opcional) | **86,2%** (f3 `clp`: 89%), não é "claramente mais baixa"; XOR x `clp` f3 28,3% | **REPROVADA** → fica o `clp` da f3 |
| L3C4 | pisão v3 | **95,2%**; mãos sobre coxas e joelhos | **REPROVADA** |

**Saldo: 4 de 12** (`sc0`, `sc1`, `jkick`, `jpunch`), dentro do histórico das reposições (BAATAR 2 de 6, ZENON 3 de 6).
`sb1`: 2ª falha → **fica o `sb1` v1** (f4 L2C2) e ajusta-se a caixa de acerto. O modelo não desenha o cavalo baixo do WEI abaixo
de ~88% sem apoiar as mãos nos joelhos. A L3C1 é a de melhor leitura (palmas empurrando para baixo), mas a 95% vira golpe em pé.

### 7.3 Ponta do `sc1` novo [medido no `atlas.json` de `wr/pipe3/`]

Com o modo padrão `mao`, a ponta do `sc1` cai no **joelho da frente**: `[311, 281]` num quadro de 382 de altura (74% para
baixo). O joelho fica 1 px acima da faixa dos pés e 75 px (folha) à frente do ombro. Como a caixa de acerto nasce da ponta
(`montar.ts`: `fy = tipY * scale + h/2`), a ombrada acertaria na altura da canela.

- **Proposta A (Vega, código pequeno):** um modo `mao:F` análogo ao `pe:F`, que só olha as linhas acima de `F` da altura do
  quadro. Com `"sc1": "mao:0.5"` a ponta vai para `[257, 147]` = ombro/antebraço cruzado [medido simulando no quadro do atlas].
- **Proposta B (sem código):** aceitar a ponta no joelho (alcance +54 px do atlas) e subir a caixa pelo `bh` do golpe. Pior: o
  rastro do golpe (`rastro-golpe.ts`) também usa a ponta e sairia do joelho.
- `jkick` (L2C3): ponta `direita` padrão = **o sapato** `[366, 163]`. `jpunch` (L2C4): ponta `mao` padrão = **a palma**
  `[318, 227]`. Nenhuma exceção.

### 7.4 Mapa para o pipeline [proposta, Vega; provado no pipeline real com estas exceções]

`ferramentas/sprites/lutadores.json`, entrada `wei-long` (ainda não existe):

```json
"celulas": {
  "f1": ["idle0", ["idle1", "idle3"], "idle2", null, "walk0", "walk1", "walk2", "walk3", "walk4", "walk5", "walk6", "walk7"],
  "f4": ["sa0", "sa1", "sa2", "sa3", "sb0", "sb1", "sb2", "sb3", null, null, null, "win"]
},
"folhasExtras": {
  "wr": { "grade": [4, 3], "celulas": ["sc0", null, "sc1", null, null, null, "jkick", "jpunch", null, null, null, null] }
}
```

- `celulas.f4`: `sc0` (L3C1), `sc1` (L3C2) e `jkick` (L3C3) viram `null` (o pipeline recusa o mesmo nome em duas folhas).
- Somar a ponta do `sc1` (§7.3) e, se o motor usar a ponta do `sb2`, `"sb2": "direita"` (§3.3).
- Rodada de prova: `wr/pipe3/` no scratchpad, via `gerarLutador` com as exceções acima e as folhas fixadas (f1 v2, f2 v2, f3 v1,
  f4 v1, wr v1): 5 folhas com 12 componentes cada, 49 quadros, 0 avisos.
- Tarja (`apresentacao-especiais.ts`): `sFwd → sc1` agora mostra a ombrada de costas (antes, um soco). `sDown → sb0` continua a
  proposta, porque o `sb1` ficou o v1.

### 7.5 f4 antigas v2-v4 (armadilha do maior vN)

`acharFolha` lê só a raiz de `folhas/` (sem subpastas) e pega o maior vN: hoje devolve `wei-long-f4-especiais-v4.png` (antiga, de
20/10) [medido chamando a função]. Decisão: **arquivar**, em vez de depender de `--folha` em toda rodada (quem esquecer o parâmetro
gera o atlas com o traje antigo sem aviso nenhum).

- **Feito:** cópia de `wei-long-f4-especiais-v2.png`, `-v3.png` e `-v4.png` para `folhas/_arquivo/` (datas preservadas, SHA-256
  iguais aos originais). **Nada foi apagado nem movido**: os originais continuam na raiz.
- **Falta (Atlas, com OK do dono):** tirar os 3 originais da raiz de `folhas/`. `arte-fonte/` é gitignored, então a cópia em
  `_arquivo/` é a única volta. Depois disso `acharFolha` devolve a f4 v1 e a wr v1 sem parâmetro. Até lá: `--folha
  f4=wei-long-f4-especiais-v1.png` obrigatório.

### 7.6 Scripts desta rodada (scratchpad, fora do repositório)

`wr/wr.py` (medidas por célula + XOR contra `hp1`, `sc1`, `sc0`, idle, `jkick`, `sb1`, `clp`), `wr/eco.py` (XOR contra a mestra
reescalada), `wr/faixas.py` (ponto mais à direita por faixa de 40 px), `wr/barba_wr.py`, `wr/cabeca_wr.py`, `wr/crop.py`,
`wr/pipe.mjs` (pipeline real com as exceções do §7.4), saída em `wr/pipe3/`.
