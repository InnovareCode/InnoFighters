# Arquitetura

Como o código está organizado no commit `c058ac9` (2026-10-24, `origin/main`). Os `arquivo:linha` foram conferidos contra esse commit com `git show` e `git grep`, não contra a árvore de trabalho. O que não foi confirmado por leitura ou execução está marcado **a confirmar**.

Histórico de marcos: `CHANGELOG.md`. Estado e decisões: `PROGRESSO.md`.

## 1. Camadas

Cada camada importa só das camadas da coluna "Importa de", com as exceções registradas abaixo.

| Pasta | Responsabilidade | Importa de |
|---|---|---|
| `core/` | tipos de contrato (`contratos.ts`), RNG com semente (`rng.ts`), armazenamento v2 (`storage.ts`), constantes (`constantes.ts`) | `meta/` (só `storage.ts`) |
| `meta/` | regras de desbloqueio, chefões e flags (`regras.ts`, `chefes.ts`), progresso puro (`progresso.ts`), escada do Arcade (`escada.ts`) | `core/` |
| `data/` | lutadores (`lutadores/*.ts`), golpes, cenas (`cena.ts`), cenários, montagem e validação (`montar.ts`), falas das provocações (`provocacoes*.ts`), sons (`sons/`), temas musicais (`musica/`), roteiro do trailer (`trailer/`), esquiva (`esquiva.ts`), filme do especial (`filmes.ts`, `roteiros-filme.ts`), combos próprios (`combos-proprios.ts`) | `core/`, `data/tipos.ts` |
| `fight/` | motor da luta: `Game`, `Fighter`, CPU, colisão, projétil. Motor v2 (entrada no hitstop, filme, combos) atrás de flags. Sem DOM, áudio nem render | `core/`, `data/` |
| `audio/` | sons e música sintetizados (`audio-sys.ts`, `TRILHAS`), tradução de eventos em som (`eventos.ts`), temas (`temas.ts`, `partitura.ts`), identidade sonora (`identidade-sonora.ts`), amostras reais (`amostras.ts`, `plano-amostras.ts`), carga por pedaços (`camadas.ts`) e chaves (`chaves.ts`) | `core/`, `data/musica/`, `data/sons/` |
| `render/` | desenho em canvas: pose, HUD, cenário, efeitos, cinemática (tarja do especial), entrada do chefão, aura, provocação e balão, filme do especial (`filme.ts`), fluidez e mola (`fluidez.ts`, `mola.ts`), caixas de dano (`caixas.ts`), trailer (`render/trailer/`) | `core/`, `data/`, `assets/` |
| `trailer/` | trailer de abertura, sem DOM: diretor (`diretor.ts`), música (`musica.ts`), quadros estáticos (`estatica.ts`), marca (`marca.ts`), filme do especial no trailer (`filme.ts`) | `core/`, `data/`, `meta/` (`regras`), `fight/game`, `audio/` (`abertura`, `partitura`, `receitas`), `render/tela` (imports lidos em `src/trailer/` no commit `c058ac9`) |
| `assets/` | manifesto C1 (`manifesto.ts`), carregador (`carregador.ts`), carga sob demanda e residência (`gerenciador.ts`), elenco (`elenco.ts`) | `data/`, `core/` |
| `ui/` | cenas (`ui/cenas/*.ts`), menus, grade (`grade.ts`), navegador, residência da arte (`residencia.ts`, `espera-de-arte.ts`), persistência, painel de escuta (`escuta.ts`), logo oficial (`logo.ts`), trailer em cena (`ui/trailer/`, carregado sob demanda) | quase todas as outras |
| `input/` | teclado, gamepad, toque: viram teclas virtuais e `InputFrame`; botões de toque (`toque.ts`) | `core/` |
| `platform/` | escala do canvas, foco, tela cheia (`tela-cheia.ts`), avisos, erros, registro do service worker (`sw.ts`) | `core/` |
| `sw/` | service worker, build separado: `sw.ts` (eventos) e `logica.ts` (decisões puras). Sem imports do jogo | nenhuma |
| `versao.ts` | identidade do build e verificação de versão nova no ar | nenhuma (sem imports internos) |
| `main.ts` | monta tudo, lê os parâmetros de URL e roda o laço | todas |

**Exceções registradas:**

- `core/storage.ts` importa `meta/progresso` (`src/core/storage.ts:13`). O próprio arquivo diz que isso não cria ciclo. Ciclos no grafo inteiro não foram verificados com ferramenta: **a confirmar**.
- `audio/temas.ts` e `audio/identidade-sonora.ts` importam `data/musica/` e `data/sons/` (`src/audio/temas.ts:2`, `src/audio/identidade-sonora.ts:2`). `data/` não importa `audio/`. Motivo: a validação de orçamento de fontes (`validarOrcamentoDosTemas`, `src/audio/temas.ts:62`) precisa da partitura.
- `ui/escuta.ts` importa `data/sons` (`src/ui/escuta.ts:9`), pelo mesmo motivo de ouvir os sons sem jogar.

## 2. Laço de execução

`src/main.ts`:

- Passo fixo de 1000/60 ms: `const PASSO = 1000 / 60;` (`src/main.ts:229`), ou seja, 60 ticks de lógica por segundo.
- O tempo acumulado por quadro é limitado a 100 ms (`src/main.ts:240`), para não dar um salto depois de uma aba parada.
- Cada tick chama `entrada.fimDoTick()` (`src/main.ts:233` e `:246`).
- Pausa ao perder o foco ou ocultar a aba: `observarFoco(window, { aoPerderFoco: () => ui.blur(), ... })` (`src/main.ts:171`; a função está em `src/platform/foco.ts:14`).
- Aba oculta: com a política `'por-peso'`, `aoOcultar` chama `ui.aoOcultarAba()` (`src/main.ts:174-176`), que alivia a arte fora de uso e as silhuetas (`aoOcultarAba`, `src/ui/navegador.ts:131`; `aliviar`, `src/assets/gerenciador.ts:153`). `aoVoltar` reaplica a tabela da cena atual (`src/main.ts:178`; `aoVoltarAba`, `src/ui/navegador.ts:140`). Com `'fixa'`, nenhuma das duas faz nada.

Fluxo de entrada: teclado, gamepad e toque escrevem em `TeclasVirtuais` (`src/input/teclas.ts`). A luta lê um `InputFrame` (C2) por jogador por tick. A luta gera uma `LeituraLuta` (C3), que o render, a UI e o áudio leem.

Três apresentações congelam o motor **sem** tocar no lock-step, porque a cena da luta não chama `game.update` enquanto elas rodam (`src/ui/cenas/fight.ts`, método `update()`, `:518`):

- a **entrada dramática** do chefão: `this.entrada.avancar()` no lugar de `game.update` (`fight.ts:527`), com `return` logo depois;
- a **cinemática do especial**: `passoDaCinematica()` (definido em `fight.ts:493`, chamado no mesmo `update`);
- a **provocação** (balão antes do round, na vitória): ramo próprio do `update` da cena (`fight.ts:534`), que não anda o relógio do motor. Ver a seção 13.
- o **filme do especial** (motor v2): a cena também não chama `game.update` enquanto o filme roda. Ver a seção 20.

## 3. Contratos

Os contratos de tipos ficam em `src/core/contratos.ts`. Quem escreve é o motor (`fight/`). Quem lê são render, UI e áudio.

### C1: manifesto de atlas (versão 2)

Arquivo: `public/assets/lutadores/<id>/atlas.json`. Validação: `validarManifesto` (`src/assets/manifesto.ts:101`).

- `versao`: `1` ou `2`. A versão 1 (campo `imagem`, uma imagem só) continua aceita pelo código, mas nenhum lutador do commit usa mais a versão 1.
- `imagens`: de 1 a 8 arquivos (`MAX_PAGINAS = 8`, `src/assets/manifesto.ts:10`). Só nome de arquivo, sem pasta.
- `tamanho`: `[largura, altura]` de cada página, em px.
- `alturaRef`: altura do `idle0` em px. Vem de `ferramentas/sprites/lutadores.json` (padrão 410).
- `quadros`: mapa nome da pose para `{ p, x, y, w, h, ax, rosto?, ponta? }`. `p` é a página; `rosto` e `ponta` são pares `[x, y]` relativos ao canto do quadro.
- `filme` (opcional): bloco da folha FILME, descrito abaixo.

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

**Situação dos atlas no commit `c058ac9`** (lida dos `atlas.json`; todos na versão 2):

| Lutador | Páginas | Tamanho da página 1 (px) | alturaRef | Quadros | Folha FILME (px) |
|---|---|---|---|---|---|
| HAYATO | 2 | 2048x1536 | 410 | 48 | 1920x1280 |
| WEI LONG | 2 | 2048x1664 | 410 | 49 | 1824x1280 |
| MIN-JI | 2 | 2048x1536 | 410 | 48 | 1920x1216 |
| CAIO | 2 | 2048x1792 | 396 | 48 | 1888x1280 |
| AMINU | 2 | 2048x1920 | 410 | 48 | 1824x1280 |
| CENTELLA | 2 | 2048x1664 | 410 | 48 | 1920x1280 |
| CAMILLE | 2 | 2048x1472 | 410 | 48 | 1616x1280 |
| NILA | 3 | 2048x1600 | 410 | 60 | 1920x1216 |
| BAATAR | 3 | 2048x1792 | 472 | 54 | 2000x1248 |
| ZENON | 3 | 2048x1984 | 502 | 63 | 1760x1280 |

Os atlas do BAATAR e do ZENON foram gerados a 0,9 (T10 do orçamento, commit `9dce4da`): `alturaRef` 525 → 472 e 558 → 502, com três páginas cada. O campo `scale` não mudou (1,28 e 1,32). O tamanho em jogo sai de `K = scale × SH_IDLE / alturaRef` (`src/data/atlas.ts:32`), e os dois valores caem juntos, então o tamanho na tela não muda.

Convenção, não validada pelo carregador: quadro ativo tem `ponta` (`ferramentas/sprites/poses.mjs:19`, lista `COM_PONTA`). **a confirmar** se algum atlas viola a convenção.

