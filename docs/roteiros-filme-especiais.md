# Roteiros do filme dos especiais (fatia V2-3b)

Autor: Apolo (direção de arte) · 2026-10-23 · base: `docs/spec-revisao-motor-luta-v2.md` §3.6 e §9,
`docs/plano-arte-lacunas-2026-10-23.md` §1 e a decisão do dono de 23/10: filme nos especiais **só quando conecta**, em 3
camadas (rajada de 3 quadros do atlas + close do impacto numa folha FILME nova por lutador + reação do rival), com **piloto
no HAYATO** antes das outras 9 folhas.

Nada foi gerado. Quem pede à Runway é o Atlas. Nenhum código mudou: este documento é a entrada da Lyra (V2-3d, V2-2) e do
Cronos (campo `final` de `src/data/filmes.ts`).

Grau de prova:
- **[medido]**: rodei script ou olhei o quadro do atlas;
- **[lido]**: tirei do código ou de outro documento;
- **[proposta]**: decisão minha.

---

## 0. Resumo

| Item | Entrega |
|---|---|
| Roteiros | 4 modelos por tipo (§2) + tabela dos **31** especiais que conectam, cada um declarando o modelo e os quadros que preenchem os encaixes (§4). Mais as 2 variantes do chefão ZENON (SELO MAIOR, DECRETO). Os 2 VADIVU ficam sem filme (D-V1) |
| Laudo A x B | A (só atlas) roda hoje nos 31, 0 crédito e 0 MB. B (folha FILME) custa 6 créditos por lutador e **10 MiB por página decodificada, 20 MiB por luta** (§6). Correção de uma conta minha do plano |
| Prompts | Folha FILME pronta para colar, dos 10 lutadores, piloto primeiro (§7) |
| Mola | Peso por lutador e amplitudes por arquétipo para a Lyra (§8) |
| Contrato | O formato do §3.6 serve. Peço **4 adições pequenas e aditivas** (§1.2) |

---

## 1. Contrato

### 1.1 O que uso do §3.6 sem mudar [lido]

`BatidaFilme { t, atacante, atacanteAlt?, rival, rivalAlt?, peso, camera?, som?, retrato? }` e
`RoteiroFilme { duracao, curta, estilo?, batidas }`.

As poses da arte nova se chamam `f0` a `f5`, numa página FILME por lutador. Nenhum atlas de hoje tem pose com esse nome
[medido nos 10 `atlas.json`], então não há colisão.

### 1.2 Adições que peço à Lyra [proposta]

1. **`tc?: number` na batida:** o tick dessa batida na versão CURTA. Sem `tc`, a batida não toca na CURTA. O `peso` das
   batidas cortadas soma na primeira batida que toca. Motivo: só a `curta` (uma duração) não diz quais batidas sobram.
2. **Pose `'$motor'`:** quer dizer "a pose que a leitura do motor dá para esse lutador no estado final". Uso só na última
   batida. Garante que o último quadro do filme é igual ao primeiro quadro da luta que volta, incluindo o atacante de
   projétil, que o motor não toca (§3.3 da spec).
3. **Pose de página FILME é painel, não sprite de mundo.** O JSON da página FILME leva `painel: true`. Quando `f0..f5`
   resolve nessa página, a Lyra desenha um painel (regras no §1.3). Quando cai no `Alt`, desenha a pose `Alt` no mundo, com o
   zoom da batida. O roteiro não muda entre A e B.
4. **`peso: 0` é válido:** batida sem número de dano (grito, disparo, queda). O contador de acertos conta só batidas com
   `peso > 0`.

### 1.3 Regras de desenho que valem para todos [proposta]

- **Painel do close:**
  - altura de 62% da tela lógica, encostado na tarja de baixo do letterbox, do lado de quem está no close;
  - borda interna em diagonal de 12°, com fio de 3 px na cor `brilho` da paleta do especial
    (`src/render/identidade-especiais.ts`);
  - fundo do painel na cor `sombra` da mesma paleta, a 85%, com linhas de velocidade;
  - entra deslizando em 4 ticks e sai em 3.
  - O recorte reto (cintura ou joelho) encosta na borda de baixo do painel. Close de corpo inteiro (`full`) fica centrado.
- **Espelhamento:** toda célula da folha olha para a DIREITA. O painel espelha pelo `facing` do lutador. As células de
  reação (`f4`, `f5`) foram pedidas com a cabeça indo para a ESQUERDA: espelhadas, a cabeça sempre vai para longe do atacante.
- **Retrato:** `retrato: true` mostra o `retrato.png` como hoje na tarja. Se a mesma batida já tem painel de close do
  atacante, o retrato não aparece.
- **Teto de zoom por lutador em foco**, aplicado como `min(zoom da batida, teto)`:
  - 1,30 para todos;
  - BAATAR 1,25 (na escala dele, a cabeça encosta no letterbox);
  - ZENON 1,10 (regra do trailer);
  - WEI LONG 1,20 enquanto o atlas dele for o antigo (risco A6).
  - O CAIO já tem atlas novo na árvore de trabalho (`atlas-0/1.webp`, ainda não commitado) e passa a 1,30 quando isso entrar.
  - Painéis não usam zoom do mundo.
- **Trajetória**, entre `antes` e `depois` do evento `filme`:
  - até a batida do impacto, os dois ficam em `antes`;
  - do impacto à última batida, o atacante vai em linha reta até `depois`; o aéreo pousa (`y = GROUND`) na batida da queda;
  - o rival recua 12 px na batida da reação e faz um arco até `depois`, com o pico na batida do lançamento:
    - `derruba`: pico de 70 px;
    - `lanca`: pico de 150 px;
    - `parede`: sem arco; desliza até `depois` e quica 20 px na parede;
  - nos especiais que **cruzam** (REVERS, DECRETO), o `facing` de `depois` vale a partir da batida do lançamento.
- **Estilo:** `estilo` do roteiro = o E1-E12 do especial em `identidade-especiais.ts`. A assinatura do estilo toca no ponto
  de acerto de toda batida com `peso > 0`. O tremor de tela vai só nas batidas com `som: 'final'`.
- **Projétil:** na batida do choque, a Lyra desenha o projétil do golpe (estilo `orb`, `blade`, `wave`, `boomerang`, `anel`)
  parado no ponto de acerto e o dissolve até a batida da reação. A BULKKOT mostra 2 lâminas, uma em cada batida de choque. A
  ONDA VERDE passa 2 vezes (ida e volta).
- **MASHI:** o mesmo roteiro nos 3 níveis. O `nivelCarga` do evento só aumenta o tremor: ×1,0 / ×1,25 / ×1,5.

---

## 2. Os 4 modelos por tipo [proposta]

