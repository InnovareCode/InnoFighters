# Arquitetura

Como o código está organizado no HEAD `f5b5fab` (2026-10-23). Os `arquivo:linha` foram conferidos contra o HEAD (`git show` / `git grep`) nesta passada. Em `src/`, a árvore de trabalho estava igual ao HEAD no início desta passada. O que não foi confirmado por leitura ou execução está marcado **a confirmar**.

Histórico de marcos: `CHANGELOG.md`. Estado e decisões: `PROGRESSO.md`.

## 1. Camadas

Cada camada importa só das camadas da coluna "Importa de", com as exceções registradas abaixo.

| Pasta | Responsabilidade | Importa de |
|---|---|---|
| `core/` | tipos de contrato (`contratos.ts`), RNG com semente (`rng.ts`), armazenamento v2 (`storage.ts`), constantes (`constantes.ts`) | `meta/` (só `storage.ts`) |
| `meta/` | regras de desbloqueio e chefões (`regras.ts`, `chefes.ts`), progresso puro (`progresso.ts`), escada do Arcade (`escada.ts`) | `core/` |
| `data/` | lutadores (`lutadores/*.ts`), golpes, cenas (`cena.ts`), cenários, montagem e validação (`montar.ts`), falas das provocações (`provocacoes*.ts`), sons (`sons/`), temas musicais (`musica/`), roteiro do trailer (`trailer/`), esquiva (`esquiva.ts`) | `core/`, `data/tipos.ts` |
| `fight/` | motor da luta: `Game`, `Fighter`, CPU, colisão, projétil. Sem DOM, áudio nem render | `core/`, `data/` |
| `audio/` | sons e música sintetizados (`audio-sys.ts`, `TRILHAS`), tradução de eventos em som (`eventos.ts`), temas (`temas.ts`, `partitura.ts`), identidade sonora (`identidade-sonora.ts`), amostras reais (`amostras.ts`, `plano-amostras.ts`), carga por pedaços (`camadas.ts`) e chaves (`chaves.ts`) | `core/`, `data/musica/`, `data/sons/` |
| `render/` | desenho em canvas: pose, HUD, cenário, efeitos, cinemática (tarja do especial), entrada do chefão, aura, provocação e balão, trailer (`render/trailer/`) | `core/`, `data/`, `assets/` |
| `trailer/` | trailer de abertura, sem DOM: diretor (`diretor.ts`), música (`musica.ts`), quadros estáticos (`estatica.ts`), marca (`marca.ts`) | a confirmar (importa `data/musica` em `src/trailer/musica.ts:5`) |
| `assets/` | manifesto C1 (`manifesto.ts`), carregador (`carregador.ts`), carga sob demanda (`gerenciador.ts`), elenco (`elenco.ts`) | `data/`, `core/` |
| `ui/` | cenas (`ui/cenas/*.ts`), menus, grade (`grade.ts`), navegador, persistência, painel de escuta (`escuta.ts`), logo oficial (`logo.ts`), trailer em cena (`ui/trailer/`, carregado sob demanda) | quase todas as outras |
| `input/` | teclado, gamepad, toque: viram teclas virtuais e `InputFrame`; botões de toque (`toque.ts`) | `core/` |
| `platform/` | escala do canvas, foco, tela cheia (`tela-cheia.ts`), avisos, erros | `core/` |
| `versao.ts` | identidade do build e verificação de versão nova no ar | a confirmar |
| `main.ts` | monta tudo e roda o laço | todas |

**Exceções registradas:**

- `core/storage.ts` importa `meta/` (`src/core/storage.ts:13-15`). O próprio arquivo diz que isso não cria ciclo. Ciclos no grafo inteiro não foram verificados com ferramenta: **a confirmar**.
- `audio/temas.ts` e `audio/identidade-sonora.ts` importam `data/musica/` e `data/sons/` (`src/audio/temas.ts:2`, `src/audio/identidade-sonora.ts:2`). `data/` não importa `audio/`. Motivo: a validação de orçamento de fontes (`validarOrcamentoDosTemas`, `src/audio/temas.ts:62`) precisa da partitura.
- `ui/escuta.ts` importa `data/sons` (`src/ui/escuta.ts:9`), pelo mesmo motivo de ouvir os sons sem jogar.

## 2. Laço de execução

`src/main.ts`:

- Passo fixo de 1000/60 ms: `const PASSO = 1000 / 60;` (`src/main.ts:195`), ou seja, 60 ticks de lógica por segundo.
- O tempo acumulado por quadro é limitado a 100 ms (`src/main.ts:206`), para não dar um salto depois de uma aba parada.
- Cada tick chama `entrada.fimDoTick()` (`src/main.ts:199` e `:212`).
- Pausa ao perder o foco ou ocultar a aba: `observarFoco(window, { aoPerderFoco: () => ui.blur(), ... })` (`src/main.ts:164`; a função está em `src/platform/foco.ts:12`).

Fluxo de entrada: teclado, gamepad e toque escrevem em `TeclasVirtuais` (`src/input/teclas.ts`). A luta lê um `InputFrame` (C2) por jogador por tick. A luta gera uma `LeituraLuta` (C3), que o render, a UI e o áudio leem.

Três apresentações congelam o motor **sem** tocar no lock-step, porque a cena da luta não chama `game.update` enquanto elas rodam (`src/ui/cenas/fight.ts`, método `update()`, `:428`):

- a **entrada dramática** do chefão: `this.entrada.avancar()` no lugar de `game.update` (`fight.ts:434`), com `return` em `:437`;
- a **cinemática do especial**: `passoDaCinematica()` (definido em `fight.ts:403`, chamado em `:446`), com `return` em `:447`;
- a **provocação** (balão antes do round, na vitória): ramo próprio do `update` da cena (`fight.ts:440` e `:441-444`), que não anda o relógio do motor. Ver a seção 13.

## 3. Contratos

Os contratos de tipos ficam em `src/core/contratos.ts`. Quem escreve é o motor (`fight/`). Quem lê são render, UI e áudio.

### C1: manifesto de atlas (versão 2)

Arquivo: `public/assets/lutadores/<id>/atlas.json`. Validação: `validarManifesto` (`src/assets/manifesto.ts:64`).

- `versao`: `1` ou `2`. A versão 1 (campo `imagem`, uma imagem só) continua aceita.
- `imagens`: de 1 a 8 arquivos (`MAX_PAGINAS = 8`, `src/assets/manifesto.ts:10`). Só nome de arquivo, sem pasta.
- `tamanho`: `[largura, altura]` de cada página, em px.
- `alturaRef`: altura do `idle0` em px. 410 nos lutadores comuns, 525 no BAATAR, 558 no ZENON (`ferramentas/sprites/lutadores.json`).
- `quadros`: mapa nome da pose para `{ p, x, y, w, h, ax, rosto?, ponta? }`. `p` é a página; `rosto` e `ponta` são pares `[x, y]` relativos ao canto do quadro.

Exemplo real, `public/assets/lutadores/aminu/atlas.json` (trecho, sem as demais poses):

```json
{
  "versao": 2,
  "lutador": "aminu",
  "imagens": ["atlas-0.webp", "atlas-1.webp"],
  "tamanho": [2048, 1920],
  "alturaRef": 410,
  "quadros": {
    "idle0": { "p": 1, "x": 788, "y": 4, "w": 346, "h": 410, "ax": 170.91, "rosto": [176.5, 91] }
  }
}
```

