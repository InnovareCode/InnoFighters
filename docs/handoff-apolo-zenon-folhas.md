# Curadoria do ZENON ARGYROS: folhas S1 a S10 e arena `gr` (Apolo, 2026-10-21)

Missão `cmvi7zafh01ek01nx88cbi3mt`. Fontes: `arte-fonte/lutadores/zenon/folhas/zenon-s1-v1.png` a `zenon-s10-v1.png`
(2400x1792, grade 3x2, fundo `#00FF00`), mestra `zenon-mestra-v1.png` e `arte-fonte/cenarios/cenario-gr-v1.png` (2752x1536).
Nenhuma imagem foi gerada e nada foi copiado para o projeto. Provas e protótipos ficaram no scratchpad (`apolo/zn/`).

## Resumo

| Folha | Veredito | O que fazer | Créditos |
|---|---|---|---|
| S1 idle + andar | **APROVADO com mapa** | r1c1 e r1c2 são o mesmo desenho (2,4% de diferença na máscara): descarta r1c2 e monta o laço 821/832/836/832 | 0 |
| S2 andar | **APROVADO com ressalva** | 4 das 6 são passada aberta quase igual; mapa posicional. Ver no jogo | 0 |
| S3 agachar, defesas, pulo | **CORRIGIR** | `cblock` (r1c3) saiu quase em pé (88% do idle; o agachar tem 70%). Mapa v1: `cblock` = apelido do `crouch`. Pose de verdade na folha ZR | 0 (ZR) |
| S4 reações | **APROVADO** | nocaute e lançado no ar com a cabeça à ESQUERDA | 0 |
| S5 normais de mão | **APROVADO** | ressalva: `lp1` (tapa) lê quase como o idle | 0 |
| S6 chutes e baixos | **CORRIGIR** | rasteira (r2c2) estende a perna de TRÁS para a esquerda. Mapa v1: `sweep` = apelido do `clk` (r2c1). Pose de verdade na ZR | 0 (ZR) |
| S7 SELO e COLUNA | **APROVADO com ressalva** | SELO estende a mão ESQUERDA, sem anel (o anel fica na mão do quadril). Tentativa na ZR | 0 (ZR) |
| S8 TRIBUTO + aéreos | **CORRIGIR por código** | dedos de r1c3 a 3 px da borda direita, contorno fechado: `acolchoar s8 direita 16` | 0 |
| S9 DECRETO + vitórias | **CORRIGIR por código** | 9 pontinhos de "poeira" junto da mão em r2c3: apagar | 0 |
| S10 cenas | **APROVADO** | r1c1 de costas para a câmera | 0 |
| Arena `gr` | **CORRIGIR por código** | bota preta sobre mármore preto: contraste 1,01:1. Clarear o piso (receita abaixo) | 0 |

**Créditos:** 1 folha de reposição ZR (6 de 80). Teto: 12, só se a `cblock` falhar nas duas células da ZR. O mapa v1 já fecha as
60 poses sem nenhum crédito, então a ZR melhora o resultado e **não bloqueia** a Z5 (atlas).

## 1. Checagens comuns às 10 folhas

**6 componentes em toda folha** (limiar 3000 px). Sem linha de chão: nenhuma corrida horizontal ≥ 700 px fora das próprias
figuras (S4 y=1570 é o corpo do nocaute; S6 y=1518 é a perna do chute baixo). Componentes pequenos: 1 por folha (o ruído de
sempre), exceto a **S9, com 9** (poeira desenhada; §S9). Sem texto, moldura nem efeito fora a poeira.

**Ordem da grade pelo pipeline** (`ordenarGrade`, centro de massa): confere em todas, inclusive nas que invadem coluna vizinha
(S4 nocaute x 1294-2365, S6 r1c3 x 1535-2346, S9 r1c2 x 805-1713).

**Borda:** só a S8 r1c3 chega a x=2396 (3 px da borda). Zoom 4x: ponta dos dedos com contorno escuro fechado, nada cortado.

**Escala (régua: bota e cabeça).**