Os encaixes em MAIÚSCULAS são preenchidos por especial no §4:
- **GRITO**: `f3` com `atacanteAlt` = PREP. Na NILA, a pose é PREP (a `f3` dela é o SALTO). No ZENON é `cena1`, a pose de
  braços abertos que já existe no atlas dele;
- **R1, R2 e R3**: a rajada do lutador (§3);
- **fK**: o close do especial (§3.2).

Todos terminam com o rival em `koFloor`, que é a pose que o motor dá ao caído em `lie` [lido em `fighter.ts:1054-1060`].

### 2.1 `chao` (corpo a corpo no chão): duração 66, curta 30

| # | t | tc | atacante | atacanteAlt | rival | rivalAlt | peso | câmera (zoom, foco) | som | retrato |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | – | GRITO | PREP | hitH | – | 0 | 1,30 atacante | – | sim |
| 1 | 8 | – | R1 | – | hitH | – | 0,12 | 1,20 meio | leve | |
| 2 | 14 | – | R2 | – | hitB | – | 0,12 | 1,20 meio | leve | |
| 3 | 20 | – | R3 | – | hitH | – | 0,16 | 1,25 meio | pesado | |
| 4 | 28 | 0 | fK | IMPACTO | hitB | – | 0,35 (CURTA: 0,75) | 1,30 atacante | pesado | |
| 5 | 38 | 10 | IMP2 | – | f4 | hitH | 0,25 | 1,30 rival | final | |
| 6 | 48 | 18 | IMP2 | – | f5 | kdAir | 0 | 1,15 rival | – | |
| 7 | 58 | 24 | `$motor` | – | koFloor | – | 0 | 1,00 meio | – | |

IMP2, quando o especial não declara, é igual a IMPACTO.

### 2.2 `aereo` (sobe ou salta): duração 66, curta 30

Igual ao `chao`, com três trocas:
- a batida 3 vira SUBIDA, com o rival em `hitH`;
- a batida 4 é o IMPACTO no ar;
- nas batidas 5 e 6, o atacante é IMPACTO e depois QUEDA (pousa na 6).

A rajada usa só R1 e R2.

| # | t | tc | atacante | atacanteAlt | rival | rivalAlt | peso | câmera | som |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | – | GRITO | PREP | hitH | – | 0 | 1,30 atacante | – |
| 1 | 8 | – | R1 | – | hitH | – | 0,12 | 1,20 meio | leve |
| 2 | 14 | – | R2 | – | hitB | – | 0,12 | 1,20 meio | leve |
| 3 | 20 | – | SUBIDA | – | hitH | – | 0,16 | 1,25 meio | pesado |
| 4 | 28 | 0 | fK | IMPACTO | hitB | – | 0,35 (CURTA: 0,75) | 1,30 atacante | pesado |
| 5 | 38 | 10 | IMPACTO | – | f4 | hitH | 0,25 | 1,30 rival | final |
| 6 | 48 | 18 | QUEDA | – | f5 | kdAir | 0 | 1,15 rival | – |
| 7 | 58 | 24 | `$motor` | – | koFloor | – | 0 | 1,00 meio | – |

### 2.3 `projetil`: duração 62, curta 30

Aqui a rajada são os 3 quadros do próprio disparo, porque o atacante pode estar a 600 px do rival e um soco ali não teria
sentido. Os golpes que valem dano são o projétil moendo o rival.

| # | t | tc | atacante | atacanteAlt | rival | rivalAlt | peso | câmera | som | retrato |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | – | GRITO | R1 | hitH | – | 0 | 1,25 atacante | – | sim |
| 1 | 6 | – | R2 | – | hitH | – | 0 | 1,25 atacante | leve | |
| 2 | 12 | 0 | fK | R3 | hitH | – | 0 | 1,30 atacante | pesado | |
| 3 | 22 | 6 | R3 | – | hitH | – | 0,30 | 1,30 rival | pesado | |
| 4 | 28 | 11 | R3 | – | hitB | – | 0,20 | 1,30 rival | leve | |
| 5 | 34 | 16 | R3 | – | f4 | hitH | 0,50 | 1,30 rival | final | |
| 6 | 44 | 21 | `$motor` | – | f5 | kdAir | 0 | 1,15 rival | – | |
| 7 | 54 | 26 | `$motor` | – | koFloor | – | 0 | 1,00 meio | – | |

### 2.4 `agarrao`: duração 58, curta 30

| # | t | tc | atacante | atacanteAlt | rival | rivalAlt | peso | câmera | som | retrato |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | – | GRITO | PREP | hitH | – | 0 | 1,30 atacante | – | sim |
| 1 | 8 | 0 | PEGA | – | hitB | – | 0,15 (CURTA: 0,15) | 1,25 meio | pesado | |
| 2 | 16 | 6 | fK | GIRO | kdAir | – | 0,25 | 1,30 atacante | pesado | |
| 3 | 28 | 13 | SLAM | – | koFloor | – | 0,60 | 1,20 meio | final | |
| 4 | 38 | 19 | SLAM | – | f4 | koFloor | 0 | 1,15 rival | – | |
| 5 | 48 | 25 | `$motor` | – | koFloor | – | 0 | 1,00 meio | – | |

O atlas desenha o agarrão **sem** o rival (B7). Quem põe o rival no lugar é a Lyra, com os desvios por especial do §4.

---

## 3. Rajadas e células da folha FILME

### 3.1 Rajada por lutador (R1 → R2 → R3, corpo a corpo e aéreo) [medido nas folhas de contato]

| Lutador | R1 | R2 | R3 | Por quê |
|---|---|---|---|---|
| HAYATO | `lp1` | `hp1` | `hk1` | caratê clássico: jab, direto, chute alto |
| WEI LONG | `hp1` | `lk1` | `hk1` | palma longa primeiro |
| MIN-JI | `lk1` | `hp1` | `hk1` | taekwondo: dois de três são chutes |
| CAIO | `lk1` | `hk1` | `sweep` | a ginga vai ao chão |
| AMINU | `lp1` | `lk1` | `upper` | o `hp1` é o quadro da MASHI e não pode se repetir na rajada |
| CENTELLA | `lp1` | `lk1` | `hk1` | |
| CAMILLE | `lp1` | `lk1` | `hp1` | savate: luva e sapato alternando |
| NILA (GAJA) | `lk1` | `hp1` | `hk1` | |
| NILA (SARPA) | `sarpaSlide0` | `clk` | `sarpaLeap1` | a serpente é baixa. O `clk` é desenho da GAJA, mas casa com a altura |
| BAATAR | `lp1` | `hp1` | `hk1` | o `lp1` dele é tapa de palma aberta, bom para luta mongol |
| ZENON | `lp1` | `hp1` | `hk1` | |

