import { ALTURA, LARGURA } from '../../core/constantes';
import { desenharFundoMenu } from '../../render/cenario';
import { zoomIn } from '../../render/animacao';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import { mostrarLutador } from '../personagens';
import { NAV, type AcaoNav, type ArgsContinue, type ArgsEnding, type ArgsResult, type CampanhaArcade, type Cena } from '../tipos';

/** Resultado de uma luta: vencedor, placar de rounds, maior combo, pontos e as opções. */
export class CenaResult implements Cena {
  private a: ArgsResult | null = null;
  private m: MenuList;

  constructor(private readonly ui: Navegador) {
    this.m = new MenuList([], ui.c.audio, ui.c.f);
  }

  enter(a: ArgsResult): void {
    const { audio, f } = this.ui.c;
    this.a = a;
    const c = a.a.cfg;
    this.m = new MenuList(
      [
        { label: 'REVANCHE', onOk: () => this.ui.go('fight', a.a) },
        { label: 'ESCOLHER LUTADORES', onOk: () => this.ui.go('select', { mode: c.mode }) },
        { label: 'MENU PRINCIPAL', onOk: () => { audio.startMusic('menu'); this.ui.go('menu'); } },
      ],
      audio,
      f,
    );
    audio.victory();
  }

  draw(): void {
    const a = this.a;
    if (!a) return;
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const t = this.ui.t;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, t, 0.55);
    const c = a.a.cfg;
    const wid = a.winner === 1 ? c.c1 : c.c2;
    const ch = m.elenco[wid].ch;
    f.spotlight(250, 330, 260, `${ch.fire[0]}55`);
    mostrarLutador(f, m, wid, 250, 480, 1.6, 1, t, 'win');
    this.ui.desenharPetalas();
    const p = a.winner === 1 ? '1' : '2';
    const who = c.mode === 'cpu' && a.winner === 2 ? 'CPU' : `JOGADOR ${p}`;
    f.A('VITÓRIA', 650, 70, 44, '#ffd23f', '#2a1000');
    f.A(ch.name, 650, 128, 76, ['#ffffff', '#ff9a1a'], '#2a1000', 'center', zoomIn(t));
    f.T(who, 650, 176, 18, '#cfe6ff', 'center');
    f.panel(470, 200, 360, 120, { r: 8 });
    const st = a.st;
    f.T('Rounds', 650, 222, 15, '#9fa6c9', 'center');
    f.T(`${m.elenco[c.c1].ch.name}  ${st.r1}  x  ${st.r2}  ${m.elenco[c.c2].ch.name}`, 650, 246, 20, '#fff', 'center');
    f.T(`Maior combo: ${st.c1} × ${st.c2}`, 650, 278, 15, '#e8ecff', 'center');
    f.T(`Pontos: ${st.s1} × ${st.s2}`, 650, 302, 15, '#e8ecff', 'center');
    this.m.draw(470, 340, 360, 50, { size: 24, align: 'center' });
    f.hint('↑ ↓ escolher     ENTER = revanche imediata     ESC menu');
  }

  key(k: string): boolean {
    if (k === 'Enter' && this.a) {
      this.ui.go('fight', this.a.a);
      return true;
    }
    return false;
  }

  nav(a: AcaoNav): void {
    if (a === 'back') {
      this.ui.c.audio.startMusic('menu');
      this.ui.go('menu');
    } else this.m.nav(a);
  }

  hover(x: number, y: number): void {
    this.m.hover(x, y);
  }

  click(x: number, y: number): void {
    this.m.click(x, y);
  }
}

/** Continuar? (ARCADE): contagem regressiva de 10 s, créditos e GAME OVER com recorde. */
export class CenaContinue implements Cena {
  private run: CampanhaArcade | null = null;
  left = 600;
  over = false;
  private lastSec = 10;
  private overT = 0;

  constructor(private readonly ui: Navegador) {}

  enter(a: ArgsContinue): void {
    this.run = a.run;
    this.left = 600;
    this.over = false;
    this.lastSec = 10;
    this.ui.c.audio.stopMusic();
  }

  update(): void {
    const run = this.run;
    if (!run) return;
    const { audio } = this.ui.c;
    if (this.over) {
      if (this.ui.t > this.overT + 150) {
        audio.startMusic('menu');
        this.ui.go('title');
      }
      return;
    }
    this.left--;
    const s = Math.ceil(this.left / 60);
    if (s !== this.lastSec) {
      this.lastSec = s;
      audio.uiTick();
    }
    if (this.left <= 0 || run.continues <= 0) this.gameOver();
  }

  private gameOver(): void {
    const run = this.run;
    if (!run) return;
    const { persist } = this.ui.c;
    this.over = true;
    this.overT = this.ui.t;
    if (run.score > persist.hi) {
      persist.hi = run.score;
      persist.salvar();
    }
  }

