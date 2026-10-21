import { criarCanvasPadrao } from '../assets/canvas';
import { ALTURA, LARGURA } from '../core/constantes';
import type { IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';
import { LUTADORES, VITRINE } from '../data/lutadores';
import { desenharVinheta } from '../render/cenario';
import { desenharPose } from '../render/pose';
import type { Ctx } from '../render/tela';
import type { Ferramentas } from './ferramentas';
import type { Mundo } from './contexto';

export const GAME_NAME = 'INNO FIGHTERS';
export const LOGO_Y = 142;
export const LOGO_S = 0.84;
/** Quem aparece no título (e a ordem do ciclo de cenários): a VITRINE, não o elenco inteiro. */
export const STAGE_OF: readonly IdLutador[] = VITRINE;

/** Cenário da casa de cada lutador da vitrine, na ordem da vitrine: é o ciclo de fundos do título. */
export const CICLO_VITRINE: readonly string[] = VITRINE.map((id) => LUTADORES[id].stage);

// ---------- logotipo (desenhado uma vez em canvases próprios, em alta resolução) ----------
type Logo = { art: HTMLCanvasElement; mask: HTMLCanvasElement; tmp: HTMLCanvasElement; w: number; h: number };
let logoCache: Logo | null = null;

/**
 * Paleta A, "Ouro Forjado" (docs/proposta-expansao.md 1.3): INNO é ouro polido, FIGHTERS é o mesmo metal em
 * brasa. Uma família quente só, um contorno interno só, volume em vinho-ferrugem. É a cor da marca do torneio:
 * não pertence a nenhum lutador e não muda quando o elenco crescer.
 */
export const PALETA_MARCA = {
  contornoInterno: '#ffe08a',
  contornoExterno: '#0b0306',
  volumeLonge: '#0a0204',
  volumePerto: '#4a0e0c',
  fioDeLuz: '#fff6dc',
  brilho: [255, 246, 214] as const,
  /** Anel do emblema: dourado -> laranja -> dourado. */
  anel: ['#ffe08a', '#ff8a1e', '#ffe08a'] as const,
  anelInterno: 'rgba(255,240,200,.55)',
  halo: 'rgba(255,150,60,.30)',
  /** Brasas do título e faíscas do impacto do logo: família brasa, sem relação com os lutadores. */
  brasas: ['#ffd27a', '#ff9a3d', '#ff5a12'] as readonly string[],
} as const;

type Palavra = { s: string; y: number; size: number; fill: ReadonlyArray<readonly [number, string]>; edge: string };
const PALAVRAS: readonly Palavra[] = [
  {
    s: 'INNO', y: 150, size: 168, edge: PALETA_MARCA.contornoInterno,
    fill: [[0, '#fffdf2'], [0.4, '#ffe7a3'], [0.5, '#9a5a12'], [0.55, '#ffcf5c'], [0.82, '#ffb83a'], [1, '#fff0c2']],
  },
  {
    s: 'FIGHTERS', y: 262, size: 104, edge: PALETA_MARCA.contornoInterno,
    fill: [[0, '#fff3c4'], [0.42, '#ffbe33'], [0.56, '#ff5a12'], [1, '#b0101c']],
  },
];

function obterLogo(): Logo {
  if (logoCache) return logoCache;
  const S = 2;
  const Wl = 760 * S;
  const Hl = 300 * S;
  const art = criarCanvasPadrao(Wl, Hl);
  const mask = criarCanvasPadrao(Wl, Hl);
  const tmp = criarCanvasPadrao(Wl, Hl);
  const desenhar = (g: CanvasRenderingContext2D, soMascara: boolean): void => {
    g.save();
    g.scale(S, S);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    for (const w of PALAVRAS) {
      g.font = `italic 900 ${w.size}px Impact, "Arial Black", "Segoe UI Black", sans-serif`;
      const x = 380;
      if (soMascara) {
        g.lineWidth = 14;
        g.strokeStyle = '#fff';
        g.strokeText(w.s, x, w.y);
        g.fillStyle = '#fff';
        g.fillText(w.s, x, w.y);
        continue;
      }
      for (let i = 16; i >= 1; i--) {
        g.fillStyle = i > 12 ? PALETA_MARCA.volumeLonge : PALETA_MARCA.volumePerto; // volume 3D
        g.fillText(w.s, x + i * 0.7, w.y + i * 1.1);
      }
      g.lineWidth = 22;
      g.strokeStyle = PALETA_MARCA.contornoExterno;
      g.strokeText(w.s, x, w.y);
      g.lineWidth = 7;
      g.strokeStyle = w.edge;
      g.strokeText(w.s, x, w.y);
      const gr = g.createLinearGradient(0, w.y - w.size * 0.82, 0, w.y + 4);
      w.fill.forEach(([o, c]) => gr.addColorStop(o, c));
      g.fillStyle = gr;
      g.fillText(w.s, x, w.y);
      g.save();
      g.globalAlpha = 0.55;
      g.lineWidth = 2;
      g.strokeStyle = PALETA_MARCA.fioDeLuz;
      g.strokeText(w.s, x - 1, w.y - 2);
      g.restore();
    }
    g.restore();
  };
  try {
    const a = art.getContext('2d');
    const m = mask.getContext('2d');
    if (a) desenhar(a, false);
    if (m) desenhar(m, true);
  } catch {
    /* sem canvas */
  }
  logoCache = { art, mask, tmp, w: 760, h: 300 };
  return logoCache;
}

/** Desenha o logo centralizado em (x, y); `shine` (0..1) é a posição do brilho que atravessa as letras. */
export function desenharLogo(ctx: Ctx, x: number, y: number, sc: number, shine: number, alpha = 1): void {
  const L = obterLogo();
  const w = L.w * sc;
  const h = L.h * sc;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.art, x - w / 2, y - h / 2, w, h);
  if (shine >= 0 && shine <= 1) {
    const g = L.tmp.getContext('2d');
    if (g) {
      const Wt = L.tmp.width;
      const Ht = L.tmp.height;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, Wt, Ht);
      g.drawImage(L.mask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      const cx = -Wt * 0.3 + shine * Wt * 1.6;
      const gr = g.createLinearGradient(cx - 160, 0, cx + 160, Ht * 0.4);
      const [br, bg, bb] = PALETA_MARCA.brilho;
      gr.addColorStop(0, `rgba(${br},${bg},${bb},0)`);
      gr.addColorStop(0.5, `rgba(${br},${bg},${bb},0.85)`);
      gr.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, Wt, Ht);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(L.tmp, x - w / 2, y - h / 2, w, h);
    }
  }
  ctx.restore();
}

