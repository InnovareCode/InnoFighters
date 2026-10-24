---
name: qa-super-ritmo-padrao-7f62baf
description: QA 2026-10-24 do ritmo padrao + super (R-7/R-9) em 7f62baf (+ paleta da Lyra sem commit) - specs velhos, defeitos de produto achados, tecnica de teclado real, numeros G1/G2/G10
metadata:
  type: project
---

**Técnica que funcionou (reusar):** super pelo teclado real = `window.dispatchEvent(new KeyboardEvent('keydown', {key:'x'}))` e `'v'` NA MESMA `page.evaluate`. `page.keyboard.down` duas vezes cai em lotes de rAF diferentes (headless ~1-2 Hz, catch-up de 6 ticks) e as bordas ficam a 6 ticks (> janela de 2): sai o golpe comum, nunca o super. Diagnóstico: ler `p1.hpApertadoEm`/`hkApertadoEm` (privados, acessíveis em runtime). Menu real: `scene.cur[0] = scene.grade.indexOf(id)` e Enter de verdade; baatar/guardiões exigem save `inno-fighters-v2` com `prog.desbloqueados`; ZENON como P1 não sai do select (locked).
**Armadilha de harness:** antes de testar golpe de agarrão/projétil em luta viva, zerar `y=470, vx=vy=0, grounded=true, stun=0` dos dois (só `state='idle'` deixa o rival no ar e o agarrão erra: falso defeito). `p2.cpu=null` congela a IA.

**Specs velhos (padrão novo = ritmo ligado):** `cinematica`, `tarja-motor-v2`, `provocacao`, `provocacao-p4`, `provocacao-p4-varredura`, `zenon-z2z3:453` medem o comportamento ANTIGO (tarja que congela 48, provocação que para o motor): corrigidos só com `&ritmo=0` na navegação, sem tocar asserção. Gap: o padrão novo dessas áreas (balão sobreposto) só tem cobertura em `ritmo-r1-r2`.

**Defeitos de produto achados (não corrigi):**
1. `modoDoFilme` (fight.ts ~706) lê `game.matchWinner !== null` para decidir COMPLETO, mas o motor só seta `matchWinner` em `endRound()` (~100 ticks depois); `decideALuta` só existe no gancho `?filme=` (`lerFilmeDev`). Real: KO que decide a luta abre filme CURTO (medido no canvas, winsNeeded=3, p1.wins=2). Vale para super e especial comum.
2. CPU x CPU com `?ritmo=1`: 0 supers em 6 lutas (barra máx ~60-79, nunca 100; G10 pede 1 a 4). Humano sem gastar especial não foi medido.
3. `ritmo-r1-r2` "faixa não cobre a cabeça" (y1 <= 195) falha em 7f62baf e passa em 9c0c610: a faixa com rosto (170 px, y 86-256) é decisão de arte do dono; contrato do spec ficou velho — não afrouxei.
4. `memoria-filme` (WS +54-57 MiB, limite 30) vermelho também em 9c0c610: pré-existente/ambiente.

**Números (6 lutas CPU NORMAL, melhor de 3, padrão = ?ritmo=1 nos números porque cadeia/cpu/impacto ainda não existem):** sem controle até o KO final 17,5% (15,4-21,7), dentro do round 6,7%, luta toda 21,5%; tarja 0 ticks em todas. Super: 0/6.
