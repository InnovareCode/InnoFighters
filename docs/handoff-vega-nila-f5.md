# Handoff Vega: NILA folha 5 (serpente, SARPA) no pipeline e nos dados

Data: 2026-10-21. Sem commit. Tocado: `ferramentas/sprites/{poses.mjs,executar.mjs,lutadores.json}`, `src/data/lutadores/nila.ts`,
`tests/unit/{e5-elenco,sprites-nucleo,sprites-pipeline}.test.ts`, `public/assets/lutadores/nila/{atlas-0.webp,atlas-1.webp,atlas.json,retrato.png,retrato.json}`.
Não tocado: `src/render`, `src/ui`, `src/assets`, `tests/e2e`, nem os outros lutadores.

## O que mudou

- **Pipeline:** `lutadores.json` ganhou `folhasExtras` (folha fora do layout; `resolverLayout` as acrescenta depois das do layout, valida id repetido,
  grade e pose repetida). A NILA declara `f5` 4x3 = `sarpaIdle0..3, sarpaWalk0, sarpaWalk1, sarpaSlide0, sarpaSlide1, sarpaLeap0..2, sarpaBlock`
  (a `sarpaLeap1` fica no atlas sem uso). `executar.mjs` põe as poses que não estão no mapa do motor DEPOIS das 54 do `ORDEM_COMPLETA`.
  `ponta` aceita `pe:<fração>` (ex.: `pe:0.75`) além de `pe`.
- **Versões (maior -vN, sem `--folha`):** f1 v3, f2 v2, f3 v1, f4 v1, f5 v2. Atlas da NILA: 60 quadros (48 + 12), alturaRef 410 (3 páginas 2048x1600 depois do fator de f2/f3).
- **`fatorFolha`:** f2 1,2, f3 1,15, f4 1,1 (seção "Fator de escala f2/f3"). A f5 v2 NÃO precisa dos 1,11 do Apolo (a medida dele, 101 px, era da v1: a v2 mede 117).
- **Dados (`nila.ts`):** premissa antiga ("SARPA usa poses da GAJA até a f5") removida; `poseDaFicha`: idle0-3 -> sarpaIdle0-3; walk0..7 alternam
  sarpaWalk0/1; block e cblock -> sarpaBlock; crouchPunch -> sarpaSlide0 (preparo do BOTE); sweep -> sarpaSlide1 (BOTE e chk); sc0 -> sarpaLeap0;
  sc1 -> sarpaLeap2. `crouch`, `jsquat`, `land` da SARPA seguem os da GAJA.
- **Pontas** (a caixa do golpe sai de `getPD(pose ativa).tipX/tipY`): `sarpaSlide1` = `pe:0.75` (a ponta cai no pé/dedos de baixo, tipY baixo como o `sweep` da
  GAJA; com `pe` simples caía na ponta dos dedos da mão, a 50 px do chão); `sarpaLeap2` = `direita` (o pé do chute). O alcance mínimo de 150 do BOTE
  (`minReach` em `montar.ts`) continua mandando: `tipX` do deslize (~110-125) é menor que o do `sweep` da GAJA (162), mas o BOTE não encurta.
  O chk (rasteira agachada) da SARPA passa a usar o mesmo quadro (já era assim desde a S5).

## Medidas (atlas gerado, px do atlas; fonte: `sprites-gerados/nila/atlas.json` e `relatorio.json`)

| Quadro | w x h | ax | Pé de trás / pé da frente relativo ao ax | Observação |
|---|---|---|---|---|
| sarpaIdle0 | 357x324 | 176,4 | -175 / +122 | referência |
| sarpaIdle1 | 361x333 | 177,5 | -178 / +121 | cabeça e mãos para frente e para cima (+9 px) |
| sarpaIdle2 | 314x311 | 154,6 | -155 / +123 | mais baixo (-13 px), mãos 46 px mais baixas, para trás |
| sarpaIdle3 | 342x323 | 167,5 | -167 / +120 | recuado |
| GAJA idle0..3 | 353-358 x 408-418 | ~161 | -160 / +177 | sem ondulação visível (pés e mãos ±3 px) |

Ondulação do idle: altura 311 a 333 (22 px), mão da frente -21 a +3 px entre quadros, pé da frente fixo (±2 px) e o pé de trás andando 23 px
(âncora `ax` por centro de massa). O motor usa o laço 0-1-2-3-2-1 a cada 9 ticks.
Serpente vs GAJA: idle 324/410 = 79% da altura, mais largo que alto nos 4 quadros; deslize ativo 468x182 (2,6x mais largo que alto).

## Fator de escala f2/f3 (decisão do Atlas aplicada)

