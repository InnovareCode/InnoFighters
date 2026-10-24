import {
  VIDRO_SOBRE_GUARDA_PADRAO,
  cortesDe,
  exigirManifestoValido,
  idBaseDaVariante,
  type CorteDeAmostra,
  type FiltroAmostra,
  type ManifestoDeAmostras,
  type PedidoAmostra,
} from '../data/sons/amostras';

/*
 * BANCO DE AMOSTRAS REAIS (docs/plano-sons-realistas.md §6): pedaço à parte, baixado por `import()` (como `identidade-sonora` e `temas`). Guarda o manifesto, baixa as
 * folhas MP3 sob demanda, decodifica DEPOIS que o AudioContext existe (`decodeAudioData`, assíncrono e fora da thread principal, uma folha por vez), acha o ATAQUE
 * REAL de cada corte varrendo o buffer (o MP3 tem atraso de codificação que muda de navegador para navegador) e toca direto na folha:
 * `AudioBufferSourceNode.start(quando, deslocamento, duração)`, sem copiar buffer. Uma amostra = 1 fonte (+ 1 ganho, + 1 filtro se o pedido traz).
 *
 * O banco NÃO decide o que tocar nem sorteia nada: o plano sonoro (`identidade-sonora.ts`) manda um `PedidoAmostra` já variado por `variacao()`, e a execução pergunta
 * a este banco se há amostra PRONTA para ele. Sem pronta (folha no ar, rede caída, decode falhou, escuta em modo "síntese"), `escolher` devolve null e o jogo toca a
 * síntese de hoje. Nada aqui usa `Math.random`.
 */

// --- ataque real ---
/** Limiar do ataque: o 1º sample acima de -45 dBFS. */
export const LIMIAR_DO_ATAQUE_DB = -45;
/** Quanto antes do `inicio` do manifesto a varredura começa (os 40 ms de silêncio que a curadoria põe em volta de cada corte). */
export const RECUO_DA_VARREDURA_S = 0.04;
/** O som começa um pouco antes do ataque, para não comer o 1º ciclo (e não sobrar silêncio audível). */
const PRE_ROLL_S = 0.002;

/** Silêncio mínimo (s) que separa a cauda do corte vizinho do ataque deste corte, quando a varredura já começa dentro de um som. */
const VALE_MINIMO_S = 0.01;

/**
 * O instante (s) do ataque real de um corte: o 1º sample com |x| >= -45 dBFS, procurando de `inicio - 40 ms` até o fim do corte. Se o MP3 NÃO descartou o atraso de
 * codificação (~25 ms), o conteúdo da folha anda para a frente e a janela já começa dentro da CAUDA do corte vizinho: aí o ataque é o 1º sample acima do limiar
 * DEPOIS de um vale de 10 ms (a curadoria deixa 40 ms de silêncio entre os cortes). -1 se o trecho é todo silêncio (corte inválido: o banco o trata como sem
 * amostra e o jogo toca a síntese). Pura; testada no Node.
 */
export function acharAtaque(dados: ArrayLike<number>, taxa: number, inicio: number, dur: number, limiarDb = LIMIAR_DO_ATAQUE_DB): number {
  const limiar = Math.pow(10, limiarDb / 20);
  const de = Math.max(0, Math.floor((inicio - RECUO_DA_VARREDURA_S) * taxa));
  const ate = Math.min(dados.length, Math.ceil((inicio + dur) * taxa));
  const valeMinimo = Math.round(VALE_MINIMO_S * taxa);
  // a janela começa dentro de um som se algum sample dos 8 primeiros ms passa do limiar (um sample só não basta: a onda cruza o zero)
  let dentroDeUmSom = false;
  for (let i = de; i < Math.min(ate, de + Math.round(0.008 * taxa)); i++) if (Math.abs(dados[i] as number) >= limiar) dentroDeUmSom = true;
  let vale = 0;
  for (let i = de; i < ate; i++) {
    if (Math.abs(dados[i] as number) >= limiar) {
      if (!dentroDeUmSom || vale >= valeMinimo) return i / taxa;
      vale = 0; // ainda é a cauda do vizinho
    } else if (dentroDeUmSom) vale++;
  }
  return -1;
}

// --- estado ---
export type EstadoDaFolha = 'pendente' | 'baixando' | 'baixada' | 'decodificando' | 'pronta' | 'falhou';

