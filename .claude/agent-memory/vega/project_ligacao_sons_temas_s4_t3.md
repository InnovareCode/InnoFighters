---
name: ligacao-sons-temas-s4-t3
description: S4/T3 entregues (2026-10-21): sons e temas SEMPRE ligados por decisão do dono, camadas lazy, desbloqueio iOS, painel ?escuta=1, armadilhas de medição e de teste
metadata:
  type: project
---

Handoff: `docs/handoff-vega-sons-temas-ligacao.md`. `IDENTIDADE_SONORA` e `TEMAS_POR_LUTADOR` = `true` em `src/audio/chaves.ts` (só rollback por código; sem menu, sem URL; `?sons`/`?temas` foram removidos). `?escuta=1` = painel do dono (`src/ui/escuta.ts`).

**Why:** o dono decidiu no meio da tarefa que tudo fica ligado. iPhone (WebKit) é o aparelho dele e NÃO foi testado (sem WebKit na máquina).

**Armadilhas (não repetir):**
- `AudioSys` não importa mais os temas: `temas.ts` se registra por efeito colateral (`registrarMotorDeTemas`). Teste que usa `startMusic('tema:x')` precisa importar `src/audio/temas` (senão cai na `fight` em silêncio).
- Agendar o 1º passo no `startMusic` (folga 0,12 s + scheduler síncrono) muda o significado de `audio.nextTime` depois do start: medir pelos instantes reais dos passos (espiar `playTema`), não por `nextTime`.
- Tempo de tick em Node varia 5x entre execuções: referência = mediana de 5 da `fight`, tema = melhor de 3, mais piso de ruído; o critério forte é determinístico (nós/s, fontes por passo).
- WebKit não destrava `AudioContext` em `touchstart`, e o `preventDefault` nele suprime o `click`: `src/platform/audio-desbloqueio.ts` (touchend/click/tecla) e `resume()` também para `interrupted`.
- `import()` tardio: só `TypeError` (rede) cai no rollback; erro de validação dos dados deve derrubar o boot.
- Arquivos de `src/audio` são CRLF: editar com a ferramenta Edit (preserva) ou normalizar depois de editar por script; scripts Node em heredoc com crases quebram, usar Write/Edit.
- Outra frente (tela-cheia/options/contexto/persistencia) editou `src/` em paralelo mesmo com a Lyra "ociosa": conferir `git status` antes de culpar teste vermelho.

**How to apply:** mudou chave/camada -> rodar `sons-temas-ligacao`, `cena-luta-sons-temas`, `sons-integracao`, `musica-orcamento`. Falta: N3 da Íris com CPU 4x, e2e, escuta e teste no iPhone.
