# Revisão completa "planejado x entregue" — InnoFighters

Autora: Nova (arquitetura), 2026-10-23. Base: HEAD `f5b5fab` (árvore limpa no código; só memórias de agentes não rastreadas).
Somente leitura do código. Fontes do planejado: `PLANO.md` (F0-F7, §6, §7, §10), `docs/plano-expansao.md` (E0-E8, ED1-ED12),
`PROGRESSO.md`, `CONTEXTO-SESSAO.md` e as 7 specs `docs/spec-*.md`.

**Como ler o status:** feito = existe no código e tem teste ou medição registrada; parcial = existe mas falta parte do aceite;
faltando = não existe; desviou = existe diferente do plano (com ou sem decisão do dono).
**Nível de prova** (skill `quem-valida-o-que`): o que eu rodei nesta auditoria está marcado **[medido]**; o que li no código,
**[lido]**; o que vem de handoff ou commit de outro agente e não reconferi, **[declarado]**; o que deduzi, **[inferido]**.

---

## 0. Resumo executivo

1. O jogo está muito além do MVP planejado: 10 lutadores, 6 chefões progressivos (5 guardiões + ZENON), esquiva, cinemática do
   especial com tarja, provocação, sons por lutador com amostras CC0, temas musicais, trailer de abertura. Tudo isso está ligado
   em produção (`src/meta/regras.ts:24-39`, `src/audio/chaves.ts:14-23`) [lido].
2. **A revisão do motor (`docs/spec-revisao-motor-luta.md`) não tem uma linha implementada.** Não há `revisaoMotor`,
   `rotasCombo`, `janelaCancel` nem `escalaComboRevisada` em `src/` ou `tests/`. O buffer continua 9 ticks
   (`src/fight/fighter.ts:508`), o cancel continua na recuperação inteira (`fighter.ts:766`) e o scaling continua
   `max(0,5; 1 − 0,1·n)` (`src/fight/colisao.ts:61-62`) [lido]. Da frente "motor de luta", só a **tarja** foi entregue
   (`f5b5fab`, `src/render/cinematica.ts`).
3. **A spec da revisão não cobre o pedido do dono** em 3 dos 5 pontos: não tem o "filmezinho só quando conecta" (c), não trata
   pose, interpolação nem arte (d), e os combos próprios (a) estão numa tabela que mistura cancel, link e oki e não cabe no
   contrato que ela mesma propõe. O dano dos especiais (b) sobe **cerca de 1,9× na mediana** (1,6× a 3,0×), e a própria spec passa do
   teto de 45% que ela fixou (seção 5).
4. Três achados de código que mudam o desenho da revisão e não estão na spec: (i) **toque durante o hitstop é perdido**: o
   motor retorna antes de ler a entrada (`src/fight/game.ts:405-408` antes de `:417`), e a borda é apagada a cada tick
   (`src/main.ts:212`); (ii) **a "suavidade" procedural do protótipo está desligada para os 10 lutadores**: antecipação,
   squash e inclinação só rodam com `legacy`, que é `!pd['walk7']` (`src/data/montar.ts:198`), e todo atlas tem `walk7`
   [medido nos 10 `atlas.json`]; (iii) **não há interpolação de desenho** entre ticks (`src/main.ts:205-215`).
5. Do plano original, o que mais falta é: **arte nova de CAIO e WEI LONG** (ainda os atlas v1 de 3600 px do protótipo), **os 3
   cenários originais** (cn, kr e br ainda são os JPG de 1600x900 do protótipo), **portão em aparelho real**, **PWA offline**,
   **deploy final (EasyPanel)** e os **orçamentos de memória e peso**, que estão estourados.
6. A documentação de estado está atrasada 9 commits: `PROGRESSO.md`, `CHANGELOG.md`, `README.md` e `docs/arquitetura.md` param
   em `64f2647` (2026-10-21). Não registram sons reais, trailer, logo oficial, opções fixas nem a tarja [medido por `git log`].
7. Testes nesta auditoria **[medido]**: `tsc --noEmit` limpo; `vitest run` com 2 449 verdes, 14 pulados e **2 estouros de
   tempo de 5 s sob carga** (`chefe-adversarial.test.ts`, `sons-volume.test.ts`). Rodados sozinhos: 48 de 48 verdes. São testes
   frágeis por tempo, não regressão, mas podem derrubar a CI e, com ela, o deploy do Pages. E2E não rodado (regra: só a Lyra).

---

## 1. Tabela por fase e por spec

### 1.1 PLANO.md, fases F0 a F7

