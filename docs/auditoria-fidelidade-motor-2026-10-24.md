# Auditoria do motor: fidelidade ao jogo de luta e "delays" (2026-10-24)

Pedido do dono depois de jogar o site publicado no Android: "golpes com muitos delays, a jogabilidade precisa ser mais fluida, o motor
precisa ser fiel ao jogo de luta". Esta é uma auditoria de LEITURA e de ensaio no motor real: nenhum arquivo de `src/`, `tests/` ou
`docs/balanco/` foi alterado. A Íris mede o desempenho no navegador em paralelo; o que depende de aparelho está marcado como hipótese.

HEAD auditado: `d350d27`. Dados e motor: versão `d16203b096b5` (a referência commitada em `docs/balanco/` é a `75764f4439da`, de `5bd8e7a`; o
código mudou depois só por trás das flags do ritmo e a frame data regravada hoje saiu IDÊNTICA nas 211 linhas).

## 0. Veredito em 8 linhas

1. O caminho entrada -> golpe do MOTOR não tem espera própria: de um botão apertado em `idle`/`walk` até `state === 'move'` são **0 ticks**
   (ensaio executado, A1 abaixo). O laço de passo fixo e o buffer de 9 ticks também estão corretos.
2. Os dados dos normais estão DENTRO da faixa dos jogos de luta 2D (leves 3-5f, fortes 7-12f, recuperação 7-22f). Nenhum normal está lento demais.
   O que sai da faixa são poucos especiais (S > 20: carga do AMINU nos níveis 2-3, RESORTE da CENTELLA, DECRETO do ZENON chefe2; R > 30: ARREMESSO do BAATAR).
3. O hitstop é CURTO demais, não longo: 4 ticks (leve), 6 (forte/KO), 2 (bloqueio). A faixa de referência é 6-12. Ele não causa "delay", causa golpe "fraco".
4. Os "delays" que o motor realmente impõe são **estados de trava e esperas escondidas**, todos provados por ensaio: (a) o DASH (16-18 ticks) engole
   qualquer golpe apertado nos primeiros 8 ticks e atrasa os demais até 8 ticks; (b) com a barra CHEIA e `ritmo.super` ligado (padrão), todo
   SOCO FORTE / CHUTE FORTE (e o cancelamento para eles) espera **3 ticks (50 ms)**; (c) o ESPECIAL do AMINU segura a carga se o dedo ficar >= 11 ticks (184 ms) no botão.
5. O joystick virtual (`toque.ts`) é o maior suspeito de "o personagem faz o que eu não pedi" no celular: sem histerese, sem zonas angulares, com
   limiar de cima de 35% do raio. Um empurrão para a direita com 25 graus de deriva para cima (o arco normal do polegar) PULA; um com 21 graus para baixo AGACHA e para.
   Oscilar em torno do limiar de 25% (5 ticks ligado, 2 desligado, ligado) vira **DASH** e trava ataques por 16 ticks (ensaio B1).
6. Toque de direção ou botão mais curto que um quadro: o botão sobrevive (borda `apertada`), a DIREÇÃO some (`segurada` é nível). Em frame baixo
   (Android a 20-30 fps = 2-3 ticks por quadro) o "pulinho" para baixo de um agachado rápido e o segundo toque do dash se perdem.
7. Hipótese principal para o "delay" de Android, NÃO MEDIDA por mim: custo de desenho. O canvas tem 1920x1080 reais (`RS = 2`), `imageSmoothingQuality = 'high'`,
   e a vista interpolada aloca objetos a cada quadro. Se o quadro passar de 16,7 ms, cada toque só é lido no quadro seguinte e o jogo roda 2-6 ticks por quadro (teto de 100 ms).
   O que a Íris medir decide isto; nenhuma correção de motor substitui um quadro rápido.
8. O diagnóstico de 44,6% de tempo parado (Íris, `209ecd8`) é ANTERIOR aos defaults do ritmo (`f92bbcf`..`2403b2d`): hoje o especial comum não congela
   (faixa de 40 ticks sem pausar) e o filme só abre no KO. O congelamento que sobra é o SUPER (30 ticks), a contagem (60-90) e os intervalos de KO (60/90/90).

Nível de prova: ver a tabela do fim ("O que foi provado e como").

---

## 1. Caminho completo: da entrada ao golpe

Linha do tempo de UM toque de soco forte num celular, com onde cada espera mora.

| # | Etapa | Onde | Espera que adiciona | Prova |
|---|---|---|---|---|
| 1 | Evento de toque do SO chega ao JS | `src/input/toque.ts:93-110` (`touchstart`, `passive:false`, `preventDefault`) | fora do nosso controle (digitalizador + SO: tipicamente 10-40 ms no Android) | leitura de código; `touch-action:none` já está no CSS (`toque.css:21,37,60`) |
| 2 | Vira tecla virtual | `src/input/teclas.ts:15-22` (`definir`): `segurada` (nível) + `apertada` (borda) | 0; a borda dura até o próximo `fimDoTick` | leitura + ensaio D1 |
| 3 | Espera o próximo `requestAnimationFrame` | `src/main.ts:250-269` | 0 a 1 quadro (16,7 ms a 60 Hz; 33 ms a 30 fps). O quadro lê a entrada UMA vez e roda todos os ticks do quadro com o mesmo estado de teclas | leitura |
| 4 | Acumulador do passo fixo | `main.ts:251` `acc += Math.min(agora - ultimo, 100)`; `while (acc >= PASSO) { ui.update(); entrada.fimDoTick(); }` (PASSO = 1000/60) | 0 a 1 tick de fase; teto de 100 ms = no máximo 6 ticks por quadro (abaixo de 10 fps o jogo vira câmera lenta) | leitura |
| 5 | Cena de luta decide se chama o motor | `src/ui/cenas/fight.ts:579-640` | **a luta NÃO anda** (e a entrada é descartada no `fimDoTick`) durante: pausa, `!espera.pronta` (arte da luta), entrada do chefão, provocação COMPLETA (a CURTA do round 1 corre por cima), filme, **tarja do super (30 ticks)**, cinemática antiga (só com `ritmo.tarja` desligado). Faixa do especial comum NÃO congela | leitura; ver nota 5 abaixo |
| 6 | `Game.passo` | `src/fight/game.ts:730-736` | com `hitstop > 0` o tick é congelado: 4 (leve) / 6 (forte, KO) / 2 (bloqueio) / 8 (aparo) / 14 (KO) / 20 (troca de barra do chefão). A entrada humana é GUARDADA (V2-1, padrão ligado) e entregue no 1º tick livre | leitura + ensaio de cancelamento |
| 7 | Fase | `game.ts:739-746` | `intro` 90 ticks no round 1, 60 nos seguintes (ritmo); sem entrada em `intro`/`ko`/`roundend` | leitura |
| 8 | Buffer de ataque | `src/fight/fighter.ts:600-606` | botão guardado 9 ticks (150 ms), 1 vaga, o mais novo vence, prioridade `sp > hp > hk > lp > lk` quando dois chegam juntos (`ATK_KEYS`, `fighter.ts:28`) | leitura |
| 9 | Resolve o golpe | `fighter.ts:685-713` (`resolveAttack`, `startMove`) | **0 ticks** no mesmo tick do aperto, SE o estado é livre (`idle`, `walk`, `crouch`, `land`, `jump`). Esperas: `prejump` 3, `dash` 16/18, `esquiva` 22/26, `hit`/`block` (stun), `down` ~70 (queda ~21 + deitado 34 + levantar 14; 12 ticks de invulnerabilidade ao fim) | ensaio A1 (0 ticks); B2 (dash) |
| 10 | Motion (meia-lua etc.) | `fighter.ts:441` `motion(seq, win = 18)`, `comandos.ts:30-33` | janela de 18 ticks, sequência NÃO contígua, sem exigir ordem estrita entre botão e direção final; V2-1 comprime direções repetidas para caber num hitstop longo. O botão ESPECIAL (`sp`) dispensa o comando: sai direto (`fighter.ts:432`) | leitura |
| 11 | Duplo toque (dash) | `fighter.ts:714-727` | janela de 13 ticks entre as duas descidas na mesma direção; o dash dura 16 (frente) / 18 (trás) ticks e **bloqueia ataque** | ensaios B1/B2/B3 |
| 12 | Par do SUPER (SOCO FORTE + CHUTE FORTE) | `fighter.ts:451-471` `superNaBorda`/`aguardandoParDoSuper` | só com `ritmo.super` (padrão) e barra CHEIA: hp ou hk sozinho espera até 2 ticks pelo par, ou seja **resolve 3 ticks depois** (ensaio A3). O botão SUPER do toque aperta os dois no mesmo tick (`toque.ts:87-102`) e não espera | ensaios A2/A3 |
| 13 | Caixa de acerto e dano | `game.ts:899-923`, `applyHit` | 0; o acerto sai no 1º tick ativo (`S`) | frame data medida |
| 14 | Desenho | `fighter.ts:1117-1119` `atualizarPose` (fim do tick), `src/render/fluidez.ts` | a posição é interpolada entre o tick anterior e o atual (até 1 tick = 16,7 ms de atraso visual de posição; o NOME da pose não é interpolado). A mola (antecipação) é só visual | leitura |

