# Handoff Vega — E5 · ligação dos 5 lutadores novos no jogo real

Data: 2026-10-21. Sem commit. Base: `docs/handoff-vega-e3-s3-s5.md`, `docs/handoff-cronos-e2.md`, `docs/plano-expansao.md` §E5/ED4/ED8, `docs/mecanicas-e3.md` §3.

## RESULTADO

- `src/core/contratos.ts`: `IDS_LUTADORES` com os 9, na ordem da grade (`hayato, wei-long, min-ji, caio, aminu, centella, camille, nila, baatar`). `IdLutador` os aceita; os casts `as IdLutador` dos 5 `src/data/lutadores/*.ts` saíram.
- `src/data/lutadores/index.ts`: `ROSTER` e `LUTADORES` com os 9 (`ROSTER` = `IDS_LUTADORES`). Os 5 reexports de "FORA do elenco" viraram imports do próprio mapa. `VITRINE` segue só nos 4 iniciais.
- `src/meta/regras.ts`: `FILA_DESBLOQUEIO = [aminu, centella, camille, nila]`, `CHEFE = 'baatar'`, `TAMANHO_ESCADA = 5` (ED4). A escada (`montarEscada`) não precisou de código: com as regras reais dá 5 rivais + BAATAR como `chefe: true` por último; jogando COM o BAATAR, 5 rivais e nenhuma etapa de chefe (ED7); travados entram na escada (ED5).
- **ConfigChefe real do BAATAR** (`src/data/lutadores/baatar.ts`): `barras 2`, `hpPorBarra 75`, `fichaFase1 'chefe'`, `fichaFase2 'chefe2'`, `danca 90`, `bonusVitoria 5000`, `stage 'mn'`. Perfil de CPU `IA_CHEFE` (`src/fight/cpu.ts`: +0,15 em react/block; fase 2 com aggr 1 e anti +0,2). **Tudo isso é PROVISÓRIO, marcado no comentário do dado para a E6** (o doc só dá valores de partida).
- **Cenários** (`src/data/cenarios.ts`, `IdCenario` em `data/tipos.ts`): `ng, mx, fr, in, mn` + `jp` novo. Cada um com `casa` e o campo novo `pes` (fração da altura da imagem em que ficam os pés = 84,5%, constante `PES_NO_CENARIO` em `core/constantes.ts`, = `(GROUND − CENARIO_Y) / CENARIO_ALTURA` = 490/580). Arquivos: `assets/cenarios/cenario-<sigla>.webp` para `jp, ng, mx, fr, in, mn` (conferidos na pasta: os 6 existem, entregues pela Lyra) e `cn.jpg`, `kr.jpg`, `br.jpg` do protótipo. O `jp.jpg` antigo continua em disco (o `atlas.test.ts` o confere) mas o jogo usa `cenario-jp.webp`. Cada lutador novo aponta `stage` para o cenário da casa (`aminu→ng`, `centella→mx`, `camille→fr`, `nila→in`, `baatar→mn`) e `stageName` igual ao `nome` do cenário. `CICLO_CENARIOS` (título) e `CENARIO_PADRAO` ficam como estavam (só os 4 iniciais).
- **Poses × atlas real** (conferido contra os `atlas.json` de `public/assets/lutadores/<id>/`, v2 de várias páginas, 48 quadros; BAATAR 54, `alturaRef` 525, `K = 1,28 × 255 / 525`):
  - `src/data/montar.ts`: ponte **por lutador** quando o quadro FALTA: `jpunch → jkick` (sem `jumpPunch` nem `jpunch`) e `crouchPunch → clp`. Sem isso o soco aéreo dos 4 novos e o preparo da BOTE caíam no idle0 (o FALLBACK do protótipo termina em `punch`, que o atlas novo não tem). Os 4 originais e o `alias` deles ficam idênticos; o BAATAR tem `jpunch` próprio.
  - BAATAR fase 2: `fichas.chefe2.poseDaFicha = { sc0: 'dive0', sc1: 'dive1' }` — o MERGULHO usa a arte própria e a caixa de acerto sai de `dive1`. Medido com o atlas real: acerta o rival a 200, 300 e 450 px.
  - NILA: **as poses `sarpa*` NÃO existem no atlas gerado** (a folha 5 da SARPA, obrigatória, ainda não foi gerada/processada). `poseDaFicha` só vale com o quadro presente, então a SARPA usa as poses da GAJA até lá; quando a folha entrar, o mapa de nomes de `nila.ts` (`sarpaIdle0..3`, `sarpaWalk0/1`, `sarpaBlock`, `sarpaSlide0/1`, `sarpaLeap0/2`) precisa conferir com o que o pipeline gerar.
  - Apelidos: `idle2` = `idle0` no BAATAR e `idle3` = `idle1` na CENTELLA (mesmo retângulo; o loader já aceita).
