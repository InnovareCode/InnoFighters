# InnoFighters — proposta de expansão: logotipo e novos lutadores

Autor: Apolo (direção de arte) · 2026-10-20 · documento de proposta, **nenhum código foi alterado**
Escopo: (1) paleta coesa para o logotipo "INNO FIGHTERS" da tela de título; (2) 4 novos lutadores + 1 chefão, ordem de
desbloqueio no Arcade e arco narrativo do final.

## 0. Resumo das decisões propostas

| Tema | Recomendação | Alternativas |
|---|---|---|
| Logo | **Paleta A, "Ouro Forjado"**: INNO em ouro polido, FIGHTERS em brasa, contorno único dourado, emblema de cor única | B "Cromo e Rubi" · C "Gelo Elétrico" |
| Novos lutadores | **AMINU** (Nigéria, dambe) · **CENTELLA** (México, lucha libre) · **CAMILLE** (França, savate) · **NILA** (Índia, kalaripayattu) | — |
| Chefão | **BAATAR, o Avarga** (Mongólia, bökh): gigante, agarrão de comando, armadura passiva, 2ª fase "Dança da Águia" | — |
| Desbloqueio | AMINU → CENTELLA → CAMILLE → NILA → BAATAR (este só ao ser derrotado) | ordem por espetáculo (seção 2.6) |
| Arco do Arcade | "A Volta ao Mundo": cada estilo luta na casa do outro; a final é no Naadam, a única arena sem paredes | — |

---

## 1. LOGOTIPO

### 1.1 Diagnóstico (visto na tela rodando, não só no código)

Capturei a tela de título em `http://localhost:5173` (Playwright, 1280×800) nas três fases: logo sozinho no fundo escuro,
painel dos 4 lutadores e título com o castelo japonês. O "estranho" que o dono sentiu tem três causas concretas:

1. **Dois logos empilhados, não um.** INNO usa um degradê cromado frio (`#ffffff → #e3ecff → #7086bd → #d2ddff`) com
   contorno azul `#9fd2ff`; FIGHTERS usa um degradê de fogo (`#fff8c8 → #ffc53d → #ff6a00 → #c8161c`) com contorno
   dourado `#ffe08a`. Temperatura, material e cor do contorno mudam de uma palavra para a outra. O olho lê "marca de
   tecnologia" em cima e "jogo de luta" embaixo.
2. **A faixa do horizonte cromado é cinza-ardósia.** O stop `#7086bd` a 50% vira uma listra cinza-azulada no meio de
   INNO. Sobre o pôr do sol do Japão (fundo quente), parece sujeira, não reflexo.
3. **O anel tem uma terceira paleta.** `desenharEmblema` pinta 4 arcos com o `fire[0]` de cada lutador (ciano, lilás,
   rosa, limão). Somado ao frio de INNO e ao quente de FIGHTERS, são três sistemas de cor brigando no mesmo ponto focal.
   E o desenho não escala: com 9 lutadores, viram 9 arcos de cores diferentes (o código usa `i * π/2`, só cabem 4).

O que está **bom** e deve ficar: a tipografia itálica pesada, o volume 3D em degraus, o contorno preto grosso (é o que
garante leitura sobre qualquer cenário) e o brilho que atravessa as letras.

### 1.2 Princípio das três propostas

- **Uma palavra, uma família.** INNO e FIGHTERS podem diferir em *material* (metal x incandescente) ou em *valor*, mas
  não em temperatura e contorno ao mesmo tempo.
- **Contorno interno único** para as duas palavras (hoje são dois).
- **Emblema de cor única**, que pertence ao torneio e não a um lutador. As cores dos lutadores continuam onde já
  funcionam: brilho atrás de cada um na fileira, nomes, barras.

Validação: renderizei as quatro versões (atual + A, B, C) replicando o algoritmo de `obterLogo()` sobre os cenários
`jp`, `br` e o fundo escuro da abertura. As três novas leem como um objeto só; a atual lê como dois.

### 1.3 Paleta A, "Ouro Forjado" (RECOMENDADA)

Conceito: o troféu do torneio. INNO é ouro polido (metal), FIGHTERS é o mesmo metal em brasa (incandescente). Família
quente única, hierarquia mantida pelo tamanho e pelo material.

