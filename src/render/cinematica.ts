import type { Elenco } from '../assets/elenco';
import { ALTURA, LARGURA, SH } from '../core/constantes';
import { CINEMATICA_PADRAO, type EntradaTarja, type IndiceLutador, type LeituraLuta, type PreferenciaCinematica } from '../core/contratos';
import { criarRng, type Rng } from '../core/rng';
import { apresentacaoDoEspecial } from '../data/apresentacao-especiais';
import { getPD } from '../data/poses';
import { aplicarCamera } from './camera';
import { silhuetaTingidaDe } from './esquiva';
import { desenharEstilo, estampaDaTarja, mistura, type EstiloId, type Paleta } from './estilos-especiais';
import { identidadeDe, identidadePadrao, type Identidade, type Ritmo } from './identidade-especiais';
import { chDaFicha, desenharLutador } from './lutador';
import type { Ctx } from './tela';
import { FONTE_DO_ESPECIAL, textoArcade } from './texto';

/*
 * Cinemática do especial (docs/spec-esquiva-e-cinematica-especial.md 3, docs/identidade-visual-especiais.md). É APRESENTAÇÃO: a cena da luta
 * deixa de chamar `game.update` enquanto ela roda (como a pausa), então o motor não congela e o resultado da luta não depende dela.
 *
 * COMPLETA = 48 ticks: o fundo escurece, uma tarja central inclinada com o lutador em destaque entra deslizando, o nome do golpe dá um "pop",
 * os brilhos do estilo do lutador correm pela tarja e ela sai pelo lado oposto; o escurecimento cai para a vinheta da sessão (20%).
 * CURTA = 20 ticks: sem tarja; o atacante em destaque, o nome pequeno sobre ele e uma rajada do estilo.
 * Limites: um flash de tela cheia por especial (alfa ≤ 0,35, nunca branco), sem tremor, sem shadowBlur/filter/getImageData.
 */

export type ModoCine = 'completa' | 'curta';

export const DURACAO_COMPLETA = 48;
export const DURACAO_CURTA = 20;
/** Ao pular, a saída leva no máximo isto. */
export const TICKS_DA_SAIDA_AO_PULAR = 6;
export const VEU_CHEIO = 0.72;
export const VEU_CURTA = 0.5;
/** A vinheta que fica durante a sessão do especial (e para onde cai o escurecimento). */
export const VEU_DA_SESSAO = 0.2;
export const ALFA_MAX_DO_FLASH = 0.35;
/** Tarjas pré-desenhadas guardadas por luta. */
export const MAX_TARJAS_NO_CACHE = 6;
/** Tela lógica: largura da tarja (1000: sobra 40 px para inclinar até ±10° sem mostrar as pontas) e a altura-padrão (132). */
export const LARGURA_DA_TARJA = 1000;
export const ALTURA_DA_TARJA = 132;
const COR_DO_VEU = '6,3,16';
/** Sobre o centro da faixa: a altura (y) de cada posição. */
export const Y_DA_FAIXA = { alta: 214, media: 250, baixa: 330 } as const;

/**
 * Que modo vale agora? Regras sem cinemática (`?expansao=4`) ou a opção DESLIGADA = nenhum. Ausente a preferência salva, o padrão é
 * COMPLETA (a decisão do dono), ou CURTA se o aparelho pede menos movimento (`prefers-reduced-motion`, B15).
 */
export function modoDaCinematica(preferencia: PreferenciaCinematica | undefined, regras: { readonly cinematica: boolean }, reduzMovimento: boolean): ModoCine | null {
  if (!regras.cinematica) return null;
  const p = preferencia ?? (reduzMovimento ? 'curta' : CINEMATICA_PADRAO);
  return p === 'desligada' ? null : p;
}

export interface EventoCine {
  readonly lutador: IndiceLutador;
  /** Chave de `ch.moves` do golpe (`sFire`...). */
  readonly golpe: string;
  /** Ficha de quem atacou (NILA em SARPA, BAATAR na fase 2). Ausente = a que `luta.fighters[lutador]` tiver na hora de desenhar. */
  readonly ficha?: string | null;
  readonly quadro?: string;
  readonly entrada?: EntradaTarja;
}

