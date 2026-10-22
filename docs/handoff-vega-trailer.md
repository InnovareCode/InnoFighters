# Handoff da Vega: trailer de abertura, T0 a T3

Spec: `docs/spec-trailer-abertura.md`. Decisões do dono: as recomendações D-T1..D-T8, com UMA exceção: **não existe a opção ABERTURA nas Opções** (o trailer toca sempre depois do boot, mais o modo atrair após 30 s no título, e pula por qualquer toque ou tecla). Nada foi commitado. `git diff src/fight` está vazio; não toquei em `src/ui`, `src/render`, `src/main.ts` nem nas Opções.

## RESULTADO

Níveis de prova: *teste unitário* (fixtures minhas, mas o elenco é o de produção), *rodado com a coisa real* (Vite SSR + Chromium via Playwright) e *não executei* quando for o caso.

### T0, base de desempenho e validação dos dados
- `npm run trailer:medir` (`ferramentas/trailer/medir.mjs`): mede o quadro de uma cena no Chromium com CPU estrangulada (`Emulation.setCPUThrottlingRate`), em dois modos (custo `update+draw` na thread principal; intervalo entre `requestAnimationFrame`). Serve para a luta (`--cena fight`) e, quando a Lyra existir, para o trailer (`--cena trailer`, ou `--prep "<js>"`). Opções: `--taxas`, `--quadros`, `--rodadas`, `--lutas a:b,c:d`, `--canvas acelerado|cpu`, `--decode`, `--so-decode`, `--gravar-base`, `--saida`. Tem prazo por avaliação (a página travou uma vez e a ferramenta ficou parada).
- **Base gravada** em `ferramentas/trailer/base-desempenho.json` (rodado, Chromium 156 headless, canvas acelerado = `--enable-gpu-rasterization --use-angle=swiftshader`, 2 rodadas x 300 quadros após 120 de aquecimento, **máquina compartilhada**, CPU 4x):

| Luta CPU x CPU (DIFÍCIL, esquiva) | custo p95 (4x) | custo mediana | custo p99 | quadros > 33 ms | intervalo p95 (4x) |
|---|---|---|---|---|---|
| HAYATO x MIN-JI | 14,7 ms | 6,7 ms | 37,6 ms | 3 | 50,0 ms |
| CAIO x WEI LONG (atlas originais, a mais pesada) | 21,0 ms | 6,9 ms | 31,6 ms | 1 | 33,4 ms |

  A 1x: custo p95 1,2 e 3,2 ms; intervalo p95 16,8 ms nas duas (60 fps). **Limite do trailer = 1,15 x o p95 da pior luta: custo 24,15 ms** (4x). Use o **custo**: o intervalo a 4x tem travadas de ambiente (26 e 15 quadros > 33 ms em 300) e o limite de 57,5 ms que sai dele não é confiável. **Meça luta e trailer na MESMA rodada** (a razão vale, o número absoluto não é de aparelho).
- **`decode()`: inconclusivo, recomendo NÃO adotar por enquanto.** 1º `drawImage` de um atlas 2048x1920 (ZENON), Chromium, mediana de 6: a 1x 92 ms sem e 101 ms com `decode()`; a 4x 494 ms sem e 566 ms com. O `decode()` não ajuda no Chromium (o custo está no envio e rasterização, não na decodificação). **WebKit/iPhone não foi medido**, que é onde importaria. A primeira rodada de `--decode` (junto do `--gravar-base`) ficou inválida a 4x por reaproveitar o cache de imagem; corrigi com um sal na URL (`--so-decode` repete só isto).
- **µs por tick do `Game`**: a medida da spec (5 a 12 µs no Node) continua valendo. A escalação simula ~1 800 updates por (semente, CPU) e fez 1 800 simulações por plano em ~15 s por plano; não medi o `Game` dentro do Chromium a 4x (não executei).
- **Validação**: `src/data/trailer/validar.ts` (`validarRoteiro` / `exigirRoteiroValido`). Confere: ordem e soma de 25 compassos e 2400 ticks, tomada por plano de luta, batidas gravadas coerentes com o pedido, `inicio` <= 2400, títulos <= 18 caracteres em caixa alta, placa <= 90 ticks, zoom em 1..1,35, troca de foco em múltiplo de 24, cobertura dos 10 lutadores, `DESTAQUE` em campo, <= 3 flashes em 60 ticks e exatamente 1 flash de tela cheia, versão estática <= 600 ticks. `src/data/trailer/index.ts` valida ao importar (lança se inválido, para a cena cair na `CenaIntro`).