| Elemento | Valor |
|---|---|
| INNO, preenchimento (vertical, mesmo eixo de hoje) | `0 #fffdf2` · `0.40 #ffe7a3` · `0.50 #9a5a12` (horizonte) · `0.55 #ffcf5c` · `0.82 #ffb83a` · `1 #fff0c2` |
| FIGHTERS, preenchimento | `0 #fff3c4` · `0.42 #ffbe33` · `0.56 #ff5a12` · `1 #b0101c` (quase o atual, ajustado para casar com o ouro) |
| Contorno interno (7 px), as duas palavras | `#ffe08a` |
| Contorno externo (22 px) | `#0b0306` (preto quente, no lugar de `#07040f`) |
| Volume 3D | camadas distantes (`i > 12`) `#0a0204`; demais `#4a0e0c` (vinho-ferrugem, no lugar do roxo `#2a0d3a`) |
| Fio de luz (2 px, α 0.55) | `#fff6dc` (no lugar de `#ffffff`) |
| Brilho que atravessa | `rgba(255,246,214, 0 → 0.85 → 0)`, mesma geometria de hoje |
| Emblema, arco principal (7 px) | um só arco contínuo com degradê cônico `#ffe08a → #ff8a1e → #ffe08a`, ou 4 segmentos alternando essas duas cores |
| Emblema, arco interno (2 px) | `rgba(255,240,200,.55)` |
| Emblema, halo | `rgba(255,150,60,.30)` (quase o atual) |
| Brasas do título | família brasa `#ffd27a` / `#ff9a3d` / `#ff5a12`; opcional: 1 em cada 6 na cor do lutador em destaque |

Por que é a recomendada:
- **Menor mudança com maior efeito.** FIGHTERS já funcionava; só INNO e o anel mudam de família.
- **Casa com o resto da interface.** "TORNEIO MUNDIAL DE ARTES MARCIAIS" e "PRESSIONE ENTER" já são dourados: o logo
  passa a falar a mesma língua da UI.
- **Não pertence a nenhum lutador.** Ouro não coincide com ciano (HAYATO), lilás (WEI LONG), rosa (MIN-JI), limão (CAIO)
  nem com as cores propostas para os novos (seção 2.2). É a cor do troféu.
- **Escala para 9 lutadores** sem redesenho do emblema.
- Linhagem clássica de fliperama (ouro e fogo), que o público do gênero reconhece de imediato.

Risco: sobre o pôr do sol de Copacabana e do Japão o ouro tem menos contraste de *matiz* que o cromo. O contorno preto de
22 px resolve; na renderização de teste a leitura ficou firme nos dois cenários.

### 1.4 Paleta B, "Cromo e Rubi"

Conceito: coesão por material. As duas palavras são metal polido com o mesmo horizonte a 50%; muda só a liga.

| Elemento | Valor |
|---|---|
| INNO | `0 #ffffff` · `0.40 #ececf1` · `0.50 #565964` · `0.54 #c9cbd4` · `1 #ffffff` (cromo neutro, sem o azul) |
| FIGHTERS | `0 #ffd6d2` · `0.40 #ff4b45` · `0.50 #6e0510` · `0.54 #e01e2b` · `1 #ff8476` (rubi cromado) |
| Contorno interno, as duas | `#f2f3f7` |
| Contorno externo | `#07030a` |
| Volume 3D | `#08020a` / `#3a0610` |
| Fio de luz / brilho | `#ffffff`, como hoje |
| Emblema | arco prata `#e6e8ef` com segmentos rubi `#e01e2b`; halo `rgba(255,60,60,.22)` |

Prós: a leitura mais forte das três sobre qualquer fundo (cromo neutro contrasta com céu quente e frio); visual premium,
"esportivo". Contras: o rubi encosta no carmim da MIN-JI (`#d4144f`) e o horizonte duro nas duas palavras pesa mais.

### 1.5 Paleta C, "Gelo Elétrico"

Conceito: família fria única, como contraponto aos cenários (3 dos 4 fundos são quentes: pôr do sol, lanternas, praia).

| Elemento | Valor |
|---|---|
| INNO | `0 #ffffff` · `0.40 #eef4ff` · `0.50 #5f6f96` · `0.54 #cfdcf5` · `1 #ffffff` (o cromo atual, limpo) |
| FIGHTERS | `0 #e6fbff` · `0.40 #5fd8ff` · `0.56 #1f6fff` · `1 #3a1fb8` (raio azul para índigo) |
| Contorno interno, as duas | `#bfe9ff` |
| Contorno externo / volume | `#07040f` / `#05020a` e `#2a0d3a` (os atuais) |
| Emblema | `#bfe9ff` / `#3fa9ff`; halo `rgba(80,170,255,.26)` |

