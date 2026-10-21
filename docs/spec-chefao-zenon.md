# InnoFighters: spec do motor e da UI para o chefão ZENON ARGYROS, "O Arconte"

Autora: Nova · 2026-10-21 · Status: **especificação**. Nada foi implementado e `src/` não foi tocado.
Missão do painel: `cmvi6ln4j01aa01nxloqm0f2u`.

**Decisões do dono (2026-10-21):**
- O chefão final é o candidato A da `docs/proposta-novo-chefao.md` (§1, §7).
- O BAATAR vira lutador normal, **5º na fila** (`aminu, centella, camille, nila, baatar`), com o MERGULHO DA ÁGUIA no
  lugar do ABRAÇO DA ESTEPE no →+ESP.
- A Dança da Águia vira só entrada e vitória do BAATAR. Não há provocação.
- A Vega já está fazendo a parte "BAATAR normal" (fatia Z0 abaixo), com `CHEFE` temporariamente `null`.

**Base lida (código de hoje; as linhas citadas podem andar):**
- `src/fight/game.ts`: `setup`, `passo`, `talvezIniciarCenaDoChefe` em :461, `andarCenaDoChefe` em :480, `applyHit` em
  :679 a :858 e `resolverVidaZerada` em :868.
- `src/fight/fighter.ts`: `virarChefe`, `trocarFicha`, `reset` e `poseT` (`case 'cena'` em :1046).
- `src/data/tipos.ts`, `src/data/lutadores/baatar.ts`, `src/data/cenarios.ts`, `src/meta/{regras,progresso}.ts` e `src/ui/grade.ts`.
- `src/ui/cenas/{chefe,fight,select}.ts`, `src/render/{mundo,lutador,cinematica,cenario,camera}.ts` e
  `src/render/identidade-especiais.ts`.
- `src/audio/audio-sys.ts`, `src/fight/colisao.ts` e `src/assets/{elenco,manifesto}.ts`.
- `ferramentas/balanco/*` e `ferramentas/sprites/executar.mjs`.
- O `atlas.json` dos 9 lutadores, `docs/mecanicas-e3.md` (§0 e §3) e `docs/spec-esquiva-e-cinematica-especial.md`.

---

## 0. Resumo e contexto

**Contexto (hipótese declarada):** produto em fase de expansão, não MVP. O jogo está no ar só como site de teste (GitHub
Pages, destino final EasyPanel). Os jogadores reais são poucos, então o progresso salvo existe, mas o custo de uma mudança de
layout é baixo. A equipe é a squad de sempre. O caminho crítico é a **arte** (de 12 a 13 imagens no Runway, ~102 créditos),
não o código. Por isso o código fica pronto antes, com o ZENON provisório sobre o atlas do WEI LONG (o mesmo molde da E3).

**Achados lendo o código (não supostos), que corrigem a proposta:**

| # | A proposta supõe | O código mostra | Consequência |
|---|---|---|---|
| A1 | o gancho `fase-chefe` "hoje escurece o céu do `mn`" | **não existe**. Só o comentário de `contratos.ts:302` fala nisso; `ui/cenas/fight.ts:274` diz "danca/retomada ainda não têm efeito visual próprio" | a aura e a sobreposição da fase 2 são **render nova** (§4.3), não reuso. Não há nada a "desligar" no `mn` |
| A2 | `ia.papel: 'zonear'` no SELO | `PapelIa` não tem `zonear` (`data/tipos.ts:73`) | SELO **sem dica**: a CPU já solta projétil pelo ramo padrão (`fire` do perfil). Criar o papel seria código e RNG novos |
| A3 | hurtbox cresce com a escala | `colisao.ts:31` usa caixa **fixa** (76 px de largura, 96% de `SH` = 254 px) para qualquer `scale` | a 1,36 a cabeça fica ~93 px acima da caixa. Reusar `alturaEmPe` (E6a), que já existe (§9.2) |
| A4 | o agregado do harness é genérico | `ferramentas/balanco/agregado.ts:54/204` tem um campo `baatar` fixo | generalizar na Z1 (§10) |
| A5 | `ordemDaGrade` "trata 9" | trata **só** `roster.length === 9` com o chefe dentro; com 10 cai na ordem do roster e `retanguloDaCasa(9, 3)` desenha a 10ª casa em cima do painel de descrição (y 356 x painel em y 358) | layout novo (§7) |
| A6 | `ConfigChefe.danca` | usado em `game.ts:484`, `fighter.ts:1048`, `baatar.ts:109`, nos testes de chefe e no harness (`fezDanca`) | o rename é pequeno e todo interno (§2) |
| A7 | entrada com o atlas do chefão | `elenco.ts:91` carrega o **manifesto** de todo id de `IDS_LUTADORES` no boot | `'zenon'` só entra em `IDS_LUTADORES` quando a arte existir (Z5). Antes disso o boot quebraria (§11.3) |

**Saldo de motor:** **zero primitiva nova** para o ZENON.
- 1 parâmetro novo: `drenaEnergia`.
- Reuso de `barras + cena + troca de ficha` (o chefe da E3), `through` (o REVERS), `rise` (a subida do RAIJIN-KEN),
  `armadura.rankMax` e `armor:1`.
- A generalização `danca` → `cena` é refatoração de uma primitiva que já existe, não primitiva nova.
- Entrada, aura, arena da fase 2 e música ficam **fora** do motor.

---

## 1. `drenaEnergia`: classificação e contrato

### 1.1 Veredito: **parâmetro**

Pela régua de `docs/mecanicas-e3.md` §0, o campo passa nos quatro testes:
- **Default neutro:** campo ausente = código de hoje, bit a bit.
- **Ramo que já existe:** é lido só nos dois ramos de `applyHit` que já mexem em `en`: acerto (`game.ts:808`) e bloqueio
  (`:740`).
- **Estado que já existe:** só move valores de `Fighter.en`, o medidor universal que especial, esquiva e CPU já leem.
- **Nada persistente nem encadeado:** não cria estado, não intercepta `applyHit` para disparar outra ação e não mexe no C2.

**Por que não é como a "conversão da GARKUWA" (cortada na ED-M3):** aquela acoplava dois mecânicos, porque o escudo escrevia
no estado da `carga`, que é próprio do AMINU. Aqui o dreno escreve no medidor comum, que todo lutador já tem.

### 1.2 Contrato

