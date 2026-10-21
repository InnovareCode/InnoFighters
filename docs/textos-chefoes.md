# Textos dos chefões: Os Cinco Selos

Autor: Apolo (direção de arte e texto) · 2026-10-21 · missão cmvilwfrq00ir01p79ce5aqcz · item **A1** da
`docs/spec-chefoes-progressivos-temas-e-dificuldade.md` (§2.1 enredo, §2.2 roteiro, §2.5 limites).

Este documento é a fonte do texto **até a transcrição** para `src/render/apresentacao-lutadores.ts` e telas (Lyra, L1/E1).
Depois dela, a fonte passa a ser o código, e este topo ganha a nota "transcrito em <data>; editar o .ts". **Transcreva do JSON
(§9)**: as tabelas e o JSON saem do mesmo dado, pelo mesmo script.

## 1. O enredo em uma página

**O anel do Arconte.** O ZENON, o Anfitrião, fundou o torneio há trinta anos, e o cinturão nunca ficou longe da casa dele. O
emblema do torneio é o anel-sinete que ele usa na mão direita: o mesmo anel que ele dispara no **SELO DO ARCONTE**. Selo, aqui,
tem o sentido de lacre: cada um dos **Cinco Selos** é um **pacto** que o Arconte lacrou com o anel. Ele deu a cada guardião
aquilo que o guardião mais queria, e em troca o guardião barra o caminho até a casa dele.

| Ordem | Guardião | Selo | O pacto (o que o Arconte deu) | O que o guardião testa | O que ele diz ao entregar |
|---|---|---|---|---|---|
| 1º | AMINU | a paciência | a bolsa que sustenta as tinturarias de Kano | quem sabe esperar a carga | "Quem esperou até aqui merece o selo." |
| 2º | CENTELLA | o público | a maior arena do mundo | quem dá espetáculo | "A arena gostou de você. Eu também." |
| 3º | CAMILLE | o tempo certo | o posto de juíza de quem chega até ele | quem não ataca cedo | "Vá. E não ataque no tempo dele." |
| 4º | NILA | as duas faces | acesso ao selo que drena energia, para estudá-lo | quem sabe trocar de postura | "Ele cobra. Eu ensinei. Agora vá." |
| 5º | BAATAR | o campeão | a promessa de uma revanche que nunca veio | quem tira o campeão do chão | "Faça o que eu não consegui." |

Derrotado, o guardião **desfaz o pacto**: entrega o selo e passa a lutar ao lado do jogador (o desbloqueio). Com os cinco selos
desfeitos, a casa do Anfitrião se abre. Vencido o ZENON, ele "se rende" à mesa, como um aliado de pouca confiança.

**Duas correções à premissa da spec §2.1** (que era rascunho, "o texto final é do Apolo"):

1. **CAMILLE não pode ter sido rival do ZENON "quando jovens":** ela tem 29 anos e ele 61 (`docs/proposta-expansao.md` §CAMILLE e
   `docs/proposta-novo-chefao.md` §1). A desconfiança fica, com outra raiz: ela recusa a tese dele de que todo estilo descende do
   pancrácio (a mesma da provocação dela, "Todo estilo descende do seu? Prove."). Guarda o selo para julgar quem chega até ele.
2. **O ZENON não "comprou" o torneio:** é o fundador (proposta do chefão §1). O BAATAR foi campeão de nove edições e o cinturão
   sempre voltou ao Arconte (provocações "Devolvi seu cinturão nove vezes" e "Décima vez, avarga"). O pacto dele é a revanche
   prometida que nunca veio; por isso o convite é "Faça o que eu não consegui".

## 2. Como ler

- ` †` no fim de um texto = **marca de revisão de nativo, não faz parte do texto** (o `†` nem é caractere permitido). Lista no §8.
  No JSON ela já saiu.
- Os títulos de campo são as chaves do contrato da spec §2.3: `aviso`, `avisoRodape`, `cartao` (`RoteiroDeEntrada.cartao`),
  `falas.entrada|fase2|vitoria|derrota`, `epilogo.quem|porque|convite`.
