# Handoff da Lyra: L1 + E1, chefões progressivos e entradas por roteiro (2026-10-21)

Missão `cmvipyxke00ru01p7h6g2asyc`. Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §1.4 a §2 e §8. Contratos: `docs/handoff-cronos-chefes.md`, `docs/handoff-vega-chefoes.md`. Textos: `docs/textos-chefoes.md`.
Nada commitado. Não toquei em `src/fight`, `src/audio`, `src/data/sons` nem nas ligações de música/som por lutador (S4).

## RESULTADO

### L1: a UI segue o chefão da vez
- `REGRAS_PADRAO.chefesDaFila = true` (`src/meta/regras.ts`). Com o save vazio o chefão do ARCADE é o AMINU; o ZENON só com os 5 liberados.
- `fim.ts`: `aplicarVitoriaArcade(persist.prog, { chefe: <id da etapa gravada no começo do ARCADE> ?? null }, regras)`. `{ chefe: null }` (jogando de ZENON com tudo liberado, escada de 5) só conta a zerada. A revanche do ZENON (`novos = []`) não abre cartão: o ENTER vai ao título.
- `chefe.ts` (aviso): lê `APRESENTACAO[c2].aviso` e `avisoRodape` (o rodapé fixo virou dado). ZENON já derrotado (`derrotouOChefe`) = aviso e rodapé de REVANCHE.
- `vs.ts`: rótulo vindo do dado ("ARCADE — O GUARDIÃO", "ARCADE — A GUARDIÃ" para CENTELLA/CAMILLE/NILA, "ARCADE — O ANFITRIÃO"; sem dado, `ehChefeFinal`). **Luta de chefe não mostra mais "Vença N rounds"** (confirmado no navegador).
- `desbloqueio.ts`: guardião = "<NOME> SE JUNTA A VOCÊ!" (cai em "SELO ENTREGUE!" se medir mais que 880 px) + epílogo `quem / porque / convite` no lugar da descrição; ZENON = "O ANFITRIÃO SE RENDE" + epílogo. Sem `chefesDaFila` (rollback, `?expansao=`) o cartão é o de sempre.
- `select.ts`: o PRÓXIMO guardião diz "Guarda o próximo selo do torneio. / Vença no fim do ARCADE para liberar."; os outros "Guarda um dos Cinco Selos. / A vez dessa luta ainda não chegou."; o ZENON "Só recebe quem traz os Cinco Selos. / Derrote-o para liberar." (os dois pontos, lateral e central, incluindo o antigo `select.ts:617`). Nome sempre "???", nenhuma linha com nome nem gênero. As linhas do painel lateral quebram se passarem de 256 px.
- `escada-texto.ts`: `rivaisDaEscada` desconta 2 com `chefesDaFila` (10 lutadores = 7 candidatos; a escada continua com 5).
- `hud.ts`: o título do HUD vem de `tituloHud` (D-A5: "A FAÍSCA", "A RIPOSTE", "O AVARGA"... nenhum passa de 16).

