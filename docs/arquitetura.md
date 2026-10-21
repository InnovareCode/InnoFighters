# Arquitetura

Como o código está organizado hoje (commit `0684548`, 2026-10-21). Cada afirmação aponta para arquivo e linha, conferidos nesta data.
O que não foi confirmado por leitura ou execução está marcado **a confirmar**.

## 1. Camadas

Cada camada importa só das camadas da coluna "Importa de", com a exceção registrada abaixo.

| Pasta | Responsabilidade | Importa de |
|---|---|---|
| `core/` | tipos de contrato (`contratos.ts`), RNG com semente (`rng.ts`), armazenamento v2 (`storage.ts`), constantes (`constantes.ts`) | `meta/` (só `storage.ts`) |
| `meta/` | regras de desbloqueio e chefão (`regras.ts`), progresso puro (`progresso.ts`), escada do Arcade (`escada.ts`) | `core/` |
| `data/` | definições dos lutadores (`lutadores/*.ts`), golpes, cenas (`cena.ts`), cenários (`cenarios.ts`), montagem e validação (`montar.ts`) | `core/`, `data/tipos.ts` |
| `fight/` | motor da luta: `Game`, `Fighter`, CPU, colisão, projétil. Sem DOM, áudio nem render | `core/`, `data/` |
| `audio/` | sons e música sintetizados (`audio-sys.ts`, trilhas em `TRILHAS`), tradução de eventos em som (`eventos.ts`) | `core/` |
| `render/` | desenho em canvas: pose, HUD, cenário, efeitos, cinemática, entrada do chefão, aura, legenda | `core/`, `data/`, `assets/` |
| `assets/` | manifesto C1 (`manifesto.ts`), carregador (`carregador.ts`), carga sob demanda (`gerenciador.ts`), elenco (`elenco.ts`) | `data/`, `core/` |
| `ui/` | cenas (`ui/cenas/*.ts`), menus, grade (`grade.ts`), navegador, persistência | quase todas as outras |
| `input/` | teclado, gamepad, toque: viram teclas virtuais e `InputFrame` | `core/` |
| `platform/` | escala do canvas, foco, tela cheia, avisos, erros | `core/` |
| `main.ts` | monta tudo e roda o laço | todas |

**Exceção registrada:** `core/storage.ts` importa `meta/` (`src/core/storage.ts:11-13`). O próprio arquivo diz que isso não cria ciclo. Ciclos no grafo inteiro não foram verificados com ferramenta: **a confirmar**.

## 2. Laço de execução

`src/main.ts`:

- Passo fixo de 1000/60 ms, ou seja, 60 ticks de lógica por segundo (`main.ts:148`).
- O tempo acumulado é limitado a 100 ms por quadro (`main.ts:159`), para não dar um salto depois de uma aba parada.
- Cada tick: `ui.update()` e depois `entrada.fimDoTick()` (`main.ts:163-166`). Cada quadro de tela: `ui.draw()` (`main.ts:168`).
- Pausa ao perder o foco ou ocultar a aba: `observarFoco` chama `ui.blur()` (`main.ts:117`).

Fluxo de entrada: teclado, gamepad e toque escrevem em `TeclasVirtuais` (`src/input/teclas.ts`). A luta lê um `InputFrame` (C2) por jogador por tick. A luta gera uma `LeituraLuta` (C3), que o render, a UI e o áudio leem.

Duas apresentações congelam o motor **sem** tocar no lock-step, porque a cena da luta não chama `game.update` enquanto elas rodam (`src/ui/cenas/fight.ts`):

- a **entrada dramática** do chefão: `entrada.avancar()` no lugar de `game.update` (`fight.ts:296-301`);
- a **cinemática do especial**: `passoDaCinematica()` e `return` antes de `game.update` (`fight.ts:306-309`; a chamada do motor está em `fight.ts:315`).

## 3. Contratos

Os contratos de tipos ficam em `src/core/contratos.ts`. Quem escreve é o motor (`fight/`). Quem lê são render, UI e áudio.

### C1: manifesto de atlas (versão 2)

Arquivo: `public/assets/lutadores/<id>/atlas.json`. Validação: `src/assets/manifesto.ts` (`validarManifesto`).

