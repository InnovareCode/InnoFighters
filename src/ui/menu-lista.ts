import { clamp } from '../core/math';
import { FH } from '../render/texto';
import type { Ferramentas } from './ferramentas';
import type { AcaoNav } from './tipos';

/** Um item de menu (campos opcionais como no protótipo). */
export interface ItemMenu {
  label: string | (() => string);
  desc?: string;
  disabled?: boolean;
  onOk?: () => void;
  /** Ajuste com ← → (d = -1 ou +1); também age no clique sem `onOk`. */
  onAdjust?: (d: number) => void;
  /** Clique direto no controle deslizante (0..1). */
  onSet?: (v: number) => void;
  slider?: () => number;
  value?: () => string;
}

/** Os dois sons que o menu toca. */
export interface SonsDeMenu {
  uiMove(): void;
  uiOk(): void;
}

/** Retângulo clicável de uma linha; `sx`/`sw` só existem em linhas com slider. */
export interface RetanguloItem {
  x: number;
  y: number;
  w: number;
  h: number;
  i: number;
  sx?: number;
  sw?: number;
}

export interface OpcoesDesenhoMenu {
  size?: number;
  t?: number;
  align?: 'left' | 'center';
}

/** Lista de menu (teclado, mouse e controle). Porte de MenuList do protótipo. */
export class MenuList {
  sel: number;
  rects: RetanguloItem[] = [];

  constructor(
    readonly items: ItemMenu[],
    private readonly sons: SonsDeMenu,
    private readonly f: Ferramentas,
  ) {
    this.sel = Math.max(0, items.findIndex((i) => !i.disabled));
  }

  move(d: number): void {
    const n = this.items.length;
    let s = this.sel;
    for (let i = 0; i < n; i++) {
      s = (s + d + n) % n;
      if (!this.items[s]?.disabled) break;
    }
    if (s !== this.sel) {
      this.sel = s;
      this.sons.uiMove();
    }
  }

  ok(): void {
    const it = this.items[this.sel];
    if (!it || it.disabled) return;
    if (it.onOk) {
      this.sons.uiOk();
      it.onOk();
    } else if (it.onAdjust) it.onAdjust(1);
  }

  adjust(d: number): void {
    const it = this.items[this.sel];
    if (it && it.onAdjust && !it.disabled) {
      it.onAdjust(d);
      this.sons.uiMove();
    }
  }

  /** Aplica uma ação de navegação; devolve false se a ação não é de menu (ex.: back). */
  nav(a: AcaoNav): boolean {
    if (a === 'up') this.move(-1);
    else if (a === 'down') this.move(1);
    else if (a === 'left') this.adjust(-1);
    else if (a === 'right') this.adjust(1);
    else if (a === 'ok') this.ok();
    else return false;
    return true;
  }

  private acharLinha(mx: number, my: number): RetanguloItem | undefined {
    return this.rects.find((r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h && !this.items[r.i]?.disabled);
  }

  hover(mx: number, my: number): boolean {
    const r = this.acharLinha(mx, my);
    if (!r) return false;
    if (this.sel !== r.i) {
      this.sel = r.i;
      this.sons.uiMove();
    }
    return true;
  }

  click(mx: number, my: number): boolean {
    const r = this.acharLinha(mx, my);
    if (!r) return false;
    this.sel = r.i;
    const it = this.items[r.i];
    if (!it) return false;
    if (it.slider && it.onAdjust && r.sx !== undefined && r.sw !== undefined) {
      const k = clamp((mx - r.sx) / r.sw, 0, 1);
      if (it.onSet && mx >= r.sx - 6) {
        it.onSet(k);
        return true;
      }
    }
    if (it.onOk) this.ok();
    else if (it.onAdjust) it.onAdjust(mx > r.x + r.w / 2 ? 1 : -1);
    return true;
  }

  /** Desenha a lista (e registra os retângulos para mouse). */
  draw(x: number, y: number, w: number, rowH: number, o: OpcoesDesenhoMenu = {}): void {
    const { ctx, T } = this.f;
    this.rects = [];
    const size = o.size ?? 24;
    this.items.forEach((it, i) => {
      const yy = y + i * rowH;
      const sel = i === this.sel;
      const dis = !!it.disabled;
      this.rects.push({ x, y: yy, w, h: rowH - 4, i });
      const forma = (): void => {
        ctx.beginPath();
        ctx.moveTo(x + 10, yy);
        ctx.lineTo(x + w, yy);
        ctx.lineTo(x + w - 10, yy + rowH - 4);
        ctx.lineTo(x, yy + rowH - 4);
        ctx.closePath();
      };
      ctx.save();
      if (sel) {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, 'rgba(255,196,60,.95)');
        g.addColorStop(1, 'rgba(255,90,60,.55)');
        forma();
        ctx.fillStyle = g;
      } else {
        forma();
        ctx.fillStyle = 'rgba(12,8,30,.62)';
      }
      ctx.fill();
      ctx.restore();

      const label = typeof it.label === 'function' ? it.label() : it.label;
      const col = dis ? '#7a7a92' : sel ? '#1b0b00' : '#fff';
      const lx = o.align === 'center' ? x + w / 2 : x + 22;
      const ly = yy + (rowH - 4) / 2;
      ctx.save();
      ctx.font = FH(size);
      ctx.textAlign = o.align === 'center' ? 'center' : 'left';
      ctx.textBaseline = 'middle';
      if (!sel) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.lineJoin = 'round';
        ctx.strokeText(label, lx, ly);
      }
      ctx.fillStyle = col;
      ctx.fillText(label, lx + (sel && o.align !== 'center' ? 6 : 0), ly);
      ctx.restore();

      if (it.slider) {
        const sw = Math.min(190, w * 0.38);
        const sx = x + w - sw - 24;
        const sy = ly;
        const v = clamp(it.slider(), 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        this.f.rr(sx, sy - 5, sw, 10, 5);
        ctx.fill();
        ctx.fillStyle = sel ? '#1b0b00' : '#ffd23f';
        this.f.rr(sx, sy - 5, Math.max(10, sw * v), 10, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + sw * v, sy, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b1f33';
        ctx.stroke();
        const r = this.rects[this.rects.length - 1];
        if (r) {
          r.sx = sx;
          r.sw = sw;
        }
        T(`${Math.round(v * 100)}%`, sx - 10, sy, 14, sel ? '#1b0b00' : '#cfe6ff', 'right', { shadow: false });
      } else if (it.value) {
        const v = it.value();
        const setas = !!it.onAdjust && !dis;
        T(`${setas ? '◀  ' : ''}${v}${setas ? '  ▶' : ''}`, x + w - 22, ly, 17, sel ? '#1b0b00' : '#ffd23f', 'right', { shadow: !sel });
      }
    });
  }
}
