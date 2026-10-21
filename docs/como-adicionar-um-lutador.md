# Como adicionar um lutador

Passo a passo, da arte ao lutador jogável. Tudo confrontado com o código no commit `0684548` (2026-10-21).
Onde algo não foi confirmado, está marcado **a confirmar**.

Exemplos reais: AMINU (lutador de fila, o modelo mais simples), NILA (duas fichas e folha extra), ZENON (chefão final, com cena, dreno e
armadura). O BAATAR, que já foi chefão, hoje é lutador comum (5º da fila).

## Antes de começar

- **Decisão do dono:** nacionalidade, estilo, os 3 especiais e a posição na fila. Regra aprovada: no máximo 1 mecânica nova por lutador (`PROGRESSO.md`, decisão 1 da expansão).
- **Ferramenta de sprites:** `npm run sprites -- <id>` executa (sem argumento, imprime o uso). O import duplicado que a quebrava não está mais no HEAD.
- **Ordem obrigatória:** o id entra em `IDS_LUTADORES` só depois de os arquivos existirem em `public/assets/lutadores/<id>/` (passo 8).

## Passo 1: prompt de arte

Fonte única: `docs/prompts-arte.md`. **Não reconferido nesta passada.**

- §3: imagem-mestra. §4: cor de fundo por lutador. §11: nomes de arquivo.
- Os prompts montados ficam em `docs/prompts/NN-<id>.md`. Gere com `node ferramentas/prompts/montar-prompts.mjs` e confira com `node ferramentas/prompts/verificar-prompts.mjs`.
- **Não edite `docs/prompts/` à mão** (é saída gerada). Edite `docs/prompts-arte.md` e gere de novo.
- Ordem dentro de cada lutador: mestra, depois folha 1, depois o OK do dono, depois folhas 2 a 4, depois folha 5 (opcional).
- **A confirmar:** `docs/prompts-arte.md` §11 cita o Gemini como gerador. O `PROGRESSO.md` registra geração pelo Runway.

## Passo 2: folhas em `arte-fonte/`

Pasta: `arte-fonte/lutadores/<id>/folhas/`. Fica fora do git (decisão D5).

| Arquivo | Conteúdo |
|---|---|
| `<id>-mestra-v1.png` | imagem-mestra (traje de referência) |
| `<id>-f1-base-v1.png` | folha 1: idle e andar |
| `<id>-f2-reacoes-v1.png` | folha 2: agachado, bloqueio, pulo, nocaute |
| `<id>-f3-golpes-v1.png` | folha 3: socos e chutes |
| `<id>-f4-especiais-v1.png` | folha 4: especiais |
| `<id>-f5-extras-v1.png` | folha 5 (opcional, só NILA hoje) |
| `baatar-b1-v1.png` ... `baatar-b9-v1.png`, `baatar-br-v1.png` | BAATAR: 9 folhas de 6 poses e a folha de reposição `br` |
| `zenon-s1` ... `zenon-s10` (`zenon-s9-v2.png`) | ZENON: 10 folhas no layout `zenon` (mapa v2), nomes `s1` a `s10` |

- Versões corrigidas: `-v2`, `-v3`. Não apague as anteriores.
- O pipeline usa a versão de maior número. Regex: `^<id>-<folha>(?:-.*)?-v(\d+)\.png$` (`ferramentas/sprites/executar.mjs`).
- Exemplo real: `arte-fonte/lutadores/nila/folhas/` tem `nila-f1-base-v1.png`, `-v2`, `-v3`, `nila-f5-extras-v1.png`, `-v2` e `nila-mestra-v1.png`.
- Arte com efeitos desenhados (linha de chão, traços de movimento) não serve. Detectar por contagem de componentes conexos: 12 por folha (6 no chefão e no ZENON).

## Passo 3: layout e exceções (`ferramentas/sprites/lutadores.json`)

- Layout padrão: 12 poses por folha, grade 4x3 (`ferramentas/sprites/poses.mjs:68`, `GRADE_PADRAO = [4, 3]`).
- Layout `chefe`: 6 poses por folha, grade 3x2 (`poses.mjs:85`), folhas `b1` a `b9` e `br`. Usado pelo BAATAR.
- Layout `zenon`: 10 folhas, 3x2, mapa v2 do Apolo (`poses.mjs:111`, comentário em `poses.mjs:102`).
- Exceções ficam em `lutadores.json`, chave com o id. AMINU não tem entrada: usa o padrão.

