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
- Auxiliares: `tests/unit/_lutadores.ts` (`montarTodos`), BAATAR provisório = WEI LONG com `chefe`+`fichas` (copiar `defBaatar` de `chefe-e3.test.ts`; não é exportado).
