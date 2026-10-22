# Handoff da Vega: temas musicais por lutador, T0 a T2

Missão `cmvipzcfb00s101p7x5e5bi0p`. Base HEAD `a6227d5`. Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §3 (capítulo C). **Nada commitado.**
Entrega: T0 (régua musical calibrada e congelada), T1 (sequenciador puro e `playTema`), T2 (os 9 temas em dados; o ZENON mantém a valsa). **T3 (ligação em `fight.ts`/`select`)
NÃO foi feita** e `TEMAS_POR_LUTADOR = false`: o jogo toca exatamente a música de hoje. Ninguém chama `trilhaDaLuta` ainda; `Regras.temasMusicais` não foi tocado.

## RESULTADO

**T0, a régua** (`tests/support/regua-musica.ts`, `musica-medida.ts`, `render-musica.ts`; teste `tests/unit/musica-regua.test.ts`; congelada em 2026-10-21 com os números no cabeçalho)
- `dM` (trigramas de intervalos do lead + conjunto de notas relativo à tônica), `dR` (cosseno dos ataques na grade de 240, σ = 2, + razão de bpm + pulsos), `dT` (a régua `S` da S0, congelada,
  num compasso de cada pista, lead / baixo / perc, no renderizador de referência).
- As 3 trilhas de hoje são **gravadas do `AudioSys` real** (`playStep`/`playMenu`/`playChefe` com `tone`/`noise` espiados) e cada chamada é classificada em pista por assinatura; chamada sem
  classe lança. Nada de transcrição à mão.
- Controles negativos (12 = 4 por trilha): transposto +5 st, andamento x1,05, uma nota trocada (a 10ª, +2 st), lead uma oitava acima. Positivos: fight x menu, fight x chefe, menu x chefe.
- Brutos: negativos `dM` até 0,174, `dR` até 0,116, `dT` até 0,472; positivos 0,50 / 0,39 / 3,82 (fight x menu), 0,75 / 0,72 / 4,74 (fight x chefe), 0,74 / 0,78 / 5,36 (menu x chefe).
- **Limiares congelados: τM 0,4825, τR 0,3482, τT 3,413.** Normalizados: negativos todos < 0,36 (dimensão e D); positivos com as **3 dimensões >= 1,0** nos três (menor 1,04) e D de 1,89 a 3,13.
- Regra do limiar (decisão 6 do cabeçalho): a 1ª tentativa (margem 1,25 por dimensão) deixou D = 0,45 nos controles de andamento (dR e dT sobem juntos), contra o "< 0,4" da spec. Foi trocada,
  **antes de existir qualquer tema novo**, pela de maior margem mínima (`escolherTau`: folga dos negativos 1,106, dos positivos 1,111). Está escrito no cabeçalho do arquivo.
- Decisão de desenho antes de medir: **`dT` normaliza a altura** (cada chamada afinada é dobrada para a mesma oitava de referência da pista, mantendo a classe de altura relativa à tônica). Sem isso
  "transposto +5 st" e "lead uma oitava acima" dariam `dT` >> 0,4, porque o MFCC e o brilho dependem do registro. Consequência honesta: esses dois controles dão `dT` = 0 por construção (só
  testam `dM` de verdade). Número informativo sem dobrar (chefe): transposto +5 st = 0,83 (0,24 normalizado), lead 8ª acima = 1,26 (0,37).
- O renderizador por chamada (overlap-add) é conferido contra o render direto do `AudioSys` (`tests/unit/musica-render.test.ts`, diferença < 1 % do pico).

**T1, o sequenciador** (`src/audio/partitura.ts`, `src/audio/temas.ts`, `src/audio/audio-sys.ts`, `src/audio/receitas.ts`)
- `partituraDoPasso(tema, passo, laco, fase)` pura: devolve sempre o mesmo array (mesmo objeto) e, recompilando uma cópia do dado, o mesmo conteúdo. 3 variantes de laço (0 = com a abertura de 2 compassos
  sem lead; 1 = ímpar, lead uma oitava acima ou outro instrumento; 2 = par a partir do 2º) x 2 fases, compiladas uma vez; as pistas fixas (baixo, acorde, percussão) são compartilhadas entre as variantes.