// ------------------------------------------------------------------------------------------------------- linha do tempo (pura)
const ease = {
  cubica: (k: number): number => 1 - (1 - k) ** 3,
  quartica: (k: number): number => 1 - (1 - k) ** 4,
  entra: (k: number): number => k * k * k,
};
const trava = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export interface Tempos {
  readonly entradaIni: number;
  readonly entradaFim: number;
  readonly popIni: number;
  readonly popFim: number;
  readonly popDe: number;
  readonly saidaIni: number;
}
const TEMPOS: Readonly<Record<Ritmo, Tempos>> = {
  RAPIDO: { entradaIni: 4, entradaFim: 9, popIni: 8, popFim: 11, popDe: 1.4, saidaIni: 38 },
  MEDIO: { entradaIni: 4, entradaFim: 13, popIni: 8, popFim: 14, popDe: 1.3, saidaIni: 36 },
  PESADO: { entradaIni: 4, entradaFim: 13, popIni: 10, popFim: 16, popDe: 1.5, saidaIni: 36 },
};
export const temposDoRitmo = (r: Ritmo): Tempos => TEMPOS[r];

/** O que a cinemática mostra no tick `t`. */
export interface Quadro {
  /** Escurecimento da tela (0..1). */
  readonly veu: number;
  /** Alfa do flash de tela cheia (0 a ALFA_MAX_DO_FLASH). */
  readonly flash: number;
  /** 0..1: quanto a tarja já entrou (a posição vem de `entrada` e `saida`). */
  readonly entrada: number;
  /** 0..1: quanto a tarja já saiu. */
  readonly saida: number;
  /** Escala do nome (o "pop"); 0 antes de aparecer. */
  readonly pop: number;
  /** Envelope dos brilhos (0..1). */
  readonly vivo: number;
  /** Tick equivalente da COMPLETA para a animação do estilo (a CURTA usa uma janela deslocada). */
  readonly tEstilo: number;
}

/**
 * Linha do tempo de uma cinemática no tick `t` (COMPLETA: B3 + ritmos do Apolo; CURTA: 20 ticks). `pulouEm`: tick em que alguém pulou; a
 * saída passa a andar sozinha, em `TICKS_DA_SAIDA_AO_PULAR` ticks, e leva o escurecimento junto até a vinheta da sessão.
 */
export function linhaDoTempo(modo: ModoCine, ritmo: Ritmo, t: number, pulouEm: number | null = null): Quadro {
  const T = TEMPOS[ritmo];
  const completa = modo === 'completa';
  const duracao = completa ? DURACAO_COMPLETA : DURACAO_CURTA;
  const saidaIni = completa ? T.saidaIni : 12;
  let saida = trava((t - saidaIni) / (duracao - saidaIni));
  if (pulouEm !== null) saida = Math.max(saida, trava((t - pulouEm) / TICKS_DA_SAIDA_AO_PULAR));
  const veuAlvo = completa ? VEU_CHEIO : VEU_CURTA;
  const subida = trava(t / (completa ? 5 : 3));
  const veu = lerp(lerp(0, veuAlvo, subida), VEU_DA_SESSAO, ease.entra(saida));
  const flash = t < 3 ? ALFA_MAX_DO_FLASH * (1 - t / 3) : 0;
  const entrada = completa ? trava((t - T.entradaIni) / (T.entradaFim - T.entradaIni)) : 0;
  // pop: do `popDe` a 1 no intervalo; antes dele o nome ainda não apareceu
  const popIni = completa ? T.popIni : 2;
  const popFim = completa ? T.popFim : 6;
  const pop = t < popIni ? 0 : lerp(T.popDe, 1, ease.cubica(trava((t - popIni) / (popFim - popIni))));
  // brilhos: sobem a partir do tick 8 e descem a partir do 34 (COMPLETA); a rajada da CURTA usa uma janela deslocada (rápido 2, pesado 6)
  const inicio = completa ? 8 : ritmo === 'PESADO' ? 6 : 2;
  const tEstilo = completa ? t : 8 + (t - inicio);
  const sobe = trava((tEstilo - 8) / 4);
  const desce = completa ? trava((40 - t) / 6) : trava((duracao - t) / 6);
  const vivo = sobe * desce * (1 - saida);
  return { veu, flash, entrada: completa ? entrada : 0, saida, pop: pop * (1 - ease.entra(saida) * 0), vivo, tEstilo };
}

