# Handoff Lyra: seleção (casa aleatória, etiqueta do jogador, tipografia)

Data: 2026-10-21. Missão `cmvihmkkw008k01p7iksd6q90`. Base: HEAD `0db7120`, sem commit (working tree).
Três pedidos do dono sobre a tela de seleção. Motor, lock-step e snapshot intactos (nada em `src/fight`, `src/core`, `src/data`, `src/meta`).

## 1. Casa ALEATÓRIA ("RANDOM")

**O que é.** Um quadradinho de 44x44 na faixa de baixo da grade de 10, à esquerda da casa de honra (que encolheu de 256x44 para 204x44; vão de 8 px).
Em repouso os rostos de todos os lutadores LIBERADOS passam (um a cada 12 ticks, numa ordem embaralhada ao abrir a tela) sob um véu e um "?" dourado.
Confirmar nela (Enter/Z/C/botão A, clique, toque) **sorteia na hora** e a roleta gira por 43 ticks (10 rostos, cada vez mais devagar, o último é o sorteado),
o cursor vai para a casa do sorteado (rosto, painel, lutador e brilho dele, som de seleção), o escolhido fica à mostra por 30 ticks e só então a escolha vale
(P1, P2, versus, CPU, treino, ARCADE: o mesmo fluxo de qualquer confirmação). Enquanto sorteia: o lado do jogador mostra um "?" grande e o painel diz ALEATÓRIO;
setas/Enter/mouse do jogador ficam travados; X/Esc/K cancela só o sorteio (não sai da tela). No versus cada jogador sorteia o seu, independentes.

**Regras do dono.**
- Fora do RNG da luta: usa um `Rng` próprio `Contexto.sorteioDaSelecao` (semente + 4, criado em `main.ts`); sem ele (contexto antigo de teste) cai no `rngUI`. Nunca toca `rngLogica` nem `rngVisual`.
  Provado: unit (`rngVisual.estado()` e `rngUI.estado()` iguais antes/depois) e e2e (o `game.rng` da luta e a luta tick a tick são idênticos entre "sortear" e "escolher direto o mesmo lutador").
- Só liberados: `elegiveis()` = casas que `podeEscolher`. O ZENON só entra depois de derrotado (a lista da roleta também é só de liberados: nunca vaza um travado). Provado em unit e e2e (500 sorteios com progresso inicial: só os 4 de fábrica).
- Movimento reduzido (`prefers-reduced-motion`, `Contexto.reduzirMovimento`, lido uma vez de `matchMedia`): a casa vira um "?" fixo sem rosto, o sorteio pousa no ato (sem roleta) e mostra os 30 ticks. Provado no navegador com `reducedMotion: 'reduce'` (pixels da casa idênticos em 12 instantes; sem a preferência, >= 5 aparências diferentes).
- Só existe na grade de 10 (a de produção). As de 4 e 9 casas (fixtures `?expansao=4`, fidelidade com o protótipo) ficam como sempre: por isso o oráculo de fidelidade das telas continua válido.

**Navegação (11 casas).** Faixa de baixo = [aleatória (índice 10)] [honra (índice 9)].
- ↓ da 3ª linha: coluna 1 vai à aleatória, colunas 2 e 3 à honra. ↑ da 1ª linha, o mesmo (a volta).
- ↑ da aleatória vai à casa 6; ↑ da honra à 7 (como antes). ↓ da aleatória vai à 0; ↓ da honra à 1 (como antes).
- ← e → na faixa de baixo alternam aleatória/honra (antes, ← e → na honra não faziam nada).
- Unit prova que o cursor alcança as 11 casas de qualquer ponto (sem beco) e que ←→ sempre desfazem.
- Gamepad: usa as mesmas teclas lógicas (`gamepad.ts` -> `aoTecla` -> `cena.key`); provado com um controle falso real (↓↓↓, →, ←, A).
- Mouse/toque: área de toque da aleatória 52x56 lógicos (44 + 4 de folga em cada lado e 4 em cima / 8 embaixo): **40x43 px CSS** no celular 915x412 (o quadradinho desenhado tem 34x34). O vão de 400 a 404 não é de nenhuma casa. Provado com toque real (`touchscreen.tap`).

