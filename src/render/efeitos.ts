import { ALTURA, GROUND, LARGURA } from '../core/constantes';
import type { EstiloProjetil, EventoLuta, IndiceLutador, ProjetilLeitura, TextoFlutuante } from '../core/contratos';
import type { Rng } from '../core/rng';
import { textoArcade } from './texto';
import type { Ctx } from './tela';

/*
 * Efeitos visuais que NÃO leem estado de luta (PLANO.md 4.2/4.3): partículas, estrelas de
 * impacto, escudo de bloqueio, textos flutuantes, pétalas, tremor e bola de fogo.
 * Os tipos são próprios: a cena de luta (ui/) converte eventos da luta (C3) em chamadas aqui.
 * O sorteio vem de um Rng SÓ dos efeitos, para a lógica determinística não depender de
 * quantas partículas foram criadas.
 */

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  size: number;
  /** Poeira (fundo, esmaece) em vez de faísca (aditiva). */
  dust?: boolean;
}

export interface Impacto {
  x: number;
  y: number;
  life: number;
  max: number;
  col: string;
  rot: number;
  big?: boolean;
  /** Escudo de bloqueio em vez de estrela de impacto. */
  blk?: boolean;
  dir?: number;
}

export interface TextoAtivo {
  x: number;
  y: number;
  s: string;
  col: string;
  size: number;
  life: number;
  max: number;
}

export interface Petala {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  s: number;
  ph: number;
}

/** O que o desenho da bola de fogo precisa saber (a cena monta isto a partir do projétil da luta). */
export interface ProjetilVisual {
  x: number;
  y: number;
  /** Escala horizontal e vertical. */
  sc: number;
  sy: number;
  /** Quadros desde o disparo (anima rotação e cauda). */
  frame: number;
  estilo: EstiloProjetil;
  vx: number;
  /** Direção de reserva quando vx é 0. */
  dir: number;
  /** [meio, núcleo, borda] */
  cores: readonly [string, string, string];
}

/** Adaptador: projétil da luta (C3) + cores do dono (data/lutadores[id].fire) -> o que o desenho precisa. */
export function projetilParaVisual(p: ProjetilLeitura, cores: readonly [string, string, string]): ProjetilVisual {
  return { x: p.x, y: p.y, sc: p.sc, sy: p.sy, frame: p.frame, estilo: p.style, vx: p.vx, dir: p.dir, cores };
}

const DOIS_PI = Math.PI * 2;

/** Onde um lutador está agora (pés em x, y): os eventos `carga` e `troca-ficha` não trazem posição, a cena a empresta. */
export type PosicaoDoLutador = (indice: IndiceLutador) => { readonly x: number; readonly y: number };

/**
 * Estado dos efeitos de uma luta. Chamar `avancar()` uma vez por tick em que a luta andou
 * (`LeituraLuta.tick` mudou), DEPOIS de processar os eventos daquele tick. O tremor de tela
 * não mora aqui: é `LeituraLuta.shake`.
 */
export class Efeitos {
  particulas: Particula[] = [];
  impactos: Impacto[] = [];
  textos: TextoAtivo[] = [];

  constructor(private readonly rng: Rng) {}

  limpar(): void {
    this.particulas = [];
    this.impactos = [];
    this.textos = [];
  }

  /** Poeira no chão (passos, aterrissagem, corrida). */
  poeira(x: number, n: number, forca = 1): void {
    const r = this.rng;
    for (let i = 0; i < n; i++) {
      const life = r.entre(16, 30) * forca;
      this.particulas.push({
        x: x + r.entre(-30, 30),
        y: GROUND - r.entre(0, 6),
        vx: r.entre(-2.2, 2.2) * forca,
        vy: -r.entre(0.4, 2.2) * forca,
        life,
        max: life,
        col: 'rgba(225,205,180,.8)',
        size: r.entre(3, 7) * forca,
        dust: true,
      });
    }
  }

