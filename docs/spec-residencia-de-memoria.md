# Spec: residência de memória na luta (T3 do R-8)

Autora: Nova (arquitetura), 2026-10-23. Base: HEAD `a7b22a0`. **Não muda código**: é o contrato e o plano da Lyra.
Parte de `docs/orcamentos-2026-10-23.md` §2.3/§2.4 (OR-1..OR-9 aprovados) e do que existe hoje em `src/assets/{gerenciador,carregador,
silhuetas,canvas,elenco}.ts`, `src/ui/{navegador,espera-de-arte}.ts`, `src/ui/cenas/fight.ts`, `src/trailer/carga.ts`, `src/ui/trailer/arte.ts`.
É pré-requisito para ligar `Regras.motorV2.filmes` em produção.

Níveis de prova: **[medido]** (li o disco ou a Íris mediu), **[calculado]** (conta sobre o medido), **[lido]** (código), **[estimado]**.

## 0. Contexto e hipóteses

- Escala: jogo de navegador, 1 jogador por aparelho; o alvo crítico é o iPhone do dono (WebKit) e um Android médio. MVP maduro, sem servidor.
- O que já foi feito e esta spec usa: silhueta **por quadro** com teto de 6 MiB e sem exceção no `getContext` nulo (T2,
  `CacheDeSilhuetas`); cenários todos WebP 1920 x 1080 (T1); WEI LONG v2 com 2 páginas de 2048 x 1664 (26,0 MiB); FILME só com a flag
  (`fight.ts` `carregarFolhasDoFilme`) e no máximo 2 folhas (`MAX_FOLHAS_FILME`).
- O que falta e é o objeto desta spec: a vitrine (HAYATO, WEI LONG, MIN-JI, CAIO = **102,0 MiB**) e os cenários `jp, cn, kr, br`
  (**31,6 MiB**) são `fixos`/`cenariosFixos` no `GerenciadorDeArte` e **nunca saem**, nem na luta [lido]. O limite de residentes é por
  **contagem** (3 não fixos), não por peso [lido].

### 0.1 Números de partida

| Item | Decodificado (w x h x 4) |
|---|---|
| Atlas | AMINU 30,0 · BAATAR 52,0 · CAIO 28,0 · CAMILLE 23,0 · CENTELLA 26,0 · HAYATO 24,0 · MIN-JI 24,0 · NILA 37,5 · WEI LONG 26,0 · ZENON 60,0 [medido nos `atlas.json`] |
| FILME (1 página) | 7,9 (CAMILLE) a 9,5 (BAATAR); HAYATO 9,4 [medido] |
| Cenário | 7,91 cada (todos 1920 x 1080) [medido] |
| Retratos (os 10, sempre residentes) | 1,65 [medido] |
| Base fora das imagens | canvas principal 7,9 + teto das silhuetas 6,0 + caches de UI 4,0 [estimado] = **17,9** |

Hoje, só imagens, sem FILME (Íris, `mem-luta.mjs`): HAYATO x MIN-JI 135,3 · NILA x CENTELLA 206,7 · BAATAR x BAATAR 195,2 ·
BAATAR x ZENON 255,2 · ZENON x ZENON 203,2 · CAIO x AMINU 173,2 · AMINU x CAIO 165,3 MiB [medido]. Refiz a conta de HAYATO x MIN-JI
(102 + 4 x 7,91 + 1,65 = 135,3) e de NILA x CENTELLA (+ 63,5 de atlas + 5º cenário) e bate: **o excesso é exatamente vitrine + cenários fixos.**

### 0.2 Achado que muda o desenho do §2.3 original: o cenário `jp`

O `jp` é o fundo de **todos** os menus (`desenharFundoMenu(ctx, m.rec.cenarioPadrao, ...)` em menu, select, diff, how, options, result,
continue, ending, desbloqueio) e `main.ts` guarda a imagem em `rec.cenarioPadrao` **por referência, no boot** [lido]. Ou seja: mesmo
tirado do mapa, o `jp` continua vivo. Calculei os 100 pares com o desenho novo [calculado, `nova-pares.mjs` no scratchpad]:

