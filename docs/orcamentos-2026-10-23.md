# Orçamentos revisados — InnoFighters (R-8)

Autora: Nova (arquitetura), 2026-10-23. Base: HEAD `f5b5fab` + árvore de trabalho (CAIO novo integrado, não commitado).
Fontes: `PLANO.md` §6 e F4, `docs/saude-da-suite-2026-10-23.md` (medições da Íris), `docs/revisao-completa-2026-10-23.md`
(itens 10, 11, 15, 18 e R-8), `docs/roteiros-filme-especiais.md` §6, `docs/handoff-lyra-e7a.md`, `docs/plano-arte-lacunas-2026-10-23.md` §3.
O dono aprovou que eu proponha números novos (R-8). **Ele decide**: nada aqui vale até a resposta às decisões OR-1 a OR-9 (§4).
Este documento não muda código.

## 0. Como ler

- **Unidades.** "MiB" = 2^20 bytes. A Íris escreveu "MB" para os pesos de atlas e esses números batem com MiB
  (CAMILLE: 899 232 bytes = 0,86 MiB). Daqui em diante tudo é MiB, exceto o JS, em kB gzip (1000 bytes), como o Vite mostra.
- **Memória decodificada** = largura x altura x 4 da imagem. É um piso: com canvas acelerado o navegador pode manter também
  uma cópia na GPU [inferido], e o working set real é maior (336 a 442 MB no Chromium headless, medido pela Íris).
- **Nível de prova** em cada número: **[medido]** = medi hoje com `sharp`/`gzip` sobre `public/` e `dist/`, ou a Íris mediu;
  **[calculado]** = conta a partir de números medidos; **[estimado]** = suposição minha, declarada; **[não verificado]** = fato
  público que não consegui reconferir hoje (a busca na web falhou nesta sessão).

### 0.1 O que medi hoje (complementa a Íris)

| Lutador | Páginas | px por página | Decodificado | Peso (WebP) | Ocupação da página |
|---|---|---|---|---|---|
| CAMILLE | 2 | 2048 x 1472 | 23,0 MiB | 0,86 MiB | 78% |
| HAYATO | 2 | 2048 x 1536 | 24,0 MiB | 1,23 MiB | 82% |
| MIN-JI | 2 | 2048 x 1536 | 24,0 MiB | 1,19 MiB | 79% |
| **CAIO (novo)** | 2 | 2048 x 1600 | **25,0 MiB** | **1,04 MiB** | 78% |
| CENTELLA | 2 | 2048 x 1664 | 26,0 MiB | 1,23 MiB | 82% |
| AMINU | 2 | 2048 x 1920 | 30,0 MiB | 1,06 MiB | 80% |
| WEI LONG (v1) | 1 | **3600 x 2296** | 31,5 MiB | 1,24 MiB | 72% |
| NILA | 3 | 2048 x 1600 | 37,5 MiB | 1,45 MiB | 77% |
| BAATAR | 4 | 2048 x 1664 | **52,0 MiB** | **1,96 MiB** | 80% |
| ZENON | 4 | 2048 x 1920 | **60,0 MiB** | 1,71 MiB | 80% |

Todos [medido]. Duas conclusões que mudam a conversa:

1. **O empacotamento já está bom (72 a 82%)**. Reempacotar não salva memória: só reduzir resolução ou número de quadros salva.
2. **Os atlas já são desenhados ampliados.** Na tela de 1920 x 1080 (canvas real, `RS = 2`), o idle mede `2 x 255 x scale` px;
   o atlas guarda 410 px (HAYATO: ampliação de 1,24x), 525 (BAATAR, 1,24x), 558 (ZENON, 1,21x) [calculado de
   `SH_IDLE`, `scale` e `alturaRef`]. Por isso "atlas em meia resolução" (o plano B antigo da F4) fica borrado demais. O corte
   viável é pequeno: 0,9 da escala linear nos dois pesados (OR-4).

