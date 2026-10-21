# InnoFighters: proposta de um novo chefão final

Autor: Apolo (direção de arte) · 2026-10-21 · **proposta**: nenhuma imagem gerada, `src/` intocado.
Pedido do dono: um chefão com cara de chefão, no espírito do grande vilão final do gênero (o dono do torneio,
carismático, imponente, com arena própria, entrada dramática, aura sinistra, golpes de nome próprio e fases). O BAATAR
passa a ser um lutador normal.
Base lida: `docs/proposta-expansao.md`, `docs/prompts/08-baatar.md` e `09-cenarios.md`, `docs/mecanicas-e3.md` (§0, §2.5, §3),
`docs/spec-esquiva-e-cinematica-especial.md` (§2), `docs/identidade-visual-especiais.md`, `docs/arquitetura.md`,
`src/data/lutadores/baatar.ts`, `src/meta/regras.ts`, `src/meta/progresso.ts`, `src/ui/grade.ts`, `src/ui/cenas/chefe.ts`,
`src/audio/audio-sys.ts`, as folhas do BAATAR e as capturas em `arte-fonte/capturas/`.

> **Valor final (decisões do dono, 2026-10-21):** escala do ZENON **1,32** (esta proposta dizia 1,36) e entrada COMPLETA de
> **270 ticks (4,5 s)** (dizia 156 ticks, 2,6 s). O que fica abaixo com 1,36 ou 156 ticks é a proposta original, mantida como
> registro. O valor que vale está em `src/data/lutadores/zenon.ts` (escala) e `src/render/entrada-chefe.ts` (entrada).

---

## 0. Resumo

| | Recomendação |
|---|---|
| Novo chefão | **Candidato A: ZENON ARGYROS, "O Arconte"** (Grécia, pancrácio). É o dono do torneio, um anfitrião elegante e cruel numa arena de mármore sobre o mar. Também há o B, **SÉCULO, "O Primeiro Campeão"**, colosso de 1926 com rachaduras de ouro, e o C, **CROWN, "A Dona do Espetáculo"**, promotora americana. |
| Escala | A **1,32** (valor final; a proposta era 1,36); B **1,42**, que é o teto medido para o HUD; C **1,30** |
| Motor | A cabe **sem primitiva nova**: só parâmetros e reuso, mais um parâmetro de "dreno de energia". B e C trazem **1 primitiva cada** |
| Arte | 1 mestra + 10 folhas 3×2 + 1 cenário = 12 imagens, 72 créditos. Com margem de correção, **~96 a 108 dos 152 créditos** |
| BAATAR | Vira lutador normal, **5º da fila de desbloqueio** (depois da NILA). O **MERGULHO DA ÁGUIA vira o →+ESP dele** e completa o triângulo alto/baixo/agarrão. A **Dança da Águia vira entrada e vitória**. Cenário `mn` continua sendo a casa dele |

### 0.1 Por que o BAATAR não lê como chefão (medido nas capturas, não suposto)

Ele já é o maior do jogo (`scale 1.28`) e mesmo assim não convence. Então **escala sozinha não faz chefão**. O que falta
está nas capturas `vs-do-chefao.png`, `arcade-baatar-fase-2.png` e `cenario-mn.png`:

1. **Postura e rosto de defesa, não de domínio.** Ele fica curvado, com os braços baixos e o olhar gentil. O VS mostra um
   avô simpático.
2. **A lore é de honra.** "Procura alguém a quem entregar o cinturão", e a Dança da Águia **reconhece** o jogador. É um
   herói veterano, e não um antagonista.
3. **Arena de festival.** Campo aberto de dia, com gers, cavalos e bandeirolas coloridas. Não tem trono, nem poder, nem
   ameaça.
4. **Cores de festa.** O vermelho e o ouro do zodog são os mesmos tons quentes de vários lutadores. Não há uma energia
   "proibida".
5. **A UI promete mais do que ele entrega.** "UM DESAFIANTE SE APROXIMA" e "???" criam o suspense, e aí entra um lutador
   tradicional de calção.

### 0.2 Os 10 sinais de chefão (régua usada para pontuar os candidatos)

1. **Silhueta que domina** pela **altura e postura** (cabeça erguida, peito aberto), não só pela largura.
2. **Traje de comando**: um objeto que diz "dono" (casaco, cinturão original, faixa de campeão).
3. **Rosto de desprezo ou de cálculo** no idle e no VS.
4. **Energia em negativo**, a regra exclusiva do chefão: núcleo **ônix** e brilho colorido (nenhum lutador do elenco tem
   energia mais escura que o cenário).
5. **Arena própria**, de poder, à noite ou num céu anormal, que não é a casa de nenhum país do elenco.
6. **Entrada dramática** antes do round (valor final: 4,5 s na COMPLETA e 1 s na CURTA; a proposta dizia 2 a 3 s; só render).
7. **Golpes autorais** com nome próprio e um golpe "assinatura" que ninguém mais tem.
8. **Segunda fase visível**: muda a cor, a aura, a arena, a música e um golpe.
9. **Música própria** que muda na fase 2.
10. **Falas marcantes** de entrada, de fase 2, de vitória e de derrota.

### 0.3 Restrições do motor (de `mecanicas-e3.md` e do código, valem para os três)

- 3 especiais (`sFire`, `sDown`, `sFwd`), **sem especial no ar** e **sem super** (ED10). A fase 2 troca especiais pela
  ficha `chefe2` (já existe: o BAATAR troca o ABRAÇO pelo MERGULHO).
- No máximo **1 primitiva nova por lutador**. Já existem e se reusam: projétil (`orb`, `boomerang`, `blade`, `wave`),
  subida invulnerável, investida, `through` (cruzar o rival), `armadura.rankMax`, `agarrao{alcance}`, `vxAlvo`, `aparar`,
  `carga`, 2 barras, `cena-chefe` e troca de ficha.
- **A cena de fase 2 hoje é fixa no BAATAR:** `fighter.ts:1049` monta `'devekh' + n`. Ela precisa virar uma lista de poses
  por chefe (`chefe.cena.poses`), senão o chefão novo desenha as poses do BAATAR (ou cai em `win`).
- **Teto de escala pelo HUD (estimado sobre a captura `arcade-baatar-fase-2.png`, 1920×1080, medida a olho):** com 1,28
  o BAATAR vai dos pés em y≈935 ao topo da cabeça em y≈250, ou seja, ≈535 px por 1,0 de escala. Os nomes do HUD terminam
  em y≈155. Com 1,42, a cabeça fica em y≈175 (folga de ~20 px). Com 1,45 encosta no nome. **Teto: 1,42**, e o pulo do
  chefão tem de ser baixo (`jump ≤ 0,72`), senão a cabeça sai da tela no ápice. A Lyra mede de verdade no navegador
  (skill `medir-antes-de-afirmar`) antes de fixar o número.
