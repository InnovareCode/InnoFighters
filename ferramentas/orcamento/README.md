# ferramentas/orcamento/ - portão de orçamento (T8)

`npm run orcamento` lê o `dist/` **depois** de `npm run build` e compara com as metas aprovadas em
`docs/orcamentos-2026-10-23.md` §1 (OR-1). Node puro, sem dependência. Não lê `public/`, `arte-fonte/` nem o código.

```
npm run build && npm run orcamento
npm run orcamento -- --modo=bloqueante          # tudo bloqueante (exit 1 se algo estourar)
npm run orcamento -- --dist=outra-pasta --config=outro.json
```

Saída: tabela `item | meta | medido | status`. Status `OK`, `AVISO` (estourou, não derruba) ou `FALHA` (estourou e é bloqueante).
Exit: `0` ok ou só avisos, `1` há FALHA, `2` dist ausente ou argumento inválido. No GitHub Actions também anota
(`::warning` / `::error`) e grava a tabela no resumo do job.

## Metas (em `orcamento.json`)

| grupo | o que mede | meta |
|---|---|---|
| `js-inicial` | gzip do `<script type=module>` + `modulepreload` do `index.html` | <= 135 kB (1 kB = 1000 bytes, gzip nível 9) |
| `js-total` | gzip de todo `.js` do dist, **sem** o pedaço `escuta` e os arquivos do service worker (`sw.js`, `sw-manifesto.js`) | <= 200 kB |
| `atlas-peso:<id>` | soma das páginas `atlas*.webp` do lutador | <= 1,6 MiB; BAATAR e ZENON <= 2,0 (`atlasExcecoesMiB`) |
| `atlas-px:<id>` | maior página (cabeçalho do WebP) | <= 2048 x 2048 |
| `filme-peso:<id>` | a página FILME (`filme.webp`), item próprio, **fora** da soma do atlas | <= 0,8 MiB |
| `filme-px:<id>` | largura e altura da `filme.webp` (cabeçalho do WebP) | <= 2048 x 1280 (BAATAR 2032 x 1248 cabe) |
| `cenario-peso:<arquivo>` | cada arquivo de `assets/cenarios/` | <= 250 KiB |

Em `c058ac9`, `js-inicial` mediu 140,7 kB contra a meta de 135 kB: **AVISO**, não derruba (relatado pela coordenação; confirmar com `npm run build && npm run orcamento`).

**Gates fora do `dist/`** (T4 e T12, em `c058ac9`):

- `tests/e2e-build/boot-peso.spec.ts` (roda em `npm run test:e2e:build` e na CI): a etapa 0 do boot, até `data-pronto`, pesa até 1,5 MiB pela rede e não traz atlas, retrato, FILME nem som. Medido: 0,913 MiB, 28 pedidos (relatado). O conteúdo da etapa 0 está em `src/assets/etapa0.mjs`.
- `npm run trailer:medir -- --modo memoria`: pico de memória decodificada do trailer (atlas + cenários), por plano. Meta de 150 MiB (`--limite-mib`); sai com código 1 se passar. Medido: pico de 145,3 MiB (P6 + P7), margem de 4,7 MiB (relatado).

Não cobertos aqui ainda: memória decodificada por lutador (2b, 40/64 MiB) e JS até a 1ª luta (1c). Entram quando o dado existir no dist.

## Como virar bloqueante (por item)

Hoje **tudo é aviso**: vários itens estouram de verdade e o portão não pode travar o trabalho em curso. Quando uma tarefa de corte fechar,
edite `bloqueantes` em `orcamento.json` (e rode `npm run orcamento` para conferir que o item já está `OK` antes de promover):

```json
"bloqueantes": ["js-inicial", "js-total", "atlas-px:wei-long", "cenario-peso"]
```

- `"*"`: tudo bloqueante (equivale a `--modo=bloqueante`).
- um **grupo** (`js-inicial`, `js-total`, `atlas-peso`, `atlas-px`, `filme-peso`, `filme-px`, `cenario-peso`): todas as linhas do grupo.
- uma **chave exata** (`atlas-px:wei-long`, `cenario-peso:cenario-kr.webp`): só aquela linha.

Quando WEI LONG v2, BAATAR/ZENON a 0,9 e os cenários br/kr fecharem, promova os grupos correspondentes e, no fim, troque a lista por `["*"]`.
Para rodar uma vez bloqueante sem editar nada: `ORCAMENTO_MODO=bloqueante npm run orcamento`.

Teste: `tests/unit/orcamento.test.ts` (dist falso em pasta temporária; cobre aviso x bloqueante e o atlas de 3600 px).
