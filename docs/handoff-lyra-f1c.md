# Handoff — Lyra — F1c (jogo rodando de ponta a ponta)

Data: 2026-10-20. Sem `git add`/commit/push. Sem dependência nova.

## RESULTADO

O jogo roda completo no navegador: abertura, título, menu, seleção, dificuldade, confronto (VS), luta com CPU,
pausa, resultado, ARCADE (continuar / game over / final com recorde), como jogar e opções. Todas as telas
reproduzem o protótipo (textos, layout, sons de interface, fluxos).

**Arquivos novos (`src/ui/`)**
- `tipos.ts` (NAV, tipos de cena e de argumentos, campanha ARCADE), `contexto.ts` (Contexto, Mundo, Persistencia),
  `ferramentas.ts` (T, arcadeText, panel, wrap, keycap, hint, spotlight... ligados ao contexto 2D),
  `menu-lista.ts` (MenuList), `personagens.ts` (showChar, statBars, miniatura, lista de golpes, SCHEME),
  `logo.ts` (logo, emblema, ciclo de cenários, brasas, fileira de heróis), `navegador.ts` (o `UI` do protótipo:
  fade, tecla -> ação, mouse/toque com as travas do protótipo, pétalas dos menus, startAudio).
- `cenas/`: `boot`, `intro`, `title`, `menu`, `select`, `diff`, `vs`, `fight` (luta + pausa), `how`, `options`,
  `fim` (resultado, continuar, final), `index` (instancia todas).
- Os nomes dos campos das cenas foram mantidos iguais aos do protótipo (S.cur, S.lock, S.tab, S.left...) de
  propósito: o mesmo código de teste roda nos dois lados.

**`src/main.ts` (reescrito)**
- Laço de passo fixo de 60 ticks/s, na ordem: `consultarGamepads()` por quadro; `ui.update()` + `fimDoTick()` por
  tick; `ui.draw()` por quadro. Quadro > 100 ms é cortado. Erro no laço: `console.error` uma vez e segue.
- Dentro da luta (`CenaFight.update`): `game.update(fonte)` -> `reagirAosEventos` (áudio da Vega) ->
  `efeitos.reagir(ev)` por evento -> `efeitos.avancar()` só se `game.tick` mudou (hitstop congela) ->
  pétalas da luta com o `t` de antes do update (como o protótipo).
- Tela de carregamento: `carregarRecursos(planoPadrao(BASE_URL))` com barra de progresso; depois `montarElenco`
  (atlas com nomes LEGADOS via `data/atlas.manifestoParaPoses`, sem conversão duplicada). `data-pronto` no `<html>`
  só quando a arte carregou.
- Configurações e recorde via `core/storage` (C4): `carregarDados` migra `sakura-fighters-v4`, `salvarDados` em
  cada mudança. Se o `localStorage` for bloqueado, cai numa memória descartável.
- Semente: `?seed=N` fixa tudo; sem ela, `sementeAleatoria()`. Três sorteios separados: lógica (CPU), visual
  (pétalas, brasas, faíscas, tremor) e UI (ordem dos rivais do ARCADE). Áudio com RNG próprio.
- Áudio só nasce no primeiro gesto (a cena de abertura chama `iniciarAudio`).
- Atalhos globais como no protótipo: F tela cheia (menos na seleção), M mudo, resto vai para a cena. Foco/aba
  oculta chamam `blur` da cena (a luta pausa).
- DEV apenas (`import.meta.env.DEV`): `window.__inno` (`entrada`, `ui`, `semente`, `persist`, `avancar(n)`,
  `desenhar()`, `mundo()`); `?manual=1` desliga o laço em tempo real para o teste dar os ticks. Em produção nada
  disso existe (conferido no build).

**Fora da minha lista, por necessidade:** `playwright.config.ts` ganhou `workers: 4`. Com 12 workers cada página
baixando ~6 MB de arte e rodando o protótipo de 9 MB ao lado, os testes estouravam o tempo por falta de CPU
(falso negativo, não defeito). Se preferirem outro valor, é uma linha.

**Testes**
- `tests/unit/ui.test.ts` (+ `_ui.ts`): MenuList, NAV, textos da lista de golpes, Navegador, seleção, dificuldade e
  campanha ARCADE, continuar.
- `tests/e2e/jogo.spec.ts` (7 testes): fluxo completo, pausa, migração do storage, ARCADE até o final, continuar e
  game over, determinismo por semente, toque no celular.