| Chave | Efeito | Exemplo real |
|---|---|---|
| `layout` | troca o layout da folha (`padrao`, `chefe`, `zenon`) | ZENON: `"zenon"` |
| `celulas` | troca o mapa de poses de uma folha. Lista = apelidos (o mesmo desenho serve a dois quadros). `null` descarta a figura | CENTELLA f1: `["idle0", ["idle1", "idle3"], null, ...]` |
| `alturaRef` | altura do idle0 no atlas (padrão 410) | BAATAR: `525`; ZENON: `558` |
| `fatorFolha` | multiplica a escala de uma folha | NILA: `{"f2": 1.2, "f3": 1.15, "f4": 1.1}` |
| `folhasExtras` | folha fora do layout | NILA f5, grade 4x3, poses `sarpa*` |
| `ponta` | modo da ponta do golpe por pose (`cima`, `direita`, `mao`, `pe`, `pe:0.75`) | ZENON: `"lk1": "mao", "upper": "mao", "sb1": "cima", "decreto1": "mao"` |
| `acolchoar` | pixels de fundo por borda antes do corte | BAATAR b9: `{"esquerda": 16}`; ZENON s8: `{"s8": {"direita": 16}}` |

## Passo 4: gerar o atlas (`npm run sprites`)

Comando: `npm run sprites -- <id> [opções]`, que chama `node ferramentas/sprites/cli.mjs`.

Opções (`ferramentas/sprites/cli.mjs`, função `lerArgumentos`):

- `--folhas f1,f4`: só estas folhas.
- `--folha f2=arquivo.png`: usa um arquivo específico.
- `--espelhar f2:koFloor`: espelha uma pose.
- `--saida <pasta>`: padrão `sprites-gerados/<id>`. Recusa `public/assets`.
- `--altura-ref <px>`, `--escala <n>`, `--tolerancia <n>`, `--sem-contato`.
- Opção desconhecida dá erro: `opcao desconhecida: ...`.

Saída esperada: `sprites-gerados/<id>/` com `atlas-N.webp`, `atlas.json` (versão 2), `retrato.png` e `relatorio.json`. Mais `arte-fonte/lutadores/<id>/contact-sheet-<id>.png` para conferir.

**Verificado em 2026-10-21:** `npm run sprites` sem argumento imprime `ERRO: uso: npm run sprites -- <id> [opcoes]`, sem erro de import. **Não rodado** com um id real nesta passada: `npm run sprites -- zenon` grava em `sprites-gerados/` e `arte-fonte/`. O ZENON foi gerado pela Vega com este pipeline (11 folhas, 63 quadros, 4 páginas, 1,79 MB; `docs/handoff-vega-zenon.md`).

Quando rodar: ler `relatorio.json`, conferir avisos, halo, número de componentes e altura mediana. Confira o contato visual das pontas nos lugares certos (no ZENON: `lk1` na mão, `sb1` na palma erguida, `sweep` e `jkick` na bota).

## Passo 5: integrar a arte em `public/assets`

Manual. Não há script de cópia.

1. Copie para `public/assets/lutadores/<id>/`: `atlas-*.webp`, `atlas.json`, `retrato.png` e `retrato.json`.
   Exemplo real: `public/assets/lutadores/aminu/` tem `atlas-0.webp`, `atlas-1.webp`, `atlas.json`, `retrato.png` e `retrato.json`.
2. Retrato, se for regerar: `node ferramentas/gerar-retratos.mjs --so <id>`. Lê o `atlas.json` de `public/assets`. Usa o Chromium do Playwright. Com `--verificar`, só confere e não grava. Não há script npm para ele.
3. Cenário, se for novo:
   - Fonte: `arte-fonte/cenarios/cenario-<sigla>-vN.png`.
   - Conversão: `node ferramentas/converter-cenarios.mjs [qualidade] [--so <sigla>]`. A lista `FONTES` é fixa (`converter-cenarios.mjs:13`). Para uma sigla nova, acrescente a entrada antes de rodar.
   - Saída: `public/assets/cenarios/cenario-<sigla>.webp` (1920x1080).

## Passo 6: dados (`src/data/lutadores/<id>.ts`)

O tipo é `LutadorDef` (`src/data/tipos.ts:233`).

**Obrigatórios (conforme o uso no AMINU):** `id`, `country`, `stage`, `stageName`, `name`, `title`, `pitch`, `desc`, `fire`, `accent`, `pow`, `spd`, `hp`, `jump`, `scale`, `stride`, `bars`, `mods`, `especiais`. **A confirmar** a lista exata de obrigatórios no tipo.