| Política do `jp` na luta | Pares comuns acima de 115 | Pesados acima de 150 |
|---|---|---|
| **sai da luta** (quando a luta não é no Japão) | **nenhum** (pior: NILA x AMINU 112,8) | só BAATAR x ZENON (157,6) |
| fica sempre | 9 (pior: NILA x AMINU 120,7) | 4 (BAATAR x ZENON 165,5; NILA x ZENON 150,4) |

Por isso o desenho abaixo solta o `jp` na luta e o **recarrega antes de o menu precisar dele** (§2.2). Decisão D-R1.

## 1. Opções de política (escolhida: B)

| | A. Regras espalhadas pelas cenas | **B. Tabela pura por cena + o Navegador aplica** | C. Contagem de referências por imagem |
|---|---|---|---|
| Como | cada cena chama `usar`/`liberar` no `enter`/`exit` | `arteDaCena(nome, args)` (pura) diz o que cada cena precisa; o `Navegador.set` aplica no gerenciador | cada desenho "segura" a imagem; sai com zero donos |
| Prós | mexe pouco por vez | **uma fonte de verdade**, testável sem navegador (mesmo padrão de `src/trailer/carga.ts`); a cena nova que esquecer a linha não compila (`switch` exaustivo em `NomeCena`) | exato |
| Contras | 16 cenas, regra duplicada; quem esquece o `exit` vaza (é o bug de hoje: `fixos`) | o Navegador passa a conhecer a arte (só pela tabela) | intrusivo em todo o render; custo por quadro; inviável no prazo |

**Recomendo B.** O gerenciador continua sem saber o que é cena (camada `assets`); a tabela vive em `src/ui/` (camada que conhece cenas).

## 2. Quem solta o quê, e quando

### 2.1 Vocabulário (contrato do `GerenciadorDeArte`)

- **Em uso**: o que a cena atual desenha. Nunca sai, nem acima do teto.
- **Preferido** (substitui "fixo"): vitrine `[hayato, wei-long, min-ji, caio]` e cenários `[jp, cn, kr, br]`, nessa ordem de prioridade.
  Fica enquanto couber no teto **fora da luta**; sai ao entrar na luta e em último caso na poda.
- **Teto fora da luta**: `TETO_FORA_DA_LUTA = 136 MiB` de atlas + cenários (retratos à parte). É o estado do título de hoje
  (102 + 31,6 = 133,6) com folga: o título não piora, e a sessão longa deixa de acumular (hoje vitrine + 3 não fixos + cenários passa de 250).
- **Luta exclusiva**: na VS e na luta, residente = **só** os 2 atlas, o cenário da luta e (na luta) até 2 FILME.

### 2.2 Tabela por momento

| Momento | Solta | Carrega | Gatilho (onde) |
|---|---|---|---|
| **Entrar na VS** (e na luta do treino, que pula a VS) | tudo fora de `{c1, c2, cenário}`: vitrine, `jp`, ciclo, recentes, FILME de outros (e as silhuetas deles, via `liberar` → `soltarPrefixo`) | a dupla e o cenário (`EsperaDeArte`), **depois** de soltar | `Navegador.set` → `arte.entrarNaLuta(pedido)` antes do `enter` da cena |
| **Luta começou** | nada | FILME de `c1`/`c2` (só com a flag) | já existe: `carregarFolhasDoFilme` |
| **Fim da luta** (1º tick com `phase === 'matchend'`, `matchWinner !== null` e `!filme.ativo`) | as FILME | `jp` em segundo plano (`preferir`) | `fight.ts` `update`, uma vez por luta |
| **Sair da luta** (`go` a partir da luta, qualquer destino) | as FILME (idempotente) | o essencial do destino, durante o fade | `Navegador.go` |
| **Resultado / continue / ending** | nada (a dupla fica: revanche e continue reaproveitam) | essencial: `jp` + dupla; desejável (result, ending): a vitrine, **só no que couber sem soltar a dupla** | tabela |
| **Título** | nada | essencial: vitrine + `jp`; desejável: `cn, kr, br` (o ciclo só troca de cenário aos ~6 s) | tabela |
| **Menu** | nada | essencial: `jp` + `VITRINE[0]` (o 1º que o menu mostra); desejável: o resto da vitrine na ordem do ciclo | tabela |
| **Seleção, como jogar, opções** | o que passar do teto (ordem do §2.4) | essencial: `jp`; o resto é o `pedir` de hoje (cursor) | tabela + `pedir` |
| **Treino** | igual à luta (entra direto pela seleção) | igual | tabela (`fight` é exclusiva) |
| **Trailer** | inalterado (a `CargaEscalonada` solta o que carregou) | essencial: vitrine + `jp, cn, kr, br` marcados **em uso** (o roteiro supõe que estão lá: `LUTADORES_FIXOS`/`CENARIOS_FIXOS`) | tabela; o orçamento do trailer é a T12, fora daqui |
| **Aba oculta** | tudo fora de uso + todas as silhuetas | nada; ao voltar, o Navegador reaplica a tabela da cena atual | `observarFoco(aoOcultar)` → `arte.aliviar()` |