**Bloco `filme` (folha FILME):** imagem à parte, com seis quadros `f0` a `f5`, todos com `"painel": true` e sem campo `p`. Forma:

```json
"filme": {
  "imagem": "filme.webp",
  "tamanho": [1920, 1280],
  "quadros": {
    "f0": { "x": 4, "y": 4, "w": 664, "h": 631, "ax": 332, "painel": true }
  }
}
```

O bloco nasce em `ferramentas/sprites/lutadores.json` (chave `filme` de cada lutador) e é validado por `validarBlocoFilme` (`ferramentas/sprites/nucleo.mjs:607`): imagem `.webp` sem pasta e não página do atlas, `tamanho` inteiro, quadros só `f0..f5`, `painel: true`, nenhum campo `p`, quadro dentro da página. O pipeline copia a imagem (`prepararFilme`, `ferramentas/sprites/executar.mjs:90`) e confere o tamanho declarado. Os dez lutadores têm o bloco no commit.

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

Tipo `LeituraLuta` (`src/core/contratos.ts:572`). Tipo `EventoLuta` (`src/core/contratos.ts:377`).

Regras de consumo (comentário em `src/core/contratos.ts`, a partir de `:151`):

1. `tick` só avança quando a luta anda. Durante o hitstop ele congela, junto com as partículas.
2. `events` é esvaziado por `fight/` no início de cada tick. No tick congelado, fica vazio.
3. A luta não toca áudio nem cria partícula. Só emite evento.
4. Efeitos visuais usam um RNG separado do da lógica (`rngVisual`).

Eventos da chefia: `fase-chefe`, com `etapa` `'troca'`, `'cena'` ou `'retomada'`. A etapa `'cena'` é emitida em `src/fight/game.ts:599`. Hit e block têm `dreno?: number`, só quando houve dreno. O evento `filme` (motor v2) é descrito na seção 20.

### C4: armazenamento local

Implementação em `src/core/storage.ts`. Chaves em `src/core/contratos.ts`.

| Chave | Formato | Papel |
|---|---|---|
| `inno-fighters-v1` (`CHAVE_STORAGE`, `contratos.ts:133`) | `{ v: 1, s, hi }` | formato anterior. Continua lido na migração |
| `sakura-fighters-v4` (`CHAVE_STORAGE_LEGADA`, `contratos.ts:135`) | `{ s, hi }` (formato do protótipo) | legado. Migrado; removido só depois de a v2 ser gravada |
| `inno-fighters-v2` (`CHAVE_STORAGE_V2`, `contratos.ts:142`) | `{ v: 2, s, hi, prog }` | chave atual |
| `inno-fighters-v2-quebrada` (`CHAVE_STORAGE_V2_QUEBRADA`, `storage.ts:168`) | texto cru | cópia de uma v2 ilegível, guardada antes de ser substituída |

**Migração** (`carregarDadosV2`, `src/core/storage.ts:259`), nesta ordem: 1) se a v2 é válida, usa; 2) senão, se a v1 é válida, monta `{ s, hi }` com progresso vazio e grava a v2; 3) senão, se há legado, faz o mesmo com ele; 4) senão, usa os padrões e não grava nada. O recorde: se o da v1 é maior, vence (`recordeV1 > atual.hi`, `src/core/storage.ts:281`), ou seja, `max(v2.hi, v1.hi)`.

**v2 de build mais novo** (`v > 2`, `storage.ts:200`): é lida em memória, mas `salvarDadosV2` (`storage.ts:223`) recusa gravar e retorna `false`. A UI mostra o aviso de progresso não salvo (`src/ui/persistencia.ts`, `MSG_NAO_SALVO`).

**Ids desconhecidos e saneamento do progresso** (`sanearProgresso`, `src/meta/progresso.ts:150`):

- Id fora do roster com forma de id vai para `prog.desconhecidos`, até `MAX_IDS_DESCONHECIDOS = 32` (`progresso.ts:130`). Não é usado, mas é regravado.
- Id que passou a existir no roster é promovido a `desbloqueados`.
- Iniciais nunca são guardados.
- `chefesDerrotados` aceita só ids com forma de id, sem repetição, até `MAX_CHEFES_DERROTADOS = 16` (`progresso.ts:27`). Um guardião derrotado entra na lista; `CHEFOES_SO_POR_DERROTA = ['zenon']` (`progresso.ts:21`) são os que se liberam só por derrota.
- Lixo (não é texto, forma inválida, excesso) é descartado.

**Saneamento das configurações** (`sanearConfiguracoes`, `src/core/storage.ts:50`): `rounds`, `time` e `diff` aceitam só os valores que a UI oferece. `cinematica` e `provocacoes` são lidos (`storage.ts:60-67`), mas são **preferências aposentadas**: `PREFERENCIAS_APOSENTADAS` (`src/ui/persistencia.ts:14`) tira os dois da memória ao carregar e só os devolve ao gravar. Na prática, o jogo não usa esses valores (ver seções 12 e 13).

**Recorde:** `sanearHi` (`storage.ts:86`) aceita inteiro maior que 0 e até `TETO_RECORDE = 99_999_999` (`storage.ts:37`). Fora disso vira 0.

Testes: `tests/unit/storage.test.ts`, `tests/unit/storage-v2.test.ts`, `tests/unit/progresso.test.ts`, `tests/unit/provocacoes-storage.test.ts`.

## 4. Carga sob demanda

- **Boot em etapas** (T4, `c058ac9`; `iniciarArte`, `src/assets/elenco.ts:109`). A **etapa 0** é a única que bloqueia `data-pronto` (a tela de "CLIQUE OU PRESSIONE UMA TECLA"): o `atlas.json` dos 10 lutadores (poucos KB cada, `carregarManifestos`, `src/assets/carregador.ts:355`), a marca, as fontes, o manifesto dos sons e o cenário do menu (`jp`). A lista inteira mora em `src/assets/etapa0.mjs`, que o boot e o build (o SW) leem. Meta: 1,5 MiB até `data-pronto` (gate `tests/e2e-build/boot-peso.spec.ts`); medido 0,913 MiB, 28 pedidos (relatado pela coordenação).
- **Etapa 1** (`etapa1()`, chamada em `src/main.ts:218` logo depois do `data-pronto`; só na política `'por-peso'`): retratos e vitrine (atlas um por vez, o do menu primeiro, depois os cenários do título) em segundo plano pela fila de fundo. Quando a vitrine inteira está na memória, `data-vitrine` vira `true` (`src/main.ts:220`). Na política `'fixa'` (`?residencia=fixa`), `etapa1` não faz nada: tudo veio na etapa 0, como antes da T4.
- **Atlas ausente:** um `atlas.json` de id de `IDS_LUTADORES` que falte derruba o boot, em qualquer política (ver `docs/como-adicionar-um-lutador.md`, passo 8).
- **Retratos:** em WebP (`retrato.webp`; 10 arquivos, 0,283 MiB no total; T6 do orçamento). Na política por peso, entram na etapa 1; na `'fixa'`, na etapa 0. O `retrato.png` saiu.
- **Imagens fixas:** a vitrine `VITRINE` (`src/data/lutadores/index.ts:41`) e o cenário do título.
- **`?precarga=minima`** (só em `npm run dev`, `src/main.ts:183`): não carrega atlas no boot.
- **Demais:** `GerenciadorDeArte.garantir` (`src/assets/gerenciador.ts:323`). Na política de produção, `'por-peso'` (`POLITICA_PADRAO`, `src/assets/elenco.ts:87`): teto em bytes, despejo antes de decodificar e luta exclusiva. `?residencia=fixa` volta à política de antes (rollback em produção): no máximo `LIMITE_RESIDENTES_FIXA = 3` atlas não fixos (`gerenciador.ts:17`), com poda depois de carregar (`podar`, `gerenciador.ts:533`). Detalhes na seção 21.
- **Atlas sem imagem ainda:** o lutador some do desenho até a arte chegar.
- **Folha FILME:** não entra nesta carga. Só a luta pede (ver seção 20).
- **Sons:** o boot não baixa a folha `base` nem as dos lutadores. A `base` (272 KiB, `public/assets/sons/base.mp3`) desce depois do primeiro gesto, com o navegador ocioso (etapa 2: `agendarEtapa2`, `src/audio/camadas.ts:143`). As folhas dos dois lutadores descem na tela VS (`prepararLutaSonora`, `src/audio/camadas.ts:155`, chamada em `src/ui/cenas/vs.ts:26`) e, no mais tardar, no primeiro tick da luta (`reagirDoJogo`). Até chegarem, o jogo toca a síntese, e o primeiro golpe não fica mudo. T5 do orçamento.

O ZENON segue a mesma regra de carga sob demanda (teste: `tests/e2e/arte-sob-demanda.spec.ts`). O Arcade pré-busca o próximo da escada ao começar cada luta (`prebuscarProximoRival`, `src/ui/cenas/fight.ts:382`): a 5ª luta pré-busca o ZENON, que é o chefão.

## 5. Determinismo

**Gerador:** mulberry32 (`src/core/rng.ts:22`, `criarRng`). Mesma semente, mesma sequência.

**Semente:** `?seed=N` na URL (`lerSemente`, `src/main.ts:55`), ou valor de `crypto.getRandomValues` (`src/core/rng.ts:43`, `sementeAleatoria`). `?seed=N` vale também em produção (não tem gancho de desenvolvimento).

**Geradores separados** (todos a partir de `semente`, `src/main.ts`):

- lógica (CPU, sorteios da luta): `semente` (`main.ts:81`)
- visual (partículas, poeira, pétalas): `semente + 1` (`main.ts:82`)
- UI (escada do Arcade): `semente + 2` (`main.ts:83`)
- áudio: `semente + 3` (`main.ts:111`)
- sorteio da seleção (casa aleatória e roleta): `semente + 4` (`main.ts:158`)
- sorteio das falas das provocações: `semente + 5` (`main.ts:159`, `sorteioDeFalas`). Fora do RNG da luta: a sequência do motor não muda.
- variação dos sons por lutador: `sementeVariacao = semente + 6` (`main.ts:111`).

A cinemática e a entrada do chefão não chamam `game.update`, então não consomem o RNG da luta (`src/ui/cenas/fight.ts:493` e `:527`).

