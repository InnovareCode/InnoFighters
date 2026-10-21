---
name: project-prompts-runway
description: Como manter os prompts de arte (docs/prompts gerados por script) e as regras do Runway aprendidas nas folhas de WEI LONG, MIN-JI e HAYATO
metadata:
  type: project
---

`docs/prompts/*.md` são GERADOS: a fonte é `docs/prompts-arte.md` + `ferramentas/prompts/montar-prompts.mjs` (dados por
lutador, status, índice) e o verificador `verificar-prompts.mjs`. Editar só a saída se perde na próxima geração.

**Why:** em 2026-10-20 o dono trocou o Gemini pelo Runway (Nano Banana 2.1, 4:3, 2K, o Atlas gera), e as regras novas
vieram de defeitos medidos: duas referências fazem o modelo devolver uma delas; "80% da célula" é ignorado e corta
pés; o andar vira pulo sem "um pé no chão"; nocaute sai com a cabeça à direita (MIN-JI e HAYATO) e a correção por
edição cria artefato, então o Atlas espelha por código.

**How to apply:** mudar prompt = mudar a fonte/gerador, rodar os dois scripts, checar "OK: nenhuma falha". O verificador
agora barra: duas imagens em "Anexar", folha nova sem IMPORTANT SPACING ou sem "at least one foot is flat on the
baseline", nocaute sem "head on the LEFT side", "NÃO GERE AINDA", Gemini como gerador, HAYATO fora do traje A2.
HAYATO = traje A2 (gi cinza-grafite, debrum e raio amarelo-elétrico, mecha de raio, faixa verde, mãos enfaixadas).
Relacionado: [[project-curadoria-sprites]]
