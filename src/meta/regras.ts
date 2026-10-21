import { IDS_LUTADORES, type IdLutador } from '../core/contratos';
import type { Regras } from './tipos';

/** Liberados de fabrica (decisao do dono): HAYATO, WEI LONG, MIN-JI, CAIO. */
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];

/**
 * Ordem aprovada pelo dono: AMINU, CENTELLA, CAMILLE, NILA.
 * VAZIA ate a E5: esses ids ainda nao existem em `IDS_LUTADORES` (contratos.ts), e `IdLutador` nao os aceita.
 * Quando entrarem, e so preencher aqui — as regras e os testes ja cobrem fila de qualquer tamanho.
 */
export const FILA_DESBLOQUEIO: readonly IdLutador[] = [];

/** BAATAR (aprovado pelo dono). `null` ate o id entrar em `IDS_LUTADORES` (E3/E5). */
export const CHEFE: IdLutador | null = null;

/** Rivais sorteados antes do chefao (ED4: 5 rivais + chefao). */
export const TAMANHO_ESCADA = 5;

export const REGRAS_PADRAO: Regras = {
  roster: IDS_LUTADORES,
  iniciais: INICIAIS,
  fila: FILA_DESBLOQUEIO,
  chefe: CHEFE,
  tamanhoEscada: TAMANHO_ESCADA,
  travadosNaEscada: true, // ED5: vitrine, da vontade de liberar
};
