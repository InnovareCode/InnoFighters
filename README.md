# InnoFighters

Jogo de luta 2D para navegador. Canvas 2D, TypeScript em modo estrito (`tsconfig.json`), Vite.
`prototipo/` é a referência congelada do jogo original; não é código de produção.

**Estado (2026-10-21):** 9 lutadores no jogo, luta de chefão e desbloqueio por Arcade implementados.
Pendentes: balanceamento final (E6), revisão no celular (E7), documentação final e deploy definitivo (E8/F6).
Detalhes em `PROGRESSO.md` e no histórico em `CHANGELOG.md`.

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
| `npm run sprites -- <id>` | pipeline de sprites (folhas -> atlas). **Não executa no estado atual**, ver `docs/como-adicionar-um-lutador.md` |

### Testes

- **Unidade:** `npm test`. Última execução em 2026-10-21: 37 arquivos, 844 testes; 842 passaram e
  2 falharam em `tests/unit/gamepad.test.ts`, por uma alteração de `src/input/gamepad.ts` ainda não commitada.
- **E2E:** `npm run test:e2e`. Dois projetos: `desktop` (1280x720) e `celular` (Pixel 7, Chromium). Configuração em `playwright.config.ts`.
- **E2E de build:** `npm run test:e2e:build`. Testa a política de segurança (CSP) que só existe no build (`tests/e2e-build/csp.spec.ts`).
- **Atenção:** não rode dois `test:e2e` ao mesmo tempo. Eles disputam a porta 5173 e a pasta `test-results/`.
- **CI:** `.github/workflows/ci.yml` roda typecheck, testes e build em todo push e PR.

## Lutadores

Nove lutadores (`IDS_LUTADORES`, `src/core/contratos.ts:107`). A regra de desbloqueio está em `src/meta/regras.ts`.

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
| BAATAR (chefão) | Mongólia | O Avarga das Estepes | derrotá-lo no Arcade (ver abaixo) |

**Regras do desbloqueio** (`src/meta/regras.ts`, `src/meta/progresso.ts:31-61`):

- Cada Arcade zerado (qualquer dificuldade, com continues) libera o próximo da fila ainda travado. A ordem é AMINU, CENTELLA, CAMILLE, NILA.
- O BAATAR é a última luta da escada do Arcade. Zerar o Arcade com ele na escada libera o BAATAR na primeira vez.
- A escada tem 5 rivais sorteados mais o chefão: 6 lutas (`TAMANHO_ESCADA = 5`, `src/meta/regras.ts:17`).
- Lutadores ainda travados podem aparecer como rivais na escada (`travadosNaEscada: true`, `src/meta/regras.ts:25`).
- Jogando com o BAATAR, não há luta de chefe: a escada só tem rivais (`src/meta/escada.ts:20`).

## Controles

### Teclado (`src/input/mapa.ts:12-34`)

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Andar / agachar / pular | setas | W A S D |
| Soco fraco | Z | J |
| Soco forte | X | K |
| Chute fraco | C | U |
| Chute forte | V | I |
| Especial | B | L |

- **Menus** (`src/ui/tipos.ts:9-16`): setas ou WASD navegam. Enter, Espaço, Z, C ou J confirmam. Esc, X, V, K ou Backspace voltam. O mouse também funciona.
- **Luta:** Esc ou P pausa. Enter encerra a partida quando ela acaba (`src/ui/cenas/fight.ts`).
- **Treino:** R reinicia; T troca o alvo do boneco (`src/ui/cenas/fight.ts`).
- **Global:** F alterna tela cheia (fora da seleção); M liga e desliga o som (`src/main.ts:84-91`).
- **H:** alterna `game.debug` (`src/ui/cenas/fight.ts`). O desenho das caixas de colisão nesse modo: a confirmar.
  A tela "Como jogar" ainda cita H (`src/ui/cenas/how.ts:152`); a remoção foi aprovada pelo dono e não foi aplicada.

### Gamepad (`src/input/mapa.ts:42-69`, `src/input/gamepad.ts`)

- Controle 1 é o jogador 1; controle 2 é o jogador 2.
- Mapeamento padrão do navegador: D-pad ou analógico esquerdo = setas; A = chute fraco; B = chute forte; X = soco fraco; Y = soco forte; R1 ou R2 = especial; Start = pausa.
- O comportamento ao desconectar um controle está em alteração não commitada: a confirmar.

### Toque

Joystick à esquerda, quatro botões (soco fraco, soco forte, chute fraco, chute forte), especial (R1) e pausa (II). A camada fica em `index.html` (`#touch`) e `src/input/toque.ts`.

### Parâmetros de URL

- `?seed=N`: fixa a semente do sorteio. Vale em produção (`src/main.ts:41-46`).
- Só com `npm run dev` (`src/main.ts:62-66, 117, 179`):
  - `?expansao=1`: os 9 lutadores liberados.
  - `?expansao=4`: só os 4 do protótipo, para comparação.
  - `?precarga=minima`: não carrega atlas no boot.
  - `?manual=1`: desliga o laço em tempo real (para testes).

## Site de teste (temporário)

- Endereço: https://innovarecode.github.io/InnoFighters/ (respondeu HTTP 200 em 2026-10-21).
- Publicado por `.github/workflows/pages.yml` a cada push na `main`, com `--base=/InnoFighters/`.
- **É temporário.** O destino é o servidor EasyPanel da infraestrutura própria (decisão D6, `PROGRESSO.md`).
  Quando o EasyPanel entrar no ar: apagar `.github/workflows/pages.yml` e desligar o Pages em Settings > Pages.
- `index.html:8` tem `noindex`. O repositório é público.

## Documentação

- `docs/arquitetura.md`: camadas, contratos C1 a C4, carga sob demanda, determinismo, CSP.
- `docs/como-adicionar-um-lutador.md`: passo a passo, da arte ao teste.
- `CHANGELOG.md`: marcos do projeto.
- `PLANO.md`, `PROGRESSO.md`, `docs/plano-expansao.md`, `docs/mecanicas-e3.md`, `docs/prompts-arte.md`.

## Contribuir

- Antes de propor mudança: `npm run typecheck && npm test`.
- Commit e push só com autorização do dono do projeto.
- `arte-fonte/` (arte bruta), `sprites-gerados/` e `.missao-atual` ficam fora do git (ver `.gitignore`).
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs`: não edite à mão. Edite `docs/prompts-arte.md`.
- Em docs e memórias, não coloque IDs de conta, créditos ou e-mails (o repositório é público).

Licença: não definida no repositório (a confirmar com o dono).
