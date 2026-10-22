# Changelog

Marcos do InnoFighters, do mais recente para o mais antigo. Datas e hashes vêm do `git log` (fuso -03:00).
Os nomes de fase (F0, E1a, E3 S2...) são os de `PLANO.md` e `docs/plano-expansao.md`.

## 2026-10-21: chefões progressivos na UI, guardiões da fila e decisões do dono (não commitado)

- **Chave `chefesDaFila = true`** (`src/meta/regras.ts`): o chefão do ARCADE é o próximo guardião da fila (AMINU primeiro). Derrotá-lo o libera. O ZENON só aparece com os cinco liberados. A fila e o chefão da vez são calculados por `chefeDoArcade` (`src/meta/chefes.ts`). O `fim.ts` grava o id da etapa de chefe no começo do ARCADE. Handoff: `docs/handoff-lyra-chefoes.md`.
- **Correção de rampa da fase 2**: a aura dos guardiões acende na troca de barra (no HEAD nunca acendia, porque a regra antiga lia `fichaFase2`, que eles não têm).
- **Entrada dos guardiões por roteiro** (`src/render/roteiros-de-entrada.ts`): AMINU, CENTELLA, CAMILLE, NILA e BAATAR têm batidas de pose, zoom e som, e um efeito de cena próprio (`src/render/efeitos-de-entrada.ts`). O ZENON segue com o roteiro dele.
- **Véu de fase 2** (`src/render/veu-de-fase2.ts`) escurece e tinge a arena quando o chefão entra na segunda barra.
- **Textos dos chefões** (`src/render/textos-dos-chefoes.ts`, transcritos do `docs/textos-chefoes.md`): aviso, rodapé, VS ("O GUARDIÃO", "A GUARDIÃ", "O ANFITRIÃO"), título do HUD, cartão de desbloqueio com epílogo ("<NOME> SE JUNTA A VOCÊ!") e fala de derrota. Revanche do ZENON: aviso e rodapé próprios, sem cartão.
- **Seleção:** a casa fechada mostra "???" e a linha do painel muda para o próximo guardião, para os outros e para o Anfitrião ("Só recebe quem traz os Cinco Selos.").
- **Testes:** `tests/unit/l1e1-chefoes.test.ts` (47) e `tests/e2e/chefoes-l1e1.spec.ts` (15 execuções, desktop e celular). Sete testes antigos foram reescritos para a regra nova, sem `-u`. Na última rodada da Lyra: 217 e2e passaram, 0 falharam.
- **Não provado:** nenhum som dos chefões foi ouvido; o celular é o perfil emulado do Chromium, não aparelho real.
- **Pendências:** o Difícil de 4 dos 6 chefões fica fora da faixa do balanço (ver `PROGRESSO.md`); nomes de guardiões em palavras de outro idioma pedem revisão de nativo (`docs/textos-chefoes.md` §8).

## 2026-10-21: temas musicais por lutador (`73f0074`, inerte)

- **Régua musical** (`tests/support/regua-musica.ts`, congelada): compara trilhas por três dimensões (melodia, ritmo e timbre). Os 65 pares de temas passam o critério.
- **Sequenciador** (`src/audio/partitura.ts`, `AudioSys.playTema`): laço de 10 a 21 s, troca de fase no início do compasso, orçamento de no máximo 8 fontes novas por passo e 15 ativas (validado no boot).
- **Nove temas** em `src/data/musica/temas/` (AMINU, BAATAR, CAIO, CAMILLE, CENTELLA, HAYATO, MIN-JI, NILA, WEI LONG). O ZENON mantém a valsa.
- **Inerte:** `TEMAS_POR_LUTADOR = false` (`src/audio/temas.ts`). O jogo toca a música de hoje. A ligação na troca de trilha da luta (`src/ui/cenas/fight.ts`) não foi feita. Handoff: `docs/handoff-vega-temas.md`.
- **Não provado:** nenhum tema foi ouvido. O celular de verdade e o Chromium com CPU 4x não foram medidos.

## 2026-10-21: sons por lutador (`59f3b75`, inerte)

