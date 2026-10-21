# Spec: provocação antes do round e provocação da vitória

Autora: Nova (arquitetura). Data: 2026-10-21. Base: HEAD `0db7120`. Situação: **proposta, nada implementado.**
Textos: o Apolo escreve em `docs/textos-provocacao.md`, no formato da §7.3.

## Decisões do dono (2026-10-21) — valem POR CIMA do resto desta spec

Onde o texto abaixo disser o contrário, vale esta lista. Respondem às decisões em aberto D-P1 a D-P6 (marcadas no fim do documento).

1. **VERSUS de 2 jogadores TAMBÉM tem provocação** (D-P1). As tabelas das §5.1 e §0/H4 que excluem o VERSUS ficam invertidas: a
   `provocacaoLigada` só exclui TREINO, CPU×CPU, `?expansao=4` e o pré-round do chefão. Qualquer um dos dois jogadores pula.
2. **Opção própria "PROVOCAÇÕES"**, separada da cinemática (D-P2, alternativa B): `Configuracoes.provocacoes?: 'ligadas' | 'desligadas'`,
   padrão **ligadas**, campo aditivo na v2 (sem bump). Substitui o reuso da "CINEMÁTICA DO ESPECIAL" da §5.2: a cinemática do especial
   NÃO desliga a provocação e vice-versa. O que continua vindo da cinemática é só o modo COMPLETA/CURTA/reduzido da apresentação
   (a P2 decide como combinar), mas ligar/desligar é a preferência nova.
3. **Poses atuais, sem arte nova** (D-P4): `win`/`walk`/`idle` e os extras de BAATAR e ZENON. A P6 não será encomendada agora.
4. **ZENON vencendo usa o balão novo** (D-P3): a legenda de vitória dele deixa de aparecer no `matchend` e o balão da vitória (com a
   fala dele em `falasDe('zenon').vitoria`) entra no lugar.
5. **Provocação em todo round, do 2º em diante, curta** (D-P5): 1 linha, cerca de 2 s, sem restringir ao round decisivo.
6. **Round 1: o P1 fala primeiro** e o P2 responde (D-P6, como já estava na §3.1).

Efeitos no código da P1: `src/data/provocacoes.ts` (tipos, escolha, validação no import), `src/data/provocacoes.pt-BR.ts` (textos
PROVISÓRIOS), `Contexto.sorteioDeFalas` (semente + 5), `Configuracoes.provocacoes` + saneamento em `src/core/storage.ts`.

## 0. Pedido e hipóteses

**Pedido do dono.** Antes de cada round, os lutadores entram na arena e falam (texto na tela) em tom provocativo, instigando a
luta. Cada lutador tem o próprio texto, com cara de jogo profissional. No fim da luta, quem vence provoca o perdedor, com animação.

**Hipóteses declaradas** (se alguma estiver errada, a §11 diz o que muda):

- H1. O round 1 é o momento teatral: os dois entram andando e falam um de cada vez, em **5 a 6,5 s** (teto de 7 s), e qualquer
  ataque, ENTER ou toque pula. Do round 2 em diante, **um balão só, com 1 linha, em cerca de 2 s**. Em melhor de 3, isso dá no
  máximo +4 s de conversa na luta inteira, sem contar o round 1.
- H2. Escala de conteúdo: 10 lutadores × (3 aberturas + 2 revanches + 3 vitórias) ≈ 80 falas. Não há voz, só letreiro e
  "blips" sintetizados.
- H3. É apresentação: não muda resultado, dano nem tempo de luta. Então **fica fora do motor e do lock-step**, pelo mesmo padrão
  da entrada do ZENON (`src/render/entrada-chefe.ts`) e da cinemática do especial (`src/render/cinematica.ts`).
- H4. Segue o briefing do Atlas: roda no **ARCADE** e na **LUTA vs CPU**. Fica desligada no TREINO, no VERSUS 2 JOGADORES, no
  CPU×CPU (só existe nos testes) e em `?expansao=4`. O VERSUS vai como decisão em aberto (D-P1).

## 1. O que já existe e é reaproveitado

