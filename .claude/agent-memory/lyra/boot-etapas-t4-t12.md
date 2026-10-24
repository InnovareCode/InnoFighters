---
name: boot-etapas-t4-t12
description: T4 (boot em etapas, data-pronto so apos a etapa 0, lista unica boot+SW) e T12 (trailer sem arte fixa, pico 145,3 MiB): contrato, armadilhas de teste e de ferramenta (2026-10-24)
metadata:
  type: project
---

Spec: docs/orcamentos-2026-10-23.md §2.2/§2.3 (T4, T12). OR-2 (a) aprovada: o gesto antes da vitrine entra na abertura e a arte aparece quando chega.

## T4: boot em etapas
- Lista da etapa 0 = `src/assets/etapa0.mjs` (+ `.d.mts`), Node puro DE PROPOSITO: o vite.config.ts importa `.ts` sem extensao e o Vite avisa (configLoader native). Os lutadores saem do dist (`assets/lutadores/<id>/atlas.json`), os pedacos de JS por prefixo (`PEDACOS_DA_ETAPA0`, hash no nome). O boot (carregador `urlManifesto`, `ui/logo.ts` VARIANTES) monta URL das mesmas funcoes; `vite.config.ts` passa `arquivosDaEtapa0(listarArquivos(dist))` ao `extras` do manifesto do SW (lanca se um pedaco sumir). `ferramentas/sw/cli.mjs` herda o `shell` do manifesto ja no dist (node puro nao importa a lista).
- `iniciarArte` devolve `{elenco, arte, etapa1}`: por-peso = manifestos + jp; `etapa1()` = `arte.preferir({retratos:true, lutadores, cenarios})`. `PedidoDeArte.retratos` so a fila de fundo entende (sai JA, em paralelo ao 1o atlas, nunca cancelado, fora de `estaPronto`). `fixa` = boot de antes (rollback; fidelidade-* fixam fixa+motorv2=0). `data-vitrine="true"` (main.ts) = etapa 1 completa (so e posto se `fundoPronto()` achar a vitrine pronta; quem navega antes nao deve esperar por ele).
- Medido (build, Resource Timing no instante do atributo): 0,913 MiB / 28 pedidos ate `data-pronto` (era 6,46); `?residencia=fixa` = 6,44. Gate: tests/e2e-build/boot-peso.spec.ts (<=1,5 MiB, nada de atlas/retrato/FILME/som antes, tudo ⊆ shell do SW).
- e2e do dev server: `data-pronto` NAO garante vitrine. Helper `tests/e2e/_arte.ts` `esperarVitrine(page)` (jogo.spec determinismo, residencia-luta `abrir`, arte-sob-demanda). Em `?manual=1` os ticks correm mais que a rede: luta sem arte pronta nao anda (tick 0).
- Offline: 2a visita offline roda boot -> trailer -> titulo -> menu -> luta; so FILME e .mp3 falham (OR-7: so o USADO fica no cache), sao opcionais (pose Alt, som sintetizado).

## T12: trailer sem arte fixa
- `arteDaCena('trailer')` = EXCLUSIVO, essencial = `ARTE_DE_ABERTURA_DO_TRAILER` (hayato, wei-long, jp, cn = P0+P1; mantem o que ja esta decodificado e aquecido). `CargaEscalonada` (src/ui/trailer/arte.ts) segue `planoDeCarga` (src/trailer/carga.ts): 1 pedido por plano com arte, comeca 192 ticks antes (plano que contem o tick), solta no fim do plano. A logo (P10) em 2 pedidos: 4 cenarios cedo, 4 atlas so no proprio P10 (senao P9+P10 = 188 MiB).
- ORDEM em `entrouNoPlano`: INICIAR novos -> marcar terminados -> `usar(seguro)` -> `soltar(terminados)`. Soltar antes de `usar` nao solta (gerenciador protege "em uso") e deixou jp preso (133,6 em vez de 125,7). Refcount: atlas so sai quando nenhum pedido ativo o segura (HAYATO P0->P1 nao recarrega).
- `GerenciadorDeArte.soltar(p)`: forca a soltura (vitrine tambem), respeita emUso; em `fixa` cai em `liberar*`. `liberarTudo()` na saida poupa vitrine e cenarios do titulo (o destino pede em seguida; senao thrash).
- Pico medido: 145,3 MiB no P6+P7 (nila, wei-long, baatar, hayato + in, mn); P10 133,6. `npm run trailer:medir -- --cena trailer --modo memoria` (sem desenhar, 1 tick por vez, espera a arte no limite do plano). Unit: tests/unit/trailer-memoria.test.ts (pesos reais de public/). FILME no trailer NAO cabe (145,3 + 8,9 > 150): fica a pose Alt.
- `pedidosNoPlano` agora devolve `agora` (precisa estar pronta no comeco), `tarde` (abertura e vitrine da logo: chegam com o plano na tela), `proximo`, `soltar`. So plano com motor vira reserva; a previa `?trailer=Px` so espera arte de plano de luta. `diagnostico().artePronta` = arte do plano EM CURSO completa (testes de pixel esperam antes de capturar: heroes da logo chegam tarde e o pixel varia entre visitas).
- Versao estatica (movimento reduzido / economia de dados): pede vitrine + 4 cenarios (133,6) ela mesma (`prepararAEstatica`), porque a cena entra exclusiva.

