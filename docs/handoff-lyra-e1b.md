# Handoff — Lyra — E1b (UI e assets prontos para N lutadores)

Data: 2026-10-20. Sem `git add`/commit/push, sem dependência nova. Nenhum servidor deixado aberto (Playwright sobe e
derruba o da 5173; a 5174 do dono não foi tocada; um `test:e2e` por vez).

## RESULTADO

**1. Sem "4" literal na UI/assets**
- `select.ts`: grade por `COLUNAS = 2` e `ROSTER.length` (cursor com volta nas bordas e última linha incompleta;
  P2 começa em `(cur+1) % N`; casas, hover e clique em `N`). A grade 3x3 continua sendo da E4.
- `how.ts`: ciclo de lutadores por `ROSTER.length`; aba LUTADORES em `COLUNAS_ABA_LUTADORES` (cabe 4; para mais a E4
  reorganiza junto com a seleção).
- Título/abertura/menu: tudo vem de `VITRINE` (`menu.ts`, `intro.ts`, `logo.ts`). Ciclo de cenários do título =
  `CICLO_VITRINE` (cenário da casa de cada lutador da vitrine). `fileiraDeHerois` usa `posicoesDaFileira(n)`
  (104, 296 | 664, 856 para 4). Brasas e faíscas já eram independentes (logo).
- `elenco.ts`: monta e carrega por `IDS_LUTADORES`, não por lista de 4.
- Teste-guarda (`papeis-lutadores.test.ts`): falha se `% 4`, `i < 4`, `W / 4`, `i >> 1` ou as posições fixas da
  fileira voltarem em `src/ui` ou `src/assets`.

**2. `src/data/lutadores/index.ts`** (papéis, plano 1.2): `ROSTER`, `INICIAIS`, `FILA_DESBLOQUEIO` (`[]`),
`CHEFE` e `VITRINE` (= `INICIAIS`), mais `LUTADORES`. **Atenção Vega/Cronos:** `CHEFE` é `IdLutador | null` (hoje
`null`: ainda não há id de chefão em `IDS_LUTADORES`); quando existir, é só trocar o valor. Teste: INICIAIS +
FILA + CHEFE = ROSTER sem repetição; ROSTER = `IDS_LUTADORES`; VITRINE só com liberados.

**3. Carga sob demanda + retrato**
- `assets/gerenciador.ts` (`GerenciadorDeArte`): `garantir({lutadores, cenarios}, progresso)`, `estaPronto`, `pedir`
  (sem esperar), `prebuscar` (só baixa), `usar(ids)` (em uso, nunca podado), poda LRU (limite padrão 3 residentes
  não fixos), `liberar*`, `carregarRetratos`. Pedidos simultâneos do mesmo arquivo dividem a carga.
- `assets/elenco.ts`: `iniciarArte` (boot): manifesto e `LutadorMontado` de TODOS, retrato de TODOS, atlas e cenários
  só da vitrine + cenário padrão. `montarElencoDeAtlas` monta só pelos metadados (as imagens não precisam estar na
  memória), então `fight/` e `Dependencias.lutadores` não mudaram.
- `ArteLutador` agora é por quadro: `pronta`, `imagemDe(pd)`, `silhuetaDe(pd)`, `retrato(head)`. Imagem nula = o
  lutador não é desenhado (aparece quando a arte chega); `desenharPose`, `desenharLutador` e os retratos toleram isso.