### 3.2 Células da folha FILME (`f0` a `f5`)

A folha tem 3 colunas e 2 linhas. A ordem é da esquerda para a direita, de cima para baixo.

| Lutador | f0 | f1 | f2 | f3 | f4 | f5 |
|---|---|---|---|---|---|---|
| 8 de 10 | close do ESP (`sFire`) | close do ↓+ESP (`sDown`) | close do →+ESP (`sFwd`) | grito | reação: rosto atingido | reação: lançado para trás |
| CAMILLE | FOUETTÉ (resposta da PARADE) | COUP D'ARRÊT | REVERS | grito | idem | idem |
| NILA | GOLPE MARMA | PASSO DO ELEFANTE | BOTE | SALTO DA SERPENTE | idem | idem |
| ZENON | SELO (e SELO MAIOR) | COLUNA DE ÔNIX | TRIBUTO | DECRETO | idem | idem |

**Mudança contra o plano:** a linha 1 do BAATAR foi reordenada. Agora `f0` = ARREMESSO (`sFire`), `f1` = QUEBRA-BASE (`sDown`)
e `f2` = MERGULHO (`sFwd`), na regra de todos. No plano, o MERGULHO vinha primeiro.

---

## 4. Os 31 roteiros (e as 2 variantes do chefão)

Cada linha declara o modelo e preenche os encaixes. Os quadros foram conferidos um a um nas folhas de contato dos 9 atlas
novos [medido]. O WEI LONG segue o plano, porque o atlas dele ainda é o antigo, com nomes legados [lido].

Legenda:
- **A?**: se o filme só com atlas convence (ver §6);
- **final**: minha sugestão para o campo `final` de `filmes.ts` (Cronos). É só visual.

| # | Lutador | Especial (golpe) | Modelo | Estilo | Encaixes | fK | Desvios do modelo | final | A? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | HAYATO | RAIJIN-DAN (`sFire`) | projetil | E1 | R1-R3 = `sa0` `sa1` `sa2` | f0 | – | derruba | sim: `sa2` (duas palmas) é o quadro mais forte do atlas |
| 2 | HAYATO | RAIJIN-KEN (`sDown`) | aereo | E1 | PREP `sb0`, SUBIDA `sb1`, IMPACTO `sb2`, QUEDA `jfall` | f1 | – | lanca | sim |
| 3 | HAYATO | KAMINARI-STEP (`sFwd`) | chao | E1 | PREP `sc0`, IMPACTO `sc1` | f2 | – | derruba | sim |
| 4 | WEI LONG | LONG ZHANG (`sFire`) | projetil | E2 | `sa0` `sa1` `sa2` | f0 | – | derruba | **não** enquanto o atlas tiver dragão e aura pintados |
| 5 | WEI LONG | ZHEN DI (`sDown`) | projetil | E2 | `sb0` `sb1` `sb2` (`sb2` = palma no chão) | f1 | b3: rival `hitB` (onda rasteira) | derruba | fraco |
| 6 | WEI LONG | TIE SHAN KAO (`sFwd`) | chao | E2 | PREP `sc0`, IMPACTO `sc1` | f2 | – | parede | **não**: o atlas antigo tem soco no lugar da ombrada |
| 7 | MIN-JI | BULKKOT (`sFire`) | projetil | E3 | `sa0` `sa1` `sa2` | f0 | uma lâmina em b3 e outra em b4 | derruba | sim |
| 8 | MIN-JI | HOERI CHAGI (`sDown`) | aereo | E3 | PREP `sb0`, SUBIDA `sb1`, IMPACTO `sb2`, QUEDA `sb3` | f1 | `flip` alternando a cada 3 ticks em b3-b4 (como o `spin` do motor) | lanca | sim |
| 9 | MIN-JI | TWIO YEOP CHAGI (`sFwd`) | aereo | E3 | PREP `sc0`, SUBIDA `jup`, IMPACTO `sc1`, QUEDA `land` | f2 | – | derruba | sim |
| 10 | CAIO | ONDA VERDE (`sFire`) | projetil | E4 | `sa0` `sa1` `sa2` | f0 | bumerangue: passa em b3 e volta em b5 | derruba | sim, com o atlas novo |
| 11 | CAIO | RABO-DE-ARRAIA (`sDown`) | chao | E4 | PREP `sb0`, IMPACTO `sb1` (mão no chão), IMP2 `sb2` | f1 | b4: rival `hitB` (golpe baixo) | derruba | sim |
| 12 | CAIO | MEIA-LUA (`sFwd`) | aereo | E4 | PREP `sc0`, SUBIDA `jup`, IMPACTO `sc1`, QUEDA `land` | f2 | – | derruba | sim |
| 13 | AMINU | MASHI (`sFire`, 3 níveis) | chao | E5 | PREP `hp0`, IMPACTO `hp1` | f0 | tremor por nível (§1.3) | derruba (N1), parede (N2, N3) | sim |
| 14 | AMINU | GARKUWA (`sDown`, acerto) | chao | E5 | PREP `sb0`, IMPACTO `sb1`, IMP2 `sb2` | f1 | – | derruba | fraco: a palma parada lê como defesa |
| 15 | AMINU | PASSO DO LEÃO (`sFwd`) | chao | E5 | PREP `sc0`, IMPACTO `sc1` | f2 | – | parede | sim |
| 16 | CENTELLA | PLANCHA (`sFire`) | aereo | E6 | PREP `sa0`, SUBIDA `sa1`, IMPACTO `sa1` (no ar), QUEDA `sa3` | f0 | b5: atacante `sa2` (o baque no chão), rivalAlt `hitB`. b6: rivalAlt `koFloor` (ela cai por cima) | derruba | sim |
| 17 | CENTELLA | HURACANRANA (`sDown`) | agarrao | E6 | PREP `sb0`, PEGA `sb1`, GIRO `sb2`, SLAM `sb3` | f1 | rival: b1 na ponta do pé dela, mesma altura; b2 30 px acima da cabeça dela, `rot` π (de cabeça para baixo); b3 no chão a 90 px à frente | derruba | **fraco**: sem rival desenhado na pegada |
| 18 | CENTELLA | RESORTE (`sFwd`) | chao | E6 | PREP `sc0`, IMPACTO `sc1` | f2 | – | derruba | sim |
| 19 | CAMILLE | PARADE → FOUETTÉ (`sResp`) | chao | E7 | PREP `sa1` (a aparada), IMPACTO `sa2` (o fouetté) | f0 | o filme usa `sa2`, que é a arte própria; o motor ainda desenha `hk1` | derruba | sim |
| 20 | CAMILLE | COUP D'ARRÊT (`sDown`) | chao | E7 | PREP `sb0`, IMPACTO `sb1`, IMP2 `sb2` | f1 | b4: rival `hitB` | derruba | sim |
| 21 | CAMILLE | REVERS (`sFwd`) | chao | E7 | PREP `sc0` (de costas), IMPACTO `sc1` | f2 | cruza (§1.3) | derruba | sim |
| 22 | NILA (GAJA) | GOLPE MARMA (`sFire`) | chao | E8 | PREP `sa0`, IMPACTO `sa2` | f0 | GRITO = PREP (sem f3) | derruba | sim |
| 23 | NILA (GAJA) | PASSO DO ELEFANTE (`sFwd`) | chao | E8 | PREP `sc0`, IMPACTO `sc1` | f1 | GRITO = PREP | parede | sim |
| 24 | NILA (SARPA) | BOTE (`sFire`) | chao | E9 | PREP `sarpaSlide0`, IMPACTO `sarpaSlide1` | f2 | GRITO = PREP; b4: rival `hitB` | derruba | sim |
| 25 | NILA (SARPA) | SALTO DA SERPENTE (`sFwd`) | aereo | E9 | PREP `sarpaLeap0`, SUBIDA `sarpaLeap1`, IMPACTO `sarpaLeap2`, QUEDA `sarpaLeap0` | f3 | GRITO = PREP. É o único uso do `sarpaLeap1`, que está no atlas sem uso | derruba | sim |
| 26 | BAATAR | ARREMESSO DO AVARGA (`sFire`) | agarrao | E10 | PREP `sa0`, PEGA `sa1`, GIRO `sa2`, SLAM `sa3` (de joelho) | f0 | rival: b1 nas mãos dele, na altura do peito; b2 acima do ombro, `rot` −0,6; b3 no chão a 70 px à frente | derruba | **fraco**, como a HURACANRANA |
| 27 | BAATAR | QUEBRA-BASE (`sDown`) | chao | E10 | PREP `sb0`, IMPACTO `sb2`, IMP2 `sb1` | f1 | b4: rival `hitB` | derruba | sim |
| 28 | BAATAR | MERGULHO DA ÁGUIA (`sFwd`) | aereo | E11 | PREP `jsquat`, SUBIDA `dive0`, IMPACTO `dive1`, QUEDA `land` | f2 | – | derruba | sim |
| 29 | ZENON | SELO DO ARCONTE (`sFire`) | projetil | E12 | `sa0` `sa1` `sa2` | f0 | GRITO = `cena1` | derruba | fraco: zoom teto 1,10 |
| 30 | ZENON | COLUNA DE ÔNIX (`sDown`) | aereo | E12 | PREP `sb0`, SUBIDA `sb1`, IMPACTO `sb2`, QUEDA `sb3` | f1 | GRITO = `cena1` | lanca | fraco: zoom 1,10 |
| 31 | ZENON | TRIBUTO (`sFwd`) | chao | E12 | PREP `sc0`, IMPACTO `sc1`, IMP2 `sc2` ("cobrando") | f2 | GRITO = `cena1`; as moedas do dreno tocam em b5 | derruba | fraco: zoom 1,10 |
| 32* | ZENON (fase 2) | SELO MAIOR (`chefe2/sFire`) | projetil | E12 | = nº 29 | f0 | – | derruba | fraco |
| 33* | ZENON (fase 2) | DECRETO (`chefe2/sFwd`) | chao | E12 | PREP `decreto0`, IMPACTO `decreto1`, IMP2 `decreto2` | f3 | cruza; GRITO = `cena1` | derruba | fraco |

