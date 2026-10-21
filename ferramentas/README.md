# ferramentas/

Scripts Node de dev, fora do bundle. Entram na F2 (`sprites/`, `marcador/`) e
na F1 (`extrair-prototipo.mjs`). Vazio na Fase 0.

- `sprites/` (F2): `npm run sprites -- <id>` transforma as folhas 4x3 de `arte-fonte/lutadores/<id>/folhas/` em atlas C1 v2
  (`sprites-gerados/<id>/`, gitignored) + contact-sheet em `arte-fonte/lutadores/<id>/`. Núcleo puro em `nucleo.mjs`
  (testes: `tests/unit/sprites-*.test.ts`). Opções e decisões: `docs/handoff-vega-f2.md` e o cabeçalho de `sprites/cli.mjs`.

- `gerar-retratos.mjs` (E1b): gera `retrato.png` + `retrato.json` de cada lutador a partir do atlas (usa o Chromium do
  Playwright para decodificar o WebP; o PNG sai do `zlib` do Node, sem dependência nova). `--verificar` confere o que
  está no disco sem gravar; `--so <id>` limita a um lutador. Rode de novo se o atlas de um lutador mudar.
