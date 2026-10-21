import type { ArteLutador } from '../assets/elenco';
import { GROUND, SH, SH_IDLE } from '../core/constantes';
import type { LutadorLeitura } from '../core/contratos';
import type { LutadorMontado } from '../data/montar';
import { getPD } from '../data/poses';
import { desenharRastroGolpe } from './rastro-golpe';
import type { Ctx } from './tela';

/**
 * O lutador montado a desenhar: a ficha ativa (C3 `LutadorLeitura.ficha`) quando não é null, senão o base.
 * Cada ficha é um `LutadorMontado` completo sobre as mesmas poses (`getPD`, cores `fire`, escala).
 * Ficha desconhecida cai no base (não quebra o desenho; a luta já lança erro se pedir uma que não existe).
 */
export function chDaFicha(ch: LutadorMontado, ficha: string | null): LutadorMontado {
  return (ficha ? ch.fichas[ficha] : undefined) ?? ch;
}

/**
 * Desenha um lutador (porte de Fighter.draw do protótipo): sombra, brilho da magia, reflexo no
 * piso, imagens fantasma da corrida, o corpo (com flash branco de dano) e o rastro do golpe.
 * Só lê `LutadorLeitura` (C3): a pose já vem escolhida pela luta em `f.pose`.
 *
 * Nota de fidelidade: no protótipo o piscar da invulnerabilidade (`globalAlpha = 0.6`) era
 * sobrescrito pelo `pose()` seguinte e nunca tinha efeito; portanto não é desenhado aqui.
 */
export function desenharLutador(ctx: Ctx, f: LutadorLeitura, chBase: LutadorMontado, arte: ArteLutador): void {
  const ch = chDaFicha(chBase, f.ficha);
  const P = f.pose;
  const pd = getPD(ch, P.name);
  const K = ch.K;
  const img = arte.imagemDe(pd); // null = atlas ainda nao carregado: so sombra e brilho
  const air = GROUND - f.y;
  const deitado = P.name === 'koFloor';
  const fl = f.facing * P.flip;
  const quadro = (im: CanvasImageSource, alfa: number): void => {
    ctx.globalAlpha = alfa;
    ctx.drawImage(im, pd.x, pd.y, pd.w, pd.h, -pd.ax * K, -pd.h * K, pd.w * K, pd.h * K);
    ctx.globalAlpha = 1;
  };

  // sombra no chão
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 3, deitado ? 105 : Math.max(26, 66 - air * 0.12), deitado ? 11 : 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (P.glow > 0.01) {
    // energia da magia
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gx = f.x + f.facing * (P.dx + 20);
    const gy = f.y - SH_IDLE * 0.55;
    const R = 170 * (0.7 + 0.3 * Math.sin(f.age / 2));
    const gr = ctx.createRadialGradient(gx, gy, 10, gx, gy, R);
    gr.addColorStop(0, ch.fire[1]);
    gr.addColorStop(0.35, ch.fire[0]);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55 * P.glow;
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(gx, gy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (!deitado && img) {
    // reflexo no piso molhado
    ctx.save();
    ctx.translate(f.x, GROUND + 4 + (air - P.dy));
    ctx.scale(fl, -1);
    ctx.translate(P.dx, 0);
    ctx.scale(P.sx, P.sy);
    quadro(img, 0.15);
    ctx.restore();
  }

  // rastro de imagens (corrida, investidas): silhueta branca esmaecendo
  for (const tr of f.trail) {
    const tp = getPD(ch, tr.name);
    const silTr = arte.silhuetaDe(tp);
    if (!silTr) continue;
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.scale(tr.f, 1);
    ctx.globalAlpha = (tr.life / 10) * 0.28;
    ctx.drawImage(silTr, tp.x, tp.y, tp.w, tp.h, -tp.ax * K, -tp.h * K, tp.w * K, tp.h * K);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // corpo
  ctx.save();
  ctx.translate(f.x, f.y + P.dy);
  ctx.scale(fl, 1);
  ctx.translate(P.dx, 0);
  if (P.rot) {
    ctx.translate(0, -SH * 0.45);
    ctx.rotate(P.rot);
    ctx.translate(0, SH * 0.45);
  }
  ctx.scale(P.sx, P.sy);
  if (img) {
    quadro(img, 1);
    const silFlash = f.flash > 0 ? arte.silhuetaDe(pd) : null;
    if (silFlash) quadro(silFlash, (f.flash / 8) * 0.5);
  }
  ctx.restore();

  desenharRastroGolpe(ctx, f, ch);
}
