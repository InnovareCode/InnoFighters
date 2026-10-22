import type { PedidoDeArte as PedidoDoGerenciador } from '../../assets/gerenciador';
import type { PedidoDeCarga } from '../../trailer/carga';
import { LUTADORES_FIXOS } from '../../trailer/carga';
import type { IdPlano, RoteiroDoTrailer } from '../../data/trailer/tipos';

/*
 * Carga ESCALONADA da arte do trailer (docs/spec-trailer-abertura.md §5.2). O plano de carga (puro, de `src/trailer/carga.ts`) diz QUANDO cada atlas começa a
 * carregar, em que plano precisa estar pronto e em que plano é solto; esta classe é a parte com efeito: pede ao `GerenciadorDeArte`, em SÉRIE (um atlas decodificando
 * por vez, nunca `Promise.all` do elenco), pré-busca o seguinte (HTTP, sem decodificar) e solta o que já foi usado. Regras:
 *  - no máximo 2 atlas não fixos residentes (o do plano atual e o do próximo) e BAATAR e ZENON nunca juntos (garantido pelo plano de carga);
 *  - o trailer nunca espera a rede: se a arte de um plano não chegou, o diretor troca o plano por um cartão de reserva (a cena consulta `pronto`);
 *  - ao sair (qualquer saída) solta TUDO o que carregou, inclusive o que ainda estava a caminho.
 */

/** O pedaço do `GerenciadorDeArte` de que a carga precisa (um falso nos testes). */
export interface GerenciadorDaCarga {
  readonly cenarios: ReadonlyMap<string, unknown>;
  estaPronto(p: PedidoDoGerenciador): boolean;
  garantir(p: PedidoDoGerenciador): Promise<void>;
  prebuscar(p: PedidoDoGerenciador): void;
  liberarLutador(id: string): void;
  liberarCenario(id: string): void;
  lutadoresResidentes(): string[];
}

export class CargaEscalonada {
  private readonly indice = new Map<IdPlano, number>();
  private readonly iniciados = new Set<PedidoDeCarga>();
  private readonly liberados = new Set<PedidoDeCarga>();
  private readonly prebuscados = new Set<PedidoDeCarga>();
  private cadeia: Promise<void> = Promise.resolve();
  private encerrada = false;
  /** Lutadores cuja carga falhou (a cena troca o plano deles por reserva). */
  readonly falhas = new Set<string>();

  constructor(
    roteiro: RoteiroDoTrailer,
    private readonly pedidos: readonly PedidoDeCarga[],
    private readonly arte: GerenciadorDaCarga,
    /** Chamado quando a arte de um pedido ACABA de chegar (a cena aquece o 1º desenho dela fora do caminho do plano). */
    private readonly aoChegar?: (p: PedidoDeCarga) => void,
  ) {
    roteiro.planos.forEach((p, i) => this.indice.set(p.id, i));
  }

  private idx(id: IdPlano): number {
    return this.indice.get(id) as number;
  }

  /**
   * Antes do 1º plano: solta o que os jogos anteriores deixaram na memória (atlas e cenários não fixos), para o pico do trailer ser o do plano de carga e não o
   * do plano mais o que sobrou. Os fixos (a vitrine) o gerenciador nunca solta.
   */
  limparSobras(): void {
    for (const id of this.arte.lutadoresResidentes()) if (!LUTADORES_FIXOS.has(id as never)) this.arte.liberarLutador(id);
    for (const id of [...this.arte.cenarios.keys()]) this.arte.liberarCenario(id);
  }

  /**
   * Chamado quando o plano de índice `i` COMEÇA (e uma vez no começo, com o índice de onde o trailer abre): solta o que já foi usado, inicia as cargas cujo plano de
   * partida chegou (em série) e pré-busca a seguinte. Idempotente.
   */
  entrouNoPlano(i: number): void {
    if (this.encerrada) return;
    for (const p of this.pedidos) {
      if (this.liberados.has(p)) continue;
      if (this.idx(p.soltarAoFimDe) < i) {
        // já usado (ou pulado, numa prévia que abre no meio): não carrega mais; solta se já estava na memória
        this.liberados.add(p);
        this.iniciados.add(p);
        this.soltar(p);
      }
    }
    for (const p of this.pedidos) {
      if (this.iniciados.has(p) || this.idx(p.comecaEm) > i) continue;
      this.iniciados.add(p);
      this.cadeia = this.cadeia.then(() => this.carregar(p));
    }
    // só o PRÓXIMO a carregar (o primeiro ainda não iniciado) é pré-buscado, uma vez: o download corre enquanto o atlas atual decodifica
    const proximo = this.pedidos.find((p) => !this.iniciados.has(p));
    if (proximo && !this.prebuscados.has(proximo)) {
      this.prebuscados.add(proximo);
      this.arte.prebuscar(pedidoDe(proximo));
    }
  }

  private async carregar(p: PedidoDeCarga): Promise<void> {
    if (this.encerrada || this.liberados.has(p)) return;
    try {
      await this.arte.garantir(pedidoDe(p));
    } catch (e) {
      console.error('trailer: a arte de', p.lutador, 'não chegou; o plano vira cartão de reserva', e);
      this.falhas.add(p.lutador);
    }
    // saiu (ou o plano já passou) enquanto carregava: solta o que acabou de chegar; senão avisa a cena
    if (this.encerrada || this.liberados.has(p)) this.soltar(p);
    else if (!this.falhas.has(p.lutador)) this.aoChegar?.(p);
  }

  private soltar(p: PedidoDeCarga): void {
    this.arte.liberarLutador(p.lutador);
    this.arte.liberarCenario(p.cenario);
  }

  /** A arte pedida está na memória (e não falhou)? A cena chama no começo de cada plano de luta: falso = `reservaForcada`. */
  pronto(arte: PedidoDoGerenciador): boolean {
    if ((arte.lutadores ?? []).some((id) => this.falhas.has(id))) return false;
    return this.arte.estaPronto(arte);
  }

  /** Solta tudo o que o trailer carregou (saída por qualquer caminho). Cargas ainda a caminho se soltam quando chegam. */
  liberarTudo(): void {
    this.encerrada = true;
    for (const p of this.pedidos) {
      this.liberados.add(p);
      this.soltar(p);
    }
  }
}

function pedidoDe(p: PedidoDeCarga): PedidoDoGerenciador {
  return { lutadores: [p.lutador], cenarios: [p.cenario] };
}
