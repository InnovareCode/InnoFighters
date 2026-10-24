# Como adicionar um lutador

Passo a passo, da arte ao lutador jogável. Tudo confrontado com o código no commit `78de1be` (2026-10-24, `origin/main`).
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
- **A confirmar:** `docs/prompts-arte.md` cita o Gemini como gerador no corpo (`:1` e `:28`), com nota no topo (`:9`) que manda ler Runway. O `PROGRESSO.md` registra geração pelo Runway.

## Passo 2: folhas em `arte-fonte/`

Pasta: `arte-fonte/lutadores/<id>/folhas/`. Fica fora do git (decisão D5). **A pasta não está no repositório**: a tabela abaixo não foi reconferida contra arquivos nesta passada.

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

- Layout padrão: 12 poses por folha, grade 4x3 (`ferramentas/sprites/poses.mjs:74`, `GRADE_PADRAO = [4, 3]`).
- Layout `chefe`: 6 poses por folha, grade 3x2 (`poses.mjs:91`, `LAYOUT_CHEFE`), folhas `b1` a `b9` e `br`. Usado pelo BAATAR.
- Layout `zenon`: 10 folhas, 3x2, mapa v2 do Apolo (`poses.mjs:117`, `LAYOUT_ZENON`; mapa `LAYOUTS` em `poses.mjs:134`).
- Exceções ficam em `lutadores.json`, chave com o id. AMINU não tem entrada: usa o padrão.

| Chave | Efeito | Exemplo real |
|---|---|---|
| `layout` | troca o layout da folha (`padrao`, `chefe`, `zenon`) | ZENON: `"zenon"` |
| `celulas` | troca o mapa de poses de uma folha. Lista = apelidos (o mesmo desenho serve a dois quadros). `null` descarta a figura | CENTELLA f1: `["idle0", ["idle1", "idle3"], null, ...]` |
| `alturaRef` | altura do idle0 no atlas (padrão 410) | BAATAR: `472`; ZENON: `502` (0,9 de 525 e 558 desde a T10 do orçamento: -21 MiB no pior par; depois de mudar `alturaRef` meça a frame data, porque a ponta da mão se desloca alguns px e uma caixa que roçava a cabeça do rival deixa de conectar, foi o `lp` do BAATAR); CAIO: `396` (idle agachado). Atenção: o K do jogo é `scale x 255 / idle0.h`, então `alturaRef` só muda os px do atlas, não o tamanho em jogo (o idle0 sempre vira 255 x scale); abaixo de 410 o retrato/rosto continua usando 410 |
| `fatorFolha` | multiplica a escala de uma folha | NILA: `{"f2": 1.2, "f3": 1.15, "f4": 1.1}` |
| `folhasExtras` | folha fora do layout | NILA f5, grade 4x3, poses `sarpa*` |
| `ponta` | modo da ponta do golpe por pose (`cima`, `direita`, `mao`, `mao:0.5`, `pe`, `pe:0.75`, `nenhuma`). `mao:F` é o `mao` olhando só as linhas acima da fração F do quadro (WEI LONG `sc1` "mao:0.5": a ombrada tem o joelho da frente abaixo do ombro e ele ganhava). `nenhuma` deixa o quadro SEM ponta: não há rastro nele e não vira aviso "sem ponta". Só serve a quadro que não decide a caixa (a caixa sai do PRIMEIRO quadro ativo da animação) | ZENON: `"lk1": "mao", "upper": "mao", "sb1": "cima", "decreto1": "mao"`; CAIO: `"sb2": "nenhuma"` (a perna aponta para trás, o ponto mais à direita seria a cabeça) |
| `ancora` | âncora horizontal (`ax`) por pose: `{ "idle*": "pes" }` põe o `ax` no meio dos pés (vão das últimas 5% x `alturaRef` linhas) em vez do centro de massa (`massa`, o padrão). `*` = prefixo, sem `*` = nome exato. Para o idle que balança o tronco sobre pés plantados (CAIO, ginga): com a massa os pés patinavam até 18 px no laço | CAIO: `{"idle*": "pes"}` (`ferramentas/sprites/lutadores.json`, `executar.mjs`) |
| `acolchoar` | pixels de fundo por borda antes do corte | BAATAR b9: `{"esquerda": 16}`; ZENON s8: `{"s8": {"direita": 16}}` |
| `arquivos` | `{ folha: "nome.png" }` fixa a versão de uma folha (dentro de `folhas/`) no lugar da maior `-vN`. Arquivo inexistente é erro. Serve quando a maior versão é de OUTRA geração | WEI LONG: `{"f4": "wei-long-f4-especiais-v1.png"}` (as f4 `-v2..-v4` antigas, do traje velho, ganhariam) |
| `filme` | bloco da folha FILME (quadros f0 a f5). Ver o passo 6f | todos os dez lutadores |

## Passo 4: gerar o atlas (`npm run sprites`)