**Teste de regressão:** `tests/unit/fight.test.ts:181` (mesma semente, mesmo resultado).

**Fidelidade ao protótipo:** referência `prototipo/inno-fighters-artefato.html` (`tests/unit/_prototipo.ts:9`). Testes: `tests/unit/luta-fidelidade.test.ts` e `tests/e2e/fidelidade-prototipo.spec.ts`. Oráculo do HAYATO e da MIN-JI: a arte original (v1), não a de produção. O caminho é `tests/fixtures/atlas-prototipo/<id>/` (`tests/unit/_lutadores.ts:57`).

## 6. Luta de chefão

O chefão do ARCADE tem duas formas, que convivem no código:

- **ZENON (o Anfitrião):** `CHEFE = 'zenon'` (`src/meta/regras.ts:31`). Duas barras, cena da fase 2, entrada dramática. Fora da luta de chefe, é jogável comum.
- **Guardiões (AMINU, CENTELLA, CAMILLE, NILA, BAATAR):** cada um tem um bloco `chefe` com duas barras, cena da fase 2, `bonusVitoria`, `danoRecebido` e `danoRecebidoDificil`. Fora da luta de chefe, são lutadores comuns.

**Qual chefão aparece no ARCADE depende da chave `Regras.chefesDaFila`** (`src/meta/regras.ts:47`):

| Estado | `chefesDaFila` | Chefão do ARCADE |
|---|---|---|
| `REGRAS_PADRAO` no commit `c058ac9` | `true` | o próximo guardião da fila (AMINU primeiro); o ZENON só com os 5 liberados |
| Chave `false` (rollback) | `false` | sempre o ZENON; a vitória usa o formato antigo `{ derrotouChefe }` |

A escolha é feita por `chefeDoArcade` (`src/meta/chefes.ts:21`): com a chave `true`, devolve o primeiro guardião da fila ainda travado e diferente de `c1`; se a fila acabou, devolve o ZENON; se `c1` é o próprio ZENON e a fila está esgotada, devolve `null` (sem luta de chefe). A chave `false` é de rollback e de `?expansao=4`.

Histórico relevante: o contrato (`chefeDoArcade`, `aplicarVitoriaArcade({ chefe })`, `danoRecebido`) entrou em `955e720`; a UI dos guardiões (entradas, véu de fase 2, textos, cartão de desbloqueio) entrou em `bb8dae2`; os fatores por nível (`danoRecebidoDificil`) entraram em `41e1ffb`.

### 6.1 Dados

- `ConfigChefe` (`src/data/tipos.ts:124`): `barras`, `hpPorBarra`, `fichaFase1?`, `fichaFase2?`, `cena: CenaDef`, `bonusVitoria`, `trilha?`, `danoRecebido?` (`:144`), `danoRecebidoDificil?` (`:149`). `fichaFase1` e `fichaFase2` são opcionais; o guardião não tem ficha de fase.
- `danoRecebido` e `danoRecebidoDificil`: multiplicadores do dano que a **vida** do chefe sofre, um por nível da CPU. `montar` recusa valores fora de `0,60` a `1` (`DANO_RECEBIDO_MIN = 0.6`, `src/data/montar.ts:99`; validação em `montar.ts:102`). São a alavanca de dureza: não mudam a ficha, o ataque nem a IA. Seção 6.2.
- `CenaDef` (`src/data/tipos.ts`): `{ duracao, poses }`. A pose do tick `t` é `poseDaCena(cena, t)` (`src/data/cena.ts:8`); a última segura até o fim.
- `validarCena` (`src/data/cena.ts:15`), chamada em `src/data/montar.ts:118` (dentro do bloco `if (def.chefe)`, `montar.ts:117`): duração inteira de 1 a 600 e de 1 a 8 nomes de pose. Dado inválido falha no boot.
- `Golpe.drenaEnergia` (`{ acerto, defesa }`): validado em `src/data/montar.ts`. Recusa projétil, `hits > 1`, `throw`/`agarrao` e números fora de `0 <= defesa <= acerto <= 100`.
- `LutadorDef.alturaEmPe`: altura da hurtbox em pé, em múltiplo da escala. No ZENON, `1,22` (`src/data/lutadores/zenon.ts:144`).
- `LutadorDef.alturaDoProjetil`: altura, em px, de onde o projétil nasce. ZENON: `175` (`zenon.ts:146`).
- Ficha: `FichaDef` é parcial e sobrescreve a base. Atenção: `mods` é **raso por golpe** (armadilha descrita em `docs/como-adicionar-um-lutador.md`).

Números do ZENON (`src/data/lutadores/zenon.ts`, commit `c058ac9`):

| Campo | Valor | Linha |
|---|---|---|
| `scale` | 1,32 | `zenon.ts:133` |
| `pow`, `hp` | 1,0; 100 | `zenon.ts:129` |
| `alturaEmPe` | 1,22 | `zenon.ts:144` |
| `alturaDoProjetil` | 175 | `zenon.ts:146` |
| `chefe` | 2 barras de 50 (`hpPorBarra`, `:153`); bônus 5000 (`:158`); `danoRecebido: 0,75` (`:161`) e `danoRecebidoDificil: 0,73` (`:162`); bloco começa em `:151` | `zenon.ts:151-162` |
| dreno do TRIBUTO | 12/6 no jogável | `zenon.ts:46` |
| armadura da fase 2 | `armor: 1` em `hp`, `hk` e `chp` (ficha `chefe2`) | `zenon.ts:112` |

Números dos guardiões (`src/data/lutadores/*.ts`, commit `c058ac9`; cada um tem `chefe: { barras: 2, hpPorBarra, cena, bonusVitoria, danoRecebido, danoRecebidoDificil }`):

| Guardião | `hpPorBarra` | `danoRecebido` (NORMAL) | `danoRecebidoDificil` (DIFÍCIL) | Referência (`chefe`, `hpPorBarra`, `danoRecebido`, `danoRecebidoDificil`) |
|---|---|---|---|---|
| AMINU | 54 | 0,85 | 0,92 | `aminu.ts:71`, `:73`, `:76`, `:77` |
| CENTELLA | 50 | 0,86 | 0,74 | `centella.ts:66`, `:68`, `:71`, `:72` |
| CAMILLE | 47 | 0,89 | 0,82 | `camille.ts:76`, `:78`, `:81`, `:82` |
| NILA | 52 | 0,84 | 0,72 | `nila.ts:130`, `:132`, `:135`, `:136` |
| BAATAR | 46 | 0,82 | 0,75 | `baatar.ts:89`, `:91`, `:94`, `:95` |

### 6.2 Motor

- `danoNoDefensor` (`src/fight/game.ts:354`): multiplica o dano pelo fator do chefe. Com a CPU que controla o defensor em **DIFÍCIL** (`d.cpu === 2`, índice de `AI_LEVELS`, `src/fight/cpu.ts:10`), usa `danoRecebidoDificil` se existir; senão, `danoRecebido`. Ausente ou `1` devolve o número sem multiplicar (`game.ts:356`). O fator mora em `cfgChefe` do lutador, não na ficha: a NILA troca de postura e o fator fica (comentário em `game.ts:350`).
- Dreno: `cobrarDreno` (`src/fight/game.ts:1210`). `k = min(rival.en, valor)`, `rival.en -= k`, `atacante.en = min(100, atacante.en + k)`. Roda só nos ramos de acerto e de bloqueio. Armadura que absorve, PARADE, esquiva e `untouchable` retornam antes, então não drenam.
- Fases: a troca de barra não é KO: `resolverVidaZerada` (`src/fight/game.ts:1227`) devolve `false` quando sobra barra (e marca a troca e `cenaPendente`), e `true` quando é KO. Cena da fase 2: o chefe fica com `cenaPendente = true` (`game.ts:1238`), e a etapa `'cena'` do evento `fase-chefe` sai em `game.ts:599`. A troca de ficha só acontece se o chefe tem `fichaFase2` (ZENON).
- Limite de combo (motor v2): com `motorV2.filmes`, um combo tira no máximo `TETO_COMBO = 0,4` (40%) da vida total do defensor (`src/fight/game.ts:66`, `limitarAoTetoDoCombo` em `game.ts:1106`). Seção 20.

### 6.3 Render

- Rampa da fase 2: `rampaDaFase2` (`src/render/aura-chefe.ts:27`) vem do **estado da luta**, não de evento. Para os guardiões (sem `fichaFase2`), a rampa vale 1 (`aura-chefe.ts:32`); para o ZENON, vale quando a ficha é a da fase 2 (`aura-chefe.ts:34`). Chamada em `src/render/mundo.ts:78`.
- Aura: `desenharAuraChefe` (`src/render/aura-chefe.ts:47`).
- Arena da fase 2: `SOBREPOSICOES_DE_CENARIO` (`src/render/cenario.ts:48`), com `gr` em `src/render/arena-gr.ts`. Usada por `desenharMundo` (`mundo.ts`). Véu do céu, braseiros em púrpura e raios ocasionais; não usa o RNG da luta.
- Véu de fase 2 (`src/render/veu-de-fase2.ts`), roteiros de entrada por lutador (`src/render/roteiros-de-entrada.ts`, `ROTEIROS_DOS_GUARDIOES` em `:56`) e efeitos (`src/render/efeitos-de-entrada.ts`). Os 5 guardiões têm batidas de pose, zoom, deslocamento, efeito e som. O ZENON mantém o roteiro dele.
- Apresentação: `APRESENTACAO` (`src/render/apresentacao-lutadores.ts:78`) reúne a pose de entrada e de vitória, as falas, o aviso do VS e o cartão da entrada. Só desenho: nada disso vai ao motor. A fala do chefão é `falaDoChefe` (`apresentacao-lutadores.ts:159`); ver 6.7.
- Entrada dramática: `src/render/entrada-chefe.ts`. COMPLETA = 270 ticks (`DURACAO_ENTRADA_COMPLETA`, `:30`); CURTA = 60 ticks (`DURACAO_ENTRADA_CURTA`, `:31`). `PULO_VALE_A_PARTIR_DE = 10` (`:33`) e `SAIDA_AO_PULAR = 6` (`:35`). Linha do tempo pura: `linhaDaEntrada` (`:119`). Escolha do modo: `modoDaEntrada` (`src/ui/cenas/fight.ts:209`); ver 13.
- Cinemática do especial: `src/render/cinematica.ts`. COMPLETA = 48 ticks (`DURACAO_COMPLETA`, `:27`), CURTA = 20 ticks (`DURACAO_CURTA`, `:28`), saída ao pular em `TICKS_DA_SAIDA_AO_PULAR = 6` (`:30`). `modoDaCinematica` (`:49`) devolve `null` para DESLIGADA ou com `Regras.cinematica` desligada. Tarja do especial: `pintarTarja` (`:175`); tamanho do nome em `tamanhoDoNome` (`:567`). A fonte é a do especial (`FONTE_DO_ESPECIAL`, `src/render/texto.ts:22`).
- Escala na vitrine: `escalaDeVitrine` (`src/ui/personagens.ts:28`) encolhe só quem passa de `ESCALA_MAXIMA_DE_VITRINE = 1.1` (`personagens.ts:25`). O BAATAR (`scale` 1,28, `src/data/lutadores/baatar.ts:63`) e o ZENON (1,32, `zenon.ts:133`) são encolhidos na vitrine, não no dado.

