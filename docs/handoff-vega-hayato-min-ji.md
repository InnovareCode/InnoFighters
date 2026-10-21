# Handoff Vega: arte nova do HAYATO e da MIN-JI (pipeline de sprites -> produção)

Data: 2026-10-21. Sem commit. Missão do painel `cmvhlns3b00t101nx4uwxxobi`.
Tocado: `public/assets/lutadores/{hayato,min-ji}/` (atlas novo), `tests/fixtures/atlas-prototipo/{hayato,min-ji}/` (atlas ORIGINAL guardado),
`tests/unit/{_lutadores,atlas,dados,e5-elenco,sprites-pipeline}.test.ts|ts`. Não tocado: `src/` (nem `src/data/lutadores/{hayato,min-ji}.ts`: sem mudança
necessária), `src/render`, `src/ui`, `src/assets`, `tests/e2e`, `ferramentas/sprites/lutadores.json` (sem exceção a acrescentar).

## RESULTADO

| | HAYATO | MIN-JI |
|---|---|---|
| Folhas (maior -vN, sem `--folha`) | f1 v2, f2 v2, f3 v1, f4 v1 | f1 v1, f2 v2, f3 v1, f4 v1 (os `.jpg` soltos em `folhas/` são ignorados pelo `acharFolha`) |
| Fundo | magenta | verde |
| Quadros / atlas | 48, 2 páginas 2048x1536 (v2) | 48, 2 páginas 2048x1536 (v2) |
| Escala / alturaRef | 0,6716 / 410 | 0,7076 / 410 |
| `fatorFolha` | nenhum | nenhum |
| `jpunch` | ponte `jpunch -> jkick` (do `montarLutador`) | idem |

- **`fatorFolha`: medido, não precisou.** Cabeça (topo-queixo, régua a 3x em f1/f2/f3/f4) casa entre as 4 folhas nos dois; alturas dos quadros em pé comparáveis
  (HAYATO idle0 410, lp0 410, sa3 410, win 405, block 416; MIN-JI idle0 410, lp0 410, sa3 410, block 411).
- **Nocaute sem espelhar:** `kdAir` e `koFloor` saem com a cabeça à ESQUERDA nos dois (f2 v2 de cada), conferido no contact-sheet. Passar `--espelhar f2:koFloor`
  deixaria a cabeça à direita (errado). O CLI nem precisou da opção.
- Contact-sheets conferidos a olho, escuro (e o claro gerado junto): pés na linha, sem halo, 12 componentes por folha (HAYATO f3 separou 2 figuras coladas por
  erosão, raio 2 px, sem perda). `arte-fonte/lutadores/{hayato,min-ji}/contact-sheet-*.png`.
- **Produção:** copiei `atlas-0.webp`, `atlas-1.webp`, `atlas.json`; apaguei o `atlas.webp` antigo (v1, 1 imagem); `retrato.png/json` regerados com
  `node ferramentas/gerar-retratos.mjs --so <id>` e `--verificar` = ok nos dois; o `retrato` do `atlas.json` foi alinhado ao `retrato.json` (como nos demais).
- **Oráculo de fidelidade segue com o atlas ORIGINAL:** `tests/fixtures/atlas-prototipo/<id>/{atlas.json,atlas.webp,retrato.json,retrato.png}` (cópia byte a byte do que estava
  em `public`). `tests/unit/_lutadores.ts`: `montarTodos()` usa a fixture para hayato/min-ji (`ORIGINAIS_COM_ATLAS_DE_PROTOTIPO`), `montarTodos({ arteReal: true })` monta
  pela arte de produção. `atlas.test.ts` e `dados.test.ts` (extraído do protótipo) leem a fixture desses dois.
- **Dados:** `hayato.ts` e `min-ji.ts` NÃO mudaram (`idPrototipo`, frames e golpes intactos). Os nomes de pose dos golpes (`punch`, `special`, `jumpPunch`...) só servem ao
  atlas legado; as animações (`BASE_ANIM`/`TYPE_ANIM`) citam nomes canônicos que o atlas novo tem (teste: nenhum golpe cai no idle0 de último recurso).

### Caixas e pontas: antes (atlas original) x depois (arte nova), largura da caixa em px lógicos

| Golpe (quadro) | HAYATO antes -> depois | MIN-JI antes -> depois |
|---|---|---|
| lp (lp1) | 126 -> 113 | 106 -> 98 |
| lk (lk1) | 131 -> 111 (fy 216 -> 191) | 137 -> 122 (fy 218 -> 188) |
| hp (hp1) | 150 -> 131 | 141 -> 127 |
| hk (hk1) | 171 -> 148 | 160 -> 137 (a pose antiga não tinha ponta: caía no padrão 140) |
| clp (clp) | 142 -> 130, **fy 92 -> 176** | 130 -> 130, fy 197 -> 149 |
| chk (sweep) | 159 -> 150 | 130 -> 140 (fy 89 -> 40) |
| jlp/jhp (jpunch = ponte jkick) | fy 220 -> 137 | w 133 -> 90 (mínimo), fy 206 -> 106 |
| jlk/jhk (jkick) | 136/151 -> 146/162 | 117/130 -> 90 (mínimo), fy 41 -> 111 |
| sFwd (sc1) | 160 -> 121 | 189 -> 160 (fy 151 -> 118) |
| sDown | igual (`tall`) | 100 -> 137 (sb1 agora com ponta) |
| spawn do projétil (x, y) | 122,177 -> 75,182 | 121,187 -> 101,221 |

