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
| `alturaRef` | altura do idle0 no atlas (padrão 410) | BAATAR: `525`; ZENON: `558`; CAIO: `396` (idle agachado). Atenção: o K do jogo é `scale x 255 / idle0.h`, então `alturaRef` só muda os px do atlas, não o tamanho em jogo (o idle0 sempre vira 255 x scale); abaixo de 410 o retrato/rosto continua usando 410 |
| `fatorFolha` | multiplica a escala de uma folha | NILA: `{"f2": 1.2, "f3": 1.15, "f4": 1.1}` |
| `folhasExtras` | folha fora do layout | NILA f5, grade 4x3, poses `sarpa*` |
| `ponta` | modo da ponta do golpe por pose (`cima`, `direita`, `mao`, `mao:0.5`, `pe`, `pe:0.75`, `nenhuma`). `mao:F` é o `mao` olhando só as linhas acima da fração F do quadro (WEI LONG `sc1` "mao:0.5": a ombrada tem o joelho da frente abaixo do ombro e ele ganhava). `nenhuma` deixa o quadro SEM ponta: não há rastro nele e não vira aviso "sem ponta". Só serve a quadro que não decide a caixa (a caixa sai do PRIMEIRO quadro ativo da animação) | ZENON: `"lk1": "mao", "upper": "mao", "sb1": "cima", "decreto1": "mao"`; CAIO: `"sb2": "nenhuma"` (a perna aponta para trás, o ponto mais à direita seria a cabeça) |
| `ancora` | âncora horizontal (`ax`) por pose: `{ "idle*": "pes" }` põe o `ax` no meio dos pés (vão das últimas 5% x `alturaRef` linhas) em vez do centro de massa (`massa`, o padrão). `*` = prefixo, sem `*` = nome exato. Para o idle que balança o tronco sobre pés plantados (CAIO, ginga): com a massa os pés patinavam até 18 px no laço | CAIO: `{"idle*": "pes"}` |
| `acolchoar` | pixels de fundo por borda antes do corte | BAATAR b9: `{"esquerda": 16}`; ZENON s8: `{"s8": {"direita": 16}}` |
| `arquivos` | `{ folha: "nome.png" }` fixa a versão de uma folha (dentro de `folhas/`) no lugar da maior `-vN`. Arquivo inexistente é erro. Serve quando a maior versão é de OUTRA geração | WEI LONG: `{"f4": "wei-long-f4-especiais-v1.png"}` (as f4 `-v2..-v4` antigas, do traje velho, ganhariam) |

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

O tipo é `LutadorDef` (`src/data/tipos.ts:240`).

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

**Especiais:** três golpes `sFire` (ESP), `sDown` (↓+ESP) e `sFwd` (→+ESP), do tipo `Golpe` (`src/data/tipos.ts:154`). Campos principais: `S`, `A`, `R` (preparação, ativo e recuperação em quadros), `dmg`, `kb`, `hs`, `bs`, `lvl` (`mid`, `low`, `over` ou `throw`), `rank`, `cost`, `bh` e `rm`. Exemplo: `sDown` do AMINU (`aminu.ts`).

**Tipos de movimento:** `fire`, `rise`, `rush`, `leap`, `melee`, `carga`, `rebote`, `aparar`, `troca`. Os tipos novos, como `carga`, `rebote` e `troca`, têm a lógica em `src/fight/`. Ou seja, mecânica nova exige mudança no motor:

- `carga` (MASHI do AMINU): `src/fight/fighter.ts:813` (emissão do evento `carga`).
- `rebote` (RESORTE da CENTELLA): `src/fight/fighter.ts:854` (evento `rebote`).
- `parry` (PARADE da CAMILLE): `src/fight/game.ts:691` (condição da PARADE).
- `troca` (VADIVU da NILA): `src/fight/fighter.ts:761`.

Linhas conferidas no HEAD `73f0074`.

**Fichas (variações de um lutador):** `fichas` aceita campos parciais que sobrescrevem a base (`FichaDef`, `src/data/tipos.ts:235`). A NILA usa `fichas.sarpa` (`src/data/lutadores/nila.ts`).

