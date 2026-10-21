import { IDS_LUTADORES, type IdLutador } from '../core/contratos';
import type { Regras } from './tipos';

/** Liberados de fabrica (decisao do dono): HAYATO, WEI LONG, MIN-JI, CAIO. */
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];

/**
 * Ordem aprovada pelo dono: AMINU, CENTELLA, CAMILLE, NILA (E5). A cada Arcade zerado libera-se o primeiro da fila
 * ainda nao liberado (`aplicarVitoriaArcade`); as regras e os testes cobrem fila de qualquer tamanho.
 */
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila'];

/** BAATAR (aprovado pelo dono): ultima luta do Arcade; liberado ao derrota-lo (`derrotouChefe`). */
export const CHEFE: IdLutador | null = 'baatar';

/** Rivais sorteados antes do chefao (ED4: 5 rivais + chefao = 6 lutas). */
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
