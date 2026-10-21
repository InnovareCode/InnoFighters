---
name: project-esquiva-cinematica
description: Decisões da spec de ESQUIVA e CINEMÁTICA DO ESPECIAL (docs/spec-esquiva-e-cinematica-especial.md, 2026-10-21): motor x apresentação, flag, C2/C3 aditivos, DD1-DD5
metadata:
  type: project
---

Em 2026-10-21 entreguei `docs/spec-esquiva-e-cinematica-especial.md` (proposta, nada implementado).
- **Esquiva = mecânica do motor** atrás de `ConfigPartida.esquiva` (padrão false). A UI liga a partir de `Regras.esquiva`
  (false em `?expansao=4`). Botão dedicado (C2 `esq?`, P1 `n`, P2 `o`, pad L1/L2, ESQ no canto vazio do `#pad`), custo fixo 20.
  Invulnerável a golpe, projétil e agarrão via o `invuln` que já existe. Na recuperação: contragolpe, pode ser arremessado,
  não bloqueia.
- **Cinemática = só apresentação** (a cena da luta não chama `game.update`, como na pausa). Assim snapshot e lock-step ficam
  intactos por construção. O motor só ganha campos em eventos que já existem (`special.golpe`, `hit.dano`, `hit.especial`,
  `armor.dano`).
- O snapshot CPU x CPU conta eventos por `tipo`: campo novo é seguro, tipo novo só pode sair com a flag ligada.
- A ED10 continua para super/4º especial e foi revogada em parte só pelo botão ESQUIVA.
- Decisões do dono pendentes: DD1 (custo fixo 20 x mínimo por lutador), DD2 (botão x toque duplo), DD3 (completa na 1ª
  vez/curta nas repetições), DD4 (chefão esquiva), DD5 (números só nos especiais).

**Why:** a duração da cinemática depende de preferência/pular. No motor, o estado da luta dependeria do gosto do jogador.
A esquiva muda resultado, então tem que ser determinística.
**How to apply:** ao revisar a implementação, conferir o snapshot antigo sem `-u`, um snapshot NOVO com a esquiva ligada,
nenhum `rnd()` novo com a flag desligada e os e2e que já existem auditados por causa do congelamento de 0,8 s. Risco R1: a
tarja avisa o humano. Relacionado: [[project-mecanicas-e3]], [[project-plano-expansao]].
