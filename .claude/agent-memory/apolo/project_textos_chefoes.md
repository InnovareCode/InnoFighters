---
name: project-textos-chefoes
description: docs/textos-chefoes.md (2026-10-21, A1 da spec de chefões progressivos) — enredo Os Cinco Selos (selo = pacto lacrado pelo anel do Arconte), limites §2.5, gênero na seleção/VS, correções de lore
metadata:
  type: project
---

Entregue em 2026-10-21 (missão cmvilwfrq00ir01p79ce5aqcz): `docs/textos-chefoes.md`, 5 guardiões + o que muda no ZENON +
seleção/desbloqueio, JSON no §9 (`textosDosChefoes` + `textosComuns`). Gerado por script (dados → tabelas + JSON) e validado
por script (limites, glifos pelo cmap das 2 woff2, repetição contra `src/data/provocacoes.pt-BR.ts`, voz); os scripts ficaram
só no scratchpad. Editar um campo = editar tabela e JSON iguais.

**Why:** dono aprovou a premissa "Os Cinco Selos" (D-B1); o texto final era meu. A premissa da Nova tinha 2 erros de lore que
corrigi no doc: CAMILLE (29) não pode ter sido rival do ZENON (61) "quando jovens"; o ZENON FUNDOU o torneio, não comprou.

**How to apply:**
- Bíblia: o anel-sinete do torneio = SELO DO ARCONTE; cada selo é um PACTO (AMINU bolsa de Kano / CENTELLA arena / CAMILLE
  posto de juíza / NILA estudar o selo que drena / BAATAR revanche que nunca veio). Derrotado, o guardião desfaz o pacto.
- O aviso e a seleção NÃO podem revelar gênero (fila secreta; CENTELLA, CAMILLE, NILA são mulheres): sujeito = "O 2º SELO",
  nunca "Derrote-o". No VS já pode: "A GUARDIÃ".
- `falas.entrada`: o código corta no 1º ". " (CURTA = só a 1ª frase); 1ª frase sempre termina em ponto, nunca "!".
- Os "34/linha, 2 linhas" da provocação NÃO valem aqui: a legenda é 1 linha (≤72) e a entrada 2 linhas (≤96); glifos sim.
- Antes de escrever lore, conferir idades e fatos em proposta-expansao.md / proposta-novo-chefao.md. Ver [[textos-provocacao]].
