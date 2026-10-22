import type { Configuracoes } from '../core/contratos';
import { salvarDadosV2, type ArmazenamentoLike, type DadosSalvosV2 } from '../core/storage';
import type { Regras } from '../meta';
import type { Persistencia } from './contexto';

/** Texto do aviso quando a gravação falha (cota cheia, modo privado ou progresso de um build mais novo no disco). */
export const MSG_NAO_SALVO = 'Progresso não salvo neste aparelho';

/**
 * Preferências de versões antigas que o jogo deixou de oferecer (cinemática do especial e provocações viraram parte do jogo, sempre
 * ligadas: decisão do dono). O save segue aditivo: elas NÃO são apagadas do disco, só deixam de valer na memória. `criarPersistencia`
 * as tira de `settings` ao carregar (nenhum consumidor as vê, inclusive a cena de luta) e as devolve ao gravar.
 */
const PREFERENCIAS_APOSENTADAS = ['cinematica', 'provocacoes'] as const;

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
  const settings: Configuracoes = { ...inicial.s };
  const retidas: Partial<Configuracoes> = {};
  for (const k of PREFERENCIAS_APOSENTADAS) {
    const v = settings[k];
    if (v !== undefined) Object.assign(retidas, { [k]: v });
    delete settings[k];
  }
  return {
    settings,
    hi: inicial.hi,
    prog: inicial.prog,
    salvar() {
      const gravou = salvarDadosV2(armazenamento, { s: { ...retidas, ...this.settings }, hi: this.hi, prog: this.prog }, regras);
      if (!gravou) aoFalhar();
      return gravou;
    },
  };
}
