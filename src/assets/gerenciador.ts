import { urlCenario, type AtlasLutador, type CenarioParaCarregar, type ImagemCarregada, type LeitorDeRecursos } from './carregador';

export interface PedidoDeArte {
  readonly lutadores?: readonly string[];
  readonly cenarios?: readonly string[];
}

export interface OpcoesGerenciador {
  readonly leitor: LeitorDeRecursos;
  readonly baseUrl: string;
  /** Todos os lutadores do elenco (só metadados: as imagens vêm sob demanda). */
  readonly atlas: ReadonlyMap<string, AtlasLutador>;
  /** Todos os cenários conhecidos. */
  readonly cenarios: ReadonlyMap<string, CenarioParaCarregar>;
  /** Lutadores que nunca são soltos (a vitrine do título/abertura). */
  readonly fixos?: readonly string[];
  /** Cenários que nunca são soltos (fundo dos menus e ciclo do título). */
  readonly cenariosFixos?: readonly string[];
  /** Quantos atlas NÃO fixos podem ficar na memória ao mesmo tempo (padrão 3: os dois da luta + o último visto). */
  readonly limiteResidentes?: number;
}

/**
 * Carga sob demanda da arte (docs/plano-expansao.md 1.5): só carrega o que é pedido, nunca duas vezes ao mesmo
 * tempo, e solta o menos recente quando passa do limite de residentes. Retratos são pequenos e ficam sempre.
 * Os dados (`LutadorMontado`) existem para todos desde o boot; aqui só se decide quando a IMAGEM está na memória.
 */
export class GerenciadorDeArte {
  /** Cenários carregados (mapa vivo: o render lê daqui). */
  readonly cenarios = new Map<string, ImagemCarregada>();
  /** Em uso agora (na luta, no VS...): nunca soltos pela poda. */
  private emUso = new Set<string>();
  private readonly recencia: string[] = [];
  /** Mapa de atlas (cópia: aceita apelidos). */
  private readonly atlas: Map<string, AtlasLutador>;
  private readonly emCargaLut = new Map<string, Promise<void>>();
  private readonly emCargaCen = new Map<string, Promise<void>>();
  private readonly fixos: ReadonlySet<string>;
  private readonly cenariosFixos: ReadonlySet<string>;
  private readonly limite: number;
  /** Para teste e métricas: quantas vezes cada recurso foi realmente baixado/decodificado. */
  readonly cargas = { lutadores: new Map<string, number>(), cenarios: new Map<string, number>() };

  constructor(private readonly op: OpcoesGerenciador) {
    this.atlas = new Map(op.atlas);
    this.fixos = new Set(op.fixos ?? []);
    this.cenariosFixos = new Set(op.cenariosFixos ?? []);
    this.limite = op.limiteResidentes ?? 3;
  }

  /**
   * Faz `apelido` apontar para o mesmo atlas de `real` (só para fixtures de desenvolvimento: lutadores falsos que
   * reaproveitam a arte de um existente).
   */
  registrarApelido(apelido: string, real: string): void {
    const a = this.atlas.get(real);
    if (a) this.atlas.set(apelido, a);
  }

  /** Marca quem está em uso (substitui o conjunto anterior); a poda só solta quem NÃO está aqui. */
  usar(ids: readonly string[]): void {
    this.emUso = new Set(ids);
    for (const id of ids) this.tocar(id);
  }

  private tocar(id: string): void {
    const i = this.recencia.indexOf(id);
    if (i >= 0) this.recencia.splice(i, 1);
    this.recencia.push(id);
  }

  estaPronto(p: PedidoDeArte): boolean {
    return (p.lutadores ?? []).every((id) => this.atlas.get(id)?.pronta === true) && (p.cenarios ?? []).every((id) => this.cenarios.has(id));
  }

  lutadoresResidentes(): string[] {
    return [...this.atlas.values()].filter((a) => a.pronta).map((a) => a.id);
  }

  /** Retratos (pequenos) de todos: ficam para sempre. Falta de retrato não é erro (o atlas serve de recurso). */
  async carregarRetratos(ids: readonly string[], aoUm?: () => void): Promise<void> {
    await Promise.all(
      ids.map(async (id) => {
        await this.atlas.get(id)?.carregarRetrato(this.op.leitor);
        aoUm?.();
      }),
    );
  }

