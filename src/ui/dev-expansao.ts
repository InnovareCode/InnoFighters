import type { GerenciadorDeArte } from '../assets/gerenciador';
import type { Elenco, LutadorRender } from '../assets/elenco';
import type { IdLutador } from '../core/contratos';
import { IDS_LUTADORES } from '../core/contratos';
import type { Regras } from '../meta';

/**
 * FIXTURE de desenvolvimento e de teste (nunca usada em produção): um elenco de 9 lutadores FALSOS (os 4 reais mais
 * 4 "novos" e 1 chefão, todos reaproveitando a arte dos reais) para exercitar a grade 3x3, os estados
 * liberado/travado/NOVO!, a escada com chefão e os avisos de desbloqueio enquanto a arte nova não existe.
 *
 * O `main.ts` só a importa (import dinâmico) em desenvolvimento com `?expansao=1`, então não entra no bundle de
 * produção; os testes unitários a usam direto.
 */

const cast = (s: string): IdLutador => s as IdLutador;

/** Os 4 "novos" na ordem da fila de desbloqueio e o chefão. */
export const IDS_NOVOS_FALSOS: readonly IdLutador[] = ['novo-a', 'novo-b', 'novo-c', 'novo-d'].map(cast);
export const CHEFE_FALSO: IdLutador = cast('chefe-x');

/** De quem cada falso copia a arte e os dados. */
const MOLDE: Readonly<Record<string, IdLutador>> = {
  'novo-a': 'hayato',
  'novo-b': 'wei-long',
  'novo-c': 'min-ji',
  'novo-d': 'caio',
  'chefe-x': 'caio',
};

/** Regras com 9 ids: 4 iniciais, fila de 4, chefão, escada de 5 rivais + chefão, travados podem ser rivais. */
export function regrasExpansaoFalsa(): Regras {
  const iniciais = [...IDS_LUTADORES];
  return {
    roster: [...iniciais, ...IDS_NOVOS_FALSOS, CHEFE_FALSO],
    iniciais,
    fila: [...IDS_NOVOS_FALSOS],
    chefe: CHEFE_FALSO,
    tamanhoEscada: 5,
    travadosNaEscada: true,
  };
}

/**
 * Acrescenta os 5 falsos ao elenco (cópias dos dados com outro id e nome; o chefão maior, escala 1,3x) e faz o
 * gerenciador de arte tratá-los como apelidos dos lutadores de origem.
 */
export function ampliarElenco(elenco: Elenco, arte: GerenciadorDeArte): Elenco {
  const saida: Record<string, LutadorRender> = { ...elenco };
  for (const [falso, molde] of Object.entries(MOLDE)) {
    const base = elenco[molde];
    const chefe = falso === CHEFE_FALSO;
    const nome = chefe ? 'CHEFE X' : `NOVO ${falso.slice(-1).toUpperCase()}`;
    saida[falso] = {
      ch: { ...base.ch, id: cast(falso), name: nome, ...(chefe ? { scale: base.ch.scale * 1.3, K: base.ch.K * 1.3 } : {}) },
      arte: base.arte,
    };
    arte.registrarApelido(falso, molde);
  }
  return saida as unknown as Elenco;
}
