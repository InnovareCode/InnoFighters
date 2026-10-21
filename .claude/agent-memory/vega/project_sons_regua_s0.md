---
name: sons-por-lutador-s0-s3
description: Sons por lutador S0-S3 entregues (2026-10-21): régua congelada, vozes, 33 assinaturas, armadilhas da régua e o que falta (S4 ligação, S5 escuta)
metadata:
  type: project
---

Spec `docs/spec-sons-por-lutador.md` (rev. 2). Entregue S0b+S1+S2+S3, `IDENTIDADE_SONORA=false`. Handoff com todos os números: `docs/handoff-vega-sons.md`. Falta: S4 (ligar em fight.ts/main.ts depois da Lyra), S5 (N3 Chromium + escuta do dono).

**Armadilhas que custaram caro (não repetir):**
- A régua mede o AudioSys REAL sobre `tests/support/audio-offline.ts`. Dois defeitos da régua apareceram só depois do congelamento: estimador de tom (P) escolhia subharmônica (ruído, 40-120 Hz para uma voz de 175 Hz) e o oscilador começava 1 amostra antes do ganho (estalo). Sempre imprimir o contorno P de sons que deveriam ser iguais antes de confiar na distância.
- Busca automática de gritos curtos acha o ruído da régua: filtrar por estabilidade (R6, tom x0,97/x1,03) ANTES de maximizar a menor distância.
- Formantes estreitos (q >= 7) + 3% de tom movem o brilho 0,15 oitava; q 4-6 + coro curto (7-14 cents, sem sub) estabiliza.
- Espelho D-S7 (-1 st, x0,97) dá S 0,14-0,29 em vogal parada: o piso 0,3 do R7 não fecha sem mudar a decisão do dono.
- Ao escrever TS por heredoc Python no shell, `\n` vira quebra real: usar String.fromCharCode(10) ou a ferramenta Write.

**How to apply:** mudou grito/assinatura/síntese -> rodar `SONS_DIAG=1 ... sons-calibra-diag.test.ts` e colar em `src/data/sons/calibracao.ts`. Mudar escala da régua exige PROGRESSO.md + veredito da Íris.
