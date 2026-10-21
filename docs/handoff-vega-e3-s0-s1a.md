# Handoff Vega — E3 · S0 (contratos) e S1a (primitiva do chefe)

Data: 2026-10-20. Base: `docs/mecanicas-e3.md` §3, §4, §5 e §3.6. Sem commit. Produção igual: 4 lutadores, `CHEFE` null, nada do chefe roda fora de `cfg.chefe`.

## RESULTADO

### S0 — contratos (só tipos + valores neutros publicados pelo Game)

- `src/core/contratos.ts`
  - C2: `InputFrame.spSeg?: boolean` (ausente = false; `INPUT_VAZIO` e `NO_INPUT` da CPU não mudaram).
  - `EstadoLutador` + `'cena'`; `FaseLuta` + `'cena-chefe'`.
  - `LutadorLeitura` + `barras`, `barrasMax`, `chefe`, `ficha`, `nivelCarga` (obrigatórios; neutros 1, 1, false, null, 0). `Fighter` os publica como campos simples.
  - `EventoLuta` + `fase-chefe {lutador, etapa:'troca'|'danca'|'retomada', barrasRestantes}` (único emitido hoje), `parry`, `quebra-guarda`, `carga`, `rebote`, `troca-ficha` (tipos, receita de som/efeito no comentário; emitidos nas fatias S2..S5). Evento `hit` + `contraEspecial?`.
  - O stub da Lyra foi substituído: `EventoFaseChefe` agora é o tipo real (o campo `barra` virou `etapa` + `barrasRestantes`). `ExtensaoChefeLeitura` ficou como `@deprecated` (tudo opcional) para o `hud.ts` e os testes dela compilarem sem mexer.
- `src/data/tipos.ts`: `NomeGolpe 'sResp'`; `TipoGolpe + 'carga'|'rebote'|'aparar'|'troca'`; tipos `CargaDef`, `ReboteDef`, `ParryDef`, `AgarraoDef`, `ContraDef`, `PapelIa`, `DicaIa`, `ConfigChefe`, `FichaDef`; campos opcionais em `Golpe` (`carga`, `rebote`, `parry`, `agarrao`, `contra`, `quebraGuarda`, `absorveProj`, `rente`, `vxAlvo`, `troca`, `ia`) e em `LutadorDef` (`extras.sResp`, `armadura.rankMax`, `fichas`, `chefe`). Nenhum dos parâmetros tem lógica ainda (S1b..S5).
- `src/audio/eventos.ts`: som dos eventos novos usando só métodos que o `AudioSys` já tem (`fase-chefe` troca = `fireballHit`, danca = `introWhoosh`, retomada = `fight`; os demais mapeados também). Nenhum som sintetizado novo.
- Regra "dica só gasta RNG de quem a tem": `LutadorMontado.dicasIa` (lista dos golpes com `ia`, vazia nos 4 de hoje). Em `cpuInput` (`src/fight/cpu.ts`) o ponto de plug `planoPorDica` só é chamado se `me.ch.dicasIa.length > 0`, depois de `if (!me.grounded) return inp` e antes de qualquer escolha do plano. Hoje o stub devolve null sem sortear nada. **Nenhum papel de dica está implementado**: isso é o esqueleto, os papéis entram com S1b+.

### S1a — primitiva do chefe

- `src/fight/game.ts`
  - `ConfigPartida.chefe?: boolean`. `setup`: se `cfg.chefe` e o `LutadorDef` do `c2` tem `chefe`, o P2 vira chefe (`Fighter.virarChefe`), `winsNeeded = 1` (round único com `rounds` 2 ou 3), IA própria. Se o lutador não tem `chefe`, a opção é **ignorada** (lutador normal; decisão minha, para a fixture de dev da Lyra não quebrar).
  - `resolverVidaZerada`: ordem `hp>0` → treino → **troca de barra** (`barras--`, `hp = maxHp`, `gotHits = 0`, `invuln = 60`, `hitstop = 20`, `shake = 14`, `cenaPendente`, evento `fase-chefe/troca`, retorna false) → `ko()`.
  - `applyHit` e `arremessar` regravam `hitstop/shake` depois do resolver (4-9, 6-8) e apagariam os 20/14 da troca. `reforcarTrocaDeBarra()` reaplica 20/14 (tremor respeita `ajustes.shake`) só no tick da troca. Para os demais golpes nada muda.
  - Cena: `talvezIniciarCenaDoChefe` / `andarCenaDoChefe` no fim do `passo` (depois do relógio). Gatilho: `phase === 'fight'` + `cenaPendente` + chefe no chão em `idle|walk|crouch|land`. Zera projéteis e `hitstop`, chefe em `'cena'`, `phase = 'cena-chefe'`, `t = 0`, evento `danca`. A cena zera os projéteis a cada tick (um golpe do jogador que terminava durante a cena podia soltar um). Fim: `t >= danca.duracao` → `trocarFicha(fichaFase2)`, `idle`, `phase = 'fight'`, evento `retomada`. KO ou fim de tempo no mesmo tick vencem (a fase já não é `fight`).
  - `endRound`: `perfect` agora exige também `w.barras === w.barrasMax` (1 === 1 nos normais, nada muda; o chefe que ganhou depois de perder uma barra não é "perfeito"). `bonusVitoria` soma ao vencedor quando o perdedor tem `cfgChefe`.
  - Todo `startRound` reaplica o perfil de CPU da fase 1.