Prós: maior separação figura-fundo nos cenários quentes; ar moderno. Contras: perde o fogo, que é o código visual do
gênero; e azul-elétrico é exatamente a identidade do HAYATO (`#6fe0ff`, `#1e6fe8`), então o logo parece "do HAYATO".

### 1.6 Notas para a implementação (qualquer paleta)

- Tudo cabe em `src/ui/logo.ts`: o array `PALAVRAS` (preenchimento e `edge`), as cores do volume (linha do
  `i > 12 ? ...`), o `strokeStyle` externo, o fio de luz, o degradê do brilho e `desenharEmblema`.
- O emblema deve deixar de iterar `ROSTER` para pintar cores; isso também evita quebrar quando o elenco crescer.
- As `Brasas` sorteiam `ROSTER[e.c]` com `e.c` entre 0 e 3: com elenco maior, a cor fica presa aos 4 primeiros.
- Fonte: o logo usa `Impact` com fallback `Arial Black`. Em Linux/Android sem Impact, o desenho muda. Considerar uma
  webfont livre parecida (ex.: Anton, licença OFL) embutida; é uma pendência à parte, não muda a paleta.

---

## 2. PERSONAGENS

### 2.1 Princípios usados

- **Nenhum país repetido**, e o elenco passa a cobrir 5 continentes: Ásia Oriental (3), América do Sul, África, América do
  Norte, Europa, Ásia do Sul e Ásia Central (chefão).
- **Equilíbrio de gênero:** hoje são 3 homens e 1 mulher. Com a expansão: 5 homens e 4 mulheres.
- **Cada um traz uma mecânica nova ao motor**, não uma variação de projétil. Os 4 atuais giram em torno de projétil
  (todos têm `sFire` com `proj`), subida invulnerável, investida e salto. Os novos introduzem: carga com quebra de guarda,
  borda da tela como arma, contra-golpe, troca de postura com estado negativo no rival, e o chefão com agarrão de comando
  e segunda fase. Dois dos novos **não têm projétil**, o que diversifica os arquétipos (rushdown e grappler).
- **Silhuetas distintas** lidas em preto chapado: alto e assimétrico, compacto e mascarado, vertical e esguio, baixo e
  serpenteante, e o gigante.
- **Roda de cores sem colisão** (energia `fire` e `accent`):

| Lutador | Matiz | Já existe |
|---|---|---|
| HAYATO | ciano/azul elétrico (~200°) | sim |
| WEI LONG | lilás/roxo (~275°) | sim |
| MIN-JI | rosa/carmim (~340°) | sim |
| CAIO | limão/verde (~80°) | sim |
| CENTELLA | turquesa-jade (~162°) | novo |
| AMINU | índigo profundo (~235°), acento cobre | novo |
| NILA | âmbar de chama de lamparina (~38°) | novo |
| CAMILLE | prata gelo (neutro) | novo |
| BAATAR | vermelho-brasa com ouro (~5°) | novo |

- **Respeito cultural:** cada ficha tem um bloco "Cuidar" com o que evitar. Termos em idioma local estão marcados para
  revisão de falante nativo antes de virarem nome de golpe na tela.

### 2.2 Quadro-resumo

| | AMINU | CENTELLA | CAMILLE | NILA | BAATAR (chefão) |
|---|---|---|---|---|---|
| País | Nigéria (Kano) | México (Cidade do México) | França (Marselha) | Índia (Kerala) | Mongólia |
| Estilo | Dambe (boxe hauçá) | Lucha libre | Savate / boxe francesa | Kalaripayattu | Bökh (luta mongol) |
| Título | A Lança de Kano | A Faísca da Arena | A Riposte de Marselha | A Lua de Kerala | O Avarga das Estepes |
| Arquétipo | rushdown de carga | aérea / mobilidade | contra-atacante | técnica de duas posturas | grappler gigante |
| Mecânica de assinatura | carga em 3 níveis + quebra-guarda | borda da tela: rebote e agarrão aéreo | postura de aparar e responder | troca de postura + ponto marma (estado negativo) | agarrão de comando, armadura passiva, 2ª fase |
| Projétil | não | não | não | não (tem deslize que passa sob projéteis) | não |
| Energia (`fire`) | `#6f7dff` `#eef0ff` `#2b2fa6` | `#22e3b0` `#eafff8` `#0b9a7a` | `#e6ebf7` `#ffffff` `#8a94b0` | `#ffb02e` `#fff6dc` `#d9720b` | `#ff4a2e` `#fff0d6` `#9c140f` |
| `accent` | `#d9822b` (cobre) | `#19d9a8` | `#a9b8e6` | `#ffa21f` | `#e0402a` |
| Escala | 1.06 | 0.95 | 1.03 | 0.98 | 1.28 |
| Barras (FOR/VEL/DEF/ALC) | 4/3/3/4 | 3/5/2/2 | 3/3/4/4 | 3/4/3/3 | 5/1/5/3 |