Revanche (`result → fight`) e REINICIAR (`fight → fight`): a dupla está em uso, nada é baixado de novo; o `jp` sai outra vez (custa uma
decodificação de 7,9 MiB do cache HTTP por ida e volta: CPU, não memória).

### 2.3 Tabela pura (contrato)

```ts
// src/ui/residencia.ts (novo)
export interface ArteDaCena {
  readonly essencial: PedidoDeArte;   // em uso enquanto a cena está na tela; a troca de cena segura no preto até chegar (com teto)
  readonly desejavel?: PedidoDeArte;  // fila de fundo, um por vez, só o que cabe no teto sem soltar nada em uso
  readonly exclusiva?: true;          // VS e luta: solta tudo fora do essencial ao entrar
}
export function arteDaCena(nome: NomeCena, args: unknown, m: Pick<Mundo, 'elenco'>): ArteDaCena; // switch exaustivo (never)
```

| `NomeCena` | essencial | desejável | exclusiva |
|---|---|---|---|
| boot | — (o `iniciarArte` cuida; a T4 muda depois) | — | |
| intro, trailer | VITRINE + jp, cn, kr, br | — | |
| title | VITRINE + jp | cn, kr, br | |
| menu | VITRINE[0] + jp | VITRINE[1..] | |
| select, how, options | jp | — | |
| diff | c1 + jp | — | |
| chefe | — (só retrato) | — | |
| vs, fight | c1, c2 + `cfg.stage ?? elenco[c2].ch.stage` | — | sim |
| result, continue | `a.cfg.c1`, `a.cfg.c2` + jp | result: VITRINE | |
| ending | `run.c1` + jp | VITRINE | |
| desbloqueio | jp | VITRINE | |

### 2.4 Teto por peso e ordem de despejo

Peso de um atlas = `tamanho[0] x tamanho[1] x 4 x imagens.length` (sabido pelo manifesto **antes** de baixar); cenário = `BYTES_DE_CENARIO`
(1920 x 1080 x 4; um teste unitário trava que os 10 cenários têm esse tamanho). As cargas em voo contam como residentes.

`garantir`/`pedir`/`preferir` **abrem espaço antes de decodificar** (hoje a poda é depois: o pico é antigo + novo). Ordem, até caber:

1. atlas não preferidos, fora de uso, do menos recente ao mais recente;
2. cenários não preferidos, fora de uso, menos recente primeiro;
3. cenários preferidos fora de uso, do fim da lista para o começo (`br, kr, cn`; o `jp` por último);
4. atlas preferidos fora de uso, do fim para o começo (`caio, min-ji, wei-long, hayato`).

Nunca sai o que está em uso: se só o em uso já passa do teto (o trailer, a T12), o teto cede e o gerenciador não solta nada. `preferir`
**nunca** despeja preferidos nem em uso para caber: o que não couber fica de fora (a cena seguinte pede como essencial).

### 2.5 Contrato do `GerenciadorDeArte` (o que muda)

