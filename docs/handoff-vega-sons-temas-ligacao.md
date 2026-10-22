# Handoff da Vega: ligação dos sons por lutador (S4) e dos temas (T3), SEMPRE LIGADOS

Missão `cmviw09b5011601p7kflgsklz`. Base HEAD `64f2647`. **Nada commitado.** Decisão do dono no meio da tarefa: tudo o que ele pediu fica **sempre ligado, sem opção no menu e sem URL**.
`git diff src/fight` vazio. Os arquivos `src/platform/tela-cheia.ts`, `src/ui/cenas/options.ts`, `src/ui/contexto.ts`, `src/ui/persistencia.ts` e `tests/unit/tela-cheia.test.ts` aparecem alterados no
`git status` mas **não são meus** (outra frente editou em paralelo).

## RESULTADO

- **Chaves** (`src/audio/chaves.ts`, módulo leve): `IDENTIDADE_SONORA = true`, `TEMAS_POR_LUTADOR = true` (`Regras.temasMusicais` já era `true`). São só **rollback por código** (mudar a constante e publicar);
  `chavesSonoras` é o estado vivo (só testes e `camadas.ts` o mudam). Nada no menu, nada na URL, nada salvo. `?sons=1` e `?temas=1` **foram removidos** (o jogo nem os lê).
- **S4 (sons)**: `fight.ts` chama `reagirDoJogo(audio, game, game.events)` (em `src/audio/camadas.ts`; usa `reagirComIdentidade` com `contextoSonoro(game, audio.sementeVariacao)`, que é `semente + 6`).
  A abertura da tarja (`cine`) e todo o som da `SessaoEspecial` (acerto, defesa, MASHI por nível) calam quando a identidade está ativa; a batida da tarja continua. Kiai de vitória só no fim da luta
  (o plano lê `round.fimDaLuta`; teste cobre). `main.ts`: `new AudioSys({ rng, sementeVariacao: semente + 6, limitador: <chaves ligadas> })`.
- **T3 (temas)**: `fight.ts` ~270 `audio.startMusic(trilhaDoJogo(a.cfg, regras, ch.chefe?.trilha))` (= `trilhaDaLuta(..., true, trilha)`): **tema do ADVERSÁRIO (`c2`)** em ARCADE, LUTA vs CPU, VERSUS, TREINO e demo
  (spec §3.3, D-C1); espelho = tema do lutador; **ZENON = valsa** (`'chefe'`); `?expansao=4` (`temasMusicais: false`) = música de antes. A fase 2 do chefão segue pelo evento `fase-chefe` -> `musicaDaFase(2)` (intacto).
  `dev-expansao.ts`: `?expansao=1` (dev, tudo liberado) agora também usa os temas (soa como produção); `?expansao=4` continua com a música de antes (fidelidade).
- **Import tardio**: `AudioSys` **não importa mais os temas**; recebe o sequenciador por `registrarMotorDeTemas` (o `temas.ts` se registra ao carregar). `identidade-sonora` (+`data/sons`) e `temas` (+`data/musica`) são **pedaços
  à parte** baixados por `import()` já no boot, em paralelo com as fontes (`Promise.all([carregarFontes(), camadas])`). O carregamento VALIDA os dados: dados inválidos (qualquer erro que não seja `TypeError` de rede)
  **derrubam o boot**; falha de rede num pedaço desliga só aquela chave e o jogo segue com o som/música de antes. No servidor de desenvolvimento os dois carregam sempre.
- **Correções do N3, só no ramo de tema** (as trilhas fixas ficam byte a byte como estavam; `audio.test`, `audio-chefe.test` e `luta-fidelidade` verdes sem `-u`):
  1. 1º passo com folga maior: `FOLGA_PRIMEIRO_PASSO_TEMA = 0,12 s` (as fixas: 0,05) **e** o 1º lote é agendado já dentro do `startMusic` (scheduler síncrono), sem esperar o 1º tique de 25 ms.
  2. `vozFormante` aceita `inicioAbs` (instante absoluto); `tocarReceita` o usa quando há `inicio` (só o caminho da música). Acaba o atraso de até 18,7 ms a 4x do khöömei do BAATAR. Os efeitos seguem com `when` relativo.
- **Desbloqueio de áudio no iOS** (`src/platform/audio-desbloqueio.ts`, ligado em `main.ts`): o toque no canvas é tratado em `touchstart` com `preventDefault` (o que também suprime o `click`), e o WebKit **não** destrava o
  `AudioContext` em `touchstart`. Agora `touchend`/`pointerup`/`mouseup`/`click`/`keydown` chamam `init()`+`resume()` enquanto o contexto não está `running`. `AudioSys.resume()` passa a religar também o estado
  **`interrupted`** do iOS (ligação, volta do segundo plano). `iniciarAudio` da cena de abertura continua valendo.
