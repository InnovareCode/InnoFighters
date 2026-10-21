# Chefões progressivos, entradas próprias, tema musical por lutador e chefão mais duro

> Spec da Nova, 2026-10-21. **Proposta: nada aqui está implementado.** HEAD `ac57a80`. No disco, sem commit, estão a provocação P2
> da Lyra (`fight.ts`, render, options) e os sons S0-S3 da Vega (`src/audio`). Esta spec é só documento e não toca em nenhum dos dois.
> Specs irmãs: `docs/spec-chefao-zenon.md` (a técnica da entrada e da fase 2), `docs/spec-sons-por-lutador.md` (as primitivas de
> áudio e a régua sem ouvir), `docs/spec-provocacao-prerround-e-vitoria.md` (o 3º controlador fora do motor).

O pedido do dono tem quatro partes, e cada uma tem uma seção aqui:

- **A. Progressão** (§1): o chefão do ARCADE passa a ser o próximo lutador bloqueado da fila. O ZENON só é o chefão com os 9 liberados.
- **B. Entradas próprias** (§2): cada um dos 5 guardiões ganha entrada dramática, enredo e um fim de luta.
- **C. Tema musical por lutador** (§3): 10 músicas. O ZENON fica com a valsa que já tem.
- **D. Chefão mais duro** (§4): em toda luta de chefão, o chefão leva menos dano. O harness mede os 6.

Depois vêm o plano por agente (§5), os riscos (§6), os critérios de aceite (§7) e as decisões que ficam com o dono (§8).

---

## 0. Contexto, hipóteses e travas

### 0.1 Hipóteses declaradas

- **Escala:** jogo de navegador, uma luta por aba, celular incluído. O teto de CPU é o de um celular médio.
- **Maturidade:** produto em expansão, com 10 lutadores no ar e o ZENON jogável. Já existem saves reais no `localStorage`
  (`inno-fighters-v2`), feitos com a regra antiga. Por isso **nenhuma mudança pode revogar progresso**.
- **Equipe e prazo:** squad completa, sem data declarada. As fatias são pequenas e cada uma tem chave de rollback.
- **Arte:** tudo precisa funcionar com as poses que já existem nos atlas. Pose nova é melhoria, não pré-requisito, o mesmo
  princípio da D-P4 da provocação.

### 0.2 O que existe hoje (lido no código)

| Peça | Onde | Hoje | Implicação |
|---|---|---|---|
| Fila e chefão | `src/meta/regras.ts:12,18` | `FILA_DESBLOQUEIO = [aminu, centella, camille, nila, baatar]`, `CHEFE = 'zenon'` | `Regras.chefe` é o chefão de **toda** zerada |
| Escada | `src/meta/escada.ts:25-43` | rivais = `roster − {c1, chefe}`, embaralhados com `rngUI`, mais o chefão no fim | só existe um chefão possível |
| Vitória | `src/meta/progresso.ts:54-88` | toda zerada libera `proximoDaFila` e, se o chefão caiu, libera ele também | um save antigo pode ter o ZENON liberado com 1 zerada e a fila quase vazia |
| Saneamento | `progresso.ts:127-178` | `chefesDerrotados: string[]`, teto `MAX_CHEFES_DERROTADOS = 8`; `CHEFOES_SO_POR_DERROTA = ['zenon']` | 6 chefões cabem no teto atual |
| Bloco de chefe | `src/data/tipos.ts:99-112` | `ConfigChefe { barras: 2; hpPorBarra; fichaFase1; fichaFase2; cena; bonusVitoria; trilha? }`, **todos obrigatórios** (menos `trilha`) | só o ZENON tem o bloco; os 5 da fila não têm |
| Aplicação | `src/fight/game.ts:220-221`, `fighter.ts:268-281` | `cfg.chefe` + `def.chefe` → `virarChefe`: `maxHp = hpPorBarra`, a ficha vira `fichaFase1` | **a NILA quebraria**: ver 0.3 |
| Dano | `game.ts:283` (arremesso), `:725` (raspão), `:781-783` (armadura), `:803-807` (golpe) | quatro pontos onde a vida do defensor cai | o fator de dano do chefão tem de entrar nos quatro |
| Luta de chefe | `game.ts:225` | `winsNeeded = 1` (1 round), 2 barras | o tempo de 99 s (`contratos.ts:83`) pode virar gargalo (R3) |
| Desempate por tempo | `game.ts:941-942` | compara `vidaTotal` **absoluta** | vida maior para o chefão desequilibra o desempate (§4.1) |
| Entrada | `src/render/entrada-chefe.ts` | linha do tempo pura (270/60 ticks, pular a partir do tick 10, saída em até 6), **amarrada à arena `gr`** (braseiros) e às poses `entrada0..2` | precisa de generalização (§2.3) |
| Apresentação | `src/render/apresentacao-lutadores.ts:36-62` | `APRESENTACAO` (chave = id): `entrada`, `vitoria`, `provoca`, `falas`, `aviso`, `entradaDramatica`; só o ZENON tem `aviso` e `entradaDramatica` | o aviso, as falas e a vitória já são por lutador: os guardiões só entram como dados |
| Aura da fase 2 | `src/render/aura-chefe.ts:25-30` | a fase 2 vale `1` só se `f.ficha === cfg.fichaFase2` | sem ficha de fase 2, a aura nunca acende. A NILA troca de ficha sozinha |
| Música | `src/audio/audio-sys.ts:56-65, 403-502` | `TrilhaMusica = 'fight' \| 'menu' \| 'chefe'`; `playStep`, `playMenu` e `playChefe` com padrões fixos; `musicaDaFase(2)` só vira no início do compasso | `fight`/`menu` estão congeladas na fixture `tests/fixtures/audio-sys-antes-do-chefe.ts` |
| Música na luta | `src/ui/cenas/fight.ts:268` | `startMusic(cfg.chefe ? def.chefe.trilha ?? 'fight' : 'fight')` | é o único ponto de ligação |
| Harness | `ferramentas/balanco/simulacao.ts:107-131` | as lutas de chefe são **todo desafiante contra `CHEFE`** | precisa medir 6 chefões, cada um com os desafiantes realistas |
| Balanço atual | `docs/balanco/resultados.md:60-85` | ZENON: jogador vence 31,9% (NORMAL) e 23,0% (DIFÍCIL), 100% por KO, 38 a 71 s | meta atual no README: 30-40% NORMAL. **Muda** (§4.3) |

### 0.3 Dois achados que mudam o desenho

1. **A resistência do chefão não pode morar numa ficha.** O ZENON resolve o modo chefão com as fichas `chefe`/`chefe2`. Se a NILA
   recebesse uma ficha `chefe`, o VADIVU (`mv.troca.ficha`, `fighter.ts:763`) a trocaria por `sarpa`, e a volta (`vadivu(null)`)
   iria para a base, não para `chefe`. O reforço do chefão sumiria na primeira troca de postura. Por isso o fator de dano fica em
   `ConfigChefe`, que pertence ao **Fighter durante a luta**, não à ficha. E as fichas de fase passam a ser **opcionais** (§4.2).
2. **A progressão nova não precisa migrar nenhum save.** Como o progresso guarda a lista explícita `desbloqueados`
   (decisão de 2026-10-20), o chefão da vez se **deriva** dela: é o primeiro da fila que ainda não está liberado. Todo save antigo
   já diz quem é o próximo chefão. Detalhes em §1.4.

### 0.4 Travas que esta spec respeita

1. **Lock-step dos 4 originais** (`tests/unit/luta-fidelidade.test.ts`) e snapshot do motor: verdes **sem `-u`**. Tudo o que é de
   chefe entra atrás de `d.cfgChefe` (nulo fora de luta de chefe) e nenhum original tem bloco `chefe`.
2. **Oráculo de áudio** (`audio.test.ts`, `audio-chefe.test.ts`, fixture `audio-sys-antes-do-chefe.ts`): `init()`, `playStep`,
   `playMenu` e `playChefe` não mudam. O tema novo entra em método novo, com um ramo novo no `scheduler`.
3. **`sonsDoEvento` não muda** (spec de sons, 0.2). `musicaDaFase` já sai dele no evento `fase-chefe` `cena` (`eventos.ts:70`),
   e isso basta para a fase 2 de qualquer tema.
4. **O lutador jogável não muda.** O bloco `chefe` só vale com `ConfigPartida.chefe`. A parte regular do harness (os 90 pares)
   tem de dar **o mesmo hash** antes e depois (§7).

---

## 1. Parte A: progressão

### 1.1 A regra

> **O chefão do ARCADE é o primeiro lutador da `FILA_DESBLOQUEIO` que ainda está bloqueado. Derrotá-lo o libera. Com a fila
> esgotada (os 9 liberados), o chefão é o ZENON. Derrotar o ZENON o libera, e ele continua sendo o chefão das zeradas seguintes.**

No texto do jogo, os 5 da fila viram os **guardiões** e o ZENON continua sendo **o Anfitrião** (nome proposto, D-A1).