| Medida (px da folha) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Cano da bota de trás, largura 16 px acima da sola | 72 | 64-71 (andar) | 74 | 70-74 | 69-73 | 72 | 68-73 | 66-72 | 71-78 | 66-73 |
| Cabeça topo→queixo, poses eretas | 112-116 | 111-112 | 118-121 | (reações) | 112-123 | 121-130 | 110-120 | 109-122 | 117-121 | 108-120 |

- A bota (objeto rígido) varia ±3% entre as folhas, ou seja, **a escala é a mesma**. Os 121-130 da S6 vêm das cabeças inclinadas
  para a frente (olhando para baixo no chute): a largura do crânio a 40 px do topo dá só +4% (94-98 contra 91-93 da S1).
  Dentro da tolerância de 5%: **não precisa de `fatorFolha`**.
- **Coerente com a mestra:** cabeça/bota = 288/177 = 1,63 na mestra e 113/72 = 1,57 na S1 (4%). Cabeça/altura = 13,5% na mestra
  e 13,6% no idle da S1.
- Altura do idle (S1): 821-836 px. Agachar (S3 r1c1): 573 px = **70% do idle**, agachado de verdade.

**Fidelidade à mestra (todas as folhas):** cabeça raspada, barba prateada curta, gola alta rígida com forro púrpura, casaco preto
longo e aberto com fio de ouro nas bordas, túnica preta com o broche redondo de ouro, calça grafite, botas pretas, mãos
enfaixadas em couro marrom e o anel de ouro na mão direita (visível na S1, S2, S5, S7, S9). A cicatriz da sobrancelha sai como um
traço escuro sobre o olho (na mestra é um corte avermelhado): invisível na escala do jogo, aceito. Em S3 r1c1 e S6 r2c2 a mão
apoiada no chão tem uma aliança lisa em vez do sinete: detalhe de 6 px, aceito. **O casaco nunca vira capa:** tem mangas em todas
as células, mesmo quando abre atrás nos pulos (S3, S8).

**Mãos e dedos:** zoom em SELO, estalo (S10 r2c1), aplauso (S9 r2c2), mãos no chão (S3 r1c1, S6 r2c2) e garra (S6 r2c2).
Cinco dedos, nada fundido. Prova: `apolo/zn/maos.png`.

**Originalidade (Rugal do KOF):** não lembra. O Rugal tem cabelo loiro penteado para trás, smoking/terno vermelho com gravata,
olho cibernético na versão Omega e o golpe God Press. O ZENON tem cabeça raspada, barba prateada, casaco longo preto de gola
alta sem gravata, tiras de couro do boxe grego e nenhum tapa-olho. O único eco de arquétipo é "vampiro" (gola alta com forro
púrpura), que se desfaz porque não há capa e as mangas são do casaco. Nenhuma pose copia golpe conhecido: a investida que
agarra e esmaga na parede (God Press) não existe no kit.

## 2. Por folha

**S1 (idle 4 + andar 2).** Diferença de máscara entre os idles: r1c1 x r1c2 = **2,4%** (o mesmo desenho); r1c3 e r2c1 diferem
7-9% de todos. Topo da cabeça acima da base: r1c1 821, r1c2 820, r1c3 832, r2c1 836; pés e mão estendida no mesmo lugar (±2 px).
São 3 poses de respiração reais. Laço sem pulo: `idle0` r1c1 (821) → `idle1` r1c3 (832) → `idle2` r2c1 (836) → `idle3` r1c3 de
novo (832). r1c2 descartada. Andar: r2c2 passada, r2c3 passada com o pé de trás saindo do chão.

**S2 (andar 3-8).** Separação dos pés (cano a cano): 274, 310, 318 (linha 1), 341, passagem com o pé de trás no ar (r2c2) e a
guarda aberta (r2c3, 466). Com o S1, são 6 passadas parecidas, 1 passagem e 1 guarda: o ciclo deve "deslizar" um pouco. Para
um chefão que anda devagar, "passeando", aceito pelo mapa posicional. **Se no jogo patinar**, a Lyra filma e eu peço uma S2 v2
(6 créditos) com "step-and-drag" e passagem alternada.

