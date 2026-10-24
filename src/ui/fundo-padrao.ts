import { criarCanvasPadrao, type CriarCanvas } from '../assets/canvas';

/** Cor do fundo dos menus quando o cenário padrão não está na memória (o tom escuro que `desenharFundoMenu` aplica por cima). */
export const COR_DA_RESERVA_DO_FUNDO = '#140a26';

/**
 * O fundo de todos os menus (`rec.cenarioPadrao`). Na residência por peso o `jp` SAI da memória durante a luta; quem desenha lê daqui a cada quadro e, na falta, recebe
 * um canvas 1 x 1 da cor do fundo (criado uma vez) em vez de `undefined` (que derrubaria o `drawImage`). `vezesSemFundo` conta os quadros que caíram na reserva (os testes
 * provam que a volta ao menu nunca pisca: contador zero). Docs/spec-residencia-de-memoria.md §2.5.
 */
export class FundoPadrao {
  /** Quantas vezes o fundo foi pedido e não estava na memória. */
  vezesSemFundo = 0;
  private reserva: CanvasImageSource | null = null;

  constructor(
    private readonly cenarios: ReadonlyMap<string, CanvasImageSource>,
    private readonly id: string,
    private readonly criarCanvas: CriarCanvas = criarCanvasPadrao,
  ) {}

  get imagem(): CanvasImageSource {
    const im = this.cenarios.get(this.id);
    if (im) return im;
    this.vezesSemFundo++;
    if (!this.reserva) {
      const c = this.criarCanvas(1, 1);
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = COR_DA_RESERVA_DO_FUNDO;
        g.fillRect(0, 0, 1, 1);
      }
      this.reserva = c;
    }
    return this.reserva;
  }
}
