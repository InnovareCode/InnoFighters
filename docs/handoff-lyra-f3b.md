# Handoff Lyra: F3b (arte nova de HAYATO, MIN-JI e SARPA no jogo; e2e estabilizados)

Data: 2026-10-21. Sem commit. Base: `docs/handoff-vega-hayato-min-ji.md`, `docs/handoff-vega-nila-f5.md`, `docs/handoff-lyra-f3a.md`.
Não toquei em `src/`, `src/data`, `src/meta`, `ferramentas/sprites`. Só `tests/e2e` e `arte-fonte/capturas`.

## RESULTADO

- **Oráculo de fidelidade com o atlas ORIGINAL** (`tests/e2e/_jp-prototipo.ts`): `usarOriginaisDoPrototipo` roteia `**/assets/lutadores/{hayato,min-ji}/*` para
  `tests/fixtures/atlas-prototipo/<id>/{atlas.json (v1), atlas.webp, retrato.json, retrato.png}`; arquivo que não está na fixture (ex.: `atlas-0.webp`) responde 404 de propósito
  (nunca cai no de produção). `usarArteDoPrototipo` = jp antigo + os dois originais. `fidelidade-prototipo.spec.ts` (cenas e o teste `desenharPose`) e `fidelidade-ui.spec.ts` usam ela.
  O teste `desenharPose` (4 lutadores x 12 poses) também precisou: sem a rota ele falhou na 1ª rodada (provou que a rota é o que segura o oráculo).
- **`arte-sob-demanda.spec.ts`:** `atlasDe` agora conta v1 (`atlas.webp`) e v2 (`atlas-N.webp`); novos `atlasV1De` e `paginasDe`. Boot: v1 só CAIO e WEI LONG; HAYATO e MIN-JI com
  `atlas-0/1.webp` uma vez cada; nenhuma página dos 5 novos. Teste de luta HAYATO x WEI LONG: HAYATO 2 páginas, `atlasV1De` = só `wei-long` (o `toHaveLength(2)` de antes).
- **`novos-lutadores.spec.ts`:** NILA `paginas: 3`. O loader (`src/assets`) não supõe 48/54 (grep, nenhum literal): nada a mudar; o teste novo prova 60 quadros / 3 páginas / 12 `sarpa*`.
- **Spec novo `tests/e2e/arte-f3b.spec.ts`** (6 testes, só desktop), no jogo REAL (sem fixtures do protótipo):
  1. HAYATO x MIN-JI: 2 páginas cada (uma vez), 48 quadros, alturaRef 410; pés na linha (A/B de pixels, tolerância 14 px do canvas, como na F3a); 8 golpes de cada um
     (lp, hp, lk, hk, clp, sFire, sDown, sFwd) no 1º tick ativo: o quadro pedido existe no atlas e o corpo foi desenhado. Tem **controle negativo**: desloca o recorte da pose 30 px e exige
     que o A/B ACUSE o pé fora da linha.
  2. HAYATO não lembra o Ryu (cores do corpo): grafite 55% (atlas original 11%), claro/creme 4% (original 30%), verde da faixa 645 px (original 238). Mutante (servir o atlas original) derruba o teste.
  3. e 4. NILA, um teste por postura (GAJA, SARPA; ~25 s cada): idle (laço), andar (seta de verdade), defesa em pé e agachada (o HAYATO ataca e a NILA segura "trás"), `sFire` e `sFwd`.
     Confere o QUADRO DO ATLAS desenhado (compara o recorte de `getPD` com o manifesto): SARPA idle = `sarpaIdle*`, andar = `sarpaWalk0`, defesa = `sarpaBlock`, BOTE = `sarpaSlide0` (preparo) e `sarpaSlide1`
     (deslize), salto = `sarpaLeap0` e `sarpaLeap2`; GAJA nunca desenha `sarpa*`. Base na linha nos quadros de solo.
  5. e 6. Retratos: 9 `retrato.png` baixados; recorte do retrato novo de HAYATO, MIN-JI e NILA cabe na imagem; capturas da seleção (9 liberados e produção).
- **`expansao.spec.ts` (ARCADE completo, teclado real):** passou a fotografar o BAATAR da ARCADE de verdade (fase 1, Dança, fase 2) quando `SALVAR_QUADROS` está ligado.
- **Capturas novas** em `arte-fonte/capturas/`: `f3b-hayato-x-min-ji-luta`, `f3b-nila-{gaja,sarpa}-{1-idle,2-andar,3-defesa}`, `f3b-selecao-9-liberados`, `f3b-selecao-producao`,
  `arcade-baatar-fase-1`, `arcade-baatar-fase-2` e `golpes/f3b-*` (45: HAYATO e MIN-JI x 8 golpes; NILA/SARPA especiais em série de tempo, inclusive BOTE e salto).

## PORTÕES (rodados agora, um de cada vez; servidor vite fixo sem HMR, `curl /src/main.ts` conferido)

