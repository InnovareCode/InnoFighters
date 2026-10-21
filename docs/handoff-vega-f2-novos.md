# Handoff Vega: F2 nos lutadores novos (AMINU, CENTELLA, CAMILLE, NILA, BAATAR)

Data: 2026-10-20. Sem commit. Nada em `src/`, `public/assets` nem `tests/e2e` foi tocado. Tudo sai em
`sprites-gerados/<id>/` (gitignored) e os contact-sheets em `arte-fonte/lutadores/<id>/contact-sheet-<id>.png` e `-claro.png`.
Uso: `npm run sprites -- <id>` (BAATAR incluso; ~10 s cada).

## RESULTADO

| Lutador | Folhas usadas (a maior `-vN` já é a aprovada) | Quadros | Atlas | Peso | alturaRef |
|---|---|---|---|---|---|
| AMINU | f1 v1, f2 v2, f3 v3, f4 v1 | 48 | 2 págs 2048x1920 | 515 + 573 KB | 410 |
| CENTELLA | f1 v1 (override, abaixo), f2 v2, f3 v1, f4 v1 | 48 (47 desenhos) | 2 págs 2048x1664 | 615 + 639 KB | 410 |
| CAMILLE | f1 v1, f2 v2, f3 v1, f4 v2 | 48 | 2 págs 2048x1472 | 476 + 401 KB | 410 |
| NILA | f1 v3, f2 v2, f3 v1, f4 v1 | 48 | 2 págs 2048x1600 | 558 + 514 KB | 410 |
| BAATAR | b1 v1, b2 v2, b3 v1, br v1, b4..b8 v1, b9 v2 | 54 (53 desenhos) | 4 págs 2048x1664 | 579+474+527+428 KB | **525** |

Conferido a olho nos contact-sheets claro e escuro dos cinco: pés na linha, sem halo (medido: borda com vazamento de 62 a 77% -> 0,0% em
todas as folhas), nocaute (`koFloor`) e arremesso (`kdAir`) com a cabeça à ESQUERDA, 13 mínimas presentes, `ponta` nos golpes ativos.
`acharFolha` já pegava a maior `-vN`: as versões do pedido saíram sem `--folha` (teste confere nome a nome).

### O que o pipeline ganhou (`ferramentas/sprites/`)
- **`poses.mjs`**: `LAYOUTS` (`padrao` 4x3 e `chefe` 3x2), `resolverLayout` (valida: pose repetida entre células = erro; nº de células
  = grade), `nomesDaCelula`, `EXTRAS` (`jpunch`, `devekh0-2`, `dive0-1`), `ORDEM_COMPLETA`, `FRACAO_PE`.
  **Célula** = nome | `[nome, apelido...]` (mesmo desenho em 2 quadros, entra 1 vez no atlas e o manifesto repete `p/x/y/w/h/ax`) | `null` (figura descartada, ainda conta para achar as 6/12).
- **`nucleo.mjs`**: `acolchoarRgb` (margem de fundo antes de cortar a borda) e `pontaDireita({yMin})` (base do modo `pe`).
- **`executar.mjs`**: `acharFolha` aceita `<id>-b1-v1.png` (sem descrição); `processarFolha(arquivo, celulas, {grade, acolchoar})`;
  `gerarLutador` lê de `lutadores.json`: `layout`, `celulas`, `alturaRef`, `acolchoar`, `fatorFolha`, `ponta` (pose fora de `COM_PONTA` também ganha ponta);
  parâmetro `excecoes` para teste. Retrato: com `alturaRef` > 410 a janela é `190*k` px do atlas, reduzida a 190x190 (mesmo enquadramento).
- **`lutadores.json`**: `centella.celulas.f1` e `baatar` (layout, alturaRef 525, `acolchoar.b9.esquerda=16`, `ponta` de `dive1` e `jkick`).

### CENTELLA f1 (decisão do Apolo aplicada)
O par r2c3/r3c3 **não precisou de recorte manual**: a chave de cor já dá 12 componentes (a "ponte" fica abaixo do limiar de alfa 64) e a
sola da bota do walk2 está inteira no zoom. A r1c3 é descartada: idle0 = r1c1, idle1 = r1c2, idle2 = r1c4, idle3 = r1c2 (apelido de idle1;
laço r1c1 > r1c2 > r1c4 > r1c2). Antes do override o idle2 saía com 430 px (o salto de 26 px da r1c3); agora todos ficam em 406-410.

### BAATAR (escala própria, sem normalizar altura quadro a quadro)
- `alturaRef` 525 (= 410 x 1,28), escala única 0,6325 pelo idle0 (B1 r1c1, 830 px na folha -> 525). O jogo usa `K = scale * SH_IDLE / alturaRef`,
  então os `tipX/tipY` que `manifestoParaPoses` calcula já saem na escala da guarda e o `ch.scale` 1,28 multiplica depois, como nos outros.
