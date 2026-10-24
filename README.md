# InnoFighters

Jogo de luta 2D para navegador. Canvas 2D, TypeScript em modo estrito (`tsconfig.json`), Vite.
`prototipo/` é a referência congelada do jogo original; não é código de produção.

**Estado (2026-10-24, commit `78de1be`, `origin/main`):** 10 lutadores no jogo. O motor de luta v2 está **ligado por padrão**: entrada no hitstop, filme do especial (33 entradas, com folha FILME por lutador), combos próprios (20) e CPU DIFÍCIL que usa os combos. Os chefões do ARCADE são os guardiões da fila (AMINU, CENTELLA, CAMILLE, NILA e BAATAR, nessa ordem) e, por último, o ZENON ARGYROS, "O Arconte", com luta de duas barras, cena da fase 2 e entrada dramática. Sons por lutador, temas musicais e amostras reais estão **ligados**. O trailer de abertura (com o filme do especial em versão curta), o logo oficial, os balões premium, os botões de toque e a tela cheia estão no jogo. O histórico de marcos está em `CHANGELOG.md`; o estado e as decisões em aberto, em `PROGRESSO.md`.

A residência de memória da arte está concluída: a política por peso é o padrão desde `78de1be` (rollback `?residencia=fixa`), a chegada da arte é suave e a aba oculta solta memória. O `decode()` antecipado não foi feito, porque muda o pixel (medido).

A arquitetura detalhada (contratos, motor v2, residência de memória da arte) está em `docs/arquitetura.md`.

## Como rodar

Requisito: Node 20 ou mais novo (`package.json`, `engines`). A CI usa Node 24 (`.github/workflows/ci.yml`).

```bash
npm ci
npm run dev        # http://localhost:5173 (porta padrão do Vite; vite.config.ts não fixa outra)
```

Para os testes e2e, na primeira vez: `npx playwright install chromium` (só o Chromium é usado).

## Scripts (`package.json`)

| Comando | O que faz |
|---|---|
| `npm ci` | instala as dependências exatas do `package-lock.json` |
| `npm run dev` | servidor de desenvolvimento (`vite`) |
| `npm run build` | `tsc --noEmit && vite build`: gera `dist/` (com sourcemap e `version.json`) |
| `npm run preview` | serve o `dist/` |
| `npm run typecheck` | `tsc --noEmit` (modo estrito); não escreve nada |
| `npm test` | testes de unidade (Vitest, `tests/unit`) |
| `npm run test:perf` | testes de desempenho (Vitest, `vitest.perf.config.ts`) |
| `npm run test:e2e` | e2e (Playwright, `tests/e2e`); sobe o dev server sozinho |
| `npm run test:e2e:build` | e2e contra o build de produção (`tests/e2e-build`) |
| `npm run sprites -- <id>` | pipeline de sprites (folhas para atlas). Sem argumento, mostra o uso. Passo a passo em `docs/como-adicionar-um-lutador.md` |
| `npm run balanco -- [--rapido \| --completo] [--esquiva] [--chefes a,b] [--sem-regulares] [--varrer-dano 1,0.9] [--motor-v2 ...] [--sem-motor-v2] [--ajustes '{...}']` | harness de balanceamento (CPU x CPU). `--completo --esquiva` grava a referência de produção em `docs/balanco/`. Rodadas parciais não gravam ali. `--ajuda` lista tudo |
| `npm run orcamento` | portão de orçamento: lê o `dist/` (depois de `npm run build`) e compara com as metas de `ferramentas/orcamento/orcamento.json` |
| `npm run sons:pacote-teste` | gera um pacote de amostras de teste em `tests/fixtures/sons-pacote/` (precisa de `ffmpeg` no PATH) |
| `npm run trailer:escalar -- [opções]` | escalação do trailer de abertura (planos, sementes, níveis da CPU) |
| `npm run trailer:medir -- [opções]` | mede o custo do quadro do trailer no Chromium com CPU estrangulada |

### Testes

- **Unidade:** `npm test`. A contagem atual não foi reconferida nesta passada: os números que circulam vêm de handoffs.
- **E2E:** `npm run test:e2e`. Dois projetos: `desktop` (1280x720) e `celular` (Pixel 7, Chromium). Configuração em `playwright.config.ts`. Só a Lyra roda e2e na equipe (a porta 5173 é compartilhada).
- **E2E de build:** `npm run test:e2e:build`. Testa a política de segurança (CSP) que só existe no build (`tests/e2e-build/`).
- **Atenção:** não rode dois `test:e2e` ao mesmo tempo. Eles disputam a porta 5173 e a pasta `test-results/`.
- **Boot e trailer:** em testes que esperam o boot ir direto para a abertura de hoje, use `&trailer=0` (só vale com `npm run dev`; ver "Parâmetros de URL").
- **CI:** `.github/workflows/ci.yml` roda typecheck, testes, build e o portão de orçamento em todo push e PR; o e2e de build roda no mesmo workflow. `.github/workflows/e2e-completo.yml` roda a suíte e2e completa de madrugada (cron) e sob demanda (`workflow_dispatch`).

