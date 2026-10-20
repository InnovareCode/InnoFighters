# InnoFighters — Plano técnico da expansão (8 lutadores + chefão + desbloqueio)

Autora: Nova (arquitetura) · 2026-10-20 · Status: **proposta, nada implementado**.
Base: código atual de `src/` (F1c ainda em curso em `src/ui` e `src/main.ts`), `PLANO.md` (contratos C1–C4, fases F0–F7)
e `PROGRESSO.md` (seção "Expansão"). Os conceitos de personagem vêm do Apolo em `docs/proposta-expansao.md`
(em produção em paralelo; este plano não depende do conteúdo dele, só encaixa o que ele propuser).

---

## 0. Contexto e hipóteses declaradas

| Item | Hipótese |
|---|---|
| Escala | Jogo local, 1 a 2 jogadores por aparelho, sem servidor. Nada de conta, ranking online ou anti-trapaça. |
| Equipe | Dono solo + squad. A arte é gerada **pelo dono** (IA) a partir dos prompts do Apolo — é o gargalo real. |
| Maturidade | MVP ainda não lançado (F1 em curso). A expansão é a **primeira evolução do produto**, não um sistema novo. |
| Prazo | Não declarado. Assumo: a expansão não pode atrasar o caminho crítico do MVP (F1 → F3 → F4 → F6). |
| Regra de ouro | `fight/` continua puro (sem DOM, sem `Math.random`, RNG de semente) e os 4 originais não mudam de comportamento: os testes de fidelidade (`tests/unit/luta-fidelidade.test.ts`, snapshot de `fight.test.ts`) são o **portão** de toda mudança no motor. |

Consequência dessas hipóteses: nada de "motor de scripts", plugin, editor de golpes ou backend. A expansão é
**dados + um catálogo pequeno e fechado de mecânicas novas** + UI de progressão + armazenamento local v2.

---

## 1. Modelo de dados — um lutador novo entra por dados + atlas + manifesto C1

### 1.1 O que o código assume hoje (lido em `src/`, não suposto)

- `IdLutador` é uma união fechada de 4 ids em `src/core/contratos.ts:90`.
- `ROSTER` (`src/data/lutadores/index.ts`) é ao mesmo tempo a ordem da seleção, do ciclo de cenários e da vitrine do título.
- `LutadorDef.idPrototipo: 'f1'|'f2'|'f3'|'f4'` é obrigatório (`src/data/tipos.ts:109`).
- `IdCenario = 'jp'|'cn'|'kr'|'br'` e `CenarioDef.casa` é uma união literal dos 4 (`src/data/cenarios.ts:9`).
- "4" está fixo em vários lugares da UI: `select.ts` (grade 2×2 por `i % 2`, `i >> 1`, `% 4`), `how.ts:38/43`,
  `intro.ts:31/39`, `menu.ts:49`, `logo.ts:156-158` e as posições `xs = [104, 296, 664, 856]` de `fileiraDeHerois`.
- Corpo (empurrão entre lutadores) é a constante `min = 78` em `Game.separate()` (`src/fight/game.ts:426`),
  igual para todos — um chefão maior atravessaria visualmente o rival.
- **Todos os atlas carregam no boot** (`planoPadrao` em `src/assets/elenco.ts` passa o `ROSTER` inteiro ao carregador).
  Com 9 lutadores isso estoura o orçamento de memória (seção 6 do PLANO: ≤ 120 MB decodificados em luta).
  Conta de ordem de grandeza: 1 atlas 2048×2048 RGBA ≈ 16,8 MB decodificado; 9 ≈ 150 MB só de lutadores.

### 1.2 Mudanças de tipo (todas aditivas)

**`src/core/contratos.ts`** — a lista de ids vira valor em tempo de execução, porque o saneador do storage
(em `core/`) precisa validar ids e `core/` não pode importar `data/`:

```ts
export const IDS_LUTADORES = ['hayato', 'wei-long', 'min-ji', 'caio', /* +4 novos */, /* chefão */] as const;
export type IdLutador = (typeof IDS_LUTADORES)[number];
```

**`src/data/tipos.ts`** — `LutadorDef` ganha só campos opcionais com default neutro (= comportamento atual):

| Campo | Tipo | Default | Para quê |
|---|---|---|---|
| `idPrototipo` | passa a ser **opcional** | — | lutadores novos não existem no protótipo; os testes de fidelidade iteram só quem tem. |
| `corpo` | `number` (meia-largura de empurrão, px lógicos) | `39` (→ `min = 78` atual) | chefão maior não atravessa o rival. |
| `passiva` | `Passiva` (seção 2.2) | ausente | mecânica de assinatura que não é golpe. |
| `chefe` | `ConfigChefe` (seção 2.3) | ausente | só vale quando a luta é marcada como luta de chefe. |
| `ia` (por golpe, em `Golpe`) | `DicaIa` | ausente | diz à CPU para que serve um especial novo (seção 2.4). |

