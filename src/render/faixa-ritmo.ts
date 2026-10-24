import type { Elenco } from '../assets/elenco';
import { LARGURA } from '../core/constantes';
import type { IndiceLutador, LeituraLuta } from '../core/contratos';
import { desenharFaixaComRosto, rostoDoGolpe } from './faixa-rosto';
import { chDaFicha } from './lutador';
import { paletaFaixaDe } from './paleta-lutador';
import type { Ctx } from './tela';

/*
 * FAIXA DO RITMO (docs/spec-redesenho-jogabilidade.md §3.2, R-2, flag `Regras.ritmo.tarja`): o aviso do especial comum SEM
 * congelar a luta. Ao contrário da tarja do SUPER (`TarjaDoSuper`, que faz a cena deixar de chamar `game.update`), esta faixa é
 * só um elemento de HUD por cima do jogo: `fight.ts` continua chamando `game.update` em TODO tick enquanto ela aparece.
 *
 * Direção de arte (decisão do dono, 24/10/2026, estilo X-Men vs Street Fighter): banda horizontal larga e listrada, laranja/
 * amarela, no terço de cima da tela, com o rosto do lutador em close (gritando) entrando pela esquerda — a pintura é
 * `desenharFaixaComRosto` (`faixa-rosto.ts`), compartilhada com `TarjaDoSuper`. Aqui: só o relógio (entra/fica/sai) e a fila.
 *
 * Primeira vez de um golpe na luta: 40 ticks (entra 6, fica 28, sai 6). Repetido (2ª vez em diante do MESMO golpe, do MESMO
 * lutador/ficha, nesta luta): 24 ticks (entra 4, fica 16, sai 4) — a marca "já vi isso" do §3.2. Dois especiais quase juntos (os dois
 * lados, ou um combo rápido): o 2º entra na fila e espera o 1º acabar; nunca acumula motor parado, porque nada bloqueia o motor.
 */

/**
 * Especial comum: a luta CONTINUA rodando com a faixa na tela, então ela NÃO pode cobrir a zona das cabeças (topo por volta de y=205):
 * <= 105 px de altura, de y=86 a y=191 (decisão do Atlas, 24/10/2026; limite de 195 do e2e ritmo-r1-r2.spec.ts, que não foi afrouxado).
 * A faixa GRANDE de 170 px é só do super (`TarjaDoSuper`, `ALTURA_TARJA_SUPER`), que congela a cena.
 */
export const ALTURA_FAIXA_RITMO = 105;
/** Topo fixo da faixa (px lógicos): abaixo do placar do HUD (`hud.ts`, nome/placar terminam perto de y=86). */
export const Y_TOPO_FAIXA_RITMO = 86;
/** Até onde a faixa do especial comum pode chegar (a cabeça do lutador em pé começa em ~205). */
export const Y_FUNDO_MAXIMO_FAIXA_RITMO = 195;
export const DURACAO_FAIXA_1A_VEZ = 40;
export const DURACAO_FAIXA_REPETIDA = 24;
const ENTRA_1A_VEZ = 6;
const SAI_1A_VEZ = 6;
const ENTRA_REPETIDA = 4;
const SAI_REPETIDA = 4;

export interface EventoFaixa {
  readonly lutador: IndiceLutador;
  /** Chave de `ch.moves` do golpe. */
  readonly golpe: string;
  /** Ficha de quem atacou. Ausente = a que `luta.fighters[lutador]` tiver na hora de desenhar. */
  readonly ficha?: string | null;
}

interface Ativa {
  readonly ev: EventoFaixa;
  readonly repetida: boolean;
  readonly duracao: number;
  readonly entra: number;
  readonly sai: number;
  t: number;
}

/** Fila e desenho da faixa SEM CONGELAR de um especial por vez (como `TarjaDoSuper`, mas sem pausar a cena). */
export class FaixaRitmo {
  private atual: Ativa | null = null;
  private readonly fila: Ativa[] = [];
  /** Golpes (`lutador.ficha.golpe`) já mostrados nesta luta: a 2ª vez em diante sai a versão de 24 ticks. */
  private readonly vistos = new Set<string>();

  get ativa(): boolean {
    return this.atual !== null;
  }

  /** Estado de leitura (teste e contador de ritmo). */
  get estado(): { readonly lutador: IndiceLutador; readonly golpe: string; readonly t: number; readonly repetida: boolean } | null {
    const a = this.atual;
    return a ? { lutador: a.ev.lutador, golpe: a.ev.golpe, t: a.t, repetida: a.repetida } : null;
  }

  /** Começa (ou enfileira, se já há uma rodando) a faixa de `ev`. Marca o golpe como visto. */
  iniciar(ev: EventoFaixa): void {
    const chave = chaveDoGolpe(ev);
    const repetida = this.vistos.has(chave);
    this.vistos.add(chave);
    const nova: Ativa = {
      ev,
      repetida,
      duracao: repetida ? DURACAO_FAIXA_REPETIDA : DURACAO_FAIXA_1A_VEZ,
      entra: repetida ? ENTRA_REPETIDA : ENTRA_1A_VEZ,
      sai: repetida ? SAI_REPETIDA : SAI_1A_VEZ,
      t: 0,
    };
    if (this.atual) this.fila.push(nova);
    else this.atual = nova;
  }

  /** Um tick da faixa (a luta anda no mesmo tick: quem chama também chama `game.update`). */
  avancar(): void {
    const a = this.atual;
    if (!a) return;
    a.t++;
    if (a.t >= a.duracao) this.atual = this.fila.shift() ?? null;
  }

  /** Zera a fila e o que já foi visto; chamar ao começar e ao acabar a luta (como `TarjaDoSuper.zerarLuta`). */
  zerarLuta(): void {
    this.atual = null;
    this.fila.length = 0;
    this.vistos.clear();
  }

  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
    const a = this.atual;
    if (!a) return;
    const f = luta.fighters[a.ev.lutador];
    const ficha = a.ev.ficha === undefined ? (f.ficha ?? null) : a.ev.ficha;
    const r = elenco[f.id];
    const ch = chDaFicha(r.ch, ficha);
    const nome = (ch.moves as Record<string, { name?: string } | undefined>)[a.ev.golpe]?.name ?? a.ev.golpe;

    const entraK = a.entra > 0 ? Math.min(1, a.t / a.entra) : 1;
    const saiIni = a.duracao - a.sai;
    const saiK = a.t <= saiIni || a.sai <= 0 ? 0 : Math.min(1, (a.t - saiIni) / a.sai);
    // a faixa entra/sai pela ESQUERDA (posição, não alfa — como a referência): nunca os dois ao mesmo tempo (entraK já é 1 quando saiK começa)
    const deslocaX = -Math.max(1 - entraK, saiK) * LARGURA;

    desenharFaixaComRosto({
      ctx,
      x: 0,
      y: Y_TOPO_FAIXA_RITMO,
      w: LARGURA,
      h: ALTURA_FAIXA_RITMO,
      alfa: 1,
      deslocaX,
      paleta: paletaFaixaDe(f.id, ficha),
      nome,
      rosto: rostoDoGolpe(elenco, f.id, ficha, a.ev.golpe),
    });
  }
}

const chaveDoGolpe = (ev: EventoFaixa): string => `${ev.lutador}.${ev.ficha ?? 'base'}.${ev.golpe}`;