- **Painel `?escuta=1`** (`src/ui/escuta.ts`, pedaço à parte; o jogo não roda): os 10 lutadores; por lutador: Kiai, dano leve/pesado, guarda quebrada, KO, vitória, esforço (armadura), cada especial (sequência, início,
  lançamento, impacto por nível/acerto, dreno, contra-especial, sucesso, resposta do FOUETTÉ, carga, rebote, defesa), troca de ficha, **tema fase 1, fase 2 direto e "trocar para a fase 2 ao vivo"**, música de antes
  (`fight`, `menu`; o ZENON: valsa f1/f2). Caixa "comparar com o som/música de ANTES". Volumes. Teclado: setas trocam o lutador, 1-7 vozes, 8 tema f1, 9 tema f2, `-` fase 2 ao vivo, 0/Esc para, Q-P a sequência de
  cada especial. Alvos de toque >= 44 px (medido no Chromium em 390x844, 844x390 e 1280x720: sem estouro lateral). Cada botão monta o MESMO evento de luta e o entrega a `reagirComIdentidade`.

## Números medidos

| Item | Valor |
|---|---|
| Pacote principal | HEAD `64f2647`: **339,53 kB** (gzip 119,53). Agora: **318,04 kB** (gzip 113,96) + pedaços `identidade-sonora` 33,97 kB (gzip 10,53) + `temas` 31,23 kB (gzip 9,93) + `escuta` 9,95 kB (só no `?escuta=1`). Com tudo ligado o download total é **383,2 kB** (+43,7 kB; gzip 134,4, +14,9). O ganho de -31,6 kB do pacote principal vale só para quem desligar as chaves por código |
| Agendamento da música (Node), critério RELATIVO à `fight` | p99 do tick de cada tema (melhor de 3 execuções) / p99 da `fight` (mediana de 5): 0,14 a 1,04 x, limite 1,25 x (1,35 x fase 2) + 0,05 ms. Determinístico (sem relógio): nós/s 0,43 a 0,89 x a `fight` na fase 1 e 1,03 a 1,25 x na fase 2; fontes novas por passo <= 8; ativas <= 15 |
| Plano de um evento | p99 0,007 ms (<= p99 do tick da `fight` + 0,05 ms); evento inteiro (plano + grafo, pior caso) p99 ~0,11 ms (<= 10 x o tick da `fight`) |
| Tudo ligado (tema CAIO fase 1 + pacote de eventos a cada 0,4 s: especial + 2 danos pesados + impacto + guarda quebrada), Node | fontes totais no pico **35** (antes, `fight` + genéricos: 30); efeitos <= 32 (o teto vale); **nós/s 1,75 x o de antes** (a voz tem ~15 nós e o genérico ~3). É um estresse (2,5 pacotes/s), não o jogo normal |
| Antes do corte N3 (referência da Íris) | atraso do passo 0 a 4x: 35-121 ms em 38/40 partidas, causado pelo `nextTime = currentTime + 0,05` (a `fight` também). Agora o tema tem folga 0,12 s e 1º lote síncrono: **não medido de novo no Chromium com CPU 4x** (a Íris) |

## Aceite

| Item | Resultado |
|---|---|
| `tsc` | limpo |
| `vitest run` sem `-u` | 95 arquivos passam, **2173 testes**; 7 arquivos pulados (diagnósticos) |
| `luta-fidelidade`, snapshots, `audio.test`, `audio-chefe.test` | verdes **sem `-u`**: a identidade e os temas são uma camada posterior; `init()` e as trilhas fixas não mudaram; nenhum oráculo do protótipo foi alterado |
| `npm run build` | passa (158 módulos) |
| `git diff src/fight` | **vazio** |
| Chromium real (build + dev), scratch, não é e2e | jogo normal sem `?` carrega os 2 pedaços e **não precisa de nada na URL**; `?escuta=1` sem erro de console; clique e toque destravam o contexto (`running`), luta HAYATO x CAIO toca `tema:caio`, `limitador: true`, especial do HAYATO acerta e cria as gargantas de voz, 0 erros |
| e2e | **não rodado** (a Íris) |
| iOS / WebKit | **NÃO testado**: não há WebKit na máquina. Ver pendências |

## Testes alterados conscientemente (sem `-u`)

