---
name: residencia-memoria-l1l2
description: L1+L2 da residência de memória (gerenciador de arte por peso, memoria(), entrarNaLuta, preferir, aliviar): decisões, armadilhas e como provar sem se enganar
metadata:
  type: project
---

Spec: docs/spec-residencia-de-memoria.md. L1 = `memoria()` + `pesoDoManifesto`/`AtlasLutador.peso` + cache de silhuetas passado a `carregarManifestos` (6º parâmetro) e ao gerenciador. L2 = `GerenciadorDeArte` com `politica: 'fixa' | 'por-peso'` (padrão da CLASSE = por-peso; padrão do JOGO = `POLITICA_PADRAO = 'fixa'` em `assets/elenco.ts` até a L6; `?residencia=peso|fixa` em main.ts).

- `'fixa'` ficou IGUAL ao antigo: provado por teste diferencial descartável (copiar `git show HEAD:src/assets/gerenciador.ts` para tests/unit/_tmp_antigo.ts, 200 sequências aleatórias de garantir/usar/pedir/liberar/filme, comparar residentes, cenários, FILME e a lista de imagens pedidas). Apague os dois arquivos depois.
- Despejo antes de decodificar: as cargas em andamento CONTAM (`noArLut`/`noArCen`, por OBJETO de atlas, com a geração em que foram pedidas); carga obsoleta (geração anterior a `entrarNaLuta`/`aliviar` e fora do que está em uso) é solta NA CHEGADA. Quem pede de novo uma carga em andamento renova a geração dela.
- Mutação achou 1 buraco: o que já está residente E faz parte do pedido tem de ser protegido do despejo (senão `garantir({x1, grande})` solta x1 para caber `grande`). Teste dedicado agora.
- Limite do manifesto: no máximo 8 páginas por atlas; para pedido "enorme" em teste use páginas maiores (2048x1792), não mais páginas.
- Dublês de gerenciador em ~10 testes de cena (`arte: { pedir, usar, estaPronto, prebuscar }`) NÃO têm `entrarNaLuta`: por isso `EsperaDeArte` chama `m.arte.entrarNaLuta?.(pedido)` (mesmo padrão do `carregarFilme?.` em fight.ts). A L3 troca isso pelo Navegador e vai ter de atualizar esses dublês.
- Em `'por-peso'` o `rec.cenarioPadrao` de main.ts continua por REFERÊNCIA no boot: o `jp` sai do mapa do gerenciador mas a imagem segue viva (memória real não cai até a L3 trocar por getter). `memoria()` mede o que o GERENCIADOR segura, não o working set.
- Números medidos (desktop e celular, `memoria-por-luta.spec.ts`): fixa = os 7 da Íris (135,3 / 206,7 / 195,2 / 255,2 / 203,2 / 173,2 / 165,3); por-peso com FILME = a tabela C1 da spec nos 9 pares (75,8 ... 139,7), todos ±0,5.
- Ambiente: servidor e2e fresco = script vite `createServer({server:{hmr:false,watch:null}})` em porta própria + config temporária `playwright.lyra-l2.config.ts` na raiz (apagar no fim). `Stop-Process` por `CommandLine -like` SEM filtrar `Name='node.exe'` mata o próprio bash da chamada (exit 255): filtre pelo nome do processo.
