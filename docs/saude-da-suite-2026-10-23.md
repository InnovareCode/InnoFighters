# Saúde da suíte e dos orçamentos — InnoFighters, HEAD `f5b5fab`

Autora: Íris (QA), 2026-10-23. Sem corrigir código e sem commitar.
**Onde rodou:** `git worktree` limpo e destacado em `f5b5fab`, **fora** do projeto, com `npm ci --prefer-offline` próprio (sem junção para o
`node_modules` real; sem `arte-fonte/`, como a CI). Windows 10, Node 24.12.0, npm 11.6.2, Playwright 1.64.1, vitest 5.0.5, tsc 7.
**Aviso de ambiente:** durante todas as medições a máquina estava **dividida com outra sessão do desenvolvedor** (vitest rodando em paralelo em outra pasta).
Isso pesa nos números de tempo (seção 4) e nos testes frágeis por tempo (seção 2). Nível de prova: **[rodei]** = executei hoje; **[li]** = li no código;
**[inferi]** = deduzi.

## 0. Veredito

**REPROVADO como portão de saúde** (a entrega no ar está verde; o que reprova é o que a suíte e os orçamentos mostram):

1. `fidelidade-prototipo` (e2e pixel a pixel) ficou **vermelho em 5 de 5 rodadas** [rodei]. Não é "flaky que às vezes passa": 2 a 6 testes falham em toda rodada e,
   com 1 worker, falham **os mesmos ticks** (91, 97, 100, 105). A etiqueta "flaky conhecido" esconde um portão que hoje não fecha.
2. **3 testes unitários dependem de tempo de relógio** e quebram sob carga: `sons-integracao` (p99 relativo) falhou em 2 de 4 rodadas completas, `sons-volume` e
   `sprites-pipeline` estouraram os 5 s [rodei]. Com a máquina mais ocupada (rodada com cobertura V8) foram 17 falhas, todas desses mesmos grupos de arquivos mais `chefe-adversarial`.
3. **Orçamentos do PLANO §6: 5 de 8 linhas falham, 1 não se prova** (seção 3) [rodei/medi].
4. **A CI não roda nenhum e2e** (nem `test:e2e`, nem `test:e2e:build`) [li ci.yml]: os 508 testes de navegador só rodam à mão.

Verde de verdade: typecheck, vitest (todas as falhas acima somem quando rodado isolado), build, e2e:build (14/14), 25 de 26 specs e2e, CI `f5b5fab` e Pages `f5b5fab`.

## 1. Os portões, rodados

| Portão | Resultado | Tempo | Prova |
|---|---|---|---|
| `npm run typecheck` | **passou**, 0 erros | 3 s | rodei |
| `npx vitest run` (sem `-u`) | 116 arquivos: 108 passaram, 8 pulados (arquivos `*-diag`); **2437 a 2438 testes passam, 27 pulados**; 1 a 2 falhas em 3 das 4 rodadas completas sem cobertura; 1 rodada limpa (ver seção 2) | 31 s sem carga | rodei 4x |
| `npm run build` (tsc + vite) | **passou** | 6,6 s (vite 1,2 s) | rodei |
| `npm run test:e2e:build` | **14 de 14** (CSP, manifesto-fallback, pwa-versao, trailer-csp) | 2,6 min | rodei |
| `npm run test:e2e`, um spec por vez, porta 5183 | 25 specs **verdes** de 26; 1 spec **vermelho** (`fidelidade-prototipo`); total 494 testes = 261 passam, 3 falham, 2 não rodam, 228 pulados por projeto (desktop x celular) | ~19 min | rodei |

Os 27 testes pulados do vitest são todos condicionais: 13 em `sprites-pipeline` (`skipIf(!existsSync(arte-fonte/...))`), 2 + 1 em `sons-amostras-*`
(pacote não gerado / geração), 11 nos 8 arquivos `*-diag` (ferramentas de diagnóstico). Na CI e neste worktree limpo a arte real não existe e eles pulam: **nada se perde por
estar sem `arte-fonte/`, mas a validação contra a arte real só acontece na máquina do dono.**

Nota (observação, não defeito): rodar o vitest no Windows deixa `tests/unit/__snapshots__/fight.test.ts.snap` e `esquiva-cpu.test.ts.snap` "sujos" no git
(`git diff` vazio, só troca de fim de linha, índice LF x `autocrlf`). Consequência: `vite build` na máquina de dev grava `sujo:true` em `version.json`
(foi o que vi no `dist/` do worktree). No Pages, `sujo:false`, porque a CI é Linux.