Os números de atributo são ponto de partida para balanceamento (Nova/Vega), no mesmo vocabulário de `LutadorDef`.

### 2.3 Fichas

#### AMINU — "A Lança de Kano" · Nigéria · Dambe

- **Quem é:** 26 anos, filho de uma família de tintureiros dos poços de índigo de Kofar Mata, em Kano (tingimento
  artesanal com séculos de história). Os antebraços têm marcas de índigo do trabalho. Bem-humorado, provocador com a
  plateia, mas leva o ofício da família a sério: luta para provar que o dambe é esporte de elite, não "briga de feira".
- **Estilo:** dambe, o boxe tradicional hauçá. Uma mão é a "lança" (enrolada em corda, golpeia) e a outra o "escudo"
  (mão aberta à frente, apara e mede distância).
- **Silhueta:** alto e magro, braços longos, **assimétrico**: braço de trás grosso pela atadura, braço da frente aberto
  e estendido. Base baixa com a perna da frente enfaixada. É a silhueta mais fácil de reconhecer do elenco.
- **Traje e paleta:** bermuda tingida de índigo, faixa de cintura com bordado hauçá em fio cobre, atadura natural cru na
  mão da lança. Pele retinta com rim light frio. Energia índigo, acento cobre.
- **Cenário:** "Poços de Índigo de Kano, Nigéria": os tanques circulares de tingimento no chão, tecidos índigo secando
  em varais, muralhas de barro vermelho ao fundo, fim de tarde com poeira dourada e plateia ao redor.
- **Atributos sugeridos:** `pow 1.06 · spd 0.98 · hp 102 · jump 0.92 · scale 1.06 · stride 12 · reach 1.08`.
- **Especiais:**
  - **ESP — MASHI** ("lança", termo hauçá a validar): **segurar** ESP carrega o soco em 3 níveis (luz do punho cresce;
    dá para andar devagar carregando). Soltar dispara um direto. Nível 1 rápido e barato; nível 2 derruba; **nível 3
    quebra a guarda** (defesa não segura e deixa o rival atordoado). *Novo no motor: botão segurado + quebra-guarda.*
  - **↓+ESP — GARKUWA** ("escudo", a validar): a mão aberta à frente por ~20 quadros **anula um projétil frontal** e
    converte em +1 nível de carga da MASHI. Não para golpe corpo a corpo. *Novo: janela de absorção de projétil.*
    É o antídoto natural contra HAYATO e WEI LONG.
  - **→+ESP — PASSO DO LEÃO**: investida curta com o escudo que empurra o rival para o canto e mantém a carga atual.
    Encadeia para MASHI.
- **Mecânica em uma frase:** quanto mais paciência, mais pesado o soco; o rival que fica só defendendo perde.
- **Cuidar:** nada de amuletos, "magia africana", savana com leões ou tanga. Kano é uma das cidades mais antigas da
  África Ocidental, urbana e comercial; o cenário deve mostrar isso. Não misturar símbolos iorubás (adire, da região
  sudoeste) com o contexto hauçá do norte.

#### CENTELLA — "A Faísca da Arena" · México · Lucha libre

- **Quem é:** luchadora técnica (na lucha libre, os *técnicos* são os heróis; os *rudos*, os vilões), terceira geração
  de uma família de luchadores. A avó lutou numa época em que a luta feminina era proibida nas arenas da capital e
  competia fora da cidade. CENTELLA luta para levar a máscara da família ao palco mundial. Carismática, acrobática,
  fala com a plateia.