Comando: `npm run sprites -- <id> [opções]`, que chama `node ferramentas/sprites/cli.mjs`.

Opções (`ferramentas/sprites/cli.mjs`, função `lerArgumentos`, `:25`):

- `--folhas f1,f4`: só estas folhas.
- `--folha f2=arquivo.png`: usa um arquivo específico.
- `--espelhar f2:koFloor`: espelha uma pose.
- `--saida <pasta>`: padrão `sprites-gerados/<id>`. Recusa `public/assets`.
- `--altura-ref <px>`, `--escala <n>`, `--tolerancia <n>`, `--sem-contato`.
- Opção desconhecida dá erro: `opcao desconhecida: ...`.

Saída esperada: `sprites-gerados/<id>/` com `atlas-N.webp`, `atlas.json` (versão 2), `retrato.webp` (190x190, de reserva: o publicado sai do `gerar-retratos`, passo 5) e `relatorio.json`. Mais `arte-fonte/lutadores/<id>/contact-sheet-<id>.png` para conferir. Se o lutador tem bloco `filme` em `lutadores.json`, o gerador copia a `filme.webp` de `public/assets/lutadores/<id>/` e confere o tamanho declarado.

**Verificado em 2026-10-21:** `npm run sprites` sem argumento imprime `ERRO: uso: npm run sprites -- <id> [opcoes]`, sem erro de import. **Não reexecutado nesta passada.** Rodar com um id real grava em `sprites-gerados/` e `arte-fonte/`. O ZENON foi gerado pela Vega com este pipeline (11 folhas, 63 quadros, 4 páginas, 1,79 MB; `docs/handoff-vega-zenon.md`).

Quando rodar: ler `relatorio.json`, conferir avisos, halo, número de componentes e altura mediana. Confira o contato visual das pontas nos lugares certos (no ZENON: `lk1` na mão, `sb1` na palma erguida, `sweep` e `jkick` na bota).

## Passo 5: integrar a arte em `public/assets`

Manual. Não há script de cópia.

1. Copie para `public/assets/lutadores/<id>/`: `atlas-*.webp` e `atlas.json` (apague as páginas que sobrarem de uma versão anterior com mais páginas). Se houver folha FILME, copie também `filme.webp`. O `retrato.webp` e o `retrato.json` vêm do passo 2, não da cópia.
   Exemplo real: `public/assets/lutadores/aminu/` tem `atlas-0.webp`, `atlas-1.webp`, `atlas.json`, `retrato.webp` e `retrato.json`.
2. Retrato (SEMPRE que o atlas mudar): `node ferramentas/gerar-retratos.mjs --so <id>`. Lê o `atlas.json` de `public/assets`, grava `retrato.webp` (quase sem perdas, T6 do orçamento: os 10 juntos pesam ~0,28 MiB, meta 0,35) e `retrato.json`, acerta SÓ o campo `retrato` do `atlas.json` e apaga o `retrato.png` antigo. Usa o Chromium do Playwright. Com `--verificar`, só confere e não grava. Não há script npm para ele.
3. Cenário, se for novo:
   - Fonte: `arte-fonte/cenarios/cenario-<sigla>-vN.png`.
   - Conversão: `node ferramentas/converter-cenarios.mjs [qualidade] [--so <sigla>]`. A lista `FONTES` é fixa (`ferramentas/converter-cenarios.mjs:16`). Para uma sigla nova, acrescente a entrada antes de rodar.
   - Saída: `public/assets/cenarios/cenario-<sigla>.webp` (1920x1080).

## Passo 6: dados (`src/data/lutadores/<id>.ts`)

O tipo é `LutadorDef` (`src/data/tipos.ts:270`).

**Obrigatórios (conforme o uso no AMINU):** `id`, `country`, `stage`, `stageName`, `name`, `title`, `pitch`, `desc`, `fire`, `accent`, `pow`, `spd`, `hp`, `jump`, `scale`, `stride`, `bars`, `mods`, `especiais`. **A confirmar** a lista exata de obrigatórios no tipo.

**Opcionais:** `corpo`, `reach`, `anim`, `poseDaFicha`, `extras`, `armadura`, `fichas`, `chefe`, `alturaEmPe`, `alturaDoProjetil`, `idPrototipo` (só para os 4 do protótipo). Linhas no tipo: `anim` `tipos.ts:308`, `poseDaFicha` `:313`, `alturaEmPe` `:320`, `alturaDoProjetil` `:326`, `fichas` `:333`, `chefe` `:337`.

