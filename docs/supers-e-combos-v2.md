# Supers e combos v2 (fatia R-5)

Apolo, 24/10/2026. Direção de arte e texto para a onda 2 de `docs/spec-redesenho-jogabilidade.md` (§3.4, §3.5, §6 R-5).
É só documento: não mexe em código, não gera imagem e não gasta crédito. A Vega aplica no R-7 (`src/data/supers.ts`) e no R-8
(`combosProprios` nos `src/data/lutadores/*.ts`).

**Fixo (o dono aprovou D-R1 a D-R8, 24/10):** 1 super por lutador (NILA: 1 por postura; ZENON: 1 por fase), comando
SOCO FORTE + CHUTE FORTE com a barra cheia, dano = 1,35 × o efetivo do filme v2 com teto de 32, filme CURTO no KO de round e
COMPLETO no KO da luta, revisão dos 20 combos aprovada como a Nova recomendou e trailer por partitura.

---

## 1. Como escolhi

1. **O super é a versão forte de um especial que já tem filme.** Os 33 especiais com dano têm linha em `src/data/filmes.ts` e
   roteiro em `src/data/roteiros-filme.ts`, e a folha FILME (closes `f0`-`f2` = `sFire`/`sDown`/`sFwd`) foi curada para os 10.
   Nenhuma arte nova.
2. **Primeiro o estilo, depois a mecânica.** O golpe tem de ser o que o lutador "é" na luta dele: o punho que sobe do HAYATO, a
   palma do tai chi do WEI LONG, o chute tornado da MIN-JI, a meia-lua de compasso do CAIO, a lança do AMINU, o voo da
   CENTELLA, a estocada secreta da CAMILLE, o ponto vital e o bote da NILA, o arremesso do BAATAR e o selo do ZENON.
3. **Quando o estilo empata, ganha o golpe que fecha o BÁSICO.** O BÁSICO (`fraco › forte (semQueda) › especial`) já foi provado
   pelo verificador, em pé e agachado. Se o super for o mesmo golpe, ele cai no mesmo lugar e o jogador aprende uma coisa só:
   "com a barra cheia, troque o último botão por SFT+CFT". Isso vale para 6 dos 12 supers.
4. **Variedade entre os 10.** São 2 que sobem com invulnerabilidade, 3 saltos, 2 projéteis, 2 investidas, 1 golpe parado,
   1 golpe carregado e 1 agarrão. Nenhum par de lutadores tem o mesmo super.
5. **O nome fala a língua dos especiais do lutador,** porque aparece na mesma tarja: japonês no HAYATO, chinês no WEI, coreano
   na MIN-JI, termo de capoeira no CAIO, espanhol de lucha na CENTELLA, francês de esgrima na CAMILLE e português nos outros,
   com a voz deles (a NILA fala como clínica, o ZENON como anfitrião, o AMINU como showman).

## 2. Régua de largura (medida, não estimada)

Medi no Chromium do projeto com as fontes reais carregadas por `FontFace`: Bangers 48 px (a tarja, `tamanhoDoNome` em
`src/render/cinematica.ts`) e Barlow 600 15 px (a caixa da lista de combos, se o R-9 listar o super no TREINO).

- **Tarja:** o espaço livre é `LARGURA_DA_TARJA × 0,62 = 620 px`. O maior super, MEIA-LUA DE COMPASSO, mede **380 px** e cabe
  inteiro a 48 px, sem encolher. É do mesmo tamanho do especial mais longo que já existe (ARREMESSO DO AVARGA, 378 px).
- **Lista do TREINO (416 px):** o maior mede **164 px** a 15 px. Com a faixa de duas teclas (SFT + CFT), sobram mais de 100 px.
- **Teto adotado:** 20 caracteres. O `combos-nomes.test.ts` (24 caracteres) cobre isso se a Vega estender o teste aos supers.

| Nome | Caracteres | Bangers 48 px | Barlow 600 15 px |
|---|---|---|---|
| TENRAI-KEN | 10 | 185 | 85 |
| TAIJI ZHANG | 11 | 187 | 84 |
| TAEPUNG CHAGI | 13 | 242 | 108 |
| MEIA-LUA DE COMPASSO | 20 | 380 | 164 |
| VALEU A ESPERA | 14 | 243 | 115 |
| ESTRELLA FUGAZ | 14 | 253 | 120 |
| BOTTE SECRÈTE | 13 | 232 | 110 |
| PONTO VITAL | 11 | 192 | 88 |
| PICADA | 6 | 110 | 50 |
| PESO DA ESTEPE | 14 | 244 | 113 |
| CORTESIA DA CASA | 16 | 290 | 129 |
| FIM DO BANQUETE | 15 | 277 | 121 |
| HANA-DUL-SET (combo) | 12 | 226 | 105 |

