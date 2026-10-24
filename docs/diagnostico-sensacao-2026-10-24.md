# Diagnóstico de sensação — HEAD 209ecd8 (2026-10-24)

Evidência levantada a pedido do dono depois da reprovação do build publicado (motor v2 ligado): "jogabilidade
terrível de fraca", "combos sem sentido", CAIO "nada a ver com capoeira", "filme de abertura com personagens
robotizados", "não vi a tarja dos especiais". Esta é uma tarefa de **evidência, não de correção** — nada em
`src/`/`tests/` foi alterado.

## Metodologia (e por que não é o que foi pedido ao pé da letra)

- **Commit exato testado:** `209ecd8` (o publicado), isolado num `git worktree --detach` próprio, com
  `node_modules` ligado por junction e servidor Vite dedicado na porta 5196. Motivo: a sessão roda num repo
  onde outros agentes editam `src/` ao vivo (confirmado: `src/ui/cenas/fight.ts` e `src/meta/regras.ts`
  recarregaram por HMR durante os primeiros testes, matando a página no meio da luta). O worktree isolado
  elimina esse ruído e garante que toda medição é do commit que o dono realmente jogou.
- **Tempo real (rAF) x `?manual=1`:** o Chromium headless estrangula o `requestAnimationFrame` (medido: ~8-9
  ticks de jogo processados por segundo de parede, por causa do teto de 100 ms por quadro em `main.ts:245`
  combinado com rAF raro). Jogar "em tempo real" headless rodaria a luta em câmera lenta artificial e
  inflaria qualquer medida de tempo parado. Por isso usei `?manual=1` + `h.avancar(6)` (exatamente 6 ticks =
  100 ms a 60 Hz) + `h.desenhar()` a cada passo — o MESMO caminho de código do jogo real (`ui.update()`),
  só quem chama é o teste em vez do `requestAnimationFrame`. É a técnica que a própria suíte e2e do projeto
  já usa para jogo determinístico.
- **"Jogador por teclado":** um bot em JavaScript despacha `KeyboardEvent` sintéticos reais no `window`
  (mesmos listeners `keydown`/`keyup` de `src/input/teclado.ts`, mapa `CTRL_P1`) — anda até o rival, ataca
  com os 4 golpes + especial (direção + `b`) quando perto, segura defesa quando o rival está em `move`. Não
  é um humano real nem é scripted para ganhar; é suficiente para gerar partidas de verdade contra a IA real
  do jogo (mesmo código `src/fight/cpu.ts`, `AI_LEVELS`).
- **Prova de verdade:** toda luta grava (a) screenshot do canvas a cada passo de 100 ms e (b) um hook em
  `game.emitir` que captura TODOS os eventos do motor (`hit`, `special`, `block`, `ko`...) com o tick exato.
  Os números abaixo vêm desse log bruto, não de inspeção visual.
- **Partidas de 1 round** (`persist.settings.rounds = 1`) para caber no orçamento da sessão — percentuais de
  tempo parado devem generalizar (são por fase do motor, não por número de rounds), mas a duração absoluta de
  uma luta "normal" (melhor de 3) seria maior.
- Dados brutos (amostras + eventos + frames PNG) ficam em
  `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\out-*` (pasta de sessão, não versionada).

## 1. Tempo parado por luta

Categorias mutuamente exclusivas, amostradas a cada 100 ms (300 amostras = 30 s de orçamento por luta,
`rounds=1`). "PARADO" = tudo em que o jogador não tem controle (provocação, contagem de round, tarja do
especial, hitstop, KO, fim de round/partida). "Jogável" é o resto.

