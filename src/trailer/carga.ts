import type { IdLutador } from '../core/contratos';
import type { IdCenario } from '../data/tipos';
import { LUTADORES, VITRINE } from '../data/lutadores';
import { temMotor, type IdPlano, type PedidoDeArte, type PlanoComMotor, type RoteiroDoTrailer } from '../data/trailer/tipos';

/*
 * Plano de carga da arte do trailer (spec §5.2): PURO, derivado do roteiro. A arte FIXA (a vitrine e os cenários dela) já está no boot; o resto (os
 * guardiões e o ZENON, e os cenários deles) entra e sai escalonado: no máximo 2 atlas não fixos residentes (o do plano atual e o do próximo), e os dois
 * PESADOS (BAATAR 52 MB e ZENON 60 MB decodificados) nunca juntos. Quem usa isto (a cena do trailer) pede UM atlas por vez ao `GerenciadorDeArte`.
 */

/** Os atlas que cada um destes pesa decodificado, por cima de 40 MB: nunca dois juntos. */
export const PESADOS: readonly IdLutador[] = ['baatar', 'zenon'];
/** Teto de atlas não fixos residentes ao mesmo tempo. */
export const MAX_NAO_FIXOS = 2;

export interface PedidoDeCarga {
  readonly lutador: IdLutador;
  readonly cenario: IdCenario;
  /** O plano em cujo INÍCIO a carga começa. */
  readonly comecaEm: IdPlano;
  /** O plano que usa a arte (ela precisa estar pronta no início dele). */
  readonly prontoEm: IdPlano;
  /** A arte é solta no FIM deste plano (o mesmo em que ela é usada). */
  readonly soltarAoFimDe: IdPlano;
}

/** Cenários que o boot já deixa residentes: o padrão e os da vitrine. */
export const CENARIOS_FIXOS: ReadonlySet<IdCenario> = new Set(VITRINE.map((id) => LUTADORES[id].stage));
export const LUTADORES_FIXOS: ReadonlySet<IdLutador> = new Set(VITRINE);

export const arteNaoFixaDoPlano = (p: PlanoComMotor): { lutadores: IdLutador[]; cenarios: IdCenario[] } => ({
  lutadores: [p.c1, p.c2].filter((id) => !LUTADORES_FIXOS.has(id)),
  cenarios: CENARIOS_FIXOS.has(p.stage) ? [] : [p.stage],
});

export function planoDeCarga(roteiro: RoteiroDoTrailer): readonly PedidoDeCarga[] {
  const planos = roteiro.planos;
  const comMotor = planos.map((p, i) => ({ p, i })).filter((x): x is { p: PlanoComMotor; i: number } => temMotor(x.p));
  const pedidos: PedidoDeCarga[] = [];
  let anterior: { pedido: PedidoDeCarga; indice: number } | null = null;
  for (const { p, i } of comMotor) {
    const arte = arteNaoFixaDoPlano(p);
    const lutador = arte.lutadores[0];
    if (lutador === undefined) continue;
    let indiceDoComeco = anterior ? anterior.indice : 0;
    // os dois pesados nunca ficam juntos: o seguinte só começa depois que o anterior foi usado e solto
    if (anterior && PESADOS.includes(anterior.pedido.lutador) && PESADOS.includes(lutador)) indiceDoComeco = anterior.indice + 1;
    const pedido: PedidoDeCarga = {
      lutador,
      cenario: arte.cenarios[0] ?? p.stage,
      comecaEm: (planos[Math.min(indiceDoComeco, i)] as { id: IdPlano }).id,
      prontoEm: p.id,
      soltarAoFimDe: p.id,
    };
    pedidos.push(pedido);
    anterior = { pedido, indice: i };
  }
  return pedidos;
}

/** O que está residente (não fixo) durante o plano de índice `i`: quem já começou a carregar e ainda não foi solto. */
export function residentesNoPlano(roteiro: RoteiroDoTrailer, pedidos: readonly PedidoDeCarga[], indice: number): readonly IdLutador[] {
  const idx = (id: IdPlano): number => roteiro.planos.findIndex((p) => p.id === id);
  return pedidos.filter((p) => idx(p.comecaEm) <= indice && indice <= idx(p.soltarAoFimDe)).map((p) => p.lutador);
}

/**
 * Num plano de índice `indice`: `agora` = a arte que o próprio plano usa; `proximo` = a que já deve estar carregando (começou em plano anterior ou neste e ainda
 * não é a do plano atual); `soltar` = tudo o que já foi usado e pode sair. Idempotente: soltar de novo o que já saiu não faz nada.
 */
export function pedidosNoPlano(roteiro: RoteiroDoTrailer, pedidos: readonly PedidoDeCarga[], indice: number): { agora: PedidoDeArte; proximo: PedidoDeArte; soltar: readonly IdLutador[] } {
  const idx = (id: IdPlano): number => roteiro.planos.findIndex((p) => p.id === id);
  const paraArte = (ps: readonly PedidoDeCarga[]): PedidoDeArte => ({ lutadores: ps.map((p) => p.lutador), cenarios: ps.map((p) => p.cenario) });
  const agora = pedidos.filter((p) => idx(p.prontoEm) === indice);
  const proximo = pedidos.filter((p) => idx(p.comecaEm) <= indice && idx(p.prontoEm) > indice);
  const soltar = pedidos.filter((p) => idx(p.soltarAoFimDe) < indice).map((p) => p.lutador);
  return { agora: paraArte(agora), proximo: paraArte(proximo), soltar };
}
