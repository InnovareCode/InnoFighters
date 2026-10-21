import { SH } from '../core/constantes';
import type { LutadorLeitura } from '../core/contratos';
import type { PoseDados } from '../data/tipos';
import type { Ctx } from './tela';

/*
 * Apresentação da ESQUIVA (docs/spec-esquiva-e-cinematica-especial.md 2.4): corpo "fantasma" e rastro na cor do lutador SÓ na janela
 * invulnerável. Na recuperação (vulnerável, punível) o corpo volta sólido e sem rastro: o jogador lê "agora posso ser acertado".
 */

/** Alfa do corpo na janela invulnerável. */
export const ALFA_FANTASMA = 0.55;

/** Esquivando, com `invuln > 0`: é a janela em que nada acerta. Campos ausentes (leituras antigas de teste) = não. */
export function esquivaNaJanela(f: Pick<LutadorLeitura, 'esquiva' | 'invuln'>): boolean {
  return (f.esquiva ?? 0) !== 0 && f.invuln > 0;
}

/** As poses da esquiva (janela = crouch, recuperação = land). Rastro com esse nome fora da janela é resto da esquiva e não se desenha. */
export function ehPoseDeEsquiva(nome: string): boolean {
  return nome === 'crouch' || nome === 'land';
}

type CriarCanvas = (w: number, h: number) => HTMLCanvasElement | null;

const criarDoDocumento: CriarCanvas = (w, h) => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const tingidas = new WeakMap<PoseDados, Map<string, HTMLCanvasElement>>();

/**
 * A silhueta branca do quadro `pd` pintada de `cor` (recorte do tamanho do quadro, uma vez por quadro e cor). Só as poses da esquiva passam
 * por aqui (crouch/land de cada ficha), então o cache é minúsculo. null sem DOM ou sem contexto 2D.
 */
export function silhuetaTingida(silhueta: CanvasImageSource, pd: PoseDados, cor: string, criar: CriarCanvas = criarDoDocumento): HTMLCanvasElement | null {
  let porCor = tingidas.get(pd);
  const guardada = porCor?.get(cor);
  if (guardada) return guardada;
  const c = criar(Math.max(1, Math.ceil(pd.w)), Math.max(1, Math.ceil(pd.h)));
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  g.drawImage(silhueta, pd.x, pd.y, pd.w, pd.h, 0, 0, pd.w, pd.h);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = cor;
  g.fillRect(0, 0, c.width, c.height);
  if (!porCor) {
    porCor = new Map();
    tingidas.set(pd, porCor);
  }
  porCor.set(cor, c);
  return c;
}

/**
 * Faixa de velocidade atrás do corpo na janela invulnerável: degradê `cor` -> transparente, em `lighter`, sem `shadowBlur`.
 * O sentido do deslocamento é `esquiva * facing` (1 = avanço, para o rival); a faixa fica do lado oposto.
 */
export function desenharFaixaDeEsquiva(ctx: Ctx, f: Pick<LutadorLeitura, 'x' | 'y' | 'facing' | 'esquiva' | 'invuln'>, cor: string): void {
  if (!esquivaNaJanela(f)) return;
  const sentido = (f.esquiva ?? 0) * f.facing;
  const comprimento = 150;
  const x0 = f.x;
  const x1 = f.x - sentido * comprimento;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, cor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g;
  const alto = SH * 0.5;
  ctx.fillRect(Math.min(x0, x1), f.y - SH * 0.78, comprimento, alto);
  ctx.restore();
}