- `src/fight/fighter.ts`: `barrasMax`, `chefe`, `cfgChefe`, `cenaPendente`, `perfilIa`, `ficha`, `nivelCarga`; `virarChefe(cfg)`; `trocarFicha(nome|null)` (não mexe em `hp/maxHp`; nome desconhecido lança erro); `setChar` desfaz chefe/ficha (o `Game` é reaproveitado entre lutas); `reset` volta para a ficha base (`fichaBase`, = `fichaFase1` no chefe), `maxHp = hpPorBarra`, `barras = barrasMax`. `case 'cena'` no `update` (parado + física) e no `poseT` (`devekh0..2` em terços de `danca.duracao`).
- `src/data/montar.ts`: `LutadorMontado.fichas` (cada ficha é um `LutadorMontado` completo sobre as mesmas poses, sem fichas/chefe próprios), `dicasIa`, e `extras.sResp` montado como golpe com caixa. `LutadorMontado` agora é `Omit<LutadorDef,'fichas'> & {...}` (o `fichas` do def e o montado têm tipos diferentes).
- `src/fight/cpu.ts`: `PerfilCpu`, `IA_CHEFE` (+0,15 react/block; fase 2 aggr 1, anti +0,2) e `perfilChefe(nivel, fase2)`, fora de `AI_LEVELS`. `cpuInput` usa `me.perfilIa ?? AI_LEVELS[nivel]` (idêntico para quem não é chefe). Números de partida; ajuste no harness/dono.
- Testes: `tests/unit/chefe-e3.test.ts` (32 testes: neutros do C3, regra do RNG, montagem, setup, IA, troca de barra pelo golpe real e direta, cena exata de 90 ticks, KO/tempo no mesmo tick, round único com rounds 2 e 3, desempate por `vidaTotal`, empate, bônus, perfeito, treino). BAATAR é provisório (dados de teste sobre o atlas do WEI LONG, fora de `LUTADORES`). Ajuste de uma linha em `tests/unit/render-luta.test.ts` (o helper de leitura ganhou os 5 campos neutros).

## PROVADO (executado)

- `npm run typecheck`: limpo.
- `npm test`: 24 arquivos, 430 testes verdes. Inclui `luta-fidelidade` (lock-step contra o protótipo) e o snapshot de CPU x CPU semente 42, **sem `-u`**; `git diff` do `.snap` vazio.
- `npm run build`: ok.
- Mutação (cada uma reprovou o teste certo e foi desfeita): sem limpar projétil na cena; sem `reforcarTrocaDeBarra` no `hit`; cena 1 tick curta; gatilho da cena sem checar `phase === 'fight'`; sem `winsNeeded = 1`; `perfect` sem checar barras.
- NÃO rodei `test:e2e` (é da Lyra). Nada visto em navegador. As caixas/alcance do BAATAR provisório são as do WEI LONG: não valem para balanceamento.

## PARA O PRÓXIMO

### Lyra (HUD de barras e cena, E4)