### 6.4 Áudio

- Trilhas fixas: `TRILHAS` (`src/audio/audio-sys.ts:125`). `fight`, `menu` e `chefe` (valsa em 3/4).
- Trilha de chefe: `playChefe` (`audio-sys.ts:853`). Fase 2: `AudioSys.musicaDaFase(2)` (`audio-sys.ts:764`).
- Gatilho da fase 2: o evento `fase-chefe` com `etapa === 'cena'` chama `introWhoosh` (`audio-sys.ts:657`) e `musicaDaFase(2)` (`src/audio/eventos.ts:75`).
- `startMusic` (`audio-sys.ts:674`) recebe a trilha pedida. A luta escolhe a trilha com `trilhaDoJogo` (`src/audio/camadas.ts:198`), chamado em `src/ui/cenas/fight.ts:345`.
- Eventos da luta: `reagirDoJogo` (`src/audio/camadas.ts:173`), chamado em `src/ui/cenas/fight.ts:594`. Antes de tocar, sincroniza as amostras dos dois lutadores. Com a identidade carregada e ligada, toca por `reagirComIdentidade` (`src/audio/camadas.ts:188`; implementação em `identidade-sonora.ts:391`); sem ela, `reagirAosEventos` (`camadas.ts:191`; `src/audio/eventos.ts:102`).
- Estado: identidade sonora, temas e amostras reais **ligados** (ver 14, 14b e 14c).

### 6.5 Grade de 10 e casa de honra

- `temCasaDeHonra(n)` (`src/ui/grade.ts:19`): verdadeiro só com 10 casas (9 regulares + o chefão).
- `ordemDaGrade` (`src/ui/grade.ts:28`): os 9 regulares na ordem do roster; o chefão por último, no índice 9.
- `CASA_DE_HONRA` (`grade.ts:56`): `{ x: 404, y: 356, w: 204, h: 44 }`. Oculta = "???" e "O ANFITRIÃO". Liberada = rosto, nome, título e "CHEFÃO".
- Casa aleatória (`CASA_ALEATORIA`, `grade.ts:54`): sorteio com RNG próprio (`semente + 4`), só entre liberados.
- `moverNaGrade` (`grade.ts:103`): ↓ da 3ª linha vai para a honra; ↑ da honra vai para a casa 7; ↑ da 1ª linha vai para a honra; ↓ da honra vai para a casa 1; ←/→ na honra não mudam.
- Área de toque: `retanguloDeToque` (`grade.ts:88`).

### 6.6 Esquiva

- Parâmetros de partida (`src/data/esquiva.ts`, `ESQUIVA_PADRAO`, `:28`): custo 20 de energia, buffer de 6 ticks para o botão. Ajuste pelo harness: `npm run balanco`.
- Regra ligada em `src/meta/regras.ts:43` (`esquiva: true`). Quando desligada, `body.sem-esquiva` esconde o botão ESQ do toque (`src/input/toque.css:95`).
- Entradas: teclado P1 `n` e P2 `o` (`src/input/mapa.ts:22` e `:35`); gamepad L1/L2 (`mapa.ts:56` para o P1 e `:71` para o P2); toque, botão ESQ (`index.html:45`).
- Apresentação: `src/render/esquiva.ts` (corpo fantasma e rastro só na janela invulnerável).

### 6.7 Fala do chefão: comportamento real

`falaDoChefe` (`src/render/apresentacao-lutadores.ts:159`) devolve:

- `fase2` durante `cena-chefe`;
- **vitória** só no `matchend`, quando o chefão vence a luta (não no `roundend`);
- **derrota** só no KO que fecha a luta, ou no `matchend` perdido por KO (vida zerada). Perder por tempo não fala. `roundend` nunca fala.

Essa é a decisão 6 de `PROGRESSO.md` ("derrota do chefão só no KO final; vitória só no `matchend`"). O código do commit `c058ac9` a segue.

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

- Comando: `npm run balanco -- [--rapido | --completo] [opções]` (`ferramentas/balanco/cli.mjs`; `--ajuda` lista tudo).
- **Referência de PRODUÇÃO:** `npm run balanco -- --completo --esquiva` grava em `docs/balanco/`. Com o motor v2 ligado por padrão, a rodada de produção mede o jogo como ele é. `--completo --esquiva --sem-motor-v2` grava a referência "antes" em `docs/balanco/sem-motor-v2/`, e `--completo` sem `--esquiva` grava em `docs/balanco/sem-esquiva/`. `docs/balanco/README.md` diz qual é qual.
- Flags do motor v2 no harness: `--sem-motor-v2` (desliga as três), `--motor-v2 entrada,filmes,combos` (liga só estas; sai em `relatorios/`, nunca em `docs/`), `--entrada-hitstop`, `--filmes`, `--dano-filme hoje|v2|forte` (A/B do dano; sai em `relatorios/`).
- **A referência versionada em `docs/balanco/` é a rodada COM esquiva e com o motor v2 ligado** (`resultados.md`, "Entradas desta rodada"): versão de dados/motor `0b5ad77394bb`, 100 sementes por combinação, NORMAL e DIFÍCIL, 25 800 lutas (18 000 regulares e 7 800 contra os chefões), 0 travadas. Hash das lutas regulares: `e5db8a2586c836b5` (tem de ser igual antes e depois de qualquer ajuste de chefão). A rodada anterior tinha `05bf1b64b46008a0`; o BAATAR ganhou o `lp` recalibrado (`bh` 62, T10) e o balanço foi regravado.
- Metas dos chefões: rampa de NORMAL de AMINU (26-30%) a ZENON (15-19%), com os intermediários; DIFÍCIL proporcionalmente menor, centro x 0,575, ± 3 pontos.

Resultado da rodada de produção (valores de `docs/balanco/resultados.md` no commit `c058ac9`; "Jogador vence" = a CPU do desafiante vence o chefão; aproximação CPU x CPU, não uma pessoa):

| Chefão | Desafiantes | `danoRecebido` (NORMAL) / `danoRecebidoDificil` | Jogador vence NORMAL (meta) | Jogador vence DIFÍCIL (meta) |
|---|---|---|---|---|
| AMINU | 4 | 0,85 / 0,92 | 29,8% (26-30) ok | 15,8% (13-19) ok |
| CENTELLA | 5 | 0,86 / 0,74 | 25,8% (24-28) ok | 16,8% (12-18) ok |
| CAMILLE | 6 | 0,89 / 0,82 | 25,2% (22-26) ok | 12,8% (11-17) ok |
| NILA | 7 | 0,84 / 0,72 | 22,1% (19-23) ok | 13,7% (9-15) ok |
| BAATAR | 8 | 0,82 / 0,75 | 17,8% (17-21) ok | 11,5% (8-14) ok |
| ZENON | 9 | 0,75 / 0,73 | 18,1% (15-19) ok | 9,4% (7-13) ok |

Os 12 de 12 chefões estão dentro da meta no commit `c058ac9`. Na rodada anterior, o DIFÍCIL estava fora da faixa em 4 de 6 chefões; nesta, com os fatores por nível (`danoRecebidoDificil`), os 6 ficam dentro da meta.

Taxa de vitória dos 10 lutadores nas lutas regulares (`resultados.md`, todas contra os outros 8, IC 95%): de 44,8% (MIN-JI) a 56,2% (BAATAR). Duração média de 93 s; nenhuma luta decidida por tempo; 0 travadas.

Sem esquiva (`docs/balanco/sem-esquiva/`): rodada anterior, só para comparação. O README da pasta diz que não foi regravada e que é de um chefão só.

- Harness: `ferramentas/balanco/` (cada luta monta a própria `Game` em memória; nada toca o estado do jogo). Meta por chefão: `metaDoChefe` (`ferramentas/balanco/chefoes.ts:47`).

## 9. Política de segurança de conteúdo (CSP)

