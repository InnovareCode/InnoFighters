# InnoFighters — Plano de transformação do protótipo em projeto

> Autora: Nova (arquitetura) · 2026-10-20 · Status: **proposta, aguardando decisões do dono (seção 9)**
> Este documento planeja; não implementa nada.

---

## 1. Contexto e hipóteses declaradas

| Hipótese | Consequência na arquitetura |
|---|---|
| Projeto novo, **sem backend** por ora | Site 100% estático. Nada de servidor, conta, ranking online ou netplay no MVP. |
| **MVP jogável no navegador**, desktop + celular | Canvas 2D, controles de toque, PWA para tela cheia no celular. |
| **Dono solo**, sem prazo duro declarado | Stack mínima, sem framework de jogo pesado, sem monorepo. Fases pequenas e entregáveis. |
| Escala: dezenas a poucos milhares de jogadores | Hospedagem estática gratuita ou na infraestrutura que já existe; CDN basta. |
| Público joga **local** (1P vs CPU, 2P no mesmo teclado, treino, arcade) | Mantém os modos que o protótipo já tem. Online fica explicitamente fora. |

**Fora do escopo do MVP (dívida consciente):** netplay/rollback, ranking online, contas, loja,
mais de 4 lutadores, editor de combos, i18n além de PT-BR.

---

## 2. Diagnóstico do protótipo (o que existe hoje)

Arquivo: `prototipo/inno-fighters-artefato.html` — 2.419 linhas, **9,1 MB**, dos quais
~8,9 MB são a linha 320 (`const ASSETS`, Base64).

### 2.1 O que já é bom (e deve ser preservado)

- **Loop com passo fixo de 60 Hz** (`STEP = 1000/60`, acumulador). Base certa para jogo de luta.
- **Resolução lógica 960×540** desenhada em canvas 1920×1080 (`RS = 2`) — independe do tamanho da tela.
- **Dados de golpe tabelados** (`BASE_MOVES` + `CHAR_MODS` + `CHAR_SPECIALS`): startup/active/recovery,
  dano, hitstun, níveis (mid/low/over/throw), ranks de cancelamento. Isso é o coração do jogo e já
  está separado da lógica.
- Comandos clássicos (qcf, qcb, dp) em notação numérica, CPU com dificuldade, 13 cenas
  (boot, intro, title, menu, select, diff, vs, fight, how, options, result, continue, ending).
- Entrada: teclado (P1/P2), gamepad (`navigator.getGamepads`), toque (joystick + 4 botões + R1 + pausa).
- Áudio **100% sintetizado** com Web Audio (SFX, vozes por formante, sequenciador de música) — 0 bytes de áudio.

### 2.2 Como o protótipo usa a arte

- `ASSETS` tem 8 imagens: `f1..f4` (**WebP com canal alfa**, atlas de ~3600×2290, 1,4–1,6 MB binário cada)
  e `bg`, `bg_cn`, `bg_kr`, `bg_br` (JPEG, ~0,3 MB cada).
- `POSEDATA[fN][pose] = {x, y, w, h, ax, tipX?, tipY?, headX?}`:
  - `x,y,w,h` = recorte no atlas; `ax` = âncora horizontal (centro dos pés) em px do atlas; pés = base do recorte.
  - `tipX/tipY` = ponta do golpe (punho/pé), **já em px lógicos relativos à âncora** (multiplicados por K).
  - `headX` = centro do rosto, usado para recortar o retrato.
- `ch.K = scale * 255 / altura(idle0)` normaliza a altura de cada lutador na tela.
- **As caixas de acerto são derivadas de `tipX/tipY`** (`buildMoves`). Ou seja: errar a ponta do golpe na
  arte nova = alcance errado = balanceamento quebrado. O pipeline de sprites é parte da jogabilidade.
- O flash de dano cria um **segundo atlas inteiro em branco** por lutador (`IMG.fN_w`), dobrando a memória.
- Há uma cadeia de fallback (`ALIAS`, `FALLBACK`) que deixa o jogo rodar com poses faltando.
- Elenco atual: f1 HAYATO (Japão), f2 WEI LONG (China), f3 MIN-JI (Coreia), f4 CAIO (Brasil).
  `CHARS.f1.stage = 'bg_jp'`, mas **não existe `bg_jp` em ASSETS** — cai no `bg` genérico.

