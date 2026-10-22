import { LARGURA } from '../core/constantes';
import type { EventoLuta, IdLutador, LeituraLuta } from '../core/contratos';
import type { Rng } from '../core/rng';
import type { LutadorMontado } from '../data/montar';
import { alfaDoTitulo, arconteNoTick, cameraNoTick, flashNoTick, frioNoTick, letterboxNoTick, retratosNoTick, TICK_DA_LOGO, TICK_DO_MOTOR_NO_ARCONTE, TICK_DO_PROMPT } from '../data/trailer/curvas';
import { PLACAS, TEXTOS } from '../data/trailer/textos';
import {
  DURACAO_TOTAL,
  temMotor,
  TICKS_POR_COMPASSO,
  TICKS_POR_TEMPO,
  type IdPlano,
  type PedidoDeArte,
  type Plano,
  type PlanoComMotor,
  type RoteiroDoTrailer,
  type Titulo,
  type Tomada,
  type TomadasDoTrailer,
} from '../data/trailer/tipos';
import type { Game } from '../fight/game';
import { pedidosNoPlano, planoDeCarga, type PedidoDeCarga } from './carga';
import { impressaoDoEstado } from './impressao';
import { criarPartida, FONTE_VAZIA } from './partida';
import { passoDoPlano, RitmoDoPlano, type EsperadaDoRitmo } from './ritmo';

/*
 * DiretorDoTrailer (docs/spec-trailer-abertura.md §2, §4.3, §4.4 e §7.3). PURO: sem DOM, sem canvas, sem áudio, sem relógio de parede.
 *
 * É um "projetor", não uma luta: cria e descarta os PRÓPRIOS `Game` (no máximo 2 vivos: o do plano atual e o do próximo, em pré-rolagem), com sementes que são
 * constantes das tomadas, e nunca toca no `mundo.game`, no `rngLogica`, no `rngVisual`, no `rngUI` nem nas sementes +4/+5/+6 da sessão: ele nem recebe esses
 * objetos. O ESTADO é função do tick: `avancar()` produz o tick seguinte; câmera, títulos, letterbox e flash saem de funções puras de (roteiro, tick) e o motor só
 * anda por `Game.update` com CPU x CPU. Nada de `Math.random`, `Date.now` ou `performance.now`: a fatia da pré-rolagem é o chamador quem mede (`prerolar(maxTicks)`).
 * O motor roda sempre com `shake: true` (AJUSTES_DO_TRAILER), para a impressão não depender da preferência de tremor do jogador.
 */

export interface TituloVisivel {
  readonly estilo: 'cartao' | 'placa';
  /** O texto do cartão, ou "NOME · PAÍS" da placa. */
  readonly texto: string;
  /** O epíteto da placa, se houver. */
  readonly subtexto?: string;
  /** Só na placa: de quem é (a cena pode trocar o nome por "???" enquanto o ZENON não foi liberado). */
  readonly lutador?: IdLutador;
  readonly alfa: number;
}

export interface QuadroDoTrailer {
  /** 0..2399. */
  readonly tick: number;
  readonly plano: Plano;
  readonly tickNoPlano: number;
  /** 1..25 e 1..4. */
  readonly compasso: number;
  readonly tempo: number;
  /** O `Game` do plano (null em frio, cartão, retratos, logo e no cartão de reserva). É o objeto VIVO: leia-o, não o guarde. */
  readonly luta: LeituraLuta | null;
  /** Só os eventos do update em que o motor andou NESTE tick (efeitos, sons). Em `irPara`, os de todos os ticks percorridos. */
  readonly eventos: readonly EventoLuta[];
  /** O motor andou neste tick? (falso na câmera lenta intermediária, no congelamento da tarja e no P9 antes da hora). */
  readonly motorAndou: boolean;
  /** Fator da câmera lenta agora (1 = normal). */
  readonly lenta: number;
  /** Zoom de apresentação (`OpcoesMundo.zoom`): fator entre 1 e 1,35 e o x da TELA onde ancora (chão). */
  readonly zoom: { readonly fator: number; readonly x: number };
  /** 0 = sem faixas, 1 = faixas de 69 px. */
  readonly letterbox: number;
  /** Flash de tela cheia, 0..1. Só o c24.1 tem. */
  readonly flash: number;
  readonly titulos: readonly TituloVisivel[];
  /** A tarja da cinemática COMEÇA neste tick (o evento `special`). O motor fica congelado pelos ticks seguintes. */
  readonly cine: { readonly ev: EventoLuta; readonly modo: 'curta' | 'completa' } | null;
  /** P9: braseiros acesos (0 a 6), poses impostas e a entrada curta do chefão (`tickDaEntrada` 0..59). */
  readonly arconte?: { readonly acesos: number; readonly poses: Readonly<Partial<Record<0 | 1, string>>>; readonly entrada: boolean; readonly tickDaEntrada: number };
  /** P0: pose do HAYATO e intensidade do raio (0..1). */
  readonly frio?: { readonly pose: 'idle' | 'win'; readonly raio: number };
  /** P8: quantos retratos já entraram na grade (0 a 9) e o risco de luz (0..1). */
  readonly retratos?: { readonly entraram: number; readonly risco: number };
  /** P10: a logo (`t` = ticks desde o impacto), o letterbox já abrindo e o prompt "PRESSIONE ENTER / TOQUE PARA JOGAR" (a tecla age como no título). */
  readonly logo?: { readonly t: number; readonly prompt: boolean };
  /** O plano foi trocado pelo cartão de reserva (a pré-rolagem não ficou pronta, ou a arte não chegou). */
  readonly reserva: boolean;
}

