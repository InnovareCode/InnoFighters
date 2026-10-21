# InnoFighters

Jogo de luta 2D para navegador. Canvas 2D, TypeScript em modo estrito (`tsconfig.json`), Vite.
`prototipo/` é a referência congelada do jogo original; não é código de produção.

**Estado (2026-10-21, commit `0684548`):** 10 lutadores no jogo. O chefão final, ZENON ARGYROS, "O Arconte", tem luta de duas barras, cena da fase 2 e entrada dramática. Depois de derrotado, ele fica jogável. Esquiva e cinemática do especial estão ligadas. O balanço está em `docs/balanco/`.
Pendentes: decisões de arte e de regra listadas em `PROGRESSO.md` (seção "Decisões em aberto"), revisão no celular (E7), documentação final e deploy definitivo (E8/F6).
Histórico de marcos em `CHANGELOG.md`.

## Como rodar

Requisito: Node 20 ou mais novo (`package.json`, `engines`). A CI usa Node 24 (`.github/workflows/ci.yml`).

```bash
npm ci
npm run dev        # http://localhost:5173 (porta fixa, vite.config.ts)
```

Para os testes e2e, na primeira vez: `npx playwright install chromium` (só o Chromium é usado).

## Scripts (`package.json`)

| Comando | O que faz |
|---|---|
| `npm ci` | instala as dependências exatas do `package-lock.json` |
| `npm run dev` | servidor de desenvolvimento (`vite`) |
| `npm run build` | `tsc --noEmit && vite build`: gera `dist/` (com sourcemap) |
| `npm run preview` | serve o `dist/` em http://127.0.0.1:4173 |
| `npm run typecheck` | `tsc --noEmit` (modo estrito) |
| `npm test` | testes de unidade (Vitest, `tests/unit`) |
| `npm run test:e2e` | e2e (Playwright, `tests/e2e`); sobe o dev server sozinho |
| `npm run test:e2e:build` | e2e contra o build de produção (`tests/e2e-build`); sobe build + preview na 4173 |
| `npm run sprites -- <id>` | pipeline de sprites (folhas -> atlas). Sem argumento, mostra o uso. Passo a passo em `docs/como-adicionar-um-lutador.md` |
| `npm run balanco -- [--rapido \| --completo] [--esquiva]` | harness de balanceamento (CPU x CPU). `--completo` grava a referência em `docs/balanco/` (sem esquiva); `--esquiva` grava em `relatorios/` (não versionado) |

### Testes

- **Unidade:** `npm test`. Última execução em 2026-10-21: 66 arquivos, 1475 testes, todos verdes.
- **E2E:** `npm run test:e2e`. Dois projetos: `desktop` (1280x720) e `celular` (Pixel 7, Chromium). Configuração em `playwright.config.ts`. Não reexecutado nesta revisão da documentação.
- **E2E de build:** `npm run test:e2e:build`. Testa a política de segurança (CSP) que só existe no build (`tests/e2e-build/csp.spec.ts`).
- **Atenção:** não rode dois `test:e2e` ao mesmo tempo. Eles disputam a porta 5173 e a pasta `test-results/`.
- **CI:** `.github/workflows/ci.yml` roda typecheck, testes e build em todo push e PR.

## Lutadores

Dez lutadores (`IDS_LUTADORES`, `src/core/contratos.ts:125`). O ZENON é o chefão final (`CHEFE`, `src/meta/regras.ts`). A regra de desbloqueio está também em `src/meta/regras.ts`.

| Lutador | País | Título | Como libera |
|---|---|---|---|
| HAYATO | Japão | O Punho do Trovão | inicial |
| WEI LONG | China | O Dragão de Ferro | inicial |
| MIN-JI | Coreia do Sul | A Tempestade de Seul | inicial |
| CAIO | Brasil | Mestre da Ginga | inicial |
| AMINU | Nigéria | A Lança de Kano | 1º da fila: zerar o Arcade |
| CENTELLA | México | A Faísca da Arena | 2º da fila: zerar o Arcade |
| CAMILLE | França | A Riposte de Marselha | 3º da fila: zerar o Arcade |
| NILA | Índia | A Lua de Kerala | 4º da fila: zerar o Arcade |
| BAATAR | Mongólia | O Avarga das Estepes | 5º da fila: zerar o Arcade. Lutador comum (não é mais chefão) |
| ZENON (chefão) | Grécia | O Arconte | derrotá-lo no Arcade. Depois de derrotado, fica jogável |

**Regras do desbloqueio** (`src/meta/regras.ts`, `src/meta/progresso.ts`):

- Cada Arcade zerado (qualquer dificuldade, com continues) libera o próximo da fila ainda travado. A ordem é AMINU, CENTELLA, CAMILLE, NILA, BAATAR.
- Derrotar o ZENON no Arcade libera o ZENON.
- A escada tem 5 rivais sorteados e o chefão por último: 6 lutas (`TAMANHO_ESCADA = 5`, `src/meta/regras.ts`).
- Lutadores ainda travados podem aparecer como rivais na escada (`travadosNaEscada: true`, `src/meta/regras.ts`).
- Jogando com o ZENON, não há luta de chefe: a escada só tem rivais (`src/meta/escada.ts`).