Situação dos atlas (lida em 2026-10-21; nenhum `public/assets/lutadores` mudou no git até `f5b5fab`):

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

Convenção, não validada pelo carregador: quadro ativo tem `ponta` (`ferramentas/sprites/poses.mjs:19`, lista `COM_PONTA`). **a confirmar** se algum atlas viola a convenção.

### C2: `InputFrame`

Definido em `src/core/contratos.ts:7`.

- Estado segurado: `left`, `right`, `up`, `down`.
- Borda de descida (verdadeiro só no tick do aperto): `lp`, `hp`, `lk`, `hk`, `sp`.
- `spSeg` (opcional): especial segurado. Usado pela carga do AMINU. Produzido em `src/input/teclas.ts`. A CPU não preenche.
- `esq` (opcional, `contratos.ts:31`): borda de descida da ESQUIVA. Só vale com `ConfigPartida.esquiva` ligada (`src/fight/game.ts`); desligada, o motor ignora o campo antes de qualquer conta. A direção vem do estado segurado: frente = avanço, trás/neutro/↓/↑ = recuo.

Exemplo de quadro com o especial segurado:

```json
{ "left": false, "right": true, "up": false, "down": false,
  "lp": false, "hp": false, "lk": false, "hk": false, "sp": false, "spSeg": true }
```

### C3: leitura da luta e eventos

Tipo `LeituraLuta` (`src/core/contratos.ts:510`). Tipo `EventoLuta` (`src/core/contratos.ts:342`).

Regras de consumo (comentário de C3 em `src/core/contratos.ts`, ~linhas 118-126):

1. `tick` só avança quando a luta anda. Durante o hitstop ele congela, junto com as partículas.
2. `events` é esvaziado por `fight/` no início de cada tick. No tick congelado, fica vazio (`contratos.ts:122`).
3. A luta não toca áudio nem cria partícula. Só emite evento (`contratos.ts:124`).
4. Efeitos visuais usam um RNG separado do da lógica (`rngVisual`).

Eventos da chefia: `fase-chefe`, com `etapa` `'troca'`, `'cena'` ou `'retomada'`. A etapa `'cena'` é emitida em `src/fight/game.ts:490`. Hit e block têm `dreno?: number`, só quando houve dreno.

### C4: armazenamento local

Implementação em `src/core/storage.ts`. Chaves em `src/core/contratos.ts`.

| Chave | Formato | Papel |
|---|---|---|
| `inno-fighters-v1` (`CHAVE_STORAGE`, `contratos.ts:98`) | `{ v: 1, s, hi }` | formato anterior. Continua lido na migração |
| `sakura-fighters-v4` (`CHAVE_STORAGE_LEGADA`, `contratos.ts:100`) | `{ s, hi }` (formato do protótipo) | legado. Migrado; removido só depois de a v2 ser gravada |
| `inno-fighters-v2` (`CHAVE_STORAGE_V2`, `contratos.ts:107`) | `{ v: 2, s, hi, prog }` | chave atual |
| `inno-fighters-v2-quebrada` (`CHAVE_STORAGE_V2_QUEBRADA`, `storage.ts:168`) | texto cru | cópia de uma v2 ilegível, guardada antes de ser substituída |

**Migração** (`carregarDadosV2`, `src/core/storage.ts:259`), nesta ordem: 1) se a v2 é válida, usa; 2) senão, se a v1 é válida, monta `{ s, hi }` com progresso vazio e grava a v2; 3) senão, se há legado, faz o mesmo com ele; 4) senão, usa os padrões e não grava nada. **a confirmar** o detalhe do recorde (`max(v2.hi, v1.hi)`) sem reler o corpo de `carregarDadosV2` inteiro nesta passada.

**v2 de build mais novo** (`v > 2`, `storage.ts:200`): é lida em memória, mas `salvarDadosV2` (`storage.ts:223`) recusa gravar e retorna `false`. A UI mostra o aviso de progresso não salvo (`src/ui/persistencia.ts`, `MSG_NAO_SALVO`).

**Ids desconhecidos e saneamento do progresso** (`sanearProgresso`, `src/meta/progresso.ts`):

- Id fora do roster com forma de id vai para `prog.desconhecidos`, até `MAX_IDS_DESCONHECIDOS = 32` (`progresso.ts:130`). Não é usado, mas é regravado.
- Id que passou a existir no roster é promovido a `desbloqueados`.
- Iniciais nunca são guardados.
- `chefesDerrotados` aceita só ids com forma de id, sem repetição, até `MAX_CHEFES_DERROTADOS = 16` (`progresso.ts:27`). Um guardião derrotado entra na lista; `CHEFOES_SO_POR_DERROTA = ['zenon']` (`progresso.ts:21`) são os que se liberam só por derrota.
- Lixo (não é texto, forma inválida, excesso) é descartado.

**Saneamento das configurações** (`sanearConfiguracoes`, `src/core/storage.ts:50`): `rounds`, `time` e `diff` aceitam só os valores que a UI oferece. `cinematica` e `provocacoes` são lidos (`storage.ts:60-67`), mas são **preferências aposentadas**: `PREFERENCIAS_APOSENTADAS` (`src/ui/persistencia.ts`) tira os dois da memória ao carregar e só os devolve ao gravar. Na prática, o jogo não usa esses valores (ver seção 13 e a seção 12).

**Recorde:** `sanearHi` (`storage.ts:86`) aceita inteiro maior que 0 e até `TETO_RECORDE = 99_999_999` (`storage.ts:37`). Fora disso vira 0.

Testes: `tests/unit/storage.test.ts`, `tests/unit/storage-v2.test.ts`, `tests/unit/progresso.test.ts`, `tests/unit/provocacoes-storage.test.ts`.

## 4. Carga sob demanda

- **Boot:** lê o `atlas.json` de todos os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, que chama `carregarManifestos`, `src/assets/carregador.ts:248`). Se um falta, o boot falha (ver `docs/como-adicionar-um-lutador.md`).
- **Retratos:** todos, no boot.
- **Imagens fixas:** a vitrine `VITRINE` (`src/data/lutadores/index.ts:41`) e o cenário do título.
- **`?precarga=minima`** (só em `npm run dev`, `src/main.ts:168`): não carrega atlas no boot.
- **Demais:** `GerenciadorDeArte.garantir` (`src/assets/gerenciador.ts:129`). Limite de atlas não fixos na memória: `limiteResidentes`, com padrão 3 (`gerenciador.ts:48`). Sai o menos recente.
- **Atlas sem imagem ainda:** o lutador some do desenho até a arte chegar.

O ZENON segue a mesma regra: nenhuma página `zenon/atlas-*.webp` é baixada no boot, na seleção nem antes da 5ª luta do Arcade, quando o Arcade as pré-busca. Teste: `tests/e2e/arte-sob-demanda.spec.ts`.

## 5. Determinismo

**Gerador:** mulberry32 (`src/core/rng.ts:22`, `criarRng`). Mesma semente, mesma sequência.

**Semente:** `?seed=N` na URL (`lerSemente`, `src/main.ts:51-52`), ou valor de `crypto.getRandomValues` (`src/core/rng.ts:43`, `sementeAleatoria`). `?seed=N` vale também em produção.

**Geradores separados** (todos a partir de `semente`, `src/main.ts`):

