import { criarSilhuetaBranca, liberarCanvas, type CriarCanvas, type RetanguloDoQuadro } from './canvas';

/** Teto de memória das silhuetas vivas (docs/orcamentos-2026-10-23.md T2): w x h x 4 bytes de cada quadro. */
export const ORCAMENTO_DE_SILHUETAS = 6 * 1024 * 1024;

/** Depois de uma falha (sem canvas/contexto), quantos pedidos passam sem nem tentar: não martelar um aparelho que já está no teto. */
export const PEDIDOS_SEM_TENTAR_APOS_FALHA = 90;

interface Entrada {
  readonly canvas: HTMLCanvasElement;
  readonly bytes: number;
}

/**
 * Silhuetas brancas POR QUADRO (o flash de dano e o rastro de imagens), sob demanda, com teto de memória e descarte do menos recente.
 * Compartilhado por todos os atlas (um só teto para o jogo todo). A ordem do `Map` é a do uso: o primeiro é o mais antigo.
 *
 * Falha de canvas nunca vira exceção: `obter` devolve null (o desenho pula o flash). Depois de uma falha o cache solta TUDO que tem (a
 * memória liberada pode ser o que faltava) e fica `PEDIDOS_SEM_TENTAR_APOS_FALHA` pedidos sem tentar de novo.
 */
export class CacheDeSilhuetas {
  private readonly mapa = new Map<string, Entrada>();
  private usados = 0;
  private espera = 0;

  constructor(
    readonly orcamento: number = ORCAMENTO_DE_SILHUETAS,
    private readonly criarCanvas?: CriarCanvas,
  ) {}

  /** Bytes (w x h x 4) das silhuetas vivas. */
  get bytes(): number {
    return this.usados;
  }

  get tamanho(): number {
    return this.mapa.size;
  }

  /**
   * A silhueta do quadro `quadro` de `imagem`. `chave` identifica o quadro (o atlas, a página e o retângulo); `criarCanvas` do atlas vence o do
   * cache (os testes injetam a fábrica no atlas).
   */
  obter(chave: string, imagem: CanvasImageSource, quadro: RetanguloDoQuadro, criarCanvas?: CriarCanvas): HTMLCanvasElement | null {
    const guardada = this.mapa.get(chave);
    if (guardada) {
      this.mapa.delete(chave); // reinsere no fim: é o mais recente
      this.mapa.set(chave, guardada);
      return guardada.canvas;
    }
    if (this.espera > 0) {
      this.espera--;
      return null;
    }
    const canvas = criarSilhuetaBranca(imagem, quadro, criarCanvas ?? this.criarCanvas);
    if (!canvas) {
      this.soltarTudo();
      this.espera = PEDIDOS_SEM_TENTAR_APOS_FALHA;
      return null;
    }
    const bytes = canvas.width * canvas.height * 4;
    // abre espaço ANTES de guardar; uma silhueta maior que o teto inteiro fica sozinha (melhor um flash que nenhum)
    while (this.usados + bytes > this.orcamento && this.mapa.size > 0) this.soltarMaisAntiga();
    this.mapa.set(chave, { canvas, bytes });
    this.usados += bytes;
    return canvas;
  }

  /** Solta (e zera o canvas de) tudo cujo identificador começa por `prefixo` (um atlas que saiu da memória). */
  soltarPrefixo(prefixo: string): void {
    for (const [chave, e] of [...this.mapa]) {
      if (!chave.startsWith(prefixo)) continue;
      this.mapa.delete(chave);
      this.usados -= e.bytes;
      liberarCanvas(e.canvas);
    }
  }

  soltarTudo(): void {
    for (const e of this.mapa.values()) liberarCanvas(e.canvas);
    this.mapa.clear();
    this.usados = 0;
  }

  private soltarMaisAntiga(): void {
    const primeira = this.mapa.entries().next();
    if (primeira.done) return;
    const [chave, e] = primeira.value;
    this.mapa.delete(chave);
    this.usados -= e.bytes;
    liberarCanvas(e.canvas);
  }
}