- `versao`: `1` ou `2` (`manifesto.ts:67`). A versão 1 (campo `imagem`, uma imagem só) continua aceita (`manifesto.ts:72`).
- `imagens`: de 1 a 8 arquivos (`MAX_PAGINAS = 8`, `manifesto.ts:10`). Só nome de arquivo, sem pasta (`manifesto.ts:6`).
- `tamanho`: `[largura, altura]` de cada página, em px.
- `alturaRef`: altura do `idle0` em px. 410 nos lutadores comuns, 525 no BAATAR, 558 no ZENON (`ferramentas/sprites/lutadores.json`).
- `quadros`: mapa nome da pose para `{ x, y, w, h, ax, p?, rosto?, ponta? }`. `p` é a página, `rosto` e `ponta` são pares `[x, y]` relativos ao canto do quadro.
- `retrato` (opcional): `{ arquivo, recorte }`. Sem ele, o carregador lê o `retrato.json` ao lado (`carregador.ts:208`).

Exemplo real, `public/assets/lutadores/aminu/atlas.json` (trecho, valores conferidos):

```json
{
  "versao": 2,
  "lutador": "aminu",
  "imagens": ["atlas-0.webp", "atlas-1.webp"],
  "tamanho": [2048, 1920],
  "alturaRef": 410,
  "retrato": { "arquivo": "retrato.png", "recorte": [2.5, 0, 190, 190] },
  "quadros": {
    "idle0": { "p": 1, "x": 788, "y": 4, "w": 346, "h": 410, "ax": 170.91, "rosto": [176.5, 91] },
    "lp1":   { "p": 0, "x": 365, "y": 981, "w": 385, "h": 421, "ax": 183.56, "ponta": [385, 92.09] }
  }
}
```

Situação dos atlas (`public/assets/lutadores/*/atlas.json`, lidos em 2026-10-21):

| Lutador | Versão | Páginas | Tamanho da página 1 (px) | alturaRef | Quadros |
|---|---|---|---|---|---|
| HAYATO | 2 | 2 | 2048x1536 | 410 | 48 |
| MIN-JI | 2 | 2 | 2048x1536 | 410 | 48 |
| AMINU | 2 | 2 | 2048x1920 | 410 | 48 |
| CENTELLA | 2 | 2 | 2048x1664 | 410 | 48 |
| CAMILLE | 2 | 2 | 2048x1472 | 410 | 48 |
| NILA | 2 | 3 | 2048x1600 | 410 | 60 |
| BAATAR | 2 | 4 | 2048x1664 | 525 | 54 |
| ZENON | 2 | 4 | 2048x1920 | 558 | 63 |
| WEI LONG | 1 | 1 (imagem única) | 3600x2296 | 410 | 63 |
| CAIO | 1 | 1 (imagem única) | 3600x2251 | 410 | 75 |

Convenção, não validada pelo carregador: quadro ativo tem `ponta` (`ferramentas/sprites/poses.mjs:19`, lista `COM_PONTA`). O `validarManifesto` não confere isso: **a confirmar** se algum atlas viola a convenção.

### C2: `InputFrame`

Definido em `src/core/contratos.ts:7`.

- Estado segurado: `left`, `right`, `up`, `down`.
- Borda de descida (verdadeiro só no tick do aperto): `lp`, `hp`, `lk`, `hk`, `sp`.
- `spSeg` (opcional): especial segurado. Usado pela carga do AMINU. Produzido em `src/input/teclas.ts`. A CPU não preenche.
- `esq` (opcional, `contratos.ts:31`): borda de descida da ESQUIVA. Só vale com `ConfigPartida.esquiva` ligada (`src/fight/game.ts:49`); desligada, o motor ignora o campo antes de qualquer conta. A direção vem do estado segurado: frente = avanço, trás/neutro/↓/↑ = recuo.

Exemplo de quadro com o especial segurado:

```json
{ "left": false, "right": true, "up": false, "down": false,
  "lp": false, "hp": false, "lk": false, "hk": false, "sp": false, "spSeg": true }
```

### C3: leitura da luta e eventos

Tipo `LeituraLuta` (`src/core/contratos.ts:496`). Campos principais: `fighters`, `projectiles`, `timer`, `round`, `winsNeeded`, `cam`, `phase`, `t`, `tick`, `shake`, `hitstop`, `mode`, `training`, `stage`, `winner`, `matchWinner`, `matchDone`, `perfect` e `events`.

