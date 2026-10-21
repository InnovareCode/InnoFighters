# Handoff Vega — F2: pipeline de sprites (folhas 4x3 -> atlas C1 v2)

Data: 2026-10-20. Sem commit. `sharp` 0.35.5 entrou como **devDependency** (autorizado). Nenhum atlas de produção
foi tocado: tudo sai em `sprites-gerados/<id>/` (no `.gitignore`); o CLI recusa gravar em `public/assets`.

## Uso

```
npm run sprites -- hayato                       # f1..f4 que existirem (maior -vN de cada)
npm run sprites -- aminu --folhas f1,f4         # rodada parcial (só para teste)
npm run sprites -- hayato --folha f2=hayato-f2-reacoes-v2.png --espelhar f2:koFloor   # escolhas explícitas
```

Opções: `--saida`, `--altura-ref` (410), `--escala` (obrigatória sem f1), `--tolerancia` (48), `--sem-contato`.
Saída em `sprites-gerados/<id>/`: `atlas-0.webp`, `atlas-1.webp`, `atlas.json` (C1 v2), `retrato.png` (190x190, alfa),
`relatorio.json`. Em `arte-fonte/lutadores/<id>/`: **`contact-sheet-<id>.png`** (fundo escuro) e `-claro.png`.
Leva ~10 s por lutador completo.

## RESULTADO

Código (tudo em `ferramentas/sprites/`): `nucleo.mjs` (funções puras), `poses.mjs` (ordem das 12 poses por folha, vinda
de `docs/prompts/*.md`), `empacotar.mjs`, `executar.mjs` (disco + sharp), `contato.mjs`, `cli.mjs`, `lutadores.json`
(exceções por lutador). Testes: `tests/unit/sprites-nucleo.test.ts` (40, funções puras) e
`tests/unit/sprites-pipeline.test.ts` (9: pipeline sintético com lixo na borda + arte real se existir). `tests/unit/_ferramenta.ts`
importa o `.mjs` sem exigir `.d.ts`.

O que o pipeline faz, na ordem (e por quê):

1. **Corta 2 px de cada borda** antes de qualquer coisa (ruído da Runway na última linha).
2. **Mede o fundo** (mediana da faixa de borda) em vez de assumir `#FF00FF`/`#00FF00`: a Runway devolve ≈ `253,40,246`
   e deriva para `250,49,241` embaixo; o verde sai ≈ `7,252,4`. Detecta magenta/verde sozinho; outra cor = erro.
3. **Chave de cor com rampa:** distância RGB ao fundo; <= 48 = fundo, rampa de 70 até opaco (borda suave).
4. **Anti-halo (despill):** só na faixa de 2 px junto à borda e nos pixels semitransparentes, tira o vazamento da cor do
   fundo (magenta: excesso de min(R,B) sobre G; verde: excesso de G). Pele, branco e amarelo não vazam, e o miolo não é
   tocado (a faixa verde do HAYATO sobrevive). Medido: pixels de borda com vazamento caíram de 57-65% para **0,0%** nas
   folhas reais.
5. **Componentes conexos (8-vizinhança)**, não grade 600x597. Pedaços pequenos a <= 24 px de uma figura entram nela;
   ruído longe é descartado. Ordem de leitura por centro de massa (linhas de 4), não por y fixo.
6. **Figuras coladas:** se há menos de 12 figuras, parte a mais alta/larga que a mediana (>= 1,5x) **por erosão** (raio
   crescente até a ponte quebrar, depois cada pixel volta ao miolo mais perto), com corte reto no pescoço mais fino como
   plano B. Sem isso a HAYATO f3 não passa (ver achado abaixo).
7. **Recorte com margem de 8 px** e só os pixels da própria figura (o nocaute de 700+ px e golpes entre fileiras não levam
   pedaço do vizinho).
8. **UMA escala por lutador** (a do idle0, para o idle0 sair com 410 px de altura = `alturaRef` legado, então o K do jogo
   não muda). Lanczos3, alfa pré-multiplicado. **Altura NÃO é normalizada quadro a quadro**; depois aparar pelo alfa.
9. **Âncora:** pés = base do quadro aparado; `ax` = centro de massa X ponderado pelo alfa.
10. **`ponta`** (só nos 14 golpes ativos de C1) em 3 modos, por pose (`MODO_PONTA` em `poses.mjs`): `mao` = ponto mais à
    direita acima da faixa dos pés (soco/palma), `direita` = ponto mais à direita (chutes, rasteira, chute em salto),
    `cima` = ponto mais alto (`upper`; no HAYATO também `sb2`, em `lutadores.json`). **`rosto`** só no idle0, no padrão
    `[headX + 6, 91]`. Retrato 190x190 recortado do idle0 em torno do `rosto`.
