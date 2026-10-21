# Handoff Lyra: chefão ZENON, fatias Z2 (render, HUD, grade de 10) e Z3 (entrada dramática)

Data: 2026-10-21. Missão do painel `cmvi8mrbg01ix01nxmfj3f0x0`. Sem commit. Base: `docs/spec-chefao-zenon.md` (§3, §4.3, §7, §8, §9.1), `docs/handoff-apolo-zenon-folhas.md`,
`docs/identidade-visual-especiais.md` (E12, §3.10) e `docs/handoff-vega-zenon.md`. Não toquei em `src/fight`, `src/data`, `src/meta`, `src/audio` nem em `ferramentas/`.

**O que mudou no caminho:** a Vega fez o flip da Z5 no meio da sessão (`IDS_LUTADORES` com 10, `CHEFE = 'zenon'`, atlas real de 4 páginas, `CENARIOS.gr`). Por isso tudo foi
medido com a ARTE REAL do ZENON, e o `?chefe=zenon` (ZENON provisório com a arte do WEI LONG) que eu tinha montado para ver o chefão antes do flip foi apagado sem uso. Pelo mesmo
motivo o chefe de teste (`?chefe=teste`, BAATAR antigo) e `src/ui/dev-chefe-teste.ts` saíram: a troca para o ZENON em `tests/e2e/_chefe.ts` está feita.

## RESULTADO

### Render (Z2)
- **Projétil `anel`** (`src/render/projetil-anel.ts`, ligado em `efeitos.ts`; `'anel'` em `EstiloProjetil`): 3 elipses (ry = 0,45·rx, rx = 34·sc), núcleo ônix em `source-over`, borda em brilho em
  `lighter`, arco de destaque girando 0,25 rad/tick e cauda. 6 primitivas por quadro.
- **Estilo E12** (`estilos-especiais.ts`) com as variantes `selo`, `selo-maior`, `coluna`, `tributo`, `decreto`: anéis a partir de um núcleo ônix (`#0c0710`, alfa <= 0,85, `source-over`), meandro grego de
  ângulos retos (módulo 24 px) em cima e embaixo da faixa, moedas `#d9b25a`; assinatura do acerto (o anel se fecha e solta 6 moedas) e da defesa (4 segmentos retos), estampa da tarja. <= 24 primitivas
  (<= 12 na CURTA), sem shadowBlur/filter/getImageData. As **5 identidades** entraram em `IDENTIDADES` (agora 33; título = `mv.name` exato, contraste >= 3:1, nenhum par igual).
- **Aura sombria + arena gr da fase 2** (o "escurecimento do céu do `mn`" NUNCA existiu: o `mn` não tem sobreposição nenhuma):
  - `render/aura-chefe.ts`: `rampaDaFase2` vem do ESTADO, não de evento (0 com todas as barras e entre a troca e a cena; `t/duração` durante `cena-chefe`; 1 com a ficha da fase 2) e `desenharAuraChefe`
    (núcleo ônix <= 0,55, borda em `lighter` <= 0,35, 8 fiapos, base; 4 primitivas; ZERO chamadas com rampa 0).
  - `render/arena-gr.ts` + `SOBREPOSICOES_DE_CENARIO` (`cenario.ts`), chamado por `desenharMundo`: véu do céu, brilho dos 6 braseiros (laranja -> púrpura pela rampa), chamas púrpura em 3 camadas
    por cima das da arte, raios próximos a cada 90-150 ticks (hash do índice, não consome o `rngVisual`). <= 14 primitivas. **Os 6 braseiros foram MEDIDOS no `cenario-gr.webp` final** (centro da chama,
    em fração de 1920x1080: (0,178; 0,313), (0,379; 0,345), (0,620; 0,344), (0,819; 0,313), (0,125; 0,523), (0,875; 0,527)); um teste de unidade lê o arquivo e acusa se a arte mudar.
