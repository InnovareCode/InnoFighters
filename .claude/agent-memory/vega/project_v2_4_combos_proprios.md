---
name: v2-4-combos-proprios
description: V2-4 da revisão do motor v2 - motorV2.combos (combos próprios), onde mora cada peça, decisões que a spec deixava em aberto, verificador, CPU, armadilhas e a nova linha de base do harness
metadata:
  type: project
---

Flag `ConfigPartida.motorV2.combos`. Dados: `LutadorDef/FichaDef.combosProprios` (tipos em `data/tipos.ts`: `ComboProprio`, `FinalDoCombo`); lógica pura + validação no boot em `src/data/combos-proprios.ts` (chamada por `montarLutador`); histórico em `Fighter.historicoCombo` (`{golpe, atk}`), escrito só por `Game.registrarAcertoDoCombo` (em `applyHit`, antes de `gotHits++`); cancelamento em `Fighter.updateMove` (`comboProprioAbre`); queda em `Game.derrubar`; CPU no bloco "2a" de `cpuInput` (`AI_LEVELS[n].proprio` = 0/0/0,85).

**Decisões:**
- Reconhecimento ancorado no 1º acerto (prefixo do histórico), e o último item do histórico tem de ser um ACERTO do golpe em curso (`atk === atkId`): bloqueio não abre combo.
- `semQueda`/`final` valem no acerto de uma sequência reconhecida mesmo que o jogador não continue (a cadeia universal clp>hk também ganha o hk sem queda). Documentado, aceito.
- `final`: lanca = knockdown + vy -15; parede = kb >= 18; cruza = knockdown no sentido do atacante (kb >= 11; `separate` ignora quem está `down`). Proibido com especial no fim (o especial tem o filme).
- Ficha sem lista própria HERDA a da base (spread em `montarLutador`): ZENON chefe/chefe2 herdam; NILA tem uma por postura.
- Contador `Game.combosPropriosFeitos[2]` (partida toda); `Registro.combosProprios` só existe com a flag (senão o hash do harness muda).
- `Game.semTetoDeCombo` (público, só ferramenta): o verificador mede o dano sem a rede do teto.

**Verificador (`ferramentas/balanco/frame-data.ts`, `verificarCombo(s)`):** jogador ideal por input real, 1º golpe no boneco PARADO em pé, depois `block`/`crouchblock`. Limite = 0,4 x MENOR vida do elenco (92, BAATAR), não a do boneco (106). Falha: bloqueado, errou, não encadeou, boneco livre/caído antes do fim, dano, ou sem identidade (só cadeia universal). Exemplo ruim da spec NILA hp>hk(sq)>MARMA = 44,5 (teste).

**Armadilhas:**
- O `crouching` do Fighter só atualiza em estado livre: quem estava agachado quando apanhou fica com a caixa baixa no atordoamento e hp/hk (altos em quase todos) passam por cima. Por isso "agachado" no verificador = guarda baixa DEPOIS do 1º golpe; começar agachado reprovaria todo combo com hp/hk (inclusive o exemplo da spec). Não é à prova de agachar-antes.
- Heredoc do Bash morre com `'''` no Python: escrever scripts de edição com o Write e rodar o arquivo. Helper de edição que preserva CRLF: scratchpad `ed.py`.
- `tests/unit/dados.test.ts` compara o def com o protótipo: `combosProprios` foi excluído da comparação.
- NUNCA usar o hash f420ce92... como referência: o HEAD atual (arte nova do CAIO/WEI LONG + V2-1/V2-3c) dá hashRegulares 88464c17d7273df9, hashChefes 9c5d3362e00af20f, total 1a5c67358b82fdf9 com `--completo --esquiva`; flag desligada na árvore de trabalho = HEAD puro.
- Medição: `--motor-v2 combos` (CPU DIFÍCIL, 540 lutas regulares): 1,88 combos completos por luta (0,94 por lado, 82% das lutas com >= 1) com proprio 0,85; com 0,6 era 1,11 por luta.

**Linha de efeito (`ComboProprio.efeito?`, 2026-10-23):** opcional; `combosDoLutador` usa `c.efeito ?? final ?? 'fecha com o especial'`. Validado no boot (vazio / `\r\n\t` / espaço na ponta / > `EFEITO_MAX_CARACTERES` = 40 falham alto). Preenchido nos 11 que fecham com especial (a contagem "10 dos 20" do doc do Apolo estava errada: são 11 com especial e 9 com `final`; NILA tem 2 especiais). Teste do ZENON checa o NOME do especial em caixa alta (TRIBUTO/DECRETO), não o substantivo "tributo" do texto do Apolo. Apóstrofo em dado TS: `COUP D\'ARRÊT`.
