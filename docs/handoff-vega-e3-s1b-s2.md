# Handoff Vega — E3 · S1b (kit do BAATAR) e S2 (AMINU)

Data: 2026-10-21. Base: `docs/mecanicas-e3.md` §2.1, §2.5, §3, §5, §6, §9 e `docs/handoff-vega-e3-s0-s1a.md`. Sem commit. Produção igual: 4 lutadores em `LUTADORES`/`ROSTER`, `CHEFE` null. BAATAR e AMINU existem só como definições de dados (`src/data/lutadores/baatar.ts`, `aminu.ts`), montadas nos testes sobre o atlas do WEI LONG.

## RESULTADO

### Motor (campo ausente = código antigo intacto)

- `src/fight/fighter.ts`
  - `canThrow(golpe?)`: alcance de `golpe.agarrao.alcance` (default 108, alvo sempre o chão). `resolveAttack` e a CPU seguem chamando sem argumento.
  - Gatilho do agarrão em `updateMove`: sem `agarrao.janela` testa só em `mt === S` (igual a antes). Com janela testa a cada tick de `[S, S + janela)` até agarrar uma vez; `hitDone` marca "já agarrou" (golpe `throw` nunca usa caixa de acerto) e a corrida do `rush` freia a 30% pelo resto da janela (regra que já existia para `hitDone`).
  - `vxAlvo` (só `leap`/`rise`): `vx = clamp((x do rival − x) / vxAlvo, ±|mv.vx|)` em `mt === S`; teto 16 se `vx` ausente.
  - Carga (`tickDaCarga`): em `mt === S−1` com `inp.spSeg`, o golpe fica parado ali e soma 1 em `carga` por tick (o tick que chega a S−1 já conta); soltar `spSeg` ou chegar a `carga.max` deixa o `mt` andar. Nível = maior i+1 com `carga >= niveis[i]`. Um toque sem segurar sai como nível 1. Anda a `hdir × WALK_SPEED × spd × carga.andar` enquanto segura (sem `adv`). `nivelCarga` (campo publicado no `LutadorLeitura`) vale 0 fora do golpe `carga`, 1..3 de S−1 até o fim do golpe; zera em `endMove`, `setChar`, `reset` e no tick seguinte a qualquer saída do golpe (acertado, derrubado). `pose.glow = carga / max` durante a preparação e depois de soltar.
  - Eventos `carga`: nível 1 ao começar a segurar, depois a cada subida (2, 3). Toque não emite.
  - `EstadoIa` ganhou `segurar` e `reacao` (estado de CPU, recriado em `reset`).
- `src/fight/game.ts`
  - `noAtaque(mv, atacante)`: `carga.porNivel[nível−1]` sobrescreve `dmg`, `kd`, `quebraGuarda` (mesma ordem de operações; sem `carga` nada muda). `AtaqueAcerto` ganhou `quebraGuarda` e `rank`.
  - Armadura por rank (`applyHit`): com `d.ch.armadura.rankMax` só absorve `mv.rank <= rankMax`; projétil (sem rank) e golpe forte interrompem. Sem `armadura` no def, qualquer golpe é absorvido como sempre.
  - Quebra-guarda (ramo `blocked`): mesmo raspão, mas o defensor vai para `hit` com `stun = quebraGuarda`, hitstop 6, shake 9 (0 se `ajustes.shake` desligado) e sai o evento `quebra-guarda` no lugar de `block`.
  - Absorção (`resolveHits`, laço de projéteis): defensor em golpe `absorveProj`, `mt` em `[S, S+A)`, projétil de frente (`pr.dir === −d.facing`) que toca a hurtbox: `life = 0` e evento `clash` em `(pr.x, pr.y)`; sem dano, sem shake.
  - `arremessar(a, d, golpe?)`: dano `(golpe?.agarrao?.dmg ?? 12) × pow`.
  - Correção de passagem (S1a): `clearFx` agora zera `trocaDeBarraNoTick`. A flag vazava para o round/luta seguinte quando `resolverVidaZerada` era chamado sem `applyHit`/`arremessar` (risco que eu mesmo anotei no handoff anterior; a Íris o provou em `chefe-adversarial.test.ts`).
