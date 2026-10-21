# InnoFighters — Mapa de mecânicas da E3 (para a Vega implementar)

Autora: Nova · 2026-10-20 · Status: **especificação, nada implementado**.
Base: código real de `src/fight/` lido nesta data (as linhas citadas são de hoje e podem andar), `docs/plano-expansao.md`
(§2), `docs/proposta-expansao.md` (§2.3–2.5), `docs/prompts-arte.md` (§6–7), `docs/handoff-vega-e1a.md` e as decisões
aprovadas no `PROGRESSO.md`.

---

## 0. A regra "no máximo 1 mecânica nova por lutador", definida de forma verificável

Sem uma definição, a regra vira opinião. Uso esta:

- **Primitiva** (no máximo 1 nova por lutador): introduz **fluxo ou estado novo** no motor. Isso inclui um `type` de
  golpe com lógica própria em `updateMove`, um estado que dura além de um golpe, um gancho que intercepta
  `applyHit`/`resolveHits` e dispara outra ação, ou um campo novo no C2.
- **Parâmetro** (permitido, cada um com teste): campo novo, com default neutro, lido **num ramo que já existe** e que
  só escolhe entre resultados que o motor **já sabe produzir** (bloqueio vira atordoamento, projétil some como num
  choque, alcance diferente). Não cria estado persistente.
- **Reuso:** uma primitiva construída para um lutador pode ser reaproveitada por outro sem contar como nova para ele.
- **Portão de toda mudança:** `tests/unit/luta-fidelidade.test.ts` e o snapshot de `tests/unit/fight.test.ts`
  verdes **sem atualizar o snapshot**. Campo ausente = código antigo intacto. A CPU **não pode consumir chamadas extras
  de RNG** para lutadores sem dica `ia` (senão o snapshot de CPU × CPU com semente 42 muda).

### 0.1 O que já existe no motor (achado lendo o código, não suposto)

| Já existe | Onde | Consequência |
|---|---|---|
| Contragolpe universal: `counter = d.state === 'move'` → +15% de dano e texto COUNTER! | `game.ts:525`, `colisao.ts:55` | o COUP D'ARRÊT da CAMILLE é só um **parâmetro** sobre isso |
| Armadura por golpe (`armor:1`, janela `S + A`) | `fighter.ts:279`, `game.ts:526` | a armadura do BAATAR é a mesma regra com **filtro de rank** (parâmetro) |
| Agarrão em golpe (`throw:1`, testado em `mt === S`) | `fighter.ts:461`, `canThrow` em `:249` (alcance fixo 108, alvo no chão) | agarrão de comando, aéreo e de investida são **parâmetros** de alcance, alvo e janela |
| Atravessar o rival (`through:1` → `passing` desliga o empurrão) | `fighter.ts:506`, `game.ts:422` | o REVERS da CAMILLE é dado puro (nenhum lutador atual usa `through`: precisa de teste próprio) |
| `PoseAtual.glow` e `PoseAtual.flip` no C3 | `contratos.ts:114` | o brilho da carga e a corrida de costas do RESORTE não pedem campo novo de pose |
| Choque de projéteis (`clash`: projétil some + evento) | `game.ts:480` | a absorção da GARKUWA reusa o evento `clash`, sem tipo novo |
| Desempate por `vidaTotal`, `resolverVidaZerada`, `corpo`, `barras` | E1a (`game.ts:603`, `fighter.ts:60/122/126`) | o chefão pluga num ponto único |

### 0.2 Limitações do motor que cortam ideias da proposta

- **C2 só tem borda de descida** nos botões (`sp` é true num tick só; `contratos.ts:13`). "Segurar ESP" exige um campo
  novo de botão segurado. As teclas virtuais já sabem disso (`input/teclas.ts`, `segurada`), então o custo é baixo.
- **Não há especial no ar:** `resolveAttack` devolve `null` para `sp` fora do chão (`fighter.ts:235`). Corta o
  "no ar vira mergulho" da PLANCHA.
- **3 especiais por lutador** (`EspeciaisLutador = Record<'sFire'|'sDown'|'sFwd', Golpe>`) e ED10 (sem super). Corta o
  "↓↓+ESP com medidor cheio" do BAATAR jogável.
- **Não existe rival em "preparação" à parte:** o contragolpe atual vale em qualquer fase do golpe (preparação, ativa ou
  recuperação). Separar preparação é parâmetro (`d.mt < golpe.S`).
- **A render resolve a pose pelo nome lógico** (`getPD(elenco[id].ch, nome)` em `render/lutador.ts:19`). Se a luta trocar
  a ficha do lutador (postura, fase 2), a render precisa saber **qual ficha** está ativa. Daí o campo `ficha` no C3 (§4).

---

## 1. Reconciliação: as 14 mecânicas do Apolo × o catálogo

| # | Mecânica (proposta §2.5) | Quem | Veredito | Classe | Implementação |
|---|---|---|---|---|---|
| 1 | Segurar e soltar (carga em níveis) | AMINU | **ENTRA** | primitiva `carga` | §2.1 |
| 2 | Quebra-guarda | AMINU | **ENTRA** | parâmetro `quebraGuarda` | §2.1 |
| 3 | Absorção de projétil | AMINU | **ENTRA simplificada**: o projétil some, **sem** virar +1 nível de carga | parâmetro `absorveProj` | §2.1 |
| 4 | Salto na borda (CORDAS) | CENTELLA | **CORTADA** (ver ED-M2) | (seria primitiva) | — |
| 5 | Agarrão aéreo | CENTELLA, BAATAR | **ENTRA** para CENTELLA; no BAATAR o mergulho vira golpe de corpo (§3.4) | parâmetro `agarrao.alvo` | §2.2 |
| 6 | Momento por distância | CENTELLA | **ENTRA** dentro do RESORTE | parte da primitiva `rebote` | §2.2 |
| 7 | Postura de contra-golpe | CAMILLE | **ENTRA** | primitiva `aparar` | §2.3 |
| 8 | Bônus de contra-golpe | CAMILLE | **ENTRA** como reforço do contragolpe que já existe | parâmetro `contra` | §2.3 |
| 9 | Troca de postura | NILA | **ENTRA** reusando a troca de ficha do chefão (ver ED-M1) | reuso de `troca de ficha` | §2.4 |
| 10 | Estado negativo temporizado (MARMA) | NILA | **CORTADA**: estourava o limite (ver ED-M1); o GOLPE MARMA vira golpe de atordoamento longo | — | §2.4 |
| 11 | Agarrão de comando | BAATAR | **ENTRA** | parâmetro `agarrao.alcance/dmg` | §3.4 |
| 12 | Armadura por rank | BAATAR | **ENTRA** | parâmetro `armadura.rankMax` | §3.4 |
| 13 | Fase por vida + cinemática | BAATAR | **ENTRA**: gatilho = troca de barra (2 barras = os "50%" do Apolo) | primitiva do chefão `barras + cena + troca de ficha` | §3 |
| 14 | Salto com alvo | BAATAR | **ENTRA**, sem o agarrão na queda | parâmetro `vxAlvo` | §3.4 |