## Rede lenta no trailer (achado da Iris: iPhone/WebKit nao tem navigator.connection)
- Decisor puro `decidirTrailerEstatico` (ui/trailer/ambiente.ts): movimento > economia/2g-3g da API > vazao medida < `LIMIAR_DE_VAZAO_BYTES_POR_S` (420 000). Vazao null (cache/SW) = completo, nunca lento. `platform/vazao.ts`: bytes das transferencias >=100 KB da etapa 0 / UNIAO dos intervalos responseStart..End (span total e bytes/tempo-ate-pronto enganam: latencia e vaos). Medido no build com CDP, 3 rodadas iguais: sem limite ~28 MiB/s, 9 Mbps 551 kB/s, 4 Mbps 315 kB/s, Fast 3G 120 kB/s. DEV: `?vazao=<B/s|nenhuma>`.
- O Chromium TEM navigator.connection e reporta 4g mesmo estrangulado por CDP: o e2e-build prova o caminho sem API de fato. `document.body.dataset.trailer` = 'estatico'|'completo' (observavel no build, sem hooks).
- Estatico por rede (vazao/economia/desistencia) NAO pede atlas (4,7 MiB competiriam com os retratos): so cenarios; quadro sem atlas desenha rosto. `render/trailer/rosto.ts` `desenharRostoOuPlaca`: retrato ou placa tipografica (iniciais); usado no cartao de reserva e no estatico. Teste de pixel de placa: medir DENTRO do quadrado sem borda/faixa (a borda e a faixa sao claras e passam com a mutacao).
- Completo: 1 cartao de reserva tolerado, o 2o (`LIMITE_DE_RESERVAS`) faz `degradarParaOEstatico` (para a abertura com fade, pula para o quadro do estatico do compasso atual, musica do estatico). `aoComecarUmTick` agora devolve boolean (o laco de updateCompleto sai).
- e2e que parte de vitrine na memoria sem `esperarVitrine` fica flaky (residencia-aba falhou 1 em 3 rodadas).

## Ferramentas (armadilhas)
- Heredoc do bash (`<<'EOF'`) com scripts de edicao em JS: BARRAS INVERTIDAS SOMEM (`\\.` virou `.`, `\\/` virou `/`). Regex em teste/src: Edit ou Write, nunca heredoc. `sed 's/\\`/`/'` corrompeu um arquivo inteiro (crase no inicio de cada linha). Helper de edicao: `scratchpad/lyra/lib.mjs` `editar(arquivo, [[velho, novo]])` (respeita CRLF; exige 1 ocorrencia).
- `Stop-Process` por `CommandLine -like '*servidor.mjs*'` mata o proprio bash (a linha de comando dele contem o texto): usar `reiniciar.ps1` via `powershell -File` filtrando `Name -eq 'node.exe'`.
- Medir bytes ate o atributo: `waitForSelector` volta tarde (localhost carrega 6 MiB no meio); use MutationObserver em `addInitScript` (observar `document`, nao `documentElement`) e Resource Timing `responseEnd <= tPronto`, + `navigation.transferSize`.
- `file://` do node_modules: `sharp` precisa `createRequire(RAIZ + '/package.json')('sharp')`, nao import por caminho.