  /** Faíscas em leque no ponto de impacto. */
  faiscas(x: number, y: number, cor: string, n: number): void {
    const r = this.rng;
    for (let i = 0; i < n; i++) {
      const a = r.entre(0, DOIS_PI);
      const sp = r.entre(2, 10);
      const life = r.entre(14, 30);
      this.particulas.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        life,
        max: life,
        col: r.proximo() < 0.35 ? '#fff' : cor,
        size: r.entre(2, 5),
      });
    }
  }

  /** Estrela de impacto. */
  estrela(x: number, y: number, cor: string, grande: boolean): void {
    const vida = grande ? 14 : 10;
    this.impactos.push({ x, y, life: vida, max: vida, col: cor, big: grande, rot: this.rng.entre(0, 6.3) });
  }

  /** Escudo de bloqueio (arco azul no ponto de contato); `dir` é o lado para onde o arco abre. */
  escudo(x: number, y: number, dir: number): void {
    this.impactos.push({ x, y, life: 9, max: 9, blk: true, dir, col: '#9ad8ff', rot: 0 });
  }

  /** Nuvem de fumaça pálida em (x, y): sobe devagar e esmaece (troca de postura). */
  fumaca(x: number, y: number, n: number, cor = 'rgba(210,205,230,.8)'): void {
    const r = this.rng;
    for (let i = 0; i < n; i++) {
      const life = r.entre(22, 38);
      this.particulas.push({
        x: x + r.entre(-26, 26),
        y: y + r.entre(-30, 30),
        vx: r.entre(-1.2, 1.2),
        vy: -r.entre(0.3, 1.4),
        life,
        max: life,
        col: cor,
        size: r.entre(8, 15),
        dust: true,
      });
    }
  }

  textoFlutuante(x: number, y: number, s: string, cor: string, tamanho = 26): void {
    this.textos.push({ x, y, s, col: cor, size: tamanho, life: 50, max: 50 });
  }

  /**
   * Receita visual de um evento da luta (C3): o que o protótipo fazia com sparks/burst/dust/floatText
   * dentro da lógica. Eventos sem efeito visual (swing, jump, ko, round...) são ignorados aqui.
   * `onde` dá a posição dos lutadores para os eventos que não trazem x/y (`carga`, `troca-ficha`); sem ele eles são ignorados.
   */
  reagir(ev: EventoLuta, onde?: PosicaoDoLutador): void {
    const texto = (t: TextoFlutuante | null): void => {
      if (t) this.textoFlutuante(t.x, t.y, t.s, t.col, t.size);
    };
    switch (ev.tipo) {
      case 'dust':
        this.poeira(ev.x, ev.n, ev.power);
        break;
      case 'clash':
        this.faiscas(ev.x, ev.y, '#fff', 22);
        this.estrela(ev.x, ev.y, '#ffffff', true);
        break;
      case 'block':
        this.faiscas(ev.x, ev.y, '#9ad8ff', 8);
        this.escudo(ev.x, ev.y, ev.dir);
        texto(ev.texto);
        break;
      case 'armor':
        this.faiscas(ev.x, ev.y, '#ffffff', 10);
        this.estrela(ev.x, ev.y, '#ffffff', false);
        texto(ev.texto);
        break;
      case 'hit':
        this.faiscas(ev.x, ev.y, ev.cor, 18);
        this.estrela(ev.x, ev.y, ev.cor, ev.grande);
        if (ev.contraEspecial === true) {
          // COUP D'ARRÊT pego na preparação: o rival é interceptado, então a rajada é maior, branca, com um anel frio por trás
          this.faiscas(ev.x, ev.y, '#ffffff', 14);
          this.estrela(ev.x, ev.y, '#ffffff', true);
          this.estrela(ev.x, ev.y, '#7fe3ff', true);
        }
        texto(ev.texto);
        break;
      case 'throw':
        texto(ev.texto);
        break;
      case 'rebote':
        // a CENTELLA tocou a corda: a poeira sobe na parede, no x do quique
        this.poeira(ev.x, 12, 1.4);
        break;
      case 'parry':
        this.faiscas(ev.x, ev.y, '#ffffff', 14);
        this.estrela(ev.x, ev.y, '#ffffff', true);
        texto(ev.texto);
        break;
      case 'quebra-guarda':
        this.faiscas(ev.x, ev.y, '#ff4a3a', 12);
        this.estrela(ev.x, ev.y, '#ff4a3a', true);
        texto(ev.texto);
        break;
      case 'carga': {
        // a cada nível alcançado um pulso de brilho no corpo: mais faíscas e uma estrela maior no nível 3
        const p = onde?.(ev.lutador);
        if (!p) break;
        this.faiscas(p.x, p.y - 100, ev.nivel === 3 ? '#ffffff' : '#ffe27a', 4 + 4 * ev.nivel);
        this.estrela(p.x, p.y - 100, '#ffe27a', ev.nivel === 3);
        break;
      }
      case 'troca-ficha': {
        // flash e fumaça no lutador que trocou de postura
        const p = onde?.(ev.lutador);
        if (!p) break;
        this.faiscas(p.x, p.y - 80, '#ffffff', 16);
        this.estrela(p.x, p.y - 80, ev.ficha === null ? '#ffd27a' : '#9cffc8', false);
        this.fumaca(p.x, p.y - 50, 9);
        break;
      }
      default:
        break;
    }
  }

  /** Um tick de física dos efeitos: move partículas, envelhece impactos e sobe os textos. */
  avancar(): void {
    for (const p of this.particulas) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.dust) {
        p.vy *= 0.93;
        p.vx *= 0.9;
        p.size *= 1.025;
      } else {
        p.vy += 0.3;
        p.vx *= 0.97;
      }
      p.life--;
    }
    this.particulas = this.particulas.filter((p) => p.life > 0);
    for (const b of this.impactos) b.life--;
    this.impactos = this.impactos.filter((b) => b.life > 0);
    for (const t of this.textos) {
      t.life--;
      t.y -= 0.6;
    }
    this.textos = this.textos.filter((t) => t.life > 0);
  }

  /** Poeira (por trás) e depois faíscas (aditivas). */
  desenharParticulas(ctx: Ctx): void {
    for (const p of this.particulas) {
      if (!p.dust) continue;
      ctx.globalAlpha = Math.min(0.55, p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, DOIS_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particulas) {
      if (p.dust) continue;
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.6));
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, DOIS_PI);
      ctx.fill();
    }
    ctx.restore();
  }

  desenharImpactos(ctx: Ctx): void {
    for (const b of this.impactos) {
      if (b.blk) desenharEscudo(ctx, b);
      else desenharEstrela(ctx, b);
    }
  }

  desenharTextos(ctx: Ctx): void {
    for (const t of this.textos) {
      textoArcade(ctx, t.s, t.x, t.y, t.size, t.col, '#000', 'center', 1, Math.min(1, t.life / 18));
    }
  }
}