Cenários: os 7 WebP têm 1920 x 1080 e 138 a 234 KiB; `cn`, `kr`, `br` são JPG 1600 x 900 (224, 305 e 278 KiB) [medido].
**Converter para 1920 x 1080 aumenta a memória**: 5,5 → 7,9 MiB decodificados por cenário [calculado]. O ganho é de peso e
de nitidez, não de memória.

## 1. Tabela de orçamentos

| # | Item | Meta ANTIGA (§6) | Medido hoje | Meta NOVA proposta | Justificativa |
|---|---|---|---|---|---|
| 1a | JS inicial (gzip) | ≤ 150 kB (um número só) | 119,9 kB na rede do Pages [medido, Íris] | **≤ 135 kB** | A revisão do motor v2 (filme nos 33, rotas de combo, flags) cai no pedaço `index`: estimo +8 a +15 kB [estimado]. 135 deixa a folga e força dividir menus/opções se passar |
| 1b | JS total (todos os pedaços que o jogador pode baixar) | ≤ 150 kB | 175,5 kB (173,6 kB com `gzip -9`, sem `escuta`: 168,6) [medido] | **≤ 200 kB**, sem contar `escuta` (só `?escuta=1`) | Como recomendei no R-8. O excesso vem do áudio e do trailer, que já são pedaços sob demanda: não atrasam o título |
| 1c | JS carregado até a 1ª luta | (não existia) | 168 KiB [medido, Íris] | **≤ 185 kB** | Inclui o trailer (22,9 kB) quando o modo atrair toca |
| 2a | Atlas por lutador, peso | ≤ 1,2 MiB | 3 de 10 passam (§0.1) | **≤ 1,6 MiB**; pesados (BAATAR, ZENON) **≤ 2,0 MiB** por exceção nominal | O R-8. 1,2 só cabia com 2 páginas pequenas; NILA (3 páginas, 60 quadros) já precisa de 1,45 |
| 2b | Atlas por lutador, px | ≤ 2048 x 2048 | CAIO novo passa; WEI LONG v1 3600 x 2296 falha [medido] | **página ≤ 2048 x 2048** (mantida) **e ≤ 40 MiB decodificados por lutador**; pesados ≤ 64 MiB (ou ≤ 50 com OR-4) | A memória é o limite real, não o peso. 40 MiB cobre os 8 comuns (máx. NILA 37,5). Página ≤ 2048 vale para o iOS e para GPUs fracas |
| 2c | Folha FILME (nova) | – | não existe ainda | **1 página ≤ 2048 x 1280 (10 MiB), ≤ 0,8 MiB WebP**; plano B 1536 x 960 (5,6 MiB) | `roteiros-filme-especiais.md` §6. O peso por página é estimativa pelas páginas de atlas de hoje |
| 3 | Cenário | ≤ 250 KB, 1920 x 1080 | 7 de 10 passam; cn/kr/br falham [medido] | **mantida**: ≤ 250 KiB, 1920 x 1080 | Os 3 novos curados pelo Apolo cumprem (cn 192, kr 235, br 202 KiB). Não há por que afrouxar |
| 4 | Até o título | ≤ 1,5 MB | **7,77 MB** até `data-pronto` [medido, Íris] | **≤ 1,5 MiB BLOQUEANTE até `data-pronto`** (o que o jogador espera para ver o título); o resto vira carga em segundo plano, medida à parte (≤ 6,5 MiB até a vitrine pronta) | A meta antiga continua certa para o que o jogador sente; o que estava errado era a arquitetura do boot (traz tudo). Estimo ~0,9 MiB com o boot em etapas (§2.1) [calculado sobre pesos medidos] |
| 5 | Até a 1ª luta | ≤ 4 MB | **10,40 MB** [medido, Íris] | **(a) espera bloqueante na tela VS ≤ 2,8 MiB** para um par comum não pré-buscado (≤ 4,1 MiB para BAATAR x ZENON); **(b) total na 1ª visita ≤ 9 MiB, só informativo; (c) 2ª visita ≤ 0,1 MiB** com o service worker | 4 MB no total não fecha com a vitrine animada de 4 atlas completos (4,7 MiB só ela) mais a folha FILME (~1,4 MiB por luta). O que importa ao jogador é a espera; a 2ª visita é o que o SW compra (§4) |
| 6a | Memória de imagem em luta | ≤ 120 MB | **224 MB** estimados, sem contar as silhuetas (até +54 MiB) [medido/estimado, Íris] | **luta comum ≤ 115 MiB; luta com um pesado (inclui todo chefão) ≤ 150 MiB**; BAATAR x ZENON ≤ 150 só com OR-4, senão exceção de 160 | O R-8: 120 a 150 como meta dura. A conta está no §3 |
| 6b | Memória de CANVAS (nova) | – | até ~260 MiB numa sessão longa [estimado, §3.2] | **≤ 24 MiB em luta; ≤ 48 MiB no trailer** | O iOS limita a memória TOTAL de canvas, não a de `<img>`: é o que derruba o iPhone |
| 6c | Memória fora da luta (menus, trailer) | – | 152 MB no boot [medido, Íris]; trailer até ~280 MiB [estimado] | **≤ 150 MiB** | O trailer não pode passar do pico da luta (spec do trailer, H2) |
| 7a | Quadro, proxy de laboratório | 60 fps estáveis | custo update+draw p95: 2,6 a 3,3 ms em 1x; em 4x, 14,7 a 21 ms (22/10, máquina livre) e 30 a 95 ms (23/10, máquina dividida) [medido] | **custo p95 ≤ 12 ms e ≤ 1% dos quadros acima de 33 ms**, perfil celular do Playwright, CPU 4x, canvas acelerado, máquina **sem carga alheia**, mediana de 3 rodadas, pares `hayato:min-ji` e `zenon:baatar` | 16,7 ms menos ~4,7 ms de folga para compositor e coleta de lixo. É meta: hoje nem o melhor caso passa (14,7) |
| 7b | Quadro, aparelho real | (o portão F4) | **nunca medido** | **intervalo p95 ≤ 17,5 ms e ≤ 1% acima de 33 ms** numa luta de 60 s com especial e filme, no iPhone do dono (Chrome) e num Android médio | O único número que fecha o portão F4. O 7a só serve para pegar regressão |

