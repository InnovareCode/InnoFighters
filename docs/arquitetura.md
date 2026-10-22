# Arquitetura

Como o código está organizado no HEAD `73f0074` (2026-10-21). Os `arquivo:linha` foram conferidos no HEAD com `git show`/`git grep`. Onde a afirmação vale só para a árvore de trabalho (alterações não commitadas da Lyra em `src/ui`, `src/render` e `src/meta`), está marcado **(não commitado)**, sem linha. O que não foi confirmado por leitura ou execução está marcado **a confirmar**.

## 1. Camadas

Cada camada importa só das camadas da coluna "Importa de", com as exceções registradas abaixo.

| Pasta | Responsabilidade | Importa de |
|---|---|---|
| `core/` | tipos de contrato (`contratos.ts`), RNG com semente (`rng.ts`), armazenamento v2 (`storage.ts`), constantes (`constantes.ts`) | `meta/` (só `storage.ts`) |
| `meta/` | regras de desbloqueio e chefões (`regras.ts`, `chefes.ts`), progresso puro (`progresso.ts`), escada do Arcade (`escada.ts`) | `core/` |
| `data/` | definições dos lutadores (`lutadores/*.ts`), golpes, cenas (`cena.ts`), cenários (`cenarios.ts`), montagem e validação (`montar.ts`), falas das provocações (`provocacoes*.ts`), sons (`sons/`), temas musicais (`musica/`) | `core/`, `data/tipos.ts` |
| `fight/` | motor da luta: `Game`, `Fighter`, CPU, colisão, projétil. Sem DOM, áudio nem render | `core/`, `data/` |
| `audio/` | sons e música sintetizados (`audio-sys.ts`, trilhas em `TRILHAS`), tradução de eventos em som (`eventos.ts`), temas (`temas.ts`, `partitura.ts`), identidade sonora por lutador (`identidade-sonora.ts`, desligada) | `core/`, `data/musica/`, `data/sons/` |
| `render/` | desenho em canvas: pose, HUD, cenário, efeitos, cinemática, entrada do chefão, aura, legenda, provocação e balão (`provocacao.ts`, `balao.ts`) | `core/`, `data/`, `assets/` |
| `assets/` | manifesto C1 (`manifesto.ts`), carregador (`carregador.ts`), carga sob demanda (`gerenciador.ts`), elenco (`elenco.ts`) | `data/`, `core/` |
| `ui/` | cenas (`ui/cenas/*.ts`), menus, grade (`grade.ts`), navegador, persistência | quase todas as outras |
| `input/` | teclado, gamepad, toque: viram teclas virtuais e `InputFrame` | `core/` |
| `platform/` | escala do canvas, foco, tela cheia, avisos, erros | `core/` |
| `main.ts` | monta tudo e roda o laço | todas |

**Exceções registradas:**

- `core/storage.ts` importa `meta/` (`src/core/storage.ts:13-15`). O próprio arquivo diz que isso não cria ciclo. Ciclos no grafo inteiro não foram verificados com ferramenta: **a confirmar**.
- `audio/temas.ts` e `audio/identidade-sonora.ts` importam `data/musica/` e `data/sons/`. Isso foge da tabela acima: `data/` não importa `audio/`, então não há ciclo. Motivo: a validação de orçamento de fontes precisa compilar a partitura (`src/audio/temas.ts:63`).

## 2. Laço de execução

`src/main.ts`, no HEAD:

- Passo fixo de 1000/60 ms, ou seja, 60 ticks de lógica por segundo (`main.ts:164`, `PASSO`).
- O tempo acumulado é limitado a 100 ms por quadro (`main.ts:175`), para não dar um salto depois de uma aba parada.
- Cada tick chama `entrada.fimDoTick()` (`main.ts:168`, `:181`). Cada quadro de tela chama `ui.draw()` (`main.ts:184`).
- Pausa ao perder o foco ou ocultar a aba: `observarFoco` chama `ui.blur()` (`main.ts:133`).

Fluxo de entrada: teclado, gamepad e toque escrevem em `TeclasVirtuais` (`src/input/teclas.ts`). A luta lê um `InputFrame` (C2) por jogador por tick. A luta gera uma `LeituraLuta` (C3), que o render, a UI e o áudio leem.

Três apresentações congelam o motor **sem** tocar no lock-step, porque a cena da luta não chama `game.update` enquanto elas rodam (`src/ui/cenas/fight.ts`):

- a **entrada dramática** do chefão: `this.entrada.avancar()` no lugar de `game.update` (`fight.ts:414`);
- a **cinemática do especial**: `passoDaCinematica()` e `return` antes de `game.update` (`fight.ts:426`; a chamada do motor está em `fight.ts:434`);
- a **provocação** (balão antes do round, na vitória): ramo próprio do `update` da cena, que não anda o relógio do motor. Ver a seção 13.

## 3. Contratos

Os contratos de tipos ficam em `src/core/contratos.ts`. Quem escreve é o motor (`fight/`). Quem lê são render, UI e áudio.

### C1: manifesto de atlas (versão 2)

Arquivo: `public/assets/lutadores/<id>/atlas.json`. Validação: `src/assets/manifesto.ts` (`validarManifesto`, `manifesto.ts:64`).

- `versao`: `1` ou `2`. A versão 1 (campo `imagem`, uma imagem só) continua aceita.
- `imagens`: de 1 a 8 arquivos (`MAX_PAGINAS = 8`, `manifesto.ts:10`). Só nome de arquivo, sem pasta.
- `tamanho`: `[largura, altura]` de cada página, em px.
- `alturaRef`: altura do `idle0` em px. 410 nos lutadores comuns, 525 no BAATAR, 558 no ZENON (`ferramentas/sprites/lutadores.json`).
- `quadros`: mapa nome da pose para `{ x, y, w, h, ax, p?, rosto?, ponta? }`. `p` é a página, `rosto` e `ponta` são pares `[x, y]` relativos ao canto do quadro.
- `retrato` (opcional): `{ arquivo, recorte }`. Sem ele, o carregador lê o `retrato.json` ao lado.

