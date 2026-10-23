export type CriarCanvas = (largura: number, altura: number) => HTMLCanvasElement;

export const criarCanvasPadrao: CriarCanvas = (largura, altura) => {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  return c;
};

/** O retângulo de um quadro dentro da página do atlas (em pixels da imagem). */
/** Pixels de vizinhança copiados em volta do quadro (ver `criarSilhuetaBranca`). */
export const MARGEM_DA_SILHUETA = 1;

export type RetanguloDoQuadro = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/**
 * Silhueta branca de UM quadro (os mesmos pixels opacos, tudo branco). Desenhada por cima do lutador com alfa variável, vira o flash de dano.
 * O canvas tem o tamanho do QUADRO mais `MARGEM_DA_SILHUETA` px de cada lado (cópia dos vizinhos da página): quem desenha usa o retângulo
 * (MARGEM, MARGEM, w, h) como fonte, não (x, y, w, h) da página. Antes era a página inteira (2 a 7 MP por página, cara no iPhone); o quadro tem ~0,1 MP.
 * A margem existe por fidelidade, MEDIDA no Chromium: ao ampliar/reduzir (K diferente de 1) o desenho amostra 1 px além do recorte, e sem a margem
 * as bordas do flash diferiam da silhueta da página inteira (15 a 247 px de 40 mil, a 255); com 1 px, 0 diferenças em K 0,7 e 1,32.
 *
 * NUNCA lança: sem contexto 2D (o iPhone acima do teto de canvas devolve `getContext` nulo) ou com a fábrica falhando, devolve null e o
 * flash simplesmente não aparece (quem desenha já trata a silhueta ausente). A luta não cai por causa de um brilho.
 */
export function criarSilhuetaBranca(
  imagem: CanvasImageSource,
  quadro: RetanguloDoQuadro,
  criarCanvas: CriarCanvas = criarCanvasPadrao,
): HTMLCanvasElement | null {
  try {
    const M = MARGEM_DA_SILHUETA;
    const c = criarCanvas(Math.max(1, Math.ceil(quadro.w)) + 2 * M, Math.max(1, Math.ceil(quadro.h)) + 2 * M);
    const g = c.getContext('2d');
    if (!g) {
      liberarCanvas(c);
      return null;
    }
    // a margem é recortada na borda da página (fonte fora da imagem faz o navegador esticar o desenho)
    const { width: W, height: H } = imagem as { width?: number; height?: number };
    const sx = Math.max(0, quadro.x - M);
    const sy = Math.max(0, quadro.y - M);
    const sx2 = Math.min(typeof W === 'number' ? W : Infinity, quadro.x + quadro.w + M);
    const sy2 = Math.min(typeof H === 'number' ? H : Infinity, quadro.y + quadro.h + M);
    g.drawImage(imagem, sx, sy, sx2 - sx, sy2 - sy, sx - (quadro.x - M), sy - (quadro.y - M), sx2 - sx, sy2 - sy);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  } catch {
    return null;
  }
}

/** Zera o canvas para o navegador devolver a memória dele já (no iOS, o teto é de canvases VIVOS, não de referências). */
export function liberarCanvas(c: { width: number; height: number }): void {
  try {
    c.width = 0;
    c.height = 0;
  } catch {
    // canvas de teste sem setter: nada a liberar
  }
}