Regras de consumo (comentário de C3 em `contratos.ts`):

1. `tick` só avança quando a luta anda. Durante o hitstop ele congela, junto com as partículas.
2. `events` é esvaziado no começo de cada tick. No tick congelado, fica vazio.
3. A luta não toca áudio nem cria partícula. Só emite evento.
4. Efeitos visuais usam um RNG separado do da lógica (`rngVisual`).

Lista completa dos eventos: `EventoLuta` (`src/core/contratos.ts:328`). Os da chefia:

- `fase-chefe` (`contratos.ts:543`), com `etapa` de tipo `EtapaFaseChefe` (`contratos.ts:535`): `'troca'`, `'cena'` ou `'retomada'`. Emitido em `src/fight/game.ts:906` (troca, antes do `hit` do mesmo tick), `:479` (cena) e `:493` (retomada). Antes de ser `'cena'`, a etapa se chamava `'danca'` (a Dança da Águia do BAATAR).
- `hit` e `block` têm `dreno?: number`, só quando houve dreno (`contratos.ts:361` e `:407`). Ausente = nenhum dreno.

### C4: armazenamento local

Implementação em `src/core/storage.ts`. Chaves em `src/core/contratos.ts:84-93`.

| Chave | Formato | Papel |
|---|---|---|
| `inno-fighters-v1` | `{ v: 1, s, hi }` | formato anterior. Continua lido na migração (`contratos.ts:84`) |
| `sakura-fighters-v4` | `{ s, hi }` (formato do protótipo) | legado. Migrado; removido só depois de a v2 ser gravada (`contratos.ts:86`, `storage.ts:142`) |
| `inno-fighters-v2` | `{ v: 2, s, hi, prog }` | chave atual (`contratos.ts:93`) |
| `inno-fighters-v2-quebrada` | texto cru | cópia de uma v2 ilegível, guardada antes de ser substituída |

**Migração** (`carregarDadosV2`, `src/core/storage.ts:252`), nesta ordem:

1. Se a v2 é válida, usa. O recorde vira `max(v2.hi, v1.hi)`. O legado é removido.
2. Senão, se a v1 é válida, monta `{ s, hi }` com progresso vazio e grava a v2.
3. Senão, se há legado, faz o mesmo com ele.
4. Senão, usa os padrões e não grava nada.

**v2 de build mais novo** (`v > 2`): é lida em memória, mas `salvarDadosV2` recusa gravar e retorna `false` (`storage.ts:216-222`). A UI mostra o aviso "Progresso não salvo neste aparelho" (`src/ui/persistencia.ts:6`).

**Ids desconhecidos** (`sanearProgresso`, `src/meta/progresso.ts`):

- Id fora do roster com forma de id vai para `prog.desconhecidos`, até `MAX_IDS_DESCONHECIDOS = 32` (`progresso.ts:107`). Não é usado, mas é regravado.
- Id que passou a existir no roster é promovido a `desbloqueados`.
- Iniciais nunca são guardados.
- `chefesDerrotados` aceita só ids com forma de id, sem repetição, até `MAX_CHEFES_DERROTADOS = 8` (`progresso.ts`). Não exige que o id esteja no roster.
- Lixo (não é texto, forma inválida, excesso) é descartado.

**Saneamento das configurações** (`sanearConfiguracoes`, `storage.ts:48`): `rounds` e `time` e `diff` aceitam só os valores que a UI oferece (`ROUNDS_VALIDOS`, `TEMPO_VALIDO = [0, 30, 60, 99]`, `storage.ts:29`). `cinematica` aceita só `completa`, `curta` ou `desligada`.

**Recorde:** inteiro entre 0 e `TETO_RECORDE = 99_999_999` (`storage.ts:35`). Fora disso vira 0.

Testes: `tests/unit/storage.test.ts`, `tests/unit/storage-v2.test.ts`, `tests/unit/progresso.test.ts`.

## 4. Carga sob demanda