- Roda de cores (proposta §2.1 + identidade §4): **sobram poucos matizes**. Livres de verdade: ~300–315° (entre WEI 278° e
  MIN-JI 341°) e ~110–125° (entre CAIO 95° e SARPA 144°). Por isso o separador principal do chefão é o **valor**
  (núcleo ônix), e o matiz vem em segundo.

---

## 1. Candidato A: ZENON ARGYROS, "O Arconte" · Grécia · Pancrácio (RECOMENDADO)

**Quem é.** 61 anos, fundador e dono do Torneio INNO FIGHTERS. Foi lutador de luta greco-romana na juventude e
reconstruiu o **pancrácio**, a luta sem regras dos jogos antigos, em que valia tudo menos morder e furar os olhos. Há 30
anos criou o torneio para provar que todo estilo do mundo descende do dele, e o cinturão nunca deixou a casa dele por
muito tempo. Recebe cada finalista na sua ilha como um "convidado". Arconte era o magistrado que governava a cidade na
Atenas antiga.
**Personalidade:** anfitrião perfeito, educado e teatral. Aplaude o rival e trata a luta como um jantar que ele oferece.
A crueldade dele é a cortesia.

| Campo | Valor |
|---|---|
| Nome na tela | **ZENON** · título "O Arconte" · país GRÉCIA |
| Idade / altura | 61 · ~2,01 m · **escala 1,32** (valor final; a proposta era 1,36) (alto e esguio: a cabeça fica bem acima da do BAATAR, que é largo e curvado) |
| Silhueta | **triângulo invertido longo**: ombros retos, casaco até abaixo do joelho, pernas longas. Em preto chapado, é a única figura do jogo com uma "saia" de casaco abrindo atrás |
| Rosto | cabeça raspada, barba curta prateada bem aparada, nariz afilado, olhos cinza-claros, meio sorriso frio, cicatriz fina na sobrancelha esquerda |
| Traje | casaco longo preto, aberto, com gola alta rígida e **forro púrpura-tíria**, e um fio de ouro liso nas bordas. Por baixo, túnica preta sem mangas fechada por **um broche redondo de ouro**, calça grafite e botas pretas |
| Adereço | mãos enfaixadas em **tiras de couro (himantes**, as luvas do boxe grego antigo) e o **anel-sinete do torneio** na mão direita (o emblema do logo) |
| Cores | preto, púrpura-tíria `#7a1050`, ouro `#d9b25a`. Energia: núcleo **ônix** `#0c0710`, brilho **púrpura-tíria** `#d6339a` (322°) |
| Guarda | ereto, queixo erguido, **mão esquerda aberta à frente, palma para baixo, "convidando"**, punho direito baixo junto ao quadril, peso na perna de trás e o casaco caído atrás |
| Falas | Entrada: *"Bem-vindo à minha casa. Todo torneio precisa de um anfitrião... e de um último convidado."* · Fase 2: *"Chega de cortesia."* · Vitória: *"Aplausos para o convidado. A saída é pelos fundos."* · Derrota (final): *"Então o torneio é seu. Cuide melhor dele do que eu cuidei."* |

### 1.1 Conceito visual

**Prompt da imagem-mestra** (Runway, retrato 3:4, 2K, mesmo molde do `08-baatar.md`):
```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.

CHARACTER — ZENON ARGYROS: Greek pankration master and the wealthy owner of a world martial arts tournament, about 61 years old, VERY TALL and imposing, about 2 meters, long legs, broad straight shoulders, lean powerful build, upright regal posture with the chin raised. Shaved head, short neatly trimmed silver beard, sharp nose, pale gray eyes, cold confident half-smile, a thin old scar through the left eyebrow. Costume: a long black tailored coat reaching below the knees, worn open, long sleeves, tall stiff stand-up collar, deep tyrian purple inner lining, one thin plain gold trim along the front edges, hem and cuffs; under it a fitted sleeveless black tunic closed at the chest by one round gold clasp; dark charcoal fitted trousers; black leather boots. Both hands and wrists wrapped in long brown leather thongs in the ancient Greek boxing style, and a heavy gold signet ring with a round emblem on the right hand over the wraps. No cape, no hat, no tie, no glasses, no other jewelry. Fighting stance: tall and upright, left open hand forward at chest height with the palm down as if inviting the opponent, right fist held low near the hip, weight on the back leg, the coat hanging behind him. Background color: solid flat pure green #00FF00.
```

**Folhas (3×2, 6 poses cada, fundo verde `#00FF00`, como o BAATAR):** S1 idle 4 + andar 2 · S2 andar 6 (lento,
"passeando") · S3 agachar, defesa em pé, defesa agachado, pré-pulo, subida, ápice · S4 queda, pouso, golpe no rosto,
golpe no estômago, lançado no ar, nocaute (cabeça à ESQUERDA) · S5 normais de mão (tapa de costas de mão, palma
reta, cotovelada) · S6 chutes e baixos (chute de bota no peito, joelhada, rasteira, palma agachado, anti-aéreo de joelho) ·
S7 a S10 abaixo.

| Folha | Linha 1 (3 poses) | Linha 2 (3 poses) |
|---|---|---|
| **S7** especiais 1 e 2 | SELO: (1) mão direita recolhida ao peito, anel à frente; (2) braço direito estendido, palma aberta para a frente, anel à mostra; (3) recolhendo, ajeitando o punho do casaco | COLUNA: (1) agachado, joelho dobrado; (2) **joelhada subindo com a palma aberta para cima**, corpo vertical, casaco esvoaçando para baixo; (3) caindo, pernas juntas |
| **S8** especial 3 + aéreos | TRIBUTO: (1) passo longo e baixo, palma recolhida; (2) **deslize com a palma aberta estendida na altura do peito**; (3) fim, ereto, mão estendida "cobrando" | (1) chute aéreo descendente; (2) cotovelada aérea descendente; (3) agarrão comum: as duas mãos prendendo à frente |
| **S9** fase 2 + vitória | DECRETO: (1) arrancada de costas virando (o casaco gira); (2) já do outro lado, **costas de mão em arco**; (3) recuperação | (1) arremesso comum, lançando para a esquerda; (2) vitória: aplaudindo devagar; (3) vitória: tirando a poeira do ombro do casaco, de olhos fechados |
| **S10** cenas | Entrada: (1) **de costas para a câmera**, mãos atrás do corpo, casaco nos ombros; (2) virando a cabeça por cima do ombro; (3) apertando a tira de couro da mão direita, sorrindo | Fase 2: (1) **mão erguida estalando os dedos**; (2) braços abertos como quem apresenta o salão à plateia; (3) baixando numa guarda de dois punhos, sem sorriso |

