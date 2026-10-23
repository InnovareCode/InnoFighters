---
name: project-nomes-combos
description: Nomes definitivos dos 20 combos próprios (V2-4), régua de largura da caixa de combo e a pendência do campo efeito
metadata:
  type: project
---

Nomes definitivos dos 20 combos próprios aplicados em 23/10/2026 (só o campo `nome`; tabela e motivos em docs/combos-proprios.md).

- **Régua de largura:** a caixa do combo tem nome (Barlow 600, 15 px) E linha de efeito (10 px) na MESMA altura das teclas: os dois dividem
  o espaço até a 1ª tecla. Coluna mais estreita = pausa do TREINO (416 px). Folga = 416 - 20 - faixa de teclas - largura do texto.
  Faixa mais larga: NILA SARPA (4 golpes, 218 px) e CAIO VOLTA AO MUNDO (214 px). Média da fonte em caixa alta: 8,4-8,8 px/caractere.
- **Medir:** script em scratchpad carregando o woff2 por FontFace (base64; file:// falha em about:blank) e `measureText` no Chromium do
  playwright do projeto (createRequire na raiz). Calibrou: QUEBRA-BASE ENCADEADO = 33,6 px de folga, bate com os "34 px" do Atlas.
- **Voz:** os nomes ecoam falas de docs/textos-provocacao.md (O CHÃO DECIDE, SEM ANESTESIA, NOTA MÁXIMA). Estrangeiro só onde é costume:
  MIN-JI (HANA-DUL-SET-NET), CAMILLE (TOUCHÉ), CENTELLA (¡ARRIBA!).
- **Pendência:** a tela só diz "fecha com o especial" nos 10 combos que fecham em especial; a linha específica proposta precisa de campo
  novo (`efeito?`) em ComboProprio (Vega/Lyra). ZENON chefe2 troca TRIBUTO por DECRETO no →+ESP: efeito sem nome de especial.

**Why:** evita remedir tudo e repetir o erro de propor linha de efeito que colide com as teclas.
**How to apply:** ao renomear ou criar combo, rode a régua; tests/unit/combos-nomes.test.ts é a rede (24 caracteres, menos se a faixa é larga).
Relacionado: [[project-textos-provocacao]], [[project-identidade-especiais]].
