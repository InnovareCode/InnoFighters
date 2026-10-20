import type { LutadorLeitura } from '../core/contratos';
import { getPD } from '../data/poses';
import type { LutadorMontado } from '../data/montar';
import type { GolpeMontado } from '../data/tipos';
import type { Ctx } from './tela';

/**
 * Rastro do golpe (aparece na fase ativa e some na recuperação). Porte de drawSwing do protótipo.
 * Decisão D2: é o ÚNICO rastro de golpe do jogo (os pintados nas folhas são removidos).
 */
export function desenharRastroGolpe(ctx: Ctx, f: LutadorLeitura, ch: LutadorMontado): void {
  if (f.state !== 'move' || f.move === null) return;
  const mv = (ch.moves as Readonly<Record<string, GolpeMontado | undefined>>)[f.move];
  if (!mv || mv.kind === 'fire' || mv.kind === 'lag' || mv.type === 'fire') return;
  const into = f.mt - mv.S;
  if (into < 0) return;
  const k = into < mv.A ? 1 - (into / Math.max(1, mv.A)) * 0.4 : Math.max(0, 0.55 - (into - mv.A) / 12);
  if (k <= 0) return;
  const pd = getPD(ch, mv.pose);
  // pose sem ponta marcada: não há onde ancorar o rastro (o protótipo desenharia NaN, isto é, nada)
  if (pd.tipX === undefined || pd.tipY === undefined) return;
  const hv = mv.heavy ? 1.5 : 0.85;
  const col = ch.fire[0];
  const s = f.facing;
  const sc = ch.scale;
  const tipX = pd.tipX * sc;
  const tipY = pd.tipY * sc;
  const ty = f.y + f.pose.dy - tipY;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  if (mv.kind === 'punch') {
    const tx = f.x + s * tipX;
    const x0 = tx - s * 150;
    for (let i = -2; i <= 2; i++) {
      const g = ctx.createLinearGradient(x0, 0, tx, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, col);
      ctx.strokeStyle = g;
      ctx.globalAlpha = k * 0.55 * (1 - Math.abs(i) * 0.22);
      ctx.lineWidth = (14 - Math.abs(i) * 2.6) * hv;
      ctx.beginPath();
      ctx.moveTo(x0, ty + i * 11);
      ctx.lineTo(tx - s * 14, ty + i * 5);
      ctx.stroke();
    }
  } else if (mv.kind === 'sweep') {
    // rasteira: faixa horizontal rente ao chão
    const tx = f.x + s * (tipX + 20);
    const x0 = f.x + s * 10;
    for (let i = 0; i < 3; i++) {
      const g = ctx.createLinearGradient(x0, 0, tx, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, i ? col : '#fff');
      ctx.strokeStyle = g;
      ctx.globalAlpha = k * 0.6;
      ctx.lineWidth = (12 - i * 4) * hv;
      ctx.beginPath();
      ctx.moveTo(x0, ty + 6 - i * 7);
      ctx.quadraticCurveTo((x0 + tx) / 2, ty - 16 - i * 6, tx, ty + 4 - i * 6);
      ctx.stroke();
    }
  } else {
    // chute: arco acompanhando a perna
    const hipY = 125;
    const dx = tipX;
    const dy = tipY - hipY;
    const r = Math.hypot(dx, dy);
    const a1 = Math.atan2(-dy, dx);
    const cy = f.y + f.pose.dy - hipY;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = k * 0.5 * (1 - i * 0.3);
      ctx.strokeStyle = i === 0 ? '#fff' : col;
      ctx.lineWidth = (13 - i * 4) * hv;
      ctx.beginPath();
      if (s > 0) ctx.arc(f.x, cy, r - i * 10, a1, a1 + 0.5);
      else ctx.arc(f.x, cy, r - i * 10, Math.PI - (a1 + 0.5), Math.PI - a1);
      ctx.stroke();
    }
  }
  ctx.restore();
}
