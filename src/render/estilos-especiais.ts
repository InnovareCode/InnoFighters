import type { Ctx } from './tela';

/*
 * Os 12 estilos procedurais dos brilhos da cinemática do especial (docs/identidade-visual-especiais.md, seção 2): um por lutador
 * (NILA e BAATAR têm dois, um por ficha). Cada estilo é uma função PURA do instante: `(ctx, t, paleta, caixa, semente, variante)`, sem estado
 * entre quadros (o "sorteio" é um hash da semente, então o mesmo quadro sai sempre igual e o teste pode contar as primitivas).
 *
 * Limites (B8 + Apolo): sem `shadowBlur`, sem `filter`, sem `getImageData`; brilho em `lighter`; no máximo 24 primitivas por quadro (aqui o que
 * conta é cada `fill`/`stroke`/`fillRect`: os desenhos do mesmo tipo são agrupados num caminho só, que também é o que custa menos na GPU).
 */

export type Paleta = { readonly nucleo: string; readonly brilho: string; readonly sombra: string };

/** Área em que o estilo age, em coordenadas locais da faixa (a pose fica à esquerda, o nome à direita). */
export type Caixa = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type EstiloId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10' | 'E11' | 'E12';

export interface ArgsEstilo {
  readonly ctx: Ctx;
  /** Ticks desde o começo da cinemática. Os brilhos vivem de 8 a 38 (COMPLETA). */
  readonly t: number;
  /** Envelope 0..1 (sobe depois do tick 8, desce depois do 34): vira o alfa de tudo. */
  readonly vida: number;
  readonly p: Paleta;
  readonly c: Caixa;
  readonly sem: number;
  readonly variante: string;
  /** 1 = COMPLETA; 0,5 = a rajada única da CURTA (metade das primitivas, no máximo 12). */
  readonly escala: number;
  /** Ritmo PESADO: velocidades x0,6 e tamanhos x1,3. */
  readonly pesado: boolean;
}

const PI2 = Math.PI * 2;

/** Número pseudoaleatório em [0, 1) que só depende de (semente, índice). */
export function az(sem: number, k: number): number {
  let h = (sem ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const entre = (sem: number, k: number, a: number, b: number): number => lerp(a, b, az(sem, k));
const trava = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);

function hex(c: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  const n = m ? parseInt(m[1] as string, 16) : 0xffffff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura duas cores #rrggbb (k = 0 dá `a`, k = 1 dá `b`). */
export function mistura(a: string, b: string, k: number): string {
  const x = hex(a);
  const y = hex(b);
  const f = (i: 0 | 1 | 2): string => Math.round(lerp(x[i], y[i], k)).toString(16).padStart(2, '0');
  return `#${f(0)}${f(1)}${f(2)}`;
}

/** Luminância relativa (WCAG 2.x) de uma cor #rrggbb. */
export function luminancia(c: string): number {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste (WCAG 2.x) entre duas cores #rrggbb. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Pontos de uma polilinha por deslocamento do ponto médio (`niveis` níveis; o desvio cai x0,55 a cada nível). */
function polilinha(sem: number, k0: number, x0: number, y0: number, x1: number, y1: number, desvio: number, niveis = 3): number[] {
  let pts = [x0, y0, x1, y1];
  let d = desvio;
  let k = k0;
  for (let n = 0; n < niveis; n++) {
    const novo: number[] = [pts[0] as number, pts[1] as number];
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i] as number;
      const ay = pts[i + 1] as number;
      const bx = pts[i + 2] as number;
      const by = pts[i + 3] as number;
      const comp = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / comp;
      const ny = (bx - ax) / comp;
      const o = (az(sem, k++) - 0.5) * 2 * d;
      novo.push((ax + bx) / 2 + nx * o, (ay + by) / 2 + ny * o, bx, by);
    }
    pts = novo;
    d *= 0.55;
  }
  return pts;
}

function tracar(ctx: Ctx, pts: number[]): void {
  ctx.moveTo(pts[0] as number, pts[1] as number);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] as number, pts[i + 1] as number);
}

/** Entra no modo aditivo com o alfa do envelope. Quem chama devolve com `ctx.restore()`. */
function aditivo(a: ArgsEstilo, alfa = 1): Ctx {
  const { ctx } = a;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = trava(a.vida * alfa);
  return ctx;
}

/** Progresso da travessia da faixa (tick 8 -> 38), em 0..1; o PESADO anda mais devagar. */
const progresso = (a: ArgsEstilo): number => trava(((a.t - 8) / 30) * (a.pesado ? 0.85 : 1));
const tam = (a: ArgsEstilo, v: number): number => v * (a.pesado ? 1.3 : 1);
const qtd = (a: ArgsEstilo, n: number): number => Math.max(1, Math.round(n * a.escala));

