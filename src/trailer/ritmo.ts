import type { EventoLuta } from '../core/contratos';
import { DURACAO_DA_CINE, DURACAO_DA_TARJA_SUPER, type BatidaGravada, type BatidaPedida } from '../data/trailer/tipos';
import type { EventoFilmeLuta } from './filme';

/*
 * O RITMO de um plano de luta: dado o tick do plano, o motor anda ou não? É a única parte do diretor que decide "quando" (câmera lenta e congelamento da
 * tarja); o motor em si só anda por `Game.update`. Fica num módulo à parte e PURO (sem `Game`) porque a ESCALAÇÃO offline (ferramentas/trailer) roda esta
 * mesma máquina sobre os eventos gravados de uma simulação, para saber em que tick do plano cada golpe cai com a câmera lenta e a tarja já na conta.
 *
 * Regras (spec §4.3):
 *  - A tarja da cinemática só sai nas batidas marcadas com `cine` (APOSENTADO no trailer: o especial comum não tem mais tarja): no tick em que o evento `special` do golpe sai, o motor congela por 20 (curta) ou 48 (completa).
 *  - A tarja do SUPER (batida `tipo: 'super'`): no tick em que o evento `special` com `super: true` sai, o motor congela por 30 (`DURACAO_DA_TARJA_SUPER`).
 *  - A câmera lenta começa no acerto: por `ticks` ticks do trailer o motor anda 1 update a cada `fator` (6 updates viram 18 ticks a ×3).
 *  - O FILME do especial (evento `filme` do motor, D-V6): o motor congela pelos ticks do filme (`ticksDoFilme`), como na tarja. O jogo faz o mesmo na cena da luta.
 *  - Batida esperada que NÃO veio (os dados mudaram e o CI ainda não rodou): nada dispara. O plano não estica e o trailer não quebra.
 */

export interface EsperadaDoRitmo {
  readonly pedida: BatidaPedida;
  readonly gravada: BatidaGravada;
}

/** O evento é o ACERTO que a batida pede? */
export function casaBatida(p: BatidaPedida, ev: EventoLuta): boolean {
  switch (p.tipo) {
    case 'golpe':
      if (ev.tipo === 'hit') return ev.especial !== true && ev.super !== true && ev.atacante === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
      return ev.tipo === 'throw' && ev.especial !== true && ev.atacante === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
    case 'block':
      return ev.tipo === 'block' && ev.atacante === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
    case 'super':
      return ev.tipo === 'hit' && ev.super === true && ev.atacante === p.lutador;
    case 'especial':
      if (ev.tipo === 'hit') return ev.especial === true && ev.atacante === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
      if (ev.tipo === 'throw') return ev.especial === true && ev.atacante === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
      return false;
    case 'contra':
      return ev.tipo === 'hit' && ev.contraEspecial === true && ev.atacante === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
    case 'carga':
      // o nível 3 que ACERTA (`hit.nivelCarga`) ou que QUEBRA a guarda de quem defende (`quebra-guarda`, que não leva o nível: só o nível 3 quebra)
      if (ev.tipo === 'quebra-guarda') return ev.atacante === p.lutador && (p.nivel ?? 3) === 3;
      return ev.tipo === 'hit' && ev.atacante === p.lutador && ev.nivelCarga === (p.nivel ?? 3);
    case 'ko':
      return ev.tipo === 'ko' && ev.defensor === 1 - p.lutador;
  }
}

/** O evento é o INÍCIO do golpe da batida (o `special` que abre a tarja)? Nos tipos sem golpe lançado não há início: vale o próprio acerto. */
export function casaInicio(p: BatidaPedida, ev: EventoLuta): boolean {
  if (p.tipo === 'ko') return false;
  if (p.tipo === 'super') return ev.tipo === 'special' && ev.lutador === p.lutador && ev.super === true;
  return ev.tipo === 'special' && ev.lutador === p.lutador && (p.golpe === undefined || ev.golpe === p.golpe);
}

export interface DisparoDoRitmo {
  /** A tarja começa agora (o evento `special` e o modo). */
  readonly cine: { readonly ev: EventoLuta; readonly modo: 'curta' | 'completa' } | null;
  /** A tarja do SUPER começa agora (o evento `special` com `super: true`); o motor fica parado `DURACAO_DA_TARJA_SUPER` ticks. */
  readonly tarjaSuper: EventoLuta | null;
  /** A câmera lenta começou agora (fator), ou 0. */
  readonly lenta: number;
  /** O evento `filme` saiu neste update: a cena abre o filme e o motor congela pela duração dele. */
  readonly filme: EventoFilmeLuta | null;
}
const SEM_DISPARO: DisparoDoRitmo = { cine: null, tarjaSuper: null, lenta: 0, filme: null };