Notas:

- **Nota 5.** A entrada que chega durante um congelamento da CENA (tarja do super, filme, provocação completa, entrada do chefão) é descartada: não há
  buffer fora do motor (`entrada.fimDoTick()` roda mesmo quando `game.update` não foi chamado). Dentro do motor (hitstop) há buffer (V2-1).
- **Chamada dupla do tick.** `Fluidez.gravar` e `get fonte` (`fight.ts:317`) alocam objetos a cada tick; `Fluidez.vista` aloca cópias de lutadores/projéteis a cada
  QUADRO (`fluidez.ts:99-148`). Em Android isso é pressão de coleta de lixo, não latência lógica.
- **Fade de cena.** cerca de 9 ticks para escurecer + 13 para clarear, mais até 45 ticks de preto esperando arte (`navegador.ts:14,150-158`). Não acontece dentro da luta.

### 1.1 Ensaios no motor real (executados hoje)

Scripts em `scratchpad` (não versionados), carregando `Game` pelo mesmo transformador do harness (`ferramentas/balanco/elenco.ts`), modo treino, HAYATO
contra boneco parado, 400 px de distância salvo indicação. Cada ensaio dá o resultado em ticks (1 tick = 16,7 ms).

| Ensaio | Resultado |
|---|---|
| A1 `lp` apertado em `idle`, barra < 100 | entra em `move` no **mesmo tick** (0 de espera) |
| A2 `hp`/`hk` com `ritmo.super` ligado, barra < 100 | 0 de espera |
| A3 `hp`/`hk` com `ritmo.super` ligado e **barra CHEIA** | **3 ticks de espera** (50 ms), toda vez |
| A4 `lp` com barra cheia (não é hp/hk) | 0 |
| A5 `hp` com barra cheia mas `ritmo.super` desligado | 0 |
| B1 direita 5 ticks / solta 2 / direita (oscilação de joystick perto do limiar) | estados `walk x5, idle x2, dash x16`: **virou dash** |
| B2/B3 + varredura: `lp` apertado N ticks depois do início do dash | N de 1 a 8: **PERDIDO** (buffer de 9 expira antes dos 16 ticks do dash). N = 9: sai +8 ticks depois; N = 13: +4; N = 17: +0 |
| C1 -> + `hp` a 90 px do rival parado | sai `throw`, não `hp` (agarrão tem precedência, `fighter.ts:437`); a 130 px sai `hp` |
| D1 `ArrowDown` e `z` apertados e soltos antes do tick | `z` (borda) visto; `ArrowDown` (nível) **não** visto |
| Cancelamento `lp` -> `hp` apertado 1 tick depois do acerto, `motorV2.entradaNoHitstop` DESLIGADO | **PERDIDO** (o hitstop de 4 ticks descarta a entrada) |
| Idem com `entradaNoHitstop` LIGADO (padrão de produção) | `hp` começa 4 ticks depois (o fim do hitstop); com barra cheia + `ritmo.super`, apertado depois do hitstop: +3 |
| MASHI (AMINU, `sp`) com `spSeg` por k ticks | k <= 10: golpe ativo no tick 10 (167 ms); k = 11: 11; k = 15: 15; k = 30: 30. Ou seja, **dedo >= 184 ms vira carga e o golpe só sai quando solta** |
| Super (hp+hk, barra cheia, `ritmo.super`) | acertos a cada **10 ticks** (5 acertos = 40 ticks do contato à queda: HAYATO contato 4, queda 44; CAIO 6/46; WEI LONG 20/60). A tarja de 30 ticks da cena soma por cima |

### 1.2 Aritmética do joystick (`toque.ts:14-30`)

`ALCANCE_KNOB = 0,85` do raio; limiares: esquerda/direita `|dx| > 0,25 R`, cima `dy < -0,35 R`, baixo `dy > 0,30 R`, cada eixo independente (sem zona angular, sem
histerese). Com o polegar no alcance máximo (0,85 R):

- **cima** liga quando `0,85 sen(a) > 0,35`, ou seja `a > 24,3` graus acima da horizontal. Empurrar para a direita com 25 graus de deriva = andar + PULAR (`prejump` 3 ticks, depois 39 ticks no ar com 1 golpe).
- **baixo** liga a partir de ~20,7 graus abaixo: empurrar para a direita levemente para baixo = AGACHAR e parar (`vx = 0`, `fighter.ts:731-733`).
- **dash acidental:** qualquer queda abaixo de 25% e retorno em < 13 ticks (216 ms) na mesma direção é um duplo toque.

O teste atual (`tests/unit/toque.test.ts`) fixa "os limiares do protótipo". Mudar o joystick é afastar-se do protótipo de propósito: a decisão é do dono.

---

## 2. Dados por golpe contra a faixa dos jogos de luta 2D

### 2.1 Faixa de referência (princípio, sem marcas)

| Grandeza | Faixa | Princípio |
|---|---|---|
| Startup de normal leve (soco) | 3-5 f | o golpe de abertura/pressão precisa chegar antes da reação humana (~12 f) e vencer os golpes do rival na troca |
| Startup de normal leve (chute) | 4-6 f | chute leve é um pouco mais lento, alcança mais |
| Startup de normal médio/forte (soco) | 5-10 f | abre combo, tem alcance e dano maiores |
| Startup de forte (chute) | 8-14 f | o golpe mais caro: pune pelo risco de recuperação |
| Startup de especial (incluindo o tiro do projétil) | 8-20 f | abaixo de 8 é indefensável; acima de 20 só com invulnerabilidade, armadura ou carga voluntária |
| Recuperação de normal | <= 24 f (leves <= 12); ativos 3-6 f | quem erra é punido, mas não fica "travado" |
| Recuperação de especial | <= 30 f | idem; fora disso o golpe só serve de punição |
| Hitstop de acerto | 6-12 f (leve na ponta de baixo, forte/KO na de cima) | o congelamento é o que dá peso ao golpe; abaixo de 6 o acerto parece "sem impacto" |
| Hitstop de bloqueio | cerca da metade do acerto | dá retorno ao defensor |
| Buffer de entrada | 4-10 f | perdoa o aperto adiantado sem mudar o golpe |
| Janela de comando (meia-lua) | 15-20 f | idem |
| Vantagem no bloqueio | normal leve >= -4; forte >= -10; especial até -20 sem invulnerabilidade, mais que isso = "punível de graça" | |