Também cortado, fora da tabela do Apolo: "PASSO DO LEÃO mantém a carga" e "encadeia para MASHI" (especial de rank 9 não
cancela: `fighter.ts:478`; a ligação sai por vantagem de quadros, a medir), "PLANCHA no ar", "QUEBRA-BASE deixa mais tempo
no chão no canto", "ABRAÇO perde para golpe baixo" (fica só a regra única de armadura por rank) e o DEVEKH/MERGULHO no
BAATAR jogável.

**Saldo:** 4 primitivas novas (`carga`, `rebote`, `aparar`, `barras+cena+ficha`), uma por lutador, mais a NILA reusando
a do chefão. Os 9 parâmetros novos são `quebraGuarda`, `absorveProj`, `agarrao{alcance,dmg,alvo,janela}`, `contra`,
`rente`, `armadura.rankMax`, `vxAlvo` e o campo C2 `spSeg`. **Nenhum lutador novo tem projétil**, então não há estilo
novo de projétil para a Lyra desenhar.

---

## 2. Por lutador: o que entra, onde pluga, o que muda em C3, dica de CPU e testes medidos

Convenção dos testes: rodam em Node com `Game` sem render (como `motor-n-lutadores.test.ts`), entradas roteirizadas por
`FonteEntradas` e boneco de treino (`DummyTreino`). "Medido" = o teste lê ticks, posições e vida do estado da luta e
compara com o número esperado, nunca "parece certo". Enquanto a arte não chega, cada lutador roda como **provisório**:
os dados novos sobre o atlas de um lutador atual (só em teste e em dev).

### 2.1 AMINU — primitiva `carga` + `quebraGuarda` + `absorveProj`

**Kit:**

| Slot | Golpe | Classe |
|---|---|---|
| ESP | MASHI: segurar carrega 3 níveis, soltar dispara; nível 3 quebra a guarda | `type: 'carga'` + `quebraGuarda` no nível 3 |
| ↓+ESP | GARKUWA: palma-escudo; por ~20 ticks, projétil **frontal** que tocar some (evento `clash`) | melee com `absorveProj: 1` |
| →+ESP | PASSO DO LEÃO: investida com escudo e empurrão forte | `type: 'rush'` (existente), `kb` alto |

**Pontos de plug:**

- **C2:** `InputFrame.spSeg?: boolean` (opcional, para não tocar nos quadros do protótipo nos testes de fidelidade).
  - Produzido em `input/teclas.ts` `ler()` e `lerMesclado()` a partir de `segurada.has(mapa.sp)`; teclado, gamepad e
    toque já escrevem em `segurada`. É área da Lyra (2 linhas): a Vega pede ou faz com revisão dela.
  - `cpu.ts` `NO_INPUT` não precisa mudar (campo opcional).
- **`fighter.ts` `updateMove`** (`:457`): ramo novo para `mv.type === 'carga'`, antes do `if (mv.type === 'fire')`.
  - Enquanto `mt === S − 1`, `inp.spSeg` e `carga < mv.carga.max`, o lutador segura o `mt` (não avança), soma
    `this.carga++` e anda devagar (`vx = hdir × WALK_SPEED × mv.carga.andar`).
  - Ao soltar ou ao chegar ao máximo, o golpe segue. O nível vem do tempo: `niveis: [0, 30, 70]`, `max: 90`, auto-solta no máximo.
  - Brilho: `P.glow = carga / max` em `moveFrame` (o campo já existe).
  - Evento `carga` a cada troca de nível (som e efeito).
- **`game.ts` `noAtaque(mv)`** (`:72`) passa a `noAtaque(mv, atacante)`: aplica `mv.carga.porNivel[nível]`
  (`dmg`, `kd`, `quebraGuarda`) ao montar o `AtaqueAcerto`.
- **`game.ts` `applyHit`, ramo `blocked`** (`:500`): se `mv.quebraGuarda`, em vez de bloquear faz
  `d.setState('hit')` e `d.stun = mv.quebraGuarda`. O dano de raspão continua igual e o evento é `quebra-guarda`.
- **`game.ts` `resolveHits`, laço de projéteis** (`:451`): antes do teste de acerto, se `d` está num golpe com
  `absorveProj`, dentro de `[S, S + A)`, e `pr.dir === −d.facing` (vem de frente), então `pr.life = 0` e emite
  `clash` em `(pr.x, pr.y)`. Não há dano nem `applyHit`.
- **`AtaqueAcerto`** (`:56`) ganha `quebraGuarda?: number`.

**C3:** `LutadorLeitura.nivelCarga: 0|1|2|3`. Eventos `carga { lutador, nivel }` e `quebra-guarda { atacante, defensor, x, y, texto }`.
A absorção usa o `clash` que já existe.

**CPU (`ia`):**
- MASHI recebe `ia: { papel: 'pressao', alcance: [0, 220], segurar: [10, 85] }`. Fora do alcance, a CPU troca a escolha
  por "aproximar". Dentro, o plano mantém `spSeg` por N ticks sorteados em `segurar`; é o único `rnd()` extra e só
  existe para quem tem a dica.
- GARKUWA recebe `ia: { papel: 'defesa-projetil' }`. Na reação a projétil (`cpu.ts:82`), o ramo de bloqueio é trocado
  pela GARKUWA quando há energia. Fica fora dos ramos de anti-aéreo e de corpo a corpo.

