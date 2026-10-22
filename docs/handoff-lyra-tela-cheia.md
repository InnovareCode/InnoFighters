# Handoff Lyra: tela cheia no iPhone/Android, versão do build e Opções sem chaves de recurso

Missão `cmviwilw2012001p7ymb9gjc4`. Base: HEAD 64f2647 (não commitado). Relato do dono (aparelho real, site do GitHub Pages): "ficou do mesmo jeito, nada mudou; nas opções a tela cheia também não habilita". Informação posterior: o aparelho é um **iPhone com Chrome**. Decisão do dono: cinemática do especial e provocações ficam **sempre ligadas**, sem chave nas Opções.

## 1. Causa raiz da tela cheia

| Onde | O que acontecia | Prova |
|---|---|---|
| **iPhone (Safari e Chrome)** | O Chrome do iOS usa o WebKit, que não tem `requestFullscreen` em elementos (só em `<video>`). O código antigo fazia `if (requestFullscreen) ...` e, sem a API, **não fazia nada, em silêncio**: a linha ficava em "DESLIGADA" para sempre. Era o caso do dono. | Código lido; no Chromium a API foi removida (init script) e o jogo agora cai no caminho "ios" (e2e). **Não** provado em iPhone real. |
| **Android Chrome** | O toque do jogo age no `touchstart` (`input/toque.ts`) e o pedido saía dali. A regra do Chrome: `touchstart` **não** é gesto de ativação (`pointerup` do toque e `touchend` são). O pedido era recusado (`TypeError: API can only be initiated by a user gesture`) e o `.catch(() => undefined)` engolia o erro. | Regra reproduzida por espião no e2e (recusa fora do fim do toque). O Chromium emulado do Playwright **já dá `userActivation.isActive=true` no touchstart**, então ele sozinho NÃO reproduzia a falha; por isso o espião. **Não** provado em Android real. |
| Iframe / navegador embutido | `document.fullscreenEnabled === false` ou sem API fora do iOS. | Unit (`tests/unit/tela-cheia.test.ts`). |

Item "desabilitado/cinza": a linha **não** era `disabled` no código (`MenuList` pinta cinza só `disabled`); o "não habilita" era o toque sem efeito. Não há feature-detect errado nem permissão: era ausência de API (iOS) e gesto (Android).

## 2. O que entrou

- `src/platform/tela-cheia.ts` (reescrito): `situacaoDaTelaCheia()` = `disponivel | bloqueada | instalado | ios | indisponivel`; `alternarTelaCheia()` agora **devolve** `entrou | saiu | sem-api | negada | adiado`, aceita o prefixo `webkit*` (iPad/Safari), começa a ouvir o gesto **antes** do pedido e **refaz uma vez** no fim do toque quando o navegador recusa (1,5 s de prazo, sem ouvinte pendurado). Ao entrar, trava paisagem (celular) e destrava ao sair (`fullscreenchange`).
- `src/ui/cenas/options.ts`: a linha TELA CHEIA liga/desliga onde a API existe (no toque o rótulo não diz "(F)"). Onde não existe vira **"COMO ATIVAR"** (iPhone/iPad), "JÁ ATIVA" (aberto pelo ícone da tela de início) ou "INDISPONÍVEL", e o toque abre um **cartão** na tela com o passo a passo: *Toque em Compartilhar > "Adicionar à Tela de Início" > abra o InnoFighters pelo novo ícone: abre sem as barras*. Pedido recusado também abre cartão. Qualquer toque/tecla fecha (Esc fecha o cartão sem sair da tela).
- `index.html` + `public/manifest.webmanifest` + `public/icons/` (180, 192, 512 e 512 mascarável, gerados do emblema + "IF" do jogo): metas `apple-mobile-web-app-capable`, `mobile-web-app-capable`, status bar, título, `apple-touch-icon`, manifest (`display: standalone`, `display_override: [fullscreen, standalone]`, `orientation: landscape`). Funciona com o `--base=/InnoFighters/` do Pages (verificado no build). A CSP não mudou (`manifest-src` cai no `default-src 'self'`).
- Contexto: `alternarTelaCheia(): Promise<ResultadoTelaCheia> | void` em `src/ui/contexto.ts` (o `main.ts` continua passando a mesma função; **não foi editado**).

