import { bytesDaImagem, urlCenario, type AtlasLutador, type CenarioParaCarregar, type ImagemCarregada, type LeitorDeRecursos } from './carregador';
import type { CacheDeSilhuetas } from './silhuetas';

/** Folhas FILME na memória ao mesmo tempo: as dos 2 lutadores da luta (no espelho é uma só). Docs/orcamentos-2026-10-23.md, §2 e §3. */
export const MAX_FOLHAS_FILME = 2;

/**
 * Teto de atlas + cenários (retratos à parte) FORA da luta: o estado do título de hoje (vitrine 102 + 4 cenários 31,6 = 133,6 MiB) com folga.
 * Docs/spec-residencia-de-memoria.md §2.1.
 */
export const TETO_FORA_DA_LUTA = 136 * 1024 * 1024;

/** Um cenário decodificado: todos os dez são WebP 1920 x 1080 (um teste unitário trava isso lendo o disco). */
export const BYTES_DE_CENARIO = 1920 * 1080 * 4;

/** Atlas NÃO preferidos que a política `'fixa'` deixa na memória ao mesmo tempo (os dois da luta + o último visto). */
export const LIMITE_RESIDENTES_FIXA = 3;

/**
 * `'fixa'`: o comportamento de antes da residência por peso, byte a byte (preferido = fixo, no máximo `LIMITE_RESIDENTES_FIXA` atlas não fixos, poda DEPOIS de carregar).
 * `'por-peso'`: teto em bytes, despejo ANTES de decodificar, luta exclusiva. É a alavanca de A/B e o rollback sem deploy (`?residencia=`).
 */
export type PoliticaDeResidencia = 'fixa' | 'por-peso';

export interface PedidoDeArte {
  readonly lutadores?: readonly string[];
  readonly cenarios?: readonly string[];
}

/** Bytes decodificados (w x h x 4) do que o gerenciador segura AGORA (carga em andamento não conta: só o que já chegou). */
export interface MemoriaDeArte {
  /** Por lutador, contado por OBJETO de atlas (apelidos de fixture não duplicam). */
  readonly atlas: Readonly<Record<string, number>>;
  readonly filmes: Readonly<Record<string, number>>;
  readonly cenarios: Readonly<Record<string, number>>;
  readonly retratos: number;
  /** `CacheDeSilhuetas.bytes` (canvas, não imagem); 0 se o gerenciador não recebeu o cache. NÃO entra em `imagens`. */
  readonly silhuetas: number;
  /** atlas + filmes + cenários + retratos: "o analítico". */
  readonly imagens: number;
}

export interface OpcoesGerenciador {
  readonly leitor: LeitorDeRecursos;
  readonly baseUrl: string;
  /** Todos os lutadores do elenco (só metadados: as imagens vêm sob demanda). */
  readonly atlas: ReadonlyMap<string, AtlasLutador>;
  /** Todos os cenários conhecidos. */
  readonly cenarios: ReadonlyMap<string, CenarioParaCarregar>;
  /** Lutadores preferidos (a vitrine do título/abertura); a ORDEM é a prioridade: o 1º é o último a sair. Na política `'fixa'` são os "fixos". */
  readonly preferidos?: readonly string[];
  /** Cenários preferidos (fundo dos menus e ciclo do título), na mesma lógica. Na política `'fixa'` são os "cenários fixos". */
  readonly cenariosPreferidos?: readonly string[];
  /** Teto de atlas + cenários residentes, em bytes (padrão `TETO_FORA_DA_LUTA`). Só vale em `'por-peso'`. */
  readonly teto?: number;
  /** Padrão `'por-peso'`; `main.ts` escolhe a do jogo (`?residencia=`). */
  readonly politica?: PoliticaDeResidencia;
  /** O cache de silhuetas compartilhado pelos atlas (o mesmo passado a `carregarManifestos`): é dele que `memoria()` lê e `aliviar()` zera. */
  readonly silhuetas?: CacheDeSilhuetas;
}

type ItemDaFila = { readonly tipo: 'lutador' | 'cenario'; readonly id: string };

