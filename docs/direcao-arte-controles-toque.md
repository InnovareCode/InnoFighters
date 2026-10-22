# Direção de arte — controles de toque (celular)

Apolo, 2026-10-21. Responde à reprovação do dono ("botões muito mal desenhados, coisa feia demais"), sem desfazer o pedido
anterior de controles **menores, no estilo joystick** (E7a).

- **Arte (fonte única):** `arte-fonte/toque/gerar-toque.mjs` gera os 33 SVGs de `public/assets/ui/toque/`. Para mudar
  uma cor ou um ícone, edite o script e rode de novo. Não edite os SVGs à mão.
- **CSS de referência:** `arte-fonte/toque/toque-referencia.css`. É candidato direto a substituir `src/input/toque.css`
  e já foi validado no jogo real, injetado em tempo de execução. O jogo não importa esse arquivo.
- **Validação:** `arte-fonte/toque/validar-toque.mjs` cobre contraste, cor, silhueta e higiene dos SVGs.
  `arte-fonte/toque/capturar-toque.mjs` gera os previews e as medidas no navegador.
- **Previews:** `arte-fonte/capturas/toque-*.png`. Os arquivos `toque-antes-*` mostram o estado atual, para comparar.

---

## 1. O que estava errado (`toque-antes-915x412.png`)

1. **Símbolos de PlayStation (△ ○ □ ✕)** num jogo que não é de PlayStation. Eles não dizem "soco" nem "chute" e
   obrigam o jogador a decorar. As cores (verde, rosa, vermelho, azul) não têm relação com nada do jogo.
2. **Bolhas translúcidas sem material.** Usavam 30% de cor, uma borda branca de 2 px e nenhum volume. Sobre a areia de
   Copacabana viravam manchas lavadas, e o ESQ apagado quase sumia.
3. **Texto de sistema no lugar de desenho:** "ESQ", "ESP" e "II" em Barlow 600 solto, sem hierarquia.
4. **Grade rígida 2x3 sem a curva do polegar.** As duas colunas ficavam na mesma altura, mas o polegar varre um arco.
5. **Joystick de wireframe:** um círculo cinza e uma bolinha cinza, sem guia de direção nem retorno visual ao toque.

## 2. Conceito: "Painel arcade de vidro"

Cada botão segue a lógica de um botão de fliperama premium:

- **Bisel metálico** na cor da função, com gradiente claro no topo e escuro no pé.
- **Tampa de vidro escuro** com reflexo e o ícone claro por cima.
- **Ao apertar, a tampa acende** como um LED, o ícone fica escuro e um halo aparece.

A gramática vem do HUD do próprio jogo. As barras usam miolo escuro `#05060f`, filete claro `#f4f7ff` e contorno
escuro. O SUPER e o custo do especial já são ouro, e o selo ESQ já é ciano. Com isso os controles parecem parte do jogo,
e não um widget colado por cima.

**Sistema de cor = função** (uma família por ação, sem repetir a cor de nenhum lutador como identidade):

| Função | Família | Por quê |
|---|---|---|
| Soco | **Brasa** (laranja-fogo) | É a família do FIGHTERS do logo: golpe de mão, quente e direto |
| Chute | **Cobalto** | É a família do INNO do logo (paleta D): par complementar da brasa |
| Especial | **Ouro** | É a cor do SUPER e do marcador de custo do especial na barra |
| Esquiva | **Gelo** (ciano) | É a cor do marcador e do selo ESQ do HUD |
| Joystick / pausa | **Aço** (prata neutra) | Navegação, não ataque: fica neutro para não disputar com os golpes |

## 3. Tokens de cor (medidos)

Os valores estão em `FUNCOES` no gerador. Quem implementar deve usar os mesmos nomes como variáveis CSS
(`--toque-<função>-<papel>`), caso precise deles fora dos SVGs, por exemplo no rótulo ou numa tela de opções.