/** Onde a tarja está (deslocamento em relação ao centro da tela), dado o tipo de entrada, o lado do atacante e o progresso. */
export function deslocamentoDaTarja(entrada: EntradaTarja, lado: 1 | -1, yCentro: number, altura: number, q: Pick<Quadro, 'entrada' | 'saida'>, ritmo: Ritmo, t: number): { x: number; y: number } {
  const e = ritmo === 'RAPIDO' ? ease.quartica(q.entrada) : ease.cubica(q.entrada);
  // PESADO: passa 6% do ponto e volta (a tarja "assenta"), e nos ticks 13–15 só ela desce 3 px; MEDIO assenta suave com micro-snap
  const e2 = ritmo === 'PESADO' ? e + 0.06 * Math.sin(Math.PI * q.entrada) : ritmo === 'MEDIO' ? e + 0.015 * Math.sin(Math.PI * q.entrada) : e;
  // Saída suave e mais longa no centro: curva quártica com permanência prolongada antes do escape veloz
  const s = q.saida * q.saida * q.saida * q.saida;
  const assenta = ritmo === 'PESADO' && t >= 13 && t <= 16 ? 3 * Math.sin((Math.PI * (t - 13)) / 3) : 0;
  const L = LARGURA + LARGURA_DA_TARJA / 2;
  switch (entrada) {
    case 'cima':
      return { x: s * lado * L, y: (1 - e2) * -(yCentro + altura) + assenta };
    case 'baixo':
      return { x: s * lado * L, y: (1 - e2) * (ALTURA + altura - yCentro) + assenta };
    case 'rival':
      return { x: (1 - e2) * lado * L - s * lado * L, y: assenta };
    default:
      return { x: -(1 - e2) * lado * L + s * lado * L, y: assenta };
  }
}

// ------------------------------------------------------------------------------------------------------- tarja pré-desenhada
/** O mínimo de um canvas de fora da tela que o cache usa. */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(tipo: '2d'): Ctx | null;
}
export type FabricaDeCanvas = (largura: number, altura: number) => CanvasLike | null;

const fabricaDoDocumento: FabricaDeCanvas = (w, h) => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c as unknown as CanvasLike;
};

/** Pinta o fundo da tarja (degradê vertical, borda, fio e a estampa do estilo a 10%) em coordenadas lógicas (0..W, 0..H). Estático: vai para o cache. */
export function pintarTarja(g: Ctx, id: Identidade, W = LARGURA_DA_TARJA, H = id.faixa.h): void {
  const { sombra, brilho, nucleo } = id.paleta;

  // 1. Degradê vertical de fundo com alto contraste
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, sombra);
  gr.addColorStop(0.5, mistura(sombra, brilho, 0.35));
  gr.addColorStop(1, sombra);
  g.globalAlpha = 0.95;
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;

  // 2. Placa de contraste escuro na área de letreiro para máxima legibilidade
  const grTexto = g.createLinearGradient(W * 0.25, 0, W, 0);
  grTexto.addColorStop(0, 'rgba(0,0,0,0)');
  grTexto.addColorStop(0.2, 'rgba(0,0,0,0.25)');
  grTexto.addColorStop(0.65, 'rgba(0,0,0,0.45)');
  grTexto.addColorStop(1, 'rgba(0,0,0,0.2)');
  g.fillStyle = grTexto;
  g.fillRect(W * 0.25, 0, W * 0.75, H);

  // 3. Estampa textural do estilo do lutador
  estampaDaTarja(g, id.estilo, brilho, W, H);

  // 4. Barras de destaque luminosas horizontais (topo e base) na cor do lutador
  const altBarra = Math.max(4, Math.round(H * 0.04));
  const grBarra = g.createLinearGradient(0, 0, W, 0);
  grBarra.addColorStop(0, sombra);
  grBarra.addColorStop(0.25, brilho);
  grBarra.addColorStop(0.5, nucleo);
  grBarra.addColorStop(0.75, brilho);
  grBarra.addColorStop(1, sombra);
  g.fillStyle = grBarra;
  g.fillRect(0, 0, W, altBarra);
  g.fillRect(0, H - altBarra, W, altBarra);

  // 5. Linha divisória vertical de destaque entre pose e letreiro
  const xDiv = W * 0.31;
  const grDiv = g.createLinearGradient(0, altBarra, 0, H - altBarra);
  grDiv.addColorStop(0, 'rgba(0,0,0,0)');
  grDiv.addColorStop(0.3, brilho);
  grDiv.addColorStop(0.5, nucleo);
  grDiv.addColorStop(0.7, brilho);
  grDiv.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grDiv;
  g.fillRect(xDiv - 1, altBarra, 2, H - altBarra * 2);

  // 6. Moldura chanfrada de contorno e fio interno de energia
  g.lineWidth = 3;
  g.strokeStyle = brilho;
  g.strokeRect(1.5, 1.5, W - 3, H - 3);
  g.lineWidth = 1;
  g.strokeStyle = nucleo;
  g.strokeRect(5.5, 5.5, W - 11, H - 11);
}

