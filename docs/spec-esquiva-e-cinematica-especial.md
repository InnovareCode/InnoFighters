# Spec: ESQUIVA e CINEMÁTICA DO ESPECIAL

Autora: Nova (arquitetura), 2026-10-21. Status: **proposta**, nada implementado. Base lida: `src/core/contratos.ts`,
`src/fight/{game,fighter,cpu,colisao}.ts`, `src/input/{mapa,teclas,toque,gamepad}.ts`, `src/render/{efeitos,hud,lutador}.ts`,
`src/ui/cenas/fight.ts`, `src/core/storage.ts`, `tests/unit/fight.test.ts`, `tests/unit/luta-fidelidade.test.ts`, `docs/arquitetura.md`,
`docs/plano-expansao.md` (ED10), `docs/mecanicas-e3.md`, `PROGRESSO.md`.

Pedido literal do dono:

- **(A) ESQUIVA**: o lutador esquiva para TRÁS ou para FRENTE. Segue a lógica do especial: só sai com a barra mínima de um
  especial.
- **(B) CINEMÁTICA DO ESPECIAL**: todo especial, de qualquer um dos 9 (chefão e CPU incluídos), mostra por um instante a tela
  escurecendo, uma tarja central com o lutador em destaque e brilhos. Depois vem a animação dos acertos com os danos na tela,
  **só se o rival não defender**. Na defesa os acertos não contam (nem contador), mas a animação premium aparece sempre.

## 0. Contexto e hipóteses

- Jogo local, sem netplay, dono solo, 9 lutadores no ar (commit `c7437c1`). Os testes de proteção são o snapshot CPU x CPU
  (semente 42, `tests/unit/fight.test.ts:202`), o lock-step contra o protótipo nos 4 originais
  (`tests/unit/luta-fidelidade.test.ts`) e os e2e pixel a pixel com `?expansao=4`.
- O snapshot conta os eventos **por `tipo`** (`fight.test.ts:185`). Consequências:
  - campo novo num evento que já existe **não** muda o snapshot;
  - tipo novo de evento muda, então só pode sair com a flag ligada;
  - congelar a luta por N chamadas de `update()` também muda, porque o laço do teste tem tamanho fixo.
- O lock-step compara pose e **sons**, que vêm de `audio/eventos.ts`. O som de `special` não pode mudar.
- Hoje o motor já tem: corrida e recuo por toque duplo (`fighter.ts:534-547`, recuo com 6 ticks de `invuln`), `invuln` que
  desliga acerto, arremesso (`canThrow` exige `!untouchable`) e empurrão de corpos (`separate`, `game.ts:505`), rastro
  fantasma (`trail`) e contador de combo que já ignora a defesa (`gotHits` só sobe no acerto, `game.ts:707`).

## 1. Decisão estrutural

| # | Decisão | Por quê |
|---|---|---|
| E0 | **A esquiva é mecânica do motor** (`fight/`), ligada pela flag `ConfigPartida.esquiva`. **A cinemática é só apresentação** (`ui/` + `render/`). A luta nem sabe que ela existe. | A esquiva muda o resultado (invulnerabilidade, energia, CPU), então tem que ser determinística e testável em `fight/`. A cinemática é uma pausa de apresentação: o resultado da luta não pode depender de quanto ela dura, nem de o jogador pular. Fora do motor, snapshot e lock-step ficam intactos **por construção**, sem depender de flag. |

Alternativa descartada: **congelar no motor** (`ConfigPartida.cinematicaEspecial` com um `congelado = N` no `passo`, como o
hitstop). Seria preciso desligá-la em todos os testes. Além disso, a duração vem de uma preferência do jogador (completa,
curta, desligada, pular) e passaria a fazer parte do estado da luta: `t` e `tick` mudariam conforme o gosto de quem joga.
Também não traz ganho, porque a CPU não "vê" a cinemática e não há netplay. Se um dia houver netplay com rollback, a pausa
vira um número fixo de ticks no motor (regra registrada em §8, R6).

## 2. (A) ESQUIVA

### 2.1 Tabela de decisões