### T1, dados e diretor
- Dados: `src/data/trailer/{tipos,roteiro,tomadas,textos,curvas,validar,abertura,index}.ts`. 14 planos, 25 compassos, 2400 ticks a 150 BPM, 1 tempo = 24 ticks. `tomadas.ts` é GERADO. `textos.ts` tem os títulos e as placas em pt-BR (rascunho, o Apolo revisa). `curvas.ts` tem as funções puras de letterbox, flash, câmera, raio do P0, retratos e braseiros do P9.
- `DiretorDoTrailer` (`src/trailer/diretor.ts`): puro, estado como função do tick, no máximo 2 `Game` vivos, semente = a da tomada (constante), motor sempre com `shake: true`, câmera lenta e tarja só nas batidas marcadas, batida que não veio = segue sem tarja e sem câmera lenta, plano que não ficou pronto ou sem arte = cartão de reserva (a duração não muda). Montagem da partida única em `partida.ts`; câmera lenta e congelamento em `ritmo.ts` (a mesma máquina roda na escalação).
- Também entreguei `carga.ts` (`planoDeCarga`, `residentesNoPlano`, `pedidosNoPlano`: a tabela da spec §5.2 sai do roteiro), `relogio.ts` (`tickAlvoDoAudio`, `ticksAAvancar`, `entradaDaMusica`), `estatica.ts` (`quadroEstaticoNoTick`, 6 quadros x 96 = 576 ticks) e `marca.ts` (interface `Marca`, mesma assinatura de `desenharLogo`/`desenharEmblema` de `src/ui/logo.ts`).

