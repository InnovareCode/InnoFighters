# Handoff da Lyra: provocação P2 (balão, 3 gatilhos, opção PROVOCAÇÕES)

Data: 2026-10-21. Spec: `docs/spec-provocacao-prerround-e-vitoria.md` (a seção "Decisões do dono" prevalece). Nada commitado.

## O que foi entregue

- `src/render/balao.ts` (novo): quebra por medida, `variantesDoBalao` (linha de 372/300/240 px), `escolherPlano` + `colocarBalao` (puras), `desenharBalao`.
- `src/render/provocacao.ts` (novo): `provocacaoLigada`, `modoDaProvocacao`, `montarRoteiro`, `linhaDaProvocacao` (pura do tick), `poseDoPapel`/`resolverPose`, `cabecaNaTela`, `falasDaAbertura/falaDaRodada/falaDaVitoria` (cola com `sortearFala`), sons e a classe `Provocacao` (API da `EntradaDoChefe`).
- `src/render/mundo.ts`: opções aditivas `deslocamento`, `zoom {fator,x}`, `overlay`.
- `src/render/apresentacao-lutadores.ts`: `Apresentacao.provoca` (BAATAR `devekh2`, ZENON `entrada2`).
- `src/ui/cenas/fight.ts`: os 3 gatilhos (antes do 1º update; `round start` >= 2 com o motor em intro t 0; matchend t 56..100 com `matchDone = true` no fim), pular (ataque, ENTER, toque/clique), música a 50%, legenda do chefão suprimida quando o balão vence, `semProvocacao` (gancho), `reduzirMovimento` do contexto (acabou a duplicação do matchMedia).
- `src/ui/navegador.ts` + `src/ui/tipos.ts`: `Cena.aceitaToqueNaLuta?()` (o Navegador ignorava clique na luta em andamento).
- `src/ui/cenas/options.ts`: linha PROVOCAÇÕES (LIGADAS/DESLIGADAS, 11 linhas a 36 px; RESTAURAR faz `delete S.provocacoes`; a posição y das telas de 9/10 linhas ficou idêntica ao protótipo).
- Testes: `tests/unit/p2-provocacao-linha|cena|balao.test.ts`, `opcao-cinematica.test.ts` (contagem 11 e 5 testes novos), `tests/e2e/provocacao.spec.ts`, `tests/e2e/_luta.ts` (`SEM_PROVOCACAO`).

## ATUALIZAÇÃO (decisão do dono via Atlas): round 2+ vale SEMPRE

A opção PROVOCAÇÕES é quem liga e desliga. Round 2+ (1 linha, ~2 s, de quem perdeu o round; `decisivo` quando 1x1) existe com a cinemática COMPLETA (letra a letra, com pop), CURTA ou DESLIGADA (modo CURTA: texto inteiro com fade, `duracaoCurta(n) + 6`, 78 a 126 ticks). Movimento reduzido: sem andada/zoom/pop, durações iguais. Round 1 segue: COMPLETA com cinemática completa e 1ª vez do confronto, CURTA nas demais. Código: `modoDaProvocacao` (rodada nunca devolve null) e ramo `rodada` de `montarRoteiro`. Testes: `p2-provocacao-linha` (modo e roteiro CURTA do round 2+), `p2-provocacao-cena` (round 2 congela o motor por `total` com cinemática CURTA e DESLIGADA; só PROVOCAÇÕES desligada o remove), e2e `rodada-curta-baatar` medido (desktop e celular: 249x72, rosto 0 px²). Mutantes M1, M4, M10 a M15, M17 a M19, M22 e M26 mortos de novo; o M16 (round 2+ também na CURTA) deixou de existir como regra.
Textos definitivos da P3 (`TEXTOS_PROVISORIOS = false`) medidos no navegador: 232 falas, rival mais largo CENTELLA, linha mais larga 288,8 px (wei-long.revanche[2]), balão mais largo 317 px; todas dentro dos limites. O desvio 2 abaixo está SUPERADO por esta decisão.

## Desvios da spec (decidi, o dono pode reverter)

1. **`ALIAS provoca0/1` NÃO foi para `data/poses.ts`**: `dados.test.ts` exige que `getPD` responda como o protótipo a todo nome do alias. A troca `provoca0 -> win` mora em `resolverPose` (render); quando o Apolo entregar o quadro ele vence sozinho.
2. (SUPERADO, ver ATUALIZAÇÃO) Cinemática DESLIGADA/CURTA viram provocação CURTA em todos os momentos, round 2+ incluso.
3. **Balão com 3 larguras de linha** (372, 300, 240 px): sem isso ZENON x BAATAR com duas falas longas não cabiam sem cobrir rosto. Plano (variante, lado, nível) escolhido UMA vez com a geometria final (zoom 1,08, andada acabada).
4. **▶ da vitória** aparece quando o texto termina de aparecer (não só em 16 + D).
5. Nome na etiqueta em `FH(19)` (18 dava 12,99 px CSS no celular 844x390).

## Medido no navegador (A/B de pixels: quadro com e sem balão; rosto = caixa da cabeça)