- **Régua de sons** (`tests/support/regua-sons.ts`, congelada): distinção entre lutadores pela voz e pelos especiais. Duas correções depois do congelamento (estimador de tom e início do oscilador no motor offline) não mudam os limiares. O S0b passou de 2,30 para 3,19.
- **Voz por lutador:** `vozFormante`, garganta por lutador (uma voz por vez; o KO não deixa entrar outra), orçamento de 12 fontes por plano e 32 simultâneas.
- **Dados:** 10 perfis vocais, gritos por lutador (`GRITOS_LEXICAIS = true`: palavras reais marcadas "(rev.)" pedem revisão de nativo) e 33 assinaturas dos especiais.
- **Inerte:** `IDENTIDADE_SONORA = false` (`src/audio/identidade-sonora.ts`). A luta ainda chama `reagirAosEventos`. Handoff: `docs/handoff-vega-sons.md`.
- **Não provado:** nenhum som foi ouvido. Limiares não cumpridos: R6 com o bloco de tom (10 de 180 variações acima de 0,4) e R7 espelho (piso de 0,3).

## 2026-10-21: chefões progressivos, regra da fila e dano recebido (`955e720`)

- **Contrato de chefões** (`src/meta/chefes.ts`): `chefeDoArcade`, `ehChefeFinal`, `desafiantesDoChefe`. `aplicarVitoriaArcade` aceita `{ chefe }` (libera só o chefão derrotado) e o formato antigo `{ derrotouChefe }`.
- **Limite de chefões derrotados** sobe de 8 para 16. Sem migração: o formato v2 é o mesmo.
- **`danoRecebido`** no bloco `chefe`: multiplicador do dano que a vida do chefe sofre (0,60 a 1). Cinco guardiões com bloco de chefe (AMINU 0,925, CENTELLA 0,875, CAMILLE 0,925, NILA 0,875, BAATAR 0,85) e o ZENON com 0,80.
- **Chave `chefesDaFila` = `false` no HEAD**: a escada ainda usa só o ZENON (o que volta a ser verdade na árvore de trabalho, acima).
- **Harness** (`ferramentas/balanco/chefoes.ts`): meta por chefão em rampa. Referência de produção (com esquiva) regravada em `docs/balanco/`: 25 800 lutas, 0 travadas. Os números estão em `docs/balanco/resultados.md`.
- **Pendência de balanço:** o DIFÍCIL fica fora da faixa em AMINU, CENTELLA, NILA e BAATAR. Aceito por enquanto (decisão em `PROGRESSO.md`).
- **Regulares intactos:** o hash das lutas regulares (`f420ce928e06b304`) é igual antes e depois.

## 2026-10-21: provocação antes do round e na vitória (`bfa3347`)

- **Balão de provocação** (`src/render/balao.ts`, `src/render/provocacao.ts`): antes do round 1 (os dois falam, P1 primeiro), do round 2+ (uma linha de quem perdeu o round) e na vitória (o vencedor provoca). É apresentação fora do motor: não muda resultado nem tempo de luta.
- **Opção PROVOCAÇÕES** (LIGADAS/DESLIGADAS) na tela de Opções, independente da cinemática do especial.
- **Vale** no ARCADE, na LUTA vs CPU e no VERSUS de dois jogadores. **Não** no TREINO, no CPU x CPU e no pré-round da luta de chefão.
- **232 falas** em `src/data/provocacoes.pt-BR.ts`, todas dentro dos limites de caracteres e medidas no navegador. Sorteio das falas com semente + 5, fora do RNG da luta.
- **Pular:** ataque, ENTER ou toque (depois do tick 10 do round e do 24 da vitória).
- **Não feito:** arte nova de `provoca0/1` (usa a pose `win`); escuta do som do balão. Handoffs: `docs/handoff-lyra-provocacao.md` e a memória da Vega (`.claude/agent-memory/vega/project_provocacoes_p1.md`; o handoff `handoff-vega-provocacao-p1` não existe no repositório).

## 2026-10-21: seleção, casa aleatória e tipografia (`ac57a80`)

- **Casa aleatória (RANDOM)** na grade de 10: roleta de retratos dos lutadores liberados, sorteio com RNG próprio (semente + 4). Com movimento reduzido, a casa mostra "?" fixo.
- **Rótulo VOCÊ** sai do rosto e vai para o painel do lutador (0 px sobre o rosto).
- **Casa de honra** encolhe de 256x44 para 204x44 (`src/ui/grade.ts`) para caber a casa aleatória.
- **Tipografia:** Barlow Condensed e Barlow auto-hospedadas (OFL), carregadas antes do boot.
- Handoff: `docs/handoff-lyra-selecao.md`.

