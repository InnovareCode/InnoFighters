# Combos próprios: nomes definitivos

Direção de arte e texto: Apolo, 23/10/2026. Fatia V2-4 (`docs/spec-revisao-motor-luta-v2.md` §6). Os 20 combos da 1ª leva ganham o nome
definitivo no campo `nome` de `src/data/lutadores/*.ts`. O `id`, a `sequencia`, o `semQueda` e o `final` não mudaram: o verificador do
balanço e o reconhecimento no motor seguem iguais. O campo `efeito`, que estava proposto aqui, já está no código (commit `17696b0`).

Estado no commit `9dce4da`: 20 combos; 11 fecham com especial (todos com `efeito`) e 9 terminam com golpe comum e `final`. Conferido
nos dados de `src/data/lutadores/*.ts` (e `fichas` da NILA e do ZENON, que herdam os combos da base).

## Regras de nome

- **Português do Brasil, caixa alta, curto.** Termo estrangeiro só onde já é costume do lutador: os números coreanos da MIN-JI, o
  "touché" da CAMILLE (que já fala "En garde", "Touché", "Voilà") e o "¡arriba!" da CENTELLA (que fala com o público em espanhol).
- **A voz é a do lutador**, tirada da ficha de tom de `docs/textos-provocacao.md`: vários nomes são ecos de falas que o jogador já ouviu
  no pré-round ou na vitória ("O chão decide", "Sem anestesia", "Nota máxima"). O combo vira a prova do que o lutador disse.
- **O nome não repete o especial que fecha o combo** (QUEBRA-BASE, PASSO DO LEÃO...). A tela já mostra a tecla dourada do especial; o
  nome diz o que a sequência inteira significa para aquele lutador.
- **Cabe com folga.** Medido no Chromium com a Barlow 600 de verdade, a 15 px, na coluna mais estreita (pausa do TREINO, 416 px): a pior
  folga entre o nome e a 1ª tecla passou de **33,6 px** (QUEBRA-BASE ENCADEADO, provisório) para **65,7 px** (VOLTA AO MUNDO). O maior
  nome novo tem 18 caracteres; o antigo tinha 21.

## Tabela

Botões como na tela de toque: SF = SOCO FRACO, CF = CHUTE FRACO, SFT = SOCO FORTE, CFT = CHUTE FORTE, ↓ e → = direção, ESP = especial.
"Efeito" é a linha de baixo do nome, na caixa do combo (ver a seção seguinte sobre o que a tela já mostra).

