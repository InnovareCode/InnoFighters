---
name: trailer-partitura-r14
description: R-14 (2026-10-24) trailer ENCENADO — partitura.ts compila InputFrame por tick, dois humanos, sem semente; armadilhas de afinar a mão (espaçamento, energia, queda ~75 ticks, filme só no KO, P9 motor desde 0)
metadata:
  type: project
---

Código: `src/data/trailer/partitura.ts` (notação + compilador + PARTITURA), `src/trailer/entradas.ts` (`FonteDaPartitura`), `partida.ts` (`criarPartida` devolve `{game, fonte, atualizar}`), ferramenta `ferramentas/trailer/escalar.ts` + `cli.mjs` (CONFERE; `--rastro` imprime a luta tick a tick). Testes: `trailer-partitura.test.ts`, `trailer-diretor.test.ts`. Doc: `docs/partitura-trailer.md` §8. Não commitado.

**Decisões não deriváveis do código:**
- Tempo da partitura = tick do MOTOR (índice = `pr` + tick; `PRIMEIRO_UPDATE_DE_LUTA` = 90, a intro). O `alvo` do roteiro é tick do PLANO (lenta/tarja somam). `Tomada.inicio` = 89 + pr.
- Trailer usa a config do JOGO (`cfgMotorV2` + `cfgRitmo` de `REGRAS_PADRAO`): super existe, `filmeRestrito` ligado. Mudou flag do jogo -> reafinar (o teste de impressão avisa).
- `TICK_DO_MOTOR_NO_ARCONTE` virou 0 (a partitura do P9 tem 192 ticks de luta; antes só 36). A entrada curta/braseiros agora é sobreposição (Lyra R-15 decide).

**Armadilhas (causa raiz, não repetir):**
- `filmeRestrito` só emite filme no KO (`motivo` é sempre `ko`, nunca `super`): para o P9 ter filme o super tem de MATAR -> `Tomada.vida` (HAYATO 18%). Cancelar o super a partir de golpe NÃO promove (`hp+hk` virou só `hp`); sai do neutro. No KO o motor entra em fase `ko`: sem entradas, ninguém anda; o plano termina no filme (30 ticks até o último quadro).
- Especial custa 20-45 e a barra de 0 não chega: `energia` por plano. A intro e a pré-rolagem regeneram 0,07/tick (0,04 no chefão).
- Direção do `D+sp`/`F+sp` precisa estar segurada no tick em que o golpe RESOLVE (cancelamento com buffer perde a direção): usar faixa `D[a,b)` + `sp@t`. `F` segurado no `sp` transforma `sFire` em `sFwd` (MASHI vira PASSO DO LEÃO; ARREMESSO vira MERGULHO).
- Corpo mínimo entre lutadores = 78 px; bloqueio empurra o defensor ~10 px (o CFT depois de SF defendido erra a ~86). Golpe que acerta desliza o rival ~1 px/tick por ~30 ticks.
- Queda (kd) deixa o rival no chão ~75-90 ticks: não cortar a câmera para ele depois.
- Soco passa por cima de rival AGACHADO (MASHI errou); projétil grande (LONG ZHANG sc 1,7) não se pula.
- Shell: heredoc com certos conteúdos quebra o Bash tool ("unexpected EOF"): criar arquivo com a ferramenta Write. Arquivos misturam CRLF/LF: patch em Python lendo bytes, gravando de volta o mesmo fim de linha.
- Ensaio rápido sem editar arquivo: script em Node com `createServer` do vite do projeto + `compilarPlano` sobre uma partitura alterada (JSON na linha de comando).

**How to apply:** mudou golpe/combo/super (outra Vega mexe nisso) -> `npm run trailer:escalar` e, se DIFERENTE, `--plano Px --rastro`, reafinar, copiar a impressão nova para `PARTITURA.Px.impressao`.