`IdCenario` ganha os cenários novos; `CenarioDef.casa` passa a ser `IdLutador`.

**`src/data/lutadores/index.ts`** separa os papéis que hoje o `ROSTER` acumula:

```ts
export const ROSTER: readonly IdLutador[];          // ordem da tela de seleção (9)
export const INICIAIS: readonly IdLutador[];        // ['hayato','wei-long','min-ji','caio'] — liberados de fábrica
export const FILA_DESBLOQUEIO: readonly IdLutador[]; // os 4 novos, na ordem que o dono escolher (decisão ED2)
export const CHEFE: IdLutador;                       // id do chefão
export const VITRINE: readonly IdLutador[];          // quem aparece no título/intro (= INICIAIS; não estraga surpresa)
export const LUTADORES: Readonly<Record<IdLutador, LutadorDef>>; // Record força exaustividade no typecheck
```

### 1.3 Checklist "lutador novo" (é este o critério de "entrou só por dados")

1. `src/core/contratos.ts`: acrescentar o id em `IDS_LUTADORES` (1 linha).
2. `src/data/lutadores/<id>.ts`: `LutadorDef` (stats, `mods`, os 3 especiais) usando tipos existentes
   (`fire | rise | rush | leap | melee`) **ou** primitivas do catálogo da seção 2.2.
3. `src/data/lutadores/index.ts`: registrar em `LUTADORES`, `ROSTER` e (se for o caso) `FILA_DESBLOQUEIO`.
4. `src/data/cenarios.ts`: cenário da casa (luta-se na casa do rival — `Game.setup` já faz `stage = LUTADORES[c2].stage`).
5. Assets gerados pelo pipeline da F2: `public/assets/lutadores/<id>/atlas*.webp + atlas.json` (C1) + `retrato.webp`;
   `public/assets/cenarios/<id>.webp`.
6. Nenhum arquivo de `fight/`, `render/` ou `ui/` muda — **exceto** se o lutador usar uma primitiva nova
   que ainda não existe no catálogo (aí é trabalho da fase E3, com teste próprio).

Portão automático (vira teste genérico em `tests/unit/dados.test.ts`, iterando `ROSTER`):
todo lutador tem as 13 poses mínimas do C1, `ponta` em todo quadro ativo, stats dentro das faixas da seção 6,
cenário existente, especiais com `cost` ≤ 100 e `rank` 9; `INICIAIS ∪ FILA_DESBLOQUEIO ∪ {CHEFE}` = `ROSTER`, sem repetição.

### 1.4 C1 — manifesto de atlas: duas extensões necessárias

1. **Retrato separado** (`retrato.webp`, ~256×256, recortado do `rosto` do `idle0` pelo pipeline). A seleção hoje
   desenha o retrato a partir do atlas inteiro (`desenharRetrato(ctx, arte.imagem, ch.head, …)`); com carga sob demanda
   a seleção de 9 não pode exigir 9 atlas. Campo opcional no manifesto: `"retrato": "retrato.webp"`.
2. **Atlas em páginas** (`versao: 2`): `"imagens": ["atlas-0.webp", "atlas-1.webp"]` e cada quadro com `"p": 0|1`.
   Motivo: 49 poses × ~90–120 mil px² por quadro (o `idle0` atual tem 289×410 ≈ 118 mil) dá 4,4 a 5,9 milhões de px²,
   acima dos 4,2 milhões de uma página 2048². O chefão, maior, certamente não cabe em uma. **Conta de ordem de
   grandeza, não medida** — o empacotador real da F2 confirma. O ponto é decidir o formato **antes** de a F2 escrever
   o empacotador, para não refazer. `validarManifesto` aceita `versao` 1 (página única) e 2.

A conversão para o formato legado (`tipX/tipY` em px lógicos) continua acontecendo uma vez, no loader (armadilha do PLANO).

### 1.5 Carga sob demanda (antecipada da F4 — vira pré-requisito)

- **Boot:** carrega os `atlas.json` de todos (alguns KB cada) e monta **todos** os `LutadorMontado` (dados, caixas,
  `K`). Assim `fight/` e o contrato `Dependencias.lutadores: Record<IdLutador, LutadorMontado>` não mudam.
- **Imagens:** só retratos no boot (9 × ~250 KB decodificados ≈ 2,3 MB). Atlas de lutador e cenário carregam na tela VS
  (`elenco.garantir([c1, c2], stage)` com barra de progresso) e são liberados quando saem da luta.
- **Arcade:** pré-busca (download, sem decodificar) do próximo rival durante a luta atual.
- Vitrine do título/intro usa só `VITRINE` (4 atlas) — esses podem ficar em cache.