**Opcionais:** `corpo`, `reach`, `anim`, `poseDaFicha`, `extras`, `armadura`, `fichas`, `chefe`, `alturaEmPe`, `alturaDoProjetil`, `idPrototipo` (só para os 4 do protótipo).

Trecho real de AMINU (`src/data/lutadores/aminu.ts`, resumido):

```ts
export const AMINU: LutadorDef = {
  id: 'aminu',
  country: 'NIGÉRIA',
  stage: 'ng',
  stageName: 'Tinturaria de Kano, Nigéria',
  name: 'AMINU',
  title: 'A Lança de Kano',
  pitch: 1.0,
  // ...
  pow: 1.06, spd: 0.98, hp: 102, jump: 0.92, scale: 1.06, stride: 12,
  bars: [4, 3, 3, 4],
  mods: {},
  especiais: { sFire: { /* MASHI */ }, sDown: { /* GARKUWA */ }, sFwd: { /* PASSO DO LEÃO */ } },
};
```

**Especiais:** três golpes `sFire` (ESP), `sDown` (↓+ESP) e `sFwd` (→+ESP), do tipo `Golpe` (`src/data/tipos.ts:147`). Campos principais: `S`, `A`, `R` (preparação, ativo e recuperação em quadros), `dmg`, `kb`, `hs`, `bs`, `lvl` (`mid`, `low`, `over` ou `throw`), `rank`, `cost`, `bh` e `rm`. Exemplo: `sDown` do AMINU (`aminu.ts`).

**Tipos de movimento:** `fire`, `rise`, `rush`, `leap`, `melee`, `carga`, `rebote`, `aparar`, `troca`. Os tipos novos, como `carga`, `rebote` e `troca`, têm a lógica em `src/fight/`. Ou seja, mecânica nova exige mudança no motor:

- `carga` (MASHI do AMINU): `src/fight/fighter.ts:92`.
- `rebote` (RESORTE da CENTELLA): `src/fight/fighter.ts:101`.
- `parry` (PARADE da CAMILLE): `src/fight/game.ts:598`.
- `troca` (VADIVU da NILA): `src/fight/fighter.ts:627`.

Os números desta lista vêm da versão anterior do doc; **a confirmar** se as linhas não deslocaram.

**Fichas (variações de um lutador):** `fichas` aceita campos parciais que sobrescrevem a base (`FichaDef`, `src/data/tipos.ts:228`). A NILA usa `fichas.sarpa` (`src/data/lutadores/nila.ts`).

**Poses por ficha:** `poseDaFicha` troca uma pose lógica por uma pose do atlas (`src/data/tipos.ts`). Só vale se o quadro existir no atlas. Exemplo: ZENON, `poseDaFicha: { sc0: 'decreto0', sc1: 'decreto1' }` (`zenon.ts:114`).

**Animação por especial:** `anim` (`src/data/tipos.ts:271`) aceita `sFire`, `sDown`, `sFwd`, `sResp` e `throw`. `throw` é a arte do agarrão comum. Sem ela, vale a animação base (`src/data/anim.ts`). Exemplo: ZENON, `throw: { s: ['grab0'], a: ['grab1'], r: ['grab1', 'grab0'] }` (`zenon.ts:90`).

**Altura em pé e projétil:**

- `alturaEmPe` (`tipos.ts:283`): altura da hurtbox em pé, em múltiplo da escala. Ausente = a caixa de sempre. Meça no navegador (skill `medir-antes-de-afirmar`) antes de confiar na conta: o ZENON tem 1,22, medido contra o sprite real.
- `alturaDoProjetil` (`tipos.ts:289`, usada em `src/data/montar.ts:198`): altura, em px, de onde o projétil nasce. Ausente = a ponta do golpe. ZENON: `175` (`zenon.ts:141`).

## Passo 6b: chefão (`ConfigChefe`)

Campo `chefe` no `LutadorDef` (`src/data/tipos.ts:99`). Só vale com `ConfigPartida.chefe` (`src/fight/game.ts:49`) e com o id em `CHEFE` (`src/meta/regras.ts`). Fora dela, o lutador é jogável comum.

Exemplo real, ZENON (`src/data/lutadores/zenon.ts:146-154`):

```ts
chefe: {
  barras: 2,
  hpPorBarra: 50,
  fichaFase1: 'chefe',
  fichaFase2: 'chefe2',
  cena: { duracao: 90, poses: ['cena0', 'cena1', 'cena2'] },
  bonusVitoria: 5000,
  trilha: 'chefe',
},
```