```ts
export const TETO_FORA_DA_LUTA = 136 * 1024 * 1024;
export const BYTES_DE_CENARIO = 1920 * 1080 * 4;
export type PoliticaDeResidencia = 'fixa' | 'por-peso';   // 'fixa' = o comportamento de hoje, byte a byte (A/B e rollback)

interface OpcoesGerenciador {               // fixos, cenariosFixos e limiteResidentes saem
  leitor; baseUrl; atlas; cenarios;
  readonly preferidos?: readonly string[];          // ordem = prioridade (o 1º é o último a sair)
  readonly cenariosPreferidos?: readonly string[];
  readonly teto?: number;                           // padrão TETO_FORA_DA_LUTA
  readonly politica?: PoliticaDeResidencia;         // padrão 'por-peso'; em 'fixa', preferido = fixo e limite de 3 por contagem
  readonly silhuetas?: CacheDeSilhuetas;            // o cache compartilhado (para memoria() e aliviar())
}

usar(p: PedidoDeArte): void;            // em uso = atlas E cenários do pedido (hoje só atlas)
entrarNaLuta(p: PedidoDeArte): void;    // em uso = p; solta JÁ tudo o mais (preferidos, cenários, FILME de quem não está em p);
                                        // avança a geração: carga em voo de fora de p que chegar depois é solta na chegada
preferir(p: PedidoDeArte): void;        // substitui a fila de fundo; serial; respeita §2.4; cancelada por entrarNaLuta
aliviar(): void;                        // aba oculta: solta tudo fora de uso e `silhuetas.soltarTudo()`
memoria(): MemoriaDeArte;               // bytes vivos (w x h x 4 das imagens que o gerenciador segura)
liberarLutador(id) / liberarCenario(id) // continuam respeitando em uso e preferidos (o `limparSobras` do trailer não muda de efeito)

interface MemoriaDeArte {
  readonly atlas: Readonly<Record<string, number>>;     // por lutador, contado por objeto (apelidos de fixture não duplicam)
  readonly filmes: Readonly<Record<string, number>>;
  readonly cenarios: Readonly<Record<string, number>>;
  readonly retratos: number;
  readonly silhuetas: number;                           // CacheDeSilhuetas.bytes (canvas, não imagem)
  readonly imagens: number;                             // atlas + filmes + cenários + retratos = "o analítico"
}
```

`main.ts` lê `?residencia=fixa` (também em produção: é a alavanca de A/B no iPhone da T13 e o rollback sem deploy) e passa a política.
`rec.cenarioPadrao` vira **getter** que lê `arte.cenarios.get(CENARIO_PADRAO)` e, na falta, devolve um canvas 1 x 1 da cor do fundo
dos menus, criado uma vez (contador `vezesSemFundo` para os testes). O tipo `CanvasImageSource` não muda: nenhuma chamada muda.

### 2.6 Contrato do `Navegador`

```ts
export const TETO_DO_PRETO = 45;   // ticks (0,75 s) que a troca de cena segura no preto esperando o essencial
get esperandoArte(): boolean;       // para os e2e esperarem em vez de contar ticks
```

- `go(nome, args)`: se a cena atual é a luta, `arte.soltarFilme()`. Se o destino não é exclusivo, `arte.garantir(essencial)` já começa,
  em paralelo com o fade (erro vira console; a troca segue).
- `update()`: com `fade === 1` e o essencial não pronto, segura até `TETO_DO_PRETO` ticks **sem** `t++`, sem `petalas.avancar` e sem
  `scene.update` (a cena velha congela no preto). Com a arte pronta, segura **zero** ticks: o tempo das trocas é o de hoje.
- `set(nome, args)` (também a chamada direta dos testes): aplica a tabela **antes** do `enter` (`entrarNaLuta` ou `usar`, depois
  `preferir(desejavel)`), inclusive em `fight → fight`.
- `EsperaDeArte` deixa de chamar `usar` (quem marca em uso é o `set`); continua com `garantir`, `pronta`, `progresso`, `falhou`.
- Com a política `'fixa'`, o Navegador **não** segura no preto nem chama `preferir`, e o `set` só repete o `usar(dupla)` de hoje na VS e
  na luta: o tempo de todas as trocas fica igual ao de hoje (é o que deixa as fatias L2 a L5 entrarem sem mexer nos e2e).

## 3. Volta ao menu sem piscar

"Piscar" aqui = (a) fundo sem o `jp`, (b) lutador que some e volta, (c) lutador que aparece de estalo. O custo aceito no OR-3 (0,3 a 0,8 s
até a vitrine reaparecer) continua, mas **suave**:

1. **Pré-recarga do `jp` no fim da luta** (§2.2): o resultado já nasce com fundo. Na mesma hora saem as FILME, então o pico não sobe
   (-17,8 + 7,9 no pior par comum) [calculado].
2. **Segurar no preto** (§2.6) até o essencial do destino chegar, com teto de 0,75 s. Do cache HTTP, o essencial de menu/seleção é o `jp`
   (já pronto pela pré-recarga) mais, no menu, 1 atlas: espera curta ou nula. No título são 4 atlas: pode bater no teto na 1ª volta.
3. **Fila de fundo serial** (um atlas decodificando por vez, como o trailer já faz): no resultado, a vitrine começa a voltar enquanto o
   jogador lê o placar. Ordem: a do menu (`VITRINE[0]` primeiro), depois a do título.
4. **Chegada suave**: helper `ChegadaDeArte` por cena. `alfa(id, t)` = 1 se a arte estava pronta quando a cena entrou; 0 enquanto não
   chegou; depois rampa linear de 12 ticks a partir do 1º tick em que ficou pronta. Usado em `fileiraDeHerois` (título), `mostrarLutador`
   (menu, seleção, resultado). Não usa RNG; com a arte pronta na entrada, o desenho é **idêntico** ao de hoje.
5. `leitorDeRede.imagem` passa a `await im.decode().catch(() => {})` depois do `onload`: a decodificação sai do quadro do 1º desenho
   (sem engasgo na chegada). Nada muda no pixel.
6. O ciclo de cenários do título já começa no `jp` e só cruza para `cn` aos 361 ticks [lido, `desenharCicloDeCenarios`, `per = 420`]: a fila
   tem 6 s para o 1º, 13 s para o 2º. O trailer só dispara com 30 s de título parado, com o ciclo já carregado.

## 4. FILME (MAX_FOLHAS_FILME = 2) e silhuetas (6 MiB)

- A FILME **não entra no teto fora da luta** (nunca existe fora dela); entra no analítico da luta. `entrarNaLuta` solta a FILME de quem não
  está no pedido; `carregarFilme` continua sendo a única porta de entrada, chamada depois de a luta começar.
- Soltura da FILME em três pontos, todos idempotentes: fim da luta com o filme parado (novo), `go` saindo da luta (novo), `exit()` (já existe,
  fica como rede de segurança). Nunca no meio de um filme: a condição `!filme.ativo` garante que um KO por especial termina de tocar.
- Ordem de pico na entrada: soltar (VS) → decodificar a dupla → luta → FILME. O pico da luta é o estado estável, não a soma.
- Silhuetas: o cache é global, por quadro, com teto de 6 MiB e já é limpo por atlas (`liberar` → `soltarPrefixo`). A purga da VS leva as
  silhuetas da vitrine junto (o título cria silhuetas do herói em destaque). `aliviar()` zera todas (teto de canvas do iOS). Página FILME
  continua sem silhueta (`silhuetaDe` devolve null para f0..f5).
- O trailer nunca carrega FILME (`motorV2: undefined`): vira asserção no e2e do trailer.

## 5. Fatias da Lyra

Regra de entrega: até a L6, o **padrão de produção continua `'fixa'`**; o desenho novo roda com `?residencia=peso`. Cada fatia é
mergeável sem mudar o que o jogador vê. Quem valida é a Íris (`quem-valida-o-que`); nada de `-u` em referência de fidelidade.