- **Boot:** lê o `atlas.json` de todos os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, `src/assets/carregador.ts:247`). Se um falta, o boot falha (ver `docs/como-adicionar-um-lutador.md`, passo 8). Hoje são 10 manifestos.
- **Retratos:** todos, no boot (`elenco.ts:104`).
- **Imagens fixas:** a vitrine `VITRINE` (`src/data/lutadores/index.ts:41`, igual aos iniciais) e o cenário do título (`elenco.ts:93`). `?precarga=minima` (só em `npm run dev`) não carrega atlas no boot (`src/main.ts:120-121`).
- **Demais:** `GerenciadorDeArte.garantir` (`src/assets/gerenciador.ts:129`). No máximo 3 não fixos ficam na memória (`gerenciador.ts:19`). Sai o menos recente (`gerenciador.ts:178`).
- **Atlas sem imagem ainda:** `pronta = false`. O desenho pula o lutador até a arte chegar (`elenco.ts:11`).
- **Retrato:** o próprio (`retrato.png` com o `recorte`) ou um recorte do atlas, se o retrato não estiver carregado (`carregador.ts:158`).

O ZENON segue a mesma regra: nenhuma página `zenon/atlas-*.webp` é baixada no boot, na seleção nem antes da 5ª luta do Arcade, quando o Arcade as pré-busca (medido por Lyra, `tests/e2e/arte-sob-demanda.spec.ts`).

## 5. Determinismo

**Gerador:** mulberry32 (`src/core/rng.ts:22`, `criarRng`). Mesma semente, mesma sequência.

**Semente:** `?seed=N` na URL (`src/main.ts:42`, `lerSemente`), ou valor de `crypto.getRandomValues` (`rng.ts:43`, `sementeAleatoria`). `?seed=N` vale também em produção.

**Geradores separados** (`src/main.ts:58-60` e `:79`):

- lógica (CPU, sorteios da luta): `semente`
- visual (partículas, poeira, pétalas): `semente + 1`
- UI (escada do Arcade): `semente + 2`
- áudio: `semente + 3`

A cinemática e a entrada do chefão não chamam `game.update`, então não consomem o RNG da luta (`fight.ts:306-315`). Para a entrada, a prova relatada pela Lyra é: teste de unidade com foto do motor idêntica a uma luta sem entrada, depois de 600 ticks, e medição no navegador (tick, `t`, fase e RNG iguais em 30 quadros). **A confirmar:** a medição de navegador não está em teste automatizado.

**Teste de regressão:** `tests/unit/fight.test.ts:199` (mesma semente, mesmo resultado) e `:203` (CPU contra CPU, 6000 ticks, semente 42, comparado com `tests/unit/__snapshots__/fight.test.ts.snap`).

**Fidelidade ao protótipo:**

- Referência: `prototipo/inno-fighters-artefato.html` (`tests/unit/_prototipo.ts:9`). Os testes de fidelidade dependem do arquivo.
- Oráculo do HAYATO e da MIN-JI: o atlas original (v1), em `tests/fixtures/atlas-prototipo/<id>/`, porque a arte de produção foi trocada (`tests/unit/_lutadores.ts`).
- Áudio: `tests/fixtures/audio-sys-antes-do-chefe.ts` é a cópia congelada do `AudioSys` anterior à trilha do chefão. O teste compara tom e ruído de `fight` e `menu` com ela.
- E2E de fidelidade pixel a pixel: `tests/e2e/fidelidade-prototipo.spec.ts` e `tests/e2e/fidelidade-ui.spec.ts`.

## 6. Luta de chefão (ZENON)

O chefão final é `CHEFE = 'zenon'` (`src/meta/regras.ts`). A luta de chefe liga com `ConfigPartida.chefe`; fora dela, o ZENON é um lutador jogável comum (1 barra, sem armadura, `hp 100`).

### 6.1 Dados