// ------------------------------------------------------------------------------------------------------- a cinemática
interface Ativa {
  readonly ev: EventoCine;
  readonly modo: ModoCine;
  readonly sem: number;
  t: number;
  pulouEm: number | null;
  somAbertura: boolean;
  somBatida: boolean;
}

export interface OpcoesCinematica {
  /** Sorteio só dos efeitos (a semente do estilo de cada cinemática). */
  readonly rng?: Rng;
  /** Fábrica de canvas fora da tela (padrão: `document.createElement`). Sem ela e sem DOM, a tarja é pintada direto, quadro a quadro. */
  readonly criarCanvas?: FabricaDeCanvas;
  /** Os sons são da cena (o áudio mora na UI): `abertura` no tick 0, `batida` no "pop" do nome. */
  readonly aoSom?: (momento: 'abertura' | 'batida', id: Identidade, ev: EventoCine) => void;
}

export interface EstadoDaCinematica {
  readonly modo: ModoCine;
  readonly tick: number;
  readonly lutador: IndiceLutador;
  readonly golpe: string;
}

/** Fila, relógio e desenho da cinemática de UM especial por vez (os seguintes esperam e saem CURTOS). */
export class Cinematica {
  private atual: Ativa | null = null;
  private readonly fila: Ativa[] = [];
  private readonly cache = new Map<string, CanvasLike>();
  private readonly aquecidas = new Set<string>();
  private readonly rng: Rng;
  private readonly fabrica: FabricaDeCanvas;
  private readonly aoSom: OpcoesCinematica['aoSom'];
  /** Quantas tarjas já foram pintadas no cache (teste). */
  pintadas = 0;

  constructor(op: OpcoesCinematica = {}) {
    this.rng = op.rng ?? criarRng(1);
    this.fabrica = op.criarCanvas ?? fabricaDoDocumento;
    this.aoSom = op.aoSom;
  }

  get ativa(): boolean {
    return this.atual !== null;
  }

  /** Quantas esperam na fila. */
  get naFila(): number {
    return this.fila.length;
  }

  get estado(): EstadoDaCinematica | null {
    const a = this.atual;
    return a ? { modo: a.modo, tick: a.t, lutador: a.ev.lutador, golpe: a.ev.golpe } : null;
  }

  /** Quantas tarjas estão no cache. */
  get tarjasNoCache(): number {
    return this.cache.size;
  }

  /**
   * O fundo cacheado de UMA tarja (pinta se ainda não tiver; o mesmo cache de até `MAX_TARJAS_NO_CACHE`), para quem desenha a faixa
   * SEM CONGELAR (R-2, `FaixaRitmo`): a mesma pintura, só menor, reaproveitando o aquecimento que já roda na entrada/abertura da
   * luta. Público só por isso — o resto da classe continua privado.
   */
  fundoDaTarja(chave: string, id: Identidade): CanvasLike | null {
    return this.tarja(chave, id);
  }