- **Campos que este documento acrescenta** (pedidos pela própria spec, sem chave definida nela):
  - `tituloHud`: o título curto do HUD, ≤ 16 (D-A5). Só difere do título do lutador nos três que passam de 16.
  - `vs`: o rótulo da tela de VS (§1.6 diz "ARCADE — O GUARDIÃO"). **Três guardiões são mulheres**: CENTELLA, CAMILLE e NILA
    levam "A GUARDIÃ". A identidade já está revelada no VS, então o gênero pode aparecer ali (no aviso e na seleção, não).
  - ZENON `avisoRevanche` (D-A3), `avisoRodapeRevanche` (opcional) e `desbloqueioTitulo`.
  - Textos comuns (§6): as linhas da seleção e o título do desbloqueio.
- `falas.entrada`: o código corta no **primeiro `". "`** (`entrada-chefe.ts:falaDaEntrada` e o desenho da faixa). A 1ª frase é a
  linha 1 e é tudo o que a entrada CURTA mostra; o resto é a linha 2. Por isso toda 1ª frase termina em ponto final (nunca em
  `!` ou `?`, que não cortariam), e nenhuma tem `...` antes do corte.
- Quem fala: `falas.*` e `epilogo.convite` são a voz do guardião. `epilogo.quem` e `epilogo.porque` são o narrador.

## 3. Regras e verificação

| Regra | Como foi conferido |
|---|---|
| Limites da §2.5: `aviso` ≤ 17 por linha; `avisoRodape` ≤ 56; `cartao` 14 / 18 / 20; `falas.entrada` ≤ 96 com a 1ª frase ≤ 46; `fase2` ≤ 28; `vitoria` ≤ 60; `derrota` ≤ 72; `epilogo.*` ≤ 56; seleção ≤ 48 por linha; ZENON `aviso` ≤ 17 | por script, 92 campos, 0 fora (contagem por code point, sem a marca †) |
| `tituloHud` ≤ 16 (D-A5) | por script |
| Limites que **não** estão na spec e que eu fixei como teto de partida: `vs` ≤ 22, título do desbloqueio ≤ 22 (o "NOVO LUTADOR LIBERADO!" de hoje) e ≤ 25 no pior nome ("CENTELLA SE JUNTA A VOCÊ!") | por script; **o de 25 é maior que o texto de hoje e precisa de medida** (§6) |
| Entrada: 2 frases, o corte em `". "`, a 1ª termina em ponto e a 2ª é uma frase só | por script |
| Avisos, cartão, HUD, VS e títulos em caixa alta | por script |
| Só Latin-1 mais — … “ ” ‘ ’; sem emoji | por script |
| Todo caractere existe nas duas fontes do jogo | por script, lendo o `cmap` de `barlow-600-latin.woff2` e `barlow-condensed-800-italic-latin.woff2`: 0 faltando (usados: ¡ Á Ã Ç É Ê Í Ú á ã ç é ê í ó õ ú —) |
| Nenhuma fala repete outra, nem as 4 falas e o aviso do ZENON que já estão no ar, nem as provocações de `src/data/provocacoes.pt-BR.ts` (fala inteira e frase a frase, sem acento, caixa e pontuação) | por script |
| Voz: sem exclamação na CAMILLE e no ZENON; "Plateia," só no AMINU (e ele usa); "público" e "¡" só na CENTELLA (e ela usa); BAATAR com 3 a 6 palavras por frase; nenhum guardião usa o vocabulário do ZENON (convidado, jantar, tributo, cortesia); todo guardião liga ao Arconte | por script |
| Aviso e seleção não revelam o gênero do guardião (a fila é secreta: "?" e "???") | por script nas linhas da seleção; manual no aviso (o sujeito é o selo, não a pessoa) |
| Fala dirigida ao jogador sem gênero (ele pode ser qualquer um dos 10) | manual, fala a fala |
| Nada religioso (E8), sem estereótipo, sem ofensa a origem, etnia, religião ou corpo; a máscara da CENTELLA nunca sai | manual, fala a fala |

O limite de caracteres é o guia de redação. **O portão de verdade é a medida em pixels no navegador (Lyra, skill
`medir-antes-de-afirmar`)**, como diz a própria §2.5. Os casos a medir primeiro estão no §10.

## 4. Os guardiões

### AMINU (`aminu`) · 1º selo, a paciência