Arquivos: `src/ui/aleatoria.ts` (lógica pura), `src/ui/grade.ts` (`CASA_ALEATORIA`, `temCasaAleatoria`, `indiceDaAleatoria`, navegação e toque), `src/ui/cenas/select.ts` (estado `rolando`, `iniciarSorteio/pousar/escolher`, `casaAleatoria()`), `src/ui/contexto.ts`, `src/main.ts`.

## 2. A etiqueta "VOCÊ" (e ALVO, ADVERSÁRIO, JOGADOR 1/2)

**Onde estava.** `select.ts` (`lado()`): `f.A(tag, px + 142, 72, 22, ...)`, centrada no painel e no alto da tela. Não há "VOCÊ" na luta nem no HUD (grep). Em y 72 ela cobria o rosto de todo mundo.

**Medido no navegador** (A/B de pixels: quadro com e sem o texto da etiqueta, contra o lutador desenhado sozinho em `guard` e `special`, 5 instantes da respiração; `tests/e2e/selecao-aleatoria.spec.ts`).
Topo do lutador (y lógico) e pixels da etiqueta sobre ele, antes -> agora:

| lutador | topo | antes | agora |
|---|---|---|---|
| hayato | 57,5 | 2518 | 0 |
| wei-long | 36,5 | 3189 | 0 |
| min-ji | 66,5 | 640 | 0 |
| caio | 51,5 | 3123 | 0 |
| aminu | 39 | 3333 | 0 |
| centella | 72,5 | 163 | 0 |
| camille | 48,5 | 3101 | 0 |
| nila | 63,5 | 2444 | 0 |
| baatar (1,28) | 27 | 3213 | 0 |
| zenon (1,32) | 27 | 3336 | 0 |

Não há faixa livre ACIMA da cabeça: o topo mais alto (BAATAR/ZENON) é y 27 e o título da tela ocupa y 23 a 61. Por isso a etiqueta foi para **o painel do lutador, alinhada à direita da linha do nome (y 394)**, logo abaixo dos pés (os pés vão até y 361, o painel começa em 374). Fica dentro do painel, nunca sobre um lutador, e mora ao lado do nome (leitura natural: "ZENON ... VOCÊ").
Tamanho 20 (era 22). Caixa medida: x 252 a 293, y 380 a 402. Versus (JOGADOR 1/2), etapa do rival (ADVERSÁRIO) e treino (ALVO) medidos com ZENON x BAATAR nas duas pontas: 0 pixel sobre o lutador.
Celular 915x412 (canvas 732x412): etiqueta 61x14 px CSS (JOGADOR 1) e 63x14 (JOGADOR 2), sem encostar em nenhuma tecla de toque nem no joystick (medido por `getBoundingClientRect`).
Controle negativo: com a etiqueta no lugar antigo a mesma medida acusa cobertura em 10 de 10.

## 3. Tipografia

**Todas as fontes achadas.** Canvas: só `FH`/`FB` em `src/render/texto.ts` (todo texto de cena, HUD, cinemática, menus passa por elas), mais o logo (`ui/logo.ts`, `italic 900 ... Impact`).
CSS: `src/input/toque.css` (`sans-serif` nos botões e no aviso "vire o aparelho"), `src/platform/aviso.css` (`sans-serif`). `index.html`: só o `<pre id="err">` de depuração (monospace, mantido).
O que destoava: o corpo (`bold Segoe UI`, só existe no Windows; no Android/Mac caía em outra) ao lado do título em Impact.

