# Textos de provocação: pré-round e vitória

Autor: Apolo (direção de arte e texto) · 2026-10-21 · missão cmvij55hc00a301p7blrd00lh

Pedido do dono: antes dos rounds os lutadores provocam o oponente com texto na tela, e quem vence provoca quem perdeu.
Cada lutador tem voz própria, autoral. Este documento é a **fonte do texto**; o contrato de exibição (quando, onde, por
quanto tempo, como sortear) é da Nova em `docs/spec-provocacao-prerround-e-vitoria.md`. Se o contrato mudar a forma, o
texto se adapta sem reescrita (ver §4).

## 1. Regras que todas as falas cumprem

| Regra | Como foi aplicada | Conferido |
|---|---|---|
| Até 38 caracteres por linha, no máximo 2 linhas, ~64 no total | a quebra já vem escolhida por mim (`\n` no JSON), no ponto de respiração da frase | por script: 148 falas, 0 fora do limite, maior linha 30, maior fala 51 caracteres |
| Falas de "rounds seguintes" curtas | todas em **1 linha só** (até 30 caracteres) | por script |
| Sem palavrão, sem ofensa a nacionalidade, etnia, religião ou corpo | o alvo da provocação é sempre a **técnica, a pressa, a guarda, o resultado**; nunca a origem nem o corpo do rival | revisão manual, fala a fala |
| Sem marca ou pessoa real | nenhuma; cidades e artes marciais são as do próprio elenco | revisão manual |
| Falas genéricas servem contra qualquer rival | nenhuma fala genérica usa gênero do rival ("menino", "ele", "ela"); gênero só aparece em fala dirigida a um rival específico | revisão manual |
| Nenhuma fala repete outra | todas diferentes | por script |
| Cada voz inconfundível | cada lutador tem um "território" de palavras que ninguém mais usa (tabela abaixo) | revisão manual |

**Territórios de voz (o teste de cegueira: tapar o nome e saber quem falou).**

| Lutador | Território exclusivo | Pontuação | Registro |
|---|---|---|---|
| HAYATO | trovão, raio, estrondo, rapidez | ponto e exclamação curtos | jovem, direto |
| WEI LONG | montanha, ferro, raiz, chá, lição | nunca exclamação | sentencioso, mestre |
| MIN-JI | placar, nota, ponto, chute, revanche | muita exclamação | alegre, esportivo |
| CAIO | roda, ginga, jogo, berimbau, camará | coloquial (tá, pra, né) | malandro carioca |
| AMINU | plateia, nível, carga, lança, escudo, índigo | exclamação de showman | bem-humorado |
| CENTELLA | público, cordas, lona, voo, máscara, abuela | ¡exclamação! | promo de luta livre |
| CAMILLE | erro, golpe, plano, previsão; termos de esgrima | nunca exclamação | seco, analítico |
| NILA | ponto, respiração, postura, repouso, serpente, elefante | calma | clínico, sereno |
| BAATAR | chão, céu, estepe, raiz, firme | frases de 3 a 6 palavras | gentil, lacônico |
| ZENON | casa, convidado, mesa, tributo, cortesia, ilha | elegante, sem exclamação | anfitrião cruel |

## 2. Os lutadores

Legenda: † = a fala tem palavra de outro idioma que **pede revisão de nativo** (lista no §3). Os números da última
coluna são os caracteres de cada linha.

### HAYATO · "O Punho do Trovão" · Japão · karatê · ~24 anos

**Voz:** Jovem, confiante, sorriso de canto. Fala curto e em frases de impacto, como quem já está em movimento. Mede tudo em velocidade e trovão. Treinou sozinho no dojo do avô e quer provar que o esforço basta.

**Cuidado:** nunca filosofa (isso é do WEI LONG) nem fala com a plateia (isso é da CENTELLA e do AMINU).

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Ikuzo! O trovão não / espera ninguém. † | 19 + 15 |
| Abertura (round 1) | 2 | Treinei sozinho por isso. / Não me decepcione. | 25 + 18 |
| Abertura (round 1) | 3 | Pisca, e já acabou. | 19 |
| Rounds seguintes | 1 | Agora eu esquentei. | 19 |
| Rounds seguintes | 2 | Outro raio? Tenho de sobra. | 27 |
| Rounds seguintes | 3 | Guarda alta. Lá vou eu. | 23 |
| Rounds seguintes | 4 | Esse round é meu. | 17 |
| Vitória | 1 | Rápido demais pra você? / Volta quando trovejar. | 23 + 22 |
| Vitória | 2 | Nem precisei do / segundo raio. | 15 + 13 |
| Vitória | 3 | Treina mais. Eu continuo / esperando no topo. | 24 + 18 |
| Vitória | 4 | Ouviu o estrondo? / Foi você caindo. | 17 + 16 |
| Contra ZENON, abertura | - | Sua ilha, suas regras. / Meu trovão. | 22 + 11 |
| Contra ZENON, vitória | - | Seu cinturão agora mora / no dojo do meu avô. | 23 + 19 |

