# Como adicionar um lutador

Passo a passo, da arte ao lutador jogável. Tudo confrontado com o código no commit `c7437c1`
(2026-10-21). Onde algo não foi confirmado, está marcado **a confirmar**.

Exemplos reais: AMINU (lutador de fila), NILA (duas fichas e folha extra), BAATAR (chefão).

## Antes de começar

- **Decisão do dono:** nacionalidade, estilo, os 3 especiais e a posição na fila. Regra aprovada: no máximo 1 mecânica nova por lutador (`PROGRESSO.md`, decisão 1 da expansão).
- **Ferramenta de sprites quebrada:** `npm run sprites` não executa no estado atual (ver passo 4). Os passos 2 a 4 dependem disso.
- **Ordem obrigatória:** o id entra em `IDS_LUTADORES` só depois de os arquivos existirem em `public/assets/lutadores/<id>/` (passo 8). Motivo no passo 8.

## Passo 1: prompt de arte

Fonte única: `docs/prompts-arte.md`.

- §3: imagem-mestra. §4: cor de fundo por lutador. §6: lutadores novos (6.1 AMINU, 6.2 CENTELLA, 6.3 CAMILLE, 6.4 NILA). §7: BAATAR. §10: checklist de aceite. §11: nomes de arquivo.
- Os prompts montados ficam em `docs/prompts/NN-<id>.md`. Gere com `node ferramentas/prompts/montar-prompts.mjs` e confira com `node ferramentas/prompts/verificar-prompts.mjs`.
- `ferramentas/prompts/montar-prompts.mjs` tem o caminho fixo `C:/Projetos/Web/InnoGames/InnoFighters` (linha 5). Em outra máquina, ajuste antes de rodar.
- **Não edite `docs/prompts/` à mão** (é saída gerada). Edite `docs/prompts-arte.md` e gere de novo.
- Ordem dentro de cada lutador: mestra, depois folha 1, depois espera o OK do dono, depois folhas 2 a 4, depois folha 5 (opcional). Fonte: `docs/prompts-arte.md` §0.
- **A confirmar:** `docs/prompts-arte.md` §11 cita o Gemini como gerador. O `PROGRESSO.md` registra geração pelo Runway. Não há confirmação de qual é o padrão.

## Passo 2: folhas em `arte-fonte/`

Pasta: `arte-fonte/lutadores/<id>/folhas/`. Fica fora do git (decisão D5).

Nomes (`docs/prompts-arte.md` §11):

| Arquivo | Conteúdo |
|---|---|
| `<id>-mestra-v1.png` | imagem-mestra (traje de referência) |
| `<id>-f1-base-v1.png` | folha 1: idle e andar |
| `<id>-f2-reacoes-v1.png` | folha 2: agachado, bloqueio, pulo, nocaute |
| `<id>-f3-golpes-v1.png` | folha 3: socos e chutes |
| `<id>-f4-especiais-v1.png` | folha 4: especiais |
| `<id>-f5-extras-v1.png` | folha 5 (opcional, só NILA hoje) |
| `baatar-b1-v1.png` ... `baatar-b9-v1.png`, `baatar-br-v1.png` | chefão: 9 folhas de 6 poses e a folha de reposição `br` |

- Versões corrigidas: `-v2`, `-v3`. Não apague as anteriores.
- O pipeline usa a versão de maior número. Regex de busca: `^<id>-<folha>(?:-.*)?-v(\d+)\.png$` (`ferramentas/sprites/executar.mjs:49-63`).
- Exemplo real: `arte-fonte/lutadores/nila/folhas/` tem `nila-f1-base-v1.png`, `-v2`, `-v3`, `nila-f5-extras-v1.png`, `-v2` e `nila-mestra-v1.png`.

## Passo 3: layout e exceções (`ferramentas/sprites/lutadores.json`)

- Layout padrão: 12 poses por folha, grade 4x3 (`ferramentas/sprites/poses.mjs`, `GRADE_PADRAO = [4, 3]`).
- Layout do chefão: `layout: "chefe"`, 6 poses por folha, grade 3x2, folhas `b1` a `b9` mais `br` (`poses.mjs:81-97`).
- Exceções ficam em `lutadores.json`, chave com o id. A função `lerExcecoes` as lê (`executar.mjs:21-27`). AMINU não tem entrada: usa o padrão.

