# Handoff Vega — E3 · S3 (CENTELLA), S4 (CAMILLE), S5 (NILA) + correções da QA da Íris (#1 a #5)

Data: 2026-10-21. Base: `docs/mecanicas-e3.md` §2.2 a §2.4, §5, §6, §9 e `docs/handoff-vega-e3-s1b-s2.md`. Sem commit. Produção igual: 4 lutadores em `LUTADORES`/`ROSTER`, `CHEFE` null. CENTELLA, CAMILLE e NILA existem só como definições de dados (`src/data/lutadores/{centella,camille,nila}.ts`), montadas nos testes sobre o atlas do WEI LONG, com id por cast até a E5.

## RESULTADO

### Correções da QA da Íris (docs/handoff-iris-e3-s0-s1a.md), antes das fatias

- **#3** `Fighter.virarChefe` valida `fichaFase1` e `fichaFase2` (`exigirFicha`): ficha desconhecida falha ALTO no `setup`, nomeando a ficha. Antes estourava 90 ticks depois da 1ª troca, com o jogo preso em `cena-chefe`.
- **#1** `talvezIniciarCenaDoChefe` zera o `buf` dos dois lutadores ao abrir a cena (o jogador não ataca mais durante a Dança).
- **#2 e #4** a flag `trocaDeBarraNoTick` agora vale pelo TICK inteiro: zera no início de `update` (não no 1º `reforcarTrocaDeBarra`). Um 2º acerto no mesmo tick (projétil do chefe no jogador) reaplica 20/14; e uma chamada direta de `resolverVidaZerada` fora de `update` não deixa a flag viva para o golpe seguinte (o próximo `update` a zera antes de qualquer acerto). Não virou retorno do resolver (#4 na forma pedida): o sintoma está resolvido, a flag continua sendo um campo do Game, mas sem vazar.
- **#5** `Fighter.trocarFicha` usa `Object.hasOwn` (`'constructor'`/`'toString'` lançam). **A metade da render (`render/lutador.ts:15`, `chDaFicha`) é da Lyra**: o `it.fails` do #5 em `chefe-adversarial.test.ts` continua `it.fails` por causa dela (a parte do Fighter já passa; ver teste novo em `nila-s5.test.ts`).
- Em `tests/unit/chefe-adversarial.test.ts` (da Íris): 4 `it.fails` viraram `it` (#1, #2, #3, #4). **Uma edição além disso, inevitável:** o teste "(consequência do bug acima) fichaFase2 inexistente trava o jogo em cena-chefe" descrevia o bug e passou a falhar por desenho; virou "(regressão do bug acima) … o setup lança e nomeia a ficha". Íris: confira.

### Motor (campo ausente = código antigo intacto)

- `src/fight/fighter.ts`
  - `canThrow(golpe?)`: `agarrao.alvo` `'chao'` (padrão, igual a antes), `'ar'` (rival `!grounded`, `|o.y − this.y| < 120`, estado `jump` ou `move`) e `'ambos'`.
  - **Golpe `rebote` (RESORTE)**: campos `reboteFase` (0 prep/fora, 1 ida, 2 volta), `momento` (px percorridos na ida, limitado a `maxDist`). Em `mt >= S` a ida corre de costas (`vx = −facing × vel`) até a margem da parede de trás (60 ou `LARGURA − 60`, mesma de `physics`) ou `maxTicks`; então quica: evento `rebote`, `vy = rebote.vy`, `vx = facing × (vxBase + momento × vxPorPx)`. `activeMove` só vale na volta (a ida não acerta ninguém); pousar vira `_lag` (`onLand` reconhece `reboteFase === 2`); a fase zera fora do golpe no 1º tick seguinte. Caixa de acerto montada com a pose `a[1]` (a voadora).
  - **`through` (REVERS) agora CRUZA de verdade** (ver "Desvios"): `dirCorrida`/`cruzouEm`; ao passar do x do rival o `facing` vira e só então a caixa de acerto vale; a corrida segue no sentido do início.
  - **Golpe `troca` (VADIVU)**: em `mt === S` chama `trocarFicha(mv.troca.ficha)` (null = base) e emite `troca-ficha`; sem caixa de acerto.
  - `activeMove` devolve null também para golpes `parry` (PARADE) e `type: 'troca'` (senão a caixa de dano 0 atordoaria o rival).
  - `hurtbox()` passa `rente` quando o golpe em curso tem a flag.
- `src/fight/game.ts`
  - `noAtaque`: dano do `rebote` = `dmg + min(momento, maxDist) × dmgPorPx`; `AtaqueAcerto.contra`.
  - `applyHit`, no início: **PARADE** (`apara(d, mv)`: `d` em golpe com `parry`, `mt ∈ [S, S+A)`, não projétil, `mv.lvl ∈ parry.niveis`). Efeito: evento `parry` (no lugar de `block`/`hit`), `hitstop 8`, shake 3 (0 com `ajustes.shake` desligado), atacante: `move = null`, `hitDone`, `hit` com `stun = atordoaAtacante`, `vx = 0`; defensor: `startMove('sResp')`. Sem dano.
  - `applyHit`, contragolpe: `emPreparo = counter && mv.contra && d.mt < golpe do rival.S` (lido antes de `d.move = null`): dano com `contra.mult` (no lugar do 1,15), `stun` + `contra.hs`, texto "COUP D'ARRÊT!" e `hit.contraEspecial: true` (a chave só existe nesse caso). A carga da AMINU segurada em `mt = S−1` conta como "preparação".
  - `arremessar`: rival agarrado NO AR (HURACANRANA) é jogado para baixo (`vy = +9`); no chão continua `−12`.
- `src/fight/colisao.ts`: `hurtbox` com `rente` (topo `SH × 0,3`); `danoDoGolpe(..., multContra = 1.15)` (mesma ordem de multiplicações; fidelidade intacta).
- `src/fight/cpu.ts` (RNG: ver "Provado")
  - `antiaereo`: no ramo anti-aéreo o golpe com esse papel (e `alcance` da dica, se tiver) substitui o ↓+ESP genérico, sorteando o mesmo `rnd() < 0.5`.
  - `defesa`: na reação a golpe corpo a corpo do rival com `ad < 190`, se o nível dele está em `parry.niveis`, a CPU usa o golpe `defesa` no lugar do bloqueio (`ai.reacao`, com espera para a janela ativa cobrir o impacto; leva em conta a investida do rival). Mesma chance de defender; nenhum `rnd` a mais.
  - `troca`: em `planoPorDica`, se a ficha atual (`me.ficha`) não é a preferida para a distância (`preferir.distancia`/`perto`, `limite` padrão 200), troca com `rnd() < 0.3 × aggr` (`CHANCE_TROCA`). É o único `rnd` extra, só para quem tem a dica e só se há o que trocar.
  - `espacoAtras` (RESORTE): `pressao`/`aproximar` só valem com corda suficiente atrás dela (sem `rnd` antes de decidir).
  - Combos: `serveParaCombo` tira do encadeamento da CPU os golpes `antiaereo`/`defesa`/`troca` e o que exige `espacoAtras` sem espaço (a CPU encadeava HURACANRANA e RESORTE no chão). Sem dica nada muda.
- `src/data/montar.ts`: `agarrao.alvo` `'ar'`/`'ambos'` deixam de ser recusados (valor desconhecido continua erro); novas recusas no boot: `rebote` inválido, `aparar` sem `parry`/`parry` inválido, `parry` sem `extras.sResp`, `contra` inválido (`mult >= 1`), `troca` sem destino / em type errado / para ficha inexistente (null = base; vale também dentro das fichas). `montarLutador(def, pd, fichasDoLutador?)`: o 3º parâmetro é interno (recursão das fichas).
- `src/data/poses.ts`: `getPD` honra `ComPoses.poseDaFicha` ANTES da pose própria, mas só se o atlas tem o quadro.
- `src/data/anim.ts`: `TYPE_ANIM_E3` (`rebote`, `troca`) e `sResp` fora de `BASE_ANIM`/`TYPE_ANIM`; `anim` aceita a chave `sResp`.
- `src/data/tipos.ts`: `LutadorDef.poseDaFicha`, `DicaIa.limite`, `DicaIa.preferir` com `string | null` (null = base), `Golpe.troca.ficha: string | null`, `anim.sResp`.
- `src/core/contratos.ts`: só comentários dos eventos (todos emitidos agora).

### Dados

- `centella.ts` (`pow 0.94 spd 1.12 hp 96 jump 1.18 scale 0.95`). PLANCHA (`sFire`, `leap`, `over`, `tall`, `kd`); HURACANRANA (`sDown`, `rise` + `throw`, `agarrao { alvo 'ar', alcance 130, dmg 18, janela 18 }`, `ia antiaereo [30,190]`, sem `air`: dura S+A+R mesmo pousando); RESORTE (`sFwd`, `rebote { vel 7.5, maxTicks 70, vy −9.5, vxBase 8, vxPorPx 0.018, dmgPorPx 0.02, maxDist 440 }`, `lag 22`, `ia aproximar [180,700] espacoAtras 200`).
- `camille.ts` (`pow 0.98 spd 1.04 hp 98 reach 1.1 scale 1.03`). PARADE (`sFire`, `aparar`, `S 3 A 18 R 22`, `parry { niveis [mid, over], atordoaAtacante 30 }`, `ia defesa`); COUP D'ARRÊT (`sDown`, `low`, `contra { mult 1.5, hs 12 }`, `ia pressao [60,200]`); REVERS (`sFwd`, `rush` + `through`, `vx 12`); `extras.sResp` FOUETTÉ (`S 4 A 5`, `dmg 12`, `kd`, `rm 1.5`, `tall`).
- `nila.ts` (GAJA = base `pow 1.1 spd 0.92 hp 98`; `fichas.sarpa` `pow 0.9 spd 1.15`). GAJA: GOLPE MARMA (`hs 46`, sem derrubar), VADIVU (`troca → 'sarpa'`, `S 6 A 1 R 8`, custo 0), PASSO DO ELEFANTE (`rush`, `kb 16`). SARPA: BOTE (`rush`, `low`, `rente`, `crouch`), VADIVU (`troca → null`), SALTO DA SERPENTE (`leap`, `spin`, `over`), mods próprios; `poseDaFicha` e `anim.sFire` próprios. As duas VADIVU têm os mesmos tempos (o golpe segue de onde estava).
- Os três ids são cast; exportados em `src/data/lutadores/index.ts`; não estão em `LUTADORES` nem `ROSTER`.

### Desvios do `docs/mecanicas-e3.md` (para Nova/dono decidirem)

1. **REVERS precisou de código** (a §2.3 dizia "nenhuma linha nova"). Com `through` puro a caixa de acerto (que aponta para a frente) acerta ANTES de cruzar, e o teste 4 do plano ("o que segura o trás novo bloqueia") é inalcançável. Agora: ao cruzar o x do rival o `facing` vira e só então a caixa vale. Afeta qualquer golpe `through` futuro (nenhum outro existe).
2. **`TYPE_ANIM`/`BASE_ANIM` não podem receber entradas novas**: `luta-fidelidade.test.ts` as compara chave a chave com o protótipo. As animações E3 ficaram em `TYPE_ANIM_E3`.
3. PLANCHA com `tall: 1`: no atlas provisório a pose `jumpKick` tem `tipY` alto e a caixa comum passava por cima do rival agachado; `tall` (caixa de 30 a 150 px do pé) acerta agachado e é bloqueada em pé, mas também acerta rival colado no tick da decolagem. Revisar com a arte própria (E5/E6).
4. O fouetté da PARADE NÃO acerta atacante que estava no ar (jhk): o parry anula e atordoa, mas a resposta erra (medido). Só vale para golpes de chão.
5. PROJÉTIL e GOLPE BAIXO não são parados; agarrão também não (nem passa por `applyHit`).
6. Números de alcance/dano/tempo são de PARTIDA (E6) e o alcance usa o atlas do WEI LONG (M-R7).

## PROVADO (executado, nesta sessão, no código atual do disco)

- `npm test`: **34 arquivos, 726 testes verdes + 1 `it.fails` esperado** (o #5 da Íris, metade da Lyra), **incluindo `luta-fidelidade` (lock-step contra o protótipo) e o snapshot CPU × CPU semente 42, SEM `-u`**; `git status` de `tests/unit/__snapshots__` vazio.
- `tsc --noEmit` do projeto inteiro: 0 erros (já com os testes da Íris). `npx vite build`: ok (161,38 kB).
- Testes novos: `centella-s3.test.ts` (30), `camille-s4.test.ts` (25), `nila-s5.test.ts` (20); `_kit-e3.ts` agora monta os 5 lutadores novos; `baatar-s1b.test.ts` ajustado (o teste "alvo ≠ chão falha alto" virou "chao/ar/ambos montam, desconhecido falha").
- Medido: RESORTE saindo de 480/380/280/180/100 quica em x = 60 ± 1 (tick `S + ceil(percurso / vel)`), dano estritamente crescente e igual a `(dmg + percurso × dmgPorPx) × pow` (± 1e-4), `vx` do quique = `vxBase + percurso × vxPorPx` ± 0,01, `maxDist` limita; HURACANRANA agarra no ar (1 `throw`, dano `18 × pow`, rival `down` e caindo) e erra no chão com recuperação `S + A + R = 48`; PARADE anula `lp`/`hp`/`hk`/`jhk` (vida intacta, 1 `parry`, fouetté acerta o atacante em ≤ 20 ticks com dano `12 × pow`) e NÃO para `clk`, agarrão, projétil, golpe antes de S nem a partir de S+A (janela exata `[S, S+A)`); COUP D'ARRÊT: dano `pow × 1,5` (prep), `× 1,15` (recuperação), `× 1` (parado) e `stun` = `hs + 12` só na preparação; REVERS: o sinal de `(x_camille − x_rival)` inverte em ≤ `S + A + 4`, o primeiro `hit` vem depois do cruzamento, quem segura o "trás" antigo leva e quem segura o novo bloqueia; VADIVU: troca em `mt === S`, `hp`/`maxHp` intactos, custo 0, duração `S + A + R`, round seguinte em GAJA, razão de passos 1,15/0,92 (± 1%); BOTE passa sob o orbe do HAYATO (agachada e em pé levam), é baixo (em pé defendendo leva, agachado defendendo bloqueia); MARMA `stun` = `hs`.
- CPU (referência, não é critério): decisões de 600 sementes: HURACANRANA só com rival no ar a 30 a 190 px (≈ 9%); PARADE no lugar do bloqueio em > 300 de 600 contra golpe médio de perto e 0 contra baixo/agarrão/longe; troca de ficha ≈ 30% quando a ficha não serve e 0 quando serve; em 6000 ticks CPU × CPU a CAMILLE aparou golpes e a NILA trocou nas duas direções.
- **Mutação** (mutante aplicado, teste certo reprovou, arquivo restaurado): 69 execuções (4 das correções da Íris, 20 da S3, 41 de S4/S5, 4 de reconferência), **todos mortos no fim**. Na 1ª rodada sobreviveram 3 (e 1 "tick de folga" do REVERS que provou ser redundante), mortos com teste novo: caixa do RESORTE da pose da ida (agora o teste compara a caixa), `<=` no fim da janela da PARADE (teste do tick `S + A`), recursão das fichas sem os nomes (teste da SARPA apontando para `'sarpa'`). O mutante do "tick de folga" do REVERS mostrou que a folga era redundante com o atraso natural da detecção; removi a folga em vez de deixá-la sem teste.

## NÃO provado

- Nada visto em navegador; `test:e2e` não rodado. Alcances/caixas/tempos são do atlas do WEI LONG, não valem para balanceamento.
- `npm run balanco` (E6) não existe. O fouetté contra atacante aéreo erra (desvio 4).
- Pose `sarpa*`: os nomes são premissa minha sobre a folha 5 da NILA (abaixo); nenhum quadro real foi carregado.

## PARA O PRÓXIMO

### Lyra / render (src/ui, src/render, src/input)

- **Eventos novos a tratar** (`src/render/efeitos.ts` cai no `default`; o som já está em `audio/eventos.ts`): 
  - `rebote { lutador, x }`: poeira na parede em `(x, y do chão)`.
  - `parry { atacante, defensor, x, y, texto }`: faíscas 14 brancas + rajada em `(x, y)` + o `texto` ("PARADA!"). Sai NO LUGAR de `block`/`hit`; o atacante fica em `state === 'hit'` e a CAMILLE entra no golpe `sResp`.
  - `troca-ficha { lutador, ficha }`: flash + fumaça; `ficha` null = voltou à GAJA. A leitura `LutadorLeitura.ficha` muda no mesmo tick; `chDaFicha` precisa devolver `fichas['sarpa']` (já faz) e o **HUD** pode mostrar o ícone da postura por `ficha`.
  - `hit.contraEspecial === true` (COUP D'ARRÊT na preparação): `texto` já vem "COUP D'ARRÊT!" (cor `#ffffff`, tamanho 26); efeito próprio opcional. Ausente nos demais.
  - `throw` agora também sai do HURACANRANA (rival no ar): `d.y` não muda, o rival cai em `down` com `vy > 0`.
- **`pose.flip`**: na ida do RESORTE vale −1 (corrida de costas, espelhada); na volta, 1. Quem desenha precisa honrar `flip` negativo fora do `spin` (já honra para o SALTO DA SERPENTE com `spin`).
- **Poses por golpe** (provisórias com o atlas atual; a arte própria entra pelo `anim` do def, sem código):
  - CENTELLA `anim.sFwd = { s: [prep], a: [corrida da ida, voadora da volta], r: [...] }` (hoje `sc0`, `sc0`/`sc1`); `a[1]` também define a caixa de acerto. PLANCHA e HURACANRANA usam as animações padrão de `leap`/`rise`.
  - CAMILLE `anim.sResp = { s, a, r }` (fouetté; hoje `hk0/hk1`); a PARADE usa a `sFire` base (`sa0` guarda, `sa1` desvio, `sa3` recuperação).
  - NILA: pelo mapa do `prompts-arte.md` §6.4 e a folha 5, assumi estes quadros no atlas da NILA: `sarpaIdle0..3`, `sarpaWalk0`, `sarpaWalk1`, `sarpaBlock`, `sarpaSlide0`, `sarpaSlide1`, `sarpaLeap0`, `sarpaLeap2` (e `sarpaLeap1` ainda sem uso). `LutadorDef.fichas.sarpa.poseDaFicha` mapeia: `idle0..3`, `walk0..7`, `block`/`cblock`, `crouchPunch`/`sweep` (BOTE e rasteiras), `sc0`/`sc1` (SALTO). **Se o pipeline de sprites usar outros nomes, é só ajustar `poseDaFicha` em `nila.ts`** (e `empacotar`/manifesto precisam aceitar esses nomes; hoje o carregador pega o que o manifesto trouxer).
- Para ver o kit real no `?expansao=1`: `montarLutador({ ...CENTELLA, id: cast('novo-b') }, base.ch.pd)` etc., como já dito para BAATAR/AMINU.
- Render do #5: `src/render/lutador.ts:15` (`chDaFicha`) deve usar `Object.hasOwn(ch.fichas, ficha)` (o `it.fails` do #5 só vira `it` com isso).

### Íris

- Rodar `npm test` e conferir o `.snap` intacto. Reabrir o `chefe-adversarial.test.ts`: 4 `it.fails` → `it`; o teste da "consequência" virou regressão (ver acima); o #5 segue `it.fails` por causa da render.
- Para tentar quebrar: PARADE com o atacante em `armor`/`rush`; PARADE contra golpe de vários acertos (`hits`); COUP D'ARRÊT contra MASHI segurada (`mt = S−1` conta como preparação); RESORTE com o rival atravessando o caminho da volta, com a CENTELLA encurralada (`x = 60`, momento 0) e levando golpe na ida; HURACANRANA com o rival em `armor`/`invuln` (não agarra) e com o rival no ar do outro lado do mapa; REVERS contra rival encostado na parede (não consegue cruzar) e contra rival que pula por cima; VADIVU interrompido por golpe no meio (`mt < S`: a troca NÃO acontece) e trocar de ficha com o `chefe` ativo; BOTE contra projétil baixo (ZHEN DI do WEI LONG: a hurtbox `rente` ainda leva); NILA no `?expansao=1` com o chefe.

### Órion

- `Fighter.trocarFicha` no meio de um golpe (VADIVU): o golpe segue pelo slot `sDown` da ficha nova, então as duas VADIVU PRECISAM ter os mesmos tempos. Está nos dados e coberto só por convenção (não há validação cruzada de S/A/R entre fichas): vale conferir.
- `through`/`dirCorrida`/`cruzouEm` e `reboteFase`/`momento` são estado novo do Fighter (zerados em `startMove`, `reset` e, para a fase, no 1º tick fora do golpe). `momento` fica com o valor antigo depois do golpe (só `noAtaque` o lê, e só para golpes `rebote`).
- `serveParaCombo` (cpu.ts) muda a escolha de combo só de quem declara dica `antiaereo`/`defesa`/`troca`/`espacoAtras`. O snapshot não vê (ninguém na produção declara).
- A flag `trocaDeBarraNoTick` agora é por tick: um chamador futuro que dependa dela fora de `update` precisa saber disso.
- Working tree em CRLF (`core.autocrlf`): os arquivos novos e os editados por script estão como o git os quer (os existentes mantiveram CRLF; os 3 `lutadores/*.ts` novos e `tests/unit/*` novos estão em LF).

### Vega (próximas fatias)

- Nada pendente de S3 a S5 no motor. Falta: harness `npm run balanco` (E6) e ligar os ids em `IDS_LUTADORES` (E5).

## PENDÊNCIAS

- Decisão da Nova/dono: aceitar os desvios 1 a 5 (REVERS cruzando de verdade; PLANCHA `tall`; fouetté que não acerta no ar).
- Lyra: eventos/pose acima e o `Object.hasOwn` do `chDaFicha`; nomes finais das poses `sarpa*` com o pipeline.
- Sem commit (a pedido).

## APRENDIZADO

- `luta-fidelidade.test.ts` compara `BASE_ANIM` e `TYPE_ANIM` com o protótipo chave a chave: animação de golpe novo vai para uma tabela E3 separada, não para essas duas.
- `activeMove()` é o portão da caixa de acerto: todo golpe de efeito que não bate (PARADE, VADIVU) precisa ser excluído ali, senão a caixa de dano 0 ainda atordoa o rival.
- A caixa de acerto vem da pose ativa (`anim.a[0]`, ou `a[1]` no RESORTE) × a geometria do atlas: com o atlas provisório uma pose alta (`special`, `jumpKick`) põe a caixa de um golpe BAIXO acima do rival agachado. Golpe baixo precisa de pose baixa (`sweep`) no `anim`, golpe de queda precisa de `tall`.
- `through` sozinho não faz "cruzar para o outro lado": a caixa aponta para a frente e acerta antes. Cross-up exige virar o `facing` ao cruzar e travar a caixa até lá.
- A CPU encadeia (combo) qualquer especial pagável, ignorando `ia`: dica de golpe que não serve depois de um acerto (HURACANRANA no chão, RESORTE sem corda) precisa sair do pool de combo, não só do fluxo genérico.
- Teste de "decisão da CPU" por semente (600 sementes, uma chamada de `cpuInput` com o estado montado à mão) é muito mais barato e determinístico que contar usos em 5000 ticks de CPU × CPU; o CPU × CPU fica só como teste de fumaça.
- Flag de "aconteceu neste tick" tem que zerar no INÍCIO do tick (por tick), não ser consumida pelo primeiro leitor: dois acertos no mesmo tick e chamadas diretas fora de `update` quebram as duas variantes de "consumir".
- Ferramentas: o scratchpad da sessão é compartilhado com missões anteriores (um `m2.json` antigo foi apagado ao reutilizar o nome: use nomes novos); `heredoc` do bash com aspas simples em JSON/TS longo quebrou duas vezes: use `Write` para arquivos grandes.