```ts
// data/tipos.ts — em Golpe (por golpe, não por lutador: TRIBUTO e DECRETO drenam, SELO e COLUNA não)
/** (ZENON) TRIBUTO/DECRETO: no acerto tira `acerto` de energia do rival e dá ao atacante; na defesa, `defesa`. Sem escala por `pow`. */
drenaEnergia?: { acerto: number; defesa: number };

// fight/game.ts — AtaqueAcerto ganha `drenaEnergia` (vindo de `noAtaque(mv, a)`); o ramo do projétil passa `undefined`.

// core/contratos.ts — eventos `hit` e `block` (C3 aditivo; o snapshot conta eventos por `tipo`, campo novo é seguro)
dreno?: number; // energia efetivamente transferida (> 0). Ausente = não houve dreno.
```

**Regra exata (Vega):** o dreno roda **depois** dos ganhos normais do ramo (acerto: atacante +8, defensor +5; bloqueio: +3 e
+4). Então:
`k = min(d.en, valor)`, `d.en -= k`, `a.en = min(MAX_EN, a.en + k)`.

| Caso | Dreno? | Motivo |
|---|---|---|
| Acerto (inclusive contragolpe e troca de barra no mesmo tick) | `acerto` | ramo de acerto |
| Bloqueio, inclusive quebra de guarda | `defesa` | ramo de bloqueio |
| Absorvido por armadura (BAATAR, ZENON f2) | **não** | o ramo de armadura retorna antes; "absorveu" = nada cobrado |
| PARADE, esquiva, `untouchable` | **não** | o golpe não chega aos ramos |
| Projétil | **não** | `montar` rejeita `drenaEnergia` com `proj` |
| Golpe com `hits > 1` | **proibido** | `montar` rejeita. Drenar uma vez por golpe pediria estado (`atkId` já drenado), e isso viraria primitiva |

**Validação em `montar.ts`:** `0 ≤ acerto ≤ MAX_EN`, `0 ≤ defesa ≤ acerto`, números finitos. Também lança erro de dados
com `proj` ou com `hits > 1`.

**Valores de partida:** chefe `{ acerto: 20, defesa: 10 }`. Para o ZENON jogável (§11), sai do harness, com sugestão de
`{ 12, 6 }`.

**CPU:** nada muda. Ela já lê `en` para decidir especial e esquiva. Nenhuma chamada nova de `rnd()`.

**Testes medidos (Íris valida):**
1. Rival com `en = 50`, TRIBUTO acerta: rival `50 + 5 − 20 = 35`; atacante `en0 + 8 + 20` (com teto de 100); `hit.dreno === 20`.
2. Rival com `en = 4`: transfere 4, o rival fica em 0 e `dreno === 4`.
3. Bloqueado: `−10` no rival (depois do +4) e `block.dreno === 10`.
4. Contra o BAATAR com armadura absorvendo (golpe de rank ≤ 2): sem dreno e sem `dreno` no evento `armor`.
5. `montar` lança erro com `drenaEnergia` + `proj` e com `drenaEnergia` + `hits: 3`.
6. `luta-fidelidade` e o snapshot de `fight.test.ts` verdes **sem** `-u`.

---

## 2. `danca` vira `cena { duracao, poses }` genérica

### 2.1 Contrato

```ts
// data/tipos.ts
/** Cena de poses por tempo: `poses[i]` vale do tick floor(i·duracao/n) ao próximo; a última segura até o fim. */
export type CenaDef = { duracao: number; poses: readonly string[] };

export type ConfigChefe = {
  barras: 2;
  hpPorBarra: number;
  fichaFase1: string;
  fichaFase2: string;
  /** Cena da fase 2 (era `danca`): ticks entre a troca de barra e a retomada, e as poses do chefe nela. */
  cena: CenaDef;
  bonusVitoria: number;
  /** Trilha da luta de chefe (§5). Ausente = 'fight' (o de hoje). */
  trilha?: 'chefe';
};
```

- `Fighter.poseT`, `case 'cena'`:
  ```ts
  const c = this.cfgChefe?.cena;
  P.name = c && c.poses.length ? c.poses[Math.min(c.poses.length - 1, Math.floor((this.st * c.poses.length) / c.duracao))] : 'win';
  ```
  Pose que falta no atlas cai na cadeia de `getPD` de sempre (atlas provisório nos testes).
- `game.ts:484`: `this.t < cfg.cena.duracao`.
- **Etapa do evento:** `EtapaFaseChefe` `'danca'` vira **`'cena'`**. O ZENON não dança. A troca toca
  `contratos.ts`, `game.ts:476`, `audio/eventos.ts:69`, os testes de chefe e o harness. O snapshot conta por `tipo`, não por
  `etapa`, então segue intacto.
- **Validação em `montar`:** `duracao` inteiro de 1 a 600; `poses` com 1 a 8 nomes `^[\w-]+$`.

**Teste novo de dados (lê o disco; pula enquanto o lutador usa atlas provisório):** toda pose citada em `cena`, `entrada`,
`vitoria` e `poseDaFicha` existe no `atlas.json` real do lutador.

### 2.2 Onde cada "cena" mora (dois consumidores, um tipo)

| Cena | Dono | No motor? | Dados |
|---|---|---|---|
| Fase 2 do chefe (congela a luta, relógio parado) | `ConfigChefe.cena` | **sim**: estado `cena`, fase `cena-chefe`, lock-step | ZENON: `{ duracao: 90, poses: ['cena0','cena1','cena2'] }` (S10, linha 2: estala os dedos, abre os braços, guarda de dois punhos) |
| Pose de entrada (genérica, qualquer lutador) | tabela de apresentação (§3.1) | **não**: render durante a `intro` | BAATAR `{ 90, ['devekh0','devekh1','devekh2'] }`; ZENON jogável `{ 90, ['entrada0','entrada1','entrada2'] }` |
| Pose de vitória | tabela de apresentação | **não**: render no estado `win` | BAATAR `{ 60, ['devekh0','win'] }`; ZENON `{ 80, ['vitoria0','vitoria1'] }` (S9, linha 2, células 2 e 3) |
| Entrada dramática do chefão | `CenaFight` (§3.2) | **não**: antes do 1º tick do motor | ZENON (as poses da entrada + faixas, braseiros, cartão e fala) |

**Compatível com o BAATAR normal:** ele perde o `ConfigChefe` na Z0 e fica só com `entrada` e `vitoria` na tabela de
apresentação. Nenhum código de motor lê essas duas.

---

## 3. Entrada: a pose genérica e a entrada dramática do chefão

### 3.1 Pose de entrada genérica (todo lutador que a declarar; zero tempo a mais)