- `ConfigChefe` (`src/data/tipos.ts:99`): `barras: 2`, `hpPorBarra`, `fichaFase1`, `fichaFase2`, `cena: CenaDef`, `bonusVitoria`, `trilha?`.
- `CenaDef` (`src/data/tipos.ts:93`): `{ duracao, poses }`. A pose do tick `t` é `poses[floor(t·n/duracao)]`, e a última segura até o fim.
- `src/data/cena.ts`: `poseDaCena` (usada pelo motor em `src/fight/fighter.ts:1050`, estado `cena`) e `validarCena` (duração inteira de 1 a 600; 1 a 8 nomes `^[\w-]+$`). `validarCena` é chamada em `src/data/montar.ts:105`, então dado inválido falha no boot.
- `Golpe.drenaEnergia` (`src/data/tipos.ts:200`, tipo `DrenaEnergiaDef` em `tipos.ts:120`): `{ acerto, defesa }`. Validado em `src/data/montar.ts:85-93`: recusa projétil, `hits > 1`, `throw`/`agarrao` e números fora de `0 <= defesa <= acerto <= 100`.
- `LutadorDef.anim.throw` (`src/data/tipos.ts:271`): arte própria do agarrão comum. Sem ela, vale a animação base (`src/data/anim.ts`, `BASE_ANIM.throw`).
- `LutadorDef.alturaEmPe` (`tipos.ts:283`): altura da hurtbox em pé, em múltiplo da escala. No ZENON, `1,25`: medido, 0,92 × 347 px visíveis / 254,4 px (`src/data/lutadores/zenon.ts`).
- `LutadorDef.alturaDoProjetil` (`tipos.ts:289`): altura, em px, de onde o projétil nasce. Usada em `src/data/montar.ts:198`. Ausente = a conta de sempre.
- Ficha: `FichaDef` (`tipos.ts:228`) é parcial e sobrescreve a base. Atenção: `mods` é **raso por golpe**. Veja a armadilha em `docs/como-adicionar-um-lutador.md`.

Números do ZENON (`src/data/lutadores/zenon.ts`, conferidos):

| Campo | Valor | Linha |
|---|---|---|
| `scale` | 1,36 | `zenon.ts:133` |
| `jump`, `spd`, `pow`, `hp`, `reach`, `stride` | 0,72; 0,92; 1,0; 100; 1,12; 15 | `zenon.ts:129-136` |
| `alturaEmPe` | 1,25 | `zenon.ts:139` |
| `alturaDoProjetil` | 175 | `zenon.ts:141` |
| `chefe` | 2 barras de 50; cena de 90 ticks (`cena0`, `cena1`, `cena2`); bônus 5000; `trilha: 'chefe'` | `zenon.ts:146-154` |
| dreno do TRIBUTO | 12/6 no jogável; 20/10 na ficha do chefe | `zenon.ts:46` e `:51`, `:63` |

### 6.2 Motor

- Dreno: `cobrarDreno` (`src/fight/game.ts:874`). `k = min(rival.en, valor)`, `rival.en -= k`, `atacante.en = min(100, atacante.en + k)`. Roda só nos ramos de acerto (`game.ts:817`) e de bloqueio (`game.ts:746`), **depois** dos ganhos normais do ramo. Armadura que absorve, PARADE, esquiva e `untouchable` retornam antes, então não drenam.
- Armadura da fase 2 do ZENON: `armor: 1` em `hp`, `hk` e `chp` da ficha `chefe2` (`zenon.ts:112`). Golpe de rank 2 ou menos não recua para a armadura (`zenon.ts:109`).
- Fases: troca de barra (`game.ts:906`), cena (`game.ts:479`), retomada com a ficha da fase 2 (`game.ts:493`). A troca de barra não é KO: `resolverVidaZerada` (`game.ts:891`) devolve `false` quando sobra barra.

### 6.3 Render