> Showman bem-humorado do dambe: abre com "Plateia,", conta, pede barulho, exclama. Território: paciência, carga, lança, índigo de Kano. O selo dele é o da paciência, e a piada é que o homem mais barulhento do torneio guarda justamente ela.

| Campo | Texto | Caracteres |
|---|---|---|
| `aviso[0]` | O PRIMEIRO SELO | 15/17 |
| `aviso[1]` | NÃO TEM PRESSA | 14/17 |
| `avisoRodape` | Selo da paciência: 1 round, 2 barras de vida. | 45/56 |
| `cartao.nome` | AMINU | 5/14 |
| `cartao.titulo` | A LANÇA DE KANO | 15/18 |
| `cartao.rodape` | SELO DA PACIÊNCIA | 17/20 |
| `tituloHud` | A LANÇA DE KANO | 15/16 |
| `vs` | ARCADE — O GUARDIÃO | 19/22 |
| `falas.entrada` | Plateia, o primeiro selo é da paciência. / Índigo bom leva dias na cuba, e soco bom também! | 89/96 (1ª: 40/46) |
| `falas.fase2` | Plateia, carga máxima! | 22/28 |
| `falas.vitoria` | Pressa demais! O selo fica em Kano mais um pouco. | 49/60 |
| `falas.derrota` | Plateia, palmas! Soube esperar a hora. O primeiro selo é seu. | 61/72 |
| `epilogo.quem` | Aminu luta dambe para sustentar as tinturarias de Kano. | 55/56 |
| `epilogo.porque` | A bolsa do Arconte tem um preço: barrar os apressados. | 54/56 |
| `epilogo.convite` | Quem esperou até aqui merece o selo. E a minha lança! | 53/56 |

Batidas (§2.2, confirmadas): `block` (palma-escudo) → `sa0 → sa1` (carrega o MASHI) → `sa2` (segura o punho) + cartão e fala. Em `falas.entrada`, ` / ` mostra onde o código quebra a linha.

### CENTELLA (`centella`) · 2º selo, o público

> Promo de lucha libre: fala ao "público", ¡exclama!, heroína técnica. Território: arena, cordas, caídas, máscara (que nunca sai). Aceitou a arena do Arconte, mas não vende o público: só passa quem dá espetáculo.

| Campo | Texto | Caracteres |
|---|---|---|
| `aviso[0]` | O SEGUNDO SELO | 14/17 |
| `aviso[1]` | QUER ESPETÁCULO | 15/17 |
| `avisoRodape` | Selo do público: 1 round, 2 barras de vida. | 43/56 |
| `cartao.nome` | CENTELLA | 8/14 |
| `cartao.titulo` | A FAÍSCA DA ARENA | 17/18 |
| `cartao.rodape` | SELO DO PÚBLICO | 15/20 |
| `tituloHud` | A FAÍSCA | 8/16 |
| `vs` | ARCADE — A GUARDIÃ | 18/22 |
| `falas.entrada` | Público, o segundo selo quer espetáculo. / ¡A arena é do Arconte, mas o grito é meu! | 82/96 (1ª: 40/46) |
| `falas.fase2` | ¡Segunda caída, público! † | 24/28 |
| `falas.vitoria` | ¡Sem show, sem selo! O público pediu mais. | 42/60 |
| `falas.derrota` | ¡Que lucha, público! A máscara se curva: o segundo selo é seu. † | 62/72 |
| `epilogo.quem` | Centella faz lucha libre técnica, em terceira geração. † | 54/56 |
| `epilogo.porque` | Guarda o selo em troca da maior arena do mundo. | 47/56 |
| `epilogo.convite` | A arena gostou de você. Eu também. ¡Vamos! | 42/56 |

Batidas (§2.2, confirmadas): `jtop` (no ar, vindo da corda) → `land` → `win` (braços para o público) + cartão e fala. Em `falas.entrada`, ` / ` mostra onde o código quebra a linha.

### CAMILLE (`camille`) · 3º selo, o tempo certo

> Seca, analítica, nunca exclama. Território: tempo, assalto, toque, erro do rival. Guarda o selo para julgar quem chega ao Arconte, porque desconfia dele.