## 2026-10-21: decisões do dono sobre o chefão ZENON (`0db7120`)

- **Escala do ZENON 1,32** (era 1,36): `scale 1.32` e `alturaEmPe 1.22` em `src/data/lutadores/zenon.ts`. Folga mínima de 7 px entre o topo do sprite e a base dos nomes do HUD nas poses de vitória (medido pela Lyra).
- **Entrada dramática do chefão:** COMPLETA de 270 ticks (4,5 s; era 156). CURTA de 60 ticks (1 s), intacta. Com a cinemática DESLIGADA, a entrada roda em CURTA. Pulável por ataque ou ESP a partir do tick 10.
- **Falas do chefão:** derrota só no KO que fecha a luta (ou no `matchend` perdido por KO); vitória só no `matchend`. Perder por tempo não fala; `roundend` nunca fala.
- **Nomes de especial:** só os lutadores NOVOS encolhem a fonte (piso de 8 px). Os 4 do protótipo seguem em 13 px.
- **Balanço com esquiva** (`docs/balanco/`, produção, dados `d81622b9b8db`): ZENON jogável 51,4% de vitória geral. Chefão 31,9% no NORMAL (meta 30-40%) e 23,0% no DIFÍCIL (meta ≥ ~20%). Comparação sem esquiva em `docs/balanco/sem-esquiva/`: ZENON 52,6%; chefão 28,0% (NORMAL) e 14,9% (DIFÍCIL).
- **Observação para o teste em aparelho:** ARREMESSO DO AVARGA e MERGULHO DA ÁGUIA (BAATAR) em 8 px, e PASSO DO ELEFANTE (NILA) em 8,5 px. Em celular deitado, ~7,6 px CSS para o de 8 px (medido pela Lyra); o de 8,5 px deve dar ~8,1 px (**a confirmar**).
- **Não provado ainda:** som do chefão, a fonte de 8 px em aparelho real e a entrada em CURTA em aparelho de toque.

## 2026-10-21: chefão ZENON ARGYROS, esquiva, cinemática do especial e balanço (`0684548`)

- **Chefão final ZENON** (`CHEFE = 'zenon'`, `src/meta/regras.ts`): 10º lutador (`IDS_LUTADORES`, 10 ids). Luta em duas barras de 50, cena da fase 2 de 90 ticks, trilha da valsa 3/4 (`TRILHAS.chefe`, 138 bpm; +12% na fase 2), armadura nos golpes fortes da fase 2, projétil SELO com altura de nascimento própria (`alturaDoProjetil`).
- **Dreno de energia** (`Golpe.drenaEnergia`): TRIBUTO e DECRETO tiram energia do rival no acerto e no bloqueio. Dado inválido falha no boot (`src/data/montar.ts`).
- **Entrada dramática do chefão:** 156 ticks na primeira luta de cada Arcade, 60 depois de um continue. Pulável por ataque ou ESP de um humano a partir do tick 10. Não chama o motor: o lock-step não muda.
- **Fase 2 e arena:** a aura e a arena `gr` sobem de 0 a 1 pelo estado da luta (`rampaDaFase2`), não por evento.
- **Grade de 10:** casa de honra (256x44) embaixo da 3x3 para o chefão. A vitrine encolhe só quem passa de escala 1,1 (`escalaDeVitrine`).
- **BAATAR virou lutador comum** (5º da fila), por decisão do dono em 2026-10-21. A Dança da Águia virou só a entrada e a vitória dele.
- **Esquiva** (`ESQUIVA_PADRAO`, custo 20, janela invulnerável): teclas N (P1) e O (P2), L1/L2 no controle, botão ESQ no toque. Ligada em `Regras.esquiva`.
- **Cinemática do especial:** COMPLETA (48 ticks) e CURTA (20 ticks), com identidade visual por especial (`src/render/identidade-especiais.ts`). Padrão COMPLETA; CURTA com `prefers-reduced-motion`.
- **Balanço:** `npm run balanco` com `docs/balanco/` (100 sementes, NORMAL e DIFÍCIL). ZENON jogável com 52,9% de vitória geral. Chefão sem esquiva: 31,4% (NORMAL) e 19,1% (DIFÍCIL). A rodada com esquiva (produção) está fora do git.
- **Correção:** o import duplicado de `separarFundidas` em `ferramentas/sprites/executar.mjs` não está mais no HEAD. `npm test`: 66 arquivos, 1475 testes verdes.

