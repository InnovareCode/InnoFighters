# Curadoria dos 6 cenários (v1)

Apolo, 2026-10-20. Fonte: `arte-fonte/cenarios/cenario-{jp,ng,mx,fr,in,mn}-v1.png` (todos 2752 x 1536, conferido).
Especificação: `docs/prompts/09-cenarios.md`. Nada foi gerado no Runway nem copiado para `arte-fonte/`; os testes
de correção ficaram no scratchpad.

## Veredito

| Cenário | Veredito | Motivo |
|---|---|---|
| JP — Castelo das Cerejeiras (HAYATO) | **APROVADO** | Deque limpo de 74,1% até embaixo (base do parapeito; no jp.jpg atual é 71,5%). Só pétalas soltas no chão. Lanternas e castelo sem escrita. |
| NG — Tinturaria de Kano (AMINU) | **CORRIGIR** (por código) | Potes, cestos e varas nos dois cantos de baixo cruzam a linha dos pés. Receita testada abaixo. |
| MX — Arena de lucha libre (CENTELLA) | **APROVADO** | Lona limpa de 73% até embaixo; postes só em x 3,5-10,5% e 89-97%, acima de 73%. Neons abstratos, sem letras. Torcida só como silhueta desfocada no fundo. |
| FR — Velho Porto de Marselha (CAMILLE) | **CORRIGIR** (por código) | Dois caixotes no canto inferior direito: topo a 86,9% em x 91,8-100% e a 96,1% em x 76,3-91,8%. Encosta na linha de 87%. Receita testada abaixo. |
| IN — Fort Kochi (NILA) | **APROVADO** | Calçada molhada limpa de 72,6% (base da mureta) até embaixo. Abertura central na mureta mostra o mar, o que deixa o centro respirando. |
| MN — Estepe do Naadam (BAATAR) | **APROVADO** (com ressalva) | Grama plana; a 70% já é chão. Flores altas só nas bordas: até 82% em x 4-12% e até 83% em x 93-97%. Num lutador encostado no canto, a haste aparece atrás do tornozelo. É detalhe, não pede retrabalho. |

Nenhum dos seis tem pessoa em primeiro plano, texto legível, logo ou UI (conferido com zoom 1:1 nos neons do MX, nas
fachadas e barcos do FR e nas lanternas do JP).

## A linha dos pés é 84,5% da imagem, não 87%

O documento diz "pés a 87% da altura" porque `GROUND = 470` de 540. Mas o cenário não é desenhado do tamanho da tela:
`src/render/cenario.ts` desenha o fundo em y = -20 com 580 de altura (e 1020 de largura). Então os pés caem em
(470 + 20) / 580 = **84,5% da altura da imagem**. O zoom da câmera é ancorado no chão (`camera.ts`), então essa linha
não muda com o zoom.

Consequências medidas:

- A tela corta 3,4% em cima, 2,1% embaixo e cerca de 3% de cada lado (mais a paralaxe e o zoom).
- O centro do lutador vai de x = 60 a 900 (`fighter.ts`), ou seja, de **8,8% a 91,2% da largura da imagem**. Os pés
  chegam a cerca de 4% e 96%. "Só nas bordas" na prática significa fora de x 4-96%, ou abaixo da linha dos pés.
- Com 255 px de guarda na tela, o lutador ocupa 675 px na imagem (BAATAR, 864): da linha dos pés até cerca de 40%
  da altura.

Nos seis cenários, a faixa de 84,5% está limpa onde a de 87% está limpa, então o veredito não muda. Mas o
`docs/prompts-arte.md` §8 e o `09-cenarios.md` devem dizer 84,5% (ou manter 87% e pedir "limpo de 80% até embaixo").

## Lutadores sobre o fundo (composição medida)

Recortei o idle da folha 1 de HAYATO (cinza), BAATAR (vermelho), CAMILLE (azul-marinho) e do dono da casa, e colei em
escala de jogo (675 px; BAATAR 864) com os pés a 84,5%. Arquivos: `scratchpad/apolo/cen/comp-{jp,ng,mx,fr,in,mn}.png`.