Trecho real de AMINU (`src/data/lutadores/aminu.ts`, cabeçalho; os campos de `desc`, `fire`, `accent` e `especiais` foram resumidos):

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
  pow: 1.18, spd: 0.98, hp: 108, jump: 0.92, scale: 1.06, stride: 12,
  bars: [4, 3, 3, 4],
  mods: {},
  especiais: { sFire: { name: 'MASHI', /* ... */ }, /* sDown, sFwd */ },
};
```

**Especiais:** três golpes `sFire` (ESP), `sDown` (↓+ESP) e `sFwd` (→+ESP), do tipo `Golpe` (`src/data/tipos.ts:184`). Campos principais: `S`, `A`, `R` (preparação, ativo e recuperação em quadros), `dmg`, `kb`, `hs`, `bs`, `lvl` (`mid`, `low`, `over` ou `throw`), `rank`, `cost`, `bh` e `rm`. Exemplo: `sFire` do AMINU (MASHI, `aminu.ts`, carga em três níveis).

**Tipos de movimento:** o motor tem lógica própria para alguns tipos. Mecânica nova exige mudança no motor:

- `carga` (MASHI do AMINU): emissão do evento em `src/fight/fighter.ts:864` e `:877`.
- `rebote` (RESORTE da CENTELLA): emissão do evento em `src/fight/fighter.ts:905`.
- `parry` (PARADE da CAMILLE): condição da PARADE em `src/fight/game.ts:814`.
- `troca` (VADIVU da NILA): `src/fight/fighter.ts:789`.

Linhas conferidas no commit `78de1be`.

**Fichas (variações de um lutador):** `fichas` aceita campos parciais que sobrescrevem a base (`FichaDef`, `src/data/tipos.ts:265`). A NILA usa `fichas.sarpa` (`src/data/lutadores/nila.ts`).

**Poses por ficha:** `poseDaFicha` troca uma pose lógica por uma pose do atlas. Só vale se o quadro existir no atlas. Exemplo: ZENON, `poseDaFicha: { sc0: 'decreto0', sc1: 'decreto1' }`.

**Animação por especial:** `anim` aceita `sFire`, `sDown`, `sFwd`, `sResp` e `throw`. `throw` é a arte do agarrão comum. Sem ela, vale a animação base (`src/data/anim.ts`). Exemplo: ZENON, `throw: { s: ['grab0'], a: ['grab1'], r: ['grab1', 'grab0'] }`.

**Altura em pé e projétil:**

- `alturaEmPe` (`tipos.ts:320`): altura da hurtbox em pé, em múltiplo da escala. Ausente = a caixa de sempre. Meça no navegador (skill `medir-antes-de-afirmar`) antes de confiar na conta: o ZENON tem 1,22, medido contra o sprite real (`zenon.ts:144`).
- `alturaDoProjetil` (`tipos.ts:326`, usada em `src/data/montar.ts`): altura, em px, de onde o projétil nasce. Ausente = a ponta do golpe. ZENON: `175` (`zenon.ts:146`).

## Passo 6b: chefão (`ConfigChefe`)

Campo `chefe` no `LutadorDef` (`src/data/tipos.ts:337`); o tipo `ConfigChefe` está em `src/data/tipos.ts:124`. Quem vira chefão é decidido por `chefeDoArcade` (`src/meta/chefes.ts:21`): o ZENON (id em `CHEFE`, `src/meta/regras.ts:31`) ou o próximo guardião da fila (ver "Guardião", abaixo). Fora da luta de chefe, o lutador é jogável comum.

Exemplo real, ZENON (`src/data/lutadores/zenon.ts:151-162`, commit `78de1be`, campos resumidos):

```ts
chefe: {
  barras: 2,
  hpPorBarra: 50,
  fichaFase1: 'chefe',
  fichaFase2: 'chefe2',
  cena: { duracao: 90, poses: ['cena0', 'cena1', 'cena2'] },
  bonusVitoria: 5000,
  trilha: 'chefe',
  danoRecebido: 0.75,
  danoRecebidoDificil: 0.73,
},
```

- `cena` (`CenaDef`, `tipos.ts:118`): as poses da fase 2 entre a troca de barra e a retomada. Validada no boot (`src/data/cena.ts:15`, `validarCena`, chamada em `src/data/montar.ts:118`): duração inteira de 1 a 600 e de 1 a 8 nomes de pose.
- `trilha` (`TrilhaChefe`, `tipos.ts:121`): `'chefe'` troca a música para a valsa do chefão (`src/audio/audio-sys.ts`, `TRILHAS.chefe`). Ausente = trilha de luta.
- `danoRecebido` e `danoRecebidoDificil`: multiplicadores do dano que a vida do chefe sofre, para o NORMAL e para o DIFÍCIL da CPU. Ver "Guardião" e `docs/arquitetura.md`, seção 6.
- `drenaEnergia` (`{ acerto, defesa }`, `tipos.ts:157`) em um golpe: rouba energia do rival no acerto e no bloqueio. `src/data/montar.ts:86-91` recusa, no boot, projétil, golpe de vários acertos, agarrão e números fora de `0 <= defesa <= acerto <= 100`. ZENON: TRIBUTO 12/6 no jogável (`zenon.ts:46`) e 20 de acerto no chefão (`zenon.ts:51` e `:63`).
- A IA do chefe está em `IA_CHEFE` (`src/fight/cpu.ts`).

### Armadilhas do chefão (achadas no ZENON, com medida)

1. **`mods` da ficha é raso, por golpe.** `FichaDef.mods` SUBSTITUI o `mods` do def, golpe por golpe. Escrever `hp: { armor: 1 }` na fase 2 apaga o `bh` (a caixa de acerto) do golpe, e o golpe não conecta em nenhuma distância. Sempre espalhe o base: `hp: { ...MODS_BASE.hp, armor: 1 }` (`zenon.ts:111-112`).
2. **Sprite alto com caixa centrada na mão.** A caixa de acerto é `fy = tipY·scale + bh/2` e tem altura `bh`. Com escala acima de 1,2, o fundo da caixa fica acima da cabeça de quem tem escala 1,0 (hurtbox a 254 px). Medido no harness, na primeira rodada: `hk` com 2,9% de contato, o ZENON jogável com 7% de vitória e o chefão com 86% de vitória do jogador. Correção: `bh` maior nos golpes altos (`zenon.ts:77-81`) e `alturaDoProjetil`.
3. **Escala acima de 1,1 na vitrine.** `K` já leva `scale`, então a cabeça sai da tela na seleção, no VS e no final. Normalize na vitrine com `escalaDeVitrine` (`src/ui/personagens.ts:28`), nunca no dado. Os lutadores até 1,1 não mudam.
4. **Balanço com a configuração de produção.** A referência versionada (`docs/balanco/`) é a rodada COM esquiva e com o motor v2 ligado, igual à produção: `npm run balanco -- --completo --esquiva` a regera. A rodada sem esquiva fica em `docs/balanco/sem-esquiva/`. Meça sempre com a esquiva.

### Guardião (chefe da fila)

Os guardiões AMINU, CENTELLA, CAMILLE, NILA e BAATAR têm um `chefe` como o do ZENON, mas **sem** `fichaFase1`/`fichaFase2`: lutam com a ficha de jogável e a fase 2 é só a troca de barra. Exemplo real, AMINU (`src/data/lutadores/aminu.ts:71-78`, commit `78de1be`):

```ts
chefe: {
  barras: 2,
  hpPorBarra: 54,
  cena: { duracao: 60, poses: ['sa1', 'sa3'] },
  bonusVitoria: 3000,
  danoRecebido: 0.85,
  danoRecebidoDificil: 0.92,
},
```

- `hpPorBarra`: vida de cada barra. Os guardiões usam 46 a 54 (BAATAR 46, CENTELLA 50, CAMILLE 47, NILA 52, AMINU 54).
- `cena`: 60 ticks; as poses precisam existir no atlas. Teste de referência: `tests/unit/zenon-arte.test.ts` (lê o atlas real).
- `danoRecebido` (NORMAL) e `danoRecebidoDificil` (DIFÍCIL): entre `0,60` e `1` (`src/data/montar.ts:99` e `:102-105`; fora disso, o boot falha). `danoRecebidoDificil` vale quando a CPU que controla o chefe está em DIFÍCIL (`src/fight/game.ts:354-357`). São a alavanca de dureza. Não mexa na ficha nem na IA para calibrar: rode o harness:

```bash
npm run balanco -- --chefes <id> --esquiva                 # só este chefão, com esquiva (a meta vale com esquiva)
npm run balanco -- --sem-regulares --varrer-dano 1,0.9,0.8 --esquiva
```

  A rodada `--chefes` nunca grava em `docs/balanco/` (`docs/balanco/README.md`). Mantenha o hash das lutas regulares igual antes e depois de um ajuste de chefão (na rodada de produção do commit `78de1be`: `05bf1b64b46008a0`; depois da T10 do orçamento, com BAATAR e ZENON a 0,9 da escala: `e5db8a2586c836b5`).

**Para o guardião entrar no ARCADE:**

1. Id em `FILA_DESBLOQUEIO` (`src/meta/regras.ts:24`, ordem da fila). O ZENON continua em `CHEFE`. Um id em `INICIAIS` ou `FILA_DESBLOQUEIO` não pode também estar em `CHEFE` (`tests/unit/papeis-lutadores.test.ts`).
2. `chefesDaFila` precisa estar `true` em `REGRAS_PADRAO` (`src/meta/regras.ts:47`). No commit `78de1be` está `true`. Com a chave `false` (rollback), o guardião existe nos dados, mas o ARCADE só põe o ZENON como chefão.
3. Textos e roteiro (no commit `78de1be`, já commitados):
   - `TEXTOS_DOS_CHEFOES[id]` em `src/render/textos-dos-chefoes.ts`: `cartao` (nome, título, rodapé), `aviso`, `avisoRodape`, `vs`, `falas` (`derrota`, `fase2`, `vitoria`), `epilogo` (`quem`, `porque`, `convite`) e `tituloHud` (até 16 caracteres).
   - `ROTEIROS_DOS_GUARDIOES[id]` em `src/render/roteiros-de-entrada.ts` (`:56`): batidas (`em`, `pose`, e `zoom`/`dx` opcionais), efeito e som. As poses precisam existir no atlas.
   - `APRESENTACAO[id] = doGuardiao('<id>')` em `src/render/apresentacao-lutadores.ts`. `doGuardiao` (`:60`) lança erro no carregamento se faltar texto ou roteiro: o boot não sobe.
4. Testes: `tests/unit/l1e1-chefoes.test.ts` (textos e roteiros), `tests/unit/p1-chefes-progressivos.test.ts` (ordem da fila e chefão da vez).

**Armadilha:** a fase 2 do guardião é a barra (`barras < barrasMax`). A aura se acende na troca de barra (`rampaDaFase2`, `src/render/aura-chefe.ts:27`). Uma regra antiga (`f.ficha === cfg.fichaFase2`) nunca vale para ele; o código atual trata o guardião à parte (`aura-chefe.ts:32`).

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

**Limites** (`LIMITES_DE_FALA`, `src/data/provocacoes.ts:61`; constantes `DUAS_LINHAS` e `UMA_LINHA`, `:58-59`):

- `abertura`, `vitoria*` e `contra.*`: até 2 linhas de 34 caracteres, e 64 no total.
- `revanche` e `decisivo`: 1 linha de 34.
- `{rival}` é trocado pelo nome do oponente e conta como 8 caracteres.
- Só Latin-1 imprimível e `— … “ ” ‘ ’`, e nada de emoji (a fonte do canvas não tem).

O teste real é a medida em pixels no navegador (`tests/e2e/provocacao.spec.ts`, "todas as falas"). Caracteres, por si, não garantem que o balão caiba no desktop e no celular.

Termos de outro idioma (japonês, hauçá, espanhol, francês) pedem revisão de falante nativo antes de publicar (`docs/textos-provocacao.md` §3).

## Passo 6d: voz e sons (identidade sonora)

**Estado: ligado.** `IDENTIDADE_SONORA = true` (`src/audio/chaves.ts:14`, decisão do dono). Um lutador novo sem voz **derruba o boot**: `exigirSonsValidos` (`src/data/sons/validar.ts:156`) roda no carregamento do módulo `src/data/sons/index.ts:14`, que a camada de identidade importa no boot.

Para a voz de um lutador novo, são quatro peças (handoff da Vega, `docs/handoff-vega-sons.md`):

1. **Perfil vocal** em `src/data/sons/perfis-vocais.ts`: uma linha `com('<id>', { f0, k, onda, q, ganhoF3, atq, vib, aspereza, sopro, coro, contorno })` (função `com`, `:15`). A tabela `PERFIS_VOCAIS` (`:17`) é `Record<IdLutador>`: sem perfil, não compila.
2. **Gritos** em `src/data/sons/gritos.ts`: o kiai, a vitória, o KO, o dano leve e o pesado, a guarda quebrada e o esforço. Palavras reais vêm marcadas `(rev.)`; `GRITOS_LEXICAIS` (`gritos.ts:130`) troca para a versão não lexical, se a revisão reprovar.
3. **Assinaturas dos especiais** em `src/data/sons/assinaturas.ts`: 33 entradas (`ASSINATURAS`, `:276`), uma por especial da tabela de apresentação, com a chave `<id>.<ficha|base>.<golpe>`. Com `exigirAssinaturasCompletas`, faltar uma chave reprova a validação.
4. **Calibração de volume**: rode a ferramenta e cole os blocos `CALPERFIS` e `CALASS` em `src/data/sons/calibracao.ts`:

```bash
SONS_DIAG=1 npx vitest run tests/unit/sons-calibra-diag.test.ts --silent=false > saida.txt
```

Depois: `npx vitest run tests/unit/sons-volume.test.ts` (confere o volume de cada voz e assinatura contra a calibração).

**Régua:** para provar que a voz nova é diferente das outras, sem ouvir, use `tests/support/regua-sons.ts` (limiares na seção 14 de `docs/arquitetura.md`). Mudar a régua exige novo veredito da Íris. Ouvir é do dono: os testes provam que os sons são diferentes, não que são bons.

## Passo 6e: tema musical

**Estado: ligado.** `TEMAS_POR_LUTADOR = true` (`src/audio/chaves.ts:16`, decisão do dono). Um lutador sem tema não compila (`TEMAS` é `Record<IdLutador, …>`) e não passa na validação do boot.

1. **Definição** em `src/data/musica/temas/<id>.ts`: um `TemaDef` (`src/data/musica/tipos.ts:143`) com `nome`, `origem`, `tonica` (MIDI do grau 0), `escala` (crescente, de 5 a 7 notas, semitons de 0 a 11), `compasso` (`passos`, `passosPorPulso`, `pulsos`), `bpm`, `compassos` (8 ou 16), `volume`, `harmonia`, `lead`, `baixo`, `perc` e `fase2`. Os instrumentos são compostos de camadas (`tom`, `ruido`), com `desafina`, `filtro` etc.
2. **Registro** em `src/data/musica/temas.ts` (`TEMAS`, `:16`): a chave `<id>` na tabela `TEMAS`, que é `Record<IdLutador, TemaDef | 'chefe'>`. Sem a chave, não compila.
3. **Validação no boot** (`exigirTemasValidos`, `src/data/musica/validar.ts:225`, chamada em `src/data/musica/index.ts:10`; limites em `LIMITES_MUSICA`, `validar.ts:12`): notação, escala e tônica, compasso, andamento, laço de 10 a 21 s, emenda do laço (última nota do lead a até 7 semitons da primeira), instrumentos e fase 2. Escala e tônica precisam ser diferentes das dos outros temas e da valsa do ZENON (`VALSA_ZENON`, `validar.ts:31`).
4. **Orçamento** (`validarOrcamentoDosTemas`, `src/audio/temas.ts:62`): no máximo **8 fontes novas por passo** (`FONTES_NOVAS_POR_PASSO_MAX`, `:55`) e **15 fontes ativas** (`FONTES_ATIVAS_MAX`, `:56`), medidas no sequenciador. Passar disso derruba o boot.
5. **Testes**: `tests/unit/musica-temas.test.ts`, `musica-regua.test.ts` (distinção contra os outros temas), `musica-mix.test.ts` (volume: RMS, voz, grave e pico em relação à trilha `fight`) e `musica-orcamento.test.ts`.

A melodia foi escrita à mão e não foi ouvida pelo dono (a ligação é decisão dele, mas a escuta não está registrada em `PROGRESSO.md`).

## Passo 6f: filme do especial (folha FILME)

O especial que acerta vira um filme (ver `docs/arquitetura.md`, seção 20). Para um lutador novo, são três partes:

1. **Folha `filme.webp`** em `public/assets/lutadores/<id>/`, com seis quadros `f0` a `f5` (cada um um momento do golpe). No `atlas.json`, o bloco `filme` declara `imagem`, `tamanho` e os quadros, todos com `"painel": true` e sem `p` (`validarBlocoFilme`, `ferramentas/sprites/nucleo.mjs:607`). A chave `filme` de `ferramentas/sprites/lutadores.json` é a fonte do bloco.
2. **Orçamento da folha:** até 0,8 MiB e até 2048 x 1280 px (`ferramentas/orcamento/orcamento.json`, `filmeMiB` e `filmePaginaPx`). A folha conta fora do atlas.
3. **Linhas nos dados de filme:** `src/data/filmes.ts` (`T`, `:59`) com `dano` e `recuperacao` de cada especial, e `src/data/roteiros-filme.ts` (`LINHAS`, `:212`) com o roteiro da apresentação. **Sem linha em `filmes.ts`, o golpe não tem filme** (o especial só bate, como antes). Sem linha em `roteiros-filme.ts`, a UI usa o roteiro genérico do tipo (`roteiroGenerico`, `:312`).

A tabela de `filmes.ts` tem uma linha por golpe, com `dano` (base de `tabela de §4.3 ÷ pow`) e `recuperacao` (ticks do atacante depois do filme). O comentário no topo do arquivo explica a conta e as duas regras de teste (`tests/unit/filmes-regra.test.ts`).

Teste: `tests/unit/filme-paginas.test.ts` (bloco e folha de cada lutador), `tests/unit/roteiros-filme.test.ts`, `tests/e2e/filme.spec.ts`.

## Passo 6g: combos próprios

Opcional. Cada lutador (ou ficha) pode ter `combosProprios: ComboProprio[]` (`src/data/tipos.ts:22`, campo `efeito` em `:36`):

```ts
combosProprios: [
  { id: 'aminu-leao-no-canto', nome: 'RUGIDO DE KANO', sequencia: ['lp', 'hk', 'sFwd'], semQueda: [1], efeito: 'segura em pé e fecha no PASSO DO LEÃO' },
],
```

- `sequencia`: 2 a 4 golpes. Só normais de chão (`lp`, `lk`, `hp`, `hk`, `clp`, `clk`, `chp`, `chk`), e um especial (`sFire`, `sDown` ou `sFwd`) só no último lugar.
- `semQueda`: passos (índices) que seguram o rival em pé. Só vale num golpe que derruba e tem atordoamento (`hs > 0`).
- `final`: `derruba`, `lanca`, `parede` ou `cruza`. Não pode existir num combo que fecha com especial.
- `efeito`: uma linha, até 40 caracteres, sem espaço nas pontas.
- A validação no boot é `validarCombosProprios` (`src/data/combos-proprios.ts:23`, chamada em `src/data/montar.ts:177`). Falha alto em sequência repetida, golpe inexistente ou regra acima.
- Nomes e linhas de efeito dos 20 combos da primeira leva estão em `docs/combos-proprios.md`. Teste: `tests/unit/combos-nomes.test.ts`.

## Passo 7: registro

| Onde | O que | Referência |
|---|---|---|
| `src/core/contratos.ts:174` | `IDS_LUTADORES`: adicione o id na ordem da grade | id fora da lista é tratado como desconhecido no save |
| `src/data/lutadores/index.ts` | `import`, entrada em `ROSTER` (`:27`), `VITRINE` (`:41`), `LUTADORES` (`:46`) e `export` | |
| `src/meta/regras.ts` | id em **um** papel: `INICIAIS`, `FILA_DESBLOQUEIO` ou `CHEFE` | Lutador sem papel nunca desbloqueia. Teste: `tests/unit/papeis-lutadores.test.ts` |
| `src/data/cenarios.ts` | entrada em `CENARIOS` (`:25`) com `casa: '<id>'` | `CICLO_CENARIOS` (`:40`) só lista os iniciais |
| `src/data/apresentacao-especiais.ts` | registro de apresentação dos especiais (cinemática: quadro e entrada do golpe) | ZENON: registros `chefe2/sFire` e `chefe2/sFwd` (`:77` e seguintes) |
| `src/render/identidade-especiais.ts` | `IDENTIDADES`: identidade visual dos especiais (`:76`) | ZENON entrou aqui; `CHAVES_IDENTIDADE` (`:157`) |
| `src/render/apresentacao-lutadores.ts` | `APRESENTACAO` (`:78`): entrada, vitória, falas, aviso e entrada dramática | Só desenho. Sem ela, o lutador não tem pose de entrada nem fala |
| `src/data/provocacoes.pt-BR.ts` | `PROVOCACOES_PT_BR`: falas do balão antes do round e na vitória | Obrigatória (boot). Passo 6c |
| `src/data/sons/` (`perfis-vocais.ts`, `gritos.ts`, `assinaturas.ts`, `calibracao.ts`) | voz, gritos e assinaturas dos especiais | Obrigatória (boot). Passo 6d |
| `src/data/musica/temas/<id>.ts` e `src/data/musica/temas.ts` | tema musical do lutador (`TemaDef`) | Obrigatória (compila e valida no boot). Passo 6e |
| `public/assets/lutadores/<id>/filme.webp` e bloco `filme` | folha FILME e seus quadros | Recomendada (sem ela, o especial usa a pose de reserva). Passo 6f |
| `src/data/filmes.ts` e `src/data/roteiros-filme.ts` | dano do filme e roteiro da apresentação, por golpe | Sem linha em `filmes.ts`, o golpe não tem filme. Passo 6f |

Não há lista de lutadores em `src/ui/` fora de `src/ui/dev-expansao.ts` (fixture de desenvolvimento). A seleção lê `ROSTER`. Mas a grade de 10 tem regra própria: com 10 casas, o chefão vai para a **casa de honra** (`src/ui/grade.ts`, `CASA_DE_HONRA`, `:56`). Um 11º lutador exige revisar `temCasaDeHonra` (`:19`) e `ordemDaGrade` (`:28`).

Exemplo real para o desbloqueio, de `src/meta/regras.ts`:

```ts
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila', 'baatar'];
export const CHEFE: IdLutador | null = 'zenon';
```

## Passo 8: assets e carga

**Por que a ordem importa:** no boot, o jogo lê o `atlas.json` de **todos** os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:94`, `src/assets/carregador.ts:354`). Um arquivo que falte dá erro HTTP, e a falha interrompe o `Promise.all`. O jogo inteiro não sobe.