11. **Empacota** em páginas (prateleiras, vão de 4 px), menor número de páginas em 2048 e depois encolhe a altura
    da página. Grava WebP q85 com alfa.
12. **Contact-sheet relido do atlas gravado** (não da memória do pipeline): âncora no meio da célula, pés numa linha
    comum (vermelha), `ax` (ciano), `ponta` (cruz amarela). Pulo de posição entre poses salta aos olhos.

### Números (rodadas reais)

| Lutador | Folhas usadas | Quadros | Atlas | Peso |
|---|---|---|---|---|
| HAYATO | f1 v2, f2 v2, f3 v1, f4 v1 | 48 (falta só `jpunch`, da folha 5) | 2 páginas 2048x1536 | 580 KB + 712 KB |
| AMINU (teste, só f1 e f4) | f1 v1, f4 v1 | 24 | 2 páginas 2048x1216 | 271 KB + 306 KB |

Escala HAYATO 0,6716 (idle0 600 px -> 410), AMINU 0,745. Todas as 12 figuras achadas em cada folha, fundo magenta
(HAYATO) e verde (AMINU) limpos. Os 13 quadros mínimos e a `ponta` nos 14 golpes ativos estão presentes no HAYATO
(teste automático).

## PROVADO (executado) e O QUE NÃO

Provado, com saída:
- `npm run typecheck` limpo; `npm test`: **27 arquivos, 482 testes verdes** (eram 18/216 na E1a; +49 meus); `npm run build`
  ok. `test:e2e` NÃO rodado, como pedido.
- Mutação nos testes: sem diagonal na rotulação, `despill` sem o canal B, `yMax` ignorado, agrupamento de linhas da
  ponta desligado, e `borda: 0` no executor: cada um derrubou um teste. (Uma primeira versão do teste de borda **sobreviveu**
  à mutação porque o lixo da borda ficava a 28 px da figura e era descartado de qualquer jeito; reposicionei a 10 px.)
- Olhei o contact-sheet de HAYATO (48 quadros) e AMINU (24) em fundo escuro e claro: sem halo rosa/verde visível,
  pés na linha, andar e golpes sem salto de âncora, nocaute do HAYATO (`koFloor`/`kdAir`, f2 v2) com a cabeça à ESQUERDA.
- O manifesto gerado passa em `validarManifesto` do jogo e converte para `tipX/tipY` (`manifestoParaPoses`).

NÃO provado:
- **Nada foi carregado no jogo/navegador.** Não toquei o loader (`src/assets`), nem integrei, nem medi o desenho real no
  canvas. Quem confirma que a arte nova "assenta" na luta é a F3.
- A `ponta` foi conferida a olho no contact-sheet, não contra o alcance de golpe do motor. Caixas de acerto: F3.
- Não rodei AMINU f2/f3 (f3 = REGERAR, f2 só importa com v2). Não rodei CENTELLA/CAMILLE/NILA/MIN-JI/CAIO/WEI LONG.

## PARA O PRÓXIMO

**Atlas/Apolo (conferir o contact-sheet):** `arte-fonte/lutadores/hayato/contact-sheet-hayato.png` e `-claro.png`;
`arte-fonte/lutadores/aminu/contact-sheet-aminu.png` e `-claro.png`. O que olhar:
- HAYATO `lk1`: sobra um risquinho preto de ~3 px sob o pé de apoio (ponta do cabelo da figura de baixo que a erosão
  deixou grudada; ver achado 1). `walk*` saem ~7% mais baixos que o idle (é a arte: base mais larga); o jogo vai "baixar"
  um pouco ao andar.
- `ax` (âncora por centro de massa) **desloca o corpo nos golpes longos**: com o braço estendido o centro de massa vai
  para a frente, então o tronco aparece mais atrás em `lp1/hp1/sa2` do que no idle. É o que foi pedido; se a F3 achar
  que "empurra" o personagem, a alternativa é ancorar pelo centro dos PÉS (`ax` = meio do pé de trás e do da frente).
  Trocar é uma função em `nucleo.mjs` (`centroDeMassaX`) e um teste.
- `ponta` do HAYATO: `sb2` (uppercut no ar) e `upper` usam o **ponto mais alto**, logo `tipX` fica pequeno e até negativo
  em `sb2` (o punho está atrás de `ax`). O motor tolera (`reach` tem mínimo), mas a F3 deve olhar a caixa de acerto desses dois.