/** Estrela de impacto (porte de drawBurst). */
export function desenharEstrela(ctx: Ctx, b: Impacto): void {
  const k = b.life / b.max;
  const R = (b.big ? 105 : 66) * (1.25 - k * 0.55);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = b.col;
  ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const a = (i * Math.PI) / 10;
    const r = i % 2 ? R * 0.26 : R * (0.62 + 0.38 * (((i * 37) % 5) / 4));
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
  g.addColorStop(0, '#fff');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = k;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.55, 0, DOIS_PI);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4 * k;
  ctx.globalAlpha = k * 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, R * (1.3 - k * 0.6), 0, DOIS_PI);
  ctx.stroke();
  ctx.restore();
}

/** Escudo de bloqueio: arco azul no ponto de contato (porte de drawBlockFx). */
export function desenharEscudo(ctx: Ctx, b: Impacto): void {
  const k = b.life / b.max;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.dir || 1, 1);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = '#9ad8ff';
  ctx.lineWidth = 7 * k;
  ctx.globalAlpha = k;
  ctx.beginPath();
  ctx.arc(0, 0, 38 * (1.3 - k * 0.5), -1.1, 1.1);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3 * k;
  ctx.beginPath();
  ctx.arc(0, 0, 30 * (1.3 - k * 0.5), -0.9, 0.9);
  ctx.stroke();
  ctx.restore();
}

