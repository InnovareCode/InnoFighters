---
name: project-plano-expansao
description: Decisões técnicas da expansão do InnoFighters (8 lutadores + chefão + desbloqueio) propostas em docs/plano-expansao.md em 2026-10-20
metadata:
  type: project
---

Em 2026-10-20 entreguei `docs/plano-expansao.md` (fases E0–E8, decisões ED1–ED12 do dono). Escolhas técnicas minhas:
- Storage em chave NOVA `inno-fighters-v2` (não `v:2` na chave v1): o build v1 regrava por cima de `v!==1` → rollback apagaria progresso. `-v1` preservada por uma release.
- Progresso guarda lista explícita `desbloqueados` (não derivar de `zeradas`) para reordenar a fila não revogar nada.
- `IDS_LUTADORES` como const em core/contratos (storage precisa validar ids e core não importa data).
- Chefão = mesmo LutadorDef com bloco `chefe` aplicado só com `ConfigPartida.chefe`; jogável = sem o bloco.
- Catálogo fechado de primitivas, ≤1 nova por lutador; 3 especiais mantidos (sem super) para não mexer em C2/toque/CPU.
- Carga sob demanda + `retrato.webp` viram pré-requisito (9 atlas no boot ≈ 150 MB); C1 v2 com páginas porque 49 poses provavelmente não cabem em 2048² (estimativa, não medida).

**Why:** caminho crítico da expansão é a arte gerada pelo dono, não o código; o código (E1–E4) deve ficar pronto antes com lutador provisório.
**How to apply:** ao retomar a expansão, checar no PROGRESSO.md quais ED1–ED12 o dono respondeu antes de detalhar E3/E5. Relacionado: [[project-arquitetura-mvp]], [[project-armadilhas-arte]].
