# Handoff Lyra: L1 (ESQUIVA) + L2 (CINEMÁTICA DO ESPECIAL)

Data: 2026-10-21. Sem commit. NÃO toquei em `src/fight` (a Vega corrige bufEsq, desempate na parede e `esquivou` em paralelo).
Base: `docs/spec-esquiva-e-cinematica-especial.md`, `docs/handoff-vega-v1v2.md`, `docs/handoff-cronos-c1.md`, `docs/identidade-visual-especiais.md`.

## L1 · ESQUIVA

- Entrada: `src/input/mapa.ts` (`esq`: P1 `n`, P2 `o`; `BotaoPad` `l1`/`l2`), `gamepad.ts` (L1 = botão 4, L2 = botão 6, agrupados por tecla), `teclas.ts` (`esq` em `ler`/`lerMesclado`; `INPUT_VAZIO` não ganhou o campo).
- **Defeito #3 da Íris corrigido** (`Gamepads.consultar`): o jogador de cada controle é fixo pela POSIÇÃO NA LISTA do navegador enquanto ele estiver conectado (mapa `slots`); controle novo ocupa o menor slot livre; quem some solta o que segurava e libera o slot. O `it.fails` de `tests/unit/entrada-adversarial.test.ts` virou `it` (só isso).
- Toque: botão `ESQ` (`#esq`, `data-k="n"`) na casa reservada na E7a (`index.html`, `toque.css`); `.sem` (opacidade .42) quando a barra do P1 < 20, trocada só na mudança (`CenaFight.atualizarBotaoEsquiva`); `body.sem-esquiva` (`main.ts`) esconde o botão e mantém a casa quando `Regras.esquiva` é false.
- `ConfigPartida.esquiva = regras.esquiva` em todos os pontos que montam config: `cfgDaEtapa(run, manter, regras)` (3 chamadores), `diff.ts`, `select.ts` (versus e treino).
- Render (`src/render/esquiva.ts` novo + `lutador.ts`): na janela (`esquiva !== 0 && invuln > 0`) corpo com alfa 0,55, faixa de velocidade atrás (degradê `fire[0]`, `lighter`, sem shadowBlur) e rastro com a silhueta TINGIDA de `fire[0]` (cache por quadro e cor). Na recuperação: corpo sólido, sem faixa, sem rastro (rastro `crouch`/`land` fora da janela é descartado). `Efeitos.reagir`: `esquiva` (flash curto na cor do lutador) e `esquivou` ("ESQUIVOU!" `#bfe9ff` 20). Anel de contragolpe `#7fe3ff` → `#c7d3ff`.
- HUD (`hud.ts`, opção `esquiva`): marcador ciano do custo (20%) com borda escura de 1 px (a barra cheia também é ciano) e selo `ESQ` (apagado com en < 20; aceso e pulsando com en ≥ 20). Só com `Regras.esquiva` (`?expansao=4` = HUD do protótipo).
- "Como jogar": linha da esquiva, "L1 esquiva" no controle e frase em ENERGIA, só com `regras.esquiva`.
- Observação sobre o HUD: o custo do especial do HAYATO é 40 (não 20); o marcador da esquiva fica em 20%, ao lado da divisória da barra.

## L2 · CINEMÁTICA