Sem filme: VADIVU da GAJA e VADIVU da SARPA (`sDown` da NILA). Não têm caixa de acerto (D-V1).

### 4.1 Dois roteiros expandidos (o resto sai igual: modelo + encaixes + desvios)

```ts
// src/data/roteiros-filme.ts (Lyra) — HAYATO
'hayato/sFwd': { duracao: 66, curta: 30, estilo: 'E1', batidas: [ // KAMINARI-STEP, modelo chao
  { t: 0,  atacante: 'f3', atacanteAlt: 'sc0', rival: 'hitH', peso: 0, camera: { zoom: 1.3, foco: 'atacante' }, retrato: true },
  { t: 8,  atacante: 'lp1', rival: 'hitH', peso: 0.12, camera: { zoom: 1.2, foco: 'meio' }, som: 'leve' },
  { t: 14, atacante: 'hp1', rival: 'hitB', peso: 0.12, camera: { zoom: 1.2, foco: 'meio' }, som: 'leve' },
  { t: 20, atacante: 'hk1', rival: 'hitH', peso: 0.16, camera: { zoom: 1.25, foco: 'meio' }, som: 'pesado' },
  { t: 28, tc: 0,  atacante: 'f2', atacanteAlt: 'sc1', rival: 'hitB', peso: 0.35, camera: { zoom: 1.3, foco: 'atacante' }, som: 'pesado' },
  { t: 38, tc: 10, atacante: 'sc1', rival: 'f4', rivalAlt: 'hitH', peso: 0.25, camera: { zoom: 1.3, foco: 'rival' }, som: 'final' },
  { t: 48, tc: 18, atacante: 'sc1', rival: 'f5', rivalAlt: 'kdAir', peso: 0, camera: { zoom: 1.15, foco: 'rival' } },
  { t: 58, tc: 24, atacante: '$motor', rival: 'koFloor', peso: 0, camera: { zoom: 1.0, foco: 'meio' } },
] },
'hayato/sFire': { duracao: 62, curta: 30, estilo: 'E1', batidas: [ // RAIJIN-DAN, modelo projetil
  { t: 0,  atacante: 'f3', atacanteAlt: 'sa0', rival: 'hitH', peso: 0, camera: { zoom: 1.25, foco: 'atacante' }, retrato: true },
  { t: 6,  atacante: 'sa1', rival: 'hitH', peso: 0, camera: { zoom: 1.25, foco: 'atacante' }, som: 'leve' },
  { t: 12, tc: 0,  atacante: 'f0', atacanteAlt: 'sa2', rival: 'hitH', peso: 0, camera: { zoom: 1.3, foco: 'atacante' }, som: 'pesado' },
  { t: 22, tc: 6,  atacante: 'sa2', rival: 'hitH', peso: 0.30, camera: { zoom: 1.3, foco: 'rival' }, som: 'pesado' },
  { t: 28, tc: 11, atacante: 'sa2', rival: 'hitB', peso: 0.20, camera: { zoom: 1.3, foco: 'rival' }, som: 'leve' },
  { t: 34, tc: 16, atacante: 'sa2', rival: 'f4', rivalAlt: 'hitH', peso: 0.50, camera: { zoom: 1.3, foco: 'rival' }, som: 'final' },
  { t: 44, tc: 21, atacante: '$motor', rival: 'f5', rivalAlt: 'kdAir', peso: 0, camera: { zoom: 1.15, foco: 'rival' } },
  { t: 54, tc: 26, atacante: '$motor', rival: 'koFloor', peso: 0, camera: { zoom: 1.0, foco: 'meio' } },
] },
```