- **Estilo:** lucha libre, com ênfase em voos, cordas e chaves aéreas.
- **Silhueta:** compacta e atlética, **máscara** com desenho de faísca/estrela, joelheiras, botas altas e malha. Leitura
  imediata pela cabeça mascarada e pelas botas. Capa só na entrada e na vitória.
- **Traje e paleta:** malha turquesa-jade com recortes prata e linhas pretas, máscara turquesa com faísca prata. Energia
  turquesa em faíscas (não em orbe).
- **Cenário:** "Arena de Lucha, Cidade do México": ringue com cordas no primeiro plano, arquibancada lotada, luzes de
  palco, faixas de papel picado colorido e letreiros de néon. Noite.
- **Atributos sugeridos:** `pow 0.94 · spd 1.12 · hp 96 · jump 1.18 · scale 0.95 · stride 12`.
- **Passiva — CORDAS:** ao encostar na borda da tela no ar, pode **saltar de novo da parede** (uma vez por pulo).
  *Novo no motor: detecção de borda em pleno ar + novo estado de salto.*
- **Especiais:**
  - **ESP — PLANCHA**: salto alto e queda de corpo inteiro. Golpe **alto** (só defende em pé); no ar, vira mergulho
    diagonal.
  - **↓+ESP — HURACANRANA**: anti-aéreo que **agarra rival no ar** com as pernas e o arremessa. No chão, erra e fica
    exposta. *Novo: agarrão aéreo.*
  - **→+ESP — RESORTE**: corre até a borda mais próxima, quica nas cordas e volta numa voadora de corpo. **Quanto mais
    longe a borda, mais rápido e mais dano** (momento acumulado).
- **Mecânica em uma frase:** a arena é a arma dela; no canto, quem está encurralado é o rival.
- **Cuidar:** a máscara é identidade e honra, nunca é tirada (nem na derrota, nem no final). Sem sombreiro, bigode,
  caveiras de Día de Muertos ou cactos como "decoração mexicana". Corpo atlético de esportista, sem sexualização.

#### CAMILLE — "A Riposte de Marselha" · França · Savate

- **Quem é:** 29 anos, ex-esgrimista de florete que trocou a lâmina pelo boxe francês. Cerebral, precisa, humor seco.
  Estuda o rival antes do primeiro golpe e luta para provar que a paciência vence a força.
- **Estilo:** savate (boxe francesa): socos de boxe e chutes **com sapato**, a única modalidade de chute que luta calçada.
  Da esgrima traz a lógica de *parade-riposte* (aparar e responder).
- **Silhueta:** alta, esguia, **postura muito vertical** (savate luta em pé, quase sem dobrar), cabelo curto, a
  "intégrale" (macacão de uma peça do esporte), luvas e sapatos de savate. Linha vertical limpa, oposta à base baixa de
  NILA e à assimetria de AMINU.
- **Traje e paleta:** intégrale azul-marinho com faixas prata, sapatos brancos com sola escura, luvas prata. Energia
  neutra prata-gelo, sem matiz (é a "luz da lâmina").
- **Cenário:** "Porto Velho de Marselha, França": cais com barcos de pesca ao amanhecer, a basílica no alto do morro
  ao fundo, bandeirolas balançando com o vento mistral (efeito de vento sutil no cenário).
- **Atributos sugeridos:** `pow 0.98 · spd 1.04 · hp 98 · jump 1.0 · scale 1.03 · stride 12 · reach 1.1`.
- **Especiais:**
  - **ESP — PARADE**: postura de aparar por ~18 quadros. **Se receber golpe corpo a corpo alto ou médio, anula o dano
    e responde automaticamente** com um chute fouetté no rosto. Perde para golpe baixo, agarrão e projétil (o ponto
    fraco é claro e justo). *Novo no motor: estado que intercepta o acerto.*
  - **↓+ESP — COUP D'ARRÊT** ("golpe de parada"): chassé baixo e rápido com a sola do sapato. **Se acertar o rival no
    meio da preparação de um golpe, vira contra-golpe** (dano e atordoamento maiores, efeito visual próprio).
    *Novo: bônus de contra-golpe.*
  - **→+ESP — REVERS**: giro com chute de calcanhar que **passa para o outro lado** do rival (cruza a guarda),
    obrigando a defesa a inverter.