Definição: `POLITICA_CSP` em `vite.config.ts:23`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; worker-src 'self'
```

- Entra como `<meta http-equiv>` só no build (plugin `cspSoNoBuild`, `vite.config.ts:36`, registrado em `vite.config.ts:122`). O dev server injeta scripts inline, então não recebe a CSP.
- Exceções documentadas em `vite.config.ts` (cabeçalho do arquivo): `style-src 'unsafe-inline'` (estilo do `index.html` e do `<pre id="err">`); `img-src data: blob:`, `media-src blob:` e `connect-src 'self'`, que hoje não são usados e ficam como folga.
- A meta **não** cobre `frame-ancestors`, `report-uri` nem `sandbox`. Esses só funcionam como cabeçalho HTTP.
- Teste: `tests/e2e-build/csp.spec.ts` e `tests/e2e-build/trailer-csp.spec.ts`, contra o build (`npm run test:e2e:build`).
- O Pages não permite definir cabeçalhos. No EasyPanel, a política deve virar cabeçalho.

## 10. Build e publicação

- `npm run build` = `tsc --noEmit && vite build` (`package.json`). Gera `dist/` com sourcemap (`vite.config.ts:126`, `sourcemap: true`). Também emite `version.json` (ver 19).
- Depois do `vite build`, o plugin `serviceWorker()` (`vite.config.ts:83`) gera `dist/sw.js` (sem hash no nome) e `dist/sw-manifesto.js` (hash do conteúdo de cada arquivo). `INNO_SW=off npm run build` gera o SW aposentado, para rollback por deploy. Ver seção 22.
- O mapa de código-fonte fica público no build. A decisão do dono é trocar para `sourcemap: 'hidden'` ao privar o repositório (`PROGRESSO.md`, seção do repositório público). Ainda não foi feito.
- CI: `.github/workflows/ci.yml` roda typecheck, testes e build em todo push e PR, com Node 24 (`ci.yml:27` e `:50`). Há também `.github/workflows/e2e-completo.yml`. `engines` do `package.json` pede Node 20 ou mais novo.
- Pages: `.github/workflows/pages.yml`, temporário, dispara a cada push na `main`. Ver `README.md`.

## 11. Ferramentas

| Arquivo ou comando | Função | Estado |
|---|---|---|
| `ferramentas/extrair-prototipo.mjs` | tira atlas e cenários do protótipo para `public/assets` | usado na F1 |
| `ferramentas/sprites/` (`npm run sprites -- <id>`) | pipeline de folhas para atlas C1 v2, com o bloco `filme` (`prepararFilme`, `executar.mjs:90`) | sem argumento, imprime o uso. Grava em `sprites-gerados/` e `arte-fonte/` |
| `ferramentas/balanco/` (`npm run balanco`) | harness de simulação (flags na seção 8) | commitado; `docs/balanco/` é a rodada de produção, com esquiva e motor v2 (seção 8) |
| `ferramentas/sw/` (`node ferramentas/sw/cli.mjs --dist=dist`) | manifesto de revisões do service worker (`sw-manifesto.js`): hash do conteúdo de cada arquivo do `dist/` | commitado (T7); ver seção 22 |
| `ferramentas/orcamento/` (`npm run orcamento`) | portão de orçamento: lê `dist/` depois do build e compara com `orcamento.json` (JS gzip, atlas, FILME, cenários) | metas no `orcamento.json`; `bloqueantes` vazio, então hoje tudo é aviso. Precisa de `npm run build` antes (escreve `dist/`). Os números medidos: **a confirmar** |
| `ferramentas/converter-cenarios.mjs` | cenários da arte-fonte para WebP 1920x1080. `--so <sigla>` converte só alguns | fontes em `FONTES` do próprio arquivo |
| `ferramentas/gerar-retratos.mjs` | retrato de cada lutador a partir do atlas (`--so <id>`, `--verificar`) | existe; sem script npm |
| `ferramentas/prompts/montar-prompts.mjs` | gera `docs/prompts/` a partir de `docs/prompts-arte.md` | não reconferido nesta passada |
| `ferramentas/sons/gerar-pacote-teste.mjs` (`npm run sons:pacote-teste`) | gera um pacote de amostras de teste em `tests/fixtures/sons-pacote/`, com ondas sintéticas e `ffmpeg` no PATH | commitado |
| `ferramentas/trailer/cli.mjs` (`npm run trailer:escalar`) | escalação do trailer de abertura (plano, sementes, níveis da CPU) | commitado |
| `ferramentas/trailer/medir.mjs` (`npm run trailer:medir`) | medição de desempenho do trailer no Chromium com CPU estrangulada; compara com a luta CPU x CPU. `--modo memoria` mede o pico de memória decodificada do trailer por plano, com meta de 150 MiB (T12) | commitado |

## 12. Pendências técnicas (verificadas no commit `c058ac9`)

- **`poseDaCena` existe em uma cópia só** (`src/data/cena.ts:8`), usada pelo motor (`src/fight/fighter.ts:1102`) e pela apresentação (`src/render/apresentacao-lutadores.ts:142`).
- **Comentário velho:** `src/fight/game.ts:1224` ainda diz "a Dança da Águia fica pendente". Hoje é a cena da fase 2 (ver `game.ts:580`).
- **Preferências de cinemática e de provocação aposentadas.** O menu de Opções não tem mais as linhas CINEMÁTICA e PROVOCAÇÕES (`src/ui/cenas/options.ts`). `PREFERENCIAS_APOSENTADAS` (`src/ui/persistencia.ts:14`) descarta os valores salvos ao carregar. Por isso a entrada do chefão é COMPLETA na primeira vez de cada corrida do Arcade e CURTA nas demais (`modoDaEntrada`, `src/ui/cenas/fight.ts:209`, com o marco `entradaDoChefeVista` da corrida, `fight.ts:222`), e a provocação é sempre ligada. A regra de movimento reduzido continua valendo.
- **Tecla H:** alterna `game.debug` (`src/ui/cenas/fight.ts:851`). As caixas de colisão só são desenhadas com `import.meta.env.DEV`, em TREINO e com `game.debug` ligado (`fight.ts:916`; desenho em `src/render/caixas.ts:30`). Fora do DEV, H não mostra caixa nenhuma.
- **Prompts de arte:** `docs/prompts-arte.md` ainda diz "Gemini" no corpo (`:1` e `:28`), mas a nota do topo (`:9`) manda ler "Runway" em todo lugar onde aparece "Gemini". Corrigir o corpo do arquivo fica pendente.
- **Service worker, limite conhecido:** com duas abas abertas, a aba que ficou na versão velha é servida pelo SW novo (arte nova e JS velho) até recarregar. Não há troca no meio de uma aba (`docs/service-worker.md`).

## 13. Provocação (balão antes do round e na vitória)

Spec: `docs/spec-provocacao-prerround-e-vitoria.md`. A seção "Decisões do dono" no topo da spec vale por cima do resto. A opção PROVOCAÇÕES foi retirada das Opções (ver 12): hoje ela é sempre ligada, salvo exclusões de regra abaixo.

**Onde mora:**

- `src/data/provocacoes.ts`: tipos, validação, escolha da fala (`sortearFala` em `:310`). Limites em `LIMITES_DE_FALA` (`:61`). Valida no import (`exigirFalasValidas`, `:197`, chamada em `:205`). `src/main.ts:14` importa o módulo para isso.
- `src/data/provocacoes.pt-BR.ts`: os textos. `TEXTOS_PROVISORIOS = false` (`:14`). **É a fonte de verdade**; `docs/textos-provocacao.md` é só registro de autoria. A contagem de falas (232, do registro de 2026-10-21): **a confirmar** nesta passada.
- `src/render/provocacao.ts`: funções puras (`provocacaoLigada` em `:96`, `modoDaProvocacao` em `:112`) e a classe `Provocacao`, com a mesma API da entrada do chefão (`iniciar / ativa / avancar / pular / zerar / desenhar`). Pulo: `puloAposDoRound` = 10 e `puloAposDaVitoria` = 24 (`:51-52`).
- `src/render/balao.ts`: desenho do balão, quebra por medida, `BALAO` (`:19`) com `linhaMax` de 372 px (`:21`).
- `src/ui/cenas/fight.ts`: gatilhos (`comecarProvocacao`, `:238`; chamado com `'abertura'` em `:533`, com `'rodada'` em `:711` para o round 2 em diante, e com `'vitoria'` em `:583`), pular (ataque, ENTER ou toque).

**Regras (o que o código faz):**

- **Ligada?** `provocacaoLigada` (`src/render/provocacao.ts:96`) exige `regras.cinematica` (por isso `?expansao=4` fica sem provocação), e exclui TREINO, CPU x CPU e, **só no pré-round**, a luta de chefão (a entrada dramática do chefão é o round 1). VERSUS de 2 jogadores tem provocação. Na vitória, vale também no chefão.
- **Modo:** `modoDaProvocacao` (`provocacao.ts:112`). Com a preferência aposentada, a regra usa o padrão: round 1 COMPLETA na primeira vez do confronto e CURTA nas repetições (continue, reinício, revanche); round 2+ e vitória COMPLETA. Com movimento reduzido, CURTA.
- **Movimento reduzido** vale por cima do modo: sem andada, sem zoom, sem pop. O texto entra inteiro com fade.
- **Round 1 (COMPLETA):** o P1 fala primeiro e o P2 responde. A andada dura 40 ticks (`provocacao.ts:56`, `andadaTicks: 40`). A duração total depende do texto: com textos curtos fica perto de 4,8 s (medido pela Íris em 2026-10-21; a spec estimava mais). Ver `PROGRESSO.md`, decisão em aberto 4.
- **Round 2+:** um balão de 1 linha de quem perdeu o round (`quemFalaNaRodada`); em round decisivo, a fala é a de `decisivo`.
- **Vitória:** balão do vencedor. O push-in vai a 1,08 (`provocacao.ts:74`, `zoomDaVitoria`).
- **Pular:** ataque de um humano, ENTER ou toque. Antes do tick 10 (round) ou do 24 (vitória), o pulo não vale.

**Sorteio das falas:** `Contexto.sorteioDeFalas` com semente + 5 (`src/main.ts:159`). Fora do RNG da luta. A memória de "última fala" é por sessão da cena (não repete a última do mesmo lutador quando a lista tem mais de uma).

**Prova do comportamento:** testes de unidade `p2-provocacao-*`, `p2-balao`, `provocacoes-*`, `baloes-premium` e os e2e `tests/e2e/provocacao.spec.ts` e `provocacao-p4*.spec.ts`. A medição em pixels (A/B com e sem balão, no handoff da Lyra): rosto coberto em 0 px² nos cenários de abertura e de vitória; na CURTA há cantos de balão de 10 a 44 px² (a Íris os tratou como informativos). Não medido em aparelho real.

**Não feito:** arte nova de `provoca0/1` (usa `win` como alias); escuta do som do balão; revisão de nativo dos termos estrangeiros (`docs/textos-provocacao.md` §3).

## 14. Identidade sonora por lutador (voz e assinatura dos especiais)

Spec: `docs/spec-sons-por-lutador.md`. Handoffs: `docs/handoff-vega-sons.md` e `docs/handoff-vega-sons-temas-ligacao.md`. Commits: `59f3b75` (dados e primitivas) e `1aa7cac` (ligação, "sons e temas ligados").

**Estado: LIGADO.** `IDENTIDADE_SONORA = true` (`src/audio/chaves.ts:14`). Decisão do dono (2026-10-21): sempre ligada, sem opção no menu e sem parâmetro de URL. A constante é só rollback por código: `false` volta ao som de antes. A ligação existe: `reagirDoJogo` roteia para `reagirComIdentidade` quando a identidade está carregada (`src/audio/camadas.ts:173-191`).

**O que existe:**

- Primitiva de voz: `vozFormante` (`src/audio/sintese-voz.ts`), com garganta por lutador (uma voz por lutador, KO não deixa entrar outra) e orçamento de fontes (`src/audio/orcamento-sonoro.ts`).
- Dados: perfis vocais (`PERFIS_VOCAIS`, `src/data/sons/perfis-vocais.ts:17`), gritos (`src/data/sons/gritos.ts`, `GRITOS_LEXICAIS = true` em `:130`: palavras reais marcadas "(rev.)" pedem revisão de nativo) e assinaturas dos especiais (`ASSINATURAS`, `src/data/sons/assinaturas.ts:276`), uma por entrada da tabela de apresentação.
- Validação: `exigirSonsValidos` (`src/data/sons/validar.ts:156`) é chamada no carregamento do módulo (`src/data/sons/index.ts:14`). O módulo é carregado pela camada de identidade no boot (`src/audio/identidade-sonora.ts:2` importa `data/sons`). Um lutador sem voz derruba o boot, como diz `src/audio/camadas.ts` (carregamento: dados inválidos relançam).
- Carga: `identidade-sonora` é um pedaço à parte, baixado no boot por `import()` (`src/audio/camadas.ts`, `carregarCamadasSonoras`, `:49`).

**Régua (como provar que os sons são diferentes sem ouvir):** `tests/support/regua-sons.ts`, congelada. Limiares: `TAU = 1,5` entre lutadores, `TAU_INTRA = 1,0`, `TAU_FAMILIA = 0,6`, `TAU_VARIACAO = 0,4`, `POSITIVO_MIN = 2,15`, `F0_REFERENCIA_VOZ = 175`. Pisos de hoje (regressão R5): `hurt 0,67`, `special 0,96`, `ko 0,83`.

**Números do handoff da Vega (régua congelada):** dois pontos não passam, e a Vega registrou por escrito: R6 com o bloco de tom `P` e R7 espelho. **Decisão pendente: baixar o piso do R7 ou aumentar o espelho** (`PROGRESSO.md`, decisão em aberto 7). Correções da régua depois do congelamento, aprovadas pela Íris: estimador de tom com pente de 5 harmônicos, e início do oscilador no primeiro quadro. Nenhum limiar mudou.

**Como criar a voz de um lutador novo:** ver `docs/como-adicionar-um-lutador.md`, seção "Voz e sons".

## 14b. Temas musicais por lutador

Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §3. Handoff: `docs/handoff-vega-temas.md`. Commits: `73f0074` (temas) e `1aa7cac` (ligação).

**Estado: LIGADO.** `TEMAS_POR_LUTADOR = true` (`src/audio/chaves.ts:16`). Decisão do dono: sempre ligado. `Regras.temasMusicais` (`src/meta/regras.ts:48`) é `true`; a fidelidade com o protótipo desliga a música por lutador só em `?expansao=4` (`src/ui/dev-expansao.ts`).

**O que existe:**

- Dados: 9 temas em `src/data/musica/temas/<id>.ts`, um por lutador jogável. O ZENON é `'chefe'` (a valsa de hoje). `TEMAS` (`src/data/musica/temas.ts:16`) tem `Record<IdLutador, TemaDef | 'chefe'>`: lutador sem entrada não compila.
- Validação no boot: `exigirTemasValidos` (`src/data/musica/validar.ts:225`), chamada em `src/data/musica/index.ts:10`. Limites em `LIMITES_MUSICA` (`validar.ts:12`).
- Escolha da trilha: `trilhaDoJogo` (`src/audio/camadas.ts:198`), chamado em `src/ui/cenas/fight.ts:345`. Com temas ligados e carregados, usa `trilhaDaLuta` (`src/audio/temas.ts:43`) com o tema do **adversário** (`c2`) em todos os modos; o ZENON toca a valsa (comentário em `camadas.ts`).
- Orçamento de fontes: `validarOrcamentoDosTemas` (`src/audio/temas.ts:62`). Teto de 8 fontes novas por passo (`FONTES_NOVAS_POR_PASSO_MAX`, `:55`) e 15 fontes ativas (`FONTES_ATIVAS_MAX`, `:56`).
- Sequenciador: `partituraDoPasso` e `partituraDaTroca` (`src/audio/partitura.ts`), `AudioSys.playTema` (`src/audio/audio-sys.ts:811`), com a fase 2 que só vira no início do compasso seguinte.
- Régua musical: `tests/support/regua-musica.ts` (congelada). Distinção medida em 65 pares de temas no handoff da Vega (não reconferido nesta passada).

**Como criar um tema:** ver `docs/como-adicionar-um-lutador.md`, seção "Tema musical".

## 14c. Amostras reais (sons de impacto, voz e especiais)

Spec: `docs/plano-sons-realistas.md`. Pesquisa e curadoria: `docs/pesquisa-sons-cc0.md`, `docs/relatorio-curadoria-sons.md`, `docs/relatorio-lote0-sons.md`, `docs/handoff-vega-amostras.md`. Commit: `497cb33`.

**Estado: LIGADO.** `AMOSTRAS_REALISTAS = true` (`src/audio/chaves.ts:23`). Sem a identidade não há amostra. Sem os arquivos (ou com falha de rede), o jogo toca a síntese, folha por folha, sem calar nada (comentário em `src/audio/chaves.ts`).

**O que existe:**

- Pacote: `public/assets/sons/` com `manifesto.json` (cada corte tem `origem`, `fonte` e `licenca`), arquivos MP3 (`base.mp3` e um `lutador-<id>.mp3` por lutador) e `CREDITOS.txt` e `LEIA-ME.txt`. Os créditos declaram fontes sob CC0 (ver `CREDITOS.txt`).
- Banco: `BancoDeAmostras` (`src/audio/amostras.ts:124`), carregado por `carregarBanco` (`:385`), que busca `manifesto.json` em `baseUrl`. Até `MAX_FOLHAS_DE_LUTADOR = 4` folhas por lutador (`:62`).
- Plano: `src/audio/plano-amostras.ts` (`pedidoDeFoley`, `:40`; `pedidoDeVoz`, `:64`) e a cobertura por evento em `src/data/sons/amostras.ts:173` (`AMOSTRAS_POR_EVENTO`).
- Execução: `tocarItem` toca a amostra quando o buffer está pronto; senão, a síntese (`src/audio/identidade-sonora.ts`).
- Painel de escuta com A/B: caixa "amostras reais", que desmarcada toca a síntese (`src/ui/escuta.ts`, comentário do módulo).

## 14d. Painel de escuta (`?escuta=1`)

- `?escuta=1` (`src/audio/chaves.ts:33-35`, lido em `src/main.ts:108`) abre o painel `abrirEscuta` (`src/ui/escuta.ts:66`) **sem jogo**: toca cada som, cada voz e cada tema. Só o valor exato `1` liga.
- Vale também no build de produção (não depende de `npm run dev`).
- Não persiste nada e não mexe no save. Não liga nem desliga as chaves.

## 15. Testes de arquitetura que guardam estas regras

- `tests/unit/chefoes-r1.test.ts`: fator `danoRecebido` nos pontos do motor, fichas opcionais, validação de `montar`.
- `tests/unit/p1-chefes-progressivos.test.ts`: `chefeDoArcade` em todos os estados possíveis da fila (chave ligada e desligada).
- `tests/unit/l1e1-chefoes.test.ts` e `tests/e2e/chefoes-l1e1.spec.ts`: UI dos guardiões.
- `tests/unit/provocacoes-*.test.ts`: falas, limites, validação do boot, sorteio.
- `tests/unit/musica-*.test.ts`: temas, sequenciador, orçamento, mix.
- Varredura de texto: `tests/unit/audio-chefe.test.ts:230` impede `Math.random` em `src/audio`. Em `src/fight/` não há ocorrência de `provoca` (grep no commit `c058ac9`).

## 16. Trailer de abertura

Spec: `docs/spec-trailer-abertura.md` (o cabeçalho da spec, no commit `c058ac9`, ainda diz "proposta, nada implementado"; o trailer está no commit, então o cabeçalho está desatualizado). Direção de arte: `docs/direcao-arte-trailer.md`. Commits: `f377da4` (fase 1, inerte), `dcdfe0c` (cena, câmera, modo atrair, versão estática), `0b288ca` (docs) e `41e1ffb` (filme no trailer).

**Estado: LIGADO.** `Regras.trailer = true` (`src/meta/regras.ts:50`).

**Fluxo:**

- No boot, o trailer abre se `disponivel()` (regra ligada + pedaço carregado + roteiro válido): `src/ui/cenas/boot.ts:52`. Senão, cai na abertura de hoje (`CenaIntro`).
- O pedaço é lazy: `import('../trailer')` em `src/ui/cenas/trailer.ts:65`. Começa a baixar no `Navegador.pronto()` (`precarregar`, `src/ui/cenas/trailer.ts`).
- **Modo atrair:** título parado por 30 s abre o trailer (`src/ui/cenas/title.ts:37-41`), só com o pedaço carregado; senão, espera mais 30 s. A música toca só na primeira repetição depois do último gesto do jogador.
- **Pular:** a partir do tick 10 (`PULO_VALE_A_PARTIR_DE = 10`, `src/ui/trailer/trailer.ts:73`; verificação em `:316`).
- **Parâmetros:** `?trailer=0` e `?trailer=P5` valem **só em desenvolvimento** (`parametroDoTrailer`, `src/ui/cenas/trailer.ts:17`, retorna `null` fora do DEV). Em produção, `?trailer=0` não desliga o trailer. `?trailer=0` existe para os e2e antigos que esperam `boot -> intro`.
- **Filme do especial no trailer:** o motor emite o evento `filme` no contato, e o diretor segura o motor pelos ticks do filme no modo CURTA (`MODO_DO_FILME_NO_TRAILER = 'curta'`, `src/trailer/filme.ts:14`). Um filme completo (58 a 66 ticks, segundo o comentário do próprio arquivo) comeria um terço de um plano de luta, por isso o trailer usa a versão curta de 30 ticks. O diretor cria o filme em `src/trailer/diretor.ts:302`.
- **Carga da arte (T12, `c058ac9`):** o trailer não tem arte fixa. Cada plano que desenha atlas ou cenário pede a sua, com 2 compassos de antecedência (`ANTECEDENCIA_DA_CARGA`, `src/trailer/carga.ts:19`), e solta no fim desse plano. Pico medido: 145,3 MiB (P6 + P7), contra 150 MiB de orçamento (`ORCAMENTO_DO_TRAILER_MIB`, `src/trailer/carga.ts:21`; relatado). Nenhum código do trailer carrega folha FILME. Spec: `docs/spec-trailer-abertura.md`, §5.2 (com nota de estado).

**Onde mora:**

- `src/trailer/` (sem DOM): diretor `DiretorDoTrailer` (`src/trailer/diretor.ts:104`), música (`src/trailer/musica.ts`), quadros estáticos (`src/trailer/estatica.ts`), marca (`src/trailer/marca.ts`), filme (`src/trailer/filme.ts`).
- `src/data/trailer/`: roteiro (`ROTEIRO` em `roteiro.ts:36`), abertura, textos, tomadas (`tomadas.ts`, gerado por `npm run trailer:escalar`), validação (`validar.ts`).
- `src/render/trailer/`: contraluz, estática, frio, grade, letterbox, revelação da logo, reserva, retratos e títulos.
- `src/ui/trailer/`: controlador em cena (`TrailerEmCena`, `src/ui/trailer/trailer.ts:110`), ambiente, aquecimento e arte sob demanda.

**Testes:** `tests/e2e/trailer.spec.ts`, `tests/e2e/trailer-filme.spec.ts`, `tests/e2e-build/trailer-csp.spec.ts`, `tests/unit/trailer-cena.test.ts`, `tests/unit/trailer-navegacao.test.ts`, `tests/unit/trailer-diretor.test.ts`, `tests/unit/trailer-musica.test.ts`. Os números de execução estão nos handoffs (`docs/handoff-lyra-trailer.md`, `docs/handoff-vega-trailer.md`); **não reconferidos nesta passada**.

## 17. Logo oficial

Spec e decisão: `docs/logo-oficial.md`. Handoff: `docs/handoff-lyra-logo.md`. Commit: `1aa7cac`.

- Arte: `public/assets/ui/logo/` (`logo-v1-1600.webp`, `logo-v1-720.webp`, `logo-horizontal-v1-600.webp`, `splash-v1-1920x1080.webp`, e `icones/`). O splash é pré-carregado em `index.html`.
- Código: `src/ui/logo.ts`. `GAME_NAME` (`:12`), `LOGO_ALTURA = 330` (`:22`), `LOGO_MENU` (`:31`), `PALETA_MARCA` (`:37`), `prepararImagemDaMarca` (`:62`), `iniciarMarca` (`:127`), `marcaPronta` (`:140`). A logo é imagem, não desenho.
- Ícones e metadados do site: `index.html`, `public/manifest.webmanifest`, `favicon.ico`.
- Testes: `tests/unit/logo.test.ts`, `tests/unit/marca-no-html.test.ts`, `tests/e2e/logo.spec.ts`.

## 18. Balões premium, botões de toque e tela cheia

**Balões** (`src/render/balao.ts`, reescrito em `1aa7cac`): `BALAO` (`:19`), `linhaMax` de 372 px (`:21`). Tinta opaca, aro claro, plaquinha com o nome na cor do lutador e rabicho no mesmo traço. Direção de arte: `docs/direcao-arte-baloes.md`. Handoff: `docs/handoff-lyra-baloes.md`.

**Botões de toque** (`1aa7cac`):

- Detecção: `temToque` (`src/input/toque.ts:33`) checa `ontouchstart` ou `maxTouchPoints > 0`. Sem toque, `ligarToque` (`:75`) não liga nada.
- Ligação: `src/input/entrada.ts:48`. Pré-carga da arte: `precarregarDesenhosDoToque` (`toque.ts:65`).
- Layout e estilo: `src/input/toque.css`. Decisões do dono no cabeçalho do arquivo: modo NORMAL com rótulos (LEVE, FORTE, ESQUIVA, ESPECIAL), opacidade 90% fixa, sem opção de tamanho, mão ou opacidade no menu.
- Marcação: `index.html`, `#touch`, com `#esq` (`:45`), `#r1` ESPECIAL e `#bp` pausa.
- Arte: `public/assets/ui/toque/*.svg` (estados normal, pressionado e desabilitado). Direção: `docs/direcao-arte-controles-toque.md`.

