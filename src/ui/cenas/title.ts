import { ALTURA, LARGURA } from '../../core/constantes';
import { Brasas, desenharCicloDeCenarios, fileiraDeHerois, gradacaoCinema, LAYOUT_DA_MARCA, LOGO_ALTURA, marca, STAGE_OF } from '../logo';
import type { Navegador } from '../navegador';
import type { ArgsTitle, Cena } from '../tipos';
import type { CenaTrailer } from './trailer';

/** Parado no título por tanto (tique de 1/60 s, 30 s) sem tecla, toque, clique, mouse ou controle, o trailer toca sozinho (modo atrair). */
export const TICKS_PARA_ATRAIR = 1800;

/** Tela de título: ciclo de cenários, os 4 lutadores, a logo oficial e "PRESSIONE ENTER". */
export class CenaTitle implements Cena {
  t = 0;
  /** Ticks desde o último gesto do jogador (volta a zero em tecla, clique, toque e movimento do mouse). */
  ocioso = 0;
  private readonly brasas: Brasas;

  constructor(private readonly ui: Navegador) {
    this.brasas = new Brasas(ui.c.rngVisual);
  }

  enter(a: ArgsTitle): void {
    this.t = a && (a.fromIntro || a.fromTrailer) ? 120 : 0;
    this.ocioso = 0;
  }

  update(): void {
    this.t++;
    this.ocioso++;
    if (this.ocioso >= TICKS_PARA_ATRAIR) this.atrair();
  }

  /** Modo atrair: o título parado há 30 s abre o trailer (só com o pedaço carregado e as regras ligadas; senão zera e espera mais 30 s). */
  private atrair(): void {
    this.ocioso = 0;
    const trailer = this.ui.cenas.trailer as CenaTrailer;
    if (!this.ui.fadeTo && trailer.disponivel()) this.ui.go('trailer', { origem: 'atrair' });
  }

  /** Desenha a cena em `t`; `comTexto` false = só o fundo (a abertura usa assim por trás do logo). */
  drawScene(t: number, comTexto = true): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
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
    this.desenharChamada(t);
  }

  /**
   * A chamada para jogar, o recorde e o rodapé. `aparece` (0..1) é o fade-in que só o trailer usa (a revelação da logo): com 1 (o padrão) saem exatamente as mesmas chamadas
   * de desenho de sempre. `rotulo` troca o texto (o trailer usa os de `data/trailer/textos`); sem ele vale o de sempre.
   */
  desenharChamada(t: number, aparece = 1, rotulo?: string): void {
    const { ctx, f, persist } = this.ui.c;
    const W = LARGURA;
    const H = ALTURA;
    const lab = rotulo ?? (this.ui.c.temToque() ? 'TOQUE PARA JOGAR' : 'PRESSIONE ENTER');
    const pa = (0.55 + 0.45 * Math.abs(Math.sin(t / 26))) * aparece;
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
    if (persist.hi > 0) f.T(`RECORDE  ${String(persist.hi).padStart(6, '0')}`, W / 2, 381, 13, '#ffd23f', 'center', aparece < 1 ? { alpha: aparece } : undefined);
    f.T('© 2026 Innovare Code  •  personagens e arte originais', W / 2, H - 12, 11, aparece < 1 ? `rgba(230,225,255,${(0.7 * aparece).toFixed(3)})` : 'rgba(230,225,255,.7)', 'center');
  }

  draw(): void {
    this.drawScene(this.t, true);
  }

  hover(): void {
    this.ocioso = 0;
  }

  key(k: string): boolean {
    if (k === 'f' || k === 'm') return false;
    this.ocioso = 0;
    (this.ui.cenas.trailer as CenaTrailer).registrarGesto();
    this.ui.go('menu');
    this.ui.c.audio.uiOk();
    return true;
  }

  click(): void {
    this.ocioso = 0;
    (this.ui.cenas.trailer as CenaTrailer).registrarGesto();
    this.ui.go('menu');
    this.ui.c.audio.uiOk();
  }
}
