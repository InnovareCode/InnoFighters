# Handoff Vega: BAATAR vira lutador NORMAL (2026-10-21)

Decisões do dono: BAATAR é o 5º da fila (AMINU, CENTELLA, CAMILLE, NILA, BAATAR); sem fichas `chefe`/`chefe2` e sem configuração de chefe;
o MERGULHO DA ÁGUIA é o →+ESP dele no lugar do ABRAÇO DA ESTEPE; a Dança da Águia vira só entrada pré-luta e pose de vitória; casa `mn`.
O Zenon NÃO foi implementado: `CHEFE` é `null` por enquanto.

## RESULTADO

### Dados (`src/`)
- `src/data/lutadores/baatar.ts`: sem `fichas` e sem `chefe`; `sFwd` = `MERGULHO_DA_AGUIA`; o ABRAÇO saiu do kit. `poseDaFicha { sc0: 'dive0', sc1: 'dive1' }` passou
  para o def base (a caixa de acerto sai do `dive1`; o mapa só vale se o atlas tem o quadro). `hp 92` e `pow 0,9` (E6b) intactos. `stage: 'mn'` intacto.
- **Números do MERGULHO (a única mudança de balanço):** `dmg 20 -> 10`, `cost 30 -> 35`. Com o valor de chefão (20) o BAATAR ficava em 65,4% (partida 40
  sementes; `baatar x centella` 82%). O restante do golpe (S 12, A 80, vy -17, vx 20, vxAlvo 40, lag 26, `over`, derruba, rank 9, dica `aproximar [200, 700]`) é o mesmo.
- `src/data/apresentacao-especiais.ts`: `baatar.sFwd = { quadro: 'dive1', entrada: 'cima' }`; a chave `'chefe2/sFwd'` saiu. A tabela tem **28** registros (era 29):
  26 da base + NILA/SARPA 2. O BAATAR tem 3 (sFire sa1, sDown sb1 `rival`, sFwd dive1 `cima`).
- `src/meta/regras.ts`: `FILA_DESBLOQUEIO = [aminu, centella, camille, nila, baatar]`; `CHEFE = null` (TEMPORÁRIO, comentado); `TAMANHO_ESCADA` segue 5.
- Escada sem chefe (`montarEscada` já tratava `chefe === null`): **5 etapas** (5 rivais sorteados dos 8 que não são o jogador), nenhuma com `chefe: true`, e o BAATAR
  pode ser rival (ele só saía por ser `regras.chefe`). `aplicarVitoriaArcade` com `chefe null`: `derrotouChefe` não libera nem marca nada; só avança a fila.
- Quem já liberou o BAATAR derrotando-o como chefe não perde nada: `proximoDaFila` pula quem está em `desbloqueados` (provado em teste: save `[aminu, baatar]` segue
  CENTELLA, CAMILLE, NILA e a 4ª zerada não libera nada; `chefeDerrotado` permanece).
- Comentários em `src/core/contratos.ts` e `src/fight/game.ts` acertados. **Sem mudança de motor** (`fighter.ts`, `game.ts`, `cpu.ts` intocados): a mecânica de chefe
  (barras, troca, Dança, ficha da fase 2) continua no motor para o Zenon.

### Harness (`ferramentas/balanco`)
- `montarTarefas(ids, chefe: IdLutador | null, ...)`: com `null` não gera tarefa de chefe (mesmo com `incluirChefe`); `agregar` ganhou `_chefeId: IdLutador | null` e a
  estatística "BAATAR agarrões" passou a usar o id literal `'baatar'` (ele é lutador regular). Cabeçalho do relatório e texto do `--sem-chefe` acertados.
- Referência regravada em `docs/balanco/` (`--completo`, 100 sementes, NORMAL + DIFÍCIL, 14 400 lutas, 0 travadas, hash `94a7ca18d38aaee9`, `--verificar` IDÊNTICA):

  | | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | **baatar** |
  |---|---|---|---|---|---|---|---|---|---|
  | `--completo` | 48,6 | 52,1 | 51,6 | 52,7 | 44,9 | 42,5 | 57,2 | 48,3 | **52,1 (IC 50-54)** |
  | `--completo --esquiva` | 45,8 | 48,4 | 42,3 | 49,2 | 54,2 | 45,4 | 53,6 | 57,0 | **54,2 (IC 52-56)** |

  0 alerta (0 atenção) sem esquiva; 1 atenção com esquiva (`camille sFwd` usado 10 142x, 4,7% de contato, pré-existente e não relacionado). `--esquiva` grava em
  `relatorios/balanco-esquiva/` (ignorada pelo git). CENTELLA está em 42,5% (limite inferior da faixa; ela já era a mais fraca): não mexi, a regra era ajustar só o BAATAR.