Opcional, **S11**: 4 idles da fase 2 (guarda de dois punhos, sem a mão "convidando") + 2 de andar. Liga pela
`poseDaFicha` da `chefe2` (já existe). Lição da NILA f5: para a IA mudar a postura, **troque a frase de postura do bloco
CHARACTER**, não só a descrição das células.

### 1.2 Arena: "Anfiteatro do Arconte", ilha particular no Egeu (id sugerido `gr`)

Noite, mar escuro e tempestade distante. Semicírculo de arquibancada de mármore branco **vazia**, iluminada por braseiros
de bronze. Duas colunas sustentam o **grande anel de bronze do torneio** (o emblema do logo) pendurado sobre o centro.
Nove estandartes de seda lisos nas cores de energia dos 9 lutadores, sem símbolo e sem bandeira nacional: o torneio
"coleciona" os estilos, sem estátuas de derrotados. O chão é de mármore negro polido com um meandro de ouro incrustado
em círculo. Fase 2: os braseiros ficam púrpura e os raios do horizonte se aproximam, por sobreposição procedural (o
mesmo gancho `fase-chefe` que hoje escurece o céu do `mn`), sem segunda imagem.

```
Wide 2D fighting game stage background, hand-painted anime style matching a modern hand-drawn arcade fighting game, rich detail, cinematic lighting. Landscape image, aspect ratio 16:9. Straight side-on view at eye level; horizon roughly in the middle. The floor where the fighters stand is a flat, open, walkable surface; its back edge is at about 70% of the image height and it continues to the bottom edge. The whole horizontal band between 80% and 90% of the image height must be clear flat floor across the full width (the fighters' feet rest at 84.5%). Keep the central area behind the fighters readable and not too busy; put the landmarks in the upper part and at the sides.
Stage: a private white marble amphitheater on a cliff of a Greek island at night. A half-circle of stepped marble seats rises behind the fighting floor, completely empty, lit by tall bronze braziers with warm fire. Two tall intact marble columns at the far left and far right hold a giant hanging bronze ring high above the center. Nine long plain silk banners hang from the top seats, one color each (cyan, lilac, pink, lime, jade, indigo, amber, silver, red), with no symbols. Behind, the dark Aegean sea and a distant thunderstorm with purple lightning on the horizon. The fighting floor is polished black marble with a thin inlaid gold Greek key (meander) circle. No people, no statues, no text, no flags.
```

### 1.3 Mecânica de chefão (em dados, no vocabulário do `LutadorDef`)

| | Fase 1 (ficha `chefe`) | Fase 2 (ficha `chefe2`) |
|---|---|---|
| Atributos | `pow 1.0 · spd 0.92 · jump 0.72 · scale 1.36 · stride 15 · reach 1.12` (partida; o harness da E6 fecha) | `spd 0.98`, `armadura: { rankMax: 2 }` (o "chega de cortesia": para de recuar para golpe fraco) |
| ESP | **SELO DO ARCONTE**: projétil em **anel** a meia altura, lento e grande (`sp 7 · sc 1.5 · dmg 14 · kd`). Estilo de projétil novo `anel` (só render, Lyra) | **SELO MAIOR**: o mesmo, `sp 9.5 · sc 1.9 · dmg 16` |
| ↓+ESP | **COLUNA DE ÔNIX**: subida invulnerável (joelhada + palma para cima), anti-aéreo. Reusa a subida do RAIJIN-KEN | igual |
| →+ESP | **TRIBUTO**: deslize com a palma (`rush`, golpe, não agarrão). **No acerto, toma 20 de energia do rival** (10 na defesa) | **DECRETO**: investida que **cruza o rival** (`through:1`, reuso do REVERS) e acerta de costas de mão. Também cobra o tributo |
| Barras | 2 × `hpPorBarra` 40 (como hoje), `danca`→`cena { duracao: 90, poses: ['cena0','cena1','cena2'] }` | — |
| IA | `IA_CHEFE` de hoje; `ia.papel`: SELO `zonear [250, 700]`, COLUNA `anti`, TRIBUTO `aproximar [90, 220]` | `aggr 1`, DECRETO `aproximar [120, 300]` |

**Primitiva nova: nenhuma.** O dreno (`drenaEnergia: { acerto: 20, defesa: 10 }`) é um **parâmetro** pela régua da Nova
(§0): é lido no ramo de acerto que já existe e só mexe na energia, que já existe. A Nova confirma a classificação.

**Assinatura:** é o único lutador que **cobra imposto** do medidor do rival. O dono do torneio tira do jogador o
recurso que paga especial e esquiva. A tarja pode mostrar a energia "voando" da barra do rival para a dele (render).

**Entrada dramática** (antes do round 1, cena de UI, só render, sem mexer no lock-step): tela com faixas pretas
de cinema → a arena aparece com os braseiros acendendo da esquerda para a direita (proposta: 0,6 s; no código são 6 braseiros,
um a cada 10 ticks, do tick 30 ao 90) → ZENON de costas (`entrada0`) → vira a cabeça (`entrada1`) → aperta a tira de couro
(`entrada2`) e entra o cartão "ZENON ARGYROS · O ARCONTE · DONO DO TORNEIO". Valor final: **4,5 s (270 ticks)** na COMPLETA;
a CURTA tem 60 ticks (1 s). Pula com ataque, ESP ou ENTER a partir do tick 10 (a proposta dizia 2,6 s).

**Música** (sintetizada, só `tone`/`noise`): **valsa sinistra em 3/4**, 138 bpm, Ré no **modo frígio dominante** (o *dromos
hitzaz* do rebético grego). Órgão em quintas (dente-de-serra com passa-baixa de 900 Hz), baixo de bordão no tempo 1, cravo
na melodia (triângulo curto com ataque seco) e, no lugar da bateria, o prato de braseiro (ruído passa-alta de 6 kHz no
tempo 3). Fase 2: +12% de andamento, bumbo nos 3 tempos e órgão uma oitava abaixo. O sequenciador hoje é de 16 passos por
compasso, então o 3/4 pede uma trilha `chefe` com 12 passos (Vega/Lyra).

### 1.4 Esquiva e cinemática do especial

- **Esquiva:** a de todos (A11 da spec). O fantasma sai **tingido de púrpura-tíria** e o casaco fica para trás um tique
  a mais no rastro (só render). Assim ninguém confunde com a esquiva cinza dos outros.
