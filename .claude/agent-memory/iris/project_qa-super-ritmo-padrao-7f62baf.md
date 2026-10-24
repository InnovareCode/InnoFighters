---
name: qa-super-ritmo-padrao-7f62baf
description: QA 2026-10-24 do ritmo padrao + super (7f62baf e 2403b2d) - tecnica de teclado real, specs velhos, defeitos achados e corrigidos, causa da memoria-filme (+54 = politica por-peso), specs novos
metadata:
  type: project
---

**Técnica que funcionou (reusar):** `tests/e2e/_menu-real.ts` (`irAteALuta`, `prepararDuelo`, `espiarMotor`, `teclas`): menu real em `?manual=1` com `h.avancar`, SEM `?ritmo=` = padrão. Comando de 2 botões = `dispatchEvent` das duas teclas na MESMA `evaluate` (em tempo real, `page.keyboard.down` duas vezes cai em lotes de rAF diferentes e as bordas ficam a 6 ticks > janela 2). Toque em `?manual=1`: CDP `Input.dispatchTouchEvent` touchStart, `avancar`, touchEnd (o `tap` solta antes de qualquer tick). Menu: `scene.cur[0] = scene.grade.indexOf(id)`; guardiões exigem save `inno-fighters-v2` com `prog.desbloqueados`; ZENON como P1 não sai do select.
**Armadilha de harness:** antes de agarrão/projétil em luta viva, zerar `y=470, vx=vy=0, grounded=true, stun=0` dos dois (só `state='idle'` deixa o rival no ar e o agarrão erra: falso defeito). `p2.cpu=null` congela a IA.
**Prova de que o teste novo pega o defeito:** worktree no commit ANTES da correção (npm ci real, 4 s, sem junction) + copiar o spec + `query='&ritmo=1'`: reprovou COMPLETO (super e especial comum) e a CPU sem super; passou o resto.

**Specs velhos com o padrão novo (corrigidos só com `&ritmo=0`, sem tocar asserção):** `cinematica`, `tarja-motor-v2`, `provocacao*`, `zenon-z2z3:453`, `fidelidade-ui` (oráculo do protótipo: sem a linha do SUPER), `combos-tela` (`ritmo: {}` no `abrir`: com o super a lista de golpes encolhe e a caixa sobe 54 px). A cobertura do padrão novo é `ritmo-padrao-super.spec.ts` + `ritmo-r1-r2`.

**Defeitos achados em 7f62baf (corrigidos em 2403b2d):** (1) filme COMPLETO nunca saía (`matchWinner` só em `endRound()`; agora `decideALuta` no evento); (2) CPU sem super (0/6 lutas; agora ~1,8/luta no padrão); (3) faixa 170 px cobria a zona das cabeças (agora 105).
**memoria-filme (+54-57 MiB contra 30):** causa = política por-peso virou padrão em 78de1be; o spec foi escrito com 'fixa' (+14). Em HEAD com `&residencia=fixa` volta a +14,4/+15,0; a contabilidade da arte do jogo (`arte.memoria()`) dá +9,375 MiB exatos nas duas políticas e os mesmos pedidos. Não é custo de produto: spec fixado em `fixa` + teste novo da contabilidade por-peso. Bisect: 41e1ffb passa (+14), 78de1be falha.

**Números (6 lutas CPU x CPU, NORMAL, melhor de 3, padrão 2403b2d):** supers 2,1,2,3,3,0 (média 1,83); G1 6,1-7,9%; G2 até o KO 16,5-18,6%; tarja congelante 0; flash-super = 30 x supers. Só ~3 de 11 supers da CPU conectaram (hits do super); o resto bloqueado/errado.