O motor DECLARA o hitstop no `applyHit`: **acerto 4 (leve) ou 6 (`heavy`, derrubada ou KO)**, projétil sempre 4, bloqueio 2 (6 se quebra a guarda), aparo 8, armadura 4,
agarrão 6, super 3 por acerto e 6 no último, KO 14, troca de barra do chefão 20 (`game.ts:511,554,1054,1104,1149,1241,1463,1580,1646,1686`). Em todo o elenco o hitstop de
acerto fica **abaixo ou na borda de baixo** da faixa; o de bloqueio (2) fica abaixo da metade. Isso explica "golpe fraco", e é INDEPENDENTE de latência.

### 2.2 Normais: S/A/R de todo o elenco (frame data medida, ticks)

Os 9 lutadores partem da MESMA tabela base do protótipo (`src/data/base-moves.ts`); só MIN-JI, WEI LONG, CAIO, NILA/SARPA e BAATAR mexem em alguns campos. Um normal medido
no motor (início / ativos / recuperação):

| Lutador | lp | lk | hp | hk | clp | clk | chp | chk | throw |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| hayato | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| wei-long | 4/3/7 | 6/4/9 | 9/5/17 | 12/5/22 | 4/3/8 | 6/3/10 | 7/4/17 | 9/6/20 | 3/1/24 |
| min-ji | 2/3/5 | 4/4/7 | 5/4/11 | 7/5/14 | 3/3/6 | 6/3/10 | 5/4/17 | 6/5/16 | 3/1/24 |
| caio | 3/3/7 | 5/4/9 | 8/4/14 | 10/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| aminu | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| centella | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| camille | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| nila | 3/3/7 | 5/4/9 | 8/4/14 | 10/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| nila/sarpa | 3/3/7 | 5/4/9 | 5/4/14 | 8/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| baatar | 3/3/7 | 5/4/9 | 9/4/14 | 12/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 10/6/20 | 3/1/24 |
| zenon | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| zenon/chefe | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |
| zenon/chefe2 | 3/3/7 | 5/4/9 | 7/4/14 | 9/5/18 | 4/3/8 | 6/3/10 | 6/4/17 | 8/6/20 | 3/1/24 |

Leitura:

- Todos os leves (lp, clp) ficam em 3-4 de startup; todos os lk em 4-6; os fortes (hp) em 5-9; os hk em 7-12; chp em 5-7 e chk em 6-10.
- **Fora da faixa de forma que importa:** nada. Os mais lentos são WEI LONG hp 9 e hk 12 (recuperação 17/22) e BAATAR hp 9 / hk 12 / chk 10; todos compatíveis com "golpe forte e pesado".
- **Diferenciação:** 5 dos 10 lutadores (HAYATO, AMINU, CENTELLA, CAMILLE, ZENON) têm os normais IDÊNTICOS aos da tabela base; CAIO e NILA diferem só em hp/hk (+1). Isso é fidelidade
  ao protótipo, mas é pouca "personalidade" para um jogo de luta (quem joga HAYATO e AMINU tem o mesmo lp/lk/hp/hk). Fora do escopo desta auditoria; vira decisão de design.
- **CAIO novo (capoeira, `5bd8e7a`):** os tempos dos 13 golpes comuns e dos 3 especiais são IDÊNTICOS aos de antes da arte nova (a regravação mudou só o alcance, `ponta`, e a
  vantagem dos aéreos). Nada ali está fora da faixa: lp 3/3/7, lk 5/4/9, hp 8/4/14, hk 10/5/18; especiais ONDA VERDE 12/1/19, RABO-DE-ARRAIA 9/7/22, MEIA-LUA 6/24/12. Se o CAIO
  "parece lento" é a ARTE (o quadro de contato vs o instante do acerto) ou a ginga de `idle`/`walk`, não a frame data; precisa de vídeo, não de tabela.

### 2.3 Golpes fora da faixa

| Golpe | Dado | Situação | Comentário |
|---|---|---|---|
| AMINU MASHI nível 2 / 3 (`sp` segurado) | S 39 / 79 | S > 20 | **VOLUNTÁRIO** (carga). O nível 1 (toque) é S 10 / total 35. Risco real só no toque longo (ensaio MASHI: >= 184 ms vira carga) |
| CENTELLA RESORTE | S 51 / total 94 | S > 20 | golpe de duas fases por desenho (corre de costas até a parede e volta). É o único especial verdadeiramente lento do elenco regular |
| ZENON (chefe2) DECRETO | S 24 / total 52 | S 4 acima | só do chefão fase 2 |
| BAATAR ARREMESSO DO AVARGA (sFire) | R 36 nominal (38 medido) / total 53 | R > 30 | POR DESENHO (agarrão de comando inbloqueável, alcance 162, com armadura): o preço de errar é a recuperação. Candidato a baixar para ~28 se o dono achar punitivo demais |
| WEI LONG LONG ZHANG (tiro) | S 20 | na borda (faixa 8-20) | o tiro mais lento (HAYATO 14, CAIO 12) |
| CENTELLA PLANCHA / HURACANRANA, WEI LONG ZHEN DI / TIE SHAN KAO, BAATAR MERGULHO | R 22-26, total 48-94 | R no limite superior (<= 28) | são golpes de deslocamento; o total é longo porque o golpe percorre a tela |
| Punível >= -15 no bloqueio | HAYATO RAIJIN-KEN -41, MIN-JI HOERI CHAGI -36, CENTELLA PLANCHA -49, BAATAR MERGULHO -49, NILA/SARPA SALTO -37, ZENON COLUNA -32, GARKUWA -28, MEIA-LUA (CAIO) -23, TIE SHAN KAO -19 | especiais de risco alto (deslocamento, anti-aéreo ou golpe longo); não conferi um a um quais têm invulnerabilidade | aceitável na faixa de "especial arriscado"; só vale rever se o dono achar o castigo excessivo |

Lista completa (211 linhas medidas, `tipo` do golpe incluído quando é projétil) abaixo; "Hitstop" = acerto/bloqueio calculado pela regra do `applyHit`.

#### HAYATO

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 13 | 0 | 15 | 4/2 | 15 | +2 | -3 | ok |
| jhp |  | 4 | 11 | 0 | 15 | 6/2 | 20 | +9 | +1 | ok |
| jlk |  | 3 | 12 | 0 | 15 | 4/2 | 17 | +5 | -1 | ok |
| jhk |  | 5 | 10 | 0 | 15 | 6/2 | 22 | +12 | +3 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | RAIJIN-DAN | 14 | 1 | 20 | 35 | 4/2 | – | KD +29 | -4 | ok |
| sDown | RAIJIN-KEN | 4 | 33 | 22 | 59 | 6/2 | – | KD +18 | -41 | **total 59; punível -41** |
| sFwd | KAMINARI-STEP | 6 | 8 | 16 | 30 | 6/2 | – | KD +18 | -12 | ok |

#### WEI-LONG

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 4 | 3 | 7 | 14 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 6 | 4 | 9 | 19 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 9 | 5 | 17 | 31 | 6/2 | 24 | +2 | -10 | ok |
| hk |  | 12 | 5 | 22 | 39 | 6/2 | – | KD +44 | -13 | **total 39** |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 7 | 4 | 17 | 28 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 9 | 6 | 20 | 35 | 6/2 | – | KD +45 | -12 | **total 35** |
| jlp |  | 2 | 12 | 0 | 14 | 4/2 | 15 | +3 | -2 | ok |
| jhp |  | 4 | 10 | 0 | 14 | 6/2 | 20 | +10 | +2 | ok |
| jlk |  | 3 | 11 | 0 | 14 | 4/2 | 17 | +6 | 0 | ok |
| jhk |  | 5 | 9 | 0 | 14 | 6/2 | 22 | +13 | +4 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | LONG ZHANG | 20 | 1 | 24 | 45 | 4/2 | – | KD +25 | -8 | ok |
| sDown | ZHEN DI | 14 | 1 | 28 | 43 | 4/2 | – | KD +21 | -12 | ok |
| sFwd | TIE SHAN KAO | 10 | 10 | 24 | 44 | 6/2 | – | KD +39 | -19 | **punível -19** |

