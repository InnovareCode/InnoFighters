# ferramentas/

Scripts Node de dev, fora do bundle. Entram na F2 (`sprites/`, `marcador/`) e
na F1 (`extrair-prototipo.mjs`). Vazio na Fase 0.

- `sprites/` (F2): `npm run sprites -- <id>` transforma as folhas 4x3 de `arte-fonte/lutadores/<id>/folhas/` em atlas C1 v2
  (`sprites-gerados/<id>/`, gitignored) + contact-sheet em `arte-fonte/lutadores/<id>/`. Núcleo puro em `nucleo.mjs`
  (testes: `tests/unit/sprites-*.test.ts`). Opções e decisões: `docs/handoff-vega-f2.md` e o cabeçalho de `sprites/cli.mjs`.

- `gerar-retratos.mjs` (E1b, WebP desde a T6 do orçamento): gera `retrato.webp` + `retrato.json` de cada lutador a partir do
  atlas (usa o Chromium do Playwright para decodificar o WebP; o WebP sai do `sharp`, quase sem perdas) e acerta o campo
  `retrato` do `atlas.json` (só ele). `--verificar` confere o que está no disco sem gravar; `--so <id>` limita a um lutador.
  Rode de novo se o atlas de um lutador mudar (o `npm run sprites` entrega um retrato 190x190 de reserva; o publicado é o desta ferramenta).

- `balanco/` (E6a): `npm run balanco -- [--rapido | --completo] [opções]` (ver `--ajuda`). Mede a frame data de cada golpe NO MOTOR e joga CPU x CPU
  (9x9, dois lados, NORMAL e DIFÍCIL, N sementes) mais o BAATAR chefão contra os 8; grava `frame-data.md/.json` e `resultados.md/.json`
  (`--completo --esquiva` = produção em `docs/balanco/`; `--completo` sem a flag = `docs/balanco/sem-esquiva/`; `--rapido` e `--ajustes` em `relatorios/`, ignorado pelo git). Determinístico por semente; a 2ª rodada
  com os mesmos parâmetros diz se o resultado é IDÊNTICO. `--ajustes '{"wei-long":{"hp":100}}'` mede uma hipótese em memória, sem tocar nos
  dados. Código em TypeScript (`*.ts`, carregado pelo Vite em SSR); testes em `tests/unit/balanco.test.ts`.
