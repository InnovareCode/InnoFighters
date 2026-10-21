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
 * Chefao: NENHUM por enquanto (TEMPORARIO). O BAATAR virou lutador normal e o Zenon Argyros ainda nao entrou: o Arcade
 * termina sem luta de chefe (escada so com os `TAMANHO_ESCADA` rivais; `derrotouChefe` nunca vale). Quando o Zenon entrar,
 * e so trocar este valor pelo id dele.
 */
export const CHEFE: IdLutador | null = null;

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
};