| Campo | Texto | Caracteres |
|---|---|---|
| `aviso[0]` | O TERCEIRO SELO | 15/17 |
| `aviso[1]` | ESCOLHE A HORA | 14/17 |
| `avisoRodape` | Selo do tempo certo: 1 round, 2 barras de vida. | 47/56 |
| `cartao.nome` | CAMILLE | 7/14 |
| `cartao.titulo` | A RIPOSTE † | 9/18 |
| `cartao.rodape` | SELO DO TEMPO CERTO | 19/20 |
| `tituloHud` | A RIPOSTE † | 9/16 |
| `vs` | ARCADE — A GUARDIÃ | 18/22 |
| `falas.entrada` | O terceiro selo é do tempo certo. / Quem ataca cedo demais não chega ao Arconte. | 78/96 (1ª: 33/46) |
| `falas.fase2` | Segundo assalto. Eu começo. | 27/28 |
| `falas.vitoria` | Atacou cedo demais. O selo continua comigo. | 43/60 |
| `falas.derrota` | Touché. Enfim alguém que espera o tempo certo. † | 46/72 |
| `epilogo.quem` | Camille trocou o florete pelo savate, não a precisão. | 53/56 |
| `epilogo.porque` | Não confia no Arconte. Julga quem merece chegar até ele. | 56/56 |
| `epilogo.convite` | Vá. E não ataque no tempo dele. | 31/56 |

Batidas (§2.2, confirmadas): `walk0-3` (entra pelo cais) → `block` ("en garde") → `hk1` (chute alto apresentado) + cartão e fala. Em `falas.entrada`, ` / ` mostra onde o código quebra a linha.

### NILA (`nila`) · 4º selo, as duas faces

> Serena, clínica (fisioterapeuta). Território: postura, respiração, consulta, alta. Estuda o selo que drena energia; a luta dela é uma aula de troca de postura antes do Arconte.

| Campo | Texto | Caracteres |
|---|---|---|
| `aviso[0]` | O QUARTO SELO | 13/17 |
| `aviso[1]` | TEM DUAS FACES | 14/17 |
| `avisoRodape` | Selo das duas faces: 1 round, 2 barras de vida. | 47/56 |
| `cartao.nome` | NILA | 4/14 |
| `cartao.titulo` | A LUA DE KERALA | 15/18 |
| `cartao.rodape` | SELO DAS DUAS FACES | 19/20 |
| `tituloHud` | A LUA DE KERALA | 15/16 |
| `vs` | ARCADE — A GUARDIÃ | 18/22 |
| `falas.entrada` | O quarto selo tem duas faces, como eu. / Aprenda a mudar antes que o Arconte esvazie você. | 88/96 (1ª: 38/46) |
| `falas.fase2` | Respire. Segunda consulta. | 26/28 |
| `falas.vitoria` | Uma postura só não basta. Lá na frente, isso custa caro. | 56/60 |
| `falas.derrota` | Alta concedida. Você aprendeu a mudar. O quarto selo é seu. | 59/72 |
| `epilogo.quem` | Nila é fisioterapeuta e mestra de kalaripayattu. | 48/56 |
| `epilogo.porque` | Estudou o selo que drena energia para ensinar a escapar. | 56/56 |
| `epilogo.convite` | Ele cobra. Eu ensinei. Agora vá. | 32/56 |

Batidas (§2.2, confirmadas): `idle0` (GAJA) → `crouch → sarpaIdle0` (SARPA) → `idle0` (volta a GAJA) + cartão e fala. Em `falas.entrada`, ` / ` mostra onde o código quebra a linha.

### BAATAR (`baatar`) · 5º selo, o antigo campeão

> Lacônico e gentil: frases de 3 a 6 palavras. Território: chão, céu, portão, firmeza. Campeão de nove edições; o cinturão sempre voltou ao Arconte. Guarda o último portão pela revanche que nunca teve.

