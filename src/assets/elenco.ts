import { IDS_LUTADORES, type IdLutador } from '../core/contratos';
import { CENARIO_PADRAO, CENARIOS } from '../data/cenarios';
import { LUTADORES, VITRINE } from '../data/lutadores';
import { montarLutador, type LutadorMontado } from '../data/montar';
import type { PoseDados } from '../data/tipos';
import { carregarManifestos, leitorDeRede, progressoMonotono, type AtlasLutador, type LeitorDeRecursos, type PlanoDeCarga, type Recursos, type RetratoPronto } from './carregador';
import type { CriarCanvas } from './canvas';
import { GerenciadorDeArte, type PoliticaDeResidencia } from './gerenciador';
import { CacheDeSilhuetas } from './silhuetas';
import type { Quatro } from './tipos';

/**
 * O que o desenho precisa da arte de um lutador. O atlas pode ter VÁRIAS páginas (C1 v2) e pode não estar na memória
 * (carga sob demanda): por isso a imagem e a silhueta são pedidas POR QUADRO e podem ser nulas; quem desenha pula
 * o desenho quando vier null (o lutador aparece quando a arte chega).
 */
export interface ArteLutador {
  /** As imagens do atlas estão na memória? */
  readonly pronta: boolean;
  /** Imagem da página em que está o quadro `pd` (o objeto devolvido por `getPD`); null se não carregada. */
  imagemDe(pd: PoseDados): CanvasImageSource | null;
  /** Silhueta branca (flash de dano) do QUADRO `pd` (canvas do recorte do quadro; fonte em `origemDaSilhueta(canvas, pd)`), criada sob demanda; null se não carregada ou sem canvas/contexto (nunca lança). */
  silhuetaDe(pd: PoseDados): CanvasImageSource | null;
  /** Rosto para seleção e HUD (retrato próprio, ou o recorte do atlas); null se nada está carregado. */
  retrato(head: Quatro): RetratoPronto | null;
}

/** Um lutador pronto para desenhar: dados montados (poses, K, cores) + arte. */
export interface LutadorRender {
  readonly ch: LutadorMontado;
  readonly arte: ArteLutador;
}

export type Elenco = Readonly<Record<IdLutador, LutadorRender>>;

/** Plano "tudo de uma vez": todos os atlas e cenários (usado pelos testes e ferramentas; o jogo usa o gerenciador). */
export function planoPadrao(baseUrl: string): PlanoDeCarga {
  return {
    baseUrl,
    lutadores: IDS_LUTADORES,
    cenarios: Object.values(CENARIOS).map((c) => ({ id: c.id, arquivo: c.arquivo })),
  };
}

/** Todos os cenários conhecidos, por id (o gerenciador carrega só os pedidos). */
export function cenariosConhecidos(): Map<string, { id: string; arquivo: string }> {
  return new Map(Object.values(CENARIOS).map((c) => [c.id, { id: c.id, arquivo: c.arquivo }]));
}

/**
 * Monta TODOS os lutadores (`montarLutador`, em data/) só a partir dos metadados dos atlas: as imagens não
 * precisam estar carregadas. Assim `fight/` e `Dependencias.lutadores` não mudam, qualquer que seja o elenco.
 */
export function montarElencoDeAtlas(atlas: ReadonlyMap<string, AtlasLutador>): Elenco {
  const saida = {} as Record<IdLutador, LutadorRender>;
  for (const id of IDS_LUTADORES) {
    const a = atlas.get(id);
    if (!a) throw new Error(`montarElenco: atlas de "${id}" nao foi carregado`);
    saida[id] = { ch: montarLutador(LUTADORES[id], a.poses()), arte: a };
  }
  return saida;
}

/** Monta o elenco a partir de `carregarRecursos` (modo "tudo de uma vez"). */
export function montarElenco(recursos: Recursos): Elenco {
  return montarElencoDeAtlas(recursos.lutadores);
}

export interface OpcoesArteInicial {
  readonly baseUrl: string;
  readonly leitor?: LeitorDeRecursos;
  /** 0..1, nunca recua. */
  readonly aoProgredir?: (fracao: number) => void;
  /** Lutadores cujo atlas já fica na memória (e nunca é solto). Padrão: a VITRINE. Vazio = tudo sob demanda. */
  readonly precarregar?: readonly IdLutador[];
  readonly criarCanvas?: CriarCanvas;
  /** Política de residência da arte (`?residencia=` no `main.ts`). Padrão: `POLITICA_PADRAO`. */
  readonly politica?: PoliticaDeResidencia;
  /** Teto de atlas + cenários em bytes (só vale em `'por-peso'`; padrão `TETO_FORA_DA_LUTA`). */
  readonly teto?: number;
}

/**
 * L6 da residência de memória (docs/spec-residencia-de-memoria.md): a política por peso (teto em bytes, luta exclusiva, volta ao menu sem piscar) é o padrão do jogo.
 * `?residencia=fixa` volta ao comportamento de antes (D-R5: A/B no aparelho e rollback sem deploy, também em produção); `?residencia=peso` é o padrão dito explicitamente.
 */
export const POLITICA_PADRAO: PoliticaDeResidencia = 'por-peso';

/**
 * Carga do boot (docs/plano-expansao.md 1.5): lê o manifesto de TODOS os lutadores (poucos KB cada) e monta os
 * `LutadorMontado` de todos; baixa o retrato de todos; e carrega as imagens SÓ da vitrine e dos cenários do título.
 * O resto do elenco entra sob demanda pelo `GerenciadorDeArte` (tela VS, seleção).
 */
export async function iniciarArte(op: OpcoesArteInicial): Promise<{ elenco: Elenco; arte: GerenciadorDeArte }> {
  const leitor = op.leitor ?? leitorDeRede;
  const relatar = progressoMonotono(op.aoProgredir);
  const n = IDS_LUTADORES.length;
  let feitos = 0;
  const parcial = (): void => relatar((0.3 * ++feitos) / (2 * n));

  const silhuetas = new CacheDeSilhuetas(); // UM cache para os atlas e para o gerenciador medir/aliviar
  const atlas = await carregarManifestos(op.baseUrl, IDS_LUTADORES, leitor, op.criarCanvas, parcial, silhuetas);
  const elenco = montarElencoDeAtlas(atlas);
  const preferidos = op.precarregar ?? VITRINE;
  // ordem = prioridade (o 1º é o último a sair): o fundo dos menus primeiro, depois os da vitrine na ordem dela
  const cenariosPreferidos = [...new Set([CENARIO_PADRAO, ...preferidos.map((id) => LUTADORES[id].stage)])];
  const arte = new GerenciadorDeArte({
    leitor,
    baseUrl: op.baseUrl,
    atlas,
    cenarios: cenariosConhecidos(),
    preferidos,
    cenariosPreferidos,
    politica: op.politica ?? POLITICA_PADRAO,
    silhuetas,
    ...(op.teto === undefined ? {} : { teto: op.teto }),
  });
  await arte.carregarRetratos(IDS_LUTADORES, parcial);
  await arte.garantir({ lutadores: preferidos, cenarios: cenariosPreferidos }, (f) => relatar(0.3 + 0.7 * f));
  relatar(1);
  return { elenco, arte };
}