| Estado do save | Chefão do próximo ARCADE | O que a vitória libera |
|---|---|---|
| nada liberado além dos 4 iniciais | AMINU | AMINU |
| AMINU | CENTELLA | CENTELLA |
| AMINU, CENTELLA | CAMILLE | CAMILLE |
| ... + CAMILLE | NILA | NILA |
| ... + NILA | BAATAR | BAATAR |
| os 5 da fila, ZENON bloqueado | **ZENON** (1ª vez: "O ANFITRIÃO ESTÁ À SUA ESPERA") | ZENON (casa de honra) |
| os 9 + ZENON | ZENON (revanche, D-A3) | nada (só conta a zerada) |

**Ritmo:** continua **um lutador por zerada**. A única mudança é que o ZENON deixa de sair na 1ª zerada e passa a sair na 6ª, no
mínimo. É exatamente o pedido do dono, mas vale ele saber disso.

### 1.2 Opções de modelagem (3)

| | A1. Derivar do progresso (função pura) | A2. Campo novo `chefeAtual` no save | A3. Índice por `zeradas` (`fila[zeradas]`) |
|---|---|---|---|
| Como | `chefeDoArcade(c1, prog, regras)` = primeiro bloqueado da fila; senão o final | o save grava quem é o próximo chefão | o chefão é a posição `zeradas` da fila |
| Migração | **nenhuma** | todo save antigo precisa ganhar o campo | quebra quem tem fila fora de ordem ou zeradas sem desbloqueio |
| Rollback | o build antigo lê o mesmo save sem perder nada | o build antigo ignora o campo, e os dois podem divergir | igual à A1, mas errado |
| Reordenar a fila | ninguém perde nada (`proximoDaFila` já faz isso) | o campo fica velho | revoga |
| Fonte da verdade | uma só (`desbloqueados`) | duas | uma, a errada |

**Recomendação: A1.** É a mesma escolha que já protegeu a fila: uma lista explícita e tudo o mais derivado dela. A2 cria um
segundo estado que pode discordar do primeiro. A3 repete o erro que a lista explícita existe para evitar.

### 1.3 Contrato em `src/meta` (Cronos)

```ts
// src/meta/tipos.ts — Regras ganha UM campo
readonly chefesDaFila: boolean; // true = regra desta spec; false = a de hoje (rollback, ?expansao=4 e testes antigos)

// src/meta/regras.ts — CHEFE continua 'zenon' e passa a significar o chefão FINAL (o Anfitrião). REGRAS_PADRAO.chefesDaFila = true.

// src/meta/chefes.ts (NOVO, puro, sem DOM, sem storage)
/** O chefão do ARCADE de quem joga com `c1`, ou null (não há luta de chefe). */
export function chefeDoArcade(c1: IdLutador, prog: Progresso, regras?: Regras): IdLutador | null;
/** O chefão é um guardião (da fila) ou o final? Derivado do id: `id === regras.chefe` é o final. */
export function ehChefeFinal(id: IdLutador, regras?: Regras): boolean;
/**
 * Para o harness e os testes: cada chefão possível e quem pode enfrentá-lo DE VERDADE (o elenco liberado naquele ponto da progressão).
 * fila[k] -> iniciais ∪ fila[0..k-1]; o final -> roster − {final}.
 */
export function desafiantesDoChefe(regras?: Regras): readonly { chefe: IdLutador; desafiantes: readonly IdLutador[] }[];

// src/meta/escada.ts — montarEscada usa chefeDoArcade; rivais = roster − {c1, regras.chefe, chefeDaVez}
// (o Anfitrião nunca é rival comum, como hoje). `Etapa` NÃO muda: { id, chefe: boolean }.

// src/meta/progresso.ts — a vitória passa a dizer QUEM caiu, não só "um chefão caiu"
export function aplicarVitoriaArcade(prog: Progresso, vitoria: { chefe: IdLutador | null }, regras?: Regras): ResultadoVitoria;
```

Regras de `chefeDoArcade`, nesta ordem:

1. `regras.chefesDaFila === false` → o comportamento de hoje: `regras.chefe`, ou null se `c1 === regras.chefe`.
2. O primeiro `id` de `regras.fila` com `!liberados(prog).has(id) && id !== c1`, se existir.
3. Senão `regras.chefe`, se `regras.chefe !== null && c1 !== regras.chefe`.
4. Senão null: jogando com o ZENON, com a fila esgotada, **não há luta de chefe** (ED7 continua; D-A2).

Regras de `aplicarVitoriaArcade` com `chefesDaFila`:

- `zeradas + 1` sempre.
- Se `vitoria.chefe` não é null e não está liberado: entra em `desbloqueados` e em `novos`.
- Se `vitoria.chefe` não é null: entra em `chefesDerrotados`, sem repetir. `chefeDerrotado` continua derivado.
- **Nada mais é liberado.** A zerada não avança a fila por conta própria, porque quem avança a fila agora é o chefão derrotado.
- O id do chefão vem da **etapa da campanha** (`run.etapas.find(e => e.chefe)?.id`), gravada no começo do ARCADE. Não é
  recalculado no fim. Assim, outra aba que liberou alguém no meio da campanha não muda quem foi derrotado.
- `chefesDaFila === false`: a função de hoje, sem mudança (`derrotouChefe = vitoria.chefe !== null`).

### 1.4 Progresso e storage (Cronos): nenhuma migração

**O formato v2 não muda: nenhum campo novo e nenhuma versão nova.** Motivos:

- O chefão da vez é derivado de `desbloqueados` (A1), que todo save já tem.
- `chefesDerrotados` (Z6) já é `string[]` e aceita qualquer id com forma de id. Os 6 chefões cabem no teto de 8. A proposta é
  subir o teto para 16, sem custo, para dar folga à próxima onda.
- `CHEFOES_SO_POR_DERROTA` continua `['zenon']`. Os guardiões **não entram** nessa lista, porque saves antigos têm guardiões
  liberados pela regra velha da zerada, sem nunca terem sido enfrentados como chefão. Ter o id liberado não prova a derrota.

Matriz de saves (vira teste do Cronos, com `chefeDoArcade` e uma vitória aplicada):

| # | Save (`desbloqueados`; extras) | `c1` | Chefão | Depois da vitória |
|---|---|---|---|---|
| S1 | `[]` | hayato | AMINU | `[aminu]`, `chefesDerrotados ⊇ [aminu]` |
| S2 | `[aminu, centella, camille]` | aminu | NILA | `+nila` |
| S3 | `[aminu..baatar]` (5), ZENON bloqueado | qualquer | ZENON | `+zenon`, `novos = [zenon]` |
| S4 | **regra velha**: `[aminu, zenon]`, `chefesDerrotados: [zenon]` | caio | CENTELLA | `+centella`; o ZENON continua jogável |
| S5 | igual a S4 | **zenon** | CENTELLA | `+centella` (jogar com o ZENON não impede o guardião) |
| S6 | os 9 + `zenon` | hayato | ZENON (revanche) | `novos = []`, `zeradas + 1` |
| S7 | os 9 + `zenon` | zenon | null (sem chefão) | `novos = []`, `zeradas + 1` |
| S8 | fora de ordem: `[camille]` | min-ji | AMINU | `+aminu`; o próximo é CENTELLA (pula CAMILLE) |
| S9 | legado: `chefeDerrotado: true`, `[aminu, baatar]` | hayato | CENTELLA | `chefesDerrotados = [baatar, centella]` |
| S10 | `desconhecidos: ['ravi']` (onda futura) | hayato | conforme `desbloqueados` | `desconhecidos` preservado |
| S11 | editado à mão: `desbloqueados: ['zenon']` | hayato | AMINU | o saneamento já recompõe `chefesDerrotados = [zenon]` |

Os subconjuntos possíveis são poucos: 2⁵ subconjuntos da fila × ZENON liberado ou não × os `c1` liberados. O teste deve ser
**exaustivo**, não por amostra:

- o chefão está sempre bloqueado (ou é o ZENON) e nunca é o `c1`;
- partindo do save vazio e vencendo sempre, tudo fica liberado em **exatamente 6 zeradas**;
- nada que estava em `desbloqueados` jamais sai.

**Rollback:** um save gravado pelo build novo, lido pelo saneamento do HEAD `ac57a80` (cópia em fixture, o padrão do
`handoff-cronos-rollback`), mantém `desbloqueados`, `zeradas` e `chefesDerrotados`. O build antigo voltaria a pôr o ZENON como
chefão de toda zerada, sem perder nada.

### 1.5 Casos de borda

| Caso | Comportamento |
|---|---|
| Jogador escolhido = candidato | Pela UI, não acontece: o candidato está bloqueado e `podeEscolher` recusa casa bloqueada em todo modo. Defesa em profundidade: `chefeDoArcade` pula o `c1` e vai ao próximo bloqueado (regra 2) |
| Save parcial ou fora de ordem | o chefão é o 1º bloqueado na ordem da fila (S8) |
| Ordem fixa | `FILA_DESBLOQUEIO` é a ordem dos guardiões. Mudar a fila numa versão futura não revoga nada; quem já foi liberado é pulado |
| Lutador novo na fila depois do ZENON | ele vira o próximo guardião, mesmo para quem já tem o ZENON. "O ZENON só com todos liberados" continua valendo |
| Continue contra o guardião | o mesmo chefão. A entrada fica CURTA (`run.entradaDoChefeVista`, já existe) |
| Desistir no meio do ARCADE | nada muda no save |
| Duas abas | a etapa grava o id do chefão. No fim, liberar quem já está liberado não gera `novos` (sem cartão repetido) |
| `?expansao=4` / `regras.chefe === null` | `chefesDaFila: false`. A regra antiga continua lá (`src/ui/dev-expansao.ts` precisa setar o campo) |
| Guardiões futuros como rival comum | com `travadosNaEscada` (ED5), CENTELLA pode aparecer como rival comum enquanto o chefão é o AMINU. Isso é coerente com a vitrine, mas antecipa um guardião (D-A4) |
| CPU×CPU, Treino, Versus, LUTA vs CPU | não existe luta de chefe fora do ARCADE (sem mudança) |

