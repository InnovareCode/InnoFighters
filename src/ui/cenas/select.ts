import { LARGURA } from '../../core/constantes';
import { ROSTER } from '../../data/lutadores';
import { desenharFundoMenu } from '../../render/cenario';
import { desenharRetrato } from '../../render/retrato';
import type { Navegador } from '../navegador';
import { barrasDeStatus, mostrarLutador, P_COL } from '../personagens';
import type { ArgsSelect, Cena, ModoMenu } from '../tipos';

type Dir = 'up' | 'down' | 'left' | 'right';
const TECLAS_P1: Readonly<Record<string, Dir>> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const TECLAS_P2: Readonly<Record<string, Dir>> = { w: 'up', s: 'down', a: 'left', d: 'right' };

/** Seleção de lutador(es): grade 2x2, 1 ou 2 jogadores, etapa de alvo/adversário. */
export class CenaSelect implements Cena {
  mode: ModoMenu = 'arcade';
  versus = false;
  step = 1;
  cur: [number, number] = [0, 1];
  lock: [boolean, boolean] = [false, false];
  pick: [number, number] = [0, 1];
  flash: [number, number] = [0, 0];
  done = 0;

  constructor(private readonly ui: Navegador) {}

  enter(a: ArgsSelect): void {
    this.mode = a.mode;
    this.versus = a.mode === 'versus';
    this.step = 1;
    this.cur = [0, 1];
    this.lock = [false, false];
    this.pick = [0, 1];
    this.flash = [0, 0];
    this.done = 0;
  }

  private title(): string {
    if (this.versus) return 'ESCOLHAM SEUS LUTADORES';
    return this.step === 1 ? 'ESCOLHA SEU LUTADOR' : this.mode === 'training' ? 'ESCOLHA O ALVO DO TREINO' : 'ESCOLHA O ADVERSÁRIO';
  }

  /** Jogador que está escolhendo agora (null no versus: os dois). */
  private active(): 0 | 1 | null {
    return this.versus ? null : this.step === 1 ? 0 : 1;
  }

  private moveCursor(p: 0 | 1, a: Dir): void {
    const i = this.cur[p];
    let col = i % 2;
    let row = i >> 1;
    if (a === 'left' || a === 'right') col = 1 - col;
    else row = 1 - row;
    this.cur[p] = row * 2 + col;
    this.ui.c.audio.uiMove();
  }

  private confirm(p: 0 | 1): void {
    if (this.lock[p] || this.done) return;
    this.lock[p] = true;
    this.pick[p] = this.cur[p];
    this.flash[p] = 36;
    const id = ROSTER[this.cur[p]] ?? 'hayato';
    this.ui.c.audio.uiSelect(this.ui.m.elenco[id].ch.pitch);
    if (this.versus) {
      if (this.lock[0] && this.lock[1]) this.done = 70;
      return;
    }
    if (this.mode === 'arcade') {
      this.done = 60;
      return;
    }
    if (this.step === 1) {
      this.step = 2;
      this.cur[1] = (this.cur[0] + 1) % 4;
      this.lock[1] = false;
      return;
    }
    this.done = 60;
  }

  private back(p: 0 | 1): void {
    const { audio } = this.ui.c;
    if (this.done) return;
    if (this.versus) {
      if (this.lock[p]) {
        this.lock[p] = false;
        audio.uiBack();
      } else {
        this.ui.go('menu');
        audio.uiBack();
      }
      return;
    }
    if (this.step === 2) {
      this.step = 1;
      this.lock[0] = false;
      audio.uiBack();
    } else {
      this.ui.go('menu');
      audio.uiBack();
    }
  }

