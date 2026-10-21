import { manifestoParaPoses } from '../data/atlas';
import type { PoseDados, Poses } from '../data/tipos';
import { criarCanvasPadrao, criarSilhuetaBranca, type CriarCanvas } from './canvas';
import { paraManifestoV1, validarManifesto, validarRetrato } from './manifesto';
import { ErroDeAsset, type ManifestoC1, type Quatro, type RetratoDef } from './tipos';

/** Imagem pronta para drawImage (HTMLImageElement, ImageBitmap, canvas...). */
export type ImagemCarregada = CanvasImageSource & { readonly width: number; readonly height: number };

/**
 * Como os bytes chegam. A carga fala só com esta interface: em produção é a rede
 * (`leitorDeRede`), nos testes é um leitor falso, e nada aqui conhece public/assets/.
 */
export interface LeitorDeRecursos {
  json(url: string): Promise<unknown>;
  imagem(url: string): Promise<ImagemCarregada>;
  /** Só baixa (aquece o cache HTTP), sem decodificar nem guardar. Opcional: sem ele, não pré-busca. */
  prebuscar?(url: string): Promise<void>;
}

export const leitorDeRede: LeitorDeRecursos = {
  async json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new ErroDeAsset(`Falha ao carregar ${url} (HTTP ${r.status})`, url);
    return r.json() as Promise<unknown>;
  },
  imagem(url) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new ErroDeAsset(`Falha ao carregar ${url}`, url));
      im.src = url;
    });
  },
  async prebuscar(url) {
    const r = await fetch(url, { priority: 'low' } as RequestInit);
    if (!r.ok) throw new ErroDeAsset(`Falha ao pre-buscar ${url} (HTTP ${r.status})`, url);
    await r.arrayBuffer(); // consome o corpo para o navegador guardar no cache
  },
};

/** Imagem de cenário: `arquivo` é relativo a `baseUrl` (ex.: assets/cenarios/jp.jpg, de data/cenarios.ts). */
export interface CenarioParaCarregar {
  readonly id: string;
  readonly arquivo: string;
}

/** O que carregar (modo "tudo de uma vez"). `baseUrl` é a raiz que contém `assets/` (padrão do Vite: BASE_URL). */
export interface PlanoDeCarga {
  readonly baseUrl: string;
  readonly lutadores: readonly string[];
  readonly cenarios: readonly CenarioParaCarregar[];
}

export interface OpcoesCarga {
  readonly leitor?: LeitorDeRecursos;
  /** Recebe 0..1; nunca diminui e termina em exatamente 1. */
  readonly aoProgredir?: (fracao: number) => void;
  readonly criarCanvas?: CriarCanvas;
}

const comBarra = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

export const urlManifesto = (baseUrl: string, lutador: string): string => `${comBarra(baseUrl)}assets/lutadores/${lutador}/atlas.json`;
export const urlAtlas = (baseUrl: string, lutador: string, arquivo: string): string => `${comBarra(baseUrl)}assets/lutadores/${lutador}/${arquivo}`;
export const urlCenario = (baseUrl: string, arquivo: string): string => `${comBarra(baseUrl)}${arquivo.replace(/^\/+/, '')}`;
/** Sidecar do retrato (para atlas v1 antigos que não têm o campo `retrato` no atlas.json). */
export const urlRetratoJson = (baseUrl: string, lutador: string): string => `${comBarra(baseUrl)}assets/lutadores/${lutador}/retrato.json`;

/** Rosto pronto para desenhar: a imagem e a região dela a usar. */
export interface RetratoPronto {
  readonly imagem: CanvasImageSource;
  readonly recorte: Quatro;
}

/**
 * Atlas de um lutador. Os metadados (manifesto C1, poses) existem desde o boot; as IMAGENS (uma ou mais páginas)
 * só existem depois de `carregarImagens()` e somem em `liberar()` (carga sob demanda, docs/plano-expansao.md 1.5).
 * O retrato (imagem pequena para seleção e HUD) é independente do atlas. A silhueta branca (flash de dano) é criada
 * só quando alguém pede.
 */
export class AtlasLutador {
  private paginas: ImagemCarregada[] | null = null;
  private emCarga: Promise<void> | null = null;
  private silhuetas: Array<HTMLCanvasElement | undefined> = [];
  private posesCache: Poses | null = null;
  /** Página de cada objeto de pose devolvido por `poses()` (chave: a própria pose, que `getPD` devolve). */
  private readonly paginaDoQuadro = new WeakMap<object, number>();
  private retratoImg: ImagemCarregada | null = null;
  private retratoDef: RetratoDef | null;

