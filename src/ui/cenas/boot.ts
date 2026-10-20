import { ALTURA, LARGURA } from '../../core/constantes';
import type { Navegador } from '../navegador';
import { marca } from '../logo';
import type { Cena } from '../tipos';

/** Abertura / carregamento: barra de progresso, depois "clique ou pressione uma tecla" (libera o áudio). */
export class CenaBoot implements Cena {
  constructor(private readonly ui: Navegador) {}

  draw(): void {
    const { ctx, f } = this.ui.c;
    const ui = this.ui;
    const g = ctx.createLinearGradient(0, 0, 0, ALTURA);
    g.addColorStop(0, '#1a0b33');
    g.addColorStop(1, '#05030c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    marca.desenharEmblema(ctx, LARGURA / 2, 200, 140, ui.t, 0.7);
    marca.desenharLogo(ctx, LARGURA / 2, 200, 0.85, ((ui.t % 240) - 20) / 60);
    if (ui.erroCarga) {
      f.T('Não foi possível carregar a arte do jogo.', LARGURA / 2, 372, 18, '#ff9a9a', 'center');
      f.T(ui.erroCarga, LARGURA / 2, 400, 13, '#cfd6f5', 'center');
    } else if (!ui.ready) {
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      f.rr(LARGURA / 2 - 160, 350, 320, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      f.rr(LARGURA / 2 - 160, 350, Math.max(14, 320 * ui.loadProg), 14, 7);
      ctx.fill();
      f.T('Carregando arte...', LARGURA / 2, 390, 16, '#cfd6f5', 'center');
    } else if (Math.floor(ui.t / 30) % 2 === 0) f.A('CLIQUE OU PRESSIONE UMA TECLA', LARGURA / 2, 380, 28, '#fff', '#000');
  }

  key(): boolean {
    this.ir();
    return true;
  }

  click(): void {
    this.ir();
  }

  private ir(): void {
    if (!this.ui.ready) return;
    this.ui.iniciarAudio();
    this.ui.c.audio.stopMusic();
    this.ui.set('intro');
  }
}