Regra prática: registre o id em `IDS_LUTADORES` só depois de `public/assets/lutadores/<id>/atlas.json` existir.

Depois do boot, a carga fica assim (`src/assets/elenco.ts`, `src/assets/gerenciador.ts`):

- Retratos: todos os lutadores, no boot.
- Imagens: a vitrine `VITRINE` e o cenário do título, fixos.
- Demais atlas: sob demanda. Na política de produção (`'por-peso'`, `POLITICA_PADRAO` em `src/assets/elenco.ts:87`), o teto é em bytes e o despejo acontece antes de decodificar. Com `?residencia=fixa` (rollback), há no máximo `LIMITE_RESIDENTES_FIXA = 3` atlas não fixos (`src/assets/gerenciador.ts:17`) e a poda acontece depois de carregar (`podar`, `gerenciador.ts:501`). Detalhes em `docs/arquitetura.md`, seção 21.
- Folha FILME: só entra na luta (`carregarFilme`, `src/assets/carregador.ts:265`).
- Atlas sem imagem ainda: o lutador some do desenho até a arte chegar.

**A confirmar:** o comportamento com `atlas.json` ausente não foi testado de ponta a ponta.

## Passo 9: testes e portões

Rode nesta ordem:

```bash
npm run typecheck
npm test
npm run build
npm run orcamento     # depois do build; hoje as metas são só aviso
```

