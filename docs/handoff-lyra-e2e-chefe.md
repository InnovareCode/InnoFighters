# Handoff Lyra: e2e do chefão com CHEFE DE TESTE (2026-10-21)

Missão do painel `cmvi7suxz01e201nxr94yptgu`. Os 7 e2e que dependiam do BAATAR chefão (listados em `handoff-lyra-l1l2.md`) foram adaptados sem apagar nem afrouxar
medidas. A mecânica de chefão passa a ser exercitada por um **chefe de teste** (o BAATAR antigo) ligado só em desenvolvimento por `?chefe=teste`; os testes de
produção afirmam o jogo de hoje (Arcade de 5 etapas, sem chefão). Sem commit.

## RESULTADO

### Gancho de desenvolvimento (fora do bundle)
- `src/ui/dev-chefe-teste.ts` (novo): FONTE ÚNICA do BAATAR chefão antigo (`ABRACO_DA_ESTEPE`, `BAATAR_COM_ABRACO`, `BAATAR_CHEFE`: 2x40, Dança 90, bônus 5000, fichas
  `chefe`/`chefe2`) + `comChefeDeTeste(regras)` (põe `chefe: 'baatar'` e tira o BAATAR da fila, como era) + `elencoComChefeDeTeste(elenco)` (remonta o `ch` do BAATAR com o
  def de chefão sobre o mesmo atlas; a arte e o `poses()` em cache são os mesmos).
- `src/main.ts`: `?chefe=teste` (só com `import.meta.env.DEV`, import dinâmico, igual ao `?expansao=`). Combina com `?expansao=1|4`; sozinho usa as regras de produção.
- `tests/unit/_baatar-chefe.ts` agora **reexporta** os três defs do módulo acima (antes eram cópias): um único def para unit e e2e. Os 1287 testes unitários seguem verdes.
- **Fora da produção, medido:** `npm run build` = JS 225,97 kB (igual ao anterior); `dist/assets/*.js` não contém `ABRAÇO DA ESTEPE`, `chefe=teste`, `dev-chefe-teste` nem
  `elencoComChefeDeTeste`; `sources` do `.map` não lista o módulo (as palavras aparecem só no `sourcesContent` do `main.ts`, como já acontece com `dev-expansao`).

### A troca para o Zenon fica num lugar: `tests/e2e/_chefe.ts`
- Constante `CHEFE` (`id`, `nome`, `query`, `fase1`, `fase2`, `poseDanca`, `quadrosFase2`, `fila1`) + `urlComChefe(base)` + `SEM_CHEFE` (5 etapas, texto do menu).
- **Quando o Zenon entrar** (`REGRAS_PADRAO.chefe = 'zenon'`): `query` passa a `''`, `id`/`nome`/fichas/poses apontam para ele; depois apagar `src/ui/dev-chefe-teste.ts`, o
  gancho no `main.ts`, o re-export de `tests/unit/_baatar-chefe.ts` e os testes "PRODUÇÃO (sem chefão)" (viram 6 etapas). Pontos específicos do BAATAR que ainda são
  literais e precisam de olho: a lista de 9 de `GRADE_COM_CHEFE` (a casa central só existe com roster de 9 em `ordemDaGrade`; com 10 lutadores o Zenon não vai ao centro)
  e o texto "depois o chefão" do menu.

### Os 7 e2e quebrados, um a um
- `expansao.spec.ts` x3: (1) grade 3x3 -> teste "COM chefão" (`?chefe=teste`, chefão no centro, `chefe-oculto`, medidas intactas) + testes novos de PRODUÇÃO (BAATAR 9ª casa
  travado, `estadoDaCasa` sem `chefe-oculto`, 9 casas de 80 px no canvas, teclas reais até o BAATAR, BAATAR já liberado confirma); (2) menu: "COM chefão" (texto antigo) e
  "PRODUÇÃO" (`SEM_CHEFE.descricao`); (3) Arcade de ponta a ponta: o antigo roda com `?chefe=teste` (6 etapas, aviso, VS do chefão, 2 avisos de desbloqueio; agora também
  confere `chefesDerrotados: ['baatar']`) e há um novo de PRODUÇÃO (5 etapas distintas, nenhuma de chefe, luta de 1 barra, termina em `ending` sem a cena `chefe`, UM aviso de
  desbloqueio, `chefeDerrotado: false` e sem `chefesDerrotados`). O "chefão na tela" (aviso, VS, HUD de 2 barras por pixels) roda com `?chefe=teste`, medidas idênticas.