- **Esquiva tingida**: já saía em `fire[0]` pelo `silhuetaTingida` (o `fire[0]` do ZENON é `#d6339a`, `#e0249a` na chefe2); nada a mudar, só conferi.
- **Dreno visível** (`render/moedas-dreno.ts`, spec §12 Z2): `hit`/`block` com `dreno` soltam de 1 a 6 moedas (metade na defesa) do ponto do golpe até a ponta da barra SUPER de quem drenou.
- **HUD do chefão**: o rótulo vira `CHEFÃO · O ARCONTE` (título do def, só se couber: <= 16 letras; um título maior, como "O Avarga das Estepes", deixa só `CHEFÃO`), com o nome, o `×2`/`×1` e as barras de antes.
- **Legenda de fala** (`render/legenda.ts`, `falaDoChefe`): "Chega de cortesia." na cena da fase 2; vitória no `matchend`; derrota no KO final.

### Entrada e apresentação (Z3)
- **`render/entrada-chefe.ts`**: linha do tempo PURA do tick (`linhaDaEntrada`) + `EntradaDoChefe` (API da `Cinematica`). COMPLETA 156 ticks (faixas 0-12, 6 braseiros acendendo de 12 a 48 da esquerda
  para a direita, `entrada0` de costas -> `entrada1` no 48 -> `entrada2` no 84, cartão "ZENON ARGYROS · O ARCONTE · DONO DO TORNEIO" e a fala letra a letra, faixas saem nos últimos 12); CURTA 60 ticks
  (faixas + `entrada2` + cartão + a 1ª frase). Pular (ataque, ESP ou ENTER de um humano) só vale depois do tick 10 e a saída leva <= 6 ticks. Sons: whoosh nas faixas, um tom por braseiro, o cartão.
- **Fora do motor e do lock-step por construção**: `CenaFight.update` chama `entrada.avancar()` NO LUGAR de `game.update` (como a cinemática do especial e a pausa). Provado em unidade (foto do
  motor idêntica a uma luta sem entrada depois de 600 ticks, nos 3 casos) e no navegador (tick, `t`, fase e estado do RNG iguais em 30 quadros).
- **Quando**: COMPLETA na 1ª luta contra o chefão de cada ARCADE; CURTA depois de um continue ou reinício (`CampanhaArcade.entradaDoChefeVista`), com `prefers-reduced-motion` ou com a cinemática
  CURTA/DESLIGADA; nenhuma com regras sem cinemática (`?expansao=4`). O nome do chefão aparece sempre.
- **`render/apresentacao-lutadores.ts`** (`APRESENTACAO`, a tabela da spec §3.1; a Vega NÃO precisa criar `src/data/apresentacao-lutadores.ts`): entrada e vitória do BAATAR (`devekh0-2`, `devekh0`/`win`: a Dança
  da Águia virou só isso, sem provocação) e do ZENON jogável (`entrada0-2`, `vitoria0-1`), falas, aviso `['O ANFITRIÃO', 'ESTÁ À SUA ESPERA']` (a `CenaChefe` o lê) e o cartão. A render troca só o nome da pose,
  numa cópia rasa da leitura; a `intro` de 90 ticks e a vitória são as do motor (zero tempo a mais). Vale também para BAATAR e ZENON como lutadores comuns.
- `CenaFight.enter` liga a trilha da valsa: `audio.startMusic(ch.chefe?.trilha ?? 'fight')`.

### Grade de 10 e vitrine
- `ordemDaGrade`: 9 regulares na ordem do ROSTER (BAATAR 9ª casa, AMINU no centro) + o chefão no índice 9 = **casa de honra** 256x44 em (352, 356), moldura `#d9b25a`; oculta = "???" + "O ANFITRIÃO",
  liberada = rosto 44x44, nome, título e "CHEFÃO" (+ NOVO!). Painel de descrição desce para y 408 (92 px). `moverNaGrade`: ↓ da 3ª linha = honra, ↑ da honra = 7, ↑ da 1ª linha = honra (volta),
  ↓ da honra = 1, ←/→ na honra não mudam. `retanguloDeToque`: a honra tem 56 px de área de toque (4 px a mais em cima e 8 embaixo). 9 lutadores com chefão = chefão no centro, como antes.