**Testes (critério medido):**
1. Segurar ESP por 0 / 29 / 30 / 69 / 70 / 200 ticks dá nível 1 / 1 / 2 / 2 / 3 / 3, e com 200 a soltura sai no tick 90.
2. Andando enquanto carrega: deslocamento em 60 ticks ≤ `60 × WALK_SPEED × spd × andar` (+1 px de folga).
3. Contra o boneco `'block'`:
   - nível 3: o estado do defensor é `'hit'` com `stun === quebraGuarda`, sai 1 evento `quebra-guarda` e o raspão é ≤ 12% do dano;
   - níveis 1 e 2: estado `'block'`.
4. Projétil do HAYATO (`sFire`):
   - de frente, dentro da janela: o projétil some, a vida do AMINU não muda e sai 1 `clash`;
   - fora da janela ou pelas costas: há dano.
5. Fidelidade e snapshot sem atualização (o `spSeg` ausente não muda nada).
6. Harness (E6), com AMINU sob a CPU: pelo menos 30% dos MASHI saem com nível ≥ 2. Abaixo disso a dica não funciona.

### 2.2 CENTELLA — primitiva `rebote` + `agarrao` aéreo

**Kit:**

| Slot | Golpe | Classe |
|---|---|---|
| ESP | PLANCHA: salto alto e queda de corpo, golpe **alto** | `type: 'leap'` (existente), `lvl: 'over'`, `kd` |
| ↓+ESP | HURACANRANA: sobe e agarra **só rival no ar**; no chão, erra e fica exposta | `type: 'rise'` (existente) + `agarrao: { alvo: 'ar', janela: A }` |
| →+ESP | RESORTE: corre de costas até as cordas atrás dela, quica e volta numa voadora; quanto mais longe a corda, mais rápida e mais forte | `type: 'rebote'` |

**Pontos de plug:**

- **`fighter.ts` `updateMove`:** ramo `mv.type === 'rebote'` com duas etapas.
  - **Ida:** a partir de `mt === S`, `vx = −facing × mv.rebote.vel`, `P.flip = −1` (corre de frente para a corda) e soma
    a distância em `this.momento`. Termina quando `x` chega à margem da parede (`60` ou `LARGURA − 60`, os mesmos de
    `physics`, `:542`) ou em `mv.rebote.maxTicks`.
  - **Volta:** evento `rebote { lutador, x }`, depois `vy = mv.rebote.vy`,
    `vx = facing × (mv.rebote.vxBase + momento × mv.rebote.vxPorPx)`, e o golpe vira aéreo até pousar (mesma regra de
    `air`, com `lag` no `onLand`).
- **`game.ts` `noAtaque(mv, a)`:** `dmg = mv.dmg + min(a.momento, maxDist) × mv.rebote.dmgPorPx`.
- **`fighter.ts` `canThrow(golpe?)`** (`:249`) aceita `agarrao`:
  - `alcance` (padrão 108);
  - `alvo`: `'chao'` (padrão, regra atual), `'ar'` (`!o.grounded`, `|o.y − this.y| < 120`) ou `'ambos'`.
- **Gatilho do agarrão em `updateMove`** (`:461`):
  - hoje é `mv.throw && mt === S`;
  - com `agarrao.janela`, testa a cada tick em `[S, S + janela)` até agarrar uma vez;
  - sem `janela`, fica exatamente como hoje.
- **`game.ts` `arremessar(a, d, golpe?)`** (`:217`): dano = `golpe?.agarrao?.dmg ?? 12` (o `throw` base já usa 12,
  `base-moves.ts:35`, então nada muda para os atuais).

**C3:** evento `rebote { lutador, x }`. O agarrão usa o evento `throw` que já existe.

**CPU:**
- RESORTE recebe `ia: { papel: 'aproximar', espacoAtras: 200 }`. A CPU só escolhe o golpe se a distância até a parede
  atrás for ≥ 200; senão cai na escolha seguinte, sem `rnd()` extra.
- HURACANRANA recebe `ia: { papel: 'antiaereo' }`. Entra no ramo anti-aéreo (`cpu.ts:133`) e sai dos ramos de corpo a
  corpo (`:220`), onde erraria no chão.

**Testes:**
1. RESORTE saindo de x = 480, 380, 280, 180 e 100, olhando para a direita: a ida termina em x = 60 ± 1, sai 1 evento
   `rebote` e o dano no acerto cresce de forma estritamente monotônica com a distância.
2. Velocidade da volta medida = `vxBase + momento × vxPorPx` ± 0,01.
3. HURACANRANA:
   - contra o boneco `'jump'`, com o rival no ar dentro do alcance: 1 evento `throw` e o rival em `'down'`;
   - contra o boneco `'stand'`: nenhum `throw`, e a recuperação mede `S + A + R` ticks sem poder agir.
4. PLANCHA: contra `'crouchblock'` acerta; contra `'block'` (em pé) é bloqueada.
5. Fidelidade e snapshot.

### 2.3 CAMILLE — primitiva `aparar` + `contra` + REVERS com `through`

**Kit:**

| Slot | Golpe | Classe |
|---|---|---|
| ESP | PARADE: ~18 ticks de guarda; golpe corpo a corpo **mid ou over** que tocar é anulado e ela responde com o fouetté (golpe oculto `sResp`) | `type: 'aparar'` |
| ↓+ESP | COUP D'ARRÊT: chassé baixo; acertando o rival na **preparação** do golpe dele, dano e atordoamento maiores | melee `lvl: 'low'` + `contra: { mult: 1.5, hs: 12 }` |
| →+ESP | REVERS: giro de calcanhar que cruza para o outro lado | `type: 'rush'` + `through: 1` (existentes) |

**Pontos de plug:**

- **`data/tipos.ts`:**
  - `NomeGolpe` ganha `'sResp'`, um golpe que nenhuma entrada alcança;
  - `LutadorDef.extras?: Partial<Record<'sResp', Golpe>>`;
  - `montarLutador` monta as caixas de `sResp` como as dos outros golpes.