| Token | Soco | Chute | Especial | Esquiva | Aço |
|---|---|---|---|---|---|
| `claro` (topo do bisel, fio externo, texto do rótulo) | `#ffc9a0` | `#b8d0ff` | `#fff3b0` | `#d8f7ff` | `#eef1f6` |
| `base` (meio do bisel, tampa acesa, borda do rótulo) | `#ff6a1f` | `#4d7bff` | `#ffc21f` | `#62dcff` | `#a3abba` |
| `escuro` (pé do bisel) | `#8a2506` | `#142a8a` | `#a35a00` | `#0e6a8a` | `#3d4350` |
| `tampaTopo` / `tampaFundo` (vidro) | `#4a1708`/`#1f0802` | `#18245e`/`#080e2c` | `#4d2e02`/`#1f1200` | `#0a3546`/`#03161f` | `#1c2029`/`#090b10` |
| `icone` (repouso) | `#ffe6d1` | `#e3ecff` | `#fff6c8` | `#e6fbff` | `#f4f7ff` |
| `iconeAceso` (apertado) | `#2b0c04` | `#060d33` | `#2e1a00` | `#03202c` | `#0b1020` |

Comuns: contorno `#05060f` (o mesmo do HUD). Desabilitado: bisel `#6a7388`/`#3a4152`/`#1c2030`, tampa
`#161a26`/`#0b0d15`, ícone `#5f687c`.

**Contrastes (WCAG 2.2, fórmula de luminância relativa; script `validar-toque.mjs`):**

| Par | Soco | Chute | Especial | Esquiva | Aço | Critério |
|---|---|---|---|---|---|---|
| Ícone x tampa (repouso, pior ponto) | 12,34 | 12,19 | 11,29 | 12,17 | 15,21 | >= 4,5 |
| Ícone x tampa acesa (apertado) | 6,34 | 5,02 | 10,28 | 10,59 | 8,20 | >= 3 (1.4.11) |
| Bisel x contorno | 7,06 | 5,38 | 12,50 | 12,70 | 8,75 | >= 3 |
| Rótulo (texto) a 85% sobre fundo branco | 7,30 | 7,05 | 9,26 | 9,25 | — | >= 4,5 (1.4.3) |
| Desabilitado: ícone x tampa | 3,11 (todos) | | | | | 2 a 3,5: reconhecível, mas claramente apagado |

**Silhueta contra o fundo.** Uma cor translúcida sozinha nunca garante contraste. Por isso a borda é um par: um
**fio claro** do lado de fora (a cor `claro` da função) e o **contorno escuro** logo depois. Contra qualquer fundo, um
dos dois contrasta. É a mesma regra do aro claro do logo.

| Opacidade | Pior caso entre 4.096 cores de fundo | Pior pixel real das faixas laterais dos 10 cenários + tarjas |
|---|---|---|
| 1,0 | 3,46:1 | 3,50:1 |
| **0,9 (padrão)** | **3,14:1** | **3,20:1** |
| 0,85 | 2,98:1 (magenta puro `#aa00aa`, cor que não existe no jogo) | 3,04:1 |
| 0,7 | — | 2,58:1 |
| 0,5 a 0,6 | — | 2,28:1 (escolha do jogador, abaixo do AA) |

**Distância entre as funções (CIEDE2000 na cor `base`).** Na visão típica o par mais próximo é esquiva/aço, com 21,7.
Os pares de golpe ficam de 30 a 67.

Daltonismo (Machado 2009, severidade 1,0):

- Protanopia: o par mais próximo é esquiva/aço, com 13,6.
- Deuteranopia: o par mais próximo é soco/especial, com 12,0.
- Tritanopia: o par mais próximo é chute/aço, com 18,4.

Todos continuam distinguíveis. Mesmo assim, **a cor nunca é o único sinal**: ícone, posição e rótulo separam tudo.

## 4. Anatomia e estados do botão

O viewBox `0 0 100 100` é **a área de toque inteira**. O disco visível tem 92% dela (raio 46). Do fundo para a frente:

1. Sombra radial (r 49).
2. Halo, só no estado apertado (r 48,8, cor `base`).
3. Fio claro (r 47, 1,8 de espessura).
4. Contorno `#05060f` (r 46).
5. Bisel em gradiente vertical claro, base e escuro (r 44), com um filete de brilho no topo.
6. Friso invertido, escuro em cima e claro embaixo (r 37,5): é o que dá o "afundado" da tampa.
7. Tampa de vidro (r 36).
8. Anel interno fino, **só nos FORTES** (r 31,6).
9. Reflexo elíptico.
10. Ícone (máscara de uma cor, 78% da grade; 60% na pausa).

Nada de `<filter>`, `<text>`, `<image>` ou referência externa: o script reprova se aparecer. Os ids levam prefixo por
arquivo e podem ser embutidos inline sem colisão.

| Estado | Arquivo | Quando | CSS |
|---|---|---|---|
| **normal** | `<botao>.svg` | Repouso | `opacity: var(--toque-opacidade)` |
| **pressionado** | `<botao>-pressionado.svg` | `.on` (já existe em toque.ts) | Opacidade 1 + `transform: scale(.94)` em 60 ms |
| **desabilitado** | `<botao>-desabilitado.svg` | `.sem` | Opacidade x 0,8; o rótulo fica cinza `#8a93a8` |

**Especial e esquiva só acendem com a barra.** O `#esq` já recebe `.sem` (em `fight.ts`, `atualizarBotaoEsquiva`). O
`#r1` precisa do mesmo tratamento: `.sem` quando `p1.en < custoEspecial`, com a mesma regra do "pronta" do HUD.

- **Pronto:** o especial respira em ouro (`drop-shadow` de 1 a 7 px, ciclo de 1,2 s em vaivém). O pulso é lento de
  propósito. O HUD pisca a ~4 Hz, e um segundo pisca-pisca no canto competiria com ele.
- **Acendeu:** ao perder o `.sem`, a classe `.acendeu` por 220 ms dá um estalo de 1,14 para 1 com brilho.
- **`prefers-reduced-motion`:** brilho fixo, sem animação.

## 5. Ícones (desenhados, grade 64, uma cor)

Os ícones avulsos estão em `public/assets/ui/toque/icones/` e servem para `mask-image`, tela de opções ou tutorial.

| Ícone | Desenho | Uso |
|---|---|---|
| `punho` | Punho fechado de frente: 4 dedos, polegar atravessado (recortado), punho da manga | Soco leve |
| `punho-forte` | O mesmo punho a 86% + 3 riscos de impacto no alto à direita | Soco forte |
| `bota` | Bota de lado, bico para a frente: cano com dobra, cadarço, biqueira e sola destacada | Chute leve |
| `bota-forte` | A mesma bota a 86% + 3 riscos de impacto no bico | Chute forte |
| `raio` | Raio + 2 faíscas de 4 pontas | Especial |
| `escudo` | Escudo com friso + 3 riscos de velocidade (escudo em movimento = esquivar) | Esquiva |
| `pausa` | Duas barras | Pausa |

**Silhueta em 24 px** (1 − IoU; 0 = idênticas, 1 = nada em comum; folha em `arte-fonte/capturas/toque-silhuetas.png`):

- O par mais parecido entre funções diferentes é punho/escudo, com 0,56 (mínimo exigido: 0,45).
- Leve/forte da mesma família: punho/punho-forte 0,71 e bota/bota-forte 0,57 (mínimo exigido: 0,25).

O leve e o forte também se separam pela altura (o forte fica na fileira de cima), pelo anel interno e pelo rótulo.

## 6. Catálogo por botão

`D` é o lado da área de toque do botão de ataque:

- **Normal:** `clamp(44px, 11.8 x menor-lado, 56px)`, que dá **48,6 px** em 915x412 e **46,0 px** em 844x390.
- **Compacto:** `clamp(44px, 10 x menor-lado, 50px)`, que dá **44 px** nos dois aparelhos.

`--x` e `--y` dão o centro em unidades de D, medido a partir do canto seguro inferior direito (ou inferior esquerdo,
no modo canhoto).

