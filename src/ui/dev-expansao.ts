import { REGRAS_PADRAO, type Regras } from '../meta';

/**
 * REGRAS de desenvolvimento e de teste (nunca usadas em produção). O `main.ts` só as importa (import dinâmico) em
 * desenvolvimento, então não entram no bundle de produção. O elenco é sempre o real (os 9 lutadores, a arte de verdade):
 * só mudam as regras de desbloqueio.
 *
 * - `?expansao=1` (`regrasExpansao`): os 9 liberados, com o BAATAR jogável e ainda chefão do ARCADE. Serve para ver e
 *   jogar os novos sem zerar o ARCADE cinco vezes.
 * - `?expansao=4` (`regrasDeQuatro`): só os 4 de fábrica, sem fila nem chefão (o jogo de antes da E5). É o que os testes
 *   de fidelidade com o protótipo (que só tem 4 lutadores) e o ARCADE de 3 lutas usam.
 *
 * Antes da E5 esta fixture também tinha um elenco FALSO de 9 (cópias de arte) para testar a grade 3x3 e o desbloqueio;
 * saiu: a produção tem os 9 reais e os e2e (expansao.spec.ts) rodam neles.
 */

/** Os 4 liberados de fábrica do jogo de antes da E5. */
const INICIAIS_DE_FABRICA = ['hayato', 'wei-long', 'min-ji', 'caio'] as const;

/** `?expansao=1`: o roster real inteiro liberado; o chefão continua sendo a última luta do ARCADE (quando não é o seu lutador). */
export function regrasExpansao(): Regras {
  return {
    roster: [...REGRAS_PADRAO.roster],
    iniciais: [...REGRAS_PADRAO.roster],
    fila: [],
    chefe: REGRAS_PADRAO.chefe,
    tamanhoEscada: REGRAS_PADRAO.tamanhoEscada,
    travadosNaEscada: REGRAS_PADRAO.travadosNaEscada,
    esquiva: REGRAS_PADRAO.esquiva,
    cinematica: REGRAS_PADRAO.cinematica,
    // sem fila, o chefao e sempre o Anfitriao: a regra de antes basta (P1)
    chefesDaFila: false,
    // o jogo com tudo liberado soa como o de produção (temas por lutador); só `?expansao=4` (fidelidade com o protótipo) fica com a música de antes
    temasMusicais: REGRAS_PADRAO.temasMusicais,
    trailer: REGRAS_PADRAO.trailer,
  };
}

/** `?expansao=4`: o jogo de 4 lutadores (sem fila nem chefão). */
export function regrasDeQuatro(): Regras {
  const quatro = [...INICIAIS_DE_FABRICA];
  // Fidelidade com o protótipo: sem esquiva nem cinemática (spec esquiva/cinemática, B14).
  return {
    roster: quatro,
    iniciais: quatro,
    fila: [],
    chefe: null,
    tamanhoEscada: REGRAS_PADRAO.tamanhoEscada,
    travadosNaEscada: true,
    esquiva: false,
    cinematica: false,
    chefesDaFila: false,
    temasMusicais: false,
    // a abertura de hoje (CenaIntro) é o oráculo de pixel da fidelidade com o protótipo: sem trailer nem modo atrair
    trailer: false,
  };
}
