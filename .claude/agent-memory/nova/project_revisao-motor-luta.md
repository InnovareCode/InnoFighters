---
name: project-revisao-motor-luta
description: Spec de revisão do motor de luta (docs/spec-revisao-motor-luta.md, 2026-10-22) — buffer 4 ticks, cancel estrito, scaling com proration e piso, especiais 25-35, frame data revisado dos 10
metadata:
  type: project
---

Em 2026-10-22 entreguei `docs/spec-revisao-motor-luta.md`.
- **Combos e buffer:** buffer de ataque reduzido de 9 para 4 ticks (sem decaimento durante hitstop e 5 ticks no knockdown). Cancelamento estrito (`cancelWindow: [S, S + A + 2]`), eliminando cancelamento na recuperação tardia. Rotas de cadeia personalizadas por arquétipo (`rotasCombo`).
- **Scaling de dano e especiais:** especiais reajustados para dano base de 25 a 35 (eram 8 a 20). Novo scaling não-linear (100%, 80%, 65%, 50%, 40%, 30%), starter proration (80% inicial para jabs leves) e piso mínimo garantido de 30% para especiais (evita combo degenerado sem matar a recompensa da barra gasta).
- **Cinemática e câmera:** super freeze dramático no frame inicial (48 ticks na 1ª vez / 16 ticks curta nas repetições); zoom dinâmico na apresentação (1.20x-1.25x ancorado no atacante em `ease.cubica` com chão fixo); hitstop de impacto estendido (12-14 ticks) no acerto final com tremor direcional.
- **Frame data dos 10 lutadores:** tabela base revisada (`lp` 3/3/6, `lk` 4/3/8, `hp` 7/4/13, `clp` 3/3/6, `clk` 5/3/8) e mods individuais calibrados em `src/data/lutadores/*.ts`.
- **Compatibilidade:** flag `revisaoMotor` em `ConfigPartida` (true em prod, false no teste legado) protege o lock-step do oráculo (`luta-fidelidade.test.ts`) e `?expansao=4`.
- Decisões DD-M1..DD-M6 pendentes de validação pelo dono.

**Why:** o motor antigo tinha buffer de 9 ticks e cancel tardio que tornavam a jogabilidade frouxa; os especiais davam menos dano que chutes fortes normais.
**How to apply:** na implementação (Vega/Lyra), checar se `luta-fidelidade` passa com a flag desligada, atualizar tripwires de dano em `balanco-adversarial.test.ts` e rodar o harness de balanço. Relacionado: [[project-esquiva-cinematica]], [[project-mecanicas-e3]], [[project-chefoes-progressivos]].