  constructor(
    readonly id: string,
    readonly manifesto: ManifestoC1,
    private readonly baseUrl: string,
    private readonly criarCanvas: CriarCanvas = criarCanvasPadrao,
  ) {
    this.retratoDef = manifesto.retrato ?? null;
  }

  /** As imagens do atlas estão na memória? */
  get pronta(): boolean {
    return this.paginas !== null;
  }

  get paginasCarregadas(): number {
    return this.paginas?.length ?? 0;
  }

  /** Página 0 (atlas v1 = a única imagem). Falha clara se ainda não carregou. */
  get imagem(): ImagemCarregada {
    const p = this.paginas?.[0];
    if (!p) throw new ErroDeAsset(`atlas de "${this.id}" ainda nao foi carregado`, this.id);
    return p;
  }

  /** Imagem da página em que o quadro `pd` (objeto devolvido por `poses()`/`getPD`) está; null se não carregada. */
  imagemDe(pd: PoseDados): ImagemCarregada | null {
    return this.paginas?.[this.paginaDoQuadro.get(pd) ?? 0] ?? null;
  }

  /** Silhueta branca da página 0 sob demanda (cria na primeira chamada). */
  silhueta(): HTMLCanvasElement {
    return this.silhuetaDaPagina(0);
  }

  /** Silhueta branca da página do quadro `pd`; null se o atlas não está carregado. */
  silhuetaDe(pd: PoseDados): HTMLCanvasElement | null {
    if (!this.paginas) return null;
    return this.silhuetaDaPagina(this.paginaDoQuadro.get(pd) ?? 0);
  }

  private silhuetaDaPagina(p: number): HTMLCanvasElement {
    const img = this.paginas?.[p];
    if (!img) throw new ErroDeAsset(`atlas de "${this.id}" ainda nao foi carregado`, this.id);
    this.silhuetas[p] ??= criarSilhuetaBranca(img, this.criarCanvas);
    return this.silhuetas[p] as HTMLCanvasElement;
  }

  /** Poses no formato interno (POSEDATA), convertidas uma única vez por `manifestoParaPoses`. */
  poses(): Poses {
    if (this.posesCache) return this.posesCache;
    const poses = manifestoParaPoses(paraManifestoV1(this.manifesto));
    for (const [nome, pd] of Object.entries(poses)) this.paginaDoQuadro.set(pd, this.manifesto.quadros[nome]?.p ?? 0);
    this.posesCache = poses;
    return poses;
  }

  /** Página do quadro `nome` do manifesto (0 se não existir). */
  paginaDe(nome: string): number {
    return this.manifesto.quadros[nome]?.p ?? 0;
  }

  /**
   * O rosto para seleção e HUD: o retrato próprio se carregado; senão recorta o `head` do atlas (se carregado);
   * senão null (quem desenha mostra só o fundo da moldura).
   */
  retrato(head: Quatro): RetratoPronto | null {
    if (this.retratoImg) {
      const r = this.retratoDef?.recorte;
      return { imagem: this.retratoImg, recorte: r ?? [0, 0, this.retratoImg.width, this.retratoImg.height] };
    }
    const q = this.manifesto.quadros['guard'] ?? this.manifesto.quadros['idle0'];
    const pagina = this.paginas?.[q?.p ?? 0];
    return pagina ? { imagem: pagina, recorte: head } : null;
  }

  get temRetrato(): boolean {
    return this.retratoImg !== null;
  }

  /** Carrega as páginas do atlas (idempotente; chamadas simultâneas dividem a mesma carga). */
  carregarImagens(leitor: LeitorDeRecursos, aoPagina?: () => void): Promise<void> {
    if (this.paginas) return Promise.resolve();
    this.emCarga ??= (async () => {
      const m = this.manifesto;
      const imgs = await Promise.all(
        m.imagens.map(async (arquivo) => {
          const url = urlAtlas(this.baseUrl, this.id, arquivo);
          const imagem = await leitor.imagem(url);
          if (imagem.width !== m.tamanho[0] || imagem.height !== m.tamanho[1]) {
            throw new ErroDeAsset(`${url}: tem ${imagem.width}x${imagem.height}, o manifesto diz ${m.tamanho[0]}x${m.tamanho[1]}`, url);
          }
          aoPagina?.();
          return imagem;
        }),
      );
      this.paginas = imgs;
    })().finally(() => {
      this.emCarga = null;
    });
    return this.emCarga;
  }

  /** Só baixa as páginas (cache HTTP), sem decodificar. */
  async prebuscarImagens(leitor: LeitorDeRecursos): Promise<void> {
    if (this.paginas || !leitor.prebuscar) return;
    await Promise.all(this.manifesto.imagens.map((a) => leitor.prebuscar?.(urlAtlas(this.baseUrl, this.id, a))));
  }