**Escolha.** Barlow Condensed ExtraBold Itálico (títulos, nomes, números; mesma pegada condensada e inclinada do arcade de luta, com itálico de verdade) + Barlow SemiBold (corpo; sans legível em minúsculas, mesma família, então combina). OFL 1.1, de Jeremy Tribby.
Arquivos em `public/assets/fontes/`: `barlow-condensed-800-italic-latin.woff2` (23,8 KB), `barlow-600-latin.woff2` (22,8 KB), `OFL-barlow.txt`, `OFL-barlow-condensed.txt`, `LEIA-ME.txt` (origem: pacotes `@fontsource/*` 5.3.0, subset latino já em woff2). Total ~46 KB de fonte.
Português completo (provado no navegador: cada letra acentuada tem glifo na PRÓPRIA fonte, trocar a reserva não muda a largura). As setas ↑ ↓ vêm da Barlow; ← → e os símbolos △ ○ □ ✕ do toque vêm do sistema (como antes).

**Como entra (sem piscar, sem terceiros).**
- `src/fontes.css` (`@font-face`, `font-display: block`), importado em `main.ts`; caminhos `/assets/fontes/...` (o Vite aplica o `base`).
- `index.html`: `<link rel="preload" as="font" crossorigin>` das duas.
- `src/platform/fontes.ts`: `carregarFontes()` chama `document.fonts.load` das duas faces (com amostra de acentos) ANTES de criar o navegador de cenas e a cena `boot`, com teto de 4 s (sem a fonte o jogo abre com a reserva, nunca fica preso). Marca `<html data-fontes="ok|reserva">`.
- CSP: `font-src 'self'` explícita em `POLITICA_CSP` (`vite.config.ts`) e fixada no `csp.spec`. Zero pedido para fora (medido: nenhum request fora de 127.0.0.1) e zero violação no build.
- Medido: o 1º `fillText` do jogo já usa Barlow (nenhum texto na reserva); a única exceção é o logo.

**Efeito visual.** O texto de corpo ficou menor em largura que o Segoe UI Bold: no "Como jogar" a frase do controle que antes estourava a borda direita (cortada em "2 jogador") agora cabe inteira. O título em Barlow Condensed tem altura de letra ~10% menor que o Impact (cap-height 0,70 em vez de 0,79): lê-se como arcade condensado, porém menos "pesado". Se o dono quiser mais peso, o caminho é subir `800` para `900` (mais um woff2 de ~24 KB) ou aumentar os tamanhos dos títulos.

## Baselines de fidelidade (conscientes, sem `-u`)

Não há PNG de baseline guardado: `fidelidade-ui.spec.ts` e `fidelidade-prototipo.spec.ts` geram o oráculo na hora, rodando o protótipo original. O que mudou foi o ORÁCULO:
`_jp-prototipo.ts` ganhou `urlDoPrototipoComFontesDoJogo()` (cópia do protótipo em `test-results/prototipo-fontes/`, gerada de forma atômica) com SÓ três trocas: as linhas `FH` e `FB` pelas strings novas (escritas por extenso, não importadas) e a linha da etiqueta no lugar novo; mais `aguardarFontesNoPrototipo()`. Todo o resto continua sendo o protótipo original, pixel a pixel.
- `fidelidade-ui` (todos os casos de cena num teste só): TODOS os casos com texto têm referência nova por causa da fonte; os 5 casos **"seleção versus", "seleção versus: P1 travado, flash", "seleção arcade (painel de rivais)", "seleção cpu etapa 2", "seleção treino"** mudam também pela etiqueta (mutação provou: com a etiqueta no lugar antigo os 5 reprovam, 6 a 23 mil px).
- `fidelidade-prototipo` (render/HUD de luta): mesma cópia do protótipo, mesmos passos.
- Resultado final: 0 px de diferença em todos os casos. `logo.spec.ts` não mudou (o logo segue em Impact).