| Chave | Efeito | Exemplo real |
|---|---|---|
| `celulas` | troca o mapa de poses de uma folha. Lista = apelidos (o mesmo desenho serve a dois quadros). `null` descarta a figura | CENTELLA f1: `["idle0", ["idle1", "idle3"], null, ...]` |
| `alturaRef` | altura do idle0 no atlas (padrão 410) | BAATAR: `525` |
| `fatorFolha` | multiplica a escala de uma folha | NILA: `{"f2": 1.2, "f3": 1.15, "f4": 1.1}` |
| `folhasExtras` | folha fora do layout | NILA f5, grade 4x3, poses `sarpa*` |
| `ponta` | modo da ponta do golpe por pose (`cima`, `direita`, `mao`, `pe`, `pe:0.75`) | BAATAR: `"dive1": "direita"`, `"jkick": "pe"` |
| `acolchoar` | pixels de fundo por borda antes do corte | BAATAR b9: `{"esquerda": 16}` |

## Passo 4: gerar o atlas (`npm run sprites`)

Comando: `npm run sprites -- <id> [opções]`, que chama `node ferramentas/sprites/cli.mjs`.

Opções (`ferramentas/sprites/cli.mjs:5-13`):

- `--folhas f1,f4`: só estas folhas.
- `--folha f2=arquivo.png`: usa um arquivo específico.
- `--espelhar f2:koFloor`: espelha uma pose.
- `--saida <pasta>`: padrão `sprites-gerados/<id>`. Recusa `public/assets` (`cli.mjs:60`).
- `--altura-ref <px>`, `--escala <n>`, `--tolerancia <n>` (padrão 48), `--sem-contato`.

Saída esperada: `sprites-gerados/<id>/` com `atlas-N.webp`, `atlas.json` (versão 2), `retrato.png` e `relatorio.json`. Mais `arte-fonte/lutadores/<id>/contact-sheet-<id>.png` e `-claro.png` (`cli.mjs:15-16`, `executar.mjs:301-331`).

**Estado atual: não executa.** Verificado em 2026-10-21:

```
SyntaxError: Identifier 'separarFundidas' has already been declared
```

- Causa: `ferramentas/sprites/executar.mjs:15` importa `separarFundidas` duas vezes. O HEAD tem o mesmo erro (`git show HEAD:ferramentas/sprites/executar.mjs`).
- Correção: remover a repetição. Dono da ferramenta: Vega.
- Por que a suíte não pegou: `tests/unit/sprites-pipeline.test.ts` carrega o módulo pelo Vitest (`tests/unit/_ferramenta.ts`), que transforma o código antes de avaliar. **A confirmar:** essa é a explicação mais provável, não foi testada.

Quando o comando voltar a rodar: ler `relatorio.json` e conferir avisos, halo, número de componentes (12 por folha; 6 no chefão) e altura mediana. O CLI imprime esses dados (`cli.mjs:68-71`).

## Passo 5: integrar a arte em `public/assets`

Manual. Não há script de cópia. O CLI avisa que a integração é da F3 (`cli.mjs:60`).

1. Copie para `public/assets/lutadores/<id>/`: `atlas-*.webp`, `atlas.json`, `retrato.png` e `retrato.json`.
   Exemplo real: `public/assets/lutadores/aminu/` tem `atlas-0.webp`, `atlas-1.webp`, `atlas.json`, `retrato.png` e `retrato.json`.
2. Retrato, se for regerar: `node ferramentas/gerar-retratos.mjs --so <id>` (`ferramentas/gerar-retratos.mjs:1-20`). Lê o `atlas.json` de `public/assets`. Usa o Chromium do Playwright. Com `--verificar`, só confere e não grava. Não há script npm para ele.
3. Cenário, se for novo:
   - Fonte: `arte-fonte/cenarios/cenario-<sigla>-vN.png`.
   - Conversão: `node ferramentas/converter-cenarios.mjs`. A lista `FONTES` é fixa (linha 9). Para uma sigla nova, acrescente a entrada antes de rodar.
   - Saída: `public/assets/cenarios/cenario-<sigla>.webp` (1920x1080).

## Passo 6: dados (`src/data/lutadores/<id>.ts`)

O tipo é `LutadorDef` (`src/data/tipos.ts:212-265`).