- Rampa da fase 2: `rampaDaFase2` (`src/render/aura-chefe.ts:26`) vem do **estado da luta**, não de evento. Vale 0 com todas as barras e entre a troca e o começo da cena; sobe de 0 a 1 durante `cena-chefe` (`t / duração`); vale 1 com a ficha da fase 2. Chamada em `src/render/mundo.ts:55`. Pausa e cinemática não prendem nem apagam a rampa.
- Aura: `desenharAuraChefe` (`aura-chefe.ts:43`), 4 primitivas, zero chamadas quando a rampa é 0.
- Arena da fase 2: `SOBREPOSICOES_DE_CENARIO` (`src/render/cenario.ts:48`), com `gr` em `src/render/arena-gr.ts`. Chamada por `desenharMundo` (`mundo.ts:6` e `:56`). Véu do céu, braseiros em púrpura e raios ocasionais; não usa o RNG da luta.
- Projétil do SELO: estilo `anel` (`src/render/projetil-anel.ts`) e estilo E12 (`src/render/estilos-especiais.ts`). Dreno visível: `src/render/moedas-dreno.ts`, a partir de `ev.dreno` (valor real transferido, não o dado).
- Apresentação: `APRESENTACAO` (`src/render/apresentacao-lutadores.ts:36`) reúne a pose de entrada e de vitória, as falas, o aviso do VS e o cartão da entrada. Só desenho: nada disso vai ao motor. `poseDeApresentacao` (`apresentacao-lutadores.ts:76`) troca só o nome da pose; a `intro` e a vitória continuam com o tempo do motor.
- Falas: `falaDoChefe` (`apresentacao-lutadores.ts:97`), desenhada em `src/ui/cenas/fight.ts:495` com `src/render/legenda.ts`. Ver o comportamento real na seção 6.6.
- Entrada dramática: `src/render/entrada-chefe.ts`. COMPLETA = 156 ticks (`DURACAO_ENTRADA_COMPLETA`, `:23`); CURTA = 60 ticks (`:24`). `PULO_VALE_A_PARTIR_DE = 10` (`:26`) e `SAIDA_AO_PULAR = 6` (`:28`). Escolha do modo: `modoDaEntrada` (`src/ui/cenas/fight.ts:95-104`).
- Cinemática do especial: `src/render/cinematica.ts`. COMPLETA = 48 ticks (`DURACAO_COMPLETA`), CURTA = 20 ticks (`DURACAO_CURTA`), saída ao pular em no máximo 6 ticks. `modoDaCinematica` (`cinematica.ts:49`) devolve `null` para DESLIGADA ou com `Regras.cinematica` desligada.
- Escala na vitrine: `escalaDeVitrine` (`src/ui/personagens.ts:26`) encolhe só quem passa de `ESCALA_MAXIMA_DE_VITRINE = 1.1` (`personagens.ts:23`). Usada em seleção, VS e final (`src/ui/cenas/select.ts:259`, `vs.ts:93`, `fim.ts:48`). Os lutadores de até 1,1 ficam idênticos ao de antes. O BAATAR (1,28) e o ZENON (1,36) são encolhidos na vitrine, não no dado.

### 6.4 Áudio

- Trilhas: `TRILHAS` (`src/audio/audio-sys.ts:60-64`). `fight` (150 bpm, 16 passos por compasso, 4 compassos), `menu` (92 bpm, 16 passos, 4 compassos) e `chefe` (138 bpm, valsa em 3/4: 12 passos por compasso, 8 compassos, `andamentoFase2 1.12`).
- `playChefe` (`audio-sys.ts:482`): Ré frígio, bordão e bumbo no passo 0; órgão em quintas nos passos 4 e 8; prato no 8; cravo em 96 passos de melodia. Tudo determinístico em `step`, sem `Math.random` (`src/audio` não tem nenhum).
- Fase 2: `AudioSys.musicaDaFase(2)` (`audio-sys.ts:425`): bumbo também nos tempos 2 e 3, órgão uma oitava abaixo, andamento +12%. Só vira no início do próximo compasso.
- Gatilho: a etapa `cena` de `fase-chefe` chama `introWhoosh` e `musicaDaFase(2)` (`src/audio/eventos.ts:70`).
- `startMusic` (`audio-sys.ts:403`): sempre volta à fase 1 no próximo compasso. A trilha da luta vem de `cfgChefe.trilha ?? 'fight'` (`src/ui/cenas/fight.ts:154`).

### 6.5 Grade de 10 e casa de honra

- `temCasaDeHonra(n)` (`src/ui/grade.ts`): verdadeiro só com 10 casas (9 regulares + o chefão).
- `ordemDaGrade` (`grade.ts`): os 9 regulares na ordem do roster (BAATAR na 9ª casa, AMINU no centro); o chefão por último, no índice 9.
- `CASA_DE_HONRA` (`grade.ts:51`): `{ x: 352, y: 356, w: 256, h: 44 }`, logo abaixo da 3x3. Oculta = "???" e "O ANFITRIÃO". Liberada = rosto, nome, título e "CHEFÃO" (e NOVO! se for o caso).
- `moverNaGrade` (`grade.ts:79`): ↓ da 3ª linha vai para a honra; ↑ da honra vai para a casa 7; ↑ da 1ª linha vai para a honra; ↓ da honra vai para a casa 1; ←/→ na honra não mudam.
- Área de toque da honra: 4 px de folga em cima e 8 embaixo (`retanguloDeToque`, `grade.ts:69`).

