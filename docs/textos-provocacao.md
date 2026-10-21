# Textos de provocação: pré-round e vitória

> **Transcrito em 2026-10-21 para `src/data/provocacoes.pt-BR.ts`; editar o .ts.** Este documento fica como registro da autoria
> (Apolo) e do raciocínio de voz; a fonte de verdade das falas é o `.ts`. Mudou uma fala? Mude lá (a validação roda no boot).

Autor: Apolo (direção de arte e texto) · 1ª versão 2026-10-21 (missão cmvij55hc00a301p7blrd00lh) · reformatado e completado
2026-10-21 (missão cmvijlhqf00bk01p7w7dbyz8m) no formato da `docs/spec-provocacao-prerround-e-vitoria.md` §7.3, dentro dos
limites da §7.2.

Este documento é a fonte do texto **até a transcrição** para `src/data/provocacoes.pt-BR.ts` (fase P3, Vega). Depois dela, a
fonte de verdade passa a ser o `.ts`, e este topo ganha a nota "transcrito em <data>; editar o .ts".

## 1. Como ler os blocos (a transcrição é mecânica)

- Um bloco `## NOME (`id`)` por lutador, na ordem de `IDS_LUTADORES`. A linha `>` logo abaixo é só a voz (não é fala).
- Os títulos `###` são exatamente as chaves do tipo `FalasDeProvocacao`. **Cada item de lista é um balão.**
- ` / ` dentro de um item = `\n` (quebra escolhida pelo autor, no ponto de respiração da frase).
- ` †` no fim de um item = **marca de revisão de nativo, não faz parte do texto** (o `†` nem é caractere permitido). Lista no §3.
- `{rival}` é a única marcação: vira o `ch.name` do oponente (sempre em caixa alta, ex. "WEI LONG").
- Em `### contra: <id>`, os itens começam com `abertura:` ou `vitoria:` e viram `contra[id].abertura[]` / `contra[id].vitoria[]`.
- O JSON do §5 é a mesma coisa já limpa (sem `†`, com `\n`), gerado pelo mesmo script que gerou os blocos. **Transcreva do JSON.**

**O que cada chave significa aqui** (precedência da spec §7.1):

| Chave | Quando sai | Escrito para |
|---|---|---|
| `abertura` | round 1 | provocar antes do primeiro golpe; serve contra qualquer rival |
| `revanche` | round ≥ 2, fala **quem perdeu o round anterior** | reação de quem acabou de perder um round: orgulho ferido, nunca derrota |
| `decisivo` | round final (os dois a 1 vitória do fim) | "tudo ou nada"; não supõe quem estava na frente |
| `vitoria` | fim da luta, quem venceu | provocação de vitória genérica |
| `vitoriaPerfeita` | venceu com `perfect` | fala da limpeza do round final; nenhuma afirma "a luta inteira sem dano" |
| `vitoriaPorTempo` | venceu no relógio | o tempo acabou e ele estava na frente |
| `contra: zenon` (9 lutadores) | rival é o ZENON (chefão ou jogável) | abertura e vitória dirigidas ao Arconte |
| `contra: <id>` (no ZENON) | ZENON contra cada um, e o espelho | a `vitoria` é o **balão do chefão quando ele vence** (decisão do dono); por isso cada rival tem 2 variantes, para o jogador que tenta de novo não ler a mesma fala duas vezes seguidas |

## 2. Regras e verificação

| Regra | Conferido |
|---|---|
| `abertura`, `vitoria*`, `contra.*`: até 2 linhas, até 34 caracteres por linha, até 64 no total (alvo 40-56) | por script: maior linha 31, maior fala 51, 0 fora do limite |
| `revanche`, `decisivo`: 1 linha, até 34 (alvo 20-30) | por script, 0 fora do limite |
| `{rival}` conta 8 caracteres (WEI LONG, CENTELLA) | por script, nas 10 falas que o usam |
| Mínimos: abertura 3, revanche 2, vitória 3, para cada id de `IDS_LUTADORES` | por script; ids lidos de `src/core/contratos.ts` e conferidos contra `src/data/lutadores` |
| Só Latin-1 mais — … “ ” ‘ ’; sem emoji; só o token `{rival}` | por script |
| Todo caractere usado existe na fonte do balão | por script, lendo o `cmap` de `public/assets/fontes/barlow-600-latin.woff2` (usados: ¡ É Í Ó Ú à á â ã ç é ê í ó ô õ ú) |
| Nenhuma fala repete outra (comparação sem acento, caixa e pontuação) | por script, 232 falas |
| Fala genérica sem gênero do rival (ele, ela, menino...) | por script; gênero só em `contra` |
| Sem exclamação em WEI LONG, CAMILLE e ZENON; "Plateia," só no AMINU; "público" só na CENTELLA | por script |
| Sem palavrão, sem ofensa a origem, etnia, religião ou corpo; alvo é a técnica, a pressa, a guarda, o resultado | revisão manual, fala a fala |
| A máscara da CENTELLA nunca sai; a Dança da Águia do BAATAR segue sem fala | revisão manual |

O limite de caracteres é o guia de redação. O portão de verdade é a medida em pixels da spec §10 item 11 (≤ 372 px por linha em
`FB(20)`), que é da Íris no navegador. A maior linha tem 31 caracteres (as com `{rival}` contadas a 8). Os casos a medir primeiro são as linhas com `{rival}` = WEI LONG ou CENTELLA, em caixa alta, que são as mais largas em pixels.

**Contagem por lutador** (total: 232 balões, 41 com †):