**Obrigatórios:** `id`, `country`, `stage`, `stageName`, `name`, `title`, `pitch`, `desc`, `fire`, `accent`, `pow`, `spd`, `hp`, `jump`, `scale`, `stride`, `bars`, `mods`, `especiais`.

**Opcionais:** `corpo`, `reach`, `anim`, `poseDaFicha`, `extras`, `armadura`, `fichas`, `chefe`, `idPrototipo` (só para os 4 do protótipo).

Trecho real de AMINU (`src/data/lutadores/aminu.ts:10-30`, resumido):

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

**Especiais:** três golpes `sFire` (ESP), `sDown` (↓+ESP) e `sFwd` (→+ESP), do tipo `Golpe` (`src/data/tipos.ts:128-198`). Campos principais: `S`, `A`, `R` (preparação, ativo e recuperação em quadros), `dmg`, `kb`, `hs`, `bs`, `lvl` (`mid`, `low`, `over` ou `throw`), `rank: 9` nos especiais, `cost`, `bh` e `rm`. Exemplo: `sDown` do AMINU (`aminu.ts:46-52`).

**Tipos de movimento** (`src/data/tipos.ts:17`): `fire`, `rise`, `rush`, `leap`, `melee`, `carga`, `rebote`, `aparar`, `troca`. Os tipos novos, como `carga`, `rebote` e `troca`, têm a lógica em `src/fight/`. Ou seja, mecânica nova exige mudança no motor. Exemplos existentes:

- `carga` (MASHI do AMINU): `src/fight/fighter.ts:92`.
- `rebote` (RESORTE da CENTELLA): `src/fight/fighter.ts:101`.
- `parry` (PARADE da CAMILLE): `src/fight/game.ts:598`.
- `troca` (VADIVU da NILA): `src/fight/fighter.ts:627`.

**Fichas (variações de um lutador):** `fichas` aceita campos parciais que sobrescrevem a base (`FichaDef`, `src/data/tipos.ts:206-207`). A NILA usa `fichas.sarpa` (`src/data/lutadores/nila.ts:68-112`): pow 0.9, spd 1.15 e golpes próprios. A troca é o `VADIVU` (`nila.ts:16-24`).

**Poses por ficha:** `poseDaFicha` troca uma pose lógica por uma pose do atlas (`src/data/tipos.ts:255`). Exemplo real: `nila.ts:103-110` mapeia `idle0` para `sarpaIdle0`. Só vale se o quadro existir no atlas.

**Chefão (`ConfigChefe`, `src/data/tipos.ts:88-101`):** campo `chefe` no `LutadorDef`. Exemplo real: `src/data/lutadores/baatar.ts:102-109`:

```ts
chefe: {
  barras: 2,
  hpPorBarra: 75,        // PROVISÓRIO (baatar.ts:98-101)
  fichaFase1: 'chefe',
  fichaFase2: 'chefe2',  // a fase 2 troca o ABRAÇO pelo MERGULHO
  danca: { duracao: 90 },
  bonusVitoria: 5000,
},
```

- A luta de chefe liga com `ConfigPartida.chefe` (`src/fight/game.ts:43`). Sem a flag, o lutador com `chefe` joga normal.
- A IA do chefe está em `IA_CHEFE` (`src/fight/cpu.ts:23-28`).
- O chefão tem layout `chefe` (passo 3), `alturaRef` 525 e atlas de 4 páginas. O atlas tem 54 quadros.

**Cenário da casa:** o campo `stage` precisa existir em `CENARIOS` (passo 7). A luta acontece na casa do rival (`src/fight/game.ts:193`).

## Passo 7: registro

| Onde | O que | Referência |
|---|---|---|
| `src/core/contratos.ts:107` | `IDS_LUTADORES`: adicione o id na ordem da grade | id fora da lista é tratado como desconhecido no save |
| `src/data/lutadores/index.ts` | `import`, entrada em `ROSTER` (26-30), entrada em `LUTADORES` (41-51) e `export` (53) | |
| `src/meta/regras.ts` | id em **um** papel: `INICIAIS` (linha 5), `FILA_DESBLOQUEIO` (linha 11) ou `CHEFE` (linha 14) | Lutador sem papel nunca desbloqueia. Teste: `tests/unit/papeis-lutadores.test.ts:9` |
| `src/data/cenarios.ts` | entrada em `CENARIOS` com `casa: '<id>'` (24-34) | `CICLO_CENARIOS` (37) só lista os iniciais |

