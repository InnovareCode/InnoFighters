# Handoff Vega: chefões mais duros, R1 + harness (R2) + calibração (R3) (2026-10-21)

Spec: `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §4. Decisão do dono: **rampa** (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL
proporcionalmente menor, KO >= 90%, duração <= 75/90 s), com esquiva ligada, ajuste só em dados dos chefões. Sem e2e e sem commit.

## RESULTADO

### Motor (`src/fight`, `src/data`)
- `ConfigChefe.danoRecebido?: number` (`src/data/tipos.ts`): multiplicador do dano que a **vida** do chefe sofre. `montar` rejeita fora de 0,60 a 1 (e NaN/Infinity) com
  `DANO_RECEBIDO_MIN` (`src/data/montar.ts`). `fichaFase1?` e `fichaFase2?` agora opcionais.
- `Game.danoNoDefensor(d, dano)` (`src/fight/game.ts`): `d.cfgChefe?.danoRecebido`; ausente ou 1 devolve o número SEM multiplicar (bit a bit). Chamado depois de todas as
  contas e antes de subtrair da vida, nos 4 pontos: arremesso (`arremessar`), raspão de bloqueio (depois do mínimo de 0,4), armadura (o teste "aguenta?" e o valor usam o
  MESMO dano reduzido) e golpe (antes da trava do treino). `drenaEnergia` e o ganho de energia não passam por ele.
- `Fighter.virarChefe`: ficha só é validada/aplicada se existe; `fichaBase = fichaFase1 ?? null`. `andarCenaDoChefe`: `if (fichaFase2 !== undefined) trocarFicha`.
  Ficha declarada e desconhecida continua falhando ALTO no setup. `git diff src/fight` = só essas linhas (fighter.ts +6 -5, game.ts +18 -6).
- O fator mora no `cfgChefe` do Fighter, não na ficha: a NILA chefe troca de postura (VADIVU) e o fator fica (teste com troca REAL pela CPU e com `trocarFicha` direto).
- **5 guardiões com `chefe` em dados** (sem mudar o lutador jogável: montar com e sem o bloco dá `LutadorMontado` igual campo a campo): 2 barras de `ceil(hp/2)`
  (AMINU 56, CENTELLA 48, CAMILLE 49, NILA 54, BAATAR 46), cena de 60 ticks com poses que já existem nos 5 atlas (AMINU `sa1 sa3`, CENTELLA `win`, CAMILLE `block`,
  NILA `crouch`, BAATAR `devekh2 win`), bônus 3000, sem fichas de fase, sem trilha.
- **Fatores calibrados:** AMINU **0,925**, CENTELLA **0,875**, CAMILLE **0,925**, NILA **0,875**, BAATAR **0,85**, ZENON **0,80** (o ZENON ganhou `danoRecebido` no bloco
  dele; fichas `chefe`/`chefe2`, barra 50 e cena 90 intactas). Todos >= 0,60. Grade de **0,025** (a spec diz 0,05 de resolução; as faixas de 4 pontos só cabiam assim).

### Harness (`ferramentas/balanco`)
- `chefoes.ts` (novo, puro): `desafiantesDoChefe(regras)` (4, 5, 6, 7, 8, 9 desafiantes = **39 pares**; mesma regra do §1.3, Cronos ainda não criou `src/meta/chefes.ts`: quando criar,
  esta função vira uma chamada a ela), `metaDoChefe(k, total)` (a rampa) e `CRITERIOS_CHEFAO`.
- `montarTarefas(ids, chefes, p)` aceita a lista de chefões (ou um id / null, como antes). Os regulares vêm sempre primeiro com os mesmos `idx`/sementes. As do ZENON têm as
  mesmas sementes de antes. `--chefes a,b`, `--sem-regulares`, `--varrer-dano f1,f2,...` (30 sementes por padrão; falha se a taxa não cai quando o fator cai).
- `agregar` → `resumoChefes` (uma linha por chefão e nível: média, IC, meta, KO, tempo, duração, pior/melhor, "na meta"); `hashRegulares` e `hashChefes` separados; relatório com
  resumo + uma tabela por chefão (coluna "Terminou por tempo"); outliers por chefão contra a rampa. Rodada parcial (`--chefes`, `--sem-regulares`) nunca grava em `docs/balanco`.
- Referência regravada: `docs/balanco/` (`--completo --esquiva`, 25 800 lutas, 0 travadas, dados `f6b9952cee5e`, hash `957b8416d75bf060`, `--verificar` IDÊNTICA).
  `docs/balanco/sem-esquiva/` **não** foi regravada (é da rodada anterior; o README diz isso).

### Números (100 sementes, base 1, esquiva ligada; jogador = CPU do desafiante; APROXIMAÇÃO, não uma pessoa)

| Chefão | Desafiantes | Fator | NORMAL (meta) | DIFÍCIL (meta) | KO N/D | Duração N/D | Pior / melhor (NORMAL) |
|---|---|---|---|---|---|---|---|
| AMINU | 4 | 0,925 | **29,3%** (26-30) ok | **10,0%** (13-19) fora | 100/100 | 40/57 s | hayato 22 / caio 33 |
| CENTELLA | 5 | 0,875 | **26,8%** (24-28) ok | **25,8%** (12-18) fora | 100/100 | 41/59 s | wei-long 19 / hayato 32 |
| CAMILLE | 6 | 0,925 | **24,3%** (22-26) ok | **16,3%** (11-17) ok | 100/100 | 39/59 s | min-ji 19 / aminu 34 |
| NILA | 7 | 0,875 | **20,7%** (19-23) ok | **16,3%** (9-15) fora | 100/96 | 44/72 s | wei-long 16 / centella 26 |
| BAATAR | 8 | 0,85 | **18,3%** (17-21) ok | **19,0%** (8-14) fora | 100/98 | 42/65 s | hayato 11 / nila 25 |
| ZENON | 9 | 0,80 | **16,1%** (15-19) ok | **11,4%** (7-13) ok | 100/99 | 42/64 s | min-ji 12 / aminu 28 |

- **NORMAL: os 6 dentro da rampa**, KO >= 96%, duração 39-44 s (NORMAL) e 57-72 s (DIFÍCIL), pior >= 11%, melhor <= 34%, 0 travadas, fatores >= 0,80.
- **Confirmação independente** (base 3, 300 sementes, só NORMAL, n de 1200 a 2700): AMINU 28,6, CENTELLA 26,0, CAMILLE 24,8, NILA 20,6, BAATAR 18,4, ZENON 16,2: todos dentro.
  (Com 100 sementes, AMINU tem só 400 lutas/nível e erro de ~2 pontos: um 2º lote da base 2 deu AMINU 0,90 = 24,0%, por isso subi para 0,925.)
- **Linha de base (fator 1,0, só da varredura):** NORMAL AMINU 34,8, CENTELLA 38,8, CAMILLE 30,5, NILA 30,4, BAATAR 29,0, ZENON 31,9 (idêntico ao `docs/balanco` anterior); DIFÍCIL 14,2, 34,0, 22,2, 24,4, 29,5, 23,0.
- Sanidade da varredura (1,0 a 0,6, passo 0,05): a taxa cai em TODOS os chefões e níveis quando o fator cai (AMINU NORMAL 34,8 → 5,0%; ZENON 31,9 → 4,8%).
- **Regulares intactos:** `hashRegulares` = `f420ce928e06b304`, medido ANTES (harness antigo, `--sem-chefe`) e DEPOIS (harness novo): idêntico. Taxas dos 10 lutadores iguais às de antes.

### Testes
- Novos: `tests/unit/chefoes-r1.test.ts` (39: fator nos 4 pontos isolados, o raspão com mínimo ANTES do fator, armadura com o mesmo valor no teste e na absorção, só o chefe leva, dreno
  de energia fora, NILA chefe com troca de postura real e retomada sem trocar ficha, fichas opcionais, validação de `montar`, 5 blocos em dados e poses no atlas real, jogável intacto campo a campo,
  duelo CPU x CPU de 3000 ticks idêntico com e sem o bloco) e `tests/unit/balanco-chefoes.test.ts` (19: 39 pares, regulares idênticos, sementes do ZENON, hashes separados, rampa, resumo).
- Ajustados (decisão nova, não regressão): `zenon-motor` (ganhou o fator), `e5-elenco` (BAATAR agora tem bloco de guardião; CAIO prova o "sem bloco é ignorado"), `balanco` e `balanco-adversarial`.
- `luta-fidelidade` e snapshot do motor **verdes sem `-u`**; `git diff` dos 4 originais = 0 linhas; `tsc --noEmit` limpo; suíte unit: 1871 verdes. Falham só `sons-vozes` (4, trabalho da outra Vega
  em `src/audio`/`src/data/sons`, em andamento) e o `sprites-pipeline`, que passa isolado (estoura o tempo com a máquina carregada).
- **Mutação do fator** (`mutar-r1.mjs` no scratchpad): 11 mutantes, todos mortos: cada um dos 4 pontos sem o fator, o mínimo de 0,4 depois do fator, o teste de absorção sem o fator, fator lido da
  ficha/def em vez do `cfgChefe`, fator sem o ramo do chefe, `dano / fator`, o atalho do fator 1 e a retomada que força `fichaFase2 ?? null`.

## PARA O PRÓXIMO

**Lyra (E1):** `src/render/aura-chefe.ts:27-30` (`rampaDaFase2`) ainda lê `f.ficha === cfg.fichaFase2`. Para um guardião `fichaFase2` é `undefined` (e a NILA troca de ficha sozinha), então a aura da fase 2
**nunca acende**. Trocar por `f.barras < f.barrasMax` fora da `cena-chefe` (spec §2.3). Eu não toquei em `render/` (você está lá). `fight.ts:268` já lê `ch.chefe?.trilha` (undefined = `'fight'`).

**Cronos (P1):** `desafiantesDoChefe` do harness é uma cópia local (`ferramentas/balanco/chefoes.ts`); ao criar `src/meta/chefes.ts`, trocar o corpo por uma chamada. Enquanto `Regras.chefesDaFila` não existe,
o jogo só usa `cfg.chefe` para o ZENON (a escada), então **só o ZENON já ficou mais difícil em produção** (31,9% → 16,1% NORMAL); os guardiões só valem quando a P1 os puser na escada.

**Íris:** reproduzir do zero: `npm run balanco -- --completo --esquiva` (hash `957b8416d75bf060`; `hashRegulares` `f420ce928e06b304`) e uma 2ª opinião com `--base 2` ou `--base 3`
(`npm run balanco -- --esquiva --sem-regulares --base 3 --sementes 300 --niveis 1`). Conferir pontos de risco: raspão (mínimo 0,4 antes do fator), armadura (BAATAR `hp/chp/chk` têm `armor`), arremesso (BAATAR/AMINU
agarrões contra o chefe) e a NILA chefe em SARPA no round 2.

**Órion:** `git diff src/fight` (35 linhas); `danoNoDefensor` não devolve `dano * 1`; o fator só nasce em `cfgChefe` (o jogável nunca o vê); `aplicarAjustes` do harness NÃO valida o piso (é "e se", em memória).

## PENDÊNCIAS (decisão do dono / Atlas)
1. **DIFÍCIL fora da faixa em 4 de 6 chefões** (AMINU 10,0 contra 13-19; CENTELLA 25,8 contra 12-18; NILA 16,3 contra 9-15; BAATAR 19,0 contra 8-14). O fator é UM por chefão (spec D-D2) e o NORMAL tem
   prioridade (§4.4 item 6), então a relação DIFÍCIL/NORMAL fica onde a IA a põe (de 0,34 no AMINU a 1,04 no BAATAR). A faixa do DIFÍCIL (centro x 0,575, +-3) é MINHA leitura de "proporcionalmente menor":
   confirmar ou dar outra. Saídas: aceitar; afrouxar a faixa do DIFÍCIL; fator por nível (D-D2, precisa de um campo e um `if` no motor, que já sabe o nível pelo `cpu` do chefe); ou mexer na IA do chefão (a spec evitou).
2. CENTELLA e BAATAR no DIFÍCIL quase não mudam em relação ao NORMAL: o jogador CPU nível 2 cresce junto com o chefão. Pode ser característica da aproximação CPU x CPU (R4), não do jogo.
3. O dono joga AMINU e ZENON antes de fechar (R4 da spec).

## APRENDIZADO
- **Para o harness provar "regulares idênticos" precisei do hash ANTES, e o hash antigo incluía as lutas de chefe**: medi o baseline com o harness velho (`--sem-chefe --so sim`, 2 min) ANTES de editar qualquer coisa
  e só depois mexi. Comparar com `hashRegistros` antigo seria impossível. **Como evitar:** sempre congelar o hash do que "não pode mudar" antes de tocar no código.
- Com 100 sementes, o chefão do começo da progressão (AMINU, 4 desafiantes, 400 lutas/nível) tem erro de ~2 pontos, do tamanho da faixa de 4. Escolher o fator pelo centro da faixa e conferir com outro lote (base 3, 300
  sementes) em vez de pegar o primeiro fator que entra: dois fatores "dentro" a 100 sementes tinham margem de 0,3 ponto.
- Ponto de dano chamado direto (`applyHit` privado) emite no `pendentes` do Game, não em `g.events` (que é preenchido no `update`): para ler o evento do golpe isolado, ler `pendentes`.
- Teste de dano com defensor em `state = 'move'` precisa de `move` apontando para um golpe real (a hurtbox chama `golpeAtual()`).
- Ambiente: `python3 -` com heredoc e `\n` dentro de string Python vira quebra de linha real no JS (quebrou o `cli.mjs`); para texto livre, `Write`/`Edit`. O `cli.mjs` do harness é CRLF.