| Peça | Onde | Como entra |
|---|---|---|
| Padrão "a cena não chama `game.update`" | `CenaFight.update()` (`src/ui/cenas/fight.ts`, ramo `entrada.ativa`) | A provocação é o 3º controlador desse tipo, com a mesma API: `iniciar / ativa / avancar / pular / zerar / desenhar` |
| Linha do tempo pura do tick + pulo com saída ≤ 6 ticks | `linhaDaEntrada`, `PULO_VALE_A_PARTIR_DE`, `SAIDA_AO_PULAR` | Mesmas constantes e o mesmo formato (`linhaDaProvocacao(roteiro, tick, pulouEm)`) |
| Faixas de cinema e som delas | `ALTURA_DA_FAIXA`, `SOM_DAS_FAIXAS` | Round 1 COMPLETA e vitória COMPLETA |
| Pose imposta por índice | `OpcoesMundo.poses` (`src/render/mundo.ts`) | Pose de quem fala, de quem ouve e da andada |
| HUD desligável | `OpcoesMundo.hud` | Round 1 COMPLETA e vitória COMPLETA |
| Tabela de apresentação por lutador | `APRESENTACAO` (`src/render/apresentacao-lutadores.ts`) | Ganha `provoca?: CenaDef`. A `vitoria` que já existe (BAATAR, ZENON) vira a animação da vitória |
| Pílula de legenda | `desenharLegenda` (`src/render/legenda.ts`) | O balão novo é o "irmão" dela (mesma fonte `texto()`, mesma moldura dourada). A legenda do chefão fica como está |
| Quebra de linha medida | `textoQuebrado` (`src/render/texto.ts`) | A quebra do balão usa a mesma regra com `measureText`, só que calculada UMA vez no `iniciar`, não a cada quadro |
| Preferência de cinemática + movimento reduzido | `modoDaCinematica`, `cinematicaResolvida`, `ui.c.reduzirMovimento` | Decide COMPLETA / CURTA / nada (§5) |
| Desligar por regras | `Regras.cinematica` (false em `?expansao=4`) | A mesma chave desliga a provocação. Nenhum campo novo em `Regras` |
| Música a 50% | `CenaFight.baixarMusica` | Durante os balões |
| Gancho de e2e para pular | `PULAR_ENTRADA` (`tests/e2e/_chefe.ts`) | Um irmão: `SEM_PROVOCACAO` |
| RNG separado da lógica | `sorteioDaSelecao` (semente + 4) em `src/ui/contexto.ts` | Precedente para `sorteioDeFalas` (semente + 5) |

**O que não existe e é novo:** o balão de fala, o deslocamento visual dos lutadores (a andada), o zoom de apresentação, o
desligamento só do overlay (`ROUND N`) sem desligar o HUD, e a tabela de falas.

## 2. A regra central: apresentação pura, fora do lock-step

**Regra P0.** A provocação **nunca** chama `game.update`, nunca usa `game.rng`, nunca emite `EventoLuta` e não altera nenhum
campo do `Game`/`Fighter`, **com uma única exceção**: no fim da provocação da vitória, a cena escreve `game.matchDone = true`. É
exatamente o que o ENTER já faz hoje em `CenaFight.key()` (`game.phase === 'matchend' && game.t > 40`), então não há caminho novo
no motor.

Como cada momento congela o motor:

| Momento | Gatilho na cena | Estado do motor congelado | Por que é seguro |
|---|---|---|---|
| Round 1 | Antes do 1º `game.update` (o mesmo lugar do `entradaPendente`) | `phase 'intro'`, `t 0`, `tick 0`. O `round start` continua em `pendentes` | Idêntico à entrada do chefão. O evento pendente sai no 1º update, como numa luta sem provocação |
| Round ≥ 2 | No laço de `game.events`: `tipo 'round'`, `fase 'start'`, `round ≥ 2` → fica pendente para o próximo `update()` da cena | `phase 'intro'`, `t 0` (o `startRound(false)` já resetou posições e vida) | O motor só para entre dois ticks. A sequência de ticks e de RNG da luta é a mesma, só que mais tarde no relógio de parede |
| Vitória | Depois do `game.update`: `phase 'matchend'`, `t ≥ 56`, vencedor no estado `win` (ou `t ≥ 100`, garantia) | `phase 'matchend'`, `t 56..100` | A luta já está decidida. O fim chega pelo `matchDone`, o mesmo efeito do ENTER |

Consequência que vale para a revisão: **nenhum arquivo em `src/fight/**` muda.** O snapshot CPU×CPU e `luta-fidelidade` passam
sem `-u`. O CPU×CPU roda o motor direto, sem a `CenaFight`, então nem passa pela provocação.

Os sons saem por `tocarReceita` direto, chamados pelo controlador, como os da entrada. **`audio/eventos.ts` não muda**, porque o
lock-step com o protótipo compara sons de evento.

## 3. Linha do tempo (60 ticks = 1 s)

Fórmula de leitura (pura, testável). `n` = caracteres da fala já com `{rival}` trocado:

- COMPLETA: `duracaoDoBalao(n) = clamp(24 + round(2,5·n), 84, 190)`. Isso dá 40 car. = 124 ticks (2,1 s) e 56 car. = 164 ticks (2,7 s).
- Revanche COMPLETA: a mesma fórmula com teto 126.
- CURTA: `clamp(20 + round(1,6·n), 72, 120)`.
- Revelação letra a letra: 1,5 letra/tick na COMPLETA. Na CURTA e com movimento reduzido, o texto entra inteiro com fade de 8 ticks.

### 3.1 Round 1, COMPLETA (só na primeira vez deste confronto, §5.2)