| id | abertura | revanche | decisivo | vitoria | vitoriaPerfeita | vitoriaPorTempo | contra (balões) |
|---|---|---|---|---|---|---|---|
| `hayato` | 4 | 4 | 3 | 4 | 2 | 2 | 2 |
| `wei-long` | 4 | 4 | 3 | 4 | 2 | 2 | 2 |
| `min-ji` | 4 | 3 | 3 | 4 | 2 | 2 | 2 |
| `caio` | 4 | 4 | 2 | 4 | 2 | 2 | 2 |
| `aminu` | 4 | 4 | 2 | 4 | 2 | 2 | 2 |
| `centella` | 4 | 4 | 3 | 4 | 2 | 2 | 2 |
| `camille` | 4 | 4 | 3 | 4 | 2 | 2 | 2 |
| `nila` | 4 | 4 | 2 | 4 | 2 | 2 | 2 |
| `baatar` | 4 | 4 | 2 | 4 | 2 | 2 | 2 |
| `zenon` | 4 | 5 | 2 | 4 | 2 | 2 | 29 |

**Territórios de voz (o teste de cegueira: tapar o nome e saber quem falou).**

| Lutador | Território exclusivo | Pontuação | Registro |
|---|---|---|---|
| HAYATO | trovão, raio, estrondo, rapidez | ponto e exclamação curtos | jovem, direto |
| WEI LONG | montanha, ferro, raiz, chá, lição | nunca exclamação | sentencioso, mestre |
| MIN-JI | placar, nota, ponto, chute, revanche | muita exclamação | alegre, esportivo |
| CAIO | roda, ginga, jogo, berimbau, camará | coloquial (tá, pra, né) | malandro carioca |
| AMINU | "Plateia,", nível, carga, lança, escudo, índigo | exclamação de showman | bem-humorado |
| CENTELLA | público, cordas, lona, voo, máscara, abuela, caídas | ¡exclamação! | promo de luta livre |
| CAMILLE | erro, toque, assalto, plano; termos de esgrima | nunca exclamação | seco, analítico |
| NILA | ponto, respiração, postura, consulta, serpente, elefante | calma | clínico, sereno |
| BAATAR | chão, céu, estepe, firme, de pé | frases de 3 a 6 palavras | gentil, lacônico |
| ZENON | casa, convidado, mesa, jantar, tributo, cortesia, ilha | elegante, sem exclamação | anfitrião cruel |

## HAYATO (`hayato`)

> O Punho do Trovão · Japão · karatê · ~24 anos. Jovem, confiante, frases de impacto. Mede tudo em velocidade e trovão. Nunca filosofa, nunca fala com a plateia.

### abertura
- Ikuzo! O trovão não / espera ninguém. †
- Treinei sozinho por isso. / Não me decepcione.
- Pisca, e já acabou.
- Pronto, {rival}? / O raio cai uma vez só.
### revanche
- Agora eu esquentei.
- Outro raio? Tenho de sobra.
- Esse round é meu.
- Errei uma vez. Não erro duas.
### decisivo
- Último round. Último raio.
- Um trovão decide. O meu.
- Guarda alta. Lá vou eu.
### vitoria
- Rápido demais pra você? / Volta quando trovejar.
- Nem precisei do / segundo raio.
- Treina mais. Eu continuo / esperando no topo.
- Ouviu o estrondo? / Foi você caindo.
### vitoriaPerfeita
- Nem me tocou. / Rápido demais, eu disse.
- Raio não se pega. / Agora você sabe.
### vitoriaPorTempo
- Faltou tempo pra você. / Pra mim, sobrou.
- Tempo esgotado? / Eu ainda tinha raio.
### contra: zenon
- abertura: Sua ilha, suas regras. / Meu trovão.
- vitoria: Seu cinturão agora mora / no dojo do meu avô.

## WEI LONG (`wei-long`)

> O Dragão de Ferro · China · kung fu · ~65 anos. Mestre sentencioso: trata a luta como aula. Montanha, ferro, raiz, chá, dragão. Nunca usa gíria nem exclamação.

### abertura
- Lái ba. A montanha não / se move por você. †
- Respire fundo. Depois / não haverá tempo.
- Ferro se forja devagar. / Você vai sentir cada golpe.
- {rival}, a aula começa. / Tome notas.
### revanche
- O chá ainda nem esfriou.
- Paciência. A palma vem.
- Um tropeço não move montanha.
- Mais uma lição, então.
### decisivo
- A última lição é a mais longa.
- Agora, o ferro decide.
- Ainda de pé? Bom sinal.
### vitoria
- Volte daqui a dez anos. / Traga um professor.
- O dragão nem acordou / direito.
- Pressa é para quem / não tem raízes.
- Lição encerrada. / Pode se curvar ao sair.
### vitoriaPerfeita
- Nenhum golpe tocou o mestre. / Anote isso.
- A montanha nem tremeu.
### vitoriaPorTempo
- O tempo acabou. A lição / continua amanhã.
- Paciência vence o relógio. / Sempre venceu.
### contra: zenon
- abertura: Vi este torneio nascer. / Hoje o vejo mudar de mãos.
- vitoria: Seu mármore racha, Arconte. / O ferro, não.

## MIN-JI (`min-ji`)

> A Tempestade de Seul · Coreia do Sul · taekwondo · ~22 anos. Campeã alegre e rápida, arrogância brincalhona de pódio. Placar, nota, ponto, revanche. Muita exclamação, nunca rancor.