### 1.6 O que muda na UI (Lyra)

| Tela | Arquivo | Mudança |
|---|---|---|
| Seleção | `src/ui/cenas/select.ts:328-334` | textos da casa fechada. O **próximo** guardião: "Guarda o fim do seu próximo ARCADE. Derrote-o para liberar." Os outros: "Guarda um selo do torneio. Ainda não é a vez dele." (textos finais do Apolo). O ZENON continua `chefe-oculto` / "O ANFITRIÃO" (`select.ts:514-516`). A fila continua secreta: o próximo aparece como "?", os outros como "???" |
| Aviso antes do chefão | `src/ui/cenas/chefe.ts:72-76` | já lê `APRESENTACAO[c2].aviso`. Os 5 ganham `aviso`. O rodapé fixo da linha 76 ("A última luta do torneio...") vira dado (`avisoRodape`), porque **não** é a última luta para um guardião |
| VS | `src/ui/cenas/vs.ts:80-84, 116` | "ARCADE — O CHEFÃO" vira "ARCADE — O GUARDIÃO" ou "ARCADE — O ANFITRIÃO" (`ehChefeFinal`). **Achado, a confirmar no navegador:** `vs.ts:125` mostra "Vença N rounds" também na luta de chefe, que tem 1 round só |
| HUD | `src/render/hud.ts:109` | já mostra "CHEFÃO · <título>" para qualquer chefão. Títulos com mais de 16 letras caem em "CHEFÃO" (CAMILLE, BAATAR e CENTELLA passam de 16; D-A5) |
| Fim da luta | `apresentacao-lutadores.ts:falaDoChefe` | genérico, já fala na fase 2, na vitória e na derrota por KO. Só ganha dados |
| Final do ARCADE | `src/ui/cenas/fim.ts:211` | `aplicarVitoriaArcade(persist.prog, { chefe: idDoChefeDaCampanha }, regras)` |
| Desbloqueio | `src/ui/cenas/desbloqueio.ts:51-62` | guardião: título "<NOME> SE JUNTA A VOCÊ!" mais o **epílogo** (§2.4) no lugar da `desc`. ZENON: o "O CHEFÃO FOI LIBERADO!" de hoje vira "O ANFITRIÃO SE RENDE" (texto do Apolo) |
| Menu / Como jogar | `src/ui/escada-texto.ts` | "depois o chefão" continua certo. `rivaisDaEscada` passa a descontar 2 (o final e o guardião): com 10 lutadores ficam 7 candidatos, e a escada continua com 5 |

### 1.7 O cenário do chefão

- A luta já acontece na casa do rival (`game.ts:217`, `stage = cfg.stage ?? c2.stage`). Cada guardião luta no **próprio
  cenário**: AMINU em `ng`, CENTELLA em `mx`, CAMILLE em `fr`, NILA em `in`, BAATAR em `mn`. O ZENON continua em `gr`.
- **Sem imagem nova.** A fase 2 do guardião ganha um **véu de chefão** genérico e procedural: escurece 25% e tinge com o `accent` do
  guardião, em no máximo 2 primitivas, puro do tick. É o mesmo princípio do `arena-gr.ts`, sem âncora na arte (assim não depende de
  medir onde fica cada elemento da imagem). Uma sobreposição sob medida por cenário, como os braseiros da `gr`, fica como melhoria
  opcional e exige medir a arte primeiro (D-B3).

---

## 2. Parte B: entradas próprias e enredo

### 2.1 Enredo-base (premissa; o texto final é do Apolo)

**O Torneio do Arconte.** O ZENON, o Anfitrião, é dono do torneio. Para chegar à casa dele, o desafiante precisa vencer os **cinco
guardiões**. Cada um carrega um dos **Cinco Selos** (o mesmo selo do especial dele, o SELO DO ARCONTE). Derrotado, o guardião
entrega o selo e passa a lutar ao lado do jogador (o desbloqueio). Com os cinco selos, a casa do Anfitrião se abre.

| Guardião | Selo (tema) | Por que guarda o torneio (premissa) | Convite no fim |
|---|---|---|---|
| AMINU, A Lança de Kano | 1º, **a paciência** | a bolsa do torneio sustenta as tinturarias de Kano. Ele aceitou barrar os impacientes | "Quem esperou até aqui merece o selo." |
| CENTELLA, A Faísca da Arena | 2º, **o público** | o Anfitrião deu a ela a maior arena do mundo. Ela só deixa passar quem dá espetáculo | "A arena gostou de você. Eu também." |
| CAMILLE, A Riposte de Marselha | 3º, **o tempo certo** | foi rival de esgrima do ZENON quando jovens e desconfia dele. Guarda para julgar quem merece chegar até ele | "Vá. E não ataque no tempo dele." |
| NILA, A Lua de Kerala | 4º, **as duas faces** | estuda o selo que drena energia. Ensina os desafiantes a mudar antes que ele cobre | "Ele cobra. Eu ensinei. Agora vá." |
| BAATAR, O Avarga das Estepes | 5º, **o antigo campeão** | era o campeão invicto antes de o ZENON comprar o torneio (e foi, de fato, o chefão do jogo). Guarda o último portão como preço de uma revanche | "Faça o que eu não consegui." |

Regras para o Apolo: nada religioso (decisão do E8: sem "om", sem sino de templo, e no kalari sem a saudação à divindade), nada de
estereótipo, palavra estrangeira marcada **(rev.)** para revisão nativa, como na spec de sons.

### 2.2 Entrada de cada guardião, só com poses que já existem

Mesma técnica e mesmos números da entrada do ZENON (`entrada-chefe.ts`). A cena da luta não chama `game.update` enquanto ela roda.
COMPLETA = 270 ticks (4,5 s), CURTA = 60, pular a partir do tick 10, saída em até 6 ticks, cartão em 144, fala em 150. Ela é
COMPLETA na 1ª luta do ARCADE contra aquele chefão e CURTA depois de um continue, com a preferência curta ou com movimento reduzido.
Esqueleto comum: **batida 1** (0-96) → **batida 2** (96-144) → **batida 3** com cartão e fala (144-270).

Atlas lidos em `public/assets/lutadores/*/atlas.json`: os 5 têm o conjunto base (`idle0-3`, `walk0-7`, `crouch`, `block`, `jsquat`,
`jup`, `jtop`, `jfall`, `land`, `sa0-3`, `sb0-3`, `sc0-1`, `win`...). A NILA tem também `sarpaIdle0-3`, `sarpaWalk*` e
`sarpaLeap*`. O BAATAR tem `devekh0-2` e `dive0-1`.

| Guardião | Batida 1 | Batida 2 | Batida 3 (cartão) | Câmera (zoom de render, como `pv.zoom` da provocação) | Efeito procedural | Som da entrada (receita) |
|---|---|---|---|---|---|---|
| AMINU | `block` (a palma-escudo, de guarda) | `sa0 → sa1` (carrega o MASHI) | `sa2` segura o punho | 1,00 → 1,12 no punho → 1,00 | **vapor**: 3 faixas índigo e ocre subindo das cubas de tinta | rufo de kalangu (tom que **cai**: f0 → f0 × 2^(−7/12), como a voz dele) |
| CENTELLA | `jtop` (no ar, vindo da corda) | `land` | `win` (braços para o público) | começa em 1,15, alto, e desce para 1,00 no pouso | **holofotes**: 2 cones que cruzam e travam nela, mais 12 confetes | rugido da plateia (ruído passa-banda subindo) e sino de ringue |
| CAMILLE | `walk0-3` (entra andando pelo cais, calma) | `block` ("en garde") | `hk1` congelado, o chute alto apresentado e recolhido | 1,00 fixo (contida) | **neblina**: 2 camadas horizontais e um feixe de farol | buzina de navio (dente-de-serra a 70 Hz, longa) |
| NILA | `idle0` (GAJA, elefante) | `crouch → sarpaIdle0` (vira serpente) | `idle0` (volta a GAJA): **mostra as duas formas** | 1,00 → 1,08 → 1,00 | **luar**: cone de luz de cima e 6 lamparinas acendendo, como os braseiros | rufo de chenda |
| BAATAR | `devekh0` | `devekh1` | `devekh2` (a Dança da Águia inteira, sem lacuna) | 0,95 (plano aberto) → 1,00 | **vento**: 10 traços de poeira atravessando | vento (ruído passa-baixa) e o canto de garganta (`vozFormante` da spec de sons, com o formante extra a 1400 Hz) |