- **`game.ts` `applyHit`, no início** (antes de `const blocked`, `:492`):
  - **Condição:** `d` está em golpe `aparar` com `mt` em `[S, S + A)`, o ataque não é projétil e `mv.lvl` está em
    `parry.niveis`.
  - **Efeito:** emite `parry`, `hitstop = 8`, coloca o atacante em `'hit'` com
    `stun = parry.atordoaAtacante`, `move = null` e `hitDone`, e chama `d.startMove('sResp')`. Retorna sem dano.
  - **O que não passa por aqui:** o agarrão não passa por `applyHit` (ele chama `arremessar` direto), então perde para
    o agarrão naturalmente. Golpe baixo e projétil caem no caminho normal, com o contragolpe atual de +15% porque ela
    está em `'move'`.
- **`game.ts` `applyHit`, cálculo de `counter`** (`:525`): `emPreparo = counter && d.mt < d.golpeAtual().S`, lido
  **antes** de `d.move = null`.
- **`colisao.ts` `danoDoGolpe`** (`:55`):
  - ganha o argumento `multContra` (padrão 1,15, o valor atual);
  - com `mv.contra` e `emPreparo`, usa `mv.contra.mult` e soma `mv.contra.hs` ao `stun`.
- **REVERS:** nenhuma linha de código nova. Precisa de teste porque `through` nunca foi exercitado pelos dados atuais.

**C3:**
- evento `parry { atacante, defensor, x, y, texto }`;
- o evento `hit` ganha `contraEspecial?: boolean`, para texto e efeito próprios ("PARADA!").

**CPU:**
- PARADE recebe `ia: { papel: 'defesa' }`. Na reação a golpe (`cpu.ts:73`), quando o golpe do rival não é `low`, a CPU
  usa a PARADE no lugar do bloqueio, com a mesma probabilidade `L.block`. O ramo já sorteia, então só a CAMILLE gasta
  `rnd()` a mais.
- COUP D'ARRÊT recebe `ia: { papel: 'pressao', alcance: [60, 200] }`.

**Testes:**
1. PARADE contra `lp`, `hp`, `hk` e `jhk` dentro da janela:
   - a vida da CAMILLE não muda e sai 1 `parry`;
   - o `sResp` acerta em ≤ 20 ticks e a vida do atacante cai pelo dano do `sResp` (± escala de combo).
2. PARADE contra `clk` (baixo), `throw` e projétil, e contra golpe fora da janela (antes de S ou depois de S + A):
   a CAMILLE leva dano.
3. COUP D'ARRÊT, razão de dano medida:
   - na preparação do rival: `pow × 1,5`;
   - na recuperação: `pow × 1,15` (contragolpe normal);
   - parado: `pow × 1`.
4. REVERS:
   - o sinal de `(x_camille − x_rival)` inverte até `S + A + 4`;
   - o defensor que segura o "trás" do lado antigo **leva** o golpe, e o que segura o "trás" novo bloqueia.
5. Fidelidade e snapshot (o padrão 1,15 do `danoDoGolpe` precisa dar o mesmo número em ponto flutuante: manter a ordem das multiplicações).

### 2.4 NILA — reuso da `troca de ficha` (postura) + `rente`; MARMA cortada

**Por que a postura fica e a MARMA sai (recomendação; decisão ED-M1 do dono):**
- A troca de ficha precisa existir de qualquer jeito para a fase 2 do chefão (§3). Na NILA ela custa só dados, mais a
  dica de CPU e o HUD.
- A MARMA seria a única primitiva da NILA e exigiria mexer em cada linha que enche o medidor (`en +=` aparece em bloqueio, acerto, armadura e regeneração), justamente as linhas da prova de fidelidade.
- A postura é a identidade dela na proposta ("duas lutadoras numa só").

**Kit, com duas fichas:**

| Slot | GAJA (elefante, ficha base) | SARPA (serpente, ficha `sarpa`) |
|---|---|---|
| atributos | `pow 1.1 · spd 0.92` | `pow 0.9 · spd 1.15` |
| ESP | GOLPE MARMA: toque de dedos, **atordoamento longo** (`hs` alto, sem derrubar) | BOTE: deslize rasteiro `lvl: 'low'` com `rente: 1` (passa sob projétil) |
| ↓+ESP | VADIVU: troca para SARPA | VADIVU: troca para GAJA |
| →+ESP | PASSO DO ELEFANTE: `rush` com `kb` alto | SALTO DA SERPENTE: `leap` com `spin`, `lvl: 'over'` |
| golpes fortes | `mods` da GAJA | `mods` da SARPA |

**Pontos de plug:**

- **`data/tipos.ts` e `data/montar.ts`:**
  - `LutadorDef.fichas?: Record<string, Partial<Omit<LutadorDef, 'id'|'fichas'|'chefe'>>>`;
  - `LutadorMontado.fichas: Record<string, LutadorMontado>`, montadas no boot a partir das mesmas poses do atlas;
  - a ficha pode trazer `alias` próprio para as poses dela (ex.: `idle0 → sarpaIdle0`).
- **`fighter.ts`:**
  - `chBase` e `trocarFicha(nome)` trocam `this.ch` **sem** mexer em `maxHp`/`hp` (diferente de `setChar`, `:138`, que
    reinicia `maxHp`);
  - `fichaAtual: string | null`;
  - `reset()` (`:143`) volta para `chBase`: cada round começa na postura base.
- **Golpe `type: 'troca'`** com `troca: { ficha }`: a troca acontece em `mt === S` (curta, custo 0, ~15 ticks no total)
  e emite `troca-ficha`.
- **`rente`:**
  - `colisao.ts` `hurtbox` (`:20`) ganha um terceiro nível de altura, `rente` (topo ≈ `SH × 0,3` ≈ 80 px);
  - conta: o projétil nasce a ~150 px do chão (`spawn.y`) e a caixa dele desce até ~120 px, por isso o agachado comum
    (topo a 148 px) **não** desvia e o `rente` desvia;
  - `fighter.ts` passa `rente` quando o golpe atual tem a flag.

**C3:**
- `LutadorLeitura.ficha: string | null`: a render usa `elenco[id].ch.fichas[ficha]` em `getPD` e para as cores `fire`;
- evento `troca-ficha { lutador, ficha }`;
- o HUD mostra o ícone da postura.

