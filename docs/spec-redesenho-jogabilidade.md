# Spec: redesenho da jogabilidade sobre o motor v2

Nova, 24/10/2026. HEAD `1d9f6c8` (publicado: `209ecd8`). Proposta, nada implementado. Substitui partes da
`docs/spec-revisao-motor-luta-v2.md` (lista no §0.3); o resto da v2 continua valendo.

Evidência usada: `docs/diagnostico-sensacao-2026-10-24.md` (Íris, 3 lutas reais com teclado, tick a tick),
`docs/balanco-motor-v2.md` (harness CPU x CPU, 100 sementes), `docs/caio-capoeira-auditoria.md`, e o código
(`src/fight/fighter.ts`, `src/fight/cpu.ts`, `src/fight/game.ts`, `src/ui/cenas/fight.ts`, `src/render/cinematica.ts`,
`src/render/provocacao.ts`, `src/trailer/partida.ts`).

---

## 0. Contexto

### 0.1 O que o dono disse e o que decidiu

Ele jogou o build publicado e reprovou a sensação: "jogabilidade terrível de fraca", "combos totalmente sem sentido",
"filme de abertura com personagens robotizados". **Decisão dele: o motor v2 continua ligado e a correção vem por cima.**
A ordem de prioridade (Atlas, 24/10): **1º tempo de controle do jogador**, depois filme, combos, CPU e trailer.

### 0.2 Hipóteses declaradas

- Escala: jogo web/celular, partidas locais, sem rede. Não muda nada de arquitetura: são regras, dados e apresentação.
- Maturidade: produto publicado em teste, um dono jogando. Prazo curto, por isso a 1ª onda é só de UI e não mexe em hash.
- "Fraca" é sobretudo **tempo sem controle**, não dano. É o que a captura da Íris mostra (§1). O impacto do golpe
  (hitstop, faíscas) fica como fatia opcional, só se o dono ainda sentir "fraco" depois da onda 2 (R-17).

### 0.3 O que não muda e o que esta spec substitui

Não muda (critérios de aceite, não intenção):
- **Determinismo.** O motor continua lock-step; tudo novo fica atrás de flag. Com as flags novas desligadas, os hashes de
  hoje (`hashRegulares 05bf1b64b46008a0`, `hashChefes edb33ac1bc92fe9c`) e o snapshot `motor-v2-cpu.test.ts` ficam iguais
  **sem `-u`**. Com `?motorv2=0`, continua valendo o motor de antes, bit a bit.
- **Fidelidade.** Nada entra em `LutadorDef.especiais` dos 4 originais. Dados novos ficam em arquivo próprio, como
  `filmes.ts` e `apresentacao-especiais.ts`. O oráculo de pixel e os snapshots antigos passam sem `-u`.
- Decisão R-3 do dono (tarja no **início** do especial): continua. O que muda é que ela deixa de **congelar** a luta.
- Entrada no hitstop (V2-1), mola e interpolação (V2-2), tabela do filme (V2-3a), roteiros (V2-3b): continuam.

Substitui da v2:
- §3.1 "abre filme o 1º contato limpo de **todo** especial" → filme só no **super** e no **especial que dá KO** (§3.3).
- §5 "nada muda na tarja" → tarja sem congelar no especial comum, tarja que congela só no super (§3.2).
- §6.1 cadeia universal por `rank` sem teto → cadeia por **força**, até 4 golpes (§3.5).
- §6.2 "verificador = teto de dano" → o verificador também cobra **coerência** (§3.5.2).
- Trailer M2 (escalação por semente e pontuação) → **partitura** escrita (M3, campo `Tomada.inputs` que já existe) (§3.7).

---

## 1. Diagnóstico (1 página)

Medido pela Íris: 3 lutas de 1 round, ~30 s cada, bot de teclado contra a CPU real. **Sem controle: 44,6% da luta em
média (32,3% a 51,4%).** Com `?motorv2=0` deu 54,6%: o problema não nasceu com o v2. Ordem por impacto:

| # | Problema | Evidência | Por que dói |
|---|---|---|---|
| 1 | **Cerimônia antes de jogar.** A provocação do round 1 congela a luta por 4,9 a 7,4 s; depois vem a contagem (`introLen` 90 = 1,5 s). | Íris: provocação 20,1% e contagem 5,1% da luta | O jogador aperta e nada responde nos primeiros 6 a 9 s. A primeira impressão de qualquer luta é "o jogo não me obedece". |
| 2 | **A tarja congela a luta em todo especial**, seu e do rival, acerte ou erre: 48 ticks (0,8 s), também no meio de um combo. | Íris: 9,1% da luta (13,6% contra a DIFÍCIL); harness: 27 a 36 especiais por luta | O especial é o golpe que mais se usa e cada um tira o controle dos dois. Um combo `golpe › golpe › [0,8 s parado] › especial` deixa de ser combo. Em jogo de luta, a tela só para no super, e por pouco tempo. |
| 3 | **Intervalos longos no motor.** KO 100 + fim de round 175 + contagem 90 = 365 ticks (6,1 s) entre rounds; fim da luta 100 + 150 = 4,2 s, mais a provocação da vitória. | `game.ts:571-576`, `:328` | Numa melhor de 3, são mais de 12 s de espera fixa. |
| 4 | **O filme não dispara no jogo real.** 0 filmes em 46 acertos, com `motorV2.filmes` ligado; no harness são 11,4 por luta. | Íris §3; balanço §4; combo `hp › sFire › sFire` da MIN-JI (um filme teria consumido a execução e derrubado) | É defeito, e também mostra que **o harness não reproduz o jogo**: a calibração da V2-6 foi feita num jogo diferente do que o dono jogou. E se o filme funcionasse como a v2 manda (todo especial que conecta), seriam 11 cortes de ~1 s por luta. |
| 5 | **A cadeia universal é longa e cega.** Qualquer normal cancela em golpe de `rank` maior, no acerto **ou no bloqueio**, da hora do contato até o fim do golpe, com buffer de 9 ticks. Sai `lp ×3 › lk › hp › especial` (6 golpes). | `fighter.ts:794-803`; `game.ts:857` (`connected` também no bloqueio) | Apertar à toa vira "combo". Não há ordem de força que o jogador reconheça, nem confirmação. |
| 6 | **Combos próprios escolhidos por propriedade, não por lógica de golpe.** Força invertida (`hp › lk › hp`, `hp › clp › ESP`), chute fraco que lança (4 × `lk`), especial de contragolpe usado para fechar combo, o mesmo combo em dois lutadores. | `docs/combos-proprios.md`; a validação só olha o teto de dano | O nome promete uma história que o golpe não conta. É o "combo sem sentido" no sentido literal. |
| 7 | **A CPU não joga como pessoa.** Os planos são sorteados por faixa de distância e duram 8 a 24 ticks, daí a tremedeira. Encadeia golpes no bloqueio (`me.connected`), repete o mesmo especial (MIN-JI DIFÍCIL `sFwd` 4 vezes em 28,6 s), não pune golpe que erra (só pune a esquiva) e quase nunca combina: o maior combo que a Íris viu tinha 3 acertos. | `cpu.ts:320-341`, `:388-483`; Íris §4 | Parece robô: anda e para sem motivo, gasta especial no vazio e não castiga erro. |
| 8 | **O trailer é uma luta achada, não encenada.** É CPU x CPU com semente escolhida por pontuação. Os lutadores ficam na mesma guarda genérica e o P5 segura mais de 1,5 s num nocaute parado. | `tomadas.ts`; Íris §5 | A busca garante que a batida pedida aconteça, não que a cena faça sentido. O resultado é o "robotizado" que o dono viu. |

Fora daqui, já em andamento: a arte do CAIO (`docs/caio-capoeira-auditoria.md`, 12 créditos, sem mudar o frame data).
A guarda genérica do trailer depende em parte dela e da arte do WEI LONG (R-1 da auditoria).

---

## 2. A régua: princípios de jogo de luta 2D consagrado

1. **Tempo de controle.** O jogador tem a mão no lutador quase o tempo todo. Pausa de apresentação é exceção e se pode pular.
2. **Cinemática é rara.** Fica para o super e para a finalização. O especial comum é golpe, não cena.
3. **Cadeia por força, com cancelamento em janela.** Fraco › forte › especial (› super). Força que desce não encadeia,
   salvo num combo de assinatura, que é exceção nomeada.
4. **Confirmação do acerto.** Continuar o combo vale a pena quando o 1º golpe acertou. No bloqueio, para ou paga o risco.
5. **Combos curtos e legíveis.** 2 a 4 golpes, que o jogador decora, com dano escalonado (já existe: `escalaCombo`).
6. **Coerência de estilo.** O golpe, a sequência e o nome contam a mesma história do lutador.
7. **CPU que joga como gente.** Espaçamento com ritmo, defesa, punição de erro e variedade. Só combina depois de confirmar.

---

## 3. Regras novas

### 3.1 Tempo de controle por fase (prioridade 1)

"Sem controle" = tick em que nenhum dos dois pode agir. A tabela é o orçamento por fase. Cada linha tem dono e fatia.

| Fase | Hoje | Meta | Como | Onde mora | Fatia |
|---|---|---|---|---|---|
| Entrada na luta → "LUTE!" (round 1) | provocação 4,9 a 7,4 s + contagem 1,5 s | **≤ 2,5 s** | provocação CURTA **sobreposta à contagem** do motor (o balão aparece enquanto o `intro` corre); a COMPLETA só no 1º confronto do ARCADE e no chefão; qualquer botão pula a partir do tick 10 (regra de hoje) | UI (`provocacao.ts`, `fight.ts`); o motor roda o `intro` igual → **hash igual** | R-2 |
| Tarja do especial comum | 48 ticks congelados (0,8 s) | **0 s congelado** | a faixa aparece sem parar a luta (§3.2) | UI | R-2 |
| Super | não existe | **≤ 0,5 s** congelado (tarja de 30) + filme pulável se conectar | §3.2 e §3.4 | UI + motor | R-7, R-9 |
| Filme | 0 no jogo real (defeito); 11,4 por luta no harness | **≤ 1 por round em média**, sempre pulável | §3.3 | motor + UI | R-3, R-6 |
| KO → controle no round seguinte | 365 ticks (6,1 s) + provocação do round | **≤ 3,5 s** | `ko` 100 → 60, `roundend` 175 → 90, `intro` dos rounds 2+ 90 → 60; a provocação do round sobreposta à contagem | motor (flag `ritmo.intervalos`) + UI | R-6, R-2 |
| KO final → tela de vitória | 250 ticks (4,2 s) + provocação da vitória | **≤ 2,5 s** + vitória pulável a partir do tick 24 (regra de hoje) | `ko` 60 + `matchend` 90 | motor (mesma flag) | R-6 |
| Hitstop | ~4% (subamostrado) | **≤ 6%**, sem meta de corte | é sensação, não cerimônia: os dois guardam o aperto (V2-1) | – | – |
| Entrada do chefão | 270 completa / 60 curta | sem mudança (é rara e intencional), pulável | – | – | – |