- `cena` (`CenaDef`, `tipos.ts:93`): as poses da fase 2 entre a troca de barra e a retomada. Validada no boot (`src/data/cena.ts`, `validarCena`, chamada em `src/data/montar.ts:105`): duração inteira de 1 a 600 e de 1 a 8 nomes de pose.
- `trilha` (`TrilhaChefe`, `tipos.ts:98`): `'chefe'` troca a música para a valsa do chefão (`src/audio/audio-sys.ts`, `TRILHAS.chefe`). Ausente = trilha de luta.
- `drenaEnergia` (`{ acerto, defesa }`, `tipos.ts:120`) em um golpe: rouba energia do rival no acerto e no bloqueio. `src/data/montar.ts:85-93` recusa, no boot, projétil, golpe de vários acertos, agarrão e números fora de `0 <= defesa <= acerto <= 100`. ZENON: TRIBUTO 12/6 no jogável e 20/10 no chefe (`zenon.ts:46`, `:51`, `:63`).
- A IA do chefe está em `IA_CHEFE` (`src/fight/cpu.ts`).

### Armadilhas do chefão (achadas no ZENON, com medida)

1. **`mods` da ficha é raso, por golpe.** `FichaDef.mods` SUBSTITUI o `mods` do def, golpe por golpe. Escrever `hp: { armor: 1 }` na fase 2 apaga o `bh` (a caixa de acerto) do golpe, e o golpe não conecta em nenhuma distância. Sempre espalhe o base: `hp: { ...MODS_BASE.hp, armor: 1 }` (`zenon.ts:111-112`).
2. **Sprite alto com caixa centrada na mão.** A caixa de acerto é `fy = tipY·scale + bh/2` e tem altura `bh`. Com escala acima de 1,2, o fundo da caixa fica acima da cabeça de quem tem escala 1,0 (hurtbox a 254 px). Medido no harness, na primeira rodada: `hk` com 2,9% de contato, o ZENON jogável com 7% de vitória e o chefão com 86% de vitória do jogador. Correção: `bh` maior nos golpes altos (`zenon.ts:77-81`) e `alturaDoProjetil`.
3. **Escala acima de 1,1 na vitrine.** `K` já leva `scale`, então a cabeça sai da tela na seleção, no VS e no final. Normalize na vitrine com `escalaDeVitrine` (`src/ui/personagens.ts:26`), nunca no dado. Os lutadores até 1,1 não mudam.
4. **Balanço com a configuração de produção.** A referência versionada (`docs/balanco/`) é a rodada COM esquiva, igual à produção: `npm run balanco -- --completo --esquiva` a regera. A rodada sem esquiva fica em `docs/balanco/sem-esquiva/` (`npm run balanco -- --completo`). Meça sempre com a esquiva.

## Passo 7: registro

| Onde | O que | Referência |
|---|---|---|
| `src/core/contratos.ts:125` | `IDS_LUTADORES`: adicione o id na ordem da grade | id fora da lista é tratado como desconhecido no save |
| `src/data/lutadores/index.ts` | `import`, entrada em `ROSTER` (`:27`), `VITRINE` (`:41`), `LUTADORES` (`:46`) e `export` | |
| `src/meta/regras.ts` | id em **um** papel: `INICIAIS`, `FILA_DESBLOQUEIO` ou `CHEFE` | Lutador sem papel nunca desbloqueia. Teste: `tests/unit/papeis-lutadores.test.ts` |
| `src/data/cenarios.ts` | entrada em `CENARIOS` com `casa: '<id>'` (`gr` em `:35`) | `CICLO_CENARIOS` (`:39`) só lista os iniciais |
| `src/data/apresentacao-especiais.ts` | registro de apresentação dos especiais (cinemática: quadro e entrada do golpe) | ZENON: 5 registros (`:72-78`, inclui `chefe2/sFire` e `chefe2/sFwd`) |
| `src/render/identidade-especiais.ts` | `IDENTIDADES`: identidade visual dos especiais (`:76`) | ZENON entrou aqui; `CHAVES_IDENTIDADE` (`:157`) |
| `src/render/apresentacao-lutadores.ts` | `APRESENTACAO`: entrada, vitória, falas, aviso e entrada dramática (`:36`) | Só desenho. Sem ela, o lutador não tem pose de entrada nem fala |