### E1: entrada por roteiro, em dados
- `src/render/roteiros-de-entrada.ts` (novo): `BatidaDeEntrada { em, pose, zoom?, dx? }`, `RoteiroDeEntrada { cartao, batidas, efeito, som?, naCorDoLutador? }`, os 5 roteiros e `BATIDAS_DO_ZENON`. Só poses que existem nos atlas (testado contra o `atlas.json` real). `zoom` e `dx` são quadros-chave com passo suave; a CURTA e o pulo ficam na ÚLTIMA batida.
- `src/render/entrada-chefe.ts`: `linhaDaEntrada(modo, tick, pulouEm, roteiro?)` (4º parâmetro opcional, padrão = o ZENON) e `QuadroDaEntrada.pose` = índice da batida (ZENON 0/96/144 = o 0/1/2 de sempre). Novos: `zoom`, `dx`, `efeito` (0 a 1) no quadro; braseiros e seus 6 tons só para o roteiro `braseiros-gr`; `paletaDoCartao(accent)` (cartão do guardião na cor dele, ZENON na paleta do Arconte); som `'assinatura'`. Constantes e duração intactas: 270 completa / 60 curta, pular depois do tick 10, saída em <= 6.
- `src/render/efeitos-de-entrada.ts` (novo): vapor (AMINU), holofotes + 12 confetes (CENTELLA), neblina + feixe de farol (CAMILLE), luar + 6 lamparinas (NILA), vento (BAATAR). Tela, <= 14 primitivas (pior caso 10, contado por teste), sem `shadowBlur`/`filter`/`getImageData`, hash `az`, sem `rngVisual`.
- `src/render/textos-dos-chefoes.ts` (novo): **transcrito por script do JSON do §9, deep-equal conferido** (`TS igual ao JSON do md: true`). A fonte agora é o .ts; o topo de `docs/textos-chefoes.md` ganhou a nota.
- `apresentacao-lutadores.ts`: `Apresentacao` ganhou `roteiro`, `avisoRodape`, `avisoRevanche`, `avisoRodapeRevanche`, `tituloHud`, `vs`, `desbloqueioTitulo`, `epilogo`; AMINU/CENTELLA/CAMILLE/NILA entram como entradas novas e o BAATAR ganha os dados de guardião sem perder os de jogável. `roteiroDe(id)`.
- `fight.ts`: usa `roteiroDe`, zoom e deslocamento da entrada no `desenharMundo`, o alvo na tela (`paraATela`) para holofotes/luar, a pose pelo índice da batida e a assinatura sonora pelo gancho `aoSom` que já existia na entrada.
- Fala de derrota: `falaDoChefe` já era genérica, só ganhou dados. Provocação continua desligada no pré-round do chefão, como já estava.
- **`rampaDaFase2`** (`aura-chefe.ts`): sem `fichaFase2` (os 5 guardiões, a NILA troca de ficha sozinha), a fase 2 é a barra (`barras < barrasMax`) e a rampa vale 1 desde a troca, inclusive na cena. O ZENON segue pela ficha.
- **Véu de fase 2** (spec §1.7, não estava na sua lista, está no intervalo §1.4-§2): `src/render/veu-de-fase2.ts`, 2 fillRect (escurece 25% e tinge 16% com o `accent`), só em arena sem sobreposição própria (a `gr` tem a dela). Ligado em `mundo.ts`.

### Testes
- **Os 7 antigos reescritos** (premissa "ZENON no fim com save vazio"): `e4-ui` x3, `e5-elenco` x2, `progresso.test`, `z6` caso 5; o guarda do Cronos `REGRAS_PADRAO` (`p1`) agora afirma `true`. O 2º "guarda" citado pelo Cronos (M20) é uma mutação textual dele, não existe como teste: não achei outro teste fixando `false`. Onde a regra antiga tinha valor, ficou com `chefesDaFila: false` explícito (rollback).
- **Premissas que a generalização invalidou (3 asserções fora do seu pedido, avisando):** `z3` linha 259 (`APRESENTACAO.baatar.falas` indefinido: o BAATAR é guardião e tem falas), `z3` "só o chefão com `entradaDramatica` faz a entrada" (incluía `['baatar', true]`, que agora faz entrada; troquei por `['caio', true]`, chefe sem roteiro) e `z2`/`f3a-render` (o HUD do BAATAR é "CHEFÃO · O AVARGA", não mais "CHEFÃO"). Nenhum snapshot regravado (**sem `-u`**); `z3-entrada-chefe` e `z2-render-chefao` verdes.
- Novos: `tests/unit/l1e1-chefoes.test.ts` (47 testes), `tests/e2e/chefoes-l1e1.spec.ts` (15 execuções, desktop e celular). `tests/e2e/expansao.spec.ts`: o ARCADE de ponta a ponta com teclado real agora termina no AMINU (1 cartão de desbloqueio).

## PROVAS (nível, conforme `quem-valida-o-que`)
- **tsc** limpo. **vitest** completo: 2125 passaram; as 2 falhas são de `tests/unit/musica-mix.test.ts` (trabalho em andamento da Vega, T2). Todo o resto, inclusive `audio.test`, `audio-chefe.test`, `luta-fidelidade`, snapshot do motor, `z2`, `z3`, passou. **build** (`tsc` + `vite build`) e **`test:e2e:build`** (5 testes) passaram na árvore real.
- **e2e completo, um por vez, 217 passaram e 0 falharam**, no servidor fixo da árvore real (e antes disso num snapshot sem o trabalho da Vega: o mesmo número). Linha de base antes de mexer: 201 passaram e 1 falhou (o ARCADE de ponta a ponta, que eu reescrevi).
- **Mutação: 20 mutantes textuais, 20 mortos** (aura, fim.ts, revanche, "Vença", índice da batida, zoom final, seleção, escada, zoom do BAATAR, orçamento de primitivas, epílogo sem chave, pose do BAATAR, véu, título do HUD, a chave, a entrada só do ZENON, dx da CAMILLE, assinatura, paleta, corte da CURTA). 3 sobreviveram na 1ª rodada e viraram testes (zoom final com dados diferentes de 1, paleta aplicada no desenho) ou correção de mutante (o do HUD tocava o lado do jogador, que nunca é o chefão).
- **Controle negativo** em todo A/B de pixels (dois desenhos do mesmo quadro = 0 px de diferença).
- **Navegador, medido com as fontes reais (px lógicos de 960, margem de 16):** nada estoura, no desktop e no celular deitado (915x412).