**Chefão ZENON (resumo):** duas barras. Na troca de barra, o chefão entra numa cena de poses de 90 ticks, com a trilha da valsa e a legenda "Chega de cortesia.", e a fase 2 fica mais forte. O TRIBUTO e o DECRETO roubam energia do rival. A esquiva também vale na luta de chefe. A entrada dramática (270 ticks, 4,5 s, na primeira luta de cada Arcade; 60 ticks, 1 s, depois de um continue ou com a cinemática curta ou desligada) mostra o nome e a fala do chefão. Um ataque ou ESP de um jogador humano pula a entrada, a partir do tick 10 (`src/ui/cenas/fight.ts`).

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

- **Esquiva:** gasta 20 de energia e desloca o lutador para trás ou para a frente, invulnerável durante parte do movimento. Pode ser desligada nas regras (`Regras.esquiva`, `src/meta/regras.ts`).
- **Menus** (`src/ui/tipos.ts`): setas ou WASD navegam. Enter, Espaço, Z, C ou J confirmam. Esc, X, V, K ou Backspace voltam. O mouse também funciona.
- **Luta:** Esc ou P pausa. Enter encerra a partida quando ela acaba (`src/ui/cenas/fight.ts`). Enter também pula a entrada do chefão.
- **Treino:** R reinicia; T troca o alvo do boneco (`src/ui/cenas/fight.ts`).
- **Global:** F alterna tela cheia (fora da seleção); M liga e desliga o som (`src/main.ts`).
- **H:** alterna `game.debug` (`src/ui/cenas/fight.ts:430`). O desenho das caixas de colisão nesse modo: **a confirmar**. A tela "Como jogar" não cita mais a H.

### Gamepad (`src/input/mapa.ts`, `src/input/gamepad.ts`)

- Controle 1 é o jogador 1; controle 2 é o jogador 2.
- Mapeamento padrão do navegador: D-pad ou analógico esquerdo = setas; A = chute fraco; B = chute forte; X = soco fraco; Y = soco forte; R1 ou R2 = especial; L1 ou L2 = esquiva; Start = pausa.
- O comportamento ao desconectar um controle: **a confirmar** em aparelho real.

### Toque

Joystick à esquerda, quatro botões de ataque (soco fraco, soco forte, chute fraco, chute forte), ESQ (esquiva), ESP (especial) e pausa (II). A camada fica em `index.html` (`#touch`), no estilo `src/input/toque.css` e na lógica `src/input/toque.ts`. Com a esquiva desligada nas regras, o botão ESQ some.

### Parâmetros de URL

- `?seed=N`: fixa a semente do sorteio. Vale em produção (`src/main.ts`).
- Só com `npm run dev` (`src/main.ts`):
  - `?expansao=1`: os 10 lutadores liberados, para testar sem zerar o Arcade.
  - `?expansao=4`: só os 4 do protótipo, para comparação (sem a esquiva e sem a entrada do chefão).
  - `?precarga=minima`: não carrega atlas no boot.
  - `?manual=1`: desliga o laço em tempo real (para testes).

## Site de teste (temporário)

- Endereço: https://innovarecode.github.io/InnoFighters/ (último teste de disponibilidade registrado: 2026-10-21; **a confirmar** hoje).
- Publicado por `.github/workflows/pages.yml` a cada push na `main`, com `--base=/InnoFighters/`.
- **É temporário.** O destino é o servidor EasyPanel da infraestrutura própria (decisão D6, `PROGRESSO.md`).
  Quando o EasyPanel entrar no ar: apagar `.github/workflows/pages.yml` e desligar o Pages em Settings > Pages.
- `index.html` tem `noindex`. O repositório é público.

## Documentação

- `docs/arquitetura.md`: camadas, contratos C1 a C4, carga sob demanda, determinismo, chefão, esquiva, CSP.
- `docs/como-adicionar-um-lutador.md`: passo a passo, da arte ao teste, com as armadilhas do chefão.
- `docs/balanco/`: resultados do harness (`resultados.md`, `frame-data.md`), gerados por `npm run balanco`. Não edite à mão.
- `CHANGELOG.md`: marcos do projeto.
- `PLANO.md`, `PROGRESSO.md`, `docs/plano-expansao.md`, `docs/spec-chefao-zenon.md`, `docs/mecanicas-e3.md`, `docs/prompts-arte.md`.

## Contribuir

- Antes de propor mudança: `npm run typecheck && npm test`.
- Commit e push só com autorização do dono do projeto.
- `arte-fonte/` (arte bruta), `sprites-gerados/`, `relatorios/` e `.missao-atual` ficam fora do git (ver `.gitignore`).
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs`: não edite à mão. Edite `docs/prompts-arte.md`.
- Em docs e memórias, não coloque IDs de conta, créditos ou e-mails (o repositório é público).

Licença: não definida no repositório (a confirmar com o dono).
