export type CriarCanvas = (largura: number, altura: number) => HTMLCanvasElement;

export const criarCanvasPadrao: CriarCanvas = (largura, altura) => {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  return c;
};

/**
 * Silhueta branca de uma imagem (mesmos pixels opacos, tudo branco). Desenhada por cima do
 * lutador com alfa variável, vira o flash de dano. Porte da criação de IMG[id + '_w'].
 */
export function criarSilhuetaBranca(
  imagem: CanvasImageSource & { readonly width: number; readonly height: number },
  criarCanvas: CriarCanvas = criarCanvasPadrao,
): HTMLCanvasElement {
  const c = criarCanvas(imagem.width, imagem.height);
  const g = c.getContext('2d');
  if (!g) throw new Error('contexto 2D indisponivel');
  g.drawImage(imagem, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
