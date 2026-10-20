import { criarCanvasPadrao, criarSilhuetaBranca, type CriarCanvas } from './canvas';
import { manifestoParaPoses } from '../data/atlas';
import type { Poses } from '../data/tipos';
import { validarManifesto } from './manifesto';
import { ErroDeAsset, type ManifestoAtlas } from './tipos';

/** Imagem pronta para drawImage (HTMLImageElement, ImageBitmap, canvas...). */
export type ImagemCarregada = CanvasImageSource & { readonly width: number; readonly height: number };

/**
 * Como os bytes chegam. A carga fala só com esta interface: em produção é a rede
 * (`leitorDeRede`), nos testes é um leitor falso, e nada aqui conhece public/assets/.
 */
export interface LeitorDeRecursos {
  json(url: string): Promise<unknown>;
  imagem(url: string): Promise<ImagemCarregada>;
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
};

/** Imagem de cenário: `arquivo` é relativo a `baseUrl` (ex.: assets/cenarios/jp.jpg, de data/cenarios.ts). */
export interface CenarioParaCarregar {
  readonly id: string;
  readonly arquivo: string;
}

/** O que carregar. `baseUrl` é a raiz que contém `assets/` (padrão do Vite: BASE_URL). */
export interface PlanoDeCarga {
  readonly baseUrl: string;
  readonly lutadores: readonly string[];
  readonly cenarios: readonly CenarioParaCarregar[];
}

export interface OpcoesCarga {
  readonly leitor?: LeitorDeRecursos;
  /** Recebe 0..1; cresce a cada arquivo concluído e termina em exatamente 1. */
  readonly aoProgredir?: (fracao: number) => void;
  readonly criarCanvas?: CriarCanvas;
}

/** Atlas de um lutador já carregado. A silhueta branca (flash de dano) só é criada quando pedida. */
export class AtlasLutador {
  private silhuetaCache: HTMLCanvasElement | null = null;
  private posesCache: Poses | null = null;

  constructor(
    readonly id: string,
    readonly manifesto: ManifestoAtlas,
    readonly imagem: ImagemCarregada,
    private readonly criarCanvas: CriarCanvas = criarCanvasPadrao,
  ) {}

  /** Silhueta branca sob demanda (cria na primeira chamada; chame ao entrar na luta para evitar engasgo no 1º golpe). */
  silhueta(): HTMLCanvasElement {
    this.silhuetaCache ??= criarSilhuetaBranca(this.imagem, this.criarCanvas);
    return this.silhuetaCache;
  }

  /** Poses no formato interno (POSEDATA), convertidas uma única vez por `manifestoParaPoses`. */
  poses(): Poses {
    this.posesCache ??= manifestoParaPoses(this.manifesto);
    return this.posesCache;
  }
}

export interface Recursos {
  readonly lutadores: ReadonlyMap<string, AtlasLutador>;
  readonly cenarios: ReadonlyMap<string, ImagemCarregada>;
}

const comBarra = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

export const urlManifesto = (baseUrl: string, lutador: string): string => `${comBarra(baseUrl)}assets/lutadores/${lutador}/atlas.json`;
export const urlAtlas = (baseUrl: string, lutador: string, arquivo: string): string => `${comBarra(baseUrl)}assets/lutadores/${lutador}/${arquivo}`;
export const urlCenario = (baseUrl: string, arquivo: string): string => `${comBarra(baseUrl)}${arquivo.replace(/^\/+/, '')}`;

/** Quantos arquivos o plano baixa (manifesto + imagem por lutador, imagem por cenário). */
export const totalDeArquivos = (plano: PlanoDeCarga): number => plano.lutadores.length * 2 + plano.cenarios.length;

/**
 * Carrega manifestos, atlas e cenários em paralelo, relatando o progresso. Rejeita no primeiro
 * erro, com mensagem dizendo qual arquivo falhou (manifesto inválido, imagem de outro tamanho...).
 */
export async function carregarRecursos(plano: PlanoDeCarga, opcoes: OpcoesCarga = {}): Promise<Recursos> {
  const leitor = opcoes.leitor ?? leitorDeRede;
  const total = totalDeArquivos(plano);
  let feitos = 0;
  const avancar = (): void => {
    feitos++;
    opcoes.aoProgredir?.(total === 0 ? 1 : feitos / total);
  };
  if (total === 0) opcoes.aoProgredir?.(1);

  const lutadores = new Map<string, AtlasLutador>();
  const cenarios = new Map<string, ImagemCarregada>();

  const carregarLutador = async (id: string): Promise<void> => {
    const urlJson = urlManifesto(plano.baseUrl, id);
    const manifesto = validarManifesto(await leitor.json(urlJson), urlJson);
    avancar();
    const urlImagem = urlAtlas(plano.baseUrl, id, manifesto.imagem);
    const imagem = await leitor.imagem(urlImagem);
    if (imagem.width !== manifesto.tamanho[0] || imagem.height !== manifesto.tamanho[1]) {
      throw new ErroDeAsset(
        `${urlImagem}: tem ${imagem.width}x${imagem.height}, o manifesto diz ${manifesto.tamanho[0]}x${manifesto.tamanho[1]}`,
        urlImagem,
      );
    }
    avancar();
    lutadores.set(id, new AtlasLutador(id, manifesto, imagem, opcoes.criarCanvas));
  };

  const carregarCenario = async (c: CenarioParaCarregar): Promise<void> => {
    cenarios.set(c.id, await leitor.imagem(urlCenario(plano.baseUrl, c.arquivo)));
    avancar();
  };

  await Promise.all([...plano.lutadores.map(carregarLutador), ...plano.cenarios.map(carregarCenario)]);
  return { lutadores, cenarios };
}