- `partituraDaTroca(tema)`: o trecho de troca de fase (1 a 6 eventos). `AudioSys.playTema(tema, passo, t)` e o ramo `schedulerTema` (um `if` no topo do `scheduler`; `playStep`/`playMenu`/`playChefe`/`init` intactos).
  A fase 2 só vira no início do compasso seguinte e **o trecho de troca toca uma vez** nesse instante (teste com `tocarReceita` espiado).
- `OpcoesReceita += { destino?: 'sfx' | 'musica'; inicio?: number; agora?: number }` e `ChamadaReceita` 'T' ganhou `Q?`; `OpcoesVozFormante += registrar?: boolean` (a voz da música não gasta o teto de 32 fontes).
  Tudo aditivo: sem as opções novas o comportamento é o de sempre.
- `TrilhaMusica = 'fight' | 'menu' | 'chefe' | \`tema:${IdTema}\`` (sem o `zenon`, que não tem `TemaDef`). `trilhaDaLuta(cfg, regras, chave = TEMAS_POR_LUTADOR, trilhaDoChefe?)` pura, com a tabela da spec §3.3.
- `startMusic` do mesmo tema não reinicia (o continue da luta), como hoje.

**T2, os 9 temas** (`src/data/musica/**`; validação em `exigirTemasValidos`, no carregamento do módulo)
- `TEMAS: Record<IdLutador, TemaDef | 'chefe'>`: lutador sem tema não compila e, em tempo de execução, derruba o boot. Valida notação, escala (crescente, 5 a 7 notas, **escalas e tônicas todas diferentes, inclusive da valsa**),
  compasso, andamento, laço de 10 a 21 s, emenda do laço (última nota do lead a <= 7 st da primeira), instrumentos (frequência, volume, duração, Q), percussão e fase 2.
- Notação por strings de graus da escala (nota fora da escala não existe por construção); `data/musica` não importa `audio/`.
- Orçamento de fontes também no carregamento (`validarOrcamentoDosTemas`, ~40 ms): compilar os 9 temas custa ~50 ms e guarda ~21 mil chamadas (objetos compartilhados entre as variantes). Medido em Node, não no celular.

## Números (todos impressos pelos testes; `npx vitest run tests/unit/musica-*.test.ts --silent=false`)

**Distinção, 65 pares com a régua congelada** (critério: 2 de 3 dimensões >= 1,0 e D >= 1,2): **65 de 65 passam.**

| Pior par | dM | dR | dT | D | dimensões >= 1,0 |
|---|---|---|---|---|---|
| AMINU x BAATAR (o mais próximo dos 45) | 1,02 | 0,39 | 1,12 | **1,56** | 2 |
| MIN-JI x AMINU | 0,98 | 1,23 | 1,03 | 1,88 | 2 |
| CAIO x AMINU | 1,36 | 1,03 | 1,03 | 1,99 | 3 |
| WEI LONG x MIN-JI | 1,56 | 1,04 | 0,77 | 2,02 | 2 |
| legado: MIN-JI x menu (o mais próximo dos 20) | 1,38 | 1,05 | 0,82 | 1,92 | 2 |
| legado: HAYATO x fight | 1,61 | 0,40 | 1,03 | 1,96 | 2 |

Mínimos por dimensão nos 45: dM 0,98, dR 0,39, dT 0,70. D mínimo 1,56. Em 9 pares só 2 das 3 dimensões passam de 1,0 (é o que a spec pede). A matriz 10 x 10 sai no teste.
Contra o ZENON (a valsa de hoje) o menor D é 2,7 (HAYATO e CAIO).

**Mixagem** (laço inteiro, renderizador de referência, contra a `fight`: RMS -28,90 dB, pico no barramento 0,93):

| | RMS | faixa da voz (300-3000 Hz) | grave (< 120 Hz) | pico |
|---|---|---|---|---|
| spec | ±1,5 dB | <= +1 dB | <= +2 dB | <= 0,5 |
| 9 temas, laços 1 e 2 | -1,39 a +0,59 | -10,4 a +0,6 | -14,3 a +1,7 | 0,38 a 0,66 |
| fase 2 (só no chefão) | -1,18 a +1,75 | -8,4 a +0,5 | +1,6 a +4,0 | 0,42 a 0,79 |