| Tick | O que acontece | Som |
|---|---|---|
| 0–20 | Faixas de cinema entram (56 px). HUD e overlay escondidos | `SOM_DAS_FAIXAS` |
| 0–40 | **Andada:** P1 entra de `dx = −260` e P2 de `dx = +260` até 0 (easeOut), na pose `walk0..7` (1 quadro a cada 5 ticks). Parados, os dois ficam em `idle0..3` | — |
| 44 | Balão do **P1** abre (pop de 8 ticks: escala 0,85 → 1 e alfa). O P1 vai para a pose `provoca` (§6). O P2 continua em `idle` olhando | `SOM_DO_BALAO` |
| 44 → 44+D1 | Letra a letra. Um "blip" a cada 3 letras que não são espaço, no tom do lutador (`ch.pitch`) | `blip(pitch)` |
| 44+D1 | Balão do P1 fecha (6 ticks). O P1 volta para `idle` | — |
| 54+D1 | Balão do **P2** abre, a pose do P2 vira `provoca` | `SOM_DO_BALAO`, blips |
| 54+D1+D2 | Balão do P2 fecha (6) e as faixas saem (20) | — |
| fim = 80+D1+D2 | O controlador desliga. A cena volta a chamar `game.update`. O motor faz a `intro` de sempre (ROUND 1 por 90 ticks → FIGHT!) | — |

Com falas de 40 a 56 caracteres, o total fica em **5,5 a 6,8 s**. O teto vem da própria fórmula: 80 + 190 + 190 = 460 ticks (7,7 s), só se as duas falas tiverem o máximo de 64 caracteres. Por isso o alvo de redação é ≤ 56.
**Ordem de fala:** o P1 (o desafiante) fala primeiro e o P2 (o dono da casa: a arena é a do `c2`) responde. As falas são
independentes e não dialogam entre si. Isso evita escrever N² pares. O diálogo de verdade fica opcional, por `contra` (§7).

A pose de ENTRADA da `APRESENTACAO` (devekh do BAATAR, entrada0..2 do ZENON jogável) **continua na `intro` do motor**, depois da
provocação, como hoje. A provocação não a repete.

### 3.2 Round 1, CURTA (preferência CURTA, ou confronto repetido: continue, reinício)

| Tick | O que acontece |
|---|---|
| 0 | Sem faixas e sem andada. HUD visível, overlay (`ROUND 1`) escondido. Os **dois balões abrem juntos** (P1 à esquerda, P2 à direita: com os lutadores em x 270 e 690, os balões de até 400 px não se encostam), com o texto inteiro e fade de 8 |
| 0 → D | `D = duracaoCurta(max(n1, n2))`, 72 a 120 ticks (1,2 a 2 s) |
| D → D+6 | Os dois fecham. A `intro` do motor segue |

### 3.3 Round ≥ 2, COMPLETA (na CURTA não existe)

| Tick | O que acontece |
|---|---|
| 0 | O motor está na `intro t 0`, com os dois já na posição inicial. HUD visível (vida cheia, bolinhas de round atualizadas: é o contexto da provocação). Overlay escondido |
| 0–8 | Abre **um balão** de **1 linha** (≤ 34 caracteres). Quem fala é **quem perdeu o round anterior** (categoria `revanche`, ou `decisivo` se os dois estão a 1 vitória do fim). Empate no round anterior: P1 nos rounds ímpares, P2 nos pares |
| 8 → D | Revelação + leitura, D ≤ 126 (cerca de 2 s) |
| D → D+6 | Fecha. A `intro` (ROUND N → FIGHT!) segue |

### 3.4 Vitória, COMPLETA

O motor entra em `matchend` com `t 0`. O título "X VENCE!" aparece com o zoom de sempre e, depois de `t > 50`, vem "VITÓRIA
FINAL". **A provocação começa em `t ≥ 56`** e, só depois disso, quando o vencedor está em `win` (garantia: `t ≥ 100`). Daí para frente o motor congela.

| Tick | O que acontece | Som |
|---|---|---|
| 0–14 | Faixas entram, HUD e overlay somem. **Push-in:** zoom de apresentação de 1,00 para 1,08, ancorado no chão e centrado no x do vencedor (40 ticks, easeOut) | `SOM_DAS_FAIXAS` |
| 0 → fim | O vencedor anima: a `APRESENTACAO.vitoria` dele, se houver (BAATAR `devekh0 → win`, ZENON `vitoria0 → vitoria1`), pelo relógio do controlador. Se não houver, `provoca` → `win`. O perdedor fica como o motor deixou (no chão por KO, ou de pé, cansado, por tempo) | — |
| 16 | Balão do vencedor abre, apontando para a cabeça dele | `SOM_DA_VITORIA` (arpejo curto) |
| 16 → 16+D | Letra a letra + blips | `blip(pitch)` |
| 16+D → 46+D | Fala inteira na tela. O indicador "▶" pisca no canto do balão (pressione para seguir) | — |
| 46+D → 64+D | Balão fecha (6) e faixas saem (12) | — |
| fim | A cena faz `game.matchDone = true` e chama `finish()` **no mesmo tick, sem `game.update`** | — |