- **Estilo exclusivo E12 · MEANDRO E ANEL** (≤ 24 primitivas): (1) anéis concêntricos achatados (elipses de 40→160 px)
  que se abrem em brilho com o **núcleo ônix**; (2) a linha de meandro grego, uma polilinha em ângulos retos que corre
  pela faixa como uma moldura. Estampa: o meandro a 10%. Acerto: o anel se fecha sobre o rival e solta 6 "moedas"
  (losangos dourados). Não se confunde com nenhum E1–E11: é o único geométrico em ângulo reto e o único de núcleo escuro.

| Golpe | Núcleo / brilho / sombra | Matiz | Contraste do nome (topo / base) | Recorte, ritmo |
|---|---|---|---|---|
| SELO DO ARCONTE | `#fff0f8` / `#d6339a` / `#2a0418` | 322° | 10,88 / 6,22 | `sa1` BUSTO, médio |
| COLUNA DE ÔNIX | `#ffe6a8` / `#b02a7e` / `#1a0612` | 322° | 11,56 / 6,25 | `sb1` CORPO, entrada `BAIXO`, rápido |
| TRIBUTO | `#ffffff` / `#ff5fb8` / `#3d0626` | 327° | 8,97 / 5,90 | `sc1` CORPO, pesado |
| DECRETO (f2) | `#ffe08a` / `#e0249a` / `#12040c` | 322° | 10,35 / 6,05 | `sc1` MEIO vira, pesado |

O contraste foi **calculado** (WCAG 2.x, mesma fórmula do §5 da identidade; centro da faixa = mix(sombra, brilho, 35%)).
A prova de verdade é a captura no navegador. Vizinho mais próximo: MIN-JI (340–341°), a 14–19°. O que separa é a sombra
quase preta, o núcleo ônix e o estilo geométrico, contra as flores e crescentes dela.

### 1.5 Riscos

- **Arte:** médio. O casaco longo muda de comprimento e de abertura entre as células (o mesmo tipo de deriva do zodog do
  BAATAR), e as tiras de couro tendem a virar luva. Mitigação: "plain gold trim", nunca "meander" no traje (detalhe fino
  a 2K varia em cada célula), e anexar a S1 aprovada nas folhas seguintes. Estimativa: 12 imagens (72) + ~40% de
  correção (5 a 6 imagens) = **~102 créditos** (S11 opcional: +6).
- **Semelhança:** o papel "magnata dono do torneio" é o pedido. Afastamentos deliberados do vilão citado: **nada de
  smoking vermelho, cabelo loiro, tapa-olho ou olho mecânico, navio ou porta-aviões, estátuas de derrotados, chute em
  cambalhota, investida que esmaga na parede, nem tirar a camisa na fase 2.** Ao do outro chefão aristocrata do gênero
  (europeu de capa, com projétil gigante): sem capa, sem nobreza herdada (ele é um ex-atleta que enriqueceu) e projétil em
  anel, não em bola.
- **Cultura:** nada de toga, deuses, louros na cabeça, "300", Partenon ou piadas de crise. A arena é fictícia e privada,
  não é patrimônio real. O pancrácio é real e documentado, e os nomes em português evitam erro de grego. O selo opcional
  em grego (Άρχων, παγκράτιον) precisa de revisão nativa.

---

## 2. Candidato B: SÉCULO, "O Primeiro Campeão" · sem bandeira · a "arte-mãe"

**Quem é.** Em 1926, a primeira edição do torneio teve um campeão cujo nome foi apagado dos registros. Ele nunca perdeu e
nunca envelheceu. É dono do torneio por meio de uma fundação sem rosto, e há cem anos assiste a cada final escondido,
procurando alguém que o marque. Cada rachadura de ouro no corpo é a ferida de um rival digno, selada como cerâmica
consertada com ouro. **2026 é a edição do centenário**, o mesmo ano do jogo, e é por isso que ele aparece.
**Personalidade:** solene, cansado, desdenha o torneio "moderno". Fala pouco, em sentenças.

| Campo | Valor |
|---|---|
| Nome na tela | **SÉCULO** · "O Primeiro Campeão" · país: o emblema do torneio no lugar da bandeira |
| Idade / altura | aparenta 50, tem 120 · colosso · **escala 1,42** (o teto do HUD) · **nunca pula** (`jump 0.6`, a CPU não salta) |
| Silhueta | **V gigante**: tronco em V, ombros enormes, braços longuíssimos que passam do quadril e cabeça pequena para o corpo (proporção de chefão). O BAATAR é largo e redondo; ele é um V |
| Rosto | cabelo branco liso e longo, solto além dos ombros, rosto sem barba, maxilar duro, íris ouro-pálido, expressão severa |
| Traje | torso nu com **apenas duas rachaduras de ouro** (clavícula esquerda até o lado direito da cintura; antebraço direito), calça larga de luta grafite, faixas escuras nas canelas, descalço, braçadeiras lisas de bronze |
| Adereço | **o Cinturão Original de 1926**: couro escuro e uma grande placa redonda de bronze oxidado com um anel em relevo |
| Cores | grafite, bronze, ouro. Energia: núcleo **ônix** `#080604`, brilho **ouro de kintsugi** `#ffc93a` (44°) |
| Guarda | **parado e ereto, quase desdenhoso**: braço esquerdo caído e relaxado ao lado do corpo, punho direito na altura do peito, olhando para baixo. Não se protege |
| Falas | Entrada: *"Cem anos. Cem campeões. Nenhum deixou marca."* · Fase 2: *"Você me fez sangrar ouro."* · Vitória: *"Mais um nome que o torneio vai esquecer."* · Derrota: *"Enfim... uma marca."* |

### 2.1 Conceito visual

```
Character reference image for a 2D fighting game. A single full-body figure, standing in the fighting stance, facing RIGHT, centered, whole body visible from head to feet with margin around. Hand-drawn anime-style cel shading with clean dark outlines, in the style of a modern hand-drawn arcade fighting game. Portrait image, aspect ratio 3:4. Flat solid background color as given below, no floor, no shadow, no text, no visual effects.

CHARACTER — SECULO: an ageless colossal martial artist, the legendary first champion of a world tournament, looks about 50 years old, GIGANTIC, much taller and more massive than a normal man, V-shaped torso, enormous shoulders, very long thick arms reaching below the hips, huge hands, powerful legs, a head small for his body. Long straight white hair falling loose past the shoulders, clean-shaven strong jaw, deep-set eyes with pale gold irises, stern and weary expression, weathered olive-bronze skin. Bare muscular torso with exactly TWO thin cracks filled with shining gold, like broken pottery repaired with gold: one running from the left collarbone diagonally down to the right side of the waist, and one along the right forearm; no other cracks. Costume: wide dark charcoal fighting trousers tucked into dark cloth wraps on the shins, barefoot; a massive old championship belt of dark leather with a big round tarnished bronze plate at the front showing a simple raised ring; plain bronze bracers on both forearms. No helmet, no mask, no skulls, no chains, no cape, no weapon. Fighting stance: stands tall and still, almost contemptuous, left arm hanging relaxed at his side, right fist held at chest height, feet shoulder-width apart, looking down at the opponent. Background color: solid flat pure green #00FF00.
```

