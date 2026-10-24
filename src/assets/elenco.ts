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

/** O que `iniciarArte` devolve: o elenco e o gerenciador prontos para a abertura, e a etapa 1 do boot (a vitrine em segundo plano) para o chamador disparar. */
export interface ArteInicial {
  readonly elenco: Elenco;
  readonly arte: GerenciadorDeArte;
  /**
   * Etapa 1 do boot: os retratos e a arte da vitrine (atlas UM por vez, o do menu primeiro, depois os cenários do ciclo do título) entram em SEGUNDO PLANO pela fila de fundo.
   * O `main.ts` a chama logo depois do `data-pronto`. Não bloqueia nada; `entrarNaLuta`, `aliviar` e a próxima cena que pede arte (`preferir`) a cancelam, e o que a cena
   * precisa de verdade ela pede como essencial. Na política `'fixa'` (rollback) não faz nada: tudo já veio na etapa 0, como antes da T4.
   */
  readonly etapa1: () => void;
}

/**
 * Boot em etapas (T4, docs/orcamentos-2026-10-23.md §2.2). Esta função é a ETAPA 0, a única que bloqueia a tela de "CLIQUE OU PRESSIONE UMA TECLA": lê o manifesto
 * de TODOS os lutadores (poucos KB cada) e monta os `LutadorMontado` de todos, e baixa o cenário padrão (o fundo dos menus). A lista do que a etapa 0 baixa mora em
 * `./etapa0` (o service worker pré-carrega a mesma). Os retratos e a arte da vitrine ficam para a etapa 1 (`etapa1`); o resto do elenco entra sob demanda pelo
 * `GerenciadorDeArte` (tela VS, seleção). Sem a vitrine pronta a abertura desenha o que já chegou e o resto entra quando chega (OR-2, opção a).
 *
 * Política `'fixa'` (`?residencia=fixa`, rollback sem deploy): o boot de antes, tudo na etapa 0 (retratos e vitrine com os cenários dela, bloqueando o `data-pronto`).
 */
export async function iniciarArte(op: OpcoesArteInicial): Promise<ArteInicial> {
  const leitor = op.leitor ?? leitorDeRede;
  const relatar = progressoMonotono(op.aoProgredir);
  const politica = op.politica ?? POLITICA_PADRAO;
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
    politica,
    silhuetas,
    ...(op.teto === undefined ? {} : { teto: op.teto }),
  });
  if (politica === 'fixa') {
    await arte.carregarRetratos(IDS_LUTADORES, parcial);
    await arte.garantir({ lutadores: preferidos, cenarios: cenariosPreferidos }, (f) => relatar(0.3 + 0.7 * f));
    relatar(1);
    return { elenco, arte, etapa1: () => undefined };
  }
  // etapa 0 (por peso): só o fundo dos menus; o progresso é dos 10 manifestos (30%) e do cenário (70%)
  await arte.garantir({ cenarios: [CENARIO_PADRAO] }, (f) => relatar(0.3 + 0.7 * f));
  relatar(1);
  const etapa1 = (): void => arte.preferir({ retratos: true, lutadores: preferidos, cenarios: cenariosPreferidos });
  return { elenco, arte, etapa1 };
}
