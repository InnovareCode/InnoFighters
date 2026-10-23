---
name: project-ci-e2e-build-e-noturno
description: CI do InnoFighters passou a rodar e2e:build (job separado, cache do Chromium) e existe e2e-completo.yml noturno/manual; SHAs novos e o que nao foi provado
metadata:
  type: project
---

2026-10-23 (pedido da Iris, docs/saude-da-suite-2026-10-23.md): `ci.yml` ganhou o job `e2e-build` (paralelo ao `build-e-testes`) e nasceu `e2e-completo.yml` (cron 05:00 UTC + workflow_dispatch com input `spec`, nao bloqueia push). `pages.yml` NAO foi tocado.

- Cache do Chromium: `actions/cache` em `~/.cache/ms-playwright`, chave `playwright-<os>-<versao do @playwright/test>`; miss -> `playwright install --with-deps chromium`; hit -> `playwright install-deps chromium` (apt nao entra no cache).
- SHAs novos pinados: actions/cache v4.3.0 `0057852bfaa89a56745cba8c7296529d2fc39830`; actions/upload-artifact v4.6.2 `ea165f8d65b6e75b540449e92b4886f43607fa02` (cache ja tem v5/v6, upload-artifact v5 existe; Dependabot sobe).
- `concurrency` do ci.yml: cancela so em PR (push de branch mantem veredito por commit).
- Artefatos so de `test-results/` e `playwright-report/`; specs `esquiva`/`cinematica` criam `arte-fonte/capturas/` no runner (so escrita, efemero).
- actionlint 1.7.7 (binario do release, baixado em pasta do scratchpad) valida os YAML localmente; PyYAML NAO esta instalado nesta maquina (a nota antiga estava errada). `act` nao existe.

**Why:** a CI nao rodava nenhum navegador; CSP/manifesto/PWA so eram provados a mao.
**How to apply:** fidelidade-prototipo estava vermelho 5/5 no Windows; o primeiro noturno pode sair vermelho (no Linux e desconhecido). Nao excluir o spec para "ficar verde". Se o e2e-build falhar por biblioteca de sistema, conferir o passo install-deps.
