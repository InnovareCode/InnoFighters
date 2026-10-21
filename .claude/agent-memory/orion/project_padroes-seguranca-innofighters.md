---
name: padroes-seguranca-innofighters
description: Padroes de vulnerabilidade e decisoes de seguranca recorrentes do InnoFighters (jogo 100% client-side, sem backend); consultar antes de auditar
metadata:
  type: project
---

Arquitetura: jogo estatico (Canvas, Vite), sem servidor, sem login, sem rede alem de GET de assets proprios. Superficies reais: localStorage, CLI de dev de sprites, workflows do GitHub, site de teste no GitHub Pages (repo PUBLICO desde 2026-10-20).

Padroes recorrentes (auditoria E8 previa, 2026-10-20):
- Saneamento de localStorage valida TIPO mas nao FAIXA: `rounds/time/diff` passam qualquer numero finito (storage.ts) e o HUD itera ate `rounds` (hud.ts) -> rounds=1e9 trava a aba. Ao revisar saneadores, procurar campos numericos sem clamp/enum e quem os usa como limite de laco.
- Guardas por regex de caminho (cli.mjs `/public[\\/]assets/`) sao sensiveis a maiuscula/minuscula; no Windows o FS nao e. Preferir path.relative contra raiz permitida.
- `--folha nome` juntado com join() sem barrar `..` (cli.mjs).
- Repo publico + `.claude/agent-memory` versionado: memoria de agente vira publica. Nunca registrar ids de conta/credito/e-mail la.
- Pages nao permite cabecalhos; CSP so via <meta>. Source map publicado no Pages (nada alem do repo, que ja e publico).

**Why:** poupar tempo na proxima auditoria (reexecutar os mesmos greps/testes).
**How to apply:** conferir se estes pontos foram corrigidos antes de reportar de novo; ao migrar para EasyPanel/repo privado, reavaliar source map e CSP.
