# Handoff Íris — QA adversarial do E3 · S0 + S1a

Data: 2026-10-21 (sessão começou em 2026-10-20 à noite). Alvo: `src/fight/game.ts`, `fighter.ts`, `cpu.ts`, `src/data/montar.ts`, `src/core/contratos.ts` + o que a Lyra mexeu (`render/lutador.ts`, `input/teclas.ts`). Não editei `src/` nem testes existentes. Não rodei `test:e2e`.

Arquivo novo: `tests/unit/chefe-adversarial.test.ts` (41 testes: 36 passam, 5 são `it.fails` = bug real).

## VEREDITO: APROVADO (com 3 correções recomendadas antes da E5)

Sem crash, sem estado corrompido, determinismo e snapshot intactos; o contrato C3 e a primitiva do chefe se sustentam em cantos que o `chefe-e3.test.ts` não pisava. Achei **5 defeitos reais**, todos com teste que falha hoje. Nenhum bloqueia a E4 (UI) nem corrompe a luta; os dois primeiros da lista (#1, #2) contradizem o que o handoff da Vega afirma, e o #3 vira jogo travado se um dado de ficha vier com erro. Recomendo corrigir #1–#3 antes de o chefe real (E5) entrar.

## Defeitos (cada um tem `it.fails` em `tests/unit/chefe-adversarial.test.ts`)

| # | Sev. | O quê | Causa provável |
|---|------|-------|----------------|
| 1 | média-baixa | **O jogador ataca durante a Dança.** Soco apertado antes da cena e ainda no buffer sai com a cena em andamento (medido: `p1.move === 'hp'` no 4º tick da cena; som de golpe e, em especial, gasto de energia). Contradiz "o jogador não recebe entrada nesse período". Sem dano (o `resolveHits` não roda na cena), mas projétil/ESP gasta energia à toa. | O `Game` manda `NO_INPUT` na cena, mas o `buf` do Fighter (9 ticks) é consumido em `fighter.ts:484-485` (`resolveAttack(this.buf.k…)`) quando o golpe anterior acaba. Correção: ao entrar na cena (`game.ts:424 talvezIniciarCenaDoChefe`) zerar `p.buf = null` nos dois lutadores (ou `buf` não ser consumido com `phase === 'cena-chefe'`). |
| 2 | baixa | **Projétil do chefe que acerta o jogador no MESMO tick da troca apaga o congelamento**: sai `hitstop 4 / shake 9` em vez de `20 / 14`. | `resolveHits` faz o loop corpo a corpo e depois o de projéteis. O 1º `applyHit` (troca) consome a flag `trocaDeBarraNoTick` em `reforcarTrocaDeBarra`; o 2º `applyHit` (projétil do chefe no jogador) regrava `hitstop` em `game.ts:691` e ninguém reforça de novo. Correção: guardar o "tick da troca" no Game (por tick, não consumir no 1º reforço) e reaplicar 20/14 no fim do `resolveHits`, ou fazer o hitstop da troca ser `max` só nesse tick. |
| 3 | média | **`fichaFase2` inexistente só estoura 90 ticks depois da 1ª troca, no meio da luta**, dentro de `Game.update`: o jogo fica preso em `cena-chefe` e lança erro a CADA tick. `fichaFase1` inexistente já falha alto no `setup` (ok). | `trocarFicha(cfg.fichaFase2)` só roda em `game.ts:444 andarCenaDoChefe`. Falta validar as duas fichas em `Fighter.virarChefe` (`fighter.ts:201`) ou em `montarLutador` (`montar.ts:129-135`, fail-fast). O teste aceita o erro em qualquer dos dois lugares. |
| 4 | baixa (latente) | **Chamada direta de `resolverVidaZerada` deixa `trocaDeBarraNoTick` ligada** e o PRÓXIMO golpe comum da mesma luta sai com hitstop 20 (medido 20, esperado 4). Hoje só testes chamam direto; `applyHit`/`arremessar` sempre consomem. A luta/round seguinte já NÃO herda (o `clearFx` agora zera a flag — correção que apareceu em `game.ts:181` durante esta QA; deixei esse caso como teste de regressão normal). | Estado escondido consumido por quem não o produziu. O ideal é a flag virar variável local/retorno do resolver (ex.: devolver `'troca'|'ko'|false`), em vez de campo do Game. |
| 5 | baixíssima | `fichas['toString']`/`['constructor']` acha a função herdada de `Object.prototype`: `trocarFicha('constructor')` não lança e `chDaFicha(ch, 'toString')` devolve uma função. | Lookup em objeto simples (`fighter.ts:217`, `render/lutador.ts:15`). Sem risco prático (nomes vêm de dados tipados), mas fura a promessa "desconhecido → erro / base". `Object.hasOwn` resolve. |

Quando um defeito for corrigido, o respectivo `it.fails` passa a FALHAR de propósito: trocar por `it`.

## PROVADO (executado)

- `npm run typecheck`: limpo. `npm test`: 30 arquivos, **638 passed + 5 expected fail** (643), verde. Snapshot `tests/unit/__snapshots__/fight.test.ts.snap` com o mesmo sha256 antes e depois (`3cb3b231…0356`); nenhum `-u`. (Antes, no começo da sessão, havia testes da S1b em andamento falhando e erros de tipo em `baatar-s1b.test.ts`/`sprites-pipeline.test.ts`; outros agentes corrigiram durante o trabalho. `src/` mudou sob mim: testei a versão de ~23:56 de `game.ts`.)
- **Cobertura adversarial (36 testes verdes):**
  - Troca com o chefe **no ar** (cai, cena só no chão), **em golpe com armadura** (barra cheia: armadura absorve e não troca; golpe que zera: interrompe o golpe do chefe e troca), **no meio do próprio agarrão** (soco que troca cancela o agarrão, ninguém é arremessado), **arremesso REAL do jogador** (→ + soco forte: ordem `fase-chefe` antes de `throw`, hitstop 20, shake 14, barra cheia, derruba, cena depois), tremor desligado (`shake` 0 e hitstop 20, em golpe e em arremesso), **chefe de 3 barras** (além do contrato, que tipa `barras: 2`).
  - **Projétil em voo na entrada da cena**, do jogador e do chefe: projétil lento que só chegaria ao alvo depois do fim da dança; some e não acerta na retomada.
  - **Mesmo tick**: KO do jogador pelo projétil do chefe junto com a troca (vale o KO, sem cena, chefe vence, não é perfeito, sem bônus), fim de tempo com a cena pendente e chefe caído (vence quem tem mais `vidaTotal`; sem cena), **empate exato por tempo** com cena pendente (novo round, chefe volta a 2 barras/ficha 1/`cenaPendente` false/`invuln` 0).
  - **Reaproveitamento**: Game usado numa luta de chefe parada NO MEIO da dança e reusado para uma luta normal CPU×CPU (semente 42) é idêntico, tick a tick, ao mesmo duelo num Game novo; P1 nunca vira chefe (nem com o lutador-chefe como P1); espelho BAATAR×BAATAR com chefe só no P2; `cfg.chefe` num lutador sem `chefe` produz luta idêntica à sem a opção; falha de `setup` por `fichaFase1` ruim deixa o Game limpo para a luta seguinte.
  - **`perfect`/bônus com chefe**: jogador que levou dano não é perfeito (e leva o bônus); chefe que vence sem perder barra é perfeito e **não** leva o bônus; chefe que vence depois de perder barra não é perfeito; evento `perfect` só sai com `g.perfect`.
  - **Determinismo**: chefe×CPU, mesma semente → saída idêntica tick a tick; semente diferente → diferente; a luta passa por troca/dança/retomada (não é vazio).
  - **Fuzz de invariantes**: 6 cenários × 5 sementes, todos com o chefe com armadura em hp/hk (4 com P1 na CPU de 4 lutadores diferentes, 2 com "apertador de botão" aleatório que produz arremesso/armadura/projéteis reais). A cada tick: ordem `troca→danca→retomada` sem repetir, barras em [1, max], `hpShown == hp` no tick da troca, ficha `chefe2` só depois da retomada, na cena: chefe `cena`, no chão, projéteis 0, hitstop 0, relógio parado, sem `hit/armor/block`, ≤ 90 ticks e exatamente 90 ao retomar.
- **Mutação (no sandbox, `src/` real intocado):** apagar a limpeza de projétil da cena (4 testes caem); `reforcarTrocaDeBarra` vazio (5); `clearFx` sem zerar a flag (1); `perfect` sem checar barras (3); bônus sempre (1); troca sem `invuln` (2); cena sem checar estado livre (12); troca sem zerar `gotHits` (1). **Sobrevivente:** tirar `!c.grounded` do gatilho da cena não muda nada (equivalente: estado `idle|walk|crouch|land` já implica chão).

## NÃO provado / fora

- Nada em navegador (sem `test:e2e`, sem `preview`): handler `etapa === 'troca'` da Lyra e render por ficha seguem só por tipo/unit.
- Gamepad e toque **não produzem `spSeg`** (`src/input/teclas.ts` é o único produtor): quando a S2 (MASHI) existir, quem joga no controle/celular não carrega o golpe. Não bloqueia a S0/S1a.
- Um golpe do chefe/jogador que acerta no tick em que a cena abre tem o hitstop zerado pela cena (`hitstop = 0` em `talvezIniciarCenaDoChefe`); decisão de projeto, só registrei.
- O `hit` do tick da troca publica `acertos: 0` (a troca zera `gotHits`); ninguém consome o campo hoje (`grep`).
- BAATAR real (`src/data/lutadores/baatar.ts`, apareceu durante a sessão, S1b) não foi exercitado por mim; todos os testes usam o BAATAR provisório sobre o atlas do WEI LONG.
- Números de balanceamento (IA do chefe, hp por barra, duração da dança) não são QA, são E6.

## Bloco de handoff

```
VEREDITO: APROVADO (com ressalvas #1-#3 abaixo)
RESULTADO: 41 testes novos em tests/unit/chefe-adversarial.test.ts (36 verdes, 5 it.fails = bugs reais). typecheck limpo; npm test 638 passed + 5 expected fail; snapshot CPU x CPU semente 42 intacto (sha256 igual). Fuzz de invariantes (6 cenarios x 5 sementes), determinismo, reuso de Game, perfect/bonus, ficha invalida, mutacao em 9 pontos (1 equivalente).
PARA O PRÓXIMO:
  Vega (antes da E5): (#3) validar fichaFase1/fichaFase2 em Fighter.virarChefe ou montarLutador (hoje fichaFase2 ruim trava o jogo em cena-chefe 90 ticks depois da 1a troca); (#1) zerar buf dos dois lutadores ao entrar na cena (fighter.ts:484 consome o buffer com a danca em andamento); (#2) hitstop 20/shake 14 da troca perdidos quando projetil do chefe acerta o jogador no mesmo tick (game.ts:691); (#4) trocaDeBarraNoTick como retorno do resolver em vez de campo do Game; (#5) Object.hasOwn nas fichas. Ao corrigir, trocar o it.fails correspondente por it.
  Órion: itens #4 e #5; a decisao "perfect depende de barras === barrasMax" foi exercitada e se sustenta (mutacao pega).
  Lyra: nada a corrigir; quando houver chefe jogavel, ver 1 "FASE 2!" so. Gamepad/toque nao produzem spSeg (S2).
PENDÊNCIAS: navegador/e2e com chefe; BAATAR real (S1b) sob este mesmo fuzz; spSeg em gamepad/toque; teste de hitstop quando golpe acerta no tick em que a cena abre (decisao de projeto).
APRENDIZADO: areas frageis do chefe = (a) tudo que regrava hitstop/shake depois do resolver (applyHit/arremessar/projetil no mesmo tick), (b) buffers do Fighter (buf 9 ticks) que atravessam fronteiras de fase do Game, (c) validacao de dados so em tempo de uso (ficha da fase 2), (d) flags privadas do Game consumidas por quem nao as produz. Sandbox de mutacao: copiar src+tests para pasta temporaria com node_modules por junction e mutar la; o repo estava sendo editado por outros agentes durante a QA.
```