/** Raios (polilinhas) agrupados: halo largo + núcleo fino, 2 traçados no total. `pisca`: o raio é sorteado de novo a cada 2 ticks. */
function raios(a: ArgsEstilo, lista: ReadonlyArray<{ x0: number; y0: number; x1: number; y1: number; galhos?: number; desvio?: number }>, larg = 1): void {
  const ctx = aditivo(a);
  const sem = a.sem + Math.floor(a.t / 2) * 7919;
  ctx.beginPath();
  lista.forEach((r, i) => {
    const pts = polilinha(sem, i * 40, r.x0, r.y0, r.x1, r.y1, r.desvio ?? Math.hypot(r.x1 - r.x0, r.y1 - r.y0) * 0.18);
    tracar(ctx, pts);
    for (let g = 0; g < (r.galhos ?? 0); g++) {
      const v = Math.floor(entre(sem, i * 40 + 30 + g, 2, pts.length / 2 - 2)) * 2;
      const vx = pts[v] as number;
      const vy = pts[v + 1] as number;
      const comp = Math.hypot(r.x1 - r.x0, r.y1 - r.y0) * entre(sem, i * 40 + 33 + g, 0.4, 0.6);
      const ang = Math.atan2(r.y1 - r.y0, r.x1 - r.x0) + (g % 2 ? 1 : -1) * entre(sem, i * 40 + 36 + g, 0.3, 0.6);
      tracar(ctx, polilinha(sem, i * 40 + 20 + g * 3, vx, vy, vx + Math.cos(ang) * comp, vy + Math.sin(ang) * comp, comp * 0.15, 2));
    }
  });
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7 * larg;
  ctx.strokeStyle = a.p.brilho;
  ctx.globalAlpha *= 0.35;
  ctx.stroke();
  ctx.globalAlpha = trava(a.vida);
  ctx.lineWidth = 2 * larg;
  ctx.strokeStyle = a.p.nucleo;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- E1 RAIO (HAYATO)
function estiloRaio(a: ArgsEstilo): void {
  const { c } = a;
  const u = progresso(a);
  const cy = c.y + c.h / 2;
  if (a.variante === 'coluna') {
    const x = c.x + c.w * 0.45;
    raios(
      a,
      [
        { x0: x, y0: -4, x1: x + 10, y1: c.h + 4, galhos: 3, desvio: 22 },
        { x0: x - 130, y0: 0, x1: x - 110, y1: c.h, desvio: 12 },
        { x0: x + 140, y0: 0, x1: x + 160, y1: c.h, desvio: 12 },
      ],
      1.6,
    );
  } else if (a.variante === 'rastro') {
    const xf = c.x + c.w * (0.1 + 0.8 * u);
    raios(
      a,
      Array.from({ length: qtd(a, 6) }, (_, i) => {
        const y = c.y + 14 + (i * (c.h - 28)) / 5;
        const len = entre(a.sem, i, 120, 180);
        return { x0: xf - len, y0: y, x1: xf, y1: y + entre(a.sem, i + 9, -6, 6), desvio: 8 };
      }),
    );
  } else {
    // esfera: núcleo de 40 px que atravessa a faixa com raios curtos girando em volta
    const x = c.x + c.w * (0.08 + 0.84 * u);
    const n = qtd(a, 4);
    const lista = Array.from({ length: n }, (_, i) => {
      const ang = a.t * 0.3 + (i * PI2) / n;
      const r = entre(a.sem, i, 50, 90);
      return { x0: x, y0: cy, x1: x + Math.cos(ang) * r, y1: cy + Math.sin(ang) * r, galhos: 1, desvio: 10 };
    });
    raios(a, lista);
    const ctx = aditivo(a, 0.8);
    ctx.fillStyle = a.p.brilho;
    ctx.beginPath();
    ctx.arc(x, cy, 20, 0, PI2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- E2 ESCAMA DE DRAGÃO (WEI LONG)
function estiloDragao(a: ArgsEstilo): void {
  const { c, p } = a;
  const u = progresso(a);
  const terra = a.variante === 'terra';
  const couraca = a.variante === 'couraça';
  const ctx = aditivo(a, 0.9);
  if (terra) {
    ctx.beginPath();
    ctx.rect(c.x - 40, 0, c.w + 80, c.h - 8); // só o dorso: tudo abaixo da linha fica cortado
    ctx.clip();
  }
  if (couraca) {
    // 9 escamas grandes em leque de 120° num ponto (o ombro)
    const ox = c.x + 30 + u * 40;
    const oy = c.y + c.h / 2;
    const n = qtd(a, 9);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 3 + (i * (2 * Math.PI / 3)) / Math.max(1, n - 1);
      const d = 40 + u * 120 * (0.6 + 0.4 * az(a.sem, i));
      ctx.moveTo(ox + Math.cos(ang) * d + tam(a, 26), oy + Math.sin(ang) * d);
      ctx.arc(ox + Math.cos(ang) * d, oy + Math.sin(ang) * d, tam(a, 26), 0, PI2);
    }
    ctx.fillStyle = p.brilho;
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 3 + (i * (2 * Math.PI / 3)) / Math.max(1, n - 1);
      const d = 40 + u * 120 * (0.6 + 0.4 * az(a.sem, i));
      ctx.moveTo(ox + Math.cos(ang) * d + 16, oy + Math.sin(ang) * d);
      ctx.arc(ox + Math.cos(ang) * d, oy + Math.sin(ang) * d, 16, 0, PI2);
    }
    ctx.fillStyle = p.nucleo;
    ctx.globalAlpha *= 0.7;
    ctx.fill();
    ctx.restore();
    return;
  }
  const n = qtd(a, 20);
  const amp = terra ? 8 : entre(a.sem, 1, 18, 30);
  const hx = c.x + c.w * (0.05 + 0.9 * u);
  const baseY = terra ? c.h - 14 : c.y + c.h / 2;
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const s = i * 12;
    pts.push([hx - s, baseY + amp * Math.sin(0.035 * s - 0.18 * a.t), lerp(22, 4, i / Math.max(1, n - 1)) * (terra ? 1.1 : 1)]);
  }
  ctx.beginPath();
  for (const [x, y, r] of pts) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, PI2);
  }
  ctx.fillStyle = p.brilho;
  ctx.fill();
  ctx.beginPath();
  for (const [x, y, r] of pts) {
    ctx.moveTo(x + r * 0.55, y);
    ctx.arc(x, y, r * 0.55, 0, PI2);
  }
  ctx.fillStyle = p.nucleo;
  ctx.globalAlpha *= 0.75;
  ctx.fill();
  // escamas: um arco de 160° voltado para trás em cada círculo (um só traçado)
  ctx.globalAlpha = trava(a.vida);
  ctx.beginPath();
  for (const [x, y, r] of pts) {
    ctx.moveTo(x - r * Math.cos(1.4), y + r * Math.sin(1.4));
    ctx.arc(x, y, r, Math.PI - 1.4, Math.PI + 1.4);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.sombra;
  ctx.stroke();
  if (!terra) {
    // cabeça (círculo de 28 px) e bigodes ondulando em fase oposta
    const [hx0, hy0] = pts[0] as [number, number, number];
    ctx.beginPath();
    ctx.arc(hx0 + 14, hy0, 14 * (a.pesado ? 1.3 : 1), 0, PI2);
    ctx.fillStyle = p.nucleo;
    ctx.fill();
    ctx.beginPath();
    for (const lado of [-1, 1]) {
      const o = Math.sin(0.18 * a.t * 2) * 10 * lado;
      ctx.moveTo(hx0 + 22, hy0 + lado * 4);
      ctx.quadraticCurveTo(hx0 + 44, hy0 + lado * 16 + o, hx0 + 62, hy0 + lado * 8 - o);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.brilho;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- E3 LÂMINA CRESCENTE e MUGUNGHWA (MIN-JI)
/** Caminho de um crescente de raio r com a ponta aberta para trás do voo (rotacionado por `rot`). */
function crescente(ctx: Ctx, x: number, y: number, r: number, rot: number): void {
  const phi = (110 * Math.PI) / 180;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.moveTo(r * Math.cos(-phi), r * Math.sin(-phi));
  ctx.arc(0, 0, r, -phi, phi);
  ctx.quadraticCurveTo(r * (1.6 + 0.342), 0, r * Math.cos(-phi), r * Math.sin(-phi));
  ctx.restore();
}

/** Caminho de flores de mugunghwa: 5 pétalas (elipses de 7x3,5 px) e miolo; devolve os centros para o miolo. */
function flores(ctx: Ctx, lista: ReadonlyArray<{ x: number; y: number; rot: number; s: number }>): void {
  for (const f of lista) {
    for (let k = 0; k < 5; k++) {
      const ang = f.rot + (k * PI2) / 5;
      ctx.moveTo(f.x + Math.cos(ang) * 6 * f.s + 7 * f.s, f.y + Math.sin(ang) * 6 * f.s);
      ctx.ellipse(f.x + Math.cos(ang) * 6 * f.s, f.y + Math.sin(ang) * 6 * f.s, 7 * f.s, 3.5 * f.s, ang, 0, PI2);
    }
  }
}

function estiloCrescente(a: ArgsEstilo): void {
  const { c, p } = a;
  const u = progresso(a);
  const cy = c.y + c.h / 2;
  const lamina: Array<{ x: number; y: number; r: number; rot: number }> = [];
  if (a.variante === 'gigante') {
    lamina.push({ x: c.x + c.w * (0.05 + 0.9 * u), y: cy, r: tam(a, 90) * 0.7, rot: 0 });
  } else if (a.variante === 'redemoinho') {
    // 3 anéis de 3 crescentes subindo em espiral a 0,5 rad/tick
    const aneis = qtd(a, 3);
    for (let ia = 0; ia < aneis; ia++) {
      for (let k = 0; k < 3; k++) {
        const ang = a.t * 0.5 + (k * PI2) / 3 + ia * 0.9;
        const raio = 40 + ia * 22;
        lamina.push({ x: c.x + c.w * 0.45 + Math.cos(ang) * raio * 1.6, y: cy + Math.sin(ang) * raio * 0.45 - ia * 6, r: 18 + ia * 3, rot: ang + Math.PI / 2 });
      }
    }
  } else {
    // par: dois crescentes cruzam a faixa nos ticks 8 e 18 (os dois disparos)
    for (let k = 0; k < 2; k++) {
      const uk = trava((a.t - 8 - k * 10) / 24);
      if (uk <= 0) continue;
      lamina.push({ x: c.x + c.w * (0.04 + 0.92 * uk), y: cy + (k ? 14 : -14), r: 34, rot: a.t * 0.35 });
    }
  }
  const ctx = aditivo(a);
  ctx.beginPath();
  for (const l of lamina) crescente(ctx, l.x, l.y, l.r, l.rot);
  ctx.fillStyle = p.brilho;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.nucleo;
  ctx.stroke();
  // flores no rastro, caindo devagar
  const nf = qtd(a, 10);
  const lista = Array.from({ length: nf }, (_, i) => {
    const nasc = 8 + i * 2.2;
    const idade = a.t - nasc;
    return { x: c.x + c.w * (0.05 + 0.85 * trava((nasc - 8) / 30)) - 10, y: cy + (az(a.sem, i) - 0.5) * 70 + idade * 0.9, rot: idade * 0.05, s: 1 + az(a.sem, i + 50) * 0.4, vive: idade > 0 && idade < 34 };
  }).filter((f) => f.vive);
  ctx.beginPath();
  flores(ctx, lista);
  ctx.fillStyle = p.nucleo;
  ctx.globalAlpha *= 0.85;
  ctx.fill();
  ctx.beginPath();
  for (const f of lista) {
    ctx.moveTo(f.x + 2.5, f.y);
    ctx.arc(f.x, f.y, 2.5, 0, PI2);
  }
  ctx.fillStyle = p.sombra;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- E4 ARCO DE GINGA (CAIO)
function estiloArco(a: ArgsEstilo): void {
  const { c, p } = a;
  const cx = c.x + c.w * 0.5;
  const cy = c.y + c.h / 2;
  const rx = tam(a, 105);
  const varre = (centro: number, sentido: 1 | -1, vertical = false, achatado = 1, total = (220 * Math.PI) / 180): void => {
    const ctx = a.ctx;
    const prog = trava((a.t - 8) / 14);
    const cabeca = centro + sentido * total * prog;
    const passos = 12;
    const faixas: number[][] = [[], [], [], []];
    for (let i = 0; i < passos; i++) {
      const b = Math.floor((i * 4) / passos);
      (faixas[b] as number[]).push(i);
    }
    for (let fi = 0; fi < 4; fi++) {
      const idx = faixas[fi] as number[];
      if (idx.length === 0) continue;
      ctx.beginPath();
      for (const i of idx) {
        const a0 = cabeca - sentido * (i / passos) * total * 0.7;
        const a1 = cabeca - sentido * ((i + 1) / passos) * total * 0.7;
        const pt = (ang: number): [number, number] => (vertical ? [cx + Math.sin(ang) * rx * 0.35, cy - Math.cos(ang) * rx * 0.55] : [cx + Math.cos(ang) * rx, cy + Math.sin(ang) * rx * 0.55 * achatado]);
        const [x0, y0] = pt(a0);
        const [x1, y1] = pt(a1);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      ctx.lineWidth = lerp(14, 2, (fi + 0.5) / 4);
      ctx.strokeStyle = p.brilho;
      ctx.globalAlpha = trava(a.vida * lerp(0.55, 0.15, (fi + 0.5) / 4));
      ctx.stroke();
    }
  };
  const ctx = aditivo(a);
  ctx.lineCap = 'round';
  if (a.variante === 'rasteiro') varre(Math.PI, 1, false, 0.3 / 0.55, (300 * Math.PI) / 180);
  else if (a.variante === 'descendente') varre(0, 1, true, 1, Math.PI);
  else {
    varre(Math.PI, 1);
    if (a.variante === 'vaivem' && a.escala >= 1) varre(0, -1);
  }
  // batidas do berimbau: anéis finos no compasso longo, curto, curto (ticks 0, 12 e 18 depois de 8)
  ctx.globalAlpha = trava(a.vida);
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.nucleo;
  for (const [i, t0] of [8, 20, 26].entries()) {
    const idade = a.t - t0;
    if (idade < 0 || idade > 16 || i >= qtd(a, 3)) continue;
    ctx.globalAlpha = trava(a.vida * (1 - idade / 16));
    ctx.beginPath();
    ctx.arc(cx, cy, 10 + idade * 3, 0, PI2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- E5 CORDA TRANÇADA e ÍNDIGO (AMINU)
function estiloCorda(a: ArgsEstilo): void {
  const { c, p } = a;
  const u = progresso(a);
  const cy = c.y + c.h / 2;
  const ctx = aditivo(a);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const amp = entre(a.sem, 2, 5, 8);
  const corda = (x0: number, x1: number, y: number, ampl: number, fase: number): void => {
    const por = 10; // pontos por meio período
    const k = 0.25;
    const passo = Math.PI / k / por;
    // meio período: uma das fitas passa por cima. As de baixo (sombra) e as de cima (brilho) vão cada uma num traçado só
    const baixo: Array<[number, number][]> = [];
    const cima: Array<[number, number][]> = [];
    for (let x = x0, seg = 0; x < x1; seg++) {
      const trecho: [number, number][] = [];
      const trechoB: [number, number][] = [];
      for (let i = 0; i <= por && x + i * passo <= x1 + passo; i++) {
        const xx = x + i * passo;
        trecho.push([xx, y + ampl * Math.sin(k * xx + fase)]);
        trechoB.push([xx, y - ampl * Math.sin(k * xx + fase)]);
      }
      (seg % 2 ? baixo : cima).push(trecho);
      (seg % 2 ? cima : baixo).push(trechoB);
      x += por * passo;
    }
    for (const [lista, cor] of [[baixo, p.sombra], [cima, p.brilho]] as const) {
      ctx.beginPath();
      for (const tr of lista) {
        ctx.moveTo((tr[0] as [number, number])[0], (tr[0] as [number, number])[1]);
        for (const [xx, yy] of tr) ctx.lineTo(xx, yy);
      }
      ctx.strokeStyle = cor;
      ctx.stroke();
    }
  };
  const fase = -a.t * 0.4;
  if (a.variante === 'varal') {
    // 3 fios com tiras de tecido índigo ondulando para trás
    const xf = c.x + c.w * (0.1 + 0.8 * u);
    ctx.beginPath();
    for (let f = 0; f < 3; f++) {
      const y = c.y + 26 + f * 38;
      ctx.moveTo(xf - 330, y);
      ctx.lineTo(xf, y);
      const tiras = qtd(a, 5);
      for (let i = 0; i < tiras; i++) {
        const x = xf - 40 - i * 62;
        const sk = Math.sin(a.t * 0.3 + i + f) * 0.3;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10 + sk * 36, y + 36);
        ctx.lineTo(x - 22 + sk * 36, y + 36);
        ctx.lineTo(x - 12, y);
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.brilho;
    ctx.stroke();
    ctx.fillStyle = p.sombra;
    ctx.globalAlpha *= 0.9;
    ctx.fill();
  } else if (a.variante === 'escudo') {
    // a corda fecha num anel de r 50 em volta da palma
    const x = c.x + 80;
    const fim = -Math.PI / 2 + PI2 * trava((a.t - 8) / 14);
    ctx.beginPath();
    ctx.arc(x, cy, tam(a, 50), -Math.PI / 2, fim);
    ctx.strokeStyle = p.brilho;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, cy, tam(a, 50) - 5, -Math.PI / 2 + 0.4, fim + 0.4);
    ctx.strokeStyle = p.sombra;
    ctx.stroke();
  } else if (a.variante === 'punho') {
    // a corda enrola em espiral no antebraço (perto da pose) e solta o fio para o nome
    const x0 = c.x + 10;
    corda(x0, x0 + 90 + u * 200, cy, amp * 1.4, fase);
  } else {
    corda(c.x + c.w * 0.1, c.x + c.w * (0.2 + 0.7 * u), cy, amp, fase);
  }
  // respingos de índigo (gotas com cauda) caindo com gravidade 0,35
  const gotas = qtd(a, 12);
  ctx.beginPath();
  for (let i = 0; i < gotas; i++) {
    const nasc = 8 + (i * 24) / gotas;
    const idade = a.t - nasc;
    if (idade < 0 || idade > 26) continue;
    const x = c.x + c.w * (0.15 + 0.75 * az(a.sem, i)) + idade * entre(a.sem, i + 20, -2, 3);
    const y = cy + idade * -2.2 + 0.35 * idade * idade * 0.5;
    const r = entre(a.sem, i + 40, 2, 4);
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, PI2);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x - 2, y - r - 8);
    ctx.lineTo(x + 2, y - r);
  }
  ctx.fillStyle = p.sombra === p.brilho ? p.nucleo : mistura(p.sombra, p.brilho, 0.35);
  ctx.globalAlpha = trava(a.vida);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- E6 ESTRELA DE LUCHA e CORDAS (CENTELLA)
function estrela4(ctx: Ctx, x: number, y: number, R: number, rot: number): void {
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i * Math.PI) / 4;
    const r = i % 2 ? R * 0.3 : R;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

const PRATA = '#dfe6ee';

function estiloEstrela(a: ArgsEstilo): void {
  const { c, p } = a;
  const u = progresso(a);
  const cy = c.y + c.h / 2;
  const ctx = aditivo(a);
  const lista: Array<{ x: number; y: number; R: number; rot: number; prata: boolean }> = [];
  if (a.variante === 'cordas') {
    // 3 cordas do ringue vibrando: y = A0·e^(−t/12)·sin(0,9·t)·sin(π·x/L); esticam na 1ª metade e soltam na 2ª
    const L = c.w;
    const solta = a.t - 23;
    const A0 = solta > 0 ? 10 + 12 * u : 0;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = p.brilho;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const y0 = c.y + 28 + k * 38;
      const esticada = solta > 0 ? 0 : 6 * Math.sin(Math.PI * trava((a.t - 8) / 15));
      ctx.moveTo(c.x, y0);
      for (let i = 1; i <= 20; i++) {
        const x = (i / 20) * L;
        const dy = solta > 0 ? A0 * Math.exp(-solta / 12) * Math.sin(0.9 * solta) * Math.sin((Math.PI * x) / L) : esticada * Math.sin((Math.PI * x) / L);
        ctx.lineTo(c.x + x, y0 + dy);
      }
    }
    ctx.stroke();
    for (let i = 0; i < qtd(a, 8); i++) lista.push({ x: c.x + c.w * az(a.sem, i), y: c.y + 10 + az(a.sem, i + 9) * (c.h - 20), R: entre(a.sem, i + 30, 6, 14), rot: a.t * 0.2, prata: i % 3 === 0 });
  } else if (a.variante === 'orbita') {
    const n = qtd(a, 8);
    const ox = c.x + c.w * 0.3;
    for (let i = 0; i < n; i++) {
      const ang = a.t * 0.3 + (i * PI2) / n;
      lista.push({ x: ox + Math.cos(ang) * 70, y: cy + Math.sin(ang) * 48, R: 12, rot: a.t * 0.2 + i, prata: i % 3 === 0 });
    }
  } else {
    // chuva: estrelas caem de cima a 3–5 px/tick sob um cone de holofote branco a 12%
    ctx.globalAlpha = trava(a.vida * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c.x + c.w * 0.35, 0);
    ctx.lineTo(c.x + c.w * 0.65, 0);
    ctx.lineTo(c.x + c.w * 0.9, c.h);
    ctx.lineTo(c.x + c.w * 0.1, c.h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = trava(a.vida);
    const n = qtd(a, 16);
    for (let i = 0; i < n; i++) {
      const nasc = 8 + (i * 18) / n;
      const idade = a.t - nasc;
      if (idade < 0) continue;
      const vida = trava(idade / 4) * trava((24 - idade) / 6);
      lista.push({ x: c.x + c.w * (0.08 + 0.84 * az(a.sem, i)), y: -10 + idade * entre(a.sem, i + 5, 3, 5), R: entre(a.sem, i + 30, 6, 18) * vida, rot: idade * 0.2, prata: i % 3 === 0 });
    }
  }
  for (const prata of [false, true]) {
    ctx.beginPath();
    for (const e of lista) {
      if (e.prata !== prata || e.R < 1) continue;
      estrela4(ctx, e.x, e.y, e.R, e.rot);
    }
    ctx.fillStyle = prata ? PRATA : p.brilho;
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- E7 FIO DE FLORETE (CAMILLE)
function estiloFio(a: ArgsEstilo): void {
  const { c, p } = a;
  const cy = c.y + c.h / 2;
  type Fio = { x0: number; y0: number; x1: number; y1: number };
  let fios: Fio[] = [];
  let arco = false;
  const comp = (n: number): number => entre(a.sem, n, 140, 420) * (a.escala < 1 ? 0.6 : 1);
  if (a.variante === 'guarda') fios = [{ x0: c.x + 150, y0: -6, x1: c.x + 150, y1: c.h + 6 }];
  else if (a.variante === 'estocada') fios = [{ x0: c.x + 40, y0: c.h - 14, x1: c.x + 40 + comp(1), y1: c.h - 14 }];
  else if (a.variante === 'x') {
    const x = c.x + c.w * 0.4;
    const mx = 70;
    fios = [{ x0: x - mx, y0: 0, x1: x + mx, y1: c.h }, { x0: x - mx, y0: c.h, x1: x + mx, y1: 0 }];
  } else if (a.variante === 'arco') arco = true;
  else fios = Array.from({ length: qtd(a, 3) }, (_, i) => ({ x0: c.x + 20, y0: 20 + i * 46, x1: c.x + 20 + comp(i), y1: 20 + i * 46 + entre(a.sem, i + 3, -12, 12) }));
  const ctx = aditivo(a);
  ctx.lineCap = 'round';
  ctx.beginPath();
  let pontaX = c.x;
  let pontaY = cy;
  if (arco) {
    // fio curvo de 180° (r 60) que contorna a pose
    const x = c.x + 60;
    ctx.arc(x, cy, 60, -Math.PI / 2, -Math.PI / 2 + Math.PI * trava((a.t - 8) / 12));
    pontaX = x + 60 * Math.cos(-Math.PI / 2 + Math.PI * trava((a.t - 8) / 12));
    pontaY = cy + 60 * Math.sin(-Math.PI / 2 + Math.PI * trava((a.t - 8) / 12));
  } else {
    for (const f of fios) {
      const k = trava((a.t - 8) / 8);
      ctx.moveTo(f.x0, f.y0);
      ctx.lineTo(lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k));
    }
    const f0 = fios[0] as Fio;
    pontaX = lerp(f0.x0, f0.x1, trava((a.t - 8) / 8));
    pontaY = lerp(f0.y0, f0.y1, trava((a.t - 8) / 8));
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = mistura(p.sombra, p.brilho, 0.6);
  ctx.stroke();
  // reflexo de 30 px que corre pela linha a 40 px/tick (segmento mais claro e grosso)
  if (!arco) {
    ctx.beginPath();
    for (const f of fios) {
      const len = Math.hypot(f.x1 - f.x0, f.y1 - f.y0) || 1;
      const s = ((a.t * 40) % (len + 60)) - 30;
      const k0 = trava(s / len);
      const k1 = trava((s + 30) / len);
      ctx.moveTo(lerp(f.x0, f.x1, k0), lerp(f.y0, f.y1, k0));
      ctx.lineTo(lerp(f.x0, f.x1, k1), lerp(f.y0, f.y1, k1));
    }
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = p.nucleo;
    ctx.stroke();
  }
  // touche: ponto de luz de r 3 com 4 raios finos de 24 px em cruz, girando 45° em 6 ticks
  const giro = (Math.PI / 4) * trava((a.t - 8) / 6);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const ang = giro + (i * Math.PI) / 2;
    ctx.moveTo(pontaX, pontaY);
    ctx.lineTo(pontaX + Math.cos(ang) * 24, pontaY + Math.sin(ang) * 24);
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = p.nucleo;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pontaX, pontaY, 3, 0, PI2);
  ctx.fillStyle = p.nucleo;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- E8 CHAMA DE LAMPARINA (NILA, GAJA)
function chama(ctx: Ctx, x: number, y: number, h: number, osc: number, p: Paleta): void {
  const w = h * 0.45;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - w, y, x - w * 0.9, y - h * 0.5, x + osc, y - h);
  ctx.bezierCurveTo(x + w * 0.9, y - h * 0.5, x + w, y, x, y);
  const g = ctx.createLinearGradient(0, y, 0, y - h);
  g.addColorStop(0, p.nucleo);
  g.addColorStop(0.5, p.brilho);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fill();
}

function estiloChama(a: ArgsEstilo): void {
  const { c, p } = a;
  const u = progresso(a);
  const cy = c.y + c.h / 2;
  const ctx = aditivo(a);
  const posicoes: Array<[number, number, number]> = [];
  if (a.variante === 'pavio') posicoes.push([c.x + 70, cy + 18, 22]);
  else if (a.variante === 'palmas') {
    // duas fileiras de 4 à frente das mãos, avançando passo a passo
    const x0 = c.x + 40 + u * 200;
    for (let f = 0; f < 2; f++) for (let i = 0; i < qtd(a, 4); i++) posicoes.push([x0 + i * 34, cy + 20 + f * 26, tam(a, entre(a.sem, i + f * 5, 16, 26))]);
  } else {
    const n = qtd(a, 8);
    for (let i = 0; i < n; i++) {
      const ang = (i * PI2) / n + a.t * 0.04;
      posicoes.push([c.x + 90 + Math.cos(ang) * 40, cy + 14 + Math.sin(ang) * 34, entre(a.sem, i, 14, 26)]);
    }
  }
  posicoes.forEach(([x, y, h], i) => {
    const subida = (a.t - 8) * 0.4;
    chama(ctx, x, y - subida, h * Math.max(0.2, 1 - 0.01 * (a.t - 8)), Math.sin(0.3 * a.t + i) * 2, p);
  });
  if (a.variante === 'palmas') {
    // a cada passo, um anel achatado no chão
    for (const t0 of [10, 20, 30]) {
      const idade = a.t - t0;
      if (idade < 0 || idade > 12) continue;
      ctx.globalAlpha = trava(a.vida * (1 - idade / 12));
      ctx.beginPath();
      ctx.ellipse(c.x + 60 + (t0 - 8) * 8, c.h - 10, 10 + idade * 5, 3 + idade, 0, 0, PI2);
      ctx.strokeStyle = p.brilho;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- E9 ESPIRAL DE SERPENTE (NILA, SARPA)
function estiloEspiral(a: ArgsEstilo): void {
  const { c, p } = a;
  const u = progresso(a);
  const ctx = aditivo(a);
  const parafuso = a.variante === 'parafuso';
  const comprimento = parafuso ? 150 : lerp(160, 300, u);
  const raio = parafuso ? 26 : a.variante === 'rasteira' ? 6 + 10 * u : 14;
  const n = 48;
  const frente: number[][] = [];
  const tras: number[][] = [];
  const escamas: number[] = [];
  const x0 = parafuso ? c.x + 70 : c.x + c.w * (0.08 + 0.4 * u);
  const y0 = parafuso ? c.h - 6 - 8 * Math.max(0, a.t - 8) * 0.3 : a.variante === 'rasteira' ? c.h - 14 : c.y + c.h / 2;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * comprimento;
    const th = 0.35 * s * (parafuso ? 0.55 : 1) - 0.25 * a.t * (parafuso ? 2 : 1);
    const ax = parafuso ? 0 : s;
    const ay = parafuso ? -s * 0.8 : 0;
    const px = x0 + ax + (parafuso ? Math.sin(th) * raio : 0);
    const py = y0 + ay + (parafuso ? 0 : Math.sin(th) * raio);
    const grossa = Math.cos(th) >= 0;
    (grossa ? frente : tras).push([px, py, 1 + 3 * (Math.cos(th) + 1) / 2]);
    if (i % 3 === 0) escamas.push(px, py);
  }
  for (const [lista, cor, larg] of [[tras, p.sombra, 2], [frente, p.brilho, 4]] as const) {
    ctx.beginPath();
    for (const pt of lista) {
      ctx.moveTo(pt[0] as number, pt[1] as number);
      ctx.lineTo((pt[0] as number) + (parafuso ? 0 : 3), (pt[1] as number) + (parafuso ? 3 : 0));
    }
    ctx.lineWidth = larg + 1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = cor;
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < escamas.length; i += 2) {
    ctx.moveTo((escamas[i] as number) + 1.5, escamas[i + 1] as number);
    ctx.arc(escamas[i] as number, escamas[i + 1] as number, 1.5, 0, PI2);
  }
  ctx.fillStyle = p.nucleo;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- E10 VENTO DA ESTEPE (BAATAR, fase 1)
function estiloVento(a: ArgsEstilo): void {
  const { c, p } = a;
  const ctx = aditivo(a);
  const n = qtd(a, 20);
  const baldes: number[][] = [[], [], []];
  const cx = c.x + c.w * 0.35;
  const cy = c.y + c.h / 2;
  const vel = a.pesado ? 10 : 14;
  for (let i = 0; i < n; i++) (baldes[i % 3] as number[]).push(i);
  baldes.forEach((idx, b) => {
    ctx.beginPath();
    for (const i of idx) {
      const comp = entre(a.sem, i, 60, 200);
      let x: number;
      let y: number;
      if (a.variante === 'redemoinho') {
        const ang = a.t * 0.2 + (i * PI2) / n;
        const r = entre(a.sem, i + 20, 50, 120);
        x = cx + Math.cos(ang) * r * 1.8;
        y = cy + Math.sin(ang) * r * 0.5;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(ang + 1.2) * 30, y + Math.sin(ang + 1.2) * 12, x + Math.cos(ang + 1.6) * 60, y + Math.sin(ang + 1.6) * 20);
      } else {
        const rasante = a.variante === 'rasante';
        x = c.x + ((entre(a.sem, i + 7, 0, c.w) + (a.t - 8) * vel) % (c.w + comp)) - comp;
        y = rasante ? c.h - 4 - az(a.sem, i + 11) * 18 : c.y + 8 + az(a.sem, i + 11) * (c.h - 16);
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + comp * 0.5, y + entre(a.sem, i + 30, -12, -6), x + comp, y + (a.variante === 'frente' && i % 2 ? 10 : -4));
      }
    }
    ctx.lineWidth = 2 + b;
    ctx.strokeStyle = b === 0 ? p.nucleo : p.brilho;
    ctx.globalAlpha = trava(a.vida * (0.9 - b * 0.15));
    ctx.stroke();
  });
  // anel de terra: elipse achatada no chão crescendo 6 px/tick
  const idade = (a.t - 8) % 20;
  ctx.beginPath();
  ctx.ellipse(cx, c.h - 6, 20 + idade * 6, (20 + idade * 6) / 3, 0, 0, PI2);
  ctx.lineWidth = Math.max(0.5, 6 * (1 - idade / 20));
  ctx.strokeStyle = p.sombra === '#000000' ? p.brilho : mistura(p.sombra, p.brilho, 0.5);
  ctx.globalAlpha = trava(a.vida * (1 - idade / 20));
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- E11 PENA DE ÁGUIA (BAATAR, fase 2)
function estiloPena(a: ArgsEstilo): void {
  const { c, p } = a;
  const ctx = aditivo(a);
  const cy = c.y + c.h / 2;
  // asas: dois leques de 7 penas abrindo de 0 a 70° em 8 ticks, atrás do corpo
  const abre = (Math.PI * 70 * trava((a.t - 8) / 8)) / 180;
  const ox = c.x + 30;
  ctx.beginPath();
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const ang = lado * (0.2 + (abre * i) / 6) - Math.PI * 0.05;
      const comp = lerp(40, 70, i / 6) * (a.pesado ? 1.3 : 1);
      const x = ox - Math.cos(ang) * comp * 0.1;
      const y = cy + 10;
      ctx.moveTo(x, y);
      ctx.ellipse(x - Math.cos(ang) * comp * 0.5, y - Math.sin(ang) * comp * 0.5 - 20, comp * 0.5, 6, -ang - 0.5, 0, PI2);
    }
  }
  ctx.fillStyle = p.brilho;
  ctx.globalAlpha *= 0.8;
  ctx.fill();
  // penas soltas caindo girando, balançando sin(t/10)·1,5
  const n = qtd(a, 12);
  const soltas = Array.from({ length: n }, (_, i) => {
    const nasc = 8 + (i * 22) / n;
    const idade = a.t - nasc;
    return { x: c.x + c.w * (0.2 + 0.7 * az(a.sem, i)) + Math.sin((a.t + i * 7) / 10) * 1.5 * idade, y: c.y + 10 + idade * entre(a.sem, i + 9, 0.8, 1.4) * 2, rot: idade * 0.04 + i, ok: idade > 0 && idade < 36 };
  }).filter((f) => f.ok);
  ctx.beginPath();
  for (const f of soltas) {
    ctx.moveTo(f.x + 22, f.y);
    ctx.ellipse(f.x, f.y, 22, 6, f.rot, 0, PI2);
  }
  ctx.fillStyle = p.nucleo;
  ctx.globalAlpha = trava(a.vida);
  ctx.fill();
  ctx.beginPath();
  for (const f of soltas) {
    ctx.moveTo(f.x - Math.cos(f.rot) * 22, f.y - Math.sin(f.rot) * 22);
    ctx.lineTo(f.x + Math.cos(f.rot) * 22, f.y + Math.sin(f.rot) * 22);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = p.sombra;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- E12 MEANDRO E ANEL (ZENON, chefão)
/** O núcleo ônix: a "energia em negativo" é regra exclusiva do chefão (nenhum outro lutador tem energia mais escura que o cenário). */
export const ONIX = '#0c0710';
const OURO = '#d9b25a';

type Anel = { readonly x: number; readonly y: number; readonly rx: number; readonly idade: number };

/**
 * Anéis achatados (ry = 0,45·rx) abrindo a partir de UM núcleo ônix em `source-over` (alfa <= 0,85): sem isso o centro sumiria no `lighter`
 * (um núcleo quase preto não soma nada). Só a borda é aditiva, em dois traçados (anéis novos mais fortes, antigos esmaecendo): 3 primitivas.
 */
function aneisComNucleo(a: ArgsEstilo, nucleo: { x: number; y: number; rx: number } | null, lista: readonly Anel[], vidaDoAnel = 26): void {
  const { ctx } = a;
  if (nucleo) {
    ctx.save();
    ctx.globalAlpha = trava(a.vida * 0.85);
    ctx.fillStyle = ONIX;
    ctx.beginPath();
    ctx.ellipse(nucleo.x, nucleo.y, nucleo.rx, nucleo.rx * 0.45, 0, 0, PI2);
    ctx.fill();
    ctx.restore();
  }
  for (const novo of [true, false]) {
    const grupo = lista.filter((r) => r.idade >= 0 && r.idade < vidaDoAnel && (r.idade < vidaDoAnel / 2) === novo);
    if (grupo.length === 0) continue;
    const c2 = aditivo(a, novo ? 1 : 0.5);
    c2.beginPath();
    for (const r of grupo) {
      c2.moveTo(r.x + r.rx, r.y);
      c2.ellipse(r.x, r.y, r.rx, r.rx * 0.45, 0, 0, PI2);
    }
    c2.lineWidth = novo ? 4 : 2.5;
    c2.strokeStyle = a.p.brilho;
    c2.stroke();
    c2.restore();
  }
}

/** Linha de meandro (ângulos retos, módulo de 24 px) em cima e embaixo da faixa, andando 6 a 10 px por tick: UM traçado. */
function meandro(a: ArgsEstilo): void {
  const { c } = a;
  const ctx = aditivo(a, 0.7);
  const passo = a.pesado ? 6 : 10;
  const desl = ((a.t - 8) * passo) % 24;
  ctx.beginPath();
  for (const y0 of [c.y + 8, c.y + c.h - 18]) {
    for (let x = c.x - 24 + desl; x < c.x + c.w; x += 24) {
      ctx.moveTo(x, y0 + 10);
      ctx.lineTo(x, y0);
      ctx.lineTo(x + 12, y0);
      ctx.lineTo(x + 12, y0 + 10);
      ctx.lineTo(x + 24, y0 + 10);
    }
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = a.p.brilho;
  ctx.stroke();
  ctx.restore();
}

/** Moedas (losangos dourados de 10 x 6 px) nos pontos dados: UM preenchimento. */
function moedas(a: ArgsEstilo, pts: readonly { x: number; y: number }[]): void {
  if (pts.length === 0) return;
  const ctx = aditivo(a);
  ctx.beginPath();
  for (const p of pts) {
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x, p.y - 3);
    ctx.lineTo(p.x + 5, p.y);
    ctx.lineTo(p.x, p.y + 3);
    ctx.closePath();
  }
  ctx.fillStyle = OURO;
  ctx.fill();
  ctx.restore();
}

function estiloMeandro(a: ArgsEstilo): void {
  const { c } = a;
  const cy = c.y + c.h / 2;
  const u = progresso(a);
  meandro(a);
  if (a.variante === 'coluna') {
    // anéis empilhados subindo, rx diminuindo (150 -> 50)
    const x = c.x + c.w * 0.45;
    const n = qtd(a, 5);
    const lista: Anel[] = [];
    for (let i = 0; i < n; i++) {
      const sobe = trava((a.t - 8 - i * 3) / 10);
      lista.push({ x, y: lerp(c.y + c.h - 14, c.y + 22 + ((c.h - 44) * (n - 1 - i)) / Math.max(1, n - 1), sobe), rx: lerp(150, 50, n === 1 ? 0 : i / (n - 1)) * (0.6 + 0.4 * sobe), idade: a.t - 8 - i * 3 });
    }
    aneisComNucleo(a, { x, y: c.y + c.h - 12, rx: 70 }, lista, 30);
  } else if (a.variante === 'tributo') {
    // o anel se fecha sobre o ponto (rx 160 -> 30 em 10 ticks) e as moedas voam na direção do ZENON (a esquerda da faixa)
    const px = c.x + c.w * 0.45;
    const idade = a.t - 10;
    const k = trava(idade / 10);
    aneisComNucleo(a, { x: px, y: cy, rx: lerp(70, 22, k) }, idade >= 0 ? [{ x: px, y: cy, rx: lerp(160, 30, k), idade: Math.min(idade, 12) }] : [], 40);
    const m: { x: number; y: number }[] = [];
    for (let i = 0; i < qtd(a, 6); i++) {
      const v = trava((a.t - 20 - i * 1.5) / 16);
      if (v <= 0 || v >= 1) continue;
      m.push({ x: lerp(px, c.x - 10, v), y: lerp(cy + (i - 2.5) * 6, c.y + c.h * 0.75, v) });
    }
    moedas(a, m);
  } else if (a.variante === 'decreto') {
    // meio anel que gira 180° junto com o flip da pose (a investida cruza o rival)
    const x = c.x + c.w * 0.4;
    const ctx = aditivo(a);
    const ini = Math.PI * u;
    ctx.beginPath();
    ctx.ellipse(x, cy, 150, 150 * 0.45, 0, ini, ini + Math.PI);
    ctx.ellipse(x, cy, 100, 100 * 0.45, 0, ini, ini + Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = a.p.brilho;
    ctx.stroke();
    ctx.restore();
    const nu = a.vida;
    ctx.save();
    ctx.globalAlpha = trava(nu * 0.85);
    ctx.fillStyle = ONIX;
    ctx.beginPath();
    ctx.ellipse(x, cy, 46, 46 * 0.45, 0, ini, ini + Math.PI);
    ctx.fill();
    ctx.restore();
    moedas(a, Array.from({ length: qtd(a, 4) }, (_, i) => ({ x: x + Math.cos(ini + (i * Math.PI) / 3) * 125, y: cy + Math.sin(ini + (i * Math.PI) / 3) * 56 })));
  } else {
    // selo / selo-maior: anéis saindo da mão à frente; o maior tem dois grupos defasados em 4 ticks
    const grupos = a.variante === 'selo-maior' ? 2 : 1;
    const por = qtd(a, a.variante === 'selo-maior' ? 4 : 5);
    for (let g = 0; g < grupos; g++) {
      const ox = c.x + c.w * (0.2 + g * 0.06);
      const oy = cy + (g ? 8 : -4);
      const esc = g ? 1.2 : 1;
      const lista: Anel[] = [];
      for (let i = 0; i < por; i++) {
        const idade = a.t - 8 - i * 4 - g * 4;
        lista.push({ x: ox + idade * 6, y: oy, rx: Math.min(160, 40 + idade * 5) * esc, idade });
      }
      aneisComNucleo(a, { x: ox, y: oy, rx: 30 * esc * (0.6 + 0.4 * u) }, lista);
    }
  }
}

export const ESTILOS: Readonly<Record<EstiloId, (a: ArgsEstilo) => void>> = {
  E1: estiloRaio,
  E2: estiloDragao,
  E3: estiloCrescente,
  E4: estiloArco,
  E5: estiloCorda,
  E6: estiloEstrela,
  E7: estiloFio,
  E8: estiloChama,
  E9: estiloEspiral,
  E10: estiloVento,
  E11: estiloPena,
  E12: estiloMeandro,
};

/** Desenha o estilo `id` (e só ele): o chamador cuida do envelope, do clipe da faixa e da transformação. */
export function desenharEstilo(id: EstiloId, a: ArgsEstilo): void {
  if (a.vida <= 0.001) return;
  ESTILOS[id](a);
}

// ---------------------------------------------------------------- assinatura do acerto (no lugar da estrela extra `fire[0]`)
export interface ArgsAssinatura {
  readonly ctx: Ctx;
  /** Idade do efeito em ticks (0..20). */
  readonly idade: number;
  readonly estilo: EstiloId;
  readonly variante: string;
  readonly p: Paleta;
  readonly x: number;
  readonly y: number;
  readonly sem: number;
  /** Lado para onde o golpe empurra (+1/-1). */
  readonly dir: 1 | -1;
  /** Defesa: o "eco" (30% das primitivas, cor mais fria, sem anel). */
  readonly eco?: boolean;
  /** Anel de choque grande (golpes PESADOS). */
  readonly pesado?: boolean;
}

export const VIDA_ASSINATURA = 20;

/**
 * A assinatura de cada estilo no ponto do acerto (≤ 16 primitivas, vida de 20 ticks) mais o anel de choque C1 (só no acerto). Na defesa,
 * `eco` reduz a assinatura a 30% das primitivas, na cor `mix(sombra, branco, 25%)`, alfa máx. 0,5, sem anel.
 */
export function desenharAssinatura(a: ArgsAssinatura): void {
  const { ctx, idade, x, y, p, sem } = a;
  if (idade < 0 || idade >= VIDA_ASSINATURA) return;
  const k = idade / VIDA_ASSINATURA;
  const eco = a.eco === true;
  const cor = eco ? mistura(p.sombra, '#ffffff', 0.25) : p.brilho;
  const nucleo = eco ? cor : p.nucleo;
  const mult = eco ? 0.3 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = trava((1 - k) * (eco ? 0.5 : 1));
  ctx.lineCap = 'round';
  if (!eco) {
    // C1: anel de choque (r 20 -> 90; pesado 30 -> 150) em 10 ticks, lineWidth 8 -> 0, em núcleo
    const kr = trava(idade / 10);
    if (kr < 1) {
      ctx.beginPath();
      ctx.arc(x, y, a.pesado ? lerp(30, 150, kr) : lerp(20, 90, kr), 0, PI2);
      ctx.lineWidth = 8 * (1 - kr);
      ctx.strokeStyle = p.nucleo;
      ctx.stroke();
    }
  }
  const n = Math.max(2, Math.round(8 * mult));
  switch (a.estilo) {
    case 'E1': {
      const ramos = Math.max(2, Math.round(5 * mult));
      ctx.beginPath();
      for (let i = 0; i < ramos; i++) {
        const ang = -Math.PI / 2 + (i - (ramos - 1) / 2) * 0.55;
        tracar(ctx, polilinha(sem + Math.floor(idade / 2) * 31, i * 9, x, y, x + Math.cos(ang) * 140, y + Math.sin(ang) * 140, 18, 2));
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = nucleo;
      ctx.stroke();
      break;
    }
    case 'E2': {
      // mandíbula: dois arcos de 120° que fecham sobre o ponto (r 60 -> 18 em 6 ticks), e escamas soltas que caem
      const r = lerp(60, 18, trava(idade / 6));
      ctx.beginPath();
      ctx.arc(x, y, r, -2.1, -0.1);
      ctx.moveTo(x + r * Math.cos(2.1 - Math.PI), y + r * Math.sin(2.1));
      ctx.arc(x, y, r, 1.04, 3.14 - 0.1);
      ctx.lineWidth = 5;
      ctx.strokeStyle = cor;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ex = x + (az(sem, i) - 0.5) * 80;
        const ey = y - 20 + idade * idade * 0.125 + az(sem, i + 9) * 10;
        ctx.moveTo(ex + 6, ey);
        ctx.arc(ex, ey, 6, 0, PI2);
      }
      ctx.fillStyle = cor;
      ctx.fill();
      break;
    }
    case 'E3': {
      // o crescente se parte em 5 flores
      ctx.beginPath();
      flores(ctx, Array.from({ length: Math.max(2, Math.round(5 * mult)) }, (_, i) => ({ x: x + Math.cos(i * 1.26) * idade * 3.2, y: y + Math.sin(i * 1.26) * idade * 3.2 + idade * 0.5, rot: idade * 0.1 + i, s: 1.4 })));
      ctx.fillStyle = nucleo;
      ctx.fill();
      break;
    }
    case 'E4': {
      // o arco fecha em 360° em volta do ponto em 6 ticks + 3 batidas (anéis finos)
      ctx.beginPath();
      ctx.arc(x, y, 46, 0, PI2 * trava(idade / 6));
      ctx.lineWidth = 8;
      ctx.strokeStyle = cor;
      ctx.stroke();
      ctx.beginPath();
      for (const t0 of [4, 10, 14]) if (idade > t0) {
        ctx.moveTo(x + 10 + (idade - t0) * 3, y);
        ctx.arc(x, y, 10 + (idade - t0) * 3, 0, PI2);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = nucleo;
      ctx.stroke();
      break;
    }
    case 'E5': {
      // respingo de índigo radial
      ctx.beginPath();
      for (let i = 0; i < n + 4; i++) {
        const ang = az(sem, i) * PI2;
        const d = idade * entre(sem, i + 30, 2.5, 6);
        const gx = x + Math.cos(ang) * d;
        const gy = y + Math.sin(ang) * d + 0.35 * idade * idade * 0.15;
        ctx.moveTo(gx + 4, gy);
        ctx.arc(gx, gy, 4, 0, PI2);
      }
      ctx.fillStyle = cor;
      ctx.fill();
      break;
    }
    case 'E6': {
      // 12 estrelas em explosão radial (3–8 px/tick)
      ctx.beginPath();
      for (let i = 0; i < Math.round(12 * mult) + 1; i++) {
        const ang = (i * PI2) / 12 + az(sem, i);
        const d = idade * entre(sem, i + 40, 3, 8);
        estrela4(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 9 * (1 - k), idade * 0.2);
      }
      ctx.fillStyle = cor;
      ctx.fill();
      break;
    }
    case 'E7': {
      // X de dois fios de 160 px + touche no ponto
      ctx.beginPath();
      ctx.moveTo(x - 70, y - 60);
      ctx.lineTo(x + 70, y + 60);
      if (!eco) {
        ctx.moveTo(x - 70, y + 60);
        ctx.lineTo(x + 70, y - 60);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = nucleo;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(i * 1.5708 + idade * 0.13) * 24, y + Math.sin(i * 1.5708 + idade * 0.13) * 24);
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'E8': {
      // leque de 8 chamas que se abrem do ponto
      for (let i = 0; i < Math.max(2, Math.round(8 * mult)); i++) {
        const ang = -Math.PI / 2 + (i - 3.5) * 0.3;
        const d = idade * 2.2;
        chama(ctx, x + Math.cos(ang) * d * 1.6, y + Math.sin(ang) * d - 4, 18 * (1 - k * 0.5), Math.sin(idade * 0.3 + i) * 2, p);
      }
      break;
    }
    case 'E9': {
      // a ponta da hélice ergue em "S" e fecha num anel de r 18 no ponto (o bote)
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const s = (i / 16) * Math.min(1, idade / 8);
        ctx.lineTo(x - a.dir * 60 * (1 - s) + Math.sin(s * 6) * 12, y + 30 * (1 - s) - Math.cos(s * 3) * 10 * s);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = cor;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, PI2 * trava((idade - 6) / 6));
      ctx.lineWidth = 3;
      ctx.strokeStyle = nucleo;
      ctx.stroke();
      break;
    }
    case 'E10': {
      // anel de terra (rx 30 -> 180 em 14 ticks) + 24 grãos de poeira
      const kr = trava(idade / 14);
      ctx.beginPath();
      ctx.ellipse(x, y + 60, lerp(30, 180, kr), lerp(30, 180, kr) / 3, 0, 0, PI2);
      ctx.lineWidth = 6 * (1 - kr);
      ctx.strokeStyle = cor;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < Math.round(24 * mult); i++) {
        const gx = x + (az(sem, i) - 0.5) * lerp(40, 340, kr);
        const gy = y + 56 - az(sem, i + 9) * idade * 3;
        ctx.moveTo(gx + 2, gy);
        ctx.arc(gx, gy, 2, 0, PI2);
      }
      ctx.fillStyle = nucleo;
      ctx.fill();
      break;
    }
    case 'E11': {
      // as asas fecham sobre o ponto e 12 penas se soltam
      ctx.beginPath();
      for (const lado of [-1, 1]) {
        const abre = lado * lerp(1.1, 0.1, trava(idade / 8));
        ctx.moveTo(x, y);
        ctx.ellipse(x + Math.sin(abre) * 40, y - Math.cos(abre) * 40, 38, 10, abre, 0, PI2);
      }
      ctx.fillStyle = cor;
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < Math.round(12 * mult); i++) {
        const ang = az(sem, i) * PI2;
        const d = idade * entre(sem, i + 9, 2, 6);
        ctx.moveTo(x + Math.cos(ang) * d + 8, y + Math.sin(ang) * d);
        ctx.ellipse(x + Math.cos(ang) * d, y + Math.sin(ang) * d + idade * 0.6, 8, 2.5, ang, 0, PI2);
      }
      ctx.fillStyle = nucleo;
      ctx.fill();
      break;
    }
    case 'E12': {
      if (eco) {
        // defesa: o anel bate e se desfaz em 4 segmentos retos, sem moedas
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const sx = i % 2 ? 1 : -1;
          const sy = i < 2 ? -1 : 1;
          const d = 24 + idade * 2.2;
          ctx.moveTo(x + sx * d, y + sy * d * 0.45);
          ctx.lineTo(x + sx * (d + 14), y + sy * (d + 14) * 0.45);
        }
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = nucleo;
        ctx.stroke();
        break;
      }
      // acerto: o anel se fecha sobre o rival (rx 160 -> 30 em 10 ticks) e solta 6 moedas na direção do ZENON (contra o lado do golpe)
      const kf = trava(idade / 10);
      ctx.beginPath();
      ctx.ellipse(x, y, lerp(160, 30, kf), lerp(160, 30, kf) * 0.45, 0, 0, PI2);
      ctx.lineWidth = 4 * (1 - kf * 0.5);
      ctx.strokeStyle = cor;
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const v = trava((idade - 3 - i) / 14);
        if (v <= 0) continue;
        const mx = x - a.dir * v * (60 + i * 14);
        const my = y - 10 - v * (30 + az(sem, i) * 40) + v * v * 60;
        ctx.moveTo(mx - 5, my);
        ctx.lineTo(mx, my - 3);
        ctx.lineTo(mx + 5, my);
        ctx.lineTo(mx, my + 3);
        ctx.closePath();
      }
      ctx.fillStyle = OURO;
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- estampa da tarja (estática, vai para o cache; 10% de alfa em brilho)
/**
 * O motivo do estilo repetido ao longo da faixa, a 10% de alfa: é o que faz a tarja PARADA já dizer de quem é (no lugar das listras
 * brancas de 12% da spec). Um traçado só.
 */
export function estampaDaTarja(g: Ctx, estilo: EstiloId, brilho: string, W: number, H: number): void {
  g.save();
  g.globalAlpha = 0.1;
  g.strokeStyle = brilho;
  g.lineWidth = 3;
  g.beginPath();
  const cy = H / 2;
  switch (estilo) {
    case 'E1': // zigue-zague de 5 vértices a cada 90 px
      for (let x = 0; x < W; x += 90) {
        g.moveTo(x, cy);
        for (let i = 1; i <= 5; i++) g.lineTo(x + i * 18, cy + (i % 2 ? -26 : 26));
      }
      break;
    case 'E2': // fileira de arcos de escama
      for (let x = 0; x < W + 40; x += 36) for (const y of [cy - 30, cy, cy + 30]) {
        g.moveTo(x + 18, y);
        g.arc(x, y, 18, 0, Math.PI);
      }
      break;
    case 'E3': // contorno de flor de 5 pétalas a cada 110 px
      for (let x = 55; x < W; x += 110) for (let k = 0; k < 5; k++) {
        const a = (k * PI2) / 5;
        g.moveTo(x + Math.cos(a) * 30 + 14, cy + Math.sin(a) * 30);
        g.ellipse(x + Math.cos(a) * 30, cy + Math.sin(a) * 30, 14, 7, a, 0, PI2);
      }
      break;
    case 'E4': // arcos de 90° espaçados 120 px
      for (let x = 30; x < W; x += 120) {
        g.moveTo(x + 60, cy);
        g.arc(x, cy, 60, 0, Math.PI / 2);
      }
      break;
    case 'E5': // corda trançada nas duas bordas
      for (const y of [12, H - 12]) {
        g.moveTo(0, y);
        for (let x = 0; x <= W; x += 10) g.lineTo(x, y + Math.sin(x * 0.25) * 5);
      }
      break;
    case 'E6': // estrelas de 4 pontas em grade solta
      for (let x = 40; x < W; x += 120) for (const y of [cy - 30, cy + 30]) estrela4(g, x + (y > cy ? 60 : 0), y, 14, 0);
      break;
    case 'E7': // linhas paralelas finas, como a pista de esgrima
      g.lineWidth = 1.5;
      for (let y = 14; y < H; y += 18) {
        g.moveTo(0, y);
        g.lineTo(W, y);
      }
      break;
    case 'E8': // fileira de chamas pequenas na borda de baixo
      for (let x = 20; x < W; x += 40) {
        g.moveTo(x - 9, H - 6);
        g.quadraticCurveTo(x - 9, H - 22, x, H - 40);
        g.quadraticCurveTo(x + 9, H - 22, x + 9, H - 6);
      }
      break;
    case 'E9': // linha sinuosa fina ao longo da faixa
      g.moveTo(0, cy);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, cy + Math.sin(x * 0.04) * 22);
      break;
    case 'E10': // riscos de vento horizontais
      for (let y = 16; y < H; y += 24) for (let x = (y * 7) % 90; x < W; x += 170) {
        g.moveTo(x, y);
        g.lineTo(x + 100, y);
      }
      break;
    case 'E11': // penas deitadas espaçadas 100 px
      for (let x = 40; x < W; x += 100) {
        g.moveTo(x + 24, cy + 8);
        g.ellipse(x, cy + 8, 24, 6, -0.3, 0, PI2);
      }
      break;
    case 'E12': // meandro grego a 10%: ângulos retos, módulo de 24 px, na altura do meio
      for (let x = 0; x < W; x += 24) {
        g.moveTo(x, cy + 10);
        g.lineTo(x, cy);
        g.lineTo(x + 12, cy);
        g.lineTo(x + 12, cy + 10);
        g.lineTo(x + 24, cy + 10);
      }
      break;
  }
  g.stroke();
  g.restore();
}