---

## 3. Os supers (tabela para `src/data/supers.ts`)

A chave segue o contrato do §3.4 da spec: `lutador` ou `lutador/ficha`. A ficha `chefe` do ZENON cai na base, como em
`filmes.ts`. **`dano ef.`** é o efetivo (1,35 × o efetivo do filme v2, teto 32). A base no dado é `ef ÷ pow` da ficha, exceto
no projétil, que não usa `pow` (mesma convenção de `filmes.ts`). Os números vão para o harness e o A/B. Não são finais.

| chave | golpe | especial de origem | **nome do super** | tipo | dano ef. (filme v2 × 1,35) | `invulneravel` | fecha o BÁSICO? |
|---|---|---|---|---|---|---|---|
| `hayato` | `sDown` | RAIJIN-KEN | **TENRAI-KEN** | sobe, invulnerável | 21,5 × 1,35 = **29,0** | 8 (o do especial) | sim (RAIO ÀS AVESSAS) |
| `wei-long` | `sFire` | LONG ZHANG | **TAIJI ZHANG** | projétil | 23,0 × 1,35 = **31,1** | – | não (o BÁSICO fecha na TIE SHAN KAO) |
| `min-ji` | `sDown` | HOERI CHAGI | **TAEPUNG CHAGI** | sobe, 3 acertos, invulnerável | 18,5 × 1,35 = **25,0** | 6 (o do especial) | sim (NOTA MÁXIMA) |
| `caio` | `sFwd` | MEIA-LUA | **MEIA-LUA DE COMPASSO** | salto, golpe ALTO | 17,0 × 1,35 = **23,0** | – | sim (SÃO BENTO GRANDE) |
| `aminu` | `sFire` | MASHI (nível 3) | **VALEU A ESPERA** | soco carregado, sai cheio | 26,0 × 1,35 = 35,1 → **32** (teto) | – | não (fecha no PASSO DO LEÃO) |
| `centella` | `sFire` | PLANCHA | **ESTRELLA FUGAZ** | salto, golpe ALTO | 16,5 × 1,35 = **22,3** | – | sim (DO ALTO DAS CORDAS) |
| `camille` | `sFwd` | REVERS | **BOTTE SECRÈTE** | investida que cruza | 16,0 × 1,35 = **21,6** | – | sim (TOUCHÉ reescrito, §4) |
| `nila` (GAJA) | `sFire` | GOLPE MARMA | **PONTO VITAL** | golpe parado, curto | 19,0 × 1,35 = **25,7** | – | não (fecha no PASSO DO ELEFANTE) |
| `nila/sarpa` | `sFwd` | SALTO DA SERPENTE | **PICADA** | salto em parafuso, ALTO | 16,0 × 1,35 = **21,6** | – | não (fecha no BOTE) |
| `baatar` | `sFire` | ARREMESSO DO AVARGA | **PESO DA ESTEPE** | agarrão de comando | 25,0 × 1,35 = 33,8 → **32** (teto) | – | não (fecha no QUEBRA-BASE) |
| `zenon` (jogável e fase 1) | `sFire` | SELO DO ARCONTE | **CORTESIA DA CASA** | projétil | 16,0 × 1,35 = **21,6** | – | não (fecha no TRIBUTO) |
| `zenon/chefe2` | `sFwd` | DECRETO | **FIM DO BANQUETE** | investida que cruza | 17,5 × 1,35 = **23,6** | – | sim (A CONTA, CONVIDADO, na fase 2) |

### 3.1 Por que cada um (o motivo de estilo)

- **HAYATO · TENRAI-KEN** ("punho do trovão do céu"). O título dele é "O Punho do Trovão", e RAIJIN-KEN quer dizer punho do deus
  do trovão: o super é o próprio epíteto. É o soco ascendente invulnerável, o golpe que se ensina primeiro a quem começa. O
  combo dele já se chama RAIO ÀS AVESSAS: o raio que sobe.
- **WEI LONG · TAIJI ZHANG** ("a palma do tai chi"). "Lento, porém devastador: cada palma pesa." A palma do dragão, que já é
  enorme e lenta, vira a palma do *taiji*, o supremo. Escolhi a palma e não a ombrada porque a TIE SHAN KAO é da "montanha"
  (bajiquan) e o pedido é o tai chi. A ombrada continua fechando o BÁSICO.
