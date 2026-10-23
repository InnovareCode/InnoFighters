---
name: folha-filme-loader
description: Folha FILME no atlas (bloco `filme`), carga so na luta via GerenciadorDeArte.carregarFilme/soltarFilme, armadilhas
metadata:
  type: project
---

Bloco `filme: { imagem, tamanho, quadros f0..f5 painel:true }` no atlas.json (HAYATO feito, 1920x1280, 433 KB). Validador `validarFilme` em src/assets/manifesto.ts; `AtlasLutador.carregarFilme/liberarFilme`; `GerenciadorDeArte.carregarFilme(ids)/soltarFilme(ids?)/filmesResidentes()`, `MAX_FOLHAS_FILME = 2`.

**Why:** orcamentos-2026-10-23 proibe a FILME em pedir/prebuscar/cache da selecao (10 MiB decodificados por pagina) e a pagina nao tem o tamanho do atlas (o loader recusava).

**How to apply:**
- Quadros f0..f5 entram em `poses()` desde o boot; `imagemDe(f)` e null sem a imagem, `silhuetaDe(f)` sempre null. A cena da luta (Lyra, src/ui) deve chamar `arte.carregarFilme([c1,c2])` DEPOIS da luta comecar, sem await bloqueante, e `arte.soltarFilme()` ao sair. `estaPronto`/`garantir` nao contam a FILME.
- Lutador fixo (vitrine) NUNCA e solto por `liberarLutador`; por isso `soltarFilme` explicito e obrigatorio no fim da luta.
- `carregarFilme` nunca lanca (console.warn + false): falha cai no Alt. Soltar durante a carga descarta a imagem (contador `filmeGeracao`).
- Outras 9 folhas: so acrescentar o bloco `filme` no atlas.json + filme.webp; nenhum codigo muda. `ferramentas/orcamento` ainda nao pesa filme.webp (T8 do Vulcano).
- Teste: tests/unit/filme-folha.test.ts (le public/, nunca arte-fonte/).
