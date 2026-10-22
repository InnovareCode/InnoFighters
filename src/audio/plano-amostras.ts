import type { EventoLuta, IdLutador, IndiceLutador } from '../core/contratos';
import {
  ESPELHO_TAXA,
  GANHO_VARIACAO_MIN,
  VARIACAO_TAXA,
  golpePesado,
  idDeVoz,
  type CategoriaVoz,
  type FamiliaDoGolpe,
  type PedidoAmostra,
  type TrocaDeAmostra,
} from '../data/sons/amostras';

/*
 * PLANO das amostras reais: funções PURAS que dizem QUAL amostra cada som pediria. Não sabem se a amostra existe nem tocam nada: o plano sonoro
 * (`identidade-sonora.ts`) anota estes pedidos e a EXECUÇÃO decide ao tocar (buffer decodificado = toca a amostra; senão, a síntese de hoje).
 *
 * Variação determinística: tudo sai de `variacao(semente, tick, indice, lutador, canal)` (o hash sem estado), recebida aqui como `v`. NUNCA `Math.random`.
 * Canais 0, 1 e 2 já são da síntese (tom, volume, variante de dano); os de amostra começam em 10.
 */

/** `variacao` já presa à semente, ao tick e ao evento: (lutador, canal) -> [0, 1). */
export type FuncaoVariacao = (lutador: number, canal: number) => number;

export const CANAL_ESCOLHA = 10;
export const CANAL_TAXA = 11;
export const CANAL_GANHO = 12;

const taxaVariada = (v: FuncaoVariacao, lutador: number): number => 1 + (v(lutador, CANAL_TAXA) * 2 - 1) * VARIACAO_TAXA;
const ganhoVariado = (v: FuncaoVariacao, lutador: number): number => GANHO_VARIACAO_MIN + (1 - GANHO_VARIACAO_MIN) * v(lutador, CANAL_GANHO);

const base = (ids: readonly string[], v: FuncaoVariacao, lutador: number): PedidoAmostra => ({
  ids,
  u: v(lutador, CANAL_ESCOLHA),
  taxa: taxaVariada(v, lutador),
  ganho: ganhoVariado(v, lutador),
});

/** Foley, magia e golpes no ar: o som compartilhado, sem identidade de lutador. */
export function pedidoDeFoley(ids: readonly string[], v: FuncaoVariacao, lutador: number): PedidoAmostra {
  return base(ids, v, lutador);
}

/** A cadeia de ids de cada categoria de voz: a 1ª com amostra pronta toca (guarda sem corte próprio usa o dano pesado; vitória sem corte usa o kiai). */
function cadeiaDeVoz(lutador: IdLutador, cat: CategoriaVoz): string[] {
  const id = (c: CategoriaVoz): string => idDeVoz(lutador, c);
  switch (cat) {
    case 'guarda':
      return [id('guarda'), id('pesado')];
    case 'vitoria':
      return lutador === 'zenon' ? ['voz.zenon.riso', id('vitoria'), id('kiai')] : [id('vitoria'), id('kiai')];
    default:
      return [id(cat)];
  }
}

/** A SARPA (ficha da NILA) fala mais aguda e fina (plano §2.5): taxa 1,06 e passa-alta de 300 Hz. */
const TAXA_SARPA = 1.06;

/**
 * A voz de um lutador em uma categoria. O espelho (o mesmo lutador dos dois lados) faz o índice 1 cantar -1 semitom. A taxa FIXA de cada voz (BAATAR 0,88, WEI LONG 0,94)
 * é dado do corte, no manifesto; aqui entra só a variação do toque.
 */
export function pedidoDeVoz(lutador: IdLutador, ficha: string | null, cat: CategoriaVoz, v: FuncaoVariacao, indice: IndiceLutador, espelho: boolean): PedidoAmostra {
  const p = base(cadeiaDeVoz(lutador, cat), v, indice);
  const taxa = espelho ? p.taxa * ESPELHO_TAXA : p.taxa;
  if (lutador === 'nila' && ficha === 'sarpa') {
    const filtrada: PedidoAmostra = { ...p, taxa: taxa * TAXA_SARPA, filtro: { tipo: 'highpass', f: 300 } };
    // o `SSSA` próprio da SARPA (se o pacote trouxer) toca como foi gravado; sem ele, a voz da NILA transformada
    if (cat === 'kiai') return { ...p, taxa, ids: ['voz.nila.sarpa.kiai'], senao: filtrada };
    return filtrada;
  }
  return { ...p, taxa };
}

/** A família do especial, transformada pelo golpe (grave e abafada no `sDown`, aguda e fina no `sFwd`). `fator` multiplica a taxa (HOERI CHAGI por acerto, tambor por nível). */
export function pedidoDeFamilia(f: FamiliaDoGolpe, v: FuncaoVariacao, lutador: number, parte?: 'inicio' | 'fim', fator = 1, quando = 0): PedidoAmostra {
  const p = base([f.id], v, lutador);
  return {
    ...p,
    taxa: p.taxa * f.taxa * fator,
    ...(f.filtro ? { filtro: f.filtro } : {}),
    ...(parte ? { parte } : {}),
    ...(quando > 0 ? { quando } : {}),
  };
}

const IMPACTO_LEVE: Readonly<Record<string, string>> = { punch: 'imp.soco.leve', kick: 'imp.chute.leve', fireballHit: 'magia.impacto' };
const IMPACTO_FORTE: Readonly<Record<string, string>> = { punch: 'imp.soco.forte', kick: 'imp.chute.forte', fireballHit: 'magia.impacto' };

/**
 * Os métodos genéricos que uma amostra TROCA, por evento. O método continua em `manter` (o lock-step com o protótipo olha `sonsDoEvento`); na execução, se a
 * amostra do pedido está pronta, toca ela NO LUGAR do método; se não, o método toca como sempre. Evento sem troca = lista vazia.
 */
export function trocasDoEvento(ev: EventoLuta, v: FuncaoVariacao): TrocaDeAmostra[] {
  const troca = (metodo: string, ids: readonly string[], lutador: number): TrocaDeAmostra[] => [{ metodo, pedido: pedidoDeFoley(ids, v, lutador) }];
  switch (ev.tipo) {
    case 'swing':
      return troca('swing', [ev.golpe === 'punch' ? 'golpe.ar.leve' : 'golpe.ar.forte'], ev.lutador);
    case 'esquiva':
      return troca('swing', ['esquiva'], ev.lutador);
    case 'jump':
      return troca('jump', ['salto'], ev.lutador);
    case 'troca-ficha':
      return troca('jump', ['salto'], ev.lutador);
    case 'land':
      return troca('land', ['pouso'], ev.lutador);
    case 'rebote':
      return troca('land', ['pouso'], ev.lutador);
    case 'block':
      return troca('block', ['defesa'], ev.defensor);
    case 'parry':
      return troca('block', ['defesa'], ev.defensor);
    case 'armor': {
      const id = IMPACTO_LEVE[ev.snd];
      return id ? troca(ev.snd, [id], ev.atacante) : [];
    }
    case 'hit': {
      const id = (golpePesado(ev) ? IMPACTO_FORTE : IMPACTO_LEVE)[ev.snd];
      return id ? troca(ev.snd, [id], ev.atacante) : [];
    }
    case 'throw':
      return troca('kick', ['arremesso'], ev.atacante);
    case 'clash':
      return troca('fireballHit', ['magia.impacto'], ev.lutador ?? 0);
    case 'quebra-guarda':
      return troca('fireballHit', ['guarda.quebra'], ev.defensor);
    default:
      return [];
  }
}
