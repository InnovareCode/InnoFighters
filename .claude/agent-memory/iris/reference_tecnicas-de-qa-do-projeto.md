---
name: tecnicas-de-qa-do-projeto
description: Como testar o motor de luta do InnoFighters (vitest unit, sandbox de mutação sem editar src, armadilhas de ferramenta no Windows/git-bash)
metadata:
  type: reference
---

- Framework: vitest (`npm test` = `vitest run`, só `tests/unit/**/*.test.ts`); `npm run typecheck` é `tsc --noEmit` e inclui os testes (`exactOptionalPropertyTypes`, tipos literais como `ConfigChefe.barras: 2`).
- Convenção desta QA: bug real = `it.fails(...)` com a asserção do comportamento CORRETO; ao corrigir, vira `it`.
- `console.log` não aparece na saída do vitest daqui: para espiar valores, lançar `throw new Error(texto)` num teste temporário (apagar depois).
- **Mutação sem tocar em `src/`:** copiar `src`, `public/assets/lutadores`, `tests/unit/{teste,_lutadores}.ts`, `package.json`, `tsconfig.json`, `vite.config.ts` para uma pasta no scratchpad, ligar `node_modules` por junction (`cmd //c mklink /J destino origem`), mutar a cópia de `src/fight/game.ts` e rodar vitest ali. Remover a junction com `cmd //c rmdir` (NUNCA `rm -rf` na junction: apaga o `node_modules` real). `game.ts` tem CRLF: normalizar antes de casar texto.
- Em bash, não construir arquivos com template literal via `node -e "..."` (crases/`$` quebram); gravar o texto com a ferramenta Write e fazer o splice com node lendo o arquivo.
- O repo é editado por vários agentes ao mesmo tempo: conferir `mtime` de `src/` antes de afirmar estado, e dizer qual versão foi testada.
- Junction no Windows: `cmd //c mklink /J` quebra no git-bash (a barra de `/J` vira caminho); usar `powershell -NoProfile -Command "New-Item -ItemType Junction -Path ... -Target ..."` e remover com `cmd /c rmdir` dentro do powershell. Script de mutação reutilizável: `scratchpad/mutar-esq.mjs` (lê `mutantes.json` com `arquivo/de/para`, aplica, roda vitest nos arquivos dados, restaura; normaliza CRLF).
- NUNCA gerar código com template literal via `node -e "..."` no bash (as crases/`$` viram comando e o arquivo sai corrompido): usar `node - <<'EOF'` com heredoc entre aspas simples, ou Write/Edit.
- Eventos têm campos opcionais no tipo (`hit.dano?`): em teste usar `e.dano ?? 0`. `tsc --noEmit` inclui os testes.
- Harness de balanço: `--rapido` grava em `relatorios/balanco`; `--completo` SEM `--saida` regrava `docs/balanco/` (referência!): sempre passar `--saida <pasta temporária>` para reproduzir sem sobrescrever; com `--esquiva` grava em `relatorios/balanco-esquiva`. O hash do resultado da referência em 2026-10-21 é `41def0eefa85f158`.
- **Isolar um conjunto de arquivos (commit parcial):** `git worktree add --detach <pasta fora do projeto> <HEAD>`, junction de `node_modules` (powershell New-Item -ItemType Junction), copiar SÓ a lista, rodar tsc/vitest/build/e2e ali. Remover: `cmd /c rmdir <wt>\node_modules` (powershell) e `git worktree remove --force`. Fidelidade "falha no HEAD puro?": segundo worktree limpo.
- **e2e em paralelo ao dev server da Lyra:** a porta 5173 costuma estar ocupada (`lyra-servidor.mjs`) e o `playwright.config.ts` tem `reuseExistingServer`: rodar no worktree reusaria o servidor do working tree. Usar config temporário com outra porta (`npm run dev -- --host 127.0.0.1 --port 5183`, baseURL igual) e apagá-lo depois; no worktree pode-se editar vite/playwright config e `tipografia.spec` (porta hard-coded).
- `JSON.stringify` descarta `undefined`: helper que "apaga" preferência por `undefined` não apaga nada; usar `null`.
- Em e2e de provocação, `h.avancar(1)` + `h.desenhar()` + espião de `fillText` dá o que o jogador lê por quadro (HUD = texto com y < 56). Desenhar só quando `provocacao.ativa` (14 ms/quadro) ou a luta inteira passa de 1 min.
- Auxiliares: `tests/unit/_lutadores.ts` (`montarTodos`), BAATAR provisório = WEI LONG com `chefe`+`fichas` (copiar `defBaatar` de `chefe-e3.test.ts`; não é exportado).
- Junction/rmdir em powershell dentro de loop bash: `$n` NAO expande e o caminho sai `wt-qa$n`; escrever os caminhos literais. Remover junction: `powershell -Command "cmd /c rmdir '<wt>
ode_modules'"` (conferir que o `node_modules` real continua) antes de `git worktree remove --force`.
- Harness de balanco isolado: `node ferramentas/balanco/cli.mjs --completo --esquiva --saida <tmp>` (~70 s, 8 processos); `--sem-chefe --so sim` no HEAD puro da o `hashRegulares` de referencia (~50 s).