export interface DependenciasDoDiretor {
  readonly lutadores: Readonly<Record<IdLutador, LutadorMontado>>;
  /** Cria o RNG da lógica de um plano a partir da semente CONSTANTE da tomada. Injetado: o diretor não importa o gerador. */
  readonly criarRng: (semente: number) => Rng;
}

interface Vivo {
  readonly plano: PlanoComMotor;
  readonly tomada: Tomada;
  readonly game: Game;
  /** Chamadas a `update` até agora. */
  u: number;
}

const prontoPara = (v: Vivo): boolean => v.u >= v.tomada.inicio;

export class DiretorDoTrailer {
  readonly duracao = DURACAO_TOTAL;
  private tick = 0;
  private ultimo: QuadroDoTrailer | null = null;
  private readonly inicios: readonly number[];
  private readonly pedidos: readonly PedidoDeCarga[];
  private readonly vivos = new Map<IdPlano, Vivo>();
  private readonly _impressoes = new Map<IdPlano, string>();
  private readonly reservas = new Set<IdPlano>();
  private readonly forcadas = new Set<IdPlano>();
  private ritmo: RitmoDoPlano | null = null;

  constructor(
    private readonly roteiro: RoteiroDoTrailer,
    private readonly tomadas: TomadasDoTrailer,
    private readonly dep: DependenciasDoDiretor,
  ) {
    let t = 0;
    this.inicios = roteiro.planos.map((p) => {
      const i = t;
      t += p.compassos * TICKS_POR_COMPASSO;
      return i;
    });
    this.pedidos = planoDeCarga(roteiro);
  }

  /** O trailer acabou? (o último quadro, o 2399, já foi produzido) */
  get fim(): boolean {
    return this.tick >= this.duracao;
  }
  /** O próximo tick a produzir (0..2400). */
  get tickAtual(): number {
    return this.tick;
  }
  /** Quantos `Game` existem agora (no máximo 2). */
  get jogosVivos(): number {
    return this.vivos.size;
  }

  // ---------------------------------------------------------------------------------------------------------------- planos

  private indiceDoPlano(tick: number): number {
    let i = 0;
    while (i + 1 < this.inicios.length && (this.inicios[i + 1] as number) <= tick) i++;
    return i;
  }
  private fimDoPlano(i: number): number {
    return (this.inicios[i] as number) + (this.roteiro.planos[i] as Plano).compassos * TICKS_POR_COMPASSO;
  }

  /**
   * Os planos de luta cujo `Game` deve existir no tick `tick`: o do plano em curso e o do próximo plano de luta (que começa a pré-rolar no INÍCIO do
   * plano de luta anterior, ou no tick 0 se não há nenhum antes). Nunca mais de 2.
   */
  private devemExistir(tick: number): readonly PlanoComMotor[] {
    const planos = this.roteiro.planos;
    const r: PlanoComMotor[] = [];
    let anteriorComMotor = -1;
    for (let i = 0; i < planos.length; i++) {
      const p = planos[i] as Plano;
      if (!temMotor(p)) continue;
      const comecaA = anteriorComMotor < 0 ? 0 : (this.inicios[anteriorComMotor] as number);
      if (comecaA <= tick && tick < this.fimDoPlano(i)) r.push(p);
      anteriorComMotor = i;
    }
    return r;
  }

  private garantirVivos(tick: number): void {
    const devem = this.devemExistir(tick);
    for (const id of [...this.vivos.keys()]) if (!devem.some((p) => p.id === id)) this.vivos.delete(id);
    for (const p of devem) {
      if (this.vivos.has(p.id)) continue;
      const tomada = this.tomadas[p.id];
      if (!tomada) continue; // sem tomada: o plano vira cartão de reserva
      this.vivos.set(p.id, this.criarVivo(p, tomada));
    }
  }

  private criarVivo(plano: PlanoComMotor, tomada: Tomada): Vivo {
    return { plano, tomada, game: criarPartida(plano, tomada, this.dep.lutadores, this.dep.criarRng), u: 0 };
  }