Conferência dos pesos: chao 0,12 + 0,12 + 0,16 + 0,35 + 0,25 = 1; CURTA 0,75 + 0,25 = 1. Projétil 0,30 + 0,20 + 0,50 = 1.
Agarrão 0,15 + 0,25 + 0,60 = 1. Todas as durações ficam entre 45 e 75 (spec §3.5); a CURTA tem 30.

---

## 5. O que muda contra o plano de 23/10 (§1.4 e §1.5)

| Ponto | Plano | Agora | Por quê |
|---|---|---|---|
| Duração | 60 a 90 ticks | 58 a 66 (CURTA 30) | a spec v2 fixou 45 a 75 |
| Rajada do projétil | soco, direto e chute | os 3 quadros do disparo | o atacante pode estar longe: soco a 600 px não tem leitura |
| Cálculo da página FILME | 6 closes de 560 x 620 em 2048 x 1024, 8 MB | **2048 x 1280, 10 MiB** | 2 linhas de 620 px = 1240 > 1024. Errei a conta no plano |
| Enquadramento | só busto e três-quartos | + `full` para chutes e saltos | três-quartos corta no joelho e cortaria o pé que acerta |
| BLOCO B na folha FILME | copiado como está | sem a frase da guarda e sem "Match the attached reference image exactly" | lição do ZENON: pose parecida com a da referência volta como eco. Agora o B pede só traje, rosto e cores da referência |
| BAATAR | MERGULHO em f0 | f0/f1/f2 = sFire/sDown/sFwd | uma regra só para o código |
| SELO do ZENON e GARKUWA do AMINU | uma palma estendida | duas palmas juntas (ZENON); palma vista de frente com o punho no quadril (AMINU) | a guarda de idle deles **é** uma palma estendida: risco alto de eco |
| DECRETO | agarrar a gola | golpe de costas de mão | é o que o golpe faz no jogo [lido em `zenon.ts`] |
| WEI LONG f0 | "fingers open like a dragon's jaws" | "fingers open and curved" | a palavra "dragon" desenha o dragão (lição da 153054) |
| CAIO | sem close até a arte nova | liberado: o atlas novo está na árvore de trabalho | R-1 resolvido para ele quando entrar no commit |

---

## 6. Laudo A x B (final)

### 6.1 Custo

| | A: só atlas | B: + folha FILME |
|---|---|---|
| Créditos Runway | 0 | **6 por lutador**; piloto 6 (+6 se precisar de 1 regeração); 10 folhas = 60; com reserva de ~30% = **teto de 78** |
| Memória decodificada | **0 MB extra**: as poses já estão nos atlas carregados [lido] | página 2048 x 1280 RGBA = **10 MiB**; 2 por luta (os dois lutadores) = **20 MiB** de pico [calculado] |
| Download | 0 | ~0,6 a 0,8 MB por página WebP. Estimativa pelas páginas de atlas de hoje (0,44 a 0,71 MB) [medido o tamanho delas, não o da FILME] |
| Carga | – | sob demanda, só dos 2 lutadores da luta, no início da luta, e soltar no fim. Nunca no pré-carregamento (o item 11 da revisão está em 287 MB estimados contra a meta de 120) |
| Queda | – | página que não carregou → `Alt` → o filme toca igual ao A |
| Plano B de memória | – | se o iPhone medido passar do orçamento: página 1536 x 960 (5,6 MiB; 11,25 MiB por luta). O close fica ~1,35x ampliado, ainda melhor que o atlas com zoom 1,3 (1,6x) |

### 6.2 Qualidade (a coluna "A?" do §4)

| Veredito do A | Especiais | O que o B resolve |
|---|---|---|
| convence | 22 dos 31 | o grito em close e a reação do rival em close. É ganho de cinema, não de leitura |
| fraco | HURACANRANA, ARREMESSO (pegada sem rival desenhado); GARKUWA (palma parada parece defesa); ZHEN DI; os 3 do ZENON e as 2 variantes (zoom limitado a 1,10: o chefão, o melhor momento do jogo, é o que tem o pior close) | close da pegada e do golpe sem depender do zoom |
| não convence | LONG ZHANG, TIE SHAN KAO (atlas antigo do WEI: FX pintado e soco no lugar da ombrada) | nada, enquanto o atlas do WEI for o antigo. O close sozinho não esconde o mundo errado. Primeiro o atlas novo, depois a FILME dele |

**Decisão:** A para os 31 desde já (a V2-3d não espera arte nenhuma). B no HAYATO como piloto, conforme o dono aprovou.
Depois do OK do piloto, a ordem das 9 segue o tamanho do ganho:
1. CENTELLA;
2. BAATAR;
3. ZENON;
4. WEI LONG (só com o atlas novo no jogo);
5. CAIO;
6. MIN-JI;
7. CAMILLE;
8. AMINU;
9. NILA.

Se o dono quiser parar no meio, as primeiras 3 já cobrem todos os "fracos" que têm conserto.

### 6.3 Critério do piloto (go/no-go para as outras 9)

1. **A folha:**
   - 6 figuras;
   - recorte reto na cintura e no joelho;
   - nenhum FX;
   - o rosto bate com a mestra, a olho.
2. **Sem eco:** rodar `difcruz.ps1` de `f0`, `f1` e `f2` contra a mestra. A diferença tem de ser maior que a da respiração do
   idle; se não for, é eco e a célula volta ao `Alt`. No máximo **1** regeração da folha.
3. **Resolução:** o close no painel de 62% fica no máximo 1,1x ampliado. Medir no navegador, não deduzir.
4. **Memória:** a Íris mede a luta HAYATO x HAYATO no perfil de celular com e sem a página FILME. A diferença tem de ficar
   em ~10 MiB (uma página, mesmo lutador dos dois lados).
5. **O dono vê** os 3 filmes do HAYATO lado a lado, em A e em B (captura da Lyra pelo gancho `?filme=hayato:<golpe>`), e
   aprova B. Sem esse OK, as outras 9 não são pedidas.

---

## 7. Prompts da folha FILME (Runway)