**Tela cheia** (`src/platform/tela-cheia.ts`):

- Tecla F fora da seleção (`src/main.ts:135`). Linha TELA CHEIA nas Opções (`src/ui/cenas/options.ts`, linhas `TELA CHEIA`, `TELA CHEIA BLOQUEADA`, `TELA CHEIA INDISPONÍVEL`), que liga e desliga onde a plataforma permite; onde não, abre um cartão com a explicação.
- Situação da plataforma: `situacaoDaTelaCheia` (`tela-cheia.ts:76`), com os casos `disponivel`, `bloqueada`, `instalado`, `ios` e `indisponivel`.
- iPhone: a Fullscreen API não existe no WebKit do iOS. O caminho é "Adicionar à Tela de Início" (cabeçalho de `tela-cheia.ts`). **Não testado em aparelho real** (ver T13 em `docs/orcamentos-2026-10-23.md`).
- Android: o pedido precisa de um gesto de ativação. O toque do jogo age no `touchstart`, que não conta como gesto em alguns navegadores; o pedido recusado é refeito no `touchend` seguinte (`observarGesto`, janela de 1500 ms em `tela-cheia.ts:175`).
- Entrada e saída: `alternarTelaCheia` (`tela-cheia.ts`).

## 19. Versão do build e atualização

