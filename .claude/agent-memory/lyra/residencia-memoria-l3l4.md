---
name: residencia-memoria-l3l4
description: L3+L4 da residência de memória (tabela arteDaCena, Navegador aplica no set/go, segurar no preto, gancho do fim da luta, FundoPadrao): decisões, armadilhas e como provar
metadata:
  type: project
---

Spec: docs/spec-residencia-de-memoria.md (§8 decidido pelo dono em 2026-10-23: jp sai da luta, espera 45 ticks, título ~150-160 aceito, exceção 160 BAATAR x ZENON até a T10, `?residencia=fixa` em produção, L7 só se a T13 pedir). Continua de [[residencia-memoria-l1l2]].

- Tudo da L3/L4 só vale com `politica === 'por-peso'` (`?residencia=peso`); o padrão do jogo segue `'fixa'` até a L6. Em `'fixa'` o Navegador só chama `entrarNaLuta` (= `usar`) na VS/luta: tempo das trocas idêntico ao de antes (provado em e2e: nenhum tick preso).
- `Navegador.set` aplica a tabela (`src/ui/residencia.ts`) ANTES do `enter`: exclusiva -> `entrarNaLuta`; senão `usar(essencial)`; sempre `preferir(desejavel ?? {})` (vazio cancela a fila da cena anterior). `go` (por-peso): saindo da luta `soltarFilme`; destino não exclusivo -> `garantir(essencial)` em paralelo com o fade. `EsperaDeArte` não marca mais "em uso".
- Segurar no preto: decide-se no tick em que `fade + 0.12 >= 1` (mesma conta do `+=`), prende com `fade = 1`, sem `t++`/pétalas/`scene.update`; teto `TETO_DO_PRETO = 45`; contador zera em `go`/`set`. `esperandoArte` é getter sem estado (troca pendente + essencial não pronto).
- Dublê de gerenciador das cenas agora é `arteFalsa()` em tests/unit/_ui.ts (política 'fixa', todos os métodos do Navegador). Teste novo com cena que passa por `ui.set` precisa dele, senão `entrarNaLuta is not a function`.
- `rec.cenarioPadrao` é GETTER (`FundoPadrao` em src/ui/fundo-padrao.ts, no `Mundo.fundo`): lê do gerenciador a cada quadro; reserva 1x1; `vezesSemFundo` conta. ARMADILHA: a própria CENA DA LUTA lê `cenarioPadrao` como reserva do cenário que ainda não chegou (mundo.ts `?? rec.cenarioPadrao`), então nos quadros de carregamento da luta o contador sobe (2 quadros medidos). Em teste de S4 meça a DELTA a partir do rastro instalado com a luta de pé, nunca o valor absoluto da página.
- Gancho do fim da luta em fight.ts (`aoFimDaLuta`, flag `fimDaLutaAvisado` zerada no `enter`): matchend + vencedor + `!filme.ativo` -> `soltarFilme` + `preferir({cenarios:['jp']})`. Chamado antes do bloco da entrada, depois do return de pausa/espera.
- Provas e2e (tempo REAL, não `manual`: em manual os ticks correm mais rápido que a rede e a espera estoura o teto sem defeito nenhum): rastro por tick instalado em `ui.update` (cena, fade, fadeTo, `esperandoArte`, `vezesSemFundo`, essencial pronto, bytes). Medido: luta->resultado->menu 0 ticks presos, pico atlas+cenários 125,4 MiB (teto 136); treino->TROCAR->seleção 0 a 4 ticks presos. C5 WeakRef (CAIO, cn, jp coletados com 'peso'; vivos com 'fixa' = controle negativo).
- Navegação nos e2e: `ui.key('Escape')` no resultado = menu; menu de pausa do treino: 5x ArrowDown + Enter = TROCAR PERSONAGENS; seleção: `scene.cur[0|1] = scene.grade.indexOf(id)` e Enter (VERSUS: P2 confirma com `j`); KO: `g.p2.hp = 0; g.resolverVidaZerada(g.p2, g.p1)` com `rounds: 1` no localStorage e `Enter` com `game.t > 45` no matchend.
- Mutação em loop de teste sem teto trava o vitest (o `while` espera uma condição que nunca vem): todo `while` de teste de navegador leva limite.
- Ambiente: servidor fresco = script vite `createServer` em porta própria (importar vite por file:// do node_modules) + config `playwright.lyra-l3.config.ts` (`webServer: undefined`, `workers: 1`), apagar no fim. NUNCA remover pasta com junction de node_modules.

## D-V6: o trailer toca o filme (2026-10-23)
- Com `motorV2.filmes` no padrão o motor emite `filme` no trailer e ninguém congelava: corte seco. Feito: `src/trailer/filme.ts` (puro: modo CURTA = 30 ticks, `ticksDoFilmeNoTrailer`), `RitmoDoPlano` congela o motor pelos ticks do filme (3º parâmetro; mesma máquina no diretor e na escalação offline), `QuadroDoTrailer.filme` (com `rivalAntes` capturado antes do update), cena desenha `FilmeDoEspecial` por cima do mundo, adia KO/round/dust como a luta, zoom de apresentação do trailer = 1 enquanto toca. `diagnostico().filmeAtivo` para o e2e.
- A escalação RECUSA tomada cujo filme o fim do plano cortaria (achado: P3 tinha um filme de 2 ticks antes do corte). Depois de mudar o ritmo, `npm run trailer:escalar` (todos os planos; ~70 s) muda tomadas.ts; impressões dos 8 planos mudam e os testes "impressão gravada" voltam a passar.
- O trailer NÃO carrega a folha FILME (orçamento do trailer = T12): o filme toca com a pose Alt do mundo nos painéis. Se o dono quiser os closes no trailer, é decisão de memória.
- Padrão do jogo agora liga o motor v2 (Vega): `cfgMotorV2(REGRAS_PADRAO)` aparece em toda cfg de partida vinda da UI; testes com cfg literal precisam do spread; "sem a regra" = `motorV2: {}`. Em e2e, a seleção já liga a FILME (não assumir `filmes: []`).