- `src/fight/cpu.ts` (RNG: ver "Provado")
  - `planoPorDica`: papéis `pressao` e `aproximar`: se o golpe é pagável e o rival está no `alcance`, sorteia `rnd() < 0.4 × aggr` (`CHANCE_DICA`, valor de partida) e usa o golpe; com `segurar`, sorteia N em `[mín, máx]` e mantém `spSeg` por `S−2+N` ticks (N ticks de carga). Um tick de plano só; depois, plano novo. Fora do alcance ou sem energia: nenhum `rnd`.
  - `defesa-projetil`: na reação a projétil, o ramo "bloquear" vira "levantar o escudo" (`ai.reacao`, espera o projétil chegar para a janela ativa cobrir o impacto). Não sorteia nada além dos dois `rnd()` que já existiam.
  - Golpe com `ia` sai dos ramos genéricos de `sFire/sDown/sFwd` (`livre()` = `canAfford && !ia`); sem dica `livre` é `canAfford`, nenhuma conta nova. Mudança de comportamento só para quem declara dica (ex.: o BAATAR não joga o ARREMESSO de 300 px).
- `src/data/montar.ts`
  - ESP que não é projétil (`sFire.type !== 'fire'`, sem `proj`) monta com `proj` neutro (`dmg 0`, só para `ch.proj.cost`/barra de energia). `type: 'fire'` sem `proj` continua erro.
  - Falham alto no boot: `agarrao.alvo` ≠ `'chao'` (S3), `agarrao` sem `throw: 1`, `vxAlvo` fora de `leap`/`rise`, `type: 'carga'` sem `carga`, `carga` inválida (1 a 3 níveis, `niveis[0] = 0`, `porNivel` do mesmo tamanho, `max > 0`), `carga` com `S < 2`.
- `src/data/tipos.ts`: só comentários (semântica de `AgarraoDef`, `vxAlvo`, `DicaIa`).

### Dados

- `src/data/lutadores/baatar.ts` (`BAATAR`, `MERGULHO_DA_AGUIA`): jogável (`hp 118`, `pow 1.18`, `armadura: { rankMax: 2 }`, `armor: 1` em `hp hk chp chk` e nos 3 especiais) + `fichas.chefe` / `chefe2` (MERGULHO no `sFwd`) + `chefe` (2 barras de 75). ARREMESSO (`sFire`): `throw`, `agarrao { alcance 162, dmg 22 }`, `R 36`. QUEBRA-BASE (`sDown`): `low`, `kd`. ABRAÇO (`sFwd`): `rush`, `throw`, `agarrao { alcance 96, dmg 20, janela 16 }`, `armor`. MERGULHO: `leap`, `vy −17`, `vxAlvo 40`, `vx 20` (teto), `over`, `kd`, `lag 26`.
- `src/data/lutadores/aminu.ts` (`AMINU`): `pow 1.06 spd 0.98 hp 102`. MASHI (`sFire`, `type: 'carga'`): `S 10 A 5 R 20`, `max 90`, `niveis [0,30,70]`, `andar 0.35`, `porNivel [dmg 8 | dmg 15 + kd | dmg 22 + kd + quebraGuarda 40]`. GARKUWA (`sDown`): `S 5 A 20`, `absorveProj`. PASSO DO LEÃO (`sFwd`): `rush`, `kb 14`.
- Os dois ids são cast (`'baatar'`, `'aminu'` como `IdLutador`): o id entra de verdade em `IDS_LUTADORES` na E5. Exportados em `src/data/lutadores/index.ts`; não estão em `LUTADORES` nem `ROSTER`.
- Desvios dos números do plano (para o dono/Nova decidirem):
  - **ABRAÇO `alcance` 96, não 70.** O rival nunca fica a menos de `corpo + corpo` = 78 px do BAATAR (`separate`), então 70 nunca agarraria. Regra geral: `agarrao.alcance` de golpe corpo a corpo tem que ser > 78.
  - ABRAÇO: `vx 9`, `A/janela 16` e dica `alcance [110, 260]` (o plano dizia [120, 320]): é o que a corrida de fato cobre (S 12, 16 ticks a 9 px).
  - `bonusVitoria 5000` do chefe é placeholder (E6 com o dono).
  - `stage` de BAATAR (`kr`) e AMINU (`br`) são provisórios; poses usadas são as que todo atlas resolve (a arte própria é da E5).