Fase 2 (a `cena` do motor, §4.2), também com poses existentes: AMINU `sa1 → sa3`, CENTELLA `win`, CAMILLE `block`, NILA `crouch`
(não usa `sarpa*`, porque a postura dela continua a que estava) e BAATAR `devekh2 → win`.

### 2.3 Contrato da entrada generalizada (Lyra)

```ts
// src/render/apresentacao-lutadores.ts — `entradaDramatica` deixa de ser só o cartão
export type EfeitoDeEntrada = 'braseiros-gr' | 'vapor' | 'holofotes' | 'neblina' | 'luar' | 'vento';
export type BatidaDeEntrada = { readonly em: number; readonly pose: string; readonly zoom?: number };
export type RoteiroDeEntrada = {
  readonly cartao: CartaoDeEntrada;            // { nome, titulo, rodape }, como hoje
  readonly batidas: readonly BatidaDeEntrada[]; // COMPLETA; a CURTA usa só a última (como o ZENON em `entrada2`)
  readonly efeito: EfeitoDeEntrada;
  readonly som?: readonly ChamadaReceita[];     // a assinatura sonora da entrada (além de faixas e cartão, que são comuns)
};
// Apresentacao += avisoRodape?: string; epilogo?: { quem: string; porque: string; convite: string }
```

- `linhaDaEntrada` mantém as constantes e a assinatura. `QuadroDaEntrada.pose` continua sendo um **índice**, agora o índice da
  batida. Para o ZENON, as batidas `[0: entrada0, 96: entrada1, 144: entrada2]` dão exatamente o 0/1/2 de hoje. Assim
  `tests/unit/z3-entrada-chefe.test.ts` fica verde **sem `-u`**, e esse é o critério de que a generalização não mexeu no ZENON.
- `acesos` (braseiros) passa a ser o `progresso` do efeito, de 0 a 1. A arena `gr` continua lendo o seu número.
- Efeitos em `src/render/efeitos-de-entrada.ts`: **no máximo 14 primitivas por quadro**, sem `shadowBlur`, `filter` ou
  `getImageData`, puros do tick, **sem consumir o `rngVisual`** (sorteio por hash do índice, como os raios da `gr`).
- `rampaDaFase2` (`aura-chefe.ts:27-30`): a fase 2 vale `1` quando `f.barras < f.barrasMax` fora da `cena-chefe`, não mais
  quando "a ficha é a `fichaFase2`". Sem essa troca, os guardiões sem ficha (e a NILA, que troca de ficha sozinha) ficariam sem aura.
- A provocação pré-round já fica desligada no chefão (`render/provocacao.ts:97`). Vale para os guardiões sem mudança.

### 2.4 Fim de luta que fecha o enredo

São dois momentos e **nenhuma cena nova**:

1. **Na luta:** a `falas.derrota` do guardião em legenda, no KO final (o `falaDoChefe` de hoje). É "quem ele é" em uma frase.
2. **No cartão de desbloqueio** (`desbloqueio.ts`): o epílogo em 3 linhas, `quem` / `porque` / `convite`, no lugar da `desc`, com
   o título "<NOME> SE JUNTA A VOCÊ!". O desbloqueio já vem logo depois do final do ARCADE, então o enredo fecha onde o prêmio aparece.

### 2.5 Textos que o Apolo escreve (`docs/textos-chefoes.md`)

Por guardião (5) e para o ZENON (só o que muda):

| Campo | Limite | Onde aparece |
|---|---|---|
| `aviso` [linha1, linha2] | ≤ 17 caracteres cada (o "ESTÁ À SUA ESPERA" de hoje, a 58 px) | `chefe.ts` |
| `avisoRodape` | ≤ 56 | `chefe.ts:76` |
| `cartao.nome` / `titulo` / `rodape` | ≤ 14 / ≤ 18 / ≤ 20 (o rodapé é espaçado letra a letra) | entrada |
| `falas.entrada` | ≤ 96, 2 frases separadas por ". ", **a 1ª com ≤ 46** (a CURTA mostra só a 1ª) | entrada |
| `falas.fase2` | ≤ 28 | cena da fase 2 |
| `falas.vitoria` / `falas.derrota` | ≤ 60 / ≤ 72 | fim da luta |
| `epilogo.quem` / `porque` / `convite` | ≤ 56 cada | desbloqueio |
| linha da seleção (próximo / outros) | ≤ 48 | `select.ts` |
| ZENON: `aviso` de revanche (D-A3) | ≤ 17 cada | `chefe.ts` |

Os limites vêm dos textos que já estão no ar. **A Lyra mede no navegador** (skill `medir-antes-de-afirmar`) antes de dar como
pronto. Os limites são de partida, não de prova.

### 2.6 Lacunas de arte (opcionais: tudo funciona sem elas)

| Guardião | Pose nova ideal | Substitui | Prioridade |
|---|---|---|---|
| AMINU | `entrada0` enrolando a faixa no punho (o "kaho" do dambe **(rev.)**), `entrada1` batendo o punho no peito | `block`, `sa0` | alta (a entrada dele é a mais "emprestada") |
| CENTELLA | `entrada0` em pé no esticador, `entrada1` apontando para a plateia | `jtop`, `win` | média |
| CAMILLE | `entrada0` saudação de esgrima (salut), `entrada1` ajustando a luva | `block`, `hk1` | média |
| NILA | nenhuma obrigatória. A troca GAJA → SARPA → GAJA já conta a história | — | baixa |
| BAATAR | nenhuma (`devekh0-2`) | — | nenhuma |

Estimativa, não medida: 1 folha por guardião (3 a 4 poses), 3 a 4 folhas, cerca de 18 a 24 créditos do Runway a 6 por folha 2K.
A arte entra **sem código**: basta trocar o nome da pose na batida, o mesmo princípio da D-P4.

---

## 3. Parte C: tema musical por lutador

### 3.1 Opções de arquitetura (3)

| | C1. Um `playX` escrito à mão por lutador (como `playChefe`) | C2. **Tema como dado + um sequenciador puro + um método novo `playTema`** | C3. Áudio pré-gravado (ogg) |
|---|---|---|---|
| Fixture e oráculo | intactos | intactos (método novo e um ramo novo no `scheduler`) | intactos |
| Testável sem navegador | pouco (o código é o som) | **sim**: `partituraDoPasso(tema, passo, laço, fase)` é pura e devolve chamadas | não |
| Medir a distância entre temas | só renderizando | **direto dos dados** (melodia, ritmo) mais a régua de timbre | só espectral |
| Determinismo | sim | sim (função do passo e do laço) | sim |
| D8 (100% sintetizado) | sim | sim | **viola** |
| Custo de 9 temas | ~9 × 40 linhas de código | 1 sequenciador (~150 linhas) + 9 tabelas | arquivos e peso de download |

**Recomendação: C2.** É o padrão do resto do jogo: dado declarativo, função pura e validação no boot. Mantém o oráculo verde por
construção e deixa a prova de distinção trabalhar sobre a partitura, não sobre o código.

### 3.2 Módulos

```
src/data/musica/                     DADOS puros (sem import de audio/)
  tipos.ts                           TemaDef, Instrumento, Pista, Padrao
  temas.ts                           TEMAS: Readonly<Record<IdLutador, TemaDef | 'chefe'>>  (zenon: 'chefe' = a valsa de hoje)
  validar.ts                         exigirTemasValidos() no carregamento (como as falas e os sons)
src/audio/
  temas.ts            (novo)         partituraDoPasso(tema, passo, laco, fase): readonly ChamadaMusical[]   (puro)
                                     trilhaDaLuta(cfg, regras, chave): TrilhaMusica                          (puro)
                                     TEMAS_POR_LUTADOR (a chave de rollback, false até a escuta do dono)
  audio-sys.ts        (+)            TrilhaMusica += `tema:${IdLutador}`; scheduler ganha 1 ramo; playTema() novo.
                                     playStep/playMenu/playChefe/init NÃO mudam.
  receitas.ts         (+)            OpcoesReceita += { destino?: 'sfx' | 'musica'; inicio?: number } (aditivo; o padrão é o de hoje)
```

- `ChamadaMusical = ChamadaReceita & { passoRel?: number }`. **Reusa a forma** `T` / `R` e o `V` (`vozFormante`) da spec de sons
  (fatia S1), e o mesmo tocador `tocarReceita`, agora com `destino: 'musica'` (barramento `music`) e `inicio` absoluto. **Primitiva
  nova de síntese: nenhuma.** O `vozFormante` serve aos drones vocais (o canto de garganta do BAATAR), limitado a 1 por compasso.
- `TrilhaMusica` vira `'fight' | 'menu' | 'chefe' | \`tema:${IdLutador}\``. Como `startMusic` compara strings, chamar o mesmo tema
  num continue **não reinicia** a música, que é o comportamento de hoje.
- A tabela é compilada uma vez no carregamento (`TemaDef` → partitura por passo). O custo por passo no `scheduler` é só o de
  tocar as chamadas.

### 3.3 Quando cada tema toca

`trilhaDaLuta(cfg, regras, chave)`, pura:

| Situação | Trilha |
|---|---|
| `TEMAS_POR_LUTADOR = false` ou `regras.temasMusicais = false` (`?expansao=4`) | a de hoje: `'chefe'` no chefão que tem `trilha`; senão `'fight'` |
| ARCADE, rival comum | `tema:<c2>` |
| ARCADE, chefão (guardião ou ZENON) | `tema:<c2>`, com a fase 2 na troca de barra (§3.6). O ZENON continua `'chefe'` |
| LUTA vs CPU | `tema:<c2>` |
| VERSUS | `tema:<c2>` (é a casa do P2: o cenário padrão é o dele, `game.ts:217`) |
| TREINO | `tema:<c2>`, o boneco (D-C1: alternativa `'fight'`) |
| CPU×CPU (demo) | `tema:<c2>` |
| Espelho (`c1 === c2`) | o tema do lutador |
| ZENON jogável enfrentado fora do chefão | a valsa, sempre na fase 1 |
| Menu, seleção, VS, fim | `'menu'` (sem mudança) |

`Regras` ganha `temasMusicais: boolean` (Cronos; `true` no padrão, `false` em `dev-expansao.ts`). Fica separado de `cinematica`
de propósito: são preferências que não se misturam.

### 3.4 Estrutura de composição dos 10

Convenções: `passo` = a subdivisão do sequenciador; `spb = 60 / (bpm × passosPorTempo)`; todo tema tem **8 ou 16 compassos**, com
**laço de 10 a 21 s**, frase A (metade) + frase B (metade). No laço ímpar o lead sobe uma oitava ou troca de instrumento, como o
`LEAD` de hoje. No 1º laço, os **2 primeiros compassos não têm lead** (abertura), para não brigar com a fala da entrada. A
melodia é escrita em **graus da escala** do tema: nota fora da escala não existe por construção.

| Lutador | Tônica / escala (semitons da tônica) | Compasso / andamento / passos | Laço | Instrumentação (síntese com `T`/`R`/`V`) | Ritmo característico | Motivo da frase A (semente) |
|---|---|---|---|---|---|---|
| HAYATO (Japão) | Mi, escala **In** {0,1,5,7,8} | 4/4, 144 bpm, 16 por compasso | 8 c. = 13,3 s | shamisen (quadrada curta, ataque 2 ms, queda de 30 ms, "sawari" com ruído passa-alta), shinobue (seno agudo + sopro), taiko (seno 140 → 45 Hz), ko (estalo de borda) | don nos passos 0, 6 e 8; doko em 12 e 13; hyoshigi em 4 e 12 | Si . Lá Si \| Dó . Si Lá \| Fá . Mi . |
| WEI LONG (China) | Fá, pentatônica **gong** {0,2,4,7,9} | 4/4, 100 bpm, 16 | 8 c. = 19,2 s | erhu (dente-de-serra com passa-banda e **deslize** f0 → f1 entre notas, vibrato 5 Hz), guzheng (triângulo dedilhado), bangu (estalo de madeira), dagu (seno grave) | bangu em 0, 3, 6, 8 e 11; dagu em 0 e 8; prato pequeno em 4 e 12. Esparso: calma e peso | Dó . Ré Dó \| Lá . Sol . \| Fá Sol Lá . \| Dó — |
| MIN-JI (Coreia do Sul) | Lá, **gyemyeonjo** {0,3,5,7,10} | 12/8 **jajinmori**, ♩.=108, 12 colcheias (4 × 3) | 8 c. = 17,8 s | haegeum (dente-de-serra fino, vibrato largo na nota longa), gayageum (triângulo dedilhado), janggu (agudo "deok" e grave "kung"), kkwaenggwari (metal, ruído passa-banda a 3 kHz) | deong em 0; deok em 2, 3, 5, 8 e 9; kung em 6; kkwaenggwari em 0, 3, 6 e 9 | Mi . Mi \| Ré Dó Ré \| Mi . Sol \| Lá . . |
| CAIO (Brasil) | Sol, **mixolídio** {0,2,4,5,7,9,10} | 2/4, 132 bpm, 8 por compasso | 16 c. = 14,5 s | berimbau (seno "dong" e "ding" +2 st, "tch" de ruído curto), atabaque (seno grave), pandeiro (ruído em semicolcheias, acento em 3 e 7), agogô (2 tons metálicos) | toque **São Bento Grande** em 2 compassos: tch tch dong . ding . | Ré . Ré Mi \| Fá . Mi Ré \| Si . Dó Ré \| Sol — (o Fá♮, a 7ª menor, é a cor) |
| AMINU (Nigéria) | Si♭, **hexatônica** {0,2,3,5,7,10} | 6/8, ♩.=116, 12 semicolcheias (2 × 6) | 16 c. = 16,6 s | algaita (dente-de-serra com passa-banda nasal a 1,2 kHz e Q 4), kalangu (**tambor falante**: tom que cai, f0 → f0 × 2^(−7/12) em 120 ms), ganga (bumbo + chiado) | sino-guia nos passos 0, 2, 4, 5, 7, 9 e 11; kalangu em 0, 3, 6, 8 e 9; ganga em 0 e 6. **Chamada e resposta**: a algaita chama, o kalangu responde | Fá . Mi♭ Fá Lá♭ . \| Fá Mi♭ Ré♭ Dó Si♭ . |
| CENTELLA (México) | Dó **maior**, cadência V7 → I | **sesquiáltera**: 6/8 e 3/4 alternados, ♩.=92, 12 semicolcheias | 16 c. = 20,9 s | trompetes em terças (dente-de-serra com passa-baixa que abre no ataque), guitarrón (triângulo grave), vihuela em rasgueado (ruído curto + 3 triângulos), palmas | compasso par com acentos em 0 e 6 (6/8); ímpar em 0, 4 e 8 (3/4) | Sol Sol Lá Sol \| Mi . Dó . \| Ré Ré Mi Fá \| Sol — |
| CAMILLE (França) | Si, **menor harmônica** {0,2,3,5,7,8,11} | 4/4 **swing** (manouche), 192 bpm, 8 colcheias, swing 0,62 | 16 c. = 20 s | acordeão musette (2 quadradas desafinadas ±12 cents, vibrato 6 Hz), contrabaixo (triângulo, walking), guitarra em **la pompe** (baixo nos tempos 1 e 3, acorde curto passa-alta nos tempos 2 e 4), vassourinha (ruído passa-baixa) | la pompe; sem bumbo; vassourinha em todas as colcheias com swing | Fá♯ . Sol Fá♯ \| Lá♯ Si . Fá♯ \| Ré . Dó♯ Si \| Lá♯ — |
| NILA (Índia) | Fá♯, raga **Hindolam** {0,3,5,8,10} | **5/8 khanda chapu** (2+3), ♪=300, 10 semicolcheias | 16 c. = 16 s | venu (seno + sopro, **gamaka**: deslize de ±1 st), veena (triângulo com queda), chenda (estalo passa-banda a 2,5 kHz, Q 3, e grave), elathalam (ruído passa-alta), drone sa-pa (2 dentes-de-serra com passa-baixa, entrada lenta) | chenda agudo em 0, 4, 6 e 8; grave em 0 e 4; elathalam nos passos pares | Si . Lá Fá♯ \| Lá . . Si Ré \| Mi Ré Si . . |
| BAATAR (Mongólia) | Mi♭, pentatônica **suspensa** {0,2,5,7,10} | 2/4 **galope**, 120 bpm, 8 por compasso | 16 c. = 16 s | morin khuur (dente-de-serra com passa-banda a 900 Hz, Q 2, vibrato 5 Hz, notas longas), **khöömei** (`vozFormante` com o formante extra a 1400 Hz, 1 nota a cada 2 compassos), tambor grave (seno 110 → 55 Hz) | galope em 0, 2, 3 e 4, 6, 7 | Si♭ . Lá♭ Si♭ \| Ré♭ . Si♭ Lá♭ \| Fá . Mi♭ . \| Mi♭ —— |
| ZENON (Grécia) | Ré **frígio dominante** {0,1,4,5,7,8,10} | 3/4 valsa, 138 bpm, 12 | 8 c. = 10,4 s | a de hoje (`playChefe`): cravo, órgão em quintas, bordão, prato de braseiro | **não muda** (fixture) | `CHEFE_MELODIA` |

Os conjuntos de notas (relativos à tônica) são **todos diferentes**. As tônicas também: Ré, Mi, Fá, Fá♯, Sol, Lá, Si♭, Si, Dó e
Mi♭. Os pares de escala mais parecidos (CAIO × CENTELLA, MIN-JI × BAATAR e MIN-JI × NILA) se separam pelo compasso e pela
instrumentação. É por isso que o critério (§3.7) pede **2 de 3 dimensões**, e não as 3.

Os motivos são **sementes de composição**, não a música pronta. A Vega escreve a partitura completa nos dados; o Apolo revisa o
respeito cultural; o dono ouve na S5 da spec de sons.

### 3.5 Mixagem e orçamento de CPU

- **Volume:** o RMS de um laço inteiro de cada tema fica a **±1,5 dB** do RMS do laço de `'fight'`, medido no renderizador de
  referência da S0 (spec de sons, §7.1). `musicVol` (0,45) não muda.
