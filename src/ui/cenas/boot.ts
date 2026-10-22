import { ALTURA, LARGURA } from '../../core/constantes';
import type { Navegador } from '../navegador';
import { marca } from '../logo';
import type { Cena } from '../tipos';
import type { CenaTrailer } from './trailer';

/** Abertura / carregamento: barra de progresso, depois "clique ou pressione uma tecla" (libera o áudio). */
export class CenaBoot implements Cena {
  constructor(private readonly ui: Navegador) {}

  draw(): void {
    const { ctx, f } = this.ui.c;
    const ui = this.ui;
    // o splash da logo oficial em tela cheia; até ele chegar (é a 1ª coisa que o jogo baixa), o gradiente de antes
    if (!marca.desenharSplash(ctx)) {
      const g = ctx.createLinearGradient(0, 0, 0, ALTURA);
      g.addColorStop(0, '#1a0b33');
      g.addColorStop(1, '#05030c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }
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
    // marca do gesto: o tempo até o 1º quadro do trailer (spec §8, critério 13) sai de `trailer:gesto` -> `trailer:quadro1`
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') performance.mark('trailer:gesto');
    this.ui.iniciarAudio();
    this.ui.c.audio.stopMusic();
    // o trailer só abre com o pedaço lazy já carregado (e as regras ligadas): senão a abertura de hoje, sem esperar nada
    if ((this.ui.cenas.trailer as CenaTrailer).disponivel()) this.ui.set('trailer', { origem: 'boot' });
    else this.ui.set('intro');
  }
}