12 cenários x 2 perfis (`provocacao.spec.ts`): abertura larga P1/P2, ZENON x BAATAR (um e outro), CURTA (dois balões, ZENON x BAATAR empilhados), round 2 (hayato, zenon), vitória COMPLETA (zenon, hayato, baatar) e CURTA.
- Dentro de [12, 948]; topo >= 86 com HUD e >= 62 sob as faixas; altura <= 132 + rabicho.
- Rosto coberto: 0 px² em todos, exceto CURTA ZENON x BAATAR (14 px de profundidade no cabelo do BAATAR) e vitória-baatar (1 px); limite dos altos = 16 px.
- Celular 844x390: corpo 14,4 px CSS, nome 13,7. Desktop 1280x720: 26,7 / 25,3.
- 232 falas provisórias medidas na fonte carregada com rival CENTELLA: linha mais larga 288,8 px, balão mais largo 317 px. O pior caso (61 caracteres) é testado à parte. Quando a P3 transcrever os textos do Apolo, o teste de limites do e2e é o portão.

## Provas

- tsc limpo; build ok; `npm run test:e2e:build` 5/5.
- vitest: meus arquivos passam; suíte inteira (18:40) 1872 passed, só 3 falhas em `sons-vozes.test.ts` (WIP do agente de sons, fora do meu escopo).
- e2e completo: 177 passed, 140 skipped, 1 falha (`novos-lutadores.spec.ts:337`, treino, 120 s de timeout por custo de desenho 14 ms/quadro x 15750; passa em 1,6 min sozinho: flake de máquina carregada, não mexi no timeout).
- Foto do motor: luta CPU completa (round 1, round 2, matchend) com e sem provocação, COMPLETA/CURTA/com sorteio, `foto` idêntica tick a tick; o sorteio de falas não consome o RNG da luta. `git diff src/fight` é dos outros agentes (nenhum `provoca` em `src/fight`).
- Mutação: 26 mutantes (chama `game.update` na provocação, vitória em t 40, sem `matchDone`, perdedor errado, VERSUS excluído, pulo no tick 0, saída 12, reduzido que anda/zoom, legenda do ZENON, plano que pula, etc.) todos mortos pelos units.
- Auditoria "teste que conta ticks": rodei o e2e inteiro com a provocação esticada a 5000 ticks e sem pulo para achar quem dependia da luta começar; 4 specs achados e corrigidos com `SEM_PROVOCACAO` (jogo, arte-sob-demanda, expansao ARCADE de produção, novos-lutadores) + os 7 que já abriam luta por gancho. Unit: `provocacoes: 'desligadas'` em `z3-entrada-chefe` e `cena-luta-cinematica`. Nenhum `-u`, nenhum timeout aumentado.

## PARA O PRÓXIMO (Íris)

Testar com os textos finais: round 1 COMPLETA (HUD some, andada, 1 balão por vez), round 2 (1 linha, HUD fica), vitória (push-in 1,08, ▶, ENTER/ataque/toque após o tick 24), CURTA, movimento reduzido (sem andada/zoom/pop), VERSUS de 2 jogadores, ZENON jogável e chefão vencendo (balão, sem legenda), opção PROVOCAÇÕES. Não ouvi os sons (blip a cada 3 letras, balão, arpejo): níveis de volume sem validação auditiva.

## Pendências

- P3 (Vega): transcrever textos; rodar `provocacao.spec.ts` "todas as falas".
- Acessibilidade: o balão é canvas (como todo texto do jogo): sem `aria-live`. Pular por teclado/toque existe; movimento reduzido respeitado.
- Capturas em `arte-fonte/capturas/provocacao-*.png` (desktop e celular, 12 cenários + opções + ZENON vence chefão). Rodei o e2e completo com `SALVAR_CAPTURAS` uma vez: reescreveu capturas dos outros specs com os mesmos nomes (pasta fora do git, 876 MB).
- Alexandria (P5): arquitetura (3º controlador fora do motor), README (pular com ataque/ENTER/toque).

## CORREÇÃO (reprovação da Íris): o ▶ da vitória cobria a última letra

Causa: o ▶ morava na margem direita da área do texto (`c.x + c.w - margemX - 8`), e `medirBalao` só media texto e nome; em 47 de 108 falas de vitória a última linha era a mais larga e o ▶ caía sobre o "!".
Correção: o balão de VITÓRIA reserva uma faixa de 14 px (`RESERVA_DA_SETA`) embaixo das linhas (`CaixaDoBalao.reserva`, passada por `variantesDoBalao`/`medirBalao`; `Provocacao.variantesDe` só a pede para `tipo === 'vitoria'`) e o ▶ é desenhado no centro dessa faixa, à direita. A largura não muda (<= 400); a altura cresce 14 px só na vitória.
Medidas (desktop 1280x720 e celular 844x390, A/B de pixels): vitória-zenon 383x100, vitória-hayato 370x110, vitória-baatar 383x100, vitória CURTA 370x105; dentro de [12, 948]; topo >= 85 com HUD e >= 61 sob as faixas; rosto coberto 0 px² em todas (o 1 px do BAATAR sumiu).
Varredura `provocacao-p4-varredura.spec.ts` (o `test.fail` virou `test`): 0 de 108 falas de vitória colidem, em TODAS as larguras de linha (372/300/240): topo do ▶ abaixo da última linha, balão <= 400 px de largura e <= 146 px de altura. A varredura de abertura segue: 5260 balões, 0 cabeças cobertas, 0 fora dos limites (os 5 cantos de 10 a 44 px² em CURTA continuam informativos).
Testes novos: `p2-balao` (reserva soma 14 px sem mudar a largura; os 3 pontos do triângulo ficam abaixo do texto e dentro do balão) e `p2-provocacao-cena` (só a vitória reserva; abertura 0). Arquivos tocados: `src/render/balao.ts`, `src/render/provocacao.ts` e testes. Rodados: p2-balao, p2-provocacao-*, provocacao.spec (14 passed) e provocacao-p4-varredura (2 passed), um e2e por vez. tsc limpo.
