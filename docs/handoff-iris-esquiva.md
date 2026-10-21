# Handoff Íris — QA adversarial da ESQUIVA e do balanço E6b (pós-commit 1cb1ccd)

Data: 2026-10-21. Alvo: motor da esquiva (`src/fight/fighter.ts`, `game.ts`, `cpu.ts`), eventos novos da V1/V2, dados da E6b e as correções de entrada da E7a (`src/input/gamepad.ts`, `toque.ts`, `teclas.ts`). Não editei `src/` nem testes existentes. Não rodei `test:e2e`. Versão testada: `src/fight/*` com mtime 2026-10-21 09:30-09:31 (a Lyra editou `src/input`, `src/render`, `src/ui` em paralelo; `gamepad.ts`/`teclas.ts` já tinham L1/L2 e `esq` quando testei).

## VEREDITO: APROVADO (com 3 correções de baixa gravidade recomendadas)

O motor da esquiva se sustentou em todos os cantos pedidos: fuzz de invariantes, determinismo, "sem a flag nada muda e nenhum RNG novo", estado reaproveitado, chefão, agarrões, projéteis, PARADE. O balanço novo reproduz exatamente os números da Vega e não tornou nada trivial. Achei **3 defeitos reais**, todos com `it.fails` que falha hoje, nenhum bloqueia a luta (nada trava, nada corrompe estado). O #1 é da mesma família do defeito #1 da QA do E3 (buffer atravessando a fronteira de fase do chefão) e vale corrigir antes de o chefão ir para o dono.

## Defeitos (cada um tem `it.fails`)

| # | Sev. | O quê | Causa provável | Teste |
|---|---|---|---|---|
| 1 | média-baixa | **A esquiva guardada atravessa a Dança da Águia.** Jogador atordoado/atacando no instante em que a cena abre tem o botão ESQ guardado (6 ticks); ao ficar livre, durante a cena (`phase === 'cena-chefe'`), a esquiva sai: evento `esquiva`, `-20` de energia, 120 px de deslocamento e invulnerabilidade no meio da cena. Medido: `en` 100 -> 80 no 2º tick da cena. | `Game.talvezIniciarCenaDoChefe` (`game.ts:470-471`) zera `buf` dos dois, mas não o `bufEsq` (private, `fighter.ts:127`, alimentado em `:499`, consumido em `:574`). Correção: zerar também o `bufEsq` ao abrir a cena (método público tipo `limparBotoesGuardados()`), ou não consumir `bufEsq` com `phase === 'cena-chefe'`. | `esquiva-chefe-cpu.test.ts` "uma esquiva GUARDADA do jogador não pode sair durante a Dança" |
| 2 | baixa | **Avanço contra rival colado na parede: o resultado depende de ser P1 ou P2.** No canto esquerdo o P1 que avança atravessa o P2 e acaba do outro lado; o P2 que avança contra o P1 no mesmo canto NÃO atravessa (acaba do mesmo lado). Espelhado no canto direito. Na orientação natural (P1 à esquerda, P2 à direita) o avanço contra um rival encurralado nunca cruza; na orientação trocada sempre cruza. | `Game.separate` (`game.ts:536-541`): os dois ficam em x = 60 (clamp), `dx === 0`, e o desempate `s = dx >= 0 ? 1 : -1` assume o P2 à direita, então o P1 sempre vai para a esquerda. Correção: desempatar pelo lado de onde o avançador veio (`facing` antes do avanço) ou pela direção do movimento. | `esquiva-cantos.test.ts` "o resultado do avanço contra rival colado na parede NÃO depende de quem é P1 e P2" |
| 3 | baixa | **Controle 1 cai -> o controle 2 vira P1 e o botão que ele já segurava dispara um golpe/ESP novo do P1** (borda fantasma). O P2 perde as teclas dele no mesmo quadro (o slot 1 solta). | `Gamepads.consultar` (`gamepad.ts:59-60`) filtra os `connected` e numera pela posição na lista filtrada; o `anterior[0]` guardava o estado do controle que caiu, não o do que ficou. Correção: numerar pelo índice do navegador (`pad.index`) ou, ao renumerar, copiar o `anterior` do slot antigo. | `entrada-adversarial.test.ts` "quando o controle do P1 cai, o botão que o P2 já segurava NÃO vira um golpe novo do P1" |