- Mapa de poses (de `docs/prompts-arte.md` §7 + curadoria do Apolo): B1 = `[idle0,idle2] idle3 idle1 (r2c1 descartado) walk0 walk1`
  (laço 2-1-3-1 = frame1, frame3, frame1, frame2); B2 = `walk2..walk7`; B3 = `(r1c1 descartado) block cblock jsquat jup jtop`; BR r1c1 = `crouch` (84% do idle),
  BR r1c3 = `sa2`; B4 = `jfall land hitH hitB kdAir koFloor`; B5 = `lp0 lp1 hp0 hp1 lk0 lk1`; B6 = `hk0 hk1 clp clk sweep upper`;
  B7 = `sa0 sa1 (r1c3 = BR) sa3 sb0 sb1`; B8 = `sb2 sb3 sc0 sc1 jkick jpunch`; B9 v2 = `devekh0 devekh1 devekh2 dive0 dive1 win`.
  As outras 4 células da BR ficam de fora (decisão do Apolo); B5 r2c1 / B6 r2c1 / B8 r2c3 seguem as originais.
- B9 v2: o traço que tangencia x=0 (r1c1 e r2c1) ganhou **16 px de fundo à esquerda antes do corte de 2 px de borda**: os dedos saem inteiros (conferido no zoom).
- Sem `fatorFolha`: as alturas das poses em pé ficam entre 507 e 551 px contra 525 do idle (+-5%), sem a folha B6 destoar na conferência visual (a sugestão do Apolo, x1,05 na B6, partia da altura da cabeça; não precisou). Fica o mecanismo pronto se a F3 notar troca de tamanho numa folha: `"fatorFolha": {"b6": 1.05}`.

## PARA O PRÓXIMO

**Atlas / Apolo (olhar os contact-sheets):**
- BAATAR `walk0..walk7` medem 533-551 px contra 525 do idle0 (+2 a +5%): é a postura mais ereta do andar, a cabeça parece do mesmo tamanho. O jogo "sobe" uns 20 px (atlas) ao andar. Se incomodar na F3, `fatorFolha.b2 = 0.97`.
- BAATAR `win` (B9, 550 px) e `block` (542) também são ~4-5% mais altos que o idle.
- BAATAR `sa2` (hip toss da BR): o punho de baixo ainda segura a barra da jaqueta; se na animação ler "ajeitando a roupa", cortar o quadro (a decisão é do Apolo, handoff lote 8).
- AMINU `sb2` e `sb3` saíram do mesmo tamanho (364x446): a folha repete a pose (arte), a F3 pode tratar `sb3` como volta à guarda.
- CAMILLE f4 `win`: o contorno da sola toca a última linha útil da folha (1 px); sem pé cortado.

**Valores de `ponta`/`ax` a decidir (Atlas, antes da F3).** `tipX/tipY` em px lógicos (já x `SH_IDLE/alturaRef`; o motor ainda multiplica por `ch.scale`). `ax` = centro de massa em px do atlas. Modos: M = mão, D = direita, C = cima, P = pé.

| Pose | AMINU | CENTELLA | CAMILLE | NILA | BAATAR |
|---|---|---|---|---|---|
| lp1 | 201/329 M | 200/338 M | 177/356 M | 180/285 M | 215/351 M |
| hp1 | 218/322 M | 207/329 M | 197/330 M | 196/276 M | 196/308 M |
| lk1 | 266/294 D | 254/282 D | 246/304 D | 235/277 D | 222/231 D |
| hk1 | 256/419 D | 223/403 D | 234/381 D | 201/404 D | 227/269 D |
| clp | 207/224 M | 182/216 M | 180/234 M | 187/220 M | 172/295 M |
| clk | 275/112 D | 232/166 D | 245/171 D | 215/133 D | 228/171 D |
| sweep | 297/10 D | 278/23 D | 268/20 D | 262/17 D | 235/62 D |
| upper | 67/439 C | 73/416 C | 49/405 C | 65/390 C | 99/402 C |
| sa1 | 175/319 M | 181/381 M | 121/284 M | 213/270 M | 160/285 M |
| sa2 | 220/335 M | 279/96 M | 209/376 M | 213/268 M | **114/109 M (bota)** |
| sb1 | 206/380 M | 181/99 M | 212/137 M | 148/94 M | 163/197 M |
| sb2 | 150/358 M | 154/100 M | 199/110 M | 182/115 M | 221/133 M |
| sc1 | 208/311 M | 267/177 M | 214/339 M | 177/294 M | 122/296 M |
| jkick | 170/248 D | 216/139 D | 205/61 D | 139/217 D | 147/131 **P** |
| jpunch | n/a | n/a | n/a | n/a | 155/130 M |
| dive1 | n/a | n/a | n/a | n/a | 210/132 D (extra, sem exigência do contrato) |