- **Espaço para as vozes:** a energia do tema na faixa de 300 a 3000 Hz fica **≤ a da `'fight'` + 1 dB**, para que os gritos da
  identidade sonora continuem passando por cima.
- **Grave:** a energia abaixo de 120 Hz fica ≤ a da `'fight'` + 2 dB, para não mascarar os impactos.
- **Pico** de cada passo no barramento `music` ≤ 0,5 antes do ganho. O limitador do master (D-S6 da spec de sons) protege a soma.
- **Orçamento, relativo ao que já existe** (medido na fatia T0 com o contexto falso, não inventado aqui): fontes novas por passo
  ≤ **o máximo da `'fight'` de hoje** (a leitura do código dá 8 no passo 0: bumbo, chimbal, baixo, 2 do lead e 3 do acorde);
  fontes ativas de música ≤ **1,25 × o pico ativo da `'fight'`**. O `vozFormante` (até 4 fontes) só em nota longa, no máximo 1
  por compasso. A música continua fora do teto de 32 fontes dos efeitos.
- **Celular:** no Chromium com `setCPUThrottlingRate` 4×, por 60 s com cada tema: **0 atraso do agendador** (nenhum passo agendado
  com `nextTime < currentTime`) e p99 de `scheduler()` < 1 ms. O celular de verdade, só o dono testa.

### 3.6 Fase 2 do chefão

- O mecanismo de hoje cobre tudo: o evento `fase-chefe` `cena` já emite `musicaDaFase(2)`, e a troca só vale **no início do
  compasso seguinte**. O `playTema` lê `this.fase`, como o `playChefe`.
- `TemaDef.fase2 = { andamento: 1,08; camadas: [...] }`: bumbo em todos os tempos, baixo uma oitava abaixo e um contracanto. O
  ZENON continua com o `andamentoFase2: 1,12` dele.
- Como o tema é o mesmo que toca quando aquele lutador é rival comum, o jogador **reconhece** o guardião e ouve a música "virar"
  na fase 2. Isso só existe na luta de chefe.
- A postura da NILA **não** muda a música na v1 (custaria um evento por troca, 21 por luta). Fica como D-C3.

### 3.7 Como provar que os temas são distintos sem ouvir

Mesma disciplina da spec de sons: **a régua é calibrada e congelada antes de existir tema novo** (fatia T0), com as 3 trilhas que
já existem (`fight`, `menu`, `chefe`), que o dono já ouve como músicas diferentes.

| Dimensão | Medida (pura, sobre a partitura, exceto o timbre) | Por que não engana |
|---|---|---|
| **Melódica `dM`** | 0,5 × (1 − Jaccard dos **trigramas de intervalos** do lead em semitons) + 0,5 × (1 − Jaccard do **conjunto de notas relativo à tônica**) | só intervalos: transpor não muda nada, então não dá para "diferenciar" mudando o tom |
| **Rítmica `dR`** | média de: (a) 1 − cosseno dos vetores de ataque do compasso, reamostrados numa grade de 240 posições (o MMC de 16, 12, 10 e 8), com peso pelo acento e suavizados (σ = 2); (b) `min(1, abs(log2(bpm_a / bpm_b)) / log2(1,15))`; (c) 1 se os pulsos por compasso diferem | compara onde caem as batidas e o pulso, não a duração em segundos |
| **Timbral `dT`** | a régua `S` da spec de sons (MFCC sem c0, brilho, envelope) num compasso de cada pista (lead, baixo, percussão), renderizado pelo renderizador de referência da S0 | é o mesmo instrumento de medida dos efeitos, já calibrado |

Cada dimensão é dividida pelo seu limiar `τ`, calibrado na T0:

1. **Controles negativos** (têm de ficar < 0,4 depois de normalizados): o tema contra ele mesmo transposto +5 st (`dM` tem de dar
   **0**); o mesmo tema a +5% de andamento; o mesmo tema com uma nota trocada; o lead uma oitava acima.
2. **Controles positivos** (têm de ficar ≥ 1,2): os 3 pares de `fight` × `menu` × `chefe`.
3. Ajustar **só os `τ`** até separar. Se nenhum `τ` separa, a régua está errada e a fatia para (volta para a Nova).
4. Congelar os números num comentário do teste. Mudar depois exige registro no PROGRESSO.md e novo veredito da Íris.

**Critério para os temas novos:** para cada um dos 45 pares, e para cada tema contra `fight` e contra `menu`:

- **pelo menos 2 das 3** dimensões ≥ 1,0;
- e `D = sqrt(dM² + dR² + dT²) ≥ 1,2`.

O teste imprime a matriz e o **par mais próximo**, com o valor. "Passou" sem número não vale. **O que não se prova sem ouvir:**
que o tema é bonito e que não soa caricato. Isso é a escuta do dono e a revisão do Apolo.

---

## 4. Parte D: chefão mais duro

### 4.1 Opções de mecanismo (3)

| | D1. **Multiplicador de dano recebido** (`ConfigChefe.danoRecebido`) | D2. Mais vida por barra (`hpPorBarra` maior) | D3. Só IA mais forte |
|---|---|---|---|
| É "leva menos dano"? | **sim, literalmente** | na prática (a barra cai mais devagar) | não |
| Mudança no motor | 1 ajudante, 4 pontos de chamada, atrás de `d.cfgChefe` | **nenhuma** | nenhuma |
| Desempate por tempo (`vidaTotal` absoluta, `game.ts:941`) | **justo**: a vida máxima não muda | **desequilibra**: com 150 de vida, o chefão vence no tempo mesmo tendo perdido proporcionalmente mais | justo |
| Funciona com a NILA (fichas) | sim (mora no `cfgChefe`) | sim | sim |
| Lock-step dos 4 | intacto (o ramo nunca roda para eles) | intacto | intacto |
| Ajuste fino | contínuo (0,05) | em pontos de vida | grosso |

**Recomendação: D1 como alavanca principal**, porque é o que o dono pediu e não estraga o desempate por tempo. `hpPorBarra` fica
como alavanca de reserva (§4.4). D3 não entra: o `IA_CHEFE` (`cpu.ts:35`) já vale para qualquer chefão e não muda, porque mexer
nele deslocaria o ZENON.

### 4.2 Contrato do bloco de chefe generalizado (Vega)

```ts
// src/data/tipos.ts
export type ConfigChefe = {
  barras: 2;                       // continua 2 para todos (1 round, 2 barras: a gramática que o jogador já aprendeu com o ZENON; D-D3)
  hpPorBarra: number;              // guardiões: ceil(hp / 2) do próprio def (AMINU 56, CENTELLA 48, CAMILLE 49, NILA 54, BAATAR 46)
  fichaFase1?: string;             // AGORA OPCIONAL: ausente = a ficha do jogável (null). O ZENON mantém 'chefe'
  fichaFase2?: string;             // ausente = não troca de ficha na retomada (a NILA mantém a postura em que estava)
  cena: CenaDef;                   // fase 2 com poses existentes (§2.2), 60 ticks nos guardiões (ZENON: 90)
  bonusVitoria: number;            // guardiões: 3000 (ZENON 5000); D-D4
  trilha?: TrilhaChefe;            // ZENON: 'chefe'. Guardiões: ausente (o tema vem de trilhaDaLuta, §3.3)
  danoRecebido?: number;           // NOVO: 0,5 <= x <= 1,0; ausente = 1 (montar rejeita fora da faixa)
};
```

No motor (`src/fight/**`), ponto a ponto:

- `virarChefe` (`fighter.ts:268`): só valida e troca de ficha se a ficha existe. `fichaBase = cfg.fichaFase1 ?? null`.
- `andarCenaDoChefe` (`game.ts:483-494`): `if (cfg.fichaFase2) c.trocarFicha(cfg.fichaFase2)`.
- **Um** ajudante privado, `danoNoDefensor(d, dano)`: devolve `dano` se `!d.cfgChefe` ou se `danoRecebido` é 1 ou está ausente;
  senão `dano * danoRecebido`. Ele é chamado nos 4 pontos, **depois** de todas as contas de hoje (escala por `gotHits`, contragolpe,
  `contra.mult`, mínimo de 0,4 do raspão) e **antes** de subtrair da vida:
  - arremesso, `game.ts:283`;
  - raspão, `:725`;
  - armadura, `:781-783` (o teste de absorção e o valor, com o mesmo fator);
  - golpe, `:803`, antes da trava do treino em `:805`.
- O dreno de energia (`drenaEnergia`) **não** passa pelo fator: é energia, não vida.
- O ganho de energia por acerto **não** depende do dano (`game.ts:815-816`), então não muda.
- A pontuação do jogador (`a.score += dmg × 100`) usa o dano efetivo, que é o honesto. O `bonusVitoria` compensa.
- O `hit.dano` do evento vem do dano efetivo, então os números da sessão do especial mostram o dano real.

Como verificar que o jogável não mudou:

- `montar(def)` sem o campo `chefe` dá o mesmo `LutadorMontado` de antes, campo a campo, nos 10 lutadores;
- o hash da parte regular do harness não muda;
- luta-fidelidade e snapshot verdes **sem `-u`**;
- o `git diff src/fight` fica restrito às linhas acima.

### 4.3 Alvos de balanço