Quando um defeito for corrigido, o `it.fails` correspondente passa a FALHAR de propósito: trocar por `it`.

## Observações de projeto (não são defeitos; decisão do dono/Nova)

1. **"ESQUIVOU!" seguido de dano do MESMO golpe.** O golpe só é "consumido" no acerto (`hitDone`); com a janela de 14 ticks mais curta que a fase ativa de alguns golpes, o aviso sai e o golpe acerta logo depois. Medido (esquiva em cada um dos 14 ticks, recuo na parede): ocorre em 1 a 8 dos 14 casos para `sDown` (anti-aéreo `rise`, HAYATO/MIN-JI/AMINU/CAIO), `sFwd` (investidas de WEI LONG/MIN-JI/CAIO/CAMILLE/NILA), RESORTE da CENTELLA (8/14) e `hk` do WEI LONG/BAATAR (2/14). Para o jogador o texto diz que esquivou e a vida cai. Se não for intencional: marcar `hitDone = true` no golpe quando ele foi esquivado, ou só anunciar quando a fase ativa termina dentro da janela.
2. **O ABRAÇO DA ESTEPE (janela de 16 ticks) pega a recuperação do recuo.** Nunca agarra com a janela aberta, mas a janela dele passa dos 14 ticks de invulnerabilidade e a recuperação é agarrável (projeto da spec A8). O ARREMESSO DO AVARGA (S 14) é totalmente esquivado.
3. **Botão apertado durante o HITSTOP se perde** (o jogo nem lê a entrada: `game.ts:391-394`), igual ao buffer de ataque. Com a troca de barra do chefão (20 ticks) o jogador não consegue guardar uma esquiva de reação nesse intervalo. O botão guardado vale exatamente 6 ticks (apertar 5 ticks antes do 1º tick livre ainda sai; 6 antes não). O hitstop não encurta a invulnerabilidade (medido: 14 ticks de janela mesmo com 30 ticks de congelamento no meio).
4. **A CPU DIFÍCIL pune quase sempre a recuperação** (por arremesso): 75% das sementes, 85% contando contragolpes (NORMAL 57%, FÁCIL 32%, que ataca de qualquer jeito). Como o recuo afasta 120 px e a punição exige < 110 px, o alvo real é a esquiva no canto e o avanço. Medido em 4 pares x 200 sementes.
5. A CPU não derruba o `ai.reacao` de esquiva quando fica `hit`/`block`: o botão pode sair atrasado (até 6 ticks guardado). Sem consequência medida.
6. Golpes da CPU que quase nunca acertam (já sinalizados pelo harness): `camille sFwd` REVERS 4,9% de contato; `wei-long sDown` 21 acertos em 20 083 usos (o projétil é contado à parte). Pré-existentes; não mudaram com a esquiva.

## Balanço: o que reproduzi

`npm run balanco -- --rapido --verificar` (6 sementes, 960 lutas): determinismo **IDÊNTICO** (8 lutas x 2 rodadas, hash `a7a40e0f125f43a3`), 0 travadas, 0 alerta/atenção. `--rapido --esquiva --verificar`: IDÊNTICO, 0 travadas, 2 atenção (CAMILLE 59,9% com N = 192 e IC 53-67; REVERS 4,5% de contato).
`--completo` (100 sementes, 16 000 lutas; a rodada sem a flag gravada em pasta temporária, nunca em `docs/balanco/`): resultado **igual ao da Vega e à referência `docs/balanco/resultados.json`** (hash `41def0eefa85f158`, versão `bef899c30289`).