| Fase | Planejado | Entregue (arquivo:linha) | Status | Evidência |
|---|---|---|---|---|
| F0 Fundação | git, Vite+TS+Vitest+Playwright, ESLint/Prettier, `arte-fonte/`, CI build+unit | `package.json` (scripts), `.github/workflows/ci.yml` (typecheck, test, build), `.gitignore` | **parcial** | Sem ESLint/Prettier (nenhuma dependência nem config) [lido]. Resto feito. |
| F1 Porte fiel | módulos 4.2, RNG com semente, fila de eventos C3, storage C4, aceite lado a lado | `src/{core,data,fight,audio,render,ui,input,platform}`; `src/core/rng.ts`; `tests/unit/luta-fidelidade.test.ts`; `tests/e2e/fidelidade-prototipo.spec.ts` | **feito** (aceite em aparelho real **faltando**) | 2 449 unit verdes [medido]. `fidelidade-prototipo.spec` é instável conhecido, falha até em commit limpo (`CONTEXTO-SESSAO.md:64`) [declarado]. Som, gamepad real e iOS nunca provados (`PROGRESSO.md:70`). |
| F2 Pipeline de sprites | chave, fatiar, **marcador manual**, normalizar, empacotar ≤ 2048², `npm run sprites`; 3 lutadores e 3 cenários processados | `ferramentas/sprites/{cli,nucleo,empacotar,poses}.mjs`; `npm run sprites` | **parcial / desviou** | `ferramentas/marcador/` existe **vazia** [medido]; âncora e ponta saem do pipeline automático (desvio sem decisão registrada que eu tenha achado). CAIO e WEI LONG **não processados** (`docs/handoff-vega-f2.md:83`). Os 3 cenários de `arte-fonte/cenarios/` (templo chinês, palácio coreano, Rio) **nunca entraram** no jogo. |
| F3 Arte nova no jogo | trocar atlas antigos, recalibrar caixas, flash por quadro sob demanda, retratos pelo `rosto`, HAYATO e Japão (D1), aceite com caixas visíveis | 8 lutadores em C1 v2; `retrato.png` dos 10; HAYATO e `cenario-jp.webp` (D1 feito) | **parcial** | CAIO e WEI LONG em atlas v1 3600x2251 e 3600x2296 [medido]. Flash é **por página**, não por quadro (`src/assets/carregador.ts:122-138`) [lido]. Tecla H alterna `game.debug` (`src/ui/cenas/fight.ts:629`), mas **nada desenha caixas** (nenhum leitor de `debug` em `src/render`) [lido]: o aceite "caixas visíveis batendo onde o desenho bate" não é verificável. |
| F4 Celular e plataforma | PWA com SW e offline, carga sob demanda, `audioSession`, `visibilitychange`, tamanho/opacidade do toque, vibração, **portão medido em 2 aparelhos** | `public/manifest.webmanifest`; carga sob demanda (E1b); `src/platform/foco.ts:18` (visibilidade); `src/platform/audio-desbloqueio.ts`; `src/platform/tela-cheia.ts` | **parcial** | Sem service worker nem `vite-plugin-pwa` [lido]. Sem `navigator.audioSession` e sem `navigator.vibrate` (grep vazio). Opções sem tamanho/opacidade do toque (`src/ui/cenas/options.ts:108-151`). Portão só no Pixel 7 emulado, com CPU 4x (`docs/handoff-lyra-e7a.md`) [declarado]. Manifesto `display: standalone` + `display_override` (o plano dizia `fullscreen`, desvio menor). |
| F5 Balanceamento e QA | matriz CPU×CPU, par ≤ 65%, suíte de regressão, veredito da Íris | `ferramentas/balanco/*`, `npm run balanco`, `docs/balanco/resultados.md` (25 800 lutas, 0 travadas) | **feito** (dados de 2026-10-21) | Taxas de 42,7% a 57,2%; nenhum par marcado `!`; P1 vence 53,2% [lido no relatório]. O motor não mudou desde a rodada (só +3 linhas em `src/core/contratos.ts`) [medido por `git diff 955e720`]. 4 de 6 chefões fora da faixa no DIFÍCIL (decisão provisória do Atlas). |
| F6 Segurança e deploy | CSP, `npm audit`, deploy estático com cache e rollback, **infra própria (D6)** | CSP por `<meta>` (`vite.config.ts:20-28`), e2e de build (`tests/e2e-build/*`), `pages.yml` com testes como portão, actions pinadas, Dependabot | **parcial / desviou** | No ar só o **GitHub Pages temporário e público** (decisão do dono). EasyPanel não existe. `sourcemap: true` (`vite.config.ts:77`). Órion revisou até a E8 prévia (2026-10-21); sons reais, amostras e trailer **não passaram pelo Órion**, porque a spec do trailer o dispensou. Sem `LICENSE`/`SECURITY.md`. |
| F7 Documentação | README, guia "como adicionar um lutador", tabela de frame data gerada | `README.md`, `docs/como-adicionar-um-lutador.md`, `docs/arquitetura.md`, `docs/balanco/frame-data.md` (gerado) | **feito, desatualizado** | Os 4 documentos param em `64f2647` (2026-10-21); 9 commits depois não estão neles [medido]. |

### 1.2 Orçamentos (PLANO §6)

| Item | Meta | Hoje | Status |
|---|---|---|---|
| JS (gzip) | ≤ 150 KB | principal 119 KB + pedaços sob demanda 54 KB = **~174 KB** (`dist/` de `f6744bc` com árvore suja, não de HEAD) [medido] | parcial: o pedaço principal cabe, o total não |
| Atlas por lutador | ≤ 1,2 MB e ≤ 2048² | dentro do peso: AMINU 1,06 MB, CAMILLE 0,86, MIN-JI 1,19. Fora: CENTELLA 1,23, HAYATO 1,23, WEI LONG 1,24, NILA 1,45, CAIO 1,58, ZENON 1,71 (a spec dele permite ≤ 3 MB), BAATAR 1,96. **CAIO e WEI LONG passam de 2048 px** [medido] | estourado em 7 de 10 |
| Cenário | ≤ 250 KB, 1920x1080 | 7 novos dentro (138 a 234 KB). `kr.jpg` 305 KB e `br.jpg` 278 KB; os 3 antigos têm 1600x900 [medido] | parcial |
| Primeira carga até o título | ≤ 1,5 MB | não medido nesta auditoria. O boot carrega 10 manifestos, 10 retratos e os 4 atlas da vitrine (~5,4 MB só de atlas, `docs/handoff-lyra-e7a.md`) [inferido: ≥ 5 MB] | estourado (inferido) |
| Até a 1ª luta | ≤ 4 MB | não medido [inferido: acima, pela linha anterior] | provavelmente estourado |
| Memória de imagem em luta | ≤ 120 MB | 136 MB no boot, 208 MB em luta, **287 MB de pico estimado** (E7a, w·h·4) [declarado] | **estourado** |
| 60 fps | nos aparelhos do portão F4 | mediana de 16,7 ms em todas as cenas no Chromium emulado com CPU 4x; aparelho real nunca [declarado] | não provado |

### 1.3 Riscos do PLANO §7, como estão hoje

| # | Risco | Situação |
|---|---|---|
| R1 chave de cor | resolvido nos 8 com arte nova (MIN-JI regenerada em verde, D3). Em aberto onde não houve arte nova (CAIO, WEI LONG). |
| R2 escala e "pulso" entre quadros | sem ferramenta de medição (o marcador não existe). Sem prova registrada de que nenhuma pose "pula". |
| R3 alcance muda com a arte | mitigado pelo harness (F5). Sem desenho de caixas, não dá para conferir o alcance a olho (F3). |
| R4 memória no iPhone | **aberto e piorou**: 287 MB de pico estimado; 2 atlas v1 de 8,3 MP; a silhueta branca cria um canvas do tamanho da página inteira. |
| R5 peso | `arte-fonte/` fora de `public/` (feito). Orçamentos estourados (1.2). |
| R6 áudio iOS | desbloqueio no toque feito (`audio-desbloqueio.ts`); `audioSession` não; aviso de "som desligado pelo aparelho" não [lido]. |
| R7 tela cheia no iPhone | instruções "COMO ATIVAR" (`options.ts:55`); instalável pelo manifesto; offline não. |
| R8 Canvas lento | E7a: quase todo o custo de CPU da seleção vem dos 2 atlas v1 (CAIO e WEI LONG) (`docs/handoff-lyra-e7a.md:89`). |
| R9 porte quebra o "feel" | o porte foi fiel, inclusive no defeito: a suavidade do protótipo ficou presa ao `legacy` (achado 0.4-ii). |
| R10 estilo misturado | virou realidade, por outro caminho: HAYATO tem arte nova, mas CAIO e WEI LONG continuam com a do protótipo, ao lado de 8 lutadores gerados no Runway. |

