---
name: project-arquitetura-mvp
description: Arquitetura recomendada para o InnoFighters (Vite+TS+Canvas 2D, porte do protótipo) e decisões pendentes do dono em 2026-10-20
metadata:
  type: project
---

Em 2026-10-20 propus (PLANO.md na raiz) a Opção A: Vite + TypeScript + Canvas 2D, motor próprio portado do protótipo;
Phaser (B) descartado por exigir reescrita; PixiJS (C) guardado como plano B só para a camada render/ se o portão de
desempenho em celular (Fase 4) falhar. Sem backend no MVP; jogo local; dono solo.

**Why:** o protótipo já tem loop de passo fixo, frame data tabelado e 13 cenas afinadas — reescrever custaria mais
que o ganho. `fight/` deve ficar puro (sem DOM/render), com RNG de semente, para teste e futuro netplay.

**How to apply:** não reabrir a escolha de stack sem motivo novo (medição de fps/memória). Antes de planejar a próxima
etapa, checar no PLANO.md seção 9 quais decisões D1–D9 o dono já respondeu (D1 HAYATO sem arte nova; D2 FX assados vs
procedural; D3 regenerar MIN-JI). Contratos C1–C4 (manifesto de atlas, InputFrame, estado de leitura, storage) estão
na seção 4.3. Relacionado: [[project-armadilhas-arte]].