- lógica (CPU, sorteios da luta): `semente` (`main.ts:74`)
- visual (partículas, poeira, pétalas): `semente + 1` (`main.ts:76`)
- UI (escada do Arcade): `semente + 2` (`main.ts:77`)
- áudio: `semente + 3` (`main.ts:104`)
- sorteio da seleção (casa aleatória e roleta): `semente + 4` (`main.ts:151`)
- sorteio das falas das provocações: `semente + 5` (`main.ts:152`, `sorteioDeFalas`). Fora do RNG da luta: a sequência do motor não muda.
- variação dos sons por lutador: `sementeVariacao = semente + 6` (`main.ts:104`).

A cinemática e a entrada do chefão não chamam `game.update`, então não consomem o RNG da luta (`fight.ts:434` e `:446`).

**Teste de regressão:** `tests/unit/fight.test.ts:199` (mesma semente, mesmo resultado).

**Fidelidade ao protótipo:** referência `prototipo/inno-fighters-artefato.html` (`tests/unit/_prototipo.ts:9`). Testes: `tests/unit/luta-fidelidade.test.ts` e `tests/e2e/fidelidade-prototipo.spec.ts`. Oráculo do HAYATO e da MIN-JI: a arte original (v1), não a de produção. **a confirmar** o caminho exato dessa fixture nesta passada.

## 6. Luta de chefão

O chefão do ARCADE tem duas formas, que convivem no código:

- **ZENON (o Anfitrião):** `CHEFE = 'zenon'` (`src/meta/regras.ts:19`). Duas barras, cena da fase 2, entrada dramática. Fora da luta de chefe, é jogável comum.
- **Guardiões (AMINU, CENTELLA, CAMILLE, NILA, BAATAR):** cada um tem um bloco `chefe` com duas barras, cena da fase 2, `bonusVitoria` e `danoRecebido`. Fora da luta de chefe, são lutadores comuns.

**Qual chefão aparece no ARCADE depende da chave `Regras.chefesDaFila`** (`src/meta/regras.ts:35`):

| Estado | `chefesDaFila` | Chefão do ARCADE |
|---|---|---|
| HEAD `f5b5fab` | `true` (commitado em `bb8dae2`) | o próximo guardião da fila (AMINU primeiro); o ZENON só com os 5 liberados |
| Chave `false` (rollback) | `false` | sempre o ZENON; a vitória usa o formato antigo `{ derrotouChefe }` |

A escolha é feita por `chefeDoArcade` (`src/meta/chefes.ts:21`): com a chave `true`, devolve o primeiro guardião da fila ainda travado e diferente de `c1`; se a fila acabou, devolve o ZENON; se `c1` é o próprio ZENON e a fila está esgotada, devolve `null` (sem luta de chefe). A chave `false` é de rollback e de `?expansao=4`.

Histórico relevante: o contrato (`chefeDoArcade`, `aplicarVitoriaArcade({ chefe })`, `danoRecebido`) entrou em `955e720`; a UI dos guardiões (entradas, véu de fase 2, textos, cartão de desbloqueio) entrou em `bb8dae2`.

### 6.1 Dados

- `ConfigChefe` (`src/data/tipos.ts`): `barras`, `hpPorBarra`, `fichaFase1?`, `fichaFase2?`, `cena: CenaDef`, `bonusVitoria`, `trilha?`, `danoRecebido?`. `fichaFase1` e `fichaFase2` são opcionais; o guardião não tem ficha de fase.
- `danoRecebido` (`src/data/tipos.ts:119`): multiplicador do dano que a **vida** do chefe sofre. `montar` recusa valores fora de `0,60` a `1` (`DANO_RECEBIDO_MIN = 0.6`, `src/data/montar.ts:98`; validação em `montar.ts:101`). É a alavanca de dureza: não muda a ficha, o ataque nem a IA.
- `CenaDef` (`src/data/tipos.ts`): `{ duracao, poses }`. A pose do tick `t` é `poseDaCena(cena, t)` (`src/data/cena.ts:8`); a última segura até o fim.
- `validarCena` (`src/data/cena.ts:15`), chamada em `src/data/montar.ts:117`: duração inteira de 1 a 600 e de 1 a 8 nomes de pose. Dado inválido falha no boot.
- `Golpe.drenaEnergia` (`{ acerto, defesa }`): validado em `src/data/montar.ts`. Recusa projétil, `hits > 1`, `throw`/`agarrao` e números fora de `0 <= defesa <= acerto <= 100`.
- `LutadorDef.alturaEmPe`: altura da hurtbox em pé, em múltiplo da escala. No ZENON, `1,22` (`src/data/lutadores/zenon.ts:139`).
- `LutadorDef.alturaDoProjetil`: altura, em px, de onde o projétil nasce. ZENON: `175` (`zenon.ts:141`).
- Ficha: `FichaDef` é parcial e sobrescreve a base. Atenção: `mods` é **raso por golpe** (armadilha descrita em `docs/como-adicionar-um-lutador.md`).

Números do ZENON (`src/data/lutadores/zenon.ts`, HEAD):

| Campo | Valor | Linha |
|---|---|---|
| `scale` | 1,32 | `zenon.ts:133` |
| `pow`, `hp` | 1,0; 100 | `zenon.ts:129` |
| `alturaEmPe` | 1,22 | `zenon.ts:139` |
| `alturaDoProjetil` | 175 | `zenon.ts:141` |
| `chefe` | 2 barras de 50 (`hpPorBarra`, `:148`); bônus 5000 (`:153`); `danoRecebido: 0.8` (`:156`); bloco começa em `:146` | `zenon.ts:146-156` |
| dreno do TRIBUTO | 12/6 no jogável | `zenon.ts:46` |
| armadura da fase 2 | `armor: 1` em `hp`, `hk` e `chp` (ficha `chefe2`) | `zenon.ts:112` |

Números dos guardiões (`src/data/lutadores/*.ts`, HEAD; cada um tem `chefe: { barras: 2, hpPorBarra, cena, bonusVitoria: 3000, danoRecebido }`):

| Guardião | `hpPorBarra` | `danoRecebido` | Referência |
|---|---|---|---|
| AMINU | 56 | 0,925 | `aminu.ts:68`, `:71` |
| CENTELLA | 48 | 0,875 | `centella.ts:62`, `:65` |
| CAMILLE | 49 | 0,925 | `camille.ts:72`, `:75` |
| NILA | 54 | 0,875 | `nila.ts:124`, `:127` |
| BAATAR | 46 | 0,85 | `baatar.ts:82`, `:85` |

### 6.2 Motor

- `danoNoDefensor` (`src/fight/game.ts:287`): multiplica o dano pelo `danoRecebido` do chefe (`game.ts:288`). Ausente ou `1` devolve o número sem multiplicar. O fator mora em `cfgChefe` do lutador, não na ficha: a NILA troca de postura e o fator fica (comentário em `game.ts:285`).
- Dreno: `cobrarDreno` (`src/fight/game.ts:886`). `k = min(rival.en, valor)`, `rival.en -= k`, `atacante.en = min(100, atacante.en + k)`. Roda só nos ramos de acerto e de bloqueio. Armadura que absorve, PARADE, esquiva e `untouchable` retornam antes, então não drenam.
- Fases: a troca de barra não é KO: `resolverVidaZerada` (`game.ts:903`) devolve `false` quando sobra barra. Cena da fase 2: `cenaPendente` (`game.ts:479`); a troca de ficha só acontece se o chefe tem `fichaFase2` (`game.ts:499`).
- Alterações de `danoRecebido` e da ficha opcional: `955e720`. Nenhuma regra de luta dos lutadores comuns mudou desde 64f2647 (`git diff` de `src/fight`, `src/data/lutadores`, `src/render/mundo.ts` e `camera.ts` vazio nesse intervalo).