**Poses por ficha:** `poseDaFicha` troca uma pose lógica por uma pose do atlas (`src/data/tipos.ts`). Só vale se o quadro existir no atlas. Exemplo: ZENON, `poseDaFicha: { sc0: 'decreto0', sc1: 'decreto1' }` (`zenon.ts:114`).

**Animação por especial:** `anim` (`src/data/tipos.ts:278`) aceita `sFire`, `sDown`, `sFwd`, `sResp` e `throw`. `throw` é a arte do agarrão comum. Sem ela, vale a animação base (`src/data/anim.ts`). Exemplo: ZENON, `throw: { s: ['grab0'], a: ['grab1'], r: ['grab1', 'grab0'] }` (`zenon.ts:90`).

**Altura em pé e projétil:**

- `alturaEmPe` (`tipos.ts:290`): altura da hurtbox em pé, em múltiplo da escala. Ausente = a caixa de sempre. Meça no navegador (skill `medir-antes-de-afirmar`) antes de confiar na conta: o ZENON tem 1,22, medido contra o sprite real.
- `alturaDoProjetil` (`tipos.ts:296`, usada em `src/data/montar.ts:212`): altura, em px, de onde o projétil nasce. Ausente = a ponta do golpe. ZENON: `175` (`zenon.ts:141`).

## Passo 6b: chefão (`ConfigChefe`)

Campo `chefe` no `LutadorDef` (`src/data/tipos.ts:99`). Quem vira chefão é decidido por `chefeDoArcade` (`src/meta/chefes.ts:21`): o ZENON (id em `CHEFE`, `src/meta/regras.ts:19`) ou o próximo guardião da fila (ver "Guardião", abaixo). Fora da luta de chefe, o lutador é jogável comum.

Exemplo real, ZENON (`src/data/lutadores/zenon.ts:146-156`, HEAD):

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

- `cena` (`CenaDef`, `tipos.ts:93`): as poses da fase 2 entre a troca de barra e a retomada. Validada no boot (`src/data/cena.ts`, `validarCena`, chamada em `src/data/montar.ts:117`): duração inteira de 1 a 600 e de 1 a 8 nomes de pose.
- `trilha` (`TrilhaChefe`, `tipos.ts:96`): `'chefe'` troca a música para a valsa do chefão (`src/audio/audio-sys.ts`, `TRILHAS.chefe`). Ausente = trilha de luta.
- `drenaEnergia` (`{ acerto, defesa }`, `tipos.ts:127`) em um golpe: rouba energia do rival no acerto e no bloqueio. `src/data/montar.ts:85-93` recusa, no boot, projétil, golpe de vários acertos, agarrão e números fora de `0 <= defesa <= acerto <= 100`. ZENON: TRIBUTO 12/6 no jogável e 20/10 no chefe (`zenon.ts:46`, `:51`, `:63`).
- A IA do chefe está em `IA_CHEFE` (`src/fight/cpu.ts`).

### Armadilhas do chefão (achadas no ZENON, com medida)

1. **`mods` da ficha é raso, por golpe.** `FichaDef.mods` SUBSTITUI o `mods` do def, golpe por golpe. Escrever `hp: { armor: 1 }` na fase 2 apaga o `bh` (a caixa de acerto) do golpe, e o golpe não conecta em nenhuma distância. Sempre espalhe o base: `hp: { ...MODS_BASE.hp, armor: 1 }` (`zenon.ts:111-112`).
2. **Sprite alto com caixa centrada na mão.** A caixa de acerto é `fy = tipY·scale + bh/2` e tem altura `bh`. Com escala acima de 1,2, o fundo da caixa fica acima da cabeça de quem tem escala 1,0 (hurtbox a 254 px). Medido no harness, na primeira rodada: `hk` com 2,9% de contato, o ZENON jogável com 7% de vitória e o chefão com 86% de vitória do jogador. Correção: `bh` maior nos golpes altos (`zenon.ts:77-81`) e `alturaDoProjetil`.
3. **Escala acima de 1,1 na vitrine.** `K` já leva `scale`, então a cabeça sai da tela na seleção, no VS e no final. Normalize na vitrine com `escalaDeVitrine` (`src/ui/personagens.ts:27`), nunca no dado. Os lutadores até 1,1 não mudam.
4. **Balanço com a configuração de produção.** A referência versionada (`docs/balanco/`) é a rodada COM esquiva, igual à produção: `npm run balanco -- --completo --esquiva` a regera. A rodada sem esquiva fica em `docs/balanco/sem-esquiva/` (`npm run balanco -- --completo`). Meça sempre com a esquiva.

