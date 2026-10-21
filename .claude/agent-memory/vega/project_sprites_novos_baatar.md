---
name: sprites-novos-baatar
description: F2 nos 4 lutadores novos + BAATAR (3x2, alturaRef 525): células null/apelido, acolchoar, modo pe, armadilhas
metadata:
  type: project
---

Entregue em 2026-10-20 (sem commit), detalhes em `docs/handoff-vega-f2-novos.md`. Extensões do pipeline em `ferramentas/sprites/`: `poses.mjs` (`LAYOUTS` padrao 4x3 / chefe 3x2, `resolverLayout`), `lutadores.json` (`layout`, `celulas`, `alturaRef`, `acolchoar`, `fatorFolha`, `ponta`).

- **Célula do mapa = nome | [nome, apelido] | null.** null descarta o desenho mas a figura continua contando (6/12) e ordenando. Apelido = 1 retângulo no atlas, 2 entradas no manifesto (idle em laço). **How to apply:** o loader/render não pode supor 1 retângulo por nome.
- **Figura tangenciando a borda** (B9 v2 do BAATAR, x=0): `acolchoar` põe fundo ANTES do `cortarBorda(2)`; afrouxar o corte reintroduz o ruído da Runway.
- **`jkick` do BAATAR:** "mais à direita" pega o punho que passa da bota; modo `pe` (yMin = 55% da altura). Ponta se confere a olho em cada golpe aéreo.
- **BAATAR `alturaRef` 525** (410 x 1,28), escala única pelo idle0; retrato com janela 190*k reduzida a 190. `K = scale*SH_IDLE/alturaRef` no jogo, então ponta já sai na escala da guarda.
- **`acharFolha`** exigia `-descrição-` entre o id da folha e o `-vN`; `baatar-b1-v1.png` não casava (regex `(?:-.*)?`).
- **Armadilha de ambiente (repetiu):** `cat > arq` antes de heredoc trava no stdin; heredoc com muita aspa/crase quebra o parser do Bash. Escrever com a ferramenta Write e splice com `python` curto.
- Teste que passa de primeira não prova nada: mutar (6 mutantes aqui) e ver cair. `typecheck`/`build` ficam vermelhos se OUTRO agente deixar teste em edição (`tests/unit/baatar-s1b.test.ts`): conferir por arquivo antes de culpar o próprio código.