`fatorFolha` da NILA agora: **f2 1,20, f3 1,15, f4 1,10** (f1 v3 e f5 v2 sem fator). Medido (cabeça topo-queixo, régua a 4x, na versão que entra): f1 v3 ~115 | f2 v2 ~94-95 |
f3 v1 ~100 | f4 v1 ~102-106 | f5 v2 ~117, dando 1,21 / 1,15 / 1,10 (largura orelha-nariz concorda: 1,19-1,23 / 1,19 / 1,13); usei 1,2 / 1,15 / 1,1.
**Conferido no atlas final** (topo-queixo em px do atlas): idle0 77, lp0 78, block 76, sa0 75,5, hp0 77, sb0 76, sarpaIdle0 77,5 (cabeça inclinada); a `hitH` é cabeça jogada para trás (não comparável).
Contact-sheet: `crouch`, `block`, `lp0..hk1` e `sa0` com a cabeça do tamanho do idle; guardas em pé têm 410-426 px (idle0 410), poses de pé esticado 440-480 (block 434, win 480), coerente com o idle em base larga.
`ponta` e `ax` se recalculam sozinhos (modos inalterados). Atlas: **3 páginas** 2048x1600 (as folhas maiores já não cabem em 2), 60 quadros.
Recopiei SÓ `public/assets/lutadores/nila/` (atlas-0/1/2.webp, atlas.json, retrato.png/json; `gerar-retratos --so nila` e `--verificar` = ok; recorte do retrato [2.5, 0, 190, 190]).
Testes: sprites-pipeline (atlas f1..f5: avisos de fator, `h / alturaOriginal` = fator x escala em block/lp0/sa0, guardas a 410 +-5%; mutante `f2: 1.0` derrubou o teste), e5-elenco (3 páginas, guardas ±5% do idle, block >= idle) e f3a-assets (`PAGINAS.nila` 2 -> 3).
Gates: typecheck, `npm test` 37 arquivos / 833 verdes (sem `-u`), build verde; e2e não rodado.
**Para a Lyra:** `tests/e2e/novos-lutadores.spec.ts:68` tem `{ id: 'nila', ..., paginas: 2 }`: agora são 3 (`atlas-0/1/2.webp`).

## PARA O PRÓXIMO

- **Lyra (F3a/loader):** o atlas da NILA agora tem 60 nomes (`sarpa*` no fim do manifesto). O loader não pode supor 48/54. Eu copiei SÓ `public/assets/lutadores/nila/*`
  (atlas-0/1, atlas.json, retrato.png/json via `node ferramentas/gerar-retratos.mjs --so nila`, `--verificar` = ok). O `atlas.json` copiado leva o `retrato.recorte`
  igual ao do `retrato.json` ([2.5, 2, 190, 190], como nos outros). Não toquei em `src/render` nem `tests/e2e`; os screenshots e2e da NILA/SARPA
  (`lutador-nila-2-sarpa`) vão mudar (arte nova), se forem comparados.
- **Íris:** conferir a olho a SARPA em jogo: idle (ondulação), andar (alternância de 2 quadros a cada passada, parece "pisada dupla"; com 8 quadros seria mais suave),
  BOTE (pose de preparo = engatinhando, ativa = deslize), SALTO (agachamento enrolado, depois o chute descendo o voo inteiro: o quadro "parafuso subindo" não é usado) e a defesa.
  A hurtbox da SARPA em pé continua a de pé da GAJA (o sprite tem 79% da altura): conferir se projéteis acertam "no ar" por cima da cabeça dela.
- **Órion:** nada de superfície nova (`folhasExtras` vem de JSON versionado).

## Provado / não provado

Provado (executado): `npm run typecheck` e `npm run build` verdes; `npm test` 37 arquivos / 826 testes verdes (fidelidade e snapshot sem `-u`); 6 testes novos/alterados cobrem
`folhasExtras`, a folha 5 real (12 figuras, halo 0, nomes), o atlas (sarpa* depois das 54, `fatorFolha` aplicado, pontas por modo) e o `getPD` da SARPA contra o atlas real.
Mutação: `fatorFolha` f4 1,10 -> 1,0 e `pe:0.75` -> `pe` derrubaram o teste do atlas. Contact-sheet conferido a olho (`arte-fonte/lutadores/nila/contact-sheet-nila*.png`): pés na linha, sem halo.
Não provado: nada foi carregado no navegador; a ponta/caixa do BOTE e do salto foram conferidas pelos números, não em luta.

## APRENDIZADO

1. A medida de cabeça do handoff do Apolo era da v1; a v2 mudou de tamanho. Medir de novo na versão que entra (régua a 4x no topo/queixo) antes de aplicar `fatorFolha`.
2. `ponta` 'pe' com fração fixa (55%) pega a ponta dos dedos quando a mão também está na metade de baixo (deslize): modo `pe:<fração>`.
3. Teste com regex em Python heredoc: `\\` some; edite com a ferramenta Edit.
