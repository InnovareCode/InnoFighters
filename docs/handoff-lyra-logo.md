# Handoff — Lyra — Logo, paleta A (Ouro Forjado)

Data: 2026-10-20. Sem `git add`/commit/push, sem dependência nova. Nenhum servidor deixado aberto (Playwright subiu e
derrubou o dele na 5173; a 5174 do dono não foi tocada; um e2e por vez).

## RESULTADO

`src/ui/logo.ts`, valores da seção 1.3 de `docs/proposta-expansao.md`:
- `PALETA_MARCA` (exportada) concentra todas as cores da marca.
- INNO em ouro polido (horizonte `#9a5a12`), FIGHTERS em brasa, um contorno interno só (`#ffe08a`), contorno externo
  `#0b0306`, volume `#0a0204` / `#4a0e0c`, fio de luz `#fff6dc`, brilho que atravessa `rgba(255,246,214,...)`.
- Emblema: cor única da marca. Anel dourado -> laranja -> dourado (degradê cônico), arcos internos e halo da paleta.
  Número de segmentos é uma constante da marca (4), não vem do elenco. `desenharEmblema` não importa mais lutadores.
- Brasas do título e faíscas do impacto do logo na abertura: família brasa (`#ffd27a`, `#ff9a3d`, `#ff5a12`), sem
  `ROSTER`/`fire` (`cenas/intro.ts` também ajustada).
- Novo objeto `marca = { desenharLogo, desenharEmblema }`: boot, abertura, título e menu chamam por ele. É o que
  permite aos testes desligar só o logo.
- Fora do escopo e intactos: brilho colorido por lutador atrás da fileira de heróis, painéis da abertura, nomes e barras.

## Portões (rodados agora, um de cada vez)

- `typecheck` limpo. `npm test`: 17 arquivos, 205 testes verdes. `npm run test:e2e`: 59 passaram, 27 pularam por
  projeto. `build` ok (JS 128,4 kB).

## TESTES (honestos com a mudança intencional)

- `fidelidade-ui.spec.ts`: o protótipo continua sendo a referência de TUDO que não é o logo. Dos dois lados logo,
  emblema e brasas são desligados (protótipo: `drawLogo`/`drawEmblem` no-ops e `EMBERS` vazio; jogo novo: `marca.*`
  no-op e brasas vazias). Nenhuma máscara de região: o resto das 40 telas segue **0 pixel de diferença**, inclusive
  título, menu, boot e abertura sem o logo.
- `logo.spec.ts` (novo, medido no navegador, desktop): o logo novo é medido à parte.
  - Só família quente: 0 pixels frios em 99.879 pixels opacos do logo; o logo antigo do protótipo tem 125.370 frios
    (31% dos opacos, em escala 4x), ou seja, a medição enxerga a diferença.
  - Horizonte de INNO: 228 pixels da linha de 50% estão em `#9a5a12` (±40), não cinza.
  - Contraste do contorno dourado contra o escuro: 15,8:1.
  - Anel de fundo (até 5 px do logo), contraste do contorno contra o fundo real:

    | Fundo | Pior | Mediana | Abaixo de 3:1 |
    |---|---|---|---|
    | jp cru (sem gradação) | 3,98 | 7,21 | 0 |
    | br cru | 3,98 | 5,63 | 0 |
    | título jp (com gradação do título) | 3,98 | 9,60 | 0 |
    | título br | 3,98 | 9,83 | 0 |
    | menu jp (logo pequeno) | 9,87 | 14,81 | 0 |
    | abertura (`#04020a`) | 15,99 | 15,99 | 0 |

  - Emblema: 45.138 pixels, 0 frios, matizes entre 24 e 47 graus (laranja a dourado), uma cor só.
  - Olhei as imagens (título jp, br cru): INNO e FIGHTERS leem como um objeto só nos dois cenários.
- `logo.test.ts` (unit, novo): valores da paleta, brasas só da família brasa para várias sementes, emblema e brasas sem
  `LUTADORES`/`ROSTER`/`.fire` (funcionam com qualquer tamanho de elenco) e as cenas chamando por `marca`.

## O QUE A MEDIÇÃO NÃO DIZ

- O "pior 3,98:1" é o piso matemático da combinação contorno escuro + dourado (o melhor dos dois contra qualquer
  luminância de fundo nunca cai abaixo de ~3,9:1); a informação útil é a **mediana** por fundo e o zero de pixels
  abaixo de 3:1. É contraste de luminância; matiz sobre pôr do sol não é medido.
- Não medi o logo com o brilho que atravessa (shine) em movimento nem em fundos além de jp e br (cn e kr).
- Fonte: `Impact` com fallback `Arial Black`. Em Linux/Android sem Impact o desenho muda (pendência da proposta 1.6).
- Brasas e emblema na abertura em movimento (t=120 a 150, com tremor) só foram vistos em quadros parados.

## PARA O PRÓXIMO

- Íris: olhar a abertura inteira rodando (impacto do logo com faíscas agora douradas/laranja) e o título nos 4 cenários.
- Quando a Fase 2 trouxer lutadores novos: nada a mudar no logo; o brilho por lutador na fileira de heróis continua
  usando `ch.fire[0]`, e a fileira/ciclo ainda assumem 4 cenários (`STAGE_OF`, `CICLO_CENARIOS`).

## PENDÊNCIAS

- Nenhuma bloqueante. Decisão de design em aberto da proposta: 1 em cada 6 brasas na cor do lutador em destaque
  (opcional na 1.3); não implementei.

## APRENDIZADO (gravado na memória da Lyra)

- Ao mudar de propósito um elemento visual, desligue-o **dos dois lados** da comparação com o protótipo (por um ponto
  de injeção como `marca`) em vez de mascarar regiões: o resto continua exato e o elemento novo ganha teste próprio.
- Medir contraste do contorno com "melhor de dois contra o fundo" tem piso matemático; relatar mediana e contagem de
  pixels abaixo do limiar, não só o pior caso.