## Lutadores

Dez lutadores (`IDS_LUTADORES`, `src/core/contratos.ts:174`). O ZENON é o chefão final (`CHEFE`, `src/meta/regras.ts:31`).

| Lutador | País | Título | Como libera |
|---|---|---|---|
| HAYATO | Japão | O Punho do Trovão | inicial |
| WEI LONG | China | O Dragão de Ferro | inicial |
| MIN-JI | Coreia do Sul | A Tempestade de Seul | inicial |
| CAIO | Brasil | Mestre da Ginga | inicial |
| AMINU | Nigéria | A Lança de Kano | 1º da fila: derrotar o guardião da vez |
| CENTELLA | México | A Faísca da Arena | 2º da fila |
| CAMILLE | França | A Riposte de Marselha | 3º da fila |
| NILA | Índia | A Lua de Kerala | 4º da fila |
| BAATAR | Mongólia | O Avarga das Estepes | 5º da fila |
| ZENON (chefão) | Grécia | O Arconte | derrotá-lo no Arcade. Depois de derrotado, fica jogável |

**Regras do desbloqueio** (`src/meta/regras.ts`, `src/meta/progresso.ts`, `src/meta/chefes.ts`):

- A ordem da fila é AMINU, CENTELLA, CAMILLE, NILA, BAATAR (`FILA_DESBLOQUEIO`, `src/meta/regras.ts:24`).
- Com `chefesDaFila = true` (o padrão no commit `78de1be`, `src/meta/regras.ts:47`), **derrotar o guardião da vez** o libera. Zerar o Arcade sozinho não libera mais ninguém.
- Chave de rollback `chefesDaFila = false`: cada Arcade zerado libera o próximo da fila ainda travado.
- A escada tem 5 rivais sorteados e o chefão por último: 6 lutas (`TAMANHO_ESCADA = 5`, `src/meta/regras.ts:34`).
- Lutadores ainda travados podem aparecer como rivais na escada (`travadosNaEscada: true`).
- Jogando com o ZENON, não há luta de chefe: a escada só tem rivais (`src/meta/escada.ts`).

**Chefões** (`chefesDaFila: true`, `src/meta/regras.ts:47`):

- O chefão do ARCADE é o próximo guardião da fila (AMINU primeiro). Derrotá-lo o libera. O ZENON só aparece com os cinco liberados (`chefeDoArcade`, `src/meta/chefes.ts:21`).
- Cada guardião tem duas barras, cena da fase 2, entrada própria, textos (aviso, VS, cartão de desbloqueio com epílogo e fala de derrota). Os textos estão em `docs/textos-chefoes.md`.
- Dureza por nível: cada guardião tem `danoRecebido` (NORMAL) e `danoRecebidoDificil` (DIFÍCIL), multiplicadores do dano que a vida do chefe sofre. Valores e medidas em `docs/arquitetura.md`, seção 6.
- Chave de rollback `chefesDaFila = false`: o chefão do ARCADE volta a ser sempre o ZENON.

**Chefão ZENON (resumo):** duas barras. Na troca de barra, o chefão entra numa cena de poses de 90 ticks, com a trilha da valsa e a legenda "Chega de cortesia.", e a fase 2 fica mais forte. O TRIBUTO e o DECRETO roubam energia do rival. A esquiva também vale na luta de chefe. A entrada dramática mostra o nome e a fala do chefão: COMPLETA (270 ticks, 4,5 s) na primeira entrada de chefão de cada corrida do Arcade; CURTA (60 ticks, 1 s) nas demais. Um ataque, ENTER ou toque de um jogador humano pula a entrada, a partir do tick 10.

**Falas do chefão:** a derrota fala só no KO que fecha a luta; a vitória fala só no fim da luta. Perder por tempo não fala.

## Provocação (balão antes do round e na vitória)