### 2.3 Dívidas encontradas

- Tudo em um arquivo, sem módulos, sem testes, sem controle de versão (pasta não é repositório git).
- Linha 1 é o invólucro de "artefato" (CSS/HTML de outro contexto) colado antes do jogo.
- Nome antigo vazando: chave do localStorage `sakura-fighters-v4`; comentário de `CHAR_MODS.f2` diz "KAITO".
- `Math.random` direto na lógica — impossível reproduzir uma luta em teste.
- Memória decodificada: ~33 MB por atlas RGBA + 33 MB da cópia branca → ~260 MB só de lutadores. **Arriscado no iPhone.**

### 2.4 A arte nova (`sprites/`) e o que muda

| Lutador | Folhas | Tamanho | Fundo | Observação |
|---|---|---|---|---|
| CAIO | 4 | 2400×1792 | magenta, com grade escura | FX verdes "assados" nos chutes; sombra roxa no chão |
| MIN-JI | 4 | 2752×1536 | magenta, **sem grade**, layout irregular | **FX rosa sobre fundo magenta** — o recorte por cor vai comê-los |
| WEI LONG | 7 (2 `.jfif` + 5 `.jpg`) | 2400×1792 | magenta (as 7; a "preto" era borda/grade escura — corrigido pela medição do Apolo, ver `docs/proposta-wei-long.md`); 3 com grade | Várias folhas parecem ser variações da mesma coisa — precisa curadoria |
| Cenários | 3 (Rio, palácio coreano, templo chinês) | 2752×1536 | — | Sem cenário do Japão; sem arte nova do HAYATO |

Consequências:
1. **Não há transparência**: JPG com chroma key magenta e artefatos de compressão (o "magenta" varia de
   ~(212,55,206) a (255,0,250)). Precisa de chave por distância de cor + remoção de franja (despill) + limpeza de borda.
2. **Recorte não é uniforme**: grade 4×3 em algumas folhas, posição livre em outras → fatiar por grade quando
   houver, por componentes conexos quando não houver (agrupando partículas de FX soltas com o corpo).
3. **Escala varia entre folhas e entre quadros** (é arte gerada por IA) → normalizar pela altura do idle,
   com ajuste manual por quadro.
4. **Âncora (pés), ponta do golpe e rosto** precisam ser marcados por quadro — parte manual inevitável.
5. Sombras de chão "assadas" precisam sair (o jogo desenha a própria sombra em `floorShadow`).
6. Elenco: arte nova cobre 3 dos 4 lutadores (falta HAYATO) e 3 dos 4 cenários (falta o Japão) → **decisão do dono**.

---

## 3. Stack — opções e recomendação

### Opção A — Vite + TypeScript + Canvas 2D, motor próprio (porte do protótipo) ✅ recomendada

- **Prós:** reaproveita ~2.000 linhas já afinadas (frame data, CPU, cenas, HUD procedural); zero dependência de
  runtime; bundle de código < 150 KB; Vite dá dev server, hot reload e build estático; TS pega erro na máquina de
  estados do lutador, que é onde mora o bug de jogo de luta.
- **Contras:** renderização continua em Canvas 2D (CPU-bound em celular fraco); quem resolve escala, atlas, tint e
  carregamento somos nós.
- **Mitigação:** portão de medição na Fase 4. Se o celular-alvo não segurar 60 fps, a camada `render/` é isolada o
  suficiente para trocar o desenho de sprites por PixiJS (Opção C) sem tocar na lógica.

### Opção B — Phaser 3/4 (framework de jogo completo)

- **Prós:** loader de atlas, scale manager, input, áudio e WebGL prontos; tint branco grátis (sem atlas duplicado);
  comunidade grande.