### Testes (`tests/unit`, todos verdes exceto os 2 do Z6, que não são meus)
- Novo `_baatar-chefe.ts`: **fixtura do BAATAR ANTIGO** (`BAATAR_CHEFE`: ABRAÇO + fichas `chefe`/`chefe2` + `chefe` 2x40, Dança 90, bônus 5000), `BAATAR_COM_ABRACO`,
  `ABRACO_DA_ESTEPE`, `montarBaatarChefe()`, `montarBaatarComAbraco()`, `comBaatarChefe(elenco)`. Mantém coberta, sobre a arte real, a mecânica de chefe do motor
  (barras, troca, Dança `devekh0..2`, ficha da fase 2) e o `rush` + agarrão em janela do ABRAÇO. Quando o Zenon entrar, os testes de chefe migram para o def dele e este arquivo some.
- Reescritos/ajustados: `baatar-s1b` (MERGULHO no base, dicas, CPU), `e5-elenco` (fila de 5, escada de 5, BAATAR normal, fixtura de chefe), `balanco`, `balanco-adversarial`,
  `cinematica-eventos`, `cinematica` (28), `esquiva-timing/-cantos/-consumo/-invariantes/-chefe-cpu`, `progresso`, `e4-ui` (regras injetadas `R9C` com chefão para a mecânica
  de chefão da UI + casos de produção sem chefão), `ui` (escada de 5).
- Snapshot antigo e fidelidade lock-step dos 4 originais: **intactos, sem `-u`**.
- Um teste do `baatar-s1b` (CPU) passou a contar só usos que saem do repouso (`anterior === null`): o cancelamento de golpe que acabou de acertar segue o fluxo antigo da CPU
  e ignora a dica de alcance. Não é regressão; o RNG mudou de sequência porque o MERGULHO ocupa o lugar do ABRAÇO.

## PARA O PRÓXIMO

### Lyra
- Dados que você consome: `LUTADORES.baatar.fichas` é `undefined` (`ch.fichas` montado = `{}`), `LUTADORES.baatar.chefe` é `undefined`, `REGRAS_PADRAO.chefe === null`.
  `special` do BAATAR →+ESP: `{ golpe: 'sFwd', ficha: null, quadro: 'dive1', entrada: 'cima' }`. A identidade `baatar.base.sFwd` = MERGULHO já está em `identidade-especiais.ts`
  (o `cinematica.test` passa).
- `ordemDaGrade(roster, null)` devolve a ordem do roster: com `CHEFE null` não há casa central de chefão; BAATAR é a 9ª casa (travada até a 5ª zerada). `estadoDaCasa` nunca devolve
  `chefe-oculto` em produção. Textos: `descricaoArcade` sem chefão = "enfrente os 5 rivais em sequência e torne-se o campeão." (já no `escada-texto.ts`).
- Cena `chefe` (aviso + VS do chefão) não é mais alcançada pelo Arcade de produção: a escada não tem etapa de chefe. `?expansao=1` (`main.ts:62`) ainda diz "BAATAR ... chefão" no comentário.
- **Dependência aberta (cena de entrada):** a Dança da Águia como **entrada pré-luta** do BAATAR (`devekh0..2`, 1,5 s) e a pose de vitória dependem da spec da Nova
  (`cena { duracao, poses }`, a mesma cena do Zenon). **Não implementei.** Hoje o motor só tem a cena de chefe (`fase 'cena-chefe'`, `Fighter.state === 'cena'`,
  `fighter.ts:1046` lê `devekh0..2` fixo e `cfgChefe?.danca.duracao ?? 90`) e o estado `win` (pose `win` do atlas dele, que existe). Pose de vitória: nada a fazer agora, já usa `win`.
