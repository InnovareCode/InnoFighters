---
name: saude-da-suite-2026-10-23
description: Auditoria de saúde em worktree limpo no HEAD f5b5fab — fidelidade-prototipo vermelho 5/5, 3 testes frágeis por tempo, orçamentos PLANO §6, buracos de cobertura, armadilhas de medição
metadata:
  type: project
---

Doc completo: `docs/saude-da-suite-2026-10-23.md`. Veredito REPROVADO como portão de saúde (entrega no ar verde: CI 34 e Pages 21 em f5b5fab, version.json sujo:false).

- `fidelidade-prototipo` NÃO é "flaky": 5/5 rodadas vermelhas; com 1 worker falha nos MESMOS ticks (91, 97, 100, 105), 1-1021 px, max 3-9 níveis, tolerância do teste = 0 px. Em 4 workers há também `EPERM rename test-results/prototipo-fontes/tmp-*.html` (corrida entre workers, Windows). Não rodei commit antigo para provar que já passou.
- Frágeis por tempo (unit): `sons-integracao` (p99 relativo, 2/4 rodadas completas, verde isolado 3/3), `sons-volume` e `sprites-pipeline` (5 s de timeout; verdes com `--testTimeout=120000`). Sob V8 coverage + carga: 17 falhas. `pages.yml` roda `npm test` antes do deploy: um vermelho por acaso bloqueia o site.
- CI não roda e2e nem e2e:build (só typecheck, test, build). 26 specs / 494 testes e2e + 14 e2e-build rodam só à mão (~19 min + 2,6 min).
- Orçamentos §6 em f5b5fab: JS inicial 119,9 kB (passa), total 175,5 kB (falha); atlas por lutador 7/10 falham (CAIO e WEI LONG 3600 px); cenários 3/10 falham (br/cn/kr 1600x900); até o título 7,77 MB (boot pronto) / 10,4 MB; até a luta 10,4 MB (pré-carga do boot traz tudo); memória w·h·4 152 MB boot / 224 MB luta.
- Sem teste direto: `platform/erros.ts`, `platform/orientacao.ts`, `ui/cenas/{intro,menu,options,fim}`, `ui/espera-de-arte.ts`, `ui/trailer/trailer.ts` (33 KB), `render/trailer/{contraluz,estatica,frio,letterbox,reserva}`.

**Armadilhas desta rodada (reaproveitar):**
- `@vitest/coverage-v8` não está no package.json e não instala offline; `NODE_V8_COVERAGE` + vitest sai incompleto (workers não descarregam). Para "cobertura" use grafo de imports + busca de símbolo, e diga que não é numérica.
- `ferramentas/trailer/medir.mjs` com `--modo intervalo` e `caio:wei-long` a 4x TRAVAM (>300 s) com a máquina dividida com outra sessão; sempre `timeout 300` e redirecionar para arquivo (um `| tail` perde tudo ao matar). O processo não sai sozinho no fim: o resultado já está no arquivo.
- Máquina é dividida com a sessão do Neve Maluca (vitest paralelo): p95 de 4x oscila de 30 a 95 ms; a mediana (9,7-10,4 ms) é o número estável. Referência de 2026-10-22: p95 14,7 / mediana 6,7.
- Heredoc/`node -e` no git-bash mangla `\` e `$`: criar `.mjs`/`.ps1` com a ferramenta Write; `import` de caminho absoluto no Windows exige `file://`, então colocar o script dentro do worktree e usar import "bare".
- Em worktree com `npm ci` real (sem junção), `git worktree remove --force` basta. `vite preview` serve gzip (encodedDataLength = bytes na rede). Matar servidor por PID com `taskkill /T /F`.
- Vitest no Windows deixa 2 snapshots "sujos" no git (EOL, `git diff` vazio) e isso faz o `vite build` gravar `sujo:true` em version.json.

**Why:** o dono precisa saber que "verde" na CI não cobre e2e, nem orçamentos, nem o pixel a pixel.
**How to apply:** ao testar de novo, rodar `fidelidade-prototipo` com `--workers=1` e comparar os ticks acima; priorizar os 3 testes por tempo e as áreas sem teste direto. Ver [[tecnicas-de-qa-do-projeto]].