### 6.3 Render

- Rampa da fase 2: `rampaDaFase2` (`src/render/aura-chefe.ts:27`) vem do **estado da luta**, não de evento. Para os guardiões (sem `fichaFase2`), a rampa vale 1 (`aura-chefe.ts:32`); para o ZENON, vale quando a ficha é a da fase 2 (`aura-chefe.ts:34`). Chamada em `src/render/mundo.ts:72`.
- Aura: `desenharAuraChefe` (`src/render/aura-chefe.ts:47`).
- Arena da fase 2: `SOBREPOSICOES_DE_CENARIO` (`src/render/cenario.ts:48`), com `gr` em `src/render/arena-gr.ts`. Usada por `desenharMundo` (`mundo.ts`). Véu do céu, braseiros em púrpura e raios ocasionais; não usa o RNG da luta.
- Véu de fase 2 (`src/render/veu-de-fase2.ts`), roteiros de entrada por lutador (`src/render/roteiros-de-entrada.ts`, `ROTEIROS_DOS_GUARDIOES` em `:56`) e efeitos (`src/render/efeitos-de-entrada.ts`). Os 5 guardiões têm batidas de pose, zoom, deslocamento, efeito e som. O ZENON mantém o roteiro dele.
- Apresentação: `APRESENTACAO` (`src/render/apresentacao-lutadores.ts:78`) reúne a pose de entrada e de vitória, as falas, o aviso do VS e o cartão da entrada. Só desenho: nada disso vai ao motor. A fala do chefão é `falaDoChefe` (`apresentacao-lutadores.ts:159`); ver 6.7.
- Entrada dramática: `src/render/entrada-chefe.ts`. COMPLETA = 270 ticks (`DURACAO_ENTRADA_COMPLETA`, `:30`); CURTA = 60 ticks (`DURACAO_ENTRADA_CURTA`, `:31`). `PULO_VALE_A_PARTIR_DE = 10` (`:33`) e `SAIDA_AO_PULAR = 6` (`:35`). Linha do tempo pura: `linhaDaEntrada` (`:119`). Escolha do modo: `modoDaEntrada` (`src/ui/cenas/fight.ts:161-165`); ver 13.
- Cinemática do especial: `src/render/cinematica.ts`. COMPLETA = 48 ticks (`DURACAO_COMPLETA`, `:27`), CURTA = 20 ticks (`DURACAO_CURTA`, `:28`), saída ao pular em `TICKS_DA_SAIDA_AO_PULAR = 6` (`:30`). `modoDaCinematica` (`:49`) devolve `null` para DESLIGADA ou com `Regras.cinematica` desligada. Tarja do especial: `pintarTarja` (`:175`), desenho em `desenharTarja` (`:492`) e tamanho do nome em `tamanhoDoNome` (`:568`). A fonte é a do especial (`FONTE_DO_ESPECIAL`, de `src/render/texto.ts`), com nome de até 48 px.
- Escala na vitrine: `escalaDeVitrine` (`src/ui/personagens.ts:27`) encolhe só quem passa de `ESCALA_MAXIMA_DE_VITRINE = 1.1` (`personagens.ts:24`). O BAATAR (1,28) e o ZENON (1,32) são encolhidos na vitrine, não no dado.

### 6.4 Áudio

- Trilhas fixas: `TRILHAS` (`src/audio/audio-sys.ts:125`). `fight`, `menu` e `chefe` (valsa em 3/4).
- Trilha de chefe: `playChefe` (`audio-sys.ts:853`). Fase 2: `AudioSys.musicaDaFase(2)` (`audio-sys.ts:764`).
- Gatilho da fase 2: o evento `fase-chefe` com `etapa === 'cena'` chama `introWhoosh` (`audio-sys.ts:657`) e `musicaDaFase(2)` (`src/audio/eventos.ts:70`).
- `startMusic` (`audio-sys.ts:674`) recebe a trilha pedida. A luta escolhe a trilha com `trilhaDoJogo` (`src/audio/camadas.ts:171`), chamado em `src/ui/cenas/fight.ts:287`.
- Eventos da luta: `reagirDoJogo` (`src/audio/camadas.ts:146`), chamado em `src/ui/cenas/fight.ts:457`. Antes de tocar, sincroniza as amostras dos dois lutadores (`banco.prepararLutadores` e `sincronizar`, `camadas.ts:147-160`). Com a identidade carregada e ligada, toca por `reagirComIdentidade` (`src/audio/camadas.ts:161`; implementação em `identidade-sonora.ts:391`); sem ela, `reagirAosEventos` (`camadas.ts:164`; `src/audio/eventos.ts:97`).
- Estado: identidade sonora, temas e amostras reais **ligados** (ver 14, 14b e 14c).

### 6.5 Grade de 10 e casa de honra

- `temCasaDeHonra(n)` (`src/ui/grade.ts:19`): verdadeiro só com 10 casas (9 regulares + o chefão).
- `ordemDaGrade` (`src/ui/grade.ts:28`): os 9 regulares na ordem do roster; o chefão por último, no índice 9.
- `CASA_DE_HONRA` (`grade.ts:56`): `{ x: 404, y: 356, w: 204, h: 44 }` (encolheu de 256 px para 204 px em `ac57a80`, para caber a casa aleatória). Oculta = "???" e "O ANFITRIÃO". Liberada = rosto, nome, título e "CHEFÃO".
- Casa aleatória (`CASA_ALEATORIA`, `grade.ts:54`): sorteio com RNG próprio (`semente + 4`), só entre liberados.
- `moverNaGrade` (`grade.ts:103`): ↓ da 3ª linha vai para a honra; ↑ da honra vai para a casa 7; ↑ da 1ª linha vai para a honra; ↓ da honra vai para a casa 1; ←/→ na honra não mudam.
- Área de toque: `retanguloDeToque` (`grade.ts:88`).

### 6.6 Esquiva

- Parâmetros de partida (`src/data/esquiva.ts`, `ESQUIVA_PADRAO`, `:28`): custo 20 de energia, buffer de 6 ticks para o botão. Ajuste pelo harness: `npm run balanco`.
- Regra ligada em `src/meta/regras.ts:31` (`esquiva: true`). Quando desligada, `body.sem-esquiva` esconde o botão ESQ do toque (`src/input/toque.css:95`).
- Entradas: teclado P1 `n` e P2 `o` (`src/input/mapa.ts:22` e `:35`); gamepad L1/L2 (`mapa.ts:56` para o P1 e `:71` para o P2); toque, botão ESQ (`index.html:45`).
- Apresentação: `src/render/esquiva.ts` (corpo fantasma e rastro só na janela invulnerável).

### 6.7 Fala do chefão: comportamento real

`falaDoChefe` (`src/render/apresentacao-lutadores.ts:159`) devolve:

- `fase2` durante `cena-chefe`;
- **vitória** só no `matchend`, quando o chefão vence a luta (não no `roundend`);
- **derrota** só no KO que fecha a luta, ou no `matchend` perdido por KO (vida zerada). Perder por tempo não fala. `roundend` nunca fala.

Essa é a decisão 6 de `PROGRESSO.md` ("derrota do chefão só no KO final; vitória só no `matchend`"). O código do HEAD a segue.

### 6.8 Como o chefão do ARCADE é escolhido

Ver o início da seção 6 e `chefeDoArcade` (`src/meta/chefes.ts:21`). Demais funções:

- `ehChefeFinal(id, regras)` (`src/meta/chefes.ts:30`): o chefão é o final (ZENON) e não um guardião.
- `desafiantesDoChefe(regras)` (`src/meta/chefes.ts:39`): para o harness e os testes.
- `aplicarVitoriaArcade(prog, vitoria, regras)` (`src/meta/progresso.ts:68`): aceita `{ chefe: id | null }` (com `chefesDaFila`: libera só o chefão derrotado, sem avançar a fila sozinho) ou `{ derrotouChefe }` (formato antigo). O id da etapa é gravado no começo do ARCADE, não recalculado no fim.
- Nenhum campo novo em `Progresso`: o chefão da vez é derivado de `desbloqueados`. Save v2 sem mudança.

## 7. Tela e escala

- Resolução lógica: 960x540 (`src/core/constantes.ts:2`, `LARGURA = 960`).
- Buffer do canvas: 1920x1080 (`src/render/tela.ts:6`, `RS = 2`, o dobro da lógica). O CSS do canvas está em `index.html:36`.
- Escala na tela: maior retângulo 16:9 que cabe na janela (letterbox), aplicado por CSS e por `src/platform/escala.ts`.
- Controles: `src/input/mapa.ts`. Lista para o jogador: `README.md`, seção Controles.

## 8. Balanceamento (harness)

- Comando: `npm run balanco -- [--rapido | --completo] [opções]` (`ferramentas/balanco/cli.mjs`, ajuda com `--ajuda`).
- `--completo --esquiva` (100 sementes por combinação, NORMAL e DIFÍCIL) grava a referência de PRODUÇÃO em `docs/balanco/`. `--completo` sem a flag grava a rodada sem esquiva em `docs/balanco/sem-esquiva/`. `docs/balanco/README.md` diz qual é qual.
- **A referência versionada em `docs/balanco/` é a rodada COM esquiva** (`esquiva: true` em `src/meta/regras.ts`): versão de dados `f6b9952cee5e`, hash da rodada `957b8416d75bf060`, hash das lutas regulares `f420ce928e06b304` (tem de ser igual antes e depois de qualquer ajuste de chefão). 25 800 lutas, 0 travadas. Nenhum commit mexeu em `docs/balanco/` desde `64f2647`.
- Metas dos chefões: rampa de NORMAL de AMINU (26-30%) a ZENON (15-19%), com os intermediários; DIFÍCIL = centro do NORMAL x 0,575, ± 3 pontos.

Resultado da rodada de produção (valores transcritos de `docs/balanco/resultados.md`; "jogador vence" = a CPU do desafiante vence o chefão; aproximação CPU x CPU, não uma pessoa). Conferidos nesta passada contra `resultados.md`: AMINU (NORMAL e DIFÍCIL), CENTELLA, CAMILLE, NILA e BAATAR no DIFÍCIL, e ZENON 51,4%. Os demais valores da tabela **a confirmar** nesta passada.

| Chefão | Desafiantes | `danoRecebido` | NORMAL (meta) | DIFÍCIL (meta) |
|---|---|---|---|---|
| AMINU | 4 | 0,925 | 29,3% (26-30) ok | 10,0% (13-19) **fora** |
| CENTELLA | 5 | 0,875 | 26,8% (24-28) ok | 25,8% (12-18) **fora** |
| CAMILLE | 6 | 0,925 | 24,3% (22-26) ok | 16,3% (11-17) ok |
| NILA | 7 | 0,875 | 20,7% (19-23) ok | 16,3% (9-15) **fora** |
| BAATAR | 8 | 0,85 | 18,3% (17-21) ok | 19,0% (8-14) **fora** |
| ZENON | 9 | 0,80 | 16,1% (15-19) ok | 11,4% (7-13) ok |

O DIFÍCIL está fora da faixa em 4 de 6 chefões. Decisão de aceitar por enquanto: `PROGRESSO.md`, "Decisões em aberto".

Sem esquiva (`docs/balanco/sem-esquiva/`, rodada anterior, só para comparação): o README da pasta diz que não foi regravada e que é de um chefão só.

- Harness: `ferramentas/balanco/` (cada luta monta a própria `Game` em memória; nada toca o estado do jogo). Meta por chefão: `metaDoChefe` (`ferramentas/balanco/chefoes.ts:47`), com `CENTRO_PRIMEIRO = 0.28` (`:41`) e `RAZAO_DIFICIL = 0.575` (`:43`).

## 9. Política de segurança de conteúdo (CSP)

