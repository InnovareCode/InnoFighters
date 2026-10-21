# InnoFighters: logo, paleta D ("INNO azul")

Apolo, 2026-10-21. Pedido do dono: "a versão em que o INNO é na tonalidade azul". Proposta para a Lyra aplicar em
`src/ui/logo.ts`; o arquivo **não** foi alterado.

Preview (renderizado do jogo real, não de mockup):
- `arte-fonte/logo-paleta-d-preview.png`: logo sobre o escuro (A atual, D1, D2) e a tela de título real nos 4 cenários
  da vitrine (jp, cn, kr, br) para A, D1 e D2.
- `arte-fonte/logo-paleta-d-cenarios.png`: D1 e D2 sobre os 9 cenários crus (pior caso, sem gradação nem emblema).

## 1. Interpretação

O protótipo original tinha INNO em cromo azulado e FIGHTERS em fogo, e foi rejeitado por três motivos
(`docs/proposta-expansao.md` 1.1): horizonte cinza-ardósia (`#7086bd`) que lia como sujeira, dois contornos internos
(azul em cima, dourado embaixo) e um anel com as 4 cores dos lutadores. A paleta D devolve o azul ao INNO e corrige os
três:

| Problema do protótipo | Paleta D |
|---|---|
| Horizonte cinza (saturação baixa) | Horizonte cobalto saturado: saturação medida 0,87 (D1) e 0,91 (D2), matiz 226 e 214 graus |
| Dois contornos internos | Um só para as duas palavras (D1 ouro `#ffe08a`, D2 creme incandescente `#fff1d6`) |
| Anel arco-íris | Anel de um tom só, azul: matizes do emblema medidos entre 215 e 229 graus (D1) |
| Volume roxo de outra família | Volume índigo profundo, ponte entre o azul de cima e a brasa de baixo |

FIGHTERS continua em brasa (mesmos stops da paleta A). O contraste quente/frio entre as palavras volta, de propósito:
é o código do gênero (gelo x fogo). O que impede que vire "dois logos" é o contorno interno único, o contorno externo e
o volume comuns, e o fato de o anel ter um tom só.

## 2. As duas variantes

### D1 "Cobalto Real" (RECOMENDADA)

Azul-royal profundo, metal polido, aro de ouro. Lê "azul" de forma inequívoca: dos pixels claros de INNO (sem contorno
preto e volume), 68% caem na faixa 195-250 graus com saturação > 0,2 (82% dos saturados); o resto é o aro dourado (14%)
e brilhos pouco saturados (18%). O aro de ouro amarra INNO com o
topo dourado de FIGHTERS e com o dourado da UI ("TORNEIO MUNDIAL DE ARTES MARCIAIS", "PRESSIONE ENTER"): azul, ouro e
brasa viram uma heráldica só, como um brasão de torneio.

```ts
export const PALETA_MARCA = {
  contornoInterno: '#ffe08a',
  contornoExterno: '#07060f',
  volumeLonge: '#04040c',
  volumePerto: '#1b1650',
  fioDeLuz: '#f2f6ff',
  brilho: [236, 244, 255] as const,
  /** Anel do emblema: gelo -> cobalto -> gelo (um tom só). */
  anel: ['#a8c8ff', '#2f63ff', '#a8c8ff'] as const,
  anelInterno: 'rgba(205,225,255,.55)',
  halo: 'rgba(60,110,255,.30)',
  /** Brasas do título: continuam família brasa (são o fogo de FIGHTERS). */
  brasas: ['#ffd27a', '#ff9a3d', '#ff5a12'] as readonly string[],
} as const;

// PALAVRAS
//   INNO:     fill: [[0, '#e8f0ff'], [0.4, '#93b4ff'], [0.5, '#0c2068'], [0.55, '#4f80ff'], [0.82, '#2452e2'], [1, '#aac6ff']]
//   FIGHTERS: fill: [[0, '#fff3c4'], [0.42, '#ffbe33'], [0.56, '#ff5a12'], [1, '#b0101c']]   (igual à paleta A)
//   edge das duas: PALETA_MARCA.contornoInterno (como hoje)
```