- Identidade do build: `src/versao.ts` (`VERSAO`, `:17`; `rotuloDaVersao`, `:20`).
- `vite.config.ts` gera `version.json` só no build (`versaoJson`, `:66`, `apply: 'build'`), com o commit e a data.
- `verificarVersao` (`src/versao.ts:37`) busca `version.json?t=...` sem cache e compara com a versão rodando. Se há versão nova, aparece o aviso (`src/ui/cenas/options.ts:213`: "NOVA VERSÃO NO AR · TOQUE AQUI PARA ATUALIZAR") e o título (`src/main.ts:101`). Tocar em atualizar chama `recarregarSemCache` (`src/versao.ts:65`).
- Há service worker em produção (seção 22). O manifesto do app continua em `public/manifest.webmanifest`. A troca de versão passa pela página: `definirAtualizadorSw` (`src/versao.ts:60`).
- Testes: `tests/unit/versao.test.ts`, `tests/e2e-build/pwa-versao.spec.ts`.

## 20. Motor de luta v2 (ligado por padrão)

Spec: `docs/spec-revisao-motor-luta-v2.md`. Dados e fichas-técnicas: `docs/roteiros-filme-especiais.md`, `docs/combos-proprios.md`, `docs/balanco-motor-v2.md`. Fatias: V2-1 (entrada no hitstop), V2-2 (render v2), V2-3 (filme), V2-4 (combos), V2-6 (ligação). Commits: `d1cad33`, `8a992c4`, `81e24e1`, `bd14dbc`, `41e1ffb` (ligação).

**Estado: LIGADO.** As três mecânicas valem por padrão, em qualquer modo de elenco (inclusive `?expansao=4`), e a referência de balanço já as mede (seção 8).

### 20.1 Flags e como desligar

- `MOTOR_V2_PADRAO` (`src/meta/regras.ts:11`): `{ entradaNoHitstop: true, filmes: true, combos: true }`. É o que `REGRAS_PADRAO` carrega (`regras.ts:52`).
- Tipo `MotorV2` (`src/core/contratos.ts:39`): `entradaNoHitstop` (`:44`), `filmes` (`:51`), `combos` (`:58`) e `danoFilme` (`:63`, só A/B de ferramenta).
- Kill switch pela URL, que vale em produção: `motorV2DaUrl` (`src/meta/regras.ts:71`).
  - sem o parâmetro, ou `1`, `on`, `true`, `sim` ou vazio: tudo ligado;
  - `0`, `off`, `false`, `nao`: tudo desligado (o motor de antes, bit a bit);
  - lista (`entrada,filmes,combos`, em qualquer ordem): só essas ligadas (A/B de uma mecânica);
  - valor desconhecido (`?motorv2=xyz`) cai no padrão e não desliga nada por engano.
- `regrasComMotorV2` (`src/meta/regras.ts:88`) aplica a flag a qualquer base. `main.ts` chama isso em `src/main.ts:92`.
- Ligação na luta: `cfgMotorV2` (`src/meta/regras.ts`) leva as flags à `ConfigPartida` das lutas montadas pela UI. Sem flag nenhuma, a configuração sai idêntica à de antes.
- A/B do dano do filme: `?dano-filme=hoje|v2|forte` (`danoFilmeDaUrl`, `src/meta/regras.ts:98`). **Só em desenvolvimento**: `main.ts` passa `import.meta.env.DEV` como `dev`.

Exemplos de URL (produção):

```
https://<host>/InnoFighters/              motor v2 completo (padrão)
https://<host>/InnoFighters/?motorv2=0    o motor de antes (rollback sem deploy)
https://<host>/InnoFighters/?motorv2=filmes,combos   sem a entrada no hitstop
```

### 20.2 Entrada no hitstop (V2-1)

Com `entradaNoHitstop`, o botão e as direções apertados durante o hitstop não se perdem: a entrada humana é guardada nos ticks congelados e entregue ao primeiro tick acionável (`src/fight/game.ts:514`, `:526`; funções `guardarEntradaDoCongelamento`, `:468`, e `entregarEntradaDoCongelamento`, `:486`). A CPU não entra nessa guarda.

