# Handoff Vega — E1a: motor de luta pronto para N lutadores

Data: 2026-10-20. Zero mudança de comportamento. Sem git, sem dependência nova, `contratos.ts` NÃO alterado, `IDS_LUTADORES` NÃO alterado (continua com os 4).

## RESULTADO

Arquivos tocados (todos em `src/fight/`, `src/data/`, `src/core/constantes.ts` e `tests/unit/`):

- `src/data/tipos.ts`
  - `LutadorDef.idPrototipo` agora é **opcional**.
  - Novo `LutadorDef.corpo?: number` (meia-largura de empurrão; default `CORPO_PADRAO` = 39).
  - `EstiloProjetilDef` virou **alias** de `EstiloProjetil` (definição única em `core/contratos.ts`, que `core/` precisa por não importar `data/`). Quem já importava `EstiloProjetilDef` continua compilando.
- `src/core/constantes.ts`: `CORPO_PADRAO = 39`.
- `src/data/montar.ts`: `LutadorMontado.corpo: number` já resolvido (`def.corpo ?? CORPO_PADRAO`).
- `src/data/cenarios.ts`: `CenarioDef.casa: IdLutador` (era união literal dos 4). `IdCenario` NÃO ganhou ids (entram na E5 com a arte).
- `src/fight/fighter.ts`: `Fighter.barras` (sempre 1 hoje; reset para 1), `Fighter.vidaTotal` (= `hp + (barras-1)*maxHp`; com 1 barra é exatamente `hp`) e `Fighter.corpo`.
- `src/fight/game.ts`
  - `separate()`: o `78` fixo virou `a.corpo + b.corpo` (39+39 = 78; com corpos diferentes usa a soma dos dois, que é o que faz o chefão grande não atravessar o rival, e não "2*corpo" de um só lado).
  - **`Game.resolverVidaZerada(d, a): boolean`** (pública, para teste): único lugar que decide o que fazer com vida <= 0. Devolve true se houve KO. Treino nunca mata (hp vai a 1). Substitui as duas checagens duplicadas de `arremessar()` e `applyHit()`. A troca de barra do chefe (E3) entra aqui, antes do `ko()`, sem tocar nos chamadores.
  - `endRound()`: desempate por tempo compara `vidaTotal` em vez de `hp` (pronto para soma de barras).
- Testes: `tests/unit/dados.test.ts` itera só quem tem `idPrototipo`; novo `tests/unit/motor-n-lutadores.test.ts` (corpo default e customizado, lutador sem `idPrototipo` rodando CPU x CPU, `resolverVidaZerada` nos 3 casos, desempate por barras, casa de cenário <-> lutador, alias de estilos).

## PROVADO (executado, com saída)

- `npm run typecheck`: sem erros.
- `npm test`: 18 arquivos, 216 testes passando. Isso inclui a prova de fidelidade lock-step contra o protótipo (luta-fidelidade, 21 cenários, ~100 mil ticks) e o snapshot de CPU x CPU com semente 42, **sem atualizar o snapshot** (`git diff` do `.snap` vazio).
- `npm run build`: "built in 193ms".
- NÃO rodei `test:e2e` (colide com a porta 5173 da Lyra), como pedido. Nada provado em navegador.

## PARA O PRÓXIMO

- **Lyra (`data/lutadores/index.ts`)**: ao reorganizar em papéis, `LUTADORES: Record<IdLutador, LutadorDef>` continua sendo a fonte; `tests/unit/dados.test.ts` importa `ROSTER` e `LUTADORES` de lá e filtra por `idPrototipo`. Se `ROSTER` passar a ter mais de 4 ids, os testes de fidelidade pulam quem não tem `idPrototipo` (não quebram).
- **E3 (Vega)**: ponto de plugar a troca de barra = `Game.resolverVidaZerada` (se `d.barras > 1`: `barras--`, `hp = hpPorBarra`, derrubada sem KO, `invuln`, `hitstop`, `fase2`, evento `fase-chefe`; retornar false). `Fighter.barras` e `vidaTotal` já existem; `maxHp` hoje é o `hpPorBarra` implícito — ajustar a fórmula de `vidaTotal` quando `ConfigChefe.hpPorBarra` existir. Perfeito/pontuação continuam sobre a barra final (`w.hp >= w.maxHp - 0.01`).
- **E5 (novos lutadores)**: o lutador novo não declara `idPrototipo`; `corpo` só precisa ser declarado se diferir de 39 (chefão). Checar `clamp(x, 60, LARGURA-60)` e o zoom da câmera no navegador (Lyra).
- **E6 (harness)**: o motor roda CPU x CPU sem navegador (ver `tests/unit/fight.test.ts` e `motor-n-lutadores.test.ts`).

## PENDÊNCIAS

- `LutadorLeitura` ainda não expõe `barras`/`barrasMax`/`chefe` (C3 aditivo da seção 2.5; é E3). `Fighter` já tem `barras`, mas o contrato não.
- `IdCenario` continua a união dos 4; `CenarioDef.casa` já aceita qualquer `IdLutador`.
- A mutação de armadura (`> 0` por `> 1`) segue não detectada pelo lock-step (herdado da F1b, caso de borda raro).

## APRENDIZADO

- Extrair uma regra duplicada que tem `else if` encadeado: não troque `if (kill) A else if (B)` por `if (!kill && B) ... else if (C)`, porque o `kill` cai no `else if (C)` e aplica knockdown em quem acabou de morrer. Mantenha a forma `if (kill) {} else if ...`. Peguei isso lendo antes de rodar; o lock-step (KO em 8 lutas longas) pegaria também.
- Para "N lutadores sem quebrar nada", o mais barato foi: campos novos opcionais com default neutro + um teste que clona um lutador existente sem o campo legado e roda o motor.