### WEI LONG · "O Dragão de Ferro" · China · kung fu · ~65 anos

**Voz:** O mestre mais velho do torneio. Calmo, sentencioso, superior sem levantar a voz: trata a luta como aula e o rival como aluno. Imagens de montanha, ferro, raiz, chá, dragão. Nunca usa gíria nem exclamação.

**Cuidado:** não usa "menino/menina" nas falas genéricas, porque o rival pode ser qualquer um.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Lái ba. A montanha não / se move por você. † | 22 + 17 |
| Abertura (round 1) | 2 | Respire fundo. Depois / não haverá tempo. | 21 + 17 |
| Abertura (round 1) | 3 | Ferro se forja devagar. / Você vai sentir cada golpe. | 23 + 27 |
| Rounds seguintes | 1 | O chá ainda nem esfriou. | 24 |
| Rounds seguintes | 2 | Paciência. A palma vem. | 23 |
| Rounds seguintes | 3 | Ainda de pé? Bom sinal. | 23 |
| Rounds seguintes | 4 | Mais uma lição, então. | 22 |
| Vitória | 1 | Volte daqui a dez anos. / Traga um professor. | 23 + 19 |
| Vitória | 2 | O dragão nem acordou / direito. | 20 + 8 |
| Vitória | 3 | Pressa é para quem / não tem raízes. | 18 + 15 |
| Vitória | 4 | Lição encerrada. / Pode se curvar ao sair. | 16 + 23 |
| Contra ZENON, abertura | - | Vi este torneio nascer. / Hoje o vejo mudar de mãos. | 23 + 26 |
| Contra ZENON, vitória | - | Seu mármore racha, Arconte. / O ferro, não. | 27 + 13 |

### MIN-JI · "A Tempestade de Seul" · Coreia do Sul · taekwondo · ~22 anos

**Voz:** Campeã jovem, alegre e rápida, arrogância brincalhona de atleta de pódio. Fala em placar, nota e ponto (o taekwondo é esporte de pontuação). Muita exclamação, frases que parecem um chute: curtas e em sequência.

**Cuidado:** é provocação de quem se diverte, nunca rancorosa.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Gaja! Tenta acompanhar / meus pés. † | 22 + 9 |
| Abertura (round 1) | 2 | Três chutes por segundo. / Conta comigo! | 24 + 13 |
| Abertura (round 1) | 3 | Sorria! Vai ser rapidinho. | 26 |
| Rounds seguintes | 1 | Hwaiting! Eu, não você. † | 23 |
| Rounds seguintes | 2 | Ponto meu. De novo. | 19 |
| Rounds seguintes | 3 | Mais alto? Pode deixar. | 23 |
| Rounds seguintes | 4 | Cansou? Eu nem suei. | 20 |
| Vitória | 1 | Nota dez pro chute. / Zero pra sua guarda. | 19 + 20 |
| Vitória | 2 | Viu? Nem precisei / do terceiro chute. | 17 + 18 |
| Vitória | 3 | Bom treino! Pra mim. | 20 |
| Vitória | 4 | Pede revanche. Eu adoro / revanche. | 23 + 9 |
| Contra ZENON, abertura | - | Dono do torneio? Legal. / Eu sou dona do placar. | 23 + 22 |
| Contra ZENON, vitória | - | Hwaiting! O cinturão vai / pra academia de Seul. † | 24 + 21 |

### CAIO · "Mestre da Ginga" · Brasil · capoeira · ~25 anos

**Voz:** Malandro boa-praça da roda do Rio. Chama a luta de "jogo", o rival de "camará", e provoca rindo. Registro coloquial carioca (tá, pra, né, bora). Vocabulário da roda: ginga, berimbau, jogo de dentro, Iê.

