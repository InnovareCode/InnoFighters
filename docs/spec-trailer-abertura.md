# Spec: trailer de abertura (montagem no motor do jogo)

Autora: Nova (arquitetura). Data: 2026-10-22. Base: HEAD `64f2647` (com um bloco da Lyra e do Apolo ainda não commitado em
`src/input`, `src/audio`, `src/ui/cenas/fight.ts` e `options.ts`; esta spec não depende dele). Situação: **proposta, nada implementado.**

Pedido do dono: "na animação de abertura do jogo, um TRAILER do jogo com vídeo que envolva os jogadores lutando entre si, como um
filme de apresentação". Decisão do dono: **montagem no motor do jogo**. Usa os sprites reais, não usa vídeo de IA, não tem custo e
pode ser pulado.

---

## 0. Contexto e hipóteses (declaradas)

| # | Hipótese | Efeito no desenho |
|---|---|---|
| H1 | Produto já jogável, dono solo, jogo local no navegador (desktop e celular), sem backend | Nada de servidor nem de vídeo pré-renderizado: o trailer é código + dados |
| H2 | O alvo mais fraco é o iPhone com Chrome/WebKit, já no limite de memória com a arte nova | A memória manda: o trailer nunca passa do pico que a luta já tem |
| H3 | Duração de 40 s = 25 compassos a 150 BPM (1 tempo = 24 ticks, 1 compasso = 96 ticks, total 2400 ticks) | Cortes caem no tempo, e o tick é inteiro em toda a grade |
| H4 | `src/fight/**` não muda | O trailer instancia `Game` próprios. Nunca usa o `mundo.game` |
| H5 | A logo oficial nova (`arte-fonte/logo/logo-oficial-dono-v1.jpg`, JPG com fundo escuro, sem alfa) ainda não tem `docs/logo-oficial.md` nem `public/assets/ui/logo/` | O trailer usa a interface `marca` e cai na logo procedural de hoje se a nova não existir |
| H6 | A abertura de hoje (`CenaIntro`, 4,3 s) é oráculo de pixel do `fidelidade-ui.spec.ts` (`?expansao=4`, `abertura t=20..250`) | `CenaIntro` NÃO muda. O trailer é uma cena nova, atrás de `Regras.trailer` (false em `?expansao=4`) |

**Medido nesta sessão** (Node, desktop, `Game` com CPU×CPU DIFÍCIL e semente fixa, 6 pares × 2 sementes; script no scratchpad, nada
no repositório): **5 a 12 µs por tick** (33 µs na 1ª luta, por causa do JIT). Uma luta inteira tem de 2 000 a 4 400 ticks e custa
de 12 a 70 ms. O 1º especial sai entre os ticks 199 e 552, e há de 10 a 29 especiais e de 9 a 19 acertos por luta. Daí a conclusão:
**pré-rolar o motor até o ponto do plano é barato**, mesmo no fim da luta, desde que seja fatiado entre quadros (§4.4). O número
do iPhone ainda não foi medido. É o portão T0.

---

## 1. O que já existe e é reaproveitado (sem reescrever)

| Peça | Onde | Uso no trailer |
|---|---|---|
| `Game` puro, `setup(cfg, ajustes)` / `update(fonte)`, CPU nos dois lados (`cpu`, `p1cpu`) | `src/fight/game.ts` | Cada plano de luta é um `Game` NOVO com RNG próprio |
| `desenharMundo(ctx, luta, rec, efeitos, petalas, rng, opcoes)` com `hud`, `overlay`, `poses`, `acesos`, `zoom {fator,x}`, `tremor` | `src/render/mundo.ts` | Quadro da luta sem HUD; o zoom de apresentação já existe |
| `Efeitos`, `CampoDePetalas` | `src/render/efeitos.ts` | Instâncias PRÓPRIAS do trailer (não consomem o `rngVisual` da sessão) |
| `Cinematica` (tarja E1..E12, `DURACAO_CURTA` 20, `DURACAO_COMPLETA` 48) | `src/render/cinematica.ts` | Só nas batidas marcadas do roteiro (§4.3) |
| `EntradaDoChefe` (curta 60 ticks), braseiros `acesos`, `SOM_DAS_FAIXAS`, `somDoBraseiro` | `src/render/entrada-chefe.ts` | Clímax do ZENON |
| `reagirDoJogo(audio, luta, eventos)` | `src/audio/camadas.ts` | Sons dos golpes do plano, com a identidade sonora |
| Temas por lutador (`TEMAS`, `compilarTema`, `partituraDoPasso`, orçamento `FONTES_*`) | `src/audio/temas.ts`, `src/data/musica` | Música da abertura e citação do tema de cada lutador |
| `GerenciadorDeArte.garantir/pedir/prebuscar/usar/liberarLutador`, retratos sempre residentes | `src/assets/gerenciador.ts` | Pré-carga escalonada e soltura |
| `marca.desenharLogo/desenharEmblema`, `Brasas`, coreografia do impacto da logo | `src/ui/logo.ts`, `cenas/intro.ts` | Revelação final, que cai na logo procedural se a oficial não chegar |
| `reduzirMovimento()` no `Contexto`, `temToque()` | `src/ui/contexto.ts` | Versão estática e o texto TOQUE/ENTER |
| Padrão "apresentação fora do lock-step" (cinemática, entrada do chefão, provocação) | specs anteriores | Mesma regra, em escala maior (§2) |

---

## 2. A regra central: o trailer é um "projetor", não uma luta

1. O trailer **cria e descarta seus próprios `Game`**, no máximo dois vivos ao mesmo tempo: o do plano atual e o do próximo,
   em pré-rolagem. Nunca toca no `mundo.game`, no `rngLogica`, no `rngVisual`, no `rngUI` nem nas sementes +4/+5/+6. As
   sementes do trailer são **constantes do roteiro**, e não derivam da semente da sessão. Assim o trailer é idêntico em toda
   visita e não desloca nenhuma sequência que o jogo, os replays ou os testes de fidelidade usem.
2. **O estado é função do tick.** O motor de cada plano só avança por `Game.update` com CPU×CPU e semente fixa. Câmera, câmera
   lenta, títulos, letterbox e flash saem de funções puras de `(roteiro, tick)`. O relógio (os ticks do laço ou o relógio do
   áudio, §4.5) só decide **qual** tick vai para a tela, nunca **o que** acontece nele.