Com uma fala de 48 caracteres, são cerca de 3,5 s depois do "VITÓRIA FINAL". Hoje o `matchend` leva 2,5 s ao todo.

### 3.5 Vitória, CURTA

Sem faixas e sem zoom. HUD e overlay ficam (o balão está na faixa de cima e o título no meio, então não se cruzam). O balão
abre inteiro com fade, dura `duracaoCurta(n)`, fecha em 6 ticks e vem o `matchDone`.

## 4. Pular, pausa e entrada

- **Pular:** a borda de qualquer ataque/ESP de um humano (`alguemPulou()`, a mesma da entrada; na LUTA vs CPU ela lê o mapa
  mesclado), ENTER (`key()`) ou **toque/clique no canvas** (`click()` quando não está pausado). **Um** pulo encerra a provocação
  INTEIRA (os dois balões), não só o balão da vez. É a mesma regra da entrada do chefão e da cinemática.
- **Quando vale:** depois do tick 10 antes do round, para não engolir o ENTER que confirmou o VS. Na vitória, só depois do tick
  24, porque quem acabou de dar o KO costuma estar martelando ataque. A saída leva no máximo `SAIDA_AO_PULAR` (6) ticks. Ao
  pular a vitória, vem o `matchDone` no fim da saída.
- **Pausa:** ESC/P funcionam como hoje (`update()` retorna antes). `blur` pausa. Retomar não reinicia a provocação.
- **Reiniciar luta** (menu de pausa) zera o controlador (`zerar()` no `enter`) e conta como confronto repetido (§5.2).
- **Sem eco de controle:** o motor congelado não lê entrada (`inputs()` só lê em `'fight'`). As bordas consumidas durante a
  provocação não viram golpe no 1º tick de luta, porque o `fimDoTick` da entrada continua rodando no laço principal. **A Lyra
  confirma isto num unit**, não por suposição.

## 5. Quando roda e em que modo

### 5.1 Ligada ou não (função pura `provocacaoLigada`)

| Situação | Pré-round | Vitória |
|---|---|---|
| `regras.cinematica === false` (`?expansao=4`) | não | não |
| TREINO | não | não (não há fim de luta) |
| VERSUS 2 JOGADORES | não (D-P1) | não (D-P1) |
| CPU×CPU (`p1cpu` e `cpu` não nulos) | não | não |
| ARCADE e LUTA vs CPU, rival comum | sim | sim, quem vence fala (inclusive a CPU: perder e ser provocado incentiva o *continue*) |
| Luta de **chefão** (`cfg.chefe`) | **não**: a entrada dramática do ZENON fica intacta e é o round 1 dele | O jogador vence: sim. A fala de derrota do ZENON (legenda) aparece no KO e no `matchend` até `t 56`, e o balão do jogador entra depois. O ZENON vence: **balão novo, sem a legenda antiga** (decisão do dono, D-P3): a legenda de vitória dele deixa de aparecer e o balão usa `falasDe('zenon').contra[perdedor].vitoria` (cai em `zenon.vitoria`) |
| ZENON **jogável** (não chefão) | sim, com as falas dele | sim |
| Partida sem vencedor (`matchWinner === null`) | — | não |

### 5.2 COMPLETA, CURTA ou nada (função pura `modoDaProvocacao`)

`pref = settings.cinematica ?? (reduzMovimento ? 'curta' : CINEMATICA_PADRAO)`, a mesma resolução de `cinematicaResolvida`.

| `pref` | Round 1 | Round ≥ 2 | Vitória |
|---|---|---|---|
| `completa` | COMPLETA na 1ª vez do confronto, CURTA se repetido | COMPLETA (1 balão) | COMPLETA |
| `curta` | CURTA | nada | CURTA |
| `desligada` | nada | nada | nada |

"Confronto repetido" = a mesma chave `c1|c2|stage` da luta anterior nesta sessão da `CenaFight`, ou seja, *continue* do ARCADE e
REINICIAR LUTA. É memória da cena, não do `run`: não mexe em `ArgsFight` nem no storage.

**Movimento reduzido** (`ui.c.reduzirMovimento()`, que é o mesmo `matchMedia`; a `CenaFight` deve parar de duplicar a consulta)
vale **por cima** do modo: sem andada (`dx = 0` em todos os quadros), sem pop de escala, sem push-in (zoom 1) e sem "▶" piscando
(fica fixo). O texto entra inteiro com fade. **As durações não mudam**, porque o tempo de leitura é o mesmo.

> Atenção: hoje a preferência se chama "CINEMÁTICA DO ESPECIAL" na tela de opções. Por isso este reuso é decisão do dono (D-P2):
> renomear a linha para "CINEMÁTICAS", ou criar uma opção própria "PROVOCAÇÕES".

## 6. Poses: o que existe e o que falta

Levantamento nos `atlas.json` reais (2026-10-21):