**S3.** `crouch` r1c1 de joelho (70% do idle), `block` r1c2 (mão do anel aberta diante do rosto, punho à frente), `jsquat`,
`jup` e `jtop` (joelhos recolhidos) certos. **`cblock` r1c3 é uma base larga quase em pé: 723 px do topo à base, 88% do idle,
contra 572 do agachar.** No jogo a cabeça ficaria uns 150 px acima da caixa de dano agachada. Mapa v1: `cblock` vira apelido do
`crouch` (altura certa, sem os braços de guarda; a faísca de defesa já comunica). A pose de verdade vai na ZR.

**S4.** `jfall`, `land` (pouso agachado), `hitH` (cabeça jogada para trás), `hitB` (mãos no estômago), `kdAir` (corpo inclinado,
**cabeça à esquerda**), `koFloor` (deitado de costas, **cabeça à esquerda**, pés à direita). Aprovado.

**S5.** `lp0` (mão do anel recolhida ao peito) → `lp1` (mão estendida de palma para baixo: lê quase como o idle, porque a guarda
dele já é a mão estendida; o recolhimento do `lp0` dá o movimento) · `hp0` (palma armada) → `hp1` (palma reta à frente, dedos
para cima) · `lk0` (punhos em guarda) → `lk1` (**cotovelada**, tronco girado, cotovelo à frente na altura do rosto).

**S6.** `hk0` (joelho armado) → `hk1` (chute de bota estendido na altura da cabeça; o pedido era o peito, fica mais alto e
serve) · `clp` (palma agachado, de joelho) · `clk` (chute baixo sentado, perna da frente rente ao chão) · **`sweep` r2c2: a perna
estendida vai para TRÁS (esquerda), e o ponto mais à direita é a mão em garra na altura do peito** (a ponta da rasteira cairia
no meio do corpo) · `upper` (joelhada antiaérea, punho erguido).

**S7.** SELO: `sa0` mão do anel no peito, "anel à frente" (certo); `sa1` braço estendido, palma aberta (**mas é o braço
esquerdo, sem anel**; a mão do anel fica no quadril, visível); `sa3` ajeitando o punho do casaco. COLUNA: `sb0` agachado; `sb1`
joelhada subindo com a **palma aberta para cima** acima da cabeça, casaco caindo para baixo (certo); `sb3` em pé, pernas
juntas (recuperação; não está no ar, aceito). O anel continua visível no quadro do SELO e o efeito E12 desenha um anel grande
na mão, então aprovo. A ZR tenta a versão com a mão do anel.

**S8.** TRIBUTO: `sc0` passo longo e baixo, palma recolhida; `sc1` deslize com a palma estendida na altura do peito; `sc2` ereto
"cobrando". Aéreos: `jkick` (bota descendo à frente, certo); `jpunch` (cotovelada aérea saiu como **preparo**, punho acima da
cabeça, igual ao BAATAR: aceito com a ponta na mão; a ZR tenta a versão descendo). `grab0`: as duas mãos prendendo à frente.
r1c3 encosta na borda: acolchoar.

**S9.** DECRETO: `decreto0` de costas girando, casaco rodando; `decreto1` braço estendido em arco com o anel à mostra;
`decreto2` recuperação. `grab1` arremesso (um braço para trás, outro estendido baixo; lê como lançamento em giro). `vitoria0`
aplaudindo devagar; `vitoria1` olhos fechados, mão no ombro do casaco **com 9 pontinhos de poeira** (efeito): apagar.

**S10.** `entrada0` **de costas para a câmera**, mãos atrás; `entrada1` olhando por cima do ombro; `entrada2` apertando a tira
de couro, sorrindo; `cena0` mão erguida estalando os dedos; `cena1` braços abertos; `cena2` guarda de dois punhos, sem
sorriso. A melhor folha do lote.

## 3. MAPA célula → nome de pose (contrato Apolo → Vega → Lyra)

Ordem de leitura: r1c1, r1c2, r1c3, r2c1, r2c2, r2c3. `[a, b]` = mesmo desenho servindo às duas poses; `null` = descartada.
O layout `chefe` de hoje tem ids `b1..b9, br`: o ZENON precisa de layout próprio (`s1..s10`, mais `zr` quando existir).