- **Rollback de onda (ED8)**: nenhuma linha nova. Os 5 ids seguem a regex dos desconhecidos (`/^[a-z0-9][a-z0-9-]{0,31}$/`): num build de 4 eles são preservados em `prog.desconhecidos`, não afetam a UI e voltam como desbloqueados num build de 9 (teste com os ids reais).
- **Fidelidade lock-step e snapshot CPU × CPU (seed 42)**: os 4 originais intactos, sem `-u`; `git status tests/unit/__snapshots__` vazio. A fidelidade itera só os originais (tipo `IdOriginal` em `luta-fidelidade.test.ts` e teste que garante que só eles têm `idPrototipo`).

### Testes ajustados porque "produção" passou de 4 para 9 (tests/unit; não é código novo)

`_lutadores.ts` (`montarTodos` lê os atlas v1 e v2 pelo mesmo `validarManifesto` + `paraManifestoV1` do jogo), `_ui.ts` (mundo falso com os 9 reais), `e4-ui.test.ts` (sem a fixture `dev-expansao`: as regras de produção já são as de 9), `ui.test.ts` (grade 3x3: cursor, mouse, escada de 6 etapas), `fight.test.ts` (o ESP corpo a corpo da AMINU/BAATAR tem caixa), `papeis-lutadores.test.ts`, `progresso.test.ts` e `storage-v2.test.ts` (ids finais no lugar de `novo-a`/`chefe-x`). Os testes de mecânica da E3 (`aminu-s2`, `centella-s3`, `camille-s4`, `nila-s5`, `baatar-s1b`, `chefe-e3`) continuam montando as definições sobre o atlas do WEI LONG **de propósito** (números independentes da arte).

### Testes novos — `tests/unit/e5-elenco.test.ts` (39)

ids finais e papéis; fila (4 zeradas liberam na ordem, a 5ª nada; chefão só ao derrotá-lo); escada (todos os 8 jogadores × 4 sementes, sem rival repetido, BAATAR por último, com o BAATAR sem chefe, travados aparecem); BAATAR real (ConfigChefe, `stage` mn, setup de chefe, jogável sem `cfg.chefe`, luta inteira troca → Dança `devekh0..2` do atlas real em 90 ticks → `chefe2` com MERGULHO, o MERGULHO acerta a 200/300/450); poses (toda pose citada pelos golpes resolve para quadro real, pontes, BAATAR 54/525, NILA sem `sarpa*`); cenários (10, casa↔lutador bijetivo, arquivos existem e são WebP/JPEG 16:9, nomes, 84,5% e a constante bate com `render/cenario.ts`, título só nos 4); rollback com os ids reais; fumaça CPU × CPU de 3000 ticks com a arte real dos 5.

## PROVADO (executado nesta sessão, no código do disco)

- `npx vitest run`: **37 arquivos, 817 testes verdes**, incluindo `luta-fidelidade` (21) e o snapshot CPU × CPU semente 42 SEM `-u`.
- `npm run build` (tsc + vite): verde (173,42 kB JS). `tsc --noEmit`: nenhum erro em `src/` nem em `tests/unit`; no fim da sessão aparece **1 erro em `tests/e2e/arte-sob-demanda.spec.ts(37,88)` (Lyra, arquivo em edição)** — não é meu.
- **Mutação**: 18 mutantes aplicados (fila trocada, chefe null, escada 4, stage do BAATAR, casa do cenário, ponte `jpunch`, sem `dive`, pés +3%, nome de arquivo do cenário, ordem do roster, `hpPorBarra`, ponte `crouchPunch`, `idPrototipo` num novo, regex de id desconhecido curta, escada com o próprio jogador como rival, ciclo de título com cenário novo, `baatar` fora de `IDS_LUTADORES`, AMINU nos iniciais): **todos mortos**, arquivo restaurado a cada um.

## NÃO provado

- Nada visto em navegador; `test:e2e` não rodado (combinado). Os e2e de `tests/e2e/*` assumem 4 lutadores em 2x2 e Arcade de 3 rivais: vão precisar da Lyra/Íris.
- Balanceamento: as caixas de acerto agora vêm da `ponta` dos atlas REAIS (bem diferentes do WEI LONG); a fumaça CPU × CPU só prova que luta e acerta, não que o alcance está bom. `ponta` do BAATAR `sa2` (arremesso) e do `jkick` (modo `pe`) foram vistas a olho na F2, não contra o motor.
- Pose `sarpa*` da NILA e os desenhos de `dive0/dive1` em movimento (só a geometria foi medida).

