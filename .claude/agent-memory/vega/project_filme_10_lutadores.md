---
name: filme-10-lutadores-pipeline
description: Paginas FILME dos 10 instaladas; bloco `filme` vive em lutadores.json e o pipeline repoe no atlas regerado; portao filme-peso/filme-px
metadata:
  type: project
---

Os 10 lutadores tem `public/assets/lutadores/<id>/filme.webp` + bloco `filme` no atlas.json (AMINU sem f2: o PASSO DO LEAO usa o Alt).

**Why:** `npm run sprites` regera o atlas.json do zero e apagaria o bloco `filme` (montarManifesto nao o conhecia).

**How to apply:**
- Fonte unica do bloco: chave `filme` em ferramentas/sprites/lutadores.json. `gerarLutador` -> `prepararFilme` (executar.mjs) valida (`validarBlocoFilme` em nucleo.mjs), confere o cabecalho de public/.../filme.webp contra `tamanho` (lanca se divergir), copia o webp para a saida e passa `filme` a `montarManifesto` (chave por ultimo, como o HAYATO). Imagem ausente = so aviso. Lutador novo com FILME: acrescentar a chave em lutadores.json E o webp em public/.
- A imagem NAO e gerada pelo pipeline: public/ e a fonte versionada dela.
- Portao: `filme-peso:<id>` <= 0,8 MiB e `filme-px:<id>` <= 2048x1280 (orcamento.json `filmeMiB`/`filmePaginaPx`), fora da soma do atlas-peso. Todos OK (0,24-0,41 MiB).
- Teste: tests/unit/filme-paginas.test.ts (10 lutadores + regeracao sintetica com excecoes reais de caio/wei-long/aminu). Nunca le arte-fonte/.
- Armadilha: f3a-assets.test.ts percorria `a.poses()` e exigia imagem em todas; quadros f0..f5 da FILME tem `imagemDe` null ate o `carregarFilme` (ajustado no teste).
- Armadilha de ambiente: arquivos de trabalho misturam LF/CRLF (autocrlf); o HEAD e LF. Edicao por script: detectar `\r\n`, normalizar, editar e devolver. `grep -c $'\r'` no Git Bash NAO serve (padrao vazio); use node.
- JS inicial 135,5 kB (>135) ja estourava antes, nao vem desta tarefa.

**Atualizacao 2026-10-23 (paginas v2 de AMINU/ZENON/BAATAR instaladas):** AMINU agora tem f2 (6 quadros). Procedimento que funcionou: copiar `arte-fonte/.../<id>-filme-pagina-v2.webp` -> public/.../filme.webp, trocar a linha `filme` em lutadores.json, rodar `npm run sprites -- <id> --saida <scratch> --sem-contato` e copiar SO a chave `filme` do atlas gerado para o public (o resto do atlas gerado difere do publico no `retrato.recorte`, divergencia antiga: NAO sobrescrever o atlas inteiro). Nao havia fallback de f2 no codigo (roteiros ja apontavam fK f2); so o teste filme-paginas.test.ts esperava AMINU sem f2. Armadilha: `npm run orcamento` mede `dist/` (pode estar velho); gere com `vite build --outDir <scratch>` e passe `--dist=`.