3. `src/fight/**` não muda. O portão é `git diff src/fight` vazio, com os snapshots `fight.test.ts.snap` e
   `esquiva-cpu.test.ts.snap` sem `-u`.
4. Nada de `Math.random`, `Date.now` ou `performance.now` em decisão de estado. `performance.now` só aparece no orçamento de
   fatia da pré-rolagem, que decide QUANTOS ticks andar neste quadro e não o resultado. Um teste prova a invariância à fatia (§8).

---

## 3. Roteiro e storyboard (40 s, 25 compassos, 150 BPM)

Notação: compasso `cN` (1 compasso = 96 ticks = 1,6 s). "Tempo" = semínima (24 ticks). O texto dos títulos é **rascunho**: a versão
final é do Apolo, em `docs/textos-trailer.md`. Letterbox 2,39:1 = faixas de **69 px** (lógicos) em cima e embaixo. Ele fecha no c1
e abre no c24, para a logo.

### 3.1 Tabela de planos

| Plano | Compassos | Tempo (s) | Tipo | Conteúdo | Câmera / efeito | Arte exigida (não fixa) |
|---|---|---|---|---|---|---|
| **P0 Frio** | c1–c2 | 0,0–3,2 | `frio` | Preto. O letterbox fecha. Um RAIO (estilo E1) acende o `jp` e revela o HAYATO em contraluz, `idle` → `win`. Título no c2.1: **"DEZ MESTRES."** | Aproximação lenta de 1,00 a 1,12. Sem motor | nenhuma (HAYATO e `jp` são fixos) |
| **P1** HAYATO × WEI LONG | c3–c4 | 3,2–6,4 | `luta` @`cn` | Troca de golpes. **Batida:** especial do HAYATO acerta → câmera lenta ×3 (6 ticks do motor viram 18) + tarja E1 CURTA | Plano médio no meio; aproxima até 1,25 no acerto | nenhuma |
| **C1** | c5 | 6,4–8,0 | `cartao` | **"DEZ NAÇÕES."** sobre o `kr` escurecido | Texto entra no 1º tempo, sai no 4º | nenhuma |
| **P2** MIN-JI × CAIO | c6–c7 | 8,0–11,2 | `luta` @`br` | **Batidas:** especial da MIN-JI (E3) e especial do CAIO (E4) acertam no trecho | Corte seco no meio do plano (c7.1): a câmera troca o foco p1→p2 | nenhuma |
| **C2** | c8 | 11,2–12,8 | `cartao` | **"UM SÓ TORNEIO."** | — | (folga para a carga da AMINU) |
| **P3** AMINU × HAYATO | c9–c10 | 12,8–16,0 | `luta` @`ng` | Placa "AMINU · NIGÉRIA". **Batida:** MASHI nível 3 (carga) acerta | Aproximação na carga | `aminu`, `ng` |
| **P4** CENTELLA × CAIO | c11–c12 | 16,0–19,2 | `luta` @`mx` | Placa. **Batida:** RESORTE (rebote) acerta | Câmera acompanha o percurso | `centella`, `mx` |
| **C3** | c13 | 19,2–20,8 | `cartao` | **"CINCO GUARDIÕES."** (ou outro, D-T2) | — | (folga) |
| **P5** CAMILLE × MIN-JI | c14–c15 | 20,8–24,0 | `luta` @`fr` | Placa. **Batida:** COUP D'ARRÊT (contragolpe) | Câmera lenta ×2 no contra | `camille`, `fr` |
| **P6** NILA × WEI LONG | c16–c17 | 24,0–27,2 | `luta` @`in` | Placa. **Batida:** especial GAJA (E8) ou SARPA (E9) acerta | — | `nila`, `in` |
| **P7** BAATAR × HAYATO | c18–c19 | 27,2–30,4 | `luta` @`mn` | Placa. **Batida:** MERGULHO acerta | Aproximação no salto | `baatar`, `mn` |
| **P8 Montagem** | c20–c21 | 30,4–33,6 | `retratos` | Os 9 retratos entram numa grade 3×3, um por tempo (o 9º na última colcheia), com risco de luz. Título: **"QUEM CHEGA AO TOPO..."** | Sem tela cheia branca; no máximo 2,5 cortes/s | só retratos (sempre residentes): folga para a carga do ZENON |
| **P9 Arconte** | c22–c23 | 33,6–36,8 | `arconte` @`gr` | c22.1: 1 tempo de silêncio. Os 6 braseiros acendem em colcheias (`acesos` 0→6, ticks 24–84, motor congelado em `inicio` e poses impostas). Ticks 96–155: `EntradaDoChefe` CURTA (cartão e fala). Ticks 156–191: o motor anda e o especial E12 acerta → câmera lenta ×3 | Aproximação de 1,0 a 1,3 no ZENON | `zenon` (4 páginas), `gr` |
| **P10 Logo** | c24–c25 | 36,8–40,0 | `logo` | c24.1: **o único flash de tela cheia do trailer** (fecha o E12). A logo bate (escala 3,2→1, onda de choque, brasas: a coreografia da `CenaIntro` t 120–170). O letterbox abre. No c25: "PRESSIONE ENTER" / "TOQUE PARA JOGAR" | O último quadro É o 1º quadro do título (`fromTrailer`, como o `fromIntro` de hoje) | logo oficial (se existir) |

Cobertura: os 10 lutadores lutam em tela (HAYATO em P0/P1/P3/P7/P9, WEI LONG em P1/P6, MIN-JI em P2/P5, CAIO em P2/P4, e os outros 6
uma vez cada). Os 6 novos fazem par com um lutador **fixo** (a vitrine), então só um atlas não fixo por plano.
Cenários: `jp`, `kr`, `cn`, `br`, `ng`, `mx`, `fr`, `in`, `mn`, `gr` (os 10).

### 3.2 Regras de ritmo (valem para o Apolo e a Lyra)

- Todo corte cai num tempo (múltiplo de 24 ticks). Os planos de luta duram 2 compassos e os cartões, 1. A soma é fixa em 25
  compassos. O Apolo pode reordenar e trocar planos (D-T3), desde que cumpra a soma, a cobertura dos 10 e a ordem de carga (§5).
