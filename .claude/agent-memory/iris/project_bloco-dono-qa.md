---
name: bloco-dono-qa
description: QA do bloco grande pos-64f2647 (B1 sons/temas/tela cheia/toque/logo/baloes, B2 trailer inerte) em 2026-10-22: separacao, defeito achado, numeros N3, armadilhas da harness
metadata:
  type: project
---

Separacao: so `src/audio/audio-sys.ts` mistura B1 e B2 (abertura = B2). B1 recebe um patch (`docs/commit-bloco-audio-sys.patch`, `git apply --cached`), B2 o arquivo inteiro. `partitura.ts` (so exports) e `package.json` (scripts trailer:*) sao B2. Listas em `docs/commit-{bloco,trailer,docs}-arquivos.txt`.

Defeito pego (B1): `tests/unit/marca-no-html.test.ts:43` faz `existsSync('arte-fonte/logo/webp-entregues-nao-usadas/og-v1-1200x630.jpg')`; `arte-fonte/` esta no .gitignore, entao `npm test` da CI (checkout limpo) fica vermelho. Conserto: apagar a linha ou `skipIf`. Padrao: teste unitario que le pasta ignorada pelo git.

Numeros (Chromium, CPU 4x, laco real, maquina ruidosa; p95 oscila 2x entre rodadas, a MEDIANA e estavel): custo mediana luta+sons+temas 6,7-7,1 ms vs HEAD 6,4-6,8 (hayato:min-ji), 7,8-8,1 vs 7,9-8,2 (caio:wei-long); balao mediana 0,8-1,1 (antigo) -> 1,2-1,7 (completa) / 2,1-2,2 (CURTA), 1o quadro do balao 52-193 ms a 4x; scheduler p99 do tema <= o da `fight` (0,6-0,9x); passo 0 do tema 18/18 sem atraso (-0,12 s de folga); fontes musica <=9 (HEAD 12), efeitos <=15; heap JS ~10,5 MB (+0,5 vs HEAD). Bundle: HEAD 339,53 kB; B1 329,57 + temas 31,23 + identidade 33,97 (+escuta 9,95 so no ?escuta=1); uniao 331,19 kB.

Armadilhas da harness: (1) `h.avancar`+provocacao: QUALQUER tecla pula a provocacao, entao o jogador simulado so pode digitar com `provocacao.ativa` falso; (2) CPU x CPU (`p1cpu` e `cpu`) NAO tem provocacao (`provocacaoLigada`), para medir balao usar `mode:'cpu'` sem `p1cpu`; (3) no laco real, `ctx.close()` com SwiftShader saturado trava minutos: ir a `about:blank` e fechar o browser inteiro com prazo, um browser por rodada; (4) BFS do grafo de audio tem que ser memoizado; (5) `pkill` nao existe no git-bash, matar por `Get-CimInstance ... CommandLine` (nao casar o proprio powershell); (6) descartar ~90 quadros de aquecimento; (7) estalos de 1-8 s na entrada do WEI LONG a 4x existem tambem no HEAD (atlas original), nao sao do bloco.

**Why:** o dono quer commits por frente; a Atlas precisa saber o que cada um leva e o que falha.
**How to apply:** repetir [[tecnicas-de-qa-do-projeto]] e as armadilhas acima ao medir de novo.