**Folhas S7 a S10** (S1 a S6 seguem o molde do A, com andar pesado e **sem pulo alto**: S3 troca subida e ápice por um
"salto curto de peso", e a S6 tem o anti-aéreo de antebraço no lugar do aéreo):

| Folha | Linha 1 | Linha 2 |
|---|---|---|
| **S7** | MARCA DO SÉCULO: (1) punho direito erguido acima da cabeça; (2) **soco no chão**, de joelho; (3) levantando | QUEDA DO CÉU: (1) dois punhos juntos acima da cabeça; (2) **martelada dupla descendo à frente**, na altura do rosto do rival; (3) punhos no chão, curvado |
| **S8** | CEM PASSOS: (1) ombro à frente, arrancada; (2) **ombrada em corrida**, braços colados; (3) parada ereta | (1) antebraço anti-aéreo subindo; (2) salto curto com joelhada; (3) agarrão comum, uma mão no pescoço da gola do rival imaginário |
| **S9** | CENTENÁRIO (f2): (1) **ajoelhado com as duas mãos espalmadas no chão**; (2) erguendo-se de braços abertos; (3) de pé, punhos fechados ao lado do corpo | (1) arremesso comum para a esquerda; (2) vitória: de costas, olhando por cima do ombro; (3) vitória: braços cruzados, olhos fechados |
| **S10** | Entrada: (1) **ajoelhado, cabeça baixa, esperando**; (2) levantando devagar; (3) estalando os nós dos dedos | Fase 2: (1) **urrando para o céu, braços flexionados**; (2) peito estufado, ombros para trás; (3) guarda nova, curvado como predador |

### 2.2 Arena: "Arena do Centenário", ruína de 1926, em lugar nenhum do mapa (id `sc`)

Estádio art déco a céu aberto em ruínas, durante um **eclipse total**: céu negro com a coroa branca, arquibancadas de
concreto em degraus rachadas e com capim seco, dois pilonos art déco com relevos de raios de sol nas laterais, flâmulas
de pano rasgadas e desbotadas. O chão é de granilite creme com um grande anel de latão incrustado, e as rachaduras do
chão estão consertadas com ouro. Fase 2: as rachaduras do chão acendem (sobreposição procedural) e o eclipse escurece.
O texto "1926" entra por código, nunca pelo gerador.
```
[mesmo cabeçalho de cenário do candidato A, com a faixa de 80–90% de chão livre]
Stage: the ruins of a grand 1920s art-deco open-air stadium during a total solar eclipse: black sky with a bright white solar corona, stepped concrete stands cracked and overgrown with dry grass, two tall art-deco pylons with geometric sunburst reliefs at the far left and far right, faded torn cloth pennants. The round fighting floor is old cream terrazzo with a large inlaid brass ring; every crack in the floor is repaired with shining gold. Warm golden rim light, cold dark sky. No people, no statues, no text, no numbers.
```

### 2.3 Mecânica

| | Fase 1 | Fase 2 |
|---|---|---|
| Atributos | `pow 1.05 · spd 0.78 · jump 0.6 · scale 1.42 · stride 17 · reach 1.2` | `armadura: { rankMax: 2 }` em todos os normais fortes e especiais ("pele de ouro") |
| ESP | **MARCA DO SÉCULO**: fenda de ouro que corre **rente ao chão** (projétil `low: true`, estilo novo `fenda`): defende-se agachado | igual, `sp +20%` |
| ↓+ESP | **QUEDA DO CÉU**: martelada dupla `lvl: 'over'` (defende-se em pé), `kd`, `armor:1`. É o par alto da MARCA, que é baixa | **CENTENÁRIO**: soco no chão que **acerta todo rival no chão, em qualquer lugar da tela** (dano baixo, derruba). Só o salto escapa. Ondas de ouro correm pelo chão. **Primitiva nova** |
| →+ESP | **CEM PASSOS**: ombrada em corrida com `armor:1` | igual |
| IA | MARCA `zonear`; QUEDA `pressao [0,160]`; CEM PASSOS `aproximar` | CENTENÁRIO `anti-recuo` (quando o rival foge para o canto) |

Assinatura: **o chão inteiro vira arma** na fase 2. Teste medido: o rival no chão a 100, 400 e 800 px leva o golpe, e o
rival no ar com `y < −20` não leva.

**Entrada:** a arena no escuro, só a coroa do eclipse → uma rachadura de ouro corre pelo chão até ele, ajoelhado
(`entrada0`) → ele levanta (`entrada1`) → estala os dedos (`entrada2`), e as rachaduras do corpo acendem (procedural).
**Música:** marcha de tambores graves em meio-tempo, 72 bpm (seno 70→40 Hz com ruído grave), um "coro" de dente-de-serra
em quintas paralelas com ataque lento, **modo lócrio** e um sino rachado (triângulo + seno desafinado em 23 cents) a cada
4 compassos. Fase 2: a bateria dobra (144) e o coro sobe uma quarta.

### 2.4 Esquiva e cinemática

- **Esquiva:** mais lenta e curta (o A11 já prevê 24/28 ticks, 100/130 px). O fantasma sai **com as rachaduras acesas**
  (as duas linhas de ouro desenhadas por cima, ancoradas no quadro).
- **E13 · FENDA DE OURO:** polilinhas que **crescem a partir de um ponto e ficam** (não piscam), grossas (4–6 px), em ouro
  com borda ônix, ramificando em ângulos agudos, mais lascas (triângulos pequenos) caindo como cerâmica. O que separa do
  E1 RAIO: o raio é redesenhado a cada 2 ticks e vive no ar; a fenda nasce de uma superfície (chão ou corpo), cresce uma
  vez e permanece.

| Golpe | Núcleo / brilho / sombra | Matiz | Contraste (topo / base) |
|---|---|---|---|
| MARCA DO SÉCULO | `#fff6d6` / `#ffc93a` / `#1a1206` | 44° | 6,85 / 5,93 |
| QUEDA DO CÉU | `#ffffff` / `#e8a920` / `#0d0a06` | 41° | 9,46 / 7,12 |
| CEM PASSOS | `#fff1c2` / `#ffd75a` / `#2a1a04` | 45° | 5,62 / 5,18 |
| CENTENÁRIO (f2) | `#ffffff` / `#ffb21e` / `#080604` | 39° | 9,29 / 7,28 |

