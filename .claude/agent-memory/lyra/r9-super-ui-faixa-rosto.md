---
name: r9-super-ui-faixa-rosto
description: R-9 (24/10/2026) UI do super - pulo do filme a tick 6, modo por motivo, faixa/tarja estilo X-Men vs Street Fighter (rosto em close), botao SUPER no toque, linha no TREINO/Como-jogar, flip de RITMO_PADRAO - arquitetura e armadilhas
metadata:
  type: project
---

Implementação de R-9 (docs/spec-redesenho-jogabilidade.md §3.2-§3.4) + 2 pivôs de direção de arte do dono NO MEIO da tarefa
(referência X-Men vs Street Fighter, vídeo do Juggernaut). Trabalho em paralelo com a Vega (R-7, `src/fight`, `src/data/supers.ts`
— não tocados até ela entregar; depois troquei o stopgap pela função real `superDoLutador`).

**Arquitetura final da faixa/tarja:** `src/render/faixa-rosto.ts` é o módulo PURO compartilhado — `rostoDoGolpe(elenco, lutador,
ficha, golpe)` acha o recorte do rosto gritando (mesma pose `batidas[0].atacante` que o FILME já usa como "close": `getPD` +
`resolverPoseDoFilme`, da página FILME, `painel:true`) e `desenharFaixaComRosto(...)` pinta a banda laranja/amarela listrada
+ rosto + brilho vermelho na boca + nome. Dois consumidores: `FaixaRitmo` (`faixa-ritmo.ts`, especial comum, NÃO congela,
desliza da ESQUERDA — reescrevi a classe, geometria LARGURA inteira x 170px em y=86) e `TarjaDoSuper` (`tarja-super.ts`, novo,
congela 30 ticks fixos sem pular, + linhas de velocidade brancas irradiando do atacante no MUNDO via `aplicarCamera`).
**NÃO uso mais `Cinematica`/`pintarTarja` para nada disso** (a 1ª tentativa reaproveitava `Cinematica` com um modo `'super'`
novo — revertida inteira quando o dono mandou a referência visual real).

**Armadilha grave (custou 1h+): `ferramentas/balanco/elenco.ts` (`montarElenco()`, usado por DEZENAS de testes) nunca
mesclava o bloco `filme` do manifesto em `ch.pd`** — só a classe `AtlasLutador` (runtime real) fazia esse merge
(`carregador.ts`). Resultado: `rostoDoGolpe` SEMPRE devolvia null nos testes (e qualquer teste futuro que precisasse de
`pd['f0'..'f5']`/`painel`/`rosto`), mesmo com dados de produção corretos (`atlas.json` tinha `"f3": {"painel": true}` certinho).
Corrigido no próprio `elenco.ts` (replicar o merge de `AtlasLutador.poses()`): bug real, sem fallout nos 3279 testes depois.
**Se um teste usando `montarElenco()` depender de pose de painel/FILME e vier `undefined`, é isso.**

**`cfg.ritmo` (motor) ≠ `regras.ritmo` (UI) — não confundir ao montar um teste/gancho.** `this.ui.c.regras.ritmo?.super`
(lido por `reagirAoSuper`/botão do toque/etc.) vem da URL (`?ritmo=`) resolvida no BOOT (`main.ts`), não do `cfg` passado a
`ui.set('fight', {cfg: {ritmo: ...}})` — esse `cfg.ritmo` só alimenta o MOTOR (`cfgRitmo`/`Game.setup`). Testei isso errado
(`ui.set('fight', {cfg:{ritmo:{super:true}}})` sem efeito nenhum na UI) até perceber e trocar para `?ritmo=1` na URL.

**`h.avancar()` (o gancho `window.__inno` dos e2e) NÃO desenha.** Tirar screenshot/ler pixel exige `h.desenhar()` explícito
antes (como `LUM`/`PERTO` de `cinematica.spec.ts` já fazem) — sem isso o canvas fica preto na captura.

**RITMO_PADRAO (flip de default, pedido do dono depois de jogar com `?ritmo=1`):** `src/meta/regras.ts` ganhou
`RITMO_PADRAO = {tarja,provocacao,intervalos,filmeRestrito}` (as 4 provadas), baked em `REGRAS_PADRAO.ritmo` (mesmo padrão
de `MOTOR_V2_PADRAO`) e no branch "ausente" de `ritmoDaUrl` (antes devolvia `{}`). `super/cadeia/cpu/impacto` continuam fora
até cada uma ser provada. **Ripple:** testes que exercitam `Cinematica`/`Provocacao` CONGELANDO (o comportamento de ONTEM)
precisam de `regras: {...REGRAS_PADRAO, ritmo: {}}` explícito agora (fixei `cena-luta-cinematica`, `cena-luta-sons-temas`,
`cinematica-motor-v2`, `p2-provocacao-cena`); testes que comparam o cfg exato gerado por `select.ts` precisam somar
`...cfgRitmo(REGRAS_PADRAO)` (`ui.test.ts`). **e2e NÃO foi rodado por inteiro** (tempo) — qualquer spec que navega pelo
menu de verdade (não só `ui.set('fight', {cfg manual})`) pode ter o mesmo ripple; Íris deve rodar a suíte cheia.

**Botão SUPER no toque:** `data-k` agora aceita lista separada por vírgula (`"x,v"` = SFT+CFT juntas, `toque.ts` despacha
cada tecla); sem SVG do Apolo ainda — anel CSS magenta/rosa (`#touch #sup`, `toque.css`), posição `--x:1.2 --y:5.15`
(centro entre as colunas de soco/chute, acima do aglomerado). `body.sem-super` esconde (main.ts, mesma convenção do
`sem-esquiva`). Medido em 844×390: encaixa sem sobrepor pausa nem o resto — ver captura do handoff da sessão.

[[armadilhas-ui-innofighters]] [[ritmo-r1-r2-tarja-sem-congelar]] [[qa-reprovado-filme-flag-balao-deslize]]
