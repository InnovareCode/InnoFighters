import type { ProjetilVisual } from './efeitos';
import type { Ctx } from './tela';

/*
 * Projétil `anel` (ZENON: SELO DO ARCONTE e SELO MAIOR; docs/spec-chefao-zenon.md §8, docs/identidade-visual-especiais.md E12).
 * Três elipses concêntricas achatadas (ry = 0,45·rx, rx = 34·sc) com NÚCLEO ÔNIX (`cores[1]`, em `source-over`: é a "energia em
 * negativo", a única do jogo mais escura que o cenário) e borda em brilho (`cores[0]`, em `lighter`), mais um arco de destaque que gira
 * 0,25 rad/tick e uma cauda de elipses esmaecendo. Orçamento: 6 primitivas por quadro, sem shadowBlur, sem filter, sem getImageData.
 */

const DOIS_PI = Math.PI * 2;
/** Razão ry/rx das elipses. */
export const ACHATAMENTO_ANEL = 0.45;
/** rx do anel de fora com sc = 1. */
export const RAIO_ANEL = 34;
/** Quanto o arco de destaque gira por tick (rad). */
export const GIRO_DO_ARCO = 0.25;

/** Desenha o projétil `anel` em (pr.x, pr.y). Não usa `ctx.scale`: os raios já levam `sc`. */
export function desenharProjetilAnel(ctx: Ctx, pr: ProjetilVisual): void {
  const [brilho, nucleo] = pr.cores;
  const dir = Math.sign(pr.vx) || pr.dir;
  const rx = RAIO_ANEL * pr.sc;
  const ry = rx * ACHATAMENTO_ANEL;
  const t = pr.frame;
  const respira = 1 + Math.sin(t * 0.35) * 0.04;
  ctx.save();
  ctx.translate(pr.x, pr.y);

  // cauda: quatro elipses cada vez menores e mais apagadas atrás do anel (um traçado só)
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const cx = -dir * i * rx * 0.55;
    const k = 1 - i * 0.18;
    ctx.moveTo(cx + rx * k, 0);
    ctx.ellipse(cx, 0, rx * k, ry * k, 0, 0, DOIS_PI);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = brilho;
  ctx.globalAlpha = 0.28;
  ctx.stroke();

  // núcleo ônix (source-over): duas elipses escuras, a de fora mais leve; sem isso o centro sumiria no `lighter`
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = nucleo;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.12 * respira, ry * 1.12 * respira, 0, 0, DOIS_PI);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.72 * respira, ry * 0.72 * respira, 0, 0, DOIS_PI);
  ctx.fill();

  // as três bordas em brilho
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  for (const f of [1, 0.72, 0.44]) {
    ctx.moveTo(rx * f * respira, 0);
    ctx.ellipse(0, 0, rx * f * respira, ry * f * respira, 0, 0, DOIS_PI);
  }
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = brilho;
  ctx.globalAlpha = 0.95;
  ctx.stroke();

  // arco de destaque girando sobre a borda de fora (claro: sem ele a borda lê como um aro só)
  const a0 = t * GIRO_DO_ARCO;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * respira, ry * respira, 0, a0, a0 + 1.3);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff0f8';
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.restore();
}