### Testes novos

- `tests/unit/baatar-s1b.test.ts` (25) e `tests/unit/aminu-s2.test.ts` (28), helper `tests/unit/_kit-e3.ts`. Ajuste de uma linha em `tests/unit/chefe-e3.test.ts` (o teste "dica não altera o RNG" agora usa dica com `alcance [5000, 6000]`, fora de qualquer alcance; antes dependia de o papel não existir).
- Medido (não "parece certo"): níveis 1/1/2/2/3/3 para 0/29/30/69/70/200 ticks; soltura automática no tick 90; `mt` parado em S−1; deslocamento carregando ≤ 60 × WALK_SPEED × spd × andar + 1; dano por nível = `porNivel[i].dmg × pow`; nível 3 vs rival bloqueando = `hit` com `stun === 40`, 1 `quebra-guarda`, raspão ≤ 12%; níveis menores = `block`; GARKUWA com a bola chegando em mt 8, 15 e 21 (janela [5,25)): `clash`, vida intacta; chegando em mt 1, 31 ou por trás: dano e nenhum `clash`; armadura contra `lp` (evento `armor`, golpe segue) e `hk`/`chk`/projétil interrompem; sem `armadura` no def o `hk` é absorvido; ARREMESSO a 150 px agarra (dano `22 × pow`), a 170 erra, recuperação medida = `S + A + R` = 53 game-ticks nos dois casos, inbloqueável; ABRAÇO agarra no primeiro tick com distância < 96 dentro da janela; contra `lp` repetido segue e agarra, contra `chk` para; MERGULHO a 100/300/600 px pousa a ±20 px do x de decolagem, tempo de voo medido bate com `vxAlvo` ±1, e o teto de velocidade morde a 840 px.

## PROVADO (executado, nesta sessão, no código atual do disco)

- `npm test`: 29 arquivos verdes e `tests/unit/chefe-adversarial.test.ts` (da Íris, em andamento, não é meu) com 1 falha nesta última execução (outra execução anterior dava 7; varia porque ela está editando). Os 636 testes restantes passam, incluindo `luta-fidelidade` (lock-step contra o protótipo) e o snapshot CPU × CPU semente 42, **sem `-u`**; `git status` do `__snapshots__` vazio.
- `tsc --noEmit`: nenhum erro em `src/` nem nos meus arquivos de teste. **`npm run typecheck` e `npm run build` estão VERMELHOS por causa de `tests/unit/chefe-adversarial.test.ts` da Íris** (`LIVRES` não usado, `Type '3' is not assignable to type '2'` em `ConfigChefe.barras`). `npx vite build` sozinho (sem o `tsc`) passa: 155,83 kB.
- Mutação (mutante aplicado, teste certo reprovou, arquivo restaurado): 35 mutantes, 33 mortos.
  - S1b (13, todos mortos): armadura sem rank; armadura contando projétil como rank; alcance fixo 108; dano fixo 12; janela ignorada; janela sem `hitDone`; `vxAlvo` ignorado; `vxAlvo` sem teto; CPU sem o plug de dicas; `livre` = `canAfford`; dica ignorando `alcance`; montar aceitando `alvo: 'ar'`; montar aceitando `agarrao` sem `throw`.
  - S2 (22, 20 mortos): nível sempre 1; sem auto-solta; `mt` não segura; sem andar; andar sem o fator; dano/`kd`/`quebraGuarda` por nível ignorados; `quebrou` desligado; absorção ignorando direção, início ou fim da janela, ou sem `clash`; CPU sem `spSeg`; CPU sem escudo; carga que não zera ao ser acertado; sem glow na preparação e depois de soltar; sem evento `carga`; dica sem sorteio do `segurar`.
  - Sobreviventes: `quebrou = quebraGuarda !== undefined` no lugar de `> 0` (mutante equivalente: nenhum dado usa 0); `zerarCarga()` em `startMove` (era redundante com a limpeza do tick seguinte e com `endMove`: removi o código em vez de deixar sem teste).