**Mapa v1 (vale hoje, 0 crédito):**

```json
"celulas": {
  "s1":  ["idle0", null, ["idle1", "idle3"], "idle2", "walk0", "walk1"],
  "s2":  ["walk2", "walk3", "walk4", "walk5", "walk6", "walk7"],
  "s3":  [["crouch", "cblock"], "block", null, "jsquat", "jup", "jtop"],
  "s4":  ["jfall", "land", "hitH", "hitB", "kdAir", "koFloor"],
  "s5":  ["lp0", "lp1", "hp0", "hp1", "lk0", "lk1"],
  "s6":  ["hk0", "hk1", "clp", ["clk", "sweep"], null, "upper"],
  "s7":  ["sa0", ["sa1", "sa2"], "sa3", "sb0", ["sb1", "sb2"], "sb3"],
  "s8":  ["sc0", "sc1", "sc2", "jkick", "jpunch", "grab0"],
  "s9":  ["decreto0", "decreto1", "decreto2", "grab1", ["vitoria0", "win"], "vitoria1"],
  "s10": ["entrada0", "entrada1", "entrada2", "cena0", "cena1", "cena2"]
}
```

Observações para a Vega:
- `lk` do ZENON é a **cotovelada** (S5 linha 2) e `hk` é o chute de bota (S6): o mesmo encaixe posicional do BAATAR (b5/b6).
- Fora do contrato da spec §12: `sc2` (fim do TRIBUTO), `grab0` (agarrão) e `grab1` (arremesso). O `throw` de base usa a pose
  `punch`; ligar o agarrão/arremesso a `grab0`/`grab1` é decisão da Vega (`poseDaFicha` ou descartar).
- **Pontas** (`ponta` em `lutadores.json`): `lk1: "mao"` (com `direita` a ponta cai na bota da frente, x 2286, e não no
  cotovelo); `upper: "mao"` (com `cima` a ponta é o topo da cabeça, que fica acima do punho; com `mao` é o joelho);
  `sb1`/`sb2: "cima"` (a palma erguida da COLUNA); `decreto1: "mao"` (ganha ponta fora do `COM_PONTA`). O resto fica no padrão.
- `acolchoar: { "s8": { "direita": 16 } }`. Sem `fatorFolha`.

**Mapa v2:** definitivo na §8 (ZR curada em 2026-10-21). Entraram `sweep` e `jpunch`; `cblock` e SELO ficam no v1.

## 4. Correções por código (receitas)

Os scripts estão em `scratchpad/apolo/`. Grave a saída como **v2 ao lado da v1**, nunca por cima.

1. **S9, poeira:** `apagar-pequenos.ps1 -In zenon-s9-v1.png -Out zenon-s9-v2.png -X0 2130 -Y0 960 -X1 2210 -Y1 1005`.
   Rodado numa cópia no scratchpad: apagou 9 componentes (150 px), a contagem volta a 6 figuras + 1 ruído. A mão (componente
   grande) não é tocada.
2. **S8, borda:** sem editar a imagem: `acolchoar s8 direita 16` no `lutadores.json` (o mesmo caso do BAATAR b9).
3. **Arena `gr`, piso:** `piso2.ps1 -In cenario-gr-v1.png -Out cenario-gr-v2.png` (padrão: `AR 50, AG 48, AB 66`, rampa de
   y=1025 a 1085, força cheia até 92% da altura e caindo para 60% na última linha). Levanta o preto do mármore com tinta fria
   (o = A + v·(255−A)/255 por canal): o branco continua branco, os veios e o meandro de ouro ficam, e a arquibancada acima de
   y=1025 não muda.

## 5. Arena `gr`

**Composição:** chão plano de 67% da altura (y≈1030) até a base. A faixa de 80% a 90% (y 1229-1382) só tem mármore e o
meandro incrustado (plano): **nada em pé no chão**, nem no centro. Arquibancada vazia, 9 estandartes lisos (ciano, lilás, rosa,
lima, jade, índigo, âmbar, prata, vermelho), **sem símbolo**. Sem pessoas, estátuas, bandeiras ou texto. Anel de bronze
pendurado no alto, duas colunas nas pontas, mar e tempestade púrpura ao fundo. Estilo coerente com os outros 6 cenários.

