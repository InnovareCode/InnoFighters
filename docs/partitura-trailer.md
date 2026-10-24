# Partitura do trailer (fatia R-13)

Apolo, 24/10/2026. Coreografia plano a plano do trailer de abertura, para a Vega compilar em `InputFrame` no R-14
(`src/trailer/partitura.ts`, `Tomada.inputs`) e a Lyra tocar no R-15. Substitui a escalação por semente e CPU
(`docs/spec-redesenho-jogabilidade.md` §3.7; o dono aprovou o trailer por partitura em 24/10, D-R7). Os supers e os combos
citados estão em `docs/supers-e-combos-v2.md`.

**O que não muda:** os 14 planos, a ordem, os 25 compassos, os 2400 ticks a 150 BPM, os lutadores e os cenários de cada plano,
as placas e os cartões (`src/data/trailer/roteiro.ts`). Muda o que acontece dentro de cada plano de luta e a câmera que o
acompanha.

---

## 1. Por que reescrever (o que o dono viu)

O diagnóstico da Íris (`docs/diagnostico-sensacao-2026-10-24.md` §5) mostrou planos com os dois lutadores parados e o P5
segurando mais de 1,5 s num nocaute imóvel. Recortei o `idle0` dos 11 atlas (os 10 e a SARPA), e **as guardas já são
diferentes**: a palma estendida do WEI, a base baixa de bökh do BAATAR, a ginga do CAIO, a luva de savate da
CAMILLE, a palma de anfitrião do ZENON. O que fazia todos parecerem iguais não era a arte. Era a luta achada por sorteio, que
deixava os dois parados à mesma distância, esperando. A partitura resolve isso por desenho:

- **Ninguém fica parado mais de 30 ticks (0,5 s)** e **os dois nunca ficam parados juntos por mais de 12 ticks.** "Parado" =
  `idle` no chão. Andar, golpear, defender, cair e levantar não contam.
- **Nenhum congelamento acima de 0,5 s.** O único congelamento do trailer é a tarja do super (30 ticks, exatamente 0,5 s).
- **Cada plano mostra a identidade de quem é o destaque:** um passo de estilo, o golpe que só ele tem e um combo nomeado.
- **Nenhum plano termina em nocaute imóvel.** O último quadro de todo plano de luta tem alguém em movimento.
- **1 super com filme no trailer inteiro (P9).** Nos outros planos não há tarja que congele.

## 2. Notação (o que a Vega compila)

**Tempo.** Tick do plano de 0 a 191 (2 compassos). 1 tempo = 24 ticks, e o tempo `cX.tY` começa no tick `(X−1)·96 + (Y−1)·24`
do plano (c1.t1 = 0, c1.t3 = 48, c2.t1 = 96, c2.t3 = 144). "Batida" é o tick de **contato** que o CI confere (o evento `hit`,
`block` ou `filme` do golpe certo).

**Direções relativas ao lutador, não à tela:** `→` = frente (para o rival) e `←` = trás. O `FonteEntradas` traduz para
`left`/`right` pelo `facing` **daquele tick**, porque dois planos trocam o lado dos lutadores no meio (P2 e P5).

| Escrita | InputFrame |
|---|---|
| `→[a,b)` / `←[a,b)` / `↓[a,b)` | estado segurado do tick `a` até `b−1` |
| `↓←[a,b)` | `down` e trás segurados juntos (defesa agachada, sem andar) |
| `lp@t`, `hk@t` | borda no tick `t` |
| `↓+lp@t`, `→+sp@t` | direção segurada em `t` (e só em `t`, se não houver intervalo) e a borda no mesmo tick |
| `sp@t` | ESP sem direção (o `sFire` do lutador) |
| `sp~[a,b)` | ESP segurado (`spSeg`), a carga do AMINU. A borda `sp` entra no tick `a` |
| `↑→@t` | `up` e frente segurados de `t` a `t+3` (pulo para frente) |
| `hp+hk@t` | SUPER: as duas bordas no mesmo tick, com a barra cheia |