O harness mede **CPU contra CPU no mesmo nível**. O "jogador" é a CPU do desafiante. Os números são uma **aproximação** da hipótese do
dono, não a taxa de uma pessoa (R4).

| Chefão | Desafiantes medidos (o elenco que existe naquele ponto) | NORMAL (jogador vence) | DIFÍCIL |
|---|---|---|---|
| AMINU | os 4 iniciais | **17-23%** | **8-15%** |
| CENTELLA | iniciais + AMINU | 17-23% | 8-15% |
| CAMILLE | iniciais + AMINU, CENTELLA | 17-23% | 8-15% |
| NILA | iniciais + 3 | 17-23% | 8-15% |
| BAATAR | iniciais + 4 | 17-23% | 8-15% |
| ZENON (hoje 31,9% / 23,0%) | os 9 | 17-23% | 8-15% |

Esta é a hipótese do dono, plana. A alternativa em **rampa** (AMINU 26-30% → ZENON 15-19%) está em D-D1. Ela evita que o primeiro
guardião vire um muro para quem acabou de começar.

Critérios que acompanham a taxa (todos por chefão e por nível):

| Medida | Alvo | Por quê |
|---|---|---|
| Lutas que terminam por KO | ≥ 90% | com menos dano a luta fica mais longa e o relógio de 99 s começa a decidir (R3) |
| Duração média | ≤ 75 s NORMAL, ≤ 90 s DIFÍCIL | hoje 38-42 s e 55-71 s; a luta de chefe não pode virar maratona |
| Pior desafiante | ≥ 5% no NORMAL | nenhuma combinação pode ficar impossível |
| Melhor desafiante | ≤ 40% no NORMAL | nenhuma combinação pode ficar trivial |
| `danoRecebido` escolhido | ≥ 0,60 | abaixo disso o chefão vira esponja de dano (R5) |
| Lutas travadas | 0 | |
| Regulares (90 pares) | **hash idêntico** ao de antes | prova de que o jogável não mudou |

### 4.4 Plano do harness (Vega)

1. **Tarefas:** `montarTarefas(ids, chefes, p)` recebe `desafiantesDoChefe(REGRAS)` (§1.3) no lugar do `CHEFE` único. São 4 + 5 +
   6 + 7 + 8 + 9 = **39 pares desafiante × chefão**, 2 níveis e 100 sementes: 7800 lutas de chefe, contra 1800 hoje. No ritmo atual
   (~275 lutas/s em 8 processos), isso soma uns 30 s à rodada completa (estimativa).
2. **Relatório:** a seção "Chefão" de `resultados.md` vira **uma tabela por chefão**, com as mesmas colunas de hoje mais "Terminou
   por tempo", e um resumo de 6 linhas (média por chefão e por nível, contra a meta).
3. **Hash separado:** `hashRegulares` e `hashChefes`, para provar o item "regulares idênticos".
4. **Ajustes:** `--ajustes` já aceita `chefe: Record<string, number>` (`elenco.ts:47`); passa a aceitar `danoRecebido`. Novo filtro
   `--chefes aminu,zenon`.
5. **Varredura:** `--varrer-dano 1,0.9,0.8,0.7,0.6` roda as lutas de chefe com cada fator, com 30 sementes (rápido), e imprime
   taxa × fator por chefão. A taxa tem de **cair** quando o fator cai; se não cair, há bug (critério de sanidade).
6. **Escolha:** em cada chefão, o fator da grade de 0,05 cujo resultado fica dentro da faixa nos **dois** níveis. Se nenhum fator
   atende os dois níveis, a prioridade é o NORMAL e a diferença vai ao dono. Depois, a rodada `--completo --esquiva` com 100
   sementes confirma, e a **Íris roda de novo do zero** (quem calibrou não valida).
7. **Metas do README** (`docs/balanco/README.md`): "chefão NORMAL 30-40%" vira a faixa aprovada em D-D1.
8. **Se o fator bater em 0,60 sem atingir o alvo:** a reserva é `hpPorBarra` (+10%). Se nem assim, volta para a Nova; não se
   inventa uma 3ª alavanca na hora.

---

## 5. Plano em fases

Dependências externas, que valem para tudo:

- (X1) a **provocação P2 da Lyra** precisa estar integrada antes de qualquer mudança em `fight.ts`, `select.ts` ou `render/`
  da luta;
- (X2) as fatias de **sons S0/S1 da Vega** (o renderizador de referência e as primitivas) vêm antes dos temas.

| Fatia | Quem | O que | Depende de | Pronto quando |
|---|---|---|---|---|
| **P1** regra | **Cronos** | `chefes.ts` (`chefeDoArcade`, `ehChefeFinal`, `desafiantesDoChefe`), `Regras.chefesDaFila` e `Regras.temasMusicais`, `montarEscada` e `aplicarVitoriaArcade` novos, teto de chefões derrotados em 16, `dev-expansao.ts` com os dois campos em `false` | D-A2 | matriz S1-S11 e o teste exaustivo verdes; rollback contra o saneamento do HEAD; `progresso.test`, `z6-chefoes-derrotados.test` e `storage-v2.test` verdes sem mudar asserção antiga |
| **R1** motor | Vega | `ConfigChefe` generalizado (fichas opcionais, `danoRecebido`), `danoNoDefensor` nos 4 pontos, validação em `montar`, blocos `chefe` dos 5 com `danoRecebido` **1,0** (provisório) e `cena` com poses existentes | — (em paralelo com P1) | luta-fidelidade e snapshot sem `-u`; unit: o fator nos 4 pontos, NILA chefe troca de postura e mantém o fator, ZENON idêntico (`zenon-motor.test`, `chefe-e3.test`); jogável campo a campo igual |
| **R2** harness | Vega | §4.4, itens 1 a 5 | P1, R1 | rodada `--completo --esquiva` com fator 1,0 publicada como linha de base dos 6; `hashRegulares` igual ao de hoje |
| **A1** textos e roteiro | **Apolo** | `docs/textos-chefoes.md` (§2.5), roteiro das 5 entradas (§2.2, confirmar ou trocar poses), lista final de lacunas, revisão cultural dos 9 temas (§3.4) | D-A1, D-B1 | todos os campos dentro dos limites (contados); nada religioso; palavras marcadas (rev.) |
| **R3** calibração | Vega → **Íris** | §4.4, itens 5 a 8 | R2, D-D1 | os 6 chefões dentro da faixa nos critérios de §4.3, com a tabela; a Íris reproduz do zero e confirma |
| **L1** UI da progressão | Lyra | §1.6 inteira, `fim.ts` com o id do chefão, epílogo no desbloqueio | P1, X1 (textos do Apolo podem entrar como rascunho) | e2e: save S1 → AMINU no fim do ARCADE → desbloqueio com epílogo; S3 → aviso do Anfitrião; S7 → ARCADE sem chefão; textos medidos no navegador |
| **E1** entradas | Lyra | §2.3: `RoteiroDeEntrada`, 5 roteiros, `efeitos-de-entrada.ts`, `rampaDaFase2` sem ficha, véu de fase 2 (§1.7) | R1, A1 (roteiro), X1 | `z3-entrada-chefe.test` e `z2-render-chefao.test` verdes **sem `-u`**; ≤ 14 primitivas por quadro (contadas num teste); e2e de pular e da CURTA em 1 guardião; capturas das 5 entradas para o dono |
| **T0** régua musical | Vega | §3.7: descritores `dM`/`dR`, `dT` sobre o renderizador da S0, controles negativos e positivos com as 3 trilhas de hoje, `τ` congelados | X2 (S0) | controles negativos < 0,4 e positivos ≥ 1,2, com os números num comentário; **nenhum tema novo ainda** |
| **T1** sequenciador | Vega | `data/musica/tipos.ts`, `audio/temas.ts` (`partituraDoPasso`, `trilhaDaLuta`), `playTema`, o ramo no `scheduler`, `OpcoesReceita.destino/inicio`, chave desligada | X2 (S1), T0 | `audio.test` e `audio-chefe.test` verdes sem `-u`; N0: partitura determinística (mesmo passo = mesmas chamadas), fase 2 no compasso seguinte, orçamento estático por passo |
| **T2** composição | Vega (+ revisão do Apolo) | os 9 `TemaDef`, `exigirTemasValidos` | T1, T0 congelada | §3.7 verde com a matriz impressa; §3.5 (volume, faixa da voz, grave, pico, orçamento) medido |
| **T3** ligação | Vega | `fight.ts:268` → `startMusic(trilhaDaLuta(...))` | T2, X1, sons S4 (mesmo arquivo) | e2e: rival comum toca `tema:<c2>`; chefão guardião vira a fase 2 na troca de barra; `?expansao=4` toca `'fight'` |
| **Q** validação | **Íris** | cada fatia acima; N3 da música no Chromium com CPU 4×; escuta do dono (os 10 temas e as 5 entradas); teste num celular de verdade (o dono) | cada fatia | veredito com números; OK do dono na escuta, e só então `TEMAS_POR_LUTADOR = true` |
| **A2** arte (opcional) | Apolo + dono | as poses de §2.6 | D-B2 | troca só de nomes de pose nos roteiros, sem código |
| **D1** docs | Alexandria | `docs/como-adicionar-um-lutador.md` (bloco de chefe, tema, roteiro, textos), `docs/arquitetura.md` (chefão derivado do progresso; o fator de dano fora da ficha; tema como dado), `docs/balanco/README.md` | R3, T3, E1 | conferido contra o código |

