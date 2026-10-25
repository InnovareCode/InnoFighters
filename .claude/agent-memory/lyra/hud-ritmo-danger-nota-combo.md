---
name: hud-ritmo-danger-nota-combo
description: HUD do ritmo (24/10/2026) - DANGER, nota do combo (BOM/OTIMO/INCRIVEL) e contador polido atras de Regras.ritmo.tarja; arquitetura, semantica do combo.t do motor, metodo de e2e por diff ligado/desligado e armadilhas
metadata:
  type: project
---

`src/render/hud-ritmo.ts` (`HudRitmo`): estado anda no TICK (`avancar(game)` em `fight.ts`, junto de `sessao.avancar`, so quando `game.tick` muda), desenho so le. `desenharHUD` recebe `opcoes.ritmo` (instancia da cena) so com `regras.ritmo.tarja === true` (flag reaproveitada, sem flag nova: nao mexe em `src/meta`); sem ela o laco antigo do contador roda intacto. `?ritmo=0` = rollback.

**Semantica do combo no motor (game.ts `updateCombos`):** enquanto o rival esta preso (`gotHits >= 2`) `combo.t` fica TRAVADO em 60 e `hits` acompanha; quando solta, `t` cai 60->0 e `hits` fica. "Combo acabou" = `t` deixou de ser 60 durante `phase==='fight'`. KO no meio da cadeia: `t` pode ficar 60 -> avaliar ao sair de `fight`. Zero do round novo (`intro`) NAO e fim de combo. O contador antigo fica parado em escala 1,4 enquanto `t==60` (pop = 1+(t-52)*0.05), entao com a flag o contador NAO e identico durante combo (de proposito); identico so quando nada novo aparece.

**Decisoes:** limiar DANGER `hp/maxHp <= 0,25` (barra atual do chefao), so em `fight` e fora do treino; notas por acertos 3/5/7 (+1 degrau se dano >= 30% da vida do rival); DANGER em y=146 (nao 150): em 844x390 o botao SUPER do toque (#sup) encosta no canto direito do HUD e a 150 o texto o tocava (medido em px CSS). DANGER desce 72 px se ha contador/nota do mesmo lado.

**Metodo de e2e (tests/e2e/hud-ritmo.spec.ts):** desenha o MESMO estado 2x ligado + 1x desligado, sem tick no meio; diff de pixels = o que o HUD novo acrescentou (caixa em px logicos e CSS). Armadilha: dois desenhos do mesmo estado deixam ~500 px soltos diferentes (particulas do cenario) -> mascarar com A vs A2. Depois do diff o canvas guarda o quadro DESLIGADO: redesenhar antes de ler pixel. Combo real do motor sem golpear: `p2.state='hit'; p2.stun=N; p2.gotHits=K; p2.comboDmg=D` (o motor solta sozinho quando o stun acaba). `?rs=2` na URL para o celular emulado.

Risco aberto: a Vega (R-8, cadeia por forca) mexe em game.ts; se mudar `updateCombos`/`combo.t`, reconferir a deteccao de fim de combo.

[[r9-super-ui-faixa-rosto]] [[desempenho-android-d1-d3]] [[ritmo-r1-r2-tarja-sem-congelar]]