| Luta | CPU | Total | Provocação | Contagem (round) | Tarja | Hitstop (amostrado) | KO | Fim de partida | **PARADO** | Jogável |
|---|---|---|---|---|---|---|---|---|---|---|
| HAYATO (eu) × CAIO | NORMAL | 30,0 s | 5,4 s (18,0%) | 1,5 s (5,0%) | 1,8 s (6,0%) | 1,0 s (3,3%) | — (sem KO em 30 s) | — | **9,7 s (32,3%)** | 20,3 s (67,7%) |
| CAIO (eu) × MIN-JI | DIFÍCIL | 28,6 s | 4,9 s (17,1%) | 1,5 s (5,2%) | 3,9 s (13,6%) | 1,3 s (4,5%) | 1,7 s (5,9%) | 1,0 s (3,5%) | **14,3 s (50,0%)** | 14,3 s (50,0%) |
| NILA (eu) × BAATAR | NORMAL | 29,4 s | 7,4 s (25,2%) | 1,5 s (5,1%) | 2,3 s (7,8%) | 1,2 s (4,1%) | 1,6 s (5,4%) | 1,1 s (3,7%) | **15,1 s (51,4%)** | 14,3 s (48,6%) |
| **Média das 3** | — | — | 20,1% | 5,1% | 9,1% | 4,0% | — | — | **44,6%** | 55,4% |
| Comparação `?motorv2=0` (HAYATO×CAIO, NORMAL) | NORMAL | 25,1 s | 5,2 s (20,7%) | 1,5 s (6,0%) | 2,5 s (10,0%) | 1,8 s (7,2%) | 1,7 s (6,8%) | 1,0 s (4,0%) | **13,7 s (54,6%)** | 11,4 s (45,4%) |

**Leitura:** em média quase **metade do tempo de uma luta (44,6%) o jogador não está jogando** — está vendo a
provocação pré-round, a contagem "ROUND 1", a tarja de um especial (seu ou do rival), um congelamento de
hitstop, ou a sequência de KO/vitória. Isso é consistente nas 3 lutas (32,3% a 51,4%) e não muda de forma
sistemática com `?motorv2=0` (54,6% nessa amostra — within da mesma faixa). A hipótese mais provável para
"jogabilidade fraca" não é desbalanceamento de dano, é literalmente **quanto tempo o jogo passa sem reagir ao
jogador**. O hitstop na tabela é SUBAMOSTRADO (2-8 ticks = 33-133 ms, menor que a grade de 100 ms): o valor
real de hitstop é um pouco maior que o mostrado (ver eventos.json para o log exato por golpe).

**Provas (passo = índice da amostra, msJogo = tempo de jogo simulado, não parede):**
`out-f2/amostras.json` passo 253→270 mostra a sequência completa provocação→ROUND 1→trocas→tarja→hit→KO→"MIN-JI VENCE!" — ver montagem `f2-ciclo-tempo-parado.png` abaixo.

## 2. A tarja dos especiais: apareceu, em todos os modos testados — exceto com movimento reduzido

Testei `cpu` (NORMAL e DIFÍCIL), `training`, `versus` e `arcade` (1ª luta, sem chefe). Em **TODAS** as
~30+ ativações de especial observadas nesses modos, a tarja apareceu, modo `'completa'` (a faixa inclinada
com nome do golpe, ~800 ms), sem uma única falha:

- `cpu` NORMAL (HAYATO×CAIO): 5 especiais, 5 tarjas completas.
- `cpu` DIFÍCIL (CAIO×MIN-JI): 7 especiais, 7 tarjas completas.
- `cpu` NORMAL (NILA×BAATAR): 6 especiais, 6 tarjas completas.
- `training` (HAYATO×WEI LONG, sem CPU): 2 especiais, 2 tarjas completas.
- `versus` (HAYATO×CAIO, 2 humanos): 2 especiais, 2 tarjas completas.
- `arcade`, 1ª luta sem chefe (HAYATO×WEI LONG): 2 especiais, 2 tarjas completas.
- `?motorv2=0`: 7 especiais, 7 tarjas completas (confirma que a tarja NÃO depende do motor v2 — é
  `Regras.cinematica`, uma flag separada, sempre ligada por padrão; `src/render/cinematica.ts:49-53`).