### 20.3 Filme do especial (V2-3)

- **Dados.** `src/data/filmes.ts` tem 33 entradas de dano e recuperação (tabela `T`, `:59`): 30 golpes dos 10 lutadores (NILA com 4, incluindo as duas variantes da SARPA; ZENON com 3), a resposta da PARADE da CAMILLE (`sResp`) e as 2 variantes de chefão do ZENON (`chefe2`). `dano` é a base; `hoje` é o dano de antes do filme, usado só pelo A/B. `FRAME_DATA_VERSAO` (`:33`) diz de qual `frame-data.json` vieram as recuperações. Acesso: `filmeDoGolpe` (`:143`), `todosOsFilmes` (`:154`) e `danoBaseDaVariante` (`:131`).
- **Roteiros (só UI).** `src/data/roteiros-filme.ts` monta o roteiro de cada golpe (tabela `LINHAS`, `:212`; `roteiroDoFilme`, `:323`; modelo genérico por tipo, `roteiroGenerico`, `:312`). O motor não lê esse arquivo. Pose `'$motor'` (`POSE_DO_MOTOR`, `:16`) é a pose que a leitura do motor dá no fim.
- **Folhas FILME na memória.** A folha de cada lutador só é carregada pela luta (`carregarFilme`, `src/assets/carregador.ts:266`; `carregarFilme` do gerenciador, `src/assets/gerenciador.ts:472`), no máximo `MAX_FOLHAS_FILME = 2` por vez (`gerenciador.ts:5`), e só se a flag `filmes` estiver ligada ou o gancho DEV estiver ativo (`src/ui/cenas/fight.ts:356`, chamado em `:310`, e a chamada em `:358`). Fora da luta, `soltarFilme` solta a folha.
- **Motor.** O primeiro contato limpo de um especial com filme resolve tudo no tick do acerto (dano, energia de um acerto, KO, troca de barra, queda): `src/fight/game.ts:1023` e `:1188` emitem o evento `filme`. Defendido, esquivado ou absorvido por armadura não abre filme. Uma execução de especial só dá um contato (`execConsumidas`, `game.ts:406`, `:685`).
- **UI.** `src/render/filme.ts`: linha do tempo pura (`batidasEfetivas`, `:65`), CURTA e pulo (`TICKS_PARA_PULAR = 10`, `:28`; `ZOOM_PADRAO = 1.3`, `:41`), HUD do rival que desce por batida (`hudDoRival`, `:149`). Enquanto o filme roda, a cena não chama `game.update` (`src/ui/cenas/fight.ts:539`).
- **Gancho DEV.** `?filme=<lutador>:<golpe>` abre um filme falso no primeiro tick da luta (`lerFilmeDev`, `src/ui/cenas/fight.ts:1010`; `import.meta.env.DEV` em `:309`).
- **Teto de combo.** Com `filmes`, `limitarAoTetoDoCombo` (`src/fight/game.ts:1106`) limita o dano total de um combo a 40% da vida total do defensor, sempre deixando passar o piso `PISO_ACERTO_NO_TETO = 0,5` (`game.ts:68`).
## 21. Residência de memória da arte (`?residencia=`)

Spec: `docs/spec-residencia-de-memoria.md` (fatias L1 a L7; §3, item 5, registra o `decode()` não feito). Parte de `docs/orcamentos-2026-10-23.md`, §2.3 e §2.4.

**Estado no commit `c058ac9` (origin/main):**

| Fatia | Conteúdo | Estado |
|---|---|---|
| L1 | `memoria()` (`src/assets/gerenciador.ts:225`), peso do atlas pelo manifesto, cache de silhuetas compartilhado | feito (`4bf908a`) |
| L2 | gerenciador por peso (`politica`, `teto`, `preferidos`); `main.ts` lê `?residencia=` | feito (`4bf908a`) |
| L3 | luta exclusiva (`arteDaCena`, `src/ui/residencia.ts:44`), `EsperaDeArte` (`src/ui/espera-de-arte.ts:12`), soltar o filme ao sair da luta (`src/ui/navegador.ts:96`) | feito (`41e1ffb`) |
| L4 | volta sem piscar: segura no preto (`TETO_DO_PRETO = 45`, `src/ui/navegador.ts:14`); no fim da luta, o fundo `jp` volta em segundo plano (`aoFimDaLuta`, `src/ui/cenas/fight.ts:366`: `preferir({ cenarios: [CENARIO_PADRAO] })`, uma vez por luta, só em `'por-peso'`) | feito (`41e1ffb`, `78de1be`) |
| L5 | chegada suave: `ChegadaDeArte` (`src/ui/chegada-de-arte.ts`, rampa de `TICKS_DA_CHEGADA = 12` ticks), usada pelo título, pelo menu e pela seleção | feito (`78de1be`) |
| L6 | aba oculta alivia e volta reaplica a tabela (ver seção 2); `POLITICA_PADRAO = 'por-peso'` (`src/assets/elenco.ts:87`) | feito (`78de1be`) |
| L7 | `createImageBitmap` + `close()`, opcional | não feito; só se a T13 pedir (D-R6) |

**`decode()` antecipado: não feito.** O comentário de `src/assets/carregador.ts` (commit `c058ac9`) registra a medição: decodificar antes muda o pixel (1 px de diferença, até 9 níveis, em 4 cenas do `fidelidade-prototipo`). Por isso o carregador segue decodificando no primeiro desenho. A chegada suave não depende de `decode()`.

**Políticas** (`PoliticaDeResidencia`, `src/assets/gerenciador.ts:23`):

- `'por-peso'` (padrão de produção desde `78de1be`, `POLITICA_PADRAO` em `src/assets/elenco.ts:87`): teto em bytes (`TETO_FORA_DA_LUTA`, 136 MiB, `gerenciador.ts:11`), despejo antes de decodificar (`abrirEspaco`, `gerenciador.ts:408`), luta exclusiva, e aba oculta que alivia (`aliviar`, `gerenciador.ts:153`).
- `'fixa'` (rollback em produção, `?residencia=fixa`): o comportamento de antes, byte a byte. Preferidos ficam fixos; no máximo `LIMITE_RESIDENTES_FIXA = 3` atlas não fixos (`gerenciador.ts:17`); a poda acontece depois de carregar (`gerenciador.ts:341`, `podar` em `:501`). `aliviar` não faz nada (`gerenciador.ts:154`).
- Escolha (`src/main.ts:185-186`): `?residencia=peso` pede `'por-peso'` explicitamente; `?residencia=fixa` pede `'fixa'`; sem o parâmetro vale `POLITICA_PADRAO`. Vale em produção (é o A/B no aparelho e o rollback sem deploy, D-R5).

**Aba oculta e volta** (ver seção 2): `aoOcultar` alivia; `aoVoltar` reaplica a tabela da cena atual. A luta (exclusiva) não precisa, porque o que ela usa nunca sai.

**Medição:** `memoria()` é a leitura de bytes vivos do gerenciador. Os números de partida (vitrine de 102,0 MiB e cenários de 31,6 MiB antes da residência) estão na spec, seções 0 e 0.1, medidos antes da residência e não reconferidos nesta passada.

**Medição final (relatada pela coordenação; não reconferida nesta passada):** BAATAR x ZENON 134 MiB, NILA x ZENON 129 MiB, e os confrontos comuns até 109 MiB (analítico), depois do T10 e da memória por luta final (`tests/e2e/memoria-por-luta.spec.ts`, alterado em `9dce4da`).

**Testes:** `tests/unit/residencia-memoria.test.ts`, `residencia-gerenciador.test.ts`, `residencia-tabela.test.ts`, `residencia-navegador.test.ts`, `residencia-fim-da-luta.test.ts`, `chegada-de-arte.test.ts`, `foco.test.ts`; e2e `tests/e2e/residencia-luta.spec.ts`, `residencia-volta.spec.ts`, `residencia-aba.spec.ts`, `chegada-de-arte.spec.ts`, `memoria-por-luta.spec.ts`.

## 22. Service worker (T7)

Desenho e medição: `docs/service-worker.md` (Vulcano). Peças no commit `c058ac9`:

| Peça | Onde |
|---|---|
| Decisões puras | `src/sw/logica.ts` |
| Eventos do SW (install, fetch, activate, mensagens) | `src/sw/sw.ts` |
| Registro, kill switch e troca (na página) | `src/platform/sw.ts` (`iniciarSw`, `:82`) |
| Manifesto de revisões (hash de cada arquivo) | `ferramentas/sw/` (`cli.mjs`, `manifesto.mjs`) |
| Build de `sw.js` e `sw-manifesto.js` | plugin `serviceWorker()` em `vite.config.ts:83` |

- **Quando registra:** só em produção (`import.meta.env.PROD`, `src/platform/sw.ts:83`). `vite dev` e os servidores de e2e não registram.
- **Escopo:** `import.meta.env.BASE_URL` (`/` no EasyPanel, `/InnoFighters/` no Pages).
- **Cache:** o shell (`index.html` e o que ele puxa, mais os extras da etapa 0 de `src/assets/etapa0.mjs`) entra no install: 34 arquivos, 1,51 MiB (relatado). Arte e JS são cache-first por `URL?__rev=<hash>`. `version.json` nunca é interceptado. O `index.html` vem do shell da versão.
- **Troca de versão:** a versão nova instala em espera. A página pede a troca no boot (nos primeiros 20 s) ou no botão U das Opções, quando há aviso de versão nova (`src/ui/cenas/options.ts:222`). Nunca no meio de uma luta.
- **Desligar:** `?sw=0` desregistra e fica desligado até `?sw=1` (`src/platform/sw.ts:26`). `INNO_SW=off npm run build` gera o SW aposentado.
- **Limite conhecido:** com duas abas abertas, a aba na versão velha é servida pelo SW novo até recarregar (seção 12).
- **Medição** (Vulcano, Chromium, build de 2026-10-24): shell de 15 arquivos (0,73 MiB); 1ª visita até o título e a seleção, 6,6 MiB pela rede; 2ª visita online, 0,1 KiB. Não medido em aparelho (T13).
- **Testes:** `tests/unit/service-worker.test.ts` e o e2e de build `tests/e2e-build/service-worker.spec.ts`.