**Contraste (luminância relativa WCAG, mediana):**

| Região | Original | Piso v2 (`piso2`) |
|---|---|---|
| Piso, faixa dos pés 80-90% | 0,0115 (RGB médio 30,33,44) | 0,0654 (74,75,98) |
| Bota/barra do ZENON (idle, faixa da bota) | 0,0124 | igual |
| Casaco + calça (metade de baixo do idle) | 0,0248 | igual |
| **Bota contra o piso** | **1,01:1 (some)** | **1,85:1** |
| **Casaco/calça contra o piso** | 1,12:1 | 1,53:1 |
| Tronco contra a arquibancada (40-67%, L 0,116) | 2,19:1 | igual |

O tronco lê bem contra o mármore branco; o problema é só da cintura para baixo, e o casaco tem fio de ouro e forro púrpura
que ajudam. Provas: `apolo/zn/comp-gr.png` (original), `comp-grT.png` (piso v2), `comp-gr60.png` (cinza neutro, mais lavado:
descartado). Escala de jogo: ZENON 918 px (675 × 1,36), HAYATO e CAMILLE 675, pés em y=1308.
Testei também o cinza neutro `A=45`: 1,72:1, mas o piso fica "leitoso" e perde a noite.

**Braseiros (para a sobreposição da fase 2, spec §6):** a arte tem **6 focos, não 8**. Centros em fração da imagem:
(0,181; 0,314), (0,380; 0,345), (0,619; 0,344), (0,817; 0,313) no alto da arquibancada e (0,125; 0,517), (0,876; 0,523) nos
dois braseiros grandes da frente. A Lyra ajusta a sequência para 6 (um a cada 6 ticks preserva os 36 ticks da §3.2).

## 6. Folha de reposição ZR (1 geração, 6 créditos)

- **Anexar:** `zenon-s1-v1.png` (só esta; é a régua de escala). **Salvar como:** `zenon-zr-v1.png`.
- O bloco CHARACTER **sem a frase da postura de luta** (lição da NILA f5: a frase de postura puxa as células para a guarda, e
  a `cblock` saiu alta justamente na base "tall and upright").

```
2D fighting game character sprite sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 poses arranged in an invisible grid of 3 columns and 2 rows. Every cell has the same size. One full-body figure centered in each cell with clear empty space around it. No figure touches another figure or the image border. Nothing is cut off.
The character always faces RIGHT.
Same character, same costume, same face, same proportions and same size in every cell, and the SAME SIZE as the attached sheet: BODY PROPORTIONS exactly as in the attached image (head size, boot size, leg length).
IMPORTANT SPACING: each figure is only about 70% of the height of its row, never taller. Leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row. Fingers, boots and the coat NEVER touch the image border or the next row.
Background: one single flat solid color filling the whole image: pure green #00FF00. No gradient, no floor, no ground line, no shadow.
Absolutely NO text, letters, numbers, grid lines, borders or frames.
NO visual effects of any kind: no glow, aura, energy, sparks, speed lines, motion trails, dust or blur.
Only this one character. No opponent.

CHARACTER — ZENON ARGYROS: Greek pankration master, about 61 years old, very tall, long legs, broad straight shoulders, lean powerful build. Shaved head, short neatly trimmed silver beard, sharp nose, pale gray eyes, a thin old scar through the left eyebrow. A long black tailored coat reaching below the knees, worn open, long sleeves, tall stiff stand-up collar, deep tyrian purple inner lining, one thin plain gold trim along the edges and cuffs; a fitted sleeveless black tunic closed at the chest by one round gold clasp; dark charcoal trousers; black leather boots. Both hands and wrists wrapped in long brown leather thongs, and a heavy gold signet ring on the RIGHT hand. The coat always has its sleeves on his arms: it is never a cape.

SHEET ZR. Row 1: (1) crouching block: squatting very low, both knees fully bent, hips down near the heels, both forearms raised and crossed in front of the face; the whole figure is only about 60% as tall as a standing pose. (2) low sweep: crouching low on the bent back leg, one hand flat on the floor beside the back foot, the FRONT leg extended straight forward to the RIGHT along the floor, the boot sole at ankle height reaching far to the right, the coat spread on the floor behind him to the left. (3) standing, the RIGHT arm (the arm nearest the viewer, the one with the gold signet ring) extended straight forward at chest height, open palm facing forward, the gold ring clearly visible on that extended hand; the left fist low near the hip. Row 2: (1) crouching block, second version: kneeling low on one knee, both forearms raised vertically side by side in front of the face, elbows down; the whole figure only about 60% as tall as a standing pose. (2) low sweep finished: sitting low on the back leg, the front leg fully extended forward to the RIGHT, flat along the floor, both hands on the floor behind him for support. (3) in the air, knees bent, diving elbow strike: the right forearm held across the chest and the ELBOW pointing DOWN and to the RIGHT, the elbow is the lowest and rightmost point of his arms; the fist is never above his head.
```