| Lutador | `idle0-3` / `walk0-7` | `win` | Extras de apresentação |
|---|---|---|---|
| hayato, min-ji, aminu, camille, centella | sim | sim | nenhum |
| caio, wei-long | sim (+ nomes antigos) | sim | nenhum |
| nila | sim | sim | `sarpaIdle0-3` (postura SARPA) |
| baatar | sim | sim | `devekh0-2` (entrada/vitória) |
| zenon | sim | sim | `entrada0-2`, `vitoria0-1`, `cena0-2` |

Poses usadas, todas existentes, **sem arte nova obrigatória**:

| Papel | Pose | Fonte |
|---|---|---|
| Andada | `walk0..7` | todos |
| Ouvindo / parado | `idle0..3` (1 quadro a cada 8 ticks) | todos |
| Falando antes do round (`provoca`) | `APRESENTACAO[id].provoca` se houver; senão o alias global `provoca0 → win` | BAATAR: `devekh2`; ZENON: `entrada2` (aperta a tira sorrindo); demais: `win` |
| Vencedor | `APRESENTACAO[id].vitoria` se houver; senão `[provoca0, win]` | BAATAR e ZENON têm; os outros caem em `win` |

Mecânica: acrescentar `provoca0` e `provoca1` ao `ALIAS` de `src/data/poses.ts` (`provoca0: 'win'`, `provoca1: 'win'`). Quando o
Apolo entregar os quadros, eles vencem o alias pela cadeia de `getPD`, **sem mudar código**. O motor nunca pede esses nomes, então o
alias não toca o lock-step. A Íris confere isso com grep: nenhum `provoca` em `src/fight/**`.

**Lacunas de arte** (opcionais, fase P6). Com elas o jogo fica com cara de produto pronto:

1. `provoca0`/`provoca1` (gesto de chamar "vem", apontar, estalar o pescoço), 2 quadros × 8 lutadores (todos menos BAATAR e
   ZENON). Uma linha de folha por lutador, no pipeline de sempre (ancoragem pelos pés, chave magenta).
2. `vitoria0`/`vitoria1` próprias para os 8 lutadores sem pose de vitória dupla. Hoje eles ficam parados no `win` e a animação é o
   push-in + balão.
3. Sem arte nova, `pre-round` e `vitória` usam o mesmo `win` para 8 dos 10 lutadores. Funciona, mas repete. Este é o argumento a
   favor da P6.

## 7. Contrato de dados das falas

### 7.1 Tipos (`src/data/provocacoes.ts`)

```ts
/** Um balão. Pode ter `{rival}` (vira o `ch.name` do oponente). "\n" força a quebra. */
export type Fala = string;

export type FalasDeProvocacao = {
  /** Round 1. ≥ 3 variantes. ≤ 2 linhas, ≤ 64 caracteres (alvo 40-56). */
  readonly abertura: readonly Fala[];
  /** Round ≥ 2, quem perdeu o round anterior. ≥ 2 variantes. 1 linha, ≤ 34 caracteres. */
  readonly revanche: readonly Fala[];
  /** Round decisivo (os dois a 1 vitória do fim). Opcional: ausente usa `revanche`. 1 linha, ≤ 34. */
  readonly decisivo?: readonly Fala[];
  /** Fim da luta, quem venceu. ≥ 3 variantes. ≤ 2 linhas, ≤ 64. */
  readonly vitoria: readonly Fala[];
  /** Venceu o último round sem tomar dano (`perfect`). Opcional. */
  readonly vitoriaPerfeita?: readonly Fala[];
  /** Venceu por tempo. Opcional. */
  readonly vitoriaPorTempo?: readonly Fala[];
  /** Rivalidades: vencem as genéricas contra aquele oponente. Opcional. */
  readonly contra?: Partial<Record<IdLutador, { readonly abertura?: readonly Fala[]; readonly vitoria?: readonly Fala[] }>>;
};
```

- **i18n:** os textos ficam em `src/data/provocacoes.pt-BR.ts`, que exporta
  `PROVOCACOES_PT_BR: Readonly<Record<IdLutador, FalasDeProvocacao>>`. Como o tipo é `Record<IdLutador, …>`, **lutador novo sem
  falas não compila**. Isso é proposital e vai para `docs/como-adicionar-um-lutador.md`. `provocacoes.ts` expõe
  `falasDe(id, idioma = 'pt-BR')`. Outro idioma = outro arquivo com o mesmo tipo. Os textos não ficam no `LutadorDef`, pelo mesmo
  princípio de `APRESENTACAO` e `apresentacao-especiais.ts`: apresentação fora do motor.
- **Caracteres permitidos:** Latin-1 (cobre todo o pt-BR) mais `— … “ ” ‘ ’`. Sem emoji: a fonte `barlow-600-latin.woff2` não
  tem e o fallback quebra o visual.
- **Precedência da escolha:** abertura = `contra[rival].abertura` > `abertura`. Round ≥ 2 = `decisivo` (se for o caso) >
  `revanche`. Vitória = `contra[perdedor].vitoria` > `vitoriaPerfeita` > `vitoriaPorTempo` > `vitoria`.