Não há lista de lutadores em `src/ui/` fora de `src/ui/dev-expansao.ts` (fixture de desenvolvimento). A seleção lê `ROSTER`. Mas a grade de 10 tem regra própria: com 10 casas, o chefão vai para a **casa de honra** (`src/ui/grade.ts`, `CASA_DE_HONRA`). Um 11º lutador exige revisar `temCasaDeHonra` e `ordemDaGrade`.

Exemplo real para o desbloqueio, de `src/meta/regras.ts`:

```ts
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila', 'baatar'];
export const CHEFE: IdLutador | null = 'zenon';
```

## Passo 8: assets e carga

**Por que a ordem importa:** no boot, o jogo lê o `atlas.json` de **todos** os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, `src/assets/carregador.ts:247`). Um arquivo que falte dá erro HTTP, e a falha interrompe o `Promise.all`. O jogo inteiro não sobe.

Regra prática: registre o id em `IDS_LUTADORES` só depois de `public/assets/lutadores/<id>/atlas.json` existir.

Depois do boot, a carga fica assim (`src/assets/elenco.ts`):

- Retratos: todos os lutadores, no boot (`elenco.ts:104`).
- Imagens: a vitrine `VITRINE` e o cenário do título, fixos (`elenco.ts:93`).
- Demais atlas: sob demanda. No máximo 3 não fixos ficam na memória (`src/assets/gerenciador.ts:19`). Sai o menos recente (`gerenciador.ts:178`).
- Atlas sem imagem ainda: o lutador some do desenho até a arte chegar (`elenco.ts:11`).

**A confirmar:** o comportamento com `atlas.json` ausente não foi testado de ponta a ponta.

## Passo 9: testes e portões

Rode nesta ordem:

```bash
npm run typecheck
npm test
npm run build
```

`npm test` nesta passada: 66 arquivos, 1475 testes verdes. `npm run build` **não** foi rodado (escreve `dist/`).

Testes que cobrem lutadores hoje:

- `tests/unit/papeis-lutadores.test.ts`: `INICIAIS + FILA + CHEFE = ROSTER`, sem repetição.
- `tests/unit/e5-elenco.test.ts`: ids, fila, chefão e escada (rivais distintos e o chefão por último).
- `tests/unit/zenon-motor.test.ts`: dreno, cena, validação do dado, armadura da fase 2.
- `tests/unit/zenon-arte.test.ts`: lê o atlas real: toda pose citada existe, tamanho do atlas, `alturaEmPe` medido, pontas.
- `tests/unit/sprites-zenon.test.ts` (layout) e `tests/unit/audio-chefe.test.ts` (trilha da valsa).
- `tests/unit/dados.test.ts`: a comparação com o protótipo só vale para os lutadores com `idPrototipo`. Lutador novo fica de fora.
- E2E: `tests/e2e/novos-lutadores.spec.ts`, `tests/e2e/expansao.spec.ts`, `tests/e2e/arte-sob-demanda.spec.ts`, `tests/e2e/zenon-z2z3.spec.ts`.

**Hook de teste do chefão:** `PULAR_ENTRADA` (`tests/e2e/_chefe.ts:50`) zera a entrada dramática numa luta recém-aberta, para os e2e que medem o HUD ou contam ticks. Não é um recurso do jogador.

**Portão genérico que o plano pede não existe.** O `docs/plano-expansao.md` §1.3 fala em um teste que itera `ROSTER` e confere: poses mínimas, `ponta` em todo quadro ativo, faixas de stats. Esse teste não existe. **A confirmar:** a Íris deve decidir se cria o teste.

## Checklist de entrega

- [ ] Mestra e folha 1 aprovadas pelo dono. Folhas em `arte-fonte/lutadores/<id>/folhas/`.
- [ ] `npm run sprites -- <id>` roda e o `relatorio.json` não traz avisos.
- [ ] `atlas.json` (versão 2), `retrato.png` e `retrato.json` em `public/assets/lutadores/<id>/`.
- [ ] Cenário em `public/assets/cenarios/cenario-<sigla>.webp` e entrada em `CENARIOS`.
- [ ] `src/data/lutadores/<id>.ts` criado; `index.ts` com `ROSTER`, `VITRINE` e `LUTADORES`.
- [ ] Id em `IDS_LUTADORES` e em um papel de `regras.ts`.
- [ ] Se for chefão: `chefe` com `cena`, `trilha`, `APRESENTACAO` e as armadilhas do passo 6b conferidas.
- [ ] `typecheck`, `test` e `build` verdes.
- [ ] Medido no navegador (escala, HUD, pontas e vitória) e não só por conta.
- [ ] `CHANGELOG.md` e `PROGRESSO.md` atualizados.