## 2026-10-21: elenco de 9 lutadores no jogo (`c7437c1`)

- **E3 S3, S4, S5** (Vega): mecânicas da CENTELLA (RESORTE e HURACANRANA), da CAMILLE (PARADE, contragolpe e REVERS) e da NILA (VADIVU, troca de postura GAJA/SARPA).
- **E5** (Vega, Lyra): 9 ids em produção (`IDS_LUTADORES`); fila AMINU, CENTELLA, CAMILLE, NILA; chefão BAATAR; escada de 5 rivais mais o chefão; cenário da casa de cada lutador.
- **F3a e F3b** (Lyra): arte nova de HAYATO (traje A2) e MIN-JI; atlas e retratos dos 5 novos (atlas C1 v2); 6 cenários novos em WebP; folha 5 da NILA (serpente).
- **Oráculo de fidelidade:** atlas original de HAYATO e MIN-JI em `tests/fixtures/atlas-prototipo/`, para o teste não depender da arte nova.
- Arte bruta e capturas continuam fora do git (`arte-fonte/`, decisão D5).

## 2026-10-21: pipeline de sprites para o chefão e os novos (`763343e`)

- **E3 S1b e S2** (Vega): BAATAR (agarrão com janela, armadura por rank, MERGULHO DA ÁGUIA) e AMINU (carga MASHI com 3 níveis, quebra-guarda, absorção de projétil).
- Pipeline estendido ao layout 3x2 do chefão e rodado nos 5 novos. **Estado atual:** não executa (ver `docs/como-adicionar-um-lutador.md`).
- **Storage** (Cronos): configurações só com valores da UI; v2 de versão futura nunca sobrescrita; v2 corrompida copiada antes de ser substituída.
- **Testes do chefão** (Íris): 41 testes adversariais; 5 casos `it.fails` documentam defeitos conhecidos.
- **CI e deploy** (Vulcano): permissões mínimas, testes antes do deploy, actions fixadas por SHA, Dependabot, `noindex` no site.

## 2026-10-21: F2, pipeline de sprites (`21a062d`)

- `ferramentas/sprites/`: recorte por componente conexo, fundo medido na borda, chave de cor com despill, escala única por lutador, âncora pelos pés, ponta dos golpes.
- `sharp` como devDependency. Saída em `sprites-gerados/` (fora do git).

## 2026-10-20: expansão, contratos C3, chefão (E3 S0 e S1a), persistência por ondas, UI pós-E3 (`3af66cc`)

- **E1a** (Vega): motor para N lutadores. `IDS_LUTADORES`, `idPrototipo` opcional, `CenarioDef.casa`.
- **E1b** (Lyra): sem "4" fixo na UI; `VITRINE`; carga sob demanda (`src/assets/gerenciador.ts`); manifesto C1 v2 com páginas.
- **E2** (Cronos): storage v2 com chave `inno-fighters-v2`, migração, saneamento e `src/meta/` (desbloqueio, vitória, escada).
- **E3 S0 e S1a** (Vega): tipos C3 aditivos, `ConfigChefe`, troca de barra, Dança da Águia, `IA_CHEFE`. Produção continuou com 4 lutadores e chefão nulo.
- **E4** (Lyra): seleção 3x3 com estados (liberado, NOVO!, travado, chefão oculto); escada com chefão; aviso de chefe; tela de desbloqueio; HUD de duas barras.
- **E0 e prompts de arte** (Apolo): `docs/prompts-arte.md` e `docs/prompts/`.

## 2026-10-20: site de teste no GitHub Pages (`a6c9256`, `3ef5998`)

- `.github/workflows/pages.yml`: build com `--base=/InnoFighters/` e deploy a cada push na `main`.
- **Temporário.** O destino é o servidor EasyPanel (decisão D6). Ao entrar no ar, o workflow e o Pages devem ser desligados.

## 2026-10-20: F1c, jogo de ponta a ponta (`e704d93`)