**CPU:**
- VADIVU recebe `ia: { papel: 'troca', preferir: { distancia: 'sarpa', perto: 'gaja' } }`. No novo plano, se a ficha
  atual não é a preferida para a distância, troca com probabilidade `L.aggr × 0,3`. É o único `rnd()` extra, só para
  quem tem a dica.
- A tabela de golpes da CPU lê `me.ch.moves`, que já é a ficha ativa, sem mudança.

**Testes:**
1. Depois do VADIVU, `ficha === 'sarpa'` e o ESP sai como BOTE; um segundo VADIVU devolve `'gaja'`.
2. Andar 60 ticks em cada ficha: a razão das distâncias é 1,15 / 0,92 ± 1%.
3. `hp` e `maxHp` não mudam na troca; o round seguinte começa em GAJA.
4. BOTE contra o projétil do HAYATO cruzando: nenhum dano; contra `'block'` em pé acerta; contra `'crouchblock'` é bloqueado.
5. GOLPE MARMA: `stun` medido no acerto = `hs` definido.
6. Fidelidade e snapshot.

### 2.5 BAATAR (kit) — ver §3 para a parte de chefe

| Slot | Fase 1 (e versão jogável) | Fase 2 (só luta de chefe) |
|---|---|---|
| ESP | ARREMESSO DO AVARGA: `throw:1` + `agarrao: { alcance: 162, dmg: 22 }`, recuperação longa ao errar | igual |
| ↓+ESP | QUEBRA-BASE: rasteira `lvl: 'low'`, `kd` (existente) | igual |
| →+ESP | ABRAÇO DA ESTEPE: `rush` + `agarrao: { alcance: 70, janela: A }` + `armor:1` | **MERGULHO DA ÁGUIA**: `leap` com `vxAlvo`, `lvl: 'over'`, `kd`, sem agarrão |
| passiva | PESO DA MONTANHA: `armor:1` em `hp hk chp chk` e nos especiais, com `armadura: { rankMax: 2 }` no def | igual, ficha mais forte |

**Pontos de plug:**

- **Armadura por rank:**
  - `AtaqueAcerto` ganha `rank`: em `noAtaque` vem `mv.rank`; nos projéteis é `undefined`;
  - em `applyHit`, ramo de armadura (`:526`): com `d.ch.armadura?.rankMax` definido, só absorve se
    `mv.rank !== undefined && mv.rank <= rankMax`. Projétil e golpe forte interrompem. A armadura do WEI LONG (sem
    `armadura`) não muda.
- **`vxAlvo`:** em `updateMove`, ramo `rise`/`leap` (`:472`), com `mv.vxAlvo` (ticks de voo):
  `vx = clamp((opp.x − x) / mv.vxAlvo, −maxVx, maxVx)` em `mt === S`, no lugar de `facing × mv.vx`.
- **Agarrões:** os mesmos parâmetros de §2.2.

**CPU:**
- ARREMESSO recebe `ia: { papel: 'pressao', alcance: [0, 150] }`;
- ABRAÇO recebe `ia: { papel: 'aproximar', alcance: [120, 320] }`;
- MERGULHO recebe `ia: { papel: 'aproximar', alcance: [200, 700] }`.

**Testes:**
1. Armadura contra `lp`/`lk` (rank ≤ 2) durante o `hp` do BAATAR: o golpe dele não é interrompido e sai evento `armor`.
   Contra `hp`, `hk`, especial e projétil: é interrompido. Snapshot igual (WEI LONG intacto).
2. ARREMESSO com o rival a 150 px agarra; a 170 px erra, e a recuperação medida = `S + A + R`. Contra boneco `'block'` agarra (inbloqueável).
3. ABRAÇO: agarra no primeiro tick de contato dentro da janela; contra `lp` repetido segue (armadura); contra `chk` (rank > 2) para.
4. MERGULHO com o rival a 100, 300 e 600 px: pousa a ±20 px do x que o rival tinha na decolagem.

---

## 3. O chefão no motor

### 3.1 `ConfigChefe` e a ativação

```ts
// data/tipos.ts — só se aplica quando ConfigPartida.chefe === true
type ConfigChefe = {
  barras: 2;
  hpPorBarra: number;     // proposta: 75 → 150 no total, os "50%" do Apolo caem na troca de barra
  fichaFase1: string;     // 'chefe'  (pow 1.3 · spd 0.82, atributos do modo chefão da proposta)
  fichaFase2: string;     // 'chefe2' (MERGULHO no →+ESP, `fire` mais saturado, ia mais agressiva)
  danca: { duracao: number }; // 90 ticks (~1,5 s)
  bonusVitoria: number;   // pontos para quem derrota o chefe (valor na E6)
};
// fight/game.ts
type ConfigPartida = { …; chefe?: boolean };
```

`Game.setup` (`:163`) com `cfg.chefe` e `LUTADORES[c2].chefe`:
- P2 recebe `barrasMax = 2`, `maxHp = hpPorBarra` e `trocarFicha(fichaFase1)`;
- `winsNeeded = 1`, round único (ED6), seja qual for `ajustes.rounds`;
- a IA do P2 é `IA_CHEFE`.

O `reset()` (`:152`) hoje fixa `barras = 1`: passa a usar `barras = barrasMax` (1 por padrão).
Sem `cfg.chefe`, o BAATAR é o `LutadorDef` base, o jogável: 1 barra, `hp` próprio, sem fase 2, IA normal (ED7 e corte do DEVEKH jogável).

### 3.2 Troca de barra em `resolverVidaZerada` (`game.ts:603`, já pronta pela Vega)

Nova ordem dentro da função:
1. `hp > 0` → false (como hoje).
2. Treino → `hp = 1` e false (como hoje).
3. **Novo:** `d.barras > 1` faz `barras--`, `hp = maxHp` (= `hpPorBarra`), `gotHits = 0`, `invuln = 60`, `hitstop = 20`,
   `shake = 14`, `d.cenaPendente = true` e emite `fase-chefe { lutador, etapa: 'troca', barrasRestantes }`. Retorna **false**.
4. Senão, `ko()` → true (como hoje).