| Guardião | Aviso (linha mais larga / rodapé) | VS | Desbloqueio (título / linhas / convite) | Cartão (rodapé espaçado / título) | Fala da entrada | HUD "CHEFÃO · ..." (de 320) | Derrota (pílula de 480) | Efeito muda | Aura muda |
|---|---|---|---|---|---|---|---|---|---|
| AMINU | 348 / 323 | 206 | 404 / 418 e 419 / 466 | 158 / 189 | 335 e 420 | 227 | 421 | 44938 px | 81056 px |
| CENTELLA | 374 / 306 | 195 | 469 / 390 e 366 / 386 | 139 / 206 | 357 e 342 | 171 | 436 | 19649 px | 91234 px |
| CAMILLE | 349 / 343 | 195 | 439 / 383 e 434 / 276 | 181 / 109 | 286 e 397 | 179 | 342 | 49324 px | 93660 px |
| NILA | 337 / 340 | 195 | 378 / 348 e 423 / 272 | 181 / 184 | 343 e 427 | 224 | 421 | 27193 px | 82497 px |
| BAATAR | 361 / 388 | 206 | 428 / 369 e 419 / 246 | 146 / 101 | 184 e 241 | 174 | 286 | 32811 px | 82073 px |

  "SELO ENTREGUE!" (a reserva) nunca foi necessária: o título mais largo ("CENTELLA SE JUNTA A VOCÊ!") tem 469 px de 880. Efeito e aura em pixels de 480x270 que mudam no A/B (efeito do roteiro contra o dos braseiros; fase 2 contra fase 1).
- **Contraste do rodapé do cartão** (WCAG, medido nos PNGs): AMINU 10,4, CENTELLA 15,5, CAMILLE 7,7, NILA 12,8, BAATAR 9,9. Na 1ª versão o da CAMILLE era **1,27** (céu claro do cais) e o do AMINU 1,9: corrigi com um véu elíptico escuro atrás do cartão do guardião e o rodapé quase branco.
- **BAATAR com zoom 0,95:** sem pixel preto nas bordas laterais (4 colunas x 82 linhas, medido no navegador). **CAMILLE:** entra andando (dx de 300 a 0 até o tick 96).
- **Capturas** (`arte-fonte/capturas/chefoes-l1e1-*`, 82 arquivos, 45 MB, PNG paletizado): por guardião, aviso, VS, entrada (t070, t150, t200; NILA também t125 e t135, a SARPA), aura da fase 2, KO com a fala de derrota e cartão de desbloqueio (desktop); aviso, VS, entrada e desbloqueio na página do celular deitado (`-celular-pagina`); seleção (próximo, outro, Anfitrião); ZENON (aviso, revanche, VS, entrada, desbloqueio).

## O QUE NÃO FOI PROVADO
- **Nenhum som foi ouvido.** As 5 assinaturas (`som` dos roteiros: rufo de kalangu, plateia e sino, buzina, rufo de chenda, vento e canto de garganta) são receitas de `tone`/`noise` escritas pela spec §2.2; só provei que tocam uma vez, em COMPLETA e CURTA, e que o ZENON não ganhou nenhuma. Escuta é do dono.
- **Nenhum aparelho de verdade.** O "celular" é o perfil Pixel 7 do Chromium (915x412 deitado, toque emulado).
- **Os efeitos de cena foram julgados por captura**, não em movimento no celular. Custo: orçamento de primitivas contado (<= 14), mas não medi ms por quadro da entrada com CPU 4x como fiz na cinemática.
- **Jogo real de ponta a ponta com o dono:** a campanha pela UI (S1, S3, S6, S7) foi provada por ganchos (`ui.set('ending', ...)`), e só o ARCADE do `expansao.spec` joga 6 lutas com teclado real (agora até o AMINU).