O motor já tem a fase `intro` de 90 ticks, com os dois parados e sem entrada. **A render troca a pose**: com
`luta.phase === 'intro'` e `luta.round === 1`, para o lutador cuja tabela tem `entrada`, desenha
`poses[floor(t · n / duracao)]` (segura a última). Faz isso com uma cópia rasa de `LutadorLeitura` e
`pose.name` trocado, sem mexer no `Fighter`. O mesmo vale para `vitoria` no estado `win`, indexado por `f.st`.

- Os dados ficam numa tabela nova, **fora** do `LutadorDef` (o mesmo princípio de `identidade-especiais.ts`):
  `src/render/apresentacao-lutadores.ts`, com
  `APRESENTACAO: Partial<Record<IdLutador | 'zenon', { entrada?: CenaDef; vitoria?: CenaDef; falas?: Falas; aviso?: [string, string] }>>`.
- `LeituraLuta` já tem `round`, `phase` e `t` (`contratos.ts:496–502`), então não precisa de campo novo.
- Na luta de chefe, a pose de entrada **do chefe** fica desligada na `intro`, porque ele já fez a entrada dramática. Ele
  fica na última pose da entrada até a `intro` acabar e aí volta à `idle`.

### 3.2 Entrada dramática (só `cfg.chefe` com `APRESENTACAO[chefe].entradaDramatica`)

**Onde mora:** um controlador `EntradaDoChefe` em `src/render/entrada-chefe.ts`. A API é a da `Cinematica`: `iniciar`,
`ativa`, `avancar`, `pular`, `desenhar`. Ele é ligado em `CenaFight.update` **antes** do primeiro `game.update`:

```
update():
  if (paused || !espera.pronta) return;
  if (entrada.ativa) { if (alguemPulou() || ENTER) entrada.pular(); entrada.avancar(); return; }   // motor NÃO anda
  if (cine.ativa) { ... }   // como hoje
  game.update(...)
```

**Por que fica fora do lock-step por construção:** `game.setup` já rodou (posições e `phase = 'intro'`, `t = 0`), mas
`game.update` não é chamado. Por isso tick, RNG, eventos pendentes (`round start`) e relógio ficam exatamente como numa
luta sem a entrada. A entrada usa `rngVisual` (o dos efeitos), nunca o `rng` da luta.

**Linha do tempo (COMPLETA = 156 ticks ≈ 2,6 s; CURTA = 60 ticks):**

| Ticks | O que aparece | Pose do ZENON (resto do lutador a partir do `LutadorLeitura` atual) |
|---|---|---|
| 0–12 | faixas pretas de cinema entram (altura 0 → 56 px lógicos); HUD escondido | `entrada0` (de costas) |
| 12–48 | braseiros acendem da esquerda para a direita (sobreposição procedural §6, 8 focos, um a cada 4,5 ticks) | `entrada0` |
| 48–84 | — | `entrada1` (vira a cabeça) |
| 84–156 | cartão "ZENON ARGYROS · O ARCONTE · DONO DO TORNEIO" + legenda com a fala de entrada (§1 da proposta), faixas saem nos últimos 12 | `entrada2` (aperta a tira) |

- **CURTA:** faixas + `entrada2` + cartão, sem os braseiros em sequência.
- **Quando é CURTA:** depois de um *continue* (`run` com uma derrota já registrada contra o chefe), com
  `prefers-reduced-motion` ou com a preferência de cinemática "curta" ou "desligada". O nome do chefão aparece sempre: a
  entrada não some, só encolhe.
- **Pular:** qualquer botão de ataque, ESP ou ENTER de um humano. A saída leva no máximo 6 ticks (o mesmo
  `TICKS_DA_SAIDA_AO_PULAR`). O pulo só vale depois do tick 10, para não engolir o ENTER que confirmou o VS.
- **Regras sem cinemática (`?expansao=4`):** sem entrada.
- **Som:** as receitas da §1.6 da identidade (whoosh nas faixas; um `tone` curto por braseiro). A música da luta (§5) já
  começa no `enter` da cena.
- **Após a entrada:** a `intro` do motor (90 ticks, ROUND 1 / FIGHT) roda como hoje.
- **Aviso antes do VS:** `CenaChefe` lê `APRESENTACAO[chefe].aviso` no lugar do texto fixo. Para o ZENON:
  `['O ANFITRIÃO', 'ESTÁ À SUA ESPERA']`. O "???" e a silhueta continuam.

**Falas:**
- Fase 2: legenda durante `phase === 'cena-chefe'`.
- Vitória: legenda no `matchend` com o chefe vencedor.
- Derrota: legenda no `ko` final do chefe e no `ending`.

Texto: `Falas = { entrada?, fase2?, vitoria?, derrota? }`. Letreiro com `f.T`, sem `fillText` de fonte nova.

**Critérios de aceite (medidos):**
- **Unit, Node** (`tests/unit/entrada-chefe.test.ts`):
  - Com a entrada COMPLETA, a CURTA e pulada no tick 11, `game.tick`, `game.t`, o hash dos dois `Fighter` e
    `rng.estado()` são **iguais** aos de uma luta sem entrada, depois de N = 600
    ticks de `game.update` com as mesmas entradas.
  - O controlador termina em exatamente 156 / 60 avanços, e em ≤ 6 avanços depois de `pular()`.
- **e2e (Lyra, porta 5173):**
  - (a) com o chefe na fase de entrada, `h.ui.m.game.tick` não muda em 30 quadros;
  - (b) ENTER no quadro 20 faz `game.tick` andar em ≤ 8 quadros;
  - (c) foto da entrada nos perfis desktop e celular, com 0 sobreposição de HUD;
  - (d) **auditar os e2e que chegam à luta de chefe** (`expansao.spec.ts`, `celular-e7a.spec.ts`, `cinematica.spec.ts`).
    Eles devem pular a entrada pelo hook, senão ganham 2,6 s e a contagem de quadros muda.

---

## 4. Fase 2: armadura, SELO MAIOR, DECRETO e aura

### 4.1 Dados (nenhum código de motor novo)

```ts
fichas: {
  chefe:  { pow: 1.0, spd: 0.92 },                                   // fase 1 (partida; o harness fecha)
  chefe2: {
    spd: 0.98,
    armadura: { rankMax: 2 },                                        // "chega de cortesia": não recua para golpe fraco
    mods: { hp: { armor: 1 }, hk: { armor: 1 }, chp: { armor: 1 } }, // a armadura só vale em golpe com `armor:1` (fighter.ts:279)
    especiais: { ...ESPECIAIS_ZENON, sFire: SELO_MAIOR, sFwd: DECRETO },
    fire: ['#e0249a', '#0c0710', '#12040c'],
    poseDaFicha: { sc0: 'decreto0', sc1: 'decreto1' },               // S9 linha 1
  },
},
```