`npm run typecheck` ok · `npm test` 37 arquivos / 833 verdes · `npm run build` ok (173 kB JS) · `npm run test:e2e` **95 passaram, 57 puladas** (projeto celular só-desktop) ·
`npm run test:e2e:build` 5 de 5. Mutações: sem a rota do atlas original o `desenharPose` cai; deslocar o recorte da pose faz o A/B acusar; servir o atlas original ao teste de cores o derruba.
Flake visto uma vez: `jogo.spec` "ARCADE: vence as 3 lutas" estourou numa rodada completa (passou isolada e nas 2 rodadas seguintes). Parece CPU: dividi o teste da NILA (50 s) em dois (GAJA/SARPA) para
não disputar com os testes de jogo real. Não tenho a mensagem do erro da rodada que falhou.

## PROVADO EM NAVEGADOR (Chromium 1920x1080) E NÃO PROVADO

Visto e medido: HAYATO em luta (gi cinza-grafite, faixa verde, mecha de raio amarela no cabelo e raio no peito: **não lembra o Ryu**) contra a MIN-JI; golpes de solo de cada um;
retratos na seleção (os 9); NILA GAJA e SARPA em idle, andar, defesa; BOTE (`sarpaSlide0` -> `sarpaSlide1` rente ao chão) e salto (`sarpaLeap0` -> `sarpaLeap2`) com captura; ARCADE completa
(6 lutas) com a MIN-JI e o BAATAR na fase 2 (barra `x1`). Pés: A/B de pixels, base a 0 a 4 px da linha do chão em todos os quadros de solo (tolerância 14).
**Olhei** a guarda, 3 golpes de solo, o BOTE, o salto, a defesa da SARPA e a seleção; **não olhei um a um** os 45 quadros de golpe.
**NÃO visto:** celular real (só Chromium 1280x720 e o projeto "celular" emulado, que pula estes testes), alcance/caixa dos golpes em luta contra a CPU, andar da SARPA "em movimento" (só quadros
parados; a alternância de 2 quadros a cada passada não foi avaliada em vídeo), efeitos `parry`/`rebote`/`quebra-guarda`/`carga`.

## DEFEITOS DE DADOS/ARTE ENCONTRADOS (não mexi)

1. **SARPA salto (`sFwd`):** o voo sobe até ~y=110 (lógico ~55), por cima do HUD (barra, "infinito" e painel do treino) durante ~12 ticks; o corpo cobre o relógio. `vy -19` vem de `nila.ts`
   (dados, Vega); o sprite `sarpaLeap2` não é o responsável. Se o dono quiser, é o `vy` ou o teto da câmera.
2. **SARPA em idle/andar tem a hurtbox de pé da GAJA (79% da altura do sprite)** (já dito pela Vega): em `f3b-nila-sarpa-1-idle.png` a pose é baixa e projéteis passam por cima da cabeça visual.
3. **MIN-JI `sFire` (BULKKOT):** o projétil nasce na ponta do pé do chute alto (`f3b-min-ji-sFire-sa1.png`, flash rosa na altura do rosto do HAYATO): coerente com o que a Vega previu (`spawn` em 221 px), a conferir pelo dono.
4. O A/B de pixels tinha falso positivo na DEFESA: o tremor de tela (`game.shake`) sorteia um deslocamento por desenho e fez a "base" cair em y=1079 (a borda). Corrigido no teste (zera `game.shake` e
   descarta pixels que mudam sozinhos entre dois desenhos).

## PARA O PRÓXIMO

**Íris:** olhar em jogo (e não só pela captura) o andar da SARPA (2 quadros alternados), o BOTE, o salto sobre o HUD (item 1) e o `clp` do HAYATO; conferir o alcance dos golpes de solo de HAYATO e MIN-JI
(a Vega mediu encolhimento de 6 a 15%). `arte-f3b.spec.ts` é o lugar para estender.
**Atlas:** commitar `tests/e2e/arte-f3b.spec.ts`, `tests/e2e/_jp-prototipo.ts` e `tests/fixtures/atlas-prototipo/` (o oráculo depende dele). As capturas ficam em `arte-fonte/` (fora do git); as novas pesam ~190 MB (PNG 1920x1080, ~3,4 MB cada), a pasta toda 387 MB.
**Vega:** item 1 (vy do salto) e 2 (hurtbox da SARPA), se o dono achar que incomoda.

## APRENDIZADO

1. Troca de arte de lutador do protótipo tem 3 caminhos de quebra (dados, luta lock-step, pixel); o pixel exige rotear o atlas original por `page.route` em TODA página que compare (inclusive a de
   `desenharPose`, que só chama `goto('/')`).
2. A/B de pixels (com/sem a imagem do lutador) precisa zerar `game.shake` e mascarar o que muda entre dois desenhos do mesmo estado; em defesa o tremor dava base na borda da tela (1079) e a tolerância
   de pés só passou porque eu não a aplicava à defesa. Sempre incluir um controle negativo (deslocar o recorte) para provar que a medida acusa.
3. Teste de jogo real com 4 workers é sensível a CPU: teste longo (50 s) ao lado deles causou um flake; dividir em testes de ~25 s.
4. Conferir qual quadro do atlas foi desenhado comparando o recorte de `getPD(chDaFicha(ch, ficha), pose)` com `manifesto.quadros` é mais forte do que olhar a captura (prova que a SARPA usa `sarpa*`).