Arquivos novos: `src/render/{cinematica,sessao-especial,estilos-especiais,identidade-especiais}.ts`, `src/audio/receitas.ts`.
- Regra de produto: TODO especial (os 9, CPU, treino) roda a preferência: COMPLETA 48 ticks por padrão, CURTA 20, DESLIGADA nenhuma; `prefers-reduced-motion` sem preferência salva = CURTA (preferência salva vale sobre ele); `Regras.cinematica` false (`?expansao=4`) = nenhuma. Não há mais "1ª vez completa, repetições curtas" (decisão do dono).
- A cena NÃO chama `game.update` enquanto a cinemática roda (como a pausa): depois do evento são exatamente 48 `update()` parados (curta 20). A pausa congela a cinemática e devolve a música (a música cai a 50% durante ela). Qualquer botão de ataque/ESP de humano pula (saída em ≤ 6 ticks); setas não pulam. Dois especiais no mesmo tick: fila, o 2º sai curto.
- Abertura: `special` com `momento: 'inicio'`; PARADE abre no `parry` (dono = defensor) e GARKUWA no `clash` com `lutador`; MASHI abre ao começar a carga; FOUETTÉ (`sResp`) continua a sessão da PARADE; `throw` especial conta acerto.
- Sessão (`SessaoEspecial`): vinheta de 20% + brilho do atacante; cada `hit`/`throw` com `especial` mostra número de dano, assinatura do estilo e "N HITS" (+ "NÍVEL n" da MASHI); ao fechar com ≥ 1 acerto, "TOTAL" por 40 ticks. `block`/`quebra-guarda`/`parry` de especial: só o eco discreto, nenhum número/contador; `armor`: número cinza que não conta; `esquivou`: nada. Fecha quando o golpe acaba e não há projétil dele no ar (ou 120 ticks).
- Identidade: 11 estilos procedurais E1..E11 (funções puras do instante, sem estado; agrupam caminhos: ≤ 24 primitivas/quadro, ≤ 12 na rajada da CURTA), tabela `<id>.<ficha|base>.<golpe>` (28 entradas, paleta/estilo/variante/recorte/faixa/ritmo/som), contraste do nome ≥ 3:1 nos 28 (calculado em teste), sons por golpe (`tone`/`noise` já existentes; o som do evento `special` não mudou). Sem shadowBlur/filter/getImageData (conferido em unidade e no navegador).
- Tarja pré-desenhada num canvas 2000x264 (RS=2) por (lutador, golpe), máx. 6, zerada por luta; `aquecer()` pinta uma por tick na abertura da luta (e a silhueta tingida do halo).
- Opções: "CINEMÁTICA DO ESPECIAL" (10ª linha; 40 px por linha para caber; ausente em `?expansao=4`); "RESTAURAR PADRÕES" faz `delete S.cinematica`.
- Decisões minhas (reversíveis): (1) o treino também segue a preferência; (2) com DESLIGADA a sessão (números, contador, vinheta) também não aparece; (3) selos no idioma da cultura NÃO ligados (pedem fonte e revisão nativa: decisão do dono, seção 7 do doc do Apolo); (4) "pular com toque no canvas" não implementado (só botões); (5) "errou" (assinatura que apaga em cinza) não implementado, não há evento.
- **BAATAR mudou no meio da sessão** (outro agente: lutador comum, sem fichas, →+ESP = MERGULHO DA ÁGUIA): adaptei a tabela para 28 especiais (`baatar.base.sFwd` = MERGULHO, E11); o ABRAÇO DA ESTEPE e a ficha `chefe2` saíram.

## Auditoria dos e2e que já existiam
- Aperta/usa especial com `h.avancar`: `arte-f3b.spec.ts` (NILA, 2 testes) e `celular-e7a.spec.ts` (MASHI, 3 testes) passaram a falhar (48 ticks parados). Semeei `persist.settings.cinematica = 'desligada'` na função de abertura de cada um; nada ficou mais frouxo (a medida é a mesma, só sem a pausa). `novos-lutadores.spec.ts` e os demais continuam sem mudança.

## PROVADO (rodado)
- `npm run typecheck`: limpo para o que é meu; resta 1 erro de OUTRO agente (`tests/unit/e5-elenco.test.ts:191`, `m.name` possivelmente undefined). `npm test`: 1285 verdes, **2 falhas que não são minhas** (`tests/unit/z6-chefoes-derrotados.test.ts`, do trabalho do chefe/BAATAR em andamento). `npm run build` ok (JS 226 kB, +47 kB sobre os 179 kB; não fiz lazy load da cinemática). `npm run test:e2e:build` 5/5.
- e2e (`npm run test:e2e`): rodada completa anterior à troca do BAATAR = **125 passaram, 0 falharam**. Depois da troca do BAATAR: 7 falhas, TODAS de specs de "BAATAR chefão" (`expansao.spec.ts` x3, `novos-lutadores.spec.ts` x2, `celular-e7a.spec.ts` "etiqueta GAJA/SARPA, CHEFÃO..." x2): dependem do chefão que não existe mais; precisam ser atualizadas por quem trocou o chefe. Nada de esquiva/cinemática/entrada falha.
- Novos e2e: `esquiva.spec.ts` (10 testes), `cinematica.spec.ts` (12: B de verdade, repetição, pular, acertos x bloqueio, PARADE no sucesso, GARKUWA no clash, opção + persistência + restaurar, reduced-motion, `?expansao=4`, os 26 especiais que abrem no início com capturas, celular), `entrada.spec.ts` (ESQ: layout nas 3 telas e toque).
- Unidade novas: `esquiva-render` (17), `cinematica` (30), `sessao-especial` (20), `cena-luta-cinematica` (10, `Game` real e cena real), `opcao-cinematica` (4), mais `teclas`/`gamepad`.
- Mutação: 20 mutantes de unidade e 16 de e2e (L1 e L2); todos mortos. Um sobreviveu ("sem faixa de velocidade": o e2e medido com o rastro junto não a isolava); reforcei o e2e (A/B no mesmo quadro, sem rastro) e ele morre agora.
- Medido no navegador (desktop 1280x720): congelamento = 48 updates; escurecimento do chão (razão ≤ 0,55 no quadro 20; ~0,3 típico); tarja com ≥ 600 px da cor `brilho` do golpe; nome do golpe desenhado; vinheta da sessão 0,6-0,95 do original; contador e número só no acerto (TOTAL = hp perdido) e nenhum no bloqueio; nenhum shadowBlur/filter; botão ESQ nas 3 telas deitadas (área ≥ 44 px, sem sobrepor os 5 botões, dentro da janela, mesmos limites da E7a).