/**
 * Carga sob demanda da arte (docs/plano-expansao.md 1.5 e docs/spec-residencia-de-memoria.md): só carrega o que é pedido, nunca duas vezes ao mesmo
 * tempo e mantém a memória dentro de um limite. Retratos são pequenos e ficam sempre.
 * Os dados (`LutadorMontado`) existem para todos desde o boot; aqui só se decide quando a IMAGEM está na memória.
 *
 * Duas políticas (ver `PoliticaDeResidencia`). Em `'por-peso'` o limite é em BYTES (o peso do atlas vem do manifesto, antes de baixar), as cargas em andamento
 * contam como residentes e o espaço é aberto ANTES de decodificar (o pico não é "antigo + novo"). Ordem de despejo, até caber, sempre poupando o que está em uso:
 * 1. atlas não preferidos, do menos recente ao mais recente; 2. cenários não preferidos, idem; 3. cenários preferidos, do fim da lista para o começo;
 * 4. atlas preferidos, do fim da lista para o começo. Se só o que está em uso já passa do teto (o trailer), o teto cede e nada em uso é solto.
 */
export class GerenciadorDeArte {
  /** Cenários carregados (mapa vivo: o render lê daqui). */
  readonly cenarios = new Map<string, ImagemCarregada>();
  readonly politica: PoliticaDeResidencia;
  readonly teto: number;
  /** Para teste e métricas: quantas vezes cada recurso foi realmente baixado/decodificado. */
  readonly cargas = { lutadores: new Map<string, number>(), cenarios: new Map<string, number>(), filmes: new Map<string, number>() };

  /** Em uso agora (na luta, no VS...): nunca soltos pela poda nem pelo despejo. */
  private emUsoLut = new Set<string>();
  private emUsoCen = new Set<string>();
  private readonly recencia: string[] = [];
  private readonly recenciaCen: string[] = [];
  /** Mapa de atlas (cópia: aceita apelidos). */
  private readonly atlas: Map<string, AtlasLutador>;
  private readonly emCargaLut = new Map<string, Promise<void>>();
  private readonly emCargaCen = new Map<string, Promise<void>>();
  /** Cargas em andamento (por OBJETO de atlas / por cenário) com a geração em que foram pedidas pela última vez: contam no teto e são soltas na chegada se ficaram obsoletas. */
  private readonly noArLut = new Map<AtlasLutador, number>();
  private readonly noArCen = new Map<string, number>();
  /** Avança em `entrarNaLuta` e em `aliviar`: uma carga pedida numa geração anterior e fora do que está em uso é solta quando chega (nunca "ressuscita" na luta). */
  private geracao = 0;
  private readonly preferidos: readonly string[];
  private readonly cenariosPreferidos: readonly string[];
  private readonly ehPreferido: ReadonlySet<string>;
  private readonly ehCenarioPreferido: ReadonlySet<string>;
  private readonly fila: ItemDaFila[] = [];
  private drenando: Promise<void> | null = null;

  constructor(private readonly op: OpcoesGerenciador) {
    this.atlas = new Map(op.atlas);
    this.preferidos = op.preferidos ?? [];
    this.cenariosPreferidos = op.cenariosPreferidos ?? [];
    this.ehPreferido = new Set(this.preferidos);
    this.ehCenarioPreferido = new Set(this.cenariosPreferidos);
    this.politica = op.politica ?? 'por-peso';
    this.teto = op.teto ?? TETO_FORA_DA_LUTA;
  }

  /**
   * Faz `apelido` apontar para o mesmo atlas de `real` (só para fixtures de desenvolvimento: lutadores falsos que
   * reaproveitam a arte de um existente).
   */
  registrarApelido(apelido: string, real: string): void {
    const a = this.atlas.get(real);
    if (a) this.atlas.set(apelido, a);
  }

  /** Marca o que está em uso (substitui o anterior; atlas E cenários). Nada em uso é solto pela poda nem pelo despejo. Sai do modo "luta exclusiva". */
  usar(p: PedidoDeArte): void {
    this.emUsoLut = new Set(p.lutadores ?? []);
    this.emUsoCen = new Set(p.cenarios ?? []);
    for (const id of p.lutadores ?? []) this.tocar(id);
    for (const id of p.cenarios ?? []) this.tocarCen(id);
  }