### Ícone, splash
- Ícone: existe agora (provisório: emblema do jogo + "IF"; Apolo pode trocar os 4 PNGs sem mexer em código).
- **Splash do iOS NÃO foi feito.** `apple-touch-startup-image` exige uma imagem por tamanho de aparelho; sem ela o iOS mostra a tela de fundo (`background_color` #05030a do manifest) e depois o jogo.

## 3. "Nada mudou": cache e versão

- Site vivo medido: **não há service worker** (0 ocorrências no bundle publicado). Pages serve `index.html` com `Cache-Control: max-age=600` (10 min) e **não permite mudar cabeçalhos**; os assets têm hash no nome. Logo, depois do deploy o navegador pode mostrar o `index.html` antigo por até 10 minutos; depois disso tudo atualiza. O bundle publicado na hora da medição já tinha PROVOCAÇÕES/ZENON (o site estava no ar com o HEAD).
- **Meta de cache no HTML não foi acrescentada** (`<meta http-equiv="Cache-Control">` é ignorada pelos navegadores modernos; seria placebo).
- **Rótulo de versão** nas Opções (canto direito da barra de baixo): `versão 64f2647 · 21/10 23:17` (commit curto + data/hora de Brasília; `+` = build de máquina com alterações não commitadas). Vem de `define __INNO_BUILD__` em `vite.config.ts` (lido em `src/versao.ts`).
- **`version.json`** publicado ao lado do `index.html` no build; ao abrir as Opções o jogo o consulta com `cache: 'no-store'`. Se for diferente da versão rodando: o rótulo vira **"NOVA VERSÃO NO AR · TOQUE AQUI PARA ATUALIZAR"** (ou tecla U) e recarrega com `?v=<commit>` (furando o cache do index.html). Sem rede/sem arquivo (dev): fica o rótulo normal, sem erro.
- Sugestão (precisa de `main.ts`, da Vega): chamar `verificarVersao()` uma vez no boot e usar o `avisar()` já existente ("Há uma versão nova: abra Opções"). Hoje o aviso só aparece quando o jogador abre as Opções.

## 4. Opções sem chaves de recurso (decisão do dono)

- Removidas as linhas **CINEMÁTICA DO ESPECIAL** e **PROVOCAÇÕES** (e `cinematicaResolvida`, exportada só para elas). As Opções voltaram a ter as **9 linhas do protótipo** (altura 46, y 100): MÚSICA, EFEITOS SONOROS, ROUNDS, TEMPO, DIFICULDADE, TREMOR, TELA CHEIA, RESTAURAR, VOLTAR.
- Comportamento fixo: provocação sempre ativa e cinemática do especial sempre COMPLETA; **`prefers-reduced-motion` do sistema continua dando CURTA** (regra que já existia nos resolvedores quando não há preferência salva).
- **Saves antigos**: `criarPersistencia` (`src/ui/persistencia.ts`) tira `cinematica`/`provocacoes` de `settings` **na memória** ao carregar (nenhum consumidor os vê, inclusive `fight.ts`, que lê `persist.settings.cinematica` cru) e os **devolve ao gravar**: o disco continua com os campos (v2 aditivo, nada apagado, sem bump de versão), só deixam de valer. `RESTAURAR PADRÕES` continua apagando da memória; o valor retido no disco sobra (inofensivo).
- Os ganchos de teste `persist.settings.cinematica = 'desligada'|'curta'` seguem valendo em runtime (vários e2e os usam para determinismo); só não existe mais caminho de UI nem de save que os ative.
- Mínimo em `src/core/contratos.ts`: **só comentários** (tipos/campos mantidos para ler saves antigos). Nenhuma constante nova.

## 5. Arquivos

Alterados: `src/platform/tela-cheia.ts`, `src/ui/cenas/options.ts`, `src/ui/contexto.ts`, `src/ui/persistencia.ts`, `src/core/contratos.ts` (comentários), `index.html`, `vite.config.ts`.
Novos: `src/versao.ts`, `public/manifest.webmanifest`, `public/icons/icone-{180,192,512,mascaravel-512}.png`, `tests/unit/tela-cheia.test.ts`, `tests/unit/versao.test.ts`, `tests/unit/opcoes-fixas.test.ts`, `tests/e2e/tela-cheia.spec.ts`, `tests/e2e-build/pwa-versao.spec.ts`.
Testes ajustados: `tests/e2e/cinematica.spec.ts` (bloco "opção CINEMÁTICA" reescrito), `tests/e2e/provocacao.spec.ts` (teste P2 das Opções reescrito), `tests/e2e/fidelidade-ui.spec.ts` (quarta exceção: `CenaOptions.desenharVersao` vira no-op nos dois lados do oráculo). Removido: `tests/unit/opcao-cinematica.test.ts` (substituído por `opcoes-fixas.test.ts`).
**Não tocados:** `src/audio`, `src/data/sons*|musica*`, `src/ui/cenas/fight.ts`, `src/main.ts`.

## 6. Verificação

Nível "provado no Chromium (desktop e Pixel 7 emulado)", nunca em aparelho real.

- `tsc --noEmit`: limpo. `vitest run`: 95 arquivos, 2173 testes verdes (uma rodada anterior teve 1 falha de tempo, `p99 evento inteiro` do orçamento da música, com a máquina carregada; passou na repetição, não é desta missão). `npm run build`: ok.
- e2e completo (servidor próprio, porta 5391, 3 workers, 418 testes, 6,4 min): **227 passaram, 190 pulados (por projeto), 1 falha**: `tipografia.spec.ts:39` tem `127.0.0.1:5173` escrito no teste e viu a minha porta como "fora do site". Rodado de novo numa instância em 5173: 4/4 verdes. Falha do ambiente de teste, não do código. Entre os verdes: `fidelidade-ui` (Opções pixel a pixel contra o protótipo, com a linha TELA CHEIA e sem o rótulo de versão), `fidelidade-prototipo`, `cinematica`, `provocacao`, `celular-e7a`.
- `npm run test:e2e:build`: 7/7 (inclui `pwa-versao.spec.ts`: manifest, ícones e metas no HTML do build, `version.json` = identidade dentro do bundle, CSP sem violação com o fetch).
- Novo `tests/e2e/tela-cheia.spec.ts` (10 testes ativos, desktop + Pixel 7): liga/desliga por clique; toque entra em tela cheia e pede `landscape`; regra de gesto do Chrome (recusa no touchstart, refaz no fim do toque, inclusive com a recusa chegando DEPOIS do touchend); iPhone com Chrome (UA CriOS, API removida): "COMO ATIVAR", cartão com o passo a passo, cada linha dentro do painel (medida na fonte carregada) e o rodapé sem encostar; teclado; rótulo da versão; "NOVA VERSÃO" por `version.json` interceptado e clique que navega para `?v=`; metas e manifest.
- **Controle negativo (mutação)**: tirando o "refazer no fim do toque" de `alternarTelaCheia`, os 2 testes da regra de gesto falham (timeout esperando a tela cheia); restaurado, passam. É a prova de que o teste enxerga a causa raiz do Android.
- Capturas conferidas a olho: cartão (texto cabe, rodapé separado) e Opções com "COMO ATIVAR" e o rótulo da versão no canto.

## 7. O que NÃO dá para provar sem aparelho real

- iPhone: que "Adicionar à Tela de Início" a partir do **Chrome** do iOS abre o jogo em modo standalone (até onde sei isso depende do iOS 16.4+, que passou a deixar navegadores de terceiros criar web apps; abaixo disso só o Safari cria; não verificado). O Playwright WebKit **não** está instalado e o WebKit do Playwright no Windows não é o do iOS: nada disso foi medido em WebKit.
- Android: a regra de gesto foi reproduzida por espião (o Chromium emulado é mais permissivo que o Chrome real).
- Orientação: o `lock('landscape')` foi provado como **pedido** (espião); se o aparelho obedece depende do navegador.
- O iOS ignora `orientation` do manifest (o app standalone gira com o aparelho; o aviso "vire o aparelho" continua valendo).

## 8. Para o próximo

- **Íris**: (a) no iPhone real, Opções > TELA CHEIA: deve mostrar "COMO ATIVAR", o toque abre o cartão, e o passo a passo produz um ícone que abre sem barras; (b) no Android real: o toque na linha entra em tela cheia e vira paisagem; (c) Opções mostram `versão <commit> · <data>`; após novo deploy o jogo antigo (aberto) mostra "NOVA VERSÃO NO AR" ao reabrir as Opções; (d) save antigo com `cinematica: "desligada"`/`provocacoes: "desligadas"` abre cinemática/provocação normalmente.
- **Vega / Atlas**: opcionalmente 1 linha em `main.ts` (aviso de versão nova no boot). `fight.ts` não precisa de mudança: lê `persist.settings.*`, que agora chega vazio.
- **Apolo**: trocar os ícones provisórios; decidir se quer splash do iOS.
- **Alexandria**: README/CHANGELOG (Opções agora têm 9 linhas; versão no rodapé das Opções).

APRENDIZADO está registrado na memória da Lyra (armadilhas do pointerup antes do touchend, Chromium emulado já ativa no touchstart, MSYS_NO_PATHCONV no `--base`).

---

# Adendo: porte dos controles de toque (direção de arte do Apolo, §10 do doc)

Decisões do Atlas/dono aplicadas: modo NORMAL com rótulos, opacidade 90% fixa, **nenhuma opção nova** (sem tamanho/mão/opacidade), então os modos compacto e canhoto da referência NÃO foram portados.

## O que mudou
- `index.html`: glifos (`ESQ`, `ESP`, `△ ○ □ ✕`, `II`) saíram; `data-rotulo` em cada botão (ESQUIVA, ESPECIAL, FORTE x2, LEVE x2). Ids, `data-k` e `aria-label` iguais.
- `src/input/toque.css` (reescrito a partir de `arte-fonte/toque/toque-referencia.css`): `#pad` é só âncora (`inset:0`); cada botão se posiciona pelo próprio centro (`--x/--y/--D`); SVG por estado em `::before`, rótulo em `::after` (Barlow Condensed, a do HUD), `.sem` apaga, `#r1` pronto respira em ouro, `.acendeu` dá o estalo, `prefers-reduced-motion` = brilho fixo. Os `url()` saem prefixados pelo `base` do Pages (conferido no build com `--base=/InnoFighters/`).
- `src/input/toque.ts`: `#joy.ativo` (liga no início do toque, desliga no `fim()`, que também roda no `touchcancel`); `precarregarDesenhosDoToque()` pede os 11 SVGs de estado ao ligar o toque (7 pressionados, 2 desabilitados, 2 do joystick), com `BASE_URL`.
- `src/ui/cenas/fight.ts` (**tocado: era da Vega, que terminou**): `atualizarBotaoEsquiva` agora também cuida do `#r1` (`.sem` quando `p1.en < proj.cost` da ficha do P1, a mesma regra do HUD) e põe `.acendeu` por 220 ms na transição apagado -> pronto (timer limpo ao reacender e ao recomeçar a luta).
- `arte-fonte/toque/capturar-toque.mjs` (do Apolo): ganhou `SEM_INJECAO=1` (roda o roteiro no jogo como ele é, pula compacto/canhoto e grava `toque-porte-*.png`) e `CENTROS=1` (imprime centro e lado de cada controle). O modo antigo continua igual.

## Medido (jogo real, sem injeção, Pixel 7 emulado) contra a §8 do doc
- Centros e lados **idênticos** à tabela em 915x412 e 844x390 com o entalhe simulado (ex.: soco leve 820,5 · 347,7 (48,6); chute leve 876,9 · 334,1; especial 876,9 · 217,4 (54,4); joystick 64,8 · 311,3 (102,1); pausa 883 · 98 (44); 844x390: soco leve 715,1 · 313,8 (46), especial 768,5 · 190,4 (51,5), joystick 100,8 · 279,3 (96,6)).
- Menor alvo 44 px; sobreposição 0; `elementFromPoint` no centro devolve o próprio controle; HUD 0 px²; rostos 0 px² (encurralados: 113 px² no ESQ x P2, como o doc previu); rótulo 10,7 px (915x412) e 10,1 px (844x390) em Barlow Condensed.
- Capturas: `arte-fonte/capturas/toque-porte-normal-915x412.png`, `...-em-uso.png`, `...-844x390-entalhe.png`, `toque-porte-opacidade-50-915x412.png`, `toque-porte-encurralados-915x412.png`, `toque-porte-detalhe.png`.

## Testes
- Novo `tests/e2e/toque-arte.spec.ts` (11, Pixel 7): rótulos e a11y mantidos; `.sem`/`.acendeu`/desenho certo por estado (a regra do HUD); estalo que reinicia; apertar = desenho aceso + escala 0,94; joystick `.ativo` (aro, bolinha, opacidade 1) e `touchcancel`; SVGs de estado pedidos ao ligar e nenhum 404; geometria da §8 (centros, lados, >= 44, sem sobreposição, tudo na janela, o centro acerta o próprio controle) em 915x412 e 844x390; `prefers-reduced-motion`; `?expansao=4` (ESQ some, opacidade 0,9); aviso de retrato. **Mutação**: tirar o `.ativo` do `toque.ts` e o `.acendeu` do `fight.ts` derruba 3 testes; restaurado, passam.
- Ajustados por mudança de desenho, não de comportamento: `entrada.spec.ts` (layout: fórmulas novas D/J, `#pad` virou a união dos botões; limites de altura do aglomerado 40% -> 46% e de arena 6% -> 8%, 12% de largura com +0,5 ponto no 844x390), `aviso.spec.ts` (confere cada botão, já que `#pad` cobre a tela), `esquiva.spec.ts` (`.sem` mede o `::before`: desenho desabilitado e opacidade), `selecao-aleatoria.spec.ts` (a etiqueta JOGADOR 2 **encosta 3,3 px na área de toque** do soco forte em 915x412, que é margem transparente do disco: o teste ignora 4 px de cada lado dos botões; o disco desenhado (92%) ainda é tocado em ~1,4 px pela ponta da pílula. Se o Apolo/dono quiser zero, mover a etiqueta uns 4 px para a esquerda na seleção).
- Suíte e2e completa (6,5 min): 232 verdes; 7 falhas: `tipografia` (porta 5173 escrita no teste, ver acima) e as 6 acima, todas ajustadas e re-rodadas verdes em separado. `tsc` limpo, `npm run build` ok, `vitest` 2181 verdes (a falha de tempo `p99 evento inteiro` da música aparece às vezes com a máquina ocupada e passa na repetição), `test:e2e:build` 7/7.

## Pendente / próximo
- **Logo oficial do dono**: NÃO iniciada. O Atlas pediu para esperar `docs/logo-oficial.md` e `public/assets/ui/logo/` do Apolo; nenhum dos dois existe ainda (só `arte-fonte/logo/logo-oficial-dono-v1.jpg`). Quando existirem: título, menu, carregamento, aviso de orientação, favicon/apple-touch-icon/manifest/og, remover `src/ui/logo.ts` antigo e ajustar `logo.spec` e os oráculos de fidelidade com medição em 915x412 e 844x390. Os ícones de `public/icons/` que gerei (emblema + "IF") deverão ser trocados por esses.
- Íris: no aparelho real, conferir o toque (alvo de 44 px, rótulos legíveis ao sol, `.acendeu`) e se o iOS mostra o rótulo em Barlow Condensed (a fonte é carregada pelo jogo antes do 1º quadro).

> **Correção (2026-10-22):** a falha de `tipografia.spec.ts:39` que atribuí à porta 5173 escrita no teste não era só isso: depois do porte do toque, o `#esq` deixou de herdar a fonte do jogo e o teste via "Times New Roman". Corrigido em `src/input/toque.css` e re-verificado numa instância em 5173 (ver `docs/handoff-lyra-baloes.md`).