#### MIN-JI

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 2 | 3 | 5 | 10 | 4/2 | 14 | +6 | 0 | ok |
| lk |  | 4 | 4 | 7 | 15 | 4/2 | 16 | +5 | -2 | ok |
| hp |  | 5 | 4 | 11 | 20 | 6/2 | 24 | +9 | -3 | ok |
| hk |  | 7 | 5 | 14 | 26 | 6/2 | – | KD +52 | -5 | ok |
| clp |  | 3 | 3 | 6 | 12 | 4/2 | 15 | +6 | -1 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 5 | 4 | 17 | 26 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 6 | 5 | 16 | 27 | 6/2 | – | KD +50 | -7 | ok |
| jlp |  | 2 | 15 | 0 | 17 | 4/2 | 15 | 0 | -5 | ok |
| jhp |  | 4 | 13 | 0 | 17 | 6/2 | 20 | +7 | -1 | ok |
| jlk |  | 3 | 14 | 0 | 17 | 4/2 | 17 | +3 | -3 | ok |
| jhk |  | 5 | 12 | 0 | 17 | 6/2 | 22 | +10 | +1 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | BULKKOT | 9 | 1 | 17 | 27 | 4/2 | – | KD +32 | -1 | ok |
| sDown | HOERI CHAGI | 4 | 28 | 18 | 50 | 6/2 | – | KD +42 | -36 | **total 50; punível -36** |
| sFwd | TWIO YEOP CHAGI | 5 | 15 | 10 | 30 | 6/2 | – | KD +18 | -13 | ok |

#### CAIO

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 8 | 4 | 14 | 26 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 10 | 5 | 18 | 33 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 16 | 0 | 18 | 4/2 | 15 | +7 | +2 | ok |
| jhp |  | 4 | 14 | 0 | 18 | 6/2 | 20 | +11 | +3 | ok |
| jlk |  | 3 | 15 | 0 | 18 | 4/2 | 17 | +8 | +2 | ok |
| jhk |  | 5 | 13 | 0 | 18 | 6/2 | 22 | +13 | +4 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | ONDA VERDE | 12 | 1 | 19 | 32 | 4/2 | – | KD +30 | -3 | ok |
| sDown | RABO-DE-ARRAIA | 9 | 7 | 22 | 38 | 6/2 | – | KD +42 | -14 | ok |
| sFwd | MEIA-LUA | 6 | 24 | 12 | 42 | 6/2 | – | KD +18 | -23 | **punível -23** |

#### AMINU

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 12 | 0 | 14 | 4/2 | 15 | +3 | -2 | ok |
| jhp |  | 4 | 10 | 0 | 14 | 6/2 | 20 | +10 | +2 | ok |
| jlk |  | 3 | 11 | 0 | 14 | 4/2 | 17 | +6 | 0 | ok |
| jhk |  | 5 | 9 | 0 | 14 | 6/2 | 22 | +13 | +4 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire (nível 1) | MASHI | 10 | 5 | 20 | 35 | 6/2 | – | KD +42 | -13 | ok |
| sFire (nível 2) | MASHI | 39 | 5 | 20 | 64 | 6/2 | – | KD +42 | -13 | **S lento (+19); total 64** |
| sFire (nível 3) | MASHI | 79 | 5 | 20 | 104 | 6/2 | – | KD +42 | +15 | **S lento (+59); total 104** |
| sDown | GARKUWA | 5 | 20 | 18 | 43 | 6/2 | – | KD +18 | -28 | **punível -28** |
| sFwd | PASSO DO LEÃO | 7 | 9 | 20 | 36 | 6/2 | – | KD +18 | -13 | ok |

#### CENTELLA

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 17 | 0 | 19 | 4/2 | 15 | -2 | -7 | ok |
| jhp |  | 4 | 15 | 0 | 19 | 6/2 | 20 | +5 | -3 | ok |
| jlk |  | 3 | 16 | 0 | 19 | 4/2 | 17 | +1 | -5 | ok |
| jhk |  | 5 | 14 | 0 | 19 | 6/2 | 22 | +8 | -1 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | PLANCHA | 8 | 39 | 24 | 71 | 6/2 | – | KD +18 | -49 | **total 71; punível -49** |
| sDown | HURACANRANA | 6 | 18 | 24 | 48 | 6/2 | – | KD +17 | – | **total 48** |
| sFwd | RESORTE | 51 | 21 | 22 | 94 | 6/2 | – | KD +42 | -14 | **S lento (+31); total 94** |

#### CAMILLE

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 13 | 0 | 15 | 4/2 | 15 | +2 | -3 | ok |
| jhp |  | 4 | 11 | 0 | 15 | 6/2 | 20 | +9 | +1 | ok |
| jlk |  | 3 | 12 | 0 | 15 | 4/2 | 17 | +5 | -1 | ok |
| jhk |  | 5 | 10 | 0 | 15 | 6/2 | 22 | +12 | +3 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | PARADE | 3 | 18 | 22 | 43 | 4/2 | – | – | – | ok |
| sDown | COUP D'ARRÊT | 6 | 4 | 16 | 26 | 6/2 | – | KD +18 | -8 | ok |
| sFwd | REVERS | 17 | 5 | 22 | 44 | 6/2 | – | KD +18 | -14 | ok |
| sResp | FOUETTÉ | 4 | 5 | 16 | 25 | 6/2 | – | KD +42 | -7 | ok |

#### NILA

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 8 | 4 | 14 | 26 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 10 | 5 | 18 | 33 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 15 | 0 | 17 | 4/2 | 15 | +3 | -2 | ok |
| jhp |  | 4 | 13 | 0 | 17 | 6/2 | 20 | +7 | -1 | ok |
| jlk |  | 3 | 14 | 0 | 17 | 4/2 | 17 | +4 | -2 | ok |
| jhk |  | 5 | 12 | 0 | 17 | 6/2 | 22 | +10 | +1 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | GOLPE MARMA | 8 | 4 | 20 | 32 | 6/2 | – | KD +18 | -12 | ok |
| sDown | VADIVU | 6 | 1 | 8 | 15 | 4/2 | – | – | – | ok |
| sFwd | PASSO DO ELEFANTE | 10 | 10 | 24 | 44 | 6/2 | – | KD +18 | -20 | **punível -20** |

#### NILA/SARPA

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 5 | 4 | 14 | 23 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 8 | 5 | 18 | 31 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 15 | 0 | 17 | 4/2 | 15 | +3 | -2 | ok |
| jhp |  | 4 | 13 | 0 | 17 | 6/2 | 20 | +7 | -1 | ok |
| jlk |  | 3 | 14 | 0 | 17 | 4/2 | 17 | +4 | -2 | ok |
| jhk |  | 5 | 12 | 0 | 17 | 6/2 | 22 | +10 | +1 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | BOTE | 7 | 14 | 18 | 39 | 6/2 | – | KD +41 | -20 | **punível -20** |
| sDown | VADIVU | 6 | 1 | 8 | 15 | 4/2 | – | – | – | ok |
| sFwd | SALTO DA SERPENTE | 10 | 33 | 20 | 63 | 6/2 | – | KD +20 | -37 | **total 63; punível -37** |