  /**
   * Entra numa luta (VS e luta): em uso = só `p`, e solta JÁ tudo o mais (a vitrine, os outros cenários e a FILME de quem não está em `p`), cancela a fila de fundo e
   * avança a geração (carga em andamento de fora de `p` é solta na chegada). Em `'fixa'` é só `usar(p)`: o comportamento de antes.
   */
  entrarNaLuta(p: PedidoDeArte): void {
    if (this.politica === 'fixa') {
      this.usar(p);
      return;
    }
    this.geracao++;
    this.fila.length = 0;
    this.usar(p);
    this.soltarForaDeUso();
  }

  /** Aba oculta: solta tudo o que não está em uso (atlas, FILME, cenários), todas as silhuetas e a fila de fundo. Em `'fixa'` não faz nada (o comportamento de antes). */
  aliviar(): void {
    if (this.politica === 'fixa') return;
    this.geracao++;
    this.fila.length = 0;
    this.soltarForaDeUso();
    this.op.silhuetas?.soltarTudo();
  }

  private soltarForaDeUso(): void {
    const emUso = this.objetosEmUso();
    for (const a of this.objetos()) if (!emUso.has(a) && (a.pronta || a.filmePronto || a.filmeEmCarregamento)) this.soltarAtlas(a);
    for (const id of [...this.cenarios.keys()]) if (!this.emUsoCen.has(id)) this.soltarCenario(id);
  }

  private tocar(id: string): void {
    const i = this.recencia.indexOf(id);
    if (i >= 0) this.recencia.splice(i, 1);
    this.recencia.push(id);
  }

  private tocarCen(id: string): void {
    const i = this.recenciaCen.indexOf(id);
    if (i >= 0) this.recenciaCen.splice(i, 1);
    this.recenciaCen.push(id);
  }

  /** Os atlas distintos (apelidos de fixture apontam para o mesmo objeto). */
  private objetos(): AtlasLutador[] {
    return [...new Set(this.atlas.values())];
  }

  private objetosDe(ids: Iterable<string>): Set<AtlasLutador> {
    const s = new Set<AtlasLutador>();
    for (const id of ids) {
      const a = this.atlas.get(id);
      if (a) s.add(a);
    }
    return s;
  }

  private objetosEmUso(): Set<AtlasLutador> {
    return this.objetosDe(this.emUsoLut);
  }

  /** Tira o atlas da memória (imagens, FILME e silhuetas) e da lista de recência. */
  private soltarAtlas(a: AtlasLutador): void {
    a.liberar();
    for (const [id, x] of this.atlas) {
      if (x !== a) continue;
      const i = this.recencia.indexOf(id);
      if (i >= 0) this.recencia.splice(i, 1);
    }
  }

  private soltarCenario(id: string): void {
    this.cenarios.delete(id);
    const i = this.recenciaCen.indexOf(id);
    if (i >= 0) this.recenciaCen.splice(i, 1);
  }

  estaPronto(p: PedidoDeArte): boolean {
    return (p.lutadores ?? []).every((id) => this.atlas.get(id)?.pronta === true) && (p.cenarios ?? []).every((id) => this.cenarios.has(id));
  }

  lutadoresResidentes(): string[] {
    return [...this.atlas.values()].filter((a) => a.pronta).map((a) => a.id);
  }

  /**
   * Quanto a arte ocupa agora, em bytes decodificados, por categoria. Só o que JÁ chegou (carga em andamento não conta). Cada atlas conta uma vez, mesmo com apelidos.
   * É a API pública de medição (e2e `memoria-por-luta`): substitui o acesso a campos privados.
   */
  memoria(): MemoriaDeArte {
    const atlas: Record<string, number> = {};
    const filmes: Record<string, number> = {};
    const cenarios: Record<string, number> = {};
    let retratos = 0;
    let imagens = 0;
    for (const a of this.objetos()) {
      if (a.bytesDasPaginas > 0) atlas[a.id] = a.bytesDasPaginas;
      if (a.bytesDoFilme > 0) filmes[a.id] = a.bytesDoFilme;
      retratos += a.bytesDoRetrato;
      imagens += a.bytesDasPaginas + a.bytesDoFilme + a.bytesDoRetrato;
    }
    for (const [id, im] of this.cenarios) {
      const b = bytesDaImagem(im);
      cenarios[id] = b;
      imagens += b;
    }
    return { atlas, filmes, cenarios, retratos, silhuetas: this.op.silhuetas?.bytes ?? 0, imagens };
  }