- **MIN-JI · TAEPUNG CHAGI** ("chute tufão", *taepung* = tufão). Ela é "A Tempestade de Seul": o tornado de 3 acertos é a
  tempestade inteira. Mantém o registro coreano dos especiais dela (BULKKOT, HOERI CHAGI).
- **CAIO · MEIA-LUA DE COMPASSO.** É o golpe mais reconhecível da capoeira, e o close FILME `f2` dele já é exatamente isso: mão no
  chão, corpo invertido, a perna passando em arco alto (curadoria do grupo B). O jogador brasileiro lê sem legenda. Respeita a
  regra do dono: ginga, mão aberta, nada de boxe.
- **AMINU · VALEU A ESPERA.** O AMINU guarda o selo da paciência, e a MASHI carregada é a lança que espera ("Quem esperou até aqui
  merece o selo"). O super é a lança cheia **sem** precisar carregar: quem esperou foi a barra. É a voz de showman dele, que fala
  com a plateia. Evitei "LANÇA DE KANO" porque o combo dele já é RUGIDO DE KANO.
- **CENTELLA · ESTRELLA FUGAZ.** A PLANCHA forte vira o mergulho de estrela da lucha libre. Ela é "A Faísca da Arena": faísca e
  estrela cadente na mesma imagem. Fica em espanhol, como o ¡ARRIBA! dela.
- **CAMILLE · BOTTE SECRÈTE.** Na esgrima, a *botte secrète* é a estocada que ninguém sabe defender. O REVERS cruza e acerta pelas
  costas, e a defesa precisa inverter: é literalmente o golpe que o rival não vê. Duas palavras secas, sem exclamação, como
  ela. O PARADE e o COUP D'ARRÊT não podem ser o super, porque são defesa e contragolpe (a regra V6 vale também aqui: super
  é ataque).
- **NILA (GAJA) · PONTO VITAL.** O golpe *marma* do kalaripayattu acha o ponto vital, e a NILA é a fisioterapeuta que dá
  diagnóstico ("Sem anestesia", "Diagnóstico"). A postura do elefante é pesada e o super é o toque que não precisa de força.
- **NILA (SARPA) · PICADA.** É picada de serpente e picada de agulha: as duas faces da NILA numa palavra. Escolhi o SALTO DA
  SERPENTE, e não o BOTE, porque o BOTE tem o menor dano do jogo (efetivo 10). O super dele daria 13,5, menos que um chute
  forte com a escala de combo. O salto em parafuso dá 21,6 e é o golpe mais vistoso da postura.
- **BAATAR · PESO DA ESTEPE.** No bökh perde quem toca o chão. O agarrão do avarga é o golpe que decide a luta dele. Grappler
  tem super de agarrão (é o padrão do gênero), e a identidade dele não cabe numa sequência de socos. Nome em português, curto,
  como ele fala (3 a 6 palavras).
- **ZENON (fase 1 e jogável) · CORTESIA DA CASA.** O anel-sinete é o emblema do torneio, e o SELO DO ARCONTE é o anel disparado.
  O anfitrião oferece a "cortesia", a palavra que só ele usa (`docs/textos-chefoes.md`: nenhum guardião usa cortesia, convidado,
  jantar ou tributo).
- **ZENON (fase 2) · FIM DO BANQUETE.** A máscara cai: o anfitrião encerra o jantar. O DECRETO cruza o rival e cobra o tributo. Os
  dois nomes contam o arco do chefão, de "cortesia" a "fim".

### 3.2 O que a Vega precisa saber (contrato e armadilhas)

1. **O 3º passo do BÁSICO aceita o super.** O `semQueda` do golpe forte só vale dentro de um combo reconhecido. Se o motor não
   reconhecer `fraco › forte › SUPER` como o BÁSICO, o forte derruba e o super passa no vazio. A regra proposta: no BÁSICO, o
   passo "especial" casa com o especial do dado **ou** com o super do lutador, qualquer que seja o golpe do super. O verificador
   prova os 10 BÁSICOS fechando em super, em pé e agachado. É a única maneira de o "básico › super" da partitura do trailer (P9)
   existir.
