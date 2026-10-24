export type CriarCanvas = (largura: number, altura: number) => HTMLCanvasElement;

export const criarCanvasPadrao: CriarCanvas = (largura, altura) => {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  return c;
};

/**
 * D3d (docs/desempenho-android-2026-10-24.md §5.4): o 1º `drawImage` de uma página grande (a folha FILME, 1920x1280) paga a DECODIFICAÇÃO e o upload
 * da textura inteira no meio da luta (picos de 290-440 ms a 4x no 1º especial/KO). Desenha 1 px dela num canvas de 2x2 fora da tela (e lê o pixel, que
 * força a rasterização) assim que a página chega, para o custo cair no começo da luta e não no 1º especial. Nunca lança; sem DOM não faz nada.
 */
export function aquecerTextura(imagem: CanvasImageSource): void {
  if (typeof document === 'undefined') return;
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const g = c.getContext('2d');
    if (!g) return;
    g.drawImage(imagem, 0, 0, 1, 1, 0, 0, 1, 1);
    g.getImageData(0, 0, 1, 1);
  } catch {
    // imagem sem dimensão / contexto indisponível: o 1º desenho de verdade paga, como antes
  }
}

/** O retângulo de um quadro dentro da página do atlas (em pixels da imagem). */
export type RetanguloDoQuadro = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/**
 * Recorte da silhueta de um quadro: o retângulo do quadro com `MARGEM_DA_SILHUETA` px de vizinhança, com os cantos arredondados para MÚLTIPLOS de
 * `ALINHAMENTO_DA_SILHUETA` na página. Existe por fidelidade com a silhueta da página inteira (o que o protótipo desenha), MEDIDO no Chromium
 * (fidelidade-prototipo > desenharPose, flash a 0,6 de alfa, qualidade `high`, escala de tela < 1):
 *  - ALINHAMENTO: ao REDUZIR a imagem o navegador amostra a cadeia de mipmaps do canvas de origem, e os blocos de 2x2, 4x4, 8x8... pixels são contados a
 *    partir da ORIGEM do canvas. Um recorte que começa num x qualquer desloca os blocos em relação à página e muda a cor das bordas (5509 px, até 25 níveis,
 *    nas 48 células do oráculo). Origem na página múltipla de 8 = blocos idênticos até a escala de tela 1/8.
 *  - MARGEM: o filtro lê vizinhos além do quadro; com 8 px (e o alinhamento) a diferença para a página inteira é ZERO (máx. 1 nível, arredondamento) em escalas
 *    de tela de 0,12 a 3,6. Só alinhamento ou só margem, de 1 a 32 px, deixou de 14 a 25 mil px diferentes.
 *  - EIXO DE TAMANHO ÍMPAR: página cuja largura ou altura NÃO é múltipla de 8 (só os atlas originais do protótipo, ex. 3600x2251) tem a cadeia de mipmaps
 *    com filtro de 3 amostras nos níveis ímpares, e nenhum recorte menor reproduz isso (1184 px diferentes, até 21 níveis, mesmo com a margem e o alinhamento,
 *    e só zera com a ALTURA da página inteira). Nesse eixo o recorte é a página inteira. Os atlas de produção são todos múltiplos de 8 (orçamento: páginas
 *    <= 2048), então lá o recorte é o justo.
 * Custo: ~10% a mais de memória que o quadro justo. Escala de tela abaixo de 1/8 (nenhum flash é desenhado tão pequeno) volta a diferir de leve.
 */
export const ALINHAMENTO_DA_SILHUETA = 8;
export const MARGEM_DA_SILHUETA = 8;

type Eixo = { readonly inicio: number; readonly fim: number };

/** O recorte de um eixo: o quadro `[v, v + tamanho)` numa página de `pagina` px (Infinity = não sei: trata como alinhável). */
function recorteDoEixo(v: number, tamanho: number, pagina: number): Eixo {
  if (Number.isFinite(pagina) && pagina % ALINHAMENTO_DA_SILHUETA !== 0) return { inicio: 0, fim: pagina };
  return {
    inicio: Math.max(0, Math.floor((v - MARGEM_DA_SILHUETA) / ALINHAMENTO_DA_SILHUETA) * ALINHAMENTO_DA_SILHUETA),
    fim: Math.min(pagina, Math.ceil((v + tamanho + MARGEM_DA_SILHUETA) / ALINHAMENTO_DA_SILHUETA) * ALINHAMENTO_DA_SILHUETA),
  };
}

const origens = new WeakMap<object, { readonly x: number; readonly y: number }>();

/**
 * Onde o quadro começa DENTRO do canvas da silhueta `silhueta`: a fonte do `drawImage` é (x, y, w, h) deste ponto, não da página. Vale o que
 * `criarSilhuetaBranca` registrou; para qualquer outro objeto (um dublê de teste) vale o recorte padrão de uma página alinhável.
 */
export function origemDaSilhueta(silhueta: object, quadro: Pick<RetanguloDoQuadro, 'x' | 'y'>): { readonly x: number; readonly y: number } {
  return (
    origens.get(silhueta) ?? {
      x: quadro.x - recorteDoEixo(quadro.x, 0, Infinity).inicio,
      y: quadro.y - recorteDoEixo(quadro.y, 0, Infinity).inicio,
    }
  );
}

/**
 * Silhueta branca de UM quadro (os mesmos pixels opacos, tudo branco). Desenhada por cima do lutador com alfa variável, vira o flash de dano.
 * O canvas cobre o recorte descrito acima (não a página inteira: 2 a 7 MP por página, cara no iPhone); quem desenha usa `origemDaSilhueta(canvas, quadro)`
 * como origem da fonte.
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
    const { width: W, height: H } = imagem as { width?: number; height?: number };
    const ex = recorteDoEixo(quadro.x, quadro.w, typeof W === 'number' ? W : Infinity);
    const ey = recorteDoEixo(quadro.y, quadro.h, typeof H === 'number' ? H : Infinity);
    const c = criarCanvas(Math.max(1, ex.fim - ex.inicio), Math.max(1, ey.fim - ey.inicio));
    const g = c.getContext('2d');
    if (!g) {
      liberarCanvas(c);
      return null;
    }
    g.drawImage(imagem, ex.inicio, ey.inicio, c.width, c.height, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    origens.set(c, { x: quadro.x - ex.inicio, y: quadro.y - ey.inicio });
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