| # | Item | Decisão | Alternativas descartadas |
|---|---|---|---|
| A1 | **Entrada** | **Botão dedicado ESQUIVA + direção**: segurando trás = recuo; frente = avanço; neutro, ↓ ou ↑ = recuo (o padrão é defensivo). C2 ganha `esq?: boolean` (borda, opcional, ausente = false). | (a) **Toque duplo**: já é a corrida e o recuo (`fighter.ts:534`), que saem no 2º toque, sem janela para decidir. (b) **Dois botões juntos** (SF+CF, como no KOF): o buffer pega o 1º botão e o soco fraco já sai no mesmo tick (`fighter.ts:446-451, 522-528`). Exigiria atraso de entrada, o que muda a fidelidade. (c) **ESP + trás**: ESP+neutro/trás já é `sFire` e ESP+frente é `sFwd` (`fighter.ts:350`). (d) **Corrida vira esquiva quando há barra**: gastaria energia sem o jogador querer e acabaria com a corrida grátis. |
| A2 | **Teclas** | P1 `n` (ao lado do `b` = ESP). P2 `o` (acima do `l` = ESP). Gamepad: **L1 (botão 4) e L2 (botão 6)**, ambos ESQUIVA, como R1/R2 são ambos ESP. Toque: botão redondo **ESQ** no canto superior esquerdo do losango de 4 botões (`#pad`), que hoje está vazio, perto do polegar direito. A direção vem do joystick. | Teclas livres conferidas: a luta usa `p`, `h`, `r`, `t` e `Escape`, e `f`/`m` são globais (`ui/cenas/fight.ts:229-264`, `intro.ts:59`). Toque: uma 2ª pílula acima de R1 foi descartada porque falta altura em celular baixo (R1 já está em `10vh + 3,5u`). Gesto de arrastar foi descartado: briga com o joystick e é difícil de descobrir. |
| A3 | **Prioridade e buffer** | Buffer próprio `bufEsq` de **6 ticks**, separado do `buf` de ataque (9 ticks). No estado livre no chão, a esquiva é checada **antes** do buffer de ataque. Se as duas coisas saem no mesmo tick, a esquiva vence e zera `buf`. | Usar o mesmo `buf` misturaria a esquiva com `resolveAttack` e com os comandos (`hist`). |
| A4 | **Custo** | **Fixo: 20 de energia** (`ESQUIVA_PADRAO.custo`). Exigência = custo: precisa de `en >= 20`, igual ao `canAfford` dos especiais (`fighter.ts:380`). Pode ser sobrescrito por lutador (`LutadorDef.esquiva?.custo`) só se o harness da E6 pedir. **Decisão do dono DD1.** | **Custo do especial mais barato do lutador** (leitura literal; hoje vai de 20 a 28: WEI LONG 28, CENTELLA 25, demais 20). Descartado porque acopla a esquiva ao balanço de especiais: mexer no custo de um especial na E6 mudaria a esquiva em silêncio. As fichas também mudam o mínimo (postura da NILA, fase 2 do chefão), e a NILA tem um especial de custo 0 (VADIVU). 20 é o especial mais barato do elenco, então continua sendo "a barra mínima de um especial". |
| A5 | **Sem barra** | Sem efeito e sem consumo. Emite o evento `deny` que já existe (o mesmo som do especial sem energia, `fighter.ts:531`). | Sair uma esquiva "fraca" sem invulnerabilidade: confunde, porque parece que funcionou. |
| A6 | **Duração e distância** (valores de partida, a E6 ajusta) | **Recuo**: 22 ticks (0,37 s), cerca de 120 px, invulnerável nos ticks [0, 14), recuperação de 8 ticks. **Avanço**: 26 ticks (0,43 s), cerca de 150 px, 3 ticks de arranque vulneráveis, invulnerável em [3, 19), recuperação de 7 ticks. Velocidade decrescente (`v = k·(1 − t/T_mov)`, com `k = 2·dist/T_mov`), sem pulo (`y` fixo no chão). Escalada por `ch.spd`, como a corrida. | Copiar o recuo atual (18 ticks, 6 de `invuln`): seria só um recuo caro. A esquiva tem de valer os 20 de energia. |
| A7 | **Invulnerável a quê** | Durante a janela: **golpes, projéteis e agarrões** (arremesso comum, ABRAÇO e HURACANRANA). Usa o `invuln` que já existe, então `untouchable` desliga acerto, projétil (`game.ts:524, 545`) e `canThrow` (`fighter.ts:371`). O **avanço atravessa o corpo do rival** (`separate` não empurra quem está `untouchable`) e **atravessa projéteis**, que seguem voando. Não atravessa a parede (clamp 60..900). | Invulnerável só a projéteis (um "deslize"): pobre demais para o custo. Invulnerável a tudo, inclusive na recuperação: impossível de punir. |
| A8 | **Recuperação e punição** | Na recuperação: sem `invuln`, não bloqueia (`'esquiva'` fora de `ESTADOS_QUE_BLOQUEIAM`), pode ser arremessado (`'esquiva'` entra na lista do `canThrow` para alvo no chão) e **acerto nela conta como CONTRAGOLPE** (`counter = d.state === 'move' \|\| d.state === 'esquiva'`). A esquiva não regenera energia (igual a `dash`, que também não chama `regen`). | Sem contragolpe na recuperação: esquivar à toa sairia barato. |
| A9 | **Onde pode** | Só **no chão, em estado livre**: `idle`, `walk`, `crouch`, `land`. Fica de fora: no ar, em `prejump`, durante golpe (não cancela golpe), em `hit` (atordoado), em `block` e em `down`/`ko`/`win`/`cena`. O `bufEsq` de 6 ticks deixa a esquiva sair **no 1º tick livre** depois do bloqueio, do atordoamento ou do levantar (reversão), sem ser cancelamento. | **Esquiva de guarda** (sair do bloqueio gastando 2x, como no KOF): é primitiva nova e anula a pressão sobre quem bloqueia. Fica como possível item futuro, não entra agora. **Cancelar golpe em esquiva**: viraria "golpe seguro" grátis. |
| A10 | **Combos** | A esquiva não entra nem sai de combo: não cancela golpe e não é cancelada. Acertada na recuperação, começa um combo novo (contragolpe). | Não há. |
| A11 | **Chefão** | O BAATAR tem esquiva como todos. A armadura dele só vale em `move`, então não interfere. Pode ter `esquiva` própria no `LutadorDef` (mais lenta e curta: 24/28 ticks, 100/130 px) se o harness mostrar que precisa. Na Dança da Águia não há entradas (fase `cena-chefe`), logo não há esquiva. **DD4** trata da CPU do chefão. | Proibir a esquiva no chefão: tiraria do BAATAR jogável o que os outros 8 têm. |
| A12 | **Flag** | `ConfigPartida.esquiva?: boolean`, **padrão false**. O `Game` expõe `esquivaLigada` para o `Fighter` (via `PartidaParaLutador`) e para a CPU. Com false, `esq` é ignorado **antes de qualquer conta**: nenhum estado, nenhuma energia, nenhum `deny`, nenhum `rnd`. Quem liga é a UI, a partir de `Regras.esquiva` (`meta/tipos.ts`): `REGRAS_PADRAO` = true, `regrasExpansao` = true, `regrasDeQuatro` (`?expansao=4`) = false. | Ligar por padrão no `Game`: quebraria o snapshot, o lock-step e o harness sem aviso. |

