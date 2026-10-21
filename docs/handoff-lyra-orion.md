# Handoff Lyra — achados do Órion na UI (B1 `main.ts`, HUD `hud.ts:91`, CSP)

RESULTADO:
- HUD (`src/render/hud.ts`): marcadores de round limitados por `MAX_MARCADORES_ROUND = 5` (`Math.min(winsNeeded, 5)`). Teste em `tests/unit/render-luta.test.ts` (1e9 → 10 arcos sem travar; 5/6/Infinity → 10; 0/-1/NaN → 0). Mutante (teto 6) morre.
- Aviso "progresso não salvo":
  - `src/ui/persistencia.ts` (novo): `criarPersistencia(armazenamento, inicial, regras, aoFalhar)`. `salvar()` devolve o booleano de `salvarDadosV2` e chama `aoFalhar` quando for `false` (cota/modo privado OU v2 `v>2` de build mais novo, recusa de propósito). `MSG_NAO_SALVO = 'Progresso não salvo neste aparelho'`.
  - `src/platform/aviso.ts` + `aviso.css` (novos) e `<div id="aviso" role="status" aria-live="polite" hidden>` no `index.html`: faixa pequena no centro-base, `pointer-events:none`, some em 6 s; repetir só renova o prazo (um timer, sem empilhar).
  - `src/main.ts` usa os dois; `Persistencia.salvar()` agora é `(): boolean` em `src/ui/contexto.ts` (e `tests/unit/_ui.ts` devolve `true`). Os 10 chamadores de `persist.salvar()` nas cenas seguem ignorando o retorno de propósito (o aviso já sai sozinho).
  - Testes: `tests/unit/aviso-persistencia.test.ts` (9; 3 mutantes mortos), `tests/e2e/aviso.spec.ts` (desktop e celular deitado 915x412: canvas não se mexe, aviso dentro da janela, não cobre joystick/botões, não pega ponteiro, some sozinho).
- CSP (`vite.config.ts`, plugin `cspSoNoBuild`, `apply: 'build'`): `<meta http-equiv="Content-Security-Policy">` injetada em `head-prepend` SÓ no build (o dev server não leva: HMR injeta script inline). Política = exatamente a sugerida pelo Órion, sem nenhuma alteração (`POLITICA_CSP` exportada).
  - Validação contra o BUILD: `playwright.build.config.ts` + `tests/e2e-build/csp.spec.ts` + script `npm run test:e2e:build` (o e2e normal roda no dev server e por isso nunca veria a CSP). Cobre: meta no HTML e antes de qualquer script; sem script inline no build; política ATIVA (script inline, script externo e fetch externo bloqueados, com violação registrada); jogo inteiro (carga da arte WebP/JPG/PNG/JSON todos 200, AudioContext criado, menu, seleção, luta) com ZERO `securitypolicyviolation`, zero erro de console e zero request falho; o aviso sob a CSP.
  - Exceções (nenhuma foi necessária além da política sugerida):
    - `style-src 'unsafe-inline'`: o `<style>` do `index.html` (tamanho do canvas antes do JS subir) e o `style="..."` do `<pre id="err">`. Só estilo; script segue travado em `'self'`. Para tirar: mover os dois para CSS e trocar o atributo por classe (não feito: mexe no layout inicial; sem ganho de segurança relevante).
    - `img-src data: blob:`, `media-src blob:`, `connect-src 'self'`: HOJE não são usados (imagens por `new Image()` de URL do próprio site, JSON por `fetch` same-origin, áudio sintetizado por `AudioContext`; nem Worker nem blob no código). Ficaram porque o Órion sugeriu e são folga barata; podem ser apertados (`data:`/`blob:` fora) se o dono quiser a política mínima.
  - O que o `<meta>` não cobre: `frame-ancestors`, `report-uri`, `sandbox` (só por cabeçalho). Ao entrar no EasyPanel, servir a política como cabeçalho (mesma string de `POLITICA_CSP`) e acrescentar `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`.
- Verificado (nível): `tsc --noEmit` limpo; `vitest` do meu escopo 81/81 (render-luta, aviso-persistencia, ui, e4-ui); `npm run test:e2e` 74 passed / 36 skipped / 0 failed e `npm run test:e2e:build` 5/5, ambos em navegador real (Chromium). Suíte `vitest` inteira: 5 falhas, todas em `tests/unit/chefe-adversarial.test.ts` (frente da Vega, fora do meu escopo).

PARA O PRÓXIMO (Íris):
- Em navegador real, sem hook: pôr o navegador em modo privado/bloquear gravação (ou encher a cota), abrir OPÇÕES e mexer num valor → aparece "Progresso não salvo neste aparelho" no centro-base, não impede jogar nem tocar, some em ~6 s; mexer de novo renova.
- Com um `inno-fighters-v2` de `v:3` no localStorage: o aviso aparece ao salvar e o disco fica intacto (já coberto por teste de unidade; falta olho humano no visual em celular real).
- Rodar `npm run test:e2e` e `npm run test:e2e:build` UM POR VEZ (o segundo faz `npm run build` e sobe `vite preview` em 4173).
- Aviso em retrato sobe 44 px para não bater no "vire o aparelho" (`#rot`); medido só em paisagem 915x412 e desktop 1280x720.

PENDÊNCIAS:
1. Decisão do dono (UX, herdada do Cronos): com `v>2` o jogador de build antigo joga sem salvar nada; agora ele ao menos é avisado. Mensagem única para as duas causas (cota e build mais novo); se quiserem textos diferentes, `salvarDadosV2` teria de devolver o motivo (arquivo da Cronos, `src/core/storage.ts`).
2. Quando o repo for para o EasyPanel: a CSP passa a cabeçalho (ver acima); o `Content-Security-Policy` por `<meta>` pode ficar como defesa em profundidade.
3. Não coberto: `style-src` sem `'unsafe-inline'` (ver exceções).

APRENDIZADO:
- `position:fixed; left:50%; transform:translateX(-50%)` SEM `width:max-content` encolhe-para-caber só em 50% da tela: a frase quebrou em 2 linhas no celular (41 px de altura, medido; o teste de altura < 40 pegou). Padrão: faixa centralizada por `left:50%` precisa de `width:max-content` + `max-width`.
- A CSP por meta precisa ser validada contra o BUILD: o e2e padrão roda no dev server (sem a meta) e passaria verde mesmo com a política quebrando o jogo. `playwright.build.config.ts` existe por isso. `page.evaluate` do Playwright NÃO é barrado pela CSP para `eval` (rodou); para provar que a política está ativa use `<script>` inline, `<script src>` externo e `fetch` externo e leia `securitypolicyviolation`.
- e2e longo (`expansao.spec.ts` "5 rivais...", `jogo.spec.ts`) quebra por recarga do HMR quando outro agente edita `src/` durante a execução ("Execution context was destroyed", "Cannot read properties of undefined (reading 'ui'/'mundo')"): não é defeito do código. Contorno que deu a suíte inteira verde: subir um vite com `server.watch:null, hmr:false` na porta 5173 (config fora do repo) e deixar o Playwright reaproveitá-lo (`reuseExistingServer`). Matar o servidor depois.