### abertura
- Gaja! Tenta acompanhar / meus pés. †
- Três chutes por segundo. / Conta comigo!
- Sorria! Vai ser rapidinho.
- Placar zerado, {rival}! / Por pouco tempo.
### revanche
- Hwaiting! Eu, não você. †
- Ponto seu? Sorte. Agora é meu!
- Mais alto? Pode deixar.
### decisivo
- Ponto decisivo! Adoro isso!
- Desempate! Melhor parte!
- Cansou? Eu nem suei.
### vitoria
- Nota dez pro chute. / Zero pra sua guarda.
- Viu? Nem precisei / do terceiro chute.
- Bom treino! Pra mim.
- Pede revanche. Eu adoro / revanche.
### vitoriaPerfeita
- Round perfeito! / Nota máxima, sem desconto!
- Nem encostou! / Recorde pessoal!
### vitoriaPorTempo
- Venci no placar! / Conta os pontos, conta!
- Acabou o tempo! / O placar não mente!
### contra: zenon
- abertura: Dono do torneio? Legal. / Eu sou dona do placar.
- vitoria: Hwaiting! O cinturão vai / pra academia de Seul. †

## CAIO (`caio`)

> Mestre da Ginga · Brasil · capoeira · ~25 anos. Malandro boa-praça da roda do Rio: luta é "jogo", rival é "camará". Único com registro coloquial (tá, pra, né, bora).

### abertura
- Bora jogar, camará? / A roda tá aberta. †
- Quem não ginga, apanha. / Simples assim.
- Relaxa. Vai doer / com estilo.
- Chega mais, {rival}. / A ginga tá te esperando.
### revanche
- O berimbau mudou o toque.
- Agora é jogo de dentro.
- Achou que tinha acabado?
- Tomei uma? Faz parte da roda.
### decisivo
- Agora o jogo fica bom, camará. †
- Ih, tá nervoso? Ginga!
### vitoria
- Iê! Volta pra roda / quando aprender a gingar. †
- Nem viu de onde veio, / né, camará? †
- Malandragem não se treina. / Se vive.
- Valeu o jogo. Pena que / você só assistiu.
### vitoriaPerfeita
- Ginga limpa, camará. / Não pegou nenhuma. †
- Saí da roda sem / um arranhão. Iê! †
### vitoriaPorTempo
- Deu o tempo, camará. / Ganhei no jogo. †
- Parou o berimbau. / E eu tava na frente.
### contra: zenon
- abertura: Mansão bonita, chefe. / Cabe uma roda aqui?
- vitoria: A roda é de todo mundo. / O cinturão também.

## AMINU (`aminu`)

> A Lança de Kano · Nigéria · dambe · 26 anos. Showman bem-humorado: fala com a "Plateia", conta, pede barulho. Dambe é esporte de elite. Nível, carga, lança, escudo, índigo.

### abertura
- Sannu! Bem-vindo à / minha mão de lança. †
- Plateia, contem até três. / No três, acabou.
- Defende à vontade. / Meu soco gosta de esperar.
- Plateia, conheçam {rival}! / Agora, se despeçam.
### revanche
- Kai! Esse doeu, né? †
- A carga tá subindo...
- Escudo na frente, lança atrás.
- Plateia, mais barulho!
### decisivo
- Nível três guardado pra agora!
- Plateia, agora é pra valer!
### vitoria
- Isso foi o nível um. / Quer ver o três?
- Índigo não sai na lavagem. / Esse soco também não.
- Briga de feira? Isso foi / esporte de elite.
- Yauwa! Palmas pra quem / ficou de pé um tempo. †
### vitoriaPerfeita
- Plateia, viram algum golpe / em mim? Nem eu!
- Escudo intacto! / O índigo saiu sem mancha!
### vitoriaPorTempo
- Plateia, o relógio parou! / A lança, não.
- Tempo! E a carga ainda / tava no nível dois.
### contra: zenon
- abertura: Cobra tributo, é? Hoje / a conta vem de Kano.
- vitoria: Kai! O dono caiu. / Plateia, isso é dambe! †

## CENTELLA (`centella`)

> A Faísca da Arena · México · lucha libre · técnica, 3ª geração. Promo de luta livre: fala ao "público", heroína técnica contra vilão. Cordas, lona, voo, máscara, abuela, ¡exclamação! A máscara nunca sai.

### abertura
- ¡Órale, público! Hoje / a faísca vira incêndio. †
- Três gerações de lucha / contra uma só. Boa sorte.
- As cordas são minhas. / O canto é seu.
- ¡Público, recebam {rival}! / Vai durar pouco.
### revanche
- ¡Arriba! Ainda tenho corda. †
- A lona chama seu nome.
- Mais alto, público!
- Caí. A técnica sempre levanta!
### decisivo
- ¡Dos de tres caídas, público! †
- Agora vem o voo.
- Do alto das cordas. Agora.
### vitoria
- ¡Uno, dos, tres! Já pode / se levantar. †
- Essa vai pra você, abuela. †
- A máscara fica. / O cinturão vem comigo.
- Os técnicos sempre / vencem no final.
### vitoriaPerfeita
- ¡Nem tocou na máscara! / Público, isso é técnica!
- Lona limpa, cordas minhas. / ¡Perfecto! †
### vitoriaPorTempo
- ¡Tiempo! O público já / tinha escolhido. †
- O sino tocou, e a faísca / ainda brilhava.
### contra: zenon
- abertura: Lá em casa, o vilão / sempre perde no final.
- vitoria: ¡Órale! A plateia agora / é minha, Arconte. †

## CAMILLE (`camille`)

> A Riposte de Marselha · França · savate · 29 anos. Cerebral, seca, comenta o erro do rival como professora de esgrima. Ponto final, nunca exclamação: a frieza é a provocação.