- **e2e que vão quebrar (não editei, `tests/e2e`):**
  - `expansao.spec.ts`: grade 3x3 com chefão no centro (L80, L103, `selecao-3x3-chefe-oculto`); descrição "depois o chefão" (L137); "ARCADE com chefão de ponta a ponta" (L142-224: 6 etapas, `etapas[5]` = baatar chefe, aviso de chefe, VS do chefão,
    `desbloqueados: ['aminu','baatar']` + `chefeDerrotado: true`, dois avisos de desbloqueio); "chefão na tela" (L228+, `cfg.chefe: true` com baatar vira luta de 1 barra: o HUD de barras e a faixa CHEFÃO dependem do `chefe` do motor).
  - `novos-lutadores.spec.ts`: estado `baatar: 'chefe-oculto'` (L106); "BAATAR chefão: 2 barras, troca de barra, Dança e fase 2 (MERGULHO)" (L208-270, usa `fichas.chefe2` e `ficha 'chefe'`).
  - `celular-e7a.spec.ts`: L213-221 mede o HUD com `c2: 'baatar', chefe: true` (a flag agora é ignorada; o rótulo CHEFÃO some).
  - Provavelmente ok: `cinematica.spec.ts` (data-driven por `todasAsApresentacoes`), `arte-sob-demanda.spec.ts`. Não rodei e2e (instrução).
- `src/ui/dev-expansao.ts`, `campanha.ts`, `cenas/chefe.ts` etc. continuam compilando (`typecheck` e `build` verdes); só o comportamento muda.

### Íris
- Testar: MERGULHO como →+ESP do BAATAR (CPU e humano; a CPU o usa de 200 a 700 px; golpe alto, bloqueia-se em pé, derruba, não agarra); trocas de save com `baatar` já em
  `desbloqueados` (fila pula, sem duplicar, `chefeDerrotado` preservado); Arcade de 5 etapas nas 9 escolhas de c1, inclusive BAATAR como rival e jogando COM o BAATAR; esquiva contra o MERGULHO
  (mesma janela dos demais saltos; `esquiva-timing` cobre `baatar.sFwd` com ficha null).
- Atenção: `esquiva-cpu.test.ts.snap` aparece modificado, mas veio da Lyra (já estava assim antes de eu começar); eu não rodei `-u`.
- Falhas atuais de `npm test`: apenas `z6-chefoes-derrotados.test.ts` (2), por `core/storage.ts` mencionar `chefeDerrotado`: trabalho do Cronos em `src/meta`/`src/core/storage` em paralelo, fora do meu escopo.

### Órion
- Nada de entrada externa nova. Vale revisar `sanearProgresso`/save: ids antigos continuam aceitos; `chefeDerrotado` herdado de quem derrotou o BAATAR segue `true` (o Cronos está mexendo nisso em `chefesDerrotados`).

## PENDÊNCIAS
- **Entrada pré-luta e vitória da Dança da Águia**: depende da spec da Nova (`cena { duracao, poses }`, cena de render fora do lock-step). Quando existir, o BAATAR declara a cena no def dele.
- `CHEFE` volta a ser um id quando o Zenon entrar (`TAMANHO_ESCADA` fica 5 = 5 rivais + chefe = 6 etapas). Os testes marcados "R9C"/"fixtura" passam a apontar para o Zenon.
- CENTELLA em 42,5% (faixa 42-58). Se o dono quiser mais folga, o ajuste é nela (não foi pedido).
- `docs/identidade-visual-especiais.md` já foi atualizado em paralelo pelo Apolo (MERGULHO ficou, ABRAÇO marcado como sem uso); não toquei.

## APRENDIZADO
- Dano de chefão não vale para o jogável: `MERGULHO dmg 20` deu 65% de vitória como lutador normal; 10 + custo 35 deu 52%. Medir com `--so sim --pares 'baatar:*,*:baatar' --sementes 40 --ajustes` (30 s por variante) antes do `--completo`.
- Aumentar o custo sozinho não derruba a taxa (a CPU gasta energia em outro golpe); o que move é o `dmg` do golpe novo.
- A CPU de dica (`planoPorDica`) só vale para o plano que sai do repouso; o cancelamento de golpe que acabou de acertar ignora a dica (armadilha já anotada: combo ignora ia). Teste de "dentro do alcance da dica" tem que filtrar os usos que saem do repouso.
- Remover um lutador de `regras.chefe` o devolve ao sorteio da escada (`candidatos` exclui só `regras.chefe`): `CHEFE = null` faz o BAATAR aparecer como rival sem mudar código.
- Guardar o def antigo como FIXTURA de teste (`_baatar-chefe.ts`) em vez de apagar os testes: a mecânica de chefe/rush do motor continua provada sobre a arte real até o próximo chefão existir.
- Tooling: heredoc `python - <<'EOF'` com apóstrofos dentro de texto quebra o bash; gravar `.py` em `relatorios/` (ignorada) com a ferramenta Write funciona. Arquivos mistos CRLF/LF: normalizar antes de substituir.