- **Contras:** obriga reescrever a lógica no modelo de cenas/objetos do Phaser; física do framework não serve para
  jogo de luta (frame data é manual de qualquer jeito); ~1 MB de framework; o HUD e os efeitos procedurais
  (≈1.000 linhas de `ctx.*`) precisam ser refeitos. Reescrita grande para um dono solo.

### Opção C — PixiJS (só renderizador WebGL) + lógica própria

- **Prós:** WebGL rápido no celular, tint/filtros baratos, atlas nativo; a lógica do jogo continua nossa.
- **Contras:** o HUD/menus/efeitos desenhados com `ctx` viram `Graphics` do Pixi (reescrita média); ~450 KB;
  duas formas de desenhar convivendo durante a migração.
- **Uso indicado:** plano B de desempenho, não ponto de partida.

**Recomendação: A**, com TypeScript em `strict` desde o início nos módulos novos (`data/`, `fight/`, `assets/`) e
porte progressivo do resto (arquivo `.ts` com tipos frouxos é aceitável na Fase 1; apertar depois).
Justificativa: é a opção que entrega o MVP mais cedo, preserva o que já funciona e deixa a porta do WebGL aberta.

### Ferramentas de apoio (valem para qualquer opção)

| Necessidade | Escolha | Por quê |
|---|---|---|
| Pipeline de imagem | Node + `sharp` | Mesma linguagem do jogo; chroma key, trim, resize, WebP e empacotamento sem Python |
| Testes de lógica | Vitest | Nativo do Vite, roda frame data/combos/comandos sem navegador |
| Testes ponta a ponta | Playwright | Boot → título → seleção → luta com semente fixa; viewports de celular |
| Offline / instalar no celular | `vite-plugin-pwa` (Workbox) | Tela cheia de verdade no iPhone só existe como PWA instalado |
| Hospedagem | estática (ver decisão D6) | Sem backend no MVP |

---

## 4. Arquitetura

### 4.1 Camadas e regra de dependência

```
input/  ──►  InputFrame  ──►  fight/ (lógica pura, determinística)  ──►  estado  ──►  render/  (só lê)
                                   ▲                                                   ▲
                               data/ (golpes, stats)                         assets/ (atlas + manifesto)
ui/ (cenas) orquestra tudo · audio/ reage a eventos da luta · core/ é usado por todos
```

- `fight/` **não importa** nada de `render/`, `ui/`, `audio/` nem DOM. Recebe `InputFrame`, devolve estado + eventos.
  Isso permite testar a luta em Node e, no futuro, rollback/netplay.
- Aleatoriedade via RNG com semente (`core/rng.ts`) injetado — fim do `Math.random` na lógica.
- Áudio e efeitos reagem a **eventos** emitidos pela luta (`hit`, `block`, `ko`, `special`...), não são chamados de dentro dela.

### 4.2 Estrutura de pastas proposta