#### BAATAR

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 9 | 4 | 14 | 27 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 12 | 5 | 18 | 35 | 6/2 | – | KD +48 | -9 | **total 35** |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 10 | 6 | 20 | 36 | 6/2 | – | KD +45 | -12 | **total 36** |
| jlp |  | 2 | 10 | 0 | 12 | 4/2 | 15 | +5 | 0 | ok |
| jhp |  | 4 | 8 | 0 | 12 | 6/2 | 20 | +12 | +4 | ok |
| jlk |  | 3 | 9 | 0 | 12 | 4/2 | 17 | +8 | +2 | ok |
| jhk |  | 5 | 7 | 0 | 12 | 6/2 | 22 | +15 | +6 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | ARREMESSO DO AVARGA | 14 | 1 | 38 | 53 | 6/2 | – | KD +39 | – | **R longa (38); total 53** |
| sDown | QUEBRA-BASE | 10 | 5 | 22 | 37 | 6/2 | – | KD +42 | -13 | ok |
| sFwd | MERGULHO DA ÁGUIA | 12 | 39 | 26 | 77 | 6/2 | – | KD +18 | -49 | **total 77; punível -49** |

#### ZENON

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 9 | 0 | 11 | 4/2 | 15 | +6 | +1 | ok |
| jhp |  | 4 | 7 | 0 | 11 | 6/2 | 20 | +13 | +5 | ok |
| jlk |  | 3 | 8 | 0 | 11 | 4/2 | 17 | +9 | +3 | ok |
| jhk |  | 5 | 6 | 0 | 11 | 6/2 | 22 | +16 | +7 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | SELO DO ARCONTE | 16 | 1 | 24 | 41 | 4/2 | – | KD +25 | -8 | ok |
| sDown | COLUNA DE ÔNIX | 4 | 24 | 22 | 50 | 6/2 | – | KD +27 | -32 | **total 50; punível -32** |
| sFwd | TRIBUTO | 10 | 12 | 22 | 44 | 6/2 | – | KD +18 | -22 | **punível -22** |

#### ZENON/CHEFE

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 9 | 0 | 11 | 4/2 | 15 | +6 | +1 | ok |
| jhp |  | 4 | 7 | 0 | 11 | 6/2 | 20 | +13 | +5 | ok |
| jlk |  | 3 | 8 | 0 | 11 | 4/2 | 17 | +9 | +3 | ok |
| jhk |  | 5 | 6 | 0 | 11 | 6/2 | 22 | +16 | +7 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | SELO DO ARCONTE | 16 | 1 | 24 | 41 | 4/2 | – | KD +25 | -8 | ok |
| sDown | COLUNA DE ÔNIX | 4 | 24 | 22 | 50 | 6/2 | – | KD +27 | -32 | **total 50; punível -32** |
| sFwd | TRIBUTO | 10 | 12 | 22 | 44 | 6/2 | – | KD +18 | -22 | **punível -22** |

#### ZENON/CHEFE2

| Golpe | Nome | S | A | R | Total | Hitstop acerto/bloq. | Hitstun | Vant. acerto | Vant. bloq. | Veredito |
|---|---|--:|--:|--:|--:|:-:|--:|--:|--:|---|
| lp |  | 3 | 3 | 7 | 13 | 4/2 | 14 | +4 | -2 | ok |
| lk |  | 5 | 4 | 9 | 18 | 4/2 | 16 | +3 | -4 | ok |
| hp |  | 7 | 4 | 14 | 25 | 6/2 | 24 | +6 | -6 | ok |
| hk |  | 9 | 5 | 18 | 32 | 6/2 | – | KD +48 | -9 | ok |
| clp |  | 4 | 3 | 8 | 15 | 4/2 | 15 | +4 | -3 | ok |
| clk |  | 6 | 3 | 10 | 19 | 4/2 | 15 | +2 | -4 | ok |
| chp |  | 6 | 4 | 17 | 27 | 6/2 | – | KD +50 | -9 | ok |
| chk |  | 8 | 6 | 20 | 34 | 6/2 | – | KD +45 | -12 | ok |
| jlp |  | 2 | 9 | 0 | 11 | 4/2 | 15 | +6 | +1 | ok |
| jhp |  | 4 | 7 | 0 | 11 | 6/2 | 20 | +13 | +5 | ok |
| jlk |  | 3 | 8 | 0 | 11 | 4/2 | 17 | +9 | +3 | ok |
| jhk |  | 5 | 6 | 0 | 11 | 6/2 | 22 | +16 | +7 | ok |
| throw |  | 3 | 1 | 24 | 28 | 6/2 | – | KD +52 | – | ok |
| sFire | SELO MAIOR | 14 | 1 | 24 | 39 | 4/2 | – | KD +25 | -8 | ok |
| sDown | COLUNA DE ÔNIX | 4 | 24 | 22 | 50 | 6/2 | – | KD +27 | -32 | **total 50; punível -32** |
| sFwd | DECRETO | 24 | 6 | 22 | 52 | 6/2 | – | KD +18 | -22 | **S lento (+4); total 52; punível -22** |

### 2.4 Supers (12, `src/data/supers.ts`)

O super reaproveita o golpe-base (mesmo S/A/R). A cena congela 30 ticks na ativação (`DURACAO_TARJA_SUPER`), o motor então corre o S do golpe e uma sequência de 5 acertos
presos, um a cada **10 ticks** (6 de intervalo + 3-4 de hitstop; medido). Do aperto à queda do rival:

| Super | Golpe-base | S até o 1º contato | Tarja (cena) | Sequência | Aperto -> queda |
|---|---|--:|--:|--:|--:|
| HAYATO TENRAI-KEN | RAIJIN-KEN | 4 | 30 | 40 | 74 ticks (1,2 s) |
| MIN-JI TAEPUNG CHAGI | HOERI CHAGI | 4 | 30 | 40 | 74 |
| CAIO MEIA-LUA DE COMPASSO | MEIA-LUA | 6 | 30 | 40 | 76 |
| CENTELLA ESTRELLA FUGAZ | PLANCHA | 8 | 30 | 40 | 78 |
| NILA PONTO VITAL | GOLPE MARMA | 8 | 30 | 40 | 78 |
| AMINU VALEU A ESPERA | MASHI nível 1 | 10 | 30 | 40 | 80 |
| NILA/SARPA PICADA | SALTO DA SERPENTE | 10 | 30 | 40 | 80 |
| BAATAR PESO DA ESTEPE | ARREMESSO (agarrão) | 14 | 30 | 30-40 | 74-84 |
| ZENON CORTESIA DA CASA | SELO | 16 | 30 | 40 | 86 |
| CAMILLE BOTTE SECRÈTE | REVERS | 17 | 30 | 40 | 87 |
| WEI LONG TAIJI ZHANG | LONG ZHANG (tiro) | 20 | 30 | 40 | 90 (1,5 s) |
| ZENON FIM DO BANQUETE (chefe2) | DECRETO | 24 | 30 | 40 | 94 |

Perspectiva: 1,2-1,6 s entre apertar e ver o rival cair, com 0,5 s dessa espera sem controle de ninguém. É um "super" convencional em duração; só que no toque o botão SUPER
dispara os dois botões fortes juntos, e a tarja não pode ser pulada. A CPU faz 1,5-2,3 supers por luta (harness com `--ritmo`, alvo R-10: 1 a 4).

### 2.5 O que o harness de balanço diz (e o que ele NÃO enxerga)

- **Frame data:** regravada hoje no HEAD = idêntica à commitada (0 diferenças em 211 linhas).
- **Equilíbrio** (`docs/balanco/resultados.md`, completo, 25 800 lutas CPU x CPU): taxas de 45,3% (WEI LONG, MIN-JI) a 56,8% (BAATAR); duração média 93 s; 0% decidido por tempo.
  Único sinal de atenção: `camille sFwd` (REVERS) com 3,9% de contato, "nunca acerta".