- **Mecânica em uma frase:** quem ataca CAMILLE no momento errado apanha com o próprio golpe.
- **Cuidar:** sem boina, baguete, listras de marinheiro, mímica ou Torre Eiffel. Marselha foi escolhida justamente por
  ser a França real, portuária e multicultural, longe do cartão-postal parisiense.

#### NILA — "A Lua de Kerala" · Índia · Kalaripayattu

- **Quem é:** 31 anos, fisioterapeuta formada também na tradição de cura do kalari (massagem e conhecimento dos pontos
  marma). "Quem conhece os pontos que curam conhece os que derrubam." Serena, disciplinada, observadora; luta para
  mostrar ao mundo uma das artes marciais mais antigas que existem, ensinada por mulheres e homens há gerações.
- **Estilo:** kalaripayattu, de Kerala, com as posturas animais (*vadivu*), saltos altos e golpes em pontos vitais.
- **Silhueta:** base **muito baixa e larga**, membros longos, trança comprida que vira rastro de movimento. Em postura de
  serpente quase rasteja; em postura de elefante fica pesada e enraizada: a silhueta muda com a mecânica.
- **Traje e paleta:** roupa de treino de algodão justa off-white com barra dourada no estilo kasavu, faixa de cintura
  vermelho-terra (laterita), braçadeiras de tecido. Descalça. Energia âmbar de chama de lamparina.
- **Cenário:** "Cais de Fort Kochi, Kerala": as redes de pesca de madeira gigantes recortadas contra o pôr do sol,
  nuvens de monção carregadas, barcos e água refletindo o céu laranja-arroxeado.
- **Atributos sugeridos:** base `hp 98 · jump 1.06 · scale 0.98 · stride 12`; Elefante `pow 1.1 · spd 0.92`; Serpente
  `pow 0.9 · spd 1.15`.
- **Especiais:**
  - **↓+ESP — VADIVU**: troca de postura entre **GAJA (elefante)** e **SARPA (serpente)**, sem custo, ~15 quadros.
    Cada postura muda atributos, os golpes fortes e os outros dois especiais. Ícone da postura no HUD.
    *Novo no motor: conjunto alternativo de mods/especiais por postura.*
  - **ESP em GAJA — GOLPE MARMA**: toque de dedos curto num ponto vital. Se acertar, aplica o estado **MARMA** por ~4 s:
    rival anda 20% mais devagar e não enche o medidor de especial. *Novo: estado negativo temporizado.*
  - **ESP em SARPA — BOTE**: deslize rasteiro com o corpo colado ao chão, **passa por baixo de projéteis** e acerta
    baixo.
  - **→+ESP em GAJA — PASSO DO ELEFANTE**: avanço lento com duas palmas abertas que empurram muito (pressão de canto).
  - **→+ESP em SARPA — SALTO DA SERPENTE**: salto altíssimo em parafuso com chute descendente (os saltos do kalari são
    famosos).
- **Mecânica em uma frase:** duas lutadoras numa só; o rival precisa ler a postura antes de agir.
- **Cuidar:** não usar cor açafrão como identidade (carga política e religiosa); a chama é de lamparina, âmbar. Não
  lutar dentro de um kalari com o altar (é espaço sagrado). Nada de encantador de serpentes, turbante genérico, "Índia
  mística" ou sotaque caricato. Roupa de atleta, sem sexualização.

### 2.4 CHEFÃO — BAATAR, "O Avarga das Estepes" · Mongólia · Bökh

- **Quem é:** 44 anos, pastor de cavalos e campeão invicto do Naadam (festival nacional), com o título de *avarga*
  (o mais alto da luta mongol, algo como "titã"). Fala pouco, é gentil fora da luta, respeitoso com todos. É o
  guardião do Cinturão do Torneio: não luta para conservar o título, luta para saber se pode entregá-lo.
- **Estilo:** bökh, a luta mongol: derruba quem fizer o rival tocar o chão com qualquer parte além dos pés e mãos. Sem
  categoria de peso, sem limite de tempo, sem ringue.
- **Silhueta:** **o maior do jogo** (`scale 1.28`), tronco largo, colete *zodog* de mangas longas e peito aberto, calção
  *shuudag*, botas *gutal* de bico virado, chapéu pontudo na entrada (entregue ao assistente antes da luta). Nada no
  elenco se parece com isso em sombra.
- **Traje e paleta:** zodog vermelho-escuro com bordas douradas, shuudag azul-escuro, botas de couro com ornamento
  dourado. Energia vermelho-brasa com núcleo dourado.
