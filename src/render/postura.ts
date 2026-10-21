import type { LutadorMontado } from '../data/montar';
import type { Ctx } from './tela';
import { retanguloArredondado, textoArcade } from './texto';

/**
 * Ícone da postura do HUD (NILA: GAJA, o elefante, e SARPA, a serpente). Só lutadores com a ficha `sarpa` têm postura;
 * a ficha chega em `LutadorLeitura.ficha` (null = base = GAJA). A troca de fase do chefe usa outras fichas e não passa
 * por aqui (`posturaDe` devolve null para quem não tem `sarpa`).
 */
export type Postura = 'gaja' | 'sarpa';

export function posturaDe(ch: LutadorMontado, ficha: string | null | undefined): Postura | null {
  if (!Object.hasOwn(ch.fichas, 'sarpa')) return null;
  return ficha === 'sarpa' ? 'sarpa' : 'gaja';
}

const VISUAL: Readonly<Record<Postura, { rotulo: string; cor: string; fundo: string }>> = {
  gaja: { rotulo: 'GAJA', cor: '#ffb02e', fundo: '#3a2203' },
  sarpa: { rotulo: 'SARPA', cor: '#7dffb0', fundo: '#04301b' },
};

/**
 * Largura e altura da etiqueta e corpo do texto (px lógicos). Medido no celular deitado (E7a): o canvas 960x540 vira 732x412 CSS em
 * 915x412 (x0,76) e 693x390 em 844x390 (x0,72); com 14 px lógicos o nome da postura ficava com 10,7 / 10,1 px CSS, abaixo dos
 * ~12 px legíveis. Com 18 fica com 13,7 / 13,0.
 */
export const ETIQUETA_POSTURA = { w: 112, h: 30 } as const;
export const FONTE_POSTURA = 18;

function iconeGaja(ctx: Ctx, cx: number, cy: number, cor: string): void {
  // cabeça de perfil olhando para a direita: orelha grande, tromba caída e presa
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(cx - 3, cy - 1, 5.5, 6.5, 0, 0, Math.PI * 2); // orelha
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 1, cy - 2, 4.8, 0, Math.PI * 2); // cabeça
  ctx.fill();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy);
  ctx.quadraticCurveTo(cx + 8, cy + 4, cx + 5, cy + 8); // tromba
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy + 2);
  ctx.quadraticCurveTo(cx + 4, cy + 5, cx + 1, cy + 6); // presa
  ctx.stroke();
  ctx.restore();
}

function iconeSarpa(ctx: Ctx, cx: number, cy: number, cor: string): void {
  // serpente em S com a cabeça erguida
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 6);
  ctx.bezierCurveTo(cx - 8, cy + 1, cx - 1, cy + 8, cx, cy + 3);
  ctx.bezierCurveTo(cx + 1, cy - 2, cx + 7, cy + 2, cx + 6, cy - 4);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy - 6, 3.4, 2.6, -0.6, 0, Math.PI * 2); // cabeça
  ctx.fill();
  ctx.fillStyle = '#05060f';
  ctx.beginPath();
  ctx.arc(cx + 7, cy - 6.6, 0.8, 0, Math.PI * 2); // olho
  ctx.fill();
  ctx.restore();
}

/** Etiqueta "ícone + nome da postura" com o canto superior esquerdo em (x, y). */
export function desenharPostura(ctx: Ctx, postura: Postura, x: number, y: number): void {
  const v = VISUAL[postura];
  const { w, h } = ETIQUETA_POSTURA;
  ctx.save();
  retanguloArredondado(ctx, x, y, w, h, 6);
  ctx.fillStyle = v.fundo;
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = v.cor;
  ctx.stroke();
  (postura === 'gaja' ? iconeGaja : iconeSarpa)(ctx, x + 17, y + h / 2, v.cor);
  textoArcade(ctx, v.rotulo, x + 33, y + h / 2 + 1, FONTE_POSTURA, '#fff', '#05060f', 'left');
  ctx.restore();
}
