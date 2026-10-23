---
name: cenarios-t1-webp
description: T1 do orçamento (2026-10-23) - cn/kr/br viraram WebP 1920x1080; fixtures do oráculo, qualidade por cenário, JPG antigos ainda em public/
metadata:
  type: project
---

cn/kr/br agora são `cenario-<sigla>.webp` (fontes `arte-fonte/cenarios/cenario-{cn,kr,br}-v1.jpg`, cópias dos `Cenario_*_2K_*.jpg` que têm "…" no nome). `ferramentas/converter-cenarios.mjs`: FONTES leva a extensão; QUALIDADES por id (cn 80, kr 70, br 70, padrão 80); argumento numérico sobrepõe todos.

**Why:** meta 3 do orçamento (<= 250 KiB, 1920x1080); a q80 o br dá 259 KiB. Memória por cenário sobe de 5,5 para 7,9 MiB (1600x900 -> 1920x1080 RGBA).

**How to apply:**
- Oráculo de fidelidade: `tests/fixtures/{jp,cn,kr,br}-prototipo.jpg` (bytes do protótipo); `tests/e2e/_jp-prototipo.ts` (`usarJpDoPrototipo`) intercepta `cenario-<id>.webp` nos quatro. Cenário novo que o protótipo também desenha precisa do mesmo tratamento.
- Armadilha de regex em `node -e "..."` dentro de bash: `\d` perde a barra e vira `d`; conferir com grep depois de editar.
- Classificador de permissão bloqueou apagar os JPG antigos de public/ (`git rm --cached` e remoção); deixados para quem tem autorização.
