# Handoff — Lyra — E4 (Arcade com chefão, seleção 3x3 e desbloqueio na UI)

Data: 2026-10-20. Sem git, sem dependência nova. Nada em `src/fight`, `src/data` (exceto o `index.ts` pedido), `src/meta`
ou `core/storage.ts`. `core/contratos.ts`: só acréscimo (2 tipos do C3 aditivo). Um `test:e2e` por vez, sem servidor aberto.

## RESULTADO

Produção continua com 4 lutadores, fila vazia e chefe `null`: **o jogo que o jogador vê hoje não mudou** (as 40 telas de
`fidelidade-ui` seguem com 0 pixel; o textos do ARCADE saem idênticos, palavra por palavra, da escada). Os estados novos
só existem com regras com chefão/fila, testadas por fixture.

- **Persistência v2** (`main.ts`): `carregarDadosV2`/`salvarDadosV2` (com as regras ativas). `Persistencia` ganhou `prog`;
  `Contexto` ganhou `regras`. A v1 continua sendo gravada só pela migração (o teste de migração do e2e segue verde e
  agora confere a v2 com progresso vazio). `CHAVE_STORAGE` não foi renomeada (regra "só acrescentar"); as funções v1 de
  `storage.ts` ficaram sem uso no `src` (só nos testes antigos).
- **Seleção 3x3** (`ui/cenas/select.ts`, `ui/grade.ts`): até 4 lutadores o layout de hoje (2 colunas, 120 px); acima disso
  3x3 de 80 px com o **chefão no centro**. Estados: liberado · **NOVO!** (selo na visita; ao abrir já conta como visto e grava)
  · **travado** (retrato escurecido + cadeado + "???") · **chefão oculto** ("???" sem silhueta). Travado/oculto **não confirma**
  (som de negação) em nenhum modo, inclusive Versus e Treino. Painel lateral dos fechados: "Zere o ARCADE para liberar." e,
  só no próximo da fila, "É o próximo a ser liberado." (a fila não é revelada). Cursor inicial e P2 (e a etapa 2 do modo CPU)
  **pulam travados**; ver "Decisão para confirmar" abaixo sobre o cursor andar por cima deles. Fechados não carregam atlas.
- **Escada** (`diff.ts`, `campanha.ts`): `montarEscada({c1, prog, rng: rngUI, regras})`; `CampanhaArcade.order` virou
  `etapas: {id, chefe}[]`. Jogando com o chefão não há etapa de chefe (a escada já vem assim da meta).
- **Fluxo do chefão**: 5º rival -> **aviso "UM DESAFIANTE SE APROXIMA"** (`cenas/chefe.ts`, rosto escurecido + "???") -> **VS do
  chefão** (faixa "CHEFÃO", fundo avermelhado, "ARCADE — O CHEFÃO") -> luta. Continue funciona nele (volta direto ao VS).
- **Desbloqueio** (`CenaEnding` + `cenas/desbloqueio.ts`): ao zerar, `aplicarVitoriaArcade(prog, {derrotouChefe: houve etapa
  de chefe}, regras)`; grava `prog`; um aviso **"NOVO LUTADOR LIBERADO!"** por id, na ordem recebida (fila primeiro, chefão
  depois; o do chefão diz "O CHEFÃO FOI LIBERADO!"). Game over não chama. Sem lutador novo vai direto ao título.
- **HUD de barras** (`render/hud.ts`): lê `barras`/`barrasMax`/`chefe` como OPCIONAIS (stub do C3 aditivo, tipo
  `ExtensaoChefeLeitura` em `contratos.ts`). Com 2 barras: a barra de baixo (roxa) aparece por trás onde a atual esvaziou,
  contador `×2`/`×1` e "CHEFÃO" no lugar de CPU/1P. Sem os campos desenha exatamente como hoje. Evento `fase-chefe`
  (tipo `EventoFaseChefe`): a luta faz flash/faíscas/"FASE 2!" no chefe; som e tremor são da Vega.
- **Textos do ARCADE** vêm da escada (`ui/escada-texto.ts`): menu, dica da seleção e "Como jogar". "Como jogar" também só lista
  lutadores liberados (golpes e aba LUTADORES, esta com páginas de 4).
- `data/lutadores/index.ts` agora reexporta `INICIAIS`/`FILA_DESBLOQUEIO`/`CHEFE` de `meta/regras.ts` (fonte única).
- **Fixture só de DEV** (`ui/dev-expansao.ts`, `?expansao=1`): 9 lutadores falsos (4 novos + chefão, cópias dos reais com
  outro id/nome; chefão 1,3x maior), regras injetadas. Import dinâmico: **conferido que o bundle de produção não contém a
  fixture** (`chefe-x`/`novo-a` ausentes em `dist/`).

## PORTÕES (rodados agora, um e2e por vez)

`typecheck` limpo · `npm test` 23 arquivos, 383 testes verdes · `npm run test:e2e` 69 passaram, 35 pularam por projeto ·
`build` ok (JS 147 kB, 53 kB gzip).

## PROVADO

- **Produção intacta:** 40 telas pixel a pixel (0 diferença); o ARCADE de produção ainda vai de 3 lutas ao título sem aviso
  de desbloqueio; textos do menu/seleção/"Como jogar" iguais aos de hoje (unit, comparação literal).