```
InnoFighters/
├─ PLANO.md · PROGRESSO.md · README.md
├─ index.html                      # só o <canvas>, a camada de toque e o boot
├─ package.json · vite.config.ts · tsconfig.json · .gitignore
├─ prototipo/                      # CONGELADO: referência de comportamento, nunca editado
├─ arte-fonte/                     # arte bruta (fora do bundle) — ver decisão D5 sobre git/LFS
│  ├─ lutadores/{caio,min-ji,wei-long,hayato}/folhas/*.jpg
│  ├─ lutadores/<id>/quadros.json  # mapa quadro→pose, âncora, ponta, rosto (saída do marcador)
│  └─ cenarios/*.jpg
├─ ferramentas/
│  ├─ sprites/                     # pipeline Node: chave.mjs, fatiar.mjs, normalizar.mjs, empacotar.mjs
│  ├─ marcador/                    # página de dev (servida pelo Vite) para marcar pose/âncora/ponta por quadro
│  └─ extrair-prototipo.mjs        # decodifica ASSETS/POSEDATA do protótipo em arquivos (Fase 1)
├─ public/
│  ├─ assets/lutadores/<id>/atlas.webp + atlas.json
│  ├─ assets/cenarios/<id>.webp
│  ├─ icons/ · manifest.webmanifest
├─ src/
│  ├─ main.ts                      # boot, loop de passo fixo
│  ├─ core/        # constantes (W,H,GROUND...), math, rng com semente, storage (com migração da chave antiga)
│  ├─ audio/       # AudioSys, definições de SFX, vozes, sequenciador de música
│  ├─ assets/      # loader com progresso e carga sob demanda, tipos do manifesto, flash branco sob demanda
│  ├─ data/        # base-moves.ts, lutadores/{caio,min-ji,wei-long,hayato}.ts, cenarios.ts, anim.ts
│  ├─ fight/       # fighter.ts (máquina de estados), game.ts (partida/rounds), colisao.ts, comandos.ts, cpu.ts
│  ├─ render/      # pose.ts, efeitos.ts, hud.ts, camera.ts, texto.ts, cenario.ts
│  ├─ ui/          # cenas (boot, intro, title, menu, select, diff, vs, fight, how, options, result, continue, ending), MenuList
│  ├─ input/       # teclado, gamepad, toque → InputFrame; mapeamento de botões
│  └─ platform/    # tela cheia, orientação, visibilidade/pausa, registro do service worker
└─ tests/
   ├─ unit/        # frame data, comandos (qcf/dp), dano/escala de combo, bloqueio por nível, migração do storage
   └─ e2e/         # fumaça com semente fixa, viewports desktop e celular
```

### 4.3 Contratos internos (definidos ANTES da Fase 1 dividir trabalho em paralelo)

Não há API HTTP. Os contratos que permitem Vega, Lyra e o pipeline trabalharem em paralelo são estes quatro.

**C1 — Manifesto de atlas (`public/assets/lutadores/<id>/atlas.json`)** — produzido pelo pipeline, consumido por `assets/`:

```json
{
  "versao": 1,
  "lutador": "caio",
  "imagem": "atlas.webp",
  "tamanho": [2048, 2048],
  "alturaRef": 410,
  "quadros": {
    "idle0": { "x": 8, "y": 8, "w": 289, "h": 410, "ax": 137, "rosto": [150, 60] },
    "hp1":   { "x": 1453, "y": 912, "w": 384, "h": 421, "ax": 168, "ponta": [216, 300] }
  }
}
```

- Tudo em **px do atlas**. Pés = base do recorte (`y + h`). `ponta` e `rosto` relativos ao canto superior esquerdo do quadro.
- A conversão para o formato legado (`tipX/tipY` em px lógicos relativos à âncora, multiplicados por K) acontece
  **no loader**, uma vez. Armadilha documentada: o protótipo guarda `tipX/tipY` já escalados; o manifesto não.
- `alturaRef` = altura do `idle0`; o jogo calcula `K = scale * 255 / alturaRef`.
- **Poses canônicas (49):** `idle0-3`, `walk0-7`, `crouch`, `block`, `cblock`, `jsquat`, `jup`, `jtop`, `jfall`,
  `land`, `hitH`, `hitB`, `kdAir`, `koFloor`, `lp0/1`, `hp0/1`, `lk0/1`, `hk0/1`, `clp`, `clk`, `sweep`, `upper`,
  `sa0-3`, `sb0-3`, `sc0/1`, `jkick`, `jpunch`, `win`.
  Mínimo para um lutador entrar no jogo: `idle0`, `walk0`, `crouch`, `block`, `jtop`, `hitH`, `koFloor`,
  `lp1`, `hp1`, `lk1`, `hk1`, `sa1`, `win` — o resto cai na cadeia de fallback que já existe.
- Ponta obrigatória em todo quadro ativo de golpe (`lp1 hp1 lk1 hk1 clp clk sweep upper sa1 sa2 sb1 sb2 sc1 jkick jpunch`).

**C2 — `InputFrame`** (por jogador, por tick) — produzido por `input/` e pela CPU, consumido por `fight/`:

```ts
type InputFrame = {
  left: boolean; right: boolean; up: boolean; down: boolean;   // estado segurado
  lp: boolean; hp: boolean; lk: boolean; hk: boolean; sp: boolean; // borda de descida (apertou neste tick)
};
```
Idêntico ao `readInput()` do protótipo — de propósito, para o porte não mudar comportamento.