- CPU medida (não é critério de aceite, é referência): AMINU nível 2 contra o HAYATO parado, 5000 ticks, sementes 33/7/90: MASHI 34/34/30, dos quais chegam a nível >= 2 em 33/25/28 e a nível 3 em 9/8/7 (o critério de 30% do harness da E6 está folgado). Contra a bola de trovão do HAYATO a cada 45 ticks, 6000 ticks: 36 a 38 `clash` por escudo. BAATAR nível 2: 9 a 12 ARREMESSOS e 24 a 27 ABRAÇOS em 4000 ticks, todos dentro do alcance da dica.

## NÃO provado

- Nada visto em navegador; `test:e2e` não rodado (é da Lyra). Alcances, caixas e tempos do BAATAR/AMINU são os do atlas do WEI LONG: não valem para balanceamento (M-R7).
- O `?expansao=1` (`src/ui/dev-expansao.ts`) é da Lyra e usa ids falsos; eu não toquei.
- `npm run balanco` (E6) não existe ainda.

## PARA O PRÓXIMO

### Lyra / render (src/ui, src/render, src/input)

- **Eventos que a render ainda ignora** (`src/render/efeitos.ts` cai no `default`): `quebra-guarda` e `carga`. Receita (já no comentário de `contratos.ts`): `quebra-guarda` = faíscas 12 vermelhas + rajada grande em `(x, y)` + o `texto` ('GUARDA QUEBRADA!'); sai NO LUGAR de `block` (não há `block` nem `hit` no mesmo acerto), o defensor entra em `state === 'hit'`. `carga` (`nivel` 1..3): pulso de brilho e apito crescente (o som já está mapeado em `audio/eventos.ts`).
- `clash` também sai agora da GARKUWA (sem dono no evento; é o mesmo `faiscas` branco + estrela de sempre; não mexe no shake).
- `LutadorLeitura.nivelCarga` é real (0 fora do MASHI; 1..3 de S−1 até o fim do golpe). `fighters[i].pose.glow` (0..1) já alimenta o brilho do punho em `render/lutador.ts:47`; vale por toda a preparação e continua depois de soltar, até o golpe acabar. Para uma barrinha de carga no HUD basta `nivelCarga` (níveis discretos); o contínuo não é publicado.
- `spSeg` já sai de `input/teclas.ts` (conferi as linhas 51 e 77). Para o e2e: segurar o ESP por N quadros depois do golpe começar; contar a partir de `mt = S−1` (10−1 = 9 ticks depois do toque) para cair em 30 / 70.
- Poses (E5): MASHI usa `anim.sFire` do def (hoje `hp0/hp1`); ABRAÇO e MERGULHO usam a animação padrão de `rush`/`leap` (`sc0`/`sc1`, que resolvem para `crouch`/`punch`/`jumpKick` do alias). Para as poses `dive0-1` do MERGULHO basta `anim: { sFwd: { s: ['dive0'], a: ['dive1'], fall: 'dive1' } }` dentro de `fichas.chefe2` (a ficha aceita `anim`); não precisa de código.
- Fixture de dev: `BAATAR` e `AMINU` exportados de `data/lutadores` são `LutadorDef`; para ver o kit real no `?expansao=1` basta `montarLutador({ ...BAATAR, id: cast('chefe-x') }, base.ch.pd)` (e `AMINU` em `'novo-a'`) no lugar de copiar o molde. O `chefe-x` com `cfg.chefe` já usa as fichas e a cena da S1a.

### Íris

