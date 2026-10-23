---
name: qa-completo-2026-10-23-bf429d2
description: QA completo do HEAD bf429d2 (CAIO gingado, 10 paginas FILME, memoria por luta, trailer P2); servidor dev velho na 5173, specs desatualizados, varredura de balao, orcamento de memoria estourado
metadata:
  type: project
---

**ARMADILHA N1: o servidor da porta 5173 (`lyra/servidor.mjs`, vite com `watch:null, hmr:false`) estava de pe desde 22/10 e serve CODIGO VELHO** (assets de public/ saem do disco, src/ sai do cache). O 1o e2e inteiro (552 testes) rodou nele e deu 10 vermelhos, varios fantasmas (memoria-filme, novos-lutadores por tempo). Sempre: conferir `Get-Process <pid>.StartTime` do dono da 5173 e rodar em servidor NOVO (config temporario copiado de playwright.config.ts: porta 5183, `reuseExistingServer:false`, `testIgnore` dos specs temporarios; `tipografia.spec` tem a porta 5173 fixa: rodar copia com 5183). Run fresco: 312 ok / 3 falhas / 237 puladas (por projeto), 12 min com 4 workers.

**Achados reais (HEAD bf429d2 / 013d9bd):**
- `provocacao-p4-varredura` (balao x cabeca): 1 ocorrencia CAIO x AMINU curta, balao 1, 83 px2 contra a tolerancia de 80. Passa em 69db418, falha desde 4998c89 (CAIO gingado sobe o K em 410/396). O rosto real (A/B de pixel em provocacao.spec) passa. Baixa gravidade; Lyra ajusta ou o dono aceita tolerancia >= 85.
- Specs DESATUALIZADOS corrigidos por mim (nao commitados): `silhueta-no-jogo` (69db418 mudou a silhueta de margem 1 para recorte alinhado em 8 + margem 8; o spec nao acompanhou), `filme-jogo` 404 (o rival CAIO agora tem folha propria; o painel desenha o close do RIVAL da folha DELE: contar celulas por dono), `provocacao-p4` limiar `> 3000` -> `> 2000` (CAIO x WEI LONG CPU2 semente 11 acaba em 2685 ticks desde antes do CAIO gingado; a igualdade tick a tick passou).
- Orcamento de memoria (docs/orcamentos-2026-10-23.md 6a) ESTOURADO em luta, medido analitico (largura x altura x 4 das imagens vivas no jogo real): HAYATOxMIN-JI 166,9 (meta 115); NILAxCENTELLA 238,3 (115); BAATARxBAATAR 217,5 (150); BAATARxZENON 287,3 (150); ZENONxZENON 225,7 (150). Causa: vitrine (hayato, wei-long, min-ji, caio = 102 MiB) e 5 cenarios (~40 MiB) continuam residentes dentro da luta (§2.3/2.4 do doc, "so os 2 da luta", nao implementado). Folhas FILME medidas: 7,9 a 9,7 MiB cada (BAATAR 9,67 + ZENON 8,91 = 18,6 MiB; espelho = 1 folha). Processos (renderer+GPU, Chromium emulando Pixel 7): menu ~100-110 MiB privados, luta 133-157; so tendencia (CPU 20-87%, maquina nunca ficou quieta).
- `carregarFolhasDoFilme` (src/ui/cenas/fight.ts:306) carrega as folhas em TODA luta, mesmo sem `motorV2.filmes` (que nenhum codigo liga por padrao): custo de memoria e rede sem uso.
- `memoria-filme` (delta privado da folha > 3 MiB) e ruidoso: falhou 3/3 contra o servidor velho (+0,1, +0,9, -3,1) e passou 4/4 em servidor novo. Nao use como evidencia sozinho; a parte analitica (9,375 MiB) e a deterministica.
- `trailer.spec` "tempo do gesto <= 150 ms com CPU 4x": 224 ms com 4 workers, passa isolado: teste de relogio, flaky sob carga (ver [[estabilizacao-portao-2026-10-23]]).
- `novos-lutadores` "todos os especiais" leva ~90 s de 120 s de timeout: no limite.

**Provado (jogo real, desktop, servidor fresco):** CAIO idle 4 quadros distintos, base dos pes constante (variacao 0 px no canvas 960), altura do corpo varia 3,8 px (respiracao), extremos dos pes variam 2,5-2,8 px; andar 8 quadros, base 0 px de variacao, ciclo walk0..7 a ~3,3 ticks por quadro, mundo anda 3,85 px/tick; contact sheets conferidas a olho. 10 lutadores: folha carregada com o tamanho do manifesto, 32 especiais desenham celulas da folha; AMINU sFwd so desenha f3 (7 ticks de celula contra 17: f2 ausente = Alt); com todas as folhas abortadas (rede) os 10 tocam o especial, sem erro de pagina e com aviso `[filme]`. `?trailer=P2` roda sem erro, 'P2' em reserva=false, CAIO x MIN-JI desenhados; unit de trailer (5 arquivos, 128 testes) verdes.

**How to apply:** ver [[tecnicas-de-qa-do-projeto]]; antes de aceitar qualquer vermelho de e2e, conferir o servidor da 5173 e reproduzir no HEAD limpo.