**C3 — Estado de leitura da luta** — `fight/` expõe, `render/` e `ui/` só leem:
`game.fighters[0|1]` (`x, y, facing, state, pose atual, hp, hpShown, en, flash, combo`), `game.projectiles`,
`game.timer`, `game.round`, `game.cam`, e uma fila `game.events[]` esvaziada por tick
(`{tipo:'hit'|'block'|'ko'|'special'|'round'|'perfect', ...}`) que alimenta áudio e efeitos.

**C4 — Armazenamento local** — chave `inno-fighters-v1`:
`{ "v": 1, "s": { music, sfx, rounds, time, diff, shake, controles? }, "hi": number }`.
Na primeira carga, se existir `sakura-fighters-v4`, migrar `s` e `hi` e apagar a antiga. Teste de unidade obrigatório.

---

## 5. Plano faseado

Tamanho: **P** ≈ 1–2 sessões de trabalho, **M** ≈ 3–5, **G** ≈ 6+.

### Fase 0 — Fundação · dono: **Vulcano** · P · depende de: nada
- `git init`, `.gitignore` (`node_modules`, `dist`, `.missao-atual`, `.missoes-quadro.json`, e `arte-fonte/` conforme D5).
- Vite + TypeScript + Vitest + Playwright + ESLint/Prettier configurados; `npm run dev|build|test|e2e`.
- Mover `sprites/` → `arte-fonte/` com nomes normalizados (sem espaço, sem acento: `wei-long`, `min-ji`).
- CI simples (build + testes de unidade) no push.
- **Entrega:** repositório que builda uma página vazia com o canvas 960×540 escalado.

### Fase 1 — Porte fiel do protótipo · dono: **Vega** (`core/ data/ fight/ audio/`) + **Lyra** (`render/ ui/ input/ platform/`) · G · depende de: F0 + contratos C2/C3/C4
- `ferramentas/extrair-prototipo.mjs`: tira as 8 imagens e o `POSEDATA` do HTML para `public/assets/` + `atlas.json`
  no formato C1 (com a arte antiga). Assim o porte roda **antes** da arte nova existir.
- Quebrar o arquivo único nos módulos da seção 4.2 **sem mudar comportamento**. Únicas mudanças permitidas:
  RNG com semente, fila de eventos (C3), storage com migração (C4), remover o invólucro da linha 1.
- Vega e Lyra trabalham em paralelo porque a fronteira é C2/C3.
- **Entrega:** jogo idêntico ao protótipo, carregando assets como arquivos (~6 MB → servidos com cache, não Base64).
- **Aceite (Íris):** comparação lado a lado com o protótipo (mesma luta com semente fixa, capturas por marco);
  testes de unidade de frame data, comandos e migração de storage; build sem erro.

### Fase 2 — Pipeline de sprites · dono: **Vega** (ferramentas) + **Apolo** (curadoria/arte) · M · depende de: F0 + C1 (roda em paralelo com F1)
1. **Chave de cor:** distância em espaço de cor ao magenta (só magenta: nenhuma folha do WEI LONG tem fundo preto), limiar suave →
   alfa, despill (tira o rosa da borda), erosão de 1 px; remoção da sombra roxa do chão.
2. **Fatiamento:** grade quando detectada (4×3), senão componentes conexos com agrupamento de partículas.
3. **Marcador** (`ferramentas/marcador/`, página só de desenvolvimento): mostra cada quadro, o dono/Apolo
   escolhe a pose canônica, clica nos pés (âncora), na ponta do golpe e no rosto; salva `quadros.json`.
   Esta é a parte manual — calcula-se ~15 min por lutador depois de pronto.