  /**
   * Bytes de atlas + cenários que o teto conta: o que já chegou MAIS as cargas em andamento (peso do atlas pelo manifesto; cenário = `BYTES_DE_CENARIO`).
   * Não inclui FILME, retratos nem silhuetas.
   */
  bytesComprometidos(): number {
    let n = 0;
    for (const a of this.objetos()) if (a.pronta || this.noArLut.has(a)) n += a.peso;
    const ids = new Set([...this.cenarios.keys(), ...this.noArCen.keys()]);
    return n + ids.size * BYTES_DE_CENARIO;
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
    if (p) {
      this.noArLut.set(a, this.geracao); // quem pede de novo mantém a carga viva nesta geração
      return p;
    }
    this.noArLut.set(a, this.geracao);
    p = a
      .carregarImagens(this.op.leitor, aoPagina)
      .then(() => {
        this.cargas.lutadores.set(id, (this.cargas.lutadores.get(id) ?? 0) + 1);
        const pedida = this.noArLut.get(a);
        // R5: carga em andamento que chega depois de `entrarNaLuta` e não faz parte do que está em uso é solta na chegada
        if (this.politica === 'por-peso' && pedida !== undefined && pedida !== this.geracao && !this.objetosEmUso().has(a)) this.soltarAtlas(a);
      })
      .finally(() => {
        this.emCargaLut.delete(id);
        this.noArLut.delete(a);
      });
    this.emCargaLut.set(id, p);
    return p;
  }

  private carregarCenario(id: string): Promise<void> {
    if (this.cenarios.has(id)) return Promise.resolve();
    const def = this.op.cenarios.get(id);
    if (!def) return Promise.reject(new Error(`GerenciadorDeArte: cenario "${id}" desconhecido`));
    let p = this.emCargaCen.get(id);
    if (p) {
      this.noArCen.set(id, this.geracao);
      return p;
    }
    this.noArCen.set(id, this.geracao);
    p = this.op.leitor
      .imagem(urlCenario(this.op.baseUrl, def.arquivo))
      .then((img) => {
        this.cargas.cenarios.set(id, (this.cargas.cenarios.get(id) ?? 0) + 1);
        const pedida = this.noArCen.get(id);
        if (this.politica === 'por-peso' && pedida !== undefined && pedida !== this.geracao && !this.emUsoCen.has(id)) return; // obsoleta: nem entra no mapa
        this.cenarios.set(id, img);
      })
      .finally(() => {
        this.emCargaCen.delete(id);
        this.noArCen.delete(id);
      });
    this.emCargaCen.set(id, p);
    return p;
  }

  /**
   * Garante na memória os atlas e cenários pedidos (carrega só o que falta). Relata 0..1 por arquivo concluído.
   * `'por-peso'`: abre espaço ANTES de decodificar (despejo na ordem do cabeçalho da classe), sem soltar o que foi pedido nem o que está em uso.
   * `'fixa'`: depois de carregar, solta o excedente (menos recente, fora de uso, não fixo).
   */
  async garantir(p: PedidoDeArte, aoProgredir?: (fracao: number) => void): Promise<void> {
    const lut = (p.lutadores ?? []).filter((id) => !this.atlas.get(id)?.pronta);
    const cen = (p.cenarios ?? []).filter((id) => !this.cenarios.has(id));
    for (const id of p.lutadores ?? []) this.tocar(id);
    for (const id of p.cenarios ?? []) this.tocarCen(id);
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
    if (this.politica === 'por-peso') this.abrirEspaco(p, true);
    await Promise.all([...lut.map((id) => this.carregarLutador(id, avancar)), ...cen.map((id) => this.carregarCenario(id).then(avancar))]);
    if (this.politica === 'fixa') this.podar();
  }

  /** Pede um lutador sem esperar (a tela mostra a arte quando chegar). Erros viram console, não quebram o jogo. */
  pedir(id: string): void {
    if (this.atlas.get(id)?.pronta) {
      this.tocar(id);
      return;
    }
    this.garantir({ lutadores: [id] }).catch((e: unknown) => console.error(e));
  }