**Paralelismo possível:** P1 ∥ R1 ∥ A1 ∥ T0. Depois R2 → R3 de um lado e L1/E1 do outro (depois de X1). T1 → T2 → T3 andam em
outra trilha. **Caminho crítico:** X1 e X2, que são trabalho em andamento de outros, e não a arte.

**Chaves de rollback** (cada uma desliga uma parte e deixa o jogo como hoje):

- `Regras.chefesDaFila = false`;
- tirar os blocos `chefe` dos guardiões;
- `danoRecebido` ausente;
- `TEMAS_POR_LUTADOR = false`;
- tirar o `roteiro` de `APRESENTACAO` de um guardião (ele luta sem entrada dramática).

---

## 6. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | O fator de dano vaza para os 4 originais e quebra o lock-step | ramo só com `d.cfgChefe`; luta-fidelidade e snapshot sem `-u`; `git diff src/fight` revisado linha a linha |
| R2 | Reforço posto numa ficha some na troca de postura da NILA (0.3) | o fator mora no `ConfigChefe`; teste específico com a NILA chefe trocando de postura |
| R3 | Menos dano leva a mais lutas por tempo, e o desempate absoluto decide | alvo de KO ≥ 90% e duração ≤ 75/90 s; se falhar, D-D5 (relógio próprio do chefão, `ConfigChefe.tempo`, mais um ramo atrás de `cfgChefe`) |
| R4 | A aproximação CPU × CPU não é a taxa de uma pessoa | número declarado como aproximação; o dono joga o AMINU e o ZENON antes de fechar o R3; a faixa pode ser revista (D-D1) |
| R5 | Chefão "esponja": o fator baixo deixa a luta chata, sem ficar mais justa | piso de 0,60; reserva em `hpPorBarra`; a duração média é critério |
| R6 | 1º guardião difícil demais para quem está começando | rampa como alternativa (D-D1); "pior desafiante ≥ 5%" |
| R7 | Generalizar a entrada mexe no ZENON | `z3`/`z2` sem `-u`; o índice da batida reproduz o 0/1/2 de hoje |
| R8 | Saves antigos com o ZENON liberado antes dos guardiões contam a história fora de ordem | aceito: nada é revogado; aviso de revanche no ZENON derrotado (D-A3); os guardiões continuam vindo |
| R9 | Tema caricato ou culturalmente errado | escalas e instrumentos em dados, revisão do Apolo, escuta do dono, nada religioso, palavra marcada (rev.) |
| R10 | Música engasga no celular | orçamento relativo ao da `'fight'` medido; N3 com CPU 4×; 0 atraso do agendador; celular real com o dono |
| R11 | Conflito em `fight.ts`, `select.ts` e `audio-sys.ts` com trabalho em andamento | X1 e X2 como dependências explícitas; T3 depois da S4 dos sons |
| R12 | Régua musical ajustada depois de ouvir | T0 congelada antes da T2, os mesmos controles da spec de sons |
| R13 | Guardião futuro aparece como rival comum antes da vez dele | D-A4: manter a ED5 (excluir encolheria o 1º ARCADE para 3 rivais) e deixar a entrada dramática fazer a revelação "de chefão" |
| R14 | Texto estoura a tela | limites de partida (§2.5) e medição no navegador pela Lyra |

**Dívidas conscientes:**

- (a) sobreposição de cenário por guardião, como os braseiros da `gr`, fica fora da v1;
- (b) a música não acompanha a postura da NILA;
- (c) o ZENON jogável, com tudo liberado, joga o ARCADE sem chefão (ED7).

---

## 7. Critérios medíveis (consolidado)

1. **Lock-step e oráculos:** luta-fidelidade, snapshot do motor, `audio.test`, `audio-chefe.test`, `z3-entrada-chefe.test` e
   `z2-render-chefao.test` verdes **sem `-u`**.
2. **Progressão:** matriz S1-S11 e teste exaustivo (64 estados × `c1`): o chefão está sempre bloqueado (ou é o final) e nunca é o
   `c1`; 6 zeradas liberam tudo; nada é revogado; rollback lido pelo saneamento do HEAD.
3. **Jogável intacto:** `montar` sem `chefe` igual campo a campo; `hashRegulares` idêntico ao de hoje.
4. **Balanço:** os 6 chefões dentro da faixa aprovada (D-D1) nos dois níveis, com KO ≥ 90%, duração ≤ 75/90 s, pior ≥ 5%,
   melhor ≤ 40%, `danoRecebido` ≥ 0,60 e 0 travadas, reproduzidos pela Íris.
5. **Entradas:** 5 roteiros com COMPLETA de 270, CURTA de 60, pular depois do tick 10 e saída em ≤ 6 ticks (os mesmos testes do
   ZENON, parametrizados); ≤ 14 primitivas por quadro; 0 consumo do `rngVisual`.
6. **Temas:** 45 pares + 20 contra o legado com ≥ 2 de 3 dimensões ≥ 1,0 e `D ≥ 1,2`; volume a ±1,5 dB; faixa da voz ≤ +1 dB;
   fontes dentro do orçamento relativo; 0 atraso do agendador com CPU 4×; nenhum `Math.random` em `src/audio/**` e `src/data/musica/**`.
7. **Escuta do dono:** OK explícito para os 10 temas e as 5 entradas antes de ligar as chaves.

---

## 8. Decisões em aberto (para o dono)

| ID | Pergunta | Opções | Recomendação |
|---|---|---|---|
| D-A1 | Nome dos 5 da fila no jogo | "guardiões" (com os Cinco Selos) / "desafiantes" / sem nome coletivo | **guardiões**: amarra o selo do ZENON e o desbloqueio a uma história só |
| D-A2 | Jogando com o ZENON e com tudo liberado: ARCADE sem chefão (ED7) ou o último guardião (BAATAR) como chefão? | sem chefão / BAATAR | **sem chefão**: mantém a ED7 e é o caso raro |
| D-A3 | ZENON já derrotado: aviso igual ("ESTÁ À SUA ESPERA") ou de revanche ("QUER REVANCHE")? | igual / revanche | **revanche**: reconhece quem já venceu e cobre os saves antigos |
| D-A4 | Guardiões que ainda não chegaram à vez deles podem aparecer como rival comum? | sim (vitrine, ED5) / não | **sim, manter a ED5**. Com "não", o 1º ARCADE teria só **3 rivais** (os outros 3 iniciais) mais o AMINU, contra 5 hoje, e a escada só voltaria a 5 rivais no 3º guardião: isso mudaria a ED4 (6 lutas). O ganho de surpresa não paga isso |
| D-A5 | Título no HUD do chefão acima de 16 letras | "CHEFÃO" sozinho (hoje) / título abreviado no dado | **abreviado no dado** (ex.: "A RIPOSTE"), quem escreve é o Apolo |
| D-B1 | Enredo dos Cinco Selos (§2.1) | aprovar / ajustar / outro | aprovar como premissa; o texto é do Apolo |
| D-B2 | Arte nova das entradas (§2.6) | agora / depois / nunca | **depois**: a v1 sai com poses existentes; AMINU primeiro, se houver arte |
| D-B3 | Sobreposição sob medida por cenário (como a `gr`) | v1 / depois | **depois**: a v1 usa os efeitos genéricos de §2.2 |
| D-C1 | No TREINO, tema do boneco ou a trilha de luta? | tema do `c2` / `'fight'` | **tema do `c2`**: é onde dá para ouvir com calma |
| D-C2 | O tema também toca no VS e na seleção (prévia)? | não / prévia de 2 compassos no VS | **não** na v1 (o VS dura pouco e o menu já tem trilha) |
| D-C3 | A música da NILA muda com a postura? | não / sim | **não** na v1 (dívida b) |
| D-D1 | Faixa de vitória do jogador contra os chefões | **plana**: todos 17-23% NORMAL, 8-15% DIFÍCIL (a hipótese do dono) / **rampa**: AMINU 26-30% → ZENON 15-19% | **rampa**: o 1º guardião é a primeira luta de chefe de quem acabou de começar. Decidir antes da R3 |
| D-D2 | O fator de dano também no DIFÍCIL, ou um fator por nível? | um fator por chefão / um por chefão e por nível | **um por chefão**: um número só é mais fácil de explicar e medir; a diferença entre níveis vem da IA |
| D-D3 | Guardiões com 2 barras e 1 round (como o ZENON) ou 1 barra em melhor de 3? | 2 barras / melhor de 3 | **2 barras**: é a gramática de chefão que o jogo já ensinou, e a fase 2 dá o momento da música virar |
| D-D4 | Bônus de pontos por guardião | 3000 / 5000 (igual ao ZENON) | **3000**: o Anfitrião continua sendo o maior prêmio |
| D-D5 | Se as lutas por tempo passarem de 10%: relógio maior na luta de chefe? | não / sim (`ConfigChefe.tempo`) | **só se medido**: decidir com os números da R2 |