### 1.4 docs/plano-expansao.md, fases E0 a E8

| Fase | Planejado | Entregue | Status | Evidência |
|---|---|---|---|---|
| E0 Decisões | ED1-ED12 | `PROGRESSO.md:84-92` | feito | todas aprovadas como recomendado |
| E1a Motor para N | `IDS_LUTADORES`, `corpo`, `resolverVidaZerada`... | `src/core/contratos.ts`, `src/data/montar.ts` | feito | snapshot intacto [declarado] |
| E1b UI e assets para N | sem "4" literal, VITRINE, carga sob demanda, `retrato.webp`, C1 v2 | `src/assets/gerenciador.ts`, C1 v2 com páginas | feito / desvio menor | retrato em **PNG** (`public/assets/lutadores/*/retrato.png`), não WebP |
| E2 Progresso v2 | `inno-fighters-v2`, migração, `src/meta/` | `src/core/storage.ts`, `src/meta/progresso.ts` | feito | M1 do Órion corrigido (`storage.ts:47-58`) [lido] |
| E3 Mecânicas + chefão | primitivas, `ConfigChefe`, barras, `IA_CHEFE`, C3 aditivo | `src/fight/*`, `docs/mecanicas-e3.md` S0-S5 | feito | [declarado] em `docs/handoff-vega-e3-*` |
| E4 Arcade + seleção | escada, aviso, VS, desbloqueio, grade, HUD de barras | `src/ui/cenas/{select,vs,chefe,desbloqueio,fim}.ts` | feito | grade de 10 com casa de honra e casa aleatória |
| E5 Conteúdo ×5 | dados + atlas + cenário + FX | 5 lutadores novos + 5 cenários + `gr` | feito | atlas C1 v2 [medido] |
| E6 Balanceamento | harness + rodada final | `docs/balanco/` | feito | 1.1, F5 |
| E7 Celular | portão com chefão e 9 retratos | `docs/handoff-lyra-e7a.md` | parcial | só emulado; as 4 propostas de memória do E7a **não foram aplicadas** |
| E8 Segurança, deploy, docs | Órion no storage v2, deploy com rollback, guia | `docs/relatorio-orion-e8-previa.md`, Pages, `docs/como-adicionar-um-lutador.md` | parcial | deploy final pendente (D6); revisão do Órion não cobre o que veio depois de 2026-10-21 |

### 1.5 Specs

| Spec | Planejado (fatias) | Entregue | Status | Evidência e pendências |
|---|---|---|---|---|
| `spec-esquiva-e-cinematica-especial.md` | V1, V2, C1, L1, L2, A1, Q1, D | `src/data/esquiva.ts`, estado `esquiva` em `fighter.ts:1054`, `src/render/{cinematica,sessao-especial,esquiva}.ts`, integração em `fight.ts:403-426` | **feito** | `Regras.esquiva = true`, `cinematica = true`. A opção de cinemática foi **retirada** por decisão do dono ("Opções fixas", `1aa7cac`); o modo vem só de `prefers-reduced-motion` (`cinematica.ts:49`). R1 (a tarja avisa o rival) continua aberto e pesa na seção 5(c). |
| `spec-chefao-zenon.md` | Z0-Z8, A1 | `src/data/lutadores/zenon.ts`, `drenaEnergia` (`contratos.ts`), etapa `cena`, projétil `anel`, `src/render/entrada-chefe.ts`, valsa | **feito** | D-Z1 a D-Z4 decididos (`PROGRESSO.md:144-155`). |
| `spec-provocacao-prerround-e-vitoria.md` | P0-P6 | `src/data/provocacoes*.ts`, `src/render/{provocacao,balao}.ts`, integração em `fight.ts:195` | **feito** (P6 opcional não) | Em aberto: D-P1, D-P4, D-P5, D-P6; round 1 com 4,8 s contra 5,5-6,8 s da spec. Opção própria retirada (Opções fixas). |
| `spec-sons-por-lutador.md` | S0-S6 | `src/audio/{identidade-sonora,sintese-voz,amostras,camadas}.ts`, `src/data/sons/*` | **feito e ampliado** | `IDENTIDADE_SONORA = true` (`chaves.ts:14`) e `AMOSTRAS_REALISTAS = true` (`chaves.ts:23`): **desvio decidido pelo dono** (D8 revogada para os sons de luta; amostras CC0). D-S1 a D-S9 sem registro de decisão formal; R6/R7 da régua não cumpridos (`PROGRESSO.md:165`). |
| `spec-chefoes-progressivos-temas-e-dificuldade.md` | P1, R1-R3, A1, L1, E1, T0-T3, Q, A2, D1 | `src/meta/chefes.ts` (`chefeDoArcade`), `danoRecebido` nos 6 (`aminu.ts:71` a `zenon.ts:156`), `src/render/roteiros-de-entrada.ts`, `src/audio/temas.ts`, `chefesDaFila`/`temasMusicais` ligados | **feito** (R3 parcial) | DIFÍCIL fora da faixa em 4 de 6 (aceito provisoriamente pelo Atlas). A2 (arte das entradas) não. |
| `spec-trailer-abertura.md` | T0-T7 | `src/trailer/*`, `src/ui/cenas/trailer.ts`, `src/render/trailer/*`, `src/data/trailer/tomadas.ts`, `Regras.trailer = true` | **feito** | P1 a CPU 4x acima do limite: risco aceito pelo Atlas. D-T1: virou "sempre", sem linha ABERTURA nas Opções (coerente com as Opções fixas). **Acoplamento novo:** as tomadas são lutas gravadas; qualquer mudança no motor (a revisão inteira) invalida `tomadas.ts` e pede nova escalação e nova aprovação (R3 do trailer). |
| `spec-revisao-motor-luta.md` | F1-F6 (motor, dados, câmera, IA, QA, docs) | **nada**, além da tarja de `f5b5fab` (que era da spec de cinemática) | **faltando** | ver seção 5. DD-M1 a DD-M6 sem resposta. |

---

