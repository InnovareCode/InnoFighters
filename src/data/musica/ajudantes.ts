import type { CamadaRuido, CamadaTom, TipoFiltro, TipoOnda } from './tipos';

/*
 * Construtores curtos para escrever instrumentos nos temas (só dado: devolvem objetos puros, sem lógica). `tom` é um oscilador com envelope e
 * `ruido` um ruído filtrado; o resto do que o `tone`/`noise` aceita entra pelo objeto de opções.
 */

type OpcoesTom = Omit<CamadaTom, 'k' | 'tipo' | 'vol'>;

export const tom = (tipo: TipoOnda, vol: number, o: OpcoesTom = {}): CamadaTom => ({ k: 'T', tipo, vol, ...o });

export const ruido = (tipo: TipoFiltro, f0: number, Q: number, t: number, vol: number, o: { f1?: number; atq?: number } = {}): CamadaRuido => ({ k: 'R', tipo, f0, Q, t, vol, ...o });