### D2 "Azul Elétrico"

O azul do protótipo "corrigido": mais claro e luminoso, metade de cima quase branca, horizonte azul saturado no lugar
do cinza, aro creme incandescente (neutro que serve ao gelo e ao fogo). É a mais fiel ao que o dono provavelmente
lembra; lê como "cromo azul" (dos pixels claros de INNO, 48% são azuis e 52% pouco saturados, quase brancos).

```ts
export const PALETA_MARCA = {
  contornoInterno: '#fff1d6',
  contornoExterno: '#07060f',
  volumeLonge: '#04040c',
  volumePerto: '#22145a',
  fioDeLuz: '#ffffff',
  brilho: [240, 248, 255] as const,
  anel: ['#d8f0ff', '#3f9bff', '#d8f0ff'] as const,
  anelInterno: 'rgba(215,240,255,.55)',
  halo: 'rgba(70,150,255,.28)',
  brasas: ['#ffd27a', '#ff9a3d', '#ff5a12'] as readonly string[],
} as const;

// PALAVRAS
//   INNO:     fill: [[0, '#ffffff'], [0.4, '#c8ecff'], [0.5, '#0f62d6'], [0.55, '#76d0ff'], [0.82, '#2fa2ff'], [1, '#dcf5ff']]
//   FIGHTERS: fill: igual à paleta A
```

### Por que D1 e não D2

1. **Conflito com o HAYATO.** O azul livre na roda de cores não existe: HAYATO ocupa ciano/azul (`#6fe0ff` 193 graus,
   `#1e6fe8` 216 graus) e AMINU o índigo (`#6f7dff` 234, `#2b2fa6` 238). D2 (201 a 215 graus) cai **dentro** da faixa
   do HAYATO, e o HAYATO é o primeiro da vitrine, com brilho ciano logo abaixo do logo. D1 (222 a 227 graus) fica no
   vão entre os dois, e a diferença de material ajuda: nos lutadores o azul é luz/energia; no logo é metal com
   horizonte escuro e aro de ouro.
2. **"Tonalidade azul" de verdade.** D1 lê azul em qualquer cenário; D2 lê branco-azulado.
3. **Coesão.** O aro de ouro de D1 é a ponte com FIGHTERS e com a UI; o creme de D2 é neutro e não amarra nada.

Custo de D1, medido (seção 3): o corpo do INNO é mais escuro que o ouro da paleta A, então o contraste do corpo da
letra contra o fundo cai cerca de 1 ponto nas telas de título. A leitura continua garantida pelo contorno preto (zero
pixels abaixo de 3:1 na borda), e sobre os cenários quentes (pôr do sol, lanternas, praia) o azul ganha contraste de
**matiz** que o ouro não tinha, o que a WCAG não mede.

## 3. Contraste medido

Medido no navegador (Playwright, Chromium), no jogo real servido pelo Vite com o trecho da paleta de
`src/ui/logo.ts` trocado em memória (o código de desenho é o do arquivo; só os valores mudam). Logo sem o brilho que
atravessa. Luminância relativa WCAG 2.x.

Três medidas, por palavra (INNO acima, FIGHTERS abaixo; corte na coordenada y=176 do logo de 760x300):
- **Borda** (o que a WCAG 1.4.11 pede para objeto gráfico): cada pixel de fundo a até 5 px da silhueta, contra o
  melhor dos dois contornos (externo escuro e interno claro). Relato pior / mediana / pixels abaixo de 3:1.
- **Corpo x fundo**: cada pixel claro da letra (preenchimento + aro, luminância > 0,03) contra o pixel de fundo atrás
  dele, mediana e % com 3:1 ou mais. É "quanto a letra se separa do fundo se o contorno preto sumisse"; informativo.
- **Corpo x contorno externo** (mediana): a letra contra o próprio contorno preto.