### T2, escalação e isolamento
- `npm run trailer:escalar` (`ferramentas/trailer/{cli.mjs,escalar.ts}`): `--plano`, `--sementes N` (padrão 300), `--inicio-max`, `--niveis`, `--simular`, `--verificar` (o que o CI faz). Cada (semente, CPU) é simulada uma vez, os eventos de cada update são gravados, e para cada `inicio` roda-se a mesma máquina de ritmo do diretor. Recusa tomada com ação rala (mais de 45 updates sem ação, menos de 1 acerto por 40), vida abaixo de 15%, lutador fora de quadro (30..930) e fase diferente de `fight`. Depois, o diretor real roda o trailer inteiro e grava a impressão de cada plano.
- **Tomadas gravadas** (600 sementes x 3 CPUs por plano, 117 s): P1 semente 471 inicio 236; P2 53/601; P3 263/763; P4 373/420; P5 221/240; P6 112/100; P7 313/497; P9 162/239. Todas com os golpes pedidos nos ticks do plano pedidos (P1 96, P2 61 e 140, P3 50, P4 110, P5 141, P6 91, P7 129, P9 172). Quantas simulações tinham todas as batidas: P3 (carga nível 3) 180 de 1800, P5 (COUP D'ARRÊT) 274 de 1800, as outras de 574 a 1578. O maior `inicio` é 763 (a spec permitia 2400). `--verificar` confere as 8 impressões em outro processo.
- **Isso NÃO foi aprovado por olho.** A ferramenta garante que o golpe pedido cai no tempo pedido, não que a tomada é bonita. A prévia `?trailer=Px` é da Lyra.

### T3, música
- `src/audio/abertura.ts` (tipos, `compilarArranjo`, `orcamentoDoArranjo`, `validarArranjo`), `src/data/trailer/abertura.ts` (o arranjo: c# eólio, 6 seções: frio c1-2, quatro c3-8, desafiantes c9-19, montagem c20-21, arconte c22-23, logo c24-25), `src/trailer/musica.ts` (`citacaoDoTema`, `citacaoDaValsa`, `citacoesDoRoteiro`, `arranjoDaAbertura`, `arranjoDaEstatica`).
- **Citação**: os 8 primeiros passos do lead de `TEMAS[id]` (laço par, instrumento de base), transpostos para a tônica da abertura (a oitava cai em MIDI 74..86), tempo reescalado para a grade de 0,1 s; derivada do dado (um teste muda o tema e a citação muda). Nos 8 passos de cada citação o lead e o acorde do arranjo calam. ZENON: as 3 primeiras notas do cravo da valsa (74, 70, 69 nos passos 0, 4 e 6, conferidas com a trilha `chefe` gravada).
- API nova no `AudioSys`, aditiva (`init()`, `sonsDoEvento` e as trilhas não mudaram): `tocarAbertura({ aPartirDoCompasso, arranjo, emSegundos? }): boolean` (false se o contexto não está `running`; nunca chama `resume()`; para a música de menu/luta; efeitos a 60%), `posicaoDaAbertura(): number | null` (segundos desde o compasso 0, no relógio do `AudioContext`), `pararAbertura(fadeSeg = 0.3)`. Nos métodos antigos só mudou `setSfxVol` (multiplica por 1 fora da abertura) e três `export` em `partitura.ts`.
- **Régua**: nenhum limiar mudou (`TAU_MUSICA` 0,4825 / 0,3482 / 3,413, congelado em 2026-10-21 com as 3 trilhas, antes de existir tema ou abertura). Critério idêntico ao dos temas (2 de 3 dimensões >= 1,0 e D >= 1,2) para as 6 seções x 12 referências (9 temas + `fight`, `menu`, `chefe`), medindo um compasso sem citação. Todos passam. Menor margem de dT contra as referências de bpm igual ou próximo: 1,09 (montagem x `fight`), 1,14 (logo x `fight`), 1,15 (arconte x HAYATO). Nota de método: contra o mesmo andamento e pulso (`fight`, 150 [4]) a dR nunca passa de 1/3 < 0,3482, então a abertura depende de dM e dT ali.
- **Orçamento** (mesmo dos temas, medido no arranjo compilado): 8 fontes novas por passo (máx. 8), **15 ativas (máx. 15, no limite)**, 0 vozes. Versão estática: 8 e 14. O agendador de verdade (mini motor offline) roda a abertura inteira sem exceção.
- **Mixagem** contra a `fight` (RMS, voz 300-3000 Hz, grave < 120 Hz, pico no barramento): RMS -1,95 / -0,67 / -0,04 / -2,42 / -1,05 / -2,20 dB nas 6 seções; voz até +0,7 dB; grave de -24 a -11 dB (bem abaixo da `fight`: o baixo da abertura mora em 120-300 Hz); pico 0,36 a 0,73 contra 0,93 da `fight`.

### Portões (rodei e li a saída)
- `npx tsc --noEmit` — sem erros. `npm run build` — ok, pacote principal 331,19 kB (329,74 antes de eu mexer em `audio-sys`; a diferença de ~1,4 kB inclui outras frentes). O código do trailer ainda não entra no bundle (ninguém o importa).
- `npx vitest run` (suíte inteira, **sem -u**): `Test Files 101 passed | 8 skipped (109)`, `Tests 2331 passed | 11 skipped (2342)`. Entram aí `luta-fidelidade`, `fight.test` (snapshot), `esquiva-cpu` (snapshot) e `audio.test`. Meus: `trailer-diretor` (46), `trailer-musica` (41), `trailer-ferramentas` (8) + `trailer-musica-diag` (só com `TRAILER_DIAG=1`).
- `git diff --stat src/fight` — vazio. Sem `Math.random`/`Date.now`/`new Date`/`performance.now` em `src/trailer`, `src/data/trailer` e `src/audio` (busca estática no teste).
- Determinismo — teste unitário + entre processos: dois diretores dão os mesmos 2400 hashes de quadro; as impressões gravadas pela ferramenta (outro processo) conferem no Vitest e `--verificar` confere de novo.
- Prova por mutação (quebrei de propósito e o teste falhou): trocar o lutador de uma batida (2 falhas), `Math.random` no diretor (2), tirar o silêncio de citação (3), trocar a semente de uma tomada (3). Arquivos restaurados; a suíte final está verde.

## PARA O PRÓXIMO

**Lyra (cena, T4)** — contrato real:
```ts
import { DiretorDoTrailer, ROTEIRO, TOMADAS, quadroEstaticoNoTick, duracaoDaEstatica, arranjoDaAbertura, arranjoDaEstatica,
         tickAlvoDoAudio, ticksAAvancar, entradaDaMusica, planoDeCarga, pedidosNoPlano } from '.../src/trailer';  // import() lazy: valida o roteiro ao carregar
const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores, criarRng });  // lutadores = { [id]: ui.m.elenco[id].ch } (o mesmo objeto que o main.ts passa ao Game); criarRng = o de core/rng, chamado só com as sementes das tomadas
// a cada quadro: d.prerolar(fatia)  (fatia = o que couber em ~2 ms, no mínimo 8; mede com performance.now na CENA, o diretor não mede)
// depois: const q = d.avancar()  ou  d.irPara(tickAlvo)  (irPara junta os eventos dos ticks pulados em q.eventos)
```
- `QuadroDoTrailer` tem: `tick`, `plano` (use `plano.tipo`/`plano.c1`/`plano.stage`), `tickNoPlano`, `compasso`, `tempo`, `luta` (o `Game` VIVO ou null), `eventos` (para `reagirDoJogo` e `Efeitos`), `motorAndou`, `lenta` (fator), `zoom {fator, x}` (vai direto em `OpcoesMundo.zoom`), `letterbox` e `flash` (0..1; faixa = `alturaDoLetterbox(letterbox)` de `curvas.ts`, 69 px), `titulos` (texto, estilo, alfa; a placa traz `lutador` e `subtexto`), `cine` (**só no tick em que a tarja começa**: abra a `Cinematica` com `ev` e `modo`; o motor já fica congelado pelos próximos 20 ticks, a cena NÃO deve chamar nada do motor), `reserva` (desenhe o cartão de reserva: retratos dos dois lutadores sobre `plano.stage`), e por tipo: `frio {pose, raio}` (P0), `retratos {entraram, risco}` (P8, ordem em `plano.ordem`), `arconte {acesos, poses, entrada, tickDaEntrada}` (P9: `OpcoesMundo.acesos`/`poses`; a `EntradaDoChefe` CURTA dura 60 ticks e `tickDaEntrada` conta de 0 a 59), `logo {t, prompt}` (P10; `t` = ticks desde o impacto; `prompt` a partir do c25.1, quando a tecla age como no título). Desenhe com `hud: false`, `overlay: false`.
- Arte: `d.pedidosDeArte()` devolve `{agora, proximo, soltar}`; se a arte de um plano não chegou, chame `d.reservaForcada(id)` **antes do plano começar**. Um atlas por vez (`planoDeCarga`: aminu P0->P3, centella P3->P4, camille P4->P5, nila P5->P6, baatar P6->P7, zenon P8->P9; BAATAR e ZENON nunca juntos).
- Música: `audio.tocarAbertura({ aPartirDoCompasso, arranjo: arranjoDaAbertura(), emSegundos })` com `entradaDaMusica(tick)` (o próximo compasso; a imagem corre no relógio do laço até lá); depois `tickAlvoDoAudio(audio.posicaoDaAbertura())` e `ticksAAvancar(...)` mandam; acima de 6 ticks de atraso, pule sem desenhar. Movimento reduzido: `quadroEstaticoNoTick` + `arranjoDaEstatica()` (6 compassos). Ao pular: `audio.pararAbertura(0.3)`; na aba oculta: `pararAbertura(0)`. A cena precisa parar o trailer e a música ao sair, e nunca chamar `resume()` fora de gesto.
- Marca: o trailer só conhece a interface `Marca` (`src/trailer/marca.ts`); passe `marca` de `src/ui/logo.ts`.
- Cuidados: `q.luta` é o objeto vivo, não o guarde. D-T2 (ZENON em contraluz até ser liberado) é da cena: `PLACAS.zenon` e `NOME_OCULTO` ('???') estão em `textos.ts`; o ZENON só aparece como retrato (P8 não o inclui) e no P9. A tela de chefe do P9 usa `chefe: true` (round único, ficha e IA do chefão). O `Efeitos`/`CampoDePetalas` do trailer devem usar `criarRng(ROTEIRO.sementeVisual)` (constante), não o `rngVisual` da sessão.
- Não existe `Regras.trailer`, nem `?trailer=`, nem o contador do título: tudo da Lyra. Os e2e antigos que esperam `intro` precisam de `?trailer=0` (R1 da spec).

**Íris (T6)** — o que testar: (1) rodar `npm run trailer:medir -- --cena trailer --taxas 4 --modo custo` (precisa da cena) e comparar com `limiteDoTrailerP95Ms.custo` = 24,15 ms em `ferramentas/trailer/base-desempenho.json` (e re-rodar a luta na mesma rodada); (2) teste 8 da spec com `GerenciadorDeArte` e leitor falso (a policy de carga é da cena; a parte pura está em `tests/unit/trailer-diretor.test.ts`); (3) o teste 17 (WebKit, `tocarAbertura` devolvendo false com contexto suspenso: a parte do `AudioSys` está provada com o mini motor, a cena não); (4) pixel (teste 15) e movimento reduzido (16); (5) memória (19). Rode `npm run trailer:escalar -- --verificar` no CI.

**Órion** — pontos de revisão: `audio-sys.ts` (três métodos novos, `setSfxVol`, nenhum `resume()`), `ferramentas/trailer/medir.mjs` (abre navegador e sobe o Vite; só para dev), e o isolamento (nada de `mundo`/RNG da sessão em `src/trailer`).

## PENDÊNCIAS

Dívida técnica / precisa de outros:
- **Cena, `Regras.trailer`, contador do título, `?trailer=`, `#pad` escondido, versão estática desenhada, carga com `GerenciadorDeArte`, e2e**: Lyra e Íris. Não fiz (fora do escopo e dos arquivos permitidos).
- **Aprovação por olho das 8 tomadas** (Apolo/dono) e a **escuta da música** (dono). Os números da música (régua, orçamento, mixagem) provam distância, custo e volume, não que ela é boa.
- **iPhone/WebKit**: nada foi medido ali (desempenho, `decode()`, destravamento de áudio, memória). Sem WebKit na máquina.
- Medição da luta feita em máquina compartilhada, Chromium headless, 2 rodadas: refazer na rodada que medir o trailer.
- O `tickMotor` das tomadas conta updates; se o motor mudar (balanço, CPU, atlas), o teste `trailer-diretor` falha dizendo o plano e `npm run trailer:escalar -- --plano Px` reescala.

Decisão que é do dono/Apolo:
- **P8 (montagem) x "no máximo 2,5 cortes/s"**: 9 retratos em 2 compassos (8 por tempo + o 9º na última colcheia, como a §3.1 manda) dão 4 entradas em 60 ticks no fim, mais que 2,5/s. A spec contradiz a si mesma; implementei a tabela (a validação não impõe o limite de cortes). Se valer o limite, a montagem precisa de 4 compassos ou de menos retratos.
- Textos de `textos.ts` são meus (o Apolo revisa): "QUEM CHEGA AO TOPO" ficou sem as reticências porque a versão da spec tinha 21 caracteres e o teto é 18.
- Cenários dos cartões (C1 `kr`, C2 `cn`, C3 preto) e as câmeras do roteiro são palpite meu.

## APRENDIZADO

Registrado em `.claude/agent-memory/vega/project_trailer_t0_t3.md`. Resumo das causas raiz:
1. Teste que acha "o primeiro evento que casa" mede o golpe errado (um acerto parecido antes da tomada); achar o quadro pelo update gravado. A mesma máquina (`ritmo.ts`) e a mesma montagem (`partida.ts`) para o diretor e para a ferramenta evitam que a tomada escolhida deixe de ser a tocada.
2. `getImageData` no canvas acelerado mede a rasterização do SwiftShader (160 ms) e não a thread principal: não forçar o flush.
3. Régua: contra o mesmo BPM e pulso a dR não chega ao limiar; o timbre (dT) precisa fugir do que os temas fazem. Orçamento de 15 ativas só fecha silenciando lead e acorde nas janelas de citação e encurtando o baixo.
4. Ambiente: arquivos do working tree são CRLF (patches em Python precisam gravar `\r\n`); em heredoc deste shell `\\n` vira quebra real; medir no navegador exige prazo por avaliação e não rodar o Vitest junto.
