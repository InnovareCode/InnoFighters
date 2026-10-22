---
name: amostras-reais
description: Camada de amostras reais (samples CC0) dos sons da luta (2026-10-22): plano anota, execução decide; banco lazy; ataque real no buffer; calibração de ganho; armadilhas
metadata:
  type: project
---

Handoff: `docs/handoff-vega-amostras.md`. Chave `AMOSTRAS_REALISTAS = true` (`src/audio/chaves.ts`, rollback por código, sem menu/URL). Pacote real em `public/assets/sons/` (curado pelo Apolo, 88 ids, 783 KB, CC0).

**Desenho (não repetir o raciocínio):**
- `planoSonoro(ev, ctx, dados, amostras = false)`: com `false` o plano é o de antes (testes e oráculos intactos); com `true` anota `item.amostra` (`PedidoAmostra`), `amostraModo` (`trocar`/`sobrepor`), `plano.trocas` e itens de receita vazia (corpo da magia, queda do KO). Quem decide é `tocarItem`/`tocarTroca` (buffer pronto = amostra; senão a síntese). Família do especial = `sobrepor` (assinatura sintetizada a -6 dB, só ataque+corpo).
- Banco `src/audio/amostras.ts` é pedaço à parte (import em `camadas.ts`); registra-se em `identidade-sonora` por `registrarBancoDeAmostras` (mesmo padrão do motor de temas). Decode só com contexto, em fila; ataque real por varredura; `leve2/pesado2` = variantes.
- Manifesto ausente/HTML/rede = síntese total; inválido (id fora da tabela, sem origem, não-CC0, > 1,2 MB) lança só em DEV/CI (`falharAlto`, padrão `import.meta.env.DEV`); em PRODUÇÃO cai na síntese (chave `amostras=false`, retorna `false`). Causa raiz: `main.ts` faz `await Promise.all([fontes, camadas])`, rejeição = tela preta; JS em cache 10 min no Pages + deploy que muda o manifesto = id fora da tabela. Testes de fallback passam `falharAlto: false`.
- `reagirDoJogo`: confronto novo = par diferente OU `luta.t` menor que o do tick anterior (revanche do mesmo par retenta folha `falhou`, limite 3 pedidos). Escuta A/B só toca com `banco.folhasEmEspera([...])` vazio.

**Armadilhas:**
- Varredura de ataque a partir de `inicio - 40 ms` pega a cauda do vizinho se o MP3 não descarta o atraso (iOS): regra do vale de 10 ms. Testar com atraso injetado (1105/1681 amostras).
- Calibração: medir sintético e amostra no MESMO ponto (sfx x master 0,9); ganho pode pedir ±36 dB (`swing` sintético a -42 dBFS); teto de pico +1,5 dBFS (6 cortes presos).
- `src/audio` sem `Date.now`/`performance.now`/`Math.random` (busca estática em `trailer-diretor.test`).
- Teste no Chromium via Vite dev: não importar módulos internos pela URL direta (instância duplicada por `?t=`); usar `camadas.reagirDoJogo`.
- Python no Windows reescreve LF->CRLF; usar `newline=''` ou Edit. Heredoc com crase quebra.
- `tests/support/audio-offline.ts` ganhou `playbackRate`, `start(t, offset, dur)` e `Buffer.duration` (caminho antigo bit-exato quando não usados).

**How to apply:** mudou plano/execução -> rodar `sons-amostras-*`, `sons-s1`, `sons-integracao`, `sons-temas-ligacao`. Pacote novo do Apolo -> copiar para `public/assets/sons/`, rodar `SONS_DIAG=1 CALIBRAR_ESCREVER=1 npx vitest run tests/unit/sons-amostras-volume.test.ts -t imprime` e depois a suíte. Falta: iPhone, ouvido do dono, e2e.