## 2. Testes frágeis: o que é flaky e o que é real

| Teste | O que vi | Causa (rodei / li / inferi) |
|---|---|---|
| `tests/e2e/fidelidade-prototipo.spec.ts` | **5 de 5 rodadas vermelhas**: 3 falhas (1ª), 6, 5, 2 (3 reexecuções, 4 workers) e 5 (1 worker, só diferenças de pixel). Falhas repetem nos mesmos ticks: 91 (5 px, max 4), 97 (1 a 3 px, max 3 a 4), 100 (75 px, max 9), 105 (1020 px, max 6). Tolerância do teste = **0 pixel** (`expect(q.diferentes).toBe(0)`) | **(a)** corrida de arquivo: `EPERM: rename .../test-results/prototipo-fontes/tmp-*.html` (workers escrevem o mesmo arquivo, Windows) [rodei]. **(b)** diferenças de 1 a 9 níveis de cor em poucos pixels, determinísticas por tick: parece anti-aliasing do Chromium atual contra o oráculo, não regressão visível [inferi]. Não rodei um commit antigo para provar que passava; `docs/handoff-lyra-pos-e3.md` registra "0 falhas" no passado |
| `tests/unit/sons-integracao.test.ts` "evento inteiro ... p99 <= 10 x tick da fight" | falhou em 2 de 4 rodadas completas (0,61 ms contra limite 0,54; 0,80 contra 0,54); **3 de 3 vezes verde isolado** | relógio de parede (`performance.now`) comparado com outro relógio de parede, em Node, sob carga alheia [li/rodei] |
| `tests/unit/sons-volume.test.ts`, `sprites-pipeline.test.ts` | timeout de 5 s em 2 e 1 das 4 rodadas completas; verdes com `--testTimeout=120000` | teto padrão de 5 s curto demais para síntese de áudio e pipeline de imagem com a máquina cheia [rodei] |
| `tests/unit/chefe-adversarial.test.ts` (7 testes), `sons-vozes.test.ts` (3) | falharam **só** na rodada instrumentada (V8) | lentidão sob instrumentação [inferi; não abri a mensagem de cada falha] |

Não há `it.fails`, `.only` nem `.todo` ativo em `tests/` (as ocorrências são só a convenção em comentário) [rodei grep]. Há 12 `test.skip` em e2e (por projeto).

## 3. Orçamentos do PLANO §6: meta x medido

Método: build de produção servido por `vite preview` (porta 4180), Chromium via CDP somando `encodedDataLength` por etapa; memória = soma de `largura x altura x 4`
das imagens pedidas (mesmo método do E7a) mais o working set dos processos do Chromium; peso e dimensões dos arquivos lidos de `dist/` com `sharp`.