4. **Normalização:** escala de cada quadro para a altura de referência do idle, com ajuste fino manual.
5. **Empacotamento:** atlas WebP com alfa, **≤ 2048×2048** (cabe no limite de canvas do iOS), qualidade ~85 → `atlas.webp` + `atlas.json` (C1).
6. Cenários: redimensionar para 1920×1080 (corte 16:9 da arte 2752×1536), WebP ~80 → meta ≤ 250 KB cada.
- Apolo: escolher as folhas canônicas de WEI LONG, decidir FX assados vs procedurais (D2), pedir nova geração
  da MIN-JI se o rosa não sobreviver à chave (D3).
- **Entrega:** comando único `npm run sprites -- caio` gera o atlas pronto; os 3 lutadores novos e 3 cenários processados.
- **Aceite (Íris):** nenhum pixel magenta residual visível sobre fundo escuro e claro (captura ampliada);
  todas as 13 poses mínimas presentes; toda pose ativa com `ponta`; atlas ≤ 1,2 MB cada.

### Fase 3 — Integração da arte nova · dono: **Lyra** (render) + **Vega** (frame data) · M · depende de: F1 + F2
- Trocar os atlas antigos pelos novos nos três lutadores; cenários novos ligados a `CHARS[id].stage`.
- Remover entradas de `ALIAS` que a arte nova cobre; manter `FALLBACK` como rede de segurança.
- **Recalibrar caixas de acerto** (derivadas da `ponta`) e reafinar `CHAR_MODS` se o alcance mudou.
- Flash de dano sem atlas duplicado: silhueta branca gerada **por quadro, sob demanda**, em cache pequeno (mata ~130 MB de memória).
- Retratos da seleção/HUD a partir do `rosto` do manifesto.
- HAYATO e o cenário do Japão conforme D1.
- **Aceite (Íris):** cada lutador executa todos os golpes em treino com caixas de acerto visíveis (modo debug)
  batendo onde o desenho bate; nenhuma pose "pulando" de escala ou de posição entre quadros.

### Fase 4 — Celular e plataforma · dono: **Lyra** + **Vulcano** (PWA/cache) · M · depende de: F3 (precisa dos pesos reais); a parte PWA pode começar após F1
- PWA: `manifest.webmanifest` com `display: fullscreen`, `orientation: landscape`; service worker com cache dos assets
  (jogo funciona offline depois da 1ª visita).
- Carga sob demanda: título carrega só o essencial; atlas dos lutadores e cenário carregam na tela VS (com barra).
- Áudio no iOS: desbloqueio no primeiro toque (já existe `startAudio`), `navigator.audioSession.type = 'playback'`
  onde houver, retomada após `visibilitychange`.
- Controles de toque: revisar áreas de toque com dedo real, opção de tamanho/opacidade nos ajustes, vibração curta no acerto (Android).
- **Portão de desempenho (medido, não deduzido):** 60 fps estáveis e memória < 300 MB num Android intermediário e
  num iPhone de 3–4 anos. Se falhar: (a) atlas em meia resolução para celular; (b) só então Opção C (Pixi) na camada `render/`.
- **Aceite (Íris):** Playwright em viewports de celular (paisagem/retrato) + teste manual em 2 aparelhos reais registrado.

### Fase 5 — Balanceamento e QA · dono: **Íris** (testes) + **Vega** (ajustes) · M · depende de: F3
- Matriz lutador × lutador na CPU em dificuldade média/difícil; partidas de CPU vs CPU com semente para detectar
  vantagem absurda (taxa de vitória > 65% sinaliza).
- Suíte de regressão: comandos, bloqueio por nível, combos com rank, KO/rounds/tempo, pausa, continue.
- **Aceite:** veredito APROVADO da Íris com evidência (relatório de taxas e testes verdes).

### Fase 6 — Segurança leve e deploy · dono: **Órion** (revisão) → **Vulcano** (deploy) · P · depende de: F4 + F5
- Órion: CSP restritiva (sem terceiros), nada sensível em localStorage, dependências auditadas (`npm audit`).
- Vulcano: deploy estático com cache longo para `assets/` (nome com hash) e curto para `index.html`/SW;
  preview por branch; rollback = republicar o build anterior.
- **Entrega:** URL pública jogável.

