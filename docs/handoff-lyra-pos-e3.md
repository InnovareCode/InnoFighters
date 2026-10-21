# Handoff Lyra — ajustes de UI pós-E3

Data: 2026-10-20. Sem commit. Produção igual: 4 lutadores, sem chefe, `ficha` sempre null.

## RESULTADO

- `src/ui/cenas/fight.ts`: o handler de `fase-chefe` agora só chama `aoFaseDoChefe` (flash + "FASE 2!") quando `ev.etapa === 'troca'` (antes disparava nas 3 etapas). Usa o tipo real do evento, sem o cast `Partial<EventoFaseChefe>`. `danca`/`retomada` não têm efeito visual: **não existe HUD/overlay de cena do chefe**, então ficou só o filtro (o som das três etapas continua vindo de `audio/eventos.ts`).
- `src/input/teclas.ts`: `ler()` produz `spSeg: segurada.has(mapa.sp)` (nível, não borda); `lerMesclado()` faz o OR dos dois. `ler()` passa a trazer `spSeg` sempre (false quando solto), por isso `INPUT_VAZIO` deixou de ser igual ao quadro lido.
- Render por ficha:
  - `src/render/lutador.ts`: novo `chDaFicha(ch, ficha)` (ficha null/desconhecida = base). `desenharLutador` usa a ficha ativa em `getPD`, `K`, cores `fire` (brilho) e rastro do golpe.
  - `src/render/mundo.ts`: cor do projétil vem da ficha do dono.
  - `src/render/hud.ts`: o marcador de custo do especial na barra de energia lê a ficha ativa (mesma razão: a ficha pode trocar `proj.cost`).
- Progresso (item 4): auditei `src/ui`, `src/main.ts`, `src/core`. Nenhum ponto reconstrói `Progresso` com os 4 campos: tudo passa por `aplicarVitoriaArcade`/`marcarVistos`/`liberados`/`naoVistos`/`estadoDaCasa` (meta) e `main.ts` grava o `prog` inteiro. Nada a corrigir; ficou teste de regressão (abaixo).
- Testes novos/ajustados:
  - `tests/unit/render-ficha.test.ts` (3): `chDaFicha`, base com ficha null, ficha ativa com cor e `K` da ficha.
  - `tests/unit/teclas.test.ts`: `VAZIO` = `INPUT_VAZIO + spSeg:false`; novo teste de `spSeg` nível x borda em P1, P2 e mesclado.
  - `tests/e2e/entrada.spec.ts`: `Quadro`/`VAZIO` com `spSeg`.
  - `tests/e2e/expansao.spec.ts`: novo bloco "progresso de uma onda futura (rollback)": semeia `desconhecidos`, abre a seleção e o final do ARCADE (`ending`) com teclas/cenas reais e confere memória e `localStorage`.

## PROVADO (executado)

- `npm run typecheck`: limpo. `npm test`: 25 arquivos, 434 testes verdes; nenhum `.snap` alterado. `npm run build`: ok.
- `npm run test:e2e` (rodado inteiro, um só, 4 workers): 70 passed, 36 skipped, 0 falhas. Skipped = testes marcados "só no desktop"/"só celular" por projeto, como já era. Inclui `fidelidade-prototipo`, `fidelidade-ui`, `entrada` e `jogo`.
- Rodei de novo só o bloco novo + `entrada` no desktop: verdes.
- Um erro durante o trabalho: a 1ª versão de `chDaFicha` (`ficha !== null`) quebrou 3 testes do `e4-ui` cujas leituras falsas não trazem `ficha` (undefined). Corrigi para `ficha ? ... : undefined` (também robusto a leitura parcial).

## NÃO provado

- Nada visto em navegador com ficha ativa ou com `etapa` de chefe: não há lutador com `fichas`/`chefe` nos dados de produção, e o BAATAR da Vega só existe em teste unitário. O render por ficha está provado em unitário com contexto 2D falso (cor e escala), não em pixel.
- O `?expansao=1` ainda não dispara troca de barra no navegador (a fixture é só de UI), então o handler `etapa === 'troca'` é provado por tipo/typecheck e leitura, não por e2e.

## PARA O PRÓXIMO

### Íris
- Conferir que `ler()` agora traz `spSeg` e que nada de menu depende de igualdade com `INPUT_VAZIO` (os testes que dependiam foram ajustados).
- Quando houver chefe jogável (E5): ver a troca de barra com UM "FASE 2!" só (sem o filtro seriam 3), e que a ficha da fase 2 muda cor do brilho/projétil e escala.
- Tentar quebrar: leitura de luta com `ficha` para um nome que o elenco não tem (cai no base, não lança).

### Vega / E5
- Se a ficha trocar `proj.cost`, o HUD já acompanha. `fichas[x].alias` (alias de pose por ficha) continua com você (S5); a render já passa o `LutadorMontado` da ficha ao `getPD`, mas não verifiquei como o `montar` resolve o alias dela.

## PENDÊNCIAS

- Efeito de `danca`/`retomada` (escurecer céu/faixa durante a cena): não existe HUD/overlay para isso; decisão do Atlas foi só filtrar. Quando entrar a folha B9 vale decidir se escurece (a render precisaria ler `phase === 'cena-chefe'`, que já está no C3).
- `ExtensaoChefeLeitura` (`@deprecated`) segue usada em `hud.ts` e nos testes `e4-ui`; limpar numa passada futura (o HUD pode ler `p.barras` direto).

## APRENDIZADO

- Campo novo no C2 que `ler()` sempre preenche (como `spSeg`) quebra todo `toEqual` contra `INPUT_VAZIO`/`VAZIO` de teste (unit e e2e): acrescentar o campo nos dois lados de uma vez.
- Helper de render que lê campo novo da leitura (`ficha`) deve tolerar `undefined`: há leituras falsas parciais nos testes de UI (`e4-ui`). Usar teste de verdade (`ficha ?`) em vez de `!== null`.
- Evento com várias etapas (`fase-chefe`) exige filtro por `etapa` em TODO consumidor visual; o som já é por etapa em `audio/eventos.ts`.
