import { ALTURA, LARGURA } from '../../core/constantes';
import { clamp, easeOut, lerp } from '../../core/math';
import { VITRINE } from '../../data/lutadores';
import { desenharPose } from '../../render/pose';
import { cenarioDoCiclo, CICLO_VITRINE, LOGO_S, LOGO_Y, marca, PALETA_MARCA } from '../logo';
import type { Navegador } from '../navegador';
import type { Cena } from '../tipos';
import type { CenaTitle } from './title';

type Faisca = { x: number; y: number; vx: number; vy: number; life: number; c: string };

/** Abertura cinematográfica (toca uma vez depois de carregar; qualquer tecla pula). */
export class CenaIntro implements Cena {
  t = 0;
  private boom: Faisca[] = [];
  private done = false;

  constructor(private readonly ui: Navegador) {}

  enter(): void {
    this.t = 0;
    this.boom = [];
    this.done = false;
  }

  update(): void {
    const { audio, rngVisual } = this.ui.c;
    const t = ++this.t;
    if (t === 6) audio.introWhoosh();
    for (let i = 0; i < VITRINE.length; i++) if (t === 34 + i * 20) audio.introHit(i);
    if (t === 128) {
      audio.logoSlam();
      for (let k = 0; k < 70; k++) {
        const a = rngVisual.entre(0, 6.3);
        const s = rngVisual.entre(3, 13);
        this.boom.push({
          x: LARGURA / 2, y: LOGO_Y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rngVisual.entre(30, 60),
          c: PALETA_MARCA.brasas[k % PALETA_MARCA.brasas.length] ?? '#ff9a3d',
        });
      }
    }
    for (const p of this.boom) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy = p.vy * 0.95 + 0.08;
      p.life--;
    }
    this.boom = this.boom.filter((p) => p.life > 0);
    if (t >= 260 && !this.done) this.finish();
  }

  private finish(): void {
    this.done = true;
    this.ui.set('title', { fromIntro: true });
  }

  key(k: string): boolean {
    if (k === 'f' || k === 'm') return false;
    if (this.t > 10) this.finish();
    return true;
  }

  click(): void {
    if (this.t > 10) this.finish();
  }

  draw(): void {
    const { ctx, f, rngVisual } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const H = ALTURA;
    const t = this.t;
    ctx.fillStyle = '#04020a';
    ctx.fillRect(0, 0, W, H);
    // 1) risco de luz que abre a tela
    if (t < 40) {
      const k = clamp((t - 4) / 24, 0, 1);
      const w = W * easeOut(k);
      const a = t < 30 ? 1 : 1 - (t - 30) / 10;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(W / 2 - w / 2, 0, W / 2 + w / 2, 0);
      g.addColorStop(0, 'rgba(255,140,40,0)');
      g.addColorStop(0.5, '#fff6dc');
      g.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(W / 2 - w / 2, H / 2 - 2, w, 4);
      const g2 = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 260 * k);
      g2.addColorStop(0, 'rgba(255,200,140,.5)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // 2) quatro painéis inclinados com os lutadores
    const panelsA = t < 128 ? 1 : clamp(1 - (t - 128) / 70, 0, 1);
    if (t >= 30 && panelsA > 0) {
      const pw = W / VITRINE.length;
      const sk = 70;
      VITRINE.forEach((id, i) => {
        const r = m.elenco[id];
        const ch = r.ch;
        const t0 = 34 + i * 20;
        if (t < t0 - 6) return;
        const k = easeOut(clamp((t - (t0 - 6)) / 10, 0, 1));
        const dir = i % 2 ? -1 : 1;
        const dy = (1 - k) * H * dir;
        const x0 = i * pw;
        ctx.save();
        ctx.globalAlpha = panelsA;
        ctx.translate(0, dy);
        ctx.beginPath();
        ctx.moveTo(x0 + sk / 2, 0);
        ctx.lineTo(x0 + pw + sk / 2 + 2, 0);
        ctx.lineTo(x0 + pw - sk / 2 + 2, H);
        ctx.lineTo(x0 - sk / 2, H);
        ctx.closePath();
        ctx.clip();
        const img = cenarioDoCiclo(m, CICLO_VITRINE[i] ?? 'jp');
        const push = 1.25 + (t - t0) * 0.0015;
        ctx.save();
        ctx.translate(x0 + pw / 2, H / 2);
        ctx.scale(push, push);
        ctx.drawImage(img, -W / 2, -H / 2, W, H);
        ctx.restore();
        const gr = ctx.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(5,2,12,.55)');
        gr.addColorStop(0.6, `${ch.fire[2]}55`);
        gr.addColorStop(1, 'rgba(5,2,12,.92)');
        ctx.fillStyle = gr;
        ctx.fillRect(x0 - sk, 0, pw + sk * 2, H);
        const fx = x0 + pw / 2 + (1 - k) * 40 * dir;
        const pose = t > t0 + 8 && t < t0 + 26 ? 'sa1' : 'win';
        desenharPose(ctx, ch, r.arte, pose, fx, H - 30, 1.42, 1, 1);
        if (t < t0 + 6) desenharPose(ctx, ch, r.arte, pose, fx, H - 30, 1.42, 1, 0, 1 - (t - t0 + 6) / 12);
        f.A(ch.name, x0 + pw / 2, H - 70, 30, '#fff', '#000', 'center');
        f.T(ch.country, x0 + pw / 2, H - 44, 13, ch.fire[0], 'center');
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = panelsA;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.translate(0, dy);
        ctx.beginPath();
        ctx.moveTo(x0 + pw + sk / 2 + 2, 0);
        ctx.lineTo(x0 + pw - sk / 2 + 2, H);
        ctx.stroke();
        ctx.restore();
      });
    }
    // 3) o título entra com impacto e a tela de título aparece por trás
    if (t >= 120) {
      const a = clamp((t - 140) / 80, 0, 1);
      if (a > 0) {
        ctx.save();
        ctx.globalAlpha = a;
        (this.ui.cenas.title as CenaTitle).drawScene(t - 140, false);
        ctx.restore();
      }
      const k = clamp((t - 120) / 10, 0, 1);
      const sc = t < 130 ? lerp(3.2, 1, easeOut(k)) : 1 + Math.max(0, 0.06 - (t - 130) * 0.006);
      const shake = t >= 128 && t < 150 ? (150 - t) * 0.6 : 0;
      ctx.save();
      ctx.translate(rngVisual.entre(-shake, shake), rngVisual.entre(-shake, shake));
      marca.desenharEmblema(ctx, W / 2, LOGO_Y, 132 * Math.min(1, (t - 124) / 18 + 0.3), t, clamp((t - 126) / 20, 0, 1));
      marca.desenharLogo(ctx, W / 2, LOGO_Y, LOGO_S * sc, (t - 136) / 40, clamp(k * 1.5, 0, 1));
      ctx.restore();
      if (t >= 128 && t < 170) {
        // onda de choque
        const r = (t - 128) * 22;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,230,180,${1 - (t - 128) / 42})`;
        ctx.lineWidth = 10 * (1 - (t - 128) / 42) + 1;
        ctx.beginPath();
        ctx.arc(W / 2, LOGO_Y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (t >= 126 && t < 136) {
        ctx.fillStyle = `rgba(255,255,255,${1 - (t - 126) / 10})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.boom) {
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (t > 20) f.T('qualquer tecla para pular', W - 14, H - 14, 11, 'rgba(255,255,255,.45)', 'right', { shadow: false });
  }
}