## PARA O PRÓXIMO (Íris)
- Jogar o 1º ARCADE de um save novo: chefão AMINU (aviso "O PRIMEIRO SELO / NÃO TEM PRESSA", VS "O GUARDIÃO", entrada de 4,5 s, fase 2 com aura e véu, KO com a fala dele), cartão "AMINU SE JUNTA A VOCÊ!" com o epílogo, e conferir que o ZENON continua bloqueado ("Só recebe quem traz os Cinco Selos").
- Repetir com CENTELLA, CAMILLE e NILA (o VS diz "A GUARDIÃ"), BAATAR e, com os 5 liberados, o ZENON ("O ANFITRIÃO ESTÁ À SUA ESPERA"; depois de derrotado, "QUER REVANCHE" e nenhum cartão).
- Perder e usar o continue contra um guardião: a entrada vira CURTA (60 ticks, só a 1ª frase da fala). Apertar um ataque depois do tick 10 pula; antes, não.
- Save antigo (ZENON liberado com a fila vazia): o chefão deve ser o AMINU e jogar de ZENON não o impede (S4/S5).
- Pontos de risco: a aura aparece no instante da troca de barra (antes de a cena começar) nos guardiões; a NILA em SARPA na fase 2; o BAATAR com zoom de 0,95 (borda) e a CAMILLE chegando do canto direito; texto no celular em retrato (não medi retrato).

## PENDÊNCIAS
1. **"A seleção não revela quem é o próximo guardião"** (seu pedido x as linhas do Apolo): implementei as linhas do Apolo, que continuam distinguindo o PRÓXIMO ("?") dos outros ("???") pelo texto, como a regra antiga já fazia ("É o próximo a ser liberado."). Nome e gênero nunca aparecem. Se a intenção era NÃO distinguir nem a posição, é trocar as duas listas por uma só em `TEXTOS_COMUNS.selecao` (o teste `seleção` do e2e e o unit mudam junto).
2. **Aura dos guardiões acende na troca de barra, não na cena** (decisão minha, ver `rampaDaFase2`): a leitura não distingue "caído antes da cena" de "depois dela", e a rampa t/duração recomeçaria do zero e piscaria. O ZENON não mudou.
3. **Poses por conta do roteiro que o Apolo confirmou só pelo nome** (ele não viu os quadros): olhei as capturas e elas leem como a batida descreve (AMINU soco no `sa2`, CENTELLA `win` apontando, CAMILLE `hk1`, NILA GAJA, SARPA e GAJA, BAATAR a Dança). Duas licenças minhas: a CAMILLE ganhou `dx` (senão `walk0-3` parado parece andar no lugar) e a NILA usa `sarpaIdle0-3` (4 quadros) em vez de só o 0. Arte nova (§2.6) continua opcional: trocar o nome da pose na batida.
4. **Revisão de nativo** das palavras marcadas no `docs/textos-chefoes.md` §8 (caída, lucha, lucha libre, Touché, riposte, Avarga) segue pendente; o `†` já saiu do texto.
5. `tests/unit/musica-mix.test.ts` (2 falhas) é da Vega (T2), não minha; `_tmp*.test.ts` dela sumiram do disco durante a sessão.
6. **Servidor de desenvolvimento:** o trabalho da Vega em `src/audio` deixou o app fora do ar duas vezes durante a sessão (arquivo no meio da edição); servi um snapshot sem o trabalho dela (`scratchpad`) e, no fim, repeti o e2e inteiro na árvore real.

## APRENDIZADO
- A entrada generalizada cabe sem mexer nos testes do ZENON porque `linhaDaEntrada` ganhou um 4º parâmetro **opcional** (o padrão é o roteiro do ZENON) e o índice da batida reproduz o 0/1/2. `Apresentacao.roteiro` é o discriminador; `entradaDramatica` ficou só no ZENON porque o z3 exige `undefined` no BAATAR.
- `Game.tick` é global: um teste que reabre a luta no mesmo `Game` compara o delta, não o zero.
- A fala da entrada só desenha com a faixa acima de 40 px (some a partir do tick 250): medir em 240.
- Contraste de texto pequeno sobre arena clara se mede no PNG (`contraste.mjs`), não se deduz da cor; foram precisos o véu elíptico e o rodapé quase branco.
- Toda prova de efeito visual por A/B de pixels precisa do controle negativo e do cuidado de não tocar o estado do jogo entre os dois desenhos.
- Quando outro agente edita `src/` ao mesmo tempo, o servidor "fixo" não resolve: servir uma cópia (`git show HEAD:` para os arquivos dele) e ressincronizar depois de toda edição.
- Heredoc do bash com apóstrofo ou crase quebrou o parse mais uma vez: scripts de edição vão pelo `Write`; `tests/` e `docs/` têm CRLF em parte dos arquivos (o helper de troca precisa respeitar).