2. **AMINU: o super sai como MASHI nível 3, sem segurar.** Na hora do `hp`+`hk`, o golpe `carga` nasce no nível 3 (dano do
   super, derruba). A regra geral vale: bloqueado é 1 `block` com raspão e a barra vai embora. Por isso a quebra de guarda do
   nível 3 **não** vale no super, para o super não virar um imbloqueável. Se isso custar caro no motor, a reserva é o PASSO DO
   LEÃO (`sFwd`, mesmo nome, dano 17,0 × 1,35 = 23,0).
3. **BAATAR: o super é agarrão.** Não se bloqueia. Erra se o rival estiver no ar ou em atordoamento (`canThrow`), e aí paga a
   recuperação do agarrão (R 36) com a barra perdida. Ele não fecha combo (o `canThrow` recusa rival atordoado), e é o único
   super assim. A CPU-7 usa como punição, nunca como fecho.
4. **WEI LONG e ZENON fase 1: o super é projétil.** Resolve no 1º contato limpo do projétil, como o filme da v2. Fechar combo
   depois de um forte depende da distância (LONG ZHANG tem preparação 20 e velocidade 6,2). O verificador diz se cabe. Se não
   couber, não troco o golpe: os dois têm o BÁSICO fechando em outro especial, e o projétil é o super de zona e de punição.
5. **CAMILLE e ZENON fase 2: o super cruza.** O REVERS e o DECRETO só acertam depois de passar (`through`). O filme resolve o
   estado final. O que precisa conferir é o lado em que os dois ficam depois do filme (o `facing` do `depois`).
6. **`invulneravel`:** só nos dois que sobem, com o mesmo valor do especial (8 e 6). Não proponho aumentar: a K3 da spec já
   aceita que a tarja de 30 avisa o rival, e mais invulnerabilidade seria balanço, que é com o harness.
7. **Unicidade de nome:** nenhum super repete especial ou combo do próprio lutador nem de outro (conferido à mão nos 12 nomes,
   17 combos e 33 especiais). Sugiro estender o `combos-nomes.test.ts` para os supers: caixa alta, único no jogo, até 20
   caracteres.

---

## 4. Combos v2 (tabela para os `combosProprios`)

Botões como na tela: SF/CF = soco/chute fraco, SFT/CFT = soco/chute forte, ↓ e → = direção, ESP = especial. Força:
F = fraco (`lp lk clp clk`), T = forte (`hp hk chp chk`), E = especial. A coluna **efeito** é a linha que a tela mostra (≤ 40
caracteres). Quando está em itálico, é o texto padrão do `final`, e o dado fica **sem** `efeito`.

**Placar: 20 → 17.** 13 mantidos sem mudança, 4 reescritos (1 com `id` novo) e 3 descartados (os 2 condicionais e a CAVALGADA).