- **Cenário:** "Estepe do Naadam, Mongólia": campo aberto até o horizonte, gers brancas ao longe, cavalos correndo
  na corrida do festival, céu azul imenso com frente de tempestade chegando, uma águia circulando. **É a única arena
  sem paredes do jogo** (só visual; o motor mantém as bordas).
- **Atributos (modo chefão):** `pow 1.3 · spd 0.82 · hp 150 · jump 0.78 · scale 1.28 · stride 16`.
- **Mecânicas próprias:**
  - **Passiva — PESO DA MONTANHA:** golpes de rank 1 e 2 (socos e chutes fracos) **não interrompem** os golpes fortes
    nem os especiais dele (armadura contra golpes leves). Força o jogador a usar golpes fortes, especiais e contra-golpes.
    *Novo no motor: armadura por rank em `applyHit`.*
  - **ESP — ARREMESSO DO AVARGA:** **agarrão de comando** inbloqueável, alcance ~1,5× o agarrão normal, dano alto. Se
    errar, recuperação longa (a janela de punição é a lição do chefão). *Novo: agarrão como especial com alcance.*
  - **↓+ESP — QUEBRA-BASE:** gancho de perna baixo (as rasteiras de perna são centrais no bökh). Golpe **baixo**; no
    canto, o rival fica mais tempo no chão.
  - **→+ESP — ABRAÇO DA ESTEPE:** corrida de braços abertos que vira agarrão se tocar o rival. Passa por golpes leves
    (armadura) mas perde para golpe baixo.
  - **2ª FASE — DEVEKH (Dança da Águia):** na primeira vez em que cai abaixo de 50% de vida, interrompe a luta por ~1,5 s
    e executa a dança da águia (no bökh, é o gesto de honra ao entrar e ao vencer). Ele está reconhecendo o jogador como
    digno. Depois disso ganha o especial aéreo **MERGULHO DA ÁGUIA**: salto alto que **rastreia a posição do rival** e
    cai com agarrão. A cor da energia satura e a tempestade do cenário chega (céu escurece, vento).
    *Novo: gatilho por vida + cinemática curta + salto com alvo.*
- **Versão jogável (após ser derrotado):** `hp 118 · pow 1.18`; mantém PESO DA MONTANHA e o agarrão; o DEVEKH deixa de
  ser automático e vira um especial de medidor cheio (↓↓+ESP) que libera o MERGULHO DA ÁGUIA por 10 s.
- **Cuidar:** nada de "horda", conquistador, arco e flecha, crânios ou estética de bárbaro. O personagem é um
  campeão esportivo e um homem do campo, com a ética de honra que o bökh tem de verdade. Não usar as bandeiras-estandarte
  sagradas (*tug*) nem os montes de pedra rituais (*ovoo*) como cenário de luta.

### 2.5 Mecânicas novas para o motor (para Nova e Vega dimensionarem)

| Mecânica | Quem usa | O que o motor precisa | Porte |
|---|---|---|---|
| Segurar e soltar (carga em níveis) | AMINU | leitura de botão segurado, níveis por tempo | médio |
| Quebra-guarda | AMINU | flag no golpe que, bloqueado, causa atordoamento | pequeno |
| Absorção de projétil | AMINU | janela que destrói projétil frontal e dispara efeito | pequeno |
| Salto na borda | CENTELLA | detecção de borda no ar + novo estado de pulo | médio |
| Agarrão aéreo | CENTELLA, BAATAR | `throw` contra alvo no ar | médio |
| Momento por distância | CENTELLA | dano/velocidade em função do percurso | pequeno |
| Postura de contra-golpe | CAMILLE | estado que intercepta `applyHit` e dispara resposta | médio |
| Bônus de contra-golpe | CAMILLE (e todos, se quiserem) | detectar rival em preparação ao acertar | pequeno |
| Troca de postura | NILA | segundo conjunto de mods/especiais/atributos + HUD | grande |
| Estado negativo temporizado | NILA | status com duração (lentidão, medidor travado) | médio |
| Agarrão de comando | BAATAR | especial `lvl: 'throw'` com alcance próprio | pequeno |
| Armadura por rank | BAATAR | regra em `applyHit` | pequeno |
| Fase por vida + cinemática | BAATAR | gatilho de HP, pausa curta, troca de especiais | médio |
| Salto com alvo | BAATAR | `vx` calculado pela posição do rival | pequeno |

