# Service worker (T7, PLANO F4)

Faz a 2ª visita abrir sem rede e sem baixar a arte de novo (meta 5c de `docs/orcamentos-2026-10-23.md`: 2ª visita <= 0,1 MiB).
Código: `src/sw/logica.ts` (decisões puras), `src/sw/sw.ts` (eventos), `src/platform/sw.ts` (registro, kill switch, troca),
`ferramentas/sw/` (manifesto de revisões), plugin `serviceWorker()` em `vite.config.ts`.

## Como funciona

| Peça | Regra |
|---|---|
| Build | Depois do `vite build`: compila `src/sw/sw.ts` para `dist/sw.js` (sem hash no nome) e grava `dist/sw-manifesto.js` com o **hash do conteúdo** de cada arquivo (`revisoes`). Os arquivos de `public/` não têm hash no nome; é este hash que diz que a arte mudou. |
| Troca de bytes | `sw.js` carrega o manifesto por `importScripts`; o navegador compara os bytes dos dois, então **arte nova = SW novo**. Registro com `updateViaCache: 'none'` (nem o `sw.js` nem o manifesto passam pelo cache HTTP de 10 min do Pages). |
| Install (shell) | Baixa o `index.html` (`cache: 'reload'`; só vale se citar o JS de entrada desta versão) e o que ele puxa: JS de entrada, modulepreload, CSS, fontes, splash, ícones e manifest do app, mais os **extras da etapa 0** do boot (`src/assets/etapa0.mjs`, desde `c058ac9`). Total: 34 arquivos, 1,51 MiB (relatado pela coordenação; confirmar no log do build). Falhou qualquer parte: o install falha e a versão anterior segue. A lista sai do **próprio `index.html` construído** e dos extras do build. |

**Lista da etapa 0.** `src/assets/etapa0.mjs` é a única lista: o boot monta as URLs a partir dela, e o build passa `arquivosDaEtapa0(dist)` ao `extras` de `gerarManifesto` (`vite.config.ts:112`). Um pedaço da etapa 0 que o build não gera derruba o build, então o SW nunca pré-carrega menos do que o boot baixa. `ferramentas/sw/cli.mjs` herda essa lista do `shell` do manifesto que já está no dist (`shellAnterior`, `ferramentas/sw/cli.mjs:13`; `--sem-extras` desliga). Ele não recalcula a etapa 0 sozinho. O comentário de cabeçalho do `cli.mjs` ainda cita `src/assets/etapa0.ts` (o arquivo é `.mjs`): comentário a corrigir, não tocado aqui.
| Arte e JS | Qualquer arquivo do manifesto: **cache-first** na chave `URL?__rev=<hash>`. Miss: baixa com `cache: 'no-cache'` (o cache HTTP pode ter a arte da versão anterior), responde e guarda só resposta 200 que não seja HTML. **Só se guarda o que foi usado**: nada de pré-baixar o elenco ou as 10 páginas FILME (OR-7). |
| 1ª visita | O que a página baixou antes de o SW assumir não passou por ele. A página manda a lista do Resource Timing (3 vezes: ao ficar pronto, +8 s, +30 s) e o SW guarda o que ainda falta, **só se o `{commit, data}` da página for o da versão do SW**. |
| `index.html` | Vem do **shell da versão** (qualquer `?query`; `?trailer=`, `?residencia=`, `?motorv2=`, `?v=` seguem valendo). Não é network-first como a tabela da T7 dizia: um HTML mais novo que o SW pediria arte que o SW ainda serve na revisão velha (JS novo + arte velha). |
| `version.json` | Nunca interceptado: vai sempre à rede (offline o jogo mostra "versão desconhecida"). |
| Não toca | POST, `Range`, outra origem, fora do escopo, arquivo que o build não conhece. |
| Escopo | `import.meta.env.BASE_URL`: `/` no EasyPanel, `/InnoFighters/` no Pages. Tudo é relativo ao escopo. |
| CSP | `worker-src 'self'` (em `vite.config.ts` e em `tests/e2e-build/csp.spec.ts`). |

## Atualização sem misturar arte

