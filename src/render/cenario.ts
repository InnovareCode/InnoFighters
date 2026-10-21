import { ALTURA, LARGURA } from '../core/constantes';
import { criarCanvasPadrao, type CriarCanvas } from '../assets/canvas';
import { sobreposicaoDaArenaGr, type EstadoDaArena } from './arena-gr';
import { usarEspacoLogico, type Ctx } from './tela';

/** Cenário da luta, com paralaxe leve em relação à câmera. Desenhar dentro de aplicarCamera. */
export function desenharCenarioLuta(ctx: Ctx, fundo: CanvasImageSource, camX: number): void {
  ctx.drawImage(fundo, -30 - (camX - LARGURA / 2) * 0.05, -20, LARGURA + 60, ALTURA + 40);
}

/** Vinheta escura nas bordas, por cima de tudo menos do HUD. */
export function desenharVinheta(ctx: Ctx, vinheta: CanvasImageSource): void {
  ctx.drawImage(vinheta, 0, 0, LARGURA, ALTURA);
}

/** Fundo dos menus: cenário com leve movimento + escurecimento + vinheta. Porte de menuBackdrop. */
export function desenharFundoMenu(ctx: Ctx, fundo: CanvasImageSource, vinheta: CanvasImageSource, t: number, escuro = 0.35): void {
  usarEspacoLogico(ctx);
  const z = 1.06 + Math.sin(t / 400) * 0.02;
  const ox = Math.sin(t / 500) * 18;
  ctx.save();
  ctx.translate(LARGURA / 2 + ox, ALTURA / 2);
  ctx.scale(z, z);
  ctx.drawImage(fundo, -LARGURA / 2 - 20, -ALTURA / 2 - 12, LARGURA + 40, ALTURA + 24);
  ctx.restore();
  ctx.fillStyle = `rgba(10,4,24,${escuro})`;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  desenharVinheta(ctx, vinheta);
}

/** Vinheta pré-renderizada 480x270 (esmaecida nas pontas), esticada para a tela ao desenhar. */
export function criarVinheta(criarCanvas: CriarCanvas = criarCanvasPadrao): HTMLCanvasElement {
  const v = criarCanvas(480, 270);
  const g = v.getContext('2d');
  if (!g) throw new Error('contexto 2D indisponivel');
  const grad = g.createRadialGradient(240, 135, 90, 240, 135, 300);
  grad.addColorStop(0, 'rgba(20,0,30,0)');
  grad.addColorStop(1, 'rgba(14,0,24,.55)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 480, 270);
  return v;
}

/**
 * Sobreposições procedurais por cenário (spec do ZENON §4.3), desenhadas por `desenharMundo` logo depois do cenário e dentro da câmera.
 * Chave = id do cenário (`LeituraLuta.stage`); só a `gr` tem. O `mn` NÃO tem nenhuma (o gancho `fase-chefe` nunca escureceu o céu dele).
 */
export const SOBREPOSICOES_DE_CENARIO: Readonly<Record<string, ((ctx: Ctx, estado: EstadoDaArena) => void) | undefined>> = {
  gr: sobreposicaoDaArenaGr,
};