- **SELO MAIOR:** o SELO com `proj { sp 9.5, sc 1.9, dmg 16, kd }`.
- **DECRETO:** `type: 'rush'`, `through: 1`, `drenaEnergia` igual ao TRIBUTO, `lvl: 'mid'`, `heavy`. O molde é o REVERS da
  CAMILLE (`camille.ts:53`), e o teste do `through` da S4 já cobre a mecânica.
- **Ressalva de dados:** a armadura **não** é passiva do corpo. `armadura.rankMax` filtra, mas só golpe com `armor:1` tem
  janela de armadura. "Para de recuar para golpe fraco" vale **nos golpes dele**, não parado. É o mesmo comportamento do
  BAATAR, e a Íris confere isso contra a expectativa do dono.

**Testes:**
- Fase 2, `lp` do rival durante o `hp` do ZENON: sai evento `armor` e o golpe dele continua.
- Na fase 1, o mesmo `lp` interrompe.
- DECRETO com o rival a 120 px: o ZENON termina do outro lado (`sinal(x_zenon − x_rival)` invertido) e o acerto sai com
  `dreno`.
- `ficha === 'chefe2'` depois da cena.

### 4.2 IA (dicas que já existem)

| Golpe | Dica | Nota |
|---|---|---|
| SELO / SELO MAIOR | **nenhuma** | ramo padrão de projétil da CPU (achado A2) |
| COLUNA DE ÔNIX | `{ papel: 'antiaereo' }` | papel que já existe |
| TRIBUTO | `{ papel: 'aproximar', alcance: [90, 220] }` | — |
| DECRETO | `{ papel: 'aproximar', alcance: [120, 300] }` | — |

O perfil é o `IA_CHEFE` global de hoje (`perfilChefe`): fase 2 com `aggr` 1 e `anti` +0,2. Um perfil **por chefão**
(`ConfigChefe.ia?`) só entra se o harness pedir. Seria um parâmetro opcional, e hoje não proponho.

### 4.3 Aura sombria e arena da fase 2 (render nova, achado A1)

**Gatilho a partir do estado, não do evento:**
`fase2 = f.chefe && f.barras < f.barrasMax`. A rampa vai de 0 a 1 ao longo dos 90 ticks da `cena-chefe` e segura 1 até o
fim do round. Assim, pausa, cinemática e um evento perdido não deixam a aura presa nem apagada.

**Aura (`render/aura-chefe.ts`):** desenhada **antes** do sprite em `desenharLutador` e só para o lutador com `chefe` e
`fase2`. São duas elipses (corpo e base) com degradê radial:
- núcleo ônix `#0c0710` em `source-over`, alfa ≤ 0,55;
- borda em brilho em `lighter`, alfa ≤ 0,35;
- respiração com `sin(age / 18)`;
- 6 a 10 "fiapos" (curvas de 2 px) subindo.

Orçamento: ≤ 16 primitivas por quadro, sem `shadowBlur`, sem `filter` e sem `getImageData`.

**Arena:** um registro novo `SOBREPOSICOES_DE_CENARIO: Partial<Record<IdCenario, (ctx, { fase2, rampa, t, camX }, rngVisual) => void>>`
em `render/cenario.ts`, chamado por `desenharMundo` logo depois de `desenharCenarioLuta`, dentro da câmera.
- `gr`: 8 focos de braseiro (x e y em fração da imagem; a Lyra mede na arte aprovada) com brilho laranja na fase 1 e
  púrpura `#b02a7e` na fase 2 (mistura pela `rampa`).
- Também na fase 2: 1 a 2 raios no horizonte (polilinha de 5 vértices), a cada 90 a 150 ticks sorteados no `rngVisual`.
- `mn`: **nenhuma** sobreposição (não há o que desligar).

Orçamento: ≤ 24 primitivas.

**Critérios:**
- Captura do mesmo tick nas fases 1 e 2, nos perfis desktop e celular.
- No E7a, o tempo de quadro da luta de chefe na fase 2 fica ≤ 1,15 × o da fase 1 (medido no perfil de celular do
  Playwright).
- Unit: com `barras === barrasMax`, a aura não desenha nada (contador de chamadas do contexto falso = 0).

**Esquiva tingida (render):** o fantasma da esquiva do ZENON sai em `#d6339a`, a alfa `ALFA_FANTASMA`, pelo
`silhuetaTingida` que já existe. O rastro do casaco (um tique a mais) é opcional.

---

## 5. Música do chefão (valsa 3/4)

**Problema:** `scheduler` (`audio-sys.ts:391`) fixa `len = 64` e `spb = 60/bpm/4`, e `playStep`/`playMenu` usam `step % 16`.
**Mudança mínima:** uma tabela de trilhas. `fight` e `menu` ficam **idênticas**, e só a forma de chamar muda.

```ts
export type TrilhaMusica = 'fight' | 'menu' | 'chefe';
type DefTrilha = { bpm: number; passosPorCompasso: number; compassos: number; tocar: (s: AudioSys, step: number, t: number, spb: number) => void };
const TRILHAS: Record<TrilhaMusica, DefTrilha> = {
  fight: { bpm: 150, passosPorCompasso: 16, compassos: 4, tocar: (s, ...a) => s.playStep(...a) },
  menu:  { bpm: 92,  passosPorCompasso: 16, compassos: 4, tocar: (s, ...a) => s.playMenu(...a) },
  chefe: { bpm: 138, passosPorCompasso: 12, compassos: 8, tocar: (s, ...a) => s.playChefe(...a) }, // 3/4 em semicolcheias
};
// scheduler: len = def.passosPorCompasso * def.compassos; spb = 60 / (def.bpm * this.andamento) / 4
/** Fase 2: andamento 1,12, bumbo nos 3 tempos, órgão uma oitava abaixo. Só vira no início do compasso seguinte. */
musicaDaFase(fase: 1 | 2): void;
```

**`playChefe`:**
- Ré frígio dominante (Ré, Mi♭, Fá♯, Sol, Lá, Si♭, Dó), raiz MIDI 50.
- Tempo 1 = passo 0: bordão (dente-de-serra, passa-baixa 900 Hz). Tempos 2 e 3 = passos 4 e 8: acorde de órgão em quintas.
- Prato de braseiro no passo 8 (ruído passa-alta de 6 kHz). Cravo na melodia (triângulo curto, com 96 passos de melodia).