## PARA O PRÓXIMO

### Lyra
- `src/ui/dev-expansao.ts` + `?expansao=1` + `tests/e2e/expansao.spec.ts` ficaram **obsoletos**: `regrasExpansaoFalsa()` usa `[...IDS_LUTADORES]` como iniciais, que agora são 9 (daria 14 lutadores). Aposentar a fixture (a produção já tem os 9 reais); o `e4-ui.test.ts` já não depende dela.
- A grade 3x3 real: `ordemDaGrade` põe o chefão no centro e os demais na ordem do `ROSTER`, então fica `[hayato, wei-long, min-ji / caio, BAATAR, aminu / centella, camille, nila]`. Se preferir os 4 iniciais numa linha fixa, isso é decisão de UI (o `ROSTER` pode ser reordenado sem quebrar nada, mas `FILA_DESBLOQUEIO` manda na ordem de ganho).
- Cenários: `CENARIOS[id].arquivo` já aponta para `assets/cenarios/cenario-<sigla>.webp`; o `jp.jpg` antigo não é mais usado pelo jogo (o `atlas.test.ts` ainda o exige no disco).
- Do handoff anterior, ainda valem: eventos `rebote`, `parry`, `troca-ficha`, `hit.contraEspecial`, `pose.flip` negativo no RESORTE (`docs/handoff-vega-e3-s3-s5.md`).
- Folha 5 da NILA (SARPA): quando for gerada, passar pelo pipeline com os nomes `sarpa*` do `poseDaFicha` (ou ajustar o mapa em `nila.ts`).

### Íris
- Atacar: save com `aminu` e `baatar` desbloqueados abrindo o build de 4 (regras injetadas) e voltando; Arcade com cada um dos 9 como `c1` (6 lutas; contra o BAATAR a 2ª barra e a Dança); BAATAR jogável em Versus/Treino (1 barra, ficha base, sem Dança); cenário `mn` na luta do chefão e `ng/mx/fr/in` nas lutas contra os novos; `jpunch` dos 4 novos (hoje mostra o `jkick`).
- Conferir que os e2e antigos (4 casas, 3 rivais) falham pelos motivos esperados e são atualizados, não apagados.

### Órion
- `montarLutador` ganhou 2 linhas de alias por lutador (só quando falta o quadro); o `dados.test.ts` continua provando o `alias` dos 4 originais contra o protótipo.
- Ids novos entram no save pela regex de "desconhecidos" (kebab-case ≤ 32), com teto `MAX_IDS_DESCONHECIDOS`.

## PENDÊNCIAS

- Valores finais do chefão (E6): `hpPorBarra`, `danca.duracao`, `bonusVitoria`, `IA_CHEFE`.
- Folha 5 da NILA (SARPA) e a conferência de nomes `sarpa*`.
- Aposentar a fixture `dev-expansao` e atualizar os e2e (Lyra/Íris).
- Sem commit (a pedido).

## APRENDIZADO

- **Mudar `IDS_LUTADORES` de 4 para 9 quebra por tipo e por suposição, em 24 testes**: o tipo `Record<IdLutador, string>` do `luta-fidelidade` (compilador avisa) e, sem aviso, tudo que assumia "produção = 4" (grade 2x2, escada de 3, fila vazia). **Como evitar:** teste novo escrito contra as regras reais; o que quiser "só os 4" injeta `regras`.
- **Atlas novo = só os 48 nomes canônicos.** O FALLBACK/ALIAS do protótipo termina em nomes legados (`punch`, `jumpPunch`, `crouchPunch`) que não existem nele, então pose faltante cai no `idle0` sem erro nenhum. **Como evitar:** o teste "toda pose citada pelos golpes resolve para um quadro real" roda contra os atlas de verdade; a ponte é por lutador (`montar.ts`), não nas tabelas globais (que a fidelidade compara chave a chave).
- `poseDaFicha` é o jeito de dar arte própria a UMA ficha (MERGULHO na `chefe2`) sem tocar `BASE_ANIM`/`TYPE_ANIM` e sem mudar o golpe na fixture do WEI LONG (sem o quadro, o mapa nem entra).
- Helper de teste que lê atlas precisa passar por `validarManifesto` + `paraManifestoV1` (v2 tem `imagens`/`p`/`retrato`): ler o JSON cru como v1 quebra nos novos.
- Ambiente: `python` com heredoc do Bash lê o script em cp1252 (acentos viram `?`): para texto com acento, usar a ferramenta Write/Edit ou arquivo `.py` salvo em UTF-8.