Fundos: os 4 da tela de título (cenários da vitrine com gradação, raios, fileira de heróis e emblema reais, sem as
brasas), boot, abertura (escuro + emblema), menu (logo pequeno) e os 9 cenários crus.

### D1 Cobalto Real

| Fundo | INNO borda (pior / med / <3) | FIGHTERS borda | INNO corpo x fundo | FIGHTERS corpo x fundo | corpo x contorno (I / F) |
|---|---|---|---|---|---|
| título jp | 3.95 / 9.3 / 0 | 3.95 / 5.3 / 0 | 3.0 (50%) | 2.0 (24%) | 10.6 / 13.0 |
| título cn | 4.01 / 11.3 / 0 | 3.96 / 7.2 / 0 | 4.4 (61%) | 4.4 (69%) | 10.7 / 12.9 |
| título kr | 3.95 / 10.3 / 0 | 3.96 / 9.7 / 0 | 3.3 (54%) | 4.5 (69%) | 10.6 / 13.1 |
| título br | 3.96 / 10.0 / 0 | 3.96 / 7.9 / 0 | 4.4 (61%) | 5.8 (78%) | 10.6 / 13.1 |
| boot | 3.95 / 14.3 / 0 | 3.95 / 15.1 / 0 | 8.8 (89%) | 10.9 (96%) | 10.8 / 12.9 |
| abertura | 3.99 / 15.7 / 0 | 4.03 / 15.9 / 0 | 8.9 (87%) | 11.2 (94%) | 10.6 / 13.0 |
| menu | 8.19 / 12.1 / 0 | 6.25 / 9.0 / 0 | 8.0 (87%) | 8.7 (92%) | 10.8 / 13.3 |
| cru jp | 3.95 / 5.4 / 0 | 3.95 / 7.4 / 0 | 2.0 (16%) | 1.7 (11%) | 10.6 / 13.0 |
| cru cn | 3.96 / 8.0 / 0 | 3.96 / 5.5 / 0 | 3.2 (52%) | 3.9 (66%) | 10.6 / 13.0 |
| cru kr | 3.95 / 5.7 / 0 | 3.95 / 7.7 / 0 | 2.2 (35%) | 3.5 (55%) | 10.6 / 13.0 |
| cru br | 3.96 / 5.5 / 0 | 3.96 / 6.4 / 0 | 2.4 (37%) | 5.1 (78%) | 10.6 / 13.0 |
| cru ng | 3.98 / 11.2 / 0 | 3.95 / 5.8 / 0 | 1.4 (17%) | 2.2 (24%) | 10.6 / 13.0 |
| cru mx | 3.95 / 13.0 / 0 | 3.99 / 8.0 / 0 | 7.6 (87%) | 6.2 (84%) | 10.6 / 13.0 |
| cru fr | 5.05 / 12.9 / 0 | 3.95 / 6.3 / 0 | 1.4 (21%) | 1.4 (4%) | 10.6 / 13.0 |
| cru in | 3.95 / 10.1 / 0 | 3.95 / 6.4 / 0 | 5.3 (67%) | 2.8 (47%) | 10.6 / 13.0 |
| cru mn | 3.95 / 5.7 / 0 | 3.95 / 11.9 / 0 | 2.1 (26%) | 1.9 (25%) | 10.6 / 13.0 |

Aro de ouro contra o contorno externo: 15,6:1.

### D2 Azul Elétrico (resumo)

Borda: 0 pixels abaixo de 3:1 em todos os 16 fundos; pior 4,25:1 (o aro creme é mais claro que o ouro, então o piso
sobe). Corpo x fundo nas 4 telas de título, INNO: 3,9 / 6,1 / 4,4 / 6,3 (jp, cn, kr, br). Corpo x contorno: 15,8 (INNO)
e 13,2 (FIGHTERS). Aro contra o contorno externo: 18,0:1. Tabela completa em `medidas.json` (seção 5).

### Referência: paleta A (atual)

Borda: 0 abaixo de 3:1, pior 3,98. Corpo x fundo nas 4 telas de título, INNO: 3,9 / 6,0 / 4,7 / 6,0. Corpo x contorno
15,8 / 13,1.