Regras do pedido:
- **Uma** imagem anexada: a mestra aprovada do lutador. Nunca duas.
- Fundo da cor do lutador, já dentro do bloco do personagem: magenta no HAYATO, CENTELLA, CAIO e WEI LONG; verde nos outros 6.
- Sem rótulos: o bloco A proíbe texto, número, grade e moldura.
- Cada pedido abaixo já está montado: **A-FILME + bloco do personagem + C-FILME**. É só colar.
- O bloco do personagem foi tirado da fonte de cada lutador (`docs/prompts/0X-<id>.md`; ZENON:
  `docs/handoff-apolo-zenon-folhas.md`; CAIO e WEI LONG: plano §2.4) por script, com duas trocas:
  - sem a frase da guarda;
  - "Match the attached reference image exactly." vira o pedido de copiar só traje, rosto e cores.

**Checagem de cada folha**, além do §6.3:
- `f3` (grito) diferente do idle;
- `f4` e `f5` com a cabeça para a ESQUERDA. Se vier à direita, **espelhar por código**: editar a imagem cria artefato;
- CENTELLA de máscara nas 6;
- AMINU com a corda só na mão de trás.

**O que fazer quando falha:**
- veio corpo inteiro onde pedi busto: aceite, o recorte é por código;
- uma célula ecoou a mestra: essa célula fica no `Alt`. Não se regera a folha inteira por uma célula.

#### HAYATO (PILOTO: gerar só esta antes do OK)

- **Anexar (UMA imagem):** `hayato-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/hayato/folhas/hayato-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — HAYATO: young Japanese karateka, about 24 years old, muscular athletic build, light skin, dark eyes, confident grin. Spiky black hair swept up and back, with one bright electric-yellow lightning-bolt-shaped streak in the front of the hair. Green headband with two long tails flowing behind. Charcoal-graphite karate gi (dark charcoal gray, never white): short sleeves rolled up above the elbows, open V collar showing the chest, bright electric-yellow trim along the whole collar and along the hem of the jacket, side slits at the hem, a small electric-yellow lightning-bolt emblem on the left chest and a larger yellow lightning bolt on the upper back. Black belt with thin yellow edges, knotted at the front with two long hanging tails. Loose charcoal-graphite gi trousers without trim. Both hands and forearms wrapped in white cloth hand wraps from the knuckles to the mid forearm, no gloves. Barefoot. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat magenta #FF00FF.

SHEET FILM. Row 1: (1) bust: both open palms thrust straight forward to the right at chest height, wrists together, fingers spread, shouting fiercely, headband tails flying back, (2) three-quarter: rising uppercut, the fist nearest the viewer driving straight up past his face, body stretched upward, eyes on the fist, the other fist pulled down to the hip, (3) three-quarter: lunging dash punch, body low and stretched forward, the fist nearest the viewer fully extended to the right, headband tails streaming back.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, hair and headband tails flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### CENTELLA

- **Anexar (UMA imagem):** `centella-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/centella/folhas/centella-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — CENTELLA: Mexican luchadora (professional wrestler), about 25 years old, compact, athletic and muscular, modest athletic sports outfit. Light-brown skin. A long dark-brown braid comes out of the back of her mask. Full-head lucha libre mask in turquoise-jade with a silver spark-and-star design around the eyes and thin black accents; eyes and mouth openings visible. Sleeveless turquoise-jade one-piece wrestling bodysuit with silver lightning-spark stripes down the sides, black knee pads, black elbow pads, taped wrists, high turquoise-and-silver lace-up wrestling boots. No cape. The mask is ALWAYS on, in every pose. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat magenta #FF00FF.

SHEET FILM. The wrestling mask is on in every cell. Row 1: (1) full: in the air, body flat and horizontal, belly down, arms and legs spread wide, mask on, (2) full: in the air, upside down, legs scissored together at head height as if locked around a neck, upper body arching back, mask on, (3) full: flying crossbody, body horizontal, arms stretched forward to the right, braid streaming back, mask on.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, mask on, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, braid flying to the left, mask on, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open, mask on.
```

#### BAATAR

- **Anexar (UMA imagem):** `baatar-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/baatar/folhas/baatar-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — BAATAR: Mongolian bokh wrestling champion, about 44 years old, HUGE and heavy-set, very broad shoulders, thick arms and legs, strong belly, a gentle giant. Tanned weathered skin, short black hair with gray at the temples, short mustache, calm kind eyes. Traditional bokh wrestling outfit: deep red long-sleeved zodog jacket that covers the back and arms but is open on the chest and belly, trimmed in gold; dark blue tight shuudag wrestling briefs; tall traditional Mongolian leather gutal boots with upturned toes and gold ornament. No hat. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat pure green #00FF00.

SHEET FILM. Row 1: (1) bust: both hands clamped forward at chest height gripping as if seizing an opponent's jacket, body twisting to throw, teeth bared, (2) full: leaning in low, one boot hooking low at ankle height to the right, both arms pulling back, (3) full: diving down from above toward the right, arms spread wide like eagle wings, reaching forward to grab.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, short hair flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### ZENON

- **Anexar (UMA imagem):** `zenon-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/zenon/folhas/zenon-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — ZENON ARGYROS: Greek pankration master, about 61 years old, very tall, long legs, broad straight shoulders, lean powerful build. Shaved head, short neatly trimmed silver beard, sharp nose, pale gray eyes, a thin old scar through the left eyebrow. A long black tailored coat reaching below the knees, worn open, long sleeves, tall stiff stand-up collar, deep tyrian purple inner lining, one thin plain gold trim along the edges and cuffs; a fitted sleeveless black tunic closed at the chest by one round gold clasp; dark charcoal trousers; black leather boots. Both hands and wrists wrapped in long brown leather thongs, and a heavy gold signet ring on the RIGHT hand. The coat always has its sleeves on his arms: it is never a cape. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat pure green #00FF00.

SHEET FILM. Row 1: (1) bust: body turned three-quarter toward the viewer, both palms pressed together and pushed forward at chest height, fingers straight, cold commanding stare, the tall collar standing, (2) full: rising knee strike, one knee driving up to chest height, the arm nearest the viewer raised high with the palm open upward, coat flaring, (3) three-quarter: lunging forward low, the arm nearest the viewer extended to the right with the palm open, coat streaming back.
Row 2: (1) three-quarter: back-hand strike, body twisted, the arm nearest the viewer swung out to the right with the back of the hand leading, contemptuous smile, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut, teeth clenched, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, coat flying.
```

#### WEI LONG (só depois do atlas novo dele no jogo)

