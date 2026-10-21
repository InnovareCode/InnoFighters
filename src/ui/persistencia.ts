import { salvarDadosV2, type ArmazenamentoLike, type DadosSalvosV2 } from '../core/storage';
import type { Regras } from '../meta';
import type { Persistencia } from './contexto';

/** Texto do aviso quando a gravação falha (cota cheia, modo privado ou progresso de um build mais novo no disco). */
export const MSG_NAO_SALVO = 'Progresso não salvo neste aparelho';

/**
 * Monta a `Persistencia` do jogo sobre o armazenamento. `salvar()` devolve o que `salvarDadosV2` devolveu
 * (false = NÃO gravou: cota/modo privado, ou v2 em disco de build mais novo, recusa de propósito) e, nesse caso,
 * chama `aoFalhar` — o aviso na tela. Quem salva nunca precisa checar o retorno; ele existe para a UI e os testes.
 */
export function criarPersistencia(
  armazenamento: ArmazenamentoLike,
  inicial: DadosSalvosV2,
  regras: Regras,
  aoFalhar: () => void,
): Persistencia {
  return {
    settings: inicial.s,
    hi: inicial.hi,
    prog: inicial.prog,
    salvar() {
      const gravou = salvarDadosV2(armazenamento, { s: this.settings, hi: this.hi, prog: this.prog }, regras);
      if (!gravou) aoFalhar();
      return gravou;
    },
  };
}