### Guardião (chefe da fila)

Os guardiões AMINU, CENTELLA, CAMILLE, NILA e BAATAR têm um `chefe` como o do ZENON, mas **sem** `fichaFase1`/`fichaFase2`: lutam com a ficha de jogável e a fase 2 é só a troca de barra. Exemplo real, AMINU (`src/data/lutadores/aminu.ts`, HEAD `73f0074`):

```ts
chefe: {
  barras: 2,
  hpPorBarra: 56,
  cena: { duracao: 60, poses: ['sa1', 'sa3'] },
  bonusVitoria: 3000,
  danoRecebido: 0.925,
},
```

- `hpPorBarra`: vida de cada barra. Os guardiões usam 46 a 56 (BAATAR 46, CENTELLA 48, CAMILLE 49, NILA 54, AMINU 56).
- `cena`: 60 ticks; as poses precisam existir no atlas. Teste de referência: `tests/unit/zenon-arte.test.ts` (lê o atlas real).
- `danoRecebido`: entre `0,60` e `1` (`src/data/montar.ts:98-104`; fora disso, o boot falha). É a alavanca de dureza. Não mexa na ficha nem na IA para calibrar: rode o harness:

```bash
npm run balanco -- --chefes <id> --esquiva                 # só este chefão, com esquiva (a meta vale com esquiva)
npm run balanco -- --sem-regulares --varrer-dano 1,0.9,0.8 --esquiva
```

  A rodada `--chefes` nunca grava em `docs/balanco/` (`docs/balanco/README.md`). Mantenha o hash das lutas regulares igual antes e depois (`f420ce928e06b304` na rodada de produção).

**Para o guardião entrar no ARCADE:**

1. Id em `FILA_DESBLOQUEIO` (`src/meta/regras.ts`, ordem da fila). O ZENON continua em `CHEFE`. Um id em `INICIAIS` ou `FILA_DESBLOQUEIO` não pode também estar em `CHEFE` (`tests/unit/papeis-lutadores.test.ts`).
2. `chefesDaFila` precisa estar `true` em `REGRAS_PADRAO`. **No HEAD `73f0074` está `false`**: o guardião existe nos dados, mas o ARCADE só põe o ZENON como chefão. A virada é commit separado, com a UI de desbloqueio (ver `docs/arquitetura.md`, seção 6).
3. Textos e roteiro (**não commitados** na árvore de trabalho):
   - `TEXTOS_DOS_CHEFOES[id]` em `src/render/textos-dos-chefoes.ts`: `cartao` (nome, título, rodapé), `aviso`, `avisoRodape`, `vs`, `falas` (`derrota`, `fase2`, `vitoria`), `epilogo` (`quem`, `porque`, `convite`) e `tituloHud` (até 16 caracteres).
   - `ROTEIROS_DOS_GUARDIOES[id]` em `src/render/roteiros-de-entrada.ts`: batidas (`em`, `pose`, e `zoom`/`dx` opcionais), efeito e som. As poses precisam existir no atlas.
   - `APRESENTACAO[id] = doGuardiao('<id>')` em `src/render/apresentacao-lutadores.ts`. **`doGuardiao` lança erro no carregamento se faltar texto ou roteiro**: o boot não sobe.
4. Testes: `tests/unit/l1e1-chefoes.test.ts` (textos e roteiros), `tests/unit/p1-chefes-progressivos.test.ts` (ordem da fila e chefão da vez).