---

## 2. Motor de luta (`src/fight/`): poderes de assinatura e chefão sem quebrar a regra

### 2.1 Princípios

- **Esquema de comandos inalterado:** cada lutador continua com 3 especiais (`ESP`, `↓+ESP`, `→+ESP`). Nada de
  4º botão nem "super": C2 (`InputFrame`), controles de toque, tela "Como jogar" e CPU continuam valendo. (Super = ED10.)
- **Catálogo fechado:** a "personalidade" de um lutador vem de combinar parâmetros que já existem
  (`type`, `hits`, `armor`, `inv`, `shots`, `proj.acc`, `proj.low`, `kdLast`, `spin`, `through`, `throw`…) e, no máximo,
  **uma primitiva nova por lutador**. Cada primitiva nova custa: código em `fight/` + teste unitário + dica para a CPU
  + evento C3 (para áudio/efeito) + desenho procedural em `render/` (D2: nada de FX assado).
- **Aditivo e inerte:** campo ausente = código antigo intacto. Prova = fidelidade e snapshot verdes **sem atualizar o snapshot**.
- **Pontos únicos de mudança:** hoje "morreu?" está em dois lugares (`game.ts:229` no arremesso e `:560` no golpe).
  Antes de qualquer mecânica de chefe, Vega extrai isso para um método só (`resolverVidaZerada(d, a)`), com fidelidade verde.

### 2.2 Catálogo proposto de primitivas (o Apolo escolhe a partir daqui; mapeamento conceito → primitiva fecha na E0)

| Primitiva | Onde | Dados (exemplo) | Custo estimado | Observação |
|---|---|---|---|---|
| **Agarrão de comando** | `Golpe.throw` + alcance | `{ type:'melee', throw:1, alcance: 1.4 }` | baixo | `updateMove` já chama `arremessar` quando `mv.throw && mt === S` (`fighter.ts:449`); falta `canThrow()` aceitar alcance por golpe. Confirmar com teste antes de prometer "custo zero". |
| **Armadilha / zona** | projétil parado | `proj: { sp: 0, life: 240, arma: 20, style: 'totem' }` | médio | projétil com velocidade 0 que fica no chão; `arma` = ticks até ficar ativo. Estilo novo = desenho novo em `render/efeitos.ts`. |
| **Teletransporte** | tipo novo `'warp'` | `{ type:'warp', warp: { dx: 60, atras: true }, inv: 14 }` | médio | some em S, reaparece relativo ao rival, `R` de recuperação. Evento `warp` para efeito/som. |
| **Contra-ataque (parry)** | tipo novo `'parry'` | `{ type:'parry', A: 18, parry: { niveis:['mid','over'], resposta:'hp' } }` | médio-alto | se for atingido por golpe corpo a corpo durante `A`, anula o dano e dispara o golpe-resposta. Mexe em `applyHit` (ponto mais sensível do motor). |
| **Fortalecimento temporário** | `Passiva`/tipo `'buff'` | `{ type:'buff', buff: { dur: 300, pow: 1.15, spd: 1.1, armorPesados: true } }` | médio | estado com contador no `Fighter`; leitura C3 `buff` para a aura no render. |
| **Puxão** | projétil com `kb` negativo | `proj: { kb: -8, … }` | baixo | provavelmente já funciona (sinal do `kb`); confirmar com teste. |
| **Mobilidade** (pulo duplo / investida aérea) | `Passiva` | `{ puloDuplo: true }` | médio | mexe na máquina de estados do pulo; maior risco de bug visual. |

Recomendação: escolher para os 4 novos **2 de custo baixo e 2 de custo médio**, e deixar `parry`/mobilidade para
o chefão ou para depois — eles mexem no núcleo (`applyHit`, pulo) e encarecem o teste.

### 2.3 Chefão no motor

**Mesma definição, dois papéis.** O chefão é um `LutadorDef` normal (é o que fica jogável) com um bloco `chefe`
que **só** se aplica quando a partida é marcada como luta de chefe:

```ts
type ConfigChefe = {
  barras: 2;                 // barras de vida extras: ao zerar a 1ª, troca de fase em vez de KO
  hpPorBarra?: number;       // default = def.hp
  fase2?: { pow?: number; spd?: number; mods?: ModsGolpes }; // fica mais agressivo na 2ª barra
  armaduraPesados?: boolean; // hp/hk com armor (o campo `armor` já existe no motor)
  rounds?: 1;                // luta decisiva (decisão ED6)
};
// ConfigPartida (fight/game.ts) ganha: chefe?: boolean  → aplica LUTADORES[c2].chefe ao P2
```