### abertura
- En garde. E, por favor, / ataque primeiro. †
- Já vi seus três golpes. / Nenhum me preocupa.
- Ataque quando quiser. / Eu respondo antes.
- {rival}. Mostre o primeiro / erro. Não tenho pressa.
### revanche
- Anotado. Próximo.
- Seu ombro avisa o golpe.
- Um ponto seu. Entendi o resto.
- Paciência. Você vai errar.
### decisivo
- Último assalto. Mesma precisão.
- Agora, a riposte certa. †
- Mesmo erro. De novo.
### vitoria
- Touché. Era o óbvio. †
- Atacou na hora errada. / Como eu previ.
- Seu golpe mais forte? / Foi o meu, de volta.
- Voilà. Volte com / um plano. †
### vitoriaPerfeita
- Parade, riposte, fim. / Limpo como na aula. †
- Imaculado. Seu ataque / nunca chegou.
### vitoriaPorTempo
- Cronômetro zerado. / Dois toques à frente.
- Venci no relógio. / Também é esgrima.
### contra: zenon
- abertura: Todo estilo descende do / seu? Prove. En garde. †
- vitoria: Riposte. Até o dono / do torneio ataca mal. †

## NILA (`nila`)

> A Lua de Kerala · Índia · kalaripayattu · 31 anos. Serena e clínica (fisioterapeuta, pontos marma): provoca como quem dá diagnóstico. Respiração, postura, elefante, serpente. Ponto fraco é técnico, nunca o corpo.

### abertura
- Respire. Vou achar seu / ponto fraco com calma.
- Elefante ou serpente? / Você escolhe como cair.
- Vaa. Já sei onde dói. †
- {rival}, sua postura / já me contou tudo.
### revanche
- Sua respiração te entrega.
- Mudo a postura. E você?
- Um ponto marma por vez. †
- Diagnóstico revisto. Continue.
### decisivo
- Calma. Ainda nem comecei.
- Última sessão. Sem anestesia.
### vitoria
- Gelo e repouso. / Volte quando sarar.
- Não doeu tanto. / Eu escolhi o ponto.
- Mathi. Já basta por hoje. †
- Previsível. A serpente / viu tudo.
### vitoriaPerfeita
- A serpente não se pega. / Você tentou.
- Respiração em ordem. / A sua, nem tanto.
### vitoriaPorTempo
- Fim da consulta. / O tempo deu o diagnóstico.
- Não precisei terminar. / O tempo terminou por mim.
### contra: zenon
- abertura: Sua guarda tem um ponto / que nunca curou, Arconte.
- vitoria: Repouso, Arconte. Seu / torneio precisa de cura.

## BAATAR (`baatar`)

> O Avarga das Estepes · Mongólia · bökh · 44 anos. Gentil, lacônico, frases de 3 a 6 palavras. Céu, chão, estepe, firme. No bökh perde quem toca o chão. O peso vem da serenidade. A Dança da Águia segue sem fala.

### abertura
- Za. Mostre o que trouxe. †
- Só os pés tocam o chão. / Os seus, por enquanto.
- O céu é grande. / O chão está perto.
- {rival}. Bom adversário. / O chão decide.
### revanche
- Ainda de pé. Bom.
- A estepe não tem pressa.
- Venha. Eu espero.
- Caí uma vez. Basta.
### decisivo
- Segure firme. Vou puxar.
- Agora, só um fica de pé.
### vitoria
- Você lutou bem. / O chão lutou melhor.
- Levante. Aperte minha mão. / Volte mais forte.
- Nove edições invicto. / Hoje não foi diferente.
- Força tem. Falta raiz.
### vitoriaPerfeita
- Nem me tirou do lugar.
- Meus pés nunca saíram / do chão.
### vitoriaPorTempo
- O sol se pôs. / Eu continuei de pé.
- Tempo. Eu ainda / estava firme.
### contra: zenon
- abertura: Devolvi seu cinturão nove / vezes. Hoje, não.
- vitoria: A estepe não tem dono. / O torneio também não.

## ZENON (`zenon`)

> O Arconte · Grécia · pancrácio · 61 anos · chefão. Anfitrião elegante e cruel: rival é "convidado", luta é jantar, energia é "tributo". Nunca levanta a voz nem usa exclamação.

