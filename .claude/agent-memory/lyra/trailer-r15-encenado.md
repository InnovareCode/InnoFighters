---
name: trailer-r15-encenado
description: R-15 (2026-10-24/25) UI do trailer encenado - tarja do super só no P9, entrada do ZENON sobreposta (cartão compacto na faixa de cima), HUD só com contador, e a armadilha de medir "parado" por quadros idênticos (a câmera anda sempre)
metadata:
  type: project
---

Continua de [[trailer-t4-t5]], [[r9-super-ui-faixa-rosto]], [[hud-ritmo-danger-nota-combo]]. Contrato: `QuadroDoTrailer.tarjaSuper/filme/arconte`, `Tomada.energia/vida` (Vega, docs/partitura-trailer.md §8).

- **Tarja do super no trailer** = `TarjaDoSuper` (render/tarja-super.ts) instanciada em `ui/trailer/trailer.ts`, aberta por `q.tarjaSuper` (iniciar no tick do `special`, `avancar` nos 30 seguintes, o diretor para o motor). O nome vem de `superDoLutador(id, ficha)`. O rosto cai no `retrato.webp` (o trailer não carrega a folha FILME). Seed própria `sementeVisual + 7`. `Cinematica` ficou no arquivo mas o diretor não produz mais `q.cine`.
- **P9 com motor andando desde o tick 0**: a entrada do ZENON (ticks 96-155) é SOBREPOSTA. Removi a pose imposta do chefão (a pose agora é a do golpe/defesa dele) e criei `EntradaDoChefe.sobreposta` (render/entrada-chefe.ts, aditivo, desligado por `iniciar`/`zerar`): cartão compacto (nome 30 px/título 17/rodapé 10) na faixa preta do letterbox (y < 69), some com as faixas. A janela do diretor (60 ticks) nunca dá o 60º `avancar`, então a cena chama `entrada.zerar()` quando `arc.entrada` fecha (senão a entrada fica "ativa" para sempre e o cartão cobre o filme).
- **HUD no trailer**: `HudRitmo` só para o contador (`desenharCombos(ctx, luta, false)`: 3º parâmetro novo `comNota`, padrão true). Avança no tick do motor (`luta.tick` novo), zera na troca de plano. Fora do filme, abaixo da tarja.
- **ARMADILHA (quase passou verde sem provar nada): "quadros idênticos" NÃO mede parado no trailer.** A câmera (zoom em rampa entre quadros-chave) muda todo quadro, inclusive no miolo da tarja, então o hash do quadro nunca repete (`quadrosIguais: 0` era vazio). Mede-se o MOTOR: `luta.tick` repetido fora de tarja/filme, e os dois lutadores sem mudar x/y/estado/golpe entre ticks do motor (`diagnostico().luta`). Controle obrigatório: a mesma medida tem que enxergar os ≥25 ticks congelados da tarja. Medido: motor sem andar <= 18 ticks (P1, câmera lenta), os dois parados <= 5.
- **Flake pré-existente** no e2e `determinismo` do trailer.spec: tick 300 difere em ~26 px de 1 nível (região direita-baixo, não o contador) quando o passo de avanço varia (48 vs 2) — ~17% das rodadas. Reproduzido com o HUD desligado: não é do R-15. Causa não investigada (passo de `h.avancar` muda 1 nível de pixel).
- **Medir p99 no SwiftShader não separa efeito de 1 desenho**: P5 (que não toquei) variou 34 -> 44 ms de p95 entre duas rodadas; o p99 (~470-570 ms) são os picos de 1ª passada. A/B com tarja+contador desligados deu p95 32,8 (com) vs 39,7 (sem): ruído. Para Android real precisa do aparelho (?fps=1).
- Ambiente: este repo tem arquivos mistos LF/CRLF; `Edit` multi-linha funcionou. `taskkill //PID` mata o servidor sem matar o bash. Playwright config isolada (`webServer` ausente, porta 5471) apagada no fim.