1. Versão nova instala **em espera** (shell novo em outro cache; o cache da arte é por revisão, então não colide com a anterior). A página aberta segue na versão velha.
2. Quem pede a troca é a **página**, nunca o SW: no boot (primeiros 20 s, antes de qualquer luta) se há versão esperando ou ela acaba de instalar, ou no botão **atualizar** das Opções (tecla U; `recarregarSemCache` agora passa pelo SW). `controllerchange` recarrega a página. Travas: só com controlador anterior, e no máximo uma troca por 15 s por aba.
3. Ao ativar: apaga o shell das outras versões, caches `inno-*` desconhecidos e, no cache da arte, toda entrada com revisão que o manifesto novo não tem. O que não mudou não é baixado de novo.
4. Fora da janela de boot a versão nova só espera; assume no boot seguinte ou no botão. **Limite conhecido:** com 2 abas abertas, a aba que fica na versão velha passa a ser servida pelo SW novo (arte nova + JS velho) até recarregar; não há troca no meio da luta, mas essa aba precisa recarregar. Aceito (jogo de uma aba).

## Desligar

| Como | Efeito |
|---|---|
| `?sw=0` | Desregistra, apaga os caches `inno-*`, grava `inno-sw=0` no localStorage e recarrega uma vez. **Fica desligado nas visitas seguintes** até `?sw=1` (que religa e apaga a flag). |
| `INNO_SW=off npm run build` | Gera o **SW aposentado**: ao ativar apaga os caches, se desregistra e recarrega as páginas. É o rollback de emergência por deploy para quem já tem o SW instalado. |
| `vite dev`, e2e com servidor de dev | Não registra (`import.meta.env.PROD`), então não contamina a medição de memória. |

## Conferir

```
npm run build                         # log: "sw: dist/sw.js + sw-manifesto.js (versao ..., N arquivos com revisao, shell de M ...)"
node ferramentas/sw/cli.mjs --dist=dist   # regera o manifesto à mão
npm test -- service-worker            # lógica pura + gerador
npm run test:e2e:build -- service-worker  # instala, abre offline, troca de versão, ?sw=0 (no Chromium)
```

`npm run orcamento` ignora `sw.js` e `sw-manifesto.js` no `js-total` (`jsExcluidos`).

## Hospedagem

- Servir `sw.js` com `Cache-Control: no-cache` é bom, mas não obrigatório (`updateViaCache: 'none'`).
- Servidor com "fallback de SPA" (200 + `index.html` para arquivo que não existe) não envenena o cache: resposta HTML para caminho que não é `.html` não é guardada.
- Em HTTPS ou `localhost` apenas (regra do navegador). iOS: a cota do Cache API é desconhecida; medir no aparelho (T13) antes de pensar em baixar o elenco inteiro.

## Medido (Chromium, `vite preview` atrás de um proxy que conta bytes e corta a rede; build de 2026-10-24)

| O que | Resultado |
|---|---|
| Shell (antes da T4) | 15 arquivos, 0,73 MiB; 153 arquivos com revisão; `sw-manifesto.js` 9,1 KiB; `sw.js` 4,4 KiB |
| Shell (c058ac9, com a etapa 0) | 34 arquivos, 1,51 MiB (relatado; confirmar no log `sw-manifesto.js` do build) |
| 1ª visita (até o título e a seleção, ~35 s) | 6,6 MiB pela rede; 56 arquivos guardados (só os usados; 0 páginas FILME) |
| 2ª visita, online | 0,1 KiB (`version.json` e as 2 checagens do SW, 304): meta 5c <= 0,1 MiB cumprida, também sob `/InnoFighters/` |
| Offline (rede cortada de verdade) | título, seleção e luta abrem e desenham; `?trailer=&residencia=&motorv2=` preservados |
| Troca de versão (1 arquivo da arte mudou) | 6,3 KiB; só o arquivo mudado foi baixado; revisão velha e shell velho apagados |
| Versão em espera assumindo no boot seguinte | 3 de 3; o botão atualizar (tecla U nas Opções) troca pelo SW, sem `?v=` |
| `?sw=0`, `?sw=1`, SW aposentado | desregistra e limpa; a flag persiste; o aposentado limpa quem já tinha o SW |

Não medido: Safari/WebKit e Firefox, iPhone (cota do Cache API), 2 abas abertas durante a troca, servidor real do EasyPanel.