| Cenário | Dono da casa | Vermelho / azul / cinza |
|---|---|---|
| JP | HAYATO: o amarelo do traje conversa com as lanternas, e o grafite destaca sobre o branco do castelo e sobre o céu laranja. | Todos se destacam. O marinho fica mais fraco só sobre a ponte vermelha escura da direita. |
| NG | AMINU: o índigo do calção é o mesmo dos panos da tinturaria (amarra a história) e o calção fica abaixo dos panos, sobre a terra laranja. | O vermelho sobre a terra vermelha segura pelo contorno e pela saturação. **Atenção:** o marinho sobre os panos índigo do lado direito (x 78-100%, y 15-55%) perde contraste no tronco. |
| MX | CENTELLA: o turquesa é a cor mais saturada na altura dos lutadores, sobre a torcida escura. Melhor encaixe dos seis. | Todos fortes. As cordas vermelhas cruzam os corpos, o que é convenção do gênero. |
| FR | CAMILLE: o marinho e a prata sobre o pastel pêssego dão o maior contraste de valor dos seis. | Todos fortes. |
| IN | NILA: o off-white estoura sobre a tempestade roxa, e a faixa vermelho-terra repete o laterito do chão. | O marinho fica médio sobre as ruínas escuras da borda direita. O resto é forte. |
| MN | BAATAR: o vermelho é complementar ao verde-ouro, e o calção marinho fica sobre a grama. | Todos fortes. |

**Estilo:** os seis são desenho com contorno a tinta e sombra chapada, compatíveis com os lutadores nas composições. O FR
é o mais suave (pastel, traço fino), o que ajuda a profundidade. O NG puxa para quadrinho ocidental (hachura); ainda
combina.

## Receitas (testadas em cópia no scratchpad)

Pasta dos testes (temporária, desta sessão):
`C:\Users\PERSON~1\AppData\Local\Temp\claude\C--Users-Personal-Computer--claude-spares-spare-GQ8h1Y\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\apolo\cen\`
(abreviada como `scratchpad/apolo/cen/` neste documento). Script: `Espelho.cs` + `espelho2.ps1`. Para cada pixel do retângulo, ele copia de outro ponto da
**mesma linha** e mistura na costura (rampa lateral F, rampa de cima Ft). Saídas de teste:
`scratchpad/apolo/cen/ng-v2-teste.png` e `fr-v2-teste.png` (2752 x 1536).

**NG → `cenario-ng-v2.png`** (translação; o espelho foi testado e cria manchas simétricas visíveis):

| Canto | Retângulo (px) | Fonte | Rampas |
|---|---|---|---|
| esquerdo | x 0-745, y 1236-1536 (0-27%, 80,5-100%) | x + 745 (terra limpa de 27-54%) | lateral 120 na borda direita, topo 30 |
| direito | x 2202-2752, y 1215-1536 (80-100%, 79-100%) | x - 550 (terra limpa de 60-80%) | lateral 120 na borda esquerda, topo 30 |

A rampa de topo tem que ser curta: com 120 px, os potes que começam a 85% reaparecem como fantasma. Os potes e as
pedras atrás da linha de 70% ficam, porque estão no fundo. Resultado: 84,5% e 87% limpos de ponta a ponta. Ficam duas
manchas de sombra repetidas (x 23-28% e 74-82%, y 88-92%), que leem como textura de chão.

**FR → `cenario-fr-v2.png`** (espelho; a perspectiva das lajes é simétrica em torno do centro):

| Canto | Retângulo (px) | Fonte | Rampas |
|---|---|---|---|
| inferior direito | x 2040-2752, y 1312-1536 (74,1-100%, 85,4-100%) | espelho do canto esquerdo (xs = 2751 - x) | lateral 40 na borda esquerda, topo 40 |

O topo foi posto em 85,4%, numa junta horizontal de laje, para esconder a costura. Com x0 = 2090, sobrava a quina do
caixote pequeno; 2040 resolve. Juntas continuam na costura a olho em zoom.

**Plano B (Runway, 1 geração cada, anexando só a v1):**

```
Edit this image: remove the clay pots, baskets, sticks and wood pieces in the bottom-left and bottom-right corners, below 80% of the image height. Continue the same flat reddish earth floor there. Do not change anything else.
```
```
Edit this image: remove the two wooden crates in the bottom-right corner. Continue the same light stone quay paving there, with the same slab pattern. Do not change anything else.
```

## Checklist de aceite (09-cenarios.md)

| Item | JP | NG | MX | FR | IN | MN |
|---|---|---|---|---|---|---|
| 16:9, maior resolução (2752 x 1536) | ok | ok | ok | ok | ok | ok |
| Sem pessoas em primeiro plano, sem texto | ok | ok | ok (torcida no fundo) | ok | ok | ok |
| Chão livre de 70% até embaixo, 87% limpo | ok (começa a 74%) | **falha nos cantos** | ok (73%) | **caixote a 86,9%** | ok (72,6%) | ok (flores nas bordas) |
| Centro sem poluição | médio (base do castelo) | médio (tanques e potes a 52-66%) | ok | ok | ok | ok |