**Pré-rolagem (PR).** Ticks do motor depois do "LUTE!" e antes do tick 0 do plano, para pôr os dois na distância de abertura.
`Tomada.inicio` = intro + PR. A **distância no tick 0** é conferida pelo CI (±15 px), e a PR existe para isso.

**Os tempos são intenção afinada à mão, não medida.** Calculei os contatos com a preparação (`S`) de cada golpe dos dados e a
velocidade de andar (`WALK_SPEED 3,6 × spd`; para trás, × 0,8), sem rodar o motor. Cada acerto soma de 4 a 8 ticks de hitstop
às chamadas de `update`. No R-14 a Vega roda, lê o tick real de cada batida e ajusta as entradas (spec K6: "o CI aponta a
batida; o reajuste é manual e de minutos"). **Tolerância na 1ª compilação: ±6 ticks por batida.** Depois do ajuste, o tick
fica exato.

**Câmera.** Quadros-chave no formato do `roteiro.ts` (`t`, `zoom`, `foco`, `curva`). Ficam valendo as regras medidas antes: o
pico mora no acerto (nunca depois), o ZENON tem teto de zoom 1,10, e AMINU, BAATAR e ZENON não seguram zoom alto depois do
acerto (a cabeça entra na faixa de 69 px).

**Tarja do especial comum no trailer: desligada.** Com `ritmo.tarja` a faixa não congela, mas ocupa a faixa de cima por 40
ticks, o mesmo lugar da placa do lutador e dos cartões. Num plano de 3,2 s com placa, seriam dois textos brigando. O trailer
mostra só a tarja do super (§P9). O resto ensina pelo golpe, não pelo letreiro. Isso fica na Lyra, no R-15.

---

## 3. Os planos sem motor (nada a compilar)

| Plano | Compassos | O que é | Mudança |
|---|---|---|---|
| P0 | 2 | frio: HAYATO sozinho, câmera 1,0 → 1,12, cartão DEZ MESTRES | nenhuma |
| C1 | 1 | cartão DEZ NAÇÕES, fundo `kr` | nenhuma |
| C2 | 1 | cartão UM TORNEIO, fundo `cn` | nenhuma |
| C3 | 1 | cartão CINCO GUARDIÕES, fundo preto | nenhuma |
| P8 | 2 | 8 retratos, 1 por tempo, cartão QUEM CHEGA AO TOPO | nenhuma |
| P10 | 2 | logo | nenhuma |

---

## 4. Os planos de luta

### P1 · HAYATO × WEI LONG · cenário `cn` · destaque dos dois

**Ideia:** o pulo por cima da bola, o golpe clássico que todo jogador de luta reconhece no primeiro segundo. O WEI solta a
palma do dragão, enorme e lenta. O HAYATO passa por cima e entra com o BÁSICO dele, RAIO ÀS AVESSAS, fechando no soco que
sobe em câmera lenta.

**Identidade:** WEI = avanço lento de tai chi e a LONG ZHANG (palma enorme). HAYATO = salto por cima do projétil e o BÁSICO
`↓SF › CFT › ↓ESP`.

PR: HAYATO `→` 12 ticks, WEI `→` 12 ticks. **Distância no tick 0 ≈ 340.** Energia [0, 0].

| tick | tempo | P1 HAYATO | P2 WEI LONG | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `←[0,8)` `→[8,18)` (pé de luta) | `→[0,20)` (avanço lento) | os dois andando, em ritmos diferentes |
| 24 | c1.t2 | parado `[18,34)` (16 ticks; o WEI está em golpe) | `sp@24` LONG ZHANG | a palma sai; a bola nasce por volta do 44 |
| 34 | | `↑→@34` | (no golpe até ~69) | distância ao pular ≈ 290 |
| 62 | | `hk@62` (chute no ar) | | |
| 72 | c1.t4 | | | **B1** chute no ar acerta (alvo 72) |
| 78 | | `↓+lp@78` (depois de pousar) | | |
| 85 | | `hk@85` (cancela) | | |
| 96 | c2.t1 | | | **B2** CFT acerta, segura em pé (alvo 96) |
| 98 | | `↓+sp@98` RAIJIN-KEN | | |
| 104 | | | | **B3** RAIJIN-KEN acerta (alvo 104), `lenta {fator 3, ticks 18}` |
| 122-150 | c2.t2 | sobe, cai, recupera | derrubado, quica | queda em câmera lenta e depois normal |
| 150 | | `←[150,172)` (retoma o espaço) | levantando | |
| 172 | c2.t4 | `→[178,188)` | `→[172,192)` assim que puder agir | o WEI volta andando na guarda de palma |

Câmera (o pico no RAIJIN-KEN): `[0,1,meio] [60,1,meio,saida] [104,1.25,meio] [122,1.25,meio,saida] [191,1.04,meio]`.

Conferência: maior tempo parado = HAYATO 16 ticks (18-34), com o WEI em golpe. Nada congela.

### P2 · MIN-JI × CAIO · cenário `br` · destaque dos dois

**Ideia:** pergunta e resposta. No 1º compasso a MIN-JI conta HANA-DUL-SET e lança o CAIO. No corte do c2.t1 o CAIO responde
na ginga, esquiva a voadora e devolve VOLTA AO MUNDO, trocando de lado com ela. **Regra do dono: o CAIO nunca para em guarda
de boxe.** Toda espera dele é ginga (andar alternado) ou a esquiva lateral, que é a pose de `block` dele.

**Identidade:** MIN-JI = passo saltitado de taekwondo (frente-trás curtos) e a contagem de três chutes. CAIO = ginga constante,
esquiva e rasteira que cruza.

PR: MIN-JI `→` 30 ticks, CAIO `→` 24 ticks. **Distância no tick 0 ≈ 200.** Energia [0, 0].

| tick | tempo | P1 MIN-JI | P2 CAIO | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `→[0,6)` `←[6,10)` `→[10,16)` `←[16,20)` `→[20,28)` `←[28,32)` `→[32,40)` | ginga: `←[0,10)` `→[10,20)` `←[20,30)` `→[30,40)` | dois ritmos: o saltito curto contra a ginga larga |
| 43 | | `lk@43` | parado `[40,48)` (8 ticks) | |
| 48 | c1.t3 | `lk@50` | | **B1** 1º chute fraco, "hana" (alvo 48) |
| 57 | | `hk@58` | | "dul" (≈ 56) |
| 66 | | | | **B2** CFT lança, "set" (alvo 66), `lenta {fator 2, ticks 12}` |
| 86 | | `←[86,96)` (sai saltitando) | no ar, cai | |
| 96 | c2.t1 | | levanta e entra na ginga: `←[100,108)` `→[108,116)` | **corte** para o CAIO |
| 112 | | `→+sp@112` TWIO YEOP CHAGI | `←[110,126)` esquiva lateral (block) | **B3** voadora esquivada (`block`, alvo 120) |
| 131 | | pousa (lag 10) | `↓+lk@131` | |
| 140 | | | `↓+lk@140` | |
| 149 | | | `↓+hk@149` | |
| 156 | | | | **B4** rasteira acerta e cruza (alvo 156) |
| 170 | c2.t4 | derrubada, levantando | ginga do outro lado: `→[170,178)` `←[178,186)` `→[186,192)` | o plano termina na ginga |

Câmera (corte seco no c2.t1, como hoje): `[0,1.04,p1] [30,1.04,p1,saida] [66,1.22,p1] [95,1.22,p1] [96,1,p2,saida]
[156,1.18,p2] [170,1.18,p2,saida] [191,1.02,p2]`. O foco `p2` segue o CAIO depois de cruzar (é o lado 2, não a posição).

Risco: a VOLTA AO MUNDO depende de a MIN-JI ainda estar no lag da voadora no tick ~138. Se escorregar, a reserva é ela
apertar `lp@128` no vazio (erra por distância) para o CAIO punir. A batida B4 não muda.

### P3 · AMINU × HAYATO · cenário `ng` · destaque AMINU (placa)

**Ideia:** a paciência. O AMINU carrega a lança andando devagar, como o showman que provoca. O HAYATO recua nervoso, tenta
um soco no vazio e se fecha. No c2.t1 a MASHI cheia quebra a guarda, e o RUGIDO DE KANO leva o HAYATO para o canto.

**Identidade:** AMINU = a carga visível (`spSeg`, anda a 0,35), a quebra de guarda e o BÁSICO `SF › CFT › →ESP`.

PR: AMINU `→` 35 ticks, HAYATO `→` 32 ticks. **Distância no tick 0 ≈ 180.** Energia [0, 0].

| tick | tempo | P1 AMINU | P2 HAYATO | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `→[0,6)` | `←[0,14)` (recua) | |
| 6 | | `sp~[6,78)` e `→[6,78)` (carrega andando) | `→[20,34)` | o punho enrolado puxado para trás, avançando devagar |
| 36 | c1.t2 | | `lp@36` (no vazio, curto) | o HAYATO testa a distância |
| 44 | | | `←[44,56)` | |
| 62 | c1.t3 | | `↓←[62,100)` (defesa agachada, sem andar) | |
| 78 | | solta o ESP (nível 3) | | distância ao soltar ≈ 115 |
| 96 | c2.t1 | | | **B1** MASHI nível 3 quebra a guarda (`carga`, nível 3, alvo 96), `lenta {fator 2, ticks 12}` |
| 121 | c2.t2 | `lp@121` | atordoado (quebra de guarda, 40) | **B2** SF acerta (alvo 124) |
| 126 | | `hk@126` | | CFT segura em pé (≈ 136) |
| 138 | | `→+sp@138` PASSO DO LEÃO | | |
| 146 | c2.t3 | | empurrado para o canto | **B3** PASSO DO LEÃO acerta (alvo 146) |
| 170 | c2.t4 | `→[172,192)` (pressiona) | `↓←[172,192)` no canto | os dois em ação até o fim |

Câmera: `empurrar(1.2, 96)` (a função de hoje, com o pico no acerto da MASHI).

### P4 · CENTELLA × CAIO · cenário `mx` · destaque CENTELLA (placa)

**Ideia:** a arena é dela. O CAIO joga a ONDA VERDE, que vai e volta. A CENTELLA defende recuando até a corda, quica e volta
no RESORTE, a voadora que só a lucha tem. O CAIO cai, e ela desfila para a corda enquanto ele volta para a ginga.

**Identidade:** CENTELLA = desfile para o público (anda de costas para a corda), RESORTE. CAIO (coadjuvante) = ONDA VERDE
bumerangue e ginga.

PR: nenhuma. **Distância no tick 0 = 420** (posições de largada; a CENTELLA tem ~210 px de corda atrás, e o RESORTE precisa de
200). Energia [0, 0].

| tick | tempo | P1 CENTELLA | P2 CAIO | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `←[0,10)` `→[10,20)` (desfile) | ginga `→[0,6)` `←[6,12)` | |
| 12 | | | `sp@12` ONDA VERDE | |
| 24 | c1.t2 | `→[20,30)` | (no golpe até ~44) | a onda verde atravessa a tela |
| 38 | | `←[38,60)` (defende recuando) | ginga `←[44,54)` `→[54,64)` | |
| 50 | c1.t3 | | | **B1** ONDA VERDE bloqueada (`block`, alvo 50) |
| 64 | | `→+sp@64` RESORTE | ginga `←[64,74)` `→[74,84)` `←[84,94)` | ela corre para a corda de trás |
| 96 | c2.t1 | quica na corda (≈ 96) | `→[94,104)` | o rebote cai no tempo forte |
| 120 | c2.t2 | | | **B2** RESORTE acerta (alvo 120) |
| 152 | | `←[152,170)` (volta a desfilar) | derrubado, levanta | |
| 170 | c2.t4 | `→[176,186)` | ginga `→[170,178)` `←[178,192)` | |

Câmera (foco nela o plano inteiro, como hoje): `[0,1,p1,saida] [72,1.1,p1] [120,1.2,p1] [150,1.2,p1,saida] [191,1.04,p1]`.

### P5 · CAMILLE × MIN-JI · cenário `fr` · destaque CAMILLE (placa)

**Ideia:** a riposte, que é o título dela. Esgrima de pernas (*marcher*/*rompre*, avança e recua curto). A MIN-JI ataca e a
CAMILLE apara e responde (PARADE → FOUETTÉ). A MIN-JI volta com pressa e leva o COUP D'ARRÊT na preparação. A CAMILLE fecha com
TOUCHÉ, que agora termina no REVERS, pelas costas. **Sem nocaute:** a MIN-JI termina cambaleando, e o dano total é ~50 de 97.

**Identidade:** CAMILLE = jogo de pernas de esgrima, PARADE, COUP D'ARRÊT e o BÁSICO `↓CF › CFT › →ESP`. MIN-JI = saltito.

PR: CAMILLE `→` 26 ticks, MIN-JI `→` 24 ticks. **Distância no tick 0 ≈ 220.** Energia [0, 0].

| tick | tempo | P1 CAMILLE | P2 MIN-JI | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `→[0,6)` `←[6,12)` `→[12,18)` `←[18,24)` `→[24,32)` | `→[0,6)` `←[6,10)` `→[10,18)` `←[18,22)` `→[22,30)` | duas danças de pernas diferentes |
| 38 | | | `hk@38` | |
| 40 | | `sp@40` PARADE | | |
| 45 | | apara | | o CFT dela é anulado |
| 52 | c1.t3 | FOUETTÉ (automático) | derrubada | **B1** FOUETTÉ acerta (`sResp`, alvo 52) |
| 80 | | `←[80,90)` `→[90,96)` | no chão, levantando | a câmera enquadra o passo dela, não o chão |
| 96 | c2.t1 | | `→[100,108)` (volta saltitando) | |
| 113 | | `↓+sp@113` COUP D'ARRÊT | `hp@114` | |
| 120 | c2.t2 | | | **B2** contragolpe na preparação (`contra`, `sDown`, alvo 120), `lenta {fator 2, ticks 16}` |
| 140 | | `↓+lk@140` | atordoada (20 + 12) | |
| 149 | | `hk@149` | | CFT segura em pé (≈ 159) |
| 161 | | `→+sp@161` REVERS | | ela passa pelo rival |
| 168 | c2.t4 | | | **B3** REVERS acerta pelas costas (alvo 170) |
| 172-191 | | recupera do outro lado | cambaleia (sem queda) | os dois em movimento no último quadro |

Câmera: `[0,1,meio] [90,1,meio,saida] [124,1.2,meio] [140,1.2,meio,saida] [170,1.1,meio] [191,1.04,meio]`.

Conferência: a MIN-JI fica no chão de 52 a ~95. Se ela ficar **imóvel** mais de 30 ticks (é o caso que o dono viu), a Vega
mede e me devolve. A reserva é trocar a PARADE por um `block` em pé, e o FOUETTÉ sai do plano.

### P6 · NILA × WEI LONG · cenário `in` · destaque NILA (placa)

**Ideia:** as duas faces da NILA num plano. Na GAJA, pesada, ela segura o tremor do WEI agachada e passa por cima com SEM
ANESTESIA. No c2 ela troca de postura (VADIVU) e a SARPA entra rasteira com o BOTE.

**Identidade:** NILA = a troca de postura visível no meio do plano, os dois jeitos de andar (GAJA lenta, SARPA rápida), o
BÁSICO da GAJA e o BOTE. WEI = ZHEN DI (pisão que manda o tremor rente ao chão) e o avanço de tai chi.

PR: NILA `→` 30 ticks, WEI `→` 37 ticks. **Distância no tick 0 ≈ 200.** Energia [0, 0].

| tick | tempo | P1 NILA | P2 WEI LONG | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `→[0,12)` (passo pesado) | `↓+sp@4` ZHEN DI | o tremor corre rente ao chão |
| 16 | | `↓←[16,40)` (defesa baixa) | (no golpe até ~47) | |
| 34 | | | | **B1** tremor defendido agachada (`block`, alvo 34) |
| 48 | c1.t3 | `→[44,62)` | `→[48,62)` (avanço lento) | |
| 63 | | `↓+lp@63` | | |
| 70 | | `hp@70` | | **B2** SFT acerta (alvo 79) |
| 82 | | `→+sp@82` PASSO DO ELEFANTE | | |
| 96 | c2.t1 | | empurrado longe | **B3** PASSO DO ELEFANTE acerta (alvo 94) |
| 128 | | `↓+sp@128` VADIVU (vira SARPA) | `→[122,160)` (volta andando) | a troca de postura no tempo 2 do c2 |
| 146 | | `sp@146` BOTE | | a serpente desliza rente |
| 168 | c2.t4 | | derrubado | **B4** BOTE acerta (alvo 164) |
| 170-191 | | SARPA recupera e anda `→[184,192)` | caindo e levantando | |

Câmera: `[0,1,meio] [60,1,meio,saida] [94,1.15,meio] [112,1.15,meio,saida] [140,1,meio] [164,1.12,meio] [191,1.04,meio]`.

### P7 · BAATAR × HAYATO · cenário `mn` · destaque BAATAR (placa)

**Ideia:** o agarrador. O BAATAR vem pesado, o soco forte com armadura atravessa o chute do HAYATO, e o ARREMESSO DO AVARGA bate
o HAYATO no chão no tempo forte do c2. O HAYATO levanta, recua e atira. O BAATAR salta por cima no MERGULHO DA ÁGUIA.

**Identidade:** BAATAR = andar pesado em base baixa, armadura, agarrão de comando e o salto da águia.

PR: BAATAR `→` 30 ticks, HAYATO `→` 23 ticks. **Distância no tick 0 ≈ 240.** Energia [0, 0].

| tick | tempo | P1 BAATAR | P2 HAYATO | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `→[0,36)` (andar pesado) | `←[0,6)` `→[8,30)` | |
| 38 | | `hp@38` (armadura) | `lk@40` | o chute do HAYATO bate na armadura |
| 48 | c1.t3 | | | **B1** SFT com armadura acerta (alvo 48) |
| 66 | | `sp@66` ARREMESSO DO AVARGA | `←[74,80)` (recupera e recua) | |
| 80 | | agarra | | **B2** agarrão (alvo 80) |
| 96 | c2.t1 | | batido no chão | o tombo cai no tempo forte |
| 120 | c2.t2 | `→[120,128)` | levanta, `←[118,124)` | |
| 126 | | | `sp@126` RAIJIN-DAN | |
| 128 | | `→+sp@128` MERGULHO DA ÁGUIA | | ele salta por cima da bola |
| 168 | c2.t4 | | | **B3** MERGULHO acerta de cima (alvo 168) |
| 170-191 | | pousa (lag 26) | derrubado | |

Câmera (sem zoom durante o salto; o ápice passa da faixa mesmo a 1,0, como já foi medido e aceito): `[0,1,meio]
[50,1,meio,saida] [84,1.15,meio] [100,1.15,meio,saida] [130,1,meio] [191,1,meio]`.

Risco: o HAYATO precisa estar de pé no tick 118. Se o tombo durar mais, a RAIJIN-DAN sai, ele só recua `←[124,168)`, e a B3
continua igual.

### P9 · HAYATO × ZENON · cenário `gr` (luta de chefe) · destaque ZENON · **o único super do trailer**

**Ideia:** quem chega ao topo encontra o Arconte. O HAYATO entra com o BÁSICO dele, o mesmo do P1, e desta vez **tudo é
defendido**. O ZENON não se mexe. O RAIJIN-KEN sobe no vazio e, quando o HAYATO pousa, o anfitrião cobra a conta: A CONTA,
CONVIDADO fechando no super CORTESIA DA CASA. Tarja completa, filme, e o corte para a logo. É o desafio do trailer: o mesmo
combo que funcionou no P1 aqui não basta.

**Identidade:** ZENON = a calma de anfitrião (fica parado de propósito, anda devagar até a mesa), a defesa que não cede, o
BÁSICO e o super. Ele é o único que pode ficar parado, e só por 14 ticks, com o HAYATO em movimento.

PR: HAYATO `→` 40 ticks, ZENON `→` 40 ticks (depois da entrada CURTA do chefão). **Distância no tick 0 ≈ 145.**
**Energia [0, 100]** (contrato novo, §5).

| tick | tempo | P1 HAYATO | P2 ZENON | batida / o que se vê |
|---|---|---|---|---|
| 0 | c1.t1 | `→[0,10)` | parado `[0,14)` (a calma do anfitrião) | |
| 14 | | | `←[14,48)` (defende em pé) | |
| 18 | | `↓+lp@18` | | |
| 24 | c1.t2 | `hk@26` (cancela no bloqueio) | | **B1** SF defendido (`block`, alvo 24) |
| 36 | | | | **B2** CFT defendido (`block`, alvo 36) |
| 38 | | `↓+sp@38` RAIJIN-KEN | | |
| 43 | | sobe | | **B3** RAIJIN-KEN defendido (`block`, alvo 43) |
| 50 | c1.t3 | no ar (≈ 34 ticks) | `→[50,74)` (anda até onde ele vai cair) | |
| 77 | c1.t4 | pousa; lag 22 | | |
| 80 | | | `↓+lp@80` | |
| 84 | | | | **B4** SF acerta no pouso (alvo 84) |
| 87 | | | `hk@87` | |
| 96 | c2.t1 | | | **B5** CFT segura em pé (alvo 96) |
| 99 | | | `hp+hk@99` **SUPER** | tarja COMPLETA, **congela 30** (99-128) |
| 144 | c2.t3 | | | **B6** CORTESIA DA CASA acerta (`super`, alvo 145), **filme CURTO** (30) |
| 175 | | deitado a 150 px (estado final do filme) | `→[178,192)` (anda devagar até ele) | o anfitrião se aproxima; corte para a logo |

Câmera (teto 1,10; durante o filme vale a câmera do roteiro do filme): `[0,1,p2,saida] [96,1.06,p2] [144,1.1,p2,saida]
[191,1.1,p2]`.

Por que CURTO e não COMPLETO: o filme COMPLETO de projétil dura 62 ticks. A partir do 145 ele terminaria no 207, 16 ticks
depois do fim do plano, e a logo cortaria a queda. O CURTO (30) acaba no 175 e deixa 16 ticks de jogo de volta antes da logo.

---

## 5. O que a partitura pede de contrato (Vega, R-14)

1. **`Tomada.energia?: [number, number]`** (aditivo): a barra de cada lado no tick 0 do plano. Só o P9 usa ([0, 100]). Sem isso,
   o super não sai, porque a barra começa em 0 e sobe 0,04 por tick.
2. **`BatidaPedida.tipo` ganha `block` e `super`** (o CI confere `block` e o `filme` com `motivo: 'super'`). `contra`, `carga` e
   `especial` seguem como hoje. A B1 do P5 é `especial` com `golpe: 'sResp'`.
3. **`BatidaPedida.filme?: 'curta' | 'completa'`** só no super do P9: o trailer pede o modo e não segue a regra do jogo (1ª vez
   = COMPLETO), pelo motivo do §P9. O campo `cine` (tarja que congela no especial comum) sai de uso no trailer.
4. **Direção relativa no `FonteEntradas`:** a partitura guarda frente/trás, e a fonte resolve `left`/`right` pelo `facing` do
   lutador naquele tick. Isso é determinístico, porque o estado é o do próprio `Game`.
5. **Dependência do R-7/R-8:** o P9 precisa do super e do BÁSICO fechando em super (`docs/supers-e-combos-v2.md` §3.2, item 1).
   O P5 precisa do TOUCHÉ reescrito (fecho no REVERS) e o P2 do HANA-DUL-SET (`lk › lk › hk`). Os outros planos só usam golpes
   que existem hoje.
6. **`ritmo` do trailer:** a partitura supõe o `ritmo` final (tarja comum sem congelar e desligada no trailer, super com tarja
   de 30, filme só no super). Até lá vale o `ritmo: undefined` do `partida.ts` (spec §3.7).

## 6. Conferência por plano (o que o CI e a Íris medem)

| Plano | Identidade mostrada | Combo nomeado | Maior parada de um lutador | Os dois parados juntos | Congela | Último quadro |
|---|---|---|---|---|---|---|
| P1 | salto sobre a bola; palma do WEI | RAIO ÀS AVESSAS | 16 ticks (HAYATO, com o WEI em golpe) | 0 | 0 | WEI andando |
| P2 | saltito; ginga e esquiva | HANA-DUL-SET, VOLTA AO MUNDO | 8 ticks (CAIO) | 0 | 0 | CAIO na ginga |
| P3 | carga andando; quebra de guarda | RUGIDO DE KANO | 0 | 0 | 0 | AMINU pressionando |
| P4 | desfile; RESORTE; onda bumerangue | – (golpe de assinatura: RESORTE) | 0 | 0 | 0 | CAIO na ginga |
| P5 | pernas de esgrima; PARADE; COUP D'ARRÊT | TOUCHÉ | 0 | 0 | 0 | MIN-JI cambaleando |
| P6 | troca GAJA → SARPA; tremor | SEM ANESTESIA | 0 | 0 | 0 | SARPA andando |
| P7 | armadura; agarrão; águia | – (agarrão e MERGULHO) | 0 | 0 | 0 | BAATAR pousando |
| P9 | calma do anfitrião; defesa | RAIO ÀS AVESSAS (defendido), A CONTA, CONVIDADO + super | 14 ticks (ZENON, com o HAYATO andando) | 0 | 30 (tarja do super) | ZENON andando |

O trailer ensina 7 dos 17 combos pelo nome e o super. Os três supers que o jogador mais vai ver no começo (TENRAI-KEN,
TAEPUNG CHAGI, MEIA-LUA DE COMPASSO) ficam para os GIFs de divulgação, não para a abertura: 1 super por trailer é a regra.

## 7. Decisões que só o dono pode tomar

1. **Quem dá o super do trailer.** Recomendo o **ZENON no P9**: é o clímax antes da logo, e terminar na força do chefão vira
   o convite ("chegue até ele"). A alternativa é o **HAYATO no P1**, um gancho nos primeiros 6 s com o TENRAI-KEN. Ela custa o
   clímax e põe 2,5 s de tarja e filme num plano de 3,2 s.
2. **Filme CURTO no trailer** (recomendado; §P9). O COMPLETO seria cortado pela logo.
3. **A tarja do especial comum desligada no trailer** (recomendado; §2). Se o dono quiser os nomes dos especiais no trailer, a
   faixa disputa espaço com as placas do P3 ao P7, e precisa de medição da Lyra.
