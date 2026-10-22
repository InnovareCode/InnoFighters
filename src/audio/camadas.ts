import type { EventoLuta, IdLutador, LeituraLuta } from '../core/contratos';
import type { TrilhaMusica } from './audio-sys';
import { chavesSonoras, trilhaDeHoje } from './chaves';
import { reagirAosEventos, type SomPorNome } from './eventos';

/*
 * Ponte entre o jogo (fight.ts, main.ts) e as duas camadas PESADAS: a identidade sonora (`identidade-sonora`, que puxa `data/sons` e a síntese de voz) e os
 * temas (`temas`, que puxa `data/musica` e o compilador). Entram no pacote como pedaços separados, baixados por `import()` no boot (o pacote principal fica
 * menor e o rollback por código continua barato). Este módulo é LEVE (só tipos e `eventos`/`chaves`).
 *
 * `main.ts` chama `carregarCamadasSonoras` ANTES da primeira cena (a chamada é assíncrona, o jogo não). Se o pedaço não carregar (rede, cache), a chave volta a
 * `false` e o jogo segue com os sons e a música de antes. Enquanto a camada não estiver carregada (testes de cena, por exemplo) o comportamento é o de antes.
 */

type CamadaIdentidade = typeof import('./identidade-sonora');
type CamadaTemas = typeof import('./temas');
let identidade: CamadaIdentidade | null = null;
let temas: CamadaTemas | null = null;

export interface QuaisCamadas {
  readonly identidade?: boolean;
  readonly temas?: boolean;
}

/**
 * Baixa (e, ao carregar, VALIDA: os dois módulos lançam se um lutador estiver sem voz, sem tema ou fora do orçamento) as camadas pedidas.
 * Falha de REDE (o `import()` rejeita com `TypeError`): desliga a chave correspondente e devolve `false` (o jogo segue com o som e a música de antes).
 * Dados inválidos (qualquer outro erro): relança, e o boot cai.
 */
export async function carregarCamadasSonoras(quais: QuaisCamadas): Promise<boolean> {
  let ok = true;
  if (quais.identidade) {
    try {
      identidade = await import('./identidade-sonora');
    } catch (e) {
      if (!(e instanceof TypeError)) throw e; // dados inválidos (validação no carregamento): derruba o boot, alto e cedo
      ok = false;
      chavesSonoras.identidade = false;
      console.error('identidade sonora não carregou; seguindo com os sons de hoje', e);
    }
  }
  if (quais.temas) {
    try {
      temas = await import('./temas');
    } catch (e) {
      if (!(e instanceof TypeError)) throw e; // dados inválidos (validação no carregamento): derruba o boot, alto e cedo
      ok = false;
      chavesSonoras.temas = false;
      console.error('temas musicais não carregaram; seguindo com a música de hoje', e);
    }
  }
  return ok;
}

/** A identidade sonora está ligada E carregada? É o que manda a abertura da tarja e o som da sessão do especial calarem. */
export function identidadeAtiva(): boolean {
  return chavesSonoras.identidade && identidade !== null;
}

/** O AudioSys visto pela ponte: por nome (os sons de hoje) e, se a identidade estiver ligada, a semente da variação (`semente + 6`). */
export type AudioDoJogo = { readonly sementeVariacao?: number };

/**
 * Os sons dos eventos de um tick. Identidade desligada = `reagirAosEventos`, exatamente como antes. Ligada = `reagirComIdentidade` com o contexto
 * da luta (ids, fichas, tick) e a semente da variação do AudioSys. Kiai de vitória só no fim da luta (o plano lê `round.fimDaLuta`).
 */
export function reagirDoJogo(audio: AudioDoJogo, luta: Pick<LeituraLuta, 'fighters' | 't'>, eventos: readonly EventoLuta[]): void {
  if (identidade && chavesSonoras.identidade) {
    identidade.reagirComIdentidade(audio as unknown as Parameters<CamadaIdentidade['reagirComIdentidade']>[0], eventos, identidade.contextoSonoro(luta, typeof audio.sementeVariacao === 'number' ? audio.sementeVariacao : 0), undefined, true);
    return;
  }
  reagirAosEventos(audio as unknown as SomPorNome, eventos);
}

/**
 * A trilha de uma luta. Temas desligados (ou ainda não carregados) = a de hoje (`'chefe'` no chefão que tem `trilha`, `'fight'` no resto);
 * ligados = `trilhaDaLuta` (o tema do ADVERSÁRIO, `c2`, em todos os modos; o ZENON toca a valsa).
 */
export function trilhaDoJogo(cfg: { readonly c2: IdLutador; readonly chefe?: boolean | undefined }, regras: { readonly temasMusicais: boolean }, trilhaDoChefe?: 'chefe'): TrilhaMusica {
  if (temas && chavesSonoras.temas) return temas.trilhaDaLuta(cfg, regras, true, trilhaDoChefe);
  return trilhaDeHoje(cfg, trilhaDoChefe);
}