Exemplo real, `public/assets/lutadores/aminu/atlas.json` (trecho):

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

Situação dos atlas (`public/assets/lutadores/*/atlas.json`, lidos em 2026-10-21 com um script; o número de páginas é o de `imagens`):

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
- `esq` (opcional, `contratos.ts:31`): borda de descida da ESQUIVA. Só vale com `ConfigPartida.esquiva` ligada (`src/fight/game.ts`); desligada, o motor ignora o campo antes de qualquer conta. A direção vem do estado segurado: frente = avanço, trás/neutro/↓/↑ = recuo.

Exemplo de quadro com o especial segurado:

```json
{ "left": false, "right": true, "up": false, "down": false,
  "lp": false, "hp": false, "lk": false, "hk": false, "sp": false, "spSeg": true }
```

### C3: leitura da luta e eventos

Tipo `LeituraLuta` (`src/core/contratos.ts:507`). Campos principais: `fighters`, `projectiles`, `timer`, `round`, `winsNeeded`, `cam`, `phase`, `t`, `tick`, `shake`, `hitstop`, `mode`, `training`, `stage`, `winner`, `matchWinner`, `matchDone`, `perfect` e `events`.

Regras de consumo (comentário de C3 em `contratos.ts`):

1. `tick` só avança quando a luta anda. Durante o hitstop ele congela, junto com as partículas.
2. `events` é esvaziado no começo de cada tick. No tick congelado, fica vazio.
3. A luta não toca áudio nem cria partícula. Só emite evento.
4. Efeitos visuais usam um RNG separado do da lógica (`rngVisual`).

Lista completa dos eventos: `EventoLuta` (`src/core/contratos.ts:339`). Os da chefia:

- `fase-chefe`, com `etapa` `'troca'`, `'cena'` ou `'retomada'`. As etapas `cena` e `retomada` são emitidas em `src/fight/game.ts:490` e `:504`; a `troca` sai na troca de barra, antes do `hit` do mesmo tick. Antes de ser `'cena'`, a etapa se chamava `'danca'` (a Dança da Águia do BAATAR).
- `hit` e `block` têm `dreno?: number`, só quando houve dreno. Ausente = nenhum dreno.

### C4: armazenamento local

Implementação em `src/core/storage.ts`. Chaves em `src/core/contratos.ts:95-104`.

| Chave | Formato | Papel |
|---|---|---|
| `inno-fighters-v1` (`CHAVE_STORAGE`, `contratos.ts:95`) | `{ v: 1, s, hi }` | formato anterior. Continua lido na migração |
| `sakura-fighters-v4` (`CHAVE_STORAGE_LEGADA`, `contratos.ts:97`) | `{ s, hi }` (formato do protótipo) | legado. Migrado; removido só depois de a v2 ser gravada |
| `inno-fighters-v2` (`CHAVE_STORAGE_V2`, `contratos.ts:104`) | `{ v: 2, s, hi, prog }` | chave atual |
| `inno-fighters-v2-quebrada` (`CHAVE_STORAGE_V2_QUEBRADA`, `storage.ts:168`) | texto cru | cópia de uma v2 ilegível, guardada antes de ser substituída |

**Migração** (`carregarDadosV2`, `src/core/storage.ts:259`), nesta ordem:

1. Se a v2 é válida, usa. O recorde vira `max(v2.hi, v1.hi)`. O legado é removido.
2. Senão, se a v1 é válida, monta `{ s, hi }` com progresso vazio e grava a v2.
3. Senão, se há legado, faz o mesmo com ele.
4. Senão, usa os padrões e não grava nada.

**v2 de build mais novo** (`v > 2`, `storage.ts:200`): é lida em memória, mas `salvarDadosV2` (`storage.ts:223`) recusa gravar e retorna `false`. A UI mostra o aviso "Progresso não salvo neste aparelho" (`src/ui/persistencia.ts:6`, `MSG_NAO_SALVO`).

**Ids desconhecidos e saneamento do progresso** (`sanearProgresso`, `src/meta/progresso.ts`):

- Id fora do roster com forma de id vai para `prog.desconhecidos`, até `MAX_IDS_DESCONHECIDOS = 32` (`progresso.ts:130`). Não é usado, mas é regravado.
- Id que passou a existir no roster é promovido a `desbloqueados`.
- Iniciais nunca são guardados.
- `chefesDerrotados` aceita só ids com forma de id, sem repetição, até `MAX_CHEFES_DERROTADOS = 16` (`progresso.ts:27`). Não exige que o id esteja no roster. Um guardião derrotado entra na lista; `CHEFOES_SO_POR_DERROTA = ['zenon']` (`progresso.ts:21`) são os que se liberam só por derrota.
- Lixo (não é texto, forma inválida, excesso) é descartado.

**Saneamento das configurações** (`sanearConfiguracoes`, `storage.ts:50`): `rounds` e `time` e `diff` aceitam só os valores que a UI oferece. `cinematica` aceita só `completa`, `curta` ou `desligada`. `provocacoes` aceita só `ligadas` ou `desligadas` (`src/core/storage.ts:65-67`). Ausente = padrão (`PROVOCACOES_PADRAO = 'ligadas'`, `contratos.ts:62`). É campo aditivo da v2, sem bump de versão.

**Recorde:** inteiro entre 0 e `TETO_RECORDE = 99_999_999` (`storage.ts:37`). Fora disso vira 0.

Testes: `tests/unit/storage.test.ts`, `tests/unit/storage-v2.test.ts`, `tests/unit/progresso.test.ts`, `tests/unit/provocacoes-storage.test.ts`.

## 4. Carga sob demanda

- **Boot:** lê o `atlas.json` de todos os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, que chama `carregarManifestos`, `src/assets/carregador.ts:248`). Se um falta, o boot falha (ver `docs/como-adicionar-um-lutador.md`, passo 8).
- **Retratos:** todos, no boot.
- **Imagens fixas:** a vitrine `VITRINE` (`src/data/lutadores/index.ts:41`, igual aos iniciais) e o cenário do título.
- **`?precarga=minima`** (só em `npm run dev`, `src/main.ts:137`): não carrega atlas no boot.
- **Demais:** `GerenciadorDeArte.garantir` (`src/assets/gerenciador.ts:129`). Há um limite de atlas não fixos na memória (constante do próprio gerenciador; o valor de partida é 3). Sai o menos recente.
- **Atlas sem imagem ainda:** o lutador some do desenho até a arte chegar.