- **Achado: a cabeça do ZENON (e a do BAATAR) saía da tela** na seleção (topo em y -48), no VS (-68) e no final (-55) porque `ch.K` já leva a `scale` 1,36. `escalaDeVitrine` (`personagens.ts`) encolhe na
  vitrine só quem passa de 1,1 (BAATAR 1,28 e ZENON 1,36); os outros 8 (os 4 originais, de fidelidade) ficam IDÊNTICOS (o e2e de fidelidade segue verde).

### Testes e limpeza
- Unidade novas: `tests/unit/z2-render-chefao.test.ts` (36), `z2-grade-honra.test.ts` (25), `z3-entrada-chefe.test.ts` (34). Ajustados: `_ui.ts` (10º lutador falso), `cinematica.test.ts` (33 entradas, 12 estilos),
  `_baatar-chefe.ts` (o BAATAR antigo agora mora aqui, fonte única).
- e2e novo `tests/e2e/zenon-z2z3.spec.ts` (desktop e celular). e2e adaptados: `_chefe.ts` (ZENON, `GRADE_DE_PRODUCAO`, `PULAR_ENTRADA`), `expansao`, `novos-lutadores`, `celular-e7a`, `arte-f3b`, `arte-sob-demanda`
  (10 retratos/manifestos; nenhuma página do ZENON no boot nem antes da 5ª luta do ARCADE). Os testes "PRODUÇÃO (sem chefão)" saíram (o ARCADE de produção agora tem 6 etapas e passa de ponta a ponta com o ZENON).
- `src/main.ts` voltou a ser o de antes (sem o gancho `?chefe=teste`); `dist` não contém `chefe=teste`.

## PROVADO (rodado, nesta sessão)
- `npm run typecheck`: limpo. `npm test`: **66 arquivos, 1475 testes verdes**. `npm run build`: ok (JS 250,3 kB, 88 kB gzip). `npm run test:e2e`: **145 passaram, 0 falharam**, 107 pulados (projeto
  desktop/celular), 4,0 min, servidor Vite fixo sem HMR (conferido por `curl` ao módulo). `npm run test:e2e:build`: **5/5**.
- **Mutação**: 35 mutantes dos arquivos novos (entrada, pular, modo, HUD escondido, rampa, aura, anel, E12, arena, braseiros, raios, moedas, grade, toque, vitrine). 3 sobreviveram na 1ª rodada e eram TESTE
  FRACO (comparar com a constante importada, que a mutação muda junto; painel de descrição sem posição medida): troquei pelos literais e pelo e2e do nome do painel; os 35 morrem agora. O teste de unidade
  achou um defeito real: a CURTA tocava os 6 tons dos braseiros de uma vez (corrigido).