**Armadilha:** a fase 2 do guardião é a barra (`barras < barrasMax`). Na árvore de trabalho, a aura se acende na troca de barra. No HEAD, a regra antiga (`f.ficha === cfg.fichaFase2`) nunca vale para ele, então a aura não aparece (`docs/arquitetura.md`, seção 6.3).

## Passo 6c: falas da provocação (balão antes do round e na vitória)

Todo lutador precisa de falas. Sem elas, o boot não sobe.

Arquivo: `src/data/provocacoes.pt-BR.ts`, objeto `PROVOCACOES_PT_BR`. Tipo: `FalasDeProvocacao` (`src/data/provocacoes.ts:14`). A tabela é `Record<IdLutador, …>`: lutador sem entrada **não compila**. Em tempo de execução, `exigirFalasValidas` (`src/data/provocacoes.ts:197`) roda no import e derruba o boot se faltar `abertura`, `revanche` ou `vitoria`, ou se algum limite não passar.

```ts
novo: {
  abertura: ['Primeira fala.\nQuebra de linha escolhida.', 'Outra variante.', 'Terceira variante.'],   // mín. 3
  revanche: ['Uma linha só.', 'Outra linha.'],                                                          // mín. 2, 1 linha
  decisivo: ['Round decisivo.'],                                                                        // opcional
  vitoria: ['Vitória, variante 1.', 'Vitória, variante 2.', 'Vitória, variante 3.'],                   // mín. 3
  vitoriaPerfeita: ['Sem dano.'],                                                                       // opcional
  vitoriaPorTempo: ['Acabou o tempo.'],                                                                 // opcional
  contra: { zenon: { abertura: ['Fala para o ZENON.'], vitoria: ['Vitória sobre o ZENON.'] } },        // opcional, por rival
},
```

**Limites** (`LIMITES_DE_FALA`, `src/data/provocacoes.ts:61`):

- `abertura`, `vitoria*` e `contra.*`: até 2 linhas de 34 caracteres, e 64 no total.
- `revanche` e `decisivo`: 1 linha de 34.
- `{rival}` é trocado pelo nome do oponente e conta como 8 caracteres.
- Só Latin-1 imprimível e `— … “ ” ‘ ’`, e nada de emoji (a fonte do canvas não tem).

O teste real é a medida em pixels no navegador (`tests/e2e/provocacao.spec.ts`, "todas as falas"). Caracteres, por si, não garantem que o balão caiba no desktop e no celular.

Termos de outro idioma (japonês, hauçá, espanhol, francês) pedem revisão de falante nativo antes de publicar (`docs/textos-provocacao.md` §3).

## Passo 6d: voz e sons (identidade sonora)

**Estado: desligado.** `IDENTIDADE_SONORA = false` (`src/audio/identidade-sonora.ts:22`). Um lutador novo sem voz **não derruba o boot hoje**: nenhum código do jogo importa `src/data/sons` ainda. A validação (`exigirSonsValidos`, `src/data/sons/validar.ts:156`, chamada em `src/data/sons/index.ts:14`) passa a valer quando a S4 ligar `reagirComIdentidade` na luta.

Para a voz de um lutador novo, são quatro peças (handoff da Vega, `docs/handoff-vega-sons.md`):

1. **Perfil vocal** em `src/data/sons/perfis-vocais.ts`: uma linha `com('<id>', { f0, k, onda, q, ganhoF3, atq, vib, aspereza, sopro, coro, contorno })`. A tabela é `Record<IdLutador>`: sem perfil, não compila.
2. **Gritos** em `src/data/sons/gritos.ts`: o kiai, a vitória, o KO, o dano leve e o pesado, a guarda quebrada e o esforço. Palavras reais vêm marcadas `(rev.)`; `GRITOS_LEXICAIS` (`gritos.ts:130`) troca para a versão não lexical, se a revisão reprovar.
3. **Assinaturas dos especiais** em `src/data/sons/assinaturas.ts`: 33 entradas, uma por especial da tabela de apresentação, com a chave `<id>.<ficha|base>.<golpe>`. Com `exigirAssinaturasCompletas`, faltar uma chave reprova a validação.
4. **Calibração de volume**: rode a ferramenta e cole os blocos `CALPERFIS` e `CALASS` em `src/data/sons/calibracao.ts`:

```bash
SONS_DIAG=1 npx vitest run tests/unit/sons-calibra-diag.test.ts --silent=false > saida.txt
```

Depois: `npx vitest run tests/unit/sons-volume.test.ts` (confere o volume de cada voz e assinatura contra a calibração).

**Régua:** para provar que a voz nova é diferente das outras, sem ouvir, use `tests/support/regua-sons.ts` (limiares na seção 14 de `docs/arquitetura.md`). Mudar a régua exige novo veredito da Íris. Ouvir é do dono: os testes provam que os sons são diferentes, não que são bons.

## Passo 6e: tema musical

**Estado: desligado.** `TEMAS_POR_LUTADOR = false` (`src/audio/temas.ts:18`). Enquanto estiver assim, o tema não toca. A ligação na UI é o T3 (pendente).

1. **Definição** em `src/data/musica/temas/<id>.ts`: um `TemaDef` (`src/data/musica/tipos.ts:143`) com `nome`, `origem`, `tonica` (MIDI do grau 0), `escala` (crescente, de 5 a 7 notas, semitons de 0 a 11), `compasso` (`passos`, `passosPorPulso`, `pulsos`), `bpm`, `compassos` (8 ou 16), `volume`, `harmonia`, `lead`, `baixo`, `perc` e `fase2`. Os instrumentos são compostos de camadas (`tom`, `ruido`), com `desafina`, `filtro` etc.
2. **Registro** em `src/data/musica/temas.ts`: a chave `<id>` na tabela `TEMAS`, que é `Record<IdLutador, TemaDef | 'chefe'>`. Sem a chave, não compila.
3. **Validação no boot** (`exigirTemasValidos`, `src/data/musica/validar.ts:225`; limites em `LIMITES_MUSICA`, `validar.ts:12`): notação, escala e tônica, compasso, andamento, laço de 10 a 21 s, emenda do laço (última nota do lead a até 7 semitons da primeira), instrumentos e fase 2. Escala e tônica precisam ser diferentes das dos outros temas e da valsa do ZENON (`VALSA_ZENON`, `validar.ts:31`).
4. **Orçamento** (`validarOrcamentoDosTemas`, `src/audio/temas.ts:63`): no máximo **8 fontes novas por passo** e **15 fontes ativas**, medidas no sequenciador. Passar disso derruba o boot.
5. **Testes**: `tests/unit/musica-temas.test.ts`, `musica-regua.test.ts` (distinção contra os outros temas), `musica-mix.test.ts` (volume: RMS, voz, grave e pico em relação à trilha `fight`) e `musica-orcamento.test.ts`.

A melodia foi escrita à mão e não foi ouvida. Antes de ligar `TEMAS_POR_LUTADOR`, é preciso a escuta do dono.

## Passo 7: registro

| Onde | O que | Referência |
|---|---|---|
| `src/core/contratos.ts:136` | `IDS_LUTADORES`: adicione o id na ordem da grade | id fora da lista é tratado como desconhecido no save |
| `src/data/lutadores/index.ts` | `import`, entrada em `ROSTER` (`:27`), `VITRINE` (`:41`), `LUTADORES` (`:46`) e `export` | |
| `src/meta/regras.ts` | id em **um** papel: `INICIAIS`, `FILA_DESBLOQUEIO` ou `CHEFE` | Lutador sem papel nunca desbloqueia. Teste: `tests/unit/papeis-lutadores.test.ts` |
| `src/data/cenarios.ts` | entrada em `CENARIOS` com `casa: '<id>'` (`gr` em `:35`) | `CICLO_CENARIOS` (`:39`) só lista os iniciais |
| `src/data/apresentacao-especiais.ts` | registro de apresentação dos especiais (cinemática: quadro e entrada do golpe) | ZENON: 5 registros (`:72-78`, inclui `chefe2/sFire` e `chefe2/sFwd`) |
| `src/render/identidade-especiais.ts` | `IDENTIDADES`: identidade visual dos especiais (`:76`) | ZENON entrou aqui; `CHAVES_IDENTIDADE` (`:157`) |
| `src/render/apresentacao-lutadores.ts` | `APRESENTACAO`: entrada, vitória, falas, aviso e entrada dramática (`:39`) | Só desenho. Sem ela, o lutador não tem pose de entrada nem fala |
| `src/data/provocacoes.pt-BR.ts` | `PROVOCACOES_PT_BR`: falas do balão antes do round e na vitória | Obrigatória (boot). Passo 6c |
| `src/data/sons/` (`perfis-vocais.ts`, `gritos.ts`, `assinaturas.ts`, `calibracao.ts`) | voz, gritos e assinaturas dos especiais | Desligado (`IDENTIDADE_SONORA = false`). Passo 6d |
| `src/data/musica/temas/<id>.ts` e `src/data/musica/temas.ts` | tema musical do lutador (`TemaDef`) | Obrigatória (compila e valida no boot). Desligado (`TEMAS_POR_LUTADOR = false`). Passo 6e |