O ZENON segue a mesma regra: nenhuma página `zenon/atlas-*.webp` é baixada no boot, na seleção nem antes da 5ª luta do Arcade, quando o Arcade as pré-busca (medido por Lyra, `tests/e2e/arte-sob-demanda.spec.ts`).

## 5. Determinismo

**Gerador:** mulberry32 (`src/core/rng.ts:22`, `criarRng`). Mesma semente, mesma sequência.

**Semente:** `?seed=N` na URL (`src/main.ts:46`, `lerSemente`), ou valor de `crypto.getRandomValues` (`src/core/rng.ts:43`, `sementeAleatoria`). `?seed=N` vale também em produção.

**Geradores separados** (`src/main.ts:68-70`, `:89`, `:120-121`):

- lógica (CPU, sorteios da luta): `semente` (`main.ts:68`)
- visual (partículas, poeira, pétalas): `semente + 1`
- UI (escada do Arcade): `semente + 2`
- áudio: `semente + 3`
- sorteio da seleção (casa aleatória e roleta): `semente + 4`
- sorteio das falas das provocações: `semente + 5` (`Contexto.sorteioDeFalas`). Fica fora do RNG da luta: a sequência do motor não muda.

A cinemática e a entrada do chefão não chamam `game.update`, então não consomem o RNG da luta (`fight.ts:426-434`). Para a entrada, a prova relatada pela Lyra é: teste de unidade com foto do motor idêntica a uma luta sem entrada, depois de 600 ticks, e medição no navegador (tick, `t`, fase e RNG iguais em 30 quadros). **A confirmar:** a medição de navegador não está em teste automatizado.

**Teste de regressão:** `tests/unit/fight.test.ts:199` (mesma semente, mesmo resultado) e `:203` (CPU contra CPU, 6000 ticks, semente 42, comparado com o snapshot).

**Fidelidade ao protótipo:**

- Referência: `prototipo/inno-fighters-artefato.html` (`tests/unit/_prototipo.ts:9`). Os testes de fidelidade dependem do arquivo.
- Oráculo do HAYATO e da MIN-JI: o atlas original (v1), em `tests/fixtures/atlas-prototipo/<id>/`, porque a arte de produção foi trocada.
- Áudio: `tests/fixtures/audio-sys-antes-do-chefe.ts` é a cópia congelada do `AudioSys` anterior à trilha do chefão. O teste compara tom e ruído de `fight` e `menu` com ela.
- E2E de fidelidade pixel a pixel: `tests/e2e/fidelidade-prototipo.spec.ts` e `tests/e2e/fidelidade-ui.spec.ts`.

## 6. Luta de chefão

O chefão do ARCADE tem duas formas, que convivem no código:

- **ZENON (o Anfitrião):** `CHEFE = 'zenon'` (`src/meta/regras.ts:19`). Duas barras, cena da fase 2, entrada dramática. Fora da luta de chefe, é jogável comum.
- **Guardiões (AMINU, CENTELLA, CAMILLE, NILA, BAATAR):** cada um tem um bloco `chefe` com duas barras (metade da vida cada), cena da fase 2 com poses que o atlas já tem, `bonusVitoria` e `danoRecebido`. Fora da luta de chefe, são lutadores comuns.

**Qual chefão aparece no ARCADE depende da chave `Regras.chefesDaFila`:**

| Estado | `chefesDaFila` | Chefão do ARCADE | Situação |
|---|---|---|---|
| HEAD `73f0074` | `false` (`src/meta/regras.ts:36`) | sempre o ZENON | o código dos guardiões existe, mas a escada não os usa |
| Árvore de trabalho | `true` (**não commitado**) | o próximo guardião da fila; o ZENON só com os 5 liberados | a UI da Lyra (L1/E1) segue a fila |

Com `chefesDaFila` `false`, `chefeDoArcade` devolve o `regras.chefe` (o ZENON) e a vitória usa o formato antigo `{ derrotouChefe }`. A chave é de rollback e de `?expansao=4`.

### 6.1 Dados

- `ConfigChefe` (`src/data/tipos.ts`): `barras`, `hpPorBarra`, `fichaFase1?`, `fichaFase2?`, `cena: CenaDef`, `bonusVitoria`, `trilha?`, `danoRecebido?`. `fichaFase1` e `fichaFase2` são opcionais desde a fase R1; o guardião não tem ficha de fase.
- `danoRecebido` (`src/data/tipos.ts:119`): multiplicador do dano que a **vida** do chefe sofre. `montar` recusa valores fora de `0,60` a `1` (`DANO_RECEBIDO_MIN = 0.6`, `src/data/montar.ts:98`; validação em `montar.ts:101`). É a alavanca de dureza: não muda a ficha, o ataque nem a IA. Calibrado pelo harness (seção 8).
- `CenaDef` (`src/data/tipos.ts`): `{ duracao, poses }`. A pose do tick `t` é `poseDaCena(cena, t)` (`src/data/cena.ts:8`); a última segura até o fim.
- `validarCena` (`src/data/cena.ts:15`) é chamada em `src/data/montar.ts:117`: duração inteira de 1 a 600 e de 1 a 8 nomes de pose. Dado inválido falha no boot.
- `Golpe.drenaEnergia` (`{ acerto, defesa }`): validado em `src/data/montar.ts`. Recusa projétil, `hits > 1`, `throw`/`agarrao` e números fora de `0 <= defesa <= acerto <= 100`.
- `LutadorDef.anim.throw`: arte própria do agarrão comum. Sem ela, vale a animação base (`src/data/anim.ts`).
- `LutadorDef.alturaEmPe`: altura da hurtbox em pé, em múltiplo da escala. No ZENON, `1,22` (`zenon.ts:139`).
- `LutadorDef.alturaDoProjetil`: altura, em px, de onde o projétil nasce. ZENON: `175` (`zenon.ts:141`).
- Ficha: `FichaDef` é parcial e sobrescreve a base. Atenção: `mods` é **raso por golpe** (armadilha 1 do passo 6b de `docs/como-adicionar-um-lutador.md`).