Leitura: o alcance dos golpes de solo encolhe 6 a 15% (o punho/pé real da arte nova chega menos longe que o do atlas original); a caixa agora acompanha o desenho. Itens para a E6/olho:
- HAYATO `clp`: a arte nova do soco agachado é de peito (`tipY` 151), a caixa subiu 84 px: acerta quem está em pé; MIN-JI `hk`/`sa1` sobem (chute alto) e o projétil BULKKOT
  nasce a ~221 px (altura do rosto), porque `spawn` sai do `sa1`, que na MIN-JI é o chute alto.
- Soco aéreo é a ponte (`jpunch -> jkick`): no HAYATO a caixa desce de 220 para 137, na MIN-JI cai para o mínimo (90): o `jkick` da MIN-JI é joelhada (tip 73/75). Sem arte própria de soco aéreo, não há como
  igualar sem mexer nos dados (que ficaram intactos).
- HAYATO `sb2` (uppercut, `ponta` `cima` em `lutadores.json`): `tipX` -13. Só afeta rastro: a caixa do RAIJIN-KEN é `tall` (fixa).

## PARA O PRÓXIMO

**Lyra (e2e e render; eu não toquei):**
- `tests/e2e/fidelidade-prototipo.spec.ts` e `fidelidade-ui.spec.ts` comparam o jogo com o protótipo pixel a pixel: HAYATO e MIN-JI agora serão arte nova. Para o oráculo valer, as páginas precisam servir
  o atlas original desses dois como foi feito com o jp (`usarJpDoPrototipo`): `page.route('**/assets/lutadores/{hayato,min-ji}/**')` respondendo com `tests/fixtures/atlas-prototipo/<id>/atlas.json`
  (v1, `imagem: "atlas.webp"`), `atlas.webp`, `retrato.json` e `retrato.png`. O formato v1 continua suportado pelo loader (era o de produção até hoje).
- `tests/e2e/arte-sob-demanda.spec.ts:101` espera `urls ... '/atlas.webp'` com 2 itens (os originais em v1): com HAYATO e MIN-JI em v2 (`atlas-0/1.webp`), só o WEI LONG e o CAIO ficam em `atlas.webp`. Conferir esse número.
- Os dois lutadores passam de 1 página para 2: o carregador sob demanda baixa 2 WebP (HAYATO 580 + 712 KB, MIN-JI 594 + 649 KB; antes 1 imagem de 1,49 e 1,39 MB).

**Íris:** `npm test` 37 arquivos / 832 verdes; conferir a olho em jogo o alcance dos golpes de solo e o `clp` do HAYATO.

**Órion:** sem superfície nova.

## PENDÊNCIAS / decisões do Atlas

- `fatorFolha` e `ponta` por exceção ficam por conta do olho em jogo; nada foi aplicado.
- Rodar `npm run test:e2e` (não rodei, como pedido) depois que a Lyra apontar as rotas da fixture.

## Provado / não provado

Provado (executado): `npm run typecheck` e `npm run build` verdes; `npm test` 37 arquivos, 832 testes, sem `-u`, snapshot e fidelidade lock-step intactos. Mutação: com `ORIGINAIS_COM_ATLAS_DE_PROTOTIPO = []` o
snapshot da luta e 18 testes da fidelidade/lock-step caem (a fixture é de fato o que protege). Testes novos (e5-elenco): atlas v2 de produção (48 quadros, alturaRef 410 = idle0, K igual ao do protótipo),
fixture legada presente, nenhuma pose citada cai no último recurso, pontes `jpunch`/`crouchPunch`, caixas dentro de [90 px, 2x a antiga]. `acharFolha` confere as versões e as 12 figuras com halo 0 (sprites-pipeline).
Não provado: nada foi carregado no navegador, e2e não rodado, caixas conferidas por número e contact-sheet (não em luta).

## APRENDIZADO

1. Troca de arte de um lutador do PROTÓTIPO quebra o oráculo por dois caminhos independentes: dados (`dados.test`/`atlas.test` leem o atlas) e luta (`montarTodos` -> caixas -> lock-step e snapshot). A fixture
   precisa cobrir os dois; o e2e (pixel) é um terceiro caminho. Mutar a lista da fixture e ver cair é a prova.
2. O "nocaute espelhado" do briefing não valia para a v2: medir o lado da cabeça no contact-sheet antes de passar `--espelhar`.
3. Com atlas novo, o alcance de golpe muda por desenho (tipX/tipY vêm da arte): comparar caixas antes/depois (montar com os dois atlas) em vez de supor que "só a arte mudou".
