import type { PedidoDeArte as PedidoDoGerenciador } from '../../assets/gerenciador';
import type { PedidoDeCarga } from '../../trailer/carga';
import { CENARIOS_DO_TITULO, LUTADORES_DO_TITULO, LUTADORES_FIXOS } from '../../trailer/carga';
import type { IdPlano, RoteiroDoTrailer } from '../../data/trailer/tipos';

/*
 * Carga ESCALONADA da arte do trailer (docs/spec-trailer-abertura.md §5.2; T12 do orçamento, docs/orcamentos-2026-10-23.md §2.3). O plano de carga (puro, de
 * `src/trailer/carga.ts`) diz QUANDO cada pedido começa a carregar, em que plano precisa estar pronto e em que plano é solto; esta classe é a parte com efeito: pede ao
 * `GerenciadorDeArte`, em SÉRIE (um atlas decodificando por vez, nunca `Promise.all` do elenco), pré-busca o seguinte (HTTP, sem decodificar) e solta o que já foi usado.
 * O trailer NÃO tem arte fixa: a vitrine também vai e vem por plano, e é isso que o põe abaixo de 150 MiB de imagem decodificada. Regras:
 *  - na memória (ou a caminho) só o que o plano atual e os pedidos já iniciados seguram; o que dois planos em sequência dividem (o HAYATO do P0 ao P1) NÃO sai nem volta:
 *    os pedidos novos são iniciados ANTES de os terminados serem soltos, e um atlas só sai quando nenhum pedido ativo o segura;
 *  - BAATAR e ZENON nunca juntos (garantido pelo plano de carga);
 *  - o trailer nunca espera a rede: se a arte de um plano não chegou, o diretor troca o plano por um cartão de reserva (a cena consulta `pronto`);
 *  - ao sair (qualquer saída) solta TUDO o que carregou, MENOS a vitrine e os cenários do título, que o destino (título ou menu) pede em seguida.
 */

/** O pedaço do `GerenciadorDeArte` de que a carga precisa (um falso nos testes). */
export interface GerenciadorDaCarga {
  readonly cenarios: ReadonlyMap<string, unknown>;
  estaPronto(p: PedidoDoGerenciador): boolean;
  garantir(p: PedidoDoGerenciador): Promise<void>;
  prebuscar(p: PedidoDoGerenciador): void;
  /** Marca o que está em uso (o gerenciador não despeja nem solta isso). */
  usar(p: PedidoDoGerenciador): void;
  /** Solta JÁ o que o pedido diz (mesmo a vitrine), salvo o que está em uso. Em `'fixa'` é o `liberar*` de sempre: o fixo fica. */
  soltar(p: PedidoDoGerenciador): void;
  liberarLutador(id: string): void;
  liberarCenario(id: string): void;
  lutadoresResidentes(): string[];
}

const TITULO_LUTADORES: ReadonlySet<string> = new Set(LUTADORES_DO_TITULO);
const TITULO_CENARIOS: ReadonlySet<string> = new Set(CENARIOS_DO_TITULO);

export class CargaEscalonada {
  private readonly indice = new Map<IdPlano, number>();
  private readonly iniciados = new Set<PedidoDeCarga>();
  private readonly liberados = new Set<PedidoDeCarga>();
  private readonly prebuscados = new Set<PedidoDeCarga>();
  private cadeia: Promise<void> = Promise.resolve();
  private encerrada = false;
  /** Lutadores e cenários cuja carga falhou (a cena troca o plano deles por reserva). */
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

  /** O que os pedidos ativos (iniciados e ainda não soltos) seguram agora. */
  private seguro(excecao?: PedidoDeCarga): { readonly lutadores: Set<string>; readonly cenarios: Set<string> } {
    const lutadores = new Set<string>();
    const cenarios = new Set<string>();
    for (const p of this.pedidos) {
      if (p === excecao || !this.iniciados.has(p) || this.liberados.has(p)) continue;
      for (const l of p.lutadores) lutadores.add(l);
      for (const c of p.cenarios) cenarios.add(c);
    }
    return { lutadores, cenarios };
  }

  /**
   * Antes do 1º plano: no modo `'fixa'` (rollback), solta o que os jogos anteriores deixaram além da vitrine, para o pico do trailer ser o do plano de carga. Na residência por
   * peso a cena do trailer é exclusiva (`entrarNaLuta`) e não sobra nada; aqui não há o que fazer além de nunca soltar a vitrine fixa.
   */
  limparSobras(): void {
    for (const id of this.arte.lutadoresResidentes()) if (!LUTADORES_FIXOS.has(id as never)) this.arte.liberarLutador(id);
    for (const id of [...this.arte.cenarios.keys()]) if (!TITULO_CENARIOS.has(id)) this.arte.liberarCenario(id);
  }