  /**
   * Fila de FUNDO: substitui a que existia e carrega UM item por vez (o de cima primeiro), só o que cabe no teto sem soltar nada em uso nem preferido (o que não couber fica
   * de fora: a cena seguinte pede como essencial). Erros viram console. `entrarNaLuta` e `aliviar` cancelam o que ainda não começou. Em `'fixa'` não faz nada.
   */
  preferir(p: PedidoDeArte): void {
    if (this.politica === 'fixa') return;
    const itens: ItemDaFila[] = [
      ...(p.lutadores ?? []).map((id): ItemDaFila => ({ tipo: 'lutador', id })),
      ...(p.cenarios ?? []).map((id): ItemDaFila => ({ tipo: 'cenario', id })),
    ];
    this.fila.splice(0, this.fila.length, ...itens);
    this.drenando ??= this.drenar().finally(() => {
      this.drenando = null;
    });
  }

  /** Resolve quando a fila de fundo esvazia (teste e métricas). */
  fundoPronto(): Promise<void> {
    return this.drenando ?? Promise.resolve();
  }

  private async drenar(): Promise<void> {
    for (let item = this.fila.shift(); item; item = this.fila.shift()) {
      const pedido: PedidoDeArte = item.tipo === 'lutador' ? { lutadores: [item.id] } : { cenarios: [item.id] };
      if (this.estaPronto(pedido)) {
        if (item.tipo === 'lutador') this.tocar(item.id);
        else this.tocarCen(item.id);
        continue;
      }
      if (!this.abrirEspaco(pedido, false)) continue;
      try {
        if (item.tipo === 'lutador') {
          this.tocar(item.id);
          await this.carregarLutador(item.id);
        } else {
          this.tocarCen(item.id);
          await this.carregarCenario(item.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Abre espaço no teto para `p` ANTES de decodificar. `despejarPreferidos`: pode soltar cenários/atlas preferidos (passos 3 e 4); sem isso só os não preferidos saem
   * (passos 1 e 2). Nunca solta o que está em uso nem o que `p` pede. Devolve se coube (se não coube, o teto cede para o que foi pedido e está em uso).
   */
  private abrirEspaco(p: PedidoDeArte, despejarPreferidos: boolean): boolean {
    let novos = 0;
    for (const a of this.objetosDe(p.lutadores ?? [])) if (!a.pronta && !this.noArLut.has(a)) novos += a.peso;
    for (const id of new Set(p.cenarios ?? [])) if (this.op.cenarios.has(id) && !this.cenarios.has(id) && !this.noArCen.has(id)) novos += BYTES_DE_CENARIO;
    const alvo = this.teto - novos;
    let atual = this.bytesComprometidos();
    if (atual <= alvo) return true;

    const protegidosLut = this.objetosEmUso();
    for (const a of this.objetosDe(p.lutadores ?? [])) protegidosLut.add(a);
    const protegidosCen = new Set([...this.emUsoCen, ...(p.cenarios ?? [])]);
    const preferidosObj = this.objetosDe(this.preferidos);
    const posicao = (a: AtlasLutador): number => {
      let m = -1;
      for (const [id, x] of this.atlas) if (x === a) m = Math.max(m, this.recencia.indexOf(id));
      return m;
    };
    const atlasSoltaveis = this.objetos().filter((a) => a.pronta && !protegidosLut.has(a));
    const cenariosSoltaveis = [...this.cenarios.keys()].filter((id) => !protegidosCen.has(id));

    const ordem: Array<{ readonly bytes: number; readonly soltar: () => void }> = [];
    const doAtlas = (a: AtlasLutador): { bytes: number; soltar: () => void } => ({ bytes: a.peso, soltar: () => this.soltarAtlas(a) });
    const doCenario = (id: string): { bytes: number; soltar: () => void } => ({ bytes: BYTES_DE_CENARIO, soltar: () => this.soltarCenario(id) });
    // 1. atlas não preferidos, do menos recente ao mais recente
    for (const a of atlasSoltaveis.filter((x) => !preferidosObj.has(x)).sort((x, y) => posicao(x) - posicao(y))) ordem.push(doAtlas(a));
    // 2. cenários não preferidos, menos recente primeiro
    for (const id of cenariosSoltaveis.filter((x) => !this.ehCenarioPreferido.has(x)).sort((x, y) => this.recenciaCen.indexOf(x) - this.recenciaCen.indexOf(y))) ordem.push(doCenario(id));
    if (despejarPreferidos) {
      // 3. cenários preferidos, do fim da lista para o começo (o 1º, o `jp`, é o último a sair)
      for (const id of [...this.cenariosPreferidos].reverse()) if (cenariosSoltaveis.includes(id)) ordem.push(doCenario(id));
      // 4. atlas preferidos, do fim da lista para o começo
      const vistos = new Set<AtlasLutador>();
      for (const id of [...this.preferidos].reverse()) {
        const a = this.atlas.get(id);
        if (a && atlasSoltaveis.includes(a) && !vistos.has(a)) {
          vistos.add(a);
          ordem.push(doAtlas(a));
        }
      }
    }
    for (const e of ordem) {
      if (atual <= alvo) break;
      e.soltar();
      atual -= e.bytes;
    }
    return atual <= alvo;
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

  /**
   * Carrega a folha FILME dos lutadores da luta (no máximo `MAX_FOLHAS_FILME`; solta antes qualquer outra que esteja residente).
   * É a única porta de entrada da FILME: `garantir`, `pedir` e `prebuscar` nunca a tocam, então a tela de seleção e a VS não pagam
   * nada por ela. A cena da luta chama DEPOIS que a luta começou, sem esperar (a página que não chegou toca a pose `Alt`), e chama
   * `soltarFilme()` ao sair. Nunca rejeita: falha de rede, imagem de outro tamanho ou lutador sem filme só deixam a folha ausente.
   */
  async carregarFilme(ids: readonly string[]): Promise<void> {
    const alvo = [...new Set(ids)].filter((id) => this.atlas.get(id)?.temFilme === true).slice(0, MAX_FOLHAS_FILME);
    const alvoAtlas = new Set(alvo.map((id) => this.atlas.get(id)));
    for (const [id, a] of this.atlas) if (!alvoAtlas.has(a) && (a.filmePronto || a.filmeEmCarregamento)) this.soltarFilme([id]);
    await Promise.all(
      alvo.map(async (id) => {
        const a = this.atlas.get(id);
        if (!a || a.filmePronto) return;
        if (await a.carregarFilme(this.op.leitor)) this.cargas.filmes.set(id, (this.cargas.filmes.get(id) ?? 0) + 1);
      }),
    );
  }

  /** Solta a folha FILME dos lutadores dados (sem argumento, de todos). Idempotente; os atlas e os quadros f0..f5 ficam. */
  soltarFilme(ids?: readonly string[]): void {
    if (ids) for (const id of ids) this.atlas.get(id)?.liberarFilme();
    else for (const a of this.atlas.values()) a.liberarFilme();
  }

  /** Quem está com a folha FILME na memória agora (teste e métricas). */
  filmesResidentes(): string[] {
    return [...new Set([...this.atlas.values()].filter((a) => a.filmePronto).map((a) => a.id))];
  }

  /** Solta o atlas, salvo preferido (e, em `'por-peso'`, salvo em uso). */
  liberarLutador(id: string): void {
    if (this.ehPreferido.has(id)) return;
    if (this.politica === 'por-peso' && this.emUsoLut.has(id)) return;
    const a = this.atlas.get(id);
    if (!a) return;
    a.liberar();
    const i = this.recencia.indexOf(id);
    if (i >= 0) this.recencia.splice(i, 1);
  }

  /** Solta o cenário, salvo preferido (e, em `'por-peso'`, salvo em uso). */
  liberarCenario(id: string): void {
    if (this.ehCenarioPreferido.has(id)) return;
    if (this.politica === 'por-peso' && this.emUsoCen.has(id)) return;
    this.soltarCenario(id);
  }

  /** Só na política `'fixa'`: solta o excedente de lutadores não fixos (o menos recente primeiro, nunca os em uso). Em `'por-peso'` o despejo é o de `abrirEspaco`. */
  podar(): void {
    if (this.politica !== 'fixa') return;
    const candidatos = this.recencia.filter((id) => !this.ehPreferido.has(id) && this.atlas.get(id)?.pronta);
    let excesso = candidatos.length - LIMITE_RESIDENTES_FIXA;
    for (const id of candidatos) {
      if (excesso <= 0) break;
      if (this.emUsoLut.has(id)) continue;
      this.liberarLutador(id);
      excesso--;
    }
  }
}