- Antes do round 1, os dois lutadores entram e falam em um balão de texto. Do round 2 em diante, um balão de uma linha de quem perdeu o round. Ao vencer, o vencedor provoca o perdedor.
- Cada lutador tem as próprias falas (`src/data/provocacoes.pt-BR.ts`). Não repete a última fala do mesmo lutador quando há mais de uma opção.
- **Pular:** ataque, ENTER ou toque. Antes do tick 10 do round (ou do 24 da vitória), não pula.
- Não há opção no menu: a provocação é sempre ligada (a opção PROVOCAÇÕES saiu das Opções).
- Vale no ARCADE, na LUTA vs CPU e no VERSUS de dois jogadores. Fica desligada no TREINO, no CPU x CPU, no pré-round da luta de chefão (lá, a entrada dramática do ZENON é o round 1 dele) e no `?expansao=4` (sem cinemática).
- Com movimento reduzido (preferência do aparelho), o texto entra inteiro com fade e sem andada nem zoom.

## Cinemática do especial e tela

- A cinemática do especial é parte do jogo: COMPLETA (48 ticks), ou CURTA (20 ticks) com movimento reduzido do sistema. Não há opção no menu (`src/render/cinematica.ts`).
- A tarja do especial tem permanência estendida, tipografia própria do especial (Bangers) e molduras neon.

## Filme do especial (motor v2)

- Cada especial que acerta de verdade vira um **filme**: a luta congela, o motor resolve o dano (tabela em `src/data/filmes.ts`) e o KO no tick do acerto, e uma sequência de batidas mostra o golpe com a folha FILME do lutador (`filme.webp`, seis quadros).
- Defendido, esquivado ou absorvido por armadura, o golpe não abre filme.
- Pular o filme encurta a apresentação; o motor não muda.
- Roteiros da apresentação: `src/data/roteiros-filme.ts` e `docs/roteiros-filme-especiais.md`.
- Detalhes do motor v2 (flags, kill switch, combos, render): `docs/arquitetura.md`, seção 20.

## Sons e música

- **Identidade sonora por lutador** (voz, gritos, assinatura dos especiais): ligada (`IDENTIDADE_SONORA = true`, `src/audio/chaves.ts:14`).
- **Temas musicais por lutador** (nove temas, um por lutador jogável; o ZENON mantém a valsa): ligados (`TEMAS_POR_LUTADOR = true`, `src/audio/chaves.ts:16`).
- **Amostras reais** (impacto, voz e família de especial, sob a identidade sonora): ligadas (`AMOSTRAS_REALISTAS = true`, `src/audio/chaves.ts:23`). As amostras são CC0 (`public/assets/sons/CREDITOS.txt`). Sem os arquivos ou com falha de rede, o jogo toca a síntese, sem calar nada.
- As três chaves são só rollback por código. Não há opção no menu nem parâmetro de URL para elas.
- **Painel de escuta:** `?escuta=1` abre um painel para ouvir cada som, voz e tema sem jogar. Vale também no build de produção. Não grava nada.
- Nada disso foi ouvido por ninguém ainda (decisão em aberto no `PROGRESSO.md`). Os testes provam que os sons e temas são diferentes e cabem no orçamento de CPU; não provam que são bonitos.

## Trailer de abertura

- Ligado (`Regras.trailer`, `src/meta/regras.ts:50`). No boot, o trailer toca quando o pedaço dele já chegou; senão, toca a abertura de hoje. No título, parado por 30 s, o trailer também abre (modo atrair).
- Pode ser pulado com ataque ou toque a partir do tick 10.
- O trailer é montado no motor do jogo (sprites reais, sem vídeo). Quando um especial acerta num plano de luta, o filme aparece em versão curta (30 ticks). O código fica em `src/trailer/`, `src/data/trailer/`, `src/render/trailer/` e `src/ui/trailer/`, carregado sob demanda.
- Spec: `docs/spec-trailer-abertura.md`.

## Controles

### Teclado (`src/input/mapa.ts`)

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Andar / agachar / pular | setas | W A S D |
| Soco fraco | Z | J |
| Soco forte | X | K |
| Chute fraco | C | U |
| Chute forte | V | I |
| Especial | B | L |
| Esquiva | N | O |