- Os títulos têm **≤ 18 caracteres**, em caixa alta, `FB(30–40)`. Os cartões ficam sobre fundo escuro, com contraste ≥ 4,5:1. A
  placa do lutador (nome · país, e o epíteto se couber) vai no terço inferior, dentro da faixa do letterbox ou logo acima dela, e
  fica ≤ 1,5 s.
- Câmera lenta: só ×2, ×3 ou ×4, por no máximo 24 ticks do trailer por batida. A câmera lenta repete o quadro do motor, sem
  interpolar (fica estilizada, como o hitstop).
- Aproximação: `zoom.fator` entre 1,0 e **1,35**. Acima disso aparecem as franjas magenta e os defeitos de recorte da arte (ver as
  armadilhas da arte). O zoom fica sempre ancorado no chão, como o `OpcoesMundo.zoom` já garante: nenhuma borda do cenário aparece.
- **Fotossensibilidade:** no máximo 3 flashes por segundo, em qualquer janela de 60 ticks, e um único flash de tela cheia (c24.1).
  O flash de acerto do motor (silhueta branca) é local e não conta como flash de tela cheia.

---

## 4. Mecanismo

### 4.1 Como reproduzir lutas "ensaiadas": três opções

| | M1. Replay de `InputFrame` gravado (humano ou editado à mão) | M2. CPU×CPU com semente fixa + **escalação automática** offline | M3. Híbrido: a escalação grava os `InputFrame` da CPU e o trailer reproduz o replay |
|---|---|---|---|
| Controle da coreografia | Total (golpe a golpe) | Indireto: escolhe-se a tomada que cumpre as batidas | Total, porque permite retocar a gravação |
| Autoria | Alta: alguém joga e grava cada plano | **Zero**: uma ferramenta varre sementes e níveis | Baixa |
| Dados no bundle | RLE dos inputs desde o tick 0 (~1–3 kB/plano) | **~100 bytes/plano** (semente, níveis, início, batidas, impressão) | Como a M1 |
| Depende de | dados do motor (frame data) | dados do motor + `cpu.ts` | só dos dados do motor |
| Quando o balanceamento muda | dessincroniza em silêncio (o golpe erra) | as batidas mudam de lugar | dessincroniza |
| Correção | regravar à mão | **1 comando** (`npm run trailer:escalar`) e reaprovar na prévia | 1 comando + o retoque se perde |

**Recomendação: M2.** A escalação automática fica com a validação no CI e a degradação silenciosa em tempo de execução. O projeto
muda `cpu.ts` e os dados com frequência (esquiva, chefões, balanço). Por isso o que importa é a correção custar um comando, não a
coreografia ser perfeita. M3 fica como evolução, se o dono quiser algum golpe exato (D-T6). O formato de dados abaixo aceita
`inputs?` sem migração.

### 4.2 Escalação (ferramenta offline, `ferramentas/trailer/escalar.ts`)

Para cada plano de luta do roteiro, a ferramenta:
1. Varre sementes (ex.: 0..2000) × níveis da CPU (`[2,2]`, `[1,2]`, `[2,1]`) com `esquiva: true` e o mesmo `ajustes`
   `{ rounds: 1, time: 99, shake: true }` do trailer.
2. Simula **com o mesmo `DiretorDoTrailer` puro** que roda no jogo, para que o congelamento da cinemática e a câmera lenta entrem
   na conta. Procura janelas de `compassos × 96` ticks do trailer que cumpram:
   - as **batidas obrigatórias** do plano (ex.: `special.golpe === 's2'` do P1 seguido de `hit.especial` em ≤ 20 ticks);
   - uma **densidade de ação** mínima: ≥ 1 acerto a cada 40 ticks do motor, nenhum trecho > 45 ticks com os dois em `idle`/`walk`
     e nenhum lutador fora da tela;
   - `inicio ≤ 2400` ticks do motor (custo de pré-rolagem, §4.4) e o 1º round já em `fight`, sem a faixa ROUND/FIGHT.
3. Pontua: batidas perto do centro do plano, mais acertos, vida dos dois > 15% (ninguém "morto" no meio do trailer, exceto quando o
   plano pede KO). Grava a melhor tomada **entre marcadores** em `src/data/trailer/tomadas.ts` (o arquivo é gerado e o roteiro
   à mão fica intocado): `semente`, `cpu`, `inicio`, `batidas[]` (tick do motor + tipo + lutador + golpe) e `impressao` (hash do
   estado ao fim do plano).
4. `--plano P5` reescala só um plano. `--sementes N` amplia a busca. Se nenhuma janela cumprir, a ferramenta sai com erro e
   explica qual batida faltou, para que o roteiro mude a exigência.

O resultado tem de ser **aprovado por olho** (Apolo/dono) na prévia de desenvolvimento `?trailer=P5`.

### 4.3 `DiretorDoTrailer` (puro, sem DOM)

- Mantém o plano atual e o próximo. Em cada tick do trailer decide se o motor do plano anda 1 tick (normal), anda 1 a cada N
  (câmera lenta) ou não anda (motor congelado em `frio`/`arconte`/cinemática).
- **A cinemática do especial no trailer só sai nas batidas marcadas com `cine: 'curta' | 'completa'`.** Os outros especiais não
  abrem tarja. Assim a duração do congelamento é constante (20 ou 48 ticks) e a escalação a reproduz sem precisar da classe
  `Cinematica`, que é de render. A cena só desenha a tarja quando o diretor manda.
- Batida esperada que não veio (dados mudaram e o CI ainda não rodou): o diretor **segue sem a câmera lenta e sem a tarja**. O
  plano não estica, os títulos ficam nos compassos e o trailer nunca quebra nem espera.
- Fim do plano: descarta o `Game` e promove o próximo, já pré-rolado.

### 4.4 Pré-rolagem fatiada

- O próximo plano começa a pré-rolar **no início do plano atual**: `setup` + `update` até `inicio`.
- Fatia por quadro: até `ORCAMENTO_PREROLAGEM_MS = 2` (com `performance.now` só para parar a fatia), com no mínimo 8 ticks por
  quadro. A medida desta sessão dá ~150–300 ticks por quadro no desktop e, estimando 4× mais lento, ~40–80 no celular. Um `inicio`
  de 2 400 ticks fica pronto em ≤ 60 quadros (1 s). Os planos duram ≥ 1,6 s, então sobra folga.
