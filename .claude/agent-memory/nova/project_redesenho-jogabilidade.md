---
name: project-redesenho-jogabilidade
description: Spec do redesenho da jogabilidade (docs/spec-redesenho-jogabilidade.md, 24/10/2026) depois que o dono reprovou a sensação do motor v2 — tempo de controle por fase, tarja sem congelar, filme só super/KO, super hp+hk, cadeia por força, CPU que confirma, trailer por partitura, flags ritmo.*, D-R1..D-R8, fatias R-1..R-17
metadata:
  type: project
---

O dono jogou o v2 publicado (209ecd8) e reprovou: "jogabilidade terrível de fraca", "combos sem sentido", trailer "robotizado".
Ele manteve o motor v2 ligado e pediu correção por cima. Escrevi `docs/spec-redesenho-jogabilidade.md` (proposta, nada implementado).

Evidência que mudou a leitura (Íris, `docs/diagnostico-sensacao-2026-10-24.md`): **sem controle 44,6% da luta, 54,6% com
`?motorv2=0`**. Provocação pré-round ~20%, tarja ~9%, hitstop ~4%. O problema é a cerimônia, não o filme. E o **filme nunca
disparou no jogo real** (0 em 46 acertos), mas dispara no harness (11,4 por luta): o harness não reproduz o jogo, então a
calibração da V2-6 não vale para o publicado.

Desenho fixado:
- Orçamento por fase: pré-luta ≤ 2,5 s (provocação CURTA por cima do `intro` do motor, só UI, hash igual), entre rounds ≤ 3,5 s
  (`ko` 60, `roundend` 90, `intro` dos rounds 2+ 60, `matchend` 90: motor, com flag).
- Tarja continua no início (R-3 do dono), mas **não congela** no especial comum (faixa a 0,55, no alto, 40 ticks). Congela 30 só no super.
- Filme só no super e no especial que dá KO (o especial comum volta ao acerto normal, que é o que o jogo real já faz).
- Super: SFT+CFT com barra cheia (C2 não muda), 1 por lutador = versão forte de um especial que já tem filme, `src/data/supers.ts`.
- Cadeia por força fraco›forte›especial›super, até 2 fracos, forte›forte só em assinatura: no máximo 4 golpes. Janela e buffer iguais.
- Combos: 1 BÁSICO (F›T semQueda›E) + 1 ASSINATURA por lutador, regras V1-V6. Revisão: 13 mantidos, 4 reescritos
  (palma WEI, rajada MIN-JI, TOUCHÉ com fecho de contragolpe, elefante NILA), 2 condicionais (cruza CAMILLE e ZENON), descartada a CAVALGADA.
- CPU confirma pelo histórico de acerto (não `connected`, que vale também no bloqueio), combo por plano, histerese, pune erro, varia especial.
- Trailer: partitura do Apolo → `InputFrame` (campo `Tomada.inputs`, a M3), os dois como humanos, sem busca de semente.
- Flags `Regras.ritmo` / `ConfigPartida.ritmo`, `?ritmo=0`; cada onda vai desligada e o dono aprova com `?ritmo=1`.

**Why:** princípio consagrado — controle quase o tempo todo, cinemática rara, cadeia por força com confirmação. O Atlas tinha
proposto relaxar o limite de 15% de tempo parado; foi erro, e o portão voltou mais rígido (G1 ≤ 15% dentro do round, G2 ≤ 25% na luta).
**How to apply:** a ordem é onda 1 (R-1 contador `__ritmo`, R-2 tarja/provocação, R-3 defeito do filme ∥, R-4 prova) → onda 2
(R-5 Apolo, R-6..R-10 Vega em série, R-9 Lyra, R-11/R-12 portão e regravação) → onda 3 trailer (R-13..R-16). Toda prova de
sensação é captura no jogo real (método da Íris), nunca só o harness. Relacionado: [[project-revisao-motor-luta]],
[[project-trailer-abertura]], [[project-provocacao]], [[project-esquiva-cinematica]].
