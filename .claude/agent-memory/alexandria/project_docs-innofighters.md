---
name: docs-innofighters
description: Onde ficam as docs do InnoFighters, convenções de escrita e o que é gerado (não editar à mão). Use ao documentar qualquer parte do projeto.
metadata:
  type: project
---

Mapa das docs (2026-10-21): `README.md` (raiz, para jogador e dev), `CHANGELOG.md` (raiz, criado em 2026-10-21, marcos por commit), `docs/arquitetura.md` (camadas, contratos C1 a C4, carga, determinismo, CSP), `docs/como-adicionar-um-lutador.md` (guia da E8). Planos e estado: `PLANO.md`, `PROGRESSO.md`, `docs/plano-expansao.md`, `docs/mecanicas-e3.md`. Handoffs da squad: `docs/handoff-<agente>-<fase>.md`.

**Why:** a doc precisa refletir o código, e o `PROGRESSO.md` ficou defasado em relação ao git (em 2026-10-21 dizia "E3 S1b a S5 pendentes" e "434 testes", mas o git já tinha E5 entregue e a suíte tinha 844 testes).

**How to apply:**
- Fonte de verdade para estado: `git log` e o código. Use o `PROGRESSO.md` só como pista.
- Cite `arquivo:linha` nas afirmações sobre código. O que não confirmou vai como **a confirmar**.
- `docs/prompts/` é gerado por `ferramentas/prompts/montar-prompts.mjs` a partir de `docs/prompts-arte.md`. Não edite à mão.
- Repositório público: nada de ID de conta, créditos ou e-mail em docs.
- Português do Brasil, sem emoji nos arquivos de doc.
- Commit só com autorização do dono (regra do projeto; a Alexandria não commita por conta própria).

Ver também [[feedback-alexandria-verificar]].
