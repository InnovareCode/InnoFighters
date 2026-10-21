import { ALTURA, LARGURA } from '../../core/constantes';
import { zoomIn } from '../../render/animacao';
import { APRESENTACAO } from '../../render/apresentacao-lutadores';
import { desenharRetrato } from '../../render/retrato';
import type { Navegador } from '../navegador';
import { NAV, type ArgsAvisoChefe, type Cena } from '../tipos';

/** Aviso antes do chefão: "UM DESAFIANTE SE APROXIMA" (plano 4.2) ou o texto do chefão em `APRESENTACAO.aviso` (ZENON: "O ANFITRIÃO ESTÁ À SUA ESPERA"). Segue sozinho para o VS do chefão. */
export class CenaChefe implements Cena {
  private a: ArgsAvisoChefe | null = null;
  private indo = false;

  constructor(private readonly ui: Navegador) {}

  enter(a: ArgsAvisoChefe): void {
    this.a = a;
    this.indo = false;
    this.ui.c.audio.uiPause();
  }

  update(): void {
    if (this.ui.t > 170) this.seguir();
  }

  private seguir(): void {
    if (this.indo || !this.a) return;
    this.indo = true;
    this.ui.go('vs', this.a);
  }

  key(k: string): boolean {
    if (this.ui.t > 40 && NAV[k] === 'ok') this.seguir();
    return true;
  }

  click(): void {
    if (this.ui.t > 40) this.seguir();
  }

  draw(): void {
    const a = this.a;
    if (!a) return;
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const H = ALTURA;
    const t = this.ui.t;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a0510');
    g.addColorStop(1, '#050108');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // pulso vermelho nas bordas
    const pulso = 0.25 + 0.15 * Math.sin(t / 10);
    const v = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 560);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(190,20,40,${pulso})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    // silhueta do chefão: o rosto escurecido, sem nome (a surpresa é dele)
    const r = m.elenco[a.cfg.c2];
    const k = Math.min(1, t / 40);
    ctx.save();
    ctx.globalAlpha = k;
    desenharRetrato(ctx, r.arte.retrato(r.ch.head), W / 2 - 110, 190, 220, false, ['#3a0a1a', '#0a0208']);
    ctx.fillStyle = 'rgba(4,1,8,.93)';
    ctx.fillRect(W / 2 - 110, 190, 220, 220);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e03a2e';
    ctx.strokeRect(W / 2 - 110, 190, 220, 220);
    ctx.restore();
    f.A('???', W / 2, 300, 70, '#7a2a3a', '#0a0208', 'center', 1, k);
    const [linha1, linha2] = APRESENTACAO[a.cfg.c2]?.aviso ?? (['UM DESAFIANTE', 'SE APROXIMA'] as const);
    f.A(linha1, W / 2, 70, 58, ['#ffffff', '#ff6a5a'], '#2a0000', 'center', zoomIn(t));
    f.A(linha2, W / 2, 132, 58, ['#ffffff', '#ff6a5a'], '#2a0000', 'center', zoomIn(t - 6));
    f.T('A última luta do torneio: 1 round, 2 barras de vida.', W / 2, 450, 17, '#ffd9a6', 'center');
    if (t > 40 && Math.floor(t / 25) % 2 === 0) f.T('ENTER para seguir', W / 2, 510, 13, '#cfd6f5', 'center');
  }
}
