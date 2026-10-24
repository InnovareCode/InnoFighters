import type { IdLutador } from '../core/contratos';
import type { IdCenario } from '../data/tipos';
import { LUTADORES, VITRINE } from '../data/lutadores';
import { TICKS_POR_COMPASSO, type IdPlano, type Plano, type PedidoDeArte, type RoteiroDoTrailer } from '../data/trailer/tipos';

/*
 * Plano de carga da arte do trailer (spec §5.2 e T12 do orçamento, docs/orcamentos-2026-10-23.md §2.3): PURO, derivado do roteiro.
 *
 * O trailer NÃO tem arte fixa. Cada plano que desenha atlas ou cenário tem o seu PEDIDO, e cada pedido é carregado com antecedência de 2 compassos (3,2 s: baixar e
 * esperar a decodificação) e SOLTO assim que o plano que o usa termina. O que dois planos em sequência dividem (o HAYATO do P0 ao P1) fica na memória, porque o pedido
 * seguinte começa ANTES de o anterior terminar (ver `CargaEscalonada`). Na memória, em cada plano, estão só o plano atual e o seguinte: o pico medido é o P6 + P7
 * (NILA, WEI LONG, BAATAR, HAYATO e 3 cenários), 145 MiB, contra 164 do desenho anterior só com a vitrine e os cenários dela (133,6 MiB) mais dois atlas.
 * Quem usa isto (a cena do trailer) pede UM atlas por vez ao `GerenciadorDeArte`.
 */

/** Os atlas que cada um destes pesa decodificado, por cima de 40 MiB: nunca dois juntos. */
export const PESADOS: readonly IdLutador[] = ['baatar', 'zenon'];
/** Antecedência da carga: 2 compassos antes do plano que usa a arte (o tempo de um plano comum de luta). */
export const ANTECEDENCIA_DA_CARGA = 2 * TICKS_POR_COMPASSO;
/** O orçamento de imagem decodificada (atlas + cenários) do trailer, em MiB (docs/orcamentos-2026-10-23.md §2.3 e item 6c). */
export const ORCAMENTO_DO_TRAILER_MIB = 150;

export interface PedidoDeCarga {
  readonly lutadores: readonly IdLutador[];
  readonly cenarios: readonly IdCenario[];
  /** O plano em cujo INÍCIO a carga começa. */
  readonly comecaEm: IdPlano;
  /** O plano que usa a arte (ela precisa estar pronta no início dele). */
  readonly prontoEm: IdPlano;
  /** A arte é solta no FIM deste plano (o mesmo em que ela é usada), salvo o que um pedido seguinte já segura. */
  readonly soltarAoFimDe: IdPlano;
}

/** A vitrine e os cenários do título: o plano da logo (P10) desenha o título por trás, e o jogo volta a ele logo depois. */
export const LUTADORES_DO_TITULO: readonly IdLutador[] = VITRINE;
export const CENARIOS_DO_TITULO: readonly IdCenario[] = [...new Set(VITRINE.map((id) => LUTADORES[id].stage))];

/** Os lutadores da vitrine: no modo `'fixa'` (rollback) eles nunca saem da memória, e a cena do trailer só solta o que não é deles. */
export const LUTADORES_FIXOS: ReadonlySet<IdLutador> = new Set(VITRINE);

const unicos = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

/** A arte (atlas e cenários) que o plano desenha. Retratos e cartões em preto não pedem nada (os retratos são sempre residentes). */
export function arteDoPlano(p: Plano): { readonly lutadores: IdLutador[]; readonly cenarios: IdCenario[] } {
  switch (p.tipo) {
    case 'frio':
      return { lutadores: [p.lutador], cenarios: [p.stage] };
    case 'luta':
    case 'arconte':
      return { lutadores: unicos([p.c1, p.c2]), cenarios: [p.stage] };
    case 'cartao':
      return { lutadores: [], cenarios: p.fundo === 'preto' ? [] : [p.fundo] };
    case 'retratos':
      return { lutadores: [], cenarios: [] };
    case 'logo':
      return { lutadores: [...LUTADORES_DO_TITULO], cenarios: [...CENARIOS_DO_TITULO] };
  }
}

const vazio = (a: { lutadores: readonly unknown[]; cenarios: readonly unknown[] }): boolean => a.lutadores.length === 0 && a.cenarios.length === 0;