### Fase 7 — Documentação · dono: **Alexandria** · P · depende de: F6 (pode rascunhar desde F2)
- README (rodar, buildar, controles), **guia "como adicionar um lutador"** (folhas → pipeline → marcador → `data/lutadores/<id>.ts`),
  tabela de frame data gerada a partir de `data/`.

### Grafo de dependências

```
F0 ──┬──► F1 ──┬──► F3 ──┬──► F4 ──┐
     │         │         └──► F5 ──┼──► F6 ──► F7
     └──► F2 ──┘                   │
          (F2 em paralelo com F1)  (PWA de F4 pode começar logo após F1)
```

Caminho crítico: **F0 → F1 → F3 → F4 → F6**. F2 é o maior risco de atraso, por isso começa junto com F1.

---

## 6. Orçamentos (metas mensuráveis)

| Item | Meta |
|---|---|
| Código JS (gzip) | ≤ 150 KB |
| Atlas por lutador (WebP alfa) | ≤ 1,2 MB, ≤ 2048×2048 |
| Cenário (WebP) | ≤ 250 KB, 1920×1080 |
| Primeira carga até o título | ≤ 1,5 MB |
| Até a primeira luta (2 lutadores + 1 cenário) | ≤ 4 MB |
| Memória de imagem decodificada em luta | ≤ 120 MB (hoje ~260 MB) |
| Quadros | 60 fps estáveis nos aparelhos do portão da F4 |

---

## 7. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **Chave de cor ruim**: JPG com magenta irregular deixa franja rosa; FX rosa da MIN-JI some junto com o fundo | Alta | Alto | Despill + limiar suave; teste visual em fundo claro e escuro; plano B = regenerar MIN-JI com fundo verde ou já transparente (D3) |
| R2 | **Escala e enquadramento inconsistentes** entre quadros gerados por IA → personagem "pulsa" ao andar | Alta | Médio | Normalização pela altura do idle + ajuste fino no marcador; revisão quadro a quadro na F3 |
| R3 | **Alcance dos golpes muda** com a arte nova (caixas derivam da ponta) → balanço quebra | Alta | Médio | `ponta` obrigatória no manifesto; F5 com CPU×CPU por semente |
| R4 | **Memória no iPhone**: atlas grandes + cópia branca estouram o limite e a aba recarrega sozinha | Média | Alto | Atlas ≤ 2048², flash branco por quadro, carga sob demanda, portão medido na F4 |
| R5 | **Peso**: arte bruta são ~40 MB; se entrar no bundle, o jogo fica inviável no 4G | Média | Alto | `arte-fonte/` fora de `public/`; orçamentos da seção 6 verificados no build |
| R6 | **Áudio no iOS**: Web Audio mudo com a chave de silêncio, suspenso ao trocar de app | Alta | Médio | `audioSession`, retomar em `visibilitychange`, aviso discreto "som desligado pelo aparelho" |
| R7 | **Tela cheia no iPhone**: a API de fullscreen não existe no Safari de iPhone | Certa | Médio | PWA instalado (`display: fullscreen`); instrução "Adicionar à Tela de Início" na primeira visita |
| R8 | **Canvas 2D lento** em celular fraco (muitos gradientes radiais por quadro nos efeitos) | Média | Médio | Pré-renderizar gradientes recorrentes em canvas pequenos; Pixi como plano B só na camada `render/` |
| R9 | **Porte quebra o "feel"** do jogo sem ninguém notar | Média | Alto | F1 proíbe mudança de comportamento; comparação lado a lado com semente fixa |
| R10 | **Estilo misturado** se HAYATO ficar com a arte antiga | Certa (se D1 = manter) | Baixo/Médio | Decisão do dono (D1) |

**Dívidas conscientes:** sem netplay (a lógica determinística deixa a porta aberta); Canvas 2D em vez de WebGL;
áudio sintetizado em vez de trilha gravada; marcação manual de quadros.

---

## 8. Divisão de responsabilidades (resumo)