### 1.1 Itens que proponho não mudar

Cenário (3) e página de atlas ≤ 2048 (2b). Os dois já são cumpridos pela arte nova; afrouxar só esconderia o legado.

## 2. Pré-carga, residência e descarte

### 2.1 Hoje [lido em `src/assets/elenco.ts`, `gerenciador.ts`, `main.ts`]

O boot lê os 10 manifestos, baixa os 10 retratos e carrega os atlas da **VITRINE** (HAYATO, WEI LONG, MIN-JI, CAIO) e os cenários
dela (jp, cn, kr, br) como **fixos: nunca soltos**. O resto já é sob demanda (`GerenciadorDeArte`, LRU de 3 atlas não fixos,
por contagem). Cenários nunca são soltos. A silhueta branca do flash é criada **por página** e só sai quando o atlas sai,
ou seja, a dos 4 da vitrine nunca sai. Resultado medido: 7,77 MB antes do título e 152 MB de imagem antes de jogar.

### 2.2 Proposta: boot em 4 etapas

| Etapa | Quando | O quê | Peso [calculado] |
|---|---|---|---|
| **0, bloqueante** | até `data-pronto` | HTML/CSS, JS inicial (120 kB), fontes (≤ 88 KiB), 10 `atlas.json` (~15 KiB gzip [estimado]), logo, splash, cenário padrão `jp` (226 KiB), ícones | **~0,8 a 0,9 MiB** |
| **1, logo depois** | começa no `data-pronto`, sem bloquear | atlas da vitrine, **um por vez** (o do menu primeiro), cenários do ciclo do título (cn, kr, br em WebP, 629 KiB), retratos (0,56 MiB em PNG; ~0,3 em WebP [estimado]) | ~6 MiB |
| **2, ocioso** | após o 1º gesto, em `requestIdleCallback` | `base.mp3` (272 KiB) e sons dos 2 lutadores da 1ª escolha, pedaço do trailer (se ligado) | ~0,5 MiB |
| **3, sob demanda** | seleção (hover), VS, luta | atlas e cenário da luta (bloqueia a VS); **folha FILME só depois que a luta começa** (não bloqueia: a página que não chegou toca o `Alt`, como o roteiro já prevê); `prebuscar` do próximo rival (só rede, sem decodificar) | par comum 2,2 a 2,8 MiB |