Contagem da última suíte registrada nos handoffs: 92 arquivos, 2 126 testes (`docs/handoff-vega-temas.md`, árvore de trabalho de 2026-10-21). **A confirmar** nesta passada: não rodei a suíte inteira. `npm run build` escreve `dist/`; use `npm run typecheck` para checar tipos sem efeito colateral.

Testes que cobrem lutadores hoje:

- `tests/unit/papeis-lutadores.test.ts`: `INICIAIS + FILA + CHEFE = ROSTER`, sem repetição.
- `tests/unit/e5-elenco.test.ts`: ids, fila, chefão e escada (rivais distintos e o chefão por último).
- `tests/unit/zenon-motor.test.ts`: dreno, cena, validação do dado, armadura da fase 2.
- `tests/unit/zenon-arte.test.ts`: lê o atlas real: toda pose citada existe, tamanho do atlas, `alturaEmPe` medido, pontas.
- `tests/unit/sprites-zenon.test.ts` (layout) e `tests/unit/audio-chefe.test.ts` (trilha da valsa).
- `tests/unit/dados.test.ts`: a comparação com o protótipo só vale para os lutadores com `idPrototipo`. Lutador novo fica de fora.
- `tests/unit/filmes-regra.test.ts`, `roteiros-filme.test.ts`, `filme-paginas.test.ts` e `combos-nomes.test.ts`: filme, roteiros, folha e nomes dos combos.
- E2E: `tests/e2e/novos-lutadores.spec.ts`, `tests/e2e/expansao.spec.ts`, `tests/e2e/arte-sob-demanda.spec.ts`, `tests/e2e/zenon-z2z3.spec.ts`, `tests/e2e/filme.spec.ts`.