### 2.2 CPU

Regra de RNG: **nenhum `rnd()` novo com `esquivaLigada === false`**. Com a flag ligada, o `rnd()` extra só acontece depois de
o lutador poder esquivar (chão, estado livre ou golpe acabando, `en >= custo`) e de o nível ter chance maior que zero.

| Nível | `esq` (chance de trocar a defesa por esquiva) | `punir` (chance de punir a recuperação do rival) |
|---|---|---|
| FÁCIL | 0 (não esquiva e não sorteia) | 0 |
| NORMAL | 0,25 | 0,35 |
| DIFÍCIL | 0,5 | 0,7 |
| Chefe | o do nível + `IA_CHEFE.bonusReacao` (teto 1) | idem |

Os campos novos `esq` e `punir` entram em `AI_LEVELS` e `PerfilCpu`; `perfilChefe` os copia.

Onde a CPU decide (`fight/cpu.ts`):

1. **Golpe corpo a corpo do rival** (ramo 1, `cpu.ts:188`). A esquiva só é considerada depois que a CPU já decidiu defender
   (`rnd() < L.block`) e só se o golpe do rival for especial (`nome[0] === 's'`) ou `heavy`. Sorteia `rnd() < L.esq` e, se
   der, faz o recuo. Usa `ai.reacao` com espera para a invulnerabilidade cobrir o impacto (mesma conta da PARADE em
   `cpu.ts:199-201`). Nesse caso a CPU não sorteia o `rnd() < 0.3` do agachar.
2. **Projétil vindo** (`cpu.ts:209`). No ramo de bloquear, sorteia `rnd() < L.esq` e, se der, faz o **avanço** quando o
   projétil estiver a menos de cerca de 90 px. Atravessa o projétil e chega perto do rival.
3. **Punir esquiva**. Se o rival está em `esquiva` sem `invuln` (recuperação) a menos de 110 px: um `rnd() < L.punir` e,
   se der, arremessa (`canThrow`) ou usa `hp`.

O DIFÍCIL não esquiva "perfeito" sempre: o teto de 0,5 deixa espaço para o bloqueio comum.

### 2.3 Contratos

**C2** (`core/contratos.ts`):

```ts
export type InputFrame = { /* ... */ sp: boolean; spSeg?: boolean;
  /** ESQUIVA: borda de descida do botão dedicado. Opcional: ausente = false (quadros do protótipo e CPU antiga seguem iguais). */
  esq?: boolean };
```

`input/mapa.ts`: `Acao` ganha `'esq'`, `CTRL_P1.esq = 'n'`, `CTRL_P2.esq = 'o'`, `BotaoPad` ganha `'l1' | 'l2'` (botões 4 e
6). `teclas.ts` preenche `esq` em `ler` e `lerMesclado`. `INPUT_VAZIO` e `NO_INPUT` **não** ganham o campo: ausente já vale
false, e o protótipo nunca o produz.

**C3, aditivo:**

```ts
export type EstadoLutador = /* ... */ | 'esquiva';   // nunca ocorre com ConfigPartida.esquiva desligada
// LutadorLeitura (valor sem a mecânica: 0):
  /** Esquivando: 1 = avanço, -1 = recuo, 0 = não. Invulnerável agora = `invuln > 0` (já publicado). */
  esquiva: 0 | 1 | -1;
// EventoLuta (só com a flag ligada):
  | { tipo: 'esquiva'; lutador: IndiceLutador; dir: 1 | -1; x: number }
  | { tipo: 'esquivou'; lutador: IndiceLutador; atacante: IndiceLutador; x: number; y: number; projetil: boolean }
```

- `esquiva`: sai ao começar. Receitas: poeira (`x`, 7, 1), flash curto na cor `fire[0]` do lutador e som `swing(1)`.
- `esquivou`: sai quando uma caixa de golpe ativa ou um projétil sobrepõe a hurtbox de quem está na janela invulnerável da
  esquiva. Sai **uma vez por golpe** (`atkId`) ou por projétil (`id`) em cada esquiva. Receitas: texto `ESQUIVOU!`
  (`#bfe9ff`, 20) no lutador e o som `uiSelect(1.4)`. Mostra ao jogador que a esquiva funcionou. Não dá energia nem pontos.
- Sem som novo: o áudio continua 100% sintetizado (D8) e reusa métodos que já existem. Mapear em `audio/eventos.ts`.

**Dados**: `ESQUIVA_PADRAO` em `data/base-moves.ts` (ou `data/esquiva.ts`):
`{ custo: 20, buffer: 6, tras: { dur: 22, invIni: 0, invFim: 14, dist: 120 }, frente: { dur: 26, invIni: 3, invFim: 19, dist: 150 } }`.
`LutadorDef.esquiva?: Partial<...>` é opcional e só existe se a E6 pedir.

### 2.4 Animação (sem arte nova)