## 2. O que falta, em ordem de prioridade

Tamanho: P ≈ 1-2 sessões, M ≈ 3-5, G ≈ 6+ (convenção do PLANO).

| # | Item | Por que nesta posição | Dono sugerido | Tam. |
|---|---|---|---|---|
| 1 | **Spec v2 da revisão do motor**: corrigir números, cobrir (a)-(d), incluir o filme do especial e a entrada durante o hitstop (seção 5) | é o pedido ativo do dono; implementar a v1 como está gastaria uma rodada inteira de balanço e invalidaria trailer e chefões por um ganho que o dono não pediu | Nova | M |
| 2 | **Entrada durante o hitstop** (guardar a borda no buffer congelado; atrás de flag) | a correção mais barata para "encaixe" de combo. Hoje o jogador aperta o cancel no momento natural (o congelamento do impacto) e o motor descarta | Vega (+ Íris) | P |
| 3 | **Camada de suavidade e interpolação de desenho** (só render: antecipação, squash, recuo, tremor no hitstop, pouso, interpolação por `alpha`) | maior ganho de "fluidez" percebida, sem tocar no lock-step nem no balanço | Lyra (+ Apolo nos valores) | M |
| 4 | **Desenho das caixas de colisão na tecla H** | pré-requisito para calibrar "golpe com encaixe" e para fechar o aceite da F3 | Lyra | P |
| 5 | **Filme do especial que conecta** (seção 5c) | pedido explícito do dono; depende do item 1 | Nova (contrato) → Vega (motor) ∥ Lyra (filme) → Apolo (direção) → Íris | G |
| 6 | **Combos próprios por lutador** com prova automática (seção 5a) | pedido explícito; depende de 1 e 2 | Vega (dados e verificador) + Lyra (lista no treino e no "Como jogar") | M |
| 7 | **Especiais mais fortes, com moderação** (seção 5b): um multiplicador global calibrado no harness | pedido explícito; sai depois do filme, porque o filme já entrega boa parte da sensação de força | Vega + Íris | P-M |
| 8 | **Doc de estado atualizada** (`PROGRESSO.md`, `CHANGELOG.md`, `README.md`, `arquitetura.md`) | 9 commits sem registro; a próxima sessão vai planejar em cima de estado velho | Alexandria | P |
| 9 | **Testes frágeis por tempo** (2 estouros de 5 s sob carga; `sons-integracao` p99; `fidelidade-prototipo` pixel a pixel) | uma CI vermelha por acaso bloqueia o deploy do Pages | Íris + Vega | P |
| 10 | **Teste em aparelho real** (iPhone com Chrome, que é o aparelho do dono, e um Android médio): fps, memória, som no 1º toque, trailer, toque | portão F4/E7 nunca medido; tudo o que está em "não provado" depende disto | dono + Íris (roteiro) | P |
| 11 | **Memória**: limite de residentes por peso, poda de cenários, silhueta por quadro em vez de por página (propostas 1 e 2 do E7a + F3) | 287 MB estimados contra a meta de 120 MB; maior risco técnico em iPhone | Lyra | M |
| 12 | **CAIO e WEI LONG com arte nova** (atlas v2 ≤ 2048) e os **3 cenários antigos** (cn, kr, br) em 1920x1080 | estilo misturado, custo de CPU da seleção, atlas acima de 2048 px. Há folhas do WEI LONG aprovadas (D4, v4) e do CAIO, nunca processadas | dono decide → Apolo (curadoria/regeração) → Vega (pipeline) → Lyra | M-G |
| 13 | **Revisão do Órion do que entrou depois de 2026-10-21** (amostras, manifesto de sons, trailer, `version.json`) e preparação do EasyPanel (repo privado, `sourcemap: 'hidden'`, CSP por cabeçalho) | antes de qualquer público real | Órion → Vulcano | M |
| 14 | **Deploy final (D6, EasyPanel)** com rollback; desligar o Pages | destino decidido e nunca feito; depende do servidor do dono | Vulcano (+ dono) | M |
| 15 | **PWA offline** (service worker com cache dos assets com hash) | estava na F4; o jogo instala, mas não abre sem rede | Vulcano | M |
| 16 | **Toque e plataforma**: tamanho/opacidade dos botões, vibração curta no Android, `audioSession`, aviso de som mudo | itens da F4 sem dono | Lyra | P |
| 17 | **ESLint/Prettier** | item da F0 que nunca entrou; baixo impacto com TS estrito | Vulcano | P |
| 18 | **Orçamentos revisados** (§6): ou se cumprem, ou o dono aceita números novos por escrito | hoje estouram sem decisão | Nova propõe, dono decide | P |

---

## 3. Desvios do plano e dívidas conscientes

### 3.1 Desvios decididos pelo dono

| Plano | O que é hoje | Registro |
|---|---|---|
| D8: áudio 100% sintetizado | sons de luta com amostras CC0 (kenney.nl, opengameart.org), síntese como reserva | `CONTEXTO-SESSAO.md:113` ("SIM, soam mais reais"), `docs/plano-sons-realistas.md:7-10` |
| ED8: MVP com 4, expansão em ondas | os 10 no ar juntos | prática registrada em `PROGRESSO.md:30`; nenhuma decisão escrita de abandonar as ondas [inferido] |
| ED10: sem 4º botão | botão ESQUIVA | spec da esquiva §4, aprovado |
| Chefão BAATAR | BAATAR normal, ZENON chefão final, 5 guardiões progressivos | `PROGRESSO.md:144-155`, `bb8dae2` |
| D6: infra própria | GitHub Pages **temporário e público** | `PROGRESSO.md:123-127`, `:186-188` |
| Opções da cinemática e da provocação (specs) | "Opções fixas": sem chave para o jogador | `1aa7cac` |
| D-T1 (C) do trailer | trailer sempre, sem opção | `CONTEXTO-SESSAO.md:169-170` |
| `?seed=N` só em DEV | vale em produção | ED16, `PROGRESSO.md:91` |

### 3.2 Desvios sem decisão registrada (o dono precisa saber)