export function planoDeCarga(roteiro: RoteiroDoTrailer): readonly PedidoDeCarga[] {
  const planos = roteiro.planos;
  const inicio: number[] = [];
  let t = 0;
  for (const p of planos) {
    inicio.push(t);
    t += p.compassos * TICKS_POR_COMPASSO;
  }
  /** O plano que contém o tick (o último que já começou). */
  const planoNoTick = (tick: number): number => {
    let i = 0;
    while (i + 1 < planos.length && (inicio[i + 1] as number) <= tick) i++;
    return i;
  };
  const idx = (id: IdPlano): number => planos.findIndex((p) => p.id === id);
  const pedidos: PedidoDeCarga[] = [];
  const id = (i: number): IdPlano => (planos[i] as { id: IdPlano }).id;
  const comPesado = (ls: readonly IdLutador[]): boolean => ls.some((l) => PESADOS.includes(l));

  planos.forEach((p, i) => {
    const arte = arteDoPlano(p);
    if (vazio(arte)) return;
    // o plano da logo desenha o título: os cenários dele chegam com a antecedência de sempre, mas os 4 atlas da vitrine (78 MiB além do HAYATO) só começam no próprio plano, quando o
    // anterior já foi solto (com o P9 ainda na memória passariam de 150 MiB); eles entram com a chegada suave do título
    const partes: Array<{ lutadores: IdLutador[]; cenarios: IdCenario[]; tarde: boolean }> =
      p.tipo === 'logo'
        ? [
            { lutadores: [], cenarios: arte.cenarios, tarde: false },
            { lutadores: arte.lutadores, cenarios: [], tarde: true },
          ]
        : [{ ...arte, tarde: false }];
    for (const parte of partes) {
      let comeca = parte.tarde ? i : Math.min(i, planoNoTick(Math.max(0, (inicio[i] as number) - ANTECEDENCIA_DA_CARGA)));
      // os dois pesados nunca ficam juntos: o seguinte só começa depois que o anterior foi usado e solto
      if (comPesado(parte.lutadores)) {
        for (const anterior of pedidos) {
          if (comPesado(anterior.lutadores) && idx(anterior.soltarAoFimDe) >= comeca) comeca = Math.min(i, idx(anterior.soltarAoFimDe) + 1);
        }
      }
      pedidos.push({ lutadores: parte.lutadores, cenarios: parte.cenarios, comecaEm: id(comeca), prontoEm: p.id, soltarAoFimDe: p.id });
    }
  });
  return pedidos;
}

/**
 * O que está na memória (ou a caminho) durante o plano de índice `i`: a união dos pedidos que já começaram e ainda não foram soltos. Atlas e cenários repetidos contam uma vez
 * (o HAYATO do P0 ao P1 não sai nem volta).
 */
export function residentesNoPlano(roteiro: RoteiroDoTrailer, pedidos: readonly PedidoDeCarga[], indice: number): { readonly lutadores: readonly IdLutador[]; readonly cenarios: readonly IdCenario[] } {
  const idx = (id: IdPlano): number => roteiro.planos.findIndex((p) => p.id === id);
  const ativos = pedidos.filter((p) => idx(p.comecaEm) <= indice && indice <= idx(p.soltarAoFimDe));
  return { lutadores: unicos(ativos.flatMap((p) => p.lutadores)), cenarios: unicos(ativos.flatMap((p) => p.cenarios)) };
}

/**
 * Num plano de índice `indice`: `agora` = a arte que o próprio plano usa e que precisa estar pronta NO COMEÇO dele (o pedido saiu de um plano anterior); `tarde` = a que o plano
 * pede no próprio começo (a abertura e a vitrine da logo) e chega com ele já na tela; `proximo` = a que já deve estar carregando (começou em plano anterior ou neste e ainda
 * não é a do plano atual); `soltar` = os atlas que já foram usados e podem sair. Idempotente: soltar de novo o que já saiu não faz nada.
 */
export function pedidosNoPlano(
  roteiro: RoteiroDoTrailer,
  pedidos: readonly PedidoDeCarga[],
  indice: number,
): { agora: PedidoDeArte; tarde: PedidoDeArte; proximo: PedidoDeArte; soltar: readonly IdLutador[] } {
  const idx = (id: IdPlano): number => roteiro.planos.findIndex((p) => p.id === id);
  const paraArte = (ps: readonly PedidoDeCarga[]): PedidoDeArte => ({ lutadores: unicos(ps.flatMap((p) => p.lutadores)), cenarios: unicos(ps.flatMap((p) => p.cenarios)) });
  const doPlano = pedidos.filter((p) => idx(p.prontoEm) === indice);
  const agora = doPlano.filter((p) => idx(p.comecaEm) < indice);
  const tarde = doPlano.filter((p) => idx(p.comecaEm) >= indice);
  const proximo = pedidos.filter((p) => idx(p.comecaEm) <= indice && idx(p.prontoEm) > indice);
  const soltar = unicos(pedidos.filter((p) => idx(p.soltarAoFimDe) < indice).flatMap((p) => p.lutadores));
  return { agora: paraArte(agora), tarde: paraArte(tarde), proximo: paraArte(proximo), soltar };
}