  /**
   * Pré-rola o motor do plano que precisa primeiro (no máximo `maxTicks` updates). Devolve quantos andou. Chamar a cada quadro com a fatia que o orçamento
   * de tempo permitir (a cena mede com `performance.now`); o RESULTADO não depende da fatia: é o mesmo `Game` andando os mesmos updates.
   */
  prerolar(maxTicks: number): number {
    this.garantirVivos(this.tick);
    let feitos = 0;
    for (const v of this.vivos.values()) {
      while (!prontoPara(v) && feitos < maxTicks) {
        v.game.update(FONTE_VAZIA);
        v.u++;
        feitos++;
      }
      if (feitos >= maxTicks) break;
    }
    return feitos;
  }

  /** Quantos updates de pré-rolagem faltam, somando os planos que já devem existir neste tick (0 = tudo pronto). */
  preRolagemPendente(): number {
    this.garantirVivos(this.tick);
    let n = 0;
    for (const v of this.vivos.values()) n += Math.max(0, v.tomada.inicio - v.u);
    return n;
  }

  /** A arte de um plano não chegou a tempo: ele vira cartão de reserva (a duração não muda). Chamar ANTES do plano começar. */
  reservaForcada(id: IdPlano): void {
    this.forcadas.add(id);
  }

  /** Os pedidos de arte do plano em curso. */
  pedidosDeArte(): { readonly agora: PedidoDeArte; readonly proximo: PedidoDeArte; readonly soltar: readonly string[] } {
    return pedidosNoPlano(this.roteiro, this.pedidos, this.indiceDoPlano(Math.min(this.tick, this.duracao - 1)));
  }

  /** O hash do estado do `Game` ao fim do plano `id` (null se o plano ainda não terminou, não tem motor ou foi reserva). */
  impressaoDoPlano(id: IdPlano): string | null {
    return this._impressoes.get(id) ?? null;
  }
  impressoes(): ReadonlyMap<IdPlano, string> {
    return this._impressoes;
  }
  /** Quais planos viraram reserva (pré-rolagem atrasada, arte ausente ou sem tomada). */
  planosEmReserva(): readonly IdPlano[] {
    return [...this.reservas];
  }

  // ---------------------------------------------------------------------------------------------------------------- avanço

  /** Produz o quadro do tick seguinte. Depois do fim devolve o último quadro de novo. */
  avancar(): QuadroDoTrailer {
    if (this.tick >= this.duracao) return this.ultimo as QuadroDoTrailer;
    const quadro = this.produzir(this.tick);
    this.tick++;
    this.ultimo = quadro;
    return quadro;
  }

  /**
   * Avança até o quadro `tick` (só para frente) e o devolve; `eventos` reúne os de todos os ticks percorridos, para a cena não perder som nem efeito. Se
   * `tick` já passou, devolve o último quadro sem nada novo.
   */
  irPara(tick: number): QuadroDoTrailer {
    const alvo = Math.min(Math.floor(tick), this.duracao - 1);
    if (this.ultimo !== null && alvo < this.tick) return this.ultimo;
    const eventos: EventoLuta[] = [];
    let q = this.ultimo as QuadroDoTrailer;
    let cine: QuadroDoTrailer['cine'] = null;
    while (this.tick <= alvo) {
      q = this.avancar();
      eventos.push(...q.eventos);
      if (q.cine) cine = q.cine;
    }
    return { ...q, eventos, cine: q.cine ?? cine };
  }

  private produzir(tick: number): QuadroDoTrailer {
    this.garantirVivos(tick);
    const i = this.indiceDoPlano(tick);
    const plano = this.roteiro.planos[i] as Plano;
    const tau = tick - (this.inicios[i] as number);
    const ultimoDoPlano = tau === plano.compassos * TICKS_POR_COMPASSO - 1;
    const base = {
      tick,
      plano,
      tickNoPlano: tau,
      compasso: Math.floor(tick / TICKS_POR_COMPASSO) + 1,
      tempo: Math.floor((tick % TICKS_POR_COMPASSO) / TICKS_POR_TEMPO) + 1,
      letterbox: letterboxNoTick(tick),
      flash: flashNoTick(tick),
      titulos: this.titulosDe(plano, tau),
    };
    const camera = 'camera' in plano ? cameraNoTick(plano.camera, tau) : { zoom: 1, foco: 'meio' as const };

    if (!temMotor(plano)) return { ...base, ...this.quadroSemMotor(plano, tau, tick), luta: null, eventos: [], motorAndou: false, lenta: 1, zoom: { fator: camera.zoom, x: LARGURA / 2 }, cine: null, reserva: false };

    // --- plano com motor ---
    if (tau === 0) this.entrarNoPlano(plano);
    const reserva = this.reservas.has(plano.id);
    const vivo = reserva ? undefined : this.vivos.get(plano.id);
    if (reserva || !vivo) {
      return { ...base, luta: null, eventos: [], motorAndou: false, lenta: 1, zoom: { fator: camera.zoom, x: LARGURA / 2 }, cine: null, reserva: true, ...(plano.tipo === 'arconte' ? { arconte: this.arconteDe(tau) } : {}) };
    }
    const ritmo = this.ritmo as RitmoDoPlano;
    const passo = passoDoPlano(ritmo, tau, vivo.u, () => {
      vivo.game.update(FONTE_VAZIA);
      return vivo.game.events.slice();
    });
    vivo.u = passo.u;
    const luta: LeituraLuta = vivo.game;
    const q: QuadroDoTrailer = {
      ...base,
      luta,
      eventos: passo.eventos,
      motorAndou: passo.andou,
      lenta: ritmo.fatorDaLenta,
      zoom: { fator: camera.zoom, x: this.ancoraDoZoom(luta, camera.foco) },
      cine: passo.disparo.cine,
      reserva: false,
      ...(plano.tipo === 'arconte' ? { arconte: this.arconteDe(tau) } : {}),
    };
    if (ultimoDoPlano) {
      this._impressoes.set(plano.id, impressaoDoEstado(luta));
      this.vivos.delete(plano.id);
    }
    return q;
  }