Outros testes ajustados por decisão do projeto (não são baseline): `z2-grade-honra.test.ts` (honra 204x44, aleatória, navegação de 11 casas), `zenon-z2z3.spec.ts` e `expansao.spec.ts` (retângulo da honra), `z4-nome-de-especial.test.ts` (string `600 13px Barlow`), `plataforma-render-assets.spec.ts` (o degradê do `textoArcade` agora é medido por faixa topo x base, não por "branco puro": o degradê é sobre a caixa do EM e a Barlow tem letra mais baixa), `csp.spec.ts` (`font-src`, woff2 200 e `data-fontes=ok`).

## Verificação (rodada final)

- `tsc --noEmit`: limpo. `vitest run`: 69 arquivos, **1512 testes** passando (snapshot do motor sem `-u`).
- `npm run build`: ok (fontes copiadas para `dist/assets/fontes`, JS 254,9 KB). `npm run test:e2e:build`: 5/5 (CSP com fontes, zero violação).
- `npx playwright test`: **164 passaram, 0 falharam**, 126 pulados por desenho (testes de um perfil só).
- Testes novos: `tests/unit/aleatoria.test.ts` (19), `tests/unit/fontes.test.ts` (10), `tests/e2e/selecao-aleatoria.spec.ts`, `tests/e2e/tipografia.spec.ts`.
- Mutação (12 mutantes na lógica da casa aleatória: filtro de liberados, `Math.random`, rngUI, pouso, revelação, movimento reduzido, fim da roleta, trava de cursor, cancelar, navegação, toque, rosto em repouso): 12 mortos. Mutante visual (etiqueta no lugar antigo): mortos o e2e da etiqueta e a fidelidade.

Capturas (só `SALVAR_CAPTURAS`/scripts, em `arte-fonte/capturas`, fora do git): `selecao-antes-*` e `selecao-depois-*` (desktop arcade, versus, cpu etapa 2, `voce-<id>` dos 10, versus ZENON x BAATAR, celular 915x412), `selecao-aleatoria-*` (repouso, girando, revelado, movimento reduzido, faixa de baixo, desktop e celular), `selecao-etiqueta-celular`, `texto-antes-*` e `texto-depois-*` (menu, como jogar, opções, dificuldade, título, luta, pausa). As "antes" foram tiradas do HEAD num servidor à parte (porta 5174).

## Para o dono decidir

1. **Logo da marca** (`ui/logo.ts`) segue em `Impact` (identidade D1 já aprovada; o `logo.spec` mede pixels por palavra). Em Android/Linux o Impact não existe e o logo cai em outra fonte. Trocar para Barlow Condensed Black Itálico (mais um woff2 de ~24 KB) uniformiza, mas muda o desenho do logo: é decisão sua.
2. Peso dos títulos (ver "Efeito visual").
3. Os nomes de especial dos 4 originais seguem a 13 px "sem medir" (fidelidade com o protótipo); `KAMINARI-STEP` e `TIE SHAN KAO` ainda encostam na borda direita do painel do lutador (já era assim).
4. Acessibilidade do canvas: não há anúncio do sorteado para leitor de tela (o jogo todo é canvas, só o `aria-label` do canvas existe). Se quiser, um `aria-live` com "Sorteado: ZENON" é barato.

## Armadilhas (para a próxima vez)

- `font-display: block` e o canvas: sem `document.fonts.load` antes do 1º quadro o texto sai na reserva e troca. O teste que olha o `font` do 1º `fillText` guarda isto.
- `h.avancar` no modo manual NÃO desenha: o atlas de um lutador só é pedido por `desenhar()`; capturas de lutador novo precisam desenhar uma vez e esperar `arte.atlas.get(id).pronta` (a captura "sem o ZENON" foi isso, não bug).
- Teste que mede o degradê do `textoArcade` por "branco puro" depende da altura da letra da fonte; meça por faixa.
- Em tela de toque, `tap` = clique = CONFIRMA: o teste de "vão sem casa" tem de olhar `rolando`, não o cursor.
- Bash: crase dentro de `node -e "..."` e apóstrofo em heredoc quebram o parse (de novo); scripts de edição vão por Write.