Retornando false, os dois chamadores (`applyHit` e `arremessar`) aplicam a reação normal: atordoamento ou derrubada.
Isso é proposital: o chefe cambaleia ou cai, e a invulnerabilidade de 60 ticks impede que o combo atravesse para a
segunda barra. O evento `fase-chefe` sai **antes** do `hit` do mesmo tick (ordem da fila), o que a Lyra precisa saber.

### 3.3 Fase 2: a Dança da Águia (DEVEKH)

- **Gatilho** (`Game.passo`, `:316`): com `phase === 'fight'`, `boss.cenaPendente` e o chefe num estado livre no chão
  (`idle`, `walk`, `crouch` ou `land`, ou seja, depois de levantar), a luta faz `phase = 'cena-chefe'` e `t = 0`,
  zera os projéteis e põe o chefe em `setState('cena')`. Emite `fase-chefe { etapa: 'danca' }`.
- **Durante a cena:**
  - `inputs()` já devolve vazio fora de `'fight'` (`:274`), o relógio não anda (`fighting` é falso, `:360`) e
    `resolveHits` não roda;
  - o jogador continua atualizando com entrada vazia e termina o que estava fazendo;
  - `Fighter.update` ganha o `case 'cena'`: `vx = 0` e `physics`;
  - `poseT` ganha o `case 'cena'`: `devekh0..2` por tempo (folha B9).
- **Fim:** em `st >= danca.duracao`, o chefe faz `trocarFicha(fichaFase2)` e `setState('idle')`. A luta volta a
  `phase = 'fight'` e emite `fase-chefe { etapa: 'retomada' }`.
- **Casos de borda (com teste):**
  - se o jogador sofre KO no mesmo tick da troca de barra, vale o KO e não há cena (a cena só começa com `phase === 'fight'`);
  - se o round termina em empate (KO duplo, ou tempo com `vidaTotal` igual), `endRound` não tem vencedor e começa novo
    round com `winsNeeded = 1`. O chefe volta com 2 barras e na fase 1 (decisão ED-M9).

### 3.4 `vidaTotal` e o desempate

- `Fighter.vidaTotal = hp + (barras − 1) × maxHp` já existe (E1a). Com `maxHp = hpPorBarra` a conta fecha, sem mudança.
- `endRound()` (`:628`) já compara `vidaTotal`. O teste novo é o caso real: tempo esgota com o chefe na 2ª barra
  com 10 (vidaTotal 10) e o jogador com 50, e o jogador vence; com o chefe ainda na 1ª barra com 30 (vidaTotal 105) e o
  jogador com 90, o chefe vence.
- O perfeito segue sobre a barra final (`w.hp >= w.maxHp − 0,01`).
- O `bonusVitoria` entra em `endRound` quando o perdedor tinha `chefe` ativo.

### 3.5 IA do chefe

`IA_CHEFE` em `cpu.ts` fica **fora** de `AI_LEVELS`, porque essa lista é o menu de dificuldade de `diff.ts`.
- `Fighter.perfilIa` guarda o perfil, e `cpuInput` (`:54`) usa `me.perfilIa ?? AI_LEVELS[nivel]`.
- **Proposta de partida:** o nível escolhido pelo jogador + 0,15 em `react` e `block`.
- **Fase 2:** `aggr` = 1, `anti` +0,2.
- **Ajuste:** os números finais saem do harness (§5) e da sessão do dono.

### 3.6 Testes do chefão (medidos)

1. Primeira vez que zera: `barras === 1`, `hp === hpPorBarra`, `phase === 'fight'`, 1 `fase-chefe/troca`, nenhum `ko`.
   Segunda vez: `ko`.
2. A cena começa no primeiro tick livre depois de levantar e dura exatamente `duracao` ticks.
   - **Congelado durante a cena:** `timeLeft` constante, nenhum `hit` (golpe do jogador sem efeito) e lista de projéteis vazia.
   - **Ao fim:** `ficha === 'chefe2'`.
3. Com `rounds = 2` e `rounds = 3`, uma vitória encerra a luta de chefe.
4. Desempate por `vidaTotal` (§3.4) e KO no mesmo tick (§3.3).
5. Treino com BAATAR, sem `cfg.chefe`: 1 barra, nunca morre. BAATAR jogável em versus: 1 barra, ficha base.
6. Fidelidade e snapshot.

---

## 4. Contrato C3: acréscimos, todos aditivos

| Onde | Acréscimo | Valor sem a mecânica |
|---|---|---|
| `InputFrame` (C2) | `spSeg?: boolean` | ausente |
| `LutadorLeitura` | `barras: number`, `barrasMax: number`, `chefe: boolean`, `ficha: string \| null`, `nivelCarga: 0\|1\|2\|3` | 1, 1, false, null, 0 |
| `EstadoLutador` | `'cena'` | nunca ocorre |
| `FaseLuta` | `'cena-chefe'` | nunca ocorre |
| `EventoLuta` | `fase-chefe { lutador, etapa: 'troca'\|'danca'\|'retomada', barrasRestantes }`, `parry {…}`, `quebra-guarda {…}`, `carga { lutador, nivel }`, `rebote { lutador, x }`, `troca-ficha { lutador, ficha }` | não emitidos |
| evento `hit` | `contraEspecial?: boolean` | ausente |
| `ProjetilLeitura` | nada (nenhum lutador novo tem projétil) | — |

Cada evento novo leva no comentário a receita de som e efeito, como os atuais (`contratos.ts:202`).

### 4.1 O que a Lyra precisa para o HUD de barras (E4), já na fatia S0

- `barras`, `barrasMax` e `chefe` em `LutadorLeitura`; `maxHp` já é o `hpPorBarra`.
- **Na troca de barra:** `hp` salta para cheio e `hpShown` acompanha na hora, pela regra atual (`game.ts:351`). A animação
  de "barra nova enchendo" é da render, disparada pelo evento `fase-chefe/troca`, e não do motor.