- `LutadorLeitura.barras / barrasMax / chefe` são reais e obrigatórios (neutros 1, 1, false). `maxHp` é o `hpPorBarra` (75 na proposta) e `hp` é a barra ATUAL. Na troca, `hp` salta para cheio e `hpShown` acompanha **no mesmo tick** (regra do `passo`): a animação "barra nova enchendo" tem que ser da render, disparada pelo evento.
- **`fase-chefe` agora sai em 3 etapas** (`troca`, `danca`, `retomada`). O `ui/cenas/fight.ts` (linhas ~170-172) chama `aoFaseDoChefe` (flash + "FASE 2!") em **qualquer** `fase-chefe`: precisa filtrar `ev.etapa === 'troca'`, senão dispara 3 vezes. `danca` liga a escurecida do céu/faixa; `retomada` desliga. O evento da troca sai **antes** do `hit` do mesmo tick. O som dos três já toca pelo `reagirAosEventos` (mapeamento em `audio/eventos.ts`).
- `phase === 'cena-chefe'`: relógio parado (`timer` constante), `t` vai de 0 até `duracao` (90; lê-se em `elenco[id].ch.chefe.danca.duracao`), sem acertos, `projectiles` vazio, chefe com `state === 'cena'` e pose `devekh0..2`. Com o atlas atual (sem folha B9) o `getPD` cai em `guard`, não quebra. O jogador não recebe entrada nesse período.
- `winsNeeded === 1` na luta de chefe: 1 marcador de round.
- **`ficha`** (string|null): a render precisa usar `elenco[id].ch.fichas[ficha]` (quando não for null) em `getPD` e nas cores `fire`. O `Fighter.ch` já é a ficha ativa, mas a render lê o `elenco`, não o `Fighter`. Sem isso o chefe é desenhado com a ficha base (a fase 2 troca `fire`, `pow`, `spd`).
- `Fighter.chefe/barras/barrasMax` são campos comuns: o hook do e2e `expansao.spec.ts` que faz `delete f.barras` continua funcionando (volta ao `?? 1` do `hud.ts`).
- Fora da luta de chefe nada muda: o Game publica 1, 1, false, null, 0.
- Pendente seu: `input/teclas.ts` `ler()`/`lerMesclado()` produzir `spSeg` (`segurada.has(mapa.sp)`); só a S2 (AMINU) lê, não bloqueia nada agora.

### Íris
- Rodar `npm test` e conferir `.snap` intacto. Pontos duvidosos para tentar quebrar: chefe em estado raro quando a barra troca (no ar, em golpe com armadura, durante `throw`); jogador com projétil no ar na entrada da cena; troca de barra por `arremessar` (só o caminho `applyHit` tem teste pelo golpe real; o do arremesso tem a reforço do hitstop mas não um teste que o exercite).

### Órion
- `reforcarTrocaDeBarra` (estado `trocaDeBarraNoTick` no Game): garantir que não vaza entre ticks se algum chamador futuro de `resolverVidaZerada` esquecer de chamá-lo (hoje só `applyHit`/`arremessar` chamam o resolver; chamada direta, como nos testes, deixa a flag ligada até o próximo reforço; inofensivo, mas é estado escondido).
- Decisão minha a revisar: `perfect` agora depende de `barras === barrasMax`.

### Vega (próximas fatias)
- S1b: `armadura.rankMax`, `agarrao`, `vxAlvo`, primeiros papéis de dica (pluga em `planoPorDica`).
- `LutadorDef.fichas[x].alias` (alias de POSE por ficha, ex.: `idle0 → sarpaIdle0`, usado pela NILA) NÃO foi feito: a S1a só precisa de atributos/golpes por ficha. Entra na S5.

## PENDÊNCIAS

- Nenhum bloqueio. Números do chefe (`hpPorBarra` 75, `duracao` 90, `bonusVitoria`, `IA_CHEFE`) são os da proposta/valores de partida, a ajustar no harness (E6) e com o dono. O `LutadorDef` do BAATAR real (com `chefe`) só existe quando entrar na E5; até lá `cfg.chefe` com os 4 lutadores é ignorado.
- Sem verificação em navegador.

## APRENDIZADO

- Quando `applyHit`/`arremessar` regravam `hitstop/shake` depois de `resolverVidaZerada`, qualquer efeito definido dentro do resolver é sobrescrito sem erro. Vale para o próximo gancho no mesmo ponto: ou reaplicar no fim do chamador (como fiz, com flag) ou mover o efeito para o chamador. Não "corrigir" tornando `hitstop = max(...)` em geral: muda o lock-step quando dois golpes acertam no mesmo tick.
- `Game` e `Fighter` são reaproveitados entre lutas: todo estado novo de chefe/ficha tem que ser desfeito em `setChar`, senão a luta normal seguinte herda (há teste).
- Teste de "no mesmo tick" precisa montar o tick de verdade (zerar `hitstop`, forçar `tick60 = 59`); o primeiro rascunho do teste de fim de tempo passava a fase errada e só falhou na primeira execução. Para provar a regra: mutar o código e ver o teste cair.
- A dica de CPU é só um stub guardado por `dicasIa.length`; a prova de que ela não altera o RNG é um teste com um `Proxy` contando sorteios (mesma contagem com e sem `ia` no golpe) mais o snapshot.
