# Handoff Lyra: F3a (arte e cenários novos no jogo)

Data: 2026-10-21. Sem commit. Base: `docs/handoff-vega-f2-novos.md`, `docs/handoff-vega-e3-s3-s5.md`, `docs/handoff-vega-e5.md`,
`docs/handoff-apolo-cenarios.md`, `docs/handoff-lyra-e4.md`. Não toquei em `src/fight`, `src/data`, `src/meta`, `src/core`.

## RESULTADO

**Arte dos 5 lutadores** (`public/assets/lutadores/<id>/`): `atlas-N.webp` + `atlas.json` (C1 v2) + `retrato.png` + `retrato.json`, copiados de
`sprites-gerados/`. 9 manifestos e 9 retratos no boot; as imagens dos novos só vêm na luta (carga sob demanda), 2 páginas cada e 4 no BAATAR.
O loader já aceitava tudo (apelidos `idle3=idle1` e `idle2=idle0` viram um objeto de pose por nome, mesma página; `alturaRef` 525; várias
páginas): nenhuma linha de `src/assets` mudou, só ganhou teste.
- **Retratos regenerados** (`ferramentas/gerar-retratos.mjs`, corrigido): o do pipeline tinha recorte fracionário passando do PNG (0,5 px) e a
  ferramenta lia sempre a página 0, errada para AMINU/CENTELLA/BAATAR (idle0 na página 1: saía ombro, não rosto). Agora lê a página do
  quadro e a janela do BAATAR é 190 x (525/410) = 243 px (mesmo enquadramento dos outros). `atlas.json` público ficou com `retrato` igual
  ao `retrato.json`. `gerar-retratos --verificar`: 9 ok.

**Cenários** (`public/assets/cenarios/cenario-{jp,ng,mx,fr,in,mn}.webp`, 1920x1080, 138 a 234 KB; script `ferramentas/converter-cenarios.mjs`):
fontes jp-v1, **ng-v2, fr-v2** (as corrigidas pelo Apolo), mx-v1, in-v1, mn-v1. 2752x1536 não é 16:9 exato: cortei 21 px da largura
(centrado) em vez de esticar; a linha dos pés (84,5% da altura) não muda. O `jp.jpg` antigo saiu de `public/` (git D) e foi para
`tests/fixtures/jp-prototipo.jpg` (oráculo da fidelidade). Nomes batem com o que a Vega registrou em `data/cenarios.ts`.

**Render** (`src/render`, `src/ui/cenas/fight.ts`):
- `efeitos.ts`: `rebote` (poeira na parede), `parry` (14 faíscas + rajada branca + texto), `quebra-guarda` (12 faíscas vermelhas + rajada
  grande + texto), `carga` (pulso no corpo, cresce com o nível, nível 3 com estrela grande), `troca-ficha` (flash + fumaça; estrela verde
  para SARPA, dourada para GAJA), `hit.contraEspecial` (rajada dupla). `reagir(ev, onde?)` ganhou 2º parâmetro opcional com a posição do
  lutador (os eventos `carga` e `troca-ficha` não trazem x/y); `fight.ts` passa `(i) => game.fighters[i]`. Sem `onde` esses dois são ignorados.
