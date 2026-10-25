import { identidadeAtiva, reagirDoJogo } from '../../audio/camadas';
import { tocarReceita, type SintetizadorLike } from '../../audio/receitas';
import { ALTURA, GROUND, LARGURA, SH } from '../../core/constantes';
import type { EventoLuta, IdLutador, LeituraLuta } from '../../core/contratos';
import { criarRng } from '../../core/rng';
import type { IdPlano, Plano } from '../../data/trailer/tipos';
import { aplicarCamera } from '../../render/camera';
import { APRESENTACAO, comPose, leituraApresentada } from '../../render/apresentacao-lutadores';
import { Cinematica } from '../../render/cinematica';
import { HudRitmo } from '../../render/hud-ritmo';
import { TarjaDoSuper } from '../../render/tarja-super';
import { superDoLutador } from '../../data/supers';
import { alturaDoLutador, FilmeDoEspecial } from '../../render/filme';
import { identidadeDe, somDoAcerto } from '../../render/identidade-especiais';
import { roteiroDoFilme } from '../../data/roteiros-filme';
import type { FilmeNoTrailer } from '../../trailer/filme';
import { CampoDePetalas, Efeitos } from '../../render/efeitos';
import { EntradaDoChefe, SOM_DAS_FAIXAS, SOM_DO_CARTAO, somDoBraseiro } from '../../render/entrada-chefe';
import { desenharLutador, chDaFicha } from '../../render/lutador';
import { desenharMundo } from '../../render/mundo';
import { cabecaNaTela, paraATela } from '../../render/provocacao';
import { usarEspacoLogico, type Ctx } from '../../render/tela';
import { CamadaDeContraluz } from '../../render/trailer/contraluz';
import { desenharQuadroEstatico } from '../../render/trailer/estatica';
import { desenharFrio } from '../../render/trailer/frio';
import { desenharFlash, desenharLetterbox } from '../../render/trailer/letterbox';
import { desenharRevelacao } from '../../render/trailer/logo-revelacao';
import { desenharReserva } from '../../render/trailer/reserva';
import { CamadaDaMontagem, desenharMontagem } from '../../render/trailer/retratos';
import { gradeDeCor, desenharSmear, smearNoTick } from '../../render/trailer/grade';
import { CacheDeTitulos, desenharCartao, desenharFundoDoCartao, desenharPlaca, desenharTitulo, desenharTituloNaFaixa, TAMANHO_DO_CARTAO, TAMANHO_NA_FAIXA, Y_DA_FAIXA } from '../../render/trailer/titulos';
import {
  arranjoDaAbertura,
  arranjoDaEstatica,
  DiretorDoTrailer,
  duracaoDaEstatica,
  entradaDaMusica,
  NOME_OCULTO,
  PLACAS,
  pedidosNoPlano,
  planoDeCarga,
  quadroEstaticoNoTick,
  ROTEIRO,
  temMotor,
  TEXTOS,
  tickAlvoDoAudio,
  TICKS_POR_COMPASSO,
  ticksAAvancar,
  TOMADAS,
  type QuadroDoTrailer,
  type QuadroEstaticoNoTick,
} from '../../trailer';
import { FILA_DESBLOQUEIO, liberados } from '../../meta';
import { CENARIOS_DO_TITULO, LUTADORES_DO_TITULO, type PedidoDeCarga } from '../../trailer/carga';
import { ARTE_DE_ABERTURA_DO_TRAILER } from '../residencia';
import type { Navegador } from '../navegador';
import type { ArgsTrailer } from '../tipos';
import type { CenaTitle } from '../cenas/title';
import type { CenaTrailer } from '../cenas/trailer';
import { marca } from '../logo';
import { parametroDoTrailer } from '../cenas/trailer';
import { vazaoDoBoot } from '../../platform/vazao';
import { conexaoDoNavegador, decidirTrailerEstatico, LIMITE_DE_RESERVAS, prerolarNoOrcamento, type MotivoDoEstatico } from './ambiente';
import { aquecerImagens, agendadorOcioso, canvasDeAquecimento } from './aquecer';
import { CargaEscalonada } from './arte';

/*
 * O trailer em cena (docs/spec-trailer-abertura.md). Esta classe é o pedaço LAZY: o `CenaTrailer` (casca) a cria quando o pedaço chega. Ela só APRESENTA: o estado do
 * trailer é função do tick do `DiretorDoTrailer` (src/trailer), que cria e descarta os PRÓPRIOS `Game` com semente constante, e nunca toca no `mundo.game`, no
 * `rngLogica`, no `rngVisual`, no `rngUI` nem nas sementes +4/+5/+6. Os efeitos (faíscas, pétalas, tarja) usam `criarRng(ROTEIRO.sementeVisual)`, também constante.
 *
 * Relógio: sem música, o tick do laço (1 por `update`); com a música tocando, o relógio do `AudioContext` manda e os quadros perdidos no celular não desalinham corte e
 * batida (spec §4.5). A música só começa depois de um gesto (`audio.ctx.state === 'running'`), sempre no compasso seguinte; o trailer nunca chama `resume()`.
 */

/** Pular só vale depois deste tick da cena (a tecla que abriu o trailer, e a repetição dela, não o pulam). */
export const PULO_VALE_A_PARTIR_DE = 10;
/** No início do `boot`, espera o `AudioContext` virar `running` por até isto (ticks): a música entra no compasso 0, e a espera cai no preto do P0. */
export const ESPERA_DO_AUDIO_TICKS = 24;
/** Fade da música ao sair (s): pulo, fim natural e aba oculta (0 = corta). */
export const FADE_AO_PULAR = 0.3;
export const FADE_NO_FIM = 1.2;

const INICIOS: readonly number[] = (() => {
  let t = 0;
  return ROTEIRO.planos.map((p) => {
    const i = t;
    t += p.compassos * TICKS_POR_COMPASSO;
    return i;
  });
})();

const indiceDoPlano = (tick: number): number => {
  let i = 0;
  while (i + 1 < INICIOS.length && (INICIOS[i + 1] as number) <= tick) i++;
  return i;
};

export interface ControladorDoTrailer {
  readonly ativo: boolean;
  readonly pronta: boolean;
  entrar(args: ArgsTrailer): void;
  sair(): void;
  update(): void;
  draw(): void;
  /** Devolve true (a tecla é sempre engolida: o título não a vê). */
  key(): boolean;
  blur(): void;
  diagnostico(): unknown;
}

type EstadoDaMusica = 'pendente' | 'tocando' | 'muda' | 'parada';