- Rodar `npm test` e conferir o `.snap` intacto. O teste dela em `chefe-adversarial.test.ts:528` (`it.fails` "a flag também não atravessa um novo setup") **passou a passar** com a correção do `clearFx` (o vitest acusou "Expect test to fail"): se ainda for `it.fails`, precisa virar `it`. O de chamada direta SEM novo setup (linha ~525) é outro caso: a flag continua ligada até o próximo `applyHit`/`arremessar`; decisão de projeto adiada (ver Órion).
- Para tentar quebrar: MASHI com `hitstop` (o freeze do hit no meio do carregamento); carregar encostado na parede; ABRAÇO com o rival já no canto (`separate` + `d.x = clamp(...)` no `arremessar`); GARKUWA contra projétil que nasce dentro da hurtbox; BAATAR na ficha da fase 2 usando MERGULHO com o rival em `down` ou no ar; CPU de BAATAR com pouca energia (as dicas dependem de `canAfford`); ARREMESSO com o rival `invuln` (não agarra, só erra).

### Órion

- `hitDone` reaproveitado como "já agarrou" na janela do agarrão: seguro porque golpe `throw` nunca passa por `resolveHits`; confira se algum caminho futuro o limpa no meio da janela.
- Limpeza da carga no topo de `corpoDoUpdate` em vez de em cada saída do golpe (`applyHit`, `knockdown`, `arremessar`...): é de propósito (um ponto só), mas o nível publicado no tick do acerto ainda vale o do golpe interrompido; some no tick seguinte.
- `reforcarTrocaDeBarra` (S1a) continua com estado escondido entre `resolverVidaZerada` e o chamador; agora não vaza entre rounds/lutas (`clearFx`), mas um chamador futuro que esqueça de reforçar ainda deixa a flag ligada até o próximo reforço.
- CRLF: o working tree do projeto está em CRLF (`core.autocrlf`); as ferramentas de edição devolveram LF em alguns arquivos e converti de volta `cpu.ts` e `lutadores/index.ts`. Os arquivos novos estão em LF (o git normaliza).

### Vega (próximas fatias)

- S3 (CENTELLA): `agarrao.alvo: 'ar'` já tem o tipo e a recusa em `montar.ts` (`validarParametrosE3`); implementar em `canThrow` e tirar a recusa no mesmo passo. `rebote` e as dicas `antiaereo`/`espacoAtras` entram em `planoPorDica`.
- O papel `defesa` (S4) e `troca` (S5) seguem sem implementação; `planoPorDica` ignora o que não conhece.

## PENDÊNCIAS

- Decisão do dono/Nova: confirmar o `alcance` 96 do ABRAÇO e a faixa [110, 260] da dica; `bonusVitoria`.
- `npm run typecheck`/`build` voltam a ficar verdes quando a Íris acertar `chefe-adversarial.test.ts` (não mexi no arquivo dela).

## APRENDIZADO

- `agarrao.alcance` é distância entre os `x`; com a separação mínima de 78 px (`corpo + corpo`) um alcance < 78 nunca agarra e nenhum teste de "o parâmetro foi lido" pegaria isso. O teste de contato (agarra no primeiro tick com distância < alcance dentro da janela) é o que expõe.
- Estado "preso no tempo" (carga segura `mt` em S−1) interage com qualquer coisa que avança por `mt` (`adv`, `rush`, brilho): cada uma precisou de um guarda explícito. Ao criar outro golpe que segura o `mt`, revisar `updateMove` inteiro, não só o ramo novo.
- Dica de CPU que sai do fluxo genérico (`livre`) muda o comportamento só de quem declara `ia`; o snapshot não vê isso (ninguém declara hoje), então a prova de "não gasta RNG" é o teste do Proxy com dica fora do alcance mais o snapshot. Dica fora do alcance tem que testar em golpe que o fluxo genérico NÃO filtra (um normal), senão o `livre` mascara a comparação.
- Teste com `Proxy` de contagem e dica `pressao` dentro do alcance deixou de valer como "não muda o RNG" no momento em que o papel passou a existir: qualquer fatia que implemente um papel precisa reescrever o teste da S0 (fiz).
- Dois agentes no mesmo working tree: `npm run typecheck` e `build` dependem de arquivos de teste alheios em andamento. Para provar o meu, filtrei o `tsc` por caminho e rodei `vite build` direto; registrar isso no handoff em vez de dizer "verde".