**Hook de teste do chefão:** `PULAR_ENTRADA` (`tests/e2e/_chefe.ts:50`) zera a entrada dramática numa luta recém-aberta, para os e2e que medem o HUD ou contam ticks. Não é um recurso do jogador.

**Portão genérico que o plano pede não existe.** O `docs/plano-expansao.md` §1.3 fala em um teste que itera `ROSTER` e confere: poses mínimas, `ponta` em todo quadro ativo, faixas de stats. Esse teste não existe. **A confirmar:** a Íris deve decidir se cria o teste.

## Orçamentos

Metas de peso e de tamanho, em `ferramentas/orcamento/orcamento.json` (fonte: `docs/orcamentos-2026-10-23.md`, §1):

- Atlas: até 1,6 MiB por lutador (BAATAR e ZENON até 2,0 MiB) e até 2048 px por página.
- Folha FILME: até 0,8 MiB e até 2048 x 1280 px.
- Cenário: até 250 KiB por arquivo em `public/assets/cenarios/`.

Hoje `bloqueantes` está vazio, então estouro vira aviso. Os valores medidos no commit `78de1be` não foram reconferidos nesta passada (é preciso `npm run build` antes de `npm run orcamento`).

## Checklist de entrega

- [ ] Mestra e folha 1 aprovadas pelo dono. Folhas em `arte-fonte/lutadores/<id>/folhas/`.
- [ ] `npm run sprites -- <id>` roda e o `relatorio.json` não traz avisos.
- [ ] `atlas.json` (versão 2), `retrato.webp` e `retrato.json` em `public/assets/lutadores/<id>/`.
- [ ] Folha FILME (`filme.webp`) e bloco `filme` no `atlas.json`, dentro do orçamento (passo 6f).
- [ ] Cenário em `public/assets/cenarios/cenario-<sigla>.webp` e entrada em `CENARIOS`.
- [ ] `src/data/lutadores/<id>.ts` criado; `index.ts` com `ROSTER`, `VITRINE` e `LUTADORES`.
- [ ] Id em `IDS_LUTADORES` e em um papel de `regras.ts`.
- [ ] Se for chefão: `chefe` com `cena`, `trilha`, `danoRecebido`, `danoRecebidoDificil`, `APRESENTACAO` e as armadilhas do passo 6b conferidas.
- [ ] Se for guardião: fatores calibrados com `npm run balanco -- --chefes <id> --esquiva` e textos/roteiro registrados (passo 6b, "Guardião").
- [ ] Falas da provocação em `PROVOCACOES_PT_BR` (abertura com 3+, revanche com 2+, vitória com 3+; passo 6c).
- [ ] Voz, gritos e assinaturas (33 especiais) e tema musical (passos 6d e 6e). Ambos já estão ligados no jogo: o lutador novo precisa deles para não derrubar o boot.
- [ ] Linhas de `filmes.ts` e `roteiros-filme.ts` para os especiais (passo 6f), e `combosProprios` validados (passo 6g), se houver.
- [ ] `typecheck`, `test`, `build` e `orcamento` verdes.
- [ ] Medido no navegador (escala, HUD, pontas, balão de provocação e vitória, filme) e não só por conta.
- [ ] `CHANGELOG.md` e `PROGRESSO.md` atualizados.