export class TrailerEmCena implements ControladorDoTrailer {
  ativo = false;
  pronta = false;
  private args: ArgsTrailer = { origem: 'boot' };
  private estatico = false;
  /** Por que a versão estática foi escolhida (null = completa). */
  private motivoEstatico: MotivoDoEstatico | null = null;
  /** O completo desistiu no meio (reserva em série) e a cena seguiu pelo estático. */
  private degradou = false;
  private d: DiretorDoTrailer | null = null;
  private carga: CargaEscalonada | null = null;
  private q: QuadroDoTrailer | null = null;
  private qe: QuadroEstaticoNoTick | null = null;
  /** Próximo tick da versão estática a produzir. */
  private tickEstatico = 0;
  /** Updates desde que a cena abriu (o portão do pulo e da espera do áudio). */
  private tCena = 0;
  private musica: EstadoDaMusica = 'pendente';
  private fadeDaSaida = FADE_AO_PULAR;
  private fimPendente = false;
  private saindo = false;
  private planoVisto: IdPlano | null = null;
  private ultimoTickDoJogo = -1;
  private mostrouOPrimeiroQuadro = false;
  /** Prévia de desenvolvimento (`?trailer=P5`): espera a arte do plano chegar antes de andar. */
  private esperaPorArte: { readonly lutadores: readonly string[]; readonly cenarios: readonly string[] } | null = null;
  private zenonLiberado = true;
  private efeitos = new Efeitos(criarRng(ROTEIRO.sementeVisual));
  private petalas = new CampoDePetalas(criarRng(ROTEIRO.sementeVisual + 1), 'luta');
  private cine: Cinematica;
  /** A ÚNICA tarja do trailer (R-15): a do SUPER do P9, 30 ticks com o motor parado (o diretor o segura). A do especial comum não existe aqui. */
  private readonly tarjaDoSuper = new TarjaDoSuper({ rng: criarRng(ROTEIRO.sementeVisual + 7) });
  /** Só o contador de acertos entra no trailer (sem DANGER nem nota: a cena é de câmera, não de placar). Anda no tick do motor, como na luta. */
  private readonly hudRitmo = new HudRitmo();
  /** O FILME do especial (D-V6): o motor do plano fica parado pelos ticks dele (o ritmo do diretor), e a cena o toca por cima do mundo. */
  private filme: FilmeDoEspecial;
  /** Eventos do tick do contato que esperam o filme: o pó da queda (na batida da queda) e o resto (KO, fim de round...) para o fim. */
  private adiadosNaQueda: EventoLuta[] = [];
  private adiadosNoFim: EventoLuta[] = [];
  private entrada: EntradaDoChefe;
  private readonly camada = new CamadaDeContraluz();
  private readonly titulos = new CacheDeTitulos();
  private readonly montagem = new CamadaDaMontagem();

  constructor(private readonly ui: Navegador) {
    const sintetizador = (): SintetizadorLike => ui.c.audio as unknown as SintetizadorLike;
    this.cine = new Cinematica({
      rng: criarRng(ROTEIRO.sementeVisual + 2),
      aoSom: (momento, id) => {
        if (momento === 'abertura' && identidadeAtiva()) return;
        tocarReceita(sintetizador(), momento === 'abertura' ? id.abertura : id.batida);
      },
    });
    this.filme = new FilmeDoEspecial({
      rng: criarRng(ROTEIRO.sementeVisual + 3),
      aoSom: (som, atacante, nivel) => {
        const f = this.q?.luta?.fighters[atacante];
        if (!f) return;
        const base = somDoAcerto(f.id, f.ficha ?? null);
        if (som === 'leve') tocarReceita(sintetizador(), base.slice(0, 1), { vol: 0.7 });
        else tocarReceita(sintetizador(), base);
        if (som === 'final' || nivel >= 3) tocarReceita(sintetizador(), [{ k: 'T', tipo: 'sine', f0: 70, t: 0.4, vol: 0.7 }]);
      },
      aoImpacto: ({ x, y, cor, grande, contragolpe }) => {
        this.efeitos.faiscas(x, y, cor, grande ? 24 : 14);
        this.efeitos.estrela(x, y, cor, grande);
        if (contragolpe) this.efeitos.textoFlutuante(x, y - 40, 'COUNTER!', '#ff9a3a', 24);
      },
      aoQueda: () => {
        const lista = this.adiadosNaQueda;
        this.adiadosNaQueda = [];
        this.reagirAosEventos(lista, true);
      },
    });
    this.entrada = new EntradaDoChefe({
      aoSom: (som) =>
        tocarReceita(sintetizador(), som === 'faixas' ? SOM_DAS_FAIXAS : som === 'cartao' ? SOM_DO_CARTAO : som === 'assinatura' ? this.entrada.assinatura : somDoBraseiro(som.braseiro)),
    });
    // fora do caminho do 1º quadro, no tempo ocioso do boot (a tela de "CLIQUE" espera o gesto): a música da abertura compila (alguns ms) e a arte FIXA ganha o 1º desenho
    // (decodificação e envio à GPU, 100 a 550 ms numa imagem grande), uma imagem por vez
    const agendar = agendadorOcioso();
    agendar(() => {
      try {
        arranjoDaAbertura();
      } catch (e) {
        console.error('trailer: o arranjo não compilou; o trailer toca mudo', e);
      }
    });
    try {
      const alvo = canvasDeAquecimento();
      if (alvo) aquecerImagens(this.imagensFixas(), alvo, agendar);
    } catch {
      /* sem aquecimento o 1º desenho paga o custo, como sempre */
    }
  }

  /** A arte de um pedido acabou de chegar: o 1º desenho dela (decodificação e GPU) sai num tempo ocioso, antes do plano que a usa, e não no 1º quadro dele. */
  private aquecerQueChegou(p: PedidoDeCarga): void {
    try {
      const alvo = canvasDeAquecimento();
      if (!alvo) return;
      const arte = this.ui.m.arte as unknown as { atlas: Map<string, { paginas: CanvasImageSource[] | null }>; cenarios: Map<string, CanvasImageSource> };
      const imagens: CanvasImageSource[] = [];
      for (const l of p.lutadores) imagens.push(...(arte.atlas.get(l)?.paginas ?? []));
      for (const cen of p.cenarios) {
        const c = arte.cenarios.get(cen);
        if (c) imagens.push(c);
      }
      aquecerImagens(imagens, alvo, agendadorOcioso(), () => !this.ativo);
    } catch {
      /* sem aquecimento o 1º desenho paga o custo, como sempre */
    }
  }