**Ligação:**
- `CenaFight.enter`: `audio.startMusic(cfg.chefe ? (cfgChefe.trilha ?? 'fight') : 'fight')`.
- `audio/eventos.ts`: `fase-chefe` com etapa `'cena'` chama `musicaDaFase(2)`; `startMusic` volta a 1.
- **A flag** é a presença de `trilha: 'chefe'` no `ConfigChefe`. Tirar o campo = rollback para a trilha de luta.

**Sem RNG do jogo:** a trilha é toda determinística em `step`. O único sorteio do `AudioSys` continua sendo o buffer de
ruído, com o RNG próprio dele (`dep.rng`). Nada de `Math.random`.

**Testes (audio fake, que já existe em `tests/unit/_fake-audio.ts`):**
1. Os 64 primeiros passos de `fight` e de `menu` produzem a **mesma** lista de chamadas `tone`/`noise` (tipo, f0, at,
   dest) que hoje (gravar a referência **antes** da mudança).
2. Na `chefe`, um compasso tem 12 passos. O bumbo sai só no passo 0 na fase 1 e nos passos 0, 4 e 8 na fase 2. O prato sai
   no passo 8.
3. `musicaDaFase(2)` no meio de um compasso só muda o `spb` no passo `% 12 === 0` seguinte.
4. Uma busca no fonte por `Math.random` dá 0 ocorrências em `src/audio`.

---

## 6. Arena `gr`: "Anfiteatro do Arconte"

- `IdCenario` ganha `'gr'` (sigla de país, como as outras).
- `CENARIOS.gr = { id: 'gr', arquivo: 'assets/cenarios/cenario-gr.webp', nome: 'Anfiteatro do Arconte, Grécia', casa: 'zenon', pes: PES_NO_CENARIO }`.
- `ZENON.stage = 'gr'`. Pela regra de sempre, luta-se na casa do rival: o chefão é sempre enfrentado no `gr`.
  `CICLO_CENARIOS` e `CENARIO_PADRAO` não mudam (sem spoiler).
- **Pés a 84,5%:** o prompt do Apolo já pede a faixa de 80% a 90% livre. O teste de cenários que já existe lê o disco e
  acusa. Na curadoria, o Apolo mede a linha do chão (a mesma conferência dos 6 cenários).
- **Fase 2 só por sobreposição** (§4.3). Não há segunda imagem.
- **Entrada antes do flip (Z5):** o tipo `'gr'` e o registro só entram junto com a arte. O `Record<IdCenario, CenarioDef>`
  exige o registro assim que o tipo existe, e `casa: 'zenon'` exige o id no roster. Até lá, o modo dev do ZENON provisório usa o
  `mn` (§11.3).

---

## 7. Grade de seleção com 10

**Proposta: 3×3 com os 9 regulares + a casa de honra do chefão, uma faixa larga embaixo da grade.**

```
ordemDaGrade(roster, chefe):
  regulares = roster sem o chefe (ordem do ROSTER)
  com 9 regulares e chefe no roster -> [...regulares, chefe]       // índice 9 = casa de honra
  (sem chefe, 4 lutadores etc.: como hoje)
```

- **Ordem dos regulares = ordem do ROSTER** = 4 de fábrica + a fila na ordem em que se ganha:
  `hayato, wei-long, min-ji / caio, aminu, centella / camille, nila, baatar`.
  Assim o BAATAR fica na 9ª casa (o "5º da fila", que fecha a grade) e o AMINU vai para o centro.
  **Decisão do dono (D-Z2):** a alternativa é manter as casas de hoje, com o BAATAR no centro. Isso pede uma ordem fixa
  escrita à mão na UI e quebra a regra "a grade segue o ROSTER". Recomendo a ordem do ROSTER: o jogo está em teste e quase
  ninguém decorou a casa do BAATAR.
- **Geometria (ponto de partida; a Lyra mede):**
  - grade 3×3 intacta (x 352–608, y 92–348);
  - **casa de honra** em `{ x: 352, y: 356, w: 256, h: 44 }`, com o rosto do chefão recortado na horizontal ou "???"
    com a moldura em ouro `#d9b25a`;
  - painel de descrição de `(352, 358, 256, 100)` para `(352, 408, 256, 92)`;
  - a faixa de dica fica em y 510–540, então sobram 10 px.
- **Navegação:** `moverNaGrade` ganha `honra?: boolean`.
  - Para baixo, de qualquer casa da 3ª linha, vai para a 9.
  - Para cima, da 9, vai para a **7**, o centro de baixo (hoje iria para a 6, porque a coluna nominal seria 0).
  - Esquerda e direita na 9 não mudam de casa.
  - `retanguloDaCasa` ganha o caso da honra. O `hover`/`click` usa o mesmo retângulo.
- **Estados:** sem mudança (`chefe-oculto` até derrotar, depois `novo`/`liberado`).
- **Critérios (skill `medir-antes-de-afirmar`, no navegador):**
  - interseção = 0 px² entre a casa de honra, o painel, a 3ª linha e a faixa de dica, nos perfis desktop 960×540 e
    celular paisagem do E7a;
  - toque na casa de honra no celular seleciona a 9;
  - a sequência de teclas ↓↓↓↑ a partir da casa 1 termina na 7;
  - foto `selecao-10-honra-oculto` e `selecao-10-honra-liberado`.

---

## 8. Projétil `anel`, estilo E12 e identidade dos 3 especiais

- `EstiloProjetil` (`contratos.ts:230`) ganha `'anel'`, e só o ZENON o usa. O evento `projectile` já leva o `style`, e o
  snapshot não muda.
- **Render (`efeitos.ts`, `desenharProjetil`):** 3 elipses concêntricas (rx = 34·sc, ry = 0,45·rx) com núcleo ônix em
  `source-over` e borda em brilho em `lighter`, mais um arco de destaque girando 0,25 rad/tick. São ≤ 12 primitivas.
- **Atenção com `fire[1]`:** o brilho de preparação (`P.glow`, `render/lutador.ts`) pinta `fire[1]` em `lighter`, então
  com núcleo ônix o centro fica transparente e sobra um anel em `fire[0]`. Isso é aceitável e lê como "negativo". Se a Lyra
  quiser o ônix de verdade no centro, é um caso no render, não no dado.
