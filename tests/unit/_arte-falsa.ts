/*
 * Arte falsa para os testes da residência de memória (docs/spec-residencia-de-memoria.md): atlas com tamanho de página e número de páginas escolhidos (o PESO
 * sai do manifesto), cenários 1920 x 1080 e folhas FILME, tudo como OBJETOS com largura e altura (nada é decodificado). O leitor registra cada pedido e deixa
 * SEGURAR uma imagem até o teste soltar, para provar o que acontece com carga em andamento.
 */
import type { CriarCanvas } from '../../src/assets/canvas';
import { carregarManifestos, type AtlasLutador, type ImagemCarregada, type LeitorDeRecursos } from '../../src/assets/carregador';
import type { CenarioParaCarregar } from '../../src/assets/carregador';

export const MIB = 1024 * 1024;

export interface DefDeAtlas {
  /** Número de páginas (padrão 1). */
  readonly paginas?: number;
  /** Tamanho de CADA página (padrão 1024 x 1024 = 4 MiB). */
  readonly tamanho?: readonly [number, number];
  /** Folha FILME (tamanho). Ausente = sem filme. */
  readonly filme?: readonly [number, number];
}

const quadro = (x: number) => ({ x, y: 0, w: 10, h: 20, ax: 5, p: 0 });

export function manifestoFalso(id: string, d: DefDeAtlas = {}): unknown {
  const n = d.paginas ?? 1;
  const tamanho = d.tamanho ?? [1024, 1024];
  return {
    versao: 2,
    lutador: id,
    imagens: Array.from({ length: n }, (_, i) => `atlas-${i}.webp`),
    tamanho,
    alturaRef: 20,
    quadros: { idle0: quadro(0), guard: quadro(0), punch: quadro(10) },
    retrato: { arquivo: 'retrato.png', recorte: [2, 2, 190, 190] },
    ...(d.filme
      ? { filme: { imagem: 'filme.webp', tamanho: d.filme, quadros: { f0: { x: 0, y: 0, w: 30, h: 30, ax: 15, painel: true, p: 0 } } } }
      : {}),
  };
}

export const criarCanvasFalso: CriarCanvas = (w, h) => ({ width: w, height: h, getContext: () => ({ drawImage() {}, fillRect() {} }) }) as unknown as HTMLCanvasElement;

export function leitorFalso(defs: Record<string, DefDeAtlas>, retrato: readonly [number, number] = [195, 194]) {
  const imagens: string[] = [];
  const segurados: Array<{ leitura: RegExp; liberar: () => void; pronto: Promise<void> }> = [];
  let observador: ((url: string) => void) | null = null;
  const l: LeitorDeRecursos = {
    async json(url) {
      const m = /lutadores\/([^/]+)\/atlas\.json/.exec(url);
      const def = m?.[1] ? defs[m[1]] : undefined;
      if (!m?.[1] || !def) throw new Error(`404 ${url}`);
      return manifestoFalso(m[1], def);
    },
    async imagem(url) {
      imagens.push(url);
      observador?.(url);
      for (const s of segurados) if (s.leitura.test(url)) await s.pronto;
      return { width: tamanhoDa(url, defs, retrato)[0], height: tamanhoDa(url, defs, retrato)[1], url } as unknown as ImagemCarregada;
    },
    async prebuscar() {},
  };
  return {
    l,
    imagens,
    /** Chama `f` no instante em que cada imagem é pedida (antes de "decodificar"). */
    aoPedirImagem: (f: ((url: string) => void) | null) => {
      observador = f;
    },
    /** Segura as imagens cujo caminho casa com `leitura` até chamar o `liberar` devolvido. */
    segurar(leitura: RegExp): () => void {
      let liberar = (): void => undefined;
      const pronto = new Promise<void>((r) => (liberar = r));
      segurados.push({ leitura, liberar, pronto });
      return liberar;
    },
  };
}

function tamanhoDa(url: string, defs: Record<string, DefDeAtlas>, retrato: readonly [number, number]): readonly [number, number] {
  if (/\/assets\/cenarios\//.test(url)) return [1920, 1080];
  const m = /lutadores\/([^/]+)\/(.+)$/.exec(url);
  const def = m?.[1] ? defs[m[1]] : undefined;
  if (m?.[2] === 'retrato.png') return retrato;
  if (m?.[2] === 'filme.webp') return def?.filme ?? [1, 1];
  return def?.tamanho ?? [1024, 1024];
}

export const CENARIOS_FALSOS: ReadonlyMap<string, CenarioParaCarregar> = new Map(
  ['jp', 'cn', 'kr', 'br', 'ng', 'mx'].map((id) => [id, { id, arquivo: `assets/cenarios/cenario-${id}.webp` }]),
);

/** Carrega os manifestos falsos (com o cache de silhuetas, se o teste passar um) e devolve o mapa de atlas. */
export async function atlasFalsos(defs: Record<string, DefDeAtlas>, leitor: LeitorDeRecursos, silhuetas?: import('../../src/assets/silhuetas').CacheDeSilhuetas): Promise<Map<string, AtlasLutador>> {
  return carregarManifestos('/', Object.keys(defs), leitor, criarCanvasFalso, undefined, silhuetas);
}