- **Pico <= 0,5 NÃO é cumprido por todos**: CAMILLE (0,38) e BAATAR (0,45) cumprem nos dois laços; CENTELLA e NILA em um dos dois; HAYATO 0,52/0,60, WEI LONG 0,61/0,53, MIN-JI 0,59/0,53, CAIO 0,66/0,62,
  AMINU 0,62/0,59. **A própria `fight` de hoje tem 0,93**: o `tone()` decai exponencialmente, então RMS igual ao da `fight` e pico de 0,5 só cabem juntos com um fundo sustentado (a decisão é da Nova: aceitar
  "abaixo da `fight`", ou baixar o RMS-alvo). O teste impõe <= 0,70 e abaixo da `fight`.
- A fase 2 cumpre RMS, voz e pico com folga, mas o **grave passa de +2 dB (até +4,0)**: o baixo uma oitava abaixo cai na faixa de grave por física. Os limites da fase 2 no teste são RMS -1,5 a +2,5, voz <= +1, grave <= +4, pico <= 0,8.
- Como: `mix` por pista (a mesa de som, `lead/baixo/perc`) e `fase2.mix`, achados por busca (`tests/unit/musica-calibra-diag.test.ts`, `MUSICA_DIAG=1`) e conferidos no render real. O `mix` fica perto de 1 (0,56 a 1,78; `fase2.mix` de 0,45 a 1,88).

**Orçamento de CPU, relativo à `fight` medido** (scheduler real sobre o mini motor em Node): a `fight` tem **8 fontes novas no passo 0, 12 ativas** (a leitura do código dava 23: era erro; o teto de ativas é 1,25 x 12 = 15),
80 nós/s e tick p99 0,07 a 0,13 ms.
- Temas, fase 1: 5 a 6 fontes novas por passo, 8 a 11 ativas, 0,43 a 0,90 x a `fight` em nós/s, tick p99 <= 0,064 ms. Fase 2: 7 a 8 novas, 11 a 14 ativas (estático, incluindo o trecho de troca no pior compasso: <= 15), 0,64 a 1,25 x
  a `fight` (CAIO é o mais denso). A música tem 0 fontes no teto dos 32 efeitos (BAATAR incluído). 1 `vozFormante` por compasso, em nota longa (8 passos).
- Para caber, **cortei camadas dos instrumentos** (no máximo 2 por nota, 1 na percussão) e encurtei durações; é a causa de vários desvios abaixo.

**Laço sem emenda**: a energia de uma janela de 200 ms na emenda fica dentro (±3 dB) da dos 15 limites internos de compasso em todos os 9 temas; todos os intervalos de passo são iguais na volta do laço.

## Desvios da spec §3.4 (para a Nova, o Apolo e o dono saberem)

1. **MIN-JI a 120 bpm (♩.), não 108**: com 108 o par WEI LONG x MIN-JI ficava com 1 dimensão >= 1,0 (as duas são pentatônicas lentas com arco). Laço de 16,0 s em vez de 17,8 s. Os outros 8 andamentos, compassos, passos e laços batem com a spec.
2. **Vibrato, gamaka e o filtro do trompete são aproximações**: o `tone()` não tem vibrato nem filtro que abre no ataque (o trompete da CENTELLA tem passa-baixa fixo). Erhu, haegeum e morin khuur usam duas camadas desafinadas (batimento) em vez de vibrato de 5 Hz; o gamaka do venu e o deslize do erhu são um portamento de 1 st que dura a nota inteira.
3. **Sem `ko` do HAYATO**; o khöömei do BAATAR tem 1 fonte (sem coro) por causa do orçamento; os trompetes da CENTELLA em terças são a `paralela` do lead (uma 2ª voz); o violão do CAIO, a vihuela da CENTELLA e a guitarra em la pompe da CAMILLE tocam quinta aberta (2 sons), não acorde de 3; a algaita e o sino-guia do AMINU, o shamisen etc. têm 1 a 2 camadas (a spec sugeria 2 a 3).
4. **Fase 2**: andamento +8 % em todos; em **CAIO, AMINU, CENTELLA e CAMILLE o baixo não desce outra oitava** (`baixoOitava: 0`): o baixo deles já está duas oitavas abaixo do lead (por causa da faixa da voz) e mais uma oitava vira ~50 Hz.
   O trecho de troca começa um passo depois do início do compasso em CAIO, NILA e BAATAR (o passo 0 já está cheio no orçamento).