**Cuidado:** é o único com fala coloquial brasileira; os outros falam português neutro.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Bora jogar, camará? / A roda tá aberta. † | 19 + 17 |
| Abertura (round 1) | 2 | Quem não ginga, apanha. / Simples assim. | 23 + 14 |
| Abertura (round 1) | 3 | Relaxa. Vai doer / com estilo. | 16 + 11 |
| Rounds seguintes | 1 | Ih, tá nervoso? Ginga! | 22 |
| Rounds seguintes | 2 | O berimbau mudou o toque. | 25 |
| Rounds seguintes | 3 | Agora é jogo de dentro. | 23 |
| Rounds seguintes | 4 | Achou que tinha acabado? | 24 |
| Vitória | 1 | Iê! Volta pra roda / quando aprender a gingar. † | 18 + 25 |
| Vitória | 2 | Nem viu de onde veio, / né, camará? † | 21 + 11 |
| Vitória | 3 | Malandragem não se treina. / Se vive. | 26 + 8 |
| Vitória | 4 | Valeu o jogo. Pena que / você só assistiu. | 22 + 17 |
| Contra ZENON, abertura | - | Mansão bonita, chefe. / Cabe uma roda aqui? | 21 + 19 |
| Contra ZENON, vitória | - | A roda é de todo mundo. / O cinturão também. | 23 + 18 |

### AMINU · "A Lança de Kano" · Nigéria · dambe · 26 anos

**Voz:** Bem-humorado e showman: fala com a plateia, conta, pede barulho. Leva o ofício a sério: o dambe é esporte de elite, não "briga de feira". A mecânica vira fala (nível um, nível três, carga). Lança e escudo; o índigo da família tintureira.

**Cuidado:** o "Plateia, ..." é marca dele; a CENTELLA diz "público", com sotaque de arena.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Sannu! Bem-vindo à / minha mão de lança. † | 18 + 19 |
| Abertura (round 1) | 2 | Plateia, contem até três. / No três, acabou. | 25 + 16 |
| Abertura (round 1) | 3 | Defende à vontade. / Meu soco gosta de esperar. | 18 + 26 |
| Rounds seguintes | 1 | Kai! Esse doeu, né? † | 19 |
| Rounds seguintes | 2 | A carga tá subindo... | 21 |
| Rounds seguintes | 3 | Escudo na frente, lança atrás. | 30 |
| Rounds seguintes | 4 | Plateia, mais barulho! | 22 |
| Vitória | 1 | Isso foi o nível um. / Quer ver o três? | 20 + 16 |
| Vitória | 2 | Índigo não sai na lavagem. / Esse soco também não. | 26 + 21 |
| Vitória | 3 | Briga de feira? Isso foi / esporte de elite. | 24 + 17 |
| Vitória | 4 | Yauwa! Palmas pra quem / ficou de pé um tempo. † | 22 + 21 |
| Contra ZENON, abertura | - | Cobra tributo, é? Hoje / a conta vem de Kano. | 22 + 20 |
| Contra ZENON, vitória | - | Kai! O dono caiu. / Plateia, isso é dambe! † | 17 + 22 |

### CENTELLA · "A Faísca da Arena" · México · lucha libre · técnica, 3ª geração

**Voz:** Estrela de ringue, fala como numa promo de luta livre: para o público, em tom de espetáculo, heroína (técnica) contra vilão (rudo). Cordas, lona, voo, máscara, a avó. Pitadas de espanhol.

**Cuidado:** a máscara é honra: nenhuma fala dela ou contra ela sugere tirar a máscara.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | ¡Órale, público! Hoje / a faísca vira incêndio. † | 21 + 23 |
| Abertura (round 1) | 2 | Três gerações de lucha / contra uma só. Boa sorte. | 22 + 25 |
| Abertura (round 1) | 3 | As cordas são minhas. / O canto é seu. | 21 + 14 |
| Rounds seguintes | 1 | ¡Arriba! Ainda tenho corda. † | 27 |
| Rounds seguintes | 2 | A lona chama seu nome. | 22 |
| Rounds seguintes | 3 | Mais alto, público! | 19 |
| Rounds seguintes | 4 | Agora vem o voo. | 16 |
| Vitória | 1 | ¡Uno, dos, tres! Já pode / se levantar. † | 24 + 12 |
| Vitória | 2 | Essa vai pra você, abuela. † | 26 |
| Vitória | 3 | A máscara fica. / O cinturão vem comigo. | 15 + 22 |
| Vitória | 4 | Os técnicos sempre / vencem no final. | 18 + 16 |
| Contra ZENON, abertura | - | Lá em casa, o vilão / sempre perde no final. | 19 + 22 |
| Contra ZENON, vitória | - | ¡Órale! A plateia agora / é minha, Arconte. † | 23 + 17 |