- **E12 MEANDRO E ANEL** e as fichas dos 5 registros (SELO, COLUNA, TRIBUTO, SELO MAIOR e DECRETO) já estão escritos em
  `docs/identidade-visual-especiais.md`: §2 E12, §3.10, linhas 30–34 da §4 e §5.
- **Unicidade (conferida):**
  - E12 é exclusivo e o único estilo de ângulo reto e núcleo escuro;
  - o par mais próximo é com a MIN-JI, a **13°** (TRIBUTO 327° x TWIO 340°; a proposta dizia 14–19°), separado por
    núcleo, sombra, estilo e ritmo;
  - contraste **recalculado**: de 5,89 a 11,89, todos ≥ 3:1. A prova de verdade é a captura no navegador.
- **Ajuste no BAATAR (Z0):** `baatar.base.sFwd` vira o MERGULHO (E11). O registro do ABRAÇO e o `baatar.chefe2.sFwd`
  saem do código, e o `apresentacao-especiais.ts` troca `'chefe2/sFwd'` por `'base/sFwd'`.

---

## 9. Escala, HUD, hurtbox, âncora e atlas

### 9.1 Escala 1,36 e o teto do HUD (cálculo; a Lyra mede)

- **Altura da guarda na tela:** `K = scale · SH_IDLE / idle0.h`, então `idle0` mede `1,36 × 255 = 347` px lógicos. O
  zoom máximo da câmera é 1,075 (`game.ts:525`), ancorado no chão (y 470). A cabeça fica em **y ≈ 470 − 347 × 1,075 ≈ 97**.
  Poses mais altas que o `idle0` (o BAATAR tem `walk` 4% mais alto) dão **y ≈ 82**. Os nomes do HUD terminam em
  **y ≈ 78** (estimativa do Apolo: 155 de 1080). A folga é de 4 a 19 px: **1,36 está no limite**. Por isso não proponho
  subir para 1,42 sem medir.
- **Pulo:** `vy0 = 16,5 × jump`, então o ápice sobe `vy0² / (2 × 0,85)`. Com `jump 0,72`, sobe 83 px e a cabeça vai a
  y ≈ 8 (dentro da tela). Com 1,0, sobe 160 px e sai da tela. Fica `jump ≤ 0,72`.
- **Critério (Lyra, no navegador, com o atlas real):**
  - topo da cabeça ≥ base dos nomes do HUD + 4 px em `idle*`, `walk*`, `block` e `win`, com a câmera em z = 1,075;
  - topo ≥ 0 no ápice do pulo;
  - foto da medição.
  - Se falhar: baixar `scale` em passos de 0,02 (o dado é um número só).

### 9.2 Hurtbox (achado A3)

A caixa em pé tem 254 px fixos, e a 1,36 cerca de 93 px da cabeça e dos ombros ficam fora dela. Proposta: **reusar
`alturaEmPe`** (E6a, que aceita fator > 1 e não pede código), com o valor **medido**, não chutado:
`alturaEmPe = round2(0,92 × altura visível do idle0 em px lógicos / 254,4)`.

Com 347 px, dá ≈ **1,25**. Só vale em `idle`, `walk` e `block` em pé. Agachado, no ar e em golpe seguem como hoje.
Efeito de balanço: o ZENON fica mais fácil de acertar no salto, o que ajuda a faixa de 20% a 40%. O harness roda com 1,0 e
com o valor medido e escolhe.

### 9.3 Âncora

O pipeline mede `ax` pelo **centro de massa em X** (`ferramentas/sprites/executar.mjs:235`). O casaco aberto para trás
puxa o centro para trás e muda de quadro para quadro, então o personagem "anda" parado.

**Proposta (Vega, pipeline):** uma exceção por lutador em `lutadores.json`, `ancora: 'tronco'`, que mede o centro de massa
só na faixa de 15% a 55% da altura do quadro (cabeça e tronco, sem a saia do casaco).

**Critério:** `|ax(idleN) − ax(idle0)| ≤ 4 px` e `|ax(walkN) − média(walk)| ≤ 8 px` no `alturaRef`, conferidos na folha de
contato.

### 9.4 Atlas e carga sob demanda

- **Estimativa (não medida).** O BAATAR tem 54 quadros, `alturaRef` 525 e 4 páginas de 2048×1664 (2,06 MB em WebP, ≈
  54 MB decodificados). O ZENON terá 60 quadros (S1–S10) ou 66 (com S11), com `alturaRef ≈ 410 × 1,36 ≈ 558` (mesma
  densidade de pixel). Isso dá ≈ 1,22 a 1,34 × 1,13 ≈ **1,4 a 1,5 vezes o BAATAR**: **5 páginas** de 2048 de largura, ≈ 2,8
  MB em disco e ≈ 75 a 80 MB decodificados. O `MAX_PAGINAS` é 8, então cabe.
- **Teto proposto:**
  - ≤ 5 páginas e ≤ 3 MB em disco;
  - decodificado ≤ 80 MB;
  - na luta de chefe, o total decodificado (jogador + ZENON + cenário) ≤ 150 MB, medido no perfil de celular;
  - se passar, baixar o `alturaRef` para 500 (a cabeça é desenhada 1,39× maior que o atlas, contra 1,24× hoje; a perda é
    aceitável num corpo de casaco liso).
- **Carga sob demanda:** nada novo. O ARCADE já pré-busca o próximo rival (`prebuscarProximoRival`) e a `espera` segura a
  luta até decodificar, então a entrada dramática nunca desenha o atlas vazio.
- **Critério (e2e, `arte-sob-demanda.spec.ts`):** nenhuma página `zenon/atlas-*.webp` é pedida antes da 5ª luta do
  ARCADE. O `retrato.png` dele é carregado no boot (é usado escurecido no aviso e na casa de honra).

---

## 10. Balanceamento (E6) e QA

**Harness (Vega, na Z1):**
- tirar o `baatar` fixo do agregado (vira estatística por lutador);
- o bloco de chefe usa `regras.chefe` e é pulado com `null` (o estado da Z0);
- o ZENON provisório entra marcado como provisório no relatório.

**Metas (o harness sinaliza; a Íris decide com a Vega; o dono fecha no chefe):**