- Telas: VS e luta usam `EsperaDeArte` (marca os dois como em uso, pede o que falta, barra "Carregando
  lutadores... N%", mensagem + ESC se falhar). Quando já está tudo na memória (a vitrine, hoje) nasce pronta, sem
  nenhuma espera visível. `mostrarLutador`/`miniatura` pedem o atlas do que mostram. ARCADE pré-busca o próximo rival
  durante a luta.
- **Retratos:** `ferramentas/gerar-retratos.mjs` (sem dependência nova: Chromium do Playwright decodifica o WebP, PNG
  pelo `zlib`) gerou `public/assets/lutadores/<id>/retrato.png` (~50-70 KB, 195x194) e `retrato.json`. O recorte do jogo
  é fracionário, então o PNG guarda um recorte inteiro com margem e o `.json` o recorte fracionário dentro dele:
  mesma amostragem de antes. `--verificar` confere o disco.
- Os `atlas.json` NÃO foram alterados (o teste "regenerar o manifesto dá o mesmo arquivo" da Vega exige isso): o
  loader lê o campo `retrato` do manifesto se existir, senão o sidecar `retrato.json`, senão recorta o atlas.

**4. C1 v2 no loader** (compatível com v1): `versao: 2` com `imagens: [...]` e `p` por quadro; `retrato` como nome ou
`{arquivo, recorte}`. `validarManifesto` (assets) devolve um `ManifestoC1` normalizado para v1 e v2 (rejeita pasta no
nome, página fora do intervalo, arquivo repetido, mais de 8 páginas, `p` em v1). A página de cada quadro é guardada
por objeto de pose (WeakMap) e `paraManifestoV1` reaproveita o `manifestoParaPoses` da Vega: a conversão de
ponta/rosto continua num lugar só e **nada em `src/data/` foi tocado** (exceto o `index.ts` pedido).

## PORTÕES (rodados agora, um de cada vez)

- `typecheck` limpo. `npm test`: 22 arquivos, 356 testes verdes. `npm run test:e2e`: 63 passaram, 31 pularam por
  projeto. `build` ok (JS 137 kB, 49 kB gzip). `node ferramentas/gerar-retratos.mjs --verificar`: 4 ok.
- **As 40 telas de `fidelidade-ui` seguem com 0 pixel de diferença; máximo por canal = 0** (conferido nas telas
  de seleção, "como jogar" aba 4 e luta, que agora usam `retrato.png`: o recorte pré-cortado dá exatamente os
  mesmos pixels do recorte do atlas).

## PROVADO (no navegador, com a coisa real)

- Boot padrão: 4 manifestos, 4 retratos, 4 atlas (a vitrine) e 4 cenários, cada arquivo uma vez; todo `arte.temRetrato`.
- Tudo sob demanda (`?precarga=minima`, só em DEV): boot sem nenhum atlas e só o cenário `jp`; o título aparece sem
  os lutadores, sem erro; a seleção pede só o HAYATO, depois o WEI LONG; o VS pede o cenário `cn` e nada mais; a luta
  desenha os dois; cada atlas foi baixado exatamente uma vez; sem erro de console.
- Poda: com limite 3, o lutador antigo é solto e baixa de novo na luta seguinte (memória limitada).
- C1 v2 real: atlas de 2 páginas servido por fixture; o quadro da página 0 sai vermelho, o da página 1 azul, e a
  silhueta branca da página 1 sai branca.
- Unit: validação v1/v2 (16 casos de rejeição), `AtlasLutador` com páginas, `GerenciadorDeArte` (dedupe, poda,
  liberar, pré-busca, erros), `iniciarArte` com e sem precarga, ferramenta de retratos e a geometria dos 4 retratos.

## NÃO PROVADO

- Nenhum lutador novo foi carregado: com o elenco de hoje a carga sob demanda só é exercitada pelo modo
  `?precarga=minima` e por testes com leitor falso; o primeiro teste real é quando entrar o 5º atlas (E5).
- Desempenho e memória em celular com 9 lutadores (E7); o limite de 3 residentes é uma escolha, não uma medição.
- O desenho do atlas v2 com várias páginas dentro de uma luta completa (só o quadro isolado e os testes unitários).
- A grade 3x3, casas travadas, "NOVO!" e cursor que pula travados são da E4.

## PARA O PRÓXIMO

- **E4 (Lyra):** `select.ts` já deriva de `ROSTER.length`; falta trocar `COLUNAS` por 3 com os estados de casa, e o
  painel de rivais/aba LUTADORES do "como jogar" para mais de 4. Use `m.arte.usar([...])` ao confirmar e
  `EsperaDeArte` no VS (já está).
- **Vega (E5/F2):** para um lutador novo basta `atlas.json` (v1 ou v2) + `retrato.png` com `retrato.json` (rode
  `gerar-retratos.mjs`) ou o campo `retrato` no `atlas.json` quando o pipeline passar a emiti-lo (dispensa o sidecar).
  Se o empacotador emitir v2, o formato é o do plano 1.4 (`imagens`, `tamanho` por página, `p` por quadro).
- **Cronos:** `CHEFE` é `IdLutador | null` no `index.ts`.
- **Íris:** vale rodar o jogo com `/?precarga=minima` (só em dev) e conferir o VS com a barra de carregamento.

## PENDÊNCIAS

- Nenhuma bloqueante. O sidecar `retrato.json` é transitório: some quando o pipeline escrever `retrato` no
  `atlas.json` (a Vega precisa antes ajustar o teste de "regerar manifesto" no dia em que fizer isso).
- Texto do ARCADE em `menu.ts` ("enfrente os 3 rivais") continua literal de propósito (é da E4, junto com o chefão).

## APRENDIZADO

- Para trocar a origem de uma imagem sem mudar um pixel, guarde o recorte fracionário original junto da imagem
  pré-cortada em vez de reamostrar; a comparação pixel a pixel com o protótipo mostrou diferença máxima 0.
- Tornar a arte "opcional" (nula até chegar) no tipo, e não só no fluxo, faz toda tela degradar sem quebrar quando
  a carga atrasa; um teste de desenho com arte nula garante isso.
- Teste-guarda por expressão regular nas fontes (sem comentários) impede a volta de literais que o typecheck não vê.