- **Sorteio:** `escolherFala(lista, rng, ultimaPorLutador)` é pura. Ela não repete a última fala do mesmo lutador na sessão
  quando a lista tem mais de 1. O `rng` é um **`sorteioDeFalas` novo no contexto (semente + 5)**, separado do RNG da luta, do
  `rngVisual` e do `rngUI` (que ordena os rivais). O precedente é o `sorteioDaSelecao`. Ausente (testes antigos): sempre o índice 0.

### 7.2 Limites (o que cabe no HUD no desktop e no celular)

Geometria do balão, em px lógicos (tela 960×540):

- Corpo do texto `FB(20)`. No celular deitado (fator ≈ 0,76, medido na E7a) isso dá ≈ 15,3 px CSS. A etiqueta com o nome usa
  `FH(18)`, ≈ 13,7 px CSS. Abaixo disso o texto fica ilegível, como a E7a já mostrou com 14.
- Largura útil da linha: **≤ 372 px** (balão ≤ 400 com 14 de margem). Altura de 1 linha ≈ 60 px e de 2 linhas ≈ 84 px (nome + linhas + margens).
- Posição: o balão fica numa faixa de cima. A base é `min(topoDaCabeça − 12, …)` e o topo nunca passa de **y 86 com HUD
  visível** nem de **y 62 com faixas de cinema**. O x fica centrado no falante e é preso em [12, 948]. O rabicho aponta para o x
  da cabeça. O topo da cabeça vem do `alturaEmPe` medido, não de constante: o ZENON tem escala 1,32.

Limites de redação. São o guia do Apolo e são conferidos por unit. O portão de verdade é a medida da §10:

| Categoria | Linhas | Caracteres por linha | Total | Alvo |
|---|---|---|---|---|
| `abertura`, `vitoria*`, `contra.*` | ≤ 2 | ≤ 34 | ≤ 64 | 40–56 |
| `revanche`, `decisivo` | 1 | ≤ 34 | ≤ 34 | 20–30 |

`{rival}` conta como **8** caracteres (o maior nome: WEI LONG / CENTELLA). A quebra é automática por medida. `\n` só é usado
quando o autor quer controlar o ritmo da frase.

### 7.3 Formato do `docs/textos-provocacao.md` (Apolo)

Um bloco por lutador, na ordem de `IDS_LUTADORES`. Cada item de lista é **um balão**. Os títulos de nível 3 são exatamente as
chaves do tipo, e por isso a transcrição para o `.ts` é mecânica:

```md
## HAYATO (`hayato`)
### abertura
- Texto do balão.
- Outra variante.
- Mais uma.
### revanche
- Curta, uma linha.
- Outra.
### decisivo
- (opcional)
### vitoria
- ...
### vitoriaPerfeita
- (opcional)
### vitoriaPorTempo
- (opcional)
### contra: wei-long
- abertura: Texto contra o WEI LONG.
- vitoria: Texto de vitória contra o WEI LONG.
```

Depois de transcrito, **a fonte de verdade passa a ser `src/data/provocacoes.pt-BR.ts`**. O `.md` ganha no topo a nota
"transcrito em <data>; editar o .ts". Duas fontes vivas divergiriam.

## 8. Estrutura de código (onde cada coisa mora)

| Arquivo | O quê | Dono |
|---|---|---|
| `src/data/provocacoes.ts` (novo) | Tipos, `falasDe`, `escolherFala`, `trocarRival` | Vega |
| `src/data/provocacoes.pt-BR.ts` (novo) | Os textos do Apolo | Vega |
| `src/ui/contexto.ts` (+ onde o contexto é montado) | `sorteioDeFalas?: Rng` (semente + 5) | Vega |
| `src/render/provocacao.ts` (novo) | `ModoProvocacao`, `TipoProvocacao = 'abertura' \| 'rodada' \| 'vitoria'`, `montarRoteiro()`, `linhaDaProvocacao()` (pura), as funções `duracao*`, a classe `Provocacao` (API da `EntradaDoChefe`), as receitas de som | Lyra |
| `src/render/balao.ts` (novo) | `medirBalao(ctx, fala, max)` → linhas e caixa (uma vez, no `iniciar`), `desenharBalao(ctx, caixa, quadro)` | Lyra |
| `src/render/mundo.ts` | `OpcoesMundo` ganha (só aditivo, ausente = desenho de hoje) `deslocamento?: Partial<Record<0\|1, number>>`, `zoom?: {fator, x}`, `overlay?: boolean` | Lyra |
| `src/render/apresentacao-lutadores.ts` | `Apresentacao.provoca?: CenaDef` (BAATAR, ZENON) | Lyra |
| `src/data/poses.ts` | `ALIAS.provoca0/provoca1 → 'win'` | Lyra |
| `src/ui/cenas/fight.ts` | `provocacaoLigada`, `modoDaProvocacao` e os 3 gatilhos da §2; ENTER e `click` pulam; música a 50%; `cine.aquecer` também durante a provocação (como na entrada); a legenda do chefão é suprimida enquanto o balão da vitória está ativo | Lyra |
| `tests/e2e/_chefe.ts` (ou `_luta.ts`) | `SEM_PROVOCACAO` (zera o controlador e as pendências) | Lyra |

