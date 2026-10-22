import type { Falas } from './apresentacao-lutadores';

/*
 * Textos dos chefões (Os Cinco Selos): enredo, avisos, cartões, falas, epílogos e linhas da seleção.
 * TRANSCRITO em 2026-10-21 de docs/textos-chefoes.md §9 (JSON do Apolo, item A1) pelo script da L1: a partir daqui a FONTE É ESTE ARQUIVO (editar o .ts).
 * Limites de partida (spec §2.5): aviso <= 17 por linha; avisoRodape <= 56; cartão 14 / 18 / 20; falas.entrada <= 96 com a 1ª frase <= 46 (o código corta no 1º ". ");
 * fase2 <= 28; vitória <= 60; derrota <= 72; epílogo <= 56. A medida de verdade é em pixels, no navegador (tests/e2e/chefoes-l1e1.spec.ts).
 * `{NOME}` em `desbloqueioGuardiao` vira o `ch.name` do guardião.
 */

/** O epílogo do desbloqueio: o narrador diz quem é e por que guardava o selo; o convite é a voz do guardião. */
export type EpilogoDoChefe = { readonly quem: string; readonly porque: string; readonly convite: string };

/** Os textos de UM chefão. Os guardiões têm tudo; o ZENON só o que muda (o resto mora em `APRESENTACAO.zenon`). */
export type TextosDoChefe = {
  readonly aviso?: readonly [string, string];
  readonly avisoRodape: string;
  readonly cartao?: { readonly nome: string; readonly titulo: string; readonly rodape: string };
  /** Título do HUD (<= 16, D-A5). */
  readonly tituloHud?: string;
  /** Rótulo da tela de VS ("ARCADE — A GUARDIÃ"). */
  readonly vs: string;
  readonly falas?: Falas;
  readonly epilogo: EpilogoDoChefe;
  /** ZENON já derrotado (D-A3). */
  readonly avisoRevanche?: readonly [string, string];
  readonly avisoRodapeRevanche?: string;
  /** Título do cartão de desbloqueio no lugar de "<NOME> SE JUNTA A VOCÊ!" (ZENON: "O ANFITRIÃO SE RENDE"). */
  readonly desbloqueioTitulo?: string;
};