**Conflito de cor declarado:** 39–45° fica **colado no âmbar da NILA GAJA (30–37°) e no amarelo do RAIJIN-KEN (53°)**.
A separação depende só da sombra ônix e do estilo. É o candidato com a cor mais fraca.

### 2.5 Riscos

- **Arte: alto.** As rachaduras de ouro mudam de lugar a cada célula (a IA trata "crack" como textura). Em animação, isso
  pisca. Mitigação: só 2 rachaduras, descritas por ponto de início e fim. Se ainda assim variarem, as rachaduras saem da
  folha e passam a ser desenhadas pela render, ancoradas no quadro (custo de Lyra). O cabelo longo solto também varia.
  Estimativa: 72 + ~50% = **~108 créditos**.
- **Semelhança:** o arquétipo "imperador colossal sobrenatural, dono do torneio" é o do vilão de outra franquia de luta
  famosa. Por isso: **sem elmo, sem caveira, sem martelo, sem ombreiras com espinhos, sem riso de deboche**, rosto à
  mostra e solene. Kintsugi é técnica real japonesa usada aqui só como motivo visual. Citar a origem no material de
  divulgação evita a leitura de apropriação.
- **Cultura:** sem nacionalidade, risco baixo. Pele "oliva-bronze curtida" para não ler como monstro (pele cinza) nem
  como uma etnia específica.

---

## 3. Candidato C: CROWN, "A Dona do Espetáculo" · Estados Unidos · MMA

**Quem é.** Juliet Crowne, 39 anos, ex-campeã invicta de MMA que se aposentou para **comprar o torneio** e transformá-lo
no maior espetáculo transmitido do planeta. Usa no peito o cinturão do torneio que nunca disputou: comprou. Para ela, os
estilos tradicionais são "conteúdo", e o jogador é o episódio final da temporada.
**Personalidade:** carismática, sarcástica, fala para a câmera e não para o rival.

| Campo | Valor |
|---|---|
| Nome na tela | **CROWN** · "A Dona do Espetáculo" · ESTADOS UNIDOS |
| Idade / altura | 39 · ~2,03 m · **escala 1,30** (mulher atleta altíssima; é a primeira chefona do gênero com esta silhueta) |
| Silhueta | atlética e vertical, ombros largos, pernas longas e **faixa diagonal do cinturão** cruzando o peito (diagonal forte, que ninguém do elenco tem) |
| Rosto | cabelo platinado **raspado curtíssimo**, sobrancelhas escuras, pele bronzeada, brincos de argola de ouro pequenos, sorriso de canto |
| Traje | macacão de luta branco sem mangas e gola alta, painéis laterais pretos, zíper dourado na gola, luvas de MMA pretas sem dedos com faixa dourada, tênis de luta altos branco e preto. Atleta, **sem decote, sem sexualização** |
| Adereço | **o cinturão de ouro do torneio** usado em diagonal, do ombro direito ao quadril esquerdo |
| Cores | branco, preto, ouro. Energia: núcleo **branco de holofote** `#ffffff`, brilho **magenta-elétrico** `#ff3df0` (305°, o matiz mais livre da roda) |
| Guarda | MMA de lado, mãos altas, a da frente aberta e um pouco estendida, punho de trás no queixo, na ponta dos pés, sorrindo |
| Falas | Entrada: *"Sorria. Você está ao vivo para dois bilhões de pessoas."* · Fase 2: *"Intervalo encerrado. Agora é o evento principal."* · Vitória: *"Corta. Próximo episódio."* · Derrota: *"...Melhor audiência da história."* |

### 3.1 Conceito visual

```
Character reference image for a 2D fighting game. [mesmo cabeçalho dos outros dois]
CHARACTER — CROWN: American former mixed martial arts champion turned billionaire promoter and owner of a world martial arts tournament, about 39 years old, a VERY TALL athletic woman about 2 meters tall, broad shoulders, long powerful legs, strong athletic build, not sexualized. Very short platinum-blond buzz cut, dark eyebrows, tanned skin, small gold hoop earrings, confident smirk. Costume: a white sleeveless high-neck fitted full-body fighting suit with long legs, black side panels and a gold zipper at the collar; black fingerless MMA gloves with a gold stripe over the knuckles; white and black high-top fight shoes. A big gold championship belt worn diagonally across the chest from the right shoulder to the left hip like a sash. No cape, no jacket, no sunglasses, no cleavage. Fighting stance: side-on MMA stance, hands high, lead hand open and slightly extended, rear fist at the chin, light on the balls of the feet, smiling. Background color: solid flat pure green #00FF00.
```

**S7 a S10:** S7 HOLOFOTE (apontando para cima, estalando os dedos, apontando para o rival) + CORTE DE CÂMERA (agachada,
chute em arco subindo, queda); S8 NOCAUTE PATROCINADO (salto curto com a perna de trás, **soco "super-homem" voando**,
pouso) + aéreos + agarrão; S9 LUTA PRINCIPAL f2 (giro de costas, cotovelada girando, recuperação) + arremesso + vitória
(erguendo o cinturão sobre a cabeça; selfie com o celular); S10 entrada (descendo de costas com o cinturão no ombro;
virando; tirando um fone de ouvido) + fase 2 (ajeitando o cinturão no peito; apontando para a câmera; guarda baixa e séria).

### 3.2 Arena: "INNO DOME", Las Vegas (id `us`)

Interior de uma arena gigante à noite: domo escuro com anéis de holofotes brancos e fitas de LED magenta, um **cubo de
telão** de quatro faces pendurado no centro mostrando só luz abstrata, plateia lotada em silhuetas escuras com as luzes
dos celulares, gruas de câmera nas laterais e o chão de palco preto brilhante com um grande anel branco luminoso. Fase 2:
"AO VIVO", com luz de gravação vermelha piscando e holofotes virando para os lutadores (procedural).
```
[cabeçalho de cenário com a faixa de 80–90% de chão livre]
Stage: the interior of a gigantic modern sports arena at night. A huge dark dome roof with rings of white spotlights and magenta LED strips, a gigantic four-sided video screen cube hanging above the center showing only abstract magenta light, a packed crowd as dark silhouettes with tiny phone lights in the stands, camera cranes at the far left and far right. The fighting floor is a glossy black stage with a large glowing white ring outline. No readable text, no logos, no flags.
```

### 3.3 Mecânica