### 6.6 Esquiva

- Parâmetros de partida (`src/data/esquiva.ts`, `ESQUIVA_PADRAO`): custo 20 de energia, buffer de 6 ticks para o botão. Trás: 22 ticks, invulnerável de 0 a 14, 120 px. Frente: 26 ticks, invulnerável de 3 a 19, 150 px. Ajuste pelo harness: `npm run balanco`.
- Regra ligada em `src/meta/regras.ts` (`esquiva: true`). Quando desligada, `body.sem-esquiva` esconde o botão ESQ do toque (`src/input/toque.css:38`).
- Entradas: teclado P1 `n`, P2 `o` (`src/input/mapa.ts:22` e `:35`); gamepad L1/L2 (`mapa.ts:56-57` e `:71-72`); toque, botão ESQ (`index.html:23`).
- Apresentação: `src/render/esquiva.ts` (corpo fantasma e rastro só na janela invulnerável). A cor do lutador sai de `fire[0]` (`silhuetaTingida`).

### 6.7 Fala do chefão: comportamento real

`falaDoChefe` (`apresentacao-lutadores.ts:97-106`) devolve:

- `fase2` durante `cena-chefe`;
- `vitoria` ou `derrota` em `roundend` e `matchend`, conforme quem venceu o round ou a luta;
- `derrota` na fase `ko` com o chefão a 0 de vida.

Isso significa que a fala de derrota aparece também quando o chefão perde um round por tempo, e a de vitória aparece quando ele vence um round, não só a luta. A intenção documentada (spec, Lyra) era derrota só no KO final. **Decisão em aberto** em `PROGRESSO.md`.

## 7. Tela e escala

- Resolução lógica: 960x540 (`src/core/constantes.ts:2-3`).
- Buffer do canvas: 1920x1080 (`index.html:18`), que é 2x a lógica (`RS = 2`, `src/render/tela.ts:6`).
- Escala na tela: maior retângulo 16:9 que cabe na janela (letterbox), aplicado por CSS (`src/platform/escala.ts`, `ajustarEscala` chamada em `src/main.ts:53`).
- Controles: `src/input/mapa.ts`. Lista para o jogador: `README.md`, seção Controles.

## 8. Balanceamento (harness)

- Comando: `npm run balanco -- [--rapido | --completo] [opções]` (`ferramentas/balanco/cli.mjs`, ajuda com `--ajuda`).
- `--completo` (100 sementes por combinação, NORMAL e DIFÍCIL) grava a referência em `docs/balanco/`: `resultados.md`, `resultados.json`, `frame-data.md`, `frame-data.json`.
- **A referência versionada é a rodada SEM esquiva** (`docs/balanco/resultados.md`, versão de dados `267890b2233a`, hash `08a116c08e22a075`). Com `--esquiva`, a saída vai para `relatorios/balanco-esquiva/`, que não é versionada (`cli.mjs:70`). A produção tem `esquiva: true` (`src/meta/regras.ts`). Por isso, a referência em `docs/balanco/` não representa o jogo como ele é hoje. **Decisão em aberto** em `PROGRESSO.md`.
- Números do chefão, rodada sem esquiva (`docs/balanco/resultados.md`): jogador vence **31,4%** no NORMAL e **19,1%** no DIFÍCIL (meta 20-40%, só vale no NORMAL). ZENON jogável na taxa geral: 52,9% (IC 51%-55%).
- Números com esquiva (`relatorios/balanco-esquiva/resultados.md`, hash `23037ac3e454a428`, não versionado): **36,0%** no NORMAL e **28,0%** no DIFÍCIL. **A confirmar** com nova rodada `npm run balanco -- --completo --esquiva` antes de citar em doc público.
- Harness: `ferramentas/balanco/` (cada luta monta a própria `Game` em memória; nada toca o estado do jogo).

## 9. Política de segurança de conteúdo (CSP)