Definição: `POLITICA_CSP` em `vite.config.ts:20`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:
```

- Entra como `<meta http-equiv>` só no build (plugin `cspSoNoBuild`, `vite.config.ts:31`, registrado em `vite.config.ts:73`). O dev server injeta scripts inline, então não recebe a CSP.
- Exceções documentadas em `vite.config.ts` (cabeçalho do arquivo): `style-src 'unsafe-inline'` (estilo do `index.html` e do `<pre id="err">`); `img-src data: blob:`, `media-src blob:` e `connect-src 'self'`, que hoje não são usados e ficam como folga.
- A meta **não** cobre `frame-ancestors`, `report-uri` nem `sandbox`. Esses só funcionam como cabeçalho HTTP.
- Teste: `tests/e2e-build/csp.spec.ts` e `tests/e2e-build/trailer-csp.spec.ts`, contra o build (`npm run test:e2e:build`).
- O Pages não permite definir cabeçalhos. No EasyPanel, a política deve virar cabeçalho.

## 10. Build e publicação

- `npm run build` = `tsc --noEmit && vite build` (`package.json`). Gera `dist/` com sourcemap (`vite.config.ts:77`, `sourcemap: true`). Também emite `version.json` (ver 19).
- O mapa de código-fonte fica público no build. A decisão do dono é trocar para `sourcemap: 'hidden'` ao privar o repositório (`PROGRESSO.md`, seção do repositório público). Ainda não foi feito.
- CI: `.github/workflows/ci.yml` roda typecheck, testes e build em todo push e PR, com Node 24 (`ci.yml:20`).
- Pages: `.github/workflows/pages.yml`, temporário, dispara a cada push na `main` (`pages.yml`, bloco `on`). Ver `README.md`.

## 11. Ferramentas

| Arquivo ou comando | Função | Estado |
|---|---|---|
| `ferramentas/extrair-prototipo.mjs` | tira atlas e cenários do protótipo para `public/assets` | usado na F1 |
| `ferramentas/sprites/` (`npm run sprites -- <id>`) | pipeline de folhas para atlas C1 v2 | sem argumento, imprime o uso. Grava em `sprites-gerados/` e `arte-fonte/` |
| `ferramentas/balanco/` (`npm run balanco`) | harness de simulação | commitado; `docs/balanco/` é a rodada de produção, com esquiva (seção 8) |
| `ferramentas/converter-cenarios.mjs` | cenários da arte-fonte para WebP 1920x1080. `--so <sigla>` converte só alguns | fontes em `FONTES` (`converter-cenarios.mjs:13`) |
| `ferramentas/gerar-retratos.mjs` | retrato de cada lutador a partir do atlas (`--so <id>`, `--verificar`) | existe; sem script npm |
| `ferramentas/prompts/montar-prompts.mjs` | gera `docs/prompts/` a partir de `docs/prompts-arte.md` | não reconferido nesta passada |
| `ferramentas/sons/gerar-pacote-teste.mjs` (`npm run sons:pacote-teste`) | gera um pacote de amostras de teste (MP3 e manifesto) em `tests/fixtures/sons-pacote/`, com ondas sintéticas e `ffmpeg` no PATH | commitado em `497cb33` |
| `ferramentas/trailer/cli.mjs` (`npm run trailer:escalar`) | escalação do trailer de abertura (plano, sementes, níveis da CPU) | commitado em `f377da4` |
| `ferramentas/trailer/medir.mjs` (`npm run trailer:medir`) | medição de desempenho do trailer no Chromium com CPU estrangulada; compara com a luta CPU x CPU | commitado em `f377da4` e `dcdfe0c` |

## 12. Pendências técnicas (verificadas em 2026-10-23)

- **`poseDaCena` existe em uma cópia só** (`src/data/cena.ts:8`), usada pelo motor (`src/fight/fighter.ts:1051`) e pela apresentação (`src/render/apresentacao-lutadores.ts:142`).
- **Comentário velho:** `src/fight/game.ts:900` ainda diz "a Dança da Águia fica pendente". Hoje é a cena da fase 2.
- **Preferências de cinemática e de provocação aposentadas.** O menu de Opções não tem mais as linhas CINEMÁTICA e PROVOCAÇÕES (`src/ui/cenas/options.ts`, lista em `:108-151`). `PREFERENCIAS_APOSENTADAS` (`src/ui/persistencia.ts`) descarta os valores salvos. Por isso a entrada do chefão é COMPLETA na primeira luta do Arcade e CURTA nas demais (`modoDaEntrada`, `src/ui/cenas/fight.ts:161-165`), e a provocação é sempre ligada. A regra de movimento reduzido continua valendo.
- **Tecla H:** alterna `game.debug` (`src/ui/cenas/fight.ts:628`). O desenho das caixas de colisão nesse modo: **a confirmar**.
- **Prompts de arte:** `docs/prompts-arte.md` ainda diz "Gemini" no corpo, mas a nota do topo manda ler "Runway" em todo lugar onde aparece "Gemini". **a confirmar** nesta passada.

## 13. Provocação (balão antes do round e na vitória)

Spec: `docs/spec-provocacao-prerround-e-vitoria.md`. A seção "Decisões do dono" no topo da spec vale por cima do resto. Commit: `bfa3347`. A opção PROVOCAÇÕES foi retirada das Opções (ver 12): hoje ela é sempre ligada, salvo exclusões de regra abaixo.

**Onde mora:**

- `src/data/provocacoes.ts`: tipos, validação, escolha da fala (`sortearFala` em `:310`, `quemFalaNaRodada` em `:340`). Valida no import (`exigirFalasValidas`, `:197`). `src/main.ts:13` importa o módulo para isso.
- `src/data/provocacoes.pt-BR.ts`: os textos (a contagem de 232, do registro de 2026-10-21, **a confirmar** nesta passada). `TEXTOS_PROVISORIOS = false` (`:14`). **É a fonte de verdade**; `docs/textos-provocacao.md` é só registro de autoria.
- `src/render/provocacao.ts`: funções puras (`provocacaoLigada` em `:96`, `modoDaProvocacao` em `:112`) e a classe `Provocacao`, com a mesma API da entrada do chefão (`iniciar / ativa / avancar / pular / zerar / desenhar`).
- `src/render/balao.ts`: desenho do balão (`desenharBalao`, `:865`), quebra por medida, escolha de plano (`LARGURAS_DA_LINHA`, `:179`: 372, 300 e 240 px).
- `src/ui/cenas/fight.ts`: gatilhos (`comecarProvocacao`, `:190`, chamado em `:440` no round 1, `:477` na vitória e `:492` no round 2+), pular (ataque, ENTER ou toque; ENTER em `:620`).

**Regras (o que o código faz):**

- **Ligada?** `provocacaoLigada` (`src/render/provocacao.ts:96`) exclui: `?expansao=4` (`regras.cinematica` falso), TREINO, CPU x CPU, e, **só no pré-round**, a luta de chefão (a entrada dramática do chefão é o round 1). VERSUS de 2 jogadores tem provocação. Na vitória, vale também no chefão.
- **Modo:** `modoDaProvocacao` (`provocacao.ts:112`). Com a preferência aposentada, a regra usa o padrão: round 1 COMPLETA na primeira vez do confronto e CURTA nas repetições (continue, reinício, revanche); round 2+ e vitória COMPLETA. Com movimento reduzido, CURTA.
- **Movimento reduzido** vale por cima do modo: sem andada, sem zoom, sem pop. O texto entra inteiro com fade.
- **Round 1 (COMPLETA):** o P1 fala primeiro e o P2 responde. A andada dura 40 ticks (`provocacao.ts:56`, `andadaTicks: 40`; dx de 260 px, `:57`). A duração total depende do texto: com textos curtos fica perto de 4,8 s (medido pela Íris em 2026-10-21; a spec estimava mais). Ver `PROGRESSO.md`, decisão em aberto 4.
- **Round 2+:** um balão de 1 linha de quem perdeu o round (`quemFalaNaRodada`); em round decisivo, a fala é a de `decisivo`.
- **Vitória:** balão do vencedor. O push-in vai a 1,08 (`provocacao.ts:74`, `zoomDaVitoria`).
- **Pular:** ataque de um humano, ENTER ou toque. Antes do tick 10 (round) ou do 24 (vitória), o pulo não vale.

**Sorteio das falas:** `Contexto.sorteioDeFalas` com semente + 5 (`src/main.ts:152`). Fora do RNG da luta. A memória de "última fala" é por sessão da cena (não repete a última do mesmo lutador quando a lista tem mais de uma).

**Prova do comportamento:** testes de unidade `p2-provocacao-*`, `p2-balao`, `provocacoes-*`, `baloes-premium` e os e2e `provocacao.spec.ts` e `provocacao-p4*.spec.ts` (em `tests/`). A medição em pixels (A/B com e sem balão, no handoff da Lyra): rosto coberto em 0 px² nos cenários de abertura e de vitória; na CURTA há cantos de balão de 10 a 44 px² (a Íris os tratou como informativos). Não medido em aparelho real.

**Não feito:** arte nova de `provoca0/1` (usa `win` como alias); escuta do som do balão; revisão de nativo dos termos estrangeiros (`docs/textos-provocacao.md` §3).

## 14. Identidade sonora por lutador (voz e assinatura dos especiais)

Spec: `docs/spec-sons-por-lutador.md`. Handoffs: `docs/handoff-vega-sons.md` e `docs/handoff-vega-sons-temas-ligacao.md`. Commits: `59f3b75` (dados e primitivas) e `1aa7cac` (ligação, "sons e temas ligados").

**Estado: LIGADO.** `IDENTIDADE_SONORA = true` (`src/audio/chaves.ts:14`). Decisão do dono (2026-10-21): sempre ligada, sem opção no menu e sem parâmetro de URL. A constante é só rollback por código: `false` volta ao som de antes. A ligação existe: `reagirDoJogo` roteia para `reagirComIdentidade` quando a identidade está carregada (`src/audio/camadas.ts:146-164`).

**O que existe:**

- Primitiva de voz: `vozFormante` (`src/audio/sintese-voz.ts`), com garganta por lutador (uma voz por lutador, KO não deixa entrar outra) e orçamento de fontes (`src/audio/orcamento-sonoro.ts`).
- Dados: perfis vocais (`src/data/sons/perfis-vocais.ts`), gritos (`src/data/sons/gritos.ts`, `GRITOS_LEXICAIS = true` em `:130`: palavras reais marcadas "(rev.)" pedem revisão de nativo) e assinaturas dos especiais (`src/data/sons/assinaturas.ts`), uma por entrada da tabela de apresentação.
- Validação: `exigirSonsValidos` (`src/data/sons/validar.ts:156`) é chamada no import de `src/data/sons/index.ts:14`. O módulo é carregado pela camada de identidade no boot (`src/audio/identidade-sonora.ts:2` importa `data/sons`). Um lutador sem voz derruba o boot, como diz `src/audio/camadas.ts` (carregamento: dados inválidos relançam).
- Carga: `identidade-sonora` é um pedaço à parte, baixado no boot por `import()` (`src/audio/camadas.ts`, `carregarCamadasSonoras`, `:49`).

**Régua (como provar que os sons são diferentes sem ouvir):** `tests/support/regua-sons.ts`, congelada. Limiares: `TAU = 1,5` entre lutadores, `TAU_INTRA = 1,0`, `TAU_FAMILIA = 0,6`, `TAU_VARIACAO = 0,4`, `POSITIVO_MIN = 2,15`, `F0_REFERENCIA_VOZ = 175`. Pisos de hoje (regressão R5): `hurt 0,67`, `special 0,96`, `ko 0,83`.

**Números do handoff da Vega (régua congelada):** dois pontos não passam, e a Vega registrou por escrito: R6 com o bloco de tom `P` e R7 espelho. **Decisão pendente: baixar o piso do R7 ou aumentar o espelho** (`PROGRESSO.md`, decisão em aberto 7). Correções da régua depois do congelamento, aprovadas pela Íris: estimador de tom com pente de 5 harmônicos, e início do oscilador no primeiro quadro. Nenhum limiar mudou.

**Como criar a voz de um lutador novo:** ver `docs/como-adicionar-um-lutador.md`, seção "Voz e sons".

## 14b. Temas musicais por lutador

Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §3. Handoff: `docs/handoff-vega-temas.md`. Commits: `73f0074` (temas) e `1aa7cac` (ligação).

**Estado: LIGADO.** `TEMAS_POR_LUTADOR = true` (`src/audio/chaves.ts:16`). Decisão do dono: sempre ligado. `Regras.temasMusicais` (`src/meta/regras.ts:36`) é `true`; a fidelidade com o protótipo desliga a música por lutador só em `?expansao=4` (`src/ui/dev-expansao.ts`).

**O que existe:**

- Dados: 9 temas em `src/data/musica/temas/<id>.ts`, um por lutador jogável. O ZENON é `'chefe'` (a valsa de hoje). `TEMAS` (`src/data/musica/temas.ts:16`) tem `Record<IdLutador, TemaDef | 'chefe'>`: lutador sem entrada não compila.
- Validação no boot: `exigirTemasValidos` (`src/data/musica/validar.ts:225`), chamada em `src/data/musica/index.ts:10`. Limites em `LIMITES_MUSICA` (`validar.ts:12`).
- Escolha da trilha: `trilhaDoJogo` (`src/audio/camadas.ts:171`), chamado em `src/ui/cenas/fight.ts:287`. Com temas ligados e carregados, usa `trilhaDaLuta` (`src/audio/temas.ts:43`) com o tema do **adversário** (`c2`) em todos os modos; o ZENON toca a valsa (comentário em `camadas.ts`).
- Orçamento de fontes: `validarOrcamentoDosTemas` (`src/audio/temas.ts:62`). Teto de 8 fontes novas por passo (`FONTES_NOVAS_POR_PASSO_MAX`, `:55`) e 15 fontes ativas (`FONTES_ATIVAS_MAX`, `:56`).
- Sequenciador: `partituraDoPasso` e `partituraDaTroca` (`src/audio/partitura.ts`), `AudioSys.playTema` (`src/audio/audio-sys.ts:811`), com a fase 2 que só vira no início do compasso seguinte.
- Régua musical: `tests/support/regua-musica.ts` (congelada). Distinção medida em 65 pares de temas no handoff da Vega (não reconferido nesta passada).

**Como criar um tema:** ver `docs/como-adicionar-um-lutador.md`, seção "Tema musical".

## 14c. Amostras reais (sons de impacto, voz e especiais)

Spec: `docs/plano-sons-realistas.md`. Pesquisa e curadoria: `docs/pesquisa-sons-cc0.md`, `docs/relatorio-curadoria-sons.md`, `docs/relatorio-lote0-sons.md`, `docs/handoff-vega-amostras.md`. Commit: `497cb33`.

**Estado: LIGADO.** `AMOSTRAS_REALISTAS = true` (`src/audio/chaves.ts:23`). Sem a identidade não há amostra. Sem os arquivos (ou com falha de rede), o jogo toca a síntese, folha por folha, sem calar nada (comentário em `src/audio/chaves.ts:19-21`).

**O que existe:**

- Pacote: `public/assets/sons/` com `manifesto.json` (cada corte tem `origem`, `fonte` e `licenca`), arquivos MP3 (`base.mp3` e um `lutador-<id>.mp3` por lutador) e `CREDITOS.txt` e `LEIA-ME.txt`. Os créditos declaram fontes sob CC0 (ver `CREDITOS.txt`).
- Banco: `BancoDeAmostras` (`src/audio/amostras.ts:124`), carregado por `carregarBanco` (`:385`), que busca `manifesto.json` em `baseUrl`. Até `MAX_FOLHAS_DE_LUTADOR = 4` folhas por lutador (`:62`).
- Plano: `src/audio/plano-amostras.ts` (`pedidoDeFoley`, `:40`; `pedidoDeVoz`, `:64`) e a cobertura por evento em `src/data/sons/amostras.ts:173` (`AMOSTRAS_POR_EVENTO`).
- Execução: `tocarItem` toca a amostra quando o buffer está pronto; senão, a síntese (`src/audio/identidade-sonora.ts`).
- Painel de escuta com A/B: caixa "amostras reais", que desmarcada toca a síntese (`src/ui/escuta.ts`, comentário do módulo).

## 14d. Painel de escuta (`?escuta=1`)

- `?escuta=1` (`src/audio/chaves.ts:34`, lido em `src/main.ts:101`) abre o painel `abrirEscuta` (`src/ui/escuta.ts:66`) **sem jogo**: toca cada som, cada voz e cada tema.
- Vale também no build de produção (não depende de `npm run dev`).
- Não persiste nada e não mexe no save. Não liga nem desliga as chaves.

## 15. Testes de arquitetura que guardam estas regras

- `tests/unit/chefoes-r1.test.ts`: fator `danoRecebido` nos pontos do motor, fichas opcionais, validação de `montar`.
- `tests/unit/p1-chefes-progressivos.test.ts`: `chefeDoArcade` em todos os estados possíveis da fila (chave ligada e desligada).
- `tests/unit/l1e1-chefoes.test.ts` e `tests/e2e/chefoes-l1e1.spec.ts`: UI dos guardiões.
- `tests/unit/provocacoes-*.test.ts`: falas, limites, validação do boot, sorteio.
- `tests/unit/musica-*.test.ts`: temas, sequenciador, orçamento, mix.
- Varredura de texto: `tests/unit/audio-chefe.test.ts:230` impede `Math.random` em `src/audio`. A varredura de `provoca` em `src/fight/` **a confirmar** nesta passada.

## 16. Trailer de abertura

Spec: `docs/spec-trailer-abertura.md` (o cabeçalho da spec ainda diz "nada implementado"; está desatualizado, **a confirmar** a revisão do cabeçalho). Direção de arte: `docs/direcao-arte-trailer.md`. Commits: `f377da4` (fase 1, inerte), `dcdfe0c` (cena, câmera, modo atrair, versão estática) e `0b288ca` (docs).

**Estado: LIGADO.** `Regras.trailer = true` (`src/meta/regras.ts:38`).

**Fluxo:**

- No boot, o trailer abre se `disponivel()` (regra ligada + pedaço carregado + roteiro válido): `src/ui/cenas/boot.ts:52`. Senão, cai na abertura de hoje (`CenaIntro`).
- O pedaço é lazy: `import('../trailer')` em `src/ui/cenas/trailer.ts:65`. Começa a baixar no `Navegador.pronto()` (`precarregar`, `src/ui/cenas/trailer.ts:57-59`).
- **Modo atrair:** título parado por 30 s abre o trailer (`src/ui/cenas/title.ts:33-36`), só com o pedaço carregado; senão, espera mais 30 s. A música toca só na primeira repetição depois do último gesto do jogador.
- **Pular:** a partir do tick 10 (`PULO_VALE_A_PARTIR_DE = 10`, `src/ui/trailer/trailer.ts:69`; verificação em `:286`).
- **Parâmetros:** `?trailer=0` e `?trailer=P5` valem **só em desenvolvimento** (`parametroDoTrailer`, `src/ui/cenas/trailer.ts:17-20`, retorna `null` fora do DEV). Em produção, `?trailer=0` não desliga o trailer. `?trailer=0` existe para os e2e antigos que esperam `boot -> intro`.

**Onde mora:**

- `src/trailer/` (sem DOM): diretor `DiretorDoTrailer` (`src/trailer/diretor.ts:101`), música (`src/trailer/musica.ts`), quadros estáticos (`src/trailer/estatica.ts`), marca (`src/trailer/marca.ts`).
- `src/data/trailer/`: roteiro (`ROTEIRO` em `roteiro.ts:36`; destaque por lutador em `:210`), abertura, textos, validação (`validar.ts`).
- `src/render/trailer/`: contraluz, estática, frio, grade, letterbox, revelação da logo, reserva, retratos e títulos.
- `src/ui/trailer/`: controlador em cena (`TrailerEmCena`, `src/ui/trailer/trailer.ts:106`), ambiente, aquecimento e arte sob demanda.

**Testes:** `tests/e2e/trailer.spec.ts`, `tests/e2e-build/trailer-csp.spec.ts`, `tests/unit/trailer-cena.test.ts`, `tests/unit/trailer-navegacao.test.ts`, `tests/unit/trailer-diretor.test.ts`, `tests/unit/trailer-musica.test.ts`. Os números de execução estão nos handoffs (`docs/handoff-lyra-trailer.md`, `docs/handoff-vega-trailer.md`); **não reconferidos nesta passada**.

## 17. Logo oficial

Spec e decisão: `docs/logo-oficial.md`. Handoff: `docs/handoff-lyra-logo.md`. Commit: `1aa7cac`.

- Arte: `public/assets/ui/logo/` (`logo-v1-1600.webp`, `logo-v1-720.webp`, `logo-horizontal-v1-600.webp`, `splash-v1-1920x1080.webp`, e `icones/`). O splash é pré-carregado em `index.html:19`.
- Código: `src/ui/logo.ts`. `GAME_NAME` (`:12`), `LOGO_ALTURA = 330` (`:22`), `LOGO_MENU` (`:31`), `PALETA_MARCA` (`:37`), `prepararImagemDaMarca` (`:62`), `iniciarMarca` (`:127`), `marcaPronta` (`:140`). A logo é imagem, não desenho.
- Ícones e metadados do site: `index.html`, `public/manifest.webmanifest`, `favicon.ico`.
- Testes: `tests/unit/logo.test.ts`, `tests/unit/marca-no-html.test.ts`, `tests/e2e/logo.spec.ts`.

## 18. Balões premium, botões de toque e tela cheia

**Balões** (`src/render/balao.ts`, reescrito em `1aa7cac`): `BALAO` (`:19`), `linhaMax` de 372 px (`:21`). Tinta opaca, aro claro, plaquinha com o nome na cor do lutador e rabicho no mesmo traço (cabeçalho do módulo, `:8`). Direção de arte: `docs/direcao-arte-baloes.md`. Handoff: `docs/handoff-lyra-baloes.md`.

**Botões de toque** (`1aa7cac`):

- Detecção: `temToque` (`src/input/toque.ts:33`) checa `ontouchstart` ou `maxTouchPoints > 0`. Sem toque, `ligarToque` (`:75`) não liga nada.
- Ligação: `src/input/entrada.ts:48`. Pré-carga da arte: `precarregarDesenhosDoToque` (`toque.ts:65`).
- Layout e estilo: `src/input/toque.css`. Decisões do dono no cabeçalho do arquivo (`:6`): modo NORMAL com rótulos (LEVE, FORTE, ESQUIVA, ESPECIAL), opacidade 90% fixa, sem opção de tamanho, mão ou opacidade no menu.
- Marcação: `index.html`, `#touch`, com `#esq` (`:45`), `#r1` ESPECIAL (`:46`), `#bp` pausa (`:52`).
- Arte: `public/assets/ui/toque/*.svg` (estados normal, pressionado e desabilitado). Direção: `docs/direcao-arte-controles-toque.md`.