**O achado real:** com `prefers-reduced-motion: reduce` emulado (um ajuste de acessibilidade do SO/navegador,
não uma opção dentro do jogo), **100% dos especiais (4/4) caem para o modo `'curta'`**, que por desenho
**não tem tarja nenhuma** (comentário do próprio código, `src/render/cinematica.ts:21`: "CURTA = 20 ticks:
sem tarja; o atacante em destaque, o nome pequeno sobre ele e uma rajada do estilo"). Confirmei visualmente:
em vez da faixa grande, aparece só um flash branco + o nome do golpe em letra pequena sobre o lutador (ex.:
"RABO-DE-ARRAIA" sobre o CAIO, sem faixa). Ver `tarja-completa-vs-curta.png` abaixo — a diferença de leitura
é enorme.

**Hipótese para "não vi a tarja":** se o navegador/SO do dono tiver "reduzir movimento" ativado (comum em
notebooks com economia de energia, ou em alguns perfis de acessibilidade do Windows/macOS), o jogo
silenciosamente nunca mostra a faixa — sem aviso, sem opção visível no menu do jogo para o jogador entender
por quê. Não testei se existe uma preferência SALVA (`persist.settings.cinematica`) de uma sessão anterior
que também force `'curta'`/`'desligada'`; é a outra hipótese a eliminar (ver Pendências).

## 3. "Filme" do especial (replay em câmera lenta no acerto limpo): nunca disparou em jogo real

`motorV2.filmes = true` está ligado por padrão. Em **4 lutas completas, 46 acertos no total** (incluindo
golpes especiais conectando limpo, ex. `t=502 sFire` no 1º HAYATO×CAIO, `t=642 sFire` no CAIO×MIN-JI,
`t=807 sFwd` no NILA×BAATAR), **o campo `filme` do evento `hit` nunca veio `true`** e `filmeAtivo` nunca
apareceu `true` em nenhuma das ~1150 amostras de 100 ms coletadas. A mecânica existe (há e2e dedicado,
`tests/e2e/filme-jogo.spec.ts`, que força as condições certas), mas em jogo real — mesmo com specials
acertando limpo — não apareceu uma vez sequer nesta amostra. Não afirmo que está quebrada (pode exigir uma
condição específica de execução/combo que o bot não bateu), mas é um indício forte de que **o jogador comum
praticamente nunca vê essa mecânica**, o que pode contribuir para a sensação de "faltando algo" na
apresentação dos especiais.

## 4. CPU: combos e lógica dos golpes

- **Distância no acerto:** conferi a posição dos dois lutadores no instante de 6 acertos aleatórios (fight 1):
  distância entre 78 px e 138 px — alcance de corpo a corpo plausível, nenhum "acerto fantasma" a distância
  absurda.
- **Combos reais existem, mas são curtos:** a CPU encadeia golpes (campo `acertos` do evento `hit`, igual ao
  combo counter na tela). Maior combo observado: **3 hits** (MIN-JI DIFÍCIL, `t=307→339`: `hp` → `sFire` →
  `sFire`, 32 ticks ≈ 0,5 s, 23,5 de dano). O mais comum é 1 hit avulso (as duas CPUs NORMAL raramente
  passaram de 2 hits). Isso é MECANICAMENTE coerente (os hits se conectam, a distância bate), mas **a troca
  é pouco frequente**: boa parte da luta é posicionamento/whiff (`deny`, `dust` de passos) entre as trocas.
- **Repetição do mesmo golpe:** MIN-JI (DIFÍCIL) usou `sFwd` 4 vezes em 28,6 s — a MESMA tarja, a MESMA
  animação, repetida de forma idêntica 4 vezes numa luta curta. É provavelmente aqui que "combos sem
  sentido"/repetitivos vem: não é um bug de lógica (a CPU não erra o alcance nem ataca o nada), é a CPU
  martelando o especial mais forte disponível sempre que pode, sem variar.
- **CPU DIFÍCIL x NORMAL:** DIFÍCIL (MIN-JI) acertou 16 de 18 hits da luta (dominou), usou mais especiais
  (7 vs 5-6) e por consequência teve mais tarja (13,6% do tempo da luta só em cinemática de especial, o maior
  entre as 3 lutas) — mais "parado" justamente na dificuldade mais usada por jogadores experientes.

## 5. Trailer de abertura: o que dá para ver objetivamente

Capturei o trailer completo (14 planos, P0 a P10, ~10 s de jogo simulado) do boot ao logo, em
`?manual=1` real (sem bypass). Contact sheet com 1 quadro por plano: `trailer-contact-sheet.png`.

- **Estático x completo:** `diagnostico().estatico` ficou `false` em TODOS os planos (a versão completa
  animada rodou, não a reserva estática de rede lenta) — isso porque testei em localhost, rede/CPU
  ociosos. **Isso é uma lacuna real da minha evidência**: a feature de degradação para estático por vazão
  (commits `209ecd8`/`c058ac9`, documentada em `src/ui/trailer/trailer.ts`) existe exatamente para redes
  reais/aparelhos reais — não tenho como provar ou descartar que o dono viu a versão estática/degradada sem
  medir no aparelho dele (throttling de rede real, não emulado).
- **Poses genéricas e repetidas:** a maioria dos planos de luta (P1 HAYATO×WEI LONG, P3 AMINU×HAYATO, P4
  CENTELLA×CAIO, P6 NILA×WEI LONG, P7 BAATAR×HAYATO) mostra os dois lutadores na MESMA pose de guarda
  genérica — punhos à altura do peito, joelhos dobrados — **independente da modalidade reivindicada**
  (capoeira, taekwondo, luta livre, sumô). Isso é visualmente plausível como "robotizado"/repetitivo: lutas
  de culturas/estilos diferentes se parecem na postura de base.
- **Quadro seguro em cima de nocaute:** no plano P5 (CAMILLE × MIN-JI, Marseille), a câmera segura ~1,5 s
  numa pose de MIN-JI caída, imóvel, de olhos fechados no chão enquanto CAMILLE fica parada em guarda — não
  identifiquei um bug (é coerente com "golpe nocauteou, câmera segura o impacto"), mas pode ser o tipo de
  quadro que lê como "robotizado" porque os dois lutadores ficam LITERALMENTE parados por mais de 1 segundo
  sem nenhuma micro-animação visível no sample de 100 ms.
- **GIF da abertura (plano P1, HAYATO×WEI LONG, 800 ms):** `trailer-p1-especial.gif`.

## Caminhos de imagem para o dono ver

1. `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\entrega\trailer-contact-sheet.png` — os 14 planos do trailer, 1 quadro cada.
2. `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\entrega\f2-ciclo-tempo-parado.png` — uma luta inteira (CAIO×MIN-JI) do início ao "MIN-JI VENCE!", mostrando onde o tempo vai.
3. `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\entrega\tarja-completa-vs-curta.png` — a tarja normal (esquerda) contra o modo sem tarja de `prefers-reduced-motion` (direita).
4. `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\entrega\tarja-completa.gif` — a tarja completa animada (8 quadros, 100 ms cada = 800 ms reais).
5. `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\entrega\trailer-p1-especial.gif` — o plano P1 do trailer em movimento.
6. (bônus) `C:\Users\Personal Computer\AppData\Local\Temp\claude\C--Projetos-Web-InnoGames-InnoFighters\61f7b893-ce21-4943-9b98-4c03eaa90187\scratchpad\out-f1\frames\f0041_4100ms.png` — CAIO na provocação pré-round (punhos erguidos, postura que não lê como capoeira).

## O que este diagnóstico NÃO prova (pendências para quem corrigir)

- **Rede real / aparelho real:** todo o trailer foi medido em localhost. Não testei a versão ESTÁTICA/degradada
  (rede lenta) nem em iPhone real — a feature existe mas minha evidência não a exercitou.
- **Preferência salva de cinemática:** não testei `persist.settings.cinematica` vindo de uma sessão anterior
  do dono (localStorage) — só o padrão de primeira visita e `prefers-reduced-motion`. Se o dono já clicou em
  alguma opção "reduzir efeitos" numa sessão anterior, isso por si só explicaria "nunca vi a tarja" sem
  precisar do reduced-motion do SO.
- **Por que `filme` nunca disparou:** não isolei a condição exata (`filmeDaExecucao`/`consumirExecucao` em
  `src/fight/game.ts`) que impede o replay de aparecer mesmo com specials acertando limpo. Precisa de alguém
  lendo essa lógica a fundo (Vega) ou de um e2e novo que force e meça em condições de jogo real, não só a
  condição artificial do `filme-jogo.spec.ts` existente.
- **"CAIO nada a ver com capoeira":** o guarda-roupa/estilo (calça branca, pés descalços, cordão) lê como
  capoeira; a POSTURA em combate e na provocação (punhos erguidos, estática) não necessariamente. Não fiz uma
  auditoria completa da animação de ginga (idle/walk) — isso já foi medido antes (ver memória de QA,
  "CAIO idle 4 quadros, variação do corpo 3,8 px") e Apolo abriu `docs/caio-capoeira-auditoria.md` em paralelo
  a esta sessão; cruzar os dois.
- **Amostra pequena:** 3 lutas de 1 round, ~30 s cada, com um bot (não um humano real) jogando. As médias de
  tempo parado são indicativas, não um veredito estatístico.

## Handoff (Íris → Atlas)

**RESULTADO:** 3 lutas reais (teclado sintético + CPU NORMAL/DIFÍCIL) gravadas tick a tick no commit
publicado (209ecd8, worktree isolado). Achado central: **44,6% do tempo de luta, em média, o jogador não tem
controle** (provocação 20%, tarja 9%, hitstop 4%, contagem/KO/vitória o resto). A tarja dos especiais
funcionou em TODOS os modos testados (cpu/training/versus/arcade) — só falha (por desenho, sem tarja nenhuma)
com `prefers-reduced-motion`. O "filme" do especial nunca apareceu em 46 acertos reais. CPU combo chega a 3
hits mas é raro; o padrão é repetir o mesmo especial várias vezes na mesma luta. Trailer: poses de guarda
genéricas e repetidas entre modalidades diferentes, e um quadro de >1,5s parado sobre um nocaute no plano P5.

**PARA O PRÓXIMO:** (a) alguém (Vega) investigar por que `filme` nunca dispara em jogo real apesar de
`motorV2.filmes=true`; (b) decidir se `prefers-reduced-motion` deveria mesmo zerar a tarja por completo ou só
encurtá-la (UX, não meu escopo); (c) checar se há preferência salva de cinemática herdada de build anterior;
(d) Lyra/Apolo: variar a pose de guarda por lutador no trailer para não parecerem intercambiáveis; (e) cruzar
com `docs/caio-capoeira-auditoria.md` do Apolo.

**PENDÊNCIAS:** medição em rede real/iPhone do trailer estático; auditoria completa da animação de ginga do
CAIO; por que `filme` nunca aparece; amostra maior (mais lutas, humano real em vez de bot).

**APRENDIZADO:** registrado na memória da Íris — (1) servidor dev apontando para o working tree compartilhado
sofre HMR de outros agentes e derruba a página no meio de uma luta longa: isolar em `git worktree --detach`
antes de qualquer sessão de jogo real; (2) `requestAnimationFrame` é estrangulado em Chromium headless — usar
sempre `?manual=1` + `h.avancar(n)` para jogo "em tempo real" medido, nunca o laço real do `main.ts`; (3)
"tarja" e motor v2 são flags independentes (`Regras.cinematica` x `Regras.motorV2`) — não confundir ao
investigar.