- Se não ficou pronto a tempo (aparelho lento), o diretor **troca o plano por um cartão de reserva** do mesmo tamanho (retratos dos
  dois lutadores sobre o cenário, sem motor). Nunca congela a tela.
- O resultado não depende da fatia: é o mesmo `Game` andando os mesmos ticks.

### 4.5 Relógio e sincronia com a música

- Sem áudio (testes `?manual=1`, áudio bloqueado ou mudo): o relógio é o tick do laço (`Navegador.update`).
- Com o áudio rodando, **o relógio do `AudioContext` manda**. O diretor calcula `tickAlvo = floor((ctx.currentTime − t0) × 60)` e,
  em cada `update` da cena, avança 0, 1 ou vários ticks até alcançá-lo (`irPara`, só para frente, no máximo 6 por chamada; acima
  disso pula o motor sem desenhar). Quadros perdidos no celular não desalinham corte e batida da música.
- Áudio que destrava depois do 1º quadro (iOS resolve o `resume()` mais tarde): a música entra **no próximo compasso** e
  ancora `t0` ali. Antes disso a imagem corre no relógio do laço.

---

## 5. Carga da arte, memória e CPU no celular

### 5.1 Orçamento (medido nesta sessão a partir dos arquivos: largura × altura × 4 bytes decodificados)

| Item | Decodificado |
|---|---|
| Fixos (vitrine): HAYATO 24 + WEI LONG 31,5 + MIN-JI 24 + CAIO 30,9 | **110 MB** |
| Cenários fixos (padrão + `jp` `cn` `kr` `br`), 7,9 MB cada | ~40 MB |
| Não fixos: AMINU 30 · CENTELLA 26 · CAMILLE 23 · NILA 37,5 · BAATAR 52 · **ZENON 60 (4 páginas 2048×1920)** | — |
| Silhueta branca (flash de acerto): uma cópia por página atingida, criada sob demanda | até +100% da página |

**Regra do trailer:** no máximo **2 atlas não fixos** residentes, o atual e o próximo. BAATAR e ZENON **nunca juntos**: a
montagem P8 existe também como folga (só retratos), e o BAATAR é solto ao fim do P7. Pico estimado ≈ 110 + 40 + (NILA 37,5 + BAATAR
52) + 2 cenários (16) ≈ **255 MB** mais as silhuetas. Fica abaixo do pico que a luta já aceita hoje (fixos + `limiteResidentes` 3).
Na saída do trailer, ele solta tudo o que carregou (`liberarLutador` / `liberarCenario`, que também descartam as silhuetas). O
título volta à memória de base.

### 5.2 Fila de carga escalonada (pura: `planoDeCarga(roteiro)`)

| Pedido | Começa em | Precisa estar pronto em |
|---|---|---|
| `aminu` + `ng` | P0 (tick 0) | P3 (c9) |
| `centella` + `mx` | P3 | P4 |
| `camille` + `fr` | P4 (solta `aminu`, `ng` ao fim do P3) | P5 |
| `nila` + `in` | P5 (solta `centella`) | P6 |
| `baatar` + `mn` | P6 (solta `camille`) | P7 |
| `zenon` + `gr` | P8 (solta `nila` ao fim do P6 e `baatar` ao fim do P7) | P9 |

- **Um atlas decodificando por vez** (`garantir` em série, nunca `Promise.all` do elenco), e `prebuscar` (HTTP, prioridade baixa)
  do item seguinte.
- **Decodificação fora do 1º desenho:** hoje `leitorDeRede.imagem` resolve no `onload`, e o WebKit decodifica no 1º `drawImage`.
  Isso trava 30–80 ms (estimativa, ainda não medida) bem no corte. Proposta: `await im.decode()` antes de resolver (vale para o
  jogo todo; ganho também na tela VS). Plano B, se a Íris achar regressão: o trailer "aquece" a imagem num canvas 1×1 durante um
  cartão.
- O boot **não muda**: carrega só o que carrega hoje (manifestos de todos, retratos, vitrine, cenários fixos). O 1º quadro do
  trailer (P0) só usa arte fixa, então aparece no mesmo quadro do gesto.
- O módulo do trailer (diretor, roteiro, render, música) é um **pedaço lazy**: `import()` disparado quando `ui.ready` fica true,
  enquanto o boot espera o gesto. Se o gesto chegar antes do pedaço, a `CenaBoot` vai para a `CenaIntro` de hoje (nunca espera).
- Download no 1º trailer: ~8,5 MB de atlas + ~1,2 MB de cenários (medido no disco). Com `navigator.connection?.saveData` ligado
  (ou `effectiveType` 2g/3g), o trailer vira a **versão estática** (§6.3), que só usa a arte residente (D-T7).

### 5.3 CPU por quadro

O quadro de luta do trailer custa o mesmo que o quadro da `CenaFight`. Somam-se o letterbox (2 `fillRect`), os títulos e a
pré-rolagem (≤ 2 ms). O cartão e a montagem custam menos que a luta. A revelação da logo usa uma imagem e partículas (as mesmas da
abertura de hoje). Portão em §8.

---

## 6. Interação e fluxo

### 6.1 Fluxo

```
boot (barra) ──gesto──► TRAILER (origem 'boot') ──fim / qualquer tecla ou toque──► TITLE (fromTrailer: t = 120)
                    └─ sem pedaço lazy, Regras.trailer false (?expansao=4), ?trailer=0 ─► INTRO de hoje ─► TITLE
TITLE parado 30 s (1800 ticks) sem tecla, toque, clique, mouse ou gamepad ──► TRAILER (origem 'atrair') ──► TITLE (e zera o contador)
```

- **Pular:** qualquer tecla (menos `f` e `m`, que o `main.ts` já trata antes), clique, toque ou botão do gamepad, **a partir do
  tick 10**. Antes do c25, o pulo vai para o título com o fade de sempre. **No c25**, com "PRESSIONE ENTER" já na tela, a tecla age
  como no título (vai ao menu e toca `uiOk`): o jogador que esperou não precisa apertar duas vezes.
