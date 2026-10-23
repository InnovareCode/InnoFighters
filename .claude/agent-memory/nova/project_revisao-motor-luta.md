---
name: project-revisao-motor-luta
description: Revisão do motor — v1 (2026-10-22) reprovada; v2 escrita em 2026-10-23 (docs/spec-revisao-motor-luta-v2.md) com as 6 decisões do dono, fórmula de dano com piso 1,10×hk e teto 26/40%, filme opção A, flags motorV2, D-V1..D-V9
metadata:
  type: project
---

v2 = `docs/spec-revisao-motor-luta-v2.md` (2026-10-23, HEAD f5b5fab). A v1 ganhou banner "SUBSTITUÍDA". Nada implementado ainda.

Decisões do dono (23/10) que a v2 segue, e que derrubaram recomendações minhas: filme em TODOS os 33 (eu queria 1 por lutador, R-2);
tarja fica no INÍCIO (eu queria no acerto, R-3; risco A7 continua). 33 = 10×3 + SARPA 3; 31 acertam, os 2 VADIVU não (D-V1).

Desenho fixado na v2:
- Filme opção A: 1º contato limpo resolve tudo no tick (dano, energia de 1 acerto, KO/troca de barra), defensor direto em
  `down/lie` (sem arco de knockdown), atacante em `_lag` com `recuperacao` (vantagem = 48 − recuperacao). Todo filme derruba →
  combo acaba, "1 filme por combo" sai de graça. Bloqueado/esquivado/armadura = execução consumida (H3, confirmar D-V9).
- Dados fora de `LutadorDef.especiais` (oráculo dos 4 originais): `src/data/filmes.ts` (motor) e `src/data/roteiros-filme.ts` (UI,
  poses com `Alt` → encaixe arte atual x nova). 4 roteiros genéricos por tipo para UI e motor não esperarem o Apolo.
- Dano: `max(hoje×1,25, 1,10×hk)` (projétil ×1,15), teto 26/golpe, TETO_COMBO 40% da vida total, ordem: escala → contra → teto →
  danoRecebido → teto de combo. Mediana 1,27×. Forçados pelo piso: GARKUWA 2,9×, MARMA 2,75×, MASHI N1 1,8× (D-V2).
- Flags `ConfigPartida/Regras.motorV2 { entradaNoHitstop, filmes, combos }`; trailer fixa `motorV2: undefined` até V2-6.

**Why:** o dono pediu filme só no acerto, especial mais forte sem exagero, combos próprios, fluidez; a v1 dobrava dano e ignorava
pow/contra/chefões. **How to apply:** próximas fatias seguem a ordem V2-1/V2-2/V2-3a/V2-3b em paralelo → V2-3c∥V2-3d → V2-4 →
V2-6 regravação única. Não reabrir R-2/R-3 sem o dono. Achado que corrige a auditoria: golpe que derruba encerra o combo (caído é
`untouchable`), então `hp → hk → especial` não existe; a cadeia real mais longa é `lp×3 → lk → hp → especial` (pior v2 = 35,1, 38% de 92).
V2-1 (entrada no hitstop) lê só fontes humanas → não pode mudar f420ce928e06b304 nem os snapshots: isso é critério de aceite.
Relacionado: [[project-esquiva-cinematica]], [[project-trailer-abertura]], [[project-chefoes-progressivos]], [[project-estado-2026-10-23]].