A tela de "ROUND 1 / LUTE!" continua. A provocação continua (decisão do dono de 21/10) e só passa a dividir o tempo com a
contagem. `prefers-reduced-motion` (sem tarja hoje) o dono adiou e não entra na prioridade. A faixa sem congelar do §3.2
pode aparecer como esmaecimento, sem movimento, e isso resolve o caso de graça. Só entra se o dono pedir.

### 3.2 Tarja

| Caso | Hoje | Novo |
|---|---|---|
| Especial comum (início da execução, R-3 do dono) | congela 48; faixa de 132 px de altura no meio da tela | **não congela.** A mesma pintura da faixa (o cache de `cinematica.ts` já existe), a 0,55 da altura (~72 px), na **faixa de cima da tela, entre o HUD e as cabeças (y ≈ 64 a 140)**: não cobre corpo nem caixa. Fica 40 ticks na tela (entra 6, fica 28, sai 6), enquanto a luta corre |
| Especial repetido na mesma luta | igual | a mesma faixa, com 24 ticks |
| PARADE e GARKUWA (sucesso) | congela 48 | igual ao especial comum (não congela) |
| **Super** | – | **congela 30 ticks** com a tarja COMPLETA de hoje (132 px, escurecimento). O aperto dos dois fica guardado (como no hitstop) |
| Movimento reduzido | CURTA de 20 sem faixa | sem mudança agora (fora da prioridade) |

A geometria (não cobre os lutadores, cabe no celular deitado de 844 × 390) se prova **medindo no navegador** (skill
`medir-antes-de-afirmar`), não lendo o código.

### 3.3 Filme

**Regra nova: o filme só entra no super que conecta e no especial que dá o KO. E sempre se pode pular.**

| Situação | Filme | Modo | Motor |
|---|---|---|---|
| Super, 1º contato limpo | sim | COMPLETO na 1ª vez daquele super na luta, CURTO (30) depois | resolução atômica da v2 (§3.2/§3.3 dela): dano do super, queda, `recuperacao` |
| Especial comum cujo acerto zera a vida e **decide a luta** | sim | COMPLETO | o acerto resolve pelo caminho normal (dano normal); se ele dá KO, aplica-se o estado final da v2 §3.3 (defensor deitado em `ko` à `distancia`) e sai o evento `filme` com `motivo: 'ko'` |
| Especial comum cujo acerto dá KO de round | sim | CURTO | idem |
| Especial comum que não dá KO | **não** | – | caminho de acerto normal, com o dano dos dados de hoje (é o que o jogo real já faz, porque o filme não dispara) |
| Troca de barra do chefão | não | – | a cena da fase 2 continua sendo a cena |
| TREINO | só o super, CURTO | – | – |

- **Pular:** qualquer botão de ataque de um humano a partir do tick 6 (hoje 10). Seis ticks bastam para não engolir o
  aperto do combo que abriu o filme. O CPU x CPU (modo atrair) nunca pula, como hoje.
- **Defeito (R-3, antes de tudo):** achar por que o filme não dispara no jogo real. A ligação UI → `ConfigPartida`
  (`cfgMotorV2` em `select.ts`, `diff.ts` e `campanha.ts`) parece certa lida no código. A pista é a diferença entre o
  harness e o jogo. O critério é um teste que **falha hoje** no caminho real: cena de luta montada pela UI, especial
  limpo da CPU, `game.events` com `filme`. Enquanto o defeito existir, o balanço da V2-6 não vale para o jogo publicado.
  O R-6 regrava por cima de qualquer jeito, mas a causa tem que estar registrada.

### 3.4 Super (novo)

**Opções de comando (D-R1):**

| Opção | Comando | Prós | Contras |
|---|---|---|---|
| **A (recomendada)** | **SOCO FORTE + CHUTE FORTE juntos** (as duas bordas no mesmo tick ou com até 2 ticks entre elas) com a barra cheia (`en` = 100) | `InputFrame` (C2) não muda; no toque vira um botão SUPER que manda os dois; fácil de ensinar | se a barra não está cheia, sai o golpe de hoje; o arremesso (→ + SFT colado) perde para o super quando a barra está cheia |
| B | ESP com a barra cheia vira super sozinho | nenhum comando novo | o jogador gasta a barra sem querer; mata a escolha |
| C | meia-lua dupla + ESP | o clássico | inviável no toque; o `motion` de 18 ticks não cabe |

**Conteúdo (D-R2):** **1 super por lutador** (recomendo; NILA 1 por postura; ZENON 1 por fase). O super é a **versão
forte de um dos 3 especiais** que o lutador já tem, com o filme que já existe para ele: nenhuma arte nova. O Apolo
escolhe qual, pela coerência com o estilo (R-5). A alternativa, 3 por lutador (o especial da direção), dá mais conteúdo e
menos raridade.