### abertura
- Kalós írthes. Sente-se / à minha mesa. †
- Meu torneio, minha ilha. / Sua última luta.
- Pode atacar primeiro. / É cortesia da casa.
- {rival}. Finalmente. / A casa estava à sua espera.
### revanche
- Encantador. Continue.
- Seu tributo, por favor.
- A casa cobra no final.
- Uma cortesia. Não se repetirá.
- O jantar nem começou.
### decisivo
- Sirvam a última rodada.
- Agora, o prato principal.
### vitoria
- Aplausos para o convidado. / A saída é pelos fundos.
- Obrigado pela energia. / Guardarei com carinho.
- Todo estilo volta para / casa. A minha.
- O prazer foi todo meu. / Literalmente.
### vitoriaPerfeita
- Nem amassou meu casaco. / Que convidado discreto.
- Nenhuma mancha na toalha. / Volte sempre.
### vitoriaPorTempo
- O relógio é meu também. / Como tudo nesta ilha.
- Fim do jantar. / A conta fica com você.
### contra: hayato
- abertura: Trovão bonito. Aqui, eu / decido quando chove.
- vitoria: Volte ao dojo, menino. / O trovão é meu agora.
- vitoria: Seu avô treinou bem você. / Eu treinei melhor.
### contra: wei-long
- abertura: Wei, meu velho rival. / Ainda de pé, que honra.
- vitoria: O ferro dobra, Wei. / Basta o fogo certo.
- vitoria: Envelheceu bem, Wei. / Mas envelheceu.
### contra: min-ji
- abertura: Tantos chutes. Cada um / me paga um tributo.
- vitoria: Nota dez na pressa. / Zero no resultado.
- vitoria: Revanche? Claro. A casa / adora clientes fiéis.
### contra: caio
- abertura: Uma roda na minha casa? / Aqui, o ritmo é meu.
- vitoria: Bela ginga. Eu cobro / o ingresso da roda.
- vitoria: A ginga cansa. / O anfitrião, não.
### contra: aminu
- abertura: Pode carregar à vontade. / Eu cobro em dobro.
- vitoria: Lança quebrada, escudo / no chão. Próximo.
- vitoria: Nível três? A casa / cobra nível dez.
### contra: centella
- abertura: Sua plateia é minha / esta noite, luchadora. †
- vitoria: Linda máscara. Guarde-a / para o próximo ano.
- vitoria: Três gerações de lucha. / Uma tarde comigo.
### contra: camille
- abertura: Esgrima e savate. Que / elegância. Que pena.
- vitoria: Riposte elegante. / Pena que veio de mim. †
- vitoria: Touché, Camille. Desta / vez, a lição foi minha. †
### contra: nila
- abertura: Uma terapeuta na minha / arena. Que conveniente.
- vitoria: Sem pontos fracos, Nila? / Acabo de achar o seu.
- vitoria: Diagnóstico, doutora? / Excesso de confiança.
### contra: baatar
- abertura: O guardião do meu cinturão / quer ser o dono?
- vitoria: Volte para a estepe, / avarga. O cinturão fica. †
- vitoria: Décima vez, avarga. / O cinturão volta para mim. †
### contra: zenon
- abertura: Um espelho? Só cabe / um anfitrião nesta casa.
- vitoria: Dois anfitriões era / demais. Ficou um.

## 3. Palavras de outro idioma (pedem revisão de nativo)

Todas são palavras comuns, de uso esportivo ou de saudação, escolhidas para não ter carga religiosa ou política. Nenhuma foi
validada por falante nativo: **revisar antes de publicar**. Se alguma cair, a troca é por português sem mudar o sentido
(ex.: "Ikuzo!" vira "Vamos!") e sem passar dos limites do §2.

| Lutador | Termo | Língua e sentido |
|---|---|---|
| HAYATO | Ikuzo! | japonês 行くぞ, "lá vou eu / vamos" |
| WEI LONG | Lái ba | mandarim 来吧, "venha" |
| MIN-JI | Gaja! | coreano 가자, "vamos" |
| MIN-JI | Hwaiting! | coreano 화이팅, "força!" (vem do inglês "fighting"; uso corrente na Coreia) |
| CAIO | camará, Iê! | capoeira (pt-BR); o "Iê!" é o chamado da roda, conferir se cabe como grito de vitória |
| AMINU | Sannu! | hauçá, saudação "olá" |
| AMINU | Kai! | hauçá, interjeição de espanto |
| AMINU | Yauwa! | hauçá, "muito bem / isso!" |
| CENTELLA | ¡Órale!, ¡Arriba!, ¡Uno, dos, tres!, abuela | espanhol do México; "¡Órale!" é coloquial mexicano |
| CENTELLA | ¡Dos de tres caídas! | espanhol, a fórmula "duas de três quedas" da lucha libre (novo) |
| CENTELLA | ¡Perfecto!, ¡Tiempo! | espanhol, "perfeito" e "tempo" (novos) |
| CENTELLA / ZENON | luchadora | espanhol, "lutadora" (só em fala dirigida a ela) |
| CAMILLE / ZENON | En garde, Touché, Riposte, Voilà, Parade | francês, termos de esgrima de uso internacional ("Parade" também é o nome do golpe dela) |
| NILA | Vaa | malaiala വാ, "venha" |
| NILA | Mathi | malaiala മതി, "basta" |
| NILA | marma | pontos vitais do kalari (já usado no jogo: GOLPE MARMA) |
| BAATAR | Za | mongol За, "bem / certo" (abre a fala como um aceno) |
| ZENON | avarga | mongol, o título de "titã" (já usado no jogo) |
| ZENON | Kalós írthes | grego Καλώς ήρθες, "bem-vindo" |

## 4. Notas para quem implementa