  /** No 1º tick de um plano com motor: decide a reserva e monta o ritmo dele. */
  private entrarNoPlano(plano: PlanoComMotor): void {
    const vivo = this.vivos.get(plano.id);
    if (this.forcadas.has(plano.id) || !vivo || !prontoPara(vivo)) {
      this.reservas.add(plano.id);
      this.vivos.delete(plano.id);
      this.ritmo = null;
      return;
    }
    const esperadas: EsperadaDoRitmo[] = [];
    for (const g of vivo.tomada.batidas) {
      const pedida = plano.pede[g.pedida];
      if (pedida) esperadas.push({ pedida, gravada: g });
    }
    this.ritmo = new RitmoDoPlano(esperadas, plano.tipo === 'arconte' ? TICK_DO_MOTOR_NO_ARCONTE : 0);
  }

  private quadroSemMotor(plano: Exclude<Plano, { tipo: 'luta' | 'arconte' }>, tau: number, tick: number): Pick<QuadroDoTrailer, 'frio' | 'retratos' | 'logo'> {
    switch (plano.tipo) {
      case 'frio':
        return { frio: frioNoTick(tau) };
      case 'retratos':
        return { retratos: retratosNoTick(tau, plano.ordem.length) };
      case 'logo':
        return { logo: { t: tick - TICK_DA_LOGO, prompt: tick >= TICK_DO_PROMPT } };
      case 'cartao':
        return {};
    }
  }

  private arconteDe(tau: number): NonNullable<QuadroDoTrailer['arconte']> {
    const a = arconteNoTick(tau);
    // com o motor congelado (antes do tick 156) os dois ficam na pose de espera; a pose do chefão na entrada é da própria entrada
    const poses: Partial<Record<0 | 1, string>> = tau < TICK_DO_MOTOR_NO_ARCONTE ? (a.entrada ? { 0: 'idle0' } : { 0: 'idle0', 1: 'idle0' }) : {};
    return { acesos: a.acesos, poses, entrada: a.entrada, tickDaEntrada: a.tickDaEntrada };
  }

  /** O x da TELA (depois da câmera da luta) onde o zoom ancora: o meio dos dois, ou um deles. Sempre dentro da tela. */
  private ancoraDoZoom(luta: LeituraLuta, foco: 'meio' | 'p1' | 'p2'): number {
    const { x: cx, z } = luta.cam;
    const naTela = (wx: number): number => cx + (wx - cx) * z;
    const [a, b] = luta.fighters;
    const x = foco === 'p1' ? naTela(a.x) : foco === 'p2' ? naTela(b.x) : (naTela(a.x) + naTela(b.x)) / 2;
    return Math.min(LARGURA, Math.max(0, x));
  }

  private titulosDe(plano: Plano, tau: number): readonly TituloVisivel[] {
    const r: TituloVisivel[] = [];
    for (const t of plano.titulos ?? []) {
      const alfa = alfaDoTitulo(tau, t.de, t.ate);
      if (alfa <= 0) continue;
      r.push(tituloVisivel(t, alfa));
    }
    return r;
  }
}

function tituloVisivel(t: Titulo, alfa: number): TituloVisivel {
  if (t.estilo === 'cartao') return { estilo: 'cartao', texto: TEXTOS[t.chave], alfa };
  const p = PLACAS[t.lutador];
  return { estilo: 'placa', texto: `${p.nome} · ${p.pais}`, ...(p.epiteto === undefined ? {} : { subtexto: p.epiteto }), lutador: t.lutador, alfa };
}