  /**
   * A arte dos dois primeiros planos (P0 e P1) que já está na memória quando o pedaço do trailer carrega, no tempo ocioso da tela de "CLIQUE": a cena os mantém ao entrar
   * (`ARTE_DE_ABERTURA_DO_TRAILER`), então o 1º desenho deles já saiu e o 1º quadro não paga o custo de primeira vez. O resto do trailer não tem arte fixa: cada pedido
   * é aquecido quando chega (`aquecerQueChegou`).
   */
  private imagensFixas(): CanvasImageSource[] {
    const arte = this.ui.m.arte as unknown as { atlas: Map<string, { pronta: boolean; paginas: CanvasImageSource[] | null }>; cenarios: Map<string, CanvasImageSource> };
    const r: CanvasImageSource[] = [];
    for (const id of ARTE_DE_ABERTURA_DO_TRAILER.lutadores ?? []) for (const p of arte.atlas.get(id)?.paginas ?? []) r.push(p);
    for (const id of ARTE_DE_ABERTURA_DO_TRAILER.cenarios ?? []) {
      const c = arte.cenarios.get(id);
      if (c) r.push(c);
    }
    return r;
  }

  private get casca(): CenaTrailer {
    return this.ui.cenas.trailer as CenaTrailer;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------ abrir e fechar

  entrar(args: ArgsTrailer): void {
    this.sair();
    this.saindo = false;
    this.args = args;
    const { regras, persist } = this.ui.c;
    const reduz = this.ui.c.reduzirMovimento?.() ?? false;
    // estático ou completo: movimento reduzido, economia de dados / 2g-3g (Network Information API) OU vazão medida no boot abaixo do limiar (o iPhone não tem a API)
    const decisao = decidirTrailerEstatico({ reduzirMovimento: reduz, conexao: conexaoDoNavegador(), vazao: vazaoDoBoot() });
    this.estatico = decisao.estatico;
    this.motivoEstatico = decisao.motivo;
    this.degradou = false;
    this.tCena = 0;
    this.fimPendente = false;
    this.q = null;
    this.qe = null;
    this.tickEstatico = 0;
    this.planoVisto = null;
    this.ultimoTickDoJogo = -1;
    this.mostrouOPrimeiroQuadro = false;
    this.esperaPorArte = null;
    this.fadeDaSaida = FADE_AO_PULAR;
    this.zenonLiberado = liberados(persist.prog, regras).has('zenon');
    // música: o gesto do boot liga; o modo atrair só toca na 1ª repetição depois do último gesto (D-T4)
    if (args.origem === 'boot') {
      this.casca.repeticoesDoAtrair = 0;
      this.musica = 'pendente';
    } else {
      this.musica = this.casca.repeticoesDoAtrair === 0 ? 'pendente' : 'muda';
      this.casca.repeticoesDoAtrair++;
    }
    this.efeitos = new Efeitos(criarRng(ROTEIRO.sementeVisual));
    this.petalas = new CampoDePetalas(criarRng(ROTEIRO.sementeVisual + 1), 'luta');
    this.cine.zerarLuta();
    this.tarjaDoSuper.zerarLuta();
    this.hudRitmo.zerar();
    this.entrada.zerar();
    document.body.classList.add('em-trailer');
    document.body.dataset['trailer'] = this.estatico ? 'estatico' : 'completo';
    this.ativo = true;
    if (!this.estatico) this.prepararOCompleto();
    else this.prepararAEstatica(this.motivoEstatico);
    this.pronta = true;
  }

  /**
   * A versão estática desenha a vitrine e os cenários do título (spec §6.3) e não tem plano de carga. A cena do trailer entra exclusiva (`arteDaCena`) e solta tudo, então ela pede
   * a vitrine e os 4 cenários aqui e os marca em uso: 133,6 MiB de imagem, dentro dos 150. Os quadros desenham o que já chegou e o resto entra quando chega.
   * Por rede lenta (vazão, economia de dados ou a desistência do completo) NÃO se pedem os atlas (4,7 MiB que competiriam com os retratos): só os 4 cenários, e os quadros
   * mostram o rosto (retrato ou placa tipográfica) no lugar da pose.
   */
  private prepararAEstatica(motivo: MotivoDoEstatico | null): void {
    const arte = this.ui.m.arte;
    const pedido = { lutadores: motivo === 'movimento' ? [...LUTADORES_DO_TITULO] : [], cenarios: [...CENARIOS_DO_TITULO] };
    arte.usar(pedido);
    arte.garantir(pedido).catch((e: unknown) => console.error('trailer: a arte da versão estática não chegou', e));
  }

  private prepararOCompleto(): void {
    const m = this.ui.m;
    const lutadores = {} as Record<IdLutador, (typeof m.elenco)[IdLutador]['ch']>;
    for (const id of Object.keys(m.elenco) as IdLutador[]) lutadores[id] = m.elenco[id].ch;
    const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores, criarRng });
    this.d = d;
    const carga = new CargaEscalonada(ROTEIRO, planoDeCarga(ROTEIRO), m.arte, (p) => this.aquecerQueChegou(p));
    this.carga = carga;
    carga.limparSobras();
    // prévia de desenvolvimento: `?trailer=P5` abre no começo do plano (pré-rola os anteriores de uma vez e espera a arte do plano)
    const alvo = parametroDoTrailer();
    const k = alvo ? ROTEIRO.planos.findIndex((p) => p.id === alvo) : -1;
    if (k > 0) {
      while (d.tickAtual < (INICIOS[k] as number)) {
        d.prerolar(Number.MAX_SAFE_INTEGER);
        d.avancar();
      }
      d.prerolar(Number.MAX_SAFE_INTEGER);
      carga.entrouNoPlano(k);
      // só os planos de luta esperam a arte (são os que viram cartão de reserva sem ela); a abertura, os cartões e a logo desenham o que já chegou
      this.esperaPorArte = temMotor(ROTEIRO.planos[k] as Plano) ? d.pedidosDeArte().agora : null;
      this.planoVisto = null;
    } else carga.entrouNoPlano(0);
  }

  sair(): void {
    if (!this.ativo && !this.d && !this.carga) return;
    this.ativo = false;
    this.pronta = false;
    document.body.classList.remove('em-trailer');
    delete document.body.dataset['trailer'];
    this.pararMusica(this.fadeDaSaida);
    this.carga?.liberarTudo();
    this.carga = null;
    this.d = null;
    this.q = null;
    this.qe = null;
    this.camada.soltar();
    this.titulos.soltar();
    this.montagem.soltar();
    this.cine.zerarLuta();
    this.tarjaDoSuper.zerarLuta();
    this.hudRitmo.zerar();
    this.entrada.zerar();
    this.efeitos.limpar();
  }

  private pararMusica(fade: number): void {
    if (this.musica === 'tocando') this.ui.c.audio.pararAbertura(fade);
    if (this.musica !== 'muda') this.musica = 'parada';
  }

  // ------------------------------------------------------------------------------------------------------------------------------------ entrada do jogador

  key(): boolean {
    if (!this.ativo || this.saindo) return true;
    if (this.tCena <= PULO_VALE_A_PARTIR_DE) return true;
    this.casca.registrarGesto();
    // no c25 a chamada "PRESSIONE ENTER" já está na tela: a tecla age como no título (vai ao menu e toca o OK), sem apertar duas vezes
    const noPrompt = this.estatico ? (this.qe?.prompt ?? false) : (this.q?.logo?.prompt ?? false);
    this.saindo = true;
    this.fadeDaSaida = FADE_AO_PULAR;
    this.pararMusica(FADE_AO_PULAR);
    if (noPrompt) {
      this.ui.go('menu');
      this.ui.c.audio.uiOk();
    } else this.ui.go('title', { fromTrailer: true });
    return true;
  }

  blur(): void {
    // aba oculta ou perda de foco: para a música e vai para o título SEM fade; ao voltar o jogador já está lá
    if (!this.ativo || this.saindo || this.ui.fadeTo) return;
    this.pararMusica(0);
    this.fadeDaSaida = 0;
    this.ui.set('title', { fromTrailer: true });
  }

  // ------------------------------------------------------------------------------------------------------------------------------------ tempo

  update(): void {
    if (!this.ativo) return;
    this.tCena++;
    if (this.fimPendente) {
      this.terminar();
      return;
    }
    this.tentarMusica();
    // o 1º quadro (preto, só o cenário) sai antes de qualquer trabalho de preparo: a pré-rolagem e os títulos esperam o 3º tick
    if (this.tCena >= 3 && this.tCena <= 20) this.aquecerTitulos();
    if (this.estatico) this.updateEstatico();
    else this.updateCompleto();
  }

  private terminar(): void {
    if (this.saindo) return;
    this.saindo = true;
    this.fadeDaSaida = FADE_NO_FIM;
    this.ui.set('title', { fromTrailer: true });
  }

  /** Próximo tick a produzir (completo ou estático). */
  private get tickAtual(): number {
    return this.estatico ? this.tickEstatico : (this.d?.tickAtual ?? 0);
  }

  private tentarMusica(): void {
    if (this.musica !== 'pendente') return;
    const { audio } = this.ui.c;
    if (audio.ctx?.state !== 'running') return;
    const t = this.tickAtual;
    // no início (o gesto do boot acabou de criar o contexto) a música entra no compasso 0; depois, sempre no compasso seguinte (iOS: o `resume()` resolve tarde)
    const e = t <= 6 ? { compasso: 0, emSegundos: undefined } : entradaDaMusica(t);
    const ok = audio.tocarAbertura({
      aPartirDoCompasso: e.compasso,
      arranjo: this.estatico ? arranjoDaEstatica() : arranjoDaAbertura(),
      ...(e.emSegundos === undefined ? {} : { emSegundos: e.emSegundos }),
    });
    this.musica = ok ? 'tocando' : 'pendente';
  }

  /** O áudio ainda vai destravar (contexto criado e suspenso) no começo de um boot: segura o tick 0 por até 24 ticks, no preto do P0. */
  private esperandoOAudio(): boolean {
    if (this.args.origem !== 'boot' || this.musica !== 'pendente' || this.tickAtual > 0 || this.tCena > ESPERA_DO_AUDIO_TICKS) return false;
    return this.ui.c.audio.ctx?.state === 'suspended';
  }

  /** Quantos ticks avançar neste update: 1 sem música; com a música, os que faltam para o relógio do `AudioContext`. */
  private ticksDesteUpdate(duracao: number): { readonly ticks: number; readonly pular: boolean } {
    const audio = this.ui.c.audio;
    const alvo = this.musica === 'tocando' ? tickAlvoDoAudio(audio.posicaoDaAbertura()) : null;
    // `tickAtual` é o PRÓXIMO a produzir; o último produzido é tickAtual - 1
    const r = ticksAAvancar(this.tickAtual - 1, alvo);
    return { ticks: Math.min(r.ticks, Math.max(0, duracao - this.tickAtual)), pular: r.pular };
  }

  private updateCompleto(): void {
    const d = this.d;
    if (!d) return;
    if (this.tCena >= 3) prerolarNoOrcamento((n) => d.prerolar(n), () => performance.now());
    if (this.esperaPorArte) {
      if (!this.carga?.pronto(this.esperaPorArte)) return;
      this.esperaPorArte = null;
    }
    if (this.esperandoOAudio()) return;
    const { ticks, pular } = this.ticksDesteUpdate(d.duracao);
    for (let i = 0; i < ticks; i++) {
      if (this.aoComecarUmTick(d)) return; // desistiu do completo: o estático assume no próximo update
      this.processar(d.avancar(), !pular || i >= ticks - 3);
      if (d.fim) {
        this.fimPendente = true;
        break;
      }
    }
  }

  /** Antes de produzir um tick: se ele abre um plano, solta/inicia a carga da arte e decide a reserva dos planos de luta ANTES de o plano começar. */
  private aoComecarUmTick(d: DiretorDoTrailer): boolean {
    const t = d.tickAtual;
    const k = indiceDoPlano(t);
    if ((INICIOS[k] as number) !== t) return false;
    const carga = this.carga as CargaEscalonada;
    carga.entrouNoPlano(k);
    const plano = ROTEIRO.planos[k] as Plano;
    if (temMotor(plano) && !carga.pronto(d.pedidosDeArte().agora)) {
      // reserva em série é pior que o estático: o 1º cartão de reserva é tolerado (e nunca sai vazio), o 2º faz a cena seguir pelo estático
      if (d.planosEmReserva().length + 1 >= LIMITE_DE_RESERVAS) {
        this.degradarParaOEstatico(t);
        return true;
      }
      d.reservaForcada(plano.id);
    }
    return false;
  }

  /**
   * Desiste do completo no meio (a rede não sustenta a carga por plano): solta a carga e o diretor, para a música da abertura e segue pela versão estática a partir do quadro dela
   * que corresponde ao compasso em que estava (a música do estático é o mesmo arranjo, só nos compassos do roteiro). Sem cartão de reserva em série.
   */
  private degradarParaOEstatico(tick: number): void {
    const compassoAtual = Math.floor(tick / TICKS_POR_COMPASSO);
    const marcas = ROTEIRO.estatica.compassosDaMusica;
    const achado = marcas.findIndex((c) => c >= compassoAtual);
    const quadro = achado < 0 ? marcas.length - 1 : achado;
    this.carga?.liberarTudo();
    this.carga = null;
    this.d = null;
    this.q = null;
    this.qe = null;
    this.camada.soltar();
    this.montagem.soltar();
    this.cine.zerarLuta();
    this.tarjaDoSuper.zerarLuta();
    this.hudRitmo.zerar();
    this.entrada.zerar();
    this.filme.zerar();
    this.efeitos.limpar();
    this.adiadosNaQueda = [];
    this.adiadosNoFim = [];
    this.esperaPorArte = null;
    // a música da abertura completa sai (fade curto) e a do estático entra no compasso seguinte ao do quadro; sem música (modo atrair repetido) segue muda
    const mudo = this.musica === 'muda';
    this.pararMusica(0.25);
    this.musica = mudo ? 'muda' : 'pendente';
    this.estatico = true;
    this.motivoEstatico = 'vazao';
    this.degradou = true;
    this.tickEstatico = quadro * ROTEIRO.estatica.ticksPorQuadro;
    document.body.dataset['trailer'] = 'estatico';
    this.prepararAEstatica('vazao');
  }

  private updateEstatico(): void {
    const total = duracaoDaEstatica(ROTEIRO);
    if (this.esperandoOAudio()) return;
    const { ticks } = this.ticksDesteUpdate(total);
    for (let i = 0; i < ticks; i++) {
      this.qe = quadroEstaticoNoTick(ROTEIRO, this.tickEstatico);
      this.tickEstatico++;
      if (this.tickEstatico >= total) {
        this.fimPendente = true;
        break;
      }
    }
  }

  /** Os efeitos e sons de UM tick do trailer (todos os ticks do salto passam por aqui; só o último é desenhado). */
  private processar(q: QuadroDoTrailer, comSom: boolean): void {
    this.q = q;
    if (q.plano.id !== this.planoVisto) {
      this.planoVisto = q.plano.id;
      this.efeitos.limpar();
      this.ultimoTickDoJogo = -1;
      this.cine.zerarLuta();
      this.tarjaDoSuper.zerarLuta();
      this.hudRitmo.zerar();
      this.entrada.zerar();
      this.filme.zerar();
      this.adiadosNaQueda = [];
      this.adiadosNoFim = [];
    }
    const luta = q.luta;
    if (luta && q.motorAndou) {
      // Tick com FILME: o acerto que o abriu e os sons/efeitos dele são do filme (por batida); KO, fim de round e o pó da queda esperam (como na cena da luta)
      const eventos = q.filme ? this.separarParaOFilme(q.eventos) : q.eventos;
      this.reagirAosEventos(eventos, comSom);
      this.petalas.avancar(luta.t);
      if (luta.tick !== this.ultimoTickDoJogo) {
        this.ultimoTickDoJogo = luta.tick;
        this.efeitos.avancar();
        this.hudRitmo.avancar(luta);
      }
    } else if (luta && this.filme.ativo) {
      // o motor está parado pelo filme: os efeitos dele andam, o filme avança, e quando fecha o que esperou acontece
      this.filme.avancar();
      this.efeitos.avancar();
      if (!this.filme.ativo) {
        const lista = [...this.adiadosNaQueda, ...this.adiadosNoFim];
        this.adiadosNaQueda = [];
        this.adiadosNoFim = [];
        this.reagirAosEventos(lista, comSom);
      }
    }
    if (q.filme && luta) this.iniciarFilme(q.filme, luta);
    // a tarja do especial (só nas batidas marcadas): começa neste tick e anda nos seguintes, em que o motor está congelado
    if (q.cine) {
      this.cine.iniciar(this.eventoDaCine(q.cine.ev, luta), q.cine.modo);
    } else if (this.cine.ativa) this.cine.avancar();
    // a tarja do SUPER (a única do trailer): o diretor para o motor por 30 ticks; ela começa no tick do `special` e anda nos seguintes
    if (q.tarjaSuper && luta) this.iniciarTarjaDoSuper(q.tarjaSuper, luta);
    else if (this.tarjaDoSuper.ativa) this.tarjaDoSuper.avancar();
    // a entrada curta do chefão (P9): cartão e fala
    const arc = q.arconte;
    if (arc?.entrada) {
      if (arc.tickDaEntrada === 0) this.iniciarEntrada();
      else this.entrada.avancar();
    } else if (this.entrada.ativa) {
      // a janela da entrada (96-155) fechou: ela já está nas últimas faixas, e o 60º `avancar` nunca viria (a luta segue, o filme entra): encerra limpa
      this.entrada.zerar();
    }
  }

  /** Som e efeitos de uma lista de eventos do motor. */
  private reagirAosEventos(eventos: readonly EventoLuta[], comSom: boolean): void {
    const luta = this.q?.luta;
    if (!luta) return;
    if (comSom && eventos.length > 0) reagirDoJogo(this.ui.c.audio, luta, eventos);
    for (const ev of eventos) {
      this.efeitos.reagir(
        ev,
        (i) => luta.fighters[i],
        (i) => this.corDoLutador(luta, i),
      );
    }
  }

  /** Dos eventos de um tick com filme: devolve os que acontecem JÁ; o acerto do filme e o evento `filme` somem (são do filme), a queda e o fim esperam. */
  private separarParaOFilme(eventos: readonly EventoLuta[]): EventoLuta[] {
    const agora: EventoLuta[] = [];
    this.adiadosNaQueda = [];
    this.adiadosNoFim = [];
    for (const ev of eventos) {
      if (ev.tipo === 'filme') continue;
      if ((ev.tipo === 'hit' || ev.tipo === 'throw') && ev.filme === true) continue;
      if (ev.tipo === 'dust') this.adiadosNaQueda.push(ev);
      else if (ev.tipo === 'ko' || ev.tipo === 'round' || ev.tipo === 'perfect' || ev.tipo === 'fase-chefe') this.adiadosNoFim.push(ev);
      else agora.push(ev);
    }
    return agora;
  }

  /** Abre o filme de um evento `filme` do motor (D-V6). A luta já está no estado final do golpe; o motor fica parado pelos ticks do filme (ritmo do diretor). */
  private iniciarFilme(f: FilmeNoTrailer, luta: LeituraLuta): void {
    const ev = f.ev;
    const fa = luta.fighters[ev.atacante];
    const ch = chDaFicha(this.ui.m.elenco[fa.id].ch, ev.ficha);
    this.filme.iniciar({
      ev,
      roteiro: roteiroDoFilme(fa.id, ev.ficha, ev.golpe, ev.projetil),
      modo: f.modo,
      rivalAntes: f.rivalAntes,
      cor: identidadeDe(fa.id, ev.ficha, ev.golpe)?.paleta.brilho ?? ch.fire[0],
      alturaDoAtacante: alturaDoLutador(ch),
      cameraInicial: { x: luta.cam.x, z: luta.cam.z },
    });
  }

  /** Abre a tarja do SUPER (o evento `special` com `super: true`): o nome é o do super (CORTESIA DA CASA), não o do especial de origem. */
  private iniciarTarjaDoSuper(ev: EventoLuta, luta: LeituraLuta): void {
    if (ev.tipo !== 'special' || ev.golpe === undefined) return;
    const ficha = ev.ficha ?? luta.fighters[ev.lutador].ficha ?? null;
    const nome = superDoLutador(luta.fighters[ev.lutador].id, ficha)?.nome ?? ev.golpe;
    this.tarjaDoSuper.iniciar({ lutador: ev.lutador, golpe: ev.golpe, ficha, nome });
  }

  private corDoLutador(luta: LeituraLuta, i: 0 | 1): string {
    const f = luta.fighters[i];
    return chDaFicha(this.ui.m.elenco[f.id].ch, f.ficha).fire[0];
  }

  private eventoDaCine(ev: EventoLuta, luta: LeituraLuta | null): Parameters<Cinematica['iniciar']>[0] {
    const e = ev as Extract<EventoLuta, { tipo: 'special' }>;
    const ficha = e.ficha ?? luta?.fighters[e.lutador].ficha ?? null;
    return { lutador: e.lutador, golpe: e.golpe as string, ficha, ...(e.quadro ? { quadro: e.quadro } : {}), ...(e.entrada ? { entrada: e.entrada } : {}) };
  }

  private iniciarEntrada(): void {
    const ap = APRESENTACAO['zenon'];
    const roteiro = ap?.roteiro;
    if (!roteiro) return;
    // D-T2: enquanto o ZENON não foi liberado, o nome fica oculto no cartão ("???"); o resto (título e rodapé) é o de sempre
    const cartao = this.zenonLiberado ? roteiro.cartao : { ...roteiro.cartao, nome: NOME_OCULTO };
    this.entrada.iniciar('curta', cartao, ap?.falas?.entrada ?? '', roteiro);
    this.entrada.sobreposta = true;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------ desenho

  draw(): void {
    if (!this.ativo) return;
    const { ctx } = this.ui.c;
    usarEspacoLogico(ctx);
    if (this.estatico) this.desenharEstatico();
    else if (this.q) this.desenharCompleto(this.q);
    else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }
    if (!this.mostrouOPrimeiroQuadro) {
      this.mostrouOPrimeiroQuadro = true;
      if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        performance.mark('trailer:quadro1');
        try {
          performance.measure('trailer:1o-quadro', 'trailer:gesto', 'trailer:quadro1');
        } catch {
          /* sem a marca do gesto (o trailer abriu por gancho de teste ou pelo modo atrair): não há o que medir */
        }
      }
    }
  }

  private logo = (ctx: Parameters<typeof marca.desenharLogo>[0], x: number, y: number, altura: number, shine: number, alpha: number): boolean => marca.desenharLogo(ctx, x, y, altura, shine, alpha);

  private rotuloDaChamada(): string {
    return this.ui.c.temToque() ? TEXTOS['toque-para-jogar'] : TEXTOS['pressione-enter'];
  }

  /** A cor do lutador (`fire[0]`, na ficha base): a faixa e o aro da placa, o painel da montagem, o miolo do selo. */
  private corDe(id: IdLutador): string {
    return chDaFicha(this.ui.m.elenco[id].ch, null).fire[0];
  }

  /** Os textos que o roteiro desenha, com o tamanho de cada um (cartão no meio = 64; título na faixa = 40): as camadas saem do cache uma por tick, no começo. */
  private textosDoRoteiro(): readonly { readonly texto: string; readonly tam: number }[] {
    const r: { texto: string; tam: number }[] = [];
    for (const p of ROTEIRO.planos) {
      for (const t of p.titulos ?? []) if (t.estilo === 'cartao') r.push({ texto: TEXTOS[t.chave], tam: p.tipo === 'cartao' ? TAMANHO_DO_CARTAO : TAMANHO_NA_FAIXA });
    }
    for (const q of ROTEIRO.estatica.quadros) if (q.titulo) r.push({ texto: TEXTOS[q.titulo], tam: TAMANHO_NA_FAIXA });
    return r;
  }

  /** Pré-renderiza um título por tick (não paga as ~3 ms de uma vez no 1º quadro nem no meio de um corte). */
  private aquecerTitulos(): void {
    const proximo = this.textosDoRoteiro().find((x) => !this.titulos.tem(x.texto, x.tam));
    if (proximo) this.titulos.camada(proximo.texto, proximo.tam);
  }

  private desenharCompleto(q: QuadroDoTrailer): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const plano = q.plano;
    const tau = q.tickNoPlano;
    let entradaPorCima = false;
    switch (plano.tipo) {
      case 'frio': {
        const h = m.elenco['hayato'];
        desenharFrio({ ctx, cenario: m.rec.cenarios.get(plano.stage) ?? m.rec.cenarioPadrao, ch: h.ch, arte: h.arte, camada: this.camada, tauNoPlano: tau, pose: q.frio?.pose ?? 'idle', raio: q.frio?.raio ?? 0, zoom: q.zoom });
        break;
      }
      case 'cartao':
        desenharFundoDoCartao(ctx, plano.fundo === 'preto' ? null : (m.rec.cenarios.get(plano.fundo) ?? m.rec.cenarioPadrao), tau, plano.id === 'C3');
        break;
      case 'retratos':
        desenharMontagem({ ctx, f, elenco: m.elenco, ordem: plano.ordem, tauNoPlano: tau, risco: q.retratos?.risco ?? 0 }, this.montagem);
        break;
      case 'logo': {
        const title = this.ui.cenas.title as CenaTitle;
        // §7: fundo -> letterbox -> flash -> logo (que bate nítida, por cima da faixa preta); nada mais a desenhar depois
        desenharRevelacao({
          ctx,
          f,
          tl: q.logo?.t ?? 0,
          prompt: q.logo?.prompt ?? false,
          logo: this.logo,
          fundo: (t) => title.drawScene(t, false),
          chamada: (t, aparece) => title.desenharChamada(t, aparece, this.rotuloDaChamada()),
          entreFundoELogo: () => {
            desenharLetterbox(ctx, q.letterbox);
            desenharFlash(ctx, q.flash);
          },
        });
        return;
      }
      case 'luta':
      case 'arconte':
        if (q.reserva || !q.luta) desenharReserva({ ctx, f, elenco: m.elenco, c1: plano.c1, c2: plano.c2, cenario: m.rec.cenarios.get(plano.stage), vinheta: m.rec.vinheta, tauNoPlano: tau });
        else this.desenharLuta(q, q.luta);
        gradeDeCor(ctx, plano.tipo === 'arconte' ? 'arconte' : 'luta');
        // smear de 2 quadros nos 3 cortes luta -> luta (§8): o quadro e 3 cópias dele deslocadas, antes das faixas e dos títulos
        {
          const dir = smearNoTick(plano.id, tau, plano.compassos * TICKS_POR_COMPASSO);
          if (dir !== 0) desenharSmear(ctx, dir);
        }
        entradaPorCima = plano.tipo === 'arconte' && this.entrada.ativa;
        break;
    }
    desenharLetterbox(ctx, q.letterbox);
    // a entrada curta do chefão desenha as próprias faixas, o cartão e a fala por cima das minhas (a fala mora na faixa de baixo)
    if (entradaPorCima) this.entrada.desenhar(ctx);
    for (const t of plano.titulos ?? []) {
      if (t.estilo === 'cartao') {
        const texto = TEXTOS[t.chave];
        if (plano.tipo === 'cartao') {
          desenharCartao({ ctx, cache: this.titulos, texto, tau, de: t.de, ate: t.ate, ...(plano.id === 'C3' ? { selos: FILA_DESBLOQUEIO.map((id) => this.corDe(id)) } : {}) });
        } else desenharTituloNaFaixa(ctx, this.titulos, texto, tau, t.de, t.ate);
      } else {
        const p = PLACAS[t.lutador];
        const oculta = t.lutador === 'zenon' && !this.zenonLiberado;
        desenharPlaca({ ctx, nome: oculta ? NOME_OCULTO : p.nome, pais: oculta ? '' : p.pais, epiteto: oculta ? undefined : p.epiteto, cor: this.corDe(t.lutador), tau, de: t.de, ate: t.ate });
      }
    }
    desenharFlash(ctx, q.flash);
  }

  private desenharLuta(q: QuadroDoTrailer, luta: LeituraLuta): void {
    const { ctx } = this.ui.c;
    const m = this.ui.m;
    const arc = q.arconte;
    const bloqueado = q.plano.tipo === 'arconte' && !this.zenonLiberado;
    // as poses impostas do P9 vêm do diretor (hoje nenhuma: o motor anda desde o tick 0). A entrada do chefão NÃO impõe pose (R-15): ela corre POR CIMA de uma luta em curso,
    // e a pose do ZENON é a do próprio golpe/defesa dele; as faixas e o cartão dela são só sobreposição
    const poses: Partial<Record<0 | 1, string>> = { ...(arc?.poses ?? {}) };
    // o tremor sai de uma semente por tick (constante do roteiro): o mesmo quadro em toda visita, qualquer que seja a taxa de quadros
    const rngDoTick = criarRng((ROTEIRO.sementeVisual + (q.tick + 1) * 2654435761) | 0);
    // FILME do especial: o mundo vem da leitura do roteiro (trajetória, poses e câmera do filme); o zoom de apresentação do trailer se aposenta enquanto ele toca
    const vistaDoFilme = this.filme.ativo ? this.filme.vista(luta, m.elenco) : null;
    desenharMundo(ctx, vistaDoFilme ?? luta, m.rec, this.efeitos, this.petalas, rngDoTick, {
      hud: false,
      overlay: false,
      tremor: bloqueado ? false : this.ui.c.persist.settings.shake,
      zoom: vistaDoFilme ? { fator: 1, x: LARGURA / 2 } : q.zoom,
      ...(arc ? { acesos: arc.acesos, poses } : {}),
    });
    if (bloqueado) this.desenharZenonEmContraluz(q, luta, poses[1]);
    // só o contador de acertos (sem DANGER, sem nota); fora do filme (o filme tem o próprio mundo) e abaixo da tarja do super
    if (!vistaDoFilme) this.hudRitmo.desenharCombos(ctx, luta, false);
    if (vistaDoFilme) this.filme.desenhar(ctx, vistaDoFilme, m.elenco);
    else if (this.tarjaDoSuper.ativa) this.tarjaDoSuper.desenhar(ctx, luta, m.elenco);
    else if (this.cine.ativa) {
      // a tarja por cima do mundo; o destaque do atacante usa a câmera da luta, então entra sob o MESMO zoom de apresentação
      ctx.save();
      if (q.zoom.fator !== 1) {
        ctx.translate(q.zoom.x, GROUND);
        ctx.scale(q.zoom.fator, q.zoom.fator);
        ctx.translate(-q.zoom.x, -GROUND);
      }
      this.cine.desenhar(ctx, luta, m.elenco);
      ctx.restore();
    }
  }

  /** D-T2: o ZENON ainda não foi liberado, então aparece em silhueta escura contra a arena (a técnica do P0: aro de luz e silhueta), com o anel do E12 no peito e os olhos acesos. */
  private desenharZenonEmContraluz(q: QuadroDoTrailer, luta: LeituraLuta, poseImposta: string | undefined): void {
    const { ctx } = this.ui.c;
    const m = this.ui.m;
    const f = luta.fighters[1];
    const r = m.elenco[f.id];
    const pose = poseImposta ?? leituraApresentada(luta, f).pose.name;
    const vista = comPose(f, pose);
    const z = q.zoom;
    const onde = paraATela(f.x, f.y, luta.cam, z);
    const area = { x: onde.x - 300, y: 40, w: 600, h: GROUND - 10 };
    const rng = criarRng(1);
    // o clarão do anel (o E12) ATRÁS dele: entra antes da silhueta, que o cobre por dentro e deixa só o contorno aceso (contraluz de verdade)
    const peito = paraATela(f.x, f.y - SH * 0.62, luta.cam, z);
    const raio = 190 * z.fator;
    const gl = ctx.createRadialGradient(peito.x, peito.y, 12, peito.x, peito.y, raio);
    gl.addColorStop(0, 'rgba(236,84,176,.5)');
    gl.addColorStop(0.55, 'rgba(190,50,140,.2)');
    gl.addColorStop(1, 'rgba(190,50,140,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gl;
    ctx.fillRect(peito.x - raio, peito.y - raio, raio * 2, raio * 2);
    ctx.restore();
    const desenhar = (g: Ctx): void => {
      g.save();
      if (z.fator !== 1) {
        g.translate(z.x, GROUND);
        g.scale(z.fator, z.fator);
        g.translate(-z.x, -GROUND);
      }
      aplicarCamera(g, luta.cam, 0, rng);
      desenharLutador(g, vista, r.ch, r.arte, 0);
      g.restore();
    };
    this.camada.compor(ctx, desenhar, { cor: '#e9a6e0', area, alfa: 0.5, dx: -2.5, dy: -1.5 });
    this.camada.compor(ctx, desenhar, { cor: '#0a0610', area });
    // os olhos: dois pontos acesos na altura do rosto, do lado para onde ele olha
    const c = cabecaNaTela(f, r.ch, pose, luta.cam, 0, z);
    const yOlho = c.topo + c.altura * 0.55;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const k of [0.22, 0.62]) {
      const xo = c.x + f.facing * c.meiaLargura * k;
      const go = ctx.createRadialGradient(xo, yOlho, 0, xo, yOlho, 7 * z.fator);
      go.addColorStop(0, 'rgba(255,170,230,.95)');
      go.addColorStop(1, 'rgba(255,90,200,0)');
      ctx.fillStyle = go;
      ctx.fillRect(xo - 8 * z.fator, yOlho - 8 * z.fator, 16 * z.fator, 16 * z.fator);
    }
    ctx.restore();
  }

  private desenharEstatico(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const qe = this.qe;
    if (!qe) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, LARGURA, ALTURA);
      return;
    }
    const ocultos = this.zenonLiberado ? new Set<IdLutador>() : new Set<IdLutador>(['zenon']);
    const title = this.ui.cenas.title as CenaTitle;
    const r = {
      ctx,
      f,
      elenco: m.elenco,
      cenarios: m.rec.cenarios,
      vinheta: m.rec.vinheta,
      ocultos,
      logo: this.logo,
      chamada: (t: number) => {
        if (qe.prompt) title.desenharChamada(t, 1, this.rotuloDaChamada());
      },
    };
    desenharQuadroEstatico(r, qe.quadro, 1);
    if (qe.proximo) desenharQuadroEstatico(r, qe.proximo, qe.dissolucao);
    desenharLetterbox(ctx, 1);
    for (const t of qe.titulos) desenharTitulo(ctx, this.titulos, t.texto, LARGURA / 2, Y_DA_FAIXA, TAMANHO_NA_FAIXA, { alfa: t.alfa });
  }

  // ------------------------------------------------------------------------------------------------------------------------------------ diagnóstico

  /** Para os e2e e a ferramenta de medição (só leitura). */
  diagnostico(): unknown {
    const arte = this.ui.m.arte as unknown as {
      atlas: Map<string, { pronta: boolean; paginas: Array<{ width: number; height: number }> | null }>;
      cenarios: Map<string, { width: number; height: number }>;
      lutadoresResidentes(): string[];
    };
    let bytes = 0;
    const residentes: string[] = [];
    for (const id of arte.lutadoresResidentes()) {
      const a = arte.atlas.get(id);
      for (const p of a?.paginas ?? []) bytes += p.width * p.height * 4;
      residentes.push(id);
    }
    // o próximo plano: quantos ticks faltam e se a arte dele (a que o diretor vai exigir) já chegou: os testes avançam em manual e esperam a rede neste ponto
    const d = this.d;
    let proximoPlano: { id: IdPlano; emTicks: number; artePronta: boolean } | null = null;
    if (d && !this.estatico && d.tickAtual < d.duracao) {
      const k = indiceDoPlano(d.tickAtual);
      const seguinte = INICIOS[k + 1];
      if (seguinte !== undefined) {
        const agora = pedidosNoPlano(ROTEIRO, planoDeCarga(ROTEIRO), k + 1).agora;
        proximoPlano = { id: (ROTEIRO.planos[k + 1] as Plano).id, emTicks: seguinte - d.tickAtual, artePronta: this.carga?.pronto(agora) ?? true };
      }
    }
    // a arte do plano EM CURSO (a que ele exige no começo e a que chega com ele na tela, como a vitrine da logo) já está na memória? Os testes de pixel esperam por isto antes de capturar
    let artePronta = true;
    if (d && this.carga && !this.estatico) {
      const a = d.pedidosDeArte();
      artePronta = this.carga.pronto({ lutadores: [...(a.agora.lutadores ?? []), ...(a.tarde.lutadores ?? [])], cenarios: [...(a.agora.cenarios ?? []), ...(a.tarde.cenarios ?? [])] });
    }
    for (const c of arte.cenarios.values()) bytes += c.width * c.height * 4;
    return {
      ativo: this.ativo,
      origem: this.args.origem,
      estatico: this.estatico,
      /** Por que é estático ('movimento', 'economia', 'vazao') ou null; `degradou`: o completo desistiu no meio e seguiu pelo estático. */
      motivoEstatico: this.motivoEstatico,
      degradou: this.degradou,
      musica: this.musica,
      tCena: this.tCena,
      tick: this.estatico ? this.tickEstatico : (this.d?.tickAtual ?? 0),
      plano: this.q?.plano.id ?? null,
      reserva: this.q?.reserva ?? false,
      /** O filme do especial está tocando agora (D-V6)? */
      filmeAtivo: this.filme.ativo,
      /** A tarja do SUPER (a única do trailer) está na tela agora (R-15)? `t` = ticks dela (0..29) ou -1. */
      tarjaDoSuper: this.tarjaDoSuper.ativa,
      tarjaDoSuperT: this.tarjaDoSuper.estado?.t ?? -1,
      /** O estado do motor no quadro (tick do jogo e, por lutador, x/y/estado/golpe/tick do golpe): os testes medem "parado" com isto. Null fora dos planos com luta. */
      luta: this.q?.luta ? { tick: this.q.luta.tick, f: this.q.luta.fighters.map((f) => [Math.round(f.x), Math.round(f.y), f.state, f.move, f.mt]) } : null,
      /** A entrada curta do chefão (P9) está na tela por cima da luta? */
      entradaAtiva: this.entrada.ativa,
      /** Acertos que o contador mostra agora, por lutador (R-15: só o contador, sem DANGER/nota). */
      acertos: this.q?.luta ? [this.q.luta.fighters[0].combo.t > 0 ? this.q.luta.fighters[0].combo.hits : 0, this.q.luta.fighters[1].combo.t > 0 ? this.q.luta.fighters[1].combo.hits : 0] : [0, 0],
      planosEmReserva: this.d?.planosEmReserva() ?? [],
      jogosVivos: this.d?.jogosVivos ?? 0,
      /** Os atlas na memória agora (o trailer não tem arte fixa: a vitrine também vai e vem por plano). */
      residentes,
      artePronta,
      proximoPlano,
      cenarios: [...arte.cenarios.keys()],
      memoriaDecodificadaMB: bytes / 1048576,
      impressoes: this.d ? Object.fromEntries(this.d.impressoes()) : {},
    };
  }
}