Regra: **só a etapa 0 bloqueia** o título e **só atlas + cenário bloqueiam** a VS. A abertura (intro, 4 painéis) pede a vitrine;
se o gesto vier antes de ela chegar, os painéis entram quando a arte chega (o desenho já pula quem não está pronto) ou a intro
espera com barra. Essa é a escolha de produto do OR-2.

### 2.3 Residência máxima

| Momento | Atlas residentes | Cenários | Outras imagens | Teto |
|---|---|---|---|---|
| **Luta** | **só os 2 da luta** (1 no espelho) | **só o da luta** | 2 páginas FILME, retratos, cache de silhuetas por quadro (≤ 6 MiB) | 6a/6b |
| Menus e seleção | vitrine + recentes, **por peso** | padrão + os do ciclo + 1 recente | logo, splash, retratos | ≤ 150 MiB |
| Trailer | vitrine + no máximo 2 não fixos (regra atual), mas BAATAR e ZENON nunca com a vitrine inteira | idem | 3 canvas de 1920 x 1080 do trailer | ≤ 150 MiB |

**"Fixo" deixa de existir; vira "preferido"**: a vitrine fica enquanto há orçamento fora da luta, mas sai ao entrar na luta se não
estiver em uso. O limite de residentes passa de **contagem** (3) para **peso** (MiB decodificados), a proposta 2 do E7a: hoje o
BAATAR (52 MiB) conta como "1".

### 2.4 Descarte

1. **Ao começar a luta** (depois do `garantir` da VS): soltar tudo o que não está em uso, vitrine e cenários incluídos.
2. **Ao terminar a luta**: soltar as 2 páginas FILME na hora. Os atlas ficam até a próxima cena pedir outra coisa (revanche e
   continue reaproveitam).
3. **Ao soltar um atlas**: zerar os canvas de silhueta (`width = height = 0`) antes de largar a referência. No WebKit a memória de
   canvas só volta com a coleta de lixo, e zerar o tamanho devolve na hora [não verificado; prática conhecida].
4. **Ao esconder a aba** (`visibilitychange` → hidden): soltar tudo o que não está em uso. O iOS mata primeiro a aba pesada em
   segundo plano [inferido].
5. **Silhueta por quadro**, não por página: canvas do tamanho do quadro (≤ 0,9 MiB cada), cache LRU de ~8 entradas, como a F3
   previa e nunca foi feito.
6. Opcional (Lyra decide): `createImageBitmap` + `close()` para soltar a memória na hora, em vez de depender da coleta.

## 3. Memória por luta com a folha FILME

### 3.1 Conta (MiB decodificados) [calculado sobre dimensões medidas]

Base fixa de toda luta, já no desenho novo: cenário 7,9 + canvas principal 1920 x 1080 7,9 + silhuetas por quadro ≤ 6 + retratos 1,6
+ caches de UI (tarja, esquiva tingida) ≤ 4 [estimado] = **27,4 MiB**. FILME 2048 x 1280 = 10 MiB por página; plano B 1536 x 960 =
5,6 MiB.