- A tecla que pula **não vaza** para o título. O `Navegador.key` ignora tecla durante `fadeTo`, e um e2e prova isso.
- Ao pular, a música da abertura sai com fade de 0,3 s e o título liga a música do menu (`CENAS_COM_MUSICA_DE_MENU`).
- Aba oculta ou perda de foco (`blur`): para a música e vai para o título **sem fade**. Ao voltar, o jogador está no título.
- Durante o trailer, o `#pad` de toque fica escondido (a classe do `body` que já esconde o pad fora da luta; a Lyra confere).

### 6.2 Áudio só depois do gesto (iOS)

- A origem `'boot'` sempre vem de um gesto (a `CenaBoot` já pede "CLIQUE OU PRESSIONE UMA TECLA" e chama `iniciarAudio`). A
  música começa quando `audio.ctx?.state === 'running'`, no compasso seguinte (§4.5).
- Na origem `'atrair'` o contexto pode ter sido suspenso (aba oculta e volta). Nesse caso o trailer roda **mudo**, sem erro, e a
  música só volta no próximo gesto. Nunca se chama `resume()` fora de gesto.
- No modo atrair, a música toca só na 1ª repetição depois do último gesto. As repetições seguintes são mudas (D-T4).

### 6.3 Movimento reduzido (`prefers-reduced-motion: reduce`) e versão estática

- **Versão estática curta, ≤ 10 s:** 6 quadros parados, cada um com 1–2 lutadores em `win` sobre o cenário. Usa só arte residente
  (vitrine e retratos) mais o ZENON pelo retrato. Os quadros trocam por dissolução de 18 ticks, e o último é a logo parada mais
  "PRESSIONE ENTER". **Zero** aproximação, tremor, câmera lenta, flash, onda de choque ou faísca. O letterbox entra já fechado.
- Os títulos são os mesmos. A música também, mas a versão curta tem fim próprio (a música vem do mesmo arranjo, cortado em 6
  compassos: c1, c2, c8, c13, c21, c24).
- O modo atrair, com movimento reduzido, repete a estática.

---

## 7. Integração com o código existente (contratos)

### 7.1 Navegação (`src/ui/tipos.ts`, `src/ui/cenas/*`)

```ts
// tipos.ts
export type NomeCena = ... | 'trailer';
export type ArgsTrailer = { origem: 'boot' | 'atrair' };
export type ArgsTitle = { fromIntro?: boolean; fromTrailer?: boolean } | undefined;   // fromTrailer: t = 120, como fromIntro

// meta/regras.ts (Regras): campo novo, padrão true. `regrasDeQuatro()` (?expansao=4) => false.
trailer: boolean;
```

- `CenaBoot.ir()`: `regras.trailer && trailerCarregado() && !paramTrailer0 ? set('trailer', { origem: 'boot' }) : set('intro')`.
- `CenaTitle`: contador `ocioso`, que volta a zero em `key`, `click`, `hover` (método novo, só zera) e gamepad (passa por `key`).
  Com `ocioso ≥ 1800` → `go('trailer', { origem: 'atrair' })`. Fica desligado se `regras.trailer` for false.
- `CenaTrailer` (`src/ui/cenas/trailer.ts`) é uma **casca fina** que entra no `criarCenas` estático. O peso mora no pedaço lazy
  `src/ui/trailer/index.ts`.
- Parâmetros de desenvolvimento (só `import.meta.env.DEV`): `?trailer=0` (desliga, para os e2e antigos) e `?trailer=P5` (começa no
  plano, para a aprovação visual).
- Preferência (D-T1, recomendada): `Configuracoes.abertura?: 'trailer' | 'curta'`, padrão `'trailer'`. É um campo **aditivo na
  v2, sem bump**, o mesmo precedente de `provocacoes`. `'curta'` = a `CenaIntro` de hoje. Linha nova nas OPÇÕES (Lyra) e
  validação do campo (Cronos).

### 7.2 Dados do roteiro (`src/data/trailer/`)

```ts
// tipos.ts
export type IdPlano = 'P0' | 'P1' | 'C1' | 'P2' | 'C2' | 'P3' | 'P4' | 'C3' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10';
export interface BatidaPedida { readonly tipo: 'especial' | 'contra' | 'carga' | 'ko'; readonly lutador: 0 | 1; readonly golpe?: string;
  readonly cine?: 'curta' | 'completa'; readonly lenta?: { readonly fator: 2 | 3 | 4; readonly ticks: number } }
export interface Tomada { readonly semente: number; readonly cpu: readonly [0 | 1 | 2, 0 | 1 | 2]; readonly inicio: number;
  readonly batidas: readonly { readonly pedida: number; readonly tickMotor: number }[]; readonly impressao: string;
  readonly inputs?: string /* M3, futuro: RLE */ }
export interface QuadroChave { readonly t: number; readonly zoom: number; readonly foco: 'meio' | 'p1' | 'p2'; readonly curva?: 'linear' | 'saida' | 'entrada' }
export interface Titulo { readonly chave: ChaveDeTexto; readonly de: number; readonly ate: number; readonly estilo: 'cartao' | 'placa' }
type Base = { readonly id: IdPlano; readonly compassos: number; readonly titulos?: readonly Titulo[] };
export type Plano =
  | (Base & { tipo: 'frio'; lutador: IdLutador; stage: IdCenario; camera: readonly QuadroChave[] })
  | (Base & { tipo: 'luta'; c1: IdLutador; c2: IdLutador; stage: IdCenario; pede: readonly BatidaPedida[]; camera: readonly QuadroChave[] })
  | (Base & { tipo: 'cartao'; fundo: 'preto' | IdCenario })
  | (Base & { tipo: 'retratos'; ordem: readonly IdLutador[] })
  | (Base & { tipo: 'arconte'; c1: IdLutador; c2: 'zenon'; pede: readonly BatidaPedida[] })
  | (Base & { tipo: 'logo' });
export interface RoteiroDoTrailer { readonly bpm: 150; readonly ticksPorTempo: 24; readonly sementeVisual: number; readonly planos: readonly Plano[] }

// roteiro.ts (à mão) + tomadas.ts (gerado pela escalação: Record<IdPlano de luta, Tomada>)
// textos.pt-BR.ts (Apolo): Record<ChaveDeTexto, string> + PLACAS: Record<IdLutador, { nome; pais; epiteto? }>
// cobertura em tempo de compilação: DESTAQUE: Record<IdLutador, IdPlano>  -> lutador novo sem plano NÃO compila
```

