---
name: desempenho-android-d1-d3
description: D1/D2/D3 de fluidez no Android (RS adaptativo, gradientes em cache, prewarm da folha FILME): o que a medição headless mostra e NÃO mostra, armadilhas de método e de edição
metadata:
  type: project
---

Entrega de 2026-10-24 (docs/desempenho-android-2026-10-24.md §8). Código: `src/render/tela.ts` (política/degraus), `resolucao-adaptativa.ts` (governador), `gradientes.ts`, `assets/canvas.ts` (`aquecerTextura`).

- **A bancada headless (CDP 4x) NÃO enxerga ganho de pixel.** O throttle só pega a thread principal; o raster fica no processo de GPU/SwiftShader sem throttle. RS 2 -> 1,5 -> 1 deu o MESMO callback (luta 5,6-6,7 ms, seleção 9,6-10,7 ms). O que a bancada mede de verdade: chamadas de contexto por quadro, save/restore, gradientes, engasgos de 1ª vez. Ganho de Mpix (8,8 -> 4,9 -> 2,2) é aritmética, não medida no aparelho.
- **Por isso o governador exige que descer ADIANTE** (`GANHO_MINIMO` 10%, motivo `ineficaz`, bloqueio 600 s): se o p95 não cai depois de baixar a resolução, o gargalo é a thread principal e baixar só borra a imagem.
- **Prewarm funciona e é o maior ganho medido:** `aquecerTextura` (1 px num canvas 2x2 + getImageData) ao carregar a página FILME. 1º especial: maior intervalo 449-591 ms -> 80-93 ms; KO com filme 487-667 ms -> 70-115 ms (3 rodadas alternadas, `estreia.mjs`). O custo (~1 s a 4x) cai na transição, não na luta.
- **`ctx.setTransform(DOMMatrix)` por pétala custou MAIS que save/restore;** passar os 6 números (`const {a,b,c,d,e,f} = ctx.getTransform()`) resolveu. Pétalas: 34 pares save/restore -> 1 par, pixel idêntico (fidelidade verde).
- Saldo de chamadas/quadro na luta (contador DEV, 1x): 472 -> 394 (-17%), save 60 -> 27, fillStyle 76 -> 44, gradientes lineares 11,3 -> 6,3. HUD/texto em cache de bitmap NÃO é pixel-exato (AA de borda em alfa pré-multiplicado): descartado.
- Seleção (25-28% de quadros lentos) é custo de TEXTO (texto/T/wrap ~40% do draw), não de pixel; fica como está, sem cache exato viável.
- Reflexo do lutador no piso (0,15 de alfa, redesenha o sprite) é pulado só no degrau mais leve (`qualidadeReduzida()`, rs < 1,25); desktop e degraus 2/1,5 desenham tudo.
- Suavização 'low' foi trocada por 'medium' no degrau 1 (mipmap evita serrilhado em sprite reduzido ~9x); desktop segue 'high'.

## Armadilhas de método/edição
- **Playwright 'celular' (Pixel 7, hasTouch) é aparelho de toque -> RS 1,5.** Specs com `/ 2` fixo ou `getImageData(0,0,1920,1080)` precisam de `&rs=2` na URL (13 falharam; corrigido em chefoes-l1e1, logo, plataforma-render-assets, selecao-aleatoria, zenon-z2z3, fumaca).
- **Microbench de desenho:** `manual=1` (sem laço do jogo) + laço de rAF próprio chamando `h.desenhar(1)`; NUNCA `getImageData` a cada quadro (o canvas cai para software e os números ficam absurdos, 90 ms).
- Ruído da bancada é de ±20% entre rodadas: só vale mediana de 3-5 rodadas intercaladas antes/depois.
- **Repositório mistura CRLF e LF por arquivo** (texto.ts, tela.ts, lutador.ts são CRLF). `grep -c $'\r'` no Git Bash devolve 0 mesmo assim. Edição Python com trecho de várias linhas FALHA EM SILÊNCIO se não normalizar `\r\n`; usar `assert a in s` e a ferramenta Edit.
- O Atlas comitou no meio da tarefa e varreu um `playwright.lyra.config.ts` temporário (c4139cb): config temporária de e2e vai para o scratchpad ou para uma pasta ignorada, nunca na raiz.
