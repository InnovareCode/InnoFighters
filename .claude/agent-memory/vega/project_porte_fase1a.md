---
name: porte-fase1a-decisoes
description: Decisões e armadilhas da Fase 1a (core/data/extração) do porte do protótipo InnoFighters — conversão tipX/tipY, ids, fidelidade por teste contra o protótipo
metadata:
  type: project
---

Fase 1a entregue em 2026-10-20 (core, data, extrair-prototipo, C3).

- **tipX/tipY**: protótipo guarda px lógicos relativos à âncora, já em escala da guarda (k = SH_IDLE/alturaRef = 255/410), SEM multiplicar por ch.scale (isso é feito no uso). Manifesto C1: `ponta = [ax + tipX/k, h - tipY/k]`; volta em `src/data/atlas.ts#manifestoParaPoses`. `rosto = [headX+6, 91]` embute os offsets +6/-4 do retrato do protótipo. **Why:** ponta errada muda caixa de acerto e balanceamento. **How to apply:** nunca converter em outro lugar; mexer só em atlas.ts + extrair-prototipo.mjs e rodar tests/unit/atlas.test.ts.
- **Prova de fidelidade**: `tests/unit/dados.test.ts` executa no Node os trechos do próprio protótipo (setupChars+buildMoves+getPD, via `new Function`) e compara com `montarLutador`. Funciona porque os trechos são puros. Use o mesmo truque para 1b (fighter/game) se possível.
- **Ids**: f1=hayato, f2=wei-long, f3=min-ji, f4=caio; cenários bg(=Japão, `bg_jp` nunca existiu em ASSETS)/bg_cn/bg_kr/bg_br -> jp/cn/kr/br.
- **Sem encoder de imagem** (sem sharp): cenários saem como .jpg byte-idêntico, atlas como .webp byte-idêntico; atlas legados têm 3600 px de largura (>2048 do alvo iOS; só a F2 resolve).
- **Armadilha de ferramenta**: heredoc `cat > arquivo <<'EOF'` com muito TS no Bash deu "unexpected EOF" e não criou nada; usar a ferramenta Write para arquivos.
- Não adivinhar premissa geométrica a partir de amostra: achei que `ponta.x == w-1` em todo quadro (valia nos 4 que olhei, falhou em outros); teste de "sanidade" virou checagem de limites.