| Lutador | sem esquiva | com esquiva |
|---|---|---|
| hayato | 47,9% | 44,2% |
| wei-long | 51,5% | 46,6% |
| min-ji | 51,4% | 48,7% |
| caio | 52,4% | 51,4% |
| aminu | 44,9% | 53,7% |
| centella | 43,8% | 45,8% |
| camille | 56,4% | 53,9% |
| nila | 48,7% | 56,8% |
| baatar | 53,0% | 49,0% |
| chefão NORMAL (jogador vence) | 24,3% (194/800) | 24,9% (199/800) |
| chefão DIFÍCIL (jogador vence) | 29,4% (235/800) | 30,1% (241/800) |

Todos entre 43,8% e 56,8%, chefão dentro de 24-30% nos dois níveis, 0 lutas travadas, 0% por tempo, ~6 rounds empatados em 14 400 nos dois casos. Por desafiante o chefão varia de 15% a 49% (a média é o que a meta cobra). Uma única atenção do harness com esquiva: REVERS (4,9% de contato, pré-existente).

Tripwires novos em `balanco-adversarial.test.ts` (dados de PRODUÇÃO): nenhum golpe tira mais de 60% da menor barra (maior dano efetivo: 22, o agarrão do BAATAR chefe, contra barra de 40); todo golpe que machuca tem dano > 0; 45 combinações (36 pares + 9 espelhos) DIFÍCIL x DIFÍCIL com esquiva e os 8 desafiantes contra o chefão (com e sem esquiva) sempre chegam ao fim, sem KO em 1 golpe e sem acerto de dano zero. Não achei loop, luta que não termina, golpe de dano zero nem KO em 1 golpe.

## PROVADO (executado)