- **Troca de barra** (dentro de `resolverVidaZerada`): se `d.barras > 1` → `barras--`, `hp = hpPorBarra`, derrubada
  sem KO, `invuln` ~60 ticks, `hitstop` longo, aplica `fase2`, emite `{ tipo: 'fase-chefe', lutador, barra }`.
- **Tempo esgotado:** `endRound()` compara `hp` puro (`game.ts:616`); com barras precisa comparar
  `vidaTotal = hp + (barras − 1) × hpPorBarra`. Sem isso, o chefão na 2ª barra perde por tempo com vida sobrando.
- **Perfeito / pontuação:** mantém a regra atual sobre a barra final; bônus de chefe na pontuação (valor na E6).
- **Escala maior:** `def.scale` (proposta 1,25–1,35) já alimenta `K` e as caixas de acerto em `montarLutador`; o que
  falta é o `corpo` (seção 1.2) e conferir os limites de parede (`clamp(x, 60, LARGURA − 60)`) e o zoom da câmera
  (`game.ts:416`) — Lyra mede no navegador se a cabeça corta no zoom máximo (skill `medir-antes-de-afirmar`).
- **CPU do chefe:** constante interna `IA_CHEFE` em `cpu.ts` (não entra em `AI_LEVELS`, que é a lista do menu de
  dificuldade em `diff.ts`). Proposta: nível escolhido + reação melhor; fase 2 mais agressiva.
- **Jogável:** escolhido na seleção, o chefão é o `LutadorDef` sem o bloco `chefe` (1 barra, IA normal) e precisa
  caber nas metas de equilíbrio dos outros (seção 6). O chefe-papel é que pode ser mais forte.

### 2.4 CPU sabendo usar especiais novos

`cpu.ts` escolhe especial **pelo nome** (`sFire` de longe, `sFwd` para aproximar, `sDown` como anti-aéreo/rasteira).
Se o `sFire` de um lutador novo for um teletransporte, a CPU o usará "de longe" — funciona, mas mal. Solução mínima:
dica opcional por golpe, `ia?: { papel: 'distancia'|'aproximar'|'antiaereo'|'pressao'|'defesa'; alcance?: [min, max] }`.
Sem a dica, a CPU faz exatamente o que faz hoje (fidelidade preservada).

### 2.5 C3 — acréscimos ao estado de leitura (aditivos; Lyra pode consumir com stub)

- `LutadorLeitura`: `barras: number` (1 fora de luta de chefe), `barrasMax: number`, `chefe: boolean`,
  `buff: { restante: number } | null`.
- `EventoLuta`: `fase-chefe`, `warp`, `parry`, `buff` (cada um com a receita de som/efeito no comentário, como os atuais).
- `EstiloProjetil` / `EstiloProjetilDef`: estilos novos conforme o catálogo (hoje duplicado em `contratos.ts:168`
  e `data/tipos.ts:19` — unificar na mesma mudança).

---

## 3. Progresso de desbloqueio — storage C4 v2

### 3.1 Formato

```ts
// src/core/contratos.ts
export const CHAVE_STORAGE = 'inno-fighters-v2';
export const CHAVE_STORAGE_V1 = 'inno-fighters-v1';
export const CHAVE_STORAGE_LEGADA = 'sakura-fighters-v4';

export type Progresso = {
  desbloqueados: IdLutador[]; // ALÉM dos iniciais; lista explícita, nunca diminui
  zeradas: number;            // quantas vezes zerou o Arcade
  chefeDerrotado: boolean;
  vistos: IdLutador[];        // já viu na seleção (selo "NOVO!" some)
};
export type ArmazenamentoV2 = { v: 2; s: Configuracoes; hi: number; prog: Progresso };
```

**Lista explícita em vez de derivar de `zeradas`:** se o dono reordenar a `FILA_DESBLOQUEIO` numa atualização,
derivar faria um jogador "perder" um lutador já ganho. Com lista, o próximo liberado é sempre
"o primeiro da fila que ainda não está em `desbloqueados`" — reordenar nunca revoga nada.

### 3.2 Por que chave nova (`-v2`) e não `v: 2` dentro da chave `-v1`

Rollback. O build atual, ao ler `inno-fighters-v1` com `v !== 1`, trata como ausente, cai nos padrões e **regrava
por cima** — apagaria o progresso de quem voltou de versão. Com chave nova, um rollback lê a `-v1` intacta
(sem progresso, mas sem perda) e, ao reavançar, a `-v2` está lá.

### 3.3 Cadeia de migração (`carregarDados`)

1. `inno-fighters-v2` válida → usa. Apaga `sakura-fighters-v4` se ainda existir. **Mantém** a `-v1` por enquanto
   (apagar numa versão futura, depois de uma release estável — dívida consciente registrada).