Pontos para decidir:
1. **BAATAR `sa2` (hip toss)**: não tem alcance à frente (puxa para a ESQUERDA); a ponta automática cai na bota da frente (`tipX` 114, `tipY` 109). Como é arremesso, o motor usa `agarrao.alcance`, não a ponta: sugiro ignorar ou fixar à mão (editar `atlas.json`).
2. **BAATAR `jkick`** usa o modo `pe` (ponto mais à direita abaixo de 55% da altura): com `direita` a ponta ia para o punho da frente, que passa da bota. Se a caixa do golpe for no corpo todo, trocar em `lutadores.json`.
3. **`ax` por centro de massa** desloca o corpo nos golpes longos (já avisado na F2). No BAATAR o efeito é maior: `lp1` ax 207, `hp1` ax 244 contra o idle0 181. Se parecer que o chefe "empurra", a alternativa é ancorar pelos pés (`centroDeMassaX` em `nucleo.mjs`).
4. CENTELLA `sa2` (body splash horizontal) e `sc1` (dropkick): `tipY` baixo/alto por serem golpes aéreos; a caixa deve vir do corpo, não de um ponto.
5. `dive0-1`/`devekh0-2` ficam no atlas do BAATAR, página 3 do empacotamento (o empacotador agrupa por tamanho, não por uso: as 4 páginas não seguem a sugestão 0/1/2/3 do `prompts-arte.md`, só cabem em 4). `win` vem da B9: o BAATAR jogável (ED-M4) não usa o resto da B9, mas a vitória sim.

**Lyra / F3 (integração):** copiar `sprites-gerados/<id>/*` para `public/assets/lutadores/<id>/` só quando decidir trocar a arte. O atlas é C1 v2 (várias páginas, `p` por quadro, `retrato` embutido). **Apelidos repetem o retângulo** (idle0/idle2 no BAATAR, idle1/idle3 na CENTELLA): o loader/render não pode assumir um retângulo por nome. BAATAR: `alturaRef` 525, 54 nomes (`jpunch`, `devekh0..2`, `dive0..1` incluídos); sem `guard`/`idleB`/`walkA..C` (o `ALIAS`/`getPD` cobre pelos canônicos). O quadro de pulo/queda vem apoiado na base do próprio quadro (pé mais baixo), como no legado.

**Íris (testar):** `npm test` (seções "sprites-*"): 532 testes verdes no total. Atacar: folha 3x2 com 7 figuras (ruído grande); duas células com a mesma pose (`resolverLayout` recusa); folha acolchoada com a figura encostada à direita; `fatorFolha` na folha do idle0 (hoje o idle0 não escala, mas os outros quadros da mesma folha sim: não faz sentido, não usar).

**Órion (revisar):** continua valendo o aviso da F2 (`--folha` concatena nome de arquivo sem validar `..`; ferramenta local). `lutadores.json` é lido com `JSON.parse` de arquivo versionado, sem entrada externa.

## PROVADO / NÃO PROVADO

Provado (executado): `npm test` 532 verdes (inclui 13 novos no núcleo e 11 no pipeline, e a arte real: BAATAR completo com 54 poses, CENTELLA f1, e `acharFolha` + 12 figuras + halo 0 para as 12 folhas de AMINU, CAMILLE e NILA);
mutação em 6 pontos (acolchoar desligado, `fatorFolha` ignorado, regex antigo do `acharFolha`, apelido fora do manifesto, `yMin` ignorado, grade fixa 4x3): cada um derrubou exatamente 1 teste. `vite build` OK.
**`npm run typecheck` e `npm run build` estão VERMELHOS por causa de outro agente**: `tests/unit/baatar-s1b.test.ts` (3 erros TS2375, `exactOptionalPropertyTypes`), arquivo que não é meu e está em edição junto com `src/fight`. Nenhum erro em `ferramentas/` nem em `tests/unit/sprites-*`. Não rodei `test:e2e`.
Não provado: nada foi carregado no jogo/navegador; as pontas foram conferidas a olho no contact-sheet, não contra o alcance real do motor (F3).

## APRENDIZADO

1. **Cédula descartável tem de contar**: `null` no mapa de células descarta o desenho mas a figura entra na contagem 6/12 e na ordenação; sem isso a grade desalinha.
2. **Apelido > duplicar**: dois quadros do ciclo com o mesmo desenho (laço 2-1-3-1, 1-2-4-2) viram 2 entradas do manifesto para 1 retângulo; duplicar o desenho gastaria atlas e esconderia a intenção.
3. **Figura que tangencia a borda**: o corte fixo de 2 px come a ponta; acrescentar fundo ANTES do corte (acolchoar) em vez de afrouxar o corte (que traz o ruído da Runway de volta).
4. **"Mais à direita" erra de novo em chute em salto** (BAATAR `jkick`: o punho passa da bota): modo `pe` (restringe pela altura). Regra geral: ponta por golpe se confere a olho, não por fórmula única.
5. **`acharFolha`** exigia `-descrição-` no nome (`.*` entre hífens): `baatar-b1-v1.png` não casava. Padrão `(?:-.*)?`.
6. **Armadilha de ambiente**: `cat > arquivo` solto antes de um heredoc no Bash trava esperando stdin (taskkill); e comandos com aspas/backticks complexas num heredoc falham no parser do Bash: escreva o texto com a ferramenta Write e cole por um `python` curto.
7. Os testes que passaram de primeira só valeram depois de mutar 6 pontos do código e ver cada um cair.
