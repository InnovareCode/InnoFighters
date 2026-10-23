---
name: qa-reprovado-filme-flag-balao-deslize
description: 2026-10-23 correcao pos-QA do HEAD 013d9bd - folha FILME so com a flag, deslize do balao para sair da cabeca de quem escuta (e por que nao entra na nota do plano), servidor 5173 velho
metadata:
  type: project
---

- **Folha FILME so com a flag:** `CenaFight.carregarFolhasDoFilme` sai cedo se `a.cfg.motorV2?.filmes !== true && this.filmeDev === null` (a MESMA flag que liga `game.filmesLigados`; `filmeDev` agora e calculado ANTES da chamada, no `enter`). Sem flag nao ha rede nem memoria. `exit()` segue chamando `soltarFilme?.()` (idempotente). e2e que abre luta sem flag: `abrirLuta(page, {..., motorV2: undefined})` (JSON.stringify descarta o undefined).
- **Balao que roca a cabeca de quem escuta (CAIO x AMINU, 83 px2):** causa = balao lateral `esquerda/abaixo` de 299 px parava a 4+12 px da cabeca do AMINU e sobrava 0,96 px dentro da regiao da cabeca do CAIO. Conserto de POSICAO em `colocarBalao` (`afastarDaCabecaDeQuemEscuta`): desliza na horizontal o MINIMO que desencosta (continuo, o zoom nao faz pular); em cima respeita os cantos cortados da base do rabicho; ao lado encurta o rabicho ate `RABICHO_MINIMO` 6 px e a PONTA fica onde estava (4 px da cabeca de quem fala).
- **ARMADILHA da nota do plano:** o 1o desenho deixou o deslize entrar na nota de `escolherPlano` e a varredura PIOROU (3 combinacoes novas com 13 a 40 px2): um plano lateral que, depois do deslize, ainda cobria um pedaco passou a ganhar (400 de penalidade lateral + cobertura x3 < 250 da variante estreita) de um plano com cobertura zero. Regra: nota SEM deslize (`colocarBalao(..., false)`), deslize so no vencedor. Comparei A/B de TODAS as combinacoes (script no navegador que lista toda area > 0, antes com `git show HEAD:` x depois): 4 casos -> 2, nenhum novo.
- **Servidor 5173 (lyra/servidor.mjs, hmr/watch off):** serve modulo velho; depois de TODA edicao de src matar o dono da porta (`Get-NetTCPConnection -LocalPort 5173` -> `Stop-Process`) e conferir com `curl /src/...| grep <simbolo novo>` antes de rodar e2e. Cuidado: outros agentes tem vite/vitest rodando na maquina (portas 5199, outros projetos): matar so o PID da 5173.
- `tipografia.spec`: origem derivada do `baseURL` (`new URL(baseURL).origin`), nao a porta 5173 fixa.
- Limiar do `provocacao-p4` (3000 -> 2000): a luta CAIO x WEI LONG, semente 11, CPU 2 agora tem 2686 fotos; a igualdade tick a tick (`toEqual` das fotos de 1 ate o ultimo tick) e `rngFinal` seguem estritos, entao o limiar e so o piso de "a luta foi longe o bastante".