Não há lista de lutadores em `src/ui/` fora de `src/ui/dev-expansao.ts` (fixture de desenvolvimento). A seleção lê `ROSTER`. **A confirmar:** o plano (`docs/plano-expansao.md` §1.3) diz que nenhum arquivo de `fight/`, `render/` ou `ui/` muda, exceto para primitiva nova. Isso bate com a busca, mas não foi testado com um lutador real.

Exemplo real para o desbloqueio, de `src/meta/regras.ts`:

```ts
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila'];
export const CHEFE: IdLutador | null = 'baatar';
```

## Passo 8: assets e carga

**Por que a ordem importa:** no boot, o jogo lê o `atlas.json` de **todos** os ids de `IDS_LUTADORES` (`src/assets/elenco.ts:91`, `src/assets/carregador.ts:247-270`). Um arquivo que falte dá erro HTTP, e a falha interrompe o `Promise.all`. A partir daí `iniciarArte` rejeita e `main.ts:140-143` mostra o erro na tela. Resultado: o jogo inteiro não sobe.

Regra prática: registre o id em `IDS_LUTADORES` só depois de `public/assets/lutadores/<id>/atlas.json` existir. Um rascunho com o id registrado e os arquivos faltando derruba o jogo para todo mundo.

Depois do boot, a carga fica assim (`src/assets/elenco.ts:84-107`):

- Retratos: todos os lutadores, no boot (`elenco.ts:104`).
- Imagens: os 4 iniciais (`VITRINE`) e o cenário do título, fixos (`elenco.ts:93-94`).
- Demais atlas: sob demanda. No máximo 3 não fixos ficam na memória (`src/assets/gerenciador.ts:19`, `:48`). Sai o menos recente (`gerenciador.ts:178-180`).
- Atlas sem imagem ainda: o lutador some do desenho até a arte chegar (`elenco.ts:11-15`).

Verificado por leitura de código. **A confirmar:** o comportamento com `atlas.json` ausente não foi testado de ponta a ponta.

## Passo 9: testes e portões

Rode nesta ordem:

```bash
npm run typecheck
npm test
npm run build
```

A CI roda os três (`.github/workflows/ci.yml`). O deploy do Pages também roda (`.github/workflows/pages.yml`).

Testes que cobrem lutadores hoje:

- `tests/unit/papeis-lutadores.test.ts:9-30`: `INICIAIS + FILA + CHEFE = ROSTER`, sem repetição.
- `tests/unit/e5-elenco.test.ts:38-99`: 9 ids, fila, chefão e escada (5 rivais distintos e o chefão por último).
- `tests/unit/e5-elenco.test.ts:222` e `:347`: toda pose citada por um golpe resolve para um quadro real do atlas.
- `tests/unit/dados.test.ts:53-56`: a comparação com o protótipo só vale para os lutadores com `idPrototipo`. Lutador novo fica de fora (`if (!f) continue`).
- E2E: `tests/e2e/novos-lutadores.spec.ts`, `tests/e2e/expansao.spec.ts`, `tests/e2e/arte-sob-demanda.spec.ts`.

**Portão genérico que o plano pede não existe.** O `docs/plano-expansao.md` §1.3 fala em um teste que itera `ROSTER` e confere: 13 poses mínimas, `ponta` em todo quadro ativo, faixas de stats, `cost` até 100 e `rank` 9. Esse teste não existe. O que existe é o parcial listado acima. **A confirmar:** a Íris deve decidir se cria o teste.

## Checklist de entrega

- [ ] Mestra e folha 1 aprovadas pelo dono. Folhas em `arte-fonte/lutadores/<id>/folhas/`.
- [ ] `npm run sprites -- <id>` roda e o `relatorio.json` não traz avisos (quando a ferramenta voltar).
- [ ] `atlas.json` (versão 2), `retrato.png` e `retrato.json` em `public/assets/lutadores/<id>/`.
- [ ] Cenário em `public/assets/cenarios/cenario-<sigla>.webp` e entrada em `CENARIOS`.
- [ ] `src/data/lutadores/<id>.ts` criado; `index.ts` com `ROSTER` e `LUTADORES`.
- [ ] Id em `IDS_LUTADORES` e em um papel de `regras.ts`.
- [ ] `typecheck`, `test` e `build` verdes.
- [ ] `CHANGELOG.md` e `PROGRESSO.md` atualizados.
