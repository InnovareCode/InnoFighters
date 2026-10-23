---
name: project-orcamentos
description: Orçamentos revisados do InnoFighters (R-8) propostos em 2026-10-23 em docs/orcamentos-2026-10-23.md — metas novas, boot em etapas, residência por peso, decisões OR-1..OR-9
metadata:
  type: project
---

Em 2026-10-23 entreguei `docs/orcamentos-2026-10-23.md` (dono aprovou que eu propusesse; ele decide OR-1..OR-9).
Escolhas e porquês que não estão óbvios no código:
- **Unidade**: os "MB" de atlas da Íris são MiB. Escrevo tudo em MiB, JS em kB gzip.
- **Atlas já são desenhados ~1,2x ampliados** (alturaRef 410 vs 2·255·scale px na tela) e o empacotamento é 72-82%: "meia
  resolução" fica borrado e reempacotar não salva memória. O corte viável é 0,9 da escala só em BAATAR/ZENON (OR-4).
- Cenário 1600x900 → 1920x1080 AUMENTA memória (5,5 → 7,9 MiB): ganho é peso e nitidez.
- Metas: JS inicial ≤135 kB, total ≤200; atlas ≤1,6 MiB (pesados ≤2,0), ≤40 MiB decodificado; cenário mantido; título ≤1,5 MiB
  BLOQUEANTE (não total); VS bloqueante ≤2,8 MiB; luta comum ≤115 MiB, com chefão ≤150; canvas ≤24 MiB em luta.
- O corte que paga a FILME é a vitrine deixar de ser fixa na luta ("fixo" vira "preferido", residência por peso).
- Achado: `criarSilhuetaBranca` lança se `getContext` for null → no iPhone, estourar o teto de canvas vira exceção no flash.
- Tetos de canvas do iOS e cota de Cache API ficaram [não verificado]: a busca na web falhou nesta sessão.

**Why:** a meta antiga de bytes "até a 1ª luta ≤ 4 MB" não fecha com vitrine de 4 atlas + FILME; a métrica certa é espera bloqueante.
**How to apply:** ao planejar desempenho, PWA ou FILME, partir das tarefas T1-T13 do doc e conferir no PROGRESSO quais OR o dono
respondeu. Relacionado: [[project-revisao-motor-luta]], [[project-estado-2026-10-23]], [[project-armadilhas-arte]], [[project-trailer-abertura]].