- **Especiais por luta** (harness rápido de hoje, CPU x CPU, 6 sementes): **27-36 sem ritmo; 31-42 com `--ritmo intervalos,filmeRestrito,super,cpu`** por luta de 99 s; a fatia do
  dano de especial é 38-40%. A CPU spamma especial: é um dos motivos de a luta contra a CPU "parecer repetitiva".
- **"Tempo parado" (portão §4.5):** 31,9% (NORMAL) / 32,4% (DIFÍCIL) com o ritmo ligado, ainda FORA do limite de 15%. **Essa métrica está DESATUALIZADA**: ela soma 48 ticks por especial
  (cinemática antiga), mas com `ritmo.tarja` ligado o especial comum NÃO congela. O portão não mede o congelamento real de hoje; precisa ser reescrito (super 30 + filme só no KO).
- **Combos próprios:** CPU DIFÍCIL faz 1,75 por luta regular (82% das lutas com >= 1); NORMAL ~0 (o `proprio` do NORMAL é 0 por desenho).
- **O harness NÃO mede entrada, toque, buffer nem laço**: a CPU gera `InputFrame` perfeito, sem oscilar, sem dash por engano, sem perder direção. Os "delays" desta
  auditoria são invisíveis para ele.

---

## 3. Cancelamentos, janelas e o que falta para a sensação "fiel"

### 3.1 O que existe hoje

| Mecânica | Valor / regra | Onde | Contra a prática dos jogos de luta |
|---|---|---|---|
| Buffer de ataque | 9 ticks (150 ms), 1 vaga, o aperto mais novo vence | `fighter.ts:600-606` | na faixa (4-10f). Falha: 1 vaga só |
| Buffer durante o hitstop | guarda último botão + mudanças de direção; entrega no 1º tick livre (`buf t:10`) | `game.ts:688-712`, `fighter.ts:581-589` | correto e ligado por padrão; só ataque e direção (esquiva e `spSeg` ficam de fora de propósito) |
| Buffer de esquiva | 6 ticks | `esquiva.ts:28-33` | ok |
| Janela de comando | 18 ticks, não contígua | `comandos.ts:30-33` | ok e leniente; `sp` dispensa o comando |
| Corrente (cadeia) | cancela por RANK: lp(1) -> lk(2) -> hp(3) -> hk(4) -> especial(9); `lp`/`clp` repetem até 3x; só com o golpe CONECTADO (acerto OU bloqueio), a partir de `mt >= S` e com o botão no buffer | `fighter.ts:888-905` | é a "série mágica": fiel ao protótipo e permissiva |
| Cancelamento em especial | qualquer normal conectado cancela para especial (rank 9), com custo | idem | correto |
| Cancelamento em super | idem, pelo par hp+hk | `fighter.ts:876-885` | correto; especial NÃO cancela em super (MVP, de propósito) |
| Combos próprios | 17-20 no elenco (o verificador do harness passa 20 de 20), cancelam fora da regra de rank | `fighter.ts:896`, `data/combos-proprios.ts` | CPU DIFÍCIL usa 85%; o jogador humano precisa saber a sequência |
| Aparo / armadura | PARADE, GARKUWA, armor | `game.ts:1032-1052` | ok |
| Esquiva | botão dedicado, janela invulnerável de 14 ticks (trás) / 16 (frente, ticks 3-19), custo 20 | `fighter.ts:777-820` | ok |
| Levantar | queda ~21 + deitado 34 + levantar 14 + 12 de invulnerabilidade | `fighter.ts:1026-1043` | ~70 ticks de nocaute é longo (a faixa dos jogos é 40-60) |
| Bloqueio | automático ao segurar "para trás" | `fighter.ts:617`, `canBlock` | ok |

### 3.2 O que falta (ou está diferente) e pesa na sensação

Ordenado pelo quanto cada item explica de "não responde / não flui":

1. **Estados de trava sem saída por ataque:** `dash` (16/18), `prejump` (3), `esquiva` (22/26), `land` (4, esse deixa guardar o botão). Em todos o botão apertado é GUARDADO por 9 ticks e perde a vez se a trava for maior que isso (ensaio B2).
2. **Entrada de direção por NÍVEL:** um toque de direção mais curto que um quadro desaparece (ensaio D1). Em frame baixo isso quebra agachar-golpear rápido, o 2º toque do dash e as meias-luas feitas no joystick.
3. **Joystick sem histerese nem zonas angulares:** pulos, agachadas e dashes que o jogador não pediu (seção 1.2).
4. **Espera do par do super (3 ticks) com a barra cheia:** a barra cheia é justamente o estado em que o jogador quer o golpe mais rápido.
5. **Carga do AMINU sensível a toque longo:** dedo >= 184 ms no ESPECIAL.
6. **Agarrão com precedência:** `->` + SOCO FORTE a menos de 108 px vira `throw` (ensaio C1). No teclado quem anda para frente e bate de perto sabe disso; no celular, com o joystick sempre empurrado, o golpe errado sai com frequência. Uma saída é só agarrar com `->` + SOCO FORTE PARADO por 2 ticks, ou botão dedicado (decisão de design).
7. **Hitstop curto** (4/6/2): o golpe "não pesa". Não é latência; é impacto.
8. **Buffer de 1 vaga:** dois comandos guardados (ex.: soco fraco e depois o especial) só o último vale.
9. **Sem janela de "link" visível ao jogador:** a vantagem no acerto dos leves é +2/+4; o jogo não ensina o link e o único caminho de combo é a cadeia por rank e os combos próprios.
10. **Normais iguais entre lutadores** (5 de 10 idênticos).
11. **Nocaute longo (~70 ticks)** e levantar sem reversão armazenável (o buffer de 9 ticks cobre só o fim do `rise`, que tem 14).
12. **Sem cancelamento em falha** (whiff) e sem cancelamento de especial para especial: por desenho, igual ao protótipo.

---

## 4. Correções priorizadas, com risco

Convenção de "Efeito nos hashes": **H-ref** = referência commitada (`docs/balanco`, completo, `75764f4439da`): total `d5fcc2263ad946ac`, regulares `83a6997ab15ef38e`, chefes `86646c44100734e9`. **H-rápido** = rodada de hoje no HEAD
(`npm run balanco -- --rapido --esquiva`): total `cf93dece72c376e7`, regulares `e410897f434ae333`, chefes `7aaf5a75b2887189`; com `--ritmo intervalos,filmeRestrito,super,cpu`: total `486bb10e1591e6e6`, regulares `3b18753ed940deed`, chefes `3117626b6d18ae4d`.
"Oráculo" = os testes de fidelidade ao protótipo/lock-step dos 4 originais (HAYATO, WEI LONG, MIN-JI, CAIO) e CPU x CPU.

### 4.0 Antes de qualquer coisa (decide o que vem depois)

- **Qual build o dono jogou?** Se foi anterior a `f92bbcf` (ritmo onda 1) o especial comum congelava a cena por 48 ticks (0,8 s) e a luta de CPU tem ~30 especiais: isso, sozinho, é "golpes com muitos delays". Conferir o commit servido pelo site publicado (e se ele jogou com `?ritmo=0`/`?motorv2=0`, que são o rollback).
- **Tempo de quadro no Android** (Íris): se o p95 do quadro passa de 20 ms, o desenho (item 4.3) vale mais do que qualquer ajuste de motor, porque cada toque só é lido no quadro seguinte.

### 4.1 Só UI/entrada (nada de `Game`): ZERO efeito em hashes e oráculo

