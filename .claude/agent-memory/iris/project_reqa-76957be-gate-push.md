---
name: reqa-76957be-gate-push
description: Re-QA do HEAD 76957be (gate do push) - APROVADO; e2e 317/0, folha FILME so com flag (provado A/B), balao CAIOxAMINU 83 para 0 px2, memoria por luta ainda estoura por vitrine+cenarios; incidente de node_modules
metadata:
  type: project
---

**Resultado (servidor fresco, config temporario na 5193, 4 workers):** 317 ok / 0 falhas / 237 puladas (por projeto) em 12,7 min; inclui memoria-filme, filme-jogo, provocacao*, baloes-premium, silhueta-no-jogo, tipografia, trailer, fidelidade-* (os 4 fidelidade-prototipo/ui/desenharPose verdes). tsc limpo; unit p2-balao + filme-folha-cena 31/31.

**Folha FILME sem a flag (A/B, `scratchpad/mem-luta.mjs`, celular):** sem `motorV2.filmes`: 0 pedidos de filme.webp e `filmesResidentes()` = [] nas 7 lutas medidas; com a flag: 2 pedidos (1 no espelho) e 2 residentes. Cai ~18,4 MiB por luta de pares distintos (9,4 no espelho).

**Memoria analitica (w*h*4 das imagens vivas via arte.atlas/cenarios, sem flag):** HAYATOxMIN-JI 135,3 | NILAxCENTELLA 206,7 | BAATARxBAATAR 195,2 | BAATARxZENON 255,2 | ZENONxZENON 203,2 | CAIOxAMINU 173,2 | AMINUxCAIO 165,3 MiB (so arte; nao inclui canvas principal/silhuetas ~27 MiB). Residente alem dos 2 da luta+1 cenario: 79 a 135 MiB = vitrine (hayato/wei-long/min-ji/caio) + 4-5 cenarios, que o `liberar` nao solta na luta (docs/orcamentos 2.3/2.4, "so os 2 da luta", nao implementado). So BAATARxZENON nao cabe nem no ideal (147,8 com base, no limite de 150). Vira missao propria (poda da vitrine por peso).

**Balao CAIOxAMINU:** varredura 5260 baloes, cabecas cobertas 0, 8 toques <= 80 px2; area do pior CAIOxAMINU curta 83 para 0 (medido head x base 013d9bd). O deslize move 0,9 px (mudanca em 1 par de 96 cenarios CAIO/AMINU x abertura/vitoria x completa/curta; as outras 95 series de x identicas ao base). Push-in da vitoria: salto maximo 0,11 px/quadro. Pre-existente (igual no base): degrau de ~12 px no x do balao quando a pose de quem fala muda ao fechar a abertura (balao ja desaparecendo). "Baloes se tocando" CURTA AMINUxCAIO 62 px2 (informativo, nao assertado; era 49).

**Armadilha N2 (o que EU quebrei):** `git worktree remove --force` com a junction de `node_modules` ainda ativa APAGOU o node_modules real do projeto (o `cmd /c rmdir` falhou por aspas/caminho com espaco). Recuperei com `npm ci` (lock inalterado), mas antes precisei matar 3 servidores vite velhos (5199 de 22/10, tarja/servidor.mjs, o 5173 da Lyra) que seguravam `@rolldown/binding...node` (EPERM) e reiniciei o 5173. SEMPRE: remover a junction com PowerShell `[System.IO.Directory]::Delete(<junction>, $false)` num .ps1 (Write) e conferir `Test-Path` ANTES de `git worktree remove`.
Outra armadilha: o webServer do playwright usa `strictPort`? nao: `npm run dev` sem --port ignora a baseURL; no config temporario por --port E --strictPort no `command`, e NAO subir o servidor na mao na mesma porta (reuseExistingServer:false falha).

**How to apply:** [[qa-completo-2026-10-23-bf429d2]], [[tecnicas-de-qa-do-projeto]].