- **Seleção 3x3 no navegador:** ordem da grade com o chefão no índice 4 e no centro geométrico (x = 480); 9 casas de 80 px;
  com progresso semeado na v2: NOVO A com selo, B/C/D travados, chefão "???"; teclas reais ↓ ↓ param em travado e Enter
  não trava o jogador; chefão oculto idem; NOVO A confirma; reabrir a seleção: sem selo, e `vistos` gravado na v2.
  Olhei as capturas (grade, travado, chefão oculto).
- **ARCADE com chefão de ponta a ponta (teclado real, 6 lutas):** 5 rivais sorteados + chefão (o jogador nunca é rival),
  aviso de chefe, VS do chefão com `cfg.chefe`, final, **dois avisos de desbloqueio na ordem (novo-a, depois chefe-x)**,
  título; v2 em disco com `desbloqueados [novo-a, chefe-x]`, `zeradas 1`, `chefeDerrotado true`; a seleção seguinte mostra
  os dois com NOVO!. Sem erro de console.
- **Cenas do chefão medidas:** aviso (bordas avermelhadas, título claro), VS (faixa dourada "CHEFÃO" presente com chefe e
  ausente sem), HUD (pixels roxos da 2ª barra: >300 com 2 barras; some com 1 barra e sem os campos).
- **Toque na 3x3 (medido):** casa de 80 px lógicos = 106,7 px CSS no desktop 1280x720 e **61,0 px CSS no celular deitado
  915x412** (teste exige >= 44 px). Medi em emulação; **não medi em aparelho real** (o plano pede isso antes de dar por pronto).
- **Unit:** estados da casa, geometria (sem sobreposição), cursor com volta, travado nunca confirma (4 modos), selo NOVO! e
  gravação, escada via UI (com e sem chefão), desbloqueio (1ª/2ª zerada, fila esgotada, jogando com o chefão, produção sem
  aviso), "Como jogar" só liberados, HUD de barras.

## NÃO PROVADO

- **A luta de chefe de verdade** (round único, 2 barras no motor, troca de fase, "FASE 2!" disparado por evento real): o motor
  é da E3. A UI usa stubs; no teste de HUD os campos são injetados no lutador. Hoje a luta do "chefão" falso é uma luta
  normal (rounds das configurações).
- Arte real do chefão/novos, cenário da arena do chefão e o texto de assinatura de cada lutador novo (E5).
- Toque em aparelho real na grade 3x3 (só emulação) e legibilidade dos nomes (fonte 9 px) nas casas de 80 px em celular.
- Prefetch do próximo rival e carga sob demanda em fluxo completo com atlas NOVOS (a fixture reaproveita atlas existentes).

## DECISÃO PARA CONFIRMAR

- **Cursor "pula travados"?** O plano (seção 5) manda pular travados só no cursor **inicial e no P2**, e o painel dos travados
  ("Zere o ARCADE para liberar") só aparece se o cursor puder parar neles, então implementei assim: o cursor **anda por cima
  das casas travadas** (para o jogador ver o que falta) e só a confirmação é barrada. Se o dono preferir que as setas
  **pulem** travados, é trocar `moverNaGrade` por `proximaLiberada` em `moveCursor` (uma linha) e perde-se o painel de dica.

## PARA O PRÓXIMO

- **Vega (E3), pedido só por tipo:** em `LutadorLeitura` os campos `barras: number`, `barrasMax: number`, `chefe: boolean`
  (a UI já lê `ExtensaoChefeLeitura`: com os campos reais obrigatórios continua funcionando); no `EventoLuta` o evento
  `{ tipo: 'fase-chefe', lutador, barra }` (tipo `EventoFaseChefe`, já em `contratos.ts`); em `ConfigPartida` o campo
  `chefe?: boolean` (a UI já o envia na etapa de chefe, hoje ignorado). Som da troca de fase e tremor são do motor.
  Se preferir, ao entregar, troque meu `ExtensaoChefeLeitura`/`EventoFaseChefe` pelos reais (a UI só precisa que o nome dos
  campos seja o mesmo).
- **Cronos/Vega (E5):** ao preencher `FILA_DESBLOQUEIO`/`CHEFE` em `meta/regras.ts` e os ids em `IDS_LUTADORES`, a UI já usa
  tudo (grade, estados, escada, avisos). Falta só a arte (`atlas.json`, `retrato.png`/`.json`, cenários) e as entradas em
  `data/lutadores`; o resto da UI deriva de `regras`.
- **Íris:** rodar `/?expansao=1` (só dev) com `localStorage` semeado: `inno-fighters-v2` com `prog` e testar a grade 3x3 em
  celular de verdade (alvo de toque, nomes legíveis, cadeado visível).

## PENDÊNCIAS

- Nenhuma bloqueante. O desvio visual da E4 é só a grade 3x3 e os estados, ambos invisíveis em produção hoje.
- Resíduo técnico: `carregarDados`/`salvarDados` (v1) de `core/storage.ts` não têm mais uso no `src`; podem sair quando a
  v1 sair (Cronos).

## APRENDIZADO

- Para provar "produção não muda" quando a funcionalidade nova só existe com dados que ainda não existem: injete as regras
  (fixture com ids falsos que copiam arte existente) por um caminho só de DEV com import dinâmico, e confira o bundle de
  produção por texto; o e2e de produção (40 telas + ARCADE de 3 lutas) segura a regressão.
- Um alias no gerenciador de arte (`registrarApelido`) basta para a UI carregar "lutadores novos" sem arte nova.
- Barra empilhada só é visível onde a atual esvazia: teste de HUD tem de baixar o HP; com 100% a roxa fica toda coberta.