- Pose (escolhida em `fighter.poseT`, `case 'esquiva'`): na janela invulnerável, **`crouch`** com `rot` −0,12 no recuo e
  +0,12 no avanço (corpo baixo, inclinado). Na recuperação, **`land`**. Os dois quadros existem para todos (a cadeia de
  fallback de `getPD` cobre os atlas v1). Fica diferente da corrida (`walk*`) e do recuo, que pula (`jup`).
- Rastro: `'esquiva'` entra no `trailing` (`fighter.ts:463`) e reaproveita as silhuetas brancas que já existem.
- Render (`render/lutador.ts`): com `esquiva !== 0 && invuln > 0`, o corpo sai com alfa 0,55 (efeito "fantasma") e há uma
  faixa de velocidade atrás, em gradiente `fire[0]` → transparente, desenhada com `lighter` e sem `shadowBlur`. O Apolo valida
  cor e alfa em captura.
- Descartado: **cambalhota girando o sprite inteiro**. O giro é em torno de 45% da altura (`PoseAtual.rot`), então de cabeça
  para baixo metade do corpo entra no chão.

### 2.5 HUD e "Como jogar"

- Barra de energia (`render/hud.ts:125-156`): segundo marcador em `custoEsquiva` (20%), em ciano, ao lado do marcador dourado
  do especial. Selo **ESQ** pequeno junto do rótulo SUPER: apagado com `en < 20`, aceso e pulsando com `en >= 20`. Só aparece
  com `Regras.esquiva`.
- Toque: o botão ESQ ganha a classe `.sem` (opaco) quando `en < custo`. A cena da luta troca a classe só quando o estado
  muda.