**Contrato (motor, flag `ritmo.super`):**
- Dado novo `src/data/supers.ts`, fora de `LutadorDef` (fidelidade): `{ [lutador or 'lutador/ficha']: { golpe: 'sFire' |
  'sDown' | 'sFwd'; nome: string; dano: number; invulneravel?: number } }`, validado no boot como `filmes.ts`.
- Custo: a barra inteira (100). A esquiva continua gastando 20 da mesma barra.
- Cancelamento: entra a partir de qualquer normal que conectou (nível 4 da cadeia, §3.5). Especial → super fica fora
  (super cancel sai do MVP).
- Resolução: a do filme da v2 (atômica no 1º contato limpo). Bloqueado: 1 `block` com raspão, a barra vai embora (risco).
- Dano (proposta para o harness e o A/B do dono, D-R3): `dano` base = efetivo da tabela do filme v2 × 1,35, com teto
  próprio de 32 por golpe. Escala de combo e `TETO_COMBO` de 40% valem como hoje.
- Evento: `special` ganha `super?: true`; `filme` ganha `motivo: 'super' | 'ko'` (C3 aditivo).

### 3.5 Combos

#### 3.5.1 Cadeia universal no motor (flag `ritmo.cadeia`)

Níveis de força, derivados do `rank` de hoje (nenhum dado muda): **fraco** = `lp lk clp clk` (rank 1-2), **forte** =
`hp hk chp chk` (rank 3-4), **especial** (rank 9), **super**.

1. Cancela para nível **maior**: fraco › forte › especial; qualquer normal › super.
2. Fraco › fraco: no máximo 2 fracos seguidos (hoje são até 3 `lp` mais o `lk`).
3. Forte › forte: **só** dentro de um combo de assinatura reconhecido (§3.5.2).
4. Especial não cancela (como hoje).
5. **Janela e buffer não mudam** (do contato ao fim do golpe; buffer de 9). São generosos e ajudam no celular. Quem passa
   a confirmar é a CPU (§3.6). Para humano, cancelar no bloqueio continua permitido: é risco dele.

Resultado: a cadeia universal tem **no máximo 4 golpes** (`fraco › fraco › forte › especial`). A mais longa de hoje (6,
35,1 de dano) deixa de existir. A escala de dano continua a mesma.

#### 3.5.2 Combos próprios: forma e validação

Cada lutador (cada postura da NILA) tem **no máximo 2**:
- **BÁSICO:** `fraco › forte (semQueda) › especial`. É a mesma forma para todos: o jogador aprende uma vez e troca só o
  fecho. É a cadeia universal com o forte segurando em pé.
- **ASSINATURA:** uma sequência que a cadeia universal não permite, com propriedade coerente com o estilo.

Regras novas em `validarCombosProprios` e no verificador (falham no boot ou no teste, como hoje):

| # | Regra |
|---|---|
| V1 | força não desce na sequência (fraco ≤ forte ≤ especial) |
| V2 | `final` (`lanca`, `parede`, `cruza`) só em golpe **forte** |
| V3 | no máximo 3 fracos seguidos (só na assinatura) |
| V4 | duas assinaturas do jogo não podem ter os mesmos botões **e** o mesmo `final` |
| V5 | `cruza` só onde o golpe leva o corpo para o outro lado (o Apolo confere na arte) |
| V6 | especial de **contragolpe** ou de **defesa** não fecha combo (`contra`, `parry`, papel `defesa`) |

#### 3.5.3 Revisão dos 20 (F = fraco, T = forte, E = especial)