  /** Solta as imagens do atlas (os metadados e o retrato ficam). */
  liberar(): void {
    this.paginas = null;
    this.silhuetas = [];
  }

  /**
   * Carrega o retrato: o campo `retrato` do manifesto ou, na falta dele, o sidecar `retrato.json`.
   * Sem retrato nenhum devolve false (o atlas serve de recurso: ver `retrato()`).
   */
  async carregarRetrato(leitor: LeitorDeRecursos): Promise<boolean> {
    if (this.retratoImg) return true;
    if (!this.retratoDef) {
      try {
        this.retratoDef = validarRetrato(await leitor.json(urlRetratoJson(this.baseUrl, this.id)), `${this.id}/retrato.json`);
      } catch {
        return false; // sem sidecar: usa o recorte do atlas
      }
    }
    try {
      this.retratoImg = await leitor.imagem(urlAtlas(this.baseUrl, this.id, this.retratoDef.arquivo));
      return true;
    } catch {
      this.retratoDef = null;
      return false;
    }
  }
}

export interface Recursos {
  readonly lutadores: ReadonlyMap<string, AtlasLutador>;
  readonly cenarios: ReadonlyMap<string, ImagemCarregada>;
}

/** Quantos arquivos o plano baixa se todos os atlas forem de 1 página (manifesto + imagem por lutador, imagem por cenário). */
export const totalDeArquivos = (plano: PlanoDeCarga): number => plano.lutadores.length * 2 + plano.cenarios.length;

/** Progresso que nunca recua (o total real só se conhece depois de ler os manifestos) e termina em 1. */
export function progressoMonotono(aoProgredir?: (f: number) => void): (fracao: number) => void {
  let maximo = 0;
  return (f) => {
    maximo = Math.max(maximo, Math.min(1, f));
    aoProgredir?.(maximo);
  };
}

/** Lê e valida o atlas.json de cada lutador (sem baixar imagens). Rejeita no primeiro erro, dizendo qual arquivo. */
export async function carregarManifestos(
  baseUrl: string,
  ids: readonly string[],
  leitor: LeitorDeRecursos,
  criarCanvas?: CriarCanvas,
  aoManifesto?: () => void,
): Promise<Map<string, AtlasLutador>> {
  const mapa = new Map<string, AtlasLutador>();
  await Promise.all(
    ids.map(async (id) => {
      const url = urlManifesto(baseUrl, id);
      const m = validarManifesto(await leitor.json(url), url);
      mapa.set(id, new AtlasLutador(id, m, baseUrl, criarCanvas));
      aoManifesto?.();
    }),
  );
  // mantém a ordem pedida (o Promise.all termina fora de ordem)
  return new Map(ids.map((id) => [id, mapa.get(id) as AtlasLutador]));
}

/**
 * Carrega manifestos, TODAS as páginas dos atlas e cenários em paralelo, relatando o progresso. Rejeita no primeiro
 * erro, com mensagem dizendo qual arquivo falhou (manifesto inválido, imagem de outro tamanho...). É o caminho
 * "tudo de uma vez"; o jogo usa o `GerenciadorDeArte` (carga sob demanda).
 */
export async function carregarRecursos(plano: PlanoDeCarga, opcoes: OpcoesCarga = {}): Promise<Recursos> {
  const leitor = opcoes.leitor ?? leitorDeRede;
  const relatar = progressoMonotono(opcoes.aoProgredir);
  let total = totalDeArquivos(plano);
  let feitos = 0;
  const avancar = (): void => {
    feitos++;
    relatar(total === 0 ? 1 : feitos / total);
  };
  if (total === 0) relatar(1);

  const cenarios = new Map<string, ImagemCarregada>();
  const carregarCenario = async (c: CenarioParaCarregar): Promise<void> => {
    cenarios.set(c.id, await leitor.imagem(urlCenario(plano.baseUrl, c.arquivo)));
    avancar();
  };

  const [atlas] = await Promise.all([
    (async () => {
      const mapa = await carregarManifestos(plano.baseUrl, plano.lutadores, leitor, opcoes.criarCanvas, avancar);
      // cada página além da primeira acrescenta um arquivo ao total (a 1ª já estava contada)
      for (const a of mapa.values()) total += a.manifesto.imagens.length - 1;
      await Promise.all([...mapa.values()].map((a) => a.carregarImagens(leitor, avancar)));
      return mapa;
    })(),
    ...plano.cenarios.map(carregarCenario),
  ]);
  return { lutadores: atlas, cenarios };
}