Receitas de som (só `tone`/`noise`, D8), volume pelo canal de efeitos:
`SOM_DO_BALAO` (noise bandpass 0,08 s), `blip(pitch)` (triangle, `f0 = 420·pitch`, 0,04 s, vol 0,05, uma a cada 3 letras),
`SOM_DA_VITORIA` (3 triangles em arpejo, 0,1 s cada).

## 9. Plano em fases

| Fase | Quem | Entrega | Depende de |
|---|---|---|---|
| P0 | **Apolo** (já em paralelo) | `docs/textos-provocacao.md` no formato da §7.3, dentro dos limites da §7.2 | — |
| P1 | **Vega** | `provocacoes.ts` (tipos + funções puras), `provocacoes.pt-BR.ts` **com falas provisórias** (1 por categoria obrigatória, marcadas `// PROVISÓRIO`), `sorteioDeFalas`. Units: escolha, precedência, sem repetição, `{rival}`, limites, caracteres | — |
| P2 | **Lyra** (depois de fechar a seleção/fonte em `texto.ts`, que está em andamento) | `provocacao.ts` + `balao.ts` + opções aditivas do `desenharMundo` + integração na `CenaFight` + `SEM_PROVOCACAO`, e a auditoria dos testes que abrem luta (§10, item 9). Units da linha do tempo e do controlador, no espelho de `z3-entrada-chefe.test.ts` | P1 (tipos) |
| P3 | **Vega** | Transcrição dos textos do Apolo para o `.pt-BR.ts`, units de limites verdes | P0, P1 |
| P4 | **Íris** | Veredito: units da §10, snapshot sem `-u`, e2e medido (desktop 1280×720 e celular deitado 844×390), revisão das capturas de round 1 / round 2 / vitória | P2, P3 |
| P5 | **Alexandria** | `docs/arquitetura.md` (o 3º controlador fora do motor), `docs/como-adicionar-um-lutador.md` (falas obrigatórias, poses `provoca`), README (pular com ataque/ENTER/toque) | P4 aprovado |
| P6 (opcional) | **Apolo** | Quadros `provoca0/1` e `vitoria0/1` (§6). Entram sem mudar código | D-P4 |

P1 e P0 rodam juntas. A P2 pode começar assim que os **tipos** da P1 existirem, mesmo sem os textos.

## 10. Critérios de aceite (medíveis)

1. **Motor intocado:** `git diff --stat src/fight` vazio. O snapshot CPU×CPU e `luta-fidelidade` passam **sem `-u`**. Grep:
   nenhum `provoca` em `src/fight/**` e nenhum uso de `game.rng` em `src/render/provocacao.ts`.
2. **Round 1 COMPLETA:** com falas de tamanho conhecido, `game.tick` fica em 0 por exatamente `80 + D1 + D2` chamadas de
   `update()` da cena e anda na seguinte (o espelho do teste "COMPLETA … anda no 271º" da entrada).
3. **Round ≥ 2:** depois do `round start` do round 2, o motor fica em `phase 'intro'`, `t 0` por exatamente a duração do
   roteiro. Fala quem perdeu o round 1. Na CURTA, 0 ticks congelados.
4. **Vitória:** o congelamento começa em `matchend` com `t ∈ [56, 100]`. No fim vem `matchDone === true` e `finish()` **uma** vez,
   sem `game.update` no tick final. ENTER na vitória: encerra em ≤ 6 ticks.
5. **Pular:** antes do tick 10 (pre-round) ou do 24 (vitória) não vale. Depois disso, ataque, ENTER ou clique encerram tudo em ≤ 6
   ticks. Uma tecla segurada desde antes da provocação não pula (é borda).
6. **Onde não roda:** em TREINO, VERSUS, CPU×CPU, `?expansao=4`, pré-round do chefão e `pref 'desligada'`, o controlador **nunca**
   é iniciado (unit por configuração). A entrada do ZENON continua passando nos testes `z3` sem mudança.
7. **Modos:** COMPLETA → CURTA no confronto repetido. CURTA: round 1 ≤ 126 ticks, round ≥ 2 inexistente, vitória ≤ 126.
8. **Movimento reduzido:** em todos os quadros de todos os roteiros, `deslocamento = 0`, `zoom = 1`, escala do balão = 1 (teste
   da função pura). As durações são iguais às sem redução.
9. **Testes existentes:** todo e2e/unit que abre luta de ARCADE ou LUTA vs CPU e conta ticks ou mede HUD usa `SEM_PROVOCACAO`
   (a lista vem da auditoria da Lyra). A suíte inteira fica verde.