### CAMILLE · "A Riposte de Marselha" · França · savate · 29 anos

**Voz:** Cerebral, precisa, humor seco. Lê o rival e comenta o erro dele como uma professora de esgrima. Frases curtas com ponto final. Termos de esgrima em francês (en garde, touché, riposte, voilà).

**Cuidado:** nunca grita, nunca usa exclamação: a frieza é a provocação.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | En garde. E, por favor, / ataque primeiro. † | 23 + 16 |
| Abertura (round 1) | 2 | Já vi seus três golpes. / Nenhum me preocupa. | 23 + 19 |
| Abertura (round 1) | 3 | Ataque quando quiser. / Eu respondo antes. | 21 + 18 |
| Rounds seguintes | 1 | Mesmo erro. De novo. | 20 |
| Rounds seguintes | 2 | Anotado. Próximo. | 17 |
| Rounds seguintes | 3 | Seu ombro avisa o golpe. | 24 |
| Rounds seguintes | 4 | Paciência. Você vai errar. | 26 |
| Vitória | 1 | Touché. Era o óbvio. † | 20 |
| Vitória | 2 | Atacou na hora errada. / Como eu previ. | 22 + 14 |
| Vitória | 3 | Seu golpe mais forte? / Foi o meu, de volta. | 21 + 20 |
| Vitória | 4 | Voilà. Volte com / um plano. † | 16 + 9 |
| Contra ZENON, abertura | - | Todo estilo descende do / seu? Prove. En garde. † | 23 + 21 |
| Contra ZENON, vitória | - | Riposte. Até o dono / do torneio ataca mal. † | 19 + 21 |

### NILA · "A Lua de Kerala" · Índia · kalaripayattu · 31 anos

**Voz:** Serena e clínica: é fisioterapeuta e conhece os pontos marma. Provoca como quem dá diagnóstico ("já sei onde dói", "gelo e repouso"). Fala em respiração, postura, elefante e serpente. Uma palavra em malaiala de vez em quando.

**Cuidado:** o "ponto fraco" é técnico (guarda, respiração), nunca o corpo do rival.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Respire. Vou achar seu / ponto fraco com calma. | 22 + 22 |
| Abertura (round 1) | 2 | Elefante ou serpente? / Você escolhe como cair. | 21 + 23 |
| Abertura (round 1) | 3 | Vaa. Já sei onde dói. † | 21 |
| Rounds seguintes | 1 | Sua respiração te entrega. | 26 |
| Rounds seguintes | 2 | Mudo a postura. E você? | 23 |
| Rounds seguintes | 3 | Um ponto marma por vez. † | 23 |
| Rounds seguintes | 4 | Calma. Ainda nem comecei. | 25 |
| Vitória | 1 | Gelo e repouso. / Volte quando sarar. | 15 + 19 |
| Vitória | 2 | Não doeu tanto. / Eu escolhi o ponto. | 15 + 19 |
| Vitória | 3 | Mathi. Já basta por hoje. † | 25 |
| Vitória | 4 | Previsível. A serpente / viu tudo. | 22 + 9 |
| Contra ZENON, abertura | - | Sua guarda tem um ponto / que nunca curou, Arconte. | 23 + 25 |
| Contra ZENON, vitória | - | Repouso, Arconte. Seu / torneio precisa de cura. | 21 + 24 |

### BAATAR · "O Avarga das Estepes" · Mongólia · bökh · 44 anos

**Voz:** Fala pouco, é gentil e respeitoso. A provocação dele é a calma de quem nunca perdeu: frases de 3 a 6 palavras, imagens de céu, chão, estepe, raiz. No bökh perde quem toca o chão, por isso "o chão" é o fio das falas.

