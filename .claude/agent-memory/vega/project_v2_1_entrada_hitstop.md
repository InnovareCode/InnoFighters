---
name: v2-1-entrada-hitstop
description: V2-1 da revisão do motor v2 - motorV2.entradaNoHitstop (guarda a entrada humana no congelamento), onde está, como se prova que não muda CPU x CPU, armadilhas
metadata:
  type: project
---

Flag `ConfigPartida.motorV2.entradaNoHitstop` (tipo `MotorV2` em core/contratos.ts; `Regras.motorV2?` opcional; helper `cfgMotorV2(regras)` em meta/regras.ts, usado em campanha.ts/diff.ts/select.ts). `REGRAS_PADRAO` NÃO tem a chave (ausente = desligada; liga só na V2-6 por ordem do dono). O trailer monta a própria cfg e nunca a recebe.

Mecânica (game.ts): no tick congelado (`passo`, hitstop > 0, fase 'fight') `guardarEntradaDoCongelamento` lê só a fonte humana (mesmas regras de `inputs`: P1 com cpu null, P2 com cpu null e fora do treino) e guarda por lutador o último botão (ordem ATK_KEYS) + mudanças de direção (sem repetir a anterior, comparando com o fim do `hist`). No 1º tick acionável `entregarEntradaDoCongelamento` roda DEPOIS de `inputs()` e ANTES do `update` dos lutadores; `Fighter.receberEntradaDoCongelamento` empurra as dirs no `hist` e põe `buf={k,t:10}` (o update do tick decrementa antes de ler, fica 9).

**Why:** a borda do botão vive 1 tick (`TeclasVirtuais.fimDoTick`) e o hitstop retornava antes de ler a entrada. Ler DENTRO do tick congelado resolve sem mexer em main.ts: a borda ainda existe naquele update.

**How to apply / armadilhas:**
- `FonteEntradas` não deve ser lida em tick congelado com a flag desligada (contrato antigo, testado). CPU x CPU nunca lê fonte, então a flag não muda harness/snapshots: provado por `--entrada-hitstop` no `npm run balanco` (hash igual) e pelos testes em entrada-hitstop.test.ts.
- A compressão do `hist` é o que faz meia-lua caber num hitstop de 20 (a janela do `motion` é 18 ticks); sem ela a sequência sai da janela.
- Não coberto (de propósito): botão ESQ (esquiva) e `spSeg` no congelamento; só ataque e direção (spec §7.1).
- CRLF: game.ts, fighter.ts, contratos.ts, meta/tipos.ts, esquiva-cpu.test.ts são CRLF; o `grep -c $'\r'` do Git Bash engana. Conferir com Python (`s.count(b'\r\n')`) antes de editar com script.
- Com outra instância mexendo em src/data (CAIO) o hash do harness muda DURANTE a rodada: comparar on x off em rodadas seguidas e conferir a "versão dos dados" impressa; o hashRegulares f420ce928e06b304 só reproduz com os dados do commit de referência.