| # | Fatia | Arquivos | Unitários | e2e | Depende |
|---|---|---|---|---|---|
| **L1** (P) | **Medir primeiro**: `memoria()`, peso do atlas pelo manifesto, cache de silhuetas compartilhado passado ao gerenciador. Zero mudança de comportamento | `src/assets/gerenciador.ts`, `carregador.ts` (getter de bytes vivos por atlas), `elenco.ts` | `tests/unit/residencia-memoria.test.ts`: soma por categoria, apelido não duplica, FILME conta só pronta | `tests/e2e/memoria-por-luta.spec.ts` (celular): os 7 pares da Íris pela API pública; reproduz 135,3 e 206,7 (±0,1); só anota | — |
| **L2** (M) | **Gerenciador por peso**: `preferidos`, `teto`, `politica`, `usar(PedidoDeArte)`, despejo do §2.4 antes de decodificar, geração, `entrarNaLuta`, `preferir` (fila serial), `aliviar`. Padrão em `main.ts`: `'fixa'` | `gerenciador.ts`, `elenco.ts`, `main.ts` (só ler `?residencia=`) | reescrever `tests/unit/assets-demanda.test.ts` (fixos → preferidos); novo `residencia-gerenciador.test.ts`: ordem de despejo, nunca solta em uso, pico ≤ teto durante `garantir`, carga em voo após `entrarNaLuta` é solta na chegada, fila cancelada, `'fixa'` igual a hoje (mesma trilha do teste de poda atual), 10 cenários = 1920 x 1080 | `arte-sob-demanda.spec`: o teste de poda ganha a versão por peso (com `?residencia=peso`) e mantém a de contagem com `'fixa'` | L1 |
| **L3** (M) | **Luta exclusiva**: `arteDaCena` + `Navegador.set` aplica; `EsperaDeArte` sem `usar`; `rec.cenarioPadrao` getter com reserva; `soltarFilme` no `go` saindo da luta; tabela do trailer | `src/ui/residencia.ts` (novo), `navegador.ts`, `espera-de-arte.ts`, `main.ts`, `fight.ts` (nada além do `go`) | `residencia-tabela.test.ts`: todas as `NomeCena`, linhas do §2.3; navegador com gerenciador falso: `entrarNaLuta` antes do `enter`, também em `fight → fight` | `memoria-por-luta.spec` passa a **asserir** o §6 com `?residencia=peso`; teste de **acúmulo** (§6 C3); teste de **referência escondida** (§6 C5) | L2 |
| **L4** (M) | **Volta sem piscar**: segurar no preto (`TETO_DO_PRETO`, `esperandoArte`), pré-recarga do `jp` no fim da luta, desejáveis da tabela | `navegador.ts`, `residencia.ts`, `fight.ts` (um gancho no `update`, flag zerada no `enter`) | navegador: segura zero ticks com arte pronta, segura no máximo 45, `t`/pétalas congelados durante a espera; gancho do fim da luta dispara uma vez e não com `filme.ativo` | `residencia-volta.spec`: volta luta → resultado → menu e treino → TROCAR → seleção (§6 S1, S2, S4) | L3 |
| **L5** (P) | **Chegada suave** e `decode()` | `src/ui/chegada-de-arte.ts` (novo), `logo.ts` (`fileiraDeHerois`), `personagens.ts` (`mostrarLutador`), `cenas/menu.ts`, `cenas/select.ts`, `cenas/title.ts`, `carregador.ts` (`leitorDeRede`) | `chegada-de-arte.test.ts`: 1 com arte pronta na entrada, rampa de 12 ticks, monótona; `decode` rejeitado não derruba a carga | atlas da CAIO atrasado 2 s por rota: alfa monótono 0 → 1 em ≥ 10 ticks (§6 S3); fidelidade-ui/prototipo/desenharPose verdes **sem -u** | L3 (pode correr junto da L4: arquivos disjuntos, mas um escritor só) |
| **L6** (P) | **Aba oculta e virar a chave**: `aliviar` no `aoOcultar`, reaplicar a tabela ao voltar; padrão passa a `'por-peso'` | `main.ts`, `src/platform/foco.ts` (só o gancho), `navegador.ts` | `aliviar` solta fora de uso e zera silhuetas; volta reaplica | suíte inteira da Íris; §6 C4 (working set A/B); trailer verde | L4, L5 |
| L7 (opcional) | `createImageBitmap` + `close()` (ou `src = ''`) para soltar na hora no WebKit | `carregador.ts` | — | fidelidade sem -u | só se a T13 mostrar memória que não volta (D-R6) |

Paralelo fora da Lyra: **T10** (Vega, BAATAR e ZENON a 0,9, OR-4) é o que fecha o BAATAR x ZENON; não depende de nada daqui.

## 6. Critério de aceite (medível)