`validarRoteiro()` roda quando o pedaço lazy carrega, no padrão das provocações e dos temas. Confere: soma = 25 compassos; todo
plano de luta tem tomada; título ≤ 18 caracteres; cada `IdLutador` em ≥ 1 plano; `inicio ≤ 2400`; `zoom ∈ [1; 1,35]`; flashes
≤ 3 por 60 ticks. Se algo falhar, **o trailer não abre** (vai para a `CenaIntro`) e o console registra. O boot não cai, porque o
trailer é opcional.

### 7.3 Diretor (`src/ui/trailer/diretor.ts`, puro)

```ts
export interface QuadroDoTrailer {
  readonly tick: number; readonly plano: Plano; readonly tickNoPlano: number; readonly compasso: number; readonly tempo: number;
  readonly luta: LeituraLuta | null;            // Game do plano (null em frio/cartao/retratos/logo)
  readonly eventos: readonly EventoLuta[];      // só os do tick em que o motor andou (efeitos, sons)
  readonly zoom: { readonly fator: number; readonly x: number };
  readonly letterbox: number; readonly flash: number;            // 0..1
  readonly titulos: readonly { readonly texto: string; readonly estilo: 'cartao' | 'placa'; readonly alfa: number }[];
  readonly cine: { readonly ev: EventoLuta; readonly modo: 'curta' | 'completa' } | null;   // só no tick em que a tarja começa
  readonly arconte?: { readonly acesos: number; readonly poses: Partial<Record<0 | 1, string>>; readonly entrada: boolean };
  readonly reserva: boolean;                    // plano trocado pelo cartão de reserva (§4.4)
}
export class DiretorDoTrailer {
  constructor(roteiro: RoteiroDoTrailer, tomadas: Readonly<Record<string, Tomada>>,
              dep: { lutadores: Readonly<Record<IdLutador, LutadorMontado>>; criarRng: (s: number) => Rng });
  avancar(): QuadroDoTrailer;
  irPara(tick: number): QuadroDoTrailer;        // só para frente (sincronia com o áudio)
  prerolar(maxTicks: number): number;           // fatia; devolve quantos ticks do motor andou
  pedidosDeArte(): { readonly agora: PedidoDeArte; readonly proximo: PedidoDeArte; readonly soltar: readonly string[] };
  readonly duracao: number;                     // 2400
  readonly fim: boolean;
  impressaoDoPlano(): string | null;            // hash do estado do Game ao fim do plano (CI)
}
```

### 7.4 Render (`src/render/trailer/`) e o que muda em `src/render`

- Arquivos novos: `letterbox.ts`, `titulos.ts`, `retratos.ts` (grade da montagem), `frio.ts` (raio do P0, que reusa o desenho do
  E1), `logo-revelacao.ts` (coreografia da `CenaIntro` t 120–170, recebendo a `marca` como parâmetro) e `estatica.ts`.
- `desenharMundo` **não muda**: o trailer usa `hud: false`, `overlay: false`, `zoom`, `poses`, `acesos` e `tremor` (este segue a
  preferência `settings.shake`). O motor recebe sempre `shake: true`, para a impressão não depender da preferência.
- A Lyra não deve criar opção nova de câmera (rotação, deslocamento vertical) sem medir. Rotação mostra borda de cenário, e o zoom
  ancorado no chão já basta para o roteiro.

### 7.5 Música (`src/audio`, `src/data/musica/abertura.ts`)

- **Arranjo linear**, sem laço: `ArranjoDef { bpm: 150; secoes: { compassos; pistas; citacao?: IdTema | 'chefe' }[] }`.
  As seções seguem os atos: frio (c1–2: pad grave e pulso de bumbo em mínimas), os quatro (c3–8: groove completo), desafiantes
  (c9–19: percussão dobrada), montagem (c20–21: subida de ruído filtrado e caixa em colcheias), arconte (c22–23: 1 tempo de
  silêncio, depois grave e sino em cada braseiro com `somDoBraseiro`) e logo (c24–25: impacto `logoSlam` e acorde final com cauda).
- **Citação:** em cada plano de luta, o motivo de cabeça do tema de quem está em destaque. São os primeiros 8 passos do `lead`
  de `TEMAS[id]`, transpostos para o tom da abertura e derivados do dado (`citacaoDoTema(id)`, pura). Se o tema muda, a citação
  muda junto, sem retrabalho. No ZENON, as 3 notas da valsa `'chefe'`.
- Orçamento igual ao dos temas (`FONTES_NOVAS_POR_PASSO_MAX` 8, `FONTES_ATIVAS_MAX` 15, voz ≤ 1 por compasso), conferido no
  carregamento. **Régua:** fora das janelas de citação, a abertura é distante de cada um dos 9 temas e das 3 trilhas nas medidas dM,
  dR e dT já calibradas. A régua é calibrada ANTES de compor, como nos temas.
- API nova do `AudioSys` (não toca `init()`, `sonsDoEvento` nem as trilhas de hoje; o `audio.test.ts` fica igual):
  ```ts
  tocarAbertura(op: { aPartirDoCompasso: number; arranjo: ArranjoCompilado }): boolean;  // false se ctx não está 'running'
  posicaoDaAbertura(): number | null;   // segundos desde o compasso 0, no relógio do AudioContext; null sem música
  pararAbertura(fadeSeg?: number): void;
  ```
- Mixagem: durante o trailer, os SFX do plano (`reagirDoJogo`) ficam a 60% do volume de efeitos do jogador (ganho temporário; o
  `persist` não muda). A música tem prioridade.
- O dado do arranjo vai no pedaço lazy do trailer. O pacote principal não cresce.

### 7.6 Logo oficial

- O trailer só conhece `marca`. Quando a missão da logo (Apolo + Lyra) entregar `public/assets/ui/logo/` e trocar a `marca`, o
  trailer herda a logo nova sem mudar código.
- Pedido ao Apolo, se a logo oficial entrar: versão **recortada com alfa** (WebP), reduzida a ~1 200×670, porque a original
  2576×1438 decodifica em 14,8 MB e a reduzida em ~3,2 MB. Camadas separadas (dragões, globo, INNO, FIGHTERS, faixa) exigiriam
  reconstruir o que está atrás das letras, ou seja, regenerar no Runway com custo de créditos. Por isso a recomendação é **uma
  imagem só** e o resto procedural (varredura de luz, raio azul à esquerda, fogo e brasas à direita, que repetem a própria arte),
  D-T5.