- `tests/e2e/fidelidade-ui.spec.ts`: 40 estados de tela comparados pixel a pixel com o protótipo.
- Ajustados: `fumaca.spec.ts` (agora checa a abertura, não o placeholder), `entrada.spec.ts` (usa `?manual=1`),
  `plataforma-render-assets.spec.ts` e `fumaca.spec.ts` (timeouts maiores: a página agora baixa a arte).

## Portões (rodados agora)

- `npm run typecheck`: limpo.
- `npm test`: 16 arquivos, 201 testes verdes.
- `npm run test:e2e`: 58 passaram, 26 pularam por projeto (comparações e fluxos pesados só no "desktop"; toque só
  no "celular").
- `npm run build`: ok. JS 127,8 kB (46,3 kB gzip), CSS 2,9 kB. Conferido também com `vite preview`: carrega os 4
  atlas e 4 cenários sem erro de console e sem o gancho de teste.

## O QUE FOI PROVADO

1. **Telas iguais ao protótipo, pixel a pixel (1920x1080), 40 estados, 0 pixel de diferença.** O protótipo original
   roda numa página à parte (com o `requestAnimationFrame` desligado para não andar sozinho) e o jogo novo em modo
   manual; cada cena é montada no mesmo estado dos dois lados. Cobre: boot (carregando, pronto aceso/apagado),
   abertura em 7 instantes, título em 3 instantes (e com recorde), menu em 4 instantes e com 3º item, seleção
   (versus, versus travado com flash, arcade com painel de rivais, CPU etapa 2, treino), dificuldade, confronto em 4
   instantes, como jogar nas 5 abas, opções (padrão e alteradas), resultado (2 vencedores), continuar (8 s, 3 s) e
   game over, final do ARCADE (com e sem recorde), luta (ROUND 1, FIGHT!, cpu, treino com dica) e pausa (menu,
   áudio, confirmar saída, lista de golpes versus e solo, treino).
   - O estado sorteado do jogo novo (pétalas, brasas) é copiado para o protótipo antes de desenhar; só isso difere
     por natureza.
   - Teste de mutação: trocar `VENÇA` por `VENCA` em uma aba derrubou o caso com 186 px.
   - Achei e corrigi falsos defeitos do próprio teste: o protótipo andava sozinho entre capturas (rAF ligado) e a
     CPU sorteia diferente (usar ticks dentro da abertura da luta, antes de a CPU agir).
2. **Fluxo jogável com teclado real e semente fixa:** boot -> abertura -> título -> menu -> LUTA vs CPU -> seleção
   -> dificuldade -> VS -> luta -> o jogador anda e derruba a CPU com golpes reais -> K.O. -> resultado -> menu.
   Sem erro de console. Também provado: o áudio só existe depois do 1º gesto; ESC pausa e congela os ticks; perder o
   foco pausa; MENU PRINCIPAL pede confirmação.
3. **ARCADE:** 3 lutas seguidas -> final; a pontuação vira recorde e é gravada no armazenamento; o recorde aparece.
4. **Continuar/game over:** contagem de 10 s, um crédito vai para o confronto da mesma luta mantendo a pontuação,
   sem crédito vira game over, recorde gravado.
5. **Armazenamento:** a chave `sakura-fighters-v4` migra para `inno-fighters-v1` (e a antiga some) ao abrir o jogo.
6. **Determinismo:** duas páginas novas com `?seed=42` terminam 900 ticks de CPU contra CPU em estado idêntico.
7. **Toque (celular emulado, toques reais via CDP):** tocar avança abertura, título e menu e escolhe item; o botão
   II da camada de toque pausa a luta.

## O QUE NÃO FOI PROVADO (ou fica de fora da comparação)

- **Som:** só provei que o contexto de áudio nasce após o gesto e que as chamadas de áudio saem dos eventos
  (testes da Vega). Ninguém ouviu o resultado.
- **Gamepad real** e navegação de menu pelo controle (a lógica do gamepad tem unit; sem e2e com dispositivo).
- **Abertura em t=128..149** (tremor sorteado e faíscas do impacto do logo) e os quadros do **fade** (a camada
  escura entre telas) não entram na comparação pixel a pixel.
- **IA da CPU não é igual à do protótipo** por desenho (o sorteio é semeado, o do protótipo era `Math.random`):
  só se garante o mesmo comportamento estatístico e o mesmo resultado para a mesma semente no jogo novo.
