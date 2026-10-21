# Arquitetura

Como o código está organizado hoje (commit `c7437c1`, 2026-10-21). Cada afirmação aponta para arquivo e linha.
O que não foi confirmado por leitura ou execução está marcado **a confirmar**.

## 1. Camadas

Cada camada importa só das camadas listadas na coluna "Importa de", com a exceção registrada abaixo.
A coluna foi montada com uma varredura dos imports `from '../...'` em 2026-10-21.

| Pasta | Responsabilidade | Importa de |
|---|---|---|
| `core/` | tipos de contrato (`contratos.ts`), RNG com semente (`rng.ts`), armazenamento v2 (`storage.ts`), constantes (`constantes.ts`) | `meta/` (só `storage.ts`) |
| `meta/` | regras de desbloqueio (`regras.ts`), progresso puro (`progresso.ts`), escada do Arcade (`escada.ts`) | `core/` |
| `data/` | definições dos lutadores (`lutadores/*.ts`), golpes, cenários (`cenarios.ts`), montagem (`montar.ts`) | `core/`, `data/tipos.ts` |
| `fight/` | motor da luta: `Game`, `Fighter`, CPU, colisão, projétil. Sem DOM, áudio nem render | `core/`, `data/` |
| `audio/` | sons sintetizados (`src/audio/audio-sys.ts`), tradução de eventos em som (`src/audio/eventos.ts`) | `core/` |
| `render/` | desenho em canvas: pose, HUD, cenário, efeitos, retrato | `core/`, `data/`, `assets/` |
| `assets/` | leitura do manifesto C1 (`carregador.ts`), carga sob demanda (`gerenciador.ts`), elenco (`elenco.ts`) | `data/`, `core/` |
| `ui/` | cenas (`ui/cenas/*.ts`), menus, navegador, persistência | quase todas as outras |
| `input/` | teclado, gamepad, toque: viram teclas virtuais e `InputFrame` | `core/` |
| `platform/` | escala do canvas, foco, tela cheia, avisos, erros | `core/` |
| `main.ts` | monta tudo e roda o laço | todas |

**Exceção registrada:** `core/storage.ts:9-11` importa `meta/`. O comentário em `storage.ts:144-145` diz que isso não cria ciclo. Ciclos no grafo inteiro não foram verificados com ferramenta: **a confirmar**.

**Doc divergente:** `src/README.md` lista a ordem `core -> data -> fight -> render/audio -> ui -> input/platform`. Ela não menciona `meta/` nem `assets/`, que existem no código.

## 2. Laço de execução

`src/main.ts`:

- Passo fixo de 1000/60 ms, ou seja, 60 ticks de lógica por segundo (`main.ts:146`).
- O tempo acumulado é limitado a 100 ms por quadro (`main.ts:157`), para não dar um salto grande depois de uma aba parada.
- Cada tick: `ui.update()` e depois `entrada.fimDoTick()` (`main.ts:161-164`).
- Cada quadro de tela: `ui.draw()` (`main.ts:166`).
- Pausa automática ao perder o foco da janela (`main.ts:114`, método `blur()` da cena de luta).

Fluxo de entrada: teclado, gamepad e toque escrevem em `TeclasVirtuais` (`src/input/teclas.ts`). A luta lê um `InputFrame` (C2) por jogador por tick. A luta gera um `LeituraLuta` (C3), que o render, a UI e o áudio leem.

## 3. Contratos

Os contratos de tipos ficam em `src/core/contratos.ts`. Quem escreve é o motor (`fight/`). Quem lê são render, UI e áudio.

### C1: manifesto de atlas (versão 2)

Arquivo: `public/assets/lutadores/<id>/atlas.json`. Validação: `src/assets/manifesto.ts` (`validarManifesto`).

Campos:

- `versao`: `1` ou `2` (`manifesto.ts:67`).
- `lutador`: id.
- `imagens`: de 1 a 8 arquivos (`MAX_PAGINAS = 8`, `manifesto.ts:10`). Só nome de arquivo, sem pasta (`manifesto.ts:6-7`).
- `tamanho`: `[largura, altura]` do atlas.
- `alturaRef`: altura do idle0 em px (410 para os lutadores normais, 525 para o BAATAR).
- `quadros`: mapa nome da pose para `{ x, y, w, h, ax, p?, rosto?, ponta? }`. `p` é a página (0 a n-1), `rosto` e `ponta` são pares `[x, y]` relativos ao canto do quadro.
- `retrato` (opcional): `{ arquivo, recorte }`. Se faltar, o carregador lê o `retrato.json` ao lado (`carregador.ts:208-225`).

Exemplo real de `public/assets/lutadores/aminu/atlas.json` (trecho):

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