Números do ZENON (`src/data/lutadores/zenon.ts`, HEAD):

| Campo | Valor | Linha |
|---|---|---|
| `scale` | 1,32 | `zenon.ts:133` |
| `pow`, `hp` | 1,0; 100 | `zenon.ts:129` |
| `alturaEmPe` | 1,22 | `zenon.ts:139` |
| `alturaDoProjetil` | 175 | `zenon.ts:141` |
| `chefe` | 2 barras de 50; cena de 90 ticks (`cena0`, `cena1`, `cena2`); bônus 5000; `trilha: 'chefe'`; `danoRecebido: 0.8` | `zenon.ts:146-156` |
| dreno do TRIBUTO | 12/6 no jogável; 20/10 na ficha do chefe | `zenon.ts:46` (e `:51`, `:63`) |
| armadura da fase 2 | `armor: 1` em `hp`, `hk` e `chp` da ficha `chefe2` | `zenon.ts:112` |

Números dos guardiões (`src/data/lutadores/*.ts`, HEAD; cada um tem `chefe: { barras: 2, hpPorBarra, cena, bonusVitoria, danoRecebido }`):

| Guardião | `hpPorBarra` | `danoRecebido` | Pose da cena da fase 2 |
|---|---|---|---|
| AMINU | 56 | 0,925 (`aminu.ts:71`) | `sa1`, `sa3` (carrega o MASHI e solta) |
| CENTELLA | 48 | 0,875 | `win` |
| CAMILLE | 49 | 0,925 | `block` |
| NILA | 54 | 0,875 (`nila.ts:127`) | `crouch` |
| BAATAR | 46 | 0,85 | `devekh2`, `win` |

### 6.2 Motor

- `danoNoDefensor` (`src/fight/game.ts:287`): multiplica o dano pelo `danoRecebido` do chefe. Ausente ou `1` devolve o número sem multiplicar. É chamado nos pontos de dano (arremesso, raspão de bloqueio, armadura e golpe) depois de todas as contas. O fator mora em `cfgChefe` do lutador, não na ficha: a NILA troca de postura (VADIVU) e o fator fica.
- Dreno: `cobrarDreno` (`src/fight/game.ts:886`). `k = min(rival.en, valor)`, `rival.en -= k`, `atacante.en = min(100, atacante.en + k)`. Roda só nos ramos de acerto e de bloqueio, depois dos ganhos normais do ramo. Armadura que absorve, PARADE, esquiva e `untouchable` retornam antes, então não drenam.
- Fases: a troca de barra não é KO: `resolverVidaZerada` (`game.ts:903`) devolve `false` quando sobra barra. Cena da fase 2: `cenaPendente` (`game.ts:479`); retomada com a ficha da fase 2 quando há.
- Ficha da fase 2 opcional: `Fighter.virarChefe` só valida e aplica `fichaFase2` se ela existe. Um guardião troca de ficha só se a própria mecânica pedir (a NILA, por exemplo).
- Alterados em `955e720`: `src/fight/game.ts` e `src/fight/fighter.ts`, só nas linhas do `danoRecebido` e da ficha opcional. Nenhuma regra de luta dos lutadores comuns mudou.

### 6.3 Render

- Rampa da fase 2: `rampaDaFase2` (`src/render/aura-chefe.ts:26`) vem do **estado da luta**, não de evento. No HEAD, ela vale 1 quando `f.ficha === cfg.fichaFase2` (`aura-chefe.ts:30`). Para os guardiões, `fichaFase2` não existe e a condição nunca vale: **a aura da fase 2 dos guardiões não acende no HEAD**. **(não commitado)** A árvore de trabalho corrige isso: sem `fichaFase2`, a fase 2 é a barra (`barras < barrasMax`) e a rampa vale 1 desde a troca. Chamada em `src/render/mundo.ts:71`.
- Aura: `desenharAuraChefe` (`aura-chefe.ts:43`), 4 primitivas, zero chamadas quando a rampa é 0.
- Arena da fase 2: `SOBREPOSICOES_DE_CENARIO` (`src/render/cenario.ts:48`), com `gr` em `src/render/arena-gr.ts`. Usada por `desenharMundo` (`mundo.ts:72`). Véu do céu, braseiros em púrpura e raios ocasionais; não usa o RNG da luta.
- **(não commitado)** Véu de fase 2 (`src/render/veu-de-fase2.ts`) e roteiros de entrada por lutador (`src/render/roteiros-de-entrada.ts`, `efeitos-de-entrada.ts`): ver seção 6.4.
- Projétil do SELO: estilo `anel` (`src/render/projetil-anel.ts`) e estilo E12 (`src/render/estilos-especiais.ts`). Dreno visível: `src/render/moedas-dreno.ts`, a partir de `ev.dreno`.
- Apresentação: `APRESENTACAO` (`src/render/apresentacao-lutadores.ts:39`) reúne a pose de entrada e de vitória, as falas, o aviso do VS e o cartão da entrada. Só desenho: nada disso vai ao motor. **(não commitado)** Os guardiões entram por `doGuardiao` (`src/render/apresentacao-lutadores.ts`), que lança erro se faltar texto ou roteiro (boot).
- Entrada dramática: `src/render/entrada-chefe.ts`. COMPLETA = 270 ticks, 4,5 s (`DURACAO_ENTRADA_COMPLETA`, `:24`); CURTA = 60 ticks. `PULO_VALE_A_PARTIR_DE = 10` (`:27`) e `SAIDA_AO_PULAR = 6` (`:29`). Linha do tempo pura: `linhaDaEntrada` (`:72`). Escolha do modo: `modoDaEntrada` (`src/ui/cenas/fight.ts:148`).
- **(não commitado)** Roteiro por lutador: `roteiroDe(id)` e `ROTEIROS_DOS_GUARDIOES` (`src/render/roteiros-de-entrada.ts:56`). Os 5 guardiões têm batidas de pose, zoom, deslocamento, efeito e som. O ZENON mantém o roteiro dele.
- Cinemática do especial: `src/render/cinematica.ts`. COMPLETA = 48 ticks (`DURACAO_COMPLETA`, `:27`), CURTA = 20 ticks (`DURACAO_CURTA`, `:28`), saída ao pular em no máximo 6 ticks. `modoDaCinematica` (`:49`) devolve `null` para DESLIGADA ou com `Regras.cinematica` desligada.
- Escala na vitrine: `escalaDeVitrine` (`src/ui/personagens.ts:27`) encolhe só quem passa de `ESCALA_MAXIMA_DE_VITRINE = 1.1` (`personagens.ts:24`). O BAATAR (1,28) e o ZENON (1,32) são encolhidos na vitrine, não no dado.