Não há lista de lutadores em `src/ui/` fora de `src/ui/dev-expansao.ts` (fixture de desenvolvimento). A seleção lê `ROSTER`. Mas a grade de 10 tem regra própria: com 10 casas, o chefão vai para a **casa de honra** (`src/ui/grade.ts`, `CASA_DE_HONRA`). Um 11º lutador exige revisar `temCasaDeHonra` e `ordemDaGrade`.

Exemplo real para o desbloqueio, de `src/meta/regras.ts`:

```ts
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila', 'baatar'];
export const CHEFE: IdLutador | null = 'zenon';
```

## Passo 8: assets e carga

**Por que a ordem importa:** no boot, o jogo lê o `atlas.json` de **todos** os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, `src/assets/carregador.ts:248`). Um arquivo que falte dá erro HTTP, e a falha interrompe o `Promise.all`. O jogo inteiro não sobe.

Regra prática: registre o id em `IDS_LUTADORES` só depois de `public/assets/lutadores/<id>/atlas.json` existir.

Depois do boot, a carga fica assim (`src/assets/elenco.ts`):

- Retratos: todos os lutadores, no boot (`src/assets/elenco.ts`).
- Imagens: a vitrine `VITRINE` e o cenário do título, fixos (`src/assets/elenco.ts`).
- Demais atlas: sob demanda. Há um limite de atlas não fixos na memória (`src/assets/gerenciador.ts:19`, padrão 3). Depois de carregar, sai o menos recente (`gerenciador.ts:127`).
- Atlas sem imagem ainda: o lutador some do desenho até a arte chegar (campo `pronta`, `src/assets/elenco.ts:18`).

**A confirmar:** o comportamento com `atlas.json` ausente não foi testado de ponta a ponta.

## Passo 9: testes e portões

Rode nesta ordem:

```bash
npm run typecheck
npm test
npm run build
```

Contagem da última suíte registrada nos handoffs: 92 arquivos, 2 126 testes (`docs/handoff-vega-temas.md`, árvore de trabalho). **A confirmar** nesta passada: não rodei a suíte inteira, porque a árvore está em edição. `npm run build` escreve `dist/`; use `npm run typecheck` para checar tipos sem efeito colateral.

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
- [ ] Se for guardião: `danoRecebido` calibrado com `npm run balanco -- --chefes <id> --esquiva` e textos/roteiro registrados (passo 6b, "Guardião").
- [ ] Falas da provocação em `PROVOCACOES_PT_BR` (abertura com 3+, revanche com 2+, vitória com 3+; passo 6c).
- [ ] Voz, gritos e assinaturas (33 especiais) e tema musical, se o lutador for entrar nas trilhas (passos 6d e 6e). Hoje ficam desligados.
- [ ] `typecheck`, `test` e `build` verdes.
- [ ] Medido no navegador (escala, HUD, pontas, balão de provocação e vitória) e não só por conta.
- [ ] `CHANGELOG.md` e `PROGRESSO.md` atualizados.