- `lutador.ts`: `chDaFicha` com `Object.hasOwn` (o `it.fails` #5 de `chefe-adversarial.test.ts` virou `it`). **`pose.flip` -1 já era honrado**
  (`fl = facing * flip`, vale também no reflexo): só ganhou teste.
- HUD: `render/postura.ts` (novo) desenha a etiqueta GAJA (elefante, âmbar) ou SARPA (serpente, verde) entre o nome e as bolinhas de round,
  nos dois lados. Só aparece para quem tem a ficha `sarpa`; as fichas do chefão (`chefe`, `chefe2`) não são postura.
- `nila.ts` NÃO foi tocado: o atlas gerado não tem nenhum `sarpa*`, então a SARPA usa as poses da GAJA (ver Pendências).

**Fixture** (`src/ui/dev-expansao.ts`, `main.ts`): como a produção já tem os 9, a fixture dos 9 FALSOS foi aposentada. Sobraram duas regras, só em dev:
`?expansao=1` = os 9 reais todos liberados (BAATAR jogável e ainda chefão do ARCADE); `?expansao=4` = jogo de 4 (fidelidade com o protótipo e
ARCADE de 3 lutas). `registrarApelido` do gerenciador ficou sem uso em `src` (só teste, se houver); pode sair.

**Testes**: `tests/e2e/expansao.spec.ts` reescrito para o jogo real (ids reais: grade `[hayato, wei-long, min-ji / caio, baatar, aminu / centella,
camille, nila]`, ARCADE de 6 lutas reais ponta a ponta com o BAATAR e dois avisos de desbloqueio AMINU e BAATAR); `arte-sob-demanda.spec.ts`
(9 manifestos/retratos, vitrine de 4, `cenario-jp.webp`); `fidelidade-ui` e `jogo.spec` (ARCADE de 3) com `?expansao=4`; fidelidade usa
`tests/e2e/_jp-prototipo.ts` (roteia `cenario-jp.webp` para o jp antigo). `atlas.test.ts`: o jp deixou de ser exigido em `public/`.
Novos: `tests/unit/f3a-assets.test.ts` (arte real dos 5, apelidos, 4 páginas, retrato, cenários), `tests/unit/f3a-render.test.ts` (eventos, hasOwn,
flip, postura) e `tests/e2e/novos-lutadores.spec.ts` (15 testes no navegador).

## PORTÕES (rodados agora, um e2e por vez, servidor fixo sem HMR)

`tsc --noEmit` limpo · `npm test` 37 arquivos, 822 verdes · `npm run build` ok (173 kB JS; a fixture NÃO está no bundle) · `npm run test:e2e`
**89 passaram, 51 pularam** (testes só-desktop no projeto celular) · `npm run test:e2e:build` 5 de 5 (CSP).
Mutação: 7 mutantes no render (flip, hasOwn, rebote, contraEspecial, carga, postura 2x) todos mortos.

## PROVADO EM NAVEGADOR (Chromium, canvas 1920x1080) E NÃO PROVADO

Visto e medido: cada um dos 5 novos em luta (arquivo e golpes), cada um dos 6 cenários, a seleção de produção 3x3 (BAATAR "???" no centro, 5
cadeados, retratos reais) e a seleção `?expansao=1` (9 liberados), BAATAR chefão com "×2", Dança da Águia (poses `devekh`, barra nova cheia) e fase 2
(MERGULHO com `dive0/dive1`), NILA trocando para SARPA (etiqueta e fumaça). Medido por A/B de pixels (com e sem a arte do lutador): o corpo tem
dezenas de milhares de pixels, está sobre o x lógico dele e **a base do corpo cai na linha do chão (470 lógico = 940 px) com tolerância de 14 px
nos 5**; cada página/cenário é baixado 1 vez e nada além da vitrine baixa no boot.
Capturas em `arte-fonte/capturas/`: `lutador-<id>-1-guarda.png` (5), `lutador-baatar-0/1/2` (2 barras, Dança, fase 2), `lutador-nila-2-sarpa.png`,
`cenario-{jp,ng,mx,fr,in,mn}.png`, `selecao-producao-5-travados.png`, `selecao-expansao-9-liberados.png` e `golpes/` (42: lp, hp, hk e os 3 especiais de
cada um, mais SARPA). Eu olhei cada tipo; não olhei os 42 quadros de golpe um a um.

**NÃO visto/provado:** os efeitos `parry`, `rebote`, `quebra-guarda`, `carga` e `contraEspecial` estão testados em unidade (contagens e cores), mas
**não vi nenhum em quadro de navegador** (só `troca-ficha`). Toque real em celular e a legibilidade do selo/etiqueta no celular: não medi (só 1280x720).
Nenhum aparelho real. A lógica do alcance dos golpes novos não foi avaliada (é E6/Vega).

## PARA O PRÓXIMO

**Íris (testar na interface):**
1. Seleção de produção: 3x3, BAATAR no centro "???", 4 liberados; cursor passa por cima dos travados e Enter nega; depois de zerar o ARCADE, AMINU
   entra com NOVO!; `?expansao=1` abre tudo.
2. Luta contra cada novo: cenário da casa dele (ng, mx, fr, in, mn), pés no chão, nada de lutador cortado nas bordas; BAATAR 1,28x maior.
3. Chefão: "CHEFÃO" no HUD, "×2" e depois "×1", flash e "FASE 2!" na troca, Dança parada, fase 2 com mergulho.
4. NILA: ↓+ESP troca de postura, etiqueta GAJA/SARPA muda, fumaça, volta a GAJA no round seguinte.
5. Atacar: carga da AMINU (nível 1 a 3, efeito só com a posição), PARADE da CAMILLE (efeito "PARADA!"), RESORTE da CENTELLA (poeira na parede e corrida de costas espelhada).
6. Celular deitado: etiqueta de postura legível sobre o HUD (fonte 14).

**Vega:**
- `jpunch` dos 4 novos mostra a pose do `jkick` (ponte tua): o BAATAR tem o próprio. Em quadro: a CENTELLA no RESORTE ida usa `sc0`.
- Achado: BAATAR `walk0..7` e `win` medem +2 a +5% do idle (aviso da F2); em luta não vi pulo de tamanho perceptível, não mexi.
- Se a folha 5 da NILA chegar, os nomes `sarpa*` de `nila.ts` precisam conferir com o pipeline (só `poseDaFicha`).

**Atlas:** commitar `tests/fixtures/jp-prototipo.jpg` junto (o fidelidade depende dele) e decidir se `registrarApelido` sai.

## PENDÊNCIAS

- SARPA da NILA sem arte: usa poses da GAJA (folha 5 ainda não foi gerada/processada; há `docs/handoff-apolo-nila-f5.md` de outra frente).
- 51 testes pulados são do projeto "celular" (só-desktop por desenho), não regressão.
- Peso: `public/assets/lutadores` 13 MB (4 atlas antigos + 5 novos, ~1,2 MB cada novo; BAATAR 2,1 MB). Nada é baixado no boot além da vitrine.

## APRENDIZADO

1. `pkill -f` não mata o vite no Windows (Git Bash): o servidor "fixo" antigo continuou servindo `main.ts` velho e fez 3 testes falharem por
   motivo falso. Matar por `Stop-Process` via `Get-CimInstance Win32_Process` filtrando a linha de comando, e conferir que o código servido mudou
   (`curl /src/main.ts | grep ...`) antes de rodar a suíte. Com `watch:null`, toda edição de `src/` exige reiniciar.
2. Ferramenta que lê "a imagem do atlas" tem de ler a PÁGINA do quadro (C1 v2): `imagens[0]` fixo recortava o ombro do BAATAR e de dois outros.
3. Teste de fidelidade com protótipo exige ambiente do protótipo: fundo do jp antigo por `page.route` e elenco de 4 por `?expansao=4`; mudar a produção sem isso
   derruba as 40 telas de uma vez, e o sintoma (1,6 M de pixels) esconde o que de fato mudou.
4. Harness que força vida do chefão (`hp = 1`) tem de parar quando a barra trocar: a barra nova nasce cheia, e rebaixar de novo pareceu "bug do HUD" (barra vazia
   com `×1`). Antes de culpar o render, imprimir `hp/maxHp/barras`.
5. Medir "pés no chão" por A/B de pixels (render com e sem a imagem do lutador, bounding box do que mudou) é mais barato e honesto que olhar a captura.