- `npx tsc --noEmit`: 0 erros (com o working tree da Lyra). `npm test`: **52 arquivos, 1083 passaram + 3 `it.fails`** (esperados). Antes de eu escrever, a base estava em 970 (45 arquivos). Snapshot antigo `fight.test.ts.snap` com o mesmo sha256 de antes (`3cb3b231…0356`), nenhum `-u`; o snapshot novo `esquiva-cpu.test.ts.snap` intacto; `git status` de `__snapshots__` limpo.
- **Fuzz de invariantes** (`esquiva-invariantes.test.ts`): 9 lutadores x 2 sementes x 1800 ticks com mãos aleatórias (8% de ESQ por tick), 3 pares CPU DIFÍCIL x DIFÍCIL x 2 sementes x 4000 ticks, 3 sementes contra o chefão real x 5000 ticks, mais treino com alvo CPU. A cada tick: `en` em [0, 100] (nunca negativa), `invuln >= 0`, x em [60, 900], esquiva sempre no chão, invulnerável **só** na janela [invIni, invFim) e a janela sempre invulnerável, esquiva nunca presa além da duração, todo evento `esquiva` bate com o estado/`dir`, todo `esquivou` tem o defensor na janela, `hit.dano`/`throw.dano` sempre > 0, `block`/`quebra-guarda` nunca com `dano`, e **vida perdida = soma dos `dano` publicados** (hit + throw + armor) em todo tick sem bloqueio. Isso pegou uma premissa errada MINHA (o arranque de 3 ticks do avanço é vulnerável, então um acerto no mesmo tick tira o lutador do estado) e nenhum defeito do motor.
- **Sem a flag**: humano apertando ESQ a cada ~16 ticks contra CPU DIFÍCIL com a flag desligada = luta e **contagem de `rnd()` idênticas** à luta sem ESQ (3 sementes, 2500 ticks, hash tick a tick); `esquiva` ausente = `false`; flag ligada com as duas CPUs FÁCIL = luta e rnd **idênticos** à flag desligada (3 sementes, 3000 ticks); flag ligada com NORMAL/DIFÍCIL muda a luta.
- **Reaproveitamento**: um `setup` novo no meio de uma esquiva (com botão guardado), com a flag ligada ou desligada, deixa os dois lutadores limpos (estado, `invuln`, `esquivaId`, `bufEsq`, `esqT`, marcador de punição da CPU, rastro); a luta seguinte num Game reusado é idêntica tick a tick a um Game novo; `startRound` entre rounds também limpa.
- **Fronteiras do botão guardado**, **`en` 20 / 19 / 19,999999 / ESQ+ESP no mesmo tick**, **esquiva no ar recusada**, **hitstop**, **intro**, **dois especiais no mesmo tick** (dois `special` P1/P2 com os campos novos, os projéteis se anulam num `clash` sem `lutador`/`golpe`), **PARADE contra os especiais dos 8** (até 120 cenas: 8 atacantes x 3 especiais x 5 atrasos; toda PARADE bem-sucedida tem `parry.golpe = 'sFire'`, `continua = 'sResp'`, `quadro`, atacante atordoado, `special` do defensor com `momento: 'sucesso'`; o FOUETTÉ vem com `golpe: 'sResp'` e `especial: true`), **agarrões** (varredura do tick da esquiva em volta do tick do agarrão, avanço e arranque), **projéteis** (30 distâncias de reação x avanço e recuo: nunca dano com a janela aberta, no máximo um `esquivou` por projétil, o avanço só toma dano no arranque ou depois do tick 19, o recuo só depois de 14), **chefão** (troca de barra no mesmo tick de um contragolpe na recuperação: ordem `fase-chefe` antes de `hit`, `dano` = o que restava, hitstop 20 / shake 14, 60 de invuln; armadura publica `armor` com `dano`; a Dança só abre depois da esquiva do chefe; CPU do chefe não esquiva durante a cena), **eventos** (`throw` comum com `golpe: 'throw'` e sem `especial`, agarrão de especial com `especial: true`; `clash` do escudo da GARKUWA com `lutador`/`golpe`/`quadro`), **quadros `crouch`/`land` existem no atlas de produção dos 9**, **distância do recuo/avanço = 120/150 x spd (±2%) nos 9**.
- **Entrada**: L1/L2 (botões 4/6) = esquiva do P1 (`n`) / P2 (`o`), borda só no 1º tick, L1+L2 juntos com um aviso só, ESQ+ESP no mesmo quadro, desconexão com R1+R2+L1+L2 apertados solta tudo, `connected:false` na lista, reconexão com botão apertado gera UMA borda nova, analógico com NaN; toque: `#esq` (curto, segurado, `touchcancel`, 2º dedo, junto do joystick e do ESP), joystick (`touchcancel` solta todas as setas e ignora o `touchmove` seguinte; 2º dedo ignorado e o `touchend` dele não solta o 1º), desligar a camada.
- **Mutação** (sandbox no scratchpad, `src/` real intocado, junctions removidas depois): 22 mutantes aplicados; **20 mortos** pelo conjunto (os meus + `esquiva.test.ts`/`esquiva-cpu.test.ts` da Vega), exceto 2 equivalentes (a flag é checada em dois lugares em série: tirar só um não muda nada). Mortos: sem invuln no início; custo 21; botão de 7 ticks; botão que nunca decai; acerto na recuperação sem contragolpe; avanço que não atravessa (só o teste da Vega pega); `esquivou` repetido; reset sem zerar o botão; CPU sorteando esquiva no FÁCIL; CPU punindo sem sorteio único e punindo na janela (pegos pelos 2 testes novos que escrevi depois que esses sobreviveram); `throw` sem dano; `hit.dano` bruto; `esquivou.projetil` falso; janela de 13 ticks; sem `deny`; 19 de energia bastando; `passing` curto; troca de barra sem reforço de hitstop.

## NÃO provado