- **Medido no navegador** (Playwright, arte real):
  - Entrada: `game.tick`, `t`, fase e RNG não mudam em 30 quadros; ENTER no quadro 20 faz o motor andar em <= 8 quadros; ENTER no tick 5 NÃO pula; com a mesma `run` (continue) sai CURTA e acaba em 60 updates;
    HUD escondido (nenhum de HAYATO/ZENON/KO/SUPER/ESQ/rótulo/ROUND 1) e o cartão e a fala dentro de y 56-484; ao fim, a `intro` é a de sempre e o HUD volta.
  - Fase 1 x 2 no mesmo cenário: chama do braseiro da frente (média RGB 188/181/117 -> 180/90/146: laranja -> púrpura), luminância do céu 38,3 -> 32,4 (x0,85), rampa 0,5 no meio da cena, aura muda > 400 px do corpo e
    ZERO diferença com a rampa 0, legenda "Chega de cortesia." na cena. Anel: centro escuro (luminância < 55) e borda magenta saturada.
  - **ESCALA 1,36 x HUD** (zoom 1,0646, o máximo na prática é 1,075; base dos nomes do HUD em y = 77, pixel a pixel): topo do sprite em idle0/1/2/3 = 101/96,5/94,5/96,5; walk0-7 = 96,5/92,5/106/105,5/106/97,5/95,5/97;
    block = 105; cena2 = 112,5. **Folga sobre os nomes: 15,5 px (walk1) a 28 px (block)**, bem acima dos 4 px do critério (a estimativa da Nova era 4-19). Salto (`jump` 0,72, ápice 83 px): `jup` a 90% do ápice
    = y 52, `jtop` no ápice = 102,5; nada sai da tela. **Falha só nas poses de VITÓRIA: `win` = y 72,5 e `vitoria1` = y 75, a 4,5 e 2 px ACIMA da base dos nomes** (aplauso, cabeça e mãos
    erguidas): só encosta nos nomes se o ZENON estiver nos cantos (nomes em x 110-175 e 800-854), e o HUD desenha por cima dele. O teto de 1,42 não foi testado (nada pediu subir). Se quiser o critério
    "inclusive `win`" cumprido: `scale` 1,32 dá +7 px (conta: topo = 470 - 397,5·s/1,36). Decisão do Atlas/dono.
  - Casa de honra: 256x44 logo abaixo da 3x3, sem tocar a 3ª linha, o painel nem a faixa de dica (molduras encostam sem cruzar); textos do painel entre y 408 e 500 nas casas 9, 8, 0 e 4. No celular
    915x412 a casa mede **195 x 33,5 px CSS** (área de toque de 42,7 px, a 1,3 do ideal de 44); a 844x390 dá 40,4. O toque (CDP) na honra e no vão abaixo dela seleciona a casa 9; oculta não confirma.
  - Contraste do corpo (A/B com e sem o sprite, razão de luminância): gr 1,64 (botas 2,17), jp 2,52, cn 1,37, kr 1,34, br 3,05, ng 2,01, mx 1,34, fr 4,09, in 1,54, mn 2,56; botas 2,16 a 3,40. O piso clareado do `gr`
    cumpre o 1,5 do Apolo; **cn, kr e mx ficam em ~1,35** (o casaco preto sobre fundo médio): só importa se o ZENON jogável lutar lá (o chefão sempre luta no `gr`).
  - Quadro de desenho no celular emulado (915x412, canvas por SOFTWARE, mediana de rodadas alternadas): fase 1 86,7 ms, fase 2 97,1 ms, **razão 1,12** (meta <= 1,15). O valor absoluto não vale como desempenho (software).
  - Carga sob demanda: nenhuma página `zenon/atlas-*.webp` no boot, na seleção nem na 4ª luta do ARCADE; na 5ª o ARCADE as pré-busca.
- **Capturas** em `arte-fonte/capturas/` (ver abaixo).

## O QUE EU VI EM NAVEGADOR (olhei as imagens)
`zenon-entrada-desktop/celular` (e os quadros 24/40/100/140 da entrada, antes de apagar os temporários), `zenon-fase-1`, `zenon-fase-2`, `zenon-fase-2-cena`, `zenon-projetil-anel`, `zenon-dreno-moedas`,
`zenon-escala-1-36-hud`, `zenon-cenario-gr` e `-cn`, `zenon-aviso-de-chefe`, `vs-do-chefao` (cabeça dentro da tela), `selecao-10-honra-oculto`/`-liberado`, `cinematica-zenon-base-sFire` e
`-chefe2-sFwd`. Também gravei (e NÃO olhei uma a uma): `zenon-cenario-{jp,kr,br,ng,mx,fr,in,mn}`, `cinematica-zenon-{base-sDown,base-sFwd,chefe2-sFire}`, `selecao-10-inicio`, `selecao-10-baatar-travado`,
`arcade-zenon-{fase-1,cena,fase-2}`, `lutador-zenon-{0,1,2}-*`.

**NÃO vi / NÃO provado:** o som (nenhuma receita foi ouvida; só provei as chamadas); aparelho real, toque real no botão de ataque para pular a entrada (só a tecla e o botão via entrada simulada) e
`prefers-reduced-motion` real (só unidade); o desempenho da entrada em celular de verdade; a `derrota` do ZENON só em unidade (o KO final desenhado não foi fotografado); a `vitória` dele (legenda + `vitoria0/1`)
só em unidade e na medição de altura; o ZENON jogável com a entrada/vitória de `APRESENTACAO` em luta de verdade (versus); as 8 capturas de cenário acima.