## O QUE VI EM NAVEGADOR (capturas olhadas)
`arte-fonte/capturas/`: `cinematica-<id>-<ficha>-<golpe>-desktop.png` (26), `cinematica-<id>-<golpe>-celular-915x412.png` (9), `cinematica-hayato-raijin-dan-quadro20-desktop.png`, `esquiva-{tras,frente}-{janela,recuperacao}.png`. Olhei RAIJIN-DAN, LONG ZHANG, BULKKOT, PLANCHA, MASHI, BOTE, MERGULHO e o LONG ZHANG no celular: tarja inclinada na cor do lutador, pose recortada saindo da moldura, nome legível, estilo de brilho próprio de cada um. Ajustei o nome em faixa fina (BOTE: o nome do lutador encostava no título). Os botões do toque não cobrem a tarja no 915x412.
**NÃO vi / NÃO provado:** os outros 20 especiais só foram medidos (pixels, texto, tempo), não olhados; a ordem de leitura dos acertos (número/contador/TOTAL) vi só por texto desenhado, não em captura; o som (nenhuma receita foi ouvida; só provei as chamadas); aparelho real; `prefers-reduced-motion` real (emulado pelo Playwright); a cena de abertura da luta com o halo/tint em atlas v1 (WEI LONG/CAIO) olhada só em captura do WEI LONG; a esquiva do P2 e da CPU em movimento.

## Desempenho (B16) — NÃO atende o portão por completo
Celular emulado 915x412, canvas acelerado por software, CPU 4x, `ui.update()+ui.draw()` (normal: mediana 6-8 ms, p95 10-14): cinemática **mediana 9-11 ms** (passa), **p95 18-21 ms** (WEI LONG, MIN-JI, CAIO; falha o limite de 16,7), 3-4 de 52 quadros acima de 16,7 ms: picos de 30-57 ms no tick 4-8 (primeiro desenho da tarja e do estilo na GPU). Antes de `aquecer()` o primeiro quadro passava de 30 ms; hoje fica em 10-25 ms. Canvas por CPU (pior caso): quadro normal já custa ~380 ms a 4x, então não serve de portão. A spec manda "CURTA vira o padrão em toque se falhar": **não mudei o padrão** (a regra do dono é COMPLETA); decisão fica com o Atlas/dono com estes números. Ressalva: máquina compartilhada e emulação, não aparelho real.

## PARA O PRÓXIMO
- **Íris:** jogar os 9 com a cinemática e a esquiva (versus, CPU nos 3 níveis, Arcade, treino), toque e controle simulado; adversarial: dois especiais no mesmo tick (fila), pausa/perda de foco durante a cinemática, pular no último tick, trocar de cena (MENU PRINCIPAL) no meio e conferir o volume da música, KO no meio de uma sessão, PARADE sem acerto (nada abre), GARKUWA contra projétil e contra golpe corpo a corpo, MASHI nos 3 níveis (selo NÍVEL e batidas), CPU especial em cima do jogador (quem pula).
- **Apolo:** olhar as 26+9 capturas; os brilhos E3/E5/E9/E10 são os de menor fidelidade ao texto (flores/respingos/hélice/vento); selos nativos ficaram de fora.
- **Atlas/Vega:** specs de BAATAR chefão desatualizados (acima); o teste `z6-chefoes-derrotados` falha; `docs/identidade-visual-especiais.md` ainda cita o ABRAÇO e a ficha `chefe2`.

## PENDÊNCIAS
- Decisão do dono: CURTA como padrão em toque (portão B16), treino curto ou completo, números com a opção DESLIGADA, selos em outros idiomas.
- "Pular" por toque no canvas e a assinatura de "errou" não feitos.

## APRENDIZADO (também em `.claude/agent-memory/lyra/armadilhas-ui-innofighters.md`)
- A cena congela, o motor não: depois do evento são 48 updates parados; teste que conta ticks tem que contar updates, não `game.tick`.
- Cinemática com custo de primeira vez (canvas da tarja, silhueta da página, textura): aquecer na abertura da luta, um passo por tick.
- Gamepad: o slot do jogador é a posição na lista do navegador, nunca a posição na lista filtrada.
- Medir escurecimento fora da faixa inclinada; o e2e que "prova" um efeito tem que isolar o efeito (A/B no mesmo quadro): o mutante sobrevivente mostrou que o primeiro e2e da faixa de velocidade media o rastro junto.
- Script de mutação com `execSync` + servidor filho pendura (herda o pipe) e deixa o arquivo mutado se o processo for morto: `stdio: 'ignore'` no restart e conferir os arquivos depois.
- Outro agente pode mudar dados (BAATAR) no meio da sessão: ler os dados de verdade (`ch.moves[golpe].name`) em teste, nunca só a tabela do doc.
