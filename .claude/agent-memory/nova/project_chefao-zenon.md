---
name: project-chefao-zenon
description: Spec do chefão ZENON (docs/spec-chefao-zenon.md, 2026-10-21): dreno = parâmetro, danca→cena, entrada fora do motor, flip só com a arte, D-Z1..D-Z4
metadata:
  type: project
---

Em 2026-10-21 entreguei `docs/spec-chefao-zenon.md` e estendi `docs/identidade-visual-especiais.md` (E12, §3.10, linhas 30–34).
Dono decidiu: chefão = ZENON (candidato A), BAATAR normal 5º na fila com MERGULHO no →+ESP base.
- `drenaEnergia {acerto, defesa}` por GOLPE = **parâmetro** (ramos acerto/bloqueio de applyHit, só move `en`); proibido com `proj`
  e `hits>1` (drenar 1x por golpe pediria estado). Roda depois dos ganhos normais; sem dreno na armadura.
- `ConfigChefe.danca` → `cena: CenaDef {duracao, poses}`; etapa 'danca' → 'cena'. Entrada/vitória = tabela de render
  `APRESENTACAO` (override de pose na `intro`/`win`); entrada dramática = `CenaFight` não chama `game.update` (como a cinemática).
- Achados: o "escurece céu do mn" NUNCA existiu (aura é render nova); `PapelIa` não tem 'zonear'; hurtbox é fixa (254 px) para
  qualquer escala → reusar `alturaEmPe` medido; pipeline ancora por centro de massa (casaco desloca) → `ancora: 'tronco'`;
  `'zenon'` em IDS_LUTADORES antes da arte quebra o boot (elenco carrega todo manifesto) → flip único na Z5.
- Fatias Z0..Z8 + A1; decisões D-Z1 (jogável: sim), D-Z2 (BAATAR na 9ª casa), D-Z3 (entrada completa/curta), D-Z4 (sem S11).

**Why:** manter 0 primitiva nova para o chefão e o snapshot/lock-step intactos; arte é o caminho crítico.
**How to apply:** ao revisar Z0–Z7, conferir snapshot sem -u, o unit de determinismo da entrada e o flip num commit só.
Ver PROGRESSO.md para as respostas de D-Z1..D-Z4. Relacionado: [[project-mecanicas-e3]], [[project-esquiva-cinematica]].