2. senão `inno-fighters-v1` válida → `{ s, hi }` + progresso vazio → grava v2 (não apaga a v1).
3. senão `sakura-fighters-v4` → migra `s/hi` → grava v2; apaga a legada **só se gravou**.
4. senão → padrões.
5. v2 com JSON corrompido → tenta o passo 2 em vez de ir direto aos padrões (não perder o recorde).

Saneamento (localStorage é editável; mesmo espírito do `sanearConfiguracoes` atual): ids fora de `IDS_LUTADORES`
descartados, duplicados removidos, `INICIAIS` nunca são guardados (são implícitos), `zeradas` inteiro ≥ 0,
`chefeDerrotado` booleano estrito. Trapaça local não importa (sem ranking); robustez importa.

### 3.4 Regras de progresso — funções puras, fora da UI

Novo módulo `src/meta/` (importa `core/` e `data/`, sem DOM; consumido por `ui/`):

```ts
liberados(prog): ReadonlySet<IdLutador>                     // INICIAIS ∪ prog.desbloqueados
aplicarVitoriaArcade(prog, { derrotouChefe }): { prog, novos: IdLutador[] } // devolve quem acabou de liberar
montarEscada({ c1, prog, rng, tamanho }): Etapa[]          // seção 4
```

`Persistencia` (`src/ui/contexto.ts`) ganha `prog: Progresso`; `main.ts` grava junto com `s` e `hi`.

### 3.5 Testes obrigatórios (Cronos escreve, Íris valida)

Unit (`tests/unit/storage.test.ts` + `tests/unit/progresso.test.ts`):
vazio → padrões · só v1 → migra e mantém v1 · só legado → migra e apaga legado · v2 + legado → apaga legado ·
v2 corrompida + v1 válida → recupera da v1 · `setItem` lançando (cota/privado) → `salvarDados` devolve false e nada é apagado ·
saneamento (id desconhecido, duplicado, tipo errado, `zeradas` NaN/negativo) · carregar duas vezes = mesmo resultado ·
ida e volta (salvar → carregar) · 1ª zerada libera `FILA[0]` (e o chefe, conforme ED3) · fila esgotada não libera nada ·
fila reordenada não revoga.
E2E: semear `localStorage` com v1 → título mostra o recorde e a seleção mostra 4 liberados; semear v2 completa →
9 liberados. **Sem "código de trapaça" em produção** para os testes: o e2e semeia o storage direto.

---

## 4. Escada do Arcade com chefão

### 4.1 Estrutura

Hoje: `diff.ts` embaralha "todos menos o meu" (3 rivais) e grava em `CampanhaArcade.order`. Passa a ser:

```ts
type Etapa = { id: IdLutador; chefe: boolean };
// CampanhaArcade.order: IdLutador[]  →  etapas: Etapa[]   (fight.ts, fim.ts e vs.ts leem `etapas[idx]`)
```

`montarEscada` (pura, testável com semente): N rivais sorteados com `rngUI` entre `ROSTER − {c1, CHEFE}`
(incluir travados ou não = ED5) + última etapa `{ id: CHEFE, chefe: true }`. `ConfigPartida` recebe `chefe: true`
nessa etapa. Tamanho `N` é dado (`TAMANHO_ESCADA` em `data/`) — ED4.

### 4.2 Fluxo de telas

`... → vs (rival N) → fight → [aviso de chefe: "UM DESAFIANTE SE APROXIMA"] → vs (chefão, escala maior) → fight (1 round, 2 barras)
→ ending → [desbloqueio: "NOVO LUTADOR LIBERADO!" para cada id em `novos`] → título`.
Continue funciona igual (inclusive no chefão). Perder para o chefão sem continues = game over, nada liberado (conforme ED3).

### 4.3 Barra de vida extra (HUD)

`desenharLado` (`src/render/hud.ts:30`) calcula `pct = hp / maxHp`. Com `barrasMax > 1`: barra empilhada (a de baixo
em outra cor, contador "×2"), rastro `hpShown` reinicia na troca, faixa "CHEFÃO" no lugar do título. Evento
`fase-chefe` dispara flash + tremor + som. Sem barras extras o HUD desenha exatamente como hoje (teste de fidelidade de UI).

### 4.4 Quando o jogador É o chefão

Ver ED7. Recomendação para esta expansão: escada só de rivais (sem luta de chefe), final próprio; espelho do chefão
com paleta alternativa fica para depois (troca de paleta em Canvas 2D custa memória ou desempenho no celular).

---

## 5. Seleção, menus e cenários para 9