---

## 8. Critérios de aceite (medíveis)

Unitários (Vitest, `tests/unit/trailer-*.test.ts`):
1. **Determinismo:** dois `DiretorDoTrailer` com o mesmo roteiro produzem a mesma sequência de `QuadroDoTrailer` em todos os 2 400
   ticks (hash por tick), e a impressão de cada plano é igual à gravada em `tomadas.ts`.
2. **Batidas:** cada batida pedida acontece no `tickMotor` gravado. Se falhar, a mensagem diz "rode `npm run trailer:escalar --
   --plano Px`". É este teste que pega o rebalanceamento.
3. **Invariância à fatia:** pré-rolar com 1 tick por quadro e com 10 000 por quadro dá as mesmas impressões.
4. **Sem `Math.random`:** `vi.spyOn(Math, 'random')` lança durante a simulação inteira e o teste passa. Busca estática garante
   que não há `Math.random`, `Date.now` nem `new Date` em `src/ui/trailer` e `src/data/trailer`.
5. **Isolamento:** depois do trailer inteiro, os próximos 100 valores de `rngLogica`, `rngVisual`, `rngUI` e das sementes +4/+5/+6
   são iguais aos de um controle que não rodou o trailer. O `mundo.game` fica intocado (impressão igual), e `git diff src/fight`
   fica vazio.
6. **Duração:** `duracao === 2400`, cortes em múltiplos de 24 e versão estática ≤ 600 ticks.
7. **Fotossensibilidade:** a curva `flash(tick)` tem ≤ 3 subidas acima de 0,3 em qualquer janela de 60 ticks e exatamente 1
   flash de tela cheia.
8. **Carga:** com um `GerenciadorDeArte` de leitor falso, em nenhum tick há mais de 2 atlas não fixos residentes, BAATAR e ZENON
   nunca estão juntos e todo pedido sai ≥ 1 plano antes do uso. Com um leitor que nunca resolve a AMINU, o P3 vira reserva, a
   duração continua 2 400 e não há exceção.
9. **Roteiro:** `validarRoteiro()` passa. Um roteiro com 24 compassos, título de 19 caracteres ou zoom 1,4 é recusado.
10. **Música:** orçamento e régua da abertura (§7.5); `audio.test.ts` e `sons-*.test.ts` iguais, sem `-u`.

e2e (Playwright, `tests/e2e/trailer.spec.ts`):
11. **Fluxo:** boot → gesto → `trailer` → (fim) → `title` com `fromTrailer`. Título parado 30 s → `trailer` (origem `atrair`).
12. **Pular:** tecla no tick 30 → `title` em ≤ 0,5 s, **sem** abrir o menu. No c25, ENTER → `menu`. Toque (projeto de toque) também
    pula.
13. **Tempo até o 1º quadro:** do gesto (`performance.mark('trailer:gesto')` na `CenaBoot`) até o 1º `draw` do trailer: ≤ 50 ms
    no desktop e ≤ 150 ms com `Emulation.setCPUThrottlingRate(4)`.
14. **Quadro com CPU 4×:** p95 do tempo entre quadros do trailer inteiro ≤ **1,15 × o p95 da `CenaFight` CPU×CPU** medido no mesmo
    perfil (base B da T0), e nenhum quadro > 50 ms depois do 1º segundo.
15. **Determinismo de pixel:** `?manual=1&seed=5`, ticks 300, 1 200 e 2 300 desenhados duas vezes (recarga de página) dão 0 pixel
    de diferença.
16. **Movimento reduzido:** `emulateMedia({ reducedMotion: 'reduce' })` → versão estática, ≤ 10 s; amostra de luminância
    (canvas reduzido a 96×54 em todo tick) sem salto > 10% entre ticks; o gancho confirma zoom 1 e tremor 0.
17. **Áudio e WebKit:** no projeto WebKit, o trailer não lança exceção. Na origem `atrair` com `AudioContext` suspenso, roda mudo e
    `tocarAbertura` devolve false.
18. **Fidelidade intacta:** `fidelidade-ui.spec.ts` (`?expansao=4`) continua com 0 pixel de diferença na abertura (a `CenaIntro`
    não mudou).
19. **Memória (aproximada, Chromium):** a soma `largura × altura × 4` dos atlas e cenários residentes, lida dos contadores do
    gerenciador em todo plano, fica ≤ 270 MB. **iPhone real: não há prova automática.** O dono roda o trailer 3 vezes seguidas no
    iPhone (Safari Web Inspector → Timelines → Memory, ou simplesmente "não recarregou a aba"), e isso fica registrado como
    verificação manual.

---

## 9. Plano em fases (por agente)

| Fase | Quem | Entrega | Depende de | Paralelo com |
|---|---|---|---|---|
| **T0** Medidas de base | Íris (com Vega) | p95 da `CenaFight` CPU×CPU com CPU 4× (base B); µs/tick do `Game` com CPU 4×; custo do 1º `drawImage` de atlas 2048×1920 com e sem `decode()`; decisão `decode()` sim/não | — | T1 |
| **T1** Storyboard e textos | **Apolo** | `docs/storyboard-trailer.md` (a §3 afinada: quadros-chave por plano, golpes de cada batida, placas), `docs/textos-trailer.md` (títulos ≤ 18 caracteres, placas, epítetos) e, se o dono aprovar D-T5, a logo recortada | respostas D-T1..D-T3 | T0, T2 |
| **T2** Dados, diretor e escalação | **Vega** | `src/data/trailer/{tipos,roteiro,tomadas,validar}.ts`, `src/ui/trailer/{diretor,carga,relogio}.ts`, `ferramentas/trailer/escalar.ts` + `npm run trailer:escalar`, testes 1–9 | contrato §7 (pronto); roteiro provisório da §3 até o T1 chegar | T1, T4 (com dublê do diretor) |
| **T3** Música | **Vega** | régua calibrada antes; `ArranjoDef`, `citacaoDoTema`, `tocarAbertura/posicaoDaAbertura/pararAbertura`, teste 10 | mapa de compassos da §3 (pronto); T1 só para os acentos | T2, T4 |
| **T4** Cena, câmera e integração | **Lyra** | `CenaTrailer` (casca + pedaço lazy), `src/render/trailer/*`, letterbox, títulos, montagem, P0, P9 (braseiros + `EntradaDoChefe` curta), P10 (`marca`), versão estática, contador do título, `Regras.trailer`, `?trailer=`, `#pad` escondido, linha ABERTURA nas OPÇÕES (se D-T1 = C), `?trailer=0` nos e2e antigos que esperam `intro` | T2 (diretor real; antes, dublê) | T3 |
| **T4b** Campo `abertura` | Cronos | `Configuracoes.abertura?` aditivo na v2 + validação | D-T1 = C | T4 |
| **T5** Escalação final e aprovação | Vega + Apolo + **dono** | rodar `trailer:escalar` com o roteiro do T1; prévia `?trailer=Px`; dono aprova o corte | T1, T2, T4 | — |
| **T6** Portões | **Íris** | testes 11–19, auditoria dos e2e antigos (quais passaram a usar `?trailer=0`), veredito | T3, T4, T5 | — |
| **T7** Docs | **Alexandria** | README (trailer, `?trailer=`), `docs/como-adicionar-um-lutador.md` (novo passo: plano no roteiro + `DESTAQUE` + rodar a escalação), PROGRESSO | T6 | — |

Órion não entra: não há superfície nova de entrada nem de rede. Vulcano não entra: sem mudança de pipeline (o `trailer:escalar` é
ferramenta local, não roda no CI; o CI só roda os testes que **conferem** as tomadas).

Ordem crítica: **T2 → T5 → T6**. T1 e T3 correm em paralelo. A logo oficial NÃO bloqueia nada (há queda para a `marca` de hoje).

---

## 10. Riscos e dívidas conscientes

| # | Risco | Mitigação |
|---|---|---|
| R1 | **E2e antigos quebram**: vários esperam `boot → intro → title` (`jogo.spec.ts` 45/51/267/271, `arte-sob-demanda.spec.ts` 68/71 e outros) | `?trailer=0` explícito nesses testes, sem aumentar timeout (mesma lição da provocação). A Íris audita a lista inteira na T6 |
| R2 | **Memória no iPhone**: pico ≈ 255 MB + silhuetas; decodificação no 1º desenho trava o corte | ≤ 2 não fixos, BAATAR e ZENON nunca juntos, P8 como folga, soltar na saída, `decode()`, portão 19 e verificação manual do dono |
| R3 | **Rebalanceamento ou CPU nova invalida as tomadas** | CI vermelho com instrução de 1 comando; em execução o trailer degrada sem quebrar; o corte novo precisa ser **reaprovado** (o trailer pode mudar de cara a cada balanço) |
| R4 | **Arte do ZENON** (4 páginas, 60 MB) e defeitos de arte expostos pela câmera lenta e pela aproximação (franjas magenta, ressalvas do BAATAR/AMINU/NILA) | Zoom ≤ 1,35; a escalação evita tomadas com as poses ressalvadas em close (lista do Apolo na T1) |
| R5 | **Sincronia imagem × música** no celular (quadros perdidos, latência do iOS) | Relógio do `AudioContext` manda (§4.5); a música entra no compasso seguinte |
| R6 | **Fadiga**: 40 s em toda abertura | Pular a qualquer momento; D-T1 (opção CURTA); modo atrair mudo depois da 1ª repetição |
| R7 | **Dados móveis** (~10 MB no 1º trailer) | `saveData`/2g/3g → estática; prebusca de prioridade baixa; o trailer nunca espera a rede |
| R8 | **Fotossensibilidade** | Testes 7 e 16; um só flash de tela cheia |
| R9 | **Tomadas "feias"** (CPU passiva, golpe fora de quadro) | Pontuação de densidade de ação na escalação + aprovação por olho |
| R10 | **Peso do pacote** | Tudo do trailer (diretor, dados, render, arranjo) num pedaço lazy; o pacote principal só ganha a casca |

Dívidas conscientes: sem interpolação na câmera lenta (estilizado); sem rotação de câmera; M3 (retoque golpe a golpe) adiada;
verificação de memória no iPhone manual.

---

## Decisões em aberto (para o dono)

- **D-T1 Quando o trailer toca.** (A) Sempre depois do boot, mais o modo atrair. (B) Completo só na 1ª vez de cada versão, depois a
  abertura curta de hoje, mais o modo atrair. (C) Como A, mais a opção ABERTURA: TRAILER/CURTA nas OPÇÕES (campo aditivo, sem
  migração). **Recomendo C.**
- **D-T2 Spoiler.** Guardiões ainda bloqueados e o ZENON aparecem antes de liberados? **Recomendo:** os 5 guardiões aparecem
  normalmente (dá vontade de liberar, como a grade da seleção já faz com a ED5). O ZENON aparece em **contraluz** (silhueta escura,
  olhos e anel E12 visíveis, nome "???") até ser liberado, e completo depois. O progresso escolhe a variante; as duas são
  determinísticas e testadas.
- **D-T3 Duração.** 40 s (25 compassos, a §3) ou 30 s (19 compassos, sem C1/C3 e com P5+P6 de 1 compasso). **Recomendo 40 s.**
- **D-T4 Som no modo atrair.** Música só na 1ª repetição depois do último gesto, depois mudo. **Recomendado.** A alternativa é
  sempre com som.
- **D-T5 Logo no trailer.** Uma imagem recortada com alfa, com efeitos procedurais (**recomendado**, sem custo), ou camadas
  separadas (dragões, globo, letras), que exigem regenerar no Runway (custo de créditos) para reconstruir o que está atrás das
  letras.
- **D-T6 Coreografia.** Escalação automática M2 (**recomendado**) ou retoque golpe a golpe M3 em algum plano específico (mais
  trabalho a cada rebalanceamento).
- **D-T7 Celular com economia de dados.** Versão estática (**recomendado**) ou trailer completo sempre.
- **D-T8 Narração.** "INNO FIGHTERS!" sintetizado por `vozFormante` no impacto da logo? **Não recomendo:** a síntese de fala tende a
  sair ininteligível. Os gritos de cada lutador (a identidade sonora) já entram nos planos.