| Plano | Hoje | Consequência |
|---|---|---|
| F3: arte nova nos 3 lutadores das folhas originais | CAIO e WEI LONG com a arte do protótipo (atlas v1 3600 px) | estilo misturado; maior custo de CPU da seleção; acima do limite de 2048 que o plano fixou para o iOS |
| F2: os 3 cenários novos (templo, palácio, Rio) | `cn.jpg`, `kr.jpg`, `br.jpg` do protótipo, 1600x900 (`src/data/cenarios.ts:26-28`) | resolução menor que a dos outros 7; os arquivos novos estão parados em `arte-fonte/` |
| F2: marcador manual (âncora, ponta, rosto) | pipeline automático; `ferramentas/marcador/` vazia | ponta errada vira alcance errado (armadilha do PLANO §2.2), sem ferramenta de conferência visual |
| F3: flash por quadro | silhueta por página, sob demanda | economiza menos memória que o planejado (cópia branca da página inteira) |
| E1b: `retrato.webp` | `retrato.png` | peso maior (38-85 KB cada); efeito pequeno |
| F1c: tecla H com caixas | alterna `game.debug`, que ninguém desenha | aceite da F3 impossível de verificar a olho |
| PLANO §6: orçamentos | estourados em memória, peso de atlas e JS total | ver 1.2 |
| F0: ESLint/Prettier | ausentes | baixo |

### 3.3 Dívidas conscientes (vigentes)

- Sem netplay nem rollback; cinemática, provocação e entradas são apresentação fora do motor (R6 da spec da esquiva: no dia do
  netplay, o congelamento vira N ticks fixos no motor).
- Canvas 2D (Pixi como plano B nunca acionado).
- IA_CHEFE global; armadura do ZENON f2 só nos golpes com `armor`.
- Balanço por CPU com viés (mecânicas de leitura parecem fracas).
- Chave `inno-fighters-v1` mantida "por uma release" (já são várias) [inferido de `src/core/storage.ts`].
- Repositório público com roadmap, memórias e arte visíveis (M2 do Órion, aceito pelo dono).
- Atalhos do Atlas a confirmar (`PROGRESSO.md:167-176`): tolerância N3, agendamento relativo, pico dos temas 0,70, grave +4 dB,
  MIN-JI 120 bpm, P1 do trailer, DIFÍCIL dos chefões.

---

## 4. Riscos abertos e decisões que dependem do dono

### 4.1 Riscos abertos

| # | Risco | Prob. | Impacto | Mitigação proposta |
|---|---|---|---|---|
| A1 | Memória no iPhone (287 MB estimados; o iOS também tem teto de memória total de canvas, e a silhueta cria canvas do tamanho da página) | Alta | Alto | item 11 + aparelho real (item 10) |
| A2 | A revisão do motor muda o hash de tudo: snapshot CPU×CPU, `hashRegulares` do harness (`f420ce928e06b304`), tomadas do trailer, calibração dos 6 chefões (`danoRecebido`) | Certa | Médio | flag `revisaoMotor` por partes, balanço e escalação refeitos na mesma fatia, e o dono reaprova o trailer |
| A3 | Dano dos especiais dobrado → luta em "dois toques" e zoneamento dominante (seção 5b) | Alta, se a v1 for aplicada | Alto | multiplicador único, harness como portão |
| A4 | CI instável por testes de tempo bloqueia o deploy | Média | Médio | item 9 |
| A5 | Nada foi medido em aparelho real | Certa | Alto | item 10 |
| A6 | Estilo misturado (CAIO e WEI LONG) aparece mais com o filme do especial, que aproxima a câmera | Alta | Médio | item 12 antes do filme desses dois, ou filme v1 sem close neles |
| A7 | A tarja avisa o rival (R1 da spec da esquiva). Com o filme só no acerto, o humano vê a tarja, defende e o filme nunca aparece contra pessoas | Alta | Médio | seção 5(c)/(e): tarja no acerto |
| A8 | Termos de uso da Runway para arte gerada (e para os áudios de teste) | Média | Alto (comercial) | conferência do dono |
| A9 | Palavras estrangeiras sem revisão nativa (gritos, falas, guardiões) | Média | Médio | revisão nativa |

### 4.2 Decisões que dependem do dono

Herdadas e ainda abertas: escuta formal dos sons e temas (ligados sem veredito registrado da S5); DIFÍCIL dos chefões (4 de 6
fora); "próximo guardião" por texto; round 1 da provocação com 4,8 s; revisão nativa; teste em aparelho; régua R6/R7 (D-S7);
D-P1, D-P4, D-P5, D-P6; D-S1 a D-S9; LICENSE e ajustes do GitHub; servidor do EasyPanel (D6).

Novas, desta revisão (detalhe na seção 5):

| # | Decisão | Recomendação da Nova |
|---|---|---|
| **R-1** | CAIO e WEI LONG: arte nova (Runway + pipeline) ou manter a do protótipo? Os 3 cenários antigos: usar os que já estão gerados? | arte nova para os dois e cenários novos **antes** do filme do especial |
| **R-2** | Quais especiais ganham filme: os 33 ou 1 "golpe de assinatura" por lutador na v1? | **1 por lutador na v1** (10 filmes), os outros com a tarja no acerto |
| **R-3** | Onde fica a tarja: no início do especial (hoje) ou como abertura do filme, no acerto? | **no acerto**; no início, só um brilho de 6-8 ticks sem congelar |
| **R-4** | Especial defendido: 1 bloqueio só (os acertos extras só existem no filme) ou todos os acertos bloqueados, como hoje? | **1 bloqueio só**: é o que o pedido diz ("defendido = sem hits") |
| **R-5** | Quanto mais forte: multiplicador 1,25 a 1,4 (com teto por golpe) ou a tabela da spec (~1,9× na mediana)? | **1,3, com teto de 26 por golpe**, A/B jogado pelo dono antes de fixar |
| **R-6** | Arte própria do filme (folha de 6 quadros por lutador, ~6 créditos cada) ou só poses existentes + câmera + retrato? | v1 com poses existentes; folha própria só para os 2-3 lutadores em que a v1 não convencer |
| **R-7** | Combos: a cadeia universal continua para todos, com combos próprios por cima, ou cada lutador só tem a sua lista? | **universal + combos próprios por cima** (lista fechada tira opção e frustra) |
| **R-8** | Orçamentos do §6: cumprir ou aceitar números novos? | aceitar 200 KB de JS total e 1,6 MB por atlas; **manter** 120-150 MB de memória como meta dura |

---

## 5. Lacunas da `docs/spec-revisao-motor-luta.md` frente ao pedido do dono

A spec é minha (2026-10-22). Revisada contra o código, ela tem erros de número e não cobre metade do pedido. A recomendação é
**não implementar a v1** e reescrever como v2 com o que segue.

### Erros da spec, conferidos no código