| | Fase 1 | Fase 2 ("AO VIVO") |
|---|---|---|
| Atributos | `pow 0.98 · spd 1.08 · jump 0.9 · scale 1.30 · reach 1.1` | `pow 1.05`, `armadura: { rankMax: 2 }` só nos especiais |
| ESP | **HOLOFOTE**: um feixe de luz **cai do alto no x do rival**, com aviso de 30 ticks (círculo no chão); golpe alto. **Primitiva nova** (projétil que nasce no alvo) | aviso de **16 ticks** |
| ↓+ESP | **CORTE DE CÂMERA**: chute em arco subindo, invulnerável (reuso da subida) | igual |
| →+ESP | **NOCAUTE PATROCINADO**: soco voador em investida, `kd` | **LUTA PRINCIPAL**: cotovelada girando que cruza o rival (`through`) |

**Entrada:** a tela vira transmissão (bordas de câmera, "AO VIVO" com ponto vermelho, procedural) → CROWN desce de costas
com o cinturão no ombro → vira → tira o fone de ouvido. **Música:** eletrônica de arena, 128 bpm em 4/4, bumbo de
estádio, *supersaw* (3 dentes-de-serra desafinados em ±12 cents), corte de filtro antes do refrão e palmas sintéticas
(ruído passa-banda de 1,2 kHz). Fase 2: trava em 140 bpm e entra uma "sirene" (seno 600↔900 Hz).

### 3.4 Esquiva e cinemática

- **Esquiva "CORTE":** em vez do fantasma branco, duas cópias deslocadas (magenta à esquerda, branco à direita), como um
  defeito de transmissão. É só render.
- **E14 · HOLOFOTE:** cones de luz (trapézios) caindo do topo da faixa, linhas de varredura horizontais a 8% e um ponto
  "REC" pulsando. Acerto: o cone se fecha num círculo de luz sobre o rival.

| Golpe | Núcleo / brilho / sombra | Matiz | Contraste (topo / base) |
|---|---|---|---|
| HOLOFOTE | `#ffffff` / `#ff3df0` / `#2b0533` | 305° | 9,76 / 6,00 |
| CORTE DE CÂMERA | `#fde8ff` / `#ff4ad8` / `#33062e` | 313° | 8,18 / 5,46 |
| NOCAUTE PATROCINADO | `#ffffff` / `#f02de0` / `#3a0640` | 305° | 9,55 / 5,52 |
| LUTA PRINCIPAL (f2) | `#ffffff` / `#ff3df0` / `#500010` | 305° | 8,74 / 5,38 |

Melhor cor dos três: 27° do WEI LONG e 28° da MIN-JI.

### 3.5 Riscos

- **Arte:** médio-baixo. Traje justo e liso é o que a IA mais mantém; o cinturão em diagonal pode trocar de lado
  (conferir célula a célula, como as mãos do AMINU). Estimativa: 72 + ~30% = **~96 créditos**.
- **Semelhança:** é o candidato mais **longe do pedido**. O dono pediu um vilão "à Rugal", e uma promotora moderna é
  outra proposta. Risco de parecer pessoa real (campeãs e promotores de MMA): rosto genérico e nome fictício, sem
  referência a evento real. A herdeira loira de um vilão de outra franquia de luta foi descartada de propósito (por isso o
  cabelo raspado curtíssimo).
- **Escala:** 1,30 é pouco maior que o BAATAR (1,28). A imponência vem da altura vertical e da faixa diagonal, não da
  massa. Talvez não satisfaça "precisa de escala de chefão".

---

## 4. Comparação e recomendação

| Critério | **A · ZENON, O Arconte** | B · SÉCULO, O Primeiro Campeão | C · CROWN, A Dona do Espetáculo |
|---|---|---|---|
| Próximo do pedido do dono | **alto**: dono do torneio, carismático, cruel e elegante | médio-alto: dono, mas místico | baixo-médio: dona moderna, outro tom |
| Escala / silhueta | 1,32 (valor final; a proposta era 1,36), alto e esguio, casaco longo | **1,42, colosso em V** | 1,30, vertical com diagonal |
| Sinais de chefão (0.2, de 10) | **10** | 10 | 9 (escala fraca) |
| Golpe assinatura | TRIBUTO: rouba o medidor do rival | **CENTENÁRIO: o chão inteiro acerta** | HOLOFOTE: o golpe cai no rival |
| Motor | **0 primitiva nova** (1 parâmetro + reuso) | 1 primitiva (área no chão) | 1 primitiva (projétil no alvo) |
| Cor (folga para o vizinho) | 322°, 14–19° da MIN-JI | **39–45°, encostado na NILA** | **305°, ≥ 27° de todos** |
| Risco de arte | médio (casaco) | **alto** (rachaduras, cabelo) | médio-baixo |
| Créditos estimados (de 152) | ~102 (+6 com S11) | ~108 | ~96 |
| Risco de semelhança | médio, mitigado (arquétipo pedido) | médio (imperador colossal de outra franquia) | baixo-médio (pessoas reais) |
| Encaixe na lore | **ótimo**: o BAATAR, campeão de 9 edições, vira o herói honrado contra o dono | ótimo (centenário 2026) | bom |

**Recomendação: Candidato A, ZENON ARGYROS, "O Arconte".**
- É o mais próximo do que o dono descreveu: o dono do torneio como vilão carismático, com presença, cortesia cruel e uma
  arena que é a casa dele.
- É original nos pontos que identificam o vilão citado: traje, cabelo, arena, golpes, fase 2 e o objeto de poder (o
  anel do torneio no lugar das estátuas).
- **Custa zero primitiva nova** no motor.
- Dá ao BAATAR o melhor papel possível: o campeão honrado de 9 edições que agora desafia o dono do torneio.

Se o dono quiser **o maior impacto de escala**, a segunda opção é o B, ciente do risco de arte e da cor.

---

## 5. BAATAR vira lutador normal

### 5.1 Posição na fila de desbloqueio: **5º, depois da NILA** (recomendado)

`FILA_DESBLOQUEIO = ['aminu', 'centella', 'camille', 'nila', 'baatar']`.
- **Fecha a fila com o gigante**, o único grappler do elenco e o arquétipo mais diferente de todos. É a recompensa
  "grande" do 5º Arcade.
- **Não mexe na ordem já aprovada** dos quatro, só acrescenta no fim.
- **Quem já derrotou o BAATAR como chefe não perde nada:** ele está em `desbloqueados`, e `proximoDaFila` pula quem já
  está liberado (`progresso.ts:20`). Esse jogador avança direto para o próximo.
- Alternativa (decisão do dono): 1º da fila, porque é o único com a arte 100% pronta. Não recomendo: grappler é o
  arquétipo mais difícil para iniciante, e o AMINU foi escolhido como primeira recompensa justamente por ser simples.

### 5.2 O que deixa de ser chefão