| Luta | Atlas | Total com FILME 2048 x 1280 | Total com FILME 1536 x 960 | Meta |
|---|---|---|---|---|
| HAYATO x MIN-JI | 48,0 | **95,4** | 86,7 | ≤ 115 ✅ |
| CAIO x WEI LONG v1 | 56,5 | **104,0** | 95,2 | ≤ 115 ✅ |
| NILA x CENTELLA (o maior par comum) | 63,5 | **110,9** | 102,2 | ≤ 115 ✅ |
| ZENON x ZENON (espelho, 1 FILME) | 60,0 | **97,4** | 93,0 | ≤ 150 ✅ |
| HAYATO x ZENON (chefão) | 84,0 | **131,4** | 122,7 | ≤ 150 ✅ |
| NILA x ZENON (o pior chefão) | 97,5 | **144,9** | 136,2 | ≤ 150 ✅ |
| **BAATAR x ZENON** | 112,0 | **159,4** ❌ | 150,7 ❌ (por 0,7) | ≤ 150 |
| BAATAR x ZENON com OR-4 (pesados a 0,9) | 91,1 | **138,5** ✅ | 129,8 ✅ | ≤ 150 |

Para comparar, **hoje** [calculado]:
- HAYATO x MIN-JI (os dois da vitrine): vitrine inteira 104,5 + 4 cenários 24,4 + logo e splash ~9 a 16 + retratos 1,6 =
  ~140 a 147 MiB de imagem, mais canvas principal e silhuetas por página (até ~56 MiB): **~200 MiB, ~220 com a FILME**
  (contra 95,4 no desenho novo).
- AMINU x CENTELLA (fora da vitrine): +56 de atlas e +7,9 de cenário, e as silhuetas deles: **~270 MiB, ~290 com a FILME**
  (contra 103,4 no desenho novo).

A FILME custa 20 MiB por luta; **o desenho de residência (§2.3) libera ~125 a 185 MiB**. A FILME só é segura **depois** dele.

### 3.2 iPhone: o limite de canvas

O WebKit do iOS (o Chrome do iPhone do dono também usa WebKit) tem dois tetos para canvas [não verificado hoje; valores públicos
conhecidos]: **área máxima por canvas de 16 777 216 px (4096 x 4096)** e **memória total de canvas** por página (a mensagem
"Total canvas memory use exceeds the maximum limit" cita valores como 224 ou 384 MB, conforme aparelho e versão). Quando passa,
`getContext('2d')` devolve `null`. `<img>` decodificado **não** conta nesse teto; conta só no limite do processo, que a Apple não
documenta: só o aparelho responde.

| Canvas | Hoje | Proposto |
|---|---|---|
| Principal 1920 x 1080 | 7,9 | 7,9 |
| Silhuetas | 1 por página tocada, **nunca soltas na vitrine**: até 104,5 MiB da vitrine + até 150 dos 3 não fixos ≈ **260 MiB numa sessão longa** [estimado] | por quadro, ≤ 6 MiB |
| Trailer (contraluz, retratos, títulos) | 3 x 7,9 = 23,7, só no trailer | igual |
| Tarja, esquiva tingida, logo pré-desenhado | pequenos [estimado ≤ 4] | igual |
| **Total** | **até ~260 em luta** | **≤ 24 em luta, ≤ 48 no trailer** |

**Achado de risco:** `criarSilhuetaBranca` (`src/assets/canvas.ts`) **lança erro** quando `getContext` devolve `null`. No iPhone, passar
do teto de canvas no meio da luta vira exceção no desenho do flash de dano, não flash ausente [lido; o efeito no aparelho não foi
provado]. A tarefa T2 trata isso: sem contexto, pula o flash.