- **Anexar (UMA imagem):** `wei-long-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/wei-long/folhas/wei-long-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — WEI LONG: elderly Chinese kung fu master, about 65 years old, tall and powerful, broad chest, thick forearms. Long white hair tied in a topknot bun, long white eyebrows, white beard reaching the chin, calm stern face. Sleeveless royal-blue changshan-style vest with gold trim and a gold dragon embroidered on the front, with a long front panel reaching the shins. Wide black kung fu trousers, black cloth shoes with white soles, plain black cloth wrist bracers. No waist sash, no brown leather. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat magenta #FF00FF.

SHEET FILM. Row 1: (1) bust: both palms pushed forward together at chest height, heels of the hands touching, fingers open and curved, stern fierce eyes, beard and hair swept back, (2) three-quarter: deep low horse stance, both palms pushed down hard in front of the knees, head bowed, shoulders tense, (3) three-quarter: shoulder charge, body leaning hard to the right, the lead shoulder and upper back driving forward, both arms tucked close to the body, face set in iron determination.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, white beard and topknot flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### CAIO

- **Anexar (UMA imagem):** `caio-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/caio/folhas/caio-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — CAIO: Afro-Brazilian capoeira master from Rio de Janeiro, about 27 years old, lean and muscular, long limbs, agile. Dark brown skin, determined eyes, short beard shadow. Shoulder-length dreadlocks tied back in a high ponytail with a lime-green hair tie. Bare-chested, with a black tribal tattoo on his right shoulder and upper arm (the shoulder nearest the viewer when he faces right). White loose capoeira abada trousers with a white waistband. A braided green-and-yellow capoeira cord tied at the waist, its two long ends hanging at the left hip with one green tassel and one yellow tassel. Barefoot. No shirt, no shoes, no jewelry. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat magenta #FF00FF.

SHEET FILM. Row 1: (1) bust: torso twisting, both arms sweeping forward in a wide horizontal arc, open palms ending toward the right, dreadlocks swinging, (2) full: low spinning sweep, both hands on the floor line, back turned to the right, one leg swinging around low with the heel leading, (3) full: in the air, body turning, one leg swinging over in a high arc with the heel coming down toward the right.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, dreadlocks flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### MIN-JI

- **Anexar (UMA imagem):** `min-ji-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/min-ji/folhas/min-ji-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — MIN-JI: young Korean woman, taekwondo champion, about 22 years old, athletic and slim. Long straight black hair in a high ponytail tied with a red ribbon bow. Determined bright dark eyes, friendly face. White V-neck taekwondo dobok with black collar trim, black belt tied at the front, red fingerless sparring gloves, barefoot. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat pure green #00FF00.

SHEET FILM. Row 1: (1) full: high crescent kick, her leg sweeping across at head height in front of her, ponytail whipping, (2) full: airborne spinning kick, body turned with her back partly to the viewer, one leg extended outward at head height, ponytail flying, (3) full: flying side kick, body almost horizontal, the blade of the foot thrust toward the right, arms tucked.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, ponytail flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### CAMILLE

- **Anexar (UMA imagem):** `camille-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/camille/folhas/camille-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — CAMILLE: French savate fighter (boxe francaise) from Marseille, about 29 years old, tall and lean, modest athletic sports outfit. Light olive skin, short dark auburn bob haircut, sharp focused eyes, a faint confident smile. Navy-blue sleeveless one-piece savate suit with thin silver stripes down the sides, fitted athletic cut. Silver boxing gloves. White low-top savate boxing shoes with dark soles and laces. She always wears the shoes. Very upright posture. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat pure green #00FF00.

SHEET FILM. Row 1: (1) full: high roundhouse kick at head height striking with the toe of the shoe, supporting leg straight, upright torso, sharp eyes, (2) full: low side kick at shin height, the sole of the shoe forward, torso upright, gloves high, (3) full: spinning heel kick, back partly to the viewer, one leg swinging around at head height with the heel leading.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, short hair flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### AMINU

- **Anexar (UMA imagem):** `aminu-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/aminu/folhas/aminu-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — AMINU: Nigerian Hausa dambe boxer from Kano, about 26 years old, tall and lean with long arms and wiry muscles. Dark brown skin, short cropped black hair with a neat hairline, short beard along the jaw, cheerful confident expression. Bare-chested. Knee-length indigo-dyed cotton shorts. Wide cream waist sash with copper-colored Hausa geometric embroidery. Faint indigo dye stains on both forearms. His REAR fist (the hand farther from the opponent) is thickly wrapped in natural cream rope and cloth up to the mid forearm: this is his "spear" hand. His LEAD hand is bare and open, held forward like a shield. His lead shin is wrapped in cream cloth. Barefoot. The rope wrap is always on the rear hand in every pose. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat pure green #00FF00.

SHEET FILM. Row 1: (1) bust: the rope-wrapped rear fist driving straight toward the right at face height, the whole shoulder behind it, jaw clenched, the open lead hand pulled back to the chest, (2) bust, seen slightly from the front: the bare open lead palm pushed far forward toward the right, filling the foreground, fingers spread wide, elbow locked, teeth gritted, the rope-wrapped fist held low at the hip, (3) three-quarter: lunging low forward, the open lead palm pushing to the right at chest height, the rope-wrapped fist pulled back to the hip, fierce grin.
Row 2: (1) bust: battle cry before the finishing blow, mouth wide open shouting, eyes blazing, both fists clenched near the chest, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, short hair flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

#### NILA

- **Anexar (UMA imagem):** `nila-mestra-v1.png`
- **Formato:** paisagem 4:3, 2K
- **Salvar como:** `arte-fonte/lutadores/nila/folhas/nila-filme-v1.png`

```
2D fighting game cinematic close-up sheet, hand-drawn anime-style cel shading with clean dark outlines, vivid but natural colors, in the style of a modern hand-drawn arcade fighting game. Landscape image, aspect ratio 4:3.
Exactly 6 separate figures of the same character, arranged in an invisible grid of 3 columns and 2 rows; every cell has the same size and holds exactly one figure. Each cell gives the framing: "bust" = from the top of the head down to the waist; "three-quarter" = from the top of the head down to the knees; "full" = the whole body from head to feet, as large as the cell allows. A bust or three-quarter framing ends at a straight invisible horizontal line at the waist or at the knees; below that line there is only the plain background.
The character always faces RIGHT, unless a cell says otherwise. Same character, same costume, same face, same proportions in every cell.
IMPORTANT SPACING: leave an empty band of plain background at least 8% of the image height between the two rows, above the top row and below the bottom row, and between the columns. Hair, hands, fingers and feet NEVER touch the image border or another cell. Nothing is cut off except at the waist or knee line of a bust or three-quarter framing.
Strong dramatic expressions and dynamic foreshortening toward the right side, as in the key frame of a special move.
Background: one single flat solid color (given in the character description) filling the whole image. No gradient, no floor, no shadow, no vignette.
Absolutely NO text, letters, numbers, labels, arrows, grid lines, borders, frames, panels or speech balloons.
NO visual effects of any kind: no glow, aura, energy, fire, electricity in the air, sparks, speed lines, motion trails, smears, dust, impact stars or blur. Printed emblems and embroidery on the clothes are part of the costume and stay.
Only this one character. No opponent, no other people, no props.