export class RitmoDoPlano {
  private cineRestante = 0;
  private lentaRestante = 0;
  private lentaFator = 1;
  private lentaIdx = 0;
  private filmeRestante = 0;
  /** O fator do tick que `decidir` acabou de resolver (1 fora da câmera lenta). */
  private fatorNesteTick = 1;
  private readonly cineUsada = new Set<number>();
  private readonly lentaUsada = new Set<number>();

  /**
   * `congeladoAte`: até este tick do plano o motor NÃO anda (a entrada do chefão no P9). `ticksDoFilme`: quantos ticks o motor fica parado por um evento `filme`
   * (sem ele, o filme não congela nada: os testes antigos do ritmo).
   */
  constructor(
    private readonly esperadas: readonly EsperadaDoRitmo[],
    private readonly congeladoAte = 0,
    private readonly ticksDoFilme?: (ev: EventoFilmeLuta) => number,
  ) {}

  /** Fator da câmera lenta agora (1 = velocidade normal). */
  get fatorDaLenta(): number {
    return this.fatorNesteTick;
  }

  /** O motor anda neste tick do plano? Chamar uma vez por tick, ANTES de rodar o motor. */
  decidir(tau: number): boolean {
    this.fatorNesteTick = 1;
    if (tau < this.congeladoAte) return false;
    if (this.cineRestante > 0) {
      this.cineRestante--;
      return false;
    }
    if (this.filmeRestante > 0) {
      this.filmeRestante--;
      return false;
    }
    if (this.lentaRestante > 0) {
      this.lentaRestante--;
      this.fatorNesteTick = this.lentaFator;
      return this.lentaIdx++ % this.lentaFator === 0;
    }
    return true;
  }

  /** Depois de cada update real (`u` = chamadas a `update` até aqui, inclusive esta): abre a tarja e/ou a câmera lenta se for o caso. */
  aposUpdate(u: number, eventos: readonly EventoLuta[]): DisparoDoRitmo {
    let cine: DisparoDoRitmo['cine'] = null;
    let tarjaSuper: DisparoDoRitmo['tarjaSuper'] = null;
    let lenta = 0;
    this.esperadas.forEach((e, i) => {
      const { pedida, gravada } = e;
      if ((pedida.cine || pedida.tipo === 'super') && !this.cineUsada.has(i) && u === gravada.tickInicio) {
        const ev = eventos.find((x) => casaInicio(pedida, x));
        if (ev) {
          this.cineUsada.add(i);
          if (pedida.tipo === 'super') {
            this.cineRestante = DURACAO_DA_TARJA_SUPER;
            tarjaSuper = ev;
          } else if (pedida.cine) {
            this.cineRestante = DURACAO_DA_CINE[pedida.cine];
            cine = { ev, modo: pedida.cine };
          }
        }
      }
      if (pedida.lenta && !this.lentaUsada.has(i) && u === gravada.tickMotor && eventos.some((x) => casaBatida(pedida, x))) {
        this.lentaUsada.add(i);
        this.lentaRestante = pedida.lenta.ticks;
        this.lentaFator = pedida.lenta.fator;
        this.lentaIdx = 0;
        lenta = pedida.lenta.fator;
      }
    });
    const ev = this.ticksDoFilme ? eventos.find((x): x is EventoFilmeLuta => x.tipo === 'filme') : undefined;
    const filme = ev ?? null;
    if (ev && this.ticksDoFilme) this.filmeRestante = this.ticksDoFilme(ev);
    return cine === null && tarjaSuper === null && lenta === 0 && filme === null ? SEM_DISPARO : { cine, tarjaSuper, lenta, filme };
  }
}

/** O resultado de um tick do plano. */
export interface PassoDoPlano {
  readonly andou: boolean;
  /** Chamadas a `update` depois deste tick. */
  readonly u: number;
  readonly eventos: readonly EventoLuta[];
  readonly disparo: DisparoDoRitmo;
}

/**
 * Um tick do plano: decide se o motor anda e, se andar, roda `produzir(u)` (o `update` do `Game` no diretor; a leitura dos eventos gravados na escalação).
 * É o laço único do diretor e da escalação: o que a ferramenta mede é o que o jogo faz.
 */
export function passoDoPlano(ritmo: RitmoDoPlano, tau: number, u: number, produzir: (uNovo: number) => readonly EventoLuta[]): PassoDoPlano {
  if (!ritmo.decidir(tau)) return { andou: false, u, eventos: [], disparo: SEM_DISPARO };
  const uNovo = u + 1;
  const eventos = produzir(uNovo);
  return { andou: true, u: uNovo, eventos, disparo: ritmo.aposUpdate(uNovo, eventos) };
}