  /** Duração em ticks da que está rodando (considera o pulo). */
  get duracao(): number {
    const a = this.atual;
    if (!a) return 0;
    const base = a.modo === 'completa' ? DURACAO_COMPLETA : DURACAO_CURTA;
    return a.pulouEm === null ? base : Math.min(base, a.pulouEm + TICKS_DA_SAIDA_AO_PULAR);
  }

  /** Começa uma cinemática. Se já há uma rodando, entra na fila e sai CURTA (dois especiais no mesmo tick). */
  iniciar(ev: EventoCine, modo: ModoCine): void {
    const nova: Ativa = { ev, modo: this.atual ? 'curta' : modo, sem: Math.floor(this.rng.proximo() * 4294967296), t: 0, pulouEm: null, somAbertura: false, somBatida: false };
    if (this.atual) this.fila.push(nova);
    else this.atual = nova;
  }

  /** Um tick de apresentação. */
  avancar(): void {
    const a = this.atual;
    if (!a) return;
    a.t++;
    if (a.t >= this.duracao) {
      this.atual = this.fila.shift() ?? null;
    }
  }

  /** Vai para a saída: termina em no máximo `TICKS_DA_SAIDA_AO_PULAR` ticks (a fila inteira também sai assim). */
  pular(): void {
    const a = this.atual;
    if (a && a.pulouEm === null) a.pulouEm = a.t;
    for (const f of this.fila) f.pulouEm = 0;
  }

  /**
   * Aquece o cache: pinta UMA tarja ainda não pintada dos 3 especiais de cada lutador (2 x 3 = 6 = o limite do cache) e devolve se sobrou
   * alguma. A cena chama uma vez por tick na abertura da luta, para o custo de pintar 2000x264 px não cair no primeiro quadro da cinemática
   * (no celular com CPU 4x esse quadro passava de 30 ms).
   */
  aquecer(luta: LeituraLuta, elenco?: Elenco): boolean {
    for (const f of luta.fighters) {
      const ficha = f.ficha ?? null;
      for (const golpe of ['sFire', 'sDown', 'sFwd']) {
        const id = identidadeDe(f.id, ficha, golpe);
        if (!id) continue;
        const chave = `${f.id}.${ficha ?? 'base'}.${golpe}`;
        if (!this.cache.has(chave) && this.cache.size < MAX_TARJAS_NO_CACHE) {
          this.tarja(chave, id);
          return true;
        }
        // o recorte tingido do halo (a silhueta do quadro nasce sob demanda e só é pedida se o recorte ainda não existe)
        if (elenco && !this.aquecidas.has(chave)) {
          this.aquecidas.add(chave);
          const r = elenco[f.id];
          const ch = chDaFicha(r.ch, ficha);
          const pd = getPD(ch, apresentacaoDoEspecial(f.id, ficha, golpe)?.quadro ?? ch.moves[golpe as 'sFire'].pose);
          silhuetaTingidaDe(r.arte, pd, id.paleta.brilho, (w, h) => this.fabrica(w, h) as HTMLCanvasElement | null);
          return true;
        }
      }
    }
    return false;
  }

  /** Zera o cache (as tarjas) e a fila; chamar ao começar e ao acabar a luta. */
  zerarLuta(): void {
    this.atual = null;
    this.fila.length = 0;
    this.cache.clear();
    this.aquecidas.clear();
  }

  // ---------------------------------------------------------------------------------------------------- desenho
  private identidade(luta: LeituraLuta, elenco: Elenco, a: Ativa): { id: Identidade; ficha: string | null } {
    const f = luta.fighters[a.ev.lutador];
    const ficha = a.ev.ficha === undefined ? (f.ficha ?? null) : a.ev.ficha;
    const r = elenco[f.id];
    const ch = chDaFicha(r.ch, ficha);
    const feita = identidadeDe(f.id, ficha, a.ev.golpe);
    const nome = (ch.moves as Record<string, { name?: string } | undefined>)[a.ev.golpe]?.name ?? a.ev.golpe;
    return { id: feita ?? identidadePadrao(nome, ch.fire), ficha };
  }

