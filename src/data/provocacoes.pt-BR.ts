import type { TabelaDeFalas } from './provocacoes';

/*
 * Falas das provocações em pt-BR (docs/spec-provocacao-prerround-e-vitoria.md §7).
 *
 * FONTE DE VERDADE: este arquivo. Transcrito em 2026-10-21 do texto definitivo do Apolo (docs/textos-provocacao.md §5) por script
 * (parser do JSON -> .ts, com prova de ida e volta idêntica). Para mudar uma fala, edite AQUI; o .md ficou só como registro da autoria.
 *
 * Forma: "\n" = quebra de linha escolhida pelo autor; {rival} vira o nome do oponente (caixa alta) e conta 8 caracteres nos limites.
 * Limites: abertura, vitoria* e contra até 2 linhas de 34 e 64 no total; revanche/decisivo 1 linha de 34. Só Latin-1 e — … “ ” ‘ ’. Sem emoji.
 * O portão real é a medida em px no navegador (spec §10 item 11); a validação em provocacoes.ts roda no import e derruba o boot.
 * Termos de outro idioma (japonês, hauçá, espanhol, francês...) ainda pedem revisão de falante nativo antes de publicar (md §3).
 */
export const TEXTOS_PROVISORIOS = false;

export const PROVOCACOES_PT_BR: TabelaDeFalas = {
  hayato: {
    abertura: [
      'Ikuzo! O trovão não\nespera ninguém.',
      'Treinei sozinho por isso.\nNão me decepcione.',
      'Pisca, e já acabou.',
      'Pronto, {rival}?\nO raio cai uma vez só.',
    ],
    revanche: [
      'Agora eu esquentei.',
      'Outro raio? Tenho de sobra.',
      'Esse round é meu.',
      'Errei uma vez. Não erro duas.',
    ],
    decisivo: [
      'Último round. Último raio.',
      'Um trovão decide. O meu.',
      'Guarda alta. Lá vou eu.',
    ],
    vitoria: [
      'Rápido demais pra você?\nVolta quando trovejar.',
      'Nem precisei do\nsegundo raio.',
      'Treina mais. Eu continuo\nesperando no topo.',
      'Ouviu o estrondo?\nFoi você caindo.',
    ],
    vitoriaPerfeita: [
      'Nem me tocou.\nRápido demais, eu disse.',
      'Raio não se pega.\nAgora você sabe.',
    ],
    vitoriaPorTempo: [
      'Faltou tempo pra você.\nPra mim, sobrou.',
      'Tempo esgotado?\nEu ainda tinha raio.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Sua ilha, suas regras.\nMeu trovão.',
        ],
        vitoria: [
          'Seu cinturão agora mora\nno dojo do meu avô.',
        ],
      },
    },
  },
  'wei-long': {
    abertura: [
      'Lái ba. A montanha não\nse move por você.',
      'Respire fundo. Depois\nnão haverá tempo.',
      'Ferro se forja devagar.\nVocê vai sentir cada golpe.',
      '{rival}, a aula começa.\nTome notas.',
    ],
    revanche: [
      'O chá ainda nem esfriou.',
      'Paciência. A palma vem.',
      'Um tropeço não move montanha.',
      'Mais uma lição, então.',
    ],
    decisivo: [
      'A última lição é a mais longa.',
      'Agora, o ferro decide.',
      'Ainda de pé? Bom sinal.',
    ],
    vitoria: [
      'Volte daqui a dez anos.\nTraga um professor.',
      'O dragão nem acordou\ndireito.',
      'Pressa é para quem\nnão tem raízes.',
      'Lição encerrada.\nPode se curvar ao sair.',
    ],
    vitoriaPerfeita: [
      'Nenhum golpe tocou o mestre.\nAnote isso.',
      'A montanha nem tremeu.',
    ],
    vitoriaPorTempo: [
      'O tempo acabou. A lição\ncontinua amanhã.',
      'Paciência vence o relógio.\nSempre venceu.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Vi este torneio nascer.\nHoje o vejo mudar de mãos.',
        ],
        vitoria: [
          'Seu mármore racha, Arconte.\nO ferro, não.',
        ],
      },
    },
  },
  'min-ji': {
    abertura: [
      'Gaja! Tenta acompanhar\nmeus pés.',
      'Três chutes por segundo.\nConta comigo!',
      'Sorria! Vai ser rapidinho.',
      'Placar zerado, {rival}!\nPor pouco tempo.',
    ],
    revanche: [
      'Hwaiting! Eu, não você.',
      'Ponto seu? Sorte. Agora é meu!',
      'Mais alto? Pode deixar.',
    ],
    decisivo: [
      'Ponto decisivo! Adoro isso!',
      'Desempate! Melhor parte!',
      'Cansou? Eu nem suei.',
    ],
    vitoria: [
      'Nota dez pro chute.\nZero pra sua guarda.',
      'Viu? Nem precisei\ndo terceiro chute.',
      'Bom treino! Pra mim.',
      'Pede revanche. Eu adoro\nrevanche.',
    ],
    vitoriaPerfeita: [
      'Round perfeito!\nNota máxima, sem desconto!',
      'Nem encostou!\nRecorde pessoal!',
    ],
    vitoriaPorTempo: [
      'Venci no placar!\nConta os pontos, conta!',
      'Acabou o tempo!\nO placar não mente!',
    ],
    contra: {
      zenon: {
        abertura: [
          'Dono do torneio? Legal.\nEu sou dona do placar.',
        ],
        vitoria: [
          'Hwaiting! O cinturão vai\npra academia de Seul.',
        ],
      },
    },
  },
  caio: {
    abertura: [
      'Bora jogar, camará?\nA roda tá aberta.',
      'Quem não ginga, apanha.\nSimples assim.',
      'Relaxa. Vai doer\ncom estilo.',
      'Chega mais, {rival}.\nA ginga tá te esperando.',
    ],
    revanche: [
      'O berimbau mudou o toque.',
      'Agora é jogo de dentro.',
      'Achou que tinha acabado?',
      'Tomei uma? Faz parte da roda.',
    ],
    decisivo: [
      'Agora o jogo fica bom, camará.',
      'Ih, tá nervoso? Ginga!',
    ],
    vitoria: [
      'Iê! Volta pra roda\nquando aprender a gingar.',
      'Nem viu de onde veio,\nné, camará?',
      'Malandragem não se treina.\nSe vive.',
      'Valeu o jogo. Pena que\nvocê só assistiu.',
    ],
    vitoriaPerfeita: [
      'Ginga limpa, camará.\nNão pegou nenhuma.',
      'Saí da roda sem\num arranhão. Iê!',
    ],
    vitoriaPorTempo: [
      'Deu o tempo, camará.\nGanhei no jogo.',
      'Parou o berimbau.\nE eu tava na frente.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Mansão bonita, chefe.\nCabe uma roda aqui?',
        ],
        vitoria: [
          'A roda é de todo mundo.\nO cinturão também.',
        ],
      },
    },
  },
  aminu: {
    abertura: [
      'Sannu! Bem-vindo à\nminha mão de lança.',
      'Plateia, contem até três.\nNo três, acabou.',
      'Defende à vontade.\nMeu soco gosta de esperar.',
      'Plateia, conheçam {rival}!\nAgora, se despeçam.',
    ],
    revanche: [
      'Kai! Esse doeu, né?',
      'A carga tá subindo...',
      'Escudo na frente, lança atrás.',
      'Plateia, mais barulho!',
    ],
    decisivo: [
      'Nível três guardado pra agora!',
      'Plateia, agora é pra valer!',
    ],
    vitoria: [
      'Isso foi o nível um.\nQuer ver o três?',
      'Índigo não sai na lavagem.\nEsse soco também não.',
      'Briga de feira? Isso foi\nesporte de elite.',
      'Yauwa! Palmas pra quem\nficou de pé um tempo.',
    ],
    vitoriaPerfeita: [
      'Plateia, viram algum golpe\nem mim? Nem eu!',
      'Escudo intacto!\nO índigo saiu sem mancha!',
    ],
    vitoriaPorTempo: [
      'Plateia, o relógio parou!\nA lança, não.',
      'Tempo! E a carga ainda\ntava no nível dois.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Cobra tributo, é? Hoje\na conta vem de Kano.',
        ],
        vitoria: [
          'Kai! O dono caiu.\nPlateia, isso é dambe!',
        ],
      },
    },
  },
  centella: {
    abertura: [
      '¡Órale, público! Hoje\na faísca vira incêndio.',
      'Três gerações de lucha\ncontra uma só. Boa sorte.',
      'As cordas são minhas.\nO canto é seu.',
      '¡Público, recebam {rival}!\nVai durar pouco.',
    ],
    revanche: [
      '¡Arriba! Ainda tenho corda.',
      'A lona chama seu nome.',
      'Mais alto, público!',
      'Caí. A técnica sempre levanta!',
    ],
    decisivo: [
      '¡Dos de tres caídas, público!',
      'Agora vem o voo.',
      'Do alto das cordas. Agora.',
    ],
    vitoria: [
      '¡Uno, dos, tres! Já pode\nse levantar.',
      'Essa vai pra você, abuela.',
      'A máscara fica.\nO cinturão vem comigo.',
      'Os técnicos sempre\nvencem no final.',
    ],
    vitoriaPerfeita: [
      '¡Nem tocou na máscara!\nPúblico, isso é técnica!',
      'Lona limpa, cordas minhas.\n¡Perfecto!',
    ],
    vitoriaPorTempo: [
      '¡Tiempo! O público já\ntinha escolhido.',
      'O sino tocou, e a faísca\nainda brilhava.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Lá em casa, o vilão\nsempre perde no final.',
        ],
        vitoria: [
          '¡Órale! A plateia agora\né minha, Arconte.',
        ],
      },
    },
  },
  camille: {
    abertura: [
      'En garde. E, por favor,\nataque primeiro.',
      'Já vi seus três golpes.\nNenhum me preocupa.',
      'Ataque quando quiser.\nEu respondo antes.',
      '{rival}. Mostre o primeiro\nerro. Não tenho pressa.',
    ],
    revanche: [
      'Anotado. Próximo.',
      'Seu ombro avisa o golpe.',
      'Um ponto seu. Entendi o resto.',
      'Paciência. Você vai errar.',
    ],
    decisivo: [
      'Último assalto. Mesma precisão.',
      'Agora, a riposte certa.',
      'Mesmo erro. De novo.',
    ],
    vitoria: [
      'Touché. Era o óbvio.',
      'Atacou na hora errada.\nComo eu previ.',
      'Seu golpe mais forte?\nFoi o meu, de volta.',
      'Voilà. Volte com\num plano.',
    ],
    vitoriaPerfeita: [
      'Parade, riposte, fim.\nLimpo como na aula.',
      'Imaculado. Seu ataque\nnunca chegou.',
    ],
    vitoriaPorTempo: [
      'Cronômetro zerado.\nDois toques à frente.',
      'Venci no relógio.\nTambém é esgrima.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Todo estilo descende do\nseu? Prove. En garde.',
        ],
        vitoria: [
          'Riposte. Até o dono\ndo torneio ataca mal.',
        ],
      },
    },
  },
  nila: {
    abertura: [
      'Respire. Vou achar seu\nponto fraco com calma.',
      'Elefante ou serpente?\nVocê escolhe como cair.',
      'Vaa. Já sei onde dói.',
      '{rival}, sua postura\njá me contou tudo.',
    ],
    revanche: [
      'Sua respiração te entrega.',
      'Mudo a postura. E você?',
      'Um ponto marma por vez.',
      'Diagnóstico revisto. Continue.',
    ],
    decisivo: [
      'Calma. Ainda nem comecei.',
      'Última sessão. Sem anestesia.',
    ],
    vitoria: [
      'Gelo e repouso.\nVolte quando sarar.',
      'Não doeu tanto.\nEu escolhi o ponto.',
      'Mathi. Já basta por hoje.',
      'Previsível. A serpente\nviu tudo.',
    ],
    vitoriaPerfeita: [
      'A serpente não se pega.\nVocê tentou.',
      'Respiração em ordem.\nA sua, nem tanto.',
    ],
    vitoriaPorTempo: [
      'Fim da consulta.\nO tempo deu o diagnóstico.',
      'Não precisei terminar.\nO tempo terminou por mim.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Sua guarda tem um ponto\nque nunca curou, Arconte.',
        ],
        vitoria: [
          'Repouso, Arconte. Seu\ntorneio precisa de cura.',
        ],
      },
    },
  },
  baatar: {
    abertura: [
      'Za. Mostre o que trouxe.',
      'Só os pés tocam o chão.\nOs seus, por enquanto.',
      'O céu é grande.\nO chão está perto.',
      '{rival}. Bom adversário.\nO chão decide.',
    ],
    revanche: [
      'Ainda de pé. Bom.',
      'A estepe não tem pressa.',
      'Venha. Eu espero.',
      'Caí uma vez. Basta.',
    ],
    decisivo: [
      'Segure firme. Vou puxar.',
      'Agora, só um fica de pé.',
    ],
    vitoria: [
      'Você lutou bem.\nO chão lutou melhor.',
      'Levante. Aperte minha mão.\nVolte mais forte.',
      'Nove edições invicto.\nHoje não foi diferente.',
      'Força tem. Falta raiz.',
    ],
    vitoriaPerfeita: [
      'Nem me tirou do lugar.',
      'Meus pés nunca saíram\ndo chão.',
    ],
    vitoriaPorTempo: [
      'O sol se pôs.\nEu continuei de pé.',
      'Tempo. Eu ainda\nestava firme.',
    ],
    contra: {
      zenon: {
        abertura: [
          'Devolvi seu cinturão nove\nvezes. Hoje, não.',
        ],
        vitoria: [
          'A estepe não tem dono.\nO torneio também não.',
        ],
      },
    },
  },
  zenon: {
    abertura: [
      'Kalós írthes. Sente-se\nà minha mesa.',
      'Meu torneio, minha ilha.\nSua última luta.',
      'Pode atacar primeiro.\nÉ cortesia da casa.',
      '{rival}. Finalmente.\nA casa estava à sua espera.',
    ],
    revanche: [
      'Encantador. Continue.',
      'Seu tributo, por favor.',
      'A casa cobra no final.',
      'Uma cortesia. Não se repetirá.',
      'O jantar nem começou.',
    ],
    decisivo: [
      'Sirvam a última rodada.',
      'Agora, o prato principal.',
    ],
    vitoria: [
      'Aplausos para o convidado.\nA saída é pelos fundos.',
      'Obrigado pela energia.\nGuardarei com carinho.',
      'Todo estilo volta para\ncasa. A minha.',
      'O prazer foi todo meu.\nLiteralmente.',
    ],
    vitoriaPerfeita: [
      'Nem amassou meu casaco.\nQue convidado discreto.',
      'Nenhuma mancha na toalha.\nVolte sempre.',
    ],
    vitoriaPorTempo: [
      'O relógio é meu também.\nComo tudo nesta ilha.',
      'Fim do jantar.\nA conta fica com você.',
    ],
    contra: {
      hayato: {
        abertura: [
          'Trovão bonito. Aqui, eu\ndecido quando chove.',
        ],
        vitoria: [
          'Volte ao dojo, menino.\nO trovão é meu agora.',
          'Seu avô treinou bem você.\nEu treinei melhor.',
        ],
      },
      'wei-long': {
        abertura: [
          'Wei, meu velho rival.\nAinda de pé, que honra.',
        ],
        vitoria: [
          'O ferro dobra, Wei.\nBasta o fogo certo.',
          'Envelheceu bem, Wei.\nMas envelheceu.',
        ],
      },
      'min-ji': {
        abertura: [
          'Tantos chutes. Cada um\nme paga um tributo.',
        ],
        vitoria: [
          'Nota dez na pressa.\nZero no resultado.',
          'Revanche? Claro. A casa\nadora clientes fiéis.',
        ],
      },
      caio: {
        abertura: [
          'Uma roda na minha casa?\nAqui, o ritmo é meu.',
        ],
        vitoria: [
          'Bela ginga. Eu cobro\no ingresso da roda.',
          'A ginga cansa.\nO anfitrião, não.',
        ],
      },
      aminu: {
        abertura: [
          'Pode carregar à vontade.\nEu cobro em dobro.',
        ],
        vitoria: [
          'Lança quebrada, escudo\nno chão. Próximo.',
          'Nível três? A casa\ncobra nível dez.',
        ],
      },
      centella: {
        abertura: [
          'Sua plateia é minha\nesta noite, luchadora.',
        ],
        vitoria: [
          'Linda máscara. Guarde-a\npara o próximo ano.',
          'Três gerações de lucha.\nUma tarde comigo.',
        ],
      },
      camille: {
        abertura: [
          'Esgrima e savate. Que\nelegância. Que pena.',
        ],
        vitoria: [
          'Riposte elegante.\nPena que veio de mim.',
          'Touché, Camille. Desta\nvez, a lição foi minha.',
        ],
      },
      nila: {
        abertura: [
          'Uma terapeuta na minha\narena. Que conveniente.',
        ],
        vitoria: [
          'Sem pontos fracos, Nila?\nAcabo de achar o seu.',
          'Diagnóstico, doutora?\nExcesso de confiança.',
        ],
      },
      baatar: {
        abertura: [
          'O guardião do meu cinturão\nquer ser o dono?',
        ],
        vitoria: [
          'Volte para a estepe,\navarga. O cinturão fica.',
          'Décima vez, avarga.\nO cinturão volta para mim.',
        ],
      },
      zenon: {
        abertura: [
          'Um espelho? Só cabe\num anfitrião nesta casa.',
        ],
        vitoria: [
          'Dois anfitriões era\ndemais. Ficou um.',
        ],
      },
    },
  },
};
