import { ALTURA, LARGURA } from '../../core/constantes';
import { easeOut } from '../../core/math';
import { AI_LEVELS } from '../../fight/cpu';
import { desenharPose } from '../../render/pose';
import type { Navegador } from '../navegador';
import type { ArgsVs, Cena } from '../tipos';

/** Tela de confronto (VS): entra com animação e vai para a luta sozinha em ~3 s (ou ao apertar). */
export class CenaVs implements Cena {
  private a: ArgsVs | null = null;
  private started = false;

  constructor(private readonly ui: Navegador) {}

  enter(a: ArgsVs): void {
    this.a = a;
    this.ui.c.audio.uiVs();
  }

  update(): void {
    if (this.ui.t > 190) this.start();
  }

  private start(): void {
    if (this.started || !this.a) return;
    this.started = true;
    this.ui.go('fight', this.a);
    this.started = false;
  }

  key(k: string): boolean {
    if (this.ui.t > 30 && (k === 'Enter' || k === ' ' || k === 'z' || k === 'c' || k === 'j')) this.start();
    return true;
  }

  click(): void {
    if (this.ui.t > 30) this.start();
  }

  draw(): void {
    const a = this.a;
    if (!a) return;
    const { ctx, f, persist } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const H = ALTURA;
    const t = this.ui.t;
    const r1 = m.elenco[a.cfg.c1];
    const r2 = m.elenco[a.cfg.c2];
    const c1 = r1.ch;
    const c2 = r2.ch;
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#0b2a5e');
    g.addColorStop(0.5, '#150b2e');
    g.addColorStop(1, '#5e0b1c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 90 + t * 6) % (W + 200)) - 100;
      ctx.fillStyle = i % 2 ? '#fff' : c1.accent;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x - 80, H);
      ctx.lineTo(x - 120, H);
      ctx.fill();
    }
    ctx.restore();
    const k1 = easeOut(t / 28);
    const k2 = easeOut((t - 8) / 28);
    f.spotlight(240, 330, 260, `${c1.accent}55`);
    f.spotlight(720, 330, 260, `${c2.accent}55`);
    ctx.save();
    ctx.globalAlpha = k1;
    f.floorShadow(250 - (1 - k1) * 300, 470, 130);
    desenharPose(ctx, c1, r1.arte, 'guard', 250 - (1 - k1) * 300, 470, 1.55, 1);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = k2;
    f.floorShadow(710 + (1 - k2) * 300, 470, 130);
    desenharPose(ctx, c2, r2.arte, 'guard', 710 + (1 - k2) * 300, 470, 1.55, -1);
    ctx.restore();
    f.A(c1.name, 40 - (1 - k1) * 300, 70, 62, '#fff', '#002a66', 'left');
    f.A(c2.name, W - 40 + (1 - k2) * 300, 70, 62, '#fff', '#660a1a', 'right');
    f.T(`${c1.title}  •  ${c1.country}`, 44 - (1 - k1) * 300, 112, 16, c1.accent, 'left');
    f.T(`${c2.country}  •  ${c2.title}`, W - 44 + (1 - k2) * 300, 112, 16, c2.accent, 'right');
    const vs = easeOut((t - 24) / 14);
    if (t > 24) {
      f.A('VS', W / 2, 270, 150 * (0.6 + 0.4 * vs), ['#ffffff', '#ffb347'], '#3a0a00', 'center', 1 + Math.max(0, 1 - (t - 24) / 10) * 0.5);
    }
    if (t > 24 && t < 32) {
      ctx.fillStyle = `rgba(255,255,255,${1 - (t - 24) / 8})`;
      ctx.fillRect(0, 0, W, H);
    }
    const mode = a.cfg.mode;
    const run = a.run;
    const lab =
      mode === 'arcade' && run
        ? `ARCADE — LUTA ${run.idx + 1} DE ${run.order.length}`
        : mode === 'cpu'
          ? `LUTA vs CPU — ${AI_LEVELS[a.cfg.cpu ?? 0]?.name ?? ''}`
          : 'VERSUS';
    const rounds = persist.settings.rounds;
    f.A(lab, W / 2, 420, 26, '#fff', '#000');
    f.T(`CENÁRIO: ${c2.stageName || ''}`, W / 2, 448, 14, '#ffd23f', 'center');
    f.T(`Vença ${rounds}${rounds === 1 ? ' round' : ' rounds'} para ganhar a luta`, W / 2, 474, 15, '#ffd9a6', 'center');
    if (t > 40 && Math.floor(t / 25) % 2 === 0) f.T('ENTER para pular', W / 2, 510, 13, '#cfd6f5', 'center');
  }
}
