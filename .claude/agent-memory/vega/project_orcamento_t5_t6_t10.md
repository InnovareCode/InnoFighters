---
name: orcamento-t5-t6-t10
description: T5 (sons fora do boot), T6 (retratos WebP) e T10 (BAATAR/ZENON a 0,9) do orçamento de 2026-10-23 - o que mudou, por que o lp do BAATAR parou de conectar, armadilhas
metadata:
  type: project
---

Entregue em 2026-10-24 (sem commit). Só o que não se deriva do código:

- **T10: reescalar atlas desloca a ponta e pode matar um golpe que roça a cabeça.** `alturaRef` 525->472 / 558->502 (0,9) em `ferramentas/sprites/lutadores.json`; pipeline é byte-reprodutível (páginas idênticas ao publicado antes de mudar). A ponta `mao` do BAATAR `lp1` subiu 3,8 px, o fundo da caixa (`tip*scale - bh/2`) passou de 252,2 para 256,4 contra o topo da hurtbox (~254) e o `lp` virou "NÃO conecta em nenhuma distância": BAATAR 56,1% -> 39,6% e todos os outros +1 a 2 pt. **Correção:** `mods.lp.bh` 54->62 em `baatar.ts` (fundo 252,4). Depois: regulares a <= 0,4 pt, chefões na rampa, snapshot `motor-v2-cpu` voltou a passar sem `-u`. **How to apply:** após mexer em `alturaRef`/atlas, comparar `frame-data.json` (linha `caixa.fy`/`alcance`/`notas`) antes e depois; "NÃO conecta" é o sintoma. O harness `--completo --esquiva --saida <scratch>` não toca docs/balanco (usar para o antes/depois).
- Escorregão de pés (`tests/fixtures/escorregoes-conhecidos.json`) oscila +-3 px com a mudança de resolução (ruído, não regressão); regerar com `GERAR_ESCORREGOES=1 npx vitest run tests/unit/fluidez-ancora.test.ts -t "baatar|zenon"`.
- Memória analítica BAATAR x ZENON (script `mem-luta.mjs` da Íris, precisa de `npx vite --port 5193 --host 127.0.0.1`; `localhost` sozinho dá ECONNREFUSED): 139,6 -> 116,1 MiB de imagem (atlas 52->42, 60->46,5).
- hashRegulares de produção agora `e5db8a2586c836b5` (antes `05bf1b64b46008a0`); mudou porque os dois jogam as 90 regulares.
- **T6:** retratos `retrato.webp` (nearLossless 80, 0,283 MiB os 10). `ferramentas/gerar-retratos.mjs` grava webp+json e troca SÓ o bloco `retrato` do atlas.json por regex (WEI LONG tem formatação à mão: JSON.stringify do arquivo inteiro falha). Fixtures do oráculo (`tests/fixtures/atlas-prototipo/*`) continuam PNG e ficam intactas (atlas v1 sem campo `retrato` lê o sidecar). Pipeline de sprites (`executar.mjs`) agora também gera webp 190x190 (importa `OPCOES_WEBP` do gerar-retratos); o publicado de BAATAR/ZENON é o do gerar-retratos (janela 219/233), `retrato.recorte` do atlas gerado diverge de propósito.
- **T5:** `carregarBanco` não baixa mais a base; a etapa 2 (`agendarEtapa2` em `camadas.ts`) roda no 1º gesto via `requestIdleCallback` (WebKit não tem: cai num setTimeout 200 ms); a VS (`CenaVs.enter`) chama `prepararLutaSonora`. O 1º tick da luta continua pedindo o que falta. Teste `sons-fora-do-boot.test.ts` prova que, sem folha, cada evento toca o MESMO que o jogo sem amostras (nós criados iguais); mutante "sem escolha retorna false" cai.
- Armadilhas de ambiente: no Bash a barra invertida dupla em heredoc de Python é colapsada (`\\/` virou `\/`; `/retrato\\.png$/` virou caminho do Git): escrever o `.py` com a ferramenta Write; `sons-amostras-banco.test.ts` e outros testes são CRLF, o helper de edição deve converter `\n`.