- "Como jogar" (`ui/cenas/how.ts`): uma linha nos controles ("N / O / L1: esquiva; com → avança, com ← ou parado recua; custa
  1 especial") e outra no sistema.

### 2.6 Testes (cada um falha sem a mecânica)

Unidade (Vega), em `tests/unit/esquiva.test.ts`:

1. Flag desligada com `esq: true`: estado, `en`, eventos e posição idênticos ao quadro sem `esq` por 300 ticks.
2. Flag ligada, `en = 20`, `esq` + trás: estado `esquiva`, `en` 0, um evento `esquiva` com dir −1, deslocamento de
   120 ± 12 px e `invuln > 0` exatamente nos ticks [0, 14).
3. `en = 19`: um `deny`, estado e `en` iguais.
4. Jab, projétil e arremesso na janela invulnerável: `hp` igual e um `esquivou` por golpe. O mesmo golpe na recuperação dá
   `hit` com `contragolpe: true`. Arremesso na recuperação: `throw`.
5. Avanço começando a 90 px do rival: o sinal de `opp.x − x` inverte (atravessou) e não houve empurrão durante a janela.
   Avanço contra projétil: o projétil continua vivo depois de passar.
6. Ignorada no ar, em `prejump`, em golpe, em `hit` e em `block`. Apertada 4 ticks antes de o bloqueio acabar: sai no 1º tick
   livre. Apertada 7 ticks antes: não sai.
7. Recuperação não bloqueia: segurando trás, toma `hit`, não `block`.
8. CPU com contador de `rnd` (o Proxy dos testes da E3, `tests/unit/_kit-e3.ts`): com a flag desligada, a sequência é igual à
   de hoje; FÁCIL com a flag ligada não ganha nenhum `rnd` dos ramos 1 e 2.
9. **Snapshot novo** `CPU x CPU semente 42 COM esquiva` (teste novo, entrada nova no `.snap`). O snapshot antigo continua sem
   `-u`: o `git status` de `tests/unit/__snapshots__` só mostra a entrada nova. O lock-step (`luta-fidelidade`) passa sem
   tocar.
10. Mutantes (prática da Vega na E3): sem `invuln`, sem custo, sem contragolpe na recuperação, sem buffer, direção invertida,
    avanço sem atravessar. Cada mutante tem de matar ao menos um teste.

E2E (Lyra): `n` + `←` no P1 de verdade (`?seed=7`): pelo gancho de DEV, o estado vira `esquiva` e a energia cai 20. Toque:
`tap` no ESQ com o joystick para a frente. Gamepad: unidade com `PadLike` falso, L1 → tecla `n`.

## 3. (B) CINEMÁTICA DO ESPECIAL

### 3.1 Tabela de decisões

| # | Item | Decisão | Alternativas descartadas |
|---|---|---|---|
| B1 | **Gatilho** | O evento `special` (sai em `startMove` quando `mv.cost > 0`, `fighter.ts:396-398`). Isso cobre os 3 especiais pagos dos 9, a CPU e o chefão. **A VADIVU da NILA (custo 0) e a Dança da Águia não disparam**: a VADIVU é troca de postura, e a dança já tem a etapa `fase-chefe` 'danca'. | Disparar no 1º quadro ativo (`mt === S`): o acerto já estaria resolvido naquele tick, e as faíscas sairiam antes da tarja, invertendo a ordem que o dono pediu. |
| B2 | **Onde congela** | Na cena da luta (`ui/cenas/fight.ts`). Com a cinemática ativa, `update()` **não chama `game.update`**, igual a `paused`. Partículas, pétalas e `efeitos.avancar` param junto. A cinemática anda no seu próprio relógio, a 60 Hz de apresentação. O que for apertado durante ela se perde, como no hitstop (`fimDoTick` limpa as bordas). Teclas seguradas continuam valendo. | No motor: ver E0. |
| B3 | **Fluxo e tempos** | **COMPLETA, 48 ticks (0,8 s):** escurece de 0 a 72% em 0–5 e há flash `fire[1]` com alfa de 0,35 a 0 em 0–3. A tarja entra deslizando do lado de quem atacou em 4–13. Nome do especial com "pop" (1,3 → 1) em 8–14. Brilhos em 8–38. A tarja sai pelo lado oposto em 36–47, e o escurecimento cai para a **vinheta de sessão** (20%). A luta volta no tick 48. **CURTA, 20 ticks (0,33 s):** escurece até 50% e há o flash, o atacante fica em destaque com halo, o nome do especial aparece pequeno sobre ele e não há tarja. | 1,2 s ou mais: com 3 especiais por lutador e CPU usando, a luta arrasta. Menos de 0,5 s para a tarja: não dá para ler o nome. |
| B4 | **Para não ficar chata** | Por **luta** (zera no `setup`): a 1ª vez de cada par (lutador, golpe) sai **COMPLETA**, e as repetições saem **CURTA**. No **treino** é sempre CURTA. **Pular**: qualquer botão de ataque ou ESP de um humano, ou um toque no canvas, vai direto para a saída (≥ 6 ticks de fade). Dois especiais no mesmo tick: fila. O 1º sai pela regra, o 2º sai CURTA logo em seguida. **Decisão do dono DD3.** | **COMPLETA sempre** (leitura literal): cerca de 0,8 s a cada especial, umas 6 a 12 vezes por round entre os dois lados. **Desligar nas repetições**: o dono pediu que a animação apareça sempre. |
| B5 | **Imagem na tarja** | O **quadro de pose do próprio golpe** no atlas (`ch.moves[golpe].pose` via `getPD`, com `chDaFicha` para NILA e chefão em fase 2), recortado na parte de cima do corpo, espelhado conforme o lado, com halo da silhueta (`arte.silhuetaDe`) em `lighter`. Reserva: `retrato.png` se o atlas não tiver imagem pronta. | **`retrato.png` 190x190** como principal: só mostra a cabeça, já está no HUD, e ampliado para a tarja (cerca de 280 px físicos com RS=2) fica borrado. A pose do atlas tem 410 px de altura de origem: o recorte sai perto de 1:1 e mostra a ação. |
| B6 | **Texto da tarja** | Nome do especial (`mv.name`, ex.: RAIJIN-DAN) em `textoArcade` 44 px e, menor (18 px), o nome do lutador (`ch.name`). Nomes em português, conforme a decisão de nomes do dono. | Descrição do golpe (`info`): longa demais para 0,8 s. |
| B7 | **Cores** | Por lutador, de `ch.fire` (com `chDaFicha`): faixa em gradiente `fire[2]` → `fire[0]` → `fire[2]`, borda de 3 px em `fire[1]`, listras diagonais brancas a 12%, formato inclinado como as barras do HUD (`caminhoInclinado`). O Apolo confere contraste do nome sobre a faixa (≥ 3:1, texto grande) nos 9, inclusive o amarelo-elétrico do HAYATO, que ainda está pendente. | Paleta fixa da marca para todos: perde a identidade do lutador. |
| B8 | **Brilhos** | Procedurais, com o `rngVisual` (nunca o RNG da lógica): 28 riscos de velocidade cruzando a tarja e 6 estrelas cintilantes em `fire[1]`, no máximo 40 partículas, numa lista própria da cinemática. Sem `shadowBlur`, sem `filter`, sem `getImageData`. | Partículas no `Efeitos` da luta: congelariam junto com a luta. |
| B9 | **Som** | Ao começar: `introWhoosh()`. No "pop" do nome: `introHit(0)`. A música cai para 50% durante a cinemática. Tudo chamado pela cinemática, **não** por `audio/eventos.ts`, então o som do evento `special` continua o mesmo (o lock-step compara sons). | Método novo de síntese: só se o Apolo reprovar a combinação dos dois (D8 continua). |
| B10 | **Acertos depois da tarja** | **Sessão de especial** por atacante, no render. Abre no `special` e fecha quando `fighters[i].move !== golpe` e não há projétil vivo dele marcado `especial`, ou em até 120 ticks. Cada `hit` com `especial: true` desse atacante durante a sessão gera: número de dano grande e flutuante (`-14`, cor `fire[1]`, contorno `fire[2]`), estrela extra em `fire[0]` e o contador **"N HITS"** do especial perto do defensor. Ao fechar, com N ≥ 1, aparece "TOTAL 42" por 40 ticks. A vinheta de 20% e o brilho do atacante duram a sessão inteira. | Contar pelo `combo` do HUD: ele só aparece a partir de 2 acertos (`gotHits >= 2`) e mistura golpes normais. |
| B11 | **Rival defendeu** | `block`, `parry` e `quebra-guarda` durante a sessão: **nenhum número, nenhum contador**. O raspão do bloqueio também não aparece. Fica o que já existe ("BLOQUEOU", escudo, "PARADA!"). A animação premium (tarja, vinheta, brilho, projétil) sai de qualquer forma. `armor` (o chefe absorve): mostra o número de dano em cinza, menor, e **não conta** acerto. `esquivou`: "ESQUIVOU!" e nada mais. | Mostrar o raspão como número: contraria o "se defender, os hits não contam". |
| B12 | **Números fora do especial** | Só nos especiais. **Decisão do dono DD5.** | Em todos os golpes: polui a tela e tira o que diferencia o especial. |
| B13 | **Modos** | **Versus, CPU e Arcade**: regra B4. **Treino**: sempre CURTA. **Chefão**: igual aos demais (a 1ª vez de cada especial do BAATAR sai completa). Dança da Águia: nada muda. Durante a fase `cena-chefe` não há especial. | Cinemática própria do chefão: é arte nova e escopo a mais. |
| B14 | **Flag e opções** | Liga com `Regras.cinematica` (true no padrão e no `?expansao=1`, **false no `?expansao=4`**) **e** com a preferência do jogador `Configuracoes.cinematica?: 'completa' \| 'curta' \| 'desligada'` (C4, opcional, padrão `'completa'`). Na tela de opções: "CINEMÁTICA DO ESPECIAL". | — |
| B15 | **Acessibilidade** | Na 1ª carga, se não houver preferência salva e `prefers-reduced-motion: reduce`, o padrão vira `'curta'`, sem tarja deslizando (só fade). Há um único flash por especial, com alfa ≤ 0,35, nunca branco em tela cheia e nunca mais de 3 por segundo (WCAG 2.3.1). A cinemática não treme a tela. Pular está sempre disponível (B4). | Detectar fotossensibilidade de outro jeito: não existe API para isso. |
| B16 | **Desempenho no celular** | A tarja de cada (lutador, golpe) é pré-desenhada uma vez por luta num canvas fora da tela, na resolução real (RS=2, cerca de 1920x264, perto de 2 MB cada). Guarda no máximo 6 e libera no fim da luta. Por quadro: 2 `fillRect`, 1 `drawImage` da tarja, 1 da pose, 1 do atacante redesenhado e até 40 arcos. Portão: p95 do tempo de quadro < 16,7 ms com a CPU 4x mais lenta no perfil de celular do Playwright. Se falhar, `'curta'` vira o padrão em toque (`temToque`). | Desenhar a tarja do zero a cada quadro: o `textoArcade` com contorno e o gradiente custam caro em GPU fraca. |

### 3.2 Contratos

**C3, aditivo (campos novos em eventos que já existem, sempre emitidos e sem flag; não mexem no snapshot nem nos sons):**

```ts
| { tipo: 'special'; lutador: IndiceLutador; pitch: number;
    /** Golpe que começou (chave de ch.moves, ex.: 'sFire'). A UI pega nome, pose e cor com chDaFicha. */
    golpe: string }
| { tipo: 'hit'; /* ...campos de hoje... */
    /** Vida tirada por este acerto, já com escala de combo e contragolpe (= hp antes − hp depois). */
    dano: number;
    /** Acerto de especial: golpe corpo a corpo cujo nome começa com 's', ou projétil lançado por um. Ausente = normal. */
    especial?: true }
| { tipo: 'armor'; /* ... */ dano: number }
```

`ProjetilLuta` (interno) ganha `especial: boolean`, definido em `lancarProjetil` pelo golpe que lançou. `ProjetilLeitura`
ganha `especial?: true`, usado pela sessão para saber se ainda há projétil vivo.

Ao trocar `golpe` e `dano` de opcionais para obrigatórios, quem fabrica esses eventos nos testes passa a precisar deles. A
Vega corrige os testes que fabricam evento à mão (ex.: `tests/unit/audio.test.ts:14`). Não é mudança de comportamento.

**C4** (Cronos, `core/storage.ts`): `Configuracoes.cinematica?: 'completa' | 'curta' | 'desligada'`. O `sanearConfiguracoes`
aceita só esses 3 valores; ausente ou inválido = ausente (a UI resolve o padrão, B15). A chave continua `inno-fighters-v2`.
Um build anterior descarta o campo ao regravar (rollback perde só essa preferência, sem erro): aceitável.

**Regras** (Cronos, `meta/tipos.ts` + `meta/regras.ts` + `ui/dev-expansao.ts`): `readonly esquiva: boolean;
readonly cinematica: boolean;`. A UI usa `regras.esquiva` ao montar o `ConfigPartida`, em todos os pontos onde ele é montado
(`cfgDaEtapa`, seleção, treino).

**Interface da cinemática** (Lyra, `render/cinematica.ts`, puro e testável sem DOM, desenhando por `Ctx`):

```ts
type ModoCine = 'completa' | 'curta';
class Cinematica {
  iniciar(ev: { lutador: IndiceLutador; golpe: string }, modo: ModoCine): void; // enfileira se já houver uma ativa
  get ativa(): boolean;
  avancar(): void;            // 1 tick de apresentação
  pular(): void;              // vai para a saída
  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void;
  zerarLuta(): void;          // limpa o cache (lutador, golpe) e as tarjas pré-desenhadas
}
class SessaoEspecial { reagir(ev: EventoLuta, luta: LeituraLuta): void; avancar(): void; desenhar(ctx: Ctx): void; }
```

A regra do cache (1ª vez completa, repetições curtas, treino curto, preferência) fica numa função pura
`modoDaCinematica(jaVista, treino, preferencia, regras): ModoCine | null`.

### 3.3 Testes (cada um falha sem a mecânica)

Unidade:

1. Motor (Vega): `special.golpe` é o nome do golpe começado. `hit.dano` = diferença de `hp` do defensor naquele tick (golpe,
   projétil, combo escalado, contragolpe). `hit.especial` é true em `sFire` corpo a corpo e projétil, e ausente em `lp`.
   Snapshot e lock-step sem `-u`.
2. `modoDaCinematica` (Lyra): 1ª vez = completa; 2ª do mesmo par = curta; outro golpe = completa; treino = curta;
   `'desligada'` ou `regras.cinematica = false` = null; nova luta zera.
3. `Cinematica` (Lyra): completa dura 48 ticks e curta 20; `pular()` na metade termina em ≤ 6 ticks; dois `iniciar` seguidos
   = fila, com o 2º curto; desenhar com um `Ctx` gravador não chama `shadowBlur`, `filter` nem `getImageData`.
4. `SessaoEspecial` (Lyra): especial + 3 `hit` especiais = contador 3, 3 números e total igual à soma de `dano`. Especial + 3
   `block` = 0 números e nenhum contador. `hit` sem `especial` = ignorado. `armor` = número cinza sem contar.
5. Cena da luta (Lyra, `tests/unit/ui.test.ts`): com a cinemática ativa, `game.tick` não anda por 48 `update()`; com
   `'desligada'`, anda no 1º.

E2E (Lyra; só ela roda e2e, para não colidir na porta 5173):

1. `?seed=7`, `b` no P1: pelo gancho de DEV, `tick` parado por cerca de 48 quadros. Captura no quadro 20: a luminância média
   fora da tarja cai pelo menos 50% contra o quadro anterior ao especial, e a tarja tem pixels da cor `fire[0]` do lutador.
2. Repetir o mesmo especial: congelamento de cerca de 20 quadros e nenhuma tarja.
3. Pular com `z`: a luta volta em ≤ 8 quadros.
4. Opção DESLIGADA salva, recarrega e continua desligada.
5. `?expansao=4`: `fidelidade-prototipo` e `fidelidade-ui` seguem com 0 pixel de diferença, sem mudar nada nesses specs.
6. Celular (perfil e7a): capturas da tarja dos 9 (insumo do Apolo) e medida do tempo de quadro (B16).
7. **Auditoria dos e2e que já existem**: todo spec que aperta `b` no modo de produção (ex.: `jogo.spec.ts`) passa a congelar
   0,8 s. A Lyra lista quais são e semeia `cinematica: 'desligada'` no storage do spec, ou ajusta as esperas. O spec não pode
   ficar mais frouxo.

## 4. O que muda na ED10

A ED10 ("sem super / 4º especial nesta expansão") existia porque um super mexeria em C2, toque, CPU e na tela de golpes.

- **Continua valendo para super e 4º especial**: nenhum golpe novo, nenhum medidor novo. A barra de energia segue igual (0 a
  100).
- **Revogada em parte pela ESQUIVA**: aceita-se **um** botão novo, com C2 aditivo (`esq?`), botão de toque, L1/L2 no
  gamepad, CPU nova e uma linha na tela de golpes. É exatamente o que a ED10 evitava, agora por pedido explícito do dono.
- **A CINEMÁTICA não toca na ED10**: é apresentação dos 3 especiais que já existem, sem golpe nem custo novo.
- Atualizar `docs/plano-expansao.md` (linha da ED10, §2) e a nota de `docs/mecanicas-e3.md:43` para apontar para esta spec
  (Alexandria, fatia D).

## 5. Fatias, donos e ordem

| Fatia | Dono | Tamanho | Depende de | Entrega e critério de aceite |
|---|---|---|---|---|
| **V1: contratos + motor da esquiva + C3 do especial** | Vega | M | — | `contratos.ts` (C2 `esq?`, C3 de §2.3 e §3.2), `ConfigPartida.esquiva`, `ESQUIVA_PADRAO`, estado `esquiva` em `fighter.ts`, contragolpe e arremesso na recuperação, `esquivou` em `resolveHits`, `special.golpe`, `hit.dano`/`especial`, `armor.dano`, projétil `especial`, sons em `audio/eventos.ts`. Aceite: testes A1–A7, A10 e B1 verdes; snapshot antigo e `luta-fidelidade` **sem `-u`**; `typecheck` limpo. **Os contratos vão primeiro, num commit pequeno, para a Lyra começar.** |
| **V2: CPU da esquiva** | Vega | M | V1 | §2.2, `AI_LEVELS.esq/punir`, `perfilChefe`. Aceite: testes A8 e A9 (snapshot novo com esquiva), mutantes A10; harness da E6 (`npm run balanco`) roda com a flag nos dois valores e relata a taxa de vitória dos 9 com e sem esquiva. |
| **C1: regras + opção** | Cronos | P | — (em paralelo com V1) | `Regras.esquiva/cinematica` nos três conjuntos de regras, `Configuracoes.cinematica` e saneamento. Aceite: testes de storage (valor válido mantido, inválido descartado, ausente ausente, rollback sem quebrar) e regras `?expansao=4` = false/false. |
| **L1: entrada + render da esquiva** | Lyra | M | contratos da V1, C1 | `mapa.ts` (`n`, `o`, L1, L2), `teclas.ts`, `gamepad.ts`, botão ESQ no `index.html` + `toque.css`, ligar `ConfigPartida.esquiva` a partir das regras, pose/fantasma/rastro, HUD (marcador + selo ESQ), botão `.sem`, "Como jogar". Aceite: unidade de teclas e pad; e2e da esquiva (§2.6); **medida** do botão ESQ no celular sem sobrepor os 4 botões nem o R1 (skill `medir-antes-de-afirmar`); `?expansao=4` sem botão nem selo. |
| **L2: cinemática + sessão do especial** | Lyra | G | V1 (campos C3), C1 | `render/cinematica.ts`, `SessaoEspecial`, `modoDaCinematica`, integração em `ui/cenas/fight.ts` (congelar, pular, fila, música a 50%), linha nas opções, reduzir movimento, cache das tarjas. Aceite: testes B2–B5 e e2e B1–B7 de §3.3; p95 do quadro < 16,7 ms no perfil de celular. |
| **A1: arte procedural** | Apolo | P | L1 e L2 com capturas | Valores de cor/alfa da faixa da esquiva, layout da tarja, contraste ≥ 3:1 nos 9 (decide o amarelo do HAYATO junto). Aceite: capturas dos 9 aprovadas, ou lista de ajustes com valores. |
| **Q1: QA** | Íris | M | V2, L1, L2 | Joga os 9 com esquiva e cinemática (versus, CPU nos 3 níveis, Arcade até o chefão, treino), toque em celular emulado, gamepad simulado. Testes adversariais: esquiva no último tick do bloqueio, avanço no canto, dois especiais no mesmo tick, pausa durante a cinemática, perda de foco, pular na saída. Veredito APROVADO/REPROVADO. |
| **D: docs** | Alexandria | P | Q1 aprovado | `docs/arquitetura.md` (C2, C3, C4, regras), ED10 em `plano-expansao.md`, `CHANGELOG.md`, README (controles). |

Ordem: **V1 (contratos primeiro) ∥ C1 → L1 ∥ V2 → L2 → A1 → Q1 → D.** A L2 pode começar logo depois do commit dos contratos
da V1, em paralelo com o resto da V1. Para pagar o custo fixo de delegação uma vez só, V1+V2 vão numa delegação só da Vega, e
L1+L2 numa só da Lyra.

Tamanho total: **G**. Esquiva: M+M+M. Cinemática: G (quase tudo na L2). Nenhum caminho depende de arte gerada.

## 6. Decisões do dono

| # | Pergunta | Opções | Recomendação |
|---|---|---|---|
| **DD1** | Custo da esquiva | (a) fixo 20 para todos (= especial mais barato do elenco); (b) o custo do especial mais barato **de cada** lutador (20 a 28) | **(a)**: não muda sozinho quando a E6 mexer nos especiais. |
| **DD2** | Como esquivar | (a) botão novo ESQUIVA + direção (N / O / L1 / botão ESQ no toque); (b) toque duplo (perde a corrida de hoje) | **(a)**: não conflita com nada que existe. |
| **DD3** | Frequência da cinemática | (a) completa na 1ª vez de cada especial por luta, curta nas repetições; (b) completa sempre; (c) sempre curta | **(a)**: aparece sempre, sem arrastar a luta. A opção do jogador permite escolher (c) ou desligar. |
| **DD4** | O chefão (CPU) esquiva? | (a) sim, como a CPU do nível escolhido + bônus; (b) só na fase 2; (c) não | **(a)**, com o harness da E6 confirmando a taxa de vitória. |
| **DD5** | Números de dano | (a) só nos especiais; (b) em todo golpe | **(a)**: é o que torna o especial "premium". |

## 7. Dívidas conscientes

- Os valores da esquiva (§2.1 A6) e as chances da CPU (§2.2) são **de partida**. A E6 ajusta pelo harness e com o dono
  jogando.
- A CPU não sofre o efeito do aviso da cinemática (R1), então o harness não mede esse efeito.
- A esquiva de guarda (A9) e o super (ED10) ficam fora.
- O rollback de build descarta a preferência `cinematica` ao regravar o storage.

## 8. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **A tarja avisa o rival.** São 0,8 s em que o humano pode começar a segurar trás (tecla segurada vale depois do congelamento). Especiais ficam mais fáceis de bloquear, e a CPU não ganha esse aviso: contra a CPU, o jogo fica mais fácil. | Alta | Médio | Aceitável num jogo arcade (é o que o super freeze do SF faz). A Íris mede nos testes de mão. Se pesar: a CURTA vira o padrão no versus, ou o congelamento passa para `mt === S − 2`. Nesse caso, o dono decide de novo. |
| R2 | Os e2e que já existem e usam especial no modo de produção ficam 0,8 s mais lentos ou dão falso negativo. | Alta | Baixo | Auditoria na L2 (§3.3, e2e 7). |
| R3 | O botão ESQ não cabe no celular baixo ou fica embaixo do polegar errado. | Média | Médio | Medir na L1 (skill `medir-antes-de-afirmar`) no perfil e7a e em 360x640 deitado. Plano B: trocar de lugar com o R1. |
| R4 | A esquiva desequilibra (DIFÍCIL com 0,5 de chance parece "trapaça"; avanço no canto). | Média | Médio | Valores de partida, harness com a flag nos dois valores (V2), testes adversariais (Q1). |
| R5 | Quadros perdidos no celular durante a cinemática. | Média | Médio | Cache das tarjas e nada de `shadowBlur` (B16), portão de p95, CURTA como padrão em toque se falhar. |
| R6 | Netplay futuro: congelamento só de apresentação não é sincronizado. | Baixa (não está no plano) | Alto se acontecer | Regra registrada: no dia do netplay, o congelamento vira N ticks fixos no motor, sem pular. |
| R7 | Mudar campo de evento quebra teste que fabrica evento à mão. | Certa | Baixo | A Vega corrige na V1. Não é mudança de comportamento. |