- **Fase `'cena-chefe'`:** faixa ou letreiro, relógio parado.
- **Evento `fase-chefe`:** `danca` liga a escurecida do céu da arena (cenário) e `retomada` desliga a faixa.
- **`winsNeeded === 1`:** o HUD mostra 1 marcador de round.
- **`ficha`:** a render escolhe `elenco[id].ch.fichas[ficha]` para `getPD` e para as cores `fire` (fase 2 mais saturada,
  postura da NILA). **Sem isso a NILA em SARPA e o BAATAR na cena seriam desenhados com as poses da ficha base.**
- **Nomes de pose novos:** `devekh0-2` (estado `cena`), `dive0-1` (MERGULHO) e as poses da SARPA (folha 5 da NILA),
  pelo mapa de `prompts-arte.md` §7.

---

## 5. Fatias de entrega (ordem), cada uma fechando com fidelidade e snapshot verdes **sem atualizar o snapshot**

| Fatia | Conteúdo | Tam. | Desbloqueia |
|---|---|---|---|
| **S0** Contratos | Tipos do C3 (§4) com valores neutros publicados pelo `Game`; `spSeg?` no C2 (Lyra: `teclas.ts`); `NomeGolpe 'sResp'`; `TipoGolpe` + `'carga'\|'rebote'\|'aparar'\|'troca'`; tipos dos parâmetros; `DicaIa` e o esqueleto da regra "dica só gasta RNG de quem a tem" | P | Lyra começa o HUD e a cena do chefe na E4 com dados reais |
| **S1a** Primitiva do chefe | `ConfigChefe`, `cfg.chefe`, `barrasMax` no reset, round único, troca de barra, cena, `trocarFicha` + `fichas` no `montar`, `IA_CHEFE`, bônus; testes de §3.6 com BAATAR provisório sobre o atlas do WEI LONG | M | o Arcade termina com chefe (E4) |
| **S1b** Kit do BAATAR | `armadura.rankMax`, `agarrao { alcance, dmg, alvo:'chao', janela }`, `vxAlvo`, dicas `ia` | P–M | BAATAR completo em dados |
| **S2** AMINU | `carga` (+ `spSeg` lido pela CPU), `quebraGuarda`, `absorveProj` | M | 1º da fila |
| **S3** CENTELLA | `rebote`, `agarrao.alvo:'ar'` (reusa S1b) | M | 2º da fila |
| **S4** CAMILLE | `aparar` + `sResp`, `contra`, teste de `through` | M | 3º da fila |
| **S5** NILA | fichas GAJA/SARPA (reusa S1a), `rente`, dica de troca | P–M | 4º da fila |

A ordem segue a fila de desbloqueio e a chegada da arte. S0 tem que vir primeiro e rápido, porque a E4 da Lyra está em
andamento. O chefe vem logo depois porque fecha o Arcade com qualquer número de lutadores.
**Em cada fatia:**
- a Vega roda `npm run typecheck`, `npm test` (inclui fidelidade lock-step e snapshot) e `npm run build`;
- o snapshot não pode ser regravado (rodar sem `-u`; conferir que o `.snap` não mudou);
- a Íris valida;
- e2e só pela Lyra (regra da porta 5173).

---

## 6. Harness de balanceamento da E6 (`npm run balanco`)

### 6.1 Forma

- `npm run balanco` = `vitest run --config vitest.balanco.config.ts`. Os arquivos ficam em `tests/balanco/`, **fora** do `npm test`, porque é lento.
- Opções por variável de ambiente: `BALANCO_SEMENTES` (padrão 100), `BALANCO_NIVEIS` (padrão `1,2`), `BALANCO_PARES`
  (filtro, ex.: `aminu:*`), `BALANCO_SHARD=k/n` para dividir entre processos.
- Lutadores: `data/lutadores` + `atlas.json` lidos do disco (mesmo jeito dos testes atuais). Quem não tem arte usa o
  atlas provisório, marcado como tal no relatório, porque o alcance muda com a arte (risco R3 do PLANO).
- Saída em `relatorios/balanco-AAAA-MM-DD.json` e `.md` (pasta ignorada pelo git), com as entradas registradas
  (sementes, níveis, versão do build, quais lutadores eram provisórios).
- **Determinismo no `npm test` normal:** 2 pares × 2 sementes, rodados duas vezes, com o mesmo hash do resultado.

### 6.2 Frame data medida no motor

Para cada lutador, ficha e golpe (normais, `throw`, especiais, cada nível da carga e o `sResp`), numa `Game` em modo treino,
com entrada roteirizada e boneco `'stand'`/`'block'`/`'crouchblock'`:
- **Tempos:** preparação (do aperto ao primeiro tick ativo), ativos, recuperação (até o atacante voltar a um estado livre).
- **Vantagem no acerto e no bloqueio:** diferença, em ticks, entre o atacante e o defensor ficarem livres.
- **Alcance efetivo:** maior distância inicial em que o golpe conecta, por busca binária de 1 px.
- **Dano:** dano bruto contra boneco cheio, raspão no bloqueio, nível de bloqueio (mid, low, over, throw) conferido
  contra `'crouchblock'` e `'block'`.
- Saída: `docs/frame-data.md` com aviso "gerado, não editar à mão", mais JSON. Vira a tabela da F7.

### 6.3 CPU × CPU com semente

- **Matriz:** todos os pares ordenados de lutadores regulares mais o BAATAR jogável (9 × 8 = 72; espelho fora), nos
  dois lados, níveis 1 e 2, `rounds = 2`, `time = 99`.
- **Chefe:** cada lutador como P1 CPU contra BAATAR com `cfg.chefe`, níveis 1 e 2.
- **Teto por luta:** 6 min de jogo (21 600 ticks). Passou, a luta é marcada "travou" e conta como falha do harness.
- **Por luta:** vencedor, rounds, ticks, tempo esgotado, perfeito, dano causado, uso de cada especial, agarrões,
  aparadas, quebras de guarda, nível médio da carga, trocas de ficha, trocas de barra e cenas.

**Agregados e metas** (o harness sinaliza; quem decide é a Íris com a Vega, e o dono no chefe):