**FILME e o teto do iOS:** a página 2048 x 1280 (2,6 MP) cabe com folga na área por canvas, e como `<img>` não conta no teto total.
Regra para a Lyra: **desenhar a FILME direto da imagem no canvas principal, com recorte (`clip`)**; nada de copiá-la para um canvas
intermediário do tamanho da página, nem de criar silhueta dela. Se o filme precisar de flash, um canvas do tamanho da célula
(560 x 620 = 1,3 MiB).

**Plano B 1536 x 960:** poupa 8,75 MiB por luta (20 → 11,25). Com o desenho novo, só é necessário para BAATAR x ZENON sem OR-4,
e mesmo assim não chega a 150 (fica em 150,7). Recomendo **2048 x 1280 + OR-4**, e o plano B só se a medição no iPhone (critério 4
do piloto FILME) mostrar pressão real.

## 4. Quanto custa cada corte e o que cada decisão compra

| # | Decisão do dono | Compra | Custa | Recomendação |
|---|---|---|---|---|
| **OR-1** | Aceitar os orçamentos novos da §1 por escrito | Fecha o R-8; vira portão de CI (T8) | Nada; afrouxa JS (+50 kB) e atlas (+0,4 MiB) | **Sim** |
| **OR-2** | O que a abertura faz se o jogador tocar antes da vitrine chegar: (a) painéis entram quando a arte chega; (b) intro espera com barra; (c) intro só com retratos | Título em ~1 s no 4G [estimado]; 7,77 → ~0,9 MiB bloqueante | (a) painel vazio por instantes na 1ª visita; (b) espera de 2 a 5 s no 4G na 1ª visita [estimado]; (c) abertura mais pobre | **(a)**; na 2ª visita o SW elimina a diferença |
| **OR-3** | Vitrine solta na luta (deixa de ser fixa) | **-73 a -105 MiB** em toda luta (depende de quantos da vitrine estão na luta) | Ao voltar ao menu, 0,3 a 0,8 s até os 4 reaparecerem [estimado: decodificação no celular, sem rede com o SW] | **Sim**: é o corte que paga a FILME |
| **OR-4** | BAATAR e ZENON a 0,9 da escala linear | -21 MiB no pior par; -0,4 MiB de download [estimado] | Ampliação na tela vai de 1,21-1,24x para 1,35-1,38x: um pouco mais macios, mais visível no zoom do filme. Vega refaz 2 atlas; a Íris confere se `hashRegulares` mudou (as pontas são normalizadas por `alturaRef`, mas arredondamento pode mexer) | **Sim**, se o dono quiser o BAATAR x ZENON dentro de 150; senão, exceção de 160 só para esse par |
| **OR-5** | FILME 2048 x 1280 ou 1536 x 960 | 1536: -8,75 MiB por luta, ~-0,6 MiB de download por luta [estimado] | Close ~1,35x ampliado em vez de ≤ 1,1x | **2048**, plano B só pela medição |
| **OR-6** | WEI LONG v2: arte nova (Runway, 30 a 48 créditos, plano do Apolo) ou plano B (folhas D4/v4 pelo pipeline, 0 crédito) | Cumpre página ≤ 2048, -6 a -7 MiB [estimado, comparando com CAIO novo], tira o custo de CPU da seleção, conserta TIE SHAN KAO | Créditos e uma sessão de curadoria; o plano B mantém a mistura de estilo | Arte nova (como o Apolo); é dívida de estilo antes de ser de memória |
| **OR-7** | Service worker com cache só do que foi usado, ou também baixar o elenco inteiro em segundo plano (só Wi-Fi, sem economia de dados) | Usado: 2ª visita ~0 de rede. Elenco inteiro: offline completo após a 1ª sessão | Elenco inteiro: ~26 MiB no armazenamento do aparelho [calculado: assets de `public/` 18,2 MiB + 10 FILME ~7]; a cota do iOS para Cache API é desconhecida aqui [não verificado] | **Só o usado** no início; elenco inteiro depois de medir a cota no iPhone |
| **OR-8** | Retratos em WebP (E1b, nunca feito) | -0,25 MiB na etapa 1 [estimado] | Um passo a mais no pipeline | Sim (P) |
| **OR-9** | Medição em aparelho real como portão de entrega | O único jeito de fechar 6a, 6b e 7b | Tempo do dono com o iPhone (~30 min, roteiro da Íris) | **Sim**: sem isso, todo número de memória acima é conta |