Impacto em arte: o layout atual é de 4 folhas 4×3 por lutador. NILA precisa de poses extras (duas posturas de idle e
golpes fortes); BAATAR precisa da pose de DEVEKH e do mergulho; CENTELLA do salto na parede e do agarrão aéreo. Os FX
(faíscas, chama, carga) devem ser pedidos como asset separado em fundo preto, nunca assados na folha.

### 2.6 Ordem de desbloqueio

Começam liberados HAYATO, WEI LONG, MIN-JI e CAIO. Cada Arcade concluído libera o próximo da fila:

| Arcade concluído | Libera | Por que nessa posição |
|---|---|---|
| 1º | **AMINU** | mecânica mais fácil de entender (segure e solte) e mais barata de implementar; é a primeira recompensa e também ensina a lidar com quem defende demais |
| 2º | **CENTELLA** | a mais espetacular; mantém o jogador motivado no meio da fila |
| 3º | **CAMILLE** | exige leitura de tempo; chega quando o jogador já conhece o elenco |
| 4º | **NILA** | a mais complexa (duas posturas); fecha o elenco regular |
| 5º em diante | **BAATAR** aparece como luta final do Arcade; **derrotá-lo libera o personagem** | o chefão só faz sentido depois de o jogador conhecer todos os estilos |

Antes de BAATAR entrar, o Arcade termina como hoje. Alternativa se o dono quiser o espetáculo primeiro: CENTELLA →
AMINU → CAMILLE → NILA (troca só as duas primeiras; custo de motor um pouco maior logo no início).

Observação de ritmo: com 8 lutadores regulares, o Arcade atual (enfrenta todos os outros em ordem sorteada) passa de 3
para 7 lutas, mais o chefão. Sugiro limitar a 5 lutas sorteadas + chefão (decisão do dono, registrada em pendências).

### 2.7 Arco narrativo do final do Arcade

**Tema: "A Volta ao Mundo".** O Torneio Mundial de Artes Marciais tem uma regra antiga, que o jogo já pratica: *cada
estilo luta na casa do outro* (a luta acontece no cenário do rival). Oito lutadores atravessam Japão, China, Coreia,
Brasil, Nigéria, México, França e Índia. Quem completa a volta recebe o convite final: o Naadam, na estepe mongol, a única
arena sem paredes, sem categoria de peso e sem relógio.

Lá espera BAATAR, o Avarga, guardião do Cinturão do Torneio há nove edições. Ele não defende o título; ele procura alguém
a quem entregá-lo. Na metade da luta, executa a Dança da Águia: o gesto de honra que reconhece o rival como digno.
Derrotado, ele coloca o cinturão nos ombros do vencedor, sorri pela primeira vez e diz:

> "A estepe não tem dono. O cinturão também não. No ano que vem, eu volto como desafiante."

(É por isso que ele fica jogável.)

**Uma linha de motivação para o final de cada novo lutador:**
- AMINU: volta a Kano com o cinturão pendurado sobre os poços de índigo; a escola de dambe do bairro lota no dia seguinte.
- CENTELLA: sobe ao ringue da arena com o cinturão e a foto da avó; a plateia grita o nome da família, não o dela.
- CAMILLE: pendura o cinturão ao lado do velho florete; anota no caderno o único golpe de BAATAR que não conseguiu aparar.
- NILA: devolve o cinturão ao torneio e pede, em troca, que a próxima edição tenha uma etapa em Kerala.

Os finais de HAYATO, WEI LONG, MIN-JI e CAIO ficam como pendência (não há lore escrita no código para eu não contradizer).

---

## 3. Pendências e decisões do dono

1. **Escolher a paleta do logo** (recomendo A, "Ouro Forjado").
2. **Aprovar o elenco** (nomes, países, estilos) antes de qualquer geração de imagem.
3. **Revisão de idioma** dos nomes de golpe em hauçá (MASHI, GARKUWA) e dos termos em malaiala/sânscrito por falante
   nativo ou fonte confiável; os nomes em português podem ser usados na tela até lá.
4. **Tamanho do Arcade** com 8 lutadores (manter "todos contra todos" ou 5 sorteados + chefão).
5. **Finais dos 4 lutadores atuais**, para fechar o arco.
6. **Fonte do logo** (Impact do sistema x webfont embutida).