- `novos-lutadores.spec.ts` x2: a seleção de 9/produção passou a afirmar `baatar: 'travado'` e a 9ª casa; novo teste "COM chefão" afirma o centro e `chefe-oculto`; o teste do
  chefão (2 barras, troca, Dança, fase 2 com `dive1` do atlas) roda com `?chefe=teste` lendo as fichas/poses de `CHEFE`. Novo: "BAATAR normal (produção)": 1 barra, sem ficha
  nem `fichas`, `sFwd` = MERGULHO DA ÁGUIA, pose `sc0/sc1` resolve para `dive1` do atlas já no def base.
- `celular-e7a.spec.ts` x2 (915x412 e 844x390): o teste do HUD com `chefe: true` roda com `&chefe=teste` mantendo TODAS as asserções de >= 12 px CSS (GAJA, SARPA, `000000  CHEFÃO`,
  `×2`, BAATAR) e a linha comum de 14 px lógicos; novo irmão de PRODUÇÃO (BAATAR normal) com GAJA/SARPA/BAATAR >= 12 px e `CHEFÃO`/`×2` ausentes. O espião de `fillText` virou
  helper (`instalarEspiaDeTextos`, `medirTextos`).

### Verificação (nível "provado")
- `npm run typecheck` limpo. `npm test`: 59 arquivos, **1287 verdes** (rodado depois do re-export da fixtura). `npm run build` ok.
- `npm run test:e2e` (servidor Vite fixo sem HMR/watch em 5173, conferido por `curl /src/main.ts`): **133 passaram, 0 falharam, 95 skipped** (projetos desktop/celular). Antes: 125 + 7 falhas.
- `npm run test:e2e:build`: **5/5**. Nenhum teste de CSP foi alterado.
- Não rodei a suíte de e2e com `SALVAR_QUADROS`: nenhuma captura de referência mudou, nenhuma nova foi gravada (os nomes `selecao-3x3-producao-sem-chefao`, `selecao-3x3-baatar-travado`,
  `lutador-baatar-normal-mergulho` e `selecao-producao-chefe-oculto` só são gravados quando a variável existe).
- Não verifiquei por mutação que cada teste novo de produção falha se o BAATAR voltar a ser chefão; o que prova que eles pegam a regressão é o estado anterior desta missão (os mesmos
  fluxos, sem `?chefe=teste`, davam os 7 vermelhos).

## PARA O PRÓXIMO
- **Íris:** conferir visualmente a seleção de produção (BAATAR na 9ª casa, travado) e o BAATAR normal no HUD do celular; o aviso/VS de chefe hoje só se vê com `?chefe=teste` (URL
  `/?seed=3&chefe=teste`, só no dev server). Em produção a cena `chefe` não aparece.
- **Quem implementar o Zenon:** seguir "A troca para o Zenon" acima; os e2e de chefão passam a exigir o def real dele no elenco (fichas `fichaFase1/2`, Dança com `poseDanca`).
  Atenção ao `apresentacao-especiais`: a fase 1 de um chefão com ficha própria (no BAATAR de teste o ABRAÇO usa `baatar/sFwd`=MERGULHO na tarja da cinemática; só aparece em teste).
- **Vulcano/Órion:** nada novo; o gancho só existe com `import.meta.env.DEV`.

## PENDÊNCIAS
- Defeitos em `src/fight`, `src/data`, `src/meta` (não mexi): nenhum encontrado. Observação, não defeito: `Fighter.chefe` é boolean (`false` fora de chefão), não `null`; a
  tarja de cinemática do ABRAÇO do chefão de teste mostra a identidade do MERGULHO (a tabela de apresentação só tem `baatar/sFwd` = MERGULHO).
- Decisão do dono ainda aberta (herdada): cursor da seleção anda por cima de travados (o teste de produção documenta isso).

## APRENDIZADO
- Mecânica de chefão sem chefão em produção: ligar um def de teste por query só em DEV (regras + elenco), com a troca para o chefe real concentrada numa constante de e2e (`_chefe.ts`).
- Fonte única do def de teste (`dev-chefe-teste.ts`) reexportada pela fixtura unitária evita dois BAATAR antigos divergindo.
- `Fighter.chefe` é boolean; `barras`/`barrasMax` são 1 em luta normal (nunca `undefined`/`null`).
- Índices da grade mudam com a casa central de chefão: com chefe, `cur 0 + ↓↓` cai em CENTELLA; sem chefe, em CAMILLE. Calcule o índice no roster antes de escrever a tecla.
- Ferramenta: heredoc com apóstrofo no texto PT quebra o bash também em `cat > x.mjs <<'EOF'` quando a linha tem aspas simples soltas dentro de comentário; usar Write/Edit.
  Template literal em script gerado por heredoc perdeu `\d` (virou `d`): conferir regex depois de gerar por script.