### 6.4 Áudio

- Trilhas: `TRILHAS` (`src/audio/audio-sys.ts:103`). `fight` (150 bpm, 16 passos por compasso, 4 compassos), `menu` (92 bpm) e `chefe` (138 bpm, valsa em 3/4).
- `playChefe` (`audio-sys.ts:755`): Ré frígio, bordão e bumbo no passo 0; órgão em quintas; prato; cravo em 96 passos de melodia. Tudo determinístico em `step`, sem `Math.random`.
- Fase 2: `AudioSys.musicaDaFase(2)` (`audio-sys.ts:666`): bumbo também nos tempos 2 e 3, órgão uma oitava abaixo, andamento +12%. Só vira no início do próximo compasso.
- Gatilho: o evento `fase-chefe` com `etapa === 'cena'` chama `introWhoosh` e `musicaDaFase(2)` (`src/audio/eventos.ts:67-70`).
- `startMusic` (`audio-sys.ts:643`): sempre volta à fase 1 no próximo compasso. No HEAD, a trilha da luta vem de `cfgChefe.trilha ?? 'fight'` (`src/ui/cenas/fight.ts:267`).
- Temas musicais por lutador e identidade sonora: seções 14 e 15. Nenhum dos dois está ligado ao jogo hoje.

### 6.5 Grade de 10 e casa de honra

- `temCasaDeHonra(n)` (`src/ui/grade.ts:19`): verdadeiro só com 10 casas (9 regulares + o chefão).
- `ordemDaGrade` (`grade.ts:28`): os 9 regulares na ordem do roster; o chefão por último, no índice 9.
- `CASA_DE_HONRA` (`grade.ts:56`): `{ x: 404, y: 356, w: 204, h: 44 }` no HEAD (encolheu de 256 px para 204 px em `ac57a80`, para caber a casa aleatória). Oculta = "???" e "O ANFITRIÃO". Liberada = rosto, nome, título e "CHEFÃO".
- Casa aleatória (`temCasaAleatoria`, `grade.ts:63`): a casa de sorteio fica na faixa de baixo, à esquerda da casa de honra, com sorteio de RNG próprio (`semente + 4`), só entre liberados.
- `moverNaGrade` (`grade.ts:103`): ↓ da 3ª linha vai para a honra; ↑ da honra vai para a casa 7; ↑ da 1ª linha vai para a honra; ↓ da honra vai para a casa 1; ←/→ na honra não mudam.
- Área de toque da honra: `retanguloDeToque` (`grade.ts:88`), com folga extra embaixo.

### 6.6 Esquiva

- Parâmetros de partida (`src/data/esquiva.ts`, `ESQUIVA_PADRAO`, `:28`): custo 20 de energia, buffer de 6 ticks para o botão. Trás: 22 ticks, invulnerável de 0 a 14, 120 px. Frente: 26 ticks, invulnerável de 3 a 19, 150 px. Ajuste pelo harness: `npm run balanco`.
- Regra ligada em `src/meta/regras.ts` (`esquiva: true`). Quando desligada, `body.sem-esquiva` esconde o botão ESQ do toque (`src/input/toque.css:38`).
- Entradas: teclado P1 `n`, P2 `o` (`src/input/mapa.ts:22` e `:35`); gamepad L1/L2 (`mapa.ts:56`); toque, botão ESQ (`index.html:23`).
- Apresentação: `src/render/esquiva.ts` (corpo fantasma e rastro só na janela invulnerável).

### 6.7 Fala do chefão: comportamento real

`falaDoChefe` (`src/render/apresentacao-lutadores.ts:97`) devolve:

- `fase2` durante `cena-chefe`;
- **vitória** só no `matchend`, quando o chefão vence a luta (não no `roundend`);
- **derrota** só no KO que fecha a luta (o rival chega a `winsNeeded` com este round) ou no `matchend` perdido por KO (vida zerada). Perder por tempo não fala; `roundend` nunca fala.

Essa é a decisão 6 de `PROGRESSO.md` ("derrota do chefão só no KO final; vitória só no `matchend`"). O código do HEAD já a segue. A versão anterior deste documento descrevia o comportamento antigo (fala em `roundend`); está corrigida.

### 6.8 Como o chefão do ARCADE é escolhido

- `chefeDoArcade(c1, prog, regras)` (`src/meta/chefes.ts:21`): com `chefesDaFila` `false`, devolve `regras.chefe` (ou `null` se `c1` é o próprio chefe). Com `true`, devolve o primeiro guardião da fila (`regras.fila`) bloqueado e diferente de `c1`; se a fila acabou, devolve o ZENON; se `c1` é o ZENON com a fila esgotada, devolve `null` (sem luta de chefe).
- `ehChefeFinal(id, regras)` (`chefes.ts:30`): o chefão é o final (ZENON) e não um guardião.
- `desafiantesDoChefe(regras)` (`chefes.ts:39`): para o harness e os testes; cada chefão e o elenco que pode enfrentá-lo naquele ponto da progressão.
- `aplicarVitoriaArcade(prog, vitoria, regras)` (`src/meta/progresso.ts:68`): aceita `{ chefe: id | null }` (formato novo, com `chefesDaFila`: libera só o chefão derrotado, sem avançar a fila sozinho) ou `{ derrotouChefe }` (formato antigo). O id da etapa é gravado no começo do ARCADE; não é recalculado no fim.
- Nenhum campo novo em `Progresso`: o chefão da vez é derivado de `desbloqueados`. Save v2 sem mudança.

