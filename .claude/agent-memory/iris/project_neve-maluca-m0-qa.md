---
name: neve-maluca-m0-qa
description: QA do portao M0 do Neve Maluca (2026-10-22): numeros de referencia, o que e artefato de ambiente, armadilhas da harness e achados para o M1
metadata:
  type: project
---

Projeto em C:\Projetos\Web\InnoGames\NeveMaluca (porta dev 5273, preview 4273; vitest 338 unit, e2e-build 18, e2e 91 + 2 skip de proposito).

- Clone limpo (git init + commit numa copia, git clone, npm ci, npm run verificar) fica verde: prova que nada depende de arte-fonte/ e que LF funciona. Copia sem .git sai com commit "dev".
- Armadilha: `grep -c $'\r'` dentro de `while read` no git-bash da falso positivo em todos os arquivos. Usar `tr -cd '\r' < f | wc -c`. CRLF real em 2026-10-22: 8 arquivos da Vega (core/constantes, laco, rng, trig + 4 testes); .gitattributes (`* text=auto eol=lf`) normaliza no commit.
- Fps (Chromium, 844x390, preview, CPU 4x): software p95 33,4 ms (12% dos quadros >20 ms, media 53 fps); SwiftShader GL p95 16,8; 1x software 16,8. CONTROLE: fillRect cheio no software 4x = p95 16,8, mas drawImage 1920x1080 por quadro = 33 ms. Ou seja o "piso do ambiente" e o blit cheio, nao qualquer fillRect (a afirmacao da Lyra de que fillRect da 33 ms NAO reproduz).
- WebKit do Playwright no Windows: o jogo faz ~35-43 fps (sintetico equivalente faz 54-60); custo esta no compositor, nao no JS (cena.desenhar mede 0 ms). Nao isolado; so o iPhone do dono responde.
- screenshot do Playwright no WebKit injeta <style> e gera "violacao de CSP" falsa (style-src-elem inline): nao medir CSP com screenshot no mesmo run.
- WebKit refaz o download das 2 fontes pre-carregadas (preload nao casa) + warning de console: ~46 KB de desperdicio. Menor.
- Bug real achado: `textoDoErro` usa `e.stack ?? e.message`; no WebKit a stack NAO tem a mensagem, entao erro em tempo de execucao na #err do iPhone aparece so com nomes de funcao. Erros de import (window 'error') mostram a mensagem.
- Laco: platform/laco.ts (clampa dt) x core/laco.ts (clampa acumulador + FOLGA 1e-6). Em 60 Hz exato a platform da 0/2 ticks (3599 em 3600 quadros, maxP=2); a 95 ms fixo simula 3,6% mais ticks; sequencia 95,1,95,1 diverge 130 ticks. Replay exato nao depende do laco (reexecuta update por comando). Comentario de platform/laco.ts cita tests/unit/integracao-laco.test.ts que nao existe.
- Mutacao do boot em build (3 motores): trig hash, catalogo save duplicado, throw no boot, throw no tick 31 -> #err visivel; controle sem o import erros-no-carregamento fica mudo. Prova que a ordem de imports do main.ts importa.
- Docs do Apolo (docs/direcao-arte..., relatorio-curadoria-capi-f*) continuam mudando durante o QA: listar por git ls-files -o no momento do commit.
- Limpeza: `rm -f "$S/$f"` com variavel e bloqueado pela checagem de seguranca; usar caminho literal. O scratchpad da sessao e compartilhado com lixo de outras sessoes: nunca apagar com curinga.
