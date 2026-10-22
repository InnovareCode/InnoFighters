---
name: trailer-t0-t3
description: Trailer de abertura T0-T3 (2026-10-22): diretor puro, escalação M2, música com citação; armadilhas da régua (dR não chega no mesmo BPM), orçamento 15 ativas, testes que casam o evento errado, CRLF/heredoc
metadata:
  type: project
---

Spec `docs/spec-trailer-abertura.md`; handoff com todos os números em `docs/handoff-vega-trailer.md`. Código em `src/trailer/**`, `src/data/trailer/**`, `ferramentas/trailer/**`, `src/audio/abertura.ts` (+3 métodos aditivos no AudioSys). Não commitado. Falta a cena (Lyra), e2e (Íris), escuta e aparelho (dono).

**Decisões que não se derivam do código:**
- A "tomada" conta UPDATES do `Game` (não `Game.tick`, que não conta hitstop). `RitmoDoPlano`/`passoDoPlano` (src/trailer/ritmo.ts) é a máquina ÚNICA de câmera lenta/tarja: o diretor roda com o `Game`, a escalação roda sobre eventos gravados. `criarPartida` (partida.ts) monta o Game para os dois: nunca duplicar.
- Teste de batida: achar o quadro pelo update gravado (`tickMotor`), NUNCA pelo primeiro evento que casa (um golpe parecido antes da tomada casa e dá tick errado).
- Orçamento (<=8 fontes/passo, <=15 ativas) só fecha porque lead e acorde CALAM nas janelas de citação (`calaNaCitacao`) e o baixo tem t=0,3 s. Acorde de 2 notas, não 3. Pico de ativas hoje = 15 exato.
- Régua: contra o MESMO bpm e pulsos (fight 150/[4]) dR nunca passa de 1/3 < τR 0,3482, então a abertura precisa de dM e dT >= 1. Contra o HAYATO (144) quase igual. dM sai fácil com saltos largos (+7,+5); dT exige timbre fora dos temas: lead de palheta (serra por passa-faixa RELATIVO à nota), marimba (parciais 2,76 e 5,4), percussão de bigorna (quadrada+seno 1630) e taiko de serra. AMINU (algaita = serra passa-faixa) é parecida em timbre de lead, mas passa pelo dR. Margem mínima hoje ~1,09.
- Mixagem: o grave (<120 Hz) da fight é alto; qualquer sub/taiko abaixo de ~140 Hz estoura +8 dB. Sub em oitava -1, taiko 190->85.

**Armadilhas de ambiente:**
- Medida `custo` com `getImageData` no canvas acelerado (SwiftShader) mede a rasterização (160 ms): não forçar o flush; igual à E7a.
- A medição no navegador travou uma vez (página "Not Responding"): `comPrazo` em `medir.mjs`. Não rodar vitest junto da medição.
- Arquivos do working tree ficam CRLF (autocrlf): patch em Python lê em modo texto e grava `newline='\r\n'`. Em heredoc deste shell `\\n` vira quebra de linha real: usar `chr(92)`.
- `import '../data/trailer'` valida roteiro+tomadas e LANÇA se faltar tomada: testes e ferramenta importam os módulos soltos.

**How to apply:** mudou balanço/CPU/atlas -> `npm run trailer:escalar -- --verificar` (CI) e, se diferente, `npm run trailer:escalar -- --plano Px` e reaprovar por olho. Mudou instrumento/padrão da abertura -> `trailer-musica.test.ts` (TRAILER_DIAG=1 + trailer-musica-diag para ver dT por pista) e refazer o `mix`. Mudar τ da régua exige PROGRESSO.md.