## 7. Tela e escala

- Resolução lógica: 960x540 (`src/core/constantes.ts:2`, `LARGURA = 960`).
- Buffer do canvas: 1920x1080 (`index.html`), que é 2x a lógica (`RS = 2`, `src/render/tela.ts:6`).
- Escala na tela: maior retângulo 16:9 que cabe na janela (letterbox), aplicado por CSS (`src/platform/escala.ts`).
- Controles: `src/input/mapa.ts`. Lista para o jogador: `README.md`, seção Controles.

## 8. Balanceamento (harness)

- Comando: `npm run balanco -- [--rapido | --completo] [opções]` (`ferramentas/balanco/cli.mjs`, ajuda com `--ajuda`).
- `--completo --esquiva` (100 sementes por combinação, NORMAL e DIFÍCIL) grava a referência de PRODUÇÃO em `docs/balanco/`. `--completo` sem a flag grava a rodada sem esquiva em `docs/balanco/sem-esquiva/`. `docs/balanco/README.md` diz qual é qual.
- **A referência versionada em `docs/balanco/` é a rodada COM esquiva** (`esquiva: true` em `src/meta/regras.ts`): versão de dados `f6b9952cee5e`, hash da rodada `957b8416d75bf060`, hash das lutas regulares `f420ce928e06b304` (tem de ser igual antes e depois de qualquer ajuste de chefão). 25 800 lutas, 0 travadas.
- Metas dos chefões: rampa de NORMAL de AMINU (26-30%) a ZENON (15-19%), com os intermediários; DIFÍCIL = centro do NORMAL x 0,575, ± 3 pontos. Acompanham: KO >= 90%, duração <= 75 s (NORMAL) e 90 s (DIFÍCIL), 0 travadas.

Resultado da rodada de produção (`docs/balanco/resultados.md`; "jogador vence" = a CPU do desafiante vence o chefão; aproximação CPU x CPU, não uma pessoa):

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

- Harness: `ferramentas/balanco/` (cada luta monta a própria `Game` em memória; nada toca o estado do jogo). Meta por chefão: `metaDoChefe` (`ferramentas/balanco/chefoes.ts:47`), com `CENTRO_PRIMEIRO = 0.28` (`:41`), `CENTRO_ULTIMO = 0.17` e `RAZAO_DIFICIL = 0.575` (`:43`).

## 9. Política de segurança de conteúdo (CSP)

