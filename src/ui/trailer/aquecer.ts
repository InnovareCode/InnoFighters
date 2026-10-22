/*
 * Aquecimento da arte FIXA antes do gesto. O 1º `drawImage` de uma imagem grande (um atlas 2048x1536, um cenário) paga a decodificação e o envio à GPU: medido em
 * 100 a 550 ms no Chromium (SwiftShader, CPU 4x), e é a causa do 1º quadro do trailer demorar. Como o boot espera o gesto de qualquer jeito, o pedaço do trailer desenha
 * cada imagem fixa (a vitrine e os cenários dela) uma vez num canvas minúsculo, UMA por tempo ocioso, enquanto a tela de "CLIQUE OU PRESSIONE" está parada. Quando o trailer
 * abre, o P0 e os planos da vitrine só desenham, sem o custo de primeira vez. Só efeito de desempenho: nenhum estado do jogo muda.
 */

export type Agendador = (f: () => void) => void;

/**
 * O canvas onde as imagens são desenhadas para aquecer. Tem de ser GRANDE (>= 256 px de lado): o Chromium não acelera canvases menores que isso, e um desenho num canvas
 * por software decodifica a imagem na CPU mas NÃO a envia à GPU, que é justamente o custo que o aquecimento tira do 1º quadro (medido: com 2x2 o plano ainda gastava 230 ms no 1º desenho).
 */
export function canvasDeAquecimento(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  return c.getContext('2d');
}

/** Um agendador de tempo ocioso (`requestIdleCallback` com prazo, ou um timeout curto onde ele não existe, como no Safari). */
export function agendadorOcioso(): Agendador {
  if (typeof requestIdleCallback === 'function') return (f) => void requestIdleCallback(() => f(), { timeout: 2500 });
  return (f) => void setTimeout(f, 120);
}

/**
 * Desenha cada imagem de `imagens` em `alvo` (o `canvasDeAquecimento`), uma por chamada do `agendar`, e para quando `cancelado()` for verdadeiro ou a lista acabar. Devolve quantas
 * desenhou até agora (para os testes). Imagens sem dimensão (ainda não carregadas) são puladas.
 */
export function aquecerImagens(imagens: readonly CanvasImageSource[], alvo: Pick<CanvasRenderingContext2D, 'drawImage'>, agendar: Agendador, cancelado: () => boolean = () => false, aoTerminar?: () => void): () => number {
  let i = 0;
  let feitas = 0;
  const passo = (): void => {
    if (cancelado() || i >= imagens.length) {
      aoTerminar?.();
      return;
    }
    const im = imagens[i++] as CanvasImageSource & { width?: number; height?: number };
    const w = im.width ?? 0;
    const h = im.height ?? 0;
    if (w > 0 && h > 0) {
      try {
        // a imagem INTEIRA reduzida a 16x16: o navegador decodifica e envia a imagem toda, não só o recorte
        alvo.drawImage(im, 0, 0, w, h, 0, 0, 16, 16);
        feitas++;
      } catch {
        /* imagem ainda não decodificável: o desenho de verdade paga o custo, como antes */
      }
    }
    agendar(passo);
  };
  agendar(passo);
  return () => feitas;
}