CHARACTER — NILA: Indian kalaripayattu practitioner from Kerala, about 31 years old, lean, flexible and athletic, modest traditional training clothes. Warm brown skin, long thick black hair in a single braid reaching her waist, calm focused face. Fitted off-white cotton short-sleeved training top and fitted off-white cotton trousers, both with a thin gold border, a wide laterite red-brown cloth waist wrap tied tightly, red-brown cloth bands on both upper arms, barefoot. Same costume, face, hair, proportions and colors as the attached reference image; the poses are ONLY the ones described in the cells, never the pose of the reference image. Background color: solid flat pure green #00FF00.

SHEET FILM. Row 1: (1) bust: two-finger strike fully extended to the right at chest height, the other hand held back at the shoulder, eyes intensely focused, braid swinging, (2) three-quarter: both open palms thrust forward together at chest height, heavy and grounded, knees deeply bent, (3) full: body flat and low along the floor line, the front leg sliding forward to the right, one hand touching the floor line.
Row 2: (1) full: corkscrew leap in the air, body twisting, one leg extended diagonally downward to the right, braid flying, (2) bust: hit hard in the face, head snapped back toward the LEFT, eyes shut tight, teeth clenched, braid flying to the left, (3) three-quarter: knocked backward by a heavy blow, body arching back toward the LEFT, arms flung out, mouth open.
```

---

## 8. Pesos de mola (V2-2, para a Lyra) [proposta]

### 8.1 Peso por lutador (`LutadorDef.peso`)

| Peso | Lutadores | Leitura |
|---|---|---|
| `leve` | MIN-JI, CENTELLA, CAMILLE, CAIO | rápidos, acrobáticos: antecipação curta, inclinação maior, quique na vitória |
| `medio` | HAYATO, NILA | o protótipo como está (o HAYATO é a régua) |
| `pesado` | WEI LONG, AMINU, BAATAR, ZENON | massa: antecipação longa, squash maior, quase sem inclinação e sem quique |

NILA: `medio` no `LutadorDef`. Se a Vega aceitar `peso` também em `FichaDef` (aditivo, como `combosProprios`), a GAJA vira
`pesado` e a SARPA `leve`. É a postura que muda o corpo dela.

### 8.2 Amplitudes por arquétipo (a coluna "protótipo" vem de `fighter.ts:995-1150` [lido])

A arte nova é **desenhada**, e o protótipo era um boneco procedural. O squash de 14% do protótipo deforma rosto desenhado.
Por isso o teto é |1 − sx|, |1 − sy| ≤ 0,08 e `rot` ≤ 0,15 rad (fora o `kdAir`).

| Transformação | Protótipo | leve | medio | pesado |
|---|---|---|---|---|
| Antecipação de golpe comum, `dx` | −7·p | −5·p | −7·p | −9·p |
| Antecipação de golpe pesado, `dx` / `sx` | −12·p / 1+0,03·p | −9·p / 1+0,02·p | −12·p / 1+0,03·p | −15·p / 1+0,04·p |
| Avanço do pesado ativo (até A+4), `dx` / `sx` | +7 / 1,04 | +5 / 1,03 | +7 / 1,04 | +9 / 1,05 |
| Preparo de projétil, `sy` / `sx` / `dx` | 0,86 / 1,08 / −10 | 0,95 / 1,03 / −8 | 0,94 / 1,04 / −10 | 0,92 / 1,05 / −12 |
| Preparo com `pre` (agacha), `sy` | 0,94 | 0,96 | 0,95 | 0,94 |
| Investida (`rush`), `rot` | 0,10 | 0,12 | 0,10 | 0,06 |
| Pouso (`land`), `sy` | 0,93 | 0,97 | 0,96 | 0,94 |
| Pré-pulo (`jsquat`), `sy` | 0,90 | 0,96 | 0,95 | 0,93 |
| Respiração do idle, `sy` (período) | ±0,012 (t/16) | ±0,005 (t/12) | ±0,005 (t/16) | ±0,004 (t/20) |
| Balanço do andar, `dy` | −3·\|sin\| | 0 | 0 | 0 |
| Vitória, `dy` | −10·\|sin(st/11)\| | −8 | −5 | −2 |
| `kdAir`, `rot` | clamp(vy/40, ±0,5) | ×1,2 | ×1,0 | ×0,7 |

Notas de direção:
- **Respiração e andar baixos de propósito.** Os atlas novos já desenham a respiração (`idle0-3`) e o sobe-e-desce do passo
  (`walk0-7`). Somar a mola do protótipo dobra o movimento e faz "flutuar". A respiração da mola só amacia a troca de quadro.
- **Pivô:** `sx` e `sy` em torno da sola (linha dos pés, `ax`), nunca do centro. Com pivô no centro, o pé sai do chão e o
  "pé no chão" que a curadoria mede se perde. `rot` gira em torno do quadril (~45% da altura a partir da sola).
- **Tremor do rival no hitstop (spec §7.2):**
  - pela força do golpe: 2 px (`lp`/`lk`), 3 px (`hp`/`hk`), 4 px (especial);
  - vezes o peso do **defensor**: leve ×1,0, medio ×0,9, pesado ×0,75 (corpo pesado treme menos e parece mais pesado).
- **Conferência a olho:** a Lyra me manda captura antes/depois dos 10 (critério 7 da V2-2), em 3 momentos: preparo do
  projétil, pouso e `kdAir`. Eu aprovo pela silhueta, sem medir em pixel.

---

## 9. O que provei e o que só inferi

- **Medi:**
  - os nomes de pose dos 10 `atlas.json` (48 canônicas em todos; extras do BAATAR, NILA e ZENON; WEI LONG com nomes legados
    e página única de 3600 x 2296);
  - o desenho de cada quadro escolhido no §4, nas folhas de contato dos 9 atlas novos;
  - o tamanho das páginas de atlas de hoje.
- **Calculei:**
  - memória da página FILME (2048 x 1280 x 4 = 10 MiB);
  - soma dos pesos e durações.
- **Li no código, sem rodar:**
  - pose do caído (`koFloor` em `lie`);
  - animações de cada especial (`anim.ts`, `lutadores/*.ts`);
  - estilo E1-E12 por especial;
  - amplitudes do protótipo.
- **Não provei:**
  - que o close fica nítido no painel (piloto, §6.3);
  - que 20 MiB cabem no iPhone (Íris);
  - que a mola não "flutua" (captura da V2-2);
  - que o modelo da Runway respeita o enquadramento `full`/`bust` na mesma folha (o plano já previa aceitar corpo inteiro).
  - Os prompts não foram testados: nada foi gerado.