  /** O fundo da tarja no cache (pintado uma vez por luta). Sem canvas de fora da tela devolve null e o chamador pinta direto. */
  private tarja(chave: string, id: Identidade): CanvasLike | null {
    const guardada = this.cache.get(chave);
    if (guardada) return guardada;
    const c = this.fabrica(LARGURA_DA_TARJA * 2, id.faixa.h * 2);
    const g = c?.getContext('2d');
    if (!c || !g) return null;
    g.scale(2, 2);
    pintarTarja(g, id);
    this.pintadas++;
    this.cache.set(chave, c);
    if (this.cache.size > MAX_TARJAS_NO_CACHE) this.cache.delete(this.cache.keys().next().value as string);
    return c;
  }

  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
    const a = this.atual;
    if (!a) return;
    const { id, ficha } = this.identidade(luta, elenco, a);
    const q = linhaDoTempo(a.modo, id.ritmo, a.t, a.pulouEm);
    const f = luta.fighters[a.ev.lutador];
    const r = elenco[f.id];
    const ch = chDaFicha(r.ch, ficha);
    const nome = (ch.moves as Record<string, { name?: string } | undefined>)[a.ev.golpe]?.name ?? id.titulo;

    // sons: a abertura no tick 0; a batida quando o nome dá o "pop"
    if (!a.somAbertura) {
      a.somAbertura = true;
      this.aoSom?.('abertura', id, a.ev);
    }
    if (!a.somBatida && q.pop > 0) {
      a.somBatida = true;
      this.aoSom?.('batida', id, a.ev);
    }

