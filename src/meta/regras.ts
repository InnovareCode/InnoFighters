import { IDS_LUTADORES, type IdLutador } from '../core/contratos';
import type { Regras } from './tipos';

/** Liberados de fabrica (decisao do dono): HAYATO, WEI LONG, MIN-JI, CAIO. */
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];

/**
 * Ordem aprovada pelo dono: AMINU, CENTELLA, CAMILLE, NILA, BAATAR. A cada Arcade zerado libera-se o primeiro da fila
 * ainda nao liberado (`aplicarVitoriaArcade`); as regras e os testes cobrem fila de qualquer tamanho. Quem ja liberou o
 * BAATAR ao derrota-lo como chefe nao perde nada: `proximoDaFila` pula quem ja esta liberado.
 */
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila', 'baatar'];

/**
 * Chefao FINAL: ZENON ARGYROS, "O Arconte" (docs/spec-chefao-zenon.md). O BAATAR virou lutador normal (5o da fila). Derrotado, o
 * ZENON e jogavel (D-Z1); jogando COM ele nao ha luta de chefe (ED7). Com `chefesDaFila`, e o chefao so quando os 5 da fila
 * ja estao liberados (`chefeDoArcade`); antes, o chefao e o proximo guardiao.
 */
export const CHEFE: IdLutador | null = 'zenon';

/** Rivais sorteados antes do chefao (ED4: 5 rivais + chefao = 6 lutas; sem chefao, a escada tem 5 etapas). */
export const TAMANHO_ESCADA = 5;

export const REGRAS_PADRAO: Regras = {
  roster: IDS_LUTADORES,
  iniciais: INICIAIS,
  fila: FILA_DESBLOQUEIO,
  chefe: CHEFE,
  tamanhoEscada: TAMANHO_ESCADA,
  travadosNaEscada: true, // ED5: vitrine, da vontade de liberar
  esquiva: true,
  cinematica: true,
  // P1: o mecanismo (`chefeDoArcade`, `aplicarVitoriaArcade({ chefe })`, `montarEscada`) esta pronto, mas o padrao so vira `true`
  // junto com a L1 (fim.ts passando o id do chefao): antes disso a UI ainda informa `{ derrotouChefe }` e a escada e o
  // desbloqueio tem de concordar. Virar o padrao muda a assercao de escada de e5-elenco/progresso.test (ZENON no fim).
  chefesDaFila: false,
  temasMusicais: true,
};