/** Quantas folhas de lutador ficam na memória ao mesmo tempo (a mais antiga sai; plano §6.2). A `base` nunca sai. */
export const MAX_FOLHAS_DE_LUTADOR = 4;
const MAX_TENTATIVAS = 3;

interface Folha {
  readonly nome: string;
  readonly arquivo: string;
  estado: EstadoDaFolha;
  bytes: ArrayBuffer | null;
  buffer: AudioBuffer | null;
  /** corte -> segundo do ataque real, preenchido ao decodificar. */
  ataques: Map<CorteDeAmostra, number>;
  tentativas: number;
  usadaEm: number;
}

export interface DependenciasDoBanco {
  /** Pasta que contém o manifesto e as folhas, com a barra final (`/assets/sons/`). */
  readonly baseUrl: string;
  /** Acrescentado a cada URL (`?v=<commit>`): o MP3 não tem nome com hash. */
  readonly sufixo?: string;
  readonly buscar?: (url: string) => Promise<ArrayBuffer>;
  readonly decodificar?: (ctx: BaseAudioContext, bytes: ArrayBuffer) => Promise<AudioBuffer>;
  readonly aviso?: (mensagem: string, erro?: unknown) => void;
}

/** O que `escolher` devolve e `tocar` consome. Tudo já resolvido: nenhuma decisão fica para o instante de tocar. */
export interface EscolhaDeAmostra {
  readonly id: string;
  readonly folha: string;
  readonly buffer: AudioBuffer;
  /** Deslocamento dentro da folha, em s (buffer). */
  readonly offset: number;
  /** Duração a ler da folha, em s (buffer, antes da taxa). */
  readonly duracaoNoBuffer: number;
  readonly taxa: number;
  /** Ganho linear final (manifesto x toque x volume do banco). */
  readonly ganho: number;
  /** Quanto tempo a amostra soa, em s (já dividido pela taxa). */
  readonly duracao: number;
  /** Atraso a partir de agora, em s. */
  readonly quando: number;
  readonly filtro?: FiltroAmostra;
  readonly atacarCom: 'inteiro' | 'inicio' | 'fim';
}

const buscarBytesPadrao = async (url: string): Promise<ArrayBuffer> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.arrayBuffer();
};