### Leitura honesta dos números

- **O critério de aceite (borda com 3:1 ou mais) passa nas três paletas, em todos os fundos, com zero pixels abaixo.**
  O "pior" fica sempre perto de 3,95-4,25 porque é piso matemático da dupla contorno escuro + aro claro: com um aro de
  luminância Li e o contorno Lo, o melhor dos dois nunca cai abaixo de sqrt((Li+0,05)/(Lo+0,05)). Por isso o aro
  **tem** que ser claro: um aro azul médio (luminância ~0,3) derrubaria esse piso para ~2,6:1. Foi o que decidiu
  ouro (D1) ou creme (D2) em vez de um aro azul.
- **Corpo x fundo fica abaixo de 3:1 em vários cenários crus em TODAS as paletas, inclusive a A aprovada** (fr, ng, jp,
  mn são céus e paredes claros e quentes). A leitura nesses casos é do contorno preto de 22 px, que é o desenho do logo
  desde o protótipo. Os cenários crus são pior caso: o logo nunca aparece sobre eles sem a gradação do título.
- D1 perde ~1 ponto de corpo x fundo para A e D2 nas telas de título (azul-royal é mais escuro que ouro e que azul
  claro). É o custo de "azul de verdade".
- Corpo x contorno de D1 (10,6) é menor que A (15,8) pelo mesmo motivo, e ainda está acima de 7:1.

## 4. Impacto na implementação (para a Lyra)

- Mudam só valores: `PALETA_MARCA` e os dois `fill` de `PALAVRAS`. Nenhuma mudança de desenho, geometria ou API.
  `cenas/intro.ts` lê `PALETA_MARCA.brasas` e continua igual (brasas não mudam).
- **Testes que vão quebrar de propósito** (precisam ser reescritos para a paleta D, não mascarados):
  - `tests/unit/logo.test.ts` "usa os valores da proposta 1.3": trocar pelos valores desta proposta.
  - `tests/e2e/logo.spec.ts`: a asserção "0 pixels frios" e "horizonte `#9a5a12`" deixam de valer. Sugestão de
    asserções novas, que são as que eu medi: INNO com pixels azuis (195-250 graus) > 50% dos coloridos e horizonte com
    saturação > 0,6 e matiz 215-235 (não cinza); FIGHTERS com 0 pixels azuis; emblema com todos os matizes entre 210 e
    235 graus (um tom só); borda com 0 pixels abaixo de 3:1 por palavra nos fundos já usados. Os limites `emblemaMatizes`
    15-60 também mudam.
- Elementos quentes que ficam como estão e combinam com D1: raios de luz atrás do logo (`#ffd9a0`), onda de choque da
  abertura, faíscas do impacto (brasas).

## 5. Como reproduzir

Scripts (temporários, no scratchpad desta sessão; recriáveis a partir desta descrição):
- `vite.paleta.mjs`: Vite com raiz no projeto e um plugin `transform` que troca, só em memória, o trecho entre
  `export const PALETA_MARCA = {` e `function obterLogo` pelo trecho gerado da variante (aborta se os marcadores
  sumirem; confere no log que a troca rodou).
- `medir.mjs`: sobe um Vite por variante (portas 5191-5193, nunca a 5173/5174), abre `/?seed=5&manual=1`, desenha a
  tela de título real por `__inno.ui.set('title')` + `__inno.desenhar()` com `marca.desenharLogo` desligado para obter
  o fundo, e mede/fotografa. `folhas.mjs` monta os PNGs com `sharp`.

## 6. Pendências

- Escolha do dono entre D1 (recomendada) e D2.
- Não medido: o logo com o brilho que atravessa em movimento, a abertura em movimento (impacto, tremor) e contraste de
  matiz (só luminância).
- A proximidade com HAYATO/AMINU é inevitável para qualquer azul; se o dono estranhar o logo "do HAYATO" na tela de
  título, a mitigação é D1 (não D2).