| Campo | Texto | Caracteres |
|---|---|---|
| `aviso[0]` | O ÚLTIMO SELO | 13/17 |
| `aviso[1]` | É DE UM CAMPEÃO | 15/17 |
| `avisoRodape` | Último selo, o do campeão: 1 round, 2 barras de vida. | 53/56 |
| `cartao.nome` | BAATAR | 6/14 |
| `cartao.titulo` | O AVARGA † | 8/18 |
| `cartao.rodape` | SELO DO CAMPEÃO | 15/20 |
| `tituloHud` | O AVARGA † | 8/16 |
| `vs` | ARCADE — O GUARDIÃO | 19/22 |
| `falas.entrada` | Guardo o último selo. / Depois de mim, só o Arconte. | 50/96 (1ª: 21/46) |
| `falas.fase2` | Agora o chão é meu. | 19/28 |
| `falas.vitoria` | O portão segue fechado. Volte outro dia. | 40/60 |
| `falas.derrota` | Você me tirou do chão. Agora, tire o dele. | 42/72 |
| `epilogo.quem` | Baatar, o Avarga, venceu nove edições do torneio. † | 49/56 |
| `epilogo.porque` | Guarda o portão pela revanche que o Arconte nunca deu. | 54/56 |
| `epilogo.convite` | Faça o que eu não consegui. | 27/56 |

Batidas (§2.2, confirmadas): `devekh0` → `devekh1` → `devekh2` (a Dança da Águia inteira) + cartão e fala. Em `falas.entrada`, ` / ` mostra onde o código quebra a linha.

Notas de voz:

- **AMINU:** a entrada liga o índigo de Kano (as cubas de tingimento) à carga do MASHI; a fase 2 casa com `sa1 → sa3`.
- **CENTELLA:** a fase 2 é a "segunda caída" (na lucha libre a luta clássica é de duas de três quedas; a 2ª barra é a 2ª queda).
  "A máscara se curva" é a reverência sem tirar a máscara.
- **CAMILLE:** na fase 2 ela, que só responde, anuncia que agora ataca ("Eu começo"): é a virada do chefão dita em quatro palavras.
- **NILA:** "Alta concedida" é a alta médica (vencer a consulta). A entrada nomeia as duas formas que as batidas mostram.
- **BAATAR:** no bökh perde quem toca o chão. A derrota ("Você me tirou do chão. Agora, tire o dele.") passa ao jogador a
  luta que ele nunca venceu. A entrada é curta de propósito: a Dança da Águia é a fala dele. Se o dono quiser a dança sem
  nenhuma palavra, `falas.entrada: ''` já funciona (`fight.ts:162` lê `ap.falas?.entrada ?? ''`), mas aí a CURTA fica muda.

## 5. ZENON (`zenon`): só o que muda

As falas, o aviso da 1ª vez e o cartão do ZENON **não mudam** (estão no ar e nos testes da Z3). O que entra:

| Campo | Texto | Caracteres | Quando |
|---|---|---|---|
| `avisoRevanche[0]` | O ANFITRIÃO | 11/17 | ZENON já derrotado (D-A3) |
| `avisoRevanche[1]` | QUER REVANCHE | 13/17 | idem |
| `avisoRodape` | A última luta do torneio: 1 round, 2 barras de vida. | 52/56 | o texto de hoje, agora como dado |
| `avisoRodapeRevanche` (opcional) | A casa reabriu para você: 1 round, 2 barras de vida. | 52/56 | revanche; sem ele, vale o `avisoRodape` |
| `vs` | ARCADE — O ANFITRIÃO | 20/22 | VS do chefão final |
| `desbloqueioTitulo` | O ANFITRIÃO SE RENDE | 20/22 | cartão de desbloqueio (sem "!": o ZENON nunca levanta a voz, nem no título dele) |
| `epilogo.quem` | Por trinta anos, o cinturão não saiu da casa do Arconte. | 56/56 | desbloqueio |
| `epilogo.porque` | Os Cinco Selos eram pactos dele. Você desfez um por um. | 55/56 | idem |
| `epilogo.convite` | Sente-se do meu lado da mesa. Por enquanto. | 43/56 | idem (a voz dele: a mesa, a cortesia que ameaça) |

O epílogo do ZENON não está pedido na spec (§1.6 só troca o título), mas é o fecho dos Cinco Selos: proponho que o desbloqueio
dele use o mesmo formato de 3 linhas. Se a Lyra preferir manter a `desc` dele, basta não ler o campo.

## 6. Telas comuns