10. **Dados:** cada `IdLutador` tem abertura ≥ 3, revanche ≥ 2, vitória ≥ 3; limites da §7.2 respeitados; só caracteres
    permitidos; só o token `{rival}`; nenhuma fala `// PROVISÓRIO` no commit final.
11. **Medido no navegador** (skill `medir-antes-de-afirmar`), com a fonte carregada (`document.fonts.ready`): para **toda** fala
    de **todo** lutador, com `{rival}` = o nome mais largo medido, cada linha quebrada mede ≤ 372 px em `FB(20)` e o número de
    linhas respeita o limite. O retângulo do balão fica dentro de [12, 948] e não invade o HUD (topo ≥ 86 com HUD visível). No
    celular deitado, a altura CSS do texto do balão fica ≥ 13 px.
12. **Capturas revisadas pela Íris:** round 1 COMPLETA (os dois balões), round 2, vitória COMPLETA e vitória com ZENON jogável
    (o mais alto), no desktop e no celular. O balão não cobre o rosto de ninguém com escala ≤ 1,0. No ZENON, a sobreposição
    máxima com a cabeça fica ≤ 16 px.

## 11. Riscos e dívidas conscientes

- **R1 (alto): testes existentes que abrem luta.** Toda luta de ARCADE ou LUTA vs CPU passa a ter cerca de 6 s antes do
  primeiro tick. Os e2e (`jogo`, `expansao`, `esquiva`, `cinematica`, `celular-e7a`, `novos-lutadores`…) e o
  `cena-luta-cinematica.test.ts` podem esperar o motor andar logo. Mitigação: `SEM_PROVOCACAO` e a auditoria dentro da P2. A
  Íris reprova se algum teste for "consertado" com `-u` ou com timeout maior em vez do gancho.
- **R2: cansaço.** Mesmo curta, a provocação do round ≥ 2 custa cerca de 2 s por round. Mitigação: 1 linha, pulo em 1 tecla, CURTA
  a remove. Se o dono achar demais, o round ≥ 2 pode virar opcional (D-P5).
- **R3: o vencedor martelando ataque pula a própria vitória.** Mitigação: o pulo da vitória só vale a partir do tick 24 e é por
  borda. Medir no e2e.
- **R4: o ZENON (escala 1,32) e o balão com o HUD.** Mitigação: a provocação do round ≥ 2 tem 1 linha (60 px) e a posição vem do
  `alturaEmPe`. Com até 16 px de sobreposição, o ZENON tem a regra própria de aceite (§10 item 12).
- **R5: a fonte ainda não carregou na 1ª medida.** A medida do balão é feita no `iniciar`, e a arte da luta já espera
  `EsperaDeArte`. Se `document.fonts.status !== 'loaded'`, refazer a medida no 1º quadro depois do carregamento. A Lyra trata
  isto no `balao.ts`.
- **Dívida D1:** sem arte `provoca`, 8 lutadores usam o mesmo `win` na provocação e na vitória (§6, P6).
- **Dívida D2:** as falas são independentes e não formam um diálogo de verdade (só com `contra`). É escolha de escopo (N² pares).
- **Dívida D3:** só pt-BR. A estrutura já está pronta para outro idioma, mas não existe troca de idioma na UI.

## Decisões em aberto (para o dono)

- **D-P1. VERSUS 2 jogadores com provocação?** Padrão desta spec: **não**, conforme o briefing. A favor de ligar: é onde a
  provocação "pega" mais entre amigos, e qualquer um dos dois pula. Custo: uma linha na `provocacaoLigada`.
- **D-P2. Que opção controla a provocação?** (A) Reusar a "CINEMÁTICA DO ESPECIAL" (padrão desta spec, zero storage novo),
  renomeando a linha para "CINEMÁTICAS". (B) Opção própria "PROVOCAÇÕES: COMPLETA/CURTA/DESLIGADA", com um campo opcional novo em
  `Configuracoes` (Vega + Cronos: saneamento do storage). Recomendação: **A agora, B só se alguém quiser cinemática do especial
  sem provocação**.
- **D-P3. DECIDIDA pelo dono (topo da spec, item 4): quando o ZENON chefão vence, ele provoca com o balão novo** (pose
  `vitoria0/1` + fala de `contra[perdedor].vitoria`), **sem a legenda antiga**. (Antes: o padrão desta spec era manter a legenda,
  porque o briefing dizia "ZENON mantém a entrada própria"; o pré-round do chefão continua sem balão.)
- **D-P4. Encomendar a arte `provoca0/1` (e `vitoria0/1`) para os 8 lutadores?** Custo: 8 linhas de folha no Runway (§6).
  Recomendação: sim, depois de ver a v1 rodando com `win`.
- **D-P5. Provocação no round ≥ 2:** fica como está (1 linha, cerca de 2 s, só na COMPLETA) ou só no round **decisivo**?
- **D-P6. Ordem do round 1:** o P1 fala primeiro e o P2 (o dono da casa) responde, como nesta spec. A alternativa é o dono da casa
  falar primeiro.