  private carregarLutador(id: string, aoPagina?: () => void): Promise<void> {
    const a = this.atlas.get(id);
    if (!a) return Promise.reject(new Error(`GerenciadorDeArte: lutador "${id}" desconhecido`));
    if (a.pronta) return Promise.resolve();
    let p = this.emCargaLut.get(id);
    if (!p) {
      p = a
        .carregarImagens(this.op.leitor, aoPagina)
        .then(() => {
          this.cargas.lutadores.set(id, (this.cargas.lutadores.get(id) ?? 0) + 1);
        })
        .finally(() => this.emCargaLut.delete(id));
      this.emCargaLut.set(id, p);
    }
    return p;
  }

  private carregarCenario(id: string): Promise<void> {
    if (this.cenarios.has(id)) return Promise.resolve();
    const def = this.op.cenarios.get(id);
    if (!def) return Promise.reject(new Error(`GerenciadorDeArte: cenario "${id}" desconhecido`));
    let p = this.emCargaCen.get(id);
    if (!p) {
      p = this.op.leitor
        .imagem(urlCenario(this.op.baseUrl, def.arquivo))
        .then((img) => {
          this.cenarios.set(id, img);
          this.cargas.cenarios.set(id, (this.cargas.cenarios.get(id) ?? 0) + 1);
        })
        .finally(() => this.emCargaCen.delete(id));
      this.emCargaCen.set(id, p);
    }
    return p;
  }

  /**
   * Garante na memória os atlas e cenários pedidos (carrega só o que falta). Relata 0..1 por arquivo concluído.
   * Depois de carregar, solta o excedente (menos recente, fora de uso, não fixo).
   */
  async garantir(p: PedidoDeArte, aoProgredir?: (fracao: number) => void): Promise<void> {
    const lut = (p.lutadores ?? []).filter((id) => !this.atlas.get(id)?.pronta);
    const cen = (p.cenarios ?? []).filter((id) => !this.cenarios.has(id));
    for (const id of p.lutadores ?? []) this.tocar(id);
    if (lut.length + cen.length === 0) {
      aoProgredir?.(1);
      return;
    }
    let total = lut.reduce((n, id) => n + (this.atlas.get(id)?.manifesto.imagens.length ?? 1), cen.length);
    let feitos = 0;
    const avancar = (): void => {
      feitos++;
      aoProgredir?.(Math.min(1, feitos / total));
    };
    total = Math.max(1, total);
    await Promise.all([...lut.map((id) => this.carregarLutador(id, avancar)), ...cen.map((id) => this.carregarCenario(id).then(avancar))]);
    this.podar();
  }

  /** Pede um lutador sem esperar (a tela mostra a arte quando chegar). Erros viram console, não quebram o jogo. */
  pedir(id: string): void {
    if (this.atlas.get(id)?.pronta) {
      this.tocar(id);
      return;
    }
    this.garantir({ lutadores: [id] }).catch((e: unknown) => console.error(e));
  }

  /** Aquece o cache HTTP do próximo rival (download, sem decodificar). */
  prebuscar(p: PedidoDeArte): void {
    const { leitor, baseUrl } = this.op;
    for (const id of p.lutadores ?? []) void this.atlas.get(id)?.prebuscarImagens(leitor).catch(() => undefined);
    for (const id of p.cenarios ?? []) {
      const def = this.op.cenarios.get(id);
      if (def && !this.cenarios.has(id)) void leitor.prebuscar?.(urlCenario(baseUrl, def.arquivo)).catch(() => undefined);
    }
  }

  liberarLutador(id: string): void {
    if (this.fixos.has(id)) return;
    this.atlas.get(id)?.liberar();
    const i = this.recencia.indexOf(id);
    if (i >= 0) this.recencia.splice(i, 1);
  }

  liberarCenario(id: string): void {
    if (!this.cenariosFixos.has(id)) this.cenarios.delete(id);
  }

  /** Solta o excedente de lutadores não fixos (o menos recente primeiro, nunca os em uso). */
  podar(): void {
    const candidatos = this.recencia.filter((id) => !this.fixos.has(id) && this.atlas.get(id)?.pronta);
    let excesso = candidatos.length - this.limite;
    for (const id of candidatos) {
      if (excesso <= 0) break;
      if (this.emUso.has(id)) continue;
      this.liberarLutador(id);
      excesso--;
    }
  }
}