  private yes(): void {
    const r = this.run;
    if (this.over || !r || r.continues <= 0) return;
    r.continues--;
    r.cont++;
    this.ui.c.audio.uiOk();
    const prox = r.order[r.idx];
    if (!prox) return;
    this.ui.go('vs', { cfg: { mode: 'arcade', c1: r.c1, c2: prox, cpu: r.diff, keepScore: true }, run: r });
  }

  key(k: string): boolean {
    if (NAV[k] === 'ok') {
      this.yes();
      return true;
    }
    if (NAV[k] === 'back' && !this.over) {
      this.gameOver();
      return true;
    }
    return true;
  }

  click(): void {
    this.yes();
  }

  draw(): void {
    const run = this.run;
    if (!run) return;
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const H = ALTURA;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#12061f');
    g.addColorStop(1, '#030106');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (this.over) {
      f.A('GAME OVER', W / 2, 230, 110, ['#ffffff', '#ff3b3b'], '#2a0000', 'center', zoomIn(this.ui.t - this.overT));
      f.T(`Pontuação final: ${run.score}`, W / 2, 310, 22, '#ffd23f', 'center');
      return;
    }
    f.A('CONTINUAR?', W / 2, 90, 72, ['#ffffff', '#ffc27a'], '#1a0a00');
    const s = Math.ceil(this.left / 60);
    const k = (this.left % 60) / 60;
    f.A(String(s), W / 2, 240, 170, ['#fff6b0', '#ff7a1a'], '#2a0d00', 'center', 1 + k * 0.25, 0.4 + k * 0.6);
    f.T(`ENTER / Z — continuar  (${run.continues}${run.continues === 1 ? ' crédito' : ' créditos'})`, W / 2, 372, 20, '#fff', 'center');
    f.T('ESC — encerrar', W / 2, 400, 15, '#9fa6c9', 'center');
    ctx.save();
    ctx.globalAlpha = 0.7;
    mostrarLutador(f, m, run.c1, 140, 500, 1.0, 1, this.ui.t, 'hit');
    ctx.restore();
    f.T(`Pontuação: ${run.score}`, W / 2, 450, 18, '#ffd23f', 'center');
  }
}

/** Final do ARCADE: campeão, pontuação e recorde. */
export class CenaEnding implements Cena {
  private run: CampanhaArcade | null = null;
  private rec = false;

  constructor(private readonly ui: Navegador) {}

  enter(a: ArgsEnding): void {
    const { persist, audio } = this.ui.c;
    this.run = a.run;
    this.rec = a.run.score > persist.hi;
    if (this.rec) {
      persist.hi = a.run.score;
      persist.salvar();
    }
    audio.victory();
  }

  draw(): void {
    const run = this.run;
    if (!run) return;
    const { ctx, f, persist } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const t = this.ui.t;
    const ch = m.elenco[run.c1].ch;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, t, 0.5);
    f.spotlight(480, 300, 320, `${ch.fire[0]}44`);
    mostrarLutador(f, m, ch.id, 480, 500, 1.6, 1, t, 'win');
    this.ui.desenharPetalas();
    f.A('PARABÉNS!', W / 2, 62, 76, ['#ffffff', '#ff7aa8'], '#2a0420', 'center', zoomIn(t));
    f.A(`${ch.name} É O CAMPEÃO!`, W / 2, 128, 40, ['#fff6b0', '#ff9a1a'], '#2a1000');
    f.T(`"${ch.title}" derrotou todos os rivais do torneio.`, W / 2, 170, 17, '#ffe6ef', 'center');
    f.T(`PONTUAÇÃO  ${String(run.score).padStart(6, '0')}`, 160, 300, 24, '#ffd23f', 'center');
    if (this.rec) f.A('NOVO RECORDE!', 160, 336, 30, ['#ffffff', '#6fe0ff'], '#04243a', 'center', 1 + Math.sin(t / 6) * 0.05);
    else f.T(`Recorde  ${String(persist.hi).padStart(6, '0')}`, 160, 336, 16, '#cfd6f5', 'center');
    f.T(`Créditos usados: ${run.cont}`, 160, 362, 14, '#cfd6f5', 'center');
    if (t > 60 && Math.floor(t / 30) % 2 === 0) f.A('ENTER — VOLTAR AO TÍTULO', W / 2, 505, 24, '#fff', '#000');
  }

  key(k: string): boolean {
    if (this.ui.t > 60 && (NAV[k] === 'ok' || NAV[k] === 'back')) {
      this.ui.c.audio.startMusic('menu');
      this.ui.go('title');
    }
    return true;
  }

  click(): void {
    if (this.ui.t > 60) {
      this.ui.c.audio.startMusic('menu');
      this.ui.go('title');
    }
  }
}
