---
name: project-service-worker-t7
description: T7 - service worker do InnoFighters (manifesto de revisoes, troca segura, kill switch ?sw=0, SW aposentado INNO_SW=off) e armadilhas de prova
metadata:
  type: project
---

2026-10-24 (T7 de docs/orcamentos-2026-10-23.md). Desenho completo em `docs/service-worker.md`. Pecas: `src/sw/{logica,sw}.ts`, `src/platform/sw.ts`, `ferramentas/sw/{manifesto,cli}.mjs`, plugin `serviceWorker()` em `vite.config.ts`, hook `definirAtualizadorSw` em `src/versao.ts`, 1 linha em `src/main.ts`.

- `sw.js` carrega `sw-manifesto.js` por importScripts (os bytes dos dois entram na checagem de update do navegador): arte nova = SW novo. Registro com `updateViaCache:'none'` (Pages cacheia 10 min).
- HTML vem do shell DA VERSAO (nao network-first como a tabela da T7): HTML novo + SW velho serviria arte velha com JS novo. Troca so a pedido da PAGINA: janela de boot de 20 s, ou botao atualizar (tecla U nas Opcoes). Trava de 15 s entre trocas por aba.
- `npm run orcamento`: `jsExcluidos` agora `["escuta","sw"]` (sw.js e sw-manifesto.js nao contam no js-total).
- T4 (boot em etapas) nao existia: o shell sai do index.html construido; quando a T4 exportar a lista da etapa 0, entra por `extras` em `gerarManifesto`.

**Armadilhas:**
- Git Bash converte `--base=/InnoFighters/` em `C:/Program Files/Git/InnoFighters/` (build com base quebrada, jogo nunca fica pronto). Use `MSYS_NO_PATHCONV=1` nos builds locais com base; a CI (Linux) nao sofre.
- `vite preview --outDir X` serve na base do config (`/`): para build com base passar `--base /InnoFighters/` no preview tambem.
- Prova de SW: proxy contador que da `socket.destroy()` e o offline de verdade; `ctx.setOffline` nao prova nada sobre o SW.
- 1 falha nao reproduzida na primeira rodada (versao em espera nao assumiu no boot seguinte, codigo antigo, maquina carregada); depois passou 3x seguidas. Mitigacoes: handler `updatefound`, segunda olhada em `ready`, `console.warn` no registro. Se reaparecer, olhar o console `[sw]`.
- Spec `tests/e2e-build/service-worker.spec.ts` espera >20 s para sair da janela de boot; mexer na janela (`JANELA_DE_BOOT_MS`) ou na trava exige ajustar o spec.

**Why:** meta 5c (2a visita <= 0,1 MiB) e offline para o iPhone do dono. **How to apply:** ao mudar o shell, a CSP ou o plugin, rodar o spec e a prova com proxy; antes de promover a EasyPanel, servir `sw.js` com `no-cache` e revisar `worker-src`.