  key(k: string): boolean {
    const d1 = TECLAS_P1[k];
    const d2 = TECLAS_P2[k];
    const ok1 = k === 'z' || k === 'c' || k === 'Enter' || k === ' ';
    const ok2 = k === 'j' || k === 'u';
    const bk1 = k === 'x' || k === 'v' || k === 'Escape' || k === 'Backspace';
    const bk2 = k === 'k' || k === 'i';
    if (this.versus) {
      if (d1 && !this.lock[0]) this.moveCursor(0, d1);
      else if (d2 && !this.lock[1]) this.moveCursor(1, d2);
      else if (ok1) this.confirm(0);
      else if (ok2) this.confirm(1);
      else if (bk1) this.back(0);
      else if (bk2) this.back(1);
      else return false;
      return true;
    }
    const act = this.active() ?? 0;
    const dir = d1 ?? d2;
    if (dir) {
      if (!this.lock[act]) this.moveCursor(act, dir);
    } else if (ok1 || ok2) this.confirm(act);
    else if (bk1 || bk2) this.back(0);
    else return false;
    return true;
  }

  private tileRect(i: number): { x: number; y: number; w: number; h: number } {
    return { x: 360 + (i % 2) * 132, y: 92 + (i >> 1) * 132, w: 120, h: 120 };
  }

  private jogadorDoMouse(): 0 | 1 {
    return this.versus ? (this.lock[0] ? 1 : 0) : (this.active() ?? 0);
  }