- **Esquiva:** gasta 20 de energia e desloca o lutador para trás ou para a frente, invulnerável durante parte do movimento. Pode ser desligada nas regras (`Regras.esquiva`, `src/meta/regras.ts:43`).
- **Menus** (`src/ui/tipos.ts`, `NAV`): setas ou WASD navegam. Enter, Espaço, Z, C ou J confirmam. Esc, X, V, K ou Backspace voltam. O mouse também funciona.
- **Luta:** Esc ou P pausa (`src/ui/cenas/fight.ts`). Enter encerra a partida quando ela acaba. Enter também pula a entrada do chefão, o filme e o balão de provocação.
- **Treino:** R reinicia; T troca o alvo do boneco (`src/ui/cenas/fight.ts`).
- **H:** alterna `game.debug`. As caixas de colisão (hurtbox, caixa de acerto, projéteis) só aparecem no DEV, no treino e com o debug ligado (`src/ui/cenas/fight.ts:851` e `:916`).
- **Global:** F alterna tela cheia (fora da seleção); M liga e desliga o som (`src/main.ts`).

### Gamepad (`src/input/mapa.ts`, `PAD_MAP`)

- Controle 1 é o jogador 1; controle 2 é o jogador 2.
- Mapeamento: D-pad ou analógico esquerdo = setas; A = chute fraco; B = chute forte; X = soco fraco; Y = soco forte; R1 ou R2 = especial; L1 ou L2 = esquiva; Start = pausa.
- O comportamento ao desconectar um controle: **a confirmar** em aparelho real.

### Toque

Joystick à esquerda, quatro botões de ataque (soco fraco, soco forte, chute fraco, chute forte), ESQUIVA, ESPECIAL e pausa. Os botões aparecem só em aparelho com toque (`src/input/toque.ts`). Com a esquiva desligada nas regras, o botão ESQ some. O layout está em `src/input/toque.css`, e a marcação em `index.html` (`#touch`).

## Tela cheia e instalação

- Tecla F e linha TELA CHEIA nas Opções. No computador e no Android, liga a tela cheia e trava a paisagem no celular quando o navegador deixa.
- No iPhone, a API de tela cheia não existe no Safari nem no Chrome do iOS. A linha das Opções explica o caminho que existe: Compartilhar > Adicionar à Tela de Início, que abre o jogo sem barras. Não testado em aparelho real.
- O manifesto (`public/manifest.webmanifest`) e as metas de `index.html` cuidam do ícone e do modo de app. Não há service worker (o serviço worker está previsto no orçamento, tarefa T7).

## Logo oficial

A logo é a imagem aprovada pelo dono (`public/assets/ui/logo/`), usada no título, no menu e no splash. Decisão e arte: `docs/logo-oficial.md`.

## Parâmetros de URL

Valem em produção:

- `?seed=N`: fixa a semente do sorteio (`src/main.ts:52`).
- `?escuta=1`: abre o painel de escuta de sons e temas (`src/audio/chaves.ts:33-35`).
- `?motorv2=0|off`: desliga o motor v2 inteiro (o motor de antes). `?motorv2=filmes,combos` liga só essas mecânicas. Valor desconhecido cai no padrão (tudo ligado). Detalhes em `docs/arquitetura.md`, seção 20 (`src/meta/regras.ts:71`).
- `?residencia=fixa`: volta à política de memória de antes (rollback em produção, sem deploy). `?residencia=peso` pede a política por peso explicitamente. Sem o parâmetro, vale a por peso, que é o padrão desde o commit `78de1be` (`POLITICA_PADRAO`, `src/assets/elenco.ts:87`). Ver `docs/arquitetura.md`, seção 21.

Só com `npm run dev` (fora do DEV, não fazem nada):

- `?expansao=1`: todos os lutadores liberados, para testar sem zerar o Arcade (`src/ui/dev-expansao.ts`).
- `?expansao=4`: só os 4 lutadores de fábrica, sem fila nem chefão, sem esquiva, sem cinemática, sem temas, sem trailer (`src/ui/dev-expansao.ts`, `regrasDeQuatro`).
- `?precarga=minima`: não carrega atlas no boot (`src/main.ts:178`).
- `?manual=1`: desliga o laço em tempo real, para testes (`src/main.ts:252`). Com `&fluidez=1`, liga a fluidez do desenho nesse modo.
- `?trailer=0`: desliga o trailer. `?trailer=P5`: abre o trailer no plano 5, para aprovar o corte (`src/ui/cenas/trailer.ts:17`).
- `?dano-filme=hoje|v2|forte`: A/B do dano do filme (ferramenta, não é o jogo; `src/meta/regras.ts:98`).
- `?filme=<lutador>:<golpe>`: abre um filme falso do golpe indicado no começo da luta (gancho de desenvolvimento, `src/ui/cenas/fight.ts:1010`).

## Versão no ar

O build gera `version.json` com o commit e a data. O jogo compara com o que está no ar e mostra "NOVA VERSÃO NO AR" nas Opções, com o toque para atualizar (`src/versao.ts`).

## Estado do motor de luta

