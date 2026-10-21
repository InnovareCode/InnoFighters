# Handoff Vulcano -> Atlas/Orion: higiene de workflows e repositorio (B10-B12, S1, S2)

Origem: `docs/relatorio-orion-e8-previa.md`. Nada foi commitado nem enviado.

## O que mudou

| Achado | Arquivo | Mudanca |
|---|---|---|
| B10 | `.github/workflows/ci.yml` | `permissions: contents: read` no topo; `persist-credentials: false` no checkout |
| B11 | `.github/workflows/pages.yml` | padrao do workflow `contents: read`; job `build` com `contents: read` + `pages: read`; job `deploy` com `pages: write` + `id-token: write` (so ele); `cancel-in-progress: false`; `build` roda `typecheck` + `npm test` ANTES de `build`/upload, e `deploy` depende de `build` |
| B12 | os dois workflows | actions pinadas por SHA de commit com comentario da versao (tabela abaixo) |
| S1 (parcial) | `.github/dependabot.yml` | npm e github-actions, semanal, ate 5 PRs abertos cada. **`SECURITY.md` e `LICENSE` NAO foram criados**: LICENSE e decisao do dono (a escolha da licenca e juridica), SECURITY.md fica para depois dessa decisao |
| S2 | `.gitignore` | `.claude/settings.local.json`, `*.pem`, `*.key`, `*.log` (os `/sprites/` e `sprites-gerados/` continuam) |
| Site | `index.html` | `<meta name="robots" content="noindex">` (com comentario: remover ao sair do Pages) |

Nao foi adicionada CSP e nada em `src/` foi tocado (CSP fica para a Lyra, com e2e).

## SHAs (conferidos com `git ls-remote` nos repositorios oficiais `actions/*`)

Mantive a MESMA major que o repo ja usava (nao subi versao junto com a higiene); o Dependabot propoe as majors novas.

| Action | Versao | SHA do commit |
|---|---|---|
| actions/checkout | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` |
| actions/setup-node | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| actions/configure-pages | v5.0.0 | `983d7736d9b0ae728b81ab479565c72886d7745b` |
| actions/upload-pages-artifact | v3.0.1 | `56afc609e74202658d3ffba0e8f6dda462b719fa` |
| actions/deploy-pages | v4.0.5 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |

Todas as cinco tags eram leves (sem objeto de tag anotado), entao o SHA da tag e o SHA do commit. Existem majors mais novas (checkout v6/v7, setup-node v6/v7, configure-pages v6, upload-pages-artifact v4/v5, deploy-pages v5): ficam a cargo dos PRs do Dependabot, um por vez.

## O que foi provado e o que NAO foi

Provado localmente:
- YAML dos tres arquivos carrega sem erro (PyYAML).
- `git check-ignore -v`: `.claude/settings.local.json`, `*.pem`, `*.key`, `*.log`, `/sprites/`, `sprites-gerados/` sao ignorados; `ferramentas/sprites/` NAO e ignorada. Nenhum arquivo rastreado casa com os padroes novos.
- Em copia limpa do HEAD (`git archive`) + o `index.html` novo: `npm run build` verde, `npm test` verde (27 arquivos, 479 passaram, 4 skipped) e `dist/index.html` contem o `noindex`.

NAO provado (so o GitHub prova):
- Que os workflows rodam. Em particular **`configure-pages` com `pages: read` no job build**: a action apenas le a configuracao do Pages, entao `read` deve bastar, mas nao consegui verificar. Se o primeiro run falhar nesse passo com 403/"Resource not accessible", subir o job `build` para `pages: write` (continua sem `id-token`).
- Que o `deploy` segue funcionando com permissoes so no job (e o desenho padrao da documentacao do Pages, mas e inferencia).

## Atencao: working tree vermelho por trabalho de outros agentes

No working tree atual (com mudancas em `src/` e `tests/` de outra frente, a do chefe), `npm run build` FALHA no `tsc` (erros em `tests/unit/aminu-s2`, `baatar-s1b`, `chefe-adversarial` e `zz-tmp-explorar.test.ts`) e `npm test` tem 9 falhas em `tests/unit/chefe-adversarial.test.ts`. Isso NAO vem destas mudancas (a copia limpa do HEAD com elas passa). Consequencia pratica do novo gate: **enquanto isso estiver vermelho, um push na main nao vai ao ar** — e o comportamento desejado, mas o dono vai ver o Pages "parado". `tests/unit/zz-tmp-explorar.test.ts` parece arquivo temporario de exploracao e nao deveria ser commitado.

## O que o dono precisa conferir nas configuracoes do GitHub (nada disso e arquivo do repo)

1. **Settings > Actions > General > Workflow permissions**: deixar em "Read repository contents and packages permissions" (padrao somente leitura) e **desmarcar** "Allow GitHub Actions to create and approve pull requests". Os workflows ja declaram permissoes, mas o padrao da conta/repo vale para qualquer workflow futuro.
2. **Settings > Actions > General > Actions permissions**: preferivel "Allow actions created by GitHub" (ou allowlist), e ativar "Require actions to be pinned to a full-length commit SHA" (agora o repo ja atende).
3. **Proteção da `main`** (Settings > Branches ou Rulesets): exigir PR, exigir o check `ci / build-e-testes` verde, bloquear force-push e exclusao da branch. Sem isso o gate de testes do `pages.yml` protege o deploy, mas nao a branch.
4. **Settings > Code security**: ligar Secret Scanning **e Push Protection**, Dependabot alerts e Dependabot security updates (o `dependabot.yml` cuida das versoes; os alertas de vulnerabilidade sao outro botao).
5. **Settings > Pages**: confirmar Source = "GitHub Actions". O site e publico em `innovarecode.github.io/InnoFighters`; o `noindex` so pede aos buscadores para nao indexar, nao esconde nada. O source map tambem segue publico (`vite.config.ts`, achado do Orion).
6. **2FA obrigatorio** na conta do dono e, se a organizacao `InnovareCode` tiver membros, em Organization > Settings > Authentication security > "Require two-factor authentication".
7. **Environment `github-pages`** (Settings > Environments): conferir que so a `main` pode fazer deploy (deployment branches). 

## Decisoes que sao do dono

- Licenca (`LICENSE`) e `SECURITY.md` (S1): nao criados.
- Quando o site migrar para o EasyPanel (D6): remover `pages.yml`, desligar o Pages e retirar o `noindex` se o site for para ser indexado.