Definição: `POLITICA_CSP` em `vite.config.ts:19`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:
```

- Entra como `<meta http-equiv>` só no build (plugin `cspSoNoBuild`, `vite.config.ts:30`, usado em `vite.config.ts:42`). O dev server injeta scripts inline, então não recebe a CSP.
- Exceções documentadas em `vite.config.ts` (cabeçalho do arquivo): `style-src 'unsafe-inline'` (estilo do `index.html` e do `<pre id="err">`); `img-src data: blob:`, `media-src blob:` e `connect-src 'self'`, que hoje não são usados e ficam como folga.
- A meta **não** cobre `frame-ancestors`, `report-uri` nem `sandbox`. Esses só funcionam como cabeçalho HTTP.
- Teste: `tests/e2e-build/csp.spec.ts`, contra o build (`npm run test:e2e:build`).
- O Pages não permite definir cabeçalhos. No EasyPanel, a política deve virar cabeçalho.

## 10. Build e publicação

- `npm run build` = `tsc --noEmit && vite build` (`package.json`). Gera `dist/` com sourcemap.
- O mapa de código-fonte fica público no build. A decisão do dono é trocar para `sourcemap: 'hidden'` ao privar o repositório (`PROGRESSO.md`, seção do repositório público). Ainda não foi feito.
- Pages: `.github/workflows/pages.yml`, temporário. Ver `README.md`.

## 11. Ferramentas

| Arquivo | Função | Estado (2026-10-21) |
|---|---|---|
| `ferramentas/extrair-prototipo.mjs` | tira atlas e cenários do protótipo para `public/assets` | usado na F1 |
| `ferramentas/sprites/` | pipeline de folhas para atlas C1 v2. `npm run sprites -- <id>` | executa: sem argumento, imprime o uso. `npm run sprites -- zenon` não foi rodado nesta passada (grava em `sprites-gerados/` e `arte-fonte/`) |
| `ferramentas/balanco/` | harness de simulação (`npm run balanco`) | commitado; `docs/balanco/` é a rodada de produção, com esquiva (seção 8). Inclui `chefoes.ts` (rampa e pares de chefão) |
| `ferramentas/gerar-retratos.mjs` | retrato de cada lutador a partir do atlas (`--so <id>`, `--verificar`) | funcional, sem script npm |
| `ferramentas/converter-cenarios.mjs` | cenários da arte-fonte para WebP 1920x1080. `--so <sigla>` converte só alguns | fontes em `FONTES` (`converter-cenarios.mjs:13`) |
| `ferramentas/prompts/montar-prompts.mjs` | gera `docs/prompts/` a partir de `docs/prompts-arte.md` | não reconferido nesta passada |

## 12. Pendências técnicas (verificadas em 2026-10-21)

- **`poseDaCena` existe em uma cópia só** (`src/data/cena.ts:8`), usada pelo motor (`src/fight/fighter.ts:1051`) e pelo render (`apresentacao-lutadores.ts:80`). A cópia que havia no render foi removida no HEAD.
- **Comentário velho:** `src/fight/game.ts:900` ainda diz "a Dança da Águia fica pendente". Hoje é a cena da fase 2.
- **DESLIGADA não desliga a entrada do chefão:** `modoDaEntrada` (`src/ui/cenas/fight.ts:148`) devolve `'curta'` quando a preferência é `desligada`. É decisão de 2026-10-21 (item 7 de "Decididas", em `PROGRESSO.md`): a entrada fica em CURTA, não some.
- **Tecla H:** alterna `game.debug` (`src/ui/cenas/fight.ts:571`). A tela "Como jogar" não cita mais a H. O desenho das caixas de colisão nesse modo: **a confirmar**.
- **Prompts de arte:** `docs/prompts-arte.md` ainda diz "Gemini" no corpo, mas a nota do topo manda ler "Runway" em todo lugar onde aparece "Gemini".
- **Chefões na árvore de trabalho:** `chefesDaFila = true`, o `fim.ts` novo e a UI da Lyra não estão commitados. Ver a tabela da seção 6.
- **Sons e temas:** ligados a nada no jogo (seções 14 e 15).

## 13. Provocação (balão antes do round e na vitória)

Spec: `docs/spec-provocacao-prerround-e-vitoria.md`. A seção "Decisões do dono" no topo da spec vale por cima do resto. Commit: `bfa3347` (incluído em `0db7120..73f0074`).

**Onde mora:**

- `src/data/provocacoes.ts`: tipos, validação, escolha da fala (`sortearFala`, `quemFalaNaRodada`, `listaDeVitoria`). Valida no import (`exigirFalasValidas`, `:197`). `main.ts:11` importa o módulo para isso, senão o boot não falha e o tree-shaking tira o módulo.
- `src/data/provocacoes.pt-BR.ts`: os 232 textos. `TEXTOS_PROVISORIOS = false` (`:14`). **É a fonte de verdade**; o `docs/textos-provocacao.md` é só registro de autoria.
- `src/render/provocacao.ts`: funções puras da linha do tempo (`montarRoteiro`, `linhaDaProvocacao`, `modoDaProvocacao`, `provocacaoLigada`), e a classe `Provocacao`, que tem a mesma API da entrada do chefão (`iniciar / ativa / avancar / pular / zerar / desenhar`).
- `src/render/balao.ts`: desenho do balão, quebra por medida, escolha de plano (3 larguras de linha: 372, 300, 240 px).
- `src/ui/cenas/fight.ts`: gatilhos (`comecarProvocacao`, `:176`, chamado em `:420` no round 1, `:457` na vitória e `:472` no round 2+), pular (ataque, ENTER ou toque), música a 50% durante o balão, legenda do chefão suprimida quando o balão vence (linhas do HEAD).

**Regras (o que o código faz):**

- **Ligada?** `provocacaoLigada` (`src/render/provocacao.ts:94`) exclui: `?expansao=4` (`regras.cinematica` falso), a opção PROVOCAÇÕES desligada, TREINO, CPU x CPU (só nos testes) e, **só no pré-round**, a luta de chefão (a entrada dramática do chefão é o round 1). VERSUS de 2 jogadores **tem** provocação (decisão do dono). Na vitória, vale também no chefão.
- **Opção PROVOCAÇÕES:** linha própria na tela de Opções (`src/ui/cenas/options.ts:93`), com `LIGADAS`/`DESLIGADAS`. Independente da cinemática do especial. O padrão é ligada (ausência do campo).
- **Modo:** `modoDaProvocacao` (`provocacao.ts:110`). Round 1: COMPLETA na primeira vez do confronto e CURTA nas repetições (continue, reinício, revanche). Round 2+ e vitória: COMPLETA com a cinemática COMPLETA, CURTA nas demais.
- **Movimento reduzido** vale por cima do modo: sem andada, sem zoom, sem pop. O texto entra inteiro com fade.
- **Round 1 (COMPLETA):** o P1 fala primeiro e o P2 responde. A andada dura 40 ticks. A duração total depende do texto: com textos curtos fica perto de 4,8 s (medido pela Íris; o teste e2e exige pelo menos 4 s). A spec estimava 5 a 6,5 s para textos mais longos.
- **Round 2+:** um balão de 1 linha de quem perdeu o round (`quemFalaNaRodada`, `src/data/provocacoes.ts:340`); em round decisivo (os dois a uma vitória do fim: 1 a 1 em melhor de 3), a fala é a de `decisivo`.
- **Vitória:** balão do vencedor (`provocacao.ts:207-216`). O ZENON vencendo usa o balão, sem a legenda antiga. O push-in vai a 1,08.
- **Pular:** ataque de um humano, ENTER ou toque. Antes do tick 10 (round) ou do 24 (vitória), o pulo não vale.

**Sorteio das falas:** `Contexto.sorteioDeFalas` com semente + 5 (`src/main.ts:121`). Fora do RNG da luta, então a sequência do motor não muda. A memória de "última fala" é por sessão da cena (não repete a última do mesmo lutador quando a lista tem mais de uma).

**Prova do comportamento:** os testes de unidade `p2-provocacao-*`, `p2-balao`, `provocacoes-*` e os e2e `provocacao.spec.ts` e `provocacao-p4*.spec.ts` (em `tests/`). A medição em pixels (A/B com e sem balão, no handoff da Lyra): rosto coberto em 0 px² nos cenários de abertura e de vitória; na CURTA há cantos de balão de 10 a 44 px² (a Íris os tratou como informativos). Não medido em aparelho real.

**Não feito:** arte nova de `provoca0/1` (usa `win` como alias); escuta do som do balão (blip a cada 3 letras, arpejo); revisão de nativo dos termos estrangeiros (`docs/textos-provocacao.md` §3).

## 14. Sons por lutador (identidade sonora)

Spec: `docs/spec-sons-por-lutador.md`. Handoff da Vega: `docs/handoff-vega-sons.md`. Commit: `59f3b75`.

**Estado: pronto, desligado.** `IDENTIDADE_SONORA = false` (`src/audio/identidade-sonora.ts:22`). O jogo soa como antes. A ligação em `fight.ts` (S4) ainda não foi feita: a luta chama `reagirAosEventos` (`src/ui/cenas/fight.ts:437`), não `reagirComIdentidade` (`identidade-sonora.ts:315`). A escuta do dono (S5) não aconteceu.

**O que existe:**

- Primitiva de voz: `vozFormante` (`src/audio/sintese-voz.ts`), com garganta por lutador (troca de voz em ~15 ms, uma voz por lutador, KO não deixa entrar outra) e orçamento de fontes (`src/audio/orcamento-sonoro.ts`: 12 fontes por plano, 32 simultâneas).
- Dados: 10 perfis vocais (`src/data/sons/perfis-vocais.ts`, um por lutador, mais o da SARPA), gritos (`gritos.ts`, `GRITOS_LEXICAIS = true`, `:130`: palavras reais marcadas "(rev.)" pedem revisão de nativo), calibração de volume (`calibracao.ts`) e **33 assinaturas** dos especiais (`assinaturas.ts`), uma por entrada da tabela de apresentação.
- Validação: `exigirSonsValidos` (`src/data/sons/validar.ts:156`) é chamada no import de `src/data/sons/index.ts:14`. **Hoje nenhum código do jogo importa esse módulo** (só `identidade-sonora.ts`, que não é chamado). Então um lutador sem voz **não derruba o boot hoje**. Isso passa a valer quando a S4 ligar `reagirComIdentidade`. A validação roda quando o módulo é carregado, não no tempo de jogo.

**Régua (como provar que os sons são diferentes sem ouvir):** `tests/support/regua-sons.ts`, congelada em 2026-10-21. Limiares: `TAU = 1,5` entre lutadores, `TAU_INTRA = 1,0`, `TAU_FAMILIA = 0,6`, `TAU_VARIACAO = 0,4`, `POSITIVO_MIN = 2,15`, `F0_REFERENCIA_VOZ = 175`. Pisos de hoje (regressão R5): `hurt 0,67`, `special 0,96`, `ko 0,83`.

**Números do handoff (régua congelada):** os pares de voz mais próximos ficam acima do limiar (ex.: WEI LONG x MIN-JI 1,68 para dano leve, limiar 1,5). Dois pontos não passam, e a Vega registrou por escrito: R6 com o bloco de tom `P` (10 de 180 variações acima de 0,4) e R7 espelho (S entre 0,14 e 0,40 contra o piso 0,3). **Decisão pendente: baixar o piso do R7 ou aumentar o espelho.**

**Correções da régua depois do congelamento** (aprovadas pela Íris, conforme o registro dela; nenhum limiar mudou): (1) o estimador de tom (`P`) passou a usar pente de 5 harmônicos, 70-650 Hz (segundo o handoff da Vega), em vez de escolher a subharmônica mais baixa; (2) o início do oscilador no motor offline cai no primeiro quadro >= o instante. Efeito: **R5 não muda** (pisos 0,67 / 0,96 / 0,83, positivo 2,15), mas **o S0b passou de 2,30 para 3,19**. Isso precisa de confirmação formal da Íris.

**Como criar a voz de um lutador novo:** ver `docs/como-adicionar-um-lutador.md`, seção "Voz e sons".

## 14b. Temas musicais por lutador

Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §3. Handoff da Vega: `docs/handoff-vega-temas.md`. Commit: `73f0074`.

**Estado: pronto, desligado.** `TEMAS_POR_LUTADOR = false` (`src/audio/temas.ts:18`): `trilhaDaLuta` devolve `'fight'` (ou `'chefe'` no chefão com `trilha`). O jogo toca a música de hoje. Ninguém chama `trilhaDaLuta` nem `playTema` na UI: a troca em `fight.ts:267` ainda usa a lógica antiga (T3 pendente). `Regras.temasMusicais` está `true` em `REGRAS_PADRAO` (`src/meta/regras.ts:37`), mas não tem leitor fora do `trilhaDaLuta`.

**O que existe:**

- Dados: 9 temas em `src/data/musica/temas/<id>.ts`, um por lutador jogável (AMINU, BAATAR, CAIO, CAMILLE, CENTELLA, HAYATO, MIN-JI, NILA, WEI LONG). O ZENON é `'chefe'` (a valsa de hoje). `TEMAS` (`src/data/musica/temas.ts:16`) tem `Record<IdLutador, TemaDef | 'chefe'>`: lutador sem entrada não compila.
- Validação no boot: `exigirTemasValidos` (`src/data/musica/validar.ts:225`), chamada no import de `src/data/musica/index.ts`. O boot sobe com ela porque `audio-sys.ts` importa `temas.ts`, que importa o módulo. Os limites estão em `LIMITES_MUSICA` (`validar.ts:12`): laço de 10 a 21 s, bpm de 60 a 300, etc.
- Orçamento de fontes: `validarOrcamentoDosTemas` (`src/audio/temas.ts:63`, chamada em `:76`). Teto de **8 fontes novas por passo** (`FONTES_NOVAS_POR_PASSO_MAX`, `:56`) e **15 fontes ativas** (`FONTES_ATIVAS_MAX`, `:57`).
- Sequenciador: `partituraDoPasso` e `partituraDaTroca` (`src/audio/partitura.ts`), `AudioSys.playTema` (`src/audio/audio-sys.ts:713`), com a fase 2 que só vira no início do compasso seguinte.
- Régua musical: `tests/support/regua-musica.ts` (congelada; limiares `τM 0,4825`, `τR 0,3482`, `τT 3,413`). Distinção medida em 65 pares: 65 de 65 passam.

**Como criar um tema:** ver `docs/como-adicionar-um-lutador.md`, seção "Tema musical".

## 15. Testes de arquitetura que guardam estas regras

- `tests/unit/chefoes-r1.test.ts`: fator `danoRecebido` nos pontos do motor, fichas opcionais, validação de `montar`.
- `tests/unit/p1-chefes-progressivos.test.ts`: `chefeDoArcade` em todos os estados possíveis da fila; chave desligada = HEAD (diferencial).
- `tests/unit/provocacoes-*.test.ts`: falas, limites, validação do boot, sorteio.
- `tests/unit/musica-*.test.ts`: temas, sequenciador, orçamento, mix.
- Varredura de texto: `src/fight/` não pode mencionar `provoca`; `src/audio` e `src/data/sons` não podem usar `Math.random`, `Date` ou `performance`. **A confirmar** que a varredura de `provoca` continua no teste (não reconferido nesta passada).