| id | sequência (dado) | botões | forma | final / semQueda | nome | efeito (≤ 40) | estado |
|---|---|---|---|---|---|---|---|
| `hayato-trovao-ascendente` | `clp, hk, sDown` | ↓SF › CFT › ↓ESP | F›T›E (BÁSICO) | semQueda [1] | RAIO ÀS AVESSAS | segura em pé e sobe no RAIJIN-KEN | mantido |
| `hayato-trovao-lancado` | `lk, clp, hp` | CF › ↓SF › SFT | F›F›T | lanca | ESTRONDO | *lança o rival* | mantido |
| `wei-long-ombrada-de-ferro` | `clp, hk, sFwd` | ↓SF › CFT › →ESP | F›T›E (BÁSICO) | semQueda [1] | A MONTANHA SE MOVE | segura em pé e fecha na TIE SHAN KAO | mantido |
| `wei-long-palma-da-montanha` | **`lp, hp, hp`** | SF › SFT › SFT | F›T›T | parede | GRANDE MURALHA | *empurra o rival para a parede* | **reescrito** (mesmo id e nome) |
| **`min-ji-hana-dul-set`** (era `min-ji-rajada-de-seul`) | **`lk, lk, hk`** | CF › CF › CFT | F›F›T | lanca | **HANA-DUL-SET** | *lança o rival* | **reescrito, id novo** |
| `min-ji-tornado-de-seul` | `lk, hk, sDown` | CF › CFT › ↓ESP | F›T›E (BÁSICO) | semQueda [1] | NOTA MÁXIMA | segura em pé e sobe no HOERI CHAGI | mantido |
| `caio-ginga-rasteira` | `clk, clk, chk` | ↓CF › ↓CF › ↓CFT | F›F›T | cruza | VOLTA AO MUNDO | *troca de lado com o rival* | mantido |
| `caio-meia-lua-encadeada` | `lk, hk, sFwd` | CF › CFT › →ESP | F›T›E (BÁSICO) | semQueda [1] | SÃO BENTO GRANDE | segura em pé e fecha na MEIA-LUA | mantido |
| `aminu-dambe-encadeado` | `lk, hp, hp` | CF › SFT › SFT | F›T›T | parede | NO COLO DA PLATEIA | *empurra o rival para a parede* | mantido |
| `aminu-leao-no-canto` | `lp, hk, sFwd` | SF › CFT › →ESP | F›T›E (BÁSICO) | semQueda [1] | RUGIDO DE KANO | segura em pé e fecha no PASSO DO LEÃO | mantido |
| `centella-plancha-na-corda` | `lk, hk, sFire` | CF › CFT › ESP | F›T›E (BÁSICO) | semQueda [1] | DO ALTO DAS CORDAS | segura em pé e fecha na PLANCHA | mantido |
| `centella-chave-aerea` | `clp, clk, hp` | ↓SF › ↓CF › SFT | F›F›T | lanca | ¡ARRIBA! | *lança o rival* | mantido |
| `camille-riposte` | **`clk, hk, sFwd`** | ↓CF › CFT › →ESP | F›T›E (BÁSICO) | semQueda [1] | TOUCHÉ | **segura em pé e fecha no REVERS** | **reescrito** (mesmo id e nome) |
| `nila-gaja-elefante-pesado` | **`clp, hp, sFwd`** | ↓SF › SFT › →ESP | F›T›E (BÁSICO) | – (o `hp` da NILA não derruba) | SEM ANESTESIA | do soco forte ao PASSO DO ELEFANTE | **reescrito** (mesmo id, nome e efeito) |
| `nila-sarpa-bote-veloz` (ficha `sarpa`) | `lk, clp, clk, sFire` | CF › ↓SF › ↓CF › ESP | F›F›F›E | – | DIAGNÓSTICO | três toques e o BOTE | mantido |
| `baatar-quebra-base-encadeado` | `clk, hk, sDown` | ↓CF › CFT › ↓ESP | F›T›E (BÁSICO) | semQueda [1] | O CHÃO DECIDE | segura em pé e fecha no QUEBRA-BASE | mantido |
| `zenon-tributo-do-arconte` | `clp, hk, sFwd` | ↓SF › CFT › →ESP | F›T›E (BÁSICO) | semQueda [1] | A CONTA, CONVIDADO | segura em pé e cobra o tributo | mantido |

**Descartados:** `camille-estocada-cruzada` (FLECHA DE MARSELHA), `zenon-decreto-cruzado` (SEU LUGAR À MESA) e
`baatar-esmagamento` (CAVALGADA).

### 4.1 Os reescritos

- **GRANDE MURALHA (WEI):** `lp › hp › hp`. A força deixa de descer (V1). O soco fraco abre e as duas palmas pesadas empurram
  até a parede. O nome continua certo, então o `id` fica.
- **HANA-DUL-SET (MIN-JI):** `lk › lk › hk`. O chute fraco não lança mais (V2), e o chute forte é que manda o rival para cima. A
  contagem do dojang passa a três: *hana, dul, set*. Como o nome mudou, o `id` muda também (regra do §3.5.3). O teste de nomes
  segue o dado (K8). 12 caracteres, 105 px na lista: cabe com a faixa de 3 teclas.
- **TOUCHÉ (CAMILLE):** `↓CF › CFT › →ESP`. O COUP D'ARRÊT é golpe de parada (V6) e sai do fecho. Entra o REVERS, o único
  especial de ataque dela. O toque final vem pelas costas, e por isso a palavra que ela diz na vitória continua certa. Efeito
  com 30 caracteres, na mesma forma dos outros BÁSICOS.