**Tela cheia** (`src/platform/tela-cheia.ts`):

- Tecla F fora da seleção (`src/main.ts:128`). Linha TELA CHEIA nas Opções (`src/ui/cenas/options.ts:125-138`), que liga e desliga onde a plataforma permite; onde não, abre um cartão com a explicação.
- Situação da plataforma: `situacaoDaTelaCheia` (`tela-cheia.ts:76`), com os casos `disponivel`, `bloqueada`, `instalado`, `ios` e `indisponivel`.
- iPhone: a Fullscreen API não existe no WebKit do iOS. O caminho é "Adicionar à Tela de Início" (cabeçalho de `tela-cheia.ts`, `:6-8`).
- Android: o pedido precisa de um gesto de ativação. O toque do jogo age no `touchstart`, que não conta como gesto em alguns navegadores; o pedido recusado é refeito no `touchend` seguinte (`observarGesto`, `:118`, janela de 1500 ms em `:175`).
- Entrada e saída: `alternarTelaCheia` (`tela-cheia.ts:164`).

## 19. Versão do build e atualização

- Identidade do build: `src/versao.ts` (`VERSAO`, `:17`; `rotuloDaVersao`, `:20`).
- `vite.config.ts` gera `version.json` só no build (`versaoJson`, `:62`, `apply: 'build'`), com o commit e a data.
- `verificarVersao` (`src/versao.ts:37`) busca `version.json?t=...` sem cache e compara com a versão rodando. Se há versão nova, aparece o aviso (`src/ui/cenas/options.ts:213`: "NOVA VERSÃO NO AR · TOQUE AQUI PARA ATUALIZAR") e o título (`src/main.ts:95`). Tocar em atualizar chama `recarregarSemCache` (`src/versao.ts:55`).
- Não há service worker: `src/` e `vite.config.ts` não registram um. O PWA é só o manifesto (`public/manifest.webmanifest`).
- Testes: `tests/unit/versao.test.ts`, `tests/e2e-build/pwa-versao.spec.ts`.