| Agente | Fases | O quê |
|---|---|---|
| Vulcano | F0, F4 (PWA/cache), F6 | Repositório, build, CI, PWA, deploy |
| Vega | F1, F2, F3, F5 | Lógica da luta, dados, áudio, pipeline de sprites, balanceamento |
| Lyra | F1, F3, F4 | Render, cenas, HUD, entrada (toque/gamepad), celular |
| Apolo | F2 (+ D1/D2) | Curadoria e direção de arte, folhas canônicas, regeneração |
| Íris | aceite de F1–F5 | Testes de unidade, e2e, comparação com protótipo, matriz de balanço |
| Órion | F6 | Revisão leve (CSP, dependências) |
| Alexandria | F7 | README, guia de lutador novo, tabela de frame data |
| Cronos | — | Não há banco no MVP |

---

## 9. Decisões que dependem do dono

| # | Decisão | Opções | Recomendação da Nova |
|---|---|---|---|
| **D1** | HAYATO (Japão) não tem arte nova, nem o cenário do Japão | (a) lançar com 3 lutadores; (b) manter HAYATO com a arte antiga; (c) gerar arte nova antes do lançamento | (a) no MVP, (c) logo depois — evita estilo misturado e não segura o lançamento |
| **D2** | FX assados nos sprites (rastros verdes do CAIO, rosa da MIN-JI) vs rastro procedural do jogo (`drawSwing`) | (a) manter os assados e desligar o procedural para esses golpes; (b) limpar os assados e usar só o procedural | (b) — consistente entre lutadores, sem conflito com a chave de cor |
| **D3** | MIN-JI tem FX rosa sobre fundo magenta | (a) regenerar as folhas com fundo verde/transparente; (b) limpeza manual | (a) — mais barato que limpar à mão 48 quadros |
| **D4** | Folhas de WEI LONG: 7 arquivos, alguns parecem variações | Apolo propõe as canônicas e o dono aprova | — |
| **D5** | Versionar a arte bruta (~40 MB) no git? | (a) git LFS; (b) fora do git, com backup em nuvem; (c) git normal | (a) se houver remoto com LFS; senão (b) |
| **D6** | Onde publicar | (a) subdomínio próprio (ex.: `innofighters.innovarecode.com.br`) na infra existente; (b) Cloudflare Pages / Netlify grátis | (b) para o MVP — zero custo e preview por branch; aponta o subdomínio depois |
| **D7** | TypeScript | (a) TS estrito nos módulos novos e porte progressivo; (b) JS + JSDoc | (a) |
| **D8** | Áudio | (a) manter 100% sintetizado; (b) trilha gravada (mais bonita, +1–3 MB) | (a) no MVP |
| **D9** | Nome definitivo e chave de armazenamento | "InnoFighters" / `inno-fighters-v1` (migrando de `sakura-fighters-v4`) | Confirmar |

## 10. Decisões do dono (2026-10-20)

Respondem à seção 9. Onde divergem da recomendação da Nova, vale a decisão do dono.

| # | Decisão do dono | Efeito no plano |
|---|---|---|
| D1 | Gerar arte nova do HAYATO antes do lançamento (4 lutadores) | Diverge da recomendação. HAYATO e cenário do Japão entram no caminho crítico da F2/F3; Apolo escreve os prompts |
| D2 | Rastro só do jogo (drawSwing) | Pipeline remove os FX pintados nas folhas |
| D3 | Regenerar folhas da MIN-JI (fundo verde/transparente, sem FX, grade regular) | F2 espera as folhas novas da MIN-JI |
| D4 | Apolo propõe as canônicas do WEI LONG agora | Saída em docs/proposta-wei-long.md; dono aprova |
| D5 | Arte bruta fora do git, backup em nuvem | rte-fonte/ no .gitignore; atlas processados versionados |
| D6 | Infra própria (subdomínio do innovarecode.com.br) | Diverge da recomendação. F6: Vulcano levanta servidor e forma de deploy com o dono |
| D7 | TypeScript estrito | Como recomendado |
| D8 | Áudio 100% sintetizado | Como recomendado |
| D9 | InnoFighters / inno-fighters-v1 com migração de sakura-fighters-v4 | Como recomendado |