- A coluna "Dmg" da §5.1 sobe 1 ponto em silêncio: `hp` 10 (o código tem 9), `hk` 14 (13), `chp` 11 (10)
  (`src/data/base-moves.ts:24-28`).
- O R1 diz que o tripwire de `balanco-adversarial.test.ts:44` vigia "60% da menor barra de vida (27,6 HP)". Os 27,6 são 60% da
  **barra de guardião de 46** (BAATAR, `baatar.ts:82`), não da vida de um lutador. A proposta de recalibrar o tripwire para
  "< 40% da vida total" **afrouxa a guarda contra o KO em um golpe**.
- O dano "efetivo" ignora `pow` (0,9 a 1,18), o contragolpe (×1,15) e o `danoRecebido` dos chefões. Ver (b).
- A §2.3 diz que o buffer "não decai durante o hitstop". Na verdade, durante o hitstop **a entrada nem é lida** (`game.ts:405-408`),
  e a borda se perde no fim do tick (`main.ts:212`). O problema real é outro, e maior (item 2 da seção 2).
- A §4.1 propõe CURTA de 16 ticks; o código tem 20 (`cinematica.ts:28`). A diferença é pequena, mas a spec não diz que muda.
- A §7 não prevê refazer as tomadas do trailer nem recalibrar os 6 `danoRecebido`. A mudança de motor obriga as duas coisas.

### (a) Combos próprios por personagem

**O que a spec tem:** `rotasCombo?: Partial<Record<NomeGolpe, NomeGolpe[]>>` em `LutadorDef` e uma tabela de rotas.

**O que não cobre:**
1. A tabela mistura três coisas que o contrato não representa: **cancel** (`lp → hp`), **salto de entrada** (`jhk → hp` não é
   cancel, é golpe aéreo seguido de golpe no chão) e **pressão depois da queda** (`hk (KD) → setup de Mashi`, `Parade → sResp`,
   este último já existe). Um mapa "golpe → próximos" só expressa a primeira.
2. A NILA troca de postura por **ficha** (GAJA/SARPA), e os chefões têm fichas de fase. As rotas precisam morar em `FichaDef`,
   não só em `LutadorDef`.
3. Não há identidade de verdade: as rotas da tabela são quase todas "leve → forte → especial" com nomes diferentes. Identidade
   vem de **combo com propriedade própria** (o 3º golpe derruba, lança, empurra à parede ou cruza para o outro lado).
4. A CPU: o R4 cita `cpu.ts:305`, mas não há contrato de como a CPU escolhe uma rota.
5. Não há prova de que cada rota **combina** (o rival não consegue agir entre um golpe e outro).
6. Não diz onde o jogador **aprende** o combo. Hoje o treino mostra uma dica genérica (`fight.ts:766`).

**Como cobrir (v2):**
- Contrato em duas camadas: a cadeia universal continua (rank crescente, como hoje), e `combosProprios` acrescenta sequências
  fechadas por lutador **e por ficha**:
  `combosProprios?: readonly { nome: string; sequencia: readonly NomeGolpe[]; final?: 'derruba' | 'lanca' | 'parede' | 'cruza'; dano?: number }[]`.
  O motor reconhece a sequência pelo histórico do combo atual (golpes que acertaram desde `gotHits === 0`) e aplica o `final`
  só no último golpe.
- 2 combos próprios por lutador na v1 (20), com os nomes em português, escritos pelo Apolo a partir do arquétipo.
- Prova automática: estender `ferramentas/balanco/frame-data.ts` com um **verificador de combo**. Cada sequência declarada roda
  contra o `DummyTreino` em pé e agachado, e o teste falha se o boneco puder bloquear entre dois golpes. É o mesmo princípio do
  "frame data medido, não calculado à mão" (`plano-expansao.md` §6.1).
- A CPU no DIFÍCIL lê `combosProprios` (com chance por nível em `AI_LEVELS`, como a esquiva fez).
- A lista de combos aparece no TREINO e no "Como jogar", gerada do mesmo dado (uma fonte só).
- Dono: Vega (motor, dados, verificador), Lyra (lista na tela), Apolo (nomes e propriedades). Tamanho M.

### (b) Especiais mais fortes, sem exagero

**O que a spec propõe:** dano base de 25 a 35 (até 38), contra 8 a 22 hoje. Contei as 33 linhas da tabela da §3.1: o aumento é **~1,9× na
mediana** (7 especiais exatamente 2,0×, 9 acima), de 1,6× (BAATAR sFire) a **3,0×** (NILA SARPA sFire 8 → 24). FOUETTÉ 2,7×, MARMA 2,7×, Mashi N1 2,75×.

**Contas com os números reais do código** (`pow`, vida e barras de `src/data/lutadores/*.ts`; o projétil não multiplica `pow`,
`colisao.ts:67`):

| Caso | Hoje | Spec v1 | % da vida |
|---|---|---|---|
| Mashi N3 da AMINU (38 × pow 1,18), quebra a guarda | 22 × 1,18 = 26,0 | **44,8** | 48,7% do BAATAR (92); 51,6 com contragolpe = **56%** |
| Projétil do WEI LONG, de longe | 20 | **35** | 38% do BAATAR; 4,2 de dano no bloqueio (12%, `game.ts:736`) |
| `hp → hk → sDown` do HAYATO (pow 1,07), scaling atual x scaling v1 | 35,8 | **43,5** (45 com contragolpe) | 45% a 49% de BAATAR, MIN-JI (94) e CENTELLA (96): **passa do teto de 45% que a própria spec fixou** |
| Especial cheio contra uma barra de guardião (46-56) | ~15 | 28-38 | **60% a 80% de uma barra** com um golpe: a calibração dos chefões (`danoRecebido` 0,80-0,925) perde a validade |

**Riscos que a spec não cobre:**
1. **Zoneamento dominante.** O scaling novo corta o dano dos combos, então o aumento se concentra no especial **isolado**:
   projétil de longe, anti-aéreo e agarrão. A CPU já usa muito os especiais; o meta CPU×CPU muda e a rodada de balanço inteira se
   perde.
2. **A economia de energia não muda** (+8 por acerto, +5 ao apanhar, +0,04 por tick: `game.ts:305`, `:827-828`,
   `fighter.ts:720`). Dois especiais por round continuam viáveis, agora com o dobro do dano. É a luta "em dois toques", e o
   risco que a spec queria evitar.
3. O piso de 30% para especiais no fim de combo longo (com o atordoamento de 46 ticks da MARMA) cria combo de alto dano que
   ninguém mediu.