**Cuidado:** nada de arrogância verbal: o peso vem da serenidade. A Dança da Águia continua sem fala (decisão do dono).

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Za. Mostre o que trouxe. † | 24 |
| Abertura (round 1) | 2 | Só os pés tocam o chão. / Os seus, por enquanto. | 23 + 22 |
| Abertura (round 1) | 3 | O céu é grande. / O chão está perto. | 15 + 18 |
| Rounds seguintes | 1 | Ainda de pé. Bom. | 17 |
| Rounds seguintes | 2 | A estepe não tem pressa. | 24 |
| Rounds seguintes | 3 | Venha. Eu espero. | 17 |
| Rounds seguintes | 4 | Segure firme. Vou puxar. | 24 |
| Vitória | 1 | Você lutou bem. / O chão lutou melhor. | 15 + 20 |
| Vitória | 2 | Levante. Aperte minha mão. / Volte mais forte. | 26 + 17 |
| Vitória | 3 | Nove edições invicto. / Hoje não foi diferente. | 21 + 23 |
| Vitória | 4 | Força tem. Falta raiz. | 22 |
| Contra ZENON, abertura | - | Devolvi seu cinturão nove / vezes. Hoje, não. | 25 + 17 |
| Contra ZENON, vitória | - | A estepe não tem dono. / O torneio também não. | 22 + 21 |

### ZENON · "O Arconte" · Grécia · pancrácio · 61 anos · chefão

**Voz:** O anfitrião elegante e cruel. Trata o rival como "convidado", a luta como um jantar e a energia que toma como "tributo". Nunca levanta a voz; a crueldade vem da cortesia. A 1ª vitória repete a que já está no jogo ("Aplausos para o convidado...").

**Cuidado:** as falas atuais dele (entrada dramática, fase 2, vitória, derrota) não mudam; estas são as do novo sistema de pré-round e vitória.

| Momento | # | Fala (` / ` = quebra de linha) | Caracteres por linha |
|---|---|---|---|
| Abertura (round 1) | 1 | Kalós írthes. Sente-se / à minha mesa. † | 22 + 13 |
| Abertura (round 1) | 2 | Meu torneio, minha ilha. / Sua última luta. | 24 + 16 |
| Abertura (round 1) | 3 | Pode atacar primeiro. / É cortesia da casa. | 21 + 19 |
| Rounds seguintes | 1 | O jantar nem começou. | 21 |
| Rounds seguintes | 2 | Seu tributo, por favor. | 23 |
| Rounds seguintes | 3 | Encantador. Continue. | 21 |
| Rounds seguintes | 4 | A casa cobra no final. | 22 |
| Vitória | 1 | Aplausos para o convidado. / A saída é pelos fundos. | 26 + 23 |
| Vitória | 2 | Obrigado pela energia. / Ela agora é minha. | 22 + 18 |
| Vitória | 3 | Todo estilo volta para / casa. A minha. | 22 + 14 |
| Vitória | 4 | O prazer foi todo meu. / Literalmente. | 22 + 13 |
| Contra ZENON (espelho), abertura | - | Um espelho? Só cabe / um anfitrião nesta casa. | 19 + 24 |
| Contra ZENON (espelho), vitória | - | Dois anfitriões era / demais. Ficou um. | 19 + 17 |

**ZENON contra cada um.** A abertura entra no round 1; a vitória é a que o jogador lê quando perde para o chefão.

| Rival | Abertura do ZENON | Vitória do ZENON |
|---|---|---|
| HAYATO | Trovão bonito. Aqui, eu / decido quando chove. | Volte ao dojo, menino. / O trovão é meu agora. |
| WEI LONG | Wei, meu velho rival. / Ainda de pé, que honra. | O ferro dobra, Wei. / Basta o fogo certo. |
| MIN-JI | Tantos chutes. Cada um / me paga um tributo. | Nota dez na pressa. / Zero no resultado. |
| CAIO | Uma roda na minha casa? / Aqui, o ritmo é meu. | Bela ginga. Eu cobro / o ingresso da roda. |
| AMINU | Pode carregar à vontade. / Eu cobro em dobro. | Lança quebrada, escudo / no chão. Próximo. |
| CENTELLA | Sua plateia é minha / esta noite, luchadora. † | Linda máscara. Guarde-a / para o próximo ano. |
| CAMILLE | Esgrima e savate. Que / elegância. Que pena. | Riposte elegante. / Pena que veio de mim. † |
| NILA | Uma terapeuta na minha / arena. Que conveniente. | Sem pontos fracos, Nila? / Acabo de achar o seu. |
| BAATAR | O guardião do meu cinturão / quer ser o dono? | Volte para a estepe, / avarga. O cinturão fica. † |

## 3. Palavras de outro idioma (pedem revisão de nativo)

