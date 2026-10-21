---
name: project-pipeline-pages-e-hardening
description: Estado do CI/CD do InnoFighters (ci.yml, pages.yml temporario, SHAs pinados, Dependabot) e armadilhas do ambiente de trabalho
metadata:
  type: project
---

Hospedagem atual: GitHub Pages TEMPORARIO (`.github/workflows/pages.yml`); destino final EasyPanel (D6), quando entrar remover pages.yml e desligar o Pages.
Pipeline: `ci.yml` (typecheck, test, build) em todo push/PR; `pages.yml` na main com job build (typecheck+test+build+upload) e job deploy separado (unico com `pages: write`/`id-token: write`). Sem secrets/variaveis de ambiente necessarias.
Actions pinadas por SHA (2026-10-20, majors v4/v4/v5/v3/v4); Dependabot semanal (npm + github-actions) atualiza.

**Why:** hardening do relatorio do Orion (B10-B12, S1, S2). Detalhes e SHAs em `docs/handoff-vulcano-orion.md`.

**How to apply / armadilhas:**
- `gh` CLI NAO esta instalado; SHAs de actions se descobrem com `git ls-remote --tags https://github.com/actions/<nome>.git` (tag anotada: usar a linha `^{}`).
- Workflow so e provado no GitHub; localmente so da para validar YAML (PyYAML disponivel) e rodar build/test.
- O working tree costuma estar vermelho por trabalho de outros agentes em src/tests; para provar que MINHA mudanca nao quebra, usar `git archive HEAD | tar -x` numa pasta do scratchpad + copiar node_modules.
- Em aberto: `configure-pages` com `pages: read` no job build nao foi provado; se der 403 no primeiro run, subir para `pages: write`.