4. O tripwire contra KO em um golpe seria afrouxado em vez de respeitado.

**Como cobrir (v2):**
- **Um multiplicador só**, em dado: `MULT_ESPECIAL` (e `MULT_PROJETIL` à parte, menor, porque o projétil é seguro e de longe).
  Partida: 1,30 e 1,15. Um ajuste fino por lutador só se o harness apontar.
- **Teto por golpe:** dano efetivo ≤ 26 (≈ 28% da menor vida comum, 92). O tripwire atual (60% da menor barra) **fica**.
- **Portão no harness:** taxas de 42% a 58%; duração média do round sem cair mais que 20%; fatia do dano que vem de especial
  entre 25% e 35%; chefões de volta à rampa (recalibrar `danoRecebido` na mesma fatia).
- **A força vem também da apresentação:** hitstop final de 10-12 ticks, tremor, número de dano grande (que já existe na
  `SessaoEspecial`) e, sobretudo, o filme (c). O especial parece forte sem dobrar o número.
- **A/B do dono:** `?especial=1.3` só em DEV, para ele jogar 1,0 x 1,3 x 1,5 antes de fixar (R-5).
- Dono: Vega + Íris. Tamanho P-M.

### (c) "Filmezinho" do personagem batendo, só quando o especial conecta

**O que a spec tem:** congelamento no início do especial (`startMove`, `mv.cost > 0`), zoom na tarja, hitstop maior no último
acerto. **Isso é o contrário do pedido.** Hoje a cinemática já abre no início do golpe (`fight.ts:416-417`), antes de se saber se
ele acerta, e roda mesmo se for defendido ou esquivado.

**O que já existe e ajuda:**
- O precedente da PARADE e da GARKUWA: a cinemática **espera o sucesso** (`ev.momento === 'sucesso'`, abre no `parry`/`clash`,
  `fight.ts:418-421`). "Só quando conecta" é a mesma ideia, aplicada ao acerto.
- A `SessaoEspecial` já não mostra número nem contador quando o rival defende (`src/render/sessao-especial.ts:14-17`).
- A etapa `cena` do ZENON (poses em partes iguais de uma duração, `fighter.ts:1048-1052`) e a câmera do trailer, que aproxima
  pelo zoom do mundo.

**Três opções:**

| Opção | Como | Prós | Contras |
|---|---|---|---|
| **A. Resolução atômica no motor + filme na UI** | No 1º acerto limpo, o motor aplica o dano total do filme num tick só (com o scaling do combo), põe os dois lutadores na posição e no estado finais (rival derrubado) e emite `filme { lutador, golpe, acertos: [{ dano, quadro }], ko }`. A UI toca o filme sem chamar `game.update`, como a cinemática de hoje. | Lock-step intacto por construção; pular só encurta a apresentação; segue a decisão já tomada ("cinemática só na UI"); o snapshot só muda com a flag ligada | o HUD precisa animar a vida durante o filme (a vida "real" já caiu); o KO e a troca de barra do chefão chegam no mesmo tick e a UI precisa enfileirar |
| B. Estado `filme` com N ticks fixos no motor | como a `cena` do ZENON | o motor sabe tudo; pronto para netplay | não dá para pular (a duração vira regra de jogo); o filme fica preso ao relógio da luta |
| C. Híbrido | motor com 20-30 ticks fixos + extensão na UI | meio-termo | duas fontes de verdade para o tempo |

**Recomendação: A.**

**Regras do gatilho (o motor decide; teste para cada uma):**
- Abre o filme: acerto **limpo** da 1ª caixa ativa do especial marcado com `filme`.
- **Não abre:** bloqueio (1 bloqueio, com dano de bloqueio, e a recuperação normal: os acertos extras **não existem** fora do
  filme, R-4); esquiva invulnerável (erra); armadura (`armor.dano`); PARADE do rival (o sucesso é dela); `clash` com a GARKUWA;
  troca de golpes no mesmo tick (decidir: sem filme).
- Projéteis: filme quando o projétil conecta, com corte para o rival. Na v1, só se o especial de assinatura do lutador for projétil.
- Scaling: o filme conta como **um** golpe no combo (um fator só sobre o total), para não virar laço "combo → filme".
- KO: se o total mata, o filme termina em câmera lenta de KO. Troca de barra do chefão: o filme fecha e a cena da fase 2 entra
  na fila.

**Contrato (aditivo, atrás de `ConfigPartida.filmes`):**
- `Golpe.filme?: { acertos: readonly { dano: number; pose: string; ticks: number }[]; final: 'derruba' | 'parede' | 'lanca'; empurrao: number }`
- `EventoLuta`: `{ tipo: 'filme'; lutador; defensor; golpe; acertos: readonly { dano: number }[]; danoTotal: number; ko: boolean }`
- UI: `src/render/filme.ts` (linha do tempo pura, como `linhaDoTempo` da cinemática) + integração em `fight.ts` no lugar de
  `cine.iniciar` para golpes com `filme`.

**Arte e direção:**
- v1 sem arte nova: poses que todo atlas tem (`sa0-3`, `sb0-3`, `sc0-1`, `hp1`, `hk1`; rival em `hitH`, `hitB`, `kdAir`,
  `koFloor`), cortes de câmera (zoom 1,3-1,5; acima disso o sprite de 410 px de altura borra), o **retrato** em close no 1º
  quadro, linhas de velocidade e a assinatura E1-E12 que já existe em `estilos-especiais.ts`. Duração de 60 a 90 ticks, e
  qualquer ataque pula.
- v2 opcional (R-6): uma folha de 6 quadros em close por lutador no Runway (~6 créditos cada). Só onde a v1 não convencer.
- CAIO e WEI LONG: o close expõe a arte do protótipo (A6). Fazer o item 12 antes, ou ficar sem close neles.

**A tarja (e):** passa a ser a **abertura do filme**, no acerto. No início do especial, só um brilho de 6-8 ticks, sem congelar
(R-3). Isso também fecha o R1 da spec da esquiva: o rival deixa de ser avisado.

**Testes obrigatórios:** bloqueado → 0 filme e 1 bloqueio; esquivado → 0 filme e 0 acerto; armadura → 0 filme; acerto limpo → 1
filme com hash determinístico; KO dentro do filme; troca de barra dentro do filme; snapshot antigo **sem `-u`** com a flag
desligada; e2e de pular; p95 do quadro durante o filme < 16,7 ms no perfil de celular.