Todas são palavras comuns, de uso esportivo ou de saudação, escolhidas para não ter carga religiosa ou política. Mesmo
assim, nenhuma foi validada por falante nativo: **revisar antes de publicar**. Se alguma cair, a troca é por português
sem mudar o sentido (ex.: "Ikuzo!" vira "Vamos!"). Acentos e o "¡" invertido precisam existir na fonte do letreiro
(Lyra confere o glifo; o subset latino do jogo deve cobrir, mas é para medir, não supor).

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
| CENTELLA | ¡Órale!, ¡Arriba!, ¡Uno, dos, tres!, abuela, luchadora | espanhol do México; "¡Órale!" é coloquial mexicano |
| CAMILLE | En garde, Touché, Riposte, Voilà | francês, termos de esgrima de uso internacional |
| NILA | Vaa | malaiala വാ, "venha" |
| NILA | Mathi | malaiala മതി, "basta" |
| NILA | marma | pontos vitais do kalari (já usado no jogo: GOLPE MARMA) |
| BAATAR | Za | mongol За, "bem / certo" (abre a fala como um aceno) |
| BAATAR / ZENON | avarga | mongol, o título de "titã" (já usado no jogo) |
| ZENON | Kalós írthes | grego Καλώς ήρθες, "bem-vindo" |

## 4. Para quem implementa (forma dos dados)

- **Chave** = `id` do lutador (`hayato`, `wei-long`, `min-ji`, `caio`, `aminu`, `centella`, `camille`, `nila`,
  `baatar`, `zenon`), o mesmo de `src/data/lutadores`.
- **`abertura`** (3): round 1, um por lutador, antes do FIGHT.
- **`rounds`** (4): rounds 2 em diante. Todas funcionam com o lutador ganhando ou perdendo no placar.
- **`vitoria`** (4): quem venceu a luta provoca quem perdeu.
- **`contraZenon`** (`abertura`, `vitoria`): substitui a abertura do round 1 e a vitória quando o rival é o ZENON. No
  próprio ZENON, é o espelho (ZENON contra ZENON jogável).
- **`contraRival`** (só no `zenon`): abertura e vitória do chefão contra cada um dos 9. Quando o ZENON é o rival, a fala
  DELE sai daqui; a vitória dele é a que o jogador lê ao perder.
- **Quebra de linha**: `\n` já está no ponto certo. Não reembrulhar por largura; se o contrato da Nova pedir texto sem
  quebra, basta trocar `\n` por espaço (todas cabem em 64).
- **Sorteio**: com o RNG de apresentação, nunca o do motor (o texto é só desenho, como `APRESENTACAO`). Sugestão: não
  repetir a mesma fala duas vezes seguidas para o mesmo lutador.
- **Ordem sugerida em diálogo** (round 1): quem desafia fala primeiro, o outro responde. Nas aberturas contra o ZENON o
  texto foi escrito para funcionar nas duas ordens.