export const TEXTOS_DOS_CHEFOES: Readonly<Record<string, TextosDoChefe>> = {
  aminu: {
    aviso: ['O PRIMEIRO SELO', 'NÃO TEM PRESSA'],
    avisoRodape: 'Selo da paciência: 1 round, 2 barras de vida.',
    cartao: {
      nome: 'AMINU',
      titulo: 'A LANÇA DE KANO',
      rodape: 'SELO DA PACIÊNCIA',
    },
    tituloHud: 'A LANÇA DE KANO',
    vs: 'ARCADE — O GUARDIÃO',
    falas: {
      entrada: 'Plateia, o primeiro selo é da paciência. Índigo bom leva dias na cuba, e soco bom também!',
      fase2: 'Plateia, carga máxima!',
      vitoria: 'Pressa demais! O selo fica em Kano mais um pouco.',
      derrota: 'Plateia, palmas! Soube esperar a hora. O primeiro selo é seu.',
    },
    epilogo: {
      quem: 'Aminu luta dambe para sustentar as tinturarias de Kano.',
      porque: 'A bolsa do Arconte tem um preço: barrar os apressados.',
      convite: 'Quem esperou até aqui merece o selo. E a minha lança!',
    },
  },
  centella: {
    aviso: ['O SEGUNDO SELO', 'QUER ESPETÁCULO'],
    avisoRodape: 'Selo do público: 1 round, 2 barras de vida.',
    cartao: {
      nome: 'CENTELLA',
      titulo: 'A FAÍSCA DA ARENA',
      rodape: 'SELO DO PÚBLICO',
    },
    tituloHud: 'A FAÍSCA',
    vs: 'ARCADE — A GUARDIÃ',
    falas: {
      entrada: 'Público, o segundo selo quer espetáculo. ¡A arena é do Arconte, mas o grito é meu!',
      fase2: '¡Segunda caída, público!',
      vitoria: '¡Sem show, sem selo! O público pediu mais.',
      derrota: '¡Que lucha, público! A máscara se curva: o segundo selo é seu.',
    },
    epilogo: {
      quem: 'Centella faz lucha libre técnica, em terceira geração.',
      porque: 'Guarda o selo em troca da maior arena do mundo.',
      convite: 'A arena gostou de você. Eu também. ¡Vamos!',
    },
  },
  camille: {
    aviso: ['O TERCEIRO SELO', 'ESCOLHE A HORA'],
    avisoRodape: 'Selo do tempo certo: 1 round, 2 barras de vida.',
    cartao: {
      nome: 'CAMILLE',
      titulo: 'A RIPOSTE',
      rodape: 'SELO DO TEMPO CERTO',
    },
    tituloHud: 'A RIPOSTE',
    vs: 'ARCADE — A GUARDIÃ',
    falas: {
      entrada: 'O terceiro selo é do tempo certo. Quem ataca cedo demais não chega ao Arconte.',
      fase2: 'Segundo assalto. Eu começo.',
      vitoria: 'Atacou cedo demais. O selo continua comigo.',
      derrota: 'Touché. Enfim alguém que espera o tempo certo.',
    },
    epilogo: {
      quem: 'Camille trocou o florete pelo savate, não a precisão.',
      porque: 'Não confia no Arconte. Julga quem merece chegar até ele.',
      convite: 'Vá. E não ataque no tempo dele.',
    },
  },
  nila: {
    aviso: ['O QUARTO SELO', 'TEM DUAS FACES'],
    avisoRodape: 'Selo das duas faces: 1 round, 2 barras de vida.',
    cartao: {
      nome: 'NILA',
      titulo: 'A LUA DE KERALA',
      rodape: 'SELO DAS DUAS FACES',
    },
    tituloHud: 'A LUA DE KERALA',
    vs: 'ARCADE — A GUARDIÃ',
    falas: {
      entrada: 'O quarto selo tem duas faces, como eu. Aprenda a mudar antes que o Arconte esvazie você.',
      fase2: 'Respire. Segunda consulta.',
      vitoria: 'Uma postura só não basta. Lá na frente, isso custa caro.',
      derrota: 'Alta concedida. Você aprendeu a mudar. O quarto selo é seu.',
    },
    epilogo: {
      quem: 'Nila é fisioterapeuta e mestra de kalaripayattu.',
      porque: 'Estudou o selo que drena energia para ensinar a escapar.',
      convite: 'Ele cobra. Eu ensinei. Agora vá.',
    },
  },
  baatar: {
    aviso: ['O ÚLTIMO SELO', 'É DE UM CAMPEÃO'],
    avisoRodape: 'Último selo, o do campeão: 1 round, 2 barras de vida.',
    cartao: {
      nome: 'BAATAR',
      titulo: 'O AVARGA',
      rodape: 'SELO DO CAMPEÃO',
    },
    tituloHud: 'O AVARGA',
    vs: 'ARCADE — O GUARDIÃO',
    falas: {
      entrada: 'Guardo o último selo. Depois de mim, só o Arconte.',
      fase2: 'Agora o chão é meu.',
      vitoria: 'O portão segue fechado. Volte outro dia.',
      derrota: 'Você me tirou do chão. Agora, tire o dele.',
    },
    epilogo: {
      quem: 'Baatar, o Avarga, venceu nove edições do torneio.',
      porque: 'Guarda o portão pela revanche que o Arconte nunca deu.',
      convite: 'Faça o que eu não consegui.',
    },
  },
  zenon: {
    avisoRevanche: ['O ANFITRIÃO', 'QUER REVANCHE'],
    avisoRodape: 'A última luta do torneio: 1 round, 2 barras de vida.',
    avisoRodapeRevanche: 'A casa reabriu para você: 1 round, 2 barras de vida.',
    vs: 'ARCADE — O ANFITRIÃO',
    desbloqueioTitulo: 'O ANFITRIÃO SE RENDE',
    epilogo: {
      quem: 'Por trinta anos, o cinturão não saiu da casa do Arconte.',
      porque: 'Os Cinco Selos eram pactos dele. Você desfez um por um.',
      convite: 'Sente-se do meu lado da mesa. Por enquanto.',
    },
  },
};

/** Textos comuns às telas de seleção e de desbloqueio. */
export const TEXTOS_COMUNS = {
  desbloqueioGuardiao: '{NOME} SE JUNTA A VOCÊ!',
  desbloqueioGuardiaoReserva: 'SELO ENTREGUE!',
  selecao: {
    proximo: ['Guarda o próximo selo do torneio.', 'Vença no fim do ARCADE para liberar.'],
    outros: ['Guarda um dos Cinco Selos.', 'A vez dessa luta ainda não chegou.'],
    anfitriao: ['Só recebe quem traz os Cinco Selos.', 'Derrote-o para liberar.'],
  },
} as const;