| Onde | Campo | Texto | Caracteres |
|---|---|---|---|
| Seleção, próximo guardião ("?") | `selecao.proximo[0]` | Guarda o próximo selo do torneio. | 33/48 |
| Seleção, próximo guardião ("?") | `selecao.proximo[1]` | Vença no fim do ARCADE para liberar. | 36/48 |
| Seleção, outros guardiões ("???") | `selecao.outros[0]` | Guarda um dos Cinco Selos. | 26/48 |
| Seleção, outros guardiões ("???") | `selecao.outros[1]` | A vez dessa luta ainda não chegou. | 34/48 |
| Seleção, ZENON oculto (`chefe-oculto`) | `selecao.anfitriao[0]` | Só recebe quem traz os Cinco Selos. | 35/48 |
| Seleção, ZENON oculto (`chefe-oculto`) | `selecao.anfitriao[1]` | Derrote-o para liberar. | 23/48 |
| Desbloqueio do guardião | `desbloqueioGuardiao` | {NOME} SE JUNTA A VOCÊ! | pior caso 25 (CENTELLA) |
| Desbloqueio, reserva | `desbloqueioGuardiaoReserva` | SELO ENTREGUE! | 14 |

- **Seleção:** as sugestões da spec ("Derrote-o para liberar") revelariam que o "?" é homem, e três guardiões são mulheres. As
  linhas acima não têm gênero. A do ZENON pode ter ("Derrote-o"): a casa dele já diz "O ANFITRIÃO". A linha antiga dele,
  "Aparece no fim do ARCADE.", deixa de ser verdade para quem ainda não tem os cinco selos; trocar também em `select.ts:617`,
  que repete o texto numa linha só.
- **Desbloqueio:** "CENTELLA SE JUNTA A VOCÊ!" tem 25 caracteres contra os 22 de "NOVO LUTADOR LIBERADO!" no mesmo `f.A` de
  46 px. Se não couber na medida, a reserva é **"SELO ENTREGUE!"** para os cinco (o nome já aparece grande logo abaixo, a 54 px).

## 7. Roteiro das entradas: confirmado

Confirmo as batidas da §2.2 sem troca. Conferi por script que **todas as poses citadas existem nos atlas** (`public/assets/lutadores/<id>/atlas.json`,
chave `quadros`): AMINU `block sa0-sa3`, CENTELLA `jtop land win`, CAMILLE `walk0-3 block hk1`, NILA `idle0 crouch sarpaIdle0`,
BAATAR `devekh0-2 win`. **Não olhei os quadros desenhados**: quem confirma que cada pose lê como a batida descreve é a captura da E1.

A fala entra na batida 3, com o cartão (tick 150), e cada 1ª frase foi escrita para fazer sentido sozinha na CURTA. A lista de
lacunas de arte da §2.6 continua a mesma (AMINU primeiro). Um ajuste de direção de arte para a Lyra: o cartão de hoje usa o
degradê e o contorno do ZENON (`#f0c8e6`, `#2a0418`); nos guardiões, o 2º tom do nome e o contorno devem vir do `accent` de cada um,
ou os cinco cartões vão parecer do Arconte.

## 8. Palavras de outro idioma (pedem revisão de nativo)

Nenhuma validada por falante nativo: **revisar antes de publicar**. Se alguma cair, a troca é por português sem mudar o sentido.

| Lutador | Termo | Onde | Língua e sentido | Troca se cair |
|---|---|---|---|---|
| CENTELLA | caída | `falas.fase2` | espanhol, "queda" (a fórmula da lucha libre "dos de tres caídas") | "¡Segunda queda, público!" |
| CENTELLA | lucha | `falas.derrota` | espanhol, "luta" (já usado nas provocações dela) | "¡Que luta, público!" |
| CENTELLA | lucha libre | `epilogo.quem` | espanhol, o nome do esporte | "Centella é técnica da luta livre, em terceira geração." (54) |
| CAMILLE | riposte | `cartao.titulo`, `tituloHud` | francês, resposta depois de aparar (esgrima); já é o título dela no jogo | — (é o nome do personagem) |
| CAMILLE | Touché | `falas.derrota` | francês, "tocado" (o reconhecimento do toque na esgrima) | "Ponto seu." |
| BAATAR | Avarga | `cartao.titulo`, `tituloHud`, `epilogo.quem` | mongol, o título de "titã" da luta bökh; já é o título dele no jogo | — (é o nome do personagem) |