  /**
   * Chamado quando o plano de índice `i` COMEÇA (e uma vez no começo, com o índice de onde o trailer abre): inicia as cargas cujo plano de partida chegou (em série), DEPOIS
   * solta o que já foi usado (só o que nenhum pedido ativo segura) e marca como "em uso" o que ficou. Pré-busca o seguinte. Idempotente.
   */
  entrouNoPlano(i: number): void {
    if (this.encerrada) return;
    for (const p of this.pedidos) {
      if (this.liberados.has(p)) continue;
      // já usado (ou pulado, numa prévia que abre no meio): não carrega mais; solta se já estava na memória
      if (this.idx(p.soltarAoFimDe) < i) {
        this.iniciados.add(p);
      }
    }
    const trazidos = new Set<string>(); // o que os pedidos já iniciados trazem (ou seguram): não se pré-busca duas vezes
    for (const p of this.pedidos) if (this.iniciados.has(p) && !this.liberados.has(p)) for (const id of [...p.lutadores, ...p.cenarios]) trazidos.add(id);
    for (const p of this.pedidos) {
      if (this.iniciados.has(p) || this.idx(p.comecaEm) > i) continue;
      // os pedidos que vão esperar na fila baixam (só o HTTP, sem decodificar) enquanto o anterior decodifica
      if (trazidos.size > 0 && !this.prebuscados.has(p)) {
        this.prebuscados.add(p);
        const falta = { lutadores: p.lutadores.filter((l) => !trazidos.has(l)), cenarios: p.cenarios.filter((c) => !trazidos.has(c)) };
        if (falta.lutadores.length + falta.cenarios.length > 0) this.arte.prebuscar(falta);
      }
      for (const id of [...p.lutadores, ...p.cenarios]) trazidos.add(id);
      this.iniciados.add(p);
      this.cadeia = this.cadeia.then(() => this.carregar(p));
    }
    const terminados: PedidoDeCarga[] = [];
    for (const p of this.pedidos) {
      if (!this.iniciados.has(p) || this.liberados.has(p) || this.idx(p.soltarAoFimDe) >= i) continue;
      this.liberados.add(p);
      terminados.push(p);
    }
    // "em uso" ANTES de soltar: o gerenciador não solta o que está em uso, e o que o plano que acabou usava ainda estaria marcado
    const seguro = this.seguro();
    this.arte.usar({ lutadores: [...seguro.lutadores], cenarios: [...seguro.cenarios] });
    for (const p of terminados) this.soltar(p);
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
      // os cenários primeiro (um arquivo de 200 KiB), depois UM atlas por vez
      if (p.cenarios.length > 0) await this.arte.garantir({ cenarios: p.cenarios });
      for (const l of p.lutadores) {
        if (this.encerrada || this.liberados.has(p)) break;
        await this.arte.garantir({ lutadores: [l] });
      }
    } catch (e) {
      console.error('trailer: a arte de', [...p.lutadores, ...p.cenarios].join(', '), 'não chegou; o plano vira cartão de reserva', e);
      for (const id of [...p.lutadores, ...p.cenarios]) this.falhas.add(id);
    }
    // saiu (ou o plano já passou) enquanto carregava: solta o que acabou de chegar; senão avisa a cena
    if (this.encerrada || this.liberados.has(p)) this.soltar(p);
    else if (![...p.lutadores, ...p.cenarios].some((id) => this.falhas.has(id))) this.aoChegar?.(p);
  }

  /** Solta o que o pedido tinha, menos o que outro pedido ativo ainda segura (e, na saída, a vitrine e os cenários do título). */
  private soltar(p: PedidoDeCarga): void {
    const seguro = this.seguro(p);
    const lutadores = p.lutadores.filter((l) => !seguro.lutadores.has(l) && !(this.encerrada && TITULO_LUTADORES.has(l)));
    const cenarios = p.cenarios.filter((c) => !seguro.cenarios.has(c) && !(this.encerrada && TITULO_CENARIOS.has(c)));
    if (lutadores.length > 0 || cenarios.length > 0) this.arte.soltar({ lutadores, cenarios });
  }

  /** A arte pedida está na memória (e não falhou)? A cena chama no começo de cada plano de luta: falso = `reservaForcada`. */
  pronto(arte: PedidoDoGerenciador): boolean {
    if ([...(arte.lutadores ?? []), ...(arte.cenarios ?? [])].some((id) => this.falhas.has(id))) return false;
    return this.arte.estaPronto(arte);
  }

  /** Solta tudo o que o trailer carregou (saída por qualquer caminho), menos a vitrine e os cenários do título. Cargas ainda a caminho se soltam quando chegam. */
  liberarTudo(): void {
    this.encerrada = true;
    for (const p of this.pedidos) {
      this.liberados.add(p);
      this.iniciados.add(p);
    }
    for (const p of this.pedidos) this.soltar(p);
  }
}

function pedidoDe(p: PedidoDeCarga): PedidoDoGerenciador {
  return { lutadores: p.lutadores, cenarios: p.cenarios };
}