Definição: `POLITICA_CSP` em `vite.config.ts:17-24`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:
```

- Entra como `<meta http-equiv>` só no build (plugin `cspSoNoBuild`, `vite.config.ts:27`). O dev server injeta scripts inline, então não recebe a CSP.
- Exceções documentadas em `vite.config.ts:9-14`: `style-src 'unsafe-inline'` (estilo do `index.html` e do `<pre id="err">`); `img-src data: blob:`, `media-src blob:` e `connect-src 'self'`, que hoje não são usados e ficam como folga.
- A meta **não** cobre `frame-ancestors`, `report-uri` nem `sandbox`. Esses só funcionam como cabeçalho HTTP (`vite.config.ts:15`).
- Teste: `tests/e2e-build/csp.spec.ts`, contra o build (`npm run test:e2e:build`).
- O Pages não permite definir cabeçalhos. No EasyPanel, a política deve virar cabeçalho (`vite.config.ts:5-6`).

## 10. Build e publicação

- `npm run build` = `tsc --noEmit && vite build` (`package.json`). Gera `dist/` com sourcemap (`vite.config.ts:42`).
- O mapa de código-fonte fica público no build. A decisão do dono é trocar para `sourcemap: 'hidden'` ao privar o repositório (`PROGRESSO.md`, seção do repositório público). Ainda não foi feito.
- Pages: `.github/workflows/pages.yml`, temporário. Ver `README.md`.

## 11. Ferramentas

| Arquivo | Função | Estado (2026-10-21) |
|---|---|---|
| `ferramentas/extrair-prototipo.mjs` | tira atlas e cenários do protótipo para `public/assets` | usado na F1 |
| `ferramentas/sprites/` | pipeline de folhas para atlas C1 v2. `npm run sprites -- <id>` | executa: sem argumento, imprime o uso. O import duplicado de `separarFundidas` não está mais no HEAD. `npm run sprites -- zenon` **não foi rodado** nesta passada (grava em `sprites-gerados/` e `arte-fonte/`) |
| `ferramentas/balanco/` | harness de frame data e simulação (`npm run balanco`) | commitado; `docs/balanco/` é a rodada sem esquiva (seção 8) |
| `ferramentas/gerar-retratos.mjs` | retrato de cada lutador a partir do atlas (`--so <id>`, `--verificar`) | funcional, sem script npm |
| `ferramentas/converter-cenarios.mjs` | cenários da arte-fonte para WebP 1920x1080. `--so <sigla>` converte só alguns | fontes em `FONTES` (`converter-cenarios.mjs:13`); a `gr` usa `gr-v2` |
| `ferramentas/prompts/montar-prompts.mjs` | gera `docs/prompts/` a partir de `docs/prompts-arte.md` | não reconferido nesta passada |

## 12. Pendências técnicas (verificadas em 2026-10-21)

- **`poseDaCena` existe em duas cópias:** `src/data/cena.ts` (motor e render) e `src/render/apresentacao-lutadores.ts:59` (render). A fórmula é a mesma para dados válidos, mas uma mudança numa precisa ir para a outra. Sinalizado, não corrigido.
- **Comentário velho:** `src/fight/game.ts` (`resolverVidaZerada`, comentário em `game.ts:887-890`) ainda diz "a Dança da Águia fica pendente". Hoje é a cena da fase 2.
- **DESLIGADA não desliga a entrada do chefão:** `modoDaEntrada` (`src/ui/cenas/fight.ts:102-103`) devolve `'curta'` quando a preferência é `desligada`. O comentário da função diz que isso é intencional. **Decisão em aberto** em `PROGRESSO.md`.
- **Padrão de cinemática repetido:** `fight.ts:102` usa `'completa'` literal; o padrão do jogo é `CINEMATICA_PADRAO` (`src/core/contratos.ts:53`). Hoje o valor é o mesmo.
- **Referência de balanço sem esquiva** (seção 8).
- **Tecla H:** alterna `game.debug` (`src/ui/cenas/fight.ts:430`). A tela "Como jogar" não cita mais a H. O desenho das caixas de colisão nesse modo: **a confirmar**.
- **Prompts de arte:** `docs/prompts-arte.md` §11 cita o Gemini como gerador. O histórico registra o Runway. **A confirmar.**