5. O baixo tem ataque de 60 ms (não é seco): é o que tirou o pico (o bumbo e o baixo no mesmo instante somavam).
6. `TrilhaMusica` não tem `tema:zenon`; o ZENON usa `'chefe'` (a valsa, a fixture do oráculo, não foi reescrita).

## PARA O PRÓXIMO

- **T3 (Vega, depois da Lyra, mesmo arquivo da S4 dos sons)**: em `src/ui/cenas/fight.ts:~267` trocar `audio.startMusic(a.cfg.chefe ? (...trilha ?? 'fight') : 'fight')` por
  `audio.startMusic(trilhaDaLuta(a.cfg, this.ui.c.regras, TEMAS_POR_LUTADOR, this.ui.m.elenco[a.cfg.c2].ch.chefe?.trilha))` (importar de `../../audio`). `musicaDaFase(2)` e o evento `fase-chefe` já existem e não mudam.
  `TEMAS_POR_LUTADOR` só vira `true` depois da escuta do dono. Com a chave desligada o resultado é idêntico ao de hoje (`trilhaDaLuta` devolve `'fight'`/`'chefe'`).
- **Íris**: (1) N3 no Chromium com CPU 4x, 60 s por tema: 0 atraso do agendador e p99 do `scheduler()` < 1 ms (aqui só o mini motor em Node); (2) o renderizador de referência é um modelo (PolyBLEP, biquad a cada 8 amostras):
  confrontar um compasso de 2 temas no Chromium (`OfflineAudioContext`) com o do mini motor; (3) **confirmar as decisões da régua musical** (o registro está no cabeçalho de `tests/support/regua-musica.ts`).
- **Apolo**: revisão cultural dos 9 temas (escalas e instrumentos estão em dados; nada religioso; os nomes dos temas em `nome` são provisórios: "Lâmina e Cerejeira", "O Dragão Calmo", "Jajinmori", "São Bento Grande", "A Algaita Chama", "Sesquiáltera", "Musette de Meia-Noite", "Hindolam", "Galope na Estepe").
- **Alexandria (D1)**: `docs/como-adicionar-um-lutador.md` ganha a seção "tema": `TemaDef` em `src/data/musica/temas/<id>.ts` + registrar em `temas.ts`; o boot reprova se faltar, se a escala/tônica repetir ou se estourar 8 fontes por passo / 15 ativas.
- **Órion**: nada de superfície nova (sem rede, sem armazenamento, sem entrada externa). `Math.random`, `Date` e `performance` proibidos em `src/audio/**` e `src/data/musica/**` (teste de texto).
- Atlas: **registrar no PROGRESSO.md o congelamento da régua musical** (τ e controles) e a decisão sobre o pico de 0,5 (acima).

## O que SÓ a escuta do dono prova

Os testes provam que os temas são **diferentes** (escala, ritmo, timbre), que cabem no orçamento e que o volume é parecido com o da `fight`. **Não provam**:
- que são **bonitos** nem que **não soam caricatos** (risco R9 da spec); a melodia foi escrita à mão sobre as sementes da spec e nunca foi ouvida por ninguém;
- que o **lead está audível**: a mixagem pela spec (voz <= +1 dB, grave <= +2 dB, RMS igual) deixou o baixo como a maior parte da energia; se o dono achar a melodia baixa, o ajuste é o `mix.lead` do tema, mas isso sobe a faixa da voz, que tem de 0 a 10 dB de folga conforme o tema (CAIO, MIN-JI e WEI LONG já estão no limite dos +1 dB da spec: ali a melodia só sobe se o dono abrir mão dessa regra);
- que **vibrato, gamaka, "sawari" e o portamento do erhu** parecem os instrumentos reais (são aproximações do item 2); que o **khöömei** (uma `vozFormante`) não soa como zumbido;
- que a **troca de fase** "vira" a música de forma perceptível (o impacto e a subida são curtos e baixos);
- que o **laço ímpar** (lead outra oitava ou outro instrumento) agrada, e que a abertura de 2 compassos sem lead cobre a fala da entrada;
- o desempenho no **celular de verdade** e no Chromium com CPU 4x (aqui é o mini motor em Node).

