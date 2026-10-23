---
name: v2-3c-filme-motor
description: V2-3c da revisão do motor v2 - o FILME do especial no motor (motorV2.filmes), decisões de desenho do Game, como se prova flag-off intacta, armadilhas de teste e de harness
metadata:
  type: project
---

Flag `ConfigPartida.motorV2.filmes` (tipo `MotorV2` em core/contratos.ts). Dados em `src/data/filmes.ts` (Cronos), lidos DIRETO por `Game` via `filmeDoGolpe(a.ch.id, ficha, golpe)`, não por `GolpeMontado.filme` (a spec §3.4 pedia mesclar em `montar.ts`; lookup no Game evita mexer em montar/hash de dados). Tudo em `fight/game.ts`: `filmeDaExecucao`, `consumirExecucao`, `danoDoFilme`, `limitarAoTetoDoCombo`, `estadoFinalDoFilme`, `arremessarComFilme` (agarrão de especial é caminho SEPARADO, o `arremessar` comum fica intocado). Eventos: `hit.filme`/`throw.filme: true` + `filme` (PosFilme antes/depois); `ko` do filme é DIFERIDO (`resolverVidaZerada(d, a, diferidos)`) para sair depois do `filme`.

**Decisões que a spec deixava em aberto:**
- "Execução consumida" = `Set<number>` no Game (chave `atk*2+indice`, zera no round via `clearFx`), NÃO campo no Fighter; tiros seguintes do BULKKOT não nascem (`lancarProjetil` retorna), projéteis em voo da mesma execução SOMEM (`life=0` no próximo `resolveHits`) em vez de virar fantasma. Projétil leva `{atk, ficha}` num `WeakMap` (não mudou a forma de `ProjetilLuta`). Todo contato (bloqueio, armadura, esquiva, acerto) consome; PARADE não (o golpe do atacante já acaba).
- 2º contato de especial no MESMO tick: acerto comum com dano de hoje, e a execução dele também é consumida. O defensor do 1º filme em `_lag` vira "contragolpe" (state 'move') para esse 2º acerto (+15%): correto, não bug.
- Quebra-guarda (MASHI 3) bloqueada emite o evento `quebra-guarda` (o de hoje), não `block`; teste confere 1 `quebra-guarda`, 0 `filme`.
- Atacante que bateu com o defensor na parede RECUA até a distância cheia (não só 78), preso em [60, 900]; defensor preso em [150, 810]. Projétil: só o defensor muda (pode ficar a <78 do atacante colado na parede: caso raro aceito).
- Atacante sai com `connected=false` (sem cancelamento do `_lag`; `connected` verdadeiro deixaria cancelar a recuperação em golpe de rank maior) e `armor=0`.
- Teto de combo (0,40 × `maxHp × barrasMax`, piso 0,5) vale em TODO acerto comum com a flag ligada (`applyHit`), não no `arremessar` comum.
- ESQ no hitstop entrou (`EntradaGuardada.esq`, `bufEsq = buffer + 1`, só com `esquivaLigada`). `spSeg` NÃO precisou: é estado segurado, já chega ao 1º tick acionável.
- `sonsDoEvento`: `hit`/`throw` com `filme` e o próprio `filme` ficam MUDOS (som por batida é da UI na V2-3d). `AMOSTRAS_POR_EVENTO.filme = []` (não 'sintese': o teste de "sintetizados de propósito" lista só jingle/interface/aviso).

**Como provar flag desligada intacta (harness):** o `hashRegulares f420ce928e06b304` só reproduz com `--esquiva` (a referência de produção) e com os dados do HEAD. Com CAIO/WEI LONG sujos pela outra instância não reproduz na árvore de trabalho: `git archive HEAD` num diretório do scratchpad + junction `node_modules` (PowerShell `New-Item -ItemType Junction`) + copiar por cima só game.ts, fighter.ts, contratos.ts, filmes.ts e ferramentas/balanco; rodar `node ferramentas/balanco/cli.mjs --completo --esquiva --so sim --saida <fora do repo>` (~100 s, 8 processos). Resultado V2-3c: hashRegulares f420ce928e06b304, hashChefes c8d18e0edd93ebd0, total 957b8416d75bf060 = iguais ao de antes.

**Armadilhas de teste:**
- A armadura do BAATAR (`armadura.rankMax`) deixa especial (rank 9) passar: para ver `armor` use o TIE SHAN KAO do WEI LONG (sem rankMax) como defensor. O atacante dele (P2) também bate e abre o PRÓPRIO filme: filtrar `atacante === 0`.
- LONG ZHANG não conecta a <160 px (a bola nasce adiante); contragolpe exige o rival em `state==='move'` NO tick do contato (iniciar o `hk` dele ~5 ticks antes).
- Rival que segura "trás" ANDA para trás: prender `p2.x` a cada tick. MASHI é alto: agachado não bloqueia (usar em pé).
- No treino `hit.dano` sai superestimado (calculado antes de `resolverVidaZerada` forçar hp=1); já era assim.
- Medir vantagem pós-filme em `g.tick`, não em chamadas de `update` (o hitstop de 4-6 ticks do acerto não conta).
- Sufixo dos nomes de arquivo CRLF: game/fighter/contratos/eventos/frame-data/relatorio/cli.mjs/balanco-adversarial são CRLF; simulacao.ts, amostras.ts, partida.ts e os testes novos são LF. Editar com script que normaliza e regrava o fim de linha original.

**Harness:** `--filmes` (e `--motor-v2 entrada,filmes`) liga a flag nas lutas E na frame-data (coluna "Filme"); sai em `relatorios/balanco-filmes`, nunca em docs/. `frameDataMd` só ganha a coluna se alguma linha tem `filme` true/false. Falta (V2-3e/V2-6): portões do §4.5, `--varrer-dano`, referência nova em docs/.