| Botão (seletor, tecla) | SVGs (normal / -pressionado / -desabilitado) | Área de toque | Centro `--x`, `--y` | Rótulo | Cor do rótulo / borda |
|---|---|---|---|---|---|
| Soco leve (`.lp`, z) | `soco-leve` | D | 1,78 · 1,20 | LEVE | `#ffc9a0` / `#ff6a1f` |
| Soco forte (`.hp`, x) | `soco-forte` | D | 1,78 · 2,36 | FORTE | `#ffc9a0` / `#ff6a1f` |
| Chute leve (`.lk`, c) | `chute-leve` | D | 0,62 · 1,48 | LEVE | `#b8d0ff` / `#4d7bff` |
| Chute forte (`.hk`, v) | `chute-forte` | D | 0,62 · 2,64 | FORTE | `#b8d0ff` / `#4d7bff` |
| Esquiva (`#esq`, n) | `esquiva` | max(44 px, 0,92 D) | 1,78 · 3,50 | ESQUIVA | `#d8f7ff` / `#62dcff` |
| Especial (`#r1`, b) | `especial` | 1,12 D | 0,62 · 3,88 | ESPECIAL | `#fff3b0` / `#ffc21f` |
| Pausa (`#bp`, Escape) | `pausa` | 44 px; desenho a 82% (`--folga: 9%`) | Canto superior direito, 17% do menor lado abaixo do topo seguro | (sem rótulo) | — |

Variáveis CSS por botão (ver `toque-referencia.css`): `--x`, `--y`, `--tam`, `--folga`, `--img`, `--img-on`,
`--img-off`, `--rotulo-cor` e `--rotulo-borda`.

Globais em `#touch`:

| Variável | Valor | Observação |
|---|---|---|
| `--D` | Ver acima | — |
| `--J` | 2,1 D | 2 D no compacto |
| `--toque-opacidade` | 0,9 | — |
| `--seg-esq`, `--seg-dir` | `max(env(safe-area-inset-*), 8px)` | — |
| `--seg-base`, `--seg-topo` | `max(env(safe-area-inset-*), 6px)` | — |
| `--rotulo-tam` | `clamp(10px, .22 D, 12.5px)` | Medido: 10,7 px / 10,1 px |
| `--sobe` | 0 | 1,4% do menor lado no compacto |

**Rótulo:** é uma plaquinha HTML (`::after`, `content: attr(data-rotulo)`) em **Barlow Condensed 800 itálico**, a
fonte do HUD, já carregada. O fundo é `#05060f` a 90%, com borda de 1 px na cor `base` e cantos de 4 px, centrada no pé
do bisel (+40% do lado). Ela ecoa o selo ESQ do HUD. No **compacto** o rótulo some e só o ícone fica.

## 7. Joystick

| Arquivo | Uso |
|---|---|
| `joystick-base.svg` (200) | Disco de vidro escuro translúcido + 2 anéis-guia + 4 setas (cima, baixo, esquerda, direita) + 4 pontos nas diagonais |
| `joystick-aro.svg` / `joystick-aro-ativo.svg` (200) | Anel de aço com fio claro e contorno. O ativo é branco, com halo |
| `joystick-bolinha.svg` / `joystick-bolinha-pressionada.svg` (100) | Alavanca: bisel de aço, tampa côncava escura com anéis de pegada. A pressionada acende em branco-gelo, com halo |

- **Base:** `--J` = 2,1 D, que dá **102 px** em 915x412 e **96,6 px** em 844x390 (88 px no compacto).
- **Bolinha:** 0,44 J, igual à proporção de hoje.
- **Posição:** a borda esquerda fica a `seg-esq + 0,12 D`; o centro fica `1,95 D` acima da base segura.
- **Estado ativo:** classe nova `#joy.ativo`, ligada no `touchstart` e desligada no `fim()` de `toque.ts`. Ela troca o
  aro e a bolinha e leva a opacidade a 1.
- **Captura ampliada:** `#joy::after` com `inset: -0,3 D`. O polegar pode encostar fora do desenho e ainda pegar o
  joystick, e o centro do cálculo continua o da base. É só CSS.