- **ZENON chefão vencendo:** usa o balão novo com `zenon.contra[perdedor].vitoria` (decisão do dono); a legenda antiga de vitória
  dele deixa de aparecer. O texto de `APRESENTACAO.zenon.falas.vitoria` é igual ao 1º item de `zenon.vitoria` ("Aplausos para o
  convidado..."), mas a legenda dele não é mais exibida nessa situação. A spec (§5 linha "Luta de chefão" e D-P3) foi alinhada em 2026-10-21.
- **Pré-round do chefão:** não tem balão (spec §5); as `contra[id].abertura` do ZENON saem quando ele é **jogável**.
- **Ordem em diálogo (round 1):** as aberturas contra o ZENON foram escritas para funcionar nas duas ordens.
- **`decisivo`:** todos os 10 têm; a regra "ausente usa `revanche`" fica para lutador novo.
- Os textos não dependem de pose: funcionam com o `win` provisório e com os quadros `provoca0/1` quando existirem (spec §6).

## 5. JSON (fonte para `src/data/provocacoes.pt-BR.ts`)

Forma: `Record<IdLutador, FalasDeProvocacao>` da spec §7.1, chaves na ordem de `IDS_LUTADORES`. Gerado pelo mesmo script dos
blocos acima; os dois são idênticos.

```json
{
  "hayato": {
    "abertura": [
      "Ikuzo! O trovão não\nespera ninguém.",
      "Treinei sozinho por isso.\nNão me decepcione.",
      "Pisca, e já acabou.",
      "Pronto, {rival}?\nO raio cai uma vez só."
    ],
    "revanche": [
      "Agora eu esquentei.",
      "Outro raio? Tenho de sobra.",
      "Esse round é meu.",
      "Errei uma vez. Não erro duas."
    ],
    "decisivo": [
      "Último round. Último raio.",
      "Um trovão decide. O meu.",
      "Guarda alta. Lá vou eu."
    ],
    "vitoria": [
      "Rápido demais pra você?\nVolta quando trovejar.",
      "Nem precisei do\nsegundo raio.",
      "Treina mais. Eu continuo\nesperando no topo.",
      "Ouviu o estrondo?\nFoi você caindo."
    ],
    "vitoriaPerfeita": [
      "Nem me tocou.\nRápido demais, eu disse.",
      "Raio não se pega.\nAgora você sabe."
    ],
    "vitoriaPorTempo": [
      "Faltou tempo pra você.\nPra mim, sobrou.",
      "Tempo esgotado?\nEu ainda tinha raio."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Sua ilha, suas regras.\nMeu trovão."
        ],
        "vitoria": [
          "Seu cinturão agora mora\nno dojo do meu avô."
        ]
      }
    }
  },
  "wei-long": {
    "abertura": [
      "Lái ba. A montanha não\nse move por você.",
      "Respire fundo. Depois\nnão haverá tempo.",
      "Ferro se forja devagar.\nVocê vai sentir cada golpe.",
      "{rival}, a aula começa.\nTome notas."
    ],
    "revanche": [
      "O chá ainda nem esfriou.",
      "Paciência. A palma vem.",
      "Um tropeço não move montanha.",
      "Mais uma lição, então."
    ],
    "decisivo": [
      "A última lição é a mais longa.",
      "Agora, o ferro decide.",
      "Ainda de pé? Bom sinal."
    ],
    "vitoria": [
      "Volte daqui a dez anos.\nTraga um professor.",
      "O dragão nem acordou\ndireito.",
      "Pressa é para quem\nnão tem raízes.",
      "Lição encerrada.\nPode se curvar ao sair."
    ],
    "vitoriaPerfeita": [
      "Nenhum golpe tocou o mestre.\nAnote isso.",
      "A montanha nem tremeu."
    ],
    "vitoriaPorTempo": [
      "O tempo acabou. A lição\ncontinua amanhã.",
      "Paciência vence o relógio.\nSempre venceu."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Vi este torneio nascer.\nHoje o vejo mudar de mãos."
        ],
        "vitoria": [
          "Seu mármore racha, Arconte.\nO ferro, não."
        ]
      }
    }
  },
  "min-ji": {
    "abertura": [
      "Gaja! Tenta acompanhar\nmeus pés.",
      "Três chutes por segundo.\nConta comigo!",
      "Sorria! Vai ser rapidinho.",
      "Placar zerado, {rival}!\nPor pouco tempo."
    ],
    "revanche": [
      "Hwaiting! Eu, não você.",
      "Ponto seu? Sorte. Agora é meu!",
      "Mais alto? Pode deixar."
    ],
    "decisivo": [
      "Ponto decisivo! Adoro isso!",
      "Desempate! Melhor parte!",
      "Cansou? Eu nem suei."
    ],
    "vitoria": [
      "Nota dez pro chute.\nZero pra sua guarda.",
      "Viu? Nem precisei\ndo terceiro chute.",
      "Bom treino! Pra mim.",
      "Pede revanche. Eu adoro\nrevanche."
    ],
    "vitoriaPerfeita": [
      "Round perfeito!\nNota máxima, sem desconto!",
      "Nem encostou!\nRecorde pessoal!"
    ],
    "vitoriaPorTempo": [
      "Venci no placar!\nConta os pontos, conta!",
      "Acabou o tempo!\nO placar não mente!"
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Dono do torneio? Legal.\nEu sou dona do placar."
        ],
        "vitoria": [
          "Hwaiting! O cinturão vai\npra academia de Seul."
        ]
      }
    }
  },
  "caio": {
    "abertura": [
      "Bora jogar, camará?\nA roda tá aberta.",
      "Quem não ginga, apanha.\nSimples assim.",
      "Relaxa. Vai doer\ncom estilo.",
      "Chega mais, {rival}.\nA ginga tá te esperando."
    ],
    "revanche": [
      "O berimbau mudou o toque.",
      "Agora é jogo de dentro.",
      "Achou que tinha acabado?",
      "Tomei uma? Faz parte da roda."
    ],
    "decisivo": [
      "Agora o jogo fica bom, camará.",
      "Ih, tá nervoso? Ginga!"
    ],
    "vitoria": [
      "Iê! Volta pra roda\nquando aprender a gingar.",
      "Nem viu de onde veio,\nné, camará?",
      "Malandragem não se treina.\nSe vive.",
      "Valeu o jogo. Pena que\nvocê só assistiu."
    ],
    "vitoriaPerfeita": [
      "Ginga limpa, camará.\nNão pegou nenhuma.",
      "Saí da roda sem\num arranhão. Iê!"
    ],
    "vitoriaPorTempo": [
      "Deu o tempo, camará.\nGanhei no jogo.",
      "Parou o berimbau.\nE eu tava na frente."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Mansão bonita, chefe.\nCabe uma roda aqui?"
        ],
        "vitoria": [
          "A roda é de todo mundo.\nO cinturão também."
        ]
      }
    }
  },
  "aminu": {
    "abertura": [
      "Sannu! Bem-vindo à\nminha mão de lança.",
      "Plateia, contem até três.\nNo três, acabou.",
      "Defende à vontade.\nMeu soco gosta de esperar.",
      "Plateia, conheçam {rival}!\nAgora, se despeçam."
    ],
    "revanche": [
      "Kai! Esse doeu, né?",
      "A carga tá subindo...",
      "Escudo na frente, lança atrás.",
      "Plateia, mais barulho!"
    ],
    "decisivo": [
      "Nível três guardado pra agora!",
      "Plateia, agora é pra valer!"
    ],
    "vitoria": [
      "Isso foi o nível um.\nQuer ver o três?",
      "Índigo não sai na lavagem.\nEsse soco também não.",
      "Briga de feira? Isso foi\nesporte de elite.",
      "Yauwa! Palmas pra quem\nficou de pé um tempo."
    ],
    "vitoriaPerfeita": [
      "Plateia, viram algum golpe\nem mim? Nem eu!",
      "Escudo intacto!\nO índigo saiu sem mancha!"
    ],
    "vitoriaPorTempo": [
      "Plateia, o relógio parou!\nA lança, não.",
      "Tempo! E a carga ainda\ntava no nível dois."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Cobra tributo, é? Hoje\na conta vem de Kano."
        ],
        "vitoria": [
          "Kai! O dono caiu.\nPlateia, isso é dambe!"
        ]
      }
    }
  },
  "centella": {
    "abertura": [
      "¡Órale, público! Hoje\na faísca vira incêndio.",
      "Três gerações de lucha\ncontra uma só. Boa sorte.",
      "As cordas são minhas.\nO canto é seu.",
      "¡Público, recebam {rival}!\nVai durar pouco."
    ],
    "revanche": [
      "¡Arriba! Ainda tenho corda.",
      "A lona chama seu nome.",
      "Mais alto, público!",
      "Caí. A técnica sempre levanta!"
    ],
    "decisivo": [
      "¡Dos de tres caídas, público!",
      "Agora vem o voo.",
      "Do alto das cordas. Agora."
    ],
    "vitoria": [
      "¡Uno, dos, tres! Já pode\nse levantar.",
      "Essa vai pra você, abuela.",
      "A máscara fica.\nO cinturão vem comigo.",
      "Os técnicos sempre\nvencem no final."
    ],
    "vitoriaPerfeita": [
      "¡Nem tocou na máscara!\nPúblico, isso é técnica!",
      "Lona limpa, cordas minhas.\n¡Perfecto!"
    ],
    "vitoriaPorTempo": [
      "¡Tiempo! O público já\ntinha escolhido.",
      "O sino tocou, e a faísca\nainda brilhava."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Lá em casa, o vilão\nsempre perde no final."
        ],
        "vitoria": [
          "¡Órale! A plateia agora\né minha, Arconte."
        ]
      }
    }
  },
  "camille": {
    "abertura": [
      "En garde. E, por favor,\nataque primeiro.",
      "Já vi seus três golpes.\nNenhum me preocupa.",
      "Ataque quando quiser.\nEu respondo antes.",
      "{rival}. Mostre o primeiro\nerro. Não tenho pressa."
    ],
    "revanche": [
      "Anotado. Próximo.",
      "Seu ombro avisa o golpe.",
      "Um ponto seu. Entendi o resto.",
      "Paciência. Você vai errar."
    ],
    "decisivo": [
      "Último assalto. Mesma precisão.",
      "Agora, a riposte certa.",
      "Mesmo erro. De novo."
    ],
    "vitoria": [
      "Touché. Era o óbvio.",
      "Atacou na hora errada.\nComo eu previ.",
      "Seu golpe mais forte?\nFoi o meu, de volta.",
      "Voilà. Volte com\num plano."
    ],
    "vitoriaPerfeita": [
      "Parade, riposte, fim.\nLimpo como na aula.",
      "Imaculado. Seu ataque\nnunca chegou."
    ],
    "vitoriaPorTempo": [
      "Cronômetro zerado.\nDois toques à frente.",
      "Venci no relógio.\nTambém é esgrima."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Todo estilo descende do\nseu? Prove. En garde."
        ],
        "vitoria": [
          "Riposte. Até o dono\ndo torneio ataca mal."
        ]
      }
    }
  },
  "nila": {
    "abertura": [
      "Respire. Vou achar seu\nponto fraco com calma.",
      "Elefante ou serpente?\nVocê escolhe como cair.",
      "Vaa. Já sei onde dói.",
      "{rival}, sua postura\njá me contou tudo."
    ],
    "revanche": [
      "Sua respiração te entrega.",
      "Mudo a postura. E você?",
      "Um ponto marma por vez.",
      "Diagnóstico revisto. Continue."
    ],
    "decisivo": [
      "Calma. Ainda nem comecei.",
      "Última sessão. Sem anestesia."
    ],
    "vitoria": [
      "Gelo e repouso.\nVolte quando sarar.",
      "Não doeu tanto.\nEu escolhi o ponto.",
      "Mathi. Já basta por hoje.",
      "Previsível. A serpente\nviu tudo."
    ],
    "vitoriaPerfeita": [
      "A serpente não se pega.\nVocê tentou.",
      "Respiração em ordem.\nA sua, nem tanto."
    ],
    "vitoriaPorTempo": [
      "Fim da consulta.\nO tempo deu o diagnóstico.",
      "Não precisei terminar.\nO tempo terminou por mim."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Sua guarda tem um ponto\nque nunca curou, Arconte."
        ],
        "vitoria": [
          "Repouso, Arconte. Seu\ntorneio precisa de cura."
        ]
      }
    }
  },
  "baatar": {
    "abertura": [
      "Za. Mostre o que trouxe.",
      "Só os pés tocam o chão.\nOs seus, por enquanto.",
      "O céu é grande.\nO chão está perto.",
      "{rival}. Bom adversário.\nO chão decide."
    ],
    "revanche": [
      "Ainda de pé. Bom.",
      "A estepe não tem pressa.",
      "Venha. Eu espero.",
      "Caí uma vez. Basta."
    ],
    "decisivo": [
      "Segure firme. Vou puxar.",
      "Agora, só um fica de pé."
    ],
    "vitoria": [
      "Você lutou bem.\nO chão lutou melhor.",
      "Levante. Aperte minha mão.\nVolte mais forte.",
      "Nove edições invicto.\nHoje não foi diferente.",
      "Força tem. Falta raiz."
    ],
    "vitoriaPerfeita": [
      "Nem me tirou do lugar.",
      "Meus pés nunca saíram\ndo chão."
    ],
    "vitoriaPorTempo": [
      "O sol se pôs.\nEu continuei de pé.",
      "Tempo. Eu ainda\nestava firme."
    ],
    "contra": {
      "zenon": {
        "abertura": [
          "Devolvi seu cinturão nove\nvezes. Hoje, não."
        ],
        "vitoria": [
          "A estepe não tem dono.\nO torneio também não."
        ]
      }
    }
  },
  "zenon": {
    "abertura": [
      "Kalós írthes. Sente-se\nà minha mesa.",
      "Meu torneio, minha ilha.\nSua última luta.",
      "Pode atacar primeiro.\nÉ cortesia da casa.",
      "{rival}. Finalmente.\nA casa estava à sua espera."
    ],
    "revanche": [
      "Encantador. Continue.",
      "Seu tributo, por favor.",
      "A casa cobra no final.",
      "Uma cortesia. Não se repetirá.",
      "O jantar nem começou."
    ],
    "decisivo": [
      "Sirvam a última rodada.",
      "Agora, o prato principal."
    ],
    "vitoria": [
      "Aplausos para o convidado.\nA saída é pelos fundos.",
      "Obrigado pela energia.\nGuardarei com carinho.",
      "Todo estilo volta para\ncasa. A minha.",
      "O prazer foi todo meu.\nLiteralmente."
    ],
    "vitoriaPerfeita": [
      "Nem amassou meu casaco.\nQue convidado discreto.",
      "Nenhuma mancha na toalha.\nVolte sempre."
    ],
    "vitoriaPorTempo": [
      "O relógio é meu também.\nComo tudo nesta ilha.",
      "Fim do jantar.\nA conta fica com você."
    ],
    "contra": {
      "hayato": {
        "abertura": [
          "Trovão bonito. Aqui, eu\ndecido quando chove."
        ],
        "vitoria": [
          "Volte ao dojo, menino.\nO trovão é meu agora.",
          "Seu avô treinou bem você.\nEu treinei melhor."
        ]
      },
      "wei-long": {
        "abertura": [
          "Wei, meu velho rival.\nAinda de pé, que honra."
        ],
        "vitoria": [
          "O ferro dobra, Wei.\nBasta o fogo certo.",
          "Envelheceu bem, Wei.\nMas envelheceu."
        ]
      },
      "min-ji": {
        "abertura": [
          "Tantos chutes. Cada um\nme paga um tributo."
        ],
        "vitoria": [
          "Nota dez na pressa.\nZero no resultado.",
          "Revanche? Claro. A casa\nadora clientes fiéis."
        ]
      },
      "caio": {
        "abertura": [
          "Uma roda na minha casa?\nAqui, o ritmo é meu."
        ],
        "vitoria": [
          "Bela ginga. Eu cobro\no ingresso da roda.",
          "A ginga cansa.\nO anfitrião, não."
        ]
      },
      "aminu": {
        "abertura": [
          "Pode carregar à vontade.\nEu cobro em dobro."
        ],
        "vitoria": [
          "Lança quebrada, escudo\nno chão. Próximo.",
          "Nível três? A casa\ncobra nível dez."
        ]
      },
      "centella": {
        "abertura": [
          "Sua plateia é minha\nesta noite, luchadora."
        ],
        "vitoria": [
          "Linda máscara. Guarde-a\npara o próximo ano.",
          "Três gerações de lucha.\nUma tarde comigo."
        ]
      },
      "camille": {
        "abertura": [
          "Esgrima e savate. Que\nelegância. Que pena."
        ],
        "vitoria": [
          "Riposte elegante.\nPena que veio de mim.",
          "Touché, Camille. Desta\nvez, a lição foi minha."
        ]
      },
      "nila": {
        "abertura": [
          "Uma terapeuta na minha\narena. Que conveniente."
        ],
        "vitoria": [
          "Sem pontos fracos, Nila?\nAcabo de achar o seu.",
          "Diagnóstico, doutora?\nExcesso de confiança."
        ]
      },
      "baatar": {
        "abertura": [
          "O guardião do meu cinturão\nquer ser o dono?"
        ],
        "vitoria": [
          "Volte para a estepe,\navarga. O cinturão fica.",
          "Décima vez, avarga.\nO cinturão volta para mim."
        ]
      },
      "zenon": {
        "abertura": [
          "Um espelho? Só cabe\num anfitrião nesta casa."
        ],
        "vitoria": [
          "Dois anfitriões era\ndemais. Ficou um."
        ]
      }
    }
  }
}
```