- AMINU `jkick` é joelhada (já dito na curadoria): `ponta` cai no joelho/punho da frente.

**Lyra / F3 (integração):** copiar `sprites-gerados/<id>/*` (atlas-N.webp, atlas.json, retrato.png) para
`public/assets/lutadores/<id>/` só quando decidir trocar a arte. O `atlas.json` é **C1 v2** (`imagens[]`, `p` por quadro,
`retrato: { arquivo, recorte }` já embutido; `tamanho` vale para cada página). `alturaRef` = altura do idle0 = 410. Faltam
`guard`, `idleB`, `walkA..C` etc. (nomes legados): o `ALIAS`/`getPD` de `data/poses.ts` já cobre pelos nomes canônicos.
`jpunch` não existe (folha 5): cai no fallback. O jogo pode precisar de `dy` por pose aérea: os quadros de pulo vêm
apoiados na base do próprio quadro (pé mais baixo), como no legado.

**Íris (testar):** `npm test` (seção "sprites-*"). Pontos para atacar: folha com 13 figuras (uma sobrando, longe);
duas figuras coladas na horizontal; figura encostada na borda (deve avisar); fundo de outra cor (deve recusar); folha com
fundo verde e uma peça de roupa verde (o despill de verde comeria; hoje só é seguro porque nenhum lutador verde tem
roupa verde, e o HAYATO é magenta).

**Órion (revisar):** o CLI lê só caminhos sob `arte-fonte/lutadores/<id>/folhas/` com `id` validado por `^[a-z0-9-]+$` e
recusa saída em `public/assets`; `--folha` aceita um nome de arquivo concatenado ao diretório da folha (não valida `..`;
é ferramenta de dev local, mas vale endurecer se um dia rodar em CI com entrada externa). Dependência nova: `sharp`
(binários nativos pré-compilados, só devDependency).

## PENDÊNCIAS

- Decisão do Atlas: aprovar ou não os valores de `ponta`/`ax` antes da F3; `lutadores.json` guarda as exceções.
- Rodar os demais lutadores (CENTELLA, CAMILLE, NILA, MIN-JI, WEI LONG, CAIO) quando as folhas estiverem aprovadas; o
  CAIO só tem `.jpg` com nomes soltos em `folhas/` (e a MIN-JI mistura `.jpg` com os `-fN-...-vN.png`): o `acharFolha` só
  vê o padrão `<id>-fN-*-vN.png`; o resto precisa ser renomeado ou apontado com `--folha`.
- Folha 5 (extras) e o marcador manual (`ferramentas/marcador/`, ainda vazio): fora desta entrega; o `rosto`/`ponta`
  automáticos cobrem o caso comum e o ajuste fino manual continua possível editando `atlas.json`.

## APRENDIZADO

1. **HAYATO f3 v1 tem 11 componentes, não 12:** o pé de apoio do `lk1` toca o cabelo do `clk` (fileira de baixo). Corte reto
   no "pescoço mais fino" falhou (cortou a perna no meio, a 34 px, e deixou o pé flutuando acima da cabeça do vizinho);
   **erosão + BFS** resolve e vale para qualquer direção. Regra: ao separar figuras coladas, não cortar com linha reta.
2. **"Ponto mais à direita" não é a ponta do golpe** numa base larga: o pé da frente empata com a mão (AMINU `sa1`, `sb2`;
   a cruz caía no chão ou "no ar" por média entre mão e pé). Corrigido com o modo `mao` (ignora 22% de baixo) e agrupando
   por linhas contíguas na média do y.
3. O fundo da Runway **não é a cor pedida** (253,40,246; verde 7,252,4) e deriva ~15 unidades na folha: medir o fundo.
4. Calibrar a escala em uma passada deixou o idle0 com 409 px (arredondamento + limiar de alfa diferentes entre medir e
   aparar): iterar até bater e gravar `alturaRef` = altura REAL do idle0 (contrato C1), não o alvo.
5. Teste que "prova" a borda cortada precisa de lixo **perto** da figura; a 28 px o mutante `borda: 0` sobreviveu.
6. Armadilhas de ferramenta: `python3 -` com heredoc quebrado no Bash trava a sessão esperando stdin (matar o processo);
   no Windows, `sharp.cache(false)` evita EPERM ao apagar a pasta temporária do teste.
7. **O `.gitignore` tinha `sprites/` sem ancora e engolia `ferramentas/sprites/`** (o codigo ficaria fora do commit sem aviso). Troquei por `/sprites/` (so a pasta da raiz). Conferir com `git check-ignore -v` ao criar pasta com nome que ja aparece no `.gitignore`.