- O motor v2 está **ligado por padrão** no commit `78de1be` (`MOTOR_V2_PADRAO`, `src/meta/regras.ts:11`), em qualquer modo de elenco.
- As três mecânicas: entrada no hitstop (V2-1), filme do especial (V2-3) e combos próprios (V2-4), mais o render v2 (fluidez, mola, silhueta por quadro e tecla H). Detalhes e limites em `docs/arquitetura.md`, seção 20.
- Kill switch em produção: `?motorv2=0`. A/B: `?motorv2=<lista>`.
- A proposta original é `docs/spec-revisao-motor-luta.md` (superada). A spec que foi implementada é `docs/spec-revisao-motor-luta-v2.md`.

## Balanceamento

Os resultados do harness estão em `docs/balanco/` (`resultados.md`, `frame-data.md`). A pasta de produção é a rodada COM esquiva e com o motor v2 ligado (`docs/balanco/README.md` diz qual é qual). Não edite à mão: gere com `npm run balanco`.

Resumo da rodada de produção no commit `78de1be` (25 800 lutas, 0 travadas): os 12 números de chefão (NORMAL e DIFÍCIL, seis chefões) estão dentro da meta; a taxa de vitória dos dez lutadores nas lutas regulares vai de 44,8% a 56,1%. Tabela e metas em `docs/arquitetura.md`, seção 8.

## Site de teste (temporário)

- Endereço: https://innovarecode.github.io/InnoFighters/ (último teste de disponibilidade registrado: 2026-10-21; **a confirmar** hoje).
- Publicado por `.github/workflows/pages.yml` a cada push na `main` (e por disparo manual), com `--base=/InnoFighters/`.
- **É temporário.** O destino é o servidor EasyPanel da infraestrutura própria (decisão D6, `PROGRESSO.md`).
  Quando o EasyPanel entrar no ar: apagar `.github/workflows/pages.yml` e desligar o Pages em Settings > Pages.
- `index.html` tem `noindex`. O repositório é público.

## Documentação

- `docs/arquitetura.md`: camadas, contratos C1 a C4, carga sob demanda, determinismo, chefões, provocação, sons e temas, amostras, trailer, logo, toque, tela cheia, versão, esquiva, CSP, motor v2 e residência de memória.
- `docs/como-adicionar-um-lutador.md`: passo a passo, da arte ao teste, com as armadilhas do chefão, o filme, as falas, a voz e o tema.
- `docs/combos-proprios.md`: os 20 combos próprios (nomes, sequências e linhas de efeito).
- Specs: `docs/spec-revisao-motor-luta-v2.md` (motor v2), `docs/spec-residencia-de-memoria.md` (residência da arte), `docs/roteiros-filme-especiais.md`, `docs/orcamentos-2026-10-23.md` (metas de peso e memória), `docs/spec-provocacao-prerround-e-vitoria.md` (a seção "Decisões do dono" no topo prevalece), `docs/spec-chefoes-progressivos-temas-e-dificuldade.md`, `docs/spec-sons-por-lutador.md`, `docs/plano-sons-realistas.md`, `docs/spec-trailer-abertura.md`, `docs/spec-revisao-motor-luta.md` (proposta superada).
- Direção de arte: `docs/direcao-arte-baloes.md`, `docs/direcao-arte-controles-toque.md`, `docs/direcao-arte-trailer.md`, `docs/logo-oficial.md`.
- `docs/balanco/`: resultados do harness, gerados por `npm run balanco`. `docs/balanco-motor-v2.md`: nota sobre o balanço do motor v2.
- `docs/handoff-<agente>-<fase>.md`: registros de entrega da squad. Não são fonte de verdade; o código e a seção de estado de `PROGRESSO.md` são.
- `CHANGELOG.md`: marcos do projeto.
- `PLANO.md`, `PROGRESSO.md`, `docs/plano-expansao.md`, `docs/spec-chefao-zenon.md`, `docs/mecanicas-e3.md`, `docs/prompts-arte.md`.

## Contribuir

- Antes de propor mudança: `npm run typecheck && npm test`.
- Commit e push só com autorização do dono do projeto.
- `arte-fonte/` (arte bruta), `sprites-gerados/`, `relatorios/`, `test-results/` e `.missao-atual` ficam fora do git (ver `.gitignore`).
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs`: não edite à mão. Edite `docs/prompts-arte.md`.
- Em docs e memórias, não coloque IDs de conta, créditos ou e-mails (o repositório é público).

Licença: não definida no repositório (não há arquivo `LICENSE`; a confirmar com o dono).