- `sons-s1.test.ts`: a chave está LIGADA por padrão; a comparação "igual a `reagirAosEventos`" passa `ligada=false` explícito.
- `musica-sequenciador.test.ts`: o padrão da chave é ligado (`tema:<c2>`); rollback e `temasMusicais:false` devolvem `fight`/`chefe`; o instante do passo 0 vem de `passos[0]` (já agendado no `startMusic`); a voz recebe `inicioAbs`.
- `musica-troca.test.ts`: registra o motor de temas (`import '../../src/audio/temas'`) e usa o instante do 1º passo.
- `tests/support/orcamento-musica.ts`: o passo de cada fonte sai dos instantes reais dos passos (a fase 2 muda a duração do passo no meio da medida); `p99DaFight()`, `menorP99()`.
- **Critério de agendamento relativo à `fight`** (`musica-orcamento` e `sons-integracao`) em vez de `p99 < 1 ms` absoluto: o relógio de um tick em Node varia 5x entre execuções, então a referência é a mediana de 5 execuções da `fight` e o tema usa o melhor de 3.
- Novos: `sons-temas-ligacao.test.ts` (chaves, import tardio por varredura de texto, rollback por código, 1º passo, `inicioAbs`, desbloqueio iOS), `cena-luta-sons-temas.test.ts` (a cena: tema do adversário, abertura da tarja e sessão calam; rollback), e o estresse "tudo ligado" em `sons-integracao`.

## PARA O PRÓXIMO

- **Íris**: (1) e2e de build e de dev (a luta agora usa `tema:<c2>`; `?expansao=1` também); (2) N3 de novo no Chromium: p99 do `scheduler()` com CPU 4x e o atraso do passo 0 depois da folga/1º lote síncrono (esperado 0 atraso), com a identidade ligada e o pacote de eventos; (3) o clique/toque que destrava o áudio no 1º gesto; (4) as ressalvas já aceitas pelo dono (R6 com P, piso R7, pico).
- **O dono ouvir**: abrir `/?escuta=1` (PC ou celular): lutador por lutador, com a caixa de comparação "ANTES". O jogo normal já toca tudo.
- **Alexandria**: `docs/como-adicionar-um-lutador.md` (seções "sons" e "tema"); dizer que as duas camadas são lazy e validam no boot; `?sons`/`?temas` não existem mais.
- **Órion**: sem rede/armazenamento novos; o painel usa só DOM e `textContent` (nenhum `innerHTML`); `Math.random` segue proibido em `src/audio` e `src/data/sons|musica`.
- **Lyra**: a tela de Opções não ganhou nada (de propósito). O painel `?escuta=1` é independente do jogo.

## PENDÊNCIAS

- **iPhone (WebKit, o aparelho do dono) NÃO foi medido nem ouvido.** O que está provado só por lógica e teste: o contexto destrava em `touchend`/`click`/tecla (teste com alvo falso), `interrupted` é religado, o teto de 32 fontes dos efeitos é do código (vale em qualquer motor) e o limitador é um `DynamicsCompressor` nativo. O que **só o aparelho prova**: se o 1º toque realmente destrava no Safari/Chrome do iOS; se o p99 do agendamento aguenta no CPU do iPhone (a medida de referência é a `fight` de hoje, e o tema custa 0,43 a 0,89 x dela; a identidade em estresse custa 1,75 x os nós de antes); se a voz formante (serra + 3 passa-bandas + coro, ~15 nós) não engasga em rajada. **Chave do silencioso do iPhone**: o Web Audio é mudo com o interruptor lateral de toque em silencioso (comportamento do iOS, vale para o jogo desde sempre); não contornei.
- Os 31,6 kB que o pacote principal ganharia com tudo desligado já não valem como ganho de produção (tudo ligado baixa os pedaços no boot). O boot agora espera os dois pedaços (em paralelo com as fontes).
- Escuta do dono (S5/T4): os testes provam que os sons e temas são **diferentes e cabem no orçamento**, não que são bonitos (o handoff de temas e o de sons listam o que só a escuta prova).
- Decisões de régua já aceitas pelo dono: R6 de voz com `P` (10/180 acima de 0,4), piso do R7 (0,14 a 0,29) e pico de planos > 0,7 (14 especiais e o KO da MIN-JI). Registrar no PROGRESSO.md (Atlas).
- Nada commitado.

## APRENDIZADO

- Um `AudioSys` que importa os dados pesados só para tocá-los acopla o pacote principal a eles: o registro por efeito colateral (`registrarMotorDeTemas`) mantém o `import type` e deixa o `import()` do chunk valer. Garantir com um teste de **varredura de texto** (imports de valor) que ninguém volta a importar estático.
- Agendar o 1º passo dentro do `startMusic` muda o que `audio.nextTime` significa para quem mede: harnesses e testes devem ler os instantes reais dos passos (espiar `playTema`), não o `nextTime` depois do start.
- Medir tempo de tick em Node não dá para comparar com um absoluto nem com UMA medida da `fight` (varia 5x por JIT/GC): referência = mediana de N, candidato = melhor de M, mais um piso de ruído; o critério forte é o determinístico (nós por segundo e fontes por passo).
- iOS/WebKit: `touchstart` não destrava o `AudioContext` e `preventDefault` nele suprime o `click`; é preciso `touchend`/`click`/tecla chamando `resume()`, e o estado `interrupted` também precisa de `resume()`.
- Erro de validação no `import()` tardio não pode ser engolido como "falha de rede": só `TypeError` (rede/módulo) cai no rollback; qualquer outro erro derruba o boot.