- **Grade 3×3 com o chefão no centro** (recomendação; alternativa: 4+4 com o chefão numa casa abaixo). Hoje a grade
  2×2 ocupa x 360–612, y 92–344 com casas de 120 px; 3×3 no mesmo espaço dá casas de ~80 px lógicos. Em celular
  (canvas 960 escalado para ~800 px CSS) isso dá ~66 px de toque — acima do mínimo, mas **Lyra mede no aparelho**
  antes de dar por pronto. Navegação: `col = i % 3`, `row = (i / 3) | 0`, com volta nas bordas; tudo derivado de
  `ROSTER.length`, nunca de literal.
- **Estados de casa:** liberado (retrato normal) · travado (silhueta escura do retrato + cadeado; painel lateral
  diz "Zere o ARCADE para liberar" e mostra **só** o próximo da fila como "?" — não revelar a fila toda) ·
  chefão não derrotado ("???" sem silhueta) · recém-liberado (selo "NOVO!" até ser visto). Travado não confirma
  (som de negação) em nenhum modo, inclusive Versus e Treino.
- **Cursor inicial e P2** (`select.ts:74`, `(cur + 1) % 4`): pular casas travadas.
- **Outras telas com "4" fixo:** `how.ts` (ciclo de lutadores → só liberados), `menu.ts:49` e `logo.ts`
  (vitrine → `VITRINE`), `intro.ts` (mantém os 4 iniciais), texto do ARCADE em `menu.ts:22` ("enfrente os 3 rivais…").
- **Cenários:** um por lutador novo (a regra "luta na casa do rival" já existe) + **arena do chefão** = 5 artes novas
  (2752×1536 → 1920×1080 WebP ≤ 250 KB, como a F2). `CICLO_CENARIOS` do título continua só com os da vitrine.

---

## 6. Balanceamento mensurável

### 6.1 Frame data medida no motor (não calculada à mão)

`ferramentas/frame-data` (roda via Vitest em Node, sem navegador): para cada lutador e golpe, coloca o atacante
diante do boneco de treino (`DummyTreino` já tem `'stand'|'crouch'|'block'`) numa `Game` sem render e **mede**
inicialização, ativos, recuperação, vantagem no acerto e no bloqueio (ticks até cada um poder agir), alcance efetivo
(distância máxima que conecta) e dano. Saída: `docs/frame-data.md` gerado (vira a tabela da F7) + JSON.

### 6.2 Simulação CPU × CPU com semente

- Harness `tests/balanco/` com config própria do Vitest (`npm run balanco`), fora do `npm test` normal porque é lento.
  Usa `Game` + `criarRng(semente)` + `p1cpu`/`cpu` (já existem). Matriz de pares ordenados (os dois lados),
  N sementes por par (padrão 100; no CI só 2, como fumaça de determinismo).
- **Determinismo:** mesma semente rodada duas vezes = mesmo hash do estado final. Teste no `npm test` normal.
- **Relatório** (`relatorios/balanco-<data>.md`, fora do git): taxa de vitória por par e geral, duração média,
  % de tempo esgotado, dano por acerto, uso de cada especial.
- **Metas** (sinalizam, não decidem sozinhas):

| Métrica | Meta |
|---|---|
| Qualquer par (lutador A vence B) | ≤ 65% (já está no PLANO, F5) |
| Taxa geral de cada lutador (incl. chefão jogável) | 42–58% |
| Tempo esgotado | < 10% das lutas |
| Chefe-papel vs cada lutador (CPU NORMAL como "jogador") | jogador vence 20–40% |
| HP dos novos | dentro da faixa atual 94–108 (chefão jogável idem; chefe-papel usa `hpPorBarra`) |

- **Limite honesto:** CPU × CPU mede a força do lutador **nas mãos da CPU**. Lutador de execução difícil parece
  fraco; especial novo sem `ia` parece inútil. Por isso a F5 completa = frame data + simulação + sessão de jogo do
  dono registrada (o veredito humano manda no chefão, que é sobre sensação).

---

## 7. Pipeline de arte por personagem (o que bloqueia no dono)

Por lutador novo (mesmo pipeline da F2; precedente do WEI LONG em `docs/proposta-wei-long.md`):

| Passo | Quem | Bloqueia? |
|---|---|---|
| 1. Conceito aprovado (nacionalidade, estilo, 3 especiais, paleta, `fire`) | Apolo propõe → **dono aprova** | Sim (ED1) |
| 2. Prompts das folhas: base, reação, golpes, especiais (≈ 4 folhas 4×3 cobrindo as 49 poses canônicas), fundo de chave limpo, **sem efeitos desenhados** (D2), grade regular (lição da MIN-JI, D3) | Apolo | — |
| 3. Gerar as folhas | **dono** | Sim — maior risco de calendário |
| 4. Curadoria: consistência de traje entre folhas (armadilha conhecida: a IA troca detalhes entre folhas) | Apolo → dono regenera o que falhar | Sim, em ciclos |
| 5. Chave/fatiar/normalizar/empacotar (`npm run sprites -- <id>`) | Vega (ferramenta da F2) | depende da F2 pronta |
| 6. Marcador: pose, pés, ponta, rosto (~15 min/lutador quando a ferramenta estiver pronta) | Apolo ou dono | leve |
| 7. Cenário da casa | Apolo prompt → **dono gera** | Sim |
| 8. Efeitos procedurais dos especiais (estilo de projétil, aura) | Lyra | — |