| # | Meta (PLANO §6) | Medido | Resultado |
|---|---|---|---|
| 1 | JS gzip ≤ 150 KB | **inicial** (`index` + `contratos`): 120,9 kB no Vite, **119,9 kB na rede do Pages**. **Total de todos os pedaços**: 175,5 kB (soma gzip do `vite build`). **Carregado até a 1ª luta**: 168 KiB (inclui `identidade-sonora`, `partitura`, `amostras`, `temas` e o pedaço do `trailer` de 22,9 kB) | inicial **passou**; total e carregado **falham** (+15 % a +17 %) |
| 2 | Atlas por lutador ≤ 1,2 MB e ≤ 2048 x 2048 | Por lutador: CAMILLE 0,86; AMINU 1,06; MIN-JI 1,19 (**passam**). CENTELLA 1,23; HAYATO 1,23; WEI LONG 1,24; NILA 1,45; CAIO 1,58; ZENON 1,71; BAATAR 1,96 MB (**falham**). **CAIO 3600 x 2251 e WEI LONG 3600 x 2296** estouram também a dimensão. Por arquivo de atlas, todos ≤ 0,68 MB, exceto CAIO (1,58) e WEI LONG (1,24) | **7 de 10 falham** (2 também em dimensão) |
| 3 | Cenário ≤ 250 KB, 1920 x 1080 | 7 WebP 1920 x 1080 de 138 a 234 KB (**passam**). `br.jpg` 278 KB, `kr.jpg` 305 KB (**falham** em peso); `br`, `cn`, `kr` são **1600 x 900** (falham em resolução) | **3 de 10 falham** |
| 4 | 1ª carga até o título ≤ 1,5 MB | **7,77 MB** quando o boot marca `data-pronto` (23 imagens, 7,24 MB, mais fontes, `base.mp3` 272 KB e 10 manifestos); **10,40 MB** com a abertura/título resolvidos (29 imagens) | **falha** (5,2 x a 6,9 x) |
| 5 | Até a 1ª luta (2 lutadores + 1 cenário) ≤ 4 MB | **10,40 MB**; entre o título e a luta o jogo **não pediu nada novo** (a pré-carga do boot já trouxe 6 atlas e 2 cenários que a luta não usa) | **falha** (2,6 x) |
| 6 | Memória de imagem decodificada em luta ≤ 120 MB | estimativa w·h·4 das imagens pedidas: **152 MB no boot, 224 MB na luta** (limite superior: o navegador pode descartar). Working set do renderer no Chromium headless: **336 MB no boot, 442 MB na luta** (inclui o piso do Chromium). Fora da conta: canvas da silhueta branca (do tamanho da página, E7a) | **falha** (estimado; consistente com o "208 a 287 MB" do E7a) |
| 7 | 60 fps estáveis nos aparelhos do portão F4 | Custo de CPU de update + draw por quadro, `hayato:min-ji`: **1x** p95 **2,6 ms** (mediana 1,0), 0 quadros > 33 ms; `caio:wei-long` 1x p95 3,3 ms. **4x**: p95 31,0 / 29,8 / 95,2 / 38,1 / 52,5 ms (5 rodadas, mediana 9,7 a 10,4 ms; a referência de 2026-10-22 em `ferramentas/trailer/base-desempenho.json` é p95 14,7 e mediana 6,7). O modo "intervalo" (rAF real) **travou nos 300 s**, `caio:wei-long` a 4x também, e a 1ª tentativa completa ficou 39 min sem terminar e foi encerrada: sem número | **não se prova**: 1x sobra; 4x acima de 16,7 ms em todas as rodadas, mas com carga alheia e p95 que oscila 2 x entre rodadas (nota anterior). **Nenhum aparelho real foi medido** |

Resumo: **passam** 1 de 3 do JS (o pedaço inicial), 3 de 10 atlas, 7 de 10 cenários; **falham** peso total de JS, 7 atlas, 3 cenários, carga até o título, carga até a luta, memória. Isso confere com os números do Nova (`docs/revisao-completa-2026-10-23.md` §1.2, itens 18/R-8).

## 4. Cobertura por área do `src/`

Não há medição numérica de cobertura: `@vitest/coverage-v8` não é dependência e não instalou offline (`ast-v8-to-istanbul` sem versão no cache); uma tentativa com `NODE_V8_COVERAGE`
saiu incompleta (os workers do vitest não descarregam tudo) e foi **descartada**. O que segue vem do **grafo de imports** (quais arquivos de `src/` algum teste importa,
direto, por auxiliar ou por dependência) e de busca por nome de símbolo em `tests/` [rodei script, **inferi** o risco].

Tamanho da pirâmide: 116 arquivos / 2465 testes unitários (27 pulados) > 26 specs / 494 testes e2e (228 pulados por projeto) > 4 specs / 14 testes e2e-build. Formato certo.