## 8. Layout medido (Playwright, perfil Pixel 7, jogo real)

Centros em px CSS a partir do canto superior esquerdo da janela. O "844x390 com entalhe" simula o iPhone deitado
(laterais de 47 px, indicador de 21 px). O Chromium não emula `env()`, por isso a simulação sobrescreve `--seg-*`.

| Controle | Normal 915x412 | Normal 844x390 (entalhe) | Compacto 915x412 | Compacto 844x390 (entalhe) |
|---|---|---|---|---|
| Joystick (centro · base) | 64,8 · 311,3 · 102,1 | 100,8 · 279,3 · 96,6 | 57,3 · 320,2 · 88 | 96,3 · 283,2 · 88 |
| Soco leve | 820,5 · 347,7 (48,6) | 715,1 · 313,8 (46) | 828,7 · 347,4 (44) | 718,7 · 310,8 (44) |
| Chute leve | 876,9 · 334,1 | 768,5 · 300,9 | 879,7 · 335,1 | 769,7 · 298,4 |
| Soco forte | 820,5 · 291,3 | 715,1 · 260,4 | 828,7 · 296,4 | 718,7 · 259,7 |
| Chute forte | 876,9 · 277,7 | 768,5 · 247,5 | 879,7 · 284,1 | 769,7 · 247,4 |
| Esquiva | 820,5 · 235,8 (44,7) | 715,1 · 207,9 (44) | 828,7 · 246,2 (44) | 718,7 · 209,5 (44) |
| Especial | 876,9 · 217,4 (54,4) | 768,5 · 190,4 (51,5) | 879,8 · 229,6 (49,3) | 769,8 · 192,8 (49,3) |
| Pausa | 883 · 98 (44) | 773 · 94,3 (44) | 883 · 98 (44) | 773 · 94,3 (44) |

Medido nas 8 cenas: `normal`, `em uso`, `entalhe`, `compacto` x 2, `canhoto`, `opacidade 50%` e `encurralados`.

- **Menor alvo:** 44 px. Nenhum controle fica abaixo de 44 px.
- **Sobreposição** entre áreas de toque: 0.
- **`elementFromPoint`** no centro de cada controle devolve o próprio controle em todas as cenas.
- **HUD:** 0 px² de interseção com as zonas do HUD, nas 8 cenas. As zonas são: faixa superior y 0–92 lógico (retratos,
  barras e nomes), SUPER, barra e selo ESQ dos dois lados (y 488–540).
- **Rostos:** 0 px² com os lutadores na posição inicial. Com os dois **encurralados** (P1 x=60, P2 x=900), a caixa
  estimada do rosto do P2 encosta 113 px² na área de toque da ESQUIVA. Na captura `toque-proposta-encurralados-915x412.png`
  o queixo fica cerca de 15 px acima do desenho do botão. O que fica atrás do aglomerado é o tronco do P2 encostado na
  parede: inevitável, e é para isso que existe a opacidade.

**Por que essa forma:**

- O polegar direito gira em torno do canto inferior direito, e o arco dele sobe da esquerda para a direita. Por isso a
  coluna de fora, a do chute (junto da borda), fica 0,28 D mais alta que a do soco: as fileiras seguem o arco.
- A topologia de hoje foi mantida: soco à esquerda, chute à direita, leve embaixo, forte no meio, esquiva e especial em
  cima. Quem já joga não reaprende nada.
- O especial é o maior botão (1,12 D) e fica no topo da coluna de fora, na tarja preta: é o único botão "de decisão".
- A pausa saiu do canto do topo. No 844x390 com entalhe, o canto colidia com o retrato do P2 (o retrato vai de
  x 724 a 762, e a pausa ficaria em x 749 a 793). Ela desceu para logo abaixo da faixa do HUD.
- **Canhoto** (`body.toque-canhoto`): espelho exato, com o joystick à direita e o aglomerado ancorado à esquerda. A
  pausa continua à direita. Captura: `toque-proposta-canhoto-915x412.png`.