Situação dos atlas no jogo hoje (`public/assets/lutadores/*/atlas.json`):

| Lutador | Versão | Páginas | alturaRef | Quadros |
|---|---|---|---|---|
| HAYATO, MIN-JI, AMINU, CENTELLA, CAMILLE | 2 | 2 | 410 | 48 |
| NILA | 2 | 3 | 410 | 60 |
| BAATAR | 2 | 4 | 525 | 54 |
| WEI LONG | 1 | 1 (imagem única) | 410 | 63 |
| CAIO | 1 | 1 (imagem única) | 410 | 75 |

A versão 1 (uma imagem, campo `imagem`) continua aceita (`manifesto.ts:72-75`).

Convenção, não validada pelo carregador: quadro ativo tem `ponta` (`ferramentas/sprites/poses.mjs:19`, lista `COM_PONTA`). O `validarManifesto` não confere isso: **a confirmar** se algum atlas viola a convenção.

### C2: `InputFrame`

Definido em `src/core/contratos.ts:7-25`.

- Estado segurado: `left`, `right`, `up`, `down`.
- Borda de descida (verdadeiro só no tick do aperto): `lp`, `hp`, `lk`, `hk`, `sp`.
- `spSeg` (opcional): especial segurado. Ausente conta como `false`. Usado pela carga do AMINU. Produzido em `src/input/teclas.ts:51`. A CPU não preenche.

Quadro vazio: `INPUT_VAZIO` (`contratos.ts:27-37`).

Exemplo de quadro com o especial segurado:

```json
{ "left": false, "right": true, "up": false, "down": false,
  "lp": false, "hp": false, "lk": false, "hk": false, "sp": false, "spSeg": true }
```

### C3: leitura da luta e eventos

Tipo `LeituraLuta` (`contratos.ts:374-408`). Campos principais: `fighters` (dois lutadores), `projectiles`, `timer`, `round`, `winsNeeded`, `cam`, `phase`, `t`, `tick`, `shake`, `hitstop`, `mode`, `training`, `stage`, `winner`, `matchDone`, `perfect` e `events`.

Regras de consumo (`contratos.ts:78-97`):

1. `tick` só avança quando a luta anda. Durante o hitstop ele congela, junto com as partículas.
2. `events` é esvaziado no começo de cada tick. No tick congelado, fica vazio.
3. A luta não toca áudio nem cria partícula. Só emite evento.
4. Efeitos visuais usam um RNG separado do RNG da lógica (`rngVisual`), para o replay não depender de quantas partículas foram desenhadas.

Tipos de evento (`EventoLuta`, `contratos.ts:291-373`): `swing`, `special`, `deny`, `jump`, `land`, `dust`, `projectile`, `clash`, `hit`, `block`, `armor`, `parry`, `perfect`, `ko`, `throw`, `round`, `carga`, `rebote`, `quebra-guarda`, `troca-ficha`. Os da E3 têm definição em `contratos.ts:269-272`. `fase-chefe` (etapas `troca`, `danca`, `retomada`) está em `contratos.ts:413-421` e é emitido em `src/fight/game.ts:446, 460, 785`.

### C4: armazenamento local

Implementação em `src/core/storage.ts`. Chaves em `src/core/contratos.ts:66-75`.

| Chave | Formato | Papel |
|---|---|---|
| `inno-fighters-v1` | `{ v: 1, s, hi }` | formato anterior. Continua lida na migração e não é apagada (`storage.ts:236`) |
| `sakura-fighters-v4` | `{ s, hi }` (formato do protótipo) | legado. Migrada, e apagada só depois de a v2 ser gravada (`storage.ts:126-129, 275-276`) |
| `inno-fighters-v2` | `{ v: 2, s, hi, prog }` | chave atual. Usada pelo jogo (`src/main.ts:71`, `src/ui/persistencia.ts`) |
| `inno-fighters-v2-quebrada` | texto cru | cópia de uma v2 ilegível, guardada antes de ser substituída (`storage.ts:154-155, 196-202`) |

**Migração** (`carregarDadosV2`, `storage.ts:244-280`), nesta ordem:

1. Se a v2 é válida, usa. O recorde vira `max(v2.hi, v1.hi)` (`storage.ts:263-270`). Apaga o legado.
2. Senão, se a v1 é válida, monta `{ s, hi }` com progresso vazio e grava a v2.
3. Senão, se há legado, faz o mesmo com ele.
4. Senão, usa os padrões e não grava nada.

**v2 corrompida** (JSON inválido ou sem `v: 2`): a cópia crua vai para `-quebrada` (se ainda não houver cópia). Depois o carregamento segue nos passos 2 a 4.