**Aceite da ZR (curadoria):** 6 componentes; cabeça topo→queixo 112-120 px e cano da bota ~72 px (escala da S1); as duas
`cblock` com altura ≤ 62% do idle (≤ 520 px do topo à base); as duas rasteiras com o ponto mais à direita na bota, abaixo de
15% da altura; SELO com o anel na mão estendida; cotovelo como ponto mais baixo-à-direita no aéreo. Vale a célula que passar
(lição do BAATAR: numa reposição costumam entrar 2 de 6). Se nenhuma `cblock` passar, fica o v1 e **não** se gera de novo.

## 7. Ordem sugerida

1. Vega: layout `s1..s10` com o mapa v1, `ponta`, `acolchoar s8`; S9 v2 pela receita 1. Já dá o atlas da Z5.
2. Atlas/dono: gerar a ZR (6 créditos) e me devolver para curar. Mapa v2 só depois.
3. Lyra ou Vega: `cenario-gr-v2.png` pela receita 3, conversão para `.webp` como os demais; braseiros com 6 focos.

## 8. Mapa v2: curadoria da ZR (Apolo, 2026-10-21, missão `cmvi90ilu01kr01nxhtyzi6ws`)

Fonte: `zenon-zr-v1.png` (2400x1792, 3x2, `#00FF00`). Nada gerado nem copiado; medições em `scratchpad/apolo/` (`extremos.ps1`,
`queixo.ps1`, `largcranio.ps1`, `difcruz.ps1`), provas em `apolo/zr/`.

**Comuns:** 6 componentes, 0 pequenos (sem ruído, sem linha de chão, sem efeito). Nenhum pixel na borda (menor margem: r2c1
x=62 e base y=1767). Linhas separadas (linha 1 termina em y=888, linha 2 começa em y=910); colunas 2 e 3 se sobrepõem na caixa
(1681 x 1663), mas o centro de massa ordena certo. Traje fiel à mestra; **desvio aceito:** anel nas DUAS mãos no aéreo r2c3
(e no punho do quadril em r1c3). Detalhe de 6-10 px, mesmo critério da aliança da S3/S6.

**Escala:** cabeça topo→queixo 115 (r1c3) e 124-125 nas cabeças inclinadas para baixo (r1c2, r2c2, r2c3); largura do crânio a
40 px do topo 93-98 (S1: 91-93; S6 aceita com 94-98); bota de trás 73-74 px (S1: 72); broche de ouro 16-17 px de largura em r1c2, r1c3
e r2c2 (a olho, zoom 6x com grade de 10 px), igual ao da S1. Os +8% da cabeça são a inclinação (como na S6), não escala: **sem `fatorFolha`**.