Sem OR-3, nenhuma meta de memória fecha, com ou sem FILME. Sem OR-2, a meta 4 não fecha.

## 5. Tarefas, em ordem

| # | Tarefa | Dono | Tam. | Depende de | Aceite (quem valida: Íris) | Status |
|---|---|---|---|---|---|---|
| T1 | Cenários `cn`, `kr`, `br` em WebP 1920 x 1080 (curados: cn q80 192, kr q70 235, br q70 202 KiB); `arquivo` em `src/data/cenarios.ts`; apagar os JPG; conferir o oráculo de fidelidade | Vega | P | nada | 10 de 10 cenários na meta 3 | feita (9dce4da) |
| T2 | Silhueta **por quadro** com cache LRU (≤ 6 MiB); sem contexto 2D, pula o flash em vez de lançar; zerar canvas ao soltar | Lyra | M | nada | teste com `getContext` nulo; canvas em luta ≤ 24 MiB (6b) | — |
| T3 | `GerenciadorDeArte` por **peso**: "fixo" vira "preferido", poda de cenários, soltar o que não está em uso ao começar a luta e ao esconder a aba; FILME com ciclo de vida da luta | Lyra | M | T2 | 6a nos pares do §3.1 pela conta w·h·4 da Íris; reescrever `arte-sob-demanda.spec` | — |
| T4 | Boot em 4 etapas (§2.2), `data-pronto` só depois da etapa 0, intro conforme OR-2 | Lyra | M | T3, OR-2 | meta 4 ≤ 1,5 MiB bloqueante pelo método da Íris | feita (c058ac9) |
| T5 | `base.mp3` e sons por lutador fora do boot (etapa 2 e VS) | Vega | P | nada | nenhum som some no 1º golpe (o fallback sintetizado já existe) | feita (d48cf1e) |
| T6 | Retratos em WebP | Vega | P | OR-8 | peso dos 10 retratos ≤ 0,35 MiB | feita (d48cf1e) |
| T7 | **Service worker (PLANO F4)**: shell no install; `/assets/` em cache-first com revisão por hash de conteúdo (os arquivos de `public/` não têm hash no nome); `index.html` e `version.json` em network-first; nada no dev; troca de versão só fora da luta; `worker-src 'self'` na CSP; base do Pages (`/InnoFighters/`) e do EasyPanel (`/`) | Vulcano | M | T4 (as etapas definem o que vai no install) | e2e:build: 2ª visita offline abre e luta; meta 5c ≤ 0,1 MiB | feita (d48cf1e) |
| T8 | Portão de orçamento na CI (`npm run orcamento`): gzip por pedaço de JS, peso e px por atlas, cenário e FILME, falha se passar | Vulcano | P | OR-1 | CI vermelha com um atlas de 3600 px de propósito | — |
| T9 | WEI LONG v2 pelo pipeline (páginas ≤ 2048) | Vega (+ Apolo na arte) | M | OR-6 e a arte | 2a e 2b para os 10 | feita (relatado pelo Atlas) |
| T10 | BAATAR e ZENON a 0,9 da escala | Vega | M | OR-4 | 6a no BAATAR x ZENON; balanço rodado de novo | feita (d48cf1e, 9dce4da) |
| T11 | Formato da folha FILME no pipeline (≤ 2048 x 1280, ≤ 0,8 MiB) e desenho direto da imagem, sem canvas intermediário (§3.2) | Vega (pipeline) + Lyra (desenho) | P | piloto HAYATO | critério 4 do piloto: +10 MiB na luta HAYATO x HAYATO | — |
| T12 | Trailer refeito no orçamento de 150 MiB (§2.3) | Lyra | P | T3 | memória do trailer ≤ 150 MiB pela ferramenta `ferramentas/trailer` | feita (c058ac9) |
| T13 | Medição em aparelho real: iPhone do dono (Chrome) e um Android médio, roteiro com memória, quadro, FILME e trailer | Íris (roteiro) + dono | P | T2, T3, T7 | 6a, 6b e 7b medidos e registrados | pendente (dono, aparelho) |