**v2 de build mais novo** (`v > 2`): é tratada como ausente na leitura, mas `salvarDadosV2` recusa gravar e retorna `false` (`storage.ts:216`). Aí aparece o aviso "Progresso não salvo neste aparelho" (`src/ui/persistencia.ts:6, 24-25`).

**Ids desconhecidos** (`sanearProgresso`, `src/meta/progresso.ts:84-134`):

- Id que não está no roster mas tem forma de id (`/^[a-z0-9][a-z0-9-]{0,31}$/`, `progresso.ts:82`) vai para `prog.desconhecidos`. Limite: 32 (`progresso.ts:80`). O id é regravado sem ser usado.
- Id que passou a existir no roster é promovido a `desbloqueados`.
- Iniciais nunca são guardados (`progresso.ts:106`).
- `vistos` só guarda ids desbloqueados (`progresso.ts:118-122`).
- Lixo (não é texto, forma inválida, excesso) é descartado.

Isso protege o progresso quando um build de onda posterior grava um lutador que o build atual não conhece.

**Saneamento das configurações** (`sanearConfiguracoes`, `storage.ts:46-70`): `rounds` aceita só 1, 2 ou 3. `time` aceita 0, 30, 60 ou 99. `diff` aceita 0, 1 ou 2. `music` e `sfx` ficam entre 0 e 1. `controles` é reservado, com teto de 32 entradas.

**Recorde:** inteiro entre 0 e `TETO_RECORDE = 99_999_999` (`storage.ts:33`). Fora disso vira 0.

Testes: `tests/unit/storage.test.ts`, `tests/unit/storage-v2.test.ts`, `tests/unit/progresso.test.ts`.

## 4. Carga sob demanda

- **Boot:** lê o `atlas.json` de todos os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, `src/assets/carregador.ts:247-270`). Se um falta, o boot falha (ver `docs/como-adicionar-um-lutador.md`, passo 8).
- **Retratos:** todos, no boot (`elenco.ts:104`).
- **Imagens fixas:** os iniciais (`VITRINE`, que é igual a `INICIAIS`, `src/data/lutadores/index.ts:39`) e o cenário do título (`elenco.ts:93-94`).
- **Demais:** `GerenciadorDeArte.garantir` (`src/assets/gerenciador.ts:129`). No máximo 3 não fixos ficam na memória (`gerenciador.ts:19`, padrão em `:48`). Sai o menos recente (`gerenciador.ts:178-180`).
- **Atlas ainda sem imagem:** `pronta = false`. O desenho pula o lutador até a arte chegar (`elenco.ts:11-15`).
- **Retrato:** o próprio (`retrato.png` com o `recorte`) ou um recorte do atlas, se o retrato não estiver carregado (`carregador.ts:158-161`).

Modo de desenvolvimento: `?precarga=minima` não carrega atlas no boot (`src/main.ts:117`).

## 5. Determinismo

**Gerador:** mulberry32 (`src/core/rng.ts:22-40`). Mesma semente, mesma sequência, em qualquer navegador ou Node.

**Semente:** `?seed=N` na URL (`src/main.ts:41-46`), ou valor aleatório do `crypto.getRandomValues` (`rng.ts:43-47`).

**Geradores separados** (`src/main.ts:57-60, 76`):

- lógica (CPU, sorteios de luta): semente
- visual (partículas, poeira, pétalas): semente + 1
- UI (escada do Arcade): semente + 2
- áudio: semente + 3

**Teste de regressão:** `tests/unit/fight.test.ts:199-200` (mesma semente dá o mesmo resultado) e `:202-203` (CPU contra CPU, 6000 ticks, semente 42, comparado com `tests/unit/__snapshots__/fight.test.ts.snap`).

**Fidelidade ao protótipo:**

- Referência: `prototipo/inno-fighters-artefato.html`. Os testes de fidelidade dependem do arquivo (`tests/unit/_prototipo.ts:9-10`, `TEM_PROTOTIPO`).
- Oráculo do HAYATO e da MIN-JI: o atlas original (v1), guardado em `tests/fixtures/atlas-prototipo/<id>/`. Motivo: a arte de produção foi trocada. Usado em `tests/unit/_lutadores.ts:40`, `tests/unit/dados.test.ts:28-29`, `tests/unit/atlas.test.ts:21-24`.
- E2E de fidelidade pixel a pixel: `tests/e2e/fidelidade-prototipo.spec.ts` e `tests/e2e/fidelidade-ui.spec.ts`. Rotas que substituem a arte de produção pela fixture: `tests/e2e/_jp-prototipo.ts`.

## 6. Balanceamento (harness)