/** Segmentos do anel do emblema: constante da marca, não depende de quantos lutadores existem. */
const SEGMENTOS_DO_ANEL = 4;

/** Emblema atrás do logo: anel dourado/laranja da marca (cor única, o mesmo para qualquer elenco). */
export function desenharEmblema(ctx: Ctx, x: number, y: number, r: number, t: number, alpha = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5);
  glow.addColorStop(0, PALETA_MARCA.halo);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  const giro = t / 90;
  // anel principal: degradê cônico dourado -> laranja -> dourado girando devagar
  const cone = ctx.createConicGradient(giro, 0, 0);
  PALETA_MARCA.anel.forEach((c, i) => cone.addColorStop(i / (PALETA_MARCA.anel.length - 1), c));
  ctx.strokeStyle = cone;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const passo = (Math.PI * 2) / SEGMENTOS_DO_ANEL;
  for (let i = 0; i < SEGMENTOS_DO_ANEL; i++) {
    const a0 = giro + i * passo;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0 + 0.12, a0 + passo - 0.12);
    ctx.stroke();
  }
  // arcos internos finos, girando ao contrário
  ctx.strokeStyle = PALETA_MARCA.anelInterno;
  ctx.lineWidth = 2;
  for (let i = 0; i < SEGMENTOS_DO_ANEL; i++) {
    const a0 = -giro * 1.4 + i * 1.57;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, a0, a0 + 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** As duas peças da marca. As cenas chamam por aqui, então um teste pode trocá-las (ex.: medir o resto da tela sem o logo). */
export const marca = { desenharLogo, desenharEmblema };

const imagemDoCenario = (m: Mundo, id: string): CanvasImageSource => m.rec.cenarios.get(id) ?? m.rec.cenarioPadrao;
export const cenarioDoCiclo = imagemDoCenario;

/** Fundo do título: os 4 cenários em sequência, com movimento lento de câmera. Devolve o índice em destaque. */
export function desenharCicloDeCenarios(ctx: Ctx, m: Mundo, t: number): number {
  const per = 420;
  const n = CICLO_VITRINE.length;
  const i = Math.floor(t / per) % n;
  const k = (t % per) / per;
  const nxt = (i + 1) % n;
  const kb = (img: CanvasImageSource, p: number, a: number): void => {
    const z = 1.08 + p * 0.1;
    const ox = Math.sin(p * Math.PI) * 18 - p * 30;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(LARGURA / 2 + ox, ALTURA / 2);
    ctx.scale(z, z);
    ctx.drawImage(img, -LARGURA / 2 - 20, -ALTURA / 2 - 12, LARGURA + 40, ALTURA + 24);
    ctx.restore();
  };
  kb(imagemDoCenario(m, CICLO_VITRINE[i] ?? 'jp'), k, 1);
  if (k > 0.86) kb(imagemDoCenario(m, CICLO_VITRINE[nxt] ?? 'jp'), (k - 0.86) * 0.7, (k - 0.86) / 0.14);
  return k > 0.86 ? ((k - 0.86) / 0.14 > 0.5 ? nxt : i) : i;
}

type Brasa = { x: number; y: number; vy: number; vx: number; s: number; ph: number; /** índice em PALETA_MARCA.brasas */ c: number };

/** Brasas coloridas subindo no título. */
export class Brasas {
  readonly lista: Brasa[];
  constructor(private readonly rng: Rng) {
    this.lista = Array.from({ length: 70 }, () => ({
      x: rng.entre(0, LARGURA), y: rng.entre(0, ALTURA), vy: rng.entre(0.3, 1.2), vx: rng.entre(-0.3, 0.3),
      s: rng.entre(1, 3.2), ph: rng.entre(0, 6.3), c: Math.floor(rng.entre(0, PALETA_MARCA.brasas.length)),
    }));
  }
  desenhar(ctx: Ctx, t: number, a = 1): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.lista) {
      e.y -= e.vy;
      e.x += e.vx + Math.sin(t / 50 + e.ph) * 0.3;
      if (e.y < -10) {
        e.y = ALTURA + 10;
        e.x = this.rng.entre(0, LARGURA);
      }
      const col = PALETA_MARCA.brasas[e.c] ?? PALETA_MARCA.brasas[0] ?? '#ff9a3d';
      ctx.globalAlpha = a * (0.35 + 0.35 * Math.sin(t / 12 + e.ph));
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Escurece em cima/embaixo + vinheta. */
export function gradacaoCinema(ctx: Ctx, m: Mundo): void {
  const g = ctx.createLinearGradient(0, 0, 0, ALTURA);
  g.addColorStop(0, 'rgba(6,2,16,.78)');
  g.addColorStop(0.42, 'rgba(6,2,16,.25)');
  g.addColorStop(0.75, 'rgba(6,2,16,.35)');
  g.addColorStop(1, 'rgba(6,2,16,.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  desenharVinheta(ctx, m.rec.vinheta);
}

/** Quadro da respiração parada do lutador (idle0..3 em vai-e-volta). */
export function quadroIdle(t: number, taxa = 10): string {
  const seq = [0, 1, 2, 3, 2, 1];
  return `idle${seq[Math.floor(t / taxa) % 6]}`;
}

/** Posições x da fileira: metade à esquerda, metade à direita, passo de 192 px a partir das bordas (4 heróis = 104, 296 | 664, 856). */
export function posicoesDaFileira(n: number): number[] {
  const esq = Math.ceil(n / 2);
  const dir = n - esq;
  return Array.from({ length: n }, (_, i) => (i < esq ? 104 + 192 * i : 856 - 192 * (dir - 1 - (i - esq))));
}

/** Os lutadores da vitrine enfileirados no título; `featured` brilha. */
export function fileiraDeHerois(f: Ferramentas, m: Mundo, t: number, featured: IdLutador, alpha = 1): void {
  const { ctx } = f;
  const xs = posicoesDaFileira(VITRINE.length);
  const lado = Math.ceil(VITRINE.length / 2);
  VITRINE.forEach((id, i) => {
    const r = m.elenco[id];
    const on = id === featured;
    const sc = on ? 0.94 : 0.84;
    const fac = i < lado ? 1 : -1;
    const x = xs[i] ?? 0;
    const y = 528;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(x, y - 120, 10, x, y - 120, 170);
    gl.addColorStop(0, r.ch.fire[0] + (on ? '66' : '22'));
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - 170, y - 290, 340, 340);
    ctx.globalCompositeOperation = 'source-over';
    f.floorShadow(x, y, 70 * sc);
    desenharPose(ctx, r.ch, r.arte, quadroIdle(t + i * 13), x, y, sc, fac, on ? 1 : 0.82);
    if (on) desenharPose(ctx, r.ch, r.arte, quadroIdle(t + i * 13), x, y, sc, fac, 0, 0.08 + 0.06 * Math.sin(t / 10));
    ctx.restore();
  });
}