| # | Correção | Onde | Dono | Risco | Observações |
|---|---|---|---|---|---|
| U1 | Joystick: zonas angulares (cima só acima de ~55 graus, baixo só abaixo de ~-55, horizontal tolera deriva de ~35 graus) + histerese (liga a 25%, desliga a 15%) + soltura mínima de 2-3 ticks antes de contar como solto | `toque.ts` `direcoesDoKnob`/`mudar` | Lyra | baixo | muda "os limiares do protótipo" (e o `toque.test.ts`): decisão do dono. Resolve pulo/agachada/dash por engano |
| U2 | `TeclasVirtuais`: uma tecla apertada e solta dentro do mesmo quadro continua `segurada` até o `fimDoTick` seguinte (trava de 1 tick) | `teclas.ts` | Vega | baixo | teclado e toque. Resolve direção perdida em frame baixo. Atualizar `teclas.test.ts` |
| U3 | Desenho no Android: `RS` adaptativo (2 -> 1,5 -> 1 conforme o p95 do quadro), `imageSmoothingQuality = 'low'` no celular, `getContext('2d', { alpha: false })`, evitar alocação em `Fluidez.vista`/`get fonte` | `tela.ts`, `fluidez.ts`, `fight.ts:317` | Lyra | médio (pixel) | o oráculo de pixel provavelmente depende de `RS = 2`: manter `RS = 2` no desktop. A medição da Íris dá o alvo. Ganho potencialmente MAIOR que todo o resto |
| U4 | Filtro do botão ESPECIAL no toque: só reportar `spSeg` depois de 12 ticks de dedo no botão (carga do AMINU só quando é de propósito) | `toque.ts` | Lyra | baixo | só afeta o AMINU (e futuros golpes `carga`) |
| U5 | Congelamento do SUPER: permitir pular a tarja a partir de ~12 ticks, ou encurtar para 20 | `fight.ts:615-619`, `tarja-super.ts` | Lyra | baixo | a tarja do super tem 30 ticks sem pular (spec) |

### 4.2 Motor sob flag nova (molde `motorV2.*`): ausente = idêntico bit a bit; ligar em `REGRAS_PADRAO`

Regra do molde: flag ausente não muda nada (oráculo e lock-step intactos); a rodada com a flag ligada ganha uma nova linha de base do harness.

| # | Correção | Onde | Dono | Risco | Efeito nos hashes |
|---|---|---|---|---|---|
| M1 | Par do super SEM espera: `hp`/`hk` sai na hora; se o outro botão chega em <= 2 ticks e `mt <= 2`, PROMOVE para o super (desfaz o `startMove`: `atkId`, `swing`, `adv`) | `fighter.ts:451-471,691-701,886` | Vega | médio (desfazer `startMove` limpo) | H-ref e H-rápido sem ritmo: IGUAIS. Com `--ritmo super,cpu`: MUDAM (a CPU aperta hp sozinho com barra cheia e hoje espera 3 ticks) |
| M2 | Ataque cancela o dash a partir do tick ~6 (ou o buffer só começa a contar quando a trava acaba, até um teto de 20 ticks) | `fighter.ts:670-675` | Vega | médio | H-ref e H-rápido: IGUAIS com a flag ausente. Com a flag: MUDAM só se a CPU fizer dash por oscilação de `hold`; `cpu.ts` não menciona dash, mas `Fighter` é genérico: medir com `--motor-v2` |
| M3 | Buffer de 2 vagas (fila) em vez de 1; ordem de chegada | `fighter.ts:600-606` | Vega | médio | muda toda partida onde a CPU aperta dois botões em <= 9 ticks: MUDA o hash com a flag ligada |
| M4 | Hitstop: acerto leve 4 -> 6, forte/KO 6 -> 8, bloqueio 2 -> 3 (mais "peso") | `game.ts:1241,1104` | Vega | ALTO | muda todo o ritmo (ticks/round, portões do §4.5), exige `motorV2.hitstop` e é decisão de SENSAÇÃO: portão de vídeo antes de publicar (regra do dono) |
| M5 | Dash opcional por plataforma: com toque, `ConfigPartida.dash = false` (a esquiva já cobre); teclado mantém | `fighter.ts:714`, `fight.ts` | Vega + Lyra | baixo | harness não usa toque: IGUAIS |
| M6 | Agarrão só com `->` + SOCO FORTE segurado 2 ticks (ou botão dedicado no toque) | `fighter.ts:437` | Vega | médio | CPU usa `throw`: MUDA com a flag |

### 4.3 Só dados (S / A / R / hs): sem código, mas mexem em hash

| # | Correção | Alvo | Risco | Efeito |
|---|---|---|---|---|
| D1 | BAATAR ARREMESSO DO AVARGA R 36 -> ~28 | `src/data/lutadores/baatar.ts:31` | baixo (BAATAR é chefão e lutador comum; a rampa de chefões tem metas) | H-ref/H-rápido: MUDAM (regulares E chefes). Rerrodar `--completo --esquiva` e as metas de chefão |
| D2 | WEI LONG LONG ZHANG S 20 -> 16; CENTELLA RESORTE S 51 -> ~36 | `wei-long.ts` (ORIGINAL), `centella.ts` | médio | WEI LONG é original: o ORÁCULO de fidelidade ao protótipo falha de propósito; só com ordem do dono e regravação do oráculo. CENTELLA: só H-ref |
| D3 | Diferenciar normais (S/R) por lutador | `lutadores/*.ts` `mods` | alto (balanço) | tudo muda. Fora do escopo "fluidez"; só se o dono pedir "personalidade" |
| D4 | Nocaute: `lie` 34 -> ~26 ticks | `fighter.ts:1032` (constante, não dado) | médio | vira motor sob flag; H muda |

### 4.4 Ordem recomendada

1. Descobrir o build que o dono jogou e o p95 do quadro no Android (Íris).
2. U1 + U2 + U4 (Lyra/Vega): pequenas, zero hash, resolvem "faz o que eu não pedi" e "perde o toque".
3. U3 conforme a medição (Lyra).
4. M1 + M2 + M5 (Vega) sob flag nova `motorV2.fluidez` (uma flag só para as três, ligada por padrão, rollback `?motorv2=0`), com a rodada `--completo --esquiva` regravada e testes novos (os ensaios A3/B2 desta auditoria viram testes permanentes).
5. D1 (e M4 só com vídeo, decisão de sensação do dono).

---

## 5. O que foi provado e como

| Afirmação | Nível |
|---|---|
| Entrada -> `move` em 0 ticks; super espera 3; dash engole 1-8 ticks e atrasa até 8; agarrão a 90 px; MASHI >= 11 ticks vira carga; super = 10 ticks por acerto; cancelamento perde o aperto sem `entradaNoHitstop` | **EXECUTADO** no `Game` real (scripts de ensaio no scratchpad da sessão, `latencia.mjs`/`varredura.mjs`/`cancel.mjs`/`mashi.mjs`/`super.mjs`; não versionados) |
| Frame data (211 linhas) igual à commitada; hashes de hoje | **EXECUTADO** (`npm run balanco -- --so frame --esquiva`; `--rapido --esquiva`, com e sem `--ritmo`) |
| Valores de hitstop e rotas `fight.ts -> Game -> Fighter` | **LIDO** no código (linhas citadas) |
| `D1`: toque curto perde a direção e mantém o botão | **EXECUTADO** (`TeclasVirtuais`) |
| Zonas do joystick (24 graus -> pulo, 21 -> agachar) | **ARITMÉTICA** sobre as constantes de `toque.ts` (função pura; ainda sem ensaio em aparelho) |
| Android: desenho caro (`RS = 2`, `'high'`, alocação por quadro) como causa dominante do delay | **HIPÓTESE.** Lido no código; NÃO medido. Dependente da medição da Íris |
| O dono jogou um build anterior ao ritmo | **HIPÓTESE.** Não verificado |
| CAIO novo "lento": frame data idêntica à anterior | **EXECUTADO** (comparação com `5bd8e7a~1`); a percepção visual (arte, contato) NÃO foi medida |
| Nada em `src/`, `tests/`, `docs/balanco/` foi alterado | `git status` limpo (só as pastas de memória dos agentes, não minhas) |