**Método.** Perfil Pixel 7 do Playwright, `?seed=7&manual=1&expansao=1&residencia=peso`, `motorV2.filmes` ligado, luta pelo gancho
(`ui.set('fight', ...)` + `SEM_PROVOCACAO`), espera `espera.pronta`, avança até `phase === 'fight'` + 60 ticks, espera
`filmesResidentes()` com os dois. Lê `arte.memoria()` (a API pública substitui o acesso a campos privados do `mem-luta.mjs`).
**Total da luta = `memoria().imagens` + 17,9 de base** (canvas principal 7,9 + teto de silhuetas 6 + caches de UI 4, constantes declaradas)
e `memoria().silhuetas ≤ 6 MiB` vivo.

**C1 — analítico por par** (limite = meta − 17,9; esperado = minha conta, ±0,5, para pegar residente sobrando):

| Par | Esperado (imagens) | Total | Limite do total |
|---|---|---|---|
| HAYATO x MIN-JI | 75,8 | 93,7 | ≤ 115 |
| NILA x CENTELLA | 91,3 | 109,2 | ≤ 115 |
| **NILA x AMINU** (pior comum) | 94,9 | 112,8 | ≤ 115 |
| CAIO x AMINU | 85,7 | 103,6 | ≤ 115 |
| HAYATO x HAYATO (no `jp`) | 42,9 | 60,8 | ≤ 115 |
| BAATAR x BAATAR | 71,1 | 89,0 | ≤ 150 |
| ZENON x ZENON | 78,2 | 96,1 | ≤ 150 |
| **NILA x ZENON** (pior pesado) | 124,6 | 142,5 | ≤ 150 |
| BAATAR x ZENON | 139,7 | 157,6 | ≤ 160 até a T10; ≤ 150 depois (esperado ~136,7) |

**C2 — VS**: na VS pronta, `memoria().imagens` = dupla + cenário + retratos (sem vitrine, sem `jp`, sem FILME).
**C3 — sem acúmulo**: título → menu → seleção → treino NILA x AMINU → pausa → TROCAR → seleção → treino HAYATO x HAYATO, pela UI (sem a flag
de filme, que a seleção não liga): a 2ª luta mede o mesmo que isolada (33,6 ± 0,5: atlas 24 + `jp` 7,9 + retratos 1,65), e durante as
duas os atlas vivos ⊆ `{c1, c2}`.
**C4 — working set A/B** (prova que a memória volta, não só a referência): NILA x CENTELLA, `?residencia=fixa` x `peso`, 4 amostras
alternadas, cada imagem viva desenhada 1 x 1 antes (o Chromium só decodifica no 1º desenho: sem isso o braço `fixa` some), GC pelo CDP,
renderer + GPU pelo PowerShell (o método de `memoria-filme.spec.ts`). Asserção: **mediana(WS fixa) − mediana(WS peso) ≥ 0,6 x a diferença
analítica** (esperada ~115 MiB). WS absoluto e CPU da máquina só anotados.
**C5 — sem referência escondida**: `WeakRef` de uma página da CAIO e da imagem do `cn` antes da luta; NILA x CENTELLA; GC pelo CDP; os dois
`deref()` são `undefined`. Pega cópia guardada em `rec`, no aquecimento do trailer ou em qualquer cache.
**S1–S4 — volta sem piscar**: (S1) no 1º tick com `fadeDir === -1` depois de luta → resultado → menu, o essencial está pronto;
(S2) nenhuma espera no preto passa de 45 ticks, e luta → resultado espera 0; (S3) chegada atrasada sem salto (L5);
(S4) `vezesSemFundo === 0` em toda a volta.
**Invariantes**: §7 R1 e R2.

Este critério fecha a meta 6a **em laboratório**. O portão real é o aparelho (OR-9, T13): o roteiro da Íris roda C1 e C4 no iPhone com
`?residencia=fixa` x `peso`.