## PARA O PRÓXIMO
- **Íris:** jogar o ARCADE inteiro até o ZENON (entrada completa, pular com ataque/ENTER/botão do toque, pausar no meio da entrada, perder e dar continue -> entrada curta, REINICIAR LUTA na pausa, fase 2 com cena e
  legenda, vitória e derrota do chefão); a grade de 10 em teclado, mouse, toque e controle (↓↓↓↑ = 7, ←/→ na honra, "???" que não confirma, NOVO! depois de derrotá-lo); o ZENON jogável em versus (entrada/vitória
  em `APRESENTACAO`, TRIBUTO com moedas); BAATAR em luta comum (entrada `devekh*` na `intro`, vitória). Atenção: teclas seguradas na hora do pulo; dois humanos no versus; CPU no ZENON.
- **Vega:** (1) `win`/`vitoria1` do ZENON a 4,5/2 px acima dos nomes do HUD (acima); (2) a `apresentacao-especiais` dele já está certa (conferida pelos testes); (3) conferi no navegador que a luta contra ele sai em `gr` e que `celular-e7a`/`fidelidade` seguem verdes com o 10º lutador.
- **Alexandria (Z8):** documentar `APRESENTACAO` (entrada, vitória, falas, aviso, `entradaDramatica`), a rampa da fase 2 por estado, `escalaDeVitrine`, a casa de honra e o gancho `PULAR_ENTRADA` dos e2e.
- **Atlas:** decidir (a) `scale` 1,36 x pose de vitória (acima), (b) CURTA como padrão em toque (herdado, B16; a entrada é leve: um véu, degradês e 4 faixas, mas não medi em aparelho), (c) o contraste de cn/kr/mx se o
  ZENON jogável for um dos lutadores de vitrine.

## PENDÊNCIAS
- Nome do painel de especiais da seleção **estoura a borda** (`SELO DO ARCONTE` 117 px e `COLUNA DE ÔNIX` 119 px para ~98 disponíveis): é o mesmo defeito de 13 dos 30 nomes (HAYATO, WEI LONG, MIN-JI, CAIO...
  inclusive os originais). Não corrigi porque quebraria os e2e de fidelidade pixel a pixel dos 4 originais; o conserto seria encolher a fonte só com `Regras` de 10 ou só nos novos.
- `fala.derrota` aparece na luta (KO final), não na cena `ending` (o final do ARCADE segue o de sempre).
- "Pular a entrada com toque no canvas" não existe (só os botões de ataque, como a cinemática).
- O `?chefe=zenon` provisório foi removido; para ver o chefão no navegador basta `?expansao=1` e jogar/abrir a luta.

## APRENDIZADO (também em `.claude/agent-memory/lyra/armadilhas-ui-innofighters.md`)
- Entrada/cinemática "fora do lock-step" = a CENA troca `game.update` por `avancar()`; a prova é uma foto do motor (tick, `t`, lutadores, RNG) comparada com uma luta sem entrada, depois de N ticks, e a mutação "chama
  `game.update`" tem de morrer.
- Aura/arena ligadas ao ESTADO (rampa por fase e ficha), não a um evento: pausa e cinemática não prendem nem apagam; e o intervalo entre a troca de barra e a cena precisa valer 0.
- Escala > 1,1 sai da tela nas vitrines (K já leva `scale`): normalizar na vitrine, nunca no dado.
- Teste que compara com a constante importada é tautologia: a mutação a muda junto. Use o literal da spec.
- `SALVAR_QUADROS` faz os specs de fidelidade despejarem ~300 PNGs (1 GB): para capturas use só `SALVAR_CAPTURAS`.
- Servidor Vite fixo serve o módulo antigo: reiniciar e conferir por `curl` antes de rodar e2e/mutação.
- Heredoc do bash com acento/apóstrofo e `node -e` com crase quebram: gravar `.mjs` com a ferramenta Write e rodar.
