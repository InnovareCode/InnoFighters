import type { ArteLutador } from '../../assets/elenco';
import { ALTURA, GROUND, LARGURA } from '../../core/constantes';
import { TICK_DO_RAIO } from '../../data/trailer/curvas';
import type { LutadorMontado } from '../../data/montar';
import { desenharCenarioLuta } from '../cenario';
import { desenharPose } from '../pose';
import type { Ctx } from '../tela';
import { CamadaDeContraluz } from './contraluz';
import { gradeDeCor } from './grade';

/*
 * P0, o "frio" (docs/spec-trailer-abertura.md §3.1): preto, e um RAIO acende o cenário e revela o HAYATO em contraluz (silhueta escura contra o céu aceso), que sai do
 * `idle` para a pose de vitória. Sem motor, sem Game: é desenho puro de (tick do plano, raio). O raio NÃO é flash de tela cheia branco: a luz sobe no cenário e o tom
 * azulado aditivo fica em <= 0,3 de alfa (o único flash de tela cheia do trailer é o do c24.1, conferido pela validação).
 */

/** Onde o herói fica: no meio; o cartão "DEZ MESTRES." mora na faixa de baixo do letterbox. */
export const X_DO_HEROI = 480;
export const ESCALA_DO_HEROI = 1.12;
/** Ticks (depois do raio) em que o relâmpago aparece desenhado. */
export const TICKS_DO_RELAMPAGO = 9;

/** Hash determinístico 0..1 (sem `Math.random`): o zigue-zague do relâmpago é o mesmo em toda visita. */
export function ruido(i: number, semente: number): number {
  const s = Math.sin(i * 127.1 + semente * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** O preto do começo: o cenário escuro sai do preto nos 24 ticks em que o letterbox fecha. */
export const fadeDoFrio = (tauNoPlano: number): number => Math.min(1, tauNoPlano / 24);

export interface EntradaDoFrio {
  readonly ctx: Ctx;
  readonly cenario: CanvasImageSource;
  readonly ch: LutadorMontado;
  readonly arte: ArteLutador;
  readonly camada: CamadaDeContraluz;
  readonly tauNoPlano: number;
  readonly pose: 'idle' | 'win';
  readonly raio: number;
  readonly zoom: { readonly fator: number; readonly x: number };
}

function relampago(ctx: Ctx, d: number, raio: number): void {
  const idade = d / TICKS_DO_RELAMPAGO;
  if (d < 0 || idade >= 1) return;
  const a = 1 - idade;
  const topo = -10;
  const base = GROUND - 330 * ESCALA_DO_HEROI * 0.8;
  const passos = 9;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= passos; i++) {
    const u = i / passos;
    const centro = X_DO_HEROI + 70 + (1 - u) * 70;
    pts.push([centro + (ruido(i, 3) - 0.5) * 120 * (i === passos ? 0.2 : 1), topo + (base - topo) * u]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [largura, cor, alfa] of [
    [16, '90,150,255', 0.22],
    [6, '170,205,255', 0.5],
    [2.2, '255,255,255', 0.95],
  ] as const) {
    ctx.globalAlpha = Math.min(1, alfa * a * (0.6 + 0.4 * raio));
    ctx.strokeStyle = `rgb(${cor})`;
    ctx.lineWidth = largura;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
}

export function desenharFrio(e: EntradaDoFrio): void {
  const { ctx, tauNoPlano, raio } = e;
  const d = tauNoPlano - TICK_DO_RAIO;
  const z = e.zoom;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.save();
  if (z.fator !== 1) {
    ctx.translate(z.x, GROUND);
    ctx.scale(z.fator, z.fator);
    ctx.translate(-z.x, -GROUND);
  }
  desenharCenarioLuta(ctx, e.cenario, LARGURA / 2);
  ctx.restore();
  // a grade de cor do ato frio (§6): escurece (o jp é pôr do sol e vira noite de tempestade), tinta azul e vinheta; o raio abre o escurecimento
  ctx.fillStyle = `rgba(4,6,22,${(0.55 * (1 - 0.6 * raio)).toFixed(3)})`;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  gradeDeCor(ctx, 'frio');
  // o raio: luz aditiva azul (alfa <= 0,22: não é flash branco de tela cheia; medido pelo Apolo, delta de luminância 0,06)
  if (raio > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(120,160,255,${(0.22 * raio).toFixed(3)})`;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    ctx.restore();
  }
  relampago(ctx, d, raio);
  // o herói em contraluz (§9): o ARO de luz (cópia clara deslocada para o lado do raio) e, por cima, a silhueta escura no lugar
  const desenharHeroi = (g: Ctx): void => {
    g.save();
    if (z.fator !== 1) {
      g.translate(z.x, GROUND);
      g.scale(z.fator, z.fator);
      g.translate(-z.x, -GROUND);
    }
    desenharPose(g, e.ch, e.arte, e.pose, X_DO_HEROI, GROUND, ESCALA_DO_HEROI, 1);
    g.restore();
  };
  const area = { x: 0, y: 40, w: LARGURA, h: GROUND - 20 };
  // ele só aparece com o raio ("revela o HAYATO"): antes disso não se desenha nem se toca no atlas dele (o 1º quadro do trailer não paga o custo de primeira vez)
  const ok = d < 0 || e.camada.compor(ctx, desenharHeroi, { cor: '#bfe0ff', area, alfa: 0.55 + 0.45 * raio, dx: -2.5, dy: -1.5 }) && e.camada.compor(ctx, desenharHeroi, { cor: '#080a16', area });
  if (!ok) desenharHeroi(ctx);
  // do preto: o cenário sai do preto enquanto o letterbox fecha
  const fade = fadeDoFrio(tauNoPlano);
  if (fade < 1) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }
}