Coluna Status atualizada em 2026-10-24 (alvo `c058ac9`). `—` = sem status registrado nesta passada. A análise de cada tarefa não foi reescrita.

Números de T4 e T12 (relatados pela coordenação; a confirmar com a medição): T4, etapa 0 até `data-pronto` com 0,913 MiB e 28 pedidos (meta de 1,5 MiB; gate `tests/e2e-build/boot-peso.spec.ts`). T12, pico do trailer de 145,3 MiB (P6 + P7), margem de 4,7 MiB contra 150 MiB (`npm run trailer:medir -- --modo memoria`).

**Caminho crítico:** T2 → T3 → T4 → T7 → T13. T1, T5, T6 e T8 rodam em paralelo desde já. T9 e T10 esperam decisão.
Contrato entre Lyra e Vulcano para T4/T7: a lista do que a etapa 0 baixa sai de **um** módulo (o mesmo que o boot usa), e o
build a exporta para o SW pré-carregar. Assim boot e SW não divergem.

## 6. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| O1 | Os números de memória são contas (w·h·4); o aparelho pode ter cópia na GPU e piso do navegador | Certa | Alto | T13; as metas são de imagem, o portão real é o aparelho |
| O2 | Exceção de canvas no flash de dano no iPhone (§3.2) | Média | Alto | T2 primeiro |
| O3 | SW servindo versão velha (assets sem hash no nome) | Média | Alto | revisão por hash de conteúdo, network-first no HTML, troca fora da luta, teste e2e:build |
| O4 | Vitrine solta na luta deixa o menu "vazio" por instantes na volta | Alta | Baixo | aceitar (OR-3) e o SW reduz a espera à decodificação |
| O5 | O motor v2 passa de 135 kB no JS inicial | Média | Baixo | dividir menus e opções em pedaço próprio; T8 acusa |
| O6 | Medição de quadro em máquina dividida (como em 23/10) | Alta | Médio | a meta 7a exige máquina livre e 3 rodadas; outros projetos da máquina rodam em outra hora |

**Dívidas conscientes:** atlas guardados abaixo da resolução da tela (1,2x ampliados); total da 1ª visita acima de 4 MiB, aceito
porque a espera bloqueante é o que conta; cota de armazenamento do iOS sem medição.

## 7. O que foi provado e o que não foi

**Medi hoje:** dimensões, pesos e ocupação de todos os atlas, cenários, retratos e logos em `public/assets` (`sharp`); gzip dos
pedaços de `dist/` (build de `f5b5fab`, 11:08); `alturaRef`, `scale` e `SH_IDLE` (lidos). **Da Íris, não refeito:** carga até o título e até
a luta, memória no boot e em luta, quadro em 1x e 4x. **Lido no código:** fluxo de carga (`elenco.ts`, `gerenciador.ts`, `main.ts`), silhueta
por página e o `throw` sem contexto, o que intro, menu e título desenham. **Estimado:** pesos da FILME, retratos em WebP, crescimento do
JS com o motor v2, tempos de decodificação no celular, cópia na GPU. **Não verificado hoje:** os tetos de canvas do iOS e a cota de
armazenamento (a busca na web falhou nesta sessão).
