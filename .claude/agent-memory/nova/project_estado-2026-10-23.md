---
name: project-estado-2026-10-23
description: Lacunas do plano original que continuavam abertas na auditoria de 2026-10-23 (CAIO/WEI LONG com arte do protótipo, cenários cn/kr/br antigos, orçamentos estourados, sem SW/aparelho real, docs de estado atrasadas)
metadata:
  type: project
---

Auditoria `docs/revisao-completa-2026-10-23.md` (HEAD f5b5fab). Lacunas que não aparecem no PROGRESSO.md:
- CAIO e WEI LONG continuam com os atlas v1 do protótipo (3600 px, acima do teto de 2048 do PLANO); as folhas novas deles
  (WEI LONG v4 aprovada na D4) nunca passaram pelo pipeline. Os cenários cn/kr/br são os JPG 1600x900 do protótipo; os 3 novos
  (templo, palácio, Rio) estão parados em arte-fonte/. Nenhuma decisão do dono registrada para isso.
- `ferramentas/marcador/` vazia (âncora/ponta automáticas); tecla H não desenha caixas; flash branco por página, não por quadro.
- (Orçamentos novos propostos no mesmo dia: [[project-orcamentos]].) Orçamentos §6 estourados: memória ~287 MB (meta 120), 7 de 10 atlas > 1,2 MB, JS total ~174 KB gz. Sem service worker,
  audioSession, vibração; aparelho real nunca medido.
- PROGRESSO/CHANGELOG/README/arquitetura param em 64f2647 (2026-10-21); o estado mais novo estava em CONTEXTO-SESSAO.md (fora do git).
- Vitest: 2 testes estouram 5 s sob carga (chefe-adversarial, sons-volume) e passam sozinhos.

**Why:** a próxima sessão tende a planejar em cima do PROGRESSO.md, que está atrasado, e a supor que a F3 terminou.
**How to apply:** antes de planejar arte, desempenho ou deploy, conferir se estes itens já foram resolvidos (git log + medir
atlas) em vez de confiar no PROGRESSO. Relacionado: [[project-arquitetura-mvp]], [[project-armadilhas-arte]], [[project-revisao-motor-luta]].