| Área | Sem teste direto (só alcançado por e2e ou por vizinho) | Risco de regressão |
|---|---|---|
| `fight/` (7 arquivos, 112 KB) | nenhum arquivo solto; `projetil.ts` e `comandos.ts` só via `game`/`fighter` | **O mais bem coberto**: dezenas de arquivos de teste (fight, esquiva, chefe, balanço, fidelidade). O risco é de **acoplamento**: a revisão do motor (hitstop, buffer, rotas de combo) muda o determinismo e invalida os snapshots (`fight`, `esquiva-cpu`), o `hashRegulares` do balanço, as tomadas gravadas do trailer e os chefões |
| `meta/` (6) | `chefes.ts`, `escada.ts`, `progresso.ts`, `tipos.ts` só por `progresso.test`, `storage*`, `sessao-especial` | baixo; `progresso.ts` (10 KB) merece teste de migração de versão se o formato mudar |
| `audio/` (14, 158 KB) | `audio/index.ts` (barril); `plano-amostras.ts` e `sintese-voz.ts` com 1 import | médio: tudo roda contra `AudioContext` falso; o som real só foi medido à mão (N3, Chromium) e as 3 réguas de volume são as que estouram por tempo |
| `render/` (40, 340 KB) | `legenda.ts`, `retrato.ts`, `trailer/{contraluz,estatica,frio,letterbox,reserva}.ts` sem teste direto; `trailer/{titulos,retratos,logo-revelacao}.ts` com 1 | **alto no pixel**: o oráculo pixel a pixel (`fidelidade-prototipo`) está vermelho, então hoje **nenhum teste fecha** o desenho da luta; o resto é verificado por `render-luta.test` e `esquiva-render.test` com canvas falso |
| `ui/` (35, 228 KB) | `cenas/{intro,menu,options}.ts` (0 testes unitários; só passam por e2e de fluxo), `cenas/fim.ts` e `ui/trailer/trailer.ts` (33 KB, a maior cena) só por e2e, `espera-de-arte.ts` (sem teste por nome), `escuta.ts` (24 KB, painel `?escuta=1`, nunca carregado por unitário) | médio: menus e Opções mudam muito e dependem do e2e, que a CI não roda |
| `platform/` | **`erros.ts`** (`mostrarErrosNaTela`, a tela de erro) e **`orientacao.ts`** (`emRetrato`, `travarPaisagem`): zero testes, unitário ou e2e; `foco.ts` só e2e | médio-alto para celular: orientação e tela de erro são o que o dono verá no iPhone |
| `main.ts` (11 KB) | só e2e e e2e-build | coberto pelo fluxo; falha silenciosa de inicialização aparece como e2e lento |

**Testes não leem `arte-fonte/`:** confirmado [rodei + li]. O worktree não tinha `arte-fonte/` e a suíte unitária passou igual; as únicas leituras estão sob `skipIf(!existsSync(...))`
em `sprites-pipeline.test.ts` (linhas 286 a 424) e `sons-amostras-fixture.test.ts`. O defeito antigo de `marca-no-html.test.ts` (lia `arte-fonte/logo/...`) **não existe mais**.
Ressalva: os e2e `esquiva`, `cinematica` (e outros com `SALVAR_CAPTURAS`) **escrevem** capturas em `arte-fonte/capturas/` (só escrita, não condiciona o resultado).

## 5. CI e Pages

| O quê | Estado | Prova |
|---|---|---|
| Workflow `ci` no commit `f5b5fab` (run 34) | **success** (1 min) | API pública do GitHub, rodei `curl` |
| Workflow `pages` no commit `f5b5fab` (run 21) | **success** (2 min) | idem |
| Últimos 10 runs (`64f2647` a `f5b5fab`) | todos `success` | idem |
| `https://innovarecode.github.io/InnoFighters/version.json` | `{"commit":"f5b5fab","data":"2026-10-23T12:33:40Z","sujo":false}` | `curl` |
| Site | `/` 200; JS inicial 200 (336 kB, **119,9 kB gzip** na rede); `atlas.json`, `sons/manifesto.json`, `cenario-jp.webp`, `manifest.webmanifest` 200 | `curl` |
| O que a CI roda | `npm ci`, `typecheck`, `test`, `build` (o `pages` repete e só então publica). **Não roda e2e, e2e:build nem balanço** | li `.github/workflows` |

Risco: como o `pages` roda `npm test` antes de publicar, **um `sons-integracao` vermelho por acaso bloqueia o deploy** (a CI Linux passou hoje, mas a mesma suíte falhou aqui em metade das rodadas).

## 6. O que foi provado e o que não foi

**Provado rodando hoje:** tudo marcado "rodei" acima: typecheck, vitest (6 rodadas completas e 3 isoladas), build, e2e:build, e2e de 26 specs (+ 4 reexecuções de `fidelidade-prototipo`),
bytes por etapa no build, dimensões e pesos de todos os atlas e cenários, p95 de custo por quadro em `hayato:min-ji` (1x e 4x) e `caio:wei-long` (1x), CI e Pages pela API pública.

**Só inferi ou não consegui:** cobertura numérica (ferramenta indisponível); p95 do intervalo real entre quadros e `caio:wei-long` a 4x (travaram); 60 fps em aparelho de verdade (nenhum medido);
memória "real" de imagem (estimei por w·h·4 e pelo working set do headless); causa das diferenças de pixel (anti-aliasing) e das 17 falhas instrumentadas; se `fidelidade-prototipo` passava
em commit antigo; gargalo de 4x causado só pela carga alheia (a sessão paralela estava ativa, não consegui isolar).