## 9. Opacidade ajustável

- `--toque-opacidade` vale para o repouso do joystick, dos botões e dos rótulos. **Padrão: 0,9.** É o menor valor que
  garante 3:1 de silhueta contra qualquer fundo (seção 3).
- O controle apertado ou o joystick ativo vai a 1, sempre.
- Ajuste sugerido em OPÇÕES: "Opacidade dos controles", de 50% a 100%, em passos de 10%.
- Abaixo de 85% o contraste da borda cai abaixo de 3:1 nos piores pixels dos cenários. Isso é escolha do jogador e vale
  dizer no texto de ajuda. Preview em 50%: `toque-proposta-opacidade-50-915x412.png`.

## 10. Para a Lyra implementar (o jogo não foi alterado)

1. **index.html:**
   - Tirar os glifos (`ESQ`, `ESP`, `<b>△</b>`, `II`) e pôr `data-rotulo` em cada `.b` de ataque.
   - Manter ids, `data-k` e `aria-label` como estão.
   - Mapa: `#esq` ESQUIVA, `#r1` ESPECIAL, `.hp` e `.hk` FORTE, `.lp` e `.lk` LEVE.
2. **src/input/toque.css:** portar `arte-fonte/toque/toque-referencia.css`. O `#pad` deixa de ser grid e vira âncora
   absoluta; cada botão se posiciona pelo próprio centro.
3. **src/input/toque.ts:**
   - `joy.classList.add('ativo')` no início do toque e `remove` no `fim()`.
   - Pré-carregar os 9 SVGs de estado aceso e apagado ao ligar o toque (`new Image().src = ...`). Sem isso, o 1º
     aperto pode piscar sem desenho.
4. **src/ui/cenas/fight.ts:**
   - Espelhar `atualizarBotaoEsquiva` para o `#r1`: `.sem` quando `p1.en < custoEspecial`.
   - Na transição de `.sem` para pronto, pôr `.acendeu` por 220 ms.
5. **Opções (persistência):** tamanho (normal/compacto), mão (destro/canhoto) e opacidade. Aplicar como classes no
   `<body>` e `style.setProperty('--toque-opacidade', v)` no `#touch`.
6. **Testes:** `tests/e2e/celular-e7a.spec.ts` usa o centro de `#r1`, e continua valendo. Rodar
   `capturar-toque.mjs` (sem a injeção, depois do porte) para conferir as mesmas medidas da seção 8.

## 11. Como reproduzir

```bash
node arte-fonte/toque/gerar-toque.mjs        # gera os 33 SVGs
node arte-fonte/toque/validar-toque.mjs      # contraste / cor / silhueta / higiene (sai 1 se falhar)
npx vite --port 5195 --strictPort --host 127.0.0.1   # outro terminal
node arte-fonte/toque/capturar-toque.mjs 5195        # previews no jogo real + medidas
```

Arquivos de preview em `arte-fonte/capturas/`:

| Arquivo | O que mostra |
|---|---|
| `toque-antes-915x412.png`, `toque-antes-844x390.png` | O estado atual, para comparar |
| `toque-proposta-normal-915x412.png` | Início da luta, especial e esquiva apagados |
| `toque-proposta-normal-915x412-em-uso.png` | Chute leve e especial apertados, joystick ativo |
| `toque-proposta-normal-844x390-entalhe.png` | Modo normal com entalhe simulado |
| `toque-proposta-compacto-915x412.png`, `toque-proposta-compacto-844x390-entalhe.png` | Modo compacto |
| `toque-proposta-canhoto-915x412.png` | Modo canhoto |
| `toque-proposta-opacidade-50-915x412.png` | Opacidade no mínimo do ajuste |
| `toque-proposta-encurralados-915x412.png` | Lutadores encostados nas paredes |
| `toque-proposta-detalhe.png` | Recorte na resolução do aparelho |
| `toque-folha-estados.png` | 7 botões x 3 estados x 4 fundos, rótulos, joystick e ícones |
| `toque-silhuetas.png` | Silhuetas dos ícones em 24 px |