- Nada em navegador (sem e2e, sem `preview`): L1/L2 e o botão `#esq` só em unidade/DOM falso; a casa `#esq` do toque, o marcador de 20 no HUD, o fantasma e a cinemática são da Lyra e não foram vistos por mim.
- A CPU DIFÍCIL é um piso para o chefão; a sessão de jogo do dono fecha o balanço. O harness só mede CPU x CPU.
- Controle físico (só `getGamepads` falso) e aparelho real.
- A UI passa `esquiva: regras.esquiva` em `select/diff/campanha` (li o código), mas o caminho UI -> `ConfigPartida` não foi exercitado em teste de integração por mim.

## Testes novos (todos em `tests/unit/`, nenhum arquivo existente alterado)

`_esquiva-qa.ts` (auxiliares), `esquiva-adversarial.test.ts` (buffer, energia, hitstop, intro, cruzadas, distâncias), `esquiva-cantos.test.ts` (parede, mesmo tick, PARADE, agarrões, projéteis), `esquiva-chefe-cpu.test.ts` (chefão, armadura, CPU punindo), `esquiva-invariantes.test.ts` (fuzz, sem a flag/RNG, determinismo, reaproveitamento, eventos, arte, treino), `balanco-adversarial.test.ts` (dados de produção e lutas), `entrada-adversarial.test.ts` (gamepad, teclas, toque). 92 casos novos em 6 arquivos de teste (89 verdes + 3 `it.fails`).

## Bloco de handoff

```
VEREDITO: APROVADO (com 3 correções de baixa gravidade)
RESULTADO: 92 testes novos em 6 arquivos de tests/unit + 1 auxiliar (89 verdes + 3 it.fails = bugs reais). typecheck 0 erros; npm test 52 arquivos, 1083 passed + 3 expected fail; snapshot antigo sha256 3cb3b231...0356 intacto. Fuzz de invariantes (9 lutadores, CPU x CPU, chefao, treino), sem-flag/RNG identicos, estado reaproveitado, determinismo, 22 mutantes (20 mortos + 2 equivalentes). Balanco: --rapido e --esquiva deterministicos; --completo reproduz exatamente a Vega e docs/balanco (hash 41def0eefa85f158): 9 lutadores em 43,8-56,8%, chefao 24,3/29,4% (sem esquiva) e 24,9/30,1% (com), 0 travadas, sem KO em 1 golpe nem dano zero.
PARA O PRÓXIMO:
  Vega: (#1) zerar tambem o bufEsq ao abrir a Danca (game.ts:470-471; bufEsq e private em fighter.ts:127) - trocar o it.fails de esquiva-chefe-cpu.test.ts por it; (#2) desempate do separate() com dx === 0 (game.ts:539) para o avanço contra rival encurralado nao depender de P1/P2 - idem esquiva-cantos.test.ts; decidir se "ESQUIVOU!" deve consumir o golpe (obs. 1).
  Lyra: (#3) gamepad.ts:59-60 numerar os controles pelo indice do navegador ou copiar o estado anterior ao renumerar - idem entrada-adversarial.test.ts.
  Atlas: decisao do dono sobre a obs. 1 (aviso ESQUIVOU! seguido de dano do mesmo golpe) e a obs. 3 (botao perdido no hitstop de 20 ticks da troca de barra).
PENDÊNCIAS: e2e e navegador (L1/L2, #esq, HUD, cinematica); integracao UI -> ConfigPartida; sessao de jogo do dono para chefao e esquiva; controle fisico.
APRENDIZADO: areas frageis da esquiva = (a) estado escondido que atravessa fronteira de fase (bufEsq como o buf do E3), (b) desempate por indice P1/P2 em colisao com dx === 0 na parede, (c) numeracao de controles pela posicao da lista filtrada, (d) o arranque de 3 ticks do avanço e vulneravel (invariantes de "estado = esquiva apos o evento" precisam admitir acerto no mesmo tick).
```
