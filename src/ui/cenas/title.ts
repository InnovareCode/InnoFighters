import { ALTURA, LARGURA } from '../../core/constantes';
import { Brasas, desenharCicloDeCenarios, fileiraDeHerois, gradacaoCinema, LAYOUT_DA_MARCA, LOGO_ALTURA, marca, STAGE_OF } from '../logo';
import type { Navegador } from '../navegador';
import type { ArgsTitle, Cena } from '../tipos';

/** Tela de título: ciclo de cenários, os 4 lutadores, a logo oficial e "PRESSIONE ENTER". */
export class CenaTitle implements Cena {
  t = 0;
  private readonly brasas: Brasas;

  constructor(private readonly ui: Navegador) {
    this.brasas = new Brasas(ui.c.rngVisual);
  }

  enter(a: ArgsTitle): void {
    this.t = a && a.fromIntro ? 120 : 0;
  }

  update(): void {
    this.t++;
  }

  /** Desenha a cena em `t`; `comTexto` false = só o fundo (a abertura usa assim por trás do logo). */
  drawScene(t: number, comTexto = true): void {
    const { ctx, f, persist } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const H = ALTURA;
    const idx = desenharCicloDeCenarios(ctx, m, t);
    gradacaoCinema(ctx, m);
    // raios de luz atrás do logo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(W / 2, LAYOUT_DA_MARCA.y);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.globalAlpha = 0.05 + 0.03 * Math.sin(t / 30 + i);
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, 520);
      ctx.lineTo(40, 520);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    fileiraDeHerois(f, m, t, STAGE_OF[idx] ?? 'hayato');
    this.brasas.desenhar(ctx, t);
    if (!comTexto) return;
    // a logo oficial (a faixa do subtítulo já está na arte): altura 330, topo em y 4, flutuando 3 px
    const fl = Math.sin(t / 45) * 3;
    marca.desenharLogo(ctx, W / 2, LAYOUT_DA_MARCA.y + fl, LOGO_ALTURA, ((t % 300) - 30) / 60);
    // chamada para jogar
    const lab = this.ui.c.temToque() ? 'TOQUE PARA JOGAR' : 'PRESSIONE ENTER';
    const pa = 0.55 + 0.45 * Math.abs(Math.sin(t / 26));
    ctx.save();
    ctx.globalAlpha = pa;
    const pg = ctx.createLinearGradient(W / 2 - 170, 0, W / 2 + 170, 0);
    pg.addColorStop(0, 'rgba(255,120,40,0)');
    pg.addColorStop(0.5, 'rgba(255,150,60,.35)');
    pg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(W / 2 - 150, 337, 300, 30);
    ctx.restore();
    f.A(lab, W / 2, 352, 22, ['#ffffff', '#ffd27a'], '#2a0d00', 'center', 1, pa);
    if (persist.hi > 0) f.T(`RECORDE  ${String(persist.hi).padStart(6, '0')}`, W / 2, 381, 13, '#ffd23f', 'center');
    f.T('© 2026 Innovare Code  •  personagens e arte originais', W / 2, H - 12, 11, 'rgba(230,225,255,.7)', 'center');
  }

  draw(): void {
    this.drawScene(this.t, true);
  }

  key(k: string): boolean {
    if (k === 'f' || k === 'm') return false;
    this.ui.go('menu');
    this.ui.c.audio.uiOk();
    return true;
  }

  click(): void {
    this.ui.go('menu');
    this.ui.c.audio.uiOk();
  }
}