| id | nome | sequência em botões | efeito | por que combina |
|---|---|---|---|---|
| `hayato-trovao-ascendente` | RAIO ÀS AVESSAS | ↓+SF › CFT › ↓+ESP (RAIJIN-KEN) | segura em pé e sobe no RAIJIN-KEN | O HAYATO repete que "o raio cai uma vez só". Aqui o raio sobe: o fecho é o gancho ascendente invulnerável. |
| `hayato-trovao-lancado` | ESTRONDO | CF › ↓+SF › SFT | lança o rival | Da vitória "Ouviu o estrondo? Foi você caindo": o rival sobe e o barulho é a queda. Uma palavra, como ele fala. |
| `wei-long-ombrada-de-ferro` | A MONTANHA SE MOVE | ↓+SF › CFT › →+ESP (TIE SHAN KAO) | segura em pé e fecha na TIE SHAN KAO | Ele abre a luta com "A montanha não se move por você". Quando se move, é a ombrada blindada da Montanha de Ferro. |
| `wei-long-palma-da-montanha` | GRANDE MURALHA | SFT › CF › SFT | empurra o rival para a parede | Duas palmas pesadas até o rival bater na parede: a muralha é o fim do caminho, e é da China. |
| `min-ji-rajada-de-seul` | HANA-DUL-SET-NET | CF › CF › CF › CF | lança o rival | "Um, dois, três, quatro" em coreano, a contagem do dojang. São quatro chutes fracos, e ela conta em voz alta ("Conta comigo!"). |
| `min-ji-tornado-de-seul` | NOTA MÁXIMA | CF › CFT › ↓+ESP (HOERI CHAGI) | segura em pé e sobe no HOERI CHAGI | Campeã de pódio que fala em nota e placar ("Nota máxima, sem desconto!"). O chute tornado sobe alto: nota máxima nos dois sentidos. |
| `caio-ginga-rasteira` | VOLTA AO MUNDO | ↓+CF › ↓+CF › ↓+CFT | troca de lado com o rival | Na roda, "volta ao mundo" é quando os jogadores circulam e voltam em outra posição. O combo troca o CAIO de lado. |
| `caio-meia-lua-encadeada` | SÃO BENTO GRANDE | CF › CFT › →+ESP (MEIA-LUA) | segura em pé e fecha na MEIA-LUA | O toque de berimbau do jogo rápido e alto, de chutes ("O berimbau mudou o toque"). Fecha com a meia-lua no salto. |
| `aminu-dambe-encadeado` | NO COLO DA PLATEIA | CF › SFT › SFT | empurra o rival para a parede | O AMINU é o showman que fala com a "Plateia". Duas lanças seguidas mandam o rival para a beira, onde a plateia está. |
| `aminu-leao-no-canto` | RUGIDO DE KANO | SF › CFT › →+ESP (PASSO DO LEÃO) | segura em pé e fecha no PASSO DO LEÃO | O fecho é o PASSO DO LEÃO; o rugido é o anúncio. Kano é a cidade do epíteto dele ("A Lança de Kano"). |
| `centella-plancha-na-corda` | DO ALTO DAS CORDAS | CF › CFT › ESP (PLANCHA) | segura em pé e fecha na PLANCHA | Fala dela no round decisivo: "Do alto das cordas. Agora." A PLANCHA é o voo de corpo inteiro que vem de lá. |
| `centella-chave-aerea` | ¡ARRIBA! | ↓+SF › ↓+CF › SFT | lança o rival | O grito de lucha libre que ela já usa ("¡Arriba! Ainda tenho corda"). O combo manda o rival para cima. |
| `camille-estocada-cruzada` | FLECHA DE MARSELHA | SF › CF › SFT | troca de lado com o rival | Na esgrima, a flecha é o ataque em que se passa pelo rival. Ela é "A Riposte de Marselha"; o combo cruza para o outro lado. |
| `camille-riposte` | TOUCHÉ | ↓+CF › CFT › ↓+ESP (COUP D'ARRÊT) | segura em pé e fecha no COUP D'ARRÊT | A palavra da vitória dela ("Touché. Era o óbvio."). Seca, uma palavra, sem exclamação, como a CAMILLE. |
| `nila-gaja-elefante-pesado` | SEM ANESTESIA | SFT › ↓+SF › →+ESP (PASSO DO ELEFANTE) | GAJA · do soco forte ao PASSO DO ELEFANTE | A NILA provoca como quem dá diagnóstico ("Última sessão. Sem anestesia."). Na postura do elefante, o tratamento é pesado. |
| `nila-sarpa-bote-veloz` | DIAGNÓSTICO | CF › ↓+SF › ↓+CF › ESP (BOTE) | SARPA · três toques e o BOTE | Par do anterior: a serpente examina (três toques rápidos) e acha o ponto fraco por baixo. Fisioterapeuta, voz clínica. |
| `baatar-quebra-base-encadeado` | O CHÃO DECIDE | ↓+CF › CFT › ↓+ESP (QUEBRA-BASE) | segura em pé e fecha no QUEBRA-BASE | No bökh perde quem toca o chão, e ele abre a luta com "O chão decide". O fecho é o gancho de perna que derruba. |
| `baatar-esmagamento` | CAVALGADA | CF › SFT › SFT | empurra o rival para a parede | O peso que atravessa a estepe e só para na parede. Uma palavra, para um lutador de frases curtas. |
| `zenon-tributo-do-arconte` | A CONTA, CONVIDADO | ↓+SF › CFT › →+ESP (TRIBUTO) | segura em pé e cobra o tributo | O anfitrião que chama o rival de "convidado" e a energia de "tributo". O fecho cobra a energia: é a conta do jantar. |
| `zenon-decreto-cruzado` | SEU LUGAR À MESA | CF › SF › SFT | troca de lado com o rival | "Sente-se à minha mesa", diz ele na abertura. Trocar o rival de lado é o anfitrião mudando o convidado de lugar. |

Notas por lutador:

- **ZENON:** as fichas de chefão (`chefe`, `chefe2`) herdam os mesmos 2 combos. Na fase 2 o →+ESP é o DECRETO, não o TRIBUTO; por isso a
  linha de efeito diz "cobra o tributo" (o DECRETO também cobra) e não cita o nome do especial.
- **NILA:** a tela já põe a postura antes do efeito ("GAJA ·", "SARPA ·"), por isso a coluna mostra a linha inteira como aparece.

## Efeito: o que a tela mostra

Campo `efeito?: string` em `ComboProprio` (`src/data/tipos.ts:36`). Regras (`validarCombosProprios`, `src/data/combos-proprios.ts:23`):
texto de uma linha, sem espaço nas pontas, até `EFEITO_MAX_CARACTERES = 40` caracteres.

`combosDoLutador` (`src/ui/combos-tela.ts:111`) monta a linha de efeito assim:

- **`efeito` presente:** usa o texto do campo. É o caso dos **11 combos que fecham com especial**, todos com linha própria (ex.: "segura em
  pé e fecha no PASSO DO LEÃO"). "Segura em pé" marca o que o combo faz de diferente da cadeia universal: o chute forte do meio atordoa em
  vez de derrubar (`semQueda`).
- **sem `efeito`, com `final`:** usa o texto padrão do `final` ("lança o rival", "empurra o rival para a parede" ou "troca de lado com o
  rival"). São os **9 combos que terminam com golpe comum**.
- **sem nenhum dos dois:** "fecha com o especial" (não ocorre no commit, porque os 11 combos com especial têm `efeito`).

Na NILA, a tela põe a postura antes da linha ("GAJA ·", "SARPA ·"), porque a ficha da SARPA tem combo próprio e a tela etiqueta os grupos.
O dado guarda só o texto depois da postura.

Medida das linhas de efeito (Barlow 600 a 10 px, coluna do TREINO; a linha fica na altura das teclas, então divide o mesmo espaço do
nome): a menor folga é **20,6 px** ("GAJA · do soco forte ao PASSO DO ELEFANTE"). A versão "SARPA · três toques e o BOTE rasteiro" dava
13,4 px e foi cortada para "SARPA · três toques e o BOTE" (50,1 px). Medição registrada pelo Apolo; não reconferida nesta passada.

## Garantia

`tests/unit/combos-nomes.test.ts` (sem fixar o texto de nenhum nome): 20 combos; caixa alta, sem espaço sobrando; nomes únicos no jogo
(ignorando acento e pontuação); nenhum nome igual a um especial do próprio lutador; no máximo 24 caracteres e menos quando a faixa de
teclas é mais larga (conta de `desenharCombos` a 9 px por caractere). A prova com a fonte real continua em
`tests/e2e/combos-tela.spec.ts` (o nome não encosta nas teclas).