- `src/ui/`: cenas (boot, intro, título, menu, seleção, dificuldade, VS, luta, pausa, resultado, Arcade, continuar, como jogar, opções) e `MenuList`.
- `main.ts` com laço de passo fixo ligando entrada, luta, render e áudio.
- Semente pela URL (`?seed=N`).
- Logo com a paleta A "Ouro Forjado", desacoplada do elenco (`src/ui/logo.ts`).
- Testes: fluxo completo (`jogo.spec.ts`) e 40 telas comparadas pixel a pixel com o protótipo.

## 2026-10-20: F1a e F1b, porte do protótipo em módulos (`d444e5e`)

- **F1a:** contratos C2, C3 e C4; RNG com semente (mulberry32); storage v1 com migração de `sakura-fighters-v4`; `data/` conferido contra o protótipo; `input/`, `platform/` e loader do manifesto C1; `ferramentas/extrair-prototipo.mjs`.
- **F1b:** `fight/` (motor sem DOM, áudio e render, emitindo eventos); `audio/` sintetizado; `render/` (pose, rastro de golpe, HUD, lutador, mundo). Testes de fidelidade contra o protótipo.

## 2026-10-20: F0, fundação (`eda9109`)

- Vite 8, TypeScript 7 em modo estrito, Vitest 5, Playwright (só Chromium).
- Canvas lógico 960x540 com escala por CSS.
- CI (`.github/workflows/ci.yml`): typecheck, testes e build.
- Importação do protótipo para `prototipo/` (referência congelada). Plano em `PLANO.md`, com decisões D1 a D9 do dono.

## Decisões do dono que valem para o código

- **Expansão** (2026-10-20): elenco aprovado (AMINU, CENTELLA, CAMILLE, NILA; chefão BAATAR); ordem de desbloqueio; 1ª zerada do Arcade libera o próximo da fila e o chefão; escada de 5 rivais mais o chefão; chefão em round único com duas barras; máximo de uma mecânica nova por lutador. Lista completa em `PROGRESSO.md`.
- **Repositório público** (2026-10-21): fica público até a entrada no EasyPanel.
- **Chefão** (2026-10-21): o chefão final é o ZENON. O BAATAR vira lutador comum (5º da fila), e a Dança da Águia vira só entrada e vitória dele, sem provocação (`src/render/apresentacao-lutadores.ts`).
- **Cinemática** (2026-10-21): padrão COMPLETA; CURTA se o aparelho pede menos movimento (`src/render/cinematica.ts`).
- **Chefões progressivos** (2026-10-21): os cinco guardiões são chefes da fila, na ordem AMINU, CENTELLA, CAMILLE, NILA, BAATAR; o ZENON é o Anfitrião, chefão final, com os cinco liberados. Vale na árvore de trabalho (`chefesDaFila`); no HEAD a chave ainda está `false`.
- **Provocação** (2026-10-21): VERSUS de dois jogadores tem provocação; opção própria PROVOCAÇÕES; do round 2 em diante, um balão curto sempre (a opção liga e desliga). O ZENON vencendo usa o balão, sem a legenda antiga. A derrota do chefão fala só no KO final.

## Pendente (não entregue)

- **E6, balanceamento:** a rodada de produção (com esquiva) está versionada em `docs/balanco/` desde `955e720`. Falta decidir o DIFÍCIL dos chefões (`PROGRESSO.md`, "Decisões em aberto").
- **Sons e temas:** ligação ao jogo (S4 e T3) e escuta do dono (S5). Os dois estão prontos e desligados.
- **E7, celular:** revisão do ZENON e da grade de 10 em aparelho real. Medido só em navegador emulado.
- **E8, segurança e deploy:** revisão do saneamento do storage v2 pelo Órion; publicação com rollback pelo Vulcano; documentação (esta fase).
- **F4, celular e PWA**, **F5, QA**, **F6, deploy definitivo** no EasyPanel, **F7, documentação final**.
- **Não provado:** som (nenhuma receita do chefão foi ouvida; só as chamadas foram conferidas), gamepad em aparelho real, iOS e Safari, `prefers-reduced-motion` em aparelho real.
- **Conhecido, não corrigido:** nomes de especiais que estouram o painel da seleção (13 de 30); `scale` 1,36 do ZENON encosta 2 a 4,5 px nos nomes do HUD na pose de vitória (`PROGRESSO.md`).