```json
{
  "hayato": {
    "abertura": [
      "Ikuzo! O trovão não\nespera ninguém.",
      "Treinei sozinho por isso.\nNão me decepcione.",
      "Pisca, e já acabou."
    ],
    "rounds": [
      "Agora eu esquentei.",
      "Outro raio? Tenho de sobra.",
      "Guarda alta. Lá vou eu.",
      "Esse round é meu."
    ],
    "vitoria": [
      "Rápido demais pra você?\nVolta quando trovejar.",
      "Nem precisei do\nsegundo raio.",
      "Treina mais. Eu continuo\nesperando no topo.",
      "Ouviu o estrondo?\nFoi você caindo."
    ],
    "contraZenon": {
      "abertura": "Sua ilha, suas regras.\nMeu trovão.",
      "vitoria": "Seu cinturão agora mora\nno dojo do meu avô."
    }
  },
  "wei-long": {
    "abertura": [
      "Lái ba. A montanha não\nse move por você.",
      "Respire fundo. Depois\nnão haverá tempo.",
      "Ferro se forja devagar.\nVocê vai sentir cada golpe."
    ],
    "rounds": [
      "O chá ainda nem esfriou.",
      "Paciência. A palma vem.",
      "Ainda de pé? Bom sinal.",
      "Mais uma lição, então."
    ],
    "vitoria": [
      "Volte daqui a dez anos.\nTraga um professor.",
      "O dragão nem acordou\ndireito.",
      "Pressa é para quem\nnão tem raízes.",
      "Lição encerrada.\nPode se curvar ao sair."
    ],
    "contraZenon": {
      "abertura": "Vi este torneio nascer.\nHoje o vejo mudar de mãos.",
      "vitoria": "Seu mármore racha, Arconte.\nO ferro, não."
    }
  },
  "min-ji": {
    "abertura": [
      "Gaja! Tenta acompanhar\nmeus pés.",
      "Três chutes por segundo.\nConta comigo!",
      "Sorria! Vai ser rapidinho."
    ],
    "rounds": [
      "Hwaiting! Eu, não você.",
      "Ponto meu. De novo.",
      "Mais alto? Pode deixar.",
      "Cansou? Eu nem suei."
    ],
    "vitoria": [
      "Nota dez pro chute.\nZero pra sua guarda.",
      "Viu? Nem precisei\ndo terceiro chute.",
      "Bom treino! Pra mim.",
      "Pede revanche. Eu adoro\nrevanche."
    ],
    "contraZenon": {
      "abertura": "Dono do torneio? Legal.\nEu sou dona do placar.",
      "vitoria": "Hwaiting! O cinturão vai\npra academia de Seul."
    }
  },
  "caio": {
    "abertura": [
      "Bora jogar, camará?\nA roda tá aberta.",
      "Quem não ginga, apanha.\nSimples assim.",
      "Relaxa. Vai doer\ncom estilo."
    ],
    "rounds": [
      "Ih, tá nervoso? Ginga!",
      "O berimbau mudou o toque.",
      "Agora é jogo de dentro.",
      "Achou que tinha acabado?"
    ],
    "vitoria": [
      "Iê! Volta pra roda\nquando aprender a gingar.",
      "Nem viu de onde veio,\nné, camará?",
      "Malandragem não se treina.\nSe vive.",
      "Valeu o jogo. Pena que\nvocê só assistiu."
    ],
    "contraZenon": {
      "abertura": "Mansão bonita, chefe.\nCabe uma roda aqui?",
      "vitoria": "A roda é de todo mundo.\nO cinturão também."
    }
  },
  "aminu": {
    "abertura": [
      "Sannu! Bem-vindo à\nminha mão de lança.",
      "Plateia, contem até três.\nNo três, acabou.",
      "Defende à vontade.\nMeu soco gosta de esperar."
    ],
    "rounds": [
      "Kai! Esse doeu, né?",
      "A carga tá subindo...",
      "Escudo na frente, lança atrás.",
      "Plateia, mais barulho!"
    ],
    "vitoria": [
      "Isso foi o nível um.\nQuer ver o três?",
      "Índigo não sai na lavagem.\nEsse soco também não.",
      "Briga de feira? Isso foi\nesporte de elite.",
      "Yauwa! Palmas pra quem\nficou de pé um tempo."
    ],
    "contraZenon": {
      "abertura": "Cobra tributo, é? Hoje\na conta vem de Kano.",
      "vitoria": "Kai! O dono caiu.\nPlateia, isso é dambe!"
    }
  },
  "centella": {
    "abertura": [
      "¡Órale, público! Hoje\na faísca vira incêndio.",
      "Três gerações de lucha\ncontra uma só. Boa sorte.",
      "As cordas são minhas.\nO canto é seu."
    ],
    "rounds": [
      "¡Arriba! Ainda tenho corda.",
      "A lona chama seu nome.",
      "Mais alto, público!",
      "Agora vem o voo."
    ],
    "vitoria": [
      "¡Uno, dos, tres! Já pode\nse levantar.",
      "Essa vai pra você, abuela.",
      "A máscara fica.\nO cinturão vem comigo.",
      "Os técnicos sempre\nvencem no final."
    ],
    "contraZenon": {
      "abertura": "Lá em casa, o vilão\nsempre perde no final.",
      "vitoria": "¡Órale! A plateia agora\né minha, Arconte."
    }
  },
  "camille": {
    "abertura": [
      "En garde. E, por favor,\nataque primeiro.",
      "Já vi seus três golpes.\nNenhum me preocupa.",
      "Ataque quando quiser.\nEu respondo antes."
    ],
    "rounds": [
      "Mesmo erro. De novo.",
      "Anotado. Próximo.",
      "Seu ombro avisa o golpe.",
      "Paciência. Você vai errar."
    ],
    "vitoria": [
      "Touché. Era o óbvio.",
      "Atacou na hora errada.\nComo eu previ.",
      "Seu golpe mais forte?\nFoi o meu, de volta.",
      "Voilà. Volte com\num plano."
    ],
    "contraZenon": {
      "abertura": "Todo estilo descende do\nseu? Prove. En garde.",
      "vitoria": "Riposte. Até o dono\ndo torneio ataca mal."
    }
  },
  "nila": {
    "abertura": [
      "Respire. Vou achar seu\nponto fraco com calma.",
      "Elefante ou serpente?\nVocê escolhe como cair.",
      "Vaa. Já sei onde dói."
    ],
    "rounds": [
      "Sua respiração te entrega.",
      "Mudo a postura. E você?",
      "Um ponto marma por vez.",
      "Calma. Ainda nem comecei."
    ],
    "vitoria": [
      "Gelo e repouso.\nVolte quando sarar.",
      "Não doeu tanto.\nEu escolhi o ponto.",
      "Mathi. Já basta por hoje.",
      "Previsível. A serpente\nviu tudo."
    ],
    "contraZenon": {
      "abertura": "Sua guarda tem um ponto\nque nunca curou, Arconte.",
      "vitoria": "Repouso, Arconte. Seu\ntorneio precisa de cura."
    }
  },
  "baatar": {
    "abertura": [
      "Za. Mostre o que trouxe.",
      "Só os pés tocam o chão.\nOs seus, por enquanto.",
      "O céu é grande.\nO chão está perto."
    ],
    "rounds": [
      "Ainda de pé. Bom.",
      "A estepe não tem pressa.",
      "Venha. Eu espero.",
      "Segure firme. Vou puxar."
    ],
    "vitoria": [
      "Você lutou bem.\nO chão lutou melhor.",
      "Levante. Aperte minha mão.\nVolte mais forte.",
      "Nove edições invicto.\nHoje não foi diferente.",
      "Força tem. Falta raiz."
    ],
    "contraZenon": {
      "abertura": "Devolvi seu cinturão nove\nvezes. Hoje, não.",
      "vitoria": "A estepe não tem dono.\nO torneio também não."
    }
  },
  "zenon": {
    "abertura": [
      "Kalós írthes. Sente-se\nà minha mesa.",
      "Meu torneio, minha ilha.\nSua última luta.",
      "Pode atacar primeiro.\nÉ cortesia da casa."
    ],
    "rounds": [
      "O jantar nem começou.",
      "Seu tributo, por favor.",
      "Encantador. Continue.",
      "A casa cobra no final."
    ],
    "vitoria": [
      "Aplausos para o convidado.\nA saída é pelos fundos.",
      "Obrigado pela energia.\nEla agora é minha.",
      "Todo estilo volta para\ncasa. A minha.",
      "O prazer foi todo meu.\nLiteralmente."
    ],
    "contraZenon": {
      "abertura": "Um espelho? Só cabe\num anfitrião nesta casa.",
      "vitoria": "Dois anfitriões era\ndemais. Ficou um."
    },
    "contraRival": {
      "hayato": {
        "abertura": "Trovão bonito. Aqui, eu\ndecido quando chove.",
        "vitoria": "Volte ao dojo, menino.\nO trovão é meu agora."
      },
      "wei-long": {
        "abertura": "Wei, meu velho rival.\nAinda de pé, que honra.",
        "vitoria": "O ferro dobra, Wei.\nBasta o fogo certo."
      },
      "min-ji": {
        "abertura": "Tantos chutes. Cada um\nme paga um tributo.",
        "vitoria": "Nota dez na pressa.\nZero no resultado."
      },
      "caio": {
        "abertura": "Uma roda na minha casa?\nAqui, o ritmo é meu.",
        "vitoria": "Bela ginga. Eu cobro\no ingresso da roda."
      },
      "aminu": {
        "abertura": "Pode carregar à vontade.\nEu cobro em dobro.",
        "vitoria": "Lança quebrada, escudo\nno chão. Próximo."
      },
      "centella": {
        "abertura": "Sua plateia é minha\nesta noite, luchadora.",
        "vitoria": "Linda máscara. Guarde-a\npara o próximo ano."
      },
      "camille": {
        "abertura": "Esgrima e savate. Que\nelegância. Que pena.",
        "vitoria": "Riposte elegante.\nPena que veio de mim."
      },
      "nila": {
        "abertura": "Uma terapeuta na minha\narena. Que conveniente.",
        "vitoria": "Sem pontos fracos, Nila?\nAcabo de achar o seu."
      },
      "baatar": {
        "abertura": "O guardião do meu cinturão\nquer ser o dono?",
        "vitoria": "Volte para a estepe,\navarga. O cinturão fica."
      }
    }
  }
}
```