/** Bola de fogo / magia de cada lutador (porte de drawFireball). */
export function desenharProjetil(ctx: Ctx, pr: ProjetilVisual): void {
  const [mid, core, outer] = pr.cores;
  const t = pr.frame;
  const st = pr.estilo;
  const dir = Math.sign(pr.vx) || pr.dir;
  ctx.save();
  ctx.translate(pr.x, pr.y);
  ctx.scale(pr.sc, pr.sy);
  ctx.globalCompositeOperation = 'lighter';
  const cauda = st === 'wave' ? 20 : st === 'blade' ? 18 : 14;
  for (let i = cauda; i >= 0; i--) {
    const px = -dir * i * (st === 'blade' ? 9 : 10);
    const py = Math.sin(t * 0.5 + i) * 5 * (i / cauda) * (st === 'wave' ? 0.5 : 1);
    const r = (st === 'blade' ? 22 : 34) * (1 - i / (cauda + 3));
    const a = (1 - i / (cauda + 1)) * 0.55;
    const g = ctx.createRadialGradient(px, py, 0, px, py, Math.max(1, r));
    g.addColorStop(0, mid);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, r), 0, DOIS_PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const R = (st === 'blade' ? 38 : 50) + Math.sin(t * 0.7) * 4;
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g2.addColorStop(0, core);
  g2.addColorStop(0.28, core);
  g2.addColorStop(0.55, mid);
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, DOIS_PI);
  ctx.fill();
  ctx.strokeStyle = outer;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  if (st === 'boomerang') {
    ctx.lineWidth = 7;
    ctx.strokeStyle = core;
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < 2; k++) {
      const a0 = t * 0.5 + k * Math.PI;
      ctx.beginPath();
      ctx.arc(0, 0, 34, a0, a0 + 1.9);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = outer;
    ctx.beginPath();
    ctx.arc(0, 0, 42, t * 0.5, t * 0.5 + 2.4);
    ctx.stroke();
  } else if (st === 'blade') {
    ctx.lineWidth = 5;
    ctx.strokeStyle = core;
    ctx.beginPath();
    ctx.moveTo(-dir * 40, 0);
    ctx.lineTo(dir * 36, 0);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = outer;
    ctx.beginPath();
    ctx.arc(0, 0, 24, dir > 0 ? -1.2 : Math.PI - 1.2, dir > 0 ? 1.2 : Math.PI + 1.2);
    ctx.stroke();
  } else if (st === 'wave') {
    ctx.lineWidth = 5;
    ctx.strokeStyle = core;
    ctx.beginPath();
    ctx.moveTo(-dir * 46, 26);
    ctx.quadraticCurveTo(0, -34, dir * 46, 26);
    ctx.stroke();
  } else {
    for (let k = 0; k < 3; k++) {
      const a0 = t * 0.35 + k * 2.1;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + k * 4, a0, a0 + 1.6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- pétalas ----------

export type VarianteDePetalas = 'luta' | 'menu';

/** Parâmetros dos dois campos de pétalas do protótipo (Game: 34 pétalas; UI dos menus: 30). */
const PETALAS: Record<VarianteDePetalas, { n: number; vx: [number, number]; vy: [number, number]; rot: number }> = {
  luta: { n: 34, vx: [0.4, 1.6], vy: [0.5, 1.3], rot: 6.3 },
  menu: { n: 30, vx: [0.4, 1.4], vy: [0.5, 1.2], rot: 6 },
};

/** Pétalas de cerejeira que caem em segundo plano (luta e menus). */
export class CampoDePetalas {
  readonly lista: Petala[];
  private readonly cfg: (typeof PETALAS)[VarianteDePetalas];

  constructor(
    private readonly rng: Rng,
    private readonly variante: VarianteDePetalas = 'menu',
  ) {
    this.cfg = PETALAS[variante];
    this.lista = Array.from({ length: this.cfg.n }, () => this.nova(true));
  }

  private nova(emQualquerLugar: boolean): Petala {
    const r = this.rng;
    const c = this.cfg;
    const luta = this.variante === 'luta';
    return {
      x: luta ? r.entre(-40, LARGURA) : r.entre(0, LARGURA),
      y: emQualquerLugar ? (luta ? r.entre(-20, ALTURA) : r.entre(0, ALTURA)) : r.entre(-60, -10),
      vx: r.entre(c.vx[0], c.vx[1]),
      vy: r.entre(c.vy[0], c.vy[1]),
      rot: r.entre(0, c.rot),
      vr: r.entre(-0.05, 0.05),
      s: r.entre(4, 8),
      ph: r.entre(0, c.rot),
    };
  }

  /** `t` é o contador de ticks da cena (dá o balanço lateral). */
  avancar(t: number): void {
    for (const p of this.lista) {
      p.x += p.vx + Math.sin(t / 40 + p.ph) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > ALTURA + 10 || p.x > LARGURA + 30) {
        if (this.variante === 'luta') Object.assign(p, this.nova(false));
        else {
          p.x = this.rng.entre(-40, LARGURA);
          p.y = this.rng.entre(-60, -10);
        }
      }
    }
  }
}

export function desenharPetalas(ctx: Ctx, lista: readonly Petala[]): void {
  for (const p of lista) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffc2d4';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, DOIS_PI);
    ctx.fill();
    ctx.restore();
  }
}