| Métrica | Meta |
|---|---|
| Jogador-CPU no NORMAL contra o ZENON chefe (os 9 regulares, níveis 1 e 2, 100 sementes) | vence **20% a 40%** (`METAS.chefeJogador`, já existe) |
| Fase 2 alcançada (troca de barra) | ≥ 50% das lutas: a fase 2 é o show e tem de aparecer |
| Cenas executadas / trocas de barra | 100% (toda troca de barra vira cena) |
| Especiais do jogador por luta contra o ZENON | ≥ 0,6 × a média contra os regulares (o dreno não pode zerar o kit) |
| Dreno médio por luta | registrar (sem meta; dado para o dono) |
| Tempo esgotado | < 10% |
| Lutas travadas | 0 |
| ZENON jogável (se D-Z1 = sim) na matriz regular (10 × 9) | taxa geral 42% a 58% |
| BAATAR normal com MERGULHO (Z0) | taxa geral 42% a 58% |

**Rodada final com o atlas real (Z5), N = 200.**

**QA, em cada fatia:**
- `npm run typecheck`, `npm test` (fidelidade e snapshot **sem** `-u`, com o `.snap` conferido intocado) e `npm run build`;
- a Íris valida e pode reprovar. Os e2e ficam com a Lyra.

**Prova de "pronto" do chefão:** a luta de chefe inteira jogada no navegador com o atlas real (entrada, fase 1, troca,
cena, fase 2, vitória e derrota), com fotos. Depois, a sessão do dono.

---

## 11. Progresso, migração e rollback

### 11.1 `chefeDerrotado`

Hoje ele é gravado (`progresso.ts:55`) e **ninguém o lê** para decidir nada: o desbloqueio do chefe usa
`vitoria.derrotouChefe` e o estado da casa usa `liberados()`.
- **Proposta (Cronos):** **não criar campo novo.** "O ZENON está liberado" = `'zenon' ∈ desbloqueados`, pelo mesmo
  mecanismo da ED3a.
- `chefeDerrotado` fica como legado ("derrotou um chefe alguma vez"), documentado em `meta/tipos.ts`.
- Um teste de arquitetura garante que nenhum arquivo de `src/ui` lê `chefeDerrotado`.
- Assim, quem derrotou o BAATAR chefe não ganha o ZENON de graça e não perde nada.

### 11.2 Quem já derrotou o BAATAR (nada se perde)

| Situação salva | Depois da mudança |
|---|---|
| `baatar ∈ desbloqueados` (derrotou o chefe) | continua jogável. `proximoDaFila` pula o BAATAR, então a fila desse jogador termina na NILA e a próxima zerada não libera ninguém da fila. Derrotar o ZENON libera o ZENON |
| `zeradas ≥ 4` sem o BAATAR | a próxima zerada libera o BAATAR (5º) |
| `chefeDerrotado: true` | sem efeito (§11.1) |

**Testes (Cronos, `progresso.test.ts`):** os 3 casos da tabela, mais "derrotar o ZENON com a fila esgotada libera só o
ZENON" e "jogando COM o ZENON não há chefe (ED7) e a zerada só avança a fila".

### 11.3 Ids novos e rollback

- `'zenon'` passa em `FORMA_ID_DESCONHECIDO` (`/^[a-z0-9][a-z0-9-]{0,31}$/`). **A regex não muda.**
- **Volta (rollback):** um save com `'zenon'` lido por um build sem ele faz o id ir para `desconhecidos` e ser preservado.
- **Ida de novo:** o id é promovido de volta a `desbloqueados`. É o mecanismo das ondas.
- **Teste:** ida e volta de `{ desbloqueados: ['baatar', 'zenon'] }` por `sanearProgresso` com o roster de hoje e com o de
  10.
- **Ordem do flip (achado A7):** `'zenon'` entra em `IDS_LUTADORES`, `LUTADORES`, `ROSTER` e `CENARIOS.gr`, e
  `CHEFE = 'zenon'`, **num commit só, a Z5**, junto com `public/assets/lutadores/zenon/` e `cenario-gr.webp`.
  - Antes disso, o def fica em `src/data/lutadores/zenon.ts` como `ZENON_DEF: Omit<LutadorDef, 'id'>`, com `ID_ZENON = 'zenon'`
    e `stage: 'mn'` provisório (o `'gr'` ainda não existe no tipo). O flip troca para `'gr'`.
  - Os testes montam a fixtura com o cast no helper (o molde de `_kit-e3.ts`) sobre o atlas do WEI LONG.
  - Um modo dev `?chefe=provisorio` (só em `import.meta.env.DEV`, fora do bundle, como `dev-expansao.ts`) deixa a Lyra
    ver a luta com o ZENON provisório no `mn`.
- **Rollback de produção:** reverter a Z5 restaura o jogo com o BAATAR normal e sem chefão (o estado da Z0). Reverter
  também a Z0 volta o BAATAR chefe. Os saves sobrevivem nas duas direções.
- **Risco R9:** entre a Z0 e a Z5, o ARCADE fica **sem chefão**. Se o Atlas publicar a Z0 sozinha no Pages, o jogador
  termina o ARCADE na 5ª luta. Isso é aceitável num site de teste, mas é decisão de publicação do Atlas.

---

## 12. Fatias, donos, ordem e critérios

```
Z0 (Vega, em curso) ──► Z1 (Vega) ──► Z2 (Lyra) ──► Z3 (Lyra) ──┐
                         │  └──────► Z4 (Vega, música) ──────────┤
                         └──► Z6 (Cronos) ───────────────────────┤
A1 (Apolo, arte; começa já, em paralelo) ──► Z5 (Vega: pipeline + flip) ──► Z7 (Vega + Íris: balanço final) ──► Z8 (Alexandria) ──► Órion ──► deploy
```