| id | hoje | forma | veredito | motivo / ação |
|---|---|---|---|---|
| `hayato-trovao-ascendente` | `clp › hk › sDown` | F›T›E | **manter** (básico) | – |
| `hayato-trovao-lancado` | `lk › clp › hp`, lança | F›F›T | **manter** (assinatura) | o soco forte que lança é coerente com o raio |
| `wei-long-ombrada-de-ferro` | `clp › hk › sFwd` | F›T›E | **manter** (básico) | – |
| `wei-long-palma-da-montanha` | `hp › lk › hp`, parede | T›F›T | **reescrever** → `lp › hp › hp`, parede | força invertida (V1); as "duas palmas pesadas" passam para o fim |
| `min-ji-rajada-de-seul` | `lk ×4`, lança | F×4 | **reescrever** → `lk › lk › hk`, lança | chute fraco não lança (V2); a contagem passa a 3 (nome do Apolo) |
| `min-ji-tornado-de-seul` | `lk › hk › sDown` | F›T›E | **manter** (básico) | – |
| `caio-ginga-rasteira` | `clk › clk › chk`, cruza | F›F›T | **manter** (assinatura) | aprovado na auditoria de capoeira; o aú na travessia é pendência de arte |
| `caio-meia-lua-encadeada` | `lk › hk › sFwd` | F›T›E | **manter** (básico) | – |
| `aminu-dambe-encadeado` | `lk › hp › hp`, parede | F›T›T | **manter** (assinatura) | as duas "lanças" do dambe |
| `aminu-leao-no-canto` | `lp › hk › sFwd` | F›T›E | **manter** (básico) | – |
| `centella-plancha-na-corda` | `lk › hk › ESP` | F›T›E | **manter** (básico) | – |
| `centella-chave-aerea` | `clp › clk › hp`, lança | F›F›T | **manter** (assinatura) | – |
| `camille-estocada-cruzada` | `lp › lk › hp`, cruza | F›F›T | **condicional** | só fica se o `hp` dela ler como flecha, a estocada que passa (V5); senão, descartar |
| `camille-riposte` | `clk › hk › sDown` (COUP D'ARRÊT) | F›T›E | **reescrever o fecho** | o COUP D'ARRÊT é golpe de parada, contragolpe (V6); fechar no especial de ataque dela (o Apolo escolhe); o nome TOUCHÉ fica |
| `nila-gaja-elefante-pesado` | `hp › clp › sFwd` | T›F›E | **reescrever** → `clp › hp › sFwd` | força invertida (V1) |
| `nila-sarpa-bote-veloz` | `lk › clp › clk › ESP` | F›F›F›E | **manter** (assinatura) | os três toques da serpente; único de 4 golpes |
| `baatar-quebra-base-encadeado` | `clk › hk › sDown` | F›T›E | **manter** (básico) | – |
| `baatar-esmagamento` | `lk › hp › hp`, parede | F›T›T | **descartar** | mesmos botões e mesmo final do AMINU (V4), e soco seguido não é a luta do bökh; substituto só se o Apolo achar um de agarrador dentro das regras |
| `zenon-tributo-do-arconte` | `clp › hk › sFwd` | F›T›E | **manter** (básico) | – |
| `zenon-decreto-cruzado` | `lk › lp › hp`, cruza | F›F›T | **condicional** | como o da CAMILLE: a troca de lado tem que vir de um golpe que puxa ou gira o rival (V5) |

**Placar: 13 mantidos, 4 reescritos, 2 condicionais, 1 descartado.** Os `id` dos mantidos não mudam. Os reescritos
mantêm o `id` se o Apolo mantiver o nome; senão ganham `id` novo, e o teste de nomes acompanha.

### 3.6 CPU (flag `ritmo.cpu`; com ela desligada, o RNG e os snapshots ficam idênticos)

| # | Regra | Parâmetro novo em `AI_LEVELS` (FÁCIL / NORMAL / DIFÍCIL) |
|---|---|---|
| CPU-1 | **Confirma antes de continuar.** Só continua a cadeia se o último contato foi **acerto** (o histórico do combo, não `connected`). No bloqueio, para. A decisão vem depois de um tempo de reação; se a janela fecha antes, o combo cai, como acontece com gente | `confirma`: 16 / 10 / 6 ticks |
| CPU-2 | **Combo por plano, não por sorteio a cada tick.** Confirmou: executa o BÁSICO ou a ASSINATURA inteira do lutador, e não um golpe de rank maior a esmo (`cpu.ts:320-341` sai com a flag) | `combo`: 0,15 (só 2 golpes) / 0,45 / 0,85 |
| CPU-3 | **Espaçamento com ritmo.** Fica na ponta do alcance do seu golpe mais longo e anda para frente e para trás em ciclos de 20 a 40 ticks, com histerese (não troca de direção antes de 16 ticks). Fim do plano de 8 ticks | `ciclo`: [30,48] / [22,40] / [18,32] |
| CPU-4 | **Defesa que se segura.** Depois de bloquear, segura a guarda pelo resto da sequência do rival (hoje decide a cada golpe) | usa `block` de hoje |
| CPU-5 | **Pune o erro.** Golpe do rival que errou ou foi bloqueado com recuperação ≥ o golpe mais rápido dela + 2 → pune com o BÁSICO ou com o forte | `punirErro`: 0 / 0,35 / 0,7 |
| CPU-6 | **Varia.** Memória dos últimos 3 especiais: repetir o mesmo cai à metade da chance a cada repetição | `variedade`: 0,5 nos três |
| CPU-7 | **Super só com motivo:** como fecho de combo confirmado, como punição, ou como antiaéreo se for invulnerável. Nunca no neutro, salvo 5% na DIFÍCIL | `superCru`: 0 / 0 / 0,05 |
| CPU-8 | **Especial cru é raro.** Projétil à distância com intervalo mínimo de 90 ticks; investida só para punir ou para fechar distância depois de projétil bloqueado | `intervaloProjetil`: 150 / 110 / 90 |

O FÁCIL fica fácil por reação lenta e por combo curto, não por andar à toa.

### 3.7 Trailer: coreografia por plano, sem busca de semente

- **O Apolo escreve a coreografia** de cada plano de luta em `docs/coreografia-trailer.md`: quem anda, quem bloqueia,
  qual combo (BÁSICO ou ASSINATURA, pelo nome), em qual tempo do compasso cada acerto cai, e qual pose de estilo cada
  lutador mostra (ginga do CAIO, guarda de esgrima da CAMILLE etc.). Cada plano mostra o estilo do lutador, e o trailer
  inteiro ensina os combos.
- **A Vega transforma a coreografia em entrada:** `src/trailer/partitura.ts` compila a partitura (golpe, tempo, direção)
  em `InputFrame` por tick e alimenta o `Game` pela `FonteEntradas`, com **os dois lutadores como humanos** (sem CPU e
  sem RNG da CPU). A `Tomada` usa o campo `inputs` que já existe (M3); `semente` e `cpu` deixam de ser escolhidas.
  `trailer:escalar` sai do fluxo (fica só como diagnóstico).
- **O CI confere** que cada batida da partitura acontece no tick declarado (`hit` do golpe certo) e a impressão final.
  Se um rebalanceamento escorregar uma batida, o teste diz qual. Reajustar o tempo é manual e barato.
- Até a partitura entrar, o trailer **fixa `ritmo: undefined`** em `src/trailer/partida.ts`, como a v2 fez.
- **Cerimônia no trailer:** no máximo **1 super com filme** (P1 ou P9) e 0 tarja congelada nos outros planos. Nenhum
  plano segura mais de 1 s parado: o P5 deixa de terminar em nocaute imóvel.

### 3.8 (Opcional, R-17) Impacto

Só se o dono ainda achar "fraco" depois da onda 2: hitstop por força (fraco 6, forte 9, especial 11; bloqueio 3/5),
faísca proporcional, empurrão no forte. Muda hash: fica atrás de `ritmo.impacto` e entra na mesma regravação.

---

## 4. Contratos

| Contrato | Mudança | Dono | Compatível? |
|---|---|---|---|
| `Regras.ritmo` (`src/meta/regras.ts`) | novo: `{ tarja, provocacao, intervalos, filmeRestrito, super, cadeia, cpu, impacto }` (booleans) | Vega (motor) + Lyra (UI) | sim; ausente = hoje |
| `ConfigPartida.ritmo` | só as 6 de motor (`intervalos, filmeRestrito, super, cadeia, cpu, impacto`), extraídas por `cfgRitmo(regras)` no molde de `cfgMotorV2` | Vega | aditivo; ausente = hash de hoje |
| URL | `?ritmo=0` desliga tudo (rollback); `?ritmo=tarja,provocacao,...` liga só essas (A/B), como `?motorv2=` | Vega | – |
| `InputFrame` (C2) | **nenhuma** (o super é `hp`+`hk`) | – | – |
| `EventoLuta` (C3) | `special.super?: true`; `filme.motivo: 'super' \| 'ko'` | Vega | aditivo |
| `src/data/supers.ts` | novo, fora de `LutadorDef` | Vega (formato) + Apolo (escolha e nome) | – |
| `combosProprios` | dado revisado (§3.5.3) + validações V1-V6 | Vega + Apolo | `id` estável nos mantidos |
| `AI_LEVELS` | campos novos do §3.6, lidos só com `ritmo.cpu` | Vega | sim |
| `Tomada.inputs` (M3) + `src/trailer/partitura.ts` | passa a ser usado | Vega | substitui semente e CPU no trailer |
| Contador `window.__ritmo` (DEV) | novo: ticks por motivo, por luta (§5.2) | Lyra | só DEV |

---

## 5. Portão de sensação e como provar

### 5.1 O portão (tudo medido; nada publicado como padrão sem passar)

| # | Medida | Meta | Limite (reprova) |
|---|---|---|---|
| G1 | Sem controle **dentro do round** (do LUTE! ao KO: tarja, flash, filme, cinemática e hitstop) | ≤ 10% | > 15% |
| G2 | Sem controle **na luta inteira** (da cena da luta até o KO final), melhor de 3, CPU NORMAL | ≤ 20% | > 25% |
| G3 | Orçamento por fase do §3.1 (pré-luta ≤ 2,5 s; entre rounds ≤ 3,5 s; tarja comum 0 s; super ≤ 0,5 s) | todos | qualquer um estourado |
| G4 | Pausas dentro do round: nenhuma > 1,2 s, salvo o filme do super ou do KO (pulável); 0 pausa entre dois golpes do mesmo combo, salvo o super no fim | 0 violação | ≥ 1 |
| G5 | Filme: dispara em 100% dos supers conectados e dos KOs por especial, e em 0% dos outros acertos, **no jogo real** | 100% / 0% | qualquer desvio |
| G6 | Combos da CPU que confirmam: cadeias de 2+ golpes que começam com acerto | ≥ 95% | < 90% |
| G7 | Combo confirmado da DIFÍCIL por round (2+ golpes, 1º acertou) | ≥ 1 | < 0,5 |
| G8 | Cadeia > 4 golpes fora de assinatura | 0 | ≥ 1 |
| G9 | Repetição: o mesmo especial em % dos especiais da CPU numa luta | ≤ 40% | > 50% |
| G10 | Supers por luta (os dois lutadores, harness) | 1 a 4 | 0 ou > 6 |
| G11 | Balanço (harness): duração do round ±20% da v2; pares fora de 42-58% ≤ 10 (não piora); chefões na rampa | todos | qualquer um |

### 5.2 Como provar com captura antes de publicar (Íris)

1. **Instrumento exato:** a Lyra põe na cena da luta (só DEV) um contador `window.__ritmo` que classifica **cada tick da
   cena**: `jogavel` (`game.update` chamado, fase `fight`, sem hitstop), `hitstop`, `tarja`, `flash-super`, `filme`,
   `provocacao`, `intro`, `ko`, `roundend`, `matchend`, `entrada-chefe`, `cena-chefe` (a pausa não conta). Isso substitui
   a amostra de 100 ms, que subamostra o hitstop.
2. **Método da Íris (já validado):** `git worktree --detach` isolado do commit a provar, `?manual=1` + `h.avancar(6)`,
   bot de teclado com eventos reais, gancho em `game.emitir`.
3. **Matriz:** 10 lutas **melhor de 3**: 1 FÁCIL, 3 NORMAL, 4 DIFÍCIL (cobrindo os 10 lutadores), 2 versus (bot x bot),
   mais 1 ARCADE até um chefão (G3 separado para a entrada). Com o bot fazendo o BÁSICO de cada lutador para G5.
4. **Duas medidas:** antes (HEAD) e depois, no mesmo método. Harness com a fórmula nova
   (`flashes × 30 + filmes × duração + fases do motor exatas`) para G10-G11.
5. **Para o dono ver:** montagem de quadros de uma luta inteira e 1 GIF de combo BÁSICO e de super, como as do diagnóstico.
6. **Prévia antes do padrão:** cada onda vai para produção **desligada**. O dono joga com `?ritmo=1` no site publicado.
   Só com o OK dele a flag vira padrão; o rollback é `?ritmo=0`. Uma publicação só, e o A/B fica na mão do dono.

---

## 6. Fatias (numeradas, com dono e dependência)

**Onda 1: só UI, sem mudar hash; publicável sozinha. É a que mais devolve controle.**

| # | Fatia | Dono | Depende de | Critério de aceite |
|---|---|---|---|---|
| R-1 | contador `__ritmo` por tick e motivo (DEV) | Lyra | – | soma dos motivos = ticks da cena; teste unitário da classificação |
| R-2 | tarja sem congelar (§3.2), provocação sobreposta à contagem e COMPLETA só no 1º confronto do ARCADE e no chefão (§3.1), flag `ritmo.tarja/provocacao` | Lyra (Apolo aprova a faixa) | R-1 | com as flags ligadas, `hashRegulares`, `hashChefes`, `motor-v2-cpu` e oráculo **iguais sem `-u`**; faixa medida no navegador sem cobrir os lutadores em 960×540 e 844×390; pré-luta ≤ 2,5 s no contador |
| R-3 | **defeito do filme**: por que não dispara no jogo real | Vega | – | teste que falha hoje no caminho da UI; causa raiz registrada; harness e jogo concordam na contagem de `filme` para a mesma partida |
| R-4 | prova da onda 1 (§5.2, G1-G4) → prévia do dono | Íris | R-1, R-2 | veredito APROVADO/REPROVADO com o contador, antes e depois |

**Onda 2: motor (flags `ritmo.*`), uma regravação só no fim.**

| # | Fatia | Dono | Depende de | Critério de aceite |
|---|---|---|---|---|
| R-5 | escolha do super por lutador e nome; nomes dos reescritos; veredito dos 2 condicionais (com captura do `hp`) | Apolo | – (anda já) | tabela em `docs/combos-proprios.md` e lista de supers com motivo de estilo |
| R-6 | intervalos (`ko` 60, `roundend` 90, `intro` dos rounds 2+ 60, `matchend` 90) + filme restrito (super/KO) | Vega | R-3 | testes por linha da tabela do §3.3; flag desligada = hashes de hoje sem `-u` |
| R-7 | super no motor + `supers.ts` + evento | Vega | R-5, R-6 | `hp`+`hk` com barra cheia sai o super em 0, 1 e 2 ticks de diferença, e não sai com 3 ou com `en` < 100; bloqueado = 1 `block` e barra zerada; filme `motivo: 'super'`; esquiva e arremesso sem regressão |
| R-8 | cadeia por força (§3.5.1) + dado dos combos revisado + V1-V6 no boot e no verificador | Vega | R-5, R-7 | a cadeia de 6 de hoje falha e a de 4 passa; 20 → 19 ou menos combos, todos no verificador em pé e agachado; teste de cada regra V |
| R-9 | UI do super: botão SUPER no toque (manda `hp`+`hk`), barra cheia acesa, tarja de 30, modos do filme (§3.3), pular a partir do 6; lista de combos BÁSICO/ASSINATURA no TREINO e no "Como jogar" | Lyra | contrato do §4; integra depois do R-7 | botão medido no celular deitado; e2e do super no jogo real; G5 no e2e |
| R-10 | CPU (§3.6) | Vega | R-7, R-8 | G6, G7, G9 e G10 no harness; snapshot novo `ritmo-cpu.test.ts`; os antigos sem `-u` |
| R-11 | portão completo (§5) | Íris | R-6 a R-10 | G1-G11 com veredito |
| R-12 | regravação (harness em `docs/balanco/ritmo/`, `danoRecebido` dos chefões, hashes novos) → prévia do dono → padrão | Vega + Íris | R-11 | hash novo igual antes e depois do ajuste de chefão (regra da V2-6); o dono aprova jogando |

**Onda 3: trailer.**

| # | Fatia | Dono | Depende de | Critério de aceite |
|---|---|---|---|---|
| R-13 | coreografia por plano (`docs/coreografia-trailer.md`) | Apolo | R-5 (pode começar já; os tempos fecham depois do R-8) | cada plano com estilo, combo nomeado e tempo no compasso; nenhum plano com mais de 1 s parado |
| R-14 | `partitura.ts` (compila em `InputFrame`), `Tomada.inputs`, validação das batidas no CI | Vega | R-12 (motor final) | as batidas caem no tick declarado; a impressão confere; nenhuma semente ou CPU escolhida por busca |
| R-15 | o diretor toca a partitura; 1 super com filme; `ritmo` tirado do `undefined` em `partida.ts` | Lyra | R-14 | contato de quadros sem guarda genérica repetida (ressalva: arte do CAIO e do WEI LONG); orçamento de memória do trailer sem regressão |
| R-16 | prova do trailer + reaprovação do dono | Íris | R-15 | captura de quadros e GIF por plano |
| R-17 | (opcional) impacto §3.8 | Vega + Lyra | depois do R-12, só se o dono pedir | mesma regravação, flag própria |

Paralelo: R-1/R-2 (Lyra) ∥ R-3 (Vega) ∥ R-5 e R-13 (Apolo). A Vega faz R-6 → R-7 → R-8 → R-10 em série, porque mexe
no mesmo trecho (`applyHit`, cancelamento, `cpuInput`). A Lyra entra no R-9 com um gancho DEV de evento `special.super`
falso enquanto o R-7 não chega.

---

## 7. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| K1 | O harness não reproduz o jogo (o filme dispara num e não no outro): a calibração da V2-6 não vale no publicado | **Certa hoje** | Alto | R-3 antes de qualquer balanço; G5 medido no jogo real, não só no harness |
| K2 | A barra é dividida com especial e esquiva, e o super quase não sai | Média | Médio | G10; ajuste no custo dos especiais só por decisão do dono (D-R4) |
| K3 | A tarja de 30 do super avisa o rival (o A7 de antes) | Alta | Baixo | aceito: é a tensão clássica do super; `invulneravel` do super em dado |
| K4 | A faixa sem congelar cobre o HUD ou a cabeça do lutador alto (BAATAR, ZENON a 0,9) | Média | Médio | medir no navegador nos 10, nas duas resoluções |
| K5 | A provocação por cima da contagem embola com o "ROUND 1" | Média | Baixo | balão à altura da cabeça, contagem no centro; medir |
| K6 | A partitura do trailer é frágil a rebalanceamento | Média | Baixo | o CI aponta a batida; o reajuste é manual e de minutos |
| K7 | O botão SUPER aperta a tela de toque | Média | Médio | medir; alternativa: o botão aparece só com a barra cheia |
| K8 | Combos removidos ou reescritos quebram nomes e testes de tela | Certa | Baixo | `id` estável nos mantidos; `combos-nomes.test.ts` segue o dado |
| K9 | Intervalos menores cortam som e locução do KO | Média | Baixo | conferir `sonsDoEvento` e a música no R-6 |

Dívidas conscientes: o viés do P1 no mesmo tick (v2 §3.1) continua; super cancel a partir do especial fica fora; o
movimento reduzido sem faixa fica para depois (decisão do dono).

---

## 8. Decisões do dono

| # | Decisão | Minha recomendação |
|---|---|---|
| **D-R1** | Comando do super | A: SOCO FORTE + CHUTE FORTE com a barra cheia, e um botão SUPER no toque |
| **D-R2** | 1 super por lutador ou 3 (um por especial) | 1, escolhido pelo Apolo pela coerência do estilo |
| **D-R3** | Dano do super | partir de 1,35 × o filme v2, teto 32, e fixar depois do A/B |
| **D-R4** | Mexer no custo dos especiais (hoje 20 a 45) | não na 1ª rodada; só se G10 reprovar |
| **D-R5** | Filme no KO de round (CURTO) ou só no KO da luta | nos dois: CURTO no round, COMPLETO na luta |
| **D-R6** | Aprovar a revisão dos 20 (§3.5.3) | sim |
| **D-R7** | Trailer por partitura no lugar da escalação | sim, com 1 super com filme |
| **D-R8** | Provocação COMPLETA só no 1º confronto do ARCADE e no chefão | sim; no resto, CURTA por cima da contagem |

D-V4, D-V5 e D-V6 da v2 ficam absorvidas pelo §3.3 (repetição CURTA, TREINO CURTO, 1 filme no trailer).

---

## 9. O que provei e o que só inferi

- **Medido por outros, lido por mim:** os tempos por fase, os 0 filmes em 46 acertos, a repetição do `sFwd` e o P5
  (Íris); especiais e filmes por luta e o tempo parado estimado de 43,7% (harness).
- **Lido no código, sem rodar:** a duração das fases (`introLen` 90, `ko` 100, `roundend` 175, `matchend` 150); a tarja
  de 48 e a altura de 132; a cadeia por `rank` com cancelamento também no bloqueio (`connected` em `game.ts:857`); a CPU
  encadeando pelo `connected`; o `Tomada.inputs` previsto e não usado; a ligação `cfgMotorV2` → `ConfigPartida`, que
  parece certa (por isso o defeito do filme fica com a Vega, com teste).
- **Inferido, sem medir:** que a onda 1 sozinha deixa G1 perto de 6% (hoje tarja + hitstop são ~13% da luta e ~19% do
  round); que a onda 2 dá G2 perto de 19% numa melhor de 3; que 1,35 × é um dano de super razoável; os parâmetros de CPU
  do §3.6. São pontos de partida para o portão, não resultado.