| Célula | Pedido | Medida | Veredito |
|---|---|---|---|
| r1c1 | `cblock` | 706 px do topo à base = **85% do idle** (aceite ≤ 520). Saiu agachamento largo de sumô, antebraços cruzados no rosto | **REPROVADA** |
| r1c2 | rasteira | 563 px (68%); ponto mais à direita x=1681, y 836-848, **7% da altura**, e é a bota da frente. Mão no chão, casaco aberto atrás | **APROVADA** → `sweep` |
| r1c3 | SELO com anel | anel na mão estendida, sim. **Mas é eco da S1 r1c3** (a referência anexada): mesma caixa (x 1663-2317 x 1662-2333, y 56-888) e só **6,1%** de máscara diferente, menos que os idles entre si (7-9%). A mão do golpe alcança x=2317, 16 px ATRÁS da guarda do idle (2333) | **REPROVADA** (eco) |
| r2c1 | `cblock` 2 | 858 px, **em pé** (dedos acima da cabeça). Lê como defesa alta, não agachada | **REPROVADA** |
| r2c2 | rasteira 2 | 542 px; ponto mais à direita x=1686 a 20% da altura própria (13% do idle): a ponta da bota, com a sola vertical do chão até ali. Passa na intenção | **APROVADA, reserva** (o contrato só tem uma `sweep`) |
| r2c3 | cotovelada aérea | ponto mais à direita x=2286, y 1217-1248 = **cotovelo**, o mais baixo dos dois braços (punho de trás em y≈1145); punho nunca acima da cabeça (topo 989) | **APROVADA** → `jpunch` |

Entraram 3 de 6 (o padrão do BAATAR era 2). **A `cblock` falhou em 3 células de 2 gerações** (S3 r1c3, ZR r1c1, ZR r2c1): pela
regra da §6, fica o apelido do `crouch` e **não se gera de novo**. O SELO fica no S7: um quadro ativo que muda menos da guarda que
a própria respiração não lê como golpe, e o E12 já desenha o anel na mão.

**Mapa v2 (definitivo para a Z5):**

```json
"celulas": {
  "s1":  ["idle0", null, ["idle1", "idle3"], "idle2", "walk0", "walk1"],
  "s2":  ["walk2", "walk3", "walk4", "walk5", "walk6", "walk7"],
  "s3":  [["crouch", "cblock"], "block", null, "jsquat", "jup", "jtop"],
  "s4":  ["jfall", "land", "hitH", "hitB", "kdAir", "koFloor"],
  "s5":  ["lp0", "lp1", "hp0", "hp1", "lk0", "lk1"],
  "s6":  ["hk0", "hk1", "clp", "clk", null, "upper"],
  "s7":  ["sa0", ["sa1", "sa2"], "sa3", "sb0", ["sb1", "sb2"], "sb3"],
  "s8":  ["sc0", "sc1", "sc2", "jkick", null, "grab0"],
  "s9":  ["decreto0", "decreto1", "decreto2", "grab1", ["vitoria0", "win"], "vitoria1"],
  "s10": ["entrada0", "entrada1", "entrada2", "cena0", "cena1", "cena2"],
  "zr":  [null, "sweep", null, null, null, "jpunch"]
}
```

Diferenças do v1: `s6` r2c1 deixa de servir à `sweep`; `s8` r2c2 vira `null`; nova folha `zr` (layout com `s1..s10` + `zr`).

**Pontas:** nenhuma exceção nova. `sweep` no padrão `direita` cai na bota (x 1681). `jpunch` no padrão `mao` cai no cotovelo:
o cotovelo está 364 px acima da base do quadro, bem fora da faixa dos pés (22% de `alturaRef` ≈ 182 px). As exceções do v1
(`lk1`, `upper`, `sb1`/`sb2`, `decreto1`) e `acolchoar s8 direita 16` continuam.

**Recortes:** o pipeline recorta por componente, nada a fazer à mão. Caixas para conferência: r1c2 `x 716-1681, y 325-887`;
r2c3 `x 1692-2286, y 984-1612` (no ar, base em 1612). Nenhuma receita por código na ZR.

**Reserva (fora do mapa):** r2c2 serve de segunda `sweep` se a Vega quiser 2 quadros ativos; r2c1 serve de `block` alternativo
(dois antebraços erguidos, lê melhor que o S3 r1c2), se o dono preferir. Nenhuma das duas muda o contrato.
