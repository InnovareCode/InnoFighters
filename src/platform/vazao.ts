/*
 * Vazão MEDIDA da rede no boot. O iPhone (WebKit) não tem `navigator.connection`, então `economiaDeDados` nunca vê uma rede lenta lá; a decisão "trailer estático ou completo"
 * (src/ui/trailer/ambiente.ts) usa também o que o próprio boot mediu: os bytes das transferências GRANDES da etapa 0 (JS inicial, splash, logos, cenário padrão: 126 a 248 KiB)
 * divididos pelo tempo em que HOUVE alguma delas em curso (a UNIÃO dos intervalos do 1º ao último byte de cada uma: as paralelas dividem a banda e contam uma vez, e os
 * vãos entre elas, esperando o JS rodar e pedir a próxima, ficam de fora). Resource Timing, sem requisição extra.
 *
 * Por que assim e não bytes / tempo até o `data-pronto`: esse tempo inclui latência, análise do JS e a espera encadeada (index -> JS -> chunks -> manifestos), que pesam
 * igual numa rede rápida e numa lenta e escondem a banda. Medido no build, Chromium com CDP `Network.emulateNetworkConditions`, etapa 0 (4 transferências grandes, 746 639 B),
 * 3 rodadas iguais: sem limite ~28 MiB/s; 9 Mbps/170 ms = 0,53 MiB/s; 4 Mbps/170 ms = 0,30 MiB/s; Fast 3G (1,6 Mbps/562 ms) = 0,11 MiB/s. A medida fica abaixo da nominal
 * (partida lenta do TCP, as requisições pequenas dividindo a banda), por isso o limiar de decisão (ambiente.ts) é calibrado sobre ELA e não sobre os Mbps.
 *
 * Sem medida (segunda visita pelo service worker ou cache: `transferSize` 0; nada grande o bastante) devolve null, e quem decide trata como "não sei", nunca como "lento".
 */

/** Só transferências de pelo menos 100 KB entram na conta (as pequenas são todas latência). */
export const TAMANHO_MINIMO_MEDIDO = 100_000;

/** O que a medição lê de cada entrada do Resource Timing (milissegundos, o relógio da página). */
export interface EntradaDeTransferencia {
  readonly transferSize: number;
  readonly responseStart: number;
  readonly responseEnd: number;
}

/**
 * Bytes por segundo das transferências grandes, ou null se não há o que medir. PURA. A soma dos bytes dividida pela UNIÃO dos intervalos [`responseStart`, `responseEnd`]:
 * transferências em paralelo dividem a banda, então o total sobre o tempo em que alguma estava em curso é a vazão da rede.
 */
export function vazaoDasTransferencias(entradas: readonly EntradaDeTransferencia[]): number | null {
  const grandes = entradas.filter((e) => e.transferSize >= TAMANHO_MINIMO_MEDIDO && e.responseEnd > e.responseStart && Number.isFinite(e.responseEnd));
  if (grandes.length === 0) return null;
  const intervalos = grandes.map((e): [number, number] => [e.responseStart, e.responseEnd]).sort((a, b) => a[0] - b[0]);
  let ms = 0;
  let [ini, fim] = intervalos[0] as [number, number];
  for (const [a, b] of intervalos.slice(1)) {
    if (a > fim) {
      ms += fim - ini;
      ini = a;
      fim = b;
    } else fim = Math.max(fim, b);
  }
  ms += fim - ini;
  if (!(ms > 0)) return null;
  const bytes = grandes.reduce((s, e) => s + e.transferSize, 0);
  return (bytes / ms) * 1000;
}

let medida: number | null = null;

/** Mede agora (chamada no instante do `data-pronto`) e guarda. Nunca lança. */
export function registrarVazaoDoBoot(sobrescrever?: number | null): number | null {
  if (sobrescrever !== undefined) {
    medida = sobrescrever;
    return medida;
  }
  try {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return (medida = null);
    medida = vazaoDasTransferencias(performance.getEntriesByType('resource') as unknown as PerformanceResourceTiming[]);
  } catch {
    medida = null;
  }
  return medida;
}

/** A vazão que o boot mediu, em bytes por segundo; null = não medida. */
export const vazaoDoBoot = (): number | null => medida;

/** Só para teste. */
export function esquecerVazaoDoBoot(): void {
  medida = null;
}