Mínimo para o lutador entrar jogável: as 13 poses mínimas do C1 (o resto cai no `FALLBACK`). Dá para colocar um
lutador **em teste** com 13 poses e completar as 49 depois.
**Chefão:** quadros maiores (escala 1,25–1,35) pedem resolução de origem maior para não borrar; conta com 2–3
páginas de atlas (seção 1.4). É a arte mais cara do pacote.
**Total de arte nova da expansão:** 5 personagens × ~4 folhas (+ regenerações) + 5 cenários + 5 retratos (automáticos).

---

## 8. Fases da expansão

Tamanho: P ≈ 1–2 sessões, M ≈ 3–5, G ≈ 6+. Prefixo **E** para não confundir com F0–F7.

| Fase | O quê | Dono | Tam. | Depende de |
|---|---|---|---|---|
| **E0** Decisões | Dono responde ED1–ED12 (seção 9); Apolo fecha conceito → primitiva (tabela 2.2) | dono + Apolo | P | proposta do Apolo |
| **E1a** Motor para N lutadores | `IDS_LUTADORES`; `idPrototipo` opcional; `corpo`; `resolverVidaZerada` extraído; `CenarioDef.casa: IdLutador`; estilos de projétil unificados. **Zero mudança de comportamento** | Vega | P | F1c concluída |
| **E1b** UI e assets para N | tirar todo "4" literal; `VITRINE`; carga sob demanda + `retrato.webp`; C1 v2 (páginas) no loader | Lyra | M | F1c concluída; C1 v2 acordado com Vega (F2) |
| **E2** Progresso v2 | chave `-v2`, migração, saneamento, `src/meta/` (liberados, vitória, escada), testes da seção 3.5 | Cronos | P | E0 só para o conteúdo da fila (testa com ids falsos antes) |
| **E3** Mecânicas novas + chefão | primitivas escolhidas na E0, `ConfigChefe`, barras, `IA_CHEFE`, dicas `ia`, C3 aditivo | Vega | M–G | E1a, E0 |
| **E4** Arcade + seleção | `etapas`, aviso de chefe, VS do chefão, tela de desbloqueio, grade 3×3 com estados, HUD de barras | Lyra | M | E1b, E2 (E3 pode entrar como stub de C3) |
| **E5** Conteúdo ×5 | por personagem: dados + atlas + cenário + FX procedural. Pode entrar **lutador provisório** (dados novos sobre um atlas existente, só em dev) para não esperar a arte | Vega (dados) + Lyra (FX) + Apolo (arte) + **dono** (gerar) | G | E0, F2 pronta, E3 (a primitiva do lutador) |
| **E6** Balanceamento | harness de frame data e simulação (pode nascer após E1a com os 4 atuais) → rodada final com os 9 | Íris + Vega | M | harness: E1a; rodada final: E5 |
| **E7** Celular | portão de desempenho e memória com chefão em cena e 9 retratos | Lyra + Vulcano | P–M | E5 (pesos reais) |
| **E8** Segurança, deploy, docs | Órion revisa saneamento do storage v2; Vulcano publica com rollback; Alexandria escreve o guia "como adicionar um lutador" (seção 1.3) | Órion → Vulcano → Alexandria | P | E6, E7 |

```
F1c ──┬──► E1a ──┬──► E3 ──────────┐
      │          └──► E6(harness)  ├──► E5 (×5, ritmo da arte) ──► E6(final) ──► E7 ──► E8
      ├──► E1b ──┬──► E4 ◄── E2    │
      │          │                  │
E0 ───┴──────────┴──► E2, E3, E5 ───┘
F2 (pipeline) ────────────────────────► E5
```

Paralelos possíveis já: **E1a ∥ E1b ∥ E2** logo depois da F1c (fronteiras: C3, `Persistencia`, `src/meta/`).
E4 ∥ E3 com o C3 aditivo da seção 2.5 como contrato. O **caminho crítico é a arte** (E0 → dono gera → E5),
não o código. Por isso o código (E1–E4) deve ficar pronto cedo, com lutador provisório, e a arte entra em ondas.

---

## 9. Decisões que são do dono

