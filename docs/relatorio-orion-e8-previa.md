# Relatório Órion — E8 prévia (auditoria somente leitura, 2026-10-21)

Resumo salvo pelo Atlas a partir da devolução do Órion (que não pôde gravar o arquivo). Escopo: storage v2 e `src/meta`,
CLI de sprites e `sharp`, workflows e `.gitignore`, exposição do site público de teste.

**Veredito: 0 CRÍTICO, 0 ALTO, 3 MÉDIO, 12 BAIXO, 2 SUGESTÃO. O site de teste pode continuar no ar. Antes do EasyPanel ou de
usuários reais: corrigir M1 e M3 e decidir M2.**

## Verificado e bem
- Sem poluição de protótipo (PoC em Node com `__proto__`); regex de ids sem ReDoS; saneador linear; teto de 32 ids desconhecidos.
- Sem `innerHTML`/`eval`/`new Function` em `src/`; única rede é `fetch` same-origin; nada enviado a terceiros, sem PII.
- Migração v1/legada não perde recorde (a legada só é apagada depois de gravar a v2).
- CLI de sprites: `id` validado por `/^[a-z0-9-]+$/`, sem `child_process`/rede. `git ls-files` sem `.env*`, `arte-fonte/`, `.missao-atual`,
  `dist/`, `.map`; histórico sem segredos; `npm audit` com 0 vulnerabilidades.
- Site público: HTTPS/HSTS; `/PROGRESSO.md`, `/docs/`, `/package.json`, `/.claude/` dão 404 (só `dist/` é publicado).

## MÉDIO
- **M1** `src/core/storage.ts:36-38`: `rounds`/`time`/`diff` aceitam qualquer número; `rounds` enorme faz o HUD (`src/render/hud.ts:91`)
  iterar bilhões de vezes por quadro e trava a aba. Correção: aceitar só os valores da UI (`rounds` 1..3, `time` 0/30/60/99, `diff` 0..2,
  inteiros), `Math.min(winsNeeded, 5)` no HUD, teste de regressão (1e9, 0, -1, 2.5, diff 99).
- **M2** Repositório PÚBLICO expõe `PLANO.md`, `PROGRESSO.md`, `docs/` (propostas, mecânicas, prompts de arte), `.claude/agent-memory/*`, o
  protótipo e a arte de `public/assets`. Sem credencial nem PII; risco de propriedade intelectual/roadmap. Sem `LICENSE`. **Decisão do dono.**
  Sugestões: Secret Scanning + Push Protection, regra de não gravar ids de conta/créditos/e-mail nas memórias dos agentes, `LICENSE`,
  tornar o repo privado ao entrar no EasyPanel.
- **M3** `src/core/storage.ts:180-184`: `lerV2` devolve `undefined` para `v !== 2` (ex.: `v:3` de build futuro) ou JSON corrompido; o fluxo
  cai na v1 e SOBRESCREVE `inno-fighters-v2` com progresso vazio. Correção: não sobrescrever `v > 2`; copiar a v2 corrompida para
  `inno-fighters-v2-quebrada` antes de substituir; teste.

## BAIXO
- B1 `controles` sem teto (campo morto) e `main.ts:72` ignora retorno `false` de `salvar` (quota cheia sem aviso).
- B2 `salvarDadosV2` não saneia `s` nem `hi` na gravação. B3 `hi` aceita 1e308/fracionário (contamina `max(v1,v2)`).
- B4 ids "futuros" injetáveis em `desconhecidos` (cosmético, aceito).
- B5 `--folha f2=arquivo` aceita `..` (`ferramentas/sprites/cli.mjs:36-38,53`). B6 guarda "recuso gravar em public/assets" por regex sensível a
  maiúsculas (`cli.mjs:60`): usar `path.relative` contra `sprites-gerados`. B7 numéricos do CLI sem faixa. B8 lookup em objeto comum
  (`executar.mjs:182,21-26`): usar `Object.hasOwn`. B9 `sharp@0.35.5`: `engines.node` deveria ser `>=20.9.0`; considerar `limitInputPixels`/`failOn`.
- B10 `ci.yml` sem `permissions: contents: read`. B11 `pages.yml`: permissões por job, `cancel-in-progress: false`, deploy não roda `npm test`.
  B12 actions por tag móvel (pinar por SHA + Dependabot).
- S1 sem `dependabot.yml`/`SECURITY.md`/`LICENSE`. S2 `.gitignore` sem `.claude/settings.local.json`, `*.pem`, `*.key`, `*.log`.
- Site: source map público (`vite.config.ts:6`; ok enquanto o repo é público; `sourcemap:'hidden'` ao privar); sem CSP/`nosniff` (Pages não permite
  cabeçalhos; CSP por `<meta>` validando com o e2e); adicionar `<meta name="robots" content="noindex">`; origin compartilhada
  `innovarecode.github.io`; perfil `innofighters-celular` (`--host 0.0.0.0`) expõe o projeto na LAN.

## Não verificado (dono/Vulcano)
Configurações do GitHub: permissões padrão das Actions, proteção da `main`, Secret Scanning/Push Protection, 2FA da conta `InnovareCode`,
outros sites em `innovarecode.github.io`. Não avaliou `src/assets/manifesto.ts` a fundo nem a lógica dos lutadores novos ainda não commitados.