## PENDÊNCIAS

- T3, S4 dos sons, Q (Íris), A1/revisão do Apolo, D1 (Alexandria), escuta do dono e `TEMAS_POR_LUTADOR = true`.
- Decisão da Nova: pico <= 0,5 (a `fight` não cumpre) e grave da fase 2 (+4 dB).
- `tests/unit/musica-calibra-diag.test.ts` é ferramenta de autoria (desligada sem `MUSICA_DIAG=1`; aparece como arquivo pulado).
- Defeito do mini motor `audio-offline.ts` (não corrigido: a régua está congelada): se o início de um oscilador cai a menos de 5e-11 s ANTES de um quadro (ex. 1,2000000000000002 s), o motor começa o oscilador
  nesse quadro mas o ganho ainda vale o padrão 1, e sai um estalo de 1 amostra. Só afeta renders diretos com tempos nessa borda; o renderizador por chamada (início em 0) não tem.
- Falhas de `tsc` de outras frentes que apareceram e sumiram durante a sessão (`tests/unit/l1e1-chefoes.test.ts`, Lyra); no fim o `tsc` está limpo.

## Aceite

| Item | Resultado |
|---|---|
| `tsc` | limpo |
| `vitest run` (suíte inteira, sem `-u`) | **92 arquivos passam, 2 126 testes**; 7 arquivos pulados de propósito (diagnósticos desligados, inclusive `musica-calibra-diag`) |
| `audio.test`, `audio-chefe.test`, `luta-fidelidade` sem `-u` | verdes (39 testes) |
| `npm run build` | passa (142 módulos, 339,5 kB; os temas entram no pacote porque o `audio-sys` os importa; o acréscimo não foi medido isolado) |
| `git diff src/fight` | **vazio** |
| e2e | não rodado (pedido) |

## Arquivos

Novos: `src/audio/partitura.ts`, `src/audio/temas.ts`, `src/data/musica/{ajudantes,index,notacao,temas,tipos,validar}.ts`, `src/data/musica/temas/{hayato,wei-long,min-ji,caio,aminu,centella,camille,nila,baatar}.ts`,
`tests/support/{espectro,musica-medida,musica-tema,orcamento-musica,regua-musica,render-musica}.ts`,
`tests/unit/{musica-regua,musica-render,musica-sequenciador,musica-troca,musica-temas,musica-mix,musica-orcamento,musica-calibra-diag}.test.ts`, este handoff.
Alterados (aditivo): `src/audio/audio-sys.ts`, `src/audio/receitas.ts`, `src/audio/index.ts`. Nenhum arquivo de `src/fight`, `src/ui`, `src/render`, `src/meta` foi tocado.

## APRENDIZADO

- Regra de limiar escolhida antes de medir pode ainda falhar no critério da spec (D dos controles de andamento): trocá-la **antes de existir som novo** é legítimo; depois não. Escrever no cabeçalho o histórico da regra.
- Um critério que mede o que a música É (timbre) precisa tirar o que ela PODE MUDAR sem virar outra música (altura e oitava): sem dobrar a altura, os controles negativos do próprio spec reprovariam a régua.
- `tone()` decai exponencialmente por nota inteira: RMS de uma trilha só se consegue com volume de pico ou com muitas notas sobrepostas. Tirar o pico: ataque de 60 ms no baixo (o bumbo e o baixo no mesmo instante somavam) valeu mais que qualquer ganho.
- Orçamento por passo/ativas é o que mais corta composição: contar no estático (tabelas compiladas) e conferir no scheduler real, e contar o trecho de troca no pior compasso, senão ele estoura depois.
- O pico de fontes ativas da `fight` (12) não era o que a leitura do código sugeria (23): medir no scheduler real antes de fixar o teto.
- Heredoc com aspas e Python no Windows: usar a ferramenta de escrita para arquivos com `'` e `\`; caminhos do Python não aceitam `/c/...` (usar relativos ao projeto).