## 7. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **Determinismo do motor** | Baixa | Alto | Nenhuma fatia toca `src/core`, `src/fight`, `src/meta`, `src/data/lutadores` (conferir `git diff --stat` por fatia). A espera no preto congela `t`, pétalas e `scene.update`, e é de zero ticks com a arte pronta. No fim: `npm run balanco -- --completo --esquiva --saida <scratchpad>` (nunca em `docs/balanco`) e hash dos regulares `f420ce928e06b304` igual |
| R2 | **Fidelidade sem -u** | Média | Alto | Chegada suave = 1 com a arte pronta na entrada; espera = 0 com a arte pronta; `decode()` não muda pixel. As specs `fidelidade-*` e `silhueta-no-jogo` rodam sem atualizar referência: precisou de `-u`, a fatia está reprovada |
| R3 | **Safari/iOS** devolve memória só na coleta de lixo | Alta | Alto | Soltar referência + zerar canvas (já feito nas silhuetas); C5 prova que não sobra referência; C4 no aparelho (T13) prova que volta; L7 se não voltar. `decode()` pode rejeitar em imagem grande: `catch`. Sem `requestIdleCallback` no Safari: a fila usa o `agendadorOcioso` do trailer (com reserva) [não verificado hoje] |
| R4 | Pico ao recarregar a vitrine no celular | Média | Médio | Fila serial (1 atlas por vez), despejo antes de decodificar, teto 136 |
| R5 | Carga em voo "ressuscita" na luta | Média | Alto | Geração no `entrarNaLuta`; teste unitário dedicado (L2) e C3 |
| R6 | 12 e2e passam da luta aos menus (`arte-f3b`, `chefoes-l1e1`, `cinematica`, `combos-tela`, `filme-jogo`, `jogo`, `novos-lutadores`, `provocacao`, `provocacao-p4`, `selecao-aleatoria`, `tipografia`, `zenon-z2z3`) e podem contar ticks esperando a vitrine | Alta | Médio | Até a L6 o padrão é `'fixa'` (nada muda para eles); na L6 a Íris audita e troca contagem de ticks por `esperandoArte === false` |
| R7 | O trailer supõe a vitrine e os 4 cenários na memória | Média | Médio | Linha da tabela marca tudo em uso; título → trailer segura no preto até chegar; trailer.spec na L6 |
| R8 | Ida e volta do `jp` a cada luta (revanche, arcade) | Certa | Baixo | É CPU (decodificação do cache HTTP), não memória; com o SW (T7) nem rede |
| R9 | A meta 6c (≤ 150 MiB fora da luta) **não fecha** com esta spec: o título continua 133,6 de arte + logo, canvas e retratos (a Íris mediu 152 no boot) | Certa | Médio | D-R3: ciclo rolante de cenários no título (-15,8) ou marca menor, depois de medir logo/splash |

**Dívidas conscientes:** o caminho `'fixa'` fica no código até a T13 (depois sai); o orçamento do trailer continua o de hoje (T12);
a base de 17,9 MiB tem 4 MiB estimados (caches de UI), não inventariados.

## 8. Decisões para o dono

**Todas decididas em 2026-10-23: o dono aprovou D-R1..D-R6 como a Nova recomendou.**

| # | Pergunta | Recomendação | Decisão (2026-10-23) |
|---|---|---|---|
| D-R1 | O `jp` sai da luta (e volta com pré-recarga) ou fica sempre (9 pares comuns passam de 115, até 120,7)? | **Sai** | **DECIDIDA: sai** da luta e volta com pré-recarga no fim dela (L4) |
| D-R2 | Quanto a troca de cena pode segurar no preto esperando a arte (passado isso, entra com chegada suave)? | **0,75 s** (45 ticks) | **DECIDIDA: 0,75 s** (`TETO_DO_PRETO` = 45 ticks) |
| D-R3 | Meta 6c fora da luta: aceitar ~150-160 no título por ora, ou abrir uma fatia de ciclo rolante? | Aceitar e medir na T13 antes | **DECIDIDA: aceitar** ~150-160 no título por ora; medir na T13 antes de abrir fatia nova |
| D-R4 | BAATAR x ZENON até a T10: exceção de 160? | Sim (já era a alternativa do OR-4) | **DECIDIDA: sim**, exceção de 160 MiB até a T10 (depois ≤ 150) |
| D-R5 | `?residencia=fixa` também em produção (A/B no iPhone e rollback)? | Sim | **DECIDIDA: sim**, a alavanca vale também em produção |
| D-R6 | L7 (`ImageBitmap`/`close`) só se a T13 mostrar memória que não volta? | Sim | **DECIDIDA: sim**, L7 só se a T13 pedir |
