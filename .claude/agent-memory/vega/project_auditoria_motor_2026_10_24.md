---
name: auditoria-motor-2026-10-24
description: Auditoria de fidelidade/delay do motor (24/10/2026, pós-Android do dono) - onde o motor espera de verdade (dash, par do super, MASHI, joystick), números de hitstop, hashes de hoje, ensaios reprodutíveis
metadata:
  type: project
---

Doc completo: `docs/auditoria-fidelidade-motor-2026-10-24.md` (sem alterar código). Achados que NÃO se derivam do código à primeira leitura:

- Entrada -> `move` leva 0 ticks no motor (ensaio). Os "delays" reais são esperas em estados de trava e decisão: `dash` 16/18 ticks engole `lp` apertado nos 8 primeiros ticks (buffer 9 < dash 16); `aguardandoParDoSuper` atrasa hp/hk em 3 ticks com barra cheia + `ritmo.super` (padrão); MASHI do AMINU vira carga se o dedo fica >= 11 ticks (184 ms) no ESPECIAL.
- Joystick virtual (`toque.ts`): sem histerese nem zonas angulares; cima liga a >24 graus, baixo a >~21; oscilar no limiar 25% vira duplo toque = dash acidental. `TeclasVirtuais`: botão tem borda (sobrevive a toque curto), direção é nível (some em frame baixo).
- Hitstop é CURTO (acerto 4/6, bloqueio 2, KO 14), não longo. Normais: 5 de 10 lutadores usam a tabela base idêntica; tudo dentro da faixa 3-5/5-9/7-12.
- Harness CPU x CPU é cego a entrada/toque/laço. Portão "tempo parado" (48 ticks por especial) está DESATUALIZADO frente a `ritmo.tarja`. O 44,6% parado da Íris é de `209ecd8`, antes dos defaults do ritmo.
- Hashes de hoje (HEAD d350d27, `npm run balanco -- --rapido --esquiva`): total cf93dece72c376e7 / regulares e410897f434ae333 / chefes 7aaf5a75b2887189; com `--ritmo intervalos,filmeRestrito,super,cpu`: 486bb10e1591e6e6 / 3b18753ed940deed / 3117626b6d18ae4d. Dados/motor d16203b096b5; frame-data de `docs/balanco` (75764f4439da) continua IDÊNTICA.

**Why:** o dono reclamou de delays no Android; a causa dominante pode ser desenho (RS=2, smoothing 'high'), não motor, e só a Íris mede em aparelho.

**How to apply:** antes de culpar a frame data, rodar ensaios com `Game` + `FonteEntradas` scriptada (carregar via vite `ssrLoadModule('/ferramentas/balanco/elenco.ts')`, import de vite pelo caminho do repo; NUNCA `python3 -` num comando sem stdin: trava 120 s). Mudança de motor segue o molde `motorV2.*` (ausente = idêntico). Mexer em WEI LONG/HAYATO/MIN-JI/CAIO quebra o oráculo do protótipo por desenho.

## Implementação da fluidez (mesmo dia, M1/M2/M3/M5/M6/D1)

`ConfigPartida.fluidez` (`FluidezMotor`), `Regras.fluidez` = `FLUIDEZ_PADRAO`, rollback `?fluidez=0`; `cfgMotorV2` leva a fluidez junto (UI não muda); `main.ts` põe `fluidez.toque = temToque(window)`. Ausente = hashes e snapshots iguais (provado). Dados do BAATAR por cópia em `src/data/fluidez-dados.ts` (nunca no `LutadorDef`). Harness: `--fluidez` (relatorios/, nunca docs/).
- Par do super: sem espera, `promoverPar` troca o normal (mt <= 2) por super/throw; `limparBuffer` esvazia as DUAS vagas (senão o 2º botão dispara depois do super).
- `agarrarNaBorda` roda antes de `this.opp = opp` no tick: `canThrow()` usa o `opp` do tick anterior (mesmo objeto, posição atual): ok, mas não mover para depois sem reler.
- Edição de arquivo CRLF: `Edit` não casa multilinha; usar script `ed.cjs` (lê, normaliza LF, troca, regrava CRLF). Alguns arquivos voltaram a LF sozinhos (outra sessão/agente): conferir `CRLF` antes de commitar. NUNCA `python -` sem stdin.
- Com ritmo de produção (super+cpu) a base JÁ dá MIN-JI ~29% e WEI LONG ~61% (40 sementes): achado para o Atlas, independe da fluidez.