- **A ordem sorteada dos rivais do ARCADE** também difere do protótipo (mesma razão); o que se prova é que é uma
  permutação dos 3 outros lutadores e que a mesma semente repete.
- **Luta em andamento contra o protótipo no nível da tela completa** (hits, K.O.) já é coberta pelo teste da F1b
  (render), não repetida aqui.
- **Tela cheia pelo item das opções**, **retrato no celular** e **iPhone/Safari** (autoplay: o áudio inicia no
  primeiro toque; no iOS o `AudioContext` costuma exigir `touchend`, e o toque no canvas age no `touchstart` —
  risco para a F4).
- **Fonte:** o jogo usa `Impact`/`Segoe UI` como o protótipo. Em Linux/macOS sem essas fontes cai no fallback e as
  telas mudam de aparência (o e2e roda no Windows).
- Desempenho em celular fraco não foi medido.

## DESVIOS DO PROTÓTIPO (todos pequenos)

1. A tela de abertura mostra uma mensagem se a arte falhar ao carregar (o protótipo só dava `console.error` e ficava
   em "Carregando arte...").
2. A tecla `H` (debug) ainda alterna `game.debug`, mas as caixas de colisão não são desenhadas (o render novo não
   as portou; o texto de "Como jogar" continua citando a tecla H, como no protótipo).
3. Sorteios semeados (ver acima) no lugar de `Math.random`.
4. `?seed=N` também vale em produção (deixa qualquer jogador fixar a semente; sem risco, mas é uma decisão a
   confirmar).
5. As configurações lidas do armazenamento passam por `sanearConfiguracoes` (Vega): valores inválidos caem no padrão
   em vez de entrarem cegos.

## PARA O PRÓXIMO

**Íris (testar):** jogar um ARCADE inteiro em ambos os teclados; perder e usar os 3 créditos; pausa em luta de
versus e de treino (lista de golpes, áudio, REPOSICIONAR, ALVO DO TREINO, tecla R e T); opções (sliders com mouse,
tela cheia, restaurar padrões); recarregar a página e ver se volume/rounds/recorde persistem; celular de verdade
(controles de toque, orientação, o jogo inicia o som no 1º toque). Em `?seed=N` o resultado da lógica deve se repetir.
**Órion:** o jogo lê só `localStorage` (saneado) e `?seed=` (número); nada de HTML injetado; o gancho `__inno` só
existe no servidor de desenvolvimento.
**Vulcano:** o JS ficou em 128 kB; a arte (~6 MB em 4 atlas `.webp` + 4 `.jpg`) é carregada no boot, então cache
longo em `/assets/` é o que importa; nada de service worker ainda (F4).
**Alexandria:** `README` pode citar `?seed=N`, o fluxo de telas e os atalhos (F tela cheia, M mudo, ESC/P pausa).

## PENDÊNCIAS

- **Vega (opcional):** `Game.clearFx()` é privado; a cena de luta replica o necessário pelos campos públicos
  (`projectiles = []`, `shake = 0`, `hitstop = 0`) para REPOSICIONAR e a tecla R. Um método público
  `limparEfeitos()` evitaria essa cópia. Nada bloqueia.
- Decisão do dono/Atlas: manter ou não o `?seed=` em produção (desvio 4); o tratamento do `H` (desvio 2).
- F4 (celular/PWA): reavaliar o gesto de áudio no iOS e a orientação travada.

## APRENDIZADO (gravado em `.claude/agent-memory/lyra/`)

- Comparar com o protótipo exige PARAR o relógio dele (`requestAnimationFrame = () => 0`): senão o estado anda entre
  uma captura e a seguinte e o teste acusa defeitos que não existem (a câmera da luta guarda estado entre lutas).
- Comparação com sorteio: copiar o estado sorteado do lado novo para o protótipo, e escolher ticks em que a CPU
  ainda não age.
- Cada cena do teste precisa provar que mostrou algo (`cores > 30`), senão duas telas vazias passam.
- Mantenha os nomes dos campos do protótipo nas cenas portadas: o mesmo trecho de teste roda dos dois lados.
- Teste de jogo em tempo real é sensível a CPU: afordâncias (posicionar o jogador, enfraquecer a CPU) deixam o teste
  determinístico sem esconder que as teclas são reais; e limitar `workers` evita falso negativo por carga.
