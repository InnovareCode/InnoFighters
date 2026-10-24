import type { Elenco } from '../../assets/elenco';
import { ALTURA, LARGURA } from '../../core/constantes';
import type { IdLutador } from '../../core/contratos';
import type { Ferramentas } from '../../ui/ferramentas';
import { desenharCenarioLuta, desenharVinheta } from '../cenario';
import type { Ctx } from '../tela';
import { desenharFundoDaMontagem } from './retratos';
import { desenharRostoOuPlaca } from './rosto';

/*
 * O CARTÃO DE RESERVA (spec §4.4): quando a pré-rolagem de um plano de luta não ficou pronta, ou a arte dele não chegou a tempo (aparelho lento, rede ruim), o
 * diretor troca o plano por isto, do MESMO tamanho: os retratos dos dois lutadores sobre o cenário (ou fundo escuro, se o cenário também não chegou). Nunca congela.
 */

export const LADO_DO_RETRATO_DE_RESERVA = 210;

export interface EntradaDaReserva {
  readonly ctx: Ctx;
  readonly f: Ferramentas;
  readonly elenco: Elenco;
  readonly c1: IdLutador;
  readonly c2: IdLutador;
  readonly cenario: CanvasImageSource | undefined;
  readonly vinheta: CanvasImageSource;
  readonly tauNoPlano: number;
}

export function desenharReserva(e: EntradaDaReserva): void {
  const { ctx, f } = e;
  if (e.cenario) {
    desenharCenarioLuta(ctx, e.cenario, LARGURA / 2);
    ctx.fillStyle = 'rgba(4,2,10,.55)';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    desenharVinheta(ctx, e.vinheta);
  } else desenharFundoDaMontagem(ctx);
  const lado = LADO_DO_RETRATO_DE_RESERVA;
  // eles se aproximam devagar (o único movimento: um empurrão de 30 px em 192 ticks)
  const empurrao = Math.min(1, e.tauNoPlano / 192) * 30;
  ([e.c1, e.c2] as const).forEach((id, i) => {
    const l = e.elenco[id];
    const x = i === 0 ? 150 + empurrao : LARGURA - 150 - lado - empurrao;
    const y = 120;
    // sem o retrato (a etapa 1 do boot ainda não o trouxe) a placa tipográfica: o cartão de reserva nunca sai vazio
    desenharRostoOuPlaca(ctx, f, l, x, y, lado, i === 1, ['#34406e', '#0c1233']);
    ctx.lineWidth = 3;
    ctx.strokeStyle = l.ch.accent;
    ctx.strokeRect(x + 1.5, y + 1.5, lado - 3, lado - 3);
    f.A(l.ch.name, x + lado / 2, y + lado + 30, 28, ['#ffffff', '#ffd27a'], '#000');
  });
}