Não marquei, por serem nomes já usados no jogo sem marca: dambe, savate, kalaripayattu, Kano, Kerala.

## 9. JSON (transcreva daqui)

`textosDosChefoes`: chave = id do lutador, campos na forma do contrato da spec §2.3 (`aviso` como `[linha1, linha2]`,
`cartao` como `CartaoDeEntrada`, `epilogo` como `{ quem, porque, convite }`). Sem a marca †. `{NOME}` em `desbloqueioGuardiao` vira o
`ch.name` do guardião.

```json
{
  "textosDosChefoes": {
    "aminu": {
      "aviso": [
        "O PRIMEIRO SELO",
        "NÃO TEM PRESSA"
      ],
      "avisoRodape": "Selo da paciência: 1 round, 2 barras de vida.",
      "cartao": {
        "nome": "AMINU",
        "titulo": "A LANÇA DE KANO",
        "rodape": "SELO DA PACIÊNCIA"
      },
      "tituloHud": "A LANÇA DE KANO",
      "vs": "ARCADE — O GUARDIÃO",
      "falas": {
        "entrada": "Plateia, o primeiro selo é da paciência. Índigo bom leva dias na cuba, e soco bom também!",
        "fase2": "Plateia, carga máxima!",
        "vitoria": "Pressa demais! O selo fica em Kano mais um pouco.",
        "derrota": "Plateia, palmas! Soube esperar a hora. O primeiro selo é seu."
      },
      "epilogo": {
        "quem": "Aminu luta dambe para sustentar as tinturarias de Kano.",
        "porque": "A bolsa do Arconte tem um preço: barrar os apressados.",
        "convite": "Quem esperou até aqui merece o selo. E a minha lança!"
      }
    },
    "centella": {
      "aviso": [
        "O SEGUNDO SELO",
        "QUER ESPETÁCULO"
      ],
      "avisoRodape": "Selo do público: 1 round, 2 barras de vida.",
      "cartao": {
        "nome": "CENTELLA",
        "titulo": "A FAÍSCA DA ARENA",
        "rodape": "SELO DO PÚBLICO"
      },
      "tituloHud": "A FAÍSCA",
      "vs": "ARCADE — A GUARDIÃ",
      "falas": {
        "entrada": "Público, o segundo selo quer espetáculo. ¡A arena é do Arconte, mas o grito é meu!",
        "fase2": "¡Segunda caída, público!",
        "vitoria": "¡Sem show, sem selo! O público pediu mais.",
        "derrota": "¡Que lucha, público! A máscara se curva: o segundo selo é seu."
      },
      "epilogo": {
        "quem": "Centella faz lucha libre técnica, em terceira geração.",
        "porque": "Guarda o selo em troca da maior arena do mundo.",
        "convite": "A arena gostou de você. Eu também. ¡Vamos!"
      }
    },
    "camille": {
      "aviso": [
        "O TERCEIRO SELO",
        "ESCOLHE A HORA"
      ],
      "avisoRodape": "Selo do tempo certo: 1 round, 2 barras de vida.",
      "cartao": {
        "nome": "CAMILLE",
        "titulo": "A RIPOSTE",
        "rodape": "SELO DO TEMPO CERTO"
      },
      "tituloHud": "A RIPOSTE",
      "vs": "ARCADE — A GUARDIÃ",
      "falas": {
        "entrada": "O terceiro selo é do tempo certo. Quem ataca cedo demais não chega ao Arconte.",
        "fase2": "Segundo assalto. Eu começo.",
        "vitoria": "Atacou cedo demais. O selo continua comigo.",
        "derrota": "Touché. Enfim alguém que espera o tempo certo."
      },
      "epilogo": {
        "quem": "Camille trocou o florete pelo savate, não a precisão.",
        "porque": "Não confia no Arconte. Julga quem merece chegar até ele.",
        "convite": "Vá. E não ataque no tempo dele."
      }
    },
    "nila": {
      "aviso": [
        "O QUARTO SELO",
        "TEM DUAS FACES"
      ],
      "avisoRodape": "Selo das duas faces: 1 round, 2 barras de vida.",
      "cartao": {
        "nome": "NILA",
        "titulo": "A LUA DE KERALA",
        "rodape": "SELO DAS DUAS FACES"
      },
      "tituloHud": "A LUA DE KERALA",
      "vs": "ARCADE — A GUARDIÃ",
      "falas": {
        "entrada": "O quarto selo tem duas faces, como eu. Aprenda a mudar antes que o Arconte esvazie você.",
        "fase2": "Respire. Segunda consulta.",
        "vitoria": "Uma postura só não basta. Lá na frente, isso custa caro.",
        "derrota": "Alta concedida. Você aprendeu a mudar. O quarto selo é seu."
      },
      "epilogo": {
        "quem": "Nila é fisioterapeuta e mestra de kalaripayattu.",
        "porque": "Estudou o selo que drena energia para ensinar a escapar.",
        "convite": "Ele cobra. Eu ensinei. Agora vá."
      }
    },
    "baatar": {
      "aviso": [
        "O ÚLTIMO SELO",
        "É DE UM CAMPEÃO"
      ],
      "avisoRodape": "Último selo, o do campeão: 1 round, 2 barras de vida.",
      "cartao": {
        "nome": "BAATAR",
        "titulo": "O AVARGA",
        "rodape": "SELO DO CAMPEÃO"
      },
      "tituloHud": "O AVARGA",
      "vs": "ARCADE — O GUARDIÃO",
      "falas": {
        "entrada": "Guardo o último selo. Depois de mim, só o Arconte.",
        "fase2": "Agora o chão é meu.",
        "vitoria": "O portão segue fechado. Volte outro dia.",
        "derrota": "Você me tirou do chão. Agora, tire o dele."
      },
      "epilogo": {
        "quem": "Baatar, o Avarga, venceu nove edições do torneio.",
        "porque": "Guarda o portão pela revanche que o Arconte nunca deu.",
        "convite": "Faça o que eu não consegui."
      }
    },
    "zenon": {
      "avisoRevanche": [
        "O ANFITRIÃO",
        "QUER REVANCHE"
      ],
      "avisoRodape": "A última luta do torneio: 1 round, 2 barras de vida.",
      "avisoRodapeRevanche": "A casa reabriu para você: 1 round, 2 barras de vida.",
      "vs": "ARCADE — O ANFITRIÃO",
      "desbloqueioTitulo": "O ANFITRIÃO SE RENDE",
      "epilogo": {
        "quem": "Por trinta anos, o cinturão não saiu da casa do Arconte.",
        "porque": "Os Cinco Selos eram pactos dele. Você desfez um por um.",
        "convite": "Sente-se do meu lado da mesa. Por enquanto."
      }
    }
  },
  "textosComuns": {
    "desbloqueioGuardiao": "{NOME} SE JUNTA A VOCÊ!",
    "desbloqueioGuardiaoReserva": "SELO ENTREGUE!",
    "selecao": {
      "proximo": [
        "Guarda o próximo selo do torneio.",
        "Vença no fim do ARCADE para liberar."
      ],
      "outros": [
        "Guarda um dos Cinco Selos.",
        "A vez dessa luta ainda não chegou."
      ],
      "anfitriao": [
        "Só recebe quem traz os Cinco Selos.",
        "Derrote-o para liberar."
      ]
    }
  }
}
```

## 10. O que medir no navegador primeiro (Lyra)

1. **Desbloqueio:** "CENTELLA SE JUNTA A VOCÊ!" (25) no `f.A` de 46 px, nas larguras de celular; se passar, usar a reserva.
2. **Faixa da entrada, linha 2:** a mais longa é a da NILA, "Aprenda a mudar antes que o Arconte esvazie você." (49), a 19 px. A do ZENON no ar tem 66, então deve caber; medir mesmo assim.
3. **Cartão:** `SELO DO TEMPO CERTO` e `SELO DAS DUAS FACES` (19) com o espaçamento letra a letra, contra o fio de ouro de 300 px.
4. **Aviso:** `QUER ESPETÁCULO`, `O PRIMEIRO SELO` e `O TERCEIRO SELO` (15) a 58 px, contra o "ESTÁ À SUA ESPERA" (17) de hoje.
5. **Legenda:** as derrotas mais longas são a da CENTELLA (62) e a do AMINU (61), numa linha só a 16 px (a do ZENON no ar tem 58).