/** `decodeAudioData` na forma de callback com a promessa como rede: o WebKit antigo só tem a forma de callback e devolve `undefined`. */
export const decodificarPadrao = (ctx: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> =>
  new Promise<AudioBuffer>((resolver, rejeitar) => {
    try {
      const p = ctx.decodeAudioData(bytes, resolver, (e) => rejeitar(e ?? new Error('decodeAudioData falhou')));
      if (p && typeof (p as Promise<AudioBuffer>).then === 'function') (p as Promise<AudioBuffer>).then(resolver, rejeitar);
    } catch (e) {
      rejeitar(e);
    }
  });

export class BancoDeAmostras {
  /** Escuta A/B: false = `escolher` sempre devolve null (toca a síntese de hoje). */
  ligado = true;
  /** O vidro sintetizado sobre `guarda.quebra` (decisão de ouvido). */
  vidroSobreGuarda = VIDRO_SOBRE_GUARDA_PADRAO;
  /** Volume de todas as amostras (a escuta mexe; o jogo deixa em 1). */
  volume = 1;

  private readonly folhas = new Map<string, Folha>();
  private readonly pool = new Map<string, readonly CorteDeAmostra[]>();
  private readonly atuais = new Set<string>();
  private fila: Promise<void> = Promise.resolve();
  private contexto: BaseAudioContext | null = null;
  private readonly buscar: (url: string) => Promise<ArrayBuffer>;
  private readonly decodificar: (ctx: BaseAudioContext, bytes: ArrayBuffer) => Promise<AudioBuffer>;
  private readonly aviso: (mensagem: string, erro?: unknown) => void;
  private relogio = 0;

  constructor(
    readonly manifesto: ManifestoDeAmostras,
    private readonly dep: DependenciasDoBanco,
  ) {
    this.buscar = dep.buscar ?? buscarBytesPadrao;
    this.decodificar = dep.decodificar ?? decodificarPadrao;
    this.aviso = dep.aviso ?? ((m, e): void => void console.warn(m, e));
    for (const [nome, f] of Object.entries(manifesto.folhas)) {
      this.folhas.set(nome, { nome, arquivo: f.arquivo, estado: 'pendente', bytes: null, buffer: null, ataques: new Map(), tentativas: 0, usadaEm: -Infinity });
    }
    // `leve2` e `pesado2` são variantes de `leve` e `pesado`: um só grupo, a escolha vem do `u` do pedido
    const grupos = new Map<string, CorteDeAmostra[]>();
    for (const [id, v] of Object.entries(manifesto.sons)) {
      const base = idBaseDaVariante(id);
      const g = grupos.get(base) ?? [];
      g.push(...cortesDe(v));
      grupos.set(base, g);
    }
    for (const [id, g] of grupos) this.pool.set(id, g);
  }

  // --- consulta ---
  /** O manifesto declara este som (mesmo que a folha ainda não tenha chegado). */
  tem(id: string): boolean {
    return this.pool.has(id);
  }
  /** Há ao menos um corte deste som decodificado e com ataque achado: `escolher` o encontraria. */
  pronta(id: string): boolean {
    return (this.pool.get(id) ?? []).some((c) => this.cortePronto(c) !== null);
  }
  estadoDaFolha(nome: string): EstadoDaFolha | undefined {
    return this.folhas.get(nome)?.estado;
  }
  nomesDeFolha(): string[] {
    return [...this.folhas.keys()];
  }
  /**
   * Quais das folhas pedidas (a `base` sempre, mais as dos lutadores dados) ainda não terminaram: pendente, baixando, baixada (espera o contexto) ou decodificando.
   * Vazio = cada uma ou está pronta ou falhou de vez (aí o jogo toca a síntese, e é o que se ouve). A escuta usa isto para não fazer um A/B em que as duas metades
   * são síntese porque a base ainda não decodificou.
   */
  folhasEmEspera(lutadores: readonly string[] = []): string[] {
    const pedidas = ['base', ...lutadores.filter((id) => id !== 'base')];
    return pedidas.filter((nome) => {
      const e = this.folhas.get(nome)?.estado;
      return e === 'pendente' || e === 'baixando' || e === 'baixada' || e === 'decodificando';
    });
  }
  /** Para a escuta e para os testes: "base: pronta · hayato: baixando". */
  resumo(): string {
    return [...this.folhas.values()].filter((f) => f.estado !== 'pendente').map((f) => `${f.nome}: ${f.estado}`).join(' · ') || 'nenhuma folha pedida ainda';
  }

  private cortePronto(c: CorteDeAmostra): { folha: Folha; ataque: number } | null {
    const folha = this.folhas.get(c.folha);
    if (!folha || folha.estado !== 'pronta' || !folha.buffer) return null;
    const ataque = folha.ataques.get(c);
    return ataque === undefined || ataque < 0 ? null : { folha, ataque };
  }

  // --- escolha (PURA dado o estado do banco) ---
  /**
   * Resolve o pedido do plano em algo que se toca, ou null. A cadeia `ids` é de preferência (o 1º com corte pronto vence); dentro do id, `u` escolhe a variante
   * (`floor(u * n)`); `senao` é o pedido de reserva. Determinístico: mesmo pedido + mesmo estado = mesma escolha.
   */
  escolher(pedido: PedidoAmostra): EscolhaDeAmostra | null {
    if (!this.ligado) return null;
    for (const id of pedido.ids) {
      const prontos = (this.pool.get(id) ?? []).map((c) => ({ c, p: this.cortePronto(c) })).filter((x): x is { c: CorteDeAmostra; p: { folha: Folha; ataque: number } } => x.p !== null);
      if (prontos.length === 0) continue;
      const { c, p } = prontos[Math.min(prontos.length - 1, Math.floor(pedido.u * prontos.length))] as (typeof prontos)[number];
      p.folha.usadaEm = ++this.relogio;
      return this.montar(id, c, p.folha, p.ataque, pedido);
    }
    return pedido.senao ? this.escolher(pedido.senao) : null;
  }

  private montar(id: string, c: CorteDeAmostra, folha: Folha, ataque: number, pedido: PedidoAmostra): EscolhaDeAmostra {
    const buffer = folha.buffer as AudioBuffer;
    const taxa = Math.min(4, Math.max(0.25, (c.taxa ?? 1) * pedido.taxa));
    let offset = Math.max(0, ataque - PRE_ROLL_S);
    let dur = Math.max(0.005, Math.min(buffer.duration - offset, c.dur + (ataque - offset)));
    const parte = pedido.parte ?? 'inteiro';
    if (parte !== 'inteiro') {
      dur /= 2;
      if (parte === 'fim') offset += dur;
    }
    return {
      id,
      folha: folha.nome,
      buffer,
      offset,
      duracaoNoBuffer: dur,
      taxa,
      ganho: Math.pow(10, c.ganhoDb / 20) * pedido.ganho * this.volume,
      duracao: dur / taxa,
      quando: Math.max(0, pedido.quando ?? 0),
      ...(pedido.filtro ? { filtro: pedido.filtro } : {}),
      atacarCom: parte,
    };
  }

  // --- reprodução ---
  /**
   * Toca a escolha: UMA fonte (`start(quando, offset, duração)` direto na folha, sem copiar buffer) -> ganho com saída suave -> [filtro] -> `dest`. Devolve o instante
   * (relógio do contexto) em que a amostra termina. A fonte é o que conta nas 32; o ganho e o filtro não.
   */
  tocar(ctx: BaseAudioContext, e: EscolhaDeAmostra, dest: AudioNode | null): number {
    const t0 = ctx.currentTime + e.quando;
    const fim = t0 + e.duracao;
    if (!dest) return fim;
    const src = ctx.createBufferSource();
    src.buffer = e.buffer;
    src.playbackRate.value = e.taxa;
    const g = ctx.createGain();
    const saida = Math.min(e.atacarCom === 'inteiro' ? 0.004 : 0.012, e.duracao / 2);
    if (e.atacarCom === 'fim') {
      // a 2ª metade nasce no meio do sample: entrada curta, senão estala
      const entrada = Math.min(0.006, e.duracao / 2);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(e.ganho, t0 + entrada);
    } else g.gain.setValueAtTime(e.ganho, t0);
    g.gain.setValueAtTime(e.ganho, Math.max(t0, fim - saida));
    g.gain.linearRampToValueAtTime(0, fim);
    src.connect(g);
    let saidaDoGrafo: AudioNode = g;
    if (e.filtro) {
      const f = ctx.createBiquadFilter();
      f.type = e.filtro.tipo;
      f.frequency.value = e.filtro.f;
      g.connect(f);
      saidaDoGrafo = f;
    }
    saidaDoGrafo.connect(dest);
    src.start(t0, e.offset, e.duracaoNoBuffer);
    return fim;
  }

  // --- carregamento ---
  /**
   * Baixa os bytes da folha (não decodifica: isso espera o contexto). Idempotente. Folha que falhou na REDE tenta de novo no próximo pedido (o confronto seguinte), no
   * máximo 3 vezes no total; sem relógio de parede (nada de `Date.now` em `src/audio`): o espaçamento natural são as lutas.
   */
  async baixarFolha(nome: string): Promise<void> {
    const f = this.folhas.get(nome);
    if (!f) return;
    f.usadaEm = ++this.relogio;
    if (f.estado === 'falhou') {
      if (f.tentativas >= MAX_TENTATIVAS) return;
    } else if (f.estado !== 'pendente') return;
    f.estado = 'baixando';
    f.tentativas++;
    try {
      const bytes = await this.buscar(`${this.dep.baseUrl}${f.arquivo}${this.dep.sufixo ?? ''}`);
      if (f.estado !== 'baixando') return; // descartada (a mais antiga saiu) enquanto baixava
      f.bytes = bytes;
      f.estado = 'baixada';
      if (this.contexto) this.decodificarPendentes(this.contexto);
    } catch (e) {
      f.estado = 'falhou';
      this.aviso(`amostras: a folha '${nome}' não baixou; seguindo com a síntese`, e);
    }
  }

  /**
   * Chamado quando o AudioContext existe (no destrave do áudio e a cada tick da luta): decodifica as folhas já baixadas, UMA POR VEZ (`decodeAudioData` é assíncrono
   * e fora da thread principal; em fila não disputa o decodificador com a música). Barato quando não há nada pendente.
   */
  sincronizar(ctx: BaseAudioContext | null | undefined): void {
    if (!ctx) return;
    this.contexto = ctx;
    this.decodificarPendentes(ctx);
  }

  private decodificarPendentes(ctx: BaseAudioContext): void {
    if ((ctx as { state?: string }).state === 'closed') return;
    for (const f of this.folhas.values()) {
      if (f.estado !== 'baixada' || !f.bytes) continue;
      f.estado = 'decodificando';
      const bytes = f.bytes;
      this.fila = this.fila.then(() => this.decodificarFolha(f, ctx, bytes));
    }
  }

  private async decodificarFolha(f: Folha, ctx: BaseAudioContext, bytes: ArrayBuffer): Promise<void> {
    try {
      const buffer = await this.decodificar(ctx, bytes);
      if (f.estado !== 'decodificando') return; // descartada enquanto decodificava
      const dados = buffer.getChannelData(0);
      f.ataques = new Map();
      for (const cortes of this.pool.values()) {
        for (const c of cortes) if (c.folha === f.nome) f.ataques.set(c, acharAtaque(dados, buffer.sampleRate, c.inicio, c.dur));
      }
      f.buffer = buffer;
      f.bytes = null;
      f.estado = 'pronta';
    } catch (e) {
      f.estado = 'falhou';
      f.bytes = null;
      f.tentativas = MAX_TENTATIVAS; // decodificação que falhou não se resolve baixando de novo
      this.aviso(`amostras: a folha '${f.nome}' não decodificou; seguindo com a síntese`, e);
    }
  }

  /** A `base` e as folhas dos lutadores da luta. Começa a baixar o que falta e solta a folha de lutador mais antiga se passar de 4. */
  prepararLutadores(ids: readonly string[]): void {
    this.atuais.clear();
    this.atuais.add('base');
    for (const id of ids) if (this.folhas.has(id)) this.atuais.add(id);
    for (const nome of this.atuais) void this.baixarFolha(nome);
    this.descartarExcesso();
  }

  private descartarExcesso(): void {
    const deLutador = [...this.folhas.values()].filter((f) => f.nome !== 'base' && f.estado !== 'pendente' && f.estado !== 'falhou');
    if (deLutador.length <= MAX_FOLHAS_DE_LUTADOR) return;
    const candidatas = deLutador.filter((f) => !this.atuais.has(f.nome)).sort((a, b) => a.usadaEm - b.usadaEm);
    for (const f of candidatas.slice(0, deLutador.length - MAX_FOLHAS_DE_LUTADOR)) {
      f.estado = 'pendente';
      f.bytes = null;
      f.buffer = null;
      f.ataques = new Map();
      f.tentativas = 0;
    }
  }
}

// --- manifesto ---
export interface OpcoesDoCarregamento extends DependenciasDoBanco {
  /** Lê o manifesto como TEXTO; null = não há (404, rede, página no lugar do JSON). */
  readonly buscarManifesto?: (url: string) => Promise<string | null>;
}

const buscarManifestoPadrao = async (url: string): Promise<string | null> => {
  const r = await fetch(url);
  return r.ok ? r.text() : null;
};

/**
 * Baixa e VALIDA o manifesto e devolve o banco. NÃO pede nenhuma folha (T5 do orçamento de 2026-10-23): a `base` (272 KiB) sobe na etapa 2 do boot (ocioso, depois do 1º
 * gesto, ver `camadas.ts`) e as dos lutadores na tela VS (`prepararLutadores`); antes disso o jogo toca a síntese. Manifesto AUSENTE ou ilegível (404, rede caída, o servidor de desenvolvimento devolvendo o
 * `index.html` no lugar do JSON) = devolve null e o jogo fica 100% na síntese. Manifesto que existe e é INVÁLIDO (id fora da tabela, corte sem origem ou sem CC0, peso)
 * LANÇA: derruba o boot, alto e cedo, como os dados de sons. O CI valida o manifesto de verdade, então isso nunca chega ao ar.
 */
export async function carregarBanco(o: OpcoesDoCarregamento): Promise<BancoDeAmostras | null> {
  const aviso = o.aviso ?? ((m, e): void => void console.info(m, e));
  let texto: string | null;
  try {
    texto = await (o.buscarManifesto ?? buscarManifestoPadrao)(`${o.baseUrl}manifesto.json${o.sufixo ?? ''}`);
  } catch (e) {
    aviso('amostras: sem rede para o manifesto; seguindo com a síntese', e);
    return null;
  }
  if (texto === null) {
    aviso('amostras: sem manifesto; seguindo com a síntese');
    return null;
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch (e) {
    aviso('amostras: manifesto ilegível (não é JSON); seguindo com a síntese', e);
    return null;
  }
  return new BancoDeAmostras(exigirManifestoValido(bruto), o);
}
