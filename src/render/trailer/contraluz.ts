import { ALTURA, LARGURA } from '../../core/constantes';
import { RS, usarEspacoLogico, type Ctx } from '../tela';

/*
 * Contraluz: desenha um lutador (ou qualquer coisa) numa camada fora da tela, escurece SÓ o que foi desenhado (`source-atop`) e compõe de volta. É a silhueta escura do
 * HAYATO no P0 (o raio acende o cenário atrás dele) e do ZENON no P9 enquanto ele não foi liberado (D-T2). A camada é recortada a um retângulo lógico (a faixa do
 * lutador), então o custo por quadro é uma fração da tela, e é criada UMA vez e só quando alguém pede.
 */

export interface RetanguloLogico {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export class CamadaDeContraluz {
  private cv: HTMLCanvasElement | null = null;

  private canvas(): HTMLCanvasElement | null {
    if (this.cv) return this.cv;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = LARGURA * RS;
    c.height = ALTURA * RS;
    this.cv = c;
    return c;
  }

  /** Há camada (navegador)? */
  get disponivel(): boolean {
    return this.canvas() !== null;
  }

  /** Libera a memória da camada (no máximo 8 MB). */
  soltar(): void {
    this.cv = null;
  }

  /**
   * `desenhar(g)` pinta o que vai em contraluz no contexto `g` (em coordenadas lógicas 960x540, a MESMA transformação que o chamador usaria no `ctx`); a camada é pintada
   * por inteiro de `cor` (só onde há desenho: `source-atop`) e composta no `ctx` com `alfa`, deslocada de (`dx`, `dy`) px lógicos. `area` recorta a camada (lógica).
   * Duas chamadas fazem o contraluz de verdade (docs/direcao-arte-trailer.md §9): primeiro o ARO (cor clara, deslocada para o lado da luz) e por cima a SILHUETA escura
   * no lugar. Devolve false se não há camada (testes em Node): quem chama desenha normal.
   */
  compor(ctx: Ctx, desenhar: (g: Ctx) => void, opcoes: { readonly cor: string; readonly area: RetanguloLogico; readonly alfa?: number; readonly dx?: number; readonly dy?: number }): boolean {
    const c = this.canvas();
    const g = c?.getContext('2d');
    if (!c || !g) return false;
    const area = opcoes.area;
    const x = Math.max(0, Math.floor(area.x));
    const y = Math.max(0, Math.floor(area.y));
    const w = Math.min(LARGURA - x, Math.ceil(area.w));
    const h = Math.min(ALTURA - y, Math.ceil(area.h));
    if (w <= 0 || h <= 0) return true;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(x * RS, y * RS, w * RS, h * RS);
    g.save();
    g.beginPath();
    g.rect(x * RS, y * RS, w * RS, h * RS);
    g.clip();
    usarEspacoLogico(g);
    desenhar(g);
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = opcoes.cor;
    g.fillRect(x * RS, y * RS, w * RS, h * RS);
    g.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha = opcoes.alfa ?? 1;
    ctx.drawImage(c, x * RS, y * RS, w * RS, h * RS, x + (opcoes.dx ?? 0), y + (opcoes.dy ?? 0), w, h);
    ctx.restore();
    return true;
  }
}