| Métrica | Meta | Observação |
|---|---|---|
| Vitória A contra B | ≤ 65% | sinaliza só se o limite inferior do intervalo de Wilson a 95% passar de 65% (com N = 100 a margem é de ~±10 pp; rodada final com N = 200) |
| Taxa geral por lutador | 42–58% | inclui o BAATAR jogável |
| Tempo esgotado | < 10% | |
| Chefe contra CPU NORMAL como "jogador" | jogador vence 20–40% | o veredito final é a sessão de jogo do dono |
| Uso das mecânicas pela CPU | MASHI com nível ≥ 2 ≥ 30%; PARADE com sucesso ≥ 25% dos usos; RESORTE com dano acima do mínimo ≥ 50% | abaixo disso a **dica de CPU** está errada, não o lutador |
| Lutas travadas | 0 | |

**Desempenho:** a primeira execução mede ticks por segundo e projeta o tempo total. Meta: rodada completa em menos de
15 min no PC do dono (usar `BALANCO_SHARD` se passar).

**Limite honesto:** mede o lutador **nas mãos da CPU**. As mecânicas de leitura (PARADE, postura da NILA) tendem a
parecer mais fracas do que são. Frame data, simulação e sessão humana registrada formam o pacote da F5.

**Conflito já visível:** o BAATAR jogável da proposta (`hp 118 · pow 1.18`) está fora da faixa de HP do plano
(94–108). Proponho entrar com esses números e deixar o harness decidir (ED-M8).

---

## 7. Impacto nos prompts de arte (`docs/prompts-arte.md`)

| Lutador | Muda? | Detalhe |
|---|---|---|
| AMINU | não | folha 4 inteira usada (linha 1: carga, com a pose de segurar = `sa1`; linha 2: escudo; linha 3: passo). Os níveis aparecem por brilho procedural (Lyra) |
| CENTELLA | sim, pouco | a folha 5, linha 3, células 1–2 (salto na parede) **não são mais necessárias**: voltam para a linha genérica (variações de idle) ou ficam como provocação; células 3–4 sem mudança. Na folha 4, a linha 3 célula 1 (corrida) é usada **espelhada** na ida do RESORTE (`flip = −1`), sem pose nova |
| CAMILLE | não | folha 4, linha 1: `sa0` guarda, `sa1` desvio, `sa2` resposta (pose do `sResp`), `sa3` recuperação |
| NILA (opção recomendada, com postura) | não | folha 4 e **folha 5 da serpente** como o Apolo escreveu. O BOTE usa a folha 5 linha 2 células 3–4; o SALTO DA SERPENTE, a linha 3 |
| NILA (se o dono escolher MARMA no lugar da postura) | sim | a folha 5 volta à **genérica** (uma folha de pose própria a menos para o dono gerar). Na folha 4, a linha 2 (troca de postura) passa a ser o **BOTE** (deslize rente) e a linha 3 passa a ser o **SALTO DA SERPENTE** (preparação, subida em parafuso, chute descendente, vitória). O PASSO DO ELEFANTE sai do kit |
| BAATAR | não | B9 (`devekh0-2`, `dive0-1`) usada só na luta de chefe e no final; o jogável nunca usa B9 em luta |

---

## 8. Decisões que dependem do dono

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| **ED-M1** | NILA: qual mecânica fica | (a) postura GAJA/SARPA, MARMA vira atordoamento · (b) MARMA (lentidão + medidor travado), sem postura | **(a)**: reusa a troca de ficha do chefe, preserva a identidade; custo: 1 folha de arte a mais e CPU de troca |
| **ED-M2** | CENTELLA: qual mecânica de borda fica | (a) RESORTE com momento · (b) CORDAS (salto na parede), RESORTE vira investida comum | **(a)**: a CPU consegue usar, não pede pose nova, um golpe só |
| **ED-M3** | GARKUWA sem "converter em +1 nível de carga" | aceitar · manter a conversão (seria 2ª primitiva) | **aceitar** |
| **ED-M4** | BAATAR jogável sem DEVEKH/MERGULHO | aceitar · DEVEKH como 4º especial com medidor | **aceitar** (ED10 já veta super) |
| **ED-M5** | Na fase 2, o MERGULHO entra no lugar de qual especial | →+ESP (ABRAÇO) · ↓+ESP (QUEBRA-BASE) | **→+ESP**, para manter o golpe baixo que obriga a defender agachado |
| **ED-M6** | Gatilho da fase 2 | troca de barra (= 50% da vida total) | **confirmar** |
| **ED-M7** | Relógio na luta do chefe | manter o relógio configurado · sem relógio (fiel ao "sem relógio" do bökh) | **manter** (evita luta arrastada; o desempate por `vidaTotal` já está pronto) |
| **ED-M8** | BAATAR jogável fora da faixa de HP (118 contra 94–108) | aceitar e deixar o harness decidir · cortar já para 108 | **o harness decide** |
| **ED-M9** | Empate na luta do chefe | repetir o round com o chefe restaurado · derrota do jogador | **repetir** |
| **ED-M10** | Cortes menores: PLANCHA sem versão aérea, QUEBRA-BASE sem tempo extra no canto, ABRAÇO sem "perde para baixo", PASSO DO LEÃO sem guardar carga | aceitar · repor (cada um custa código) | **aceitar** |

---

## 9. Riscos desta etapa

| # | Risco | Mitigação |
|---|---|---|
| M-R1 | A CPU gastar `rnd()` a mais para lutadores sem dica e o snapshot mudar | regra explícita em S0 + teste do snapshot em toda fatia |
| M-R2 | `danoDoGolpe` com argumento novo mudar o ponto flutuante dos 4 atuais | manter a ordem das multiplicações; o lock-step pega |
| M-R3 | A PARADE virar "imbatível" na mão humana (janela de 18 ticks) | frame data mede; a janela é dado; perde para baixo, agarrão e projétil |
| M-R4 | Render desenhar a ficha errada (postura e fase 2) | campo `ficha` no C3 desde S0; teste de render da Lyra |
| M-R5 | `spSeg` no toque: o botão virtual soltar no tick errado | o toque já escreve `segurada`; e2e da Lyra segura o ESP por N quadros e confere o nível |
| M-R6 | Cena do chefe com estados raros (jogador no ar, projétil no meio) | projéteis zerados; o jogador atualiza com entrada vazia; casos de borda no §3.6 |
| M-R7 | Alcance medido com atlas provisório enganar o balanceamento | o relatório marca os provisórios; a rodada final só com a arte real |