Limites: nenhum aparelho Android; nenhum humano; os ensaios usam HAYATO/AMINU/CAIO/WEI LONG/BAATAR em treino contra boneco parado; o harness é CPU x CPU.

---

## 6. Handoff

**RESULTADO:** auditoria do caminho entrada -> golpe e dos dados de golpe do elenco inteiro, sem alterar código. O motor responde no mesmo tick; os dados dos normais estão na faixa; o que atrasa são esperas escondidas (dash, par do super, carga do AMINU) e entrada imprecisa no toque (joystick sem histerese, direção por nível), mais, por hipótese, o custo de desenho no Android. Arquivo: `docs/auditoria-fidelidade-motor-2026-10-24.md`.

**PARA O PRÓXIMO:**
- Lyra: U1 (joystick), U2 (com Vega), U3 (desenho; o alvo vem da Íris), U4, U5. Decisão do dono: mudar "os limiares do protótipo" no toque.
- Vega: M1, M2, M5 sob `motorV2.fluidez`; ensaios A3/B2 viram teste permanente; regravar `--completo --esquiva` e comparar com H-ref.
- Íris: medir p95 do quadro e latência de toque em Android real; conferir qual commit está publicado; repetir os ensaios A3/B2/MASHI no navegador com toque real; vídeo de sensação antes de M4.
- Órion: nada de segurança aqui; rever só a precedência do agarrão (M6) se virar mudança de comando.

**PENDÊNCIAS:** (1) build publicado e flags usadas pelo dono; (2) medição em aparelho; (3) decisão do dono sobre joystick fora do protótipo, hitstop (peso) e diferenciação dos normais; (4) o portão "tempo parado" do harness conta 48 ticks por especial e está desatualizado frente a `ritmo.tarja`.

**APRENDIZADO:** (a) "0 ticks de latência no motor" não quer dizer "sem delay": as esperas moram em estados de trava (`dash`, `prejump`, `esquiva`) e em esperas de decisão (`aguardandoParDoSuper`), e o buffer de 9 ticks é mais curto que o dash de 16; (b) botão tem borda (`apertada`), direção tem só nível (`segurada`): a assimetria some toques curtos de direção em frame baixo; (c) o harness CPU x CPU é cego a entrada humana, toque e laço; qualquer "fluidez" precisa de ensaio com `Game` + `FonteEntradas` scriptada ou aparelho; (d) o diagnóstico de 44,6% de tempo parado foi medido ANTES dos defaults do ritmo; ao citar números de "tempo parado" sempre dizer o commit.

---

## 7. Implementação (Vega, mesmo dia): flag `fluidez`, ligada por padrão

Contrato: `ConfigPartida.fluidez` (`FluidezMotor`, `src/core/contratos.ts`), `Regras.fluidez` (`FLUIDEZ_PADRAO` em `src/meta/regras.ts`), rollback `?fluidez=0`
(`?fluidez=par,dash,fila,agarrao,semdash,semfrente,dados` para A/B). `cfgMotorV2` já leva a fluidez junto, então `select.ts`/`diff.ts`/`campanha.ts` herdam sem mudar.
`main.ts` preenche `fluidez.toque` com `temToque(window)` (o sinal de "humano no celular"). Ausente = o motor de antes, bit a bit (provado: frame data, hashes e snapshots iguais).

| Correção | Flag | Antes (ticks) | Depois (ticks) | Ensaio permanente |
|---|---|---|---|---|
| M1 forte do par do super sem espera, promovido a super se o par fecha em até 2 ticks | `parSuper` | hp ou hk com barra cheia: **3** | **0** (par a 0/1/2 ticks segue virando super; a 3 não) | `fluidez.test.ts` "M1 / ensaio A3" |
| M2 ataque cancela o dash; buffer não expira no dash | `dashCancela` | `lp` nos 1-8 primeiros ticks do dash: **PERDIDO**; no 9º: +8; no 12º: +5 | 1º: +3, 2º: +2, 3º: +1, do 4º em diante: **+0** (recuo cancela a partir do 6º, depois da invulnerabilidade) | "M2 / ensaio B2" |
| M5 sem duplo toque no celular (humano) | `semDashNoToque` + `toque` | oscilação do joystick (5 on / 2 off / on) vira **dash** (trava 16) | continua andando; teclado/controle mantêm o dash | "M5 / ensaio B1" |
| M3 buffer de 2 vagas | `fila` | `lp, hp, hk` apertados em 0,1,2: lp > **hk** (o mais novo vence) | lp > **hp** (ordem de chegada) | "M3" |
| M6 agarrão por SOCO FRACO + CHUTE FRACO (promovido quando o par fecha em até 2 ticks, rival ao alcance) | `agarraoPar` | par sai como lp/lk, nunca agarra | agarra no tick em que o par fecha (0/1/2); longe, sai o normal | "M6" |
| M6b `->` + SOCO FORTE não agarra para o humano no toque | `semAgarraoPorFrente` + `toque` | agarra a 90 px | sai `hp` | "M6" (**desligado por padrão**: falta o botão AGARRAR no toque) |
| D1 BAATAR ARREMESSO DO AVARGA R 36 -> 28 (cópia do lutador, `src/data/fluidez-dados.ts`; original intacto) | `dados` | R 36 | R 28 (golpe e `sps`) | "D1" |

Fora de escopo, como pedido: M4 (hitstop) continua só proposta (precisa de vídeo de sensação).

Pendência de UI (Lyra): botão AGARRAR no toque (`data-k="z,c"`, o mesmo mecanismo do SUPER `x,v`) e, só então, ligar `semAgarraoPorFrente` em `FLUIDEZ_PADRAO`.

Harness: `--fluidez [par,dash,fila,agarrao,dados]` (nunca grava em `docs/balanco`). Rodadas de hoje, `--esquiva`:

| Rodada | total | regulares | chefes |
|---|---|---|---|
| rápido, flag ausente (= antes) | `cf93dece72c376e7` | `e410897f434ae333` | `7aaf5a75b2887189` |
| rápido, `--fluidez` | `921b5340d7dd76b5` | `e2dae7c2ac129ab5` | `9932e975c3f49dfc` |
| rápido + `--ritmo intervalos,filmeRestrito,super,cpu`, flag ausente (= antes) | `486bb10e1591e6e6` | `3b18753ed940deed` | `3117626b6d18ae4d` |
| rápido + ritmo + `--fluidez` | `536ffbb452022f85` | `3754a141641c0435` | `14f93f64870e5a48` |
| 40 sementes, flag ausente | `658e9be10cbcb58c` | `0a2ed2dad70d17ea` | `c1c466193723ada0` |
| 40 sementes, `--fluidez` | `ebe63d124d66c41f` | `aa9ca76497e7cd00` | `ad3dac8714921757` |

Taxa de vitória (40 sementes, 7200 lutas regulares): flag ausente 45,7% a 55,4%; com `--fluidez` 45,6% a 55,6% (dentro de 44-57%). Chefões: dentro do ruído de 40 sementes (±4 pontos); sem a flag estavam fora da meta CENTELLA DIFÍCIL, CAMILLE (os dois níveis), NILA NORMAL e ZENON NORMAL; com a flag ficam fora só NILA NORMAL (23,2% vs 23) e ZENON NORMAL (20,8% vs 19) e AMINU NORMAL (30,6%, meta 26-30), todos dentro do ruído. A confirmação com 100 sementes (`--completo --esquiva`) fica para a regravação.
**Achado independente da fluidez:** com o ritmo de produção (`super` + `cpu`) já a base dá MIN-JI 29,0% e WEI LONG 61,0% (40 sementes), fora de 44-57%; com a fluidez 26,3% e 59,2%.
