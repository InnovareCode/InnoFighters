---
name: ritmo-r1-r2-tarja-sem-congelar
description: R-1 (contador __ritmo) e R-2 (tarja sem congelar + provocação sobreposta) do redesenho de jogabilidade — armadilhas de e2e e decisões de arquitetura
metadata:
  type: project
---

Implementação de `docs/spec-redesenho-jogabilidade.md` R-1/R-2 (24/10/2026), atrás de `Regras.ritmo.tarja`/`.provocacao`
(`src/meta/tipos.ts`+`regras.ts`, `?ritmo=`). Novo: `src/render/faixa-ritmo.ts` (banner que NÃO bloqueia `game.update`,
reaproveitando `Cinematica.fundoDaTarja` — wrapper público novo em `cinematica.ts` sobre o `tarja()` privado, mesmo
cache de até 6 entradas) e `src/ui/cenas/ritmo-contador.ts` (classificador puro `motivoDoTick` + `window.__ritmo`,
só DEV). `fight.ts` roteia: com a flag, `reagirAoEspecial` chama `faixaRitmo.iniciar` em vez de `cine.iniciar` e NÃO
retorna cedo no loop de `update()` — a luta anda no mesmo tick. Provocação do round 1 (CURTA, D-R8): com a flag,
cai no mesmo fluxo (não retorna cedo), ficando sobreposta ao `intro`; a COMPLETA (1º confronto ARCADE/chefão)
continua bloqueando, sem mudar (decisão de escopo, não só técnica — ver spec).

**Achado de arquitetura (vale para qualquer geometria nova):** o canvas tem buffer FÍSICO FIXO
(`prepararCanvas`: `LARGURA*RS x ALTURA*RS`, RS=2 → 1920×1080), **independente do viewport**. `ajustarEscala`
só troca o CSS (`calcularTamanhoCss`, letterbox). Por isso medir geometria via `getImageData` do canvas dá o
MESMO resultado em 960×540 e em 844×390 — não prova nada diferente entre os dois. O que REALMENTE varia por
viewport é se o letterbox ainda cabe sem cortar: isso se prova com `page.locator('#jogo').boundingBox()` +
`page.viewportSize()`, não com pixel dentro do canvas. [[armadilhas-ui-innofighters]]

**Armadilha de e2e: `intro` dura 90 ticks e ignora ataque.** Um `h.avancar(20)` antes de tentar `page.keyboard.down('b')`
não dá erro nenhum — só não faz nada (o motor ignora o botão). Esperar `game.phase === 'fight'` (loop
`while (g.phase !== 'fight') h.avancar(1)`) antes de qualquer tentativa de golpe/especial em `?manual=1`.

**Servidor isolado para e2e (porta própria, sem HMR):** `mergeConfig(viteConfigBase, { server: { port: N,
strictPort: true, hmr: false, watch: null } })` + playwright `webServer.command: 'npx vite --config X --host
127.0.0.1'`. Dois detalhes que custaram tempo: (1) sem `--host 127.0.0.1` o vite liga só em `::1`, e o
`webServer.url` do Playwright contra `127.0.0.1` nunca responde — o erro só diz "Timed out waiting Nms", sem
pista; (2) outros agentes já ocupam várias portas por perto de 5173 (vi 5199-5202, 5273 em uso) — conferir com
`netstat -ano | grep LISTENING` antes de fixar uma porta nova. O config do playwright/vite para isso não pode
morar fora do repo (`node_modules` não resolve de um caminho alheio) — crio na raiz do projeto, uso, e apago
antes de entregar (nunca committar).

**Input de teste em `?manual=1`:** os listeners de teclado são reais e independentes do laço `rAF` (que o
`?manual=1` desliga) — `page.keyboard.down('b')` + `h.avancar(n)` + `page.keyboard.up('b')` é o padrão já usado
em `tarja-motor-v2.spec.ts`/`provocacao.spec.ts` e funciona igual em passo manual. Não precisa (e é mais
arriscado) sobrescrever `entrada.lerP1` na mão.