**Em construção, ainda não entregue.** Em 2026-10-21 há arquivos não commitados em `ferramentas/balanco/` (`ferramentas/balanco/frame-data.ts`, `elenco.ts` e scripts `_bench*.mjs`). A pasta `docs/balanco/` ainda não existe, então não há documentação do harness. É a E6 (`docs/plano-expansao.md` §8). Não verifiquei o que o harness calcula: **a confirmar** quando for commitado.

Valores provisórios marcados no código:

- BAATAR: `hpPorBarra` 75, `danca.duracao` 90, `bonusVitoria` 5000 (`src/data/lutadores/baatar.ts:98-109`).
- Perfil de IA do chefão: `IA_CHEFE` (`src/fight/cpu.ts:23-28`).
- Valores de dano e tempo dos golpes da E3: "partida", a serem ajustados pelo harness (`src/data/lutadores/aminu.ts:7`).

## 7. Política de segurança de conteúdo (CSP)

Definição: `POLITICA_CSP` em `vite.config.ts:17-25`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:
```

- Entra como `<meta http-equiv>` só no build (plugin `cspSoNoBuild`, `vite.config.ts:27-37`). O dev server injeta scripts inline, então não recebe a CSP.
- Exceções documentadas em `vite.config.ts:9-14`: `style-src 'unsafe-inline'` (estilo do `index.html` e do `<pre id="err">`); `img-src data: blob:`, `media-src blob:` e `connect-src 'self'`, que hoje não são usados e ficam como folga.
- A meta **não** cobre `frame-ancestors`, `report-uri` nem `sandbox`. Esses só funcionam como cabeçalho HTTP (`vite.config.ts:15`).
- Teste: `tests/e2e-build/csp.spec.ts`, contra o build (`npm run test:e2e:build`).
- O Pages não permite definir cabeçalhos. No EasyPanel, a política deve virar cabeçalho (`vite.config.ts:5-6`).

## 8. Tela e escala

- Resolução lógica: 960x540 (`src/core/constantes.ts:3-4`).
- Buffer do canvas: 1920x1080 (`index.html:18`), que é 2x a lógica (`RS = 2`, `src/render/tela.ts:6`).
- Escala na tela: maior retângulo 16:9 que cabe na janela (letterbox), aplicado por CSS (`src/platform/escala.ts:5-19`). Recalculado ao redimensionar (`main.ts:53-54`).
- Mapeamento de controles: `src/input/mapa.ts`. Lista para o jogador: `README.md`, seção Controles.

## 9. Build e publicação

- `npm run build` = `tsc --noEmit && vite build` (`package.json`). Gera `dist/` com sourcemap (`vite.config.ts:42`).
- O mapa de código-fonte fica público no build. A decisão do dono é trocar para `sourcemap: 'hidden'` ao privar o repositório (`PROGRESSO.md`, seção do repositório público). Ainda não foi feito.
- Pages: `.github/workflows/pages.yml`, temporário. Ver `README.md`.

## 10. Ferramentas

| Arquivo | Função | Estado |
|---|---|---|
| `ferramentas/extrair-prototipo.mjs` | tira atlas e cenários do protótipo para `public/assets` | usado na F1 |
| `ferramentas/sprites/` | pipeline de folhas para atlas C1 v2 | **não executa**: `executar.mjs:15` (ver `docs/como-adicionar-um-lutador.md`, passo 4) |
| `ferramentas/gerar-retratos.mjs` | retrato de cada lutador a partir do atlas | funcional, sem script npm |
| `ferramentas/balanco/` | harness de frame data e simulação (E6) | em construção, não commitado; sem `docs/balanco/` ainda |
| `ferramentas/converter-cenarios.mjs` | cenários da arte-fonte para WebP 1920x1080 | lista de cenários fixa (`:9`) |
| `ferramentas/prompts/montar-prompts.mjs` | gera `docs/prompts/` a partir de `docs/prompts-arte.md` | caminho fixo (`:5`) |
| `ferramentas/prompts/verificar-prompts.mjs` | confere os prompts gerados | funcional |

## 11. Pendências técnicas (verificadas em 2026-10-21)

- `npm run sprites` quebrado (`ferramentas/sprites/executar.mjs:15`).
- `npm test`: 2 falhas em `tests/unit/gamepad.test.ts`, por alteração de `src/input/gamepad.ts` não commitada.
- Tela "Como jogar" cita a tecla H (`src/ui/cenas/how.ts:152`). A remoção foi aprovada e não foi aplicada.
- `src/data/lutadores/aminu.ts:4` e `:61` citam trabalho futuro ("na E5"), já entregue. Comentário desatualizado.
- `docs/prompts-arte.md` §11 cita o Gemini como gerador. O histórico registra o Runway. **A confirmar.**
