# ferramentas/

Scripts Node de dev, fora do bundle. Entram na F2 (`sprites/`, `marcador/`) e
na F1 (`extrair-prototipo.mjs`). Vazio na Fase 0.

- `gerar-retratos.mjs` (E1b): gera `retrato.png` + `retrato.json` de cada lutador a partir do atlas (usa o Chromium do
  Playwright para decodificar o WebP; o PNG sai do `zlib` do Node, sem dependência nova). `--verificar` confere o que
  está no disco sem gravar; `--so <id>` limita a um lutador. Rode de novo se o atlas de um lutador mudar.