| Fatia | Dono | Tam. | Conteúdo | Aceite (medível) |
|---|---|---|---|---|
| **Z0** | Vega | P–M | BAATAR normal: sai `chefe`/`fichas`; MERGULHO no `base.sFwd` com `poseDaFicha` `sc0/sc1 → dive0/dive1` na base; `FILA` + `baatar`; `CHEFE = null`; os testes de chefe passam a usar uma fixtura de chefe de teste; e2e de chefe auditados (`cinematica.spec.ts:398` `baatar/chefe2/sFwd`, `expansao.spec.ts:155`, `celular-e7a.spec.ts:213`) | testes de §3.6 da E3 verdes com a fixtura; snapshot intacto; harness do BAATAR normal 42% a 58% |
| **Z1** | Vega | M | §1 `drenaEnergia` + `dreno`; §2 `CenaDef`, `cena`, etapa `'cena'`; `trilha?`; `'anel'` no tipo (o `'gr'` **não**: `CENARIOS` é um `Record<IdCenario, …>` com `casa: IdLutador`, então entra só no flip da Z5); `ZENON_DEF` provisório (fichas, IA, `alturaEmPe` medido no provisório); harness genérico (§10) | testes §1.2 (1–6); cena do ZENON provisório com `ficha === 'chefe2'` no fim; `montar` rejeita os dados inválidos; snapshot intacto |
| **Z2** | Lyra | M | §3.1 poses de entrada e vitória; `APRESENTACAO` (BAATAR, ZENON); aviso por chefe; §4.3 aura + `SOBREPOSICOES_DE_CENARIO`; esquiva tingida; dreno visual (moedas para a barra); §7 grade de 10; §8 `anel` + E12 + 5 registros na tabela | §7 (interseção 0, ↓↓↓↑ = 7); fotos fases 1 e 2; ≤ 24/16/12 primitivas (contexto falso); tempo de quadro na fase 2 ≤ 1,15× |
| **Z3** | Lyra | M | §3.2 entrada dramática + e2e | unit de determinismo (§3.2); e2e (a)–(d) |
| **Z4** | Vega | P–M | §5 trilhas + `playChefe` + `musicaDaFase` | testes §5 (1–4); escuta do dono (não bloqueia) |
| **Z6** | Cronos | P | §11 testes de migração e rollback; doc do legado `chefeDerrotado`; teste de arquitetura | os 5 casos de §11.2 e a ida e volta de §11.3 |
| **A1** | Apolo | G (arte) | prompts finais em `docs/prompts-arte.md` + gerador; mestra (aprovação do dono antes das folhas); S1–S10 (S11 se D-Z4); cenário `gr`; **nomes de pose** abaixo; curadoria (contagem de componentes, linha do chão a 84,5%) | 60 (ou 66) quadros nomeados; cenário com a faixa de 80% a 90% livre, medida; ≤ 110 créditos |
| **Z5** | Vega | P–M | pipeline (`lutadores.json` com `ancora: 'tronco'` e `alturaRef`); atlas real; **flip** (§11.3); teste "toda pose citada existe no atlas" | §9.3 (≤ 4/8 px); §9.4 (≤ 5 páginas, ≤ 3 MB); boot sem erro; e2e de carga sob demanda; Lyra mede §9.1 com o atlas real |
| **Z7** | Vega + Íris | M | harness N = 200 com o atlas real; ajuste de `pow`, `hpPorBarra`, dreno e `alturaEmPe` | metas do §10; relatório em `docs/balanco/` |
| **Z8** | Alexandria | P | `como-adicionar-um-lutador.md` (cena, entrada, vitória, trilha, `drenaEnergia`); `arquitetura.md`; CHANGELOG; conferir a §3.10 da identidade contra o código | doc conferida contra o código |

**Nomes de pose do ZENON (contrato Apolo → Vega → Lyra):** os de sempre (`idle0-3`, `walk0-7`, `crouch`, `block`, `cblock`,
`jsquat`, `jup`, `jtop`, `jfall`, `land`, `hitH`, `hitB`, `kdAir`, `koFloor`, normais e aéreos, `sa0-3`, `sb0-3`, `sc0-1`,
`win`) mais `decreto0-2` (S9 linha 1), `vitoria0-1` (S9 linha 2, células 2 e 3; `win` = célula 2), `entrada0-2` (S10
linha 1) e `cena0-2` (S10 linha 2). Com S11: `f2Idle0-3` e `f2Walk0-1`, ligados pela `poseDaFicha` da `chefe2`.

**Paralelismo real hoje:**
- A1 (Apolo) não depende de código e deve começar já, porque é o caminho crítico.
- A Z2 pode começar a grade de 10 (§7) só com a fixtura dev, antes da Z1.
- Z4 e Z6 são independentes de Z2 e Z3.

---

## 13. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Deriva do casaco e das tiras entre as células (arte) | "plain gold trim"; anexar a S1 aprovada; `ancora: 'tronco'` (§9.3) |
| R2 | Memória do atlas de 5 páginas no celular | teto do §9.4; `alturaRef` 500 como reserva; medir no E7a |
| R3 | Cabeça encostando no HUD a 1,36 | medir (§9.1); `scale` em passos de 0,02 |
| R4 | O dreno anula o kit do jogador (frustração) | meta "especiais ≥ 0,6×" (§10); valores no harness |
| R5 | Aura e sobreposição custam quadro no celular | orçamento de primitivas; ≤ 1,15× medido |
| R6 | A entrada vaza para o lock-step | o motor não é chamado; unit de determinismo com hash e RNG (§3.2) |
| R7 | e2e de chefe quebram (Z0) ou ficam lentos (Z3) | auditoria listada na Z0 e na Z3 |
| R8 | `'zenon'` em `IDS_LUTADORES` antes da arte quebra o boot | flip só na Z5 (§11.3) |
| R9 | ARCADE sem chefão entre a Z0 e a Z5 | decisão de publicação do Atlas (§11.3) |
| R10 | A troca do sequenciador muda o tempo das trilhas atuais | referência de chamadas gravada antes (§5, teste 1) |
| R11 | Semelhança com o vilão citado e cultura grega | as listas de afastamento da proposta §1.5; selo grego desligado até revisão nativa |

**Dívidas conscientes:**
- A armadura do ZENON f2 vale só nos golpes com `armor:1`, não parado (§4.1).
- O IA_CHEFE é global, não por chefão.
- A fala vai em legenda, sem voz.

---

## 14. Decisões do dono (poucas)

| # | Decisão | Recomendação |
|---|---|---|
| **D-Z1** | O ZENON é jogável depois de derrotado? | **Sim**: mantém a regra já decidida ("chefão jogável após derrotá-lo"). Jogável = ficha base, 1 barra, sem armadura, TRIBUTO com dreno menor (harness). Custo: entra na matriz regular do harness |
| **D-Z2** | Posição do BAATAR na grade | **9ª casa (ordem da fila)**, com o AMINU no centro e o ZENON na casa de honra embaixo. A alternativa é o BAATAR no centro, com a ordem escrita à mão |
| **D-Z3** | Entrada dramática | **COMPLETA (2,6 s) na 1ª luta contra o chefão de cada ARCADE; CURTA (1 s) depois de um continue**; pular sempre. A alternativa é sempre COMPLETA |
| **D-Z4** | Folha S11 (idle e andar da fase 2, +6 créditos) | **Não, por enquanto.** A fase 2 já se lê pela cena, pela aura, pela arena, pela música e pelos golpes. Dá para gerar depois sem mexer em código (`poseDaFicha`) |

Continuam da proposta, sem bloquear código: orçamento de créditos (§7.5) e revisão nativa do selo em grego (§7.6).