Dono: Nova (contrato) → Vega (gatilho e resolução) ∥ Lyra (filme, câmera, HUD) → Apolo (roteiro de cada filme) → Íris. Tamanho G.

### (d) Movimento mais fluido, golpes com mais "encaixe"

**O que a spec tem:** só frame data (S/A/R, vantagem). Nada de pose, interpolação, transição ou arte.

**O que o código mostra:**
1. **A suavidade procedural está desligada para todos.** Antecipação (`dx −7·p`), squash na preparação do projétil, inclinação
   do golpe pesado, `lift`, `tilt`, respiração do idle e quique do `win` só rodam com `L = ch.legacy`
   (`fighter.ts:990-995`, `:1086-1099`, `:1126-1135`). `legacy = !pd['walk7']` (`montar.ts:198`), e os 10 atlas têm `walk7`
   [medido]. A arte nova perdeu a "mola" que o protótipo dava à arte antiga.
2. **Não há interpolação entre ticks.** O laço roda N ticks e desenha o último estado (`main.ts:205-215`). Num monitor de 120 ou
   144 Hz, e sempre que um quadro cai com 0 ou 2 ticks, o movimento dá solavanco.
3. **A entrada se perde no hitstop** (seção 2, item 2): o "encaixe" do cancel falha justo no momento natural de apertar.
4. **Poucos quadros por golpe:** `lp` tem 2 poses (`lp0`, `lp1`); a recuperação repete o quadro ativo (`src/data/anim.ts:10-24`).
   Virar de lado, agachar e parar de andar são instantâneos.
5. **Sem conferência do acerto a olho:** a tecla H não desenha caixas (F3).

**Como cobrir (v2), em ordem de custo:**
- **Interpolação de desenho** (Lyra, P-M): guardar a posição anterior de lutadores, projéteis e câmera e desenhar com
  `alpha = acc / PASSO`. Só render. O oráculo de pixel do protótipo desenha com `alpha = 1`, para não mudar.
- **Camada de suavidade fora do `legacy`** (Lyra + Apolo, M): em `src/render/lutador.ts`, não em `poseT`, para não tocar no
  lock-step. Antecipação e squash na preparação, inclinação e recuo no ativo, **tremor do sprite do rival durante o hitstop**
  (o clássico que dá peso ao golpe), squash de pouso, rastro nos golpes pesados. Parâmetros por arquétipo em dado
  (`peso: 'leve' | 'medio' | 'pesado'`), com os valores do Apolo.
- **Entrada no hitstop** (Vega, P): ler a borda e guardá-la no buffer congelado; sai no 1º tick acionável.
- **Janela de cancel relativa ao acerto**, não a `S + A + 2`: abre no tick do acerto e fecha `hitstop + 8` ticks depois. Com a
  v1 (buffer 4, K = 2, entrada perdida no hitstop), o jogador teria ~4 ticks (67 ms) para confirmar no toque: estrito demais
  para o celular.
- **Caixas na tecla H** (Lyra, P) e uma revisão de "onde o desenho bate" contra a `ponta` de cada quadro ativo (Íris + Apolo).
- **Arte de transição** (Apolo + dono, M; opcional): uma folha por lutador com recuperação (`lp2`, `hp2`, `hk2`), entrada no
  agachado e virada. Entra sem código, pela cadeia de poses do `anim`.
- **Como medir:** e2e de ritmo de quadro (variação do intervalo de desenho e ticks por quadro) e um teste de dados de "salto de
  âncora" entre quadros consecutivos (≤ N px), que cobre o R2 do PLANO sem o marcador.

### (e) Tarja

**Entregue** em `f5b5fab`: permanência estendida, tipografia Bangers e molduras neon (`src/render/cinematica.ts`,
`src/render/texto.ts`), teste de contrato em `tests/unit/cinematica.test.ts` [lido; não vi na tela]. Pendências: a posição dela
no tempo (início x acerto) depende de (c) e do R-3. A CURTA de 16 ticks e o zoom da §4.2 da spec não foram feitos, e com o filme
deixam de fazer sentido como estão escritos.

### Ordem proposta para a revisão v2

```
V2-0 spec v2 (Nova) ──► V2-1 entrada no hitstop + janela relativa (Vega, P) ──┬──► V2-4 combos próprios + verificador (Vega/Lyra, M)
                    └─► V2-2 interpolação + suavidade + caixas H (Lyra, M) ──┤
                                                                            └──► V2-3 filme do especial (Vega ∥ Lyra → Apolo, G)
                                                                                  └──► V2-5 multiplicador de especial (Vega, P-M)
                                                                                        └──► V2-6 balanço, chefões e nova escalação do trailer (Vega + Íris)
                                                                                              └──► V2-7 QA (Íris) ──► V2-8 docs (Alexandria)
```

V2-1 e V2-2 andam em paralelo (motor x render) e já entregam a maior parte de "fluido e com encaixe". O dano (V2-5) entra por
último, porque o filme muda a sensação de força e o número certo só aparece com ele jogando.

---

## 6. O que eu provei e o que só inferi

**Provei rodando nesta auditoria:** `tsc --noEmit` limpo; `vitest run` (2 449 verdes, 2 estouros de tempo sob carga, os dois
arquivos verdes sozinhos com 48 de 48); peso, páginas e dimensões dos 10 atlas e dos 10 cenários; presença das poses nos 10
`atlas.json` (todos têm `walk7`, logo `legacy` é falso para todos); gzip dos pedaços JS do `dist/` existente (de `f6744bc` com
árvore suja, não de HEAD); datas dos documentos por `git log`; ausência de `revisaoMotor`, `rotasCombo`, `janelaCancel`,
`escalaComboRevisada`, service worker, `audioSession` e `vibrate` (grep).

**Li no código, sem teste que prove:** a entrada perdida no hitstop (`game.ts:405-417` + `main.ts:212`); a cinemática abrindo no
início do especial; a silhueta por página; a tecla H sem desenho; o laço sem interpolação; as contas de dano da seção 5(b)
(aritmética sobre os dados, não lutas simuladas).

**Declarado por outros e não reconferido:** e2e (nenhum rodado), medições de fps e memória do E7a, aprovações da Íris, aprovação
dos sons pelo dono, balanço de 2026-10-21.

**Inferido:** primeira carga ≥ 5 MB; ED8 abandonada na prática; o pipeline automático substituiu o marcador sem decisão; a chave
`-v1` além do prazo; o risco do teto de memória de canvas no iOS.