| Hoje (`baatar.ts`, `regras.ts`) | Passa a |
|---|---|
| `CHEFE = 'baatar'` | `CHEFE = '<id do novo chefão>'` |
| `chefe { barras 2, hpPorBarra 40, danca, bonusVitoria }` | **sai do BAATAR**, vai para o chefão novo (com `cena.poses` no lugar de `danca`) |
| `fichas.chefe` / `fichas.chefe2` | **saem**. O BAATAR fica com 1 barra e a ficha base, nos números da E6b (`hp 92 · pow 0.9`), que já são os do jogável |
| →+ESP ABRAÇO DA ESTEPE | **MERGULHO DA ÁGUIA** (recomendado, ver 5.3) |
| `apresentacao-especiais.ts`: `'chefe2/sFwd'` | `'base/sFwd'` (mesmo quadro `dive1`, entrada `cima`) |
| Dança da Águia como `cena-chefe` | entrada e vitória (5.3) |
| Casa central da grade 3×3 (`ordemDaGrade` põe o chefe no índice 4) | casa comum. O chefão novo é o **10º**: a grade 3×3 não comporta, decisão de layout em 6 |
| Aviso "UM DESAFIANTE SE APROXIMA" | o mesmo aviso, agora com o chefão novo (texto sugerido para o A: "O ANFITRIÃO ESTÁ À SUA ESPERA") |

### 5.3 MERGULHO DA ÁGUIA e Dança da Águia no BAATAR normal

- **MERGULHO DA ÁGUIA vira o →+ESP**, no lugar do ABRAÇO DA ESTEPE. Motivo: completa um **triângulo de mistura** limpo,
  alto (MERGULHO, defende-se em pé), baixo (QUEBRA-BASE, defende-se agachado) e agarrão (ARREMESSO, inbloqueável), que é
  o desenho clássico do grappler. Também aproveita a arte `dive0-1` da B9, que hoje só aparece na luta de chefe. A
  identidade visual já existe (E11 PENA DE ÁGUIA). Custo: dado (`sFwd` aponta para o MERGULHO; a `poseDaFicha` do
  `sc0/sc1` vira mapeamento da ficha base) e **nova rodada do harness** (`npm run balanco`), porque o kit muda. Opção
  conservadora: manter o ABRAÇO e deixar o MERGULHO de fora (a arte da B9 fica sem uso em luta).
- **Não existe botão de provocação** no motor, e o ED10 veta o 4º especial, então a Dança **não** vira golpe. Ela vira
  **apresentação**: (a) **entrada pré-luta do BAATAR** (`devekh0..2`, 1,5 s), na mesma cena de entrada que o chefão novo
  precisa. É fiel ao bökh, em que o lutador entra no campo dançando a águia. (b) **Vitória:** `devekh0` seguido da pose
  mão no peito (B9 linha 2, célula 3). A cena de entrada passa a ser genérica (`entrada0..2` por lutador, com reserva em
  `idle`), e o BAATAR é o primeiro lutador comum a usar.
- **Lore:** BAATAR, o Avarga, campeão de 9 edições, sempre devolveu o cinturão ao dono do torneio. Agora entra como
  desafiante: quer que o cinturão volte aos lutadores. A fala do final antigo continua: *"A estepe não tem dono. O
  cinturão também não."* O arco "A Volta ao Mundo" termina na arena do chefão, e não mais no Naadam.

### 5.4 O que reaproveitar da arte dele

- **As 9 folhas + a BR ficam todas no atlas do BAATAR.** Nada sai e nada precisa ser regerado. B9 ganha uso no jogo normal
  (`dive0-1` no MERGULHO, `devekh0-2` na entrada, vitória mão no peito).
- **Para a arena do chefão, nenhum sprite do BAATAR entra.** Pôr o campeão honrado como figurante do vilão confunde a
  leitura dos dois. O que se reaproveita é o **processo**: o molde de 6 poses (3×2) e o fundo verde do `08-baatar.md`, os
  12 prompts de correção, as regras medidas (contar componentes, topo da cabeça até o queixo, anexar a S1 aprovada,
  "hands never touching his own clothes") e, no motor, o gancho `fase-chefe` que escurece o céu do `mn`, que passa a
  acender a fase 2 da arena nova.
- **Cenário `mn` (Estepe do Naadam) continua sendo a casa do BAATAR.** O escurecimento do céu da fase 2 deixa de
  disparar. Se a Lyra quiser, vira variação de clima aleatória.

---

## 6. Impacto técnico (para o Atlas distribuir; nada foi implementado)

| Quem | O quê |
|---|---|
| **Nova** | confirmar se `drenaEnergia` é parâmetro (A) ou primitiva; generalizar `danca` para `cena { duracao, poses }`; cena de **entrada** pré-luta só de render, fora do lock-step; registrar a decisão do MERGULHO no BAATAR (muda o ED-M4/ED-M5) |
| **Vega** | novo `LutadorDef` + fichas `chefe`/`chefe2`; tirar `chefe`/`fichas` do BAATAR; `CHEFE` e `FILA` em `regras.ts`; id novo em `IDS_LUTADORES` (C3); `fighter.ts:1049` lendo `cena.poses`; trilha `chefe` no `audio-sys.ts` (12 passos para o 3/4 do A); harness da E6 com o BAATAR normal e com o chefão |
| **Lyra** | grade de 10 casas (hoje `ordemDaGrade` só trata 9; proposta: 3×3 dos regulares + **casa de honra do chefão centralizada abaixo** ou acima, **medida** no celular sem bater no painel de descrição); estilo de projétil novo (`anel` no A); E12 na tabela de identidade; cena de entrada; aura ônix da fase 2 (atrás do sprite, sem `shadowBlur`); fantasma tingido na esquiva |
| **Cronos** | `chefeDerrotado` hoje é um booleano sem id e passaria a "valer" para o chefão novo em quem já venceu o BAATAR. Hoje ninguém lê o campo (só `meta/tipos.ts`), então o risco é baixo, mas se for usado convém virar `chefesDerrotados: IdLutador[]` com saneamento |
| **Apolo** | prompts completos do chefão escolhido em `docs/prompts-arte.md` (fonte) + gerador; curadoria das folhas; cenário |

## 7. Decisões do dono

1. **Escolher o chefão:** A (recomendado), B ou C. Nome, país e estilo aprovados antes de qualquer geração.
2. **BAATAR na fila:** 5º (recomendado) ou 1º.
3. **MERGULHO DA ÁGUIA no →+ESP do BAATAR** no lugar do ABRAÇO (recomendado) ou manter o ABRAÇO.
4. **Folha S11 da fase 2** (+6 créditos) ou fase 2 só por aura e cor.
5. **Orçamento:** ~96–108 dos 152 créditos vão para o chefão. Sobram ~45–55 para as pendências de arte que ainda estão
   abertas (NILA f5 regerar, FX opcionais).
6. Revisão nativa do selo em grego (A) antes de ligar selos na tela.