  hover(mx: number, my: number): void {
    for (let i = 0; i < 4; i++) {
      const r = this.tileRect(i);
      const p = this.jogadorDoMouse();
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h && !this.lock[p] && this.cur[p] !== i) {
        this.cur[p] = i;
        this.ui.c.audio.uiMove();
      }
    }
  }

  click(mx: number, my: number): void {
    for (let i = 0; i < 4; i++) {
      const r = this.tileRect(i);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        const p = this.jogadorDoMouse();
        this.cur[p] = i;
        this.confirm(p);
      }
    }
  }

  update(): void {
    for (let p = 0; p < 2; p++) if ((this.flash[p as 0 | 1] ?? 0) > 0) this.flash[p as 0 | 1]--;
    if (this.done > 0 && --this.done === 0) {
      const c1 = ROSTER[this.pick[0]] ?? 'hayato';
      const c2 = ROSTER[this.pick[1]] ?? 'wei-long';
      if (this.mode === 'arcade' || this.mode === 'cpu') this.ui.go('diff', { mode: this.mode, c1, c2 });
      else if (this.mode === 'versus') this.ui.go('vs', { cfg: { mode: 'versus', c1, c2, cpu: null } });
      else this.ui.go('fight', { cfg: { mode: 'training', c1, c2, cpu: null } });
    }
  }

  private lado(p: 0 | 1, x: number, facing: number): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const t = this.ui.t;
    const idx = this.versus ? this.cur[p] : p === 0 ? (this.step === 1 ? this.cur[0] : this.pick[0]) : this.cur[1];
    const ch = m.elenco[ROSTER[idx] ?? 'hayato'].ch;
    const fl = this.flash[p];
    f.spotlight(x, 300, 190, p === 0 ? 'rgba(63,169,255,.28)' : 'rgba(255,79,94,.28)');
    ctx.save();
    ctx.translate(x, 0);
    if (fl > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      f.spotlight(0, 300, 200, `${ch.fire[0]}99`);
      ctx.restore();
    }
    ctx.restore();
    mostrarLutador(f, m, ch.id, x, 362, 1.18, facing, t + p * 30, fl > 12 ? 'special' : 'guard');
    const px = p === 0 ? 20 : LARGURA - 20 - 284;
    f.panel(px, 374, 284, 132, { stroke: P_COL[p] });
    f.A(ch.name, px + 14, 394, 28, '#fff', '#000', 'left');
    f.T(`${ch.title}  •  ${ch.country}`, px + 14, 418, 13, ch.accent, 'left');
    barrasDeStatus(f, ch, px + 14, 444, 150);
    f.T('ESPECIAIS', px + 180, 438, 11, '#9fa6c9', 'left', { shadow: false });
    ch.sps.forEach((sp, i) => f.T((i === 0 ? '' : i === 1 ? '↓ ' : '→ ') + (sp.name ?? ''), px + 180, 456 + i * 17, 13, i === 0 ? ch.fire[0] : '#e8ecff', 'left'));
    const tag = this.versus ? (p === 0 ? 'JOGADOR 1' : 'JOGADOR 2') : p === 0 ? 'VOCÊ' : this.mode === 'training' ? 'ALVO' : 'ADVERSÁRIO';
    f.A(tag, px + 142, 72, 22, P_COL[p], '#000', 'center');
  }

  draw(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, this.ui.t, 0.5);
    this.ui.desenharPetalas();
    f.A(this.title(), W / 2, 42, 38, ['#ffffff', '#ffc27a'], '#1a0a00');
    this.lado(0, 160, 1);
    if (this.versus || this.step === 2) this.lado(1, W - 160, -1);
    else {
      // painel de rivais (modo solo, etapa 1)
      const px = W - 20 - 284;
      f.A(this.mode === 'arcade' ? 'RIVAIS' : this.mode === 'training' ? 'ALVO' : 'ADVERSÁRIO', px + 142, 72, 22, P_COL[1], '#000', 'center');
      f.panel(px, 100, 284, 250, { stroke: P_COL[1] });
      const msg =
        this.mode === 'arcade'
          ? 'Derrote os outros três lutadores em sequência. A ordem é sorteada.'
          : this.mode === 'training'
            ? 'Depois você escolhe quem será o alvo do treino.'
            : 'Depois você escolhe o adversário e a dificuldade.';
      f.wrap(msg, px + 16, 126, 252, 20, 15, '#e8ecff');
      const outros = ROSTER.filter((_, i) => i !== this.cur[0]);
      outros.forEach((id, i) => {
        const r = m.elenco[id];
        desenharRetrato(ctx, r.arte.imagem, r.ch.head, px + 18 + i * 88, 210, 80, true, ['#4a2a5a', '#160c24']);
        f.T(r.ch.name, px + 58 + i * 88, 304, 13, '#fff', 'center');
      });
    }
    // grade central
    for (let i = 0; i < 4; i++) {
      const r = this.tileRect(i);
      const rc = m.elenco[ROSTER[i] ?? 'hayato'];
      const ch = rc.ch;
      const aqui = ([0, 1] as const).filter((p) => (this.versus || (p === 0 ? true : this.step === 2)) && this.cur[p] === i);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      ctx.restore();
      desenharRetrato(ctx, rc.arte.imagem, ch.head, r.x, r.y, r.w, false, ['#34406e', '#0c1233']);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(r.x, r.y + r.h - 22, r.w, 22);
      f.T(ch.name, r.x + r.w / 2, r.y + r.h - 11, 14, '#fff', 'center');
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0a0a14';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      aqui.forEach((p, n) => {
        const pulse = this.lock[p] ? 1 : 0.6 + 0.4 * Math.sin(this.ui.t / 6);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.lineWidth = 5;
        ctx.strokeStyle = P_COL[p];
        ctx.strokeRect(r.x - 3 - n * 5, r.y - 3 - n * 5, r.w + 6 + n * 10, r.h + 6 + n * 10);
        ctx.restore();
        ctx.fillStyle = P_COL[p];
        ctx.fillRect(r.x + (p ? r.w - 34 : 0), r.y, 34, 20);
        f.T(this.versus ? (p ? '2P' : '1P') : p ? 'CPU' : '1P', r.x + (p ? r.w - 17 : 17), r.y + 10, 13, '#fff', 'center', { shadow: false });
        if (this.lock[p]) {
          ctx.fillStyle = 'rgba(0,0,0,.35)';
          ctx.fillRect(r.x, r.y, r.w, r.h - 22);
          f.A('OK', r.x + r.w / 2, r.y + 50, 30, P_COL[p], '#000');
        }
      });
    }
    const act = this.versus ? 0 : (this.active() ?? 0);
    const hc = m.elenco[ROSTER[this.cur[act]] ?? 'hayato'].ch;
    f.panel(352, 358, 256, 100, { r: 8 });
    f.A(hc.name, 480, 376, 22, '#fff', '#000');
    f.wrap(hc.desc, 366, 402, 228, 17, 13, '#e8ecff');
    f.hint(this.versus ? 'P1: ← ↑ ↓ → e Z      P2: WASD e J      X / K desfazer     ESC menu' : '← ↑ ↓ → mover     ENTER / Z confirmar     ESC / X voltar');
  }
}