    ctx.save();
    // 1) o fundo escurece
    ctx.fillStyle = `rgba(${COR_DO_VEU},${q.veu.toFixed(3)})`;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    // 2) um flash por especial (alfa <= 0,35, na cor do brilho: nunca branco em tela cheia)
    if (q.flash > 0) {
      ctx.globalAlpha = Math.min(q.flash, ALFA_MAX_DO_FLASH);
      ctx.fillStyle = id.paleta.brilho;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
      ctx.globalAlpha = 1;
    }
    // 3) o atacante em destaque, por cima do escurecimento
    this.destacarAtacante(ctx, luta, elenco, a, id, q);
    // 4) a tarja (COMPLETA) ou o nome pequeno sobre ele (CURTA)
    if (a.modo === 'completa') this.desenharTarja(ctx, luta, elenco, a, id, ficha, nome, q);
    else this.desenharCurta(ctx, f.x, f.y, a, id, nome, q);
    ctx.restore();
  }

  private destacarAtacante(ctx: Ctx, luta: LeituraLuta, elenco: Elenco, a: Ativa, id: Identidade, q: Quadro): void {
    const f = luta.fighters[a.ev.lutador];
    const r = elenco[f.id];
    ctx.save();
    aplicarCamera(ctx, luta.cam, 0, this.rng);
    // halo: um brilho radial atrás do corpo, na cor do especial
    const cx = f.x;
    const cy = f.y - SH * 0.5;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 190);
    g.addColorStop(0, id.paleta.brilho);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 * (a.modo === 'curta' ? 1 : trava(q.veu / VEU_CHEIO));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    aplicarCamera(ctx, luta.cam, 0, this.rng);
    desenharLutador(ctx, f, r.ch, r.arte);
    ctx.restore();
  }

  private desenharCurta(ctx: Ctx, x: number, y: number, a: Ativa, id: Identidade, nome: string, q: Quadro): void {
    // nome (22 px) sobre o atacante, em núcleo com contorno sombra, com o "pop"; uma rajada do estilo com no máximo 12 primitivas
    ctx.save();
    ctx.translate(x, y - SH - 18);
    const alfa = trava(1 - q.saida * q.saida * q.saida);
    if (q.pop > 0) textoArcade(ctx, nome, 0, 0, 22, id.paleta.nucleo, mistura(id.paleta.sombra, '#000000', 0.65), 'center', q.pop, alfa, FONTE_DO_ESPECIAL(22));
    ctx.restore();
    ctx.save();
    ctx.translate(x - 150, y - SH * 0.75);
    desenharEstilo(id.estilo, { ctx, t: q.tEstilo, vida: q.vivo, p: id.paleta, c: { x: 40, y: 0, w: 300, h: 100 }, sem: a.sem, variante: id.variante, escala: 0.5, pesado: id.ritmo === 'PESADO' });
    ctx.restore();
  }

  private desenharBarraDestaque(ctx: Ctx, x: number, y: number, id: Identidade, alfa: number): void {
    ctx.save();
    ctx.globalAlpha = alfa * 0.9;
    const comp = 140;
    const gr = ctx.createLinearGradient(x - comp, y, x + comp, y);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.25, id.paleta.sombra);
    gr.addColorStop(0.5, id.paleta.brilho);
    gr.addColorStop(0.75, id.paleta.sombra);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - comp, y - 1, comp * 2, 2);
    ctx.fillStyle = id.paleta.nucleo;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private desenharTarja(ctx: Ctx, luta: LeituraLuta, elenco: Elenco, a: Ativa, id: Identidade, ficha: string | null, nome: string, q: Quadro): void {
    const lado: 1 | -1 = a.ev.lutador === 0 ? 1 : -1;
    const H = id.faixa.h;
    const W = LARGURA_DA_TARJA;
    const yc = Y_DA_FAIXA[id.faixa.posicao];
    const entrada = a.ev.entrada ?? 'lateral';
    const des = deslocamentoDaTarja(entrada, lado, yc, H, q, id.ritmo, a.t);
    const ang = id.faixa.oscila ? 8 * Math.sin(a.t * 0.4) : id.faixa.angulo;
    const rot = (-ang * lado * Math.PI) / 180;
    const f = luta.fighters[a.ev.lutador];
    const r = elenco[f.id];
    const ch = chDaFicha(r.ch, ficha);
    const chave = `${f.id}.${ficha ?? 'base'}.${a.ev.golpe}`;
    const pronta = this.tarja(chave, id);

    ctx.save();
    ctx.translate(LARGURA / 2 + des.x, yc + des.y);
    ctx.rotate(rot);
    ctx.scale(lado, 1);
    ctx.translate(-W / 2, -H / 2);
    // fundo (cache; sem canvas de fora da tela pinta direto)
    if (pronta) ctx.drawImage(pronta as unknown as CanvasImageSource, 0, 0, W, H);
    else pintarTarja(ctx, id);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -60, W, H + 60);
    ctx.clip();
    // riscos de velocidade (C2): 16 riscos paralelos à faixa, 80–240 px, andando 24 px/tick no sentido da entrada
    this.riscos(ctx, a, id, q, W, H);
    this.desenharPose(ctx, ch, r.arte, id, a.ev.quadro, f.pose.name, H);
    desenharEstilo(id.estilo, { ctx, t: q.tEstilo, vida: q.vivo, p: id.paleta, c: { x: 250, y: 0, w: 700, h: H }, sem: a.sem, variante: id.variante, escala: 1, pesado: id.ritmo === 'PESADO' });
    ctx.restore();
    ctx.restore();

    // texto fora do espelhamento (senão sai ao contrário): mesma posição e o mesmo ângulo da faixa
    const cxTexto = (W * 0.67 - W / 2) * lado;
    ctx.save();
    ctx.translate(LARGURA / 2 + des.x, yc + des.y);
    ctx.rotate(rot);
    if (q.pop > 0) {
      const tamanho = this.tamanhoDoNome(ctx, nome);
      // Mantém a tarja e o nome legíveis por mais tempo na tela e com transição suave
      const alfa = trava(1 - q.saida * q.saida * q.saida);
      // faixa fina (90-110 px: BOTE, MARMA, PARADE, KAMINARI-STEP): o nome sobe e o do lutador encosta na borda de baixo, para não se tocarem
      const fina = H < 110;
      this.desenharBarraDestaque(ctx, cxTexto, fina ? 8 : 14, id, alfa);
      textoArcade(
        ctx,
        nome,
        cxTexto,
        fina ? -14 : -8,
        tamanho,
        [id.paleta.nucleo, mistura(id.paleta.nucleo, id.paleta.brilho, 0.45)],
        mistura(id.paleta.sombra, '#000000', 0.7),
        'center',
        q.pop,
        alfa,
        FONTE_DO_ESPECIAL(tamanho),
      );
      textoArcade(
        ctx,
        ch.name.toUpperCase(),
        cxTexto,
        H / 2 - (fina ? 12 : 20),
        18,
        id.paleta.nucleo,
        mistura(id.paleta.sombra, '#000000', 0.65),
        'center',
        1,
        alfa * 0.9,
      );
    }
    ctx.restore();
  }

  /** Nome em até 48 px (Bangers/Impact); encolhe proporcionalmente se não couber no espaço livre da faixa. */
  private tamanhoDoNome(ctx: Ctx, nome: string): number {
    ctx.save();
    ctx.font = FONTE_DO_ESPECIAL(48);
    const w = ctx.measureText(nome).width;
    ctx.restore();
    const livre = LARGURA_DA_TARJA * 0.62;
    return w > livre ? Math.max(26, Math.floor((48 * livre) / w)) : 48;
  }

  private riscos(ctx: Ctx, a: Ativa, id: Identidade, q: Quadro, W: number, H: number): void {
    if (q.vivo <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.35 * q.vivo;
    ctx.strokeStyle = id.paleta.brilho;
    ctx.lineWidth = 2;
    const n = id.variante === 'rastro' ? 24 : 16;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const comp = 80 + ((i * 53) % 160);
      const y = 6 + (((i * 37 + a.sem) >>> 0) % (H - 12));
      const x = (((i * 211 + a.sem) >>> 0) % (W + comp)) + (a.t - 8) * 24 * (id.variante === 'cordas' && a.t > 24 ? -1 : 1);
      const xx = ((((x % (W + comp)) + (W + comp)) % (W + comp)) - comp);
      ctx.moveTo(xx, y);
      ctx.lineTo(xx + comp, y);
    }
    ctx.stroke();

    // Partículas luminosas nas pontas das linhas de velocidade
    ctx.fillStyle = id.paleta.nucleo;
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      const comp = 80 + ((i * 53) % 160);
      const y = 6 + (((i * 37 + a.sem) >>> 0) % (H - 12));
      const x = (((i * 211 + a.sem) >>> 0) % (W + comp)) + (a.t - 8) * 24 * (id.variante === 'cordas' && a.t > 24 ? -1 : 1);
      const xx = ((((x % (W + comp)) + (W + comp)) % (W + comp)) - comp) + comp;
      ctx.rect(xx - 2, y - 2, 4, 4);
    }
    ctx.fill();
    ctx.restore();
  }

  /** A pose do golpe no terço do lado do atacante (24% da faixa), no recorte do estilo, com o halo da silhueta por trás. */
  private desenharPose(ctx: Ctx, ch: ReturnType<typeof chDaFicha>, arte: Elenco[keyof Elenco]['arte'], id: Identidade, quadro: string | undefined, poseDoGolpe: string, H: number): void {
    const pd = getPD(ch, quadro ?? poseDoGolpe);
    const img = arte.imagemDe(pd);
    if (!img) return;
    const alt = H * 1.3;
    const frac = id.recorte === 'BUSTO' ? 0.58 : id.recorte === 'MEIO' ? 0.75 : 1;
    const sh = pd.h * frac;
    let escala = alt / sh;
    let dh = alt;
    let dy = H - alt;
    if (id.recorte === 'CORPO-H') {
      escala = Math.min(300 / pd.w, alt / pd.h);
      dh = pd.h * escala;
      dy = H - dh - 4;
    }
    const dw = pd.w * escala;
    const dx = 240 - pd.ax * escala;
    ctx.save();
    if (id.medalhao === true) {
      ctx.beginPath();
      ctx.arc(240, H / 2, 80, 0, Math.PI * 2);
      ctx.clip();
    }
    const tinta = silhuetaTingidaDe(arte, pd, id.paleta.brilho, (w, h) => this.fabrica(w, h) as HTMLCanvasElement | null);
    if (tinta) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(tinta, 0, 0, pd.w, sh, dx - 3, dy - 3, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, pd.x, pd.y, pd.w, id.recorte === 'CORPO-H' ? pd.h : sh, dx, dy, dw, dh);
    ctx.restore();
  }
}

export type { EstiloId, Paleta };
