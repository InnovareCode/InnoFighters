import type { Ctx } from './tela';

/** Região da folha usada como rosto: [x, y, largura, altura] em px da imagem. */
export type RecorteRosto = readonly [number, number, number, number];

/** Retrato do lutador num quadrado, sobre degradê de fundo. Porte de drawPortrait. */
export function desenharRetrato(
  ctx: Ctx,
  imagem: CanvasImageSource,
  recorte: RecorteRosto,
  x: number,
  y: number,
  tamanho: number,
  espelhar: boolean,
  fundo?: readonly [string, string],
): void {
  const [sx, sy, sw, sh] = recorte;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, tamanho, tamanho);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + tamanho);
  g.addColorStop(0, fundo ? fundo[0] : '#2b3f8f');
  g.addColorStop(1, fundo ? fundo[1] : '#0c1233');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, tamanho, tamanho);
  if (espelhar) {
    ctx.translate(x + tamanho, y);
    ctx.scale(-1, 1);
    ctx.drawImage(imagem, sx, sy, sw, sh, 0, 0, tamanho, tamanho);
  } else {
    ctx.drawImage(imagem, sx, sy, sw, sh, x, y, tamanho, tamanho);
  }
  ctx.restore();
}

/** Retrato com moldura dupla (HUD de luta). Porte de framedPortrait. */
export function desenharRetratoMoldurado(
  ctx: Ctx,
  imagem: CanvasImageSource,
  recorte: RecorteRosto,
  x: number,
  y: number,
  tamanho: number,
  espelhar: boolean,
): void {
  desenharRetrato(ctx, imagem, recorte, x, y, tamanho, espelhar);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0a0a14';
  ctx.strokeRect(x, y, tamanho, tamanho);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e8eefc';
  ctx.strokeRect(x + 2, y + 2, tamanho - 4, tamanho - 4);
}