| # | Decisão | Opções | Recomendação da Nova |
|---|---|---|---|
| **ED1** | Conceitos dos 4 novos + chefão | proposta do Apolo | aprovar com no máximo 1 primitiva nova por lutador (tabela 2.2) |
| **ED2** | Ordem da fila de desbloqueio | — | o mais simples de jogar primeiro, o mais técnico por último |
| **ED3** | "Zerar o Arcade" e "derrotar o chefão" coincidem (o chefão é a última luta) | (a) a 1ª zerada libera o próximo da fila **e** o chefão; (b) o chefão só aparece no Arcade depois dos 4 novos liberados; (c) chegar ao chefão já conta como zerar, vencê-lo libera o chefão | **(a)** — simples e fiel ao pedido; se quiser o chefão mais raro, (b) |
| **ED4** | Tamanho da escada | todos os 7 outros + chefão (8 lutas, ~15 min) · N fixo | **5 rivais + chefão** (6 lutas); é só um número em `data/` |
| **ED5** | Lutador travado pode aparecer como rival no Arcade? | sim (vitrine, dá vontade de liberar) · não | **sim** |
| **ED6** | Formato da luta do chefão | round único com 2 barras · melhor de 3 com HP maior | **round único, 2 barras** |
| **ED7** | Arcade jogando com o chefão | escada sem chefe · espelho do chefão (paleta alternativa) | **escada sem chefe** nesta expansão |
| **ED8** | Lançamento | tudo junto · em ondas · MVP com 4 e expansão como atualização | **MVP com 4 conforme o PLANO; expansão em ondas** (o sistema funciona com fila parcial) |
| **ED9** | Dificuldade e continues contam para desbloquear? | qualquer · só NORMAL+ · sem continue | **qualquer dificuldade, com continues** |
| **ED10** | 4º especial / "super" | sim · não | **não nesta expansão** (mexe em C2, toque, CPU e tela de golpes) |
| **ED11** | Cenários novos | 1 por lutador + arena do chefão · reaproveitar | **5 novos** (a regra "casa do rival" pede) |
| **ED12** | Música própria do chefão (sintetizada, D8) | sim · não | sim, se sobrar tempo (Vega, não bloqueia nada) |

---

## 10. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| RE1 | **Calendário da arte**: 5 personagens + 5 cenários gerados pelo dono, com regenerações | Alta | Alto | código pronto antes com lutador provisório; ondas; 13 poses mínimas para entrar em teste |
| RE2 | Inconsistência de traje/escala entre folhas da IA | Alta | Médio | curadoria do Apolo por folha; prompts com descrição fixa do traje; normalização da F2 |
| RE3 | 49 poses não cabem em um atlas 2048² (chefão com certeza não) | Média | Médio | C1 v2 com páginas decidido **antes** do empacotador da F2 |
| RE4 | Memória no celular com 9 lutadores | Alta (sem carga sob demanda) | Alto | carga sob demanda + retratos separados (E1b), portão E7 medido |
| RE5 | Primitiva nova muda o comportamento dos 4 originais | Média | Alto | regra aditiva + fidelidade/snapshot como portão, sem atualizar snapshot |
| RE6 | CPU usa mal os especiais novos → balanço e chefão distorcidos | Alta | Médio | dica `ia` por golpe; frame data medida; sessão de jogo do dono |
| RE7 | Chefão frustrante ou fácil demais | Média | Médio | metas da seção 6 + veredito humano; parâmetros todos em `ConfigChefe` (ajuste sem código) |
| RE8 | Perda de progresso em migração/rollback | Baixa | Alto | chave nova `-v2`, `-v1` preservada, apagar só depois de gravar; testes da 3.5 |
| RE9 | Escopo infla (cada lutador vira projeto) | Média | Alto | catálogo fechado; ≤ 1 primitiva nova por lutador; super fora |
| RE10 | Casas 3×3 pequenas para o dedo | Média | Baixo | medir no aparelho; alternativa 4+4 |
| RE11 | Infra de teste assume f1..f4 | Média | Baixo | `idPrototipo` opcional; fidelidade itera só os originais |

**Dívidas conscientes:** chave `inno-fighters-v1` mantida por uma release (apagar depois); escada sem chefe-espelho
quando o jogador é o chefão; super/4º especial adiado; balanço por CPU tem viés (complementado por jogo humano).

---

## 11. Resumo para quem implementa

- Vega: E1a → E3 (motor), dados da E5, harness da E6. Contratos: tabela 1.2, seção 2.3, C3 da 2.5.
- Lyra: E1b → E4, FX da E5, E7. Contratos: C1 v2 (1.4), carga sob demanda (1.5), C3 da 2.5, estados da seleção (5).
- Cronos: E2 inteira (seção 3). Pode começar junto com E1, com ids falsos nos testes.
- Íris: valida E1 (fidelidade intacta), E2 (migração), E6 (relatório de balanço).
- Apolo + dono: E0 e a arte da E5 — é o caminho crítico.