- **SEM ANESTESIA (NILA GAJA):** `↓SF › SFT › →ESP`. A força deixa de descer (V1). O efeito antigo ("do soco forte ao PASSO DO
  ELEFANTE") continua verdadeiro e fica igual. É o efeito mais largo da tela (20,6 px de folga, medido em 23/10), e não cresce.

### 4.2 Os condicionais: veredito com a captura do `hp` (atlas atual)

Recortei `hp0`/`hp1`, `lp1`, `lk1` e `idle0` dos atlas publicados (`public/assets/lutadores/<id>/atlas.json`) e olhei lado a
lado.

- **CAMILLE, FLECHA DE MARSELHA: descartada (V5).** O `hp1` é um direto de savate (luva) em *fente*: o pé da frente avança, a
  perna de trás estica e o corpo **fica do lado dela**. Na esgrima, a *flèche* é o ataque em corrida em que se passa pelo
  rival, e o golpe desenhado não passa. Um `cruza` aí faria o rival trocar de lado sem nada na tela que explique. A troca de
  lado da CAMILLE continua viva no REVERS e, agora, no super BOTTE SECRÈTE.
- **ZENON, SEU LUGAR À MESA: descartado (V5).** O `hp1` é uma palma aberta empurrando reto, à altura do peito. Não puxa e não
  gira o rival. O `lk1` gira o tronco (de costas para a câmera), mas é o chute dele e não move o rival. A troca de lado do ZENON
  continua no DECRETO (fase 2), que cruza por desenho, e no super FIM DO BANQUETE.
- **BAATAR, CAVALGADA: descarte confirmado.** São os mesmos botões e o mesmo `final` do AMINU (V4), e soco seguido não é bökh.
  Procurei um substituto de agarrador dentro de V1-V6: os golpes dele que contam a luta do bökh são o agarrão e o QUEBRA-BASE,
  e os dois são especiais (não fecham assinatura com `final`, V2). Toda sequência de normais que sobra (`lp › clk › chp`, lança)
  fica a um botão da ¡ARRIBA! da CENTELLA e seria o mesmo erro da CAVALGADA, só com outro nome. A assinatura do BAATAR passa a
  ser o super de agarrão (PESO DA ESTEPE). Agarrador com um combo e um agarrão forte é o padrão do gênero.

Resultado: a CAMILLE, o BAATAR e o ZENON ficam com 1 combo próprio (o BÁSICO). O limite é "no máximo 2", então está dentro da
regra. Um 2º combo para a CAMILLE ficou como opção do dono (§6).

### 4.3 Conferência V1-V6 dos 17

| Regra | Resultado |
|---|---|
| V1 força não desce | 17/17. Os dois que desciam (GRANDE MURALHA, SEM ANESTESIA) foram reescritos |
| V2 `final` só em forte | 6/6 com `final` terminam em `hp`, `hk` ou `chk` |
| V3 até 3 fracos seguidos | o maior é DIAGNÓSTICO (3 fracos, assinatura) |
| V4 sem assinatura duplicada (botões **e** final) | ok. Observação: GRANDE MURALHA (`lp›hp›hp`) e NO COLO DA PLATEIA (`lk›hp›hp`), os dois com parede, passam por um botão. A forma foi a que a spec propôs. Na mão do jogador, o que diferencia é soco contra chute na abertura |
| V5 `cruza` só com corpo que passa | 1/1: VOLTA AO MUNDO (rasteira giratória, aprovada na auditoria de capoeira; o aú da travessia é pendência de arte) |
| V6 contragolpe/defesa não fecha | 0 ocorrências: TOUCHÉ fecha no REVERS |

---

## 5. Pendências que não são da Vega

- **Lyra (R-9):** a lista de combos no TREINO e no "Como jogar" ganha a linha do super, no formato `SUPER · <nome>` com as
  teclas SFT + CFT. As medidas do §2 dizem que cabe. Ela precisa medir de novo no navegador com a faixa de teclas real.
- **Íris (R-11):** G5 com os 12 supers. O PESO DA ESTEPE e a VALEU A ESPERA são os casos fora da curva (agarrão e carga).

## 6. Decisões que só o dono pode tomar

1. **Nomes estrangeiros nos supers** (TENRAI-KEN, TAIJI ZHANG, TAEPUNG CHAGI, ESTRELLA FUGAZ, BOTTE SECRÈTE). Seguem a língua
   dos especiais de cada um. A alternativa é tudo em português: PUNHO DO TROVÃO, PALMA DO TAI CHI, TEMPESTADE DE SEUL, ESTRELA
   CADENTE, ESTOCADA SECRETA. Todos medidos abaixo de 380 px. Recomendo manter como está.
2. **Um 2º combo para a CAMILLE** (opcional, não recomendo agora): `SF › CF › SFT` com `parede`, chamado "FIM DE PISTA". Na
   esgrima, quem sai do fim da pista toma o ponto. O `hp1` em *fente* empurra para a frente, o que é coerente com a parede.
   Ficaria como o 3º combo de parede do jogo, e por isso recomendo esperar o dono jogar com 1.
3. **Compasso do CAIO espelhado** (pendência antiga da curadoria da f3/CR2). Não muda o super: o MEIA-LUA DE COMPASSO usa o close
   FILME `f2`, que já foi aprovado.
